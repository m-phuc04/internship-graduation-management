import React, { useState, useEffect, useCallback } from 'react';
import thesisApi from '../../api/thesisApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';

import {
  Award,
  GraduationCap,
  Users,
  CheckCircle2,
  Clock,
  RefreshCw,
  Eye,
  Check,
  AlertCircle,
  FileText,
  UserCheck,
  Percent,
} from 'lucide-react';

const STATUS_OPTIONS = [
  { value: 'ALL', label: 'Tất cả' },
  { value: 'ASSIGNED_REVIEWERS', label: 'Đã gán PB' },
  { value: 'IN_PROGRESS', label: 'Đang thực hiện' },
  { value: 'GRADED', label: 'Đã có điểm (GRADED)' },
  { value: 'COMPLETED', label: 'Hoàn tất (COMPLETED)' },
];

const TbmThesisEvaluationManagement = () => {
  const { currentTerm } = useAcademicTerm();
  const [theses, setTheses] = useState([]);
  const [stats, setStats] = useState({
    totalEligible: 0,
    gradedCount: 0,
    completedCount: 0,
    pendingGradeCount: 0,
  });
  const [loading, setLoading] = useState(true);

  // Search & Filter
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('ALL');

  // Complete Dialog
  const [completeDialogOpen, setCompleteDialogOpen] = useState(false);
  const [thesisToComplete, setThesisToComplete] = useState(null);
  const [actionLoading, setActionLoading] = useState(false);

  // Detail Modal
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [selectedThesis, setSelectedThesis] = useState(null);

  const { showToast } = useToast();

  const fetchEvaluations = useCallback(async () => {
    setLoading(true);
    try {
      const res = await thesisApi.getEvaluations({
        search,
        status: statusFilter,
        academicTermId: currentTerm?._id || '',
      });

      if (res.success) {
        setTheses(res.data || []);
        if (res.stats) setStats(res.stats);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách đánh giá khóa luận', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, statusFilter, currentTerm?._id, showToast]);

  useEffect(() => {
    fetchEvaluations();
  }, [fetchEvaluations]);

  // Handle Complete Thesis Evaluation
  const handleConfirmComplete = async () => {
    if (!thesisToComplete) return;

    setActionLoading(true);
    try {
      const res = await thesisApi.completeEvaluation(thesisToComplete._id);
      if (res.success) {
        showToast('Đã hoàn tất đánh giá và nghiệm thu khóa luận tốt nghiệp!', 'success');
        setCompleteDialogOpen(false);
        setThesisToComplete(null);
        fetchEvaluations();
      }
    } catch (err) {
      showToast(err.message || 'Hoàn tất đánh giá thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetail = (item) => {
    setSelectedThesis(item);
    setDetailModalOpen(true);
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-indigo-600 to-violet-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-200 shrink-0">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  Quản Lý Đánh Giá Khóa Luận Tốt Nghiệp (KLTN)
                </h1>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Theo dõi bảng điểm đánh giá của Giảng viên hướng dẫn (40%) và Hội đồng Phản biện 1 & 2 (30% + 30%).
              </p>
            </div>
          </div>

          <button
            onClick={fetchEvaluations}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
            <div className="text-[11px] text-slate-500 font-medium">Đủ điều kiện hội đồng</div>
            <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{stats.totalEligible}</div>
            <div className="text-[10px] text-slate-400 mt-0.5">Đã gán đủ PB1 & PB2</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-amber-50/80 border border-amber-200/80">
            <div className="text-[11px] text-amber-700 font-medium">Chờ chấm điểm</div>
            <div className="text-lg font-bold text-amber-700 font-mono mt-0.5">{stats.pendingGradeCount}</div>
            <div className="text-[10px] text-amber-600 mt-0.5">Thiếu 1 hoặc nhiều điểm</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200/80">
            <div className="text-[11px] text-emerald-700 font-medium">Đã có điểm tổng kết</div>
            <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{stats.gradedCount}</div>
            <div className="text-[10px] text-emerald-600 mt-0.5">Đủ cả 3 cột điểm</div>
          </div>

          <div className="p-3.5 rounded-2xl bg-indigo-50/80 border border-indigo-200/80">
            <div className="text-[11px] text-indigo-700 font-medium">Đã hoàn tất bảo vệ</div>
            <div className="text-lg font-bold text-indigo-700 font-mono mt-0.5">{stats.completedCount}</div>
            <div className="text-[10px] text-indigo-600 mt-0.5">COMPLETED</div>
          </div>
        </div>
      </div>

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row items-center justify-between gap-4">
        <div className="w-full md:w-96">
          <SearchInput
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder="Tìm MSSV SV1, SV2, Tên SV, Tên đề tài, GVHD, PB..."
          />
        </div>

        <div className="flex flex-wrap items-center gap-1.5 bg-slate-100 p-1 rounded-2xl">
          {STATUS_OPTIONS.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => setStatusFilter(opt.value)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold transition ${
                statusFilter === opt.value
                  ? 'bg-white text-indigo-700 shadow-2xs font-bold'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={6} />
          </div>
        ) : theses.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Không có đề tài nào đủ điều kiện đánh giá"
              description="Chỉ những đề tài KLTN đã được phân công đủ cả 2 giảng viên phản biện (PB1 và PB2) mới hiển thị trong mục này."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Tên đề tài KLTN</th>
                  <th className="py-3.5 px-4">Sinh viên thực hiện</th>
                  <th className="py-3.5 px-4">Hội đồng (GVHD | PB Kín | PB Hội đồng)</th>
                  <th className="py-3.5 px-4">Bảng điểm thành phần</th>
                  <th className="py-3.5 px-4">Điểm Tổng Kết</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {theses.map((item) => {
                  const s = item.scores || {};
                  const isFullyGraded = s.finalScore !== null && s.finalScore !== undefined;
                  const isCompleted = item.status === 'COMPLETED';

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition">
                      {/* Title */}
                      <td className="py-3.5 px-4 min-w-[260px] max-w-sm" title={item.thesisTitle}>
                        <strong className="text-slate-900 line-clamp-2 leading-snug hover:text-indigo-600 transition">
                          {item.thesisTitle}
                        </strong>
                        <span className="inline-flex items-center gap-1 text-[10px] font-medium text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded font-mono mt-1">
                          {item.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                        </span>
                      </td>

                      {/* Students */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1">
                          <div className="flex items-center gap-1.5">
                            <span className="w-1.5 h-1.5 rounded-full bg-indigo-600" />
                            <strong className="text-slate-900">{item.studentId?.userId?.fullName}</strong>
                            <span className="text-[10px] font-mono text-slate-500">({item.studentId?.studentCode})</span>
                          </div>
                          {item.studentCount === 2 && item.secondStudentId && (
                            <div className="flex items-center gap-1.5">
                              <span className="w-1.5 h-1.5 rounded-full bg-violet-600" />
                              <strong className="text-slate-900">{item.secondStudentId?.userId?.fullName}</strong>
                              <span className="text-[10px] font-mono text-slate-500">({item.secondStudentId?.studentCode})</span>
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Committee */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5 text-[11px]">
                          <div>
                            <span className="text-slate-400">GVHD: </span>
                            <strong className="text-slate-900">{item.supervisorId?.academicTitle ? `${item.supervisorId.academicTitle} ` : ''}{item.supervisorId?.userId?.fullName}</strong>
                          </div>
                          <div>
                            <span className="text-violet-700 font-semibold">PB KÍN: </span>
                            {(() => {
                              let names = [];
                              if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
                                names = item.reviewers
                                  .filter((r) => r.isPrivateReviewer && r.lecturerId)
                                  .map((r) => `${r.lecturerId.academicTitle ? r.lecturerId.academicTitle + ' ' : ''}${r.lecturerId.userId?.fullName || 'Giảng viên'}`);
                              }
                              if (names.length === 0 && item.reviewer1Id) {
                                names = [`${item.reviewer1Id.academicTitle ? item.reviewer1Id.academicTitle + ' ' : ''}${item.reviewer1Id.userId?.fullName || 'Giảng viên'}`];
                              }
                              return names.length > 0 ? (
                                <span className="text-slate-800 font-medium">{names.join(', ')}</span>
                              ) : (
                                <span className="text-amber-600 italic">Chưa có</span>
                              );
                            })()}
                          </div>
                          <div>
                            <span className="text-amber-700 font-semibold">PB HỘI ĐỒNG: </span>
                            {(() => {
                              let names = [];
                              if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
                                names = item.reviewers
                                  .filter((r) => r.isCouncilReviewer && r.lecturerId)
                                  .map((r) => `${r.lecturerId.academicTitle ? r.lecturerId.academicTitle + ' ' : ''}${r.lecturerId.userId?.fullName || 'Giảng viên'}`);
                              }
                              if (names.length === 0 && item.reviewer2Id) {
                                names = [`${item.reviewer2Id.academicTitle ? item.reviewer2Id.academicTitle + ' ' : ''}${item.reviewer2Id.userId?.fullName || 'Giảng viên'}`];
                              }
                              return names.length > 0 ? (
                                <span className="text-slate-800 font-medium">{names.join(', ')}</span>
                              ) : (
                                <span className="text-amber-600 italic">Chưa có</span>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* Scores Breakdown */}
                      <td className="py-3.5 px-4 whitespace-nowrap font-mono">
                        <div className="space-y-0.5 text-[11px]">
                          <div>
                            GVHD (40%): <strong>{s.supervisorScore !== null ? `${s.supervisorScore}` : '—'}</strong>
                          </div>
                          <div>
                            PB Kín (30%): <strong>{s.reviewer1Score !== null ? `${s.reviewer1Score}` : '—'}</strong> • PB Hội đồng (30%): <strong>{s.reviewer2Score !== null ? `${s.reviewer2Score}` : '—'}</strong>
                          </div>
                        </div>
                      </td>

                      {/* Final Score */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {isFullyGraded ? (
                          <div className="inline-flex items-center gap-1 px-2.5 py-1 rounded-xl bg-emerald-50 text-emerald-800 border border-emerald-200 font-mono font-extrabold text-xs">
                            <Award className="w-3.5 h-3.5 text-emerald-600" />
                            <span>{s.finalScore}/10</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 text-xs italic">Chờ chấm đủ</span>
                        )}
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status} size="sm" />
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right space-x-1.5">
                        <button
                          type="button"
                          onClick={() => handleOpenDetail(item)}
                          className="p-1.5 text-slate-500 hover:text-slate-900 hover:bg-slate-100 rounded-lg transition"
                          title="Xem chi tiết nhận xét & điểm"
                        >
                          <Eye className="w-4 h-4" />
                        </button>

                        {isFullyGraded && !isCompleted && (
                          <button
                            type="button"
                            onClick={() => {
                              setThesisToComplete(item);
                              setCompleteDialogOpen(true);
                            }}
                            className="inline-flex items-center gap-1 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition text-xs"
                          >
                            <Check className="w-3.5 h-3.5" />
                            <span>Hoàn tất KLTN</span>
                          </button>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Confirm Complete Dialog */}
      <ConfirmDialog
        isOpen={completeDialogOpen}
        onClose={() => setCompleteDialogOpen(false)}
        onConfirm={handleConfirmComplete}
        title="Xác Nhận Nghiệm Thu & Hoàn Tất Khóa Luận"
        message={`Bạn có chắc chắn muốn xác nhận hoàn tất bảo vệ khóa luận cho đề tài "${thesisToComplete?.thesisTitle}" với điểm tổng kết ${thesisToComplete?.scores?.finalScore}/10?`}
        confirmText="Xác nhận Hoàn tất"
        loading={actionLoading}
      />

      {/* Detail Modal */}
      <Modal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        title="Chi Tiết Đánh Giá Khóa Luận Tốt Nghiệp"
        maxWidth="max-w-2xl"
      >
        {selectedThesis && (
          <div className="space-y-4 text-xs">
            {/* Title & Members */}
            <div className="p-4 rounded-2xl bg-indigo-50/70 border border-indigo-200/80 space-y-2">
              <h3 className="font-bold text-slate-900 text-sm leading-snug">{selectedThesis.thesisTitle}</h3>
              <div className="text-slate-600 text-xs flex flex-wrap items-center gap-2">
                <span>SV1: <strong>{selectedThesis.studentId?.userId?.fullName}</strong> ({selectedThesis.studentId?.studentCode})</span>
                {selectedThesis.studentCount === 2 && selectedThesis.secondStudentId && (
                  <>
                    <span>•</span>
                    <span>SV2: <strong>{selectedThesis.secondStudentId?.userId?.fullName}</strong> ({selectedThesis.secondStudentId?.studentCode})</span>
                  </>
                )}
              </div>
            </div>

            {/* Score & Formula Box */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 space-y-3">
              <div className="font-bold text-slate-800 text-xs uppercase tracking-wider flex items-center justify-between">
                <span>Bảng điểm chi tiết</span>
                {selectedThesis.scores?.finalScore !== null && (
                  <span className="font-mono text-emerald-700 text-sm font-extrabold bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                    Điểm Tổng Kết: {selectedThesis.scores?.finalScore}/10
                  </span>
                )}
              </div>

              {/* 3 Columns */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                {/* GVHD */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                  <div className="text-[11px] text-slate-500 font-semibold">1. Giảng viên Hướng dẫn (40%)</div>
                  <div className="font-bold text-slate-900">
                    {selectedThesis.supervisorId?.academicTitle} {selectedThesis.supervisorId?.userId?.fullName}
                  </div>
                  <div className="text-base font-mono font-extrabold text-indigo-700">
                    {selectedThesis.scores?.supervisorScore !== null ? `${selectedThesis.scores?.supervisorScore}/10` : 'Chưa chấm'}
                  </div>
                  {selectedThesis.supervisorComment && (
                    <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100 mt-1">
                      "{selectedThesis.supervisorComment}"
                    </p>
                  )}
                </div>

                {/* PB Kín */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                  <div className="text-[11px] text-violet-700 font-semibold">2. PB Kín (30%)</div>
                  <div className="font-bold text-slate-900">
                    {selectedThesis.reviewer1Id ? `${selectedThesis.reviewer1Id.academicTitle ? selectedThesis.reviewer1Id.academicTitle + ' ' : ''}${selectedThesis.reviewer1Id.userId?.fullName || 'Giảng viên'}` : 'Chưa có'}
                  </div>
                  <div className="text-base font-mono font-extrabold text-violet-700">
                    {selectedThesis.scores?.reviewer1Score !== null ? `${selectedThesis.scores?.reviewer1Score}/10` : 'Chưa chấm'}
                  </div>
                  {selectedThesis.reviewer1Comment && (
                    <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100 mt-1">
                      "{selectedThesis.reviewer1Comment}"
                    </p>
                  )}
                </div>

                {/* PB Hội đồng */}
                <div className="p-3 rounded-xl bg-white border border-slate-200 space-y-1">
                  <div className="text-[11px] text-amber-700 font-semibold">3. PB Hội đồng (30%)</div>
                  <div className="font-bold text-slate-900">
                    {selectedThesis.reviewer2Id ? `${selectedThesis.reviewer2Id.academicTitle ? selectedThesis.reviewer2Id.academicTitle + ' ' : ''}${selectedThesis.reviewer2Id.userId?.fullName || 'Giảng viên'}` : 'Chưa có'}
                  </div>
                  <div className="text-base font-mono font-extrabold text-amber-700">
                    {selectedThesis.scores?.reviewer2Score !== null ? `${selectedThesis.scores?.reviewer2Score}/10` : 'Chưa chấm'}
                  </div>
                  {selectedThesis.reviewer2Comment && (
                    <p className="text-[11px] text-slate-600 italic bg-slate-50 p-2 rounded border border-slate-100 mt-1">
                      "{selectedThesis.reviewer2Comment}"
                    </p>
                  )}
                </div>
              </div>

              <div className="text-[11px] text-slate-500 text-center pt-2 border-t border-slate-200">
                Công thức: <code>Điểm tổng kết = Điểm GVHD × 0.4 + Điểm PB Kín × 0.3 + Điểm PB Hội đồng × 0.3</code>
              </div>
            </div>

            {/* Modal Actions */}
            <div className="flex items-center justify-end pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};

export default TbmThesisEvaluationManagement;
