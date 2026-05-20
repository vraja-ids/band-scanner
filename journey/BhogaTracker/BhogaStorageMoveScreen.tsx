import React, { FC, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { bhogaSheetsService, DeliveredItem, StorageLocation, Ingredient, IngredientListData } from '../../services/BhogaSheetsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type BhogaStorageMoveScreenNavigationProp = StackNavigationProp<any, any>;

interface Props {
  navigation: BhogaStorageMoveScreenNavigationProp;
}

const ROOM_OPTIONS = ['Kitchen', 'Pantry', 'Walk-in Fridge', 'Dry Storage', 'Cold Room'];

interface RoundingOption {
  qty: number;
  label?: string;
}

interface DeliveredItemWithMeals extends DeliveredItem {
  ingredientData?: Ingredient;
}

// Helper to format quantities to 2 decimal places
const formatQty = (qty: number): string => {
  if (Number.isInteger(qty)) return qty.toString();
  return qty.toFixed(2);
};

// Helper to format meal names from mealId
const formatMealName = (mealId: string): string => {
  const dayMap: Record<string, string> = {
    'fri': 'Friday',
    'sat': 'Saturday',
    'sun': 'Sunday',
    'mon': 'Monday',
    'tue': 'Tuesday',
    'wed': 'Wednesday',
    'thu': 'Thursday',
  };

  const mealTypeMap: Record<string, string> = {
    'breakfast': 'Breakfast',
    'lunch': 'Lunch',
    'dinner': 'Dinner',
  };

  const parts = mealId.split(/(?=[A-Z])/);
  if (parts.length >= 2) {
    const day = parts[0].toLowerCase();
    const type = parts[1]?.toLowerCase() || '';
    const dayName = dayMap[day] || parts[0];
    const typeName = mealTypeMap[type] || parts[1];
    return `${dayName} ${typeName}`;
  }
  return mealId;
};

// Helper to check if a meal is in the future
const isFutureMeal = (mealId: string): boolean => {
  const now = new Date();
  const currentDay = now.getDay(); // 0-6 (Sunday=0, Monday=1, etc.)
  const currentHour = now.getHours();

  const dayMap: Record<string, number> = {
    'sun': 0, 'mon': 1, 'tue': 2, 'wed': 3, 'thu': 4, 'fri': 5, 'sat': 6,
  };

  const mealHourMap: Record<string, number> = {
    'breakfast': 8, 'lunch': 13, 'dinner': 19,
  };

  const parts = mealId.split(/(?=[A-Z])/);
  if (parts.length >= 2) {
    const day = dayMap[parts[0].toLowerCase()];
    const mealType = parts[1]?.toLowerCase();
    const mealHour = mealHourMap[mealType] || 12;

    if (day === undefined) return false;

    // Meal is future if it's on a later day, or same day but later hour
    if (day > currentDay) return true;
    if (day === currentDay && mealHour > currentHour) return true;
  }
  return false;
};

const BhogaStorageMoveScreen: FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [deliveredItems, setDeliveredItems] = useState<DeliveredItemWithMeals[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [ingredientData, setIngredientData] = useState<IngredientListData | null>(null);
  const [selectedItem, setSelectedItem] = useState<DeliveredItemWithMeals | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [showRoundingModal, setShowRoundingModal] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [sublocation, setSublocation] = useState('');
  const [customQty, setCustomQty] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [items, locations, ingData] = await Promise.all([
        bhogaSheetsService.getDeliveredItems(),
        bhogaSheetsService.getStorageLocations(),
        bhogaSheetsService.getIngredientList(),
      ]);

      // Create a map of ingredients for quick lookup
      const ingredientMap = new Map<string, Ingredient>();
      ingData.ingredients.forEach(ing => {
        ingredientMap.set(ing.name, ing);
      });

      // Enhance delivered items with ingredient data
      const itemsWithMeals: DeliveredItemWithMeals[] = items.map(item => ({
        ...item,
        ingredientData: ingredientMap.get(item.ingredient),
      }));

      setDeliveredItems(itemsWithMeals.sort((a, b) => a.ingredient.localeCompare(b.ingredient)));
      setStorageLocations(locations);
      setIngredientData(ingData);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemExpanded = (timestamp: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(timestamp)) {
        next.delete(timestamp);
      } else {
        next.add(timestamp);
      }
      return next;
    });
  };

  // Calculate total stock for an ingredient (delivered + stored)
  const getTotalStockForIngredient = (ingredientName: string): number => {
    const ingredient = ingredientData?.ingredients.find(i => i.name === ingredientName);
    if (!ingredient) return 0;

    // Get all delivered items for this ingredient
    const deliveredTotal = deliveredItems
      .filter(i => i.ingredient === ingredientName && i.status === 'delivered')
      .reduce((sum, i) => sum + i.quantity, 0);

    // Get all stored amounts
    const storedTotal = storageLocations
      .filter(l => l.ingredientName === ingredientName)
      .reduce((sum, l) => sum + l.currentStock, 0);

    return deliveredTotal + storedTotal;
  };

  const handleMoveToStorage = (item: DeliveredItemWithMeals) => {
    setSelectedItem(item);
    setCustomQty(item.quantity.toString());
    setShowRoundingModal(true);
  };

  const getRoundingOptions = (qty: number): RoundingOption[] => {
    const options: RoundingOption[] = [];

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
      .sort((a, b) => Math.abs(a.qty - qty) - Math.abs(b.qty - qty))
      .slice(0, 8);
  };

  const proceedToLocationPicker = () => {
    setShowRoundingModal(false);
    setSelectedRoom('');
    setSublocation('');
    setShowLocationPicker(true);
  };

  const handleConfirmMove = async () => {
    if (!selectedItem || !selectedRoom) {
      Alert.alert('Error', 'Please select a room');
      return;
    }

    try {
      const finalQty = parseFloat(customQty) || selectedItem.quantity;

      await bhogaSheetsService.moveToStorage({
        ingredient: selectedItem.ingredient,
        room: selectedRoom,
        sublocation,
        quantity: finalQty,
        unit: selectedItem.unit,
      });

      // Remove item from local list
      setDeliveredItems(prev => prev.filter(item => item.timestamp !== selectedItem?.timestamp));

      setShowLocationPicker(false);
      setSelectedItem(null);
      Alert.alert('Success', `Item moved to storage: ${finalQty} ${selectedItem.unit}`);
    } catch (error) {
      Alert.alert('Error', 'Failed to move to storage');
    }
  };

  const getCategoryColor = (category: string) => {
    const colors: Record<string, string> = {
      'Vegetables': '#4CAF50',
      'Dairy': '#2196F3',
      'Grains': '#FF9800',
      'Spices': '#F44336',
      'Oils': '#FFC107',
      'Sweet': '#E91E63',
    };
    return colors[category] || '#9E9E9E';
  };

  const getFilteredItems = () => {
    if (!searchQuery.trim()) return deliveredItems;
    const query = searchQuery.toLowerCase();
    return deliveredItems.filter(item =>
      item.ingredient.toLowerCase().includes(query)
    );
  };

  if (isLoading) {
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
          <Text style={styles.headerTitle}>Move to Storage</Text>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={24} color="#5dbea3" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search items..."
          value={searchQuery}
          onChangeText={setSearchQuery}
          autoCapitalize="none"
          autoCorrect={false}
        />
        {searchQuery.length > 0 && (
          <TouchableOpacity onPress={() => setSearchQuery('')} style={styles.clearButton}>
            <Ionicons name="close-circle" size={20} color="#999" />
          </TouchableOpacity>
        )}
      </View>

      <ScrollView style={styles.content}>
        {getFilteredItems().length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>
              {searchQuery ? 'No items found' : 'No items to move'}
            </Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try a different search term' : 'Delivered items will appear here'}
            </Text>
          </View>
        ) : (
          getFilteredItems().map((item) => {
            const isExpanded = expandedItems.has(item.timestamp);
            const ingredientInfo = item.ingredientData;
            const totalStock = getTotalStockForIngredient(item.ingredient);

            return (
            <View key={item.timestamp} style={styles.itemCard}>
              <TouchableOpacity onPress={() => toggleItemExpanded(item.timestamp)} activeOpacity={0.7}>
                <View style={styles.itemHeader}>
                  <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                    <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
                      {item.category}
                    </Text>
                  </View>
                  <View style={styles.headerRight}>
                    <Text style={styles.qtyText}>{formatQty(item.quantity)} {item.unit}</Text>
                    <Ionicons name={isExpanded ? "chevron-up" : "chevron-down"} size={20} color="#666" style={{ marginLeft: 8 }} />
                  </View>
                </View>

                <Text style={styles.ingredientName}>{item.ingredient}</Text>

                {ingredientInfo && ingredientInfo.meals.length > 0 && isExpanded && (
                  <View style={styles.mealUsageContainer}>
                    <Text style={styles.mealUsageTitle}>Used in these meals:</Text>
                    {ingredientInfo.meals.map((meal, index) => {
                      const isFuture = isFutureMeal(meal.mealId);
                      const hasShortage = isFuture && totalStock < meal.plannedQuantity;
                      const shortage = meal.plannedQuantity - totalStock;

                      return (
                        <View key={index} style={[
                          styles.mealUsageRow,
                          hasShortage && styles.mealUsageRowWarning
                        ]}>
                          <View style={styles.mealUsageLeft}>
                            <Text style={styles.mealUsageName}>{formatMealName(meal.mealId)}</Text>
                            <Text style={styles.mealUsageDish}>for {meal.menuItem}</Text>
                          </View>
                          <View style={styles.mealUsageRight}>
                            <Text style={styles.mealQtyText}>{formatQty(meal.plannedQuantity)} {item.unit}</Text>
                            {isFuture && (
                              <View style={[styles.statusBadge, hasShortage ? styles.statusBadgeWarning : styles.statusBadgeOK]}>
                                <Text style={[styles.statusText, hasShortage ? styles.statusTextWarning : styles.statusTextOK]}>
                                  {hasShortage ? `Need ${formatQty(shortage)} more` : 'Enough stock'}
                                </Text>
                              </View>
                            )}
                          </View>
                        </View>
                      );
                    })}
                  </View>
                )}

                {/* Stock alert banner for future meals */}
                {ingredientInfo && ingredientInfo.meals.some(m => isFutureMeal(m.mealId)) && (
                  <View style={styles.stockAlertContainer}>
                    {(() => {
                      const futureMeals = ingredientInfo.meals.filter(m => isFutureMeal(m.mealId));
                      const hasShortage = futureMeals.some(m => totalStock < m.plannedQuantity);
                      const maxShortage = Math.max(...futureMeals.map(m => Math.max(0, m.plannedQuantity - totalStock)));

                      return hasShortage ? (
                        <View style={styles.stockAlertWarning}>
                          <Ionicons name="warning" size={16} color="#d32f2f" />
                          <Text style={styles.stockAlertTextWarning}>
                            Stock shortage: Need {formatQty(maxShortage)} {item.unit} more for upcoming meals
                          </Text>
                        </View>
                      ) : (
                        <View style={styles.stockAlertOK}>
                          <Ionicons name="checkmark-circle" size={16} color="#388e3c" />
                          <Text style={styles.stockAlertTextOK}>
                            Sufficient stock for {futureMeals.length} upcoming meal{futureMeals.length > 1 ? 's' : ''}
                          </Text>
                        </View>
                      );
                    })()}
                  </View>
                )}
              </TouchableOpacity>

              <TouchableOpacity
                style={styles.moveButton}
                onPress={() => handleMoveToStorage(item)}
              >
                <Ionicons name="move" size={18} color="#fff" />
                <Text style={styles.moveButtonText}>Move to Storage</Text>
              </TouchableOpacity>
            </View>
          );
          })
        )}
      </ScrollView>

      {/* Location Picker Modal */}
      <Modal visible={showLocationPicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.pickerModal}
          activeOpacity={1}
          onPress={() => setShowLocationPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.pickerTitle}>Select Storage Location</Text>

            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Room</Text>
              <View style={styles.roomOptions}>
                {ROOM_OPTIONS.map(room => (
                  <TouchableOpacity
                    key={room}
                    style={[styles.roomOption, selectedRoom === room && styles.roomOptionSelected]}
                    onPress={() => setSelectedRoom(room)}
                  >
                    <Text style={[styles.roomOptionText, selectedRoom === room && styles.roomOptionTextSelected]}>
                      {room}
                    </Text>
                    {selectedRoom === room && (
                      <Ionicons name="checkmark" size={18} color="#5dbea3" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Sublocation (optional)</Text>
              <TextInput
                style={styles.sublocationInput}
                value={sublocation}
                onChangeText={setSublocation}
                placeholder="e.g., Shelf A, Bin 3"
              />
            </View>

            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmMove}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirm Move</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowLocationPicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
          </TouchableOpacity>
        </TouchableOpacity>
      </Modal>

      {/* Rounding Modal */}
      <Modal
        visible={showRoundingModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowRoundingModal(false)}
      >
        <TouchableOpacity
          style={styles.pickerModal}
          activeOpacity={1}
          onPress={() => setShowRoundingModal(false)}
        >
          <TouchableOpacity
            style={styles.roundingModalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.pickerTitle}>Confirm Quantity</Text>
              <TouchableOpacity onPress={() => setShowRoundingModal(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedItem && (
              <>
                <Text style={styles.ingredientNameModal}>{selectedItem.ingredient}</Text>

                <View style={styles.qtyInfoRow}>
                  <Text style={styles.qtyInfoLabel}>Delivered: </Text>
                  <Text style={styles.qtyInfoValue}>{formatQty(selectedItem.quantity)} {selectedItem.unit}</Text>
                </View>

                <Text style={styles.sectionTitle}>Quick Round Off</Text>
                <View style={styles.roundingOptions}>
                  {getRoundingOptions(selectedItem.quantity).map((option) => (
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
                  <Text style={styles.customQtyUnit}>{selectedItem.unit}</Text>
                </View>

                <TouchableOpacity
                  style={styles.confirmButton}
                  onPress={proceedToLocationPicker}
                >
                  <Ionicons name="arrow-forward" size={20} color="#fff" />
                  <Text style={styles.confirmButtonText}>Continue to Location</Text>
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
  headerTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    textAlign: 'center',
  },
  refreshButton: {
    padding: 8,
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  searchIcon: {
    marginRight: 10,
  },
  searchInput: {
    flex: 1,
    fontSize: 16,
    color: '#333',
  },
  clearButton: {
    padding: 4,
  },
  content: {
    flex: 1,
    padding: 15,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
  },
  itemCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  itemHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 10,
  },
  categoryBadge: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  categoryText: {
    fontSize: 12,
    fontWeight: '600',
  },
  qtyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5dbea3',
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealUsageContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
    marginBottom: 12,
  },
  mealUsageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  mealUsageRow: {
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 6,
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  mealUsageRowWarning: {
    backgroundColor: '#ffebee',
    borderWidth: 1,
    borderColor: '#ef9a9a',
  },
  mealUsageLeft: {
    flex: 1,
  },
  mealUsageRight: {
    alignItems: 'flex-end',
  },
  mealUsageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  mealUsageDish: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  mealQtyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5dbea3',
    marginBottom: 4,
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 10,
  },
  statusBadgeWarning: {
    backgroundColor: '#ffebee',
  },
  statusBadgeOK: {
    backgroundColor: '#e8f5e9',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextWarning: {
    color: '#d32f2f',
  },
  statusTextOK: {
    color: '#388e3c',
  },
  stockAlertContainer: {
    marginTop: 10,
    marginBottom: 10,
  },
  stockAlertWarning: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#ef9a9a',
  },
  stockAlertOK: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
  },
  stockAlertTextWarning: {
    fontSize: 13,
    color: '#d32f2f',
    fontWeight: '600',
    marginLeft: 8,
    flex: 1,
  },
  stockAlertTextOK: {
    fontSize: 13,
    color: '#388e3c',
    fontWeight: '600',
    marginLeft: 8,
  },
  moveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5dbea3',
    padding: 12,
    borderRadius: 8,
  },
  moveButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  pickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerSection: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  roomOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roomOption: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  roomOptionSelected: {
    backgroundColor: '#5dbea3',
    borderColor: '#5dbea3',
  },
  roomOptionText: {
    color: '#333',
    fontWeight: '500',
  },
  roomOptionTextSelected: {
    color: '#fff',
  },
  sublocationInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5dbea3',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 20,
  },
  roundingModalContent: {
    backgroundColor: '#fff',
    borderRadius: 20,
    padding: 24,
    width: SCREEN_WIDTH * 0.9,
    maxWidth: 400,
    alignSelf: 'center',
    marginVertical: 40,
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
});

export default BhogaStorageMoveScreen;
