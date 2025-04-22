import React, { useState, useEffect, useRef } from 'react';
import { Text, View, StyleSheet } from 'react-native';
import { Camera } from 'expo-camera/legacy';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Button } from 'react-native-paper';

export default function BarcodeScannerScreen() {
  const [hasPermission, setHasPermission] = useState(null);
  const [scanned, setScanned] = useState(false);
  const [scanCount, setScanCount] = useState(0);

  const cameraRef = useRef(null);
  const navigation = useNavigation();
  const route = useRoute();

  useEffect(() => {
    (async () => {
      const { status } = await Camera.requestCameraPermissionsAsync();
      setHasPermission(status === 'granted');
    })();
  }, []);

  useEffect(() => {
    if (navigation.isFocused()) {
      // Reset scanned state and do other necessary actions when screen is focused
      setScanned(false);
    }
  }, [navigation]);

  const handleBarCodeScanned = ({ type, data }) => {
    setScanned(true);
    setScanCount(prevCount => prevCount + 1);
    navigation.navigate(route.params.screen, { location: route.params.location, tag: { id: data } });
  };

  useEffect(() => {
    const scanInterval = setInterval(() => {
      setScanned(false);
    }, 3000);
    return () => clearInterval(scanInterval);
  }, []);


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
          style={styles.camera}
          type={Camera.Constants.Type.back}
          autoFocus={Camera.Constants.AutoFocus.on}
          useCamera2Api
          onBarCodeScanned={scanned ? undefined : handleBarCodeScanned}
        />
      </View>
      <Button mode="contained" onPress={goToHomeScreen} style={styles.button}>Go to Home Screen</Button>
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
    flex: 0.5,
    width: '100%',
    justifyContent: 'center',
    alignItems: 'center',
  },
  camera: {
    width: '80%',
    aspectRatio: 1,
  },
  button: {
    marginTop: 20,
    width: '80%',
  },
  scanCountText: {
    fontSize: 18,
    marginTop: 10,
  },
}); 