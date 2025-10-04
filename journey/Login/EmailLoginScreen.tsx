import React, { useState } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, ActivityIndicator, Alert, KeyboardAvoidingView, ScrollView, Platform } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useTranslation } from 'react-i18next';
import { generateVerificationCode } from './LoginViewModel';
import { Keys, setString } from '../../storage/Session';
import Routes from '../../routes/index';
import { useBaseScreen } from '../common/util/useBaseScreen';

export default function EmailLoginScreen({ navigation }: any) {
  const { logAction, logError } = useBaseScreen({ screenName: 'EmailLoginScreen' });
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  const [email, setEmail] = useState('');
  const [loading, setLoading] = useState(false);

  const sendVerificationCode = async () => {
    if (!email || !email.includes('@')) {
      logAction('Invalid email validation failed', { email });
      Alert.alert(t('login.invalidEmail'), t('login.invalidEmail'));
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
        navigation.navigate(Routes.LoginOtp);
      } else if (resp.status === 'error') {
        logError(resp.message || 'Failed to send verification code', 'sendVerificationCode');
        Alert.alert(t('common.error'), resp.message || t('login.authError'));
      }
    } catch (e: any) {
      logError(e, 'sendVerificationCode');
      Alert.alert(t('common.error'), e?.message || t('login.connectionError'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <KeyboardAvoidingView 
      style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 0 : 20}
    >
      <ScrollView 
        contentContainerStyle={styles.scrollContent}
        keyboardShouldPersistTaps="handled"
        showsVerticalScrollIndicator={false}
      >
        <View style={styles.content}>
          <Text style={styles.title}>{t('login.email')}</Text>
          <TextInput
            style={styles.input}
            value={email}
            onChangeText={setEmail}
            placeholder={t('login.emailPlaceholder')}
            keyboardType="email-address"
            autoCapitalize="none"
            returnKeyType="done"
            onSubmitEditing={sendVerificationCode}
          />
          <TouchableOpacity style={styles.button} onPress={sendVerificationCode} disabled={loading}>
            {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>{t('login.sendCode')}</Text>}
          </TouchableOpacity>
        </View>
      </ScrollView>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { 
    flex: 1, 
    backgroundColor: '#fff' 
  },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
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


