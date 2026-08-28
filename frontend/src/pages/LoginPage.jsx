import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import { Lock, KeyRound, ArrowRight, ArrowLeft, RotateCw, ShieldCheck } from 'lucide-react';
import authApi from '../api/authApi';
import IUHLogo from '../components/common/IUHLogo';

import Footer from '../components/layout/Footer';

const LoginPage = () => {
  const [accountCode, setAccountCode] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaData, setCaptchaData] = useState(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user, login, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Load CAPTCHA immediately when opening LoginPage
  const loadCaptcha = async () => {
    setCaptchaLoading(true);
    try {
      const res = await authApi.getCaptcha();
      if (res.success && res.data) {
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
      // Single source of truth for redirection: handled by useEffect above
    } catch (err) {
      showToast(err.message || 'Mã tài khoản, mật khẩu hoặc mã CAPTCHA không chính xác', 'error');
      // Refresh CAPTCHA immediately on failure
      loadCaptcha();
      setLoading(false);
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
          <h2 className="mt-4 text-center text-2xl font-bold tracking-tight text-white group-hover:text-indigo-200 transition">
            Hệ Thống Quản Lý TTDN & KLTN
          </h2>
          <p className="mt-1 text-center text-xs text-indigo-300">
            Đăng nhập cổng quản trị và điều phối nghiệp vụ
          </p>
        </Link>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md z-10">
        <div className="bg-white/95 backdrop-blur-xl py-7 px-6 sm:px-9 shadow-2xl rounded-3xl border border-white/20">
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
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                />
              </div>
            </div>

            {/* Mandatory CAPTCHA Verification Area */}
            <div className="space-y-2 pt-1 border-t border-slate-100">
              <div className="flex items-center justify-between pt-1">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mã xác thực CAPTCHA
                </label>
                <span className="text-[10px] text-indigo-600 font-bold bg-indigo-50 px-1.5 py-0.5 rounded">
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
                  className="h-12 w-12 rounded-xl bg-slate-100 hover:bg-slate-200 active:scale-95 text-slate-600 hover:text-indigo-600 border border-slate-200 flex items-center justify-center transition cursor-pointer shrink-0 disabled:opacity-50"
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
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm font-bold tracking-widest text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition uppercase"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={loading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl text-sm font-semibold text-white bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] shadow-lg shadow-indigo-600/30 transition duration-200 disabled:opacity-50 cursor-pointer"
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
          </form>

          {/* Back to Home Link */}
          <div className="mt-5 text-center border-t border-slate-100 pt-3">
            <Link
              to="/"
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-indigo-600 transition"
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

