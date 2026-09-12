import { apiUrl } from './api';
import { getAccessToken, clearTokens } from './auth-tokens';
import { router } from 'expo-router';

type FetchOptions = RequestInit & {
  params?: Record<string, string>;
};

class ApiClient {
  private async request<T>(endpoint: string, options: FetchOptions = {}): Promise<T> {
    const accessToken = await getAccessToken();
    const url = new URL(apiUrl(endpoint));
    
    if (options.params) {
      Object.keys(options.params).forEach(key => 
        url.searchParams.append(key, options.params![key])
      );
    }

    const headers = new Headers(options.headers);
    headers.set('Content-Type', 'application/json');
    if (accessToken) {
      headers.set('Authorization', `Bearer ${accessToken}`);
    }

    const response = await fetch(url.toString(), {
      ...options,
      headers,
    });

    if (response.status === 401) {
      // Handle Token Expiry
      await clearTokens();
      router.replace('/login');
      throw new Error('Session expired');
    }

    const data = await response.json();
    if (!response.ok) {
      throw data;
    }

    return data as T;
  }

  get<T>(endpoint: string, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: any, options?: FetchOptions) {
    return this.request<T>(endpoint, { 
      ...options, 
      method: 'POST', 
      body: JSON.stringify(body) 
    });
  }

  put<T>(endpoint: string, body?: any, options?: FetchOptions) {
    return this.request<T>(endpoint, { 
      ...options, 
      method: 'PUT', 
      body: JSON.stringify(body) 
    });
  }

  delete<T>(endpoint: string, options?: FetchOptions) {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}

export const apiClient = new ApiClient();
