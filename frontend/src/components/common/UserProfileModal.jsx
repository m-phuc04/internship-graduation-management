import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import profileApi from '../../api/profileApi';
import { useAuth } from '../../context/AuthContext';
import { useChat } from '../../context/ChatContext';
import {
  User,
  Mail,
  GraduationCap,
  BookOpen,
  Building2,
  ShieldCheck,
  Copy,
  Check,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';

const UserProfileModal = ({ isOpen, onClose, userId, initialData = null }) => {
  const { user: currentUser } = useAuth();
  const { openChatWithUser } = useChat();
  const [profile, setProfile] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [copiedEmail, setCopiedEmail] = useState(false);

  useEffect(() => {
    if (!isOpen) {
      setProfile(null);
      return;
    }

    if (initialData) {
      setProfile(initialData);
    }

    if (userId) {
      const fetchUserProfile = async () => {
        setLoading(true);
        try {
          const res = await profileApi.getPublicProfile(userId);
          if (res.success && res.data) {
            setProfile(res.data);
          }
        } catch (err) {
          console.error('Failed to load user public profile:', err);
        } finally {
          setLoading(false);
        }
      };

      fetchUserProfile();
    }
  }, [isOpen, userId, initialData]);

  const handleCopyEmail = (email) => {
    if (!email) return;
    navigator.clipboard.writeText(email);
    setCopiedEmail(true);
    setTimeout(() => setCopiedEmail(false), 2000);
  };

  const handleStartChat = () => {
    onClose();
    if (user) {
      openChatWithUser(user);
    }
  };

  const user = profile?.user || (initialData?.email ? initialData : null);
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
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Hồ Sơ Cá Nhân"
      maxWidth="max-w-sm"
    >
      {loading ? (
        <div className="py-12 flex flex-col items-center justify-center space-y-3">
          <div className="w-10 h-10 border-3 border-indigo-600 border-t-transparent rounded-full animate-spin" />
          <p className="text-xs text-slate-500 font-medium">Đang tải thông tin hồ sơ...</p>
        </div>
      ) : !user ? (
        <div className="py-10 text-center text-slate-500 space-y-3">
          <User className="w-12 h-12 text-slate-300 mx-auto" />
          <p className="text-sm font-semibold text-slate-700">Không tìm thấy thông tin người dùng</p>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-bold text-slate-700 bg-slate-100 rounded-xl hover:bg-slate-200 transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      ) : (
        <div className="space-y-4 select-none py-1">
          {/* Avatar & Header Card */}
          <div className="flex flex-col items-center text-center p-5 rounded-2xl bg-gradient-to-b from-indigo-50/70 to-slate-50 border border-slate-200/80 shadow-2xs">
            {/* Avatar */}
            <div className="relative mb-3">
              {user.avatar ? (
                <img
                  src={user.avatar}
                  alt={displayName}
                  className="w-20 h-20 rounded-full object-cover border-4 border-white shadow-md"
                />
              ) : (
                <div className="w-20 h-20 rounded-full bg-gradient-to-tr from-indigo-600 to-violet-600 flex items-center justify-center text-white text-2xl font-bold border-4 border-white shadow-md">
                  {user.fullName ? user.fullName.charAt(0).toUpperCase() : 'U'}
                </div>
              )}
            </div>

            {/* Name */}
            <h3 className="text-base font-black text-slate-900 tracking-tight leading-snug">
              {displayName}
            </h3>

            {/* Role Badge */}
            <div className="mt-1.5 flex items-center gap-1.5">
              <span
                className={`inline-flex items-center gap-1 text-[11px] font-bold px-3 py-0.5 rounded-full border ${roleInfo.bg}`}
              >
                <RoleIcon className="w-3.5 h-3.5" />
                <span>{roleInfo.label}</span>
              </span>
            </div>
          </div>

          {/* Quick Chat Action Button (Hide for Admin) */}
          {currentUser?.role !== 'ADMIN' && user?.role !== 'ADMIN' && (
            <button
              type="button"
              onClick={handleStartChat}
              className="w-full py-2.5 px-4 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.98] text-white rounded-xl text-xs font-bold transition flex items-center justify-center gap-2 shadow-xs cursor-pointer"
            >
              <MessageSquare className="w-4 h-4" />
              <span>Nhắn tin</span>
            </button>
          )}

          {/* Email Liên Lạc */}
          <div className="space-y-1.5">
            <div className="text-[11px] font-bold text-slate-400 uppercase tracking-wider px-1">
              Email Liên Lạc
            </div>

            <div className="flex items-center justify-between p-3 rounded-2xl bg-white border border-slate-200/80 shadow-2xs group hover:border-indigo-300 transition">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-indigo-50 text-indigo-600 flex items-center justify-center shrink-0">
                  <Mail className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <div className="text-[10px] text-slate-400 font-semibold uppercase">Email</div>
                  <div className="text-xs font-bold text-slate-800 truncate" title={user.email || 'Chưa cập nhật'}>
                    {user.email || 'Chưa cập nhật email'}
                  </div>
                </div>
              </div>

              {user.email && (
                <div className="flex items-center gap-1 shrink-0 ml-2">
                  <button
                    type="button"
                    onClick={() => handleCopyEmail(user.email)}
                    className="p-1.5 rounded-lg text-slate-400 hover:text-slate-700 hover:bg-slate-100 transition cursor-pointer"
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

          {/* Footer Action */}
          <div className="pt-1 flex justify-end">
            <button
              type="button"
              onClick={onClose}
              className="w-full py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold transition cursor-pointer"
            >
              Đóng
            </button>
          </div>
        </div>
      )}
    </Modal>
  );
};

export default UserProfileModal;

