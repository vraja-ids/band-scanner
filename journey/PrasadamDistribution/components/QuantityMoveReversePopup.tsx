/**
 * Quantity Move Reverse Popup
 * Popup for moving trays backward (to left_over or previous stage)
 * Shown on long press, uses orange theme to differentiate from forward movement
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  TextInput,
  Keyboard,
  ScrollView,
} from 'react-native';
import { DashboardItem, DashboardStage, STAGE_DISPLAY_NAMES } from '../types/dashboard.types';

interface QuantityMoveReversePopupProps {
  visible: boolean;
  item: DashboardItem;
  currentStage: DashboardStage;
  currentQty: number;
  onClose: () => void;
  onMove: (quantity: number, toStage: DashboardStage) => void;
  transactions?: Array<{ stage: string; quantity: number; timestamp: string }>;
  filterToStages?: DashboardStage[]; // Optional filter to show only specific stages
}

const QUICK_SELECT_AMOUNTS = [2, 3, 4, 5, 10, 20];

// Define reverse movement options
function getReverseOptions(currentStage: DashboardStage): DashboardStage[] {
  const options: DashboardStage[] = [];

  // Stage-specific reverse options (left_over is added separately)
  switch (currentStage) {
    case 'cooked':
      // No reverse options - you can't "uncook" back to planned
      break;
    case 'stored':
      // Can go back to cooked or left_over
      options.push('cooked');
      break;
    case 'staging':
      // Can go back to stored or left_over
      options.push('stored');
      break;
    case 'refill_station_1':
    case 'refill_station_2':
    case 'refill_station_3':
      // Can go back to staging or left_over
      options.push('staging');
      break;
    case 'served':
      // Can go back to refill stations or left_over
      options.push('refill_station_1', 'refill_station_2', 'refill_station_3');
      break;
  }

  // Always can send to left_over (unless already there)
  if (currentStage !== 'left_over') {
    options.push('left_over');
  }

  return options;
}

export const QuantityMoveReversePopup: React.FC<QuantityMoveReversePopupProps> = ({
  visible,
  item,
  currentStage,
  currentQty,
  onClose,
  onMove,
  transactions = [],
  filterToStages,
}) => {
  const [quantity, setQuantity] = useState('1');
  const [selectedStage, setSelectedStage] = useState<DashboardStage | null>(null);
  const inputRef = useRef<TextInput>(null);
  const initializedRef = useRef(false);

  const reverseOptions = getReverseOptions(currentStage);
  // Apply filter if provided
  const filteredOptions = filterToStages
    ? reverseOptions.filter(opt => filterToStages.includes(opt))
    : reverseOptions;

  // Auto-select first non-left_over option as default (only on initial open)
  useEffect(() => {
    if (visible && !initializedRef.current) {
      initializedRef.current = true;
      // Prefer the first non-left_over option (more common reverse movement)
      // Only select left_over if it's the only option or if filtered to only show left_over
      const defaultStage = filteredOptions.find(opt => opt !== 'left_over') || filteredOptions[0] || null;
      setSelectedStage(defaultStage);
      setQuantity('1');
    } else if (!visible) {
      // Reset when closed so next open re-initializes
      initializedRef.current = false;
    }
  }, [visible, filteredOptions]);

  const handleQuickSelect = useCallback((amount: number) => {
    const current = parseInt(quantity, 10) || 0;
    const newQty = Math.min(currentQty, current + amount);
    setQuantity(newQty.toString());
  }, [quantity, currentQty]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const adjustQuantity = useCallback((delta: number) => {
    const current = parseInt(quantity, 10) || 0;
    const newQty = Math.max(1, Math.min(currentQty, current + delta));
    setQuantity(newQty.toString());
  }, [quantity, currentQty]);

  const handleFocusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleMove = useCallback(async () => {
    const qty = parseInt(quantity, 10);
    if (!selectedStage || isNaN(qty) || qty <= 0 || qty > currentQty) {
      return;
    }

    onMove(qty, selectedStage);
    onClose();
  }, [quantity, selectedStage, currentQty, onMove, onClose]);

  const isValid =
    selectedStage !== null &&
    !isNaN(parseInt(quantity, 10)) &&
    parseInt(quantity, 10) > 0 &&
    parseInt(quantity, 10) <= currentQty;

  // Get display name for selected destination
  const destDisplay = selectedStage
    ? STAGE_DISPLAY_NAMES[selectedStage]
    : 'Select...';

  // Recent transactions for this stage
  const recentTransactions = transactions.slice(0, 3);

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onClose}
      supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}
    >
      <TouchableOpacity
        style={styles.overlay}
        activeOpacity={1}
        onPress={onClose}
      >
        <TouchableOpacity
          activeOpacity={1}
          style={styles.popup}
          onPress={dismissKeyboard}
        >
          {/* Compact Header with orange theme */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.headerText}>
                <Text style={styles.label}>From:</Text> {STAGE_DISPLAY_NAMES[currentStage]} ({currentQty})
                <Text style={styles.arrow}> ← </Text>
                <Text style={styles.destHighlight}>{destDisplay}</Text>
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {/* Recent Transactions */}
            {recentTransactions.length > 0 && (
              <View style={styles.historySection}>
                <Text style={styles.sectionTitle}>Recent Activity:</Text>
                {recentTransactions.map((tx, index) => (
                  <View key={index} style={styles.historyItem}>
                    <Text style={styles.historyText}>
                      <Text style={styles.historyQty}>{tx.quantity}</Text> trays
                    </Text>
                    <Text style={styles.historyTime}>{tx.timestamp}</Text>
                  </View>
                ))}
              </View>
            )}

            {/* Reverse Options */}
            <View style={styles.destSection}>
              <Text style={styles.sectionTitle}>Move to:</Text>
              <View style={styles.destRow}>
                {filteredOptions.map(dest => (
                  <TouchableOpacity
                    key={dest}
                    style={[
                      styles.destBtn,
                      selectedStage === dest && styles.selectedBtn,
                      dest === 'left_over' && styles.leftOverBtn
                    ]}
                    onPress={() => setSelectedStage(dest)}
                  >
                    <Text
                      style={[
                        styles.destText,
                        selectedStage === dest && styles.selectedText,
                        dest === 'left_over' && styles.leftOverText
                      ]}
                      numberOfLines={1}
                    >
                      {STAGE_DISPLAY_NAMES[dest]}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            {/* Quantity Section */}
            <View style={styles.qtySection}>
              <View style={styles.qtyRow}>
                <TouchableOpacity
                  style={styles.adjustBtn}
                  onPress={() => adjustQuantity(-1)}
                >
                  <Text style={styles.adjustBtnText}>−1</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.qtyBox}
                  onPress={handleFocusInput}
                  activeOpacity={0.7}
                >
                  <TextInput
                    ref={inputRef}
                    style={styles.quantityInput}
                    value={quantity}
                    onChangeText={setQuantity}
                    keyboardType="number-pad"
                  />
                  <Text style={styles.maxQty}>/ {currentQty}</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  style={styles.adjustBtn}
                  onPress={() => adjustQuantity(1)}
                >
                  <Text style={styles.adjustBtnText}>+1</Text>
                </TouchableOpacity>
              </View>

              <View style={styles.quickSelectRow}>
                {QUICK_SELECT_AMOUNTS.map(amount => (
                  <TouchableOpacity
                    key={amount}
                    style={[styles.quickSelectBtn, quantity === amount.toString() && styles.selectedBtn]}
                    onPress={() => handleQuickSelect(amount)}
                  >
                    <Text
                      style={[
                        styles.quickSelectText,
                        quantity === amount.toString() && styles.selectedText,
                      ]}
                    >
                      +{amount}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          </ScrollView>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity style={styles.cancelBtn} onPress={onClose}>
              <Text style={styles.cancelText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.moveBtn, !isValid && styles.disabledBtn]}
              onPress={handleMove}
              disabled={!isValid}
            >
              <Text style={styles.moveBtnText}>Move Back {quantity}</Text>
            </TouchableOpacity>
          </View>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  popup: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 420,
    maxHeight: '80%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
    backgroundColor: '#FFF3E0',
  },
  headerLeft: {
    flex: 1,
    marginRight: 8,
  },
  itemName: {
    fontSize: 14,
    fontWeight: '700',
    color: '#333',
    marginRight: 8,
  },
  headerText: {
    fontSize: 12,
    color: '#666',
  },
  label: {
    color: '#999',
    fontWeight: '500',
  },
  arrow: {
    color: '#FF9800',
  },
  destHighlight: {
    color: '#FF9800',
    fontWeight: '600',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 20,
    color: '#666',
  },
  content: {
    padding: 12,
  },
  historySection: {
    marginBottom: 12,
    padding: 10,
    backgroundColor: '#FFF8E1',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#FFE0B2',
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 3,
  },
  historyText: {
    fontSize: 12,
    color: '#666',
  },
  historyQty: {
    fontWeight: '600',
    color: '#FF9800',
  },
  historyTime: {
    fontSize: 11,
    color: '#999',
  },
  destSection: {
    marginBottom: 12,
  },
  destRow: {
    flexDirection: 'row',
    gap: 6,
  },
  destBtn: {
    flex: 1,
    paddingVertical: 8,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#FFCC80',
    borderRadius: 6,
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  destText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
  },
  leftOverBtn: {
    borderColor: '#FF5722',
    backgroundColor: '#FFEBEE',
  },
  leftOverText: {
    color: '#FF5722',
  },
  qtySection: {
    gap: 10,
  },
  qtyRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  adjustBtn: {
    width: 50,
    paddingVertical: 10,
    borderWidth: 1,
    borderColor: '#FFCC80',
    borderRadius: 6,
    backgroundColor: '#FFF3E0',
    alignItems: 'center',
  },
  adjustBtnText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#333',
  },
  qtyBox: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#FF9800',
    borderRadius: 6,
    paddingHorizontal: 8,
    backgroundColor: '#FAFAFA',
  },
  quantityInput: {
    flex: 1,
    paddingVertical: 10,
    fontSize: 16,
    textAlign: 'center',
    fontWeight: '600',
    color: '#333',
  },
  maxQty: {
    fontSize: 13,
    color: '#999',
  },
  quickSelectRow: {
    flexDirection: 'row',
    gap: 6,
  },
  quickSelectBtn: {
    flex: 1,
    paddingVertical: 8,
    borderWidth: 1,
    borderColor: '#FFCC80',
    borderRadius: 6,
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  quickSelectText: {
    fontSize: 13,
    fontWeight: '600',
    color: '#333',
  },
  selectedBtn: {
    backgroundColor: '#FF9800',
    borderColor: '#FF9800',
  },
  selectedText: {
    color: '#FFF',
  },
  actions: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
    gap: 8,
  },
  cancelBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F5F5F5',
    alignItems: 'center',
  },
  cancelText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  moveBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FF9800',
    alignItems: 'center',
  },
  moveBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  disabledBtn: {
    backgroundColor: '#BDBDBD',
  },
});
