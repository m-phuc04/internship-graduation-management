import React, { useState, useEffect, useCallback, useRef } from 'react';
import { Link } from 'react-router-dom';
import thesisProgressApi from '../../api/thesisProgressApi';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import getFileUrl from '../../utils/fileUrlHelper';

import {
  GraduationCap,
  PlusCircle,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Send,
  BookOpen,
  Calendar,
  FileText,
  Paperclip,
  Percent,
  Award,
  Users,
  Eye,
  Download,
  Upload,
  Trash2,
  FileCheck,
  ExternalLink,
} from 'lucide-react';

const StudentThesisProgressPage = () => {
  const [thesis, setThesis] = useState(null);
  const [student, setStudent] = useState(null);
  const [progressList, setProgressList] = useState([]);
  const [stats, setStats] = useState({
    total: 0,
    approved: 0,
    pending: 0,
    avgPercentage: 0,
  });
  const [loading, setLoading] = useState(true);

  // Detail Modal
  const [selectedProgress, setSelectedProgress] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Create Progress Modal
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [progressType, setProgressType] = useState('WEEKLY');
  const [weekNumber, setWeekNumber] = useState(1);
  const [monthNumber, setMonthNumber] = useState(1);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [completionPercentage, setCompletionPercentage] = useState(25);
  const [selectedFile, setSelectedFile] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const fileInputRef = useRef(null);
  const { showToast } = useToast();

  const fetchProgress = useCallback(async () => {
    setLoading(true);
    try {
      const res = await thesisProgressApi.getMyProgress();
      if (res.success) {
        setThesis(res.thesis || null);
        setStudent(res.student || null);
        setProgressList(res.data || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải tiến độ khóa luận', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchProgress();
  }, [fetchProgress]);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (file.size > 15 * 1024 * 1024) {
      showToast('Kích thước file không được vượt quá 15MB', 'error');
      return;
    }
    setSelectedFile(file);
  };

  const handleRemoveFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Handle Create Progress Submission (FormData)
  const handleCreateProgress = async (statusToSet = 'SUBMITTED') => {
    setFormError('');

    if (!title.trim()) {
      setFormError('Vui lòng nhập tiêu đề báo cáo tiến độ');
      return;
    }
    if (!description.trim()) {
      setFormError('Vui lòng nhập nội dung chi tiết công việc đã thực hiện');
      return;
    }

    setSubmitting(true);
    try {
      const formData = new FormData();
      formData.append('thesisId', thesis?._id);
      formData.append('progressType', progressType);
      if (progressType === 'WEEKLY') {
        formData.append('weekNumber', String(weekNumber));
      } else {
        formData.append('monthNumber', String(monthNumber));
      }
      formData.append('title', title.trim());
      formData.append('description', description.trim());
      formData.append('completionPercentage', String(completionPercentage));
      formData.append('status', statusToSet);

      if (selectedFile) {
        formData.append('file', selectedFile);
      }

      const res = await thesisProgressApi.create(formData);
      if (res.success) {
        showToast(
          statusToSet === 'DRAFT'
            ? 'Đã lưu bản nháp báo cáo tiến độ!'
            : 'Đã nộp báo cáo tiến độ cho Giảng viên hướng dẫn!',
          'success',
        );
        setCreateModalOpen(false);
        // Reset Form
        setTitle('');
        setDescription('');
        setSelectedFile(null);
        if (fileInputRef.current) fileInputRef.current.value = '';
        fetchProgress();
      }
    } catch (err) {
      setFormError(err.message || 'Nộp báo cáo tiến độ thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  // Submit Draft
  const handleSubmitDraft = async (progressId) => {
    try {
      const res = await thesisProgressApi.submitDraft(progressId);
      if (res.success) {
        showToast('Nộp báo cáo tiến độ thành công!', 'success');
        fetchProgress();
      }
    } catch (err) {
      showToast(err.message || 'Nộp báo cáo thất bại', 'error');
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSkeleton rows={5} cols={2} />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-500 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-200 shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  Tiến Độ Khóa Luận Tốt Nghiệp (KLTN)
                </h2>
                {thesis && <StatusBadge status={thesis.status} size="md" />}
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-2">
                <span>{thesis?.thesisTitle || 'Chưa đăng ký đề tài'}</span>
                {thesis?.supervisorId && (
                  <>
                    <span>•</span>
                    <span>
                      GVHD: <strong>{thesis.supervisorId.academicTitle} {thesis.supervisorId.userId?.fullName}</strong>
                    </span>
                  </>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={fetchProgress}
              className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition"
              title="Làm mới"
            >
              <RefreshCw className="w-4 h-4" />
            </button>

            {thesis && !['PENDING_TBM_APPROVAL', 'REJECTED'].includes(thesis.status) && (
              <button
                onClick={() => {
                  setFormError('');
                  setCreateModalOpen(true);
                }}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 transition"
              >
                <PlusCircle className="w-4 h-4" />
                <span>Báo cáo tiến độ mới</span>
              </button>
            )}
          </div>
        </div>

        {/* Stats Grid */}
        {thesis && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
            <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
              <div className="text-[11px] text-slate-500 font-medium">Tổng số báo cáo</div>
              <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{stats.total}</div>
            </div>

            <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
              <div className="text-[11px] text-emerald-700 font-medium">Đã được duyệt</div>
              <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{stats.approved}</div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80">
              <div className="text-[11px] text-amber-700 font-medium">Chờ GVHD đánh giá</div>
              <div className="text-lg font-bold text-amber-700 font-mono mt-0.5">{stats.pending}</div>
            </div>

            <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200/80">
              <div className="text-[11px] text-indigo-700 font-medium">Tiến độ ước tính</div>
              <div className="text-lg font-bold text-indigo-700 font-mono mt-0.5">
                {stats.avgPercentage}%
              </div>
            </div>
          </div>
        )}
      </div>

      {/* No Thesis Registered Notice */}
      {!thesis ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs">
          <EmptyState
            title="Bạn chưa có đề tài Khóa luận tốt nghiệp được phê duyệt"
            description="Hãy đăng ký đề tài KLTN và chờ Trưởng Bộ Môn phê duyệt để bắt đầu nộp báo cáo tiến độ định kỳ."
          />
          <div className="text-center mt-4">
            <Link
              to="/student/thesis/register"
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 transition"
            >
              <PlusCircle className="w-4 h-4" />
              <span>Đăng ký đề tài Khóa luận</span>
            </Link>
          </div>
        </div>
      ) : progressList.length === 0 ? (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs">
          <EmptyState
            title="Chưa có báo cáo tiến độ nào"
            description="Hãy nhấn nút 'Báo cáo tiến độ mới' để gửi báo cáo tuần hoặc tháng cho Giảng viên hướng dẫn."
          />
        </div>
      ) : (
        /* Progress Cards List */
        <div className="space-y-4">
          {progressList.map((item) => {
            const isDraft = item.status === 'DRAFT';
            const isApproved = item.status === 'APPROVED';
            const isRejected = item.status === 'REJECTED';
            const hasFile = item.file && (item.file.fileUrl || item.file.fileName);

            return (
              <div
                key={item._id}
                className="p-5 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-3 transition hover:border-slate-300"
              >
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2.5">
                    <span className="text-xs font-bold px-2.5 py-1 rounded-xl bg-indigo-50 text-indigo-700 border border-indigo-200">
                      {item.progressType === 'WEEKLY' ? `Tuần ${item.weekNumber}` : `Tháng ${item.monthNumber}`}
                    </span>
                    <h3 className="text-sm font-bold text-slate-900">{item.title}</h3>
                  </div>

                  <div className="flex items-center gap-3">
                    <span className="text-xs font-mono font-bold text-slate-700 flex items-center gap-1">
                      <Percent className="w-3.5 h-3.5 text-indigo-600" />
                      Hoàn thành: {item.completionPercentage}%
                    </span>
                    <StatusBadge status={item.status} size="sm" />
                  </div>
                </div>

                {/* Description */}
                <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-3">
                  {item.description}
                </p>

                {/* File Attachment */}
                {hasFile ? (
                  <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-indigo-700 bg-indigo-50/70 px-3.5 py-2 rounded-2xl border border-indigo-100">
                    <div className="flex items-center gap-2 min-w-0">
                      <Paperclip className="w-4 h-4 shrink-0 text-indigo-600" />
                      <span className="truncate font-semibold">
                        {item.file.originalName || item.file.fileName}
                      </span>
                      {item.file.size && (
                        <span className="text-[11px] text-indigo-500 font-mono">
                          ({formatFileSize(item.file.size)})
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      <a
                        href={getFileUrl(item.file.fileUrl)}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 rounded-lg text-xs font-semibold text-indigo-700 transition"
                      >
                        <ExternalLink className="w-3 h-3" />
                        <span>Xem file</span>
                      </a>
                      <a
                        href={getFileUrl(item.file.fileUrl)}
                        download={item.file.originalName || item.file.fileName}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold transition"
                      >
                        <Download className="w-3 h-3" />
                        <span>Tải về</span>
                      </a>
                    </div>
                  </div>
                ) : (
                  <div className="text-xs text-slate-400 italic">Chưa có tài liệu đính kèm</div>
                )}

                {/* Lecturer Review Card if available */}
                {(item.lecturerComment || item.lecturerScore !== null) && (
                  <div
                    className={`p-3.5 rounded-2xl border text-xs space-y-1 ${
                      isApproved
                        ? 'bg-emerald-50/70 border-emerald-200 text-emerald-950'
                        : isRejected
                        ? 'bg-rose-50/70 border-rose-200 text-rose-950'
                        : 'bg-slate-50 border-slate-200 text-slate-900'
                    }`}
                  >
                    <div className="flex items-center justify-between font-bold text-[11px] uppercase tracking-wider">
                      <span>Đánh giá từ GVHD ({formatDate(item.reviewedAt)})</span>
                      {item.lecturerScore !== null && (
                        <span className="font-mono text-xs text-emerald-700 font-extrabold bg-white px-2 py-0.5 rounded-md border border-emerald-200">
                          Điểm: {item.lecturerScore}/10
                        </span>
                      )}
                    </div>
                    {item.lecturerComment && (
                      <p className="leading-relaxed mt-1 text-[11px]">
                        Nhận xét: {item.lecturerComment}
                      </p>
                    )}
                  </div>
                )}

                {/* Footer Metadata & Action */}
                <div className="flex items-center justify-between text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                  <div>
                    Người nộp: <strong>{item.studentId?.userId?.fullName || 'Sinh viên'}</strong> • Ngày nộp:{' '}
                    {formatDate(item.submittedAt || item.createdAt)}
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedProgress(item);
                        setDetailModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-3 py-1 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-lg text-xs transition"
                    >
                      <Eye className="w-3 h-3" />
                      <span>Xem chi tiết</span>
                    </button>

                    {isDraft && (
                      <button
                        onClick={() => handleSubmitDraft(item._id)}
                        className="inline-flex items-center gap-1 px-3 py-1 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-lg shadow-sm transition"
                      >
                        <Send className="w-3 h-3" />
                        <span>Nộp báo cáo</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Detail Modal */}
      {detailModalOpen && selectedProgress && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title="Chi Tiết Báo Cáo Tiến Độ KLTN"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Header info */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <div>
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-indigo-600 text-white font-bold text-xs">
                    {selectedProgress.progressType === 'WEEKLY'
                      ? `Tuần ${selectedProgress.weekNumber}`
                      : `Tháng ${selectedProgress.monthNumber}`}
                  </span>
                  <h3 className="font-bold text-sm text-slate-900">
                    {selectedProgress.title}
                  </h3>
                </div>
                <div className="text-[11px] text-slate-500 mt-1">
                  Đề tài: <strong>{thesis?.thesisTitle}</strong>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <StatusBadge status={selectedProgress.status} size="md" />
                <span className="font-mono font-bold text-indigo-700 bg-white px-2.5 py-1 rounded-xl border border-indigo-200">
                  {selectedProgress.completionPercentage}%
                </span>
              </div>
            </div>

            {/* Student & Submission info */}
            <div className="grid grid-cols-2 gap-3 p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80">
              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Người thực hiện</div>
                <div className="font-semibold text-slate-900 text-xs mt-0.5">
                  {selectedProgress.studentId?.userId?.fullName || student?.userId?.fullName}
                </div>
                <div className="text-slate-500 font-mono text-[11px]">
                  MSSV: {student?.studentCode} • Lớp: {student?.className}
                </div>
              </div>

              <div>
                <div className="text-slate-400 text-[10px] uppercase font-bold">Thời gian</div>
                <div className="text-slate-700 text-xs mt-0.5">
                  Ngày nộp: {formatDate(selectedProgress.submittedAt || selectedProgress.createdAt)}
                </div>
                {selectedProgress.reviewedAt && (
                  <div className="text-slate-500 text-[11px]">
                    Ngày duyệt: {formatDate(selectedProgress.reviewedAt)}
                  </div>
                )}
              </div>
            </div>

            {/* Description */}
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Nội dung chi tiết báo cáo
              </div>
              <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-800 leading-relaxed whitespace-pre-wrap text-xs">
                {selectedProgress.description}
              </div>
            </div>

            {/* File Attachment Details */}
            <div>
              <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                Tệp tài liệu / Báo cáo đính kèm
              </div>
              {selectedProgress.file && (selectedProgress.file.fileUrl || selectedProgress.file.fileName) ? (
                <div className="p-3.5 bg-indigo-50/60 border border-indigo-100 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {selectedProgress.file.originalName || selectedProgress.file.fileName}
                      </div>
                      <div className="text-slate-500 text-[10px] font-mono">
                        {selectedProgress.file.mimeType || 'Document'} • {formatFileSize(selectedProgress.file.size)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={getFileUrl(selectedProgress.file.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-indigo-600 hover:text-white border border-indigo-200 text-indigo-700 rounded-xl text-xs font-semibold transition shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Xem file</span>
                    </a>
                    <a
                      href={getFileUrl(selectedProgress.file.fileUrl)}
                      download={selectedProgress.file.originalName || selectedProgress.file.fileName}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải về</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 italic">
                  Không có tài liệu đính kèm cho tiến độ này
                </div>
              )}
            </div>

            {/* Lecturer Review details if available */}
            {(selectedProgress.lecturerComment || selectedProgress.lecturerScore !== null) && (
              <div>
                <div className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-1.5">
                  Đánh giá từ Giảng viên hướng dẫn
                </div>
                <div
                  className={`p-4 rounded-2xl border text-xs space-y-2 ${
                    selectedProgress.status === 'APPROVED'
                      ? 'bg-emerald-50/70 border-emerald-200'
                      : selectedProgress.status === 'REJECTED'
                      ? 'bg-rose-50/70 border-rose-200'
                      : 'bg-slate-50 border-slate-200'
                  }`}
                >
                  <div className="flex items-center justify-between font-bold">
                    <span className="text-slate-800">
                      GVHD: {thesis?.supervisorId?.academicTitle} {thesis?.supervisorId?.userId?.fullName}
                    </span>
                    {selectedProgress.lecturerScore !== null && (
                      <span className="font-mono text-sm text-emerald-700 font-extrabold bg-white px-2.5 py-1 rounded-xl border border-emerald-200 shadow-2xs">
                        Điểm: {selectedProgress.lecturerScore} / 10
                      </span>
                    )}
                  </div>
                  {selectedProgress.lecturerComment && (
                    <div className="text-slate-800 leading-relaxed text-xs">
                      <strong>Nhận xét:</strong> {selectedProgress.lecturerComment}
                    </div>
                  )}
                </div>
              </div>
            )}

            <div className="flex justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-5 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* Create Progress Modal */}
      <Modal
        isOpen={createModalOpen}
        onClose={() => setCreateModalOpen(false)}
        title="Báo Cáo Tiến Độ Khóa Luận Tốt Nghiệp"
        maxWidth="max-w-xl"
      >
        <div className="space-y-4 text-xs">
          {formError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
              <span>{formError}</span>
            </div>
          )}

          {/* Type Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Loại báo cáo tiến độ <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setProgressType('WEEKLY')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                  progressType === 'WEEKLY'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Báo cáo Tuần (WEEKLY)
              </button>
              <button
                type="button"
                onClick={() => setProgressType('MONTHLY')}
                className={`py-2 px-3 rounded-xl border text-xs font-bold transition ${
                  progressType === 'MONTHLY'
                    ? 'bg-indigo-50 border-indigo-500 text-indigo-700 ring-2 ring-indigo-500/20'
                    : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                }`}
              >
                Báo cáo Tháng (MONTHLY)
              </button>
            </div>
          </div>

          {/* Number Selector */}
          <div className="grid grid-cols-2 gap-3">
            {progressType === 'WEEKLY' ? (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số thứ tự tuần (Tuần số) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="52"
                  value={weekNumber}
                  onChange={(e) => setWeekNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            ) : (
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số thứ tự tháng (Tháng số) <span className="text-rose-500">*</span>
                </label>
                <input
                  type="number"
                  min="1"
                  max="12"
                  value={monthNumber}
                  onChange={(e) => setMonthNumber(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            )}

            {/* Percentage */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Tỷ lệ hoàn thành đề tài: <strong>{completionPercentage}%</strong>
              </label>
              <input
                type="range"
                min="0"
                max="100"
                step="5"
                value={completionPercentage}
                onChange={(e) => setCompletionPercentage(e.target.value)}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer accent-indigo-600 mt-2"
              />
            </div>
          </div>

          {/* Title */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Tiêu đề báo cáo tiến độ <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="VD: Hoàn thành thiết kế cơ sở dữ liệu và API xác thực..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            />
          </div>

          {/* Description */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Nội dung công việc chi tiết <span className="text-rose-500">*</span>
            </label>
            <textarea
              rows={4}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Nêu các module đã code, các tài liệu đã viết, khó khăn gặp phải cần GVHD hỗ trợ..."
              className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
            />
          </div>

          {/* Real File Upload Selector */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tệp tài liệu / Báo cáo đính kèm (PDF, DOCX, XLSX, PPTX tối đa 15MB)
            </label>

            <input
              type="file"
              ref={fileInputRef}
              onChange={handleFileChange}
              accept=".pdf,.doc,.docx,.xls,.xlsx,.ppt,.pptx"
              className="hidden"
            />

            {!selectedFile ? (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="w-full py-4 border-2 border-dashed border-slate-200 hover:border-indigo-400 hover:bg-indigo-50/50 rounded-2xl text-center text-slate-500 transition flex flex-col items-center justify-center gap-1.5"
              >
                <Upload className="w-5 h-5 text-indigo-600" />
                <span className="font-semibold text-xs text-slate-700">
                  Nhấn để chọn tệp tài liệu báo cáo
                </span>
                <span className="text-[11px] text-slate-400">
                  Hỗ trợ định dạng .pdf, .docx, .doc, .xlsx, .pptx
                </span>
              </button>
            ) : (
              <div className="p-3.5 bg-indigo-50 border border-indigo-200 rounded-2xl flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center shrink-0">
                    <FileCheck className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <div className="font-bold text-slate-900 text-xs truncate">
                      {selectedFile.name}
                    </div>
                    <div className="text-[11px] text-indigo-600 font-mono">
                      {formatFileSize(selectedFile.size)}
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    className="px-2.5 py-1 bg-white hover:bg-slate-100 text-slate-700 border border-slate-200 rounded-lg text-xs font-semibold transition"
                  >
                    Chọn file khác
                  </button>
                  <button
                    type="button"
                    onClick={handleRemoveFile}
                    className="p-1.5 text-rose-600 hover:bg-rose-100 rounded-lg transition"
                    title="Xóa file"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setCreateModalOpen(false)}
              disabled={submitting}
              className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy
            </button>

            <button
              type="button"
              onClick={() => handleCreateProgress('DRAFT')}
              disabled={submitting}
              className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
            >
              Lưu bản nháp
            </button>

            <button
              type="button"
              onClick={() => handleCreateProgress('SUBMITTED')}
              disabled={submitting}
              className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-md shadow-indigo-200 transition disabled:opacity-50"
            >
              <Send className="w-3.5 h-3.5" />
              <span>{submitting ? 'Đang gửi...' : 'Nộp báo cáo ngay'}</span>
            </button>
          </div>
        </div>
      </Modal>
    </div>
  );
};

export default StudentThesisProgressPage;
