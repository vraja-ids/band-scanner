import AsyncStorage from '@react-native-async-storage/async-storage';

const SPREADSHEET_ID = '1y-xNNz8ktAK-ofJ2Cgw1PByIlvqhbsdkqgdnQNqehB4';

const TABS = {
	INGREDIENT_LIST: 'Ingredient List',
	STORAGE_LOCATIONS: 'Storage Locations',
	STOCK_TRANSACTIONS: 'Stock Transactions',
};

const TOKEN_KEY = 'bhoga_google_access_token';

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

// Google Sheets Service (without OAuth - token must be set via backend)
class GoogleSheetsServiceClass {
	private baseUrl = 'https://sheets.googleapis.com/v4/spreadsheets';
	private accessToken: string | null = null;

	// Set access token from backend
	setAccessToken(token: string): void {
		this.accessToken = token;
		AsyncStorage.setItem(TOKEN_KEY, token);
	}

	// Load stored token
	async loadToken(): Promise<boolean> {
		try {
			const token = await AsyncStorage.getItem(TOKEN_KEY);
			if (token) {
				this.accessToken = token;
				return true;
			}
		} catch (error) {
			console.error('Error loading token:', error);
		}
		return false;
	}

	private async getAccessToken(): Promise<string> {
		if (!this.accessToken) {
			await this.loadToken();
		}
		if (!this.accessToken) {
			throw new Error('Not authenticated. Please set access token via backend.');
		}
		return this.accessToken;
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

			// Track ingredient totals
			if (!ingredientsMap.has(ingredient)) {
				ingredientsMap.set(ingredient, {
					name: ingredient,
					category,
					unit,
					totalPlanned: 0,
					meals: [],
				});
			}

			const ingr = ingredientsMap.get(ingredient)!;
			ingr.totalPlanned += quantity;

			// Track which meals use this ingredient
			const existingMeal = ingr.meals.find(m => m.mealId === mealId && m.menuItem === menuItem);
			if (existingMeal) {
				existingMeal.plannedQuantity += quantity;
			} else {
				ingr.meals.push({
					mealId,
					menuItem,
					plannedQuantity: quantity,
					status: 'pending',
				});
			}
		}

		return {
			meals,
			ingredients: Array.from(ingredientsMap.values()),
		};
	}

	async getIngredientList(): Promise<IngredientListData> {
		const rows = await this.fetchTab(TABS.INGREDIENT_LIST);
		return this.parseIngredientList(rows);
	}

	async getStorageLocations(): Promise<StorageLocation[]> {
		const rows = await this.fetchTab(TABS.STORAGE_LOCATIONS);
		if (!rows || rows.length < 2) return [];

		const headers = rows[0];
		const ingredientIdx = headers.indexOf('Ingredient');
		const roomIdx = headers.indexOf('Room');
		const sublocationIdx = headers.indexOf('Sublocation');
		const initialIdx = headers.indexOf('InitialStock');
		const currentIdx = headers.indexOf('CurrentStock');
		const unitIdx = headers.indexOf('Unit');

		const locations: StorageLocation[] = [];
		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			if (!row || row.length === 0) continue;

			const ingredientName = row[ingredientIdx];
			const room = row[roomIdx];
			const sublocation = row[sublocationIdx];
			const initialStock = parseFloat(row[initialIdx]) || 0;
			const currentStock = parseFloat(row[currentIdx]) || 0;
			const unit = row[unitIdx] || '';

			if (ingredientName) {
				locations.push({
					ingredientName,
					room,
					sublocation,
					initialStock,
					currentStock,
					unit,
				});
			}
		}

		return locations;
	}

	async getStockTransactions(): Promise<StockTransaction[]> {
		const rows = await this.fetchTab(TABS.STOCK_TRANSACTIONS);
		if (!rows || rows.length < 2) return [];

		const headers = rows[0];
		const timestampIdx = headers.indexOf('Timestamp');
		const mealIdIdx = headers.indexOf('MealID');
		const menuItemIdx = headers.indexOf('MenuItem');
		const ingredientIdx = headers.indexOf('Ingredient');
		const usedIdx = headers.indexOf('UsedQuantity');
		const unitIdx = headers.indexOf('Unit');
		const remainingIdx = headers.indexOf('RemainingStock');
		const userIdx = headers.indexOf('UserID');

		const transactions: StockTransaction[] = [];
		for (let i = 1; i < rows.length; i++) {
			const row = rows[i];
			if (!row || row.length === 0) continue;

			const timestamp = row[timestampIdx];
			const mealId = row[mealIdIdx];
			const menuItem = row[menuItemIdx];
			const ingredientName = row[ingredientIdx];
			const usedQuantity = parseFloat(row[usedIdx]) || 0;
			const unit = row[unitIdx] || '';
			const remainingStock = row[remainingIdx] ? parseFloat(row[remainingIdx]) : undefined;
			const userId = row[userIdx];

			if (ingredientName) {
				transactions.push({
					timestamp,
					mealId,
					menuItem,
					ingredientName,
					usedQuantity,
					unit,
					remainingStock,
					userId,
				});
			}
		}

		return transactions;
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
		const now = new Date().toISOString();
		await this.appendRow(TABS.STOCK_TRANSACTIONS, [
			now,
			transaction.mealId,
			transaction.menuItem,
			transaction.ingredientName,
			transaction.usedQuantity.toString(),
			transaction.unit,
			transaction.remainingStock?.toString() || '',
			transaction.userId || '',
		]);
	}

	async updateStorageLocation(
		ingredientName: string,
		room: string,
		sublocation: string,
		stock: number,
		unit: string
	): Promise<any> {
		const token = await this.getAccessToken();
		const url = `${this.baseUrl}/${SPREADSHEET_ID}/values/'${TABS.STORAGE_LOCATIONS}':append`;

		const response = await fetch(url, {
			method: 'POST',
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
	}
}

// Singleton instance
export const googleSheetsService = new GoogleSheetsServiceClass();
export default googleSheetsService;
