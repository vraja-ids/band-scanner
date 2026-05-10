import AsyncStorage from '@react-native-async-storage/async-storage';
import * as AuthSession from 'expo-auth-session';
import * as WebBrowser from 'expo-web-browser';

WebBrowser.maybeCompleteAuthSession();

const SPREADSHEET_ID = '1y-xNNz8ktAK-ofJ2Cgw1PByIlvqhbsdkqgdnQNqehB4';

const TABS = {
  INGREDIENT_LIST: 'Ingredient List',
  STORAGE_LOCATIONS: 'Storage Locations',
  STOCK_TRANSACTIONS: 'Stock Transactions',
};

// OAuth Configuration
const DISCOVERY_DOC = {
  authorizationEndpoint: 'https://accounts.google.com/o/oauth2/v2/auth',
  tokenEndpoint: 'https://oauth2.googleapis.com/token',
  revocationEndpoint: 'https://oauth2.googleapis.com/revoke',
};

const CLIENT_ID = '459389459185-vhunfp89p1nn8jnaq6qdo46ttpdgq4ba.apps.googleusercontent.com';
const REDIRECT_URI = AuthSession.makeRedirectUri({
  scheme: undefined,
  path: '@loghash/band-scanner',
});

const SCOPES = [
  'https://www.googleapis.com/auth/spreadsheets',
];

const TOKEN_STORAGE_KEY = 'bhoga_google_access_token';
const REFRESH_TOKEN_KEY = 'bhoga_google_refresh_token';

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

// Parsed Data Types
export interface IngredientListData {
  meals: MealData;
  ingredients: Ingredient[];
}

// OAuth Service
class GoogleOAuthService {
  private accessToken: string | null = null;
  private refreshToken: string | null = null;
  private request: AuthSession.AuthRequest | null = null;

  async loadStoredTokens(): Promise<{ accessToken: string | null; refreshToken: string | null }> {
    try {
      const token = await AsyncStorage.getItem(TOKEN_STORAGE_KEY);
      const refresh = await AsyncStorage.getItem(REFRESH_TOKEN_KEY);
      if (token) this.accessToken = token;
      if (refresh) this.refreshToken = refresh;
      return { accessToken: token, refreshToken: refresh };
    } catch (error) {
      console.error('Error loading tokens:', error);
      return { accessToken: null, refreshToken: null };
    }
  }

  async signIn(): Promise<{ success: boolean; accessToken?: string; error?: string }> {
    try {
      this.request = new AuthSession.AuthRequest({
        clientId: CLIENT_ID,
        redirectUri: REDIRECT_URI,
        scopes: SCOPES,
        responseType: AuthSession.ResponseType.Token,
      });

      const result = await this.request.promptAsync(DISCOVERY_DOC);

      if (result.type === 'success') {
        const { accessToken, refreshToken } = result.params;

        this.accessToken = accessToken;
        if (refreshToken) {
          this.refreshToken = refreshToken;
          await AsyncStorage.setItem(REFRESH_TOKEN_KEY, refreshToken);
        }
        await AsyncStorage.setItem(TOKEN_STORAGE_KEY, accessToken);

        return { success: true, accessToken };
      }

      return { success: false, error: 'Auth failed' };
    } catch (error) {
      console.error('OAuth sign in error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  async signOut(): Promise<{ success: boolean; error?: string }> {
    try {
      await AsyncStorage.removeItem(TOKEN_STORAGE_KEY);
      await AsyncStorage.removeItem(REFRESH_TOKEN_KEY);
      this.accessToken = null;
      this.refreshToken = null;
      return { success: true };
    } catch (error) {
      console.error('Sign out error:', error);
      return { success: false, error: (error as Error).message };
    }
  }

  getAccessToken(): string | null {
    return this.accessToken;
  }

  isAuthenticated(): boolean {
    return !!this.accessToken;
  }
}

// Google Sheets Service
class GoogleSheetsServiceClass {
  private oauthService: GoogleOAuthService;
  private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';

  constructor() {
    this.oauthService = new GoogleOAuthService();
  }

  get oauth(): GoogleOAuthService {
    return this.oauthService;
  }

  private async getAccessToken(): Promise<string> {
    const token = this.oauthService.getAccessToken();
    if (!token) {
      throw new Error('Not authenticated. Please sign in with Google.');
    }
    return token;
  }

  private async fetchTab(tabName: string, range: string = ''): Promise<string[][]> {
    const token = await this.getAccessToken();
    const fullRange = range ? `'${tabName}'!${range}` : `'${tabName}'`;
    const url = `${this.baseUrl}/${SPREADSHEET_ID}/values/${encodeURIComponent(fullRange)}`;

    const response = await fetch(url, {
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/json',
      },
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google Sheets API error: ${error.error?.message || response.statusText}`);
    }

    const data = await response.json();
    return data.values || [];
  }

  private async appendRow(tabName: string, rowData: string[]): Promise<any> {
    const token = await this.getAccessToken();
    const url = `${this.baseUrl}/${SPREADSHEET_ID}/values/'${tabName}':append`;

    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        values: [rowData],
        valueInputOption: 'USER_ENTERED',
      }),
    });

    if (!response.ok) {
      const error = await response.json();
      throw new Error(`Google Sheets API error: ${error.error?.message || response.statusText}`);
    }

    return await response.json();
  }

  private parseIngredientList(rows: string[][]): IngredientListData {
    if (!rows || rows.length < 2) {
      return { meals: {}, ingredients: [] };
    }

    const headers = rows[0];
    const idIdx = headers.indexOf('ID');
    const menuItemIdx = headers.indexOf('MenuItem');
    const ingredientIdx = headers.indexOf('Ingredients');
    const quantityIdx = headers.indexOf('Quantity');
    const unitsIdx = headers.indexOf('Units');
    const categoryIdx = headers.indexOf('Category');

    const meals: MealData = {};
    const ingredientsMap = new Map<string, Ingredient>();

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const mealId = row[idIdx];
      const menuItem = row[menuItemIdx];
      const ingredient = row[ingredientIdx];
      const quantity = parseFloat(row[quantityIdx]) || 0;
      const unit = row[unitsIdx] || '';
      const category = row[categoryIdx] || 'Uncategorized';

      if (!mealId || !ingredient) continue;

      // Initialize meal if not exists
      if (!meals[mealId]) {
        meals[mealId] = {
          id: mealId,
          items: {},
        };
      }

      // Initialize menu item if not exists
      if (!meals[mealId].items[menuItem]) {
        meals[mealId].items[menuItem] = {
          name: menuItem,
          ingredients: [],
        };
      }

      // Add ingredient to menu item
      meals[mealId].items[menuItem].ingredients.push({
        name: ingredient,
        quantity,
        unit,
        category,
        status: 'pending',
      });

      // Update ingredient aggregate
      if (!ingredientsMap.has(ingredient)) {
        ingredientsMap.set(ingredient, {
          name: ingredient,
          category,
          unit,
          totalPlanned: 0,
          meals: [],
        });
      }

      const ing = ingredientsMap.get(ingredient)!;
      ing.totalPlanned += quantity;
      ing.meals.push({
        mealId,
        menuItem,
        plannedQuantity: quantity,
        status: 'pending',
      });
    }

    return {
      meals,
      ingredients: Array.from(ingredientsMap.values()),
    };
  }

  private parseStorageLocations(rows: string[][]): StorageLocation[] {
    if (!rows || rows.length < 2) return [];

    const headers = rows[0];
    const ingredientIdx = headers.indexOf('Ingredient');
    const roomIdx = headers.indexOf('Room');
    const sublocationIdx = headers.indexOf('Sublocation');
    const stockIdx = headers.indexOf('Initial Stock');
    const unitIdx = headers.indexOf('Unit');

    const locations: StorageLocation[] = [];

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      if (!row || row.length === 0) continue;

      const ingredient = row[ingredientIdx];
      const room = row[roomIdx];
      const sublocation = row[sublocationIdx] || '';
      const stock = parseFloat(row[stockIdx]) || 0;
      const unit = row[unitIdx] || '';

      if (!ingredient || !room) continue;

      locations.push({
        ingredientName: ingredient,
        room,
        sublocation,
        initialStock: stock,
        currentStock: stock,
        unit,
      });
    }

    return locations;
  }

  async getIngredientData(): Promise<IngredientListData> {
    const rows = await this.fetchTab(TABS.INGREDIENT_LIST);
    return this.parseIngredientList(rows);
  }

  async getStorageLocations(): Promise<StorageLocation[]> {
    const rows = await this.fetchTab(TABS.STORAGE_LOCATIONS);
    return this.parseStorageLocations(rows);
  }

  async recordStockTransaction(transaction: StockTransaction): Promise<any> {
    const row = [
      new Date().toISOString(),
      transaction.mealId,
      transaction.menuItem,
      transaction.ingredientName,
      transaction.usedQuantity.toString(),
      transaction.unit,
      transaction.remainingStock?.toString() || '',
      transaction.userId || '',
    ];

    return await this.appendRow(TABS.STOCK_TRANSACTIONS, row);
  }

  async updateStorageLocation(
    ingredientName: string,
    room: string,
    sublocation: string,
    stock: number,
    unit: string
  ): Promise<any> {
    const rows = await this.fetchTab(TABS.STORAGE_LOCATIONS);
    const ingredientIdx = rows[0].indexOf('Ingredient');
    const targetRow = rows.findIndex((row, idx) => idx > 0 && row[ingredientIdx] === ingredientName);

    if (targetRow > 0) {
      // Update existing row
      const url = `${this.baseUrl}/${SPREADSHEET_ID}/values/'${TABS.STORAGE_LOCATIONS}'!A${targetRow + 1}:E${targetRow + 1}`;
      const token = await this.getAccessToken();

      const response = await fetch(url, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          values: [[ingredientName, room, sublocation || '', stock.toString(), unit || '']],
          valueInputOption: 'USER_ENTERED',
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(`Google Sheets API error: ${error.error?.message || response.statusText}`);
      }

      return await response.json();
    } else {
      // Append new row
      return await this.appendRow(TABS.STORAGE_LOCATIONS, [
        ingredientName,
        room,
        sublocation || '',
        stock.toString(),
        unit || '',
      ]);
    }
  }
}

// Singleton instance
export const googleSheetsService = new GoogleSheetsServiceClass();
export default googleSheetsService;
