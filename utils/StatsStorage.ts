import AsyncStorage from '@react-native-async-storage/async-storage';

const STORAGE_KEY = 'statsSnapshots';

// Get current time in IST (UTC+5:30)
const getISTTime = () => {
  const now = new Date();
  // Convert to IST (UTC+5:30 = 5.5 hours)
  const istOffset = 5.5 * 60 * 60 * 1000; // milliseconds
  const istTime = new Date(now.getTime() + istOffset);

  return istTime;
};

// Get current date in IST in YYYY-MM-DD format
const getLocalDate = (date: Date) => {
  // Get the IST offset (UTC+5:30)
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(date.getTime() + istOffset);

  // Use UTC methods on the adjusted time to get IST date
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

export interface StatsSnapshot {
  timestamp: string;        // ISO timestamp when snapshot was taken
  date: string;             // YYYY-MM-DD
  timeSlot: string;         // HH:MM (5-min slot)
  indian: {
    qr: number;
    walkin: number;
    total: number;
  };
  international: {
    qr: number;
    walkin: number;
    total: number;
  };
  all: {
    total: number;          // Combined total of all guests
  };
}

// Get current 5-minute time slot in IST
export const getCurrentTimeSlot = () => {
  const istTime = getISTTime();
  const hours = istTime.getUTCHours();
  const minutes = Math.floor(istTime.getUTCMinutes() / 5) * 5;
  return `${hours.toString().padStart(2, '0')}:${minutes.toString().padStart(2, '0')}`; // "HH:MM"
};

// Extract total stats from activity stats response
export const extractTotalStats = (activityStats: any[]) => {
  let indianTotal = 0;
  let internationalTotal = 0;

  activityStats.forEach((stat) => {
    if (stat.guestType === 'indian' || stat.daypassName?.toLowerCase().includes('indian') || stat.daypassName?.includes(':')) {
      indianTotal += stat.totalCount || 0;
    } else {
      internationalTotal += stat.totalCount || 0;
    }
  });

  return {
    indian: {
      qr: 0, // Not tracked separately in snapshots
      walkin: 0,
      total: indianTotal
    },
    international: {
      qr: 0,
      walkin: 0,
      total: internationalTotal
    },
    all: {
      total: indianTotal + internationalTotal
    }
  };
};

// Store stats snapshot (only from 4:30 PM IST onwards)
export const storeStatsSnapshot = async (activityStats: any[]) => {
  try {
    const now = new Date();
    const istTime = getISTTime();
    const hour = istTime.getUTCHours();
    const minute = istTime.getUTCMinutes();
    const currentMinutes = hour * 60 + minute;
    const startMinutes = 16 * 60 + 30; // 16:30 = 4:30 PM IST

    // Only store snapshots from 4:30 PM IST onwards
    if (currentMinutes < startMinutes) {
      return;
    }

    const existingData = await AsyncStorage.getItem(STORAGE_KEY);
    const snapshots: StatsSnapshot[] = existingData ? JSON.parse(existingData) : [];

    const today = getLocalDate(now); // Use IST date
    const timeSlot = getCurrentTimeSlot();

    // Calculate totals
    const stats = extractTotalStats(activityStats);

    // Check if we already have a snapshot for this time slot today
    const existingIndex = snapshots.findIndex(
      s => s.date === today && s.timeSlot === timeSlot
    );

    const snapshot: StatsSnapshot = {
      timestamp: now.toISOString(),
      date: today,
      timeSlot,
      ...stats
    };

    if (existingIndex >= 0) {
      // Update existing snapshot
      snapshots[existingIndex] = snapshot;
    } else {
      // Add new snapshot
      snapshots.push(snapshot);
    }

    // Keep only last 2 days of snapshots
    const twoDaysAgo = new Date();
    twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);
    const filteredSnapshots = snapshots.filter(
      s => new Date(s.date) >= twoDaysAgo
    );

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSnapshots));

    console.log(`✓ Stored snapshot: ${today} ${timeSlot} - Total: ${stats.all.total}`);
  } catch (error) {
    console.error('Error storing stats snapshot:', error);
  }
};

// Get all snapshots for today
export const getTodaySnapshots = async (): Promise<StatsSnapshot[]> => {
  try {
    const existingData = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existingData) return [];

    const snapshots: StatsSnapshot[] = JSON.parse(existingData);
    const today = getLocalDate(new Date()); // Use local date, not UTC

    return snapshots
      .filter(s => s.date === today)
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  } catch (error) {
    console.error('Error getting today snapshots:', error);
    return [];
  }
};

// Get snapshots for a specific date
export const getDateSnapshots = async (date: string): Promise<StatsSnapshot[]> => {
  try {
    const existingData = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existingData) return [];

    const snapshots: StatsSnapshot[] = JSON.parse(existingData);

    return snapshots
      .filter(s => s.date === date)
      .sort((a, b) => a.timeSlot.localeCompare(b.timeSlot));
  } catch (error) {
    console.error('Error getting date snapshots:', error);
    return [];
  }
};

// Clear old snapshots (call on app launch)
// Also filters out morning snapshots, keeping only data from 4:30 PM IST onwards
export const clearOldSnapshots = async () => {
  try {
    const existingData = await AsyncStorage.getItem(STORAGE_KEY);
    if (!existingData) return;

    const snapshots: StatsSnapshot[] = JSON.parse(existingData);
    const today = getLocalDate(new Date()); // Use IST date
    const yesterday = new Date();
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = getLocalDate(yesterday); // Use IST date

    const startMinutes = 16 * 60 + 30; // 16:30 = 4:30 PM IST

    // Keep only today and yesterday, and only time slots from 4:30 PM onwards
    const filteredSnapshots = snapshots
      .filter(s => s.date === today || s.date === yesterdayStr)
      .filter(s => {
        const [hour, minute] = s.timeSlot.split(':').map(Number);
        const slotMinutes = hour * 60 + minute;
        return slotMinutes >= startMinutes;
      });

    await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(filteredSnapshots));

    console.log(`Cleared old snapshots, kept ${filteredSnapshots.length} snapshots (from 4:30 PM IST onwards only)`);
  } catch (error) {
    console.error('Error clearing old snapshots:', error);
  }
};

// Force clear all snapshots (for one-time cleanup of old UTC-dated data)
export const clearAllSnapshots = async () => {
  try {
    await AsyncStorage.removeItem(STORAGE_KEY);
    console.log('Cleared all snapshots');
  } catch (error) {
    console.error('Error clearing all snapshots:', error);
  }
};

// Parse time slot to minutes from midnight
export const parseTimeSlot = (timeSlot: string | undefined) => {
  if (!timeSlot) return 0;
  const [hours, minutes] = timeSlot.split(':').map(Number);
  return hours * 60 + minutes;
};
