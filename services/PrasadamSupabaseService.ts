/**
 * Prasadam Service - Google Sheets Backend
 *
 * This service provides the Prasadam Distribution functionality
 * using Google Sheets as the backend.
 */

// Import everything from PrasadamSheetsService
import * as PrasadamSheets from './PrasadamSheetsService';

// Re-export all types and functions
export * from './PrasadamSheetsService';

// Re-export all functions with proper names
export const getEvents = PrasadamSheets.getEvents;
export const getMeals = PrasadamSheets.getMeals;
export const addMeal = PrasadamSheets.addMeal;
export const updateMealDevotees = PrasadamSheets.updateMealDevotees;
export const getMenuItems = PrasadamSheets.getMenuItems;
export const addMenuItem = PrasadamSheets.addMenuItem;
export const updateMenuItem = PrasadamSheets.updateMenuItem;
export const updateCookingStatus = PrasadamSheets.updateCookingStatus;
export const updateTrayCount = PrasadamSheets.updateTrayCount;
export const getLocationInventory = PrasadamSheets.getLocationInventory;
export const updateLocationInventory = PrasadamSheets.updateLocationInventory;
export const getTransfers = PrasadamSheets.getTransfers;
export const getRecentTransfers = PrasadamSheets.getRecentTransfers;
export const recordTransfer = PrasadamSheets.recordTransfer;
export const createTransfer = PrasadamSheets.createTransfer;
export const getPendingTransfers = PrasadamSheets.getPendingTransfers;
export const getDashboardSettings = PrasadamSheets.getDashboardSettings;
export const saveDashboardSettings = PrasadamSheets.saveDashboardSettings;
export const getDashboardSummary = PrasadamSheets.getDashboardSummary;
export const clearCache = PrasadamSheets.clearCache;
export const loadPersistentCache = PrasadamSheets.loadPersistentCache;

// Initialize function
export async function initializePrasadamService(eventId?: string): Promise<void> {
  try {
    await PrasadamSheets.loadPersistentCache();
    console.log('[PrasadamService] Initialized with Google Sheets backend');
  } catch (error) {
    console.error('[PrasadamService] Failed to initialize:', error);
    throw error;
  }
}

export function getBackendStatus(): {
  useSupabase: boolean;
  isOnline: boolean;
  isSupabaseConfigured: boolean;
  isSheetsBackendForced: boolean;
  sheetsSyncEnabled: boolean;
} {
  return {
    useSupabase: false,
    isOnline: true,
    isSupabaseConfigured: false,
    isSheetsBackendForced: true,
    sheetsSyncEnabled: false,
  };
}

// No-op subscriptions for Google Sheets
export function subscribeToMealInventory(
  mealId: string,
  callback: (inventory: any[]) => void
): () => void {
  return () => {};
}

export function subscribeToPendingTransfers(
  toLocation: string,
  callback: (transfers: any[]) => void
): () => void {
  return () => {};
}

export function subscribeToConnectionStatus(
  callback: (connected: boolean) => void
): () => void {
  return () => {};
}
