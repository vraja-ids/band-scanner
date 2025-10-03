export interface GetMemberMealActivityRequest {
  tagId: string;
  activity: string;
  category: 'mealtracking';
}

export interface UpdateMealActivityRequest {
  apiVersion: string;
  tagId: string;
  activity: string;
  category: 'mealtracking';
  location: string;
  activityId: number;
  scannerMemberId: string | null;
}


