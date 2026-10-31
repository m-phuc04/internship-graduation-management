import axiosClient from './axiosClient';

const researchFieldApi = {
  // Lấy tất cả lĩnh vực trong hệ thống
  getAllFields: async () => {
    return await axiosClient.get('/fields');
  },

  // Thêm lĩnh vực mới (TBM)
  createField: async (data) => {
    return await axiosClient.post('/fields', data);
  },

  // Xóa lĩnh vực (TBM)
  deleteField: async (id) => {
    return await axiosClient.delete(`/fields/${id}`);
  },

  // Lấy danh sách giảng viên kèm lĩnh vực (TBM)
  getLecturersWithFields: async () => {
    return await axiosClient.get('/fields/lecturers');
  },

  // Gán lĩnh vực cho một hoặc nhiều giảng viên (TBM)
  assignFields: async (data) => {
    return await axiosClient.put('/fields/lecturers/assign', data);
  },

  // Giảng viên lấy yêu cầu đang chờ duyệt & lĩnh vực hiện tại
  getMyRequest: async () => {
    return await axiosClient.get('/fields/my-request');
  },

  // Giảng viên gửi yêu cầu thay đổi lĩnh vực
  createRequest: async (data) => {
    return await axiosClient.post('/fields/request', data);
  },

  // TBM lấy danh sách yêu cầu thay đổi lĩnh vực
  getAllRequests: async () => {
    return await axiosClient.get('/fields/requests');
  },

  // TBM duyệt yêu cầu
  approveRequest: async (id) => {
    return await axiosClient.post(`/fields/requests/${id}/approve`);
  },

  // TBM từ chối yêu cầu
  rejectRequest: async (id) => {
    return await axiosClient.post(`/fields/requests/${id}/reject`);
  },
};

export default researchFieldApi;
