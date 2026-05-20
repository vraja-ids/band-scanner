import React, { FC, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  TextInput,
  SafeAreaView,
  Modal,
  Dimensions,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { bhogaSheetsService, Ingredient, Delivery, OrderByStore } from '../../services/BhogaSheetsService';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type BhogaDeliveryScreenNavigationProp = StackNavigationProp<any, any>;

interface Props {
  navigation: BhogaDeliveryScreenNavigationProp;
}

interface IngredientWithDelivery extends Ingredient {
  deliveredQty: number;
  expectedQty: number;
  orderedQty: number;
  orders: OrderByStore[];
  expanded?: boolean;
}

interface RoundingOption {
  qty: number;
  label?: string; // 'Expected' | 'Ordered' | undefined for regular rounding options
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

const BhogaDeliveryScreen: FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [ingredients, setIngredients] = useState<IngredientWithDelivery[]>([]);
  const [existingDeliveries, setExistingDeliveries] = useState<Delivery[]>([]);
  const [ordersByStore, setOrdersByStore] = useState<OrderByStore[]>([]);
  const [allStores, setAllStores] = useState<string[]>([]);
  const [selectedStoreFilter, setSelectedStoreFilter] = useState<string>('All');
  const [showStoreFilter, setShowStoreFilter] = useState(false);
  const [showRoundingModal, setShowRoundingModal] = useState(false);
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientWithDelivery | null>(null);
  const [customQty, setCustomQty] = useState('0');
  const [searchQuery, setSearchQuery] = useState('');
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ingredientData, deliveries, orders] = await Promise.all([
        bhogaSheetsService.getIngredientList(),
        bhogaSheetsService.getDeliveries(),
        bhogaSheetsService.getOrdersByStore(),
      ]);

      setExistingDeliveries(deliveries);
      setOrdersByStore(orders);

      // Get unique stores
      const stores = ['All', ...Array.from(new Set(orders.map(o => o.store)))].sort();
      setAllStores(stores);

      // Group orders by ingredient
      const ordersByIngredient = new Map<string, OrderByStore[]>();
      orders.forEach(order => {
        if (!ordersByIngredient.has(order.ingredient)) {
          ordersByIngredient.set(order.ingredient, []);
        }
        ordersByIngredient.get(order.ingredient)!.push(order);
      });

      // Combine ingredients with their delivery status and orders
      const itemsWithDelivery: IngredientWithDelivery[] = ingredientData.ingredients.map(ing => {
        const delivery = deliveries.find(d => d.ingredient === ing.name);
        const ingOrders = ordersByIngredient.get(ing.name) || [];
        const totalOrdered = ingOrders.reduce((sum, o) => sum + o.quantity, 0);

        return {
          ...ing,
          deliveredQty: delivery?.deliveredQty || 0,
          expectedQty: ing.totalPlanned,
          orderedQty: totalOrdered,
          orders: ingOrders.sort((a, b) => a.store.localeCompare(b.store)),
        };
      }).sort((a, b) => a.name.localeCompare(b.name));

      setIngredients(itemsWithDelivery);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleItemExpanded = (itemName: string) => {
    setExpandedItems(prev => {
      const next = new Set(prev);
      if (next.has(itemName)) {
        next.delete(itemName);
      } else {
        next.add(itemName);
      }
      return next;
    });
  };

  const handleDeliveryChange = (ingredientName: string, newQty: number) => {
    setIngredients(prev => prev.map(ing =>
      ing.name === ingredientName ? { ...ing, deliveredQty: newQty } : ing
    ));
  };

  const handleSaveDelivery = async (ingredientName: string, category: string, deliveredQty: number, expectedQty: number, unit: string) => {
    try {
      await bhogaSheetsService.recordDelivery({
        ingredient: ingredientName,
        category,
        expectedQty,
        deliveredQty,
        unit,
      });

      // Update local state
      setIngredients(prev => prev.map(ing =>
        ing.name === ingredientName ? { ...ing, deliveredQty } : ing
      ));

      Alert.alert('Success', `${ingredientName} delivery recorded`);
      await loadData(); // Refresh to get latest state
    } catch (error) {
      Alert.alert('Error', 'Failed to save delivery');
    }
  };

  const openRoundingModal = (ingredient: IngredientWithDelivery) => {
    setSelectedIngredient(ingredient);
    setCustomQty(ingredient.deliveredQty.toString());
    setShowRoundingModal(true);
  };

  const getRoundingOptions = (deliveredQty: number, expectedQty: number, orderedQty: number): RoundingOption[] => {
    const options: RoundingOption[] = [];

    // Add "Expected" option first
    if (expectedQty > 0) {
      options.push({ qty: expectedQty, label: 'Expected' });
    }

    // Add "Ordered" option second (if different from expected)
    if (orderedQty > 0 && orderedQty !== expectedQty) {
      options.push({ qty: orderedQty, label: 'Ordered' });
    }

    // Use expectedQty as base when deliveredQty is 0 or very small
    const baseQty = deliveredQty > 0 ? deliveredQty : expectedQty;

    // Round to nearest whole number
    const rounded = Math.round(baseQty);
    options.push({ qty: rounded });

    // Round down and up
    const floor = Math.floor(baseQty);
    const ceil = Math.ceil(baseQty);
    if (floor !== rounded) options.push({ qty: floor });
    if (ceil !== rounded && ceil !== floor) options.push({ qty: ceil });

    // Nearest 5
    const nearest5Down = Math.floor(baseQty / 5) * 5;
    const nearest5Up = Math.ceil(baseQty / 5) * 5;
    if (nearest5Down > 0 && !options.some(o => o.qty === nearest5Down)) options.push({ qty: nearest5Down });
    if (!options.some(o => o.qty === nearest5Up)) options.push({ qty: nearest5Up });
    if (!options.some(o => o.qty === nearest5Up + 5)) options.push({ qty: nearest5Up + 5 });

    // Nearest 10
    const nearest10Down = Math.floor(baseQty / 10) * 10;
    const nearest10Up = Math.ceil(baseQty / 10) * 10;
    if (nearest10Down > 0 && !options.some(o => o.qty === nearest10Down)) options.push({ qty: nearest10Down });
    if (!options.some(o => o.qty === nearest10Up)) options.push({ qty: nearest10Up });
    if (!options.some(o => o.qty === nearest10Up + 10)) options.push({ qty: nearest10Up + 10 });

    // Filter duplicates, sort by closeness to base, limit to 8 total
    const uniqueOptions = options.filter((opt, index, self) =>
      index === self.findIndex(o => o.qty === opt.qty)
    );

    return uniqueOptions
      .sort((a, b) => {
        // Keep labeled options (Expected, Ordered) at the front
        if (a.label && !b.label) return -1;
        if (!a.label && b.label) return 1;
        // Then sort by closeness to base
        return Math.abs(a.qty - baseQty) - Math.abs(b.qty - baseQty);
      })
      .slice(0, 8);
  };

  const confirmDelivery = async (qty: number) => {
    if (!selectedIngredient) return;

    try {
      await bhogaSheetsService.recordDelivery({
        ingredient: selectedIngredient.name,
        category: selectedIngredient.category,
        expectedQty: selectedIngredient.expectedQty,
        deliveredQty: qty,
        unit: selectedIngredient.unit,
      });

      setShowRoundingModal(false);
      Alert.alert('Success', `${selectedIngredient.name} delivery recorded: ${qty} ${selectedIngredient.unit}`);
      await loadData();
    } catch (error) {
      Alert.alert('Error', 'Failed to save delivery');
    }
  };

  const getFilteredIngredients = () => {
    let filtered = ingredients;

    // Filter by store
    if (selectedStoreFilter !== 'All') {
      filtered = filtered.filter(ing =>
        ing.orders.some(o => o.store === selectedStoreFilter)
      );
    }

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(ing =>
        ing.name.toLowerCase().includes(query)
      );
    }

    return filtered;
  };

  const getStoreOrdersSummary = (ingredient: IngredientWithDelivery) => {
    if (selectedStoreFilter === 'All') {
      // Show all stores that ordered this ingredient
      return ingredient.orders.map(o => `${o.store}: ${formatQty(o.quantity)} ${o.units}${o.cases ? ` (${o.cases} cases)` : ''}`).join('\n');
    } else {
      // Show only the selected store's order
      const storeOrder = ingredient.orders.find(o => o.store === selectedStoreFilter);
      return storeOrder ? `${formatQty(storeOrder.quantity)} ${storeOrder.units}${storeOrder.cases ? ` (${storeOrder.cases} cases)` : ''}` : '';
    }
  };

  const getOrderedQtyForFilter = (ingredient: IngredientWithDelivery) => {
    if (selectedStoreFilter === 'All') {
      return ingredient.orderedQty;
    }
    const storeOrder = ingredient.orders.find(o => o.store === selectedStoreFilter);
    return storeOrder ? storeOrder.quantity : 0;
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

  const getStatusIcon = (ing: IngredientWithDelivery) => {
    if (ing.deliveredQty === 0) return null;
    if (ing.deliveredQty >= ing.expectedQty) {
      return <Ionicons name="checkmark-circle" size={20} color="#4CAF50" />;
    }
    return <Ionicons name="alert-circle" size={20} color="#FF9800" />;
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
          <Text style={styles.headerTitle}>Delivery</Text>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={24} color="#5dbea3" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      {/* Store Filter */}
      <View style={styles.storeFilterContainer}>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.storeFilterScroll}>
          {allStores.map(store => (
            <TouchableOpacity
              key={store}
              style={[
                styles.storeFilterChip,
                selectedStoreFilter === store && styles.storeFilterChipSelected,
              ]}
              onPress={() => setSelectedStoreFilter(store)}
            >
              <Text style={[
                styles.storeFilterChipText,
                selectedStoreFilter === store && styles.storeFilterChipTextSelected,
              ]}>
                {store}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={20} color="#999" style={styles.searchIcon} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search ingredients..."
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
        {getFilteredIngredients().length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="search-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No ingredients found</Text>
            <Text style={styles.emptyStateSubtext}>
              {searchQuery ? 'Try a different search term' : 'No ingredients available'}
            </Text>
          </View>
        ) : (
          getFilteredIngredients().map((item) => {
            const isExpanded = expandedItems.has(item.name);
            return (
            <View key={item.name} style={styles.itemCard}>
            <TouchableOpacity onPress={() => toggleItemExpanded(item.name)} activeOpacity={0.7}>
            <View style={styles.itemHeader}>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
                  {item.category}
                </Text>
              </View>
              <View style={styles.headerRight}>
                {getStatusIcon(item)}
                <Ionicons name={expandedItems.has(item.name) ? "chevron-up" : "chevron-down"} size={20} color="#666" style={{ marginLeft: 8 }} />
              </View>
            </View>

            <Text style={styles.ingredientName}>{item.name}</Text>

            {/* Store Orders Info */}
            {item.orders.length > 0 && (
              <View style={styles.ordersInfoContainer}>
                <Text style={styles.ordersInfoLabel}>
                  {selectedStoreFilter === 'All' ? 'Ordered by Store:' : `Ordered from ${selectedStoreFilter}:`}
                </Text>
                <Text style={styles.ordersInfoText}>{getStoreOrdersSummary(item)}</Text>
              </View>
            )}

            <View style={styles.qtyRow}>
              <View style={styles.qtyColumn}>
                <Text style={styles.qtyLabel}>Expected</Text>
                <Text style={styles.qtyValue}>{formatQty(item.expectedQty)} {item.unit}</Text>
              </View>

              <View style={styles.qtyColumn}>
                <Text style={styles.qtyLabel}>Ordered</Text>
                <Text style={styles.qtyValueOrdered}>{formatQty(getOrderedQtyForFilter(item))} {item.unit}</Text>
              </View>

              <View style={styles.qtyColumn}>
                <Text style={styles.qtyLabel}>Delivered</Text>
                <TextInput
                  style={styles.qtyInput}
                  value={item.deliveredQty.toString()}
                  onChangeText={(text) => handleDeliveryChange(item.name, parseFloat(text) || 0)}
                  keyboardType="numeric"
                  selectTextOnFocus
                />
                <Text style={styles.qtyUnit}>{item.unit}</Text>
              </View>
            </View>
            </TouchableOpacity>

            {isExpanded && (
              <View style={styles.mealUsageContainer}>
                <Text style={styles.mealUsageTitle}>Used in these meals:</Text>
                {item.meals.map((meal, index) => {
                  const isPending = meal.status === 'pending';
                  return (
                    <View key={index} style={styles.mealUsageRow}>
                      <Text style={styles.mealUsageName}>{formatMealName(meal.mealId)}</Text>
                      <Text style={styles.mealUsageDish}>for {meal.menuItem}</Text>
                      <View style={styles.mealUsageQty}>
                        <Text style={styles.mealQtyText}>{formatQty(meal.plannedQuantity)} {item.unit}</Text>
                        {isPending && (
                          <View style={styles.pendingMiniBadge}>
                            <Text style={styles.pendingMiniText}>pending</Text>
                          </View>
                        )}
                      </View>
                    </View>
                  );
                })}
                {item.meals.length === 0 && (
                  <Text style={styles.noMealsText}>No meal usage data</Text>
                )}
              </View>
            )}

            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => openRoundingModal(item)}
            >
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveButtonText}>Mark as Delivered</Text>
            </TouchableOpacity>
          </View>
        );
          })
      )}
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
              <Text style={styles.modalTitle}>Confirm Delivery</Text>
              <TouchableOpacity onPress={() => setShowRoundingModal(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedIngredient && (
              <>
                <Text style={styles.ingredientNameModal}>{selectedIngredient.name}</Text>

                <View style={styles.qtyInfoRow}>
                  <Text style={styles.qtyInfoLabel}>Expected: </Text>
                  <Text style={styles.qtyInfoValue}>{formatQty(selectedIngredient.expectedQty)} {selectedIngredient.unit}</Text>
                </View>

                {selectedIngredient.orderedQty > 0 && (
                  <View style={styles.qtyInfoRow}>
                    <Text style={styles.qtyInfoLabel}>Ordered: </Text>
                    <Text style={[styles.qtyInfoValue, { color: '#FF9800' }]}>
                      {formatQty(getOrderedQtyForFilter(selectedIngredient))} {selectedIngredient.unit}
                    </Text>
                  </View>
                )}

                <View style={styles.qtyInfoRow}>
                  <Text style={styles.qtyInfoLabel}>Entered: </Text>
                  <Text style={styles.qtyInfoValue}>{formatQty(selectedIngredient.deliveredQty)} {selectedIngredient.unit}</Text>
                </View>

                <Text style={styles.sectionTitle}>Quick Round Off</Text>
                <View style={styles.roundingOptions}>
                  {getRoundingOptions(
                    selectedIngredient.deliveredQty,
                    selectedIngredient.expectedQty,
                    getOrderedQtyForFilter(selectedIngredient)
                  ).map((option) => (
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
  content: {
    flex: 1,
    padding: 15,
  },
  storeFilterContainer: {
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  storeFilterScroll: {
    flexDirection: 'row',
  },
  storeFilterChip: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#f5f5f5',
    marginRight: 10,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  storeFilterChipSelected: {
    backgroundColor: '#5dbea3',
    borderColor: '#5dbea3',
  },
  storeFilterChipText: {
    fontSize: 14,
    fontWeight: '500',
    color: '#666',
  },
  storeFilterChipTextSelected: {
    color: '#fff',
    fontWeight: '600',
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
  ingredientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  ordersInfoContainer: {
    backgroundColor: '#f8f9fa',
    borderRadius: 8,
    padding: 10,
    marginBottom: 15,
  },
  ordersInfoLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 4,
  },
  ordersInfoText: {
    fontSize: 13,
    color: '#333',
    lineHeight: 18,
  },
  qtyRow: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 15,
  },
  qtyColumn: {
    alignItems: 'center',
  },
  qtyLabel: {
    fontSize: 12,
    color: '#666',
    marginBottom: 5,
  },
  qtyValue: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  qtyValueOrdered: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#FF9800',
  },
  qtyInput: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#5dbea3',
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 8,
    width: 80,
    textAlign: 'center',
  },
  qtyUnit: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  saveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5dbea3',
    padding: 12,
    borderRadius: 8,
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
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
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealUsageContainer: {
    backgroundColor: '#f9f9f9',
    borderRadius: 10,
    padding: 12,
    marginTop: 12,
  },
  mealUsageTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  mealUsageRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 6,
  },
  mealUsageName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    flex: 1,
  },
  mealUsageDish: {
    fontSize: 12,
    color: '#666',
    marginRight: 10,
  },
  mealUsageQty: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  mealQtyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5dbea3',
    marginRight: 8,
  },
  pendingMiniBadge: {
    backgroundColor: '#fff3e0',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  pendingMiniText: {
    fontSize: 10,
    fontWeight: '600',
    color: '#e65100',
  },
  noMealsText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 10,
  },
});

export default BhogaDeliveryScreen;
