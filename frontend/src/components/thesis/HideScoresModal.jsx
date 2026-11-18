import React, { useState, useEffect, useMemo } from 'react';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import {
  EyeOff,
  Check,
  Paperclip,
  GraduationCap,
  ExternalLink,
  Search,
  AlertCircle,
  FileText,
} from 'lucide-react';

const HideScoresModal = ({
  isOpen,
  onClose,
  theses = [],
  thesesCount = 0,
  submissionCounts = {},
  getThesisScoreInfo = null,
  batchPublishedAvailability = null,
  publishedScores = {},
  onHideScores,
  onViewDetails = null,
}) => {
  const { showToast } = useToast();

  const [selectedThesisIds, setSelectedThesisIds] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

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

  // Helper to extract list of published score items for a thesis
  const getThesisPublishedScoresList = (item) => {
    if (!item) return [];
    const pub = publishedScores[item._id] || item.publishedScores || {};
    const isGroup = item.studentCount === 2 && Boolean(item.secondStudentId);
    const info1 = getThesisScoreInfo ? getThesisScoreInfo(item, 1) : null;
    const info2 = isGroup && getThesisScoreInfo ? getThesisScoreInfo(item, 2) : null;

    const list = [];
    if (pub.supervisorScore) {
      const val = isGroup
        ? `${info1?.scoreHD ?? '—'} / ${info2?.scoreHD ?? '—'}`
        : `${info1?.scoreHD ?? '—'}`;
      list.push({ label: 'GVHD', value: val, key: 'supervisorScore' });
    }
    if (pub.reviewer1Score || pub.reviewerScore) {
      const val = isGroup
        ? `${info1?.scorePB ?? '—'} / ${info2?.scorePB ?? '—'}`
        : `${info1?.scorePB ?? '—'}`;
      list.push({ label: 'PB', value: val, key: 'reviewer1Score' });
    }
    if (pub.councilScore) {
      const val = isGroup
        ? `${info1?.scoreCouncil ?? '—'} / ${info2?.scoreCouncil ?? '—'}`
        : `${info1?.scoreCouncil ?? '—'}`;
      list.push({ label: 'HĐ', value: val, key: 'councilScore' });
    }
    if (pub.finalScore) {
      const val = isGroup
        ? `${info1?.finalScore ?? '—'} / ${info2?.finalScore ?? '—'}`
        : `${info1?.finalScore ?? '—'}`;
      list.push({ label: 'Tổng', value: val, key: 'finalScore' });
    }
    return list;
  };

  // Theses that currently have at least one published score
  const publishedTheses = useMemo(() => {
    if (!Array.isArray(theses) || theses.length === 0) return [];
    return theses.filter((item) => {
      const pub = publishedScores[item._id] || item.publishedScores || {};
      return Boolean(
        pub.supervisorScore ||
        pub.reviewer1Score ||
        pub.reviewerScore ||
        pub.reviewer2Score ||
        pub.councilScore ||
        pub.finalScore
      );
    });
  }, [theses, publishedScores]);

  // Filtered by search query
  const filteredTheses = useMemo(() => {
    if (!searchQuery.trim()) return publishedTheses;
    const q = searchQuery.toLowerCase().trim();
    return publishedTheses.filter((item) => {
      const title = (item.thesisTitle || '').toLowerCase();
      const sup = (item.supervisorId?.userId?.fullName || '').toLowerCase();
      const sv1 = (item.studentId?.userId?.fullName || '').toLowerCase();
      const code1 = (item.studentId?.studentCode || '').toLowerCase();
      const sv2 = (item.secondStudentId?.userId?.fullName || '').toLowerCase();
      const code2 = (item.secondStudentId?.studentCode || '').toLowerCase();
      return (
        title.includes(q) ||
        sup.includes(q) ||
        sv1.includes(q) ||
        code1.includes(q) ||
        sv2.includes(q) ||
        code2.includes(q)
      );
    });
  }, [publishedTheses, searchQuery]);

  // Sync state on modal open: default select all eligible published theses
  useEffect(() => {
    if (isOpen) {
      setSelectedThesisIds(publishedTheses.map((t) => t._id));
      setSearchQuery('');
      setConfirmOpen(false);
    }
  }, [isOpen, publishedTheses]);

  if (!isOpen) return null;

  // Toggle selection for a single thesis
  const toggleSelectThesis = (itemOrId) => {
    const id = typeof itemOrId === 'object' && itemOrId !== null ? itemOrId._id : itemOrId;
    setSelectedThesisIds((prev) =>
      prev.includes(id) ? prev.filter((tId) => tId !== id) : [...prev, id]
    );
  };

  const handleSelectAll = () => {
    setSelectedThesisIds(filteredTheses.map((t) => t._id));
  };

  const handleDeselectAll = () => {
    setSelectedThesisIds([]);
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    if (selectedThesisIds.length === 0) {
      showToast('Vui lòng chọn ít nhất một đề tài trong danh sách để ẩn điểm', 'warning');
      return;
    }
    setConfirmOpen(true);
  };

  const handleFinalConfirm = async () => {
    setSubmitting(true);
    try {
      const allScoresToHide = {
        supervisorScore: true,
        reviewer1Score: true,
        reviewerScore: true,
        reviewer2Score: true,
        councilScore: true,
        finalScore: true,
      };

      if (onHideScores) {
        await onHideScores(allScoresToHide, selectedThesisIds);
      }
      showToast(
        `Đã ẩn toàn bộ điểm đã công bố cho ${selectedThesisIds.length} đề tài khóa luận thành công!`,
        'success'
      );
      setConfirmOpen(false);
      onClose();
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu cài đặt ẩn điểm', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Ẩn Điểm Đã Công Bố"
        maxWidth="max-w-3xl"
      >
        <form onSubmit={handleOpenConfirm} className="space-y-4 text-xs">
          {/* Toolbar: Search input + Selection Counters & Quick Actions */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 pt-1">
            <div className="relative flex-1 max-w-sm">
              <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Tìm theo tên đề tài, GVHD, sinh viên, MSSV..."
                className="w-full pl-8 pr-3 py-1.5 text-xs bg-white border border-slate-200 rounded-xl placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-slate-300 focus:border-slate-400 transition"
              />
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-2.5 text-[11px]">
              <span className="text-slate-500 font-medium">
                Đã chọn: <strong className="text-slate-900 font-bold">{selectedThesisIds.length}</strong>/{filteredTheses.length} đề tài
              </span>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleSelectAll}
                className="text-[#123891] font-bold hover:underline cursor-pointer"
              >
                Chọn tất cả
              </button>
              <span className="text-slate-300">•</span>
              <button
                type="button"
                onClick={handleDeselectAll}
                className="text-slate-500 hover:text-slate-800 cursor-pointer font-medium"
              >
                Bỏ chọn
              </button>
            </div>
          </div>

          {/* Main Theses List Container */}
          <div className="space-y-2">
            {publishedTheses.length === 0 ? (
              <div className="p-8 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                <EyeOff className="w-8 h-8 text-slate-400 mx-auto mb-2 opacity-50" />
                <p className="text-xs font-bold text-slate-700">
                  Hiện không có đề tài nào đang công bố điểm
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Tất cả các đề tài hiện đang ở trạng thái ẩn điểm hoặc chưa được công bố đầu điểm nào.
                </p>
              </div>
            ) : filteredTheses.length === 0 ? (
              <div className="p-6 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-center">
                <AlertCircle className="w-6 h-6 text-slate-400 mx-auto mb-1.5" />
                <p className="text-xs font-semibold text-slate-700">
                  Không tìm thấy đề tài nào phù hợp với từ khóa tìm kiếm
                </p>
                <p className="text-[11px] text-slate-400 mt-0.5">
                  Vui lòng thử tìm kiếm lại với tên đề tài, tên GVHD hoặc mã số sinh viên khác.
                </p>
              </div>
            ) : (
              <div className="space-y-2 max-h-[50vh] overflow-y-auto pr-1">
                {filteredTheses.map((item) => {
                  const isChecked = selectedThesisIds.includes(item._id);
                  const isGroup = item.studentCount === 2 && Boolean(item.secondStudentId);
                  const fileCount = getThesisFileCount(item);
                  const publishedList = getThesisPublishedScoresList(item);

                  return (
                    <div
                      key={item._id}
                      onClick={() => toggleSelectThesis(item)}
                      className={`p-3.5 rounded-2xl border transition flex flex-col sm:flex-row sm:items-start justify-between gap-3 ${
                        isChecked
                          ? 'bg-slate-50/90 border-slate-400 shadow-2xs ring-1 ring-slate-400/30 cursor-pointer'
                          : 'bg-white border-slate-200 hover:border-slate-300 hover:bg-slate-50/50 cursor-pointer'
                      }`}
                    >
                      {/* Left: Checkbox & Thesis Details */}
                      <div className="flex items-start gap-3 min-w-0 flex-1">
                        <input
                          type="checkbox"
                          checked={isChecked}
                          onChange={() => {}}
                          onClick={(e) => {
                            e.stopPropagation();
                            toggleSelectThesis(item);
                          }}
                          className="w-4 h-4 rounded border-slate-300 text-slate-800 focus:ring-slate-700 cursor-pointer mt-0.5 shrink-0"
                        />

                        <div className="min-w-0 flex-1">
                          {/* Tên đề tài (nổi bật nhất) */}
                          <div className="flex items-baseline gap-2">
                            <h4 className="font-bold text-sm text-slate-900 line-clamp-1 leading-snug">
                              {item.thesisTitle}
                            </h4>
                            <span className="shrink-0 text-[10px] font-semibold px-1.5 py-0.2 rounded bg-slate-100 text-slate-600 font-mono">
                              {isGroup ? 'Nhóm 2 SV' : '1 SV'}
                            </span>
                          </div>

                          {/* Metadata Row: GVHD & Sinh viên */}
                          <div className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[11px] text-slate-500">
                            <div>
                              <span className="text-slate-400">GVHD:</span>{' '}
                              <span className="font-semibold text-slate-800">
                                {item.supervisorId?.academicTitle ? `${item.supervisorId.academicTitle} ` : ''}
                                {item.supervisorId?.userId?.fullName || '—'}
                              </span>
                            </div>

                            <div>
                              <span className="text-slate-400">Sinh viên:</span>{' '}
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
                          </div>

                          {/* Secondary Row: File counter & Xem chi tiết */}
                          <div className="mt-2 flex flex-wrap items-center gap-2">
                            <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-lg bg-slate-100 border border-slate-200/90 text-[11px]">
                              <Paperclip className={`w-3 h-3 ${fileCount > 0 ? 'text-[#123891]' : 'text-slate-400'}`} />
                              <span className={fileCount > 0 ? 'font-semibold text-slate-700' : 'text-slate-500 italic'}>
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
                                className="inline-flex items-center gap-1 px-2.5 py-0.5 text-[11px] font-bold text-[#123891] hover:text-[#0b2460] hover:bg-blue-50 rounded-lg border border-blue-200/80 transition cursor-pointer"
                                title="Xem chi tiết danh sách file và điểm của đề tài này"
                              >
                                <span>Xem chi tiết</span>
                                <ExternalLink className="w-3 h-3" />
                              </button>
                            )}
                          </div>
                        </div>
                      </div>

                      {/* Right: Directly Display Published Score Badges */}
                      <div className="shrink-0 flex flex-wrap items-center gap-1.5 sm:justify-end pt-1 sm:pt-0">
                        {publishedList.length > 0 ? (
                          publishedList.map((score, sIdx) => (
                            <span
                              key={sIdx}
                              className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg border text-[11px] font-bold font-mono bg-white text-slate-800 border-slate-300 shadow-2xs"
                              title={`Đang công bố ${score.label}: ${score.value}`}
                            >
                              <span className="text-slate-400 text-[9.5px] uppercase font-sans font-semibold">
                                {score.label}:
                              </span>
                              <span className="text-[#123891]">{score.value}</span>
                            </span>
                          ))
                        ) : (
                          <span className="text-[10px] text-slate-400 italic">
                            Chưa có điểm công bố
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-200">
            <span className="text-[11.5px] text-slate-500 font-medium">
              Đã chọn <strong className="text-slate-800">{selectedThesisIds.length}</strong> đề tài để ẩn điểm
            </span>

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={submitting || selectedThesisIds.length === 0}
                className="px-5 py-2.5 bg-[#123891] hover:bg-[#0e2c73] disabled:opacity-50 disabled:cursor-not-allowed text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer flex items-center gap-1.5"
              >
                <EyeOff className="w-3.5 h-3.5" />
                <span>Xác nhận ẩn điểm ({selectedThesisIds.length})</span>
              </button>
            </div>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleFinalConfirm}
        title="Xác nhận ẩn điểm đã công bố"
        message={
          <div className="space-y-2 text-xs text-left">
            <p className="text-slate-700">
              Bạn có chắc chắn muốn ẩn toàn bộ các đầu điểm đã công bố cho{' '}
              <strong className="text-[#123891] font-bold">{selectedThesisIds.length} đề tài khóa luận</strong> đã chọn không?
            </p>
            <p className="text-[11px] text-slate-500 leading-relaxed italic bg-slate-50 p-2.5 rounded-xl border border-slate-200">
              Lưu ý: Sinh viên của các đề tài này sẽ tạm thời không nhìn thấy các đầu điểm trên Cổng sinh viên. Toàn bộ điểm số trong hệ thống vẫn được lưu trữ nguyên vẹn và có thể công bố lại bất cứ lúc nào.
            </p>
          </div>
        }
        confirmText={`Đồng ý ẩn điểm (${selectedThesisIds.length})`}
        cancelText="Quay lại"
        isDanger={false}
        loading={submitting}
      />
    </>
  );
};

export default HideScoresModal;
