import React, { useEffect, useState } from 'react';
import { StyleSheet, View, StatusBar, TextInput, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { fetchRegistrationStatus, registerTag, unregisterTag } from './TagsViewModel';
import Routes from '../../routes/index';

function RegisterTagScreen({ route }: any) {
  const { tag } = route.params;
  const [isLoading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [memberActivityDetails, setMemberActivityDetails] = useState<any>(null);
  const navigation: any = useNavigation();

  const fetchMealDetails = (tag: any) => {
    setLoading(true);
    fetchRegistrationStatus({ tagId: tag.id })
      .then((json: any) => {
        console.log('[RegisterTag] Initial fetch response:', JSON.stringify(json, null, 2));
        // Response is nested: { status, data: { memberActivityDetails } }
        setMemberActivityDetails(json.data?.memberActivityDetails || json.memberActivityDetails);
        setError(false);
      })
      .catch((error: any) => {
        if (error.response && error.response.status === 404) {
          alert('No member tracking details found for this tag');
        } else {
          console.error(error);
          setError(true);
        }
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    fetchMealDetails(tag);
  }, []);

  const MealDetails = () => {
    if (isLoading) {
      return <Text>Loading meal details...</Text>;
    } else if (error) {
      return <Text>Error fetching meal details.</Text>;
    } else if (memberActivityDetails) {
      return (
        <View style={styles.section}>
          <Text style={{ fontSize: 18, fontWeight: 'bold', fontFamily: 'Avenir', paddingLeft: 10 }}>TAG IS CURRENTLY ASSIGNED TO:</Text>
          <View style={{ paddingLeft: 10, marginTop: 5 }}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', fontFamily: 'Avenir' }}>{memberActivityDetails.legalName}</Text>
            {memberActivityDetails.spiritualName && <Text style={{ fontSize: 16, fontFamily: 'Avenir', marginTop: 2 }}>Spiritual Name: {memberActivityDetails.spiritualName}</Text>}
            <Text style={{ fontSize: 16, fontFamily: 'Avenir', marginTop: 2 }}>Member ID: {memberActivityDetails.memberId}</Text>
            <Text style={{ fontSize: 16, fontFamily: 'Avenir', marginTop: 2 }}>Registration: {memberActivityDetails.registrationType}</Text>
            <Text style={{ fontSize: 16, fontFamily: 'Avenir', marginTop: 2 }}>Meal Option: {memberActivityDetails.mealOption}</Text>
            <Text style={{ fontSize: 16, fontFamily: 'Avenir', marginTop: 2 }}>SP Disciple: {memberActivityDetails.isSPDisciple === 'Y' ? 'Yes' : 'No'}</Text>
          </View>
          {errorMessage && <Text style={{ fontSize: 16, fontWeight: 'bold', fontFamily: 'Avenir', paddingLeft: 10, color: 'red', marginTop: 10 }}>{errorMessage}</Text>}
          <TouchableOpacity
            style={[styles.unregisterButton, isLoading && styles.disabledButton]}
            onPress={handleUnregister}
            disabled={isLoading}
          >
            <Text style={styles.unregisterButtonText}>{isLoading ? 'Processing...' : 'UNREGISTER TAG (Coming Soon)'}</Text>
          </TouchableOpacity>
        </View>
      );
    } else {
      return (
        <View style={styles.roundedGreen}>
          <Text style={styles.sectionLabel}>TAG IS NOT ASSIGNED YET</Text>
          {errorMessage && <Text style={{ fontSize: 16, fontWeight: 'bold', fontFamily: 'Avenir', paddingLeft: 10, color: 'red' }}>{errorMessage}</Text>}
        </View>
      );
    }
  };

  const handleUnregister = () => {
    if (!memberActivityDetails || isLoading) {
      return;
    }

    Alert.alert(
      'Unregister Tag',
      `Are you sure you want to unregister this tag from ${memberActivityDetails.legalName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Unregister',
          style: 'destructive',
          onPress: () => {
            setLoading(true);
            unregisterTag(tag.id)
              .then((response: any) => {
                console.log('[UnregisterTag] Response:', JSON.stringify(response, null, 2));
                if (response.status === 'success' || response.data?.status === 'success') {
                  alert('Tag unregistered successfully!');
                  setMemberActivityDetails(null);
                  setErrorMessage('');
                } else {
                  alert(response.displayMessage || response.errorMessage || 'Failed to unregister tag');
                }
                // Fetch fresh status
                fetchMealDetails(tag);
              })
              .catch((error: any) => {
                console.error('[UnregisterTag] Error:', error);
                alert('Failed to unregister tag. Please try again.');
              })
              .finally(() => setLoading(false));
          },
        },
      ]
    );
  };

  const handleSubmit = () => {
    if (isLoading) {
      return;
    }
    const tagdata = {
      apiVersion: '3.10',
      tagId: tag.id,
      memberId: inputValue,
    };
    if (inputValue !== '0' && inputValue.length !== 4 && inputValue.length !== 5) {
      alert('Member ID is possibly incorrect');
      return;
    }
    setLoading(true);
    registerTag(tagdata)
      .then((response: any) => {
        console.log('[RegisterTag] Full response:', JSON.stringify(response, null, 2));
        const errorMsg = response.errorMessage || response.displayMessage;
        if (errorMsg) {
          alert(errorMsg);
          // Still show the member details if available
          if (response.memberActivityDetails) {
            setMemberActivityDetails(response.memberActivityDetails);
            setErrorMessage(errorMsg);
            setError(false);
          }
        } else {
          fetchMealDetails(tag);
        }
      })
      .catch((error: any) => {
        console.error(error);
        alert(error);
        setErrorMessage('Error registering tag. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.listItem}>
          <Text style={styles.sectionLabel}>TAG-ID</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', fontFamily: 'Avenir', paddingLeft: 10 }}>{tag.id || '---'}</Text>
        </View>
        <View>
          <TextInput value={inputValue} style={styles.input} onChangeText={setInputValue} placeholder="Enter Sadhu ID" placeholderTextColor="#000" />
        </View>
        <View>
          <TouchableOpacity style={[styles.button, isLoading ? styles.disabledButton : null]} onPress={handleSubmit} disabled={isLoading}>
            <Text style={{ fontSize: 20, fontWeight: 'bold', fontFamily: 'Avenir', paddingLeft: 10 }}>{isLoading ? 'Loading...' : 'ASSIGN TAG'}</Text>
          </TouchableOpacity>
        </View>
        <MealDetails />
        <TouchableOpacity style={styles.goToScannerButton} onPress={() => navigation.navigate(Routes.Scanner, { screen: Routes.RegisterTag })}>
          <Text style={styles.goToScannerText}>Register Next Member</Text>
        </TouchableOpacity>
      </ScrollView>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    marginTop: StatusBar.currentHeight || 30,
    backgroundColor: '#fff',
    justifyContent: 'center',
    alignItems: 'center',
    width: '100%',
  },
  contentContainer: {
    justifyContent: 'flex-start',
    alignItems: 'center',
  },
  listItem: {
    flex: 0.4,
    paddingVertical: 15,
    paddingHorizontal: 15,
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'blue',
    alignSelf: 'center',
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#5dbea3',
    padding: 10,
    alignSelf: 'center',
    borderRadius: 15,
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: 20,
    borderWidth: 3,
    borderColor: '#000',
  },
  disabledButton: {
    opacity: 0.6,
  },
  input: {
    alignItems: 'center',
    backgroundColor: '#fff',
    padding: 10,
    alignSelf: 'center',
    borderRadius: 15,
    justifyContent: 'center',
    fontWeight: 'bold',
    fontSize: 20,
    borderWidth: 3,
    borderColor: '#000',
    color: 'black',
  },
  sectionLabel: {
    fontSize: 16,
    marginBottom: 5,
    color: 'black',
  },
  section: {
    marginTop: 10,
    padding: 8,
    borderRadius: 8,
    backgroundColor: 'lightcoral',
    marginBottom: 15,
    minHeight: 150,
  },
  roundedGreen: {
    height: 40,
    borderRadius: 20,
    borderWidth: 3,
    borderColor: 'black',
    backgroundColor: 'green',
    justifyContent: 'center',
    flexDirection: 'column',
    paddingLeft: 10,
  },
  goToScannerButton: {
    marginTop: 20,
    backgroundColor: '#5dbea3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  goToScannerText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  unregisterButton: {
    alignItems: 'center',
    backgroundColor: '#FF5252',
    padding: 12,
    alignSelf: 'center',
    borderRadius: 15,
    justifyContent: 'center',
    marginTop: 10,
    borderWidth: 3,
    borderColor: '#000',
  },
  unregisterButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    fontFamily: 'Avenir',
    color: '#fff',
  },
});

export default RegisterTagScreen;


