import axiosClient from './axiosClient';

export const internshipDocumentApi = {
  // Lấy danh sách tài liệu thực tập
  getAll: (params) => axiosClient.get('/internship-documents', { params }),

  // TBM tải lên tài liệu mới (file + description + academicTermId)
  create: (formData) =>
    axiosClient.post('/internship-documents', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }),

  // TBM gỡ / xóa tài liệu
  delete: (id) => axiosClient.delete(`/internship-documents/${id}`),
};

export default internshipDocumentApi;

