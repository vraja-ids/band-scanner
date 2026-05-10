/**
 * Meal Schedule Configuration
 * Defines meal schedules for each event
 *
 * The mealId in MealTimeSlot matches the meal_id used in:
 * - Meal Scan activity tracking (activity parameter)
 * - Prasadam Distribution Google Sheets (MEALS sheet)
 *
 * This way we don't need a separate mapping - the same IDs work everywhere.
 */

export interface MealTimeSlot {
  mealId: string;
  name: string;
  expectedDevotees?: number; // Expected number of devotees for this meal
  // Time range in "HH:mm" format for each day
  // Uses ISO day numbers (1=Monday, 7=Sunday)
  startDay: number;
  startHour: number;
  startMinute: number;
  endDay: number;
  endHour: number;
  endMinute: number;
}

export interface EventMealSchedule {
  eventId: string;
  eventName: string;
  meals: MealTimeSlot[];
}

// USASA 2026 Schedule (May 22-25, 2026)
// Friday May 22 - Monday May 25, 2026
// Standard meal windows: Breakfast 7:30-10:30, Lunch 13:00-16:00, Dinner 18:30-21:30
const USASA2026Meals: MealTimeSlot[] = [
  {
    mealId: 'friDinner',
    name: 'Friday Dinner',
    expectedDevotees: 1500,
    startDay: 5, // Friday
    startHour: 13, // Starts at 1:30 PM (early dinner/first meal of event)
    startMinute: 30,
    endDay: 5,
    endHour: 21,
    endMinute: 30,
  },
  {
    mealId: 'satBreakfast',
    name: 'Saturday Breakfast',
    expectedDevotees: 1500,
    startDay: 6, // Saturday
    startHour: 7,
    startMinute: 30,
    endDay: 6,
    endHour: 10,
    endMinute: 30,
  },
  {
    mealId: 'satLunch',
    name: 'Saturday Lunch',
    expectedDevotees: 1500,
    startDay: 6,
    startHour: 13,
    startMinute: 0,
    endDay: 6,
    endHour: 16,
    endMinute: 0,
  },
  {
    mealId: 'satDinner',
    name: 'Saturday Dinner',
    expectedDevotees: 1500,
    startDay: 6,
    startHour: 18,
    startMinute: 30,
    endDay: 6,
    endHour: 21,
    endMinute: 30,
  },
  {
    mealId: 'sunBreakfast',
    name: 'Sunday Breakfast',
    expectedDevotees: 1500,
    startDay: 7, // Sunday
    startHour: 7,
    startMinute: 30,
    endDay: 7,
    endHour: 10,
    endMinute: 30,
  },
  {
    mealId: 'sunLunch',
    name: 'Sunday Lunch',
    expectedDevotees: 1500,
    startDay: 7,
    startHour: 13,
    startMinute: 0,
    endDay: 7,
    endHour: 16,
    endMinute: 0,
  },
  {
    mealId: 'sunDinner',
    name: 'Sunday Dinner',
    expectedDevotees: 1500,
    startDay: 7,
    startHour: 18,
    startMinute: 30,
    endDay: 7,
    endHour: 21,
    endMinute: 30,
  },
  {
    mealId: 'monBreakfast',
    name: 'Monday Breakfast',
    expectedDevotees: 1500,
    startDay: 1, // Monday
    startHour: 7,
    startMinute: 30,
    endDay: 1,
    endHour: 10,
    endMinute: 30,
  },
  {
    mealId: 'monLunch',
    name: 'Monday Lunch',
    expectedDevotees: 1500,
    startDay: 1,
    startHour: 13,
    startMinute: 0,
    endDay: 1,
    endHour: 16,
    endMinute: 0,
  },
];

// Rishikesh Kirtan Fest 2026 Schedule (March 12-16, 2026)
const RishikeshKirtanFest2026Meals: MealTimeSlot[] = [
  {
    mealId: 'thuDinner',
    name: 'Thursday Dinner',
    expectedDevotees: 500,
    startDay: 4, // Thursday
    startHour: 18,
    startMinute: 30,
    endDay: 4,
    endHour: 21,
    endMinute: 30,
  },
  {
    mealId: 'friBreakfast',
    name: 'Friday Breakfast',
    expectedDevotees: 500,
    startDay: 5, // Friday
    startHour: 7,
    startMinute: 30,
    endDay: 5,
    endHour: 10,
    endMinute: 30,
  },
  {
    mealId: 'fiLunch',
    name: 'Friday Lunch',
    expectedDevotees: 500,
    startDay: 5,
    startHour: 13,
    startMinute: 0,
    endDay: 5,
    endHour: 16,
    endMinute: 0,
  },
  {
    mealId: 'friDinnerRK',
    name: 'Friday Dinner',
    expectedDevotees: 500,
    startDay: 5,
    startHour: 17, // Starts at 5 PM (early dinner on Friday)
    startMinute: 0,
    endDay: 5,
    endHour: 21,
    endMinute: 30,
  },
  {
    mealId: 'satBreakfastRK',
    name: 'Saturday Breakfast',
    expectedDevotees: 500,
    startDay: 6, // Saturday
    startHour: 7,
    startMinute: 30,
    endDay: 6,
    endHour: 10,
    endMinute: 30,
  },
  {
    mealId: 'satLunchRK',
    name: 'Saturday Lunch',
    expectedDevotees: 500,
    startDay: 6,
    startHour: 13,
    startMinute: 0,
    endDay: 6,
    endHour: 16,
    endMinute: 0,
  },
  {
    mealId: 'satDinnerRK',
    name: 'Saturday Dinner',
    expectedDevotees: 500,
    startDay: 6,
    startHour: 18,
    startMinute: 30,
    endDay: 6,
    endHour: 21,
    endMinute: 30,
  },
  {
    mealId: 'sunBreakfastRK',
    name: 'Sunday Breakfast',
    expectedDevotees: 500,
    startDay: 7, // Sunday
    startHour: 7,
    startMinute: 30,
    endDay: 7,
    endHour: 10,
    endMinute: 30,
  },
  {
    mealId: 'sunLunchRK',
    name: 'Sunday Lunch',
    expectedDevotees: 500,
    startDay: 7,
    startHour: 13,
    startMinute: 0,
    endDay: 7,
    endHour: 16,
    endMinute: 0,
  },
];

// Kartik Parikrama 2025 Schedule (November 2025)
const KartikParikrama2025Meals: MealTimeSlot[] = [
  {
    mealId: 'morningPrasadam',
    name: 'Morning Prasadam',
    expectedDevotees: 300,
    startDay: 1, // Monday
    startHour: 8,
    startMinute: 0,
    endDay: 7, // Sunday
    endHour: 10,
    endMinute: 0,
  },
  {
    mealId: 'lunchPrasadam',
    name: 'Lunch Prasadam',
    expectedDevotees: 300,
    startDay: 1,
    startHour: 12,
    startMinute: 0,
    endDay: 7,
    endHour: 15,
    endMinute: 0,
  },
  {
    mealId: 'dinnerPrasadam',
    name: 'Dinner Prasadam',
    expectedDevotees: 300,
    startDay: 1,
    startHour: 18,
    startMinute: 0,
    endDay: 7,
    endHour: 21,
    endMinute: 0,
  },
];

// All event meal schedules
export const MEAL_SCHEDULES: EventMealSchedule[] = [
  {
    eventId: 'USASadhuSanga2026',
    eventName: 'USA Sadhu Sanga Retreat 2026',
    meals: USASA2026Meals,
  },
  {
    eventId: 'RishikeshKirtanFest2026',
    eventName: 'Rishikesh Kirtan Fest 2026',
    meals: RishikeshKirtanFest2026Meals,
  },
  {
    eventId: 'KartikParikrama2025',
    eventName: 'Kartik Parikrama 2025',
    meals: KartikParikrama2025Meals,
  },
];

/**
 * Get meal schedule for an event
 */
export function getMealSchedule(eventId: string): MealTimeSlot[] {
  const schedule = MEAL_SCHEDULES.find(s => s.eventId === eventId);
  return schedule?.meals || [];
}

/**
 * Get current meal based on current time for an event
 */
export function getCurrentMeal(eventId: string): MealTimeSlot | null {
  const meals = getMealSchedule(eventId);
  const now = new Date();

  const currentDay = now.getDay(); // 0-6 (Sunday=0, Monday=1, etc.)
  const currentHour = now.getHours();
  const currentMinute = now.getMinutes();
  const currentTimeInMinutes = currentHour * 60 + currentMinute;

  for (const meal of meals) {
    const startDay = meal.startDay === 0 ? 7 : meal.startDay; // Convert Sunday=0 to 7
    const endDay = meal.endDay === 0 ? 7 : meal.endDay;

    // Check if current day is within meal's day range
    if (currentDay >= startDay && currentDay <= endDay) {
      const startTimeInMinutes = meal.startHour * 60 + meal.startMinute;
      const endTimeInMinutes = meal.endHour * 60 + meal.endMinute;

      // Check if current time is within meal's time range
      if (currentTimeInMinutes >= startTimeInMinutes && currentTimeInMinutes <= endTimeInMinutes) {
        return meal;
      }
    }
  }

  return null;
}

/**
 * Get all meals for an event (for picker)
 */
export function getAllMealsForEvent(eventId: string): MealTimeSlot[] {
  return getMealSchedule(eventId);
}

/**
 * Get expected devotees for a specific meal ID
 */
export function getExpectedDevoteesForMeal(eventId: string, mealId: string): number {
  const meals = getMealSchedule(eventId);
  const meal = meals.find(m => m.mealId === mealId);
  return meal?.expectedDevotees || 0;
}

/**
 * Get meal name by meal ID
 */
export function getMealName(eventId: string, mealId: string): string {
  const meals = getMealSchedule(eventId);
  const meal = meals.find(m => m.mealId === mealId);
  return meal?.name || mealId;
}
