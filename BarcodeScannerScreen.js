import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { Camera, CameraView } from 'expo-camera';
import { BarcodeScanningResult, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';

export default function BarcodeScannerScreen({ navigation, route }) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isScanningEnabled, setIsScanningEnabled] = useState(true);
  const [facing, setFacing] = useState('back');
  const cameraRef = useRef(null);

  useEffect(() => {
    // Request camera permission on component mount if needed
    if (cameraPermission?.status !== 'granted') {
      requestCameraPermission();
    }
  }, []);

  // Reset scanning state when screen is focused
  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      setIsScanningEnabled(true);
    });

    return unsubscribe;
  }, [navigation]);

  const handleBarCodeScanned = ({ type, data }) => {
    if (isScanningEnabled) {
      setIsScanningEnabled(false);
      
      // If the screen was opened from another screen with params, navigate back with data
      if (route?.params?.screen) {
        navigation.navigate(route.params.screen, { 
          location: route.params.location, 
          tag: { id: data } 
        });
      } else {
        // Otherwise just log the scanned data
        console.log(`Bar code with type ${type} and data ${data} has been scanned!`);
        // Re-enable scanning after 1 second
        setTimeout(() => setIsScanningEnabled(true), 1000);
      }
    }
  };

  const takePicture = async () => {
    if (cameraRef.current) {
      try {
        const photo = await cameraRef.current.takePictureAsync();
        console.log('Picture taken:', photo.uri);
      } catch (error) {
        console.error('Error taking picture:', error);
      }
    }
  };

  const toggleCameraFacing = () => {
    setFacing(current => (current === 'back' ? 'front' : 'back'));
  };

  const goToHomeScreen = () => {
    navigation?.navigate('Home');
  };

  // Render different content based on permission status
  if (cameraPermission === null) {
    return (
      <SafeAreaView style={styles.container}>
        <Text>Requesting camera permission...</Text>
      </SafeAreaView>
    );
  }

  if (cameraPermission?.status !== 'granted') {
    return (
      <SafeAreaView style={styles.container}>
        <Text style={styles.permissionText}>Camera permission is required to scan barcodes</Text>
        <TouchableOpacity 
          style={styles.button} 
          onPress={requestCameraPermission}
        >
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container}>
      <View style={styles.cameraContainer}>
        <CameraView
          ref={cameraRef}
          style={styles.camera}
          facing={facing}
          barcodeScannerSettings={{
            barcodeTypes: ['qr', 'ean13', 'code128', 'code39', 'upc_e'],
          }}
          onBarcodeScanned={isScanningEnabled ? handleBarCodeScanned : undefined}
        />
        {route?.params?.message && (
          <View style={styles.messageContainer}>
            <Text style={styles.messageText}>{route.params.message}</Text>
          </View>
        )}
      </View>
      
      <View style={styles.buttonsRow}>
        <TouchableOpacity 
          style={styles.button}
          onPress={toggleCameraFacing}
        >
          <Text style={styles.buttonText}>Flip Camera</Text>
        </TouchableOpacity>
        
        <TouchableOpacity 
          style={styles.button}
          onPress={takePicture}
        >
          <Text style={styles.buttonText}>Take Picture</Text>
        </TouchableOpacity>
      </View>
      
      {navigation && (
        <TouchableOpacity 
          style={[styles.button, styles.homeButton]}
          onPress={goToHomeScreen}
        >
          <Text style={styles.buttonText}>Go to Home</Text>
        </TouchableOpacity>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#f0f0f0',
  },
  cameraContainer: {
    width: '100%',
    height: '70%',
    overflow: 'hidden',
    position: 'relative',
  },
  camera: {
    flex: 1,
    width: '100%',
    height: '100%',
  },
  messageContainer: {
    position: 'absolute',
    top: 20,
    left: 0,
    right: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    padding: 10,
    alignItems: 'center',
  },
  messageText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
  },
  buttonsRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    width: '100%',
    paddingHorizontal: 20,
    marginTop: 20,
  },
  button: {
    backgroundColor: '#3ABEF9',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 10,
    marginHorizontal: 10,
  },
  homeButton: {
    marginTop: 20,
    backgroundColor: '#34c759',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
    textAlign: 'center',
  },
  permissionText: {
    fontSize: 16,
    marginBottom: 20,
    textAlign: 'center',
    paddingHorizontal: 20,
  },
});