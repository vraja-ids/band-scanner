import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useBaseScreen } from '../common/util/useBaseScreen';
import { SessionManager } from '../../storage/SessionManager';

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

  const handleUnredeem = () => {
    logAction('Unredeem button pressed', { type, busNumber, prasadamTime, dayPassNumber });
    // Navigate to scanner for unredeem action
    (navigation as any).replace('Scanner', {
      screen: type === 'bus' ? 'RedeemBusScan' : 'RedeemPrasadamScan',
      type: type,
      isUnredeem: true
    });
  };

  const handleBackToHome = () => {
    logAction('Back to home pressed');
    (navigation as any).navigate('Home');
  };

  const getTitle = () => {
    if (isUnredeem) {
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
              name={isError ? "close-circle" : (isUnredeem ? "close-circle" : "checkmark-circle")} 
              size={80} 
              color={isError ? "#f44336" : (isUnredeem ? "#f44336" : "#4CAF50")} 
            />
          </View>

          {/* Title */}
          <Text style={styles.title}>
            {isError ? 'Redeem Failed' : getTitle()}
          </Text>

          {/* Error Message */}
          {isError && errorMessage && (
            <Text style={styles.errorMessage}>{errorMessage}</Text>
          )}

          {/* Daypass Details */}
          {daypassDetails && (
            <View style={styles.detailsContainer}>
              <Text style={styles.detailsTitle}>Daypass Details</Text>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Daypass Number:</Text>
                <Text style={styles.detailValue}>{daypassDetails.daypassNumber}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Purchaser:</Text>
                <Text style={styles.detailValue}>{daypassDetails.purchaserName}</Text>
              </View>
              
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Daypass Name:</Text>
                <Text style={styles.detailValue}>{daypassDetails.daypassName}</Text>
              </View>

              {/* Bus Status */}
              {daypassDetails.statusDetails?.bus && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Bus Status:</Text>
                  <Text style={styles.detailValue}>{daypassDetails.statusDetails.bus}</Text>
                </View>
              )}

              {/* Prasadam Status */}
              {daypassDetails.statusDetails?.prasadam && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Prasadam Status:</Text>
                  <Text style={styles.detailValue}>{daypassDetails.statusDetails.prasadam}</Text>
                </View>
              )}

              {/* Scanner Alert */}
              {daypassDetails.scannerAlert && (
                <View style={styles.alertContainer}>
                  <Ionicons name="warning" size={20} color="#ff9800" />
                  <Text style={styles.alertText}>Scanner Alert</Text>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {isError ? (
              canUnredeem ? (
                <TouchableOpacity 
                  style={styles.unredeemButton}
                  onPress={handleUnredeem}
                >
                  <Ionicons name="close-circle-outline" size={24} color="#fff" />
                  <Text style={styles.unredeemButtonText}>Unredeem</Text>
                </TouchableOpacity>
              ) : (
                <TouchableOpacity 
                  style={styles.redeemButton}
                  onPress={handleRedeem}
                >
                  <Ionicons name="refresh-outline" size={24} color="#fff" />
                  <Text style={styles.redeemButtonText}>Redeem</Text>
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
});
