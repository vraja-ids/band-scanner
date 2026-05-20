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
import { useFocusEffect } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { bhogaSheetsService, StorageLocation, IngredientUsageRecord } from '../../services/BhogaSheetsService';
import Routes, { BhogaMealParams } from '../../routes';

const { width: SCREEN_WIDTH } = Dimensions.get('window');

type BhogaMealScreenNavigationProp = StackNavigationProp<any, typeof Routes.BhogaMeal>;
type BhogaMealScreenRouteProp = RouteProp<any, typeof Routes.BhogaMeal>;

interface Props {
  navigation: BhogaMealScreenNavigationProp;
  route: BhogaMealScreenRouteProp;
}

interface IngredientWithLocation {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  location?: StorageLocation;
  usageRecord?: IngredientUsageRecord;
}

interface MenuItemWithIngredients {
  name: string;
  ingredients: IngredientWithLocation[];
}

interface RoundingOption {
  qty: number;
  label?: string;
}

// Helper to format quantities to 2 decimal places
const formatQty = (qty: number): string => {
  if (Number.isInteger(qty)) return qty.toString();
  return qty.toFixed(2);
};

// Status types
type IngredientStatus = 'pending' | 'delivered' | 'usage_pending' | 'completed';

const BhogaMealScreen: FC<Props> = ({ navigation, route }) => {
  const { mealId, mealName, mealData } = route.params as BhogaMealParams;
  const [isLoading, setIsLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemWithIngredients[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [userId, setUserId] = useState<string>('');
  const [showModal, setShowModal] = useState(false);
  const [modalType, setModalType] = useState<'deliver' | 'usage' | 'return'>('deliver');
  const [selectedIngredient, setSelectedIngredient] = useState<IngredientWithLocation | null>(null);
  const [selectedMenuItem, setSelectedMenuItem] = useState<string>('');
  const [customQty, setCustomQty] = useState('0');
  const [usageRecords, setUsageRecords] = useState<Record<string, IngredientUsageRecord>>({});
  const [isInitialLoad, setIsInitialLoad] = useState(true);

  // Refresh data when screen comes into focus (after initial load)
  useFocusEffect(
    React.useCallback(() => {
      if (!isInitialLoad) {
        loadAllData();
      }
      return () => {};
    }, [isInitialLoad])
  );

  useEffect(() => {
    loadAllData();
    loadUserId();
    // Mark initial load complete after data loads
    setTimeout(() => setIsInitialLoad(false), 1000);
  }, []);

  const loadUserId = async () => {
    try {
      const id = await AsyncStorage.getItem('memberId');
      setUserId(id || '');
    } catch (error) {
      console.error('Error loading user ID:', error);
    }
  };

  const loadUsageRecords = async (): Promise<Record<string, IngredientUsageRecord>> => {
    try {
      const records = await bhogaSheetsService.getIngredientUsage(mealId);
      const recordMap: Record<string, IngredientUsageRecord> = {};
      records.forEach(record => {
        const key = `${record.menuItem}-${record.ingredient}`;
        recordMap[key] = record;
      });
      setUsageRecords(recordMap);
      return recordMap;
    } catch (error) {
      console.error('Error loading usage records:', error);
      return {};
    }
  };

  const loadAllData = async () => {
    try {
      setIsLoading(true);

      // Load usage records first
      const recordMap = await loadUsageRecords();

      // Then load locations and build menu items with usage records
      const locations = await bhogaSheetsService.getStorageLocations();
      setStorageLocations(locations);

      const locationMap = new Map(locations.map(l => [l.ingredientName, l]));

      const itemsWithLocations: MenuItemWithIngredients[] = Object.values(mealData.items).map((item: any) => ({
        name: item.name,
        ingredients: item.ingredients.map((ing: any) => {
          const key = `${item.name}-${ing.name}`;
          const usageRecord = recordMap[key];
          return {
            ...ing,
            location: locationMap.get(ing.name),
            usageRecord,
          };
        }),
      }));

      setMenuItems(itemsWithLocations);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  };

  const refreshData = async () => {
    // Re-fetch usage records and update menu items
    try {
      setIsLoading(true);
      const recordMap = await loadUsageRecords();

      const locationMap = new Map(storageLocations.map(l => [l.ingredientName, l]));

      const itemsWithLocations: MenuItemWithIngredients[] = Object.values(mealData.items).map((item: any) => ({
        name: item.name,
        ingredients: item.ingredients.map((ing: any) => {
          const key = `${item.name}-${ing.name}`;
          const usageRecord = recordMap[key];
          return {
            ...ing,
            location: locationMap.get(ing.name),
            usageRecord,
          };
        }),
      }));

      setMenuItems(itemsWithLocations);
    } catch (error) {
      console.error('Error refreshing data:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeliver = (ingredient: IngredientWithLocation, menuItem: string) => {
    setSelectedIngredient(ingredient);
    setSelectedMenuItem(menuItem);
    // If already delivered, default to adding the remaining planned amount
    const currentDelivered = ingredient.usageRecord?.deliveredQty || 0;
    const planned = ingredient.usageRecord?.plannedQty || ingredient.quantity;
    const remaining = Math.max(0, planned - currentDelivered);
    setCustomQty((remaining > 0 ? remaining : ingredient.quantity).toString());
    setModalType('deliver');
    setShowModal(true);
  };

  const handleMarkUsage = (ingredient: IngredientWithLocation, menuItem: string) => {
    setSelectedIngredient(ingredient);
    setSelectedMenuItem(menuItem);
    const deliveredQty = ingredient.usageRecord?.deliveredQty || 0;
    const usedQty = ingredient.usageRecord?.usedQty || 0;
    setCustomQty((usedQty || deliveredQty).toString());
    setModalType('usage');
    setShowModal(true);
  };

  const handleReturnLeftover = (ingredient: IngredientWithLocation, menuItem: string) => {
    setSelectedIngredient(ingredient);
    setSelectedMenuItem(menuItem);
    const usedQty = ingredient.usageRecord?.usedQty || 0;
    const deliveredQty = ingredient.usageRecord?.deliveredQty || ingredient.quantity;
    const returnedQty = deliveredQty - usedQty;
    setCustomQty(returnedQty.toString());
    setModalType('return');
    setShowModal(true);
  };

  const getRoundingOptions = (qty: number, plannedQty?: number): RoundingOption[] => {
    const options: RoundingOption[] = [];

    // Add "Planned" option first
    if (plannedQty && plannedQty > 0) {
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

  const confirmDelivery = async (additionalQty: number) => {
    if (!selectedIngredient) return;

    try {
      setShowModal(false);

      const currentDelivered = selectedIngredient.usageRecord?.deliveredQty || 0;
      const newDeliveredQty = currentDelivered + additionalQty;

      await bhogaSheetsService.recordIngredientDelivery({
        mealId,
        menuItem: selectedMenuItem,
        ingredient: selectedIngredient.name,
        plannedQty: selectedIngredient.usageRecord?.plannedQty || selectedIngredient.quantity,
        deliveredQty: newDeliveredQty,
        unit: selectedIngredient.unit,
        userId,
      });

      // Update storage location stock
      if (selectedIngredient.location) {
        const newStock = Math.max(0, selectedIngredient.location.currentStock - additionalQty);
        await bhogaSheetsService.updateStorageLocation(
          selectedIngredient.name,
          selectedIngredient.location.room,
          selectedIngredient.location.sublocation,
          newStock,
          selectedIngredient.location.unit
        );
      }

      await refreshData();

      Alert.alert('Success', `${selectedIngredient.name} sent to kitchen: +${formatQty(additionalQty)} ${selectedIngredient.unit} (Total: ${formatQty(newDeliveredQty)})`);
    } catch (error) {
      console.error('Error marking delivered:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to mark as delivered');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmUsage = async (usedQty: number) => {
    if (!selectedIngredient) return;

    try {
      setShowModal(false);

      const deliveredQty = selectedIngredient.usageRecord?.deliveredQty || 0;

      // Validate: cannot use more than delivered
      if (usedQty > deliveredQty) {
        Alert.alert(
          'Invalid Amount',
          `Cannot mark more than delivered. Maximum allowed: ${formatQty(deliveredQty)} ${selectedIngredient.unit}`
        );
        setShowModal(true); // Reopen modal
        return;
      }

      const returnedQty = Math.max(0, deliveredQty - usedQty);

      await bhogaSheetsService.recordIngredientUsage({
        mealId,
        menuItem: selectedMenuItem,
        ingredient: selectedIngredient.name,
        usedQty,
        returnedQty,
        unit: selectedIngredient.unit,
        userId,
      });

      await refreshData();

      Alert.alert('Success', `${selectedIngredient.name} usage recorded: ${formatQty(usedQty)} used, ${formatQty(returnedQty)} leftover`);
    } catch (error) {
      console.error('Error marking usage:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to mark usage');
    } finally {
      setIsLoading(false);
    }
  };

  const confirmReturn = async (returnedQty: number) => {
    if (!selectedIngredient) return;

    try {
      const deliveredQty = selectedIngredient.usageRecord?.deliveredQty || 0;
      const usedQty = selectedIngredient.usageRecord?.usedQty || 0;
      const remaining = deliveredQty - usedQty;

      // Validate: cannot return more than remaining
      if (returnedQty > remaining) {
        Alert.alert(
          'Invalid Amount',
          `Cannot return more than remaining. Maximum allowed: ${formatQty(remaining)} ${selectedIngredient.unit}`
        );
        setShowModal(true); // Reopen modal
        return;
      }

      setShowModal(false);

      const result = await bhogaSheetsService.returnUnusedIngredient({
        mealId,
        menuItem: selectedMenuItem,
        ingredient: selectedIngredient.name,
        returnedQty,
      });

      // Add returned quantity back to storage
      if (selectedIngredient.location) {
        const newStock = selectedIngredient.location.currentStock + returnedQty;
        await bhogaSheetsService.updateStorageLocation(
          selectedIngredient.name,
          selectedIngredient.location.room,
          selectedIngredient.location.sublocation,
          newStock,
          selectedIngredient.location.unit
        );
      }

      await refreshData();

      Alert.alert(
        'Success',
        `${selectedIngredient.name} returned: ${formatQty(returnedQty)} ${selectedIngredient.unit}\n\nEfficiency: ${Math.round((result.usedQty / result.deliveredQty) * 100)}%`
      );
    } catch (error) {
      console.error('Error returning ingredient:', error);
      Alert.alert('Error', error instanceof Error ? error.message : 'Failed to return ingredient');
    } finally {
      setIsLoading(false);
    }
  };

  const getIngredientStatus = (ingredient: IngredientWithLocation): IngredientStatus => {
    if (!ingredient.usageRecord) return 'pending';
    return ingredient.usageRecord.status;
  };

  const getStatusConfig = (status: IngredientStatus) => {
    switch (status) {
      case 'pending':
        return { color: '#FF9800', bg: '#FFF3E0', text: 'PENDING', icon: 'time-outline' as const };
      case 'delivered':
        return { color: '#4CAF50', bg: '#E8F5E9', text: 'DELIVERED', icon: 'arrow-forward-circle' as const };
      case 'usage_pending':
        return { color: '#2196F3', bg: '#E3F2FD', text: 'IN PROGRESS', icon: 'restaurant-outline' as const };
      case 'completed':
        return { color: '#9C27B0', bg: '#F3E5F5', text: 'COMPLETED', icon: 'checkmark-circle' as const };
    }
  };

  const renderActionButton = (ingredient: IngredientWithLocation, menuItem: string, status: IngredientStatus) => {
    switch (status) {
      case 'pending':
      case 'delivered':
      case 'usage_pending':
        const deliveredQty = ingredient.usageRecord?.deliveredQty || ingredient.quantity;
        const usedQty = ingredient.usageRecord?.usedQty || 0;
        const leftover = deliveredQty - usedQty;
        return (
          <View style={styles.actionButtonsContainer}>
            <TouchableOpacity
              style={styles.actionButton}
              onPress={() => handleDeliver(ingredient, menuItem)}
              disabled={isLoading}
            >
              <Ionicons name="arrow-forward-circle" size={20} color="#FF9800" />
              <Text style={styles.actionButtonText}>Deliver</Text>
            </TouchableOpacity>
            {status === 'usage_pending' ? (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleReturnLeftover(ingredient, menuItem)}
                disabled={isLoading}
              >
                <Ionicons name="arrow-undo-circle" size={20} color="#9C27B0" />
                <Text style={styles.actionButtonText}>Return {formatQty(leftover)}</Text>
              </TouchableOpacity>
            ) : (
              <TouchableOpacity
                style={styles.actionButton}
                onPress={() => handleMarkUsage(ingredient, menuItem)}
                disabled={isLoading}
              >
                <Ionicons name="restaurant-outline" size={20} color="#2196F3" />
                <Text style={styles.actionButtonText}>Mark Usage</Text>
              </TouchableOpacity>
            )}
          </View>
        );

      case 'completed':
        const efficiency = ingredient.usageRecord
          ? Math.round((ingredient.usageRecord.usedQty / ingredient.usageRecord.deliveredQty) * 100)
          : 100;
        return (
          <View style={styles.completedBadge}>
            <Text style={styles.completedText}>{efficiency}% used</Text>
          </View>
        );
    }
  };

  const getTotalIngredients = () => {
    return menuItems.reduce((sum, item) => sum + item.ingredients.length, 0);
  };

  const getCompletedCount = () => {
    return menuItems.reduce(
      (sum, item) => sum + item.ingredients.filter(ing => getIngredientStatus(ing) === 'completed').length,
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
              {getCompletedCount()} / {getTotalIngredients()} completed
            </Text>
          </View>
          <View style={{ width: 24 }} />
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        {menuItems.map((item, itemIndex) => (
          <View key={itemIndex} style={styles.menuItemCard}>
            <Text style={styles.menuItemTitle}>{item.name}</Text>
            {item.ingredients.map((ingredient, ingIndex) => {
              const status = getIngredientStatus(ingredient);
              const statusConfig = getStatusConfig(status);
              const usage = ingredient.usageRecord;

              return (
                <View key={ingIndex} style={[styles.ingredientRow, { borderLeftColor: statusConfig.color }]}>
                  <View style={styles.ingredientMain}>
                    <View style={styles.ingredientHeader}>
                      <View style={styles.statusBadgeWrapper}>
                        <Ionicons name={statusConfig.icon} size={16} color={statusConfig.color} />
                        <Text style={[styles.statusText, { color: statusConfig.color }]}>
                          {statusConfig.text}
                        </Text>
                      </View>
                      {usage && (
                        <Text style={styles.efficiencyText}>
                          {usage.plannedQty > 0 ? Math.round((usage.usedQty / usage.plannedQty) * 100) : 0}% of plan
                        </Text>
                      )}
                    </View>

                    <Text style={styles.ingredientName}>{ingredient.name}</Text>

                    <View style={styles.qtyRow}>
                      {usage ? (
                        <>
                          <View style={styles.qtyInfo}>
                            <Text style={styles.qtyLabel}>Planned:</Text>
                            <Text style={styles.qtyValue}>{formatQty(usage.plannedQty)} {ingredient.unit}</Text>
                          </View>
                          <View style={styles.qtyInfo}>
                            <Text style={styles.qtyLabel}>Sent:</Text>
                            <Text style={styles.qtyValue}>{formatQty(usage.deliveredQty)} {ingredient.unit}</Text>
                          </View>
                          {status !== 'delivered' && (
                            <View style={styles.qtyInfo}>
                              <Text style={styles.qtyLabel}>Used:</Text>
                              <Text style={styles.qtyValue}>{formatQty(usage.usedQty)} {ingredient.unit}</Text>
                            </View>
                          )}
                          {status === 'completed' && usage.returnedQty > 0 && (
                            <View style={styles.qtyInfo}>
                              <Text style={styles.qtyLabel}>Returned:</Text>
                              <Text style={[styles.qtyValue, { color: '#9C27B0' }]}>
                                {formatQty(usage.returnedQty)} {ingredient.unit}
                              </Text>
                            </View>
                          )}
                        </>
                      ) : (
                        <View style={styles.qtyInfo}>
                          <Text style={styles.qtyLabel}>Planned:</Text>
                          <Text style={styles.qtyValue}>{formatQty(ingredient.quantity)} {ingredient.unit}</Text>
                        </View>
                      )}
                    </View>

                    {ingredient.location && status === 'pending' && (
                      <View style={styles.locationInfo}>
                        <Ionicons name="location-outline" size={14} color="#666" />
                        <Text style={styles.locationText}>
                          From: {ingredient.location.room}
                          {ingredient.location.sublocation && ` → ${ingredient.location.sublocation}`}
                          {' ('}
                          {ingredient.location.currentStock} {ingredient.unit} available)
                        </Text>
                      </View>
                    )}
                  </View>

                  <View style={styles.actions}>
                    {renderActionButton(ingredient, item.name, status)}
                  </View>
                </View>
              );
            })}
          </View>
        ))}
      </ScrollView>

      {/* Modal */}
      <Modal visible={showModal} transparent animationType="slide">
        <TouchableOpacity
          style={styles.modalOverlay}
          activeOpacity={1}
          onPress={() => setShowModal(false)}
        >
          <TouchableOpacity
            style={styles.modalContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <View style={styles.modalHeader}>
              <Text style={styles.modalTitle}>
                {modalType === 'deliver' && 'Deliver to Kitchen'}
                {modalType === 'usage' && 'Mark Actual Usage'}
                {modalType === 'return' && 'Return Leftover'}
              </Text>
              <TouchableOpacity onPress={() => setShowModal(false)}>
                <Ionicons name="close" size={28} color="#666" />
              </TouchableOpacity>
            </View>

            {selectedIngredient && (
              <>
                <Text style={styles.ingredientNameModal}>{selectedIngredient.name}</Text>
                <Text style={styles.menuNameModal}>for {selectedMenuItem}</Text>

                {modalType === 'deliver' && (
                  <>
                    {selectedIngredient.usageRecord ? (
                      <View style={styles.qtyInfoRow}>
                        <Text style={styles.qtyInfoLabel}>Currently Delivered: </Text>
                        <Text style={[styles.qtyInfoValue, { color: '#4CAF50' }]}>
                          {formatQty(selectedIngredient.usageRecord.deliveredQty)} {selectedIngredient.unit}
                        </Text>
                      </View>
                    ) : (
                      <View style={styles.qtyInfoRow}>
                        <Text style={styles.qtyInfoLabel}>Planned: </Text>
                        <Text style={styles.qtyInfoValue}>{formatQty(selectedIngredient.quantity)} {selectedIngredient.unit}</Text>
                      </View>
                    )}

                    {selectedIngredient.location && (
                      <View style={styles.qtyInfoRow}>
                        <Ionicons name="location-outline" size={16} color="#666" />
                        <Text style={styles.qtyInfoValue}>
                          Available: {selectedIngredient.location.currentStock} {selectedIngredient.unit}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.sectionTitle}>Additional Amount to Send</Text>
                    <View style={styles.roundingOptions}>
                      {getRoundingOptions(
                        parseFloat(customQty),
                        selectedIngredient.usageRecord?.plannedQty || selectedIngredient.quantity
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
                  </>
                )}

                {modalType === 'usage' && (
                  <>
                    {selectedIngredient.usageRecord ? (
                      <>
                        <View style={styles.qtyInfoRow}>
                          <Text style={styles.qtyInfoLabel}>Planned: </Text>
                          <Text style={styles.qtyInfoValue}>{formatQty(selectedIngredient.usageRecord.plannedQty)} {selectedIngredient.unit}</Text>
                        </View>
                        <View style={styles.qtyInfoRow}>
                          <Text style={styles.qtyInfoLabel}>Delivered: </Text>
                          <Text style={[styles.qtyInfoValue, { color: '#4CAF50' }]}>
                            {formatQty(selectedIngredient.usageRecord.deliveredQty)} {selectedIngredient.unit}
                          </Text>
                        </View>
                      </>
                    ) : (
                      <View style={[styles.qtyInfoRow, styles.warningBanner]}>
                        <Ionicons name="warning" size={16} color="#FF9800" />
                        <Text style={[styles.qtyInfoValue, { color: '#FF9800', marginLeft: 8 }]}>
                          Not delivered yet (0 {selectedIngredient.unit})
                        </Text>
                      </View>
                    )}

                    <Text style={styles.sectionTitle}>Amount Actually Used</Text>
                    <View style={styles.roundingOptions}>
                      {getRoundingOptions(
                        parseFloat(customQty),
                        selectedIngredient.usageRecord?.plannedQty
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

                    {selectedIngredient.usageRecord && (
                      <View style={styles.calculationResult}>
                        <Text style={styles.calculationText}>
                          Leftover: {formatQty(selectedIngredient.usageRecord.deliveredQty - parseFloat(customQty) || 0)} {selectedIngredient.unit}
                        </Text>
                      </View>
                    )}

                    <Text style={styles.sectionTitle}>Or Enter Exact Amount</Text>
                  </>
                )}

                {modalType === 'return' && (
                  <>
                    {selectedIngredient.usageRecord && (
                      <>
                        <View style={styles.qtyInfoRow}>
                          <Text style={styles.qtyInfoLabel}>Sent: </Text>
                          <Text style={styles.qtyInfoValue}>{formatQty(selectedIngredient.usageRecord.deliveredQty)} {selectedIngredient.unit}</Text>
                        </View>
                        <View style={styles.qtyInfoRow}>
                          <Text style={styles.qtyInfoLabel}>Used: </Text>
                          <Text style={styles.qtyInfoValue}>{formatQty(selectedIngredient.usageRecord.usedQty)} {selectedIngredient.unit}</Text>
                        </View>
                        <View style={styles.qtyInfoRow}>
                          <Text style={styles.qtyInfoLabel}>Unaccounted: </Text>
                          <Text style={[styles.qtyInfoValue, { color: '#FF9800' }]}>
                            {formatQty(selectedIngredient.usageRecord.deliveredQty - selectedIngredient.usageRecord.usedQty)} {selectedIngredient.unit}
                          </Text>
                        </View>
                      </>
                    )}

                    <Text style={styles.sectionTitle}>Amount Returning to Storage</Text>
                    <View style={styles.roundingOptions}>
                      {getRoundingOptions(parseFloat(customQty)).map((option) => (
                        <TouchableOpacity
                          key={option.qty}
                          style={[
                            styles.roundingOption,
                            customQty === option.qty.toString() && styles.roundingOptionSelected,
                          ]}
                          onPress={() => setCustomQty(option.qty.toString())}
                        >
                          <Text style={[
                            styles.roundingOptionText,
                            customQty === option.qty.toString() && styles.roundingOptionTextSelected,
                          ]}>
                            {formatQty(option.qty)}
                          </Text>
                        </TouchableOpacity>
                      ))}
                    </View>

                    <Text style={styles.sectionTitle}>Or Enter Exact Amount</Text>
                  </>
                )}

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
                  onPress={() => {
                    const qty = parseFloat(customQty) || 0;
                    if (modalType === 'deliver') confirmDelivery(qty);
                    else if (modalType === 'usage') confirmUsage(qty);
                    else if (modalType === 'return') confirmReturn(qty);
                  }}
                >
                  <Ionicons name="checkmark-circle" size={20} color="#fff" />
                  <Text style={styles.confirmButtonText}>
                    {modalType === 'deliver' && 'Confirm Delivery'}
                    {modalType === 'usage' && 'Confirm Usage'}
                    {modalType === 'return' && 'Confirm Return'}
                  </Text>
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
    borderLeftWidth: 4,
  },
  ingredientMain: {
    flex: 1,
  },
  ingredientHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  statusBadgeWrapper: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  statusText: {
    fontSize: 12,
    fontWeight: 'bold',
    marginLeft: 4,
  },
  efficiencyText: {
    fontSize: 12,
    color: '#666',
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  qtyRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 12,
    marginBottom: 8,
  },
  qtyInfo: {
    flexDirection: 'row',
    alignItems: 'baseline',
  },
  qtyLabel: {
    fontSize: 13,
    color: '#666',
    marginRight: 4,
  },
  qtyValue: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
  },
  locationInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 4,
  },
  locationText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 4,
  },
  actions: {
    alignItems: 'flex-end',
    marginTop: 8,
  },
  actionButtonsContainer: {
    flexDirection: 'column',
    gap: 8,
  },
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  actionButtonText: {
    fontSize: 13,
    fontWeight: '600',
    marginLeft: 6,
  },
  completedBadge: {
    backgroundColor: '#F3E5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 12,
  },
  completedText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#9C27B0',
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
    marginBottom: 5,
    textAlign: 'center',
  },
  menuNameModal: {
    fontSize: 14,
    color: '#666',
    marginBottom: 15,
    textAlign: 'center',
  },
  qtyInfoRow: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  warningBanner: {
    backgroundColor: '#FFF3E0',
    padding: 10,
    borderRadius: 8,
  },
  qtyInfoLabel: {
    fontSize: 16,
    color: '#666',
  },
  qtyInfoValue: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
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
  calculationResult: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
    marginVertical: 12,
  },
  calculationText: {
    fontSize: 14,
    color: '#1976D2',
    fontWeight: '600',
    textAlign: 'center',
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
