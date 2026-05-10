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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { bhogaSheetsService, Ingredient, Delivery } from '../../services/BhogaSheetsService';

type BhogaDeliveryScreenNavigationProp = StackNavigationProp<any, any>;

interface Props {
  navigation: BhogaDeliveryScreenNavigationProp;
}

interface IngredientWithDelivery extends Ingredient {
  deliveredQty: number;
  expectedQty: number;
}

const BhogaDeliveryScreen: FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [ingredients, setIngredients] = useState<IngredientWithDelivery[]>([]);
  const [existingDeliveries, setExistingDeliveries] = useState<Delivery[]>([]);

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [ingredientData, deliveries] = await Promise.all([
        bhogaSheetsService.getIngredientList(),
        bhogaSheetsService.getDeliveries(),
      ]);

      setExistingDeliveries(deliveries);

      // Combine ingredients with their delivery status
      const itemsWithDelivery: IngredientWithDelivery[] = ingredientData.ingredients.map(ing => {
        const delivery = deliveries.find(d => d.ingredient === ing.name);
        return {
          ...ing,
          deliveredQty: delivery?.deliveredQty || 0,
          expectedQty: ing.totalPlanned,
        };
      });

      setIngredients(itemsWithDelivery);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setIsLoading(false);
    }
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

      <ScrollView style={styles.content}>
        {ingredients.map((item) => (
          <View key={item.name} style={styles.itemCard}>
            <View style={styles.itemHeader}>
              <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
                  {item.category}
                </Text>
              </View>
              {getStatusIcon(item)}
            </View>

            <Text style={styles.ingredientName}>{item.name}</Text>

            <View style={styles.qtyRow}>
              <View style={styles.qtyColumn}>
                <Text style={styles.qtyLabel}>Expected</Text>
                <Text style={styles.qtyValue}>{item.expectedQty} {item.unit}</Text>
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

            <TouchableOpacity
              style={styles.saveButton}
              onPress={() => handleSaveDelivery(item.name, item.category, item.deliveredQty, item.expectedQty, item.unit)}
            >
              <Ionicons name="save-outline" size={18} color="#fff" />
              <Text style={styles.saveButtonText}>Save</Text>
            </TouchableOpacity>
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
});

export default BhogaDeliveryScreen;
