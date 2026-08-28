import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, useLocation, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import StudentSidebar from './StudentSidebar';
import NotificationDropdown from '../common/NotificationDropdown';
import Modal from '../common/Modal';
import ScheduleModal from '../common/ScheduleModal';
import {
  GraduationCap,
  LogOut,
  ChevronDown,
  User,
  Menu,
  X,
  Calendar,
  Clock,
  CheckCircle2,
  AlertCircle,
  FileText,
  Briefcase,
  BookOpen,
} from 'lucide-react';

const StudentLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();

  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [mobileDrawerOpen, setMobileDrawerOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  // Map location to breadcrumb title
  const getPageTitle = () => {
    if (location.pathname.includes('/student/dashboard')) return 'Tổng quan Sinh viên';
    if (location.pathname.includes('/student/internship/register')) return 'Đăng ký Thực tập Doanh nghiệp';
    if (location.pathname.includes('/student/internship')) return 'Hồ sơ Thực tập Doanh nghiệp';
    if (location.pathname.includes('/student/reports')) return 'Báo cáo & Tiến độ Thực tập';
    if (location.pathname.includes('/student/thesis/register')) return 'Đăng ký Khóa luận Tốt nghiệp';
    if (location.pathname.includes('/student/thesis/progress')) return 'Tiến độ & Báo cáo KLTN';
    if (location.pathname.includes('/student/thesis')) return 'Hồ sơ Khóa luận Tốt nghiệp';
    if (location.pathname.includes('/student/profile')) return 'Hồ sơ cá nhân';
    return 'Cổng Sinh viên';
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex">
      {/* Desktop Sidebar (Fixed Left) */}
      <div className="hidden lg:block shrink-0 sticky top-0 h-screen overflow-hidden">
        <StudentSidebar onOpenScheduleModal={() => setScheduleModalOpen(true)} />
      </div>

      {/* Mobile Drawer Backdrop & Sidebar */}
      {mobileDrawerOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileDrawerOpen(false)}
          />
          <div className="relative w-64 bg-white z-10 h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <StudentSidebar
              onCloseMobile={() => setMobileDrawerOpen(false)}
              onOpenScheduleModal={() => setScheduleModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top Header */}
        <header className="bg-white border-b border-slate-200/80 sticky top-0 z-30 shadow-2xs backdrop-blur-md bg-white/95">
          <div className="px-3 sm:px-6 lg:px-8">
            <div className="flex items-center justify-between h-16 gap-2 sm:gap-4">
              {/* Left: Mobile Toggle & Page Title */}
              <div className="flex items-center gap-2 sm:gap-3 min-w-0">
                <button
                  type="button"
                  onClick={() => setMobileDrawerOpen(true)}
                  className="lg:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition shrink-0"
                  title="Mở menu"
                >
                  <Menu className="w-5 h-5" />
                </button>

                {/* Brand Title for Mobile / Tablet */}
                <Link to="/" className="flex items-center gap-2 lg:hidden cursor-pointer group min-w-0 shrink">
                  <div className="p-1 bg-white rounded-lg border border-slate-100 flex items-center justify-center shadow-xs shrink-0">
                    <img
                      src="https://iuh.edu.vn/assets/images/iuh.png?v=51"
                      alt="IUH Logo"
                      className="h-5 w-auto object-contain"
                    />
                  </div>
                  <div className="min-w-0 truncate">
                    <div className="text-xs font-bold text-slate-900 leading-tight truncate">
                      Cổng Sinh Viên
                    </div>
                  </div>
                </Link>

                {/* Page Breadcrumb Title (Desktop) */}
                <div className="hidden lg:block min-w-0">
                  <h1 className="text-base font-bold text-slate-900 leading-tight truncate">
                    {getPageTitle()}
                  </h1>
                  <div className="text-[11px] text-slate-400 font-medium mt-0.5 truncate">
                    Hệ thống Quản lý Thực tập Doanh nghiệp & Khóa luận Tốt nghiệp
                  </div>
                </div>
              </div>

              {/* Right: Quick Notifications & User Profile */}
              <div className="flex items-center gap-1.5 sm:gap-3 shrink-0">
                <NotificationDropdown />

                {/* User Dropdown */}
                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setDropdownOpen(!dropdownOpen)}
                    className="flex items-center gap-1.5 sm:gap-2.5 p-1 sm:p-1.5 sm:pl-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="text-right hidden sm:block">
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {user?.fullName || 'Sinh viên'}
                      </div>
                      <div className="text-[10px] text-indigo-600 font-semibold uppercase tracking-wider">
                        Sinh viên
                      </div>
                    </div>
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'S'}
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
                  </button>

                  {dropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 sm:w-60 max-w-[calc(100vw-2rem)] bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in text-xs">
                        <div className="px-4 py-3 border-b border-slate-100">
                          <div className="font-bold text-slate-900 text-xs">
                            {user?.fullName}
                          </div>
                          <div className="text-[11px] text-slate-500 font-medium truncate mt-0.5">
                            {user?.email || `MSSV: ${user?.studentCode || 'N/A'}`}
                          </div>
                          <div className="inline-flex items-center gap-1 text-[10px] font-bold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md mt-1.5">
                            <GraduationCap className="w-3 h-3" /> Sinh viên chính quy
                          </div>
                        </div>

                        <div className="p-1.5 space-y-0.5">
                          <NavLink
                            to="/student/profile"
                            onClick={() => setDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition"
                          >
                            <User className="w-4 h-4 text-slate-400" />
                            <span>Hồ sơ cá nhân</span>
                          </NavLink>

                          <button
                            type="button"
                            onClick={() => {
                              setDropdownOpen(false);
                              setScheduleModalOpen(true);
                            }}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition text-left"
                          >
                            <Calendar className="w-4 h-4 text-slate-400" />
                            <span>Lịch & Kế hoạch đào tạo</span>
                          </button>

                          <button
                            type="button"
                            onClick={handleLogout}
                            className="w-full flex items-center gap-2.5 px-3.5 py-2 font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition text-left"
                          >
                            <LogOut className="w-4 h-4" />
                            <span>Đăng xuất</span>
                          </button>
                        </div>
                      </div>
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* Main Content Router View */}
        <main className="flex-1 p-3.5 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto min-w-0">
          <Outlet />
        </main>
      </div>

      {/* Training Milestones & Schedule Modal */}
      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
      />
    </div>
  );
};

export default StudentLayout;
