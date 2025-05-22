import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, ActivityIndicator, Alert } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { api } from './services/api';
import { useNavigation } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

const ServiceApprovalScreen = ({ route }) => {
  const { tag } = route.params;
  const tagId = tag?.id;
  const [selectedService, setSelectedService] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [isButtonLoading, setIsButtonLoading] = useState(false);
  const [services, setServices] = useState([]);
  const [signedUpServices, setSignedUpServices] = useState([]);
  const navigation = useNavigation();

  useEffect(() => {
    fetchServiceSelectionList();
  }, []);

  const fetchServiceSelectionList = async () => {
    setIsLoading(true);
    const response = await api.get('getServiceSelectionList', {
      tagId: tagId,
      eventId: 'USASadhuSangaRetreat2025',
      validateService: true
    });

      if (response && response.services) {
        const allServices = [];
        const signedUp = [];
        
        // Process each service
        for (const service of response.services) {
          for (const option of service.serviceOptions) {
            const serviceData = {
              serviceId: option.serviceId,
              serviceName: service.serviceName,
              displayFields: option.displayFields,
              isSignedUp: option.isSignedUp
            };
            
            allServices.push(serviceData);
            
            if (option.isSignedUp) {
              signedUp.push(serviceData);
            }
          }
        }
        
        setServices(allServices);
        setSignedUpServices(signedUp);
      }
      setIsLoading(false);
      console.log(services);
      console.log(signedUpServices);
    // } catch (error) {
    //   console.error('Error fetching service selection list:', error);
    //   navigation.navigate('Home');
    //   Alert.alert('Error', 'Failed to fetch service details');
    //   setIsLoading(false);
    // }
  };

  const handleAcknowledgeService = async () => {
    if (!selectedService) return;
    
    setIsButtonLoading(true);
    try {
      const scannerMemberId = await AsyncStorage.getItem('memberId');
      const response = await api.post('updateMemberActivity', {
        tagId: tagId,
        memberId: '',
        apiVersion: "2.0",
        location: selectedService.serviceName,
        activityId: selectedService.serviceId,
        category: 'gifttracking',
        activity: 'servicescan',
        scannerMemberId: scannerMemberId
      });
      
      if (response.success) {
        alert('Service acknowledged successfully');
      } else {
        alert('Error acknowledging service');
      }
    } catch (error) {
      console.error('Error acknowledging service:', error);
      alert('Error acknowledging service');
    } finally {
      setIsButtonLoading(false);
    }
  };

  const renderServiceDetails = () => {
    if (signedUpServices.length === 0) {
      return (
        <View style={styles.noServicesContainer}>
          <Text style={styles.noServicesText}>No Services Signed Up by User</Text>
        </View>
      );
    }

    return (
      <View>
        <Text style={styles.sectionTitle}>Signed Up Services</Text>
        {signedUpServices.map((service, index) => (
          <View key={index} style={styles.serviceItem}>
            <Text style={styles.serviceName}>{service.serviceName}</Text>
            {service.displayFields?.map((field, fieldIndex) => (
              <Text key={fieldIndex} style={styles.serviceDetail}>
                {field.key}: {field.value}
              </Text>
            ))}
          </View>
        ))}
      </View>
    );
  };

  const renderServiceOption = (service) => (
    <TouchableOpacity
      key={service.serviceId}
      style={[
        styles.serviceOption,
        selectedService?.serviceId === service.serviceId && styles.selectedService
      ]}
      onPress={() => setSelectedService(service)}
    >
      <View style={styles.radioContainer}>
        <View style={[
          styles.radio,
          selectedService?.serviceId === service.serviceId && styles.radioSelected
        ]}>
          {selectedService?.serviceId === service.serviceId && (
            <View style={styles.radioInner} />
          )}
        </View>
      </View>
      <View style={styles.serviceTextContainer}>
        <Text style={styles.serviceName}>{service.serviceName}</Text>
        {service.displayFields?.map((field, index) => (
          <Text key={index} style={styles.serviceDetail}>
            {field.key}: {field.value}
          </Text>
        ))}
      </View>
    </TouchableOpacity>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#5dbea3" />
      </View>
    );
  }

  return (
    <ScrollView style={styles.container}>
      <View style={styles.content}>
        <Text style={styles.title}>Service Approval</Text>
        
        <View style={styles.servicesContainer}>
          <ScrollView style={styles.servicesScrollView}>
            {services.map(renderServiceOption)}
          </ScrollView>
        </View>

        <TouchableOpacity
          style={[styles.button, (!selectedService || isButtonLoading) && styles.buttonDisabled]}
          onPress={handleAcknowledgeService}
          disabled={!selectedService || isButtonLoading}
        >
          {isButtonLoading ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text style={styles.buttonText}>Acknowledge Service</Text>
          )}
        </TouchableOpacity>

        <View style={styles.serviceDetailsContainer}>
          {renderServiceDetails()}
        </View>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#fff',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    marginBottom: 10,
    color: '#333',
  },
  servicesContainer: {
    borderWidth: 1,
    borderColor: '#ccc',
    borderRadius: 5,
    marginBottom: 20,
    height: 300, // Shows approximately 5 services
  },
  servicesScrollView: {
    flex: 1,
  },
  serviceOption: {
    flexDirection: 'row',
    padding: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#eee',
    alignItems: 'center',
  },
  selectedService: {
    backgroundColor: '#f0f9f6',
  },
  radioContainer: {
    marginRight: 15,
  },
  radio: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#5dbea3',
    alignItems: 'center',
    justifyContent: 'center',
  },
  radioSelected: {
    borderColor: '#5dbea3',
  },
  radioInner: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#5dbea3',
  },
  serviceTextContainer: {
    flex: 1,
  },
  serviceName: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 4,
  },
  serviceDetail: {
    fontSize: 14,
    color: '#666',
    marginBottom: 2,
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
  serviceDetailsContainer: {
    backgroundColor: '#f5f5f5',
    padding: 15,
    borderRadius: 10,
    marginTop: 10,
    width: '100%',
  },
  serviceItem: {
    backgroundColor: 'white',
    padding: 10,
    borderRadius: 8,
    marginBottom: 10,
  },
  noServicesContainer: {
    padding: 20,
    alignItems: 'center',
  },
  noServicesText: {
    fontSize: 16,
    color: '#666',
    fontStyle: 'italic',
  },
});

export default ServiceApprovalScreen; 