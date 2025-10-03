import { requestAsApiResponse, getPublic, postPublic } from '../../network/api';
import type { GetMemberMealActivityRequest, UpdateMealActivityRequest } from './models/api';

export const fetchMealActivity = async (req: GetMemberMealActivityRequest) => {
  return requestAsApiResponse(() => getPublic('getMemberActivity', req as any));
};

export const updateMealActivity = async (payload: UpdateMealActivityRequest) => {
  return requestAsApiResponse(() => postPublic('updateMemberActivity', payload as any));
};


