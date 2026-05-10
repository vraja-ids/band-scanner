import React, { FC, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  Platform,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bhogaSheetsService, Ingredient, StorageLocation } from '../../services/BhogaSheetsService';
import { Routes } from '../../routes';

// Use a simple date input for now (can be upgraded to a proper picker later)
import DateTimePicker, { DateTimePickerEvent } from '@react-native-community/datetimepicker';

type BhogaHomeScreenNavigationProp = StackNavigationProp<any, any>;

const MEAL_GROUPS = [
  { day: 'Friday', prefix: 'Fri' },
  { day: 'Saturday', prefix: 'Sat' },
  { day: 'Sunday', prefix: 'Sun' },
  { day: 'Monday', prefix: 'Mon' },
];

const MEAL_TYPES = [
  { id: 'Breakfast', label: 'Breakfast', icon: 'sunny-outline' as const },
  { id: 'Lunch', label: 'Lunch', icon: 'partly-sunny-outline' as const },
  { id: 'Dinner', label: 'Dinner', icon: 'moon-outline' as const },
];

const RETREAT_START_DATE_KEY = 'bhoga_retreat_start_date';

interface Props {
  navigation: BhogaHomeScreenNavigationProp;
}

const BhogaHomeScreen: FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [retreatStartDate, setRetreatStartDate] = useState(new Date(2025, 4, 2));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [meals, setMeals] = useState<Record<string, any>>({});
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [alertsCount, setAlertsCount] = useState(0);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      const storedDate = await AsyncStorage.getItem(RETREAT_START_DATE_KEY);
      if (storedDate) {
        setRetreatStartDate(new Date(storedDate));
      }

      await loadData();
    } catch (error) {
      console.error('Error initializing:', error);
      Alert.alert('Error', 'Failed to initialize. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ingredientData, locations] = await Promise.all([
        bhogaSheetsService.getIngredientList(),
        bhogaSheetsService.getStorageLocations(),
      ]);

      setMeals(ingredientData.meals);
      setStorageLocations(locations);

      const alerts = calculateAlerts(ingredientData.ingredients, locations);
      setAlertsCount(alerts.length);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data. Please check your connection.');
    } finally {
      setIsLoading(false);
    }
  };

  const calculateAlerts = (ingredients: Ingredient[], locations: StorageLocation[]) => {
    const alerts: any[] = [];
    const locationMap = new Map(locations.map(l => [l.ingredientName, l]));

    ingredients.forEach(ingredient => {
      const location = locationMap.get(ingredient.name);
      const currentStock = location?.currentStock || 0;
      const pendingNeed = ingredient.meals
        .filter(m => m.status === 'pending')
        .reduce((sum, m) => sum + m.plannedQuantity, 0);

      if (currentStock < pendingNeed) {
        alerts.push({
          ingredient: ingredient.name,
          currentStock,
          needed: pendingNeed,
          shortfall: pendingNeed - currentStock,
          unit: ingredient.unit,
        });
      }
    });

    return alerts;
  };

  const handleDateChange = (date: Date) => {
    setRetreatStartDate(date);
    AsyncStorage.setItem(RETREAT_START_DATE_KEY, date.toISOString());
    setShowDatePicker(false);
  };

  const getMealKey = (prefix: string, type: string): string => {
    // Match Prasadam Distribution meal IDs: friDinner, satBreakfast, etc.
    const day = prefix.charAt(0).toLowerCase() + prefix.slice(1); // Fri -> fri
    return `${day}${type}`; // fri + Breakfast = friBreakfast
  };

  const getMealItems = (prefix: string, type: string) => {
    const key = getMealKey(prefix, type);
    return meals[key] || null;
  };

  const formatDateDisplay = (date: Date): string => {
    return date.toLocaleDateString('en-US', {
      weekday: 'long',
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const getMealDate = (dayIndex: number): string => {
    const date = new Date(retreatStartDate);
    date.setDate(date.getDate() + dayIndex);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'short', day: 'numeric' });
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#5dbea3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#5dbea3" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Bhoga Tracker</Text>
          <TouchableOpacity
            onPress={() => navigation.navigate(Routes.BhogaAlerts)}
            style={styles.alertsButton}
          >
            <Ionicons name="warning-outline" size={24} color={alertsCount > 0 ? '#ff6b6b' : '#5dbea3'} />
            {alertsCount > 0 && (
              <View style={styles.alertsBadge}>
                <Text style={styles.alertsBadgeText}>{alertsCount}</Text>
              </View>
            )}
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        <TouchableOpacity
          style={styles.dateSelector}
          onPress={() => setShowDatePicker(true)}
        >
          <Ionicons name="calendar-outline" size={20} color="#5dbea3" />
          <Text style={styles.dateText}>Retreat Start: {formatDateDisplay(retreatStartDate)}</Text>
          <Ionicons name="chevron-down" size={20} color="#666" />
        </TouchableOpacity>

        {MEAL_GROUPS.map((group, dayIndex) => (
          <View key={group.prefix} style={styles.daySection}>
            <Text style={styles.dayTitle}>
              {group.day} - {getMealDate(dayIndex)}
            </Text>
            <View style={styles.mealRow}>
              {MEAL_TYPES.map((mealType) => {
                const mealData = getMealItems(group.prefix, mealType.id);
                const itemCount = mealData ? Object.keys(mealData.items).length : 0;
                const pendingCount = mealData
                  ? Object.values(mealData.items).reduce(
                      (sum, item) => sum + item.ingredients.filter(i => i.status === 'pending').length,
                      0
                    )
                  : 0;

                return (
                  <TouchableOpacity
                    key={mealType.id}
                    style={[
                      styles.mealCard,
                      !mealData && styles.mealCardDisabled,
                    ]}
                    onPress={() =>
                      mealData && navigation.navigate(Routes.BhogaMeal, {
                        mealId: getMealKey(group.prefix, mealType.id),
                        mealName: `${group.day} ${mealType.label}`,
                        mealData,
                      })
                    }
                    disabled={!mealData}
                  >
                    <Ionicons
                      name={mealType.icon}
                      size={32}
                      color={mealData ? '#5dbea3' : '#ccc'}
                    />
                    <Text style={styles.mealTypeLabel}>{mealType.label}</Text>
                    <Text style={styles.mealItemCount}>
                      {itemCount} {itemCount === 1 ? 'item' : 'items'}
                    </Text>
                    {pendingCount > 0 && (
                      <View style={styles.pendingBadge}>
                        <Text style={styles.pendingBadgeText}>{pendingCount} pending</Text>
                      </View>
                    )}
                  </TouchableOpacity>
                );
              })}
            </View>
          </View>
        ))}

        <View style={styles.actionRow}>
          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate(Routes.BhogaDelivery)}
          >
            <Ionicons name="cube-outline" size={24} color="#5dbea3" />
            <Text style={styles.actionButtonText}>Delivery</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.actionButton}
            onPress={() => navigation.navigate(Routes.BhogaStorageMove)}
          >
            <Ionicons name="move" size={24} color="#5dbea3" />
            <Text style={styles.actionButtonText}>Move to Storage</Text>
          </TouchableOpacity>
        </View>

        <TouchableOpacity
          style={styles.storageButton}
          onPress={() => navigation.navigate(Routes.BhogaStorage)}
        >
          <Ionicons name="storefront-outline" size={24} color="#5dbea3" />
          <Text style={styles.storageButtonText}>View Storage Locations</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.adminButton}
          onPress={() => navigation.navigate(Routes.BhogaAdmin)}
        >
          <Ionicons name="settings-outline" size={24} color="#fff" />
          <Text style={styles.adminButtonText}>Storage Setup</Text>
        </TouchableOpacity>
      </ScrollView>

      {Platform.OS === 'ios' ? (
        <Modal visible={showDatePicker} transparent animationType="slide">
          <TouchableOpacity
            style={styles.datePickerModal}
            activeOpacity={1}
            onPress={() => setShowDatePicker(false)}
          >
            <TouchableOpacity
              style={styles.datePickerContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.datePickerTitle}>Select Retreat Start Date</Text>
              <DateTimePicker
                value={retreatStartDate}
                mode="date"
                display="spinner"
                onChange={(event: DateTimePickerEvent, date?: Date) => {
                  if (date) handleDateChange(date);
                }}
              />
              <TouchableOpacity
                style={styles.datePickerButton}
                onPress={() => setShowDatePicker(false)}
              >
                <Text style={styles.datePickerButtonText}>Done</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
      ) : (
        showDatePicker && (
          <DateTimePicker
            value={retreatStartDate}
            mode="date"
            display="default"
            onChange={(event: DateTimePickerEvent, date?: Date) => {
              setShowDatePicker(false);
              if (date) handleDateChange(date);
            }}
          />
        )
      )}
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
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  alertsButton: {
    padding: 8,
    position: 'relative',
  },
  alertsBadge: {
    position: 'absolute',
    top: 0,
    right: 0,
    backgroundColor: '#ff6b6b',
    borderRadius: 10,
    width: 18,
    height: 18,
    justifyContent: 'center',
    alignItems: 'center',
  },
  alertsBadgeText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: 'bold',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  dateSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  dateText: {
    flex: 1,
    fontSize: 16,
    color: '#333',
    marginLeft: 10,
  },
  daySection: {
    marginBottom: 20,
  },
  dayTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  mealRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  mealCard: {
    flex: 1,
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginHorizontal: 4,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  mealCardDisabled: {
    opacity: 0.5,
  },
  mealTypeLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginTop: 8,
  },
  mealItemCount: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  pendingBadge: {
    backgroundColor: '#ffe0b2',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginTop: 8,
  },
  pendingBadgeText: {
    fontSize: 11,
    color: '#e65100',
    fontWeight: '600',
  },
  actionRow: {
    flexDirection: 'row',
    gap: 10,
    marginBottom: 10,
  },
  actionButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#5dbea3',
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5dbea3',
    marginLeft: 10,
  },
  storageButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    borderWidth: 2,
    borderColor: '#5dbea3',
  },
  storageButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5dbea3',
    marginLeft: 10,
  },
  adminButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5dbea3',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  adminButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#fff',
    marginLeft: 10,
  },
  datePickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  datePickerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
  },
  datePickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  datePickerNote: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    padding: 20,
  },
  datePickerButton: {
    backgroundColor: '#5dbea3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 15,
  },
  datePickerButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
  },
});

export default BhogaHomeScreen;
