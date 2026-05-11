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
  ActivityIndicator,
} from 'react-native';
import { DashboardItem, DashboardStage, MOVEMENT_RULES, STAGE_DISPLAY_NAMES } from '../types/dashboard.types';

interface QuantityMovePopupProps {
  visible: boolean;
  item: DashboardItem;
  currentStage: DashboardStage;
  currentQty: number;
  maxQuantity?: number; // Optional max quantity override (for Cooked → Stored validation)
  onClose: () => void;
  onMove: (quantity: number, toStage: DashboardStage) => void | Promise<void>;
  mealId: string;
}

const QUICK_SELECT_AMOUNTS = [2, 3, 4, 5, 10, 20];

// Hare Krishna Maha Mantra - cycles through during loading
const MANTRA_WORDS = [
  'Hare', 'Krishna', 'Hare', 'Krishna',
  'Krishna', 'Krishna', 'Hare', 'Hare',
  'Hare', 'Rama', 'Hare', 'Rama',
  'Rama', 'Rama', 'Hare', 'Hare'
];

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
  const [quantity, setQuantity] = useState('0');
  const [selectedStage, setSelectedStage] = useState<DashboardStage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mantraIndex, setMantraIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const mantraIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Get valid destinations for current stage
  const validDestinations = MOVEMENT_RULES[currentStage] || [];

  // Use maxQuantity if provided, otherwise use currentQty
  const effectiveMaxQty = maxQuantity !== undefined ? maxQuantity : currentQty;

  // Auto-select destination if only one option
  useEffect(() => {
    if (visible) {
      if (validDestinations.length === 1) {
        setSelectedStage(validDestinations[0]);
      } else {
        setSelectedStage(null); // Let user choose
      }
    }
  }, [visible, validDestinations]);

  // Reset state when popup closes
  useEffect(() => {
    if (!visible) {
      setQuantity('0');
      setSelectedStage(null);
      setIsLoading(false);
      setMantraIndex(0);
      if (mantraIntervalRef.current) {
        clearInterval(mantraIntervalRef.current);
        mantraIntervalRef.current = null;
      }
    }
  }, [visible]);

  // Cycle through Hare Krishna mantra words during loading
  useEffect(() => {
    if (isLoading) {
      setMantraIndex(0);
      mantraIntervalRef.current = setInterval(() => {
        setMantraIndex(prev => (prev + 1) % MANTRA_WORDS.length);
      }, 1000); // Change word every second
    } else {
      if (mantraIntervalRef.current) {
        clearInterval(mantraIntervalRef.current);
        mantraIntervalRef.current = null;
      }
    }

    return () => {
      if (mantraIntervalRef.current) {
        clearInterval(mantraIntervalRef.current);
        mantraIntervalRef.current = null;
      }
    };
  }, [isLoading]);

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
    const newQty = Math.max(0, Math.min(effectiveMaxQty, current + delta));
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

    const startTime = Date.now();
    console.log('[QuantityMovePopup] handleMove START', { qty, toStage: selectedStage, item: item.name });

    setIsLoading(true);
    try {
      // Await the API calls - popup stays open until transfer completes
      await onMove(qty, selectedStage);
      const elapsed = Date.now() - startTime;
      console.log('[QuantityMovePopup] handleMove SUCCESS - closing popup, elapsed:', elapsed, 'ms');
      onClose();
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error('[QuantityMovePopup] handleMove ERROR, elapsed:', elapsed, 'ms', error);
      // Keep popup open on error, user can retry
      setIsLoading(false);
    }
    // Note: setIsLoading(false) removed - popup closes immediately
  }, [quantity, selectedStage, effectiveMaxQty, onMove, onClose, item.name]);

  const isValid =
    !isLoading &&
    selectedStage !== null &&
    !isNaN(parseInt(quantity, 10)) &&
    parseInt(quantity, 10) > 0 &&
    parseInt(quantity, 10) <= effectiveMaxQty;

  // Get display name for selected or auto destination
  const destDisplay = selectedStage
    ? STAGE_DISPLAY_NAMES[selectedStage]
    : validDestinations.length === 1
    ? STAGE_DISPLAY_NAMES[validDestinations[0]]
    : validDestinations.length > 1
    ? validDestinations.map(d => STAGE_DISPLAY_NAMES[d]).join(' / ')
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
          {/* Single-line Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerOneLine}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.separator}> • </Text>
                <Text style={styles.label}>From:</Text> {STAGE_DISPLAY_NAMES[currentStage]}
                <Text style={styles.arrow}> → </Text>
                <Text style={styles.destHighlight}>{destDisplay}</Text>
                {maxQuantity !== undefined && maxQuantity < currentQty && (
                  <>
                    <Text style={styles.separator}> • </Text>
                    <Text style={styles.limitHint}>Max: {maxQuantity}</Text>
                  </>
                )}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Multiple destinations - inline selection buttons */}
          {validDestinations.length > 1 ? (
            <View style={styles.destSectionInline}>
              {validDestinations.map(dest => (
                <TouchableOpacity
                  key={dest}
                  style={[styles.destBtnSmall, selectedStage === dest && styles.selectedBtn]}
                  onPress={() => setSelectedStage(dest)}
                >
                  <Text
                    style={[styles.destTextSmall, selectedStage === dest && styles.selectedText]}
                    numberOfLines={1}
                  >
                    {STAGE_DISPLAY_NAMES[dest]}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          ) : null}

          <View style={styles.content}>

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
                {QUICK_SELECT_AMOUNTS.map(amount => {
                  const enteredQty = parseInt(quantity, 10) || 0;
                  const wouldExceed = (enteredQty + amount) > effectiveMaxQty;
                  return (
                    <TouchableOpacity
                      key={amount}
                      style={[
                        styles.quickSelectBtn,
                        wouldExceed && styles.disabledQuickSelectBtn
                      ]}
                      onPress={() => !wouldExceed && handleQuickSelect(amount)}
                      disabled={wouldExceed}
                    >
                      <Text
                        style={[
                          styles.quickSelectText,
                          wouldExceed && styles.disabledQuickSelectText
                        ]}
                      >
                        +{amount}
                      </Text>
                    </TouchableOpacity>
                  );
                })}
              </View>
            </View>
          </View>

          {/* Action Buttons */}
          <View style={styles.actions}>
            <TouchableOpacity
              style={[styles.moveBtnFull, !isValid && styles.disabledBtn]}
              onPress={handleMove}
              disabled={!isValid}
            >
              {isLoading ? (
                <ActivityIndicator size="small" color="#FFF" />
              ) : (
                <Text style={styles.moveBtnText}>Move {quantity}</Text>
              )}
            </TouchableOpacity>
          </View>

          {/* Loading Overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#2196F3" />
              <Text style={styles.loadingText}>{MANTRA_WORDS[mantraIndex]}</Text>
            </View>
          )}
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
  headerOneLine: {
    fontSize: 13,
    color: '#333',
  },
  itemName: {
    fontSize: 13,
    fontWeight: '700',
    color: '#333',
  },
  separator: {
    color: '#CCC',
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
    fontSize: 12,
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
  destSectionInline: {
    flexDirection: 'row',
    gap: 6,
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  destBtnSmall: {
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderWidth: 1,
    borderColor: '#DDD',
    borderRadius: 4,
    backgroundColor: '#FFF',
    alignItems: 'center',
  },
  destTextSmall: {
    fontSize: 11,
    fontWeight: '600',
    color: '#333',
  },
  content: {
    padding: 12,
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
  disabledQuickSelectBtn: {
    backgroundColor: '#F5F5F5',
    borderColor: '#EEE',
  },
  disabledQuickSelectText: {
    color: '#CCC',
  },
  actions: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
    gap: 8,
  },
  moveBtnFull: {
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
  loadingOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(255,255,255,0.9)',
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  loadingText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2196F3',
  },
});
