import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import internshipApi from '../../api/internshipApi';
import { useToast } from '../../context/ToastContext';
import { CheckCircle2, BookOpen, AlertCircle } from 'lucide-react';

const ApproveModal = ({ isOpen, onClose, internship, onApproved }) => {
  const [availableLecturers, setAvailableLecturers] = useState([]);
  const [selectedLecturerId, setSelectedLecturerId] = useState('');
  const [loadingLecturers, setLoadingLecturers] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const fetchLecturers = async () => {
        setLoadingLecturers(true);
        try {
          const res = await internshipApi.getAvailableLecturers();
          if (res.success) {
            setAvailableLecturers(res.data || []);
            // Pre-select if internship already had one
            if (internship?.lecturerId?._id) {
              setSelectedLecturerId(internship.lecturerId._id);
            } else {
              setSelectedLecturerId('');
            }
          }
        } catch {
          // ignore
        } finally {
          setLoadingLecturers(false);
        }
      };
      fetchLecturers();
    }
  }, [isOpen, internship]);

  const handleApprove = async () => {
    if (!internship) return;
    setSubmitting(true);
    try {
      await internshipApi.approve(
        internship._id,
        selectedLecturerId || undefined,
      );
      showToast('Phê duyệt hồ sơ thực tập thành công!', 'success');
      onApproved();
      onClose();
    } catch (err) {
      showToast(err.message || 'Không thể duyệt hồ sơ thực tập', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!internship) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phê duyệt Hồ sơ Thực tập Doanh nghiệp"
      maxWidth="max-w-md"
    >
      <div className="space-y-4 text-xs">
        {/* Info card */}
        <div className="p-4 rounded-2xl bg-emerald-50/60 border border-emerald-200/80 text-emerald-900 space-y-1.5">
          <div className="font-bold text-sm">
            {internship.studentId?.userId?.fullName} ({internship.studentId?.studentCode})
          </div>
          <div className="text-slate-700">
            Vị trí: <strong>{internship.position}</strong>
          </div>
          <div className="text-slate-700">
            Doanh nghiệp: <strong>{internship.companyId?.name}</strong>
          </div>
        </div>

        {/* Optional Lecturer Selection */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Chỉ định Giảng viên Hướng dẫn (Tùy chọn)
          </label>
          <select
            value={selectedLecturerId}
            onChange={(e) => setSelectedLecturerId(e.target.value)}
            disabled={loadingLecturers}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-800 focus:bg-white focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-500 transition"
          >
            <option value="">-- Chưa phân công (Phân công sau) --</option>
            {availableLecturers.map((lec) => (
              <option
                key={lec._id}
                value={lec._id}
                disabled={!lec.canAssign}
              >
                {lec.academicTitle} {lec.userId?.fullName} - {lec.lecturerCode} ({lec.specialization}) [{lec.activeStudentsCount}/{lec.maxStudents} SV]
                {!lec.canAssign ? ' - ĐÃ HẾT CHỈ TIÊU' : ''}
              </option>
            ))}
          </select>
          <p className="text-[11px] text-slate-400 mt-1">
            Bạn có thể chọn GVHD ngay bây giờ hoặc phân công sau trong danh sách hồ sơ.
          </p>
        </div>

        {/* Confirmation Prompt */}
        <p className="text-slate-500 pt-1 leading-relaxed">
          Hồ sơ sau khi phê duyệt sẽ chuyển sang trạng thái <strong>APPROVED</strong> và sinh viên sẽ được tiếp tục quá trình thực tập.
        </p>

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
            onClick={handleApprove}
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-sm shadow-emerald-200 transition disabled:opacity-50"
          >
            {submitting ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <CheckCircle2 className="w-3.5 h-3.5" />
            )}
            <span>Xác nhận Duyệt</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default ApproveModal;
