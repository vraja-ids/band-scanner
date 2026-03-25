import React, { useEffect, useRef } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { getString, Keys } from '../storage/Session';
import { getDaypassActivityStats } from '../journey/Daypass/DaypassViewModel';
import type { GetDaypassActivityStatsRequest } from '../journey/Daypass/models/api';
import { storeStatsSnapshot } from '../utils/StatsStorage';

/**
 * Background service that periodically fetches activity stats and stores snapshots.
 * This runs as long as the app is open, ensuring the chart always has fresh data.
 *
 * Key features:
 * - Fetches every 5 minutes when app is active
 * - Checks every 30 seconds if it's time to fetch (recovers from lock/suspend)
 * - Handles AppState changes robustly
 * - Only runs when user is logged in (has event selected)
 */
export const BackgroundStatsService: React.FC = () => {
  const mainIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const checkIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const heartbeatRef = useRef<NodeJS.Timeout | null>(null);
  const fetchInProgressRef = useRef(false);
  const lastFetchTimeRef = useRef<number>(Date.now());
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  const fetchAndStoreStats = async (source: string = 'timer') => {
    // Prevent overlapping fetches
    if (fetchInProgressRef.current) {
      return;
    }

    // Check if enough time has passed (minimum 30 seconds between fetches)
    const timeSinceLastFetch = (Date.now() - lastFetchTimeRef.current) / 1000;
    if (source === 'periodic-check' && timeSinceLastFetch < 30) {
      return; // Silent skip
    }

    try {
      fetchInProgressRef.current = true;
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[BackgroundStatsService] 🔄 Fetching... (${source}, ${timeSinceLastFetch.toFixed(0)}s ago)`);

      // Check if user is logged in (has event selected)
      const selectedEventId = await getString('selectedEventId');
      const internalMemberId = await getString(Keys.INTERNAL_MEMBER_ID);

      if (!selectedEventId || !internalMemberId) {
        console.log('[BackgroundStatsService] 🔒 Not logged in');
        return;
      }

      // Get today's date
      const todayLocal = new Date();
      const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;

      // Fetch activity stats
      const request: GetDaypassActivityStatsRequest = {
        eventId: selectedEventId,
        activity: 'entrance-gate',
        date: todayStr,
        scannerMemberId: internalMemberId,
      };

      const response = await getDaypassActivityStats(request);

      if (response.status === 'success' && response.data) {
        const data = response.data as any;

        if (data.activityStats && Array.isArray(data.activityStats)) {
          await storeStatsSnapshot(data.activityStats);
          lastFetchTimeRef.current = Date.now();
          console.log(`[BackgroundStatsService] ✅ Success at ${timestamp}`);
        } else {
          console.log('[BackgroundStatsService] ⚠️ No activityStats');
        }
      } else {
        console.log(`[BackgroundStatsService] ❌ API: ${response.status}`);
      }
    } catch (error) {
      console.error('[BackgroundStatsService] ❌ Error:', error);
    } finally {
      fetchInProgressRef.current = false;
    }
  };

  useEffect(() => {
    const mountTime = new Date().toLocaleTimeString();
    console.log(`[BackgroundStatsService] 🚀 MOUNTED at ${mountTime}`);

    // Initial fetch
    fetchAndStoreStats('init');

    // Main interval: every 1 minute (60 seconds)
    mainIntervalRef.current = setInterval(() => {
      if (appStateRef.current === 'active') {
        fetchAndStoreStats('main-timer');
      }
    }, 60 * 1000);

    // Backup check: every 30 seconds (helps recover from suspend)
    checkIntervalRef.current = setInterval(() => {
      if (appStateRef.current === 'active') {
        const timeSinceLastFetch = (Date.now() - lastFetchTimeRef.current) / 1000;
        if (timeSinceLastFetch > 60) { // 1 minute
          fetchAndStoreStats('periodic-check');
        }
      }
    }, 30 * 1000);

    // Heartbeat: log every minute to verify service is running
    heartbeatRef.current = setInterval(() => {
      const timeSinceLastFetch = (Date.now() - lastFetchTimeRef.current) / 1000;
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[BackgroundStatsService] 💓 Alive (${appStateRef.current}), last fetch: ${timeSinceLastFetch.toFixed(0)}s ago at ${timestamp}`);
    }, 60 * 1000);

    console.log('[BackgroundStatsService] ⏰ Timers started (1min + 30s check + 1min heartbeat)');

    // AppState change handler
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      const prev = appStateRef.current;
      appStateRef.current = nextAppState;
      const timestamp = new Date().toLocaleTimeString();
      console.log(`[BackgroundStatsService] 📱 AppState: ${prev} → ${nextAppState} (${timestamp})`);

      if (nextAppState === 'active') {
        // App came to foreground
        const timeSinceLastFetch = (Date.now() - lastFetchTimeRef.current) / 1000;
        console.log(`[BackgroundStatsService] ⏰ ${timeSinceLastFetch.toFixed(0)}s since last fetch`);

        // Fetch if it's been more than 30 seconds
        if (timeSinceLastFetch > 30) {
          fetchAndStoreStats('foreground');
        }
      }
    };

    // Add AppState listener
    const subscription = AppState.addEventListener('change', handleAppStateChange);

    // Cleanup
    return () => {
      const unmountTime = new Date().toLocaleTimeString();
      console.log(`[BackgroundStatsService] 🛑 UNMOUNTED at ${unmountTime}`);
      if (mainIntervalRef.current) {
        clearInterval(mainIntervalRef.current);
        console.log('[BackgroundStatsService] ✓ Main timer cleared');
      }
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current);
        console.log('[BackgroundStatsService] ✓ Check timer cleared');
      }
      if (heartbeatRef.current) {
        clearInterval(heartbeatRef.current);
        console.log('[BackgroundStatsService] ✓ Heartbeat cleared');
      }
      subscription.remove();
      console.log('[BackgroundStatsService] ✓ AppState listener removed');
    };
  }, []);

  return null;
};

export default BackgroundStatsService;
