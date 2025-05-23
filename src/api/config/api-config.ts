import axios, { AxiosError, AxiosInstance, AxiosHeaders } from 'axios';

// Sử dụng base URL trực tiếp đến API ngoài
const API_BASE_URL = 'https://api.smtp.dev';
const MERCURE_BASE_URL = import.meta.env.VITE_MERCURE_URL || '/mercure-api';

// Tạo instance axios với cấu hình mặc định
export const createApiClient = (apiKey: string): AxiosInstance => {
  console.log('Creating API client with base URL:', API_BASE_URL);
  
  if (!apiKey || apiKey.trim() === '') {
    console.error('Invalid API key provided to createApiClient');
    throw new Error('Invalid API key');
  }
  
  const client = axios.create({
    baseURL: API_BASE_URL,
    headers: {
      'X-API-KEY': apiKey,
      'Accept': 'application/json',
      'Content-Type': 'application/json'
    },
    withCredentials: false // Disable withCredentials since we're using wildcard origin
  });

  // Request interceptor for logging
  client.interceptors.request.use(
    (config) => {
      // Đảm bảo headers tồn tại
      if (!config.headers) {
        config.headers = new AxiosHeaders();
      }
      
      console.log('🚀 API Request:', config.method?.toUpperCase(), config.url);
      return config;
    },
    (error) => {
      console.error('❌ Request Error:', error);
      return Promise.reject(error);
    }
  );

  // Response interceptor
  client.interceptors.response.use(
    (response) => {
      console.log('✅ API Response:', response.status, response.config.url);
      return response;
    },
    (error: AxiosError) => {
      if (error.response) {
        switch (error.response.status) {
          case 401:
            console.error('Unauthorized: API key không hợp lệ hoặc bị thiếu');
            break;
          case 404:
            console.error('Not found: Tài nguyên không tồn tại');
            break;
          case 422:
            console.error('Validation error:', error.response.data);
            break;
          case 429:
            console.error('Rate limit exceeded: Quá nhiều yêu cầu trong một thời gian ngắn');
            break;
          default:
            console.error(`Error ${error.response.status}:`, error.response.data);
        }
      } else if (error.request) {
        console.error('Network error: Không thể kết nối đến API');
      } else {
        console.error('Error:', error.message);
      }
      return Promise.reject(error);
    }
  );

  return client;
};

// Tạo function để kiểm tra phản hồi thành công
export const isSuccessResponse = (status: number): boolean => {
  return status >= 200 && status <= 204;
};

export const createEventSourceConfig = (apiKey: string, accountId: string) => {
  return {
    url: `${MERCURE_BASE_URL}/.well-known/mercure?topic=/accounts/${accountId}`,
    headers: {
      Authorization: `Bearer ${apiKey}`
    }
  };
}; 