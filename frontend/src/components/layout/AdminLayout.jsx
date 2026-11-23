import React, { useState } from 'react';
import { Outlet } from 'react-router-dom';
import AdminSidebar from './AdminSidebar';
import { useAuth } from '../../context/AuthContext';
import { ShieldCheck, Menu } from 'lucide-react';
import NotificationDropdown from '../common/NotificationDropdown';
import Footer from './Footer';

const AdminLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(() => {
    return localStorage.getItem('sidebar_collapsed') === 'true';
  });

  const toggleSidebar = () => {
    setIsSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('sidebar_collapsed', String(next));
      return next;
    });
  };

  const { user } = useAuth();

  return (
    <div className="min-h-screen bg-slate-50 flex overflow-x-clip">
      {/* Thanh điều hướng Desktop (Cố định >= 1300px) */}
      <div
        className={`admin-desktop-sidebar flex-col shrink-0 sticky top-0 h-screen z-20 transition-all duration-300 ease-in-out overflow-hidden ${
          isSidebarCollapsed ? 'w-0 opacity-0 border-r-0 pointer-events-none' : 'w-64 opacity-100 border-r border-[#0e2c73]'
        } bg-[#123891]`}
      >
        <AdminSidebar
          onToggleCollapse={toggleSidebar}
        />
      </div>

      {/* Ngăn kéo điều hướng Mobile & Tablet (< 1300px) */}
      {mobileOpen && (
        <div className="fixed inset-0 z-50 admin-drawer-container flex">
          <div
            className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          />
          <div className="relative w-72 sm:w-80 max-w-[85vw] bg-[#123891] shadow-2xl z-10 h-full flex flex-col animate-in slide-in-from-left duration-200">
            <AdminSidebar onCloseMobile={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Khu vực nội dung chính */}
      <div className="flex-1 flex flex-col min-w-0 min-h-screen overflow-x-clip">
        {/* Thanh tiêu đề trên cùng */}
        <header className="admin-sticky-header h-16 bg-white/95 backdrop-blur-md border-b border-slate-200/80 sticky top-0 z-40 flex items-center justify-between px-4 sm:px-6 shadow-xs">
          <div className="flex items-center gap-3">
            {/* Nút mở menu cho Mobile & Tablet */}
            <button
              type="button"
              onClick={() => setMobileOpen(true)}
              className="admin-hamburger-btn p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              title="Mở menu điều hướng"
              aria-label="Mở menu điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>

            {/* Nút thu gọn/mở menu cho Desktop */}
            <button
              type="button"
              onClick={toggleSidebar}
              className="admin-desktop-toggle p-2 text-slate-500 hover:text-slate-900 rounded-xl hover:bg-slate-50 transition cursor-pointer"
              title={isSidebarCollapsed ? 'Mở rộng thanh điều hướng' : 'Thu gọn thanh điều hướng'}
              aria-label="Đóng/mở thanh điều hướng"
            >
              <Menu className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-rose-50 text-rose-600 flex items-center justify-center font-bold text-xs">
                <ShieldCheck className="w-4 h-4" />
              </div>
              <span className="font-bold text-xs text-slate-800 hidden sm:inline">
                Hệ Thống Quản Trị Trung Tâm (Administrator Portal)
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <NotificationDropdown />
            <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-slate-50 border border-slate-200/80">
              <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              <span className="text-[11px] font-bold text-slate-700 truncate max-w-[90px] sm:max-w-none">
                {user?.fullName || 'Quản trị viên'}
              </span>
              <span className="text-[9px] font-bold bg-rose-100 text-rose-700 px-1.5 py-0.5 rounded">
                ADMIN
              </span>
            </div>
          </div>
        </header>

        {/* Nội dung trang */}
        <main className="flex-1 p-3 sm:p-6 lg:p-8 w-full max-w-full">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default AdminLayout;
