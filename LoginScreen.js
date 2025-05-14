import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Image, TouchableOpacity, ActivityIndicator } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Camera, CameraView } from 'expo-camera';
import { api } from './services/api';

const checkPermissionInArray = (permissions, permission) => {
  return Array.isArray(permissions) && permissions.includes(permission);
};

const LoginScreen = () => {
  const [hasPermission, setHasPermission] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    checkExistingLogin();
  }, []);

  // Handle scan result when returning from BarcodeScanner
  useEffect(() => {
    if (route.params?.tag?.id) {
      handleBarCodeScanned({ data: route.params.tag.id });
      // Clear the params to prevent re-processing
      navigation.setParams({ tag: undefined });
    }
  }, [route.params?.tag]);

  const checkExistingLogin = async () => {
    try {
      const memberId = await AsyncStorage.getItem('memberId');
      if (memberId) {
        await handleLoginScanner(null, memberId);
      }
    } catch (error) {
      console.error('Error checking login:', error);
    }
  };

  const handleLoginScanner = async (tagId, memberId) => {
    try {
      setIsLoading(true);
      const loginData = await api.get('loginScanner', {
        tagId: tagId,
        memberId: memberId,
        eventId: 'USASadhuSanga2025'
      });
      
      if (loginData && loginData.scannerLoginResponse) {
        const response = loginData.scannerLoginResponse;
        const permissions = response.memberPermissions || [];
        
        // Store memberId from response with default empty string
        await AsyncStorage.setItem('memberId', JSON.stringify(response.memberId));
        // Store the boolean values based on array presence
        await AsyncStorage.setItem('canScanOthersQr', JSON.stringify(checkPermissionInArray(permissions, 'canScanOthersQr')));
        await AsyncStorage.setItem('canApproveGiftTshirt', JSON.stringify(checkPermissionInArray(permissions, 'canApproveGiftTshirt')));
        await AsyncStorage.setItem('canApproveGiftJacket', JSON.stringify(checkPermissionInArray(permissions, 'canApproveGiftJacket')));
        await AsyncStorage.setItem('canFulfillGiftTshirt', JSON.stringify(checkPermissionInArray(permissions, 'canFulfillGiftTshirt')));
        await AsyncStorage.setItem('canFulfillGiftJacket', JSON.stringify(checkPermissionInArray(permissions, 'canFulfillGiftJacket')));
        
        // Store user's name
        await AsyncStorage.setItem('legalName', response.legalName);
        await AsyncStorage.setItem('spiritualName', response.spiritualName);
        
        // Use replace instead of navigate to prevent going back to login
        navigation.reset({
          index: 0,
          routes: [{ name: 'Home' }],
        });
      }
    } catch (error) {
      console.error('Error in loginScanner:', error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = async ({ data }) => {
    setIsLoading(true);
    try {
      const json = await api.get('loginScanner', {
        tagId: data,
        eventId: 'USASadhuSanga2025'
      });
      
      if (json.scannerLoginResponse && json.scannerLoginResponse.memberId) {
        await handleLoginScanner(data, null); // Pass tagId when scanning
      } else {
        alert('Invalid QR code or member not found');
      }
    } catch (error) {
      console.error('Error scanning QR code:', error);
      alert('Error scanning QR code');
    } finally {
      setIsLoading(false);
    }
  };

  const startScanning = () => {
    navigation.navigate('BarcodeScanner', {
      screen: 'Login'
    });
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      <Image 
        source={require('./assets/Logo.jpg')}
        style={styles.logo}
        resizeMode="contain"
      />
      <TouchableOpacity 
        style={styles.button}
        onPress={startScanning}
        disabled={isLoading}
      >
        {isLoading ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text style={styles.buttonText}>Scan your own Band to Login</Text>
        )}
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#fff',
  },
  logo: {
    width: '80%',
    height: 200,
    marginBottom: 40,
    resizeMode: 'contain',
  },
  button: {
    backgroundColor: '#5dbea3',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    width: '80%',
    alignItems: 'center',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default LoginScreen; 