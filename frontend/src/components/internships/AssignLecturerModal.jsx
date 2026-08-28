import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import internshipApi from '../../api/internshipApi';
import { useToast } from '../../context/ToastContext';
import { BookOpen, CheckCircle2, User, Users } from 'lucide-react';

const AssignLecturerModal = ({ isOpen, onClose, internship, onAssigned }) => {
  const [availableLecturers, setAvailableLecturers] = useState([]);
  const [selectedLecturerId, setSelectedLecturerId] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      const fetchLecturers = async () => {
        setLoading(true);
        try {
          const res = await internshipApi.getAvailableLecturers();
          if (res.success) {
            setAvailableLecturers(res.data || []);
            if (internship?.lecturerId?._id) {
              setSelectedLecturerId(internship.lecturerId._id);
            } else {
              setSelectedLecturerId('');
            }
          }
        } catch (err) {
          showToast(err.message || 'Không thể tải danh sách giảng viên', 'error');
        } finally {
          setLoading(false);
        }
      };
      fetchLecturers();
    }
  }, [isOpen, internship, showToast]);

  const handleAssign = async () => {
    if (!selectedLecturerId) {
      setError('Vui lòng chọn giảng viên hướng dẫn');
      return;
    }

    setSubmitting(true);
    try {
      await internshipApi.assignLecturer(internship._id, selectedLecturerId);
      showToast('Phân công giảng viên hướng dẫn thành công!', 'success');
      setError('');
      onAssigned();
      onClose();
    } catch (err) {
      showToast(err.message || 'Không thể phân công giảng viên', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (!internship) return null;

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phân công Giảng viên Hướng dẫn (GVHD)"
      maxWidth="max-w-lg"
    >
      <div className="space-y-4 text-xs">
        {/* Student & Internship Info */}
        <div className="p-4 rounded-2xl bg-indigo-50/60 border border-indigo-200/80 text-indigo-900 space-y-1">
          <div className="font-bold text-sm">
            Sinh viên: {internship.studentId?.userId?.fullName} ({internship.studentId?.studentCode})
          </div>
          <div className="text-slate-700">
            Vị trí: <strong>{internship.position}</strong> • DN: <strong>{internship.companyId?.name}</strong>
          </div>
          {internship.lecturerId && (
            <div className="text-indigo-700 pt-1">
              GVHD hiện tại: <strong>{internship.lecturerId?.academicTitle} {internship.lecturerId?.userId?.fullName}</strong>
            </div>
          )}
        </div>

        {/* Lecturer Selector */}
        <div>
          <label className="block font-semibold text-slate-700 mb-1.5">
            Chọn Giảng viên hướng dẫn <span className="text-rose-500">*</span>
          </label>
          <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
            {loading ? (
              <div className="p-6 text-center text-slate-400">Đang tải danh sách giảng viên...</div>
            ) : availableLecturers.length === 0 ? (
              <div className="p-4 text-center text-slate-400">Không có giảng viên nào khả dụng</div>
            ) : (
              availableLecturers.map((lec) => {
                const isSelected = selectedLecturerId === lec._id;
                const isFull = !lec.canAssign;

                return (
                  <div
                    key={lec._id}
                    onClick={() => {
                      if (!isFull) {
                        setSelectedLecturerId(lec._id);
                        setError('');
                      }
                    }}
                    className={`p-3 rounded-2xl border transition cursor-pointer flex items-center justify-between gap-3 ${
                      isSelected
                        ? 'bg-indigo-50 border-indigo-500 ring-2 ring-indigo-500/20'
                        : isFull
                        ? 'bg-slate-50/60 border-slate-200 opacity-60 cursor-not-allowed'
                        : 'bg-white border-slate-200 hover:border-indigo-300'
                    }`}
                  >
                    <div className="min-w-0">
                      <div className="font-bold text-slate-900">
                        {lec.academicTitle} {lec.userId?.fullName}
                      </div>
                      <div className="text-[11px] text-slate-500 font-mono flex items-center gap-2 mt-0.5">
                        <span className="font-semibold text-indigo-600">{lec.lecturerCode}</span>
                        <span>•</span>
                        <span className="truncate">{lec.specialization || 'Chưa cập nhật'}</span>
                      </div>
                    </div>

                    <div className="text-right shrink-0">
                      <span
                        className={`text-[11px] font-bold px-2 py-0.5 rounded-md ${
                          isFull
                            ? 'bg-rose-50 text-rose-700 border border-rose-200'
                            : 'bg-indigo-50 text-indigo-700 border border-indigo-200'
                        }`}
                      >
                        {lec.activeStudentsCount} / {lec.maxStudents} SV
                      </span>
                      {isFull && (
                        <div className="text-[10px] text-rose-600 font-semibold mt-0.5">
                          Hết chỉ tiêu
                        </div>
                      )}
                    </div>
                  </div>
                );
              })
            )}
          </div>
          {error && <p className="text-rose-500 mt-1.5">{error}</p>}
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
            onClick={handleAssign}
            disabled={submitting || !selectedLecturerId}
            className="inline-flex items-center gap-1.5 px-4 py-2 font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-sm shadow-indigo-200 transition disabled:opacity-50"
          >
            {submitting ? (
              <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
            ) : (
              <BookOpen className="w-3.5 h-3.5" />
            )}
            <span>Xác nhận Phân công</span>
          </button>
        </div>
      </div>
    </Modal>
  );
};

export default AssignLecturerModal;
