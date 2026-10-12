export interface GetMemberGiftActivityRequest {
  tagId: string;
  category: 'gifttracking';
}

export interface UpdateGiftActivityRequest {
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


