import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import {
  Lock,
  KeyRound,
  ArrowRight,
  ArrowLeft,
  RotateCw,
  ShieldCheck,
  User,
  Mail,
  GraduationCap,
  UserPlus,
  LogIn,
} from 'lucide-react';
import authApi from '../api/authApi';
import IUHLogo from '../components/common/IUHLogo';

import Footer from '../components/layout/Footer';

const LoginPage = () => {
  // Mode: 'LOGIN' | 'REGISTER'
  const [activeTab, setActiveTab] = useState('LOGIN');

  // Login States
  const [accountCode, setAccountCode] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaData, setCaptchaData] = useState(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  // Register States (Student only)
  const [regStudentCode, setRegStudentCode] = useState('');
  const [regFullName, setRegFullName] = useState('');
  const [regEmail, setRegEmail] = useState('');
  const [regClassName, setRegClassName] = useState('DHKTPM18A');
  const [regPassword, setRegPassword] = useState('');
  const [regConfirmPassword, setRegConfirmPassword] = useState('');
  const [regLoading, setRegLoading] = useState(false);

  const { user, login, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Load CAPTCHA immediately when opening LoginPage
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
    loadCaptcha();
  }, []);

  // If already authenticated, redirect to appropriate role dashboard immediately
  useEffect(() => {
    if (isAuthenticated && user?.role) {
      if (user.role === 'ADMIN') {
        navigate('/admin/permissions', { replace: true });
      } else if (user.role === 'TBM' || user.role === 'LECTURER') {
        navigate('/lecturer/dashboard', { replace: true });
      } else if (user.role === 'STUDENT') {
        navigate('/student/dashboard', { replace: true });
      } else if (user.role === 'COMPANY') {
        navigate('/company/dashboard', { replace: true });
      } else {
        navigate('/unauthorized', { replace: true });
      }
    }
  }, [isAuthenticated, user?.role, navigate]);

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

    setLoading(true);
    try {
      const loggedUser = await login(
        accountCode.trim(),
        password,
        captchaData?.captchaId,
        captchaInput.trim()
      );
      showToast(`Đăng nhập thành công! Xin chào ${loggedUser.fullName}`, 'success');
    } catch (err) {
      showToast(err.message || 'Mã tài khoản, mật khẩu hoặc mã CAPTCHA không chính xác', 'error');
      loadCaptcha();
      setLoading(false);
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

    // Client-side Validation
    if (!mssv) {
      showToast('Vui lòng nhập Mã số sinh viên (MSSV)', 'error');
      return;
    }
    if (!/^\d{8}$/.test(mssv)) {
      showToast('Mã số sinh viên (MSSV) phải gồm đúng 8 chữ số', 'error');
      return;
    }
    if (!fullName) {
      showToast('Vui lòng nhập Họ và tên sinh viên', 'error');
      return;
    }
    if (!email) {
      showToast('Vui lòng nhập địa chỉ Email', 'error');
      return;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      showToast('Định dạng Email không hợp lệ', 'error');
      return;
    }
    if (!pass) {
      showToast('Vui lòng nhập Mật khẩu', 'error');
      return;
    }
    if (pass.length < 6) {
      showToast('Mật khẩu phải có ít nhất 6 ký tự', 'error');
      return;
    }
    if (pass !== confirmPass) {
      showToast('Xác nhận mật khẩu không khớp với mật khẩu', 'error');
      return;
    }

    setRegLoading(true);
    try {
      const res = await authApi.register({
        studentCode: mssv,
        fullName,
        email,
        className: className || 'DHKTPM18A',
        password: pass,
        confirmPassword: confirmPass,
      });

      if (res?.success) {
        showToast('Đăng ký tài khoản Sinh viên thành công! Vui lòng nhập mã CAPTCHA để đăng nhập.', 'success');
        // Pre-fill login credentials and switch to Login tab
        setAccountCode(mssv);
        setPassword(pass);
        setActiveTab('LOGIN');
        loadCaptcha();
      }
    } catch (err) {
      showToast(err.message || 'Đăng ký không thành công. Vui lòng kiểm tra lại thông tin.', 'error');
    } finally {
      setRegLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-indigo-950 to-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background Decorative Blobs */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-indigo-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-violet-500/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Brand Icon & Title */}
        <Link to="/" className="flex flex-col items-center group cursor-pointer">
          <div className="p-3 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-indigo-950/40 group-hover:scale-105 transition border border-white/20">
            <IUHLogo className="h-12 w-auto object-contain" />
          </div>
          <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white group-hover:text-amber-300 transition">
            Hệ Thống Quản Lý TTDN & KLTN
          </h2>
          <p className="mt-1 text-center text-xs text-[#ECA124] font-semibold uppercase tracking-wider">
            Khoa Công Nghệ Thông Tin
          </p>
        </Link>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-xl py-6 px-6 sm:px-9 shadow-2xl rounded-3xl border border-white/20">
          {/* Tab Switcher: Đăng nhập / Đăng ký */}
          <div className="flex p-1 mb-6 bg-slate-100 rounded-2xl">
            <button
              type="button"
              onClick={() => setActiveTab('LOGIN')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'LOGIN'
                  ? 'bg-white text-[#123891] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <LogIn className="w-3.5 h-3.5" />
              <span>Đăng nhập</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('REGISTER')}
              className={`flex-1 flex items-center justify-center gap-1.5 py-2 rounded-xl text-xs font-bold transition cursor-pointer ${
                activeTab === 'REGISTER'
                  ? 'bg-white text-[#123891] shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              <UserPlus className="w-3.5 h-3.5" />
              <span>Đăng ký tài khoản</span>
            </button>
          </div>

          {activeTab === 'LOGIN' ? (
            /* ================= FORM ĐĂNG NHẬP ================= */
            <form onSubmit={handleLogin} className="space-y-4">
              {/* Account Code */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mã tài khoản
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={accountCode}
                    onChange={(e) => setAccountCode(e.target.value)}
                    placeholder="MSSV / Mã giảng viên / Mã doanh nghiệp"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#123891] transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                  Mật khẩu
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Mật khẩu"
                    required
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#123891] transition"
                  />
                </div>
              </div>

              {/* Mandatory CAPTCHA Verification Area */}
              <div className="space-y-2 pt-1 border-t border-slate-100">
                <div className="flex items-center justify-between pt-1">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Mã xác thực CAPTCHA
                  </label>
                  <span className="text-[10px] text-[#ECA124] font-bold bg-blue-50 px-1.5 py-0.5 rounded">
                    Bắt buộc
                  </span>
                </div>

                {/* CAPTCHA Image & Refresh Button */}
                <div className="flex items-center gap-2">
                  <div className="flex-1 h-12 bg-slate-100 rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center p-1 relative shadow-2xs">
                    {captchaLoading ? (
                      <div className="flex items-center gap-2 text-xs font-semibold text-slate-400 animate-pulse">
                        <span className="w-4 h-4 border-2 border-slate-300 border-t-indigo-600 rounded-full animate-spin" />
                        <span>Đang tạo mã...</span>
                      </div>
                    ) : captchaData?.image ? (
                      <img
                        src={captchaData.image}
                        alt="Mã CAPTCHA"
                        className="w-full h-full object-contain select-none"
                        draggable="false"
                      />
                    ) : (
                      <span className="text-xs text-slate-400 font-medium">Không thể tải mã</span>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={loadCaptcha}
                    disabled={captchaLoading}
                    aria-label="Làm mới mã CAPTCHA"
                    title="Làm mới mã CAPTCHA"
                    className="h-12 w-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 hover:text-[#ECA124] border border-slate-200 flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50"
                  >
                    <RotateCw className={`w-5 h-5 ${captchaLoading ? 'animate-spin' : ''}`} />
                  </button>
                </div>

                {/* CAPTCHA Input Field */}
                <div className="relative">
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                    placeholder="Nhập 5 ký tự CAPTCHA bên trên"
                    maxLength={6}
                    required
                    autoComplete="off"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold tracking-widest text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#123891] transition uppercase"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#123891] hover:bg-[#1B4DA1] hover:text-[#ECA124] active:scale-[0.99] shadow-lg shadow-blue-900/10 transition duration-200 disabled:opacity-50 cursor-pointer"
                >
                  {loading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Đăng nhập hệ thống</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('REGISTER')}
                  className="text-xs text-[#ECA124] hover:text-[#0e2c73] font-semibold transition cursor-pointer"
                >
                  Chưa có tài khoản sinh viên? <span className="underline font-bold">Đăng ký ngay</span>
                </button>
              </div>
            </form>
          ) : (
            /* ================= FORM ĐĂNG KÝ SINH VIÊN ================= */
            <form onSubmit={handleRegister} className="space-y-3.5">
              <div className="p-3 bg-blue-50/80 rounded-2xl border border-blue-100 flex items-center gap-2 text-[#123891] text-xs font-medium">
                <GraduationCap className="w-4 h-4 shrink-0 text-[#ECA124]" />
                <span>Cổng đăng ký dành riêng cho Sinh viên thực tập & làm KLTN</span>
              </div>

              {/* MSSV */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mã số sinh viên (MSSV) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={regStudentCode}
                    onChange={(e) => setRegStudentCode(e.target.value.trim())}
                    placeholder="Nhập 8 chữ số MSSV (VD: 22635271)"
                    maxLength={8}
                    required
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#123891] transition"
                  />
                </div>
              </div>

              {/* Full Name */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Họ và tên <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="text"
                    value={regFullName}
                    onChange={(e) => setRegFullName(e.target.value)}
                    placeholder="Nhập họ và tên đầy đủ"
                    required
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#123891] transition"
                  />
                </div>
              </div>

              {/* Email & Class Name */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Email <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                    <input
                      type="email"
                      value={regEmail}
                      onChange={(e) => setRegEmail(e.target.value)}
                      placeholder="VD: 22635271@student.iuh.edu.vn"
                      required
                      className="w-full pl-10 pr-3 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#123891] transition"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Lớp danh nghĩa
                  </label>
                  <input
                    type="text"
                    value={regClassName}
                    onChange={(e) => setRegClassName(e.target.value)}
                    placeholder="VD: DHKTPM18A"
                    className="w-full px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#123891] transition"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="password"
                    value={regPassword}
                    onChange={(e) => setRegPassword(e.target.value)}
                    placeholder="Tối thiểu 6 ký tự"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#123891] transition"
                  />
                </div>
              </div>

              {/* Confirm Password */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Xác nhận mật khẩu <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                  <input
                    type="password"
                    value={regConfirmPassword}
                    onChange={(e) => setRegConfirmPassword(e.target.value)}
                    placeholder="Nhập lại mật khẩu"
                    required
                    minLength={6}
                    className="w-full pl-10 pr-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs sm:text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-[#123891] transition"
                  />
                </div>
              </div>

              {/* Submit Button */}
              <div className="pt-2">
                <button
                  type="submit"
                  disabled={regLoading}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-[#123891] hover:bg-[#1B4DA1] hover:text-[#ECA124] active:scale-[0.99] shadow-lg shadow-blue-900/10 transition duration-200 disabled:opacity-50 cursor-pointer"
                >
                  {regLoading ? (
                    <span className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      <span>Đăng ký tài khoản Sinh viên</span>
                      <ArrowRight className="w-4 h-4" />
                    </>
                  )}
                </button>
              </div>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setActiveTab('LOGIN')}
                  className="text-xs text-[#ECA124] hover:text-[#0e2c73] font-semibold transition cursor-pointer"
                >
                  Đã có tài khoản? <span className="underline font-bold">Đăng nhập ngay</span>
                </button>
              </div>
            </form>
          )}

          {/* Back to Home Link */}
          <div className="mt-5 text-center border-t border-slate-100 pt-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#ECA124] transition"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Quay lại Trang Chủ Công Khai</span>
            </Link>
          </div>
        </div>
      </div>

      <Footer dark className="mt-auto border-t-0 bg-transparent z-10" />
    </div>
  );
};

export default LoginPage;



