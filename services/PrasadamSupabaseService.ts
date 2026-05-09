/**
 * Prasadam Service - Supabase Backend with Google Sheets Fallback
 *
 * This service provides a unified API that:
 * 1. Uses Supabase as the primary, fast backend
 * 2. Falls back to Google Sheets if Supabase is unavailable
 * 3. Queues operations offline when neither is available
 * 4. Syncs queued operations when connectivity returns
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import NetInfo from '@react-native-community/netinfo';
import * as SupabaseService from './SupabaseService';

// Import the old service for fallback (and re-export its types for compatibility)
import * as GoogleSheetsService from './PrasadamSheetsService';

// Re-export types from GoogleSheetsService for full backward compatibility
export type {
  Event,
  Meal,
  MenuItem,
  LocationInventoryItem,
  Transfer,
  DashboardSettingsItem,
  DashboardSummaryData,
} from './PrasadamSheetsService';
import { initSheetsSync, startSheetsSync, setSyncEventId } from './BackgroundSheetsSyncService';

// ============================================================================
// Configuration
// ============================================================================

const USE_SUPABASE_KEY = '@use_supabase';
const QUEUE_KEY = '@prasadam_operation_queue';
const MAX_QUEUE_SIZE = 100;
const MAX_RETRY_ATTEMPTS = 3;

// Check if Supabase is configured
const isSupabaseConfigured = (): boolean => {
  return !!(
    process.env.EXPO_PUBLIC_SUPABASE_URL &&
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY
  );
};

// Check if Google Sheets backend is forced
const isSheetsBackendForced = (): boolean => {
  return process.env.EXPO_PUBLIC_FORCE_SHEETS_BACKEND === 'true';
};

// ============================================================================
// Connection State
// ============================================================================

let isOnline: boolean = true;
let useSupabase: boolean = isSupabaseConfigured() && !isSheetsBackendForced();
let queueProcessorInterval: NodeJS.Timeout | null = null;

// Monitor network state
NetInfo.fetch().then((state) => {
  isOnline = state.isConnected ?? true;
});

NetInfo.addEventListener((state) => {
  const wasOffline = !isOnline;
  isOnline = state.isConnected ?? true;

  // If we just came back online, process the queue
  if (wasOffline && isOnline) {
    processQueue();
  }
});

// ============================================================================
// Queue Management
// ============================================================================

export interface QueuedOperation {
  id: string;
  operation: string;
  data: any;
  timestamp: number;
  retries: number;
}

interface QueueState {
  operations: QueuedOperation[];
}

async function getQueue(): Promise<QueuedOperation[]> {
  try {
    const queueJson = await AsyncStorage.getItem(QUEUE_KEY);
    if (queueJson) {
      const state: QueueState = JSON.parse(queueJson);
      return state.operations || [];
    }
  } catch (error) {
    console.error('[PrasadamService] Error reading queue:', error);
  }
  return [];
}

async function saveQueue(operations: QueuedOperation[]): Promise<void> {
  try {
    const state: QueueState = { operations };
    await AsyncStorage.setItem(QUEUE_KEY, JSON.stringify(state));
  } catch (error) {
    console.error('[PrasadamService] Error saving queue:', error);
  }
}

async function addToQueue(operation: string, data: any): Promise<void> {
  const queue = await getQueue();

  // Check queue size limit
  if (queue.length >= MAX_QUEUE_SIZE) {
    console.warn('[PrasadamService] Queue full, removing oldest operation');
    queue.shift();
  }

  queue.push({
    id: `op_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
    operation,
    data,
    timestamp: Date.now(),
    retries: 0,
  });

  await saveQueue(queue);
  console.log(`[PrasadamService] Queued ${operation}. Queue size: ${queue.length}`);
}

async function removeFromQueue(operationId: string): Promise<void> {
  let queue = await getQueue();
  queue = queue.filter((op) => op.id !== operationId);
  await saveQueue(queue);
}

/**
 * Process queued operations
 */
export async function processQueue(): Promise<void> {
  if (!isOnline) {
    console.log('[PrasadamService] Offline, skipping queue processing');
    return;
  }

  const queue = await getQueue();
  if (queue.length === 0) return;

  console.log(`[PrasadamService] Processing ${queue.length} queued operations...`);

  // Process operations in order
  for (const operation of queue) {
    if (operation.retries >= MAX_RETRY_ATTEMPTS) {
      console.warn(`[PrasadamService] Skipping ${operation.operation}, max retries reached`);
      await removeFromQueue(operation.id);
      continue;
    }

    try {
      let success = false;

      // Execute the operation based on type
      switch (operation.operation) {
        case 'updateLocationInventory':
          success = await updateLocationInventoryInternal(operation.data);
          break;
        case 'recordTransfer':
          success = await recordTransferInternal(operation.data);
          break;
        case 'updateMenuItem':
          success = await updateMenuItemInternal(operation.data);
          break;
        default:
          console.warn(`[PrasadamService] Unknown operation: ${operation.operation}`);
          await removeFromQueue(operation.id);
          continue;
      }

      if (success) {
        await removeFromQueue(operation.id);
      } else {
        // Increment retry count
        operation.retries++;
        const updatedQueue = await getQueue();
        const opIndex = updatedQueue.findIndex((op) => op.id === operation.id);
        if (opIndex !== -1) {
          updatedQueue[opIndex].retries = operation.retries;
          await saveQueue(updatedQueue);
        }
      }
    } catch (error) {
      console.error(`[PrasadamService] Error processing queued operation:`, error);
      operation.retries++;
      const updatedQueue = await getQueue();
      const opIndex = updatedQueue.findIndex((op) => op.id === operation.id);
      if (opIndex !== -1) {
        updatedQueue[opIndex].retries = operation.retries;
        await saveQueue(updatedQueue);
      }
    }
  }

  const remaining = await getQueue();
  if (remaining.length > 0) {
    console.log(`[PrasadamService] ${remaining.length} operations remaining in queue`);
  }
}

/**
 * Start automatic queue processing
 */
export function startQueueProcessor(intervalMs: number = 30000): void {
  if (queueProcessorInterval) {
    clearInterval(queueProcessorInterval);
  }

  queueProcessorInterval = setInterval(() => {
    if (isOnline) {
      processQueue();
    }
  }, intervalMs);

  console.log(`[PrasadamService] Queue processor started (interval: ${intervalMs}ms)`);
}

/**
 * Stop automatic queue processing
 */
export function stopQueueProcessor(): void {
  if (queueProcessorInterval) {
    clearInterval(queueProcessorInterval);
    queueProcessorInterval = null;
    console.log('[PrasadamService] Queue processor stopped');
  }
}

/**
 * Get queue status
 */
export async function getQueueStatus(): Promise<{ size: number; operations: QueuedOperation[] }> {
  const operations = await getQueue();
  return {
    size: operations.length,
    operations: operations.slice(0, 10), // Return first 10 for display
  };
}

/**
 * Clear the queue
 */
export async function clearQueue(): Promise<void> {
  await AsyncStorage.removeItem(QUEUE_KEY);
  console.log('[PrasadamService] Queue cleared');
}

// ============================================================================
// Fallback to Google Sheets
// ============================================================================

async function withFallback<T>(
  primaryOp: () => Promise<T>,
  fallbackOp: () => Promise<T>
): Promise<T> {
  // Try Supabase first if enabled and online
  if (useSupabase && isOnline) {
    try {
      const result = await primaryOp();
      return result;
    } catch (error) {
      console.warn('[PrasadamService] Supabase operation failed, falling back to Sheets:', error);
      // Fall through to Sheets
    }
  }

  // Fall back to Google Sheets
  return fallbackOp();
}

// ============================================================================
// Event Operations
// ============================================================================

export async function getEvents(forceRefresh = false): Promise<GoogleSheetsService.Event[]> {
  if (useSupabase && isOnline) {
    return await SupabaseService.getEvents();
  }
  return await GoogleSheetsService.getEvents(forceRefresh);
}

// ============================================================================
// Meal Operations
// ============================================================================

export async function getMeals(eventId: string, forceRefresh = false): Promise<GoogleSheetsService.Meal[]> {
  if (useSupabase && isOnline) {
    return await SupabaseService.getMeals(eventId);
  }
  return await GoogleSheetsService.getMeals(eventId, forceRefresh);
}

export async function addMeal(data: {
  event_id: string;
  meal_type: string;
  day_number: number;
  meal_instance: string;
  serving_start_time: string;
  planned_servings: number;
}): Promise<boolean> {
  if (useSupabase && isOnline) {
    return await SupabaseService.createMeal({
      meal_id: `meal_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`,
      ...data,
    });
  }
  return await GoogleSheetsService.addMeal(data);
}

export async function updateMealDevotees(data: {
  meal_id: string;
  expected_devotees: number;
}): Promise<boolean> {
  if (useSupabase && isOnline) {
    return await SupabaseService.updateMealDevotees(data.meal_id, data.expected_devotees);
  }
  return await GoogleSheetsService.updateMealDevotees(data);
}

// ============================================================================
// Menu Item Operations
// ============================================================================

export async function getMenuItems(mealId: string, forceRefresh = false): Promise<GoogleSheetsService.MenuItem[]> {
  if (useSupabase && isOnline) {
    return await SupabaseService.getMenuItems(mealId);
  }
  return await GoogleSheetsService.getMenuItems(mealId, forceRefresh);
}

export async function addMenuItem(item: {
  item_id: string;
  meal_id: string;
  name: string;
  category: string;
  planned_trays: number;
  is_vegan?: boolean;
  contains_gluten?: boolean;
  allergens?: string;
}): Promise<boolean> {
  if (useSupabase && isOnline) {
    return await SupabaseService.createMenuItem(item);
  }
  return await GoogleSheetsService.addMenuItem(item);
}

export async function updateMenuItemInternal(data: {
  itemId: string;
  updates: Record<string, any>;
}): Promise<boolean> {
  if (useSupabase) {
    return await SupabaseService.updateMenuItem(data.itemId, data.updates);
  }
  return await GoogleSheetsService.updateMenuItem(data);
}

export async function updateMenuItem(data: {
  itemId: string;
  updates: Record<string, any>;
}): Promise<boolean> {
  if (useSupabase && isOnline) {
    return await updateMenuItemInternal(data);
  }

  // Queue for offline
  if (!isOnline) {
    await addToQueue('updateMenuItem', data);
    return true; // Optimistic return
  }

  return await GoogleSheetsService.updateMenuItem(data);
}

export async function updateCookingStatus(data: {
  itemId: string;
  status: string;
}): Promise<boolean> {
  if (useSupabase && isOnline) {
    return await SupabaseService.updateCookingStatus(data.itemId, data.status);
  }
  return await GoogleSheetsService.updateCookingStatus(data);
}

export async function updateTrayCount(data: {
  itemId: string;
  adjustment: number;
}): Promise<boolean> {
  if (useSupabase && isOnline) {
    return await SupabaseService.updateTrayCount(data.itemId, data.adjustment);
  }
  return await GoogleSheetsService.updateTrayCount(data);
}

// ============================================================================
// Location Inventory Operations
// ============================================================================

export async function getLocationInventory(
  mealId: string,
  forceRefresh = false
): Promise<GoogleSheetsService.LocationInventoryItem[]> {
  if (useSupabase && isOnline) {
    const items = await SupabaseService.getLocationInventory(mealId);
    // Transform to match old interface
    return items.map((item) => ({
      ...item,
      item_id: item.item_id,
      meal_id: item.meal_id,
    }));
  }
  return await GoogleSheetsService.getLocationInventory(mealId, forceRefresh);
}

export async function updateLocationInventoryInternal(data: {
  mealId: string;
  itemId: string;
  location: string;
  quantity: number;
  action: 'add' | 'subtract';
}): Promise<boolean> {
  if (useSupabase) {
    return await SupabaseService.updateLocationInventory({
      meal_id: data.mealId,
      item_id: data.itemId,
      location: data.location as any,
      quantity: data.quantity,
      action: data.action,
    });
  }
  return await GoogleSheetsService.updateLocationInventory(data);
}

export async function updateLocationInventory(data: {
  mealId: string;
  itemId: string;
  location: string;
  quantity: number;
  action: 'add' | 'subtract';
}): Promise<boolean> {
  if (useSupabase && isOnline) {
    return await updateLocationInventoryInternal(data);
  }

  // Queue for offline
  if (!isOnline) {
    await addToQueue('updateLocationInventory', data);
    return true; // Optimistic return
  }

  return await GoogleSheetsService.updateLocationInventory(data);
}

// ============================================================================
// Transfer Operations
// ============================================================================

export async function getTransfers(mealId: string, forceRefresh = false): Promise<GoogleSheetsService.Transfer[]> {
  if (useSupabase && isOnline) {
    return await SupabaseService.getTransfers(mealId);
  }
  return await GoogleSheetsService.getTransfers(mealId, forceRefresh);
}

export async function getRecentTransfers(
  mealId: string,
  itemId: string,
  limit: number = 3
): Promise<GoogleSheetsService.Transfer[]> {
  if (useSupabase && isOnline) {
    return await SupabaseService.getRecentTransfers(mealId, itemId, limit);
  }
  // Fallback: get all and filter
  const all = await GoogleSheetsService.getTransfers(mealId);
  return all
    .filter((t) => t.item_id === itemId)
    .sort((a, b) => b.timestamp_sent.localeCompare(a.timestamp_sent))
    .slice(0, limit);
}

export async function recordTransferInternal(data: {
  meal_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  from_location: string;
  to_location: string;
  from_user: string;
  to_user?: string;
}): Promise<{ transfer_id: string } | null> {
  if (useSupabase) {
    const transferId = await SupabaseService.recordTransfer(data);
    return transferId ? { transfer_id: transferId } : null;
  }
  return await GoogleSheetsService.recordTransfer(data);
}

export async function recordTransfer(data: {
  meal_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  from_location: string;
  to_location: string;
  from_user: string;
  to_user?: string;
}): Promise<{ transfer_id: string } | null> {
  if (useSupabase && isOnline) {
    return await recordTransferInternal(data);
  }

  // Queue for offline
  if (!isOnline) {
    const transferId = `tr_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
    await addToQueue('recordTransfer', { ...data, transfer_id: transferId });
    return { transfer_id: transferId }; // Optimistic return
  }

  return await GoogleSheetsService.recordTransfer(data);
}

export async function createTransfer(data: {
  meal_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  from_location: string;
  to_location: string;
  from_user: string;
  to_user?: string;
}): Promise<{ transfer_id: string } | null> {
  return recordTransfer(data);
}

export async function getPendingTransfers(toLocation: string): Promise<GoogleSheetsService.Transfer[]> {
  if (useSupabase && isOnline) {
    return await SupabaseService.getPendingTransfers(toLocation);
  }
  return await GoogleSheetsService.getPendingTransfers(toLocation);
}

// ============================================================================
// Dashboard Settings Operations
// ============================================================================

export async function getDashboardSettings(
  eventId: string,
  forceRefresh = false
): Promise<GoogleSheetsService.DashboardSettingsItem[]> {
  if (useSupabase && isOnline) {
    const settings = await SupabaseService.getDashboardSettings(eventId);
    // Transform to match old interface
    return settings.map((s) => ({
      ...s,
      event_id: s.event_id,
    }));
  }
  return await GoogleSheetsService.getDashboardSettings(eventId, forceRefresh);
}

export async function saveDashboardSettings(data: {
  settings: Array<{
    setting_id: string;
    event_id: string;
    setting_type: string;
    setting_value: string;
    updated_at: string;
    updated_by: string;
  }>;
}): Promise<boolean> {
  if (useSupabase && isOnline) {
    return await SupabaseService.saveDashboardSettings(data.settings);
  }
  return await GoogleSheetsService.saveDashboardSettings(data);
}

// ============================================================================
// Dashboard Summary Operations
// ============================================================================

export async function getDashboardSummary(
  mealId: string,
  forceRefresh = false
): Promise<GoogleSheetsService.DashboardSummaryData | null> {
  if (useSupabase && isOnline) {
    return await SupabaseService.getDashboardSummary(mealId);
  }
  return await GoogleSheetsService.getDashboardSummary(mealId, forceRefresh);
}

// ============================================================================
// Real-time Subscriptions (Supabase only)
// ============================================================================

export function subscribeToMealInventory(
  mealId: string,
  callback: (inventory: GoogleSheetsService.LocationInventoryItem[]) => void
): () => void {
  if (useSupabase) {
    return SupabaseService.subscribeToMealInventory(mealId, callback);
  }
  // No-op for Sheets
  return () => {};
}

export function subscribeToPendingTransfers(
  toLocation: string,
  callback: (transfers: GoogleSheetsService.Transfer[]) => void
): () => void {
  if (useSupabase) {
    return SupabaseService.subscribeToPendingTransfers(toLocation, callback);
  }
  // No-op for Sheets
  return () => {};
}

export function subscribeToConnectionStatus(
  callback: (connected: boolean) => void
): () => void {
  if (useSupabase) {
    return SupabaseService.subscribeToConnectionStatus(callback);
  }
  // No-op for Sheets
  return () => {};
}

// ============================================================================
// Cache Management (from original service)
// ============================================================================

export async function clearCache(): Promise<void> {
  if (useSupabase) {
    // Supabase doesn't use cache in the same way
    return;
  }
  return await GoogleSheetsService.clearCache();
}

export async function loadPersistentCache(): Promise<void> {
  if (useSupabase) {
    // Supabase doesn't use cache in the same way
    return;
  }
  return await GoogleSheetsService.loadPersistentCache();
}

// ============================================================================
// Initialization
// ============================================================================

/**
 * Initialize the Prasadam service
 * Call this on app startup with the selected event ID
 */
export async function initializePrasadamService(eventId?: string): Promise<void> {
  // Load persistent cache from Sheets service
  await GoogleSheetsService.loadPersistentCache();

  // Check if we should use Supabase (respecting env var and saved setting)
  if (isSheetsBackendForced()) {
    // Environment variable forces Sheets backend
    useSupabase = false;
    console.log('[PrasadamService] Using Google Sheets (forced by EXPO_PUBLIC_FORCE_SHEETS_BACKEND)');
  } else {
    const savedSetting = await AsyncStorage.getItem(USE_SUPABASE_KEY);
    if (savedSetting !== null) {
      useSupabase = savedSetting === 'true' && isSupabaseConfigured();
    } else {
      useSupabase = isSupabaseConfigured();
    }
  }

  // Start queue processor
  startQueueProcessor();

  // Process any pending queue items
  if (isOnline) {
    await processQueue();
  }

  // Start background sync to Google Sheets if using Supabase
  if (useSupabase && eventId) {
    setSyncEventId(eventId);
    await initSheetsSync(eventId);
    startSheetsSync();
  }

  console.log(`[PrasadamService] Initialized. Using Supabase: ${useSupabase}, Online: ${isOnline}`);
}

/**
 * Toggle between Supabase and Google Sheets
 */
export async function setUseSupabase(use: boolean): Promise<void> {
  if (use && !isSupabaseConfigured()) {
    console.warn('[PrasadamService] Supabase not configured, cannot enable');
    return;
  }

  if (use && isSheetsBackendForced()) {
    console.warn('[PrasadamService] Cannot enable Supabase when EXPO_PUBLIC_FORCE_SHEETS_BACKEND=true');
    return;
  }

  useSupabase = use;
  await AsyncStorage.setItem(USE_SUPABASE_KEY, String(use));
  console.log(`[PrasadamService] Using Supabase: ${use}`);
}

/**
 * Get current backend status
 */
export function getBackendStatus(): {
  useSupabase: boolean;
  isOnline: boolean;
  isSupabaseConfigured: boolean;
  isSheetsBackendForced: boolean;
  sheetsSyncEnabled: boolean;
} {
  return {
    useSupabase,
    isOnline,
    isSupabaseConfigured: isSupabaseConfigured(),
    isSheetsBackendForced: isSheetsBackendForced(),
    sheetsSyncEnabled: useSupabase, // Sync is enabled when using Supabase
  };
}

// ============================================================================
// Sheets Sync - Re-export for convenience
// ============================================================================

export {
  triggerSync as triggerSheetsSync,
  getSyncStatus as getSheetsSyncStatus,
  setSheetsSyncEnabled,
  useSheetsSync,
  type SyncStatus,
  type SyncResult,
} from './BackgroundSheetsSyncService';
