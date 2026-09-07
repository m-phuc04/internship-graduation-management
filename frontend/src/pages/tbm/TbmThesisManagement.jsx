import React, { useState, useEffect, useCallback } from 'react';
import thesisApi from '../../api/thesisApi';
import { useToast } from '../../context/ToastContext';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import StatusBadge from '../../components/common/StatusBadge';
import SearchInput from '../../components/common/SearchInput';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';

import AssignReviewersModal from '../../components/thesis/AssignReviewersModal';
import AssignSupervisorModal from '../../components/thesis/AssignSupervisorModal';
import TbmThesisDetailModal from '../../components/thesis/TbmThesisDetailModal';
import ExportModal from '../../components/common/ExportModal';
import ThesisTimelineModal from '../../components/thesis/ThesisTimelineModal';

import {
  GraduationCap,
  Users,
  User,
  CheckCircle2,
  XCircle,
  Eye,
  UserCheck,
  RefreshCw,
  Filter,
  Layers,
  Clock,
  BookOpen,
  Award,
  FileSpreadsheet,
  Download,
} from 'lucide-react';

const TbmThesisManagement = () => {
  const { currentTerm } = useAcademicTerm();
  const [theses, setTheses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [exportModalOpen, setExportModalOpen] = useState(false);
  const [timelineModalOpen, setTimelineModalOpen] = useState(false);
  const [stats, setStats] = useState({
    total: 0,
    pendingCount: 0,
    approvedCount: 0,
    assignedReviewersCount: 0,
    inProgressCount: 0,
    submittedCount: 0,
    gradedCount: 0,
    rejectedCount: 0,
    completedCount: 0,
  });

  // Query Params
  const [page, setPage] = useState(1);
  const [limit] = useState(10);
  const [search, setSearch] = useState('');
  const [status, setStatus] = useState('ALL');
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 10,
    total: 0,
    totalPages: 1,
  });

  // Modals
  const [selectedThesis, setSelectedThesis] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [assignReviewersOpen, setAssignReviewersOpen] = useState(false);
  const [assignSupervisorOpen, setAssignSupervisorOpen] = useState(false);

  // Approve / Reject Confirmation Modals
  const [approveConfirmOpen, setApproveConfirmOpen] = useState(false);
  const [rejectConfirmOpen, setRejectConfirmOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { showToast } = useToast();

  const fetchTheses = useCallback(async () => {
    setLoading(true);
    try {
      const res = await thesisApi.getAllForTbm({
        page,
        limit,
        search,
        status: status === 'ALL' ? '' : status,
        academicTermId: currentTerm?._id || '',
      });

      if (res.success) {
        setTheses(res.data || []);
        if (res.stats) setStats(res.stats);
        if (res.pagination) setPagination(res.pagination);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách khóa luận tốt nghiệp', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, limit, search, status, currentTerm?._id, showToast]);

  useEffect(() => {
    fetchTheses();
  }, [fetchTheses]);

  // Actions
  const handleApprove = async () => {
    if (!selectedThesis) return;
    setActionLoading(true);
    try {
      const res = await thesisApi.approve(selectedThesis._id);
      if (res.success) {
        showToast('Đã phê duyệt đề tài khóa luận thành công!', 'success');
        setApproveConfirmOpen(false);
        setDetailModalOpen(false);
        fetchTheses();
      }
    } catch (err) {
      showToast(err.message || 'Phê duyệt đề tài thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const handleReject = async () => {
    if (!selectedThesis) return;
    setActionLoading(true);
    try {
      const res = await thesisApi.reject(selectedThesis._id);
      if (res.success) {
        showToast('Đã từ chối đề tài và cho phép sinh viên đăng ký lại.', 'success');
        setRejectConfirmOpen(false);
        setDetailModalOpen(false);
        fetchTheses();
      }
    } catch (err) {
      showToast(err.message || 'Từ chối đề tài thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  const formatDate = (d) => {
    if (!d) return '—';
    return new Date(d).toLocaleDateString('vi-VN', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric',
    });
  };

  // Get KLTN Window Badge for current term
  const getThesisWindowBadge = () => {
    if (!currentTerm?.thesis?.registrationStart && !currentTerm?.thesis?.registrationEnd) {
      return { text: 'Mở tự do', color: 'bg-slate-100 text-slate-700' };
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = currentTerm?.thesis?.registrationStart ? new Date(currentTerm.thesis.registrationStart) : null;
    const end = currentTerm?.thesis?.registrationEnd ? new Date(currentTerm.thesis.registrationEnd) : null;
    if (end) end.setHours(23, 59, 59, 999);

    if (start && now < start) {
      return { text: 'Sắp mở', color: 'bg-amber-100 text-amber-800' };
    }
    if (end && now > end) {
      return { text: 'Đã đóng', color: 'bg-rose-100 text-rose-800' };
    }
    return { text: 'Đang mở', color: 'bg-emerald-100 text-emerald-800' };
  };

  const windowBadge = getThesisWindowBadge();

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center shrink-0 shadow-xs">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900">
                Quản lý Khóa luận Tốt nghiệp (KLTN)
              </h1>
              <p className="text-xs text-slate-500 mt-0.5">
                Phê duyệt hồ sơ đề tài, cấu hình thời gian mở đăng ký và phân công GVHD / Phản biện
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            {/* Configure KLTN Timeline Button */}
            <button
              type="button"
              onClick={() => setTimelineModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-purple-50 hover:bg-purple-100 text-purple-700 text-xs font-bold rounded-xl border border-purple-200 transition cursor-pointer shadow-2xs"
              title="Cấu hình thời gian mở cổng đăng ký, phân công & bảo vệ KLTN"
            >
              <Clock className="w-3.5 h-3.5 text-purple-600" />
              <span>Thời gian mở KLTN</span>
              <span className={`px-1.5 py-0.5 text-[10px] font-bold rounded-md ${windowBadge.color}`}>
                {windowBadge.text}
              </span>
            </button>

            <button
              onClick={fetchTheses}
              className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl border border-slate-200 transition cursor-pointer"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
              <span>Làm mới</span>
            </button>

            <button
              onClick={() => setExportModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold rounded-xl shadow-sm shadow-emerald-600/20 transition cursor-pointer"
              title="Xuất danh sách sinh viên & đề tài KLTN ra Excel"
            >
              <FileSpreadsheet className="w-3.5 h-3.5" />
              <span>Xuất danh sách</span>
            </button>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3 mt-6 pt-6 border-t border-slate-100">
          <div
            onClick={() => { setStatus('ALL'); setPage(1); }}
            className={`p-3 rounded-2xl border cursor-pointer transition ${
              status === 'ALL'
                ? 'bg-indigo-50/80 border-indigo-300 ring-2 ring-indigo-500/20'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
            }`}
          >
            <div className="text-[11px] text-slate-500 font-medium">Tổng số đề tài</div>
            <div className="text-lg font-bold text-slate-900 font-mono mt-0.5">{stats.total}</div>
          </div>

          <div
            onClick={() => { setStatus('PENDING_TBM_APPROVAL'); setPage(1); }}
            className={`p-3 rounded-2xl border cursor-pointer transition ${
              status === 'PENDING_TBM_APPROVAL'
                ? 'bg-amber-50/80 border-amber-300 ring-2 ring-amber-500/20'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
            }`}
          >
            <div className="text-[11px] text-amber-700 font-medium">Chờ TBM duyệt</div>
            <div className="text-lg font-bold text-amber-700 font-mono mt-0.5">{stats.pendingCount}</div>
          </div>

          <div
            onClick={() => { setStatus('APPROVED'); setPage(1); }}
            className={`p-3 rounded-2xl border cursor-pointer transition ${
              status === 'APPROVED'
                ? 'bg-emerald-50/80 border-emerald-300 ring-2 ring-emerald-500/20'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
            }`}
          >
            <div className="text-[11px] text-emerald-700 font-medium">Đã duyệt đề tài</div>
            <div className="text-lg font-bold text-emerald-700 font-mono mt-0.5">{stats.approvedCount}</div>
          </div>

          <div
            onClick={() => { setStatus('ASSIGNED_REVIEWERS'); setPage(1); }}
            className={`p-3 rounded-2xl border cursor-pointer transition ${
              status === 'ASSIGNED_REVIEWERS'
                ? 'bg-violet-50/80 border-violet-300 ring-2 ring-violet-500/20'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
            }`}
          >
            <div className="text-[11px] text-violet-700 font-medium">Đã gán 2 Phản biện</div>
            <div className="text-lg font-bold text-violet-700 font-mono mt-0.5">{stats.assignedReviewersCount}</div>
          </div>

          <div
            onClick={() => { setStatus('IN_PROGRESS'); setPage(1); }}
            className={`p-3 rounded-2xl border cursor-pointer transition ${
              status === 'IN_PROGRESS'
                ? 'bg-blue-50/80 border-blue-300 ring-2 ring-blue-500/20'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
            }`}
          >
            <div className="text-[11px] text-blue-700 font-medium">Đang thực hiện</div>
            <div className="text-lg font-bold text-blue-700 font-mono mt-0.5">{stats.inProgressCount}</div>
          </div>

          <div
            onClick={() => { setStatus('GRADED'); setPage(1); }}
            className={`p-3 rounded-2xl border cursor-pointer transition ${
              status === 'GRADED'
                ? 'bg-purple-50/80 border-purple-300 ring-2 ring-purple-500/20'
                : 'bg-slate-50 border-slate-200/80 hover:bg-slate-100/80'
            }`}
          >
            <div className="text-[11px] text-purple-700 font-medium">Đã chấm điểm</div>
            <div className="text-lg font-bold text-purple-700 font-mono mt-0.5">{stats.gradedCount}</div>
          </div>
        </div>
      </div>

      {/* Filter & Search Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-96">
          <SearchInput
            value={search}
            onChange={(val) => {
              setSearch(val);
              setPage(1);
            }}
            placeholder="Tìm MSSV SV1, SV2, Tên SV, Tên đề tài, GVHD..."
          />
        </div>

        <div className="flex items-center gap-2 w-full md:w-auto">
          <Filter className="w-4 h-4 text-slate-400 shrink-0" />
          <select
            value={status}
            onChange={(e) => {
              setStatus(e.target.value);
              setPage(1);
            }}
            className="px-3.5 py-2 bg-slate-50 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
          >
            <option value="ALL">Tất cả trạng thái</option>
            <option value="PENDING_TBM_APPROVAL">PENDING_TBM_APPROVAL (Chờ duyệt)</option>
            <option value="APPROVED">APPROVED (Đã duyệt đề tài)</option>
            <option value="ASSIGNED_REVIEWERS">ASSIGNED_REVIEWERS (Đã phân phản biện)</option>
            <option value="IN_PROGRESS">IN_PROGRESS (Đang thực hiện)</option>
            <option value="SUBMITTED">SUBMITTED (Đã nộp bài)</option>
            <option value="GRADED">GRADED (Đã chấm điểm)</option>
            <option value="REJECTED">REJECTED (Đã từ chối)</option>
            <option value="COMPLETED">COMPLETED (Hoàn thành)</option>
          </select>
        </div>
      </div>

      {/* Data Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={6} />
          </div>
        ) : theses.length === 0 ? (
          <div className="p-8">
            <EmptyState
              title="Không tìm thấy đề tài khóa luận nào"
              description="Thử thay đổi từ khóa tìm kiếm hoặc điều chỉnh bộ lọc trạng thái."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Tên đề tài KLTN</th>
                  <th className="py-3.5 px-4">Sinh viên thực hiện</th>
                  <th className="py-3.5 px-4">GV Hướng Dẫn (GVHD)</th>
                  <th className="py-3.5 px-4">Hội đồng Phản biện (1 & 2)</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4">Ngày tạo</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {theses.map((item) => {
                  const isPending = item.status === 'PENDING_TBM_APPROVAL';
                  return (
                    <tr
                      key={item._id}
                      className="hover:bg-slate-50/80 transition"
                    >
                      {/* Thesis Title */}
                      <td className="py-3.5 px-4 min-w-[260px] max-w-sm" title={item.thesisTitle}>
                        <div
                          onClick={() => {
                            setSelectedThesis(item);
                            setDetailModalOpen(true);
                          }}
                          className="font-bold text-slate-900 line-clamp-2 leading-snug hover:text-indigo-600 cursor-pointer transition"
                        >
                          {item.thesisTitle}
                        </div>
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

                      {/* Supervisor */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="font-semibold text-slate-900">
                          {item.supervisorId?.academicTitle} {item.supervisorId?.userId?.fullName}
                        </div>
                        <div className="text-[10px] text-slate-400 font-mono">
                          {item.supervisorId?.lecturerCode} • {item.supervisorId?.specialization}
                        </div>
                      </td>

                      {/* Reviewers */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <div className="space-y-0.5 text-[11px]">
                          <div>
                            <span className="text-violet-700 font-semibold">PB KÍN: </span>
                            {(() => {
                              let names = [];
                              if (Array.isArray(item.reviewers) && item.reviewers.length > 0) {
                                names = item.reviewers
                                  .filter((r) => r.isPrivateReviewer && r.lecturerId)
                                  .map((r) => {
                                    const lec = r.lecturerId;
                                    const title = lec.academicTitle ? `${lec.academicTitle} ` : '';
                                    return `${title}${lec.userId?.fullName || 'Giảng viên'}`;
                                  });
                              }
                              if (names.length === 0 && item.reviewer1Id) {
                                const title = item.reviewer1Id.academicTitle ? `${item.reviewer1Id.academicTitle} ` : '';
                                names = [`${title}${item.reviewer1Id.userId?.fullName || 'Giảng viên'}`];
                              }

                              return names.length > 0 ? (
                                <span className="font-semibold text-slate-800" title={names.join(', ')}>
                                  {names.join(', ')}
                                </span>
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
                                  .map((r) => {
                                    const lec = r.lecturerId;
                                    const title = lec.academicTitle ? `${lec.academicTitle} ` : '';
                                    return `${title}${lec.userId?.fullName || 'Giảng viên'}`;
                                  });
                              }
                              if (names.length === 0 && item.reviewer2Id) {
                                const title = item.reviewer2Id.academicTitle ? `${item.reviewer2Id.academicTitle} ` : '';
                                names = [`${title}${item.reviewer2Id.userId?.fullName || 'Giảng viên'}`];
                              }

                              return names.length > 0 ? (
                                <span className="font-semibold text-slate-800" title={names.join(', ')}>
                                  {names.join(', ')}
                                </span>
                              ) : (
                                <span className="text-amber-600 italic">Chưa có</span>
                              );
                            })()}
                          </div>
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <StatusBadge status={item.status} size="sm" />
                      </td>

                      {/* Created Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-slate-500 font-mono text-[11px]">
                        {formatDate(item.createdAt)}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 whitespace-nowrap text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {isPending && (
                            <>
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedThesis(item);
                                  setApproveConfirmOpen(true);
                                }}
                                className="p-1.5 text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Phê duyệt đề tài"
                              >
                                <CheckCircle2 className="w-4 h-4" />
                              </button>

                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedThesis(item);
                                  setRejectConfirmOpen(true);
                                }}
                                className="p-1.5 text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Từ chối đề tài"
                              >
                                <XCircle className="w-4 h-4" />
                              </button>
                            </>
                          )}

                          {/* Phân công phản biện (Chỉ cho đề tài đã duyệt / không bị từ chối / chưa hoàn tất) */}
                          {item.status !== 'REJECTED' &&
                            item.status !== 'PENDING_TBM_APPROVAL' &&
                            item.status !== 'PENDING_SUPERVISOR_APPROVAL' &&
                            item.status !== 'COMPLETED' && (
                              <button
                                type="button"
                                onClick={() => {
                                  setSelectedThesis(item);
                                  setAssignReviewersOpen(true);
                                }}
                                className="p-1.5 text-violet-600 hover:bg-violet-50 rounded-lg transition cursor-pointer"
                                title="Phân công phản biện"
                              >
                                <UserCheck className="w-4 h-4" />
                              </button>
                            )}

                          <button
                            type="button"
                            onClick={() => {
                              setSelectedThesis(item);
                              setDetailModalOpen(true);
                            }}
                            className="p-1.5 text-slate-600 hover:bg-slate-100 rounded-lg transition"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
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

        {/* Pagination */}
        {!loading && theses.length > 0 && (
          <div className="border-t border-slate-100 bg-slate-50/50 px-4">
            <Pagination
              pagination={pagination}
              onPageChange={setPage}
            />
          </div>
        )}
      </div>

      {/* Detail Modal */}
      <TbmThesisDetailModal
        isOpen={detailModalOpen}
        onClose={() => setDetailModalOpen(false)}
        thesis={selectedThesis}
        onApprove={(t) => {
          setSelectedThesis(t);
          setApproveConfirmOpen(true);
        }}
        onReject={(t) => {
          setSelectedThesis(t);
          setRejectConfirmOpen(true);
        }}
        onOpenAssignReviewers={(t) => {
          setSelectedThesis(t);
          setAssignReviewersOpen(true);
        }}
        onOpenAssignSupervisor={(t) => {
          setSelectedThesis(t);
          setAssignSupervisorOpen(true);
        }}
      />

      {/* Assign Reviewers Modal */}
      <AssignReviewersModal
        isOpen={assignReviewersOpen}
        onClose={() => setAssignReviewersOpen(false)}
        thesis={selectedThesis}
        onSuccess={(updatedThesis) => {
          if (updatedThesis) {
            setSelectedThesis(updatedThesis);
            setTheses((prev) =>
              prev.map((t) => (t._id === updatedThesis._id ? updatedThesis : t)),
            );
          }
          fetchTheses();
        }}
      />

      {/* Assign Supervisor Modal */}
      <AssignSupervisorModal
        isOpen={assignSupervisorOpen}
        onClose={() => setAssignSupervisorOpen(false)}
        thesis={selectedThesis}
        onSuccess={(updatedThesis) => {
          if (updatedThesis) {
            setSelectedThesis(updatedThesis);
            setTheses((prev) =>
              prev.map((t) => (t._id === updatedThesis._id ? updatedThesis : t)),
            );
          }
          fetchTheses();
        }}
      />

      {/* Approve Confirm Modal */}
      <ConfirmDialog
        isOpen={approveConfirmOpen}
        onClose={() => setApproveConfirmOpen(false)}
        onConfirm={handleApprove}
        title="Xác nhận Phê duyệt Đề tài KLTN"
        message={`Bạn có chắc chắn muốn phê duyệt đề tài "${selectedThesis?.thesisTitle}"? Trạng thái đề tài sẽ chuyển sang APPROVED.`}
        confirmText="Phê duyệt ngay"
        isDanger={false}
        loading={actionLoading}
      />

      {/* Reject Confirm Modal */}
      <ConfirmDialog
        isOpen={rejectConfirmOpen}
        onClose={() => setRejectConfirmOpen(false)}
        onConfirm={handleReject}
        title="Xác nhận Từ chối Đề tài KLTN"
        message={`Bạn có chắc chắn muốn từ chối đề tài "${selectedThesis?.thesisTitle}"? Sinh viên sẽ được giải phóng cờ đăng ký và có thể nộp đề tài khác.`}
        confirmText="Từ chối đề tài"
        isDanger={true}
        loading={actionLoading}
      />

      {/* Export Excel Modal */}
      <ExportModal
        isOpen={exportModalOpen}
        onClose={() => setExportModalOpen(false)}
        title="Xuất danh sách đề tài Khóa luận Tốt nghiệp (KLTN)"
        type="THESIS"
        currentFilters={{ academicTermId: currentTerm?._id, status: status === 'ALL' ? '' : status, search }}
        onExport={(params) => thesisApi.exportExcel(params)}
      />

      <ThesisTimelineModal
        isOpen={timelineModalOpen}
        onClose={() => setTimelineModalOpen(false)}
      />
    </div>
  );
};

export default TbmThesisManagement;
