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

