import axiosClient from './axiosClient';

export const internshipDocumentApi = {
  // 1. Phía Trưởng Bộ Môn (TBM)
  getAll: (params) => axiosClient.get('/internship-documents', { params }),

  create: (formData) =>
    axiosClient.post('/internship-documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  delete: (id) => axiosClient.delete(`/internship-documents/${id}`),

  // 2. Phía Giảng viên Giám sát (GVGS)
  getLecturerInternshipsList: (params) =>
    axiosClient.get('/internship-documents/lecturer/internships-list', { params }),

  getLecturerGuides: (params) =>
    axiosClient.get('/internship-documents/lecturer/guides', { params }),

  createLecturerGuide: (formData) =>
    axiosClient.post('/internship-documents/lecturer/guides', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  updateLecturerGuide: (id, formData) =>
    axiosClient.put(`/internship-documents/lecturer/guides/${id}`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteLecturerGuide: (id) =>
    axiosClient.delete(`/internship-documents/lecturer/guides/${id}`),

  getLecturerSubmissions: (params) =>
    axiosClient.get('/internship-documents/lecturer/submissions', { params }),

  // 3. Phía Sinh viên (Student)
  getStudentGuides: (params) =>
    axiosClient.get('/internship-documents/student/guides', { params }),

  getStudentSubmissions: (params) =>
    axiosClient.get('/internship-documents/student/submissions', { params }),

  createStudentSubmission: (formData) =>
    axiosClient.post('/internship-documents/student/submissions', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),

  deleteStudentSubmission: (id) =>
    axiosClient.delete(`/internship-documents/student/submissions/${id}`),
};

export default internshipDocumentApi;
