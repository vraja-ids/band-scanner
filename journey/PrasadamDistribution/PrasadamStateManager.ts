/**
 * Prasadam State Manager
 * Simple pub/sub for meal changes across Prasadam Distribution tabs
 */

type MealChangeListener = (mealId: string | null) => void;

class PrasadamStateManager {
  private currentMealId: string | null = null;
  private listeners: MealChangeListener[] = [];

  /**
   * Set the current meal and notify all listeners
   */
  setCurrentMeal(mealId: string | null): void {
    if (this.currentMealId !== mealId) {
      this.currentMealId = mealId;
      this.notifyListeners();
    }
  }

  /**
   * Get the current meal ID
   */
  getCurrentMeal(): string | null {
    return this.currentMealId;
  }

  /**
   * Subscribe to meal changes
   * @returns Unsubscribe function
   */
  onMealChanged(callback: MealChangeListener): () => void {
    this.listeners.push(callback);

    // Immediately call with current value
    callback(this.currentMealId);

    // Return unsubscribe function
    return () => {
      this.listeners = this.listeners.filter(l => l !== callback);
    };
  }

  /**
   * Notify all listeners of a meal change
   */
  private notifyListeners(): void {
    this.listeners.forEach(callback => {
      try {
        callback(this.currentMealId);
      } catch (error) {
        console.error('Error in meal change listener:', error);
      }
    });
  }

  /**
   * Clear all listeners
   */
  clearListeners(): void {
    this.listeners = [];
  }
}

// Export singleton instance
export const prasadamStateManager = new PrasadamStateManager();
