import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './services/api';
import ServiceTypes from './models/ServiceTypes';
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
import MemberDetails from './models/MemberDetails';

const QuantitySelectorModal = ({ 
  visible, 
  onClose, 
  onConfirm, 
  quantity, 
  setQuantity, 
  maxQuantity,
  action 
}) => {
  const getActionText = () => {
    switch(action) {
      case 'approve': return 'Approve';
      case 'disapprove': return 'Disapprove';
      case 'fulfill': return 'Fulfill';
      case 'unfulfill': return 'Un-fulfill';
      default: return '';
    }
  };

  return (
    <Modal
      visible={visible}
      transparent={true}
      animationType="fade"
      onRequestClose={() => {}}
    >
      <View style={styles.modalOverlay}>
        <View style={styles.quantitySelectorContainer}>
          <Text style={styles.quantityTitle}>Select Quantity to {getActionText()}</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity
              style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]}
              onPress={() => setQuantity(Math.max(1, quantity - 1))}
              disabled={quantity <= 1}
            >
              <Text style={[styles.quantityButtonText, quantity <= 1 && styles.quantityButtonTextDisabled]}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity
              style={[styles.quantityButton, quantity >= maxQuantity && styles.quantityButtonDisabled]}
              onPress={() => setQuantity(Math.min(maxQuantity, quantity + 1))}
              disabled={quantity >= maxQuantity}
            >
              <Text style={[styles.quantityButtonText, quantity >= maxQuantity && styles.quantityButtonTextDisabled]}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quantityActionButtons}>
            <TouchableOpacity
              style={[styles.quantityActionButton, styles.cancelButton]}
              onPress={onClose}
            >
              <Text style={styles.quantityActionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.quantityActionButton, styles.confirmButton]}
              onPress={() => onConfirm(quantity)}
            >
              <Text style={styles.quantityActionButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

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
    canFulfillJacket: false,
    canApproveMultipleGifts: false
  });
  const [scannerMemberId, setScannerMemberId] = useState(null);
  const [memberDetails, setMemberDetails] = useState(null);
  const [isGiftDetailsExpanded, setIsGiftDetailsExpanded] = useState(false);
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);
  const [selectedAction, setSelectedAction] = useState(null);
  const [selectedGiftType, setSelectedGiftType] = useState(null);
  const [quantity, setQuantity] = useState(1);
  const navigation = useNavigation();

  useEffect(() => {
    loadPermissions();
    loadScannerMemberId();
    console.log('started fetching member details');
    console.log('tagId:', tagId);
    if (tagId) {
      fetchMemberDetails(tagId);
    } else {
      console.error('No tagId provided');
    }
  }, []);

  const fetchMemberDetails = async (tagId, withRefresh = false) => {
    console.log('fetchMemberDetails called with tagId:', tagId);
    if (!withRefresh) {
      setIsLoading(true);
    }
    try {
      const scannerMemberId = await AsyncStorage.getItem('memberId');
      console.log('Fetching member details with scannerMemberId:', scannerMemberId);
      const memberDetails = await api.get('getMemberActivity', {
        tagId: tagId,
        category: 'gifttracking',
        scannerMemberId: scannerMemberId
      });
      console.log('Member details response:', memberDetails);
      setMemberDetails(new MemberDetails(memberDetails.memberActivityDetails));
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
      const canApproveMultipleGifts = JSON.parse(await AsyncStorage.getItem('canApproveMultipleGifts'));

      setPermissions({
        canScanOthersQr,
        canApproveTshirt,
        canApproveJacket,
        canFulfillTshirt,
        canFulfillJacket,
        canApproveMultipleGifts
      });
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const handleGiftAction = async (action, giftType) => {
    if (!memberDetails) return;
    
    const isApproval = action === 'approve' || action === 'disapprove';
    const isFulfillment = action === 'fulfill' || action === 'unfulfill';
    const counts = memberDetails.getGiftCounts(giftType);

    // Check if trying to fulfill when not approved
    if (isFulfillment && counts.approved === 0) {
      Alert.alert('Error', `${giftType} must be approved before fulfillment`);
      return;
    }

    // Check if trying to disapprove when fulfilled
    if (action === 'disapprove' && counts.fulfilled === counts.approved) {
      Alert.alert('Error', 'Cannot disapprove already fulfilled gifts');
      return;
    }

    // Check if trying to fulfill more than approved
    if (action === 'fulfill' && counts.fulfilled >= counts.approved) {
      Alert.alert('Error', 'Cannot fulfill more than approved quantity');
      return;
    }

    // Show quantity selector for all actions
    setSelectedAction(action);
    setSelectedGiftType(giftType);
    setQuantity(1);
    setShowQuantitySelector(true);
  };

  const handleQuantityConfirm = async (selectedQuantity) => {
    const counts = memberDetails.getGiftCounts(selectedGiftType);
    let maxQuantity = 10;

    // Set max quantity based on action type
    switch(selectedAction) {
      case 'approve':
        maxQuantity = permissions.canApproveMultipleGifts ? 100 : 1;
        break;
      case 'disapprove':
        maxQuantity = counts.approved - counts.fulfilled > 0 ? counts.approved - counts.fulfilled : 0;
        break;
      case 'fulfill':
        maxQuantity = counts.approved - counts.fulfilled;
        break;
      case 'unfulfill':
        maxQuantity = counts.fulfilled;
        break;
    }

    if (selectedQuantity > maxQuantity) {
      Alert.alert('Error', `Cannot ${selectedAction} more than ${maxQuantity} ${selectedGiftType}`);
      return;
    }

    try {
      setIsButtonLoading(true);
      const activityData = {
        apiVersion: "2.0",
        memberId: memberDetails?.memberId,
        tagId: tagId,
        category: "gifttracking",
        activityId: selectedGiftType === 'tshirt' ? ServiceTypes.TSHIRT : ServiceTypes.JACKET,
        location: "Default",
        activity: selectedAction === 'disapprove' || selectedAction === 'approve' ? "giftapproval": "giftfulfilled",
        remove: selectedAction === 'disapprove' || selectedAction === 'unfulfill',
        scannerMemberId: scannerMemberId,
        quantity: selectedQuantity
      };

      const response = await api.post('updateMemberActivity', activityData);

      if (response?.success) {
        fetchMemberDetails(tagId, true);
      } else {
        setIsButtonLoading(false);
        Alert.alert('Error', 'Failed to update gift status');
      }
    } catch (error) {
      setIsButtonLoading(false);
      console.error('Error updating gift status:', error);
      Alert.alert('Error', 'Failed to update gift status');
    } finally {
      setShowQuantitySelector(false);
    }
  };

  const handleQuantityCancel = () => {
    setShowQuantitySelector(false);
    setQuantity(1);
  };

  const handleQuantityChange = (newQuantity) => {
    setQuantity(newQuantity);
  };

  const renderGiftButtons = (giftType) => {
    if (!memberDetails) return null;
    
    const counts = memberDetails.getGiftCounts(giftType);
    const canApprove = giftType === 'tshirt' ? permissions.canApproveTshirt : permissions.canApproveJacket;
    const canFulfill = giftType === 'tshirt' ? permissions.canFulfillTshirt : permissions.canFulfillJacket;
    const isFulfilled = counts.fulfilled >= counts.approved;
    const isApproveDisabled = isButtonLoading || (!permissions.canApproveMultipleGifts && counts.approved >= 1);

    return (
      <View style={styles.buttonContainer}>
        <View style={styles.buttonRow}>
          {canApprove && (
            <>
              <TouchableOpacity
                style={[
                  styles.button, 
                  styles.approveButton,
                  isApproveDisabled && styles.buttonDisabled
                ]}
                onPress={() => handleGiftAction('approve', giftType)}
                disabled={isApproveDisabled}
              >
                {isButtonLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[styles.buttonText, isApproveDisabled && styles.buttonTextDisabled]}>
                    Approve
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button, 
                  styles.disapproveButton,
                  (isButtonLoading || isFulfilled) && styles.buttonDisabled
                ]}
                onPress={() => handleGiftAction('disapprove', giftType)}
                disabled={isButtonLoading || isFulfilled}
              >
                {isButtonLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[
                    styles.buttonText, 
                    (isButtonLoading || isFulfilled) && styles.buttonTextDisabled
                  ]}>
                    Disapprove
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
        <View style={styles.buttonRow}>
          {canFulfill && (
            <>
              <TouchableOpacity
                style={[
                  styles.button, 
                  styles.fulfillButton,
                  (isButtonLoading || isFulfilled) && styles.buttonDisabled
                ]}
                onPress={() => handleGiftAction('fulfill', giftType)}
                disabled={isButtonLoading || isFulfilled}
              >
                {isButtonLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[
                    styles.buttonText, 
                    (isButtonLoading || isFulfilled) && styles.buttonTextDisabled
                  ]}>
                    Fulfill
                  </Text>
                )}
              </TouchableOpacity>
              <TouchableOpacity
                style={[
                  styles.button, 
                  styles.unfulfillButton,
                  (isButtonLoading || counts.fulfilled === 0) && styles.buttonDisabled
                ]}
                onPress={() => handleGiftAction('unfulfill', giftType)}
                disabled={isButtonLoading || counts.fulfilled === 0}
              >
                {isButtonLoading ? (
                  <ActivityIndicator color="#fff" />
                ) : (
                  <Text style={[
                    styles.buttonText, 
                    (isButtonLoading || counts.fulfilled === 0) && styles.buttonTextDisabled
                  ]}>
                    Un-fulfill
                  </Text>
                )}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
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
            <Text style={styles.detailValue} numberOfLines={0}>{value}</Text>
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
        {memberDetails ? (
          <>
            <Text style={styles.memberName}>For: {memberDetails.getDisplayName()}</Text>
            <Text style={styles.title}>Gift Status</Text>

            <View style={styles.giftContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.giftTitle}>T-Shirt</Text>
                <Ionicons name="shirt-outline" size={22} color="brown" style={{ marginLeft: 8 }} />
              </View>
              <Text style={styles.count}>Approved: {memberDetails.getGiftCounts('tshirt').approved}</Text>
              <Text style={styles.count}>Fulfilled: {memberDetails.getGiftCounts('tshirt').fulfilled}</Text>
              {renderGiftButtons('tshirt')}
            </View>

            <View style={styles.giftContainer}>
              <View style={{ flexDirection: 'row', alignItems: 'center', marginBottom: 10 }}>
                <Text style={styles.giftTitle}>Jacket</Text>
                <FontAwesome6 name="mandalorian" size={22} color="brown" style={{ marginLeft: 8 }} />
              </View>
              <Text style={styles.count}>Approved: {memberDetails.getGiftCounts('jacket').approved}</Text>
              <Text style={styles.count}>Fulfilled: {memberDetails.getGiftCounts('jacket').fulfilled}</Text>
              {renderGiftButtons('jacket')}
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
          </>
        ) : (
          <View style={styles.errorContainer}>
            <Text style={styles.errorText}>No member details available</Text>
          </View>
        )}
      </View>
      {memberDetails && selectedGiftType && (
        <QuantitySelectorModal
          visible={showQuantitySelector}
          onClose={handleQuantityCancel}
          onConfirm={handleQuantityConfirm}
          quantity={quantity}
          setQuantity={setQuantity}
          maxQuantity={(() => {
            const counts = memberDetails.getGiftCounts(selectedGiftType);
            switch(selectedAction) {
              case 'approve':
                return permissions.canApproveMultipleGifts ? 100 : 1;
              case 'disapprove':
                return counts.approved - counts.fulfilled > 0 ? counts.approved - counts.fulfilled : 0;
              case 'fulfill':
                return counts.approved - counts.fulfilled;
              case 'unfulfill':
                return counts.fulfilled;
              default:
                return 10;
            }
          })()}
          action={selectedAction}
        />
      )}
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
  buttonContainer: {
    marginTop: 10,
  },
  buttonRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  button: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
    marginHorizontal: 5,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#cccccc',
    opacity: 0.7,
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 16,
  },
  buttonTextDisabled: {
    color: '#666666',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  disapproveButton: {
    backgroundColor: '#f44336',
  },
  fulfillButton: {
    backgroundColor: '#2196F3',
  },
  unfulfillButton: {
    backgroundColor: '#FF9800',
  },
  count: {
    fontSize: 14,
    color: '#666',
    marginBottom: 5,
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
    width: '100%',
  },
  detailRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    marginBottom: 5,
    paddingHorizontal: 5,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
    marginRight: 5,
    flexShrink: 0,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    flexWrap: 'wrap',
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
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantitySelectorContainer: {
    backgroundColor: 'white',
    borderRadius: 10,
    padding: 20,
    width: '80%',
    maxWidth: 400,
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  quantityTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
  },
  quantityControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 20,
  },
  quantityButton: {
    backgroundColor: '#5dbea3',
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  quantityButtonDisabled: {
    backgroundColor: '#cccccc',
  },
  quantityButtonText: {
    color: 'white',
    fontSize: 24,
    fontWeight: 'bold',
  },
  quantityButtonTextDisabled: {
    color: '#666666',
  },
  quantityText: {
    fontSize: 24,
    fontWeight: 'bold',
    marginHorizontal: 20,
    minWidth: 40,
    textAlign: 'center',
  },
  quantityActionButtons: {
    flexDirection: 'row',
    justifyContent: 'space-between',
  },
  quantityActionButton: {
    flex: 1,
    padding: 10,
    borderRadius: 5,
  },
  cancelButton: {
    backgroundColor: '#f44336',
  },
  confirmButton: {
    backgroundColor: '#4CAF50',
  },
  quantityActionButtonText: {
    color: 'white',
    textAlign: 'center',
    fontWeight: 'bold',
  },
});

export default GiftApprovalScreen; 