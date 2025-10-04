import axios, { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import NetInfo from '@react-native-community/netinfo';
import { requestMock } from './mock/mockApi';
import { log } from './logger';
import { getAuthToken } from '../storage/Session';
import { success, error } from './ApiResponse';
import type { ApiResponse } from './types';

export const API_BASE_URL: string = 'https://network.sadhusangaretreat.com';
export const NETWORK_TIMEOUT_MS: number = 10000;
export const USE_MOCK_API: boolean = false;
export const DEFAULT_API_VERSION: string = '1.8';

type ResponseLike<T> = { data: T };

type RequireAuthConfig = AxiosRequestConfig & { requireAuth?: boolean };

const createOfflineResponse = (method: string, endpoint: string) => {
  log('API Offline:', method, endpoint, 'User is offline');
  return {
    response: {
      status: 'OFFLINE',
      data: {
        message: 'You are currently offline. Please check your internet connection and try again.',
        error: 'NETWORK_OFFLINE',
      },
    },
  } as unknown as Error;
};

export function buildVersionPayload() {
  const appVersion = (Constants.expoConfig as any)?.version || '0.0.0';
  const osVersion = Platform.OS + ' ' + (Platform.Version?.toString() || '');
  const deviceString = 'install-' + Math.random().toString(36).slice(2, 8);
  const apiVersion = DEFAULT_API_VERSION;
  return { apiVersion, appVersion, osVersion, deviceString };
}

const axiosClient: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: NETWORK_TIMEOUT_MS,
});

axiosClient.interceptors.request.use(async (config: any) => {
  const method = (config.method || 'get').toUpperCase();
  log('API Request:', method, config.url, config.data || config.params);

  const needAuth = config.requireAuth !== false;
  if (needAuth) {
    const token = await getAuthToken();
    if (token) {
      config.headers = config.headers || {};
      (config.headers as any).Authorization = `Bearer ${token}`;
    }
  }
  return config;
});

axiosClient.interceptors.response.use(
  (response: AxiosResponse) => {
    log('API Response:', response.config.url, response.status, response.data);
    return response;
  },
  (errorObj: any) => {
    log('API Error:', errorObj.config?.url, errorObj.message, errorObj.response?.data);
    return Promise.reject(errorObj);
  }
);

export const get = async <T>(endpoint: string, params?: Record<string, any>, config?: RequireAuthConfig): Promise<ResponseLike<T>> => {
  if (USE_MOCK_API) {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw createOfflineResponse('GET', endpoint);
    }
    const mock = await requestMock('GET', endpoint, params);
    if ((mock as any).status === 'success') {
      return { data: (mock as any).data } as ResponseLike<T>;
    }
    throw { response: { status: (mock as any).code || 'MOCK', data: { message: (mock as any).message } } };
  }
  const res = await axiosClient.get<T>(endpoint, { params, requireAuth: true, ...(config as any || {}) } as any);
  return { data: res.data } as ResponseLike<T>;
};

export const post = async <T>(endpoint: string, data?: any, config?: RequireAuthConfig): Promise<ResponseLike<T>> => {
  if (USE_MOCK_API) {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw createOfflineResponse('POST', endpoint);
    }
    const mock = await requestMock('POST', endpoint, data);
    if ((mock as any).status === 'success') {
      return { data: (mock as any).data } as ResponseLike<T>;
    }
    throw { response: { status: (mock as any).code || 'MOCK', data: { message: (mock as any).message } } };
  }
  const res = await axiosClient.post<T>(endpoint, data, { requireAuth: true, ...(config as any || {}) } as any);
  return { data: res.data } as ResponseLike<T>;
};

export const put = async <T>(endpoint: string, data?: any, config?: RequireAuthConfig): Promise<ResponseLike<T>> => {
  if (USE_MOCK_API) {
    const netInfo = await NetInfo.fetch();
    if (!netInfo.isConnected) {
      throw createOfflineResponse('PUT', endpoint);
    }
    const mock = await requestMock('PUT', endpoint, data);
    if ((mock as any).status === 'success') {
      return { data: (mock as any).data } as ResponseLike<T>;
    }
    throw { response: { status: (mock as any).code || 'MOCK', data: { message: (mock as any).message } } };
  }
  const res = await axiosClient.put<T>(endpoint, data, { requireAuth: true, ...(config as any || {}) } as any);
  return { data: res.data } as ResponseLike<T>;
};

export const postPublic = async <T>(endpoint: string, data?: any, config?: RequireAuthConfig) => {
  return post<T>(endpoint, data, { requireAuth: false, ...(config || {}) });
};

export const getPublic = async <T>(endpoint: string, params?: Record<string, any>, config?: RequireAuthConfig) => {
  return get<T>(endpoint, params, { requireAuth: false, ...(config || {}) });
};

export const putPublic = async <T>(endpoint: string, params?: any, config?: RequireAuthConfig) => {
  return put<T>(endpoint, params, { requireAuth: false, ...(config || {}) });
};

export async function requestAsApiResponse<T>(fn: () => Promise<ResponseLike<T>>): Promise<ApiResponse<T>> {
  try {
    const res = await fn();
    return success(res.data) as ApiResponse<T>;
  } catch (e: any) {
    const code = e?.response?.status?.toString?.() || 'UNKNOWN';
    const message = e?.response?.data?.displayMessage || e?.response?.data?.errorMessage || e?.message || e?.response?.data?.error || e?.error || 'Something went wrong';
    if (code === 'OFFLINE') {
      return error('OFFLINE', 'You are currently offline. Please check your internet connection and try again.') as ApiResponse<T>;
    }
    return error(code, message) as ApiResponse<T>;
  }
}

export const apiClient = axiosClient;
export const api = { get, post, put, getPublic, postPublic, putPublic };


