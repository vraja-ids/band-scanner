import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, ActivityIndicator, Modal, FlatList } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { useTranslation } from 'react-i18next';
import { Ionicons } from '@expo/vector-icons';
import { updateDayPassStatus } from './DaypassViewModel';
import { getString, Keys } from '../../storage/Session';
import { SessionManager } from '../../storage/SessionManager';
import { useBaseScreen } from '../common/util/useBaseScreen';

export default function RedeemPrasadamScreen() {
  const { logAction, logError } = useBaseScreen({ screenName: 'RedeemPrasadamScreen' });
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const [selectedPrasadamTime, setSelectedPrasadamTime] = useState<string>('');
  const [selectedLane, setSelectedLane] = useState<string>('');
  const [showPrasadamModal, setShowPrasadamModal] = useState(false);
  const [showLaneModal, setShowLaneModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const prasadamOptions = ['Breakfast', 'Lunch', 'Dinner'];
  const laneOptions = Array.from({ length: 10 }, (_, i) => `Lane ${i + 1}`);

  const handleBack = () => {
    logAction('Navigating back to Home');
    (navigation as any).goBack();
  };

  const handlePrasadamTimeChange = (prasadamTime: string) => {
    setSelectedPrasadamTime(prasadamTime);
    setShowPrasadamModal(false);
    // Store in SessionManager for persistence during scanning session
    (SessionManager as any).setData('selectedRedeemPrasadamTime', prasadamTime);
    logAction('Prasadam time selected', { prasadamTime });
  };

  const handleLaneChange = (lane: string) => {
    setSelectedLane(lane);
    setShowLaneModal(false);
    // Store in SessionManager for persistence during scanning session
    (SessionManager as any).setData('selectedRedeemLane', lane);
    logAction('Lane selected', { lane });
  };

  const handleScanQR = () => {
    logAction('Opening QR scanner for prasadam redemption');
    (navigation as any).navigate('Scanner', {
      screen: 'RedeemPrasadamScan',
      prasadamTime: selectedPrasadamTime,
      lane: selectedLane,
      type: 'prasadam'
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('daypass.redeemPrasadam')}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Prasadam Selection */}
        <View style={styles.selectionContainer}>
          <Text style={styles.label}>{t('daypass.selectPrasadam')}:</Text>
          <TouchableOpacity 
            style={styles.selectionButton}
            onPress={() => setShowPrasadamModal(true)}
          >
            <Text style={styles.selectionText}>
              {selectedPrasadamTime || t('daypass.selectPrasadam')}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Lane Selection */}
        <View style={styles.selectionContainer}>
          <Text style={styles.label}>{t('daypass.selectLane')}:</Text>
          <TouchableOpacity 
            style={styles.selectionButton}
            onPress={() => setShowLaneModal(true)}
          >
            <Text style={styles.selectionText}>
              {selectedLane || t('daypass.selectLane')}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Scan QR Button */}
        <TouchableOpacity 
          style={[
            styles.scanButton, 
            (!selectedPrasadamTime || !selectedLane || isScanning) && styles.scanButtonDisabled
          ]}
          onPress={handleScanQR}
          disabled={!selectedPrasadamTime || !selectedLane || isScanning}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons 
                name="qr-code-outline" 
                size={24} 
                color={(selectedPrasadamTime && selectedLane) ? "#fff" : "#ccc"} 
              />
              <Text style={[
                styles.scanButtonText,
                (!selectedPrasadamTime || !selectedLane) && styles.scanButtonTextDisabled
              ]}>
                {t('daypass.scanQR')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Prasadam Selection Modal */}
      <Modal
        visible={showPrasadamModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowPrasadamModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('daypass.selectPrasadam')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowPrasadamModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={prasadamOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.prasadamOption,
                    selectedPrasadamTime === item && styles.prasadamOptionSelected
                  ]}
                  onPress={() => handlePrasadamTimeChange(item)}
                >
                  <Text style={[
                    styles.prasadamOptionText,
                    selectedPrasadamTime === item && styles.prasadamOptionTextSelected
                  ]}>
                    {item}
                  </Text>
                  {selectedPrasadamTime === item && (
                    <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.prasadamList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>

      {/* Lane Selection Modal */}
      <Modal
        visible={showLaneModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowLaneModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('daypass.selectLane')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowLaneModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={laneOptions}
              keyExtractor={(item) => item}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.laneOption,
                    selectedLane === item && styles.laneOptionSelected
                  ]}
                  onPress={() => handleLaneChange(item)}
                >
                  <Text style={[
                    styles.laneOptionText,
                    selectedLane === item && styles.laneOptionTextSelected
                  ]}>
                    {item}
                  </Text>
                  {selectedLane === item && (
                    <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.laneList}
              showsVerticalScrollIndicator={false}
            />
          </View>
        </View>
      </Modal>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#4CAF50',
    paddingHorizontal: 20,
    paddingVertical: 15,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  backButton: {
    padding: 8,
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#fff',
  },
  placeholder: {
    width: 40,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  selectionContainer: {
    backgroundColor: '#fff',
    borderRadius: 8,
    marginBottom: 30,
    padding: 15,
    width: '100%',
    maxWidth: 400,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
    textAlign: 'center',
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
  },
  selectionText: {
    fontSize: 16,
    color: '#333',
    flex: 1,
  },
  scanButton: {
    backgroundColor: '#4CAF50',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 8,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
  },
  scanButtonDisabled: {
    backgroundColor: '#ccc',
  },
  scanButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  scanButtonTextDisabled: {
    color: '#ccc',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContainer: {
    backgroundColor: '#fff',
    borderRadius: 12,
    width: '80%',
    maxHeight: '70%',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25,
    shadowRadius: 3.84,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    borderBottomWidth: 1,
    borderBottomColor: '#e9ecef',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  modalCloseButton: {
    padding: 4,
  },
  prasadamList: {
    maxHeight: 300,
  },
  prasadamOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  prasadamOptionSelected: {
    backgroundColor: '#f8f9fa',
  },
  prasadamOptionText: {
    fontSize: 16,
    color: '#333',
  },
  prasadamOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
  laneList: {
    maxHeight: 300,
  },
  laneOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  laneOptionSelected: {
    backgroundColor: '#f8f9fa',
  },
  laneOptionText: {
    fontSize: 16,
    color: '#333',
  },
  laneOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});
