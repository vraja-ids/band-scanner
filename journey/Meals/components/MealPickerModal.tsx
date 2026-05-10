/**
 * Meal Picker Modal
 * Allows user to select current meal before scanning
 * Auto-selects current meal based on time, confirms if changing to different meal
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Modal,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import type { MealTimeSlot } from '../../../config/mealSchedule';

interface MealPickerModalProps {
  visible: boolean;
  meals: MealTimeSlot[];
  currentMeal: MealTimeSlot | null;
  loading: boolean;
  onSelect: (meal: MealTimeSlot) => void;
  onClose: () => void;
}

export const MealPickerModal: React.FC<MealPickerModalProps> = ({
  visible,
  meals,
  currentMeal,
  loading,
  onSelect,
  onClose,
}) => {
  const [selectedMeal, setSelectedMeal] = useState<MealTimeSlot | null>(currentMeal);

  // Update selected meal when currentMeal changes (modal opens)
  React.useEffect(() => {
    if (visible) {
      setSelectedMeal(currentMeal);
    }
  }, [visible, currentMeal]);

  const handleMealPress = (meal: MealTimeSlot) => {
    setSelectedMeal(meal);
  };

  const handleProceed = () => {
    if (!selectedMeal) {
      Alert.alert('No Meal Selected', 'Please select a meal to proceed.');
      return;
    }

    // If there's a current meal but user selected a different one, show confirmation
    if (currentMeal && selectedMeal.mealId !== currentMeal.mealId) {
      Alert.alert(
        'Confirm Meal Selection',
        `You selected "${selectedMeal.name}" but the current time suggests "${currentMeal.name}".\n\nDo you want to proceed with "${selectedMeal.name}"?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Confirm',
            onPress: () => onSelect(selectedMeal),
          },
        ]
      );
    } else {
      // Selecting current meal or no current meal detected
      onSelect(selectedMeal);
    }
  };

  if (loading) {
    return (
      <Modal visible={visible} transparent animationType="fade">
        <View style={styles.overlay}>
          <View style={styles.container}>
            <ActivityIndicator size="large" color="#5dbea3" />
            <Text style={styles.loadingText}>Loading meals...</Text>
          </View>
        </View>
      </Modal>
    );
  }

  const formatTime = (hour: number, minute: number) => {
    const h = hour % 12 || 12;
    const ampm = hour < 12 ? 'AM' : 'PM';
    const m = minute.toString().padStart(2, '0');
    return `${h}:${m} ${ampm}`;
  };

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <View style={styles.overlay}>
        <View style={styles.container}>
          <View style={styles.header}>
            <Text style={styles.title}>Select Meal</Text>
            <TouchableOpacity onPress={onClose} style={styles.closeBtn}>
              <Text style={styles.closeBtnText}>✕</Text>
            </TouchableOpacity>
          </View>

          {/* Show current meal hint */}
          {currentMeal ? (
            <View style={styles.hintContainer}>
              <Text style={styles.hintText}>
                Suggested for current time: <Text style={styles.hintMealName}>{currentMeal.name}</Text>
              </Text>
            </View>
          ) : (
            <View style={styles.hintContainer}>
              <Text style={styles.hintTextWarning}>
                Outside regular meal hours • Please select manually
              </Text>
            </View>
          )}

          <ScrollView style={styles.content}>
            {meals.length === 0 ? (
              <View style={styles.emptyContainer}>
                <Text style={styles.emptyText}>No meals found for this event</Text>
                <Text style={styles.emptySubtext}>Please contact admin</Text>
              </View>
            ) : (
              meals.map((meal) => {
                const isSelected = selectedMeal?.mealId === meal.mealId;
                const isCurrent = currentMeal?.mealId === meal.mealId;

                return (
                  <TouchableOpacity
                    key={meal.mealId}
                    style={[styles.mealItem, isSelected && styles.mealItemCurrent]}
                    onPress={() => handleMealPress(meal)}
                  >
                    <View style={styles.mealInfo}>
                      <View style={styles.mealHeader}>
                        <Text style={[styles.mealName, isSelected && styles.mealNameSelected]}>{meal.name}</Text>
                        {isCurrent && <Text style={styles.currentBadge}>Suggested</Text>}
                      </View>
                      <Text style={styles.mealTime}>
                        {formatTime(meal.startHour, meal.startMinute)} - {formatTime(meal.endHour, meal.endMinute)}
                      </Text>
                    </View>
                    {isSelected && <Text style={styles.checkmark}>✓</Text>}
                  </TouchableOpacity>
                );
              })
            )}
          </ScrollView>

          {/* Proceed Button */}
          <View style={styles.footer}>
            <TouchableOpacity
              style={[styles.proceedButton, !selectedMeal && styles.proceedButtonDisabled]}
              onPress={handleProceed}
              disabled={!selectedMeal}
            >
              <Text style={styles.proceedButtonText}>Proceed</Text>
            </TouchableOpacity>
          </View>
        </View>
      </View>
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
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#E0E0E0',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#333',
  },
  closeBtn: {
    padding: 4,
  },
  closeBtnText: {
    fontSize: 24,
    color: '#666',
  },
  content: {
    padding: 16,
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
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
    padding: 14,
    marginBottom: 10,
    backgroundColor: '#F5F5F5',
    borderRadius: 10,
    borderWidth: 2,
    borderColor: '#E0E0E0',
  },
  mealItemCurrent: {
    backgroundColor: '#E8F5E9',
    borderColor: '#5dbea3',
  },
  mealInfo: {
    flex: 1,
  },
  mealHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 4,
  },
  mealName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginRight: 8,
  },
  mealNameSelected: {
    color: '#5dbea3',
  },
  currentBadge: {
    fontSize: 11,
    fontWeight: '600',
    color: '#FFF',
    backgroundColor: '#5dbea3',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  mealTime: {
    fontSize: 13,
    color: '#666',
  },
  arrow: {
    fontSize: 20,
    color: '#5dbea3',
    fontWeight: '700',
  },
  checkmark: {
    fontSize: 24,
    color: '#5dbea3',
    fontWeight: '700',
  },
  hintContainer: {
    backgroundColor: '#FFF3E0',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: '#FFE0B2',
  },
  hintText: {
    fontSize: 13,
    color: '#666',
    textAlign: 'center',
  },
  hintMealName: {
    fontSize: 13,
    fontWeight: '600',
    color: '#5dbea3',
  },
  hintTextWarning: {
    fontSize: 13,
    fontWeight: '500',
    color: '#FF9800',
    textAlign: 'center',
  },
  footer: {
    padding: 16,
    borderTopWidth: 1,
    borderTopColor: '#E0E0E0',
  },
  proceedButton: {
    backgroundColor: '#5dbea3',
    paddingVertical: 14,
    borderRadius: 10,
    alignItems: 'center',
  },
  proceedButtonDisabled: {
    backgroundColor: '#ccc',
  },
  proceedButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
});
