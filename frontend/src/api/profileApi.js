import axiosClient from './axiosClient';

const profileApi = {
  // Lấy thông tin chi tiết hồ sơ người dùng đang đăng nhập
  getProfile: () => {
    return axiosClient.get('/profile');
  },

  // Cập nhật hồ sơ cá nhân (email, số điện thoại,...)
  updateProfile: (data) => {
    return axiosClient.patch('/profile', data);
  },

  // Xem hồ sơ công khai của người dùng khác
  getPublicProfile: (id) => {
    return axiosClient.get(`/profile/public/${id}`);
  },

  // Đổi mật khẩu
  changePassword: (data) => {
    return axiosClient.post('/auth/change-password', data);
  },
};

export default profileApi;
