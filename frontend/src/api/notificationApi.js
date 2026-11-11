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
  notifyCouncilAssignment: (data) =>
    axiosClient.post('/notifications/notify-council', data),
  getEmailSettings: () =>
    axiosClient.get('/notifications/email-settings'),
  updateEmailSettings: (data) =>
    axiosClient.put('/notifications/email-settings', data),
};

export default notificationApi;
