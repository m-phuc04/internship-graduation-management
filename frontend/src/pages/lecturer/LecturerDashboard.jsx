import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import dashboardApi from '../../api/dashboardApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

import {
  Users,
  BookOpen,
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Briefcase,
  Sparkles,
  FileText,
  UserCheck,
  TrendingUp,
  AlertCircle,
} from 'lucide-react';

const LecturerDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { currentTerm } = useAcademicTerm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getLecturerDashboard({
        academicTermId: currentTerm?._id || '',
      });
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải tổng quan giảng viên', 'error');
    } finally {
      setLoading(false);
    }
  }, [currentTerm?._id, showToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-2xs">
          <LoadingSkeleton rows={5} cols={4} />
        </div>
      </div>
    );
  }

  const lecturer = data?.lecturer;
  const stats = data?.stats || {};
  const supervisedInternships = data?.supervisedInternships || [];
  const supervisedTheses = data?.supervisedTheses || [];
  const pendingReports = data?.pendingInternshipReports || [];
  const pendingProgress = data?.pendingThesisProgress || [];

  return (
    <div className="space-y-6">
      {/* 1. Lecturer Identity Banner */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 relative overflow-hidden">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white font-bold text-xl flex items-center justify-center shadow-md shadow-violet-200 shrink-0">
            {lecturer?.academicTitle ? lecturer.academicTitle.charAt(0) : (user?.fullName?.charAt(0) || 'G')}
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-violet-50 text-violet-700 text-[11px] font-bold tracking-wide uppercase">
              <Sparkles className="w-3 h-3 text-violet-600" />
              <span>Cổng Thông Tin Giảng Viên</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1">
              Xin chào, {lecturer?.academicTitle ? `${lecturer.academicTitle} ` : ''}{lecturer?.userId?.fullName || user?.fullName}!
            </h1>
            <div className="text-xs text-slate-500 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Mã GV: <strong className="font-mono text-slate-800">{lecturer?.lecturerCode || '—'}</strong></span>
              <span>•</span>
              <span>Khoa: <strong className="text-slate-800">{lecturer?.department || 'Công nghệ Thông tin'}</strong></span>
              {lecturer?.specialization && (
                <>
                  <span>•</span>
                  <span>Chuyên môn: <strong className="text-slate-800">{lecturer.specialization}</strong></span>
                </>
              )}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchDashboard}
          className="self-start md:self-auto inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition shadow-2xs cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 2. Overview 4 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* SV Hướng Dẫn TTDN */}
        <Link
          to="/lecturer/internships"
          className="p-5 rounded-3xl bg-white border border-blue-100 hover:border-blue-300 hover:shadow-md transition-all group space-y-2 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-blue-600 transition">
              SV Thực Tập (TTDN)
            </span>
            <div className="w-8 h-8 rounded-xl bg-blue-50 text-blue-600 flex items-center justify-center group-hover:scale-110 transition">
              <Briefcase className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats.internshipStudentsCount || 0}
          </div>
          <div className="text-[11px] text-blue-600 font-semibold flex items-center gap-1">
            <span>Xem danh sách sinh viên</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>

        {/* Đề Tài KLTN */}
        <Link
          to="/lecturer/theses"
          className="p-5 rounded-3xl bg-white border border-indigo-100 hover:border-indigo-300 hover:shadow-md transition-all group space-y-2 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-indigo-600 transition">
              Đề Tài Hướng Dẫn (KLTN)
            </span>
            <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center group-hover:scale-110 transition">
              <GraduationCap className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-slate-900 font-mono">
            {stats.thesisStudentsCount || 0}
          </div>
          <div className="text-[11px] text-indigo-600 font-semibold flex items-center gap-1">
            <span>Xem các đề tài khóa luận</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>

        {/* Báo Cáo TTDN Chờ Duyệt */}
        <Link
          to="/lecturer/reports"
          className="p-5 rounded-3xl bg-white border border-amber-100 hover:border-amber-300 hover:shadow-md transition-all group space-y-2 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-amber-600 transition">
              Báo Cáo TTDN Chờ Duyệt
            </span>
            <div className="w-8 h-8 rounded-xl bg-amber-50 text-amber-600 flex items-center justify-center group-hover:scale-110 transition">
              <Clock className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-700 font-mono">
            {stats.pendingInternshipReportsCount || 0}
          </div>
          <div className="text-[11px] text-amber-700 font-semibold flex items-center gap-1">
            <span>Chấm điểm & nhận xét</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>

        {/* Tiến Độ KLTN Chờ Duyệt */}
        <Link
          to="/lecturer/theses/progress"
          className="p-5 rounded-3xl bg-white border border-violet-100 hover:border-violet-300 hover:shadow-md transition-all group space-y-2 relative overflow-hidden"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-600 group-hover:text-violet-600 transition">
              Tiến Độ KLTN Chờ Duyệt
            </span>
            <div className="w-8 h-8 rounded-xl bg-violet-50 text-violet-600 flex items-center justify-center group-hover:scale-110 transition">
              <TrendingUp className="w-4 h-4" />
            </div>
          </div>
          <div className="text-2xl font-black text-violet-700 font-mono">
            {stats.pendingThesisProgressCount || 0}
          </div>
          <div className="text-[11px] text-violet-700 font-semibold flex items-center gap-1">
            <span>Đánh giá tiến độ đề tài</span>
            <ArrowRight className="w-3 h-3 group-hover:translate-x-0.5 transition" />
          </div>
        </Link>
      </div>

      {/* 3. Detailed Work Columns: Pending Internship Reports & Supervised Theses */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Left Column: Báo Cáo TTDN Cần Đánh Giá */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Clock className="w-4 h-4 text-amber-600" />
              <span>Báo Cáo Thực Tập Chờ Đánh Giá ({pendingReports.length})</span>
            </div>
            <Link to="/lecturer/reports" className="text-xs font-bold text-violet-600 hover:text-violet-700">
              Xem tất cả →
            </Link>
          </div>

          {pendingReports.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <CheckCircle2 className="w-8 h-8 text-emerald-500/80" />
              <span>Không có báo cáo thực tập nào đang chờ đánh giá.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {pendingReports.slice(0, 5).map((r) => (
                <div key={r._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <strong className="text-slate-900 block truncate">{r.title}</strong>
                    <span className="text-[11px] text-slate-500 mt-0.5 block">
                      SV: <strong>{r.studentId?.userId?.fullName}</strong> ({r.studentId?.studentCode}) • {r.reportType === 'WEEKLY' ? `Tuần ${r.weekNumber}` : `Tháng ${r.monthNumber}`}
                    </span>
                  </div>
                  <Link
                    to="/lecturer/reports"
                    className="px-3 py-1.5 bg-amber-50 text-amber-800 font-bold rounded-xl border border-amber-200 hover:bg-amber-100 transition shrink-0"
                  >
                    Chấm điểm
                  </Link>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Đề Tài KLTN Đang Hướng Dẫn */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>Đề Tài KLTN Đang Hướng Dẫn ({supervisedTheses.length})</span>
            </div>
            <Link to="/lecturer/theses" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
              Xem tất cả →
            </Link>
          </div>

          {supervisedTheses.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
              <BookOpen className="w-8 h-8 text-slate-300" />
              <span>Chưa có đề tài KLTN nào được phân công hướng dẫn.</span>
            </div>
          ) : (
            <div className="divide-y divide-slate-100 text-xs">
              {supervisedTheses.slice(0, 5).map((t) => (
                <div key={t._id} className="py-3 flex items-center justify-between gap-3">
                  <div className="min-w-0 max-w-[70%]">
                    <strong className="text-slate-900 line-clamp-1 block">{t.thesisTitle}</strong>
                    <span className="text-[11px] text-slate-500 mt-0.5 block truncate">
                      SV: {t.studentId?.userId?.fullName} ({t.studentId?.studentCode}){t.secondStudentId ? ` & ${t.secondStudentId?.userId?.fullName}` : ''}
                    </span>
                  </div>
                  <StatusBadge status={t.status} size="sm" />
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default LecturerDashboard;
