import React, { useState } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  GraduationCap,
  Briefcase,
  Users,
  Building2,
  BookOpen,
  Award,
  ArrowRight,
  CheckCircle2,
  ShieldCheck,
  Clock,
  FileText,
  LogOut,
  LayoutDashboard,
  Sparkles,
  Phone,
  Mail,
  MapPin,
  ChevronRight,
  ChevronDown,
  User,
  Settings,
  Menu,
  X,
} from 'lucide-react';

const HomePage = () => {
  const { user, isAuthenticated, loading, logout } = useAuth();
  const navigate = useNavigate();
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  // If Admin is logged in, immediately redirect to /admin/permissions
  if (!loading && isAuthenticated && user?.role === 'ADMIN') {
    return <Navigate to="/admin/permissions" replace />;
  }

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'Quản trị viên';
      case 'STUDENT':
        return 'Sinh viên';
      case 'LECTURER':
        return 'Giảng viên';
      case 'TBM':
        return 'Trưởng Bộ Môn';
      case 'COMPANY':
        return 'Doanh nghiệp';
      default:
        return 'Người dùng';
    }
  };

  const getDashboardUrl = () => {
    if (!user) return '/login';
    switch (user?.role) {
      case 'ADMIN':
        return '/admin/permissions';
      case 'TBM':
        return '/tbm/dashboard';
      case 'STUDENT':
        return '/student/dashboard';
      case 'LECTURER':
        return '/lecturer/dashboard';
      case 'COMPANY':
        return '/company/dashboard';
      default:
        return '/login';
    }
  };

  const getInternshipUrl = () => {
    if (!isAuthenticated || !user) return '/login';
    switch (user?.role) {
      case 'STUDENT':
        return '/student/internship';
      case 'LECTURER':
        return '/lecturer/reports';
      case 'TBM':
      case 'ADMIN':
        return '/tbm/internships';
      case 'COMPANY':
        return '/company/dashboard';
      default:
        return '/login';
    }
  };

  const getThesisUrl = () => {
    if (!isAuthenticated || !user) return '/login';
    switch (user?.role) {
      case 'STUDENT':
        return '/student/thesis';
      case 'LECTURER':
        return '/lecturer/theses';
      case 'TBM':
      case 'ADMIN':
        return '/tbm/theses';
      case 'COMPANY':
        return '/company/dashboard';
      default:
        return '/login';
    }
  };

  const getProfileUrl = () => {
    if (!user) return '/login';
    switch (user?.role) {
      case 'STUDENT':
        return '/student/profile';
      case 'LECTURER':
        return '/lecturer/profile';
      case 'TBM':
        return '/tbm/profile';
      case 'COMPANY':
        return '/company/profile';
      default:
        return '/profile';
    }
  };

  const handleLogout = async () => {
    await logout();
    navigate('/', { replace: true });
  };

  return (
    <div className="min-h-screen bg-slate-50 text-slate-900 flex flex-col selection:bg-indigo-500 selection:text-white">
      {/* Top Public Navbar */}
      <header className="sticky top-0 z-50 bg-white/90 backdrop-blur-md border-b border-slate-200/80 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-4">
          {/* Brand Logo */}
          <Link to="/" className="flex items-center gap-3 group cursor-pointer">
            <div className="p-1 bg-white rounded-xl border border-slate-100 flex items-center justify-center shadow-xs group-hover:scale-105 transition shrink-0">
              <img
                src="https://iuh.edu.vn/assets/images/iuh.png?v=51"
                alt="IUH Logo"
                className="h-8 w-auto object-contain"
              />
            </div>
            <div>
              <div className="text-sm font-bold text-slate-900 tracking-tight leading-tight group-hover:text-indigo-600 transition">
                Hệ Thống Quản Lý TTDN & KLTN
              </div>
              <div className="text-[11px] text-slate-500 font-medium">
                Khoa Công Nghệ Thông Tin
              </div>
            </div>
          </Link>

          {/* Desktop Nav Links */}
          <nav className="hidden md:flex items-center gap-6 text-xs font-semibold text-slate-600">
            <a href="#about" className="hover:text-indigo-600 transition">
              Giới thiệu
            </a>
            <Link
              to={getInternshipUrl()}
              className="hover:text-indigo-600 transition"
              title={isAuthenticated ? 'Vào phân hệ Thực tập doanh nghiệp' : 'Đăng nhập để vào Thực tập'}
            >
              Thực tập Doanh nghiệp
            </Link>
            <Link
              to={getThesisUrl()}
              className="hover:text-indigo-600 transition"
              title={isAuthenticated ? 'Vào phân hệ Khóa luận tốt nghiệp' : 'Đăng nhập để vào Khóa luận'}
            >
              Khóa luận Tốt nghiệp
            </Link>
            <a href="#roles" className="hover:text-indigo-600 transition">
              Phân hệ người dùng
            </a>
            <a href="#workflow" className="hover:text-indigo-600 transition">
              Quy trình chuẩn
            </a>
          </nav>

          {/* Right Action / Auth */}
          <div className="hidden md:flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-3">
                <Link
                  to={getDashboardUrl()}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white text-xs font-bold shadow-xs shadow-indigo-200 transition"
                >
                  <span>Vào hệ thống</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>

                <div className="relative">
                  <button
                    type="button"
                    onClick={() => setUserDropdownOpen(!userDropdownOpen)}
                    className="flex items-center gap-2.5 p-1.5 pl-2.5 rounded-xl border border-slate-200 hover:border-slate-300 hover:bg-slate-50 transition cursor-pointer"
                  >
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0">
                      {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div className="text-left hidden sm:block">
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {user?.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium leading-tight mt-0.5">
                        {getRoleLabel(user?.role)}
                      </div>
                    </div>
                    <ChevronDown className="w-3.5 h-3.5 text-slate-400 mr-1" />
                  </button>

                  {userDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-40"
                        onClick={() => setUserDropdownOpen(false)}
                      />
                      <div className="absolute right-0 mt-2 w-56 bg-white rounded-2xl shadow-xl border border-slate-100 py-2 z-50 animate-fade-in text-xs">
                        <div className="px-4 py-3 border-b border-slate-100">
                          <div className="font-bold text-slate-900 text-xs">
                            {user?.fullName}
                          </div>
                          <div className="text-[11px] text-indigo-600 font-semibold mt-0.5">
                            {getRoleLabel(user?.role)}
                          </div>
                        </div>

                        <div className="p-1.5 space-y-0.5">
                          <Link
                            to={getProfileUrl()}
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition"
                          >
                            <User className="w-4 h-4 text-slate-400" />
                            <span>Hồ sơ cá nhân</span>
                          </Link>

                          <Link
                            to={getProfileUrl()}
                            onClick={() => setUserDropdownOpen(false)}
                            className="w-full flex items-center gap-2.5 px-3 py-2 font-medium text-slate-700 hover:bg-slate-50 hover:text-indigo-600 rounded-xl transition"
                          >
                            <Settings className="w-4 h-4 text-slate-400" />
                            <span>Cài đặt tài khoản</span>
                          </Link>

                          <button
                            type="button"
                            onClick={() => {
                              setUserDropdownOpen(false);
                              handleLogout();
                            }}
                            className="w-full flex items-center gap-2.5 px-3 py-2 font-medium text-rose-600 hover:bg-rose-50 rounded-xl transition"
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
            ) : (
              <Link
                to="/login"
                className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold shadow-md shadow-indigo-200 transition"
              >
                <span>Đăng nhập hệ thống</span>
                <ArrowRight className="w-3.5 h-3.5" />
              </Link>
            )}
          </div>

          {/* Mobile Menu Button */}
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="md:hidden p-2 rounded-xl text-slate-600 hover:text-slate-900 hover:bg-slate-100 transition"
          >
            {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
          </button>
        </div>

        {/* Mobile Dropdown Menu */}
        {mobileMenuOpen && (
          <div className="md:hidden border-t border-slate-200 bg-white px-4 py-4 space-y-3 animate-in slide-in-from-top-2">
            <nav className="flex flex-col space-y-2 text-sm font-semibold text-slate-700">
              <a
                href="#about"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-indigo-600"
              >
                Giới thiệu
              </a>
              <Link
                to={getInternshipUrl()}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-indigo-600"
              >
                Thực tập Doanh nghiệp
              </Link>
              <Link
                to={getThesisUrl()}
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-indigo-600"
              >
                Khóa luận Tốt nghiệp
              </Link>
              <a
                href="#roles"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-indigo-600"
              >
                Phân hệ người dùng
              </a>
              <a
                href="#workflow"
                onClick={() => setMobileMenuOpen(false)}
                className="py-1 hover:text-indigo-600"
              >
                Quy trình chuẩn
              </a>
            </nav>

            <div className="pt-3 border-t border-slate-100">
              {isAuthenticated ? (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2.5 px-1 py-1">
                    <div className="w-8 h-8 rounded-lg bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-xs">
                      {user?.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-900 leading-tight">
                        {user?.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-medium">
                        {getRoleLabel(user?.role)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-col gap-1.5">
                    <Link
                      to={getDashboardUrl()}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-1.5 w-full text-center py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-xs shadow-indigo-200"
                    >
                      <span>Vào hệ thống</span>
                      <ArrowRight className="w-3.5 h-3.5" />
                    </Link>

                    <Link
                      to={getProfileUrl()}
                      onClick={() => setMobileMenuOpen(false)}
                      className="flex items-center justify-center gap-2 w-full text-center py-2 bg-slate-100 text-slate-700 rounded-xl text-xs font-semibold"
                    >
                      <User className="w-3.5 h-3.5" />
                      <span>Hồ sơ cá nhân</span>
                    </Link>

                    <button
                      type="button"
                      onClick={() => {
                        setMobileMenuOpen(false);
                        handleLogout();
                      }}
                      className="flex items-center justify-center gap-2 w-full text-center py-2 bg-rose-50 text-rose-600 rounded-xl text-xs font-semibold border border-rose-100"
                    >
                      <LogOut className="w-3.5 h-3.5" />
                      <span>Đăng xuất</span>
                    </button>
                  </div>
                </div>
              ) : (
                <Link
                  to="/login"
                  onClick={() => setMobileMenuOpen(false)}
                  className="flex items-center justify-center gap-1.5 w-full text-center py-2.5 bg-indigo-600 text-white rounded-xl text-xs font-bold shadow-md shadow-indigo-200"
                >
                  <span>Đăng nhập hệ thống</span>
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              )}
            </div>
          </div>
        )}
      </header>

      {/* Main Content */}
      <main className="flex-1">
        {/* 1. Hero Section */}
        <section className="relative overflow-hidden bg-gradient-to-b from-indigo-50/60 via-slate-50 to-slate-50 py-16 sm:py-24 border-b border-slate-200/60">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center relative z-10">
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-indigo-100/80 border border-indigo-200 text-indigo-700 text-xs font-bold mb-6">
              <Sparkles className="w-3.5 h-3.5 text-indigo-600" />
              <span>Nền Tảng Quản Trị Đào Tạo Toàn Diện 2026</span>
            </div>

            <h1 className="text-3xl sm:text-5xl lg:text-6xl font-black text-slate-900 tracking-tight max-w-4xl mx-auto leading-tight sm:leading-none">
              Quản Lý <span className="text-indigo-600">Thực Tập Doanh Nghiệp</span> &{' '}
              <span className="text-violet-600">Khóa Luận Tốt Nghiệp</span>
            </h1>

            <p className="mt-5 text-sm sm:text-lg text-slate-600 max-w-2xl mx-auto leading-relaxed">
              Giải pháp số hóa toàn diện quy trình đăng ký, xét duyệt, phân công hướng dẫn, theo dõi tiến độ, nộp báo cáo định kỳ và đánh giá hội đồng phản biện.
            </p>

            <div className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3.5">
              {isAuthenticated ? (
                <Link
                  to={getDashboardUrl()}
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 transition"
                >
                  <span>Vào hệ thống</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 transition"
                >
                  <span>Đăng Nhập Cổng Thông Tin</span>
                  <ArrowRight className="w-4 h-4" />
                </Link>
              )}

              <a
                href="#workflow"
                className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3.5 rounded-2xl bg-white hover:bg-slate-100 text-slate-700 font-bold text-sm border border-slate-200 shadow-2xs transition"
              >
                <span>Xem Quy Trình Nghiệp Vụ</span>
              </a>
            </div>

            {/* Quick Metrics */}
            <div className="mt-14 grid grid-cols-2 md:grid-cols-4 gap-4 max-w-4xl mx-auto">
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="text-2xl font-black text-indigo-600 font-mono">100%</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Số hóa quy trình</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="text-2xl font-black text-violet-600 font-mono">4 Phân Hệ</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">SV, GV, TBM, Doanh nghiệp</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="text-2xl font-black text-emerald-600 font-mono">2 Đơn Vị</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Biểu mẫu chuẩn hóa</div>
              </div>
              <div className="p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                <div className="text-2xl font-black text-amber-600 font-mono">Thời Gian Thực</div>
                <div className="text-xs text-slate-500 font-medium mt-0.5">Thông báo sự kiện tự động</div>
              </div>
            </div>
          </div>
        </section>

        {/* 2. Thực Tập Doanh Nghiệp (TTDN) Section */}
        <section id="internship" className="py-16 sm:py-20 bg-white border-b border-slate-200/80 scroll-mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              <div>
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-blue-50 border border-blue-200 text-[#0B4DB7] text-xs font-bold mb-4">
                  <Briefcase className="w-3.5 h-3.5" />
                  <span>Học Phần Thực Tập Doanh Nghiệp (TTDN)</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  Kết Nối Sinh Viên & Doanh Nghiệp Tiếp Nhận Trực Tuyến
                </h2>
                <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Hệ thống hỗ trợ toàn diện quy trình từ đăng ký nguyện vọng, duyệt danh sách tiếp nhận, nộp báo cáo tiến độ tuần/tháng, đến lập phiếu đánh giá 4 tiêu chuẩn từ doanh nghiệp.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#0B4DB7] flex items-center justify-center shrink-0 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Đăng Ký Thực Tập & Xét Duyệt Tự Động</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Kiểm tra điều kiện tiên quyết và xác nhận thông tin đơn vị tiếp nhận.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-slate-50 border border-slate-100">
                    <div className="w-8 h-8 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0 font-bold">
                      <FileText className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Báo Cáo Định Kỳ & Đánh Giá 4 Tiêu Chuẩn</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Doanh nghiệp chấm điểm trực tiếp qua liên kết bảo mật hoặc tài khoản chuyên dụng.</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                  <Link
                    to={getInternshipUrl()}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-[#0B4DB7] hover:bg-[#093e94] text-white font-bold text-xs shadow-md shadow-blue-200 transition cursor-pointer"
                  >
                    <span>{isAuthenticated ? 'Truy cập Phân hệ Thực tập' : 'Đăng nhập để vào Thực tập'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>

              {/* Visual Card */}
              <div className="p-8 rounded-3xl bg-gradient-to-tr from-blue-50 via-indigo-50/50 to-slate-50 border border-blue-100/80 shadow-sm relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center font-bold">
                        <Building2 className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Tiếp nhận & Ký kết Doanh nghiệp</div>
                        <div className="text-[10px] text-slate-500">Mạng lưới 100+ đối tác công nghệ</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Đang mở ĐK
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Phiếu Đánh Giá Chuẩn Doanh Nghiệp</div>
                        <div className="text-[10px] text-slate-500">Thái độ, chuyên môn, kỷ luật, kết quả</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-blue-700 bg-blue-50 px-2 py-0.5 rounded-md border border-blue-200">
                      Trực Tuyến
                    </span>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 3. Khóa Luận Tốt Nghiệp (KLTN) Section */}
        <section id="thesis" className="py-16 sm:py-20 bg-slate-50 border-b border-slate-200/80 scroll-mt-16">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center">
              {/* Visual Card */}
              <div className="order-2 lg:order-1 p-8 rounded-3xl bg-gradient-to-tr from-violet-50 via-indigo-50/50 to-slate-50 border border-violet-100/80 shadow-sm relative overflow-hidden">
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-violet-50 text-violet-700 flex items-center justify-center font-bold">
                        <BookOpen className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Đăng Ký Đề Tài 1 hoặc 2 Sinh Viên</div>
                        <div className="text-[10px] text-slate-500">Tự động ghép nhóm & tra cứu MSSV</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-violet-700 bg-violet-50 px-2 py-0.5 rounded-md border border-violet-200">
                      KLTN 2026
                    </span>
                  </div>

                  <div className="flex items-center justify-between p-4 rounded-2xl bg-white border border-slate-200/80 shadow-2xs">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center font-bold">
                        <Award className="w-5 h-5" />
                      </div>
                      <div>
                        <div className="text-xs font-bold text-slate-900">Hội Đồng Phản Biện Độc Lập</div>
                        <div className="text-[10px] text-slate-500">GVHD 40% • PB Kín 30% • PB Hội đồng 30%</div>
                      </div>
                    </div>
                    <span className="text-[10px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md border border-amber-200">
                      Chuẩn 3 Cột
                    </span>
                  </div>
                </div>
              </div>

              {/* Content */}
              <div className="order-1 lg:order-2">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-50 border border-violet-200 text-violet-700 text-xs font-bold mb-4">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>Khóa Luận Tốt Nghiệp (KLTN)</span>
                </div>
                <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight leading-tight">
                  Quy Trình Nghiên Cứu & Đánh Giá Hội Đồng Minh Bạch
                </h2>
                <p className="mt-4 text-xs sm:text-sm text-slate-600 leading-relaxed">
                  Quản lý đề tài từ bước đăng ký, duyệt đề tài, phân công GVHD hướng dẫn chính, chỉ định hội đồng phản biện đến theo dõi báo cáo tiến độ và chấm điểm tổng kết.
                </p>

                <div className="mt-6 space-y-3">
                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-violet-100 text-violet-700 flex items-center justify-center shrink-0 font-bold">
                      <CheckCircle2 className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Đăng Ký Đề Tài & Phê Duyệt Nhanh Chóng</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Sinh viên gửi đề xuất, GVHD và TBM duyệt trực tuyến theo thời gian thực.</div>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-3.5 rounded-2xl bg-white border border-slate-100 shadow-2xs">
                    <div className="w-8 h-8 rounded-xl bg-amber-100 text-amber-700 flex items-center justify-center shrink-0 font-bold">
                      <Award className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="font-bold text-xs text-slate-900">Phân Quyền Chấm Điểm 3 Thành Phần</div>
                      <div className="text-[11px] text-slate-500 mt-0.5">Độc lập điểm số giữa GVHD, Giảng viên phản biện kín và Giảng viên phản biện hội đồng.</div>
                    </div>
                  </div>
                </div>

                <div className="mt-8 flex flex-col sm:flex-row items-center gap-3">
                  <Link
                    to={getThesisUrl()}
                    className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-6 py-3 rounded-xl bg-violet-600 hover:bg-violet-700 text-white font-bold text-xs shadow-md shadow-violet-200 transition cursor-pointer"
                  >
                    <span>{isAuthenticated ? 'Truy cập Phân hệ Khóa luận' : 'Đăng nhập để vào Khóa luận'}</span>
                    <ArrowRight className="w-4 h-4" />
                  </Link>
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* 4. 4 Role Portals Section */}
        <section id="roles" className="py-16 sm:py-20 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center max-w-2xl mx-auto mb-12">
            <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
              Phân Hệ Người Dùng
            </span>
            <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
              Hệ Thống Được Thiết Kế Chuyên Biệt Cho Từng Vai Trò
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 mt-2">
              Mỗi vai trò sở hữu giao diện, quyền hạn và luồng xử lý riêng biệt theo đúng chuẩn quy chế đào tạo.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            {/* Sinh Viên */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-indigo-300 transition flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-indigo-50 text-indigo-600 flex items-center justify-center font-bold mb-4">
                  <GraduationCap className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Sinh Viên (Student)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Đăng ký thực tập doanh nghiệp, đăng ký KLTN 1 hoặc 2 thành viên, nộp báo cáo tiến độ tuần/tháng và nhận kết quả đánh giá.
                </p>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1.5 pt-3 border-t border-slate-100">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Tự động kiểm tra điều kiện GPA & tín chỉ</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Tra cứu sinh viên thứ 2 theo MSSV</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Nhận thông báo phê duyệt thời gian thực</span>
                </li>
              </ul>
            </div>

            {/* Trưởng Bộ Môn */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-violet-300 transition flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-violet-50 text-violet-600 flex items-center justify-center font-bold mb-4">
                  <ShieldCheck className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Trưởng Bộ Môn (TBM)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Quản lý danh mục tổng thể, phê duyệt đề tài KLTN và thực tập, phân công GVHD, chỉ định 2 giảng viên phản biện và nghiệm thu.
                </p>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1.5 pt-3 border-t border-slate-100">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Phân công đủ 2 phản biện (PB1 & PB2)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Xem bảng điểm 3 thành phần & Final Score</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Xuất giấy xác nhận hướng dẫn thực tập</span>
                </li>
              </ul>
            </div>

            {/* Giảng Viên */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-blue-300 transition flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-blue-50 text-blue-600 flex items-center justify-center font-bold mb-4">
                  <BookOpen className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Giảng Viên (Lecturer)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Theo dõi danh sách sinh viên đang hướng dẫn, duyệt báo cáo thực tập định kỳ, đánh giá tiến độ KLTN và chấm điểm phản biện.
                </p>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1.5 pt-3 border-t border-slate-100">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>3 Tab phân quyền: GVHD, PB1, PB2</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Chấm điểm thang 0-10 & nhận xét</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Bảo mật RBAC chặn xem trái quyền</span>
                </li>
              </ul>
            </div>

            {/* Doanh Nghiệp */}
            <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs hover:shadow-md hover:border-amber-300 transition flex flex-col justify-between space-y-4">
              <div>
                <div className="w-12 h-12 rounded-2xl bg-amber-50 text-amber-600 flex items-center justify-center font-bold mb-4">
                  <Building2 className="w-6 h-6" />
                </div>
                <h3 className="font-bold text-base text-slate-900">Doanh Nghiệp (Company)</h3>
                <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                  Đơn vị tiếp nhận sinh viên thực tập, đánh giá năng lực làm việc, tinh thần kỷ luật, kết quả công việc và lập phiếu đánh giá.
                </p>
              </div>
              <ul className="text-[11px] text-slate-600 space-y-1.5 pt-3 border-t border-slate-100">
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Đánh giá 4 tiêu chí chuẩn (0-10)</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Tự động tính điểm tổng kết & xếp loại</span>
                </li>
                <li className="flex items-center gap-1.5">
                  <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0" />
                  <span>Xuất phiếu đánh giá chuẩn doanh nghiệp</span>
                </li>
              </ul>
            </div>
          </div>
        </section>

        {/* 3. Standard Workflow Timeline */}
        <section id="workflow" className="py-16 bg-white border-y border-slate-200/80">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="text-center max-w-2xl mx-auto mb-14">
              <span className="text-xs font-bold text-indigo-600 uppercase tracking-wider">
                Quy Trình Nghiệp Vụ
              </span>
              <h2 className="text-2xl sm:text-3xl font-bold text-slate-900 mt-1">
                5 Giai Đoạn Vận Hành Chuẩn Hóa
              </h2>
              <p className="text-xs sm:text-sm text-slate-500 mt-2">
                Hệ thống đảm bảo tính liên tục, minh bạch và tự động hóa qua từng cột mốc đào tạo.
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              {/* Step 1 */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 relative">
                <div className="w-8 h-8 rounded-xl bg-indigo-600 text-white flex items-center justify-center font-bold text-xs mb-3 font-mono">
                  01
                </div>
                <h4 className="font-bold text-sm text-slate-900">Đăng Ký</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sinh viên nộp hồ sơ thực tập hoặc đề tài khóa luận (1 hoặc 2 SV) theo nguyện vọng.
                </p>
              </div>

              {/* Step 2 */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 relative">
                <div className="w-8 h-8 rounded-xl bg-violet-600 text-white flex items-center justify-center font-bold text-xs mb-3 font-mono">
                  02
                </div>
                <h4 className="font-bold text-sm text-slate-900">Xét Duyệt & Phân Công</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  TBM phê duyệt hồ sơ, phân công GVHD và chỉ định đủ 2 giảng viên phản biện.
                </p>
              </div>

              {/* Step 3 */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 relative">
                <div className="w-8 h-8 rounded-xl bg-blue-600 text-white flex items-center justify-center font-bold text-xs mb-3 font-mono">
                  03
                </div>
                <h4 className="font-bold text-sm text-slate-900">Báo Cáo Tiến Độ</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Sinh viên nộp báo cáo định kỳ theo tuần/tháng. GVHD chấm điểm và phản hồi nhận xét.
                </p>
              </div>

              {/* Step 4 */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 relative">
                <div className="w-8 h-8 rounded-xl bg-amber-600 text-white flex items-center justify-center font-bold text-xs mb-3 font-mono">
                  04
                </div>
                <h4 className="font-bold text-sm text-slate-900">Đánh Giá Hội Đồng</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Doanh nghiệp và 3 thành viên hội đồng (GVHD 40%, PB1 30%, PB2 30%) thực hiện chấm điểm.
                </p>
              </div>

              {/* Step 5 */}
              <div className="p-5 rounded-3xl bg-slate-50 border border-slate-200/80 relative">
                <div className="w-8 h-8 rounded-xl bg-emerald-600 text-white flex items-center justify-center font-bold text-xs mb-3 font-mono">
                  05
                </div>
                <h4 className="font-bold text-sm text-slate-900">Nghiệm Thu & Hoàn Tất</h4>
                <p className="text-[11px] text-slate-500 mt-1">
                  Tự động tính Final Score, TBM nghiệm thu đề tài hoàn tất (`COMPLETED`) và lưu trữ hồ sơ.
                </p>
              </div>
            </div>
          </div>
        </section>

        {/* 4. Contact & Information Section */}
        <section id="about" className="py-16 max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="p-8 sm:p-12 rounded-3xl bg-gradient-to-r from-slate-900 via-indigo-950 to-slate-900 text-white shadow-xl flex flex-col lg:flex-row items-center justify-between gap-8">
            <div className="max-w-2xl space-y-3">
              <span className="text-xs font-bold text-indigo-400 uppercase tracking-wider">
                Khoa Công Nghệ Thông Tin
              </span>
              <h3 className="text-2xl sm:text-3xl font-bold">
                Cần Hỗ Trợ Kỹ Thuật Hoặc Giải Đáp Quy Chế?
              </h3>
              <p className="text-xs sm:text-sm text-slate-300 leading-relaxed">
                Vui lòng liên hệ Văn phòng Bộ Môn để được hướng dẫn về điều kiện tín chỉ, chọn đề tài khóa luận hoặc đăng ký doanh nghiệp thực tập.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-3 shrink-0">
              {isAuthenticated ? (
                <Link
                  to={getDashboardUrl()}
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition text-center"
                >
                  Vào Bảng Điều Khiển Hệ Thống
                </Link>
              ) : (
                <Link
                  to="/login"
                  className="w-full sm:w-auto px-6 py-3.5 rounded-2xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold shadow-lg shadow-indigo-600/30 transition text-center"
                >
                  Đăng nhập Cổng Thông Tin
                </Link>
              )}
            </div>
          </div>
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-white border-t border-slate-200 py-10 text-xs text-slate-500">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2.5 font-medium">
            <img
              src="https://iuh.edu.vn/assets/images/iuh.png?v=51"
              alt="IUH Logo"
              className="h-5 w-auto object-contain"
            />
            <span>© 2026 Hệ Thống Quản Lý Thực Tập & Khóa Luận Tốt Nghiệp. Bản quyền thuộc Khoa CNTT - IUH.</span>
          </div>

          <div className="flex items-center gap-6 font-semibold text-slate-600">
            <Link to={getInternshipUrl()} className="hover:text-indigo-600">Thực tập DN</Link>
            <Link to={getThesisUrl()} className="hover:text-indigo-600">Khóa luận TN</Link>
            <a href="#workflow" className="hover:text-indigo-600">Quy trình</a>
            {isAuthenticated ? (
              <Link to={getDashboardUrl()} className="hover:text-indigo-600 font-bold text-indigo-600">Bảng điều khiển</Link>
            ) : (
              <Link to="/login" className="hover:text-indigo-600 font-bold text-indigo-600">Đăng nhập</Link>
            )}
          </div>
        </div>
      </footer>
    </div>
  );
};

export default HomePage;
