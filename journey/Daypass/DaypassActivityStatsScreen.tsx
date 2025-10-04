import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import { getString, Keys } from '../../storage/Session';
import { getDaypassActivityStats } from './DaypassViewModel';
import type { GetDaypassActivityStatsRequest } from './models/api';
import { useBaseScreen } from '../common/util/useBaseScreen';

const DaypassActivityStatsScreen: React.FC = () => {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { logAction, logError } = useBaseScreen({ screenName: 'DaypassActivityStatsScreen' });

  const [selectedActivity, setSelectedActivity] = useState<string>('bus1');
  const [selectedDate, setSelectedDate] = useState<string>(new Date().toISOString().split('T')[0]);
  const [totalCount, setTotalCount] = useState<number>(0);
  const [isLoading, setIsLoading] = useState(false);

  const busOptions = Array.from({ length: 12 }, (_, i) => `bus${i + 1}`);
  const prasadamOptions = ['breakfast', 'lunch', 'dinner'];
  const allOptions = [...busOptions, ...prasadamOptions];

  useEffect(() => {
    loadStats();
  }, [selectedActivity, selectedDate]);

  const loadStats = async () => {
    setIsLoading(true);
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
        activity: selectedActivity,
        date: selectedDate,
        scannerMemberId: internalMemberId,
      };

      const response = await getDaypassActivityStats(request);

      if (response.status === 'success' && response.data) {
        logAction('Daypass activity stats loaded', { 
          activity: selectedActivity, 
          date: selectedDate, 
          totalCount: response.data.totalCount 
        });
        setTotalCount(response.data.totalCount);
      } else {
        logError('Failed to load daypass activity stats', 'loadStats');
        Alert.alert('Error', 'Failed to load activity stats');
      }
    } catch (error) {
      logError(error, 'loadStats');
      Alert.alert('Error', 'Failed to load activity stats');
    } finally {
      setIsLoading(false);
    }
  };

  const handleBack = () => {
    logAction('Navigating back to Home');
    (navigation as any).goBack();
  };

  const getActivityDisplayName = (activity: string) => {
    if (activity.startsWith('bus')) {
      const busNumber = activity.replace('bus', '');
      return `Bus ${busNumber}`;
    }
    return activity.charAt(0).toUpperCase() + activity.slice(1);
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daypass Activity Stats</Text>
        <View style={styles.placeholder} />
      </View>

      <ScrollView style={styles.content} showsVerticalScrollIndicator={false}>
        {/* Activity Picker */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Select Activity:</Text>
          <Picker
            selectedValue={selectedActivity}
            onValueChange={setSelectedActivity}
            style={styles.picker}
          >
            {allOptions.map((option) => (
              <Picker.Item
                key={option}
                label={getActivityDisplayName(option)}
                value={option}
              />
            ))}
          </Picker>
        </View>

        {/* Date Picker */}
        <View style={styles.pickerContainer}>
          <Text style={styles.pickerLabel}>Select Date:</Text>
          <Picker
            selectedValue={selectedDate}
            onValueChange={setSelectedDate}
            style={styles.picker}
          >
            {/* Generate last 30 days */}
            {Array.from({ length: 30 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - i);
              const dateString = date.toISOString().split('T')[0];
              const displayDate = date.toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric'
              });
              return (
                <Picker.Item
                  key={dateString}
                  label={displayDate}
                  value={dateString}
                />
              );
            })}
          </Picker>
        </View>

        {/* Stats Display */}
        <View style={styles.statsContainer}>
          <Text style={styles.statsLabel}>Total Count for {getActivityDisplayName(selectedActivity)}</Text>
          {isLoading ? (
            <ActivityIndicator size="large" color="#4CAF50" style={styles.loader} />
          ) : (
            <Text style={styles.totalCount}>{totalCount}</Text>
          )}
        </View>

        {/* Refresh Button */}
        <TouchableOpacity
          style={styles.refreshButton}
          onPress={loadStats}
          disabled={isLoading}
        >
          <Ionicons name="refresh" size={20} color="#fff" />
          <Text style={styles.refreshButtonText}>Refresh</Text>
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
  pickerContainer: {
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
  pickerLabel: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  picker: {
    backgroundColor: '#f8f8f8',
    borderRadius: 6,
  },
  statsContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 30,
    alignItems: 'center',
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  statsLabel: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  totalCount: {
    fontSize: 48,
    fontWeight: 'bold',
    color: '#4CAF50',
  },
  loader: {
    marginVertical: 20,
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
});

export default DaypassActivityStatsScreen;
