/**
 * Supabase Database Types
 * These match the schema in migrations/001_initial_schema.sql
 */

// ============================================================================
// Events
// ============================================================================
export interface Event {
  event_id: string;
  event_name: string;
  start_date: string;
  end_date: string;
  location?: string;
  expected_attendance?: number;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface EventInsert {
  event_id: string;
  event_name: string;
  start_date: string;
  end_date: string;
  location?: string;
  expected_attendance?: number;
  status?: string;
}

// ============================================================================
// Meals
// ============================================================================
export interface Meal {
  meal_id: string;
  event_id: string;
  meal_type: string;
  day_number: number;
  meal_instance: string;
  serving_start_time: string;
  planned_servings?: number;
  expected_devotees?: number;
  status?: string;
  created_at: string;
  updated_at: string;
}

export interface MealInsert {
  meal_id: string;
  event_id: string;
  meal_type: string;
  day_number: number;
  meal_instance: string;
  serving_start_time: string;
  planned_servings?: number;
  expected_devotees?: number;
  status?: string;
}

// ============================================================================
// Menu Items
// ============================================================================
export interface MenuItem {
  item_id: string;
  meal_id: string;
  name: string;
  category: string;
  planned_trays?: number;
  ready_trays?: number;
  kitchen_storage_moved?: number;
  cooking_status?: string;
  is_vegan?: boolean;
  contains_gluten?: boolean;
  allergens?: string;
  updated_at: string;
}

export interface MenuItemInsert {
  item_id: string;
  meal_id: string;
  name: string;
  category: string;
  planned_trays?: number;
  ready_trays?: number;
  kitchen_storage_moved?: number;
  cooking_status?: string;
  is_vegan?: boolean;
  contains_gluten?: boolean;
  allergens?: string;
}

// ============================================================================
// Location Inventory
// ============================================================================
export interface LocationInventory {
  inventory_id: string;
  meal_id: string;
  item_id: string;
  item_name: string;
  category: string;
  planned_trays?: number;
  ready_trays?: number;
  kitchen?: number;
  staging?: number;
  refill_1?: number;
  refill_2?: number;
  refill_3?: number;
  served?: number;
  left_over?: number;
  updated_at: string;
}

export interface LocationInventoryInsert {
  inventory_id: string;
  meal_id: string;
  item_id: string;
  item_name: string;
  category: string;
  planned_trays?: number;
  ready_trays?: number;
  kitchen?: number;
  staging?: number;
  refill_1?: number;
  refill_2?: number;
  refill_3?: number;
  served?: number;
  left_over?: number;
}

// For updateLocationInventory operation
export interface LocationInventoryUpdate {
  meal_id: string;
  item_id: string;
  location: 'kitchen' | 'staging' | 'refill_1' | 'refill_2' | 'refill_3' | 'served' | 'left_over';
  quantity: number;
  action: 'add' | 'subtract';
}

// ============================================================================
// Transfers
// ============================================================================
export interface Transfer {
  transfer_id: string;
  meal_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  from_location: string;
  to_location: string;
  from_user: string;
  to_user?: string;
  status: 'sent' | 'received';
  timestamp_sent: string;
  timestamp_received?: string;
}

export interface TransferInsert {
  transfer_id?: string;
  meal_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  from_location: string;
  to_location: string;
  from_user: string;
  to_user?: string;
  status?: 'sent' | 'received';
}

// ============================================================================
// Refill Requests
// ============================================================================
export interface RefillRequest {
  request_id: string;
  meal_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  refill_station: string;
  requested_by: string;
  status: 'pending' | 'fulfilled' | 'cancelled';
  timestamp: string;
  fulfilled_at?: string;
}

export interface RefillRequestInsert {
  request_id?: string;
  meal_id: string;
  item_id: string;
  item_name: string;
  quantity: number;
  refill_station: string;
  requested_by: string;
  status?: 'pending' | 'fulfilled' | 'cancelled';
}

// ============================================================================
// Dashboard Settings
// ============================================================================
export interface DashboardSetting {
  setting_id: string;
  event_id: string;
  setting_type: string;
  setting_value: string;
  updated_at: string;
  updated_by: string;
}

export interface DashboardSettingInsert {
  setting_id: string;
  event_id: string;
  setting_type: string;
  setting_value: string;
  updated_by: string;
}

// ============================================================================
// Dashboard Summary (combined view)
// ============================================================================
export interface DashboardSummaryData {
  menu: MenuItem[];
  inventory: LocationInventory[];
  pendingTransfersCount: number;
  pendingRequestsCount: number;
}

// ============================================================================
// Users
// ============================================================================
export interface User {
  user_id: string;
  name: string;
  email?: string;
  role?: string;
  team_assignment?: string;
  created_at: string;
}

// ============================================================================
// API Response Types
// ============================================================================
export interface ApiResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

// ============================================================================
// Offline Queue Types
// ============================================================================
export type QueuedOperation =
  | { type: 'updateLocationInventory'; data: LocationInventoryUpdate }
  | { type: 'recordTransfer'; data: TransferInsert }
  | { type: 'updateMenuItem'; data: { item_id: string; updates: Partial<MenuItemInsert> } }
  | { type: 'createTransfer'; data: TransferInsert };

export interface QueuedOperationItem {
  id: string;
  operation: QueuedOperation;
  timestamp: number;
  retries: number;
}

// ============================================================================
// Real-time Subscription Types
// ============================================================================
export type RealtimeChannel =
  | 'location_inventory'
  | 'transfers'
  | 'menu_items'
  | 'refill_requests';

export interface RealtimePayload<T> {
  eventType: 'INSERT' | 'UPDATE' | 'DELETE';
  new: T;
  old: T;
}
