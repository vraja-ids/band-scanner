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
import { Ionicons } from '@expo/vector-icons';
import { googleSheetsService, StorageLocation, Ingredient } from '../../services/GoogleSheetsService';
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
  }>;
}

const BhogaStorageScreen: FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [rooms, setRooms] = useState<RoomWithIngredients[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [locations, ingredientData] = await Promise.all([
        googleSheetsService.getStorageLocations(),
        googleSheetsService.getIngredientData(),
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
        const mealsCount = ingredient?.meals.length || 0;

        roomMap.get(location.room)!.push({
          name: location.ingredientName,
          sublocation: location.sublocation,
          currentStock: location.currentStock,
          initialStock: location.initialStock,
          unit: location.unit,
          mealsCount,
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

  if (isLoading) {
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
        <Text style={styles.headerTitle}>Storage Locations</Text>
        <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
          <Ionicons name="refresh-outline" size={24} color="#5dbea3" />
        </TouchableOpacity>
      </View>

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

                return (
                  <View key={item.name} style={styles.ingredientRow}>
                    <View style={styles.ingredientInfo}>
                      <Text style={styles.ingredientName}>{item.name}</Text>
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
                        {item.currentStock} / {item.initialStock} {item.unit}
                      </Text>
                    </View>

                    <View style={styles.mealsInfo}>
                      <Ionicons name="calendar-outline" size={14} color="#666" />
                      <Text style={styles.mealsText}>Used in {item.mealsCount} meals</Text>
                    </View>
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
  ingredientRow: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 12,
    marginBottom: 10,
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
