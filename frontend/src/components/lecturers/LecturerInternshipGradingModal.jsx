import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import internshipApi from '../../api/internshipApi';
import getFileUrl from '../../utils/fileUrlHelper';
import { formatDateVN, getInternshipGradingWindowStatus } from '../../utils/dateUtils';
import {
  Award,
  Building2,
  Calendar,
  CheckCircle2,
  Clock,
  Lock,
  FileText,
  AlertCircle,
  ExternalLink,
  Download,
  Eye,
  RefreshCw,
} from 'lucide-react';

const formatFileSize = (bytes) => {
  if (!bytes || isNaN(bytes)) return '';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

const LecturerInternshipGradingModal = ({
  isOpen,
  onClose,
  internship,
  onGraded,
}) => {
  const { currentTerm } = useAcademicTerm();
  const { showToast } = useToast();

  const [score, setScore] = useState('');
  const [comments, setComments] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  // Report File fetch state
  const [reportLoading, setReportLoading] = useState(false);
  const [reportFile, setReportFile] = useState(null);
  const [reportError, setReportError] = useState('');
  const [showInlinePreview, setShowInlinePreview] = useState(false);

  const isEditing = Boolean(
    internship?.evaluation &&
      internship.evaluation?.score !== undefined &&
      internship.evaluation?.score !== null,
  );

  // Determine grading window status according to TBM timeline configuration
  const internshipTerm =
    internship?.academicTermId && (internship.academicTermId.internship !== undefined || internship.academicTermId.name)
      ? internship.academicTermId
      : currentTerm;

  const windowStatus = getInternshipGradingWindowStatus(internshipTerm);

  // Fetch report file on open
  useEffect(() => {
    if (!isOpen || !internship?._id) {
      setReportFile(null);
      setReportLoading(false);
      setReportError('');
      setShowInlinePreview(false);
      return;
    }

    let isMounted = true;
    const fetchReport = async () => {
      setReportLoading(true);
      setReportError('');
      try {
        const res = await internshipApi.getReportFile(internship._id);
        if (isMounted) {
          const data = res?.data?.data || res?.data;
          if (data && (data.fileUrl || data.fileName)) {
            setReportFile(data);
          } else if (internship?.reportFile?.fileUrl) {
            setReportFile(internship.reportFile);
          } else {
            setReportFile(null);
          }
        }
      } catch (err) {
        if (isMounted) {
          if (internship?.reportFile?.fileUrl) {
            setReportFile(internship.reportFile);
          } else {
            setReportFile(null);
            setReportError(err.response?.data?.message || 'Chưa nộp file báo cáo thực tập');
          }
        }
      } finally {
        if (isMounted) {
          setReportLoading(false);
        }
      }
    };

    fetchReport();
    return () => {
      isMounted = false;
    };
  }, [isOpen, internship?._id]);

  // Populate existing evaluation if present
  useEffect(() => {
    if (internship?.evaluation) {
      const ev = internship.evaluation;
      setScore(ev.score !== undefined && ev.score !== null ? String(ev.score) : '');
      setComments(ev.comments || '');
    } else {
      setScore('');
      setComments('');
    }
    setError('');
  }, [internship, isOpen]);

  // ==========================================
  // Điều kiện chấm điểm TTDN:
  // CHỈ CẦN đáp ứng đồng thời 2 điều kiện:
  // 1. Đã PASS PRETEST
  // 2. Đã nộp file báo cáo thực tập hợp lệ
  // KHÔNG bắt buộc phải nộp đầy đủ nhật ký thực tập.
  // ==========================================
  const isPretestPassed = Boolean(internship?.pretest?.isPassed || internship?.pretestPassed);
  const effectiveReport = reportFile || (internship?.reportFile?.fileUrl ? internship.reportFile : null);
  const hasReport = Boolean(effectiveReport?.fileUrl);
  const isWindowAllowed = Boolean(windowStatus.allowed);

  const canSubmitGrading = isPretestPassed && hasReport && isWindowAllowed;

  const gradingBlockReasons = [];
  if (!isPretestPassed) gradingBlockReasons.push('Chưa đạt PASS PRETEST');
  if (!hasReport) gradingBlockReasons.push('Chưa nộp file báo cáo thực tập');
  if (!isWindowAllowed) gradingBlockReasons.push(windowStatus.reason || 'Ngoài thời hạn chấm điểm');

  const handleSubmit = async (e) => {
    e.preventDefault();

    if (!canSubmitGrading) {
      showToast(
        gradingBlockReasons.length > 0
          ? `Chưa đủ điều kiện chấm điểm: ${gradingBlockReasons.join(' • ')}`
          : 'Chưa đủ điều kiện chấm điểm',
        'error',
      );
      return;
    }

    const numScore = Number(score);
    if (isNaN(numScore) || score === '' || numScore < 0 || numScore > 10) {
      setError('Vui lòng nhập điểm số hợp lệ từ 0 đến 10');
      return;
    }

    // Confirmation dialog before saving edit
    if (isEditing) {
      const confirmed = window.confirm(
        `Bạn có chắc chắn muốn cập nhật điểm thực tập cho sinh viên ${
          internship.studentId?.userId?.fullName || ''
        } thành ${numScore} điểm không?`,
      );
      if (!confirmed) return;
    }

    setSubmitting(true);
    setError('');
    try {
      const payload = {
        score: numScore,
        comments: comments.trim() || undefined,
      };

      await internshipApi.grade(internship._id, payload);
      showToast(
        isEditing
          ? 'Đã cập nhật điểm đánh giá thực tập thành công!'
          : 'Đã lưu kết quả chấm điểm thực tập thành công!',
        'success',
      );
      if (onGraded) onGraded();
      onClose();
    } catch (err) {
      showToast(err.response?.data?.message || err.message || 'Lỗi khi lưu điểm đánh giá', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!internship) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={
        isEditing
          ? 'Chỉnh sửa điểm Thực tập Doanh nghiệp (Giảng viên Giám sát)'
          : 'Chấm điểm Thực tập Doanh nghiệp (Giảng viên Giám sát)'
      }
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Student & Enterprise Card */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-12 h-12 rounded-2xl bg-blue-50 border border-blue-100 text-[#123891] font-bold text-lg flex items-center justify-center shadow-2xs shrink-0">
              {internship.studentId?.userId?.fullName?.charAt(0).toUpperCase() || 'S'}
            </div>
            <div className="min-w-0">
              <div className="font-bold text-slate-900 text-sm truncate">
                {internship.studentId?.userId?.fullName}
              </div>
              <div className="text-[11px] text-slate-500 font-mono mt-0.5 flex items-center gap-2">
                <span className="font-bold text-[#123891]">MSSV: {internship.studentId?.studentCode}</span>
                <span>•</span>
                <span>Lớp: {internship.studentId?.className || '—'}</span>
              </div>
              <div className="text-[11px] text-slate-600 mt-1 flex items-center gap-1.5 truncate">
                <Building2 className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                <span className="truncate">
                  DN: <strong>{internship.companyId?.name || internship.companyId?.companyName || '—'}</strong> • Vị trí: <strong>{internship.position || 'Thực tập sinh'}</strong>
                </span>
              </div>
            </div>
          </div>

          {/* PRETEST Status Pill */}
          <div className="shrink-0 text-right">
            {isPretestPassed ? (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 font-bold text-xs shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã PASS PRETEST</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-3 py-1.5 rounded-xl bg-rose-50 text-rose-700 border border-rose-200 font-bold text-xs">
                <AlertCircle className="w-3.5 h-3.5 text-rose-500" />
                <span>Chưa PASS PRETEST</span>
              </span>
            )}
          </div>
        </div>

        {/* SECTION: TÌNH TRẠNG BÁO CÁO THỰC TẬP */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
          <div className="flex items-center justify-between pb-2.5 border-b border-slate-100">
            <div className="flex items-center gap-2 font-bold text-slate-900 uppercase tracking-wider text-xs">
              <FileText className="w-4 h-4 text-[#123891]" />
              <span>Tình trạng báo cáo thực tập</span>
            </div>

            {/* Status Badge */}
            {reportLoading ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-slate-100 text-slate-600">
                <RefreshCw className="w-3 h-3 animate-spin text-[#123891]" />
                <span>Đang kiểm tra báo cáo...</span>
              </span>
            ) : hasReport ? (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shadow-2xs">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Đã nộp báo cáo</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Chưa nộp báo cáo</span>
              </span>
            )}
          </div>

          {/* Report Details & Actions */}
          {hasReport && effectiveReport ? (
            <div className="space-y-3">
              <div className="p-3 bg-slate-50 rounded-xl border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-9 h-9 rounded-xl bg-blue-100 text-[#123891] flex items-center justify-center shrink-0">
                    <FileText className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate" title={effectiveReport.originalName || effectiveReport.fileName}>
                      {effectiveReport.originalName || effectiveReport.fileName || 'Báo cáo thực tập doanh nghiệp'}
                    </div>
                    <div className="text-[10px] text-slate-500 mt-0.5 flex items-center gap-2">
                      {effectiveReport.fileSize ? (
                        <span>Dung lượng: <strong>{formatFileSize(effectiveReport.fileSize)}</strong></span>
                      ) : null}
                      {effectiveReport.uploadedAt ? (
                        <>
                          <span>•</span>
                          <span>Nộp lúc: {formatDateVN(effectiveReport.uploadedAt, true)}</span>
                        </>
                      ) : null}
                    </div>
                  </div>
                </div>

                {/* View / Download Actions */}
                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => setShowInlinePreview((prev) => !prev)}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-[#123891] hover:bg-[#102d7d] text-white font-bold text-xs shadow-2xs transition cursor-pointer"
                    title="Xem trước file báo cáo trực tiếp trong cửa sổ này"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>{showInlinePreview ? 'Thu gọn' : 'Xem báo cáo'}</span>
                  </button>

                  <a
                    href={getFileUrl(effectiveReport.fileUrl)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                    title="Mở file báo cáo trong tab trình duyệt mới"
                  >
                    <ExternalLink className="w-3.5 h-3.5" />
                    <span>Mở tab mới</span>
                  </a>

                  <a
                    href={getFileUrl(effectiveReport.fileUrl)}
                    download={effectiveReport.originalName || 'BaoCaoThucTap.pdf'}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                    title="Tải file báo cáo về máy tính"
                  >
                    <Download className="w-3.5 h-3.5" />
                    <span>Tải về</span>
                  </a>
                </div>
              </div>

              {/* Inline PDF Preview */}
              {showInlinePreview && (
                <div className="p-3 bg-slate-900 rounded-2xl border border-slate-700 space-y-2 animate-in fade-in-50">
                  <div className="flex items-center justify-between text-white text-xs px-1">
                    <span className="font-semibold truncate">Xem trước: {effectiveReport.originalName || effectiveReport.fileName}</span>
                    <button
                      type="button"
                      onClick={() => setShowInlinePreview(false)}
                      className="px-2 py-0.5 rounded bg-slate-800 hover:bg-slate-700 text-slate-300 text-[11px] cursor-pointer"
                    >
                      Đóng xem trước
                    </button>
                  </div>
                  <div className="w-full h-80 bg-slate-100 rounded-xl overflow-hidden shadow-inner">
                    <iframe
                      src={getFileUrl(effectiveReport.fileUrl)}
                      title="Xem trước báo cáo thực tập"
                      className="w-full h-full border-0"
                    />
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="p-3 bg-amber-50/60 rounded-xl border border-amber-200 text-amber-900 flex items-start gap-2.5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                <span className="font-bold">Sinh viên chưa nộp file báo cáo thực tập:</span>
                <p className="text-[11px] text-amber-800 mt-0.5">
                  Theo quy định, sinh viên bắt buộc phải nộp file báo cáo thực tập hợp lệ thì GVGS mới được phép chấm điểm.
                </p>
              </div>
            </div>
          )}
        </div>

        {/* Notice if Editing */}
        {isEditing && (
          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-amber-900 text-xs leading-relaxed space-y-1">
            <div className="font-bold flex items-center gap-1.5 text-amber-800">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Chỉnh sửa điểm đã chấm</span>
            </div>
            <p className="text-[11px] text-slate-700">
              Điểm hiện tại:{' '}
              <strong className="text-amber-800 font-mono">
                {internship.evaluation.score} / 10
              </strong>
              . Mọi thay đổi điểm số sẽ được ghi nhận và lưu vết vào hệ thống.
            </p>
          </div>
        )}

        {/* Lock Warning Banner if window is not allowed */}
        {!windowStatus.allowed && (
          <div className="p-3.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 flex items-center gap-2.5 text-xs font-semibold">
            <Lock className="w-4 h-4 text-amber-600 shrink-0" />
            <span>{windowStatus.reason}</span>
          </div>
        )}

        {/* Ineligible Warning Banner */}
        {!canSubmitGrading && (
          <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2.5">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="leading-relaxed">
              <strong>Chưa đủ điều kiện chấm điểm:</strong>{' '}
              <span>{gradingBlockReasons.join(' • ')}</span>
            </div>
          </div>
        )}

        {/* Score & Comments Section */}
        <div className="space-y-4 p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
          <div>
            <label className="block font-bold text-slate-800 text-xs mb-1.5 flex items-center justify-between">
              <span className="flex items-center gap-1.5">
                <Award className="w-4 h-4 text-[#123891]" />
                <span>Điểm số (*):</span>
              </span>
              <span className="text-[11px] text-slate-500 font-normal">Thang điểm 10 (0.0 — 10.0)</span>
            </label>
            <input
              type="number"
              step="0.1"
              min="0"
              max="10"
              value={score}
              onChange={(e) => {
                setScore(e.target.value);
                if (error) setError('');
              }}
              disabled={submitting || !canSubmitGrading}
              placeholder={canSubmitGrading ? 'Nhập điểm số (Ví dụ: 8.5)...' : 'Vô hiệu hóa do chưa đủ điều kiện'}
              className="w-full px-4 py-2.5 text-sm font-bold bg-slate-50 border border-slate-300 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition disabled:bg-slate-100 disabled:cursor-not-allowed"
              autoFocus={canSubmitGrading}
            />
            {error && <p className="text-rose-500 text-xs font-semibold mt-1">{error}</p>}
          </div>

          <div>
            <label className="block font-bold text-slate-800 text-xs mb-1.5 flex items-center justify-between">
              <span>Nhận xét của Giảng viên Giám sát:</span>
              <span className="text-[11px] text-slate-400 font-normal">Không bắt buộc</span>
            </label>
            <textarea
              rows={3}
              value={comments}
              onChange={(e) => setComments(e.target.value)}
              disabled={submitting || !canSubmitGrading}
              placeholder="Nhập nhận xét về tinh thần làm việc, kết quả thực tập và tiến độ của sinh viên (tùy chọn)..."
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition resize-none leading-relaxed disabled:bg-slate-100 disabled:cursor-not-allowed"
            />
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting || !canSubmitGrading}
            className={`inline-flex items-center gap-1.5 px-6 py-2.5 font-bold rounded-xl transition ${
              canSubmitGrading
                ? 'text-white bg-[#123891] hover:bg-[#102d7d] shadow-sm shadow-blue-200 cursor-pointer disabled:opacity-50'
                : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-90'
            }`}
            title={
              canSubmitGrading
                ? (isEditing ? 'Lưu thay đổi' : 'Xác nhận chấm điểm')
                : `Chưa đủ điều kiện: ${gradingBlockReasons.join(' • ')}`
            }
          >
            {submitting ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>{isEditing ? 'Lưu thay đổi' : 'Xác nhận chấm điểm'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default LecturerInternshipGradingModal;
