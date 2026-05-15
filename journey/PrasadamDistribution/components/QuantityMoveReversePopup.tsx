/**
 * Quantity Move Reverse Popup
 * Popup for moving trays backward (to left_over or previous stage)
 * Shown on long press, uses orange theme to differentiate from forward movement
 * Compact layout without scrolling to avoid issues on some phones
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
  Alert,
  ActivityIndicator,
} from 'react-native';
import { DashboardItem, DashboardStage, STAGE_DISPLAY_NAMES } from '../types/dashboard.types';

interface QuantityMoveReversePopupProps {
  visible: boolean;
  item: DashboardItem;
  currentStage: DashboardStage;
  currentQty: number;
  onClose: () => void;
  onMove: (quantity: number, toStage: DashboardStage) => void | Promise<void>;
  onEdit?: (quantity: number) => void | Promise<void>; // New callback for direct quantity edit (Cooked stage)
  transactions?: Array<{ stage: string; quantity: number; timestamp: string }>;
  filterToStages?: DashboardStage[]; // Optional filter to show only specific stages
}

const QUICK_SELECT_AMOUNTS = [2, 3, 4, 5, 10, 20];

// Hare Krishna Maha Mantra - cycles through during loading
const MANTRA_WORDS = [
  'Hare', 'Krishna', 'Hare', 'Krishna',
  'Krishna', 'Krishna', 'Hare', 'Hare',
  'Hare', 'Rama', 'Hare', 'Rama',
  'Rama', 'Rama', 'Hare', 'Hare'
];

// Define reverse movement options
function getReverseOptions(currentStage: DashboardStage): DashboardStage[] {
  const options: DashboardStage[] = [];

  // Stage-specific reverse options (left_over is added separately)
  switch (currentStage) {
    case 'cooked':
      // Cooked can send to left_over for spoilage/correction
      options.push('left_over');
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

  return options;
}

export const QuantityMoveReversePopup: React.FC<QuantityMoveReversePopupProps> = ({
  visible,
  item,
  currentStage,
  currentQty,
  onClose,
  onMove,
  onEdit,
  transactions = [],
  filterToStages,
}) => {
  const [quantity, setQuantity] = useState('0');
  const [selectedStage, setSelectedStage] = useState<DashboardStage | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [mantraIndex, setMantraIndex] = useState(0);
  const inputRef = useRef<TextInput>(null);
  const initializedRef = useRef(false);
  const mantraIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Triple-press state for "Move to Left Over" button
  const [pressCount, setPressCount] = useState(0);
  const pressTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const [leftOverEnabled, setLeftOverEnabled] = useState(false);

  const reverseOptions = getReverseOptions(currentStage);
  // Apply filter if provided
  const filteredOptions = filterToStages
    ? reverseOptions.filter(opt => filterToStages.includes(opt))
    : reverseOptions;

  // Cooked has both edit capability and reverse options (left_over)
  const isCookedStage = currentStage === 'cooked';
  const showEditSection = isCookedStage; // Show edit controls for Cooked
  // Filter out left_over from options since it has separate button at bottom
  const nonLeftOverOptions = filteredOptions.filter(opt => opt !== 'left_over');
  const hasMultipleDestinations = nonLeftOverOptions.length > 1;

  // Reset triple-press when popup closes
  useEffect(() => {
    if (!visible) {
      setPressCount(0);
      setLeftOverEnabled(false);
      setIsLoading(false); // Reset loading state
      setMantraIndex(0); // Reset mantra
      if (pressTimeoutRef.current) {
        clearTimeout(pressTimeoutRef.current);
        pressTimeoutRef.current = null;
      }
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

  // Auto-select destination based on available options
  useEffect(() => {
    if (visible && !initializedRef.current) {
      initializedRef.current = true;
      // Auto-select if only one non-left_over option, otherwise let user choose
      if (nonLeftOverOptions.length === 1) {
        setSelectedStage(nonLeftOverOptions[0]);
      } else if (nonLeftOverOptions.length > 1) {
        setSelectedStage(null); // Let user choose
      }
      setQuantity('0');
    } else if (!visible) {
      // Reset when closed so next open re-initializes
      initializedRef.current = false;
    }
  }, [visible, nonLeftOverOptions]);

  const handleQuickSelect = useCallback((amount: number) => {
    const current = parseInt(quantity, 10) || 0;
    const newQty = current + amount;
    setQuantity(newQty.toString());
  }, [quantity]);

  const dismissKeyboard = useCallback(() => {
    Keyboard.dismiss();
  }, []);

  const adjustQuantity = useCallback((delta: number) => {
    const current = parseInt(quantity, 10) || 0;
    const newQty = Math.max(0, current + delta);
    setQuantity(newQty.toString());
  }, [quantity]);

  const handleFocusInput = useCallback(() => {
    inputRef.current?.focus();
  }, []);

  const handleMove = useCallback(async () => {
    const qty = parseInt(quantity, 10);

    // Cooked stage uses Add/Subtract buttons, not handleMove
    if (isCookedStage) return;

    // Determine the destination stage (selected or auto-selected)
    const destStage = selectedStage || (nonLeftOverOptions.length === 1 ? nonLeftOverOptions[0] : null);

    // Other stages: reverse move
    if (!destStage || isNaN(qty) || qty <= 0 || qty > currentQty) {
      return;
    }

    const startTime = Date.now();
    console.log('[QuantityMoveReversePopup] handleMove START', { qty, toStage: destStage, item: item.name });

    setIsLoading(true);
    try {
      // Await the API calls - popup stays open until transfer completes
      await onMove(qty, destStage);
      const elapsed = Date.now() - startTime;
      console.log('[QuantityMoveReversePopup] handleMove SUCCESS - closing popup, elapsed:', elapsed, 'ms');
      onClose();
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error('[QuantityMoveReversePopup] handleMove ERROR, elapsed:', elapsed, 'ms', error);
      setIsLoading(false);
    }
  }, [quantity, selectedStage, nonLeftOverOptions, currentQty, onMove, onClose, isCookedStage, item.name]);

  // Handle Add action for Cooked stage
  const handleAdd = useCallback(async () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return;

    const startTime = Date.now();
    console.log('[QuantityMoveReversePopup] handleAdd START', { qty, item: item.name });

    setIsLoading(true);
    try {
      // Await the API call - popup stays open until complete
      const newTotal = currentQty + qty;
      await onEdit?.(newTotal);
      const elapsed = Date.now() - startTime;
      console.log('[QuantityMoveReversePopup] handleAdd SUCCESS - closing popup, elapsed:', elapsed, 'ms');
      onClose();
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error('[QuantityMoveReversePopup] handleAdd ERROR, elapsed:', elapsed, 'ms', error);
      setIsLoading(false);
    }
  }, [quantity, currentQty, onEdit, onClose, item.name]);

  // Handle Subtract action for Cooked stage
  const handleSubtract = useCallback(async () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) return;

    const startTime = Date.now();
    console.log('[QuantityMoveReversePopup] handleSubtract START', { qty, item: item.name });

    setIsLoading(true);
    try {
      // Await the API call - popup stays open until complete
      const newTotal = Math.max(0, currentQty - qty);
      await onEdit?.(newTotal);
      const elapsed = Date.now() - startTime;
      console.log('[QuantityMoveReversePopup] handleSubtract SUCCESS - closing popup, elapsed:', elapsed, 'ms');
      onClose();
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error('[QuantityMoveReversePopup] handleSubtract ERROR, elapsed:', elapsed, 'ms', error);
      setIsLoading(false);
    }
  }, [quantity, currentQty, onEdit, onClose, item.name]);

  // Handle triple-press for "Move to Left Over" button
  const handleLeftOverPress = useCallback(() => {
    const newCount = pressCount + 1;
    setPressCount(newCount);

    // Clear existing timeout
    if (pressTimeoutRef.current) {
      clearTimeout(pressTimeoutRef.current);
    }

    if (newCount >= 3) {
      // Enable the button after 3 presses
      setLeftOverEnabled(true);
      setPressCount(0);
    } else {
      // Reset after 5 seconds if not enough presses
      pressTimeoutRef.current = setTimeout(() => {
        setPressCount(0);
        setLeftOverEnabled(false);
      }, 5000);
    }
  }, [pressCount]);

  // Execute "Move to Left Over" action
  const handleLeftOverMove = useCallback(async () => {
    const qty = parseInt(quantity, 10);
    if (isNaN(qty) || qty <= 0) {
      Alert.alert('Invalid Quantity', 'Please enter a valid quantity greater than 0');
      return;
    }
    if (qty > currentQty) {
      Alert.alert('Invalid Quantity', `Cannot move ${qty} trays. Only ${currentQty} trays available.`);
      return;
    }

    const startTime = Date.now();
    console.log('[QuantityMoveReversePopup] handleLeftOverMove START', { qty, item: item.name });

    setIsLoading(true);
    try {
      // Await the API call - popup stays open until complete
      await onMove(qty, 'left_over');
      const elapsed = Date.now() - startTime;
      console.log('[QuantityMoveReversePopup] handleLeftOverMove SUCCESS - closing popup, elapsed:', elapsed, 'ms');
      onClose();
    } catch (error) {
      const elapsed = Date.now() - startTime;
      console.error('[QuantityMoveReversePopup] handleLeftOverMove ERROR, elapsed:', elapsed, 'ms', error);
      setIsLoading(false);
    }
  }, [quantity, currentQty, onMove, onClose, item.name]);

  const isValid = !isLoading &&
    !isCookedStage &&
    (selectedStage !== null || nonLeftOverOptions.length === 1) &&
    !isNaN(parseInt(quantity, 10)) &&
    parseInt(quantity, 10) > 0 &&
    parseInt(quantity, 10) <= currentQty;

  // For Cooked Add/Subtract buttons
  const isAddValid = !isLoading && !isNaN(parseInt(quantity, 10)) && parseInt(quantity, 10) > 0;
  const isSubtractValid = !isLoading && !isNaN(parseInt(quantity, 10)) && parseInt(quantity, 10) > 0;

  // For Left Over moves - applies to both Cooked and other stages
  const isLeftOverValid = !isLoading &&
    !isNaN(parseInt(quantity, 10)) &&
    parseInt(quantity, 10) > 0 &&
    parseInt(quantity, 10) <= currentQty;

  // Get display name for selected or auto destination
  const destDisplay = selectedStage
    ? STAGE_DISPLAY_NAMES[selectedStage]
    : nonLeftOverOptions.length === 1
    ? STAGE_DISPLAY_NAMES[nonLeftOverOptions[0]]
    : nonLeftOverOptions.length > 1
    ? nonLeftOverOptions.map(d => STAGE_DISPLAY_NAMES[d]).join(' / ')
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
          {/* Single-line Header with orange theme */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              <Text style={styles.headerOneLine} numberOfLines={1}>
                <Text style={styles.itemName}>{item.name}</Text>
                <Text style={styles.separator}> • </Text>
                {!isCookedStage ? (
                  <>
                    <Text style={styles.label}>From:</Text> {STAGE_DISPLAY_NAMES[currentStage]}
                    <Text style={styles.arrow}> → </Text>
                    <Text style={styles.destHighlight}>{destDisplay}</Text>
                  </>
                ) : (
                  <Text style={styles.sectionTitleInline}>Enter Amount:</Text>
                )}
              </Text>
            </View>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <View style={styles.content}>
            {/* Multiple reverse destinations - only show buttons when more than one option */}
            {!isCookedStage && hasMultipleDestinations && (
              <View style={styles.destSection}>
                <View style={styles.destRow}>
                  {nonLeftOverOptions.map(dest => (
                    <TouchableOpacity
                      key={dest}
                      style={[
                        styles.destBtn,
                        selectedStage === dest && styles.selectedBtn
                      ]}
                      onPress={() => setSelectedStage(dest)}
                    >
                      <Text
                        style={[
                          styles.destText,
                          selectedStage === dest && styles.selectedText
                        ]}
                        numberOfLines={1}
                      >
                        {STAGE_DISPLAY_NAMES[dest]}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>
              </View>
            )}

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
                  {isCookedStage ? <Text style={styles.maxQty}>(current: {currentQty})</Text> : <Text style={styles.maxQty}>/ {currentQty}</Text>}
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
                  // For Cooked stage, no limit on quick select - for others, limit to currentQty
                  const wouldExceed = !isCookedStage && (enteredQty + amount) > currentQty;
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

          {/* Recent Activity History - shown at bottom */}
          {!isCookedStage && transactions.length > 0 && (
            <View style={styles.historySection}>
              <Text style={styles.historyTitle}>Recent Activity:</Text>
              {transactions.slice(0, 3).map((tx, index) => (
                <View key={index} style={styles.historyItem}>
                  <Text style={styles.historyText}>
                    <Text style={styles.historyQty}>{tx.quantity}</Text> trays to {tx.stage}
                  </Text>
                  <Text style={styles.historyTime}>{tx.timestamp}</Text>
                </View>
              ))}
            </View>
          )}

          {/* Action Buttons */}
          <View style={styles.actions}>
            {/* Cooked stage: Show Left Over, Subtract, Add buttons */}
            {isCookedStage ? (
              <>
                {/* Triple-press "Move to Left Over" button */}
                {!leftOverEnabled ? (
                  <TouchableOpacity
                    style={styles.leftOverPressBtn}
                    onPress={handleLeftOverPress}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    <Text style={styles.leftOverPressText}>
                      Left Over
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.leftOverEnabledBtn, !isLeftOverValid && styles.disabledBtn]}
                    onPress={handleLeftOverMove}
                    disabled={!isLeftOverValid}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.leftOverEnabledText}>
                        Left Over ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
                <TouchableOpacity
                  style={[styles.subtractBtnSmall, !isSubtractValid && styles.disabledBtn]}
                  onPress={handleSubtract}
                  disabled={!isSubtractValid}
                >
                  {isLoading && isValid ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.subtractBtnTextSmall}>−{quantity}</Text>
                  )}
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.addBtn, !isAddValid && styles.disabledBtn]}
                  onPress={handleAdd}
                  disabled={!isAddValid}
                >
                  {isLoading && isValid ? (
                    <ActivityIndicator size="small" color="#FFF" />
                  ) : (
                    <Text style={styles.addBtnText}>+{quantity}</Text>
                  )}
                </TouchableOpacity>
              </>
            ) : (
              <>
                {/* Triple-press "Move to Left Over" button */}
                {!leftOverEnabled ? (
                  <TouchableOpacity
                    style={styles.leftOverPressBtn}
                    onPress={handleLeftOverPress}
                    activeOpacity={0.7}
                    disabled={isLoading}
                  >
                    <Text style={styles.leftOverPressText}>
                      Move to Left Over
                    </Text>
                  </TouchableOpacity>
                ) : (
                  <TouchableOpacity
                    style={[styles.leftOverEnabledBtn, !isLeftOverValid && styles.disabledBtn]}
                    onPress={handleLeftOverMove}
                    disabled={!isLeftOverValid}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.leftOverEnabledText}>
                        Move {quantity} to Left Over ✓
                      </Text>
                    )}
                  </TouchableOpacity>
                )}

                {/* Main action button - hide when left over is enabled */}
                {!leftOverEnabled && (
                  <TouchableOpacity
                    style={[styles.moveBtn, !isValid && styles.disabledBtn]}
                    onPress={handleMove}
                    disabled={!isValid}
                  >
                    {isLoading ? (
                      <ActivityIndicator size="small" color="#FFF" />
                    ) : (
                      <Text style={styles.moveBtnText}>
                        Move {quantity}
                      </Text>
                    )}
                  </TouchableOpacity>
                )}
              </>
            )}
          </View>

          {/* Loading Overlay */}
          {isLoading && (
            <View style={styles.loadingOverlay}>
              <ActivityIndicator size="large" color="#FF9800" />
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
    borderBottomColor: '#FFE0B2',
    backgroundColor: '#FFF3E0',
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
  sectionTitleInline: {
    fontSize: 13,
    fontWeight: '600',
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
  sectionTitle: {
    fontSize: 13,
    fontWeight: '600',
    marginBottom: 6,
    color: '#333',
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
  disabledQuickSelectBtn: {
    backgroundColor: '#FFF8E1',
    borderColor: '#FFE0B2',
  },
  disabledQuickSelectText: {
    color: '#CCC',
  },
  actions: {
    flexDirection: 'row',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
    gap: 8,
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
  addBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#4CAF50',
    alignItems: 'center',
  },
  addBtnText: {
    fontSize: 18,
    fontWeight: '700',
    color: '#FFF',
  },
  subtractBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F44336',
    alignItems: 'center',
  },
  subtractBtnText: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  subtractBtnSmall: {
    flex: 0.7,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#F44336',
    alignItems: 'center',
  },
  subtractBtnTextSmall: {
    fontSize: 15,
    fontWeight: '600',
    color: '#FFF',
  },
  disabledBtn: {
    backgroundColor: '#BDBDBD',
  },
  leftOverPressBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#E0E0E0',
    borderWidth: 2,
    borderColor: '#BDBDBD',
    alignItems: 'center',
  },
  leftOverPressText: {
    fontSize: 14,
    fontWeight: '700',
    color: '#757575',
  },
  leftOverEnabledBtn: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FF5722',
    alignItems: 'center',
  },
  leftOverEnabledText: {
    fontSize: 15,
    fontWeight: '700',
    color: '#FFF',
  },
  leftOverPressBtnSmall: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FFCCBC',
    borderWidth: 2,
    borderColor: '#FF5722',
    alignItems: 'center',
  },
  leftOverPressTextSmall: {
    fontSize: 13,
    fontWeight: '700',
    color: '#BF360C',
  },
  leftOverEnabledBtnSmall: {
    flex: 1,
    paddingVertical: 10,
    borderRadius: 8,
    backgroundColor: '#FF5722',
    alignItems: 'center',
  },
  leftOverEnabledTextSmall: {
    fontSize: 13,
    fontWeight: '700',
    color: '#FFF',
  },
  historySection: {
    borderTopWidth: 1,
    borderTopColor: '#FFE0B2',
    paddingHorizontal: 12,
    paddingVertical: 8,
    backgroundColor: '#FFF8E1',
  },
  historyTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F57C00',
    marginBottom: 4,
  },
  historyItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingVertical: 2,
  },
  historyText: {
    fontSize: 11,
    color: '#666',
  },
  historyQty: {
    fontWeight: '600',
    color: '#FF9800',
  },
  historyTime: {
    fontSize: 10,
    color: '#999',
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
    color: '#FF9800',
  },
});
