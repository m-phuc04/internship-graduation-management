import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import ConfirmDialog from '../common/ConfirmDialog';
import { useToast } from '../../context/ToastContext';
import { Send, Check, AlertCircle, BookOpen, CheckSquare, Square, Radio, Sparkles } from 'lucide-react';

const PublishScoresModal = ({
  isOpen,
  onClose,
  thesis,
  scoreInfo,
  publishedScores = {},
  onPublishScores,
}) => {
  const { showToast } = useToast();

  const [selectedScores, setSelectedScores] = useState({
    supervisorScore: false,
    reviewer1Score: false,
    reviewer2Score: false,
    councilScore: false,
  });

  const [confirmOpen, setConfirmOpen] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    if (isOpen && thesis) {
      const prev = publishedScores[thesis._id] || {};
      setSelectedScores({
        supervisorScore: !!prev.supervisorScore,
        reviewer1Score: !!prev.reviewer1Score,
        reviewer2Score: !!prev.reviewer2Score,
        councilScore: !!prev.councilScore,
      });
      setConfirmOpen(false);
    }
  }, [isOpen, thesis, publishedScores]);

  if (!thesis || !scoreInfo) return null;

  const scoreItems = [
    {
      key: 'supervisorScore',
      label: 'Điểm Giảng viên Hướng dẫn (GVHD)',
      score: scoreInfo.scoreHD,
      hasScore: scoreInfo.hasHD,
      weight: '50%',
    },
    {
      key: 'reviewer1Score',
      label: 'Điểm Giảng viên Phản biện 1 (GVPB 1)',
      score: scoreInfo.scorePB1,
      hasScore: scoreInfo.hasPB1,
      weight: 'PB kín',
    },
    {
      key: 'reviewer2Score',
      label: 'Điểm Giảng viên Phản biện 2 (GVPB 2)',
      score: scoreInfo.scorePB2,
      hasScore: scoreInfo.hasPB2,
      weight: 'PB kín',
    },
    {
      key: 'councilScore',
      label: 'Điểm Hội đồng bảo vệ',
      score: scoreInfo.scoreCouncil,
      hasScore: scoreInfo.hasCouncil,
      weight: '30%',
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
      reviewer2Score: false,
      councilScore: false,
    });
  };

  // Get human-readable list of selected scores for confirmation message
  const getSelectedLabelsList = () => {
    const list = [];
    scoreItems.forEach((item) => {
      if (selectedScores[item.key] && item.hasScore) {
        list.push(`${item.label}: ${item.score}`);
      }
    });
    return list;
  };

  const handleOpenConfirm = (e) => {
    e.preventDefault();
    setConfirmOpen(true);
  };

  const handleFinalConfirm = async () => {
    setSubmitting(true);
    try {
      if (onPublishScores) {
        await onPublishScores(thesis._id, selectedScores);
      }
      const selectedLabels = getSelectedLabelsList();
      if (selectedLabels.length > 0) {
        showToast(
          `Đã công bố ${selectedLabels.length} đầu điểm cho sinh viên đề tài "${thesis.thesisTitle}" thành công!`,
          'success'
        );
      } else {
        showToast(`Đã lưu cài đặt không công bố điểm cho đề tài "${thesis.thesisTitle}"!`, 'info');
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

  return (
    <>
      <Modal
        isOpen={isOpen}
        onClose={onClose}
        title="Công Bố Điểm Khóa Luận Tốt Nghiệp"
        maxWidth="max-w-lg"
      >
        <form onSubmit={handleOpenConfirm} className="space-y-4 text-xs">
          {/* Thesis Info */}
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
                    <strong>SV thực hiện:</strong> {thesis.studentId?.userId?.fullName} (
                    {thesis.studentId?.studentCode})
                    {thesis.secondStudentId && (
                      <>
                        {' '}
                        • {thesis.secondStudentId?.userId?.fullName} (
                        {thesis.secondStudentId?.studentCode})
                      </>
                    )}
                  </div>
                  <div>
                    <strong>GVHD:</strong>{' '}
                    {thesis.supervisorId?.academicTitle ? `${thesis.supervisorId.academicTitle} ` : ''}
                    {thesis.supervisorId?.userId?.fullName || '—'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Quick toggle actions */}
          <div className="flex items-center justify-between pt-1">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide flex items-center gap-1.5">
              <Send className="w-3.5 h-3.5 text-[#123891]" />
              <span>Chọn các đầu điểm muốn công bố cho sinh viên:</span>
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
          <div className="space-y-2">
            {scoreItems.map((item) => {
              const isChecked = !!selectedScores[item.key] && item.hasScore;
              const disabled = !item.hasScore;

              return (
                <div
                  key={item.key}
                  onClick={() => handleToggle(item.key, item.hasScore)}
                  className={`p-3 rounded-2xl border transition flex items-center justify-between gap-3 ${
                    disabled
                      ? 'bg-slate-50/60 border-slate-200/80 opacity-60 cursor-not-allowed'
                      : isChecked
                      ? 'bg-blue-50/90 border-[#123891] shadow-2xs cursor-pointer ring-1 ring-[#123891]/20'
                      : 'bg-white border-slate-200 hover:bg-slate-50 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <input
                      type="checkbox"
                      checked={isChecked}
                      disabled={disabled}
                      onChange={() => handleToggle(item.key, item.hasScore)}
                      className="w-4 h-4 rounded text-[#123891] focus:ring-[#123891] cursor-pointer"
                    />
                    <div>
                      <span
                        className={`text-xs block ${
                          isChecked ? 'font-bold text-slate-900' : 'font-medium text-slate-700'
                        }`}
                      >
                        {item.label}
                      </span>
                      <span className="text-[10px] text-slate-400 font-mono block">
                        Tỷ trọng: {item.weight}
                      </span>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    {item.hasScore ? (
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
              className="px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition cursor-pointer flex items-center gap-1.5"
            >
              <Check className="w-3.5 h-3.5" />
              <span>Xác nhận</span>
            </button>
          </div>
        </form>
      </Modal>

      {/* Confirmation Dialog */}
      <ConfirmDialog
        isOpen={confirmOpen}
        onClose={() => setConfirmOpen(false)}
        onConfirm={handleFinalConfirm}
        title="Xác nhận Công Bố Điểm Cho Sinh Viên"
        message={
          selectedLabels.length > 0 ? (
            <div className="space-y-2 text-xs text-left">
              <p className="text-slate-700">
                Bạn có chắc chắn muốn công bố <strong>{selectedLabels.length} đầu điểm</strong> sau cho sinh viên thực hiện đề tài <strong>"{thesis.thesisTitle}"</strong> không?
              </p>
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-1 font-mono text-slate-800">
                {selectedLabels.map((lbl, idx) => (
                  <div key={idx} className="flex items-center gap-2">
                    <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                    <span>{lbl}</span>
                  </div>
                ))}
              </div>
              <p className="text-slate-500 text-[11px] italic">
                * Sinh viên sẽ có thể xem được các đầu điểm được chọn trong cổng thông tin sinh viên.
              </p>
            </div>
          ) : (
            `Bạn có chắc chắn muốn bỏ công bố tất cả các đầu điểm cho đề tài "${thesis.thesisTitle}"? Sinh viên sẽ không thấy điểm nữa.`
          )
        }
        confirmText="Đồng ý công bố"
        cancelText="Quay lại"
        isDanger={false}
        loading={submitting}
      />
    </>
  );
};

export default PublishScoresModal;
