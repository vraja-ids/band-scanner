import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { getDaypassStatus, updateDayPassStatus } from '../Daypass/DaypassViewModel';
import { getString, Keys } from '../../storage/Session';
import { useBaseScreen } from '../common/util/useBaseScreen';
import type { GetDaypassStatusResponse } from '../Daypass/models/api';
import Routes from '../../routes/index';

type RouteParams = {
  tag?: { id: string };
};

type ThemeColors = {
  primary: string;
  primaryLight: string;
  background: string;
  text: string;
  buttonText: string;
  success: string;
  error: string;
};

type DaypassStatus = 'active' | 'redeemed' | 'rejected' | 'unknown';

const getThemeColors = (status: DaypassStatus): ThemeColors => {
  switch (status) {
    case 'active':
      return {
        primary: '#4CAF50',
        primaryLight: '#E8F5E9',
        background: '#F1F8E9',
        text: '#1B5E20',
        buttonText: '#FFFFFF',
        success: '#2E7D32',
        error: '#C62828',
      };
    case 'redeemed':
      return {
        primary: '#FF9800',
        primaryLight: '#FFF3E0',
        background: '#FFF8E1',
        text: '#E65100',
        buttonText: '#FFFFFF',
        success: '#2E7D32',
        error: '#C62828',
      };
    case 'rejected':
      return {
        primary: '#F44336',
        primaryLight: '#FFEBEE',
        background: '#FFEBEE',
        text: '#B71C1C',
        buttonText: '#FFFFFF',
        success: '#2E7D32',
        error: '#C62828',
      };
    default:
      return {
        primary: '#4CAF50',
        primaryLight: '#E8F5E9',
        background: '#F1F8E9',
        text: '#1B5E20',
        buttonText: '#FFFFFF',
        success: '#2E7D32',
        error: '#C62828',
      };
  }
};

export default function RishikeshKirtanScanScreen() {
  const { logAction, logError } = useBaseScreen({ screenName: 'RishikeshKirtanScanScreen' });
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();

  const [daypassData, setDaypassData] = useState<GetDaypassStatusResponse['daypassDetails'] | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isProcessing, setIsProcessing] = useState(false);
  const [tagId, setTagId] = useState<string | null>(null);

  // Get current status and theme
  const currentStatus: DaypassStatus = (daypassData?.status as DaypassStatus) || 'unknown';
  const theme = getThemeColors(currentStatus);

  useEffect(() => {
    const params = route.params as RouteParams;
    if (params?.tag?.id) {
      setTagId(params.tag.id);
      fetchDaypassStatus(params.tag.id);
    }
  }, [route.params]);

  const fetchDaypassStatus = async (dayPassNumber: string) => {
    setIsLoading(true);
    logAction('Fetching daypass status', { dayPassNumber });

    try {
      const eventId = await getString('selectedEventId');
      const scannerMemberId = await getString(Keys.INTERNAL_MEMBER_ID);

      if (!eventId || !scannerMemberId) {
        Alert.alert(
          'Error',
          'Missing event ID or scanner member ID',
          [{ text: 'OK', style: 'default' }],
          { cancelable: true }
        );
        setIsLoading(false);
        return;
      }

      const response = await getDaypassStatus({
        dayPassNumber,
        eventId,
        scannerMemberId,
      });

      if (response.status === 'success' && response.data) {
        const details = response.data.daypassDetails;

        // Check if daypass data is valid (has required fields)
        if (!details || !details.daypassNumber || details.daypassNumber === 0) {
          logError('Pass not found or invalid', 'fetchDaypassStatus');
          Alert.alert(
            'Pass Not Found',
            `No pass found with number: ${dayPassNumber}\n\nPlease check the pass number and try again.`,
            [
              { text: 'Scan Another', onPress: () => handleScanNext() },
              { text: 'Go to Home', onPress: () => handleBackToHome() }
            ],
            { cancelable: false }
          );
          setIsLoading(false);
          return;
        }

        logAction('Daypass status fetched successfully', details);
        setDaypassData(details);
      } else {
        logError('Failed to fetch daypass status', 'fetchDaypassStatus');
        Alert.alert(
          'Error',
          response.message || 'Failed to fetch daypass status',
          [
            { text: 'Try Again', onPress: () => handleScanNext() },
            { text: 'Go to Home', onPress: () => handleBackToHome() }
          ],
          { cancelable: false }
        );
        handleScanNext();
      }
    } catch (error) {
      logError(error, 'fetchDaypassStatus');
      Alert.alert(
        'Error',
        'Failed to fetch daypass status. Please try again.',
        [
          { text: 'Try Again', onPress: () => handleScanNext() },
          { text: 'Go to Home', onPress: () => handleBackToHome() }
        ],
        { cancelable: false }
      );
      handleScanNext();
    } finally {
      setIsLoading(false);
    }
  };

  const getDisplayStatus = (data: GetDaypassStatusResponse['daypassDetails']) => {
    return data?.status || 'unknown';
  };

  const handleApprove = async () => {
    if (!tagId || !daypassData) return;

    setIsProcessing(true);
    logAction('Redeeming pass', { dayPassNumber: tagId });

    try {
      const eventId = await getString('selectedEventId');
      const scannerMemberId = await getString(Keys.INTERNAL_MEMBER_ID);

      if (!eventId || !scannerMemberId) {
        Alert.alert(
          'Error',
          'Missing event ID or scanner member ID',
          [{ text: 'OK' }],
          { cancelable: true }
        );
        setIsProcessing(false);
        return;
      }

      const response = await updateDayPassStatus({
        dayPassNumber: tagId,
        eventId,
        action: 'redeem',
        actionId: 'entrance-gate',
        actionDetails: 'lane1',
        scannerMemberId,
      });

      // Handle success as both boolean and string
      const isSuccess = response.status === 'success' || response.status === 'true' || response.status === true;

      if (isSuccess) {
        logAction('Pass redeemed successfully', { dayPassNumber: tagId });
        Alert.alert(
          '✓ Success',
          `Pass #${tagId} has been approved successfully!`,
          [
            { text: 'Scan Next', onPress: () => handleScanNext() }
          ],
          { cancelable: false, userInterfaceStyle: 'light' }
        );
      } else {
        logError('Failed to redeem pass', 'handleApprove');
        Alert.alert(
          '✗ Failed',
          response.message || 'Failed to approve pass. Please try again.',
          [
            { text: 'Retry', style: 'default' }
          ],
          { cancelable: true }
        );
      }
    } catch (error) {
      logError(error, 'handleApprove');
      Alert.alert(
        '✗ Error',
        'Failed to approve pass. Please check your connection and try again.',
        [
          { text: 'OK' }
        ],
        { cancelable: true }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleReject = async () => {
    if (!tagId || !daypassData) return;

    setIsProcessing(true);
    logAction('Rejecting pass', { dayPassNumber: tagId });

    try {
      const eventId = await getString('selectedEventId');
      const scannerMemberId = await getString(Keys.INTERNAL_MEMBER_ID);

      if (!eventId || !scannerMemberId) {
        Alert.alert(
          'Error',
          'Missing event ID or scanner member ID',
          [{ text: 'OK' }],
          { cancelable: true }
        );
        setIsProcessing(false);
        return;
      }

      const response = await updateDayPassStatus({
        dayPassNumber: tagId,
        eventId,
        action: 'reject',
        actionId: 'entrance-gate',
        actionDetails: 'lane1',
        scannerMemberId,
      });

      // Handle success as both boolean and string
      const isSuccess = response.status === 'success' || response.status === 'true' || response.status === true;

      if (isSuccess) {
        logAction('Pass rejected successfully', { dayPassNumber: tagId });
        Alert.alert(
          '✓ Rejected',
          `Pass #${tagId} has been rejected.`,
          [
            { text: 'Scan Next', onPress: () => handleScanNext() }
          ],
          { cancelable: false }
        );
      } else {
        logError('Failed to reject pass', 'handleReject');
        Alert.alert(
          '✗ Failed',
          response.message || 'Failed to reject pass. Please try again.',
          [
            { text: 'Retry', style: 'default' }
          ],
          { cancelable: true }
        );
      }
    } catch (error) {
      logError(error, 'handleReject');
      Alert.alert(
        '✗ Error',
        'Failed to reject pass. Please check your connection and try again.',
        [
          { text: 'OK' }
        ],
        { cancelable: true }
      );
    } finally {
      setIsProcessing(false);
    }
  };

  const handleScanNext = () => {
    logAction('Navigating to scanner');
    navigation.replace('Scanner', {
      screen: 'RishikeshKirtanScan',
    });
  };

  const handleBackToHome = () => {
    logAction('Navigating back to home');
    navigation.navigate('Home');
  };

  const handleActivityStats = () => {
    logAction('Navigating to activity stats');
    navigation.navigate(Routes.RishikeshKirtanActivityStats);
  };

  const handleInflowComparison = () => {
    logAction('Navigating to inflow comparison');
    navigation.navigate(Routes.InflowComparison);
  };

  if (isLoading) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.content}>
          <ActivityIndicator size="large" color={theme.primary} />
          <Text style={[styles.loadingText, { color: theme.text }]}>Loading attendee details...</Text>
        </View>
      </View>
    );
  }

  if (!daypassData) {
    return (
      <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.content}>
          <Ionicons name="qr-code-outline" size={80} color={theme.primary} />
          <Text style={[styles.title, { color: theme.text }]}>Rishikesh Kirtan Fest</Text>
          <Text style={[styles.subtitle, { color: theme.text }]}>Scan attendee pass</Text>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: theme.primary }]}
            onPress={handleScanNext}
          >
            <Ionicons name="qr-code-outline" size={24} color="#fff" />
            <Text style={styles.scanButtonText}>Scan Attendee</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: '#9C27B0' }]}
            onPress={handleActivityStats}
          >
            <Ionicons name="analytics-outline" size={24} color="#fff" />
            <Text style={styles.scanButtonText}>Activity Stats</Text>
          </TouchableOpacity>
          <TouchableOpacity
            style={[styles.scanButton, { backgroundColor: '#FF9800' }]}
            onPress={handleInflowComparison}
          >
            <Ionicons name="trending-up" size={24} color="#fff" />
            <Text style={styles.scanButtonText}>Inflow Chart</Text>
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
    );
  }

  // Determine icon and message based on status
  const getIconName = () => {
    switch (currentStatus) {
      case 'active': return 'checkmark-circle';
      case 'redeemed': return 'checkmark-done-circle';
      case 'rejected': return 'close-circle';
      default: return 'help-circle';
    }
  };

  const getStatusMessage = () => {
    switch (currentStatus) {
      case 'active': return 'Pass is Active';
      case 'redeemed': return 'Pass has been Redeemed';
      case 'rejected': return 'Pass has been Rejected';
      default: return 'Status Unknown';
    }
  };

  const canApprove = currentStatus === 'active';

  return (
    <View style={[styles.container, { backgroundColor: theme.background, paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView style={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          {/* Header */}
          <View style={[styles.header, { backgroundColor: theme.primary }]}>
            <TouchableOpacity onPress={handleBackToHome} style={styles.backButton}>
              <Ionicons name="arrow-back" size={24} color="#fff" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>Attendee Details</Text>
            <View style={styles.placeholder} />
          </View>

          {/* Status Icon */}
          <View style={styles.iconContainer}>
            <Ionicons
              name={getIconName()}
              size={80}
              color={theme.primary}
            />
            <Text style={[styles.statusMessage, { color: theme.text }]}>{getStatusMessage()}</Text>
          </View>

          {/* Details Card */}
          <View style={[styles.detailsContainer, { backgroundColor: '#fff' }]}>
            <Text style={[styles.detailsTitle, { color: theme.text }]}>Pass Details</Text>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pass Number:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{daypassData.daypassNumber}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Name:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{daypassData.purchaserName}</Text>
            </View>

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Pass Type:</Text>
              <Text style={[styles.detailValue, { color: theme.text }]}>{daypassData.daypassName}</Text>
            </View>

            {/* City and Country combined */}
            {(daypassData.city || daypassData.country) && (
              <View style={styles.detailRow}>
                <Text style={styles.detailLabel}>Location:</Text>
                <Text style={[styles.detailValue, { color: theme.text }]}>
                  {[daypassData.city, daypassData.country].filter(Boolean).join(', ')}
                </Text>
              </View>
            )}

            <View style={styles.detailRow}>
              <Text style={styles.detailLabel}>Status:</Text>
              <Text style={[styles.detailValue, { color: theme.primary, fontWeight: 'bold' }]}>
                {currentStatus.toUpperCase()}
              </Text>
            </View>

            {/* Scanner Alert */}
            {daypassData.scannerAlert === true && (
              <View style={[styles.alertContainer, { backgroundColor: '#FFF3CD' }]}>
                <Ionicons name="warning" size={20} color="#FF9800" />
                <Text style={styles.alertText}>Scanner Alert: This pass has special attention</Text>
              </View>
            )}
          </View>

          {/* Action Buttons - Only show if active */}
          {canApprove && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.success }, isProcessing && styles.buttonDisabled]}
                onPress={handleApprove}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="checkmark-circle-outline" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Approve Pass</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.actionButton, { backgroundColor: theme.error }, isProcessing && styles.buttonDisabled]}
                onPress={handleReject}
                disabled={isProcessing}
              >
                {isProcessing ? (
                  <ActivityIndicator size="small" color="#fff" />
                ) : (
                  <>
                    <Ionicons name="close-circle-outline" size={24} color="#fff" />
                    <Text style={styles.actionButtonText}>Reject Pass</Text>
                  </>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.scanNextButton, { backgroundColor: theme.primary }]}
                onPress={handleScanNext}
              >
                <Ionicons name="qr-code-outline" size={24} color="#fff" />
                <Text style={styles.scanNextButtonText}>Scan Next</Text>
              </TouchableOpacity>
            </View>
          )}

          {/* If not active, just show scan next button */}
          {!canApprove && (
            <View style={styles.buttonContainer}>
              <TouchableOpacity
                style={[styles.scanNextButton, { backgroundColor: theme.primary }]}
                onPress={handleScanNext}
              >
                <Ionicons name="qr-code-outline" size={24} color="#fff" />
                <Text style={styles.scanNextButtonText}>Scan Next</Text>
              </TouchableOpacity>
            </View>
          )}
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
  },
  loadingText: {
    fontSize: 16,
    color: '#666',
    marginTop: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 20,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  scanButtonText: {
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
  },
  homeButtonText: {
    color: '#4CAF50',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderRadius: 8,
    width: '100%',
    marginBottom: 30,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  iconContainer: {
    marginBottom: 10,
    alignItems: 'center',
  },
  statusMessage: {
    fontSize: 18,
    fontWeight: '600',
    marginTop: 10,
    textAlign: 'center',
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
    backgroundColor: '#fff3cd',
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
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    marginBottom: 15,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  rejectButton: {
    backgroundColor: '#f44336',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  scanNextButton: {
    backgroundColor: '#2196F3',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
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
  buttonDisabled: {
    opacity: 0.6,
  },
});
