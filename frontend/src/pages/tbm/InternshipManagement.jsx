import React, { useState, useEffect, useCallback } from 'react';
import internshipApi from '../../api/internshipApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';

// Modals
import InternshipDetailModal from '../../components/internships/InternshipDetailModal';
import ApproveModal from '../../components/internships/ApproveModal';
import RejectModal from '../../components/internships/RejectModal';
import AssignLecturerModal from '../../components/internships/AssignLecturerModal';
import ExportModal from '../../components/common/ExportModal';
import InternshipTimelineModal from '../../components/internships/InternshipTimelineModal';
import UserNameClickable from '../../components/common/UserNameClickable';

import {
  Briefcase,
  Building2,
  Calendar,
  CheckCircle2,
  XCircle,
  BookOpen,
  Eye,
  RefreshCw,
  Clock,
  Filter,
  UserCheck,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ duyệt (PENDING)' },
  { value: 'APPROVED', label: 'Đã duyệt (APPROVED)' },
  { value: 'INTERNING', label: 'Đang thực tập (INTERNING)' },
  { value: 'COMPLETED', label: 'Đã hoàn thành (COMPLETED)' },
  { value: 'REJECTED', label: 'Đã từ chối (REJECTED)' },
  { value: 'CANCELLED', label: 'Đã hủy (CANCELLED)' },
];

const InternshipManagement = () => {
  const { currentTerm } = useAcademicTerm();
  const [internships, setInternships] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [approveModalOpen, setApproveModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [assignModalOpen, setAssignModalOpen] = useState(false);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);

  const { showToast } = useToast();

  const fetchInternships = useCallback(async () => {
    setLoading(true);
    try {
      const res = await internshipApi.getAll({
        page,
        limit: 10,
        search,
        status,
        academicTermId: currentTerm?._id || '',
      });

      if (res.success) {
        setInternships(res.data || []);
        setPagination(res.pagination || null);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách hồ sơ thực tập', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, status, currentTerm?._id, showToast]);

  useEffect(() => {
    fetchInternships();
  }, [fetchInternships]);

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

  // Get TTDN Window Badge for current term
  const getInternshipWindowBadge = () => {
    if (!currentTerm?.internship?.registrationStart && !currentTerm?.internship?.registrationEnd) {
      return { text: 'Mở tự do', color: 'bg-slate-100 text-slate-700' };
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = currentTerm?.internship?.registrationStart ? new Date(currentTerm.internship.registrationStart) : null;
    const end = currentTerm?.internship?.registrationEnd ? new Date(currentTerm.internship.registrationEnd) : null;
    if (end) end.setHours(23, 59, 59, 999);

    if (start && now < start) {
      return { text: 'Sắp mở', color: 'bg-amber-100 text-amber-800' };
    }
    if (end && now > end) {
      return { text: 'Đã đóng', color: 'bg-rose-100 text-rose-800' };
    }
    return { text: 'Đang mở', color: 'bg-emerald-100 text-emerald-800' };
  };

  const windowBadge = getInternshipWindowBadge();

  return (
    <div className="space-y-6">
      {/* Top Header Card */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center shrink-0 shadow-xs">
            <Briefcase className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Quản lý Thực tập Doanh nghiệp (TTDN)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Xét duyệt hồ sơ đăng ký thực tập của sinh viên, cấu hình mốc thời gian mở cổng và phân công GVHD
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2.5">
          {/* Configure Timeline Window Button */}
          <button
            type="button"
            onClick={() => setTimelineModalOpen(true)}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-bold text-indigo-700 hover:text-indigo-900 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 rounded-xl transition cursor-pointer shadow-2xs"
            title="Cấu hình thời gian mở cổng đăng ký & nộp báo cáo TTDN"
          >
            <Clock className="w-3.5 h-3.5 text-indigo-600" />
            <span>Thời gian mở TTDN</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${windowBadge.color}`}>
              {windowBadge.text}
            </span>
          </button>

          <button
            onClick={() => fetchInternships()}
            className="flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 hover:text-slate-900 bg-slate-100 hover:bg-slate-200 border border-slate-200 rounded-xl transition cursor-pointer"
            title="Làm mới danh sách"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span>Làm mới</span>
          </button>

          <button
            onClick={() => setExportModalOpen(true)}
            className="flex items-center gap-1.5 px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 shadow-sm shadow-emerald-600/20 rounded-xl transition cursor-pointer"
            title="Xuất danh sách sinh viên TTDN ra Excel"
          >
            <FileSpreadsheet className="w-3.5 h-3.5" />
            <span>Xuất danh sách</span>
          </button>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {/* Search Input */}
          <div className="lg:col-span-2">
            <SearchInput
              value={search}
              onChange={(val) => handleFilterChange(setSearch, val)}
              placeholder="Tìm theo MSSV, Tên SV, Doanh nghiệp, Vị trí..."
            />
          </div>

          {/* Status Filter */}
          <div>
            <select
              value={status}
              onChange={(e) => handleFilterChange(setStatus, e.target.value)}
              className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              {STATUS_FILTERS.map((f) => (
                <option key={f.value} value={f.value}>
                  {f.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={6} cols={7} />
          </div>
        ) : internships.length === 0 ? (
          <EmptyState
            title="Không tìm thấy hồ sơ thực tập"
            description="Không có hồ sơ nào phù hợp với bộ lọc hoặc từ khóa tìm kiếm."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-14">STT</th>
                  <th className="py-3.5 px-4">Sinh viên</th>
                  <th className="py-3.5 px-4">Doanh nghiệp</th>
                  <th className="py-3.5 px-4">Vị trí thực tập</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Giảng viên HD</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {internships.map((item, idx) => (
                  <tr
                    key={item._id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedInternship(item);
                      setDetailModalOpen(true);
                    }}
                  >
                    {/* STT */}
                    <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                      {(page - 1) * 10 + idx + 1}
                    </td>

                    {/* Student Info */}
                    <td className="py-3.5 px-4">
                      <UserNameClickable
                        user={item.studentId}
                        name={item.studentId?.userId?.fullName || 'Chưa cập nhật'}
                        subtitle={`${item.studentId?.studentCode} • ${item.studentId?.className || ''}`}
                        avatarSize="w-9 h-9"
                      />
                    </td>

                    {/* Company */}
                    <td className="py-3.5 px-4 font-medium text-slate-800 text-xs max-w-[180px] truncate">
                      <div className="font-semibold text-slate-900 truncate">
                        {item.companyId?.name}
                      </div>
                      {item.companyId?.code && (
                        <span className="font-mono text-[10px] text-slate-500 bg-slate-100 px-1 rounded">
                          {item.companyId?.code}
                        </span>
                      )}
                    </td>

                    {/* Position */}
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 max-w-[160px] truncate">
                      {item.position}
                    </td>

                    {/* Dates */}
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div>{formatDate(item.startDate)}</div>
                      <div className="text-slate-400 text-[11px]">đến {formatDate(item.endDate)}</div>
                    </td>

                    {/* Lecturer */}
                    <td className="py-3.5 px-4 text-xs">
                      {item.lecturerId ? (
                        <UserNameClickable
                          user={item.lecturerId}
                          name={`${item.lecturerId?.academicTitle ? item.lecturerId.academicTitle + ' ' : ''}${item.lecturerId?.userId?.fullName || 'Giảng viên'}`}
                          subtitle={item.lecturerId?.lecturerCode}
                          showAvatar={false}
                          className="font-semibold text-indigo-700 hover:underline"
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          <Clock className="w-3 h-3 text-amber-600" /> Chưa phân công
                        </span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      {item.status === 'COMPLETED' || item.evaluation?.status === 'CONFIRMED' ? (
                        <StatusBadge status="COMPLETED" size="sm" />
                      ) : (
                        <StatusBadge status={item.status} size="sm" />
                      )}
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 pr-6 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {/* Detail */}
                        <button
                          onClick={() => {
                            setSelectedInternship(item);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                          title="Xem chi tiết hồ sơ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Assign Lecturer (HIDE IF COMPLETED) */}
                        {item.status !== 'COMPLETED' && item.evaluation?.status !== 'CONFIRMED' && (
                          <button
                            onClick={() => {
                              setSelectedInternship(item);
                              setAssignModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition cursor-pointer"
                            title={item.lecturerId ? 'Đổi Giảng viên HD' : 'Phân công Giảng viên HD'}
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                        )}

                        {/* Approve (if PENDING) */}
                        {item.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedInternship(item);
                              setApproveModalOpen(true);
                            }}
                            className="p-1.5 text-emerald-600 hover:text-emerald-700 hover:bg-emerald-50 rounded-lg transition cursor-pointer"
                            title="Phê duyệt hồ sơ"
                          >
                            <CheckCircle2 className="w-4 h-4" />
                          </button>
                        )}

                        {/* Reject (if PENDING) */}
                        {item.status === 'PENDING' && (
                          <button
                            onClick={() => {
                              setSelectedInternship(item);
                              setRejectModalOpen(true);
                            }}
                            className="p-1.5 text-rose-600 hover:text-rose-700 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Từ chối hồ sơ"
                          >
                            <XCircle className="w-4 h-4" />
                          </button>
                        )}
                      </div>
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

      {/* Modals */}
      <InternshipDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedInternship(null);
        }}
        internship={selectedInternship}
        onApprove={(item) => {
          setDetailModalOpen(false);
          setSelectedInternship(item);
          setApproveModalOpen(true);
        }}
        onReject={(item) => {
          setDetailModalOpen(false);
          setSelectedInternship(item);
          setRejectModalOpen(true);
        }}
        onAssignLecturer={(item) => {
          setDetailModalOpen(false);
          setSelectedInternship(item);
          setAssignModalOpen(true);
        }}
      />

      <ApproveModal
        isOpen={approveModalOpen}
        onClose={() => {
          setApproveModalOpen(false);
          setSelectedInternship(null);
        }}
        internship={selectedInternship}
        onApproved={fetchInternships}
      />

      <RejectModal
        isOpen={rejectModalOpen}
        onClose={() => {
          setRejectModalOpen(false);
          setSelectedInternship(null);
        }}
        internship={selectedInternship}
        onRejected={fetchInternships}
      />

      <AssignLecturerModal
        isOpen={assignModalOpen}
        onClose={() => {
          setAssignModalOpen(false);
          setSelectedInternship(null);
        }}
        internship={selectedInternship}
        onAssigned={fetchInternships}
      />

      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Xuất danh sách sinh viên Thực tập Doanh nghiệp (TTDN)"
        type="INTERNSHIP"
        currentFilters={{ academicTermId: currentTerm?._id, status, search }}
        onExport={(params) => internshipApi.exportExcel(params)}
      />

      <InternshipTimelineModal
        isOpen={timelineModalOpen}
        onClose={() => setTimelineModalOpen(false)}
      />
    </div>
  );
};

export default InternshipManagement;
