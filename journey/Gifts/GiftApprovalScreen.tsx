// Converted to TSX with minimal typing. Original logic preserved.
import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, ScrollView, Modal } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { SessionManager } from '../../storage/SessionManager';
import { fetchMemberDetails, updateGiftActivity } from './GiftsViewModel';
import type { GetMemberGiftActivityRequest, UpdateGiftActivityRequest } from './models/api';
import { useBaseScreen } from '../common/util/useBaseScreen';
const ServiceTypes = { TSHIRT: 6, JACKET: 1 } as const;
import { FontAwesome6, Ionicons } from '@expo/vector-icons';
class MemberDetails {
  memberId: string;
  legalName: string;
  spiritualName?: string;
  giftDetails: Array<Record<string, string>> = [];
  giftStatus: any = { tshirtApproved: 0, tshirtFulfilled: 0, jacketApproved: 0, jacketFulfilled: 0 };
  constructor(data: any) {
    this.memberId = data.memberId;
    this.legalName = data.legalName;
    this.spiritualName = data.spiritualName;
    this.giftDetails = Array.isArray(data.giftDetails) ? data.giftDetails : [];
    this.giftStatus = data.giftStatus || this.giftStatus;
  }
  getDisplayName() {
    return this.spiritualName || this.legalName;
  }
  getGiftCounts(type: 'tshirt' | 'jacket') {
    return {
      approved: (this.giftStatus as any)[`${type}Approved`] || 0,
      fulfilled: (this.giftStatus as any)[`${type}Fulfilled`] || 0,
    };
  }
}

const QuantitySelectorModal = ({ visible, onClose, onConfirm, quantity, setQuantity, maxQuantity, action }: any) => {
  const getActionText = () => {
    switch (action) {
      case 'approve':
        return 'Approve';
      case 'disapprove':
        return 'Disapprove';
      case 'fulfill':
        return 'Fulfill';
      case 'unfulfill':
        return 'Un-fulfill';
      default:
        return '';
    }
  };

  return (
    <Modal visible={visible} transparent={true} animationType="fade" onRequestClose={() => {}}>
      <View style={styles.modalOverlay}>
        <View style={styles.quantitySelectorContainer}>
          <Text style={styles.quantityTitle}>Select Quantity to {getActionText()}</Text>
          <View style={styles.quantityControls}>
            <TouchableOpacity style={[styles.quantityButton, quantity <= 1 && styles.quantityButtonDisabled]} onPress={() => setQuantity(Math.max(1, quantity - 1))} disabled={quantity <= 1}>
              <Text style={[styles.quantityButtonText, quantity <= 1 && styles.quantityButtonTextDisabled]}>-</Text>
            </TouchableOpacity>
            <Text style={styles.quantityText}>{quantity}</Text>
            <TouchableOpacity style={[styles.quantityButton, quantity >= maxQuantity && styles.quantityButtonDisabled]} onPress={() => setQuantity(Math.min(maxQuantity, quantity + 1))} disabled={quantity >= maxQuantity}>
              <Text style={[styles.quantityButtonText, quantity >= maxQuantity && styles.quantityButtonTextDisabled]}>+</Text>
            </TouchableOpacity>
          </View>
          <View style={styles.quantityActionButtons}>
            <TouchableOpacity style={[styles.quantityActionButton, styles.cancelButton]} onPress={onClose}>
              <Text style={styles.quantityActionButtonText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity style={[styles.quantityActionButton, styles.confirmButton]} onPress={() => onConfirm(quantity)}>
              <Text style={styles.quantityActionButtonText}>Confirm</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
    </Modal>
  );
};

const GiftApprovalScreen = ({ route }: any) => {
  const { logAction, logError } = useBaseScreen({ screenName: 'GiftApprovalScreen' });
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
    canApproveMultipleGifts: false,
  });
  const [scannerMemberId, setScannerMemberId] = useState<string | null>(null);
  const [memberDetails, setMemberDetails] = useState<MemberDetails | null>(null);
  const [isGiftDetailsExpanded, setIsGiftDetailsExpanded] = useState(false);
  const [showQuantitySelector, setShowQuantitySelector] = useState(false);
  const [selectedAction, setSelectedAction] = useState<string | null>(null);
  const [selectedGiftType, setSelectedGiftType] = useState<'tshirt' | 'jacket' | null>(null);
  const [quantity, setQuantity] = useState(1);
  const navigation: any = useNavigation();

  useEffect(() => {
    loadPermissions();
    loadScannerMemberId();
    if (tagId) {
      fetchMemberDetailsVm(tagId);
    }
  }, []);

  const fetchMemberDetailsVm = async (tid: string, withRefresh = false) => {
    if (!withRefresh) {
      setIsLoading(true);
    }
    try {
      const scannerMemberId = await AsyncStorage.getItem('memberId');
      const req: GetMemberGiftActivityRequest = { tagId: tid, category: 'gifttracking', scannerMemberId };
      const memberDetailsResp: any = await fetchMemberDetails(req);
      setMemberDetails(new MemberDetails(memberDetailsResp.memberActivityDetails));
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
      const canScanOthersQr = SessionManager.hasPermission('canScanOthersQr');
      const canApproveTshirt = SessionManager.hasPermission('canApproveGiftTshirt');
      const canApproveJacket = SessionManager.hasPermission('canApproveGiftJacket');
      const canFulfillTshirt = SessionManager.hasPermission('canFulfillGiftTshirt');
      const canFulfillJacket = SessionManager.hasPermission('canFulfillGiftJacket');
      const canApproveMultipleGifts = SessionManager.hasPermission('canApproveMultipleGifts');

      setPermissions({
        canScanOthersQr,
        canApproveTshirt,
        canApproveJacket,
        canFulfillTshirt,
        canFulfillJacket,
        canApproveMultipleGifts,
      });
    } catch (error) {
      console.error('Error loading permissions:', error);
    }
  };

  const handleGiftAction = async (action: 'approve' | 'disapprove' | 'fulfill' | 'unfulfill', giftType: 'tshirt' | 'jacket') => {
    if (!memberDetails) return;
    const isFulfillment = action === 'fulfill' || action === 'unfulfill';
    const counts = memberDetails.getGiftCounts(giftType);

    if (isFulfillment && counts.approved === 0) {
      Alert.alert('Error', `${giftType} must be approved before fulfillment`);
      return;
    }
    if (action === 'disapprove' && counts.fulfilled === counts.approved) {
      Alert.alert('Error', 'Cannot disapprove already fulfilled gifts');
      return;
    }
    if (action === 'fulfill' && counts.fulfilled >= counts.approved) {
      Alert.alert('Error', 'Cannot fulfill more than approved quantity');
      return;
    }

    setSelectedAction(action);
    setSelectedGiftType(giftType);
    setQuantity(1);
    setShowQuantitySelector(true);
  };

  const handleQuantityConfirm = async (selectedQuantity: number) => {
    if (!memberDetails || !selectedGiftType || !selectedAction) return;
    const counts = memberDetails.getGiftCounts(selectedGiftType);
    let maxQuantity = 10;
    switch (selectedAction) {
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
      const activityData: UpdateGiftActivityRequest = {
        apiVersion: '2.0',
        memberId: (memberDetails as any)?.memberId,
        tagId: tagId,
        category: 'gifttracking',
        activityId: selectedGiftType === 'tshirt' ? ServiceTypes.TSHIRT : ServiceTypes.JACKET,
        location: 'Default',
        activity: selectedAction === 'disapprove' || selectedAction === 'approve' ? 'giftapproval' : 'giftfulfilled',
        remove: selectedAction === 'disapprove' || selectedAction === 'unfulfill',
        scannerMemberId: scannerMemberId,
        quantity: selectedQuantity,
      };

      const response: any = await updateGiftActivity(activityData);
      if (response?.success) {
        fetchMemberDetailsVm(tagId, true);
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

  const renderGiftButtons = (giftType: 'tshirt' | 'jacket') => {
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
              <TouchableOpacity style={[styles.button, styles.approveButton, isApproveDisabled && styles.buttonDisabled]} onPress={() => handleGiftAction('approve', giftType)} disabled={isApproveDisabled}>
                {isButtonLoading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.buttonText, isApproveDisabled && styles.buttonTextDisabled]}>Approve</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.disapproveButton, (isButtonLoading || isFulfilled) && styles.buttonDisabled]} onPress={() => handleGiftAction('disapprove', giftType)} disabled={isButtonLoading || isFulfilled}>
                {isButtonLoading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.buttonText, (isButtonLoading || isFulfilled) && styles.buttonTextDisabled]}>Disapprove</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
        <View style={styles.buttonRow}>
          {canFulfill && (
            <>
              <TouchableOpacity style={[styles.button, styles.fulfillButton, (isButtonLoading || isFulfilled) && styles.buttonDisabled]} onPress={() => handleGiftAction('fulfill', giftType)} disabled={isButtonLoading || isFulfilled}>
                {isButtonLoading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.buttonText, (isButtonLoading || isFulfilled) && styles.buttonTextDisabled]}>Fulfill</Text>}
              </TouchableOpacity>
              <TouchableOpacity style={[styles.button, styles.unfulfillButton, (isButtonLoading || counts.fulfilled === 0) && styles.buttonDisabled]} onPress={() => handleGiftAction('unfulfill', giftType)} disabled={isButtonLoading || counts.fulfilled === 0}>
                {isButtonLoading ? <ActivityIndicator color="#fff" /> : <Text style={[styles.buttonText, (isButtonLoading || counts.fulfilled === 0) && styles.buttonTextDisabled]}>Un-fulfill</Text>}
              </TouchableOpacity>
            </>
          )}
        </View>
      </View>
    );
  };

  const renderGiftDetails = () => {
    if (!memberDetails?.giftDetails || memberDetails.giftDetails.length === 0) {
      return <Text style={styles.noDetailsText}>No gift details available</Text>;
    }

    return (memberDetails.giftDetails as any[]).map((detail, index) => (
      <View key={index} style={styles.giftDetailItem}>
        {Object.entries(detail).map(([key, value]) => (
          <View key={key} style={styles.detailRow}>
            <Text style={styles.detailLabel}>{key}:</Text>
            <Text style={styles.detailValue} numberOfLines={0}>
              {value as any}
            </Text>
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

            <TouchableOpacity style={styles.giftDetailsHeader} onPress={() => setIsGiftDetailsExpanded(!isGiftDetailsExpanded)}>
              <Text style={styles.giftDetailsTitle}>Gift Details</Text>
              <Ionicons name={isGiftDetailsExpanded ? 'chevron-up' : 'chevron-down'} size={24} color="#5dbea3" />
            </TouchableOpacity>

            {isGiftDetailsExpanded && <View style={styles.giftDetailsContainer}>{renderGiftDetails()}</View>}
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
            switch (selectedAction) {
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
    textAlign: 'center',
    color: '#666',
    fontStyle: 'italic',
    paddingHorizontal: 10,
    paddingVertical: 8,
    fontSize: 14,
    flexWrap: 'wrap',
    width: '100%',
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


