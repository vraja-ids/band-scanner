-- ============================================================================
-- Atomic Inventory Update Function
-- This function atomically updates a location's quantity with add/subtract
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
  -- Validate location
  column_name := p_location;

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

-- ============================================================================
-- Function to get dashboard summary in a single query
-- ============================================================================

CREATE OR REPLACE FUNCTION get_dashboard_summary(p_meal_id TEXT)
RETURNS JSON AS $$
DECLARE
  result JSON;
BEGIN
  SELECT json_build_object(
    'menu', (
      SELECT json_agg(json_build_object(
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
      ) ORDER BY mi.category, mi.name)
      FROM menu_items mi
      WHERE mi.meal_id = p_meal_id
    ),
    'inventory', (
      SELECT json_agg(json_build_object(
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
      ) ORDER BY li.category, li.item_name)
      FROM location_inventory li
      WHERE li.meal_id = p_meal_id
    ),
    'pendingTransfersCount', (
      SELECT COUNT(*) FROM transfers t
      WHERE t.meal_id = p_meal_id AND t.status = 'sent'
    ),
    'pendingRequestsCount', (
      SELECT COUNT(*) FROM refill_requests rr
      WHERE rr.meal_id = p_meal_id AND rr.status = 'pending'
    )
  ) INTO result;

  RETURN result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Grant execute permission
GRANT EXECUTE ON FUNCTION get_dashboard_summary TO anon;
GRANT EXECUTE ON FUNCTION get_dashboard_summary TO authenticated;
