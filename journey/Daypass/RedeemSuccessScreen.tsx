import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useBaseScreen } from '../common/util/useBaseScreen';
import { SessionManager } from '../../storage/SessionManager';
import { updateDayPassStatus } from './DaypassViewModel';
import { getString, Keys } from '@/storage/Session';

export default function RedeemSuccessScreen() {
  const { logAction } = useBaseScreen({ screenName: 'RedeemSuccessScreen' });
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const { type, isUnredeem, dayPassNumber, errorMessage, isError, canUnredeem, daypassDetails } = route.params as {
    type: 'bus' | 'prasadam';
    isUnredeem?: boolean;
    dayPassNumber?: string; // Only needed for error cases
    errorMessage?: string;
    isError?: boolean;
    canUnredeem?: boolean;
    daypassDetails?: any;
  };

  // Get values from SessionManager
  const busNumber = (SessionManager as any).getData('selectedRedeemBusNumber') || '';
  const prasadamTime = (SessionManager as any).getData('selectedRedeemPrasadamTime') || '';
  
  // State for handling unredeem action
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentDaypassDetails, setCurrentDaypassDetails] = useState(daypassDetails);
  const [currentIsUnredeem, setCurrentIsUnredeem] = useState(isUnredeem);
  const [currentIsError, setCurrentIsError] = useState(isError);


  const handleScanNext = () => {
    logAction('Scan next button pressed', { type, busNumber, prasadamTime });
    // Replace current screen with scanner to prevent stack accumulation
    (navigation as any).replace('Scanner', {
      screen: type === 'bus' ? 'RedeemBusScan' : 'RedeemPrasadamScan',
      type: type
    });
  };

  const handleRedeem = () => {
    logAction('Redeem button pressed', { type, busNumber, prasadamTime, dayPassNumber });
    // Replace current screen with scanner for redemption
    (navigation as any).replace('Scanner', {
      screen: type === 'bus' ? 'RedeemBusScan' : 'RedeemPrasadamScan',
      type: type
    });
  };

  const handleUnredeem = async () => {
    if (!dayPassNumber) {
      Alert.alert(t('common.error'), t('daypass.daypassNumberNotAvailable'));
      return;
    }

    setIsProcessing(true);
    logAction('Unredeem button pressed', { type, busNumber, prasadamTime, dayPassNumber });

    try {
      // Get current session data
      const eventId = await getString('selectedEventId');
      const scannerMemberId = await getString(Keys.INTERNAL_MEMBER_ID);

      if (!eventId || !scannerMemberId) {
        Alert.alert(t('common.error'), t('daypass.sessionDataNotAvailable'));
        setIsProcessing(false);
        return;
      }

      // Get lane from SessionManager for prasadam
      const lane = (SessionManager as any).getData('selectedRedeemLane') || '';
      
      // For bus: actionId = 'bus', actionDetails = 'Bus X'
      // For prasadam: actionId = meal time (Breakfast/Lunch/Dinner), actionDetails = 'Lane X'
      const actionId = type === 'bus' ? 'bus' : prasadamTime;
      const actionDetails = type === 'bus' ? `Bus ${busNumber}` : lane;

      // Call unredeem API
      const response = await updateDayPassStatus({
        dayPassNumber: dayPassNumber,
        eventId: eventId,
        action: 'unredeem',
        actionId: actionId as any,
        actionDetails: actionDetails,
        scannerMemberId: scannerMemberId
      });

      if (response.status === 'success') {
        // Update state to show success - no need to call getDaypassStatus again
        setCurrentIsError(false);
        setCurrentIsUnredeem(true);
        logAction('Unredeem successful', { dayPassNumber, type });
      } else {
        Alert.alert(t('common.error'), response.status === 'error' ? response.message : t('daypass.failedToUnredeem'));
      }
    } catch (error) {
      logAction('Unredeem error', { error: (error as Error).message });
      Alert.alert(t('common.error'), t('daypass.failedToUnredeem'));
    } finally {
      setIsProcessing(false);
    }
  };

  const handleBackToHome = () => {
    logAction('Back to home pressed');
    (navigation as any).navigate('Home');
  };

  const getTitle = () => {
    if (currentIsUnredeem) {
      return type === 'bus' ? `Unredeemed for Bus ${busNumber}` : `Unredeemed for ${prasadamTime}`;
    } else {
      return type === 'bus' ? `Redeemed for Bus ${busNumber}` : `Redeemed for ${prasadamTime}`;
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Status Icon */}
          <View style={styles.iconContainer}>
            <Ionicons 
              name={currentIsError ? "close-circle" : "checkmark-circle"} 
              size={80} 
              color={currentIsError ? "#f44336" : "#4CAF50"} 
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {currentIsError ? t('daypass.redeemFailed') : getTitle()}
          </Text>

          {/* Error Message */}
          {currentIsError && errorMessage && (
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          )}

          {/* Daypass Details */}
          { currentDaypassDetails && currentIsError && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>{t('daypass.daypassDetails')}</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('daypass.daypassNumber')}:</Text>
                <Text style={styles.detailValue}>{currentDaypassDetails.daypassNumber}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('daypass.purchaser')}:</Text>
                <Text style={styles.detailValue}>{currentDaypassDetails.purchaserName}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>{t('daypass.daypassName')}:</Text>
                <Text style={styles.detailValue}>{currentDaypassDetails.daypassName}</Text>
              </View>

              {/* Bus Status */}
              {currentDaypassDetails.statusDetails?.bus && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('daypass.busStatus')}:</Text>
                  <Text style={styles.detailValue}>{currentDaypassDetails.statusDetails.bus}</Text>
                </View>
              )}

              {/* Prasadam Status */}
              {currentDaypassDetails.statusDetails?.Breakfast && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('daypass.breakfast')}:</Text>
                  <Text style={styles.detailValue}>{currentDaypassDetails.statusDetails.Breakfast}</Text>
                </View>
              )}
              {currentDaypassDetails.statusDetails?.Lunch && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('daypass.lunch')}:</Text>
                  <Text style={styles.detailValue}>{currentDaypassDetails.statusDetails.Lunch}</Text>
                </View>
              )}
              {currentDaypassDetails.statusDetails?.Dinner && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>{t('daypass.dinner')}:</Text>
                  <Text style={styles.detailValue}>{currentDaypassDetails.statusDetails.Dinner}</Text>
                </View>
              )}

              {/* Scanner Alert */}
              {currentDaypassDetails.scannerAlert && (
                <View style={styles.alertContainer}>
                  <Ionicons name="warning" size={20} color="#ff9800" />
                  <Text style={styles.alertText}>{t('daypass.scannerAlert')}</Text>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {currentIsError ? (
              canUnredeem ? (
                <TouchableOpacity 
                  style={[styles.unredeemButton, isProcessing && styles.buttonDisabled]}
                  onPress={handleUnredeem}
                  disabled={isProcessing}
                >
                  {isProcessing ? (
                    <ActivityIndicator size="small" color="#fff" />
                  ) : (
                    <Ionicons name="close-circle-outline" size={24} color="#fff" />
                  )}
                  <Text style={styles.unredeemButtonText}>
                    {isProcessing ? t('daypass.processing') : t('daypass.unredeem')}
                  </Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.redeemButton}
                  onPress={handleRedeem}
                >
                  <Ionicons name="refresh-outline" size={24} color="#fff" />
                  <Text style={styles.redeemButtonText}>{t('daypass.redeem')}</Text>
                </TouchableOpacity>
              )
            ) : (
              <TouchableOpacity 
                style={styles.scanNextButton}
                onPress={handleScanNext}
              >
                <Ionicons name="qr-code-outline" size={24} color="#fff" />
                <Text style={styles.scanNextButtonText}>{t('daypass.scanNext')}</Text>
              </TouchableOpacity>
            )}

            <TouchableOpacity 
              style={styles.homeButton}
              onPress={handleBackToHome}
            >
              <Ionicons name="home-outline" size={24} color="#4CAF50" />
              <Text style={styles.homeButtonText}>{t('common.backToHome')}</Text>
            </TouchableOpacity>
          </View>
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContainer: {
    flex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 20,
  },
  iconContainer: {
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginBottom: 40,
    lineHeight: 24,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  scanNextButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  scanNextButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  homeButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4CAF50',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  homeButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorMessage: {
    fontSize: 16,
    color: '#f44336',
    textAlign: 'center',
    marginBottom: 20,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    width: '100%',
    maxWidth: 400,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  detailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    flex: 1,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    textAlign: 'right',
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3cd',
    padding: 10,
    borderRadius: 8,
    marginTop: 10,
  },
  alertText: {
    color: '#856404',
    fontSize: 14,
    fontWeight: '600',
    marginLeft: 8,
  },
  redeemButton: {
    backgroundColor: '#f44336',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  redeemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  unredeemButton: {
    backgroundColor: '#ff9800',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 16,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  unredeemButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  buttonDisabled: {
    opacity: 0.6,
  },
});
