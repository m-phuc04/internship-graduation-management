import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import dashboardApi from '../../api/dashboardApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

import {
  Briefcase,
  GraduationCap,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  TrendingUp,
  Calendar,
  Sparkles,
} from 'lucide-react';

const TbmDashboard = () => {
  const { showToast } = useToast();
  const { currentTerm } = useAcademicTerm();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getTbmDashboard({
        academicTermId: currentTerm?._id || '',
      });
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải dashboard Trưởng Bộ Môn', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast, currentTerm?._id]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSkeleton rows={6} cols={3} />
      </div>
    );
  }

  const stats = data?.stats || {};
  const recentInternships = data?.recentInternships || [];
  const recentTheses = data?.recentTheses || [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center shrink-0 shadow-xs">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Tổng quan Thực tập & Khóa luận
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi tiến độ thực tập doanh nghiệp, khóa luận tốt nghiệp và tình hình xét duyệt
            </p>
          </div>
        </div>

        <button
          onClick={fetchDashboard}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới dữ liệu</span>
        </button>
      </div>

      {/* 4 Workflow Status Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* TTDN Chờ Duyệt */}
        <Link
          to="/tbm/internships"
          className="p-5 rounded-3xl bg-amber-50/70 border border-amber-200/80 hover:border-amber-300 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">TTDN Chờ Duyệt</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 font-mono">{stats.pendingInternships || 0}</div>
          <div className="text-[11px] text-amber-700 font-medium">Hồ sơ thực tập mới đăng ký</div>
        </Link>

        {/* KLTN Chờ Duyệt */}
        <Link
          to="/tbm/theses"
          className="p-5 rounded-3xl bg-indigo-50/70 border border-indigo-200/80 hover:border-indigo-300 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-indigo-900">KLTN Chờ Duyệt</span>
            <Clock className="w-4 h-4 text-indigo-600" />
          </div>
          <div className="text-2xl font-bold text-indigo-900 font-mono">{stats.pendingTheses || 0}</div>
          <div className="text-[11px] text-indigo-700 font-medium">Đề tài khóa luận mới nộp</div>
        </Link>

        {/* KLTN Đang Thực Hiện */}
        <Link
          to="/tbm/theses"
          className="p-5 rounded-3xl bg-blue-50/70 border border-blue-200/80 hover:border-blue-300 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">KLTN Đang Thực Hiện</span>
            <GraduationCap className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 font-mono">{stats.inProgressTheses || 0}</div>
          <div className="text-[11px] text-blue-700 font-medium">Đã duyệt & đang làm đồ án</div>
        </Link>

        {/* KLTN Hoàn Thành */}
        <Link
          to="/tbm/thesis-evaluations"
          className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200/80 hover:border-emerald-300 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">KLTN Hoàn Thành</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 font-mono">{stats.completedTheses || 0}</div>
          <div className="text-[11px] text-emerald-700 font-medium">Đã chấm điểm & nghiệm thu</div>
        </Link>
      </div>

      {/* 2 Activity Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Recent Internships */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span>Đăng Ký Thực Tập Gần Nhất</span>
            </div>
            <Link to="/tbm/internships" className="text-xs font-bold text-indigo-600 hover:text-indigo-700">
              Xem tất cả →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentInternships.length === 0 ? (
              <div className="py-4 text-center text-slate-400">Chưa có đăng ký thực tập nào trong học kỳ này</div>
            ) : (
              recentInternships.map((item) => (
                <div key={item._id} className="py-2.5 flex items-center justify-between gap-2">
                  <div>
                    <strong className="text-slate-900 block">{item.studentId?.userId?.fullName || 'Sinh viên'}</strong>
                    <span className="text-[11px] text-slate-500">{item.companyId?.companyName}</span>
                  </div>
                  <StatusBadge status={item.status} size="sm" />
                </div>
              ))
            )}
          </div>
        </div>

        {/* Recent Theses */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
              <GraduationCap className="w-4 h-4 text-violet-600" />
              <span>Đề Tài Khóa Luận Gần Nhất</span>
            </div>
            <Link to="/tbm/theses" className="text-xs font-bold text-violet-600 hover:text-violet-700">
              Xem tất cả →
            </Link>
          </div>

          <div className="divide-y divide-slate-100 text-xs">
            {recentTheses.length === 0 ? (
              <div className="py-4 text-center text-slate-400">Chưa có đề tài khóa luận nào trong học kỳ này</div>
            ) : (
              recentTheses.map((item) => (
                <div key={item._id} className="py-2.5 flex items-center justify-between gap-2">
                  <div className="max-w-[70%]">
                    <strong className="text-slate-900 line-clamp-1 block">{item.thesisTitle}</strong>
                    <span className="text-[11px] text-slate-500">
                      SV: {item.studentId?.userId?.fullName} • GVHD: {item.supervisorId?.userId?.fullName}
                    </span>
                  </div>
                  <StatusBadge status={item.status} size="sm" />
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default TbmDashboard;
