import React, { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import internshipApi from '../../api/internshipApi';
import { useToast } from '../../context/ToastContext';
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
  const [profileData, setProfileData] = useState(null);
  const [activeCompanies, setActiveCompanies] = useState([]);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  // Form mode: 'existing' or 'new'
  const [companyMode, setCompanyMode] = useState('existing');

  // Form inputs
  const [formData, setFormData] = useState({
    // Existing company selection
    companyId: '',

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

  // Load student profile & active companies on mount
  useEffect(() => {
    const fetchData = async () => {
      setLoading(true);
      try {
        const [myRes, compRes] = await Promise.all([
          internshipApi.getMyInternship(),
          internshipApi.getActiveCompanies(),
        ]);

        if (myRes.success) {
          setProfileData(myRes.data);
        }

        if (compRes.success && compRes.data?.length > 0) {
          setActiveCompanies(compRes.data);
          // Set first company as default
          setFormData((prev) => ({
            ...prev,
            companyId: compRes.data[0]._id,
            mentorName: compRes.data[0].contactPerson || '',
            mentorPosition: 'Quản lý / Người phụ trách thực tập',
            mentorEmail: compRes.data[0].contactEmail || compRes.data[0].email || '',
            mentorPhone: compRes.data[0].phone || '',
          }));
        }
      } catch (err) {
        showToast(err.message || 'Không thể tải thông tin đăng ký', 'error');
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, [showToast]);

  // Handle Company Selection Change (Auto-fill mentor contact)
  const handleCompanySelect = (e) => {
    const compId = e.target.value;
    const selected = activeCompanies.find((c) => c._id === compId);

    setFormData((prev) => ({
      ...prev,
      companyId: compId,
      mentorName: selected?.contactPerson || '',
      mentorPosition: prev.mentorPosition || 'Quản lý / Người phụ trách thực tập',
      mentorEmail: selected?.contactEmail || selected?.email || '',
      mentorPhone: selected?.phone || '',
    }));
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

    if (companyMode === 'existing') {
      if (!formData.companyId) {
        errs.companyId = 'Vui lòng chọn doanh nghiệp thực tập';
      }
    } else {
      if (!formData.newCompanyName.trim()) {
        errs.newCompanyName = 'Tên doanh nghiệp là bắt buộc';
      }
      if (!formData.newCompanyAddress.trim()) {
        errs.newCompanyAddress = 'Địa chỉ doanh nghiệp là bắt buộc';
      }
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
      if (start >= end) {
        errs.endDate = 'Ngày kết thúc phải sau ngày bắt đầu';
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
    if (!validate()) {
      showToast('Vui lòng kiểm tra lại các trường thông tin bắt buộc', 'error');
      return;
    }

    setSubmitting(true);

    const payload = {
      position: formData.position.trim(),
      startDate: formData.startDate,
      endDate: formData.endDate,
      registrationNote: formData.registrationNote.trim() || undefined,
      mentorName: formData.mentorName.trim(),
      mentorPosition: formData.mentorPosition.trim(),
      mentorEmail: formData.mentorEmail.trim().toLowerCase(),
      mentorPhone: formData.mentorPhone.trim(),
    };

    if (companyMode === 'existing') {
      payload.companyId = formData.companyId;
    } else {
      payload.newCompany = {
        name: formData.newCompanyName.trim(),
        code: formData.newCompanyCode.trim() || undefined,
        address: formData.newCompanyAddress.trim(),
        email: formData.newCompanyEmail.trim() || undefined,
        phone: formData.newCompanyPhone.trim() || undefined,
        website: formData.newCompanyWebsite.trim() || undefined,
        contactPerson: formData.newCompanyContactPerson.trim() || undefined,
        contactEmail: formData.newCompanyContactEmail.trim() || undefined,
      };
    }

    try {
      const res = await internshipApi.register(payload);
      if (res.success) {
        showToast('Đăng ký thực tập thành công! Hồ sơ đang ở trạng thái PENDING chờ xét duyệt.', 'success');
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
          Quy chế học vụ quy định <strong>1 sinh viên chỉ được tham gia tối đa 1 hồ sơ thực tập đang hoạt động</strong> (PENDING, APPROVED, hoặc INTERNING). Bạn không thể tạo thêm hồ sơ mới trong lúc hồ sơ hiện tại chưa kết thúc hoặc chưa bị từ chối.
        </p>
        <div className="pt-2">
          <Link
            to="/student/internship"
            className="inline-flex items-center gap-2 px-5 py-2.5 bg-indigo-600 hover:bg-indigo-700 text-white text-xs font-semibold rounded-xl shadow-sm transition"
          >
            <Briefcase className="w-4 h-4" />
            <span>Xem hồ sơ thực tập hiện tại</span>
          </Link>
        </div>
      </div>
    );
  }

  const selectedExistingCompany = activeCompanies.find(
    (c) => c._id === formData.companyId,
  );

  return (
    <div className="space-y-6 max-w-4xl mx-auto">
      {/* Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex items-center gap-2 text-indigo-600 font-semibold text-xs tracking-wider uppercase">
          <Briefcase className="w-4 h-4" /> Quy trình Đăng ký TTDN
        </div>
        <h2 className="text-xl font-bold text-slate-900 mt-1">
          Nộp Đơn Đăng Ký Thực Tập Doanh Nghiệp
        </h2>
        <p className="text-xs text-slate-500 mt-0.5">
          Vui lòng kiểm tra thông tin sinh viên và điền đầy đủ chi tiết về đơn vị thực tập
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* SECTION 1: Read-Only Student Info */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center justify-between pb-3 border-b border-slate-100">
            <div className="flex items-center gap-2">
              <Lock className="w-4 h-4 text-slate-400" />
              <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                1. Thông tin Sinh viên (Chỉ đọc từ hệ thống)
              </h3>
            </div>
            <span className="text-[11px] font-semibold text-indigo-600 bg-indigo-50 px-2.5 py-0.5 rounded-full border border-indigo-100">
              Read-Only
            </span>
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
              <span className="font-mono font-bold text-indigo-600 text-sm">
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

        {/* SECTION 2: Company Selection / Entry */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-5">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Building2 className="w-5 h-5 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              2. Thông tin Doanh nghiệp Thực tập
            </h3>
          </div>

          {/* Mode Switcher Tabs */}
          <div className="flex rounded-2xl bg-slate-100 p-1 max-w-md">
            <button
              type="button"
              onClick={() => setCompanyMode('existing')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                companyMode === 'existing'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              Chọn Doanh nghiệp có sẵn ({activeCompanies.length})
            </button>
            <button
              type="button"
              onClick={() => setCompanyMode('new')}
              className={`flex-1 py-2 text-xs font-semibold rounded-xl transition ${
                companyMode === 'new'
                  ? 'bg-white text-indigo-700 shadow-xs'
                  : 'text-slate-500 hover:text-slate-800'
              }`}
            >
              + Nhập Doanh nghiệp mới
            </button>
          </div>

          {/* Mode 1: Select Existing Company */}
          {companyMode === 'existing' ? (
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1.5">
                  Chọn Doanh nghiệp đối tác <span className="text-rose-500">*</span>
                </label>
                <select
                  name="companyId"
                  value={formData.companyId}
                  onChange={handleCompanySelect}
                  className="w-full px-4 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-2xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
                >
                  {activeCompanies.map((comp) => (
                    <option key={comp._id} value={comp._id}>
                      {comp.name} {comp.code ? `(${comp.code})` : ''} - {comp.address}
                    </option>
                  ))}
                </select>
                {errors.companyId && (
                  <p className="text-xs text-rose-500 mt-1">{errors.companyId}</p>
                )}
              </div>

              {/* Auto-filled Company Details Display */}
              {selectedExistingCompany && (
                <div className="p-4 rounded-2xl bg-indigo-50/40 border border-indigo-100/80 space-y-2 text-xs">
                  <div className="text-[11px] font-bold text-indigo-600 uppercase tracking-wider mb-2">
                    Thông tin tự động điền từ hệ thống:
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-slate-700">
                    <div>
                      <span className="text-slate-400 block">Địa chỉ trụ sở:</span>
                      <strong className="text-slate-900">{selectedExistingCompany.address}</strong>
                    </div>
                    {selectedExistingCompany.email && (
                      <div>
                        <span className="text-slate-400 block">Email doanh nghiệp:</span>
                        <strong>{selectedExistingCompany.email}</strong>
                      </div>
                    )}
                    {selectedExistingCompany.phone && (
                      <div>
                        <span className="text-slate-400 block">Số điện thoại:</span>
                        <strong>{selectedExistingCompany.phone}</strong>
                      </div>
                    )}
                    {selectedExistingCompany.contactPerson && (
                      <div>
                        <span className="text-slate-400 block">Người phụ trách DN:</span>
                        <strong>{selectedExistingCompany.contactPerson}</strong>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          ) : (
            /* Mode 2: Enter New Company */
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
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition uppercase font-mono"
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
                  className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                    className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
                  />
                </div>
              </div>
            </div>
          )}
        </div>

        {/* SECTION 3: Internship Position & Dates */}
        <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs space-y-4">
          <div className="flex items-center gap-2 pb-3 border-b border-slate-100">
            <Calendar className="w-5 h-5 text-indigo-600" />
            <h3 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              3. Vị trí & Thời gian Thực tập
            </h3>
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
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition font-medium"
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
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
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
                onChange={handleChange}
                className="w-full px-3.5 py-2.5 text-sm bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition"
              />
              {errors.endDate && (
                <p className="text-xs text-rose-500 mt-1">{errors.endDate}</p>
              )}
            </div>
          </div>

          {/* THÔNG TIN NGƯỜI ĐÁNH GIÁ TẠI DOANH NGHIỆP */}
          <div className="p-5 rounded-2xl bg-slate-50 border border-slate-200/80 space-y-3">
            <div className="flex items-center gap-2 pb-2 border-b border-slate-200/80">
              <UserCheck className="w-4 h-4 text-indigo-600" />
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
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition`}
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
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition`}
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
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition`}
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
                  } rounded-xl focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition`}
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
              Ghi chú / Kế hoạch thực tập mong muốn
            </label>
            <textarea
              name="registrationNote"
              rows={3}
              value={formData.registrationNote}
              onChange={handleChange}
              placeholder="Nguyện vọng, nội dung đề tài thực tập dự kiến tại doanh nghiệp..."
              className="w-full px-3.5 py-2.5 text-xs bg-slate-50 border border-slate-200 rounded-xl focus:bg-white focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition resize-none"
            />
          </div>
        </div>

        {/* Submit Actions */}
        <div className="flex items-center justify-between p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
          <div className="text-xs text-slate-500">
            Hồ sơ sau khi gửi sẽ có trạng thái <strong>PENDING</strong> chờ Trưởng Bộ Môn xét duyệt.
          </div>

          <div className="flex items-center gap-3">
            <Link
              to="/student/internship"
              className="px-4 py-2.5 text-xs font-semibold text-slate-700 hover:bg-slate-100 rounded-xl transition"
            >
              Hủy bỏ
            </Link>

            <button
              type="submit"
              disabled={submitting}
              className="inline-flex items-center gap-2 px-6 py-2.5 bg-indigo-600 hover:bg-indigo-700 active:scale-[0.99] text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-200 transition disabled:opacity-50"
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
