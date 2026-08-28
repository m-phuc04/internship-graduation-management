import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

const StudentFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  availableClasses = [],
  loading = false,
}) => {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: 'Password@123',
    phone: '',
    studentCode: '',
    className: '',
    gpa: 0,
    accumulatedCredits: 0,
    prerequisiteCompleted: false,
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
        studentCode: initialData.studentCode || '',
        className: initialData.className || '',
        gpa: initialData.gpa ?? 0,
        accumulatedCredits: initialData.accumulatedCredits ?? 0,
        prerequisiteCompleted: initialData.prerequisiteCompleted ?? false,
        isActive: initialData.userId?.isActive ?? true,
      });
    } else {
      setFormData({
        fullName: '',
        email: '',
        password: 'Password@123',
        phone: '',
        studentCode: '',
        className: availableClasses[0] || 'DHCNTT18A',
        gpa: 3.0,
        accumulatedCredits: 100,
        prerequisiteCompleted: false,
        isActive: true,
      });
    }
    setErrors({});
  }, [initialData, isOpen, availableClasses]);

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
    if (!formData.studentCode.trim()) errs.studentCode = 'Mã sinh viên là bắt buộc';
    else if (!/^\d{8}$/.test(formData.studentCode.trim()))
      errs.studentCode = 'Mã sinh viên phải gồm đúng 8 chữ số';
    if (!formData.className.trim()) errs.className = 'Lớp là bắt buộc';
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
      title={isEdit ? 'Chỉnh sửa Thông tin Sinh viên' : 'Thêm mới Sinh viên'}
      subtitle={
        isEdit
          ? `Cập nhật hồ sơ sinh viên MSSV: ${initialData?.studentCode}`
          : 'Tạo tài khoản và hồ sơ sinh viên mới vào hệ thống'
      }
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Full Name & Student Code */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Họ và tên <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="fullName"
              value={formData.fullName}
              onChange={handleChange}
              placeholder="VD: Nguyễn Văn A"
              className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition ${
                errors.fullName ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'
              }`}
            />
            {errors.fullName && (
              <p className="text-xs text-rose-500 mt-1">{errors.fullName}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã sinh viên (MSSV) <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="studentCode"
              value={formData.studentCode}
              onChange={handleChange}
              placeholder="VD: 22635271"
              maxLength={8}
              className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono ${
                errors.studentCode ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'
              }`}
            />
            {errors.studentCode && (
              <p className="text-xs text-rose-500 mt-1">{errors.studentCode}</p>
            )}
          </div>
        </div>

        {/* Email & Phone */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email trường <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="VD: student@iuh.edu.vn"
              className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition ${
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
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Class & Password (if create) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Lớp sinh hoạt <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="className"
              value={formData.className}
              onChange={handleChange}
              placeholder="VD: DHCNTT18A"
              className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition ${
                errors.className ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'
              }`}
            />
            {errors.className && (
              <p className="text-xs text-rose-500 mt-1">{errors.className}</p>
            )}
          </div>

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
                className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition ${
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
                Trạng thái tài khoản
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
                className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              >
                <option value="true">Hoạt động (Active)</option>
                <option value="false">Khóa / Vô hiệu hóa (Inactive)</option>
              </select>
            </div>
          )}
        </div>

        {/* GPA & Accumulated Credits */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Điểm trung bình tích lũy (GPA / 4.0)
            </label>
            <input
              type="number"
              step="0.01"
              min="0"
              max="4"
              name="gpa"
              value={formData.gpa}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số tín chỉ tích lũy
            </label>
            <input
              type="number"
              min="0"
              name="accumulatedCredits"
              value={formData.accumulatedCredits}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Checkbox: Prerequisite condition */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="prerequisiteCompleted"
              checked={formData.prerequisiteCompleted}
              onChange={handleChange}
              className="w-4 h-4 rounded text-indigo-600 focus:ring-indigo-500 border-slate-300 transition"
            />
            <div>
              <div className="text-xs font-semibold text-slate-900">
                Đã hoàn thành điều kiện tiên quyết (KLTN / TTDN)
              </div>
              <div className="text-[11px] text-slate-500">
                Đánh dấu sinh viên đủ điều kiện xét đăng ký thực tập hoặc làm khóa luận.
              </div>
            </div>
          </label>
        </div>

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
            className="px-5 py-2.5 text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition disabled:opacity-50 flex items-center gap-2"
          >
            {loading && (
              <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            )}
            {isEdit ? 'Lưu thay đổi' : 'Thêm sinh viên'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default StudentFormModal;
