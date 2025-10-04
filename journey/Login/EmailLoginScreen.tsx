import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { generateVerificationCode } from './LoginViewModel';
import { Keys, setString } from '../../storage/Session';
import Routes from '../../routes/index';
import { useBaseScreen } from '../common/util/useBaseScreen';

export default function EmailLoginScreen({ navigation }: any) {
  const { logAction, logError } = useBaseScreen({ screenName: 'EmailLoginScreen' });
  const insets = useSafeAreaInsets();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const sendVerificationCode = async () => {
    if (!email || !email.includes('@')) {
      logAction('Invalid email validation failed', { email });
      Alert.alert('Invalid Email', 'Please enter a valid email address.');
      return;
    }
    
    logAction('Sending verification code', { email });
    setLoading(true);
    try {
      const payload = { apiVersion: '1.8', emailAddress: email};
      const resp = await generateVerificationCode(payload);
      if (resp.status === 'success') {
        const data: any = resp.data;
        logAction('Verification code sent successfully', { email });
        if (data?.authToken) {
          await setString(Keys.AUTH_TOKEN, data.authToken);
        }
        await setString(Keys.EMAIL_ADDRESS, email);
        navigation.navigate(Routes.Login + 'Otp');
      } else if (resp.status === 'error') {
        logError(resp.message || 'Failed to send verification code', 'sendVerificationCode');
        Alert.alert('Error', resp.message || 'Failed to send verification code');
      }
    } catch (e: any) {
      logError(e, 'sendVerificationCode');
      Alert.alert('Error', e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Login with Email</Text>
        <TextInput
          style={styles.input}
          value={email}
          onChangeText={setEmail}
          placeholder="Enter your email"
          keyboardType="email-address"
          autoCapitalize="none"
        />
        <TouchableOpacity style={styles.button} onPress={sendVerificationCode} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Send Code</Text>}
        </TouchableOpacity>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingVertical: 20,
  },
  title: { 
    fontSize: 28, 
    fontWeight: 'bold', 
    marginBottom: 32,
    color: '#333',
    textAlign: 'center'
  },
  input: { 
    width: '100%', 
    maxWidth: 400,
    borderWidth: 1, 
    borderColor: '#ddd', 
    borderRadius: 12, 
    paddingHorizontal: 16,
    paddingVertical: 14, 
    marginBottom: 24, 
    color: '#333',
    fontSize: 16,
    backgroundColor: '#f8f9fa'
  },
  button: { 
    backgroundColor: '#5dbea3', 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    borderRadius: 12, 
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  buttonText: { 
    color: 'white', 
    fontWeight: 'bold', 
    fontSize: 16 
  },
});


