import React, { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import newsApi from '../api/newsApi';
import IUHLogo from '../components/common/IUHLogo';
import Footer from '../components/layout/Footer';
import getFileUrl from '../utils/fileUrlHelper';
import {
  ArrowLeft,
  Calendar,
  User,
  Eye,
  Tag,
  Share2,
  ExternalLink,
  AlertCircle,
  Newspaper,
  LayoutDashboard,
  LogOut,
  ChevronRight,
  ShieldCheck,
} from 'lucide-react';

const NewsDetailPage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAuthenticated, logout } = useAuth();

  const [news, setNews] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    let isMounted = true;
    const fetchNewsDetail = async () => {
      if (!id) {
        setError('Mã thông báo không hợp lệ.');
        setLoading(false);
        return;
      }

      setLoading(true);
      setError(null);
      try {
        const res = await newsApi.getNewsById(id);
        if (isMounted) {
          if (res && res.data) {
            setNews(res.data);
          } else {
            setError('Không tìm thấy thông tin bài viết hoặc thông báo.');
          }
        }
      } catch (err) {
        if (isMounted) {
          const errMsg =
            err.response?.data?.message ||
            err.message ||
            'Không tìm thấy thông báo hoặc thông báo này đã được gỡ bỏ.';
          setError(errMsg);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchNewsDetail();
    return () => {
      isMounted = false;
    };
  }, [id]);

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    if (isNaN(date.getTime())) return '';
    return date.toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const getCategoryBadge = (category) => {
    switch (category) {
      case 'THONG_BAO':
        return {
          label: 'Thông Báo',
          className: 'bg-rose-50 text-rose-700 border-rose-200',
        };
      case 'SU_KIEN':
        return {
          label: 'Sự Kiện',
          className: 'bg-amber-50 text-amber-700 border-amber-200',
        };
      case 'TIN_TUC':
      default:
        return {
          label: 'Tin Tức',
          className: 'bg-blue-50 text-[#123891] border-blue-200',
        };
    }
  };

  const handleCopyLink = () => {
    if (navigator.clipboard) {
      navigator.clipboard.writeText(window.location.href);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const getDashboardUrl = () => {
    if (!user) return '/login';
    switch (user.role) {
      case 'ADMIN':
        return '/admin/permissions';
      case 'TBM':
        return '/tbm/dashboard';
      case 'LECTURER':
        return '/lecturer/dashboard';
      case 'STUDENT':
        return '/student/dashboard';
      default:
        return '/';
    }
  };

  const getRoleLabel = (role) => {
    switch (role) {
      case 'ADMIN':
        return 'QUẢN TRỊ VIÊN';
      case 'TBM':
        return 'TRƯỞNG BỘ MÔN';
      case 'LECTURER':
        return 'GIẢNG VIÊN';
      case 'STUDENT':
        return 'SINH VIÊN';
      default:
        return 'NGƯỜI DÙNG';
    }
  };

  // Kiểm tra nếu có liên kết URL bên ngoài (external URL)
  const externalUrl =
    news?.externalUrl ||
    news?.sourceUrl ||
    (news?.link && (news.link.startsWith('http://') || news.link.startsWith('https://'))
      ? news.link
      : null);

  return (
    <div className="min-h-screen bg-[#f4f7fb] text-slate-800 flex flex-col font-sans selection:bg-[#123891] selection:text-white">
      {/* 1. Thanh đầu trang */}
      <header className="bg-white text-[#1B4DA1] border-b border-slate-200 sticky top-0 z-40 shadow-xs">
        <div className="w-full max-w-[1400px] mx-auto px-4 sm:px-6 lg:px-8 py-3 flex items-center justify-between gap-4">
          {/* Logo và tên hệ thống */}
          <Link to="/" className="flex items-center gap-3 group">
            <div className="p-1.5 sm:p-2 bg-white rounded-xl shadow-xs border border-slate-100 flex items-center justify-center shrink-0">
              <IUHLogo className="h-8 sm:h-9 w-auto object-contain" />
            </div>
            <div className="border-l border-slate-200 pl-3">
              <div className="text-xs sm:text-sm font-black text-[#1B4DA1] tracking-tight leading-tight group-hover:text-[#ECA124] transition">
                CỔNG THÔNG TIN TTDN & KLTN
              </div>
              <div className="text-[10px] sm:text-[11px] font-bold text-slate-500 uppercase tracking-wide mt-0.5">
                KHOA CÔNG NGHỆ THÔNG TIN • ĐH CÔNG NGHIỆP TP.HCM
              </div>
            </div>
          </Link>

          {/* Đầu trang bên phải: Người dùng / Đăng nhập */}
          <div className="flex items-center gap-3">
            {isAuthenticated ? (
              <div className="flex items-center gap-2 sm:gap-3">
                <Link
                  to={getDashboardUrl()}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-[#123891] hover:bg-[#1B4DA1] text-white hover:text-[#ECA124] text-xs font-black shadow-sm transition"
                >
                  <LayoutDashboard className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Vào Bảng Điều Khiển</span>
                  <span className="sm:hidden">Hệ Thống</span>
                </Link>

                <div className="flex items-center gap-2 p-1 pl-2.5 bg-slate-50 rounded-xl border border-slate-200 text-xs text-slate-700">
                  <div className="text-right hidden sm:block">
                    <span className="font-bold text-[#1B4DA1] text-xs block leading-tight">{user?.fullName}</span>
                    <span className="text-[10px] text-[#ECA124] font-bold">{getRoleLabel(user?.role)}</span>
                  </div>
                  <button
                    type="button"
                    onClick={logout}
                    title="Đăng xuất"
                    className="p-1.5 hover:bg-slate-200/60 rounded-lg text-rose-600 transition cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ) : (
              <Link
                to="/"
                className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#123891] hover:bg-[#1B4DA1] text-white text-xs font-bold transition shadow-xs"
              >
                <span>Đăng nhập hệ thống</span>
              </Link>
            )}
          </div>
        </div>
      </header>

      {/* 2. Nội dung chính */}
      <main className="flex-1 w-full max-w-[1200px] mx-auto px-4 sm:px-6 lg:px-8 py-6 sm:py-8">
        {/* Thanh Breadcrumb & Nút quay lại */}
        <div className="flex flex-wrap items-center justify-between gap-3 mb-6">
          <nav className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
            <Link to="/" className="hover:text-[#123891] hover:underline transition">
              Trang chủ
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <Link to="/" className="hover:text-[#123891] hover:underline transition">
              Bản tin & Thông báo
            </Link>
            <ChevronRight className="w-3.5 h-3.5 text-slate-400" />
            <span className="text-slate-800 font-semibold truncate max-w-[200px] sm:max-w-[400px]">
              {news ? news.title : 'Chi tiết thông báo'}
            </span>
          </nav>

          <button
            type="button"
            onClick={() => navigate('/')}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-3.5 h-3.5 text-slate-500" />
            <span>Quay lại trang chủ</span>
          </button>
        </div>

        {/* Khung nội dung chi tiết */}
        {loading ? (
          /* Trạng thái đang tải dữ liệu (Loading Skeleton) */
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-6 sm:p-10 space-y-6 animate-pulse">
            <div className="flex items-center gap-3">
              <div className="h-6 w-24 bg-slate-200 rounded-full" />
              <div className="h-5 w-32 bg-slate-100 rounded-md" />
              <div className="h-5 w-40 bg-slate-100 rounded-md ml-auto" />
            </div>
            <div className="h-8 bg-slate-200 rounded-xl w-4/5" />
            <div className="h-6 bg-slate-200 rounded-xl w-3/5" />
            <div className="h-20 bg-slate-50 rounded-2xl border border-slate-100 p-4" />
            <div className="space-y-3 pt-4">
              <div className="h-4 bg-slate-100 rounded-md w-full" />
              <div className="h-4 bg-slate-100 rounded-md w-full" />
              <div className="h-4 bg-slate-100 rounded-md w-5/6" />
              <div className="h-4 bg-slate-100 rounded-md w-3/4" />
            </div>
          </div>
        ) : error || !news ? (
          /* Trạng thái lỗi hoặc không tìm thấy bài viết (404 Not Found) */
          <div className="bg-white rounded-3xl border border-slate-200/90 shadow-sm p-8 sm:p-16 text-center max-w-2xl mx-auto my-8 space-y-4">
            <div className="w-16 h-16 rounded-2xl bg-rose-50 text-rose-500 flex items-center justify-center mx-auto border border-rose-100">
              <AlertCircle className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-black text-slate-900 tracking-tight">
              Không tìm thấy thông báo
            </h2>
            <p className="text-xs sm:text-sm text-slate-500 leading-relaxed max-w-md mx-auto">
              {error || 'Thông báo này không tồn tại hoặc đã bị gỡ khỏi hệ thống.'}
            </p>
            <div className="pt-3 flex flex-wrap items-center justify-center gap-3">
              <Link
                to="/"
                className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-[#123891] hover:bg-[#1B4DA1] text-white text-xs font-bold transition shadow-xs"
              >
                <ArrowLeft className="w-4 h-4" />
                <span>Về trang chủ</span>
              </Link>
            </div>
          </div>
        ) : (
          /* Hiển thị chi tiết thông báo */
          <article className="bg-white rounded-3xl border border-slate-200/90 shadow-sm overflow-hidden flex flex-col">
            {/* Thanh tiêu đề trên cùng bài viết */}
            <div className="p-6 sm:p-10 border-b border-slate-100 space-y-5">
              {/* Danh mục và siêu dữ liệu */}
              <div className="flex flex-wrap items-center gap-3">
                {(() => {
                  const badge = getCategoryBadge(news.category);
                  return (
                    <span
                      className={`inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold border ${badge.className}`}
                    >
                      <Tag className="w-3.5 h-3.5" />
                      <span>{badge.label}</span>
                    </span>
                  );
                })()}

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <Calendar className="w-3.5 h-3.5 text-slate-400" />
                  <span>{formatDate(news.publishedAt || news.createdAt)}</span>
                </div>

                <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                  <User className="w-3.5 h-3.5 text-slate-400" />
                  <span>{news.authorName || news.authorId?.fullName || 'Khoa Công nghệ Thông tin'}</span>
                </div>

                {news.views !== undefined && (
                  <div className="flex items-center gap-1 text-xs text-slate-400 ml-auto">
                    <Eye className="w-3.5 h-3.5" />
                    <span>{news.views} lượt xem</span>
                  </div>
                )}
              </div>

              {/* Tiêu đề bài viết */}
              <h1 className="text-xl sm:text-2xl lg:text-3xl font-black text-slate-900 leading-snug tracking-tight">
                {news.title}
              </h1>

              {/* Đoạn trích tóm tắt (nếu có) */}
              {news.summary && (
                <div className="p-4 sm:p-5 rounded-2xl bg-blue-50/70 border-l-4 border-[#123891] text-slate-700 text-xs sm:text-sm font-medium leading-relaxed shadow-2xs">
                  {news.summary}
                </div>
              )}
            </div>

            {/* Nội dung bài viết */}
            <div className="p-6 sm:p-10 space-y-6">
              {/* Hình ảnh đại diện (Thumbnail) nếu có */}
              {news.thumbnail && (
                <div className="rounded-2xl overflow-hidden border border-slate-200 max-h-[480px] flex items-center justify-center bg-slate-50">
                  <img
                    src={getFileUrl(news.thumbnail)}
                    alt={news.title}
                    className="w-full h-full object-cover"
                  />
                </div>
              )}

              {/* Nội dung chính chi tiết */}
              <div className="text-sm sm:text-base text-slate-700 leading-relaxed whitespace-pre-line font-normal space-y-4">
                {news.content}
              </div>

              {/* Xử lý liên kết URL bên ngoài (nếu có) */}
              {externalUrl && (
                <div className="mt-8 pt-6 border-t border-slate-100 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 p-4 rounded-2xl bg-slate-50 border border-slate-200">
                  <div className="flex items-center gap-2.5">
                    <div className="w-8 h-8 rounded-xl bg-blue-100 text-[#123891] flex items-center justify-center shrink-0">
                      <ExternalLink className="w-4 h-4" />
                    </div>
                    <div>
                      <div className="text-xs font-bold text-slate-800">Liên kết nguồn / Nguồn bài viết gốc</div>
                      <div className="text-[11px] text-slate-500 truncate max-w-xs sm:max-w-md">
                        {externalUrl}
                      </div>
                    </div>
                  </div>
                  <a
                    href={externalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-[#123891] hover:bg-[#1B4DA1] text-white text-xs font-bold transition shadow-xs shrink-0"
                  >
                    <span>Mở liên kết gốc</span>
                    <ExternalLink className="w-3.5 h-3.5" />
                  </a>
                </div>
              )}
            </div>

            {/* Chân bài viết & Nút chia sẻ / Quay lại */}
            <div className="p-6 sm:px-10 py-5 bg-slate-50/80 border-t border-slate-100 flex flex-wrap items-center justify-between gap-4">
              <button
                type="button"
                onClick={() => navigate('/')}
                className="inline-flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
              >
                <ArrowLeft className="w-4 h-4 text-slate-500" />
                <span>Quay lại danh sách thông báo</span>
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleCopyLink}
                  className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
                  title="Sao chép liên kết bài viết"
                >
                  <Share2 className="w-3.5 h-3.5 text-slate-500" />
                  <span>{copied ? 'Đã sao chép liên kết!' : 'Chia sẻ bài viết'}</span>
                </button>
              </div>
            </div>
          </article>
        )}
      </main>

      {/* 3. Footer hệ thống dùng chung */}
      <Footer />
    </div>
  );
};

export default NewsDetailPage;
