import React, { useState, useEffect, useCallback } from 'react';
import lecturerApi from '../../api/lecturerApi';
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
  RefreshCw,
  Users,
  ShieldAlert,
  UserCheck,
  UserX,
  Sliders,
} from 'lucide-react';

const LecturerManagement = () => {
  const [lecturers, setLecturers] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Filter & Search states
  const [search, setSearch] = useState('');
  const [isAvailable, setIsAvailable] = useState('');
  const [isActive, setIsActive] = useState('');
  const [page, setPage] = useState(1);

  // Modal states
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [capacityModalOpen, setCapacityModalOpen] = useState(false);
  const [editCapacityVal, setEditCapacityVal] = useState(5);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { showToast } = useToast();

  const fetchLecturers = useCallback(async () => {
    setLoading(true);
    try {
      const res = await lecturerApi.getAll({
        page,
        limit: 10,
        search,
        isAvailable,
        isActive,
      });

      if (res.success) {
        setLecturers(res.data || []);
        setPagination(res.pagination || null);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách giảng viên', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, isAvailable, isActive, showToast]);

  useEffect(() => {
    fetchLecturers();
  }, [fetchLecturers]);

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

  // Open Capacity Modal
  const handleOpenCapacityModal = (lec) => {
    setSelectedLecturer(lec);
    setEditCapacityVal(lec.maxSupervisedStudents ?? lec.maxStudents ?? 10);
    setCapacityModalOpen(true);
  };

  // Save Capacity
  const handleSaveCapacity = async (e) => {
    e.preventDefault();
    if (!selectedLecturer) return;

    const num = Number(editCapacityVal);
    if (isNaN(num) || num < 1) {
      showToast('Số lượng sinh viên phải lớn hơn 0', 'error');
      return;
    }

    setActionLoading(true);
    try {
      await lecturerApi.updateMaxStudents(selectedLecturer._id, num);
      showToast('Cập nhật số lượng sinh viên hướng dẫn tối đa thành công!', 'success');
      setCapacityModalOpen(false);
      setSelectedLecturer(null);
      fetchLecturers();
    } catch (err) {
      showToast(err.message || 'Cập nhật số lượng thất bại.', 'error');
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
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 text-white flex items-center justify-center font-bold text-xl shadow-md shadow-violet-200 shrink-0">
              <BookOpen className="w-7 h-7" />
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-xl font-bold text-slate-900 leading-tight">
                  Quản Lý Giảng Viên & Chỉ Tiêu Hướng Dẫn
                </h1>
                <span className="px-2.5 py-0.5 rounded-full text-xs font-semibold bg-violet-50 text-violet-700 border border-violet-200/60">
                  {pagination?.total ?? lecturers.length} Giảng viên
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-1">
                Quản lý hồ sơ giảng viên, phân công đề tài, chỉ tiêu nhận sinh viên hướng dẫn (KLTN)
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5">
            <button
              onClick={() => {
                setSelectedLecturer(null);
                setFormModalOpen(true);
              }}
              className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-indigo-600 text-white text-xs font-semibold hover:bg-indigo-700 active:scale-98 transition shadow-xs cursor-pointer"
            >
              <Plus className="w-4 h-4" />
              <span>Thêm giảng viên</span>
            </button>

            <button
              onClick={fetchLecturers}
              disabled={loading}
              className="p-2.5 text-slate-600 hover:text-indigo-600 hover:bg-slate-100 rounded-xl transition border border-slate-200 bg-white"
              title="Tải lại danh sách"
            >
              <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
            </button>
          </div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div className="p-4 bg-white rounded-2xl border border-slate-200/80 shadow-2xs">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          <div className="lg:col-span-2">
            <SearchInput
              value={search}
              onChange={(val) => {
                setSearch(val);
                setPage(1);
              }}
              placeholder="Tìm theo tên giảng viên, mã GV, email, chuyên môn..."
            />
          </div>

          <div>
            <select
              value={isActive}
              onChange={(e) => handleFilterChange(setIsActive, e.target.value)}
              className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="">-- Tất cả trạng thái tài khoản --</option>
              <option value="true">Đang hoạt động (Active)</option>
              <option value="false">Đã vô hiệu hóa (Deactivated)</option>
            </select>
          </div>

          <div>
            <select
              value={isAvailable}
              onChange={(e) => handleFilterChange(setIsAvailable, e.target.value)}
              className="w-full py-2.5 px-3 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
            >
              <option value="">-- Tất cả chỉ tiêu tiếp nhận --</option>
              <option value="true">Sẵn sàng nhận SV (Available)</option>
              <option value="false">Tạm ngưng nhận (Unavailable)</option>
            </select>
          </div>
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
                  <th className="py-3.5 px-4 pl-6">Giảng viên</th>
                  <th className="py-3.5 px-4">Học vị</th>
                  <th className="py-3.5 px-4 text-center">Đang nhận</th>
                  <th className="py-3.5 px-4 text-center">Tối đa</th>
                  <th className="py-3.5 px-4 text-center">Còn lại</th>
                  <th className="py-3.5 px-4 text-center">Tiếp nhận</th>
                  <th className="py-3.5 px-4 text-center">Trạng thái</th>
                  <th className="py-3.5 px-4 pr-6 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {lecturers.map((lec) => {
                  const isLecturerActive = lec.isActive !== false && lec.userId?.isActive !== false;
                  const currentStudents = lec.currentSupervisedStudents || 0;
                  const maxStudents = lec.maxSupervisedStudents ?? lec.maxStudents ?? 10;
                  const remainingQuota = lec.remainingQuota ?? Math.max(0, maxStudents - currentStudents);

                  return (
                    <tr
                      key={lec._id}
                      className={`transition-colors group ${
                        !isLecturerActive ? 'bg-slate-50/50 opacity-75' : 'hover:bg-slate-50/80'
                      }`}
                    >
                      {/* Lecturer Info */}
                      <td className="py-3.5 px-4 pl-6">
                        <UserNameClickable
                          user={lec}
                          name={lec.userId?.fullName || 'Chưa đặt tên'}
                          subtitle={`${lec.lecturerCode} • ${lec.userId?.email || 'Chưa có email'}`}
                          avatarSize="w-9 h-9"
                        />
                      </td>

                      {/* Academic Title */}
                      <td className="py-3.5 px-4 font-medium text-slate-800 text-xs">
                        <span className="px-2 py-0.5 bg-slate-100 rounded-md">
                          {lec.academicTitle || 'ThS.'}
                        </span>
                      </td>

                      {/* Đang nhận */}
                      <td className="py-3.5 px-4 text-center">
                        <span className="text-xs font-bold px-2 py-0.5 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-200/60">
                          {currentStudents} SV
                        </span>
                      </td>

                      {/* Tối đa */}
                      <td className="py-3.5 px-4 text-center">
                        <button
                          onClick={() => handleOpenCapacityModal(lec)}
                          className="text-xs font-bold px-2.5 py-0.5 rounded-md bg-slate-100 text-slate-800 hover:bg-indigo-100 hover:text-indigo-700 transition cursor-pointer border border-slate-200"
                          title="Click để chỉnh số lượng tối đa"
                        >
                          {maxStudents} SV ✎
                        </button>
                      </td>

                      {/* Còn lại */}
                      <td className="py-3.5 px-4 text-center">
                        <span
                          className={`text-xs font-bold px-2 py-0.5 rounded-md ${
                            remainingQuota > 0
                              ? 'bg-emerald-50 text-emerald-700 border border-emerald-200/60'
                              : 'bg-rose-50 text-rose-700 border border-rose-200/60'
                          }`}
                        >
                          {remainingQuota} SV
                        </span>
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
                          {/* Quick Capacity Edit */}
                          <button
                            onClick={() => handleOpenCapacityModal(lec)}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
                            title="Chỉnh số lượng SV hướng dẫn"
                          >
                            <Sliders className="w-4 h-4" />
                          </button>

                          <button
                            onClick={() => {
                              setSelectedLecturer(lec);
                              setDetailModalOpen(true);
                            }}
                            className="p-1.5 text-slate-500 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition"
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

      {/* Quick Capacity Edit Modal */}
      <Modal
        isOpen={capacityModalOpen}
        onClose={() => {
          setCapacityModalOpen(false);
          setSelectedLecturer(null);
        }}
        title="Chỉnh Số Lượng SV Hướng Dẫn"
        subtitle={
          selectedLecturer
            ? `${selectedLecturer.academicTitle || 'ThS.'} ${selectedLecturer.userId?.fullName} (${selectedLecturer.lecturerCode})`
            : ''
        }
        maxWidth="max-w-md"
      >
        <form onSubmit={handleSaveCapacity} className="space-y-4">
          <div className="p-3.5 bg-indigo-50/60 rounded-xl border border-indigo-100 text-xs space-y-1.5">
            <div className="flex justify-between font-medium text-slate-700">
              <span>Số sinh viên đang hướng dẫn:</span>
              <span className="font-bold text-indigo-700">
                {selectedLecturer?.currentSupervisedStudents || 0} SV
              </span>
            </div>
            <div className="flex justify-between font-medium text-slate-700">
              <span>Còn lại dự kiến:</span>
              <span className="font-bold text-emerald-700">
                {Math.max(0, Number(editCapacityVal || 0) - (selectedLecturer?.currentSupervisedStudents || 0))} SV
              </span>
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Số lượng sinh viên có thể nhận (Tối đa): <span className="text-rose-500">*</span>
            </label>
            <input
              type="number"
              min={selectedLecturer?.currentSupervisedStudents || 1}
              max="50"
              value={editCapacityVal}
              onChange={(e) => setEditCapacityVal(e.target.value)}
              className="w-full px-3.5 py-2 text-sm font-bold text-indigo-700 bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              required
            />
            <p className="text-[11px] text-slate-400 mt-1">
              * Lưu ý: Không thể đặt số lượng thấp hơn số sinh viên đang được hướng dẫn ({selectedLecturer?.currentSupervisedStudents || 0} SV).
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={() => {
                setCapacityModalOpen(false);
                setSelectedLecturer(null);
              }}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={actionLoading}
              className="px-4 py-2 text-xs font-semibold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl transition cursor-pointer disabled:opacity-50"
            >
              {actionLoading ? 'Đang lưu...' : 'Lưu thay đổi'}
            </button>
          </div>
        </form>
      </Modal>

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
            ? `Bạn có chắc chắn muốn vô hiệu hóa tài khoản của giảng viên ${selectedLecturer.userId?.fullName}?\n\n• Mã giảng viên: ${selectedLecturer.lecturerCode}\n• Email: ${selectedLecturer.userId?.email || 'Chưa cập nhật'}\n\n⚠️ Lưu ý: Giảng viên sẽ không thể đăng nhập hoặc thực hiện các chức năng giảng viên sau khi bị vô hiệu hóa. Toàn bộ dữ liệu lịch sử hướng dẫn và chấm điểm vẫn được giữ lại an toàn.`
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
            ? `Bạn có muốn kích hoạt lại tài khoản cho giảng viên ${selectedLecturer.userId?.fullName} (Mã GV: ${selectedLecturer.lecturerCode})?\n\nSau khi kích hoạt, giảng viên có thể đăng nhập bình thường và xuất hiện lại trong danh sách phân công hướng dẫn/phản biện mới.`
            : 'Bạn có chắc chắn muốn kích hoạt lại giảng viên này?'
        }
        confirmText="Kích hoạt lại"
        cancelText="Hủy"
        type="primary"
        loading={actionLoading}
      />
    </div>
  );
};

export default LecturerManagement;
