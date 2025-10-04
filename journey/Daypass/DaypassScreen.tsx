import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation, useRoute } from '@react-navigation/native';
import { SessionManager } from '../../storage/SessionManager';
import { getString, setString, Keys } from '../../storage/Session';
import { getDaypassStatus, updateDayPassStatus } from './DaypassViewModel';
import type { GetDaypassStatusResponse, DaypassStatusDetails } from './models/api';
import { useBaseScreen } from '../common/util/useBaseScreen';

export default function DaypassScreen() {
  const { logAction, logError } = useBaseScreen({ screenName: 'DaypassScreen' });
  const navigation = useNavigation();
  const route = useRoute();
  const insets = useSafeAreaInsets();
  const { dayPassNumber } = route.params as { dayPassNumber: string };
  
  const [isLoading, setIsLoading] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [daypassData, setDaypassData] = useState<GetDaypassStatusResponse['daypassDetails'] | null>(null);
  const [selectedBusNumber, setSelectedBusNumber] = useState<string>('');
  const [selectedPrasadamTime, setSelectedPrasadamTime] = useState<string>('Breakfast');

  useEffect(() => {
    loadDaypassStatus();
    loadSelectedBusNumber();
    loadSelectedPrasadamTime();
  }, []);

  const loadSelectedBusNumber = async () => {
    try {
      const busNumber = await getString('selectedBusNumber');
      if (busNumber) {
        logAction('Selected bus number loaded', { busNumber });
        setSelectedBusNumber(busNumber);
      }
    } catch (error) {
      logError(error, 'loadSelectedBusNumber');
    }
  };

  const loadSelectedPrasadamTime = async () => {
    try {
      const prasadamTime = await getString(Keys.SELECTED_PRASADAM_TIME);
      if (prasadamTime) {
        logAction('Selected prasadam time loaded', { prasadamTime });
        setSelectedPrasadamTime(prasadamTime);
      }
    } catch (error) {
      logError(error, 'loadSelectedPrasadamTime');
    }
  };

  const loadDaypassStatus = async () => {
    if (!dayPassNumber) return;
    
    logAction('Loading daypass status', { 
      dayPassNumber,
      allPermissions: SessionManager.getPermissions()
    });
    setIsLoading(true);
    try {
      const internalMemberId = await getString(Keys.INTERNAL_MEMBER_ID);
      if (!internalMemberId) {
        logError('No member ID found', 'loadDaypassStatus');
        Alert.alert('Error', 'No member ID found');
        return;
      }

      const selectedEventId = await getString('selectedEventId');
      if (!selectedEventId) {
        logError('No event selected', 'loadDaypassStatus');
        Alert.alert('Error', 'No event selected');
        return;
      }

      const response = await getDaypassStatus({
        dayPassNumber,
        eventId: selectedEventId,
        scannerMemberId: internalMemberId,
      });

      if (response.status === 'success' && response.data) {
        logAction('Daypass status loaded successfully', { daypassData: response.data.daypassDetails });
        setDaypassData(response.data.daypassDetails);
      } else {
        logError('Failed to load daypass status', 'loadDaypassStatus');
        Alert.alert('Error', 'Failed to load daypass status');
      }
    } catch (error) {
      logError(error, 'loadDaypassStatus');
      Alert.alert('Error', 'Failed to load daypass status');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (action: 'redeem' | 'unredeem', actionId: 'bus' | 'prasadam') => {
    if (!dayPassNumber || !selectedBusNumber) {
      logError('Missing daypass number or bus number', 'handleAction');
      Alert.alert('Error', 'Missing daypass number or bus number');
      return;
    }

    logAction('Performing daypass action', { action, actionId, dayPassNumber, selectedBusNumber });
    setIsButtonLoading(true);
    try {
      const internalMemberId = await getString(Keys.INTERNAL_MEMBER_ID);
      const selectedEventId = await getString('selectedEventId');
      
      if (!internalMemberId || !selectedEventId) {
        logError('Missing member ID or event ID', 'handleAction');
        Alert.alert('Error', 'Missing member ID or event ID');
        return;
      }

      const actionDetails = actionId === 'bus' 
        ? `Bus ${selectedBusNumber}` 
        : `${selectedPrasadamTime}`;

      const response = await updateDayPassStatus({
        dayPassNumber,
        eventId: selectedEventId,
        action,
        actionId,
        actionDetails,
        scannerMemberId: internalMemberId,
      });

      if (response.status === 'success' && (response.data as any)?.success) {
        logAction('Daypass action successful', { action, actionId });
        Alert.alert(
          'Success',
          `${action === 'redeem' ? 'Redeemed' : 'Unredeemed'} ${actionId} successfully!`,
          [{ text: 'OK', onPress: () => navigation.goBack() }]
        );
      } else {
        logError('Failed to update daypass status', 'handleAction');
        Alert.alert('Error', 'Failed to update daypass status');
      }
    } catch (error) {
      logError(error, 'handleAction');
      Alert.alert('Error', 'Failed to update daypass status');
    } finally {
      setIsButtonLoading(false);
    }
  };

  const renderActionButtons = (actionId: 'bus' | 'prasadam') => {
    if (!daypassData) return null;

    const isRedeemed = actionId === 'bus' 
      ? daypassData.statusDetails.bus && daypassData.statusDetails.bus !== '' 
      : daypassData.statusDetails.prasadam && daypassData.statusDetails.prasadam !== '';

    const permissionKey = `canScanDaypass${actionId === 'bus' ? 'Bus' : 'Prasadam'}`;
    const canRedeem = SessionManager.hasPermission(permissionKey);
    
    if (!canRedeem) {
      logAction(`Permission denied for ${actionId}`, { permissionKey });
      return null;
    }

    return (
      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          <TouchableOpacity
            style={[
              styles.button, 
              styles.redeemButton, 
              (!isRedeemed ? styles.buttonActive : styles.buttonInactive),
              isButtonLoading && styles.buttonDisabled
            ]}
            onPress={() => {
              if (!isRedeemed) {
                handleAction('redeem', actionId);
              }
            }}
            disabled={isButtonLoading || !!isRedeemed}
          >
            {isButtonLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, isRedeemed && styles.buttonTextInactive]}>
                Redeem {actionId}
              </Text>
            )}
          </TouchableOpacity>
          
          <TouchableOpacity
            style={[
              styles.button, 
              styles.unredeemButton, 
              (isRedeemed ? styles.buttonActive : styles.buttonInactive),
              isButtonLoading && styles.buttonDisabled
            ]}
            onPress={() => {
              if (isRedeemed) {
                handleAction('unredeem', actionId);
              }
            }}
            disabled={isButtonLoading || !isRedeemed}
          >
            {isButtonLoading ? (
              <ActivityIndicator color="#fff" />
            ) : (
              <Text style={[styles.buttonText, !isRedeemed && styles.buttonTextInactive]}>
                Unredeem {actionId}
              </Text>
            )}
          </TouchableOpacity>
        </View>
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#5dbea3" />
        <Text style={styles.loadingText}>Loading daypass status...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <ScrollView style={styles.scrollContainer}>
        <View style={styles.container}>
        <Text style={styles.title}>Daypass Management</Text>
        <Text style={styles.daypassNumber}>Daypass: {dayPassNumber}</Text>
        
        {daypassData && (
          <>
            <View style={styles.statusContainer}>
              <Text style={styles.statusTitle}>Daypass Details</Text>
              <Text style={styles.detailText}>Number: {daypassData.daypassNumber}</Text>
              <Text style={styles.detailText}>Purchaser: {daypassData.purchaserName}</Text>
              <Text style={styles.detailText}>Name: {daypassData.daypassName}</Text>
              <Text style={styles.statusTitle}>Status: {daypassData.status}</Text>
              <Text style={styles.statusDetails}>
                Bus: <Text style={[
                  styles.statusText,
                  daypassData.statusDetails.bus ? styles.redeemedText : styles.notRedeemedText
                ]}>
                  {daypassData.statusDetails.bus || 'Not redeemed'}
                </Text>
              </Text>
              <Text style={styles.statusDetails}>
                Prasadam: <Text style={[
                  styles.statusText,
                  daypassData.statusDetails.prasadam ? styles.redeemedText : styles.notRedeemedText
                ]}>
                  {daypassData.statusDetails.prasadam || 'Not redeemed'}
                </Text>
              </Text>
              {daypassData.scannerAlert && (
                <Text style={styles.alertText}>⚠️ Scanner Alert</Text>
              )}
            </View>

            <View style={styles.actionsContainer}>
              <Text style={styles.actionsTitle}>Actions</Text>
              {renderActionButtons('bus')}
              {renderActionButtons('prasadam')}
            </View>
          </>
        )}
        </View>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#fff',
  },
  scrollContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 24,
    backgroundColor: '#fff',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
    textAlign: 'center',
  },
  daypassNumber: {
    fontSize: 18,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
  },
  statusContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  statusTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  statusDetails: {
    fontSize: 16,
    color: '#666',
    marginBottom: 5,
  },
  statusText: {
    fontWeight: '600',
  },
  redeemedText: {
    color: '#4CAF50',
  },
  notRedeemedText: {
    color: '#f44336',
  },
  detailText: {
    fontSize: 14,
    color: '#333',
    marginBottom: 3,
  },
  alertText: {
    fontSize: 16,
    color: '#ff6b35',
    fontWeight: 'bold',
    marginTop: 10,
  },
  actionsContainer: {
    marginTop: 20,
  },
  actionsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  buttonContainer: {
    marginBottom: 15,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    marginBottom: 12,
  },
  button: {
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    flex: 1,
    alignItems: 'center',
    marginHorizontal: 6,
  },
  buttonDisabled: {
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonTextInactive: {
    color: '#999',
  },
  redeemButton: {
    backgroundColor: '#4CAF50',
  },
  unredeemButton: {
    backgroundColor: '#f44336',
  },
  buttonActive: {
    opacity: 1,
  },
  buttonInactive: {
    opacity: 0.5,
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
});
