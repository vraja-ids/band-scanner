import React, { useEffect, useState, useCallback } from 'react';
import { StyleSheet, View, TouchableOpacity, Text, Image, ScrollView, SafeAreaView } from 'react-native';
import { getString, Keys } from '../../storage/Session';
import { LinearGradient } from 'expo-linear-gradient';
import { fetchMealActivity, updateMealActivity } from './MealsViewModel';
import type { GetMemberMealActivityRequest, UpdateMealActivityRequest } from './models/api';
import { Ionicons } from '@expo/vector-icons';
import Routes from '../../routes/index';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from '@react-navigation/native';

function MealScanScreen(props: any) {
  const { navigation } = props;
  const { tag } = props.route.params;
  const { location } = props.route.params;
  const { mealId, mealName } = props.route.params;
  const [isLoading, setLoading] = useState(true);
  const [data, setData] = useState<any>({});
  const [isMealValid, setIsMealValid] = useState(false);
  const [curMealCount, setMealCount] = useState(0);
  const [refreshing, setRefreshing] = useState(false);
  const [currentMealId, setCurrentMealId] = useState<string | undefined>(mealId);
  const [currentMealDisplayName, setCurrentMealDisplayName] = useState<string | undefined>(mealName);
  const [error, setError] = useState(false);
  const [isInitialLoad, setIsInitialLoad] = useState(true);
  const [isProcessing, setIsProcessing] = useState(false);
  const [justAddedFirstMeal, setJustAddedFirstMeal] = useState(false);
  const insets = useSafeAreaInsets();

  const fetchMealDetails = useCallback((tagin: any, skipAutoAdd: boolean = false) => {
    // Don't show loading spinner if we already have data (refreshing)
    if (!data.memberActivityDetails) {
      setLoading(true);
    }
    const currentMeal = currentMealId || 'unknown';
    const req: GetMemberMealActivityRequest = { tagId: tagin.id, activity: currentMeal, category: 'mealtracking' };
    fetchMealActivity(req)
      .then(async (json: any) => {
        const memberData = json.data?.memberActivityDetails || json.memberActivityDetails;
        const newState = { memberActivityDetails: memberData };
        setData(newState);
        setError(false);
        const shouldAutoAdd = !skipAutoAdd;
        console.log('[MealScan] fetchMealDetails - skipAutoAdd:', skipAutoAdd, 'shouldAutoAdd:', shouldAutoAdd, 'isProcessing:', isProcessing);
        // Always update meal count from fresh data (unless processing to avoid flash)
        if (!isProcessing) {
          UpdateCurrMeal(currentMeal, { memberActivityDetails: memberData }, shouldAutoAdd);
        } else {
          console.log('[MealScan] Skipping UpdateCurrMeal (isProcessing=true)');
        }
        // Mark initial load as complete
        setIsInitialLoad(false);
      })
      .catch((error: any) => {
        if (error.response && error.response.status === 404) {
          alert('No member tracking details found for this tag');
        } else {
          console.error(error);
          setError(true);
        }
      })
      .finally(() => {
        setLoading(false);
        setRefreshing(true);
      });
  }, [currentMealId]);

  // Reset state when screen comes into focus (new scan) and refetch data
  useFocusEffect(
    useCallback(() => {
      console.log('[MealScan] === Screen focused, resetting state ===');
      console.log('[MealScan] tag.id:', tag?.id);
      setIsInitialLoad(true);
      setJustAddedFirstMeal(false);
      setIsMealValid(false);
      setMealCount(0);
      fetchMealDetails(tag);
      return () => {
        // Cleanup if needed
      };
    }, [tag])
  );

  const UpdateCurrMeal = (mealType: string, data: any, isInitial: boolean = false) => {
    if (data && data.memberActivityDetails) {
      const totalCountValue = data.memberActivityDetails.totalCount;
      if (totalCountValue === undefined || totalCountValue === null) {
        updateMealValidity('0', data, isInitial);
      } else {
        updateMealValidity(JSON.stringify(totalCountValue), data, isInitial);
      }
    }
  };

  const updateMealValidity = (mealC: any, data: any, isInitial: boolean = false) => {
    const currentMeal = currentMealId || 'unknown';
    const integerDatax = parseInt(mealC);
    console.log('[MealScan] updateMealValidity - count:', integerDatax, 'isInitial:', isInitial, 'isProcessing:', isProcessing);
    setMealCount(integerDatax);

    if (Number.isInteger(integerDatax) && integerDatax == 0) {
      console.log('[MealScan] Count is 0, setting green, justAddedFirstMeal=false');
      setIsMealValid(true);
      setJustAddedFirstMeal(false);
      // Only auto-add on initial load (when isInitial=true)
      if (isInitial) {
        console.log('[MealScan] Auto-adding meal (isInitial=true)');
        addMemberActivity(currentMeal, data);
      } else {
        console.log('[MealScan] Skipping auto-add (isInitial=false)');
      }
    } else if (Number.isInteger(integerDatax) && integerDatax >= 1) {
      console.log('[MealScan] Count >= 1:', integerDatax, 'justAddedFirstMeal:', justAddedFirstMeal, 'isInitial:', isInitial);
      // Priority: justAddedFirstMeal (green for 0→1 transition) > isInitial (alert) > count
      if (justAddedFirstMeal && integerDatax === 1) {
        console.log('[MealScan] Green: justAddedFirstMeal=true, count=1');
        setIsMealValid(true);
        // Don't reset flag here - let it be reset by count=0 or new scan
      } else if (isInitial && integerDatax >= 1 && !justAddedFirstMeal) {
        // Scanning someone who already has meals - red and alert
        console.log('[MealScan] RED + ALERT: isInitial=true, count>=1, not justAdded');
        setIsMealValid(false);
        alert(`Already served ${integerDatax} meal(s) for ${data.memberActivityDetails?.legalName || 'this devotee'}`);
      } else {
        console.log('[MealScan] Setting validity based on count === 0:', integerDatax === 0);
        // After manual add/remove, follow the count
        setIsMealValid(integerDatax === 0);
      }
    }
  };

  const getLocation = () => {
    const locationValue = Array.isArray(location) ? location : [location];
    return locationValue
      .map((value: any) => {
        if (value >= 1 && value <= 6) return `Lane ${value}`;
        if (value == 10) return 'VIP Lane';
        return `Lane ${value}`; // Default fallback
      })
      .join(', ');
  };

  const addMemberActivity = async (meal: string, dataParam: any) => {
    console.log('[MealScan] addMemberActivity called - isProcessing:', isProcessing, 'has dataParam:', !!dataParam?.memberActivityDetails);
    // Use current data state if param is missing
    const dataToUse = dataParam?.memberActivityDetails ? dataParam : data;
    console.log('[MealScan] addMemberActivity - using data from:', dataParam?.memberActivityDetails ? 'param' : 'state', 'has memberActivityDetails:', !!dataToUse?.memberActivityDetails);

    if (isProcessing || !dataToUse?.memberActivityDetails) {
      console.log('[MealScan] addMemberActivity blocked - isProcessing:', isProcessing, 'has memberActivityDetails:', !!dataToUse?.memberActivityDetails);
      return;
    }

    setIsProcessing(true);
    console.log('[MealScan] addMemberActivity proceeding...');
    const formattedLocation = getLocation();
    const currentScannerId = await getString(Keys.INTERNAL_MEMBER_ID);
    const eventId = await getString('selectedEventId');
    const mealdata: UpdateMealActivityRequest = {
      tagId: dataToUse.memberActivityDetails.tagId,
      apiVersion: '2.9',
      location: formattedLocation,
      activity: meal,
      category: 'mealtracking',
      activityId: 0,
      scannerMemberId: currentScannerId,
      remove: false,
      eventId: eventId || undefined,
    };

    // Capture current count BEFORE any state changes
    const beforeCount = curMealCount;
    console.log('[MealScan] addMemberActivity - beforeCount:', beforeCount);

    updateMealActivity(mealdata)
      .then(async (response: any) => {
        // requestAsApiResponse wraps response: { status: 'success', data: { count: ... } }
        const newCount = response?.data?.count || 0;
        console.log('[MealScan] addMemberActivity - newCount:', newCount, 'beforeCount was:', beforeCount);
        setMealCount(newCount);

        // If transitioning from 0 to 1, mark as just added first meal (green)
        if (beforeCount === 0 && newCount === 1) {
          console.log('[MealScan] 0→1 transition: setting justAddedFirstMeal=TRUE, isMealValid=TRUE');
          setJustAddedFirstMeal(true);
          setIsMealValid(true);
        } else {
          console.log('[MealScan] Not 0→1: setting isMealValid based on count===0:', newCount === 0);
          setIsMealValid(newCount === 0);
        }

        // Don't fetch again - we already have the response
        // Just update data state silently
        setIsProcessing(false);
      })
      .catch((error: any) => {
        console.error('[MealScan] Add failed:', error);
        alert('Failed to add meal');
        setIsProcessing(false);
      });
  };

  const removeMemberActivity = async (meal: string, dataParam: any) => {
    // Use current data state if param is missing
    const dataToUse = dataParam?.memberActivityDetails ? dataParam : data;
    if (isProcessing || !dataToUse?.memberActivityDetails) return;

    setIsProcessing(true);
    const formattedLocation = getLocation();
    const currentScannerId = await getString(Keys.INTERNAL_MEMBER_ID);
    const eventId = await getString('selectedEventId');
    const mealdata: UpdateMealActivityRequest = {
      tagId: dataToUse.memberActivityDetails.tagId,
      apiVersion: '2.9',
      location: formattedLocation,
      activity: meal,
      category: 'mealtracking',
      activityId: 0,
      scannerMemberId: currentScannerId,
      remove: true,
      eventId: eventId || undefined,
    };
    updateMealActivity(mealdata)
      .then((response: any) => {
        // requestAsApiResponse wraps response: { status: 'success', data: { count: ... } }
        const newCount = response?.data?.count || 0;
        console.log('[MealScan] removeMemberActivity - newCount:', newCount);
        setMealCount(newCount);
        setJustAddedFirstMeal(false);
        setIsMealValid(newCount === 0);
        setIsProcessing(false);
      })
      .catch((error: any) => {
        console.error('[MealScan] Remove failed:', error);
        alert('Failed to remove meal');
        setIsProcessing(false);
      });
  };

  // Sync UI state when processing ends
  useEffect(() => {
    if (!isProcessing && !isInitialLoad && data.memberActivityDetails) {
      const totalCount = data.memberActivityDetails.totalCount || 0;
      setIsMealValid(totalCount === 0 || (justAddedFirstMeal && totalCount === 1));
    }
  }, [isProcessing]);

  const handleNextScan = () => {
    navigation.navigate(Routes.Scanner, {
      location,
      screen: Routes.MealScan,
      mealId: currentMealId,
      mealName: currentMealDisplayName,
    });
  };

  if (isLoading) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.loadingContainer}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </SafeAreaView>
    );
  }

  if (error || !data.memberActivityDetails) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Ionicons name="warning-outline" size={64} color="#FF6B6B" />
          <Text style={styles.errorTitle}>Tag Not Found</Text>
          <Text style={styles.errorMessage}>Please check if the tag is registered</Text>
          <TouchableOpacity style={styles.backButton} onPress={() => navigation.navigate(Routes.Home)}>
            <Text style={styles.backButtonText}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  const item = data.memberActivityDetails;
  const statusColor = isMealValid ? '#4CAF50' : '#FF6B6B';
  const statusText = isMealValid ? 'Ready for Meal' : 'Already Served';
  const mealDisplay = currentMealDisplayName || currentMealId || 'Meal';

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView style={styles.scrollView} showsVerticalScrollIndicator={false}>
        {/* Header with Home Button */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Meal Scan</Text>
          <TouchableOpacity style={styles.homeButton} onPress={() => navigation.navigate(Routes.Home)}>
            <Ionicons name="home" size={24} color="#fff" />
          </TouchableOpacity>
        </View>

        {/* Meal Status Card */}
        <View style={styles.card}>
          <LinearGradient
            colors={[isMealValid ? '#4CAF50' : '#FF6B6B', isMealValid ? '#81C784' : '#FF8A80']}
            style={styles.statusGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
          >
            <View style={styles.statusContent}>
              <View style={styles.statusLeft}>
                <Ionicons name={isMealValid ? "checkmark-circle" : "close-circle"} size={32} color="#fff" />
                <View style={styles.statusTextContainer}>
                  <Text style={styles.statusTitle}>{statusText}</Text>
                  <Text style={styles.statusSubtitle}>{mealDisplay}</Text>
                </View>
              </View>
              <View style={styles.countContainer}>
                <Text style={styles.countNumber}>{curMealCount}</Text>
                <Text style={styles.countLabel}>Meals</Text>
              </View>
            </View>
          </LinearGradient>
        </View>

        {/* Person Info Card */}
        <View style={styles.card}>
          <View style={styles.cardHeader}>
            <Ionicons name="person" size={24} color="#5dbea3" />
            <Text style={styles.cardTitle}>Devotee Information</Text>
          </View>

          {/* Name */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="person-outline" size={18} color="#666" />
              <Text style={styles.infoLabel}>Name</Text>
            </View>
            <Text style={styles.infoValue}>{item.legalName}</Text>
          </View>

          {/* Spiritual Name */}
          {item.spiritualName && (
            <View style={styles.infoRow}>
              <View style={styles.infoLabelContainer}>
                <Ionicons name="sparkles" size={18} color="#666" />
                <Text style={styles.infoLabel}>Spiritual Name</Text>
              </View>
              <Text style={styles.infoValue}>{item.spiritualName}</Text>
            </View>
          )}

          {/* Member ID */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="id-card" size={18} color="#666" />
              <Text style={styles.infoLabel}>Member ID</Text>
            </View>
            <View style={styles.memberIdContainer}>
              <Text style={styles.infoValue}>{item.memberId}</Text>
            </View>
          </View>

          {/* Tag ID */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="barcode" size={18} color="#666" />
              <Text style={styles.infoLabel}>Tag ID</Text>
            </View>
            <Text style={styles.infoValue}>{item.tagId}</Text>
          </View>

          {/* Registration Type */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="calendar" size={18} color="#666" />
              <Text style={styles.infoLabel}>Registration</Text>
            </View>
            <View style={styles.registrationBadge}>
              <Text style={styles.registrationText}>{item.registrationType}</Text>
            </View>
          </View>

          {/* Meal Option */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="restaurant" size={18} color="#666" />
              <Text style={styles.infoLabel}>Meal Option</Text>
            </View>
            <Text style={styles.infoValue}>{item.mealOption}</Text>
          </View>

          {/* SP Disciple */}
          <View style={styles.infoRow}>
            <View style={styles.infoLabelContainer}>
              <Ionicons name="heart" size={18} color="#666" />
              <Text style={styles.infoLabel}>SP Disciple</Text>
            </View>
            <View style={[styles.discipleBadge, item.isSPDisciple === 'Y' && styles.discipleBadgeYes]}>
              <Text style={[styles.discipleText, item.isSPDisciple === 'Y' && styles.discipleTextYes]}>
                {item.isSPDisciple === 'Y' ? 'Yes' : 'No'}
              </Text>
              {item.isSPDisciple === 'Y' && (
                <Image
                  source={{ uri: 'https://storage.googleapis.com/sadhu-sanga/1/2023/05/Add_a_little_bit_of_body_text__5_-removebg-preview.png' }}
                  style={styles.discipleImage}
                />
              )}
            </View>
          </View>
        </View>

        {/* Action Buttons */}
        <View style={styles.actionsContainer}>
          <TouchableOpacity
            style={[styles.actionButton, styles.removeButton]}
            onPress={() => removeMemberActivity(currentMealId || 'unknown', data)}
          >
            <LinearGradient colors={['#FF6B6B', '#FF8A80']} style={styles.actionButtonGradient}>
              <Ionicons name="remove-circle" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Remove Meal</Text>
            </LinearGradient>
          </TouchableOpacity>

          <TouchableOpacity
            style={[styles.actionButton, styles.addButton]}
            onPress={() => addMemberActivity(currentMealId || 'unknown', data)}
          >
            <LinearGradient colors={['#4CAF50', '#81C784']} style={styles.actionButtonGradient}>
              <Ionicons name="add-circle" size={24} color="#fff" />
              <Text style={styles.actionButtonText}>Add Meal</Text>
            </LinearGradient>
          </TouchableOpacity>
        </View>

        {/* Next Scan Button */}
        <TouchableOpacity style={styles.nextScanButton} onPress={handleNextScan}>
          <LinearGradient
            colors={['#5dbea3', '#7EDCC6']}
            style={styles.nextScanGradient}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 0 }}
          >
            <Ionicons name="qr-code" size={28} color="#fff" />
            <Text style={styles.nextScanText}>Next Scan</Text>
            <Ionicons name="arrow-forward" size={24} color="#fff" />
          </LinearGradient>
        </TouchableOpacity>

        <View style={{ height: 40 }} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#F5F7FA',
  },
  scrollView: {
    flex: 1,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontSize: 18,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  errorTitle: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 20,
  },
  errorMessage: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
    marginTop: 10,
  },
  backButton: {
    marginTop: 20,
    backgroundColor: '#5dbea3',
    paddingHorizontal: 30,
    paddingVertical: 12,
    borderRadius: 25,
  },
  backButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 8,
    backgroundColor: '#5dbea3',
    minHeight: 44,
  },
  headerTitle: {
    fontSize: 22,
    fontWeight: 'bold',
    color: '#fff',
  },
  homeButton: {
    padding: 8,
    borderRadius: 20,
    backgroundColor: 'rgba(255,255,255,0.2)',
  },
  card: {
    marginLeft: 16,
    marginRight: 16,
    marginBottom: 16,
    marginTop: 8,
    backgroundColor: '#fff',
    borderRadius: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 4,
    overflow: 'hidden',
  },
  cardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 15,
    borderBottomWidth: 1,
    borderBottomColor: '#F0F0F0',
    gap: 10,
  },
  cardTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
  },
  statusGradient: {
    paddingVertical: 20,
  },
  statusContent: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
  },
  statusLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
  },
  statusTextContainer: {
    gap: 2,
  },
  statusTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
  statusSubtitle: {
    fontSize: 14,
    color: 'rgba(255,255,255,0.9)',
  },
  countContainer: {
    alignItems: 'center',
    backgroundColor: 'rgba(255,255,255,0.2)',
    paddingHorizontal: 20,
    paddingVertical: 10,
    borderRadius: 15,
  },
  countNumber: {
    fontSize: 32,
    fontWeight: 'bold',
    color: '#fff',
  },
  countLabel: {
    fontSize: 12,
    color: 'rgba(255,255,255,0.9)',
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingVertical: 14,
    borderBottomWidth: 1,
    borderBottomColor: '#F5F5F5',
  },
  infoLabelContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoLabel: {
    fontSize: 15,
    color: '#666',
    fontWeight: '500',
  },
  infoValue: {
    fontSize: 16,
    color: '#333',
    fontWeight: '600',
  },
  memberIdContainer: {
    backgroundColor: '#F0F7FF',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  registrationBadge: {
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  registrationText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#4CAF50',
  },
  discipleBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#F5F5F5',
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 10,
  },
  discipleBadgeYes: {
    backgroundColor: '#FFF3E0',
  },
  discipleText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
  },
  discipleTextYes: {
    color: '#FF9800',
  },
  discipleImage: {
    width: 24,
    height: 24,
  },
  actionsContainer: {
    flexDirection: 'row',
    marginHorizontal: 16,
    gap: 12,
  },
  actionButton: {
    flex: 1,
    borderRadius: 16,
    overflow: 'hidden',
    height: 70,
  },
  actionButtonGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
  },
  actionButtonText: {
    fontSize: 16,
    fontWeight: 'bold',
    color: '#fff',
  },
  nextScanButton: {
    marginHorizontal: 16,
    marginTop: 12,
    marginBottom: 8,
    borderRadius: 24,
    overflow: 'hidden',
    height: 80,
  },
  nextScanGradient: {
    flex: 1,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 12,
  },
  nextScanText: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#fff',
  },
});

export default MealScanScreen;
