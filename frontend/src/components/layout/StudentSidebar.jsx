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
import IUHLogo from '../common/IUHLogo';

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
    return !location.search || (location.search !== '?view=evaluation' && location.search !== '?view=progress');
  };

  const getSubLinkClass = (active) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
      active
        ? 'bg-[#F7B928] text-slate-950 font-bold shadow-xs'
        : 'text-slate-300 hover:text-white hover:bg-white/10'
    }`;

  return (
    <aside className="w-64 bg-[#0B1E48] text-slate-200 flex flex-col shrink-0 h-full select-none">
      {/* Brand Header */}
      <Link
        to="/"
        onClick={onCloseMobile}
        className="h-16 flex items-center gap-3 px-5 border-b border-[#132c66] bg-[#071638] cursor-pointer group transition"
      >
        <div className="p-1 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-xs group-hover:scale-105 transition shrink-0">
          <IUHLogo className="h-7 w-auto object-contain" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white tracking-tight leading-tight group-hover:text-amber-300 transition">
            Cổng Sinh Viên
          </div>
          <div className="text-[10.5px] text-blue-200/90 font-medium truncate mt-0.5">
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
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              location.pathname === '/student/dashboard'
                ? 'bg-[#F7B928] text-slate-950 font-bold shadow-md'
                : 'text-slate-200 hover:text-white hover:bg-white/10 font-semibold'
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
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <Briefcase className="w-4 h-4 text-[#F7B928]" />
              <span>Thực tập Doanh nghiệp</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                internshipOpen ? 'rotate-180 text-[#F7B928]' : ''
              }`}
            />
          </button>

          {internshipOpen && (
            <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-white/20 ml-5 animate-in slide-in-from-top-1 duration-150">
              {/* Item 1: Đăng ký thực tập */}
              <Link
                to="/student/internship/register"
                onClick={onCloseMobile}
                className={getSubLinkClass(location.pathname === '/student/internship/register')}
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Đăng ký thực tập</span>
              </Link>

              {/* Item 2: Thông tin thực tập */}
              <Link
                to="/student/internship"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/student/internship'))}
              >
                <Briefcase className="w-3.5 h-3.5 shrink-0" />
                <span>Thông tin thực tập</span>
              </Link>

              {/* Item 3: Nhật ký thực tập */}
              <Link
                to="/student/reports"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/student/reports'))}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Nhật ký thực tập</span>
              </Link>

              {/* Item 4: Đánh giá thực tập */}
              <Link
                to="/student/internship?view=evaluation"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/student/internship', '?view=evaluation'))}
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
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
            className="w-full flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs font-bold text-slate-200 hover:text-white hover:bg-white/10 transition-all cursor-pointer"
          >
            <div className="flex items-center gap-3">
              <GraduationCap className="w-4 h-4 text-[#F7B928]" />
              <span>Khóa luận Tốt nghiệp</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                thesisOpen ? 'rotate-180 text-[#F7B928]' : ''
              }`}
            />
          </button>

          {thesisOpen && (
            <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-white/20 ml-5 animate-in slide-in-from-top-1 duration-150">
              {/* Item 1: Đăng ký đề tài */}
              <Link
                to="/student/thesis/register"
                onClick={onCloseMobile}
                className={getSubLinkClass(location.pathname === '/student/thesis/register')}
              >
                <PlusCircle className="w-3.5 h-3.5 shrink-0" />
                <span>Đăng ký đề tài</span>
              </Link>

              {/* Item 2: Thông tin khóa luận */}
              <Link
                to="/student/thesis"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/student/thesis'))}
              >
                <GraduationCap className="w-3.5 h-3.5 shrink-0" />
                <span>Thông tin khóa luận</span>
              </Link>

              {/* Item 3: Nhật ký khóa luận */}
              <Link
                to="/student/thesis/progress"
                onClick={onCloseMobile}
                className={getSubLinkClass(location.pathname === '/student/thesis/progress')}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Nhật ký khóa luận</span>
              </Link>

              {/* Item 4: Đánh giá khóa luận */}
              <Link
                to="/student/thesis?view=evaluation"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/student/thesis', '?view=evaluation'))}
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>Đánh giá khóa luận</span>
              </Link>
            </div>
          )}
        </div>

        {/* 4. Common Module Group */}
        <div className="pt-2 border-t border-[#132c66] space-y-0.5">
          <div className="px-3 pb-1.5 text-[10.5px] font-bold text-blue-200/90 uppercase tracking-wider">
            Tiện ích cá nhân
          </div>

          <button
            type="button"
            onClick={() => {
              if (onOpenScheduleModal) onOpenScheduleModal();
              if (onCloseMobile) onCloseMobile();
            }}
            className="w-full flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold text-slate-200 hover:text-white hover:bg-white/10 transition cursor-pointer"
          >
            <Calendar className="w-4 h-4 text-[#F7B928]" />
            <span>Lịch & Kế hoạch</span>
          </button>

          <Link
            to="/student/profile"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs font-semibold transition-all cursor-pointer ${
              location.pathname === '/student/profile'
                ? 'bg-[#F7B928] text-slate-950 font-bold shadow-md'
                : 'text-slate-200 hover:text-white hover:bg-white/10'
            }`}
          >
            <User className="w-4 h-4 text-slate-300" />
            <span>Hồ sơ cá nhân</span>
          </Link>
        </div>
      </div>

      {/* Sidebar Footer / User & Logout */}
      <div className="p-3 border-t border-[#132c66] bg-[#071638]">
        <div className="flex items-center justify-between p-2 rounded-xl bg-[#0B1E48] border border-[#132c66]">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-[#F7B928] text-slate-950 flex items-center justify-center font-bold text-xs shrink-0 shadow-xs">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'S'}
            </div>
            <div className="min-w-0">
              <div className="text-xs font-bold text-white truncate">
                {user?.fullName || 'Sinh viên'}
              </div>
              <div className="text-[10px] text-[#F7B928] font-semibold font-mono truncate">
                {user?.studentCode || 'Sinh viên'}
              </div>
            </div>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            title="Đăng xuất"
            className="p-1.5 text-slate-300 hover:text-rose-400 hover:bg-white/10 rounded-lg transition shrink-0 cursor-pointer"
          >
            <LogOut className="w-4 h-4" />
          </button>
        </div>
      </div>
    </aside>
  );
};

export default StudentSidebar;
