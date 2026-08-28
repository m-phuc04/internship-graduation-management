import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { useLocation, useNavigate } from 'react-router-dom';
import { LogOut, User, ChevronDown, ArrowLeft, ExternalLink, BookOpen, Calendar, Menu } from 'lucide-react';
import NotificationDropdown from '../common/NotificationDropdown';
import ScheduleModal from '../common/ScheduleModal';
import AcademicTermSelector from '../common/AcademicTermSelector';

const Header = ({ onOpenMobile }) => {
  const { user, logout } = useAuth();
  const location = useLocation();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);
  const [scheduleModalOpen, setScheduleModalOpen] = useState(false);

  // Map path to title
  const getPageTitle = () => {
    if (location.pathname.includes('/academic-terms')) return 'Học kỳ & Năm học';
    if (location.pathname.includes('/admin/permissions')) return 'Phân quyền Giảng viên & Bộ môn';
    if (location.pathname.includes('/tbm/dashboard') || location.pathname.includes('/admin/dashboard')) return 'Bảng Tổng quan';
    if (location.pathname.includes('/admin/users')) return 'Quản lý Người dùng';
    if (location.pathname.includes('/tbm/students') || location.pathname.includes('/admin/students')) return 'Quản lý Sinh viên';
    if (location.pathname.includes('/tbm/lecturers') || location.pathname.includes('/admin/lecturers')) return 'Quản lý Giảng viên';
    if (location.pathname.includes('/tbm/companies') || location.pathname.includes('/admin/companies')) return 'Quản lý Doanh nghiệp';
    if (location.pathname.includes('/tbm/internships') || location.pathname.includes('/admin/internships')) return 'Quản lý Thực tập';
    if (location.pathname.includes('/tbm/evaluations') || location.pathname.includes('/admin/evaluations')) return 'Đánh giá Thực tập';
    if (location.pathname.includes('/tbm/theses') || location.pathname.includes('/admin/theses')) return 'Quản lý Khóa luận';
    if (location.pathname.includes('/tbm/thesis-evaluations') || location.pathname.includes('/admin/thesis-evaluations')) return 'Đánh giá Khóa luận';
    return 'Bảng điều khiển';
  };

  const handleLogout = async () => {
    await logout();
  };

  const isAdmin = user?.role === 'ADMIN';

  return (
    <header className="h-16 bg-white border-b border-slate-200/80 px-3 sm:px-6 lg:px-8 flex items-center justify-between sticky top-0 z-30 shadow-2xs gap-2 sm:gap-4 w-full">
      {/* Left: Hamburger & Title */}
      <div className="flex items-center gap-2 sm:gap-3 min-w-0">
        <button
          type="button"
          onClick={onOpenMobile}
          aria-label="Mở menu"
          className="lg:hidden p-2 -ml-1 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer shrink-0"
          title="Mở menu điều hướng"
        >
          <Menu className="w-5 h-5" />
        </button>

        <div className="min-w-0">
          <h1 className="text-sm sm:text-base lg:text-lg font-bold text-slate-900 leading-tight truncate">
            {getPageTitle()}
          </h1>
          <div className="text-[10px] sm:text-xs text-slate-400 font-medium mt-0.5 hidden md:block truncate">
            Hệ thống Quản lý Thực tập & Khóa luận Tốt nghiệp
          </div>
        </div>
      </div>

      {/* Right Controls */}
      <div className="flex items-center gap-2.5 sm:gap-3">
        {/* Global Academic Term Selector */}
        <AcademicTermSelector />

        {/* Quick Return to Lecturer Portal (Chỉ hiển thị cho TBM) */}
        {!isAdmin && (
          <button
            type="button"
            onClick={() => navigate('/lecturer/dashboard')}
            className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-bold text-slate-700 bg-white hover:bg-slate-50 border border-slate-200/90 transition shadow-2xs cursor-pointer group"
            title="Quay về Cổng Giảng Viên (Xem đề tài, hướng dẫn, chấm điểm)"
          >
            <span>Cổng Giảng Viên</span>
            <ExternalLink className="w-3.5 h-3.5 text-slate-400 group-hover:text-slate-700 transition" />
          </button>
        )}

        {/* Schedule Trigger Button */}
        <button
          type="button"
          onClick={() => setScheduleModalOpen(true)}
          className="p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition"
          title="Lịch trình & Kế hoạch đào tạo"
        >
          <Calendar className="w-4 h-4 sm:w-5 sm:h-5" />
        </button>

        <NotificationDropdown />

        {/* User Dropdown */}
        <div className="relative">
          <button
            onClick={() => setDropdownOpen(!dropdownOpen)}
            className="flex items-center gap-2.5 p-1 pl-2 sm:pl-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer"
          >
            <div className="text-right hidden sm:block">
              <div className="text-xs font-bold text-slate-900 leading-tight">
                {user?.fullName || (isAdmin ? 'Quản Trị Viên Hệ Thống' : 'Trưởng Bộ Môn')}
              </div>
              <div className="text-[9px] font-black uppercase tracking-wider text-[#0B4DB7]">
                {user?.role === 'ADMIN' ? 'QUẢN TRỊ VIÊN' : user?.role === 'TBM' ? 'TRƯỞNG BỘ MÔN' : 'GIẢNG VIÊN'}
              </div>
            </div>
            <div className="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs bg-[#0B1E48] text-white shadow-xs">
              {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'A'}
            </div>
            <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-0.5" />
          </button>

          {dropdownOpen && (
            <>
              <div
                className="fixed inset-0 z-40"
                onClick={() => setDropdownOpen(false)}
              />
              <div className="absolute right-0 mt-2 w-56 bg-white rounded-xl shadow-xl border border-slate-100 py-1.5 z-50 animate-fade-in">
                <div className="px-4 py-2.5 border-b border-slate-100">
                  <div className="text-xs font-semibold text-slate-900">
                    {user?.fullName}
                  </div>
                  <div className="text-[11px] text-slate-500 truncate">
                    {user?.email}
                  </div>
                </div>

                <div className="p-1 space-y-0.5">
                  {!isAdmin && (
                    <button
                      onClick={() => {
                        setDropdownOpen(false);
                        navigate('/lecturer/dashboard');
                      }}
                      className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-bold text-indigo-700 bg-indigo-50/70 hover:bg-indigo-100 rounded-lg transition"
                    >
                      <BookOpen className="w-4 h-4 text-indigo-600" />
                      <span>Cổng Giảng Viên</span>
                    </button>
                  )}

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      setScheduleModalOpen(true);
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition"
                  >
                    <Calendar className="w-4 h-4 text-slate-400" />
                    <span>Lịch & Kế hoạch</span>
                  </button>

                  <button
                    onClick={() => {
                      setDropdownOpen(false);
                      navigate('/tbm/profile');
                    }}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-lg transition"
                  >
                    <User className="w-4 h-4 text-slate-400" />
                    <span>Hồ sơ cá nhân</span>
                  </button>

                  <button
                    onClick={handleLogout}
                    className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition"
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

      {/* Schedule Modal */}
      <ScheduleModal
        isOpen={scheduleModalOpen}
        onClose={() => setScheduleModalOpen(false)}
      />
    </header>
  );
};

export default Header;
