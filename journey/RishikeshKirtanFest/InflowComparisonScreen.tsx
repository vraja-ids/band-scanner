import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, ScrollView, TouchableOpacity, Alert, Dimensions, AppState } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { Svg, Polyline, Line as SvgLine, Rect } from 'react-native-svg';
import { useBaseScreen } from '../common/util/useBaseScreen';
import { getString, Keys } from '../../storage/Session';
import { getDaypassActivityStats } from '../Daypass/DaypassViewModel';
import type { GetDaypassActivityStatsRequest } from '../Daypass/models/api';
import {
  getTodaySnapshots,
  clearOldSnapshots,
  clearAllSnapshots,
  storeStatsSnapshot,
  parseTimeSlot
} from '../../utils/StatsStorage';
import {
  parseGoogleSheetsData,
  generateSlotLabels
} from '../../utils/GoogleSheetsParser';
import type { StatsSnapshot } from '../../utils/StatsStorage';
import type { SlotData } from '../../utils/GoogleSheetsParser';

// Helper function to get current IST date string in YYYY-MM-DD format
const getISTDateString = () => {
  const now = new Date();
  const istOffset = 5.5 * 60 * 60 * 1000; // 5.5 hours in milliseconds
  const istTime = new Date(now.getTime() + istOffset);
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Helper function to get IST date string for a given Date object
// This adds the IST offset and returns YYYY-MM-DD
const formatDateIST = (date: Date) => {
  const istOffset = 5.5 * 60 * 60 * 1000;
  const istTime = new Date(date.getTime() + istOffset);
  const year = istTime.getUTCFullYear();
  const month = String(istTime.getUTCMonth() + 1).padStart(2, '0');
  const day = String(istTime.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
};

// Custom Line Chart Component
const CustomLineChart = ({ datasets, labels, width, height }: { datasets: any[], labels: string[], width: number, height: number }) => {
  // Map labels to their correct colors
  const getColorForLabel = (label: string) => {
    if (label.includes('Today')) return '#4CAF50';      // Green
    if (label.includes('Yesterday')) return '#2196F3'; // Blue
    if (label.includes('Avg 7 Days')) return '#FF9800'; // Orange
    if (label.includes('Last Week')) return '#9C27B0';  // Purple
    return '#999999'; // Default gray
  };

  const getStrokeWidth = (label: string) => {
    if (label.includes('Today')) return 3;  // Thicker for Today
    return 2;  // Default
  };

  const padding = { top: 20, right: 20, bottom: 40, left: 50 };
  const chartWidth = width - padding.left - padding.right;
  const chartHeight = height - padding.top - padding.bottom;

  // Find max value for Y-axis scaling
  const allValues = datasets.flatMap(d => d.data);
  const maxValue = Math.max(...allValues.filter(v => v > 0), 100);
  const yAxisMax = Math.ceil(maxValue / 100) * 100;

  // Calculate X and Y coordinates for each data point
  const getX = (index: number) => padding.left + (index / (labels.length - 1 || 1)) * chartWidth;
  const getY = (value: number) => padding.top + chartHeight - (value / yAxisMax) * chartHeight;

  // Generate grid lines
  const horizontalLines = 5;
  const gridLines = Array.from({ length: horizontalLines }, (_, i) => {
    const y = padding.top + (i / (horizontalLines - 1)) * chartHeight;
    return { y, value: Math.round(yAxisMax * (1 - i / (horizontalLines - 1))) };
  });

  // Generate X-axis labels (show only some to avoid overcrowding)
  const labelInterval = Math.max(1, Math.floor(labels.length / 8));
  const xLabels = labels.map((label, i) => {
    if (i % labelInterval !== 0) return null;
    return { label, x: getX(i) };
  }).filter(Boolean);

  // Generate polyline points for each dataset
  const polylines = datasets.map((dataset) => {
    const points = dataset.data
      .map((value: number, i: number) => {
        if (value === 0) return null;
        const x = getX(i);
        const y = getY(value);
        return `${x},${y}`;
      })
      .filter(Boolean)
      .join(' ');

    // Check if this dataset has any non-zero values
    const hasData = dataset.data && dataset.data.some((v: number) => v > 0);
    const color = getColorForLabel(dataset.label);
    const strokeWidth = getStrokeWidth(dataset.label);
    return { points, hasData, color, strokeWidth, label: dataset.label };
  });

  return (
    <View style={{ alignItems: 'center', position: 'relative' }}>
      <Svg width={width} height={height}>
        {/* Grid lines */}
        {gridLines.map((line, i) => (
          <SvgLine
            key={`grid-${i}`}
            x1={padding.left}
            y1={line.y}
            x2={width - padding.right}
            y2={line.y}
            stroke="rgba(0, 0, 0, 0.05)"
            strokeWidth={1}
          />
        ))}

        {/* Data lines */}
        {polylines.map((line, index) => {
          if (!line.hasData) return null;
          return (
            <Polyline
              key={`line-${index}`}
              points={line.points}
              fill="none"
              stroke={line.color}
              strokeWidth={line.strokeWidth}
            />
          );
        })}
      </Svg>

      {/* Y-axis labels */}
      {gridLines.map((line, i) => (
        <Text
          key={`ylabel-${i}`}
          style={[styles.axisLabel, { left: 5, top: line.y - 6 }]}
        >
          {line.value}
        </Text>
      ))}

      {/* X-axis labels */}
      {xLabels.map((item: any, i) => (
        <Text
          key={`xlabel-${i}`}
          style={[styles.axisLabel, { left: item.x - 15, top: height - padding.bottom + 15 }]}
        >
          {item.label}
        </Text>
      ))}
    </View>
  );
};

// Data Table Component - Receives actual time slots and chart data
const DataTable = ({ datasets, labels, timeSlots }: { datasets: any[], labels: string[], timeSlots: string[] }) => {
  // Find the Today dataset
  const todayDataset = datasets.find((ds: any) => ds.label.includes('Today'));

  // Collect all slots that have today's data (for highlighting)
  const slotsWithTodayData = new Set<string>();
  if (todayDataset) {
    timeSlots.forEach((slot, index) => {
      const value = todayDataset.data[index];
      if (value > 0) {
        slotsWithTodayData.add(slot);
      }
    });
  }

  // Show ALL time slots (no limit) - let it be scrollable
  const displayTimeSlots = timeSlots;

  // Get data value for a specific time slot from a dataset
  const getDataValue = (dataset: any, timeSlot: string) => {
    // Find the index of this time slot in the labels array
    const index = timeSlots.indexOf(timeSlot);
    if (index === -1) return '-';
    const value = dataset.data[index];
    return value !== undefined && value !== null ? value.toString() : '-';
  };

  // Filter datasets to only include those with data
  const datasetsWithData = datasets.filter((ds: any) =>
    ds.data && ds.data.some((v: number) => v > 0)
  );

  // Get colors for each dataset
  const getColorForLabel = (label: string) => {
    if (label.includes('Today')) return '#4CAF50';
    if (label.includes('Yesterday')) return '#2196F3';
    if (label.includes('Avg 7 Days')) return '#FF9800';
    if (label.includes('Last Week')) return '#9C27B0';
    return '#999999';
  };

  return (
    <View style={styles.dataTableContainer}>
      <Text style={styles.dataTableTitle}>Cumulative Inflow by Time Slot ({displayTimeSlots.length} entries)</Text>

      {/* Header */}
      <View style={styles.dataTableHeader}>
        <Text style={[styles.dataTableCellHeader, { flex: 1 }]}>Time</Text>
        {datasetsWithData.map((dataset: any, index: number) => {
          const label = dataset.label || `Dataset ${index + 1}`;
          const shortLabel = label.split(':')[0]; // Just get the name part
          return (
            <Text key={index} style={[
              styles.dataTableCellHeader,
              { flex: 1, color: getColorForLabel(dataset.label) }
            ]}>
              {shortLabel}
            </Text>
          );
        })}
      </View>

      {/* Rows */}
      <ScrollView style={{ maxHeight: 300 }}>
        {displayTimeSlots.map((timeSlot, i) => {
          const hasTodayData = slotsWithTodayData.has(timeSlot);
          return (
            <View key={i} style={[styles.dataTableRow, hasTodayData && styles.dataTableRowHighlight]}>
              <Text style={[styles.dataTableCellValue, { flex: 1, fontWeight: hasTodayData ? '700' : '500' }]}>
                {timeSlot}
              </Text>
              {datasetsWithData.map((dataset: any, index: number) => {
                const value = getDataValue(dataset, timeSlot);
                return (
                  <Text key={index} style={[
                    styles.dataTableCellValue,
                    {
                      flex: 1,
                      color: getColorForLabel(dataset.label),
                      fontWeight: hasTodayData && dataset.label.includes('Today') ? '700' : '400'
                    }
                  ]}>
                    {value}
                  </Text>
                );
              })}
            </View>
          );
        })}
      </ScrollView>
    </View>
  );
};

const InflowComparisonScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { logAction, logError } = useBaseScreen({ screenName: 'InflowComparisonScreen' });

  // Fixed chart dimensions (no orientation support)
  const chartWidth = Dimensions.get('window').width - 40;
  const chartHeight = 300;

  const [historicalData, setHistoricalData] = useState<SlotData[]>([]);
  const [todaySnapshots, setTodaySnapshots] = useState<StatsSnapshot[]>([]);
  const [isLoadingHistory, setIsLoadingHistory] = useState(false);
  const [isLoadingToday, setIsLoadingToday] = useState(false);
  const [lastUpdateTime, setLastUpdateTime] = useState<Date>(new Date());
  const [zoomLevel, setZoomLevel] = useState<number>(1); // 1 = full view, 2 = zoomed in 2x
  const [scrollOffset, setScrollOffset] = useState<number>(0); // Number of slots to scroll left/right

  // Function to reload snapshots from storage
  const reloadSnapshotsFromStorage = async (source: string = 'unknown') => {
    try {
      console.log(`[InflowComparisonScreen] 🔄 Reloading snapshots... (source: ${source})`);
      const snapshots = await getTodaySnapshots();
      console.log(`[InflowComparisonScreen] ✓ Loaded ${snapshots.length} snapshots from storage`);
      setTodaySnapshots(snapshots);
      setLastUpdateTime(new Date());
      console.log(`[InflowComparisonScreen] ✓ Last refresh: ${new Date().toLocaleTimeString()}`);

      // Log today's data for verification
      if (snapshots.length > 0) {
        const lastSnapshot = snapshots[snapshots.length - 1];
        console.log(`[InflowComparisonScreen] Latest snapshot: ${lastSnapshot.timeSlot} - Total: ${lastSnapshot.all.total}`);
      }
    } catch (error) {
      console.error('[InflowComparisonScreen] ✗ Error loading snapshots:', error);
    }
  };

  // Fetch historical data from Google Sheets (once)
  const fetchHistoricalData = async () => {
    if (historicalData.length > 0) {
      logAction('Using cached historical data');
      return;
    }

    setIsLoadingHistory(true);
    logAction('Fetching historical data from Google Sheets');

    try {
      // TODO: Replace with your actual sheet ID and API key
      const SHEET_ID = '1OrrbYWPnTcup30nI3vh0mEDRzi9fztrEvhBwuE_cxBc';
      const API_KEY = 'AIzaSyCXzeWuFPxmWsiXOE1Kl84XX9GTFUU1gVI';
      const RANGE = 'Sheet1!A:E'; // Read columns A to E

      const response = await fetch(
        `https://sheets.googleapis.com/v4/spreadsheets/${SHEET_ID}/values/${RANGE}?key=${API_KEY}`
      );

      const data = await response.json();

      if (data.values && data.values.length > 0) {
        const parsedData = parseGoogleSheetsData(data.values);
        setHistoricalData(parsedData);
        logAction('Historical data loaded', { count: parsedData.length });
      } else {
        logAction('No historical data found in Google Sheets');
      }
    } catch (error) {
      logError(error, 'fetchHistoricalData');
      Alert.alert(
        'Error',
        `Failed to load historical data: ${error}`,
        [{ text: 'OK' }]
      );
    } finally {
      setIsLoadingHistory(false);
    }
  };

  // Fetch current activity stats from API and store as snapshot
  const fetchCurrentStatsAndStore = async () => {
    try {
      const internalMemberId = await getString(Keys.INTERNAL_MEMBER_ID);
      const selectedEventId = await getString('selectedEventId');

      if (!internalMemberId || !selectedEventId) {
        logError('Missing member ID or event ID', 'fetchCurrentStatsAndStore');
        return;
      }

      // Get today's date in local format
      const todayLocal = new Date();
      const todayStr = `${todayLocal.getFullYear()}-${String(todayLocal.getMonth() + 1).padStart(2, '0')}-${String(todayLocal.getDate()).padStart(2, '0')}`;

      const request: GetDaypassActivityStatsRequest = {
        eventId: selectedEventId,
        activity: 'entrance-gate',
        date: todayStr,
        scannerMemberId: internalMemberId,
      };

      logAction('Fetching current activity stats from API', { date: todayStr });

      const response = await getDaypassActivityStats(request);

      if (response.status === 'success' && response.data) {
        const data = response.data as any;

        if (data.activityStats && Array.isArray(data.activityStats)) {
          logAction('Current activity stats fetched', { statsCount: data.activityStats.length });

          // Store as snapshot
          await storeStatsSnapshot(data.activityStats);

          logAction('Snapshot created from current API data');
        } else {
          logAction('No activity stats found in API response');
        }
      } else {
        logError(new Error(response.message || 'API request failed'), 'fetchCurrentStatsAndStore');
      }
    } catch (error) {
      logError(error, 'fetchCurrentStatsAndStore');
    }
  };

  // Load today's snapshots from local storage
  const loadTodaySnapshots = async (fetchFromApiIfNeeded: boolean = true) => {
    setIsLoadingToday(true);
    logAction('Loading today snapshots');

    try {
      let snapshots = await getTodaySnapshots();

      // If no snapshots exist, fetch from API (regardless of time)
      if (fetchFromApiIfNeeded && snapshots.length === 0) {
        logAction('No local snapshots found, fetching from API');
        await fetchCurrentStatsAndStore();
        snapshots = await getTodaySnapshots();
      }

      setTodaySnapshots(snapshots);
      setLastUpdateTime(new Date()); // Update last refresh time
      logAction('Today snapshots loaded', { count: snapshots.length });
    } catch (error) {
      logError(error, 'loadTodaySnapshots');
    } finally {
      setIsLoadingToday(false);
    }
  };

  // Get slot data for any date
  const getSlotData = (date: string): SlotData[] => {
    // Get today's date in IST
    const todayISTStr = getISTDateString();

    const isToday = date === todayISTStr;
    const startMinutes = 16 * 60 + 30; // 16:30 = 4:30 PM

    if (isToday) {
      // Use local snapshots for today - ONLY from 16:30 onwards
      const result = todaySnapshots
        .filter(snapshot => {
          // Skip snapshots without a valid timeSlot
          if (!snapshot.timeSlot) return false;

          const [hour, minute] = snapshot.timeSlot.split(':').map(Number);
          const slotMinutes = hour * 60 + minute;
          return slotMinutes >= startMinutes;
        })
        .map(snapshot => ({
          date: snapshot.date,
          slot: snapshot.timeSlot,
          minutes: parseTimeSlot(snapshot.timeSlot),
          total: snapshot.all.total
        }))
        .sort((a, b) => a.minutes - b.minutes);
      console.log(`Today: ${result.length} snapshots from 4:30 PM IST`);
      return result;
    } else {
      // Use Google Sheets data for historical dates - ONLY from 16:30 onwards
      const matchingData = historicalData.filter(row => row.date === date);

      const filtered = matchingData
        .filter(row => {
          // Skip rows without a valid timeSlot
          if (!row.timeSlot) return false;

          const [hour, minute] = row.timeSlot.split(':').map(Number);
          const slotMinutes = hour * 60 + minute;
          return slotMinutes >= startMinutes;
        })
        .map(row => ({
          date: row.date,
          slot: row.timeSlot,
          minutes: parseTimeSlot(row.timeSlot),
          total: row.total
        }))
        .sort((a, b) => a.minutes - b.minutes);
      return filtered;
    }
  };

  // Prepare chart data
  const getChartData = () => {
    const todayStr = getISTDateString();

    // Calculate other dates relative to today (subtracting days)
    const today = new Date();
    const yesterday = new Date(today);
    yesterday.setDate(yesterday.getDate() - 1);
    const yesterdayStr = formatDateIST(yesterday);

    const lastWeekSameDay = new Date(today);
    lastWeekSameDay.setDate(lastWeekSameDay.getDate() - 7);
    const lastWeekSameDayStr = formatDateIST(lastWeekSameDay);

    const todayData = getSlotData(todayStr);
    const yesterdayData = getSlotData(yesterdayStr);
    const lastWeekSameDayData = getSlotData(lastWeekSameDayStr);

    // Calculate average of last 7 days final totals (only use complete days)
    const last7DaysTotals: number[] = [];
    const baseDate = new Date(); // Use current date for arithmetic
    for (let i = 1; i <= 7; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      const dateStr = formatDateIST(date);
      const dayData = getSlotData(dateStr);
      // Get the final total for this day (last data point)
      if (dayData.length > 0) {
        const finalTotal = dayData[dayData.length - 1].total;
        last7DaysTotals.push(finalTotal);
      }
    }
    // Calculate average of the final totals
    const average7DaysTotal = last7DaysTotals.length > 0
      ? Math.round(last7DaysTotals.reduce((sum, val) => sum + val, 0) / last7DaysTotals.length)
      : 0;

    // For the average 7 days, create time-slot-by-time-slot average data
    // This shows the average pattern across the last 7 days
    const average7DaysData: SlotData[] = [];
    const last7DaysDataMap = new Map<string, number[]>(); // slot -> [values from each day]

    // Collect data from each of the last 7 days
    for (let i = 1; i <= 7; i++) {
      const date = new Date(baseDate);
      date.setDate(date.getDate() - i);
      const dateStr = formatDateIST(date);
      const dayData = getSlotData(dateStr);

      // Add each day's data points to the map
      dayData.forEach(dataPoint => {
        if (!last7DaysDataMap.has(dataPoint.slot)) {
          last7DaysDataMap.set(dataPoint.slot, []);
        }
        last7DaysDataMap.get(dataPoint.slot)!.push(dataPoint.total);
      });
    }

    // Calculate average for each time slot
    last7DaysDataMap.forEach((values, slot) => {
      const average = Math.round(values.reduce((sum, val) => sum + val, 0) / values.length);
      average7DaysData.push({
        date: todayStr,
        slot: slot,
        minutes: parseTimeSlot(slot),
        total: average
      });
    });

    // Sort by time
    average7DaysData.sort((a, b) => a.minutes - b.minutes);

    // Calculate totals for each dataset
    const todayTotal = todayData.length > 0 ? todayData[todayData.length - 1].total : 0;
    const yesterdayTotal = yesterdayData.length > 0 ? yesterdayData[yesterdayData.length - 1].total : 0;
    const lastWeekTotal = lastWeekSameDayData.length > 0 ? lastWeekSameDayData[lastWeekSameDayData.length - 1].total : 0;

    // Determine time range for x-axis (from 4:30 PM IST onwards)
    const startSlot = "16:30"; // 4:30 PM IST
    const minEndSlot = "23:30"; // Minimum end time (11:30 PM) - show full evening

    // Find the latest slot across all datasets to set the end time
    const parseSlotToMinutes = (slot: string) => {
      const [hours, minutes] = slot.split(':').map(Number);
      return hours * 60 + minutes;
    };

    let maxDataMinutes = 0;
    let maxSlot = minEndSlot;
    if (todayData.length > 0) {
      const lastSlotMinutes = parseSlotToMinutes(todayData[todayData.length - 1].slot);
      if (lastSlotMinutes > maxDataMinutes) {
        maxDataMinutes = lastSlotMinutes;
        maxSlot = todayData[todayData.length - 1].slot;
      }
    }
    if (yesterdayData.length > 0) {
      const lastSlotMinutes = parseSlotToMinutes(yesterdayData[yesterdayData.length - 1].slot);
      if (lastSlotMinutes > maxDataMinutes) {
        maxDataMinutes = lastSlotMinutes;
        maxSlot = yesterdayData[yesterdayData.length - 1].slot;
      }
    }
    if (lastWeekSameDayData.length > 0) {
      const lastSlotMinutes = parseSlotToMinutes(lastWeekSameDayData[lastWeekSameDayData.length - 1].slot);
      if (lastSlotMinutes > maxDataMinutes) {
        maxDataMinutes = lastSlotMinutes;
        maxSlot = lastWeekSameDayData[lastWeekSameDayData.length - 1].slot;
      }
    }

    // Use the later of: max data slot or minimum end slot (23:30)
    const minEndMinutesTotal = parseSlotToMinutes(minEndSlot);
    const endMinutesTotal = Math.max(maxDataMinutes, minEndMinutesTotal);
    const endHours = Math.floor(endMinutesTotal / 60);
    const endMinutesComp = endMinutesTotal % 60;
    const endSlot = `${endHours.toString().padStart(2, '0')}:${endMinutesComp.toString().padStart(2, '0')}`;

    // Calculate visible range based on zoom and scroll offset
    const [startHours, startMinutes] = startSlot.split(':').map(Number);
    const totalMinutes = endMinutesTotal - ((startHours * 60 + startMinutes));
    const visibleMinutes = Math.floor(totalMinutes / zoomLevel);

    // Apply scroll offset (each scroll unit = 10 minutes worth of data)
    const scrollShift = scrollOffset * 10; // 10 minutes per scroll
    const clampedScrollOffset = Math.max(0, Math.min(scrollOffset, Math.floor((totalMinutes - visibleMinutes) / 10)));

    const startMinutesTotal = startHours * 60 + startMinutes + scrollShift;
    const visibleEndMinutesTotal = startMinutesTotal + visibleMinutes;

    const visibleStartHours = Math.floor(startMinutesTotal / 60);
    const visibleStartMinutes = startMinutesTotal % 60;
    const visibleStartSlot = `${visibleStartHours.toString().padStart(2, '0')}:${visibleStartMinutes.toString().padStart(2, '0')}`;

    const visibleEndHours = Math.floor(visibleEndMinutesTotal / 60);
    const visibleEndMinutes = visibleEndMinutesTotal % 60;
    const visibleEndSlot = `${visibleEndHours.toString().padStart(2, '0')}:${visibleEndMinutes.toString().padStart(2, '0')}`;

    // If today has no data yet, only show historical comparison
    const showToday = todayData.length > 0;

    // Collect all unique slots that have data from ANY dataset
    const allSlotsWithAnyData = new Set<string>();
    todayData.forEach(d => allSlotsWithAnyData.add(d.slot));
    yesterdayData.forEach(d => allSlotsWithAnyData.add(d.slot));
    average7DaysData.forEach(d => allSlotsWithAnyData.add(d.slot));
    lastWeekSameDayData.forEach(d => allSlotsWithAnyData.add(d.slot));

    // Filter to only visible range based on zoom and scroll
    // BUT: Always include all of today's data slots to ensure the green line is complete
    const parseSlotToMinutesForFilter = (slot: string) => {
      const [hours, minutes] = slot.split(':').map(Number);
      return hours * 60 + minutes;
    };

    // Get all of today's slots (unfiltered)
    const todaySlots = todayData.map(d => d.slot);

    // Filter other datasets to visible range
    const otherSlots = Array.from(allSlotsWithAnyData)
      .filter(slot => {
        // Skip if it's a today slot (we already have all of those)
        if (todaySlots.includes(slot)) return false;
        const slotMinutes = parseSlotToMinutesForFilter(slot);
        return slotMinutes >= startMinutesTotal && slotMinutes <= visibleEndMinutesTotal;
      })
      .sort();

    // Combine: all today slots + filtered other slots
    const visibleSlots = [...todaySlots, ...otherSlots].sort();

    // Generate labels for visible slots only
    const labels = visibleSlots;
    const displayLabels = labels.map(label => {
      if (!label) return '';
      const hour = label.split(':')[0];
      const minutes = label.split(':')[1];
      const minuteNum = parseInt(minutes);
      return minuteNum % 15 === 0 ? hour : ''; // Show only every 15 minutes
    });

    // Helper function to fill data forward but stop after the last data point
    const fillDataForwardWithLimit = (labels: string[], data: SlotData[]): number[] => {
      if (data.length === 0) return labels.map(() => 0);

      const result: number[] = [];
      let lastValue = 0;
      let lastValidIndex = -1;

      // Find the last index where we have actual data
      labels.forEach((label, index) => {
        const entry = data.find(d => d.slot === label);
        if (entry) {
          lastValue = entry.total;
          lastValidIndex = index;
          result.push(lastValue);
        } else if (lastValidIndex >= 0 && index <= lastValidIndex) {
          // Only fill forward if we're still before or at the last data point
          result.push(lastValue);
        } else {
          // After the last data point, use 0 (or we could stop entirely)
          result.push(0);
        }
      });

      return result;
    };

    // Build datasets - only include Today if we have valid afternoon data
    const datasets = [
      ...(showToday ? [{
        label: `Today: ${todayTotal}`,
        data: fillDataForwardWithLimit(labels, todayData),
        color: (opacity = 1) => `rgba(76, 175, 80, ${opacity})`, // Green
        strokeWidth: 3
      }] : []),
      {
        label: `Yesterday: ${yesterdayTotal}`,
        data: fillDataForwardWithLimit(labels, yesterdayData),
        color: (opacity = 1) => `rgba(33, 150, 243, ${opacity})`, // Blue
        strokeWidth: 2
      },
      {
        label: `Avg 7 Days: ${average7DaysTotal}`,
        data: fillDataForwardWithLimit(labels, average7DaysData),
        color: (opacity = 1) => `rgba(255, 152, 0, ${opacity})`, // Orange
        strokeWidth: 2
      },
      {
        label: `Last Week: ${lastWeekTotal}`,
        data: fillDataForwardWithLimit(labels, lastWeekSameDayData),
        color: (opacity = 1) => `rgba(156, 39, 176, ${opacity})`, // Purple
        strokeWidth: 2
      }
    ];

    // Essential debug log only
    if (showToday && datasets.length > 0) {
      const todayDataset = datasets[0];
      const nonZeroCount = todayDataset.data.filter(v => v > 0).length;
      console.log(`Today dataset: ${nonZeroCount} non-zero values, Total: ${todayTotal}`);
    }

    return {
      labels: displayLabels,
      timeSlots: labels, // Actual time slots (e.g., "16:30", "16:35")
      datasets,
      totals: {
        today: todayTotal,
        yesterday: yesterdayTotal,
        average7Days: average7DaysTotal,
        lastWeek: lastWeekTotal
      },
      canScrollLeft: clampedScrollOffset > 0,
      canScrollRight: clampedScrollOffset < Math.floor((totalMinutes - visibleMinutes) / 10),
      maxScrollOffset: Math.floor((totalMinutes - visibleMinutes) / 10)
    };
  };

  // Initial setup
  useEffect(() => {
    const initialize = async () => {
      await clearOldSnapshots();
      await fetchHistoricalData();

      // Always fetch fresh today's data when entering the chart
      await fetchCurrentStatsAndStore();

      // Load snapshots after fetching
      await loadTodaySnapshots(false); // Don't fetch again, just load from storage
    };

    initialize();
  }, []);

  // Reload snapshots when screen comes into focus (background service updates data)
  useEffect(() => {
    console.log('[InflowComparisonScreen] 🎯 Setting up listeners...');

    // Navigation focus listener
    const unsubscribe = navigation.addListener('focus', () => {
      reloadSnapshotsFromStorage('navigation-focus');
    });

    // AppState change listener (when app comes to foreground)
    const handleAppStateChange = (nextAppState: string) => {
      if (nextAppState === 'active') {
        reloadSnapshotsFromStorage('app-foreground');
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    console.log('[InflowComparisonScreen] ✓ Listeners ready');

    return () => {
      console.log('[InflowComparisonScreen] 🗑️ Removing listeners');
      unsubscribe();
      subscription.remove();
    };
  }, [navigation]);

  // Backup: Periodic refresh every 1 minute (ensures chart shows latest data)
  useEffect(() => {
    console.log('[InflowComparisonScreen] ⏰ Setting up periodic refresh (1min)...');

    const interval = setInterval(() => {
      reloadSnapshotsFromStorage('periodic');
    }, 60 * 1000);

    return () => {
      console.log('[InflowComparisonScreen] 🗑️ Clearing periodic refresh');
      clearInterval(interval);
    };
  }, []);

  const handleBack = () => {
    logAction('Navigating back to Home');
    (navigation as any).goBack();
  };

  const handleRefresh = async () => {
    logAction('Manual refresh triggered');
    setIsLoadingToday(true);

    try {
      // Always fetch fresh data from API on manual refresh
      await fetchCurrentStatsAndStore();

      // Reload snapshots from storage
      const snapshots = await getTodaySnapshots();
      setTodaySnapshots(snapshots);
      setLastUpdateTime(new Date());

      logAction('Manual refresh completed', { snapshotCount: snapshots.length });
    } catch (error) {
      logError(error, 'handleRefresh');
    } finally {
      setIsLoadingToday(false);
    }
  };

  const handleRefreshLongPress = () => {
    Alert.alert(
      'Clear All Data?',
      'This will delete all locally stored snapshots and fetch fresh data from the API. Continue?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear & Refresh',
          style: 'destructive',
          onPress: async () => {
            logAction('Clear all data triggered by user');
            await clearAllSnapshots();

            // Fetch fresh data from API
            await fetchCurrentStatsAndStore();

            // Reload snapshots
            const snapshots = await getTodaySnapshots();
            setTodaySnapshots(snapshots);
            setLastUpdateTime(new Date());

            Alert.alert('Success', 'All data cleared and refreshed from API');
          }
        }
      ]
    );
  };

  const chartData = getChartData();
  const hasData = todaySnapshots.length > 0 || historicalData.length > 0;

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Inflow Comparison</Text>
        <TouchableOpacity
          onPress={handleRefresh}
          onLongPress={handleRefreshLongPress}
          delayLongPress={1000}
          style={styles.refreshButton}
        >
          <Ionicons name="refresh" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Info Card */}
        <View style={styles.infoCard}>
          <Ionicons name="information-circle-outline" size={24} color="#6c757d" />
          <Text style={styles.infoText}>
            Cumulative inflow comparison across different days (from 4:30 PM IST onwards).
            Data updates every 5 minutes.
            {'\n'}Use arrow buttons to scroll left/right. Tap purple icon to fit everything on screen.
            {'\n'}Long-press refresh button to clear all data.
          </Text>
        </View>

        {/* Loading States */}
        {(isLoadingHistory || isLoadingToday) && (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>
              {isLoadingHistory ? 'Loading historical data...' : 'Loading today data...'}
            </Text>
          </View>
        )}

        {/* Chart */}
        {!isLoadingHistory && !isLoadingToday && (
          <View style={styles.chartContainer}>
            <View style={styles.chartHeader}>
              <Text style={styles.chartTitle}>Cumulative Inflow - All Guests</Text>
            </View>

            <View style={styles.zoomControlsRow}>
              <View style={styles.zoomControls}>
                <TouchableOpacity
                  onPress={() => setScrollOffset(Math.max(0, scrollOffset - 1))}
                  style={styles.zoomButton}
                  disabled={!chartData.canScrollLeft}
                >
                  <Ionicons name="chevron-back-circle" size={28} color={chartData.canScrollLeft ? '#4CAF50' : '#ccc'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setScrollOffset(0)}
                  style={styles.zoomButton}
                >
                  <Ionicons name="refresh-circle" size={24} color="#2196F3" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    const maxScroll = chartData.maxScrollOffset || 0;
                    setScrollOffset(Math.min(scrollOffset + 1, maxScroll));
                  }}
                  style={styles.zoomButton}
                  disabled={!chartData.canScrollRight}
                >
                  <Ionicons name="chevron-forward-circle" size={28} color={chartData.canScrollRight ? '#4CAF50' : '#ccc'} />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => {
                    setZoomLevel(1);
                    setScrollOffset(0);
                  }}
                  style={styles.zoomButton}
                >
                  <Ionicons name="resize-outline" size={24} color="#9C27B0" />
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={() => setZoomLevel(Math.max(1, zoomLevel / 2))}
                  style={styles.zoomButton}
                  disabled={zoomLevel <= 1}
                >
                  <Ionicons name="remove-circle" size={28} color={zoomLevel <= 1 ? '#ccc' : '#4CAF50'} />
                </TouchableOpacity>
                <Text style={styles.zoomLevel}>{zoomLevel}x</Text>
                <TouchableOpacity
                  onPress={() => setZoomLevel(Math.min(4, zoomLevel * 2))}
                  style={styles.zoomButton}
                  disabled={zoomLevel >= 4}
                >
                  <Ionicons name="add-circle" size={28} color={zoomLevel >= 4 ? '#ccc' : '#4CAF50'} />
                </TouchableOpacity>
              </View>
            </View>

            {/* Summary Cards */}
            <View style={styles.summaryCardsContainer}>
              {chartData.totals.today > 0 && (
                <View style={[styles.summaryCard, { borderLeftColor: '#4CAF50' }]}>
                  <Text style={styles.summaryLabel}>Today</Text>
                  <Text style={styles.summaryValue}>{chartData.totals.today}</Text>
                </View>
              )}
              <View style={[styles.summaryCard, { borderLeftColor: '#2196F3' }]}>
                <Text style={styles.summaryLabel}>Yesterday</Text>
                <Text style={styles.summaryValue}>{chartData.totals.yesterday}</Text>
              </View>
              <View style={[styles.summaryCard, { borderLeftColor: '#FF9800' }]}>
                <Text style={styles.summaryLabel}>Avg 7 Days</Text>
                <Text style={styles.summaryValue}>{chartData.totals.average7Days}</Text>
              </View>
              <View style={[styles.summaryCard, { borderLeftColor: '#9C27B0' }]}>
                <Text style={styles.summaryLabel}>Last Week</Text>
                <Text style={styles.summaryValue}>{chartData.totals.lastWeek}</Text>
              </View>
            </View>

            {hasData && chartData.labels.length > 0 && chartData.datasets.length > 0 ? (
              <>
                <CustomLineChart
                  datasets={chartData.datasets}
                  labels={chartData.labels}
                  width={chartWidth}
                  height={chartHeight}
                />

                {/* Legend */}
                <View style={styles.legendContainer}>
                  {chartData.datasets.map((dataset, index) => {
                    // Get the correct color based on the label
                    const getColorForLabel = (label: string) => {
                      if (label.includes('Today')) return '#4CAF50';      // Green
                      if (label.includes('Yesterday')) return '#2196F3'; // Blue
                      if (label.includes('Avg 7 Days')) return '#FF9800'; // Orange
                      if (label.includes('Last Week')) return '#9C27B0';  // Purple
                      return '#999999'; // Default gray
                    };

                    // Check if this dataset has data
                    const hasData = dataset.data && dataset.data.some((v: number) => v > 0);
                    if (!hasData) return null;
                    // Use the actual dataset label (e.g., "Yesterday: 795")
                    const labelText = dataset.label || '';
                    const color = getColorForLabel(labelText);
                    return (
                      <View key={index} style={styles.legendItem}>
                        <View style={[styles.legendColor, { backgroundColor: color }]} />
                        <Text style={styles.legendText}>{labelText}</Text>
                      </View>
                    );
                  })}
                </View>
              </>
            ) : (
              <View style={styles.noDataContainer}>
                <Ionicons name="stats-chart-outline" size={64} color="#ccc" />
                <Text style={styles.noDataText}>No data available</Text>
                <Text style={styles.noDataSubText}>
          Activity data will appear here as scans are recorded
                </Text>
              </View>
            )}
          </View>
        )}

        {/* Data Table - Show cumulative inflow at each time slot */}
        {hasData && chartData.timeSlots && chartData.timeSlots.length > 0 && chartData.datasets.length > 0 && (
          <DataTable datasets={chartData.datasets} labels={chartData.labels} timeSlots={chartData.timeSlots} />
        )}

        {/* Last Updated */}
        <View style={styles.lastUpdatedContainer}>
          <Text style={styles.lastUpdatedText}>
            Last refresh: {lastUpdateTime.toLocaleTimeString('en-IN', { hour: '2-digit', minute: '2-digit', second: '2-digit', hour12: true })}
            {'\n'}Latest snapshot: {todaySnapshots.length > 0 ? todaySnapshots[todaySnapshots.length - 1]?.timeSlot : 'N/A'}
          </Text>
        </View>
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  refreshButton: {
    padding: 8,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  infoCard: {
    backgroundColor: '#f8f9fa',
    borderRadius: 12,
    padding: 16,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  infoText: {
    fontSize: 14,
    color: '#495057',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
  loadingContainer: {
    paddingVertical: 40,
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  chartContainer: {
    backgroundColor: '#fff',
    borderRadius: 16,
    padding: 20,
    marginBottom: 20,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
  },
  chartTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 12,
  },
  chartHeader: {
    marginBottom: 8,
  },
  zoomControlsRow: {
    alignItems: 'center',
    marginBottom: 15,
  },
  zoomControls: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  zoomButton: {
    padding: 4,
    marginLeft: 8,
  },
  zoomLevel: {
    fontSize: 13,
    color: '#666',
    marginHorizontal: 8,
    minWidth: 60,
    textAlign: 'center',
  },
  summaryCardsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'space-between',
    marginBottom: 15,
  },
  summaryCard: {
    flex: 1,
    minWidth: 80,
    backgroundColor: '#fafafa',
    borderRadius: 12,
    padding: 14,
    marginLeft: 8,
    borderLeftWidth: 4,
    borderLeftColor: '#4CAF50',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 1,
  },
  summaryLabel: {
    fontSize: 11,
    color: '#666',
    marginBottom: 4,
    textAlign: 'center',
  },
  summaryValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  chart: {
    borderRadius: 16,
    marginVertical: 10,
  },
  legendContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    marginTop: 20,
    paddingTop: 15,
    borderTopWidth: 1,
    borderTopColor: '#f0f0f0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    marginRight: 20,
    marginBottom: 10,
  },
  legendColor: {
    width: 12,
    height: 12,
    borderRadius: 6,
    marginRight: 8,
  },
  legendText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '500',
  },
  axisLabel: {
    position: 'absolute',
    fontSize: 10,
    color: '#666',
    width: 30,
  },
  noDataContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 18,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  noDataSubText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  lastUpdatedContainer: {
    alignItems: 'center',
    paddingVertical: 10,
  },
  lastUpdatedText: {
    fontSize: 13,
    color: '#999',
  },
  dataTableContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 20,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dataTableTitle: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 12,
  },
  dataTableHeader: {
    flexDirection: 'row',
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
    marginBottom: 8,
  },
  dataTableCell: {
    flex: 1,
    fontSize: 11,
    color: '#666',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  dataTableCellHeader: {
    flex: 1,
    fontSize: 11,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    paddingHorizontal: 4,
  },
  dataTableRow: {
    flexDirection: 'row',
    paddingVertical: 4,
    borderBottomWidth: 1,
    borderBottomColor: '#f8f9fa',
  },
  dataTableRowHighlight: {
    backgroundColor: '#e8f5e9', // Light green background for rows with today's data
  },
  dataTableCellValue: {
    fontSize: 11,
    textAlign: 'center',
    paddingHorizontal: 4,
  },
});

export default InflowComparisonScreen;
