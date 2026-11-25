import React, { useState, useEffect, useCallback } from 'react';
import studentApi from '../../api/studentApi';
import { useToast } from '../../context/ToastContext';
import SearchInput from '../../components/common/SearchInput';
import StatusBadge from '../../components/common/StatusBadge';
import Pagination from '../../components/common/Pagination';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import StudentFormModal from '../../components/students/StudentFormModal';
import StudentDetailModal from '../../components/students/StudentDetailModal';
import UserNameClickable from '../../components/common/UserNameClickable';
import {
  Users,
  Plus,
  Filter,
  Eye,
  Edit2,
  Trash2,
  CheckCircle2,
  XCircle,
  RefreshCw,
} from 'lucide-react';

const StudentManagement = () => {
  const [students, setStudents] = useState([]);
  const [availableClasses, setAvailableClasses] = useState([]);
  const [pagination, setPagination] = useState(null);
  const [loading, setLoading] = useState(true);

  // Trạng thái lọc và tìm kiếm
  const [search, setSearch] = useState('');
  const [className, setClassName] = useState('');
  const [prerequisiteCompleted, setPrerequisiteCompleted] = useState('');
  const [internshipRegistered, setInternshipRegistered] = useState('');
  const [thesisRegistered, setThesisRegistered] = useState('');
  const [page, setPage] = useState(1);

  // Trạng thái các Modal
  const [formModalOpen, setFormModalOpen] = useState(false);
  const [selectedStudent, setSelectedStudent] = useState(null);
  const [detailModalOpen, setDetailModalOpen] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [activateDialogOpen, setActivateDialogOpen] = useState(false);
  const [resetPasswordDialogOpen, setResetPasswordDialogOpen] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);

  const { showToast } = useToast();

  const fetchStudents = useCallback(async () => {
    setLoading(true);
    try {
      const res = await studentApi.getAll({
        page,
        limit: 10,
        search,
        className,
        prerequisiteCompleted,
        internshipRegistered,
        thesisRegistered,
      });

      if (res.success) {
        setStudents(res.data || []);
        setPagination(res.pagination || null);
        if (res.availableClasses?.length > 0) {
          setAvailableClasses(res.availableClasses);
        }
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách sinh viên', 'error');
    } finally {
      setLoading(false);
    }
  }, [page, search, className, prerequisiteCompleted, internshipRegistered, thesisRegistered, showToast]);

  useEffect(() => {
    fetchStudents();
  }, [fetchStudents]);

  // Đặt lại về trang 1 khi thay đổi bộ lọc
  const handleFilterChange = (setter, val) => {
    setter(val);
    setPage(1);
  };

  // Xử lý lưu form (Tạo mới / Chỉnh sửa)
  const handleFormSubmit = async (formData) => {
    setActionLoading(true);
    try {
      if (selectedStudent) {
        // Chỉnh sửa
        await studentApi.update(selectedStudent._id, formData);
        showToast('Cập nhật thông tin sinh viên thành công!', 'success');
      } else {
        // Tạo mới
        await studentApi.create(formData);
        showToast('Thêm mới sinh viên thành công!', 'success');
      }
      setFormModalOpen(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (err) {
      showToast(err.message || 'Thao tác không thành công', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý vô hiệu hóa tài khoản (Xóa mềm)
  const handleDeactivateConfirm = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      await studentApi.deactivate(selectedStudent._id);
      showToast(`Đã chuyển sinh viên ${selectedStudent.userId?.fullName || ''} sang trạng thái Không hoạt động`, 'success');
      setDeactivateDialogOpen(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (err) {
      showToast(err.message || 'Không thể vô hiệu hóa sinh viên', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý kích hoạt lại tài khoản
  const handleActivateConfirm = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      await studentApi.activate(selectedStudent._id);
      showToast(`Kích hoạt lại sinh viên ${selectedStudent.userId?.fullName || ''} thành công!`, 'success');
      setActivateDialogOpen(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (err) {
      showToast(err.message || 'Không thể kích hoạt lại sinh viên', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Xử lý đặt lại mật khẩu
  const handleResetPasswordConfirm = async () => {
    if (!selectedStudent) return;
    setActionLoading(true);
    try {
      await studentApi.resetPassword(selectedStudent._id);
      showToast(`Đặt lại mật khẩu cho sinh viên ${selectedStudent.userId?.fullName || ''} về mật khẩu mặc định (1111) thành công!`, 'success');
      setResetPasswordDialogOpen(false);
      setSelectedStudent(null);
      fetchStudents();
    } catch (err) {
      showToast(err.message || 'Không thể đặt lại mật khẩu', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Thẻ tiêu đề đầu trang */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5 p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0 shadow-xs">
            <Users className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              Quản lý Danh sách Sinh viên
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Quản lý hồ sơ, điều kiện tiên quyết và trạng thái hoạt động của sinh viên
            </p>
          </div>
        </div>

        <button
          onClick={() => {
            setSelectedStudent(null);
            setFormModalOpen(true);
          }}
          className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl bg-[#123891] hover:bg-[#093e94] text-white font-bold text-xs shadow-sm transition hover:shadow-md shrink-0 cursor-pointer w-full sm:w-auto"
        >
          <Plus className="w-4 h-4" />
          <span>Thêm sinh viên mới</span>
        </button>
      </div>

      {/* Thanh tìm kiếm và bộ lọc */}
      <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row gap-3 items-stretch md:items-center justify-between">
        <div className="w-full md:w-80">
          <SearchInput
            value={search}
            onChange={(val) => handleFilterChange(setSearch, val)}
            placeholder="Tìm theo MSSV, Họ tên, Email, Lớp..."
          />
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 w-full md:w-auto">
          <select
            value={className}
            onChange={(e) => handleFilterChange(setClassName, e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
          >
            <option value="">Tất cả Lớp học</option>
            {availableClasses.map((cls) => (
              <option key={cls} value={cls}>
                {cls}
              </option>
            ))}
          </select>

          <select
            value={prerequisiteCompleted}
            onChange={(e) => handleFilterChange(setPrerequisiteCompleted, e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
          >
            <option value="">ĐK Tiên quyết (Tất cả)</option>
            <option value="true">Đã đủ điều kiện</option>
            <option value="false">Chưa đạt điều kiện</option>
          </select>

          <select
            value={internshipRegistered}
            onChange={(e) => handleFilterChange(setInternshipRegistered, e.target.value)}
            className="w-full h-9 px-3 rounded-xl border border-slate-200 bg-slate-50 text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
          >
            <option value="">Đăng ký thực tập (Tất cả)</option>
            <option value="true">Đã đăng ký</option>
            <option value="false">Chưa đăng ký</option>
          </select>
        </div>
      </div>

      {/* Bảng chính & Danh sách thẻ Mobile */}
      <div className="rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={6} />
          </div>
        ) : students.length === 0 ? (
          <div className="p-8 sm:p-12">
            <EmptyState
              title="Không tìm thấy sinh viên nào"
              description="Hãy thử thay đổi từ khóa tìm kiếm hoặc các tiêu chí bộ lọc."
            />
          </div>
        ) : (
          <>
            {/* Bảng hiển thị cho Desktop & Tablet (>= 768px) */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse min-w-[880px]">
                <thead>
                  <tr className="border-b border-slate-100 bg-slate-50/75 text-[11px] font-bold text-slate-500 uppercase tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 text-center w-14 shrink-0">STT</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Sinh viên</th>
                    <th className="py-3.5 px-4 min-w-[110px]">Lớp</th>
                    <th className="py-3.5 px-4 min-w-[110px]">GPA / Tín chỉ</th>
                    <th className="py-3.5 px-4 min-w-[130px]">ĐK Tiên quyết</th>
                    <th className="py-3.5 px-4 min-w-[80px]">TTDN</th>
                    <th className="py-3.5 px-4 min-w-[80px]">KLTN</th>
                    <th className="py-3.5 px-4 min-w-[130px]">Trạng thái</th>
                    <th className="py-3.5 px-4 pr-6 text-right min-w-[110px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-sm">
                  {students.map((st, idx) => {
                    const isStudentActive = st.userId?.isActive !== false && st.isActive !== false;
                    return (
                      <tr
                        key={st._id}
                        className={`hover:bg-slate-50/80 transition-colors group ${
                          !isStudentActive ? 'bg-slate-50/40 opacity-75' : ''
                        }`}
                      >
                        {/* STT */}
                        <td className="py-3.5 px-4 text-center font-medium text-xs text-slate-500">
                          {(page - 1) * (pagination?.limit || 10) + idx + 1}
                        </td>

                        {/* Thông tin sinh viên */}
                        <td className="py-3.5 px-4">
                          <UserNameClickable
                            user={st}
                            name={st.userId?.fullName || 'Chưa đặt tên'}
                            subtitle={`${st.studentCode} • ${st.userId?.email || 'Chưa có email'}`}
                            avatarSize="w-9 h-9"
                          />
                        </td>

                        {/* Lớp sinh hoạt */}
                        <td className="py-3.5 px-4 font-medium text-slate-700 text-xs">
                          <span className="px-2 py-1 bg-slate-100 rounded-md font-mono">
                            {st.className}
                          </span>
                        </td>

                        {/* Điểm GPA & Tín chỉ */}
                        <td className="py-3.5 px-4 text-xs">
                          <div className="font-bold text-slate-800">
                            {Number(st.gpa).toFixed(2)} / 4.0
                          </div>
                          <div className="text-[11px] text-slate-500 mt-0.5">
                            {st.accumulatedCredits} tín chỉ
                          </div>
                        </td>

                        {/* Điều kiện tiên quyết */}
                        <td className="py-3.5 px-4">
                          {st.prerequisiteCompleted ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200/60">
                              <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đủ điều kiện
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-semibold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200/60">
                              <XCircle className="w-3 h-3 text-rose-600" /> Chưa đạt
                            </span>
                          )}
                        </td>

                        {/* Trạng thái thực tập */}
                        <td className="py-3.5 px-4">
                          <StatusBadge
                            status={st.internshipRegistered}
                            label={st.internshipRegistered ? 'Đã ĐK' : 'Chưa'}
                            size="sm"
                          />
                        </td>

                        {/* Trạng thái khóa luận */}
                        <td className="py-3.5 px-4">
                          <StatusBadge
                            status={st.thesisRegistered}
                            label={st.thesisRegistered ? 'Đã ĐK' : 'Chưa'}
                            size="sm"
                          />
                        </td>

                        {/* Trạng thái hoạt động của tài khoản người dùng */}
                        <td className="py-3.5 px-4">
                          {isStudentActive ? (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-50 text-emerald-700 border border-emerald-200/80">
                              <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                              Đang hoạt động
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-bold bg-slate-100 text-slate-600 border border-slate-300">
                              <span className="w-1.5 h-1.5 rounded-full bg-slate-400" />
                              Không hoạt động
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 px-4 pr-6 text-right">
                          <div className="flex items-center justify-end gap-1">
                            <button
                              onClick={() => {
                                setSelectedStudent(st);
                                setDetailModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-[#123891] hover:bg-blue-50 rounded-lg transition"
                              title="Xem chi tiết"
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            <button
                              onClick={() => {
                                setSelectedStudent(st);
                                setFormModalOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-amber-600 hover:bg-amber-50 rounded-lg transition"
                              title="Chỉnh sửa"
                            >
                              <Edit2 className="w-4 h-4" />
                            </button>

                            {/* Nút đặt lại mật khẩu */}
                            <button
                              onClick={() => {
                                setSelectedStudent(st);
                                setResetPasswordDialogOpen(true);
                              }}
                              className="p-1.5 text-slate-500 hover:text-sky-600 hover:bg-sky-50 rounded-lg transition"
                              title="Reset mật khẩu về mặc định (1111)"
                            >
                              <RefreshCw className="w-4 h-4" />
                            </button>

                            {/* Nút Bật / Khóa tài khoản */}
                            {isStudentActive ? (
                              <button
                                onClick={() => {
                                  setSelectedStudent(st);
                                  setDeactivateDialogOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition"
                                title="Vô hiệu hóa sinh viên"
                              >
                                <Trash2 className="w-4 h-4" />
                              </button>
                            ) : (
                              <button
                                onClick={() => {
                                  setSelectedStudent(st);
                                  setActivateDialogOpen(true);
                                }}
                                className="p-1.5 text-slate-500 hover:text-emerald-600 hover:bg-emerald-50 rounded-lg transition"
                                title="Kích hoạt lại sinh viên"
                              >
                                <CheckCircle2 className="w-4 h-4" />
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

            {/* Hiển thị thẻ Mobile (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {students.map((st, idx) => {
                const isStudentActive = st.userId?.isActive !== false && st.isActive !== false;
                return (
                  <div key={st._id} className={`p-4 space-y-3 hover:bg-slate-50/60 transition ${!isStudentActive ? 'bg-slate-50/40 opacity-80' : ''}`}>
                    {/* Hàng đầu thẻ: STT + Thông tin sinh viên + Trạng thái */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="flex items-center gap-2 min-w-0 flex-1">
                        <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                          {(page - 1) * (pagination?.limit || 10) + idx + 1}
                        </span>
                        <div className="min-w-0">
                          <UserNameClickable
                            user={st}
                            name={st.userId?.fullName || 'Chưa đặt tên'}
                            subtitle={`${st.studentCode} • ${st.className || ''}`}
                            avatarSize="w-8 h-8"
                          />
                        </div>
                      </div>

                      {isStudentActive ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0">
                          <span className="w-1.5 h-1.5 rounded-full bg-emerald-500 animate-pulse" />
                          Hoạt động
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 border border-slate-300 shrink-0">
                          Khóa
                        </span>
                      )}
                    </div>

                    {/* Lưới thống kê & Huy hiệu */}
                    <div className="grid grid-cols-2 gap-2 text-xs p-2.5 bg-slate-50/70 rounded-xl border border-slate-100">
                      <div>
                        <span className="text-slate-400 text-[10px] block">GPA / Tín chỉ:</span>
                        <span className="font-bold text-slate-800 text-[11px]">
                          {Number(st.gpa).toFixed(2)}/4.0 • {st.accumulatedCredits} TC
                        </span>
                      </div>
                      <div>
                        <span className="text-slate-400 text-[10px] block">Điều kiện:</span>
                        {st.prerequisiteCompleted ? (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-emerald-700">
                            <CheckCircle2 className="w-3 h-3 text-emerald-600" /> Đủ ĐK
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[10.5px] font-semibold text-rose-600">
                            <XCircle className="w-3 h-3" /> Chưa đạt
                          </span>
                        )}
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">TTDN:</span>
                        <StatusBadge
                          status={st.internshipRegistered}
                          label={st.internshipRegistered ? 'Đã ĐK' : 'Chưa'}
                          size="sm"
                        />
                      </div>
                      <div className="flex items-center gap-1.5">
                        <span className="text-slate-400 text-[10px]">KLTN:</span>
                        <StatusBadge
                          status={st.thesisRegistered}
                          label={st.thesisRegistered ? 'Đã ĐK' : 'Chưa'}
                          size="sm"
                        />
                      </div>
                    </div>

                    {/* Hàng thao tác */}
                    <div className="flex items-center justify-end gap-1.5 pt-1">
                      <button
                        onClick={() => {
                          setSelectedStudent(st);
                          setDetailModalOpen(true);
                        }}
                        className="p-2 text-slate-600 hover:text-[#123891] hover:bg-blue-50 border border-slate-200 rounded-xl transition active:scale-95 cursor-pointer"
                        title="Xem chi tiết"
                      >
                        <Eye className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedStudent(st);
                          setFormModalOpen(true);
                        }}
                        className="p-2 text-slate-600 hover:text-amber-600 hover:bg-amber-50 border border-slate-200 rounded-xl transition active:scale-95 cursor-pointer"
                        title="Chỉnh sửa"
                      >
                        <Edit2 className="w-4 h-4" />
                      </button>

                      <button
                        onClick={() => {
                          setSelectedStudent(st);
                          setResetPasswordDialogOpen(true);
                        }}
                        className="p-2 text-sky-600 hover:bg-sky-50 border border-sky-200 rounded-xl transition active:scale-95 cursor-pointer"
                        title="Reset mật khẩu về mặc định (1111)"
                      >
                        <RefreshCw className="w-4 h-4" />
                      </button>

                      {isStudentActive ? (
                        <button
                          onClick={() => {
                            setSelectedStudent(st);
                            setDeactivateDialogOpen(true);
                          }}
                          className="p-2 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-xl transition active:scale-95 cursor-pointer"
                          title="Vô hiệu hóa sinh viên"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      ) : (
                        <button
                          onClick={() => {
                            setSelectedStudent(st);
                            setActivateDialogOpen(true);
                          }}
                          className="p-2 text-emerald-600 hover:bg-emerald-50 border border-emerald-200 rounded-xl transition active:scale-95 cursor-pointer"
                          title="Kích hoạt lại sinh viên"
                        >
                          <CheckCircle2 className="w-4 h-4" />
                        </button>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          </>
        )}

        {/* Phân trang */}
        <div className="border-t border-slate-100 bg-slate-50/50 px-4">
          <Pagination pagination={pagination} onPageChange={setPage} />
        </div>
      </div>

      {/* Modal biểu mẫu */}
      <StudentFormModal
        isOpen={formModalOpen}
        onClose={() => {
          setFormModalOpen(false);
          setSelectedStudent(null);
        }}
        onSubmit={handleFormSubmit}
        initialData={selectedStudent}
        availableClasses={availableClasses}
        loading={actionLoading}
      />

      {/* Modal chi tiết */}
      <StudentDetailModal
        isOpen={detailModalOpen}
        onClose={() => {
          setDetailModalOpen(false);
          setSelectedStudent(null);
        }}
        student={selectedStudent}
      />

      {/* Hộp thoại xác nhận vô hiệu hóa (Xóa mềm) */}
      <ConfirmDialog
        isOpen={deactivateDialogOpen}
        onClose={() => {
          setDeactivateDialogOpen(false);
          setSelectedStudent(null);
        }}
        onConfirm={handleDeactivateConfirm}
        title="Xác nhận vô hiệu hóa sinh viên"
        message={`Bạn có chắc chắn muốn chuyển sinh viên ${selectedStudent?.userId?.fullName} - ${selectedStudent?.studentCode} sang trạng thái Không hoạt động không?`}
        confirmText="Vô hiệu hóa"
        loading={actionLoading}
      />

      {/* Hộp thoại xác nhận kích hoạt tài khoản */}
      <ConfirmDialog
        isOpen={activateDialogOpen}
        onClose={() => {
          setActivateDialogOpen(false);
          setSelectedStudent(null);
        }}
        onConfirm={handleActivateConfirm}
        title="Xác nhận kích hoạt lại sinh viên"
        message={`Bạn có chắc chắn muốn kích hoạt lại sinh viên ${selectedStudent?.userId?.fullName} - ${selectedStudent?.studentCode} không?`}
        confirmText="Kích hoạt lại"
        loading={actionLoading}
      />

      {/* Hộp thoại xác nhận đặt lại mật khẩu */}
      <ConfirmDialog
        isOpen={resetPasswordDialogOpen}
        onClose={() => {
          setResetPasswordDialogOpen(false);
          setSelectedStudent(null);
        }}
        onConfirm={handleResetPasswordConfirm}
        title="Xác nhận đặt lại mật khẩu"
        message={`Bạn có chắc chắn muốn đặt lại mật khẩu cho sinh viên ${selectedStudent?.userId?.fullName} - ${selectedStudent?.studentCode} về mật khẩu mặc định (1111) không?`}
        confirmText="Reset mật khẩu"
        loading={actionLoading}
      />
    </div>
  );
};

export default StudentManagement;
