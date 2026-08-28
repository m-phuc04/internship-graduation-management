import axiosClient from './axiosClient';

export const thesisProgressApi = {
  // Student creates a new progress report (supports FormData for files)
  create: (data) => {
    if (data instanceof FormData) {
      return axiosClient.post('/thesis-progress', data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return axiosClient.post('/thesis-progress', data);
  },

  // Student gets own thesis progress history
  getMyProgress: () => axiosClient.get('/thesis-progress/my'),

  // Student submits a draft report
  submitDraft: (id) => axiosClient.patch(`/thesis-progress/${id}/submit`),

  // Lecturer gets all supervised theses with progress reports
  getSupervisedTheses: () =>
    axiosClient.get('/thesis-progress/lecturer/supervised'),

  // Lecturer reviews, grades, approves or rejects a progress report
  reviewProgress: (id, data) =>
    axiosClient.patch(`/thesis-progress/${id}/review`, data),

  // Get progress by thesis ID
  getByThesisId: (thesisId) =>
    axiosClient.get(`/thesis-progress/thesis/${thesisId}`),
};

export default thesisProgressApi;
