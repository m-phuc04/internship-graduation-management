import React from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { ShieldAlert, ArrowLeft, LogOut } from 'lucide-react';
import Footer from '../components/layout/Footer';

const UnauthorizedPage = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-rose-50 border border-rose-200/60 flex items-center justify-center text-rose-600 mb-6 shadow-sm">
          <ShieldAlert className="w-10 h-10" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-rose-600 bg-rose-100/60 px-3 py-1 rounded-full mb-3">
          403 Forbidden • Không đủ quyền hạn
        </span>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Bạn không có quyền truy cập khu vực này
        </h1>

        <p className="text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
          Tài khoản hiện tại <strong>{user?.fullName}</strong> đang mang vai trò{' '}
          <span className="font-semibold text-indigo-600 font-mono">[{user?.role}]</span>.
          Phân hệ Quản lý Dữ liệu Nền tảng (Master Data) chỉ dành riêng cho <strong>Trưởng Bộ Môn (TBM)</strong>.
        </p>

        <div className="flex flex-col sm:flex-row items-center gap-3">
          <button
            onClick={() => {
              if (user?.role === 'ADMIN') navigate('/admin/permissions');
              else if (user?.role === 'TBM') navigate('/tbm/dashboard');
              else if (user?.role === 'LECTURER') navigate('/lecturer/dashboard');
              else if (user?.role === 'STUDENT') navigate('/student/dashboard');
              else if (user?.role === 'COMPANY') navigate('/company/dashboard');
              else navigate('/');
            }}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-indigo-200 transition cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            Về Bảng Điều Khiển
          </button>

          <button
            onClick={handleLogout}
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-slate-900 hover:bg-slate-800 text-white text-sm font-medium rounded-xl shadow-sm transition"
          >
            <LogOut className="w-4 h-4" />
            Đăng xuất & Đổi tài khoản
          </button>
        </div>
      </div>
      <Footer />
    </div>
  );
};

export default UnauthorizedPage;
