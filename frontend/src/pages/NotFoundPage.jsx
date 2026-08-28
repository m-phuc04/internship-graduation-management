import React from 'react';
import { Link } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { Compass, ArrowLeft } from 'lucide-react';
import Footer from '../components/layout/Footer';

const NotFoundPage = () => {
  const { user } = useAuth();
  const getHomeLink = () => {
    if (user?.role === 'ADMIN') return '/admin/permissions';
    if (user?.role === 'TBM') return '/tbm/dashboard';
    if (user?.role === 'LECTURER') return '/lecturer/dashboard';
    if (user?.role === 'STUDENT') return '/student/dashboard';
    if (user?.role === 'COMPANY') return '/company/dashboard';
    return '/';
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div className="flex-1 flex flex-col items-center justify-center p-6 text-center">
        <div className="w-20 h-20 rounded-3xl bg-indigo-50 border border-indigo-200/60 flex items-center justify-center text-indigo-600 mb-6 shadow-sm">
          <Compass className="w-10 h-10 animate-pulse" />
        </div>

        <span className="text-xs font-bold uppercase tracking-widest text-indigo-600 bg-indigo-100/60 px-3 py-1 rounded-full mb-3">
          404 Not Found
        </span>

        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900 mb-2">
          Trang không tồn tại
        </h1>

        <p className="text-sm text-slate-500 max-w-md mb-8 leading-relaxed">
          Đường dẫn bạn yêu cầu không khả dụng hoặc đã được di chuyển.
        </p>

        <Link
          to={getHomeLink()}
          className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-sm font-medium rounded-xl shadow-sm shadow-indigo-200 transition"
        >
          <ArrowLeft className="w-4 h-4" />
          Về Bảng Điều Khiển
        </Link>
      </div>
      <Footer />
    </div>
  );
};

export default NotFoundPage;
