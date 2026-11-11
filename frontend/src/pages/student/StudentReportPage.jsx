import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { Link } from 'react-router-dom';
import reportApi from '../../api/reportApi';
import internshipApi from '../../api/internshipApi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import StudentReportModal from '../../components/reports/StudentReportModal';
import StudentReportDetailModal from '../../components/reports/StudentReportDetailModal';
import Student2ConfirmModal from '../../components/reports/Student2ConfirmModal';
import ExportInternshipDiaryModal from '../../components/reports/ExportInternshipDiaryModal';
import getFileUrl from '../../utils/fileUrlHelper';

import {
  BookOpen,
  Calendar,
  Building2,
  Briefcase,
  User,
  Users,
  CheckCircle2,
  Check,
  Clock,
  AlertTriangle,
  FileText,
  Paperclip,
  Download,
  ExternalLink,
  Eye,
  Edit3,
  ShieldCheck,
  Printer,
  RefreshCw,
  Award,
  ChevronRight,
  Lock,
  PlusCircle,
  ArrowUpDown,
} from 'lucide-react';

const formatFileSize = (bytes) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
};

const isWeekEnded = (date) => {
  if (!date) return false;
  const d = new Date(date);
  if (isNaN(d.getTime())) return false;
  const endOfDay = new Date(d);
  endOfDay.setHours(23, 59, 59, 999);
  return new Date().getTime() > endOfDay.getTime();
};

const getDurationWeeks = (internship) => {
  if (!internship) return 0;
  if (internship?.durationInWeeks && (internship.durationInWeeks === 10 || internship.durationInWeeks === 12)) {
    return internship.durationInWeeks;
  }
  if (internship?.startDate && internship?.endDate) {
    const diff = new Date(internship.endDate) - new Date(internship.startDate);
    const weeks = Math.round(diff / (1000 * 60 * 60 * 24 * 7));
    if (weeks === 10) return 10;
    if (weeks === 12) return 12;
  }
  return 12;
};

const StudentReportPage = () => {
  const { user } = useAuth();
  const [reports, setReports] = useState([]);
  const [internship, setInternship] = useState(null);
  const [student, setStudent] = useState(null);
  const [loading, setLoading] = useState(true);

  // Modals
  const [createModalOpen, setCreateModalOpen] = useState(false);
  const [targetWeekForCreate, setTargetWeekForCreate] = useState(null);
  const [editingReport, setEditingReport] = useState(null);

  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedReport, setSelectedReport] = useState(null);

  const [confirmModalOpen, setConfirmModalOpen] = useState(false);
  const [reportToConfirm, setReportToConfirm] = useState(null);

  const [exportModalOpen, setExportModalOpen] = useState(false);

  const { showToast } = useToast();

  const fetchReports = useCallback(async () => {
    setLoading(true);
    try {
      const [reportRes, internRes] = await Promise.allSettled([
        reportApi.getMyReports(),
        internshipApi.getMyInternship(),
      ]);

      let internData = null;
      if (internRes.status === 'fulfilled' && internRes.value?.success) {
        internData = internRes.value.data?.internship || internRes.value.data || null;
      }

      if (reportRes.status === 'fulfilled' && reportRes.value?.success) {
        setReports(reportRes.value.data || []);
        setStudent(reportRes.value.student || null);
        if (!internData) {
          internData = reportRes.value.internship || null;
        }
      }
      setInternship(internData);
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách nhật ký thực tập', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchReports();
  }, [fetchReports]);

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Check if current logged-in user is SV1 or SV2
  const isSV1 = useMemo(() => {
    if (!internship?.studentId || !user) return false;
    const s1UserId = internship.studentId?.userId?._id || internship.studentId?.userId || internship.studentId;
    return s1UserId?.toString() === user?.id?.toString() || s1UserId?.toString() === user?._id?.toString();
  }, [internship, user]);

  const isSV2 = useMemo(() => {
    if (!internship?.secondStudentId || !user) return false;
    const s2UserId = internship.secondStudentId?.userId?._id || internship.secondStudentId?.userId || internship.secondStudentId;
    return s2UserId?.toString() === user?.id?.toString() || s2UserId?.toString() === user?._id?.toString();
  }, [internship, user]);

  const hasStudent2 = !!internship?.secondStudentId;

  // Map existing reports by weekNumber
  const reportMap = useMemo(() => {
    const map = {};
    reports.forEach((r) => {
      if (r.weekNumber) {
        map[r.weekNumber] = r;
      }
    });
    return map;
  }, [reports]);

  // Check if internship has been approved by TBM
  const isApprovedByTBM = useMemo(() => {
    if (!internship) return false;
    if (
      internship.status === 'CANCELLED' ||
      internship.status === 'REJECTED' ||
      Boolean(internship.rejectedAt)
    ) {
      return false;
    }
    return Boolean(
      internship.approvedAt ||
      internship.approvedBy ||
      internship.lecturerId ||
      ['APPROVED', 'INTERNING', 'PENDING_SUPERVISOR_ACCEPTANCE', 'COMPLETED'].includes(internship.status)
    );
  }, [internship]);

  // Check if supervisor lecturer is assigned
  const hasAssignedLecturer = useMemo(() => {
    return Boolean(
      internship?.lecturerId ||
      internship?.supervisorId ||
      (typeof internship?.lecturerId === 'object' && internship?.lecturerId?._id)
    );
  }, [internship]);

  // Total duration: 10 or 12 weeks according to registered duration
  const totalWeeks = useMemo(() => {
    if (!internship || !isApprovedByTBM) return 0;
    return getDurationWeeks(internship);
  }, [internship, isApprovedByTBM]);

  // Report cycle configured by GVGS (1, 2, or 3 weeks/time)
  const cycle = useMemo(() => {
    return Number(internship?.reportCycle) || 1;
  }, [internship?.reportCycle]);

  // Calculate weeks to display (Chỉ hiển thị các tuần thuộc chu kỳ nộp nhật ký)
  const weeks = useMemo(() => {
    if (!isApprovedByTBM || totalWeeks === 0) {
      return [];
    }

    const result = [];
    const start = internship?.startDate ? new Date(internship.startDate) : null;
    const hasValidStart = start && !isNaN(start.getTime());

    for (let i = 1; i <= totalWeeks; i++) {
      // Ẩn hoàn toàn các tuần không thuộc chu kỳ nộp nhật ký
      if (i % cycle !== 0) {
        continue;
      }

      let defaultStart = null;
      let defaultEnd = null;

      if (hasValidStart) {
        defaultStart = new Date(start);
        defaultStart.setDate(defaultStart.getDate() + (i - 1) * 7);
        defaultStart.setHours(0, 0, 0, 0);

        defaultEnd = new Date(start);
        defaultEnd.setDate(defaultEnd.getDate() + (i * 7 - 1));
        defaultEnd.setHours(23, 59, 59, 999);
      }

      result.push({
        weekNumber: i,
        label: `Tuần ${i}`,
        isCycleWeek: true,
        defaultStartDate: defaultStart,
        defaultEndDate: defaultEnd,
      });
    }

    return result;
  }, [isApprovedByTBM, totalWeeks, internship?.startDate, cycle]);

  // Statistics
  const completedWeeks = useMemo(() => {
    return Object.values(reportMap).filter(
      (r) => ['SUBMITTED', 'REVIEWING', 'APPROVED'].includes(r.status),
    ).length;
  }, [reportMap]);

  // Sắp xếp danh sách nhật ký:
  // 1. Ưu tiên trạng thái: Các tuần Chưa nộp hiển thị trước, Đã nộp hiển thị phía dưới
  // 2. Nhóm Chưa nộp: Sắp xếp tuần tăng dần (ASC: Tuần nhỏ làm trước, tuần lớn làm sau, ví dụ Tuần 2 rồi đến Tuần 3)
  // 3. Nhóm Đã nộp: Sắp xếp tuần giảm dần (DESC: Tuần lớn / mới nhất nộp nằm trên, ví dụ Tuần 9 rồi đến Tuần 6)
  const [sortAscending, setSortAscending] = useState(false);

  const displayedWeeks = useMemo(() => {
    return [...weeks].sort((a, b) => {
      const reportA = reportMap[a.weekNumber];
      const reportB = reportMap[b.weekNumber];

      const isSubmittedA = Boolean(
        reportA && reportA.status !== 'DRAFT' && reportA.status !== 'NOT_SUBMITTED'
      );
      const isSubmittedB = Boolean(
        reportB && reportB.status !== 'DRAFT' && reportB.status !== 'NOT_SUBMITTED'
      );

      // 1. Ưu tiên trạng thái: Chưa nộp (false) lên trước, Đã nộp (true) xuống dưới
      if (isSubmittedA !== isSubmittedB) {
        return isSubmittedA ? 1 : -1;
      }

      // 2. Nếu là nhóm CHƯA NỘP: Mặc định sắp xếp tăng dần (tuần nhỏ làm trước: Tuần 2 -> Tuần 3)
      if (!isSubmittedA) {
        return sortAscending
          ? b.weekNumber - a.weekNumber
          : a.weekNumber - b.weekNumber;
      }

      // 3. Nếu là nhóm ĐÃ NỘP: Mặc định sắp xếp giảm dần (tuần mới nhất trên cùng: Tuần 9 -> Tuần 6)
      return sortAscending
        ? a.weekNumber - b.weekNumber
        : b.weekNumber - a.weekNumber;
    });
  }, [weeks, reportMap, sortAscending]);

  const [autoOpenFileForCreate, setAutoOpenFileForCreate] = useState(false);

  const handleOpenCreateForWeek = (week, existing = null, autoFile = false) => {
    if (!isApprovedByTBM) {
      showToast('Bạn chỉ có thể tạo và nộp nhật ký thực tập từng tuần sau khi hồ sơ thực tập đã được Trưởng Bộ Môn (TBM) phê duyệt.', 'warning');
      return;
    }
    if (!hasAssignedLecturer) {
      showToast('Hồ sơ thực tập của bạn chưa được phân công Giảng viên Giám sát. Vui lòng chờ phân công GVGS.', 'warning');
      return;
    }
    setTargetWeekForCreate({
      weekNumber: week.weekNumber,
      startDate: existing?.weekStartDate || week.defaultStartDate || null,
      endDate: existing?.weekEndDate || week.defaultEndDate || null,
    });
    setEditingReport(existing);
    setAutoOpenFileForCreate(autoFile);
    setCreateModalOpen(true);
  };

  const handleOpenUploadForWeek = (week) => {
    handleOpenCreateForWeek(week, null, true);
  };

  const handleOpenConfirm = (report) => {
    setReportToConfirm(report);
    setConfirmModalOpen(true);
  };

  const handleOpenDetail = (report) => {
    setSelectedReport(report);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col lg:flex-row lg:items-center justify-between gap-5">
        <div className="space-y-1">
          <div className="flex items-center gap-2 text-[#123891] font-semibold text-xs tracking-wider uppercase">
            <BookOpen className="w-4 h-4" /> Theo Dõi Tiến Độ Thực Tập
          </div>
          <h1 className="text-xl sm:text-2xl font-black text-slate-900 tracking-tight">
            Nhật Ký Thực Tập
          </h1>
        </div>

        <div className="flex items-center gap-2.5 flex-wrap">
          <button
            type="button"
            onClick={fetchReports}
            className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>

          {isApprovedByTBM && hasAssignedLecturer && (
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-200" />
              <span>Xuất nhật ký</span>
            </button>
          )}
        </div>
      </div>

      {/* 1. Loading State */}
      {loading && (
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <LoadingSkeleton rows={4} cols={4} />
        </div>
      )}

      {/* 2. Unregistered Student Guidance Card */}
      {!loading && !internship && (
        <div className="bg-white rounded-3xl border border-slate-200/80 p-8 sm:p-12 text-center shadow-2xs space-y-4">
          <div className="w-16 h-16 rounded-3xl bg-blue-50 text-[#123891] flex items-center justify-center mx-auto shadow-inner">
            <Briefcase className="w-8 h-8" />
          </div>
          <div className="max-w-md mx-auto space-y-2">
            <h2 className="text-lg font-bold text-slate-800">
              Bạn Chưa Đăng Ký Thực Tập Doanh Nghiệp
            </h2>
            <p className="text-xs text-slate-500 leading-relaxed">
              Bạn chưa có hồ sơ thực tập doanh nghiệp trong hệ thống. Vui lòng đăng ký thực tập và chờ Trưởng Bộ Môn (TBM) phê duyệt trước khi sử dụng chức năng ghi nhật ký thực tập.
            </p>
          </div>
          <div className="pt-2">
            <Link
              to="/student/internship/register"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Briefcase className="w-4 h-4 text-blue-200" />
              <span>Đăng ký thực tập ngay</span>
            </Link>
          </div>
        </div>
      )}

      {/* 3. Registered Internship Overview Summary Card */}
      {!loading && internship && (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0e2c73] via-[#123891] to-[#102d7d] text-white shadow-md border border-blue-800/40 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3 pb-3 border-b border-blue-800/60">
            <div>
              <div className="text-[11px] uppercase tracking-widest text-blue-300 font-bold">
                Đợt Thực Tập Hiện Tại
              </div>
              <div className="text-base sm:text-lg font-black text-white mt-0.5 flex items-center gap-2">
                <Building2 className="w-5 h-5 text-blue-400 shrink-0" />
                <span>{internship.companyId?.name || 'Doanh nghiệp thực tập'}</span>
              </div>
              <div className="text-xs text-blue-200 mt-0.5 flex items-center gap-1.5">
                <Briefcase className="w-3.5 h-3.5 text-blue-400" />
                <span>Vị trí: <strong>{internship.position || 'Thực tập sinh'}</strong></span>
              </div>
            </div>

            <div className="flex items-center gap-2 flex-wrap">
              {!isApprovedByTBM ? (
                <span className="px-3 py-1.5 rounded-xl bg-amber-500/20 border border-amber-400/40 text-amber-200 text-xs font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-amber-300" />
                  <span>Chờ TBM phê duyệt</span>
                </span>
              ) : !hasAssignedLecturer ? (
                <span className="px-3 py-1.5 rounded-xl bg-blue-500/20 border border-blue-400/40 text-blue-200 text-xs font-semibold flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-blue-300" />
                  <span>Chờ phân công GVGS</span>
                </span>
              ) : (
                <span className="px-3 py-1.5 rounded-xl bg-emerald-500/20 border border-emerald-400/40 text-emerald-200 text-xs font-semibold flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-300" />
                  <span>{internship.status === 'COMPLETED' ? 'Đã hoàn thành' : 'Đã phân công GVGS'}</span>
                </span>
              )}
              {hasStudent2 && (
                <div className="px-3 py-1.5 rounded-xl bg-[#123891]/60 border border-[#123891]/60 text-xs flex items-center gap-1.5">
                  <Users className="w-4 h-4 text-blue-300" />
                  <span>
                    Nhóm 2 SV: <strong>{isSV1 ? 'Bạn là SV1' : isSV2 ? 'Bạn là SV2' : 'Nhóm 2 SV'}</strong>
                  </span>
                </div>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 text-xs">
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider block">Ngày bắt đầu</span>
              <span className="font-bold text-sm text-white mt-0.5 block font-mono">{formatDate(internship.startDate)}</span>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider block">Ngày kết thúc</span>
              <span className="font-bold text-sm text-white mt-0.5 block font-mono">{formatDate(internship.endDate)}</span>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider block">Thời lượng & Chu kỳ</span>
              <span className="font-bold text-sm text-blue-300 mt-0.5 block font-mono">{getDurationWeeks(internship)} tuần • {cycle} tuần/lần</span>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider block">Đã hoàn thành</span>
              <span className="font-bold text-sm text-emerald-400 mt-0.5 block font-mono">
                {completedWeeks}/{weeks.length} kỳ nộp
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Warning if internship is not approved yet */}
      {!loading && internship && !isApprovedByTBM && (
        <div className="p-5 rounded-3xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3.5 shadow-2xs">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-amber-900">
              Hồ sơ thực tập đang chờ Trưởng Bộ Môn phê duyệt
            </div>
            <div className="text-amber-800 text-xs leading-relaxed">
              Bạn chỉ có thể tạo và nộp nhật ký thực tập từng tuần sau khi hồ sơ thực tập đã được Trưởng Bộ Môn (TBM) phê duyệt.
            </div>
          </div>
        </div>
      )}

      {/* 4b. Notice if internship is approved but waiting for supervisor assignment */}
      {!loading && internship && isApprovedByTBM && !hasAssignedLecturer && (
        <div className="p-5 rounded-3xl bg-blue-50 border border-blue-200 text-blue-900 text-xs flex items-start gap-3.5 shadow-2xs">
          <Clock className="w-5 h-5 text-[#123891] shrink-0 mt-0.5" />
          <div className="space-y-1">
            <div className="font-bold text-sm text-[#123891]">
              Hồ sơ thực tập đang chờ phân công Giảng viên Giám sát (GVGS)
            </div>
            <div className="text-slate-700 text-xs leading-relaxed">
              Hồ sơ thực tập của bạn đã được Trưởng Bộ Môn phê duyệt thành công. Vui lòng đợi phân công Giảng viên Giám sát để được hướng dẫn ghi nhật ký theo quy định.
            </div>
          </div>
        </div>
      )}

      {/* 5. Main Weeks List (Chỉ hiển thị khi hồ sơ đã được TBM phê duyệt và đã phân công GVGS) */}
      {!loading && isApprovedByTBM && hasAssignedLecturer && (
        <div className="space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h2 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Calendar className="w-4 h-4 text-[#123891]" />
                <span>
                  Danh Sách Nhật Ký Thực Tập ({weeks.length} Kỳ nộp • Chu kỳ {cycle} tuần/lần)
                </span>
              </h2>
              <p className="text-[11px] text-slate-500 mt-0.5">
                {cycle === 1
                  ? 'Nộp định kỳ mỗi tuần theo thời lượng thực tập đã đăng ký.'
                  : `Nộp định kỳ mỗi ${cycle} tuần một lần theo thiết lập của Giảng viên Giám sát.`}
              </p>
            </div>

            <button
              type="button"
              onClick={() => setSortAscending(!sortAscending)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border text-xs font-semibold transition cursor-pointer ${
                !sortAscending
                  ? 'bg-blue-50 border-blue-200 text-[#102d7d]'
                  : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
              }`}
              title={
                !sortAscending
                  ? 'Mặc định: Chưa nộp (Tuần 1 → N) • Đã nộp (Tuần mới nhất). Bấm để đảo thứ tự'
                  : 'Đang đảo thứ tự hiển thị. Bấm để trở về mặc định'
              }
            >
              <ArrowUpDown className="w-3.5 h-3.5" />
              <span>
                {!sortAscending
                  ? 'Chưa nộp (Tuần 1 → N)'
                  : 'Đảo thứ tự tuần'}
              </span>
            </button>
          </div>

          {displayedWeeks.length === 0 ? (
            <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs">
              <EmptyState
                title="Chưa có dữ liệu tuần thực tập"
                description="Hồ sơ thực tập chưa được thiết lập ngày bắt đầu và kết thúc hợp lệ để tạo danh sách tuần."
              />
            </div>
          ) : (
            <div className="space-y-3.5">
              {displayedWeeks.map((week) => {
                const report = reportMap[week.weekNumber];
                const status = report ? report.status : 'NOT_SUBMITTED';

                const displayStartDate = report?.weekStartDate || week.defaultStartDate;
                const displayEndDate = report?.weekEndDate || week.defaultEndDate;
                const isLocked = isWeekEnded(displayEndDate);

                const fileName = report?.file?.originalName || report?.file?.fileName;
                const fileUrl = report?.file?.fileUrl ? getFileUrl(report.file.fileUrl) : '';

                const isWaitingStudent2 = status === 'WAITING_STUDENT_2';
                const isNeedsRevision = status === 'NEEDS_REVISION';
                const isApproved = status === 'APPROVED';

                return (
                  <div
                    key={week.weekNumber}
                    className={`p-5 rounded-3xl bg-white border transition-all shadow-2xs ${
                      isWaitingStudent2
                        ? 'border-amber-300 ring-2 ring-amber-100'
                        : isNeedsRevision
                        ? 'border-rose-300 ring-2 ring-rose-100'
                        : isApproved
                        ? 'border-emerald-200 hover:border-emerald-300'
                        : report
                        ? 'border-slate-200/90 hover:border-blue-200'
                        : isLocked
                        ? 'border-slate-200/60 bg-slate-50/40 opacity-80'
                        : 'border-dashed border-slate-200 hover:border-slate-300 bg-slate-50/40'
                    }`}
                  >
                    {/* 1. Card Header: Week Title & Status Badges */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-slate-100 pb-3">
                      <div className="flex items-center gap-2.5 flex-wrap">
                        <span
                          className={`text-xs font-bold px-3 py-1 rounded-xl border ${
                            report
                              ? 'bg-blue-50 text-[#102d7d] border-blue-200 font-mono'
                              : 'bg-slate-100 text-slate-600 border-slate-200 font-mono'
                          }`}
                        >
                          {week.label}
                        </span>

                        <span className="text-xs font-semibold text-slate-700 font-mono flex items-center gap-1.5">
                          <Calendar className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                          <span>
                            {displayStartDate && displayEndDate
                              ? `${formatDate(displayStartDate)} — ${formatDate(displayEndDate)}`
                              : displayStartDate
                              ? formatDate(displayStartDate)
                              : 'Chưa cập nhật ngày'}
                          </span>
                        </span>
                      </div>

                      <div className="flex flex-wrap items-center gap-1.5">
                        {/* Tag 1: Trạng thái nộp / kết quả chấm */}
                        {report?.lecturerScore !== null && report?.lecturerScore !== undefined ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <Award className="w-3 h-3 text-emerald-600" />
                            <span>GVGS đã chấm: {report.lecturerScore}/10</span>
                          </span>
                        ) : status === 'APPROVED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                            <span>Đạt yêu cầu</span>
                          </span>
                        ) : status === 'SUBMITTED' || status === 'REVIEWING' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#102d7d] border border-blue-200">
                            <CheckCircle2 className="w-3 h-3 text-blue-600" />
                            <span>{hasStudent2 ? 'SV2 đã xác nhận • Đã gửi GVGS' : 'Đã nộp'}</span>
                          </span>
                        ) : status === 'WAITING_STUDENT_2' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-50 text-amber-700 border border-amber-200">
                            <Clock className="w-3 h-3 text-amber-600" />
                            <span>Chờ SV2 xác nhận</span>
                          </span>
                        ) : status === 'NEEDS_REVISION' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>Cần chỉnh sửa</span>
                          </span>
                        ) : status === 'REJECTED' ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                            <AlertTriangle className="w-3 h-3 text-rose-600" />
                            <span>GVGS yêu cầu sửa</span>
                          </span>
                        ) : status === 'DRAFT' ? (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Bản nháp
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-slate-100 text-slate-600 border border-slate-200">
                            Chưa nộp
                          </span>
                        )}

                        {/* Tag 2: Thời hạn (Đúng hạn / Quá hạn / Đã khóa / Còn hạn) */}
                        {(() => {
                          const deadline = displayEndDate ? new Date(displayEndDate) : null;
                          if (deadline) deadline.setHours(23, 59, 59, 999);
                          const now = new Date();
                          const isEnded = deadline ? now.getTime() > deadline.getTime() : false;

                          if (report?.submittedAt) {
                            const isLate = deadline ? new Date(report.submittedAt) > deadline : false;
                            return isLate ? (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                Nộp trễ
                              </span>
                            ) : (
                              <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Đúng hạn
                              </span>
                            );
                          }

                          if (isEnded) {
                            return (
                              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-50 text-rose-700 border border-rose-200">
                                <Lock className="w-3 h-3" /> Đã kết thúc
                              </span>
                            );
                          }

                          return (
                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-50 text-[#123891] border border-blue-200">
                              Còn hạn nộp
                            </span>
                          );
                        })()}
                      </div>
                    </div>

                    {/* 2. Body Content */}
                    <div className="py-2.5 space-y-2.5">
                      {report ? (
                        <>
                          <h4 className="text-sm font-bold text-slate-900 line-clamp-1" title={report.title}>
                            {report.title}
                          </h4>
                          {report.content ? (
                            <p className="text-xs text-slate-700 leading-relaxed whitespace-pre-wrap line-clamp-3" title={report.content}>
                              {report.content}
                            </p>
                          ) : (
                            <p className="text-xs text-slate-400 italic">
                              (Không có nội dung mô tả, xem tệp đính kèm)
                            </p>
                          )}

                          {/* File Attachment */}
                          {fileName && (
                            <div className="flex flex-wrap items-center justify-between gap-2 text-xs text-[#102d7d] bg-blue-50/60 px-3.5 py-2 rounded-2xl border border-blue-100">
                              <div className="flex items-center gap-2 min-w-0">
                                <Paperclip className="w-4 h-4 shrink-0 text-[#123891]" />
                                <span className="truncate font-semibold max-w-[260px] sm:max-w-md" title={fileName}>
                                  {fileName}
                                </span>
                                {report.file?.size && (
                                  <span className="text-[11px] text-[#123891] font-mono">
                                    ({formatFileSize(report.file.size)})
                                  </span>
                                )}
                              </div>

                              {fileUrl && (
                                <div className="flex items-center gap-2 shrink-0">
                                  <a
                                    href={fileUrl}
                                    target="_blank"
                                    rel="noreferrer"
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-white hover:bg-[#123891] hover:text-white border border-blue-200 rounded-lg text-xs font-semibold text-[#102d7d] transition cursor-pointer"
                                  >
                                    <ExternalLink className="w-3 h-3" />
                                    <span>Xem file</span>
                                  </a>
                                  <a
                                    href={fileUrl}
                                    download={fileName}
                                    className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#123891] hover:bg-[#102d7d] text-white rounded-lg text-xs font-semibold transition cursor-pointer"
                                  >
                                    <Download className="w-3 h-3" />
                                    <span>Tải về</span>
                                  </a>
                                </div>
                              )}
                            </div>
                          )}

                          {/* SV2 Rejection Notice Alert */}
                          {isNeedsRevision && report.student2RejectedReason && (
                            <div className="p-3 rounded-2xl bg-rose-50 border border-rose-200 text-xs text-rose-900 space-y-1">
                              <div className="flex items-center gap-1.5 font-bold text-rose-700">
                                <AlertTriangle className="w-4 h-4" />
                                <span>Lý do SV2 yêu cầu chỉnh sửa:</span>
                              </div>
                              <p className="leading-relaxed pl-5 font-medium">
                                "{report.student2RejectedReason}"
                              </p>
                            </div>
                          )}

                          {/* SV2 Confirmation Info */}
                          {report.student2Status === 'CONFIRMED' && (
                            <div className="text-[11px] text-emerald-700 flex items-center gap-1 font-medium bg-emerald-50/50 px-2.5 py-1 rounded-xl border border-emerald-100 w-fit">
                              <Check className="w-3.5 h-3.5 text-emerald-600" />
                              <span>
                                Thành viên nhóm (SV2) đã xác nhận lúc {formatDate(report.student2ConfirmedAt)}
                              </span>
                            </div>
                          )}

                          {/* Lecturer Comment */}
                          {report.lecturerComment && (
                            <div className="p-3.5 rounded-2xl border text-xs space-y-1 bg-slate-50 border-slate-200 text-slate-900">
                              <div className="flex items-center justify-between font-bold text-[11px] uppercase tracking-wider text-[#123891]">
                                <span>Nhận xét của Giảng viên Giám sát</span>
                              </div>
                              <p className="leading-relaxed mt-1 text-[11px]">
                                {report.lecturerComment}
                              </p>
                            </div>
                          )}
                        </>
                      ) : (
                        <div className="py-2 text-xs text-slate-400 italic">
                          {isLocked
                            ? 'Tuần thực tập đã kết thúc. Nhật ký của tuần này đã bị khóa, không thể tạo mới hoặc nộp bổ sung.'
                            : 'Chưa có nhật ký cho tuần này. Nhấn "Viết nhật ký" hoặc "Tải lên tệp" để cập nhật nội dung công việc.'}
                        </div>
                      )}
                    </div>

                    {/* 3. Card Actions Footer */}
                    <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pt-3 border-t border-slate-100 text-[11px] text-slate-400">
                      <div>
                        {report ? (
                          <span>
                            Người nộp:{' '}
                            <strong className="text-slate-600">
                              {report.studentId?.userId?.fullName || student?.userId?.fullName || 'Sinh viên'}
                            </strong>
                            {report.submittedAt ? ` • Nộp lúc: ${formatDate(report.submittedAt)}` : ''}
                          </span>
                        ) : (
                          <span>
                            {isLocked
                              ? 'Đã hết thời hạn ghi nhận'
                              : week.isCycleWeek
                              ? `Hạn nộp định kỳ: ${formatDate(displayEndDate)}`
                              : `Không yêu cầu nộp (Chu kỳ ${cycle} tuần/lần)`}
                          </span>
                        )}
                      </div>

                      <div className="flex items-center gap-2 self-end sm:self-auto flex-wrap">
                        {/* Khi CHƯA nộp: Hiển thị "Tải lên tệp" & "Viết nhật ký" nếu còn hạn và thuộc chu kỳ */}
                        {!report && isApprovedByTBM && (
                          !isLocked && week.isCycleWeek ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenUploadForWeek(week)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#102d7d] font-bold rounded-xl border border-blue-200 transition cursor-pointer text-xs"
                              >
                                <Paperclip className="w-3.5 h-3.5 text-[#123891]" />
                                <span>Tải lên tệp</span>
                              </button>
                              <button
                                type="button"
                                onClick={() => handleOpenCreateForWeek(week)}
                                className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-[#123891] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-xs transition cursor-pointer text-xs"
                              >
                                <PlusCircle className="w-3.5 h-3.5" />
                                <span>Viết nhật ký</span>
                              </button>
                            </>
                          ) : null
                        )}

                        {/* Khi ĐÃ có nhật ký: Chỉnh sửa nếu cho phép & chưa khóa */}
                        {report && (report.status === 'DRAFT' || report.status === 'NEEDS_REVISION' || report.status === 'REJECTED') && (
                          !isLocked ? (
                            <button
                              type="button"
                              onClick={() => handleOpenCreateForWeek(week, report)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#123891] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-xs transition cursor-pointer text-xs"
                            >
                              <Edit3 className="w-3.5 h-3.5" />
                              <span>{report.status === 'REJECTED' ? 'Viết lại' : 'Chỉnh sửa'}</span>
                            </button>
                          ) : null
                        )}

                        {/* SV2 Xác nhận */}
                        {report && report.status === 'WAITING_STUDENT_2' && isSV2 && !isLocked && (
                          <button
                            type="button"
                            onClick={() => handleOpenConfirm(report)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer text-xs"
                          >
                            <ShieldCheck className="w-3.5 h-3.5" />
                            <span>Xác nhận</span>
                          </button>
                        )}

                        {/* Xem chi tiết */}
                        {report && (
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(report)}
                            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
                            title="Xem chi tiết nhật ký"
                          >
                            <Eye className="w-3.5 h-3.5 text-slate-500" />
                            <span>Xem chi tiết</span>
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      )}

      {/* Modals */}
      <StudentReportModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setTargetWeekForCreate(null);
          setEditingReport(null);
          setAutoOpenFileForCreate(false);
        }}
        internship={internship}
        targetWeek={targetWeekForCreate}
        editingReport={editingReport}
        autoOpenFile={autoOpenFileForCreate}
        onCreated={fetchReports}
      />

      <Student2ConfirmModal
        isOpen={confirmModalOpen}
        onClose={() => {
          setConfirmModalOpen(false);
          setReportToConfirm(null);
        }}
        report={reportToConfirm}
        onConfirmed={fetchReports}
      />

      <StudentReportDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedReport(null);
        }}
        report={selectedReport}
      />

      {isApprovedByTBM && hasAssignedLecturer && (
        <ExportInternshipDiaryModal
          isOpen={exportModalOpen}
          onClose={() => setExportModalOpen(false)}
          student={student}
          internship={internship}
          weeks={weeks.map((w) => {
            const r = reportMap[w.weekNumber];
            return {
              weekNumber: w.weekNumber,
              startDate: r?.weekStartDate || w.defaultStartDate,
              endDate: r?.weekEndDate || w.defaultEndDate,
            };
          })}
          reports={reports}
        />
      )}
    </div>
  );
};

export default StudentReportPage;
