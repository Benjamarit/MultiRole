import axios from 'axios';

export const TOKEN_STORAGE_KEY = 'ce_token';

const apiClient = axios.create({
  baseURL: import.meta.env.VITE_API_URL || '/api',
  timeout: 8000,
  headers: {
    'Content-Type': 'application/json',
  },
});

apiClient.interceptors.request.use((config) => {
  try {
    const token = localStorage.getItem(TOKEN_STORAGE_KEY);
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
  } catch {
    // ignore storage access errors
  }
  return config;
});

export default apiClient;

apiClient.interceptors.response.use((response) => response, (error) => {
  const body = error.response?.data;
  error.message = (typeof body === 'string' && body) || body?.message || body?.detail ||
    (error.response ? 'ไม่สามารถดำเนินการได้ กรุณาลองอีกครั้ง' : 'เชื่อมต่อ BackEnd ไม่ได้ กรุณาตรวจสอบว่าเซิร์ฟเวอร์กำลังทำงาน');
  if (error.response?.status === 401 && !error.config?.url?.startsWith('/auth/')) {
    window.dispatchEvent(new Event('ce:unauthorized'));
  }
  return Promise.reject(error);
});
