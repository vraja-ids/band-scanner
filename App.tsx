import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import Routes from './routes/index';
import ActivityStatsScreen from './journey/Home/ActivityStatsScreen';
import Scanner from './journey/common/util/Scanner';
import RegisterTagScreen from './journey/Tags/RegisterTagScreen';
import MealScanScreen from './journey/Meals/MealScanScreen';
import HomeScreen from './journey/Home/HomeScreen';
import GiftApprovalScreen from './journey/Gifts/GiftApprovalScreen';
import ServiceApprovalScreen from './journey/Services/ServiceApprovalScreen';
import EmailLoginScreen from './journey/Login/EmailLoginScreen';
import OtpVerifyScreen from './journey/Login/OtpVerifyScreen';
import SplashScreen from './journey/Login/SplashScreen';
import EventSelectionScreen from './journey/Login/EventSelectionScreen';
import DaypassScreen from './journey/Daypass/DaypassScreen';
import DaypassActivityStatsScreen from './journey/Daypass/DaypassActivityStatsScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName={Routes.Login + 'Splash'}>
        <Stack.Screen 
          name={Routes.Login + 'Splash'}
          component={SplashScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name={Routes.Login + 'Email'}
          component={EmailLoginScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name={Routes.Login + 'Otp'}
          component={OtpVerifyScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name={Routes.EventSelection}
          component={EventSelectionScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name={Routes.Home}
          component={HomeScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name={Routes.Scanner}
          component={Scanner} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name={Routes.RegisterTag}
          component={RegisterTagScreen} 
        />
        <Stack.Screen 
          name={Routes.MealScan}
          component={MealScanScreen} 
        />
        <Stack.Screen 
          name={Routes.ActivityStats}
          component={ActivityStatsScreen} 
        />
        <Stack.Screen 
          name={Routes.DaypassActivityStats}
          component={DaypassActivityStatsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name={Routes.GiftApproval}
          component={GiftApprovalScreen}
          options={{ title: 'Gift Approval' }}
        />
        <Stack.Screen 
          name={Routes.ServiceApproval}
          component={ServiceApprovalScreen}
          options={{ title: 'Service Approval' }}
        />
        <Stack.Screen 
          name={Routes.Daypass}
          component={DaypassScreen}
          options={{ title: 'Daypass Management' }}
        />
      </Stack.Navigator>
    </NavigationContainer>
  );
}


