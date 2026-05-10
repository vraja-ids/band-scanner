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
  Modal,
  SafeAreaView,
} from 'react-native';
import { StackNavigationProp } from '@react-navigation/stack';
import { Ionicons } from '@expo/vector-icons';
import { bhogaSheetsService, StorageLocation, Ingredient } from '../../services/BhogaSheetsService';
import { Routes } from '../../routes';

type BhogaAdminScreenNavigationProp = StackNavigationProp<any, any>;

interface Props {
  navigation: BhogaAdminScreenNavigationProp;
}

interface EditableLocation extends StorageLocation {
  isNew?: boolean;
}

const SUBLOCATION_OPTIONS = [
  { label: 'Shelf A', value: 'Shelf A' },
  { label: 'Shelf B', value: 'Shelf B' },
  { label: 'Shelf C', value: 'Shelf C' },
  { label: 'Shelf D', value: 'Shelf D' },
  { label: 'Shelf E', value: 'Shelf E' },
  { label: 'Shelf F', value: 'Shelf F' },
  { label: 'Top', value: 'Top' },
  { label: 'Middle', value: 'Middle' },
  { label: 'Bottom', value: 'Bottom' },
  { label: 'Left', value: 'Left' },
  { label: 'Right', value: 'Right' },
  { label: 'Front', value: 'Front' },
  { label: 'Back', value: 'Back' },
  { label: 'Bin 1', value: 'Bin 1' },
  { label: 'Bin 2', value: 'Bin 2' },
  { label: 'Bin 3', value: 'Bin 3' },
  { label: 'Bin 4', value: 'Bin 4' },
  { label: 'Bin 5', value: 'Bin 5' },
  { label: 'Custom...', value: 'custom' },
];

const ROOM_OPTIONS = [
  'Main Storage',
  'Walk-in Fridge',
  'Walk-in Freezer',
  'Pantry',
  'Dry Storage',
  'Kitchen',
];

const BhogaAdminScreen: FC<Props> = ({ navigation }) => {
  const [isLoading, setIsLoading] = useState(true);
  const [locations, setLocations] = useState<EditableLocation[]>([]);
  const [ingredients, setIngredients] = useState<Ingredient[]>([]);
  const [editingLocation, setEditingLocation] = useState<EditableLocation | null>(null);
  const [showSublocationPicker, setShowSublocationPicker] = useState(false);
  const [showRoomPicker, setShowRoomPicker] = useState(false);
  const [customSublocation, setCustomSublocation] = useState('');

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      const [locs, ingData] = await Promise.all([
        bhogaSheetsService.getStorageLocations(),
        bhogaSheetsService.getIngredientList(),
      ]);

      setLocations(locs);
      setIngredients(ingData.ingredients);
    } catch (error) {
      console.error('Error loading data:', error);
      Alert.alert('Error', 'Failed to load data.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleSave = async () => {
    if (!editingLocation) return;

    if (!editingLocation.ingredientName || !editingLocation.room) {
      Alert.alert('Error', 'Ingredient and Room are required');
      return;
    }

    try {
      setIsLoading(true);

      await bhogaSheetsService.updateStorageLocation(
        editingLocation.ingredientName,
        editingLocation.room,
        editingLocation.sublocation,
        editingLocation.initialStock,
        editingLocation.unit
      );

      Alert.alert('Success', 'Storage location updated');

      setEditingLocation(null);
      await loadData();
    } catch (error) {
      console.error('Error saving:', error);
      Alert.alert('Error', 'Failed to save. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddNew = () => {
    setEditingLocation({
      ingredientName: '',
      room: '',
      sublocation: '',
      initialStock: 0,
      currentStock: 0,
      unit: '',
      isNew: true,
    });
  };

  const handleEdit = (location: EditableLocation) => {
    setEditingLocation({ ...location });
  };

  const handleDelete = async (location: EditableLocation) => {
    Alert.alert(
      'Delete Location',
      `Remove storage location for ${location.ingredientName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              // For now, we'll set stock to 0 as a soft delete
              await bhogaSheetsService.updateStorageLocation(
                location.ingredientName,
                location.room,
                location.sublocation,
                0,
                location.unit
              );
              await loadData();
            } catch (error) {
              Alert.alert('Error', 'Failed to delete');
            }
          },
        },
      ]
    );
  };

  const selectSublocation = (value: string) => {
    if (value === 'custom') {
      setShowSublocationPicker(false);
      setCustomSublocation('');
      // Show custom input modal
      setEditingLocation(prev => prev ? { ...prev, sublocation: '' } : null);
    } else {
      setEditingLocation(prev => prev ? { ...prev, sublocation: value } : null);
      setShowSublocationPicker(false);
    }
  };

  const groupedLocations = locations.reduce((acc, loc) => {
    if (!acc[loc.room]) {
      acc[loc.room] = [];
    }
    acc[loc.room].push(loc);
    return acc;
  }, {} as Record<string, EditableLocation[]>);

  if (isLoading && !editingLocation) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#5dbea3" />
      </View>
    );
  }

  if (editingLocation) {
    return (
      <View style={styles.container}>
        <SafeAreaView>
          <View style={styles.header}>
            <TouchableOpacity onPress={() => setEditingLocation(null)} style={styles.backButton}>
              <Ionicons name="close" size={24} color="#5dbea3" />
            </TouchableOpacity>
            <Text style={styles.headerTitle}>
              {editingLocation.isNew ? 'Add Location' : 'Edit Location'}
            </Text>
            <View style={{ width: 24 }} />
          </View>
        </SafeAreaView>

        <ScrollView style={styles.content}>
          <View style={styles.formSection}>
            <Text style={styles.formLabel}>Ingredient *</Text>
            <TextInput
              style={styles.formInput}
              value={editingLocation.ingredientName}
              onChangeText={text => setEditingLocation({ ...editingLocation, ingredientName: text })}
              placeholder="e.g., Ginger"
              placeholderTextColor="#999"
            />

            {!editingLocation.isNew && (
              <>
                <Text style={styles.formLabel}>Current Stock</Text>
                <Text style={styles.stockDisplay}>
                  {editingLocation.currentStock} / {editingLocation.initialStock} {editingLocation.unit}
                </Text>
              </>
            )}

            {editingLocation.isNew && (
              <>
                <Text style={styles.formLabel}>Initial Stock</Text>
                <View style={styles.quantityRow}>
                  <TextInput
                    style={[styles.formInput, styles.quantityInput]}
                    value={editingLocation.initialStock.toString()}
                    onChangeText={text => setEditingLocation({
                      ...editingLocation,
                      initialStock: parseFloat(text) || 0,
                      currentStock: parseFloat(text) || 0,
                    })}
                    placeholder="0"
                    placeholderTextColor="#999"
                    keyboardType="decimal-pad"
                  />
                  <TextInput
                    style={[styles.formInput, styles.unitInput]}
                    value={editingLocation.unit}
                    onChangeText={text => setEditingLocation({ ...editingLocation, unit: text })}
                    placeholder="unit (lbs, kg, etc.)"
                    placeholderTextColor="#999"
                  />
                </View>
              </>
            )}

            <Text style={styles.formLabel}>Room *</Text>
            <TouchableOpacity
              style={styles.formInput}
              onPress={() => setShowRoomPicker(true)}
            >
              <Text style={editingLocation.room ? styles.pickerValue : styles.pickerPlaceholder}>
                {editingLocation.room || 'Select Room'}
              </Text>
              <Ionicons name="chevron-down" size={20} color="#666" />
            </TouchableOpacity>

            <Text style={styles.formLabel}>Sublocation (Optional)</Text>
              <TouchableOpacity
                style={styles.formInput}
                onPress={() => setShowSublocationPicker(true)}
              >
                <Text style={editingLocation.sublocation ? styles.pickerValue : styles.pickerPlaceholder}>
                  {editingLocation.sublocation || 'Select Sublocation'}
                </Text>
                <Ionicons name="chevron-down" size={20} color="#666" />
              </TouchableOpacity>
              {editingLocation.sublocation === '' && (
                <TextInput
                  style={styles.formInput}
                  value={customSublocation}
                  onChangeText={setCustomSublocation}
                  placeholder="Enter custom sublocation"
                  placeholderTextColor="#999"
                />
              )}
          </View>

          <TouchableOpacity style={styles.saveButton} onPress={handleSave}>
            <Text style={styles.saveButtonText}>Save</Text>
          </TouchableOpacity>
        </ScrollView>

        <Modal visible={showRoomPicker} transparent animationType="slide">
          <TouchableOpacity
            style={styles.pickerModal}
            activeOpacity={1}
            onPress={() => setShowRoomPicker(false)}
          >
            <TouchableOpacity
              style={styles.pickerContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.pickerTitle}>Select Room</Text>
              <ScrollView>
                {ROOM_OPTIONS.map(room => (
                  <TouchableOpacity
                    key={room}
                    style={styles.pickerOption}
                    onPress={() => {
                      setEditingLocation({ ...editingLocation, room });
                      setShowRoomPicker(false);
                    }}
                  >
                    <Text style={styles.pickerOptionText}>{room}</Text>
                    {editingLocation.room === room && (
                      <Ionicons name="checkmark" size={20} color="#5dbea3" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.pickerCloseButton}
                onPress={() => setShowRoomPicker(false)}
              >
                <Text style={styles.pickerCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>

        <Modal visible={showSublocationPicker} transparent animationType="slide">
          <TouchableOpacity
            style={styles.pickerModal}
            activeOpacity={1}
            onPress={() => setShowSublocationPicker(false)}
          >
            <TouchableOpacity
              style={styles.pickerContent}
              activeOpacity={1}
              onPress={(e) => e.stopPropagation()}
            >
              <Text style={styles.pickerTitle}>Select Sublocation</Text>
              <ScrollView>
                {SUBLOCATION_OPTIONS.map(option => (
                  <TouchableOpacity
                    key={option.value}
                    style={styles.pickerOption}
                    onPress={() => selectSublocation(option.value)}
                  >
                    <Text style={styles.pickerOptionText}>{option.label}</Text>
                    {editingLocation.sublocation === option.value && (
                      <Ionicons name="checkmark" size={20} color="#5dbea3" />
                    )}
                  </TouchableOpacity>
                ))}
              </ScrollView>
              <TouchableOpacity
                style={styles.pickerCloseButton}
                onPress={() => setShowSublocationPicker(false)}
              >
                <Text style={styles.pickerCloseButtonText}>Cancel</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </TouchableOpacity>
        </Modal>
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
          <Text style={styles.headerTitle}>Storage Setup</Text>
          <TouchableOpacity onPress={handleAddNew} style={styles.addButton}>
            <Ionicons name="add" size={24} color="#5dbea3" />
          </TouchableOpacity>
        </View>
      </SafeAreaView>

      <ScrollView style={styles.content}>
        {Object.keys(groupedLocations).length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="cube-outline" size={64} color="#ccc" />
            <Text style={styles.emptyStateText}>No storage locations configured</Text>
            <Text style={styles.emptyStateSubtext}>
              Tap + to add your first storage location
            </Text>
          </View>
        ) : (
          Object.entries(groupedLocations).map(([room, roomLocations]) => (
            <View key={room} style={styles.roomSection}>
              <View style={styles.roomHeader}>
                <Ionicons name="home-outline" size={20} color="#5dbea3" />
                <Text style={styles.roomTitle}>{room}</Text>
                <Text style={styles.roomCount}>{roomLocations.length} items</Text>
              </View>

              {roomLocations.map((location, index) => {
                const percentage = location.initialStock > 0
                  ? (location.currentStock / location.initialStock) * 100
                  : 0;

                return (
                  <View key={index} style={styles.locationCard}>
                    <View style={styles.locationInfo}>
                      <Text style={styles.ingredientName}>{location.ingredientName}</Text>
                      {location.sublocation && (
                        <View style={styles.sublocationBadge}>
                          <Text style={styles.sublocationText}>{location.sublocation}</Text>
                        </View>
                      )}
                    </View>

                    <View style={styles.stockRow}>
                      <Text style={styles.stockText}>
                        {location.currentStock} / {location.initialStock} {location.unit}
                      </Text>
                      <View style={styles.stockBar}>
                        <View
                          style={[
                            styles.stockBarFill,
                            { width: `${Math.min(100, percentage)}%` },
                          ]}
                        />
                      </View>
                    </View>

                    <View style={styles.actions}>
                      <TouchableOpacity
                        style={styles.editButton}
                        onPress={() => handleEdit(location)}
                      >
                        <Ionicons name="create-outline" size={20} color="#5dbea3" />
                      </TouchableOpacity>
                      <TouchableOpacity
                        style={styles.deleteButton}
                        onPress={() => handleDelete(location)}
                      >
                        <Ionicons name="trash-outline" size={20} color="#ff6b6b" />
                      </TouchableOpacity>
                    </View>
                  </View>
                );
              })}
            </View>
          ))
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
  addButton: {
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
  roomSection: {
    marginBottom: 20,
  },
  roomHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 12,
    paddingBottom: 8,
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  roomTitle: {
    flex: 1,
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginLeft: 8,
  },
  roomCount: {
    fontSize: 14,
    color: '#666',
  },
  locationCard: {
    backgroundColor: '#fff',
    borderRadius: 8,
    padding: 12,
    marginBottom: 8,
    flexDirection: 'row',
    alignItems: 'center',
  },
  locationInfo: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
  },
  ingredientName: {
    fontSize: 15,
    fontWeight: '600',
    color: '#333',
  },
  sublocationBadge: {
    backgroundColor: '#e3f2fd',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
    marginLeft: 8,
  },
  sublocationText: {
    fontSize: 11,
    color: '#1976d2',
    fontWeight: '600',
  },
  stockRow: {
    alignItems: 'flex-end',
    marginRight: 15,
  },
  stockText: {
    fontSize: 12,
    color: '#666',
    marginBottom: 4,
  },
  stockBar: {
    width: 80,
    height: 6,
    backgroundColor: '#e0e0e0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  stockBarFill: {
    height: '100%',
    backgroundColor: '#5dbea3',
  },
  actions: {
    flexDirection: 'row',
    gap: 10,
  },
  editButton: {
    padding: 8,
  },
  deleteButton: {
    padding: 8,
  },
  formSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 15,
    marginBottom: 15,
  },
  formLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
    marginTop: 15,
  },
  formInput: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
    padding: 12,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  pickerValue: {
    fontSize: 16,
    color: '#333',
  },
  pickerPlaceholder: {
    fontSize: 16,
    color: '#999',
  },
  quantityRow: {
    flexDirection: 'row',
    gap: 10,
  },
  quantityInput: {
    flex: 1,
  },
  unitInput: {
    flex: 2,
  },
  stockDisplay: {
    fontSize: 16,
    color: '#333',
    padding: 12,
    backgroundColor: '#f5f5f5',
    borderRadius: 8,
  },
  saveButton: {
    backgroundColor: '#5dbea3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  saveButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
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
    maxHeight: '70%',
  },
  pickerTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 15,
  },
  pickerOption: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#f0f0f0',
  },
  pickerOptionText: {
    fontSize: 16,
    color: '#333',
  },
  pickerCloseButton: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  pickerCloseButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#666',
  },
});

export default BhogaAdminScreen;
