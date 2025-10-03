export interface GetServiceSelectionListRequest {
  tagId: string;
  eventId: string;
  validateService: boolean;
}

export interface AcknowledgeServiceRequest {
  tagId: string;
  memberId: string;
  apiVersion: string;
  quantity: number;
  location: string;
  activityId: number;
  category: 'gifttracking';
  activity: 'servicescan';
  scannerMemberId: string | null;
}


