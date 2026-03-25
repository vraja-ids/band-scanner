# Refactor Progress Tracker

## Completed ✅

### Phase 1: Event Configuration System
- [x] Created `config/events.ts` with event configuration interface
- [x] Created `hooks/useEventConfig.ts` hook for accessing event config
- [x] Created folder structure: `journey/Scan/`, `journey/Stats/`, `journey/Redemption/`, `config/`

## In Progress 🔄

### Phase 2: Move & Refactor Scan Screen
**Current File**: `journey/RishikeshKirtanFest/RishikeshKirtanScanScreen.tsx`
**New File**: `journey/Scan/ScanScreen.tsx`

**Status**: File copied, needs refactoring

**Required Changes**:
1. Import event config
2. Use `useEventConfig()` hook
3. Replace hardcoded event name in logs
4. Make colors configurable via event config
5. Remove "RishikeshKirtan" from screen name

### Phase 3: Update Routes
**Files to update**:
- `routes/index.ts` - Add new routes
- `App.tsx` - Update imports
- Remove old RishikeshKirtanFest routes after migration

---

## Next Steps

1. ✅ Create config/events.ts - DONE
2. ✅ Create hooks/useEventConfig.ts - DONE
3. ✅ Create folder structure - DONE
4. 🔄 Refactor ScanScreen.tsx - IN PROGRESS
5. ⏳ Move ActivityStatsScreen.tsx
6. ⏳ Move RedemptionSuccessScreen.tsx
7. ⏳ Move InflowComparisonScreen.tsx
8. ⏳ Update all routes
9. ⏳ Test everything
10. ⏳ Remove old RishikeshKirtanFest folder

---

## Files Created So Far

- `/config/events.ts` - Event configuration
- `/hooks/useEventConfig.ts` - Event config hook
- `/journey/Scan/ScanScreen.tsx` - Copied (needs refactoring)

## Files Still To Move

- `journey/RishikeshKirtanFest/InflowComparisonScreen.tsx`
- `journey/RishikeshKirtanFest/RishikeshKirtanActivityStatsScreen.tsx`
- `journey/RishikeshKirtanFest/RishikeshKirtanRedeemSuccessScreen.tsx`

---

## Estimated Work Remaining

- Refactor ScanScreen.tsx: ~1-2 hours
- Move & refactor ActivityStats: ~1 hour
- Move & refactor RedemptionSuccess: ~1 hour
- Move & refactor InflowComparison: ~2 hours (most complex)
- Update routes & test: ~2 hours

**Total Remaining**: ~7-9 hours
