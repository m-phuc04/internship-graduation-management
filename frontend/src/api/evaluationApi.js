import axiosClient from './axiosClient';

export const evaluationApi = {
  // Lecturer (GVGS) grades internship
  gradeInternship: (data) =>
    axiosClient.post('/evaluations/internship/grade', data),

  // Get evaluation by ID
  getById: (id) => axiosClient.get(`/evaluations/${id}`),

  // Lecturer gets evaluations for supervised students
  getForLecturer: (params) =>
    axiosClient.get('/evaluations/lecturer/supervised', { params }),

  // TBM gets all evaluations
  getForTbm: (params) =>
    axiosClient.get('/evaluations/tbm/all', { params }),

  // TBM: Delete evaluation result
  tbmDeleteEvaluation: (id) =>
    axiosClient.delete(`/evaluations/tbm/${id}`),

  // TBM / Lecturer: Publish single internship score
  tbmPublishScore: (id) =>
    axiosClient.post(`/evaluations/tbm/publish/${id}`),

  publishScore: (id) =>
    axiosClient.post(`/evaluations/publish/${id}`),

  // TBM: Publish bulk internship scores
  tbmPublishScoresBulk: (data) =>
    axiosClient.post('/evaluations/tbm/publish-bulk', data),

  // TBM: Hide published internship score (single)
  tbmHideScore: (id, data) =>
    axiosClient.post(`/evaluations/tbm/hide/${id}`, data),

  // TBM: Hide published internship scores (bulk)
  tbmHideScoresBulk: (data) =>
    axiosClient.post('/evaluations/tbm/hide-bulk', data),

  // TBM: Republish hidden internship score (single)
  tbmRepublishScore: (id, data) =>
    axiosClient.post(`/evaluations/tbm/republish/${id}`, data),
};

export default evaluationApi;
