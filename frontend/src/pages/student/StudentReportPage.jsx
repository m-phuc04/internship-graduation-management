import React, { useState, useEffect, useCallback, useMemo } from 'react';
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

import {
  BookOpen,
  Calendar,
  Building2,
  Briefcase,
  User,
  Users,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FileText,
  Paperclip,
  Download,
  Eye,
  Edit3,
  ShieldCheck,
  Printer,
  RefreshCw,
  Award,
  ChevronRight,
} from 'lucide-react';

/**
 * Calculates weeks from startDate to endDate dynamically.
 * Week 1: startDate -> startDate + 6 days
 * Week 2: next day -> next day + 6 days
 * ...
 * Last week: clamped at endDate
 */
const calculateWeeks = (startDateStr, endDateStr) => {
  if (!startDateStr || !endDateStr) return [];
  const start = new Date(startDateStr);
  const end = new Date(endDateStr);
  if (isNaN(start.getTime()) || isNaN(end.getTime()) || start > end) return [];

  const weeks = [];
  let currentStart = new Date(start);
  let weekNum = 1;

  while (currentStart <= end) {
    let currentEnd = new Date(currentStart);
    currentEnd.setDate(currentEnd.getDate() + 6);

    // If currentEnd exceeds internship end date, clamp to endDate
    if (currentEnd > end) {
      currentEnd = new Date(end);
    }

    weeks.push({
      weekNumber: weekNum,
      startDate: new Date(currentStart),
      endDate: new Date(currentEnd),
    });

    if (currentEnd.getTime() >= end.getTime()) {
      break;
    }

    const nextStart = new Date(currentEnd);
    nextStart.setDate(nextStart.getDate() + 1);
    currentStart = nextStart;
    weekNum++;
  }

  return weeks;
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

  // Calculate Weeks
  const weeks = useMemo(() => {
    if (!internship?.startDate || !internship?.endDate) return [];
    return calculateWeeks(internship.startDate, internship.endDate);
  }, [internship?.startDate, internship?.endDate]);

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

  // Statistics
  const totalWeeks = weeks.length;
  const completedWeeks = useMemo(() => {
    return Object.values(reportMap).filter(
      (r) => ['SUBMITTED', 'REVIEWING', 'APPROVED'].includes(r.status),
    ).length;
  }, [reportMap]);

  const isReady =
    internship &&
    ['APPROVED', 'INTERNING', 'PENDING_SUPERVISOR_ACCEPTANCE', 'COMPLETED'].includes(
      internship.status,
    );

  const handleOpenCreateForWeek = (week, existing = null) => {
    setTargetWeekForCreate(week);
    setEditingReport(existing);
    setCreateModalOpen(true);
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
          <p className="text-xs text-slate-500">
            Quản lý và ghi nhật ký công việc thực tập theo từng tuần, tự động đồng bộ và nộp cho Giảng viên hướng dẫn
          </p>
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

          {isReady && (
            <button
              type="button"
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-slate-900 hover:bg-slate-800 text-white rounded-xl text-xs font-bold shadow-sm transition cursor-pointer"
            >
              <Printer className="w-4 h-4 text-blue-400" />
              <span>Xuất nhật ký</span>
            </button>
          )}
        </div>
      </div>

      {/* Internship Overview Summary Card */}
      {internship && (
        <div className="p-5 rounded-3xl bg-gradient-to-br from-[#0e2c73] via-indigo-950 to-slate-950 text-white shadow-md border border-indigo-800/40 space-y-4">
          <div className="flex items-start justify-between flex-wrap gap-3 pb-3 border-b border-indigo-800/60">
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

            {hasStudent2 && (
              <div className="px-3 py-1.5 rounded-xl bg-indigo-800/60 border border-indigo-700/60 text-xs flex items-center gap-1.5">
                <Users className="w-4 h-4 text-blue-300" />
                <span>
                  Nhóm 2 SV: <strong>{isSV1 ? 'Bạn là SV1' : isSV2 ? 'Bạn là SV2' : 'Nhóm 2 SV'}</strong>
                </span>
              </div>
            )}
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
              <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider block">Tổng số tuần</span>
              <span className="font-bold text-sm text-blue-300 mt-0.5 block font-mono">{totalWeeks} tuần</span>
            </div>
            <div className="p-3 bg-white/5 rounded-2xl border border-white/10">
              <span className="text-[10px] text-blue-300 uppercase font-bold tracking-wider block">Đã hoàn thành</span>
              <span className="font-bold text-sm text-emerald-400 mt-0.5 block font-mono">{completedWeeks}/{totalWeeks} tuần</span>
            </div>
          </div>
        </div>
      )}

      {/* Warning if internship is not approved yet */}
      {!loading && !isReady && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-900 text-xs flex items-start gap-3">
          <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Hồ sơ thực tập chưa sẵn sàng ghi nhật ký</div>
            <div className="text-amber-800 text-[11px] mt-0.5 leading-relaxed">
              Bạn chỉ có thể tạo và nộp nhật ký thực tập từng tuần sau khi hồ sơ thực tập đã được Trưởng Bộ Môn (TBM) phê duyệt (Trạng thái APPROVED hoặc INTERNING).
            </div>
          </div>
        </div>
      )}

      {/* Main Weeks List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold uppercase tracking-wider text-slate-700 flex items-center gap-2">
            <Calendar className="w-4 h-4 text-[#123891]" />
            Danh Sách Nhật Ký Hàng Tuần ({weeks.length} Tuần)
          </h2>
          <span className="text-xs text-slate-500">
            Tự động chia theo thời gian thực tập ({formatDate(internship?.startDate)} — {formatDate(internship?.endDate)})
          </span>
        </div>

        {loading ? (
          <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
            <LoadingSkeleton rows={4} cols={4} />
          </div>
        ) : weeks.length === 0 ? (
          <div className="bg-white rounded-3xl border border-slate-200/80 p-8 shadow-2xs">
            <EmptyState
              title="Chưa có dữ liệu tuần thực tập"
              description="Hồ sơ thực tập chưa được thiết lập ngày bắt đầu và kết thúc hợp lệ để tạo danh sách tuần."
            />
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {weeks.map((week) => {
              const report = reportMap[week.weekNumber];
              const isSubmitted = !!report;
              const status = report ? report.status : 'NOT_SUBMITTED';

              return (
                <div
                  key={week.weekNumber}
                  className={`p-5 rounded-3xl border transition-all shadow-2xs space-y-4 flex flex-col justify-between ${
                    status === 'APPROVED'
                      ? 'bg-emerald-50/40 border-emerald-200/80'
                      : status === 'WAITING_STUDENT_2'
                      ? 'bg-amber-50/40 border-amber-200/80'
                      : status === 'NEEDS_REVISION'
                      ? 'bg-rose-50/40 border-rose-200/80'
                      : status === 'SUBMITTED' || status === 'REVIEWING'
                      ? 'bg-blue-50/40 border-blue-200/80'
                      : 'bg-white border-slate-200/80 hover:border-slate-300'
                  }`}
                >
                  {/* Top: Week Header & Status */}
                  <div className="space-y-2">
                    <div className="flex items-center justify-between gap-2 flex-wrap">
                      <div className="flex items-center gap-2">
                        <span className="font-black text-xs px-2.5 py-1 rounded-xl bg-slate-900 text-white font-mono shadow-2xs">
                          TUẦN {week.weekNumber}
                        </span>
                        <div className="text-xs font-semibold text-slate-700 flex items-center gap-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          <span>{formatDate(week.startDate)} — {formatDate(week.endDate)}</span>
                        </div>
                      </div>

                      {/* Status Tag */}
                      {status === 'NOT_SUBMITTED' && (
                        <span className="text-[11px] font-bold text-slate-400 bg-slate-100 px-2.5 py-1 rounded-lg">
                          Chưa nộp
                        </span>
                      )}
                      {status === 'DRAFT' && (
                        <span className="text-[11px] font-bold text-slate-600 bg-slate-100 border border-slate-200 px-2.5 py-1 rounded-lg">
                          Bản nháp
                        </span>
                      )}
                      {status === 'WAITING_STUDENT_2' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-amber-700 bg-amber-100/70 border border-amber-200 px-2.5 py-1 rounded-lg">
                          <Clock className="w-3 h-3" />
                          <span>Chờ SV2 xác nhận</span>
                        </span>
                      )}
                      {status === 'NEEDS_REVISION' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/70 border border-rose-200 px-2.5 py-1 rounded-lg">
                          <AlertTriangle className="w-3 h-3" />
                          <span>Cần chỉnh sửa</span>
                        </span>
                      )}
                      {(status === 'SUBMITTED' || status === 'REVIEWING') && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-[#102d7d] bg-blue-100/70 border border-blue-200 px-2.5 py-1 rounded-lg">
                          <CheckCircle2 className="w-3 h-3" />
                          <span>{hasStudent2 ? 'SV2 đã xác nhận • Đã gửi GVHD' : 'Đã gửi GVHD'}</span>
                        </span>
                      )}
                      {status === 'APPROVED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-100/70 border border-emerald-200 px-2.5 py-1 rounded-lg">
                          <Award className="w-3 h-3" />
                          <span>GVHD đã chấm: {report.lecturerScore !== null ? `${report.lecturerScore}/10` : 'Đạt'}</span>
                        </span>
                      )}
                      {status === 'REJECTED' && (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-100/70 border border-rose-200 px-2.5 py-1 rounded-lg">
                          <span>GVHD yêu cầu sửa</span>
                        </span>
                      )}
                    </div>

                    {/* Report Content Preview if exists */}
                    {report ? (
                      <div className="space-y-1.5 pt-1">
                        <div className="font-bold text-slate-900 text-xs line-clamp-1">
                          {report.title}
                        </div>

                        {report.content && (
                          <p className="text-[11px] text-slate-600 line-clamp-2 leading-relaxed bg-white/70 p-2.5 rounded-xl border border-slate-200/60">
                            {report.content}
                          </p>
                        )}

                        {report.file?.originalName && (
                          <div className="inline-flex items-center gap-1 text-[10px] text-[#102d7d] font-semibold bg-blue-50 border border-blue-100 px-2.5 py-1 rounded-lg truncate max-w-full">
                            <Paperclip className="w-3 h-3 shrink-0" />
                            <span className="truncate">{report.file.originalName}</span>
                          </div>
                        )}

                        {/* Rejection Notice if Needs Revision */}
                        {status === 'NEEDS_REVISION' && report.student2RejectedReason && (
                          <div className="p-2.5 bg-rose-100/80 border border-rose-200 rounded-xl text-[11px] text-rose-900">
                            <strong>Lý do SV2 từ chối:</strong> {report.student2RejectedReason}
                          </div>
                        )}
                      </div>
                    ) : (
                      <div className="text-[11px] text-slate-400 italic py-2">
                        Chưa nộp nhật ký tuần này.
                      </div>
                    )}
                  </div>

                  {/* Bottom: Action Buttons */}
                  <div className="pt-3 border-t border-slate-200/60 flex items-center justify-between gap-2 flex-wrap">
                    {/* Timestamp */}
                    <div className="text-[10px] text-slate-400 font-mono">
                      {report?.submittedAt ? `Nộp: ${formatDate(report.submittedAt)}` : ''}
                    </div>

                    {/* Actions depending on state */}
                    <div className="flex items-center gap-2">
                      {/* Case A: Not submitted yet */}
                      {!report && isReady && (
                        <button
                          type="button"
                          onClick={() => handleOpenCreateForWeek(week)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#123891] hover:bg-[#102d7d] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Viết báo cáo</span>
                        </button>
                      )}

                      {/* Case B: Draft or Needs Revision (SV1 edit) */}
                      {report && (report.status === 'DRAFT' || report.status === 'NEEDS_REVISION') && (
                        <button
                          type="button"
                          onClick={() => handleOpenCreateForWeek(week, report)}
                          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#123891] hover:bg-[#102d7d] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                        >
                          <Edit3 className="w-3.5 h-3.5" />
                          <span>Chỉnh sửa báo cáo</span>
                        </button>
                      )}

                      {/* Case C: Waiting for SV2 */}
                      {report && report.status === 'WAITING_STUDENT_2' && (
                        <>
                          {isSV2 ? (
                            <button
                              type="button"
                              onClick={() => handleOpenConfirm(report)}
                              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
                            >
                              <ShieldCheck className="w-3.5 h-3.5" />
                              <span>Kiểm tra & Xác nhận</span>
                            </button>
                          ) : (
                            <span className="text-[11px] text-amber-700 font-semibold italic">
                              Đang chờ SV2 xác nhận
                            </span>
                          )}
                        </>
                      )}

                      {/* Case D: View Details */}
                      {report && (
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(report)}
                          className="inline-flex items-center gap-1 px-3 py-2 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-semibold transition cursor-pointer"
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

      {/* Modals */}
      <StudentReportModal
        isOpen={createModalOpen}
        onClose={() => {
          setCreateModalOpen(false);
          setTargetWeekForCreate(null);
          setEditingReport(null);
        }}
        internship={internship}
        targetWeek={targetWeekForCreate}
        editingReport={editingReport}
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

      <ExportInternshipDiaryModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        student={student}
        internship={internship}
        weeks={weeks}
        reports={reports}
      />
    </div>
  );
};

export default StudentReportPage;
