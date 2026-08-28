import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import Modal from '../../components/common/Modal';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import SearchInput from '../../components/common/SearchInput';
import {
  KeyRound,
  ShieldCheck,
  CheckCircle2,
  XCircle,
  RefreshCw,
  Award,
  UserCheck,
  Building,
  User,
  Shield,
  Layers,
} from 'lucide-react';

const PERMISSION_OPTIONS = [
  {
    id: 'GVHD',
    label: 'GVHD (Giảng viên hướng dẫn)',
    desc: 'Được phân công hướng dẫn sinh viên KLTN và chấm điểm phần GVHD (Trọng số 40%).',
  },
  {
    id: 'GVPB_KIN',
    label: 'GVPB KÍN (Phản biện 1)',
    desc: 'Được phân công phản biện kín và nhập điểm phản biện 1 (Trọng số 30%).',
  },
  {
    id: 'GVPB_HOIDONG',
    label: 'GVPB HỘI ĐỒNG (Phản biện 2)',
    desc: 'Được phân công phản biện hội đồng và nhập điểm phản biện 2 (Trọng số 30%).',
  },
];

const AdminPermissionsPage = () => {
  const [lecturers, setLecturers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const { showToast } = useToast();

  // Modal state
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
      showToast(err.message || 'Lỗi khi lưu phân quyền', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Filter list by search
  const filteredLecturers = lecturers.filter((l) => {
    if (!search.trim()) return true;
    const term = search.toLowerCase();
    const name = l.user?.fullName?.toLowerCase() || '';
    const code = l.lecturerCode?.toLowerCase() || '';
    const spec = l.specialization?.toLowerCase() || '';
    return name.includes(term) || code.includes(term) || spec.includes(term);
  });

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-5">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#0B4DB7] flex items-center justify-center shrink-0 shadow-xs">
            <KeyRound className="w-7 h-7" />
          </div>
          <div>
            <div className="flex items-center gap-1.5 text-[#0B4DB7] font-bold text-[11px] tracking-wider uppercase">
              <span>QUẢN TRỊ HỆ THỐNG</span>
            </div>
            <h1 className="text-xl sm:text-2xl font-black text-slate-900 mt-0.5 tracking-tight">
              Quản Lý Phân Quyền Giảng Viên & Trưởng Bộ Môn
            </h1>
            <p className="text-xs text-slate-500 mt-1">
              Phân quyền 3 quyền nghiệp vụ độc lập (GVHD, GVPB Kín, GVPB Hội đồng) và chỉ định vai trò Trưởng Bộ Môn (TBM).
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchPermissionsList}
          className="self-start sm:self-auto inline-flex items-center gap-1.5 px-4 py-2.5 bg-slate-50 hover:bg-slate-100 text-slate-700 text-xs font-bold rounded-xl border border-slate-200 transition cursor-pointer shrink-0"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          <span>Làm mới</span>
        </button>
      </div>

      {/* 2. Filter / Search */}
      <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
        <div className="w-full sm:w-80">
          <SearchInput
            value={search}
            onChange={setSearch}
            placeholder="Tìm theo tên GV, Mã GV, Chuyên môn..."
          />
        </div>
        <div className="text-xs text-slate-500 font-medium">
          Tổng cộng: <strong>{filteredLecturers.length}</strong> giảng viên
        </div>
      </div>

      {/* 3. Table */}
      <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
        {loading ? (
          <div className="p-6">
            <LoadingSkeleton rows={5} cols={5} />
          </div>
        ) : filteredLecturers.length === 0 ? (
          <div className="p-12">
            <EmptyState
              title="Không tìm thấy giảng viên"
              description="Không có giảng viên nào phù hợp với điều kiện tìm kiếm."
            />
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                  <th className="py-3.5 px-4">Họ và Tên</th>
                  <th className="py-3.5 px-4">Mã GV</th>
                  <th className="py-3.5 px-4">Role</th>
                  <th className="py-3.5 px-4">Quyền Nghiệp Vụ</th>
                  <th className="py-3.5 px-4">Trạng thái</th>
                  <th className="py-3.5 px-4 text-right">Thao tác</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLecturers.map((item) => {
                  const role = item.user?.role || 'LECTURER';
                  const perms = item.permissions || [];
                  const isTbm = role === 'TBM';

                  return (
                    <tr key={item._id} className="hover:bg-slate-50/80 transition">
                      {/* Name & Academic Title */}
                      <td className="py-3.5 px-4">
                        <div className="font-bold text-slate-900">
                          {item.academicTitle ? `${item.academicTitle} ` : ''}
                          {item.user?.fullName || '—'}
                        </div>
                        <div className="text-[10px] text-slate-400 mt-0.5">
                          {item.specialization || 'Chưa cập nhật chuyên môn'}
                        </div>
                      </td>

                      {/* Code */}
                      <td className="py-3.5 px-4 font-mono font-bold text-slate-700">
                        {item.lecturerCode}
                      </td>

                      {/* Role */}
                      <td className="py-3.5 px-4">
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
                      </td>

                      {/* Permissions */}
                      <td className="py-3.5 px-4">
                        <div className="flex flex-wrap gap-1">
                          {perms.includes('GVHD') && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
                              GVHD
                            </span>
                          )}
                          {perms.includes('GVPB_KIN') && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-violet-50 text-violet-700 border border-violet-200">
                              GVPB KÍN
                            </span>
                          )}
                          {perms.includes('GVPB_HOIDONG') && (
                            <span className="px-2 py-0.5 rounded-md text-[10px] font-bold bg-purple-50 text-purple-700 border border-purple-200">
                              GVPB HỘI ĐỒNG
                            </span>
                          )}
                          {perms.length === 0 && (
                            <span className="text-[11px] text-slate-400 italic">
                              Chưa phân quyền
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Status */}
                      <td className="py-3.5 px-4">
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
                      </td>

                      {/* Actions */}
                      <td className="py-3.5 px-4 text-right">
                        <button
                          type="button"
                          onClick={() => handleOpenEdit(item)}
                          className="px-3 py-1.5 rounded-xl bg-blue-50 text-[#0B4DB7] font-bold border border-blue-200 hover:bg-blue-100 transition cursor-pointer"
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
            {/* Lecturer Card */}
            <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-1">
              <div className="text-slate-400 text-[10px] uppercase font-bold tracking-wider">
                Thông tin tài khoản
              </div>
              <div className="font-bold text-sm text-slate-900">
                {selectedLecturer.academicTitle ? `${selectedLecturer.academicTitle} ` : ''}
                {selectedLecturer.user?.fullName}
              </div>
              <div className="text-slate-500 flex items-center gap-3">
                <span>Mã GV: <strong className="font-mono text-slate-800">{selectedLecturer.lecturerCode}</strong></span>
                <span>•</span>
                <span>Role: <strong className="text-[#0B4DB7]">{selectedRole}</strong></span>
              </div>
            </div>

            {/* Permission Checkboxes */}
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
                          ? 'bg-blue-50/70 border-[#0B4DB7] ring-1 ring-blue-500/20'
                          : 'bg-white border-slate-200 hover:bg-slate-50'
                      }`}
                    >
                      <input
                        type="checkbox"
                        checked={isChecked}
                        onChange={() => {}}
                        className="mt-0.5 rounded text-[#0B4DB7] focus:ring-blue-500"
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

            {/* Role Switch (TBM vs LECTURER) */}
            <div className="space-y-2 pt-2 border-t border-slate-100">
              <label className="block text-[11px] font-bold text-slate-700 uppercase tracking-wider">
                Vai trò quản lý bộ môn
              </label>

              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => setSelectedRole('LECTURER')}
                  className={`p-3 rounded-2xl border text-center font-bold transition cursor-pointer ${
                    selectedRole === 'LECTURER'
                      ? 'bg-slate-900 text-white border-slate-900 shadow-xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  Giảng viên (LECTURER)
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
                  Trưởng Bộ Môn (TBM)
                </button>
              </div>
              <p className="text-[10px] text-slate-400 italic">
                * Chỉ định tài khoản làm Trưởng Bộ Môn (TBM) để quản lý phê duyệt đề tài và phân công hội đồng phản biện.
              </p>
            </div>

            {/* Footer Buttons */}
            <div className="flex items-center justify-end gap-2 pt-4 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setEditModalOpen(false)}
                className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={saving}
                onClick={handleSavePermissions}
                className="px-5 py-2 bg-[#0B4DB7] hover:bg-[#093e94] text-white font-bold rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50"
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
