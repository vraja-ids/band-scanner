-- ============================================================================
-- PRASADAM DISTRIBUTION - Supabase Schema
-- This schema mirrors the Google Sheets structure optimized for PostgreSQL
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ============================================================================
-- EVENTS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS events (
  event_id TEXT PRIMARY KEY,
  event_name TEXT NOT NULL,
  start_date TEXT NOT NULL,
  end_date TEXT NOT NULL,
  location TEXT,
  expected_attendance INTEGER DEFAULT 0,
  status TEXT DEFAULT 'active',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- MEALS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS meals (
  meal_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  meal_type TEXT NOT NULL, -- Breakfast, Lunch, Dinner
  day_number INTEGER NOT NULL,
  meal_instance TEXT NOT NULL,
  serving_start_time TEXT NOT NULL,
  planned_servings INTEGER DEFAULT 0,
  expected_devotees INTEGER DEFAULT 0,
  status TEXT DEFAULT 'planned',
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying meals by event
CREATE INDEX IF NOT EXISTS idx_meals_event_id ON meals(event_id);

-- ============================================================================
-- MENU ITEMS TABLE
-- ============================================================================
CREATE TABLE IF NOT EXISTS menu_items (
  item_id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meals(meal_id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL, -- normal, cold, dessert
  planned_trays INTEGER DEFAULT 0,
  ready_trays INTEGER DEFAULT 0,
  kitchen_storage_moved INTEGER DEFAULT 0, -- Cumulative Cooked→Stored
  cooking_status TEXT DEFAULT 'Not Started',
  is_vegan BOOLEAN DEFAULT false,
  contains_gluten BOOLEAN DEFAULT false,
  allergens TEXT DEFAULT '',
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Index for querying menu items by meal
CREATE INDEX IF NOT EXISTS idx_menu_items_meal_id ON menu_items(meal_id);

-- ============================================================================
-- LOCATION INVENTORY TABLE
-- This tracks the quantity at each location for each item/meal
-- ============================================================================
CREATE TABLE IF NOT EXISTS location_inventory (
  inventory_id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meals(meal_id) ON DELETE CASCADE,
  item_id TEXT NOT NULL REFERENCES menu_items(item_id) ON DELETE CASCADE,
  item_name TEXT NOT NULL,
  category TEXT NOT NULL,
  planned_trays INTEGER DEFAULT 0,
  ready_trays INTEGER DEFAULT 0,
  kitchen INTEGER DEFAULT 0,
  staging INTEGER DEFAULT 0,
  refill_1 INTEGER DEFAULT 0,
  refill_2 INTEGER DEFAULT 0,
  refill_3 INTEGER DEFAULT 0,
  served INTEGER DEFAULT 0,
  left_over INTEGER DEFAULT 0,
  updated_at TIMESTAMPTZ DEFAULT NOW(),

  -- Ensure one inventory record per item per meal
  UNIQUE(meal_id, item_id)
);

-- Indexes for common queries
CREATE INDEX IF NOT EXISTS idx_location_inventory_meal_id ON location_inventory(meal_id);
CREATE INDEX IF NOT EXISTS idx_location_inventory_item_id ON location_inventory(item_id);

-- ============================================================================
-- TRANSFERS TABLE
-- Records all movements between locations
-- ============================================================================
CREATE TABLE IF NOT EXISTS transfers (
  transfer_id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meals(meal_id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  from_location TEXT NOT NULL,
  to_location TEXT NOT NULL,
  from_user TEXT NOT NULL,
  to_user TEXT,
  status TEXT DEFAULT 'sent', -- sent, received
  timestamp_sent TIMESTAMPTZ DEFAULT NOW(),
  timestamp_received TIMESTAMPTZ
);

-- Indexes for transfer queries
CREATE INDEX IF NOT EXISTS idx_transfers_meal_id ON transfers(meal_id);
CREATE INDEX IF NOT EXISTS idx_transfers_status ON transfers(status);
CREATE INDEX IF NOT EXISTS idx_transfers_to_location ON transfers(to_location);
CREATE INDEX IF NOT EXISTS idx_transfers_timestamp ON transfers(timestamp_sent DESC);

-- ============================================================================
-- REFILL REQUESTS TABLE
-- Tracks refill station requests
-- ============================================================================
CREATE TABLE IF NOT EXISTS refill_requests (
  request_id TEXT PRIMARY KEY,
  meal_id TEXT NOT NULL REFERENCES meals(meal_id) ON DELETE CASCADE,
  item_id TEXT NOT NULL,
  item_name TEXT NOT NULL,
  quantity INTEGER NOT NULL,
  refill_station TEXT NOT NULL,
  requested_by TEXT NOT NULL,
  status TEXT DEFAULT 'pending', -- pending, fulfilled, cancelled
  timestamp TIMESTAMPTZ DEFAULT NOW(),
  fulfilled_at TIMESTAMPTZ
);

-- Indexes for refill request queries
CREATE INDEX IF NOT EXISTS idx_refill_requests_meal_id ON refill_requests(meal_id);
CREATE INDEX IF NOT EXISTS idx_refill_requests_status ON refill_requests(status);

-- ============================================================================
-- DASHBOARD SETTINGS TABLE
-- Stores per-event dashboard configuration
-- ============================================================================
CREATE TABLE IF NOT EXISTS dashboard_settings (
  setting_id TEXT PRIMARY KEY,
  event_id TEXT NOT NULL REFERENCES events(event_id) ON DELETE CASCADE,
  setting_type TEXT NOT NULL,
  setting_value TEXT NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  updated_by TEXT NOT NULL
);

-- Index for querying settings by event
CREATE INDEX IF NOT EXISTS idx_dashboard_settings_event_id ON dashboard_settings(event_id);

-- ============================================================================
-- USERS TABLE (optional, for future auth)
-- ============================================================================
CREATE TABLE IF NOT EXISTS users (
  user_id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  email TEXT UNIQUE,
  role TEXT DEFAULT 'volunteer',
  team_assignment TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- ============================================================================
-- FUNCTIONS AND TRIGGERS
-- ============================================================================

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers to relevant tables
CREATE TRIGGER update_events_updated_at
  BEFORE UPDATE ON events
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_meals_updated_at
  BEFORE UPDATE ON meals
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_menu_items_updated_at
  BEFORE UPDATE ON menu_items
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_location_inventory_updated_at
  BEFORE UPDATE ON location_inventory
  FOR EACH ROW
  EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- Enable RLS on all tables for multi-tenant security
-- ============================================================================

-- Note: For initial development, RLS is disabled.
-- Enable RLS when implementing proper authentication:

-- ALTER TABLE events ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE meals ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE menu_items ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE location_inventory ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE transfers ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE refill_requests ENABLE ROW LEVEL SECURITY;
-- ALTER TABLE dashboard_settings ENABLE ROW LEVEL SECURITY;

-- ============================================================================
-- VIEWS FOR COMMON QUERIES
-- ============================================================================

-- Dashboard summary view - combines menu and inventory data
CREATE OR REPLACE VIEW dashboard_summary_view AS
SELECT
  m.meal_id,
  json_agg(
    json_build_object(
      'item_id', mi.item_id,
      'name', mi.name,
      'category', mi.category,
      'planned_trays', mi.planned_trays,
      'ready_trays', mi.ready_trays,
      'kitchen_storage_moved', mi.kitchen_storage_moved,
      'cooking_status', mi.cooking_status,
      'is_vegan', mi.is_vegan,
      'contains_gluten', mi.contains_gluten,
      'allergens', mi.allergens,
      'updated_at', mi.updated_at
    ) ORDER BY mi.category, mi.name
  ) AS menu,
  json_agg(
    json_build_object(
      'inventory_id', li.inventory_id,
      'item_id', li.item_id,
      'item_name', li.item_name,
      'category', li.category,
      'planned_trays', li.planned_trays,
      'ready_trays', li.ready_trays,
      'kitchen', li.kitchen,
      'staging', li.staging,
      'refill_1', li.refill_1,
      'refill_2', li.refill_2,
      'refill_3', li.refill_3,
      'served', li.served,
      'left_over', li.left_over,
      'updated_at', li.updated_at
    ) ORDER BY li.category, li.item_name
  ) AS inventory,
  (SELECT COUNT(*) FROM transfers t WHERE t.meal_id = m.meal_id AND t.status = 'sent') AS pending_transfers_count,
  (SELECT COUNT(*) FROM refill_requests rr WHERE rr.meal_id = m.meal_id AND rr.status = 'pending') AS pending_requests_count
FROM meals m
LEFT JOIN menu_items mi ON mi.meal_id = m.meal_id
LEFT JOIN location_inventory li ON li.meal_id = m.meal_id
GROUP BY m.meal_id;

-- ============================================================================
-- SAMPLE DATA (optional)
-- ============================================================================
-- Uncomment to insert sample data matching the Google Apps Script populateSampleData()
-- This can be used for testing

-- INSERT INTO events VALUES ...
