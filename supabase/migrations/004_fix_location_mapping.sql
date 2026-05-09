-- ============================================================================
-- Fix: Add location name mapping to update_inventory_location
-- The UI passes display names like 'Kitchen', 'Staging' but the database
-- columns are lowercase: 'kitchen', 'staging'
-- ============================================================================

CREATE OR REPLACE FUNCTION update_inventory_location(
  p_meal_id TEXT,
  p_item_id TEXT,
  p_location TEXT,
  p_quantity INTEGER,
  p_action TEXT -- 'add' or 'subtract'
)
RETURNS BOOLEAN AS $$
DECLARE
  current_value INTEGER;
  new_value INTEGER;
  column_name TEXT;
BEGIN
  -- Map UI location names to database column names
  column_name := CASE p_location
    WHEN 'Kitchen' THEN 'kitchen'
    WHEN 'Staging' THEN 'staging'
    WHEN 'Refill 1' THEN 'refill_1'
    WHEN 'Refill 2' THEN 'refill_2'
    WHEN 'Refill 3' THEN 'refill_3'
    WHEN 'Served' THEN 'served'
    WHEN 'Left Over' THEN 'left_over'
    ELSE p_location  -- fallback: use as-is if already a column name
  END;

  -- Get current value using dynamic SQL
  EXECUTE format(
    'SELECT %I FROM location_inventory WHERE meal_id = $1 AND item_id = $2',
    column_name
  ) INTO current_value USING p_meal_id, p_item_id;

  -- Handle case where row doesn't exist
  IF current_value IS NULL THEN
    RETURN FALSE;
  END IF;

  -- Calculate new value
  IF p_action = 'add' THEN
    new_value := current_value + p_quantity;
  ELSIF p_action = 'subtract' THEN
    new_value := GREATEST(0, current_value - p_quantity);
  ELSE
    RAISE EXCEPTION 'Invalid action: %', p_action;
  END IF;

  -- Update the value
  EXECUTE format(
    'UPDATE location_inventory SET %I = $1, updated_at = NOW() WHERE meal_id = $2 AND item_id = $3',
    column_name
  ) USING new_value, p_meal_id, p_item_id;

  RETURN TRUE;
EXCEPTION
  WHEN OTHERS THEN
    RAISE WARNING 'Error in update_inventory_location: %', SQLERRM;
    RETURN FALSE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION update_inventory_location TO anon;
GRANT EXECUTE ON FUNCTION update_inventory_location TO authenticated;
