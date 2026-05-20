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
  Platform,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { bhogaSheetsService, StorageLocation, Ingredient } from '../../services/BhogaSheetsService';
import { Routes } from '../../routes';

type BhogaStorageScreenNavigationProp = StackNavigationProp<any, any>;

interface Props {
  navigation: BhogaStorageScreenNavigationProp;
}

interface RoomWithIngredients {
  name: string;
  ingredients: Array<{
    name: string;
    sublocation: string;
    currentStock: number;
    initialStock: number;
    unit: string;
    mealsCount: number;
    meals: Array<{
      mealId: string;
      menuItem: string;
      plannedQuantity: number;
      status: 'pending' | 'delivered' | 'used';
    }>;
    shortfall?: number;
  }>;
}

// Helper to format quantities to 2 decimal places
const formatQty = (qty: number): string => {
  if (Number.isInteger(qty)) return qty.toString();
  return qty.toFixed(2);
};

const BhogaStorageScreen: FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [rooms, setRooms] = useState<RoomWithIngredients[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [expandedItems, setExpandedItems] = useState<Set<string>>(new Set());

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [locations, ingredientData] = await Promise.all([
        bhogaSheetsService.getStorageLocations(),
        bhogaSheetsService.getIngredientList(),
      ]);

      setStorageLocations(locations);
      setIngredients(ingredientData.ingredients);

      // Group by room
      const roomMap = new Map<string, RoomWithIngredients['ingredients']>();

      locations.forEach(location => {
        if (!roomMap.has(location.room)) {
          roomMap.set(location.room, []);
        }

        const ingredient = ingredientData.ingredients.find(i => i.name === location.ingredientName);
        const meals = ingredient?.meals || [];
        const mealsCount = meals.length;

        // Calculate shortfall for pending meals
        const pendingNeed = meals
          .filter(m => m.status === 'pending')
          .reduce((sum, m) => sum + m.plannedQuantity, 0);
        const shortfall = pendingNeed > location.currentStock ? pendingNeed - location.currentStock : 0;

        roomMap.get(location.room)!.push({
          name: location.ingredientName,
          sublocation: location.sublocation,
          currentStock: location.currentStock,
          initialStock: location.initialStock,
          unit: location.unit,
          mealsCount,
          meals,
          shortfall: shortfall > 0 ? shortfall : undefined,
        });
      });

      const roomList: RoomWithIngredients[] = Array.from(roomMap.entries()).map(([name, ingredients]) => ({
        name,
        ingredients,
      }));

      setRooms(roomList);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  };

  const getStockPercentage = (current: number, initial: number): number => {
    if (initial === 0) return 0;
    return (current / initial) * 100;
  };

  const getStockColor = (percentage: number): string => {
    if (percentage < 25) return '#ff6b6b';
    if (percentage < 50) return '#ffd93d';
    return '#6bcf7f';
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

  const formatMealName = (mealId: string): string => {
    // Convert mealId like "friBreakfast" to "Friday Breakfast"
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

    const [day, type] = mealId.toLowerCase().split(/(?=[A-Z])/).map(s => s.toLowerCase());
    const dayName = dayMap[day] || day;
    const typeName = mealTypeMap[type] || type;

    return `${dayName} ${typeName}`;
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
          <Text style={styles.headerTitle}>Storage Locations</Text>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={24} color="#5dbea3" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        {rooms.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No storage locations found</Text>
            <Text style={styles.emptyStateSubtext}>
              Add locations in Storage Setup to get started
            </Text>
          </View>
        ) : (
          rooms.map(room => (
            <View key={room.name} style={styles.roomCard}>
              <View style={styles.roomHeader}>
                <Ionicons name="home-outline" size={24} color="#5dbea3" />
                <Text style={styles.roomTitle}>{room.name}</Text>
                <Text style={styles.roomCount}>{room.ingredients.length} items</Text>
              </View>

              {room.ingredients.map(item => {
                const percentage = getStockPercentage(item.currentStock, item.initialStock);
                const stockColor = getStockColor(percentage);
                const isExpanded = expandedItems.has(item.name);

                return (
                  <View key={item.name} style={styles.ingredientCard}>
                    <TouchableOpacity
                      style={styles.ingredientRow}
                      onPress={() => toggleItemExpanded(item.name)}
                    >
                      <View style={styles.ingredientInfo}>
                        <View style={styles.ingredientNameRow}>
                          <Text style={styles.ingredientName}>{item.name}</Text>
                          <Ionicons
                            name={isExpanded ? "chevron-up" : "chevron-down"}
                            size={20}
                            color="#666"
                          />
                        </View>
                        {item.sublocation && (
                          <View style={styles.sublocationBadge}>
                            <Text style={styles.sublocationText}>{item.sublocation}</Text>
                          </View>
                        )}
                      </View>

                      <View style={styles.stockInfo}>
                        <View style={styles.stockBarContainer}>
                          <View
                            style={[
                              styles.stockBar,
                              { width: `${Math.min(100, percentage)}%`, backgroundColor: stockColor },
                            ]}
                          />
                        </View>
                        <Text style={styles.stockText}>
                          {formatQty(item.currentStock)} / {formatQty(item.initialStock)} {item.unit}
                        </Text>
                      </View>

                      <View style={styles.mealsInfo}>
                        <Ionicons name="calendar-outline" size={14} color="#666" />
                        <Text style={styles.mealsText}>Used in {item.mealsCount} meals</Text>
                      </View>
                    </TouchableOpacity>

                    {isExpanded && (
                      <View style={styles.mealDetailsContainer}>
                        {item.shortfall !== undefined && item.shortfall > 0 && (
                          <View style={styles.alertBanner}>
                            <Ionicons name="warning" size={18} color="#ff6b6b" />
                            <Text style={styles.alertText}>
                              Need {formatQty(item.shortfall)} more {item.unit} for pending meals
                            </Text>
                          </View>
                        )}

                        <Text style={styles.mealDetailsTitle}>Meal Usage:</Text>
                        {item.meals.map((meal, index) => {
                          const isPending = meal.status === 'pending';
                          const isDelivered = meal.status === 'delivered';
                          const isUsed = meal.status === 'used';

                          return (
                            <View key={index} style={styles.mealDetailRow}>
                              <View style={styles.mealDetailLeft}>
                                <Text style={styles.mealName}>{formatMealName(meal.mealId)}</Text>
                                <Text style={styles.dishName}>for {meal.menuItem}</Text>
                              </View>
                              <View style={styles.mealDetailRight}>
                                <Text style={styles.qtyText}>{formatQty(meal.plannedQuantity)} {item.unit}</Text>
                                <View style={[
                                  styles.statusBadge,
                                  isPending && styles.statusPending,
                                  isDelivered && styles.statusDelivered,
                                  isUsed && styles.statusUsed,
                                ]}>
                                  <Text style={[
                                    styles.statusText,
                                    isPending && styles.statusTextPending,
                                    isDelivered && styles.statusTextDelivered,
                                    isUsed && styles.statusTextUsed,
                                  ]}>
                                    {meal.status}
                                  </Text>
                                </View>
                              </View>
                            </View>
                          );
                        })}
                        {item.meals.length === 0 && (
                          <Text style={styles.noMealsText}>No meal usage data</Text>
                        )}
                      </View>
                    )}
                  </View>
                );
              })}
            </View>
          ))
        )}

        <TouchableOpacity
          style={styles.addButton}
          onPress={() => navigation.navigate(Routes.BhogaAdmin)}
        >
          <Ionicons name="add-circle-outline" size={20} color="#5dbea3" />
          <Text style={styles.addButtonText}>Manage Storage Locations</Text>
        </TouchableOpacity>
      </ScrollView>
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
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#666',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  roomCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
    paddingBottom: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  roomTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  roomCount: {
    fontSize: 14,
    color: '#666',
  },
  ingredientCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    marginBottom: 10,
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  ingredientRow: {
    backgroundColor: '#f9f9f9',
    padding: 12,
  },
  ingredientNameRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  ingredientInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 10,
  },
  ingredientName: {
    flex: 1,
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  sublocationBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  sublocationText: {
    fontSize: 12,
    color: '#1976d2',
    fontWeight: '600',
  },
  stockInfo: {
    marginLeft: 20,
    marginBottom: 8,
  },
  stockBarContainer: {
    height: 8,
    backgroundColor: '#e0e0e0',
    borderRadius: 4,
    overflow: 'hidden',
    marginBottom: 5,
  },
  stockBar: {
    height: '100%',
    borderRadius: 4,
  },
  stockText: {
    fontSize: 13,
    color: '#666',
  },
  mealsInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginLeft: 20,
  },
  mealsText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
  },
  mealDetailsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 12,
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  alertBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#ffebee',
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 8,
    marginBottom: 12,
  },
  alertText: {
    flex: 1,
    fontSize: 13,
    color: '#c62828',
    fontWeight: '600',
    marginLeft: 8,
  },
  mealDetailsTitle: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 10,
  },
  mealDetailRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#fff',
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderRadius: 8,
    marginBottom: 8,
  },
  mealDetailLeft: {
    flex: 1,
  },
  mealName: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  dishName: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  mealDetailRight: {
    alignItems: 'flex-end',
  },
  qtyText: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#5dbea3',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 12,
    marginTop: 4,
  },
  statusPending: {
    backgroundColor: '#fff3e0',
  },
  statusDelivered: {
    backgroundColor: '#e8f5e9',
  },
  statusUsed: {
    backgroundColor: '#f5f5f5',
  },
  statusText: {
    fontSize: 11,
    fontWeight: '600',
  },
  statusTextPending: {
    color: '#e65100',
  },
  statusTextDelivered: {
    color: '#2e7d32',
  },
  statusTextUsed: {
    color: '#666',
  },
  noMealsText: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
    paddingVertical: 10,
  },
  addButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#5dbea3',
    marginTop: 10,
  },
  addButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#5dbea3',
    marginLeft: 10,
  },
});

export default BhogaStorageScreen;
