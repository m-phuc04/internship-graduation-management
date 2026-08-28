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
  Briefcase,
  Sparkles,
  CheckCircle2,
  AlertCircle,
  X,
  Lock,
  CalendarCheck,
  RotateCcw,
} from 'lucide-react';

const InternshipTimelineModal = ({ isOpen, onClose, targetTerm }) => {
  const { currentTerm, refreshTerms } = useAcademicTerm();
  const { showToast } = useToast();

  const term = targetTerm || currentTerm;

  const [formData, setFormData] = useState({
    registrationStart: '',
    registrationEnd: '',
    reportStart: '',
    reportDeadline: '',
  });

  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (term?.internship) {
      setFormData({
        registrationStart: formatDateForInput(term.internship.registrationStart),
        registrationEnd: formatDateForInput(term.internship.registrationEnd),
        reportStart: formatDateForInput(term.internship.reportStart),
        reportDeadline: formatDateForInput(term.internship.reportDeadline),
      });
    } else {
      setFormData({
        registrationStart: '',
        registrationEnd: '',
        reportStart: '',
        reportDeadline: '',
      });
    }
  }, [term, isOpen]);

  if (!isOpen) return null;

  // Calculate Registration Window Status
  const getWindowStatus = () => {
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
        label: `Sắp mở đăng ký (từ ${formatFullDateVN(start)} • ${formatDateVN(start)})`,
        badge: 'bg-amber-50 text-amber-700 border-amber-200',
        icon: Clock,
      };
    }

    if (end && now > end) {
      return {
        type: 'CLOSED',
        label: `Đã đóng cổng đăng ký (hết hạn ngày ${formatFullDateVN(end)} • ${formatDateVN(end)})`,
        badge: 'bg-rose-50 text-rose-700 border-rose-200',
        icon: Lock,
      };
    }

    return {
      type: 'OPEN',
      label: end
        ? `Đang mở cổng đăng ký trực tuyến (Hạn chót: ${formatFullDateVN(end)} • ${formatDateVN(end)})`
        : 'Đang mở cổng đăng ký trực tuyến cho sinh viên',
      badge: 'bg-emerald-50 text-emerald-700 border-emerald-200',
      icon: CheckCircle2,
    };
  };

  const windowStatus = getWindowStatus();
  const StatusIcon = windowStatus.icon;

  // Presets
  const applyPresetDays = (days) => {
    const today = new Date();
    const end = new Date();
    end.setDate(today.getDate() + days);

    const startReport = new Date();
    startReport.setDate(today.getDate() + days + 30);
    const endReport = new Date();
    endReport.setDate(today.getDate() + days + 60);

    setFormData({
      registrationStart: formatDateForInput(today),
      registrationEnd: formatDateForInput(end),
      reportStart: formatDateForInput(startReport),
      reportDeadline: formatDateForInput(endReport),
    });
  };

  const clearMilestones = () => {
    setFormData({
      registrationStart: '',
      registrationEnd: '',
      reportStart: '',
      reportDeadline: '',
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!term?._id) {
      showToast('Không tìm thấy học kỳ để cập nhật', 'error');
      return;
    }

    if (formData.registrationStart && formData.registrationEnd) {
      if (new Date(formData.registrationEnd) < new Date(formData.registrationStart)) {
        showToast('Hạn chót đăng ký TTDN phải sau ngày bắt đầu đăng ký', 'error');
        return;
      }
    }

    if (formData.reportStart && formData.reportDeadline) {
      if (new Date(formData.reportDeadline) < new Date(formData.reportStart)) {
        showToast('Hạn chót nộp báo cáo thực tập phải sau ngày bắt đầu nộp', 'error');
        return;
      }
    }

    setSubmitting(true);
    try {
      await academicTermApi.updateTerm(term._id, {
        internship: {
          registrationStart: formData.registrationStart || null,
          registrationEnd: formData.registrationEnd || null,
          reportStart: formData.reportStart || null,
          reportDeadline: formData.reportDeadline || null,
        },
      });

      showToast('Đã lưu cấu hình thời gian mở Thực tập Doanh nghiệp thành công!', 'success');
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
            <div className="w-8 h-8 rounded-xl bg-indigo-500/20 text-indigo-400 flex items-center justify-center border border-indigo-500/30">
              <Briefcase className="w-4 h-4" />
            </div>
            <div>
              <h3 className="font-bold text-sm leading-tight">
                Cấu hình Mở Cổng Thực Tập Doanh Nghiệp (TTDN)
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
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Status Alert */}
          <div className={`p-3.5 rounded-2xl border flex items-center gap-3 ${windowStatus.badge}`}>
            <StatusIcon className="w-5 h-5 shrink-0" />
            <div className="text-xs font-semibold">
              <span className="font-bold uppercase tracking-wider block text-[10px] opacity-75">
                Trạng thái đăng ký:
              </span>
              {windowStatus.label}
            </div>
          </div>

          {/* Quick Presets */}
          <div className="p-3 bg-indigo-50/60 border border-indigo-100 rounded-2xl space-y-2">
            <div className="text-[11px] font-bold text-indigo-900 flex items-center justify-between">
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
                className="px-2.5 py-1 text-[11px] font-semibold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition shadow-2xs cursor-pointer"
              >
                Mở 14 ngày (2 tuần)
              </button>
              <button
                type="button"
                onClick={() => applyPresetDays(30)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition shadow-2xs cursor-pointer"
              >
                Mở 30 ngày (1 tháng)
              </button>
              <button
                type="button"
                onClick={() => applyPresetDays(60)}
                className="px-2.5 py-1 text-[11px] font-semibold bg-white text-indigo-700 border border-indigo-200 hover:bg-indigo-100 rounded-lg transition shadow-2xs cursor-pointer"
              >
                Mở 60 ngày (2 tháng)
              </button>
            </div>
          </div>

          {/* 1. Registration Window */}
          <div className="space-y-3">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <CalendarCheck className="w-4 h-4 text-indigo-600" />
              1. Thời gian mở đăng ký TTDN trực tuyến
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Ngày bắt đầu mở cổng:
                </label>
                <input
                  type="date"
                  value={formData.registrationStart}
                  onChange={(e) => setFormData({ ...formData, registrationStart: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
                {formData.registrationStart && (
                  <div className="text-[11px] font-semibold text-indigo-700 mt-1 flex items-center gap-1 bg-indigo-50/80 px-2 py-0.5 rounded-md">
                    <span>📅</span>
                    <span>{formatFullDateVN(formData.registrationStart)} ({formatDateVN(formData.registrationStart)})</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Hạn chót đóng cổng:
                </label>
                <input
                  type="date"
                  value={formData.registrationEnd}
                  onChange={(e) => setFormData({ ...formData, registrationEnd: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
                {formData.registrationEnd && (
                  <div className="text-[11px] font-semibold text-indigo-700 mt-1 flex items-center gap-1 bg-indigo-50/80 px-2 py-0.5 rounded-md">
                    <span>📅</span>
                    <span>{formatFullDateVN(formData.registrationEnd)} ({formatDateVN(formData.registrationEnd)})</span>
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* 2. Report Submission Window */}
          <div className="space-y-3 pt-2">
            <div className="text-xs font-bold uppercase tracking-wider text-slate-800 flex items-center gap-1.5 border-b border-slate-100 pb-1.5">
              <Calendar className="w-4 h-4 text-blue-600" />
              2. Thời gian nộp báo cáo kết quả thực tập
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Bắt đầu nhận báo cáo:
                </label>
                <input
                  type="date"
                  value={formData.reportStart}
                  onChange={(e) => setFormData({ ...formData, reportStart: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
                {formData.reportStart && (
                  <div className="text-[11px] font-semibold text-blue-700 mt-1 flex items-center gap-1 bg-blue-50/80 px-2 py-0.5 rounded-md">
                    <span>📅</span>
                    <span>{formatFullDateVN(formData.reportStart)} ({formatDateVN(formData.reportStart)})</span>
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Hạn chót nộp báo cáo:
                </label>
                <input
                  type="date"
                  value={formData.reportDeadline}
                  onChange={(e) => setFormData({ ...formData, reportDeadline: e.target.value })}
                  className="w-full px-3.5 py-2 rounded-xl text-xs bg-slate-50 border border-slate-200 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-600 transition"
                />
                {formData.reportDeadline && (
                  <div className="text-[11px] font-semibold text-blue-700 mt-1 flex items-center gap-1 bg-blue-50/80 px-2 py-0.5 rounded-md">
                    <span>📅</span>
                    <span>{formatFullDateVN(formData.reportDeadline)} ({formatDateVN(formData.reportDeadline)})</span>
                  </div>
                )}
              </div>
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
              className="px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 shadow-md shadow-indigo-600/20 transition cursor-pointer disabled:opacity-50 inline-flex items-center gap-2"
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

export default InternshipTimelineModal;

