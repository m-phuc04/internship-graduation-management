import axiosClient from './axiosClient';

export const councilApi = {
  // Get all councils (optionally filter by academicTermId, search)
  getAll: (params) => axiosClient.get('/councils', { params }),

  // Get council by ID
  getById: (id) => axiosClient.get(`/councils/${id}`),

  // Create new council
  create: (data) => axiosClient.post('/councils', data),

  // Update council / assign lecturers
  update: (id, data) => axiosClient.put(`/councils/${id}`, data),

  // Delete council
  delete: (id) => axiosClient.delete(`/councils/${id}`),

  // Assign or unassign council to a thesis
  assignThesis: (data) => axiosClient.post('/councils/assign-thesis', data),

  // Bulk update report date for all councils in a term
  bulkUpdateDate: (data) => axiosClient.put('/councils/bulk/report-date', data),

  // Batch assign theses to a council room (max 5)
  batchAssignTheses: (data) => axiosClient.post('/councils/batch/assign-theses', data),

  // Clear all councils
  clearAll: (params) => axiosClient.delete('/councils/clear-all', { params }),
};

export default councilApi;
