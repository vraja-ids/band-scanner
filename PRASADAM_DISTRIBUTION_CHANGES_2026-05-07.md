# Prasadam Distribution - All Changes 2026-05-07

**Comparison Date:** 2026-05-07
**Baseline Commit:** `39c3262` (feat: add Prasadam Distribution multi-team tracking)
**Total Changes:** 5 files, 444 insertions(+), 92 deletions(-)

---

## Summary of Changes

### Working Directory vs Last Commit (39c3262)

| File | Additions | Deletions | Net Change |
|------|-----------|-----------|------------|
| `PrasadamDashboardScreen.tsx` | +412 | -78 | +334 |
| `types/dashboard.types.ts` | +19 | -2 | +17 |
| `components/PowerBall.tsx` | +9 | -10 | -1 |
| `components/QuantityMovePopup.tsx` | +2 | -2 | 0 |
| `services/PrasadamSheetsService.ts` | +2 | 0 | +2 |

---

## File-by-File Changes

### 1. `PrasadamDashboardScreen.tsx` (+334 lines)

#### New Imports
```typescript
import { useNavigation } from '@react-navigation/native';
import { getString } from '../../storage/Session';
import { getMeals, updateMenuItem } from '../../services/PrasadamSheetsService';
import { QuantityMoveReversePopup } from './components/QuantityMoveReversePopup';
import { MealSelectionModal } from './components/MealSelectionModal';
import type { Meal } from '../../services/PrasadamSheetsService';
```

#### New State Variables
```typescript
const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
const [showMealModal, setShowMealModal] = useState(false);
const [isLoadingMeals, setIsLoadingMeals] = useState(false);
const [eventId, setEventId] = useState<string | null>(null);
const [inventoryWarnings, setInventoryWarnings] = useState<string[]>([]);
```

#### New Functions

**`stageToLocation()` - Updated mapping:**
```typescript
// OLD: Used 'ready_trays' and 'kitchen' strings
// NEW: Uses null for calculated fields, proper location names
const map: Record<DashboardStage, string | null> = {
  'planned': null,    // Uses MenuItem.planned_trays
  'cooked': null,     // Uses MenuItem.ready_trays
  'distributed': null, // NEW: Calculated field
  'stored': 'Kitchen',
  'staging': 'Staging',
  'refill_station_1': 'Refill 1',
  'refill_station_2': 'Refill 2',
  'refill_station_3': 'Refill 3',
  'served': 'Served',
  'left_over': 'Left Over',
};
```

**`buildDashboardItems()` - Now calculates distributed_qty:**
```typescript
// NEW: Calculate distributed quantity
const cooked = menuItem.ready_trays;
const served = invRecord?.served || 0;
const distributed = Math.max(0, cooked - served);

items.push({
  // ...
  distributed_qty: distributed,  // NEW field
  // ...
});
```

**`loadData()` - Added inventory warnings:**
```typescript
// NEW: Check for inventory > cooked
const warnings: string[] = [];
for (const item of dashboardItems) {
  const trackedInventory = item.stored_qty + item.staging_qty +
    item.refill_station_1_qty + item.refill_station_2_qty +
    item.refill_station_3_qty + item.served_qty;
  if (trackedInventory > item.cooked_qty) {
    warnings.push(`${item.name}: ${trackedInventory} tracked vs ${item.cooked_qty} cooked (excess: ${trackedInventory - item.cooked_qty})`);
  }
}
setInventoryWarnings(warnings);
```

**New handlers:**
- `handleOpenMealSwitcher()` - Opens meal selection modal
- `handleMealSwitch()` - Switches to different meal, persists selection

**Updated `handleMove()` - Three movement cases:**
1. Planned → Cooked: Updates `MenuItem.ready_trays` only
2. Cooked → Stored: Adds to Kitchen location, doesn't reduce ready_trays (cumulative)
3. Location movements: Subtract from source, add to destination

**New `handleReverseMove()` - Correction logic:**
- Cooked → Planned: Reduces ready_trays for over-reporting correction
- Location reverses: Standard subtract/add

#### UI Changes

**Warning Bar (NEW):**
```tsx
{inventoryWarnings.length > 0 && (
  <View style={styles.warningBar}>
    <Ionicons name="warning" size={16} color="#FF9800" />
    <Text style={styles.warningText}>
      Inventory exceeds Cooked for {inventoryWarnings.length} items
    </Text>
    <TouchableOpacity onPress={() => Alert.alert('Inventory Warnings', inventoryWarnings.join('\n'))}>
      <Text style={styles.warningDetailsText}>View Details</Text>
    </TouchableOpacity>
  </View>
)}
```

**Top Bar - Meal selector:**
```tsx
<TouchableOpacity style={styles.mealSelector} onPress={handleOpenMealSwitcher}>
  <Ionicons name="restaurant-outline" size={16} color="#2196F3" />
  <Text style={styles.mealName}>{mealName || 'Loading...'}</Text>
  <Ionicons name="chevron-down" size={14} color="#666" />
</TouchableOpacity>
```

**Team View Selector:**
```tsx
{(['all', 'team1_kitchen', 'team2_staging', 'team3_serving'] as TeamView[]).map(view => (
  <TouchableOpacity key={view} onPress={() => setTeamView(view)}>
    <Text>{TEAM_VIEW_CONFIGS[view].shortName}</Text>
  </TouchableOpacity>
))}
```

#### New Styles
```typescript
warningBar: { flexDirection: 'row', backgroundColor: '#FFF8E1', ... },
warningText: { flex: 1, fontSize: 12, color: '#F57C00', ... },
warningDetailsBtn: { paddingHorizontal: 10, backgroundColor: '#FFE082', ... },
warningDetailsText: { fontSize: 11, fontWeight: '600', color: '#F57C00' },
mealSelector: { flexDirection: 'row', gap: 6, ... },
mealName: { fontSize: 13, fontWeight: '600', color: '#2196F3' },
teamViewSelector: { flexDirection: 'row', gap: 6 },
teamViewBtn: { paddingHorizontal: 10, paddingVertical: 5, ... },
teamViewText: { fontSize: 11, fontWeight: '600', ... },
```

---

### 2. `types/dashboard.types.ts` (+17 lines)

#### New Type: 'distributed'
```typescript
export type DashboardStage =
  | 'planned'
  | 'cooked'
  | 'distributed'     // NEW
  | 'stored'
  // ...
```

#### ALL_STAGES - Reordered
```typescript
export const ALL_STAGES: DashboardStage[] = [
  'planned',
  'cooked',
  'stored',
  'staging',
  // ...
  'left_over',
  'distributed',     // NEW: Moved to end
];
```

#### Movement Rules
```typescript
export const MOVEMENT_RULES: Record<DashboardStage, DashboardStage[]> = {
  // ...
  distributed: [], // NEW: Calculated stage, no movements
  // ...
};

export const REVERSE_MOVEMENT_RULES: Record<DashboardStage, DashboardStage[]> = {
  // ...
  distributed: [], // NEW: Calculated stage, no movements
  // ...
};
```

#### Display Names
```typescript
export const STAGE_DISPLAY_NAMES: Record<DashboardStage, string> = {
  // ...
  distributed: 'Distributed',  // NEW
  // ...
};
```

#### Team View Config
```typescript
team1_kitchen: {
  stages: ['planned', 'cooked', 'distributed', 'stored'],  // Added 'distributed'
}
```

#### DashboardItem Interface
```typescript
export interface DashboardItem {
  // ...
  distributed_qty: number;  // NEW
  // ...
}
```

#### getStageQuantity Mapping
```typescript
const qtyMap: Record<DashboardStage, keyof DashboardItem> = {
  // ...
  distributed: 'distributed_qty',  // NEW
  // ...
};
```

#### Stage Theme
```typescript
export const STAGE_THEMES: Record<DashboardStage, StageTheme> = {
  // ...
  distributed: {
    background: '#E0F2F1',
    color: '#00695C',
    borderColor: '#B2DFDB',
    iconColor: '#009688',
  },
  // ...
};
```

---

### 3. `components/PowerBall.tsx` (-1 line)

Minor code style adjustment (likely whitespace or formatting).

---

### 4. `components/QuantityMovePopup.tsx` (0 net change)

Minor code style adjustment (+2 -2).

---

### 5. `services/PrasadamSheetsService.ts` (+2 lines)

Added Meal type support (likely just type export or minor addition).

---

## New Components Added (Not in Git)

These components are referenced but may be new files:

1. **`QuantityMoveReversePopup.tsx`** - Long-press popup for reverse movements
2. **`MealSelectionModal.tsx`** - Modal for switching between meals

---

## Key Behavioral Changes

### 1. Cooked is Now Cumulative
- **Before:** `ready_trays` decreased when moving to stored
- **After:** `ready_trays` never decreases (tracks total cooked)
- Movement to Kitchen storage only adds to location, doesn't reduce ready_trays

### 2. New "Distributed" Column
- Shows `Cooked - Served` = trays not yet at buffet
- Read-only column (no movements allowed)
- Appears after Left Over in "All" view, after Cooked in "Kitchen" view

### 3. Inventory Validation
- Warns when tracked inventory exceeds cooked amount
- Visual warning bar below header
- "View Details" shows specific problematic items

### 4. Meal Switching
- Can switch between meals without leaving dashboard
- Selection persisted per event
- Auto-loads last selected meal

### 5. Team View Toggle
- Quick filter: All, Kitchen, Staging, Serving
- Each view shows only relevant stages

---

## Data Flow Changes

### Before (Commit 39c3262)
```
Planned → Cooked → Stored → Staging → Refill → Served → Left Over
(Cooked decreased when moving to Stored)
```

### After (Working Directory)
```
Planned → Cooked (cumulative) → Stored → Staging → Refill → Served → Left Over
                               ↓
                         Distributed (calculated: Cooked - Served)
```

---

## Backward Compatibility Notes

1. **Google Sheets:** No schema changes required
2. **API:** `distributed` is calculated client-side only
3. **Existing data:** All trays already tracked remain valid
4. **Movement history:** No changes to TRANSFERS tab format

---

## Testing Checklist for New Features

- [ ] Distributed column displays correct calculation
- [ ] Warning bar appears when inventory > cooked
- [ ] Meal switching loads correct data
- [ ] Team view toggle shows correct stages
- [ ] Reverse movement (long press) works for all stages
- [ ] Cooked quantity never decreases on movements
- [ ] "View Details" shows all warning messages

---

## Latest Updates (2026-05-07 Later Session)

### Bug Fixes

#### 1. Quick Select Buttons - Increment Behavior
**File:** `components/QuantityMovePopup.tsx`, `components/QuantityMoveReversePopup.tsx`

**Issue:** Quick select buttons (+2, +3, +4, +5, +10, +20) were setting quantity to the amount instead of incrementing.

**Fix:**
```typescript
// Before: setQuantity(amount.toString());
// After:
const handleQuickSelect = useCallback((amount: number) => {
  const current = parseInt(quantity, 10) || 0;
  const newQty = Math.min(currentQty, current + amount);
  setQuantity(newQty.toString());
}, [quantity, currentQty]);
```

#### 2. Default Quantity and Auto-Select Destination
**File:** `components/QuantityMovePopup.tsx`

**Issue:** 
- Move button was grayed out when quantity was 0
- Destination wasn't auto-selecting for single-option stages

**Fix:**
- Changed default quantity from '0' to '1'
- Added `visible` to useEffect dependency to ensure auto-select runs when popup opens
- Only set destination when `visible === true`

```typescript
// Default quantity
const [quantity, setQuantity] = useState('1');

// Auto-select fix
useEffect(() => {
  if (visible) {
    if (validDestinations.length === 1) {
      setSelectedStage(validDestinations[0]);
    }
    // ...
  }
}, [visible, validDestinations, currentStage, lastDestination]);
```

#### 3. Reverse Popup Same Fix
**File:** `components/QuantityMoveReversePopup.tsx`

Applied same fixes: default quantity '1' and increment behavior for quick select.

---

**End of Comparison Document**
