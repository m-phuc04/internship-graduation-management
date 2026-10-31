import axiosClient from './axiosClient';

export const thesisDocumentApi = {
  // 1. Phía Giảng viên
  getLecturerThesesList: (params) =>
    axiosClient.get('/thesis-documents/lecturer/theses-list', { params }),

  getLecturerGuides: (params) =>
    axiosClient.get('/thesis-documents/lecturer/guides', { params }),

  createLecturerGuide: (formData) =>
    axiosClient.post('/thesis-documents/lecturer/guides', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteLecturerGuide: (id) =>
    axiosClient.delete(`/thesis-documents/lecturer/guides/${id}`),

  getLecturerSubmissions: (params) =>
    axiosClient.get('/thesis-documents/lecturer/submissions', { params }),

  // 2. Phía Sinh viên
  getStudentGuides: (params) =>
    axiosClient.get('/thesis-documents/student/guides', { params }),

  getStudentSubmissions: (params) =>
    axiosClient.get('/thesis-documents/student/submissions', { params }),

  createStudentSubmission: (formData) =>
    axiosClient.post('/thesis-documents/student/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteStudentSubmission: (id) =>
    axiosClient.delete(`/thesis-documents/student/submissions/${id}`),
};

export default thesisDocumentApi;
