import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { useBaseScreen } from '../common/util/useBaseScreen';
import { updateDayPassStatus } from '../Daypass/DaypassViewModel';
import { getString, Keys } from '../../storage/Session';
import type { GetDaypassStatusResponse } from '../Daypass/models/api';

type RouteParams = {
  isSuccess: boolean;
  dayPassNumber?: string;
  errorMessage?: string;
  daypassDetails?: GetDaypassStatusResponse['daypassDetails'];
};

export default function RishikeshKirtanRedeemSuccessScreen() {
  const { logAction, logError } = useBaseScreen({ screenName: 'RishikeshKirtanRedeemSuccessScreen' });
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  // State for unredeem action
  const [isUnredeeming, setIsUnredeeming] = useState(false);
  const [currentIsSuccess, setCurrentIsSuccess] = useState<boolean | null>(null);

  // Get params from route
  const route = navigation.getState()?.routes?.[(navigation as any).getState()?.index];
  const params = route?.params as RouteParams;

  const { isSuccess, dayPassNumber, errorMessage, daypassDetails } = params || {};

  // Use local state for success to allow updating after unredeem
  const displaySuccess = currentIsSuccess !== null ? currentIsSuccess : isSuccess;

  const handleScanNext = () => {
    logAction('Scan next button pressed');
    (navigation as any).replace('Scanner', {
      screen: 'RishikeshKirtanScan',
    });
  };

  const handleBackToHome = () => {
    logAction('Back to home pressed');
    (navigation as any).navigate('Home');
  };

  const handleUnredeem = async () => {
    if (!dayPassNumber) {
      Alert.alert('Error', 'Day pass number not available');
      return;
    }

    setIsUnredeeming(true);
    logAction('Unredeem button pressed', { dayPassNumber });

    try {
      const eventId = await getString('selectedEventId');
      const scannerMemberId = await getString(Keys.INTERNAL_MEMBER_ID);

      if (!eventId || !scannerMemberId) {
        Alert.alert('Error', 'Missing event ID or scanner member ID');
        setIsUnredeeming(false);
        return;
      }

      const response = await updateDayPassStatus({
        dayPassNumber,
        eventId,
        action: 'unredeem',
        actionId: 'entrance-gate',
        actionDetails: 'lane1',
        scannerMemberId,
      });

      if (response.status === 'success') {
        logAction('Pass unredeemed successfully', { dayPassNumber });

        // Show success alert and navigate back to scanner
        Alert.alert(
          'Success',
          `Pass #${dayPassNumber} has been unredeemed successfully.`,
          [
            {
              text: 'OK',
              onPress: () => {
                (navigation as any).replace('Scanner', {
                  screen: 'RishikeshKirtanScan',
                });
              }
            }
          ],
          { cancelable: false }
        );
      } else {
        logError('Failed to unredeem pass', 'handleUnredeem');
        Alert.alert(
          'Failed',
          response.message || 'Failed to unredeem pass. Please try again.',
          [{ text: 'OK' }]
        );
      }
    } catch (error) {
      logError(error, 'handleUnredeem');
      Alert.alert(
        'Error',
        'Failed to unredeem pass. Please check your connection and try again.',
        [{ text: 'OK' }]
      );
    } finally {
      setIsUnredeeming(false);
    }
  };

  const theme = displaySuccess
    ? {
        primary: '#4CAF50',
        primaryLight: '#E8F5E9',
        background: '#F1F8E9',
        text: '#1B5E20',
        iconName: 'checkmark-circle' as const,
        title: 'Pass Redeemed Successfully!',
        message: `Pass #${dayPassNumber} has been redeemed for Rishikesh Kirtan Fest 2026.`,
      }
    : {
        primary: '#F44336',
        primaryLight: '#FFEBEE',
        background: '#FFEBEE',
        text: '#B71C1C',
        iconName: 'close-circle' as const,
        title: daypassDetails?.status === 'redeemed' ? 'Already Redeemed' : 'Redemption Failed',
        message: errorMessage || 'Failed to redeem the pass. Please try again.',
      };

  // Show unredeem button if pass is already redeemed
  const canUnredeem = !displaySuccess && daypassDetails?.status === 'redeemed';

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Status Icon */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={theme.iconName}
              size={100}
              color={theme.primary}
            />
          </View>

          {/* Title */}
          <Text style={[styles.title, { color: theme.text }]}>
            {theme.title}
          </Text>

          {/* Message */}
          <Text style={[styles.message, { color: theme.text }]}>
            {theme.message}
          </Text>

          {/* Daypass Details - Show on error or if available */}
          {daypassDetails && (
            <View style={[styles.detailsContainer, { backgroundColor: '#fff' }]}>
              <Text style={styles.detailsTitle}>Pass Details</Text>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pass Number:</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {daypassDetails.daypassNumber}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Name:</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {daypassDetails.purchaserName}
                </Text>
              </View>

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Pass Type:</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {daypassDetails.daypassName}
                </Text>
              </View>

              {/* City and Country combined */}
              {(daypassDetails.city || daypassDetails.country) && (
                <View style={styles.detailRow}>
                  <Text style={styles.detailLabel}>Location:</Text>
                  <Text style={[styles.detailValue, { color: theme.text }]}>
                    {[daypassDetails.city, daypassDetails.country].filter(Boolean).join(', ')}
                  </Text>
                </View>
              )}

              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Status:</Text>
                <Text style={[styles.detailValue, { color: theme.primary, fontWeight: 'bold' }]}>
                  {(daypassDetails.status || 'unknown').toUpperCase()}
                </Text>
              </View>

              {/* Scanner Alert */}
              {daypassDetails.scannerAlert === true && (
                <View style={[styles.alertContainer, { backgroundColor: '#FFF3CD' }]}>
                  <Ionicons name="warning" size={20} color="#FF9800" />
                  <Text style={styles.alertText}>Scanner Alert: This pass has special attention</Text>
                </View>
              )}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.buttonContainer}>
            {/* Unredeem button - only show if already redeemed */}
            {canUnredeem && (
              <TouchableOpacity
                style={[styles.unredeemButton, isUnredeeming && styles.buttonDisabled]}
                onPress={handleUnredeem}
                disabled={isUnredeeming}
              >
                {isUnredeeming ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="refresh-outline" size={24} color="#fff" />
                    <Text style={styles.unredeemButtonText}>Unredeem Daypass</Text>
                  </>
                )}
              </TouchableOpacity>
            )}

            <TouchableOpacity
              style={[styles.scanNextButton, { backgroundColor: theme.primary }]}
              onPress={handleScanNext}
            >
              <Ionicons name="qr-code-outline" size={24} color="#fff" />
              <Text style={styles.scanNextButtonText}>Scan Next</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.homeButton, { borderColor: theme.primary }]}
              onPress={handleBackToHome}
            >
              <Ionicons name="home-outline" size={24} color={theme.primary} />
              <Text style={[styles.homeButtonText, { color: theme.primary }]}>Back to Home</Text>
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
    alignItems: 'center',
    padding: 20,
    paddingVertical: 40,
  },
  iconContainer: {
    marginBottom: 20,
    alignItems: 'center',
  },
  title: {
    fontSize: 26,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 16,
  },
  message: {
    fontSize: 16,
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 20,
    lineHeight: 24,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 20,
    marginBottom: 30,
    width: '100%',
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
    fontWeight: '500',
  },
  alertContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 10,
    borderRadius: 8,
    marginTop: 15,
  },
  alertText: {
    color: '#856404',
    fontSize: 12,
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    width: '100%',
    maxWidth: 300,
  },
  scanNextButton: {
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
  unredeemButton: {
    backgroundColor: '#FF9800',
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
  homeButton: {
    backgroundColor: '#fff',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    borderWidth: 2,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  homeButtonText: {
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});
