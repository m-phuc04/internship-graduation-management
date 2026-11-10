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
  ShieldCheck,
  ExternalLink,
} from 'lucide-react';

const EmailNotificationModal = ({ isOpen, onClose }) => {
  const { user, updateUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [enabled, setEnabled] = useState(Boolean(user?.emailNotificationEnabled));
  const [email, setEmail] = useState(user?.email || '');
  const [hasValidEmail, setHasValidEmail] = useState(false);

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
          const currentEmail = res.data.email || user?.email || '';
          const isEnabled = Boolean(res.data.emailNotificationEnabled);
          const isValid = res.data.hasValidEmail ?? checkEmailValid(currentEmail);

          setEmail(currentEmail);
          setEnabled(isEnabled);
          setHasValidEmail(isValid);

          // Sync with AuthContext if different
          if (user && user.emailNotificationEnabled !== isEnabled) {
            updateUser({ emailNotificationEnabled: isEnabled });
          }
        }
      } catch {
        if (isMounted) {
          const fallbackEmail = user?.email || '';
          setEmail(fallbackEmail);
          setEnabled(Boolean(user?.emailNotificationEnabled));
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
  }, [isOpen, user, updateUser]);

  // Handle Toggle Switch
  const handleToggle = async () => {
    if (saving) return;

    const nextState = !enabled;

    // Check email requirement before enabling
    if (nextState && !hasValidEmail) {
      showToast(
        'Tài khoản của bạn chưa có địa chỉ email hợp lệ. Vui lòng cập nhật email trong phần Hồ sơ cá nhân trước khi bật nhận email thông báo.',
        'error',
        6000
      );
      return;
    }

    setSaving(true);
    try {
      const res = await notificationApi.updateEmailSettings({ enabled: nextState });

      if (res?.success || res?.status === 200) {
        setEnabled(nextState);
        updateUser({ emailNotificationEnabled: nextState });
        showToast(
          nextState
            ? 'Đã bật đăng ký nhận email thông báo TTDN thành công!'
            : 'Đã tắt nhận email thông báo TTDN.',
          'success'
        );
      }
    } catch (err) {
      showToast(
        err.response?.data?.message || err.message || 'Lỗi khi cập nhật cài đặt nhận email',
        'error'
      );
    } finally {
      setSaving(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Đăng ký nhận Email Thông báo (TTDN)"
      subtitle="Cài đặt thông báo tự động qua hòm thư điện tử cho module Thực tập Doanh nghiệp"
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

        {/* Card 2: Main Toggle Switch */}
        <div className="p-4 rounded-2xl bg-white border border-slate-200/90 shadow-2xs space-y-3">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1 min-w-0">
              <div className="flex items-center gap-2">
                <div className={`w-8 h-8 rounded-xl flex items-center justify-center shrink-0 ${
                  enabled ? 'bg-emerald-100 text-emerald-700' : 'bg-slate-100 text-slate-400'
                }`}>
                  {enabled ? <BellRing className="w-4 h-4" /> : <BellOff className="w-4 h-4" />}
                </div>
                <div>
                  <h4 className="font-bold text-slate-900 text-sm">
                    Thông báo Thực tập Doanh nghiệp (TTDN)
                  </h4>
                  <div className="mt-0.5">
                    {loading ? (
                      <span className="inline-flex items-center gap-1 text-[11px] text-slate-400">
                        <RefreshCw className="w-3 h-3 animate-spin text-[#123891]" />
                        <span>Đang đồng bộ...</span>
                      </span>
                    ) : enabled ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-lg border border-emerald-200 shadow-2xs">
                        <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                        <span>Trạng thái: Đang bật</span>
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-lg border border-slate-200">
                        <BellOff className="w-3 h-3 text-slate-400" />
                        <span>Trạng thái: Đang tắt</span>
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <p className="text-[11px] text-slate-600 leading-relaxed pt-2">
                Khi được kích hoạt, hệ thống sẽ tự động gửi email thông báo đến hòm thư của bạn khi phát sinh các sự kiện:
              </p>
              <ul className="text-[11px] text-slate-500 list-disc list-inside space-y-0.5 pl-1">
                <li>Đăng ký thực tập thành công / Duyệt hoặc từ chối hồ sơ thực tập</li>
                <li>Phân công Giảng viên Giám sát (GVGS)</li>
                <li>Sinh viên nộp hoặc gỡ file báo cáo thực tập</li>
                <li>Nộp và phản hồi nhật ký thực tập</li>
                <li>Giảng viên cập nhật điểm / Trưởng Bộ Môn công bố điểm chính thức</li>
              </ul>
            </div>

            {/* Toggle Switch Component */}
            <div className="shrink-0 pt-1">
              <button
                type="button"
                role="switch"
                aria-checked={enabled}
                disabled={saving || loading || (!enabled && !hasValidEmail)}
                onClick={handleToggle}
                className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#123891] focus:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-40 ${
                  enabled ? 'bg-emerald-600' : 'bg-slate-300'
                }`}
                title={
                  !hasValidEmail && !enabled
                    ? 'Vui lòng cập nhật email hợp lệ trước khi bật'
                    : enabled
                    ? 'Nhấn để tắt nhận email'
                    : 'Nhấn để bật nhận email'
                }
              >
                <span className="sr-only">Bật/tắt nhận email</span>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out flex items-center justify-center ${
                    enabled ? 'translate-x-6' : 'translate-x-0'
                  }`}
                >
                  {saving ? (
                    <RefreshCw className="w-3 h-3 text-slate-500 animate-spin" />
                  ) : enabled ? (
                    <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <BellOff className="w-3 h-3 text-slate-400" />
                  )}
                </span>
              </button>
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

