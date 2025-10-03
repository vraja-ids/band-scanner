import React, { useEffect, useState, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { StyleSheet, View, TouchableOpacity, Text, Image } from 'react-native';
import { Button } from 'react-native-paper';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchMealActivity, updateMealActivity } from './MealsViewModel';
import type { GetMemberMealActivityRequest, UpdateMealActivityRequest } from './models/api';
import { Ionicons } from '@expo/vector-icons';
import Routes from '../../routes/index';

function MealScanScreen(props: any) {
  const { navigation } = props;
  const { tag } = props.route.params;
  const { location } = props.route.params;
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<any>([]);
  const [isMealValid, setIsMealValid] = useState(false);
  const [curMealCount, setMealCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [currentDate, setCurrentDate] = useState(new Date());
  const [error, setError] = useState(false);

  const fetchMealDetails = useCallback((tagin: any) => {
    setLoading(true);
    const currentMeal = getCurrMeal();
    const req: GetMemberMealActivityRequest = { tagId: tagin.id, activity: currentMeal, category: 'mealtracking' };
    fetchMealActivity(req)
      .then(async (json: any) => {
        setData(json);
        setError(false);
        UpdateCurrMeal(currentMeal, json);
      })
      .catch((error: any) => {
        if (error.response && error.response.status === 404) {
          alert('No member tracking details found for this tag');
        } else {
          console.error(error);
          setError(true);
        }
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(true);
      });
  }, []);

  useEffect(() => {
    fetchMealDetails(tag);
  }, [fetchMealDetails]);

  const GradientButton = ({ onPress, text, colors }: any) => {
    return (
      <TouchableOpacity onPress={onPress} style={styles.buttonContainer}>
        <LinearGradient colors={colors} style={styles.gradient}>
          <Text style={styles.buttonText}>{text}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };
  const ButtonSlim = ({ onPress, text, colors }: any) => {
    return (
      <TouchableOpacity onPress={onPress} style={styles.buttonContainer}>
        <LinearGradient colors={colors} style={styles.gradientSlim}>
          <Text style={styles.slimButtonText}>{text}</Text>
        </LinearGradient>
      </TouchableOpacity>
    );
  };
  const getCurrMeal = () => {
    if (currentDate.getTime() <= new Date(2025, 4, 23, 23, 30).getTime() && currentDate.getTime() >= new Date(2025, 4, 2, 13, 30).getTime()) {
      return 'friDinner';
    } else if (currentDate.getTime() <= new Date(2025, 4, 24, 11, 30).getTime() && currentDate.getTime() >= new Date(2025, 4, 24, 1, 30).getTime()) {
      return 'satBreakfast';
    } else if (currentDate.getTime() <= new Date(2025, 4, 24, 16, 30).getTime() && currentDate.getTime() >= new Date(2025, 4, 24, 11, 10).getTime()) {
      return 'satLunch';
    } else if (currentDate.getTime() <= new Date(2025, 4, 24, 23, 30).getTime() && currentDate.getTime() >= new Date(2025, 4, 24, 17, 30).getTime()) {
      return 'satDinner';
    } else if (currentDate.getTime() <= new Date(2025, 4, 25, 11, 30).getTime() && currentDate.getTime() >= new Date(2025, 4, 25, 1, 30).getTime()) {
      return 'sunBreakfast';
    } else if (currentDate.getTime() <= new Date(2025, 4, 25, 16, 30).getTime() && currentDate.getTime() >= new Date(2025, 4, 25, 11, 10).getTime()) {
      return 'sunLunch';
    } else if (currentDate.getTime() <= new Date(2025, 4, 25, 23, 59).getTime() && currentDate.getTime() >= new Date(2025, 4, 25, 17, 30).getTime()) {
      return 'sunDinner';
    } else if (currentDate.getTime() <= new Date(2025, 4, 26, 9, 30).getTime() && currentDate.getTime() >= new Date(2025, 4, 26, 1, 30).getTime()) {
      return 'monBreakfast';
    } else if (currentDate.getTime() <= new Date(2025, 4, 26, 14, 30).getTime() && currentDate.getTime() >= new Date(2025, 4, 26, 9, 40).getTime()) {
      return 'monLunch';
    } else {
      alert('Time is not good');
      return 'undefined';
    }
  };
  const UpdateCurrMeal = (mealType: string, data: any) => {
    if (data && data.memberActivityDetails) {
      var mealC;
      mealC = JSON.stringify(data.memberActivityDetails.totalCount);
      updateMealValidity(mealC, data);
    }
  };

  const updateMealValidity = (mealC: any, data: any) => {
    const currentMeal = getCurrMeal();
    var integerDatax = parseInt(mealC);
    setMealCount(integerDatax);
    if (Number.isInteger(integerDatax) && integerDatax == 0) {
      setIsMealValid(true);
      addMemberActivity(currentMeal, data);
      setMealCount(integerDatax);
    } else if (Number.isInteger(integerDatax) && integerDatax == 1) {
      setIsMealValid(false);
    } else {
      setIsMealValid(false);
    }
  };

  const getLocation = () => {
    const locationValue = Array.isArray(location) ? location : [location];
    const formattedLocation = locationValue
      .map((value: any) => {
        if (value >= 1 && value < 7) {
          return `Lane ${value}`;
        } else if (value == 8) {
          return `Outdoor Lane`;
        } else if (value == 9) {
          return `Vegan lane`;
        } else if (value == 10) {
          return `VIP lane`;
        } else {
          return 'fast lane';
        }
      })
      .join(', ');
    return formattedLocation;
  };

  const addMemberActivity = async (meal: string, data: any) => {
    if (data && data.memberActivityDetails) {
      const formattedLocation = getLocation();
      const currentScannerId = await AsyncStorage.getItem('memberId');
      const mealdata: UpdateMealActivityRequest = {
        tagId: data.memberActivityDetails.tagId,
        apiVersion: '2.9',
        location: formattedLocation,
        activity: meal,
        category: 'mealtracking',
        activityId: 0,
        scannerMemberId: currentScannerId,
      };
      updateMealActivity(mealdata)
        .then((mealdata: any) => {
          setMealCount(mealdata.count);
          setRefreshing(true);
        })
        .catch((error: any) => {
          console.error(error);
          // simple alert fallback
          alert('fail to read tag');
        });
    }
  };

  if (data.memberActivityDetails) {
    const currentMeal = getCurrMeal();
    const item = (data as any).memberActivityDetails;
    return (
      <View>
        <View style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
          <TouchableOpacity
            style={styles.logoutButton}
            onPress={() => {
              props.navigation.navigate(Routes.Home);
            }}
          >
            <Ionicons name="home" size={24} color="#5dbea3" />
          </TouchableOpacity>
        </View>
        <View></View>
        <View style={styles.section}>
          <GradientButton onPress={() => {}} text={`${currentMeal} ${curMealCount}`} colors={isMealValid ? ['#4CAF50', '#8BC34A'] : ['#A42536', '#FF0000']} />
        </View>
        <LinearGradient colors={['#2193b0', '#6dd5ed']} style={styles.gradientContainer}>
          <View key={item.id}>
            <Text style={styles.sectionHeader}>{item.legalName}</Text>
            <View style={styles.row}>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>MEMBER ID</Text>
                <Text style={styles.sectionText}>{item.memberId}</Text>
              </View>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>SP DISCIPLE?</Text>
                <Text style={styles.sectionText}>{item.isSPDisciple}</Text>
                {item.isSPDisciple === 'Y' && (
                  <View style={styles.circleContainer}>
                    <Image source={{ uri: 'https://storage.googleapis.com/sadhu-sanga/1/2023/05/Add_a_little_bit_of_body_text__5_-removebg-preview.png' }} style={styles.circleImage} />
                  </View>
                )}
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>REGISTRATION TYPE</Text>
                <Text style={styles.sectionText}>{item.registrationType}</Text>
              </View>
            </View>
            <View style={styles.row}>
              <View style={styles.section}>
                <Text style={styles.sectionLabel}>TAG ID</Text>
                <Text style={styles.sectionText}>{item.tagId}</Text>
              </View>
            </View>
          </View>
        </LinearGradient>
        <View style={styles.row}>
          <View>
            <ButtonSlim onPress={() => {}} text="REMOVE MEAL" colors={['#EA4C46', '#F1959B']} />
          </View>
          <View>
            <ButtonSlim onPress={() => { addMemberActivity(currentMeal, data); }} text="ADD MEAL" colors={['#2EB62C', '#83D475']} />
          </View>
          <View>
            <ButtonSlim
              onPress={() => {
                props.navigation.navigate('Home');
              }}
              text="BACK HOME"
              colors={['#2EB62C', '#83D475']}
            />
          </View>
        </View>
        <View style={styles.nextScanContainer}>
          <TouchableOpacity
            onPress={() => {
              props.navigation.navigate(Routes.Scanner, { location, screen: Routes.MealScan });
            }}
            style={styles.nextScanButton}
          >
            <LinearGradient colors={['#3ABEF9', '#5D9CEC']} style={styles.nextScanGradient}>
              <Text style={styles.nextScanText}>NEXT SCAN</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>
      </View>
    );
  } else {
    return (
      <View>
        <View>
          <Text style={styles.sectionLabel}> IF YOU ARE ON THIS SCREEN FOR MORE THAN 5 SECONDS, THEN PLEASE CHECK IF TAG IS REGISTERED </Text>
        </View>
        <View></View>
      </View>
    );
  }
}

const styles = StyleSheet.create({
  row: {
    marginLeft: 20,
    flexDirection: 'row',
    alignItems: 'center',
  },
  sectionLabel: {
    fontSize: 16,
    marginBottom: 5,
    color: 'black',
  },
  sectionText: {
    fontSize: 16,
    marginBottom: 2,
    color: 'black',
    fontFamily: 'Verdana-Bold',
  },
  sectionHeader: {
    paddingLeft: 15,
    fontSize: 26,
    marginBottom: 5,
    color: 'black',
    fontFamily: 'AlNile-Bold',
  },
  listItem: {
    flex: 0.5,
    paddingVertical: 35,
    paddingHorizontal: 15,
    flexDirection: 'column',
    justifyContent: 'space-between',
    borderBottomWidth: 1,
    borderBottomColor: 'blue',
  },
  section: {
    borderWidth: 3,
    borderColor: '#000',
    borderRadius: 15,
    backgroundColor: '#ffc0cb',
    paddingVertical: 15,
    paddingHorizontal: 5,
    marginLeft: 10,
    marginRight: 10,
    marginTop: 5,
  },
  textBox: {
    fontSize: 20,
    fontWeight: 'bold',
    fontFamily: 'Iowan Old Style',
    paddingLeft: 10,
    marginBottom: 20,
    borderWidth: 3,
    backgroundColor: '#FFC65B',
    borderRadius: 15,
  },
  buttonContainer: {
    width: '80%',
    alignItems: 'center',
    marginBottom: 10,
    alignSelf: 'center',
  },
  gradient: {
    width: '100%',
    borderRadius: 20,
    paddingVertical: 55,
    alignItems: 'center',
  },
  gradientSlim: {
    width: '100%',
    borderRadius: 15,
    paddingVertical: 15,
    paddingHorizontal: 0,
    alignItems: 'center',
    marginLeft: 5,
    marginRight: 5,
    marginTop: 5,
  },
  gradientContainer: {
    width: '80%',
    borderRadius: 15,
    paddingVertical: 15,
    alignItems: 'center',
    alignSelf: 'center',
    borderWidth: 4,
  },
  buttonText: {
    fontSize: 26,
    fontWeight: 'bold',
    color: '#fff',
  },
  slimButtonText: {
    fontSize: 15,
    fontWeight: 'bold',
    color: '#fff',
  },
  nextScanContainer: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  nextScanButton: {
    width: '80%',
    borderRadius: 20,
  },
  nextScanGradient: {
    width: '100%',
    paddingVertical: 20,
    borderRadius: 20,
    alignItems: 'center',
  },
  nextScanText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  circleContainer: {
    width: 60,
    height: 60,
    borderRadius: 30,
    overflow: 'hidden',
  },
  circleImage: {
    width: '100%',
    height: '100%',
    resizeMode: 'cover',
  },
  logoutButton: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 10,
  },
});

export default MealScanScreen;


