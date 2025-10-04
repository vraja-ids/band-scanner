export interface GetDaypassStatusRequest {
  dayPassNumber: string;
  eventId: string;
  scannerMemberId: string;
}

export interface DaypassStatusDetails {
  bus?: string;
  prasadam?: string;
}

export interface GetDaypassStatusResponse {
  daypassDetails: {
    daypassNumber: number;
    purchaserName: string;
    daypassName: string;
    scannerAlert: boolean;
    status: 'active' | 'redeemed';
    statusDetails: DaypassStatusDetails;
  };
}

export interface UpdateDayPassStatusRequest {
  dayPassNumber: string;
  eventId: string;
  action: 'redeem' | 'unredeem';
  actionId: 'bus' | 'prasadam';
  actionDetails: string; // e.g., "Bus 7"
  scannerMemberId: string;
}

export interface UpdateDayPassStatusResponse {
  success: boolean;
  message?: string;
}

export interface GetDaypassActivityStatsRequest {
  eventId: string;
  activity: string; // "bus1", "bus2", ..., "bus12", "breakfast", "lunch", "dinner"
  date: string; // YYYY-MM-DD format
  scannerMemberId: string;
}

export interface GetDaypassActivityStatsResponse {
  totalCount: number;
  activity: string;
  date: string;
}

export interface UpdateCountRequest {
  eventId: string;
  actionId: 'bus' | 'prasadam';
  count: number; // 1 or -1
  location: string; // "bus1", "bus2", ..., "breakfast", "lunch", "dinner"
  scannerMemberId: string;
}

export interface UpdateCountResponse {
  success: boolean;
  totalCount: number;
  message?: string;
}

