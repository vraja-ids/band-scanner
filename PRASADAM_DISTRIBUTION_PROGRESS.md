# Prasadam Distribution Feature - Progress Summary

**Last Updated:** 2026-05-04
**Project:** SS Admin (Band Scanner) - React Native/Expo App
**Feature:** Multi-team Prasadam (food) Distribution Coordination System

---

## Overview

A comprehensive kitchen-to-buffet distribution tracking system for managing food trays through multiple stages: Kitchen → Staging → Refill Stations → Buffet. Supports 4 team views with movement tracking, inventory management, and historical data.

---

## Architecture

### Tech Stack
- React Native 0.81.5 with Expo 54
- TypeScript (strict mode)
- React Navigation (Native Stack)
- Google Sheets API via Google Apps Script for backend
- AsyncStorage for local persistence
- Expo Camera for QR/barcode scanning

### Team Structure
| Team | Role                    | Stages Managed               |
|------|-------------------------|------------------------------|
| 0    | Planning + Cooking      | stored (Kitchen)             |
| 1    | Kitchen → Staging       | stored → staging             |
| 2    | Staging Management      | staging → refill_stations    |
| 3    | Refill → Buffet         | refill_stations → buffet     |

### Location Flow
```
Kitchen (stored) → Staging (staging) → Refill 1/2/3 (refill_station_1/2/3) → Buffet (served) → Left Over (left_over)
```

---

## Completed Features

### 1. Main Dashboard (`PrasadamDashboardScreen.tsx`)
- **Item Card Grid**: Displays menu items as cards with power balls at each stage
- **Power Balls**: 3D spherical visual indicators showing quantity per stage
- **Tap Movement**: Tap power ball to move quantity forward to next stage
- **Long Press**: Opens popup with movement history and reverse options
- **Drag & Drop**: Drag power balls to move quantity between stages
- **Auto-refresh**: Polls for updates every 5 minutes (respects app state)
- **Team View Toggle**: Switch between 4 team views for relevant stages
- **Quantity Movement**: Standard options +2, +3, +4, +5, +10, +20

### 2. Movement System
- **Forward Movement**: Tap any power ball → select quantity → moves to next valid stage
- **Staging Multi-Dest**: From staging, select specific refill station (1, 2, or 3)
- **Reverse Movement**: Long press → move back to previous stage OR to left_over
- **Movement History**: Last 5 movements per item, stored in `allMovements` state
- **Transfer Recording**: All movements recorded to Google Sheets TRANSFERS tab

### 3. Inventory Management
- **Location Inventory**: Real-time tray counts per location per item
- **Auto-sync**: Updates after every movement with cache invalidation
- **Historical Movements**: Fetched from server via `getMealTransfers()`

### 4. Team-Specific Screens

#### Team 0: Plan & Cook (`PrasadamPlanCookScreen`)
- View all menu items with planned vs ready trays
- Update cooking status (Not Started → Cooking → Ready → Served)
- Adjust tray counts

#### Team 1: Kitchen Dashboard (`PrasadamKitchenDashboard`)
- View items at kitchen (stored) stage
- Move to staging with quantity selection
- View staging queue

#### Team 2: Staging Management (`PrasadamStagingDashboard`)
- View staging inventory
- Transfer to specific refill stations
- Manage refill requests from Team 3

#### Team 3: Refill Stations
- **Refill Request (`PrasadamRefillRequest`)**: Request items from staging
- **Receive (`PrasadamRefillReceive`)**: Confirm incoming transfers
- **Buffet Refill Tracker (`PrasadamBuffetRefillTracker`)**: Track buffet-level inventory

### 5. Settings & Configuration

#### Dashboard Settings (`PrasadamDashboardSettings.tsx`)
- Refill station count (1-3)
- Custom station names
- Serving lane count and names
- Low quantity threshold (UI exists, alerts currently disabled)
- Tray multiple (for quick select, currently using fixed values)

#### Event Settings (`PrasadamEventSettingsScreen.tsx`)
- Meal configuration
- Low stock threshold per item

---

## Data Models

### Key Types
```typescript
// Dashboard item with per-stage quantities
interface DashboardItem {
  item_id: string;
  name: string;
  icon: string;
  category: MenuItemCategory;
  planned_qty: number;
  cooked_qty: number;
  stored_qty: number;      // Kitchen
  staging_qty: number;     // Staging area
  refill_station_1_qty: number;
  refill_station_2_qty: number;
  refill_station_3_qty: number;
  served_qty: number;      // Buffet
  left_over_qty: number;
  low_qty_threshold: number;
}

// Movement record for history
interface MovementRecord {
  movement_id: string;
  item_id: string;
  item_name: string;
  meal_id: string;
  from_stage: DashboardStage;
  to_stage: DashboardStage;
  quantity: number;
  moved_by: string;
  timestamp: string;
}

// Dashboard settings
interface DashboardSettings {
  event_id: string;
  refill_stations: {
    enabled: boolean;
    count: number;
    names: string[];
  };
  serving_lanes: {
    count: number;
    names: string[];
  };
  default_low_qty_threshold: number;
  tray_multiple: number;
}
```

---

## Google Sheets Integration

### Service: `PrasadamSheetsService.ts`
- **Base URL**: Google Apps Script webhook
- **Spreadsheet ID**: `1iiq9EeSDQ9eQzwkK4rQPbNXJGD_cnp-z0bnlWzDcW6g`

### Sheet Tabs
| Tab        | Purpose                           |
|------------|-----------------------------------|
| EVENTS     | Event metadata                    |
| MEALS      | Meal definitions                  |
| MENU_ITEMS | Items per meal                    |
| TRANSFERS  | All movement records              |
| LOCATION_INVENTORY | Per-location tray counts |
| REFILL_REQUESTS | Refill requests from stations |
| DASHBOARD_SETTINGS | Configurable settings    |
| USERS      | User/team assignments             |

### Key API Operations
- `getMealTransfers(mealId)` - Get movement history
- `createTransfer(transfer)` - Record movement
- `getLocationInventory(mealId)` - Get current inventory
- `getDashboardSettings(eventId)` - Get settings
- `saveDashboardSettings(...)` - Persist settings

### Caching Strategy
- In-memory cache with 5-second TTL
- Persistent cache in AsyncStorage (2x TTL for offline)
- Stale-while-revalidate for 30 seconds
- Cache cleared on writes

---

## Components

### Core Components
| Component              | Purpose                                      |
|------------------------|----------------------------------------------|
| `PowerBall`            | 3D spherical quantity indicator             |
| `QuantityMovePopup`    | Quantity selection for forward movement      |
| `ReverseMovePopup`     | History + reverse/leftover movement          |
| `ItemDetailSheet`      | Bottom sheet with item details               |
| `PrasadamTabs`         | Bottom navigation for team screens           |

---

## Movement Rules

### Forward Movement Rules (`MOVEMENT_RULES`)
```typescript
stored → ['staging']
staging → ['refill_station_1', 'refill_station_2', 'refill_station_3']
refill_station_1 → ['served']
refill_station_2 → ['served']
refill_station_3 → ['served']
served → []  // End of line
left_over → [] // Reverse only
```

### Reverse Movement Rules (`REVERSE_MOVEMENT_RULES`)
```typescript
refill_station_1 → ['staging', 'left_over']
refill_station_2 → ['staging', 'left_over']
refill_station_3 → ['staging', 'left_over']
served → ['left_over']
staging → ['stored']
```

---

## Known Issues & TODOs

### Current Issues
1. **Movement History Loading** - Historical movements from Google Sheets not displaying properly
   - API returns data correctly (17 transfers)
   - But status comes back as "error" despite data being present
   - Need to debug response parsing in `PrasadamSheetsService.ts`
   - Check if `data.status` is being set correctly by Google Apps Script

2. **TestFlight White Screen** - Production builds show white screen
   - Local development builds work fine
   - Issue likely with `main.jsbundle` not being generated for archive
   - `RCTNewArchEnabled` mismatch between app.json (false) and Info.plist (true)
   - Recommendation: Use EAS Build instead of local Xcode archive

3. **Threshold Alerts** - Currently disabled
   - Low quantity indicators (pulsing red power balls) are turned off
   - `isLow` prop hardcoded to `false` in PowerBall renders
   - Feature to be revisited later

### TODO Items
1. **Fix Movement History Loading**
   - Debug API response parsing
   - Ensure meal_id comparison works correctly
   - Test with real data from Google Sheets

2. **Resolve TestFlight Build Issue**
   - Fix bundle generation for production
   - Or switch to EAS Build for consistency

3. **Re-enable Threshold Alerts** (future)
   - Fix pulsing animation logic
   - Ensure per-item thresholds work
   - Test with real low-stock scenarios

4. **Performance Optimization**
   - Reduce re-renders on dashboard
   - Optimize drag-drop performance
   - Consider virtualization for large item lists

---

## Recent Changes (2026-05-04)

### Quantity Options
- Changed from multiples of `trayMultiple` to fixed values: +2, +3, +4, +5, +10, +20
- Applied to both `QuantityMovePopup` and `ReverseMovePopup`
- Options filtered to show only values ≤ available quantity

### UI Updates
- Removed "Reverse" text from long-press popup header
- Now just says "Move To:" since both leftover and backward options are shown
- Updated quick select button styles for better layout with 6 options

### Threshold Alerts
- Disabled by passing `isLow={false}` to all PowerBall renders
- Visual pulsing/glow animations no longer trigger
- Settings UI remains intact for future re-enabling

---

## File Structure

```
journey/PrasadamDistribution/
├── PrasadamDashboardScreen.tsx          # Main dashboard (1400+ lines)
├── PrasadamTabs.tsx                     # Team view navigation
├── PrasadamDashboardSettings.tsx        # Settings screen
├── PrasadamCoordinatorDashboard.tsx     # Coordinator view
├── PrasadamPlanCookScreen.tsx           # Team 0
├── PrasadamKitchenDashboard.tsx         # Team 1
├── PrasadamKitchenSendScreen.tsx        # Kitchen → Staging
├── PrasadamStagingDashboard.tsx         # Team 2
├── PrasadamTransferQueue.tsx            # Pending transfers
├── PrasadamRefillStations.tsx           # Team 3 hub
├── PrasadamRefillRequest.tsx            # Request from staging
├── PrasadamRefillReceive.tsx            # Receive transfers
├── PrasadamBuffetRefillTracker.tsx      # Buffet-level tracking
├── PrasadamEventSettingsScreen.tsx      # Event configuration
├── components/
│   ├── PowerBall.tsx                    # 3D quantity indicator
│   ├── QuantityMovePopup.tsx            # Forward movement popup
│   ├── ReverseMovePopup.tsx             # Reverse/history popup
│   └── ItemDetailSheet.tsx             # Item details bottom sheet
├── types/
│   ├── dashboard.types.ts               # All type definitions
│   └── movement.types.ts                # Movement-related types
└── services/
    └── PrasadamSheetsService.ts         # Google Sheets API client
```

---

## Testing Checklist

### Movement Flow
- [ ] Tap power ball → popup opens with correct item/stage
- [ ] Select quantity → confirm → quantity updates in UI
- [ ] Google Sheets updated with transfer record
- [ ] Movement history shows recent transfers (currently broken)

### Reverse Movement
- [ ] Long press power ball → popup opens with history
- [ ] Can select previous stage OR left_over
- [ ] Reverse movement executes correctly

### Staging Multi-Dest
- [ ] From staging → select refill station 1, 2, or 3
- [ ] Correct destination gets quantity

### Settings
- [ ] Change refill station count → UI updates
- [ ] Change station names → reflected in UI
- [ ] Settings persist to Google Sheets

### Performance
- [ ] Dashboard loads in < 2 seconds
- [ ] Movements complete in < 1 second
- [ ] Auto-refresh doesn't cause UI flicker

---

## Session Notes

### What Works Well
- Tap-to-move interface is intuitive
- Drag and drop works smoothly
- Visual power balls make inventory clear
- Team view filtering reduces clutter

### What Needs Work
- Movement history not loading from API
- Production/TestFlight builds broken
- Threshold alerts disabled
- Some edge cases in quantity validation

### Next Session Priorities
1. **Fix movement history loading** - Debug API response parsing
2. **Resolve TestFlight build** - Either fix Xcode archive or switch to EAS
3. **Test end-to-end flow** - With real Google Sheets data

---

## Developer Notes

### Debug Commands
```bash
# View Metro bundler logs
npx expo start --verbose

# Check pod installation
cd ios && pod install

# Clean build
rm -rf ios/build ios/Pods ios/Podfile.lock
cd ios && pod install

# Type check
yarn typecheck
```

### Google Apps Script
- URL: `https://script.google.com/macros/s/AKfycbxe0LlgIdgIJlblpIBcRN-lv3p5gn3lqDSgqCbI0r5uxbo7zW0hGBMQWH7IUoG6WnIygQ/exec`
- To update: Edit `GoogleAppsScript.code.js` and redeploy in script.google.com

### Environment Variables
- `EXPO_PUBLIC_GOOGLE_SHEETS_API_KEY`: In app.json
- `EXPO_PUBLIC_GOOGLE_SHEETS_ID`: In app.json

---

---

## Recent Changes (2026-05-07)

### Distributed Column Feature (Morning Session)

#### Overview
Added a new "Distributed" column to track trays that have been served to buffet (Buffet Lanes). This is a calculated field, not a stored location.

#### Type Changes (`dashboard.types.ts`)
- Added `'distributed'` to `DashboardStage` union type
- Added to `ALL_STAGES` array (positioned after `left_over`)
- Added `distributed_qty: number` to `DashboardItem` interface
- Added to `getStageQuantity()` qtyMap
- Movement rules: `distributed` has empty arrays (no movements from/to calculated stage)
- Added `STAGE_THEME` for distributed: teal/green (#E0F2F1 background, #00695C color)
- Added to Team 1 (Kitchen) stages: `['planned', 'cooked', 'distributed', 'stored']`

#### Dashboard Changes (`PrasadamDashboardScreen.tsx`)
- **Calculation**: `distributed_qty = Cooked - Served`
  - Only counts trays actually served to Buffet Lanes
  - Trays in Stored/Staging/Refill Stations are NOT counted as "Distributed" yet
  - They will eventually move to Buffet Lanes or Left Over
- **Added to `buildDashboardItems()`**: Calculates `distributed_qty` for each item
- **Added to `stageToLocation()`**: Returns `null` (calculated field, not in backend)
- **Updated `getStageQuantity()` local function**: Includes `distributed` mapping

#### Inventory Validation Warnings
- **Warning Logic**: Triggers when `(Stored + Staging + Refill 1/2/3 + Served) > Cooked`
- **Warning UI**: Yellow/orange bar below header showing count of problematic items
- **"View Details" Button**: Opens Alert with full list of items exceeding Cooked
- **Message Format**: `"{item}: {tracked} tracked vs {cooked} cooked (excess: {excess})"`
- **State**: `inventoryWarnings` string array

#### UI Components
- Warning bar with icon, count message, and details button
- Styles: `warningBar`, `warningText`, `warningDetailsBtn`, `warningDetailsText`
- Colors: #FFF8E1 background, #F57C00 text (amber/orange theme)

#### Column Position
- In "All Stages" view: Distributed appears **after Left Over** (at the end)
- In Kitchen team view: Distributed appears after Cooked (explicitly defined in `team1_kitchen.stages`)

#### Rationale
- **Cooked** is cumulative (never decreases)
- **Served** = trays actually distributed to attendees at buffet
- **Distributed** = Cooked - Served = trays that came from kitchen but not yet served
- Trays in intermediate stages (Stored/Staging/Refill) will later become Served or Left Over

#### Code Snippets

**Calculation in `buildDashboardItems()`:**
```typescript
const cooked = menuItem.ready_trays;
const served = invRecord?.served || 0;
// Distributed = Cooked - Served (Buffet Lanes only)
const distributed = Math.max(0, cooked - served);
```

**Warning Check:**
```typescript
const trackedInventory = item.stored_qty + item.staging_qty +
  item.refill_station_1_qty + item.refill_station_2_qty +
  item.refill_station_3_qty + item.served_qty;
if (trackedInventory > item.cooked_qty) {
  warnings.push(`${item.name}: ${trackedInventory} tracked vs ${item.cooked_qty} cooked`);
}
```

---

### Bug Fixes (Afternoon Session)

#### Quick Select Buttons - Increment Fix
**Files:** `QuantityMovePopup.tsx`, `QuantityMoveReversePopup.tsx`

**Problem:** Quick select buttons (+2, +3, +4, +5, +10, +20) were setting quantity to that value instead of incrementing.

**Solution:**
```typescript
const handleQuickSelect = useCallback((amount: number) => {
  const current = parseInt(quantity, 10) || 0;
  const newQty = Math.min(currentQty, current + amount);  // Cap at available trays
  setQuantity(newQty.toString());
}, [quantity, currentQty]);
```

#### Default Quantity and Auto-Select Destination
**File:** `QuantityMovePopup.tsx`

**Problems:**
1. Move button grayed out with quantity 0 (initial state)
2. Destination not auto-selecting for single-option stages (e.g., Cooked → Stored)

**Solutions:**
1. Changed default quantity from `'0'` to `'1'`
2. Added `visible` to useEffect dependency to ensure auto-select runs when popup opens
3. Only set destination when `visible === true`

```typescript
// Default quantity
const [quantity, setQuantity] = useState('1');

// Auto-select with visible check
useEffect(() => {
  if (visible) {
    if (validDestinations.length === 1) {
      setSelectedStage(validDestinations[0]);
    } else if (currentStage === 'staging' && lastDestination) {
      setSelectedStage(lastDestination);
    }
  }
}, [visible, validDestinations, currentStage, lastDestination]);
```

#### Version Bump
**File:** `app.json`

- Updated to version 2.2.9 (23)
- iOS buildNumber: 22 → 23
- Android versionCode: 26 → 27

---

**End of Progress Document**
