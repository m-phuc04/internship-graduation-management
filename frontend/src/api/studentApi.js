import axiosClient from './axiosClient';

export const studentApi = {
  getAll: (params) => axiosClient.get('/students', { params }),
  getById: (id) => axiosClient.get(`/students/${id}`),
  create: (data) => axiosClient.post('/students', data),
  update: (id, data) => axiosClient.put(`/students/${id}`, data),
  delete: (id) => axiosClient.delete(`/students/${id}`),
  resetPassword: (id) => axiosClient.patch(`/students/${id}/reset-password`),
  toggleActive: (id, isActive) => axiosClient.patch(`/students/${id}/toggle-active`, { isActive }),
  deactivate: (id) => axiosClient.patch(`/students/${id}/toggle-active`, { isActive: false }),
  activate: (id) => axiosClient.patch(`/students/${id}/toggle-active`, { isActive: true }),
};

export default studentApi;
