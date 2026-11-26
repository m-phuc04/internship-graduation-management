import React, { useState } from 'react';
import Modal from './Modal';
import { useToast } from '../../context/ToastContext';
import {
  CheckCircle2,
  AlertTriangle,
  Copy,
  Check,
  GraduationCap,
  Briefcase,
  ShieldCheck,
} from 'lucide-react';

const AccountCreatedModal = ({ isOpen, onClose, data }) => {
  const { showToast } = useToast();
  const [copied, setCopied] = useState(false);

  if (!data) return null;

  const {
    role = 'STUDENT',
    fullName = '',
    code = '',
    studentCode = '',
    lecturerCode = '',
    email = '',
    initialPassword = '',
    emailSent = false,
    emailError = null,
  } = data;

  const isStaff = role === 'LECTURER' || role === 'TBM';
  const roleTitle = role === 'TBM' ? 'Trưởng bộ môn' : isStaff ? 'Giảng viên' : 'Sinh viên';
  const codeTitle = isStaff ? 'Mã giảng viên' : 'Mã số sinh viên (MSSV)';
  const displayCode = code || (isStaff ? lecturerCode : studentCode) || '—';

  const handleCopyPassword = () => {
    if (!initialPassword) return;
    navigator.clipboard.writeText(initialPassword);
    setCopied(true);
    showToast('Đã sao chép mật khẩu vào clipboard', 'success');
    setTimeout(() => setCopied(false), 2500);
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={`Khởi tạo tài khoản ${roleTitle} thành công`}
      subtitle={
        emailSent
          ? `Tài khoản đã được tạo và máy chủ SMTP đã tiếp nhận email gửi thông tin đăng nhập.`
          : `Tài khoản đã được lưu vào cơ sở dữ liệu. Máy chủ SMTP gặp lỗi khi gửi email.`
      }
      maxWidth="max-w-lg"
    >
      <div className="p-4 sm:p-6 space-y-4">
        {/* Banner trạng thái email SMTP */}
        {emailSent ? (
          <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start gap-3">
            <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
            <div className="text-xs text-emerald-900">
              <p className="font-bold">Máy chủ SMTP đã tiếp nhận email gửi thông tin đăng nhập</p>
              <p className="text-emerald-700 mt-0.5 text-[11px]">
                Email thông tin tài khoản đã được chuyển tới máy chủ gửi thư để chuyển đến địa chỉ <strong className="font-mono">{email}</strong>.
              </p>
            </div>
          </div>
        ) : (
          <div className="p-3.5 bg-amber-50 border border-amber-200 rounded-2xl flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
            <div className="text-xs text-amber-900">
              <p className="font-bold">Tạo tài khoản thành công (Gửi email thất bại)</p>
              <p className="text-amber-700 mt-0.5 text-[11px]">
                Máy chủ SMTP chưa tiếp nhận được email: {emailError || 'Lỗi kết nối máy chủ thư'}.
                Vui lòng sao chép mật khẩu bên dưới để cung cấp trực tiếp cho {roleTitle.toLowerCase()}.
              </p>
            </div>
          </div>
        )}

        {/* Khung chi tiết tài khoản */}
        <div className="p-4 bg-slate-50 border border-slate-200/80 rounded-2xl space-y-2.5">
          <div className="flex items-center gap-2 text-xs font-semibold text-slate-700">
            {isStaff ? (
              <Briefcase className="w-4 h-4 text-[#123891]" />
            ) : (
              <GraduationCap className="w-4 h-4 text-[#123891]" />
            )}
            <span>Thông tin tài khoản vừa khởi tạo:</span>
          </div>

          <div className="grid grid-cols-1 gap-2 pt-1 text-xs">
            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Họ và tên:</span>
              <span className="font-bold text-slate-900">{fullName}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">{codeTitle}:</span>
              <span className="font-mono font-bold text-slate-900">{displayCode}</span>
            </div>

            <div className="flex items-center justify-between py-1 border-b border-slate-200/60">
              <span className="text-slate-500">Email đăng nhập:</span>
              <span className="font-mono text-slate-800">{email}</span>
            </div>

            {/* Khối hiển thị mật khẩu khởi tạo */}
            <div className="pt-2">
              <span className="text-slate-500 block mb-1">Mật khẩu khởi tạo:</span>
              <div className="flex items-center justify-between p-3 bg-white border border-slate-300 rounded-xl shadow-2xs">
                <span className="font-mono text-base font-bold text-[#123891] tracking-wider select-all">
                  {initialPassword || '••••••••'}
                </span>
                {initialPassword && (
                  <button
                    type="button"
                    onClick={handleCopyPassword}
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 hover:bg-blue-100 text-[#123891] border border-blue-200 rounded-lg text-xs font-bold transition cursor-pointer"
                  >
                    {copied ? (
                      <>
                        <Check className="w-3.5 h-3.5 text-emerald-600" />
                        <span className="text-emerald-700">Đã chép!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="w-3.5 h-3.5" />
                        <span>Sao chép</span>
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Cảnh báo bảo mật */}
        <div className="p-3 bg-slate-100/70 rounded-xl text-[11px] text-slate-600 space-y-1">
          <p className="font-bold text-slate-700 flex items-center gap-1.5">
            <ShieldCheck className="w-3.5 h-3.5 text-[#123891]" />
            Lưu ý bảo mật hệ thống:
          </p>
          <ul className="list-disc list-inside space-y-0.5 text-slate-500 pl-1 text-[10px]">
            <li>Mật khẩu đã được mã hóa an toàn bằng chuẩn bcrypt (cost 12) trong cơ sở dữ liệu.</li>
            <li>Tài khoản được đánh dấu bắt buộc đổi mật khẩu ở lần đăng nhập đầu tiên.</li>
            <li>Mật khẩu văn bản thuần chỉ hiển thị tạm thời tại đây để Quản trị viên bàn giao nếu cần và sẽ giải phóng khi đóng cửa sổ này.</li>
          </ul>
        </div>

        {/* Nút hành động */}
        <div className="flex items-center justify-end pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-6 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white rounded-xl text-xs font-bold shadow-xs transition cursor-pointer"
          >
            Đóng
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AccountCreatedModal;
