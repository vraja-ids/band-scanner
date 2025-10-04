import React, { useState, useEffect, useRef } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { validateVerificationCode, getProfile } from './LoginViewModel';
import Routes from '../../routes/index';
import { Keys, getString, setString } from '../../storage/Session';
import { useBaseScreen } from '../common/util/useBaseScreen';

export default function OtpVerifyScreen({ navigation }: any) {
  const { logAction, logError } = useBaseScreen({ screenName: 'OtpVerifyScreen' });
  const insets = useSafeAreaInsets();
  const [digits, setDigits] = useState<string[]>(['', '', '', '', '', '']);
  const [loading, setLoading] = useState(false);
  const [authToken, setAuthToken] = useState<string | null>(null);
  const inputsRef = useRef<Array<TextInput | null>>([]);

  useEffect(() => {
    (async () => {
      const token = await getString(Keys.AUTH_TOKEN);
      setAuthToken(token);
    })();
  }, []);

  const validateOtp = async () => {
    const otp = digits.join('');
    if (otp.length !== 6) {
      logAction('Invalid OTP length', { otpLength: otp.length });
      Alert.alert('Invalid Code', 'Please enter the 6-digit code.');
      return;
    }
    
    logAction('Validating OTP', { otpLength: otp.length });
    setLoading(true);
    try {
      const payload = { verificationCode: otp, authToken: authToken || undefined, apiVersion: '1.8' };
      const resp = await validateVerificationCode(payload);
      if (resp.status === 'error') {
        logError(resp.message || 'Invalid verification code', 'validateOtp');
        Alert.alert('Error', resp.message || 'Invalid verification code');
        setLoading(false);
        return;
      }

      const data: any = resp.status === 'success' ? resp.data : {};
      const effectiveAuthToken = data?.authToken || authToken;
      if (!effectiveAuthToken) {
        logError('Missing auth token', 'validateOtp');
        Alert.alert('Error', 'Missing auth token');
        setLoading(false);
        return;
      }

      // Fetch profile
      logAction('Fetching user profile', { authToken: effectiveAuthToken });
      const profileReq = { authToken: effectiveAuthToken, apiVersion: '1.8', locale: 'en' };
      const profileResp = await getProfile(profileReq);
      if (profileResp.status === 'success' && profileResp.data?.externalMemberId) {
        const profile: any = profileResp.data;
        logAction('Profile loaded successfully', { externalMemberId: profile.externalMemberId });
        await setString(Keys.AUTH_TOKEN, effectiveAuthToken);
        await setString(Keys.EXTERNAL_MEMBER_ID, profile.externalMemberId);
        if (profile.legalName) await setString(Keys.LEGAL_NAME, profile.legalName);
        if (profile.spiritualName) await setString(Keys.SPIRITUAL_NAME, profile.spiritualName);
        if (profile.emailAddress) await setString(Keys.EMAIL_ADDRESS, profile.emailAddress);
        navigation.reset({ index: 0, routes: [{ name: Routes.EventSelection }] });
      } else {
        logError('Failed to load profile', 'validateOtp');
        Alert.alert('Error', 'Failed to load profile');
      }
    } catch (e: any) {
      logError(e, 'validateOtp');
      Alert.alert('Error', e?.message || 'Something went wrong');
    } finally {
      setLoading(false);
    }
  };

  const onChangeDigit = (index: number, text: string) => {
    const char = text.replace(/\D/g, '').slice(-1);
    const next = [...digits];
    next[index] = char || '';
    setDigits(next);
    if (char && index < 5) {
      inputsRef.current[index + 1]?.focus();
    }
  };

  const onKeyPress = (index: number, e: any) => {
    if (e.nativeEvent.key === 'Backspace') {
      if (digits[index]) {
        const next = [...digits];
        next[index] = '';
        setDigits(next);
        return;
      }
      if (index > 0) {
        inputsRef.current[index - 1]?.focus();
      }
    }
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Text style={styles.title}>Enter 6-digit Code</Text>
        <Text style={styles.subtitle}>We sent a verification code to your email</Text>
        <View style={styles.otpRow}>
          {digits.map((d, i) => (
            <TextInput
              key={i}
              ref={(el) => { inputsRef.current[i] = el; }}
              style={styles.otpInput}
              value={d}
              onChangeText={(t) => onChangeDigit(i, t)}
              onKeyPress={(e) => onKeyPress(i, e)}
              keyboardType="number-pad"
              maxLength={1}
              returnKeyType={i === 5 ? 'done' : 'next'}
              autoFocus={i === 0}
            />
          ))}
        </View>
        <TouchableOpacity style={styles.button} onPress={validateOtp} disabled={loading}>
          {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Verify</Text>}
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
    marginBottom: 8,
    color: '#333',
    textAlign: 'center'
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 32,
    textAlign: 'center',
  },
  otpRow: { 
    flexDirection: 'row', 
    justifyContent: 'space-between', 
    width: '100%',
    maxWidth: 300,
    marginBottom: 32 
  },
  otpInput: {
    width: 48,
    height: 56,
    borderWidth: 2,
    borderColor: '#ddd',
    borderRadius: 12,
    textAlign: 'center',
    fontSize: 24,
    color: '#333',
    backgroundColor: '#f8f9fa',
    fontWeight: '600'
  },
  button: { 
    backgroundColor: '#5dbea3', 
    paddingVertical: 16, 
    paddingHorizontal: 32, 
    borderRadius: 12, 
    width: '100%',
    maxWidth: 300,
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


