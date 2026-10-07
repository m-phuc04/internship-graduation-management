import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  GraduationCap,
  Briefcase,
  BookOpen,
  LayoutDashboard,
  PlusCircle,
  Award,
  ChevronDown,
  Menu,
} from 'lucide-react';
import IUHLogo from '../common/IUHLogo';

const StudentSidebar = ({ onCloseMobile, onToggleCollapse }) => {
  const { user } = useAuth();
  const location = useLocation();

  // Accordion state: open by default if active route matches
  const isInternshipRoute =
    location.pathname.startsWith('/student/internship') || location.pathname.startsWith('/student/reports');
  const isThesisRoute = location.pathname.startsWith('/student/thesis');

  const [internshipOpen, setInternshipOpen] = useState(true);
  const [thesisOpen, setThesisOpen] = useState(true);

  useEffect(() => {
    if (isInternshipRoute) setInternshipOpen(true);
    if (isThesisRoute) setThesisOpen(true);
  }, [location.pathname, isInternshipRoute, isThesisRoute]);

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
        ? 'bg-[#ECA124] text-slate-950 font-bold shadow-xs'
        : 'text-slate-300 hover:text-white hover:bg-white/10'
    }`;

  // Submenu items data
  const internshipSubItems = [
    {
      to: '/student/internship/register',
      label: 'Đăng ký thực tập',
      icon: PlusCircle,
      active: location.pathname === '/student/internship/register',
    },
    {
      to: '/student/internship',
      label: 'Thông tin thực tập',
      icon: Briefcase,
      active: isItemActive('/student/internship'),
    },
    {
      to: '/student/reports',
      label: 'Nhật ký thực tập',
      icon: BookOpen,
      active: isItemActive('/student/reports'),
    },
    {
      to: '/student/internship?view=evaluation',
      label: 'Đánh giá thực tập',
      icon: Award,
      active: isItemActive('/student/internship', '?view=evaluation'),
    },
  ];

  const thesisSubItems = [
    {
      to: '/student/thesis/register',
      label: 'Đăng ký đề tài',
      icon: PlusCircle,
      active: location.pathname === '/student/thesis/register',
    },
    {
      to: '/student/thesis',
      label: 'Thông tin khóa luận',
      icon: GraduationCap,
      active: isItemActive('/student/thesis'),
    },
    {
      to: '/student/thesis/progress',
      label: 'Nhật ký khóa luận',
      icon: BookOpen,
      active: location.pathname === '/student/thesis/progress',
    },
    {
      to: '/student/thesis?view=evaluation',
      label: 'Đánh giá khóa luận',
      icon: Award,
      active: isItemActive('/student/thesis', '?view=evaluation'),
    },
  ];

  return (
    <aside className="w-64 max-w-[85vw] bg-[#123891] text-slate-200 flex flex-col shrink-0 h-full select-none">
      {/* Brand Header */}
      <div className="h-16 flex items-center justify-between px-3.5 border-b border-[#0e2c73] bg-[#0e2c73]">
        <Link
          to="/"
          onClick={onCloseMobile}
          className="flex items-center gap-3 cursor-pointer group transition min-w-0"
        >
          <div className="p-1 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-xs group-hover:scale-105 transition shrink-0">
            <IUHLogo className="h-7 w-auto object-contain" />
          </div>
          <div className="min-w-0">
            <div className="text-sm font-bold text-white tracking-tight leading-tight group-hover:text-amber-300 transition truncate">
              Cổng Sinh Viên
            </div>
            <div className="text-[10.5px] text-blue-200/90 font-medium truncate mt-0.5">
              Quản lý TTDN & KLTN
            </div>
          </div>
        </Link>
      </div>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto custom-scrollbar">
        {/* 1. Tổng quan */}
        <div>
          <Link
            to="/student/dashboard"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              location.pathname === '/student/dashboard'
                ? 'bg-[#ECA124] text-slate-950 font-bold shadow-md'
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
              <Briefcase className="w-4 h-4 text-[#ECA124]" />
              <span>Thực tập Doanh nghiệp</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                internshipOpen ? 'rotate-180 text-[#ECA124]' : ''
              }`}
            />
          </button>

          {internshipOpen && (
            <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-white/20 ml-5 animate-in slide-in-from-top-1 duration-150">
              {internshipSubItems.map((sub) => {
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.to}
                    to={sub.to}
                    onClick={onCloseMobile}
                    className={getSubLinkClass(sub.active)}
                  >
                    <SubIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{sub.label}</span>
                  </Link>
                );
              })}
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
              <GraduationCap className="w-4 h-4 text-[#ECA124]" />
              <span>Khóa luận Tốt nghiệp</span>
            </div>
            <ChevronDown
              className={`w-4 h-4 text-slate-400 transition-transform duration-200 ${
                thesisOpen ? 'rotate-180 text-[#ECA124]' : ''
              }`}
            />
          </button>

          {thesisOpen && (
            <div className="pl-4 pr-1 py-1 space-y-0.5 border-l-2 border-white/20 ml-5 animate-in slide-in-from-top-1 duration-150">
              {thesisSubItems.map((sub) => {
                const SubIcon = sub.icon;
                return (
                  <Link
                    key={sub.to}
                    to={sub.to}
                    onClick={onCloseMobile}
                    className={getSubLinkClass(sub.active)}
                  >
                    <SubIcon className="w-3.5 h-3.5 shrink-0" />
                    <span>{sub.label}</span>
                  </Link>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default StudentSidebar;
