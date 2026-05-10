/**
 * Meal Settings Screen
 * Configure expected devotees for each meal
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ActivityIndicator,
  Alert,
  TextInput,
  ScrollView,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import * as ScreenOrientation from 'expo-screen-orientation';
import { getMeals, updateMealDevotees, type Meal } from '../../services/PrasadamSupabaseService';
import { getString } from '../../storage/Session';

function MealSettingsScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [meals, setMeals] = useState<Meal[]>([]);
  const [eventId, setEventId] = useState<string | null>(null);

  // Load meals for the event
  useEffect(() => {
    loadMeals();
  }, []);

  const loadMeals = async () => {
    try {
      const evId = await getString('selectedEventId');
      if (!evId) {
        Alert.alert('Error', 'No event selected');
        return;
      }
      setEventId(evId);

      const mealsData = await getMeals(evId);
      // Sort meals by day_number and serving_start_time
      const sortedMeals = (mealsData || []).sort((a, b) => {
        if (a.day_number !== b.day_number) {
          return a.day_number - b.day_number;
        }
        return a.serving_start_time.localeCompare(b.serving_start_time);
      });
      setMeals(sortedMeals);
    } catch (error) {
      console.error('Failed to load meals:', error);
      Alert.alert('Error', 'Failed to load meals');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDevoteesChange = (mealId: string, value: string) => {
    const numValue = value === '' ? 0 : parseInt(value, 10);
    setMeals(prevMeals =>
      prevMeals.map(meal =>
        meal.meal_id === mealId ? { ...meal, expected_devotees: numValue } : meal
      )
    );
  };

  const handleSave = async () => {
    setIsSaving(true);
    try {
      // Update each meal's expected_devotees
      for (const meal of meals) {
        // Always update (0 is a valid value)
        const success = await updateMealDevotees({
          meal_id: meal.meal_id,
          expected_devotees: meal.expected_devotees ?? 0,
        });
        if (!success) {
          throw new Error(`Failed to update ${meal.meal_name || meal.meal_type}`);
        }
      }

      Alert.alert('Success', 'Expected devotees updated successfully', [
        { text: 'OK', onPress: () => navigation.goBack() },
      ]);
    } catch (error) {
      console.error('Failed to save:', error);
      Alert.alert('Error', `Failed to save: ${error instanceof Error ? error.message : 'Unknown error'}`);
    } finally {
      setIsSaving(false);
    }
  };

  const getMealDisplayName = (meal: Meal): string => {
    return meal.meal_name || `${meal.meal_type} (Day ${meal.day_number})`;
  };

  const getDayName = (dayNumber: number): string => {
    const days = ['', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday', 'Sunday'];
    return days[dayNumber] || `Day ${dayNumber}`;
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5dbea3" />
          <Text style={styles.loadingText}>Loading meals...</Text>
        </View>
      </View>
    );
  }

  // Group meals by day
  const mealsByDay: Record<number, Meal[]> = {};
  meals.forEach(meal => {
    if (!mealsByDay[meal.day_number]) {
      mealsByDay[meal.day_number] = [];
    }
    mealsByDay[meal.day_number].push(meal);
  });

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#333" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Meal Settings</Text>
        <TouchableOpacity
          onPress={handleSave}
          style={[styles.saveButton, isSaving && styles.saveButtonDisabled]}
          disabled={isSaving}
        >
          {isSaving ? (
            <ActivityIndicator size="small" color="#5dbea3" />
          ) : (
            <Text style={styles.saveButtonText}>Save</Text>
          )}
        </TouchableOpacity>
      </View>

      <ScrollView style={styles.content}>
        <Text style={styles.subtitle}>Configure expected devotees for each meal</Text>

        {Object.keys(mealsByDay)
          .sort((a, b) => parseInt(a) - parseInt(b))
          .map(dayNum => (
            <View key={dayNum} style={styles.dayGroup}>
              <Text style={styles.dayTitle}>{getDayName(parseInt(dayNum))}</Text>
              {mealsByDay[parseInt(dayNum)].map(meal => (
                <View key={meal.meal_id} style={styles.mealRow}>
                  <View style={styles.mealInfo}>
                    <Text style={styles.mealName}>{meal.meal_type}</Text>
                    <Text style={styles.mealTime}>{meal.serving_start_time}</Text>
                  </View>
                  <View style={styles.inputContainer}>
                    <TextInput
                      style={styles.input}
                      keyboardType="number-pad"
                      value={meal.expected_devotees == null ? '' : meal.expected_devotees.toString()}
                      onChangeText={(value) => handleDevoteesChange(meal.meal_id, value)}
                      placeholder="0"
                    />
                    <Text style={styles.inputLabel}>devotees</Text>
                  </View>
                </View>
              ))}
            </View>
          ))}

        {meals.length === 0 && (
          <View style={styles.emptyContainer}>
            <Ionicons name="restaurant-outline" size={48} color="#999" />
            <Text style={styles.emptyText}>No meals found for this event</Text>
          </View>
        )}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 16,
    color: '#666',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 12,
    backgroundColor: '#FFF',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  saveButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  saveButtonDisabled: {
    opacity: 0.5,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5dbea3',
  },
  content: {
    flex: 1,
    padding: 16,
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  dayGroup: {
    marginBottom: 24,
  },
  dayTitle: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
    marginBottom: 12,
    textTransform: 'uppercase',
    letterSpacing: 1,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#FFF',
    borderRadius: 12,
    padding: 16,
    marginBottom: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 2,
    elevation: 2,
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  mealTime: {
    fontSize: 13,
    color: '#666',
    marginTop: 2,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  input: {
    width: 80,
    height: 44,
    borderWidth: 1,
    borderColor: '#E0E0E0',
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 16,
    textAlign: 'center',
    backgroundColor: '#FAFAFA',
  },
  inputLabel: {
    fontSize: 13,
    color: '#666',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyText: {
    fontSize: 16,
    color: '#999',
    marginTop: 12,
  },
});

export default MealSettingsScreen;
