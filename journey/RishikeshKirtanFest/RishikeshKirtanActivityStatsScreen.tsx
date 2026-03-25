import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getString, Keys } from '../../storage/Session';
import { getDaypassActivityStats, updateDayPassStatus } from '../Daypass/DaypassViewModel';
import type { GetDaypassActivityStatsRequest, RishikeshKirtanActivityStatsResponse, ActivityStat } from '../Daypass/models/api';
import { useBaseScreen } from '../common/util/useBaseScreen';
import { storeStatsSnapshot } from '../../utils/StatsStorage';
import Routes from '../../routes/index';

const RishikeshKirtanActivityStatsScreen = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const { logAction, logError } = useBaseScreen({ screenName: 'RishikeshKirtanActivityStatsScreen' });

  // Get today's date in YYYY-MM-DD format
  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  // Generate list of recent dates for Rishikesh Kirtan Fest
  const generateDateList = () => {
    const dates = [];

    // Generate dates from Feb 28 to March 23, 2026
    const dateStrings = [
      '2026-02-28', '2026-03-01', '2026-03-02', '2026-03-03', '2026-03-04',
      '2026-03-05', '2026-03-06', '2026-03-07', '2026-03-08', '2026-03-09', '2026-03-10',
      '2026-03-11', '2026-03-12', '2026-03-13', '2026-03-14', '2026-03-15',
      '2026-03-16', '2026-03-17', '2026-03-18', '2026-03-19', '2026-03-20',
      '2026-03-21', '2026-03-22', '2026-03-23'
    ];

    dateStrings.forEach(dateStr => {
      const [year, month, day] = dateStr.split('-');
      const dateObj = new Date(parseInt(year), parseInt(month) - 1, parseInt(day), 12, 0, 0);

      dates.push({
        value: dateStr,
        label: dateObj.toLocaleDateString('en-US', {
          weekday: 'short',
          month: 'short',
          day: 'numeric',
          year: 'numeric'
        })
      });
    });

    return dates;
  };

  const availableDates = generateDateList();

  // Default to today's date if it's in the list, otherwise use the first available date
  const todayDate = getTodayDate();
  const defaultDate = availableDates.find(d => d.value === todayDate)?.value || availableDates[0].value;

  const [selectedDate, setSelectedDate] = useState<string>(defaultDate);
  const [activityStats, setActivityStats] = useState<ActivityStat[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showDateModal, setShowDateModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [walkinLoading, setWalkinLoading] = useState<string | null>(null); // Track which walk-in button is loading
  const [lastSnapshotTime, setLastSnapshotTime] = useState<number>(0); // Track last snapshot time

  useEffect(() => {
    loadStats();
  }, [selectedDate]);

  // Auto-refresh stats every 1 second
  useEffect(() => {
    const interval = setInterval(() => {
      loadStats(true); // Silent refresh
    }, 1000);

    return () => clearInterval(interval);
  }, [selectedDate]);

  const loadStats = async (silent: boolean = false) => {
    if (!silent) {
      setIsLoading(true);
      setErrorMessage(null);
    }
    try {
      const internalMemberId = await getString(Keys.INTERNAL_MEMBER_ID);
      const selectedEventId = await getString('selectedEventId');

      if (!internalMemberId || !selectedEventId) {
        logError('Missing member ID or event ID', 'loadStats');
        Alert.alert('Error', 'Missing member ID or event ID');
        return;
      }

      const request: GetDaypassActivityStatsRequest = {
        eventId: selectedEventId,
        activity: 'entrance-gate',
        date: selectedDate,
        scannerMemberId: internalMemberId,
      };

      logAction('Loading activity stats', { date: selectedDate });

      const response = await getDaypassActivityStats(request);

      if (response.status === 'success' && response.data) {
        // Check if response matches new format with activityStats array
        const data = response.data as unknown as RishikeshKirtanActivityStatsResponse;
        if (data.activityStats && Array.isArray(data.activityStats)) {
          logAction('Rishikesh Kirtan activity stats loaded', {
            date: selectedDate,
            statsCount: data.activityStats.length,
          });

          // Group stats by guest type (Indian vs International)
          // Combine regular daypasses and walk-ins into single cards per type
          const groupedStats: {
            indian: { regular: number; walkin: number; activity: any[] };
            international: { regular: number; walkin: number; activity: any[] };
          } = {
            indian: { regular: 0, walkin: 0, activity: [] },
            international: { regular: 0, walkin: 0, activity: [] }
          };

          data.activityStats.forEach(stat => {
            const name = stat.daypassName?.toLowerCase() || '';

            if (name.includes('walk')) {
              // Walk-in entries
              if (name.includes('indian')) {
                groupedStats.indian.walkin += stat.totalCount || 0;
                // Merge lane activity for walk-ins
                stat.activity?.forEach(act => {
                  const existingLane = groupedStats.indian.activity.find(a => Object.keys(a)[0] === Object.keys(act)[0]);
                  if (existingLane) {
                    existingLane[Object.keys(act)[0]] += Object.values(act)[0];
                  } else {
                    groupedStats.indian.activity.push({ ...act });
                  }
                });
              } else if (name.includes('international')) {
                groupedStats.international.walkin += stat.totalCount || 0;
                stat.activity?.forEach(act => {
                  const existingLane = groupedStats.international.activity.find(a => Object.keys(a)[0] === Object.keys(act)[0]);
                  if (existingLane) {
                    existingLane[Object.keys(act)[0]] += Object.values(act)[0];
                  } else {
                    groupedStats.international.activity.push({ ...act });
                  }
                });
              }
            } else {
              // Regular daypass entries
              if (name.includes(':')) {
                // Indian guests (RKF-Mar2:Monday)
                groupedStats.indian.regular += stat.totalCount || 0;
                stat.activity?.forEach(act => {
                  const existingLane = groupedStats.indian.activity.find(a => Object.keys(a)[0] === Object.keys(act)[0]);
                  if (existingLane) {
                    existingLane[Object.keys(act)[0]] += Object.values(act)[0];
                  } else {
                    groupedStats.indian.activity.push({ ...act });
                  }
                });
              } else if (name.includes('-') && name.includes('rkf')) {
                // International guests (RKF-Mar2-Monday)
                groupedStats.international.regular += stat.totalCount || 0;
                stat.activity?.forEach(act => {
                  const existingLane = groupedStats.international.activity.find(a => Object.keys(a)[0] === Object.keys(act)[0]);
                  if (existingLane) {
                    existingLane[Object.keys(act)[0]] += Object.values(act)[0];
                  } else {
                    groupedStats.international.activity.push({ ...act });
                  }
                });
              }
            }
          });

          // Create merged stat cards
          const mergedStats = [
            {
              daypassName: 'Local Guests',
              guestType: 'indian',
              regularCount: groupedStats.indian.regular,
              walkinCount: groupedStats.indian.walkin,
              totalCount: groupedStats.indian.regular + groupedStats.indian.walkin,
              activity: groupedStats.indian.activity
            },
            {
              daypassName: 'International Guests',
              guestType: 'international',
              regularCount: groupedStats.international.regular,
              walkinCount: groupedStats.international.walkin,
              totalCount: groupedStats.international.regular + groupedStats.international.walkin,
              activity: groupedStats.international.activity
            }
          ];

          setActivityStats(mergedStats as any);

          // Store snapshot every 5 minutes for today's data
          const now = Date.now();
          if (now - lastSnapshotTime >= 5 * 60 * 1000) { // 5 minutes
            storeStatsSnapshot(mergedStats as any);
            setLastSnapshotTime(now);
            logAction('Stats snapshot stored');
          }

          // Check if all non-walk-in stats have no data
          const hasData = groupedStats.indian.regular > 0 || groupedStats.international.regular > 0;
          if (!hasData && !silent) {
            setErrorMessage(`No activity found for ${selectedDate}. Try selecting a different date.`);
          }
        } else {
          // Old format - fallback to single count
          logAction('Activity stats loaded (old format)', {
            date: selectedDate,
            totalCount: response.data.totalCount,
          });
          setActivityStats([]);
        }
      } else {
        logError('Failed to load activity stats', 'loadStats');
        if (!silent) {
          setErrorMessage('Failed to load activity stats. This date may not have any data yet.');
        }
      }
    } catch (error) {
      logError(error, 'loadStats');
      if (!silent) {
        setErrorMessage('Failed to load activity stats. Please check your connection and try again.');
      }
    } finally {
      if (!silent) {
        setIsLoading(false);
      }
    }
  };

  const handleBack = () => {
    logAction('Navigating back to Home');
    (navigation as any).goBack();
  };

  const handleInflowChart = () => {
    logAction('Navigating to inflow comparison');
    navigation.navigate(Routes.InflowComparison as any);
  };

  const openDateModal = () => {
    setShowDateModal(true);
    logAction('Date modal opened');
  };

  const selectDate = (dateValue: string) => {
    setSelectedDate(dateValue);
    setShowDateModal(false);
    logAction('Date selected', { date: dateValue });
  };

  const handleWalkinIncrement = async (guestType: 'indian' | 'international') => {
    // Use special daypass numbers: 9 for Local, 99 for International
    const walkinDaypassNumber = guestType === 'indian' ? '9' : '99';
    setWalkinLoading(guestType);
    logAction('Walk-in increment', { guestType, daypassNumber: walkinDaypassNumber });

    try {
      const internalMemberId = await getString(Keys.INTERNAL_MEMBER_ID);
      const selectedEventId = await getString('selectedEventId');

      if (!internalMemberId || !selectedEventId) {
        logError('Missing member ID or event ID', 'handleWalkinIncrement');
        Alert.alert('Error', 'Missing credentials. Please log in again.');
        return;
      }

      const response = await updateDayPassStatus({
        dayPassNumber: walkinDaypassNumber,
        action: 'adminredeem',
        actionId: 'entrance-gate',
        actionDetails: 'lane1',
        scannerMemberId: internalMemberId,
        eventId: selectedEventId,
      });

      if (response.status === 'success') {
        logAction('Walk-in added successfully', { guestType });
        // Stats will auto-refresh
      } else {
        logError('Failed to add walk-in', 'handleWalkinIncrement');
        Alert.alert(
          'Failed',
          response.message || 'Failed to add walk-in. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      logError(error, 'handleWalkinIncrement');
      Alert.alert(
        'Error',
        'Failed to add walk-in. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setWalkinLoading(null);
    }
  };

  const renderActivityItem = (activity: { [key: string]: number }) => {
    const keys = Object.keys(activity);
    return keys.map((key) => (
      <View key={key} style={styles.laneStatRow}>
        <Text style={styles.laneName}>{key}:</Text>
        <Text style={styles.laneCount}>{activity[key]}</Text>
      </View>
    ));
  };

  const renderStatItem = ({ item, index }: { item: any; index: number }) => {
    // Merged stat item has: daypassName, guestType, regularCount, walkinCount, totalCount, activity
    const guestType = item.guestType || 'indian';
    const isIndian = guestType === 'indian';
    const displayName = isIndian ? 'Local Guests' : 'International Guests';

    const totalLaneCount = item.activity?.reduce((sum: number, act: any) => {
      const count = Object.values(act)[0] || 0;
      return sum + count;
    }, 0) || 0;

    return (
      <View key={index} style={styles.statCard}>
        <View style={styles.statCardHeader}>
          <View style={styles.headerLeft}>
            <Text style={styles.guestType}>{displayName}</Text>
            <View style={styles.countBreakdown}>
              <Text style={styles.countLabel}>QR: </Text>
              <Text style={styles.countValue}>{item.regularCount || 0}</Text>
              <Text style={styles.countSeparator}> | </Text>
              <Text style={styles.countLabel}>Walk-in: </Text>
              <Text style={styles.countValue}>{item.walkinCount || 0}</Text>
            </View>
          </View>
          <View style={styles.totalBadge}>
            <Text style={styles.totalBadgeText}>Total: {item.totalCount || 0}</Text>
          </View>
        </View>

        {item.activity && item.activity.length > 0 ? (
          <View style={styles.laneStatsContainer}>
            {item.activity.map((act: any, idx: number) => (
              <View key={idx} style={styles.laneStatSection}>
                {renderActivityItem(act)}
              </View>
            ))}
            <View style={styles.laneStatRowTotal}>
              <Text style={styles.laneNameTotal}>Lane Total:</Text>
              <Text style={styles.laneCountTotal}>{totalLaneCount}</Text>
            </View>
          </View>
        ) : (
          <View style={styles.noActivityContainer}>
            <Ionicons name="information-circle-outline" size={24} color="#999" />
            <Text style={styles.noActivityText}>No activity recorded</Text>
          </View>
        )}

        {/* Walk-in +1 Button */}
        <TouchableOpacity
          style={[
            styles.walkinButton,
            walkinLoading === guestType && styles.walkinButtonDisabled
          ]}
          onPress={() => handleWalkinIncrement(guestType)}
          disabled={walkinLoading !== null}
        >
          {walkinLoading === guestType ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons name="person-add-outline" size={20} color="#fff" />
              <Text style={styles.walkinButtonText}>
                Add Walk-in +1 ({isIndian ? 'Local' : 'International'})
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>
    );
  };

  const grandTotal = activityStats.reduce((sum, stat) => sum + stat.totalCount, 0);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Activity Stats</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Date Picker */}
        <View style={styles.dropdownContainer}>
          <Text style={styles.dropdownLabel}>Select Date:</Text>
          <TouchableOpacity
            style={styles.dropdown}
            onPress={openDateModal}
          >
            <Text style={styles.dropdownText}>
              {availableDates.find(d => d.value === selectedDate)?.label || 'Select Date'}
            </Text>
            <Ionicons name="calendar-outline" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Date Selection Modal */}
        {showDateModal && (
          <View style={styles.modalOverlay}>
            <View style={styles.modalContainer}>
              <View style={styles.modalHeader}>
                <Text style={styles.modalTitle}>Select Date</Text>
                <TouchableOpacity
                  style={styles.modalCloseButton}
                  onPress={() => setShowDateModal(false)}
                >
                  <Ionicons name="close" size={24} color="#666" />
                </TouchableOpacity>
              </View>
              <ScrollView
                nestedScrollEnabled={true}
                style={styles.dateList}
                showsVerticalScrollIndicator={false}
              >
                {availableDates.map((item) => (
                  <TouchableOpacity
                    key={item.value}
                    style={[
                      styles.dateOption,
                      selectedDate === item.value && styles.dateOptionSelected
                    ]}
                    onPress={() => selectDate(item.value)}
                  >
                    <Text style={[
                      styles.dateOptionText,
                      selectedDate === item.value && styles.dateOptionTextSelected
                    ]}>
                      {item.label}
                    </Text>
                    {selectedDate === item.value && (
                      <Ionicons name="checkmark" size={20} color="#4CAF50" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
            </View>
          </View>
        )}

        {/* Grand Total */}
        <View style={styles.grandTotalContainer}>
          <Text style={styles.grandTotalLabel}>Grand Total</Text>
          {isLoading ? (
            <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
          ) : (
            <Text style={styles.grandTotalCount}>{grandTotal}</Text>
          )}
        </View>

        {/* Error Message */}
        {errorMessage && !isLoading && (
          <View style={styles.errorContainer}>
            <Ionicons name="information-circle-outline" size={24} color="#F44336" />
            <Text style={styles.errorText}>{errorMessage}</Text>
          </View>
        )}

        {/* Stats List */}
        {isLoading ? (
          <View style={styles.loadingContainer}>
            <ActivityIndicator size="large" color="#4CAF50" />
            <Text style={styles.loadingText}>Loading stats...</Text>
          </View>
        ) : activityStats.length > 0 ? (
          <View style={styles.statsList}>
            {activityStats.map((item, index) => renderStatItem({ item, index }))}
          </View>
        ) : (
          <View style={styles.noDataContainer}>
            <Ionicons name="document-text-outline" size={48} color="#ccc" />
            <Text style={styles.noDataText}>No activity stats found for this date</Text>
            <Text style={styles.noDataSubText}>Try selecting a different date from the calendar</Text>
          </View>
        )}

        {/* Refresh Button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadStats}
          disabled={isLoading}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
        </TouchableOpacity>

        {/* Inflow Chart Button */}
        <TouchableOpacity
          style={styles.inflowChartButton}
          onPress={handleInflowChart}
        >
          <Ionicons name="trending-up" size={20} color="#fff" />
          <Text style={styles.inflowChartButtonText}>View Inflow Chart</Text>
        </TouchableOpacity>
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
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    padding: 20,
  },
  dropdownContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 20,
    padding: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  dropdown: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  dropdownText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '85%',
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  dateList: {
    maxHeight: 400,
  },
  dateOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  dateOptionSelected: {
    backgroundColor: '#f8f9fa',
  },
  dateOptionText: {
    fontSize: 16,
    color: '#333',
  },
  dateOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  grandTotalContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 20,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  grandTotalLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  grandTotalCount: {
    fontSize: 42,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  loader: {
    marginVertical: 10,
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
  statsList: {
    marginBottom: 20,
  },
  statCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
    overflow: 'hidden',
  },
  statCardHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#f8f9fa',
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  daypassName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    flex: 1,
  },
  guestType: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  daypassDate: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  headerLeft: {
    flex: 1,
  },
  countBreakdown: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  countLabel: {
    fontSize: 13,
    color: '#666',
  },
  countValue: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  countSeparator: {
    fontSize: 13,
    color: '#999',
    marginHorizontal: 4,
  },
  totalBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
  },
  totalBadgeText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  laneStatsContainer: {
    padding: 15,
  },
  laneStatSection: {
    marginBottom: 10,
  },
  laneStatRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 6,
    paddingHorizontal: 12,
    backgroundColor: '#f8f9fa',
    borderRadius: 6,
    marginBottom: 6,
  },
  laneStatRowTotal: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 12,
    backgroundColor: '#e8f5e9',
    borderRadius: 6,
    marginTop: 4,
    borderTopWidth: 2,
    borderTopColor: '#4CAF50',
  },
  laneName: {
    fontSize: 14,
    color: '#555',
    flex: 1,
  },
  laneCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  laneNameTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#2e7d32',
    flex: 1,
  },
  laneCountTotal: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  noActivityContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noActivityText: {
    fontSize: 14,
    color: '#999',
    marginTop: 8,
  },
  noDataContainer: {
    paddingVertical: 60,
    alignItems: 'center',
  },
  noDataText: {
    fontSize: 16,
    color: '#999',
    marginTop: 16,
    textAlign: 'center',
  },
  noDataSubText: {
    fontSize: 14,
    color: '#ccc',
    marginTop: 8,
    textAlign: 'center',
  },
  errorContainer: {
    backgroundColor: '#FFEBEE',
    borderRadius: 8,
    padding: 15,
    marginBottom: 20,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FFCDD2',
  },
  errorText: {
    fontSize: 14,
    color: '#C62828',
    marginLeft: 10,
    flex: 1,
  },
  refreshButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  refreshButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  inflowChartButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  inflowChartButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  walkinButton: {
    backgroundColor: '#FF9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 12,
    paddingHorizontal: 15,
    margin: 15,
    marginTop: 0,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  walkinButtonDisabled: {
    opacity: 0.6,
  },
  walkinButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default RishikeshKirtanActivityStatsScreen;
