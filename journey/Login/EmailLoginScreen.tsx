import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { generateVerificationCode } from './LoginViewModel';
import { Keys, setString } from '../../storage/Session';
import Routes from '../../routes/index';
import { useBaseScreen } from '../common/util/useBaseScreen';

export default function EmailLoginScreen({ navigation }: any) {
  const { logAction, logError } = useBaseScreen({ screenName: 'EmailLoginScreen' });
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
    <View style={styles.container}>
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
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#fff' },
  title: { fontSize: 24, fontWeight: 'bold', marginBottom: 20 },
  input: { width: '90%', borderWidth: 1, borderColor: '#ccc', borderRadius: 8, padding: 12, marginBottom: 16, color: 'black' },
  button: { backgroundColor: '#5dbea3', paddingVertical: 14, paddingHorizontal: 24, borderRadius: 8, width: '90%', alignItems: 'center' },
  buttonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});


