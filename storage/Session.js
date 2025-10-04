import AsyncStorage from '@react-native-async-storage/async-storage';

export const Keys = {
  AUTH_TOKEN: 'authToken',
  DEVICE_ID: 'deviceId',
  EXTERNAL_MEMBER_ID: 'externalMemberId',
  INTERNAL_MEMBER_ID: 'internalMemberId',
  EMAIL_ADDRESS: 'emailAddress',
  LEGAL_NAME: 'legalName',
  SPIRITUAL_NAME: 'spiritualName',
  SELECTED_BUS_NUMBER: 'selectedBusNumber',
  SELECTED_PRASADAM_TIME: 'selectedPrasadamTime',
  SELECTED_LANGUAGE: 'selectedLanguage',
};

export async function getString(key) {
  try {
    const value = await AsyncStorage.getItem(key);
    return value;
  } catch {
    return null;
  }
}

export async function setString(key, value) {
  try {
    if (value === null || value === undefined) {
      await AsyncStorage.removeItem(key);
    } else {
      await AsyncStorage.setItem(key, String(value));
    }
  } catch {}
}

export async function getBoolean(key) {
  try {
    const value = await AsyncStorage.getItem(key);
    return value === 'true';
  } catch {
    return false;
  }
}

export async function setBoolean(key, value) {
  try {
    await AsyncStorage.setItem(key, value ? 'true' : 'false');
  } catch {}
}

export async function getAuthToken() {
  try {
    const token = await AsyncStorage.getItem(Keys.AUTH_TOKEN);
    return token;
  } catch {
    return null;
  }
}

export async function getOrCreateDeviceId() {
  const key = Keys.DEVICE_ID;
  try {
    let id = await AsyncStorage.getItem(key);
    if (!id) {
      id = 'install-' + Math.random().toString(36).slice(2, 12);
      await AsyncStorage.setItem(key, id);
    }
    return id;
  } catch {
    return 'install-' + Math.random().toString(36).slice(2, 12);
  }
}


