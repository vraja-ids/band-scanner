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
import { useFocusEffect, useRoute } from '@react-navigation/native';
import * as ScreenOrientation from 'expo-screen-orientation';
import { getAuthToken } from '../../storage/Session';
import {
  getDashboardSummary,
  updateLocationInventory,
} from '../../services/PrasadamSheetsService';
import { QuantityMovePopup } from './components/QuantityMovePopup';
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
import type { MenuItem, LocationInventoryItem } from '../../services/PrasadamSheetsService';

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
  const map: Record<DashboardStage, string> = {
    'planned': 'ready_trays',
    'cooked': 'kitchen',
    'stored': 'kitchen',
    'staging': 'staging',
    'refill_station_1': 'refill_1',
    'refill_station_2': 'refill_2',
    'refill_station_3': 'refill_3',
    'served': 'served',
    'left_over': 'left_over',
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

    items.push({
      item_id: menuItem.item_id,
      name: menuItem.name,
      low_qty_threshold: 10,
      planned_qty: menuItem.planned_trays,
      cooked_qty: menuItem.ready_trays,
      stored_qty: invRecord?.kitchen || 0,
      staging_qty: invRecord?.staging || 0,
      refill_station_1_qty: invRecord?.refill_1 || 0,
      refill_station_2_qty: invRecord?.refill_2 || 0,
      refill_station_3_qty: invRecord?.refill_3 || 0,
      served_qty: invRecord?.served || 0,
      left_over_qty: invRecord?.left_over || 0,
    });
  }

  return items;
}

// Get quantity for a stage from dashboard item
function getStageQuantity(item: DashboardItem, stage: DashboardStage): number {
  const qtyMap: Record<DashboardStage, keyof DashboardItem> = {
    planned: 'planned_qty',
    cooked: 'cooked_qty',
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
  const mealId = (route.params as any)?.mealId as string;

  // State
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [items, setItems] = useState<DashboardItem[]>([]);
  const [selectedItem, setSelectedItem] = useState<DashboardItem | null>(null);
  const [selectedStage, setSelectedStage] = useState<DashboardStage | null>(null);
  const [showMovePopup, setShowMovePopup] = useState(false);
  const [teamView, setTeamView] = useState<TeamView>('all');
  const [isPortrait, setIsPortrait] = useState(true);
  const [userId, setUserId] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);

  const refreshTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Get current stages based on team view
  const visibleStages = TEAM_VIEW_CONFIGS[teamView].stages;

  // Load user ID
  useEffect(() => {
    getAuthToken().then(setUserId);
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
      console.error('No mealId provided');
      setLoadError('No meal ID provided');
      setIsLoading(false);
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

  // Handle move
  const handleMove = useCallback(
    async (quantity: number, toStage: DashboardStage) => {
      if (!selectedItem || !selectedStage || !userId) return;

      const fromLocation = stageToLocation(selectedStage);
      const toLocation = stageToLocation(toStage);

      if (!fromLocation || !toLocation) {
        Alert.alert('Error', 'Invalid stage mapping');
        return;
      }

      try {
        // Subtract from source
        await updateLocationInventory({
          mealId,
          itemId: selectedItem.item_id,
          location: fromLocation,
          quantity,
          operation: 'subtract',
        });

        // Add to destination
        await updateLocationInventory({
          mealId,
          itemId: selectedItem.item_id,
          location: toLocation,
          quantity,
          operation: 'add',
        });

        // Refresh data
        await loadData();
        setShowMovePopup(false);
      } catch (error) {
        console.error('Failed to move quantity:', error);
        Alert.alert('Error', 'Failed to move trays');
      }
    },
    [selectedItem, selectedStage, userId, mealId, loadData]
  );

  // Render table header
  const renderHeader = () => {
    return (
      <View style={styles.headerRow}>
        <View style={styles.itemNameCell}>
          <Text style={styles.headerText}>Item</Text>
        </View>
        {visibleStages.map(stage => (
          <View key={stage} style={styles.qtyCell}>
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
        <View style={styles.itemNameCell}>
          <Text style={styles.itemName}>{item.name}</Text>
        </View>
        {visibleStages.map(stage => {
          const qty = getStageQuantity(item, stage);
          const isValid = MOVEMENT_RULES[stage as DashboardStage]?.length > 0;
          return (
            <TouchableOpacity
              key={stage}
              style={[styles.qtyCell, qty > 0 && styles.qtyCellActive]}
              onPress={() => isValid && qty > 0 && handleCellTap(item, stage as DashboardStage)}
              disabled={qty === 0 || !isValid}
            >
              {qty > 0 ? (
                <PowerBall item={item} quantity={qty} size={50} compact />
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
                {TEAM_VIEW_CONFIGS[view].name}
              </Text>
            </TouchableOpacity>
          ))}
        </View>

        {isRefreshing && <ActivityIndicator size="small" color="#2196F3" />}
      </View>

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
    padding: 12,
    justifyContent: 'space-between',
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  teamViewSelector: {
    flexDirection: 'row',
    gap: 8,
  },
  teamViewBtn: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 16,
    backgroundColor: '#F5F5F5',
  },
  teamViewBtnActive: {
    backgroundColor: '#2196F3',
  },
  teamViewText: {
    fontSize: 12,
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
});
