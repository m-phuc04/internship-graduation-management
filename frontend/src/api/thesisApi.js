import axiosClient from './axiosClient';

export const thesisApi = {
  // Student registers a new thesis (1 or 2 students)
  register: (data) => axiosClient.post('/theses', data),

  // Student gets own thesis profile
  getMyThesis: (params) => axiosClient.get('/theses/my', { params }),

  // Get available supervisor lecturers with capacity stats
  getAvailableSupervisors: () => axiosClient.get('/theses/available-supervisors'),

  // Lookup student by MSSV for group partner
  lookupStudent: (studentCode) =>
    axiosClient.get(`/theses/lookup-student/${studentCode}`),

  // Search students for group partner from database
  searchStudents: (params) =>
    axiosClient.get('/theses/search-students', { params }),

  // Get thesis by student ID
  getByStudentId: (studentId) =>
    axiosClient.get(`/theses/student/${studentId}`),

  // ==========================================
  // Phase 12: Thesis Evaluation Endpoints
  // ==========================================

  // Get all theses for evaluation (Only reviewer1Id != null AND reviewer2Id != null)
  getEvaluations: (params) =>
    axiosClient.get('/theses/evaluations', { params }),

  // TBM marks thesis evaluation as COMPLETED
  completeEvaluation: (id) =>
    axiosClient.patch(`/theses/${id}/complete`),

  // ==========================================
  // Lecturer / Reviewer Endpoints
  // ==========================================

  // Lecturer gets all assigned theses (Supervisor / Reviewer 1 / Reviewer 2)
  getAssignedThesesForLecturer: (params) =>
    axiosClient.get('/theses/lecturer/assigned', { params }),

  // Lecturer grades thesis based on role (Supervisor / Reviewer 1 / Reviewer 2)
  gradeThesis: (id, data) => axiosClient.patch(`/theses/${id}/grade`, data),

  // Lecturer toggles lock for single thesis score
  toggleScoreLock: (id, data) => axiosClient.patch(`/theses/${id}/score-lock`, data),

  // Lecturer toggles lock for all assigned theses scores
  toggleAllScoresLock: (data) => axiosClient.patch('/theses/lecturer/score-lock-all', data),

  // Lecturer accepts / approves supervision of thesis
  supervisorAccept: (id) => axiosClient.patch(`/theses/${id}/supervisor-accept`),
  supervisorApprove: (id) => axiosClient.patch(`/theses/${id}/supervisor-approve`),

  // Lecturer rejects supervision of thesis
  supervisorReject: (id, data) =>
    axiosClient.patch(`/theses/${id}/supervisor-reject`, data),

  // ==========================================
  // TBM Management Endpoints
  // ==========================================

  // TBM gets all theses with search & filter
  getAllForTbm: (params) => axiosClient.get('/theses', { params }),

  // TBM approves a thesis
  approve: (id, data = {}) => axiosClient.patch(`/theses/${id}/approve`, data),

  // TBM rejects a thesis
  reject: (id, data = {}) => axiosClient.patch(`/theses/${id}/reject`, data),

  // TBM assigns / changes supervisor
  assignSupervisor: (id, data) =>
    axiosClient.patch(`/theses/${id}/assign-supervisor`, data),

  // TBM assigns Reviewer 1 & Reviewer 2
  assignReviewers: (id, data) =>
    axiosClient.patch(`/theses/${id}/assign-reviewers`, data),

  // ==========================================
  // KLTN Topic Management Endpoints (GV -> TBM -> SV FIFO)
  // ==========================================

  // GV: Batch create KLTN topics
  batchCreateTopics: (data) => axiosClient.post('/theses/topics/batch', data),

  // GV: Get own created KLTN topics
  getMyCreatedTopics: (params) => axiosClient.get('/theses/topics/my-created', { params }),

  // TBM: Get all KLTN topics for review
  getTopicsForTbm: (params) => axiosClient.get('/theses/topics/tbm', { params }),

  // TBM: Approve a topic
  approveTopic: (id) => axiosClient.patch(`/theses/topics/${id}/approve`),

  // TBM: Reject a topic
  rejectTopic: (id, data) => axiosClient.patch(`/theses/topics/${id}/reject`, data),

  // SV: Get approved KLTN topics
  getApprovedTopics: (params) => axiosClient.get('/theses/topics/approved', { params }),

  // SV: Register for a topic (FIFO)
  registerTopic: (id, data) => axiosClient.post(`/theses/topics/${id}/register`, data),

  // TBM & ADMIN: Export theses to Excel
  exportExcel: (params) =>
    axiosClient.get('/theses/export', { params, responseType: 'blob' }),
};

export default thesisApi;
