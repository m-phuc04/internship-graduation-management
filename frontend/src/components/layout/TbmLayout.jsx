import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

const TbmLayout = () => {
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

  // Đóng thanh điều hướng di động khi nhấn phím Escape hoặc phóng to màn hình
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

  return (
    <div className="flex min-h-screen bg-[#F4F7FC] text-slate-900 w-full overflow-x-clip">
      {/* Thanh điều hướng Desktop (Cố định bên trái, chỉ hiển thị >= 1300px) */}
      <div
        className={`admin-desktop-sidebar flex-col shrink-0 sticky top-0 h-screen z-20 transition-all duration-300 ease-in-out overflow-hidden ${
          isSidebarCollapsed ? 'w-0 opacity-0 border-r-0 pointer-events-none' : 'w-64 opacity-100 border-r border-[#0e2c73]'
        } bg-[#123891]`}
      >
        <Sidebar
          onToggleCollapse={toggleSidebar}
        />
      </div>

      {/* Lớp phủ và ngăn kéo menu (< 1300px: Mobile & Tablet) */}
      {mobileOpen && (
        <div className="admin-drawer-container fixed inset-0 z-50 flex">
          {/* Lớp phủ nền mờ */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          />

          {/* Ngăn kéo thanh bên trượt ra */}
          <div className="relative w-72 sm:w-80 max-w-[85vw] bg-[#123891] z-10 h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <Sidebar onCloseMobile={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Khu vực nội dung chính: 100% trên Mobile & Tablet (< 1300px), co giãn trên Desktop (>= 1300px) */}
      <div className="flex-1 flex flex-col min-w-0 w-full min-h-screen overflow-x-clip">
        <Header
          onOpenMobile={() => setMobileOpen(true)}
          isCollapsed={isSidebarCollapsed}
          onToggleCollapse={toggleSidebar}
        />
        <main className="flex-1 p-3 sm:p-5 lg:p-8 w-full max-w-full min-w-0">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default TbmLayout;
