import React, { useState } from 'react';
import Modal from '../common/Modal';
import adminApi from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import {
  KeyRound,
  AlertTriangle,
  CheckCircle2,
  Copy,
  Check,
  ShieldAlert,
  GraduationCap,
  Briefcase,
  RefreshCw,
  MailX,
} from 'lucide-react';

const ResetPasswordModal = ({ isOpen, onClose, targetUser, studentUser, onSuccess }) => {
  const { showToast } = useToast();

  const [loading, setLoading] = useState(false);
  const [resultData, setResultData] = useState(null);
  const [copied, setCopied] = useState(false);

  const user = targetUser || studentUser;
  if (!user) return null;

  const roleMap = {
    STUDENT: 'Sinh viên',
    LECTURER: 'Giảng viên',
    TBM: 'Trưởng bộ môn',
  };
  const roleTitle = roleMap[user.role] || user.role;
  const isStaff = user.role === 'LECTURER' || user.role === 'TBM';
  const codeTitle = isStaff ? 'Mã giảng viên' : 'MSSV';
  const accountCode = user.code || user.studentCode || user.lecturerCode || 'Chưa cập nhật';
  const fullName = user.fullName || user.name || roleTitle;
  const email = user.email || '';

  const handleConfirmReset = async () => {
    if (!email) {
      showToast(`Tài khoản ${roleTitle.toLowerCase()} này chưa có email xác thực để nhận mật khẩu.`, 'error');
      return;
    }

    setLoading(true);
    try {
      const res = await adminApi.resetPassword(user._id);
      if (res.success && res.data) {
        setResultData(res.data);
        if (res.data.emailSent) {
          showToast('Đặt lại mật khẩu thành công. Mật khẩu sẽ được gửi qua mail.', 'success');
        } else if (res.data.emailDisabled || res.data.emailError?.includes('tắt')) {
          showToast('Đặt lại mật khẩu thành công nhưng không gửi qua mail do người quản trị đã tắt tính năng này.', 'warning');
        } else {
          showToast(`Đặt lại mật khẩu thành công nhưng gửi email thất bại: ${res.data.emailError || 'Lỗi máy chủ SMTP'}`, 'warning');
        }
        if (onSuccess) onSuccess();
      } else {
        showToast(res.message || 'Lỗi khi đặt lại mật khẩu', 'error');
      }
    } catch (err) {
      showToast(err.message || 'Không thể đặt lại mật khẩu', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCopyPassword = () => {
    if (!resultData?.newPassword) return;
    navigator.clipboard.writeText(resultData.newPassword);
    setCopied(true);
    showToast('Đã sao chép mật khẩu mới vào clipboard', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  const handleClose = () => {
    setResultData(null);
    setCopied(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title={resultData ? 'Đặt lại mật khẩu thành công' : `Xác nhận đặt lại mật khẩu ${roleTitle}`}
      subtitle={
        resultData
          ? resultData.emailSent
            ? `Mật khẩu mới đã được khởi tạo thành công và đã gửi email đến ${roleTitle.toLowerCase()}.`
            : resultData.emailDisabled
              ? `Mật khẩu mới đã được cập nhật thành công (Email tự động đang tắt). Vui lòng sao chép mật khẩu bên dưới để bàn giao.`
              : `Mật khẩu mới đã được cập nhật thành công (Gửi email thất bại). Vui lòng sao chép mật khẩu bên dưới để bàn giao.`
          : `Hệ thống sẽ tạo mật khẩu ngẫu nhiên mới (8 ký tự), cập nhật vào cơ sở dữ liệu và gửi thông tin qua email (nếu được bật).`
      }
      maxWidth="max-w-lg"
    >
      <div className="p-4 sm:p-6 space-y-4">
        {!resultData ? (
          // ================= VIEW XÁC NHẬN =================
          <div className="space-y-4">
            {/* Thẻ thông tin tài khoản */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
              <div className="flex items-center gap-2.5 text-xs text-slate-500">
                {isStaff ? (
                  <Briefcase className="w-4 h-4 text-[#123891]" />
                ) : (
                  <GraduationCap className="w-4 h-4 text-[#123891]" />
                )}
                <span className="font-semibold text-slate-700">Thông tin tài khoản được chọn:</span>
              </div>
              <div className="grid grid-cols-1 gap-2 pt-1 text-xs">
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Họ và tên:</span>
                  <span className="font-bold text-slate-900">{fullName}</span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">Vai trò:</span>
                  <span
                    className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${user.role === 'TBM'
                        ? 'bg-amber-100 text-amber-800'
                        : user.role === 'LECTURER'
                          ? 'bg-blue-100 text-[#102d7d]'
                          : 'bg-blue-100 text-blue-700'
                      }`}
                  >
                    {roleTitle}
                  </span>
                </div>
                <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                  <span className="text-slate-500">{codeTitle}:</span>
                  <span className="font-mono font-bold text-[#123891]">{accountCode}</span>
                </div>
                <div className="flex items-center justify-between py-1">
                  <span className="text-slate-500">Email nhận thông báo:</span>
                  <span className="font-mono text-slate-800 text-[11px] font-semibold">
                    {email || <span className="text-rose-500 italic">Chưa có email</span>}
                  </span>
                </div>
              </div>
            </div>

            {/* Thông báo gửi email */}
            <div className="p-3 bg-blue-50/80 border border-blue-200 rounded-2xl flex items-center gap-2.5 text-xs text-blue-900">
              <AlertTriangle className="w-4 h-4 text-blue-600 shrink-0" />
              <p className="font-medium text-blue-950 text-xs">Mật khẩu sẽ được gửi qua email</p>
            </div>

            {/* Nút thao tác */}
            <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                disabled={loading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy bỏ
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                disabled={loading || !email}
                className="inline-flex items-center gap-2 px-5 py-2.5 bg-rose-600 hover:bg-rose-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Đang gửi email & đặt lại...</span>
                  </>
                ) : (
                  <>
                    <KeyRound className="w-4 h-4" />
                    <span>Xác nhận đặt lại mật khẩu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          // ================= VIEW KẾT QUẢ CHO ADMIN =================
          <div className="space-y-4">
            {resultData.emailSent ? (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-2.5 text-xs text-emerald-900 font-medium">
                <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-emerald-800">Đặt lại mật khẩu thành công!</span>
                  <p className="text-[11px] text-emerald-700 mt-0.5">
                    Email thông báo mật khẩu mới đã được gửi đến địa chỉ <strong>{resultData.email}</strong>.
                  </p>
                </div>
              </div>
            ) : resultData.emailDisabled ? (
              <div className="p-3 bg-blue-50 border border-blue-200 rounded-2xl flex items-start gap-2.5 text-xs text-blue-950 font-medium">
                <MailX className="w-5 h-5 text-[#123891] shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-blue-900">Đặt lại mật khẩu thành công (Email tự động đang tắt)</span>
                  <p className="text-[11px] text-blue-800 mt-0.5">
                    Tính năng gửi email khi Reset mật khẩu đang được tạm tắt trong Cấu hình Email hệ thống. Mật khẩu mới đã được lưu an toàn trong cơ sở dữ liệu. Vui lòng sao chép mật khẩu bên dưới để cung cấp cho người dùng.
                  </p>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-2.5 text-xs text-amber-950 font-medium">
                <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-bold text-amber-900">Đặt lại mật khẩu thành công (Gửi email thất bại)</span>
                  <p className="text-[11px] text-amber-800 mt-0.5">
                    Lý do: {resultData.emailError || 'Máy chủ SMTP không tiếp nhận email'}. Mật khẩu mới đã được lưu an toàn trong cơ sở dữ liệu. Vui lòng sao chép mật khẩu bên dưới để cung cấp cho người dùng.
                  </p>
                </div>
              </div>
            )}

            {/* Chi tiết thông tin đã reset */}
            <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Người dùng:</span>
                <span className="font-bold text-slate-900">{resultData.fullName}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Vai trò:</span>
                <span className="font-semibold text-slate-800">{resultData.roleLabel || roleTitle}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">{codeTitle}:</span>
                <span className="font-mono font-bold text-[#123891]">{resultData.code || resultData.studentCode || accountCode}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Email:</span>
                <span className="font-mono text-slate-800 text-[11px] font-semibold">{resultData.email}</span>
              </div>
              <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
                <span className="text-slate-500">Trạng thái gửi email:</span>
                {resultData.emailSent ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700">
                    <CheckCircle2 className="w-3.5 h-3.5" /> Đã gửi email
                  </span>
                ) : resultData.emailDisabled ? (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-slate-600">
                    <MailX className="w-3.5 h-3.5 text-slate-500" /> Tắt theo cấu hình
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-600">
                    <AlertTriangle className="w-3.5 h-3.5" /> Gửi thất bại
                  </span>
                )}
              </div>

              {/* Ô hiển thị mật khẩu mới và nút sao chép */}
              <div className="pt-2">
                <label className="block text-[11px] font-bold text-slate-700 mb-1">
                  Mật khẩu mới vừa tạo:
                </label>
                <div className="flex items-center gap-2">
                  <div className="flex-1 px-3.5 py-2.5 bg-white border-2 border-emerald-500/50 rounded-xl font-mono text-sm font-black text-emerald-700 select-all tracking-wider text-center">
                    {resultData.newPassword}
                  </div>
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2.5 bg-emerald-600 hover:bg-emerald-700 text-white rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer shrink-0"
                  >
                    {copied ? (
                      <>
                        <Check className="w-4 h-4" />
                        <span>Đã chép</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-4 h-4" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>

            {/* Lưu ý bảo mật */}
            <div className="p-3 bg-blue-50/70 border border-blue-200/80 rounded-2xl text-[11px] text-blue-900 flex items-start gap-2">
              <ShieldAlert className="w-4 h-4 text-[#123891] shrink-0 mt-0.5" />
              <span>
                <strong>Lưu ý bảo mật:</strong> Mật khẩu này chỉ hiển thị một lần duy nhất tại đây.
                Người dùng cũng đã nhận được thông báo qua email và bắt buộc phải đổi mật khẩu ở lần đăng nhập tới.
              </span>
            </div>

            {/* Nút đóng */}
            <div className="flex items-center justify-end pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={handleClose}
                className="px-6 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </div>
    </Modal>
  );
};

export default ResetPasswordModal;
