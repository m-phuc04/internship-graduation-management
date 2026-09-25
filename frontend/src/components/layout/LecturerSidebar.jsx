import React, { useState, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  BookOpen,
  Briefcase,
  GraduationCap,
  LayoutDashboard,
  Users,
  Award,
  ChevronDown,
  Shield,
  Sliders,
} from 'lucide-react';
import IUHLogo from '../common/IUHLogo';

const LecturerSidebar = ({ onCloseMobile }) => {
  const { user } = useAuth();
  const location = useLocation();

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

  // Helper to check active state with query string precision
  const isItemActive = (path, requiredSearch = '') => {
    if (location.pathname !== path) return false;
    if (requiredSearch === '?tab=topics') {
      return location.search.includes('tab=topics');
    }
    if (requiredSearch === '?tab=review') {
      return (
        location.search.includes('tab=review') ||
        location.search.includes('tab=reviewer1') ||
        location.search.includes('tab=reviewer2')
      );
    }
    if (requiredSearch === '?view=evaluation') {
      return location.search.includes('view=evaluation');
    }
    if (requiredSearch === '?tab=supervisor') {
      return (
        location.search.includes('tab=supervisor') ||
        (!location.search.includes('tab=topics') &&
          !location.search.includes('tab=review') &&
          !location.search.includes('tab=reviewer1') &&
          !location.search.includes('tab=reviewer2') &&
          !location.search.includes('view=evaluation') &&
          !location.search.includes('view=progress'))
      );
    }
    if (requiredSearch) {
      return location.search === requiredSearch;
    }
    return (
      !location.search ||
      (location.search !== '?view=evaluation' &&
        location.search !== '?view=progress' &&
        !location.search.includes('tab=topics') &&
        !location.search.includes('tab=review') &&
        !location.search.includes('tab=reviewer1') &&
        !location.search.includes('tab=reviewer2'))
    );
  };

  const getSubLinkClass = (active) =>
    `flex items-center gap-2.5 px-3 py-2 rounded-lg text-xs font-medium transition-all cursor-pointer ${
      active
        ? 'bg-[#ECA124] text-slate-950 font-bold shadow-xs'
        : 'text-slate-300 hover:text-white hover:bg-white/10'
    }`;

  const isAdmin = user?.role === 'ADMIN';
  const isTbm = user?.role === 'TBM';

  return (
    <aside className="w-64 bg-[#123891] text-slate-200 flex flex-col shrink-0 h-full select-none">
      {/* Brand Header */}
      <Link
        to="/"
        onClick={onCloseMobile}
        className="h-16 flex items-center gap-3 px-5 border-b border-[#0e2c73] bg-[#0e2c73] cursor-pointer group transition"
      >
        <div className="p-1 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-xs group-hover:scale-105 transition shrink-0">
          <IUHLogo className="h-7 w-auto object-contain" />
        </div>
        <div className="min-w-0">
          <div className="text-sm font-bold text-white tracking-tight leading-tight group-hover:text-amber-300 transition">
            Cổng Giảng Viên
          </div>
          <div className="text-[10.5px] text-blue-200/90 font-medium truncate mt-0.5">
            Quản lý Hướng dẫn TTDN & KLTN
          </div>
        </div>
      </Link>

      {/* Navigation List */}
      <div className="flex-1 py-4 px-3 space-y-4 overflow-y-auto custom-scrollbar">
        {/* 1. Tổng quan & Dashboard Quản Trị */}
        <div className="space-y-1">
          <Link
            to="/lecturer/dashboard"
            onClick={onCloseMobile}
            className={`flex items-center gap-3 px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
              location.pathname === '/lecturer/dashboard'
                ? 'bg-[#ECA124] text-slate-950 font-bold shadow-md'
                : 'text-slate-200 hover:text-white hover:bg-white/10 font-semibold'
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
              className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl text-xs transition-all cursor-pointer ${
                location.pathname.startsWith('/admin') || location.pathname.startsWith('/tbm')
                  ? 'bg-[#ECA124] text-slate-950 font-bold shadow-md'
                  : 'text-slate-200 hover:text-white hover:bg-white/10 font-semibold'
              }`}
            >
              <div className="flex items-center gap-3">
                <Sliders className="w-4 h-4 text-[#ECA124]" />
                <span>Dashboard {isAdmin ? 'Admin' : 'TBM'}</span>
              </div>
              <span className="text-[10px] bg-white/20 text-white px-1.5 py-0.5 rounded-md font-bold uppercase tracking-wide">
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
              {/* Item 1: Sinh viên thực tập */}
              <Link
                to="/lecturer/internships"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/internships'))}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Sinh viên thực tập</span>
              </Link>

              {/* Item 2: Nhật ký thực tập */}
              <Link
                to="/lecturer/reports"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/reports'))}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Nhật ký thực tập</span>
              </Link>

              {/* Item 3: Đánh giá thực tập */}
              <Link
                to="/lecturer/internships?view=evaluation"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/internships', '?view=evaluation'))}
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
              {/* Item 1: Đề xuất đề tài KLTN */}
              <Link
                to="/lecturer/theses?tab=topics"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/theses', '?tab=topics'))}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Đề xuất đề tài KLTN</span>
              </Link>

              {/* Item 2: Sinh viên hướng dẫn */}
              <Link
                to="/lecturer/theses?tab=supervisor"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/theses', '?tab=supervisor'))}
              >
                <Users className="w-3.5 h-3.5 shrink-0" />
                <span>Sinh viên hướng dẫn</span>
              </Link>

              {/* Item 3: Nhật ký khóa luận */}
              <Link
                to="/lecturer/theses/progress"
                onClick={onCloseMobile}
                className={getSubLinkClass(location.pathname === '/lecturer/theses/progress')}
              >
                <BookOpen className="w-3.5 h-3.5 shrink-0" />
                <span>Nhật ký khóa luận</span>
              </Link>

              {/* Item 4: Đánh giá khóa luận */}
              <Link
                to="/lecturer/theses?view=evaluation"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/theses', '?view=evaluation'))}
              >
                <Award className="w-3.5 h-3.5 shrink-0" />
                <span>Đánh giá khóa luận</span>
              </Link>

              {/* Item 5: Phản biện khóa luận */}
              <Link
                to="/lecturer/theses?tab=review"
                onClick={onCloseMobile}
                className={getSubLinkClass(isItemActive('/lecturer/theses', '?tab=review'))}
              >
                <Shield className="w-3.5 h-3.5 shrink-0" />
                <span>Phản biện khóa luận</span>
              </Link>
            </div>
          )}
        </div>
      </div>
    </aside>
  );
};

export default LecturerSidebar;
