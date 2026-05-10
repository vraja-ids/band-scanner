import React, { FC, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { RouteProp } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { googleSheetsService, StorageLocation, StockTransaction } from '../../services/GoogleSheetsService';
import { Routes, BhogaMealParams } from '../../routes';

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

const BhogaMealScreen: FC<Props> = ({ navigation, route }) => {
  const { mealId, mealName, mealData } = route.params as BhogaMealParams;
  const [isLoading, setIsLoading] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItemWithIngredients[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [userId, setUserId] = useState<string>('');

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
      const locations = await googleSheetsService.getStorageLocations();
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

  const handleMarkDelivered = async (ingredient: IngredientWithLocation, menuItem: string) => {
    Alert.alert(
      'Mark as Delivered',
      `Mark ${ingredient.name} (${ingredient.quantity} ${ingredient.unit}) as delivered to kitchen?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Confirm',
          onPress: async () => {
            try {
              setIsLoading(true);

              // Update local status
              setMenuItems(prev =>
                prev.map(item =>
                  item.name === menuItem
                    ? {
                        ...item,
                        ingredients: item.ingredients.map(ing =>
                          ing.name === ingredient.name ? { ...ing, status: 'delivered' as const } : ing
                        ),
                      }
                    : item
                )
              );

              // Record transaction
              const transaction: StockTransaction = {
                timestamp: new Date().toISOString(),
                mealId,
                menuItem,
                ingredientName: ingredient.name,
                usedQuantity: ingredient.quantity,
                unit: ingredient.unit,
                remainingStock: ingredient.location?.currentStock,
                userId,
              };

              await googleSheetsService.recordStockTransaction(transaction);

              // Update stock location if exists
              if (ingredient.location) {
                const newStock = Math.max(0, ingredient.location.currentStock - ingredient.quantity);
                await googleSheetsService.updateStorageLocation(
                  ingredient.name,
                  ingredient.location.room,
                  ingredient.location.sublocation,
                  newStock,
                  ingredient.location.unit
                );
              }

              Alert.alert('Success', `${ingredient.name} marked as delivered`);
            } catch (error) {
              console.error('Error marking delivered:', error);
              Alert.alert('Error', 'Failed to mark as delivered');
            } finally {
              setIsLoading(false);
            }
          },
        },
      ]
    );
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
                    {ingredient.quantity} {ingredient.unit}
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
                      <Ionicons name="checkmark-circle" size={24} color="#5dbea3" />
                      <Text style={styles.deliverButtonText}>Mark Delivered</Text>
                    </TouchableOpacity>
                  )}
                </View>
              </View>
            ))}
          </View>
        ))}
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
    backgroundColor: '#e8f5e9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 15,
  },
  deliverButtonText: {
    fontSize: 12,
    fontWeight: '600',
    color: '#5dbea3',
    marginLeft: 5,
  },
});

export default BhogaMealScreen;
