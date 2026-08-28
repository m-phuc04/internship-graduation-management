import React, { useState, useEffect } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Briefcase,
  BookOpen,
  LayoutDashboard,
  PlusCircle,
  FileText,
  Award,
  ChevronDown,
  Calendar,
  User,
  LogOut,
  Clock,
  TrendingUp,
} from 'lucide-react';

const StudentSidebar = ({ onCloseMobile, onOpenScheduleModal }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();

  // Accordion state: open by default if active route matches
  const isInternshipRoute =
    location.pathname.startsWith('/student/internship') || location.pathname.startsWith('/student/reports');
  const isThesisRoute =
    location.pathname.startsWith('/student/thesis');

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
    if (requiredSearch) {
      return location.search === requiredSearch;
    }
    return !location.search || location.search !== '?view=evaluation' && location.search !== '?view=progress';
  };

  const getSubLinkClass = (active) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
      active
        ? 'bg-indigo-50 text-indigo-700 font-bold shadow-2xs'
        : 'text-slate-500 hover:text-slate-900 hover:bg-slate-50'
    }`;

  return (
    <aside className="w-64 bg-white text-slate-800 flex flex-col shrink-0 min-h-screen border-r border-slate-200/80 select-none shadow-2xs">
      {/* Brand Header */}
      <Link
        to="/"
        onClick={onCloseMobile}
        className="h-16 flex items-center gap-3 px-5 border-b border-slate-100 bg-slate-50/40 cursor-pointer group hover:bg-indigo-50/30 transition"
      >
        <div className="p-1 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-xs group-hover:scale-105 transition shrink-0">
          <img
            src="https://iuh.edu.vn/assets/images/iuh.png?v=51"
            alt="IUH Logo"
            className="h-7 w-auto object-contain"
          />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-slate-900 tracking-tight leading-tight group-hover:text-indigo-600 transition">
            Cổng Sinh Viên
          </div>
          <div className="text-[10.5px] text-slate-400 font-medium truncate mt-0.5">
            Quản lý TTDN & KLTN
          </div>
        </div>
      </Link>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto custom-scrollbar">
        {/* 1. Tổng quan */}
        <div>
          <Link
            to="/student/dashboard"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              location.pathname === '/student/dashboard'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-bold'
                : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60'
            }`}
          >
            <LayoutDashboard className="w-4 h-4" />
            <span>Tổng quan</span>
          </Link>
        </div>

        {/* 2. Thực tập Doanh nghiệp (Dropdown Parent) */}
        <div className="space-y-1">
          <button
            type="button"
            onClick={() => setInternshipOpen(!internshipOpen)}
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-indigo-600 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-indigo-600" />
              <span>Thực tập Doanh nghiệp</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                internshipOpen ? 'rotate-180 text-indigo-600' : ''
              }`}
            />
          </button>

          {internshipOpen && (
            <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-indigo-100 ml-5 animate-in slide-in-from-top-1 duration-150">
              {/* Item 1: Đăng ký thực tập */}
              <Link
                to="/student/internship/register"
                onClick={onCloseMobile}
                className={getSubLinkClass(location.pathname === '/student/internship/register')}
              >
                <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Đăng ký thực tập</span>
              </Link>

              {/* Item 2: Thông tin thực tập */}
              <Link
                to="/student/internship"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/student/internship'))}
              >
                <Briefcase className="w-3.5 h-3.5 text-slate-400" />
                <span>Thông tin thực tập</span>
              </Link>

              {/* Item 3: Tiến độ thực tập */}
              <Link
                to="/student/reports?view=progress"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/student/reports', '?view=progress'))}
              >
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                <span>Tiến độ thực tập</span>
              </Link>

              {/* Item 4: Báo cáo thực tập */}
              <Link
                to="/student/reports"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/student/reports'))}
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Báo cáo thực tập</span>
              </Link>

              {/* Item 5: Đánh giá thực tập */}
              <Link
                to="/student/internship?view=evaluation"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/student/internship', '?view=evaluation'))}
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
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-700 hover:bg-slate-50 hover:text-violet-600 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <BookOpen className="w-4 h-4 text-violet-600" />
              <span>Khóa luận Tốt nghiệp</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                thesisOpen ? 'rotate-180 text-violet-600' : ''
              }`}
            />
          </button>

          {thesisOpen && (
            <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-violet-100 ml-5 animate-in slide-in-from-top-1 duration-150">
              {/* Item 1: Đăng ký đề tài */}
              <Link
                to="/student/thesis/register"
                onClick={onCloseMobile}
                className={getSubLinkClass(location.pathname === '/student/thesis/register')}
              >
                <PlusCircle className="w-3.5 h-3.5 text-slate-400" />
                <span>Đăng ký đề tài</span>
              </Link>

              {/* Item 2: Thông tin khóa luận */}
              <Link
                to="/student/thesis"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/student/thesis'))}
              >
                <GraduationCap className="w-3.5 h-3.5 text-slate-400" />
                <span>Thông tin khóa luận</span>
              </Link>

              {/* Item 3: Tiến độ KLTN */}
              <Link
                to="/student/thesis/progress?view=progress"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/student/thesis/progress', '?view=progress'))}
              >
                <TrendingUp className="w-3.5 h-3.5 text-slate-400" />
                <span>Tiến độ KLTN</span>
              </Link>

              {/* Item 4: Báo cáo KLTN */}
              <Link
                to="/student/thesis/progress"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/student/thesis/progress'))}
              >
                <FileText className="w-3.5 h-3.5 text-slate-400" />
                <span>Báo cáo KLTN</span>
              </Link>

              {/* Item 5: Đánh giá khóa luận */}
              <Link
                to="/student/thesis?view=evaluation"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/student/thesis', '?view=evaluation'))}
              >
                <Award className="w-3.5 h-3.5 text-slate-400" />
                <span>Đánh giá khóa luận</span>
              </Link>
            </div>
          )}
        </div>

        {/* 4. Common Module Group */}
        <div className="pt-2 border-t border-slate-100 space-y-0.5">
          <div className="px-3 pb-1.5 text-[10.5px] font-bold text-slate-400 uppercase tracking-wider">
            Tiện ích sinh viên
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenScheduleModal) onOpenScheduleModal();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60 transition cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-indigo-500" />
            <span>Lịch & Kế hoạch</span>
          </button>

          <Link
            to="/student/profile"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              location.pathname === '/student/profile'
                ? 'bg-indigo-600 text-white shadow-sm shadow-indigo-600/30 font-bold'
                : 'text-slate-600 hover:text-indigo-600 hover:bg-indigo-50/60'
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
            <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-slate-900 truncate">
                {user?.fullName || 'Sinh viên'}
              </div>
              <div className="text-[10px] text-indigo-600 font-semibold font-mono truncate">
                {user?.studentCode || 'Sinh viên'}
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

export default StudentSidebar;
