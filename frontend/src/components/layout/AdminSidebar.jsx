import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  ShieldCheck,
  Users,
  KeyRound,
  GraduationCap,
  Briefcase,
  LogOut,
  LayoutDashboard,
  Award,
} from 'lucide-react';

const AdminSidebar = ({ onCloseMobile }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  const isItemActive = (path) => location.pathname === path;

  const getSubLinkClass = (active) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
      active
        ? 'bg-rose-50 text-rose-700 font-bold border border-rose-200/80 shadow-2xs'
        : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <aside className="w-64 bg-white border-r border-slate-200/80 h-full flex flex-col justify-between select-none">
      {/* 1. Header / Logo Area */}
      <div>
        <div className="p-5 border-b border-slate-100 flex items-center justify-between">
          <Link
            to="/"
            onClick={onCloseMobile}
            className="flex items-center gap-2.5 group cursor-pointer"
          >
            <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-rose-600 to-red-600 flex items-center justify-center text-white shadow-md shadow-rose-200 group-hover:scale-105 transition">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="font-black text-sm text-slate-900 leading-tight group-hover:text-rose-600 transition">
                Cổng Quản Trị
              </div>
              <div className="text-[10px] text-slate-400 font-medium">
                Quản trị viên (ADMIN)
              </div>
            </div>
          </Link>
        </div>

        {/* 2. Navigation Links */}
        <nav className="p-3 space-y-1">
          {/* Item 1: Quản lý Phân Quyền */}
          <Link
            to="/admin/permissions"
            onClick={onCloseMobile}
            className={getSubLinkClass(isItemActive('/admin/permissions'))}
          >
            <KeyRound className="w-4 h-4 text-rose-600" />
            <span>Quản lý phân quyền</span>
          </Link>

          {/* Item 2: Quản lý Người dùng */}
          <Link
            to="/admin/users"
            onClick={onCloseMobile}
            className={getSubLinkClass(isItemActive('/admin/users'))}
          >
            <Users className="w-4 h-4 text-slate-500" />
            <span>Quản lý người dùng</span>
          </Link>
        </nav>
      </div>

      {/* 3. Footer / User & Logout */}
      <div className="p-3 border-t border-slate-100 space-y-2">
        <div className="p-3 rounded-2xl bg-slate-50 border border-slate-100 flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-rose-100 text-rose-700 font-bold text-sm flex items-center justify-center shrink-0">
            A
          </div>
          <div className="min-w-0 flex-1">
            <div className="text-xs font-bold text-slate-900 truncate">
              {user?.fullName || 'Quản trị viên'}
            </div>
            <div className="text-[10px] text-rose-600 font-bold uppercase tracking-wider">
              {user?.code || 'ADMIN001'}
            </div>
          </div>
        </div>

        <button
          type="button"
          onClick={async () => {
            if (onCloseMobile) onCloseMobile();
            await logout();
            navigate('/login', { replace: true });
          }}
          className="w-full flex items-center justify-center gap-2 px-3 py-2 rounded-xl text-xs font-bold text-slate-600 hover:text-rose-600 hover:bg-rose-50 transition cursor-pointer"
        >
          <LogOut className="w-4 h-4" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
};

export default AdminSidebar;
