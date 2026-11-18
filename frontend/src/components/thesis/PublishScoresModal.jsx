import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { Send, Check, BookOpen, Paperclip, AlertCircle, GraduationCap, ExternalLink } from 'lucide-react';

const PublishScoresModal = ({
  isOpen,
  onClose,
  isAll = false,
  theses = [],
  thesesCount = 0,
  submissionCounts = {},
  getThesisScoreInfo = null,
  batchScoreAvailability = null,
  thesis = null,
  scoreInfo = null,
  publishedScores = {},
  onPublishScores,
  onViewDetails = null,
}) => {
  const { showToast } = useToast();

  const [selectedScores, setSelectedScores] = useState({
    supervisorScore: false,
    reviewer1Score: false,
    councilScore: false,
    finalScore: false,
  });

  const [selectedThesisIds, setSelectedThesisIds] = useState([]);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Confirm dialog state for checking 0-file thesis
  const [zeroFileConfirmOpen, setZeroFileConfirmOpen] = useState(false);
  const [pendingZeroFileThesis, setPendingZeroFileThesis] = useState(null);

  const totalTheses = theses?.length || thesesCount || 0;
  const hdAvail = batchScoreAvailability?.supervisorScore || { hasAll: false, count: 0, total: totalTheses };
  const pb1Avail = batchScoreAvailability?.reviewer1Score || { hasAll: false, count: 0, total: totalTheses };
  const councilAvail = batchScoreAvailability?.councilScore || { hasAll: false, count: 0, total: totalTheses };
  const finalAvail = batchScoreAvailability?.finalScore || { hasAll: false, count: 0, total: totalTheses };

  // Helper to get total submitted files for a thesis
  const getThesisFileCount = (item) => {
    if (!item) return 0;
    if (submissionCounts && typeof submissionCounts[item._id] === 'number') {
      return submissionCounts[item._id];
    }
    if (Array.isArray(item.submittedFiles)) return item.submittedFiles.length;
    if (Array.isArray(item.submissions)) return item.submissions.length;
    if (Array.isArray(item.documents)) return item.documents.length;
    if (Array.isArray(item.submittedReports)) return item.submittedReports.length;
    return 0;
  };

  // Helper to check if a specific thesis has score for a category
  const checkThesisHasCategoryScore = (item, categoryKey) => {
    if (!item) return false;
    const isGroup = item.studentCount === 2 && Boolean(item.secondStudentId);
    const info1 = getThesisScoreInfo ? getThesisScoreInfo(item, 1) : null;
    const info2 = isGroup && getThesisScoreInfo ? getThesisScoreInfo(item, 2) : null;

    if (!info1) {
      const s = item.scores || {};
      if (categoryKey === 'supervisorScore') return Boolean(s.supervisorScore !== null && s.supervisorScore !== undefined);
      if (categoryKey === 'reviewer1Score') return Boolean(s.reviewer1Score !== null && s.reviewer1Score !== undefined);
      if (categoryKey === 'councilScore') return Boolean(s.councilScore !== null && s.councilScore !== undefined);
      if (categoryKey === 'finalScore') return Boolean(s.finalScore !== null && s.finalScore !== undefined);
      return false;
    }

    if (categoryKey === 'supervisorScore') {
      const hd1Done = Boolean(info1.hasHD || info1.isHDFailMarked || info1.isFailed);
      const hd2Done = !isGroup || Boolean(info2?.hasHD || info2?.isHDFailMarked || info2?.isFailed);
      return hd1Done && hd2Done;
    }

    if (categoryKey === 'reviewer1Score') {
      const pb1Done = Boolean(info1.hasPB || info1.isPBFailMarked || info1.isFailed);
      const pb2Done = !isGroup || Boolean(info2?.hasPB || info2?.isPBFailMarked || info2?.isFailed);
      return pb1Done && pb2Done;
    }

    if (categoryKey === 'councilScore') {
      const c1Done = Boolean(info1.hasCouncil || info1.isCouncilFailMarked || info1.isFailed);
      const c2Done = !isGroup || Boolean(info2?.hasCouncil || info2?.isCouncilFailMarked || info2?.isFailed);
      return c1Done && c2Done;
    }

    if (categoryKey === 'finalScore') {
      const f1Done = Boolean(info1.finalScore !== null || info1.isFailed);
      const f2Done = !isGroup || Boolean(info2?.finalScore !== null || info2?.isFailed);
      return f1Done && f2Done;
    }

    return false;
  };

  // Active checked category keys
  const activeCategoryKeys = useMemo(() => {
    return Object.keys(selectedScores).filter((k) => selectedScores[k]);
  }, [selectedScores]);

  // Filtered theses based on active checked categories
  const filteredTheses = useMemo(() => {
    if (!isAll || !Array.isArray(theses) || theses.length === 0) return [];
    if (activeCategoryKeys.length === 0) return [];

    return theses.filter((item) => {
      return activeCategoryKeys.every((key) => checkThesisHasCategoryScore(item, key));
    });
  }, [isAll, theses, activeCategoryKeys, getThesisScoreInfo]);

  // When filteredTheses updates, default select only theses with files (> 0)
  useEffect(() => {
    if (filteredTheses.length > 0) {
      // Do not auto-select theses that haven't submitted any files (count === 0)
      const autoSelected = filteredTheses
        .filter((t) => getThesisFileCount(t) > 0)
        .map((t) => t._id);
      setSelectedThesisIds(autoSelected);
    } else {
      setSelectedThesisIds([]);
    }
  }, [filteredTheses, submissionCounts]);

  // Sync state on modal open
  useEffect(() => {
    if (isOpen) {
      if (isAll) {
        const globalSetting = publishedScores['GLOBAL_ALL'] || {};
        setSelectedScores({
          supervisorScore: hdAvail.count > 0 && !!globalSetting.supervisorScore,
          reviewer1Score: pb1Avail.count > 0 && !!(globalSetting.reviewer1Score || globalSetting.reviewerScore || globalSetting.reviewer2Score),
          councilScore: councilAvail.count > 0 && !!globalSetting.councilScore,
          finalScore: finalAvail.count > 0 && !!globalSetting.finalScore,
        });
      } else if (thesis && scoreInfo) {
        const prev = publishedScores[thesis._id] || {};
        setSelectedScores({
          supervisorScore: !!scoreInfo.hasHD && !!prev.supervisorScore,
          reviewer1Score: !!scoreInfo.hasPB1 && !!(prev.reviewer1Score || prev.reviewerScore || prev.reviewer2Score),
          councilScore: !!scoreInfo.hasCouncil && !!prev.councilScore,
          finalScore: (scoreInfo.finalScore !== null && scoreInfo.finalScore !== undefined) && !!prev.finalScore,
        });
      }
      setConfirmOpen(false);
    }
  }, [isOpen, isAll, thesis, scoreInfo, publishedScores, batchScoreAvailability]);

  if (!isOpen) return null;
  if (!isAll && (!thesis || !scoreInfo)) return null;

  const scoreItems = isAll
    ? [
        {
          key: 'supervisorScore',
          label: 'Điểm Giảng viên Hướng dẫn (GVHD)',
          score: null,
          hasScore: hdAvail.count > 0,
          count: hdAvail.count,
          total: hdAvail.total,
          weight: '50%',
        },
        {
          key: 'reviewer1Score',
          label: 'Điểm Phản biện kín',
          score: null,
          hasScore: pb1Avail.count > 0,
          count: pb1Avail.count,
          total: pb1Avail.total,
          weight: '30%',
        },
        {
          key: 'councilScore',
          label: 'Điểm Hội đồng bảo vệ',
          score: null,
          hasScore: councilAvail.count > 0,
          count: councilAvail.count,
          total: councilAvail.total,
          weight: '20%',
        },
        {
          key: 'finalScore',
          label: 'Điểm Tổng kết Khóa Luận',
          score: null,
          hasScore: finalAvail.count > 0,
          count: finalAvail.count,
          total: finalAvail.total,
          weight: '100%',
        },
      ]
    : [
        {
          key: 'supervisorScore',
          label: 'Điểm Giảng viên Hướng dẫn (GVHD)',
          score: scoreInfo?.scoreHD,
          hasScore: !!scoreInfo?.hasHD || !!scoreInfo?.isHDFailMarked || (scoreInfo?.isFailed && scoreInfo?.scoreHD !== null),
          weight: '50%',
        },
        {
          key: 'reviewer1Score',
          label: 'Điểm Phản biện kín',
          score: scoreInfo?.scorePB1,
          hasScore: !!scoreInfo?.hasPB1 || !!scoreInfo?.hasPB || !!scoreInfo?.isPBFailMarked || (scoreInfo?.isFailed && scoreInfo?.scorePB !== null),
          weight: '30%',
        },
        {
          key: 'councilScore',
          label: 'Điểm Hội đồng bảo vệ',
          score: scoreInfo?.scoreCouncil,
          hasScore: !!scoreInfo?.hasCouncil || !!scoreInfo?.isCouncilFailMarked || (scoreInfo?.isFailed && scoreInfo?.scoreCouncil !== null),
          weight: '20%',
        },
        {
          key: 'finalScore',
          label: 'Điểm Tổng kết Khóa Luận',
          score: scoreInfo?.finalScore,
          hasScore: (scoreInfo?.finalScore !== null && scoreInfo?.finalScore !== undefined) || !!scoreInfo?.isFailed,
          weight: '100%',
        },
      ];

  const handleToggle = (key, hasScore) => {
    if (!hasScore) return;
    setSelectedScores((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  const handleSelectAllAvailable = () => {
    const next = { ...selectedScores };
    scoreItems.forEach((item) => {
      if (item.hasScore) {
        next[item.key] = true;
      }
    });
    setSelectedScores(next);
  };

  const handleDeselectAll = () => {
    setSelectedScores({
      supervisorScore: false,
      reviewer1Score: false,
      councilScore: false,
      finalScore: false,
    });
  };

  // Thesis selection handlers
  const toggleSelectThesis = (itemOrId) => {
    const id = typeof itemOrId === 'object' && itemOrId !== null ? itemOrId._id : itemOrId;
    const thesisObj = typeof itemOrId === 'object' && itemOrId !== null ? itemOrId : filteredTheses.find((t) => t._id === id);
    const isCurrentlyChecked = selectedThesisIds.includes(id);

    if (isCurrentlyChecked) {
      // Unchecking does not require warning
      setSelectedThesisIds((prev) => prev.filter((tId) => tId !== id));
      return;
    }

    // Checking: check if thesis has 0 files
    const fileCount = getThesisFileCount(thesisObj);
    if (fileCount === 0) {
      setPendingZeroFileThesis(thesisObj || id);
      setZeroFileConfirmOpen(true);
      return;
    }

    setSelectedThesisIds((prev) => [...prev, id]);
  };

  const handleSelectAllTheses = () => {
    const unselectedWithZeroFiles = filteredTheses.filter(
      (t) => !selectedThesisIds.includes(t._id) && getThesisFileCount(t) === 0
    );

    if (unselectedWithZeroFiles.length > 0) {
      setPendingZeroFileThesis(filteredTheses.map((t) => t._id));
      setZeroFileConfirmOpen(true);
    } else {
      setSelectedThesisIds(filteredTheses.map((t) => t._id));
    }
  };

  const handleDeselectAllTheses = () => {
    setSelectedThesisIds([]);
  };

  // Get human-readable list of selected scores for confirmation message
  const getSelectedLabelsList = () => {
    const list = [];
    scoreItems.forEach((item) => {
      if (selectedScores[item.key]) {
        list.push(`${item.label} (${item.weight})`);
      }
    });
    return list;
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (activeCategoryKeys.length === 0) {
      showToast('Vui lòng chọn ít nhất một đầu điểm để công bố', 'warning');
      return;
    }
    if (isAll && selectedThesisIds.length === 0) {
      showToast('Vui lòng chọn ít nhất một đề tài trong danh sách để công bố', 'warning');
      return;
    }
    setConfirmOpen(true);
  };

  const handleFinalConfirm = async () => {
    setSubmitting(true);
    try {
      if (onPublishScores) {
        if (isAll) {
          await onPublishScores(selectedScores, selectedThesisIds);
        } else {
          await onPublishScores(selectedScores, [thesis._id]);
        }
      }
      const selectedLabels = getSelectedLabelsList();
      if (isAll) {
        showToast(
          `Đã công bố ${selectedLabels.length} đầu điểm cho ${selectedThesisIds.length} đề tài khóa luận thành công!`,
          'success'
        );
      } else {
        showToast(
          `Đã công bố điểm cho sinh viên đề tài "${thesis.thesisTitle}" thành công!`,
          'success'
        );
      }
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu công bố điểm', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const selectedLabels = getSelectedLabelsList();

  // Helper to render score badges for active categories for each thesis
  const renderThesisCategoryScores = (item) => {
    if (!getThesisScoreInfo) return null;
    const isGroup = item.studentCount === 2 && Boolean(item.secondStudentId);
    const info1 = getThesisScoreInfo(item, 1);
    const info2 = isGroup ? getThesisScoreInfo(item, 2) : null;

    return (
      <div className="flex flex-wrap items-center gap-1.5 shrink-0 text-[11px] font-mono">
        {activeCategoryKeys.map((key) => {
          let label = '';
          let scoreText = '';
          let badgeColor = '';

          if (key === 'supervisorScore') {
            label = 'GVHD';
            scoreText = isGroup ? `${info1?.scoreHD ?? '—'} / ${info2?.scoreHD ?? '—'}` : `${info1?.scoreHD ?? '—'}`;
            badgeColor = 'bg-blue-50 text-[#123891] border-blue-200';
          } else if (key === 'reviewer1Score') {
            label = 'PB';
            scoreText = isGroup ? `${info1?.scorePB ?? '—'} / ${info2?.scorePB ?? '—'}` : `${info1?.scorePB ?? '—'}`;
            badgeColor = 'bg-indigo-50 text-indigo-800 border-indigo-200';
          } else if (key === 'councilScore') {
            label = 'HĐ';
            scoreText = isGroup ? `${info1?.scoreCouncil ?? '—'} / ${info2?.scoreCouncil ?? '—'}` : `${info1?.scoreCouncil ?? '—'}`;
            badgeColor = 'bg-amber-50 text-amber-800 border-amber-200';
          } else if (key === 'finalScore') {
            label = 'Tổng';
            scoreText = isGroup ? `${info1?.finalScore ?? '—'} / ${info2?.finalScore ?? '—'}` : `${info1?.finalScore ?? '—'}`;
            badgeColor = 'bg-emerald-50 text-emerald-800 border-emerald-200';
          }

          return (
            <span
              key={key}
              className={`px-2 py-0.5 rounded-lg border font-bold ${badgeColor}`}
            >
              <span className="opacity-70 font-sans text-[10px] mr-1">{label}:</span>
              <span>{scoreText}</span>
            </span>
          );
        })}
      </div>
    );
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title={isAll ? 'Công Bố Điểm Tất Cả Đề Tài Khóa Luận' : 'Công Bố Điểm Khóa Luận Tốt Nghiệp'}
        maxWidth={isAll ? 'max-w-3xl' : 'max-w-lg'}
      >
        <form onSubmit={handleOpenConfirm} className="space-y-4 text-xs">
          {/* Header Description Box (Chỉ cho modal đơn lẻ) */}
          {!isAll && (
            <div className="p-3.5 rounded-2xl bg-blue-50/70 border border-blue-200/80 space-y-2 shadow-2xs">
              <div className="flex items-start gap-2.5">
                <div className="w-8 h-8 rounded-xl bg-[#123891] text-white flex items-center justify-center shrink-0 mt-0.5 shadow-2xs font-bold">
                  <BookOpen className="w-4 h-4" />
                </div>
                <div className="min-w-0 flex-1">
                  <h4 className="font-bold text-slate-900 text-sm leading-snug">
                    {thesis?.thesisTitle}
                  </h4>
                  <div className="text-[11px] text-slate-600 mt-1 space-y-0.5">
                    <div>
                      <strong>SV thực hiện:</strong> {thesis?.studentId?.userId?.fullName} (
                      {thesis?.studentId?.studentCode})
                      {thesis?.secondStudentId && (
                        <>
                          {' '}
                          • {thesis.secondStudentId?.userId?.fullName} (
                          {thesis.secondStudentId?.studentCode})
                        </>
                      )}
                    </div>
                    <div>
                      <strong>GVHD:</strong>{' '}
                      {thesis?.supervisorId?.academicTitle ? `${thesis.supervisorId.academicTitle} ` : ''}
                      {thesis?.supervisorId?.userId?.fullName || '—'}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick toggle actions */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-[#123891]" />
              <span>1. Chọn đầu điểm thành phần công bố:</span>
            </label>
            <div className="flex items-center gap-2 text-[11px]">
              <button
                type="button"
                onClick={handleSelectAllAvailable}
                className="text-[#123891] font-bold hover:underline cursor-pointer"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-slate-500 hover:text-slate-800 cursor-pointer"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {/* Score Items List */}
          <div className={isAll ? 'grid grid-cols-1 sm:grid-cols-2 gap-2' : 'space-y-2'}>
            {scoreItems.map((item) => {
              const isChecked = !!selectedScores[item.key] && item.hasScore;
              const disabled = !item.hasScore;

              return (
                <div
                  key={item.key}
                  onClick={() => handleToggle(item.key, item.hasScore)}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-2.5 ${
                    disabled
                      ? 'bg-slate-50/70 border-slate-200/80 opacity-60 cursor-not-allowed'
                      : isChecked
                      ? 'bg-blue-50/90 border-[#123891] shadow-2xs cursor-pointer ring-1 ring-[#123891]/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5 min-w-0">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={disabled}
                      readOnly
                      onClick={(e) => e.stopPropagation()}
                      onChange={() => handleToggle(item.key, item.hasScore)}
                      className="w-4 h-4 rounded text-[#123891] focus:ring-[#123891] cursor-pointer disabled:cursor-not-allowed shrink-0"
                    />
                    <div className="min-w-0 select-none">
                      <span
                        className={`text-xs block leading-snug ${
                          isChecked ? 'font-bold text-slate-900' : disabled ? 'text-slate-500 font-medium' : 'font-medium text-slate-700'
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block mt-0.5">
                        Trọng số: {item.weight}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {isAll ? (
                      <span
                        className={`px-2 py-0.5 rounded-md text-[10.5px] font-bold font-mono border ${
                          item.hasScore
                            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                            : 'bg-slate-100 text-slate-500 border-slate-200'
                        }`}
                      >
                        {item.count > 0
                          ? `Đã chấm ${item.count}/${item.total}`
                          : `Chưa có điểm (0/${item.total})`}
                      </span>
                    ) : item.hasScore ? (
                      <span className="px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-white border border-slate-200 text-slate-900 shadow-2xs">
                        {item.score} đ
                      </span>
                    ) : (
                      <span className="text-[11px] text-slate-400 italic">Chưa có điểm</span>
                    )}
                  </div>
                </div>
              );
            })}
          </div>

          {/* Section 2: Thesis List Section (Only for isAll) */}
          {isAll && (
            <div className="pt-2.5 space-y-2.5 border-t border-slate-200/80">
              {/* Header of Thesis List Section */}
              <div className="flex flex-wrap items-center justify-between gap-2">
                <div className="flex items-center gap-1.5">
                  <GraduationCap className="w-4 h-4 text-[#123891]" />
                  <span className="font-bold text-xs text-slate-900 uppercase tracking-wide">
                    2. Danh sách đề tài đủ điều kiện công bố:
                  </span>
                  {activeCategoryKeys.length > 0 && (
                    <span className="px-2 py-0.5 rounded-full text-[10.5px] font-bold bg-blue-100/80 text-[#123891]">
                      {filteredTheses.length} đề tài
                    </span>
                  )}
                </div>

                {filteredTheses.length > 0 && (
                  <div className="flex items-center gap-2 text-[11px]">
                    <span className="text-slate-500">
                      Đã chọn: <strong className="text-[#123891]">{selectedThesisIds.length}</strong>/{filteredTheses.length}
                    </span>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleSelectAllTheses}
                      className="text-[#123891] font-bold hover:underline cursor-pointer"
                    >
                      Chọn tất cả
                    </button>
                    <span className="text-slate-300">•</span>
                    <button
                      type="button"
                      onClick={handleDeselectAllTheses}
                      className="text-slate-500 hover:text-slate-800 cursor-pointer"
                    >
                      Bỏ chọn tất cả
                    </button>
                  </div>
                )}
              </div>

              {/* Theses List Container */}
              {activeCategoryKeys.length === 0 ? (
                <div className="p-5 rounded-2xl bg-slate-50/70 border border-dashed border-slate-200 text-center">
                  <AlertCircle className="w-5 h-5 text-slate-400 mx-auto mb-1" />
                  <p className="text-xs font-semibold text-slate-600">
                    Chưa chọn đầu điểm nào ở trên
                  </p>
                </div>
              ) : filteredTheses.length === 0 ? (
                <div className="p-6 rounded-2xl bg-amber-50/50 border border-dashed border-amber-200 text-center">
                  <AlertCircle className="w-6 h-6 text-amber-500 mx-auto mb-1.5" />
                  <p className="text-xs font-semibold text-amber-800">
                    Không có đề tài nào có đủ điểm cho các đầu điểm đã chọn
                  </p>
                  <p className="text-[11px] text-amber-600 mt-0.5">
                    Hiện chưa có đề tài nào được chấm đủ các đầu điểm này. Vui lòng kiểm tra lại tiến độ nhập điểm của giảng viên.
                  </p>
                </div>
              ) : (
                <div className="space-y-2 max-h-72 overflow-y-auto pr-1">
                  {filteredTheses.map((item) => {
                    const isChecked = selectedThesisIds.includes(item._id);
                    const isGroup = item.studentCount === 2 && Boolean(item.secondStudentId);
                    const fileCount = getThesisFileCount(item);
                    const pub = publishedScores[item._id] || {};
                    const isAlreadyPublished = activeCategoryKeys.some((k) => pub[k]);

                    return (
                      <div
                        key={item._id}
                        onClick={() => toggleSelectThesis(item)}
                        className={`p-3 rounded-2xl border transition flex items-start justify-between gap-3 ${
                          isChecked
                            ? 'bg-blue-50/60 border-[#123891] shadow-2xs ring-1 ring-[#123891]/20 cursor-pointer'
                            : 'bg-white border-slate-200 hover:border-slate-300 cursor-pointer'
                        }`}
                      >
                        {/* Checkbox + Info */}
                        <div className="flex items-start gap-2.5 min-w-0 flex-1">
                          <input
                            type="checkbox"
                            checked={isChecked}
                            onChange={() => {}} // Handled by container onClick
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleSelectThesis(item);
                            }}
                            className="w-4 h-4 rounded border-slate-300 text-[#123891] focus:ring-[#123891] cursor-pointer mt-0.5 shrink-0"
                          />
                          <div className="min-w-0 flex-1">
                            {/* Tên đề tài */}
                            <div className="flex items-baseline gap-2">
                              <h5 className="font-bold text-xs text-slate-900 line-clamp-1 leading-snug">
                                {item.thesisTitle}
                              </h5>
                              <span className="shrink-0 text-[9.5px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                                {isGroup ? 'Nhóm 2 SV' : '1 SV'}
                              </span>
                            </div>

                            {/* Metadata Row: GVHD + Sinh viên + Số file nộp */}
                            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                              <div>
                                <span className="text-slate-400">GVHD:</span>{' '}
                                <span className="font-semibold text-slate-800">
                                  {item.supervisorId?.academicTitle ? `${item.supervisorId.academicTitle} ` : ''}
                                  {item.supervisorId?.userId?.fullName || '—'}
                                </span>
                              </div>

                              <div>
                                <span className="text-slate-400">SV:</span>{' '}
                                <span className="font-semibold text-slate-800">
                                  {item.studentId?.userId?.fullName}
                                  {item.studentId?.studentCode ? ` (${item.studentId.studentCode})` : ''}
                                </span>
                                {item.secondStudentId && (
                                  <>
                                    {' '}•{' '}
                                    <span className="font-semibold text-slate-800">
                                      {item.secondStudentId?.userId?.fullName}
                                      {item.secondStudentId?.studentCode ? ` (${item.secondStudentId.studentCode})` : ''}
                                    </span>
                                  </>
                                )}
                              </div>

                              {/* Số file nộp dạng badge/box + Nút Xem chi tiết */}
                              <div className="inline-flex items-center gap-1.5">
                                <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200">
                                  <Paperclip className={`w-3 h-3 ${fileCount > 0 ? 'text-[#123891]' : 'text-amber-500'}`} />
                                  <span className={fileCount > 0 ? 'font-semibold text-slate-700' : 'text-amber-600 font-medium italic'}>
                                    {fileCount > 0 ? `Đã nộp ${fileCount} file` : 'Chưa nộp file'}
                                  </span>
                                </span>

                                {onViewDetails && (
                                  <button
                                    type="button"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      onViewDetails(item);
                                    }}
                                    className="inline-flex items-center gap-1 px-2 py-0.5 text-[10.5px] font-bold text-[#123891] hover:text-[#0d2a75] hover:bg-blue-50 rounded-lg border border-blue-200/80 transition cursor-pointer"
                                    title="Xem chi tiết danh sách file và điểm của đề tài này"
                                  >
                                    <span>Xem chi tiết</span>
                                    <ExternalLink className="w-3 h-3" />
                                  </button>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>

                        {/* Right: Scores & Published Indicator */}
                        <div className="shrink-0 text-right flex flex-col items-end gap-1">
                          {renderThesisCategoryScores(item)}
                          {isAlreadyPublished && (
                            <span className="text-[10px] text-blue-600 font-semibold">
                              ✓ Đã công bố trước
                            </span>
                          )}
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          )}

          {/* Modal Actions */}
          <div className="flex items-center justify-end gap-2.5 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={submitting || (isAll && (activeCategoryKeys.length === 0 || selectedThesisIds.length === 0))}
              className="px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-md shadow-blue-100 transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>
                {isAll
                  ? `Xác nhận công bố (${selectedThesisIds.length} đề tài)`
                  : 'Xác nhận công bố'}
              </span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleFinalConfirm}
        title={isAll ? 'Xác nhận Công Bố Điểm Khóa Luận' : 'Xác nhận Công Bố Điểm Cho Sinh Viên'}
        message={
          isAll ? (
            <div className="space-y-2 text-xs text-left">
              <p className="text-slate-700">
                Bạn có chắc chắn muốn công bố <strong>{selectedLabels.length} đầu điểm</strong> cho{' '}
                <strong className="text-[#123891]">{selectedThesisIds.length} đề tài khóa luận</strong> đã chọn không?
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono text-slate-800">
                {selectedLabels.map((lbl, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>{lbl}</span>
                  </div>
                ))}
              </div>
              <p className="text-[11px] text-slate-500 italic">
                Lưu ý: Sinh viên của các đề tài được chọn sẽ thấy điểm này trên cổng cá nhân.
              </p>
            </div>
          ) : (
            <div className="space-y-2 text-xs text-left">
              <p className="text-slate-700">
                Bạn có chắc chắn muốn công bố <strong>{selectedLabels.length} đầu điểm</strong> sau cho sinh viên thực hiện đề tài <strong>"{thesis?.thesisTitle}"</strong> không?
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono text-slate-800">
                {selectedLabels.map((lbl, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>{lbl}</span>
                  </div>
                ))}
              </div>
            </div>
          )
        }
        confirmText="Đồng ý công bố"
        cancelText="Quay lại"
        isDanger={false}
        loading={submitting}
      />

      {/* Confirm Dialog when user manually checks a thesis with 0 files */}
      <ConfirmDialog
        isOpen={zeroFileConfirmOpen}
        onClose={() => {
          setZeroFileConfirmOpen(false);
          setPendingZeroFileThesis(null);
        }}
        onConfirm={() => {
          if (pendingZeroFileThesis) {
            if (Array.isArray(pendingZeroFileThesis)) {
              setSelectedThesisIds(pendingZeroFileThesis);
            } else {
              const targetId =
                typeof pendingZeroFileThesis === 'object'
                  ? pendingZeroFileThesis._id
                  : pendingZeroFileThesis;
              setSelectedThesisIds((prev) => {
                if (!prev.includes(targetId)) {
                  return [...prev, targetId];
                }
                return prev;
              });
            }
          }
          setZeroFileConfirmOpen(false);
          setPendingZeroFileThesis(null);
        }}
        title="Xác nhận công bố điểm"
        message="Đề tài này chưa nộp đủ file. Đồng ý công bố?"
        confirmText="OK"
        cancelText="Hủy"
        isDanger={false}
      />
    </>
  );
};

export default PublishScoresModal;
