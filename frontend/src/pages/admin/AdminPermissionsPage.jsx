import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import SearchInput from '../../components/common/SearchInput';
import {
  KeyRound,
  CheckCircle2,
  XCircle,
  Building,
  User,
  ChevronLeft,
  ChevronRight,
} from 'lucide-react';

const PERMISSION_OPTIONS = [
  {
    id: 'GVHD',
    label: 'GVHD (Giảng viên hướng dẫn)',
    desc: 'Được phân công hướng dẫn sinh viên KLTN và chấm điểm phần GVHD (Trọng số 50%).',
  },
  {
    id: 'GVPB_KIN',
    label: 'GVPB KÍN (Phản biện 1)',
    desc: 'Được phân công phản biện kín và nhập điểm phản biện 1 (Trọng số 30%).',
  },
  {
    id: 'GVPB_HOIDONG',
    label: 'GVPB HỘI ĐỒNG (Phản biện 2)',
    desc: 'Được phân công phản biện hội đồng và nhập điểm phản biện 2 (Trọng số 20%).',
  },
];

const AdminPermissionsPage = () => {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const { showToast } = useToast();

  // Trạng thái Modal
  const [editModalOpen, setEditModalOpen] = useState(false);
  const [selectedLecturer, setSelectedLecturer] = useState(null);
  const [selectedPermissions, setSelectedPermissions] = useState([]);
  const [selectedRole, setSelectedRole] = useState('LECTURER');
  const [saving, setSaving] = useState(false);

  const fetchPermissionsList = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getPermissionsList();
      if (res.success) {
        setLecturers(res.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách phân quyền giảng viên', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchPermissionsList();
  }, [fetchPermissionsList]);

  const handleOpenEdit = (lec) => {
    setSelectedLecturer(lec);
    setSelectedPermissions(lec.permissions || ['GVHD', 'GVPB_KIN', 'GVPB_HOIDONG']);
    setSelectedRole(lec.user?.role || 'LECTURER');
    setEditModalOpen(true);
  };

  const handleTogglePermission = (permId) => {
    if (selectedPermissions.includes(permId)) {
      setSelectedPermissions(selectedPermissions.filter((p) => p !== permId));
    } else {
      setSelectedPermissions([...selectedPermissions, permId]);
    }
  };

  const handleSavePermissions = async () => {
    if (!selectedLecturer) return;
    setSaving(true);
    try {
      const res = await adminApi.updateLecturerPermissions(selectedLecturer._id, {
        permissions: selectedPermissions,
        role: selectedRole,
      });

      if (res.success) {
        showToast('Cập nhật phân quyền giảng viên thành công!', 'success');
        setEditModalOpen(false);
        fetchPermissionsList();
      }
    } catch (err) {
      showToast(err.message || 'Kh lưu phân quyền', 'error');
    } finally {
      setSaving(false);
    }
  };

  const handleSearchChange = (val) => {
    setSearch(val);
    setPage(1);
  };

  const handleLimitChange = (val) => {
    setLimit(Number(val));
    setPage(1);
  };

  const handlePageChange = (newPage) => {
    if (newPage >= 1 && newPage <= totalPages && newPage !== page) {
      setPage(newPage);
    }
  };

  const getPageNumbers = (curr, totalP) => {
    if (totalP <= 7) {
      return Array.from({ length: totalP }, (_, i) => i + 1);
    }
    if (curr <= 4) {
      return [1, 2, 3, 4, 5, '...', totalP];
    }
    if (curr >= totalP - 3) {
      return [1, '...', totalP - 4, totalP - 3, totalP - 2, totalP - 1, totalP];
    }
    return [1, '...', curr - 1, curr, curr + 1, '...', totalP];
  };

  // Lọc danh sách theo từ khóa tìm kiếm
  const filteredLecturers = lecturers.filter((l) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const name = l.user?.fullName?.toLowerCase() || '';
    const code = l.lecturerCode?.toLowerCase() || '';
    const spec = l.specialization?.toLowerCase() || '';
    return name.includes(term) || code.includes(term) || spec.includes(term);
  });

  // Tính toán phân trang dựa trên danh sách đã lọc
  const total = filteredLecturers.length;
  const totalPages = Math.max(1, Math.ceil(total / limit));
  const startIndex = (page - 1) * limit;
  const endIndex = Math.min(startIndex + limit, total);
  const paginatedLecturers = filteredLecturers.slice(startIndex, endIndex);

  // Tự động đưa về trang hợp lệ gần nhất nếu số lượng thay đổi
  useEffect(() => {
    if (page > totalPages) {
      setPage(totalPages);
    }
  }, [page, totalPages]);

  return (
    <div className="space-y-6">
      {/* 1. Banner tiêu đề trang */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4 sm:gap-5">
        <div className="flex items-center gap-3.5 sm:gap-4">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0 shadow-xs">
            <KeyRound className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div>
            <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
              Quản lý Phân quyền Giảng viên & Bộ môn
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Phân quyền nghiệp vụ (GVHD, GVPB) và chỉ định vai trò Trưởng Bộ Môn
            </p>
          </div>
        </div>
      </div>

      {/* 2. Bộ lọc / Tìm kiếm */}
      <div className="p-3.5 sm:p-4 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row gap-3 items-stretch sm:items-center justify-between">
        <div className="w-full sm:w-80 md:w-96">
          <SearchInput
            value={search}
            onChange={handleSearchChange}
            placeholder="Tìm theo tên GV, email..."
          />
        </div>

        <div className="text-xs text-slate-500 font-medium whitespace-nowrap text-right sm:text-left">
          Tổng cộng: <strong>{filteredLecturers.length}</strong> giảng viên
        </div>
      </div>

      {/* 3. Bảng / Danh sách thẻ */}
      <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={5} />
          </div>
        ) : filteredLecturers.length === 0 ? (
          <div className="p-8 sm:p-12">
            <EmptyState
              title="Không tìm thấy giảng viên"
              description="Không có giảng viên nào phù hợp với điều kiện tìm kiếm."
            />
          </div>
        ) : (
          <>
            {/* Bảng hiển thị cho Desktop & Tablet (>= 768px) */}
            <div className="hidden md:block overflow-x-auto custom-scrollbar">
              <table className="w-full text-left border-collapse text-xs min-w-[850px]">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider whitespace-nowrap">
                    <th className="py-3.5 px-4 text-center w-14 shrink-0">STT</th>
                    <th className="py-3.5 px-4 min-w-[180px]">Họ và Tên</th>
                    <th className="py-3.5 px-4 min-w-[110px]">Role</th>
                    <th className="py-3.5 px-4 min-w-[200px]">Quyền Nghiệp Vụ</th>
                    <th className="py-3.5 px-4 min-w-[110px]">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right min-w-[120px]">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {paginatedLecturers.map((item, idx) => {
                    const role = item.user?.role || 'LECTURER';
                    const perms = item.permissions || [];
                    const isTbm = role === 'TBM';

                    return (
                      <tr key={item._id} className="hover:bg-slate-50/80 transition">
                        {/* STT */}
                        <td className="py-3.5 px-4 text-center font-medium text-slate-500 whitespace-nowrap">
                          {startIndex + idx + 1}
                        </td>

                        {/* Họ tên & Học hàm học vị */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-bold text-slate-900">
                            {item.academicTitle ? `${item.academicTitle} ` : ''}
                            {item.user?.fullName || '—'}
                          </div>
                          <div className="text-[10px] text-slate-400 mt-0.5">
                            {item.department || 'Khoa Công nghệ Thông tin'}
                          </div>
                        </td>

                        {/* Vai trò */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isTbm ? (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                              <Building className="w-3 h-3 shrink-0" />
                              TBM
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              <User className="w-3 h-3 shrink-0" />
                              LECTURER
                            </span>
                          )}
                        </td>

                        {/* Phân quyền */}
                        <td className="py-3.5 px-4">
                          <div className="flex flex-wrap gap-1">
                            {perms.includes('GVHD') && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#102d7d] border border-blue-200 whitespace-nowrap">
                                GVHD
                              </span>
                            )}
                            {perms.includes('GVPB_KIN') && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#102d7d] border border-blue-200 whitespace-nowrap">
                                GVPB KÍN
                              </span>
                            )}
                            {perms.includes('GVPB_HOIDONG') && (
                              <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#102d7d] border border-blue-200 whitespace-nowrap">
                                GVPB HỘI ĐỒNG
                              </span>
                            )}
                            {perms.length === 0 && (
                              <span className="text-[11px] text-slate-400 italic whitespace-nowrap">
                                Chưa phân quyền
                              </span>
                            )}
                          </div>
                        </td>

                        {/* Trạng thái */}
                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {item.user?.isActive !== false ? (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3 shrink-0" />
                              Active
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2.5 py-0.5 rounded-full border border-rose-200">
                              <XCircle className="w-3 h-3 shrink-0" />
                              Inactive
                            </span>
                          )}
                        </td>

                        {/* Thao tác */}
                        <td className="py-3.5 px-4 text-right whitespace-nowrap">
                          <button
                            type="button"
                            onClick={() => handleOpenEdit(item)}
                            className="inline-flex items-center justify-center min-w-[95px] px-3.5 py-1.5 rounded-xl bg-blue-50 text-[#123891] font-bold border border-blue-200 hover:bg-blue-100 transition cursor-pointer whitespace-nowrap shadow-2xs"
                          >
                            Phân quyền
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Hiển thị thẻ Mobile (< 768px) */}
            <div className="md:hidden divide-y divide-slate-100">
              {paginatedLecturers.map((item, idx) => {
                const role = item.user?.role || 'LECTURER';
                const perms = item.permissions || [];
                const isTbm = role === 'TBM';

                return (
                  <div key={item._id} className="p-4 space-y-3 hover:bg-slate-50/60 transition">
                    {/* Hàng tiêu đề: STT + Họ tên + Vai trò */}
                    <div className="flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <span className="w-5 h-5 rounded-md bg-slate-100 text-slate-500 font-mono text-[10px] font-bold flex items-center justify-center shrink-0">
                            {startIndex + idx + 1}
                          </span>
                          <span className="font-bold text-slate-900 text-sm">
                            {item.academicTitle ? `${item.academicTitle} ` : ''}
                            {item.user?.fullName || '—'}
                          </span>
                        </div>
                        <div className="text-[11px] text-slate-400 mt-0.5">
                          {item.department || 'Khoa Công nghệ Thông tin'}
                        </div>
                      </div>

                      {/* Huy hiệu vai trò */}
                      <div className="shrink-0">
                        {isTbm ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-amber-50 text-amber-800 border border-amber-200">
                            <Building className="w-3 h-3" />
                            TBM
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                            <User className="w-3 h-3" />
                            LECTURER
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Huy hiệu các quyền */}
                    <div>
                      <div className="text-[10px] uppercase font-bold text-slate-400 mb-1">
                        Quyền nghiệp vụ
                      </div>
                      <div className="flex flex-wrap gap-1">
                        {perms.includes('GVHD') && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#102d7d] border border-blue-200">
                            GVHD
                          </span>
                        )}
                        {perms.includes('GVPB_KIN') && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#102d7d] border border-blue-200">
                            GVPB KÍN
                          </span>
                        )}
                        {perms.includes('GVPB_HOIDONG') && (
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-blue-50 text-[#102d7d] border border-blue-200">
                            GVPB HỘI ĐỒNG
                          </span>
                        )}
                        {perms.length === 0 && (
                          <span className="text-[11px] text-slate-400 italic">
                            Chưa phân quyền
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Hàng chân trang: Trạng thái + Nút thao tác */}
                    <div className="flex items-center justify-between pt-2 border-t border-slate-100/80 gap-3">
                      <div>
                        {item.user?.isActive !== false ? (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                            <CheckCircle2 className="w-3 h-3" />
                            Active
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-700 bg-rose-50 px-2 py-0.5 rounded-full border border-rose-200">
                            <XCircle className="w-3 h-3" />
                            Inactive
                          </span>
                        )}
                      </div>

                      <button
                        type="button"
                        onClick={() => handleOpenEdit(item)}
                        className="px-4 py-2 rounded-xl bg-blue-50 text-[#123891] text-xs font-bold border border-blue-200 hover:bg-blue-100 active:scale-95 transition cursor-pointer"
                      >
                        Phân quyền
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Khu vực phân trang (Pagination) */}
            <div className="bg-slate-50/60 border-t border-slate-200/80 px-4 py-3.5 sm:px-6 sm:py-4 flex flex-col md:flex-row items-center justify-between gap-3.5 text-xs">
              {/* Bên trái: Thông tin hiển thị & Bộ chọn số bản ghi/trang */}
              <div className="flex flex-col sm:flex-row sm:items-center gap-3 text-slate-500 w-full md:w-auto justify-between sm:justify-start">
                <div>
                  Đang hiển thị{' '}
                  <span className="font-bold text-slate-800">
                    {total === 0 ? 0 : startIndex + 1}–{endIndex}
                  </span>{' '}
                  trên <span className="font-bold text-slate-800">{total}</span> giảng viên
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[11px] text-slate-400">Hiển thị:</span>
                  <select
                    value={limit}
                    onChange={(e) => handleLimitChange(e.target.value)}
                    className="px-2.5 py-1.5 bg-white border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 cursor-pointer shadow-2xs"
                  >
                    <option value={10}>10 giảng viên / trang</option>
                    <option value={20}>20 giảng viên / trang</option>
                    <option value={50}>50 giảng viên / trang</option>
                  </select>
                </div>
              </div>

              {/* Bên phải: Nút Trước (chỉ hiển thị khi page > 1), Các số trang, Nút Sau (chỉ hiển thị khi page < totalPages) */}
              <div className="flex items-center gap-1.5 w-full md:w-auto justify-center md:justify-end">
                {page > 1 && (
                  <button
                    type="button"
                    onClick={() => handlePageChange(page - 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                    title="Trang trước"
                  >
                    <ChevronLeft className="w-4 h-4" />
                    <span className="hidden sm:inline">Trước</span>
                  </button>
                )}

                {/* Danh sách các số trang */}
                <div className="flex items-center gap-1">
                  {getPageNumbers(page, totalPages).map((p, pIdx) => {
                    if (p === '...') {
                      return (
                        <span key={`ellipsis-${pIdx}`} className="px-1.5 py-1 text-slate-400 font-bold select-none">
                          ...
                        </span>
                      );
                    }
                    const isCurrent = p === page;
                    return (
                      <button
                        key={p}
                        type="button"
                        onClick={() => handlePageChange(p)}
                        className={`w-8 h-8 rounded-xl text-xs font-bold transition cursor-pointer ${
                          isCurrent
                            ? 'bg-[#123891] text-white shadow-xs'
                            : 'bg-white border border-slate-200 text-slate-700 hover:bg-slate-50'
                        }`}
                      >
                        {p}
                      </button>
                    );
                  })}
                </div>

                {page < totalPages && (
                  <button
                    type="button"
                    onClick={() => handlePageChange(page + 1)}
                    className="inline-flex items-center gap-1 px-3 py-1.5 text-xs font-semibold rounded-xl border border-slate-200 bg-white text-slate-600 hover:bg-slate-50 transition cursor-pointer shadow-2xs"
                    title="Trang sau"
                  >
                    <span className="hidden sm:inline">Sau</span>
                    <ChevronRight className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>
          </>
        )}
      </div>

      {/* 4. Modal Phân Quyền */}
      {selectedLecturer && (
        <Modal
          isOpen={editModalOpen}
          onClose={() => setEditModalOpen(false)}
          title="Phân Quyền Nghiệp Vụ Giảng Viên & Bộ Môn"
          maxWidth="max-w-lg"
        >
          <div className="space-y-5 text-xs">
            {/* Thẻ giảng viên */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Thông tin tài khoản
              </div>
              <div className="font-bold text-sm text-slate-900">
                {selectedLecturer.academicTitle ? `${selectedLecturer.academicTitle} ` : ''}
                {selectedLecturer.user?.fullName}
              </div>
              <div className="text-slate-500 flex items-center gap-3">
                
                <span>Role: <strong className="text-[#123891]">{selectedRole}</strong></span>
              </div>
            </div>

            {/* Các ô chọn phân quyền */}
            <div className="space-y-2.5">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Quyền nghiệp vụ (Khóa luận tốt nghiệp)
              </label>

              <div className="space-y-2">
                {PERMISSION_OPTIONS.map((opt) => {
                  const isChecked = selectedPermissions.includes(opt.id);
                  return (
                    <label
                      key={opt.id}
                      onClick={() => handleTogglePermission(opt.id)}
                      className={`flex items-start gap-3 p-3 rounded-2xl border cursor-pointer transition select-none ${
                        isChecked
                          ? 'bg-blue-50/70 border-[#123891] ring-1 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-[#123891] focus:ring-blue-500"
                      />
                      <div>
                        <div className="font-bold text-slate-900">{opt.label}</div>
                        <div className="text-[11px] text-slate-500 mt-0.5">{opt.desc}</div>
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Chuyển đổi vai trò (TBM / LECTURER) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Vai trò quản lý bộ môn
              </label>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('LECTURER')}
                  className={`p-3 rounded-2xl border text-center font-bold transition cursor-pointer ${
                    selectedRole === 'LECTURER'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Giảng viên
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedRole('TBM')}
                  className={`p-3 rounded-2xl border text-center font-bold transition cursor-pointer ${
                    selectedRole === 'TBM'
                      ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-xs font-black'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Trưởng Bộ Môn
                </button>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                * Chỉ định tài khoản làm Trưởng Bộ Môn để quản lý phê duyệt đề tài và phân công hội đồng phản biện.
              </p>
            </div>

            {/* Các nút chân modal */}
            <div className="flex flex-col-reverse sm:flex-row items-stretch sm:items-center justify-end gap-2.5 sm:gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="w-full sm:w-auto px-4 py-2.5 sm:py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer text-center"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSavePermissions}
                className="w-full sm:w-auto px-5 py-2.5 sm:py-2 bg-[#123891] hover:bg-[#093e94] text-white font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 text-center"
              >
                {saving ? 'Đang lưu...' : 'Lưu thay đổi'}
              </button>
            </div>
          </div>
        </Modal>
      )}
    </div>
  );
};

export default AdminPermissionsPage;
