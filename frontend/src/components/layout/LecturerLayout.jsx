import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import notificationApi from '../../api/notificationApi';
import LecturerSidebar from './LecturerSidebar';
import NotificationDropdown from '../common/NotificationDropdown';
import ScheduleModal from '../common/ScheduleModal';
import Footer from './Footer';

import {
  Menu,
  X,
  Bell,
  BookOpen,
  User,
  LogOut,
  ChevronDown,
  Sparkles,
  Calendar,
} from 'lucide-react';

const LecturerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);

  const fetchUnreadNotifications = async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await notificationApi.getUnreadCount();
      if (res?.success && res.data) {
        setUnreadCount(res.data.unreadCount || 0);
      }
    } catch {
      // silent
    }
  };

  useEffect(() => {
    if (user) {
      fetchUnreadNotifications();
      const interval = setInterval(fetchUnreadNotifications, 30000);
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
    }
  }, [user]);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* 1. Desktop Fixed Sidebar */}
      <div className="hidden lg:flex flex-col shrink-0 sticky top-0 h-screen z-20 w-64 bg-white border-r border-slate-200/80">
        <LecturerSidebar
          unreadCount={unreadCount}
          onOpenNotifications={() => {}}
          onOpenScheduleModal={() => setScheduleModalOpen(true)}
        />
      </div>

      {/* 2. Mobile Drawer Sidebar */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity"
            onClick={() => setMobileOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] bg-white h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <button
              onClick={() => setMobileOpen(false)}
              className="absolute top-4 right-3 p-2 text-slate-400 hover:text-slate-700 rounded-lg cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            <LecturerSidebar
              onCloseMobile={() => setMobileOpen(false)}
              unreadCount={unreadCount}
              onOpenScheduleModal={() => setScheduleModalOpen(true)}
            />
          </div>
        </div>
      )}

      {/* 3. Main Workspace Area */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen">
        {/* Top Header */}
        <header className="sticky top-0 z-30 h-16 bg-white border-b border-slate-200/80 px-4 sm:px-6 lg:px-8 flex items-center justify-between gap-4 backdrop-blur-md bg-white/95 shadow-2xs">
          {/* Left: Mobile Toggle & Breadcrumb Title */}
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="p-2 -ml-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl lg:hidden transition cursor-pointer"
              title="Mở menu"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="hidden sm:block">
              <h1 className="text-base font-black text-slate-900 tracking-tight">
                Cổng Quản Lý Giảng Viên & Bộ Môn
              </h1>
              <p className="text-[11px] text-slate-400 font-medium leading-none mt-0.5">
                Hệ thống Quản lý Thực tập & Khóa luận Tốt nghiệp
              </p>
            </div>
          </div>

          {/* Right: Quick actions, Notifications & User Menu */}
          <div className="flex items-center gap-3">
            {/* Schedule Trigger Button in Header */}
            <button
              type="button"
              onClick={() => setScheduleModalOpen(true)}
              className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
              title="Lịch trình & Kế hoạch học kỳ"
            >
              <Calendar className="w-5 h-5" />
            </button>

            {/* Notification Bell Dropdown */}
            <NotificationDropdown />

            {/* User Dropdown */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition cursor-pointer group"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-violet-600 transition">
                    {user?.fullName || (user?.role === 'ADMIN' ? 'Quản trị viên' : user?.role === 'TBM' ? 'Trưởng Bộ Môn' : 'Giảng viên')}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-violet-600">
                    {user?.role === 'ADMIN'
                      ? 'QUẢN TRỊ VIÊN'
                      : user?.role === 'TBM'
                      ? 'TRƯỞNG BỘ MÔN'
                      : 'GIẢNG VIÊN'}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-xs">
                  {user?.fullName
                    ? user.fullName.charAt(0).toUpperCase()
                    : 'U'}
                </div>

                <ChevronDown className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-600 transition hidden sm:block" />
              </button>

              {userMenuOpen && (
                <>
                  <div
                    className="fixed inset-0 z-40"
                    onClick={() => setUserMenuOpen(false)}
                  />
                  <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-1.5 z-50 animate-in fade-in-50 zoom-in-95">
                    <div className="px-3.5 py-2 border-b border-slate-100">
                      <div className="text-xs font-bold text-slate-900 truncate">
                        {user?.fullName}
                      </div>
                      <div className="text-[11px] text-slate-400 truncate">
                        {user?.email}
                      </div>
                    </div>

                    {user?.role === 'TBM' && (
                      <Link
                        to="/tbm/dashboard"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-violet-700 bg-violet-50/70 hover:bg-violet-100 transition"
                      >
                        <span className="w-2 h-2 rounded-full bg-violet-600" />
                        <span>Dashboard (Quản trị TBM)</span>
                      </Link>
                    )}

                    {user?.role === 'ADMIN' && (
                      <Link
                        to="/admin/permissions"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-violet-700 bg-violet-50/70 hover:bg-violet-100 transition"
                      >
                        <span className="w-2 h-2 rounded-full bg-violet-600" />
                        <span>Dashboard (Quản trị ADMIN)</span>
                      </Link>
                    )}

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setScheduleModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition"
                    >
                      <Calendar className="w-4 h-4 text-slate-400" />
                      <span>Lịch & Kế hoạch đào tạo</span>
                    </button>

                    <Link
                      to="/lecturer/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-violet-50 hover:text-violet-700 transition"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Hồ sơ cá nhân</span>
                    </Link>

                    <Link
                      to="/"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-slate-50 transition"
                    >
                      <Sparkles className="w-4 h-4 text-slate-400" />
                      <span>Trang chủ hệ thống</span>
                    </Link>

                    <div className="my-1 border-t border-slate-100" />

                    <button
                      type="button"
                      onClick={handleLogout}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-rose-600 hover:bg-rose-50 transition cursor-pointer"
                    >
                      <LogOut className="w-4 h-4" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        </header>

        {/* Content Outlet */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
        <Footer />
      </div>

      {/* Training Milestones & Schedule Modal */}
      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
      />
    </div>
  );
};

export default LecturerLayout;
