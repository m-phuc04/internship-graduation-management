import axiosClient from './axiosClient';

export const evaluationApi = {
  // Lecturer (GVGS) grades internship
  gradeInternship: (data) =>
    axiosClient.post('/evaluations/internship/grade', data),

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

  // Student: Get my evaluation request and results
  getStudentEvaluationRequest: (params) =>
    axiosClient.get('/evaluations/student/my-request', { params }),

  // TBM: Delete evaluation result
  tbmDeleteEvaluation: (id) =>
    axiosClient.delete(`/evaluations/tbm/${id}`),

  // TBM: Publish single internship score
  tbmPublishScore: (id) =>
    axiosClient.post(`/evaluations/tbm/publish/${id}`),

  // TBM: Publish bulk internship scores
  tbmPublishScoresBulk: (data) =>
    axiosClient.post('/evaluations/tbm/publish-bulk', data),
};

export default evaluationApi;
