import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import reportApi from '../../api/reportApi';
import { useToast } from '../../context/ToastContext';
import {
  Award,
  CheckCircle2,
  XCircle,
  FileText,
  ExternalLink,
  Download,
  Paperclip,
  FileCheck,
} from 'lucide-react';
import getFileUrl from '../../utils/fileUrlHelper';

const LecturerReviewReportModal = ({ isOpen, onClose, report, onReviewed }) => {
  const [score, setScore] = useState('');
  const [comment, setComment] = useState('');
  const [status, setStatus] = useState('APPROVED');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    if (report) {
      setScore(report.lecturerScore !== null && report.lecturerScore !== undefined ? report.lecturerScore : '');
      setComment(report.lecturerComment || '');
      setStatus(report.status === 'REJECTED' ? 'REJECTED' : 'APPROVED');
      setError('');
    }
  }, [report]);

  const handleReview = async () => {
    if (score !== '' && (Number(score) < 0 || Number(score) > 10)) {
      setError('Điểm đánh giá phải từ 0 đến 10');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await reportApi.review(report._id, {
        lecturerScore: score !== '' ? Number(score) : null,
        lecturerComment: comment.trim() || null,
        status,
      });

      showToast(`Đã đánh giá báo cáo (${status}) thành công!`, 'success');
      onReviewed();
      onClose();
    } catch (err) {
      setError(err.message || 'Không thể đánh giá báo cáo');
      showToast(err.message || 'Không thể đánh giá báo cáo', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!report) return null;

  const getTypeLabel = () => {
    if (report.reportType === 'WEEKLY') return `Báo cáo Tuần ${report.weekNumber || ''}`;
    if (report.reportType === 'MONTHLY') return `Báo cáo Tháng ${report.monthNumber || ''}`;
    return 'Báo cáo Tổng kết (Final)';
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
      title="Đánh giá & Chấm điểm Báo cáo Thực tập"
      maxWidth="max-w-2xl"
    >
      <div className="space-y-4 text-xs">
        {/* Student & Report Header */}
        <div className="p-3.5 rounded-2xl bg-violet-50/60 border border-violet-200/80 text-violet-950 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
          <div>
            <div className="font-bold text-sm">
              {report.studentId?.userId?.fullName} ({report.studentId?.studentCode})
            </div>
            <div className="text-slate-600 text-[11px] mt-0.5">
              {getTypeLabel()} • Tiêu đề: <strong>{report.title}</strong>
            </div>
          </div>
          <span className="text-[11px] font-bold px-2.5 py-1 rounded-lg bg-violet-100 text-violet-700">
            {report.status}
          </span>
        </div>

        {/* Uploaded File Section (Prominent) */}
        {report.file?.fileUrl ? (
          <div className="p-3.5 rounded-2xl bg-violet-50/40 border border-violet-200/70 space-y-2">
            <div className="flex items-center justify-between">
              <div className="font-bold text-violet-900 uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Paperclip className="w-4 h-4 text-violet-600" />
                File Báo Cáo Của Sinh Viên
              </div>
              {report.file.size && (
                <span className="text-[11px] text-slate-500 font-mono">
                  {formatFileSize(report.file.size)}
                </span>
              )}
            </div>

            <div className="p-3 bg-white rounded-xl border border-violet-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-violet-100 text-violet-700 flex items-center justify-center shrink-0">
                  <FileCheck className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="font-semibold text-slate-900 text-xs truncate">
                    {report.file.originalName || report.file.fileName || 'Tài liệu báo cáo'}
                  </div>
                  <div className="text-[10px] text-slate-400">
                    File đính kèm chính thức
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={fullFileUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-2xs transition"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  <span>Xem báo cáo</span>
                </a>

                <a
                  href={fullFileUrl}
                  download={report.file.originalName || 'BaoCaoThucTap.pdf'}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                >
                  <Download className="w-3.5 h-3.5" />
                  <span>Tải file</span>
                </a>
              </div>
            </div>
          </div>
        ) : (
          <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl text-slate-400 text-center">
            Sinh viên chưa đính kèm file cho báo cáo này.
          </div>
        )}

        {/* Note / Content */}
        {report.content && (
          <div className="p-3 bg-slate-50 border border-slate-200/80 rounded-xl space-y-1">
            <div className="font-bold text-slate-700 text-[11px] uppercase tracking-wider">
              Ghi chú của sinh viên
            </div>
            <p className="text-slate-700 text-xs leading-relaxed whitespace-pre-wrap">
              {report.content}
            </p>
          </div>
        )}

        {/* Evaluation Controls */}
        <div className="pt-2 border-t border-slate-100 space-y-3">
          {error && (
            <div className="p-2.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-700">
              {error}
            </div>
          )}

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {/* Status Option */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Kết quả đánh giá <span className="text-rose-500">*</span>
              </label>
              <select
                value={status}
                onChange={(e) => setStatus(e.target.value)}
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
              >
                <option value="APPROVED">Duyệt & Đạt yêu cầu (APPROVED)</option>
                <option value="REVIEWING">Đang xem xét (REVIEWING)</option>
                <option value="REJECTED">Yêu cầu chỉnh sửa lại (REJECTED)</option>
              </select>
            </div>

            {/* Score */}
            <div>
              <label className="block font-semibold text-slate-700 mb-1">
                Điểm số (Thang điểm 10)
              </label>
              <input
                type="number"
                step="0.1"
                min="0"
                max="10"
                value={score}
                onChange={(e) => setScore(e.target.value)}
                placeholder="VD: 8.5"
                className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
              />
            </div>
          </div>

          {/* Comment */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              Nhận xét & Góp ý cho sinh viên
            </label>
            <textarea
              rows={3}
              value={comment}
              onChange={(e) => setComment(e.target.value)}
              placeholder="Nhập nhận xét tiến độ, thái độ thực tập, chất lượng báo cáo..."
              className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-xs text-slate-800 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition resize-none"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-between pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Đóng
          </button>

          <button
            type="button"
            disabled={submitting}
            onClick={handleReview}
            className="inline-flex items-center gap-1.5 px-5 py-2 font-bold text-white bg-violet-600 hover:bg-violet-700 rounded-xl shadow-sm shadow-violet-200 transition disabled:opacity-50"
          >
            <Award className="w-3.5 h-3.5" />
            <span>{submitting ? 'Đang lưu...' : 'Lưu kết quả đánh giá'}</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default LecturerReviewReportModal;
