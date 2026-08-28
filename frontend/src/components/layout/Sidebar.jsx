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
    label: 'Bảng Tổng quan',
    icon: LayoutDashboard,
    badge: 'TQ',
  };

  // 2. Dành cho TBM: Nhóm Nghiệp Vụ Bộ Môn (Đầy đủ 5 mục nghiệp vụ chính)
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
    <aside className="w-64 max-w-[85vw] bg-[#0B1E48] text-slate-300 flex flex-col shrink-0 h-full min-h-screen border-r border-[#132c66] select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-4 sm:px-5 border-b border-[#132c66] bg-[#071638]/60">
        <Link
          to={isAdmin ? '/admin/permissions' : '/tbm/dashboard'}
          onClick={handleNavClick}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-95 transition min-w-0"
        >
          <div className="p-1 bg-white rounded-xl flex items-center justify-center shadow-md group-hover:scale-105 transition shrink-0">
            <IUHLogo className="h-7 w-auto object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-tight leading-tight group-hover:text-amber-300 transition truncate">
              QL TTĐN & KLTN
            </div>
            <div className="text-[11px] font-semibold flex items-center gap-1 mt-0.5 text-blue-200/90 truncate">
              {isAdmin ? (
                <>
                  <ShieldCheck className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">Cổng Quản Trị (ADMIN)</span>
                </>
              ) : (
                <>
                  <Shield className="w-3 h-3 text-amber-400 shrink-0" />
                  <span className="truncate">Cổng Trưởng Bộ Môn (TBM)</span>
                </>
              )}
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
        <div className="px-3.5 pt-3 pb-1 border-b border-[#132c66]">
          <Link
            to="/lecturer/dashboard"
            onClick={handleNavClick}
            className="w-full flex items-center justify-between px-3 py-2 rounded-xl text-xs font-bold text-white bg-[#132c66] hover:bg-[#1a3a85] border border-[#1f408a] transition-all group shadow-xs cursor-pointer"
          >
            <div className="flex items-center gap-2">
              <ArrowLeft className="w-4 h-4 text-blue-300 group-hover:-translate-x-1 transition-transform" />
              <span>Về Cổng Giảng Viên</span>
            </div>
            <span className="text-[10px] bg-[#F7B928] text-slate-950 font-black px-1.5 py-0.5 rounded font-mono shadow-xs">
              GV
            </span>
          </Link>
        </div>
      )}

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3.5 space-y-5 overflow-y-auto">
        {/* ================= PHẦN DÀNH CHO TBM ================= */}
        {!isAdmin && (
          <div className="space-y-4">
            {/* 1. BẢNG TỔNG QUAN (Tách riêng ở trên đầu) */}
            <div className="space-y-1">
              <NavLink
                to={tbmOverviewItem.to}
                onClick={handleNavClick}
                className={({ isActive }) =>
                  `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                    isActive
                      ? 'bg-[#F7B928] text-slate-950 font-bold shadow-md'
                      : 'text-slate-200 hover:text-white hover:bg-white/10'
                  }`
                }
              >
                {({ isActive }) => (
                  <>
                    <div className="flex items-center gap-3 min-w-0">
                      <LayoutDashboard className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-300 group-hover:text-white'}`} />
                      <span className="whitespace-nowrap truncate">{tbmOverviewItem.label}</span>
                    </div>
                    {tbmOverviewItem.badge && (
                      <span className={`text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded shadow-2xs shrink-0 whitespace-nowrap ${
                        isActive
                          ? 'bg-[#E5A412] text-slate-950'
                          : 'bg-[#F7B928] text-slate-950'
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
              <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                NGHIỆP VỤ BỘ MÔN
              </div>
              {tbmBusinessItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-[#F7B928] text-slate-950 font-bold shadow-md'
                          : 'text-slate-200 hover:text-white hover:bg-white/10'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-300 group-hover:text-white'}`} />
                          <span className="whitespace-nowrap truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded shadow-2xs shrink-0 whitespace-nowrap ${
                            isActive
                              ? 'bg-[#E5A412] text-slate-950'
                              : 'bg-[#F7B928] text-slate-950'
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
          <>
            {/* 1. QUẢN TRỊ HỆ THỐNG */}
            <div className="space-y-1">
              <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                QUẢN TRỊ HỆ THỐNG
              </div>
              {adminItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-[#F7B928] text-slate-950 font-bold shadow-md'
                          : 'text-slate-200 hover:text-white hover:bg-white/10'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-300 group-hover:text-white'}`} />
                          <span className="whitespace-nowrap truncate">{item.label}</span>
                        </div>
                        <span className={`text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded shadow-2xs shrink-0 whitespace-nowrap ${
                          isActive
                            ? 'bg-[#E5A412] text-slate-950'
                            : 'bg-[#F7B928] text-slate-950'
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
              <div className="px-3 pb-1.5 text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                DỮ LIỆU NỀN TẢNG (MASTER)
              </div>
              {adminMasterDataItems.map((item) => {
                const Icon = item.icon;
                return (
                  <NavLink
                    key={item.to}
                    to={item.to}
                    onClick={handleNavClick}
                    className={({ isActive }) =>
                      `flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all group ${
                        isActive
                          ? 'bg-[#F7B928] text-slate-950 font-bold shadow-md'
                          : 'text-slate-200 hover:text-white hover:bg-white/10'
                      }`
                    }
                  >
                    {({ isActive }) => (
                      <>
                        <div className="flex items-center gap-3 min-w-0">
                          <Icon className={`w-4 h-4 shrink-0 ${isActive ? 'text-slate-950' : 'text-slate-300 group-hover:text-white'}`} />
                          <span className="whitespace-nowrap truncate">{item.label}</span>
                        </div>
                        {item.badge && (
                          <span className={`text-[10px] uppercase font-black tracking-wider px-1.5 py-0.5 rounded shadow-2xs shrink-0 whitespace-nowrap ${
                            isActive
                              ? 'bg-[#E5A412] text-slate-950'
                              : 'bg-[#F7B928] text-slate-950'
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
          </>
        )}
      </div>

      {/* Footer Info */}
      <div className="p-4 border-t border-[#132c66] bg-[#071638]/50">
        <div className="p-3 rounded-xl bg-[#081533] border border-[#132b60] text-xs text-slate-300 leading-relaxed">
          <div className="font-bold text-white mb-0.5 flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-amber-400 animate-pulse" />
            {isAdmin ? 'Quản Trị Hệ Thống' : 'Quản Trị Học Vụ'}
          </div>
          <div className="text-[11px] text-slate-400">
            {isAdmin
              ? 'ADMIN quản lý phân quyền, tài khoản và danh mục nền tảng.'
              : 'TBM quản lý học kỳ, phân công đề tài, xét duyệt và đánh giá.'}
          </div>
        </div>
      </div>
    </aside>
  );
};

export default Sidebar;
