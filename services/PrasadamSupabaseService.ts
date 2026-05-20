/**
 * Prasadam Service - Google Sheets Backend
 *
 * This service provides the Prasadam Distribution functionality
 * using Google Sheets as the backend.
 */

// Re-export everything from PrasadamSheetsService
export * from './PrasadamSheetsService';

// Re-export specific functions for backward compatibility
export {
  getEvents,
  getMeals,
  addMeal,
  updateMealDevotees,
  getMenuItems,
  addMenuItem,
  updateMenuItem,
  updateCookingStatus,
  updateTrayCount,
  getLocationInventory,
  updateLocationInventory,
  getTransfers,
  getRecentTransfers,
  recordTransfer,
  createTransfer,
  getPendingTransfers,
  getDashboardSettings,
  saveDashboardSettings,
  getDashboardSummary,
  clearCache,
  loadPersistentCache,
} from './PrasadamSheetsService';

// Additional exports for compatibility (no-ops for Sheets)
export async function initializePrasadamService(eventId?: string): Promise<void> {
  await loadPersistentCache();
  console.log('[PrasadamService] Initialized with Google Sheets backend');
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
