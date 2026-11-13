import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import researchFieldApi from '../../api/researchFieldApi';
import { useToast } from '../../context/ToastContext';
import { Plus, X, Check, Tag } from 'lucide-react';

const LecturerFormModal = ({
  isOpen,
  onClose,
  onSubmit,
  initialData = null,
  loading = false,
}) => {
  const isEdit = !!initialData;
  const { showToast } = useToast();

  const [formData, setFormData] = useState({
    fullName: '',
    email: '',
    password: 'Password@123',
    phone: '',
    lecturerCode: '',
    academicTitle: 'ThS.',
    fields: [],
    specialization: '',
    isAvailable: true,
    isActive: true,
  });

  const [errors, setErrors] = useState({});

  // Research fields state
  const [allFields, setAllFields] = useState([]);
  const [loadingFields, setLoadingFields] = useState(false);
  const [showAddField, setShowAddField] = useState(false);
  const [newFieldName, setNewFieldName] = useState('');
  const [creatingField, setCreatingField] = useState(false);

  // Fetch all system research fields
  useEffect(() => {
    if (!isOpen) return;
    let isMounted = true;
    const fetchFields = async () => {
      setLoadingFields(true);
      try {
        const res = await researchFieldApi.getAllFields();
        if (isMounted && res?.success && Array.isArray(res.data)) {
          setAllFields(res.data);
        }
      } catch {
        // Safe ignore
      } finally {
        if (isMounted) setLoadingFields(false);
      }
    };
    fetchFields();
    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  useEffect(() => {
    if (initialData) {
      const initialFields = Array.isArray(initialData.fields) && initialData.fields.length > 0
        ? initialData.fields
        : (initialData.specialization
            ? initialData.specialization.split(',').map((s) => s.trim()).filter(Boolean)
            : []);

      setFormData({
        fullName: initialData.userId?.fullName || '',
        email: initialData.userId?.email || '',
        password: '',
        phone: initialData.userId?.phone || '',
        lecturerCode: initialData.lecturerCode || '',
        academicTitle: initialData.academicTitle || 'ThS.',
        fields: initialFields,
        specialization: initialData.specialization || initialFields.join(', '),
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
        fields: [],
        specialization: '',
        isAvailable: true,
        isActive: true,
      });
    }
    setErrors({});
    setShowAddField(false);
    setNewFieldName('');
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

  // Toggle field selection (select / deselect)
  const handleToggleField = (fieldName) => {
    setFormData((prev) => {
      const exists = prev.fields.includes(fieldName);
      return {
        ...prev,
        fields: exists
          ? prev.fields.filter((f) => f !== fieldName)
          : [...prev.fields, fieldName],
      };
    });
  };

  const handleCreateNewField = async () => {
    const trimmed = newFieldName.trim();
    if (!trimmed) {
      showToast('Vui lòng nhập tên lĩnh vực', 'warning');
      return;
    }

    if (formData.fields.some((f) => f.toLowerCase() === trimmed.toLowerCase())) {
      showToast('Lĩnh vực này đã được chọn', 'info');
      setNewFieldName('');
      setShowAddField(false);
      return;
    }

    const existingInSystem = allFields.find(
      (f) => f.name?.toLowerCase() === trimmed.toLowerCase()
    );

    if (existingInSystem) {
      setFormData((prev) => ({
        ...prev,
        fields: [...prev.fields, existingInSystem.name],
      }));
      showToast(`Đã chọn lĩnh vực "${existingInSystem.name}"`, 'success');
      setNewFieldName('');
      setShowAddField(false);
      return;
    }

    setCreatingField(true);
    try {
      const res = await researchFieldApi.createField({ name: trimmed });
      if (res?.success) {
        const createdField = res.data || { name: trimmed };
        setAllFields((prev) => [...prev, createdField]);
        setFormData((prev) => ({
          ...prev,
          fields: [...prev.fields, createdField.name || trimmed],
        }));
        showToast(`Đã thêm lĩnh vực mới "${trimmed}" vào hệ thống!`, 'success');
        setNewFieldName('');
        setShowAddField(false);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tạo lĩnh vực mới', 'error');
    } finally {
      setCreatingField(false);
    }
  };

  const validate = () => {
    const errs = {};
    if (!formData.fullName.trim()) errs.fullName = 'Họ tên là bắt buộc';
    if (!formData.email.trim()) errs.email = 'Email là bắt buộc';
    if (!isEdit && !formData.password) errs.password = 'Mật khẩu là bắt buộc';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!validate()) return;

    const finalCode = formData.lecturerCode?.trim() || String(Math.floor(10000000 + Math.random() * 90000000));
    onSubmit({
      ...formData,
      lecturerCode: finalCode,
      fields: formData.fields,
      specialization: formData.fields.join(', '),
    });
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

        {/* Academic Title & Availability */}
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
              <option value="NCS">Nghiên cứu sinh (NCS)</option>
              <option value="CN.">Cử nhân / Kỹ sư (CN./KS.)</option>
            </select>
          </div>

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
        </div>

        {/* Lĩnh vực (Research Fields / Expertise) */}
        <div className="space-y-2.5">
          {/* Header Row */}
          <div className="flex items-center justify-between">
            <label className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
              <Tag className="w-3.5 h-3.5 text-[#123891]" />
              <span>Lĩnh vực</span>
              {formData.fields.length > 0 && (
                <span className="text-[11px] font-normal text-slate-500">
                  (Đã chọn <strong className="text-[#123891]">{formData.fields.length}</strong>)
                </span>
              )}
            </label>
          </div>

          {/* 1. Selected Field Tags Display Box */}
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider mb-1">
              Lĩnh vực đã chọn
            </div>
            <div className="min-h-[46px] p-2.5 bg-slate-50 border border-slate-200 rounded-xl flex flex-wrap gap-1.5 items-center">
              {formData.fields.length === 0 ? (
                <span className="text-xs text-slate-400 italic px-1">
                  Chưa chọn lĩnh vực nào. Bấm vào các tag bên dưới để chọn.
                </span>
              ) : (
                formData.fields.map((field, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-medium bg-blue-50 text-blue-800 border border-blue-200 shadow-2xs group"
                  >
                    <span>{field}</span>
                    <button
                      type="button"
                      onClick={() => handleToggleField(field)}
                      className="p-0.5 hover:bg-blue-200/70 rounded text-blue-600 transition cursor-pointer"
                      title="Bỏ chọn lĩnh vực"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </span>
                ))
              )}
            </div>
          </div>

          {/* 2. Interactive Pills of ALL available research fields */}
          <div>
            <div className="mb-1.5">
              <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
                Danh sách lĩnh vực hệ thống ({allFields.length})
              </span>
            </div>

            {loadingFields ? (
              <div className="p-4 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                <span className="w-3.5 h-3.5 border-2 border-slate-300 border-t-[#123891] rounded-full animate-spin" />
                <span>Đang tải danh sách lĩnh vực...</span>
              </div>
            ) : allFields.length === 0 ? (
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-center text-xs text-slate-400">
                Chưa có lĩnh vực nào trong hệ thống.
              </div>
            ) : (
              <div className="flex flex-wrap gap-1.5 p-3 bg-slate-50/70 rounded-xl border border-slate-200 max-h-44 overflow-y-auto">
                {allFields.map((field) => {
                  const fieldName = field.name || field;
                  const isSelected = formData.fields.includes(fieldName);

                  return (
                    <button
                      key={field._id || fieldName}
                      type="button"
                      onClick={() => handleToggleField(fieldName)}
                      className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                        isSelected
                          ? 'bg-[#123891] text-white border-[#123891] shadow-2xs font-semibold'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                      }`}
                    >
                      {isSelected ? (
                        <Check className="w-3 h-3 shrink-0" />
                      ) : (
                        <Plus className="w-3 h-3 text-slate-400 shrink-0" />
                      )}
                      <span>{fieldName}</span>
                    </button>
                  );
                })}

                {/* Special tag: Khác */}
                <button
                  type="button"
                  onClick={() => setShowAddField((prev) => !prev)}
                  className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs font-medium transition cursor-pointer border ${
                    showAddField
                      ? 'bg-[#123891] text-white border-[#123891] shadow-2xs font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100 hover:border-slate-300'
                  }`}
                  title="Nhấp để thêm lĩnh vực khác vào hệ thống"
                >
                  <Plus className={`w-3 h-3 shrink-0 ${showAddField ? 'text-white' : 'text-slate-400'}`} />
                  <span>Khác</span>
                </button>
              </div>
            )}

            {/* Inline Add New Field Form - Located directly below the system field tags list */}
            {showAddField && (
              <div className="mt-2.5 p-3 bg-blue-50/70 border border-blue-200/80 rounded-xl space-y-2 animate-in fade-in duration-150">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Plus className="w-3.5 h-3.5 text-[#123891]" />
                    Tạo lĩnh vực mới vào hệ thống:
                  </span>
                  <button
                    type="button"
                    onClick={() => {
                      setShowAddField(false);
                      setNewFieldName('');
                    }}
                    className="text-slate-400 hover:text-slate-600 text-xs cursor-pointer p-0.5 rounded"
                  >
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newFieldName}
                    onChange={(e) => setNewFieldName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateNewField();
                      }
                    }}
                    placeholder="Nhập tên lĩnh vực mới (VD: Điện toán đám mây, Blockchain...)"
                    className="flex-1 px-3 py-1.5 text-xs bg-white border border-slate-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                    autoFocus
                  />
                  <button
                    type="button"
                    onClick={handleCreateNewField}
                    disabled={creatingField || !newFieldName.trim()}
                    className="px-3.5 py-1.5 bg-[#123891] text-white text-xs font-semibold rounded-lg hover:bg-[#102d7d] disabled:opacity-50 transition flex items-center gap-1 cursor-pointer shrink-0 shadow-2xs"
                  >
                    {creatingField ? (
                      <span className="w-3 h-3 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    ) : (
                      <Check className="w-3.5 h-3.5" />
                    )}
                    <span>Thêm</span>
                  </button>
                </div>
              </div>
            )}
          </div>
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
            className="px-4 py-2.5 text-sm font-medium text-slate-700 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={loading}
            className="px-5 py-2.5 text-sm font-medium text-white bg-[#123891] hover:bg-[#102d7d] rounded-xl shadow-xs transition disabled:opacity-50 flex items-center gap-2 cursor-pointer"
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
