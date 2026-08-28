import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  Briefcase,
  GraduationCap,
  LayoutDashboard,
  Users,
  FileText,
  Award,
  ChevronDown,
  Bell,
  User,
  LogOut,
  TrendingUp,
  Shield,
  Sliders,
  Calendar,
} from 'lucide-react';

const LecturerSidebar = ({ onCloseMobile, onOpenNotifications, onOpenScheduleModal, unreadCount = 0 }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Accordion state: open by default if active route matches
  const isInternshipRoute =
    location.pathname.startsWith('/lecturer/internships') || location.pathname.startsWith('/lecturer/reports');
  const isThesisRoute = location.pathname.includes('/lecturer/theses');

  const [internshipOpen, setInternshipOpen] = useState(true);
  const [thesisOpen, setThesisOpen] = useState(true);

  useEffect(() => {
    if (isInternshipRoute) setInternshipOpen(true);
    if (isThesisRoute) setThesisOpen(true);
  }, [location.pathname, isInternshipRoute, isThesisRoute]);

  const handleLogout = async () => {
    if (onCloseMobile) onCloseMobile();
    await logout();
    navigate('/login', { replace: true });
  };

  // Helper to check active state with query string precision
  const isItemActive = (path, requiredSearch = '') => {
    if (location.pathname !== path) return false;
    if (requiredSearch === '?tab=review') {
      return (
        location.search.includes('tab=review') ||
        location.search.includes('tab=reviewer1') ||
        location.search.includes('tab=reviewer2')
      );
    }
    if (requiredSearch) {
      return location.search === requiredSearch;
    }
    return (
      !location.search ||
      (location.search !== '?view=evaluation' &&
        location.search !== '?view=progress' &&
        !location.search.includes('tab=review') &&
        !location.search.includes('tab=reviewer1') &&
        !location.search.includes('tab=reviewer2'))
    );
  };

  const getSubLinkClass = (active) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
      active
        ? 'bg-violet-50 text-violet-700 font-bold shadow-2xs'
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
    }`;

  const isAdmin = user?.role === 'ADMIN';
  const isTbm = user?.role === 'TBM';

  return (
    <aside className="w-64 bg-white text-slate-800 flex flex-col shrink-0 min-h-screen border-r border-slate-200/80 select-none shadow-2xs">
      {/* Brand Header */}
      <Link
        to="/"
        onClick={onCloseMobile}
        className="h-16 flex items-center gap-3 px-5 border-b border-slate-100 bg-slate-50/40 cursor-pointer group hover:bg-violet-50/30 transition"
      >
        <div className="p-1 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-xs group-hover:scale-105 transition shrink-0">
          <img
            src="https://iuh.edu.vn/assets/images/iuh.png?v=51"
            alt="IUH Logo"
            className="h-7 w-auto object-contain"
          />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 tracking-tight leading-tight group-hover:text-violet-600 transition">
            Cổng Giảng Viên
          </div>
          <div className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
            Quản lý Hướng dẫn TTDN & KLTN
          </div>
        </div>
      </Link>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto custom-scrollbar">
        {/* 1. Tổng quan & Dashboard Quản Trị (Đặt ngay dưới Tổng quan) */}
        <div className="space-y-1">
          <Link
            to="/lecturer/dashboard"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              location.pathname === '/lecturer/dashboard'
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/30 font-bold'
                : 'text-slate-600 hover:text-violet-600 hover:bg-violet-50/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Tổng quan</span>
          </Link>

          {/* Dashboard Quản Trị (TBM / ADMIN) */}
          {(isTbm || isAdmin) && (
            <Link
              to={isAdmin ? '/admin/permissions' : '/tbm/dashboard'}
              onClick={onCloseMobile}
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
                location.pathname.startsWith('/admin') || location.pathname.startsWith('/tbm')
                  ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/30 font-bold'
                  : 'text-slate-600 hover:text-violet-600 hover:bg-violet-50/60'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4 text-violet-600" />
                <span>Dashboard</span>
              </div>
              <span className="text-[10px] bg-violet-100 text-violet-700 px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">
                {isAdmin ? 'ADMIN' : 'TBM'}
              </span>
            </Link>
          )}
        </div>

        {/* 2. Thực tập Doanh nghiệp (Dropdown Parent) */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setInternshipOpen(!internshipOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-violet-600 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-violet-600" />
              <span>Thực tập Doanh nghiệp</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                internshipOpen ? 'rotate-180 text-violet-600' : ''
              }`}
            />
          </button>

          {internshipOpen && (
            <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-violet-100 ml-5 animate-in slide-in-from-top-1 duration-150">
              {/* Item 1: Sinh viên thực tập */}
              <Link
                to="/lecturer/internships"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/internships'))}
              >
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Sinh viên thực tập</span>
              </Link>

              {/* Item 2: Theo dõi tiến độ */}
              <Link
                to="/lecturer/reports?view=progress"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/reports', '?view=progress'))}
              >
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                <span>Theo dõi tiến độ</span>
              </Link>

              {/* Item 3: Báo cáo thực tập */}
              <Link
                to="/lecturer/reports"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/reports'))}
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Báo cáo thực tập</span>
              </Link>

              {/* Item 4: Đánh giá thực tập */}
              <Link
                to="/lecturer/internships?view=evaluation"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/internships', '?view=evaluation'))}
              >
                <Award className="w-3.5 h-3.5 text-slate-400" />
                <span>Đánh giá thực tập</span>
              </Link>
            </div>
          )}
        </div>

        {/* 3. Khóa luận Tốt nghiệp (Dropdown Parent) */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setThesisOpen(!thesisOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <GraduationCap className="w-4 h-4 text-indigo-600" />
              <span>Khóa luận Tốt nghiệp</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                thesisOpen ? 'rotate-180 text-indigo-600' : ''
              }`}
            />
          </button>

          {thesisOpen && (
            <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-indigo-100 ml-5 animate-in slide-in-from-top-1 duration-150">
              {/* Item 1: Sinh viên hướng dẫn */}
              <Link
                to="/lecturer/theses"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/theses'))}
              >
                <Users className="w-3.5 h-3.5 text-slate-400" />
                <span>Sinh viên hướng dẫn</span>
              </Link>

              {/* Item 2: Theo dõi tiến độ KLTN */}
              <Link
                to="/lecturer/theses/progress?view=progress"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/theses/progress', '?view=progress'))}
              >
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                <span>Theo dõi tiến độ KLTN</span>
              </Link>

              {/* Item 3: Báo cáo KLTN */}
              <Link
                to="/lecturer/theses/progress"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/theses/progress'))}
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Báo cáo KLTN</span>
              </Link>

              {/* Item 4: Đánh giá khóa luận */}
              <Link
                to="/lecturer/theses?view=evaluation"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/theses', '?view=evaluation'))}
              >
                <Award className="w-3.5 h-3.5 text-slate-400" />
                <span>Đánh giá khóa luận</span>
              </Link>

              {/* Item 5: Phản biện khóa luận */}
              <Link
                to="/lecturer/theses?tab=review"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/theses', '?tab=review'))}
              >
                <Shield className="w-3.5 h-3.5 text-slate-400" />
                <span>Phản biện khóa luận</span>
              </Link>
            </div>
          )}
        </div>

        {/* 4. Common Module Group */}
        <div className="pt-2 border-t border-slate-100 space-y-0.5">
          <div className="px-3 pb-1.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
            Tiện ích cá nhân
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenNotifications) onOpenNotifications();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-violet-600 hover:bg-violet-50/60 transition cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Bell className="w-4 h-4 text-violet-500" />
              <span>Thông báo</span>
            </div>
            {unreadCount > 0 && (
              <span className="px-1.5 py-0.5 rounded-full bg-rose-500 text-white font-bold text-[10px] leading-none">
                {unreadCount}
              </span>
            )}
          </button>

          <button
            type="button"
            onClick={() => {
              if (onOpenScheduleModal) onOpenScheduleModal();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-violet-600 hover:bg-violet-50/60 transition cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-violet-500" />
            <span>Lịch & Kế hoạch</span>
          </button>

          <Link
            to="/lecturer/profile"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              location.pathname === '/lecturer/profile'
                ? 'bg-violet-600 text-white shadow-sm shadow-violet-600/30 font-bold'
                : 'text-slate-600 hover:text-violet-600 hover:bg-violet-50/60'
            }`}
          >
            <User className="w-4 h-4 text-slate-400" />
            <span>Hồ sơ cá nhân</span>
          </Link>
        </div>
      </div>

      {/* Sidebar Footer / User & Logout */}
      <div className="p-3 border-t border-slate-100 bg-slate-50/60">
        <div className="flex items-center justify-between p-2 rounded-xl bg-white border border-slate-200/70 shadow-2xs">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.fullName || (isAdmin ? 'Quản trị viên' : isTbm ? 'Trưởng Bộ Môn' : 'Giảng viên')}
              </div>
              <div className="text-[10px] font-bold uppercase tracking-wider font-mono truncate text-violet-600">
                {isAdmin ? 'QUẢN TRỊ VIÊN' : isTbm ? 'TRƯỞNG BỘ MÔN' : 'GIẢNG VIÊN'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Đăng xuất"
            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default LecturerSidebar;
