import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import thesisApi from '../../api/thesisApi';
import { useToast } from '../../context/ToastContext';
import { BookOpen, UserCheck, AlertCircle } from 'lucide-react';

const AssignSupervisorModal = ({ isOpen, onClose, thesis, onSuccess }) => {
  const [supervisors, setSupervisors] = useState([]);
  const [loadingSupervisors, setLoadingSupervisors] = useState(false);
  const [supervisorId, setSupervisorId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setError('');
      setSupervisorId(thesis?.supervisorId?._id || thesis?.supervisorId || '');
      fetchSupervisors();
    }
  }, [isOpen, thesis]);

  const fetchSupervisors = async () => {
    setLoadingSupervisors(true);
    try {
      const res = await thesisApi.getAvailableSupervisors();
      if (res.success) {
        setSupervisors(res.data || []);
      }
    } catch (err) {
      showToast('Không thể tải danh sách giảng viên', 'error');
    } finally {
      setLoadingSupervisors(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (thesis?.status === 'COMPLETED') {
      setError('Khóa luận đã hoàn thành và không thể thay đổi giảng viên hướng dẫn.');
      return;
    }
    if (!supervisorId) {
      setError('Vui lòng chọn giảng viên hướng dẫn');
      return;
    }

    setSubmitting(true);
    try {
      const res = await thesisApi.assignSupervisor(thesis._id, { supervisorId });
      if (res.success) {
        showToast('Cập nhật giảng viên hướng dẫn thành công!', 'success');
        onSuccess();
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Phân công GVHD thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (!thesis) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phân Công / Thay Đổi Giảng Viên Hướng Dẫn"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80">
          <div className="font-bold text-slate-900 text-xs leading-snug">{thesis.thesisTitle}</div>
          <div className="text-[11px] text-slate-500 mt-1">
            Sinh viên: <strong>{thesis.studentId?.userId?.fullName}</strong> ({thesis.studentId?.studentCode})
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span>{error}</span>
          </div>
        )}

        <div>
          <label className="block text-xs font-semibold text-slate-700 mb-1">
            Chọn Giảng viên hướng dẫn (GVHD) <span className="text-rose-500">*</span>
          </label>
          <select
            value={supervisorId}
            onChange={(e) => {
              setSupervisorId(e.target.value);
              setError('');
            }}
            disabled={loadingSupervisors || submitting}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          >
            <option value="">-- Chọn Giảng viên hướng dẫn --</option>
            {supervisors.map((s) => (
              <option
                key={s._id}
                value={s._id}
                disabled={!s.isAvailable && s._id !== thesis.supervisorId?._id}
              >
                {s.displayText} {!s.isAvailable && s._id !== thesis.supervisorId?._id ? '(Đã hết chỉ tiêu)' : ''}
              </option>
            ))}
          </select>
        </div>

        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{submitting ? 'Đang lưu...' : 'Lưu phân công GVHD'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignSupervisorModal;
