import { requestAsApiResponse, getPublic, putPublic, postPublic } from '../../network/api';
import type { RegisterTagRequest, RegistrationStatusRequest } from './models/api';

export const fetchRegistrationStatus = async (req: RegistrationStatusRequest) => {
  return requestAsApiResponse(() => getPublic('getMemberActivity', { tagId: req.tagId, activity: 'regCheck', category: 'mealtracking' }));
};

export const registerTag = async (payload: RegisterTagRequest) => {
  return requestAsApiResponse(() => putPublic('registerTag', payload as any));
};

export const unregisterTag = async (tagId: string) => {
  return requestAsApiResponse(() => putPublic('registerTag', { tagId, memberId: '0', apiVersion: '3.10' }));
};


