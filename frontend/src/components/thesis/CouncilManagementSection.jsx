import React, { useState, useEffect } from 'react';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { useToast } from '../../context/ToastContext';
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

  const getDefaultCouncils = () => [
    {
      id: 'council-1',
      name: 'Hội đồng 1',
      room: 'P1',
      type: 'ORAL',
      reportDate: '2026-06-20',
      reportStartTime: '08:00',
      reportEndTime: '11:30',
      reportTime: '08:00 - 11:30, 20/06/2026',
      description: 'Phòng bảo vệ trực tiếp P1',
      lecturers: [],
      createdAt: new Date().toISOString(),
    },
    {
      id: 'council-2',
      name: 'Hội đồng 2',
      room: 'P2',
      type: 'POSTER',
      reportDate: '2026-06-20',
      reportStartTime: '13:30',
      reportEndTime: '17:00',
      reportTime: '13:30 - 17:00, 20/06/2026',
      description: 'Khu vực bảo vệ Poster P2',
      lecturers: [],
      createdAt: new Date().toISOString(),
    },
  ];

  const [councils, setCouncils] = useState(() => {
    try {
      const saved = localStorage.getItem(storageKey);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (Array.isArray(parsed) && parsed.length > 0) {
          // Clean any parentheses from names
          return parsed.map((c) => ({
            ...c,
            name: (c.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim(),
            reportTime: c.reportTime || '',
            reportDate: c.reportDate || '',
            reportStartTime: c.reportStartTime || '',
            reportEndTime: c.reportEndTime || '',
          }));
        }
      }
    } catch {
      // fallback
    }
    return getDefaultCouncils();
  });

  const [lecturerColumnCount, setLecturerColumnCount] = useState(() => {
    try {
      const savedCols = localStorage.getItem(colsStorageKey);
      if (savedCols) {
        const num = parseInt(savedCols, 10);
        if (!isNaN(num) && num >= 2) return num;
      }
    } catch {
      // fallback
    }
    return 2;
  });

  useEffect(() => {
    try {
      localStorage.setItem(storageKey, JSON.stringify(councils));
    } catch {
      // ignore
    }
  }, [councils, storageKey]);

  useEffect(() => {
    try {
      localStorage.setItem(colsStorageKey, String(lecturerColumnCount));
    } catch {
      // ignore
    }
  }, [lecturerColumnCount, colsStorageKey]);

  const [createCouncilModalOpen, setCreateCouncilModalOpen] = useState(false);
  const [assignCouncilModalOpen, setAssignCouncilModalOpen] = useState(false);
  const [targetCouncil, setTargetCouncil] = useState(null);
  const [editingCouncil, setEditingCouncil] = useState(null);

  const handleAddLecturerColumn = () => {
    setLecturerColumnCount((prev) => {
      const next = prev + 1;
      showToast(`Đã thêm cột Giảng viên ${next} và Điểm GV ${next}`, 'info');
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
      showToast(`Đã xóa cột giảng viên (còn ${next} GV)`, 'info');
      return next;
    });
  };

  const handleCouncilSaved = (savedCouncil) => {
    if (editingCouncil) {
      setCouncils((prev) =>
        prev.map((c) => (c.id === savedCouncil.id ? savedCouncil : c))
      );
      setEditingCouncil(null);
    } else {
      setCouncils((prev) => [...prev, savedCouncil]);
    }
  };

  const handleSaveCouncilFromAssign = (councilId, updatedCouncil) => {
    setCouncils((prev) =>
      prev.map((c) => (c.id === councilId ? updatedCouncil : c))
    );
  };

  const handleDeleteCouncil = (councilId, councilName) => {
    const cleanName = (councilName || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim();
    if (window.confirm(`Bạn có chắc chắn muốn xóa "${cleanName}" không?`)) {
      setCouncils((prev) => prev.filter((c) => c.id !== councilId));
      showToast(`Đã xóa ${cleanName}`, 'info');
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
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-tr from-[#123891] to-indigo-600 text-white flex items-center justify-center font-bold shadow-sm shadow-blue-200 shrink-0">
            <Users className="w-5 h-5" />
          </div>
          <div>
            <h3 className="text-base font-bold text-slate-900 leading-tight">
              Phòng Hội Đồng Đánh Giá Khóa Luận
            </h3>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={handleOpenCreateModal}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            title="Tạo phòng hội đồng đánh giá mới"
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm hội đồng</span>
          </button>

          <button
            type="button"
            onClick={handleAddLecturerColumn}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            title={`Tăng thêm 1 giảng viên (hiện tại: ${lecturerColumnCount} GV)`}
          >
            <Plus className="w-3.5 h-3.5" />
            <span>Thêm giảng viên</span>
          </button>

          {lecturerColumnCount > 2 && (
            <button
              type="button"
              onClick={handleRemoveLecturerColumn}
              className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-slate-100 hover:bg-rose-50 text-slate-700 hover:text-rose-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
              title="Xóa 1 cột giảng viên"
            >
              <Minus className="w-3.5 h-3.5" />
              <span>Xóa GV</span>
            </button>
          )}
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

                  {Array.from({ length: lecturerColumnCount }).map((_, idx) => (
                    <React.Fragment key={idx}>
                      <th className="py-3.5 px-4 min-w-[150px]">
                        Giảng viên {idx + 1}
                      </th>
                      <th className="py-3.5 px-4 text-center min-w-[90px] whitespace-nowrap">
                        Điểm GV {idx + 1}
                      </th>
                    </React.Fragment>
                  ))}

                  <th className="py-3.5 px-4 text-center min-w-[110px] whitespace-nowrap">
                    Điểm Hội đồng
                  </th>
                  <th className="py-3.5 px-4 text-right whitespace-nowrap">
                    Thao tác
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {councils.map((c, idx) => {
                  const avgScore = calculateCouncilAverageScore(c);
                  const cleanName = (c.name || 'Hội đồng').replace(/\s*\([^)]*\)/g, '').trim();

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
                              ? 'bg-purple-50 text-purple-700 border-purple-200'
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

                      {Array.from({ length: lecturerColumnCount }).map((_, lIdx) => {
                        const lecData = c.lecturers?.[lIdx];

                        return (
                          <React.Fragment key={lIdx}>
                            <td className="py-3.5 px-4 whitespace-nowrap">
                              {lecData ? (
                                <div>
                                  <div className="font-semibold text-slate-900">
                                    {lecData.academicTitle ? `${lecData.academicTitle} ` : ''}
                                    {lecData.fullName}
                                  </div>
                                  {lecData.lecturerCode && (
                                    <div className="text-[10px] text-slate-400 font-mono">
                                      Mã GV: {lecData.lecturerCode}
                                    </div>
                                  )}
                                </div>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">
                                  Chưa phân công
                                </span>
                              )}
                            </td>

                            <td className="py-3.5 px-4 whitespace-nowrap text-center">
                              {lecData && lecData.score !== null && lecData.score !== undefined ? (
                                <span className="font-bold text-[#123891] font-mono text-xs bg-blue-50 px-2 py-0.5 rounded-lg border border-blue-100 shadow-2xs">
                                  {lecData.score}
                                </span>
                              ) : (
                                <span className="text-slate-400 italic text-[11px]">—</span>
                              )}
                            </td>
                          </React.Fragment>
                        );
                      })}

                      <td className="py-3.5 px-4 whitespace-nowrap text-center">
                        {avgScore !== null ? (
                          <span className="font-extrabold text-emerald-800 font-mono text-xs bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 shadow-2xs">
                            {avgScore} / 10
                          </span>
                        ) : (
                          <span className="text-slate-400 italic text-[11px]">Chưa có điểm</span>
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
