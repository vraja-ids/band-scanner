import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Image, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Routes from '../../routes/index';
import { Keys, getString, setString } from '../../storage/Session';
import { SessionManager } from '../../storage/SessionManager';
import { useBaseScreen } from '../common/util/useBaseScreen';

export default function SplashScreen({ navigation }: any) {
  const { logAction, logError } = useBaseScreen({ screenName: 'SplashScreen' });
  const insets = useSafeAreaInsets();
  
  useEffect(() => {
    (async () => {
      const externalMemberId = await getString(Keys.EXTERNAL_MEMBER_ID);
      if (!externalMemberId) {
        logAction('No external member ID found, navigating to email login');
        navigation.reset({ index: 0, routes: [{ name: Routes.Login + 'Email' }] });
        return;
      }

      // If external member ID exists, go to event selection
      logAction('External member ID found, navigating to event selection', { externalMemberId });
      navigation.reset({ index: 0, routes: [{ name: Routes.EventSelection }] });
    })();
  }, [navigation]);

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      <View style={styles.content}>
        <Image source={require('../../assets/icon.png')} style={styles.logo} />
        <ActivityIndicator size="large" color="#5dbea3" />
        <Text style={styles.loadingText}>Loading...</Text>
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
  logo: { 
    width: 200, 
    height: 200, 
    marginBottom: 32, 
    resizeMode: 'contain' 
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
    fontWeight: '500'
  }
});


