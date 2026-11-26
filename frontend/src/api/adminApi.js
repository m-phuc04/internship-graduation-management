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

  resetPassword: async (userId) => {
    const response = await axiosClient.post(`/admin/users/${userId}/reset-password`);
    return response;
  },

  getStudentExcelTemplate: async () => {
    const response = await axiosClient.get('/admin/students/excel-template', {
      responseType: 'blob',
    });
    return response;
  },

  previewStudentExcel: async (formData) => {
    const response = await axiosClient.post('/admin/students/import-preview', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
    return response;
  },

  confirmImportStudents: async (validRows) => {
    const response = await axiosClient.post('/admin/students/import-confirm', { validRows });
    return response;
  },

  resendStudentCredentials: async (payload) => {
    const response = await axiosClient.post('/admin/students/resend-credentials', payload);
    return response;
  },

  getSystemLogs: async (params = {}) => {
    const response = await axiosClient.get('/admin/logs', { params });
    return response;
  },

  getEmailSettings: async () => {
    const response = await axiosClient.get('/admin/email-settings');
    return response;
  },

  updateEmailSettings: async (payload) => {
    const response = await axiosClient.patch('/admin/email-settings', payload);
    return response;
  },
};

export default adminApi;
