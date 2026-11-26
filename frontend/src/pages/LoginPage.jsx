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
} from 'lucide-react';
import authApi from '../api/authApi';
import IUHLogo from '../components/common/IUHLogo';

import Footer from '../components/layout/Footer';

const LoginPage = () => {
  // Trạng thái form đăng nhập
  const [accountCode, setAccountCode] = useState('');
  const [password, setPassword] = useState('');
  const [captchaInput, setCaptchaInput] = useState('');
  const [captchaData, setCaptchaData] = useState(null);
  const [captchaLoading, setCaptchaLoading] = useState(false);
  const [loading, setLoading] = useState(false);

  const { user, login, isAuthenticated } = useAuth();
  const { showToast } = useToast();
  const navigate = useNavigate();

  // Tải mã xác thực CAPTCHA immediately when opening LoginPage
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

  // Tự động chuyển hướng nếu người dùng đã đăng nhập từ trước
  useEffect(() => {
    if (isAuthenticated && user) {
      const role = user.role;
      let targetPath = '/login';
      switch (role) {
        case 'ADMIN':
          targetPath = '/admin/dashboard';
          break;
        case 'TBM':
          targetPath = '/tbm/dashboard';
          break;
        case 'LECTURER':
          targetPath = '/lecturer/dashboard';
          break;
        case 'STUDENT':
          targetPath = '/student/dashboard';
          break;
        default:
          targetPath = '/';
      }
      navigate(targetPath, { replace: true });
    }
  }, [isAuthenticated, user, navigate]);

  const handleLogin = async (e) => {
    if (e) e.preventDefault();

    if (!accountCode.trim()) {
      showToast('Vui lòng nhập Mã đăng nhập', 'error');
      loadCaptcha();
      return;
    }

    if (accountCode.trim().includes('@')) {
      showToast('Mã đăng nhập không hợp lệ', 'error');
      loadCaptcha();
      return;
    }

    if (!password) {
      showToast('Vui lòng nhập mật khẩu', 'error');
      loadCaptcha();
      return;
    }

    if (!captchaInput.trim()) {
      showToast('Vui lòng nhập mã bảo vệ (CAPTCHA)', 'error');
      loadCaptcha();
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
      showToast(err.message || 'Mã đăng nhập, mật khẩu hoặc mã CAPTCHA không chính xác', 'error');
      loadCaptcha();
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-[#0d2a75] to-slate-900 flex flex-col justify-center py-10 px-4 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Họa tiết trang trí nền */}
      <div className="absolute -top-40 -right-40 w-96 h-96 bg-blue-500/20 rounded-full blur-3xl pointer-events-none" />
      <div className="absolute -bottom-40 -left-40 w-96 h-96 bg-[#123891]/20 rounded-full blur-3xl pointer-events-none" />

      <div className="sm:mx-auto sm:w-full sm:max-w-md z-10">
        {/* Biểu tượng thương hiệu & Tiêu đề */}
        <Link to="/" className="flex flex-col items-center group cursor-pointer">
          <div className="p-3 bg-white rounded-2xl flex items-center justify-center shadow-xl shadow-slate-950/40 group-hover:scale-105 transition border border-white/20">
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
          {/* Tiêu đề Đăng nhập */}
          <div className="mb-6 text-center">
            <h3 className="text-lg font-bold text-slate-800">Đăng Nhập Hệ Thống</h3>
            <p className="text-xs text-slate-500 mt-1">Sử dụng tài khoản được cấp bởi Nhà trường</p>
          </div>

          {/* ================= FORM ĐĂNG NHẬP ================= */}
          <form onSubmit={handleLogin} className="space-y-4">
            {/* Mã đăng nhập */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mã đăng nhập
              </label>
              <div className="relative">
                <KeyRound className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={accountCode}
                  onChange={(e) => setAccountCode(e.target.value)}
                  placeholder="Nhập MSSV hoặc mã tài khoản"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#123891] transition"
                />
              </div>
            </div>

            {/* Mật khẩu */}
            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                  Mật khẩu
                </label>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-3 pointer-events-none" />
                <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Nhập mật khẩu"
                  required
                  className="w-full pl-10 pr-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#123891] transition"
                />
              </div>
            </div>

            {/* CAPTCHA Xác thực bảo mật */}
            <div>
              <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                Mã bảo vệ (CAPTCHA)
              </label>
              <div className="flex items-center gap-2">
                <div className="flex-1 relative">
                  <ShieldCheck className="w-4 h-4 text-slate-400 absolute left-3 top-3.5 pointer-events-none" />
                  <input
                    type="text"
                    value={captchaInput}
                    onChange={(e) => setCaptchaInput(e.target.value.toUpperCase())}
                    placeholder="MÃ XÁC THỰC"
                    maxLength={6}
                    required
                    autoComplete="off"
                    className="w-full h-11 pl-9 pr-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-bold uppercase tracking-widest text-slate-900 placeholder:text-slate-400 placeholder:font-normal placeholder:tracking-normal focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#123891] transition"
                  />
                </div>

                <button
                  type="button"
                  onClick={loadCaptcha}
                  disabled={captchaLoading}
                  title="Đổi mã khác"
                  className="w-11 h-11 rounded-xl border border-slate-200 bg-slate-50 hover:bg-slate-100 flex items-center justify-center text-slate-600 transition cursor-pointer shrink-0 disabled:opacity-50"
                >
                  <RotateCw className={`w-4 h-4 text-[#123891] ${captchaLoading ? 'animate-spin' : ''}`} />
                </button>

                <div
                  onClick={loadCaptcha}
                  title="Nhấp để đổi mã CAPTCHA khác"
                  className="w-[145px] h-11 shrink-0 bg-white rounded-xl border border-slate-200 overflow-hidden flex items-center justify-center cursor-pointer hover:opacity-90 shadow-2xs transition"
                >
                  {captchaLoading ? (
                    <span className="text-[11px] text-slate-400 animate-pulse">Tạo mã...</span>
                  ) : captchaData?.image ? (
                    <img
                      src={captchaData.image}
                      alt="CAPTCHA"
                      className="w-full h-full object-fill select-none"
                      draggable="false"
                    />
                  ) : (
                    <span className="text-[11px] text-slate-400">Không có mã</span>
                  )}
                </div>
              </div>
            </div>

            {/* Nút gửi biểu mẫu đăng nhập */}
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

            {/* Hướng dẫn khi chưa có tài khoản */}
            <div className="text-center pt-2">
              <p className="text-xs text-slate-500 font-medium">
                Nếu chưa có tài khoản, vui lòng liên hệ Quản trị viên để được cấp tài khoản.
              </p>
            </div>
          </form>

          {/* Liên kết quay về trang chủ */}
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
