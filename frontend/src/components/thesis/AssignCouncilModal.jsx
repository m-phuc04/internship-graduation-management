import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import lecturerApi from '../../api/lecturerApi';
import notificationApi from '../../api/notificationApi';
import { useToast } from '../../context/ToastContext';
import { AlertCircle, Users, Award, Clock } from 'lucide-react';

const AssignCouncilModal = ({
  isOpen,
  onClose,
  council,
  allCouncils = [],
  theses = [],
  lecturerColumnCount = 2,
  onSaveCouncil,
}) => {
  const [lecturers, setLecturers] = useState([]);
  const [loadingLecturers, setLoadingLecturers] = useState(false);
  const [assignedLecturerIds, setAssignedLecturerIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen && council) {
      setError('');
      const initialIds = Array(lecturerColumnCount).fill('');

      if (Array.isArray(council.lecturers)) {
        council.lecturers.forEach((lec, idx) => {
          if (idx < lecturerColumnCount) {
            initialIds[idx] = lec.lecturerId?._id || lec.lecturerId || lec.id || '';
          }
        });
      }

      setAssignedLecturerIds(initialIds);
      fetchLecturers();
    }
  }, [isOpen, council, lecturerColumnCount]);

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

  // Map lecturers to other councils
  const otherCouncilLecturerMap = React.useMemo(() => {
    const map = new Map();
    if (!council) return map;
    for (const c of allCouncils) {
      if (c.id !== council.id && Array.isArray(c.lecturers)) {
        const cleanCouncilName = (c.name || `Hội đồng ${c.room || ''}`).replace(/\s*\([^)]*\)/g, '').trim();
        for (const l of c.lecturers) {
          const lId = l.lecturerId?._id || l.lecturerId || l.id;
          if (lId) {
            map.set(String(lId), cleanCouncilName);
          }
        }
      }
    }
    return map;
  }, [allCouncils, council]);

  // Map lecturers who are supervisors of theses assigned to THIS council
  const supervisorOfAssignedThesesMap = React.useMemo(() => {
    const map = new Map();
    if (!council || !Array.isArray(theses) || theses.length === 0) return map;

    try {
      // Find all localStorage keys for thesis councils
      let thesisCouncilMap = {};
      for (let i = 0; i < localStorage.length; i++) {
        const k = localStorage.key(i);
        if (k && k.startsWith('tbm_thesis_councils_')) {
          const parsed = JSON.parse(localStorage.getItem(k) || '{}');
          thesisCouncilMap = { ...thesisCouncilMap, ...parsed };
        }
      }

      for (const t of theses) {
        if (thesisCouncilMap[t._id] === council.id) {
          const supId = t.supervisorId?._id || t.supervisorId?.id || t.supervisorId;
          const supCode = t.supervisorId?.lecturerCode;
          if (supId) {
            map.set(String(supId), t.thesisTitle || 'Đề tài đã phân công');
          }
          if (supCode) {
            map.set(String(supCode), t.thesisTitle || 'Đề tài đã phân công');
          }
        }
      }
    } catch {}

    return map;
  }, [council, theses]);

  const handleLecturerChange = (index, value) => {
    setError('');
    const nextIds = [...assignedLecturerIds];
    nextIds[index] = value;
    setAssignedLecturerIds(nextIds);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const filledIds = assignedLecturerIds.filter(Boolean);
    const uniqueIds = new Set(filledIds);
    if (uniqueIds.size !== filledIds.length) {
      setError('Một giảng viên không thể được chọn nhiều lần trong cùng một hội đồng.');
      return;
    }

    for (const id of filledIds) {
      // Check 1: Thuộc hội đồng khác
      if (otherCouncilLecturerMap.has(String(id))) {
        const otherCouncilName = otherCouncilLecturerMap.get(String(id));
        const lecObj = lecturers.find((l) => String(l._id) === String(id));
        const lecName = lecObj ? `${lecObj.academicTitle || ''} ${lecObj.userId?.fullName || 'Giảng viên'}` : 'Giảng viên này';
        setError(`${lecName} đã thuộc ${otherCouncilName}. Mỗi giảng viên chỉ được thuộc 1 hội đồng.`);
        return;
      }

      // Check 2: Là GVHD của đề tài đã phân công vào phòng này
      if (supervisorOfAssignedThesesMap.has(String(id))) {
        const thesisTitle = supervisorOfAssignedThesesMap.get(String(id));
        const lecObj = lecturers.find((l) => String(l._id) === String(id));
        const lecName = lecObj ? `${lecObj.academicTitle || ''} ${lecObj.userId?.fullName || 'Giảng viên'}` : 'Giảng viên này';
        setError(`Không thể phân công ${lecName} vì đang là GVHD của đề tài "${thesisTitle}" đã được xếp vào phòng này!`);
        return;
      }
    }

    setSubmitting(true);
    try {
      const updatedLecturers = [];
      for (let i = 0; i < lecturerColumnCount; i++) {
        const lId = assignedLecturerIds[i];
        if (lId) {
          const foundLec = lecturers.find((l) => String(l._id) === String(lId));
          const oldLecData = Array.isArray(council.lecturers) ? council.lecturers.find((l) => (l.lecturerId?._id || l.lecturerId) === lId) : null;
          updatedLecturers.push({
            lecturerId: lId,
            fullName: foundLec?.userId?.fullName || 'Giảng viên',
            academicTitle: foundLec?.academicTitle || 'ThS.',
            lecturerCode: foundLec?.lecturerCode || '',
            score: oldLecData?.score ?? null,
          });
        }
      }

      const cleanCouncilName = (council.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim();

      onSaveCouncil(council.id, {
        ...council,
        name: cleanCouncilName || council.name,
        lecturers: updatedLecturers,
      });

      // Send notifications (bell icon) to all assigned lecturers
      try {
        filledIds.forEach(async (lId) => {
          const lecObj = lecturers.find((l) => String(l._id) === String(lId));
          const targetUserId = lecObj?.userId?._id || lecObj?.userId || lId;
          const roomText = council.room ? ` (Phòng: ${council.room})` : '';
          const timeText = council.reportTime ? ` - Lịch: ${council.reportTime}` : '';
          try {
            await notificationApi.create({
              recipientId: targetUserId,
              type: 'THESIS',
              title: 'Phân công Hội đồng đánh giá Khóa luận tốt nghiệp',
              message: `Bạn được phân công tham gia ${cleanCouncilName}${roomText}${timeText}. Vui lòng kiểm tra danh sách đề tài và chuẩn bị tham gia đánh giá.`,
              link: '/lecturer/theses?tab=reviewer2',
              priority: 'HIGH',
            });
          } catch (err) {
            console.warn('Failed to send notification to lecturer:', lId, err);
          }
        });
      } catch (notifErr) {
        console.warn('Error creating council assignment notifications:', notifErr);
      }

      showToast(`Đã phân công giảng viên cho ${cleanCouncilName} thành công!`, 'success');
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi lưu phân công hội đồng');
    } finally {
      setSubmitting(false);
    }
  };

  if (!council) return null;

  const displayName = (council.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim();

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phân Công Hội Đồng"
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2 shadow-2xs">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Users className="w-4 h-4 text-[#123891] shrink-0" />
              <strong className="text-slate-900 text-sm font-bold">{displayName}</strong>
            </div>
            <span
              className={`px-2.5 py-0.5 rounded-full text-[10px] font-extrabold border ${
                council.type === 'POSTER'
                  ? 'bg-purple-50 text-purple-700 border-purple-200'
                  : 'bg-blue-50 text-[#102d7d] border-blue-200'
              }`}
            >
              {council.type === 'POSTER' ? 'Báo cáo Poster' : 'Báo cáo Oral'}
            </span>
          </div>

          <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-3 pt-1 border-t border-blue-100/80">
            <span>
              Phòng / Địa điểm: <strong>{council.room || 'Phòng hội đồng'}</strong>
            </span>
            {council.reportTime && (
              <>
                <span>•</span>
                <span className="flex items-center gap-1 font-semibold text-slate-700">
                  <Clock className="w-3.5 h-3.5 text-[#123891]" />
                  <span>Thời gian: {council.reportTime}</span>
                </span>
              </>
            )}
            {council.description && (
              <>
                <span>•</span>
                <span>{council.description}</span>
              </>
            )}
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="block text-xs font-bold text-slate-800 uppercase tracking-wide">
              Phân công giảng viên hội đồng
            </label>
            <span className="text-[11px] text-slate-500 font-medium">
              Số lượng: <strong>{lecturerColumnCount} giảng viên</strong>
            </span>
          </div>

          {Array.from({ length: lecturerColumnCount }).map((_, idx) => {
            const currentSelectedId = assignedLecturerIds[idx] || '';

            return (
              <div
                key={idx}
                className="p-3.5 rounded-2xl border border-slate-200 bg-slate-50/60 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-[#123891]" />
                    <span>Giảng viên {idx + 1}</span>
                  </label>
                  {currentSelectedId && (
                    <span className="text-[10px] text-emerald-700 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                      Đã chọn
                    </span>
                  )}
                </div>

                <div>
                  <select
                    value={currentSelectedId}
                    onChange={(e) => handleLecturerChange(idx, e.target.value)}
                    disabled={loadingLecturers}
                    className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                  >
                    <option value="">-- Chọn giảng viên {idx + 1} --</option>
                    {lecturers.map((lec) => {
                      const lecIdStr = String(lec._id);
                      const isAssignedToOther = otherCouncilLecturerMap.has(lecIdStr);
                      const otherCouncilName = isAssignedToOther ? otherCouncilLecturerMap.get(lecIdStr) : '';
                      const isSelectedInThisModal = assignedLecturerIds.some(
                        (id, i) => i !== idx && String(id) === lecIdStr
                      );
                      const isSupervisorOfAssignedThesis = supervisorOfAssignedThesesMap.has(lecIdStr) || (lec.lecturerCode && supervisorOfAssignedThesesMap.has(lec.lecturerCode));
                      const assignedThesisTitle = isSupervisorOfAssignedThesis
                        ? (supervisorOfAssignedThesesMap.get(lecIdStr) || supervisorOfAssignedThesesMap.get(lec.lecturerCode))
                        : '';

                      const disabled = isAssignedToOther || isSelectedInThisModal || isSupervisorOfAssignedThesis;

                      const title = lec.academicTitle ? `${lec.academicTitle} ` : '';
                      const name = lec.userId?.fullName || 'Giảng viên';
                      const code = lec.lecturerCode ? ` (${lec.lecturerCode})` : '';
                      const suffix = isAssignedToOther || isSelectedInThisModal
                        ? ' - (Đã có phòng)'
                        : '';

                      return (
                        <option
                          key={lec._id}
                          value={lec._id}
                          disabled={disabled}
                          className={disabled ? 'text-slate-400 bg-slate-100' : 'text-slate-900'}
                        >
                          {title}{name}{code}{suffix}
                        </option>
                      );
                    })}
                  </select>
                </div>
              </div>
            );
          })}
        </div>

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
            className="px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition disabled:opacity-50 cursor-pointer"
          >
            {submitting ? 'Đang lưu...' : 'Xác nhận'}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignCouncilModal;
