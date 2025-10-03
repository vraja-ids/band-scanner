import { requestAsApiResponse, getPublic, postPublic } from '../../network/api';
import type { GetMemberGiftActivityRequest, UpdateGiftActivityRequest } from './models/api';

export const fetchMemberDetails = async (req: GetMemberGiftActivityRequest) => {
  return requestAsApiResponse(() => getPublic('getMemberActivity', req as any));
};

export const updateGiftActivity = async (activityData: UpdateGiftActivityRequest) => {
  return requestAsApiResponse(() => postPublic('updateMemberActivity', activityData as any));
};


