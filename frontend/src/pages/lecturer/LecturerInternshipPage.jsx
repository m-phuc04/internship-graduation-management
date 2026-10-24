import LecturerInternshipGradingModal from '../../components/lecturers/LecturerInternshipGradingModal';
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
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Shield,
  AlertCircle,
} from 'lucide-react';

const LecturerInternshipPage = () => {
  // Check if grading window is open for Giảng viên Giám sát
  const isGradingWindowOpen = (item) => {
    const term = item?.academicTermId || currentTerm;
    const cfg = term?.internship || {};
    const startRaw = cfg.gradingStart;
    const endRaw = cfg.gradingEnd;

    if (!startRaw && !endRaw) {
      return true; // Not constrained
    }

    const now = new Date();
    if (startRaw) {
      const start = new Date(startRaw);
      start.setHours(0, 0, 0, 0);
      if (now < start) return false;
    }
    if (endRaw) {
      const end = new Date(endRaw);
      end.setHours(23, 59, 59, 999);
      if (now > end) return false;
    }
    return true;
  };

  const handleOpenGrading = (item) => {
    if (!isGradingWindowOpen(item)) {
      showToast('Chưa tới thời gian chấm điểm', 'error');
      return;
    }
    setGradingTarget(item);
    setGradingModalOpen(true);
  };

  const { currentTerm, terms, setCurrentTerm } = useAcademicTerm();
  const isActiveTerm = currentTerm?.status === 'ACTIVE';
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
  const [gradingModalOpen, setGradingModalOpen] = useState(false);
  const [gradingTarget, setGradingTarget] = useState(null);

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

  // Xuất danh sách sinh viên thực tập ra Excel
  const [exporting, setExporting] = useState(false);

  const handleExportExcel = async () => {
    if (!internships || internships.length === 0) {
      showToast('Không có dữ liệu sinh viên thực tập để xuất file Excel', 'info');
      return;
    }

    try {
      setExporting(true);
      const response = await internshipApi.exportExcel({
        academicTermId: currentTerm?._id || '',
        search: search ? search.trim() : '',
        scope: 'SUPERVISED',
      });

      const blob = new Blob([response.data || response], {
        type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
      });

      const termCode = currentTerm?.code ? currentTerm.code.replace(/[^a-zA-Z0-9_-]/g, '_') : 'HocKy';
      const filename = `Danh_sach_sinh_vien_thuc_tap_${termCode}.xlsx`;

      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', filename);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);

      showToast('Xuất danh sách sinh viên thực tập thành công!', 'success');
    } catch (err) {
      let msg = err.message || 'Không thể xuất danh sách sinh viên ra Excel';
      if (err.data instanceof Blob) {
        try {
          const text = await err.data.text();
          const parsed = JSON.parse(text);
          if (parsed.message) msg = parsed.message;
        } catch {
          // ignore
        }
      }
      showToast(msg, 'error');
    } finally {
      setExporting(false);
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
        showToast('Đã tiếp nhận giám sát sinh viên thực tập thành công!', 'success');
        setAcceptModalOpen(false);
        setTargetInternship(null);
        fetchSupervisedStudents();
      }
    } catch (err) {
      showToast(err.message || 'Không thể chấp nhận giám sát thực tập', 'error');
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
      showToast('Vui lòng nhập lý do từ chối giám sát', 'warning');
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
        showToast('Đã từ chối tiếp nhận giám sát sinh viên thực tập', 'info');
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
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#0d2a75] via-[#123891] to-[#005BAA] text-white flex items-center justify-center font-bold text-xl shadow-md shadow-blue-200 shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  Sinh Viên Thực Tập Đang Giám Sát
                </h2>
              </div>
              <div className="text-xs text-slate-500 font-medium mt-1 flex flex-wrap items-center gap-2">
                <span>Giảng viên: <strong className="text-slate-800">{lecturerInfo?.academicTitle} {lecturerInfo?.userId?.fullName}</strong></span>
                <span>•</span>
                <span>Mã GV: <strong className="font-mono text-[#102d7d]">{lecturerInfo?.lecturerCode}</strong></span>
              </div>
            </div>
          </div>

          {/* Action & Workload Stats Pill */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Button Xuất Excel danh sách sinh viên */}
            <button
              onClick={handleExportExcel}
              disabled={exporting || loading || internships.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition disabled:opacity-50 cursor-pointer"
              title="Xuất danh sách sinh viên thực tập ra file Excel (.xlsx)"
            >
              <FileSpreadsheet className={`w-4 h-4 ${exporting ? 'animate-spin' : ''}`} />
              <span>{exporting ? 'Đang xuất Excel...' : 'Xuất Excel'}</span>
            </button>

            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-right">
              <div className="text-[11px] font-semibold text-[#102d7d] uppercase tracking-wider">
                SV đang giám sát
              </div>
              <div className="text-lg font-extrabold text-[#123891] mt-0.5">
                {stats?.activeCount || 0} <span className="text-xs font-semibold text-[#123891]">SV</span>
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

      {/* Search Bar & Academic Term Selector */}
      <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Tìm theo MSSV, Tên SV, Doanh nghiệp..."
          />
        </div>

        {/* Academic Term Selector */}
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-xs font-semibold text-slate-500 hidden md:inline">Học kỳ:</span>
          <select
            value={currentTerm?._id || ''}
            onChange={(e) => {
              if (setCurrentTerm && e.target.value) {
                setCurrentTerm(e.target.value);
              }
            }}
            className="px-3 py-2 bg-slate-50 hover:bg-slate-100 border border-slate-200/80 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-blue-100 transition cursor-pointer"
          >
            {Array.isArray(terms) &&
              terms.map((t) => (
                <option key={t._id} value={t._id}>
                  {t.name} ({t.academicYear}) {t.status === 'ACTIVE' ? '• Đang diễn ra' : '• Đã đóng'}
                </option>
              ))}
          </select>
        </div>
      </div>

      {/* Non-active Term Notification Banner */}
      {!isActiveTerm && (
        <div className="flex items-center gap-3 p-4 bg-amber-50 border border-amber-200/90 rounded-2xl text-amber-900 text-xs shadow-2xs">
          <AlertCircle className="w-5 h-5 text-amber-600 shrink-0" />
          <div className="flex-1">
            <span className="font-bold">Đang xem học kỳ ({currentTerm?.name || 'Học kỳ'} • {currentTerm?.academicYear || ''}):</span>
            <span className="ml-1 text-amber-800">
              Học kỳ này không ở trạng thái đang diễn ra.
            </span>
          </div>
        </div>
      )}

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={6} />
          </div>
        ) : internships.length === 0 ? (
          <EmptyState
            title={isActiveTerm ? "Chưa có sinh viên thực tập được phân công" : "Không có sinh viên thực tập trong học kỳ này"}
            description={isActiveTerm ? "Bạn hiện chưa có sinh viên thực tập nào được Trưởng Bộ Môn (TBM) phân công giám sát." : "Không tìm thấy dữ liệu sinh viên thực tập giám sát của học kỳ này."}
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
                    <td className="py-3.5 px-4 pl-6 font-mono font-bold text-xs text-[#102d7d]">
                      {item.studentId?.studentCode}
                    </td>

                    {/* Student Name */}
                    <td className="py-3.5 px-4">
                      <div className="flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-blue-50 text-[#102d7d] font-bold text-xs flex items-center justify-center shrink-0">
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
                        {/* Nút Chấm điểm: chỉ hiển thị khi chưa có điểm */}
                        {(!item.evaluation || item.evaluation?.score === undefined || item.evaluation?.score === null) && (
                          <button
                            type="button"
                            onClick={() => handleOpenGrading(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-white bg-[#123891] hover:bg-[#102d7d] rounded-xl transition cursor-pointer shadow-xs"
                            title="Chấm điểm thực tập cho sinh viên này"
                          >
                            <Award className="w-3.5 h-3.5" />
                            <span>Chấm điểm</span>
                          </button>
                        )}

                        {/* If evaluated: In phiếu */}
                        {item.evaluation?.score !== undefined && item.evaluation?.score !== null && (
                          <button
                            type="button"
                            onClick={() => handleOpenEvaluationDoc(item)}
                            className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                            title="In phiếu đánh giá thực tập này"
                          >
                            <Printer className="w-3.5 h-3.5" />
                            <span>In phiếu</span>
                          </button>
                        )}

                        {/* Nút Chi tiết */}
                        <button
                          type="button"
                          onClick={() => {
                            setSelectedInternship(item);
                            setDetailModalOpen(true);
                          }}
                          className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold text-[#102d7d] bg-blue-50 hover:bg-blue-100 rounded-xl transition cursor-pointer"
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
      <LecturerInternshipGradingModal
        isOpen={gradingModalOpen}
        onClose={() => {
          setGradingModalOpen(false);
          setGradingTarget(null);
        }}
        internship={gradingTarget}
        onGraded={fetchSupervisedStudents}
      />

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
                <h3 className="text-base font-bold text-slate-900">Tiếp Nhận Giám Sát Thực Tập</h3>
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
              Bạn có chắc chắn muốn tiếp nhận giám sát sinh viên này không? Sau khi chấp nhận, hồ sơ sẽ chuyển sang trạng thái <strong>Đang thực tập</strong>.
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
                {actionLoading ? 'Đang xử lý...' : 'Tiếp nhận giám sát'}
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
                <h3 className="text-base font-bold text-slate-900">Từ Chối Giám Sát Thực Tập</h3>
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
                Sau khi GVGS xác nhận <strong>Hoàn thành</strong>, phiếu đánh giá sẽ chuyển sang trạng thái <strong>COMPLETED</strong> và bị <strong>KHÓA vĩnh viễn</strong>. Doanh nghiệp và người dùng sẽ không thể chỉnh sửa điểm/nhận xét nữa.
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
            ? 'Giấy Xác Nhận Giám Sát Thực Tập Doanh Nghiệp'
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
