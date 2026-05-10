import React from 'react';
import { StatusBar } from 'react-native';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import './i18n'; // Initialize i18n
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
import DaypassActivityStatsScreen from './journey/Daypass/DaypassActivityStatsScreen';
import RedeemBusScreen from './journey/Daypass/RedeemBusScreen';
import RedeemPrasadamScreen from './journey/Daypass/RedeemPrasadamScreen';
import RedeemSuccessScreen from './journey/Daypass/RedeemSuccessScreen';
import LanguageSelectionScreen from './journey/Login/LanguageSelectionScreen';
import RishikeshKirtanScanScreen from './journey/RishikeshKirtanFest/RishikeshKirtanScanScreen';
import RishikeshKirtanRedeemSuccessScreen from './journey/RishikeshKirtanFest/RishikeshKirtanRedeemSuccessScreen';
import RishikeshKirtanActivityStatsScreen from './journey/RishikeshKirtanFest/RishikeshKirtanActivityStatsScreen';
import InflowComparisonScreen from './journey/RishikeshKirtanFest/InflowComparisonScreen';
import BackgroundStatsService from './services/BackgroundStatsService';
import { initializePrasadamService } from './services/PrasadamSupabaseService';
import PrasadamDashboardScreen from './journey/PrasadamDistribution/PrasadamDashboardScreen';
import MealSettingsScreen from './journey/PrasadamDistribution/MealSettingsScreen';
import BhogaHomeScreen from './journey/BhogaTracker/BhogaHomeScreen';
import BhogaAlertsScreen from './journey/BhogaTracker/BhogaAlertsScreen';
import BhogaAdminScreen from './journey/BhogaTracker/BhogaAdminScreen';
import BhogaMealScreen from './journey/BhogaTracker/BhogaMealScreen';
import BhogaStorageScreen from './journey/BhogaTracker/BhogaStorageScreen';
import BhogaDeliveryScreen from './journey/BhogaTracker/BhogaDeliveryScreen';
import BhogaStorageMoveScreen from './journey/BhogaTracker/BhogaStorageMoveScreen';

const Stack = createNativeStackNavigator();

export default function App() {
  return (
    <>
      <StatusBar
        barStyle="dark-content"
        backgroundColor="#000000"
        translucent={false}
      />
      <BackgroundStatsService />
      <NavigationContainer>
      <Stack.Navigator initialRouteName={Routes.LoginSplash}>
        <Stack.Screen 
          name={Routes.LoginSplash}
          component={SplashScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name={Routes.LanguageSelection}
          component={LanguageSelectionScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name={Routes.LoginEmail}
          component={EmailLoginScreen} 
          options={{ headerShown: false }} 
        />
        <Stack.Screen 
          name={Routes.LoginOtp}
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
          name={Routes.RedeemBus}
          component={RedeemBusScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen 
          name={Routes.RedeemPrasadam}
          component={RedeemPrasadamScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.RedeemSuccess}
          component={RedeemSuccessScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.RishikeshKirtanScan}
          component={RishikeshKirtanScanScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.RishikeshKirtanRedeemSuccess}
          component={RishikeshKirtanRedeemSuccessScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.RishikeshKirtanActivityStats}
          component={RishikeshKirtanActivityStatsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.InflowComparison}
          component={InflowComparisonScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.PrasadamDashboard}
          component={PrasadamDashboardScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.MealSettings}
          component={MealSettingsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.BhogaHome}
          component={BhogaHomeScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.BhogaAlerts}
          component={BhogaAlertsScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.BhogaAdmin}
          component={BhogaAdminScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.BhogaMeal}
          component={BhogaMealScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.BhogaStorage}
          component={BhogaStorageScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.BhogaDelivery}
          component={BhogaDeliveryScreen}
          options={{ headerShown: false }}
        />
        <Stack.Screen
          name={Routes.BhogaStorageMove}
          component={BhogaStorageMoveScreen}
          options={{ headerShown: false }}
        />
      </Stack.Navigator>
    </NavigationContainer>
    </>
  );
}


