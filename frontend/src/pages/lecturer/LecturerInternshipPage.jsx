import React, { useState, useEffect, useCallback } from 'react';
import internshipApi from '../../api/internshipApi';
import evaluationApi from '../../api/evaluationApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import LecturerInternshipDetailModal from '../../components/lecturers/LecturerInternshipDetailModal';

// Document Components
import InternshipConfirmationDoc from '../../components/documents/InternshipConfirmationDoc';
import InternshipEvaluationDoc from '../../components/documents/InternshipEvaluationDoc';
import DocumentViewerModal from '../../components/documents/DocumentViewerModal';

import {
  Users,
  BookOpen,
  Building2,
  Calendar,
  Eye,
  RefreshCw,
  Award,
  Printer,
  FileText,
  CheckCircle2,
  Shield,
} from 'lucide-react';

const LecturerInternshipPage = () => {
  const { currentTerm } = useAcademicTerm();
  const [internships, setInternships] = useState([]);
  const [stats, setStats] = useState(null);
  const [lecturerInfo, setLecturerInfo] = useState(null);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Search & Pagination
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);

  // Modals
  const [selectedInternship, setSelectedInternship] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Accept, Reject & Complete Modals
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [completeModalOpen, setCompleteModalOpen] = useState(false);
  const [targetInternship, setTargetInternship] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  // Document Modal States
  const [docModalOpen, setDocModalOpen] = useState(false);
  const [docType, setDocType] = useState('CONFIRMATION'); // 'CONFIRMATION' | 'EVALUATION'
  const [confirmationData, setConfirmationData] = useState(null);
  const [evaluationDocData, setEvaluationDocData] = useState(null);
  const [loadingDoc, setLoadingDoc] = useState(false);

  const { showToast } = useToast();

  const fetchSupervisedStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await internshipApi.getSupervised({
        page,
        limit: 10,
        search,
        academicTermId: currentTerm?._id || '',
      });

      if (res.success) {
        setInternships(res.data || []);
        setStats(res.stats || null);
        setLecturerInfo(res.lecturer || null);
        setPagination(res.pagination || null);
      }
    } catch (err) {
      showToast(
        err.message || 'Không thể tải danh sách sinh viên thực tập',
        'error',
      );
    } finally {
      setLoading(false);
    }
  }, [page, search, currentTerm?._id, showToast]);

  useEffect(() => {
    fetchSupervisedStudents();
  }, [fetchSupervisedStudents]);

  const handleSearchChange = (val) => {
    setSearch(val);
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

  // Open Document A: Giấy xác nhận hướng dẫn
  const handleOpenConfirmationDoc = async () => {
    setLoadingDoc(true);
    try {
      const res = await internshipApi.getSupervisionDocument();
      if (res.success) {
        setConfirmationData(res.data);
        setDocType('CONFIRMATION');
        setDocModalOpen(true);
      }
    } catch (err) {
      showToast(
        err.message || 'Không thể tải dữ liệu giấy xác nhận hướng dẫn',
        'error',
      );
    } finally {
      setLoadingDoc(false);
    }
  };

  // Open Document B: Phiếu đánh giá thực tập
  const handleOpenEvaluationDoc = async (intern) => {
    setLoadingDoc(true);
    try {
      // Fetch full details
      const res = await internshipApi.getById(intern._id);
      if (res.success) {
        // Also check evaluation
        setEvaluationDocData(res.data);
        setDocType('EVALUATION');
        setDocModalOpen(true);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải dữ liệu phiếu đánh giá', 'error');
    } finally {
      setLoadingDoc(false);
    }
  };

  const handleOpenAccept = (intern) => {
    setTargetInternship(intern);
    setAcceptModalOpen(true);
  };

  const handleConfirmAccept = async () => {
    if (!targetInternship) return;
    setActionLoading(true);
    try {
      const res = await internshipApi.supervisorAccept(targetInternship._id);
      if (res.success) {
        showToast('Đã chấp nhận hướng dẫn sinh viên thực tập thành công!', 'success');
        setAcceptModalOpen(false);
        setTargetInternship(null);
        fetchSupervisedStudents();
      }
    } catch (err) {
      showToast(err.message || 'Không thể chấp nhận hướng dẫn thực tập', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (intern) => {
    setTargetInternship(intern);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason || !rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối hướng dẫn', 'warning');
      return;
    }
    if (!targetInternship) return;

    setActionLoading(true);
    try {
      const res = await internshipApi.supervisorReject(
        targetInternship._id,
        rejectReason.trim(),
      );
      if (res.success) {
        showToast('Đã từ chối hướng dẫn sinh viên thực tập', 'info');
        setRejectModalOpen(false);
        setTargetInternship(null);
        setRejectReason('');
        fetchSupervisedStudents();
      }
    } catch (err) {
      showToast(err.message || 'Không thể từ chối hồ sơ thực tập', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenComplete = (intern) => {
    setTargetInternship(intern);
    setCompleteModalOpen(true);
  };

  const handleConfirmComplete = async () => {
    if (!targetInternship) return;
    setActionLoading(true);
    try {
      const res = await internshipApi.complete(targetInternship._id);
      if (res.success) {
        showToast('Đã xác nhận hoàn thành thực tập và khóa phiếu đánh giá thành công!', 'success');
        setCompleteModalOpen(false);
        setTargetInternship(null);
        fetchSupervisedStudents();
      }
    } catch (err) {
      showToast(err.message || 'Không thể xác nhận hoàn thành thực tập', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner with Lecturer Workload Stats & Actions */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-violet-200 shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  Sinh Viên Thực Tập Đang Hướng Dẫn
                </h2>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-2">
                <span>Giảng viên: <strong className="text-slate-800">{lecturerInfo?.academicTitle} {lecturerInfo?.userId?.fullName}</strong></span>
                <span>•</span>
                <span>Mã GV: <strong className="font-mono text-violet-700">{lecturerInfo?.lecturerCode}</strong></span>
                <span>•</span>
                <span>Chuyên môn: <strong className="text-slate-700">{lecturerInfo?.specialization || 'CNTT'}</strong></span>
              </div>
            </div>
          </div>

          {/* Action & Workload Stats Pill */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Button In Giấy xác nhận hướng dẫn */}
            <button
              onClick={handleOpenConfirmationDoc}
              disabled={loadingDoc || internships.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-sm shadow-violet-200 transition disabled:opacity-50"
              title="Xuất & In Giấy xác nhận hướng dẫn thực tập"
            >
              <Printer className="w-4 h-4" />
              <span>In Giấy xác nhận hướng dẫn</span>
            </button>

            <div className="p-3.5 rounded-2xl bg-violet-50/80 border border-violet-200/80 text-right">
              <div className="text-[11px] font-semibold text-violet-700 uppercase tracking-wider">
                Chỉ tiêu hướng dẫn
              </div>
              <div className="text-lg font-extrabold text-violet-950 mt-0.5">
                {stats?.activeCount || 0} / {stats?.maxStudents || 10} <span className="text-xs font-semibold text-violet-600">SV</span>
              </div>
            </div>

            <button
              onClick={fetchSupervisedStudents}
              className="p-3 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-2xl transition"
              title="Làm mới danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-3">
        <div className="max-w-md">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Tìm theo MSSV, Tên SV, Doanh nghiệp..."
          />
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={6} />
          </div>
        ) : internships.length === 0 ? (
          <EmptyState
            title="Chưa có sinh viên thực tập được phân công"
            description="Bạn hiện chưa có sinh viên thực tập nào được Trưởng Bộ Môn (TBM) phân công hướng dẫn."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 pl-6">MSSV</th>
                  <th className="py-3.5 px-4">Tên sinh viên</th>
                  <th className="py-3.5 px-4">Doanh nghiệp</th>
                  <th className="py-3.5 px-4">Vị trí thực tập</th>
                  <th className="py-3.5 px-4">Điểm ĐG</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {internships.map((item) => (
                  <tr
                    key={item._id}
                    className="hover:bg-slate-50/80 transition-colors group cursor-pointer"
                    onClick={() => {
                      setSelectedInternship(item);
                      setDetailModalOpen(true);
                    }}
                  >
                    {/* MSSV */}
                    <td className="py-3.5 px-4 pl-6 font-mono font-bold text-xs text-violet-700">
                      {item.studentId?.studentCode}
                    </td>

                    {/* Student Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-violet-50 text-violet-700 font-bold text-xs flex items-center justify-center shrink-0">
                          {item.studentId?.userId?.fullName?.charAt(0).toUpperCase() || 'S'}
                        </div>
                        <div className="min-w-0">
                          <div className="font-semibold text-slate-900 text-xs">
                            {item.studentId?.userId?.fullName || 'Chưa cập nhật'}
                          </div>
                          <div className="text-[11px] text-slate-400 font-mono">
                            {item.studentId?.className} • {item.studentId?.userId?.phone || '—'}
                          </div>
                        </div>
                      </div>
                    </td>

                    {/* Company */}
                    <td className="py-3.5 px-4 font-medium text-slate-800 text-xs max-w-[180px] truncate">
                      <div className="font-semibold text-slate-900 truncate">
                        {item.companyId?.name}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {item.companyId?.address}
                      </div>
                    </td>

                    {/* Position */}
                    <td className="py-3.5 px-4 text-xs font-semibold text-slate-800 max-w-[160px] truncate">
                      {item.position}
                    </td>

                    {/* Score */}
                    <td className="py-3.5 px-4 text-xs font-bold">
                      {item.evaluation?.score !== undefined && item.evaluation?.score !== null ? (
                        <span className="text-amber-800 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                          {item.evaluation.score} / 10
                        </span>
                      ) : (
                        <span className="text-slate-400 text-[11px] font-normal">—</span>
                      )}
                    </td>

                    {/* Status */}
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.status} size="sm" />
                    </td>

                    {/* Actions */}
                    <td
                      className="py-3.5 px-4 pr-6 text-right"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <div className="flex items-center justify-end gap-1.5">
                        {/* If evaluated: Complete or Print */}
                        {item.evaluation?.score !== undefined && item.evaluation?.score !== null && (
                          <>
                            {item.status !== 'COMPLETED' && (
                              <button
                                onClick={() => handleOpenComplete(item)}
                                className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 rounded-xl transition"
                                title="Xác nhận hoàn thành thực tập và khóa phiếu đánh giá"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Hoàn thành</span>
                              </button>
                            )}

                            <button
                              onClick={() => handleOpenEvaluationDoc(item)}
                              className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-amber-900 bg-amber-100 hover:bg-amber-200 rounded-xl transition"
                              title="In phiếu đánh giá thực tập này"
                            >
                              <Printer className="w-3.5 h-3.5" />
                              <span>In phiếu</span>
                            </button>
                          </>
                        )}

                        <button
                          onClick={() => {
                            setSelectedInternship(item);
                            setDetailModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-violet-700 bg-violet-50 hover:bg-violet-100 rounded-xl transition"
                          title="Xem chi tiết hồ sơ"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          <span>Chi tiết</span>
                        </button>
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

      {/* Detail Modal */}
      <LecturerInternshipDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedInternship(null);
        }}
        internship={selectedInternship}
      />

      {/* Accept Confirmation Modal */}
      {acceptModalOpen && targetInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Hướng Dẫn Thực Tập</h3>
                <p className="text-xs text-slate-500">Xác nhận tiếp nhận sinh viên thực tập doanh nghiệp</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
              <div>
                <span className="text-slate-400">Sinh viên:</span>
                <strong className="block text-slate-900 mt-0.5">
                  {targetInternship.studentId?.userId?.fullName} ({targetInternship.studentId?.studentCode})
                </strong>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400">Doanh nghiệp:</span>
                  <div className="font-semibold text-slate-800">
                    {targetInternship.companyId?.name}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Vị trí:</span>
                  <div className="font-semibold text-slate-800">
                    {targetInternship.position}
                  </div>
                </div>
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn nhận hướng dẫn sinh viên này không? Sau khi chấp nhận, hồ sơ sẽ chuyển sang trạng thái <strong>Đang thực tập</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAcceptModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAccept}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
              >
                {actionLoading ? 'Đang xử lý...' : 'Chấp nhận hướng dẫn'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && targetInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleConfirmReject} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Từ Chối Hướng Dẫn Thực Tập</h3>
                <p className="text-xs text-slate-500">Vui lòng cung cấp lý do từ chối cụ thể</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
              <span className="text-slate-400">Sinh viên:</span>
              <strong className="block text-slate-900 mt-0.5">
                {targetInternship.studentId?.userId?.fullName} ({targetInternship.studentId?.studentCode}) — {targetInternship.companyId?.name}
              </strong>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Lý do từ chối <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối (ví dụ: Quá tải chỉ tiêu, không đúng định hướng chuyên môn...)"
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-hidden transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition"
              >
                {actionLoading ? 'Đang gửi...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Complete Confirmation Modal */}
      {completeModalOpen && targetInternship && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Hoàn Thành Thực Tập</h3>
                <p className="text-xs text-slate-500">Khóa phiếu đánh giá và nghiệm thu kết quả</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
              <div>
                <span className="text-slate-400">Sinh viên:</span>
                <strong className="block text-slate-900 mt-0.5">
                  {targetInternship.studentId?.userId?.fullName} ({targetInternship.studentId?.studentCode})
                </strong>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400">Doanh nghiệp:</span>
                  <div className="font-semibold text-slate-800">
                    {targetInternship.companyId?.name}
                  </div>
                </div>
                <div>
                  <span className="text-slate-400">Điểm đánh giá:</span>
                  <div className="font-bold text-amber-700">
                    {targetInternship.evaluation?.score !== undefined ? `${targetInternship.evaluation.score} / 10` : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-amber-900 text-xs space-y-1">
              <div className="font-bold flex items-center gap-1.5">
                <Shield className="w-4 h-4 text-amber-600 shrink-0" />
                Lưu ý quan trọng
              </div>
              <p>
                Sau khi GVHD xác nhận <strong>Hoàn thành</strong>, phiếu đánh giá sẽ chuyển sang trạng thái <strong>COMPLETED</strong> và bị <strong>KHÓA vĩnh viễn</strong>. Doanh nghiệp và người dùng sẽ không thể chỉnh sửa điểm/nhận xét nữa.
              </p>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setCompleteModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmComplete}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 rounded-xl shadow-xs transition inline-flex items-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>{actionLoading ? 'Đang xử lý...' : 'Xác nhận Hoàn thành'}</span>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Printable Document Modal */}
      <DocumentViewerModal
        isOpen={docModalOpen}
        onClose={() => setDocModalOpen(false)}
        title={
          docType === 'CONFIRMATION'
            ? 'Giấy Xác Nhận Hướng Dẫn Thực Tập Doanh Nghiệp'
            : 'Phiếu Đánh Giá Kết Quả Thực Tập Doanh Nghiệp'
        }
      >
        {docType === 'CONFIRMATION' && (
          <InternshipConfirmationDoc docData={confirmationData} />
        )}
        {docType === 'EVALUATION' && (
          <InternshipEvaluationDoc internship={evaluationDocData} />
        )}
      </DocumentViewerModal>
    </div>
  );
};

export default LecturerInternshipPage;
