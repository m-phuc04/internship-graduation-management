import React, { useState, useEffect, useCallback } from 'react';
import internshipApi from '../../api/internshipApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';

// Modal xử lýs
import InternshipDetailModal from '../../components/internships/InternshipDetailModal';
import ApproveModal from '../../components/internships/ApproveModal';
import RejectModal from '../../components/internships/RejectModal';
import AssignLecturerModal from '../../components/internships/AssignLecturerModal';
import ExportModal from '../../components/common/ExportModal';
import InternshipTimelineModal from '../../components/internships/InternshipTimelineModal';
import UserNameClickable from '../../components/common/UserNameClickable';

import {
  Briefcase,
  CheckCircle2,
  XCircle,
  BookOpen,
  Eye,
  Clock,
  FileSpreadsheet,
} from 'lucide-react';

const STATUS_FILTERS = [
  { value: '', label: 'Tất cả trạng thái' },
  { value: 'PENDING', label: 'Chờ duyệt' },
  { value: 'APPROVED', label: 'Đã duyệt' },
  { value: 'INTERNING', label: 'Đang thực tập' },
  { value: 'COMPLETED', label: 'Đã hoàn thành' },
  { value: 'CANCELLED', label: 'Đã hủy' },
  { value: 'REJECTED', label: 'Đã từ chối' },
];
const STATUS_OPTIONS = STATUS_FILTERS;

const InternshipManagement = () => {
  const { currentTerm, terms, setCurrentTerm } = useAcademicTerm();
  const isActiveTerm = currentTerm?.status === 'ACTIVE';
  const [internships, setInternships] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Trạng thái lọc và tìm kiếm
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('');
  const [page, setPage] = useState(1);

  // Trạng thái các Modal
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

  // Lấy huy hiệu thời hạn đăng ký TTDN trong học kỳ
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
      {/* Thẻ tiêu đề đầu trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 p-4 sm:p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-[#123891] text-white flex items-center justify-center shrink-0 shadow-xs">
            <Briefcase className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-snug">
              Quản lý Thực tập Doanh nghiệp (TTDN)
            </h1>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full sm:w-auto justify-start sm:justify-end">
          {/* Nút cấu hình khung thời gian */}
          <button
            type="button"
            onClick={() => setTimelineModalOpen(true)}
            className="flex items-center justify-center sm:justify-start gap-1.5 px-3.5 py-2 text-xs font-bold text-[#102d7d] hover:text-[#123891] bg-blue-50 hover:bg-blue-100 border border-blue-200 rounded-xl transition cursor-pointer shadow-2xs w-full sm:w-auto shrink-0"
            title="Cấu hình thời gian mở cổng đăng ký & nộp báo cáo TTDN"
          >
            <Clock className="w-3.5 h-3.5 text-[#123891] shrink-0" />
            <span>Thời gian mở TTDN</span>
            <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${windowBadge.color} shrink-0`}>
              {windowBadge.text}
            </span>
          </button>

          <button
            type="button"
            onClick={() => setExportModalOpen(true)}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-white hover:bg-slate-50 text-slate-700 hover:text-slate-900 border border-slate-200 text-xs font-bold rounded-xl shadow-2xs transition cursor-pointer shrink-0"
            title="Xuất danh sách sinh viên TTDN ra Excel"
            aria-label="Xuất danh sách"
          >
            <FileSpreadsheet className="w-4 h-4 shrink-0" />
            <span>Xuất file</span>
          </button>
        </div>
      </div>

      {/* Thanh tìm kiếm và bộ lọc */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="w-full md:w-96">
          <SearchInput
            value={search}
            onChange={(val) => handleFilterChange(setSearch, val)}
            placeholder="Tìm theo MSSV, Tên SV, Doanh nghiệp, Vị trí..."
          />
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 w-full md:w-auto justify-start md:justify-end">
          {/* Bộ lọc theo trạng thái */}
          <select
            value={status}
            onChange={(e) => handleFilterChange(setStatus, e.target.value)}
            className="w-full sm:w-auto min-w-[180px] py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
          >
            {STATUS_FILTERS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      {/* Bảng chính */}
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
        ) : (<>
          <div className="hidden md:block overflow-x-auto">
            <table className="w-full text-left border-collapse min-w-[780px]">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-14">STT</th>
                  <th className="py-3.5 px-4">Sinh viên</th>
                  <th className="py-3.5 px-4">Doanh nghiệp</th>
                  <th className="py-3.5 px-4">Vị trí thực tập</th>
                  <th className="py-3.5 px-4">Thời gian</th>
                  <th className="py-3.5 px-4">Giảng viên Giám sát</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 pr-6 text-right"></th>
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

                    {/* Thông tin sinh viên */}
                    <td className="py-3.5 px-4">
                      <UserNameClickable
                        user={item.studentId}
                        name={item.studentId?.userId?.fullName || 'Chưa cập nhật'}
                        subtitle={`${item.studentId?.studentCode} • ${item.studentId?.className || ''}`}
                        showAvatar={false}
                      />
                    </td>

                    {/* Doanh nghiệp */}
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

                    {/* Vị trí thực tập */}
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 max-w-[160px] truncate">
                      {item.position}
                    </td>

                    {/* Thời gian */}
                    <td className="py-3.5 px-4 text-xs text-slate-600">
                      <div>{formatDate(item.startDate)}</div>
                      <div className="text-slate-400 text-[11px]">đến {formatDate(item.endDate)}</div>
                    </td>

                    {/* Giảng viên */}
                    <td className="py-3.5 px-4 text-xs">
                      {item.lecturerId ? (
                        <UserNameClickable
                          user={item.lecturerId}
                          name={`${item.lecturerId?.academicTitle ? item.lecturerId.academicTitle + ' ' : ''}${item.lecturerId?.userId?.fullName || 'Giảng viên'}`}
                          subtitle={item.lecturerId?.userId?.email || ''}
                          showAvatar={false}
                          className="font-semibold text-[#102d7d] hover:underline"
                        />
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200/60">
                          <Clock className="w-3 h-3 text-amber-600" /> Chưa phân công
                        </span>
                      )}
                    </td>

                    {/* Trạng thái */}
                    <td className="py-3.5 px-4">
                      {item.status === 'COMPLETED' || item.evaluation?.status === 'CONFIRMED' ? (
                        <StatusBadge status="COMPLETED" size="sm" />
                      ) : (
                        <StatusBadge status={item.status} size="sm" />
                      )}
                    </td>

                    {/* Thao tác */}
                    <td
                      className="py-3.5 px-4 pr-6 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1">
                        {/* Chi tiết */}
                        <button
                          onClick={() => {
                            setSelectedInternship(item);
                            setDetailModalOpen(true);
                          }}
                          className="p-1.5 text-slate-500 hover:text-[#123891] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                          title="Xem chi tiết hồ sơ"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {/* Phân công giảng viên (Ẩn nếu đã hoàn thành) */}
                        {item.status !== 'COMPLETED' && item.evaluation?.status !== 'CONFIRMED' && (
                          <button
                            onClick={() => {
                              setSelectedInternship(item);
                              setAssignModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-[#123891] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title={item.lecturerId ? 'Đổi Giảng viên Giám sát' : 'Phân công Giảng viên Giám sát'}
                          >
                            <BookOpen className="w-4 h-4" />
                          </button>
                        )}

                        {/* Duyệt (nếu đang chờ) */}
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

                        {/* Từ chối (nếu đang chờ) */}
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
          {/* Danh sách thẻ Mobile (< 768px) */}
          <div className="md:hidden divide-y divide-slate-100">
            {internships.map((item, idx) => (
              <div
                key={item._id}
                className="p-4 space-y-3 bg-white hover:bg-slate-50/60 transition cursor-pointer"
                onClick={() => {
                  setSelectedInternship(item);
                  setDetailModalOpen(true);
                }}
              >
                {/* Đầu thẻ: STT + Tên sinh viên + Trạng thái */}
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[10.5px] font-mono text-slate-400 font-bold">#{(page - 1) * 10 + idx + 1}</span>
                      <h4 className="font-bold text-slate-900 text-xs truncate">
                        {item.studentId?.userId?.fullName || 'Chưa cập nhật'}
                      </h4>
                    </div>
                    <div className="text-[11px] text-slate-500 font-mono mt-0.5">
                      MSSV: {item.studentId?.studentCode} • {item.studentId?.className || ''}
                    </div>
                  </div>
                  {item.status === 'COMPLETED' || item.evaluation?.status === 'CONFIRMED' ? (
                    <StatusBadge status="COMPLETED" size="sm" />
                  ) : (
                    <StatusBadge status={item.status} size="sm" />
                  )}
                </div>

                {/* Doanh nghiệp & Vị trí thực tập */}
                <div className="p-2.5 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                  <div className="font-semibold text-slate-900 truncate">
                    {item.companyId?.name}
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5 truncate">
                    Vị trí: {item.position}
                  </div>
                </div>

                {/* Thời gian & Giảng viên giám sát */}
                <div className="grid grid-cols-2 gap-2 text-[11px]">
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">Thời gian</span>
                    <span className="text-slate-700 font-mono">
                      {formatDate(item.startDate)} - {formatDate(item.endDate)}
                    </span>
                  </div>
                  <div className="p-2 rounded-xl bg-slate-50 border border-slate-100">
                    <span className="text-slate-400 block text-[10px] uppercase font-bold">GV Giám Sát</span>
                    {item.lecturerId ? (
                      <span className="font-semibold text-[#102d7d] truncate block">
                        {item.lecturerId?.academicTitle ? item.lecturerId.academicTitle + ' ' : ''}{item.lecturerId?.userId?.fullName || 'Giảng viên'}
                      </span>
                    ) : (
                      <span className="text-amber-700 font-medium text-[10.5px] block truncate">Chưa phân công</span>
                    )}
                  </div>
                </div>

                {/* Thao tác */}
                <div className="flex items-center justify-end gap-1.5 pt-2 border-t border-slate-100" onClick={(e) => e.stopPropagation()}>
                  {item.status === 'PENDING' && (
                    <>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInternship(item);
                          setApproveModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition border border-emerald-200"
                      >
                        <CheckCircle2 className="w-3.5 h-3.5" />
                        <span>Duyệt</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setSelectedInternship(item);
                          setRejectModalOpen(true);
                        }}
                        className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-rose-700 bg-rose-50 hover:bg-rose-100 rounded-xl transition border border-rose-200"
                      >
                        <XCircle className="w-3.5 h-3.5" />
                        <span>Từ chối</span>
                      </button>
                    </>
                  )}

                  {item.status !== 'COMPLETED' && item.evaluation?.status !== 'CONFIRMED' && (
                    <button
                      type="button"
                      onClick={() => {
                        setSelectedInternship(item);
                        setAssignModalOpen(true);
                      }}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#102d7d] bg-blue-50 hover:bg-blue-100 rounded-xl transition"
                    >
                      <BookOpen className="w-3.5 h-3.5" />
                      <span>{item.lecturerId ? 'Đổi GV' : 'Gán GV'}</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => {
                      setSelectedInternship(item);
                      setDetailModalOpen(true);
                    }}
                    className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition"
                  >
                    <Eye className="w-3.5 h-3.5" />
                    <span>Chi tiết</span>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </>)}

        {/* Phân trang */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-4">
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      </div>

      {/* Các Modal */}
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
