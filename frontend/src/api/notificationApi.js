import axiosClient from './axiosClient';

export const notificationApi = {
  getNotifications: (params) =>
    axiosClient.get('/notifications', { params }),
  getUnreadCount: () =>
    axiosClient.get('/notifications/unread-count'),
  markAsRead: (id) =>
    axiosClient.patch(`/notifications/${id}/read`),
  markAllAsRead: () =>
    axiosClient.patch('/notifications/read-all'),
};

export default notificationApi;
