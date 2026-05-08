/**
 * Prasadam Dashboard Screen
 * Unified landscape dashboard for multi-team prasadam tracking
 */

import React, { useState, useEffect, useCallback, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Dimensions,
  StatusBar,
  Alert,
  ActivityIndicator,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect, useRoute, useNavigation } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { getAuthToken, getString } from '../../storage/Session';
import {
  getDashboardSummary,
  updateLocationInventory,
  getMeals,
  updateMenuItem,
} from '../../services/PrasadamSheetsService';
import { QuantityMovePopup } from './components/QuantityMovePopup';
import { QuantityMoveReversePopup } from './components/QuantityMoveReversePopup';
import { MealSelectionModal } from './components/MealSelectionModal';
import {
  DashboardItem,
  DashboardStage,
  TeamView,
  TEAM_VIEW_CONFIGS,
  STAGE_DISPLAY_NAMES,
  MOVEMENT_RULES,
} from './types/dashboard.types';
import { PowerBall } from './components/PowerBall';
import AsyncStorage from '@react-native-async-storage/async-storage';
import type { MenuItem, LocationInventoryItem, Meal } from '../../services/PrasadamSheetsService';

const { width, height } = Dimensions.get('window');
const IS_LANDSCAPE = width > height;

const AUTO_REFRESH_INTERVAL = 5000; // 5 seconds

// Map location names to stages
function locationToStage(location: string): DashboardStage {
  const map: Record<string, DashboardStage> = {
    'kitchen': 'cooked',
    'staging': 'staging',
    'refill_1': 'refill_station_1',
    'refill_2': 'refill_station_2',
    'refill_3': 'refill_station_3',
    'served': 'served',
    'left_over': 'left_over',
  };
  return map[location.toLowerCase()] || 'cooked';
}

function stageToLocation(stage: DashboardStage): string | null {
  // Map stages to location names that the Google Apps Script backend expects
  // The backend uses capitalized names as keys in getLocationColumnIndex
  const map: Record<DashboardStage, string | null> = {
    'planned': null, // Uses MenuItem.planned_trays
    'cooked': null, // Uses MenuItem.ready_trays
    'distributed': null, // Calculated field, not stored in backend
    'stored': 'Kitchen', // Uses LocationInventoryItem.kitchen
    'staging': 'Staging', // Uses LocationInventoryItem.staging
    'refill_station_1': 'Refill 1', // Uses LocationInventoryItem.refill_1
    'refill_station_2': 'Refill 2', // Uses LocationInventoryItem.refill_2
    'refill_station_3': 'Refill 3', // Uses LocationInventoryItem.refill_3
    'served': 'Served', // Uses LocationInventoryItem.served
    'left_over': 'Left Over', // Uses LocationInventoryItem.left_over
  };
  return map[stage];
}

// Convert menu items and inventory to dashboard items
function buildDashboardItems(
  menuItems: MenuItem[],
  inventory: LocationInventoryItem[]
): DashboardItem[] {
  const items: DashboardItem[] = [];

  for (const menuItem of menuItems) {
    // Find matching inventory record
    const invRecord = inventory.find(inv => inv.item_id === menuItem.item_id);

    const stored = invRecord?.kitchen || 0;
    const staging = invRecord?.staging || 0;
    const refill1 = invRecord?.refill_1 || 0;
    const refill2 = invRecord?.refill_2 || 0;
    const refill3 = invRecord?.refill_3 || 0;
    const served = invRecord?.served || 0;
    const leftOver = invRecord?.left_over || 0;
    const cooked = menuItem.ready_trays;

    // Distributed = Cooked - Served (Buffet Lanes only)
    // Trays in Stored/Staging/Refill Stations are not yet "distributed"
    // They will later move to Buffet Lanes (Served) or Left Over
    const distributed = Math.max(0, cooked - served);

    items.push({
      item_id: menuItem.item_id,
      name: menuItem.name,
      low_qty_threshold: 10,
      planned_qty: menuItem.planned_trays,
      cooked_qty: cooked,
      distributed_qty: distributed,
      stored_qty: stored,
      staging_qty: staging,
      refill_station_1_qty: refill1,
      refill_station_2_qty: refill2,
      refill_station_3_qty: refill3,
      served_qty: served,
      left_over_qty: leftOver,
    });
  }

  return items;
}

// Get quantity for a stage from dashboard item
function getStageQuantity(item: DashboardItem, stage: DashboardStage): number {
  const qtyMap: Record<DashboardStage, keyof DashboardItem> = {
    planned: 'planned_qty',
    cooked: 'cooked_qty',
    distributed: 'distributed_qty',
    stored: 'stored_qty',
    staging: 'staging_qty',
    refill_station_1: 'refill_station_1_qty',
    refill_station_2: 'refill_station_2_qty',
    refill_station_3: 'refill_station_3_qty',
    served: 'served_qty',
    left_over: 'left_over_qty',
  };
  return (item[qtyMap[stage]] as number) || 0;
}

function PrasadamDashboardScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  // Get mealId from route params reactively
  const mealId = (route.params as any)?.mealId as string || '';
  const initialMealName = (route.params as any)?.mealName as string || '';

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<DashboardItem | null>(null);
  const [selectedStage, setSelectedStage] = useState<DashboardStage | null>(null);
  const [showMovePopup, setShowMovePopup] = useState(false);
  const [showReversePopup, setShowReversePopup] = useState(false);
  const [teamView, setTeamView] = useState<TeamView>('all');
  const [isPortrait, setIsPortrait] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [mealName, setMealName] = useState(initialMealName);
  const [availableMeals, setAvailableMeals] = useState<Meal[]>([]);
  const [showMealModal, setShowMealModal] = useState(false);
  const [isLoadingMeals, setIsLoadingMeals] = useState(false);
  const [eventId, setEventId] = useState<string | null>(null);
  const [inventoryWarnings, setInventoryWarnings] = useState<string[]>([]);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Load user ID
  useEffect(() => {
    getAuthToken().then(setUserId);
  }, []);

  // Load event ID and available meals
  useEffect(() => {
    const loadEventData = async () => {
      try {
        const evId = await getString('selectedEventId');
        if (evId) {
          setEventId(evId);
          // Load available meals for switching
          const meals = await getMeals(evId);
          setAvailableMeals(meals || []);
        }
      } catch (error) {
        console.error('Failed to load event data:', error);
      }
    };
    loadEventData();
  }, []);

  // Lock to landscape on mount, unlock on unmount
  useEffect(() => {
    ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, []);

  // Check orientation - more reliable detection
  useEffect(() => {
    const checkOrientation = () => {
      const { width, height } = Dimensions.get('window');
      const portrait = width < height;
      setIsPortrait(portrait);
      console.log('Orientation check:', { width, height, portrait });
    };

    checkOrientation();
    const subscription = Dimensions.addEventListener('change', () => {
      checkOrientation();
    });

    return () => subscription?.remove();
  }, []);

  // Load dashboard data
  const loadData = useCallback(async (isBackground = false) => {
    if (!mealId) {
      console.warn('No mealId provided, skipping load');
      if (!isBackground) {
        setIsLoading(false);
        setLoadError('No meal ID provided');
      }
      return;
    }

    if (isBackground) {
      setIsRefreshing(true);
    } else {
      setIsLoading(true);
      setLoadError(null);
    }

    try {
      console.log('Loading dashboard data for mealId:', mealId);
      const data = await getDashboardSummary(mealId, isBackground);
      console.log('Dashboard data received:', data);

      if (data) {
        const dashboardItems = buildDashboardItems(data.menu, data.inventory);
        console.log('Dashboard items built:', dashboardItems.length);
        setItems(dashboardItems);

        // Check for inventory warnings (tracked inventory > cooked)
        // Warning when (Stored + Staging + Refill Stations + Served) > Cooked
        const warnings: string[] = [];
        for (const item of dashboardItems) {
          const trackedInventory = item.stored_qty + item.staging_qty +
            item.refill_station_1_qty + item.refill_station_2_qty +
            item.refill_station_3_qty + item.served_qty;
          if (trackedInventory > item.cooked_qty) {
            warnings.push(`${item.name}: ${trackedInventory} tracked vs ${item.cooked_qty} cooked (excess: ${trackedInventory - item.cooked_qty})`);
          }
        }
        setInventoryWarnings(warnings);
      } else {
        console.warn('No data returned from getDashboardSummary');
        setLoadError('No data available for this meal');
      }
    } catch (error) {
      console.error('Failed to load dashboard data:', error);
      setLoadError(error instanceof Error ? error.message : 'Failed to load dashboard data');
      if (!isBackground) {
        Alert.alert('Error', 'Failed to load dashboard data');
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [mealId]);

  // Initial load and auto-refresh
  useEffect(() => {
    loadData();

    // Set up auto-refresh
    refreshTimerRef.current = setInterval(() => {
      loadData(true);
    }, AUTO_REFRESH_INTERVAL);

    return () => {
      if (refreshTimerRef.current) {
        clearInterval(refreshTimerRef.current);
      }
    };
  }, [loadData]);

  // Refresh on screen focus
  useFocusEffect(
    useCallback(() => {
      loadData();
    }, [loadData])
  );

  // Handle tap on quantity cell
  const handleCellTap = useCallback(
    (item: DashboardItem, stage: DashboardStage) => {
      const qty = getStageQuantity(item, stage);
      if (qty <= 0) return;

      const validDestinations = MOVEMENT_RULES[stage];
      if (validDestinations.length === 0) return;

      setSelectedItem(item);
      setSelectedStage(stage);
      setShowMovePopup(true);
    },
    []
  );

  // Handle move with proper stage-specific logic
  const handleMove = useCallback(
    async (quantity: number, toStage: DashboardStage) => {
      if (!selectedItem || !selectedStage || !userId) return;

      try {
        console.log('[MOVE] Moving quantity:', {
          item: selectedItem.name,
          itemId: selectedItem.item_id,
          from: selectedStage,
          to: toStage,
          quantity,
        });

        // Case 1: Planned -> Cooked (only updates MenuItem.ready_trays, planned_trays is static)
        if (selectedStage === 'planned' && toStage === 'cooked') {
          console.log('[MOVE] Case 1: Planned -> Cooked, only updating ready_trays');
          const success = await updateMenuItem({
            itemId: selectedItem.item_id,
            updates: {
              // planned_trays is static reference, don't update it
              ready_trays: selectedItem.cooked_qty + quantity,
            },
          });
          console.log('[MOVE] updateMenuItem result:', success);
          if (!success) throw new Error('Failed to update tray count');
        }
        // Case 2: Cooked -> Stored (moves to kitchen storage, does NOT reduce ready_trays)
        // ready_trays tracks TOTAL cooked (cumulative), should never decrease
        else if (selectedStage === 'cooked' && toStage === 'stored') {
          console.log('[MOVE] Case 2: Cooked -> Stored (Team 1: to Kitchen Storage)');
          // Only add to kitchen location, don't reduce ready_trays (it's cumulative)
          const success = await updateLocationInventory({
            mealId,
            itemId: selectedItem.item_id,
            location: 'Kitchen',
            quantity,
            operation: 'add',
          });
          console.log('[MOVE] updateLocationInventory (Kitchen) result:', success);
          if (!success) throw new Error('Failed to update inventory');
        }
        // Case 3: Location inventory movements (stored -> staging -> refill stations -> served -> left_over)
        else {
          const fromLocation = stageToLocation(selectedStage);
          const toLocation = stageToLocation(toStage);

          console.log('[MOVE] Case 3: Location inventory movement', { fromLocation, toLocation });

          if (!fromLocation || !toLocation) {
            Alert.alert('Error', 'Invalid stage mapping');
            return;
          }

          // Subtract from source
          const success1 = await updateLocationInventory({
            mealId,
            itemId: selectedItem.item_id,
            location: fromLocation,
            quantity,
            operation: 'subtract',
          });
          console.log('[MOVE] updateLocationInventory (subtract) result:', success1);

          // Add to destination
          const success2 = await updateLocationInventory({
            mealId,
            itemId: selectedItem.item_id,
            location: toLocation,
            quantity,
            operation: 'add',
          });
          console.log('[MOVE] updateLocationInventory (add) result:', success2);

          if (!success1 || !success2) throw new Error('Failed to move trays');
        }

        // Refresh data
        await loadData();
        setShowMovePopup(false);
      } catch (error) {
        console.error('Failed to move quantity:', error);
        Alert.alert('Error', `Failed to move trays: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [selectedItem, selectedStage, userId, mealId, loadData]
  );

  // Handle long press on quantity cell - show reverse popup
  const handleCellLongPress = useCallback(
    (item: DashboardItem, stage: DashboardStage) => {
      const qty = getStageQuantity(item, stage);
      if (qty <= 0) return;

      setSelectedItem(item);
      setSelectedStage(stage);
      setShowReversePopup(true);
    },
    []
  );

  // Handle reverse move (corrections) - Cooked is cumulative so reverses work differently
  const handleReverseMove = useCallback(
    async (quantity: number, toStage: DashboardStage) => {
      if (!selectedItem || !selectedStage || !userId) return;

      try {
        // Case 1: Cooked -> Planned (correction - reduce ready_trays if over-reported)
        if (selectedStage === 'cooked' && toStage === 'planned') {
          console.log('[REVERSE] Case 1: Cooked correction, reducing ready_trays');
          const success = await updateMenuItem({
            itemId: selectedItem.item_id,
            updates: {
              // Reduce ready_trays for over-reporting correction
              ready_trays: Math.max(0, selectedItem.cooked_qty - quantity),
            },
          });
          if (!success) throw new Error('Failed to update tray count');
        }
        // Case 2: All other reverses are location inventory movements
        else {
          const fromLocation = stageToLocation(selectedStage);
          const toLocation = stageToLocation(toStage);

          console.log('[REVERSE] Location inventory movement', { fromLocation, toLocation });

          if (!fromLocation || !toLocation) {
            Alert.alert('Error', 'Invalid stage mapping');
            return;
          }

          // Subtract from source
          const success1 = await updateLocationInventory({
            mealId,
            itemId: selectedItem.item_id,
            location: fromLocation,
            quantity,
            operation: 'subtract',
          });

          // Add to destination (left_over or previous stage)
          const success2 = await updateLocationInventory({
            mealId,
            itemId: selectedItem.item_id,
            location: toLocation,
            quantity,
            operation: 'add',
          });

          if (!success1 || !success2) throw new Error('Failed to move trays');
        }

        // Refresh data
        await loadData();
        setShowReversePopup(false);
      } catch (error) {
        console.error('Failed to reverse move:', error);
        Alert.alert('Error', `Failed to move trays: ${error instanceof Error ? error.message : 'Unknown error'}`);
      }
    },
    [selectedItem, selectedStage, userId, mealId, loadData]
  );

  // Open meal switcher
  const handleOpenMealSwitcher = useCallback(async () => {
    if (!eventId) {
      Alert.alert('Error', 'No event selected');
      return;
    }
    setIsLoadingMeals(true);
    try {
      const meals = await getMeals(eventId);
      setAvailableMeals(meals || []);
      setShowMealModal(true);
    } catch (error) {
      Alert.alert('Error', 'Failed to load meals');
    } finally {
      setIsLoadingMeals(false);
    }
  }, [eventId]);

  // Handle meal switch
  const handleMealSwitch = useCallback(async (meal: Meal) => {
    setShowMealModal(false);

    // Store the selected meal for this event
    const mealName = meal.meal_name || meal.meal_type || 'Meal';
    if (eventId) {
      await AsyncStorage.setItem(`lastMealId_${eventId}`, meal.meal_id);
      await AsyncStorage.setItem(`lastMealName_${eventId}`, mealName);
    }

    // Reset data and reload with new meal
    setItems([]);
    setMealName(mealName);
    // Update route params
    (navigation as any).setParams({
      mealId: meal.meal_id,
      mealName,
    });
    // Reload data will happen automatically due to mealId change in route
  }, [navigation, eventId]);

  // Get current stages based on team view
  const visibleStages = TEAM_VIEW_CONFIGS[teamView].stages;

  // Calculate dynamic column width based on number of visible stages
  const numColumns = visibleStages.length + 1; // +1 for item name column
  const screenWidth = Dimensions.get('window').width;
  const itemColumnWidth = 160; // Fixed width for item name
  const remainingWidth = screenWidth - itemColumnWidth - 40; // 40 for margins
  const columnWidth = Math.floor(remainingWidth / (numColumns - 1));

  // Calculate PowerBall size based on column width - use most of the available space
  // Scale between 50px (many columns) and 80px (few columns)
  const powerBallSize = Math.max(50, Math.min(80, columnWidth - 16));

  // Render table header
  const renderHeader = () => {
    return (
      <View style={styles.headerRow}>
        <View style={[styles.itemNameCell, { width: itemColumnWidth }]}>
          <Text style={styles.headerText}>Item</Text>
        </View>
        {visibleStages.map(stage => (
          <View key={stage} style={[styles.qtyCell, { width: columnWidth }]}>
            <Text style={styles.headerText}>{STAGE_DISPLAY_NAMES[stage]}</Text>
          </View>
        ))}
      </View>
    );
  };

  // Render table row for an item
  const renderRow = (item: DashboardItem) => {
    return (
      <View key={item.item_id} style={styles.row}>
        <View style={[styles.itemNameCell, { width: itemColumnWidth }]}>
          <Text style={styles.itemName}>{item.name}</Text>
        </View>
        {visibleStages.map(stage => {
          const qty = getStageQuantity(item, stage);
          const isValid = MOVEMENT_RULES[stage as DashboardStage]?.length > 0;
          return (
            <TouchableOpacity
              key={stage}
              style={[styles.qtyCell, qty > 0 && styles.qtyCellActive, { width: columnWidth }]}
              onPress={() => isValid && qty > 0 && handleCellTap(item, stage as DashboardStage)}
              onLongPress={() => qty > 0 && handleCellLongPress(item, stage as DashboardStage)}
              disabled={qty === 0 || !isValid}
            >
              {qty > 0 ? (
                <PowerBall item={item} quantity={qty} size={powerBallSize} compact />
              ) : (
                <Text style={styles.emptyCell}>—</Text>
              )}
            </TouchableOpacity>
          );
        })}
      </View>
    );
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#2196F3" />
        <Text style={styles.loadingText}>Loading dashboard...</Text>
        <Text style={styles.loadingSubtext}>Meal ID: {mealId}</Text>
      </View>
    );
  }

  if (isPortrait) {
    return (
      <View style={styles.orientationWarning}>
        <Ionicons name="phone-portrait-outline" size={64} color="#2196F3" />
        <Text style={styles.orientationText}>Please rotate your device</Text>
        <Text style={styles.orientationSubtext}>Dashboard requires landscape orientation</Text>
        <TouchableOpacity style={styles.continueBtn} onPress={() => setIsPortrait(false)}>
          <Text style={styles.continueBtnText}>Continue in Portrait</Text>
        </TouchableOpacity>
      </View>
    );
  }

  if (loadError || items.length === 0) {
    return (
      <View style={styles.errorContainer}>
        <Ionicons name="alert-circle-outline" size={64} color="#FF9800" />
        <Text style={styles.errorTitle}>Unable to load dashboard</Text>
        <Text style={styles.errorMessage}>{loadError || 'No menu items found for this meal'}</Text>
        <Text style={styles.errorSubtext}>Meal ID: {mealId}</Text>
        <TouchableOpacity style={styles.retryBtn} onPress={() => loadData()}>
          <Text style={styles.retryBtnText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <StatusBar barStyle="dark-content" />

      {/* Header */}
      <View style={styles.topBar}>
        <View style={styles.topBarLeft}>
          <TouchableOpacity style={styles.mealSelector} onPress={handleOpenMealSwitcher}>
            <Ionicons name="restaurant-outline" size={16} color="#2196F3" />
            <Text style={styles.mealName}>{mealName || 'Loading...'}</Text>
            <Ionicons name="chevron-down" size={14} color="#666" />
          </TouchableOpacity>
        </View>

        <View style={styles.topBarRight}>
          <View style={styles.teamViewSelector}>
            {(['all', 'team1_kitchen', 'team2_staging', 'team3_serving'] as TeamView[]).map(view => (
              <TouchableOpacity
                key={view}
                style={[styles.teamViewBtn, teamView === view && styles.teamViewBtnActive]}
                onPress={() => setTeamView(view)}
              >
                <Text
                  style={[
                    styles.teamViewText,
                    teamView === view && styles.teamViewTextActive,
                  ]}
                >
                  {TEAM_VIEW_CONFIGS[view].shortName}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {isRefreshing && <ActivityIndicator size="small" color="#2196F3" />}
        </View>
      </View>

      {/* Inventory Warnings */}
      {inventoryWarnings.length > 0 && (
        <View style={styles.warningBar}>
          <Ionicons name="warning" size={16} color="#FF9800" />
          <Text style={styles.warningText}>
            Inventory exceeds Cooked for {inventoryWarnings.length} item{inventoryWarnings.length > 1 ? 's' : ''}
          </Text>
          <TouchableOpacity
            style={styles.warningDetailsBtn}
            onPress={() => Alert.alert('Inventory Warnings', inventoryWarnings.join('\n'))}
          >
            <Text style={styles.warningDetailsText}>View Details</Text>
          </TouchableOpacity>
        </View>
      )}

      {/* Dashboard Table */}
      <ScrollView style={styles.tableContainer} horizontal>
        <ScrollView>
          {renderHeader()}
          {items.map(item => renderRow(item))}
        </ScrollView>
      </ScrollView>

      {/* Quantity Move Popup */}
      {selectedItem && selectedStage && (
        <QuantityMovePopup
          visible={showMovePopup}
          item={selectedItem}
          currentStage={selectedStage}
          currentQty={getStageQuantity(selectedItem, selectedStage)}
          onClose={() => setShowMovePopup(false)}
          onMove={handleMove}
          mealId={mealId}
        />
      )}

      {/* Quantity Move Reverse Popup - for long press */}
      {selectedItem && selectedStage && (
        <QuantityMoveReversePopup
          visible={showReversePopup}
          item={selectedItem}
          currentStage={selectedStage}
          currentQty={getStageQuantity(selectedItem, selectedStage)}
          onClose={() => setShowReversePopup(false)}
          onMove={handleReverseMove}
          transactions={[]} // TODO: Add transaction history from API
        />
      )}

      {/* Meal Selection Modal for switching meals */}
      <MealSelectionModal
        visible={showMealModal}
        meals={availableMeals}
        loading={isLoadingMeals}
        onSelect={handleMealSwitch}
        onClose={() => setShowMealModal(false)}
      />
    </View>
  );
}

export default PrasadamDashboardScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F5F5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
  },
  loadingText: {
    marginTop: 16,
    fontSize: 16,
    color: '#666',
  },
  loadingSubtext: {
    marginTop: 8,
    fontSize: 12,
    color: '#999',
  },
  orientationWarning: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 32,
  },
  orientationText: {
    fontSize: 20,
    fontWeight: '600',
    textAlign: 'center',
    marginBottom: 8,
    marginTop: 24,
  },
  orientationSubtext: {
    fontSize: 14,
    color: '#666',
    marginBottom: 24,
  },
  continueBtn: {
    marginTop: 16,
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  continueBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FFF',
    padding: 32,
  },
  errorTitle: {
    fontSize: 18,
    fontWeight: '600',
    textAlign: 'center',
    marginTop: 16,
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 8,
  },
  errorSubtext: {
    fontSize: 12,
    color: '#999',
    marginBottom: 24,
  },
  retryBtn: {
    paddingHorizontal: 24,
    paddingVertical: 12,
    backgroundColor: '#2196F3',
    borderRadius: 8,
  },
  retryBtnText: {
    color: '#FFF',
    fontSize: 14,
    fontWeight: '600',
  },
  topBar: {
    flexDirection: 'row',
    backgroundColor: '#FFF',
    padding: 10,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  topBarLeft: {
    flex: 1,
  },
  topBarRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  mealSelector: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#F5F5F5',
    borderRadius: 16,
  },
  mealName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#2196F3',
  },
  teamViewSelector: {
    flexDirection: 'row',
    gap: 6,
  },
  teamViewBtn: {
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 14,
    backgroundColor: '#F5F5F5',
  },
  teamViewBtnActive: {
    backgroundColor: '#2196F3',
  },
  teamViewText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#666',
  },
  teamViewTextActive: {
    color: '#FFF',
  },
  tableContainer: {
    flex: 1,
    backgroundColor: '#FFF',
  },
  headerRow: {
    flexDirection: 'row',
    backgroundColor: '#EEE',
    borderBottomWidth: 2,
    borderBottomColor: '#DDD',
    minHeight: 50,
  },
  row: {
    flexDirection: 'row',
    borderBottomWidth: 1,
    borderBottomColor: '#EEE',
    minHeight: 60,
  },
  itemNameCell: {
    width: 150,
    padding: 8,
    justifyContent: 'center',
    borderRightWidth: 1,
    borderRightColor: '#EEE',
    backgroundColor: '#FAFAFA',
  },
  itemName: {
    fontSize: 14,
    fontWeight: '500',
  },
  qtyCell: {
    width: 70,
    justifyContent: 'center',
    alignItems: 'center',
    borderRightWidth: 1,
    borderRightColor: '#EEE',
    paddingVertical: 4,
  },
  qtyCellActive: {
    backgroundColor: '#FFF',
  },
  headerText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#333',
    textAlign: 'center',
  },
  emptyCell: {
    fontSize: 20,
    color: '#CCC',
  },
  warningBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFF8E1',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE082',
    gap: 8,
  },
  warningText: {
    flex: 1,
    fontSize: 12,
    color: '#F57C00',
  },
  warningDetailsBtn: {
    paddingHorizontal: 10,
    paddingVertical: 4,
    backgroundColor: '#FFE082',
    borderRadius: 4,
  },
  warningDetailsText: {
    fontSize: 11,
    fontWeight: '600',
    color: '#F57C00',
  },
});
