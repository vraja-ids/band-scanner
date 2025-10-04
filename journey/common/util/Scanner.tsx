import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, Alert, ActivityIndicator } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { updateDayPassStatus, getDaypassStatus } from '../../Daypass/DaypassViewModel';
import { getString, Keys } from '../../../storage/Session';
import { SessionManager } from '../../../storage/SessionManager';
import { useBaseScreen } from '../util/useBaseScreen';
import type { ScannerParams, RouteName } from '../../../routes/index';

type Props = {
  navigation: any;
  route: { params?: Partial<ScannerParams> };
};

export default function Scanner({ navigation, route }: Props) {
  const { logAction, logError } = useBaseScreen({ screenName: 'Scanner' });
  const [cameraPermission, requestCameraPermission] = useCameraPermissions();
  const [isScanningEnabled, setIsScanningEnabled] = useState(true);
  const [facing, setFacing] = useState<'back' | 'front'>('back');
  const [isProcessing, setIsProcessing] = useState(false);
  const cameraRef = useRef<any>(null);
  const insets = useSafeAreaInsets();

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

  const handleRedeemScan = async (dayPassNumber: string) => {
    if (isProcessing) return;
    
    setIsProcessing(true);
    setIsScanningEnabled(false);
    
    try {
      const { type, isUnredeem } = route.params as any;
      const internalMemberId = await getString(Keys.INTERNAL_MEMBER_ID);
      const selectedEventId = await getString('selectedEventId');
      
      if (!internalMemberId || !selectedEventId) {
        logError('Missing member ID or event ID', 'handleRedeemScan');
        Alert.alert('Error', 'Missing member ID or event ID');
        return;
      }

      // Get values from SessionManager
      const busNumber = (SessionManager as any).getData('selectedRedeemBusNumber') || '';
      const prasadamTime = (SessionManager as any).getData('selectedRedeemPrasadamTime') || '';
      const location = type === 'bus' ? `Bus ${busNumber}` : prasadamTime;
      
      const res = await updateDayPassStatus({
        dayPassNumber,
        action: isUnredeem ? 'unredeem' : 'redeem',
        actionId: type as 'bus' | 'prasadam',
        actionDetails: location,
        scannerMemberId: internalMemberId,
        eventId: selectedEventId,
      });

      if (res.status === 'success') {
        logAction('Redeem successful', { dayPassNumber, type, location });
        navigation.replace('RedeemSuccess', {
          type,
          isUnredeem: isUnredeem || false,
          isError: false
        });
      } else {
        logError('Redeem failed', 'handleRedeemScan');
        await handleRedeemError(dayPassNumber, type, busNumber, prasadamTime, res?.status === 'error' ? res?.message : 'Redeem failed');
      }
    } catch (error) {
      logError(error, 'handleRedeemScan');
      const type = route.params?.type || 'bus';
      const busNumber = (SessionManager as any).getData('selectedRedeemBusNumber') || '';
      const prasadamTime = (SessionManager as any).getData('selectedRedeemPrasadamTime') || '';
      await handleRedeemError(dayPassNumber, type, busNumber, prasadamTime, (error as any)?.message || 'Redeem failed');
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRedeemError = async (dayPassNumber: string, type: string, busNumber?: string, prasadamTime?: string, redeemError?: string) => {
    try {
      logAction('Handling redeem error', { dayPassNumber, type, busNumber, prasadamTime, redeemError });
      const eventId = await getString('selectedEventId');
      const scannerMemberId = await getString(Keys.INTERNAL_MEMBER_ID);
      
      if (!eventId || !scannerMemberId) {
        Alert.alert('Error', 'Missing event ID or member ID');
        return;
      }
      
      const response = await getDaypassStatus({ 
        dayPassNumber,
        eventId,
        scannerMemberId
      });
      
      if (response.status === 'success' && response.data) {
        const daypassData = response.data.daypassDetails;
        const hasBusStatus = daypassData.statusDetails.bus && daypassData.statusDetails.bus.length > 0;
        const hasPrasadamStatus = daypassData.statusDetails.prasadam && daypassData.statusDetails.prasadam.length > 0;
        
        let canUnredeem = false;
        
        if (type === 'bus' && hasBusStatus) {
          canUnredeem = true;
        } else if (type === 'prasadam' && hasPrasadamStatus) {
          const hasMatchingPrasadam = daypassData.statusDetails.prasadam?.includes(prasadamTime || 'ABCDEFGH');
          if (hasMatchingPrasadam) canUnredeem = true;
        }
        
        // Navigate to RedeemSuccessScreen with error information
        navigation.replace('RedeemSuccess', {
          type,
          isError: true,
          errorMessage: redeemError,
          dayPassNumber,
          canUnredeem,
          daypassDetails: daypassData
        });
      } else {
        // Navigate to RedeemSuccessScreen with generic error
        navigation.replace('RedeemSuccess', {
          type,
          isError: true,
          errorMessage: 'Failed to get daypass status',
          dayPassNumber,
          canUnredeem: false,
          daypassDetails: null
        });
      }
    } catch (error) {
      logError(error, 'handleRedeemError');
      // Navigate to RedeemSuccessScreen with error
      navigation.replace('RedeemSuccess', {
        type,
        isError: true,
        errorMessage: 'Failed to get daypass status',
        dayPassNumber,
        canUnredeem: false,
        daypassDetails: null
      });
    }
  };


  const handleBarCodeScanned = ({ type, data }: { type: string; data: string }) => {
    if (isScanningEnabled && !isProcessing) {
      const screenName = route.params?.screen as RouteName;
      
      // Handle redeem scanning
      if (screenName === 'RedeemBusScan' || screenName === 'RedeemPrasadamScan') {
        handleRedeemScan(data);
        return;
      }
      
      // Handle other scanning
      setIsScanningEnabled(false);
      if (screenName === 'Daypass') {
        navigation.replace(screenName, {
          dayPassNumber: data,
        });
      } else if (screenName) {
        navigation.replace(screenName, {
          location: route.params?.location,
          tag: { id: data },
        });
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
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text>Requesting camera permission...</Text>
      </View>
    );
  }

  if (cameraPermission?.status !== 'granted') {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <Text style={styles.permissionText}>Camera permission is required to scan barcodes</Text>
        <TouchableOpacity style={styles.button} onPress={requestCameraPermission}>
          <Text style={styles.buttonText}>Grant Permission</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
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
        
        {isProcessing && (
          <View style={styles.processingContainer}>
            <ActivityIndicator size="large" color="#fff" />
            <Text style={styles.processingText}>Processing...</Text>
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
    </View>
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
  processingContainer: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.7)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  processingText: {
    color: 'white',
    fontSize: 16,
    fontWeight: 'bold',
    marginTop: 10,
  },
});


