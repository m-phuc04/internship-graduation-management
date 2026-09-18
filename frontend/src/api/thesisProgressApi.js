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

  // Student updates a progress report (when DRAFT or NEEDS_REVISION)
  update: (id, data) => {
    if (data instanceof FormData) {
      return axiosClient.put(`/thesis-progress/${id}`, data, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });
    }
    return axiosClient.put(`/thesis-progress/${id}`, data);
  },

  // Student 2 confirms or rejects the progress report
  confirmStudent2: (id, data) =>
    axiosClient.patch(`/thesis-progress/${id}/confirm-student2`, data),

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

  // Update Thesis timeline (startDate & endDate)
  updateTimeline: (thesisId, data) =>
    axiosClient.patch(`/thesis-progress/thesis/${thesisId}/timeline`, data),
};


export default thesisProgressApi;
