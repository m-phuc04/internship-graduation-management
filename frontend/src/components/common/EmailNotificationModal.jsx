import React, { useState, useEffect } from 'react';
import Modal from './Modal';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import notificationApi from '../../api/notificationApi';
import {
  Mail,
  BellRing,
  BellOff,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Info,
  Briefcase,
  GraduationCap,
  Newspaper,
} from 'lucide-react';

const EmailNotificationModal = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [savingKey, setSavingKey] = useState(null); // 'TTDN' | 'THESIS' | 'NEWS' | null
  const [email, setEmail] = useState(user?.email || '');
  const [hasValidEmail, setHasValidEmail] = useState(false);

  const [enabledTTDN, setEnabledTTDN] = useState(Boolean(user?.emailNotificationEnabled));
  const [enabledThesis, setEnabledThesis] = useState(Boolean(user?.emailThesisEnabled));
  const [enabledNews, setEnabledNews] = useState(Boolean(user?.emailNewsEnabled));

  // Validate email format
  const checkEmailValid = (emailStr) => {
    if (!emailStr || typeof emailStr !== 'string') return false;
    const regex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return regex.test(emailStr.trim());
  };

  // Fetch latest settings from backend whenever modal opens
  useEffect(() => {
    if (!isOpen) return;

    let isMounted = true;
    const fetchSettings = async () => {
      setLoading(true);
      try {
        const res = await notificationApi.getEmailSettings();
        if (isMounted && res?.data) {
          const currentEmail = res.data.email || '';
          const isEnabledTTDN = Boolean(res.data.emailNotificationEnabled);
          const isEnabledThesis = Boolean(res.data.emailThesisEnabled);
          const isEnabledNews = Boolean(res.data.emailNewsEnabled);
          const isValid = res.data.hasValidEmail ?? checkEmailValid(currentEmail);

          setEmail(currentEmail);
          setEnabledTTDN(isEnabledTTDN);
          setEnabledThesis(isEnabledThesis);
          setEnabledNews(isEnabledNews);
          setHasValidEmail(isValid);
        }
      } catch {
        if (isMounted) {
          const fallbackEmail = user?.email || '';
          setEmail(fallbackEmail);
          setEnabledTTDN(Boolean(user?.emailNotificationEnabled));
          setEnabledThesis(Boolean(user?.emailThesisEnabled));
          setEnabledNews(Boolean(user?.emailNewsEnabled));
          setHasValidEmail(checkEmailValid(fallbackEmail));
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };

    fetchSettings();

    return () => {
      isMounted = false;
    };
  }, [isOpen]);

  // Handle Toggle Switch for individual module
  const handleToggle = async (key) => {
    if (savingKey) return;

    let currentVal = false;
    let payloadKey = '';
    let label = '';

    if (key === 'TTDN') {
      currentVal = enabledTTDN;
      payloadKey = 'emailNotificationEnabled';
      label = 'Thực tập Doanh nghiệp (TTDN)';
    } else if (key === 'THESIS') {
      currentVal = enabledThesis;
      payloadKey = 'emailThesisEnabled';
      label = 'Khóa luận Tốt nghiệp (KLTN)';
    } else if (key === 'NEWS') {
      currentVal = enabledNews;
      payloadKey = 'emailNewsEnabled';
      label = 'Bản tin đào tạo & Sự kiện';
    }

    const nextState = !currentVal;

    // Check email requirement before enabling
    if (nextState && !hasValidEmail) {
      showToast(
        'Tài khoản của bạn chưa có địa chỉ email hợp lệ. Vui lòng cập nhật email trong phần Hồ sơ cá nhân trước khi bật nhận email thông báo.',
        'error',
        6000
      );
      return;
    }

    setSavingKey(key);
    try {
      const res = await notificationApi.updateEmailSettings({ [payloadKey]: nextState });

      if (res?.success || res?.status === 200) {
        if (key === 'TTDN') setEnabledTTDN(nextState);
        if (key === 'THESIS') setEnabledThesis(nextState);
        if (key === 'NEWS') setEnabledNews(nextState);

        updateUser({ [payloadKey]: nextState });
        showToast(
          nextState
            ? `Đã bật đăng ký nhận email thông báo ${label} thành công!`
            : `Đã tắt nhận email thông báo ${label}.`,
          'success'
        );
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || err.message || 'Lỗi khi cập nhật cài đặt nhận email',
        'error'
      );
    } finally {
      setSavingKey(null);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Cài Đặt Đăng Ký Nhận Email Thông Báo"
      subtitle="Quản lý việc nhận thư điện tử tự động cho các phân hệ học vụ và tin tức đào tạo"
      maxWidth="max-w-xl"
    >
      <div className="space-y-4 text-xs">
        {/* Card 1: Email Address Info */}
        <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-2.5">
          <div className="flex items-center justify-between">
            <span className="font-bold text-slate-700 flex items-center gap-1.5 uppercase tracking-wider text-[11px]">
              <Mail className="w-4 h-4 text-[#123891]" />
              <span>Hòm thư nhận thông báo</span>
            </span>

            {hasValidEmail ? (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                <span>Email hợp lệ</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                <AlertCircle className="w-3.5 h-3.5 text-rose-600" />
                <span>Chưa có email hợp lệ</span>
              </span>
            )}
          </div>

          <div className="flex items-center justify-between gap-3 p-3 bg-white rounded-xl border border-slate-200 shadow-2xs">
            <div className="min-w-0">
              <div className="font-mono text-sm font-bold text-slate-900 truncate">
                {email || <span className="text-slate-400 italic font-sans font-normal">Chưa cập nhật email tài khoản</span>}
              </div>
              <div className="text-[11px] text-slate-500 mt-0.5">
                Chủ tài khoản: <strong>{user?.fullName || 'Người dùng'}</strong>
              </div>
            </div>
          </div>

          {/* Warning if no valid email */}
          {!hasValidEmail && (
            <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-800 flex items-start gap-2">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="leading-relaxed text-[11px]">
                <strong>Yêu cầu cập nhật email:</strong> Tài khoản của bạn hiện chưa có địa chỉ email hợp lệ. Vui lòng vào trang <strong>Hồ sơ cá nhân</strong> để cập nhật email trước khi đăng ký nhận thông báo.
              </div>
            </div>
          )}
        </div>

        {/* Card 2: Modules Toggle List */}
        <div className="space-y-3">
          {/* Nhóm 1: TTDN */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    enabledTTDN ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Briefcase className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      1. Thực tập Doanh nghiệp (TTDN)
                    </h4>
                    <div className="mt-0.5">
                      {loading ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <RefreshCw className="w-3 h-3 animate-spin text-[#123891]" />
                          <span>Đang đồng bộ...</span>
                        </span>
                      ) : enabledTTDN ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Đang bật</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          <BellOff className="w-3 h-3 text-slate-400" />
                          <span>Đang tắt</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  Nhận email khi: Duyệt hồ sơ, phân công GVGS, nộp/xử lý báo cáo, nhật ký thực tập, công bố điểm.
                </p>
              </div>

              {/* Toggle Switch */}
              <div className="shrink-0 pt-1">
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabledTTDN}
                  disabled={savingKey !== null || loading || (!enabledTTDN && !hasValidEmail)}
                  onClick={() => handleToggle('TTDN')}
                  className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#123891] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
                    enabledTTDN ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  title={enabledTTDN ? 'Nhấn để tắt nhận email TTDN' : 'Nhấn để bật nhận email TTDN'}
                >
                  <span className="sr-only">Bật/tắt nhận email TTDN</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                      enabledTTDN ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  >
                    {savingKey === 'TTDN' ? (
                      <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />
                    ) : enabledTTDN ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <BellOff className="w-3 h-3 text-slate-400" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Nhóm 2: KLTN */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    enabledThesis ? 'bg-indigo-100 text-indigo-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <GraduationCap className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      2. Khóa luận Tốt nghiệp (KLTN)
                    </h4>
                    <div className="mt-0.5">
                      {loading ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <RefreshCw className="w-3 h-3 animate-spin text-[#123891]" />
                          <span>Đang đồng bộ...</span>
                        </span>
                      ) : enabledThesis ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Đang bật</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          <BellOff className="w-3 h-3 text-slate-400" />
                          <span>Đang tắt</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  Nhận email khi: Duyệt đề tài, phân công GVHD, đăng tải tài liệu KLTN, cập nhật tiến độ/nhật ký, đánh giá phản biện & hội đồng.
                </p>
              </div>

              {/* Toggle Switch */}
              <div className="shrink-0 pt-1">
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabledThesis}
                  disabled={savingKey !== null || loading || (!enabledThesis && !hasValidEmail)}
                  onClick={() => handleToggle('THESIS')}
                  className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#123891] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
                    enabledThesis ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  title={enabledThesis ? 'Nhấn để tắt nhận email KLTN' : 'Nhấn để bật nhận email KLTN'}
                >
                  <span className="sr-only">Bật/tắt nhận email KLTN</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                      enabledThesis ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  >
                    {savingKey === 'THESIS' ? (
                      <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />
                    ) : enabledThesis ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <BellOff className="w-3 h-3 text-slate-400" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>

          {/* Nhóm 3: Bản tin & Sự kiện */}
          <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-2">
            <div className="flex items-start justify-between gap-4">
              <div className="space-y-1 min-w-0">
                <div className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                    enabledNews ? 'bg-amber-100 text-amber-700' : 'bg-slate-100 text-slate-400'
                  }`}>
                    <Newspaper className="w-4 h-4" />
                  </div>
                  <div>
                    <h4 className="font-bold text-slate-900 text-sm">
                      3. Bản tin đào tạo & Sự kiện
                    </h4>
                    <div className="mt-0.5">
                      {loading ? (
                        <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                          <RefreshCw className="w-3 h-3 animate-spin text-[#123891]" />
                          <span>Đang đồng bộ...</span>
                        </span>
                      ) : enabledNews ? (
                        <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                          <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                          <span>Đang bật</span>
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                          <BellOff className="w-3 h-3 text-slate-400" />
                          <span>Đang tắt</span>
                        </span>
                      )}
                    </div>
                  </div>
                </div>

                <p className="text-[11px] text-slate-500 leading-relaxed pt-1">
                  Nhận email khi: Khoa CNTT hoặc Bộ môn chính thức công bố các thông báo đào tạo, lịch trình hội thảo và sự kiện quan trọng.
                </p>
              </div>

              {/* Toggle Switch */}
              <div className="shrink-0 pt-1">
                <button
                  type="button"
                  role="switch"
                  aria-checked={enabledNews}
                  disabled={savingKey !== null || loading || (!enabledNews && !hasValidEmail)}
                  onClick={() => handleToggle('NEWS')}
                  className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#123891] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
                    enabledNews ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                  title={enabledNews ? 'Nhấn để tắt nhận email Bản tin' : 'Nhấn để bật nhận email Bản tin'}
                >
                  <span className="sr-only">Bật/tắt nhận email Bản tin</span>
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                      enabledNews ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  >
                    {savingKey === 'NEWS' ? (
                      <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />
                    ) : enabledNews ? (
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                    ) : (
                      <BellOff className="w-3 h-3 text-slate-400" />
                    )}
                  </span>
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Card 3: Important Notice */}
        <div className="p-3.5 bg-blue-50/60 border border-blue-200/80 rounded-2xl flex items-start gap-2.5 text-blue-950">
          <Info className="w-4 h-4 text-[#123891] shrink-0 mt-0.5" />
          <div className="text-[11px] leading-relaxed">
            <strong>Phân biệt thông báo nội bộ và email:</strong> Bật hoặc tắt chức năng này chỉ quyết định việc có gửi thêm thư điện tử hay không. Các thông báo nội bộ (biểu tượng chuông trên góc phải) vẫn luôn hoạt động bình thường trên tài khoản của bạn.
          </div>
        </div>

        {/* Footer Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 font-bold text-slate-700 bg-slate-100 hover:bg-slate-200 rounded-xl transition cursor-pointer text-xs"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default EmailNotificationModal;

