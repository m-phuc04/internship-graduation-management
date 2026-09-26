import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Users,
  Building2,
  BookOpen,
  Briefcase,
  Award,
  Shield,
  LayoutDashboard,
  KeyRound,
  ShieldCheck,
  ArrowLeft,
  Calendar,
  X,
} from 'lucide-react';
import IUHLogo from '../common/IUHLogo';

const Sidebar = ({ onCloseMobile }) => {
  const { user } = useAuth();
  const isAdmin = user?.role === 'ADMIN';

  const handleNavClick = () => {
    if (onCloseMobile) {
      onCloseMobile();
    }
  };

  // 1. Dành cho TBM: Bảng Tổng quan (Tách riêng ở trên đầu)
  const tbmOverviewItem = {
    to: '/tbm/dashboard',
    label: 'Tổng quan TBM',
    icon: LayoutDashboard,
    badge: 'TQ',
  };

  // 2. Dành cho TBM: Nhóm Nghiệp Vụ Bộ Môn (Đầy đủ các mục nghiệp vụ chính)
  const tbmBusinessItems = [
    {
      to: '/tbm/academic-terms',
      label: 'Học kỳ & Năm học',
      icon: Calendar,
      badge: 'HK',
    },
    {
      to: '/tbm/internships',
      label: 'Quản lý Thực tập',
      icon: Briefcase,
      badge: 'TTĐN',
    },
    {
      to: '/tbm/evaluations',
      label: 'Đánh giá Thực tập',
      icon: Award,
      badge: 'ĐN',
    },
    {
      to: '/tbm/theses',
      label: 'Quản lý Khóa luận',
      icon: GraduationCap,
      badge: 'KLTN',
    },
    {
      to: '/tbm/thesis-evaluations',
      label: 'Đánh giá Khóa luận',
      icon: Award,
      badge: 'ĐIỂM',
    },
  ];

  // 3. Dành cho ADMIN: Quản trị phân quyền & tài khoản
  const adminItems = [
    {
      to: '/admin/permissions',
      label: 'Quản lý phân quyền',
      icon: KeyRound,
      badge: 'ADMIN',
    },
    {
      to: '/admin/users',
      label: 'Quản lý người dùng',
      icon: Users,
      badge: 'ADMIN',
    },
  ];

  // 4. Dành cho ADMIN: Dữ liệu Nền tảng (Master Data)
  const adminMasterDataItems = [
    {
      to: '/admin/academic-terms',
      label: 'Học kỳ & Năm học',
      icon: Calendar,
      badge: 'MASTER',
    },
    {
      to: '/admin/students',
      label: 'Quản lý Sinh viên',
      icon: Users,
      badge: 'MASTER',
    },
    {
      to: '/admin/lecturers',
      label: 'Quản lý Giảng viên',
      icon: BookOpen,
      badge: 'MASTER',
    },
    {
      to: '/admin/companies',
      label: 'Quản lý Doanh nghiệp',
      icon: Building2,
      badge: 'MASTER',
    },
  ];

  return (
    <aside className="w-64 max-w-[85vw] bg-[#123891] text-slate-200 flex flex-col shrink-0 h-full select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 sm:px-5 border-b border-[#0e2c73] bg-[#0e2c73]">
        <Link
          to={isAdmin ? '/admin/permissions' : '/tbm/dashboard'}
          onClick={handleNavClick}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-95 transition min-w-0"
        >
          <div className="p-1 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-xs group-hover:scale-105 transition shrink-0">
            <IUHLogo className="h-7 w-auto object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-tight leading-tight group-hover:text-amber-300 transition truncate">
              {isAdmin ? 'Cổng Quản Trị' : 'Cổng Trưởng Bộ Môn'}
            </div>
            <div className="text-[10.5px] text-blue-200/90 font-medium truncate mt-0.5">
              {isAdmin ? 'Quản trị viên (ADMIN)' : 'Quản lý Nghiệp vụ TBM'}
            </div>
          </div>
        </Link>

        {onCloseMobile && (
          <button
            type="button"
            onClick={onCloseMobile}
            aria-label="Đóng menu"
            className="lg:hidden p-1.5 text-slate-400 hover:text-white hover:bg-white/10 rounded-lg transition cursor-pointer shrink-0 ml-2"
            title="Đóng menu"
          >
            <X className="w-5 h-5" />
          </button>
        )}
      </div>

      {/* Quick Action: Back to Lecturer Portal (Chỉ hiển thị cho TBM) */}
      {!isAdmin && (
        <div className="px-3.5 pt-3 pb-1 border-b border-[#0e2c73]">
          <Link
            to="/lecturer/dashboard"
            onClick={handleNavClick}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-slate-200 hover:text-white bg-[#0e2c73] hover:bg-white/10 border border-[#0e2c73] transition-all group shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4 text-[#ECA124] group-hover:-translate-x-1 transition-transform" />
              <span>Về Cổng Giảng Viên</span>
            </div>
            <span className="text-[10px] bg-[#ECA124] text-slate-950 font-black px-1.5 py-0.5 rounded font-mono shadow-xs">
              GV
            </span>
          </Link>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto custom-scrollbar">
        {/* ================= PHẦN DÀNH CHO TBM ================= */}
        {!isAdmin && (
          <div className="space-y-4">
            {/* 1. BẢNG TỔNG QUAN */}
            <div>
              <NavLink
                to={tbmOverviewItem.to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all group cursor-pointer ${
                    isActive
                      ? 'bg-[#ECA124] text-slate-950 font-bold shadow-md'
                      : 'text-slate-200 hover:text-white hover:bg-white/10 font-semibold'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <LayoutDashboard className="w-4 h-4 shrink-0" />
                      <span className="whitespace-nowrap truncate">{tbmOverviewItem.label}</span>
                    </div>
                    {tbmOverviewItem.badge && (
                      <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded shadow-2xs shrink-0 whitespace-nowrap ${
                        isActive
                          ? 'bg-slate-950/15 text-slate-950'
                          : 'bg-white/15 text-white'
                      }`}>
                        {tbmOverviewItem.badge}
                      </span>
                    )}
                  </>
                )}
              </NavLink>
            </div>

            {/* 2. NGHIỆP VỤ BỘ MÔN */}
            <div className="space-y-1">
              <div className="px-3 pb-1.5 text-[10.5px] font-bold text-blue-200/90 uppercase tracking-wider">
                Nghiệp Vụ Bộ Môn
              </div>
              {tbmBusinessItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all group cursor-pointer ${
                        isActive
                          ? 'bg-[#ECA124] text-slate-950 font-bold shadow-md'
                          : 'text-slate-200 hover:text-white hover:bg-white/10 font-semibold'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded shadow-2xs shrink-0 whitespace-nowrap ${
                            isActive
                              ? 'bg-slate-950/15 text-slate-950'
                              : 'bg-white/15 text-white'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}

        {/* ================= PHẦN DÀNH CHO ADMIN ================= */}
        {isAdmin && (
          <div className="space-y-4">
            {/* 1. QUẢN TRỊ HỆ THỐNG */}
            <div className="space-y-1">
              <div className="px-3 pb-1.5 text-[10.5px] font-bold text-blue-200/90 uppercase tracking-wider">
                Quản Trị Hệ Thống
              </div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all group cursor-pointer ${
                        isActive
                          ? 'bg-[#ECA124] text-slate-950 font-bold shadow-md'
                          : 'text-slate-200 hover:text-white hover:bg-white/10 font-semibold'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap truncate">{item.label}</span>
                        </div>
                        <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded shadow-2xs shrink-0 whitespace-nowrap ${
                          isActive
                            ? 'bg-slate-950/15 text-slate-950'
                            : 'bg-white/15 text-white'
                        }`}>
                          {item.badge}
                        </span>
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>

            {/* 2. DỮ LIỆU NỀN TẢNG (MASTER) */}
            <div className="space-y-1">
              <div className="px-3 pb-1.5 text-[10.5px] font-bold text-blue-200/90 uppercase tracking-wider">
                Dữ Liệu Nền Tảng (Master)
              </div>
              {adminMasterDataItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all group cursor-pointer ${
                        isActive
                          ? 'bg-[#ECA124] text-slate-950 font-bold shadow-md'
                          : 'text-slate-200 hover:text-white hover:bg-white/10 font-semibold'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className="w-4 h-4 shrink-0" />
                          <span className="whitespace-nowrap truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded shadow-2xs shrink-0 whitespace-nowrap ${
                            isActive
                              ? 'bg-slate-950/15 text-slate-950'
                              : 'bg-white/15 text-white'
                          }`}>
                            {item.badge}
                          </span>
                        )}
                      </>
                    )}
                  </NavLink>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </aside>
  );
};

export default Sidebar;
