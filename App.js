import React from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createStackNavigator } from '@react-navigation/stack';
import ActivityStatsScreen from './ActivityStatsScreen';
import BarcodeScannerScreen from './BarcodeScannerScreen';
import RegisterTagScreen from './RegisterTagScreen';
import MealScanScreen from './MealScanScreen';
import HomeScreen from './HomeScreen';


const Stack = createStackNavigator();

function App() {
  return (
    <NavigationContainer>
      <Stack.Navigator initialRouteName="Home">
        <Stack.Screen name="Home" component={HomeScreen} options={{ headerShown: false }} />
        <Stack.Screen name="BarcodeScanner" component={BarcodeScannerScreen} options={{ headerShown: false }} />
        <Stack.Screen name="RegisterTag" component={RegisterTagScreen} />
        <Stack.Screen name="MealScan" component={MealScanScreen} />
          <Stack.Screen name="ActivityStats" component={ActivityStatsScreen} />
      </Stack.Navigator>
    </NavigationContainer>
  );
}

export default App;
