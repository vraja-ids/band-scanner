import React, { useEffect, useState } from 'react';
import { View, Text, StyleSheet } from 'react-native';
import {Picker} from '@react-native-community/picker';
import { api } from './services/api';

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
  const [activityStats, setActivityStats] = useState([]);
  const [selectedActivity, setSelectedActivity] = useState('friDinner');
  const [total, setTotal] = useState(0); // Add state for total

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10000); // Fetch data every 10 seconds

    return () => {
      clearInterval(interval); // Clear the interval when the component unmounts
    };
  }, [selectedActivity]);

  const fetchData = async () => {
    try {
      const data = await api.get('getActivityStats', {
        adminId: '1234',
        activity: selectedActivity
      });
      setActivityStats(data.activities);

      // Calculate the total count
      const totalCount = data.activities.reduce((sum, activity) => {
        return sum + activity.displayFields.reduce((fieldSum, field) => {
          return fieldSum + (parseInt(field.value, 10) || 0); // Ensure numeric values
        }, 0);
      }, 0);
      setTotal(totalCount); // Update the total state
    } catch (error) {
      console.error('Error fetching data:', error);
    }
  };

  return (
    <View style={styles.container}>
      <Picker
        selectedValue={selectedActivity}
        onValueChange={(itemValue) => setSelectedActivity(itemValue)}
      >
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

      {/* Display the total */}
      <Text style={styles.totalText}>Total: {total}</Text>

      {activityStats.map((activity, index) => (
        <View key={index} style={styles.activityContainer}>
          <Text style={styles.activityName}>{activity.activityName}</Text>
          {activity.displayFields.map((field, index) => (
            <View key={index} style={styles.field}>
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

