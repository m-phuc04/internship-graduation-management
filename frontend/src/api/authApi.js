import axiosClient from './axiosClient';

export const authApi = {
  getCaptcha: () => axiosClient.get('/auth/captcha'),
  login: (credentials) => axiosClient.post('/auth/login', credentials),
  logout: (userId) => axiosClient.post('/auth/logout', { userId }),
  refresh: (refreshToken) => axiosClient.post('/auth/refresh', { refreshToken }),
  getMe: () => axiosClient.get('/auth/me'),
};

export default authApi;
