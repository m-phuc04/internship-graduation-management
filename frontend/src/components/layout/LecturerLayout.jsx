import React, { useState, useEffect } from 'react';
import { Outlet, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import notificationApi from '../../api/notificationApi';
import LecturerSidebar from './LecturerSidebar';
import NotificationDropdown from '../common/NotificationDropdown';
import EmailNotificationModal from '../common/EmailNotificationModal';
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
  Mail,
  AlertTriangle,
  KeyRound,
} from 'lucide-react';

const LecturerLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [userMenuOpen, setUserMenuOpen] = useState(false);
  const [emailModalOpen, setEmailModalOpen] = useState(false);
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
      // Bỏ qua thông báo lỗi
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

  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  // Đóng thanh điều hướng di động khi nhấn phím Escape hoặc màn hình >= 1300px
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
      }
    };
    const handleResize = () => {
      if (window.innerWidth >= 1300) {
        setMobileOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('resize', handleResize);
    };
  }, []);

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-x-clip w-full">
      {/* 1. Thanh điều hướng cố định Desktop */}
      <div
        className={`lecturer-desktop-sidebar flex-col shrink-0 sticky top-0 h-screen z-20 transition-all duration-300 ease-in-out overflow-hidden ${
          isSidebarCollapsed ? 'w-0 opacity-0 border-r-0 pointer-events-none' : 'w-64 opacity-100 border-r border-[#0e2c73]'
        } bg-[#123891]`}
      >
        <LecturerSidebar
          onToggleCollapse={toggleSidebar}
          unreadCount={unreadCount}
          onOpenNotifications={() => {}}
        />
      </div>

      {/* 2. Ngăn kéo điều hướng Mobile */}
      {mobileOpen && (
        <div className="lecturer-drawer-container fixed inset-0 z-50 flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          />
          <div className="relative w-72 sm:w-80 max-w-[85vw] bg-[#123891] h-full shadow-2xl flex flex-col z-10 animate-in slide-in-from-left duration-200">
            <LecturerSidebar
              onCloseMobile={() => setMobileOpen(false)}
              unreadCount={unreadCount}
            />
          </div>
        </div>
      )}

      {/* 3. Khu vực làm việc chính */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen w-full overflow-x-clip">
        {/* Thanh tiêu đề trên cùng */}
        <header className="lecturer-sticky-header sticky top-0 z-40 h-16 bg-white/95 border-b border-slate-200/80 px-3 sm:px-5 lg:px-8 flex items-center justify-between gap-2 sm:gap-4 backdrop-blur-md shadow-2xs w-full">
          {/* Bên trái: Nút menu và tiêu đề breadcrumb */}
          <div className="flex items-center gap-3">
            {/* Nút mở menu Mobile */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="lecturer-hamburger-btn p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
              title="Mở menu điều hướng"
              aria-label="Mở menu điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Nút thu gọn/mở menu cho Desktop */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="lecturer-desktop-toggle p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
              title={isSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              aria-label="Đóng/mở thanh điều hướng"
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

          {/* Bên phải: Thao tác nhanh, thông báo và menu người dùng */}
          <div className="flex items-center gap-3">
            {/* Menu chuông thông báo */}
            <NotificationDropdown />

            {/* Menu người dùng */}
            <div className="relative">
              <button
                type="button"
                onClick={() => setUserMenuOpen(!userMenuOpen)}
                className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl hover:bg-slate-50 border border-transparent hover:border-slate-200 transition cursor-pointer group"
              >
                <div className="text-right hidden sm:block">
                  <div className="text-xs font-bold text-slate-900 group-hover:text-[#ECA124] transition">
                    {user?.fullName || (user?.role === 'ADMIN' ? 'Quản trị viên' : user?.role === 'TBM' ? 'Trưởng Bộ Môn' : 'Giảng viên')}
                  </div>
                  <div className="text-[10px] font-bold uppercase tracking-wider text-[#1B4DA1]">
                    {user?.role === 'ADMIN'
                      ? 'QUẢN TRỊ VIÊN'
                      : user?.role === 'TBM'
                      ? 'TRƯỞNG BỘ MÔN'
                      : 'GIẢNG VIÊN'}
                  </div>
                </div>

                <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-[#123891] to-[#1B4DA1] text-white flex items-center justify-center font-bold text-xs shadow-xs">
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
                        className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-[#123891] bg-blue-50/70 hover:bg-blue-100 transition"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#123891]" />
                        <span>Dashboard (Quản trị TBM)</span>
                      </Link>
                    )}

                    {user?.role === 'ADMIN' && (
                      <Link
                        to="/admin/permissions"
                        onClick={() => setUserMenuOpen(false)}
                        className="flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-[#123891] bg-blue-50/70 hover:bg-blue-100 transition"
                      >
                        <span className="w-2 h-2 rounded-full bg-[#123891]" />
                        <span>Dashboard (Quản trị ADMIN)</span>
                      </Link>
                    )}

                    <Link
                      to="/lecturer/profile"
                      onClick={() => setUserMenuOpen(false)}
                      className="flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#ECA124] transition"
                    >
                      <User className="w-4 h-4 text-slate-400" />
                      <span>Hồ sơ cá nhân</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setUserMenuOpen(false);
                        setEmailModalOpen(true);
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs text-slate-700 hover:bg-blue-50 hover:text-[#123891] transition text-left cursor-pointer"
                    >
                      <Mail className="w-4 h-4 text-slate-400" />
                      <span>Đăng ký nhận email thông báo</span>
                    </button>

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

        {/* Thanh cảnh báo đổi mật khẩu bắt buộc */}
        {user?.mustChangePassword && (
          <div className="bg-amber-500 text-white px-4 py-2.5 text-xs font-medium flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2 shadow-xs shrink-0">
            <div className="flex items-center gap-2">
              <AlertTriangle className="w-4 h-4 shrink-0 text-white animate-pulse" />
              <span>
                <strong>Bắt buộc đổi mật khẩu:</strong> Tài khoản của bạn vừa được cấp mới hoặc đặt lại mật khẩu. Vui lòng đổi mật khẩu ngay để kích hoạt đầy đủ bảo mật tài khoản.
              </span>
            </div>
            <Link
              to="/lecturer/profile"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-white text-amber-900 rounded-lg text-xs font-bold hover:bg-amber-50 transition shrink-0 shadow-2xs"
            >
              <KeyRound className="w-3.5 h-3.5 text-amber-600" />
              <span>Đổi mật khẩu ngay</span>
            </Link>
          </div>
        )}

        {/* Khu vực hiển thị nội dung route */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 w-full max-w-full">
          <Outlet />
        </main>
        <Footer />
      </div>

      {/* Modal cài đặt thông báo email (TTDN, KLTN & Tin tức) */}
      {emailModalOpen && (
        <EmailNotificationModal
          isOpen={emailModalOpen}
          onClose={() => setEmailModalOpen(false)}
        />
      )}
    </div>
  );
};

export default LecturerLayout;
