import React, { useState, useEffect, useCallback } from 'react';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { useToast } from '../../context/ToastContext';
import councilApi from '../../api/councilApi';
import AssignCouncilModal from './AssignCouncilModal';
import CreateCouncilModal from './CreateCouncilModal';

import {
  Users,
  Plus,
  Minus,
  UserCheck,
  Trash2,
  Award,
  Layers,
  Sparkles,
  ShieldCheck,
  CheckCircle2,
  Clock,
  Pencil,
} from 'lucide-react';

const CouncilManagementSection = ({ theses = [] }) => {
  const { currentTerm } = useAcademicTerm();
  const { showToast } = useToast();

  const storageKey = `tbm_councils_${currentTerm?._id || 'default'}`;
  const colsStorageKey = `tbm_council_cols_${currentTerm?._id || 'default'}`;

  const [councils, setCouncils] = useState([]);
  const [loading, setLoading] = useState(false);

  const fetchCouncils = useCallback(async () => {
    setLoading(true);
    try {
      const res = await councilApi.getAll({ academicTermId: currentTerm?._id || '' });
      if (res.success) {
        const list = (res.data || []).map((c) => ({
          ...c,
          id: c._id || c.id,
          name: (c.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim(),
          lecturers: Array.isArray(c.lecturers)
            ? c.lecturers.map((l) => ({
                ...l,
                lecturerId: l.lecturerId?._id || l.lecturerId?.id || l.lecturerId,
                id: l.lecturerId?._id || l.lecturerId?.id || l.lecturerId || l.id,
                _id: l.lecturerId?._id || l.lecturerId?.id || l.lecturerId || l._id,
                userId: l.lecturerId?.userId?._id || l.lecturerId?.userId || l.userId,
                fullName: l.lecturerId?.userId?.fullName || l.fullName || 'Giảng viên',
                academicTitle: l.lecturerId?.academicTitle || l.academicTitle || 'ThS.',
                lecturerCode: l.lecturerId?.lecturerCode || l.lecturerCode || '',
                email: l.lecturerId?.userId?.email || l.email || '',
              }))
            : [],
        }));
        setCouncils(list);
        try {
          localStorage.setItem(storageKey, JSON.stringify(list));
          localStorage.setItem('tbm_councils_default', JSON.stringify(list));
        } catch {}
      }
    } catch (err) {
      console.warn('Error fetching councils from MongoDB:', err.message);
    } finally {
      setLoading(false);
    }
  }, [currentTerm?._id, storageKey]);

  useEffect(() => {
    fetchCouncils();
  }, [fetchCouncils]);

  const [lecturerColumnCount, setLecturerColumnCount] = useState(() => {
    try {
      const savedCols = localStorage.getItem(colsStorageKey) || localStorage.getItem('tbm_council_cols_default');
      if (savedCols) {
        const num = parseInt(savedCols, 10);
        if (!isNaN(num) && num >= 2) return num;
      }
    } catch {
      // fallback
    }
    return 2;
  });

  const [createCouncilModalOpen, setCreateCouncilModalOpen] = useState(false);
  const [assignCouncilModalOpen, setAssignCouncilModalOpen] = useState(false);
  const [targetCouncil, setTargetCouncil] = useState(null);
  const [editingCouncil, setEditingCouncil] = useState(null);

  const handleClearAllCouncils = async () => {
    if (window.confirm('Bạn có chắc chắn muốn xóa TOÀN BỘ danh sách phòng hội đồng và các phân công liên quan để nhập lại từ đầu không?')) {
      try {
        await councilApi.clearAll({ academicTermId: currentTerm?._id || '' });
        localStorage.removeItem(storageKey);
        localStorage.removeItem('tbm_councils_default');
        for (let i = 0; i < localStorage.length; i++) {
          const k = localStorage.key(i);
          if (k && (k.startsWith('tbm_councils_') || k.startsWith('tbm_thesis_councils_') || k.startsWith('tbm_published_scores_') || k.startsWith('tbm_council_cols_'))) {
            localStorage.removeItem(k);
          }
        }
        localStorage.setItem(storageKey, JSON.stringify([]));
        localStorage.setItem('tbm_councils_default', JSON.stringify([]));
        localStorage.setItem(`tbm_thesis_councils_${currentTerm?._id || 'default'}`, JSON.stringify({}));
        localStorage.setItem('tbm_thesis_councils_default', JSON.stringify({}));
        setCouncils([]);
        window.dispatchEvent(new Event('storage'));
        showToast('Đã xóa toàn bộ dữ liệu phòng hội đồng và phân công đề tài!', 'success');
      } catch (err) {
        showToast(err.message || 'Lỗi khi xóa toàn bộ phòng hội đồng', 'error');
      }
    }
  };

  const handleAddLecturerColumn = () => {
    setLecturerColumnCount((prev) => {
      const next = prev + 1;
      try {
        localStorage.setItem(colsStorageKey, String(next));
        localStorage.setItem('tbm_council_cols_default', String(next));
      } catch {}
      showToast(`Đã thêm cột Giảng viên ${next}`, 'info');
      return next;
    });
  };

  const handleRemoveLecturerColumn = () => {
    if (lecturerColumnCount <= 2) {
      showToast('Tối thiểu bảng phải có 2 giảng viên hội đồng', 'warning');
      return;
    }
    setLecturerColumnCount((prev) => {
      const next = prev - 1;
      try {
        localStorage.setItem(colsStorageKey, String(next));
        localStorage.setItem('tbm_council_cols_default', String(next));
      } catch {}
      showToast(`Đã xóa cột giảng viên (còn ${next} GV)`, 'info');
      return next;
    });
  };

  const handleCouncilSaved = async (savedCouncil) => {
    const sId = editingCouncil?._id || editingCouncil?.id || savedCouncil.id || savedCouncil._id;
    try {
      if (editingCouncil && sId) {
        await councilApi.update(sId, {
          ...savedCouncil,
          academicTermId: currentTerm?._id || null,
        });
        showToast(`Đã cập nhật ${savedCouncil.name || 'hội đồng'} thành công!`, 'success');
      } else {
        await councilApi.create({
          ...savedCouncil,
          academicTermId: currentTerm?._id || null,
        });
        showToast(`Đã tạo ${savedCouncil.name || 'hội đồng'} mới thành công!`, 'success');
      }
      setEditingCouncil(null);
      await fetchCouncils();
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu phòng hội đồng', 'error');
    }
  };

  const handleSaveCouncilFromAssign = async (councilId, updatedCouncil) => {
    try {
      const cId = updatedCouncil._id || updatedCouncil.id || councilId;
      await councilApi.update(cId, {
        ...updatedCouncil,
        academicTermId: currentTerm?._id || null,
      });
      await fetchCouncils();
      window.dispatchEvent(new Event('storage'));
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu phân công giảng viên', 'error');
    }
  };

  const handleDeleteCouncil = async (councilId, councilName) => {
    const cleanName = (councilName || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim();
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${cleanName}" không?`)) {
      try {
        await councilApi.delete(councilId);

        // Clean up any local thesis assignments
        try {
          for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (k && (k.startsWith('tbm_thesis_councils') || k.includes('thesis_council'))) {
              try {
                const cur = JSON.parse(localStorage.getItem(k) || '{}');
                let changed = false;
                Object.keys(cur).forEach((tid) => {
                  if (String(cur[tid]) === String(councilId)) {
                    delete cur[tid];
                    changed = true;
                  }
                });
                if (changed) {
                  localStorage.setItem(k, JSON.stringify(cur));
                }
              } catch {}
            }
          }
        } catch {}

        showToast(`Đã xóa ${cleanName}`, 'info');
        await fetchCouncils();
        window.dispatchEvent(new Event('storage'));
      } catch (err) {
        showToast(err.message || 'Lỗi khi xóa phòng hội đồng', 'error');
      }
    }
  };

  const handleOpenAssignModal = (council) => {
    setTargetCouncil(council);
    setAssignCouncilModalOpen(true);
  };

  const handleOpenEditModal = (council) => {
    setEditingCouncil(council);
    setCreateCouncilModalOpen(true);
  };

  const handleOpenCreateModal = () => {
    setEditingCouncil(null);
    setCreateCouncilModalOpen(true);
  };

  const calculateCouncilAverageScore = (council) => {
    if (!council.lecturers || council.lecturers.length === 0) return null;
    const validScores = council.lecturers
      .map((l) => l.score)
      .filter((s) => s !== null && s !== undefined && !isNaN(s));

    if (validScores.length === 0) return null;
    const sum = validScores.reduce((acc, curr) => acc + Number(curr), 0);
    return Number((sum / validScores.length).toFixed(2));
  };

  return (
    <div className="space-y-4">
      {/* Table Header Section */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#123891] to-[#1B4DA1] text-white flex items-center justify-center font-bold shadow-sm shadow-blue-200 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Phòng Hội Đồng Đánh Giá Khóa Luận
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          {councils.length > 0 && (
            <button
              type="button"
              onClick={handleClearAllCouncils}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-rose-50 hover:bg-rose-100 text-[#c5221f] text-xs font-bold rounded-xl border border-rose-200 transition cursor-pointer"
              title="Xóa toàn bộ các phòng hội đồng để nhập lại từ đầu"
            >
              <Trash2 className="w-3.5 h-3.5 text-[#c5221f]" />
              <span>Xóa tất cả phòng</span>
            </button>
          )}

          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            title="Tạo phòng hội đồng đánh giá mới"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm hội đồng</span>
          </button>
        </div>
      </div>

      {/* Council Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {councils.length === 0 ? (
          <div className="p-8 text-center space-y-2">
            <Users className="w-10 h-10 text-slate-300 mx-auto" />
            <div className="text-sm font-bold text-slate-700">Chưa có phòng hội đồng nào</div>
            <p className="text-xs text-slate-400">
              Bấm nút "+ Thêm hội đồng" ở trên để tạo phòng hội đồng đánh giá khóa luận đầu tiên.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4 text-center w-12">STT</th>
                  <th className="py-3.5 px-4 min-w-[150px]">Phòng hội đồng</th>
                  <th className="py-3.5 px-4 min-w-[140px] text-center">Hình thức</th>
                  <th className="py-3.5 px-4 min-w-[170px] text-center">Thời gian báo cáo</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Giảng viên 1</th>
                  <th className="py-3.5 px-4 min-w-[160px]">Giảng viên 2</th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {councils.map((c, idx) => {
                  const cleanName = (c.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim();
                  const lec1 = c.lecturers?.[0];
                  const lec2 = c.lecturers?.[1];

                  return (
                    <tr key={c.id} className="hover:bg-slate-50/80 transition">
                      <td className="py-3.5 px-4 text-center text-slate-400 font-mono font-semibold">
                        {idx + 1}
                      </td>

                      <td className="py-3.5 px-4">
                        <strong className="text-slate-900 block font-bold leading-snug">
                          {cleanName}
                        </strong>
                        <div className="text-[10px] text-slate-400 font-mono mt-0.5">
                          Phòng: {c.room || '—'}
                        </div>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        <span
                          className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-bold border ${
                            c.type === 'POSTER'
                              ? 'bg-blue-50 text-[#102d7d] border-blue-200'
                              : 'bg-blue-50 text-[#102d7d] border-blue-200'
                          }`}
                        >
                          {c.type === 'POSTER' ? 'Báo cáo Poster' : 'Báo cáo Oral'}
                        </span>
                      </td>

                      <td className="py-3.5 px-4 text-center whitespace-nowrap">
                        {c.reportTime ? (
                          <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-xs font-semibold bg-slate-100 text-slate-700 border border-slate-200">
                            <Clock className="w-3.5 h-3.5 text-[#123891]" />
                            <span>{c.reportTime}</span>
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">—</span>
                        )}
                      </td>

                      {/* Giảng viên 1 */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {lec1 ? (
                          <div>
                            <div className="font-semibold text-slate-900">
                              {lec1.fullName}
                            </div>
                            {lec1.lecturerCode && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Mã GV: {lec1.lecturerCode}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Chưa phân công
                          </span>
                        )}
                      </td>

                      {/* Giảng viên 2 */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {lec2 ? (
                          <div>
                            <div className="font-semibold text-slate-900">
                              {lec2.fullName}
                            </div>
                            {lec2.lecturerCode && (
                              <div className="text-[10px] text-slate-400 font-mono">
                                Mã GV: {lec2.lecturerCode}
                              </div>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">
                            Chưa phân công
                          </span>
                        )}
                      </td>

                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Phân công GV */}
                          <button
                            type="button"
                            onClick={() => handleOpenAssignModal(c)}
                            className="p-1.5 text-[#123891] hover:bg-blue-50 rounded-lg transition cursor-pointer"
                            title={`Phân công giảng viên cho ${cleanName}`}
                          >
                            <UserCheck className="w-4 h-4" />
                          </button>

                          {/* Chỉnh sửa thông tin hội đồng */}
                          <button
                            type="button"
                            onClick={() => handleOpenEditModal(c)}
                            className="p-1.5 text-amber-600 hover:bg-amber-50 rounded-lg transition cursor-pointer"
                            title={`Chỉnh sửa thông tin ${cleanName}`}
                          >
                            <Pencil className="w-4 h-4" />
                          </button>

                          {/* Xóa hội đồng */}
                          <button
                            type="button"
                            onClick={() => handleDeleteCouncil(c.id, cleanName)}
                            className="p-1.5 text-rose-500 hover:bg-rose-50 rounded-lg transition cursor-pointer"
                            title="Xóa phòng hội đồng này"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <CreateCouncilModal
        isOpen={createCouncilModalOpen}
        onClose={() => {
          setCreateCouncilModalOpen(false);
          setEditingCouncil(null);
        }}
        onCouncilSaved={handleCouncilSaved}
        existingCouncilCount={councils.length}
        councilToEdit={editingCouncil}
      />

      <AssignCouncilModal
        isOpen={assignCouncilModalOpen}
        onClose={() => setAssignCouncilModalOpen(false)}
        council={targetCouncil}
        allCouncils={councils}
        theses={theses}
        lecturerColumnCount={lecturerColumnCount}
        onSaveCouncil={handleSaveCouncilFromAssign}
      />
    </div>
  );
};

export default CouncilManagementSection;
