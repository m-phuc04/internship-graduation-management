import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

const LecturerFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  loading = false,
}) => {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: 'Password@123',
    phone: '',
    lecturerCode: '',
    academicTitle: 'ThS.',
    specialization: '',
    isAvailable: true,
    isActive: true,
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        fullName: initialData.userId?.fullName || '',
        email: initialData.userId?.email || '',
        password: '',
        phone: initialData.userId?.phone || '',
        lecturerCode: initialData.lecturerCode || '',
        academicTitle: initialData.academicTitle || 'ThS.',
        specialization: initialData.specialization || '',
        isAvailable: initialData.isAvailable ?? true,
        isActive: initialData.userId?.isActive ?? true,
      });
    } else {
      setFormData({
        fullName: '',
        email: '',
        password: 'Password@123',
        phone: '',
        lecturerCode: '',
        academicTitle: 'ThS.',
        specialization: '',
        isAvailable: true,
        isActive: true,
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Họ tên là bắt buộc';
    if (!formData.email.trim()) errs.email = 'Email là bắt buộc';
    if (!formData.lecturerCode || !formData.lecturerCode.trim()) {
      formData.lecturerCode = String(Math.floor(10000000 + Math.random() * 90000000));
    }
    if (!isEdit && !formData.password) errs.password = 'Mật khẩu là bắt buộc';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit(formData);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEdit ? 'Chỉnh sửa Thông tin Giảng viên' : 'Thêm mới Giảng viên'}
      subtitle={
        isEdit
          ? (initialData?.academicTitle || 'Cập nhật thông tin giảng viên')
          : 'Tạo tài khoản và phân quyền Giảng viên hướng dẫn / phản biện'
      }
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name */}
        <div>
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên giảng viên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="VD: TS. Nguyễn Văn A"
              className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition ${
                errors.fullName ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'
              }`}
            />
            {errors.fullName && (
              <p className="text-xs text-rose-500 mt-1">{errors.fullName}</p>
            )}
          </div>

          
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email công tác <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="VD: lecturer@iuh.edu.vn"
              className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition ${
                errors.email ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'
              }`}
            />
            {errors.email && (
              <p className="text-xs text-rose-500 mt-1">{errors.email}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số điện thoại
            </label>
            <input
              type="text"
              name="phone"
              value={formData.phone}
              onChange={handleChange}
              placeholder="VD: 0912345678"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
            />
          </div>
        </div>

        {/* Academic Title & Specialization */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Học hàm / Học vị
            </label>
            <select
              name="academicTitle"
              value={formData.academicTitle}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
            >
              <option value="ThS.">Thạc sĩ (ThS.)</option>
              <option value="TS.">Tiến sĩ (TS.)</option>
              <option value="PGS.TS.">Phó Giáo sư, Tiến sĩ (PGS.TS.)</option>
              <option value="GS.TS.">Giáo sư, Tiến sĩ (GS.TS.)</option>
              <option value="CN.">Cử nhân / Kỹ sư (CN./KS.)</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Chuyên môn nghiên cứu
            </label>
            <input
              type="text"
              name="specialization"
              value={formData.specialization}
              onChange={handleChange}
              placeholder="VD: Trí tuệ nhân tạo, Mạng máy tính..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
            />
          </div>
        </div>

        {/* Availability */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Trạng thái tiếp nhận SV
          </label>
          <select
            name="isAvailable"
            value={formData.isAvailable}
            onChange={(e) =>
              setFormData((prev) => ({
                ...prev,
                isAvailable: e.target.value === 'true',
              }))
            }
            className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
          >
            <option value="true">Sẵn sàng nhận SV (Available)</option>
            <option value="false">Tạm ngưng tiếp nhận (Unavailable)</option>
          </select>
        </div>

        {/* Password (if create) / Account Active status (if edit) */}
        {!isEdit ? (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu khởi tạo <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="password"
              value={formData.password}
              onChange={handleChange}
              placeholder="Mật khẩu"
              className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition ${
                errors.password ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'
              }`}
            />
            {errors.password && (
              <p className="text-xs text-rose-500 mt-1">{errors.password}</p>
            )}
          </div>
        ) : (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Trạng thái tài khoản hệ thống
            </label>
            <select
              name="isActive"
              value={formData.isActive}
              onChange={(e) =>
                setFormData((prev) => ({
                  ...prev,
                  isActive: e.target.value === 'true',
                }))
              }
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
            >
              <option value="true">Tài khoản hoạt động</option>
              <option value="false">Tài khoản bị khóa</option>
            </select>
          </div>
        )}

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#123891] hover:bg-[#102d7d] rounded-xl shadow-sm shadow-blue-200 transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {isEdit ? 'Lưu thay đổi' : 'Thêm giảng viên'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default LecturerFormModal;
