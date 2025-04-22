import React from 'react';
import { View, TouchableOpacity, Text, Image, StyleSheet, Linking, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import {Picker} from '@react-native-community/picker';


const HomeScreen = () => {
  const navigation = useNavigation();

  const navigateToBarcodeScannerForTag = () => {
    navigation.navigate('BarcodeScanner', {location : selectedLane, screen: 'RegisterTag' });
  };

  const navigateToBarcodeScannerForMeal = () => {
    navigation.navigate('BarcodeScanner', {location : selectedLane, screen: 'MealScan' });
  };
    
  const navigateToActivityStats = () => {
      navigation.navigate('ActivityStats', {location : selectedLane, screen: 'ActivityStats' });
    };

  const handleLogoPress = () => {
    // Define your logo URL here
    const logoUrl = 'https://storage.googleapis.com/sadhu-sanga/1/2024/01/WhatsApp-Image-2024-01-04-at-11.58.13-AM.jpeg';
    Linking.openURL(logoUrl);
  };

  const [selectedLane, setSelectedLane] = React.useState(null);
  const isCheckMealDisabled = selectedLane === null;

  const handleLaneSelect = (lane) => {
    setSelectedLane(lane);
  };


  return (
    
    <View style={styles.container}>
            <Picker
              selectedValue={selectedLane}
              onValueChange={handleLaneSelect}
              style={{margin: 100, height: 50, width: '80%' }}>
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
        <Image source={{ uri: 'https://storage.googleapis.com/sadhu-sanga/1/2024/01/WhatsApp-Image-2024-01-04-at-11.58.13-AM.jpeg' }} style={styles.logo} />
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
    </View>
  );
};

const windowWidth = Dimensions.get('window').width;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  logoContainer: {
    width: windowWidth * 0.75, // 75% of the screen width
    alignItems: 'center',
    marginTop: 20, // Margin from the top
  },
  logo: {
    width: '100%', // Full width of the container
    aspectRatio: 4/3, // Adjust aspect ratio as needed
    resizeMode: 'contain',
  },
  button: {
    backgroundColor: '#5dbea3',
    paddingVertical: 15,
    paddingHorizontal: 30,
    marginVertical: 10,
    borderRadius: 10,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default HomeScreen;

