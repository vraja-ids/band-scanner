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

# Type checking
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
- **Expo Screen Orientation** — app supports portrait + landscape modes

### Directory Structure
```
├── journey/              # Screen components organized by feature
│   ├── Login/           # Authentication flows
│   ├── Home/            # Main dashboard and activity stats
│   ├── Daypass/         # Daypass scanning and redemption
│   ├── PrasadamDistribution/  # Multi-team prasadam coordination
│   ├── BhogaTracker/    # Ingredient/meal planning with Google Sheets
│   └── common/util/     # Shared utilities (Scanner, etc.)
├── services/            # Business logic and external integrations
├── network/             # API client, types, error handling
├── storage/             # Session/persistence utilities
├── routes/              # Navigation routes and param types
├── utils/               # Helper utilities
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
- Google Apps Script backend for Prasadam Distribution tracking
- Uses `GOOGLE_APPS_SCRIPT_URL` (deployed web app) to interact with sheets
- 5-second in-memory cache for dashboard data
- **IMPORTANT**: When adding POST operations, avoid parameter name conflicts with `operation` field
- Use `action` instead of `operation` for sub-operation names (e.g., `action: 'add'|'subtract'`)
- `updateLocationInventory(data: { mealId, itemId, location, quantity, action })`
- `recordTransfer(data: { meal_id, item_id, item_name, quantity, from_location, to_location, from_user })`
- `getTransfers(mealId)` returns transfer history for long-press display

**Bhoga Google Sheets Service** (`services/GoogleSheetsService.ts`)
- Direct Google Sheets API integration (OAuth2) for Bhoga ingredient tracking
- Reads from "Ingredient List", "Storage Locations", "Stock Transactions" tabs
- Singleton instance exported as `googleSheetsService`
- Separate OAuth flow from Prasadam service (uses different spreadsheet)

**Background Stats Service** (`services/BackgroundStatsService.tsx`)
- App-level component that fetches activity stats every 1 minute when app is active
- Stores snapshots to AsyncStorage for the Inflow Comparison chart
- Only runs when user is logged in (has `selectedEventId`)
- Respects app state (fetches on foreground if >30s elapsed)

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

**Scanner Flow**
The generic `Scanner` component (`journey/common/util/Scanner.tsx`) handles QR/barcode scanning and redirects to the appropriate screen based on `ScannerParams` passed via navigation.

**Prasadam Distribution Architecture**
Multi-team workflow with 4 teams:
- Team 0 (Planning + Cooking): `PrasadamPlanCookScreen`
- Team 1 (Kitchen → Staging): `PrasadamKitchenDashboard`, `PrasadamKitchenSendScreen`
- Team 2 (Staging Management): `PrasadamStagingDashboard`, `PrasadamTransferQueue`
- Team 3 (Refill Stations): `PrasadamRefillRequest`, `PrasadamRefillReceive`, `PrasadamBuffetRefillTracker`

**Dashboard Color Groups**
Stage headers are color-coded with bold separators between groups:
- Planning (Planned): Gray
- Production (Cooked, Stored): Orange/Brown
- Tracking (Distributed): Blue
- Staging: Amber
- Refill Stations (1, 2, 3): Greens
- Buffet Lanes: Purple
- Left Over: Red

**Optimistic Updates**
Movement operations update UI immediately with optimistic local state changes, then sync silently with server via background refresh. No loading spinners on cells.

**Transfer History**
Long press on quantity cells shows past 3 movements for that item. Transfers are created via `recordTransfer()` API call after successful inventory updates.

**Other Feature Modules**
- `Daypass/` — Daypass scanning and redemption flows
- `BhogaTracker/` — Ingredient/meal planning with Google Sheets integration
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

Copy `.env.example` to `.env.local` and add:
- `EXPO_PUBLIC_GOOGLE_SHEETS_API_KEY` — Google Sheets API key for Bhoga tracking
- `EXPO_PUBLIC_GOOGLE_SHEETS_ID` — Spreadsheet ID (default: Rishikesh Kirtan Fest)

**Note:** `.env.local` is git-ignored. Never commit actual API keys.

## Build/Deployment

- **iOS Bundle ID**: `com.sadhusanga.ScannerApp` (Apple Team: ST8SH8S3P4, ASC App ID: 6480351919)
- **Android Package**: `com.sadhusanga.ScannerApp`
- **Version**: Defined in `app.json` (currently 2.2.9, iOS build 24, Android version 27)
- **EAS Project ID**: `eedf4ca2-7f92-48aa-a4c9-2095d7f9f150`
- **New Architecture**: Enabled for both platforms
- **OTA Updates**: Configured via `expo-updates`
- **Build Profiles** (eas.json):
  - `development` — dev client with internal distribution
  - `preview` — internal distribution for testing
  - `production` — app store submission (iOS: medium resource class, Android: internal track)

## Google Apps Script Integration

The `GoogleAppsScript.code.js` file contains the backend API for Prasadam Distribution tracking.

**Deployment:**
1. Open Google Sheet → Extensions → Apps Script
2. Replace ALL code with contents of `GoogleAppsScript.code.js`
3. Deploy as Web App (Execute as: Me, Access: Anyone)
4. Update `GOOGLE_APPS_SCRIPT_URL` in `services/PrasadamSheetsService.ts`

**Key Functions:**
- `getDashboardSummary(mealId)` — Returns menu + inventory + transfers for a meal
- `updateLocationInventory(mealId, itemId, location, quantity, action)` — Add/subtract from locations
- `recordTransfer(data)` — Creates transfer history records
- `getTransfers(mealId)` — Returns all transfers for a meal

**Important Notes:**
- `action` parameter uses `'add'|'subtract'` (NOT `'operation'` to avoid conflict with API wrapper)
- `populateSampleData()` creates test data with Cooked = Tracked Inventory constraint
