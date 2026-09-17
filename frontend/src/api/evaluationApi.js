import axiosClient from './axiosClient';

export const evaluationApi = {
  // Company gets list of internships with evaluation status
  getCompanyInternships: (params) =>
    axiosClient.get('/evaluations/company/internships', { params }),

  // Company creates or updates evaluation
  createOrUpdate: (data) => axiosClient.post('/evaluations', data),

  // Get evaluation by ID
  getById: (id) => axiosClient.get(`/evaluations/${id}`),

  // Lecturer gets evaluations for supervised students
  getForLecturer: (params) =>
    axiosClient.get('/evaluations/lecturer/supervised', { params }),

  // TBM gets all evaluations
  getForTbm: (params) =>
    axiosClient.get('/evaluations/tbm/all', { params }),

  // Student: Create or retrieve single evaluation link
  createStudentEvaluationLink: (data) =>
    axiosClient.post('/evaluations/student/create-link', data),

  // Student: Get my evaluation request and results
  getStudentEvaluationRequest: (params) =>
    axiosClient.get('/evaluations/student/my-request', { params }),

  // Public: Get evaluation form metadata by secure token
  getPublicEvaluationByToken: (token) =>
    axiosClient.get(`/evaluations/public/${token}`),

  // Public: Submit evaluation form by secure token
  submitPublicEvaluation: (token, data) =>
    axiosClient.post(`/evaluations/public/${token}`, data),

  // TBM: Get all evaluation requests across university
  tbmGetAllEvaluationRequests: (params) =>
    axiosClient.get('/evaluations/tbm/requests', { params }),

  // TBM: Reset request to allow student to re-create
  tbmResetEvaluationRequest: (id) =>
    axiosClient.post(`/evaluations/tbm/reset-request/${id}`),

  // Student: Request recreate evaluation link
  studentRequestRecreateLink: (data) =>
    axiosClient.post('/evaluations/student/request-recreate', data),

  // TBM: Get all recreate requests
  tbmGetRecreateRequests: (params) =>
    axiosClient.get('/evaluations/tbm/recreate-requests', { params }),

  // TBM: Approve recreate request
  tbmApproveRecreateRequest: (id) =>
    axiosClient.post(`/evaluations/tbm/approve-recreate/${id}`),

  // TBM: Reject recreate request
  tbmRejectRecreateRequest: (id, data) =>
    axiosClient.post(`/evaluations/tbm/reject-recreate/${id}`, data),

  // TBM: Delete evaluation result
  tbmDeleteEvaluation: (id) =>
    axiosClient.delete(`/evaluations/tbm/${id}`),
};

export default evaluationApi;
