import React, { useState, useEffect, useCallback, useMemo } from 'react';
import researchFieldApi from '../../api/researchFieldApi';
import { useToast } from '../../context/ToastContext';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import ConfirmDialog from '../../components/common/ConfirmDialog';

import {
  Tag,
  Check,
  X,
  Plus,
  Trash2,
  Edit2,
  Users,
  CheckCircle2,
  Clock,
  Sparkles,
  RefreshCw,
  AlertCircle,
  HelpCircle,
  ShieldCheck,
} from 'lucide-react';

const TbmLecturerFieldsPage = () => {
  const { showToast } = useToast();

  // Loading states
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState(false);

  // Data states
  const [requests, setRequests] = useState([]);
  const [lecturers, setLecturers] = useState([]);
  const [allFields, setAllFields] = useState([]);

  // Selection states
  const [selectedLecturerIds, setSelectedLecturerIds] = useState([]);
  const [activeTags, setActiveTags] = useState([]);

  // Tag Management Modal state
  const [isTagModalOpen, setIsTagModalOpen] = useState(false);
  const [newTagName, setNewTagName] = useState('');
  const [tagModalLoading, setTagModalLoading] = useState(false);

  // Confirm Dialog states
  const [confirmDialog, setConfirmDialog] = useState({
    isOpen: false,
    title: '',
    message: '',
    confirmText: 'Xác nhận',
    isDanger: false,
    showIcon: false,
    onConfirm: () => {},
  });

  // Fetch all initial data
  const fetchData = useCallback(async () => {
    setLoading(true);
    try {
      const [reqRes, lecRes, fieldRes] = await Promise.all([
        researchFieldApi.getAllRequests(),
        researchFieldApi.getLecturersWithFields(),
        researchFieldApi.getAllFields(),
      ]);

      if (reqRes.success) setRequests(reqRes.data || []);
      if (lecRes.success) setLecturers(lecRes.data || []);
      if (fieldRes.success) setAllFields(fieldRes.data || []);
    } catch (err) {
      showToast(err.message || 'Không thể tải dữ liệu lĩnh vực giảng viên', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Sync activeTags when lecturer selection changes
  useEffect(() => {
    if (selectedLecturerIds.length === 1) {
      const singleLec = lecturers.find((l) => l._id === selectedLecturerIds[0]);
      if (singleLec) {
        setActiveTags([...(singleLec.fields || [])]);
      } else {
        setActiveTags([]);
      }
    } else {
      // 0 or >= 2 lecturers: start with empty (gray) tags
      setActiveTags([]);
    }
  }, [selectedLecturerIds, lecturers]);

  // Lecturer list
  const filteredLecturers = lecturers;

  // Check if exactly 1 lecturer selected
  const singleLecturer = useMemo(() => {
    if (selectedLecturerIds.length === 1) {
      return lecturers.find((l) => l._id === selectedLecturerIds[0]) || null;
    }
    return null;
  }, [selectedLecturerIds, lecturers]);

  // Determine if tags changed for 1 lecturer
  const isSingleLecturerTagsChanged = useMemo(() => {
    if (!singleLecturer) return false;
    const original = [...(singleLecturer.fields || [])].sort();
    const current = [...activeTags].sort();
    return JSON.stringify(original) !== JSON.stringify(current);
  }, [singleLecturer, activeTags]);

  // Determine if Confirm button is enabled
  const isConfirmEnabled = useMemo(() => {
    if (selectedLecturerIds.length === 0) return false;
    if (selectedLecturerIds.length === 1) {
      return isSingleLecturerTagsChanged;
    }
    // Multiple lecturers selected (>= 2): enabled if at least 1 tag is selected
    return activeTags.length > 0;
  }, [selectedLecturerIds.length, isSingleLecturerTagsChanged, activeTags.length]);

  // Checkbox toggle lecturer
  const handleToggleLecturer = (lecId) => {
    setSelectedLecturerIds((prev) =>
      prev.includes(lecId) ? prev.filter((id) => id !== lecId) : [...prev, lecId]
    );
  };

  // Select all / Deselect all filtered lecturers
  const handleSelectAllFiltered = (e) => {
    if (e.target.checked) {
      const allFilteredIds = filteredLecturers.map((l) => l._id);
      setSelectedLecturerIds(Array.from(new Set([...selectedLecturerIds, ...allFilteredIds])));
    } else {
      const filteredIdSet = new Set(filteredLecturers.map((l) => l._id));
      setSelectedLecturerIds((prev) => prev.filter((id) => !filteredIdSet.has(id)));
    }
  };

  // Toggle active tag in right panel
  const handleToggleTag = (tagName) => {
    if (selectedLecturerIds.length === 0) {
      showToast('Vui lòng chọn ít nhất 1 giảng viên', 'info');
      return;
    }
    setActiveTags((prev) =>
      prev.includes(tagName) ? prev.filter((t) => t !== tagName) : [...prev, tagName]
    );
  };

  // Submit assign fields to selected lecturers
  const handleSaveFields = async () => {
    if (selectedLecturerIds.length === 0) return;
    setActionLoading(true);
    try {
      const res = await researchFieldApi.assignFields({
        lecturerIds: selectedLecturerIds,
        fields: activeTags,
      });

      if (res.success) {
        showToast(
          `Cập nhật lĩnh vực thành công cho ${selectedLecturerIds.length} giảng viên`,
          'success'
        );
        // Refresh lecturers
        const lecRes = await researchFieldApi.getLecturersWithFields();
        if (lecRes.success) setLecturers(lecRes.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể cập nhật lĩnh vực', 'error');
    } finally {
      setActionLoading(false);
    }
  };

  // Approve a field change request
  const handleApproveRequest = (request) => {
    const lecName = request.lecturerId?.userId?.fullName || 'giảng viên';
    setConfirmDialog({
      isOpen: true,
      title: 'Duyệt yêu cầu thay đổi lĩnh vực',
      message: `Bạn có chắc chắn muốn duyệt yêu cầu thay đổi lĩnh vực cho ${lecName}? Lĩnh vực của giảng viên sẽ được cập nhật và các tag mới (nếu có) sẽ tự động thêm vào danh mục hệ thống.`,
      confirmText: 'Xác nhận',
      isDanger: false,
      showIcon: false,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await researchFieldApi.approveRequest(request._id);
          if (res.success) {
            showToast('Đã duyệt yêu cầu thay đổi lĩnh vực thành công', 'success');
            await fetchData();
          }
        } catch (err) {
          showToast(err.message || 'Không thể duyệt yêu cầu', 'error');
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Reject a field change request
  const handleRejectRequest = (request) => {
    const lecName = request.lecturerId?.userId?.fullName || 'giảng viên';
    setConfirmDialog({
      isOpen: true,
      title: 'Từ chối yêu cầu thay đổi lĩnh vực',
      message: `Bạn có chắc chắn muốn từ chối yêu cầu của ${lecName}?`,
      confirmText: 'Từ chối',
      isDanger: true,
      showIcon: false,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await researchFieldApi.rejectRequest(request._id);
          if (res.success) {
            showToast('Đã từ chối yêu cầu', 'info');
            await fetchData();
          }
        } catch (err) {
          showToast(err.message || 'Không thể từ chối yêu cầu', 'error');
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  // Add a new system tag in Modal
  const handleCreateSystemTag = async () => {
    const cleanName = newTagName.trim();
    if (!cleanName) {
      showToast('Vui lòng nhập tên tag lĩnh vực', 'warning');
      return;
    }

    setTagModalLoading(true);
    try {
      const res = await researchFieldApi.createField({ name: cleanName });
      if (res.success) {
        showToast('Thêm tag lĩnh vực vào hệ thống thành công', 'success');
        setNewTagName('');
        const fieldRes = await researchFieldApi.getAllFields();
        if (fieldRes.success) setAllFields(fieldRes.data || []);
      }
    } catch (err) {
      showToast(err.message || 'Không thể thêm tag lĩnh vực', 'error');
    } finally {
      setTagModalLoading(false);
    }
  };

  // Delete a system tag in Modal
  const handleDeleteSystemTag = (tag) => {
    setConfirmDialog({
      isOpen: true,
      title: 'Xóa tag lĩnh vực',
      message: `Bạn có chắc chắn muốn xóa tag "${tag.name}" khỏi danh mục hệ thống?`,
      confirmText: 'Xóa',
      isDanger: true,
      showIcon: false,
      onConfirm: async () => {
        setActionLoading(true);
        try {
          const res = await researchFieldApi.deleteField(tag._id);
          if (res.success) {
            showToast('Xóa tag thành công', 'success');
            const fieldRes = await researchFieldApi.getAllFields();
            if (fieldRes.success) setAllFields(fieldRes.data || []);
          }
        } catch (err) {
          showToast(err.message || 'Không thể xóa tag', 'error');
        } finally {
          setActionLoading(false);
          setConfirmDialog((prev) => ({ ...prev, isOpen: false }));
        }
      },
    });
  };

  if (loading) {
    return (
      <div className="space-y-6 p-6">
        <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-2xs">
          <LoadingSkeleton rows={6} cols={4} />
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Page Header */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div className="flex items-center gap-4">
          <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-[#123891] to-[#1B4DA1] text-white font-bold text-xl flex items-center justify-center shadow-md shadow-blue-200 shrink-0">
            <Tag className="w-7 h-7" />
          </div>
          <div>
            <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-blue-50 text-[#123891] text-[11px] font-bold tracking-wide uppercase">
              <ShieldCheck className="w-3.5 h-3.5 text-[#1B4DA1]" />
              <span>Nghiệp Vụ Trưởng Bộ Môn</span>
            </div>
            <h1 className="text-xl font-black text-slate-900 mt-1">
              Quản Lý Lĩnh Vực Giảng Viên
            </h1>
            <p className="text-xs text-slate-500 mt-0.5">
              Phê duyệt đề xuất thay đổi lĩnh vực và quản lý danh mục lĩnh vực nghiên cứu của giảng viên
            </p>
          </div>
        </div>

        <button
          type="button"
          onClick={fetchData}
          className="self-start sm:self-auto p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 border border-slate-200 rounded-xl transition shadow-2xs cursor-pointer shrink-0"
          title="Làm mới dữ liệu"
        >
          <RefreshCw className="w-4 h-4" />
        </button>
      </div>

      {/* ============================================================== */}
      {/* PHẦN 1: NỬA TRÊN - BẢNG YÊU CẦU THAY ĐỔI LĨNH VỰC               */}
      {/* ============================================================== */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
          <div className="flex items-center gap-2">
            <Clock className="w-5 h-5 text-amber-500" />
            <h2 className="text-base font-bold text-slate-900">
              Yêu Cầu Thay Đổi Lĩnh Vực
            </h2>
            <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-50 text-amber-800 border border-amber-200">
              {requests.length}
            </span>
          </div>
          <span className="text-xs text-slate-400">
            Các yêu cầu đang chờ Trưởng bộ môn phê duyệt
          </span>
        </div>

        {requests.length === 0 ? (
          <div className="py-8 text-center text-slate-400 text-xs flex flex-col items-center gap-2">
            <CheckCircle2 className="w-9 h-9 text-emerald-400" />
            <span>Hiện không có yêu cầu thay đổi lĩnh vực nào đang chờ duyệt.</span>
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
                  <th className="py-3 px-4 w-32 text-right"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {requests.map((req, idx) => {
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
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleApproveRequest(req)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl text-slate-500 hover:text-emerald-700 hover:bg-emerald-50 border border-transparent hover:border-emerald-200 transition cursor-pointer"
                            title="Duyệt yêu cầu"
                          >
                            <Check className="w-3.5 h-3.5" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleRejectRequest(req)}
                            className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-medium rounded-xl text-slate-500 hover:text-red-700 hover:bg-red-50 border border-transparent hover:border-red-200 transition cursor-pointer"
                            title="Từ chối yêu cầu"
                          >
                            <X className="w-3.5 h-3.5" />
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

      {/* ============================================================== */}
      {/* PHẦN 2: NỬA DƯỚI - CHIA LÀM 2 CỘT (TRÁI: GV, PHẢI: TAGS)        */}
      {/* ============================================================== */}
      <div className="grid grid-cols-1 lg:grid-cols-12 gap-6 items-start">
        {/* CỘT TRÁI (7/12): BẢNG DANH SÁCH GIẢNG VIÊN */}
        <div className="lg:col-span-7 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5 text-[#123891]" />
              <h2 className="text-base font-bold text-slate-900">
                Danh Sách Giảng Viên
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-blue-50 text-[#123891] border border-blue-200">
                {lecturers.length}
              </span>
            </div>
          </div>

          {/* Selection counter & bulk action */}
          <div className="flex items-center justify-between text-xs text-slate-500 bg-slate-50/70 p-2.5 rounded-xl border border-slate-200/60">
            <span>
              Đang chọn:{' '}
              <strong className="text-slate-900 font-bold font-mono">
                {selectedLecturerIds.length}
              </strong>{' '}
              / {lecturers.length} giảng viên
            </span>
            {selectedLecturerIds.length > 0 && (
              <button
                type="button"
                onClick={() => setSelectedLecturerIds([])}
                className="text-xs font-semibold text-blue-600 hover:text-blue-800 transition cursor-pointer"
              >
                Bỏ chọn tất cả
              </button>
            )}
          </div>

          {/* Table */}
          <div className="overflow-x-auto rounded-2xl border border-slate-200 max-h-[600px] overflow-y-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead className="sticky top-0 bg-slate-100 z-10">
                <tr className="border-b border-slate-200 text-slate-700 font-bold">
                  <th className="py-3 px-3.5 w-10 text-center">
                    <input
                      type="checkbox"
                      checked={
                        filteredLecturers.length > 0 &&
                        filteredLecturers.every((l) => selectedLecturerIds.includes(l._id))
                      }
                      onChange={handleSelectAllFiltered}
                      className="rounded border-slate-300 text-[#123891] focus:ring-blue-500 cursor-pointer"
                      title="Chọn tất cả hiển thị"
                    />
                  </th>
                  <th className="py-3 px-2 w-10 text-center">STT</th>
                  <th className="py-3 px-3.5">Tên giảng viên</th>
                  <th className="py-3 px-3.5">Lĩnh vực hiện tại</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredLecturers.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="py-6 text-center text-slate-400 text-xs">
                      Không tìm thấy giảng viên phù hợp
                    </td>
                  </tr>
                ) : (
                  filteredLecturers.map((lec, idx) => {
                    const isSelected = selectedLecturerIds.includes(lec._id);
                    const lecFields = Array.isArray(lec.fields) ? lec.fields : [];

                    return (
                      <tr
                        key={lec._id}
                        onClick={() => handleToggleLecturer(lec._id)}
                        className={`transition cursor-pointer select-none ${
                          isSelected ? 'bg-blue-50/60 hover:bg-blue-50' : 'hover:bg-slate-50/70'
                        }`}
                      >
                        <td
                          className="py-3 px-3.5 text-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => handleToggleLecturer(lec._id)}
                            className="rounded border-slate-300 text-[#123891] focus:ring-blue-500 cursor-pointer"
                          />
                        </td>
                        <td className="py-3 px-2 text-center font-mono text-slate-400">
                          {idx + 1}
                        </td>
                        <td className="py-3 px-3.5">
                          <strong className="block text-slate-900 font-medium">
                            {lec.academicTitle ? `${lec.academicTitle} ` : ''}
                            {lec.userId?.fullName || 'Chưa cập nhật'}
                            {lec.userId?.role === 'TBM' && (
                              <span className="ml-1.5 px-1.5 py-0.5 rounded text-[10px] font-bold bg-blue-100 text-[#123891]">
                                TBM
                              </span>
                            )}
                          </strong>
                          <span className="text-[11px] text-slate-400 font-mono">
                            {lec.lecturerCode || lec.userId?.email || ''}
                          </span>
                        </td>
                        <td className="py-3 px-3.5">
                          {lecFields.length > 0 ? (
                            <div className="flex flex-wrap gap-1 max-w-xs">
                              {lecFields.map((tag, i) => (
                                <span
                                  key={i}
                                  className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] bg-slate-100 text-slate-700 border border-slate-200"
                                >
                                  {tag}
                                </span>
                              ))}
                            </div>
                          ) : (
                            <span className="text-slate-400 italic">Không có</span>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* CỘT PHẢI (5/12): DANH SÁCH TAG LĨNH VỰC & THAO TÁC GÁN */}
        <div className="lg:col-span-5 p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-5 sticky top-4">
          {/* Header */}
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2">
              <Tag className="w-5 h-5 text-[#123891]" />
              <h2 className="text-base font-bold text-slate-900">
                Danh Sách Tag Lĩnh Vực
              </h2>
              <span className="px-2.5 py-0.5 rounded-full text-xs font-bold bg-slate-100 text-slate-700 border border-slate-200">
                {allFields.length}
              </span>
            </div>

            {/* Nút Chỉnh sửa: mở modal thêm/xóa tag hệ thống */}
            <button
              type="button"
              onClick={() => setIsTagModalOpen(true)}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold transition cursor-pointer"
            >
              <Edit2 className="w-3.5 h-3.5" />
              <span>Chỉnh sửa</span>
            </button>
          </div>

          {/* Hướng dẫn theo số lượng giảng viên chọn */}
          {selectedLecturerIds.length === 0 ? (
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200 text-xs text-slate-500 flex items-start gap-2.5">
              <HelpCircle className="w-4 h-4 text-slate-400 shrink-0 mt-0.5" />
              <span>
                Vui lòng tích chọn giảng viên ở bảng bên trái để gán hoặc cập nhật lĩnh vực.
              </span>
            </div>
          ) : selectedLecturerIds.length === 1 ? (
            <div className="p-3.5 rounded-2xl bg-emerald-50/80 border border-emerald-200 text-xs text-emerald-900 flex items-start gap-2.5">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div>
                <span>
                  Đang chọn:{' '}
                  <strong>
                    {singleLecturer?.academicTitle ? `${singleLecturer.academicTitle} ` : ''}
                    {singleLecturer?.userId?.fullName}
                  </strong>
                  .
                </span>
                <p className="text-[11px] text-emerald-700 mt-1">
                  Bấm <strong>Xác nhận</strong> để lưu thay đổi.
                </p>
              </div>
            </div>
          ) : (
            <div className="p-3.5 rounded-2xl bg-blue-50/80 border border-blue-200 text-xs text-[#123891] flex items-start gap-2.5">
              <Users className="w-4 h-4 text-[#1B4DA1] shrink-0 mt-0.5" />
              <div>
                <span>
                  Đang chọn <strong>{selectedLecturerIds.length}</strong> giảng viên.
                </span>
                <p className="text-[11px] text-[#123891]/80 mt-1">
                  Chọn các tag mong muốn bên dưới và bấm <strong>Xác nhận</strong> để áp dụng cho tất cả các giảng viên đã chọn.
                </p>
              </div>
            </div>
          )}

          {/* Interactive Tag Container */}
          <div className="space-y-3">
            <div className="flex items-center justify-between text-xs">
              <span className="font-bold text-slate-700 uppercase tracking-wider text-[11px]">
                Tag hệ thống ({allFields.length})
              </span>
              {selectedLecturerIds.length > 0 && (
                <span className="text-slate-500">
                  Đang chọn: <strong className="text-slate-900">{activeTags.length}</strong> tag
                </span>
              )}
            </div>

            <div className="flex flex-wrap gap-2 p-3 bg-slate-50/80 rounded-2xl border border-slate-200 max-h-80 overflow-y-auto">
              {allFields.map((field) => {
                const isSelected = activeTags.includes(field.name);

                let tagStyle =
                  'bg-white text-slate-700 border-slate-200 hover:border-slate-300 hover:bg-slate-100';

                if (selectedLecturerIds.length === 1) {
                  // Exactly 1 lecturer selected: active tags in GREEN, inactive in GRAY
                  if (isSelected) {
                    tagStyle =
                      'bg-emerald-500 text-white border-emerald-600 shadow-xs ring-2 ring-emerald-300';
                  } else {
                    tagStyle =
                      'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-800';
                  }
                } else if (selectedLecturerIds.length >= 2) {
                  // >=2 lecturers selected: starts gray, selected tags in EMERALD / BLUE
                  if (isSelected) {
                    tagStyle =
                      'bg-[#123891] text-white border-[#123891] shadow-xs ring-2 ring-blue-300';
                  } else {
                    tagStyle =
                      'bg-slate-100 text-slate-600 border-slate-200 hover:bg-slate-200 hover:text-slate-800';
                  }
                }

                return (
                  <button
                    key={field._id || field.name}
                    type="button"
                    onClick={() => handleToggleTag(field.name)}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-semibold transition cursor-pointer border ${tagStyle}`}
                  >
                    {isSelected && <Check className="w-3.5 h-3.5 shrink-0" />}
                    <span>{field.name}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Action button "Xác nhận" */}
          <div className="pt-2">
            <button
              type="button"
              onClick={handleSaveFields}
              disabled={!isConfirmEnabled || actionLoading}
              className="w-full inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold text-white bg-[#123891] hover:bg-[#102d7d] transition shadow-xs cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
            >
              {actionLoading ? (
                <>
                  <RefreshCw className="w-4 h-4 animate-spin" />
                  <span>Đang lưu...</span>
                </>
              ) : (
                <>
                  <Check className="w-4 h-4" />
                  <span>Xác nhận</span>
                </>
              )}
            </button>
          </div>
        </div>
      </div>

      {/* ============================================================== */}
      {/* MODAL: CHỈNH SỬA DANH MỤC TAG LĨNH VỰC HỆ THỐNG               */}
      {/* ============================================================== */}
      {isTagModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-3 shrink-0">
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-blue-50 text-[#123891] flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Chỉnh Sửa Các Lĩnh Vực
                  </h3>
                  <p className="text-xs text-slate-500">
                    Thêm hoặc xóa các tag lĩnh vực
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsTagModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Form thêm tag mới */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Thêm lĩnh vực mới
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTagName}
                    onChange={(e) => setNewTagName(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleCreateSystemTag();
                      }
                    }}
                    placeholder="Nhập tên lĩnh vực mới..."
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#123891]"
                  />
                  <button
                    type="button"
                    onClick={handleCreateSystemTag}
                    disabled={tagModalLoading || !newTagName.trim()}
                    className="inline-flex items-center gap-1 px-4 py-2 rounded-xl bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-semibold transition cursor-pointer shadow-xs disabled:opacity-50"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm</span>
                  </button>
                </div>
              </div>

              {/* Danh sách tag hiện tại để xóa */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Danh mục tag hiện có ({allFields.length})
                </label>
                <div className="divide-y divide-slate-100 rounded-2xl border border-slate-200 max-h-64 overflow-y-auto">
                  {allFields.length === 0 ? (
                    <div className="py-6 text-center text-slate-400 text-xs">
                      Chưa có tag lĩnh vực nào
                    </div>
                  ) : (
                    allFields.map((field) => (
                      <div
                        key={field._id}
                        className="py-2 px-3.5 flex items-center justify-between hover:bg-slate-50 transition text-xs"
                      >
                        <span className="font-medium text-slate-800">{field.name}</span>
                        <button
                          type="button"
                          onClick={() => handleDeleteSystemTag(field)}
                          className="p-1.5 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg transition cursor-pointer"
                          title="Xóa tag"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end border-t border-slate-100 pt-3 shrink-0">
              <button
                type="button"
                onClick={() => setIsTagModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 transition cursor-pointer"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Confirm Dialog */}
      <ConfirmDialog
        isOpen={confirmDialog.isOpen}
        title={confirmDialog.title}
        message={confirmDialog.message}
        confirmText={confirmDialog.confirmText || 'Xác nhận'}
        cancelText="Hủy"
        isDanger={confirmDialog.isDanger ?? false}
        loading={actionLoading}
        showIcon={confirmDialog.showIcon ?? false}
        onClose={() => setConfirmDialog((prev) => ({ ...prev, isOpen: false }))}
        onConfirm={confirmDialog.onConfirm}
      />
    </div>
  );
};

export default TbmLecturerFieldsPage;
