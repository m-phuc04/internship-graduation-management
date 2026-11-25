import axiosClient from './axiosClient';

const academicTermApi = {
  // Lấy danh sách tất cả học kỳ
  getAllTerms: async (params = {}) => {
    return await axiosClient.get('/academic-terms', { params });
  },

  // Lấy học kỳ hiện tại (theo ngày hoặc đang kích hoạt)
  getCurrentTerm: async (params = {}) => {
    return await axiosClient.get('/academic-terms/current', { params });
  },

  // Lấy học kỳ đang kích hoạt
  getActiveTerm: async () => {
    return await axiosClient.get('/academic-terms/active');
  },

  // Lấy thông tin chi tiết học kỳ theo ID
  getTermById: async (id) => {
    return await axiosClient.get(`/academic-terms/${id}`);
  },

  // Tạo học kỳ mới
  createTerm: async (data) => {
    return await axiosClient.post('/academic-terms', data);
  },

  // Cập nhật thông tin học kỳ
  updateTerm: async (id, data) => {
    return await axiosClient.patch(`/academic-terms/${id}`, data);
  },

  // Kích hoạt học kỳ
  activateTerm: async (id) => {
    return await axiosClient.patch(`/academic-terms/${id}/activate`);
  },

  // Đóng học kỳ
  closeTerm: async (id) => {
    return await axiosClient.patch(`/academic-terms/${id}/close`);
  },

  // Xóa học kỳ (Xóa an toàn)
  deleteTerm: async (id) => {
    return await axiosClient.delete(`/academic-terms/${id}`);
  },

  // Bật/tắt khóa đăng ký KLTN (TBM / ADMIN)
  toggleThesisRegistrationLock: async (id, data) => {
    return await axiosClient.patch(`/academic-terms/${id}/toggle-thesis-registration-lock`, data);
  },

  // Xuất danh sách sinh viên TTDN theo học kỳ (ADMIN)
  exportTermStudentsTTDN: async (id) => {
    return await axiosClient.get(`/academic-terms/${id}/export/ttdn`, {
      responseType: 'blob',
    });
  },

  // Xuất danh sách sinh viên KLTN theo học kỳ (ADMIN)
  exportTermStudentsKLTN: async (id) => {
    return await axiosClient.get(`/academic-terms/${id}/export/kltn`, {
      responseType: 'blob',
    });
  },
};

export default academicTermApi;
