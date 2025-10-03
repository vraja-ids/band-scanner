import { requestAsApiResponse, getPublic, postPublic } from '../../network/api';
import type {
  GetDaypassStatusRequest,
  GetDaypassStatusResponse,
  UpdateDayPassStatusRequest,
  UpdateDayPassStatusResponse,
} from './models/api';
import type { ApiResponse } from '../../network/types';

export const getDaypassStatus = async (
  payload: GetDaypassStatusRequest
): Promise<ApiResponse<GetDaypassStatusResponse>> => {
  return requestAsApiResponse(() => getPublic('getDaypassStatus', payload));
};

export const updateDayPassStatus = async (
  payload: UpdateDayPassStatusRequest
): Promise<ApiResponse<UpdateDayPassStatusResponse>> => {
  return requestAsApiResponse(() => postPublic('updateDayPassStatus', payload));
};

