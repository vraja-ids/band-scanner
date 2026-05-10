const GOOGLE_APPS_SCRIPT_URL = process.env.EXPO_PUBLIC_GOOGLE_APPS_SCRIPT_URL || '';

// Types
export interface Ingredient {
  name: string;
  category: string;
  unit: string;
  totalPlanned: number;
  meals: MealUsage[];
}

export interface MealUsage {
  mealId: string;
  menuItem: string;
  plannedQuantity: number;
  status: 'pending' | 'delivered' | 'used';
}

export interface MealData {
  [key: string]: {
    id: string;
    items: {
      [key: string]: {
        name: string;
        ingredients: IngredientItem[];
      };
    };
  };
}

export interface IngredientItem {
  name: string;
  quantity: number;
  unit: string;
  category: string;
  status: 'pending' | 'delivered' | 'used';
}

export interface StorageLocation {
  ingredientName: string;
  room: string;
  sublocation: string;
  initialStock: number;
  currentStock: number;
  unit: string;
}

export interface StockTransaction {
  timestamp: string;
  mealId: string;
  menuItem: string;
  ingredientName: string;
  usedQuantity: number;
  unit: string;
  remainingStock?: number;
  userId?: string;
}

export interface StockAlert {
  ingredient: string;
  currentStock: number;
  needed: number;
  shortfall: number;
  unit: string;
}

export interface Delivery {
  timestamp: string;
  ingredient: string;
  category: string;
  expectedQty: number;
  deliveredQty: number;
  unit: string;
  status: 'pending' | 'delivered' | 'stored';
}

export interface DeliveredItem {
  timestamp: string;
  ingredient: string;
  category: string;
  quantity: number;
  unit: string;
  status: 'delivered' | 'stored';
}

export interface IngredientListData {
  meals: MealData;
  ingredients: Ingredient[];
}

// Response type from Apps Script
interface AppsScriptResponse<T = any> {
  status: 'success' | 'error';
  data?: T;
  message?: string;
}

// Helper to call Apps Script via POST
async function callScript<T = any>(
  operation: string,
  data?: Record<string, any>
): Promise<AppsScriptResponse<T>> {
  try {
    const response = await fetch(GOOGLE_APPS_SCRIPT_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'text/plain', // Apps Script requires this
      },
      body: JSON.stringify({
        operation,
        ...data,
      }),
    });

    const result: AppsScriptResponse<T> = await response.json();
    return result;
  } catch (error) {
    console.error(`Bhoga API call failed for ${operation}:`, error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Helper to call Apps Script via GET
async function callScriptGet<T = any>(operation: string): Promise<AppsScriptResponse<T>> {
  try {
    const url = new URL(GOOGLE_APPS_SCRIPT_URL);
    url.searchParams.append('operation', operation);

    const response = await fetch(url.toString(), {
      method: 'GET',
    });

    const result: AppsScriptResponse<T> = await response.json();
    return result;
  } catch (error) {
    console.error(`Bhoga API GET failed for ${operation}:`, error);
    return {
      status: 'error',
      message: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// Bhoga Sheets Service - uses same Google Apps Script as Prasadam Distribution
class BhogaSheetsServiceClass {
  async getIngredientList(): Promise<IngredientListData> {
    const response = await callScriptGet<IngredientListData>('bhogaGetIngredientList');
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to fetch ingredient list');
    }
    return response.data || { meals: {}, ingredients: [] };
  }

  async getStorageLocations(): Promise<StorageLocation[]> {
    const response = await callScriptGet<StorageLocation[]>('bhogaGetStorageLocations');
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to fetch storage locations');
    }
    return response.data || [];
  }

  async getStockTransactions(): Promise<StockTransaction[]> {
    const response = await callScriptGet<StockTransaction[]>('bhogaGetStockTransactions');
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to fetch stock transactions');
    }
    return response.data || [];
  }

  async recordStockTransaction(transaction: {
    mealId: string;
    menuItem: string;
    ingredientName: string;
    usedQuantity: number;
    unit: string;
    remainingStock?: number;
    userId?: string;
  }): Promise<void> {
    const response = await callScript('bhogaRecordStockTransaction', transaction);
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to record transaction');
    }
  }

  async updateStorageLocation(
    ingredientName: string,
    room: string,
    sublocation: string,
    stock: number,
    unit: string
  ): Promise<void> {
    const response = await callScript('bhogaUpdateStorageLocation', {
      ingredientName,
      room,
      sublocation,
      stock,
      unit,
    });
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to update storage location');
    }
  }

  async initializeSheet(): Promise<void> {
    const response = await callScript('bhogaInitializeSheet');
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to initialize sheets');
    }
  }

  async getDeliveries(): Promise<Delivery[]> {
    const response = await callScriptGet<Delivery[]>('bhogaGetDeliveries');
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to fetch deliveries');
    }
    return response.data || [];
  }

  async recordDelivery(delivery: {
    ingredient: string;
    category: string;
    expectedQty: number;
    deliveredQty: number;
    unit: string;
    userId?: string;
  }): Promise<void> {
    const response = await callScript('bhogaRecordDelivery', delivery);
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to record delivery');
    }
  }

  async getDeliveredItems(): Promise<DeliveredItem[]> {
    const response = await callScriptGet<DeliveredItem[]>('bhogaGetDeliveredItems');
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to fetch delivered items');
    }
    return response.data || [];
  }

  async moveToStorage(item: {
    ingredient: string;
    room: string;
    sublocation: string;
    quantity: number;
    unit: string;
  }): Promise<void> {
    const response = await callScript('bhogaMoveToStorage', item);
    if (response.status === 'error') {
      throw new Error(response.message || 'Failed to move to storage');
    }
  }
}

// Singleton instance
export const bhogaSheetsService = new BhogaSheetsServiceClass();
export default bhogaSheetsService;
