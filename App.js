import React, { useState, useEffect } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import ActivityStatsScreen from './ActivityStatsScreen';
import BarcodeScannerScreen from './BarcodeScannerScreen';
import RegisterTagScreen from './RegisterTagScreen';
import MealScanScreen from './MealScanScreen';
import HomeScreen from './HomeScreen';
import LoginScreen from './LoginScreen';
import GiftApprovalScreen from './GiftApprovalScreen';
import ServiceApprovalScreen from './ServiceApprovalScreen';

const Stack = createStackNavigator();

function App() {
  const [isLoggedIn, setIsLoggedIn] = useState(null);

  useEffect(() => {
    checkLoginStatus();
  }, []);

  const checkLoginStatus = async () => {
    try {
      const memberId = await AsyncStorage.getItem('memberId');
      setIsLoggedIn(!!memberId);
    } catch (error) {
      console.error('Error checking login status:', error);
      setIsLoggedIn(false);
    }
  };

  if (isLoggedIn === null) {
    return null; // Or a loading screen
  }

  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={isLoggedIn ? "Home" : "Login"}>
        <Stack.Screen 
          name="Login" 
          component={LoginScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="Home" 
          component={HomeScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="BarcodeScanner" 
          component={BarcodeScannerScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name="RegisterTag" 
          component={RegisterTagScreen} 
        />
        <Stack.Screen 
          name="MealScan" 
          component={MealScanScreen} 
        />
        <Stack.Screen 
          name="ActivityStats" 
          component={ActivityStatsScreen} 
        />
        <Stack.Screen 
          name="GiftApproval" 
          component={GiftApprovalScreen}
          options={{ title: 'Gift Approval' }}
        />
        <Stack.Screen 
          name="ServiceApproval" 
          component={ServiceApprovalScreen}
          options={{ title: 'Service Approval' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
