import React, { useState, useEffect, useCallback } from 'react';
import { useLocation } from 'react-router-dom';
import thesisApi from '../../api/thesisApi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import GradeThesisModal from '../../components/thesis/GradeThesisModal';
import UserNameClickable from '../../components/common/UserNameClickable';

import {
  Award,
  BookOpen,
  Users,
  User,
  CheckCircle2,
  Clock,
  RefreshCw,
  Search,
  Eye,
  Shield,
  Layers,
} from 'lucide-react';

const LecturerThesesPage = () => {
  const { user } = useAuth();
  const { showToast } = useToast();
  const { currentTerm } = useAcademicTerm();
  const location = useLocation();

  // Read initial tab from search query
  const getInitialTab = () => {
    if (location.search.includes('tab=reviewer2')) return 'REVIEWER_2';
    if (location.search.includes('tab=review') || location.search.includes('tab=reviewer1')) return 'REVIEWER_1';
    return 'SUPERVISOR';
  };

  const [activeTab, setActiveTab] = useState(getInitialTab); // 'SUPERVISOR', 'REVIEWER_1', 'REVIEWER_2'
  const [search, setSearch] = useState('');

  useEffect(() => {
    if (location.search.includes('tab=reviewer2')) {
      setActiveTab('REVIEWER_2');
    } else if (location.search.includes('tab=review') || location.search.includes('tab=reviewer1')) {
      setActiveTab('REVIEWER_1');
    } else if (location.search.includes('tab=supervisor')) {
      setActiveTab('SUPERVISOR');
    }
  }, [location.search]);
  const [data, setData] = useState({
    supervisedTheses: [],
    reviewer1Theses: [],
    reviewer2Theses: [],
    allTheses: [],
    stats: {
      supervisedCount: 0,
      reviewer1Count: 0,
      reviewer2Count: 0,
      totalAssigned: 0,
    },
  });
  const [loading, setLoading] = useState(true);

  // Grade Modal
  const [gradeModalOpen, setGradeModalOpen] = useState(false);
  const [selectedThesis, setSelectedThesis] = useState(null);

  // Accept & Reject Modals
  const [acceptModalOpen, setAcceptModalOpen] = useState(false);
  const [rejectModalOpen, setRejectModalOpen] = useState(false);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [targetThesis, setTargetThesis] = useState(null);
  const [rejectReason, setRejectReason] = useState('');
  const [actionLoading, setActionLoading] = useState(false);

  const fetchAssignedTheses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await thesisApi.getAssignedThesesForLecturer({
        roleType: 'ALL',
        search,
        academicTermId: currentTerm?._id || '',
      });

      if (res.success) {
        setData(res.data);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách đề tài khóa luận', 'error');
    } finally {
      setLoading(false);
    }
  }, [search, currentTerm?._id, showToast]);

  useEffect(() => {
    fetchAssignedTheses();
  }, [fetchAssignedTheses]);

  // Current list based on active tab with resilient fallback
  const supervisedTheses = data?.supervisedTheses || (data?.theses || []).filter((t) => t.isSupervisor) || [];
  const reviewer1Theses = data?.reviewer1Theses || (data?.theses || []).filter((t) => t.isReviewer1) || [];
  const reviewer2Theses = data?.reviewer2Theses || (data?.theses || []).filter((t) => t.isReviewer2) || [];

  const stats = {
    supervisedCount: data?.stats?.supervisedCount ?? supervisedTheses.length,
    reviewer1Count: data?.stats?.reviewer1Count ?? reviewer1Theses.length,
    reviewer2Count: data?.stats?.reviewer2Count ?? reviewer2Theses.length,
    totalAssigned: data?.stats?.totalAssigned ?? (data?.theses?.length || 0),
  };

  let currentList = [];
  if (activeTab === 'SUPERVISOR') {
    currentList = supervisedTheses;
  } else if (activeTab === 'REVIEWER_1') {
    currentList = reviewer1Theses;
  } else if (activeTab === 'REVIEWER_2') {
    currentList = reviewer2Theses;
  }

  const handleOpenGrade = (thesis) => {
    setSelectedThesis(thesis);
    setGradeModalOpen(true);
  };

  const handleOpenAccept = (thesis) => {
    setTargetThesis(thesis);
    setAcceptModalOpen(true);
  };

  const handleConfirmAccept = async () => {
    if (!targetThesis) return;
    setActionLoading(true);
    try {
      const res = await thesisApi.supervisorAccept(targetThesis._id);
      if (res.success) {
        showToast('Đã chấp nhận hướng dẫn đề tài khóa luận thành công!', 'success');
        setAcceptModalOpen(false);
        setTargetThesis(null);
        fetchAssignedTheses();
      }
    } catch (err) {
      showToast(err.message || 'Không thể chấp nhận hướng dẫn đề tài', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenReject = (thesis) => {
    setTargetThesis(thesis);
    setRejectReason('');
    setRejectModalOpen(true);
  };

  const handleConfirmReject = async (e) => {
    e.preventDefault();
    if (!rejectReason || !rejectReason.trim()) {
      showToast('Vui lòng nhập lý do từ chối hướng dẫn', 'warning');
      return;
    }
    if (!targetThesis) return;

    setActionLoading(true);
    try {
      const res = await thesisApi.supervisorReject(targetThesis._id, {
        reason: rejectReason.trim(),
      });
      if (res.success) {
        showToast('Đã từ chối hướng dẫn đề tài', 'info');
        setRejectModalOpen(false);
        setTargetThesis(null);
        setRejectReason('');
        fetchAssignedTheses();
      }
    } catch (err) {
      showToast(err.message || 'Không thể từ chối đề tài', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleOpenDetail = (thesis) => {
    setTargetThesis(thesis);
    setDetailModalOpen(true);
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-indigo-200 shrink-0">
              <Award className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h2 className="text-xl font-bold text-slate-900 leading-tight">
                  Quản Lý Hướng Dẫn & Phản Biện Khóa Luận (KLTN)
                </h2>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Theo dõi và đánh giá điểm số độc lập giữa Giảng viên hướng dẫn (GVHD) và Hội đồng phản biện (PB1 & PB2).
              </p>
            </div>
          </div>

          <button
            onClick={fetchAssignedTheses}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Làm mới</span>
          </button>
        </div>

        {/* 3 Role Tabs */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mt-6 pt-6 border-t border-slate-100">
          {/* Tab 1: Supervisor */}
          <button
            type="button"
            onClick={() => setActiveTab('SUPERVISOR')}
            className={`p-3.5 rounded-2xl border text-left transition ${
              activeTab === 'SUPERVISOR'
                ? 'bg-indigo-50/80 border-indigo-400 ring-2 ring-indigo-500/20'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-indigo-950 flex items-center gap-1.5">
                <BookOpen className="w-4 h-4 text-indigo-600" />
                1. Đề tài hướng dẫn (GVHD)
              </span>
              <span className="text-xs font-mono font-extrabold text-indigo-700 bg-white px-2 py-0.5 rounded-lg border border-indigo-200">
                {stats.supervisedCount}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Đề tài bạn phụ trách hướng dẫn chính (Trọng số 40%).
            </p>
          </button>

          {/* Tab 2: Reviewer 1 */}
          <button
            type="button"
            onClick={() => setActiveTab('REVIEWER_1')}
            className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
              activeTab === 'REVIEWER_1'
                ? 'bg-violet-50/80 border-violet-400 ring-2 ring-violet-500/20'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-violet-950 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-violet-600" />
                2. Phản biện kín (GVPB Kín)
              </span>
              <span className="text-xs font-mono font-extrabold text-violet-700 bg-white px-2 py-0.5 rounded-lg border border-violet-200">
                {stats.reviewer1Count}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Đề tài bạn được phân công phản biện kín (Trọng số 30%).
            </p>
          </button>

          {/* Tab 3: Reviewer 2 */}
          <button
            type="button"
            onClick={() => setActiveTab('REVIEWER_2')}
            className={`p-3.5 rounded-2xl border text-left transition cursor-pointer ${
              activeTab === 'REVIEWER_2'
                ? 'bg-purple-50/80 border-purple-400 ring-2 ring-purple-500/20'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                <Award className="w-4 h-4 text-purple-600" />
                3. Phản biện hội đồng (GVPB Hội đồng)
              </span>
              <span className="text-xs font-mono font-extrabold text-purple-700 bg-white px-2 py-0.5 rounded-lg border border-purple-200">
                {stats.reviewer2Count}
              </span>
            </div>
            <p className="text-[11px] text-slate-500 mt-1">
              Đề tài bạn được phân công phản biện hội đồng (Trọng số 30%).
            </p>
          </button>
        </div>
      </div>

      {/* Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex items-center justify-between gap-3">
        <div className="w-full sm:w-96">
          <SearchInput
            value={search}
            onChange={(val) => setSearch(val)}
            placeholder="Tìm MSSV SV1, SV2, Tên SV, Tên đề tài..."
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Hiển thị <strong>{currentList.length}</strong> đề tài trong danh mục
        </div>
      </div>

      {/* Theses Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={4} cols={5} />
          </div>
        ) : currentList.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Không có đề tài nào trong danh mục này"
              description="Bạn chưa được phân công đề tài tương ứng với vai trò này hoặc chưa có kết quả tìm kiếm."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Tên đề tài KLTN</th>
                  <th className="py-3.5 px-4">Sinh viên thực hiện</th>
                  <th className="py-3.5 px-4">GV Hướng Dẫn</th>
                  <th className="py-3.5 px-4">Hội đồng Phản biện</th>
                  <th className="py-3.5 px-4">Bảng điểm (GVHD | PB Kín | PB Hội đồng)</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {currentList.map((item) => {
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
                        <div className="space-y-1.5">
                          <UserNameClickable
                            user={item.studentId}
                            name={item.studentId?.userId?.fullName}
                            subtitle={item.studentId?.studentCode ? `MSSV: ${item.studentId.studentCode}` : ''}
                            avatarSize="w-6 h-6"
                          />
                          {item.studentCount === 2 && item.secondStudentId && (
                            <UserNameClickable
                              user={item.secondStudentId}
                              name={item.secondStudentId?.userId?.fullName}
                              subtitle={item.secondStudentId?.studentCode ? `MSSV: ${item.secondStudentId.studentCode}` : ''}
                              avatarSize="w-6 h-6"
                            />
                          )}
                        </div>
                      </td>

                      {/* Supervisor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <UserNameClickable
                          user={item.supervisorId}
                          name={`${item.supervisorId?.academicTitle ? item.supervisorId.academicTitle + ' ' : ''}${item.supervisorId?.userId?.fullName || 'Giảng viên'}`}
                          subtitle={item.supervisorId?.specialization || item.supervisorId?.department}
                          avatarSize="w-6 h-6"
                        />
                      </td>

                      {/* Reviewers */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-1 text-[11px]">
                          <div className="flex items-center gap-1">
                            <span className="text-violet-700 font-bold shrink-0">PB KÍN: </span>
                            {item.reviewer1Id ? (
                              <UserNameClickable
                                user={item.reviewer1Id}
                                name={`${item.reviewer1Id.academicTitle ? item.reviewer1Id.academicTitle + ' ' : ''}${item.reviewer1Id.userId?.fullName || 'Giảng viên'}`}
                                showAvatar={false}
                                className="font-semibold text-slate-800 hover:text-indigo-600 truncate"
                              />
                            ) : (
                              <span className="text-amber-600 italic">Chưa có</span>
                            )}
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-amber-700 font-bold shrink-0">PB HỘI ĐỒNG: </span>
                            {item.reviewer2Id ? (
                              <UserNameClickable
                                user={item.reviewer2Id}
                                name={`${item.reviewer2Id.academicTitle ? item.reviewer2Id.academicTitle + ' ' : ''}${item.reviewer2Id.userId?.fullName || 'Giảng viên'}`}
                                showAvatar={false}
                                className="font-semibold text-slate-800 hover:text-indigo-600 truncate"
                              />
                            ) : (
                              <span className="text-amber-600 italic">Chưa có</span>
                            )}
                          </div>
                        </div>
                      </td>

                      {/* Scores */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5 text-[11px] font-mono">
                          <div>
                            GVHD: <strong>{item.scores?.supervisorScore !== null ? `${item.scores?.supervisorScore}` : '—'}</strong>
                          </div>
                          <div>
                            PB Kín: <strong>{item.scores?.reviewer1Score !== null ? `${item.scores?.reviewer1Score}` : '—'}</strong> • PB Hội đồng: <strong>{item.scores?.reviewer2Score !== null ? `${item.scores?.reviewer2Score}` : '—'}</strong>
                          </div>
                          {item.scores?.finalScore !== null && (
                            <div className="text-emerald-700 font-bold">
                              Tổng kết: {item.scores.finalScore}/10
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status} size="sm" />
                      </td>

                      {/* Action */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleOpenDetail(item)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold rounded-xl text-xs transition"
                            title="Xem chi tiết đề tài"
                          >
                            <Eye className="w-3.5 h-3.5" />
                            <span>Chi tiết</span>
                          </button>

                          {activeTab === 'SUPERVISOR' &&
                          item.status === 'PENDING_SUPERVISOR_APPROVAL' ? (
                            <>
                              <button
                                type="button"
                                onClick={() => handleOpenAccept(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white font-bold rounded-xl shadow-xs transition"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5" />
                                <span>Duyệt đề tài</span>
                              </button>

                              <button
                                type="button"
                                onClick={() => handleOpenReject(item)}
                                className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-rose-50 hover:bg-rose-100 text-rose-700 border border-rose-200 font-bold rounded-xl transition"
                              >
                                <Shield className="w-3.5 h-3.5" />
                                <span>Từ chối</span>
                              </button>
                            </>
                          ) : item.status !== 'REJECTED' &&
                            item.status !== 'PENDING_SUPERVISOR_APPROVAL' &&
                            item.status !== 'PENDING_TBM_APPROVAL' ? (
                            item.status === 'COMPLETED' ? (
                              <button
                                type="button"
                                onClick={() => handleOpenGrade(item)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-700 border border-emerald-200 font-bold rounded-xl shadow-2xs transition cursor-pointer"
                                title="Xem kết quả điểm và nhận xét (Đã hoàn thành)"
                              >
                                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                                <span>Xem điểm</span>
                              </button>
                            ) : (
                              <button
                                type="button"
                                onClick={() => handleOpenGrade(item)}
                                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white font-bold rounded-xl shadow-xs transition cursor-pointer"
                              >
                                <Award className="w-3.5 h-3.5" />
                                <span>Chấm điểm</span>
                              </button>
                            )
                          ) : null}
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

      {/* Grade Modal */}
      <GradeThesisModal
        isOpen={gradeModalOpen}
        onClose={() => setGradeModalOpen(false)}
        thesis={selectedThesis}
        currentLecturerId={data?.lecturer?._id}
        defaultRoleType={
          activeTab === 'REVIEWER_1'
            ? 'REVIEWER1'
            : activeTab === 'REVIEWER_2'
            ? 'REVIEWER2'
            : 'SUPERVISOR'
        }
        onSuccess={() => {
          fetchAssignedTheses();
        }}
      />

      {/* Accept / Approve Confirmation Modal */}
      {acceptModalOpen && targetThesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-emerald-100 text-emerald-600 flex items-center justify-center shrink-0 font-bold">
                <CheckCircle2 className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Xác Nhận Duyệt Đề Tài</h3>
                <p className="text-xs text-slate-500">Phê duyệt đề tài khóa luận của sinh viên</p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-2">
              <div>
                <span className="text-slate-400">Tên đề tài:</span>
                <strong className="block text-slate-900 mt-0.5">{targetThesis.thesisTitle}</strong>
              </div>
              <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-200/60">
                <div>
                  <span className="text-slate-400">Sinh viên 1:</span>
                  <div className="font-semibold text-slate-800">
                    {targetThesis.studentId?.userId?.fullName} ({targetThesis.studentId?.studentCode})
                  </div>
                </div>
                {targetThesis.secondStudentId && (
                  <div>
                    <span className="text-slate-400">Sinh viên 2:</span>
                    <div className="font-semibold text-slate-800">
                      {targetThesis.secondStudentId?.userId?.fullName} ({targetThesis.secondStudentId?.studentCode})
                    </div>
                  </div>
                )}
              </div>
            </div>

            <p className="text-xs text-slate-600">
              Bạn có chắc chắn muốn duyệt đề tài này không? Sau khi duyệt, đề tài sẽ được chuyển sang trạng thái <strong>Đã phê duyệt (APPROVED)</strong>.
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setAcceptModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleConfirmAccept}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-bold text-white bg-emerald-600 hover:bg-emerald-700 rounded-xl shadow-xs transition"
              >
                {actionLoading ? 'Đang xử lý...' : 'Đồng ý duyệt đề tài'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Reject Modal */}
      {rejectModalOpen && targetThesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <form onSubmit={handleConfirmReject} className="w-full max-w-md bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-4">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center shrink-0 font-bold">
                <Shield className="w-6 h-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-slate-900">Từ Chối Hướng Dẫn Đề Tài</h3>
                <p className="text-xs text-slate-500">Vui lòng cung cấp lý do từ chối cụ thể</p>
              </div>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs">
              <span className="text-slate-400">Đề tài:</span>
              <strong className="block text-slate-900 mt-0.5">{targetThesis.thesisTitle}</strong>
            </div>

            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5">
                Lý do từ chối <span className="text-rose-500">*</span>
              </label>
              <textarea
                rows={3}
                required
                value={rejectReason}
                onChange={(e) => setRejectReason(e.target.value)}
                placeholder="Nhập lý do từ chối (ví dụ: Trùng hướng nghiên cứu, quá tải chuyên môn, đề tài chưa phù hợp...)"
                className="w-full text-xs p-3 rounded-2xl border border-slate-200 focus:border-rose-400 focus:ring-2 focus:ring-rose-200 outline-hidden transition resize-none"
              />
            </div>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setRejectModalOpen(false)}
                disabled={actionLoading}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Hủy
              </button>
              <button
                type="submit"
                disabled={actionLoading || !rejectReason.trim()}
                className="px-4 py-2 text-xs font-bold text-white bg-rose-600 hover:bg-rose-700 disabled:opacity-50 rounded-xl shadow-xs transition"
              >
                {actionLoading ? 'Đang gửi...' : 'Xác nhận từ chối'}
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Detail Modal */}
      {detailModalOpen && targetThesis && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-in fade-in">
          <div className="w-full max-w-2xl bg-white rounded-3xl p-6 shadow-2xl border border-slate-100 space-y-5 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-2xl bg-indigo-100 text-indigo-600 flex items-center justify-center font-bold">
                  <BookOpen className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Chi Tiết Đề Tài Khóa Luận</h3>
                  <div className="flex items-center gap-2 mt-0.5">
                    <StatusBadge status={targetThesis.status} size="sm" />
                    <span className="text-[11px] text-slate-400 font-mono">
                      {targetThesis.studentCount === 2 ? 'Nhóm 2 SV' : 'Cá nhân (1 SV)'}
                    </span>
                  </div>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="p-2 text-slate-400 hover:text-slate-700 rounded-xl transition"
              >
                ✕
              </button>
            </div>

            {/* Topic Info */}
            <div className="space-y-3">
              <div>
                <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Tên đề tài</label>
                <div className="text-sm font-bold text-slate-900 mt-1">{targetThesis.thesisTitle}</div>
              </div>

              {targetThesis.description && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mô tả đề tài</label>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {targetThesis.description}
                  </p>
                </div>
              )}

              {targetThesis.objectives && (
                <div>
                  <label className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Mục tiêu nghiên cứu</label>
                  <p className="text-xs text-slate-700 mt-1 leading-relaxed whitespace-pre-line bg-slate-50 p-3 rounded-2xl border border-slate-100">
                    {targetThesis.objectives}
                  </p>
                </div>
              )}
            </div>

            {/* Students Info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2">
              <div className="p-4 rounded-2xl bg-indigo-50/50 border border-indigo-100 space-y-2 text-xs">
                <div className="font-bold text-indigo-950 flex items-center justify-between">
                  <div className="flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-600" />
                    <span>Sinh viên 1 (Chính)</span>
                  </div>
                  <UserNameClickable
                    user={targetThesis.studentId}
                    name="Xem hồ sơ ↗"
                    showAvatar={false}
                    className="text-[11px] font-bold text-indigo-600 hover:underline"
                  />
                </div>
                <div><strong>Họ tên:</strong> {targetThesis.studentId?.userId?.fullName}</div>
                <div><strong>MSSV:</strong> {targetThesis.studentId?.studentCode}</div>
                <div><strong>Lớp:</strong> {targetThesis.studentId?.className || '—'}</div>
                <div><strong>GPA:</strong> {targetThesis.studentId?.gpa || '—'} • <strong>Tín chỉ:</strong> {targetThesis.studentId?.creditsAccumulated || '—'}</div>
                <div><strong>Email:</strong> {targetThesis.studentId?.userId?.email || '—'}</div>
              </div>

              {targetThesis.secondStudentId ? (
                <div className="p-4 rounded-2xl bg-violet-50/50 border border-violet-100 space-y-2 text-xs">
                  <div className="font-bold text-violet-950 flex items-center justify-between">
                    <div className="flex items-center gap-1.5">
                      <span className="w-2 h-2 rounded-full bg-violet-600" />
                      <span>Sinh viên 2</span>
                    </div>
                    <UserNameClickable
                      user={targetThesis.secondStudentId}
                      name="Xem hồ sơ ↗"
                      showAvatar={false}
                      className="text-[11px] font-bold text-violet-600 hover:underline"
                    />
                  </div>
                  <div><strong>Họ tên:</strong> {targetThesis.secondStudentId?.userId?.fullName}</div>
                  <div><strong>MSSV:</strong> {targetThesis.secondStudentId?.studentCode}</div>
                  <div><strong>Lớp:</strong> {targetThesis.secondStudentId?.className || '—'}</div>
                  <div><strong>GPA:</strong> {targetThesis.secondStudentId?.gpa || '—'} • <strong>Tín chỉ:</strong> {targetThesis.secondStudentId?.creditsAccumulated || '—'}</div>
                  <div><strong>Email:</strong> {targetThesis.secondStudentId?.userId?.email || '—'}</div>
                </div>
              ) : (
                <div className="p-4 rounded-2xl bg-slate-50 border border-dashed border-slate-200 text-xs flex items-center justify-center text-slate-400">
                  Đề tài thực hiện cá nhân (1 sinh viên)
                </div>
              )}
            </div>

            {/* Assignment Info */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/70 text-xs space-y-1.5">
              <div className="font-bold text-slate-800">Thông tin phân công & Hội đồng</div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-slate-600">
                <div className="flex items-center gap-1">
                  <strong>GV Hướng Dẫn:</strong>
                  <UserNameClickable
                    user={targetThesis.supervisorId}
                    name={`${targetThesis.supervisorId?.academicTitle ? targetThesis.supervisorId.academicTitle + ' ' : ''}${targetThesis.supervisorId?.userId?.fullName}`}
                    showAvatar={false}
                    className="font-bold text-indigo-600 hover:underline"
                  />
                </div>
                <div><strong>Người phân công:</strong> {targetThesis.assignedBy?.fullName || 'TBM'}</div>
                <div><strong>Ngày phân công:</strong> {formatDate(targetThesis.assignedAt || targetThesis.createdAt)}</div>
                <div><strong>Trạng thái tiếp nhận:</strong> <StatusBadge status={targetThesis.status} size="sm" /></div>
              </div>
            </div>

            <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setDetailModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LecturerThesesPage;
