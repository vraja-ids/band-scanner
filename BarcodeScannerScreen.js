import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Camera } from 'expo-camera';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button } from 'react-native-paper';

export default function BarcodeScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);

  const [refreshKey, setRefreshKey] = useState(0); // Key for re-rendering Camera component
  const cameraRef = useRef(null); // Ref for accessing Camera methods

  const navigation = useNavigation();
  const route = useRoute();

  const [focus, setFocus] = useState(Camera.Constants.AutoFocus.on); // Define AutoFocus here

  const updateCameraFocus = () => setFocus(Camera.Constants.AutoFocus.off); // Use Camera.Constants.AutoFocus

  // Switch autofocus back to "on" after 50ms, this refocuses the camera
  useEffect(() => {
    if (focus !== Camera.Constants.AutoFocus.off) return;
    const timeout = setTimeout(() => setFocus(Camera.Constants.AutoFocus.on), 50);
    return () => clearTimeout(timeout);
  }, [focus]);

  // Refocus camera every 2 seconds
  useEffect(() => {
    const interval = setInterval(() => updateCameraFocus(), 2000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    navigation.navigate(route.params.screen, { tag: { id: data } });
  };

  useEffect(() => {
    const scanInterval = setInterval(() => {
      setScanned(false); // Reset scanned state for continuous scanning
    }, 3000); // Scan every 3 seconds
    return () => clearInterval(scanInterval);
  }, []);

  const handleManualScan = () => {
    setScanned(false); // Reset scanned state for manual scan
  };

  const goToHomeScreen = () => {
    navigation.navigate('Home');
  };

  if (hasPermission === null) {
    return <View style={styles.container}><Text>Requesting camera permission...</Text></View>;
  }
  if (hasPermission === false) {
    return <View style={styles.container}><Text>No access to camera</Text></View>;
  }

  return (
    <View style={styles.container}>
      <View style={styles.cameraContainer}>
        <Camera
          ref={cameraRef}
          key={refreshKey}
          style={styles.camera}
          type={Camera.Constants.Type.back}
          autoFocus={focus} // Use autoFocus prop
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
      </View>
      <Button mode="contained" onPress={handleManualScan} style={styles.button}>Manual Scan</Button>
      <Button mode="contained" onPress={goToHomeScreen} style={styles.button}>Go to Home Screen</Button>
      <Button mode="contained" onPress={updateCameraFocus} style={styles.button}>Reset Focus</Button>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  cameraContainer: {
    flex: 0.5, // Take half of the screen height
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '80%', // Adjust the camera width as needed
    aspectRatio: 1, // Maintain aspect ratio for the camera
  },
  button: {
    marginTop: 20,
    width: '80%',
  },
});

