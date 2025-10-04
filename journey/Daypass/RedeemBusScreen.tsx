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

export default function RedeemBusScreen() {
  const { logAction, logError } = useBaseScreen({ screenName: 'RedeemBusScreen' });
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();
  const { t } = useTranslation();
  
  const [selectedBusNumber, setSelectedBusNumber] = useState<string>('');
  const [showBusModal, setShowBusModal] = useState(false);
  const [isScanning, setIsScanning] = useState(false);

  const handleBack = () => {
    logAction('Navigating back to Home');
    (navigation as any).goBack();
  };

  const handleBusNumberChange = (busNumber: string) => {
    setSelectedBusNumber(busNumber);
    setShowBusModal(false);
    // Store in SessionManager for persistence during scanning session
    (SessionManager as any).setData('selectedRedeemBusNumber', busNumber);
    logAction('Bus number selected', { busNumber });
  };

  const handleScanQR = () => {
    logAction('Opening QR scanner for bus redemption');
    (navigation as any).navigate('Scanner', {
      screen: 'RedeemBusScan',
      busNumber: selectedBusNumber,
      type: 'bus'
    });
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleBack} style={styles.backButton}>
          <Ionicons name="arrow-back" size={24} color="#fff" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>{t('daypass.redeemBus')}</Text>
        <View style={styles.placeholder} />
      </View>

      <View style={styles.content}>
        {/* Bus Selection */}
        <View style={styles.selectionContainer}>
          <Text style={styles.label}>{t('daypass.selectBus')}:</Text>
          <TouchableOpacity 
            style={styles.selectionButton}
            onPress={() => setShowBusModal(true)}
          >
            <Text style={styles.selectionText}>
              {selectedBusNumber ? `Bus ${selectedBusNumber}` : t('daypass.selectBus')}
            </Text>
            <Ionicons name="chevron-down" size={20} color="#666" />
          </TouchableOpacity>
        </View>

        {/* Scan QR Button */}
        <TouchableOpacity 
          style={[
            styles.scanButton, 
            (!selectedBusNumber || isScanning) && styles.scanButtonDisabled
          ]}
          onPress={handleScanQR}
          disabled={!selectedBusNumber || isScanning}
        >
          {isScanning ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <>
              <Ionicons 
                name="qr-code-outline" 
                size={24} 
                color={selectedBusNumber ? "#fff" : "#ccc"} 
              />
              <Text style={[
                styles.scanButtonText,
                !selectedBusNumber && styles.scanButtonTextDisabled
              ]}>
                {t('daypass.scanQR')}
              </Text>
            </>
          )}
        </TouchableOpacity>
      </View>

      {/* Bus Selection Modal */}
      <Modal
        visible={showBusModal}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setShowBusModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContainer}>
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>{t('daypass.selectBus')}</Text>
              <TouchableOpacity
                style={styles.modalCloseButton}
                onPress={() => setShowBusModal(false)}
              >
                <Ionicons name="close" size={24} color="#666" />
              </TouchableOpacity>
            </View>
            <FlatList
              data={Array.from({ length: 25 }, (_, i) => i + 1)}
              keyExtractor={(item) => item.toString()}
              renderItem={({ item }) => (
                <TouchableOpacity
                  style={[
                    styles.busOption,
                    selectedBusNumber === item.toString() && styles.busOptionSelected
                  ]}
                  onPress={() => handleBusNumberChange(item.toString())}
                >
                  <Text style={[
                    styles.busOptionText,
                    selectedBusNumber === item.toString() && styles.busOptionTextSelected
                  ]}>
                    Bus {item}
                  </Text>
                  {selectedBusNumber === item.toString() && (
                    <Ionicons name="checkmark" size={20} color="#4CAF50" />
                  )}
                </TouchableOpacity>
              )}
              style={styles.busList}
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
    padding: 20,
    justifyContent: 'center',
  },
  selectionContainer: {
    marginBottom: 40,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 10,
  },
  selectionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 15,
    borderWidth: 1,
    borderColor: '#e9ecef',
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.22,
    shadowRadius: 2.22,
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
  busList: {
    maxHeight: 300,
  },
  busOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  busOptionSelected: {
    backgroundColor: '#f8f9fa',
  },
  busOptionText: {
    fontSize: 16,
    color: '#333',
  },
  busOptionTextSelected: {
    color: '#4CAF50',
    fontWeight: '600',
  },
});
