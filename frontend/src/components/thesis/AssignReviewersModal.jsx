import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import thesisApi from '../../api/thesisApi';
import lecturerApi from '../../api/lecturerApi';
import { useToast } from '../../context/ToastContext';
import {
  Users,
  UserCheck,
  AlertCircle,
  BookOpen,
  Plus,
  Trash2,
  CheckCircle2,
  Sparkles,
  ShieldCheck,
  Info,
  Check,
} from 'lucide-react';

const AssignReviewersModal = ({ isOpen, onClose, thesis, onSuccess }) => {
  const [lecturers, setLecturers] = useState([]);
  const [loadingLecturers, setLoadingLecturers] = useState(false);

  // Mặc định luôn có ít nhất 2 dòng giảng viên:
  // Mỗi giảng viên có 2 checkbox [PB KÍN] và [PB HỘI ĐỒNG] hoàn toàn độc lập
  const [reviewerRows, setReviewerRows] = useState([
    { id: 'row_1', lecturerId: '', isPrivateReviewer: false, isCouncilReviewer: false },
    { id: 'row_2', lecturerId: '', isPrivateReviewer: false, isCouncilReviewer: false },
  ]);

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

      const rows = [];

      // 1. Kiểm tra nếu đề tài đã có danh sách reviewers
      if (Array.isArray(thesis.reviewers) && thesis.reviewers.length > 0) {
        thesis.reviewers.forEach((r, idx) => {
          const lId = r.lecturerId?._id?.toString() || r.lecturerId?.toString() || '';
          if (lId) {
            rows.push({
              id: `row_${idx + 1}_${Date.now()}`,
              lecturerId: lId,
              isPrivateReviewer: Boolean(r.isPrivateReviewer),
              isCouncilReviewer: Boolean(r.isCouncilReviewer),
            });
          }
        });
      }

      // 2. Nếu reviewers array trống, fallback về reviewer1Id và reviewer2Id
      if (rows.length === 0) {
        const rev1Id =
          thesis?.reviewer1Id?._id?.toString() ||
          thesis?.reviewer1Id?.toString() ||
          '';

        const rev2Id =
          thesis?.reviewer2Id?._id?.toString() ||
          thesis?.reviewer2Id?.toString() ||
          '';

        if (rev1Id && rev2Id && rev1Id === rev2Id) {
          // Cùng 1 giảng viên đảm nhiệm cả 2 vai trò
          rows.push({
            id: 'row_1',
            lecturerId: rev1Id,
            isPrivateReviewer: true,
            isCouncilReviewer: true,
          });
        } else {
          if (rev1Id) {
            rows.push({
              id: 'row_1',
              lecturerId: rev1Id,
              isPrivateReviewer: true,
              isCouncilReviewer: false,
            });
          }
          if (rev2Id) {
            rows.push({
              id: 'row_2',
              lecturerId: rev2Id,
              isPrivateReviewer: false,
              isCouncilReviewer: true,
            });
          }
        }
      }

      // Luôn đảm bảo mặc định hiển thị ít nhất 2 dòng
      while (rows.length < 2) {
        rows.push({
          id: `row_${rows.length + 1}_${Date.now()}`,
          lecturerId: '',
          isPrivateReviewer: false,
          isCouncilReviewer: false,
        });
      }

      setReviewerRows(rows);
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

  // Thêm dòng giảng viên (từ dòng 3 trở lên)
  const handleAddRow = () => {
    setError('');
    setReviewerRows((prev) => [
      ...prev,
      {
        id: `row_${Date.now()}_${Math.random()}`,
        lecturerId: '',
        isPrivateReviewer: false,
        isCouncilReviewer: false,
      },
    ]);
  };

  // Xóa dòng giảng viên (tối thiểu luôn giữ 2 dòng)
  const handleRemoveRow = (rowId) => {
    setError('');
    setReviewerRows((prev) => {
      const filtered = prev.filter((r) => r.id !== rowId);
      while (filtered.length < 2) {
        filtered.push({
          id: `row_${Date.now()}_${Math.random()}`,
          lecturerId: '',
          isPrivateReviewer: false,
          isCouncilReviewer: false,
        });
      }
      return filtered;
    });
  };

  // Cập nhật giảng viên chọn trong dòng
  const handleLecturerChange = (rowId, newLecturerId) => {
    setError('');
    setReviewerRows((prev) =>
      prev.map((row) => (row.id === rowId ? { ...row, lecturerId: newLecturerId } : row)),
    );
  };

  // Toggle PB Kín: HOÀN TOÀN ĐỘC LẬP TỪNG DÒNG (nhiều GV cùng PB Kín được)
  const handleTogglePrivate = (rowId) => {
    setError('');
    setReviewerRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, isPrivateReviewer: !row.isPrivateReviewer } : row,
      ),
    );
  };

  // Toggle PB Hội đồng: HOÀN TOÀN ĐỘC LẬP TỪNG DÒNG (nhiều GV cùng PB Hội đồng được)
  const handleToggleCouncil = (rowId) => {
    setError('');
    setReviewerRows((prev) =>
      prev.map((row) =>
        row.id === rowId ? { ...row, isCouncilReviewer: !row.isCouncilReviewer } : row,
      ),
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (thesis?.status === 'COMPLETED') {
      setError('Khóa luận đã hoàn thành và không thể chỉnh sửa phân công phản biện.');
      return;
    }
    setError('');

    const filledRows = reviewerRows.filter((r) => r.lecturerId && r.lecturerId.trim() !== '');

    if (filledRows.length === 0) {
      setError('Vui lòng chọn ít nhất một giảng viên phản biện.');
      return;
    }

    // Validation 1: Mỗi dòng đã chọn GV phải tick ít nhất một checkbox
    for (let i = 0; i < filledRows.length; i++) {
      const row = filledRows[i];
      if (!row.isPrivateReviewer && !row.isCouncilReviewer) {
        const lec = lecturers.find((l) => l._id?.toString() === row.lecturerId);
        const name = lec?.userId?.fullName || `Giảng viên ${i + 1}`;
        setError(`${name} chưa được chọn vai trò phản biện nào. Vui lòng tick [PB KÍN] hoặc [PB HỘI ĐỒNG].`);
        return;
      }
    }

    // Validation 2: Reviewer != Supervisor
    for (const row of filledRows) {
      if (row.lecturerId === supervisorIdStr) {
        setError('Giảng viên hướng dẫn (GVHD) không được làm Giảng viên phản biện cho đề tài của mình!');
        return;
      }
    }

    // Validation 3: Duplicate lecturer across rows
    const seenLecturers = new Set();
    for (const row of filledRows) {
      if (seenLecturers.has(row.lecturerId)) {
        const dupLec = lecturers.find((l) => l._id?.toString() === row.lecturerId);
        const name = dupLec?.userId?.fullName || 'này';
        setError(`Giảng viên ${name} được chọn ở nhiều dòng. Bạn có thể tick cả 2 vai trò PB Kín & PB Hội đồng trên cùng 1 dòng.`);
        return;
      }
      seenLecturers.add(row.lecturerId);
    }

    const privateRows = filledRows.filter((r) => r.isPrivateReviewer);
    const councilRows = filledRows.filter((r) => r.isCouncilReviewer);

    setSubmitting(true);
    try {
      const reviewersPayload = filledRows.map((r) => ({
        lecturerId: r.lecturerId,
        isPrivateReviewer: Boolean(r.isPrivateReviewer),
        isCouncilReviewer: Boolean(r.isCouncilReviewer),
      }));

      const payload = {
        reviewer1Id: privateRows.length > 0 ? privateRows[0].lecturerId : null,
        reviewer2Id: councilRows.length > 0 ? councilRows[0].lecturerId : null,
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

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Phân Công Giảng Viên Phản Biện (Reviewers)"
      maxWidth="max-w-2xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Thesis Summary Card */}
        <div className="p-3.5 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-1.5 shadow-2xs">
          <div className="flex items-start gap-2">
            <BookOpen className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
            <div className="font-bold text-slate-900 text-xs leading-snug">{thesis.thesisTitle}</div>
          </div>

          <div className="text-[11px] text-slate-600 flex flex-wrap items-center gap-2 pt-1 border-t border-indigo-100/80">
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
            <span className="font-bold text-indigo-700">
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

        {/* Dynamic Lecturer Rows List (Always >= 2 rows) */}
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <label className="text-xs font-bold text-slate-800 uppercase tracking-wide">
              Danh sách phân công giảng viên:
            </label>
            <button
              type="button"
              onClick={handleAddRow}
              disabled={submitting}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 font-bold rounded-xl border border-indigo-200 text-xs transition cursor-pointer"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Thêm giảng viên</span>
            </button>
          </div>

          <div className="space-y-3 max-h-80 overflow-y-auto pr-1">
            {reviewerRows.map((row, idx) => {
              const selectedLec = lecturers.find((l) => l._id?.toString() === row.lecturerId);
              const hasPermKin = selectedLec?.permissions?.includes('GVPB_KIN');
              const hasPermHoidong = selectedLec?.permissions?.includes('GVPB_HOIDONG');
              const isBoth = row.isPrivateReviewer && row.isCouncilReviewer;

              return (
                <div
                  key={row.id}
                  className={`p-3.5 rounded-2xl border transition-all duration-150 space-y-2.5 ${
                    isBoth
                      ? 'bg-gradient-to-r from-violet-50/70 to-amber-50/70 border-indigo-300 ring-1 ring-indigo-400/30'
                      : row.isPrivateReviewer
                      ? 'bg-violet-50/40 border-violet-200'
                      : row.isCouncilReviewer
                      ? 'bg-amber-50/40 border-amber-200'
                      : 'bg-white border-slate-200 shadow-2xs'
                  }`}
                >
                  {/* Row Header & Delete button */}
                  <div className="flex items-center justify-between">
                    <span className="font-bold text-slate-700 text-xs flex items-center gap-1.5">
                      <span className="w-5 h-5 rounded-lg bg-indigo-100 text-indigo-700 font-bold text-[11px] flex items-center justify-center">
                        {idx + 1}
                      </span>
                      <span>Giảng viên {idx + 1}</span>
                    </span>

                    {reviewerRows.length > 2 && (
                      <button
                        type="button"
                        onClick={() => handleRemoveRow(row.id)}
                        disabled={submitting}
                        title="Xóa giảng viên này khỏi danh sách phân công"
                        className="text-slate-400 hover:text-rose-600 p-1 rounded-lg hover:bg-rose-50 transition cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>

                  {/* Lecturer Select Dropdown */}
                  <div>
                    <select
                      value={row.lecturerId}
                      onChange={(e) => handleLecturerChange(row.id, e.target.value)}
                      disabled={loadingLecturers || submitting}
                      className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 font-medium focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    >
                      <option value="">-- Chọn giảng viên phản biện --</option>
                      {lecturers.map((lec) => {
                        const isSupervisor = lec._id.toString() === supervisorIdStr;
                        return (
                          <option key={lec._id} value={lec._id} disabled={isSupervisor}>
                            {lec.academicTitle ? `${lec.academicTitle} ` : 'ThS. '}
                            {lec.userId?.fullName || 'Giảng viên'} — {lec.specialization || 'CNTT'} ({lec.lecturerCode})
                            {isSupervisor ? ' (Là GVHD - Không thể chọn)' : ''}
                          </option>
                        );
                      })}
                    </select>
                  </div>

                  {/* Two Independent Checkboxes: PB KÍN & PB HỘI ĐỒNG */}
                  <div className="flex flex-wrap items-center gap-3 pt-1">
                    {/* Checkbox PB KÍN */}
                    <label
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold select-none transition cursor-pointer ${
                        row.isPrivateReviewer
                          ? 'bg-violet-600 border-violet-600 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={row.isPrivateReviewer}
                        disabled={submitting}
                        onChange={() => handleTogglePrivate(row.id)}
                        className="sr-only"
                      />
                      <span
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition ${
                          row.isPrivateReviewer ? 'bg-white border-white text-violet-600' : 'border-slate-400'
                        }`}
                      >
                        {row.isPrivateReviewer && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <span>PB KÍN (30%)</span>
                    </label>

                    {/* Checkbox PB HỘI ĐỒNG */}
                    <label
                      className={`inline-flex items-center gap-1.5 px-3 py-2 rounded-xl border text-xs font-semibold select-none transition cursor-pointer ${
                        row.isCouncilReviewer
                          ? 'bg-amber-600 border-amber-600 text-white shadow-xs'
                          : 'bg-slate-50 hover:bg-slate-100 border-slate-200 text-slate-700'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={row.isCouncilReviewer}
                        disabled={submitting}
                        onChange={() => handleToggleCouncil(row.id)}
                        className="sr-only"
                      />
                      <span
                        className={`w-3.5 h-3.5 rounded border flex items-center justify-center transition ${
                          row.isCouncilReviewer ? 'bg-white border-white text-amber-600' : 'border-slate-400'
                        }`}
                      >
                        {row.isCouncilReviewer && <Check className="w-3 h-3 stroke-[3]" />}
                      </span>
                      <span>PB HỘI ĐỒNG (30%)</span>
                    </label>
                  </div>

                  {/* Real-time Permission Feedback for this row */}
                  {row.lecturerId && (row.isPrivateReviewer || row.isCouncilReviewer) && (
                    <div className="pt-1.5 border-t border-slate-100/80 flex flex-wrap items-center justify-between gap-1 text-[10.5px]">
                      <div className="flex items-center gap-2">
                        {row.isPrivateReviewer && (
                          <span className="inline-flex items-center gap-1 text-violet-700 font-medium">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Quyền: <strong>GVPB_KIN</strong></span>
                            {hasPermKin ? (
                              <span className="text-emerald-600 font-bold">(✓ Đã có)</span>
                            ) : (
                              <span className="text-indigo-600">(→ Tự cấp khi lưu)</span>
                            )}
                          </span>
                        )}
                        {row.isPrivateReviewer && row.isCouncilReviewer && <span>•</span>}
                        {row.isCouncilReviewer && (
                          <span className="inline-flex items-center gap-1 text-amber-800 font-medium">
                            <ShieldCheck className="w-3 h-3" />
                            <span>Quyền: <strong>GVPB_HOIDONG</strong></span>
                            {hasPermHoidong ? (
                              <span className="text-emerald-600 font-bold">(✓ Đã có)</span>
                            ) : (
                              <span className="text-indigo-600">(→ Tự cấp khi lưu)</span>
                            )}
                          </span>
                        )}
                      </div>

                      {isBoth && (
                        <span className="font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded border border-indigo-100">
                          ★ Đảm nhiệm cả 2 vai trò phản biện (PB Kín & PB Hội đồng)
                        </span>
                      )}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Informational Guidance */}
        <div className="p-3 rounded-xl bg-slate-50 border border-slate-200 text-[11px] text-slate-600 leading-relaxed">
          <div className="font-semibold text-slate-800 flex items-center gap-1 mb-0.5">
            <Info className="w-3.5 h-3.5 text-indigo-600" />
            <span>Quy tắc phân công & vị trí hiển thị:</span>
          </div>
          • Mỗi giảng viên có 2 checkbox độc lập: <strong>[PB KÍN]</strong> và <strong>[PB HỘI ĐỒNG]</strong>.
          <br />
          • Có thể phân công nhiều giảng viên cùng làm PB Kín, hoặc nhiều giảng viên cùng làm PB Hội đồng.
          <br />
          • Bảng bên ngoài sẽ hiển thị tất cả các giảng viên tương ứng ở mục <strong>PB KÍN:</strong> và <strong>PB HỘI ĐỒNG:</strong>.
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
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-5 py-2 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
          >
            <UserCheck className="w-3.5 h-3.5" />
            <span>{submitting ? 'Đang lưu...' : 'Lưu phân công phản biện'}</span>
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default AssignReviewersModal;
