import { requestAsApiResponse, getPublic, postPublic } from '../../network/api';
import type { GetServiceSelectionListRequest, AcknowledgeServiceRequest } from './models/api';

export const fetchServiceSelectionList = async (req: GetServiceSelectionListRequest) => {
  return requestAsApiResponse(() => getPublic('getServiceSelectionList', req as any));
};

export const acknowledgeService = async (payload: AcknowledgeServiceRequest) => {
  return requestAsApiResponse(() => postPublic('updateMemberActivity', payload as any));
};


