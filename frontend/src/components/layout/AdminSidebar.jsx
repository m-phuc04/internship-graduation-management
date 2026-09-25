import React from 'react';
import { NavLink, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Users,
  KeyRound,
  Calendar,
  X,
  BookOpen,
  Building2,
} from 'lucide-react';
import IUHLogo from '../common/IUHLogo';

const AdminSidebar = ({ onCloseMobile }) => {
  const { user } = useAuth();

  const handleNavClick = () => {
    if (onCloseMobile) onCloseMobile();
  };

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
          to="/admin/permissions"
          onClick={handleNavClick}
          className="flex items-center gap-3 cursor-pointer group hover:opacity-95 transition min-w-0"
        >
          <div className="p-1 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-xs group-hover:scale-105 transition shrink-0">
            <IUHLogo className="h-7 w-auto object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-tight leading-tight group-hover:text-amber-300 transition truncate">
              Cổng Quản Trị
            </div>
            <div className="text-[10.5px] text-blue-200/90 font-medium truncate mt-0.5">
              Quản trị viên (ADMIN)
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

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto custom-scrollbar">
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
      </div>
    </aside>
  );
};

export default AdminSidebar;
