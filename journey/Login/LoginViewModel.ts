import { requestAsApiResponse, getPublic, postPublic } from '../../network/api';
import type {
  LoginScannerRequest,
  GenerateVerificationCodeRequest,
  GenerateVerificationCodeResponse,
  ValidateVerificationCodeRequest,
  ValidateVerificationCodeResponse,
  GetProfileRequest,
  GetProfileResponse,
  GetEventsResponse,
} from './models/api';
import type { ApiResponse } from '../../network/types';

export const loginScanner = async ({ tagId = null, authToken, eventId = 'USASadhuSanga2025' }: LoginScannerRequest) => {
  return requestAsApiResponse(() => getPublic('loginScanner', { tagId, authToken, eventId }));
};

export const generateVerificationCode = async (
  payload: GenerateVerificationCodeRequest
): Promise<ApiResponse<GenerateVerificationCodeResponse>> => {
  return requestAsApiResponse(() => getPublic('generateVerificationCode', payload));
};

export const validateVerificationCode = async (
  payload: ValidateVerificationCodeRequest
): Promise<ApiResponse<ValidateVerificationCodeResponse>> => {
  return requestAsApiResponse(() => postPublic('validateVerificationCode', payload));
};

export const getProfile = async (
  payload: GetProfileRequest
): Promise<ApiResponse<GetProfileResponse>> => {
  return requestAsApiResponse(() => getPublic('getProfile', payload));
};

export const getEvents = async (): Promise<ApiResponse<GetEventsResponse>> => {
  return requestAsApiResponse(async () => {
    const resp = await fetch('https://storage.googleapis.com/sadhu-sanga/app-json/events.json');
    const data = (await resp.json()) as GetEventsResponse;
    return { data, status: 200, statusText: 'OK', headers: {}, config: {} } as any;
  });
};


