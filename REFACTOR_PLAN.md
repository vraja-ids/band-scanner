# Refactor Plan: Event-Agnostic Architecture

## Current Issue
Event-specific code is scattered in `journey/RishikeshKirtanFest/` folder, breaking the clean architectural pattern. This makes the app hard to maintain for multiple events.

## Proposed Solution
Move to event-agnostic architecture with configuration-driven behavior.

---

## Phase 1: Create Event Configuration System

### 1.1 Create Event Config File
**File**: `config/events.ts`

```typescript
export interface EventConfig {
  id: string;
  name: string;
  displayName: string;
  primaryColor: string;
  features: {
    hasInflowComparison: boolean;
    hasActivityStats: boolean;
    hasBusRedemption: boolean;
    hasPrasadamRedemption: boolean;
    hasWalkinCheckin: boolean;
  };
  schedule: {
    startTime: string; // "16:30"
    endTime: string;   // "23:30"
    dates: string[];   // Event dates
  };
  googleSheets?: {
    sheetId?: string;
    apiKey?: string;
    range?: string;
  };
}

export const EVENTS: Record<string, EventConfig> = {
  RISHIKESH_KIRTAN_FEST: {
    id: 'RishikeshKirtanFest2026',
    name: 'RishikeshKirtanFest',
    displayName: 'Rishikesh Kirtan Fest',
    primaryColor: '#4CAF50',
    features: {
      hasInflowComparison: true,
      hasActivityStats: true,
      hasBusRedemption: false,
      hasPrasadamRedemption: false,
      hasWalkinCheckin: true,
    },
    schedule: {
      startTime: '16:30',
      endTime: '23:30',
      dates: ['2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14', '2026-03-15', '2026-03-16'],
    },
    googleSheets: {
      sheetId: '1OrrbYWPnTcup30nI3vh0mEDRzi9fztrEvhBwuE_cxBc',
      apiKey: 'AIzaSyCXzeWuFPxmWsiXOE1Kl84XX9GTFUU1gVI',
      range: 'Sheet1!A:E',
    },
  },
  // Future events can be added here
};
```

---

## Phase 2: Folder Structure Refactor

### Current Structure (Problematic)
```
journey/
├── Daypass/                    (Generic)
├── RishikeshKirtanFest/        (Event-specific - WRONG)
│   ├── InflowComparisonScreen.tsx
│   ├── RishikeshKirtanActivityStatsScreen.tsx
│   ├── RishikeshKirtanRedeemSuccessScreen.tsx
│   └── RishikeshKirtanScanScreen.tsx
├── Home/
├── common/
```

### Proposed Structure
```
journey/
├── Scan/                       (NEW - Generic scanning)
│   └── ScanScreen.tsx
├── Stats/                      (NEW - All stats/charts)
│   ├── InflowComparisonScreen.tsx
│   └── ActivityStatsScreen.tsx
├── Redemption/                 (NEW - All redemption flows)
│   ├── RedemptionSuccessScreen.tsx
│   ├── BusRedemptionScreen.tsx
│   └── PrasadamRedemptionScreen.tsx
├── Daypass/                    (Keep - Generic daypass)
├── Home/                       (Keep)
├── common/                     (Keep)
└── [Other folders]
```

---

## Phase 3: File Moves & Merges

### 3.1 Scan Screens
**Move**: `journey/RishikeshKirtanFest/RishikeshKirtanScanScreen.tsx`
**To**: `journey/Scan/ScanScreen.tsx`

**Changes**:
- Remove hardcoded event ID
- Use event config from selected event
- Make UI configurable (colors, labels, etc.)

### 3.2 Activity Stats
**Merge**: `journey/RishikeshKirtanFest/RishikeshKirtanActivityStatsScreen.tsx`
**Into**: `journey/Stats/ActivityStatsScreen.tsx` (replace existing or merge)

**Changes**:
- Make it event-agnostic
- Show different sections based on event features
- Use event config for labels/colors

### 3.3 Redemption Success
**Merge**: `journey/RishikeshKirtanFest/RishikeshKirtanRedeemSuccessScreen.tsx`
**Into**: `journey/Redemption/RedemptionSuccessScreen.tsx`

**Changes**:
- Unify success/failure screens
- Make them event-configurable
- Support all redemption types (bus, prasadam, entrance)

### 3.4 Inflow Comparison
**Move**: `journey/RishikeshKirtanFest/InflowComparisonScreen.tsx`
**To**: `journey/Stats/InflowComparisonScreen.tsx`

**Changes**:
- Make it completely event-agnostic
- Use event config for schedule (16:30 to 23:30)
- Load Google Sheets data based on event config

---

## Phase 4: Routes & Navigation Updates

### Update routes/index.tsx
```typescript
// Remove event-specific routes
- Routes.RishikeshKirtanScan
- Routes.RishikeshKirtanRedeemSuccess
- Routes.RishikeshKirtanActivityStats
- Routes.InflowComparison

// Add generic routes
+ Routes.Scan
+ Routes.RedemptionSuccess
+ Routes.ActivityStats
+ Routes.InflowComparison
```

### Update App.tsx
```typescript
// Remove event-specific imports
- import RishikeshKirtanScanScreen from './journey/RishikeshKirtanFest/RishikeshKirtanScanScreen';
- import InflowComparisonScreen from './journey/RishikeshKirtanFest/InflowComparisonScreen';

// Add generic imports
+ import ScanScreen from './journey/Scan/ScanScreen';
+ import InflowComparisonScreen from './journey/Stats/InflowComparisonScreen';
```

---

## Phase 5: Configuration Loading

### Create Event Context/Hook
**File**: `hooks/useEventConfig.ts`

```typescript
import { useState, useEffect } from 'react';
import { getString } from '../storage/Session';
import { EVENTS, EventConfig } from '../config/events';

export const useEventConfig = (): EventConfig | null => {
  const [eventConfig, setEventConfig] = useState<EventConfig | null>(null);

  useEffect(() => {
    const loadEventConfig = async () => {
      const eventId = await getString('selectedEventId');
      if (!eventId) return;

      const config = Object.values(EVENTS).find(e => e.id === eventId);
      setEventConfig(config || null);
    };

    loadEventConfig();
  }, []);

  return eventConfig;
};
```

---

## Implementation Steps

1. **Step 1**: Create `config/events.ts`
2. **Step 2**: Create new folder structure (`Scan/`, `Stats/`, `Redemption/`)
3. **Step 3**: Move & refactor files (one at a time)
4. **Step 4**: Update routes and navigation
5. **Step 5**: Test thoroughly with existing event
6. **Step 6**: Remove old `RishikeshKirtanFest/` folder

---

## Benefits

✅ **Event-Agnostic**: Easy to add new events
✅ **Clean Architecture**: Follows established patterns
✅ **Maintainable**: No duplicate code
✅ **Scalable**: Configuration-driven behavior
✅ **Testable**: Generic screens easier to test

---

## Questions for Review

1. **Should we maintain backward compatibility** for existing users?
2. **Do we want to support multiple events simultaneously** in the future?
3. **Should activity stats be event-specific** or combined across events?
4. **What about event-specific Google Sheets data?** Should we have separate sheets or one combined?

---

## Effort Estimate

- Phase 1 (Config): 2-3 hours
- Phase 2 (Folders): 1 hour
- Phase 3 (Moves): 4-6 hours
- Phase 4 (Routes): 2-3 hours
- Phase 5 (Context): 1-2 hours

**Total**: 10-15 hours of work

---

## Risk Assessment

**Low Risk**:
- Moving files is straightforward
- Configuration system is simple

**Medium Risk**:
- Navigation changes need thorough testing
- Merging screens requires careful testing
- Need to ensure all event-specific features are captured in config

**Mitigation**:
- Do it incrementally (one screen at a time)
- Test thoroughly after each move
- Keep old files until fully migrated
- Use feature flags to roll out changes
