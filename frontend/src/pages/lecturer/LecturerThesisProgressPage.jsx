import React, { useState, useEffect, useCallback, useMemo } from 'react';
import thesisProgressApi from '../../api/thesisProgressApi';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import getFileUrl from '../../utils/fileUrlHelper';

import {
  GraduationCap,
  Users,
  User,
  BookOpen,
  CheckCircle2,
  XCircle,
  Clock,
  Award,
  Paperclip,
  Eye,
  RefreshCw,
  Percent,
  Search,
  Filter,
  Check,
  ExternalLink,
  Download,
  FileCheck,
  ChevronLeft,
  ChevronRight,
  AlertCircle,
  FileText,
} from 'lucide-react';

const LecturerThesisProgressPage = () => {
  const [theses, setTheses] = useState([]);
  const [selectedThesisId, setSelectedThesisId] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchTerm, setSearchTerm] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const pageSize = 8;
  const [loading, setLoading] = useState(true);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedDetail, setSelectedDetail] = useState(null);

  // Review Modal
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState(null);
  const [lecturerScore, setLecturerScore] = useState('');
  const [lecturerComment, setLecturerComment] = useState('');
  const [reviewStatus, setReviewStatus] = useState('APPROVED');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  const { showToast } = useToast();

  const fetchSupervisedProgress = useCallback(async () => {
    setLoading(true);
    try {
      const res = await thesisProgressApi.getSupervisedTheses();
      if (res.success) {
        setTheses(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách đề tài hướng dẫn', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSupervisedProgress();
  }, [fetchSupervisedProgress]);

  // Flatten and enrich all reports with parent thesis information
  const allReports = useMemo(() => {
    const reports = [];
    theses.forEach((t) => {
      (t.progressReports || []).forEach((p) => {
        reports.push({
          ...p,
          thesisTitle: t.thesisTitle,
          thesisDescription: t.description,
          thesisId: t._id,
          supervisorInfo: t.supervisorId,
          parentThesis: t,
        });
      });
    });
    return reports;
  }, [theses]);

  // Filter & Search
  const filteredReports = useMemo(() => {
    return allReports.filter((item) => {
      // Thesis Filter
      if (selectedThesisId !== 'ALL' && item.thesisId !== selectedThesisId) {
        return false;
      }
      // Status Filter
      if (statusFilter !== 'ALL' && item.status !== statusFilter) {
        return false;
      }
      // Search term (MSSV, Student Name, Thesis Title, Progress Title)
      if (searchTerm.trim()) {
        const term = searchTerm.toLowerCase().trim();
        const studentName = item.studentId?.userId?.fullName?.toLowerCase() || '';
        const studentCode = item.studentId?.studentCode?.toLowerCase() || '';
        const thesisTitle = item.thesisTitle?.toLowerCase() || '';
        const progressTitle = item.title?.toLowerCase() || '';

        const match =
          studentName.includes(term) ||
          studentCode.includes(term) ||
          thesisTitle.includes(term) ||
          progressTitle.includes(term);

        if (!match) return false;
      }
      return true;
    });
  }, [allReports, selectedThesisId, statusFilter, searchTerm]);

  // Pagination calculation
  const totalPages = Math.max(1, Math.ceil(filteredReports.length / pageSize));
  const paginatedReports = useMemo(() => {
    const start = (currentPage - 1) * pageSize;
    return filteredReports.slice(start, start + pageSize);
  }, [filteredReports, currentPage, pageSize]);

  // Reset page to 1 only when search or filters change
  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
    setCurrentPage(1);
  };

  const handleThesisFilterChange = (e) => {
    setSelectedThesisId(e.target.value);
    setCurrentPage(1);
  };

  const handleStatusFilterChange = (e) => {
    setStatusFilter(e.target.value);
    setCurrentPage(1);
  };

  // Open Detail Modal
  const handleOpenDetail = (report) => {
    setSelectedDetail(report);
    setDetailModalOpen(true);
  };

  // Open Review Modal
  const handleOpenReview = (report) => {
    setSelectedProgress(report);
    setLecturerScore(report.lecturerScore !== null ? report.lecturerScore : '');
    setLecturerComment(report.lecturerComment || '');
    setReviewStatus(
      ['APPROVED', 'REJECTED', 'REVIEWING'].includes(report.status)
        ? report.status
        : 'APPROVED',
    );
    setFormError('');
    setReviewModalOpen(true);
  };

  // Submit Review
  const handleSubmitReview = async () => {
    setFormError('');

    if (reviewStatus === 'REJECTED' && !lecturerComment.trim()) {
      setFormError('Vui lòng nhập nhận xét / lý do khi từ chối tiến độ của sinh viên');
      return;
    }

    if (lecturerScore !== '') {
      const num = Number(lecturerScore);
      if (isNaN(num) || num < 0 || num > 10) {
        setFormError('Điểm đánh giá phải là số từ 0 đến 10');
        return;
      }
    }

    setSubmitting(true);
    try {
      const payload = {
        status: reviewStatus,
        lecturerScore: lecturerScore !== '' ? Number(lecturerScore) : null,
        lecturerComment: lecturerComment.trim() || null,
      };

      const res = await thesisProgressApi.reviewProgress(
        selectedProgress._id,
        payload,
      );

      if (res.success) {
        showToast('Đánh giá tiến độ thành công!', 'success');
        setReviewModalOpen(false);
        fetchSupervisedProgress();
      }
    } catch (err) {
      setFormError(err.message || 'Đánh giá tiến độ thất bại');
    } finally {
      setSubmitting(false);
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

  const formatFileSize = (bytes) => {
    if (!bytes || bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  // Total stats
  const totalReportsCount = theses.reduce(
    (acc, t) => acc + (t.progressReports?.length || 0),
    0,
  );
  const pendingReportsCount = theses.reduce(
    (acc, t) => acc + (t.stats?.pending || 0),
    0,
  );
  const approvedReportsCount = theses.reduce(
    (acc, t) => acc + (t.stats?.approved || 0),
    0,
  );

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-200 shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  Theo Dõi & Đánh Giá Tiến Độ KLTN
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Giảng viên hướng dẫn (GVHD) theo dõi, xem chi tiết báo cáo & file đính kèm, đánh giá và duyệt tiến độ của sinh viên.
              </p>
            </div>
          </div>

          <button
            onClick={fetchSupervisedProgress}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] text-slate-500 font-medium">Đề tài đang hướng dẫn</div>
            <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{theses.length}</div>
          </div>

          <div className="p-3 rounded-2xl bg-indigo-50/80 border border-indigo-200/80">
            <div className="text-[11px] text-indigo-700 font-medium">Tổng báo cáo tiến độ</div>
            <div className="text-lg font-bold text-indigo-700 font-mono mt-0.5">{totalReportsCount}</div>
          </div>

          <div className="p-3 rounded-2xl bg-amber-50/80 border border-amber-200/80">
            <div className="text-[11px] text-amber-700 font-medium">Chờ GVHD đánh giá</div>
            <div className="text-lg font-bold text-amber-700 font-mono mt-0.5">{pendingReportsCount}</div>
          </div>

          <div className="p-3 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
            <div className="text-[11px] text-emerald-700 font-medium">Đã phê duyệt</div>
            <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{approvedReportsCount}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-3">
        {/* Search */}
        <div className="relative w-full md:w-80">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchTerm}
            onChange={handleSearchChange}
            placeholder="Tìm theo MSSV, tên SV, đề tài..."
            className="w-full pl-9 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          />
        </div>

        {/* Dropdowns */}
        <div className="flex flex-wrap items-center gap-2.5 w-full md:w-auto">
          {/* Thesis filter */}
          <div className="flex items-center gap-1.5">
            <Filter className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            <select
              value={selectedThesisId}
              onChange={handleThesisFilterChange}
              className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition max-w-[200px] truncate"
            >
              <option value="ALL">Tất cả đề tài ({theses.length})</option>
              {theses.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.thesisTitle}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <select
            value={statusFilter}
            onChange={handleStatusFilterChange}
            className="px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="SUBMITTED">Chờ duyệt (SUBMITTED)</option>
            <option value="REVIEWING">Đang xem xét (REVIEWING)</option>
            <option value="APPROVED">Đã duyệt (APPROVED)</option>
            <option value="REJECTED">Từ chối (REJECTED)</option>
          </select>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={5} />
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Không tìm thấy báo cáo tiến độ phù hợp"
              description="Chưa có báo cáo nào khớp với tiêu chí tìm kiếm hoặc sinh viên chưa nộp báo cáo."
            />
          </div>
        ) : (
          <div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4">Kỳ báo cáo</th>
                    <th className="py-3.5 px-4">Sinh viên nộp</th>
                    <th className="py-3.5 px-4">Tiêu đề & Đề tài KLTN</th>
                    <th className="py-3.5 px-4">Tiến độ (%)</th>
                    <th className="py-3.5 px-4">File báo cáo</th>
                    <th className="py-3.5 px-4">Điểm / Nhận xét</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedReports.map((item) => {
                    const isPending = ['SUBMITTED', 'REVIEWING'].includes(item.status);
                    const hasFile = item.file && (item.file.fileUrl || item.file.fileName);

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition">
                        {/* Period Badge */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-bold text-[11px] px-2.5 py-1 rounded-xl bg-violet-50 text-violet-700 border border-violet-200">
                            {item.progressType === 'WEEKLY'
                              ? `Tuần ${item.weekNumber}`
                              : `Tháng ${item.monthNumber}`}
                          </span>
                        </td>

                        {/* Student */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {item.studentId?.userId?.fullName || 'Sinh viên'}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono">
                            MSSV: {item.studentId?.studentCode || '—'}
                          </div>
                        </td>

                        {/* Title & Thesis */}
                        <td className="py-3.5 px-4 max-w-xs">
                          <strong className="text-slate-900 line-clamp-1">{item.title}</strong>
                          <div className="text-[10px] text-slate-400 line-clamp-1 mt-0.5">
                            {item.thesisTitle}
                          </div>
                        </td>

                        {/* Completion % */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                            {item.completionPercentage}%
                          </span>
                        </td>

                        {/* File */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {hasFile ? (
                            <div className="flex items-center gap-1.5">
                              <a
                                href={getFileUrl(item.file.fileUrl)}
                                target="_blank"
                                rel="noreferrer"
                                className="inline-flex items-center gap-1 text-indigo-600 hover:text-indigo-800 hover:underline max-w-[130px] truncate font-medium"
                                title={item.file.originalName || item.file.fileName}
                              >
                                <Paperclip className="w-3.5 h-3.5 shrink-0" />
                                <span className="truncate">
                                  {item.file.originalName || item.file.fileName}
                                </span>
                              </a>
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Chưa có file</span>
                          )}
                        </td>

                        {/* Score & Comment */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.lecturerScore !== null ? (
                            <span className="font-mono font-extrabold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                              {item.lecturerScore}/10
                            </span>
                          ) : (
                            <span className="text-slate-400 italic">Chưa chấm</span>
                          )}
                        </td>

                        {/* Status */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <StatusBadge status={item.status} size="sm" />
                        </td>

                        {/* Actions */}
                        <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition text-[11px]"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>

                          <button
                            type="button"
                            onClick={() => handleOpenReview(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-xs transition text-[11px]"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            <span>{isPending ? 'Đánh giá' : 'Sửa đánh giá'}</span>
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Pagination Controls */}
            <div className="p-4 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <div>
                Hiển thị{' '}
                <strong>
                  {Math.min((currentPage - 1) * pageSize + 1, filteredReports.length)} -{' '}
                  {Math.min(currentPage * pageSize, filteredReports.length)}
                </strong>{' '}
                trên <strong>{filteredReports.length}</strong> báo cáo
              </div>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage === 1}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Trang trước"
                >
                  <ChevronLeft className="w-4 h-4" />
                </button>

                <span className="font-semibold text-slate-700 px-2">
                  Trang {currentPage} / {totalPages}
                </span>

                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage === totalPages}
                  className="p-2 rounded-xl border border-slate-200 hover:bg-slate-50 text-slate-700 disabled:opacity-40 disabled:cursor-not-allowed transition"
                  title="Trang sau"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* 1. Detail Modal (4 Comprehensive Sections) */}
      {detailModalOpen && selectedDetail && (
        <Modal
          isOpen={detailModalOpen}
          onClose={() => setDetailModalOpen(false)}
          title="Chi Tiết Báo Cáo Tiến Độ & Tài Liệu KLTN"
          maxWidth="max-w-2xl"
        >
          <div className="space-y-4 text-xs">
            {/* Section 1: Thông tin sinh viên */}
            <div className="p-3.5 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                1. Thông tin sinh viên thực hiện
              </div>
              <div className="grid grid-cols-2 gap-2 text-xs">
                <div>
                  <span className="text-slate-500">Họ và tên: </span>
                  <strong className="text-slate-900">
                    {selectedDetail.studentId?.userId?.fullName || '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">MSSV: </span>
                  <strong className="font-mono text-slate-900">
                    {selectedDetail.studentId?.studentCode || '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Lớp: </span>
                  <strong className="text-slate-900">
                    {selectedDetail.studentId?.className || '—'}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-500">Email: </span>
                  <span className="font-mono text-slate-700">
                    {selectedDetail.studentId?.userId?.email || '—'}
                  </span>
                </div>
              </div>
            </div>

            {/* Section 2: Thông tin đề tài */}
            <div className="p-3.5 bg-indigo-50/60 rounded-2xl border border-indigo-100 space-y-1">
              <div className="text-[10px] font-bold text-indigo-400 uppercase tracking-wider">
                2. Thông tin đề tài Khóa Luận
              </div>
              <div className="text-xs">
                <div className="font-bold text-slate-900 text-sm">
                  {selectedDetail.thesisTitle}
                </div>
                {selectedDetail.thesisDescription && (
                  <div className="text-slate-600 text-xs mt-1 leading-relaxed">
                    {selectedDetail.thesisDescription}
                  </div>
                )}
                {selectedDetail.supervisorInfo && (
                  <div className="text-[11px] text-indigo-700 font-semibold mt-1">
                    GVHD: {selectedDetail.supervisorInfo.academicTitle} {selectedDetail.supervisorInfo.userId?.fullName}
                  </div>
                )}
              </div>
            </div>

            {/* Section 3: Thông tin tiến độ */}
            <div className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
              <div className="flex items-center justify-between border-b border-slate-100 pb-2">
                <div className="flex items-center gap-2">
                  <span className="px-2.5 py-1 rounded-xl bg-violet-600 text-white font-bold text-xs">
                    {selectedDetail.progressType === 'WEEKLY'
                      ? `Tuần ${selectedDetail.weekNumber}`
                      : `Tháng ${selectedDetail.monthNumber}`}
                  </span>
                  <h4 className="font-bold text-sm text-slate-900">
                    {selectedDetail.title}
                  </h4>
                </div>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                    {selectedDetail.completionPercentage}%
                  </span>
                  <StatusBadge status={selectedDetail.status} size="sm" />
                </div>
              </div>

              <div className="text-slate-800 leading-relaxed whitespace-pre-wrap text-xs pt-1">
                {selectedDetail.description}
              </div>

              <div className="text-[11px] text-slate-400 pt-2 border-t border-slate-100">
                Ngày nộp: <strong>{formatDate(selectedDetail.submittedAt || selectedDetail.createdAt)}</strong>
              </div>
            </div>

            {/* Section 4: File báo cáo đính kèm */}
            <div>
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1.5">
                4. Tài liệu / File báo cáo đính kèm
              </div>
              {selectedDetail.file && (selectedDetail.file.fileUrl || selectedDetail.file.fileName) ? (
                <div className="p-3.5 bg-violet-50/70 border border-violet-200 rounded-2xl flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2.5 min-w-0">
                    <div className="w-9 h-9 rounded-xl bg-violet-600 text-white flex items-center justify-center shrink-0">
                      <FileCheck className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900 text-xs truncate">
                        {selectedDetail.file.originalName || selectedDetail.file.fileName}
                      </div>
                      <div className="text-slate-500 text-[10px] font-mono">
                        {selectedDetail.file.mimeType || 'Document'} • {formatFileSize(selectedDetail.file.size)}
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <a
                      href={getFileUrl(selectedDetail.file.fileUrl)}
                      target="_blank"
                      rel="noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-violet-600 hover:text-white border border-violet-200 text-violet-700 rounded-xl text-xs font-semibold transition shadow-xs"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>Xem file</span>
                    </a>
                    <a
                      href={getFileUrl(selectedDetail.file.fileUrl)}
                      download={selectedDetail.file.originalName || selectedDetail.file.fileName}
                      className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-violet-600 hover:bg-violet-700 text-white rounded-xl text-xs font-bold transition shadow-xs"
                    >
                      <Download className="w-3.5 h-3.5" />
                      <span>Tải về</span>
                    </a>
                  </div>
                </div>
              ) : (
                <div className="p-3 rounded-2xl bg-slate-50 border border-slate-200 text-slate-400 italic">
                  Sinh viên không đính kèm file cho tiến độ này
                </div>
              )}
            </div>

            {/* Existing Review if evaluated */}
            {(selectedDetail.lecturerComment || selectedDetail.lecturerScore !== null) && (
              <div
                className={`p-3.5 rounded-2xl border text-xs space-y-1.5 ${
                  selectedDetail.status === 'APPROVED'
                    ? 'bg-emerald-50/70 border-emerald-200'
                    : selectedDetail.status === 'REJECTED'
                    ? 'bg-rose-50/70 border-rose-200'
                    : 'bg-slate-50 border-slate-200'
                }`}
              >
                <div className="flex items-center justify-between font-bold">
                  <span className="text-slate-800">
                    Đánh giá của GVHD ({formatDate(selectedDetail.reviewedAt)})
                  </span>
                  {selectedDetail.lecturerScore !== null && (
                    <span className="font-mono text-xs text-emerald-700 font-extrabold bg-white px-2 py-0.5 rounded border border-emerald-200">
                      Điểm: {selectedDetail.lecturerScore}/10
                    </span>
                  )}
                </div>
                {selectedDetail.lecturerComment && (
                  <p className="text-slate-800 leading-relaxed text-xs">
                    <strong>Nhận xét:</strong> {selectedDetail.lecturerComment}
                  </p>
                )}
              </div>
            )}

            {/* Modal Footer */}
            <div className="flex items-center justify-between pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Đóng
              </button>

              <button
                type="button"
                onClick={() => {
                  setDetailModalOpen(false);
                  handleOpenReview(selectedDetail);
                }}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-md shadow-violet-200 transition"
              >
                <CheckCircle2 className="w-3.5 h-3.5" />
                <span>Mở form đánh giá</span>
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* 2. Review Modal */}
      {reviewModalOpen && selectedProgress && (
        <Modal
          isOpen={reviewModalOpen}
          onClose={() => setReviewModalOpen(false)}
          title="Đánh Giá & Phê Duyệt Tiến Độ Khóa Luận"
          maxWidth="max-w-xl"
        >
          <div className="space-y-4 text-xs">
            {/* Submission preview */}
            <div className="p-3.5 rounded-2xl bg-violet-50/60 border border-violet-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-violet-900 text-xs">
                  {selectedProgress.progressType === 'WEEKLY'
                    ? `Báo cáo Tuần ${selectedProgress.weekNumber}`
                    : `Báo cáo Tháng ${selectedProgress.monthNumber}`}
                  : "{selectedProgress.title}"
                </span>
                <span className="font-mono font-bold text-indigo-700">
                  {selectedProgress.completionPercentage}%
                </span>
              </div>
              <div className="text-[11px] text-slate-500">
                Sinh viên: <strong>{selectedProgress.studentId?.userId?.fullName}</strong> (MSSV: {selectedProgress.studentId?.studentCode})
              </div>

              {/* Quick file view in review modal */}
              {selectedProgress.file && (selectedProgress.file.fileUrl || selectedProgress.file.fileName) && (
                <div className="flex items-center justify-between bg-white p-2 rounded-xl border border-violet-100 mt-1">
                  <div className="flex items-center gap-2 text-indigo-700 truncate">
                    <Paperclip className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">
                      {selectedProgress.file.originalName || selectedProgress.file.fileName}
                    </span>
                  </div>
                  <a
                    href={getFileUrl(selectedProgress.file.fileUrl)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 text-[11px] text-indigo-600 hover:text-indigo-800 font-bold shrink-0 ml-2"
                  >
                    <ExternalLink className="w-3 h-3" />
                    <span>Mở file</span>
                  </a>
                </div>
              )}
            </div>

            {formError && (
              <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 flex items-center gap-2">
                <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
                <span>{formError}</span>
              </div>
            )}

            {/* Score & Status Inputs */}
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Điểm đánh giá tiến độ (0 - 10)
                </label>
                <input
                  type="number"
                  min="0"
                  max="10"
                  step="0.5"
                  value={lecturerScore}
                  onChange={(e) => setLecturerScore(e.target.value)}
                  placeholder="VD: 9.0"
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-mono font-bold text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Trạng thái đánh giá <span className="text-rose-500">*</span>
                </label>
                <select
                  value={reviewStatus}
                  onChange={(e) => setReviewStatus(e.target.value)}
                  className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                >
                  <option value="APPROVED">Phê duyệt (APPROVED)</option>
                  <option value="REVIEWING">Đang xem xét (REVIEWING)</option>
                  <option value="REJECTED">Từ chối (REJECTED)</option>
                </select>
              </div>
            </div>

            {/* Comment */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Nhận xét của Giảng viên {reviewStatus === 'REJECTED' && <span className="text-rose-500">* (Bắt buộc khi từ chối)</span>}
              </label>
              <textarea
                rows={3}
                value={lecturerComment}
                onChange={(e) => setLecturerComment(e.target.value)}
                placeholder={
                  reviewStatus === 'REJECTED'
                    ? 'Nêu rõ lý do từ chối và nội dung sinh viên cần bổ sung...'
                    : 'Nhập nhận xét, hướng dẫn chỉnh sửa cho sinh viên...'
                }
                className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
              />
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setReviewModalOpen(false)}
                disabled={submitting}
                className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy
              </button>

              <button
                type="button"
                onClick={handleSubmitReview}
                disabled={submitting}
                className="inline-flex items-center gap-1.5 px-5 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold rounded-xl shadow-md shadow-violet-200 transition disabled:opacity-50"
              >
                <Check className="w-3.5 h-3.5" />
                <span>{submitting ? 'Đang lưu...' : 'Lưu đánh giá'}</span>
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default LecturerThesisProgressPage;
