# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

SS Admin (Band Scanner) is a React Native/Expo app for managing Sadhu Sanga Retreat event operations. The app handles QR/barcode scanning for attendee management, meal distribution tracking, prasadam (food) distribution coordination, daypass redemption, and Bhoga (ingredient/meal planning) tracking.

## Development Commands

```bash
# Start development server
yarn start

# Run on specific platforms
yarn ios
yarn android
yarn web

# Type checking (no unit tests - use manual testing)
yarn typecheck

# Fix Expo dependencies
yarn expo:fix

# Check Expo project health
yarn expo:doctor

# Start with cache clear (if UI issues persist)
yarn start --reset-cache

# EAS Build profiles: development, preview, production
eas build --platform ios --profile preview
eas build --platform android --profile preview
eas build --platform all --profile production

# Submit to app stores (requires eas.json configuration)
eas submit --platform ios --profile production
eas submit --platform android --profile production
```

## Architecture

### Tech Stack
- **React Native 0.81.5** with Expo 54 (New Architecture enabled)
- **TypeScript** with strict mode enabled (path alias: `@/*` → project root)
- **React Navigation** (Native Stack + Bottom Tabs)
- **i18next** for internationalization (en, ru, es)
- **Axios** for API calls
- **Expo Camera** for QR/barcode scanning
- **AsyncStorage** for local persistence
- **Google Sheets API** for Bhoga ingredient tracking
- **Expo Screen Orientation** — app supports portrait + landscape (all screens must handle both)
- **Supabase** (@supabase/supabase-js) — Primary backend for Prasadam Distribution with Google Sheets fallback
- **React Native Paper** — Material Design component library

### Directory Structure
```
├── journey/              # Screen components organized by feature
│   ├── Login/           # Authentication flows
│   ├── Home/            # Main dashboard and activity stats
│   ├── Daypass/         # Daypass scanning and redemption
│   ├── PrasadamDistribution/  # Multi-team prasadam coordination
│   ├── BhogaTracker/    # Ingredient/meal planning with Google Sheets
│   ├── Meals/           # Meal scanning and related features
│   ├── Gifts/           # Gift distribution tracking
│   ├── Services/        # Service tracking
│   ├── Tags/            # Tag management
│   ├── RishikeshKirtanFest/  # Event-specific screens
│   └── common/util/     # Shared utilities (Scanner, etc.)
├── services/            # Business logic and external integrations
├── network/             # API client, types, error handling
├── storage/             # Session/persistence utilities
├── routes/              # Navigation routes and param types
├── utils/               # Helper utilities
├── supabase/            # Database migrations and types
├── config/              # Event and meal schedule configuration
├── components/          # Shared UI components
└── locales/             # i18n translation files
```

### Key Services

**API Layer** (`network/api.ts`)
- Base URL: `https://network.sadhusangaretreat.com`
- Axios client with Bearer auth (auto-injected from `getAuthToken()`)
- `requestAsApiResponse()` wrapper converts errors to `ApiResponse<T>` type
- Separate HTTP-only client for specific endpoints (daypass status workaround)
- Mock API support via `USE_MOCK_API` flag

**Prasadam Sheets Service** (`services/PrasadamSheetsService.ts`)
- Google Apps Script backend for Prasadam Distribution tracking (legacy/fallback)
- Uses `GOOGLE_APPS_SCRIPT_URL` (deployed web app) to interact with sheets
- 5-second in-memory cache for dashboard data
- **IMPORTANT**: When adding POST operations, avoid parameter name conflicts with `operation` field
- Use `action` instead of `operation` for sub-operation names (e.g., `action: 'add'|'subtract'`)
- `updateLocationInventory(data: { mealId, itemId, location, quantity, action })`
- `recordTransfer(data: { meal_id, item_id, item_name, quantity, from_location, to_location, from_user })`
- `getTransfers(mealId)` returns transfer history for long-press display

**Prasadam Supabase Service** (`services/PrasadamSupabaseService.ts`)
- **Switchable backend** — can use Supabase OR fall back to Google Sheets based on config
- 20x faster than Google Apps Script (50-200ms vs 1-3s)
- Supports concurrent users without performance degradation
- Real-time subscriptions for live updates across devices
- Offline queue with automatic retry when connectivity returns
- All functions are backward compatible with `PrasadamSheetsService` interface
- See `supabase/README.md` for setup instructions

**Supabase Database Schema** (`supabase/migrations/`)
- `001_initial_schema.sql` — Core tables: events, meals, menu_items, location_inventory, transfers, refill_requests, dashboard_settings
- `002_inventory_function.sql` — RPC function `update_inventory_location` for atomic inventory updates
- `003_populate_menu_data.sql` — Sample data for Rishikesh Kirtan Fest
- `004_fix_location_mapping.sql` — Fix UI location names to DB column mapping (Kitchen → kitchen)

**Important: Cooked → Stored Validation**
- `ready_trays` is cumulative (total ever cooked, never decreases)
- `kitchen_storage_moved` tracks how many trays moved from Cooked to Stored
- Max movable trays = `ready_trays - kitchen_storage_moved`
- When user taps Cooked → Stored with maxQty = 0, show alert: "No Trays Available"
- This prevents double-counting the same physical tray

**Backend Selection Logic:**
1. If `EXPO_PUBLIC_FORCE_SHEETS_BACKEND=true` → Google Sheets only
2. Else if Supabase credentials valid → Supabase with Google Sheets backup
3. Else → Google Sheets fallback

**Bhoga Google Sheets Service** (`services/BhogaSheetsService.ts`)
- Backend-authenticated Google Sheets integration for Bhoga ingredient tracking
- Uses shared Google Apps Script backend (`GOOGLE_APPS_SCRIPT_URL`)
- Reads from "Ingredient List", "Storage Locations", "Stock Transactions" tabs
- Singleton instance exported as `bhogaSheetsService`
- Operations: `getIngredientList()`, `getStorageLocations()`, `getDeliveries()`, `recordDelivery()`, `getDeliveredItems()`, `moveToStorage()`

**BhogaTracker Screens**
- `BhogaHomeScreen` — Main dashboard with meal cards (Fri-Sun, Breakfast/Lunch/Dinner), retreat date picker, alerts badge
- `BhogaMealScreen` — Meal detail showing items and ingredient status (pending/delivered/used)
- `BhogaAlertsScreen` — Shows ingredients with current stock below pending need
- `BhogaAdminScreen` — Storage location setup (room, sublocation, initial stock)
- `BhogaStorageScreen` — View all storage locations with current stock levels
- `BhogaDeliveryScreen` — Mark ingredient deliveries with editable qty (can exceed expected)
- `BhogaStorageMoveScreen` — Move delivered items to storage with room picker (Kitchen, Pantry, Walk-in Fridge, Dry Storage, Cold Room)

**Background Stats Service** (`services/BackgroundStatsService.tsx`)
- App-level component that fetches activity stats every 1 minute when app is active
- Stores snapshots to AsyncStorage for the Inflow Comparison chart
- Only runs when user is logged in (has `selectedEventId`)
- Respects app state (fetches on foreground if >30s elapsed)

**Meal Activity Service** (`services/MealActivityService.ts`)
- Fetches meal scanning statistics from the backend API
- `getMealActivityStats()` uses the same endpoint as Daypass stats but for meal tracking
- `getDevoteesCountForMeal()` returns number of devotees scanned for a specific meal
- Uses public API endpoint `getDaypassActivityStats` with `activity` parameter as meal_id

**Background Sheets Sync Service** (`services/BackgroundSheetsSyncService.tsx`)
- Periodically syncs Supabase data to Google Sheets as backup (every 2 minutes)
- Runs only when app is active and user is logged in
- Syncs: meals, menu items, location inventory, transfers
- Provides `useSheetsSync()` hook for React components
- Requires `EXPO_PUBLIC_SHEETS_SYNC_FUNCTION_URL` and `EXPO_PUBLIC_PRASADAM_SPREADSHEET_ID`

**Meal Picker** (`config/mealSchedule.ts`, `journey/Meals/components/MealPickerModal.tsx`)
- Time-based auto-selection of current meal before scanning
- `getCurrentMeal(eventId)` returns meal based on current time within defined windows
- Meal IDs match both scan activity tracking (`activity` parameter) and Prasadam Distribution sheets
- Shows confirmation alert if user selects different meal than suggested

### Navigation

Routes defined in `routes/index.ts` as const object. All screens registered in `App.tsx` using React Navigation's Native Stack. Route params are strongly typed via interfaces (e.g., `ScannerParams`, `PrasadamPlanCookParams`).

### Key Patterns

**Screen Component Structure**
```typescript
// Most screens follow this pattern:
- useState for local state
- useEffect for initial data fetch
- api.get/post() wrapped in requestAsApiResponse()
- AsyncStorage for persistence via SessionManager
- navigation.navigate() with typed params
```

**Screen Orientation**
The app supports portrait and both landscape orientations. All screens must handle layout changes gracefully. Use `useWindowDimensions()` hook for responsive layouts.

**Scanner Flow**
The generic `Scanner` component (`journey/common/util/Scanner.tsx`) handles QR/barcode scanning and redirects to the appropriate screen based on `ScannerParams` passed via navigation.

**Prasadam Distribution Architecture**
Unified dashboard with view-based access controls:
- **All View**: Shows all stages except Planned (Cooked → Stored → Staging → Refill Stations → Buffet Lanes → Left Over)
- **Stats View** (read-only): Shows Planned, Kitchen (Cooked), Distributed (Served), Left Over with percentages
- **Staging View**: Stored → Staging → Refill Stations
- **Serving View**: Refill Stations → Buffet Lanes → Left Over

**Movement & Editing**
- Tap on quantity cell: Opens forward movement popup (default qty: 0)
- Long press on quantity cell: Opens reverse/edit popup
  - Cooked: Edit mode (direct quantity setting - cumulative)
  - Other stages: Reverse movement options
- Movements update UI immediately (optimistic), sync silently in background

**Dashboard Color Groups**
Stage headers are color-coded with bold separators:
- Planning (Planned): Gray
- Production (Kitchen/Cooked, Stored): Orange/Brown
- Tracking (Distributed): Blue
- Staging: Amber
- Refill Stations (1, 2, 3): Greens
- Buffet Lanes: Purple
- Left Over: Red

**Display Name Context**
- "Stats" view: Cooked displays as "Kitchen", Served displays as "Distributed"
- Other views: Standard names (Cooked, Stored, etc.)

**Other Feature Modules**
- `Daypass/` — Daypass scanning and redemption flows
- `BhogaTracker/` — Ingredient/meal planning: Home (meal grid), Delivery (mark receipts), Storage Move (put away), Alerts (low stock), Admin (setup), Meal (ingredient status)
- `RishikeshKirtanFest/` — Event-specific screens
- `Gifts/`, `Meals/`, `Services/`, `Tags/` — Additional operational features

**i18n Usage**
```typescript
import { useTranslation } from 'react-i18next';
const { t } = useTranslation();
// Use t('key') in components
```

**Session Management**
```typescript
import { getString, setString, Keys } from '../storage/Session';
// Keys.SELECTED_EVENT_ID, Keys.SELECTED_LANGUAGE, etc.
```

## Environment Variables

Copy `.env.example` to `.env.local` and add your values. Key variables:

### Backend Configuration

**Option A: Supabase with Google Sheets Backup (Recommended - Fast)**
```bash
EXPO_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=your-anon-key
EXPO_PUBLIC_SHEETS_SYNC_FUNCTION_URL=https://your-project.supabase.co/functions/v1/sync-to-sheets
EXPO_PUBLIC_PRASADAM_SPREADSHEET_ID=your-sheet-id
# Leave EXPO_PUBLIC_FORCE_SHEETS_BACKEND unset or set to 'false'
```

**Option B: Google Sheets Only (Legacy - Slower)**
```bash
EXPO_PUBLIC_FORCE_SHEETS_BACKEND=true
GOOGLE_APPS_SCRIPT_URL=https://script.google.com/macros/s/...
```

### Other Variables
- `EXPO_PUBLIC_GOOGLE_SHEETS_API_KEY` — Google Sheets API key for Bhoga tracking
- `EXPO_PUBLIC_GOOGLE_SHEETS_ID` — Spreadsheet ID (default: Rishikesh Kirtan Fest)

**Note:** `.env.local` is git-ignored. Never commit actual API keys. See `.env.example` for all available options.

## Build/Deployment

- **iOS Bundle ID**: `com.sadhusanga.ScannerApp` (Apple Team: ST8SH8S3P4, ASC App ID: 6480351919, Apple ID: loghash@gmail.com)
- **Android Package**: `com.sadhusanga.ScannerApp`
- **Version**: Defined in `app.json` (currently 2.2.9, iOS build 28, Android version 27)
- **EAS Project ID**: `eedf4ca2-7f92-48aa-a4c9-2095d7f9f150`
- **New Architecture**: Enabled for both platforms
- **OTA Updates**: Configured via `expo-updates`
- **Build Profiles** (eas.json):
  - `development` — dev client with internal distribution
  - `preview` — internal distribution for testing
  - `production` — app store submission (iOS: medium resource class, Android: internal track)

## Google Apps Script Integration

The `GoogleAppsScript.code.js` file contains the backend API for both Prasadam Distribution and Bhoga Tracker.

**Deployment:**
1. Open Google Sheet → Extensions → Apps Script
2. Replace ALL code with contents of `GoogleAppsScript.code.js`
3. Deploy as Web App (Execute as: Me, Access: Anyone)
4. Update `EXPO_PUBLIC_GOOGLE_APPS_SCRIPT_URL` in `.env.local`

**Key Functions (Prasadam Distribution):**
- `getDashboardSummary(mealId)` — Returns menu + inventory + transfers for a meal
- `updateLocationInventory(mealId, itemId, location, quantity, action)` — Add/subtract from locations
- `recordTransfer(data)` — Creates transfer history records
- `getTransfers(mealId)` — Returns all transfers for a meal

**Key Functions (Bhoga Tracker):**
- `bhogaGetIngredientList()` — Returns meals and ingredients with planned quantities
- `bhogaGetStorageLocations()` — Returns all configured storage locations
- `bhogaGetDeliveries()` — Returns delivery records with expected/delivered qty
- `bhogaRecordDelivery(data)` — Records ingredient delivery
- `bhogaGetDeliveredItems()` — Returns items pending storage (status='delivered')
- `bhogaMoveToStorage(data)` — Moves item to storage, updates status to 'stored'

**Important Notes:**
- `action` parameter uses `'add'|'subtract'` (NOT `'operation'` to avoid conflict with API wrapper)
- `populateSampleData()` creates test data with Cooked = Tracked Inventory constraint
