/**
 * Quantity Move Popup
 * Popup for moving trays between stages with quantity selection
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
} from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { DashboardItem, DashboardStage, MOVEMENT_RULES, STAGE_DISPLAY_NAMES } from '../types/dashboard.types';

interface QuantityMovePopupProps {
  visible: boolean;
  item: DashboardItem;
  currentStage: DashboardStage;
  currentQty: number;
  maxQuantity?: number; // Optional max quantity override (for Cooked → Stored validation)
  onClose: () => void;
  onMove: (quantity: number, toStage: DashboardStage) => void;
  mealId: string;
}

const QUICK_SELECT_AMOUNTS = [2, 3, 4, 5, 10, 20];

export const QuantityMovePopup: React.FC<QuantityMovePopupProps> = ({
  visible,
  item,
  currentStage,
  currentQty,
  maxQuantity,
  onClose,
  onMove,
  mealId,
}) => {
  const [quantity, setQuantity] = useState('1');
  const [selectedStage, setSelectedStage] = useState<DashboardStage | null>(null);
  const [lastDestination, setLastDestination] = useState<DashboardStage | null>(null);
  const inputRef = useRef<TextInput>(null);

  // Get valid destinations for current stage
  const validDestinations = MOVEMENT_RULES[currentStage] || [];

  // Use maxQuantity if provided, otherwise use currentQty
  const effectiveMaxQty = maxQuantity !== undefined ? maxQuantity : currentQty;

  // Load last destination for staging
  useEffect(() => {
    if (visible && currentStage === 'staging') {
      AsyncStorage.getItem(`last_staging_dest_${mealId}_${item.item_id}`).then(dest => {
        if (dest) {
          setLastDestination(dest as DashboardStage);
        }
      });
    }
  }, [visible, currentStage, mealId, item.item_id]);

  // Auto-select destination if only one option or remember last
  useEffect(() => {
    if (visible) {
      if (validDestinations.length === 1) {
        setSelectedStage(validDestinations[0]);
      } else if (currentStage === 'staging' && lastDestination) {
        setSelectedStage(lastDestination);
      } else if (validDestinations.length > 1) {
        setSelectedStage(null); // Let user choose
      }
    }
  }, [visible, validDestinations, currentStage, lastDestination]);

  // Reset state when popup closes
  useEffect(() => {
    if (!visible) {
      setQuantity('1');
      setSelectedStage(null);
    }
  }, [visible]);

  const handleQuickSelect = useCallback((amount: number) => {
    const current = parseInt(quantity, 10) || 0;
    const newQty = Math.min(effectiveMaxQty, current + amount);
    setQuantity(newQty.toString());
  }, [quantity, effectiveMaxQty]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const adjustQuantity = useCallback((delta: number) => {
    const current = parseInt(quantity, 10) || 0;
    const newQty = Math.max(1, Math.min(effectiveMaxQty, current + delta));
    setQuantity(newQty.toString());
  }, [quantity, effectiveMaxQty]);

  const handleFocusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleMove = useCallback(async () => {
    const qty = parseInt(quantity, 10);
    if (!selectedStage || isNaN(qty) || qty <= 0 || qty > effectiveMaxQty) {
      return;
    }

    // Remember destination for staging
    if (currentStage === 'staging') {
      await AsyncStorage.setItem(`last_staging_dest_${mealId}_${item.item_id}`, selectedStage);
    }

    onMove(qty, selectedStage);
    onClose();
  }, [quantity, selectedStage, effectiveMaxQty, currentStage, mealId, item.item_id, onMove, onClose]);

  const isValid =
    selectedStage !== null &&
    !isNaN(parseInt(quantity, 10)) &&
    parseInt(quantity, 10) > 0 &&
    parseInt(quantity, 10) <= effectiveMaxQty;

  // Get display name for selected or auto destination
  const destDisplay = selectedStage
    ? STAGE_DISPLAY_NAMES[selectedStage]
    : validDestinations.length === 1
    ? STAGE_DISPLAY_NAMES[validDestinations[0]]
    : 'Select...';

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
          {/* Compact Header with all info in one line */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.itemName} numberOfLines={1}>{item.name}</Text>
              <Text style={styles.headerText}>
                <Text style={styles.label}>From:</Text> {STAGE_DISPLAY_NAMES[currentStage]} ({currentQty})
                <Text style={styles.arrow}> → </Text>
                <Text style={styles.destHighlight}>{destDisplay}</Text>
              </Text>
              {/* Show max limit hint when restricted */}
              {maxQuantity !== undefined && maxQuantity < currentQty && (
                <Text style={styles.limitHint}>
                  Max movable: {maxQuantity} (Cooked - Stored)
                </Text>
              )}
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Multiple destinations - show selection */}
            {validDestinations.length > 1 ? (
              <View style={styles.destSection}>
                <View style={styles.destRow}>
                  {validDestinations.map(dest => (
                    <TouchableOpacity
                      key={dest}
                      style={[styles.destBtn, selectedStage === dest && styles.selectedBtn]}
                      onPress={() => setSelectedStage(dest)}
                    >
                      <Text
                        style={[styles.destText, selectedStage === dest && styles.selectedText]}
                        numberOfLines={1}
                      >
                        {STAGE_DISPLAY_NAMES[dest]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            ) : null}

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
                  <Text style={styles.maxQty}>/ {effectiveMaxQty}</Text>
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
          </View>

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
              <Text style={styles.moveBtnText}>Move {quantity}</Text>
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
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
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
    color: '#999',
  },
  destHighlight: {
    color: '#2196F3',
    fontWeight: '600',
  },
  limitHint: {
    fontSize: 10,
    color: '#FF9800',
    fontStyle: 'italic',
    marginTop: 2,
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
    borderColor: '#DDD',
    borderRadius: 6,
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  destText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
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
    borderColor: '#DDD',
    borderRadius: 6,
    backgroundColor: '#F5F5F5',
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
    borderColor: '#2196F3',
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
    borderColor: '#DDD',
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
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  selectedText: {
    color: '#FFF',
  },
  actions: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
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
    backgroundColor: '#2196F3',
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
