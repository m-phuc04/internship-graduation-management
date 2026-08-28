import React, { useState } from 'react';
import Modal from '../common/Modal';
import internshipApi from '../../api/internshipApi';
import { useToast } from '../../context/ToastContext';
import { XCircle, AlertTriangle } from 'lucide-react';

const RejectModal = ({ isOpen, onClose, internship, onRejected }) => {
  const [reason, setReason] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  const handleReject = async () => {
    if (!reason.trim()) {
      setError('Vui lòng nhập lý do từ chối hồ sơ');
      return;
    }

    setSubmitting(true);
    try {
      await internshipApi.reject(internship._id, reason.trim());
      showToast('Từ chối hồ sơ thực tập thành công!', 'success');
      setReason('');
      setError('');
      onRejected();
      onClose();
    } catch (err) {
      showToast(err.message || 'Không thể từ chối hồ sơ thực tập', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!internship) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Từ chối Hồ sơ Thực tập Doanh nghiệp"
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-xs">
        {/* Student info */}
        <div className="p-4 rounded-2xl bg-rose-50/60 border border-rose-200/80 text-rose-900 space-y-1">
          <div className="font-bold text-sm">
            {internship.studentId?.userId?.fullName} ({internship.studentId?.studentCode})
          </div>
          <div className="text-slate-700">
            Vị trí: <strong>{internship.position}</strong> • DN: <strong>{internship.companyId?.name}</strong>
          </div>
        </div>

        {/* Reason Textarea */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Lý do từ chối hồ sơ <span className="text-rose-500">*</span>
          </label>
          <textarea
            rows={3}
            value={reason}
            onChange={(e) => {
              setReason(e.target.value);
              if (error) setError('');
            }}
            placeholder="Nhập lý do chi tiết để sinh viên biết và chỉnh sửa (VD: Doanh nghiệp không đủ điều kiện, thông tin người hướng dẫn chưa chính xác...)"
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-rose-500/20 focus:border-rose-500 transition resize-none"
          />
          {error && <p className="text-rose-500 mt-1">{error}</p>}
        </div>

        <div className="p-3 rounded-xl bg-slate-100 text-slate-600 text-[11px] leading-relaxed flex items-start gap-2">
          <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
          <span>
            Hồ sơ sẽ chuyển sang trạng thái <strong>REJECTED</strong>. Trạng thái đăng ký của sinh viên sẽ được mở lại để nộp hồ sơ mới.
          </span>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Hủy
          </button>
          <button
            type="button"
            onClick={handleReject}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-rose-600 hover:bg-rose-700 rounded-xl shadow-sm shadow-rose-200 transition disabled:opacity-50"
          >
            {submitting ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <XCircle className="w-3.5 h-3.5" />
            )}
            <span>Xác nhận Từ chối</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default RejectModal;
