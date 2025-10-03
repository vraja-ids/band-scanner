import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { SafeAreaView } from 'react-native-safe-area-context';
import type { ScannerParams, RouteName } from '../../../routes/index';

type Props = {
  navigation: any;
  route: { params?: Partial<ScannerParams> };
};

export default function Scanner({ navigation, route }: Props) {
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isScanningEnabled, setIsScanningEnabled] = useState(true);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const cameraRef = useRef<any>(null);

  useEffect(() => {
    if (cameraPermission?.status !== 'granted') {
      requestCameraPermission();
    }
  }, []);

  useEffect(() => {
    const unsubscribe = navigation?.addListener?.('focus', () => {
      setIsScanningEnabled(true);
    });
    return unsubscribe;
  }, [navigation]);

  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (isScanningEnabled) {
      setIsScanningEnabled(false);
      if (route?.params?.screen) {
        const screenName = route.params.screen as RouteName;
        if (screenName === 'Daypass') {
          navigation.replace(screenName, {
            dayPassNumber: data,
          });
        } else {
          navigation.replace(screenName, {
            location: route.params.location,
            tag: { id: data },
          });
        }
      } else {
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
    setFacing((current) => (current === 'back' ? 'front' : 'back'));
  };

  const goToPreviousScreen = () => {
    navigation.goBack();
  };

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
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
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
        <TouchableOpacity style={styles.button} onPress={toggleCameraFacing}>
          <Text style={styles.buttonText}>Flip Camera</Text>
        </TouchableOpacity>

        <TouchableOpacity style={styles.button} onPress={takePicture}>
          <Text style={styles.buttonText}>Take Picture</Text>
        </TouchableOpacity>
      </View>

      {navigation && (
        <TouchableOpacity style={[styles.button, styles.homeButton]} onPress={goToPreviousScreen}>
          <Text style={styles.buttonText}>Go Back</Text>
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


