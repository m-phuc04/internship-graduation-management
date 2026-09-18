import React, { useState, useEffect } from 'react';
import { Link, useNavigate, Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import authApi from '../api/authApi';
import newsApi from '../api/newsApi';
import NewsDetailModal from '../components/news/NewsDetailModal';
import IUHLogo from '../components/common/IUHLogo';
import {
  KeyRound,
  Lock,
  RotateCw,
  ShieldCheck,
  User,
  Mail,
  GraduationCap,
  ArrowRight,
  LogOut,
  LayoutDashboard,
  Tag,
  Newspaper,
  Phone,
  Sparkles,
  ChevronRight,
  ExternalLink,
  BookOpen,
  CheckCircle2,
} from 'lucide-react';

const HomePage = () => {
  const { user, isAuthenticated, loading: authLoading, login, logout } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // News State
  const [newsList, setNewsList] = useState([]);
  const [newsLoading, setNewsLoading] = useState(false);
  const [selectedNews, setSelectedNews] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);

  // Form State
  const [activeFormMode, setActiveFormMode] = useState('LOGIN'); // 'LOGIN' | 'REGISTER'
  const [accountCode, setAccountCode] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaData, setCaptchaData] = useState(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [submitLoading, setSubmitLoading] = useState(false);

  // Student Register State
  const [regStudentCode, setRegStudentCode] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regClassName, setRegClassName] = useState('');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  // Load CAPTCHA
  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await authApi.getCaptcha();
      if (res?.success && res.data) {
        setCaptchaData(res.data);
        setCaptchaInput('');
      }
    } catch (err) {
      console.error('Failed to load captcha:', err);
    } finally {
      setCaptchaLoading(false);
    }
  };

  useEffect(() => {
    if (!isAuthenticated) {
      loadCaptcha();
    }
  }, [isAuthenticated]);

  // Load News (All public news)
  useEffect(() => {
    const fetchNews = async () => {
      setNewsLoading(true);
      try {
        const res = await newsApi.getPublicNews({ limit: 12 });
        if (res?.success && res.data) {
          setNewsList(res.data);
        }
      } catch (err) {
        console.error('Failed to load news:', err);
      } finally {
        setNewsLoading(false);
      }
    };
    fetchNews();
  }, []);

  if (!authLoading && isAuthenticated && user?.role === 'ADMIN') {
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
    if (!user) return '/';
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
        return '/';
    }
  };

  const handleLogin = async (e) => {
    if (e) e.preventDefault();

    if (!accountCode.trim() || !password) {
      showToast('Vui lòng nhập đầy đủ Mã tài khoản và Mật khẩu', 'error');
      return;
    }

    if (!captchaInput.trim()) {
      showToast('Vui lòng nhập mã CAPTCHA xác thực', 'error');
      return;
    }

    setSubmitLoading(true);
    try {
      const loggedUser = await login(
        accountCode.trim(),
        password,
        captchaData?.captchaId,
        captchaInput.trim()
      );
      showToast(`Đăng nhập thành công! Xin chào ${loggedUser.fullName}`, 'success');

      if (loggedUser.role === 'ADMIN') navigate('/admin/permissions');
      else if (loggedUser.role === 'TBM' || loggedUser.role === 'LECTURER') navigate('/lecturer/dashboard');
      else if (loggedUser.role === 'STUDENT') navigate('/student/dashboard');
      else if (loggedUser.role === 'COMPANY') navigate('/company/dashboard');
    } catch (err) {
      showToast(err.message || 'Mã tài khoản, mật khẩu hoặc mã CAPTCHA không chính xác', 'error');
      loadCaptcha();
    } finally {
      setSubmitLoading(false);
    }
  };

  const handleRegister = async (e) => {
    if (e) e.preventDefault();

    const mssv = regStudentCode.trim();
    const fullName = regFullName.trim();
    const email = regEmail.trim();
    const className = regClassName.trim();
    const pass = regPassword.trim();
    const confirmPass = regConfirmPassword.trim();

    if (!mssv || !/^\d{8}$/.test(mssv)) {
      showToast('Vui lòng nhập Mã số sinh viên (MSSV gồm đúng 8 chữ số)', 'error');
      return;
    }
    if (!fullName) {
      showToast('Vui lòng nhập Họ và tên sinh viên', 'error');
      return;
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      showToast('Vui lòng nhập địa chỉ Email hợp lệ', 'error');
      return;
    }
    if (!className) {
      showToast('Vui lòng nhập Lớp danh nghĩa', 'error');
      return;
    }
    if (!pass || pass.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự', 'error');
      return;
    }
    if (pass !== confirmPass) {
      showToast('Xác nhận mật khẩu không khớp', 'error');
      return;
    }

    setRegLoading(true);
    try {
      const res = await authApi.register({
        studentCode: mssv,
        fullName,
        email,
        className,
        password: pass,
        confirmPassword: confirmPass,
      });

      if (res?.success) {
        showToast('Đăng ký tài khoản Sinh viên thành công! Vui lòng nhập mã CAPTCHA để đăng nhập.', 'success');
        setAccountCode(mssv);
        setPassword(pass);
        setActiveFormMode('LOGIN');
        loadCaptcha();
      }
    } catch (err) {
      showToast(err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại.', 'error');
    } finally {
      setRegLoading(false);
    }
  };

  const handleLogout = async () => {
    await logout();
    loadCaptcha();
  };

  // Helper for Date badge
  const getDateBadgeInfo = (dateString) => {
    if (!dateString) return { month: '09', day: '16' };
    const d = new Date(dateString);
    if (isNaN(d.getTime())) return { month: '09', day: '16' };
    const monthNumber = d.getMonth() + 1;
    const monthStr = monthNumber < 10 ? `0${monthNumber}` : `${monthNumber}`;
    const dayNumber = d.getDate();
    const dayStr = dayNumber < 10 ? `0${dayNumber}` : `${dayNumber}`;
    return { month: monthStr, day: dayStr };
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'THONG_BAO':
        return { label: 'Thông báo', bg: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'SU_KIEN':
        return { label: 'Sự kiện', bg: 'bg-amber-50 text-amber-700 border-amber-200' };
      case 'TIN_TUC':
      default:
        return { label: 'Tin tức', bg: 'bg-blue-50 text-blue-700 border-blue-200' };
    }
  };

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 flex flex-col font-sans selection:bg-blue-600 selection:text-white">
      {/* 1. Header Bar (Clean, full width, with Hotline & User status) */}
      <header className="bg-white border-b border-slate-200/90 sticky top-0 z-40 shadow-2xs">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          {/* Logo & School Name */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="flex items-center justify-center shrink-0">
              <IUHLogo className="h-10 sm:h-11 w-auto object-contain" />
            </div>
            <div className="border-l border-slate-200 pl-3">
              <div className="text-xs sm:text-sm font-black text-blue-900 tracking-tight leading-tight group-hover:text-blue-600 transition">
                CỔNG THÔNG TIN TTDN & KLTN
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-blue-700 uppercase tracking-wide mt-0.5">
                KHOA CÔNG NGHỆ THÔNG TIN • ĐH CÔNG NGHIỆP TP.HCM
              </div>
            </div>
          </Link>

          {/* Right Header: Authenticated User status */}
          <div className="flex items-center gap-3">
            {isAuthenticated && (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to={getDashboardUrl()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-blue-600 hover:bg-blue-700 text-white text-xs font-bold shadow-xs transition"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Vào Bảng Điều Khiển</span>
                  <span className="sm:hidden">Hệ Thống</span>
                </Link>

                <div className="flex items-center gap-2 p-1 pl-2.5 bg-slate-100 rounded-xl border border-slate-200 text-xs">
                  <div className="text-right hidden sm:block">
                    <span className="font-bold text-slate-800 text-xs block leading-tight">{user?.fullName}</span>
                    <span className="text-[10px] text-blue-600 font-semibold">{getRoleLabel(user?.role)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={handleLogout}
                    title="Đăng xuất"
                    className="p-1.5 hover:bg-rose-50 rounded-lg text-rose-600 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </header>

      {/* 2. Main Portal Container (Fluid, Full-Width with Balanced Spacing) */}
      <main className="flex-1 w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 py-5 sm:py-7">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 lg:gap-8 items-start">
          
          {/* ================= LEFT COLUMN: BẢN TIN ĐÀO TẠO & SỰ KIỆN (Col 8/12) ================= */}
          <div className="lg:col-span-8 bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-xs overflow-hidden flex flex-col">
            
            {/* Header Title (Clean without navigation pills) */}
            <div className="px-5 sm:px-6 py-4 border-b border-slate-100 bg-gradient-to-r from-blue-50/60 via-white to-white flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-xl bg-blue-100/80 text-blue-700 flex items-center justify-center shrink-0 shadow-2xs">
                  <Newspaper className="w-5 h-5" />
                </div>
                <div>
                  <h1 className="text-sm sm:text-base font-extrabold text-slate-900 uppercase tracking-tight">
                    BẢN TIN ĐÀO TẠO & SỰ KIỆN
                  </h1>
                  <p className="text-[11px] text-slate-500">Thông báo kế hoạch thực tập, tiến độ và lịch bảo vệ KLTN</p>
                </div>
              </div>

              <div className="hidden sm:flex items-center gap-1.5 text-xs text-blue-700 font-semibold bg-blue-50 px-3 py-1 rounded-full border border-blue-100">
                <ShieldCheck className="w-3.5 h-3.5" />
                <span>Khoa Công nghệ Thông tin</span>
              </div>
            </div>

            {/* News List Body */}
            <div className="p-4 sm:p-6 divide-y divide-slate-100 min-h-[420px]">
              {newsLoading ? (
                <div className="space-y-5 py-4">
                  {[1, 2, 3, 4].map((i) => (
                    <div key={i} className="flex gap-4 animate-pulse">
                      <div className="w-14 h-16 bg-slate-200 rounded-2xl shrink-0" />
                      <div className="flex-1 space-y-2">
                        <div className="h-4 bg-slate-200 rounded-md w-3/4" />
                        <div className="h-3 bg-slate-100 rounded-md w-full" />
                        <div className="h-3 bg-slate-100 rounded-md w-1/3" />
                      </div>
                    </div>
                  ))}
                </div>
              ) : newsList.length === 0 ? (
                <div className="text-center py-20 text-slate-400 space-y-2">
                  <Newspaper className="w-10 h-10 mx-auto text-slate-300" />
                  <p className="text-sm font-bold text-slate-600">Hiện chưa có thông báo nào</p>
                  <p className="text-xs text-slate-400">Các thông báo mới từ Khoa sẽ được cập nhật trực tiếp tại đây.</p>
                </div>
              ) : (
                newsList.map((item, idx) => {
                  const dateInfo = getDateBadgeInfo(item.publishedAt || item.createdAt);
                  const badge = getCategoryBadge(item.category);
                  const isFirst = idx === 0;

                  return (
                    <div
                      key={item._id}
                      className="py-4.5 first:pt-1 last:pb-1 flex items-start gap-3.5 sm:gap-5 group hover:bg-blue-50/20 -mx-2 px-2 rounded-2xl transition duration-150"
                    >
                      {/* Responsive Date Badge */}
                      <div className="flex flex-col items-center justify-center w-13 sm:w-15 rounded-xl sm:rounded-2xl overflow-hidden border border-blue-100 shadow-2xs shrink-0 bg-white select-none">
                        <div className="w-full bg-[#0054a6] text-white text-[9px] sm:text-[10px] font-bold py-1 text-center uppercase tracking-wider">
                          THG {dateInfo.month}
                        </div>
                        <div className="w-full py-1 text-center text-lg sm:text-2xl font-black text-slate-800 group-hover:text-blue-600 transition">
                          {dateInfo.day}
                        </div>
                      </div>

                      {/* News Content */}
                      <div className="flex-1 space-y-1.5 min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-[10.5px] font-bold border ${badge.bg}`}>
                            <Tag className="w-2.5 h-2.5" />
                            <span>{badge.label}</span>
                          </span>

                          {isFirst && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-extrabold bg-rose-500 text-white shadow-2xs animate-pulse">
                              MỚI NHẤT
                            </span>
                          )}

                          <span className="text-[11px] text-slate-400 font-medium ml-auto hidden sm:inline-block">
                            {item.authorName || item.authorId?.fullName || 'Quản trị viên Hệ thống'}
                          </span>
                        </div>

                        <h2
                          onClick={() => {
                            setSelectedNews(item);
                            setDetailModalOpen(true);
                          }}
                          className="text-sm sm:text-[15px] font-bold text-slate-900 group-hover:text-blue-600 transition cursor-pointer line-clamp-2 leading-snug"
                        >
                          {item.title}
                        </h2>

                        <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                          {item.summary || item.content}
                        </p>

                        <div className="pt-0.5">
                          <button
                            type="button"
                            onClick={() => {
                              setSelectedNews(item);
                              setDetailModalOpen(true);
                            }}
                            className="text-xs font-bold text-rose-600 hover:text-rose-700 hover:underline inline-flex items-center gap-1 cursor-pointer"
                          >
                            <span>Xem chi tiết</span>
                            <ArrowRight className="w-3 h-3" />
                          </button>
                        </div>
                      </div>
                    </div>
                  );
                })
              )}
            </div>

            {/* Bottom bar of news box */}
            <div className="bg-slate-50/80 px-5 sm:px-6 py-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
              <span className="flex items-center gap-1.5">
                <CheckCircle2 className="w-3.5 h-3.5 text-blue-600" />
                <span>Kênh thông báo đào tạo chính thức</span>
              </span>
              <span className="text-blue-700 font-semibold">Khoa CNTT - IUH</span>
            </div>
          </div>

          {/* ================= RIGHT COLUMN: ĐĂNG NHẬP / ĐĂNG KÝ (Col 4/12) ================= */}
          <div className="lg:col-span-4 space-y-4">
            
            {/* Login Card */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 shadow-sm p-5 sm:p-6 bg-gradient-to-b from-blue-50/30 via-white to-white relative overflow-hidden">
              
              {/* Card Header */}
              <div className="text-center pb-4 border-b border-slate-100">
                <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-blue-50 text-blue-700 text-xs font-bold mb-1.5">
                  <GraduationCap className="w-3.5 h-3.5" />
                  <span>CỔNG THÔNG TIN ĐÀO TẠO</span>
                </div>
                <h2 className="text-base font-black text-slate-900 uppercase tracking-tight">
                  {isAuthenticated ? 'THÔNG TIN TÀI KHOẢN' : 'ĐĂNG NHẬP HỆ THỐNG'}
                </h2>
                <p className="text-[11px] text-slate-500 mt-0.5">Dành cho Sinh viên, Giảng viên & Doanh nghiệp</p>
              </div>

              {/* AUTHENTICATED STATE */}
              {isAuthenticated ? (
                <div className="mt-5 space-y-4">
                  <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-100 flex items-center gap-3.5">
                    <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-blue-600 to-indigo-600 text-white flex items-center justify-center font-black text-lg shrink-0 shadow-xs">
                      {user?.fullName?.charAt(0)?.toUpperCase() || 'U'}
                    </div>
                    <div className="min-w-0 flex-1">
                      <div className="text-[11px] text-slate-500 font-medium">Đang đăng nhập:</div>
                      <div className="text-sm font-bold text-slate-900 truncate">{user?.fullName}</div>
                      <div className="text-xs font-semibold text-blue-600 mt-0.5">{getRoleLabel(user?.role)}</div>
                    </div>
                  </div>

                  <Link
                    to={getDashboardUrl()}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white text-xs sm:text-sm font-bold uppercase shadow-md shadow-blue-200 transition cursor-pointer"
                  >
                    <LayoutDashboard className="w-4 h-4" />
                    <span>VÀO BẢNG ĐIỀU KHIỂN</span>
                  </Link>

                  <button
                    type="button"
                    onClick={handleLogout}
                    className="w-full flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-600 text-xs font-semibold border border-slate-200 transition cursor-pointer"
                  >
                    <LogOut className="w-3.5 h-3.5" />
                    <span>Đăng xuất tài khoản</span>
                  </button>
                </div>
              ) : activeFormMode === 'LOGIN' ? (
                /* ================= FORM ĐĂNG NHẬP TRỰC TIẾP ================= */
                <form onSubmit={handleLogin} className="mt-5 space-y-3.5">
                  {/* Account Code */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      MÃ TÀI KHOẢN / MSSV
                    </label>
                    <div className="relative">
                      <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type="text"
                        value={accountCode}
                        onChange={(e) => setAccountCode(e.target.value)}
                        placeholder="Nhập MSSV / Mã cán bộ"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                      />
                    </div>
                  </div>

                  {/* Password */}
                  <div>
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                      MẬT KHẨU
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="Nhập mật khẩu"
                        required
                        className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50/70 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100 transition"
                      />
                    </div>
                  </div>

                  {/* CAPTCHA Row */}
                  <div className="space-y-1.5 pt-1">
                    <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                      MÃ XÁC THỰC CAPTCHA
                    </label>
                    <div className="flex items-center gap-2">
                      <div className="w-28 shrink-0">
                        <input
                          type="text"
                          value={captchaInput}
                          onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                          placeholder="MÃ SỐ"
                          maxLength={6}
                          required
                          autoComplete="off"
                          className="w-full px-2.5 py-2 bg-slate-50/70 border border-slate-200 rounded-xl text-xs font-bold text-center uppercase tracking-widest text-slate-900 placeholder:text-slate-400 focus:outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-100"
                        />
                      </div>

                      <button
                        type="button"
                        onClick={loadCaptcha}
                        disabled={captchaLoading}
                        title="Làm mới mã"
                        className="p-2 rounded-xl border border-slate-200 hover:bg-slate-100 text-slate-600 transition cursor-pointer shrink-0 disabled:opacity-50"
                      >
                        <RotateCw className={`w-4 h-4 text-blue-600 ${captchaLoading ? 'animate-spin' : ''}`} />
                      </button>

                      <div className="flex-1 h-10 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-0.5 relative">
                        {captchaLoading ? (
                          <span className="text-[10px] text-slate-400 animate-pulse">Tạo mã...</span>
                        ) : captchaData?.image ? (
                          <img
                            src={captchaData.image}
                            alt="CAPTCHA"
                            className="w-full h-full object-contain select-none"
                            draggable="false"
                          />
                        ) : (
                          <span className="text-[10px] text-slate-400">Không có mã</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Submit Button */}
                  <div className="pt-2">
                    <button
                      type="submit"
                      disabled={submitLoading}
                      className="w-full py-3 px-4 rounded-xl text-xs sm:text-sm font-bold uppercase tracking-wide text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 active:scale-[0.99] shadow-md shadow-blue-200 transition duration-150 cursor-pointer disabled:opacity-60"
                    >
                      {submitLoading ? 'ĐANG ĐĂNG NHẬP...' : 'ĐĂNG NHẬP HỆ THỐNG'}
                    </button>
                  </div>

                  {/* Student Register Switch */}
                  <div className="pt-2 text-center border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveFormMode('REGISTER')}
                      className="text-xs text-blue-600 hover:text-blue-800 font-semibold transition cursor-pointer"
                    >
                      Chưa có tài khoản sinh viên? <span className="underline font-bold">Đăng ký ngay</span>
                    </button>
                  </div>
                </form>
              ) : (
                /* ================= FORM ĐĂNG KÝ TÀI KHOẢN SINH VIÊN ================= */
                <form onSubmit={handleRegister} className="mt-5 space-y-3">
                  <div className="p-2.5 bg-blue-50 rounded-xl border border-blue-100 text-[11px] text-blue-700 font-medium flex items-center gap-1.5">
                    <GraduationCap className="w-4 h-4 shrink-0" />
                    <span>Cổng đăng ký Sinh viên làm TTDN & KLTN</span>
                  </div>

                  <div>
                    <input
                      type="text"
                      value={regStudentCode}
                      onChange={(e) => setRegStudentCode(e.target.value.trim())}
                      placeholder="Mã số sinh viên"
                      maxLength={8}
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={regFullName}
                      onChange={(e) => setRegFullName(e.target.value)}
                      placeholder="Họ và tên sinh viên"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="Email"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <input
                      type="text"
                      value={regClassName}
                      onChange={(e) => setRegClassName(e.target.value)}
                      placeholder="Lớp danh nghĩa"
                      required
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      value={regPassword}
                      onChange={(e) => setRegPassword(e.target.value)}
                      placeholder="Mật khẩu"
                      required
                      minLength={6}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div>
                    <input
                      type="password"
                      value={regConfirmPassword}
                      onChange={(e) => setRegConfirmPassword(e.target.value)}
                      placeholder="Xác nhận lại mật khẩu"
                      required
                      minLength={6}
                      className="w-full px-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 placeholder:text-slate-400 focus:outline-none focus:border-blue-600"
                    />
                  </div>

                  <div className="pt-1">
                    <button
                      type="submit"
                      disabled={regLoading}
                      className="w-full py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wide text-white bg-blue-600 hover:bg-blue-700 active:scale-[0.99] shadow-md shadow-blue-200 transition duration-150 cursor-pointer disabled:opacity-60"
                    >
                      {regLoading ? 'ĐANG TẠO TÀI KHOẢN...' : 'HOÀN TẤT ĐĂNG KÝ'}
                    </button>
                  </div>

                  <div className="text-center pt-2 border-t border-slate-100">
                    <button
                      type="button"
                      onClick={() => setActiveFormMode('LOGIN')}
                      className="text-xs text-slate-600 hover:text-blue-600 font-semibold transition cursor-pointer"
                    >
                      Đã có tài khoản? <span className="underline font-bold text-blue-600">Đăng nhập ngay</span>
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Quick Links Widget */}
            <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/90 p-5 shadow-2xs space-y-3 text-xs">
              <div className="font-bold text-slate-800 flex items-center gap-1.5 pb-2 border-b border-slate-100">
                <Sparkles className="w-3.5 h-3.5 text-blue-600" />
                <span>Hướng dẫn & Tiện ích</span>
              </div>
              <ul className="space-y-2 text-slate-600">
                <li>
                  <a
                    href="https://fit.iuh.edu.vn"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-blue-600 flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition"
                  >
                    <span className="font-medium">• Trang thông tin Khoa Công nghệ Thông tin</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </li>
                <li>
                  <a
                    href="https://sv.iuh.edu.vn/sinh-vien-dang-nhap.html"
                    target="_blank"
                    rel="noreferrer"
                    className="hover:text-blue-600 flex items-center justify-between p-2 rounded-xl hover:bg-slate-50 transition"
                  >
                    <span className="font-medium">• Cổng thông tin Sinh viên IUH</span>
                    <ExternalLink className="w-3.5 h-3.5 text-slate-400" />
                  </a>
                </li>
              </ul>
            </div>
          </div>

        </div>
      </main>

      {/* 3. Modern Clean Footer */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-6 sm:py-8 text-xs text-slate-600">
        <div className="w-full max-w-[1600px] mx-auto px-4 sm:px-6 lg:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <IUHLogo className="h-8 w-auto object-contain" />
            <div>
              <div className="font-bold text-slate-900">TRƯỜNG ĐẠI HỌC CÔNG NGHIỆP TP. HỒ CHÍ MINH</div>
              <div className="text-slate-500">KHOA CÔNG NGHỆ THÔNG TIN - HỆ THỐNG QUẢN LÝ TTDN & KLTN</div>
            </div>
          </div>
          <div className="text-slate-500 text-center md:text-right">
            <div>Địa chỉ: Số 12 Nguyễn Văn Bảo, Phường 4, Quận Gò Vấp, TP. Hồ Chí Minh</div>
            <div className="mt-0.5">Bản quyền © 2026 IUH. Tất cả các quyền được bảo lưu.</div>
          </div>
        </div>
      </footer>

      {/* News Detail Modal */}
      <NewsDetailModal
        news={selectedNews}
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedNews(null);
        }}
      />
    </div>
  );
};

export default HomePage;
