import React, { useState, useEffect, useCallback } from 'react';
import adminApi from '../../api/adminApi';
import { useToast } from '../../context/ToastContext';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {
  MailCheck,
  MailX,
  Power,
  ShieldCheck,
  AlertTriangle,
  RefreshCw,
  Save,
  CheckCircle2,
  GraduationCap,
  BookOpen,
  FileSpreadsheet,
  KeyRound,
  BellRing,
  Newspaper,
  Clock,
  User,
} from 'lucide-react';

const FEATURE_CONFIGS = [
  {
    key: 'sendOnCreateStudent',
    label: 'Tạo tài khoản sinh viên',
    desc: 'Gửi email chứa thông tin tài khoản và mật khẩu khởi tạo khi ADMIN/TBM tạo mới sinh viên thủ công.',
    icon: GraduationCap,
    category: 'Tài khoản & Xác thực',
  },
  {
    key: 'sendOnCreateLecturer',
    label: 'Tạo tài khoản giảng viên',
    desc: 'Gửi email chứa thông tin đăng nhập và mật khẩu khởi tạo khi ADMIN tạo mới giảng viên.',
    icon: BookOpen,
    category: 'Tài khoản & Xác thực',
  },
  {
    key: 'sendOnImportStudentExcel',
    label: 'Import Excel sinh viên',
    desc: 'Gửi email thông tin đăng nhập hàng loạt cho các tài khoản sinh viên được khởi tạo từ file Excel hoặc khi cấp lại mật khẩu từ danh sách import.',
    icon: FileSpreadsheet,
    category: 'Dữ liệu hàng loạt',
  },
  {
    key: 'sendOnResetPassword',
    label: 'Reset mật khẩu',
    desc: 'Gửi email thông báo mật khẩu ngẫu nhiên mới khi Quản trị viên thực hiện Reset Password trên trang Quản lý Người dùng.',
    icon: KeyRound,
    category: 'Tài khoản & Xác thực',
  },
  {
    key: 'sendOnNotification',
    label: 'Thông báo tiến độ & hoạt động TTDN / KLTN',
    desc: 'Gửi email thông báo tự động khi có cập nhật hồ sơ thực tập, đề tài khóa luận, phân công hướng dẫn hoặc công bố đánh giá.',
    icon: BellRing,
    category: 'Nghiệp vụ thực tập & Khóa luận',
  },
  {
    key: 'sendOnNews',
    label: 'Thông báo Bản tin & Sự kiện',
    desc: 'Gửi email thông báo tự động đến người dùng đăng ký nhận tin khi có bài viết Bản tin hoặc sự kiện mới được xuất bản.',
    icon: Newspaper,
    category: 'Truyền thông & Tin tức',
  },
];

const AdminEmailSettingsPage = () => {
  const { showToast } = useToast();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasChanges, setHasChanges] = useState(false);

  // Dữ liệu cấu hình từ server
  const [originalSettings, setOriginalSettings] = useState(null);

  // Form cấu hình hiện tại
  const [settings, setSettings] = useState({
    isMasterEnabled: true,
    sendOnCreateStudent: true,
    sendOnCreateLecturer: true,
    sendOnImportStudentExcel: true,
    sendOnResetPassword: true,
    sendOnNotification: true,
    sendOnNews: true,
    updatedAt: null,
    updatedBy: null,
  });

  const fetchSettings = useCallback(async () => {
    setLoading(true);
    try {
      const res = await adminApi.getEmailSettings();
      if (res?.success && res?.settings) {
        setSettings(res.settings);
        setOriginalSettings(res.settings);
        setHasChanges(false);
      }
    } catch (err) {
      showToast(err.message || 'Không thể tải cấu hình email hệ thống', 'error');
    } finally {
      setLoading(false);
    }
  }, [showToast]);

  useEffect(() => {
    fetchSettings();
  }, [fetchSettings]);

  // Xử lý bật/tắt một công tắc
  const handleToggle = (key) => {
    setSettings((prev) => {
      const updated = {
        ...prev,
        [key]: !prev[key],
      };
      checkHasChanges(updated, originalSettings);
      return updated;
    });
  };

  // Kiểm tra xem có thay đổi so với bản gốc không
  const checkHasChanges = (current, original) => {
    if (!original) {
      setHasChanges(false);
      return;
    }
    const isDifferent =
      current.isMasterEnabled !== original.isMasterEnabled ||
      current.sendOnCreateStudent !== original.sendOnCreateStudent ||
      current.sendOnCreateLecturer !== original.sendOnCreateLecturer ||
      current.sendOnImportStudentExcel !== original.sendOnImportStudentExcel ||
      current.sendOnResetPassword !== original.sendOnResetPassword ||
      current.sendOnNotification !== original.sendOnNotification ||
      current.sendOnNews !== original.sendOnNews;
    setHasChanges(isDifferent);
  };

  // Lưu cấu hình xuống Backend
  const handleSave = async () => {
    setSaving(true);
    try {
      const payload = {
        isMasterEnabled: settings.isMasterEnabled,
        sendOnCreateStudent: settings.sendOnCreateStudent,
        sendOnCreateLecturer: settings.sendOnCreateLecturer,
        sendOnImportStudentExcel: settings.sendOnImportStudentExcel,
        sendOnResetPassword: settings.sendOnResetPassword,
        sendOnNotification: settings.sendOnNotification,
        sendOnNews: settings.sendOnNews,
      };

      const res = await adminApi.updateEmailSettings(payload);
      if (res?.success && res?.settings) {
        setSettings(res.settings);
        setOriginalSettings(res.settings);
        setHasChanges(false);
        showToast('Cập nhật cấu hình email hệ thống thành công!', 'success');
      }
    } catch (err) {
      showToast(err.message || 'Lỗi khi lưu cấu hình email', 'error');
    } finally {
      setSaving(false);
    }
  };

  // Khôi phục lại trạng thái chưa lưu
  const handleReset = () => {
    if (originalSettings) {
      setSettings(originalSettings);
      setHasChanges(false);
      showToast('Đã khôi phục các thay đổi chưa lưu', 'info');
    }
  };

  const formatDateTime = (isoStr) => {
    if (!isoStr) return 'Chưa có thông tin';
    try {
      const d = new Date(isoStr);
      return new Intl.DateTimeFormat('vi-VN', {
        dateStyle: 'medium',
        timeStyle: 'medium',
        timeZone: 'Asia/Ho_Chi_Minh',
      }).format(d);
    } catch {
      return isoStr;
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Header Banner */}
      <div className="p-4 sm:p-6 rounded-2xl sm:rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col md:flex-row md:items-center justify-between gap-4 sm:gap-5">
        <div className="flex items-center gap-3.5 sm:gap-4 min-w-0">
          <div className="w-12 h-12 sm:w-14 sm:h-14 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0 shadow-xs">
            <MailCheck className="w-6 h-6 sm:w-7 sm:h-7" />
          </div>
          <div className="min-w-0">
            <div className="flex items-center gap-2.5 flex-wrap">
              <h1 className="text-lg sm:text-xl font-bold text-slate-900 leading-tight">
                Cấu hình Email Hệ thống
              </h1>
              <span
                className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-[11px] font-bold border ${
                  settings.isMasterEnabled
                    ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
                    : 'bg-rose-50 text-rose-700 border-rose-200'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    settings.isMasterEnabled ? 'bg-emerald-500 animate-pulse' : 'bg-rose-500'
                  }`}
                />
                {settings.isMasterEnabled ? 'Email đang hoạt động' : 'Đang tạm dừng toàn bộ'}
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Quản lý bật/tắt việc gửi email tự động cho từng chức năng trong hệ thống (Chỉ dành riêng cho ADMIN)
            </p>
          </div>
        </div>

        {/* Nút thao tác nhanh */}
        <div className="flex items-center gap-2.5 shrink-0 w-full sm:w-auto justify-end">
          <button
            type="button"
            onClick={fetchSettings}
            disabled={loading || saving}
            className="inline-flex items-center justify-center gap-1.5 px-3.5 py-2.5 bg-white hover:bg-slate-50 text-slate-700 border border-slate-200 rounded-xl text-xs font-bold shadow-2xs transition cursor-pointer disabled:opacity-50"
            title="Tải lại cấu hình từ máy chủ"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
            <span className="hidden sm:inline">Làm mới</span>
          </button>

          {hasChanges && (
            <button
              type="button"
              onClick={handleReset}
              disabled={saving}
              className="inline-flex items-center justify-center px-3.5 py-2.5 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-xl text-xs font-bold transition cursor-pointer"
            >
              Hủy thay đổi
            </button>
          )}

          <button
            type="button"
            onClick={handleSave}
            disabled={saving || !hasChanges}
            className={`inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-bold shadow-xs transition cursor-pointer ${
              hasChanges
                ? 'bg-[#123891] hover:bg-[#102d7d] text-white hover:shadow-md'
                : 'bg-slate-100 text-slate-400 cursor-not-allowed border border-slate-200'
            }`}
          >
            <Save className={`w-4 h-4 ${saving ? 'animate-spin' : ''}`} />
            <span>{saving ? 'Đang lưu...' : 'Lưu cấu hình'}</span>
          </button>
        </div>
      </div>

      {loading ? (
        <div className="p-6 bg-white rounded-3xl border border-slate-200/80 shadow-2xs">
          <LoadingSkeleton rows={6} cols={3} />
        </div>
      ) : (
        <>
          {/* 2. Cấu hình Tổng (Master Switch) */}
          <div
            className={`p-5 sm:p-6 rounded-2xl sm:rounded-3xl border transition-all shadow-2xs ${
              settings.isMasterEnabled
                ? 'bg-gradient-to-r from-emerald-50/70 via-white to-blue-50/40 border-emerald-200/90'
                : 'bg-gradient-to-r from-rose-50/70 via-white to-slate-50 border-rose-200/90'
            }`}
          >
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center shrink-0 shadow-xs ${
                    settings.isMasterEnabled
                      ? 'bg-emerald-600 text-white'
                      : 'bg-rose-600 text-white'
                  }`}
                >
                  <Power className="w-6 h-6" />
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-base sm:text-lg font-bold text-slate-900">
                      Cho phép gửi email hệ thống
                    </h2>
                  </div>
                  <p className="text-xs text-slate-600 mt-1 max-w-2xl leading-relaxed">
                    {settings.isMasterEnabled ? (
                      <span className="text-emerald-900 font-medium">
                        Hệ thống đang <strong>CHO PHÉP</strong> gửi email tự động theo các cấu hình chức năng bên dưới.
                      </span>
                    ) : (
                      <span className="text-rose-900 font-medium">
                        Hệ thống đang <strong>TẠM DỪNG TOÀN BỘ</strong> email tự động. Bất kể các công tắc riêng lẻ đang bật hay tắt, không có email nào được gửi đi.
                      </span>
                    )}
                  </p>
                </div>
              </div>

              {/* Nút Switch cho Công tắc tổng */}
              <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                <span
                  className={`text-xs font-bold ${
                    settings.isMasterEnabled ? 'text-emerald-700' : 'text-slate-400'
                  }`}
                >
                  {settings.isMasterEnabled ? 'ĐANG BẬT' : 'ĐANG TẮT'}
                </span>
                <button
                  type="button"
                  role="switch"
                  aria-checked={settings.isMasterEnabled}
                  onClick={() => handleToggle('isMasterEnabled')}
                  className={`relative inline-flex h-7 w-13 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#123891] focus:ring-offset-2 ${
                    settings.isMasterEnabled ? 'bg-emerald-600' : 'bg-slate-300'
                  }`}
                >
                  <span
                    className={`pointer-events-none inline-block h-6 w-6 transform rounded-full bg-white shadow-md ring-0 transition duration-200 ease-in-out ${
                      settings.isMasterEnabled ? 'translate-x-6' : 'translate-x-0'
                    }`}
                  />
                </button>
              </div>
            </div>

            {/* Thông báo cảnh báo khi công tắc tổng tắt */}
            {!settings.isMasterEnabled && (
              <div className="mt-4 p-3.5 bg-rose-100/70 border border-rose-200 rounded-2xl flex items-start gap-3 text-xs text-rose-900">
                <AlertTriangle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
                <div className="space-y-0.5">
                  <p className="font-bold">Lưu ý khi tạm dừng gửi email:</p>
                  <p className="text-rose-800 text-[11px] leading-relaxed">
                    Tất cả chức năng tạo tài khoản, Import Excel, Reset mật khẩu vẫn hoạt động bình thường và lưu dữ liệu an toàn vào cơ sở dữ liệu. Mật khẩu mới sẽ hiển thị trực tiếp cho Quản trị viên để sao chép bàn giao cho người dùng thay vì gửi qua email.
                  </p>
                </div>
              </div>
            )}
          </div>

          {/* 3. Danh sách công tắc theo từng Chức năng */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
            <div className="p-4 sm:p-5 border-b border-slate-100 bg-slate-50/60 flex items-center justify-between">
              <div>
                <h3 className="text-sm font-bold text-slate-900">
                  Cấu hình Bật / Tắt theo từng Chức năng
                </h3>
                <p className="text-xs text-slate-500 mt-0.5">
                  Email chỉ được gửi khi chức năng tương ứng được BẬT
                </p>
              </div>
              <div className="hidden sm:flex items-center gap-1.5 text-xs text-slate-500 font-medium">
                <ShieldCheck className="w-4 h-4 text-[#123891]" />
                <span>Kiểm soát trực tiếp từ Backend</span>
              </div>
            </div>

            <div className="divide-y divide-slate-100">
              {FEATURE_CONFIGS.map((feature, idx) => {
                const Icon = feature.icon;
                const isEnabled = settings[feature.key];
                const isActuallyActive = settings.isMasterEnabled && isEnabled;

                return (
                  <div
                    key={feature.key}
                    className={`p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 transition hover:bg-slate-50/60 ${
                      !settings.isMasterEnabled ? 'opacity-70' : ''
                    }`}
                  >
                    <div className="flex items-start gap-3.5 min-w-0">
                      <div
                        className={`w-10 h-10 rounded-xl flex items-center justify-center shrink-0 transition shadow-2xs ${
                          isActuallyActive
                            ? 'bg-blue-50 text-[#123891]'
                            : 'bg-slate-100 text-slate-400'
                        }`}
                      >
                        <Icon className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2 flex-wrap">
                          <h4 className="text-xs sm:text-sm font-bold text-slate-900">
                            {feature.label}
                          </h4>
                          {/* Trạng thái thực tế khi gửi */}
                          {isActuallyActive ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-full border border-emerald-200">
                              <CheckCircle2 className="w-3 h-3" /> Đang gửi
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1 text-[10px] font-bold text-slate-500 bg-slate-100 px-2 py-0.5 rounded-full border border-slate-200">
                              <MailX className="w-3 h-3" /> Tạm dừng
                            </span>
                          )}
                        </div>
                        <p className="text-xs text-slate-500 mt-1 leading-relaxed">
                          {feature.desc}
                        </p>
                      </div>
                    </div>

                    {/* Nút Toggle switch */}
                    <div className="flex items-center gap-3 shrink-0 self-end sm:self-center pl-13 sm:pl-0">
                      <span
                        className={`text-xs font-bold ${
                          isEnabled ? 'text-[#123891]' : 'text-slate-400'
                        }`}
                      >
                        {isEnabled ? 'Bật' : 'Tắt'}
                      </span>
                      <button
                        type="button"
                        role="switch"
                        aria-checked={isEnabled}
                        onClick={() => handleToggle(feature.key)}
                        className={`relative inline-flex h-6 w-11 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-[#123891] focus:ring-offset-2 ${
                          isEnabled ? 'bg-[#123891]' : 'bg-slate-300'
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${
                            isEnabled ? 'translate-x-5' : 'translate-x-0'
                          }`}
                        />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* 4. Thông tin cập nhật lần cuối */}
          <div className="p-4 sm:p-5 rounded-2xl bg-white border border-slate-200/80 shadow-2xs space-y-2.5">
            <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
              <Clock className="w-4 h-4 text-[#123891]" />
              <span>Thông tin lần cập nhật gần nhất</span>
            </div>
            <div className="space-y-2 text-xs">
              <div className="flex items-center justify-between py-1 border-b border-slate-100">
                <span className="text-slate-500">Thời gian cập nhật:</span>
                <span className="font-semibold text-slate-800">
                  {formatDateTime(settings.updatedAt)}
                </span>
              </div>
              <div className="flex items-center justify-between py-1">
                <span className="text-slate-500">Người thực hiện:</span>
                <span className="font-bold text-[#123891] flex items-center gap-1.5">
                  <User className="w-3.5 h-3.5" />
                  {settings.updatedBy?.fullName || 'Hệ thống (Mặc định)'}
                </span>
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default AdminEmailSettingsPage;
