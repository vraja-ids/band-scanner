/**
 * Supabase Edge Function: Sync to Google Sheets
 *
 * This function syncs data from Supabase to Google Sheets as a backup.
 * It can be triggered:
 * 1. Via cron job (every 5-10 minutes)
 * 2. Manually via HTTP POST
 * 3. Via Supabase webhooks on data changes
 *
 * Setup:
 * 1. Create a Google Service Account with Sheet access
 * 2. Set GOOGLE_SERVICE_ACCOUNT_EMAIL and GOOGLE_PRIVATE_KEY as secrets
 * 3. Set SPREADSHEET_ID as a secret
 * 4. Deploy to Supabase: supabase functions deploy sync-to-sheets
 */

import { serve } from 'https://deno.land/std@0.168.0/http/server.ts';
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ============================================================================
// Configuration
// ============================================================================

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!;
const spreadsheetId = Deno.env.get('GOOGLE_SPREADSHEET_ID')!;

// ============================================================================
// Google Sheets API Helpers
// ============================================================================

interface GoogleServiceAccountConfig {
  type: 'service_account';
  project_id: string;
  private_key_id: string;
  private_key: string;
  client_email: string;
  client_id: string;
  auth_uri: string;
  token_uri: string;
  auth_provider_x509_cert_url: string;
  client_x509_cert_url: string;
}

let cachedAccessToken: string | null = null;
let tokenExpiry: number = 0;

async function getGoogleAccessToken(): Promise<string> {
  // Return cached token if still valid
  if (cachedAccessToken && Date.now() < tokenExpiry) {
    return cachedAccessToken;
  }

  const config: GoogleServiceAccountConfig = {
    type: 'service_account',
    project_id: Deno.env.get('GOOGLE_PROJECT_ID') || '',
    private_key_id: Deno.env.get('GOOGLE_PRIVATE_KEY_ID') || '',
    private_key: Deno.env.get('GOOGLE_PRIVATE_KEY')?.replace(/\\n/g, '\n') || '',
    client_email: Deno.env.get('GOOGLE_SERVICE_ACCOUNT_EMAIL') || '',
    client_id: Deno.env.get('GOOGLE_CLIENT_ID') || '',
    auth_uri: 'https://accounts.google.com/o/oauth2/auth',
    token_uri: 'https://oauth2.googleapis.com/token',
    auth_provider_x509_cert_url: 'https://www.googleapis.com/oauth2/v1/certs',
    client_x509_cert_url: '',
  };

  // Create JWT for OAuth2
  const header = { alg: 'RS256', typ: 'JWT' };
  const now = Date.now() / 1000;
  const payload = {
    iss: config.client_email,
    scope: 'https://www.googleapis.com/auth/spreadsheets',
    aud: config.token_uri,
    iat: Math.floor(now),
    exp: Math.floor(now) + 3600,
  };

  // Import crypto for signing
  const encoder = new TextEncoder();
  const headerEncoded = btoa(JSON.stringify(header));
  const payloadEncoded = btoa(JSON.stringify(payload));
  const signatureInput = `${headerEncoded}.${payloadEncoded}`;

  // Sign with private key
  const privateKey = await crypto.subtle.importKey(
    'pkcs8',
    encoder.encode(config.private_key),
    { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' },
    false,
    ['sign']
  );

  const signature = await crypto.subtle.sign(
    'RSASSA-PKCS1-v1_5',
    privateKey,
    encoder.encode(signatureInput)
  );

  const signatureEncoded = btoa(String.fromCharCode(...new Uint8Array(signature)));
  const jwt = `${signatureInput}.${signatureEncoded}`;

  // Exchange JWT for access token
  const tokenResponse = await fetch(config.token_uri, {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: new URLSearchParams({
      grant_type: 'urn:ietf:params:oauth:grant-type:jwt-bearer',
      assertion: jwt,
    }),
  });

  if (!tokenResponse.ok) {
    throw new Error(`Failed to get access token: ${await tokenResponse.text()}`);
  }

  const tokenData = await tokenResponse.json();
  cachedAccessToken = tokenData.access_token;
  tokenExpiry = Date.now() + (tokenData.expires_in - 60) * 1000; // 1min buffer

  return cachedAccessToken;
}

async function appendToSheet(sheetName: string, values: any[][]): Promise<boolean> {
  try {
    const token = await getGoogleAccessToken();

    // First, clear existing data (keep headers)
    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:Z`,
      {
        method: 'DELETE',
        headers: {
          Authorization: `Bearer ${token}`,
        },
      }
    );

    // Append new data
    if (values.length > 0) {
      await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!A2:Z:append?valueInputOption=RAW`,
        {
          method: 'POST',
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ values }),
        }
      );
    }

    return true;
  } catch (error) {
    console.error(`Error syncing ${sheetName}:`, error);
    return false;
  }
}

async function updateSheet(sheetName: string, range: string, values: any[][]): Promise<boolean> {
  try {
    const token = await getGoogleAccessToken();

    await fetch(
      `https://sheets.googleapis.com/v4/spreadsheets/${spreadsheetId}/values/${sheetName}!${range}?valueInputOption=RAW`,
      {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ values }),
      }
    );

    return true;
  } catch (error) {
    console.error(`Error updating ${sheetName}:`, error);
    return false;
  }
}

// ============================================================================
// Data Sync Functions
// ============================================================================

async function syncEvents(supabase: any): Promise<boolean> {
  const { data: events } = await supabase.from('events').select('*');

  if (!events || events.length === 0) return true;

  const values = events.map((e: any) => [
    e.event_id,
    e.event_name,
    e.start_date,
    e.end_date,
    e.location || '',
    e.expected_attendance || 0,
    e.status || 'active',
    e.created_at,
  ]);

  return updateSheet('EVENTS', 'A1', [
    ['event_id', 'event_name', 'start_date', 'end_date', 'location', 'expected_attendance', 'status', 'created_at'],
    ...values,
  ]);
}

async function syncMeals(supabase: any): Promise<boolean> {
  const { data: meals } = await supabase.from('meals').select('*');

  if (!meals || meals.length === 0) return true;

  const values = meals.map((m: any) => [
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

  return updateSheet('MEALS', 'A1', [
    ['meal_id', 'event_id', 'meal_type', 'day_number', 'meal_instance', 'serving_start_time', 'planned_servings', 'status', 'created_at', 'updated_at'],
    ...values,
  ]);
}

async function syncMenuItems(supabase: any): Promise<boolean> {
  const { data: items } = await supabase.from('menu_items').select('*');

  if (!items || items.length === 0) return true;

  const values = items.map((i: any) => [
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

  return updateSheet('MENU_ITEMS', 'A1', [
    ['item_id', 'meal_id', 'name', 'category', 'planned_trays', 'ready_trays', 'kitchen_storage_moved', 'cooking_status', 'is_vegan', 'contains_gluten', 'allergens', 'updated_at'],
    ...values,
  ]);
}

async function syncLocationInventory(supabase: any): Promise<boolean> {
  const { data: inventory } = await supabase.from('location_inventory').select('*');

  if (!inventory || inventory.length === 0) return true;

  const values = inventory.map((inv: any) => [
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

  return updateSheet('LOCATION_INVENTORY', 'A1', [
    ['inventory_id', 'meal_id', 'item_id', 'item_name', 'category', 'planned_trays', 'ready_trays', 'kitchen', 'staging', 'refill_1', 'refill_2', 'refill_3', 'served', 'left_over', 'updated_at'],
    ...values,
  ]);
}

async function syncTransfers(supabase: any): Promise<boolean> {
  const { data: transfers } = await supabase.from('transfers').select('*');

  if (!transfers || transfers.length === 0) return true;

  const values = transfers.map((t: any) => [
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

  return updateSheet('TRANSFERS', 'A1', [
    ['transfer_id', 'meal_id', 'item_id', 'item_name', 'quantity', 'from_location', 'to_location', 'from_user', 'to_user', 'status', 'timestamp_sent', 'timestamp_received'],
    ...values,
  ]);
}

async function syncDashboardSettings(supabase: any): Promise<boolean> {
  const { data: settings } = await supabase.from('dashboard_settings').select('*');

  if (!settings || settings.length === 0) return true;

  const values = settings.map((s: any) => [
    s.setting_id,
    s.event_id,
    s.setting_type,
    s.setting_value,
    s.updated_at,
    s.updated_by,
  ]);

  return updateSheet('DASHBOARD_SETTINGS', 'A1', [
    ['setting_id', 'event_id', 'setting_type', 'setting_value', 'updated_at', 'updated_by'],
    ...values,
  ]);
}

// ============================================================================
// Main Handler
// ============================================================================

serve(async (req) => {
  // Only allow POST requests
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 });
  }

  // Verify cron secret (for scheduled invocations)
  const authHeader = req.headers.get('Authorization');
  const cronSecret = Deno.env.get('CRON_SECRET');

  if (cronSecret && authHeader !== `Bearer ${cronSecret}`) {
    return new Response('Unauthorized', { status: 401 });
  }

  try {
    // Initialize Supabase client
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    // Get request body for optional filtering
    const body = await req.json().catch(() => ({}));
    const tables = body.tables; // Optional: specific tables to sync

    const results: Record<string, boolean> = {};

    // Sync all tables or specific ones
    const tablesToSync = tables || ['events', 'meals', 'menu_items', 'location_inventory', 'transfers', 'dashboard_settings'];

    if (tablesToSync.includes('events')) {
      results.events = await syncEvents(supabase);
    }
    if (tablesToSync.includes('meals')) {
      results.meals = await syncMeals(supabase);
    }
    if (tablesToSync.includes('menu_items')) {
      results.menu_items = await syncMenuItems(supabase);
    }
    if (tablesToSync.includes('location_inventory')) {
      results.location_inventory = await syncLocationInventory(supabase);
    }
    if (tablesToSync.includes('transfers')) {
      results.transfers = await syncTransfers(supabase);
    }
    if (tablesToSync.includes('dashboard_settings')) {
      results.dashboard_settings = await syncDashboardSettings(supabase);
    }

    // Return results
    const success = Object.values(results).every((r) => r === true);
    const failedTables = Object.entries(results)
      .filter(([_, r]) => r === false)
      .map(([t]) => t);

    return new Response(
      JSON.stringify({
        success,
        results,
        failedTables,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: success ? 200 : 207, // 207 for partial success
      }
    );
  } catch (error) {
    console.error('Sync error:', error);
    return new Response(
      JSON.stringify({
        success: false,
        error: error.message,
        timestamp: new Date().toISOString(),
      }),
      {
        headers: { 'Content-Type': 'application/json' },
        status: 500,
      }
    );
  }
});
