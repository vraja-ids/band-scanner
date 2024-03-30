import React from 'react';
import { View, TouchableOpacity, Text, Image, StyleSheet, Linking, Dimensions } from 'react-native';
import { useNavigation } from '@react-navigation/native';

const HomeScreen = () => {
  const navigation = useNavigation();

  const navigateToBarcodeScannerForTag = () => {
    navigation.navigate('BarcodeScanner', { screen: 'RegisterTag' });
  };

  const navigateToBarcodeScannerForMeal = () => {
    navigation.navigate('BarcodeScanner', { screen: 'MealScan' });
  };
    
  const navigateToActivityStats = () => {
      navigation.navigate('ActivityStats', { screen: 'ActivityStats' });
    };

  const handleLogoPress = () => {
    // Define your logo URL here
    const logoUrl = 'https://storage.googleapis.com/sadhu-sanga/1/2024/01/WhatsApp-Image-2024-01-04-at-11.58.13-AM.jpeg';
    Linking.openURL(logoUrl);
  };

  return (
    <View style={styles.container}>
      <TouchableOpacity onPress={handleLogoPress} style={styles.logoContainer}>
        <Image source={{ uri: 'https://storage.googleapis.com/sadhu-sanga/1/2024/01/WhatsApp-Image-2024-01-04-at-11.58.13-AM.jpeg' }} style={styles.logo} />
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={navigateToBarcodeScannerForTag}>
        <Text style={styles.buttonText}>Register Tag</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={navigateToBarcodeScannerForMeal}>
        <Text style={styles.buttonText}>Meal Scan</Text>
      </TouchableOpacity>
      <TouchableOpacity style={styles.button} onPress={navigateToActivityStats}>
      <Text style={styles.buttonText}>ActivtyStats</Text>
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

