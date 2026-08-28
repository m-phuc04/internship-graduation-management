import axiosClient from './axiosClient';

export const scheduleApi = {
  // All authenticated users can get schedules
  getAll: (params) => axiosClient.get('/schedules', { params }),

  // TBM & ADMIN only: Create a new schedule milestone
  create: (data) => axiosClient.post('/schedules', data),

  // TBM & ADMIN only: Update schedule milestone
  update: (id, data) => axiosClient.put(`/schedules/${id}`, data),

  // TBM & ADMIN only: Delete schedule milestone
  delete: (id) => axiosClient.delete(`/schedules/${id}`),
};

export default scheduleApi;
