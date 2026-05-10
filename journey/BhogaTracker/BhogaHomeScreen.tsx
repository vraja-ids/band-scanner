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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { googleSheetsService, Ingredient, StorageLocation } from '../../services/GoogleSheetsService';
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
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [retreatStartDate, setRetreatStartDate] = useState(new Date(2025, 4, 2));
  const [showDatePicker, setShowDatePicker] = useState(false);
  const [meals, setMeals] = useState<Record<string, any>>({});
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [alertsCount, setAlertsCount] = useState(0);
  const [canManageStorage, setCanManageStorage] = useState(false);

  useEffect(() => {
    initializeScreen();
  }, []);

  const initializeScreen = async () => {
    try {
      await googleSheetsService.oauth.loadStoredTokens();
      const authenticated = googleSheetsService.oauth.isAuthenticated();
      setIsAuthenticated(authenticated);

      const storedDate = await AsyncStorage.getItem(RETREAT_START_DATE_KEY);
      if (storedDate) {
        setRetreatStartDate(new Date(storedDate));
      }

      const canManage = await AsyncStorage.getItem('canManageBhogaStorage');
      setCanManageStorage(canManage === 'true');

      if (authenticated) {
        await loadData();
      }
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
        googleSheetsService.getIngredientData(),
        googleSheetsService.getStorageLocations(),
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

  const handleSignIn = async () => {
    try {
      const result = await googleSheetsService.oauth.signIn();
      if (result.success) {
        setIsAuthenticated(true);
        await loadData();
      } else {
        Alert.alert('Sign In Failed', result.error || 'Please try again.');
      }
    } catch (error) {
      console.error('Sign in error:', error);
      Alert.alert('Error', 'Failed to sign in. Please try again.');
    }
  };

  const handleSignOut = async () => {
    try {
      await googleSheetsService.oauth.signOut();
      setIsAuthenticated(false);
      setMeals({});
      setStorageLocations([]);
      setAlertsCount(0);
    } catch (error) {
      console.error('Sign out error:', error);
    }
  };

  const handleDateChange = (date: Date) => {
    setRetreatStartDate(date);
    AsyncStorage.setItem(RETREAT_START_DATE_KEY, date.toISOString());
    setShowDatePicker(false);
  };

  const getMealKey = (prefix: string, type: string): string => {
    const mealMap: Record<string, string> = {
      'Fri-Breakfast': 'FriBreak',
      'Fri-Lunch': 'FriLunch',
      'Fri-Dinner': 'FriDin',
      'Sat-Breakfast': 'SatBreak',
      'Sat-Lunch': 'SatLunch',
      'Sat-Dinner': 'SatDin',
      'Sun-Breakfast': 'SunBreak',
      'Sun-Lunch': 'SunLunch',
      'Sun-Dinner': 'SunDin',
      'Mon-Breakfast': 'MonBreak',
      'Mon-Lunch': 'MonLunch',
      'Mon-Dinner': 'MonDin',
    };
    return mealMap[`${prefix}-${type}`] || `${prefix}${type}`;
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

  if (isLoading && !isAuthenticated) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#5dbea3" />
      </View>
    );
  }

  if (!isAuthenticated) {
    return (
      <View style={styles.container}>
        <View style={styles.authContainer}>
          <Ionicons name="restaurant-outline" size={80} color="#5dbea3" />
          <Text style={styles.authTitle}>Bhoga Tracker</Text>
          <Text style={styles.authSubtitle}>Track ingredients for retreat meals</Text>
          <TouchableOpacity style={styles.signInButton} onPress={handleSignIn}>
            <Text style={styles.signInButtonText}>Sign in with Google</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={handleSignOut} style={styles.signOutButton}>
          <Ionicons name="log-out-outline" size={24} color="#5dbea3" />
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

        <TouchableOpacity
          style={styles.storageButton}
          onPress={() => navigation.navigate(Routes.BhogaStorage)}
        >
          <Ionicons name="storefront-outline" size={24} color="#5dbea3" />
          <Text style={styles.storageButtonText}>View Storage Locations</Text>
        </TouchableOpacity>

        {canManageStorage && (
          <TouchableOpacity
            style={styles.adminButton}
            onPress={() => navigation.navigate(Routes.BhogaAdmin)}
          >
            <Ionicons name="settings-outline" size={24} color="#fff" />
            <Text style={styles.adminButtonText}>Storage Setup</Text>
          </TouchableOpacity>
        )}
      </ScrollView>

      <Modal visible={showDatePicker} transparent animationType="slide">
        <View style={styles.datePickerModal}>
          <View style={styles.datePickerContent}>
            <Text style={styles.datePickerTitle}>Select Retreat Start Date</Text>
            {Platform.OS === 'ios' ? (
              <View>
                {/* @ts-ignore - DatePickerIOS types are incomplete */}
                <DatePickerIOSBase
                  date={retreatStartDate}
                  onDateChange={handleDateChange}
                  mode="date"
                />
              </View>
            ) : (
              <Text style={styles.datePickerNote}>
                Date picker for Android coming soon. Please use iOS for now.
              </Text>
            )}
            <TouchableOpacity
              style={styles.datePickerButton}
              onPress={() => setShowDatePicker(false)}
            >
              <Text style={styles.datePickerButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  authContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  authTitle: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  authSubtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 30,
    textAlign: 'center',
  },
  signInButton: {
    backgroundColor: '#5dbea3',
    paddingHorizontal: 40,
    paddingVertical: 15,
    borderRadius: 25,
  },
  signInButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
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
  headerTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  signOutButton: {
    padding: 8,
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
