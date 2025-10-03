import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, StyleSheet, Dimensions, ScrollView, ActivityIndicator, Alert, SafeAreaView } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Picker } from '@react-native-picker/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Ionicons } from '@expo/vector-icons';
import Routes from '../../routes/index';
import { SessionManager } from '../../storage/SessionManager';
import { getString, Keys, setString } from '../../storage/Session';
import { useBaseScreen } from '../common/util/useBaseScreen';

const HomeScreen = () => {
  const { logAction, logError } = useBaseScreen({ screenName: 'HomeScreen' });
  const navigation: any = useNavigation();
  const [selectedLane, setSelectedLane] = useState<string | null>(null);
  const [showGiftButton, setShowGiftButton] = useState(false);
  const [userName, setUserName] = useState('');
  const [canScanOthersQr, setCanScanOthersQr] = useState(false);
  const [scansInThisEvent, setScansInThisEvent] = useState<string[]>([]);
  const [selectedEventName, setSelectedEventName] = useState('');
  const [selectedBusNumber, setSelectedBusNumber] = useState<string>('1');
  const route: any = useRoute();

  useEffect(() => {
    checkGiftPermissions();
    loadUserName();
    loadEventData();
  }, []);

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
      const busNumber = await getString(Keys.SELECTED_BUS_NUMBER);
      
      if (scansData) {
        const scans = JSON.parse(scansData);
        logAction('Event data loaded', { scans, eventName, busNumber });
        setScansInThisEvent(scans);
      }
      if (eventName) {
        setSelectedEventName(eventName);
      }
      if (busNumber) {
        setSelectedBusNumber(busNumber);
      }
    } catch (error) {
      logError(error, 'loadEventData');
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

  const handleLogout = () => {
    logAction('Logout confirmation requested');
    Alert.alert(
      'Logout',
      'Are you sure you want to logout?',
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Yes, Logout',
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
    navigation.navigate(Routes.Scanner, { location: selectedLane, screen: Routes.MealScan });
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

  const navigateToDaypass = () => {
    navigation.navigate(Routes.Scanner, {
      screen: Routes.Daypass,
      message: 'Scan Daypass QR Code',
    });
  };

  const handleBusNumberChange = async (busNumber: string) => {
    setSelectedBusNumber(busNumber);
    try {
      await setString(Keys.SELECTED_BUS_NUMBER, busNumber);
    } catch (error) {
      console.error('Error saving bus number:', error);
    }
  };

  const handleLogoPress = () => {};

  const handleLaneSelect = (lane: string | null) => {
    setSelectedLane(lane);
  };

  const isCheckMealDisabled = selectedLane === null;

  const handleGiftScan = (tagId: string) => {
    navigation.navigate('GiftApproval', {
      tag: { id: tagId },
    });
  };

  const renderEventButtons = () => {
    const buttons: React.ReactElement[] = [];

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
          <Text style={styles.buttonText}>Check Meal</Text>
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
          <Text style={styles.buttonText}>Gift Approval</Text>
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
          <Text style={styles.buttonText}>Register Tag</Text>
        </TouchableOpacity>
      );
    }

    // Show daypass scanner if traditional ones are not available
    if (!scansInThisEvent.includes('Meals') && !scansInThisEvent.includes('Gifts') && !scansInThisEvent.includes('RegistrationTag')) {
      if (scansInThisEvent.includes('Daypass') && 
          (SessionManager.hasPermission('canScanDaypassBus') || SessionManager.hasPermission('canScanDaypassPrasadam'))) {
        buttons.push(
          <TouchableOpacity
            key="daypass"
            style={styles.button}
            onPress={navigateToDaypass}
          >
            <Ionicons name="card-outline" size={24} color="#fff" />
            <Text style={styles.buttonText}>Daypass Scanner</Text>
          </TouchableOpacity>
        );
      }
    }

    return buttons;
  };

  return (
    <SafeAreaView style={styles.container}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.content}>
          <TouchableOpacity style={styles.logoutButton} onPress={handleLogout}>
            <Ionicons name="log-out-outline" size={24} color="#5dbea3" />
          </TouchableOpacity>
          {userName ? <Text style={styles.welcomeText}>Hare Krishna! {userName}</Text> : null}
          {selectedEventName ? <Text style={styles.eventText}>Event: {selectedEventName}</Text> : null}
        {/* Show lane picker only for meal scanning */}
        {scansInThisEvent.includes('Meals') && (
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Select Lane:</Text>
            <Picker selectedValue={selectedLane} onValueChange={handleLaneSelect} style={styles.picker}>
              <Picker.Item label="Select Lane" value={null} />
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

        {/* Show bus number picker for daypass scanning */}
        {!scansInThisEvent.includes('Meals') && !scansInThisEvent.includes('Gifts') && !scansInThisEvent.includes('RegistrationTag') && 
         scansInThisEvent.includes('Daypass') && 
         (SessionManager.hasPermission('canScanDaypassBus') || SessionManager.hasPermission('canScanDaypassPrasadam')) && (
          <View style={styles.pickerContainer}>
            <Text style={styles.pickerLabel}>Select Bus Number:</Text>
            <Picker 
              selectedValue={selectedBusNumber} 
              onValueChange={handleBusNumberChange} 
              style={styles.picker}
            >
              {Array.from({ length: 12 }, (_, i) => i + 1).map(num => (
                <Picker.Item key={num} label={`Bus ${num}`} value={num.toString()} />
              ))}
            </Picker>
          </View>
        )}

        {/* Render buttons based on event type */}
        <View style={styles.buttonsContainer}>
          {renderEventButtons()}
          
          {/* Always show activity stats if user has permission */}
          {SessionManager.hasPermission('canViewActivityStats') && (
            <TouchableOpacity style={styles.button} onPress={navigateToActivityStats}>
              <Ionicons name="stats-chart-outline" size={24} color="#fff" />
              <Text style={styles.buttonText}>Activity Stats</Text>
            </TouchableOpacity>
          )}
        </View>
        </View>
      </ScrollView>
    </SafeAreaView>
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
    justifyContent: 'center',
    alignItems: 'center',
    paddingTop: 20,
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
  logoutButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 10,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
  },
  pickerContainer: {
    width: '80%',
    marginBottom: 30,
    marginTop: 20,
  },
  pickerLabel: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  picker: {
    height: 50,
    width: '100%',
  },
  buttonsContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
});

export default HomeScreen;


