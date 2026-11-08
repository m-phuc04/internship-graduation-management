import axiosClient from './axiosClient';

export const internshipApi = {
  // TBM gets all internships with pagination, search, and status filter
  getAll: (params) => axiosClient.get('/internships', { params }),

  // TBM gets available lecturers with workload counts
  getAvailableLecturers: () => axiosClient.get('/internships/available-lecturers'),

  // TBM assigns lecturer to internship
  assignLecturer: (id, lecturerId) =>
    axiosClient.patch(`/internships/${id}/assign-lecturer`, { lecturerId }),

  // TBM approves internship (optional lecturer assignment)
  approve: (id, lecturerId) =>
    axiosClient.patch(`/internships/${id}/approve`, { lecturerId }),

  // TBM rejects internship with reason
  reject: (id, rejectionReason) =>
    axiosClient.patch(`/internships/${id}/reject`, { rejectionReason }),

  // Lecturer gets assigned supervised internships
  getSupervised: (params) => axiosClient.get('/internships/supervised', { params }),

  // Lecturer accepts supervision of internship
  supervisorAccept: (id) =>
    axiosClient.patch(`/internships/${id}/supervisor-accept`),

  // Lecturer rejects supervision of internship
  supervisorReject: (id, rejectionReason) =>
    axiosClient.patch(`/internships/${id}/supervisor-reject`, { reason: rejectionReason }),

  // Lecturer / TBM marks internship evaluation as completed
  complete: (id) =>
    axiosClient.patch(`/internships/${id}/complete`),

  // Lecturer (GVGS) updates report cycle (1, 2, or 3 weeks/time)
  updateReportCycle: (id, reportCycle) =>
    axiosClient.patch(`/internships/${id}/report-cycle`, { reportCycle }),

  // Lecturer (GVGS) updates common report cycle for entire academic term
  updateTermReportCycle: (academicTermId, reportCycle) =>
    axiosClient.put('/internships/report-cycle', { academicTermId, reportCycle }),

  // Lecturer (GVGS) confirms or updates PASS PRETEST status (Prompt 2 - Requirement 3)
  updatePretestStatus: (id, isPassed = true, note = '') =>
    axiosClient.patch(`/internships/${id}/pass-pretest`, { isPassed, note }),

  // Student uploads internship report file (Prompt 2 - Requirement 1)
  uploadReportFile: (formData, id = null) => {
    const url = id ? `/internships/${id}/report-file` : '/internships/my/report-file';
    return axiosClient.post(url, formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    });
  },

  // Get report file info (Prompt 2 - Requirement 1)
  getReportFile: (id) => axiosClient.get(`/internships/${id}/report-file`),

  // Lecturer (GVGS) grades or updates grade for internship (Prompt 2 - Requirement 4 & 5)
  grade: (id, data) =>
    axiosClient.post('/evaluations/internship/grade', { ...data, internshipId: id }),

  // Student gets own internship profile & active status
  getMyInternship: (params) => axiosClient.get('/internships/my', { params }),

  // Get active companies for registration selection
  getActiveCompanies: () => axiosClient.get('/internships/active-companies'),

  // Student registers a new internship
  register: (data) => axiosClient.post('/internships', data),

  // Get details of an internship by ID
  getById: (id) => axiosClient.get(`/internships/${id}`),

  // Lecturer & TBM: Get Supervision Confirmation Document Data (Document A)
  getSupervisionDocument: (params) =>
    axiosClient.get('/internships/supervision-document', { params }),

  // TBM & ADMIN: Export internships to Excel
  exportExcel: (params) =>
    axiosClient.get('/internships/export', { params, responseType: 'blob' }),
};

export default internshipApi;
