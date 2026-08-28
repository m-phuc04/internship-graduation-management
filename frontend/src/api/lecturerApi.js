import axiosClient from './axiosClient';

export const lecturerApi = {
  getAll: (params) => axiosClient.get('/lecturers', { params }),
  getById: (id) => axiosClient.get(`/lecturers/${id}`),
  create: (data) => axiosClient.post('/lecturers', data),
  update: (id, data) => axiosClient.put(`/lecturers/${id}`, data),
  delete: (id) => axiosClient.delete(`/lecturers/${id}`),
  toggleActive: (id, isActive) => axiosClient.patch(`/lecturers/${id}/toggle-active`, { isActive }),
  deactivate: (id) => axiosClient.patch(`/lecturers/${id}/toggle-active`, { isActive: false }),
  activate: (id) => axiosClient.patch(`/lecturers/${id}/toggle-active`, { isActive: true }),
  updateMaxStudents: (id, maxSupervisedStudents) =>
    axiosClient.patch(`/lecturers/${id}/max-students`, { maxSupervisedStudents }),
};

export default lecturerApi;
