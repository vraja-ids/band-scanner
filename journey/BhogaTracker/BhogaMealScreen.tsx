import React, { FC, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  SafeAreaView,
  Modal,
  Dimensions,
  TextInput,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bhogaSheetsService, StorageLocation, StockTransaction } from '../../services/BhogaSheetsService';
import { Routes, BhogaMealParams } from '../../routes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type BhogaMealScreenNavigationProp = StackNavigationProp<any, Routes.BhogaMeal>;
type BhogaMealScreenRouteProp = RouteProp<any, Routes.BhogaMeal>;

interface Props {
  navigation: BhogaMealScreenNavigationProp;
  route: BhogaMealScreenRouteProp;
}

interface IngredientWithLocation {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  status: 'pending' | 'delivered' | 'used';
  location?: StorageLocation;
}

interface MenuItemWithIngredients {
  name: string;
  ingredients: IngredientWithLocation[];
}

interface RoundingOption {
  qty: number;
  label?: string; // 'Planned' for planned qty
}

// Helper to format quantities to 2 decimal places
const formatQty = (qty: number): string => {
  if (Number.isInteger(qty)) return qty.toString();
  return qty.toFixed(2);
};

const BhogaMealScreen: FC<Props> = ({ navigation, route }) => {
  const { mealId, mealName, mealData } = route.params as BhogaMealParams;
  const [isLoading, setIsLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemWithIngredients[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [showRoundingModal, setShowRoundingModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientWithLocation | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>('');
  const [customQty, setCustomQty] = useState('0');

  useEffect(() => {
    loadData();
    loadUserId();
  }, []);

  const loadUserId = async () => {
    try {
      const id = await AsyncStorage.getItem('memberId');
      setUserId(id || '');
    } catch (error) {
      console.error('Error loading user ID:', error);
    }
  };

  const loadData = async () => {
    try {
      setIsLoading(true);
      const locations = await bhogaSheetsService.getStorageLocations();
      setStorageLocations(locations);

      const locationMap = new Map(locations.map(l => [l.ingredientName, l]));

      const itemsWithLocations: MenuItemWithIngredients[] = Object.values(mealData.items).map(item => ({
        name: item.name,
        ingredients: item.ingredients.map(ing => ({
          ...ing,
          location: locationMap.get(ing.name),
        })),
      }));

      setMenuItems(itemsWithLocations);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMarkDelivered = (ingredient: IngredientWithLocation, menuItem: string) => {
    setSelectedIngredient(ingredient);
    setSelectedMenuItem(menuItem);
    setCustomQty(ingredient.quantity.toString());
    setShowRoundingModal(true);
  };

  const getRoundingOptions = (qty: number, plannedQty: number): RoundingOption[] => {
    const options: RoundingOption[] = [];

    // Add "Planned" option first
    if (plannedQty > 0) {
      options.push({ qty: plannedQty, label: 'Planned' });
    }

    // Round to nearest whole number
    const rounded = Math.round(qty);
    options.push({ qty: rounded });

    // Round down and up
    const floor = Math.floor(qty);
    const ceil = Math.ceil(qty);
    if (floor !== rounded) options.push({ qty: floor });
    if (ceil !== rounded && ceil !== floor) options.push({ qty: ceil });

    // Nearest 5
    const nearest5Down = Math.floor(qty / 5) * 5;
    const nearest5Up = Math.ceil(qty / 5) * 5;
    if (nearest5Down > 0 && !options.some(o => o.qty === nearest5Down)) options.push({ qty: nearest5Down });
    if (!options.some(o => o.qty === nearest5Up)) options.push({ qty: nearest5Up });
    if (!options.some(o => o.qty === nearest5Up + 5)) options.push({ qty: nearest5Up + 5 });

    // Nearest 10
    const nearest10Down = Math.floor(qty / 10) * 10;
    const nearest10Up = Math.ceil(qty / 10) * 10;
    if (nearest10Down > 0 && !options.some(o => o.qty === nearest10Down)) options.push({ qty: nearest10Down });
    if (!options.some(o => o.qty === nearest10Up)) options.push({ qty: nearest10Up });
    if (!options.some(o => o.qty === nearest10Up + 10)) options.push({ qty: nearest10Up + 10 });

    // Filter duplicates and limit to 8 total
    const uniqueOptions = options.filter((opt, index, self) =>
      index === self.findIndex(o => o.qty === opt.qty)
    );

    return uniqueOptions
      .sort((a, b) => {
        // Keep labeled options (Planned) at the front
        if (a.label && !b.label) return -1;
        if (!a.label && b.label) return 1;
        // Then sort by closeness to qty
        return Math.abs(a.qty - qty) - Math.abs(b.qty - qty);
      })
      .slice(0, 8);
  };

  const confirmDelivery = async (finalQty: number) => {
    if (!selectedIngredient) return;

    try {
      setIsLoading(true);
      setShowRoundingModal(false);

      // Update local status
      setMenuItems(prev =>
        prev.map(item =>
          item.name === selectedMenuItem
            ? {
                ...item,
                ingredients: item.ingredients.map(ing =>
                  ing.name === selectedIngredient.name ? { ...ing, status: 'delivered' as const } : ing
                ),
              }
            : item
        )
      );

      // Record transaction
      const transaction: StockTransaction = {
        timestamp: new Date().toISOString(),
        mealId,
        menuItem: selectedMenuItem,
        ingredientName: selectedIngredient.name,
        usedQuantity: finalQty,
        unit: selectedIngredient.unit,
        remainingStock: selectedIngredient.location?.currentStock,
        userId,
      };

      await bhogaSheetsService.recordStockTransaction(transaction);

      // Update stock location if exists
      if (selectedIngredient.location) {
        const newStock = Math.max(0, selectedIngredient.location.currentStock - finalQty);
        await bhogaSheetsService.updateStorageLocation(
          selectedIngredient.name,
          selectedIngredient.location.room,
          selectedIngredient.location.sublocation,
          newStock,
          selectedIngredient.location.unit
        );
      }

      Alert.alert('Success', `${selectedIngredient.name} delivered to kitchen: ${finalQty} ${selectedIngredient.unit}`);
    } catch (error) {
      console.error('Error marking delivered:', error);
      Alert.alert('Error', 'Failed to mark as delivered');
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'delivered':
        return '#4CAF50';
      case 'used':
        return '#2196F3';
      default:
        return '#FF9800';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'delivered':
        return 'DELIVERED';
      case 'used':
        return 'USED';
      default:
        return 'PENDING';
    }
  };

  const getTotalIngredients = () => {
    return menuItems.reduce((sum, item) => sum + item.ingredients.length, 0);
  };

  const getPendingCount = () => {
    return menuItems.reduce(
      (sum, item) => sum + item.ingredients.filter(ing => ing.status === 'pending').length,
      0
    );
  };

  if (isLoading && menuItems.length === 0) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#5dbea3" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#5dbea3" />
          </TouchableOpacity>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>{mealName}</Text>
            <Text style={styles.headerSubtitle}>
              {getPendingCount()} / {getTotalIngredients()} pending
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        {menuItems.map((item, itemIndex) => (
          <View key={itemIndex} style={styles.menuItemCard}>
            <Text style={styles.menuItemTitle}>{item.name}</Text>
            {item.ingredients.map((ingredient, ingIndex) => (
              <View key={ingIndex} style={styles.ingredientRow}>
                <View style={styles.ingredientInfo}>
                  <View style={[styles.statusDot, { backgroundColor: getStatusColor(ingredient.status) }]} />
                  <Text style={styles.ingredientName}>{ingredient.name}</Text>
                  <Text style={styles.ingredientQuantity}>
                    {formatQty(ingredient.quantity)} {ingredient.unit}
                  </Text>
                </View>

                {ingredient.location && (
                  <View style={styles.locationInfo}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.locationText}>
                      {ingredient.location.room}
                      {ingredient.location.sublocation && ` → ${ingredient.location.sublocation}`}
                    </Text>
                  </View>
                )}

                <View style={styles.actions}>
                  <Text style={[styles.statusText, { color: getStatusColor(ingredient.status) }]}>
                    {getStatusText(ingredient.status)}
                  </Text>

                  {ingredient.status === 'pending' && (
                    <TouchableOpacity
                      style={styles.deliverButton}
                      onPress={() => handleMarkDelivered(ingredient, item.name)}
                      disabled={isLoading}
                    >
                      <Ionicons name="checkmark-circle" size={24} color="#FF9800" />
                      <Text style={styles.deliverButtonText}>Deliver to Kitchen</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
      </ScrollView>

      {/* Rounding Modal */}
      <Modal
        visible={showRoundingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoundingModal(false)}
      >
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowRoundingModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>Deliver to Kitchen</Text>
              <TouchableOpacity onPress={() => setShowRoundingModal(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedIngredient && (
              <>
                <Text style={styles.ingredientNameModal}>{selectedIngredient.name}</Text>

                <View style={styles.qtyInfoRow}>
                  <Text style={styles.qtyInfoLabel}>Planned: </Text>
                  <Text style={styles.qtyInfoValue}>{formatQty(selectedIngredient.quantity)} {selectedIngredient.unit}</Text>
                </View>

                {selectedIngredient.location && (
                  <View style={styles.qtyInfoRow}>
                    <Ionicons name="location-outline" size={16} color="#666" />
                    <Text style={styles.qtyInfoValue}>
                      {selectedIngredient.location.room}
                      {selectedIngredient.location.sublocation && ` → ${selectedIngredient.location.sublocation}`}
                    </Text>
                  </View>
                )}

                <Text style={styles.sectionTitle}>Quick Round Off</Text>
                <View style={styles.roundingOptions}>
                  {getRoundingOptions(selectedIngredient.quantity, selectedIngredient.quantity).map((option) => (
                    <TouchableOpacity
                      key={option.qty}
                      style={[
                        styles.roundingOption,
                        customQty === option.qty.toString() && styles.roundingOptionSelected,
                        option.label && styles.roundingOptionLabeled,
                      ]}
                      onPress={() => setCustomQty(option.qty.toString())}
                    >
                      <Text style={[
                        styles.roundingOptionText,
                        customQty === option.qty.toString() && styles.roundingOptionTextSelected,
                      ]}>
                        {option.label || formatQty(option.qty)}
                      </Text>
                    </TouchableOpacity>
                  ))}
                </View>

                <Text style={styles.sectionTitle}>Or Enter Exact Amount</Text>
                <View style={styles.customQtyContainer}>
                  <TextInput
                    style={styles.customQtyInput}
                    value={customQty}
                    onChangeText={setCustomQty}
                    keyboardType="numeric"
                    selectTextOnFocus
                  />
                  <Text style={styles.customQtyUnit}>{selectedIngredient.unit}</Text>
                </View>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={() => confirmDelivery(parseFloat(customQty) || 0)}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.confirmButtonText}>Confirm Delivery</Text>
                </TouchableOpacity>
              </>
            )}
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 15,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    padding: 8,
  },
  headerContent: {
    flex: 1,
    alignItems: 'center',
  },
  headerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  headerSubtitle: {
    fontSize: 14,
    color: '#666',
  },
  content: {
    flex: 1,
    padding: 15,
  },
  menuItemCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  menuItemTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  ingredientRow: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
  },
  ingredientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: 10,
  },
  ingredientName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  ingredientQuantity: {
    fontSize: 14,
    color: '#666',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    marginLeft: 20,
  },
  locationText: {
    fontSize: 13,
    color: '#666',
    marginLeft: 5,
  },
  actions: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginLeft: 20,
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
  },
  deliverButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff3e0',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  deliverButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#FF9800',
    marginLeft: 5,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  modalTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
  },
  ingredientNameModal: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
    textAlign: 'center',
  },
  qtyInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 8,
  },
  qtyInfoLabel: {
    fontSize: 16,
    color: '#666',
  },
  qtyInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  sectionTitle: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
    marginBottom: 12,
    textAlign: 'center',
  },
  roundingOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 10,
    marginBottom: 10,
  },
  roundingOption: {
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 20,
    paddingVertical: 12,
    minWidth: 70,
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'transparent',
  },
  roundingOptionSelected: {
    backgroundColor: '#5dbea3',
    borderColor: '#5dbea3',
  },
  roundingOptionLabeled: {
    backgroundColor: '#e3f2fd',
    borderColor: '#2196F3',
    minWidth: 90,
  },
  roundingOptionText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  roundingOptionTextSelected: {
    color: '#fff',
  },
  customQtyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 12,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  customQtyInput: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#5dbea3',
    width: 120,
    textAlign: 'center',
  },
  customQtyUnit: {
    fontSize: 16,
    color: '#666',
    marginLeft: 8,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5dbea3',
    padding: 16,
    borderRadius: 12,
    marginTop: 20,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
});

export default BhogaMealScreen;
