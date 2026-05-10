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
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { bhogaSheetsService, Ingredient, StorageLocation, StockAlert } from '../../services/BhogaSheetsService';
import { Routes } from '../../routes';

type BhogaAlertsScreenNavigationProp = StackNavigationProp<any, any>;

interface Props {
  navigation: BhogaAlertsScreenNavigationProp;
}

interface AlertWithDetails extends StockAlert {
  affectedMeals: Array<{
    mealId: string;
    menuItem: string;
    plannedQuantity: number;
  }>;
}

const BhogaAlertsScreen: FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [alerts, setAlerts] = useState<AlertWithDetails[]>([]);
  const [warnings, setWarnings] = useState<AlertWithDetails[]>([]);

  useEffect(() => {
    loadAlerts();
  }, []);

  const loadAlerts = async () => {
    try {
      setIsLoading(true);
      const [locations, ingredientData] = await Promise.all([
        bhogaSheetsService.getStorageLocations(),
        bhogaSheetsService.getIngredientList(),
      ]);

      const locationMap = new Map(locations.map(l => [l.ingredientName, l]));
      const criticalAlerts: AlertWithDetails[] = [];
      const warningAlerts: AlertWithDetails[] = [];

      ingredientData.ingredients.forEach(ingredient => {
        const location = locationMap.get(ingredient.name);
        const currentStock = location?.currentStock || 0;
        const pendingMeals = ingredient.meals.filter(m => m.status === 'pending');
        const pendingNeed = pendingMeals.reduce((sum, m) => sum + m.plannedQuantity, 0);

        const shortfall = pendingNeed - currentStock;

        if (shortfall > 0) {
          const alertData: AlertWithDetails = {
            ingredient: ingredient.name,
            currentStock,
            needed: pendingNeed,
            shortfall,
            unit: ingredient.unit,
            affectedMeals: pendingMeals.map(m => ({
              mealId: m.mealId,
              menuItem: m.menuItem,
              plannedQuantity: m.plannedQuantity,
            })),
          };

          // Critical: shortage exists now
          // Warning: less than 20% buffer
          const bufferPercentage = (currentStock / pendingNeed) * 100;

          if (bufferPercentage < 100) {
            criticalAlerts.push(alertData);
          } else if (bufferPercentage < 120) {
            warningAlerts.push(alertData);
          }
        }
      });

      // Sort by shortfall (highest first)
      criticalAlerts.sort((a, b) => b.shortfall - a.shortfall);
      warningAlerts.sort((a, b) => b.shortfall - a.shortfall);

      setAlerts(criticalAlerts);
      setWarnings(warningAlerts);
    } catch (error) {
      console.error('Error loading alerts:', error);
      Alert.alert('Error', 'Failed to load alerts.');
    } finally {
      setIsLoading(false);
    }
  };

  const getMealDisplayName = (mealId: string): string => {
    const dayMap: Record<string, string> = {
      'Fri': 'Friday',
      'Sat': 'Saturday',
      'Sun': 'Sunday',
      'Mon': 'Monday',
    };

    for (const day of ['Fri', 'Sat', 'Sun', 'Mon']) {
      if (mealId.startsWith(day)) {
        const mealType = mealId.replace(day, '').replace('Break', ' Breakfast')
          .replace('Lunch', ' Lunch')
          .replace('Din', ' Dinner');
        return `${dayMap[day]}${mealType}`;
      }
    }
    return mealId;
  };

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#5dbea3" />
      </View>
    );
  }

  const hasAlerts = alerts.length > 0 || warnings.length > 0;

  return (
    <View style={styles.container}>
      <SafeAreaView>
        <View style={styles.header}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Ionicons name="arrow-back" size={24} color="#5dbea3" />
          </TouchableOpacity>
          <Text style={styles.headerTitle}>Stock Alerts</Text>
          <TouchableOpacity onPress={loadAlerts} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={24} color="#5dbea3" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        {!hasAlerts ? (
          <View style={styles.emptyState}>
            <Ionicons name="checkmark-circle-outline" size={64} color="#6bcf7f" />
            <Text style={styles.emptyStateText}>All stocks are healthy!</Text>
            <Text style={styles.emptyStateSubtext}>
              No shortages detected based on current meal plans
            </Text>
          </View>
        ) : (
          <>
            {alerts.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="warning" size={24} color="#ff6b6b" />
                  <Text style={styles.sectionTitle}>Critical Shortages</Text>
                  <Text style={styles.sectionCount}>{alerts.length}</Text>
                </View>

                {alerts.map((alert, index) => (
                  <View key={index} style={styles.alertCard}>
                    <View style={styles.alertHeader}>
                      <Text style={styles.alertIngredient}>{alert.ingredient}</Text>
                      <View style={styles.shortfallBadge}>
                        <Text style={styles.shortfallText}>-{alert.shortfall} {alert.unit}</Text>
                      </View>
                    </View>

                    <View style={styles.alertDetails}>
                      <View style={styles.stockRow}>
                        <Text style={styles.stockLabel}>Current Stock:</Text>
                        <Text style={styles.stockValue}>{alert.currentStock} {alert.unit}</Text>
                      </View>
                      <View style={styles.stockRow}>
                        <Text style={styles.stockLabel}>Still Needed:</Text>
                        <Text style={styles.stockValueDanger}>{alert.needed} {alert.unit}</Text>
                      </View>
                    </View>

                    <View style={styles.affectedMeals}>
                      <Text style={styles.affectedTitle}>Affected Meals:</Text>
                      {alert.affectedMeals.slice(0, 5).map((meal, idx) => (
                        <View key={idx} style={styles.mealRow}>
                          <Ionicons name="calendar" size={14} color="#666" />
                          <Text style={styles.mealText}>
                            {getMealDisplayName(meal.mealId)} - {meal.menuItem} ({meal.plannedQuantity} {alert.unit})
                          </Text>
                        </View>
                      ))}
                      {alert.affectedMeals.length > 5 && (
                        <Text style={styles.moreText}>
                          ...and {alert.affectedMeals.length - 5} more meals
                        </Text>
                      )}
                    </View>
                  </View>
                ))}
              </View>
            )}

            {warnings.length > 0 && (
              <View style={styles.section}>
                <View style={styles.sectionHeader}>
                  <Ionicons name="information-circle" size={24} color="#ffd93d" />
                  <Text style={styles.sectionTitle}>Low Stock Warnings</Text>
                  <Text style={styles.sectionCount}>{warnings.length}</Text>
                </View>

                {warnings.map((warning, index) => (
                  <View key={index} style={[styles.alertCard, styles.warningCard]}>
                    <View style={styles.alertHeader}>
                      <Text style={styles.alertIngredient}>{warning.ingredient}</Text>
                      <View style={styles.warningBadge}>
                        <Text style={styles.warningText}>Low Buffer</Text>
                      </View>
                    </View>

                    <View style={styles.alertDetails}>
                      <View style={styles.stockRow}>
                        <Text style={styles.stockLabel}>Current Stock:</Text>
                        <Text style={styles.stockValue}>{warning.currentStock} {warning.unit}</Text>
                      </View>
                      <View style={styles.stockRow}>
                        <Text style={styles.stockLabel}>Buffer:</Text>
                        <Text style={styles.stockValueWarning}>
                          {Math.round((warning.currentStock / warning.needed) * 100 - 100)}%
                        </Text>
                      </View>
                    </View>

                    <TouchableOpacity
                      style={styles.viewMealsButton}
                      onPress={() => {
                        // Could navigate to a detail view showing all affected meals
                      }}
                    >
                      <Text style={styles.viewMealsText}>
                        Used in {warning.affectedMeals.length} upcoming meals
                      </Text>
                    </TouchableOpacity>
                  </View>
                ))}
              </View>
            )}
          </>
        )}
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
    color: '#6bcf7f',
    marginTop: 20,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 10,
    textAlign: 'center',
  },
  section: {
    marginBottom: 20,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 15,
  },
  sectionTitle: {
    flex: 1,
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 10,
  },
  sectionCount: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#666',
  },
  alertCard: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 10,
    borderLeftWidth: 4,
    borderLeftColor: '#ff6b6b',
  },
  warningCard: {
    borderLeftColor: '#ffd93d',
  },
  alertHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
  },
  alertIngredient: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
  },
  shortfallBadge: {
    backgroundColor: '#ff6b6b',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  shortfallText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#fff',
  },
  warningBadge: {
    backgroundColor: '#ffd93d',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  warningText: {
    fontSize: 12,
    fontWeight: 'bold',
    color: '#333',
  },
  alertDetails: {
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    padding: 10,
    marginBottom: 12,
  },
  stockRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 5,
  },
  stockLabel: {
    fontSize: 14,
    color: '#666',
  },
  stockValue: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
  },
  stockValueDanger: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#ff6b6b',
  },
  stockValueWarning: {
    fontSize: 14,
    fontWeight: 'bold',
    color: '#f57c00',
  },
  affectedMeals: {
    marginTop: 8,
  },
  affectedTitle: {
    fontSize: 13,
    fontWeight: '600',
    color: '#666',
    marginBottom: 8,
  },
  mealRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealText: {
    fontSize: 12,
    color: '#666',
    marginLeft: 5,
    flex: 1,
  },
  moreText: {
    fontSize: 12,
    color: '#999',
    fontStyle: 'italic',
    marginTop: 4,
  },
  viewMealsButton: {
    backgroundColor: '#f0f0f0',
    padding: 10,
    borderRadius: 8,
    alignItems: 'center',
    marginTop: 8,
  },
  viewMealsText: {
    fontSize: 13,
    color: '#666',
    fontWeight: '600',
  },
});

export default BhogaAlertsScreen;
