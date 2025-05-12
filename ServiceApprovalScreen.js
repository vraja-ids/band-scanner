import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { Picker } from '@react-native-community/picker';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './services/api';

const ServiceApprovalScreen = ({ route, navigation }) => {
  const { tagId, memberDetails } = route.params;
  const [services, setServices] = useState([]);
  const [selectedService, setSelectedService] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    loadServices();
  }, []);

  const loadServices = async () => {
    try {
      const allKeys = await AsyncStorage.getAllKeys();
      const serviceKeys = allKeys.filter(key => key.startsWith('service_'));
      const serviceData = await AsyncStorage.multiGet(serviceKeys);
      const scannerMemberId = await AsyncStorage.getItem('memberId');
      
      const formattedServices = serviceData.map(([key, value]) => {
        const data = JSON.parse(value);
        return {
          serviceId: key.replace('service_', ''),
          ...data
        };
      });
      
      setServices(formattedServices);
    } catch (error) {
      console.error('Error loading services:', error);
    }
  };

  const handleAcknowledgeService = async () => {
    if (!selectedService) return;
    
    setIsLoading(true);
    try {
      const response = await api.post('updateMemberActivity', {
        tagId: tagId,
        activityId: selectedService.serviceId,
        category: 'gifttracking',
        activity: 'servicescan',
        scannerMemberId: scannerMemberId
      });
      
      if (response.success) {
      alert('Service acknowledged successfully');
      navigation.navigate('GiftApproval', { 
        tagId: tagId,
        memberDetails: memberDetails
      });
    } else {
      alert('Error acknowledging service');
    }
    } catch (error) {
      console.error('Error acknowledging service:', error);
      alert('Error acknowledging service');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Service Approval</Text>
        
        <View style={styles.pickerContainer}>
          <Picker
            selectedValue={selectedService?.serviceId}
            onValueChange={(serviceId) => {
              const service = services.find(s => s.serviceId === serviceId);
              setSelectedService(service);
            }}
            style={styles.picker}
          >
            <Picker.Item label="Select a service" value={null} />
            {services.map((service) => (
              <Picker.Item
                key={service.serviceId}
                label={`${service.serviceName} - ${service.displayFields[0]?.key}: ${service.displayFields[0]?.value}`}
                value={service.serviceId}
              />
            ))}
          </Picker>
        </View>

        <TouchableOpacity
          style={[styles.button, (!selectedService || isLoading) && styles.buttonDisabled]}
          onPress={handleAcknowledgeService}
          disabled={!selectedService || isLoading}
        >
          <Text style={styles.buttonText}>
            {isLoading ? 'Processing...' : 'Acknowledge Service'}
          </Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  content: {
    padding: 20,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    marginBottom: 20,
    textAlign: 'center',
  },
  pickerContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 20,
  },
  picker: {
    height: 50,
  },
  button: {
    backgroundColor: '#5dbea3',
    padding: 15,
    borderRadius: 10,
    alignItems: 'center',
  },
  buttonDisabled: {
    backgroundColor: '#ccc',
  },
  buttonText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 18,
  },
});

export default ServiceApprovalScreen; 