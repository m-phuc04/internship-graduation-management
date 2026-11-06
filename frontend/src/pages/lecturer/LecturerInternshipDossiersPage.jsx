import React, { useState, useEffect, useCallback } from 'react';
import internshipApi from '../../api/internshipApi';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { useToast } from '../../context/ToastContext';
import SearchInput from '../../components/common/SearchInput';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import LecturerInternshipDetailModal from '../../components/lecturers/LecturerInternshipDetailModal';
import {
  FileText,
  Download,
  ExternalLink,
  CheckCircle2,
  Clock,
  Eye,
  Building2,
  Users,
  Search,
  Filter,
  AlertCircle,
  FileSpreadsheet,
} from 'lucide-react';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const formatDateVN = (dateStr) => {
  if (!dateStr) return '—';
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
};

const LecturerInternshipDossiersPage = () => {
  const { currentTerm } = useAcademicTerm();
  const { showToast } = useToast();

  const [internships, setInternships] = useState([]);
  const [stats, setStats] = useState(null);
  const [lecturerInfo, setLecturerInfo] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filters
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [statusFilter, setStatusFilter] = useState('ALL'); // 'ALL' | 'SUBMITTED' | 'MISSING'

  // Modal
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  const fetchDossiers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await internshipApi.getSupervised({
        academicTermId: currentTerm?._id || '',
        search,
        page,
        limit: 10,
      });

      if (res?.success) {
        setInternships(res.data || []);
        setPagination(res.pagination || null);
        setStats(res.stats || null);
        setLecturerInfo(res.lecturer || null);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách hồ sơ thực tập', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentTerm?._id, search, page, showToast]);

  useEffect(() => {
    fetchDossiers();
  }, [fetchDossiers]);

  // Client-side filter for submission status
  const filteredInternships = internships.filter((item) => {
    const hasFile = Boolean(item.reportFile?.fileUrl);
    if (statusFilter === 'SUBMITTED') return hasFile;
    if (statusFilter === 'MISSING') return !hasFile;
    return true;
  });

  // Calculate local dossier stats
  const totalStudents = internships.length;
  const submittedCount = internships.filter((i) => i.reportFile?.fileUrl).length;
  const missingCount = totalStudents - submittedCount;
  const submissionRate = totalStudents > 0 ? Math.round((submittedCount / totalStudents) * 100) : 0;

  return (
    <div className="space-y-6">
      {/* Top Banner Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0d2a75] via-[#123891] to-[#005BAA] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-200 shrink-0">
              <FileText className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  Hồ Sơ Thực Tập Doanh Nghiệp
                </h1>
                <span className="text-xs bg-blue-100 text-[#123891] font-bold px-2 py-0.5 rounded-full">
                  GVGS
                </span>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-2">
                <span>Giảng viên: <strong className="text-slate-800">{lecturerInfo?.academicTitle} {lecturerInfo?.userId?.fullName}</strong></span>
                <span>•</span>
                <span>Quản lý file báo cáo thực tập của các sinh viên đang hướng dẫn</span>
              </div>
            </div>
          </div>

          {/* Quick Metrics */}
          <div className="flex flex-wrap items-center gap-3">
            <div className="px-4 py-2.5 rounded-2xl bg-emerald-50 border border-emerald-200 text-emerald-800 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider">Đã nộp báo cáo</div>
              <div className="text-base font-extrabold text-emerald-700">
                {submittedCount} / {totalStudents} <span className="text-xs font-medium">({submissionRate}%)</span>
              </div>
            </div>
            <div className="px-4 py-2.5 rounded-2xl bg-amber-50 border border-amber-200 text-amber-800 text-right">
              <div className="text-[10px] font-bold uppercase tracking-wider">Chưa nộp</div>
              <div className="text-base font-extrabold text-amber-700">
                {missingCount} <span className="text-xs font-medium">SV</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-80">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Tìm theo MSSV, tên SV, doanh nghiệp..."
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <span className="text-xs font-semibold text-slate-600">Trạng thái hồ sơ:</span>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-1.5 text-xs font-bold text-slate-700 bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123891]/20 cursor-pointer"
          >
            <option value="ALL">Tất cả ({totalStudents})</option>
            <option value="SUBMITTED">Đã nộp báo cáo ({submittedCount})</option>
            <option value="MISSING">Chưa nộp báo cáo ({missingCount})</option>
          </select>
        </div>
      </div>

      {/* Dossiers Table */}
      <div className="rounded-3xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} />
          </div>
        ) : filteredInternships.length === 0 ? (
          <div className="p-12 text-center">
            <EmptyState
              icon={FileText}
              title="Không có hồ sơ báo cáo nào"
              description={
                search || statusFilter !== 'ALL'
                  ? 'Không tìm thấy sinh viên thực tập nào khớp với bộ lọc hiện tại.'
                  : 'Chưa có sinh viên nào trong danh sách giám sát của bạn.'
              }
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-slate-500 font-semibold uppercase tracking-wider text-[11px]">
                  <th className="py-3.5 px-4 pl-6">Sinh viên</th>
                  <th className="py-3.5 px-4">Doanh nghiệp & Vị trí</th>
                  <th className="py-3.5 px-4 text-center">Thời lượng</th>
                  <th className="py-3.5 px-4">File Báo Cáo Thực Tập</th>
                  <th className="py-3.5 px-4">Thời Gian Nộp</th>
                  <th className="py-3.5 px-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
                {filteredInternships.map((item) => {
                  const hasFile = Boolean(item.reportFile?.fileUrl);
                  const file = item.reportFile;

                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-blue-50/30 transition-colors duration-150"
                    >
                      {/* Student info */}
                      <td className="py-3.5 px-4 pl-6">
                        <div className="flex items-center gap-3">
                          <div className="w-9 h-9 rounded-xl bg-blue-50 border border-blue-100 text-[#123891] font-bold text-xs flex items-center justify-center shrink-0">
                            {item.studentId?.userId?.fullName?.charAt(0).toUpperCase() || 'S'}
                          </div>
                          <div>
                            <div className="font-bold text-slate-900">
                              {item.studentId?.userId?.fullName || '—'}
                            </div>
                            <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2">
                              <span>MSSV: {item.studentId?.studentCode}</span>
                              <span>•</span>
                              <span>{item.studentId?.className}</span>
                            </div>
                          </div>
                        </div>
                      </td>

                      {/* Company & Position */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-800 truncate max-w-xs">
                          {item.companyId?.name || '—'}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate max-w-xs flex items-center gap-1 mt-0.5">
                          <Building2 className="w-3 h-3 text-slate-400" />
                          <span>{item.position}</span>
                        </div>
                      </td>

                      {/* Duration */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="inline-flex items-center px-2 py-0.5 rounded-md font-bold text-[11px] bg-indigo-50 text-indigo-700 border border-indigo-200">
                          {item.durationInWeeks || 12} tuần
                        </span>
                      </td>

                      {/* Report File Status */}
                      <td className="py-3.5 px-4">
                        {hasFile ? (
                          <div className="space-y-1">
                            <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                              <span>Đã nộp báo cáo</span>
                            </span>
                            <div className="text-[11px] text-slate-600 font-mono truncate max-w-xs flex items-center gap-1.5" title={file.originalName}>
                              <FileText className="w-3.5 h-3.5 text-rose-500 shrink-0" />
                              <span className="truncate">{file.originalName || file.fileName}</span>
                              <span className="text-slate-400 font-normal">({formatFileSize(file.fileSize)})</span>
                            </div>
                          </div>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3.5 h-3.5 text-amber-500" />
                            <span>Chưa nộp file báo cáo</span>
                          </span>
                        )}
                      </td>

                      {/* Upload Date */}
                      <td className="py-3.5 px-4 text-xs text-slate-500">
                        {hasFile && file?.uploadedAt ? (
                          <span>{formatDateVN(file.uploadedAt)}</span>
                        ) : (
                          <span className="text-slate-400">—</span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {hasFile && (
                            <a
                              href={file.fileUrl}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition cursor-pointer border border-emerald-200"
                              title="Mở hoặc tải file báo cáo để kiểm tra"
                            >
                              <ExternalLink className="w-3.5 h-3.5" />
                              <span>Mở file</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedInternship(item);
                              setDetailModalOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#102d7d] bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
                            title="Xem chi tiết hồ sơ thực tập"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* Pagination */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-4">
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      </div>

      {/* Detail Modal */}
      <LecturerInternshipDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedInternship(null);
        }}
        internship={selectedInternship}
      />
    </div>
  );
};

export default LecturerInternshipDossiersPage;

