import axiosClient from './axiosClient';

export const dashboardApi = {
  getStudentDashboard: (params) => axiosClient.get('/dashboard/student', { params }),
  getTbmDashboard: (params) => axiosClient.get('/dashboard/tbm', { params }),
  getLecturerDashboard: (params) => axiosClient.get('/dashboard/lecturer', { params }),
  getCompanyDashboard: (params) => axiosClient.get('/dashboard/company', { params }),
};

export default dashboardApi;
