#!/usr/bin/env node

/**
 * Sync Supabase to Google Sheets
 *
 * This script can be run:
 * 1. Locally: node scripts/sync-supabase-to-sheets.js
 * 2. Via cron job (every 5-10 minutes)
 * 3. In CI/CD
 *
 * Setup:
 * 1. npm install @supabase/supabase-js googleapis
 * 2. Create a Google Service Account with Sheets access
 * 3. Download the service account JSON key
 * 4. Set environment variables (see .env.example)
 */

const { createClient } = require('@supabase/supabase-js');
const { google } = require('googleapis');
const fs = require('fs');
const path = require('path');

// ============================================================================
// Configuration from Environment Variables
// ============================================================================

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_KEY;
const SPREADSHEET_ID = process.env.GOOGLE_SPREADSHEET_ID;
const GOOGLE_SERVICE_ACCOUNT_KEY_FILE = process.env.GOOGLE_SERVICE_ACCOUNT_KEY_FILE;

if (!SUPABASE_URL || !SUPABASE_SERVICE_KEY) {
  console.error('Missing SUPABASE_URL or SUPABASE_SERVICE_KEY');
  process.exit(1);
}

if (!SPREADSHEET_ID) {
  console.error('Missing GOOGLE_SPREADSHEET_ID');
  process.exit(1);
}

// ============================================================================
// Initialize Clients
// ============================================================================

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY);

let sheetsClient;
if (GOOGLE_SERVICE_ACCOUNT_KEY_FILE) {
  const auth = new google.auth.GoogleAuth({
    keyFile: GOOGLE_SERVICE_ACCOUNT_KEY_FILE,
    scopes: ['https://www.googleapis.com/auth/spreadsheets'],
  });
  sheetsClient = google.sheets({ version: 'v4', auth });
} else {
  console.warn('No Google service account configured. Skipping Sheets sync.');
}

// ============================================================================
// Helper Functions
// ============================================================================

async function clearSheet(sheets, spreadsheetId, sheetName) {
  try {
    // Clear all data except header row
    await sheets.spreadsheets.values.clear({
      spreadsheetId,
      range: `${sheetName}!A2:Z`,
    });
  } catch (error) {
    // Ignore if sheet doesn't exist yet
    if (error.code !== 404) {
      console.warn(`Warning clearing ${sheetName}:`, error.message);
    }
  }
}

async function writeSheet(sheets, spreadsheetId, sheetName, headers, data) {
  const values = [headers, ...data];

  try {
    await sheets.spreadsheets.values.update({
      spreadsheetId,
      range: `${sheetName}!A1`,
      valueInputOption: 'RAW',
      resource: { values },
    });
    return true;
  } catch (error) {
    console.error(`Error writing to ${sheetName}:`, error.message);
    return false;
  }
}

// ============================================================================
// Sync Functions
// ============================================================================

async function syncEvents() {
  const { data: events, error } = await supabase.from('events').select('*');

  if (error) {
    console.error('Error fetching events:', error);
    return false;
  }

  const values = events.map((e) => [
    e.event_id,
    e.event_name,
    e.start_date,
    e.end_date,
    e.location || '',
    e.expected_attendance || 0,
    e.status || 'active',
    e.created_at,
  ]);

  console.log(`Syncing ${events.length} events...`);

  if (sheetsClient) {
    await writeSheet(
      sheetsClient,
      SPREADSHEET_ID,
      'EVENTS',
      ['event_id', 'event_name', 'start_date', 'end_date', 'location', 'expected_attendance', 'status', 'created_at'],
      values
    );
  }

  return true;
}

async function syncMeals() {
  const { data: meals, error } = await supabase.from('meals').select('*');

  if (error) {
    console.error('Error fetching meals:', error);
    return false;
  }

  const values = meals.map((m) => [
    m.meal_id,
    m.event_id,
    m.meal_type,
    m.day_number,
    m.meal_instance,
    m.serving_start_time,
    m.planned_servings || 0,
    m.status || 'planned',
    m.created_at,
    m.updated_at,
  ]);

  console.log(`Syncing ${meals.length} meals...`);

  if (sheetsClient) {
    await writeSheet(
      sheetsClient,
      SPREADSHEET_ID,
      'MEALS',
      ['meal_id', 'event_id', 'meal_type', 'day_number', 'meal_instance', 'serving_start_time', 'planned_servings', 'status', 'created_at', 'updated_at'],
      values
    );
  }

  return true;
}

async function syncMenuItems() {
  const { data: items, error } = await supabase.from('menu_items').select('*');

  if (error) {
    console.error('Error fetching menu items:', error);
    return false;
  }

  const values = items.map((i) => [
    i.item_id,
    i.meal_id,
    i.name,
    i.category,
    i.planned_trays || 0,
    i.ready_trays || 0,
    i.kitchen_storage_moved || 0,
    i.cooking_status || 'Not Started',
    i.is_vegan || false,
    i.contains_gluten || false,
    i.allergens || '',
    i.updated_at,
  ]);

  console.log(`Syncing ${items.length} menu items...`);

  if (sheetsClient) {
    await writeSheet(
      sheetsClient,
      SPREADSHEET_ID,
      'MENU_ITEMS',
      ['item_id', 'meal_id', 'name', 'category', 'planned_trays', 'ready_trays', 'kitchen_storage_moved', 'cooking_status', 'is_vegan', 'contains_gluten', 'allergens', 'updated_at'],
      values
    );
  }

  return true;
}

async function syncLocationInventory() {
  const { data: inventory, error } = await supabase.from('location_inventory').select('*');

  if (error) {
    console.error('Error fetching location inventory:', error);
    return false;
  }

  const values = inventory.map((inv) => [
    inv.inventory_id,
    inv.meal_id,
    inv.item_id,
    inv.item_name,
    inv.category,
    inv.planned_trays || 0,
    inv.ready_trays || 0,
    inv.kitchen || 0,
    inv.staging || 0,
    inv.refill_1 || 0,
    inv.refill_2 || 0,
    inv.refill_3 || 0,
    inv.served || 0,
    inv.left_over || 0,
    inv.updated_at,
  ]);

  console.log(`Syncing ${inventory.length} location inventory items...`);

  if (sheetsClient) {
    await writeSheet(
      sheetsClient,
      SPREADSHEET_ID,
      'LOCATION_INVENTORY',
      ['inventory_id', 'meal_id', 'item_id', 'item_name', 'category', 'planned_trays', 'ready_trays', 'kitchen', 'staging', 'refill_1', 'refill_2', 'refill_3', 'served', 'left_over', 'updated_at'],
      values
    );
  }

  return true;
}

async function syncTransfers() {
  const { data: transfers, error } = await supabase.from('transfers').select('*');

  if (error) {
    console.error('Error fetching transfers:', error);
    return false;
  }

  const values = transfers.map((t) => [
    t.transfer_id,
    t.meal_id,
    t.item_id,
    t.item_name,
    t.quantity,
    t.from_location,
    t.to_location,
    t.from_user,
    t.to_user || '',
    t.status,
    t.timestamp_sent,
    t.timestamp_received || '',
  ]);

  console.log(`Syncing ${transfers.length} transfers...`);

  if (sheetsClient) {
    await writeSheet(
      sheetsClient,
      SPREADSHEET_ID,
      'TRANSFERS',
      ['transfer_id', 'meal_id', 'item_id', 'item_name', 'quantity', 'from_location', 'to_location', 'from_user', 'to_user', 'status', 'timestamp_sent', 'timestamp_received'],
      values
    );
  }

  return true;
}

async function syncDashboardSettings() {
  const { data: settings, error } = await supabase.from('dashboard_settings').select('*');

  if (error) {
    console.error('Error fetching dashboard settings:', error);
    return false;
  }

  const values = settings.map((s) => [
    s.setting_id,
    s.event_id,
    s.setting_type,
    s.setting_value,
    s.updated_at,
    s.updated_by,
  ]);

  console.log(`Syncing ${settings.length} dashboard settings...`);

  if (sheetsClient) {
    await writeSheet(
      sheetsClient,
      SPREADSHEET_ID,
      'DASHBOARD_SETTINGS',
      ['setting_id', 'event_id', 'setting_type', 'setting_value', 'updated_at', 'updated_by'],
      values
    );
  }

  return true;
}

// ============================================================================
// Main Function
// ============================================================================

async function main() {
  const startTime = Date.now();
  console.log('Starting sync from Supabase to Google Sheets...');
  console.log(`Spreadsheet ID: ${SPREADSHEET_ID}`);

  const results = {
    events: await syncEvents(),
    meals: await syncMeals(),
    menuItems: await syncMenuItems(),
    locationInventory: await syncLocationInventory(),
    transfers: await syncTransfers(),
    dashboardSettings: await syncDashboardSettings(),
  };

  const failedSyncs = Object.entries(results)
    .filter(([_, success]) => !success)
    .map(([table]) => table);

  const elapsed = ((Date.now() - startTime) / 1000).toFixed(2);

  console.log(`\nSync completed in ${elapsed}s`);

  if (failedSyncs.length > 0) {
    console.error('Failed to sync:', failedSyncs.join(', '));
    process.exit(1);
  }

  console.log('All tables synced successfully!');
}

main().catch(console.error);
