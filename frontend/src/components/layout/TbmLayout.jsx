import React, { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import Footer from './Footer';

const TbmLayout = () => {
  const [mobileOpen, setMobileOpen] = useState(false);

  // Close mobile drawer on Escape key or when resizing to desktop
  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setMobileOpen(false);
      }
    };

    const handleResize = () => {
      if (window.innerWidth >= 1024) {
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
    <div className="flex min-h-screen bg-[#F4F7FC] text-slate-900 w-full">
      {/* Desktop Sidebar (Fixed Left, visible ONLY on >= 1024px) */}
      <div className="hidden lg:flex flex-col shrink-0 sticky top-0 h-screen z-20 w-64 bg-[#0B1E48] border-r border-[#132c66]">
        <Sidebar />
      </div>

      {/* Mobile Off-Canvas Drawer Backdrop & Sidebar (< 1024px) */}
      {mobileOpen && (
        <div className="lg:hidden fixed inset-0 z-50 flex">
          {/* Backdrop Overlay */}
          <div
            className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
            onClick={() => setMobileOpen(false)}
            aria-label="Đóng menu"
          />

          {/* Slide-in Sidebar Drawer */}
          <div className="relative w-64 max-w-[85vw] bg-[#0B1E48] z-10 h-full shadow-2xl flex flex-col animate-in slide-in-from-left duration-200">
            <Sidebar onCloseMobile={() => setMobileOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area: 100% width on Mobile, flex-1 on Desktop */}
      <div className="flex-1 flex flex-col min-w-0 w-full min-h-screen">
        <Header onOpenMobile={() => setMobileOpen(true)} />
        <main className="flex-1 p-3 sm:p-6 lg:p-8 max-w-7xl w-full mx-auto">
          <Outlet />
        </main>
        <Footer />
      </div>
    </div>
  );
};

export default TbmLayout;
