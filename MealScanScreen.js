import React, { useEffect, useState, useMemo, useCallback } from 'react';
import {
    StyleSheet,
    View,
    StatusBar,
    TouchableOpacity,
    FlatList,
    ScrollView,
    Text,
    Image,
} from 'react-native';
import { Button } from 'react-native-paper';
import { useNavigation, useRoute } from '@react-navigation/native';
import { LinearGradient } from 'expo-linear-gradient';
import { api } from './services/api';
import { Ionicons } from '@expo/vector-icons';

function MealScanScreen(props) {    
    const { navigation } = props;
    const { tag } = props.route.params;
    const { location } = props.route.params;
    const [isLoading, setLoading] = useState(true);
    const [data, setData] = useState([]);
    const [isMealValid, setIsMealValid] = useState(false);
    const [refresh, setRefresh] = useState(false);
    const [currentDate, setCurrentDate] = useState(new Date());
    const [curMealCount, setMealCount] = useState(0); // Initialize meal count to zero
    const [supported, setSupported] = React.useState(null);
    const [enabled, setEnabled] = React.useState(null);
    const [currentTag, setCurrentTag] = useState(null);
    const [refreshing, setRefreshing] = useState(false);
    const [currMeal, setCurrMeal] = useState(null);
    const [myError, setError] = useState(false);
    const [lastReadZero, setLastReadZero] = useState(false);
    const [isContinuousRead, setContinuousRead] = useState(true);
    // Add state variables to keep track of loading state
    const [isAddingMeal, setIsAddingMeal] = useState(false);
    const [isRemovingMeal, setIsRemovingMeal] = useState(false);
    const [scannerMemberId, setScannerMemberId] = useState(null);
    const [memberDetails, setMemberDetails] = useState(null);


      useEffect(() => {
          loadPermissions();
          loadScannerMemberId();
          fetchMemberDetails(tagId);
      }, []);

        const fetchMemberDetails = async (tagId, withRefresh = false) => {
            if (!withRefresh) {
              setIsLoading(true);
            }
            try {
              const scannerMemberId = await AsyncStorage.getItem('memberId');
              const memberDetails = await api.get('getMemberActivity', {
                tagId: tagId,
                category: 'gifttracking',
                scannerMemberId: scannerMemberId
              });
              setMemberDetails(new MemberDetails(memberDetails.memberActivityDetails));
              console.log(memberDetails);
            } catch (error) {
              console.error('Error fetching member details:', error);
              navigation.navigate('Home');
              Alert.alert('Error', 'Failed to fetch member details');
            } finally {
              setIsLoading(false);
              setIsButtonLoading(false);
            }
          };
      
        const loadScannerMemberId = async () => {
              try {
                const memberId = await AsyncStorage.getItem('memberId');
                setScannerMemberId(memberId);
              } catch (error) {
                console.error('Error loading scanner member ID:', error);
              }
         };
    // Store the result of getCurrMeal in a variable
    const fetchMealDetails = useCallback((tagin, mealType) => {
      setLoading(true); // Set loading state to true
      const currentMeal = getCurrMeal();
      api.get('getMemberActivity', {
        tagId: tagin.id,
        activity: currentMeal,
        category: 'mealtracking',
      })
        .then((json) => {
          setData(json);
          console.log(data);
          setError(false);
          UpdateCurrMeal(currentMeal, json);
        })
        .catch((error) => {
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
    }, [setData, getCurrMeal, UpdateCurrMeal]);
    
    useEffect(() => {
        fetchMealDetails(tag, getCurrMeal());
    }, [fetchMealDetails]);
    
    const GradientButton = ({ onPress, text, colors }) => {
        return (
            <TouchableOpacity onPress={onPress} style={styles.buttonContainer}>
                <LinearGradient colors={colors} style={styles.gradient}>
                    <Text style={styles.buttonText}>{text}</Text>
                </LinearGradient>
            </TouchableOpacity>
        );
    };
    const ButtonSlim = ({ onPress, text, colors }) => {
        return (
                <TouchableOpacity onPress={onPress} style={styles.buttonContainer}>
                <LinearGradient colors={colors} style={styles.gradientSlim}>
                <Text style={styles.slimButtonText}>{text}</Text>
                </LinearGradient>
                </TouchableOpacity>
                );
    };
    const getCurrMeal = () => {
        if ((currentDate.getTime() <= new Date(2025, 4, 23, 23, 30)) && (currentDate.getTime() >= new Date(2025, 4, 2, 13, 30))) {
            return "friDinner";
        } else  if ((currentDate.getTime() <= new Date(2025, 4, 24, 11, 30)) && (currentDate.getTime() >= new Date(2025, 4, 24, 6, 30))) {
            return "satBreakfast";
        }else if ((currentDate.getTime() <= new Date(2025, 4, 24, 16, 30)) && (currentDate.getTime() >= new Date(2025, 4, 24, 11, 30))) {
            return "satLunch";
        } else if ((currentDate.getTime() <= new Date(2025, 4, 24, 23, 30)) && (currentDate.getTime() >= new Date(2025, 4, 24, 16, 30))) {
            return "satDinner";
        } else if ((currentDate.getTime() <= new Date(2025, 4, 25, 11, 30)) && (currentDate.getTime() >= new Date(2025, 4, 25, 6, 30))) {
            return "sunBreakfast";
        } else if ((currentDate.getTime() <= new Date(2025, 4, 25, 16, 30)) && (currentDate.getTime() >= new Date(2025, 4, 25, 11, 30))) {
            return "sunLunch";
        } else if ((currentDate.getTime() <= new Date(2025, 4, 25, 23, 59)) && (currentDate.getTime() >= new Date(2025, 4, 25, 16, 30))) {
            return "sunDinner";
        } else if ((currentDate.getTime() <= new Date(2025, 4, 26, 9, 10)) && (currentDate.getTime() >= new Date(2025, 4, 26, 6, 30))) {
            return "monBreakfast";
        } else if ((currentDate.getTime() <= new Date(2025, 4, 26, 14, 30)) && (currentDate.getTime() >= new Date(2025, 4, 26, 6, 10))) {
            return "monLunch"
        } else {
            alert("Time is not good")
            return "undefined"
        }
    }
    const UpdateCurrMeal = (mealType, data) => {
        if (data && data.memberActivityDetails) { // Add a conditional check for data and data.memberActivityDetails
            //alert(data.memberActivityDetails.tagId)
            var mealC;
                mealC = JSON.stringify(data.memberActivityDetails.totalCount);
                var integerDatax = parseInt(mealC)
                //alert(integerDatax);
                updateMealValidity(mealC, data);
        }
        else {
            //alert ("data undefined");
        }
    }
    
    const updateMealValidity = (mealC, data) => {
        const currentMeal = getCurrMeal();
        var integerDatax = parseInt(mealC);
        setMealCount(integerDatax);
        //alert(integerDatax);
        if(Number.isInteger(integerDatax) && integerDatax == 0){
            setIsMealValid(true);
            addMemberActivity(currentMeal, data);
            setMealCount(integerDatax);
            setLastReadZero(true);
        }
        else if(Number.isInteger(integerDatax) && integerDatax == 1){
            setIsMealValid(false);
            setLastReadZero(false);
        }
        else
        {
            setIsMealValid(false);
            setLastReadZero(false);
        }
    }     
    const refreshMealCountDisplay = (updateJson) => {
        var mealC;
            mealC = JSON.stringify(updateJson.count);
            setMealCount(updateJson.count);
    } 


    const getLocation = () => {
        const locationValue = Array.isArray(location) ? location : [location];
        const formattedLocation = locationValue.map((value) => {
            if (value >= 1 && value < 9) {
                return `custom lane ${value}`;
            } else if (value == 9) {
                return `Vegan lane`;
            } else if (value == 10) {
                return `VIP lane`;
            }else {
                return 'fast lane';
            }
        }).join(', ');
        return formattedLocation;
    }
    const navigateToBarcodeScannerForMeal = () => {
        const formattedLocation = getLocation();
        navigation.navigate('BarcodeScanner', {location : formattedLocation, screen: 'MealScan' });
      };

    const addMemberActivity = (meal, data) => {
        if (data && data.memberActivityDetails) {
            const formattedLocation = getLocation();
            const mealdata = {
                "tagId": data.memberActivityDetails.tagId,
                "apiVersion": "2.9",
                "location": formattedLocation,
                "activity": meal,
                "category": "mealtracking",
                "activityId": 0,
                "scannerMemberId": scannerMemberId
            }
            setRefresh(false);
            api.post('updateMemberActivity', mealdata)
                .then(mealdata => {
                    console.log(mealdata);
                    refreshMealCountDisplay(mealdata);
                    setRefreshing(true);
                })
                .catch(error => {
                    console.error(error);
                    alert('ERROR', 'fail to read tag', [{text: 'OK'}]);
                })
                .finally(() => {
                    setIsAddingMeal(false);
                    setRefreshing(true);
                });
        }
    };
    const removeMemberActivity = (meal) => {
        const formattedLocation = getLocation();
        if (data && data.memberActivityDetails) {
            const mealdata = {
                "tagId": data.memberActivityDetails.tagId,
                "apiVersion": "2.9",
                "location": formattedLocation,
                "activity": meal,
                "category": "mealtracking",
                "activityId": 0,
                "scannerMemberId": scannerMemberId,
                "remove": true
            }
            setRefresh(false);
            api.post('updateMemberActivity', mealdata)
                .then(mealdata => {
                    console.log(mealdata);
                    refreshMealCountDisplay(mealdata);
                    setRefreshing(true)
                })
                .catch(error => {
                    console.error(error);
                    alert('ERROR', 'fail to read tag', [{text: 'OK'}]);
                })
                .finally(() => {
                    setIsRemovingMeal(false);
                    setRefreshing(true);
                });
        }
    };


    if (myError) {
      return (
        <View>
          <Text style={styles.sectionLabel}>Error fetching meal details</Text>
        </View>
      );
    } else if (
        data.memberActivityDetails
        ) {
            const currentMeal = getCurrMeal();
            const item = data.memberActivityDetails;
            return (
                    <View>
    {/* Add the "Home" button at the top-right corner */}
<View style={{ position: 'absolute', top: 10, right: 10, zIndex: 10 }}>
<TouchableOpacity
          style={styles.logoutButton}
          onPress={() => {
            navigation.navigate('Home'); // Navigate to the Home screen
          }} 
        >
          <Ionicons name="home" size={24} color="#5dbea3" />
        </TouchableOpacity>
</View>

    {/* Rest of the MealScanScreen content */}
    <View>
      {/* Existing content */}
    </View>
                    <View tyle={styles.section}>
                    <GradientButton
                        onPress={() => {}}
                        text={`${currentMeal} ${curMealCount}`} // Display current meal and meal count
                        colors={isMealValid ? ['#4CAF50', '#8BC34A'] : ['#A42536', '#FF0000']}
                    />
                    </View>
                    <LinearGradient colors={['#2193b0', '#6dd5ed']} style ={styles.gradientContainer}>
                        <View key={item.id}>
                                <Text style = {styles.sectionHeader}>{item.legalName}</Text>
                    <View style= {styles.row}>
                                <View style={styles.section}>
                                <Text style = {styles.sectionLabel}>MEMBER ID</Text>
                                <Text style = {styles.sectionText}>{item.memberId}</Text>
                                </View>
                                <View style = {styles.section}>
                                <Text style = {styles.sectionLabel}>SP DISCIPLE?</Text>
                                <Text style = {styles.sectionText}>{item.isSPDisciple}</Text>
                               {item.isSPDisciple === 'Y' && (
                              <View style={styles.circleContainer}>
                                <Image source={{ uri: 'https://storage.googleapis.com/sadhu-sanga/1/2023/05/Add_a_little_bit_of_body_text__5_-removebg-preview.png' }} style={styles.circleImage} />
                              </View>
                            )}
                                </View>
                    </View>
                    <View style= {styles.row}>
                                <View style = {styles.section}>
                                <Text style = {styles.sectionLabel}>REGISTRATION TYPE</Text>
                                <Text style = {styles.sectionText}>{item.registrationType}</Text>
                                {item.registrationType.includes('daypass') && (
      <View style={styles.circleContainer}>
        <Image source={{ uri: 'https://shipcityfitness.com/wp-content/uploads/2021/01/Day-pass.png' }} style={styles.circleImage} />
      </View>
    )}
                    </View>
                    </View>
                    <View style= {styles.row}>
                    <View style={styles.section}>
                    <Text style = {styles.sectionLabel}>TAG ID</Text>
                    <Text style = {styles.sectionText}>{item.tagId}</Text>
                    </View>
                    </View>
                        </View>
                    </LinearGradient>
                    <View style= {styles.row}>
                    <View>
                    <ButtonSlim onPress={() => { setRefreshing(false); setIsRemovingMeal(true); removeMemberActivity(currentMeal); }} text="REMOVE MEAL" colors={['#EA4C46', '#F1959B']} disabled={isRemovingMeal} />
                    </View>
                    <View>
                    <ButtonSlim onPress={() => {setRefreshing(false); setIsAddingMeal(true);
                        addMemberActivity(currentMeal, data); }} text="ADD MEAL" colors={['#2EB62C', '#83D475']} disabled={isAddingMeal} />
                    </View>
                    <View>
                    <ButtonSlim onPress={() => {
            navigation.navigate('Home'); // Navigate to the Home screen
          }}  text="BACK HOME" colors={['#2EB62C', '#83D475']} disabled={isAddingMeal} />
                    </View>
                    </View>
                    {/* Add the "Next Scan" button */}
<View style={styles.nextScanContainer}>
  <TouchableOpacity 
    onPress={() => {
      const formattedLocation = getLocation();
      navigation.navigate('BarcodeScanner', { location: formattedLocation, screen: 'MealScan' });
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
        }
    else
    {
        return(
               <View>
               <View>
               <Text style={styles.sectionLabel}> IF YOU ARE ON THIS SCREEN FOR MORE THAN 5 SECONDS, THEN PLEASE CHECK IF TAG IS REGISTERED </Text>
               </View>
               <View>
               </View>
               </View>
               );
    }
}

const styles = StyleSheet.create({
wrapper: {
flex: 1,
},
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
container: {
marginTop: StatusBar.currentHeight || 10,
backgroundColor: '#fff',
justifyContent: 'center',
alignItems: 'center',
alignSelf: 'center',
width:'90%',
backgroundColor: 'white',
},
listItem:{
flex: 0.5,
paddingVertical: 35,
paddingHorizontal: 15,
flexDirection: 'column',
justifyContent: 'space-between',
borderBottomWidth: 1,
borderBottomColor: 'blue',
},
listItemRow:{
flex: 0.5,
paddingVertical: 15,
paddingHorizontal: 15,
flexDirection: 'row',
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
marginTop: 5
},
boxedButtonR: {
flex: 1,
borderWidth: 3,
borderColor: '#000',
borderRadius: 15,
backgroundColor: 'red',
paddingVertical: 15,
paddingHorizontal: 5,
},
textBox: {
fontSize: 20,
fontWeight: "bold",
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
borderWidth: 4
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
      width: '80%', // Use 80% of the screen width
      borderRadius: 20,
    },
    nextScanGradient: {
      width: '100%',
      paddingVertical: 20, // Make the button taller
      borderRadius: 20,
      alignItems: 'center',
    },
    nextScanText: {
      fontSize: 20, // Larger font size for better visibility
      fontWeight: 'bold',
      color: '#fff',
    },
circleContainer: {
   width: 60, // Twice the radius for diameter
   height: 60, // Twice the radius for diameter
   borderRadius: 30, // Radius of 30 for a circle
   overflow: 'hidden', // Clip the image within the circle
 },
 circleImage: {
   width: '100%',
   height: '100%',
   resizeMode: 'cover',
 },
});

export default MealScanScreen;
