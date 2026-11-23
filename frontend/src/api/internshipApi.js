import axiosClient from './axiosClient';

export const internshipApi = {
  // TBM lấy danh sách hồ sơ thực tập kèm phân trang, tìm kiếm và lọc trạng thái
  getAll: (params) => axiosClient.get('/internships', { params }),

  // TBM lấy danh sách giảng viên khả dụng kèm số lượng sinh viên đang hướng dẫn
  getAvailableLecturers: (params) =>
    axiosClient.get('/internships/available-lecturers', { params }),

  // TBM phân công giảng viên giám sát cho hồ sơ thực tập
  assignLecturer: (id, lecturerId) =>
    axiosClient.patch(`/internships/${id}/assign-lecturer`, { lecturerId }),

  // TBM phê duyệt hồ sơ thực tập (có thể phân công giảng viên)
  approve: (id, lecturerId) =>
    axiosClient.patch(`/internships/${id}/approve`, { lecturerId }),

  // TBM từ chối hồ sơ thực tập kèm lý do
  reject: (id, rejectionReason) =>
    axiosClient.patch(`/internships/${id}/reject`, { rejectionReason }),

  // Giảng viên lấy danh sách hồ sơ thực tập được phân công giám sát
  getSupervised: (params) => axiosClient.get('/internships/supervised', { params }),

  // Giảng viên tiếp nhận giám sát hồ sơ thực tập
  supervisorAccept: (id) =>
    axiosClient.patch(`/internships/${id}/supervisor-accept`),

  // Giảng viên từ chối giám sát hồ sơ thực tập
  supervisorReject: (id, rejectionReason) =>
    axiosClient.patch(`/internships/${id}/supervisor-reject`, { reason: rejectionReason }),

  // Giảng viên / TBM đánh dấu hoàn thành đánh giá thực tập
  complete: (id) =>
    axiosClient.patch(`/internships/${id}/complete`),

  // Giảng viên giám sát cập nhật chu kỳ báo cáo (1, 2 hoặc 3 tuần/lần)
  updateReportCycle: (id, reportCycle) =>
    axiosClient.patch(`/internships/${id}/report-cycle`, { reportCycle }),

  // Giảng viên giám sát cập nhật chu kỳ báo cáo chung cho toàn học kỳ
  updateTermReportCycle: (academicTermId, reportCycle) =>
    axiosClient.put('/internships/report-cycle', { academicTermId, reportCycle }),

  // Giảng viên giám sát xác nhận hoặc cập nhật trạng thái ĐẠT PRETEST
  updatePretestStatus: (id, isPassed = true, note = '') =>
    axiosClient.patch(`/internships/${id}/pass-pretest`, { isPassed, note }),

  // Sinh viên tải lên file báo cáo thực tập chính thức
  uploadReportFile: (formData, id = null) => {
    const url = id ? `/internships/${id}/report-file` : '/internships/my/report-file';
    return axiosClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Sinh viên & Giảng viên giám sát gỡ file báo cáo thực tập
  deleteReportFile: (id = null, reason = '') => {
    const url = id ? `/internships/${id}/report-file` : '/internships/my/report-file';
    return axiosClient.delete(url, {
      data: { reason },
      params: reason ? { reason } : undefined,
    });
  },

  // Lấy thông tin file báo cáo thực tập
  getReportFile: (id) => axiosClient.get(`/internships/${id}/report-file`),

  // Giảng viên giám sát chấm điểm hoặc cập nhật điểm thực tập
  grade: (id, data) =>
    axiosClient.post('/evaluations/internship/grade', { ...data, internshipId: id }),

  // Sinh viên lấy thông tin hồ sơ thực tập và trạng thái hoạt động
  getMyInternship: (params) => axiosClient.get('/internships/my', { params }),

  // Sinh viên nộp đơn đăng ký thực tập doanh nghiệp
  register: (data) => axiosClient.post('/internships', data),

  // Lấy thông tin chi tiết hồ sơ thực tập theo ID
  getById: (id) => axiosClient.get(`/internships/${id}`),

  // Giảng viên & TBM: Lấy dữ liệu Giấy xác nhận hướng dẫn thực tập (Mẫu A)
  getSupervisionDocument: (params) =>
    axiosClient.get('/internships/supervision-document', { params }),

  // TBM & ADMIN: Xuất danh sách thực tập ra Excel
  exportExcel: (params) =>
    axiosClient.get('/internships/export', { params, responseType: 'blob' }),
};

export default internshipApi;
