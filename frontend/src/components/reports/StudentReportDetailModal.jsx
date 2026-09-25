import React from 'react';
import Modal from '../common/Modal';
import StatusBadge from '../common/StatusBadge';
import {
  FileText,
  Calendar,
  Award,
  CheckCircle2,
  XCircle,
  ExternalLink,
  Download,
  MessageSquare,
  Paperclip,
  FileCheck,
  ShieldCheck,
  AlertTriangle,
  Clock,
  User,
} from 'lucide-react';
import getFileUrl from '../../utils/fileUrlHelper';

const StudentReportDetailModal = ({ isOpen, onClose, report }) => {
  if (!report) return null;

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const fullFileUrl = report.file?.fileUrl ? getFileUrl(report.file.fileUrl) : '';

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Chi Tiết Nhật Ký Tuần ${report.weekNumber || ''}`}
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Header Summary */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-[#123891] text-white font-mono">
                Tuần #{report.weekNumber}
              </span>
              <StatusBadge status={report.status} size="sm" />
            </div>
            <h3 className="font-bold text-slate-900 text-sm mt-1.5">
              {report.title}
            </h3>
            {report.weekStartDate && report.weekEndDate && (
              <div className="text-[11px] text-slate-500 mt-0.5">
                Thời gian: {new Date(report.weekStartDate).toLocaleDateString('vi-VN')} — {new Date(report.weekEndDate).toLocaleDateString('vi-VN')}
              </div>
            )}
          </div>

          <div className="text-right text-[11px] text-slate-500 shrink-0">
            <div>Ngày nộp: <strong>{formatDate(report.submittedAt || report.createdAt)}</strong></div>
            {report.studentId?.userId?.fullName && (
              <div className="text-[10px] text-slate-400 mt-0.5">
                Người tạo: {report.studentId.userId.fullName}
              </div>
            )}
          </div>
        </div>

        {/* SV2 Confirmation Status Banner */}
        {report.secondStudentId && (
          <div className="p-3.5 rounded-2xl border text-xs space-y-1 bg-white shadow-2xs">
            <div className="font-bold uppercase tracking-wider text-[11px] flex items-center justify-between">
              <span className="flex items-center gap-1.5 text-[#123891]">
                <ShieldCheck className="w-4 h-4 text-[#123891]" />
                Trạng thái xác nhận Sinh viên 2
              </span>
              {report.student2Status === 'CONFIRMED' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                  <CheckCircle2 className="w-3 h-3" /> Đã xác nhận
                </span>
              ) : report.student2Status === 'REJECTED' ? (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                  <XCircle className="w-3 h-3" /> Yêu cầu sửa
                </span>
              ) : (
                <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                  <Clock className="w-3 h-3" /> Chờ SV2 xác nhận
                </span>
              )}
            </div>

            {report.student2ConfirmedAt && (
              <div className="text-[11px] text-emerald-700">
                SV2 đã xác nhận vào lúc: {formatDate(report.student2ConfirmedAt)}
              </div>
            )}

            {report.student2RejectedReason && report.status === 'NEEDS_REVISION' && (
              <div className="p-2.5 bg-rose-50 rounded-xl border border-rose-200 text-rose-900 mt-1">
                <strong>Lý do SV2 từ chối:</strong> {report.student2RejectedReason}
              </div>
            )}
          </div>
        )}

        {/* Uploaded File Card */}
        {report.file?.fileUrl ? (
          <div className="p-4 rounded-2xl bg-blue-50/50 border border-blue-200/70 space-y-3">
            <div className="flex items-center justify-between">
              <div className="font-bold uppercase tracking-wider text-[11px] flex items-center gap-1.5 text-[#123891]">
                <Paperclip className="w-4 h-4 text-[#123891]" />
                Tài liệu nhật ký đính kèm
              </div>
              {report.file.size && (
                <span className="text-[11px] text-slate-500 font-medium font-mono">
                  {formatFileSize(report.file.size)}
                </span>
              )}
            </div>

            <div className="p-3 bg-white rounded-xl border border-blue-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-blue-100 text-[#102d7d] flex items-center justify-center shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-xs truncate">
                    {report.file.originalName || report.file.fileName || 'Tài liệu báo cáo'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    Đã tải lên: {formatDate(report.file.uploadedAt || report.createdAt)}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={fullFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#123891] hover:bg-[#102d7d] text-white font-bold text-xs shadow-2xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Xem file</span>
                </a>

                <a
                  href={fullFileUrl}
                  download={report.file.originalName || 'NhatKyThucTap.pdf'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3.5 rounded-xl bg-slate-50 border border-dashed border-slate-200 text-slate-400 text-center">
            Chưa có file đính kèm nào cho nhật ký tuần này.
          </div>
        )}

        {/* Content */}
        {report.content && (
          <div className="p-4 rounded-2xl bg-white border border-slate-200/80 space-y-1.5 shadow-2xs">
            <div className="font-bold text-slate-700 uppercase tracking-wider text-[11px] flex items-center gap-1.5 pb-1.5 border-b border-slate-100">
              <FileText className="w-4 h-4 text-slate-500" />
              Nội dung công việc thực hiện
            </div>
            <p className="text-slate-800 text-xs leading-relaxed whitespace-pre-wrap pt-1">
              {report.content}
            </p>
          </div>
        )}

        {/* Lecturer Review Card */}
        {(report.lecturerScore !== null || report.lecturerComment) && (
          <div className="p-4 rounded-2xl bg-emerald-50/70 border border-emerald-200 text-emerald-950 space-y-2 shadow-2xs">
            <div className="font-bold text-[11px] uppercase tracking-wider flex items-center justify-between pb-2 border-b border-emerald-200/60">
              <span className="flex items-center gap-1.5 text-emerald-800">
                <Award className="w-4 h-4 text-emerald-600" />
                Đánh giá của Giảng viên Hướng dẫn
              </span>
              {report.lecturerScore !== null && (
                <span className="text-sm font-extrabold text-emerald-700 bg-emerald-100 px-2.5 py-0.5 rounded-lg border border-emerald-300/60">
                  {report.lecturerScore} / 10 điểm
                </span>
              )}
            </div>

            {report.lecturerComment && (
              <div className="space-y-1">
                <div className="text-[11px] text-emerald-800 font-semibold flex items-center gap-1">
                  <MessageSquare className="w-3.5 h-3.5 text-emerald-600" /> Nhận xét của Giảng viên:
                </div>
                <p className="text-slate-800 text-xs bg-white/80 p-3 rounded-xl border border-emerald-100 leading-relaxed">
                  {report.lecturerComment}
                </p>
              </div>
            )}

            {report.reviewedAt && (
              <div className="text-[10px] text-slate-500 text-right pt-1">
                Đánh giá lúc: {formatDate(report.reviewedAt)}
              </div>
            )}
          </div>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default StudentReportDetailModal;
