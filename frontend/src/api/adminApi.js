import axiosClient from './axiosClient';

const adminApi = {
  getPermissionsList: async () => {
    const response = await axiosClient.get('/admin/permissions');
    return response;
  },

  updateLecturerPermissions: async (lecturerId, payload) => {
    const response = await axiosClient.patch(`/admin/permissions/${lecturerId}`, payload);
    return response;
  },

  getAllUsers: async (params = {}) => {
    const response = await axiosClient.get('/admin/users', { params });
    return response;
  },

  toggleUserStatus: async (userId) => {
    const response = await axiosClient.patch(`/admin/users/${userId}/status`);
    return response;
  },

  resetPassword: async (userId, newPassword = '1111') => {
    const response = await axiosClient.post(`/admin/users/${userId}/reset-password`, { newPassword });
    return response;
  },
};

export default adminApi;
