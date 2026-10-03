import React, { useState, useEffect } from 'react';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { useToast } from '../../context/ToastContext';
import academicTermApi from '../../api/academicTermApi';
import {
  formatDateVN,
  formatFullDateVN,
  formatDateForInput,
  parseLocalDate,
} from '../../utils/dateUtils';
import {
  Calendar,
  Clock,
  Layers,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  Unlock,
  CalendarCheck,
  RotateCcw,
  GraduationCap,
  Users,
} from 'lucide-react';

const ThesisTimelineModal = ({ isOpen, onClose, targetTerm }) => {
  const { currentTerm, refreshTerms } = useAcademicTerm();
  const { showToast } = useToast();

  const term = targetTerm || currentTerm;

  const [formData, setFormData] = useState({
    registrationStart: '',
    registrationEnd: '',
    assignmentStart: '',
    assignmentEnd: '',
    defenseStart: '',
    defenseEnd: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (term?.thesis) {
      setFormData({
        registrationStart: formatDateForInput(term.thesis.registrationStart),
        registrationEnd: formatDateForInput(term.thesis.registrationEnd),
        assignmentStart: formatDateForInput(term.thesis.assignmentStart),
        assignmentEnd: formatDateForInput(term.thesis.assignmentEnd),
        defenseStart: formatDateForInput(term.thesis.defenseStart),
        defenseEnd: formatDateForInput(term.thesis.defenseEnd),
      });
    } else {
      setFormData({
        registrationStart: '',
        registrationEnd: '',
        assignmentStart: '',
        assignmentEnd: '',
        defenseStart: '',
        defenseEnd: '',
      });
    }
  }, [term, isOpen]);

  if (!isOpen) return null;

  // Calculate Registration Window Status
  const isManuallyLocked = Boolean(term?.thesis?.isRegistrationLocked);

  const getWindowStatus = () => {
    if (isManuallyLocked) {
      return {
        type: 'MANUALLY_LOCKED',
        label: `Cổng đăng ký KLTN đang bị KHÓA bởi Trưởng Bộ Môn${
          term.thesis.lockedAt ? ` (Khóa lúc ${new Date(term.thesis.lockedAt).toLocaleString('vi-VN')})` : ''
        }`,
        badge: 'bg-rose-50 text-rose-800 border-rose-200',
        icon: Lock,
      };
    }

    if (!formData.registrationStart && !formData.registrationEnd) {
      return {
        type: 'UNRESTRICTED',
        label: 'Chưa giới hạn thời gian (Đang mở tự do)',
        badge: 'bg-slate-100 text-slate-700 border-slate-200',
        icon: Sparkles,
      };
    }

    const now = new Date();
    now.setHours(0, 0, 0, 0);

    const start = parseLocalDate(formData.registrationStart);
    const end = parseLocalDate(formData.registrationEnd);
    if (end) end.setHours(23, 59, 59, 999);

    if (start && now < start) {
      return {
        type: 'UPCOMING',
        label: `Sắp mở đăng ký đề tài (từ ${formatFullDateVN(start)} • ${formatDateVN(start)})`,
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Clock,
      };
    }

    if (end && now > end) {
      return {
        type: 'CLOSED',
        label: `Đã tự động khóa do hết hạn đăng ký (${formatFullDateVN(end)} • ${formatDateVN(end)})`,
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: Lock,
      };
    }

    return {
      type: 'OPEN',
      label: end
        ? `Đang mở cổng đăng ký đề tài KLTN (Hạn chót: ${formatFullDateVN(end)} • ${formatDateVN(end)})`
        : 'Đang mở cổng đăng ký đề tài KLTN cho sinh viên',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
    };
  };

  const windowStatus = getWindowStatus();
  const StatusIcon = windowStatus.icon;

  const handleToggleLock = async () => {
    if (!term?._id) return;
    setSubmitting(true);
    try {
      const nextLockState = !isManuallyLocked;
      const res = await academicTermApi.toggleThesisRegistrationLock(term._id, {
        isLocked: nextLockState,
        newDeadline: formData.registrationEnd || null,
      });

      showToast(
        nextLockState
          ? 'Đã khóa cổng đăng ký KLTN thành công!'
          : 'Đã mở lại cổng đăng ký KLTN thành công!',
        'success'
      );
      await refreshTerms();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi thay đổi trạng thái khóa', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  // Presets
  const applyPresetDays = (days) => {
    const today = new Date();
    const endReg = new Date();
    endReg.setDate(today.getDate() + days);

    setFormData((prev) => ({
      ...prev,
      registrationStart: formatDateForInput(today),
      registrationEnd: formatDateForInput(endReg),
    }));
  };

  const clearMilestones = () => {
    setFormData((prev) => ({
      ...prev,
      registrationStart: '',
      registrationEnd: '',
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!term?._id) {
      showToast('Không tìm thấy học kỳ để cập nhật', 'error');
      return;
    }

    if (formData.registrationStart && formData.registrationEnd) {
      if (new Date(formData.registrationEnd) < new Date(formData.registrationStart)) {
        showToast('Hạn chót đăng ký đề tài KLTN phải sau ngày bắt đầu đăng ký', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      await academicTermApi.updateTerm(term._id, {
        thesis: {
          ...(term?.thesis?.toObject ? term.thesis.toObject() : (term?.thesis || {})),
          registrationStart: formData.registrationStart || null,
          registrationEnd: formData.registrationEnd || null,
        },
      });

      showToast('Đã lưu cấu hình thời gian mở Khóa luận Tốt nghiệp thành công!', 'success');
      await refreshTerms();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi cập nhật mốc thời gian', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs overflow-y-auto">
      <div className="bg-white rounded-3xl max-w-xl w-full shadow-2xl border border-slate-100 overflow-hidden my-8 animate-scale-up">
        {/* Header */}
        <div className="px-6 py-4 bg-slate-900 text-white flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-blue-500/20 text-[#123891] flex items-center justify-center border border-blue-500/30">
              <GraduationCap className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">
                Cấu hình Mở Cổng Khóa Luận Tốt Nghiệp (KLTN)
              </h3>
              <p className="text-[11px] text-slate-400">
                {term ? `${term.name} • ${term.code} (${term.academicYear})` : 'Học kỳ hiện tại'}
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-white p-1 rounded-lg transition cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Body */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5 max-h-[75vh] overflow-y-auto">
          {/* Status Alert */}
          <div className={`p-3.5 rounded-2xl border flex flex-col sm:flex-row sm:items-center justify-between gap-3 ${windowStatus.badge}`}>
            <div className="flex items-center gap-3">
              <StatusIcon className="w-5 h-5 shrink-0" />
              <div className="text-xs font-semibold">
                <span className="font-bold uppercase tracking-wider block text-[10px] opacity-75">
                  Trạng thái đăng ký đề tài:
                </span>
                {windowStatus.label}
              </div>
            </div>

            <button
              type="button"
              disabled={submitting}
              onClick={handleToggleLock}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold inline-flex items-center gap-1.5 transition cursor-pointer shrink-0 shadow-2xs ${
                isManuallyLocked
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-rose-600 hover:bg-rose-700 text-white'
              }`}
              title={isManuallyLocked ? 'Mở lại quyền đăng ký đề tài KLTN cho sinh viên' : 'Khóa ngay cổng đăng ký đề tài KLTN'}
            >
              {isManuallyLocked ? (
                <>
                  <Unlock className="w-3.5 h-3.5" />
                  <span>Mở lại đăng ký</span>
                </>
              ) : (
                <>
                  <Lock className="w-3.5 h-3.5" />
                  <span>Khóa đăng ký</span>
                </>
              )}
            </button>
          </div>

          {/* Quick Presets */}
          <div className="p-3 bg-blue-50/60 border border-blue-100 rounded-2xl space-y-2">
            <div className="text-[11px] font-bold text-[#0d2a75] flex items-center justify-between">
              <span>⚡ Thiết lập nhanh thời hạn:</span>
              <button
                type="button"
                onClick={clearMilestones}
                className="inline-flex items-center gap-1 text-[10px] text-rose-600 hover:underline font-semibold cursor-pointer"
              >
                <RotateCcw className="w-3 h-3" />
                Xóa tất cả mốc
              </button>
            </div>
            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => applyPresetDays(14)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white text-[#102d7d] border border-blue-200 hover:bg-blue-100 rounded-lg transition shadow-2xs cursor-pointer"
              >
                Mở đăng ký 14 ngày (2 tuần)
              </button>
              <button
                type="button"
                onClick={() => applyPresetDays(30)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white text-[#102d7d] border border-blue-200 hover:bg-blue-100 rounded-lg transition shadow-2xs cursor-pointer"
              >
                Mở đăng ký 30 ngày (1 tháng)
              </button>
            </div>
          </div>

          {/* 1. Registration Window */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <CalendarCheck className="w-4 h-4 text-[#123891]" />
              1. Thời gian mở đăng ký đề tài KLTN
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Ngày bắt đầu mở đăng ký:
                </label>
                <input
                  type="date"
                  value={formData.registrationStart}
                  onChange={(e) => setFormData({ ...formData, registrationStart: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                />
                {formData.registrationStart && (
                  <div className="text-[11px] font-semibold text-[#102d7d] mt-1 flex items-center gap-1 bg-blue-50/80 px-2 py-0.5 rounded-md">
                    <span>📅</span>
                    <span>{formatFullDateVN(formData.registrationStart)} ({formatDateVN(formData.registrationStart)})</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Hạn chót đăng ký đề tài:
                </label>
                <input
                  type="date"
                  value={formData.registrationEnd}
                  onChange={(e) => setFormData({ ...formData, registrationEnd: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                />
                {formData.registrationEnd && (
                  <div className="text-[11px] font-semibold text-[#102d7d] mt-1 flex items-center gap-1 bg-blue-50/80 px-2 py-0.5 rounded-md">
                    <span>📅</span>
                    <span>{formatFullDateVN(formData.registrationEnd)} ({formatDateVN(formData.registrationEnd)})</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Grading Window (Thời gian nhập điểm KLTN của GVHD) */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center justify-between border-b border-slate-100 pb-1.5">
              <div className="flex items-center gap-1.5">
                <GraduationCap className="w-4 h-4 text-blue-600" />
                <span>2. Thời gian nhập điểm KLTN (Đợt nhập điểm)</span>
              </div>
              <a
                href="/tbm/thesis-evaluations"
                className="inline-flex items-center gap-1 text-[11px] font-bold text-blue-600 hover:text-blue-800 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 transition"
              >
                <span>Quản lý Đợt nhập điểm & Tiêu chí</span>
                <span>→</span>
              </a>
            </div>

            <div className="p-3 bg-blue-50/70 border border-blue-200 rounded-2xl text-[11px] text-blue-900 space-y-1">
              <div className="font-semibold flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5 text-blue-600" />
                <span>Cấu hình thời gian nhập điểm & tiêu chí GVHD:</span>
              </div>
              <p className="text-slate-600">
                TBM thiết lập các đợt mở/khóa quyền nhập điểm cho Giảng viên hướng dẫn, quản lý tiêu chí đánh giá điều kiện, chọn phạm vi phát thông báo (công khai / chỉ gửi GV) và tự động xử lý FAIL cho sinh viên quá hạn tại menu <strong>"Đánh giá Khóa luận"</strong> (Mục 3: Quản lý Thời gian Nhập điểm).
              </p>
            </div>
          </div>

          {/* Footer Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-4 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Đóng
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#123891] hover:bg-[#102d7d] shadow-md shadow-blue-200 transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Lưu Mốc Thời Gian</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ThesisTimelineModal;

