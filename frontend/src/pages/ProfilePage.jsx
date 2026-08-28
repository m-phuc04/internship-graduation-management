import React, { useState, useEffect, useCallback } from 'react';
import profileApi from '../api/profileApi';
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
  const [companyDetails, setCompanyDetails] = useState({
    website: '',
    contactPerson: '',
    contactEmail: '',
    contactPhone: '',
    address: '',
  });

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

  // Fetch full profile
  const fetchProfile = useCallback(async () => {
    setLoading(true);
    try {
      const res = await profileApi.getProfile();
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

        if (res.data.company) {
          setCompanyDetails({
            website: res.data.company.website || '',
            contactPerson: res.data.company.contactPerson || '',
            contactEmail: res.data.company.contactEmail || '',
            contactPhone: res.data.company.contactPhone || '',
            address: res.data.company.address || '',
          });
        }
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải thông tin cá nhân', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchProfile();
  }, [fetchProfile]);

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
    if (profileData?.company) {
      setCompanyDetails({
        website: profileData.company.website || '',
        contactPerson: profileData.company.contactPerson || '',
        contactEmail: profileData.company.contactEmail || '',
        contactPhone: profileData.company.contactPhone || '',
        address: profileData.company.address || '',
      });
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

      if (profileData?.user?.role === 'COMPANY') {
        payload.website = companyDetails.website?.trim() || null;
        payload.contactPerson = companyDetails.contactPerson?.trim() || null;
        payload.contactEmail = companyDetails.contactEmail?.trim() || null;
        payload.contactPhone = companyDetails.contactPhone?.trim() || null;
        if (companyDetails.address?.trim()) {
          payload.address = companyDetails.address.trim();
        }
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
  const company = profileData?.company;

  // Compute Account Code
  const getAccountCode = () => {
    if (user?.role === 'ADMIN') return user.code || 'ADMIN001';
    if (student?.studentCode) return student.studentCode;
    if (lecturer?.lecturerCode) return lecturer.lecturerCode;
    if (company?.code) return company.code;
    return user?.code || user?.role || 'N/A';
  };

  const getRoleBadge = (role) => {
    switch (role) {
      case 'ADMIN':
        return { label: 'Quản Trị Viên Hệ Thống (ADMIN)', color: 'bg-rose-50 text-rose-700 border-rose-200' };
      case 'TBM':
        return { label: 'Trưởng Bộ Môn (TBM)', color: 'bg-indigo-50 text-indigo-700 border-indigo-200' };
      case 'LECTURER':
        return { label: 'Giảng Viên (LECTURER)', color: 'bg-violet-50 text-violet-700 border-violet-200' };
      case 'STUDENT':
        return { label: 'Sinh Viên (STUDENT)', color: 'bg-blue-50 text-blue-700 border-blue-200' };
      case 'COMPANY':
        return { label: 'Doanh Nghiệp (COMPANY)', color: 'bg-emerald-50 text-emerald-700 border-emerald-200' };
      default:
        return { label: role, color: 'bg-slate-100 text-slate-700 border-slate-200' };
    }
  };

  const roleInfo = getRoleBadge(user?.role);

  return (
    <div className="max-w-4xl mx-auto space-y-6 pb-12">
      {/* Top Banner Card */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-5">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-indigo-600 text-white font-black text-2xl flex items-center justify-center shadow-md shadow-indigo-100 shrink-0">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <h1 className="text-xl font-bold text-slate-900">{user?.fullName}</h1>
                <span className={`px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${roleInfo.color}`}>
                  {roleInfo.label}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-1 flex items-center gap-2">
                <span>Mã tài khoản: <strong className="text-indigo-600 font-bold">{getAccountCode()}</strong></span>
                <span className="text-slate-300">•</span>
                <span className="inline-flex items-center gap-1 text-emerald-600 font-semibold">
                  <CheckCircle2 className="w-3.5 h-3.5" /> Hoạt động
                </span>
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2.5 w-full sm:w-auto">
            {!isEditing ? (
              <>
                <button
                  type="button"
                  onClick={() => setIsEditing(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  <Edit3 className="w-4 h-4" />
                  <span>Chỉnh sửa hồ sơ</span>
                </button>

                <button
                  type="button"
                  onClick={() => setChangePasswordOpen(true)}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-4 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 text-xs font-semibold rounded-xl transition"
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
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-1.5 px-4 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold rounded-xl transition"
                >
                  <X className="w-4 h-4" />
                  <span>Hủy</span>
                </button>

                <button
                  type="button"
                  onClick={handleSaveProfile}
                  disabled={saving}
                  className="flex-1 sm:flex-none inline-flex items-center justify-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-bold rounded-xl shadow-xs transition"
                >
                  <Save className="w-4 h-4" />
                  <span>{saving ? 'Đang lưu...' : 'Lưu thay đổi'}</span>
                </button>
              </>
            )}
          </div>
        </div>
      </div>

      {/* Main Profile Content Form */}
      <form onSubmit={handleSaveProfile} className="space-y-6">
        {/* Section 1: Thông tin liên hệ cá nhân (Editable) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div className="flex items-center gap-2 text-indigo-600 font-bold text-sm">
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
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                    className="w-full pl-10 pr-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              ) : (
                <div className="flex items-center gap-2.5 px-3.5 py-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-semibold text-slate-900">
                  <Phone className="w-4 h-4 text-slate-400" />
                  <span>{user?.phone || <em className="text-slate-400 font-normal">Chưa cập nhật số điện thoại</em>}</span>
                </div>
              )}
            </div>

            {/* Additional Company Info */}
            {user?.role === 'COMPANY' && (
              <>
                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Website công ty
                  </label>
                  {isEditing ? (
                    <input
                      type="url"
                      value={companyDetails.website}
                      onChange={(e) => setCompanyDetails({ ...companyDetails, website: e.target.value })}
                      placeholder="https://company.com"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  ) : (
                    <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-medium text-slate-900">
                      {companyDetails.website || <em className="text-slate-400">Chưa cập nhật</em>}
                    </div>
                  )}
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 mb-1.5">
                    Người đại diện liên hệ
                  </label>
                  {isEditing ? (
                    <input
                      type="text"
                      value={companyDetails.contactPerson}
                      onChange={(e) => setCompanyDetails({ ...companyDetails, contactPerson: e.target.value })}
                      placeholder="Họ tên người liên hệ"
                      className="w-full px-3.5 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                    />
                  ) : (
                    <div className="px-3.5 py-2.5 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-medium text-slate-900">
                      {companyDetails.contactPerson || <em className="text-slate-400">Chưa cập nhật</em>}
                    </div>
                  )}
                </div>
              </>
            )}
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
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-indigo-700 font-mono flex items-center justify-between">
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
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Mã giảng viên</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-indigo-700 font-mono flex items-center justify-between">
                  <span>{lecturer.lecturerCode}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Học hàm / Học vị</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>{lecturer.academicTitle || 'ThS.'}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Lĩnh vực chuyên môn</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-semibold text-slate-800 flex items-center justify-between truncate">
                  <span className="truncate">{lecturer.specialization || 'Khoa học máy tính'}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Số lượng SV có thể nhận (Tối đa)</span>
                {isEditing ? (
                  <div className="flex items-center gap-2">
                    <input
                      type="number"
                      min={lecturer.currentSupervisedStudents || 1}
                      max="50"
                      value={maxSupervisedStudents}
                      onChange={(e) => setMaxSupervisedStudents(e.target.value)}
                      className="w-full p-2.5 bg-indigo-50/50 border border-indigo-300 rounded-xl text-xs font-bold text-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20"
                    />
                  </div>
                ) : (
                  <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl text-xs font-bold text-indigo-700 flex items-center justify-between">
                    <span>Tối đa {lecturer.maxSupervisedStudents ?? lecturer.maxStudents ?? 5} sinh viên</span>
                    <span className="text-[10px] text-indigo-500 font-normal">Có thể chỉnh sửa</span>
                  </div>
                )}
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Đang hướng dẫn / Còn lại</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between">
                  <span>
                    Đang nhận: {lecturer.currentSupervisedStudents || 0} / {lecturer.maxSupervisedStudents ?? lecturer.maxStudents ?? 5} SV
                  </span>
                  <span className="text-[11px] font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200/60">
                    Còn {lecturer.remainingQuota ?? Math.max(0, (lecturer.maxSupervisedStudents ?? 5) - (lecturer.currentSupervisedStudents || 0))}
                  </span>
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Trạng thái tiếp nhận SV</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold flex items-center justify-between">
                  <span className={lecturer.isAvailable ? 'text-emerald-700' : 'text-amber-700'}>
                    {lecturer.isAvailable ? '✓ Sẵn sàng nhận SV' : 'Tạm ngưng nhận'}
                  </span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>
            </div>
          )}

          {/* Company Specific Fields */}
          {user?.role === 'COMPANY' && company && (
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Mã doanh nghiệp</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-indigo-700 font-mono flex items-center justify-between">
                  <span>{company.code}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Tên doanh nghiệp</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-bold text-slate-800 flex items-center justify-between truncate">
                  <span className="truncate">{company.name}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400 shrink-0 ml-1" />
                </div>
              </div>

              <div>
                <span className="text-[11px] font-semibold text-slate-400 block mb-1">Mã số thuế</span>
                <div className="p-3 bg-slate-50 border border-slate-200/70 rounded-xl text-xs font-mono font-semibold text-slate-800 flex items-center justify-between">
                  <span>{company.taxCode || 'Chưa cập nhật'}</span>
                  <Lock className="w-3.5 h-3.5 text-slate-400" />
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
                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                className="w-full pl-3.5 pr-10 py-2.5 bg-white border border-slate-200 rounded-xl text-xs font-medium text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
              className="px-5 py-2 text-xs font-bold text-white bg-indigo-600 hover:bg-indigo-700 rounded-xl shadow-xs transition"
            >
              {pwLoading ? 'Đang đổi...' : 'Xác nhận đổi mật khẩu'}
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};

export default ProfilePage;
