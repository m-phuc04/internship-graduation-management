import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import notificationApi from '../../api/notificationApi';
import { isCouncilReportTimeExpired } from '../../utils/dateUtils';
import { BookOpen, Users, Clock, Check, AlertCircle, Sparkles } from 'lucide-react';

const AssignCouncilToThesisModal = ({
  isOpen,
  onClose,
  thesis,
  councils = [],
  currentCouncilId = '',
  reportFormat = 'POSTER', // 'ORAL' | 'POSTER'
  onAssignCouncil,
}) => {
  const [selectedCouncilId, setSelectedCouncilId] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const { showToast } = useToast();

  // Helper check if thesis supervisor is in council
  const isSupervisorInCouncil = (councilObj) => {
    if (!councilObj || !Array.isArray(councilObj.lecturers) || !thesis?.supervisorId) return false;
    const supId = String(thesis.supervisorId?._id || thesis.supervisorId?.id || thesis.supervisorId || '');
    const supCode = thesis.supervisorId?.lecturerCode;
    return councilObj.lecturers.some((l) => {
      const lId = String(l.lecturerId?._id || l.lecturerId || l.id || l._id || '');
      const lCode = l.lecturerCode;
      return (supId && lId && lId === supId) || (supCode && lCode && lCode === supCode);
    });
  };

  // Helper check if council has any lecturers assigned
  const hasLecturersAssigned = (councilObj) => {
    if (!councilObj || !Array.isArray(councilObj.lecturers) || councilObj.lecturers.length === 0) return false;
    return councilObj.lecturers.some((l) => !!(l.lecturerId?._id || l.lecturerId || l.id || l._id || l.fullName));
  };

  const supervisorName = `${thesis?.supervisorId?.academicTitle ? thesis.supervisorId.academicTitle + ' ' : ''}${thesis?.supervisorId?.userId?.fullName || 'GVHD'}`;

  useEffect(() => {
    if (isOpen) {
      setError('');
      const initialId = currentCouncilId || '';
      if (initialId) {
        const found = councils.find((c) => (c.id || c._id) === initialId || String(c.id || c._id) === String(initialId));
        if (found) {
          const hasLecturers = hasLecturersAssigned(found);
          const hasSupConflict = isSupervisorInCouncil(found);
          const isTypeMismatch = found.type !== reportFormat;
          const isExpired = isCouncilReportTimeExpired(found);

          if (isExpired) {
            setError(
              `Phòng "${(found.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim()}" đã kết thúc thời gian báo cáo.`
            );
            setSelectedCouncilId('');
            return;
          }
          if (!hasLecturers) {
            setError(
              `Phòng "${(found.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim()}" chưa được phân công giảng viên hội đồng. Vui lòng phân công giảng viên trước!`
            );
            setSelectedCouncilId('');
            return;
          }
          if (hasSupConflict) {
            setError(
              `Phòng "${(found.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim()}" có GVHD làm thành viên. Không thể phân công, vui lòng chọn phòng khác!`
            );
            setSelectedCouncilId('');
            return;
          }
          if (isTypeMismatch) {
            setError(
              `Phòng "${(found.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim()}" (${found.type === 'ORAL' ? 'Oral' : 'Poster'}) không khớp với hình thức ${reportFormat === 'ORAL' ? 'Báo cáo Oral' : 'Báo cáo Poster'} của đề tài. Vui lòng chọn phòng khác!`
            );
            setSelectedCouncilId('');
            return;
          }
        }
      }
      setSelectedCouncilId(initialId);
    }
  }, [isOpen, currentCouncilId, reportFormat, thesis]);

  if (!thesis) return null;

  const selectedCouncil = councils.find((c) => (c.id || c._id) === selectedCouncilId || String(c.id || c._id) === String(selectedCouncilId));

  const handleSelectCouncil = (councilId) => {
    setError('');
    if (!councilId) {
      setSelectedCouncilId('');
      return;
    }

    const found = councils.find((c) => (c.id || c._id) === councilId || String(c.id || c._id) === String(councilId));
    if (!found) {
      setSelectedCouncilId('');
      return;
    }

    const cleanName = (found.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim();

    // 0. Kiểm tra phòng đã kết thúc thời gian báo cáo chưa
    if (isCouncilReportTimeExpired(found)) {
      const errorMsg = `Phòng "${cleanName}" đã kết thúc thời gian báo cáo! Không thể phân công đề tài vào phòng này.`;
      setError(errorMsg);
      showToast(errorMsg, 'error');
      setSelectedCouncilId('');
      return;
    }

    // 1. Kiểm tra phòng đã phân công giảng viên chưa
    if (!hasLecturersAssigned(found)) {
      const errorMsg = `Phòng "${cleanName}" chưa được phân công giảng viên hội đồng! Vui lòng phân công giảng viên cho hội đồng trước khi gán đề tài.`;
      setError(errorMsg);
      showToast(errorMsg, 'error');
      setSelectedCouncilId('');
      return;
    }

    // 2. Kiểm tra hình thức báo cáo (Oral vs Poster) ngay lập tức
    if (found.type !== reportFormat) {
      const reqText = reportFormat === 'ORAL' ? 'Báo cáo Oral' : 'Báo cáo Poster';
      const cTypeText = found.type === 'ORAL' ? 'Oral' : 'Poster';
      const errorMsg = `Đề tài này có hình thức ${reqText}, không thể chọn phòng ${cleanName} (Phòng ${cTypeText})! Vui lòng chọn đúng phòng ${reqText}.`;
      setError(errorMsg);
      showToast(errorMsg, 'error');
      setSelectedCouncilId('');
      return;
    }

    // 3. Kiểm tra GVHD trong hội đồng ngay lập tức
    if (isSupervisorInCouncil(found)) {
      const errorMsg = `Phòng ${cleanName} có GVHD (${supervisorName}) làm thành viên hội đồng. Theo quy định, không thể chọn phòng này!`;
      setError(errorMsg);
      showToast(errorMsg, 'error');
      setSelectedCouncilId('');
      return;
    }

    setSelectedCouncilId(councilId);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (selectedCouncilId) {
      const found = councils.find((c) => (c.id || c._id) === selectedCouncilId || String(c.id || c._id) === String(selectedCouncilId));
      if (found) {
        const cleanName = (found.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim();
        if (isCouncilReportTimeExpired(found)) {
          const errorMsg = `Phòng "${cleanName}" đã kết thúc thời gian báo cáo!`;
          setError(errorMsg);
          showToast(errorMsg, 'error');
          return;
        }
        if (!hasLecturersAssigned(found)) {
          const errorMsg = `Phòng "${cleanName}" chưa được phân công giảng viên hội đồng!`;
          setError(errorMsg);
          showToast(errorMsg, 'error');
          return;
        }
        if (found.type !== reportFormat) {
          const reqText = reportFormat === 'ORAL' ? 'Báo cáo Oral' : 'Báo cáo Poster';
          const errorMsg = `Đề tài này có hình thức ${reqText}, không thể chọn phòng ${cleanName} (${found.type})!`;
          setError(errorMsg);
          showToast(errorMsg, 'error');
          return;
        }
        if (isSupervisorInCouncil(found)) {
          const errorMsg = `Phòng ${cleanName} có GVHD (${supervisorName}) làm thành viên hội đồng!`;
          setError(errorMsg);
          showToast(errorMsg, 'error');
          return;
        }
      }
    }

    setSubmitting(true);
    try {
      onAssignCouncil(thesis._id, selectedCouncilId);
      if (selectedCouncil) {
        const cleanName = (selectedCouncil.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim();
        showToast(`Đã phân công đề tài "${thesis.thesisTitle}" vào ${cleanName} (Phòng ${selectedCouncil.room}) thành công!`, 'success');

        // Send notifications to council lecturers
        try {
          if (Array.isArray(selectedCouncil.lecturers)) {
            selectedCouncil.lecturers.forEach(async (l) => {
              const targetUserId = l.userId?._id || l.userId || l.lecturerId?._id || l.lecturerId || l.id || l._id;
              if (targetUserId) {
                try {
                  await notificationApi.create({
                    recipientId: targetUserId,
                    type: 'THESIS',
                    title: 'Đề tài mới được phân công vào Hội đồng',
                    message: `Đề tài "${thesis.thesisTitle}" đã được phân công vào ${cleanName} (Phòng ${selectedCouncil.room || 'P.HĐ'}). Vui lòng xem danh sách đề tài.`,
                    link: '/lecturer/theses?tab=reviewer2',
                    priority: 'NORMAL',
                  });
                } catch (e) {}
              }
            });
          }

          // Also notify supervisor
          const supUserId = thesis.supervisorId?.userId?._id || thesis.supervisorId?.userId || thesis.supervisorId?._id || thesis.supervisorId;
          if (supUserId) {
            try {
              await notificationApi.create({
                recipientId: supUserId,
                type: 'THESIS',
                title: 'Đề tài hướng dẫn đã được phân công Hội đồng',
                message: `Đề tài "${thesis.thesisTitle}" của bạn đã được phân công vào ${cleanName} (Phòng ${selectedCouncil.room || 'P.HĐ'}).`,
                link: '/lecturer/theses?tab=supervisor',
                priority: 'NORMAL',
              });
            } catch (e) {}
          }
        } catch (notifErr) {
          console.warn('Notification error on council thesis assign:', notifErr);
        }
      } else {
        showToast(`Đã bỏ phân công phòng hội đồng cho đề tài "${thesis.thesisTitle}"!`, 'info');
      }
      onClose();
    } catch (err) {
      showToast(err.message || 'Lỗi khi phân công phòng hội đồng', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phân Công Phòng Hội Đồng Cho Đề Tài"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Thesis Info Box */}
        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2 shadow-2xs">
          <div className="flex items-start gap-2.5">
            <div className="w-8 h-8 rounded-xl bg-[#123891] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold">
              <BookOpen className="w-4 h-4" />
            </div>
            <div className="min-w-0 flex-1">
              <h4 className="font-bold text-slate-900 text-sm leading-snug">
                {thesis.thesisTitle}
              </h4>
              <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                <div>
                  <strong>SV1:</strong> {thesis.studentId?.userId?.fullName} ({thesis.studentId?.studentCode})
                  {thesis.secondStudentId && (
                    <> • <strong>SV2:</strong> {thesis.secondStudentId?.userId?.fullName} ({thesis.secondStudentId?.studentCode})</>
                  )}
                </div>
                <div>
                  <strong>GVHD:</strong> <span className="font-bold text-slate-900">{supervisorName}</span> ({thesis.supervisorId?.lecturerCode || 'Mã GV'})
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Required Report Format Badge Banner */}
        <div
          className={`p-3 rounded-2xl border flex items-center gap-2.5 ${
            reportFormat === 'ORAL'
              ? 'bg-blue-50/90 border-blue-200 text-[#102d7d]'
              : 'bg-blue-50/90 border-blue-200 text-[#0d2a75]'
          }`}
        >
          <Sparkles className="w-4 h-4 shrink-0" />
          <span className="font-bold text-xs">Hình thức báo cáo quy định:</span>
          <span
            className={`px-2.5 py-0.5 rounded-full text-xs font-extrabold border ${
              reportFormat === 'ORAL'
                ? 'bg-white text-[#102d7d] border-blue-300 shadow-2xs'
                : 'bg-white text-[#102d7d] border-blue-300 shadow-2xs'
            }`}
          >
            {reportFormat === 'ORAL' ? 'Báo cáo Oral' : 'Báo cáo Poster'}
          </span>
        </div>

        {/* Immediate Error Message */}
        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-start gap-2 animate-in fade-in duration-200">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600 mt-0.5" />
            <span className="font-medium leading-relaxed">{error}</span>
          </div>
        )}

        {/* Council Selection */}
        <div className="space-y-2">
          <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
            Chọn phòng hội đồng bảo vệ
          </label>
          <select
            value={selectedCouncilId}
            onChange={(e) => handleSelectCouncil(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
          >
            <option value="">Chưa phân công</option>
            {councils.map((c, idx) => {
              const cid = c.id || c._id || `council-${idx}`;
              const cleanName = (c.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim();
              const typeText = c.type === 'POSTER' ? 'Báo cáo Poster' : 'Báo cáo Oral';
              const timeText = c.reportTime ? ` • ${c.reportTime}` : '';

              const hasLecturers = hasLecturersAssigned(c);
              const hasSup = isSupervisorInCouncil(c);
              const isMismatch = c.type !== reportFormat;
              const isExpired = isCouncilReportTimeExpired(c);
              const isDisabled = !hasLecturers || hasSup || isMismatch || isExpired;

              return (
                <option
                  key={cid}
                  value={cid}
                  disabled={isDisabled}
                  className={isDisabled ? 'text-slate-400 bg-slate-100 font-normal' : 'text-slate-900 font-semibold'}
                >
                  {cleanName} (Phòng {c.room || '—'}) - {typeText}{timeText}{isExpired ? ' (Đã kết thúc)' : ''}
                </option>
              );
            })}
          </select>
        </div>

        {/* Selected Council Summary Preview */}
        {selectedCouncil && (
          <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-2xl space-y-2">
            <div className="flex items-center justify-between">
              <span className="font-bold text-slate-900 text-xs">
                {(selectedCouncil.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim()}
              </span>
              <span
                className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                  selectedCouncil.type === 'POSTER'
                    ? 'bg-blue-50 text-[#102d7d] border-blue-200'
                    : 'bg-blue-50 text-[#102d7d] border-blue-200'
                }`}
              >
                {selectedCouncil.type === 'POSTER' ? 'Báo cáo Poster' : 'Báo cáo Oral'}
              </span>
            </div>

            <div className="text-[11px] text-slate-600 space-y-1 pt-1 border-t border-slate-200/60">
              <div>Phòng / Địa điểm: <strong>{selectedCouncil.room}</strong></div>
              {selectedCouncil.reportTime && (
                <div className="flex items-center gap-1 font-semibold text-[#123891]">
                  <Clock className="w-3.5 h-3.5" />
                  <span>Thời gian: {selectedCouncil.reportTime}</span>
                </div>
              )}
              {selectedCouncil.lecturers?.length > 0 && (
                <div>
                  <strong>Giảng viên hội đồng ({selectedCouncil.lecturers.length} GV):</strong>{' '}
                  <span className="text-slate-800 font-medium">
                    {selectedCouncil.lecturers.map((l) => `${l.academicTitle ? l.academicTitle + ' ' : ''}${l.fullName}`).join(', ')}
                  </span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Modal Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-100 transition disabled:opacity-50 cursor-pointer flex items-center gap-1.5"
          >
            <Check className="w-3.5 h-3.5" />
            <span>Xác nhận</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignCouncilToThesisModal;
