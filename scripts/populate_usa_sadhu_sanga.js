/**
 * RUN THIS IN YOUR GOOGLE APPS SCRIPT PROJECT
 * 1. Go to https://script.google.com
 * 2. Open your project for the Prasadam Distribution
 * 3. Add this as a new function
 * 4. Run populateUSASadhuSanga2026()
 */

const SPREADSHEET_ID = '1iiq9EeSDQ9eQzwkK4rQPbNXJGD_cnp-z0bnlWzDcW6g';

function populateUSASadhuSanga2026() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
  const eventId = 'USASadhuSanga2026';
  const timestamp = new Date().toISOString();

  // Get or create sheets
  let eventsSheet = ss.getSheetByName('EVENTS');
  let mealsSheet = ss.getSheetByName('MEALS');
  let menuSheet = ss.getSheetByName('MENU_ITEMS');
  let inventorySheet = ss.getSheetByName('LOCATION_INVENTORY');

  if (!eventsSheet || !mealsSheet || !menuSheet || !inventorySheet) {
    return 'Error: Some sheets are missing. Run initializeSheet() first.';
  }

  // Clear existing data for USASadhuSanga2026 (if any)
  clearEventFromAllSheets(eventId);

  // 1. Add Event
  eventsSheet.appendRow([
    eventId,
    'Sadhu Sanga USA 2026',
    '2026-05-15',
    '2026-05-18',
    'New Vrindavan',
    1500,
    'active',
    timestamp
  ]);

  // 2. Add Meals
  const meals = [
    ['usa_meal_001', eventId, 'Breakfast', 1, 'BF1', '07:00', 1500, 'planned', timestamp, timestamp],
    ['usa_meal_002', eventId, 'Lunch', 1, 'L1', '12:00', 1500, 'planned', timestamp, timestamp],
    ['usa_meal_003', eventId, 'Dinner', 1, 'D1', '18:00', 1500, 'planned', timestamp, timestamp],
  ];
  meals.forEach(meal => mealsSheet.appendRow(meal));

  // 3. Add Menu Items
  const menuItems = [
    // Breakfast items
    ['usa_item_001', 'usa_meal_001', 'Chapati', 'normal', 100, 80, 'Ready', false, false, '', timestamp],
    ['usa_item_002', 'usa_meal_001', 'Dal Tadka', 'normal', 50, 40, 'Ready', false, false, '', timestamp],
    ['usa_item_003', 'usa_meal_001', 'Rice', 'normal', 30, 25, 'Ready', false, false, '', timestamp],
    ['usa_item_004', 'usa_meal_001', 'Halwa', 'normal', 20, 15, 'Ready', false, false, '', timestamp],
    // Lunch items
    ['usa_item_005', 'usa_meal_002', 'Chapati', 'normal', 150, 120, 'Ready', false, false, '', timestamp],
    ['usa_item_006', 'usa_meal_002', 'Dal Makhani', 'normal', 60, 50, 'Ready', false, false, '', timestamp],
    ['usa_item_007', 'usa_meal_002', 'Rice', 'normal', 40, 35, 'Ready', false, false, '', timestamp],
    ['usa_item_008', 'usa_meal_002', 'Sabzi', 'normal', 40, 30, 'Ready', false, false, '', timestamp],
    ['usa_item_009', 'usa_meal_002', 'Salad', 'cold', 50, 40, 'Ready', false, false, '', timestamp],
    // Dinner items
    ['usa_item_010', 'usa_meal_003', 'Chapati', 'normal', 120, 100, 'Ready', false, false, '', timestamp],
    ['usa_item_011', 'usa_meal_003', 'Dal', 'normal', 50, 40, 'Ready', false, false, '', timestamp],
    ['usa_item_012', 'usa_meal_003', 'Fried Rice', 'normal', 35, 30, 'Ready', false, false, '', timestamp],
    ['usa_item_013', 'usa_meal_003', 'Sweet Rice', 'normal', 25, 20, 'Ready', false, false, '', timestamp],
  ];
  menuItems.forEach(item => menuSheet.appendRow(item));

  // 4. Add Location Inventory (simulating some trays have been moved)
  const inventoryItems = [
    // Breakfast inventory
    ['usa_inv_001', 'usa_meal_001', 'usa_item_001', 'Chapati', 'normal', 100, 80, 10, 30, 20, 15, 10, 10, 5, timestamp],
    ['usa_inv_002', 'usa_meal_001', 'usa_item_002', 'Dal Tadka', 'normal', 50, 40, 5, 15, 10, 10, 5, 5, 5, timestamp],
    ['usa_inv_003', 'usa_meal_001', 'usa_item_003', 'Rice', 'normal', 30, 25, 3, 8, 5, 5, 4, 4, 2, timestamp],
    ['usa_inv_004', 'usa_meal_001', 'usa_item_004', 'Halwa', 'normal', 20, 15, 2, 5, 4, 3, 3, 3, 1, timestamp],
    // Lunch inventory
    ['usa_inv_005', 'usa_meal_002', 'usa_item_005', 'Chapati', 'normal', 150, 120, 15, 40, 25, 20, 15, 15, 10, timestamp],
    ['usa_inv_006', 'usa_meal_002', 'usa_item_006', 'Dal Makhani', 'normal', 60, 50, 8, 20, 12, 10, 8, 8, 8, timestamp],
    ['usa_inv_007', 'usa_meal_002', 'usa_item_007', 'Rice', 'normal', 40, 35, 5, 12, 8, 8, 6, 6, 4, timestamp],
    ['usa_inv_008', 'usa_meal_002', 'usa_item_008', 'Sabzi', 'normal', 40, 30, 5, 10, 8, 6, 5, 5, 3, timestamp],
    ['usa_inv_009', 'usa_meal_002', 'usa_item_009', 'Salad', 'cold', 50, 40, 10, 15, 8, 7, 5, 5, 5, timestamp],
    // Dinner inventory
    ['usa_inv_010', 'usa_meal_003', 'usa_item_010', 'Chapati', 'normal', 120, 100, 12, 35, 22, 18, 15, 12, 8, timestamp],
    ['usa_inv_011', 'usa_meal_003', 'usa_item_011', 'Dal', 'normal', 50, 40, 6, 18, 12, 10, 8, 6, 6, timestamp],
    ['usa_inv_012', 'usa_meal_003', 'usa_item_012', 'Fried Rice', 'normal', 35, 30, 4, 12, 8, 7, 6, 5, 4, timestamp],
    ['usa_inv_013', 'usa_meal_003', 'usa_item_013', 'Sweet Rice', 'normal', 25, 20, 3, 8, 5, 5, 4, 3, 3, timestamp],
  ];
  inventoryItems.forEach(row => inventorySheet.appendRow(row));

  return 'Successfully populated USASadhuSanga2026 data!\n\n' +
         'Event: USASadhuSanga2026\n' +
         'Meals: 3 (Breakfast, Lunch, Dinner)\n' +
         'Menu Items: 13\n' +
         'Inventory Records: 13\n\n' +
         'You can now use this event in the app.';
}

// Helper function to clear existing data for an event
function clearEventFromAllSheets(eventId) {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Clear from EVENTS sheet
  const eventsSheet = ss.getSheetByName('EVENTS');
  if (eventsSheet && eventsSheet.getLastRow() > 1) {
    const eventsData = eventsSheet.getRange(2, 1, eventsSheet.getLastRow() - 1, 8).getValues();
    for (let i = eventsData.length - 1; i >= 0; i--) {
      if (eventsData[i][0] === eventId) {
        eventsSheet.deleteRow(i + 2);
      }
    }
  }

  // Clear from MEALS sheet
  const mealsSheet = ss.getSheetByName('MEALS');
  if (mealsSheet && mealsSheet.getLastRow() > 1) {
    const mealsData = mealsSheet.getRange(2, 1, mealsSheet.getLastRow() - 1, 10).getValues();
    for (let i = mealsData.length - 1; i >= 0; i--) {
      if (mealsData[i][1] === eventId) {
        mealsSheet.deleteRow(i + 2);
      }
    }
  }

  // Clear from MENU_ITEMS sheet (by finding meals that belong to this event)
  const menuSheet = ss.getSheetByName('MENU_ITEMS');
  if (menuSheet && menuSheet.getLastRow() > 1) {
    const menuData = menuSheet.getRange(2, 1, menuSheet.getLastRow() - 1, 11).getValues();
    for (let i = menuData.length - 1; i >= 0; i--) {
      const mealId = menuData[i][1];
      if (mealId.startsWith('usa_meal_')) {
        menuSheet.deleteRow(i + 2);
      }
    }
  }

  // Clear from LOCATION_INVENTORY sheet (by finding meals that belong to this event)
  const inventorySheet = ss.getSheetByName('LOCATION_INVENTORY');
  if (inventorySheet && inventorySheet.getLastRow() > 1) {
    const invData = inventorySheet.getRange(2, 1, inventorySheet.getLastRow() - 1, 15).getValues();
    for (let i = invData.length - 1; i >= 0; i--) {
      const mealId = invData[i][1];
      if (mealId.startsWith('usa_meal_')) {
        inventorySheet.deleteRow(i + 2);
      }
    }
  }
}
