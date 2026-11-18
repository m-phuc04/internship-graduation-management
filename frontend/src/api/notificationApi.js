import axiosClient from './axiosClient';

export const triggerNotificationRefresh = () => {
  if (typeof window !== 'undefined') {
    window.dispatchEvent(new CustomEvent('notifications_updated'));
  }
};

export const notificationApi = {
  getNotifications: (params) =>
    axiosClient.get('/notifications', { params }),
  getUnreadCount: () =>
    axiosClient.get('/notifications/unread-count'),
  create: async (data) => {
    const res = await axiosClient.post('/notifications', data);
    triggerNotificationRefresh();
    return res;
  },
  markAsRead: async (id) => {
    const res = await axiosClient.patch(`/notifications/${id}/read`);
    triggerNotificationRefresh();
    return res;
  },
  markAllAsRead: async () => {
    const res = await axiosClient.patch('/notifications/read-all');
    triggerNotificationRefresh();
    return res;
  },
  notifyCouncilAssignment: async (data) => {
    const res = await axiosClient.post('/notifications/notify-council', data);
    triggerNotificationRefresh();
    return res;
  },
  getEmailSettings: () =>
    axiosClient.get('/notifications/email-settings'),
  updateEmailSettings: (data) =>
    axiosClient.put('/notifications/email-settings', data),
};

export default notificationApi;
