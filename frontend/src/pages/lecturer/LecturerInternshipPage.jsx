import LecturerInternshipGradingModal from '../../components/lecturers/LecturerInternshipGradingModal';
import React, { useState, useEffect, useCallback } from 'react';
import internshipApi from '../../api/internshipApi';
import evaluationApi from '../../api/evaluationApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { getInternshipGradingWindowStatus } from '../../utils/dateUtils';
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
  Award,
  FileSpreadsheet,
  FileText,
  CheckCircle2,
  Shield,
  AlertCircle,
  Clock,
  Sliders,
  Settings2,
} from 'lucide-react';

const LecturerInternshipPage = () => {
  const { currentTerm, terms, setCurrentTerm } = useAcademicTerm();

  // Check grading window status for Giảng viên Giám sát based on TBM configuration
  const getGradingWindowStatus = (item) => {
    const term =
      item?.academicTermId && (item.academicTermId.internship !== undefined || item.academicTermId.name)
        ? item.academicTermId
        : currentTerm;
    return getInternshipGradingWindowStatus(term);
  };

  const handleOpenGrading = (item) => {
    const windowStatus = getGradingWindowStatus(item);
    if (!windowStatus.allowed) {
      showToast(windowStatus.reason, 'error');
      return;
    }
    setGradingTarget(item);
    setGradingModalOpen(true);
  };

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

  // Report Cycle Modal State
  const [cycleModalOpen, setCycleModalOpen] = useState(false);
  const [cycleTarget, setCycleTarget] = useState(null);
  const [selectedCycle, setSelectedCycle] = useState(1);
  const [cycleLoading, setCycleLoading] = useState(false);

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

  const handleOpenCycleModal = (intern) => {
    setCycleTarget(intern);
    setSelectedCycle(intern.reportCycle || 1);
    setCycleModalOpen(true);
  };

  const handleSaveReportCycle = async () => {
    if (!cycleTarget) return;
    setCycleLoading(true);
    try {
      const res = await internshipApi.updateReportCycle(cycleTarget._id, selectedCycle);
      if (res.success) {
        showToast(
          `Đã thiết lập chu kỳ nộp nhật ký thành ${selectedCycle} tuần/lần cho sinh viên ${cycleTarget.studentId?.userId?.fullName || ''}!`,
          'success',
        );
        setCycleModalOpen(false);
        setCycleTarget(null);
        fetchSupervisedStudents();
      }
    } catch (err) {
      showToast(err.message || 'Không thể cập nhật chu kỳ nộp nhật ký', 'error');
    } finally {
      setCycleLoading(false);
    }
  };

  const handleConfirmPretest = async (item) => {
    try {
      const res = await internshipApi.updatePretestStatus(item._id, true);
      if (res?.success) {
        showToast(
          `Đã xác nhận PASS PRETEST thành công cho sinh viên ${item.studentId?.userId?.fullName || ''}!`,
          'success',
        );
        fetchSupervisedStudents();
      }
    } catch (err) {
      showToast(err.message || 'Không thể cập nhật trạng thái PASS PRETEST', 'error');
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
                
              </div>
            </div>
          </div>

          {/* Action & Workload Stats Pill */}
          <div className="flex flex-wrap items-center gap-3">
            {/* Button Xuất danh sách sinh viên */}
            <button
              onClick={handleExportExcel}
              disabled={exporting || loading || internships.length === 0}
              className="inline-flex items-center gap-1.5 px-4 py-2.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-bold text-xs shadow-sm shadow-emerald-600/20 transition disabled:opacity-50 cursor-pointer"
              title="Xuất danh sách sinh viên thực tập ra file Excel (.xlsx)"
            >
              <FileSpreadsheet className={`w-4 h-4 ${exporting ? 'animate-spin' : ''}`} />
              <span>{exporting ? 'Đang xuất danh sách...' : 'Xuất danh sách'}</span>
            </button>

            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200/80 text-right">
              <div className="text-[11px] font-semibold text-[#102d7d] uppercase tracking-wider">
                SV đang giám sát
              </div>
              <div className="text-lg font-extrabold text-[#123891] mt-0.5">
                {stats?.totalAssigned ?? pagination?.total ?? stats?.activeCount ?? internships.length ?? 0} <span className="text-xs font-semibold text-[#123891]">SV</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-96">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Tìm theo MSSV, Tên SV, Doanh nghiệp..."
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto justify-end">
          <span className="text-xs font-semibold text-slate-500">Học kỳ:</span>
          <select
            value={currentTerm?._id || ''}
            onChange={(e) => {
              if (setCurrentTerm && e.target.value) {
                setCurrentTerm(e.target.value);
              }
            }}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 transition cursor-pointer"
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
                  <th className="py-3.5 px-4 whitespace-nowrap">Chu kỳ nộp</th>
                  <th className="py-3.5 px-4 text-center">PASS PRETEST</th>
                  <th className="py-3.5 px-4 text-center">Nhật ký</th>
                  <th className="py-3.5 px-4 text-center">Báo cáo</th>
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
                        {item.position}
                      </div>
                    </td>

                    {/* Report Cycle */}
                    <td
                      className="py-3.5 px-4 whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <button
                        type="button"
                        onClick={() => handleOpenCycleModal(item)}
                        className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-xl bg-blue-50/80 hover:bg-blue-100 text-[#102d7d] border border-blue-200/80 text-xs font-bold transition shadow-2xs cursor-pointer group"
                        title="Bấm để thiết lập chu kỳ nộp nhật ký cho sinh viên này"
                      >
                        <Clock className="w-3.5 h-3.5 text-blue-600" />
                        <span>{item.reportCycle || 1} tuần/lần</span>
                        <Settings2 className="w-3 h-3 text-slate-400 group-hover:text-blue-700 ml-0.5" />
                      </button>
                    </td>

                    {/* PASS PRETEST (Prompt 2 - Requirement 3) */}
                    <td
                      className="py-3.5 px-4 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.pretestPassed ? (
                        <span
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs font-bold shadow-2xs"
                          title={`Đã xác nhận PASS PRETEST${item.pretest?.passedAt ? ' lúc ' + new Date(item.pretest.passedAt).toLocaleDateString('vi-VN') : ''}`}
                        >
                          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                          <span>PASS PRETEST</span>
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleConfirmPretest(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-amber-50 hover:bg-amber-100 text-amber-800 border border-amber-200 text-xs font-bold transition shadow-2xs cursor-pointer"
                          title="Nhấn để xác nhận sinh viên này đã PASS PRETEST"
                        >
                          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
                          <span>Xác nhận PASS</span>
                        </button>
                      )}
                    </td>

                    {/* Diary Completion Status (Prompt 2 - Requirement 2) */}
                    <td className="py-3.5 px-4 text-center whitespace-nowrap">
                      {item.diaryStatus?.isCompleted ? (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold"
                          title={item.diaryStatus?.summaryText || 'Đã nộp đủ nhật ký'}
                        >
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Đủ ({item.diaryStatus?.submittedWeeks?.length}/{item.diaryStatus?.mandatoryWeeks?.length})</span>
                        </span>
                      ) : (
                        <span
                          className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-amber-50 text-amber-800 border border-amber-200 text-[11px] font-bold"
                          title={`Chưa nộp đủ nhật ký. Còn thiếu tuần: ${item.diaryStatus?.missingWeeks?.join(', ')}`}
                        >
                          <Clock className="w-3 h-3 text-amber-600" />
                          <span>Thiếu tuần {item.diaryStatus?.missingWeeks?.join(', ')}</span>
                        </span>
                      )}
                    </td>

                    {/* Report File Status (Prompt 2 - Requirement 1) */}
                    <td
                      className="py-3.5 px-4 text-center whitespace-nowrap"
                      onClick={(e) => e.stopPropagation()}
                    >
                      {item.reportFileSubmitted ? (
                        <a
                          href={item.reportFile.fileUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-50 text-emerald-700 border border-emerald-200 text-[11px] font-bold hover:bg-emerald-100 transition shadow-2xs"
                          title={`Mở file báo cáo: ${item.reportFile?.originalName || item.reportFile?.fileName}`}
                        >
                          <FileText className="w-3.5 h-3.5 text-emerald-600" />
                          <span>Đã nộp file</span>
                        </a>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 text-slate-500 border border-slate-200 text-[11px] font-semibold">
                          <Clock className="w-3 h-3 text-slate-400" />
                          <span>Chưa nộp</span>
                        </span>
                      )}
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
                        {/* Nút Chu kỳ nộp */}
                        <button
                          type="button"
                          onClick={() => handleOpenCycleModal(item)}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer"
                          title="Thiết lập chu kỳ nộp nhật ký"
                        >
                          <Sliders className="w-3.5 h-3.5 text-slate-500" />
                          <span>Chu kỳ</span>
                        </button>

                        {/* Prompt 2 - Requirement 4 & 5: Nút Chấm điểm & Nút Chỉnh sửa điểm */}
                        {(() => {
                          const hasScore =
                            item.evaluation &&
                            item.evaluation?.score !== undefined &&
                            item.evaluation?.score !== null;
                          const windowStatus = getGradingWindowStatus(item);

                          const allReasons = [];
                          if (!item.pretestPassed) allReasons.push('Chưa PASS PRETEST');
                          if (!item.diaryStatus?.isCompleted) {
                            allReasons.push(`Chưa đủ nhật ký (thiếu tuần ${item.diaryStatus?.missingWeeks?.join(', ')})`);
                          }
                          if (!item.reportFileSubmitted) allReasons.push('Chưa nộp file báo cáo thực tập');
                          if (!windowStatus.allowed) allReasons.push(windowStatus.reason);

                          const isEligibleToGrade =
                            item.canGrade && windowStatus.allowed;

                          if (!hasScore) {
                            // Chấm điểm lần đầu (Prompt 2 - Requirement 4)
                            return (
                              <button
                                type="button"
                                disabled={!isEligibleToGrade}
                                onClick={() => {
                                  if (isEligibleToGrade) {
                                    handleOpenGrading(item);
                                  }
                                }}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl transition shadow-xs ${
                                  isEligibleToGrade
                                    ? 'text-white bg-[#123891] hover:bg-[#102d7d] cursor-pointer'
                                    : 'text-slate-400 bg-slate-100 hover:bg-slate-100 border border-slate-200 cursor-not-allowed opacity-90'
                                }`}
                                title={
                                  isEligibleToGrade
                                    ? 'Chấm điểm thực tập cho sinh viên này'
                                    : `Chưa đủ điều kiện: ${allReasons.join(' • ')}`
                                }
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Chấm điểm</span>
                              </button>
                            );
                          } else {
                            // Đã có điểm -> Chỉnh sửa điểm (Prompt 2 - Requirement 5)
                            const isLocked = item.isScorePublished;
                            const canEdit = !isLocked && isEligibleToGrade;

                            return (
                              <button
                                type="button"
                                disabled={!canEdit}
                                onClick={() => {
                                  if (canEdit) {
                                    handleOpenGrading(item);
                                  }
                                }}
                                className={`inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl transition shadow-xs ${
                                  canEdit
                                    ? 'text-amber-900 bg-amber-100 hover:bg-amber-200 border border-amber-300 cursor-pointer'
                                    : 'text-slate-400 bg-slate-100 border border-slate-200 cursor-not-allowed opacity-90'
                                }`}
                                title={
                                  isLocked
                                    ? 'Điểm đã được công bố, không thể chỉnh sửa'
                                    : canEdit
                                    ? 'Chỉnh sửa điểm đã chấm cho sinh viên này'
                                    : `Không thể sửa điểm: ${allReasons.join(' • ')}`
                                }
                              >
                                <Award className="w-3.5 h-3.5 text-amber-700" />
                                <span>Sửa điểm</span>
                              </button>
                            );
                          }
                        })()}

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

      {/* Set Report Cycle Modal */}
      {cycleModalOpen && cycleTarget && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0 font-bold">
                <Sliders className="w-5 h-5" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Thiết Lập Chu Kỳ Nộp Nhật Ký</h3>
                <p className="text-xs text-slate-500">Lựa chọn chu kỳ báo cáo định kỳ cho sinh viên</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80 text-xs space-y-1.5">
              <div>
                <span className="text-slate-400">Sinh viên: </span>
                <strong className="text-slate-900">
                  {cycleTarget.studentId?.userId?.fullName} ({cycleTarget.studentId?.studentCode})
                </strong>
              </div>
              <div>
                <span className="text-slate-400">Đơn vị: </span>
                <span className="text-slate-700">{cycleTarget.companyId?.name}</span>
              </div>
              <div>
                <span className="text-slate-400">Thời lượng thực tập: </span>
                <span className="font-bold text-[#102d7d]">
                  {cycleTarget.durationInWeeks || 12} tuần
                </span>
              </div>
            </div>

            <div className="space-y-2">
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                Chọn chu kỳ nộp nhật ký:
              </label>

              <div className="space-y-2">
                {[
                  { value: 1, label: '1 tuần / lần', desc: 'Sinh viên nộp hàng tuần: Tuần 1, 2, 3, 4, 5, 6...' },
                  { value: 2, label: '2 tuần / lần', desc: 'Sinh viên nộp 2 tuần một lần: Tuần 2, 4, 6, 8, 10, 12' },
                  { value: 3, label: '3 tuần / lần', desc: 'Sinh viên nộp 3 tuần một lần: Tuần 3, 6, 9, 12' },
                ].map((option) => (
                  <label
                    key={option.value}
                    onClick={() => setSelectedCycle(option.value)}
                    className={`p-3.5 rounded-2xl border text-xs flex items-start gap-3 cursor-pointer transition ${
                      selectedCycle === option.value
                        ? 'bg-blue-50/70 border-[#123891] ring-1 ring-[#123891]'
                        : 'bg-white border-slate-200 hover:bg-slate-50'
                    }`}
                  >
                    <input
                      type="radio"
                      name="reportCycle"
                      value={option.value}
                      checked={selectedCycle === option.value}
                      onChange={() => setSelectedCycle(option.value)}
                      className="mt-0.5 text-[#123891] focus:ring-[#123891]"
                    />
                    <div>
                      <div className="font-bold text-slate-900 text-xs">
                        {option.label}
                      </div>
                      <div className="text-[11px] text-slate-500 mt-0.5 leading-relaxed">
                        {option.desc}
                      </div>
                    </div>
                  </label>
                ))}
              </div>
            </div>

            <div className="p-3 rounded-2xl bg-amber-50 border border-amber-200/80 text-[11px] text-amber-900 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
              <span>
                Việc thay đổi chu kỳ không làm mất dữ liệu nhật ký và file đính kèm sinh viên đã nộp trước đó.
              </span>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setCycleModalOpen(false)}
                disabled={cycleLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleSaveReportCycle}
                disabled={cycleLoading}
                className="px-5 py-2 text-xs font-bold text-white bg-[#123891] hover:bg-[#102d7d] rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
              >
                {cycleLoading ? 'Đang lưu...' : 'Lưu chu kỳ'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerInternshipPage;
