import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';

const CompanyFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  loading = false,
}) => {
  const isEdit = !!initialData;

  const [formData, setFormData] = useState({
    name: '',
    code: '',
    address: '',
    email: '',
    phone: '',
    website: '',
    contactPerson: '',
    contactEmail: '',
    description: '',
    status: 'ACTIVE',
  });

  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (initialData) {
      setFormData({
        name: initialData.name || '',
        code: initialData.code || '',
        address: initialData.address || '',
        email: initialData.email || '',
        phone: initialData.phone || '',
        website: initialData.website || '',
        contactPerson: initialData.contactPerson || '',
        contactEmail: initialData.contactEmail || '',
        description: initialData.description || '',
        status: initialData.status || 'ACTIVE',
      });
    } else {
      setFormData({
        name: '',
        code: '',
        address: '',
        email: '',
        phone: '',
        website: '',
        contactPerson: '',
        contactEmail: '',
        description: '',
        status: 'ACTIVE',
      });
    }
    setErrors({});
  }, [initialData, isOpen]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Tên công ty là bắt buộc';
    if (!formData.address.trim()) errs.address = 'Địa chỉ công ty là bắt buộc';

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
      title={isEdit ? 'Chỉnh sửa Thông tin Doanh nghiệp' : 'Thêm mới Doanh nghiệp'}
      subtitle={
        isEdit
          ? `Mã DN: ${initialData?.code || 'Chưa có'} • ${initialData?.name}`
          : 'Thêm mới đơn vị hợp tác tiếp nhận sinh viên thực tập'
      }
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        {/* Company Name & Code */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tên doanh nghiệp / Công ty <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleChange}
              placeholder="VD: TDSouth Technology JSC"
              className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition ${
                errors.name ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'
              }`}
            />
            {errors.name && (
              <p className="text-xs text-rose-500 mt-1">{errors.name}</p>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mã công ty (Code)
            </label>
            <input
              type="text"
              name="code"
              value={formData.code}
              onChange={handleChange}
              placeholder="VD: TDSOUTH"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-mono uppercase"
            />
          </div>
        </div>

        {/* Address */}
        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Địa chỉ trụ sở / Chi nhánh tiếp nhận <span className="text-rose-500">*</span>
          </label>
          <input
            type="text"
            name="address"
            value={formData.address}
            onChange={handleChange}
            placeholder="VD: QTSC 9, Công viên phần mềm Quang Trung, Q.12, TP.HCM"
            className={`w-full px-3.5 py-2 text-sm bg-slate-50 border rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition ${
              errors.address ? 'border-rose-300 bg-rose-50/50' : 'border-slate-200'
            }`}
          />
          {errors.address && (
            <p className="text-xs text-rose-500 mt-1">{errors.address}</p>
          )}
        </div>

        {/* Email & Phone & Website */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email công ty
            </label>
            <input
              type="email"
              name="email"
              value={formData.email}
              onChange={handleChange}
              placeholder="contact@tdsouth.com"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
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
              placeholder="02837155666"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Website
            </label>
            <input
              type="text"
              name="website"
              value={formData.website}
              onChange={handleChange}
              placeholder="https://..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Contact Person & Contact Email */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Người liên hệ (HR / Mentor)
            </label>
            <input
              type="text"
              name="contactPerson"
              value={formData.contactPerson}
              onChange={handleChange}
              placeholder="VD: Nguyễn Văn B"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Email người liên hệ
            </label>
            <input
              type="email"
              name="contactEmail"
              value={formData.contactEmail}
              onChange={handleChange}
              placeholder="hr@company.com"
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>
        </div>

        {/* Description & Status */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <div className="sm:col-span-2">
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Mô tả ngắn về doanh nghiệp
            </label>
            <textarea
              name="description"
              rows={2}
              value={formData.description}
              onChange={handleChange}
              placeholder="Lĩnh vực hoạt động, công nghệ chính..."
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Trạng thái tiếp nhận
            </label>
            <select
              name="status"
              value={formData.status}
              onChange={handleChange}
              className="w-full px-3.5 py-2 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="ACTIVE">Đang hợp tác (ACTIVE)</option>
              <option value="INACTIVE">Tạm ngưng (INACTIVE)</option>
            </select>
          </div>
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
            {isEdit ? 'Lưu thay đổi' : 'Thêm doanh nghiệp'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CompanyFormModal;
