import { requestAsApiResponse, getPublic, postPublic } from '../../network/api';
import type {
  GetDaypassStatusRequest,
  GetDaypassStatusResponse,
  UpdateDayPassStatusRequest,
  UpdateDayPassStatusResponse,
  GetDaypassActivityStatsRequest,
  GetDaypassActivityStatsResponse,
  UpdateCountRequest,
  UpdateCountResponse,
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
  return requestAsApiResponse(() => postPublic('updateDaypassStatus', payload));
};

export const getDaypassActivityStats = async (
  payload: GetDaypassActivityStatsRequest
): Promise<ApiResponse<GetDaypassActivityStatsResponse>> => {
  return requestAsApiResponse(() => getPublic('getDaypassActivityStats', payload));
};

export const updateCount = async (
  payload: UpdateCountRequest
): Promise<ApiResponse<UpdateCountResponse>> => {
  return requestAsApiResponse(() => postPublic('updateCount', payload));
};

