import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { useChat } from '../context/ChatContext';
import profileApi from '../api/profileApi';
import Footer from '../components/layout/Footer';
import {
  User,
  Mail,
  GraduationCap,
  BookOpen,
  Building2,
  ShieldCheck,
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

const PublicProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user: currentUser } = useAuth();
  const { openChatWithUser } = useChat();

  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (currentUser?._id && id && String(currentUser._id) === String(id)) {
      navigate('/profile', { replace: true });
      return;
    }

    const fetchProfile = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await profileApi.getPublicProfile(id);
        if (res.success && res.data) {
          if (currentUser?._id && res.data.user?._id && String(currentUser._id) === String(res.data.user._id)) {
            navigate('/profile', { replace: true });
            return;
          }
          setProfile(res.data);
        } else {
          setError('Không tìm thấy thông tin người dùng');
        }
      } catch (err) {
        setError(err.message || 'Không thể tải hồ sơ người dùng');
      } finally {
        setLoading(false);
      }
    };

    if (id) {
      fetchProfile();
    }
  }, [id, currentUser, navigate]);

  const handleCopyEmail = (email) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleStartChat = () => {
    if (user) {
      openChatWithUser(user);
    }
  };

  const user = profile?.user;
  const lecturer = profile?.lecturer;

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return {
          label: 'Quản Trị Viên (ADMIN)',
          bg: 'bg-rose-50 text-rose-700 border-rose-200',
          icon: ShieldCheck,
        };
      case 'TBM':
        return {
          label: 'Trưởng Bộ Môn (TBM)',
          bg: 'bg-amber-50 text-amber-700 border-amber-200',
          icon: ShieldCheck,
        };
      case 'LECTURER':
        return {
          label: 'Giảng Viên (Lecturer)',
          bg: 'bg-blue-50 text-blue-700 border-blue-200',
          icon: BookOpen,
        };
      case 'STUDENT':
        return {
          label: 'Sinh Viên (Student)',
          bg: 'bg-emerald-50 text-emerald-700 border-emerald-200',
          icon: GraduationCap,
        };
      case 'COMPANY':
        return {
          label: 'Doanh Nghiệp (Company)',
          bg: 'bg-indigo-50 text-indigo-700 border-indigo-200',
          icon: Building2,
        };
      default:
        return {
          label: 'Thành viên',
          bg: 'bg-slate-100 text-slate-700 border-slate-200',
          icon: User,
        };
    }
  };

  const roleInfo = getRoleBadge(user?.role);
  const RoleIcon = roleInfo.icon;

  const displayName = lecturer?.academicTitle
    ? `${lecturer.academicTitle} ${user?.fullName || ''}`
    : user?.fullName || 'Người dùng';

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col justify-between">
      <div className="max-w-lg w-full mx-auto py-8 px-4 sm:px-6 space-y-6 flex-1">
        {/* Top Back Navigation */}
        <div>
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="inline-flex items-center gap-2 px-3.5 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold transition shadow-2xs cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Quay lại</span>
          </button>
        </div>

        {loading ? (
          <div className="p-12 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col items-center justify-center space-y-4">
            <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
            <p className="text-xs text-slate-500 font-semibold">Đang tải hồ sơ...</p>
          </div>
        ) : error || !user ? (
          <div className="p-12 rounded-3xl bg-white border border-slate-200/80 shadow-2xs text-center space-y-3">
            <User className="w-12 h-12 text-slate-300 mx-auto" />
            <h3 className="text-base font-bold text-slate-900">{error || 'Không tìm thấy hồ sơ người dùng'}</h3>
            <p className="text-xs text-slate-500">Tài khoản này có thể không tồn tại hoặc đã bị khóa.</p>
          </div>
        ) : (
          <div className="space-y-6">
            {/* Main Card */}
            <div className="p-8 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-6">
              {/* Header / Avatar */}
              <div className="flex flex-col items-center text-center">
                <div className="relative mb-4">
                  {user.avatar ? (
                    <img
                      src={user.avatar}
                      alt={displayName}
                      className="w-24 h-24 rounded-full object-cover border-4 border-indigo-50 shadow-md"
                    />
                  ) : (
                    <div className="w-24 h-24 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-3xl font-bold border-4 border-indigo-50 shadow-md">
                      {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                    </div>
                  )}
                </div>

                <h2 className="text-xl font-black text-slate-900 tracking-tight">
                  {displayName}
                </h2>

                <div className="mt-2">
                  <span
                    className={`inline-flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full border ${roleInfo.bg}`}
                  >
                    <RoleIcon className="w-4 h-4" />
                    <span>{roleInfo.label}</span>
                  </span>
                </div>
              </div>

              {/* Quick Chat Action Button (Hide for Admin) */}
              {currentUser?.role !== 'ADMIN' && user?.role !== 'ADMIN' && (
                <button
                  type="button"
                  onClick={handleStartChat}
                  className="w-full py-3 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-2xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
                >
                  <MessageSquare className="w-4 h-4" />
                  <span>Nhắn tin</span>
                </button>
              )}

              {/* Contact Info Card */}
              <div className="space-y-2 pt-2 border-t border-slate-100">
                <div className="text-xs font-bold text-slate-400 uppercase tracking-wider px-1">
                  Email Liên Lạc
                </div>

                <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 flex items-center justify-between">
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 rounded-xl bg-indigo-100 text-indigo-700 flex items-center justify-center shrink-0">
                      <Mail className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="text-[10px] text-slate-400 font-semibold uppercase">Email</div>
                      <div className="text-xs font-bold text-slate-900 truncate" title={user.email}>
                        {user.email || 'Chưa cập nhật'}
                      </div>
                    </div>
                  </div>

                  {user.email && (
                    <div className="flex items-center gap-1 shrink-0 ml-2">
                      <button
                        type="button"
                        onClick={() => handleCopyEmail(user.email)}
                        className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-200 transition cursor-pointer"
                        title="Sao chép email"
                      >
                        {copiedEmail ? (
                          <Check className="w-4 h-4 text-emerald-600" />
                        ) : (
                          <Copy className="w-4 h-4" />
                        )}
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
      <Footer />
    </div>
  );
};

export default PublicProfilePage;

