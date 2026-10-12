import { requestAsApiResponse, getPublic, postPublic } from '../../network/api';
import type { GetMemberGiftActivityRequest, UpdateGiftActivityRequest } from './models/api';

export const fetchMemberDetails = async (req: GetMemberGiftActivityRequest) => {
  console.log('[GiftsViewModel] fetchMemberDetails called with:', JSON.stringify(req));
  const result = await requestAsApiResponse(() => getPublic('getMemberActivity', req as any));
  console.log('[GiftsViewModel] fetchMemberDetails result:', JSON.stringify(result, null, 2));
  return result;
};

export const updateGiftActivity = async (activityData: UpdateGiftActivityRequest) => {
  return requestAsApiResponse(() => postPublic('updateMemberActivity', activityData as any));
};


