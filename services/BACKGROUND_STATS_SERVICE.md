# Background Stats Service

## Overview
A background service that periodically fetches activity stats and stores snapshots, ensuring the Inflow Comparison chart always has fresh today's data.

## Architecture Changes

### Before (Screen-Level Auto-Refresh)
```
┌─────────────────────────────────────┐
│  InflowComparisonScreen             │
│  ├─ useEffect (auto-refresh)        │
│  │   └─ Runs every 5 minutes        │
│  │   └─ ONLY when screen is mounted │
│  └─ Problem: Gaps in data when      │
│              navigating away         │
└─────────────────────────────────────┘
```

### After (App-Level Background Service)
```
┌─────────────────────────────────────┐
│  App.tsx                            │
│  └─ <BackgroundStatsService />      │
│      ├─ Runs every 5 minutes        │
│      ├─ Runs as long as app is open │
│      ├─ Checks if user is logged in │
│      └─ Persists data in storage    │
└─────────────────────────────────────┘
           │
           ↓ stores snapshots
┌─────────────────────────────────────┐
│  AsyncStorage                      │
│  └─ statsSnapshots                 │
└─────────────────────────────────────┘
           │
           ↓ reads on focus
┌─────────────────────────────────────┐
│  InflowComparisonScreen             │
│  └─ navigation.addListener('focus') │
│      └─ Reloads from storage        │
└─────────────────────────────────────┘
```

## Benefits

✅ **Continuous Data Collection**: Runs regardless of which screen is open
✅ **No Data Gaps**: Background service updates every 5 minutes
✅ **Always Fresh Data**: Chart shows latest data when navigated to
✅ **Simple Integration**: Just add `<BackgroundStatsService />` to App.tsx
✅ **Smart Fetching**: Only runs when user is logged in (has event selected)
✅ **AppState Aware**: Pauses when app is backgrounded, resumes on foreground
✅ **Clean Separation**: Background logic separated from UI logic

## How It Works

### 1. Background Service (`services/BackgroundStatsService.tsx`)
```typescript
- Mounts when app starts
- Checks if user is logged in (has selectedEventId)
- Fetches activity stats every 5 minutes
- Stores snapshots to AsyncStorage
- Pauses when app goes to background
- Resumes when app comes to foreground
- Cleans up on unmount
```

### 2. Chart Screen (`InflowComparisonScreen.tsx`)
```typescript
- Fetches fresh data on initial mount (immediate data)
- Listens for navigation 'focus' events
- Reloads snapshots from storage on focus
- Background service keeps storage updated
```

## Key Features

### Smart Fetching
- Only runs when user has selected an event (logged in)
- Silently skips fetch if not logged in
- Prevents overlapping fetches with `fetchInProgressRef`

### AppState Handling
- Detects app foreground/background transitions
- Fetches immediately when app comes to foreground
- Respects 5-minute interval between fetches

### Memory Management
- Uses `useRef` for interval and fetch flags
- Properly cleans up interval on unmount
- Removes AppState listener on unmount

## Files Changed

1. **NEW**: `services/BackgroundStatsService.tsx` - Background service component
2. **MODIFIED**: `App.tsx` - Added `<BackgroundStatsService />`
3. **MODIFIED**: `InflowComparisonScreen.tsx` - Removed screen-level auto-refresh, added focus listener

## Usage

The background service automatically runs when the app is open. No manual configuration needed.

To manually refresh (get absolute latest data):
- Tap the refresh button on the chart screen
- This fetches immediately and updates the chart

## Performance Considerations

- **Network**: One API call every 5 minutes (when app is active and user is logged in)
- **Storage**: Writes to AsyncStorage (very fast)
- **Memory**: Minimal - only refs and listeners
- **Battery**: Efficient - respects app state and won't run in background

## Future Enhancements

Possible improvements:
1. Add exponential backoff for failed requests
2. Add local notification when significant data updates occur
3. Add configuration for refresh interval
4. Add analytics to track fetch success/failure rates
