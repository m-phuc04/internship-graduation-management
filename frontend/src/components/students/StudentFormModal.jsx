import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { generateSecurePassword } from '../../utils/passwordGenerator';
import { Eye, EyeOff, Copy, Check, RefreshCw } from 'lucide-react';

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
    password: '',
    phone: '',
    studentCode: '',
    className: '',
    gpa: 0,
    accumulatedCredits: 0,
    prerequisiteCompleted: true,
    isActive: true,
  });

  const [errors, setErrors] = useState({});
  const [showPassword, setShowPassword] = useState(false);
  const [copiedPassword, setCopiedPassword] = useState(false);

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
        password: generateSecurePassword(8),
        phone: '',
        studentCode: '',
        className: '',
        gpa: 0,
        accumulatedCredits: 0,
        prerequisiteCompleted: true,
        isActive: true,
      });
    }
    setErrors({});
    setShowPassword(false);
    setCopiedPassword(false);
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

  const handleGeneratePassword = () => {
    const newPass = generateSecurePassword(8);
    setFormData((prev) => ({ ...prev, password: newPass }));
    if (errors.password) {
      setErrors((prev) => ({ ...prev, password: null }));
    }
  };

  const handleCopyPassword = () => {
    if (!formData.password) return;
    navigator.clipboard.writeText(formData.password);
    setCopiedPassword(true);
    setTimeout(() => setCopiedPassword(false), 2000);
  };

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Họ tên là bắt buộc';
    if (!formData.email.trim()) errs.email = 'Email là bắt buộc';
    if (!formData.studentCode.trim()) errs.studentCode = 'Mã sinh viên là bắt buộc';
    else if (!/^\d{8}$/.test(formData.studentCode.trim()))
      errs.studentCode = 'Mã sinh viên phải gồm đúng 8 chữ số';
    if (!formData.className.trim()) errs.className = 'Lớp danh nghĩa là bắt buộc';
    if (!isEdit) {
      if (!formData.password || !formData.password.trim()) {
        errs.password = 'Mật khẩu là bắt buộc';
      } else if (formData.password.trim().length < 6) {
        errs.password = 'Mật khẩu phải có ít nhất 6 ký tự';
      }
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;
    onSubmit({
      ...formData,
      gpa: formData.gpa === '' ? 0 : Number(formData.gpa),
      accumulatedCredits: formData.accumulatedCredits === '' ? 0 : Number(formData.accumulatedCredits),
    });
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
        {/* Họ và tên & Mã sinh viên */}
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
              className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition ${
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
              maxLength={8}
              className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition font-mono ${
                errors.studentCode ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'
              }`}
            />
            {errors.studentCode && (
              <p className="text-xs text-rose-500 mt-1">{errors.studentCode}</p>
            )}
          </div>
        </div>

        {/* Email & Số điện thoại */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email <span className="text-rose-500">*</span>
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
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
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
            />
          </div>
        </div>

        {/* Lớp danh nghĩa & GPA / Tín chỉ (hoặc Trạng thái nếu là Chỉnh sửa) */}
        {!isEdit ? (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Lớp danh nghĩa <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="className"
                value={formData.className}
                onChange={handleChange}
                className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition ${
                  errors.className ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'
                }`}
              />
              {errors.className && (
                <p className="text-xs text-rose-500 mt-1">{errors.className}</p>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Điểm GPA (4.0)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max="4"
                  name="gpa"
                  value={formData.gpa}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số tín chỉ
                </label>
                <input
                  type="number"
                  min="0"
                  name="accumulatedCredits"
                  value={formData.accumulatedCredits}
                  onChange={handleChange}
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                />
              </div>
            </div>
          </div>
        ) : (
          <>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Lớp danh nghĩa <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="className"
                  value={formData.className}
                  onChange={handleChange}
                  className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition ${
                    errors.className ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'
                  }`}
                />
                {errors.className && (
                  <p className="text-xs text-rose-500 mt-1">{errors.className}</p>
                )}
              </div>

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
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                >
                  <option value="true">Hoạt động</option>
                  <option value="false">Khóa / Vô hiệu hóa</option>
                </select>
              </div>
            </div>

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
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
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
                  className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                />
              </div>
            </div>
          </>
        )}

        {/* Mật khẩu khởi tạo (Dành cho Thêm mới: Full-width hàng riêng) */}
        {!isEdit && (
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mật khẩu khởi tạo <span className="text-rose-500">*</span>
            </label>
            <div className="relative w-full">
              <input
                type={showPassword ? 'text' : 'password'}
                name="password"
                value={formData.password}
                onChange={handleChange}
                className={`w-full pl-3.5 pr-20 py-2 text-sm bg-slate-50 border rounded-xl font-mono focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition ${
                  errors.password ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'
                }`}
              />
              <div className="absolute right-1.5 top-1/2 -translate-y-1/2 flex items-center gap-0.5">
                {formData.password && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                    title={copiedPassword ? 'Đã sao chép' : 'Sao chép mật khẩu'}
                  >
                    {copiedPassword ? (
                      <Check className="w-3.5 h-3.5 text-emerald-600" />
                    ) : (
                      <Copy className="w-3.5 h-3.5" />
                    )}
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-200/60 rounded-lg transition cursor-pointer"
                  title={showPassword ? 'Ẩn mật khẩu' : 'Hiện mật khẩu'}
                >
                  {showPassword ? (
                    <EyeOff className="w-3.5 h-3.5" />
                  ) : (
                    <Eye className="w-3.5 h-3.5" />
                  )}
                </button>
              </div>
            </div>
            {errors.password && (
              <p className="text-xs text-rose-500 mt-1">{errors.password}</p>
            )}

            {/* Nút Tạo mật khẩu */}
            <div className="mt-1.5">
              <button
                type="button"
                onClick={handleGeneratePassword}
                className="px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#123891] border border-blue-200 rounded-xl text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer shadow-2xs hover:shadow-xs active:scale-[0.99]"
                title="Tạo lại mật khẩu ngẫu nhiên đủ mạnh"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>Tạo mật khẩu</span>
              </button>
            </div>
          </div>
        )}

        {/* Hộp kiểm: Điều kiện tiên quyết */}
        <div className="p-4 rounded-xl bg-slate-50 border border-slate-200/80">
          <label className="flex items-center gap-3 cursor-pointer">
            <input
              type="checkbox"
              name="prerequisiteCompleted"
              checked={formData.prerequisiteCompleted}
              onChange={handleChange}
              className="w-4 h-4 rounded text-[#123891] focus:ring-[#123891] border-slate-300 transition"
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

        {/* Các nút thao tác chân trang */}
        <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-3 pt-4 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={loading}
            className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer text-center"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#123891] hover:bg-[#102d7d] rounded-xl shadow-sm shadow-blue-200 transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer"
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
