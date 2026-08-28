import React, { useState, useEffect, useCallback } from 'react';
import reportApi from '../../api/reportApi';
import { useToast } from '../../context/ToastContext';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import LecturerReviewReportModal from '../../components/reports/LecturerReviewReportModal';

import {
  BookOpen,
  FileText,
  Award,
  CheckCircle2,
  RefreshCw,
  Eye,
  Filter,
  Paperclip,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'SUBMITTED', label: 'Chờ chấm (SUBMITTED)' },
  { value: 'APPROVED', label: 'Đã duyệt (APPROVED)' },
  { value: 'REJECTED', label: 'Yêu cầu sửa (REJECTED)' },
  { value: 'REVIEWING', label: 'Đang xem xét (REVIEWING)' },
];

const TYPE_OPTIONS = [
  { value: '', label: 'Tất cả loại báo cáo' },
  { value: 'WEEKLY', label: 'Báo cáo Tuần' },
  { value: 'MONTHLY', label: 'Báo cáo Tháng' },
  { value: 'FINAL', label: 'Báo cáo Tổng kết' },
];

const LecturerReportPage = () => {
  const [reports, setReports] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [reportType, setReportType] = useState('');
  const [page, setPage] = useState(1);

  // Modal
  const [selectedReport, setSelectedReport] = useState(null);
  const [reviewModalOpen, setReviewModalOpen] = useState(false);

  const { showToast } = useToast();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const res = await reportApi.getForLecturer({
        page,
        limit: 10,
        search,
        status,
        reportType,
      });

      if (res.success) {
        setReports(res.data || []);
        setPagination(res.pagination || null);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách báo cáo', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, reportType, showToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const handleFilterChange = (setter, val) => {
    setter(val);
    setPage(1);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2 text-violet-600 font-semibold text-xs tracking-wider uppercase">
            <BookOpen className="w-4 h-4" /> Đánh Giá & Chấm Điểm
          </div>
          <h2 className="text-xl font-bold text-slate-900 mt-1">
            Báo Cáo Thực Tập Sinh Viên Hướng Dẫn
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Xem xét tiến độ, chấm điểm và phản hồi các báo cáo định kỳ của sinh viên được phân công
          </p>
        </div>

        <button
          onClick={fetchReports}
          className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition self-start sm:self-center"
          title="Làm mới danh sách"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
        </button>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <SearchInput
              value={search}
              onChange={(val) => handleFilterChange(setSearch, val)}
              placeholder="Tìm theo MSSV, Tên SV, Tiêu đề báo cáo..."
            />
          </div>

          <div>
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
            >
              {STATUS_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div>
            <select
              value={reportType}
              onChange={(e) => handleFilterChange(setReportType, e.target.value)}
              className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-violet-500/20 focus:border-violet-500 transition"
            >
              {TYPE_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Reports Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={6} />
          </div>
        ) : reports.length === 0 ? (
          <EmptyState
            title="Chưa có báo cáo nào"
            description="Hiện không tìm thấy báo cáo nào của sinh viên phù hợp với bộ lọc hoặc sinh viên chưa nộp báo cáo."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 pl-6">Sinh viên</th>
                  <th className="py-3.5 px-4">Loại báo cáo</th>
                  <th className="py-3.5 px-4">Tiêu đề báo cáo</th>
                  <th className="py-3.5 px-4">Ngày nộp</th>
                  <th className="py-3.5 px-4">Điểm đã chấm</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {reports.map((report) => (
                  <tr
                    key={report._id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedReport(report);
                      setReviewModalOpen(true);
                    }}
                  >
                    {/* Student Info */}
                    <td className="py-3.5 px-4 pl-6">
                      <div className="font-semibold text-slate-900 text-xs">
                        {report.studentId?.userId?.fullName}
                      </div>
                      <div className="text-[11px] text-violet-700 font-mono">
                        MSSV: {report.studentId?.studentCode}
                      </div>
                    </td>

                    {/* Report Type */}
                    <td className="py-3.5 px-4">
                      <span className="text-[11px] font-bold px-2 py-0.5 rounded-md bg-violet-50 text-violet-700 border border-violet-200/60 font-mono">
                        {report.reportType === 'WEEKLY'
                          ? `Tuần ${report.weekNumber}`
                          : report.reportType === 'MONTHLY'
                          ? `Tháng ${report.monthNumber}`
                          : 'Tổng kết'}
                      </span>
                    </td>

                    {/* Title */}
                    <td className="py-3.5 px-4 max-w-xs">
                      <div className="font-semibold text-slate-900 text-xs truncate">
                        {report.title}
                      </div>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span className="text-[11px] text-slate-400 truncate">
                          {report.internshipId?.companyId?.name || 'Doanh nghiệp'}
                        </span>
                        {report.file?.originalName && (
                          <span className="inline-flex items-center gap-1 text-[10px] text-violet-700 font-semibold bg-violet-50 px-2 py-0.5 rounded-md truncate max-w-[130px]">
                            <Paperclip className="w-3 h-3 shrink-0" />
                            <span className="truncate">{report.file.originalName}</span>
                          </span>
                        )}
                      </div>
                    </td>

                    {/* Submitted At */}
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      {formatDate(report.submittedAt || report.createdAt)}
                    </td>

                    {/* Score */}
                    <td className="py-3.5 px-4 text-xs font-bold">
                      {report.lecturerScore !== null ? (
                        <span className="text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                          {report.lecturerScore} / 10
                        </span>
                      ) : (
                        <span className="text-amber-600 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200 text-[11px]">
                          Chưa chấm
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={report.status} size="sm" />
                    </td>

                    {/* Action */}
                    <td
                      className="py-3.5 px-4 pr-6 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        onClick={() => {
                          setSelectedReport(report);
                          setReviewModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition"
                      >
                        <Award className="w-3.5 h-3.5" />
                        <span>Chấm điểm</span>
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-4">
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      </div>

      {/* Review Modal */}
      <LecturerReviewReportModal
        isOpen={reviewModalOpen}
        onClose={() => {
          setReviewModalOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
        onReviewed={fetchReports}
      />
    </div>
  );
};

export default LecturerReportPage;
