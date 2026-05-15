import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import { Picker } from '@react-native-picker/picker';
import { api } from '../../services/api';
import { getString } from '../../storage/Session';

const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 20,
  },
  activityContainer: {
    marginBottom: 20,
    padding: 10,
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
  },
  activityName: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  field: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  fieldKey: {
    fontWeight: 'bold',
  },
  fieldValue: {
    color: '#555',
  },
  totalText: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#4CAF50',
    marginVertical: 20,
    textAlign: 'center',
  },
});

const ActivityStatsScreen = () => {
  const [activityStats, setActivityStats] = useState<any[]>([]);
  const [selectedActivity, setSelectedActivity] = useState('friDinner');
  const [total, setTotal] = useState(0);
  const [eventId, setEventId] = useState<string | null>(null);

  useEffect(() => {
    loadEventId();
  }, []);

  const loadEventId = async () => {
    const id = await getString('selectedEventId');
    setEventId(id);
  };

  useEffect(() => {
    if (eventId) {
      fetchData();
    }
    const interval = setInterval(() => eventId && fetchData(), 10000);
    return () => {
      clearInterval(interval);
    };
  }, [selectedActivity, eventId]);

  const getTodayDate = () => {
    const today = new Date();
    const year = today.getFullYear();
    const month = String(today.getMonth() + 1).padStart(2, '0');
    const day = String(today.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const fetchData = async () => {
    if (!eventId) return;
    try {
      const data: any = await api.get('getActivityStats', {
        adminId: '1234',
        activity: selectedActivity,
        category: 'mealtracking',
        activityDate: getTodayDate(),
        eventId,
      });
      setActivityStats(data.activities);

      const totalCount = data.activities.reduce((sum: number, activity: any) => {
        return (
          sum +
          activity.displayFields.reduce((fieldSum: number, field: any) => {
            return fieldSum + (parseInt(field.value, 10) || 0);
          }, 0)
        );
      }, 0);
      setTotal(totalCount);
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Picker selectedValue={selectedActivity} onValueChange={(itemValue) => setSelectedActivity(itemValue)}>
        <Picker.Item label="Friday Dinner" value="friDinner" />
        <Picker.Item label="Saturday Breakfast" value="satBreakfast" />
        <Picker.Item label="Saturday Lunch" value="satLunch" />
        <Picker.Item label="Saturday Dinner" value="satDinner" />
        <Picker.Item label="Sunday Breakfast" value="sunBreakfast" />
        <Picker.Item label="Sunday Lunch" value="sunLunch" />
        <Picker.Item label="Sunday Dinner" value="sunDinner" />
        <Picker.Item label="Monday Breakfast" value="monBreakfast" />
        <Picker.Item label="Monday Lunch" value="monLunch" />
      </Picker>

      <Text style={styles.totalText}>Total: {total}</Text>

      {activityStats.map((activity, index) => (
        <View key={index} style={styles.activityContainer}>
          <Text style={styles.activityName}>{activity.activityName}</Text>
          {activity.displayFields.map((field: any, idx: number) => (
            <View key={idx} style={styles.field}>
              <Text style={styles.fieldKey}>{field.key}</Text>
              <Text style={styles.fieldValue}>{field.value}</Text>
            </View>
          ))}
        </View>
      ))}
    </View>
  );
};

export default ActivityStatsScreen;


