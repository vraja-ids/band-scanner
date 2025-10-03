export type ApiStatus = 'initial' | 'loading' | 'success' | 'error';

export type ApiResponse<T> =
  | { status: 'initial' }
  | { status: 'loading' }
  | { status: 'success'; data: T }
  | { status: 'error'; code: string; message: string };

export interface LoginScannerRequest {
  tagId?: string | null;
  memberId?: string | null;
  eventId: string;
}

export interface ScannerLoginResponse {
  memberId: string;
  legalName: string;
  spiritualName?: string;
  memberPermissions?: string[];
}

export interface GiftActivityUpdateRequest {
  apiVersion: string;
  memberId?: string;
  tagId: string;
  category: 'gifttracking';
  activityId: number;
  location: string;
  activity: 'giftapproval' | 'giftfulfilled';
  remove?: boolean;
  scannerMemberId: string | null;
  quantity: number;
}

export interface MealActivityUpdateRequest {
  apiVersion: string;
  tagId: string;
  activity: string;
  category: 'mealtracking';
  location: string;
  activityId: number;
  scannerMemberId: string | null;
}

export interface RegisterTagRequest {
  apiVersion: string;
  tagId: string;
  memberId: string;
}


