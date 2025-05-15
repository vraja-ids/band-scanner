import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './services/api';
import ServiceTypes from './models/ServiceTypes';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import MemberDetails from './models/MemberDetails';

const GiftApprovalScreen = ({ route }) => {
  const { tag } = route.params;
  const tagId = tag.id;
  const [isLoading, setIsLoading] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [permissions, setPermissions] = useState({
    canScanOthersQr: false,
    canApproveTshirt: false,
    canApproveJacket: false,
    canFulfillTshirt: false,
    canFulfillJacket: false
  });
  const [scannerMemberId, setScannerMemberId] = useState(null);
  const [memberDetails, setMemberDetails] = useState(null);
  const [isGiftDetailsExpanded, setIsGiftDetailsExpanded] = useState(false);
  const navigation = useNavigation();

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

  const loadPermissions = async () => {
    try {
      const canScanOthersQr = JSON.parse(await AsyncStorage.getItem('canScanOthersQr'));
      const canApproveTshirt = JSON.parse(await AsyncStorage.getItem('canApproveGiftTshirt'));
      const canApproveJacket = JSON.parse(await AsyncStorage.getItem('canApproveGiftJacket'));
      const canFulfillTshirt = JSON.parse(await AsyncStorage.getItem('canFulfillGiftTshirt'));
      const canFulfillJacket = JSON.parse(await AsyncStorage.getItem('canFulfillGiftJacket'));

      setPermissions({
        canScanOthersQr,
        canApproveTshirt,
        canApproveJacket,
        canFulfillTshirt,
        canFulfillJacket
      });
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const handleGiftAction = async (action, giftType) => {
    console.log(memberDetails);
    const isApproval = action === 'approve' || action === 'disapprove';

    // Check if trying to fulfill without approval
    if (action === 'fulfill' && !memberDetails?.giftStatus.includes(`${giftType}Approved`)) {
      Alert.alert('Error', `${giftType} must be approved before fulfillment`);
      return;
    }

    // Check if trying to disapprove when fulfilled
    if (action === 'disapprove' && memberDetails?.giftStatus.includes(`${giftType}Fulfilled`)) {
      Alert.alert('Error', 'Cannot disapprove a fulfilled gift');
      return;
    }

    Alert.alert(
      'Confirm Action',
      `Are you sure you want to ${action} the ${giftType}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setIsButtonLoading(true);
              const activityData = {
                apiVersion: "2.0",
                memberId: memberDetails?.memberId,
                tagId: tagId,
                category: "gifttracking",
                activityId: giftType === 'tshirt' ? ServiceTypes.TSHIRT : ServiceTypes.JACKET,
                location: "Default",
                activity: isApproval ? "giftapproval" : "giftfulfilled",
                remove: action === 'disapprove' || action === 'unfulfill',
                scannerMemberId: scannerMemberId
              };

              const response = await api.post('updateMemberActivity', activityData);

              if (response?.success) {
                fetchMemberDetails(tagId, true); // Refresh the data
              } else {
                Alert.alert('Error', 'Failed to fetch gift status');
              }
            } catch (error) {
              console.error('Error updating gift status:', error);
              Alert.alert('Error', 'Failed to update gift status');
            }
          }
        }
      ]
    );
  };

  const getGiftStatus = (giftType) => {
    if (!memberDetails?.giftStatus) return 'Not-Approved';
    if (memberDetails.giftStatus.includes(`${giftType}Fulfilled`)) return 'Fulfilled';
    if (memberDetails.giftStatus.includes(`${giftType}Approved`)) return 'Approved';
    return 'Not-Approved';
  };

  const renderGiftDetails = () => {
    if (!memberDetails?.giftDetails || memberDetails.giftDetails.length === 0) {
      return (
        <Text style={styles.noDetailsText}>No gift details available</Text>
      );
    }

    return memberDetails.giftDetails.map((detail, index) => (
      <View key={index} style={styles.giftDetailItem}>
        {Object.entries(detail).map(([key, value]) => (
          <View key={key} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{key}:</Text>
            <Text style={styles.detailValue}>{value}</Text>
          </View>
        ))}
      </View>
    ));
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#5dbea3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.scrollContainer}>
      <View style={styles.container}>
        {memberDetails && (
          <Text style={styles.memberName}>For: {memberDetails.getDisplayName()}</Text>
        )}
        <Text style={styles.title}>Gift Status</Text>

        <View style={styles.giftContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.giftTitle}>T-Shirt</Text>
            <Ionicons name="shirt-outline" size={22} color="brown" style={{ marginLeft: 8 }} />
          </View>
          <Text style={styles.status}>Status: {getGiftStatus('tshirt')}</Text>
          {permissions.canApproveTshirt && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleGiftAction(
                getGiftStatus('tshirt') === 'Approved' || getGiftStatus('tshirt') === 'Fulfilled' ? 'disapprove' : 'approve',
                'tshirt'
              )}
            >
              {isButtonLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {getGiftStatus('tshirt') === 'Approved' || getGiftStatus('tshirt') === 'Fulfilled' ? 'Disapprove T-Shirt' : 'Approve T-Shirt'}
                </Text>
              )}
            </TouchableOpacity>
          )}
          {permissions.canFulfillTshirt && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleGiftAction(
                getGiftStatus('tshirt') === 'Fulfilled' ? 'unfulfill' : 'fulfill',
                'tshirt'
              )}
            >
              {isButtonLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {getGiftStatus('tshirt') === 'Fulfilled' ? 'Un-fulfill T-Shirt' : 'Fulfill T-Shirt'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>

        <View style={styles.giftContainer}>
          <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
            <Text style={styles.giftTitle}>Jacket</Text>
            <FontAwesome6 name="mandalorian" size={22} color="brown" style={{ marginLeft: 8 }} />
          </View>
          <Text style={styles.status}>Status: {getGiftStatus('jacket')}</Text>
          {permissions.canApproveJacket && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleGiftAction(
                getGiftStatus('jacket') === 'Approved' || getGiftStatus('jacket') === 'Fulfilled' ? 'disapprove' : 'approve',
                'jacket'
              )}
            >
              {isButtonLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {getGiftStatus('jacket') === 'Approved' || getGiftStatus('jacket') === 'Fulfilled' ? 'Disapprove Jacket' : 'Approve Jacket'}
                </Text>
              )}
            </TouchableOpacity>
          )}
          {permissions.canFulfillJacket && (
            <TouchableOpacity
              style={styles.button}
              onPress={() => handleGiftAction(
                getGiftStatus('jacket') === 'Fulfilled' ? 'unfulfill' : 'fulfill',
                'jacket'
              )}
            >
              {isButtonLoading ? (
                <ActivityIndicator color="#fff" />
              ) : (
                <Text style={styles.buttonText}>
                  {getGiftStatus('jacket') === 'Fulfilled' ? 'Un-fulfill Jacket' : 'Fulfill Jacket'}
                </Text>
              )}
            </TouchableOpacity>
          )}
        </View>
        <TouchableOpacity
          style={styles.giftDetailsHeader}
          onPress={() => setIsGiftDetailsExpanded(!isGiftDetailsExpanded)}
        >
          <Text style={styles.giftDetailsTitle}>Gift Details</Text>
          <Ionicons
            name={isGiftDetailsExpanded ? "chevron-up" : "chevron-down"}
            size={24}
            color="#5dbea3"
          />
        </TouchableOpacity>

        {isGiftDetailsExpanded && (
          <View style={styles.giftDetailsContainer}>
            {renderGiftDetails()}
          </View>
        )}
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  scrollContainer: {
    flex: 1,
  },
  container: {
    flex: 1,
    padding: 20,
    backgroundColor: '#fff',
  },
  memberName: {
    fontSize: 24,
    fontWeight: 'bold',
    color: 'black',
    marginBottom: 20,
    textAlign: 'center',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  giftContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginBottom: 20,
  },
  giftTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  status: {
    fontSize: 16,
    marginBottom: 10,
  },
  button: {
    backgroundColor: '#5dbea3',
    padding: 10,
    borderRadius: 5,
    marginTop: 10,
  },
  buttonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
  giftDetailsHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginTop: 20,
    width: '100%',
  },
  giftDetailsTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: 'brown',
  },
  giftDetailsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    width: '100%',
  },
  giftDetailItem: {
    marginBottom: 15,
    padding: 10,
    backgroundColor: 'white',
    borderRadius: 8,
  },
  detailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
  },
  noDetailsText: {
    textAlign: 'center',        // centers the text horizontally
    color: '#666',
    fontStyle: 'italic',
    paddingHorizontal: 10,      // horizontal padding inside the box
    paddingVertical: 8,         // vertical padding
    fontSize: 14,
    flexWrap: 'wrap',           // allows wrapping
    width: '100%',              // ensure it respects parent width
  },
});

export default GiftApprovalScreen; 