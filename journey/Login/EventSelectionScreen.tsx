import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ActivityIndicator, ScrollView, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { getEvents, loginScanner } from './LoginViewModel';
import { SessionManager } from '../../storage/SessionManager';
import { setString, getString, Keys } from '../../storage/Session';
import Routes from '../../routes/index';
import type { GetEventsResponse } from './models/api';
import { useBaseScreen } from '../common/util/useBaseScreen';

export default function EventSelectionScreen() {
  const { logAction, logError } = useBaseScreen({ screenName: 'EventSelectionScreen' });
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const [events, setEvents] = useState<Array<{ eventId: string; eventName: string }>>([]);
  const [loading, setLoading] = useState(true);
  const [selectedEvent, setSelectedEvent] = useState<string | null>(null);

  useEffect(() => {
    loadEvents();
  }, []);

  const loadEvents = async () => {
    logAction('Loading events');
    try {
      const response = await getEvents();
      if (response.status === 'success' && response.data?.events) {
        logAction('Events loaded successfully', { count: response.data.events.length });
        setEvents(response.data.events);
      } else {
        const errorMessage = (response as any)?.message || 'Failed to load events. Please try again.';
        Alert.alert('Error', errorMessage);
      }
    } catch (error: any) {
      logError(error, 'loadEvents');
      const errorMessage = error?.message || 'Failed to load events. Please check your connection and try again.';
      Alert.alert('Connection Error', errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleEventSelect = async (eventId: string, eventName: string) => {
    if (selectedEvent) return; // Prevent multiple selections
    
    logAction('Event selected', { eventId, eventName });
    setSelectedEvent(eventId);
    
    try {
      // Get auth token from storage
      const authToken = await getString(Keys.AUTH_TOKEN);
      if (!authToken) {
        logError('No auth token found', 'handleEventSelect');
        Alert.alert('Authentication Required', 'Please log in again to continue.');
        // Navigate back to login
        (navigation as any).reset({ 
          index: 0, 
          routes: [{ name: Routes.LoginEmail }] 
        });
        return;
      }

      // Call loginScanner with selected event
      logAction('Calling loginScanner', { authToken, eventId });
      const resp = await loginScanner({ 
        authToken: authToken, 
        eventId: eventId 
      });

      if (resp.status === 'success' && (resp.data as any)?.scannerLoginResponse) {
        const { memberId, memberPermissions, scansInThisEvent } = (resp.data as any).scannerLoginResponse;
        
        logAction('LoginScanner successful', { memberId, memberPermissions, scansInThisEvent });
        
        // Store memberId as internalMemberId
        if (memberId) {
          await setString(Keys.INTERNAL_MEMBER_ID, memberId);
        }
        
        // Store permissions in SessionManager
        if (memberPermissions) {
          SessionManager.setPermissions(memberPermissions);
        }

        // Store scansInThisEvent for HomeScreen to use
        if (scansInThisEvent) {
          await setString('scansInThisEvent', JSON.stringify(scansInThisEvent));
        }

        // Store selected event info
        await setString('selectedEventId', eventId);
        await setString('selectedEventName', eventName);

        // Navigate to Home
        logAction('Navigating to Home screen');
        (navigation as any).reset({ 
          index: 0, 
          routes: [{ name: Routes.Home }] 
        });
      } else {
        logError('Login scanner failed', 'handleEventSelect');
        const errorMessage = (resp as any)?.message || 'Failed to authenticate with selected event. Please try again.';
        Alert.alert('Authentication Error', errorMessage);
        setSelectedEvent(null);
      }
    } catch (error: any) {
      logError(error, 'handleEventSelect');
      const errorMessage = error?.message || 'An unexpected error occurred. Please try again.';
      Alert.alert('Error', errorMessage);
      setSelectedEvent(null);
    }
  };

  if (loading) {
    return (
      <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#5dbea3" />
          <Text style={styles.loadingText}>Loading events...</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.header}>
        <Text style={styles.title}>Select Event</Text>
        <Text style={styles.subtitle}>Choose an event to continue</Text>
      </View>
      
      <ScrollView style={styles.eventsList}>
        {events.map((event) => (
          <TouchableOpacity
            key={event.eventId}
            style={[
              styles.eventCard,
              selectedEvent === event.eventId && styles.eventCardSelected
            ]}
            onPress={() => handleEventSelect(event.eventId, event.eventName)}
            disabled={selectedEvent !== null}
          >
            <Text style={styles.eventName}>{event.eventName}</Text>
            <Text style={styles.eventId}>{event.eventId}</Text>
            {selectedEvent === event.eventId && (
              <ActivityIndicator size="small" color="#5dbea3" style={styles.loadingIcon} />
            )}
          </TouchableOpacity>
        ))}
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    marginTop: 10,
    fontSize: 16,
    color: '#666',
  },
  header: {
    paddingHorizontal: 20,
    paddingTop: 20,
    paddingBottom: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
  },
  eventsList: {
    flex: 1,
    paddingHorizontal: 20,
    paddingTop: 16,
    paddingBottom: 20,
  },
  eventCard: {
    backgroundColor: '#f8f9fa',
    padding: 20,
    borderRadius: 10,
    marginBottom: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  eventCardSelected: {
    backgroundColor: '#e3f2fd',
    borderColor: '#5dbea3',
  },
  eventName: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 5,
  },
  eventId: {
    fontSize: 14,
    color: '#666',
  },
  loadingIcon: {
    position: 'absolute',
    right: 15,
    top: '50%',
    marginTop: -10,
  },
});
