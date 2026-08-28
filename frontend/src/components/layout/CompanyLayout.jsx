import React, { useState } from 'react';
import { Outlet, NavLink, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
  Building2,
  Award,
  LogOut,
  ChevronDown,
  Users,
  LayoutDashboard,
  User,
} from 'lucide-react';
import NotificationDropdown from '../common/NotificationDropdown';

const CompanyLayout = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const [dropdownOpen, setDropdownOpen] = useState(false);

  const handleLogout = async () => {
    await logout();
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col">
      {/* Top Navbar */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-30 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-16">
            <Link to="/" className="flex items-center gap-3 cursor-pointer group">
              <div className="p-1 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-xs group-hover:scale-105 transition shrink-0">
                <img
                  src="https://iuh.edu.vn/assets/images/iuh.png?v=51"
                  alt="IUH Logo"
                  className="h-8 w-auto object-contain"
                />
              </div>
              <div>
                <div className="text-sm font-bold text-slate-900 leading-tight group-hover:text-amber-700 transition">
                  Cổng Doanh Nghiệp
                </div>
                <div className="text-[11px] text-slate-500 font-medium">
                  Đánh giá & Tiếp nhận Thực tập Doanh nghiệp (TTDN)
                </div>
              </div>
            </Link>

            {/* Navigation Tabs */}
            <nav className="hidden md:flex items-center gap-1.5">
              <NavLink
                to="/company/dashboard"
                className={({ isActive }) =>
                  `inline-flex items-center gap-1.5 px-3 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <LayoutDashboard className="w-4 h-4" />
                <span>Tổng quan</span>
              </NavLink>

              <NavLink
                to="/company/evaluations"
                className={({ isActive }) =>
                  `inline-flex items-center gap-2 px-3.5 py-2 rounded-xl text-xs font-semibold transition ${
                    isActive
                      ? 'bg-amber-50 text-amber-800 border border-amber-200/80 shadow-2xs font-bold'
                      : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50'
                  }`
                }
              >
                <Award className="w-4 h-4" />
                <span>Đánh giá SV thực tập</span>
              </NavLink>
            </nav>

            {/* Right Controls */}
            <div className="flex items-center gap-3">
              <NotificationDropdown />

              {/* User Profile Dropdown */}
              <div className="relative">
                <button
                  onClick={() => setDropdownOpen(!dropdownOpen)}
                  className="flex items-center gap-2.5 p-1.5 pl-3 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition"
                >
                  <div className="text-right hidden sm:block">
                    <div className="text-xs font-semibold text-slate-900 leading-tight">
                      {user?.fullName || 'Doanh nghiệp'}
                    </div>
                    <div className="text-[10px] text-amber-700 font-bold uppercase tracking-wider">
                      Đối tác (COMPANY)
                    </div>
                  </div>
                  <div className="w-8 h-8 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center font-bold text-xs">
                    {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'C'}
                  </div>
                  <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
                </button>

                {dropdownOpen && (
                  <>
                    <div
                      className="fixed inset-0 z-40"
                      onClick={() => setDropdownOpen(false)}
                    />
                    <div className="absolute right-0 mt-2 w-60 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in">
                      <div className="px-4 py-3 border-b border-slate-100">
                        <div className="text-xs font-bold text-slate-900">
                          {user?.fullName}
                        </div>
                        <div className="text-[11px] text-slate-500 truncate mt-0.5">
                          {user?.email}
                        </div>
                      </div>

                      <div className="p-1.5 space-y-0.5">
                        <NavLink
                          to="/company/profile"
                          onClick={() => setDropdownOpen(false)}
                          className="w-full flex items-center gap-2.5 px-3.5 py-2 text-xs font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition"
                        >
                          <User className="w-4 h-4 text-slate-400" />
                          <span>Hồ sơ cá nhân</span>
                        </NavLink>

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2 px-3.5 py-2 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition"
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

      {/* Main Content View */}
      <main className="flex-1 max-w-7xl w-full mx-auto p-4 sm:p-6 lg:p-8">
        <Outlet />
      </main>
    </div>
  );
};

export default CompanyLayout;
