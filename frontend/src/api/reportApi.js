import axiosClient from './axiosClient';

export const reportApi = {
  // Sinh viên nộp hoặc lưu bản nháp báo cáo (Hỗ trợ FormData hoặc JSON)
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

  // Sinh viên cập nhật báo cáo (Hỗ trợ FormData hoặc JSON)
  update: (id, data) => {
    if (data instanceof FormData) {
      return axiosClient.put(`/internship-reports/${id}`, data, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });
    }
    return axiosClient.put(`/internship-reports/${id}`, data);
  },

  // Sinh viên lấy toàn bộ báo cáo của mình
  getMyReports: () => axiosClient.get('/internship-reports/my'),

  // Giảng viên lấy danh sách báo cáo của các sinh viên giám sát
  getForLecturer: (params) =>
    axiosClient.get('/internship-reports/lecturer/supervised', { params }),

  // TBM lấy danh sách toàn bộ báo cáo thực tập
  getForTbm: (params) =>
    axiosClient.get('/internship-reports/tbm/all', { params }),

  // Lấy thông tin báo cáo theo ID
  getById: (id) => axiosClient.get(`/internship-reports/${id}`),

  // Lấy toàn bộ báo cáo định kỳ của một hồ sơ thực tập cụ thể
  getByInternshipId: (internshipId) =>
    axiosClient.get(`/internship-reports/internship/${internshipId}`),

  // Giảng viên / TBM đánh giá, nhận xét báo cáo
  review: (id, data) =>
    axiosClient.patch(`/internship-reports/${id}/review`, data),
};

export default reportApi;
