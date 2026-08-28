import axiosClient from './axiosClient';

const academicTermApi = {
  // Get all terms
  getAllTerms: async (params = {}) => {
    return await axiosClient.get('/academic-terms', { params });
  },

  // Get current term (by date or active)
  getCurrentTerm: async (params = {}) => {
    return await axiosClient.get('/academic-terms/current', { params });
  },

  // Get active term
  getActiveTerm: async () => {
    return await axiosClient.get('/academic-terms/active');
  },

  // Get term details by ID
  getTermById: async (id) => {
    return await axiosClient.get(`/academic-terms/${id}`);
  },

  // Create new term
  createTerm: async (data) => {
    return await axiosClient.post('/academic-terms', data);
  },

  // Update term
  updateTerm: async (id, data) => {
    return await axiosClient.patch(`/academic-terms/${id}`, data);
  },

  // Activate term
  activateTerm: async (id) => {
    return await axiosClient.patch(`/academic-terms/${id}/activate`);
  },

  // Close term
  closeTerm: async (id) => {
    return await axiosClient.patch(`/academic-terms/${id}/close`);
  },

  // Delete term (safe delete)
  deleteTerm: async (id) => {
    return await axiosClient.delete(`/academic-terms/${id}`);
  },
};

export default academicTermApi;
