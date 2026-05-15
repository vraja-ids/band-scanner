import { requestAsApiResponse, getPublic, putPublic, postPublic } from '../../network/api';
import type { RegisterTagRequest, RegistrationStatusRequest } from './models/api';
import { getString } from '../../storage/Session';

export const fetchRegistrationStatus = async (req: RegistrationStatusRequest) => {
  return requestAsApiResponse(() => getPublic('getMemberActivity', { tagId: req.tagId, activity: 'regCheck', category: 'mealtracking' }));
};

export const registerTag = async (payload: RegisterTagRequest) => {
  const eventId = await getString('selectedEventId');
  return requestAsApiResponse(() => putPublic('registerTag', { ...payload, eventId } as any));
};

export const unregisterTag = async (tagId: string) => {
  const eventId = await getString('selectedEventId');
  return requestAsApiResponse(() => putPublic('registerTag', { tagId, memberId: '0', apiVersion: '3.10', eventId } as any));
};


