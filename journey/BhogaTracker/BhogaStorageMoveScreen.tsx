import React, { FC, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
  Modal,
  TextInput,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { bhogaSheetsService, DeliveredItem, StorageLocation } from '../../services/BhogaSheetsService';

type BhogaStorageMoveScreenNavigationProp = StackNavigationProp<any, any>;

interface Props {
  navigation: BhogaStorageMoveScreenNavigationProp;
}

const ROOM_OPTIONS = ['Kitchen', 'Pantry', 'Walk-in Fridge', 'Dry Storage', 'Cold Room'];

const BhogaStorageMoveScreen: FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [deliveredItems, setDeliveredItems] = useState<DeliveredItem[]>([]);
  const [storageLocations, setStorageLocations] = useState<StorageLocation[]>([]);
  const [selectedItem, setSelectedItem] = useState<DeliveredItem | null>(null);
  const [showLocationPicker, setShowLocationPicker] = useState(false);
  const [selectedRoom, setSelectedRoom] = useState('');
  const [sublocation, setSublocation] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [items, locations] = await Promise.all([
        bhogaSheetsService.getDeliveredItems(),
        bhogaSheetsService.getStorageLocations(),
      ]);

      setDeliveredItems(items);
      setStorageLocations(locations);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleMoveToStorage = (item: DeliveredItem) => {
    setSelectedItem(item);
    setSelectedRoom('');
    setSublocation('');
    setShowLocationPicker(true);
  };

  const handleConfirmMove = async () => {
    if (!selectedItem || !selectedRoom) {
      Alert.alert('Error', 'Please select a room');
      return;
    }

    try {
      await bhogaSheetsService.moveToStorage({
        ingredient: selectedItem.ingredient,
        room: selectedRoom,
        sublocation,
        quantity: selectedItem.quantity,
        unit: selectedItem.unit,
      });

      // Remove item from local list
      setDeliveredItems(prev => prev.filter(item => item.timestamp !== selectedItem?.timestamp));

      setShowLocationPicker(false);
      setSelectedItem(null);
      Alert.alert('Success', 'Item moved to storage');
    } catch (error) {
      Alert.alert('Error', 'Failed to move to storage');
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
          <Text style={styles.headerTitle}>Move to Storage</Text>
          <TouchableOpacity onPress={loadData} style={styles.refreshButton}>
            <Ionicons name="refresh-outline" size={24} color="#5dbea3" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        {deliveredItems.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No items to move</Text>
            <Text style={styles.emptyStateSubtext}>
              Delivered items will appear here
            </Text>
          </View>
        ) : (
          deliveredItems.map((item) => (
            <View key={item.timestamp} style={styles.itemCard}>
              <View style={styles.itemHeader}>
                <View style={[styles.categoryBadge, { backgroundColor: getCategoryColor(item.category) + '20' }]}>
                  <Text style={[styles.categoryText, { color: getCategoryColor(item.category) }]}>
                    {item.category}
                  </Text>
                </View>
                <Text style={styles.qtyText}>{item.quantity} {item.unit}</Text>
              </View>

              <Text style={styles.ingredientName}>{item.ingredient}</Text>

              <TouchableOpacity
                style={styles.moveButton}
                onPress={() => handleMoveToStorage(item)}
              >
                <Ionicons name="move" size={18} color="#fff" />
                <Text style={styles.moveButtonText}>Move to Storage</Text>
              </TouchableOpacity>
            </View>
          ))
        )}
      </ScrollView>

      {/* Location Picker Modal */}
      <Modal visible={showLocationPicker} transparent animationType="slide">
        <TouchableOpacity
          style={styles.pickerModal}
          activeOpacity={1}
          onPress={() => setShowLocationPicker(false)}
        >
          <TouchableOpacity
            style={styles.pickerContent}
            activeOpacity={1}
            onPress={(e) => e.stopPropagation()}
          >
            <Text style={styles.pickerTitle}>Select Storage Location</Text>

            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Room</Text>
              <View style={styles.roomOptions}>
                {ROOM_OPTIONS.map(room => (
                  <TouchableOpacity
                    key={room}
                    style={[styles.roomOption, selectedRoom === room && styles.roomOptionSelected]}
                    onPress={() => setSelectedRoom(room)}
                  >
                    <Text style={[styles.roomOptionText, selectedRoom === room && styles.roomOptionTextSelected]}>
                      {room}
                    </Text>
                    {selectedRoom === room && (
                      <Ionicons name="checkmark" size={18} color="#5dbea3" />
                    )}
                  </TouchableOpacity>
                ))}
              </View>
            </View>

            <View style={styles.pickerSection}>
              <Text style={styles.pickerLabel}>Sublocation (optional)</Text>
              <TextInput
                style={styles.sublocationInput}
                value={sublocation}
                onChangeText={setSublocation}
                placeholder="e.g., Shelf A, Bin 3"
              />
            </View>

            <TouchableOpacity style={styles.confirmButton} onPress={handleConfirmMove}>
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
              <Text style={styles.confirmButtonText}>Confirm Move</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.cancelButton}
              onPress={() => setShowLocationPicker(false)}
            >
              <Text style={styles.cancelButtonText}>Cancel</Text>
            </TouchableOpacity>
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
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 60,
  },
  emptyStateText: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#666',
    marginTop: 15,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#999',
    marginTop: 5,
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
  qtyText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#5dbea3',
  },
  ingredientName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  moveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5dbea3',
    padding: 12,
    borderRadius: 8,
  },
  moveButtonText: {
    color: '#fff',
    fontWeight: '600',
    marginLeft: 8,
  },
  pickerModal: {
    flex: 1,
    justifyContent: 'flex-end',
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
  },
  pickerContent: {
    backgroundColor: '#fff',
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    padding: 20,
    paddingBottom: 30,
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerSection: {
    marginBottom: 20,
  },
  pickerLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  roomOptions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 10,
  },
  roomOption: {
    paddingHorizontal: 15,
    paddingVertical: 10,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#e0e0e0',
    backgroundColor: '#fff',
  },
  roomOptionSelected: {
    backgroundColor: '#5dbea3',
    borderColor: '#5dbea3',
  },
  roomOptionText: {
    color: '#333',
    fontWeight: '500',
  },
  roomOptionTextSelected: {
    color: '#fff',
  },
  sublocationInput: {
    borderWidth: 1,
    borderColor: '#e0e0e0',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
  },
  confirmButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#5dbea3',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
  },
  confirmButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: 'bold',
    marginLeft: 8,
  },
  cancelButton: {
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  cancelButtonText: {
    color: '#666',
    fontSize: 16,
  },
});

export default BhogaStorageMoveScreen;
