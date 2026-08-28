import axiosClient from './axiosClient';

const profileApi = {
  // Get logged-in user profile details
  getProfile: () => {
    return axiosClient.get('/profile');
  },

  // Update profile (email, phone, etc.)
  updateProfile: (data) => {
    return axiosClient.patch('/profile', data);
  },

  // Get public profile of another user
  getPublicProfile: (id) => {
    return axiosClient.get(`/profile/public/${id}`);
  },

  // Change password
  changePassword: (data) => {
    return axiosClient.post('/auth/change-password', data);
  },
};

export default profileApi;
