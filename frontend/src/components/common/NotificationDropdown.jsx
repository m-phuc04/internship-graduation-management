import React, { useState, useEffect, useRef, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import notificationApi from '../../api/notificationApi';
import { useAuth } from '../../context/AuthContext';
import {
  Bell,
  Check,
  CheckCheck,
  Clock,
  BookOpen,
  GraduationCap,
  Briefcase,
  Award,
  RotateCcw,
} from 'lucide-react';

const NotificationDropdown = () => {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef(null);

  const fetchUnreadCount = useCallback(async () => {
    if (!user) {
      setUnreadCount(0);
      return;
    }
    try {
      const res = await notificationApi.getUnreadCount();
      if (res?.success) {
        setUnreadCount(res.data?.unreadCount || 0);
      }
    } catch {
      // ignore
    }
  }, [user]);

  const fetchNotifications = useCallback(async () => {
    if (!user) {
      setNotifications([]);
      return;
    }
    setLoading(true);
    try {
      const res = await notificationApi.getNotifications({ limit: 15 });
      if (res?.success) {
        setNotifications(res.data || []);
        if (res.unreadCount !== undefined) {
          setUnreadCount(res.unreadCount);
        }
      }
    } catch {
      // ignore
    } finally {
      setLoading(false);
    }
  }, [user]);

  useEffect(() => {
    if (user) {
      fetchUnreadCount();
      const interval = setInterval(fetchUnreadCount, 30000); // 30s poll
      return () => clearInterval(interval);
    } else {
      setUnreadCount(0);
      setNotifications([]);
    }
  }, [user, fetchUnreadCount]);

  useEffect(() => {
    if (open) {
      fetchNotifications();
    }
  }, [open, fetchNotifications]);

  // Click outside to close
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleMarkAsRead = async (id, e) => {
    if (e) e.stopPropagation();
    try {
      await notificationApi.markAsRead(id);
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, isRead: true } : n)),
      );
      setUnreadCount((prev) => Math.max(0, prev - 1));
    } catch {
      // ignore
    }
  };

  const handleItemClick = async (item) => {
    if (!item.isRead) {
      await handleMarkAsRead(item._id);
    }
    setOpen(false);

    // If Recreate Evaluation request notification
    if (item.type === 'EVALUATION_RECREATE' || item.title?.includes('tạo lại link')) {
      navigate('/tbm/evaluations', {
        state: {
          activeTab: 'recreate_requests',
          requestId: item.referenceId,
          refreshedAt: Date.now(),
        },
      });
      return;
    }

    // Determine target URL based on notification type and title/message
    let targetLink = item.link;
    const role = user?.role;
    const isEvalNotification =
      item.type === 'EVALUATION' ||
      item.title?.toLowerCase().includes('đánh giá') ||
      item.message?.toLowerCase().includes('đánh giá thực tập');

    if (isEvalNotification) {
      if (role === 'TBM') targetLink = '/tbm/evaluations';
      else if (role === 'LECTURER') targetLink = '/lecturer/internships';
      else if (role === 'STUDENT') targetLink = '/student/internship';
      else if (role === 'COMPANY') targetLink = '/company/evaluations';
    }

    if (role === 'STUDENT' && targetLink) {
      if (targetLink.startsWith('/lecturer/reports') || targetLink.startsWith('/tbm/reports')) {
        targetLink = '/student/reports';
      } else if (
        targetLink.startsWith('/lecturer/internships') ||
        targetLink.startsWith('/tbm/internships') ||
        targetLink.startsWith('/tbm/evaluations')
      ) {
        targetLink = '/student/internship';
      } else if (
        targetLink.startsWith('/lecturer/theses/progress') ||
        targetLink.startsWith('/tbm/theses/progress')
      ) {
        targetLink = '/student/thesis/progress';
      } else if (
        targetLink.startsWith('/lecturer/theses') ||
        targetLink.startsWith('/tbm/theses') ||
        targetLink.startsWith('/tbm/thesis-evaluations')
      ) {
        targetLink = '/student/thesis';
      }
    }

    if (!targetLink) {
      if (item.type === 'THESIS') {
        if (role === 'LECTURER') targetLink = '/lecturer/theses';
        else if (role === 'STUDENT') targetLink = '/student/thesis';
        else if (role === 'TBM') targetLink = '/tbm/theses';
      } else if (item.type === 'THESIS_PROGRESS') {
        if (role === 'LECTURER') targetLink = '/lecturer/theses/progress';
        else if (role === 'STUDENT') targetLink = '/student/thesis/progress';
        else if (role === 'TBM') targetLink = '/tbm/theses';
      } else if (item.type === 'INTERNSHIP') {
        if (role === 'LECTURER') targetLink = '/lecturer/internships';
        else if (role === 'STUDENT') targetLink = '/student/internship';
        else if (role === 'TBM') targetLink = '/tbm/internships';
      } else if (item.type === 'INTERNSHIP_REPORT') {
        if (role === 'LECTURER') targetLink = '/lecturer/reports';
        else if (role === 'STUDENT') targetLink = '/student/reports';
        else if (role === 'TBM') targetLink = '/tbm/internships';
      } else if (item.type === 'EVALUATION') {
        if (role === 'COMPANY') targetLink = '/company/evaluations';
        else if (role === 'LECTURER') targetLink = '/lecturer/internships';
        else if (role === 'TBM') targetLink = '/tbm/evaluations';
      }
    }

    if (targetLink) {
      navigate(targetLink, {
        state: {
          notificationId: item._id,
          referenceId: item.referenceId,
          referenceModel: item.referenceModel,
          refreshedAt: Date.now(),
        },
      });
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await notificationApi.markAllAsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, isRead: true })));
      setUnreadCount(0);
    } catch {
      // ignore
    }
  };

  const getIconForType = (type) => {
    switch (type) {
      case 'EVALUATION_RECREATE':
        return <RotateCcw className="w-4 h-4 text-amber-600" />;
      case 'INTERNSHIP':
      case 'INTERNSHIP_REPORT':
        return <Briefcase className="w-4 h-4 text-blue-600" />;
      case 'THESIS':
      case 'THESIS_PROGRESS':
        return <GraduationCap className="w-4 h-4 text-indigo-600" />;
      case 'EVALUATION':
        return <Award className="w-4 h-4 text-amber-600" />;
      default:
        return <BookOpen className="w-4 h-4 text-slate-600" />;
    }
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const d = new Date(dateString);
    return d.toLocaleDateString('vi-VN', {
      hour: '2-digit',
      minute: '2-digit',
      day: '2-digit',
      month: '2-digit',
    });
  };

  return (
    <div className="relative" ref={dropdownRef}>
      {/* Bell Button */}
      <button
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className="relative p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
        title="Thông báo"
      >
        <Bell className="w-5 h-5" />
        {unreadCount > 0 && (
          <span className="absolute top-1 right-1 flex h-4 min-w-4 items-center justify-center rounded-full bg-rose-500 px-1 text-[10px] font-bold text-white shadow-xs">
            {unreadCount > 99 ? '99+' : unreadCount}
          </span>
        )}
      </button>

      {/* Popover */}
      {open && (
        <div className="fixed left-3 right-3 top-16 sm:absolute sm:left-auto sm:right-0 sm:top-auto sm:mt-2 sm:w-96 rounded-2xl bg-white border border-slate-200/90 shadow-2xl z-50 overflow-hidden animate-in fade-in zoom-in-95 duration-100 max-h-[calc(100vh-5rem)] flex flex-col">
          {/* Header */}
          <div className="flex items-center justify-between p-3.5 border-b border-slate-100 bg-slate-50/80 shrink-0">
            <div className="flex items-center gap-2 min-w-0">
              <span className="font-bold text-xs text-slate-900 truncate">Thông báo</span>
              {unreadCount > 0 && (
                <span className="px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 text-[10px] font-bold border border-indigo-200 shrink-0">
                  {unreadCount} mới
                </span>
              )}
            </div>

            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllAsRead}
                className="text-[11px] font-semibold text-indigo-600 hover:text-indigo-800 flex items-center gap-1 transition shrink-0 cursor-pointer"
              >
                <CheckCheck className="w-3.5 h-3.5" />
                <span>Đọc tất cả</span>
              </button>
            )}
          </div>

          {/* List */}
          <div className="max-h-80 sm:max-h-96 overflow-y-auto divide-y divide-slate-100 text-xs flex-1">
            {loading ? (
              <div className="p-6 text-center text-slate-400 text-xs">Đang tải thông báo...</div>
            ) : notifications.length === 0 ? (
              <div className="p-8 text-center text-slate-400">
                <Bell className="w-8 h-8 mx-auto text-slate-300 mb-2 opacity-50" />
                <p className="text-xs font-medium">Bạn chưa có thông báo nào</p>
              </div>
            ) : (
              notifications.map((item) => (
                <div
                  key={item._id}
                  onClick={() => handleItemClick(item)}
                  className={`p-3.5 flex items-start gap-3 hover:bg-slate-50 transition cursor-pointer ${
                    !item.isRead ? 'bg-indigo-50/40 font-medium' : ''
                  }`}
                >
                  <div className="p-2 rounded-xl bg-slate-100 shrink-0 mt-0.5">
                    {getIconForType(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1">
                      <h4 className={`text-xs text-slate-900 leading-snug line-clamp-1 break-words ${!item.isRead ? 'font-bold' : 'font-semibold'}`}>
                        {item.title}
                      </h4>
                      {!item.isRead && (
                        <button
                          type="button"
                          onClick={(e) => handleMarkAsRead(item._id, e)}
                          title="Đánh dấu đã đọc"
                          className="text-slate-400 hover:text-indigo-600 shrink-0 p-0.5 cursor-pointer"
                        >
                          <Check className="w-3.5 h-3.5" />
                        </button>
                      )}
                    </div>

                    <p className="text-[11px] text-slate-600 line-clamp-2 mt-0.5 leading-relaxed break-words">
                      {item.message}
                    </p>

                    <div className="text-[10px] text-slate-400 mt-1 flex items-center gap-1 font-mono">
                      <Clock className="w-3 h-3" />
                      <span>{formatDate(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default NotificationDropdown;
