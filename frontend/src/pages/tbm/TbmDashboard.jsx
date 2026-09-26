import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import dashboardApi from '../../api/dashboardApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

import {
  LayoutDashboard,
  Briefcase,
  BookOpen,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  Building2,
  Calendar,
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

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0 shadow-xs">
            <LayoutDashboard className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Tổng Quan Trưởng Bộ Môn (TBM)
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Theo dõi tiến độ thực tập doanh nghiệp và quản lý chung của Bộ Môn
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

      {/* Quick Navigation Card for KLTN Topics Approval */}
      <div className="p-5 rounded-3xl bg-gradient-to-r from-blue-900 via-[#123891] to-indigo-900 text-white shadow-md flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-12 h-12 rounded-2xl bg-white/10 flex items-center justify-center shrink-0">
            <BookOpen className="w-6 h-6 text-white" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h2 className="text-base font-bold text-white">Duyệt & Quản Lý Đề Tài Khóa Luận (KLTN)</h2>
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-slate-950 font-extrabold text-[10px] uppercase">
                Trực tiếp
              </span>
            </div>
            <p className="text-xs text-blue-100 mt-0.5">
              Duyệt đề tài do giảng viên đề xuất, quản lý nhóm sinh viên thực hiện và phân công phản biện
            </p>
          </div>
        </div>

        <Link
          to="/lecturer/theses?tab=topics"
          className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-white text-[#123891] hover:bg-blue-50 font-bold text-xs shadow-sm transition shrink-0 self-start md:self-auto"
        >
          <span>Vào trang duyệt đề tài</span>
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>

      {/* 4 Workflow Status Cards for Internship */}
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

        {/* TTDN Đang Thực Tập */}
        <Link
          to="/tbm/internships"
          className="p-5 rounded-3xl bg-blue-50/70 border border-blue-200/80 hover:border-blue-300 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">Đang Thực Tập</span>
            <Briefcase className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 font-mono">{stats.interningCount || 0}</div>
          <div className="text-[11px] text-blue-700 font-medium">Sinh viên đang thực tập tại DN</div>
        </Link>

        {/* TTDN Đã Duyệt Hồ Sơ */}
        <Link
          to="/tbm/internships"
          className="p-5 rounded-3xl bg-sky-50/70 border border-sky-200/80 hover:border-sky-300 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-sky-900">Đã Duyệt Hồ Sơ</span>
            <CheckCircle2 className="w-4 h-4 text-sky-600" />
          </div>
          <div className="text-2xl font-bold text-sky-900 font-mono">{stats.approvedInternships || 0}</div>
          <div className="text-[11px] text-sky-700 font-medium">Hồ sơ đã được phê duyệt</div>
        </Link>

        {/* TTDN Hoàn Thành */}
        <Link
          to="/tbm/evaluations"
          className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200/80 hover:border-emerald-300 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">Hoàn Thành & Đánh Giá</span>
            <Award className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 font-mono">{stats.completedInternships || 0}</div>
          <div className="text-[11px] text-emerald-700 font-medium">Đã hoàn thành đợt thực tập</div>
        </Link>
      </div>

      {/* Activity Table: Recent Internships */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <Briefcase className="w-4 h-4 text-[#123891]" />
            <span>Đăng Ký Thực Tập Gần Nhất</span>
          </div>
          <Link to="/tbm/internships" className="text-xs font-bold text-[#123891] hover:text-[#102d7d]">
            Xem tất cả →
          </Link>
        </div>

        <div className="divide-y divide-slate-100 text-xs">
          {recentInternships.length === 0 ? (
            <div className="py-6 text-center text-slate-400">Chưa có đăng ký thực tập nào trong học kỳ này</div>
          ) : (
            recentInternships.map((item) => (
              <div key={item._id} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <strong className="text-slate-900 block text-sm">{item.studentId?.userId?.fullName || 'Sinh viên'}</strong>
                  <span className="text-xs text-slate-500">{item.companyId?.companyName || 'Công ty'}</span>
                </div>
                <StatusBadge status={item.status} size="sm" />
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};

export default TbmDashboard;
