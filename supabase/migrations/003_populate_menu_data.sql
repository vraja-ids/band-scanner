-- ============================================================================
-- POPULATE MENU DATA FROM COPY_PLAN_2026
-- This SQL populates the Supabase database with the actual meal plan
-- ============================================================================

-- First, create the event
INSERT INTO events (event_id, event_name, start_date, end_date, location, expected_attendance, status)
VALUES (
  'USASadhuSanga2026',
  'USA Sadhu Sanga Retreat 2026',
  '2026-05-22',
  '2026-05-25',
  'New Vrindavan',
  1500,
  'active')
ON CONFLICT (event_id) DO NOTHING;

-- ============================================================================
-- FRIDAY DINNER
-- ============================================================================
INSERT INTO meals (meal_id, event_id, meal_type, day_number, meal_instance, serving_start_time, planned_servings)
VALUES ('friDinner', 'USASadhuSanga2026', 'Dinner', 1, 'D1', '18:00', 1500)
ON CONFLICT (meal_id) DO NOTHING;

INSERT INTO menu_items (item_id, meal_id, name, category, planned_trays, ready_trays, cooking_status, is_vegan, contains_gluten, allergens)
VALUES
  ('item_fri_001', 'friDinner', 'Cauliflower Tofu Manchurian', 'normal', 140, 0, 'Not Started', false, false, ''),
  ('item_fri_002', 'friDinner', 'Stirfry Choy Sum', 'normal', 140, 0, 'Not Started', true, false, ''),
  ('item_fri_003', 'friDinner', 'Fried Rice', 'normal', 220, 0, 'Not Started', true, false, ''),
  ('item_fri_004', 'friDinner', 'Chinese Soup', 'normal', NULL, 0, 'Not Started', true, false, ''),
  ('item_fri_005', 'friDinner', 'Chinese Pakora', 'normal', NULL, 0, 'Not Started', true, false, ''),
  ('item_fri_006', 'friDinner', 'Pakora sauce', 'cold', 55, 0, 'Not Started', true, false, ''),
  ('item_fri_007', 'friDinner', 'Salad', 'cold', 45, 0, 'Not Started', true, false, ''),
  ('item_fri_008', 'friDinner', 'Almond dressing', 'cold', NULL, 0, 'Not Started', true, false, 'Nuts'),
  ('item_fri_009', 'friDinner', 'Mango Coconut Cheesecake', 'cold', 100, 0, 'Not Started', false, true, 'Dairy,Nuts'),
  ('item_fri_010', 'friDinner', 'Vegan cheesecake', 'cold', 10, 0, 'Not Started', true, false, ''),
  ('item_fri_011', 'friDinner', 'Lemon Mint drink', 'cold', NULL, 0, 'Not Started', true, false, '')
ON CONFLICT (item_id) DO NOTHING;

-- Location inventory for Friday dinner (all empty except planned)
INSERT INTO location_inventory (inventory_id, meal_id, item_id, item_name, category, planned_trays, ready_trays, kitchen, staging, refill_1, refill_2, refill_3, served, left_over)
VALUES
  ('inv_fri_001', 'friDinner', 'item_fri_001', 'Cauliflower Tofu Manchurian', 'normal', 140, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_fri_002', 'friDinner', 'item_fri_002', 'Stirfry Choy Sum', 'normal', 140, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_fri_003', 'friDinner', 'item_fri_003', 'Fried Rice', 'normal', 220, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_fri_004', 'friDinner', 'item_fri_004', 'Chinese Soup', 'normal', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_fri_005', 'friDinner', 'item_fri_005', 'Chinese Pakora', 'normal', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_fri_006', 'friDinner', 'item_fri_006', 'Pakora sauce', 'cold', 55, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_fri_007', 'friDinner', 'item_fri_007', 'Salad', 'cold', 45, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_fri_008', 'friDinner', 'item_fri_008', 'Almond dressing', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_fri_009', 'friDinner', 'item_fri_009', 'Mango Coconut Cheesecake', 'cold', 100, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_fri_010', 'friDinner', 'item_fri_010', 'Vegan cheesecake', 'cold', 10, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_fri_011', 'friDinner', 'item_fri_011', 'Lemon Mint drink', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (inventory_id) DO NOTHING;

-- ============================================================================
-- SATURDAY BREAKFAST
-- ============================================================================
INSERT INTO meals (meal_id, event_id, meal_type, day_number, meal_instance, serving_start_time, planned_servings)
VALUES ('satBreakfast', 'USASadhuSanga2026', 'Breakfast', 2, 'BF1', '07:00', 1500)
ON CONFLICT (meal_id) DO NOTHING;

INSERT INTO menu_items (item_id, meal_id, name, category, planned_trays, ready_trays, cooking_status, is_vegan, contains_gluten, allergens)
VALUES
  ('item_sat_bf_001', 'satBreakfast', 'Sooji Upma', 'normal', 180, 0, 'Not Started', true, false, ''),
  ('item_sat_bf_002', 'satBreakfast', 'Coconut Chutney', 'cold', NULL, 0, 'Not Started', true, false, ''),
  ('item_sat_bf_003', 'satBreakfast', 'Granola', 'normal', 12, 0, 'Not Started', true, false, 'Nuts'),
  ('item_sat_bf_004', 'satBreakfast', 'Milk/Almond milk', 'normal', NULL, 0, 'Not Started', true, false, 'Dairy,Nuts'),
  ('item_sat_bf_005', 'satBreakfast', 'Yogurt', 'cold', NULL, 0, 'Not Started', true, false, 'Dairy'),
  ('item_sat_bf_006', 'satBreakfast', 'Pancakes, Vegan Pancakes', 'normal', 100, 0, 'Not Started', false, true, 'Dairy,Eggs'),
  ('item_sat_bf_007', 'satBreakfast', 'Syrup', 'normal', NULL, 0, 'Not Started', true, false, '')
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO location_inventory (inventory_id, meal_id, item_id, item_name, category, planned_trays, ready_trays, kitchen, staging, refill_1, refill_2, refill_3, served, left_over)
VALUES
  ('inv_sat_bf_001', 'satBreakfast', 'item_sat_bf_001', 'Sooji Upma', 'normal', 180, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_bf_002', 'satBreakfast', 'item_sat_bf_002', 'Coconut Chutney', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_bf_003', 'satBreakfast', 'item_sat_bf_003', 'Granola', 'normal', 12, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_bf_004', 'satBreakfast', 'item_sat_bf_004', 'Milk/Almond milk', 'normal', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_bf_005', 'satBreakfast', 'item_sat_bf_005', 'Yogurt', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_bf_006', 'satBreakfast', 'item_sat_bf_006', 'Pancakes, Vegan Pancakes', 'normal', 100, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_bf_007', 'satBreakfast', 'item_sat_bf_007', 'Syrup', 'normal', NULL, 0, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (inventory_id) DO NOTHING;

-- ============================================================================
-- SATURDAY LUNCH
-- ============================================================================
INSERT INTO meals (meal_id, event_id, meal_type, day_number, meal_instance, serving_start_time, planned_servings)
VALUES ('satLunch', 'USASadhuSanga2026', 'Lunch', 2, 'L1', '12:00', 1500)
ON CONFLICT (meal_id) DO NOTHING;

INSERT INTO menu_items (item_id, meal_id, name, category, planned_trays, ready_trays, cooking_status, is_vegan, contains_gluten, allergens)
VALUES
  ('item_sat_lu_001', 'satLunch', 'Jeera Rice', 'normal', 220, 0, 'Not Started', true, false, ''),
  ('item_sat_lu_002', 'satLunch', 'Dal Makhani', 'normal', NULL, 0, 'Not Started', true, false, 'Dairy'),
  ('item_sat_lu_003', 'satLunch', 'Mutter Panir', 'normal', 140, 0, 'Not Started', false, false, 'Dairy'),
  ('item_sat_lu_004', 'satLunch', 'Spinach Cauliflower', 'normal', 140, 0, 'Not Started', true, false, ''),
  ('item_sat_lu_005', 'satLunch', 'Chapati', 'normal', NULL, 0, 'Not Started', true, false, 'Gluten'),
  ('item_sat_lu_006', 'satLunch', 'Spinach Roll', 'normal', 45, 0, 'Not Started', true, false, 'Gluten'),
  ('item_sat_lu_007', 'satLunch', 'Rasa Malai', 'cold', NULL, 0, 'Not Started', false, false, 'Dairy,Nuts'),
  ('item_sat_lu_008', 'satLunch', 'Badaam Pista Burfi', 'cold', NULL, 0, 'Not Started', false, false, 'Dairy,Nuts'),
  ('item_sat_lu_009', 'satLunch', 'Salad Sat Lunch', 'cold', 45, 0, 'Not Started', true, false, ''),
  ('item_sat_lu_010', 'satLunch', 'Chilli Pickle', 'cold', 24, 0, 'Not Started', true, false, ''),
  ('item_sat_lu_011', 'satLunch', 'Italian dressing', 'cold', NULL, 0, 'Not Started', true, false, 'Dairy'),
  ('item_sat_lu_012', 'satLunch', 'Vegan Baadam Katli', 'cold', 10, 0, 'Not Started', true, false, 'Nuts')
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO location_inventory (inventory_id, meal_id, item_id, item_name, category, planned_trays, ready_trays, kitchen, staging, refill_1, refill_2, refill_3, served, left_over)
VALUES
  ('inv_sat_lu_001', 'satLunch', 'item_sat_lu_001', 'Jeera Rice', 'normal', 220, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_lu_002', 'satLunch', 'item_sat_lu_002', 'Dal Makhani', 'normal', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_lu_003', 'satLunch', 'item_sat_lu_003', 'Mutter Panir', 'normal', 140, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_lu_004', 'satLunch', 'item_sat_lu_004', 'Spinach Cauliflower', 'normal', 140, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_lu_005', 'satLunch', 'item_sat_lu_005', 'Chapati', 'normal', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_lu_006', 'satLunch', 'item_sat_lu_006', 'Spinach Roll', 'normal', 45, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_lu_007', 'satLunch', 'item_sat_lu_007', 'Rasa Malai', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_lu_008', 'satLunch', 'item_sat_lu_008', 'Badaam Pista Burfi', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_lu_009', 'satLunch', 'item_sat_lu_009', 'Salad Sat Lunch', 'cold', 45, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_lu_010', 'satLunch', 'item_sat_lu_010', 'Chilli Pickle', 'cold', 24, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_lu_011', 'satLunch', 'item_sat_lu_011', 'Italian dressing', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_lu_012', 'satLunch', 'item_sat_lu_012', 'Vegan Baadam Katli', 'cold', 10, 0, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (inventory_id) DO NOTHING;

-- ============================================================================
-- SATURDAY DINNER
-- ============================================================================
INSERT INTO meals (meal_id, event_id, meal_type, day_number, meal_instance, serving_start_time, planned_servings)
VALUES ('satDinner', 'USASadhuSanga2026', 'Dinner', 2, 'D2', '18:00', 1500)
ON CONFLICT (meal_id) DO NOTHING;

INSERT INTO menu_items (item_id, meal_id, name, category, planned_trays, ready_trays, cooking_status, is_vegan, contains_gluten, allergens)
VALUES
  ('item_sat_di_001', 'satDinner', 'Pasta with Vegetables', 'normal', 70, 0, 'Not Started', true, false, 'Gluten'),
  ('item_sat_di_002', 'satDinner', 'Bread Roll', 'normal', 45, 0, 'Not Started', true, false, 'Gluten'),
  ('item_sat_di_003', 'satDinner', 'Butter for Roll', 'cold', 24, 0, 'Not Started', true, false, 'Dairy'),
  ('item_sat_di_004', 'satDinner', 'Asparagus Soup', 'normal', NULL, 0, 'Not Started', true, false, ''),
  ('item_sat_di_005', 'satDinner', 'Cauliflower Pakora', 'normal', 55, 0, 'Not Started', true, false, 'Gluten'),
  ('item_sat_di_006', 'satDinner', 'Salad', 'cold', 45, 0, 'Not Started', true, false, ''),
  ('item_sat_di_007', 'satDinner', 'Bell Pepper Sour Cream dressing', 'cold', NULL, 0, 'Not Started', false, false, 'Dairy'),
  ('item_sat_di_008', 'satDinner', 'Tiramisu', 'cold', 100, 0, 'Not Started', false, false, 'Dairy'),
  ('item_sat_di_009', 'satDinner', 'Vegan Tiramisu', 'cold', 10, 0, 'Not Started', true, false, ''),
  ('item_sat_di_010', 'satDinner', 'Pineapple Peach Nectar', 'cold', NULL, 0, 'Not Started', true, false, ''),
  ('item_sat_di_011', 'satDinner', 'Steamed Vegetables', 'normal', 90, 0, 'Not Started', true, false, ''),
  ('item_sat_di_012', 'satDinner', 'Tahini Sauce for Veggies', 'cold', NULL, 0, 'Not Started', true, false, 'Nuts,Sesame')
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO location_inventory (inventory_id, meal_id, item_id, item_name, category, planned_trays, ready_trays, kitchen, staging, refill_1, refill_2, refill_3, served, left_over)
VALUES
  ('inv_sat_di_001', 'satDinner', 'item_sat_di_001', 'Pasta with Vegetables', 'normal', 70, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_di_002', 'satDinner', 'item_sat_di_002', 'Bread Roll', 'normal', 45, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_di_003', 'satDinner', 'item_sat_di_003', 'Butter for Roll', 'cold', 24, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_di_004', 'satDinner', 'item_sat_di_004', 'Asparagus Soup', 'normal', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_di_005', 'satDinner', 'item_sat_di_005', 'Cauliflower Pakora', 'normal', 55, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_di_006', 'satDinner', 'item_sat_di_006', 'Salad', 'cold', 45, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_di_007', 'satDinner', 'item_sat_di_007', 'Bell Pepper Sour Cream dressing', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_di_008', 'satDinner', 'item_sat_di_008', 'Tiramisu', 'cold', 100, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_di_009', 'satDinner', 'item_sat_di_009', 'Vegan Tiramisu', 'cold', 10, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_di_010', 'satDinner', 'item_sat_di_010', 'Pineapple Peach Nectar', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_di_011', 'satDinner', 'item_sat_di_011', 'Steamed Vegetables', 'normal', 90, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sat_di_012', 'satDinner', 'item_sat_di_012', 'Tahini Sauce for Veggies', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (inventory_id) DO NOTHING;

-- ============================================================================
-- SUNDAY BREAKFAST
-- ============================================================================
INSERT INTO meals (meal_id, event_id, meal_type, day_number, meal_instance, serving_start_time, planned_servings)
VALUES ('sunBreakfast', 'USASadhuSanga2026', 'Breakfast', 3, 'BF2', '07:00', 1500)
ON CONFLICT (meal_id) DO NOTHING;

INSERT INTO menu_items (item_id, meal_id, name, category, planned_trays, ready_trays, cooking_status, is_vegan, contains_gluten, allergens)
VALUES
  ('item_sun_bf_001', 'sunBreakfast', 'Semiya Upma', 'normal', 180, 0, 'Not Started', true, false, 'Gluten'),
  ('item_sun_bf_002', 'sunBreakfast', 'Tomato jalapeno chutney', 'cold', NULL, 0, 'Not Started', true, false, ''),
  ('item_sun_bf_003', 'sunBreakfast', 'Granola Sun', 'normal', 12, 0, 'Not Started', true, false, 'Nuts'),
  ('item_sun_bf_004', 'sunBreakfast', 'Milk/ Almond milk', 'normal', NULL, 0, 'Not Started', true, false, 'Dairy,Nuts'),
  ('item_sun_bf_005', 'sunBreakfast', 'Yogurt', 'cold', NULL, 0, 'Not Started', true, false, 'Dairy'),
  ('item_sun_bf_006', 'sunBreakfast', 'Cream Cheese Danish & Vegan', 'cold', 110, 0, 'Not Started', false, true, 'Dairy,Eggs,Gluten,Nuts')
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO location_inventory (inventory_id, meal_id, item_id, item_name, category, planned_trays, ready_trays, kitchen, staging, refill_1, refill_2, refill_3, served, left_over)
VALUES
  ('inv_sun_bf_001', 'sunBreakfast', 'item_sun_bf_001', 'Semiya Upma', 'normal', 180, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_bf_002', 'sunBreakfast', 'item_sun_bf_002', 'Tomato jalapeno chutney', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_bf_003', 'sunBreakfast', 'item_sun_bf_003', 'Granola Sun', 'normal', 12, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_bf_004', 'sunBreakfast', 'item_sun_bf_004', 'Milk/ Almond milk', 'normal', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_bf_005', 'sunBreakfast', 'item_sun_bf_005', 'Yogurt', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_bf_006', 'sunBreakfast', 'item_sun_bf_006', 'Cream Cheese Danish & Vegan', 'cold', 110, 0, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (inventory_id) DO NOTHING;

-- ============================================================================
-- SUNDAY LUNCH
-- ============================================================================
INSERT INTO meals (meal_id, event_id, meal_type, day_number, meal_instance, serving_start_time, planned_servings)
VALUES ('sunLunch', 'USASadhuSanga2026', 'Lunch', 3, 'L2', '12:00', 1500)
ON CONFLICT (meal_id) DO NOTHING;

INSERT INTO menu_items (item_id, meal_id, name, category, planned_trays, ready_trays, cooking_status, is_vegan, contains_gluten, allergens)
VALUES
  ('item_sun_lu_001', 'sunLunch', 'Saffron Cashew Rice', 'normal', 220, 0, 'Not Started', true, false, 'Nuts'),
  ('item_sun_lu_002', 'sunLunch', 'Mixed Dal', 'normal', NULL, 0, 'Not Started', true, false, 'Dairy'),
  ('item_sun_lu_003', 'sunLunch', 'Kadai Panir', 'normal', 110, 0, 'Not Started', false, false, 'Dairy'),
  ('item_sun_lu_004', 'sunLunch', 'Mixed Vegetable', 'normal', 110, 0, 'Not Started', true, false, ''),
  ('item_sun_lu_005', 'sunLunch', 'Chapati', 'normal', NULL, 0, 'Not Started', true, false, 'Gluten'),
  ('item_sun_lu_006', 'sunLunch', 'Dhokla', 'normal', 90, 0, 'Not Started', true, false, 'Gluten'),
  ('item_sun_lu_007', 'sunLunch', 'Green Chutney', 'cold', NULL, 0, 'Not Started', true, false, ''),
  ('item_sun_lu_008', 'sunLunch', 'Gulab Jamun', 'cold', NULL, 0, 'Not Started', false, false, 'Dairy'),
  ('item_sun_lu_009', 'sunLunch', 'Dilkush', 'cold', NULL, 0, 'Not Started', false, false, 'Dairy,Nuts'),
  ('item_sun_lu_010', 'sunLunch', 'Salad Sun lunch', 'cold', 45, 0, 'Not Started', true, false, ''),
  ('item_sun_lu_011', 'sunLunch', 'Chilli Pickle', 'cold', NULL, 0, 'Not Started', true, false, ''),
  ('item_sun_lu_012', 'sunLunch', 'Italian dressing', 'cold', NULL, 0, 'Not Started', true, false, 'Dairy'),
  ('item_sun_lu_013', 'sunLunch', 'Vegan Coconut Burfi', 'cold', 10, 0, 'Not Started', true, false, 'Nuts')
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO location_inventory (inventory_id, meal_id, item_id, item_name, category, planned_trays, ready_trays, kitchen, staging, refill_1, refill_2, refill_3, served, left_over)
VALUES
  ('inv_sun_lu_001', 'sunLunch', 'item_sun_lu_001', 'Saffron Cashew Rice', 'normal', 220, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_lu_002', 'sunLunch', 'item_sun_lu_002', 'Mixed Dal', 'normal', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_lu_003', 'sunLunch', 'item_sun_lu_003', 'Kadai Panir', 'normal', 110, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_lu_004', 'sunLunch', 'item_sun_lu_004', 'Mixed Vegetable', 'normal', 110, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_lu_005', 'sunLunch', 'item_sun_lu_005', 'Chapati', 'normal', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_lu_006', 'sunLunch', 'item_sun_lu_006', 'Dhokla', 'normal', 90, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_lu_007', 'sunLunch', 'item_sun_lu_007', 'Green Chutney', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_lu_008', 'sunLunch', 'item_sun_lu_008', 'Gulab Jamun', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_lu_009', 'sunLunch', 'item_sun_lu_009', 'Dilkush', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_lu_010', 'sunLunch', 'item_sun_lu_010', 'Salad Sun lunch', 'cold', 45, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_lu_011', 'sunLunch', 'item_sun_lu_011', 'Chilli Pickle', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_lu_012', 'sunLunch', 'item_sun_lu_012', 'Italian dressing', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_lu_013', 'sunLunch', 'item_sun_lu_013', 'Vegan Coconut Burfi', 'cold', 10, 0, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (inventory_id) DO NOTHING;

-- ============================================================================
-- SUNDAY DINNER
-- ============================================================================
INSERT INTO meals (meal_id, event_id, meal_type, day_number, meal_instance, serving_start_time, planned_servings)
VALUES ('sunDinner', 'USASadhuSanga2026', 'Dinner', 3, 'D3', '18:00', 1500)
ON CONFLICT (meal_id) DO NOTHING;

INSERT INTO menu_items (item_id, meal_id, name, category, planned_trays, ready_trays, cooking_status, is_vegan, contains_gluten, allergens)
VALUES
  ('item_sun_di_001', 'sunDinner', 'Shepard Pie', 'normal', 175, 0, 'Not Started', false, false, 'Dairy'),
  ('item_sun_di_002', 'sunDinner', 'Gravy', 'normal', NULL, 0, 'Not Started', false, false, 'Dairy'),
  ('item_sun_di_003', 'sunDinner', 'Butternut Squash Soup', 'normal', NULL, 0, 'Not Started', true, false, ''),
  ('item_sun_di_004', 'sunDinner', 'Sweet Potato Pakora', 'normal', 55, 0, 'Not Started', true, false, 'Gluten'),
  ('item_sun_di_005', 'sunDinner', 'Southern Syle Biscuits & Vegan biscuits', 'normal', 45, 0, 'Not Started', false, true, 'Dairy,Eggs,Gluten'),
  ('item_sun_di_006', 'sunDinner', 'Butter for Biscuits', 'cold', 24, 0, 'Not Started', true, false, 'Dairy'),
  ('item_sun_di_007', 'sunDinner', 'Salad', 'cold', 45, 0, 'Not Started', true, false, ''),
  ('item_sun_di_008', 'sunDinner', 'Tahini Dressing', 'cold', NULL, 0, 'Not Started', true, false, 'Nuts,Sesame'),
  ('item_sun_di_009', 'sunDinner', 'Fruit Cocktail Drink', 'cold', NULL, 0, 'Not Started', true, false, ''),
  ('item_sun_di_010', 'sunDinner', 'Flan with Berries', 'cold', 100, 0, 'Not Started', false, false, 'Dairy,Eggs'),
  ('item_sun_di_011', 'sunDinner', 'Vegan Flan with Berries', 'cold', 10, 0, 'Not Started', true, false, ''),
  ('item_sun_di_012', 'sunDinner', 'Stir Fry Green Beans', 'normal', 90, 0, 'Not Started', true, false, '')
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO location_inventory (inventory_id, meal_id, item_id, item_name, category, planned_trays, ready_trays, kitchen, staging, refill_1, refill_2, refill_3, served, left_over)
VALUES
  ('inv_sun_di_001', 'sunDinner', 'item_sun_di_001', 'Shepard Pie', 'normal', 175, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_di_002', 'sunDinner', 'item_sun_di_002', 'Gravy', 'normal', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_di_003', 'sunDinner', 'item_sun_di_003', 'Butternut Squash Soup', 'normal', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_di_004', 'sunDinner', 'item_sun_di_004', 'Sweet Potato Pakora', 'normal', 55, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_di_005', 'sunDinner', 'item_sun_di_005', 'Southern Syle Biscuits & Vegan biscuits', 'normal', 45, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_di_006', 'sunDinner', 'item_sun_di_006', 'Butter for Biscuits', 'cold', 24, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_di_007', 'sunDinner', 'item_sun_di_007', 'Salad', 'cold', 45, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_di_008', 'sunDinner', 'item_sun_di_008', 'Tahini Dressing', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_di_009', 'sunDinner', 'item_sun_di_009', 'Fruit Cocktail Drink', 'cold', NULL, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_di_010', 'sunDinner', 'item_sun_di_010', 'Flan with Berries', 'cold', 100, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_di_011', 'sunDinner', 'item_sun_di_011', 'Vegan Flan with Berries', 'cold', 10, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_sun_di_012', 'sunDinner', 'item_sun_di_012', 'Stir Fry Green Beans', 'normal', 90, 0, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (inventory_id) DO NOTHING;

-- ============================================================================
-- MONDAY BREAKFAST
-- ============================================================================
INSERT INTO meals (meal_id, event_id, meal_type, day_number, meal_instance, serving_start_time, planned_servings)
VALUES ('monBreakfast', 'USASadhuSanga2026', 'Breakfast', 4, 'BF3', '07:00', 1500)
ON CONFLICT (meal_id) DO NOTHING;

INSERT INTO menu_items (item_id, meal_id, name, category, planned_trays, ready_trays, cooking_status, is_vegan, contains_gluten, allergens)
VALUES
  ('item_mon_bf_001', 'monBreakfast', 'Khichidi', 'normal', 220, 0, 'Not Started', true, false, ''),
  ('item_mon_bf_002', 'monBreakfast', 'Apple Raita', 'cold', 55, 0, 'Not Started', true, false, 'Dairy'),
  ('item_mon_bf_003', 'monBreakfast', 'Blueberry Halwa', 'normal', 45, 0, 'Not Started', true, false, 'Dairy')
ON CONFLICT (item_id) DO NOTHING;

INSERT INTO location_inventory (inventory_id, meal_id, item_id, item_name, category, planned_trays, ready_trays, kitchen, staging, refill_1, refill_2, refill_3, served, left_over)
VALUES
  ('inv_mon_bf_001', 'monBreakfast', 'item_mon_bf_001', 'Khichidi', 'normal', 220, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_mon_bf_002', 'monBreakfast', 'item_mon_bf_002', 'Apple Raita', 'cold', 55, 0, 0, 0, 0, 0, 0, 0, 0),
  ('inv_mon_bf_003', 'monBreakfast', 'item_mon_bf_003', 'Blueberry Halwa', 'normal', 45, 0, 0, 0, 0, 0, 0, 0, 0)
ON CONFLICT (inventory_id) DO NOTHING;

-- ============================================================================
-- MONDAY LUNCH (no items in sheet, but creating meal for completeness)
-- ============================================================================
INSERT INTO meals (meal_id, event_id, meal_type, day_number, meal_instance, serving_start_time, planned_servings)
VALUES ('monLunch', 'USASadhuSanga2026', 'Lunch', 4, 'L3', '12:00', 1500)
ON CONFLICT (meal_id) DO NOTHING;
