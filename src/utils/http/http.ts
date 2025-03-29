import axios, {
  AxiosError,
  AxiosResponse,
  InternalAxiosRequestConfig,
} from 'axios';

import { storage } from '../storage/storage';

interface ExtendedAxiosRequestConfig extends InternalAxiosRequestConfig {
  _retry?: boolean;
}

interface RefreshTokenResponse {
  data: {
    accessToken: string;
    refreshToken: string;
  };
}

// Define API base URL
// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
const API_BASE_URL: string = import.meta.env.VITE_API_BASE_URL;

// Token keys for localStorage
const ACCESS_TOKEN_KEY = 'accessToken';
const REFRESH_TOKEN_KEY = 'refreshToken';

// Create an Axios instance
const http = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // Adjust timeout as needed
  headers: {
    'Content-Type': 'application/json',
  },
});

// Function to get access token from localStorage
const getAccessToken = (): string | null =>
  storage.local.getItem(ACCESS_TOKEN_KEY);

// Function to get refresh token from localStorage
const getRefreshToken = (): string | null =>
  storage.local.getItem(REFRESH_TOKEN_KEY);

// Function to save tokens to localStorage
export const saveTokens = (
  accessToken: string | undefined,
  refreshToken: string | undefined
) => {
  if (!(typeof accessToken === 'string' && typeof refreshToken === 'string')) {
    throw new Error('Invalid token types received from refresh-token endpoint');
  }
  storage.local.setItem(ACCESS_TOKEN_KEY, accessToken);
  storage.local.setItem(REFRESH_TOKEN_KEY, refreshToken);
};

// Function to clear tokens from localStorage
const clearTokens = () => {
  storage.local.removeItem(ACCESS_TOKEN_KEY);
  storage.local.removeItem(REFRESH_TOKEN_KEY);
};

// Request interceptor to attach the access token
http.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error: AxiosError) => Promise.reject(error)
);

// Response interceptor to handle token refresh logic
http.interceptors.response.use(
  (response: AxiosResponse) => response,
  async (error: AxiosError) => {
    const originalRequest: ExtendedAxiosRequestConfig | undefined =
      error.config;

    // Check if error is due to expired token
    if (
      error.response?.status === 401 &&
      originalRequest &&
      !(originalRequest._retry ?? false)
    ) {
      originalRequest._retry = true;

      const refreshToken = getRefreshToken();
      if (refreshToken) {
        try {
          const { data } = await axios.post<RefreshTokenResponse>(
            `${API_BASE_URL}/v1/auth/refresh-token`,
            {},
            {
              headers: {
                refreshToken,
              },
            }
          );

          // Save new tokens
          saveTokens(data?.data?.accessToken, data?.data?.refreshToken);

          if (typeof data?.data?.accessToken === 'string') {
            // Update original request with new access token
            originalRequest.headers = originalRequest.headers || {};
            originalRequest.headers.Authorization = `Bearer ${data?.data?.accessToken}`;
          }

          // Retry original request with updated access token
          return http(originalRequest);
        } catch (refreshError: unknown) {
          storage.local.clear();
          window.location.assign('/login');
          return Promise.reject(
            refreshError instanceof Error
              ? refreshError
              : new Error(String(refreshError))
          );
        }
      } else {
        clearTokens(); // Clear tokens if no refresh token
      }
    }

    return Promise.reject(error);
  }
);

export default http;
