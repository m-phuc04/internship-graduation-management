import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import councilApi from '../../api/councilApi';
import { isCouncilReportTimeExpired } from '../../utils/dateUtils';
import {
  Users,
  Search,
  Check,
  AlertCircle,
  AlertTriangle,
  Clock,
  MapPin,
  Sparkles,
  Info,
  ShieldAlert,
  GraduationCap,
} from 'lucide-react';

const AssignThesesToCouncilModal = ({
  isOpen,
  onClose,
  council,
  theses = [],
  thesisCouncilMap = {},
  thesisReportFormatMap = {},
  allCouncils = [],
  onAssignSuccess,
}) => {
  const { showToast } = useToast();
  const [selectedThesisIds, setSelectedThesisIds] = useState([]);
  const [initialSelectedIds, setInitialSelectedIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeTab, setActiveTab] = useState('ALL'); // 'ALL' | 'ASSIGNED' | 'UNASSIGNED'
  const [submitting, setSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const councilIdStr = council ? String(council._id || council.id || '') : '';
  const councilType = council?.type || 'POSTER';
  const cleanCouncilName = (council?.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim();

  // Helper check if thesis supervisor is in council
  const isSupervisorInCouncil = (thesis) => {
    if (!council || !Array.isArray(council.lecturers) || !thesis?.supervisorId) return false;
    const supId = String(thesis.supervisorId?._id || thesis.supervisorId?.id || thesis.supervisorId || '');
    const supCode = thesis.supervisorId?.lecturerCode;
    return council.lecturers.some((l) => {
      const lId = String(l.lecturerId?._id || l.lecturerId?.id || l.lecturerId || l.id || l._id || '');
      const lCode = l.lecturerCode || l.lecturerId?.lecturerCode;
      return (supId && lId && lId === supId) || (supCode && lCode && lCode === supCode);
    });
  };

  // Helper get thesis supervisor full name
  const getSupervisorName = (thesis) => {
    const title = thesis?.supervisorId?.academicTitle ? `${thesis.supervisorId.academicTitle} ` : '';
    const name = thesis?.supervisorId?.userId?.fullName || thesis?.supervisorName || 'Chưa có GVHD';
    return `${title}${name}`.trim();
  };

  // Sync selected theses when modal opens or council changes
  useEffect(() => {
    if (isOpen && council) {
      setErrorMsg('');
      setSearchQuery('');
      setActiveTab('ALL');

      const preSelected = [];
      theses.forEach((t) => {
        const assignedId = String(
          thesisCouncilMap[t._id] ||
          (t.councilId?._id ? t.councilId._id : t.councilId) ||
          ''
        );
        if (assignedId && assignedId === councilIdStr) {
          preSelected.push(t._id);
        }
      });

      setSelectedThesisIds(preSelected);
      setInitialSelectedIds(preSelected);
    }
  }, [isOpen, council, councilIdStr, theses, thesisCouncilMap]);

  // Filter eligible theses matching council type
  const formatEligibleTheses = useMemo(() => {
    return theses.filter((t) => {
      const format = thesisReportFormatMap[t._id] || 'POSTER';
      return format === councilType;
    });
  }, [theses, thesisReportFormatMap, councilType]);

  // Tab counts
  const assignedToThisCount = useMemo(() => {
    return formatEligibleTheses.filter((t) => selectedThesisIds.includes(t._id)).length;
  }, [formatEligibleTheses, selectedThesisIds]);

  const unassignedCount = useMemo(() => {
    return formatEligibleTheses.filter((t) => {
      const assignedId = String(
        thesisCouncilMap[t._id] ||
        (t.councilId?._id ? t.councilId._id : t.councilId) ||
        ''
      );
      return !assignedId && !selectedThesisIds.includes(t._id);
    }).length;
  }, [formatEligibleTheses, thesisCouncilMap, selectedThesisIds]);

  // Filtered list based on search and tab
  const displayedTheses = useMemo(() => {
    return formatEligibleTheses.filter((t) => {
      const isSelected = selectedThesisIds.includes(t._id);
      const rawAssignedId = String(
        thesisCouncilMap[t._id] ||
        (t.councilId?._id ? t.councilId._id : t.councilId) ||
        ''
      );

      // Filter by tab
      if (activeTab === 'ASSIGNED' && !isSelected) return false;
      if (activeTab === 'UNASSIGNED') {
        if (isSelected || Boolean(rawAssignedId)) return false;
      }

      // Filter by search query
      if (searchQuery.trim()) {
        const q = searchQuery.toLowerCase().trim();
        const title = (t.thesisTitle || t.topicName || t.title || '').toLowerCase();
        const st1Name = (t.student1Name || t.student1Id?.fullName || '').toLowerCase();
        const st1Code = (t.student1Code || t.student1Id?.studentCode || '').toLowerCase();
        const st2Name = (t.student2Name || t.student2Id?.fullName || '').toLowerCase();
        const st2Code = (t.student2Code || t.student2Id?.studentCode || '').toLowerCase();
        const supName = getSupervisorName(t).toLowerCase();

        return (
          title.includes(q) ||
          st1Name.includes(q) ||
          st1Code.includes(q) ||
          st2Name.includes(q) ||
          st2Code.includes(q) ||
          supName.includes(q)
        );
      }

      return true;
    });
  }, [formatEligibleTheses, selectedThesisIds, thesisCouncilMap, activeTab, searchQuery]);

  if (!council) return null;

  const isExpired = isCouncilReportTimeExpired(council);

  const handleToggleThesis = (thesis) => {
    if (isExpired) return;
    setErrorMsg('');

    const tid = thesis._id;
    const isCurrentlySelected = selectedThesisIds.includes(tid);

    if (isCurrentlySelected) {
      // Uncheck
      setSelectedThesisIds((prev) => prev.filter((id) => id !== tid));
    } else {
      // Check limits and rules
      // 1. Max 5 theses rule
      if (selectedThesisIds.length >= 5) {
        setErrorMsg('Phòng hội đồng chỉ được phép chứa tối đa 5 đề tài! Hãy bỏ chọn một đề tài trước.');
        showToast('Mỗi phòng hội đồng chỉ được phép chứa tối đa 5 đề tài!', 'warning');
        return;
      }

      // 2. Supervisor conflict rule
      if (isSupervisorInCouncil(thesis)) {
        setErrorMsg(
          `Đề tài "${thesis.thesisTitle}" có GVHD (${getSupervisorName(thesis)}) là thành viên hội đồng ${cleanCouncilName}. Không thể chọn!`
        );
        showToast('GVHD của đề tài không được trùng với giảng viên trong hội đồng!', 'error');
        return;
      }

      setSelectedThesisIds((prev) => [...prev, tid]);
    }
  };

  const handleSave = async () => {
    if (isExpired) {
      showToast('Phòng hội đồng đã kết thúc thời gian báo cáo, không thể thay đổi!', 'error');
      return;
    }

    if (selectedThesisIds.length > 5) {
      showToast('Phòng hội đồng chỉ được chứa tối đa 5 đề tài!', 'error');
      return;
    }

    setSubmitting(true);
    setErrorMsg('');

    try {
      await councilApi.batchAssignTheses({
        councilId: council._id || council.id,
        thesisIds: selectedThesisIds,
      });

      showToast(`Đã lưu phân công ${selectedThesisIds.length} đề tài vào ${cleanCouncilName} thành công!`, 'success');

      if (onAssignSuccess) {
        await onAssignSuccess(council._id || council.id, selectedThesisIds);
      }

      onClose();
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Lỗi khi lưu phân công đề tài vào hội đồng';
      setErrorMsg(msg);
      showToast(msg, 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title=""
      size="2xl"
    >
      <div className="space-y-4">
        {/* Header Banner */}
        <div className="bg-gradient-to-br from-[#123891]/5 via-[#123891]/10 to-blue-50 border border-blue-200/80 p-4 rounded-2xl">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-[#123891] to-[#1B4DA1] text-white flex items-center justify-center font-bold shadow-sm shadow-blue-200 shrink-0">
                <Users className="w-5 h-5" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-base font-bold text-slate-900 leading-tight">
                    {cleanCouncilName}
                  </h3>
                  <span
                    className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                      councilType === 'ORAL'
                        ? 'bg-blue-50 text-[#102d7d] border-blue-200'
                        : 'bg-indigo-50 text-indigo-700 border-indigo-200'
                    }`}
                  >
                    {councilType === 'ORAL' ? 'Báo cáo Oral' : 'Báo cáo Poster'}
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-3 text-xs text-slate-500 mt-1 font-medium">
                  {council.room && (
                    <span className="flex items-center gap-1">
                      <MapPin className="w-3.5 h-3.5 text-slate-400" />
                      Phòng: <span className="font-semibold text-slate-700">{council.room}</span>
                    </span>
                  )}
                  {council.reportTime && (
                    <span className="flex items-center gap-1">
                      <Clock className="w-3.5 h-3.5 text-slate-400" />
                      {council.reportTime}
                    </span>
                  )}
                </div>
              </div>
            </div>

            {/* Quota Counter */}
            <div className="flex items-center sm:justify-end">
              <div
                className={`px-3.5 py-2 rounded-xl border flex items-center gap-2 ${
                  selectedThesisIds.length === 5
                    ? 'bg-amber-50 border-amber-300 text-amber-800'
                    : selectedThesisIds.length > 0
                    ? 'bg-blue-50 border-blue-200 text-[#123891]'
                    : 'bg-white border-slate-200 text-slate-600'
                }`}
              >
                <GraduationCap className="w-4 h-4 shrink-0" />
                <span className="text-xs font-bold">
                  {selectedThesisIds.length} / 5 đề tài
                </span>
                {selectedThesisIds.length === 5 && (
                  <span className="text-[10px] font-bold px-1.5 py-0.5 bg-amber-200 text-amber-900 rounded-md">
                    Đã đủ
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Council Lecturers List */}
          {council.lecturers && council.lecturers.length > 0 && (
            <div className="mt-3 pt-3 border-t border-blue-100 flex flex-wrap items-center gap-2 text-xs">
              <span className="font-semibold text-slate-600">Thành viên hội đồng:</span>
              {council.lecturers.map((l, i) => (
                <span
                  key={l.lecturerId?._id || l.lecturerId || i}
                  className="inline-flex items-center px-2 py-0.5 rounded-md bg-white/80 border border-blue-200 text-slate-700 font-medium"
                >
                  {l.fullName || l.lecturerId?.userId?.fullName || `Giảng viên ${i + 1}`}
                </span>
              ))}
            </div>
          )}
        </div>

        {/* Error / Alert Message */}
        {errorMsg && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 flex items-start gap-2 text-xs text-rose-700">
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-rose-600" />
            <span className="font-medium">{errorMsg}</span>
          </div>
        )}

        {/* Search & Tabs Toolbar */}
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          {/* Tabs */}
          <div className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl w-full sm:w-auto">
            <button
              type="button"
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Tất cả phù hợp ({formatEligibleTheses.length})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('ASSIGNED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'ASSIGNED'
                  ? 'bg-white text-[#123891] shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Đã chọn ({assignedToThisCount})
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('UNASSIGNED')}
              className={`px-3 py-1.5 rounded-lg text-xs font-bold transition cursor-pointer ${
                activeTab === 'UNASSIGNED'
                  ? 'bg-white text-slate-900 shadow-2xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Chưa phân công ({unassignedCount})
            </button>
          </div>

          {/* Search Box */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Tìm đề tài, sinh viên, GVHD..."
              className="w-full pl-9 pr-3 py-1.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] focus:bg-white transition"
            />
          </div>
        </div>

        {/* Theses List */}
        <div className="border border-slate-200/80 rounded-2xl overflow-hidden max-h-[380px] overflow-y-auto divide-y divide-slate-100">
          {displayedTheses.length === 0 ? (
            <div className="p-8 text-center space-y-2">
              <GraduationCap className="w-8 h-8 text-slate-300 mx-auto" />
              <div className="text-xs font-bold text-slate-600">Không tìm thấy đề tài nào</div>
              <p className="text-[11px] text-slate-400">
                {activeTab === 'ASSIGNED'
                  ? 'Chưa có đề tài nào được chọn cho phòng hội đồng này.'
                  : activeTab === 'UNASSIGNED'
                  ? 'Tất cả đề tài phù hợp đã được phân công vào các phòng hội đồng.'
                  : 'Không có đề tài nào phù hợp với bộ lọc hoặc từ khóa tìm kiếm.'}
              </p>
            </div>
          ) : (
            displayedTheses.map((thesis) => {
              const isSelected = selectedThesisIds.includes(thesis._id);
              const supConflict = isSupervisorInCouncil(thesis);
              const supervisorName = getSupervisorName(thesis);

              // Check current assigned council
              const rawAssignedId = String(
                thesisCouncilMap[thesis._id] ||
                (thesis.councilId?._id ? thesis.councilId._id : thesis.councilId) ||
                ''
              );
              const assignedToOther = Boolean(rawAssignedId) && rawAssignedId !== councilIdStr;
              const otherCouncil = assignedToOther
                ? allCouncils.find(
                    (c) => String(c._id || c.id) === rawAssignedId
                  )
                : null;
              const otherCouncilName = otherCouncil
                ? (otherCouncil.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim()
                : 'phòng khác';

              // Disabled if:
              // 1. Not currently selected AND quota reaches 5
              // 2. Supervisor conflict with this council
              const isReachedLimit = !isSelected && selectedThesisIds.length >= 5;
              const isDisabled = isExpired || supConflict || isReachedLimit;

              return (
                <div
                  key={thesis._id}
                  onClick={() => !isDisabled && handleToggleThesis(thesis)}
                  className={`p-3.5 transition flex items-start gap-3 select-none ${
                    isDisabled
                      ? 'bg-slate-50/60 opacity-60 cursor-not-allowed'
                      : isSelected
                      ? 'bg-blue-50/40 hover:bg-blue-50/70 cursor-pointer'
                      : 'hover:bg-slate-50/80 cursor-pointer'
                  }`}
                >
                  {/* Checkbox */}
                  <div className="pt-0.5 shrink-0">
                    <div
                      className={`w-4 h-4 rounded-md border flex items-center justify-center transition ${
                        isSelected
                          ? 'bg-[#123891] border-[#123891] text-white'
                          : supConflict
                          ? 'border-rose-300 bg-rose-50'
                          : 'border-slate-300 bg-white'
                      }`}
                    >
                      {isSelected && <Check className="w-3 h-3 stroke-[3]" />}
                    </div>
                  </div>

                  {/* Thesis Details */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-start justify-between gap-2">
                      <h4 className="text-xs font-bold text-slate-900 leading-snug">
                        {thesis.thesisTitle || thesis.topicName || thesis.title || 'Đề tài Khóa luận'}
                      </h4>

                      {/* Status Tags */}
                      <div className="flex items-center gap-1 shrink-0">
                        {isSelected ? (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200">
                            Đã chọn
                          </span>
                        ) : assignedToOther ? (
                          <span
                            className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-amber-50 text-amber-700 border border-amber-200"
                            title={`Đề tài đang ở ${otherCouncilName}. Tích chọn để chuyển sang phòng này.`}
                          >
                            Đang ở {otherCouncilName}
                          </span>
                        ) : (
                          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-medium bg-slate-100 text-slate-500 border border-slate-200">
                            Chưa phân công
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Metadata Row */}
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                      <span>
                        Sinh viên:{' '}
                        <span className="font-semibold text-slate-700">
                          {thesis.student1Name || thesis.student1Id?.fullName}
                          {thesis.student1Code || thesis.student1Id?.studentCode
                            ? ` (${thesis.student1Code || thesis.student1Id?.studentCode})`
                            : ''}
                          {thesis.student2Name
                            ? `, ${thesis.student2Name} (${thesis.student2Code || ''})`
                            : ''}
                        </span>
                      </span>

                      <span>•</span>

                      <span>
                        GVHD:{' '}
                        <span
                          className={`font-semibold ${
                            supConflict ? 'text-rose-600 underline' : 'text-slate-700'
                          }`}
                        >
                          {supervisorName}
                        </span>
                      </span>
                    </div>

                    {/* Conflict or Limit Warning */}
                    {supConflict && (
                      <div className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-600 bg-rose-50 px-2 py-0.5 rounded-md border border-rose-200">
                        <ShieldAlert className="w-3 h-3 text-rose-500 shrink-0" />
                        <span>GVHD là thành viên hội đồng này (Xung đột quyền lợi - Không thể chọn)</span>
                      </div>
                    )}
                    {isReachedLimit && !supConflict && (
                      <div className="text-[11px] text-amber-600 italic">
                        Phòng hội đồng đã đủ 5 đề tài. Bỏ chọn bớt đề tài để chọn đề tài này.
                      </div>
                    )}
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Info & Actions */}
        <div className="pt-2 flex flex-col sm:flex-row items-center justify-between gap-3 border-t border-slate-100">
          <div className="text-[11px] text-slate-400 flex items-center gap-1.5">
            <Info className="w-3.5 h-3.5 text-blue-500 shrink-0" />
            <span>
              Mỗi phòng hội đồng chứa tối đa 5 đề tài. GVHD không được là thành viên hội đồng.
            </span>
          </div>

          <div className="flex items-center gap-2 w-full sm:w-auto justify-end">
            <button
              type="button"
              onClick={onClose}
              disabled={submitting}
              className="px-4 py-2 rounded-xl text-xs font-bold text-slate-600 hover:bg-slate-100 transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="button"
              onClick={handleSave}
              disabled={submitting || isExpired}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <>
                  <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-3.5 h-3.5" />
                  <span>Lưu phân công ({selectedThesisIds.length})</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>
    </Modal>
  );
};

export default AssignThesesToCouncilModal;
