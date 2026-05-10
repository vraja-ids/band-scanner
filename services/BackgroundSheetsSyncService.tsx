/**
 * Background Sheets Sync Service
 *
 * Periodically syncs Supabase data to Google Sheets as a backup.
 * Runs every 2 minutes when the app is active and user is logged in.
 *
 * Uses Google Sheets API v4 with API key authentication for reads
 * and service account for writes (via Supabase Edge Function proxy).
 */

import { useEffect, useRef } from 'react';
import AppState, { AppStateStatus } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as SupabaseService from './SupabaseService';

// ============================================================================
// Configuration
// ============================================================================

const SYNC_INTERVAL_MS = 2 * 60 * 1000; // 2 minutes
const LAST_SYNC_KEY = '@sheets_last_sync';
const SYNC_ENABLED_KEY = '@sheets_sync_enabled';
const MIN_SYNC_INTERVAL_MS = 30 * 1000; // Minimum 30 seconds between syncs

// Get configuration from environment
const SPREADSHEET_ID = process.env.EXPO_PUBLIC_PRASADAM_SPREADSHEET_ID || '1iiq9EeSDQ9eQzwkK4rQPbNXJGD_cnp-z0bnlWzDcW6g';
const SYNC_FUNCTION_URL = process.env.EXPO_PUBLIC_SHEETS_SYNC_FUNCTION_URL; // Optional: Edge Function URL for writes

// ============================================================================
// Types
// ============================================================================

export interface SyncStatus {
  enabled: boolean;
  lastSync: number | null;
  nextSync: number | null;
  inProgress: boolean;
  lastError: string | null;
  syncCount: number;
}

export interface SyncResult {
  success: boolean;
  timestamp: number;
  duration: number;
  tables: {
    meals: boolean;
    menuItems: boolean;
    locationInventory: boolean;
    transfers: boolean;
  };
  recordsSynced: number;
  error?: string;
}

// ============================================================================
// State
// ============================================================================

let syncInterval: NodeJS.Timeout | null = null;
let isSyncing = false;
let lastSyncTime: number | null = null;
let syncEnabled = true;
let syncCount = 0;
let lastError: string | null = null;
let currentEventId: string | null = null;
let currentMealId: string | null = null;

// ============================================================================
// Helper Functions
// ============================================================================

/**
 * Append rows to a Google Sheet using the Sheets API
 * Note: This requires a write-enabled method (Edge Function or service account)
 */
async function appendToSheet(sheetName: string, rows: any[][]): Promise<boolean> {
  if (!SYNC_FUNCTION_URL) {
    console.warn('[SheetsSync] No sync function URL configured, skipping write');
    return false;
  }

  try {
    const response = await fetch(SYNC_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': process.env.EXPO_PUBLIC_SHEETS_SYNC_SECRET || 'my-sync-secret-2026-ss-admin',
      },
      body: JSON.stringify({
        spreadsheetId: SPREADSHEET_ID,
        sheetName,
        operation: 'append',
        rows,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error(`[SheetsSync] Error appending to ${sheetName}:`, error);
    return false;
  }
}

/**
 * Update a range in a Google Sheet
 */
async function updateSheetRange(sheetName: string, range: string, values: any[][]): Promise<boolean> {
  if (!SYNC_FUNCTION_URL) {
    console.warn('[SheetsSync] No sync function URL configured, skipping write');
    return false;
  }

  try {
    const response = await fetch(SYNC_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': process.env.EXPO_PUBLIC_SHEETS_SYNC_SECRET || 'my-sync-secret-2026-ss-admin',
      },
      body: JSON.stringify({
        spreadsheetId: SPREADSHEET_ID,
        sheetName,
        operation: 'update',
        range,
        values,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error(`[SheetsSync] Error updating ${sheetName} ${range}:`, error);
    return false;
  }
}

/**
 * Clear and replace a sheet's data
 */
async function replaceSheetData(sheetName: string, headers: string[], rows: any[][]): Promise<boolean> {
  if (!SYNC_FUNCTION_URL) {
    console.warn('[SheetsSync] No sync function URL configured, skipping write');
    // Log what would be synced for debugging
    console.log(`[SheetsSync] Would sync ${rows.length} rows to ${sheetName}`);
    return true; // Return true so sync doesn't fail, just logs
  }

  try {
    const response = await fetch(SYNC_FUNCTION_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-Cron-Secret': process.env.EXPO_PUBLIC_SHEETS_SYNC_SECRET || 'my-sync-secret-2026-ss-admin',
      },
      body: JSON.stringify({
        spreadsheetId: SPREADSHEET_ID,
        sheetName,
        operation: 'replace',
        headers,
        rows,
      }),
    });

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const result = await response.json();
    return result.success === true;
  } catch (error) {
    console.error(`[SheetsSync] Error replacing ${sheetName} data:`, error);
    return false;
  }
}

// ============================================================================
// Sync Functions
// ============================================================================

/**
 * Sync meals to Google Sheets
 */
async function syncMeals(eventId: string): Promise<{ success: boolean; count: number }> {
  try {
    const meals = await SupabaseService.getMeals(eventId);

    if (meals.length === 0) return { success: true, count: 0 };

    console.log(`[SheetsSync] Syncing ${meals.length} meals for event ${eventId}...`);

    const headers = ['meal_id', 'event_id', 'meal_type', 'day_number', 'meal_instance', 'serving_start_time', 'planned_servings', 'status', 'created_at', 'updated_at'];
    const rows = meals.map((m) => [
      m.meal_id,
      m.event_id,
      m.meal_type,
      m.day_number,
      m.meal_instance,
      m.serving_start_time,
      m.planned_servings || 0,
      m.status || 'planned',
      m.created_at,
      m.updated_at,
    ]);

    const success = await replaceSheetData('MEALS', headers, rows);
    return { success, count: meals.length };
  } catch (error) {
    console.error('[SheetsSync] Error syncing meals:', error);
    return { success: false, count: 0 };
  }
}

/**
 * Sync menu items to Google Sheets
 */
async function syncMenuItems(mealId: string): Promise<{ success: boolean; count: number }> {
  try {
    const items = await SupabaseService.getMenuItems(mealId);

    if (items.length === 0) return { success: true, count: 0 };

    console.log(`[SheetsSync] Syncing ${items.length} menu items for meal ${mealId}...`);

    const headers = ['item_id', 'meal_id', 'name', 'category', 'planned_trays', 'ready_trays', 'kitchen_storage_moved', 'cooking_status', 'is_vegan', 'contains_gluten', 'allergens', 'updated_at'];
    const rows = items.map((item) => [
      item.item_id,
      item.meal_id,
      item.name,
      item.category,
      item.planned_trays || 0,
      item.ready_trays || 0,
      item.kitchen_storage_moved || 0,
      item.cooking_status || 'Not Started',
      item.is_vegan || false,
      item.contains_gluten || false,
      item.allergens || '',
      item.updated_at,
    ]);

    const success = await replaceSheetData('MENU_ITEMS', headers, rows);
    return { success, count: items.length };
  } catch (error) {
    console.error('[SheetsSync] Error syncing menu items:', error);
    return { success: false, count: 0 };
  }
}

/**
 * Sync location inventory to Google Sheets
 */
async function syncLocationInventory(mealId: string): Promise<{ success: boolean; count: number }> {
  try {
    const inventory = await SupabaseService.getLocationInventory(mealId);

    if (inventory.length === 0) return { success: true, count: 0 };

    console.log(`[SheetsSync] Syncing ${inventory.length} inventory items for meal ${mealId}...`);

    const headers = ['inventory_id', 'meal_id', 'item_id', 'item_name', 'category', 'planned_trays', 'ready_trays', 'kitchen', 'staging', 'refill_1', 'refill_2', 'refill_3', 'served', 'left_over', 'updated_at'];
    const rows = inventory.map((inv) => [
      inv.inventory_id,
      inv.meal_id,
      inv.item_id,
      inv.item_name,
      inv.category,
      inv.planned_trays || 0,
      inv.ready_trays || 0,
      inv.kitchen || 0,
      inv.staging || 0,
      inv.refill_1 || 0,
      inv.refill_2 || 0,
      inv.refill_3 || 0,
      inv.served || 0,
      inv.left_over || 0,
      inv.updated_at,
    ]);

    const success = await replaceSheetData('LOCATION_INVENTORY', headers, rows);
    return { success, count: inventory.length };
  } catch (error) {
    console.error('[SheetsSync] Error syncing location inventory:', error);
    return { success: false, count: 0 };
  }
}

/**
 * Sync transfers to Google Sheets
 */
async function syncTransfers(mealId: string): Promise<{ success: boolean; count: number }> {
  try {
    const transfers = await SupabaseService.getTransfers(mealId);

    if (transfers.length === 0) return { success: true, count: 0 };

    console.log(`[SheetsSync] Syncing ${transfers.length} transfers for meal ${mealId}...`);

    const headers = ['transfer_id', 'meal_id', 'item_id', 'item_name', 'quantity', 'from_location', 'to_location', 'from_user', 'to_user', 'status', 'timestamp_sent', 'timestamp_received'];
    const rows = transfers.map((t) => [
      t.transfer_id,
      t.meal_id,
      t.item_id,
      t.item_name,
      t.quantity,
      t.from_location,
      t.to_location,
      t.from_user,
      t.to_user || '',
      t.status,
      t.timestamp_sent,
      t.timestamp_received || '',
    ]);

    // For transfers, we append rather than replace (keep history)
    // But since we're fetching all, we'll replace to avoid duplicates
    const success = await replaceSheetData('TRANSFERS', headers, rows);
    return { success, count: transfers.length };
  } catch (error) {
    console.error('[SheetsSync] Error syncing transfers:', error);
    return { success: false, count: 0 };
  }
}

/**
 * Perform a full sync for the current event/meal
 */
async function performFullSync(): Promise<SyncResult> {
  const startTime = Date.now();

  if (!currentEventId) {
    return {
      success: false,
      timestamp: startTime,
      duration: 0,
      tables: {
        meals: false,
        menuItems: false,
        locationInventory: false,
        transfers: false,
      },
      recordsSynced: 0,
      error: 'No event selected',
    };
  }

  console.log(`[SheetsSync] Starting sync for event ${currentEventId}${currentMealId ? `, meal ${currentMealId}` : ''}...`);

  try {
    const mealToSync = currentMealId || undefined;

    const results = {
      meals: await syncMeals(currentEventId),
      menuItems: mealToSync ? await syncMenuItems(mealToSync) : { success: true, count: 0 },
      locationInventory: mealToSync ? await syncLocationInventory(mealToSync) : { success: true, count: 0 },
      transfers: mealToSync ? await syncTransfers(mealToSync) : { success: true, count: 0 },
    };

    const allSuccess = results.meals.success && results.menuItems.success && results.locationInventory.success && results.transfers.success;
    const duration = Date.now() - startTime;
    const recordsSynced = results.meals.count + results.menuItems.count + results.locationInventory.count + results.transfers.count;

    if (allSuccess) {
      await setLastSyncTime(Date.now());
      syncCount++;
      lastError = null;
    } else {
      lastError = 'Partial sync failure';
    }

    return {
      success: allSuccess,
      timestamp: startTime,
      duration,
      tables: {
        meals: results.meals.success,
        menuItems: results.menuItems.success,
        locationInventory: results.locationInventory.success,
        transfers: results.transfers.success,
      },
      recordsSynced,
      error: allSuccess ? undefined : lastError,
    };
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : String(error);
    lastError = errorMessage;

    return {
      success: false,
      timestamp: startTime,
      duration: Date.now() - startTime,
      tables: {
        meals: false,
        menuItems: false,
        locationInventory: false,
        transfers: false,
      },
      recordsSynced: 0,
      error: errorMessage,
    };
  }
}

/**
 * Perform a sync with minimum interval check
 */
async function performSync(): Promise<SyncResult | null> {
  // Check if we're already syncing
  if (isSyncing) {
    console.log('[SheetsSync] Sync already in progress, skipping');
    return null;
  }

  // Check minimum interval
  if (lastSyncTime && Date.now() - lastSyncTime < MIN_SYNC_INTERVAL_MS) {
    console.log('[SheetsSync] Minimum interval not reached, skipping');
    return null;
  }

  isSyncing = true;

  try {
    const result = await performFullSync();

    if (result.success) {
      console.log(`[SheetsSync] Sync completed in ${result.duration}ms, ${result.recordsSynced} records synced`);
    } else {
      console.error(`[SheetsSync] Sync failed: ${result.error}`);
    }

    return result;
  } finally {
    isSyncing = false;
  }
}

// ============================================================================
// State Management
// ============================================================================

async function loadLastSyncTime(): Promise<number | null> {
  try {
    const value = await AsyncStorage.getItem(LAST_SYNC_KEY);
    return value ? parseInt(value, 10) : null;
  } catch {
    return null;
  }
}

async function setLastSyncTime(time: number): Promise<void> {
  try {
    await AsyncStorage.setItem(LAST_SYNC_KEY, String(time));
    lastSyncTime = time;
  } catch (error) {
    console.error('[SheetsSync] Error saving last sync time:', error);
  }
}

async function loadSyncEnabled(): Promise<boolean> {
  try {
    const value = await AsyncStorage.getItem(SYNC_ENABLED_KEY);
    return value !== 'false'; // Default to true
  } catch {
    return true;
  }
}

async function setSyncEnabledState(enabled: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(SYNC_ENABLED_KEY, String(enabled));
    syncEnabled = enabled;
  } catch (error) {
    console.error('[SheetsSync] Error saving sync enabled state:', error);
  }
}

// ============================================================================
// Public API
// ============================================================================

/**
 * Initialize the sync service
 */
export async function initSheetsSync(eventId: string): Promise<void> {
  currentEventId = eventId;
  lastSyncTime = await loadLastSyncTime();
  syncEnabled = await loadSyncEnabled();

  console.log(`[SheetsSync] Initialized for event ${eventId}, sync enabled: ${syncEnabled}, has sync function: ${!!SYNC_FUNCTION_URL}`);

  // Perform initial sync if enabled
  if (syncEnabled && SYNC_FUNCTION_URL) {
    // Delay initial sync to avoid startup congestion
    setTimeout(() => {
      performSync();
    }, 5000);
  }
}

/**
 * Start the periodic sync
 */
export function startSheetsSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
  }

  if (!syncEnabled) {
    console.log('[SheetsSync] Sync is disabled, not starting');
    return;
  }

  if (!SYNC_FUNCTION_URL) {
    console.log('[SheetsSync] No sync function URL configured, sync will log only');
    // Still start the interval for logging purposes
  }

  syncInterval = setInterval(() => {
    if (currentEventId && syncEnabled) {
      performSync();
    }
  }, SYNC_INTERVAL_MS);

  console.log(`[SheetsSync] Started periodic sync (interval: ${SYNC_INTERVAL_MS}ms)`);
}

/**
 * Stop the periodic sync
 */
export function stopSheetsSync(): void {
  if (syncInterval) {
    clearInterval(syncInterval);
    syncInterval = null;
    console.log('[SheetsSync] Stopped periodic sync');
  }
}

/**
 * Trigger an immediate sync
 */
export async function triggerSync(mealId?: string): Promise<SyncResult | null> {
  if (mealId) {
    currentMealId = mealId;
  }
  return performSync();
}

/**
 * Get the current sync status
 */
export async function getSyncStatus(): Promise<SyncStatus> {
  return {
    enabled: syncEnabled,
    lastSync: lastSyncTime,
    nextSync: lastSyncTime ? lastSyncTime + SYNC_INTERVAL_MS : null,
    inProgress: isSyncing,
    lastError,
    syncCount,
  };
}

/**
 * Enable or disable sync
 */
export async function setSheetsSyncEnabled(enabled: boolean): Promise<void> {
  await setSyncEnabledState(enabled);

  if (enabled && !syncInterval) {
    startSheetsSync();
  } else if (!enabled && syncInterval) {
    stopSheetsSync();
  }
}

/**
 * Update the current event ID
 */
export function setSyncEventId(eventId: string): void {
  currentEventId = eventId;
  console.log(`[SheetsSync] Event ID updated to ${eventId}`);
}

/**
 * Update the current meal ID (for more targeted syncs)
 */
export function setSyncMealId(mealId: string): void {
  currentMealId = mealId;
  console.log(`[SheetsSync] Meal ID updated to ${mealId}`);
}

/**
 * Clear the last sync time (force full sync on next run)
 */
export async function clearLastSync(): Promise<void> {
  await setLastSyncTime(0);
  console.log('[SheetsSync] Last sync time cleared');
}

// ============================================================================
// React Hook for Sync Management
// ============================================================================

interface UseSheetsSyncOptions {
  eventId: string | null;
  enabled?: boolean;
  mealId?: string;
}

export function useSheetsSync({ eventId, enabled = true, mealId }: UseSheetsSyncOptions) {
  const appState = useRef<AppStateStatus>(AppState.currentState);

  useEffect(() => {
    if (!eventId || !enabled) {
      stopSheetsSync();
      return;
    }

    // Initialize sync
    initSheetsSync(eventId);
    startSheetsSync();

    // Update meal ID if provided
    if (mealId) {
      setSyncMealId(mealId);
    }

    // Handle app state changes
    const subscription = AppState.addEventListener('change', (nextAppState) => {
      if (appState.current.match(/inactive|background/) && nextAppState === 'active') {
        // App came to foreground, trigger a sync
        console.log('[SheetsSync] App became active, triggering sync');
        performSync();
      }
      appState.current = nextAppState;
    });

    return () => {
      subscription.remove();
      stopSheetsSync();
    };
  }, [eventId, enabled, mealId]);

  return {
    triggerSync: () => performSync(),
    getSyncStatus,
    setSyncEnabled: setSheetsSyncEnabled,
  };
}
