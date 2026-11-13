import React, { useState, useEffect, useCallback } from 'react';
import lecturerApi from '../../api/lecturerApi';
import researchFieldApi from '../../api/researchFieldApi';
import { useToast } from '../../context/ToastContext';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import Modal from '../../components/common/Modal';
import LecturerFormModal from '../../components/lecturers/LecturerFormModal';
import LecturerDetailModal from '../../components/lecturers/LecturerDetailModal';
import UserNameClickable from '../../components/common/UserNameClickable';
import {
  BookOpen,
  Plus,
  Filter,
  Eye,
  Edit2,
  CheckCircle2,
  XCircle,
  Users,
  ShieldAlert,
  UserCheck,
  UserX,
  Clock,
  Sparkles,
  Check,
  X,
} from 'lucide-react';

const LecturerManagement = () => {
  const [lecturers, setLecturers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  // Field change requests state
  const [fieldRequests, setFieldRequests] = useState([]);
  const [requestsLoading, setRequestsLoading] = useState(false);
  const [fieldConfirmDialog, setFieldConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    type: 'primary',
    onConfirm: null,
  });

  const { showToast } = useToast();

  const fetchFieldRequests = useCallback(async () => {
    setRequestsLoading(true);
    try {
      const res = await researchFieldApi.getAllRequests();
      if (res?.success) {
        setFieldRequests(res.data || []);
      }
    } catch (err) {
      console.warn('Cannot fetch field change requests:', err.message);
    } finally {
      setRequestsLoading(false);
    }
  }, []);

  const fetchLecturers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await lecturerApi.getAll({
        page,
        limit: 10,
        search,
        isActive,
      });

      if (res.success) {
        setLecturers(res.data || []);
        setPagination(res.pagination || null);
        if (res.pagination?.page && res.pagination.page !== page) {
          setPage(res.pagination.page);
        }
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách giảng viên', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, isActive, showToast]);

  useEffect(() => {
    fetchLecturers();
    fetchFieldRequests();
  }, [fetchLecturers, fetchFieldRequests]);

  // Handle Approve Field Change Request
  const handleApproveFieldRequest = (req) => {
    const lecName = req.lecturerId?.userId?.fullName || 'giảng viên';
    setFieldConfirmDialog({
      isOpen: true,
      title: 'Duyệt yêu cầu thay đổi lĩnh vực',
      message: `Bạn có chắc chắn muốn duyệt yêu cầu thay đổi lĩnh vực cho ${lecName}? Lĩnh vực của giảng viên sẽ được cập nhật và các tag mới (nếu có) sẽ tự động thêm vào danh mục hệ thống.`,
      confirmText: 'Phê duyệt',
      type: 'primary',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await researchFieldApi.approveRequest(req._id);
          if (res?.success) {
            showToast('Đã phê duyệt yêu cầu thay đổi lĩnh vực thành công!', 'success');
            await Promise.all([fetchFieldRequests(), fetchLecturers()]);
          }
        } catch (err) {
          const isConflict =
            err.status === 409 ||
            err.status === 400 ||
            err.data?.errorCode === 'REQUEST_ALREADY_PROCESSED' ||
            err.response?.status === 409 ||
            err.response?.status === 400 ||
            err.message?.toLowerCase().includes('đã được xử lý');

          if (isConflict) {
            showToast(
              'Yêu cầu này đã được xử lý. Đang cập nhật lại danh sách...',
              'error'
            );
          } else {
            showToast(err.message || 'Không thể duyệt yêu cầu', 'error');
          }
          // Always refresh to sync UI state and clear processed items
          await Promise.all([fetchFieldRequests(), fetchLecturers()]);
        } finally {
          setActionLoading(false);
          setFieldConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Handle Reject Field Change Request
  const handleRejectFieldRequest = (req) => {
    const lecName = req.lecturerId?.userId?.fullName || 'giảng viên';
    setFieldConfirmDialog({
      isOpen: true,
      title: 'Từ chối yêu cầu thay đổi lĩnh vực',
      message: `Bạn có chắc chắn muốn từ chối yêu cầu thay đổi lĩnh vực của ${lecName}?`,
      confirmText: 'Từ chối',
      type: 'danger',
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await researchFieldApi.rejectRequest(req._id);
          if (res?.success) {
            showToast('Đã từ chối yêu cầu thay đổi lĩnh vực', 'success');
            await fetchFieldRequests();
          }
        } catch (err) {
          const isConflict =
            err.status === 409 ||
            err.status === 400 ||
            err.data?.errorCode === 'REQUEST_ALREADY_PROCESSED' ||
            err.response?.status === 409 ||
            err.response?.status === 400 ||
            err.message?.toLowerCase().includes('đã được xử lý');

          if (isConflict) {
            showToast(
              'Yêu cầu này đã được xử lý. Đang cập nhật lại danh sách...',
              'error'
            );
          } else {
            showToast(err.message || 'Không thể từ chối yêu cầu', 'error');
          }
          // Always refresh to sync UI state and clear processed items
          await fetchFieldRequests();
        } finally {
          setActionLoading(false);
          setFieldConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleFilterChange = (setter, val) => {
    setter(val);
    setPage(1);
  };

  const handleFormSubmit = async (formData) => {
    setActionLoading(true);
    try {
      if (selectedLecturer) {
        await lecturerApi.update(selectedLecturer._id, formData);
        showToast('Cập nhật thông tin giảng viên thành công!', 'success');
      } else {
        await lecturerApi.create(formData);
        showToast('Thêm mới giảng viên thành công!', 'success');
      }
      setFormModalOpen(false);
      setSelectedLecturer(null);
      fetchLecturers();
    } catch (err) {
      showToast(err.message || 'Thao tác không thành công', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Deactivate Confirm (Soft Deactivation)
  const handleDeactivateConfirm = async () => {
    if (!selectedLecturer) return;
    setActionLoading(true);
    try {
      await lecturerApi.deactivate(selectedLecturer._id);
      showToast(
        `Đã vô hiệu hóa tài khoản ${selectedLecturer.userId?.fullName}. Dữ liệu lịch sử vẫn được bảo toàn.`,
        'success'
      );
      setDeactivateDialogOpen(false);
      setSelectedLecturer(null);
      fetchLecturers();
    } catch (err) {
      showToast(err.message || 'Vô hiệu hóa giảng viên thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Handle Activate Confirm
  const handleActivateConfirm = async () => {
    if (!selectedLecturer) return;
    setActionLoading(true);
    try {
      await lecturerApi.activate(selectedLecturer._id);
      showToast(
        `Đã kích hoạt lại tài khoản ${selectedLecturer.userId?.fullName}. Giảng viên có thể đăng nhập bình thường.`,
        'success'
      );
      setActivateDialogOpen(false);
      setSelectedLecturer(null);
      fetchLecturers();
    } catch (err) {
      showToast(err.message || 'Kích hoạt giảng viên thất bại', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-5 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0 shadow-xs">
            <BookOpen className="w-7 h-7" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-slate-900">
              Quản lý Danh sách Giảng viên
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý hồ sơ giảng viên và phân công chuyên môn
            </p>
          </div>
        </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setSelectedLecturer(null);
                setFormModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#123891] text-white text-xs font-semibold hover:bg-[#102d7d] active:scale-98 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm giảng viên</span>
            </button>
          </div>
        </div>

      {/* Yêu Cầu Thay Đổi Lĩnh Vực (Pending Field Requests) */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">
              Yêu Cầu Thay Đổi Lĩnh Vực
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {fieldRequests.length}
            </span>
          </div>
        </div>

        {requestsLoading ? (
          <div className="py-6">
            <LoadingSkeleton rows={2} cols={5} />
          </div>
        ) : fieldRequests.length === 0 ? (
          <div className="py-6 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <CheckCircle2 className="w-7 h-7 text-emerald-400" />
            <span>Hiện không có yêu cầu thay đổi lĩnh vực nào.</span>
          </div>
        ) : (
          <div className="overflow-x-auto rounded-2xl border border-slate-200">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3.5 w-12 text-center">STT</th>
                  <th className="py-3 px-4">Tên giảng viên</th>
                  <th className="py-3 px-4">Lĩnh vực hiện tại</th>
                  <th className="py-3 px-4">Yêu cầu thay đổi</th>
                  <th className="py-3 px-4 w-24 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {fieldRequests.map((req, idx) => {
                  const lecUser = req.lecturerId?.userId;
                  const currentList = Array.isArray(req.currentFields) ? req.currentFields : [];
                  const requestedList = Array.isArray(req.requestedFields) ? req.requestedFields : [];
                  const proposedList = Array.isArray(req.proposedNewTags) ? req.proposedNewTags : [];

                  return (
                    <tr key={req._id} className="hover:bg-slate-50/70 transition">
                      <td className="py-3.5 px-3.5 text-center font-mono text-slate-500">
                        {idx + 1}
                      </td>
                      <td className="py-3.5 px-4 font-medium text-slate-900">
                        <div>
                          <strong className="block text-slate-900">
                            {req.lecturerId?.academicTitle ? `${req.lecturerId.academicTitle} ` : ''}
                            {lecUser?.fullName || 'Chưa cập nhật'}
                          </strong>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {req.lecturerId?.lecturerCode || lecUser?.email || ''}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        {currentList.length > 0 ? (
                          <div className="flex flex-wrap gap-1.5 max-w-xs">
                            {currentList.map((tag, i) => (
                              <span
                                key={i}
                                className="inline-flex items-center px-2 py-0.5 rounded-full text-[11px] bg-slate-100 text-slate-700 border border-slate-200"
                              >
                                {tag}
                              </span>
                            ))}
                          </div>
                        ) : (
                          <span className="text-slate-400 italic">Không có</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1.5 max-w-md">
                          {requestedList.map((tag, i) => {
                            const isNewProposed = proposedList.includes(tag);
                            return (
                              <span
                                key={i}
                                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-semibold border ${
                                  isNewProposed
                                    ? 'bg-purple-50 text-purple-700 border-purple-200 shadow-2xs'
                                    : 'bg-blue-50 text-[#123891] border-blue-200'
                                }`}
                              >
                                {isNewProposed && (
                                  <Sparkles className="w-3 h-3 text-purple-500 shrink-0" />
                                )}
                                <span>{tag}</span>
                                {isNewProposed && (
                                  <span className="text-[9px] px-1 rounded bg-purple-200 text-purple-900 font-bold uppercase">
                                    Mới
                                  </span>
                                )}
                              </span>
                            );
                          })}
                        </div>
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            type="button"
                            onClick={() => handleApproveFieldRequest(req)}
                            disabled={actionLoading}
                            className="p-1 text-slate-400 hover:text-emerald-600 transition cursor-pointer disabled:opacity-50"
                            title="Phê duyệt yêu cầu"
                          >
                            <Check className="w-4 h-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectFieldRequest(req)}
                            disabled={actionLoading}
                            className="p-1 text-slate-400 hover:text-rose-600 transition cursor-pointer disabled:opacity-50"
                            title="Từ chối yêu cầu"
                          >
                            <X className="w-4 h-4" />
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

      {/* Search & Filter Bar */}
      <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-center justify-between">
        <div className="w-full md:w-96">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Tìm theo tên giảng viên, email, chuyên môn..."
          />
        </div>

        <div className="flex items-center gap-3 w-full md:w-auto justify-end">
          <select
            value={isActive}
            onChange={(e) => handleFilterChange(setIsActive, e.target.value)}
            className="w-full sm:w-auto min-w-[240px] py-2 px-3 bg-slate-50 border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
          >
            <option value="">-- Tất cả trạng thái tài khoản --</option>
            <option value="true">Đang hoạt động</option>
            <option value="false">Đã vô hiệu hóa</option>
          </select>
        </div>
      </div>

      {/* Main Table */}
      <div className="bg-white rounded-2xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={7} />
          </div>
        ) : lecturers.length === 0 ? (
          <EmptyState
            title="Không tìm thấy giảng viên"
            description="Không có giảng viên nào khớp với tiêu chí tìm kiếm."
            actionText="Thêm giảng viên mới"
            onAction={() => {
              setSelectedLecturer(null);
              setFormModalOpen(true);
            }}
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                  <th className="py-3.5 px-4 text-center w-14">STT</th>
                  <th className="py-3.5 px-4">Giảng viên</th>
                  <th className="py-3.5 px-4">Học vị</th>
                  <th className="py-3.5 px-4">Lĩnh vực</th>
                  <th className="py-3.5 px-4 text-center">Tiếp nhận</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 pr-6 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {lecturers.map((lec, idx) => {
                  const isLecturerActive = lec.isActive !== false && lec.userId?.isActive !== false;

                  return (
                    <tr
                      key={lec._id}
                      className={`transition-colors group ${
                        !isLecturerActive ? 'bg-slate-50/50 opacity-75' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* STT */}
                      <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                        {(page - 1) * 10 + idx + 1}
                      </td>
                      {/* Lecturer Info */}
                      <td className="py-3.5 px-4 pl-6">
                        <UserNameClickable
                          user={lec}
                          name={lec.userId?.fullName || 'Chưa đặt tên'}
                          subtitle={lec.userId?.email || 'Chưa có email'}
                          avatarSize="w-9 h-9"
                        />
                      </td>

                      {/* Academic Title */}
                      <td className="py-3.5 px-4 font-medium text-slate-800 text-xs">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md">
                          {lec.academicTitle || 'ThS.'}
                        </span>
                      </td>

                      {/* Research Fields / Lĩnh vực */}
                      <td className="py-3.5 px-4">
                        {(() => {
                          const fieldsList = Array.isArray(lec.fields) && lec.fields.length > 0
                            ? lec.fields
                            : (lec.specialization
                                ? lec.specialization.split(',').map((s) => s.trim()).filter(Boolean)
                                : []);

                          if (fieldsList.length === 0) {
                            return <span className="text-xs text-slate-400 italic">Chưa cập nhật</span>;
                          }

                          return (
                            <div className="flex flex-wrap gap-1 max-w-[280px]">
                              {fieldsList.slice(0, 3).map((field, fIdx) => (
                                <span
                                  key={fIdx}
                                  className="inline-flex items-center px-2 py-0.5 rounded-md text-[11px] font-medium bg-blue-50 text-blue-700 border border-blue-200/60"
                                >
                                  {field}
                                </span>
                              ))}
                              {fieldsList.length > 3 && (
                                <span
                                  title={fieldsList.slice(3).join(', ')}
                                  className="inline-flex items-center px-1.5 py-0.5 rounded-md text-[11px] font-medium bg-slate-100 text-slate-600 border border-slate-200 cursor-help"
                                >
                                  +{fieldsList.length - 3}
                                </span>
                              )}
                            </div>
                          );
                        })()}
                      </td>

                      {/* Availability */}
                      <td className="py-3.5 px-4 text-center">
                        <StatusBadge
                          status={lec.isAvailable}
                          label={lec.isAvailable ? 'Sẵn sàng' : 'Tạm ngưng'}
                          size="sm"
                        />
                      </td>

                      {/* Account Status Badge */}
                      <td className="py-3.5 px-4 text-center">
                        {isLecturerActive ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-50 text-emerald-700 border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            <span>Hoạt động</span>
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-600 border border-slate-200">
                            <XCircle className="w-3 h-3" />
                            <span>Vô hiệu hóa</span>
                          </span>
                        )}
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 pr-6 text-right">
                        <div className="flex items-center justify-end gap-1">
                          <button
                            onClick={() => {
                              setSelectedLecturer(lec);
                              setDetailModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-[#123891] hover:bg-blue-50 rounded-lg transition"
                            title="Xem chi tiết"
                          >
                            <Eye className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedLecturer(lec);
                              setFormModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                            title="Chỉnh sửa"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>

                          {/* Toggle Active Action (Deactivate / Activate) */}
                          {isLecturerActive ? (
                            <button
                              onClick={() => {
                                setSelectedLecturer(lec);
                                setDeactivateDialogOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                              title="Vô hiệu hóa tài khoản"
                            >
                              <UserX className="w-4 h-4" />
                            </button>
                          ) : (
                            <button
                              onClick={() => {
                                setSelectedLecturer(lec);
                                setActivateDialogOpen(true);
                              }}
                              className="p-1.5 text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                              title="Kích hoạt lại tài khoản"
                            >
                              <UserCheck className="w-4 h-4" />
                            </button>
                          )}
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
        <div className="border-t border-slate-100 bg-slate-50/50 px-4">
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      </div>

      {/* Form Modal */}
      <LecturerFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setSelectedLecturer(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={selectedLecturer}
        loading={actionLoading}
      />

      {/* Detail Modal */}
      <LecturerDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedLecturer(null);
        }}
        lecturer={selectedLecturer}
      />

      {/* Deactivate Confirmation Dialog (Soft Deactivation) */}
      <ConfirmDialog
        isOpen={deactivateDialogOpen}
        onClose={() => {
          setDeactivateDialogOpen(false);
          setSelectedLecturer(null);
        }}
        onConfirm={handleDeactivateConfirm}
        title="Vô hiệu hóa tài khoản giảng viên"
        message={
          selectedLecturer
            ? `Bạn có chắc chắn muốn vô hiệu hóa tài khoản của giảng viên ${selectedLecturer.userId?.fullName}?\n\n• Email: ${selectedLecturer.userId?.email || 'Chưa cập nhật'}\n\n⚠️ Lưu ý: Giảng viên sẽ không thể đăng nhập hoặc thực hiện các chức năng giảng viên sau khi bị vô hiệu hóa. Toàn bộ dữ liệu lịch sử hướng dẫn và chấm điểm vẫn được giữ lại an toàn.`
            : 'Bạn có chắc chắn muốn vô hiệu hóa giảng viên này?'
        }
        confirmText="Vô hiệu hóa"
        cancelText="Hủy"
        type="danger"
        loading={actionLoading}
      />

      {/* Activate Confirmation Dialog */}
      <ConfirmDialog
        isOpen={activateDialogOpen}
        onClose={() => {
          setActivateDialogOpen(false);
          setSelectedLecturer(null);
        }}
        onConfirm={handleActivateConfirm}
        title="Kích hoạt lại tài khoản giảng viên"
        message={
          selectedLecturer
            ? `Bạn có muốn kích hoạt lại tài khoản cho giảng viên ${selectedLecturer.userId?.fullName} ?\n\nSau khi kích hoạt, giảng viên có thể đăng nhập bình thường và xuất hiện lại trong danh sách phân công hướng dẫn/phản biện mới.`
            : 'Bạn có chắc chắn muốn kích hoạt lại giảng viên này?'
        }
        confirmText="Kích hoạt lại"
        cancelText="Hủy"
        type="primary"
        loading={actionLoading}
      />

      {/* Field Request Approval / Rejection Confirmation Dialog */}
      <ConfirmDialog
        isOpen={fieldConfirmDialog.isOpen}
        onClose={() => setFieldConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={fieldConfirmDialog.onConfirm}
        title={fieldConfirmDialog.title}
        message={fieldConfirmDialog.message}
        confirmText={fieldConfirmDialog.confirmText}
        cancelText="Hủy"
        type={fieldConfirmDialog.type}
        loading={actionLoading}
      />
    </div>
  );
};

export default LecturerManagement;
