/**
 * Prasadam Sheets Service
 * Google Sheets integration for Prasadam Distribution tracking
 *
 * Matches the Google Apps Script backend operations
 */

import AsyncStorage from '@react-native-async-storage/async-storage';

// Configuration
const PRASADAM_SPREADSHEET_ID = '1iiq9EeSDQ9eQzwkK4rQPbNXJGD_cnp-z0bnlWzDcW6g';
const GOOGLE_APPS_SCRIPT_URL =
  'https://script.google.com/macros/s/AKfycbx6uOVRafphy0zCrTPgX4D3Rz9vz8-MDEUDHB_D7XZXaRbENg9X9-V2rDSbaRieeNx-Ag/exec';

// Cache configuration
const CACHE_DURATION_MS = 5000; // 5 seconds

// In-memory cache
interface CacheEntry<T> {
  data: T;
  timestamp: number;
}

const memoryCache: Map<string, CacheEntry<any>> = new Map();

// AsyncStorage keys
const CACHE_KEY_PREFIX = '@prasadam_cache_';

// Types matching the backend responses
export interface Event {
  event_id: string;
  event_name: string;
  start_date: string;
  end_date: string;
  location: string;
  expected_attendance: number;
  status: string;
  created_at: string;
}

export interface Meal {
  meal_id: string;
  event_id: string;
  meal_type: string;
  day_number: number;
  meal_instance: string;
  serving_start_time: string;
  planned_servings: number;
  expected_devotees?: number; // Expected number of devotees for this meal
  status: string;
  created_at: string;
  updated_at: string;
  meal_name?: string; // Display name for the meal
  date?: string; // Date of the meal
}

export interface MenuItem {
  item_id: string;
  meal_id: string;
  name: string;
  category: string;
  planned_trays: number;
  ready_trays: number;
  kitchen_storage_moved: number; // Cumulative trays moved from Cooked to Stored (Kitchen Storage)
  cooking_status: string;
  is_vegan: boolean;
  contains_gluten: boolean;
  allergens: string;
  updated_at: string;
}

export interface LocationInventoryItem {
  inventory_id: string;
  meal_id: string;
  item_id: string;
  item_name: string;
  category: string;
  planned_trays: number;
  ready_trays: number;
  kitchen: number;
  staging: number;
  refill_1: number;
  refill_2: number;
  refill_3: number;
  served: number;
  left_over: number;
  updated_at: string;
}

export interface Transfer {
  transfer_id: string;
  meal_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  from_location: string;
  to_location: string;
  from_user: string;
  to_user: string;
  status: string;
  timestamp_sent: string;
  timestamp_received: string;
}

export interface DashboardSettingsItem {
  setting_id: string;
  event_id: string;
  setting_type: string;
  setting_value: string;
  updated_at: string;
  updated_by: string;
}

export interface DashboardSummaryData {
  menu: MenuItem[];
  inventory: LocationInventoryItem[];
  pendingTransfersCount: number;
  pendingRequestsCount: number;
}

// API Response wrapper
interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

/**
 * Generate cache key
 */
function getCacheKey(operation: string, params?: Record<string, any>): string {
  const paramStr = params ? JSON.stringify(params) : '';
  return `${operation}_${paramStr}`;
}

/**
 * Check if cache entry is still valid
 */
function isCacheValid(entry: CacheEntry<any>): boolean {
  return Date.now() - entry.timestamp < CACHE_DURATION_MS;
}

/**
 * Get from cache
 */
function getFromCache<T>(key: string): T | null {
  const entry = memoryCache.get(key);
  if (entry && isCacheValid(entry)) {
    return entry.data as T;
  }
  return null;
}

/**
 * Set cache
 */
function setCache<T>(key: string, data: T): void {
  memoryCache.set(key, {
    data,
    timestamp: Date.now(),
  });
}

/**
 * Make GET request (for read operations via query params)
 */
async function apiGet<T>(
  operation: string,
  params?: Record<string, any>,
  options?: { forceRefresh?: boolean }
): Promise<ApiResponse<T>> {
  const cacheKey = getCacheKey(operation, params);

  // Check cache first
  if (!options?.forceRefresh) {
    const cached = getFromCache<ApiResponse<T>>(cacheKey);
    if (cached) {
      return cached;
    }
  }

  try {
    // Build URL with operation and params
    const url = new URL(GOOGLE_APPS_SCRIPT_URL);
    url.searchParams.append('operation', operation);
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, String(value));
        }
      });
    }

    console.log(`[PrasadamSheetsService] API GET ${operation}:`, url.toString());

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    // Check if response is HTML (deployment error)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('Google Apps Script deployment may need refreshing. Redeploy the web app.');
    }

    const result: ApiResponse<T> = await response.json();
    console.log(`[PrasadamSheetsService] API GET ${operation} response:`, result);

    // Cache successful responses
    if (result.status === 'success') {
      setCache(cacheKey, result);
      await saveToPersistentCache(cacheKey, result);
    }

    return result;
  } catch (error) {
    console.error(`API GET failed for ${operation}:`, error);

    // Check for JSON parse error (likely HTML response from GAS)
    if (error instanceof Error && error.message.includes('JSON')) {
      console.error('[PrasadamSheetsService] JSON parse error - GAS deployment may need refresh');
      // Try to load from persistent cache on error
      const persistentCache = await loadFromPersistentCache<ApiResponse<T>>(cacheKey);
      if (persistentCache) {
        console.log('[PrasadamSheetsService] Using cached data due to API error');
        return persistentCache;
      }
      return {
        status: 'error',
        message: 'Google Apps Script returned invalid data. Try redeploying the web app.',
      };
    }

    // Try to load from persistent cache on error
    const persistentCache = await loadFromPersistentCache<ApiResponse<T>>(cacheKey);
    if (persistentCache) {
      return persistentCache;
    }

    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Make POST request (for write operations via body)
 */
async function apiPost<T>(
  operation: string,
  data?: Record<string, any>
): Promise<ApiResponse<T>> {
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain', // Apps Script requires this
      },
      body: JSON.stringify({
        operation,
        ...data,
      }),
    });

    // Check if response is HTML (deployment error)
    const contentType = response.headers.get('content-type') || '';
    if (contentType.includes('text/html')) {
      throw new Error('Google Apps Script deployment may need refreshing. Redeploy the web app.');
    }

    const result: ApiResponse<T> = await response.json();

    // Clear relevant caches on successful write
    if (result.status === 'success') {
      await clearCacheForOperation(operation);
    }

    return result;
  } catch (error) {
    console.error(`API POST failed for ${operation}:`, error);

    // Check for JSON parse error (likely HTML response from GAS)
    if (error instanceof Error && error.message.includes('JSON')) {
      return {
        status: 'error',
        message: 'Google Apps Script returned invalid data. Try redeploying the web app.',
      };
    }
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

/**
 * Save to persistent cache
 */
async function saveToPersistentCache<T>(key: string, data: T): Promise<void> {
  try {
    const cacheData = JSON.stringify(data);
    await AsyncStorage.setItem(`${CACHE_KEY_PREFIX}${key}`, cacheData);
  } catch (error) {
    console.error('Failed to save persistent cache:', error);
  }
}

/**
 * Load from persistent cache
 */
async function loadFromPersistentCache<T>(key: string): Promise<T | null> {
  try {
    const cacheData = await AsyncStorage.getItem(`${CACHE_KEY_PREFIX}${key}`);
    if (cacheData) {
      return JSON.parse(cacheData) as T;
    }
  } catch (error) {
    console.error('Failed to load persistent cache:', error);
  }
  return null;
}

/**
 * Clear cache for specific operation patterns
 */
async function clearCacheForOperation(operation: string): Promise<void> {
  // Patterns to clear based on operation
  const patterns: Record<string, string[]> = {
    addMenuItem: ['getMenuItems', 'getLocationInventory', 'getDashboardSummary'],
    updateMenuItem: ['getMenuItems', 'getLocationInventory', 'getDashboardSummary'],
    updateCookingStatus: ['getMenuItems', 'getDashboardSummary'],
    createTransfer: ['getTransfers', 'getLocationInventory', 'getDashboardSummary'],
    recordTransfer: ['getTransfers', 'getLocationInventory', 'getDashboardSummary'],
    updateLocationInventory: ['getLocationInventory', 'getDashboardSummary'],
    saveDashboardSettings: ['getDashboardSettings'],
    addMeal: ['getMeals'],
    updateMealDevotees: ['getMeals'],
  };

  const patternsToClear = patterns[operation] || [];

  for (const pattern of patternsToClear) {
    for (const [key] of memoryCache) {
      if (key.startsWith(pattern)) {
        memoryCache.delete(key);
      }
    }
  }

  // Also clear from AsyncStorage
  try {
    const keys = await AsyncStorage.getAllKeys();
    const keysToDelete = keys.filter(k =>
      k.startsWith(CACHE_KEY_PREFIX) &&
      patternsToClear.some(p => k.includes(p))
    );
    if (keysToDelete.length > 0) {
      await AsyncStorage.multiRemove(keysToDelete);
    }
  } catch (error) {
    console.error('Failed to clear persistent cache:', error);
  }
}

/**
 * Clear all cache
 */
export async function clearCache(): Promise<void> {
  memoryCache.clear();
  try {
    const keys = await AsyncStorage.getAllKeys();
    const prasadamKeys = keys.filter(k => k.startsWith(CACHE_KEY_PREFIX));
    await AsyncStorage.multiRemove(prasadamKeys);
  } catch (error) {
    console.error('Failed to clear persistent cache:', error);
  }
}

/**
 * Load persistent cache on app start
 */
export async function loadPersistentCache(): Promise<void> {
  try {
    const keys = await AsyncStorage.getAllKeys();
    const prasadamKeys = keys.filter(k => k.startsWith(CACHE_KEY_PREFIX));

    for (const key of prasadamKeys) {
      const cacheData = await AsyncStorage.getItem(key);
      if (cacheData) {
        const data = JSON.parse(cacheData);
        const shortKey = key.replace(CACHE_KEY_PREFIX, '');
        memoryCache.set(shortKey, data);
      }
    }
  } catch (error) {
    console.error('Failed to load persistent cache:', error);
  }
}

// ============================================================================
// Event Operations
// ============================================================================

export async function getEvents(forceRefresh = false): Promise<Event[]> {
  const response = await apiGet<Event[]>('getEvents', undefined, { forceRefresh });
  if (response.status === 'success' && response.data) {
    return response.data;
  }
  return [];
}

// ============================================================================
// Meal Operations
// ============================================================================

export async function getMeals(eventId: string, forceRefresh = false): Promise<Meal[]> {
  console.log('[PrasadamSheetsService] getMeals called with eventId:', eventId);
  const response = await apiGet<Meal[]>('getMeals', { eventId }, { forceRefresh });
  console.log('[PrasadamSheetsService] getMeals response:', response);
  if (response.status === 'success' && response.data) {
    return response.data;
  }
  return [];
}

export async function addMeal(data: {
  event_id: string;
  meal_type: string;
  day_number: number;
  meal_instance: string;
  serving_start_time: string;
  planned_servings: number;
}): Promise<boolean> {
  const response = await apiPost('addMeal', data);
  return response.status === 'success';
}

export async function updateMealDevotees(data: {
  meal_id: string;
  expected_devotees: number;
}): Promise<boolean> {
  const response = await apiPost('updateMealDevotees', data);
  return response.status === 'success';
}

// ============================================================================
// Menu Item Operations
// ============================================================================

export async function getMenuItems(mealId: string, forceRefresh = false): Promise<MenuItem[]> {
  const response = await apiGet<MenuItem[]>('getMenuItems', { mealId }, { forceRefresh });
  if (response.status === 'success' && response.data) {
    return response.data;
  }
  return [];
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
  const response = await apiPost('addMenuItem', { item });
  return response.status === 'success';
}

export async function updateMenuItem(data: {
  itemId: string;
  updates: Record<string, any>;
}): Promise<boolean> {
  const response = await apiPost('updateMenuItem', data);
  return response.status === 'success';
}

export async function updateCookingStatus(data: {
  itemId: string;
  status: string;
}): Promise<boolean> {
  const response = await apiPost('updateCookingStatus', data);
  return response.status === 'success';
}

export async function updateTrayCount(data: {
  itemId: string;
  adjustment: number;
}): Promise<boolean> {
  const response = await apiPost('updateTrayCount', data);
  return response.status === 'success';
}

// ============================================================================
// Location Inventory Operations
// ============================================================================

export async function getLocationInventory(
  mealId: string,
  forceRefresh = false
): Promise<LocationInventoryItem[]> {
  const response = await apiGet<LocationInventoryItem[]>('getLocationInventory', { mealId }, { forceRefresh });
  if (response.status === 'success' && response.data) {
    return response.data;
  }
  return [];
}

export async function updateLocationInventory(data: {
  mealId: string;
  itemId: string;
  location: string;
  quantity: number;
  action: 'add' | 'subtract';
}): Promise<boolean> {
  console.log('[PrasadamSheetsService] updateLocationInventory called with:', data);
  const response = await apiPost('updateLocationInventory', data);
  console.log('[PrasadamSheelsService] updateLocationInventory response:', response);
  if (response.status !== 'success') {
    console.error('[PrasadamSheetsService] updateLocationInventory failed:', response.message);
  }
  return response.status === 'success';
}

// ============================================================================
// Transfer Operations
// ============================================================================

export async function getTransfers(mealId: string, forceRefresh = false): Promise<Transfer[]> {
  const response = await apiGet<Transfer[]>('getTransfers', { mealId }, { forceRefresh });
  if (response.status === 'success' && response.data) {
    return response.data;
  }
  return [];
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
  const response = await apiPost<{ transfer_id: string }>('createTransfer', data);
  if (response.status === 'success' && response.data) {
    return response.data;
  }
  return null;
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
  const response = await apiPost<{ transfer_id: string }>('recordTransfer', data);
  if (response.status === 'success' && response.data) {
    return response.data;
  }
  return null;
}

// Get pending transfers (sent but not received)
export async function getPendingTransfers(toLocation: string): Promise<Transfer[]> {
  const allTransfers = await getTransfers(''); // Get all transfers (this is a limitation)
  // Filter for pending transfers to this location
  return allTransfers.filter(t =>
    t.to_location === toLocation && t.status === 'sent'
  );
}

// ============================================================================
// Dashboard Settings Operations
// ============================================================================

export async function getDashboardSettings(eventId: string, forceRefresh = false): Promise<DashboardSettingsItem[]> {
  const response = await apiGet<DashboardSettingsItem[]>('getDashboardSettings', { eventId }, { forceRefresh });
  if (response.status === 'success' && response.data) {
    return response.data;
  }
  return [];
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
  const response = await apiPost('saveDashboardSettings', data);
  return response.status === 'success';
}

// ============================================================================
// Dashboard Summary Operations
// ============================================================================

export async function getDashboardSummary(mealId: string, forceRefresh = false): Promise<DashboardSummaryData | null> {
  console.log('[PrasadamSheetsService] getDashboardSummary called with mealId:', mealId);
  const response = await apiGet<DashboardSummaryData>('getDashboardSummary', { mealId }, { forceRefresh });
  console.log('[PrasadamSheetsService] getDashboardSummary response:', response);
  if (response.status === 'success' && response.data) {
    return response.data;
  }
  console.log('[PrasadamSheetsService] getDashboardSummary failed:', response);
  return null;
}

// ============================================================================
// Initialization Operations
// ============================================================================

export async function initializeSheet(): Promise<boolean> {
  const response = await apiPost('initializeSheet');
  return response.status === 'success';
}

export async function populateSampleData(): Promise<boolean> {
  const response = await apiPost('populateSampleData');
  return response.status === 'success';
}

export async function debugData(): Promise<any> {
  const response = await apiGet('debugData');
  if (response.status === 'success' && response.data) {
    return response.data;
  }
  return null;
}
