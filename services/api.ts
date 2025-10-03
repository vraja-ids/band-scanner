// Backwards-compat shim that forwards to new network layer (TypeScript)
import { api as networkApi } from '../network/api';

export const api = {
  get: async <T = any>(endpoint: string, params: Record<string, any> = {}) => {
    const res = await networkApi.get<T>(endpoint, params);
    return (res as any).data ?? (res as unknown as T);
  },
  post: async <T = any>(endpoint: string, body: Record<string, any> = {}) => {
    const res = await networkApi.post<T>(endpoint, body);
    return (res as any).data ?? (res as unknown as T);
  },
  put: async <T = any>(endpoint: string, body: Record<string, any> = {}) => {
    const res = await networkApi.put<T>(endpoint, body);
    return (res as any).data ?? (res as unknown as T);
  },
};


