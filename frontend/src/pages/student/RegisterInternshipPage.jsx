import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import internshipApi from '../../api/internshipApi';
import { useAcademicTerm } from '../../context/AcademicTermContext';
import { useToast } from '../../context/ToastContext';
import { formatDateVN, formatFullDateVN } from '../../utils/dateUtils';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import {
  Briefcase,
  Building2,
  Calendar,
  UserCheck,
  MapPin,
  Mail,
  Phone,
  Globe,
  AlertCircle,
  CheckCircle2,
  ArrowRight,
  Info,
  Lock,
} from 'lucide-react';

const RegisterInternshipPage = () => {
  const { currentTerm } = useAcademicTerm();
  const [profileData, setProfileData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Registration Timeline & Lock calculation
  const isRegistrationLocked = Boolean(currentTerm?.internship?.isRegistrationLocked);
  const regStart = currentTerm?.internship?.registrationStart ? new Date(currentTerm.internship.registrationStart) : null;
  const regEnd = currentTerm?.internship?.registrationEnd ? new Date(currentTerm.internship.registrationEnd) : null;
  if (regEnd) {
    if (regEnd.getHours() === 0 && regEnd.getMinutes() === 0 && regEnd.getSeconds() === 0 && regEnd.getMilliseconds() === 0) {
      regEnd.setHours(23, 59, 59, 999);
    }
  }

  const now = new Date();
  const isBeforeStart = regStart && now < regStart;
  const isPastEnd = regEnd && now > regEnd;
  const isClosedOrLocked = isRegistrationLocked || isBeforeStart || isPastEnd;

  const getLockReason = () => {
    if (isRegistrationLocked) {
      return {
        title: 'Cổng đăng ký Thực tập Doanh nghiệp đang bị KHÓA',
        desc: 'Trưởng Bộ Môn hiện đang tạm khóa cổng đăng ký Thực tập Doanh nghiệp cho học kỳ này. Vui lòng quay lại sau.',
        type: 'LOCKED',
      };
    }
    if (isPastEnd) {
      return {
        title: 'Đã hết thời hạn đăng ký Thực tập Doanh nghiệp',
        desc: `Hệ thống đã tự động khóa đăng ký do đã qua hạn chót (${formatFullDateVN(regEnd)} • ${formatDateVN(regEnd)}).`,
        type: 'EXPIRED',
      };
    }
    if (isBeforeStart) {
      return {
        title: 'Chưa đến thời gian mở cổng đăng ký Thực tập Doanh nghiệp',
        desc: `Cổng đăng ký dự kiến sẽ mở vào ngày ${formatFullDateVN(regStart)} (${formatDateVN(regStart)}).`,
        type: 'UPCOMING',
      };
    }
    return null;
  };

  const lockInfo = getLockReason();

  // Form inputs
  const [formData, setFormData] = useState({
    // New company inputs
    newCompanyName: '',
    newCompanyCode: '',
    newCompanyAddress: '',
    newCompanyEmail: '',
    newCompanyPhone: '',
    newCompanyWebsite: '',
    newCompanyContactPerson: '',
    newCompanyContactEmail: '',

    // Internship specifics
    position: '',
    durationInWeeks: 10,
    startDate: '',
    endDate: '',
    registrationNote: '',

    // Mentor / Evaluator specifics
    mentorName: '',
    mentorPosition: '',
    mentorEmail: '',
    mentorPhone: '',
  });

  const [errors, setErrors] = useState({});

  const { showToast } = useToast();
  const navigate = useNavigate();

  // Load student profile on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const myRes = await internshipApi.getMyInternship();
        if (myRes.success) {
          setProfileData(myRes.data);
        }
      } catch (err) {
        showToast(err.message || 'Không thể tải thông tin đăng ký', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showToast]);

  const computeEndDate = (startDateStr, weeks) => {
    if (!startDateStr || !weeks) return '';
    const start = new Date(startDateStr);
    if (isNaN(start.getTime())) return '';
    const end = new Date(start);
    end.setDate(end.getDate() + (weeks * 7 - 1));
    const year = end.getFullYear();
    const month = String(end.getMonth() + 1).padStart(2, '0');
    const day = String(end.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  };

  const calculateWeeksFromDates = (startStr, endStr) => {
    if (!startStr || !endStr) return null;
    const start = new Date(startStr);
    const end = new Date(endStr);
    if (isNaN(start.getTime()) || isNaN(end.getTime()) || start >= end) return null;
    const diffDays = Math.round((end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24));
    return Math.round(diffDays / 7);
  };

  const handleDurationSelect = (weeks) => {
    setFormData((prev) => {
      const updated = { ...prev, durationInWeeks: weeks };
      if (prev.startDate) {
        updated.endDate = computeEndDate(prev.startDate, weeks);
      }
      return updated;
    });
    setErrors((prev) => ({ ...prev, durationInWeeks: null, endDate: null }));
  };

  const handleStartDateChange = (e) => {
    const value = e.target.value;
    setFormData((prev) => {
      const updated = { ...prev, startDate: value };
      if (value && prev.durationInWeeks) {
        updated.endDate = computeEndDate(value, prev.durationInWeeks);
      }
      return updated;
    });
    setErrors((prev) => ({ ...prev, startDate: null, endDate: null }));
  };

  const handleEndDateChange = (e) => {
    const value = e.target.value;
    const weeks = calculateWeeksFromDates(formData.startDate, value);
    setFormData((prev) => ({
      ...prev,
      endDate: value,
      durationInWeeks: weeks === 10 || weeks === 12 ? weeks : prev.durationInWeeks,
    }));
    setErrors((prev) => ({ ...prev, endDate: null }));
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors((prev) => ({ ...prev, [name]: null }));
    }
  };

  const validate = () => {
    const errs = {};

    if (!formData.newCompanyName.trim()) {
      errs.newCompanyName = 'Tên doanh nghiệp là bắt buộc';
    }
    if (!formData.newCompanyAddress.trim()) {
      errs.newCompanyAddress = 'Địa chỉ doanh nghiệp là bắt buộc';
    }

    if (!formData.position.trim()) {
      errs.position = 'Vị trí thực tập là bắt buộc';
    }

    if (!formData.startDate) {
      errs.startDate = 'Ngày bắt đầu là bắt buộc';
    }

    if (!formData.endDate) {
      errs.endDate = 'Ngày kết thúc là bắt buộc';
    }

    if (formData.startDate && formData.endDate) {
      const start = new Date(formData.startDate);
      const end = new Date(formData.endDate);
      if (isNaN(start.getTime()) || isNaN(end.getTime())) {
        errs.startDate = 'Thời gian thực tập không hợp lệ';
      } else if (start >= end) {
        errs.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
      } else {
        const weeks = calculateWeeksFromDates(formData.startDate, formData.endDate);
        if (weeks !== 10 && weeks !== 12) {
          errs.endDate = `Thời gian thực tập chỉ được phép là 10 tuần hoặc 12 tuần (Hiện tại: ${weeks ? `${weeks} tuần` : 'không hợp lệ'}). Vui lòng điều chỉnh lại ngày kết thúc.`;
        }
      }
    }

    // Mandatory Evaluator / Mentor validations
    if (!formData.mentorName.trim()) {
      errs.mentorName = 'Vui lòng nhập họ và tên người đánh giá.';
    }

    if (!formData.mentorPosition.trim()) {
      errs.mentorPosition = 'Vui lòng nhập chức vụ / bộ phận công tác.';
    }

    if (!formData.mentorEmail.trim()) {
      errs.mentorEmail = 'Vui lòng nhập email người đánh giá.';
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.mentorEmail.trim())) {
      errs.mentorEmail = 'Email người đánh giá không đúng định dạng.';
    }

    if (!formData.mentorPhone.trim()) {
      errs.mentorPhone = 'Vui lòng nhập số điện thoại người đánh giá.';
    } else if (!/^(0|\+84)[0-9]{9,10}$/.test(formData.mentorPhone.trim().replace(/[\s.-]/g, ''))) {
      errs.mentorPhone = 'Số điện thoại không hợp lệ (10-11 số).';
    }

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (isClosedOrLocked) {
      showToast(lockInfo?.desc || 'Cổng đăng ký Thực tập Doanh nghiệp hiện không mở', 'warning');
      return;
    }
    if (!validate()) {
      showToast('Vui lòng kiểm tra lại các trường thông tin bắt buộc', 'error');
      return;
    }

    setSubmitting(true);

    const payload = {
      academicTermId: currentTerm?._id || undefined,
      position: formData.position.trim(),
      startDate: formData.startDate,
      endDate: formData.endDate,
      registrationNote: formData.registrationNote.trim() || undefined,
      mentorName: formData.mentorName.trim(),
      mentorPosition: formData.mentorPosition.trim(),
      mentorEmail: formData.mentorEmail.trim().toLowerCase(),
      mentorPhone: formData.mentorPhone.trim(),
      newCompany: {
        name: formData.newCompanyName.trim(),
        code: formData.newCompanyCode.trim() || undefined,
        address: formData.newCompanyAddress.trim(),
        email: formData.newCompanyEmail.trim() || undefined,
        phone: formData.newCompanyPhone.trim() || undefined,
        website: formData.newCompanyWebsite.trim() || undefined,
        contactPerson: formData.newCompanyContactPerson.trim() || undefined,
        contactEmail: formData.newCompanyContactEmail.trim() || undefined,
      },
    };

    try {
      const res = await internshipApi.register(payload);
      if (res.success) {
        showToast('Đăng ký thực tập thành công! Hồ sơ đang chờ xét duyệt.', 'success');
        navigate('/student/internship');
      }
    } catch (err) {
      showToast(err.message || 'Đăng ký thực tập thất bại', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200 shadow-2xs">
        <LoadingSkeleton rows={5} cols={3} />
      </div>
    );
  }

  const { student, hasActiveInternship } = profileData || {};

  // If already has active internship -> Block registration
  if (hasActiveInternship) {
    return (
      <div className="p-8 bg-white rounded-3xl border border-slate-200/80 shadow-2xs text-center max-w-xl mx-auto space-y-4">
        <div className="w-16 h-16 rounded-2xl bg-amber-50 border border-amber-200 text-amber-600 flex items-center justify-center mx-auto shadow-xs">
          <AlertCircle className="w-8 h-8" />
        </div>
        <h3 className="text-lg font-bold text-slate-900">
          Bạn đang có hồ sơ thực tập hoạt động
        </h3>
        <p className="text-xs text-slate-500 leading-relaxed">
          Bạn không thể tạo thêm hồ sơ mới trong lúc hồ sơ hiện tại chưa kết thúc.
        </p>
        <div className="pt-2">
          <Link
            to="/student/internship"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Briefcase className="w-4 h-4" />
            <span>Xem hồ sơ thực tập hiện tại</span>
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2 text-[#123891] font-semibold text-xs tracking-wider uppercase">
          <Briefcase className="w-4 h-4" /> Quy trình Đăng ký TTDN
        </div>
        <h2 className="text-xl font-bold text-slate-900 mt-1">
          Nộp Đơn Đăng Ký Thực Tập Doanh Nghiệp
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Vui lòng kiểm tra thông tin sinh viên và điền đầy đủ chi tiết về đơn vị thực tập
        </p>
      </div>

      {/* Registration Lock / Timeline Alert Banner */}
      {lockInfo && (
        <div
          className={`p-5 rounded-2xl border flex items-start gap-3.5 shadow-2xs ${
            lockInfo.type === 'UPCOMING'
              ? 'bg-amber-50/80 border-amber-200 text-amber-900'
              : lockInfo.type === 'EXPIRED'
              ? 'bg-rose-50/80 border-rose-200 text-rose-900'
              : 'bg-slate-50 border-slate-300 text-slate-800'
          }`}
        >
          <AlertCircle
            className={`w-5 h-5 shrink-0 mt-0.5 ${
              lockInfo.type === 'UPCOMING'
                ? 'text-amber-600'
                : lockInfo.type === 'EXPIRED'
                ? 'text-rose-600'
                : 'text-slate-600'
            }`}
          />
          <div>
            <h4 className="font-bold text-sm">{lockInfo.title}</h4>
            <p className="text-xs mt-0.5 leading-relaxed opacity-90">{lockInfo.desc}</p>
          </div>
        </div>
      )}

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Student Info */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Lock className="w-4 h-4 text-slate-400" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              1. Thông tin Sinh viên
            </h3>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 block mb-0.5">Họ và tên sinh viên</span>
              <span className="font-bold text-slate-900 text-sm">
                {student?.userId?.fullName}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 block mb-0.5">Mã số sinh viên (MSSV)</span>
              <span className="font-mono font-bold text-[#123891] text-sm">
                {student?.studentCode}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 block mb-0.5">Lớp sinh hoạt</span>
              <span className="font-bold text-slate-900 text-sm">
                {student?.className}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 block mb-0.5">Email trường</span>
              <span className="font-medium text-slate-700">
                {student?.userId?.email}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 block mb-0.5">Số điện thoại</span>
              <span className="font-medium text-slate-700 font-mono">
                {student?.userId?.phone || 'Chưa cập nhật'}
              </span>
            </div>

            <div className="p-3.5 rounded-2xl bg-slate-50 border border-slate-200/80">
              <span className="text-slate-400 block mb-0.5">GPA / Tín chỉ tích lũy</span>
              <span className="font-bold text-slate-900">
                {Number(student?.gpa).toFixed(2)} GPA • {student?.accumulatedCredits} TC
              </span>
            </div>
          </div>
        </div>

        {/* SECTION 2: Company Info Entry (Default & Only View) */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-[#123891]" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. Thông tin Doanh nghiệp Thực tập
            </h3>
          </div>

          <div className="space-y-4">
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="sm:col-span-2">
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tên Doanh nghiệp <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="newCompanyName"
                  value={formData.newCompanyName}
                  onChange={handleChange}
                  placeholder="VD: Công ty TNHH Phần mềm ABC"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition font-medium"
                />
                {errors.newCompanyName && (
                  <p className="text-xs text-rose-500 mt-1">{errors.newCompanyName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Mã viết tắt (Nếu có)
                </label>
                <input
                  type="text"
                  name="newCompanyCode"
                  value={formData.newCompanyCode}
                  onChange={handleChange}
                  placeholder="VD: ABC_SOFT"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition uppercase font-mono"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Địa chỉ thực tập <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="newCompanyAddress"
                value={formData.newCompanyAddress}
                onChange={handleChange}
                placeholder="VD: 123 Nguyễn Văn Bảo, Phường 4, Gò Vấp, TP.HCM"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
              />
              {errors.newCompanyAddress && (
                <p className="text-xs text-rose-500 mt-1">{errors.newCompanyAddress}</p>
              )}
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email công ty
                </label>
                <input
                  type="email"
                  name="newCompanyEmail"
                  value={formData.newCompanyEmail}
                  onChange={handleChange}
                  placeholder="hr@company.com"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại
                </label>
                <input
                  type="text"
                  name="newCompanyPhone"
                  value={formData.newCompanyPhone}
                  onChange={handleChange}
                  placeholder="02812345678"
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Website
                </label>
                <input
                  type="text"
                  name="newCompanyWebsite"
                  value={formData.newCompanyWebsite}
                  onChange={handleChange}
                  placeholder="https://..."
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
                />
              </div>
            </div>
          </div>
        </div>

        {/* SECTION 3: Internship Position & Dates */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calendar className="w-5 h-5 text-[#123891]" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              3. Vị trí & Thời gian Thực tập (10 hoặc 12 tuần)
            </h3>
          </div>

          {/* Duration selection */}
          <div className="space-y-2">
            <label className="block text-xs font-semibold text-slate-700">
              Quy chuẩn thời lượng thực tập <span className="text-rose-500">*</span>
            </label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <button
                type="button"
                onClick={() => handleDurationSelect(10)}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  formData.durationInWeeks === 10
                    ? 'bg-blue-50/70 border-[#123891] ring-1 ring-[#123891]'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    formData.durationInWeeks === 10
                      ? 'border-[#123891] bg-[#123891] text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {formData.durationInWeeks === 10 && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Thời lượng 10 Tuần
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Thời lượng chuẩn cho đợt Thực tập Doanh nghiệp (70 ngày)
                  </div>
                </div>
              </button>

              <button
                type="button"
                onClick={() => handleDurationSelect(12)}
                className={`p-3.5 rounded-2xl border text-left transition flex items-start gap-3 cursor-pointer ${
                  formData.durationInWeeks === 12
                    ? 'bg-blue-50/70 border-[#123891] ring-1 ring-[#123891]'
                    : 'bg-slate-50 border-slate-200 hover:bg-slate-100'
                }`}
              >
                <div
                  className={`w-5 h-5 rounded-full border flex items-center justify-center shrink-0 mt-0.5 ${
                    formData.durationInWeeks === 12
                      ? 'border-[#123891] bg-[#123891] text-white'
                      : 'border-slate-300 bg-white'
                  }`}
                >
                  {formData.durationInWeeks === 12 && <div className="w-2 h-2 rounded-full bg-white" />}
                </div>
                <div>
                  <div className="text-xs font-bold text-slate-900">
                    Thời lượng 12 Tuần
                  </div>
                  <div className="text-[11px] text-slate-500 mt-0.5">
                    Thời lượng mở rộng theo yêu cầu của đơn vị thực tập (84 ngày)
                  </div>
                </div>
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Vị trí thực tập tiếp nhận <span className="text-rose-500">*</span>
              </label>
              <input
                type="text"
                name="position"
                value={formData.position}
                onChange={handleChange}
                placeholder="VD: Fullstack Node.js & React Intern"
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition font-medium"
              />
              {errors.position && (
                <p className="text-xs text-rose-500 mt-1">{errors.position}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày bắt đầu thực tập <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="startDate"
                value={formData.startDate}
                onChange={handleStartDateChange}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
              />
              {errors.startDate && (
                <p className="text-xs text-rose-500 mt-1">{errors.startDate}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Ngày kết thúc thực tập <span className="text-rose-500">*</span>
              </label>
              <input
                type="date"
                name="endDate"
                value={formData.endDate}
                onChange={handleEndDateChange}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
              />
              {errors.endDate && (
                <p className="text-xs text-rose-500 mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* Real-time Duration Indicator */}
          {formData.startDate && formData.endDate && (() => {
            const calculated = calculateWeeksFromDates(formData.startDate, formData.endDate);
            const isValid = calculated === 10 || calculated === 12;
            return (
              <div
                className={`p-3 rounded-2xl border text-xs flex items-center gap-2 ${
                  isValid
                    ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                    : 'bg-rose-50 border-rose-200 text-rose-800'
                }`}
              >
                {isValid ? (
                  <>
                    <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                    <span>
                      Thời lượng tính toán: <strong>{calculated} tuần</strong> (Hợp lệ theo quy định thực tập)
                    </span>
                  </>
                ) : (
                  <>
                    <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
                    <span>
                      Thời lượng tính toán: <strong>{calculated ? `${calculated} tuần` : 'Không hợp lệ'}</strong>. Quy định chỉ cho phép <strong>10 tuần hoặc 12 tuần</strong>.
                    </span>
                  </>
                )}
              </div>
            );
          })()}

          {/* THÔNG TIN NGƯỜI ĐÁNH GIÁ TẠI DOANH NGHIỆP */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
              <UserCheck className="w-4 h-4 text-[#123891]" />
              <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
                👤 Thông tin người đánh giá tại Doanh nghiệp
              </h4>
            </div>
            <p className="text-[11px] text-slate-500">
              Vui lòng nhập chính xác thông tin Cán bộ / Quản lý trực tiếp tại Doanh nghiệp sẽ thực hiện đánh giá kết quả thực tập của bạn.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Họ và tên người đánh giá <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="mentorName"
                  value={formData.mentorName}
                  onChange={handleChange}
                  placeholder="Ví dụ: Nguyễn Văn Quản Lý"
                  className={`w-full px-3.5 py-2.5 text-xs bg-white border ${
                    errors.mentorName ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition`}
                />
                {errors.mentorName && (
                  <p className="text-[11px] text-rose-500 mt-1">{errors.mentorName}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Chức vụ / Bộ phận công tác <span className="text-rose-500">*</span>
                </label>
                <input
                  type="text"
                  name="mentorPosition"
                  value={formData.mentorPosition}
                  onChange={handleChange}
                  placeholder="Ví dụ: Trưởng phòng IT / Tech Lead"
                  className={`w-full px-3.5 py-2.5 text-xs bg-white border ${
                    errors.mentorPosition ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition`}
                />
                {errors.mentorPosition && (
                  <p className="text-[11px] text-rose-500 mt-1">{errors.mentorPosition}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Email người đánh giá <span className="text-rose-500">*</span>
                </label>
                <input
                  type="email"
                  name="mentorEmail"
                  value={formData.mentorEmail}
                  onChange={handleChange}
                  placeholder="manager@company.com"
                  className={`w-full px-3.5 py-2.5 text-xs bg-white border ${
                    errors.mentorEmail ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition`}
                />
                {errors.mentorEmail && (
                  <p className="text-[11px] text-rose-500 mt-1">{errors.mentorEmail}</p>
                )}
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Số điện thoại người đánh giá <span className="text-rose-500">*</span>
                </label>
                <input
                  type="tel"
                  name="mentorPhone"
                  value={formData.mentorPhone}
                  onChange={handleChange}
                  placeholder="0901234567"
                  className={`w-full px-3.5 py-2.5 text-xs bg-white border ${
                    errors.mentorPhone ? 'border-rose-300 ring-1 ring-rose-300' : 'border-slate-200'
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition`}
                />
                {errors.mentorPhone && (
                  <p className="text-[11px] text-rose-500 mt-1">{errors.mentorPhone}</p>
                )}
              </div>
            </div>
          </div>

          {/* Registration Note */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Ghi chú
            </label>
            <textarea
              name="registrationNote"
              rows={3}
              value={formData.registrationNote}
              onChange={handleChange}
              placeholder="Nguyện vọng, nội dung đề tài thực tập dự kiến tại doanh nghiệp..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition resize-none"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-end p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="flex items-center gap-3">
            <Link
              to="/student/internship"
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy bỏ
            </Link>

            <button
              type="submit"
              disabled={submitting || Boolean(isClosedOrLocked)}
              title={lockInfo ? lockInfo.title : undefined}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-[#123891] hover:bg-[#102d7d] active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-200 transition disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {submitting ? (
                <span className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
              ) : (
                <CheckCircle2 className="w-4 h-4" />
              )}
              <span>Gửi đơn đăng ký thực tập</span>
            </button>
          </div>
        </div>
      </form>
    </div>
  );
};

export default RegisterInternshipPage;
