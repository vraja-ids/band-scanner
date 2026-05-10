import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator, Alert, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import { useTranslation } from 'react-i18next';
import { changeLanguage } from '../../i18n';
import Routes from '../../routes/index';
import { SessionManager } from '../../storage/SessionManager';
import { getString, Keys, setString } from '../../storage/Session';
import { useBaseScreen } from '../common/util/useBaseScreen';
import { updateCount } from '../Daypass/DaypassViewModel';
import type { UpdateCountRequest } from '../Daypass/models/api';
import { MealSelectionModal } from '../PrasadamDistribution/components/MealSelectionModal';
import { getMeals, type Meal, initializePrasadamService } from '../../services/PrasadamSupabaseService';
import { MealPickerModal } from '../Meals/components';
import { getAllMealsForEvent, getCurrentMeal, type MealTimeSlot } from '../../config/mealSchedule';

const HomeScreen = () => {
  const { logAction, logError } = useBaseScreen({ screenName: 'HomeScreen' });
  const navigation: any = useNavigation();
  const insets = useSafeAreaInsets();
  const { t, i18n } = useTranslation();
  const [selectedLane, setSelectedLane] = useState<string | null>(null);
  const [showGiftButton, setShowGiftButton] = useState(false);
  const [userName, setUserName] = useState('');
  const [canScanOthersQr, setCanScanOthersQr] = useState(false);
  const [scansInThisEvent, setScansInThisEvent] = useState<string[]>([]);
  const [selectedEventName, setSelectedEventName] = useState('');
  const [selectedEventId, setSelectedEventId] = useState<string | null>(null);
  const [selectedBusNumber, setSelectedBusNumber] = useState<string>('1');
  const [selectedPrasadamTime, setSelectedPrasadamTime] = useState<string>('Breakfast');
  const [busCount, setBusCount] = useState<number>(0);
  const [prasadamCount, setPrasadamCount] = useState<number>(0);
  const [isUpdatingBusCount, setIsUpdatingBusCount] = useState(false);
  const [isUpdatingPrasadamCount, setIsUpdatingPrasadamCount] = useState(false);
  const [showBusModal, setShowBusModal] = useState(false);
  const [showMealModal, setShowMealModal] = useState(false);
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  const [isInitialLoading, setIsInitialLoading] = useState(true);
  const [showMealPicker, setShowMealPicker] = useState(false);
  const [availableEventMeals, setAvailableEventMeals] = useState<MealTimeSlot[]>([]);
  const [selectedEventMeal, setSelectedEventMeal] = useState<MealTimeSlot | null>(null);
  const route: any = useRoute();

  useEffect(() => {
    checkGiftPermissions();
    loadUserName();
    loadEventData();
  }, []);

  useEffect(() => {
    if (selectedEventId) {
      try {
        loadEventMeals(selectedEventId);
      } catch (error) {
        console.error('Error loading event meals:', error);
        logError(error, 'loadEventMeals');
      }
    }
  }, [selectedEventId]);

  useEffect(() => {
    if (route?.params?.tag?.id) {
      handleGiftScan(route.params.tag.id);
      navigation.setParams({ tag: undefined });
    }
  }, [route?.params?.tag]);

  const loadUserName = async () => {
    try {
      const spiritualName = await getString(Keys.SPIRITUAL_NAME);
      const legalName = await getString(Keys.LEGAL_NAME);
      const name = spiritualName || legalName || '';
      logAction('User name loaded', { name });
      setUserName(name);
    } catch (error) {
      logError(error, 'loadUserName');
    }
  };

  const loadEventData = async () => {
    try {
      const scansData = await getString('scansInThisEvent');
      const eventName = await getString('selectedEventName');
      const eventId = await getString('selectedEventId');
      const busNumber = await getString(Keys.SELECTED_BUS_NUMBER);
      const prasadamTime = await getString(Keys.SELECTED_PRASADAM_TIME);

      if (scansData) {
        const scans = JSON.parse(scansData);
        logAction('Event data loaded', { scans, eventName, busNumber, prasadamTime });
        setScansInThisEvent(scans);
      }
      if (eventName) {
        setSelectedEventName(eventName);
      }
      if (eventId) {
        setSelectedEventId(eventId);
        // Initialize Prasadam service with the selected event (fire and forget, don't await)
        initializePrasadamService(eventId).catch((err) => {
          console.error('Failed to initialize Prasadam service:', err);
          logError(err, 'initializePrasadamService');
        });
      }
      if (busNumber) {
        setSelectedBusNumber(busNumber);
      }
      if (prasadamTime) {
        setSelectedPrasadamTime(prasadamTime);
      }
    } catch (error) {
      logError(error, 'loadEventData');
    } finally {
      setIsInitialLoading(false);
    }
  };

  const checkGiftPermissions = async () => {
    try {
      const canScanOthers = SessionManager.hasPermission('canScanOthersQr');
      const canApproveTshirt = SessionManager.hasPermission('canApproveGiftTshirt');
      const canApproveJacket = SessionManager.hasPermission('canApproveGiftJacket');
      const canFulfillTshirt = SessionManager.hasPermission('canFulfillGiftTshirt');
      const canFulfillJacket = SessionManager.hasPermission('canFulfillGiftJacket');
      setCanScanOthersQr(!!canScanOthers);
      setShowGiftButton(!!(canApproveTshirt || canApproveJacket || canFulfillTshirt || canFulfillJacket));
    } catch (error) {
      console.error('Error checking gift permissions:', error);
    }
  };

  const handleLanguageChange = () => {
    const languages = [
      { code: 'en', name: 'English', flag: '🇺🇸' },
      { code: 'ru', name: 'Русский', flag: '🇷🇺' },
      { code: 'es', name: 'Español', flag: '🇪🇸' },
    ];

    Alert.alert(
      t('language.selectLanguage'),
      '',
      languages.map(lang => ({
        text: `${lang.flag} ${lang.name}`,
        onPress: async () => {
          if (lang.code !== i18n.language) {
            await changeLanguage(lang.code);
            logAction('Language changed', { language: lang.code });
          }
        }
      })).concat([{ text: t('common.cancel'), onPress: async () => {} }])
    );
  };

  const handleLogout = () => {
    logAction('Logout confirmation requested');
    Alert.alert(
      t('home.logoutTitle'),
      t('home.logoutConfirm'),
      [
        {
          text: t('common.cancel'),
          style: 'cancel',
        },
        {
          text: t('common.logout'),
          style: 'destructive',
          onPress: performLogout,
        },
      ]
    );
  };

  const performLogout = async () => {
    logAction('Performing logout');
    try {
      // Clear SessionManager
      SessionManager.reset();
      
      // Clear all AsyncStorage data
      await AsyncStorage.multiRemove([
        'memberId',
        'canScanOthersQr',
        'canApproveGiftTshirt',
        'canApproveGiftJacket',
        'canFulfillGiftTshirt',
        'canFulfillGiftJacket',
        'canApproveMultipleGifts',
        'legalName',
        'spiritualName',
        'authToken',
        'externalMemberId',
        'emailAddress',
        'scansInThisEvent',
        'selectedEventId',
        'selectedEventName',
        'selectedBusNumber',
      ]);

      // Navigate to email login screen
      logAction('Navigating to email login after logout');
      navigation.reset({
        index: 0,
        routes: [{ name: Routes.LoginEmail }],
      });
    } catch (error) {
      logError(error, 'performLogout');
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const navigateToBarcodeScannerForTag = () => {
    navigation.navigate(Routes.Scanner, { location: selectedLane, screen: Routes.RegisterTag });
  };

  const navigateToBarcodeScannerForMeal = () => {
    navigation.navigate(Routes.Scanner, { location: selectedLane, screen: Routes.MealScan });
  };

  const navigateToMealScanner = () => {
    // Show meal picker before navigating
    setShowMealPicker(true);
  };

  const loadEventMeals = (eventId: string) => {
    try {
      const meals = getAllMealsForEvent(eventId);
      const currentMeal = getCurrentMeal(eventId);
      setAvailableEventMeals(meals);
      setSelectedEventMeal(currentMeal);
    } catch (error) {
      console.error('Error loading event meals:', error);
      logError(error, 'loadEventMeals');
      // Set empty defaults to prevent crashes
      setAvailableEventMeals([]);
      setSelectedEventMeal(null);
    }
  };

  const handleEventMealSelect = (meal: MealTimeSlot) => {
    setShowMealPicker(false);
    navigation.navigate(Routes.Scanner, {
      location: selectedLane,
      screen: Routes.MealScan,
      mealId: meal.mealId,
      mealName: meal.name,
    });
  };

  const navigateToRegisterTag = () => {
    navigation.navigate(Routes.Scanner, { screen: Routes.RegisterTag });
  };

  const navigateToActivityStats = () => {
    navigation.navigate(Routes.ActivityStats, { location: selectedLane, screen: Routes.ActivityStats });
  };

  const navigateToGiftScanner = () => {
    navigation.navigate(Routes.Scanner, {
      screen: Routes.GiftApproval,
      message: 'Scan their QR for approving',
    });
  };

  const navigateToServiceApproval = () => {
    navigation.navigate(Routes.Scanner, {
      screen: Routes.ServiceApproval,
      message: 'Scan their QR for approving',
    });
  };

  const navigateToRedeemBus = () => {
    navigation.navigate(Routes.RedeemBus);
  };

  const navigateToRedeemPrasadam = () => {
    navigation.navigate(Routes.RedeemPrasadam);
  };

  const navigateToRishikeshKirtanScan = () => {
    navigation.navigate(Routes.RishikeshKirtanScan);
  };

  const handleBusNumberChange = async (busNumber: string) => {
    setSelectedBusNumber(busNumber);
    try {
      await setString(Keys.SELECTED_BUS_NUMBER, busNumber);
    } catch (error) {
      console.error('Error saving bus number:', error);
    }
  };

  const handlePrasadamTimeChange = async (prasadamTime: string) => {
    setSelectedPrasadamTime(prasadamTime);
    try {
      await setString(Keys.SELECTED_PRASADAM_TIME, prasadamTime);
    } catch (error) {
      console.error('Error saving prasadam time:', error);
    }
  };

  const handleLogoPress = () => {};

  const handleLaneSelect = (lane: string | null) => {
    setSelectedLane(lane);
  };

  const handleCountUpdate = async (actionId: 'bus' | 'prasadam', count: number) => {
    const isBus = actionId === 'bus';
    const setLoading = isBus ? setIsUpdatingBusCount : setIsUpdatingPrasadamCount;
    const setCount = isBus ? setBusCount : setPrasadamCount;
    
    setLoading(true);
    try {
      const internalMemberId = await getString(Keys.INTERNAL_MEMBER_ID);
      const selectedEventId = await getString('selectedEventId');
      
      if (!internalMemberId || !selectedEventId) {
        logError('Missing member ID or event ID', 'handleCountUpdate');
        Alert.alert('Error', 'Missing member ID or event ID');
        return;
      }

      const location = isBus ? `Bus ${selectedBusNumber}` : selectedPrasadamTime;

      const request: UpdateCountRequest = {
        eventId: selectedEventId,
        actionId,
        count,
        location,
        scannerMemberId: internalMemberId,
      };

      const response = await updateCount(request);

      if (response.status === 'success' && response.data) {
        logAction('Count updated successfully', { actionId, count, totalCount: response.data.totalCount });
        setCount(response.data.totalCount);
        Alert.alert('Success', `Count updated successfully. Total: ${response.data.totalCount}`);
      } else {
        logError('Failed to update count', 'handleCountUpdate');
        Alert.alert('Error', 'Failed to update count');
      }
    } catch (error) {
      logError(error, 'handleCountUpdate');
      Alert.alert('Error', 'Failed to update count');
    } finally {
      setLoading(false);
    }
  };

  const navigateToDaypassStats = () => {
    logAction('Navigating to Daypass Activity Stats');
    (navigation as any).navigate(Routes.DaypassActivityStats);
  };

  const navigateToRishikeshKirtanActivityStats = () => {
    logAction('Navigating to Rishikesh Kirtan Activity Stats');
    (navigation as any).navigate(Routes.RishikeshKirtanActivityStats);
  };

  const navigateToPrasadamDashboard = async () => {
    logAction('Navigating to Prasadam Dashboard');
    // Get meals for the current event
    try {
      const eventId = selectedEventId || await getString('selectedEventId');
      if (!eventId) {
        Alert.alert('Error', 'No event selected');
        return;
      }

      setIsLoadingMeals(true);
      const meals = await getMeals(eventId);
      setIsLoadingMeals(false);

      if (meals && meals.length > 0) {
        setAvailableMeals(meals);

        // Check if there's a previously selected meal for this event
        const lastMealId = await AsyncStorage.getItem(`lastMealId_${eventId}`);
        const lastMealName = await AsyncStorage.getItem(`lastMealName_${eventId}`);

        // Validate that the saved meal still exists in the available meals
        const mealStillExists = lastMealId && meals.some(m => m.meal_id === lastMealId);

        if (lastMealId && lastMealName && mealStillExists) {
          // Auto-navigate to the last selected meal
          logAction('Using last selected meal', { eventId, mealId: lastMealId, mealName: lastMealName });
          (navigation as any).navigate(Routes.PrasadamDashboard, {
            mealId: lastMealId,
            mealName: lastMealName,
          });
        } else {
          // No previous selection or saved meal no longer exists, show meal picker
          if (lastMealId && !mealStillExists) {
            console.log('[HomeScreen] Saved meal no longer exists, clearing and showing picker');
            await AsyncStorage.removeItem(`lastMealId_${eventId}`);
            await AsyncStorage.removeItem(`lastMealName_${eventId}`);
          }
          setShowMealModal(true);
        }
      } else {
        Alert.alert('No meals found', 'No meals configured for this event. Please contact admin.');
      }
    } catch (error) {
      setIsLoadingMeals(false);
      logError(error, 'navigateToPrasadamDashboard');
      Alert.alert('Error', 'Failed to load meals: ' + (error as Error).message);
    }
  };

  const handleMealSelect = async (meal: Meal) => {
    setShowMealModal(false);
    const eventId = selectedEventId || await getString('selectedEventId');

    // Build display name with day and meal type
    const dayNames = ['', 'Friday', 'Saturday', 'Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday'];
    const dayName = meal.day_number ? dayNames[meal.day_number] || `Day ${meal.day_number}` : '';
    const mealType = meal.meal_type || 'Meal';
    const mealName = meal.meal_name || `${dayName} ${mealType}`.trim() || mealType;

    if (eventId) {
      // Store the selected meal for this event
      await AsyncStorage.setItem(`lastMealId_${eventId}`, meal.meal_id);
      await AsyncStorage.setItem(`lastMealName_${eventId}`, mealName);
      logAction('Meal selection saved', { eventId, mealId: meal.meal_id, mealName });
    }
    (navigation as any).navigate(Routes.PrasadamDashboard, {
      mealId: meal.meal_id,
      mealName,
    });
  };

  const isCheckMealDisabled = !selectedLane;

  const handleGiftScan = (tagId: string) => {
    navigation.navigate('GiftApproval', {
      tag: { id: tagId },
    });
  };

  const renderEventButtons = () => {
    const buttons: React.ReactElement[] = [];

    // Special handling for Rishikesh Kirtan Fest event
    if (selectedEventId === 'RishikeshKirtanFest2026') {
      buttons.push(
        <TouchableOpacity
          key="rishikesh-scan"
          style={styles.button}
          onPress={navigateToRishikeshKirtanScan}
        >
          <Ionicons name="qr-code-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Scan Attendee</Text>
        </TouchableOpacity>
      );

      // Show Activity Stats button to all users
      buttons.push(
        <TouchableOpacity
          key="rishikesh-stats"
          style={styles.button}
          onPress={navigateToRishikeshKirtanActivityStats}
        >
          <Ionicons name="analytics-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Activity Stats</Text>
        </TouchableOpacity>
      );

      return buttons;
    }

    // Show traditional scanners if they're in scansInThisEvent
    if (scansInThisEvent.includes('Meals')) {
      buttons.push(
        <TouchableOpacity
          key="meal"
          style={[styles.button, isCheckMealDisabled && styles.disabledButton]}
          onPress={navigateToMealScanner}
          disabled={isCheckMealDisabled}
        >
          <Ionicons name="restaurant-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>{t('meals.title')}</Text>
        </TouchableOpacity>
      );
    }

    if (scansInThisEvent.includes('Gifts') && showGiftButton) {
      buttons.push(
        <TouchableOpacity
          key="gift"
          style={styles.button}
          onPress={navigateToGiftScanner}
        >
          <Ionicons name="gift-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>{t('gifts.title')}</Text>
        </TouchableOpacity>
      );
    }

    if (scansInThisEvent.includes('RegistrationTag')) {
      buttons.push(
        <TouchableOpacity
          key="register"
          style={styles.button}
          onPress={navigateToRegisterTag}
        >
          <Ionicons name="person-add-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>{t('tags.title')}</Text>
        </TouchableOpacity>
      );
    }

    // Show Activity Stats if user has permission
    if (SessionManager.hasPermission('canViewActivityStats')) {
      buttons.push(
        <TouchableOpacity
          key="activity-stats"
          style={styles.button}
          onPress={navigateToActivityStats}
        >
          <Ionicons name="stats-chart-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Activity Stats</Text>
        </TouchableOpacity>
      );
    }

    // Show Prasadam Dashboard if user has permission
    if (SessionManager.hasPermission('canViewPrasadamStats')) {
      buttons.push(
        <TouchableOpacity
          key="prasadam-dashboard"
          style={[styles.button, { backgroundColor: '#5dbea3' }]}
          onPress={navigateToPrasadamDashboard}
        >
          <Ionicons name="restaurant-outline" size={24} color="#fff" />
          <Text style={styles.buttonText}>Prasadam Dashboard</Text>
        </TouchableOpacity>
      );
    }

    // Show separate redeem buttons if daypass is available
    if (!scansInThisEvent.includes('Meals') && !scansInThisEvent.includes('Gifts') && !scansInThisEvent.includes('RegistrationTag')) {
      if (scansInThisEvent.includes('Daypass')) {
        if (SessionManager.hasPermission('canScanDaypassBus')) {
          buttons.push(
            <TouchableOpacity
              key="redeem-bus"
              style={styles.button}
              onPress={navigateToRedeemBus}
            >
              <Ionicons name="bus-outline" size={24} color="#fff" />
              <Text style={styles.buttonText}>{t('daypass.redeemBus')}</Text>
            </TouchableOpacity>
          );
        }
        
        if (SessionManager.hasPermission('canScanDaypassPrasadam')) {
          buttons.push(
            <TouchableOpacity
              key="redeem-prasadam"
              style={styles.button}
              onPress={navigateToRedeemPrasadam}
            >
              <Ionicons name="restaurant-outline" size={24} color="#fff" />
              <Text style={styles.buttonText}>{t('daypass.redeemPrasadam')}</Text>
            </TouchableOpacity>
          );
        }
      }
    }

    return buttons;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {isInitialLoading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5dbea3" />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : (
        <ScrollView style={styles.scrollContainer}>
          <View style={styles.content}>
          <View style={styles.headerRow}>
            <TouchableOpacity style={styles.languageButton} onPress={handleLanguageChange}>
              <Ionicons name="language-outline" size={24} color="#5dbea3" />
            </TouchableOpacity>
            <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
              <Ionicons name="log-out-outline" size={24} color="#5dbea3" />
            </TouchableOpacity>
          </View>
          {userName ? <Text style={styles.welcomeText}>{t('home.welcome')} {userName}</Text> : null}
          {selectedEventName ? <Text style={styles.eventText}>{t('home.event')}: {selectedEventName}</Text> : null}

        {/* Count Update Buttons for Daypass */}
        
        {false && scansInThisEvent.includes('Daypass') && 
         (SessionManager.hasPermission('canScanDaypassBus') || SessionManager.hasPermission('canScanDaypassPrasadam')) && (
          <View style={styles.countUpdateContainer}>
            {/* Bus Count Update */}
            {SessionManager.hasPermission('canScanDaypassBus') && (
              <View style={styles.countRow}>
                <TouchableOpacity
                  style={[styles.countButton, isUpdatingBusCount && styles.countButtonDisabled]}
                  onPress={() => handleCountUpdate('bus', -1)}
                  disabled={isUpdatingBusCount}
                >
                  {isUpdatingBusCount ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.countButtonText}>-1</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.countDisplay}>{busCount} (Bus)</Text>
                <TouchableOpacity
                  style={[styles.countButton, isUpdatingBusCount && styles.countButtonDisabled]}
                  onPress={() => handleCountUpdate('bus', 1)}
                  disabled={isUpdatingBusCount}
                >
                  {isUpdatingBusCount ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.countButtonText}>+1</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}

            {/* Prasadam Count Update */}
            {SessionManager.hasPermission('canScanDaypassPrasadam') && (
              <View style={styles.countRow}>
                <TouchableOpacity
                  style={[styles.countButton, isUpdatingPrasadamCount && styles.countButtonDisabled]}
                  onPress={() => handleCountUpdate('prasadam', -1)}
                  disabled={isUpdatingPrasadamCount}
                >
                  {isUpdatingPrasadamCount ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.countButtonText}>-1</Text>
                  )}
                </TouchableOpacity>
                <Text style={styles.countDisplay}>{prasadamCount} (Prasadam)</Text>
                <TouchableOpacity
                  style={[styles.countButton, isUpdatingPrasadamCount && styles.countButtonDisabled]}
                  onPress={() => handleCountUpdate('prasadam', 1)}
                  disabled={isUpdatingPrasadamCount}
                >
                  {isUpdatingPrasadamCount ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Text style={styles.countButtonText}>+1</Text>
                  )}
                </TouchableOpacity>
              </View>
            )}
          </View>
        )}

        {/* Render buttons based on event type */}
        <View style={styles.buttonsContainer}>
          {renderEventButtons()}

          {/* Daypass Activity Stats */}
          {scansInThisEvent.includes('Daypass') &&
           (SessionManager.hasPermission('canScanDaypassBus') || SessionManager.hasPermission('canScanDaypassPrasadam')) && (
            <TouchableOpacity style={styles.button} onPress={navigateToDaypassStats}>
              <Ionicons name="analytics-outline" size={24} color="#fff" />
              <Text style={styles.buttonText}>{t('home.daypassStats')}</Text>
            </TouchableOpacity>
          )}
        </View>

        {/* Show lane picker only for meal scanning - moved below buttons to avoid overlap */}
        {scansInThisEvent.includes('Meals') && (
          <View style={styles.pickerContainer}>
            <Picker
              selectedValue={selectedLane || ''}
              onValueChange={handleLaneSelect}
              style={styles.picker}
              itemStyle={styles.pickerItem}
              mode="dropdown"
            >
              <Picker.Item label="-- Select Lane --" value="" />
              <Picker.Item label="Lane 1" value="1" />
              <Picker.Item label="Lane 2" value="2" />
              <Picker.Item label="Lane 3" value="3" />
              <Picker.Item label="Lane 4" value="4" />
              <Picker.Item label="Lane 5" value="5" />
              <Picker.Item label="Lane 6" value="6" />
              <Picker.Item label="Elders & Kids" value="7" />
              <Picker.Item label="Outdoor Lane" value="8" />
              <Picker.Item label="Vegan Lane" value="9" />
              <Picker.Item label="VIP Lane" value="10" />
              <Picker.Item label="Fast Lane" value="11" />
            </Picker>
          </View>
        )}
        </View>
      </ScrollView>
      )}

      {/* Meal Selection Modal for Prasadam Dashboard */}
      <MealSelectionModal
        visible={showMealModal}
        meals={availableMeals}
        loading={isLoadingMeals}
        onSelect={handleMealSelect}
        onClose={() => setShowMealModal(false)}
      />

      {/* Meal Picker Modal for Meal Scanning */}
      <MealPickerModal
        visible={showMealPicker}
        meals={availableEventMeals}
        currentMeal={selectedEventMeal}
        loading={false}
        onSelect={handleEventMealSelect}
        onClose={() => setShowMealPicker(false)}
      />
    </View>
  );
};

const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    flex: 1,
    justifyContent: 'flex-start',
    alignItems: 'center',
    paddingTop: 20,
    paddingBottom: 40,
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 10,
    textAlign: 'center',
  },
  eventText: {
    fontSize: 16,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 10,
  },
  logoContainer: {
    width: windowWidth * 0.75,
    alignItems: 'center',
    marginTop: 20,
  },
  logo: {
    width: '100%',
    height: 200,
    resizeMode: 'contain',
  },
  button: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#5dbea3',
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginVertical: 10,
    borderRadius: 10,
    width: '70%',
    justifyContent: 'center',
  },
  disabledButton: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
    marginLeft: 8,
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 10,
  },
  languageButton: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  logoutButton: {
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  pickerContainer: {
    width: '90%',
    marginBottom: 20,
    marginTop: 20,
    alignSelf: 'center',
  },
  picker: {
    height: 50,
    width: '100%',
    backgroundColor: '#fff',
    borderRadius: 10,
    borderWidth: 1,
    borderColor: '#5dbea3',
  },
  pickerItem: {
    fontSize: 16,
    color: '#333',
  },
  dropdownContainer: {
    width: '80%',
    marginBottom: 20,
    marginTop: 20,
  },
  dropdownLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
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
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  countUpdateContainer: {
    width: '100%',
    marginBottom: 20,
    paddingHorizontal: 20,
  },
  countRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    marginBottom: 10,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  countButton: {
    backgroundColor: '#4CAF50',
    borderRadius: 25,
    width: 50,
    height: 50,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  countButtonDisabled: {
    backgroundColor: '#ccc',
  },
  countButtonText: {
    color: '#fff',
    fontSize: 18,
    fontWeight: 'bold',
  },
  countDisplay: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
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
    width: '80%',
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
  busList: {
    maxHeight: 300,
  },
  busOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  busOptionSelected: {
    backgroundColor: '#f8f9fa',
  },
  busOptionText: {
    fontSize: 16,
    color: '#333',
  },
  busOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});

export default HomeScreen;


