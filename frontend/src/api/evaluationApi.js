import axiosClient from './axiosClient';

export const evaluationApi = {
  // Giảng viên giám sát chấm điểm thực tập
  gradeInternship: (data) =>
    axiosClient.post('/evaluations/internship/grade', data),

  // Lấy thông tin phiếu đánh giá theo ID
  getById: (id) => axiosClient.get(`/evaluations/${id}`),

  // Giảng viên lấy danh sách đánh giá của các sinh viên giám sát
  getForLecturer: (params) =>
    axiosClient.get('/evaluations/lecturer/supervised', { params }),

  // TBM lấy danh sách tất cả đánh giá thực tập
  getForTbm: (params) =>
    axiosClient.get('/evaluations/tbm/all', { params }),

  // TBM: Xóa kết quả đánh giá
  tbmDeleteEvaluation: (id) =>
    axiosClient.delete(`/evaluations/tbm/${id}`),

  // TBM / Giảng viên: Công bố điểm thực tập cho một sinh viên
  tbmPublishScore: (id) =>
    axiosClient.post(`/evaluations/tbm/publish/${id}`),

  publishScore: (id) =>
    axiosClient.post(`/evaluations/publish/${id}`),

  // TBM: Công bố điểm thực tập hàng loạt
  tbmPublishScoresBulk: (data) =>
    axiosClient.post('/evaluations/tbm/publish-bulk', data),

  // TBM: Ẩn điểm thực tập đã công bố (Đơn lẻ)
  tbmHideScore: (id, data) =>
    axiosClient.post(`/evaluations/tbm/hide/${id}`, data),

  // TBM: Ẩn điểm thực tập đã công bố (Hàng loạt)
  tbmHideScoresBulk: (data) =>
    axiosClient.post('/evaluations/tbm/hide-bulk', data),

  // TBM: Công bố lại điểm thực tập bị ẩn
  tbmRepublishScore: (id, data) =>
    axiosClient.post(`/evaluations/tbm/republish/${id}`, data),
};

export default evaluationApi;
