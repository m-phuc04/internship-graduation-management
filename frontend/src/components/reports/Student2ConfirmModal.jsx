import React, { useState } from 'react';
import Modal from '../common/Modal';
import reportApi from '../../api/reportApi';
import { useToast } from '../../context/ToastContext';
import {
  CheckCircle2,
  XCircle,
  FileText,
  Paperclip,
  Download,
  AlertCircle,
  Calendar,
  User,
  ShieldCheck,
  Send,
} from 'lucide-react';

const Student2ConfirmModal = ({ isOpen, onClose, report, onConfirmed }) => {
  const [submitting, setSubmitting] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [error, setError] = useState('');

  const { showToast } = useToast();

  if (!report) return null;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleAction = async (action) => {
    setError('');

    if (action === 'REJECT' && !rejectionReason.trim()) {
      setError('Vui lòng nhập lý do yêu cầu chỉnh sửa để Sinh viên 1 nắm rõ.');
      return;
    }

    setSubmitting(true);
    try {
      await reportApi.confirmStudent2(report._id, {
        action,
        rejectionReason: action === 'REJECT' ? rejectionReason.trim() : undefined,
      });

      showToast(
        action === 'CONFIRM'
          ? 'Đã xác nhận thành công! Nhật ký đã được chuyển tới Giảng viên hướng dẫn.'
          : 'Đã gửi yêu cầu chỉnh sửa tới Sinh viên 1.',
        'success',
      );

      if (onConfirmed) onConfirmed();
      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Không thể xử lý yêu cầu';
      setError(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Xác Nhận Nhật Ký Tuần ${report.weekNumber}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4">
        {/* Error Alert */}
        {error && (
          <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-xl flex items-start gap-2 animate-in fade-in">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span>{error}</span>
          </div>
        )}

        {/* Verification Intro Banner */}
        <div className="p-4 bg-blue-50/70 border border-blue-100 rounded-2xl flex items-start gap-3">
          <div className="w-8 h-8 rounded-xl bg-[#153898] text-white flex items-center justify-center shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div className="text-xs text-[#0B1E48]">
            <div className="font-bold">Xác nhận báo cáo của nhóm 2 sinh viên</div>
            <div className="text-[11px] text-[#0d2a75] mt-0.5 leading-relaxed">
              Bạn đang ở vai trò <strong>Sinh viên 2</strong>. Vui lòng kiểm tra kỹ nội dung và file đính kèm dưới đây trước khi bấm xác nhận để chuyển báo cáo cho Giảng viên hướng dẫn xem và chấm điểm.
            </div>
          </div>
        </div>

        {/* Report Overview Info */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5 text-xs">
          <div className="flex items-center justify-between flex-wrap gap-2 pb-2 border-b border-slate-200/60">
            <div className="flex items-center gap-2">
              <span className="font-extrabold text-white bg-[#153898] px-2.5 py-0.5 rounded-lg text-[11px]">
                Tuần #{report.weekNumber}
              </span>
              <span className="font-semibold text-slate-700">
                {report.weekStartDate && report.weekEndDate
                  ? `${formatDate(report.weekStartDate)} — ${formatDate(report.weekEndDate)}`
                  : 'Thời gian tuần thực tập'}
              </span>
            </div>
            <div className="text-[11px] text-slate-400 font-mono">
              Gửi lúc: {new Date(report.submittedAt || report.createdAt).toLocaleString('vi-VN')}
            </div>
          </div>

          <div>
            <span className="text-slate-400 text-[11px] block font-bold uppercase tracking-wider">
              Tiêu đề nhật ký:
            </span>
            <div className="font-bold text-slate-900 text-sm mt-0.5">{report.title}</div>
          </div>

          <div className="flex items-center gap-2 text-slate-600 text-[11px]">
            <User className="w-3.5 h-3.5 text-slate-400" />
            <span>
              <strong>Người tạo:</strong> {report.studentId?.userId?.fullName || report.studentId?.studentCode} (SV1 - Trưởng nhóm)
            </span>
          </div>
        </div>

        {/* Diary Content */}
        {report.content ? (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              Nội dung công việc thực hiện
            </label>
            <div className="p-4 rounded-2xl bg-white border border-slate-200 text-xs text-slate-800 whitespace-pre-line leading-relaxed max-h-56 overflow-y-auto">
              {report.content}
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-slate-50 border border-dashed border-slate-200 rounded-2xl text-xs text-slate-400 italic">
            Không có phần văn bản mô tả (sinh viên nộp bằng file đính kèm bên dưới).
          </div>
        )}

        {/* Attached File */}
        {report.file?.fileUrl && (
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
              File đính kèm
            </label>
            <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <Paperclip className="w-4 h-4 text-[#153898] shrink-0" />
                <div className="min-w-0">
                  <div className="text-xs font-bold text-[#0B1E48] truncate">
                    {report.file.originalName || report.file.fileName}
                  </div>
                  {report.file.size && (
                    <div className="text-[10px] text-[#153898] font-mono">
                      {(report.file.size / (1024 * 1024)).toFixed(2)} MB
                    </div>
                  )}
                </div>
              </div>

              <a
                href={report.file.fileUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1 px-3 py-1.5 bg-[#153898] hover:bg-[#102d7d] text-white text-xs font-semibold rounded-xl shadow-xs transition shrink-0"
              >
                <Download className="w-3.5 h-3.5" />
                <span>Xem / Tải về</span>
              </a>
            </div>
          </div>
        )}

        {/* Rejection Reason Form */}
        {showRejectForm && (
          <div className="p-4 bg-rose-50/80 border border-rose-200 rounded-2xl space-y-2.5 animate-in fade-in">
            <label className="block text-xs font-bold text-rose-900 uppercase tracking-wider">
              Lý do yêu cầu chỉnh sửa <span className="text-rose-600">*</span>
            </label>
            <textarea
              rows={3}
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Nhập cụ thể những nội dung cần SV1 bổ sung hoặc chỉnh sửa lại..."
              className="w-full p-3 bg-white border border-rose-300 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 resize-none leading-relaxed"
            />
            <div className="flex items-center justify-end gap-2">
              <button
                type="button"
                onClick={() => setShowRejectForm(false)}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-200/60 rounded-lg transition"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={() => handleAction('REJECT')}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white rounded-xl text-xs font-bold shadow-xs transition disabled:opacity-50"
              >
                <Send className="w-3 h-3" />
                <span>{submitting ? 'Đang gửi...' : 'Gửi yêu cầu sửa'}</span>
              </button>
            </div>
          </div>
        )}

        {/* Footer Actions */}
        {!showRejectForm && (
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 gap-3">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2.5 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Đóng
            </button>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setShowRejectForm(true)}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-3.5 py-2.5 text-xs font-bold text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-xl transition cursor-pointer disabled:opacity-50"
              >
                <XCircle className="w-4 h-4" />
                <span>Yêu cầu chỉnh sửa</span>
              </button>

              <button
                type="button"
                onClick={() => handleAction('CONFIRM')}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-4 py-2.5 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-200 transition cursor-pointer disabled:opacity-50"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{submitting ? 'Đang xử lý...' : 'Xác nhận & Gửi GVHD'}</span>
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default Student2ConfirmModal;
