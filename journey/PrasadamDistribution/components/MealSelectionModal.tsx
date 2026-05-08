/**
 * Meal Selection Modal
 * Allows user to select a meal before entering the dashboard
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
} from 'react-native';
import * as ScreenOrientation from 'expo-screen-orientation';
import type { Meal } from '../../../services/PrasadamSheetsService';

interface MealSelectionModalProps {
  visible: boolean;
  meals: Meal[];
  loading: boolean;
  onSelect: (meal: Meal) => void;
  onClose: () => void;
}

export const MealSelectionModal: React.FC<MealSelectionModalProps> = ({
  visible,
  meals,
  loading,
  onSelect,
  onClose,
}) => {
  // Lock to landscape when modal opens, unlock when closes
  React.useEffect(() => {
    if (visible) {
      ScreenOrientation.lockAsync(ScreenOrientation.OrientationLock.LANDSCAPE);
    }
    return () => {
      ScreenOrientation.unlockAsync();
    };
  }, [visible]);

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="fade" supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}>
        <View style={styles.overlay}>
          <View style={styles.container}>
            <ActivityIndicator size="large" color="#2196F3" />
            <Text style={styles.loadingText}>Loading meals...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} supportedOrientations={['landscape', 'landscape-left', 'landscape-right']}>
      <TouchableOpacity style={styles.overlay} activeOpacity={1} onPress={onClose}>
        <TouchableOpacity activeOpacity={1} style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Meal</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          <ScrollView style={styles.content}>
            {meals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No meals found for this event</Text>
                <Text style={styles.emptySubtext}>Please check back later or contact admin</Text>
              </View>
            ) : (
              meals.map((meal, index) => {
                // Ensure meal_id exists, use index as fallback
                const mealKey = meal.meal_id || `meal-${index}`;
                const displayName = meal.meal_name || meal.meal_type || `Meal ${String(meal.meal_id || '').slice(-6) || index}`;
                const timeDisplay = meal.serving_start_time || meal.date || '';
                const typeDisplay = meal.meal_type || 'Meal';

                return (
                  <TouchableOpacity
                    key={mealKey}
                    style={styles.mealItem}
                    onPress={() => onSelect(meal)}
                  >
                    <View style={styles.mealInfo}>
                      <Text style={styles.mealName}>{displayName}</Text>
                      <View style={styles.mealMeta}>
                        {timeDisplay ? <Text style={styles.mealDate}>{timeDisplay}</Text> : null}
                        <Text style={styles.mealType}>{typeDisplay}</Text>
                      </View>
                    </View>
                    <Text style={styles.arrow}>→</Text>
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>
        </TouchableOpacity>
      </TouchableOpacity>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  container: {
    backgroundColor: '#FFF',
    borderRadius: 12,
    width: '100%',
    maxWidth: 400,
    maxHeight: '70%',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 16,
    fontWeight: '700',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 20,
    color: '#666',
  },
  content: {
    padding: 12,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  emptyContainer: {
    padding: 20,
    alignItems: 'center',
  },
  emptyText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  emptySubtext: {
    fontSize: 13,
    color: '#999',
    textAlign: 'center',
  },
  mealItem: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    marginBottom: 8,
    backgroundColor: '#F5F5F5',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  mealInfo: {
    flex: 1,
  },
  mealName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  mealMeta: {
    flexDirection: 'row',
    gap: 8,
  },
  mealDate: {
    fontSize: 12,
    color: '#666',
  },
  mealType: {
    fontSize: 12,
    color: '#2196F3',
    fontWeight: '500',
  },
  arrow: {
    fontSize: 18,
    color: '#2196F3',
    fontWeight: '700',
  },
});
