import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import thesisApi from '../../api/thesisApi';
import lecturerApi from '../../api/lecturerApi';
import { useToast } from '../../context/ToastContext';
import { AlertCircle, BookOpen } from 'lucide-react';

const AssignReviewersModal = ({ isOpen, onClose, thesis, onSuccess }) => {
  const [lecturers, setLecturers] = useState([]);
  const [loadingLecturers, setLoadingLecturers] = useState(false);
  const [reviewer1Id, setReviewer1Id] = useState('');
  const [reviewer2Id, setReviewer2Id] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { showToast } = useToast();

  const supervisorIdStr =
    thesis?.supervisorId?._id?.toString() ||
    thesis?.supervisorId?.toString() ||
    '';

  useEffect(() => {
    if (isOpen && thesis) {
      setError('');

      let r1 =
        thesis?.reviewer1Id?._id?.toString() ||
        thesis?.reviewer1Id?.toString() ||
        '';

      let r2 =
        thesis?.reviewer2Id?._id?.toString() ||
        thesis?.reviewer2Id?.toString() ||
        '';

      if (!r1 && Array.isArray(thesis?.reviewers)) {
        const priv = thesis.reviewers.find((r) => r.isPrivateReviewer);
        if (priv) {
          r1 = priv.lecturerId?._id?.toString() || priv.lecturerId?.toString() || '';
        }
      }

      if (!r2 && Array.isArray(thesis?.reviewers)) {
        const coun = thesis.reviewers.find((r) => r.isCouncilReviewer);
        if (coun) {
          r2 = coun.lecturerId?._id?.toString() || coun.lecturerId?.toString() || '';
        }
      }

      setReviewer1Id(r1);
      setReviewer2Id(r2);
      fetchLecturers();
    }
  }, [isOpen, thesis]);

  const fetchLecturers = async () => {
    setLoadingLecturers(true);
    try {
      const res = await lecturerApi.getAll({ limit: 100, isActive: true });
      if (res.success) {
        setLecturers(res.data || []);
      }
    } catch (err) {
      showToast('Không thể tải danh sách giảng viên', 'error');
    } finally {
      setLoadingLecturers(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (thesis?.status === 'COMPLETED') {
      setError('Khóa luận đã hoàn thành và không thể chỉnh sửa phân công phản biện.');
      return;
    }
    setError('');

    if (!reviewer1Id && !reviewer2Id) {
      setError('Vui lòng chọn ít nhất một giảng viên phản biện.');
      return;
    }

    if (reviewer1Id && reviewer2Id && reviewer1Id === reviewer2Id) {
      setError('Giảng viên phản biện 1 và Giảng viên phản biện 2 không được trùng nhau.');
      return;
    }

    if (reviewer1Id && reviewer1Id === supervisorIdStr) {
      setError('Giảng viên hướng dẫn (GVHD) không được làm Giảng viên phản biện 1.');
      return;
    }

    if (reviewer2Id && reviewer2Id === supervisorIdStr) {
      setError('Giảng viên hướng dẫn (GVHD) không được làm Giảng viên phản biện 2.');
      return;
    }

    setSubmitting(true);
    try {
      const reviewersPayload = [];
      if (reviewer1Id) {
        reviewersPayload.push({
          lecturerId: reviewer1Id,
          isPrivateReviewer: true,
          isCouncilReviewer: false,
        });
      }
      if (reviewer2Id) {
        reviewersPayload.push({
          lecturerId: reviewer2Id,
          isPrivateReviewer: false,
          isCouncilReviewer: true,
        });
      }

      const payload = {
        reviewer1Id: reviewer1Id || null,
        reviewer2Id: reviewer2Id || null,
        reviewers: reviewersPayload,
      };

      const res = await thesisApi.assignReviewers(thesis._id, payload);

      if (res.success) {
        showToast('Phân công phản biện thành công.', 'success');
        onSuccess(res.data);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Phân công phản biện thất bại');
    } finally {
      setSubmitting(false);
    }
  };

  if (!thesis) return null;

  const availableLecturers = lecturers.filter(
    (lec) => lec._id?.toString() !== supervisorIdStr
  );

  const availableReviewer1Lecturers = availableLecturers.filter(
    (lec) => !reviewer2Id || lec._id?.toString() !== reviewer2Id.toString()
  );

  const availableReviewer2Lecturers = availableLecturers.filter(
    (lec) => !reviewer1Id || lec._id?.toString() !== reviewer1Id.toString()
  );

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phân Công Giảng Viên Phản Biện"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Thesis Summary Card */}
        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-1.5 shadow-2xs">
          <div className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-[#123891] shrink-0 mt-0.5" />
            <div className="font-bold text-slate-900 text-xs leading-snug">{thesis.thesisTitle}</div>
          </div>

          <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-2 pt-1 border-t border-blue-100/80">
            <span>
              SV1: <strong>{thesis.studentId?.userId?.fullName}</strong> ({thesis.studentId?.studentCode})
            </span>
            {thesis.studentCount === 2 && thesis.secondStudentId && (
              <>
                <span>•</span>
                <span>
                  SV2: <strong>{thesis.secondStudentId?.userId?.fullName}</strong> ({thesis.secondStudentId?.studentCode})
                </span>
              </>
            )}
            <span>•</span>
            <span className="font-bold text-[#102d7d]">
              GVHD: {thesis.supervisorId?.academicTitle ? `${thesis.supervisorId.academicTitle} ` : ''}
              {thesis.supervisorId?.userId?.fullName} ({thesis.supervisorId?.lecturerCode})
            </span>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Phân công giảng viên phản biện */}
        <div className="space-y-3.5">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            Phân công giảng viên phản biện
          </label>

          {/* Reviewer 1 */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Giảng viên phản biện 1
            </label>
            <select
              value={reviewer1Id}
              onChange={(e) => {
                setError('');
                setReviewer1Id(e.target.value);
              }}
              disabled={loadingLecturers || submitting}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
            >
              <option value="">-- Chọn Giảng viên phản biện 1 --</option>
              {availableReviewer1Lecturers.map((lec) => (
                <option key={lec._id} value={lec._id}>
                  {lec.academicTitle ? `${lec.academicTitle} ` : 'ThS. '}
                  {lec.userId?.fullName || 'Giảng viên'} ({lec.lecturerCode})
                </option>
              ))}
            </select>
          </div>

          {/* Reviewer 2 */}
          <div className="p-3 rounded-xl border border-slate-200 bg-slate-50/50 space-y-1.5">
            <label className="block text-xs font-semibold text-slate-700">
              Giảng viên phản biện 2
            </label>
            <select
              value={reviewer2Id}
              onChange={(e) => {
                setError('');
                setReviewer2Id(e.target.value);
              }}
              disabled={loadingLecturers || submitting}
              className="w-full px-3 py-2 bg-white border border-slate-300 rounded-lg text-xs text-slate-900 font-medium focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
            >
              <option value="">-- Chọn Giảng viên phản biện 2 --</option>
              {availableReviewer2Lecturers.map((lec) => (
                <option key={lec._id} value={lec._id}>
                  {lec.academicTitle ? `${lec.academicTitle} ` : 'ThS. '}
                  {lec.userId?.fullName || 'Giảng viên'} ({lec.lecturerCode})
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={
              submitting ||
              thesis.status === 'REJECTED' ||
              !thesis.isCriteriaPassed ||
              thesis.scores?.supervisorScore === null ||
              thesis.scores?.supervisorScore === undefined
            }
            className="px-5 py-2 bg-[#123891] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer"
          >
            {submitting ? 'Đang lưu...' : 'Xác nhận'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignReviewersModal;
