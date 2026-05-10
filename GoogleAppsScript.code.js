/**
 * PRASADAM DISTRIBUTION - Google Apps Script
 * Copy this entire file to your Google Apps Script project
 *
 * SETUP:
 * 1. Go to script.google.com
 * 2. Create new project
 * 3. Paste this code
 * 4. Deploy as web app
 * 5. Add your spreadsheet ID below
 */

const SPREADSHEET_ID = '1iiq9EeSDQ9eQzwkK4rQPbNXJGD_cnp-z0bnlWzDcW6g'; // PRASADAM DISTRIBUTION SPREADSHEET

function doGet(e) {
  const operation = e.parameter.operation;

  try {
    switch (operation) {
      case 'getEvents':
        return getEvents();

      case 'getMeals':
        const eventId = e.parameter.eventId;
        return getMeals(eventId);

      case 'getMenuItems':
        return getMenuItems(e.parameter.mealId);

      case 'getLocationInventory':
        return getLocationInventory(e.parameter.mealId);

      case 'getDashboardSummary':
        return getDashboardSummary(e.parameter.mealId);

      case 'getTransfers':
        return getTransfers(e.parameter.mealId);

      case 'getDashboardSettings':
        return getDashboardSettings(e.parameter.eventId);

      default:
        return createResponse('error', 'Unknown operation');
    }
  } catch (error) {
    return createResponse('error', error.toString());
  }
}

function doPost(e) {
  try {
    const data = JSON.parse(e.postData.contents);
    const operation = data.operation;

    switch (operation) {
      case 'addEvent':
        return addEvent(data);

      case 'addMeal':
        return addMeal(data);

      case 'addMenuItem':
        return addMenuItem(data);

      case 'updateMenuItem':
        return updateMenuItem(data);

      case 'updateTrayCount':
        return updateTrayCount(data);

      case 'updateCookingStatus':
        return updateCookingStatus(data);

      case 'recordTransfer':
      case 'createTransfer':
        return recordTransfer(data);

      case 'saveDashboardSettings':
        return saveDashboardSettings(data);

      case 'updateLocationInventory':
        return updateLocationInventory(data);

      case 'initializeSheet':
        return initializeSheet();

      case 'populateSampleData':
        return populateSampleData();

      case 'debugData':
        return debugData();

      default:
        return createResponse('error', 'Unknown operation');
    }
  } catch (error) {
    return createResponse('error', error.toString());
  }
}

// Helper function to create JSON response
function createResponse(status, data, message) {
  const response = {
    status: status,
    data: data || null,
    message: message || ''
  };
  return ContentService.createTextOutput(JSON.stringify(response))
    .setMimeType(ContentService.MimeType.JSON);
}

// Get all events
function getEvents() {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('EVENTS');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const events = [];

  for (let i = 1; i < data.length; i++) {
    const event = {};
    headers.forEach((header, index) => {
      event[header] = data[i][index];
    });
    events.push(event);
  }

  return createResponse('success', events);
}

// Get meals for an event
function getMeals(eventId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('MEALS');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const meals = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === eventId) {
      const meal = {};
      headers.forEach((header, index) => {
        meal[header] = data[i][index];
      });
      meals.push(meal);
    }
  }

  return createResponse('success', meals);
}

// Get menu items for a meal
function getMenuItems(mealId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('MENU_ITEMS');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const items = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === mealId) {
      const item = {};
      headers.forEach((header, index) => {
        item[header] = data[i][index];
      });
      items.push(item);
    }
  }

  return createResponse('success', items);
}

// Get location inventory for a meal
function getLocationInventory(mealId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('LOCATION_INVENTORY');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const inventory = [];

  for (let i = 1; i < data.length; i++) {
    if (String(data[i][1]) === String(mealId)) {
      const inv = {};
      headers.forEach((header, index) => {
        // Normalize header to lowercase for consistent access
        const normalizedHeader = (header || '').toLowerCase().trim();
        inv[normalizedHeader] = data[i][index];
      });
      inventory.push(inv);
    }
  }

  return createResponse('success', inventory);
}

// Get dashboard settings for an event
function getDashboardSettings(eventId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('DASHBOARD_SETTINGS');

  if (!sheet) {
    // Return default settings if sheet doesn't exist
    return createResponse('success', []);
  }

  const data = sheet.getDataRange().getValues();
  const settings = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === eventId) { // event_id match
      settings.push({
        setting_id: data[i][0],
        event_id: data[i][1],
        setting_type: data[i][2],
        setting_value: data[i][3],
        updated_at: data[i][4],
        updated_by: data[i][5]
      });
    }
  }

  return createResponse('success', settings);
}

// Save dashboard settings
function saveDashboardSettings(postData) {
  // postData is already parsed in doPost
  const settings = postData.settings;

  let sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('DASHBOARD_SETTINGS');

  if (!sheet) {
    sheet = SpreadsheetApp.openById(SPREADSHEET_ID).insertSheet('DASHBOARD_SETTINGS');
    // Add headers
    sheet.getRange('A1:F1').setValues([['setting_id', 'event_id', 'setting_type', 'setting_value', 'updated_at', 'updated_by']]);
  }

  // Clear existing settings for this event
  const existingData = sheet.getDataRange().getValues();
  for (let i = existingData.length - 1; i > 0; i--) {
    if (existingData[i][1] === settings[0].event_id) {
      sheet.deleteRow(i + 1);
    }
  }

  // Add new settings
  if (settings && settings.length > 0) {
    const newRows = settings.map(function(s) {
      return [s.setting_id, s.event_id, s.setting_type, s.setting_value, s.updated_at, s.updated_by];
    });

    if (newRows.length > 0) {
      sheet.getRange(sheet.getLastRow() + 1, 1, newRows.length, 6).setValues(newRows);
    }
  }

  return createResponse('success', null, 'Settings saved successfully');
}

// Add menu item
function addMenuItem(item) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('MENU_ITEMS');

  const newItem = [
    item.item_id,
    item.meal_id,
    item.name,
    item.category,
    item.planned_trays || 0,
    0, // ready_trays
    'Not Started', // cooking_status
    item.is_vegan || false,
    item.contains_gluten || false,
    item.allergens || '',
    new Date().toISOString()
  ];

  sheet.appendRow(newItem);
  return createResponse('success', null, 'Menu item added');
}

// Update menu item
function updateMenuItem(data) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('MENU_ITEMS');
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === data.itemId) {
      // Update the row with new values
      if (data.updates) {
        Object.keys(data.updates).forEach(key => {
          const colIndex = getColumnIndex(sheet, key);
          if (colIndex !== -1) {
            sheet.getRange(i + 1, colIndex + 1).setValue(data.updates[key]);
          }
        });
      }

      // Update timestamp
      const timestampIndex = getColumnIndex(sheet, 'updated_at');
      if (timestampIndex !== -1) {
        sheet.getRange(i + 1, timestampIndex + 1).setValue(new Date().toISOString());
      }

      return createResponse('success', null, 'Item updated');
    }
  }

  return createResponse('error', null, 'Item not found');
}

// Update tray count
function updateTrayCount(data) {
  return updateMenuItem({
    itemId: data.itemId,
    updates: {
      ready_trays: (getCurrentTrayCount(data.itemId) || 0) + data.adjustment
    }
  });
}

// Update cooking status
function updateCookingStatus(data) {
  return updateMenuItem({
    itemId: data.itemId,
    updates: {
      cooking_status: data.status
    }
  });
}

// Helper: Get current tray count
function getCurrentTrayCount(itemId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('MENU_ITEMS');
  const rows = sheet.getDataRange().getValues();

  for (let i = 1; i < rows.length; i++) {
    if (rows[i][0] === itemId) {
      return rows[i][5]; // ready_trays column
    }
  }
  return 0;
}

// Helper: Get column index by name
function getColumnIndex(sheet, columnName) {
  const headers = sheet.getRange('A1:' + sheet.getLastColumn()).getValues()[0];
  return headers.indexOf(columnName);
}

// Initialize sheet structure
function initializeSheet() {
  const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

  // Required sheets with their headers
  const sheetConfigs = {
    'EVENTS': ['event_id', 'event_name', 'start_date', 'end_date', 'location', 'expected_attendance', 'status', 'created_at'],
    'MEALS': ['meal_id', 'event_id', 'meal_type', 'day_number', 'meal_instance', 'serving_start_time', 'planned_servings', 'status', 'created_at', 'updated_at'],
    'MENU_ITEMS': ['item_id', 'meal_id', 'name', 'category', 'planned_trays', 'ready_trays', 'kitchen_storage_moved', 'cooking_status', 'is_vegan', 'contains_gluten', 'allergens', 'updated_at'],
    'TRANSFERS': ['transfer_id', 'meal_id', 'item_id', 'item_name', 'quantity', 'from_location', 'to_location', 'from_user', 'to_user', 'status', 'timestamp_sent', 'timestamp_received'],
    'REFILL_REQUESTS': ['request_id', 'meal_id', 'item_id', 'item_name', 'quantity', 'refill_station', 'requested_by', 'status', 'timestamp', 'fulfilled_at'],
    'LOCATION_INVENTORY': ['inventory_id', 'meal_id', 'item_id', 'item_name', 'category', 'planned_trays', 'ready_trays', 'kitchen', 'staging', 'refill_1', 'refill_2', 'refill_3', 'served', 'left_over', 'updated_at'],
    'USERS': ['user_id', 'name', 'email', 'role', 'team_assignment', 'created_at'],
    'DASHBOARD_SETTINGS': ['setting_id', 'event_id', 'setting_type', 'setting_value', 'updated_at', 'updated_by']
  };

  // Create or update sheets with headers
  Object.keys(sheetConfigs).forEach(sheetName => {
    let sheet = ss.getSheetByName(sheetName);
    if (!sheet) {
      sheet = ss.insertSheet(sheetName);
      // Add headers
      sheet.getRange(1, 1, 1, sheetConfigs[sheetName].length).setValues([sheetConfigs[sheetName]]);
    } else {
      // For existing sheets, add missing columns at the end
      const lastCol = sheet.getLastColumn();
      const currentHeaders = lastCol > 0 ? sheet.getRange(1, 1, 1, lastCol).getValues()[0] : [];
      const normalizedCurrent = currentHeaders.map(h => (h || '').toLowerCase().trim());

      // Find missing columns
      const missingColumns = [];
      sheetConfigs[sheetName].forEach(expectedHeader => {
        const normalizedExpected = expectedHeader.toLowerCase();
        if (!normalizedCurrent.includes(normalizedExpected)) {
          missingColumns.push(expectedHeader);
        }
      });

      // Add missing columns
      if (missingColumns.length > 0) {
        const newColStart = lastCol + 1;
        const newColEnd = newColStart + missingColumns.length - 1;
        if (newColEnd >= newColStart) {
          sheet.getRange(1, newColStart, 1, missingColumns.length).setValues([missingColumns]);
        }
      }
    }
  });

  return createResponse('success', null, 'Sheet initialized. Missing columns have been added to existing sheets.');
}

// ============ TRANSFER OPERATIONS ============

// Record/Create transfer - ONLY records the transfer history, does NOT update inventory
// Inventory updates must be done separately via updateLocationInventory() to avoid double movements
function recordTransfer(transfer) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const transfersSheet = ss.getSheetByName('TRANSFERS');

    // Validate sheet exists
    if (!transfersSheet) {
      return createResponse('error', null, 'TRANSFERS sheet not found. Please initialize the sheet first.');
    }

    // Validate transfer data
    if (!transfer.meal_id || !transfer.item_id || !transfer.from_location || !transfer.to_location) {
      return createResponse('error', null, 'Missing required transfer fields: meal_id, item_id, from_location, to_location');
    }

    // Generate transfer ID
    const transfer_id = 'tr_' + new Date().getTime() + '_' + Math.random().toString(36).substring(2, 8);
    const timestamp = new Date().toISOString();

    // Add to TRANSFERS sheet ONLY - no inventory updates here
    const transferRow = [
      transfer_id,
      transfer.meal_id,
      transfer.item_id,
      transfer.item_name,
      transfer.quantity,
      transfer.from_location,
      transfer.to_location,
      transfer.from_user,
      transfer.to_user || '',
      'sent', // status
      timestamp,
      '' // timestamp_received (empty until received)
    ];
    transfersSheet.appendRow(transferRow);

    return createResponse('success', { transfer_id: transfer_id }, 'Transfer recorded successfully');
  } catch (error) {
    return createResponse('error', null, 'Error in recordTransfer: ' + error.toString());
  }
}

// Helper: Get column index for a location in LOCATION_INVENTORY (case-insensitive)
function getLocationColumnIndex(headers, locationName) {
const locationMap = {
    'Kitchen': 'kitchen',
    'Staging': 'staging',
    'Refill 1': 'refill_1',
    'Refill 2': 'refill_2',
    'Refill 3': 'refill_3',
    'Buffet': 'served',      // ← ADD THIS LINE
    'Served': 'served',
    'Left Over': 'left_over'
  };


  const columnName = locationMap[locationName];
  if (columnName) {
    // Case-insensitive search
    for (let i = 0; i < headers.length; i++) {
      if ((headers[i] || '').toLowerCase() === columnName.toLowerCase()) {
        return i;
      }
    }
  }

  // Fallback: try case-insensitive exact match
  const fallbackName = locationName.toLowerCase().replace(' ', '_');
  for (let i = 0; i < headers.length; i++) {
    if ((headers[i] || '').toLowerCase() === fallbackName) {
      return i;
    }
  }

  return -1;
}

// Get transfers for a meal
function getTransfers(mealId) {
  const sheet = SpreadsheetApp.openById(SPREADSHEET_ID).getSheetByName('TRANSFERS');
  const data = sheet.getDataRange().getValues();
  const headers = data[0];
  const transfers = [];

  for (let i = 1; i < data.length; i++) {
    if (data[i][1] === mealId) { // meal_id match
      const transfer = {};
      headers.forEach((header, index) => {
        transfer[header] = data[i][index];
      });
      transfers.push(transfer);
    }
  }

  return createResponse('success', transfers);
}

// Get dashboard summary
function getDashboardSummary(mealId) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Get menu items directly
    const menuSheet = ss.getSheetByName('MENU_ITEMS');
    if (!menuSheet || menuSheet.getLastRow() <= 1) {
      return createResponse('success', {
        menu: [],
        inventory: [],
        pendingTransfersCount: 0,
        pendingRequestsCount: 0
      });
    }

    const menuData = menuSheet.getDataRange().getValues();
    const menuHeaders = menuData[0];
    const menuItems = [];

    for (let i = 1; i < menuData.length; i++) {
      if (String(menuData[i][menuHeaders.indexOf('meal_id')]) === String(mealId)) {
        const item = {};
        menuHeaders.forEach((header, index) => {
          item[header] = menuData[i][index];
        });
        menuItems.push(item);
      }
    }

    // Get location inventory directly
    const inventorySheet = ss.getSheetByName('LOCATION_INVENTORY');
    const inventory = [];

    if (inventorySheet && inventorySheet.getLastRow() > 1) {
      const inventoryData = inventorySheet.getDataRange().getValues();
      const inventoryHeaders = inventoryData[0];

      for (let i = 1; i < inventoryData.length; i++) {
        if (String(inventoryData[i][inventoryHeaders.indexOf('meal_id')]) === String(mealId)) {
          const inv = {};
          inventoryHeaders.forEach((header, index) => {
            // Normalize header to lowercase for consistent access
            const normalizedHeader = (header || '').toLowerCase().trim();
            inv[normalizedHeader] = inventoryData[i][index];
          });
          inventory.push(inv);
        }
      }
    }

    // Get transfers directly
    const transfersSheet = ss.getSheetByName('TRANSFERS');
    const transfers = [];

    if (transfersSheet && transfersSheet.getLastRow() > 1) {
      const transfersData = transfersSheet.getDataRange().getValues();
      const transfersHeaders = transfersData[0];

      for (let i = 1; i < transfersData.length; i++) {
        if (String(transfersData[i][transfersHeaders.indexOf('meal_id')]) === String(mealId)) {
          const transfer = {};
          transfersHeaders.forEach((header, index) => {
            transfer[header] = transfersData[i][index];
          });
          transfers.push(transfer);
        }
      }
    }

    const pendingTransfersCount = transfers.filter(t => t.status === 'sent').length;

    return createResponse('success', {
      menu: menuItems,
      inventory: inventory,
      pendingTransfersCount: pendingTransfersCount,
      pendingRequestsCount: 0
    });
  } catch (error) {
    return createResponse('error', null, 'Error in getDashboardSummary: ' + error.toString());
  }
}

// Update location inventory directly (for manual edits)
function updateLocationInventory(data) {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const inventorySheet = ss.getSheetByName('LOCATION_INVENTORY');

    if (!inventorySheet) {
      return createResponse('error', null, 'LOCATION_INVENTORY sheet not found');
    }

    const inventoryData = inventorySheet.getDataRange().getValues();
    const headers = inventoryData[0];
    const mealIdCol = headers.indexOf('meal_id');
    const itemIdCol = headers.indexOf('item_id');

    if (mealIdCol === -1 || itemIdCol === -1) {
      return createResponse('error', null, 'LOCATION_INVENTORY sheet missing required columns');
    }

    const mealId = String(data.mealId);
    const itemId = String(data.itemId);
    const location = data.location;
    const quantity = Number(data.quantity) || 0;
    const action = data.action; // 'add' or 'subtract'

    // Find the row for this item/meal
    let found = false;
    for (let i = 1; i < inventoryData.length; i++) {
      const rowMealId = String(inventoryData[i][mealIdCol] || '');
      const rowItemId = String(inventoryData[i][itemIdCol] || '');

      if (rowMealId === mealId && rowItemId === itemId) {
        // Get column index for the location
        const locationCol = getLocationColumnIndex(headers, location);
        const updatedAtCol = headers.indexOf('updated_at');

        if (locationCol === -1) {
          return createResponse('error', null, 'Location not found: ' + location);
        }

        // Get current value
        const currentQty = Number(inventoryData[i][locationCol]) || 0;
        let newQty = currentQty;

        // Apply operation
        if (action === 'add') {
          newQty = currentQty + quantity;
        } else if (action === 'subtract') {
          newQty = Math.max(0, currentQty - quantity);
        }

        // Update the sheet
        inventorySheet.getRange(i + 1, locationCol + 1).setValue(newQty);

        // Update timestamp
        if (updatedAtCol !== -1) {
          inventorySheet.getRange(i + 1, updatedAtCol + 1).setValue(new Date().toISOString());
        }

        found = true;
        break;
      }
    }

    if (!found) {
      return createResponse('error', null, 'Item not found in inventory');
    }

    return createResponse('success', null, 'Inventory updated successfully');
  } catch (error) {
    return createResponse('error', null, 'Error in updateLocationInventory: ' + error.toString());
  }
}

// Populate sample data for testing
function populateSampleData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Clear existing data from sheets
    const sheetsToClear = ['EVENTS', 'MEALS', 'MENU_ITEMS', 'LOCATION_INVENTORY', 'TRANSFERS'];
    sheetsToClear.forEach(sheetName => {
      const sheet = ss.getSheetByName(sheetName);
      if (sheet && sheet.getLastRow() > 1) {
        sheet.getRange(2, 1, sheet.getLastRow() - 1, sheet.getLastColumn()).clearContent();
      }
    });

    // Add sample event
    const eventsSheet = ss.getSheetByName('EVENTS');
    const eventId = 'evt_20250503';
    eventsSheet.appendRow([
      eventId,
      'Sadhu Sanga Retreat 2025',
      '2025-05-15',
      '2025-05-18',
      'New Vrindavan',
      1500,
      'active',
      new Date().toISOString()
    ]);

    // Add sample meals
    const mealsSheet = ss.getSheetByName('MEALS');
    const meals = [
      ['meal_001', eventId, 'Breakfast', 1, 'BF1', '07:00', 1500, 'planned', new Date().toISOString(), new Date().toISOString()],
      ['meal_002', eventId, 'Lunch', 1, 'L1', '12:00', 1500, 'planned', new Date().toISOString(), new Date().toISOString()],
      ['meal_003', eventId, 'Dinner', 1, 'D1', '18:00', 1500, 'planned', new Date().toISOString(), new Date().toISOString()],
    ];
    meals.forEach(meal => mealsSheet.appendRow(meal));

    // Add sample menu items
    const menuSheet = ss.getSheetByName('MENU_ITEMS');
    const menuItems = [
      // Breakfast items (item_id, meal_id, name, category, planned, ready, kitchen_storage_moved, status, vegan, gluten, allergens, updated)
      ['item_001', 'meal_001', 'Chapati', 'normal', 100, 80, 20, 'Ready', false, false, '', new Date().toISOString()],
      ['item_002', 'meal_001', 'Dal Tadka', 'normal', 50, 40, 10, 'Ready', false, false, '', new Date().toISOString()],
      ['item_003', 'meal_001', ' Rice', 'normal', 30, 25, 5, 'Ready', false, false, '', new Date().toISOString()],
      ['item_004', 'meal_001', 'Halwa', 'normal', 20, 15, 3, 'Ready', false, false, '', new Date().toISOString()],
      // Lunch items
      ['item_005', 'meal_002', 'Chapati', 'normal', 150, 120, 30, 'Ready', false, false, '', new Date().toISOString()],
      ['item_006', 'meal_002', 'Dal Makhani', 'normal', 60, 50, 15, 'Ready', false, false, '', new Date().toISOString()],
      ['item_007', 'meal_002', 'Rice', 'normal', 40, 35, 10, 'Ready', false, false, '', new Date().toISOString()],
      ['item_008', 'meal_002', 'Sabzi', 'normal', 40, 30, 8, 'Ready', false, false, '', new Date().toISOString()],
      ['item_009', 'meal_002', 'Salad', 'cold', 50, 40, 10, 'Ready', false, false, '', new Date().toISOString()],
      // Dinner items
      ['item_010', 'meal_003', 'Chapati', 'normal', 120, 100, 25, 'Ready', false, false, '', new Date().toISOString()],
      ['item_011', 'meal_003', 'Dal', 'normal', 50, 40, 10, 'Ready', false, false, '', new Date().toISOString()],
      ['item_012', 'meal_003', 'Fried Rice', 'normal', 35, 30, 8, 'Ready', false, false, '', new Date().toISOString()],
      ['item_013', 'meal_003', 'Sweet Rice', 'normal', 25, 20, 5, 'Ready', false, false, '', new Date().toISOString()],
    ];
    menuItems.forEach(item => menuSheet.appendRow(item));

    // Add sample location inventory (simulating some trays have been moved)
    // IMPORTANT: Cooked (ready_trays) must be >= tracked inventory (kitchen + staging + refill_1-3 + served)
    const inventorySheet = ss.getSheetByName('LOCATION_INVENTORY');
    const timestamp = new Date().toISOString();

    // Breakfast inventory - tracked = cooked for realistic distribution
    const breakfastInventory = [
      // inv_id, meal_id, item_id, name, category, planned, cooked, kitchen, staging, ref1, ref2, ref3, served, left, time
      ['inv_001', 'meal_001', 'item_001', 'Chapati', 'normal', 100, 80, 20, 25, 15, 10, 5, 5, 0, timestamp], // 80=20+25+15+10+5+5
      ['inv_002', 'meal_001', 'item_002', 'Dal Tadka', 'normal', 50, 40, 10, 15, 8, 5, 2, 0, 0, timestamp],  // 40=10+15+8+5+2
      ['inv_003', 'meal_001', 'item_003', ' Rice', 'normal', 30, 25, 5, 10, 5, 3, 2, 0, 0, timestamp],        // 25=5+10+5+3+2
      ['inv_004', 'meal_001', 'item_004', 'Halwa', 'normal', 20, 15, 3, 6, 3, 2, 1, 0, 0, timestamp],         // 15=3+6+3+2+1
    ];

    // Lunch inventory - some items still being cooked, some distributed
    const lunchInventory = [
      ['inv_005', 'meal_002', 'item_005', 'Chapati', 'normal', 150, 120, 30, 40, 20, 15, 10, 5, 0, timestamp], // 120=30+40+20+15+10+5
      ['inv_006', 'meal_002', 'item_006', 'Dal Makhani', 'normal', 60, 50, 15, 20, 8, 5, 2, 0, 0, timestamp],   // 50=15+20+8+5+2
      ['inv_007', 'meal_002', 'item_007', 'Rice', 'normal', 40, 35, 10, 12, 6, 4, 2, 1, 0, timestamp],         // 35=10+12+6+4+2+1
      ['inv_008', 'meal_002', 'item_008', 'Sabzi', 'normal', 40, 30, 8, 10, 5, 4, 2, 1, 0, timestamp],         // 30=8+10+5+4+2+1
      ['inv_009', 'meal_002', 'item_009', 'Salad', 'cold', 50, 40, 10, 15, 8, 5, 2, 0, 0, timestamp],         // 40=10+15+8+5+2
    ];

    // Dinner inventory - showing progressive distribution
    const dinnerInventory = [
      ['inv_010', 'meal_003', 'item_010', 'Chapati', 'normal', 120, 100, 25, 35, 18, 12, 8, 2, 0, timestamp], // 100=25+35+18+12+8+2
      ['inv_011', 'meal_003', 'item_011', 'Dal', 'normal', 50, 40, 10, 15, 7, 5, 2, 1, 0, timestamp],         // 40=10+15+7+5+2+1
      ['inv_012', 'meal_003', 'item_012', 'Fried Rice', 'normal', 35, 30, 8, 10, 5, 4, 2, 1, 0, timestamp],     // 30=8+10+5+4+2+1
      ['inv_013', 'meal_003', 'item_013', 'Sweet Rice', 'normal', 25, 20, 5, 7, 4, 2, 2, 0, 0, timestamp],      // 20=5+7+4+2+2
    ];

    breakfastInventory.forEach(row => inventorySheet.appendRow(row));
    lunchInventory.forEach(row => inventorySheet.appendRow(row));
    dinnerInventory.forEach(row => inventorySheet.appendRow(row));

    return createResponse('success', null, 'Sample data populated successfully. Use event ID: ' + eventId);
  } catch (error) {
    return createResponse('error', null, 'Error in populateSampleData: ' + error.toString());
  }
}

// Debug function to list all data
function debugData() {
  try {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);

    // Get events
    const eventsSheet = ss.getSheetByName('EVENTS');
    const events = eventsSheet.getLastRow() > 1 ? eventsSheet.getRange(2, 1, eventsSheet.getLastRow() - 1, 8).getValues() : [];

    // Get meals
    const mealsSheet = ss.getSheetByName('MEALS');
    const meals = mealsSheet.getLastRow() > 1 ? mealsSheet.getRange(2, 1, mealsSheet.getLastRow() - 1, 10).getValues() : [];

    // Get menu items
    const menuSheet = ss.getSheetByName('MENU_ITEMS');
    const menuItems = menuSheet.getLastRow() > 1 ? menuSheet.getRange(2, 1, menuSheet.getLastRow() - 1, 11).getValues() : [];

    // Get inventory
    const inventorySheet = ss.getSheetByName('LOCATION_INVENTORY');
    const inventory = inventorySheet.getLastRow() > 1 ? inventorySheet.getRange(2, 1, inventorySheet.getLastRow() - 1, 15).getValues() : [];

    return createResponse('success', {
      events: events.map(row => ({
        event_id: row[0],
        event_name: row[1],
        meal_count: meals.filter(m => m[1] === row[0]).length
      })),
      meals: meals.map(row => ({
        meal_id: row[0],
        event_id: row[1],
        meal_type: row[2],
        meal_instance: row[4]
      })),
      menu_items_count: menuItems.length,
      inventory_count: inventory.length,
      inventory_sample: inventory.slice(0, 3).map(row => ({
        meal_id: row[1],
        item_id: row[2],
        item_name: row[3],
        kitchen: row[7],
        staging: row[8],
        served: row[12]
      }))
    }, 'Debug data retrieved');
  } catch (error) {
    return createResponse('error', null, 'Error in debugData: ' + error.toString());
  }
}

// Populate USASadhuSanga2026 event data
  function populateUSASadhuSanga2026() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const eventId = 'USASadhuSanga2026';
    const timestamp = new Date().toISOString();

    // Get sheets
    let eventsSheet = ss.getSheetByName('EVENTS');
    let mealsSheet = ss.getSheetByName('MEALS');
    let menuSheet = ss.getSheetByName('MENU_ITEMS');
    let inventorySheet = ss.getSheetByName('LOCATION_INVENTORY');
                                                            
    if (!eventsSheet || !mealsSheet || !menuSheet || !inventorySheet) {
      return 'Error: Some sheets are missing. Run initializeSheet() first.';
    }

    // 1. Add Event
    eventsSheet.appendRow([
      eventId, 'Sadhu Sanga USA 2026', '2026-05-15', '2026-05-18',
      'New Vrindavan', 1500, 'active', timestamp
    ]);
   
    // 2. Add Meals
    const meals = [
      ['usa_meal_001', eventId, 'Breakfast', 1, 'BF1', '07:00', 1500, 'planned',
   timestamp, timestamp],
      ['usa_meal_002', eventId, 'Lunch', 1, 'L1', '12:00', 1500, 'planned',
  timestamp, timestamp],
      ['usa_meal_003', eventId, 'Dinner', 1, 'D1', '18:00', 1500, 'planned',
  timestamp, timestamp],
    ];
    meals.forEach(meal => mealsSheet.appendRow(meal));
                                                            
    // 3. Add Menu Items
    const menuItems = [
      ['usa_item_001', 'usa_meal_001', 'Chapati', 'normal', 100, 80, 'Ready',
  false, false, '', timestamp],
      ['usa_item_002', 'usa_meal_001', 'Dal Tadka', 'normal', 50, 40, 'Ready',
  false, false, '', timestamp],
      ['usa_item_003', 'usa_meal_001', 'Rice', 'normal', 30, 25, 'Ready', false,
   false, '', timestamp],
      ['usa_item_004', 'usa_meal_001', 'Halwa', 'normal', 20, 15, 'Ready',
  false, false, '', timestamp],
      ['usa_item_005', 'usa_meal_002', 'Chapati', 'normal', 150, 120, 'Ready',
  false, false, '', timestamp],
      ['usa_item_006', 'usa_meal_002', 'Dal Makhani', 'normal', 60, 50, 'Ready',
   false, false, '', timestamp],
      ['usa_item_007', 'usa_meal_002', 'Rice', 'normal', 40, 35, 'Ready', false,
   false, '', timestamp],
      ['usa_item_008', 'usa_meal_002', 'Sabzi', 'normal', 40, 30, 'Ready',
  false, false, '', timestamp],
      ['usa_item_009', 'usa_meal_002', 'Salad', 'cold', 50, 40, 'Ready', false,
  false, '', timestamp],
      ['usa_item_010', 'usa_meal_003', 'Chapati', 'normal', 120, 100, 'Ready',
  false, false, '', timestamp],
      ['usa_item_011', 'usa_meal_003', 'Dal', 'normal', 50, 40, 'Ready', false,
  false, '', timestamp],
      ['usa_item_012', 'usa_meal_003', 'Fried Rice', 'normal', 35, 30, 'Ready',
  false, false, '', timestamp],
      ['usa_item_013', 'usa_meal_003', 'Sweet Rice', 'normal', 25, 20, 'Ready',
  false, false, '', timestamp],
    ];
    menuItems.forEach(item => menuSheet.appendRow(item));
                                                            
    // 4. Add Location Inventory
    const inventoryItems = [
      ['usa_inv_001', 'usa_meal_001', 'usa_item_001', 'Chapati', 'normal', 100,
  80, 10, 30, 20, 15, 10, 10, 5, timestamp],
      ['usa_inv_002', 'usa_meal_001', 'usa_item_002', 'Dal Tadka', 'normal', 50,
   40, 5, 15, 10, 10, 5, 5, 5, timestamp],
      ['usa_inv_003', 'usa_meal_001', 'usa_item_003', 'Rice', 'normal', 30, 25,
  3, 8, 5, 5, 4, 4, 2, timestamp],
      ['usa_inv_004', 'usa_meal_001', 'usa_item_004', 'Halwa', 'normal', 20, 15,
   2, 5, 4, 3, 3, 3, 1, timestamp],
      ['usa_inv_005', 'usa_meal_002', 'usa_item_005', 'Chapati', 'normal', 150,
  120, 15, 40, 25, 20, 15, 15, 10, timestamp],
      ['usa_inv_006', 'usa_meal_002', 'usa_item_006', 'Dal Makhani', 'normal',
  60, 50, 8, 20, 12, 10, 8, 8, 8, timestamp],
      ['usa_inv_007', 'usa_meal_002', 'usa_item_007', 'Rice', 'normal', 40, 35,
  5, 12, 8, 8, 6, 6, 4, timestamp],
      ['usa_inv_008', 'usa_meal_002', 'usa_item_008', 'Sabzi', 'normal', 40, 30,
   5, 10, 8, 6, 5, 5, 3, timestamp],
      ['usa_inv_009', 'usa_meal_002', 'usa_item_009', 'Salad', 'cold', 50, 40,
  10, 15, 8, 7, 5, 5, 5, timestamp],
      ['usa_inv_010', 'usa_meal_003', 'usa_item_010', 'Chapati', 'normal', 120,
  100, 12, 35, 22, 18, 15, 12, 8, timestamp],
      ['usa_inv_011', 'usa_meal_003', 'usa_item_011', 'Dal', 'normal', 50, 40,
  6, 18, 12, 10, 8, 6, 6, timestamp],
      ['usa_inv_012', 'usa_meal_003', 'usa_item_012', 'Fried Rice', 'normal',
  35, 30, 4, 12, 8, 7, 6, 5, 4, timestamp],
      ['usa_inv_013', 'usa_meal_003', 'usa_item_013', 'Sweet Rice', 'normal',
  25, 20, 3, 8, 5, 5, 4, 3, 3, timestamp],
    ];
    inventoryItems.forEach(row => inventorySheet.appendRow(row));
                                                            
    return 'Successfully populated USASadhuSanga2026 data!';
  }

// Populate USASadhuSangaRetreat2026 event data
// Meal IDs match the meal schedule (friDinner, satBreakfast, etc.)
function populateUSASadhuSangaRetreat2026() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const eventId = 'USASadhuSangaRetreat2026';
    const timestamp = new Date().toISOString();

    // Get sheets
    let eventsSheet = ss.getSheetByName('EVENTS');
    let mealsSheet = ss.getSheetByName('MEALS');
    let menuSheet = ss.getSheetByName('MENU_ITEMS');
    let inventorySheet = ss.getSheetByName('LOCATION_INVENTORY');

    if (!eventsSheet || !mealsSheet || !menuSheet || !inventorySheet) {
      return 'Error: Some sheets are missing. Run initializeSheet() first.';
    }

    // 1. Add Event
    eventsSheet.appendRow([
      eventId, 'USA Sadhu Sanga Retreat 2026', '2026-05-22', '2026-05-25',
      'New Vrindavan', 1500, 'active', timestamp
    ]);

    // 2. Add Meals - meal IDs match meal schedule (used in Meal Scan activity tracking)
    const meals = [
      // Friday
      ['friDinner', eventId, 'Dinner', 1, 'D1', '18:00', 1500, 'planned', timestamp, timestamp],
      // Saturday
      ['satBreakfast', eventId, 'Breakfast', 2, 'BF1', '07:00', 1500, 'planned', timestamp, timestamp],
      ['satLunch', eventId, 'Lunch', 2, 'L1', '12:00', 1500, 'planned', timestamp, timestamp],
      ['satDinner', eventId, 'Dinner', 2, 'D2', '18:00', 1500, 'planned', timestamp, timestamp],
      // Sunday
      ['sunBreakfast', eventId, 'Breakfast', 3, 'BF2', '07:00', 1500, 'planned', timestamp, timestamp],
      ['sunLunch', eventId, 'Lunch', 3, 'L2', '12:00', 1500, 'planned', timestamp, timestamp],
      ['sunDinner', eventId, 'Dinner', 3, 'D3', '18:00', 1500, 'planned', timestamp, timestamp],
      // Monday
      ['monBreakfast', eventId, 'Breakfast', 4, 'BF3', '07:00', 1500, 'planned', timestamp, timestamp],
      ['monLunch', eventId, 'Lunch', 4, 'L3', '12:00', 1500, 'planned', timestamp, timestamp],
    ];
    meals.forEach(meal => mealsSheet.appendRow(meal));

    // Helper to generate item IDs
    let itemCounter = 1;
    let invCounter = 1;
    const getItemId = () => 'item_' + String(itemCounter++).padStart(3, '0');
    const getInvId = () => 'inv_' + String(invCounter++).padStart(3, '0');

    // Common menu items for each meal
    const commonItems = [
      { name: 'Chapati', category: 'normal', planned: 150, cooked: 120 },
      { name: 'Dal', category: 'normal', planned: 60, cooked: 50 },
      { name: 'Rice', category: 'normal', planned: 40, cooked: 35 },
      { name: 'Sabzi', category: 'normal', planned: 40, cooked: 30 },
      { name: 'Salad', category: 'cold', planned: 50, cooked: 40 },
      { name: 'Halwa', category: 'dessert', planned: 25, cooked: 20 },
    ];

    // 3. Add Menu Items and Location Inventory for each meal
    meals.forEach((meal) => {
      const mealId = meal[0]; // friDinner, satBreakfast, etc.

      commonItems.forEach(item => {
        const itemId = getItemId();

        // Add menu item
        menuSheet.appendRow([
          itemId, mealId, item.name, item.category,
          item.planned, item.cooked, 'Ready',
          false, false, '', timestamp
        ]);

        // Add location inventory (starting with empty distribution)
        inventorySheet.appendRow([
          getInvId(), mealId, itemId, item.name, item.category,
          item.planned, item.cooked,
          0, 0, 0, 0, 0, 0, 0, // kitchen, staging, refill_1-3, served, left_over
          timestamp
        ]);
      });
    });

    return 'Successfully populated USASadhuSangaRetreat2026 data with ' + meals.length + ' meals!';
  }

/**
 * POPULATE USA SADHU SANGA RETREAT 2026 - WITH ACTUAL MENU DATA
 *
 * This function populates the Google Sheets with the actual menu data
 * from COPY_PLAN_2026 tab. Run this after initializeSheet()
 *
 * Temperature indicators:
 * - H = Hot (🔥) -> category: 'normal'
 * - C = Cold (❄️) -> category: 'cold'
 * - Room/Warm = Room Temp (🏠) -> category: 'normal'
 */

function populateUSASadhuSangaRetreat2026_ActualData() {
    const ss = SpreadsheetApp.openById(SPREADSHEET_ID);
    const eventId = 'USASadhuSangaRetreat2026';
    const timestamp = new Date().toISOString();

    // Get sheets
    let eventsSheet = ss.getSheetByName('EVENTS');
    let mealsSheet = ss.getSheetByName('MEALS');
    let menuSheet = ss.getSheetByName('MENU_ITEMS');
    let inventorySheet = ss.getSheetByName('LOCATION_INVENTORY');

    if (!eventsSheet || !mealsSheet || !menuSheet || !inventorySheet) {
        return 'Error: Some sheets are missing. Run initializeSheet() first.';
    }

    // 1. Add Event
    eventsSheet.appendRow([
        eventId, 'USA Sadhu Sanga Retreat 2026', '2026-05-22', '2026-05-25',
        'New Vrindavan', 1500, 'active', timestamp
    ]);

    // 2. Add Meals
    const meals = [
        ['friDinner', eventId, 'Dinner', 1, 'D1', '18:00', 1500, 'planned', timestamp, timestamp],
        ['satBreakfast', eventId, 'Breakfast', 2, 'BF1', '07:00', 1500, 'planned', timestamp, timestamp],
        ['satLunch', eventId, 'Lunch', 2, 'L1', '12:00', 1500, 'planned', timestamp, timestamp],
        ['satDinner', eventId, 'Dinner', 2, 'D2', '18:00', 1500, 'planned', timestamp, timestamp],
        ['sunBreakfast', eventId, 'Breakfast', 3, 'BF2', '07:00', 1500, 'planned', timestamp, timestamp],
        ['sunLunch', eventId, 'Lunch', 3, 'L2', '12:00', 1500, 'planned', timestamp, timestamp],
        ['sunDinner', eventId, 'Dinner', 3, 'D3', '18:00', 1500, 'planned', timestamp, timestamp],
        ['monBreakfast', eventId, 'Breakfast', 4, 'BF3', '07:00', 1500, 'planned', timestamp, timestamp],
        ['monLunch', eventId, 'Lunch', 4, 'L3', '12:00', 1500, 'planned', timestamp, timestamp],
    ];
    meals.forEach(meal => mealsSheet.appendRow(meal));

    // ============================================================================
    // FRIDAY DINNER
    // ============================================================================
    const friDinnerItems = [
        // item_id, meal_id, name, category, planned, cooked, kitchen_storage_moved, status, vegan, gluten, allergens, updated
        ['item_fri_001', 'friDinner', 'Cauliflower Tofu Manchurian', 'normal', 140, 0, 0, 'Not Started', false, false, '', timestamp],
        ['item_fri_002', 'friDinner', 'Stirfry Choy Sum', 'normal', 140, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_fri_003', 'friDinner', 'Fried Rice', 'normal', 220, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_fri_004', 'friDinner', 'Chinese Soup', 'normal', '', 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_fri_005', 'friDinner', 'Chinese Pakora', 'normal', '', 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_fri_006', 'friDinner', 'Pakora sauce', 'cold', 55, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_fri_007', 'friDinner', 'Salad', 'cold', 45, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_fri_008', 'friDinner', 'Almond dressing', 'cold', '', 0, 0, 'Not Started', true, false, 'Nuts', timestamp],
        ['item_fri_009', 'friDinner', 'Mango Coconut Cheesecake', 'cold', 100, 0, 0, 'Not Started', false, true, 'Dairy,Nuts', timestamp],
        ['item_fri_010', 'friDinner', 'Vegan cheesecake', 'cold', 10, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_fri_011', 'friDinner', 'Lemon Mint drink', 'cold', '', 0, 0, 'Not Started', true, false, '', timestamp],
    ];
    friDinnerItems.forEach(item => menuSheet.appendRow(item));

    // Location inventory for Friday dinner
    const friDinnerInventory = [
        ['inv_fri_001', 'friDinner', 'item_fri_001', 'Cauliflower Tofu Manchurian', 'normal', 140, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_fri_002', 'friDinner', 'item_fri_002', 'Stirfry Choy Sum', 'normal', 140, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_fri_003', 'friDinner', 'item_fri_003', 'Fried Rice', 'normal', 220, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_fri_004', 'friDinner', 'item_fri_004', 'Chinese Soup', 'normal', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_fri_005', 'friDinner', 'item_fri_005', 'Chinese Pakora', 'normal', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_fri_006', 'friDinner', 'item_fri_006', 'Pakora sauce', 'cold', 55, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_fri_007', 'friDinner', 'item_fri_007', 'Salad', 'cold', 45, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_fri_008', 'friDinner', 'item_fri_008', 'Almond dressing', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_fri_009', 'friDinner', 'item_fri_009', 'Mango Coconut Cheesecake', 'cold', 100, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_fri_010', 'friDinner', 'item_fri_010', 'Vegan cheesecake', 'cold', 10, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_fri_011', 'friDinner', 'item_fri_011', 'Lemon Mint drink', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
    ];
    friDinnerInventory.forEach(inv => inventorySheet.appendRow(inv));

    // ============================================================================
    // SATURDAY BREAKFAST
    // ============================================================================
    const satBreakfastItems = [
        ['item_sat_bf_001', 'satBreakfast', 'Sooji Upma', 'normal', 180, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sat_bf_002', 'satBreakfast', 'Coconut Chutney', 'cold', '', 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sat_bf_003', 'satBreakfast', 'Granola', 'normal', 12, 0, 0, 'Not Started', true, false, 'Nuts', timestamp],
        ['item_sat_bf_004', 'satBreakfast', 'Milk/Almond milk', 'normal', '', 0, 0, 'Not Started', true, false, 'Dairy,Nuts', timestamp],
        ['item_sat_bf_005', 'satBreakfast', 'Yogurt', 'cold', '', 0, 0, 'Not Started', true, false, 'Dairy', timestamp],
        ['item_sat_bf_006', 'satBreakfast', 'Pancakes, Vegan Pancakes', 'normal', 100, 0, 0, 'Not Started', false, true, 'Dairy,Eggs', timestamp],
        ['item_sat_bf_007', 'satBreakfast', 'Syrup', 'normal', '', 0, 0, 'Not Started', true, false, '', timestamp],
    ];
    satBreakfastItems.forEach(item => menuSheet.appendRow(item));

    const satBreakfastInventory = [
        ['inv_sat_bf_001', 'satBreakfast', 'item_sat_bf_001', 'Sooji Upma', 'normal', 180, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_bf_002', 'satBreakfast', 'item_sat_bf_002', 'Coconut Chutney', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_bf_003', 'satBreakfast', 'item_sat_bf_003', 'Granola', 'normal', 12, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_bf_004', 'satBreakfast', 'item_sat_bf_004', 'Milk/Almond milk', 'normal', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_bf_005', 'satBreakfast', 'item_sat_bf_005', 'Yogurt', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_bf_006', 'satBreakfast', 'item_sat_bf_006', 'Pancakes, Vegan Pancakes', 'normal', 100, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_bf_007', 'satBreakfast', 'item_sat_bf_007', 'Syrup', 'normal', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
    ];
    satBreakfastInventory.forEach(inv => inventorySheet.appendRow(inv));

    // ============================================================================
    // SATURDAY LUNCH
    // ============================================================================
    const satLunchItems = [
        ['item_sat_lu_001', 'satLunch', 'Jeera Rice', 'normal', 220, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sat_lu_002', 'satLunch', 'Dal Makhani', 'normal', '', 0, 0, 'Not Started', true, false, 'Dairy', timestamp],
        ['item_sat_lu_003', 'satLunch', 'Mutter Panir', 'normal', 140, 0, 0, 'Not Started', false, false, 'Dairy', timestamp],
        ['item_sat_lu_004', 'satLunch', 'Spinach Cauliflower', 'normal', 140, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sat_lu_005', 'satLunch', 'Chapati', 'normal', '', 0, 0, 'Not Started', true, false, 'Gluten', timestamp],
        ['item_sat_lu_006', 'satLunch', 'Spinach Roll', 'normal', 45, 0, 0, 'Not Started', true, false, 'Gluten', timestamp],
        ['item_sat_lu_007', 'satLunch', 'Rasa Malai', 'cold', '', 0, 0, 'Not Started', false, false, 'Dairy,Nuts', timestamp],
        ['item_sat_lu_008', 'satLunch', 'Badaam Pista Burfi', 'cold', '', 0, 0, 'Not Started', false, false, 'Dairy,Nuts', timestamp],
        ['item_sat_lu_009', 'satLunch', 'Salad Sat Lunch', 'cold', 45, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sat_lu_010', 'satLunch', 'Chilli Pickle', 'cold', 24, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sat_lu_011', 'satLunch', 'Italian dressing', 'cold', '', 0, 0, 'Not Started', true, false, 'Dairy', timestamp],
        ['item_sat_lu_012', 'satLunch', 'Vegan Baadam Katli', 'cold', 10, 0, 0, 'Not Started', true, false, 'Nuts', timestamp],
    ];
    satLunchItems.forEach(item => menuSheet.appendRow(item));

    const satLunchInventory = [
        ['inv_sat_lu_001', 'satLunch', 'item_sat_lu_001', 'Jeera Rice', 'normal', 220, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_lu_002', 'satLunch', 'item_sat_lu_002', 'Dal Makhani', 'normal', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_lu_003', 'satLunch', 'item_sat_lu_003', 'Mutter Panir', 'normal', 140, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_lu_004', 'satLunch', 'item_sat_lu_004', 'Spinach Cauliflower', 'normal', 140, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_lu_005', 'satLunch', 'item_sat_lu_005', 'Chapati', 'normal', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_lu_006', 'satLunch', 'item_sat_lu_006', 'Spinach Roll', 'normal', 45, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_lu_007', 'satLunch', 'item_sat_lu_007', 'Rasa Malai', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_lu_008', 'satLunch', 'item_sat_lu_008', 'Badaam Pista Burfi', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_lu_009', 'satLunch', 'item_sat_lu_009', 'Salad Sat Lunch', 'cold', 45, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_lu_010', 'satLunch', 'item_sat_lu_010', 'Chilli Pickle', 'cold', 24, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_lu_011', 'satLunch', 'item_sat_lu_011', 'Italian dressing', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_lu_012', 'satLunch', 'item_sat_lu_012', 'Vegan Baadam Katli', 'cold', 10, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
    ];
    satLunchInventory.forEach(inv => inventorySheet.appendRow(inv));

    // ============================================================================
    // SATURDAY DINNER
    // ============================================================================
    const satDinnerItems = [
        ['item_sat_di_001', 'satDinner', 'Pasta with Vegetables', 'normal', 70, 0, 0, 'Not Started', true, false, 'Gluten', timestamp],
        ['item_sat_di_002', 'satDinner', 'Bread Roll', 'normal', 45, 0, 0, 'Not Started', true, false, 'Gluten', timestamp],
        ['item_sat_di_003', 'satDinner', 'Butter for Roll', 'cold', 24, 0, 0, 'Not Started', true, false, 'Dairy', timestamp],
        ['item_sat_di_004', 'satDinner', 'Asparagus Soup', 'normal', '', 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sat_di_005', 'satDinner', 'Cauliflower Pakora', 'normal', 55, 0, 0, 'Not Started', true, false, 'Gluten', timestamp],
        ['item_sat_di_006', 'satDinner', 'Salad', 'cold', 45, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sat_di_007', 'satDinner', 'Bell Pepper Sour Cream dressing', 'cold', '', 0, 0, 'Not Started', false, false, 'Dairy', timestamp],
        ['item_sat_di_008', 'satDinner', 'Tiramisu', 'cold', 100, 0, 0, 'Not Started', false, false, 'Dairy', timestamp],
        ['item_sat_di_009', 'satDinner', 'Vegan Tiramisu', 'cold', 10, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sat_di_010', 'satDinner', 'Pineapple Peach Nectar', 'cold', '', 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sat_di_011', 'satDinner', 'Steamed Vegetables', 'normal', 90, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sat_di_012', 'satDinner', 'Tahini Sauce for Veggies', 'cold', '', 0, 0, 'Not Started', true, false, 'Nuts,Sesame', timestamp],
    ];
    satDinnerItems.forEach(item => menuSheet.appendRow(item));

    const satDinnerInventory = [
        ['inv_sat_di_001', 'satDinner', 'item_sat_di_001', 'Pasta with Vegetables', 'normal', 70, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_di_002', 'satDinner', 'item_sat_di_002', 'Bread Roll', 'normal', 45, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_di_003', 'satDinner', 'item_sat_di_003', 'Butter for Roll', 'cold', 24, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_di_004', 'satDinner', 'item_sat_di_004', 'Asparagus Soup', 'normal', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_di_005', 'satDinner', 'item_sat_di_005', 'Cauliflower Pakora', 'normal', 55, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_di_006', 'satDinner', 'item_sat_di_006', 'Salad', 'cold', 45, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_di_007', 'satDinner', 'item_sat_di_007', 'Bell Pepper Sour Cream dressing', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_di_008', 'satDinner', 'item_sat_di_008', 'Tiramisu', 'cold', 100, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_di_009', 'satDinner', 'item_sat_di_009', 'Vegan Tiramisu', 'cold', 10, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_di_010', 'satDinner', 'item_sat_di_010', 'Pineapple Peach Nectar', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_di_011', 'satDinner', 'item_sat_di_011', 'Steamed Vegetables', 'normal', 90, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sat_di_012', 'satDinner', 'item_sat_di_012', 'Tahini Sauce for Veggies', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
    ];
    satDinnerInventory.forEach(inv => inventorySheet.appendRow(inv));

    // ============================================================================
    // SUNDAY BREAKFAST
    // ============================================================================
    const sunBreakfastItems = [
        ['item_sun_bf_001', 'sunBreakfast', 'Semiya Upma', 'normal', 180, 0, 0, 'Not Started', true, false, 'Gluten', timestamp],
        ['item_sun_bf_002', 'sunBreakfast', 'Tomato jalapeno chutney', 'cold', '', 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sun_bf_003', 'sunBreakfast', 'Granola Sun', 'normal', 12, 0, 0, 'Not Started', true, false, 'Nuts', timestamp],
        ['item_sun_bf_004', 'sunBreakfast', 'Milk/ Almond milk', 'normal', '', 0, 0, 'Not Started', true, false, 'Dairy,Nuts', timestamp],
        ['item_sun_bf_005', 'sunBreakfast', 'Yogurt', 'cold', '', 0, 0, 'Not Started', true, false, 'Dairy', timestamp],
        ['item_sun_bf_006', 'sunBreakfast', 'Cream Cheese Danish & Vegan', 'cold', 110, 0, 0, 'Not Started', false, true, 'Dairy,Eggs,Gluten,Nuts', timestamp],
    ];
    sunBreakfastItems.forEach(item => menuSheet.appendRow(item));

    const sunBreakfastInventory = [
        ['inv_sun_bf_001', 'sunBreakfast', 'item_sun_bf_001', 'Semiya Upma', 'normal', 180, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_bf_002', 'sunBreakfast', 'item_sun_bf_002', 'Tomato jalapeno chutney', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_bf_003', 'sunBreakfast', 'item_sun_bf_003', 'Granola Sun', 'normal', 12, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_bf_004', 'sunBreakfast', 'item_sun_bf_004', 'Milk/ Almond milk', 'normal', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_bf_005', 'sunBreakfast', 'item_sun_bf_005', 'Yogurt', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_bf_006', 'sunBreakfast', 'item_sun_bf_006', 'Cream Cheese Danish & Vegan', 'cold', 110, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
    ];
    sunBreakfastInventory.forEach(inv => inventorySheet.appendRow(inv));

    // ============================================================================
    // SUNDAY LUNCH
    // ============================================================================
    const sunLunchItems = [
        ['item_sun_lu_001', 'sunLunch', 'Saffron Cashew Rice', 'normal', 220, 0, 0, 'Not Started', true, false, 'Nuts', timestamp],
        ['item_sun_lu_002', 'sunLunch', 'Mixed Dal', 'normal', '', 0, 0, 'Not Started', true, false, 'Dairy', timestamp],
        ['item_sun_lu_003', 'sunLunch', 'Kadai Panir', 'normal', 110, 0, 0, 'Not Started', false, false, 'Dairy', timestamp],
        ['item_sun_lu_004', 'sunLunch', 'Mixed Vegetable', 'normal', 110, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sun_lu_005', 'sunLunch', 'Chapati', 'normal', '', 0, 0, 'Not Started', true, false, 'Gluten', timestamp],
        ['item_sun_lu_006', 'sunLunch', 'Dhokla', 'normal', 90, 0, 0, 'Not Started', true, false, 'Gluten', timestamp],
        ['item_sun_lu_007', 'sunLunch', 'Green Chutney', 'cold', '', 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sun_lu_008', 'sunLunch', 'Gulab Jamun', 'cold', '', 0, 0, 'Not Started', false, false, 'Dairy', timestamp],
        ['item_sun_lu_009', 'sunLunch', 'Dilkush', 'cold', '', 0, 0, 'Not Started', false, false, 'Dairy,Nuts', timestamp],
        ['item_sun_lu_010', 'sunLunch', 'Salad Sun lunch', 'cold', 45, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sun_lu_011', 'sunLunch', 'Chilli Pickle', 'cold', '', 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sun_lu_012', 'sunLunch', 'Italian dressing', 'cold', '', 0, 0, 'Not Started', true, false, 'Dairy', timestamp],
        ['item_sun_lu_013', 'sunLunch', 'Vegan Coconut Burfi', 'cold', 10, 0, 0, 'Not Started', true, false, 'Nuts', timestamp],
    ];
    sunLunchItems.forEach(item => menuSheet.appendRow(item));

    const sunLunchInventory = [
        ['inv_sun_lu_001', 'sunLunch', 'item_sun_lu_001', 'Saffron Cashew Rice', 'normal', 220, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_lu_002', 'sunLunch', 'item_sun_lu_002', 'Mixed Dal', 'normal', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_lu_003', 'sunLunch', 'item_sun_lu_003', 'Kadai Panir', 'normal', 110, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_lu_004', 'sunLunch', 'item_sun_lu_004', 'Mixed Vegetable', 'normal', 110, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_lu_005', 'sunLunch', 'item_sun_lu_005', 'Chapati', 'normal', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_lu_006', 'sunLunch', 'item_sun_lu_006', 'Dhokla', 'normal', 90, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_lu_007', 'sunLunch', 'item_sun_lu_007', 'Green Chutney', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_lu_008', 'sunLunch', 'item_sun_lu_008', 'Gulab Jamun', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_lu_009', 'sunLunch', 'item_sun_lu_009', 'Dilkush', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_lu_010', 'sunLunch', 'item_sun_lu_010', 'Salad Sun lunch', 'cold', 45, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_lu_011', 'sunLunch', 'item_sun_lu_011', 'Chilli Pickle', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_lu_012', 'sunLunch', 'item_sun_lu_012', 'Italian dressing', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_lu_013', 'sunLunch', 'item_sun_lu_013', 'Vegan Coconut Burfi', 'cold', 10, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
    ];
    sunLunchInventory.forEach(inv => inventorySheet.appendRow(inv));

    // ============================================================================
    // SUNDAY DINNER
    // ============================================================================
    const sunDinnerItems = [
        ['item_sun_di_001', 'sunDinner', 'Shepard Pie', 'normal', 175, 0, 0, 'Not Started', false, false, 'Dairy', timestamp],
        ['item_sun_di_002', 'sunDinner', 'Gravy', 'normal', '', 0, 0, 'Not Started', false, false, 'Dairy', timestamp],
        ['item_sun_di_003', 'sunDinner', 'Butternut Squash Soup', 'normal', '', 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sun_di_004', 'sunDinner', 'Sweet Potato Pakora', 'normal', 55, 0, 0, 'Not Started', true, false, 'Gluten', timestamp],
        ['item_sun_di_005', 'sunDinner', 'Southern Syle Biscuits & Vegan biscuits', 'normal', 45, 0, 0, 'Not Started', false, true, 'Dairy,Eggs,Gluten', timestamp],
        ['item_sun_di_006', 'sunDinner', 'Butter for Biscuits', 'cold', 24, 0, 0, 'Not Started', true, false, 'Dairy', timestamp],
        ['item_sun_di_007', 'sunDinner', 'Salad', 'cold', 45, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sun_di_008', 'sunDinner', 'Tahini Dressing', 'cold', '', 0, 0, 'Not Started', true, false, 'Nuts,Sesame', timestamp],
        ['item_sun_di_009', 'sunDinner', 'Fruit Cocktail Drink', 'cold', '', 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sun_di_010', 'sunDinner', 'Flan with Berries', 'cold', 100, 0, 0, 'Not Started', false, false, 'Dairy,Eggs', timestamp],
        ['item_sun_di_011', 'sunDinner', 'Vegan Flan with Berries', 'cold', 10, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_sun_di_012', 'sunDinner', 'Stir Fry Green Beans', 'normal', 90, 0, 0, 'Not Started', true, false, '', timestamp],
    ];
    sunDinnerItems.forEach(item => menuSheet.appendRow(item));

    const sunDinnerInventory = [
        ['inv_sun_di_001', 'sunDinner', 'item_sun_di_001', 'Shepard Pie', 'normal', 175, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_di_002', 'sunDinner', 'item_sun_di_002', 'Gravy', 'normal', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_di_003', 'sunDinner', 'item_sun_di_003', 'Butternut Squash Soup', 'normal', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_di_004', 'sunDinner', 'item_sun_di_004', 'Sweet Potato Pakora', 'normal', 55, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_di_005', 'sunDinner', 'item_sun_di_005', 'Southern Syle Biscuits & Vegan biscuits', 'normal', 45, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_di_006', 'sunDinner', 'item_sun_di_006', 'Butter for Biscuits', 'cold', 24, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_di_007', 'sunDinner', 'item_sun_di_007', 'Salad', 'cold', 45, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_di_008', 'sunDinner', 'item_sun_di_008', 'Tahini Dressing', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_di_009', 'sunDinner', 'item_sun_di_009', 'Fruit Cocktail Drink', 'cold', '', 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_di_010', 'sunDinner', 'item_sun_di_010', 'Flan with Berries', 'cold', 100, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_di_011', 'sunDinner', 'item_sun_di_011', 'Vegan Flan with Berries', 'cold', 10, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_sun_di_012', 'sunDinner', 'item_sun_di_012', 'Stir Fry Green Beans', 'normal', 90, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
    ];
    sunDinnerInventory.forEach(inv => inventorySheet.appendRow(inv));

    // ============================================================================
    // MONDAY BREAKFAST
    // ============================================================================
    const monBreakfastItems = [
        ['item_mon_bf_001', 'monBreakfast', 'Khichidi', 'normal', 220, 0, 0, 'Not Started', true, false, '', timestamp],
        ['item_mon_bf_002', 'monBreakfast', 'Apple Raita', 'cold', 55, 0, 0, 'Not Started', true, false, 'Dairy', timestamp],
        ['item_mon_bf_003', 'monBreakfast', 'Blueberry Halwa', 'normal', 45, 0, 0, 'Not Started', true, false, 'Dairy', timestamp],
    ];
    monBreakfastItems.forEach(item => menuSheet.appendRow(item));

    const monBreakfastInventory = [
        ['inv_mon_bf_001', 'monBreakfast', 'item_mon_bf_001', 'Khichidi', 'normal', 220, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_mon_bf_002', 'monBreakfast', 'item_mon_bf_002', 'Apple Raita', 'cold', 55, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
        ['inv_mon_bf_003', 'monBreakfast', 'item_mon_bf_003', 'Blueberry Halwa', 'normal', 45, 0, 0, 0, 0, 0, 0, 0, 0, timestamp],
    ];
    monBreakfastInventory.forEach(inv => inventorySheet.appendRow(inv));

    return 'Successfully populated USA Sadhu Sanga Retreat 2026 with actual menu data from COPY_PLAN_2026! ' +
           'Total meals: 9, Total menu items: ~75';
}

