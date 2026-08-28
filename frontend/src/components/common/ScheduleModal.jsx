import React, { useState, useEffect, useCallback } from 'react';
import Modal from './Modal';
import scheduleApi from '../../api/scheduleApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import {
  Calendar,
  Clock,
  Briefcase,
  BookOpen,
  Plus,
  Edit2,
  Trash2,
  MapPin,
  AlertCircle,
  CheckCircle2,
  Layers,
  Sparkles,
  RefreshCw,
  X,
} from 'lucide-react';

const SCHEDULE_TYPES = [
  { value: 'INTERNSHIP', label: 'Thực tập Doanh nghiệp (TTDN)', color: 'text-indigo-600 bg-indigo-50 border-indigo-200' },
  { value: 'THESIS', label: 'Khóa luận Tốt nghiệp (KLTN)', color: 'text-violet-600 bg-violet-50 border-violet-200' },
  { value: 'DEADLINE', label: 'Hạn chót / Phản biện (DEADLINE)', color: 'text-amber-600 bg-amber-50 border-amber-200' },
  { value: 'DEFENSE', label: 'Bảo vệ Khóa luận (DEFENSE)', color: 'text-emerald-600 bg-emerald-50 border-emerald-200' },
  { value: 'MEETING', label: 'Họp / Thông báo (MEETING)', color: 'text-blue-600 bg-blue-50 border-blue-200' },
  { value: 'OTHER', label: 'Khác (OTHER)', color: 'text-slate-600 bg-slate-50 border-slate-200' },
];

const ScheduleModal = ({ isOpen, onClose }) => {
  const { user } = useAuth();
  const { showToast } = useToast();

  const [schedules, setSchedules] = useState([]);
  const [loading, setLoading] = useState(false);

  // Form State for TBM / ADMIN
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    type: 'INTERNSHIP',
    startTime: '',
    endTime: '',
    location: '',
  });
  const [submitting, setSubmitting] = useState(false);

  const canManage = user?.role === 'TBM' || user?.role === 'ADMIN';

  const fetchSchedules = useCallback(async () => {
    if (!isOpen) return;
    setLoading(true);
    try {
      const res = await scheduleApi.getAll();
      if (res.success) {
        setSchedules(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải lịch trình đào tạo', 'error');
    } finally {
      setLoading(false);
    }
  }, [isOpen, showToast]);

  useEffect(() => {
    fetchSchedules();
  }, [fetchSchedules]);

  const handleOpenAdd = () => {
    setEditingId(null);
    setFormData({
      title: '',
      description: '',
      type: 'INTERNSHIP',
      startTime: '',
      endTime: '',
      location: '',
    });
    setIsFormOpen(true);
  };

  const handleOpenEdit = (item) => {
    setEditingId(item._id);
    setFormData({
      title: item.title || '',
      description: item.description || '',
      type: item.type || 'INTERNSHIP',
      startTime: item.startTime ? new Date(item.startTime).toISOString().slice(0, 16) : '',
      endTime: item.endTime ? new Date(item.endTime).toISOString().slice(0, 16) : '',
      location: item.location || '',
    });
    setIsFormOpen(true);
  };

  const handleDelete = async (id, title) => {
    if (!window.confirm(`Bạn có chắc chắn muốn xóa mốc lịch trình "${title}" không?`)) {
      return;
    }

    try {
      const res = await scheduleApi.delete(id);
      showToast(res.message || 'Xóa lịch trình thành công', 'success');
      fetchSchedules();
    } catch (err) {
      showToast(err.message || 'Không thể xóa lịch trình', 'error');
    }
  };

  const handleSave = async (e) => {
    e.preventDefault();
    if (!formData.title.trim()) {
      showToast('Vui lòng nhập tiêu đề lịch trình', 'error');
      return;
    }
    if (!formData.startTime) {
      showToast('Vui lòng chọn thời gian bắt đầu', 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (editingId) {
        await scheduleApi.update(editingId, formData);
        showToast('Cập nhật lịch trình đào tạo thành công!', 'success');
      } else {
        await scheduleApi.create(formData);
        showToast('Tạo lịch trình đào tạo mới thành công!', 'success');
      }
      setIsFormOpen(false);
      fetchSchedules();
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu lịch trình đào tạo', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getTypeMeta = (type) => {
    return (
      SCHEDULE_TYPES.find((t) => t.value === type) || {
        label: type,
        color: 'text-slate-700 bg-slate-100 border-slate-200',
      }
    );
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Lịch Trình & Kế Hoạch Đào Tạo Học Kỳ"
      maxWidth="max-w-3xl"
    >
      <div className="space-y-4 text-xs">
        {/* Semester Header Badge */}
        <div className="p-4 rounded-2xl bg-indigo-50/80 border border-indigo-200/80 text-indigo-950 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
          <div>
            <div className="font-bold text-sm flex items-center gap-2">
              <Calendar className="w-4 h-4 text-indigo-600" />
              <span>Học kỳ 1 — Năm học 2026 - 2027</span>
            </div>
            <div className="text-slate-600 text-[11px] mt-0.5">
              Khoa Công nghệ Thông tin • Đại học Công nghiệp TP.HCM (IUH)
            </div>
          </div>

          <div className="flex items-center gap-2 self-start sm:self-auto">
            {canManage && !isFormOpen && (
              <button
                type="button"
                onClick={handleOpenAdd}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Thêm lịch trình</span>
              </button>
            )}
            <button
              type="button"
              onClick={fetchSchedules}
              className="p-1.5 text-slate-600 hover:text-slate-900 hover:bg-white rounded-xl border border-slate-200 transition"
              title="Tải lại dữ liệu"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>

        {/* Management Form (Shown when creating/editing) */}
        {canManage && isFormOpen && (
          <form onSubmit={handleSave} className="p-4 bg-white rounded-2xl border border-indigo-200 shadow-sm space-y-3 animate-in fade-in-50">
            <div className="flex items-center justify-between pb-2 border-b border-slate-100">
              <span className="font-bold text-sm text-slate-900">
                {editingId ? 'Chỉnh sửa Lịch trình' : 'Thêm Lịch trình mới'}
              </span>
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="p-1 text-slate-400 hover:text-slate-700 rounded-lg hover:bg-slate-100 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">
                  Tiêu đề mốc lịch trình <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  value={formData.title}
                  onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                  placeholder="VD: Đăng ký & Xét duyệt đề tài Khóa luận Tốt nghiệp"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Phân loại</label>
                <select
                  value={formData.type}
                  onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs"
                >
                  {SCHEDULE_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>
                      {t.label}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Địa điểm / Nền tảng</label>
                <input
                  type="text"
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="VD: Cổng trực tuyến / Văn phòng Bộ môn"
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs"
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Thời gian bắt đầu <span className="text-rose-500">*</span>
                </label>
                <input
                  type="datetime-local"
                  value={formData.startTime}
                  onChange={(e) => setFormData({ ...formData, startTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs"
                  required
                />
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Thời gian kết thúc</label>
                <input
                  type="datetime-local"
                  value={formData.endTime}
                  onChange={(e) => setFormData({ ...formData, endTime: e.target.value })}
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs"
                />
              </div>

              <div className="sm:col-span-2">
                <label className="block font-semibold text-slate-700 mb-1">Mô tả / Hướng dẫn</label>
                <textarea
                  rows={2}
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  placeholder="Mô tả các yêu cầu cần hoàn thành trong mốc này..."
                  className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 outline-none text-xs resize-none"
                />
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setIsFormOpen(false)}
                className="px-3.5 py-1.5 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting}
                className="px-4 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition disabled:opacity-50"
              >
                {submitting ? 'Đang lưu...' : editingId ? 'Lưu thay đổi' : 'Tạo mới'}
              </button>
            </div>
          </form>
        )}

        {/* Schedule List */}
        <div className="space-y-3 max-h-[55vh] overflow-y-auto pr-1">
          {loading ? (
            <div className="p-8 text-center text-slate-400">Đang tải lịch trình...</div>
          ) : schedules.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-slate-50 rounded-2xl border border-slate-100">
              Chưa có mốc lịch trình nào trong học kỳ này.
            </div>
          ) : (
            schedules.map((item) => {
              const meta = getTypeMeta(item.type);
              return (
                <div
                  key={item._id}
                  className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs hover:border-indigo-200 transition space-y-2 group"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1 flex-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className={`px-2 py-0.5 rounded-md font-bold text-[10.5px] border ${meta.color}`}>
                          {meta.label}
                        </span>
                        <h4 className="font-bold text-slate-900 text-xs sm:text-sm leading-snug">
                          {item.title}
                        </h4>
                      </div>

                      {item.description && (
                        <p className="text-slate-600 text-[11.5px] leading-relaxed pt-0.5">
                          {item.description}
                        </p>
                      )}
                    </div>

                    {/* TBM & ADMIN Action Buttons */}
                    {canManage && (
                      <div className="flex items-center gap-1 shrink-0 opacity-80 group-hover:opacity-100 transition">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                          title="Chỉnh sửa lịch trình"
                        >
                          <Edit2 className="w-3.5 h-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item._id, item.title)}
                          className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                          title="Xóa lịch trình"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    )}
                  </div>

                  {/* Metadata: Time and Location */}
                  <div className="pt-2 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-500">
                    <div className="flex items-center gap-1.5 font-medium text-slate-700">
                      <Clock className="w-3.5 h-3.5 text-indigo-500 shrink-0" />
                      <span>
                        {formatDate(item.startTime)} {item.endTime ? `— ${formatDate(item.endTime)}` : ''}
                      </span>
                    </div>

                    {item.location && (
                      <div className="flex items-center gap-1 text-slate-500">
                        <MapPin className="w-3 h-3 text-slate-400 shrink-0" />
                        <span>{item.location}</span>
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-400">
            {canManage
              ? 'Tài khoản Quản trị (TBM/ADMIN) có toàn quyền thêm, sửa, xóa mốc lịch trình.'
              : 'Dữ liệu được cập nhật theo kế hoạch đào tạo chính thức từ Bộ môn.'}
          </div>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ScheduleModal;
