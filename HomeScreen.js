import React, { useEffect, useState } from 'react';
import { View, TouchableOpacity, Text, Image, StyleSheet, Linking, Dimensions, ScrollView, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import {Picker} from '@react-native-community/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './services/api';
import { Ionicons } from '@expo/vector-icons';

const HomeScreen = () => {
  const navigation = useNavigation();
  const [selectedLane, setSelectedLane] = useState(null);
  const [showGiftButton, setShowGiftButton] = useState(false);
  const [userName, setUserName] = useState('');
  const [canScanOthersQr, setCanScanOthersQr] = useState(false);
  const route = useRoute();

  useEffect(() => {
    checkGiftPermissions();
    loadUserName();
  }, []);

    // Add effect to handle scan result
    useEffect(() => {
      if (route?.params?.tag?.id) {
        handleGiftScan(route.params.tag.id);
        // Clear the params to prevent re-processing
        navigation.setParams({ tag: undefined });
      }
    }, [route?.params?.tag]);

  const loadUserName = async () => {
    try {
      const spiritualName = await AsyncStorage.getItem('spiritualName');
      const legalName = await AsyncStorage.getItem('legalName');
      setUserName(spiritualName || legalName);
    } catch (error) {
      console.error('Error loading user name:', error);
    }
  };

  const checkGiftPermissions = async () => {
    try {
      const canScanOthersQr = JSON.parse(await AsyncStorage.getItem('canScanOthersQr'));
      const canApproveTshirt = JSON.parse(await AsyncStorage.getItem('canApproveGiftTshirt'));
      const canApproveJacket = JSON.parse(await AsyncStorage.getItem('canApproveGiftJacket'));
      const canFulfillTshirt = JSON.parse(await AsyncStorage.getItem('canFulfillGiftTshirt'));
      const canFulfillJacket = JSON.parse(await AsyncStorage.getItem('canFulfillGiftJacket'));
      setCanScanOthersQr(canScanOthersQr);
      setShowGiftButton(canApproveTshirt || canApproveJacket || canFulfillTshirt || canFulfillJacket);
    } catch (error) {
      console.error('Error checking gift permissions:', error);
    }
  };

  const handleLogout = async () => {
    try {
      // Clear all stored data
      await AsyncStorage.removeItem('memberId');
      await AsyncStorage.removeItem('canScanOthersQr');
      await AsyncStorage.removeItem('canApproveGiftTshirt');
      await AsyncStorage.removeItem('canApproveGiftJacket');
      await AsyncStorage.removeItem('canFulfillGiftTshirt');
      await AsyncStorage.removeItem('canFulfillGiftJacket');
      await AsyncStorage.removeItem('legalName');
      await AsyncStorage.removeItem('spiritualName');
      
      // Navigate to Login screen
      navigation.reset({
        index: 0,
        routes: [{ name: 'Login' }],
      });
    } catch (error) {
      console.error('Error during logout:', error);
      Alert.alert('Error', 'Failed to logout');
    }
  };

  const navigateToBarcodeScannerForTag = () => {
    navigation.navigate('BarcodeScanner', {location : selectedLane, screen: 'RegisterTag' });
  };

  const navigateToBarcodeScannerForMeal = () => {
    navigation.navigate('BarcodeScanner', {location : selectedLane, screen: 'MealScan' });
  };
    
  const navigateToActivityStats = () => {
    navigation.navigate('ActivityStats', {location : selectedLane, screen: 'ActivityStats' });
  };

  const navigateToGiftScanner = () => {
    navigation.navigate('BarcodeScanner', {
      screen: 'GiftApproval',
      message: 'Scan their QR for approving'
    });
  };

  const navigateToServiceApproval = () => {
    navigation.navigate('BarcodeScanner', {
      screen: 'ServiceApproval',
      message: 'Scan their QR for approving'
    });
  };

  const handleLogoPress = () => {
    // You can add any action here if needed
  };

  const handleLaneSelect = (lane) => {
    setSelectedLane(lane);
  };

  const isCheckMealDisabled = selectedLane === null;

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        <TouchableOpacity
          style={styles.logoutButton}
          onPress={handleLogout}
        >
          <Ionicons name="log-out-outline" size={24} color="#5dbea3" />
        </TouchableOpacity>
        {userName ? (
          <Text style={styles.welcomeText}>Hare Krishna! {userName}</Text>
        ) : null}
        <Picker
          selectedValue={selectedLane}
          onValueChange={handleLaneSelect}
          style={{ margin: 100, height: 50, width: '80%' }}>
          <Picker.Item label="Select Lane" value={null} />
          <Picker.Item label="Custom Lane 1" value="1" />
          <Picker.Item label="Custom Lane 2" value="2" />
          <Picker.Item label="Custom Lane 3" value="3" />
          <Picker.Item label="Custom Lane 4" value="4" />
          <Picker.Item label="Custom Lane 5" value="5" />
          <Picker.Item label="Custom Lane 6" value="6" />
          <Picker.Item label="Custom Lane 7" value="7" />
          <Picker.Item label="Custom Lane 8" value="8" />
          <Picker.Item label="Vegan Lane" value="9" />
          <Picker.Item label="VIP Lane" value="10" />
          <Picker.Item label="Fast Lane" value="11" />
        </Picker>
        <TouchableOpacity onPress={handleLogoPress} style={styles.logoContainer}>
          <Image source={require('./assets/Logo.jpg')} style={styles.logo} />
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={navigateToBarcodeScannerForTag}>
          <Text style={styles.buttonText}>Register Tag</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={navigateToBarcodeScannerForMeal} disabled={isCheckMealDisabled}>
          <Text style={styles.buttonText}>Meal Scan</Text>
        </TouchableOpacity>
        <TouchableOpacity style={styles.button} onPress={navigateToActivityStats}>
          <Text style={styles.buttonText}>Activity Stats</Text>
        </TouchableOpacity>
        {showGiftButton && (
          <TouchableOpacity style={styles.button} onPress={navigateToGiftScanner}>
            <Text style={styles.buttonText}>Approve Gifts</Text>
          </TouchableOpacity>
        )}
        {canScanOthersQr && (
          <TouchableOpacity style={styles.button} onPress={navigateToServiceApproval}>
            <Text style={styles.buttonText}>Acknowledge Services</Text>
          </TouchableOpacity>
        )}
      </View>
    </ScrollView>
  );
};

const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  scrollContainer: {
    flexGrow: 1,
  },
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  welcomeText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
    position: 'absolute',
    top: 40,
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
    alignItems: 'center',
    backgroundColor: '#5dbea3',
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginVertical: 10,
    borderRadius: 10,
    width: '70%',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
  logoutButton: {
    position: 'absolute',
    top: 60,
    right: 20,
    padding: 10,
    zIndex: 1,
    backgroundColor: 'white',
    borderRadius: 10,
  }
});

export default HomeScreen;

