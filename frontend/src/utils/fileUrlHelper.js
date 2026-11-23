/**
 * Hàm tiện ích xây dựng URL backend đầy đủ cho các file đã tải lên
 * Xử lý cả đường dẫn tương đối (/uploads/...) và URL tuyệt đối
 */
export const getFileUrl = (url) => {
  if (!url) return '';
  if (url.startsWith('http://') || url.startsWith('https://') || url.startsWith('blob:') || url.startsWith('data:')) {
    return url;
  }
  
  const backendBase = import.meta.env.VITE_BACKEND_URL || 'http://localhost:5000';
  const cleanBase = backendBase.endsWith('/') ? backendBase.slice(0, -1) : backendBase;
  const cleanPath = url.startsWith('/') ? url : `/${url}`;
  return `${cleanBase}${cleanPath}`;
};

export default getFileUrl;
