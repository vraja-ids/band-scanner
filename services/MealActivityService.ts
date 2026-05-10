/**
 * Meal Activity Service
 * Fetches meal scanning statistics from the backend API
 */

import { requestAsApiResponse, getPublic } from '../network/api';
import type { ApiResponse } from '../network/types';

// API Request/Response types
export interface GetMealActivityStatsRequest {
  eventId: string;
  activity: string; // meal_id (e.g., 'friDinner', 'satBreakfast')
  date: string; // YYYY-MM-DD format
  scannerMemberId: string;
}

export interface MealActivityStatsResponse {
  totalCount: number;
  activity: string;
  date: string;
}

/**
 * Get meal activity stats (number of devotees scanned for a meal)
 * Uses the same API as Daypass activity stats but for meal tracking
 */
export const getMealActivityStats = async (
  payload: GetMealActivityStatsRequest
): Promise<ApiResponse<MealActivityStatsResponse>> => {
  return requestAsApiResponse(() => getPublic('getDaypassActivityStats', payload));
};

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
 * Get meal activity stats for a specific meal
 * Returns the number of devotees scanned for that meal
 */
export async function getDevoteesCountForMeal(
  eventId: string,
  mealActivityId: string,
  scannerMemberId: string
): Promise<number> {
  try {
    const response = await getMealActivityStats({
      eventId,
      activity: mealActivityId,
      date: getTodayDate(),
      scannerMemberId,
    });

    if (response.status === 'success' && response.data) {
      return response.data.totalCount || 0;
    }
    return 0;
  } catch (error) {
    console.error('Failed to fetch meal activity stats:', error);
    return 0;
  }
}
