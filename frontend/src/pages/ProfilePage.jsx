import React, { useState, useEffect, useCallback } from 'react';
import profileApi from '../api/profileApi';
import researchFieldApi from '../api/researchFieldApi';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import LoadingSkeleton from '../components/common/LoadingSkeleton';
import Modal from '../components/common/Modal';
import {
  User,
  Mail,
  Phone,
  Lock,
  Edit3,
  Save,
  X,
  Key,
  Shield,
  GraduationCap,
  Briefcase,
  Building,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  BookOpen,
  Award,
  Globe,
  MapPin,
  FileText,
  Tag,
  Sparkles,
  Clock,
  Plus,
  Check,
} from 'lucide-react';

const ProfilePage = () => {
  const { user: authUser, updateUser } = useAuth();
  const { showToast } = useToast();

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [isEditing, setIsEditing] = useState(false);

  // Profile data from backend
  const [profileData, setProfileData] = useState(null);

  // Editable Form states
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [maxSupervisedStudents, setMaxSupervisedStudents] = useState(5);

  // Change Password Modal States
  const [changePasswordOpen, setChangePasswordOpen] = useState(false);
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showCurrentPw, setShowCurrentPw] = useState(false);
  const [showNewPw, setShowNewPw] = useState(false);
  const [showConfirmPw, setShowConfirmPw] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);
  const [pwError, setPwError] = useState('');

  // Field Request States (for Lecturer / TBM)
  const [fieldRequestInfo, setFieldRequestInfo] = useState(null);
  const [isFieldModalOpen, setIsFieldModalOpen] = useState(false);
  const [allSystemFields, setAllSystemFields] = useState([]);
  const [selectedFields, setSelectedFields] = useState([]);
  const [proposedTags, setProposedTags] = useState([]);
  const [newTagInput, setNewTagInput] = useState('');
  const [loadingFields, setLoadingFields] = useState(false);
  const [submittingFieldRequest, setSubmittingFieldRequest] = useState(false);

  // Fetch full profile
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const isLecOrTbm = authUser?.role === 'LECTURER' || authUser?.role === 'TBM';
      const [res, fieldRes] = await Promise.all([
        profileApi.getProfile(),
        isLecOrTbm ? researchFieldApi.getMyRequest().catch(() => null) : Promise.resolve(null),
      ]);

      if (res.success && res.data) {
        setProfileData(res.data);
        const u = res.data.user;
        if (u) {
          setEmail(u.email || '');
          setPhone(u.phone || '');
        }

        if (res.data.lecturer) {
          setMaxSupervisedStudents(
            res.data.lecturer.maxSupervisedStudents ?? res.data.lecturer.maxStudents ?? 5
          );
        }
      }

      if (fieldRes && fieldRes.success) {
        setFieldRequestInfo(fieldRes.data);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải thông tin cá nhân', 'error');
    } finally {
      setLoading(false);
    }
  }, [authUser?.role, showToast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

  // Handlers for Research Field Change Modal
  const handleOpenFieldModal = async () => {
    setIsFieldModalOpen(true);
    setLoadingFields(true);
    try {
      const res = await researchFieldApi.getAllFields();
      if (res.success) {
        setAllSystemFields(res.data || []);
      }

      if (fieldRequestInfo?.hasPending && fieldRequestInfo.request?.requestedFields) {
        setSelectedFields([...fieldRequestInfo.request.requestedFields]);
        setProposedTags([...(fieldRequestInfo.request.proposedNewTags || [])]);
      } else {
        const initialFields =
          fieldRequestInfo?.currentFields?.length
            ? fieldRequestInfo.currentFields
            : (profileData?.lecturer?.fields?.length
              ? profileData.lecturer.fields
              : (profileData?.lecturer?.specialization
                ? profileData.lecturer.specialization.split(',').map((s) => s.trim()).filter(Boolean)
                : []));
        setSelectedFields([...initialFields]);
        setProposedTags([]);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải danh sách lĩnh vực', 'error');
    } finally {
      setLoadingFields(false);
    }
  };

  const toggleField = (fieldName) => {
    setSelectedFields((prev) =>
      prev.includes(fieldName)
        ? prev.filter((name) => name !== fieldName)
        : [...prev, fieldName]
    );
  };

  const handleAddProposedTag = () => {
    const cleanTag = newTagInput.trim();
    if (!cleanTag) return;

    if (selectedFields.includes(cleanTag)) {
      showToast('Lĩnh vực này đã được chọn', 'info');
      setNewTagInput('');
      return;
    }

    setProposedTags((prev) => (prev.includes(cleanTag) ? prev : [...prev, cleanTag]));
    setSelectedFields((prev) => [...prev, cleanTag]);
    setNewTagInput('');
  };

  const handleRemoveProposedTag = (tagToRemove) => {
    setProposedTags((prev) => prev.filter((t) => t !== tagToRemove));
    setSelectedFields((prev) => prev.filter((t) => t !== tagToRemove));
  };

  const handleSubmitFieldRequest = async () => {
    if (selectedFields.length === 0) {
      showToast('Vui lòng chọn hoặc đề xuất ít nhất một lĩnh vực', 'warning');
      return;
    }

    setSubmittingFieldRequest(true);
    try {
      const res = await researchFieldApi.createRequest({
        requestedFields: selectedFields,
        proposedNewTags: proposedTags,
      });

      if (res.success) {
        showToast('Đã gửi yêu cầu thay đổi lĩnh vực tới Trưởng bộ môn', 'success');
        setFieldRequestInfo((prev) => ({
          ...prev,
          hasPending: true,
          request: res.data,
        }));
        setIsFieldModalOpen(false);
      }
    } catch (err) {
      showToast(err.message || 'Không thể gửi yêu cầu thay đổi lĩnh vực', 'error');
    } finally {
      setSubmittingFieldRequest(false);
    }
  };

  // Cancel edit
  const handleCancelEdit = () => {
    if (profileData?.user) {
      setEmail(profileData.user.email || '');
      setPhone(profileData.user.phone || '');
    }
    if (profileData?.lecturer) {
      setMaxSupervisedStudents(
        profileData.lecturer.maxSupervisedStudents ?? profileData.lecturer.maxStudents ?? 5
      );
    }
    setIsEditing(false);
  };

  // Submit Profile Changes
  const handleSaveProfile = async (e) => {
    e.preventDefault();

    // Client-side Validation (only if filled)
    if (email && email.trim()) {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(email.trim())) {
        showToast('Định dạng email không hợp lệ (ví dụ: example@iuh.edu.vn)', 'error');
        return;
      }
    }

    if (phone && phone.trim()) {
      const phoneRegex = /^[0-9+\-\s()]{8,20}$/;
      if (!phoneRegex.test(phone.trim())) {
        showToast('Định dạng số điện thoại không hợp lệ (từ 8-20 chữ số)', 'error');
        return;
      }
    }

    setSaving(true);
    try {
      const payload = {
        email: email.trim() || null,
        phone: phone.trim() || null,
      };

      if (profileData?.user?.role === 'LECTURER' || profileData?.user?.role === 'TBM') {
        payload.maxSupervisedStudents = Number(maxSupervisedStudents);
      }

      const res = await profileApi.updateProfile(payload);
      if (res.success && res.data) {
        showToast(res.message || 'Đã cập nhật hồ sơ thành công.', 'success');
        setProfileData(res.data);
        if (res.data.user) {
          updateUser(res.data.user);
        }
        setIsEditing(false);
      }
    } catch (err) {
      showToast(err.message || 'Cập nhật thông tin thất bại.', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Submit Change Password
  const handleChangePassword = async (e) => {
    e.preventDefault();
    setPwError('');

    if (!currentPassword) {
      setPwError('Vui lòng nhập mật khẩu hiện tại');
      return;
    }
    if (!newPassword || newPassword.length < 6) {
      setPwError('Mật khẩu mới phải có ít nhất 6 ký tự');
      return;
    }
    if (newPassword !== confirmPassword) {
      setPwError('Xác nhận mật khẩu mới không trùng khớp');
      return;
    }

    setPwLoading(true);
    try {
      const res = await profileApi.changePassword({
        currentPassword,
        newPassword,
        confirmPassword,
      });

      if (res.success) {
        showToast('Đổi mật khẩu thành công!', 'success');
        setChangePasswordOpen(false);
        setCurrentPassword('');
        setNewPassword('');
        setConfirmPassword('');
      }
    } catch (err) {
      setPwError(err.message || 'Đổi mật khẩu thất bại. Vui lòng kiểm tra lại mật khẩu hiện tại.');
    } finally {
      setPwLoading(false);
    }
  };

  if (loading) {
    return (
      <div className="max-w-4xl mx-auto p-6 space-y-6">
        <LoadingSkeleton rows={8} cols={2} />
      </div>
    );
  }

  const user = profileData?.user || authUser;
  const student = profileData?.student;
  const lecturer = profileData?.lecturer;
  const isLecturerOrTbm = user?.role === 'LECTURER' || user?.role === 'TBM';

  const currentFields = fieldRequestInfo?.currentFields?.length
    ? fieldRequestInfo.currentFields
    : (lecturer?.fields?.length
      ? lecturer.fields
      : (lecturer?.specialization
        ? lecturer.specialization.split(',').map((s) => s.trim()).filter(Boolean)
        : []));

  // Compute Account Code
  const getAccountCode = () => {
    if (user?.role === 'ADMIN') return user.code || 'ADMIN001';
    if (student?.studentCode) return student.studentCode;
    return user?.code || user?.role || 'N/A';
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Quản Trị Viên Hệ Thống (ADMIN)', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'TBM':
        return { label: 'Trưởng Bộ Môn (TBM)', color: 'bg-blue-50 text-[#102d7d] border-blue-200' };
      case 'LECTURER':
        return { label: 'Giảng Viên (LECTURER)', color: 'bg-blue-50 text-[#102d7d] border-blue-200' };
      case 'STUDENT':
        return { label: 'Sinh Viên (STUDENT)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      default:
        return { label: role, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner Card */}
      <div className="p-6 sm:p-7 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-start gap-4 sm:gap-5">
          <div className="w-16 h-16 sm:w-20 sm:h-20 rounded-2xl bg-gradient-to-tr from-[#123891] to-[#1B4DA1] text-white font-black text-2xl sm:text-3xl flex items-center justify-center shadow-md shadow-blue-100 shrink-0">
            {lecturer?.academicTitle ? lecturer.academicTitle.charAt(0) : (user?.fullName?.charAt(0).toUpperCase() || 'U')}
          </div>

          <div className="flex-1 min-w-0 space-y-1.5">
            <div className="flex flex-wrap items-center gap-2">
              <h1 className="text-xl sm:text-2xl font-bold text-slate-900">
                {lecturer?.academicTitle ? `${lecturer.academicTitle} ` : ''}{user?.fullName}
              </h1>
              <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleInfo.color}`}>
                {roleInfo.label}
              </span>
            </div>

            <div className="text-xs text-slate-500 font-mono flex flex-wrap items-center gap-x-3 gap-y-1">
              <span>Mã tài khoản: <strong className="text-[#123891] font-bold">{getAccountCode()}</strong></span>
              <span className="text-slate-300">•</span>
              <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                <CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động
              </span>
              {lecturer?.department && (
                <>
                  <span className="text-slate-300">•</span>
                  <span>Khoa: <strong className="text-slate-700 font-semibold">{lecturer.department}</strong></span>
                </>
              )}
            </div>

            {/* Research Fields (Lĩnh vực) & Change Request Button Horizontally in a Single Row */}
            {isLecturerOrTbm && (
              <div className="pt-1.5 text-xs text-slate-500 flex flex-wrap items-center gap-2">
                <span className="font-semibold text-slate-700 shrink-0">Lĩnh vực:</span>
                {currentFields && currentFields.length > 0 ? (
                  currentFields.map((f, idx) => (
                    <span
                      key={idx}
                      className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[11px] font-medium bg-emerald-50 text-emerald-700 border border-emerald-200 shrink-0"
                    >
                      {f}
                    </span>
                  ))
                ) : (
                  <span className="text-xs text-slate-400 italic shrink-0">Chưa có lĩnh vực</span>
                )}

                <button
                  type="button"
                  onClick={handleOpenFieldModal}
                  className="inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-xl bg-blue-50 hover:bg-blue-100 text-[#123891] border border-blue-200 transition shadow-2xs cursor-pointer shrink-0 ml-0.5"
                >
                  <Tag className="w-3.5 h-3.5 text-[#123891]" />
                  <span>Yêu cầu thay đổi lĩnh vực</span>
                </button>
              </div>
            )}

            {/* Pending request notice */}
            {isLecturerOrTbm && fieldRequestInfo?.hasPending && (
              <div className="pt-1">
                <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-50 border border-amber-200 text-amber-800 text-xs font-semibold">
                  <Clock className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
                  <span>Đang chờ TBM duyệt yêu cầu thay đổi lĩnh vực</span>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Action Buttons: Positioned OUTSIDE and completely separated below the main profile card, aligned to the right */}
      <div className="flex items-center justify-end gap-2.5 -mt-2">
        {!isEditing ? (
          <>
            <button
              type="button"
              onClick={() => setIsEditing(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-[#123891] hover:bg-[#102d7d] active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Edit3 className="w-4 h-4" />
              <span>Chỉnh sửa hồ sơ</span>
            </button>

            <button
              type="button"
              onClick={() => setChangePasswordOpen(true)}
              className="inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl shadow-2xs transition cursor-pointer"
            >
              <Key className="w-4 h-4 text-slate-500" />
              <span>Đổi mật khẩu</span>
            </button>
          </>
        ) : (
          <>
            <button
              type="button"
              onClick={handleCancelEdit}
              disabled={saving}
              className="inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition cursor-pointer"
            >
              <X className="w-4 h-4" />
              <span>Hủy</span>
            </button>

            <button
              type="button"
              onClick={handleSaveProfile}
              disabled={saving}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-xs transition cursor-pointer"
            >
              <Save className="w-4 h-4" />
              <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
            </button>
          </>
        )}
      </div>

      {/* Main Profile Content Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Thông tin liên hệ cá nhân (Editable) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-[#123891] font-bold text-sm">
              <Mail className="w-4 h-4" />
              <span>Thông tin liên hệ cá nhân</span>
            </div>
            {isEditing && (
              <span className="text-[11px] text-amber-600 font-semibold bg-amber-50 px-2 py-0.5 rounded-md">
                Đang ở chế độ chỉnh sửa (Email & SĐT không bắt buộc)
              </span>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Email Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Địa chỉ Email</span>
                <span className="text-[10px] text-slate-400 font-normal">Không bắt buộc</span>
              </label>
              {isEditing ? (
                <div className="relative">
                  <Mail className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="ví dụ: user@iuh.edu.vn (hoặc để trống)"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-semibold text-slate-900">
                  <Mail className="w-4 h-4 text-slate-400" />
                  <span>{user?.email || <em className="text-slate-400 font-normal">Chưa cập nhật email</em>}</span>
                </div>
              )}
            </div>

            {/* Phone Field */}
            <div>
              <label className="block text-xs font-bold text-slate-700 mb-1.5 flex items-center justify-between">
                <span>Số điện thoại</span>
                <span className="text-[10px] text-slate-400 font-normal">Không bắt buộc</span>
              </label>
              {isEditing ? (
                <div className="relative">
                  <Phone className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                  <input
                    type="tel"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    placeholder="ví dụ: 0901234567 (hoặc để trống)"
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-semibold text-slate-900">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{user?.phone || <em className="text-slate-400 font-normal">Chưa cập nhật số điện thoại</em>}</span>
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Section 2: Thông tin hệ thống / Học vụ (Read-Only 🔒) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-slate-800 font-bold text-sm">
              <Shield className="w-4 h-4 text-slate-500" />
              <span>Thông tin định danh & Quản trị hệ thống</span>
            </div>
            <span className="text-[11px] text-slate-500 font-semibold bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1">
              <Lock className="w-3 h-3 text-slate-400" /> Khóa chỉnh sửa (Read-only)
            </span>
          </div>

          {/* Admin Specific Fields */}
          {user?.role === 'ADMIN' && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Mã quản trị viên</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-rose-700 font-mono flex items-center justify-between">
                  <span>{user?.code || 'ADMIN001'}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Cấp bậc quyền hạn</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Toàn quyền Quản trị (Super Admin)</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Phạm vi quản lý</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>Hệ thống, Phân quyền, Người dùng, Master Data</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          )}

          {/* Student Specific Fields */}
          {user?.role === 'STUDENT' && student && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Mã số sinh viên (MSSV)</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-[#102d7d] font-mono flex items-center justify-between">
                  <span>{student.studentCode}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Lớp sinh hoạt</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>{student.className}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Điểm trung bình (GPA)</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-emerald-700 flex items-center justify-between">
                  <span>{student.gpa !== undefined ? Number(student.gpa).toFixed(2) : '0.00'} / 4.0</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Tín chỉ tích lũy</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>{student.accumulatedCredits || 0} tín chỉ</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Điều kiện tiên quyết</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold flex items-center justify-between">
                  <span className={student.prerequisiteCompleted ? 'text-emerald-700' : 'text-amber-700'}>
                    {student.prerequisiteCompleted ? '✓ Đã đạt điều kiện' : 'Chưa đạt điều kiện'}
                  </span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Trạng thái đăng ký môn</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-medium text-slate-700 flex items-center justify-between">
                  <span>
                    TTDN: <strong>{student.internshipRegistered ? 'Đã ĐK' : 'Chưa'}</strong> • KLTN: <strong>{student.thesisRegistered ? 'Đã ĐK' : 'Chưa'}</strong>
                  </span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          )}

          {/* Lecturer / TBM Specific Fields */}
          {(user?.role === 'LECTURER' || user?.role === 'TBM') && lecturer && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Học hàm / Học vị</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>{lecturer.academicTitle || 'ThS.'}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Khoa / Bộ môn</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between truncate">
                  <span className="truncate">{lecturer.department || 'Công nghệ Thông tin'}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </div>
              </div>
            </div>
          )}
        </div>
      </form>

      {/* Change Password Modal */}
      <Modal
        isOpen={changePasswordOpen}
        onClose={() => {
          setChangePasswordOpen(false);
          setPwError('');
        }}
        title="Đổi Mật Khẩu Tài Khoản"
        maxWidth="max-w-md"
      >
        <form onSubmit={handleChangePassword} className="space-y-4">
          {pwError && (
            <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-center gap-2">
              <AlertCircle className="w-4 h-4 shrink-0" />
              <span>{pwError}</span>
            </div>
          )}

          {/* Current Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mật khẩu hiện tại <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showCurrentPw ? 'text' : 'password'}
                value={currentPassword}
                onChange={(e) => setCurrentPassword(e.target.value)}
                placeholder="Nhập mật khẩu đang dùng"
                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
              />
              <button
                type="button"
                onClick={() => setShowCurrentPw(!showCurrentPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showCurrentPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showNewPw ? 'text' : 'password'}
                value={newPassword}
                onChange={(e) => setNewPassword(e.target.value)}
                placeholder="Tối thiểu 6 ký tự"
                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
              />
              <button
                type="button"
                onClick={() => setShowNewPw(!showNewPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showNewPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          {/* Confirm New Password */}
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1.5">
              Xác nhận mật khẩu mới <span className="text-rose-500">*</span>
            </label>
            <div className="relative">
              <input
                type={showConfirmPw ? 'text' : 'password'}
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="Nhập lại mật khẩu mới"
                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
              />
              <button
                type="button"
                onClick={() => setShowConfirmPw(!showConfirmPw)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                {showConfirmPw ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setChangePasswordOpen(false)}
              disabled={pwLoading}
              className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy
            </button>
            <button
              type="submit"
              disabled={pwLoading}
              className="px-5 py-2 text-xs font-bold text-white bg-[#123891] hover:bg-[#102d7d] rounded-xl shadow-xs transition"
            >
              {pwLoading ? 'Đang đổi...' : 'Xác nhận đổi mật khẩu'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Yêu cầu thay đổi lĩnh vực */}
      {isFieldModalOpen && (
        <div className="fixed inset-0 bg-slate-900/50 backdrop-blur-xs z-50 flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-xl w-full p-6 sm:p-7 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col">
            {/* Header */}
            <div className="flex items-center justify-between border-b border-slate-100 pb-4 shrink-0">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#123891] flex items-center justify-center">
                  <Tag className="w-5 h-5" />
                </div>
                <div>
                  <h2 className="text-base font-bold text-slate-900">Yêu cầu thay đổi lĩnh vực nghiên cứu</h2>
                  <p className="text-xs text-slate-500">Chọn các lĩnh vực hiện có hoặc đề xuất tag lĩnh vực mới</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setIsFieldModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Body */}
            <div className="space-y-4 overflow-y-auto pr-1 flex-1">
              {/* Existing System Fields */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Danh sách lĩnh vực hiện có ({allSystemFields.length})
                </label>
                {loadingFields ? (
                  <div className="text-xs text-slate-400 py-3 text-center">Đang tải danh sách lĩnh vực...</div>
                ) : (
                  <div className="flex flex-wrap gap-2 max-h-52 overflow-y-auto p-3 bg-slate-50 rounded-2xl border border-slate-200">
                    {allSystemFields.map((field) => {
                      const isSelected = selectedFields.includes(field.name);
                      return (
                        <button
                          key={field._id || field.name}
                          type="button"
                          onClick={() => toggleField(field.name)}
                          className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl text-xs font-medium transition cursor-pointer border ${
                            isSelected
                              ? 'bg-[#123891] text-white border-[#123891] shadow-xs'
                              : 'bg-white text-slate-700 border-slate-200 hover:border-blue-300 hover:bg-blue-50/50'
                          }`}
                        >
                          {isSelected ? (
                            <Check className="w-3.5 h-3.5 shrink-0" />
                          ) : (
                            <span className="w-3.5 h-3.5 rounded border border-slate-300 shrink-0 inline-block" />
                          )}
                          <span>{field.name}</span>
                        </button>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* Propose New Tag */}
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-2">
                  Đề xuất lĩnh vực mới
                </label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={newTagInput}
                    onChange={(e) => setNewTagInput(e.target.value)}
                    onKeyDown={(e) => {
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        handleAddProposedTag();
                      }
                    }}
                    placeholder="Nhập tên tag mới muốn đề xuất..."
                    className="flex-1 px-3.5 py-2 text-xs rounded-xl border border-slate-200 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-[#123891]"
                  />
                  <button
                    type="button"
                    onClick={handleAddProposedTag}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white text-xs font-medium transition cursor-pointer shadow-xs shrink-0"
                  >
                    <Plus className="w-3.5 h-3.5" />
                    <span>Thêm</span>
                  </button>
                </div>

                {/* List of proposed new tags */}
                {proposedTags.length > 0 && (
                  <div className="flex flex-wrap gap-2 mt-2.5">
                    {proposedTags.map((tag, idx) => (
                      <span
                        key={idx}
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium bg-purple-50 text-purple-700 border border-purple-200 shadow-2xs"
                      >
                        <Sparkles className="w-3 h-3 text-purple-500" />
                        <span>{tag}</span>
                        <button
                          type="button"
                          onClick={() => handleRemoveProposedTag(tag)}
                          className="hover:text-purple-900 hover:bg-purple-100 p-0.5 rounded transition cursor-pointer"
                          title="Xóa đề xuất"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </span>
                    ))}
                  </div>
                )}
              </div>

              {/* Selected Summary */}
              <div className="text-xs text-slate-500">
                Đã chọn: <strong className="text-slate-800">{selectedFields.length}</strong> lĩnh vực
              </div>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4 shrink-0">
              <button
                type="button"
                onClick={() => setIsFieldModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>
              <button
                type="button"
                onClick={handleSubmitFieldRequest}
                disabled={submittingFieldRequest || selectedFields.length === 0}
                className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#123891] hover:bg-[#102d7d] rounded-xl transition shadow-xs cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {submittingFieldRequest ? (
                  <span>Đang gửi...</span>
                ) : (
                  <>
                    <Save className="w-3.5 h-3.5" />
                    <span>Gửi yêu cầu</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProfilePage;
