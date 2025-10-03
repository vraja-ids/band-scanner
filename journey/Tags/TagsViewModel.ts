import { requestAsApiResponse, getPublic, putPublic } from '../../network/api';
import type { RegisterTagRequest, RegistrationStatusRequest } from './models/api';

export const fetchRegistrationStatus = async (req: RegistrationStatusRequest) => {
  return requestAsApiResponse(() => getPublic('getMemberActivity', { tagId: req.tagId, activity: 'regCheck', category: 'mealtracking' }));
};

export const registerTag = async (payload: RegisterTagRequest) => {
  return requestAsApiResponse(() => putPublic('registerTag', payload as any));
};


