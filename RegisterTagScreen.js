import React, { useEffect, useState } from 'react';
import { StyleSheet, View, StatusBar, TextInput, TouchableOpacity, Text, ScrollView, Alert } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { api } from './services/api';

function RegisterTagScreen({ route }) {
  const { tag } = route.params;
  const [isLoading, setLoading] = useState(false);
  const [inputValue, setInputValue] = useState('');
  const [error, setError] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');
  const [memberActivityDetails, setMemberActivityDetails] = useState(null);
  const [currentDate, setCurrentDate] = useState(new Date());
  const navigation = useNavigation();

  const fetchMealDetails = (tag) => {
    setLoading(true);
    api.get('getMemberActivity', {
      tagId: tag.id,
      activity: 'regCheck'
    })
      .then((json) => {
        setMemberActivityDetails(json.memberActivityDetails);
        setError(false);
      })
      .catch((error) => {
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
          <Text style={{ fontSize: 20, fontWeight: "bold", fontFamily: 'Avenir', paddingLeft: 10 }}>TAG IS CURRENTLY ASSIGNED TO: </Text>
          <Text style={{ fontSize: 20, fontWeight: "bold", fontFamily: 'Avenir', paddingLeft: 10 }}>{memberActivityDetails.legalName}</Text>
          {errorMessage && <Text>{errorMessage}</Text>}
        </View>
      );
    } else {
      return (
        <View style={styles.roundedGreen}>
          <Text style={styles.sectionLabel}>TAG IS NOT ASSIGNED YET</Text>
          {errorMessage && <Text>{errorMessage}</Text>}
        </View>
      );
    }
  };

  const handleSubmit = () => {
    if (isLoading) {
      return;
    }
    const tagdata = {
      "apiVersion": "3.10",
      "tagId": tag.id,
      "memberId": inputValue
    };
    if (inputValue !== '0' && inputValue.length !== 4 && inputValue.length !== 5) {
      alert('Member ID is possibly incorrect');
      return;
    }
    setLoading(true);
    api.put('registerTag', tagdata)
      .then(tagdata => {
        console.log(tagdata);
        if (tagdata.errorMessage) {
          alert(tagdata.errorMessage);
        } else {
          fetchMealDetails(tag);
        }
      })
      .catch(error => {
        console.error(error);
        alert(error);
        setErrorMessage('Error registering tag. Please try again.');
      })
      .finally(() => setLoading(false));
  };

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentDate(new Date());
    }, 10000);
    return () => clearInterval(interval);
  }, []);

  const goToHomeScreen = () => {
    navigation.navigate('Home');
  };

  return (
    <View style={styles.container}>
      <ScrollView contentContainerStyle={styles.contentContainer}>
        <View style={styles.listItem}>
          <Text style={styles.sectionLabel}>TAG-ID</Text>
          <Text style={{ fontSize: 20, fontWeight: 'bold', fontFamily: 'Avenir', paddingLeft: 10 }}>{tag.id || '---'}</Text>
        </View>
        <View>
          <TextInput
            value={inputValue}
            style={styles.input}
            onChangeText={setInputValue}
            placeholder="Enter Sadhu ID"
            placeholderTextColor="#000"
          />
        </View>
        <View>
          <TouchableOpacity
            style={[styles.button, isLoading ? styles.disabledButton : null]}
            onPress={handleSubmit}
            disabled={isLoading}
          >
            <Text style={{ fontSize: 20, fontWeight: 'bold', fontFamily: 'Avenir', paddingLeft: 10 }}>
              {isLoading ? 'Loading...' : 'ASSIGN TAG'}
            </Text>
          </TouchableOpacity>
        </View>
        <MealDetails />
        <TouchableOpacity
          style={styles.goToScannerButton}
          onPress={() => navigation.navigate('BarcodeScanner', { screen: 'RegisterTag' })}
        >
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
    height: 80
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
  goToHomeButton: {
    marginTop: 20,
    backgroundColor: '#5dbea3',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 10,
  },
  goToHomeText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default RegisterTagScreen;

