import React, { useEffect } from 'react';
import { View, ActivityIndicator, StyleSheet, Image } from 'react-native';
import Routes from '../../routes/index';
import { Keys, getString, setString } from '../../storage/Session';
import { SessionManager } from '../../storage/SessionManager';
import { useBaseScreen } from '../common/util/useBaseScreen';

export default function SplashScreen({ navigation }: any) {
  const { logAction, logError } = useBaseScreen({ screenName: 'SplashScreen' });
  
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
    <View style={styles.container}>
      <Image source={require('../../assets/icon.png')} style={styles.logo} />
      <ActivityIndicator size="large" color="#5dbea3" />
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  logo: { width: 180, height: 180, marginBottom: 24, resizeMode: 'contain' }
});


