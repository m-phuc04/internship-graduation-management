import axiosClient from './axiosClient';

const newsApi = {
  // Các API công khai
  getPublicNews: (params) => {
    return axiosClient.get('/news', { params });
  },

  getNewsById: (id) => {
    return axiosClient.get(`/news/${id}`);
  },

  // Các API quản lý dành cho Giảng viên / TBM / Admin
  getMyNews: (params) => {
    return axiosClient.get('/news/manage/my', { params });
  },

  createNews: (data) => {
    return axiosClient.post('/news', data);
  },

  updateNews: (id, data) => {
    return axiosClient.put(`/news/${id}`, data);
  },

  togglePublish: (id) => {
    return axiosClient.patch(`/news/${id}/status`);
  },

  deleteNews: (id) => {
    return axiosClient.delete(`/news/${id}`);
  },
};

export default newsApi;
