import React, { useState, useEffect, useCallback } from 'react';
import { Link } from 'react-router-dom';
import dashboardApi from '../../api/dashboardApi';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import StatusBadge from '../../components/common/StatusBadge';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';

import {
  Building2,
  Users,
  Award,
  CheckCircle2,
  Clock,
  ArrowRight,
  RefreshCw,
  FileCheck,
} from 'lucide-react';

const CompanyDashboard = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = useCallback(async () => {
    setLoading(true);
    try {
      const res = await dashboardApi.getCompanyDashboard();
      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải dashboard Doanh nghiệp', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchDashboard();
  }, [fetchDashboard]);

  if (loading) {
    return (
      <div className="p-6">
        <LoadingSkeleton rows={5} cols={3} />
      </div>
    );
  }

  const company = data?.company;
  const stats = data?.stats || {};
  const interningStudents = data?.interningStudents || [];
  const pendingEvaluations = data?.pendingEvaluations || [];
  const recentEvaluations = data?.recentEvaluations || [];

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <span className="text-xs font-semibold text-blue-600 uppercase tracking-wider">
            Cổng Thông Tin Doanh Nghiệp Tiếp Nhận
          </span>
          <h1 className="text-xl font-bold text-slate-900 mt-0.5">
            Bảng Tổng Quan Đơn Vị Thực Tập ({company?.companyName || user?.fullName})
          </h1>
          <p className="text-xs text-slate-500 mt-1">
            Mã DN: <strong>{company?.companyCode}</strong> • Địa chỉ: <strong>{company?.address}</strong>
          </p>
        </div>

        <button
          onClick={fetchDashboard}
          className="self-start md:self-auto inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 3 Stats Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Card 1: Interning Students */}
        <Link
          to="/company/evaluations"
          className="p-5 rounded-3xl bg-blue-50/70 border border-blue-200/80 hover:border-blue-300 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-blue-900">Sinh Viên Đang Thực Tập</span>
            <Users className="w-4 h-4 text-blue-600" />
          </div>
          <div className="text-2xl font-bold text-blue-900 font-mono">{stats.interningStudentsCount}</div>
          <div className="text-[11px] text-blue-700 font-medium">Sinh viên đang làm việc tại DN</div>
        </Link>

        {/* Card 2: Pending Evaluations */}
        <Link
          to="/company/evaluations"
          className="p-5 rounded-3xl bg-amber-50/70 border border-amber-200/80 hover:border-amber-300 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-amber-900">Phiếu Chưa Đánh Giá</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-bold text-amber-900 font-mono">{stats.pendingEvaluationsCount}</div>
          <div className="text-[11px] text-amber-700 font-medium">Cần lập phiếu đánh giá kết thúc đợt</div>
        </Link>

        {/* Card 3: Completed Evaluations */}
        <Link
          to="/company/evaluations"
          className="p-5 rounded-3xl bg-emerald-50/70 border border-emerald-200/80 hover:border-emerald-300 transition space-y-2"
        >
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-emerald-900">Đã Hoàn Tất Đánh Giá</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-bold text-emerald-900 font-mono">{stats.completedEvaluationsCount}</div>
          <div className="text-[11px] text-emerald-700 font-medium">Phiếu đánh giá đã bàn giao</div>
        </Link>
      </div>

      {/* Interning Students & Evaluations Table */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2 font-bold text-sm text-slate-900">
            <Users className="w-4 h-4 text-blue-600" />
            <span>Danh Sách Sinh Viên Thực Tập Tại Doanh Nghiệp</span>
          </div>
          <Link to="/company/evaluations" className="text-xs font-bold text-blue-600 hover:text-blue-700">
            Vào trang đánh giá →
          </Link>
        </div>

        {interningStudents.length === 0 ? (
          <div className="p-6 text-center text-slate-400 text-xs">
            Hiện chưa có sinh viên nào đang thực tập tại đơn vị.
          </div>
        ) : (
          <div className="divide-y divide-slate-100 text-xs">
            {interningStudents.map((item) => (
              <div key={item._id} className="py-3 flex items-center justify-between gap-2">
                <div>
                  <strong className="text-slate-900 block">{item.studentId?.userId?.fullName}</strong>
                  <span className="text-[11px] text-slate-500">
                    MSSV: {item.studentId?.studentCode} • Vị trí: {item.position}
                  </span>
                </div>
                <Link
                  to="/company/evaluations"
                  className="inline-flex items-center gap-1 px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs rounded-xl shadow-xs transition"
                >
                  <Award className="w-3.5 h-3.5" />
                  <span>Lập phiếu đánh giá</span>
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyDashboard;
