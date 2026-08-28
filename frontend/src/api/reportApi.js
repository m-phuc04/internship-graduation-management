import axiosClient from './axiosClient';

export const reportApi = {
  // Student submits or saves draft report (Supports FormData or JSON)
  create: (data) => {
    if (data instanceof FormData) {
      return axiosClient.post('/internship-reports', data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return axiosClient.post('/internship-reports', data);
  },

  // Student gets all their own reports
  getMyReports: () => axiosClient.get('/internship-reports/my'),

  // Lecturer gets reports for supervised students
  getForLecturer: (params) =>
    axiosClient.get('/internship-reports/lecturer/supervised', { params }),

  // TBM gets all reports
  getForTbm: (params) =>
    axiosClient.get('/internship-reports/tbm/all', { params }),

  // Get report by ID
  getById: (id) => axiosClient.get(`/internship-reports/${id}`),

  // Lecturer / TBM reviews report
  review: (id, data) =>
    axiosClient.patch(`/internship-reports/${id}/review`, data),
};

export default reportApi;
