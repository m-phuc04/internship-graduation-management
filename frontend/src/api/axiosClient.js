import axios from 'axios';

const axiosClient = axios.create({
  baseURL: '/api',
  headers: {
    'Content-Type': 'application/json',
  },
  withCredentials: true,
});

// Request interceptor: attach Bearer token
axiosClient.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('accessToken');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error),
);

// Response interceptor: handle token expiration / errors safely
axiosClient.interceptors.response.use(
  (response) => response.data,
  async (error) => {
    const originalRequest = error.config || {};

    // Handle 401 and try refresh token once if user was logged in
    if (error.response?.status === 401 && !originalRequest._retry) {
      originalRequest._retry = true;
      const refreshToken = localStorage.getItem('refreshToken');
      const accessToken = localStorage.getItem('accessToken');

      // Only attempt refresh if tokens were present and this isn't an auth route
      if (refreshToken && accessToken && !originalRequest.url?.includes('/auth/')) {
        try {
          const res = await axios.post('/api/auth/refresh', { refreshToken });
          if (res.data?.data?.accessToken) {
            const newAccessToken = res.data.data.accessToken;
            localStorage.setItem('accessToken', newAccessToken);
            originalRequest.headers.Authorization = `Bearer ${newAccessToken}`;
            return axios(originalRequest);
          }
        } catch (refreshErr) {
          localStorage.removeItem('accessToken');
          localStorage.removeItem('refreshToken');
          localStorage.removeItem('user');
          return Promise.reject(refreshErr);
        }
      }
    }

    const customError = {
      message: error.response?.data?.message || error.message || 'Đã có lỗi xảy ra',
      status: error.response?.status || 500,
      data: error.response?.data,
    };

    return Promise.reject(customError);
  },
);

export default axiosClient;
