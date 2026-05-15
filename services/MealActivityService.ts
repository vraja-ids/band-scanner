/**
 * Meal Activity Service
 * Fetches meal scanning statistics from the backend API
 */

import { requestAsApiResponse, getPublic } from '../network/api';

// API Request/Response types
export interface GetMealActivityStatsRequest {
  eventId: string;
  activity: string; // meal_id (e.g., 'friDinner', 'satBreakfast')
  activityDate: string; // YYYY-MM-DD format
  scannerMemberId: string;
  category?: string; // 'mealtracking' for meal activity stats
}

// Activity item from the response
export interface ActivityItem {
  activityName: string;
  totalCount: number;
  displayFields?: Array<{ key: string; value: string }>;
}

/**
 * Get today's date in YYYY-MM-DD format
 */
export function getTodayDate(): string {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, '0');
  const day = String(today.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

/**
 * Get meal activity stats (number of devotees scanned for a meal)
 * Uses getActivityStats endpoint with category: 'mealtracking'
 */
export const getMealActivityStats = async (
  payload: GetMealActivityStatsRequest
): Promise<{ activities: ActivityItem[] }> => {
  return getPublic('getActivityStats', { ...payload, category: 'mealtracking', adminId: '1234' });
};

/**
 * Get meal activity stats for a specific meal
 * Returns the number of devotees scanned for that meal
 */
export async function getDevoteesCountForMeal(
  eventId: string,
  mealActivityId: string,
  scannerMemberId: string
): Promise<number> {
  try {
    const result = await getMealActivityStats({
      eventId,
      activity: mealActivityId,
      activityDate: getTodayDate(),
      scannerMemberId,
    });

    // getPublic returns { data: { activities: [{ activityName, totalCount }] } }
    const response = result.data;
    if (response?.activities && response.activities.length > 0) {
      return response.activities[0].totalCount || 0;
    }
    return 0;
  } catch (error) {
    console.error('Failed to fetch meal activity stats:', error);
    return 0;
  }
}
