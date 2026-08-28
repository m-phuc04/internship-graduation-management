import React, { useState, useEffect, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import dashboardApi from '../../api/dashboardApi';
import notificationApi from '../../api/notificationApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

import {
  GraduationCap,
  Briefcase,
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
  AlertCircle,
  AlertTriangle,
  ArrowRight,
  PlusCircle,
  FileText,
  Building2,
  Calendar,
  Bell,
  RefreshCw,
  User,
  ShieldCheck,
  Sparkles,
  ChevronRight,
  XCircle,
  RotateCcw,
} from 'lucide-react';

const StudentDashboard = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const { currentTerm } = useAcademicTerm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getStudentDashboard({
        academicTermId: currentTerm?._id || '',
      });
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải bảng tổng quan', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentTerm?._id, showToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  const formatDate = (dateString) => {
    if (!dateString) return '—';
    return new Date(dateString).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  const handleNotificationClick = async (noti) => {
    if (!noti.isRead) {
      try {
        await notificationApi.markAsRead(noti._id);
        setData((prev) => {
          if (!prev) return prev;
          return {
            ...prev,
            notifications: (prev.notifications || []).map((n) =>
              n._id === noti._id ? { ...n, isRead: true } : n,
            ),
          };
        });
      } catch {
        // ignore
      }
    }

    let targetLink = noti.link;

    if (targetLink) {
      if (targetLink.startsWith('/lecturer/reports') || targetLink.startsWith('/tbm/reports')) {
        targetLink = '/student/reports';
      } else if (
        targetLink.startsWith('/lecturer/internships') ||
        targetLink.startsWith('/tbm/internships') ||
        targetLink.startsWith('/tbm/evaluations')
      ) {
        targetLink = '/student/internship';
      } else if (
        targetLink.startsWith('/lecturer/theses/progress') ||
        targetLink.startsWith('/tbm/theses/progress')
      ) {
        targetLink = '/student/thesis/progress';
      } else if (
        targetLink.startsWith('/lecturer/theses') ||
        targetLink.startsWith('/tbm/theses') ||
        targetLink.startsWith('/tbm/thesis-evaluations')
      ) {
        targetLink = '/student/thesis';
      }
    }

    if (!targetLink) {
      const type = noti.type;
      const refModel = noti.referenceModel;
      const title = noti.title?.toLowerCase() || '';
      const message = noti.message?.toLowerCase() || '';

      if (
        type === 'EVALUATION' ||
        refModel === 'Evaluation' ||
        title.includes('đánh giá') ||
        message.includes('đánh giá thực tập') ||
        message.includes('phiếu đánh giá')
      ) {
        targetLink = '/student/internship';
      } else if (
        type === 'INTERNSHIP_REPORT' ||
        refModel === 'InternshipReport' ||
        title.includes('báo cáo thực tập') ||
        message.includes('báo cáo thực tập')
      ) {
        targetLink = '/student/reports';
      } else if (
        type === 'INTERNSHIP' ||
        refModel === 'Internship' ||
        title.includes('thực tập') ||
        message.includes('thực tập')
      ) {
        targetLink = '/student/internship';
      } else if (
        type === 'THESIS_PROGRESS' ||
        refModel === 'ThesisProgress' ||
        title.includes('tiến độ') ||
        title.includes('báo cáo tiến độ') ||
        message.includes('tiến độ')
      ) {
        targetLink = '/student/thesis/progress';
      } else if (
        type === 'THESIS' ||
        refModel === 'Thesis' ||
        title.includes('khóa luận') ||
        message.includes('khóa luận') ||
        title.includes('đề tài') ||
        message.includes('đề tài')
      ) {
        targetLink = '/student/thesis';
      } else {
        targetLink = '/student/dashboard';
      }
    }

    if (targetLink) {
      navigate(targetLink, {
        state: {
          notificationId: noti._id,
          referenceId: noti.referenceId,
          referenceModel: noti.referenceModel,
          refreshedAt: Date.now(),
        },
      });
    }
  };

  if (loading) {
    return (
      <div className="p-6 space-y-6">
        <LoadingSkeleton rows={4} cols={3} />
      </div>
    );
  }

  const student = data?.student;
  const internship = data?.internship;
  const thesis = data?.thesis;
  const latestReport = data?.latestReport;
  const latestProgress = data?.latestProgress;
  const notifications = data?.notifications || [];
  const pendingActions = data?.pendingActions || [];

  return (
    <div className="space-y-4 sm:space-y-6 max-w-full overflow-hidden">
      {/* 1. Top Student Identity Card */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-linear-to-r from-indigo-700 via-indigo-600 to-violet-600 text-white shadow-lg shadow-indigo-200/50 flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-6 relative overflow-hidden">
        <div className="absolute top-0 right-0 -mt-10 -mr-10 w-48 h-48 bg-white/10 rounded-full blur-2xl pointer-events-none" />

        <div className="flex items-start sm:items-center gap-3 sm:gap-4 z-10 min-w-0 w-full md:w-auto">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-white/15 backdrop-blur-md border border-white/20 flex items-center justify-center text-white font-bold text-lg sm:text-xl shadow-md shrink-0">
            {student?.userId?.fullName ? student.userId.fullName.charAt(0).toUpperCase() : 'S'}
          </div>
          <div className="min-w-0 flex-1">
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-white/20 text-white text-[10px] sm:text-[10.5px] font-bold tracking-wide uppercase">
              <Sparkles className="w-3 h-3 text-indigo-200" />
              <span>Sinh viên chính quy</span>
            </div>
            <h1 className="text-lg sm:text-2xl font-black text-white mt-1 tracking-tight break-words">
              {student?.userId?.fullName || user?.fullName || 'Sinh viên'}
            </h1>
            <div className="flex flex-wrap items-center gap-x-2 sm:gap-x-4 gap-y-1 text-[11px] sm:text-xs text-indigo-100 mt-1.5 font-medium">
              <span>MSSV: <strong className="text-white font-mono">{student?.studentCode || user?.studentCode || '—'}</strong></span>
              <span>•</span>
              <span>Lớp: <strong className="text-white">{student?.className || '—'}</strong></span>
              <span>•</span>
              <span>GPA: <strong className="text-white font-mono">{student?.gpa !== undefined ? Number(student.gpa).toFixed(2) : '—'} / 4.0</strong></span>
              <span>•</span>
              <span>Tín chỉ: <strong className="text-white font-mono">{student?.accumulatedCredits || student?.creditsAccumulated || '—'} TC</strong></span>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 z-10 self-stretch sm:self-auto shrink-0 justify-end sm:justify-start">
          <Link
            to="/student/profile"
            className="flex-1 sm:flex-initial px-3.5 py-2 sm:px-4 sm:py-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl text-xs font-bold transition border border-white/20 inline-flex items-center justify-center gap-1.5 shadow-2xs"
          >
            <User className="w-3.5 h-3.5" />
            <span>Hồ sơ cá nhân</span>
          </Link>

          <button
            onClick={fetchDashboard}
            className="p-2 sm:p-2.5 bg-white/15 hover:bg-white/25 text-white rounded-xl transition border border-white/20 shadow-2xs cursor-pointer"
            title="Làm mới dữ liệu"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* 2. Core Operational Modules (TTDN & KLTN) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Module 1: Thực tập Doanh nghiệp (TTDN) */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold shrink-0">
                  <Briefcase className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 truncate">Thực tập Doanh nghiệp (TTDN)</h2>
                  <p className="text-[11px] text-slate-400 font-medium truncate hidden sm:block">Hồ sơ và quá trình thực tập tại doanh nghiệp</p>
                </div>
              </div>
              <div className="shrink-0">
                {internship ? (
                  <StatusBadge status={internship.status} size="sm" />
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    Chưa đăng ký
                  </span>
                )}
              </div>
            </div>

            <div className="pt-4">
              {internship ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                    <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-1.5 sm:gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wider">Doanh nghiệp tiếp nhận</div>
                        <div className="font-bold text-slate-900 text-sm mt-0.5 break-words line-clamp-2">
                          {internship.companyId?.name || internship.companyId?.companyName || '—'}
                        </div>
                      </div>
                      <div className="sm:text-right shrink-0">
                        <div className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wider">Vị trí</div>
                        <div className="font-semibold text-indigo-600 mt-0.5 break-words">
                          {internship.position || 'Thực tập sinh'}
                        </div>
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[11px] text-slate-600">
                      <div className="min-w-0">
                        <span className="text-slate-400">GVHD:</span>{' '}
                        <strong className="text-slate-800 break-words">{internship.lecturerId?.userId?.fullName || 'Chưa phân công'}</strong>
                      </div>
                      <div className="sm:text-right min-w-0">
                        <span className="text-slate-400">Thời gian:</span>{' '}
                        <span className="text-slate-800 font-mono">{formatDate(internship.startDate)} - {formatDate(internship.endDate)}</span>
                      </div>
                    </div>
                  </div>

                  {internship.status === 'REJECTED' && (
                    <div className="p-3.5 rounded-2xl bg-rose-50 border border-rose-200 text-rose-900 space-y-1.5">
                      <div className="flex items-center gap-1.5 font-bold text-xs text-rose-800">
                        <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                        <span>Hồ sơ thực tập đã bị từ chối</span>
                      </div>
                      <div className="text-[11.5px] text-slate-800 bg-white p-2.5 rounded-xl border border-rose-200">
                        <span className="font-bold text-rose-800 block mb-0.5">Lý do từ chối:</span>
                        <p className="leading-relaxed font-medium break-words">
                          {internship.rejectionReason?.trim() ||
                            internship.rejectReason?.trim() ||
                            internship.reason?.trim() ||
                            'Chưa có thông tin lý do từ chối.'}
                        </p>
                      </div>
                    </div>
                  )}

                  {internship.status !== 'REJECTED' && (
                    <div className="p-2.5 sm:p-3 rounded-xl bg-indigo-50/50 border border-indigo-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                      <div className="flex items-center gap-2 min-w-0">
                        <FileText className="w-4 h-4 text-indigo-600 shrink-0" />
                        <div className="min-w-0 truncate">
                          <span className="text-slate-500 text-[11px]">Báo cáo gần nhất:</span>{' '}
                          <strong className="text-slate-900 truncate">
                            {latestReport
                              ? `${latestReport.reportType === 'WEEKLY' ? `Tuần ${latestReport.weekNumber}` : `Tháng ${latestReport.monthNumber}`}: ${latestReport.title}`
                              : 'Chưa có báo cáo nào'}
                          </strong>
                        </div>
                      </div>
                      {latestReport && (
                        <div className="shrink-0 self-start sm:self-auto">
                          <StatusBadge status={latestReport.status} size="sm" />
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 mx-auto flex items-center justify-center">
                    <Briefcase className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Bạn chưa đăng ký Thực tập Doanh nghiệp</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Vui lòng điền thông tin doanh nghiệp tiếp nhận để bắt đầu học phần thực tập.
                    </div>
                  </div>
                  <Link
                    to="/student/internship/register"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Đăng ký thực tập ngay</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {internship && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <Link
                to="/student/internship"
                className="font-bold text-slate-600 hover:text-indigo-600 inline-flex items-center gap-1"
              >
                <span>Xem chi tiết hồ sơ</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/student/reports"
                className="font-bold text-indigo-600 hover:text-indigo-700 inline-flex items-center gap-1"
              >
                <span>Nộp báo cáo định kỳ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>

        {/* Module 2: Khóa luận Tốt nghiệp (KLTN) */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col justify-between space-y-4">
          <div>
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 gap-2">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-9 h-9 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold shrink-0">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <h2 className="text-sm font-bold text-slate-900 truncate">Khóa luận Tốt nghiệp (KLTN)</h2>
                  <p className="text-[11px] text-slate-400 font-medium truncate hidden sm:block">Đề tài nghiên cứu và đánh giá hội đồng</p>
                </div>
              </div>
              <div className="shrink-0">
                {thesis ? (
                  <StatusBadge status={thesis.status} size="sm" />
                ) : (
                  <span className="text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                    Chưa đăng ký
                  </span>
                )}
              </div>
            </div>

            <div className="pt-4">
              {thesis ? (
                <div className="space-y-3 text-xs">
                  <div className="p-3 sm:p-3.5 rounded-2xl bg-slate-50 border border-slate-100 space-y-2.5">
                    <div className="min-w-0">
                      <div className="text-[10.5px] font-medium text-slate-400 uppercase tracking-wider">Tên đề tài khóa luận</div>
                      <div className="font-bold text-slate-900 text-sm mt-0.5 break-words line-clamp-2">
                        {thesis.thesisTitle || thesis.title || thesis.topic?.titleVi || thesis.titleVi || '—'}
                      </div>
                    </div>

                    <div className="pt-2 border-t border-slate-200/60 grid grid-cols-1 sm:grid-cols-2 gap-1.5 sm:gap-2 text-[11px] text-slate-600">
                      <div className="min-w-0">
                        <span className="text-slate-400">GVHD:</span>{' '}
                        <strong className="text-slate-800 break-words">{thesis.supervisorId?.userId?.fullName || 'Chưa phân công'}</strong>
                      </div>
                      <div className="sm:text-right min-w-0">
                        <span className="text-slate-400">Thành viên 2:</span>{' '}
                        <strong className="text-slate-800 break-words">{thesis.secondStudentId?.userId?.fullName || 'Đề tài cá nhân'}</strong>
                      </div>
                    </div>
                  </div>

                  <div className="p-2.5 sm:p-3 rounded-xl bg-violet-50/50 border border-violet-100 flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs">
                    <div className="flex items-center gap-2 min-w-0">
                      <BookOpen className="w-4 h-4 text-violet-600 shrink-0" />
                      <div className="min-w-0 truncate">
                        <span className="text-slate-500 text-[11px]">Tiến độ gần nhất:</span>{' '}
                        <strong className="text-slate-900 truncate">
                          {latestProgress
                            ? `Tuần ${latestProgress.weekNumber || 1}: ${latestProgress.title || latestProgress.reportTitle || 'Báo cáo tiến độ'} (${latestProgress.completionPercentage || latestProgress.progressPercentage || 0}%)`
                            : 'Chưa có báo cáo tiến độ'}
                        </strong>
                      </div>
                    </div>
                    {latestProgress && (
                      <div className="shrink-0 self-start sm:self-auto">
                        <StatusBadge status={latestProgress.status} size="sm" />
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="py-6 text-center space-y-3">
                  <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 mx-auto flex items-center justify-center">
                    <BookOpen className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="font-bold text-slate-800 text-xs">Bạn chưa đăng ký đề tài Khóa luận Tốt nghiệp</div>
                    <div className="text-slate-400 text-[11px] mt-0.5">
                      Đăng ký đề tài cá nhân hoặc nhóm 2 sinh viên cùng giảng viên hướng dẫn.
                    </div>
                  </div>
                  <Link
                    to="/student/thesis/register"
                    className="inline-flex items-center gap-1.5 px-4 py-2 bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                  >
                    <PlusCircle className="w-3.5 h-3.5" />
                    <span>Đăng ký đề tài KLTN</span>
                  </Link>
                </div>
              )}
            </div>
          </div>

          {thesis && (
            <div className="pt-3 border-t border-slate-100 flex flex-wrap items-center justify-between gap-2 text-xs">
              <Link
                to="/student/thesis"
                className="font-bold text-slate-600 hover:text-violet-600 inline-flex items-center gap-1"
              >
                <span>Xem thông tin đề tài</span>
                <ChevronRight className="w-3.5 h-3.5" />
              </Link>
              <Link
                to="/student/thesis/progress"
                className="font-bold text-violet-600 hover:text-violet-700 inline-flex items-center gap-1"
              >
                <span>Cập nhật tiến độ</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            </div>
          )}
        </div>
      </div>

      {/* 3. Bottom Columns: Pending Actions & Real Notifications */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 sm:gap-6">
        {/* Left: Pending Action Items */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <AlertCircle className="w-4 h-4 text-amber-500 shrink-0" />
              <span>Nhiệm Vụ Cần Xử Lý</span>
            </div>
            <span className="text-xs font-mono font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-lg border border-amber-200 shrink-0">
              {pendingActions.length} mục
            </span>
          </div>

          {pendingActions.length > 0 ? (
            <div className="space-y-3">
              {pendingActions.map((action, idx) => {
                const isRejectedInternship = action.type === 'RE_REGISTER_INTERNSHIP' || action.type === 'INTERNSHIP_REJECTED';
                const isRejectedThesis = action.type === 'RE_REGISTER_THESIS' || action.type === 'THESIS_REJECTED';
                const isRevise = action.type === 'REPORT_REVISE' || action.type === 'PROGRESS_REVISE';

                if (isRejectedInternship) {
                  return (
                    <div
                      key={idx}
                      className="p-3.5 sm:p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs space-y-2.5 transition shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-rose-800 text-xs min-w-0">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="truncate">{action.title || 'Hồ sơ thực tập bị từ chối'}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-200 text-rose-900 uppercase shrink-0">
                          REJECTED
                        </span>
                      </div>

                      <div className="p-3 bg-white/90 rounded-xl border border-rose-100 space-y-1.5 text-slate-700">
                        {action.companyName && (
                          <div className="flex items-center gap-1.5">
                            <span className="text-slate-400 font-medium shrink-0">Doanh nghiệp:</span>
                            <strong className="text-slate-900 break-words">{action.companyName}</strong>
                          </div>
                        )}
                        <div className="flex items-start gap-1.5">
                          <span className="text-slate-400 font-medium shrink-0">Lý do từ chối:</span>
                          <strong className="text-rose-700 font-semibold leading-relaxed break-words">
                            {action.rejectionReason || 'Lý do từ chối chưa được cập nhật.'}
                          </strong>
                        </div>
                      </div>

                      <div className="text-[11px] text-rose-700 leading-relaxed break-words">
                        {action.description || 'Hồ sơ thực tập của bạn đã bị từ chối. Vui lòng xem lý do và đăng ký lại hồ sơ.'}
                      </div>

                      <div className="pt-1 flex justify-end">
                        <Link
                          to={action.actionUrl || action.link || '/student/internship/register'}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-xs shadow-rose-600/20"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{action.actionLabel || 'Đăng ký lại'}</span>
                        </Link>
                      </div>
                    </div>
                  );
                }

                if (isRejectedThesis) {
                  return (
                    <div
                      key={idx}
                      className="p-3.5 sm:p-4 rounded-2xl bg-rose-50/80 border border-rose-200 text-xs space-y-2.5 transition shadow-2xs"
                    >
                      <div className="flex items-center justify-between gap-2">
                        <div className="flex items-center gap-2 font-bold text-rose-800 text-xs min-w-0">
                          <XCircle className="w-4 h-4 text-rose-600 shrink-0" />
                          <span className="truncate">{action.title || 'Đề tài Khóa luận bị từ chối'}</span>
                        </div>
                        <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-rose-200 text-rose-900 uppercase shrink-0">
                          REJECTED
                        </span>
                      </div>

                      <div className="p-3 bg-white/90 rounded-xl border border-rose-100 space-y-1.5 text-slate-700">
                        {action.thesisTitle && (
                          <div className="flex items-start gap-1.5">
                            <span className="text-slate-400 font-medium shrink-0">Tên đề tài:</span>
                            <strong className="text-slate-900 break-words line-clamp-2">{action.thesisTitle}</strong>
                          </div>
                        )}
                        <div className="flex items-start gap-1.5">
                          <span className="text-slate-400 font-medium shrink-0">Lý do từ chối:</span>
                          <strong className="text-rose-700 font-semibold leading-relaxed break-words">
                            {action.rejectionReason || 'Lý do từ chối chưa được cập nhật.'}
                          </strong>
                        </div>
                      </div>

                      <div className="text-[11px] text-rose-700 leading-relaxed break-words">
                        {action.description || 'Đề tài khóa luận của bạn đã bị từ chối. Vui lòng xem lý do và đăng ký lại đề tài mới.'}
                      </div>

                      <div className="pt-1 flex justify-end">
                        <Link
                          to={action.actionUrl || action.link || '/student/thesis/register'}
                          className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-rose-600 hover:bg-rose-700 text-white font-bold rounded-xl text-xs transition shadow-xs shadow-rose-600/20"
                        >
                          <RotateCcw className="w-3.5 h-3.5" />
                          <span>{action.actionLabel || 'Đăng ký lại'}</span>
                        </Link>
                      </div>
                    </div>
                  );
                }

                if (isRevise) {
                  return (
                    <div
                      key={idx}
                      className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200 text-xs space-y-2 transition shadow-2xs"
                    >
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0" />
                        <span className="break-words">{action.title}</span>
                      </div>
                      <div className="text-[11px] text-slate-600 leading-relaxed break-words">
                        {action.description}
                      </div>
                      {action.feedback && (
                        <div className="p-2.5 bg-white/90 rounded-xl border border-amber-100 text-amber-950 font-medium break-words">
                          Nhận xét: {action.feedback}
                        </div>
                      )}
                      <div className="pt-1 flex justify-end">
                        <Link
                          to={action.actionUrl || action.link || '/student/dashboard'}
                          className="inline-flex items-center gap-1 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white font-bold rounded-xl text-xs transition"
                        >
                          <span>{action.actionLabel || 'Xử lý ngay'}</span>
                          <ArrowRight className="w-3.5 h-3.5" />
                        </Link>
                      </div>
                    </div>
                  );
                }

                return (
                  <div
                    key={idx}
                    className="p-3 rounded-2xl bg-slate-50 border border-slate-200/80 flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 text-xs"
                  >
                    <div className="space-y-0.5 min-w-0 flex-1">
                      <div className="font-bold text-slate-900 flex items-center gap-1.5">
                        <Clock className="w-3.5 h-3.5 text-indigo-600 shrink-0" />
                        <span className="break-words">{action.title || 'Nhiệm vụ mới'}</span>
                      </div>
                      <div className="text-[11px] text-slate-500 line-clamp-2 break-words">
                        {action.description || action.message}
                      </div>
                    </div>
                    <Link
                      to={action.actionUrl || action.link || '/student/dashboard'}
                      className="px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl text-[11px] transition shrink-0 inline-flex items-center gap-1 shadow-2xs self-end sm:self-auto"
                    >
                      <span>{action.actionLabel || 'Xử lý'}</span>
                      <ArrowRight className="w-3 h-3" />
                    </Link>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500 mx-auto" />
              <div className="text-xs font-semibold text-slate-700">Tất cả nhiệm vụ đã hoàn thành!</div>
              <div className="text-[11px] text-slate-400">Không có yêu cầu nộp báo cáo hoặc bổ sung hồ sơ nào đang chờ.</div>
            </div>
          )}
        </div>

        {/* Right: Notifications Feed */}
        <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3 gap-2">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Bell className="w-4 h-4 text-indigo-600 shrink-0" />
              <span>Thông Báo Mới Nhất</span>
            </div>
            <span className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-lg border border-indigo-100 shrink-0">
              {notifications.length} tin
            </span>
          </div>

          {notifications.length > 0 ? (
            <div className="space-y-2.5">
              {notifications.map((noti) => (
                <div
                  key={noti._id}
                  role="button"
                  tabIndex={0}
                  onClick={() => handleNotificationClick(noti)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' || e.key === ' ') {
                      e.preventDefault();
                      handleNotificationClick(noti);
                    }
                  }}
                  className={`p-3 rounded-2xl border transition text-xs flex items-start gap-2.5 sm:gap-3 cursor-pointer group ${
                    !noti.isRead
                      ? 'bg-indigo-50/40 border-indigo-200/80 hover:bg-indigo-100/50 hover:border-indigo-300'
                      : 'bg-slate-50/50 border-slate-200/60 hover:bg-slate-100/80 hover:border-slate-300'
                  }`}
                >
                  <div className={`w-2 h-2 rounded-full mt-1.5 shrink-0 ${!noti.isRead ? 'bg-indigo-600' : 'bg-slate-300'}`} />
                  <div className="flex-1 min-w-0">
                    <div className="font-bold text-slate-900 leading-tight group-hover:text-indigo-600 transition-colors break-words">
                      {noti.title}
                    </div>
                    <div className="text-[11px] text-slate-500 mt-0.5 line-clamp-2 leading-relaxed break-words">
                      {noti.message || noti.content}
                    </div>
                    <div className="text-[10px] text-slate-400 font-mono mt-1">
                      {formatDate(noti.createdAt)}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="py-8 text-center text-slate-400 space-y-2">
              <Bell className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-semibold text-slate-700">Chưa có thông báo nào</div>
              <div className="text-[11px] text-slate-400">Các thông báo mới từ Khoa & GVHD sẽ hiển thị tại đây.</div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default StudentDashboard;
