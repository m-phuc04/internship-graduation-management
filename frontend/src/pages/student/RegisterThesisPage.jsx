import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import thesisApi from '../../api/thesisApi';
import { useToast } from '../../context/ToastContext';
import { useAuth } from '../../context/AuthContext';
import LoadingSkeleton from '../../components/common/LoadingSkeleton';
import EmptyState from '../../components/common/EmptyState';
import SearchInput from '../../components/common/SearchInput';

import {
  GraduationCap,
  Users,
  User,
  CheckCircle2,
  AlertCircle,
  Clock,
  BookOpen,
  ShieldAlert,
  Check,
  X,
} from 'lucide-react';

const RegisterThesisPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();

  // SV1 (Current Student)
  const [student1, setStudent1] = useState(null);
  const [loadingStudent1, setLoadingStudent1] = useState(true);
  const [existingThesis, setExistingThesis] = useState(null);

  // ==========================================
  // APPROVED TOPICS (FIFO SELECTION)
  // ==========================================
  const [approvedTopics, setApprovedTopics] = useState([]);
  const [loadingApprovedTopics, setLoadingApprovedTopics] = useState(false);
  const [topicSearch, setTopicSearch] = useState('');
  const [selectedTopicForRegistration, setSelectedTopicForRegistration] = useState(null);
  const [registerTopicModalOpen, setRegisterTopicModalOpen] = useState(false);
  const [topicStudentCount, setTopicStudentCount] = useState(1);
  const [topicSv2Code, setTopicSv2Code] = useState('');
  const [topicStudent2, setTopicStudent2] = useState(null);
  const [topicSv2Error, setTopicSv2Error] = useState('');
  const [registeringTopic, setRegisteringTopic] = useState(false);
  const [topicSearchResults, setTopicSearchResults] = useState([]);
  const [searchingStudents, setSearchingStudents] = useState(false);

  // Helper to format Date of Birth
  const formatDOB = (dob) => {
    if (!dob) return '—';
    try {
      const d = new Date(dob);
      if (isNaN(d.getTime())) return '—';
      return d.toLocaleDateString('vi-VN', {
        day: '2-digit',
        month: '2-digit',
        year: 'numeric',
      });
    } catch {
      return '—';
    }
  };

  // Helper to format Lecturer Title nicely (prevents "TS. TS.")
  const formatLecturerDisplay = (title, name) => {
    if (!name) return 'Chưa cập nhật';
    const trimmedName = name.trim();
    if (!title) return trimmedName;
    const trimmedTitle = title.trim();
    if (trimmedName.toLowerCase().startsWith(trimmedTitle.toLowerCase())) {
      return trimmedName;
    }
    return `${trimmedTitle} ${trimmedName}`;
  };

  // 1. Fetch Current Student Info & Check for existing Thesis
  const fetchStudentProfile = useCallback(async () => {
    setLoadingStudent1(true);
    try {
      const myThesisRes = await thesisApi.getMyThesis();
      if (myThesisRes.success) {
        setStudent1(myThesisRes.student);
        if (myThesisRes.data && !['REJECTED'].includes(myThesisRes.data.status)) {
          setExistingThesis(myThesisRes.data);
        } else {
          setExistingThesis(null);
        }
      }
    } catch (err) {
      console.warn('Student profile fetch error:', err.message);
    } finally {
      setLoadingStudent1(false);
    }
  }, []);

  // 2. Fetch Approved Topics
  const fetchApprovedTopics = useCallback(async () => {
    setLoadingApprovedTopics(true);
    try {
      const res = await thesisApi.getApprovedTopics({
        search: topicSearch,
      });
      if (res.success) {
        setApprovedTopics(res.data || []);
      }
    } catch (err) {
      console.warn('Cannot fetch approved topics:', err.message);
    } finally {
      setLoadingApprovedTopics(false);
    }
  }, [topicSearch]);

  useEffect(() => {
    fetchStudentProfile();
  }, [fetchStudentProfile]);

  useEffect(() => {
    fetchApprovedTopics();
  }, [fetchApprovedTopics]);

  // Search students from DB in real time
  const handleSearchTopicStudents = async (keyword) => {
    setTopicSv2Code(keyword);
    setTopicSv2Error('');
    if (!keyword || !keyword.trim()) {
      setTopicSearchResults([]);
      return;
    }

    setSearchingStudents(true);
    try {
      const res = await thesisApi.searchStudents({ query: keyword.trim() });
      if (res.success) {
        setTopicSearchResults(res.data || []);
      }
    } catch (err) {
      console.warn('Student search error:', err.message);
    } finally {
      setSearchingStudents(false);
    }
  };

  const handleSelectPartner = (student) => {
    if (student.isInActiveThesis) {
      setTopicSv2Error(`Sinh viên ${student.fullName} (${student.studentCode}) đã tham gia đề tài khác!`);
      return;
    }
    setTopicStudent2(student);
    setTopicSv2Code(student.studentCode);
    setTopicSearchResults([]);
    setTopicSv2Error('');
    showToast(`Đã chọn thành viên nhóm: ${student.fullName}`, 'success');
  };

  // Submit Topic Selection
  const handleConfirmTopicRegistration = async () => {
    if (!selectedTopicForRegistration) return;
    if (existingThesis) {
      showToast('Bạn đã có đề tài khóa luận đang hoạt động trong hệ thống!', 'error');
      return;
    }
    if (topicStudentCount === 2 && !topicStudent2) {
      showToast('Vui lòng chọn hoặc tra cứu thông tin Sinh viên 2', 'warning');
      return;
    }

    setRegisteringTopic(true);
    try {
      const payload = {
        studentCount: topicStudentCount,
        secondStudentId: topicStudentCount === 2 ? topicStudent2?._id : null,
        secondStudentCode: topicStudentCount === 2 ? topicStudent2?.studentCode : null,
      };

      const res = await thesisApi.registerTopic(selectedTopicForRegistration._id, payload);
      if (res.success) {
        showToast(
          `Đăng ký đề tài "${selectedTopicForRegistration.title}" thành công! Đang chờ Giảng viên hướng dẫn xác nhận.`,
          'success',
        );
        setRegisterTopicModalOpen(false);
        setSelectedTopicForRegistration(null);
        navigate('/student/thesis');
      }
    } catch (err) {
      showToast(err.message || 'Đăng ký đề tài thất bại', 'error');
      fetchApprovedTopics();
    } finally {
      setRegisteringTopic(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Top Header Banner */}
      <div className="p-6 rounded-3xl bg-white border border-slate-200/80 shadow-2xs">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="flex items-center gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-50 text-[#123891] flex items-center justify-center font-bold text-xl shadow-xs shrink-0">
              <GraduationCap className="w-7 h-7" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 leading-tight">
                Đăng Ký Đề Tài Khóa Luận Tốt Nghiệp (KLTN)
              </h1>
              <p className="text-xs text-slate-500 mt-1">
                Lựa chọn và đăng ký danh sách đề tài KLTN do Giảng viên đề xuất theo nguyên tắc thời gian (FIFO).
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <span className="text-xs font-bold px-3.5 py-2 rounded-xl bg-blue-50 text-[#123891] border border-blue-200/80 shadow-2xs flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#123891]" />
              Nguyên tắc đăng ký: FIFO (Ưu tiên theo thời gian)
            </span>
          </div>
        </div>
      </div>

      {/* Existing Active Thesis Warning */}
      {existingThesis && (
        <div className="p-4 rounded-2xl bg-amber-50 border border-amber-200 text-amber-950 text-xs flex items-start gap-3">
          <ShieldAlert className="w-5 h-5 text-amber-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold text-sm">Bạn đã có đề tài khóa luận đang hoạt động!</div>
            <div className="mt-0.5 leading-relaxed text-slate-700">
              Đề tài: <strong>"{existingThesis.thesisTitle}"</strong> • Trạng thái:{' '}
              <span className="font-bold text-[#123891]">{existingThesis.status}</span>.
              Theo quy chế đào tạo, mỗi sinh viên chỉ được tham gia 1 đề tài KLTN trong học kỳ.
            </div>
          </div>
        </div>
      )}

      {/* APPROVED TOPICS LIST */}
      <div className="space-y-4">
        {/* Search & Counter bar */}
        <div className="p-4 rounded-3xl bg-white border border-slate-200/80 shadow-2xs flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="w-full sm:w-96">
            <SearchInput
              value={topicSearch}
              onChange={(val) => setTopicSearch(val)}
              placeholder="Tìm tên đề tài, GVHD, mã GV..."
            />
          </div>
          <div className="text-xs text-slate-500 font-medium">
            Hiển thị <strong>{approvedTopics.length}</strong> đề tài có sẵn
          </div>
        </div>

        {/* Table */}
        <div className="bg-white rounded-3xl border border-slate-200/80 shadow-2xs overflow-hidden">
          {loadingApprovedTopics ? (
            <div className="p-6">
              <LoadingSkeleton rows={5} cols={6} />
            </div>
          ) : approvedTopics.length === 0 ? (
            <div className="p-8">
              <EmptyState
                title="Chưa có đề tài nào được duyệt"
                description="Khi Giảng viên đề xuất đề tài và được Trưởng Bộ Môn (TBM) phê duyệt, danh sách sẽ hiển thị tại đây để bạn đăng ký."
              />
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-slate-50/80 text-slate-500 font-semibold border-b border-slate-200/80 uppercase text-[10px] tracking-wider">
                    <th className="py-3.5 px-4 text-center w-12">STT</th>
                    <th className="py-3.5 px-4">Tên đề tài KLTN</th>
                    <th className="py-3.5 px-4">Giáo viên hướng dẫn</th>
                    <th className="py-3.5 px-4 text-center">Số lượng nhóm</th>
                    <th className="py-3.5 px-4">Mô tả / Yêu cầu</th>
                    <th className="py-3.5 px-4">Trạng thái</th>
                    <th className="py-3.5 px-4 text-right">Thao tác</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {approvedTopics.map((topic, idx) => {
                    const currentCount = topic.currentGroups || topic.registeredGroups?.length || 0;
                    const maxCount = topic.maxGroups || 1;
                    const isFull = topic.isFull || currentCount >= maxCount;

                    return (
                      <tr key={topic._id} className="hover:bg-slate-50/80 transition">
                        <td className="py-3.5 px-4 text-center font-medium text-slate-500">
                          {idx + 1}
                        </td>

                        <td className="py-3.5 px-4 min-w-[240px] max-w-sm">
                          <div className="font-bold text-slate-900 leading-snug">
                            {topic.title}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          <div className="font-semibold text-slate-900">
                            {formatLecturerDisplay(
                              topic.supervisor?.academicTitle || topic.supervisorId?.academicTitle,
                              topic.supervisor?.fullName || topic.supervisorId?.userId?.fullName
                            )}
                          </div>
                          <div className="text-[10px] text-slate-500 font-mono mt-0.5">
                            Mã GV: {topic.supervisor?.lecturerCode || topic.supervisorId?.lecturerCode || '—'}
                          </div>
                        </td>

                        <td className="py-3.5 px-4 text-center whitespace-nowrap">
                          <span className="inline-flex items-center px-2.5 py-1 rounded-lg text-xs font-bold font-mono bg-blue-50 text-blue-700 border border-blue-200">
                            {currentCount} / {maxCount}
                          </span>
                        </td>

                        <td className="py-3.5 px-4 max-w-xs">
                          <p className="text-slate-600 line-clamp-2 text-xs">
                            {topic.description || <span className="text-slate-400 italic">Không có mô tả</span>}
                          </p>
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap">
                          {isFull ? (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-rose-100 text-rose-800">
                              Đã đủ nhóm
                            </span>
                          ) : (
                            <span className="inline-flex items-center px-2.5 py-1 rounded-full text-[11px] font-semibold bg-emerald-100 text-emerald-800">
                              Còn {maxCount - currentCount} chỗ
                            </span>
                          )}
                        </td>

                        <td className="py-3.5 px-4 whitespace-nowrap text-right">
                          <button
                            type="button"
                            disabled={isFull || !!existingThesis}
                            onClick={() => {
                              setSelectedTopicForRegistration(topic);
                              setTopicStudentCount(1);
                              setTopicStudent2(null);
                              setTopicSv2Code('');
                              setTopicSv2Error('');
                              setTopicSearchResults([]);
                              setRegisterTopicModalOpen(true);
                            }}
                            className={`px-3.5 py-1.5 rounded-xl font-bold text-xs transition cursor-pointer shadow-xs ${
                              isFull || existingThesis
                                ? 'bg-slate-100 text-slate-400 border border-slate-200 cursor-not-allowed shadow-none'
                                : 'bg-[#123891] hover:bg-blue-700 text-white'
                            }`}
                            title={
                              isFull
                                ? 'Đề tài đã đủ số lượng nhóm đăng ký'
                                : existingThesis
                                ? 'Bạn đã có đề tài khóa luận trong kỳ'
                                : 'Đăng ký đề tài này theo nguyên tắc FIFO'
                            }
                          >
                            {isFull ? 'Đã đủ nhóm' : 'Chọn đề tài'}
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
      </div>

      {/* ========================================================================= */}
      {/* MODAL: REGISTER SELECTED APPROVED TOPIC */}
      {/* ========================================================================= */}
      {registerTopicModalOpen && selectedTopicForRegistration && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/60 backdrop-blur-xs animate-in fade-in duration-150">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-slate-100 space-y-4 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-blue-50 text-[#123891] flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-5 h-5" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">Xác nhận chọn Đề tài KLTN</h3>
                  <p className="text-xs text-slate-500">Áp dụng thứ tự ưu tiên đăng ký</p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setRegisterTopicModalOpen(false)}
                className="p-1.5 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Topic Info Card */}
            <div className="p-4 rounded-2xl bg-blue-50/60 border border-blue-200/80 text-xs space-y-2">
              <div className="font-bold text-slate-900 text-sm leading-snug">{selectedTopicForRegistration.title}</div>
              <div className="grid grid-cols-2 gap-2 text-slate-700 pt-1 border-t border-blue-200/50">
                <div>
                  <span className="text-slate-400 block text-[10px]">Giảng viên hướng dẫn:</span>
                  <strong className="text-slate-900">
                    {formatLecturerDisplay(
                      selectedTopicForRegistration.supervisor?.academicTitle || selectedTopicForRegistration.supervisorId?.academicTitle,
                      selectedTopicForRegistration.supervisor?.fullName || selectedTopicForRegistration.supervisorId?.userId?.fullName
                    )}
                  </strong>
                </div>
                <div>
                  <span className="text-slate-400 block text-[10px]">Mã GV:</span>
                  <strong className="font-mono text-[#102d7d] bg-white px-2 py-0.5 rounded border border-blue-200 inline-block mt-0.5">
                    {selectedTopicForRegistration.supervisor?.lecturerCode || selectedTopicForRegistration.supervisorId?.lecturerCode || '—'}
                  </strong>
                </div>
              </div>
              <div className="text-blue-800 text-[11px] font-semibold">
                Chỉ tiêu: {selectedTopicForRegistration.currentGroups || selectedTopicForRegistration.registeredGroups?.length || 0} / {selectedTopicForRegistration.maxGroups} nhóm
              </div>
            </div>

            {/* Member count choice */}
            <div className="space-y-3">
              <label className="block text-xs font-bold text-slate-800">
                Số lượng sinh viên tham gia nhóm:
              </label>
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setTopicStudentCount(1);
                    setTopicStudent2(null);
                    setTopicSv2Code('');
                    setTopicSv2Error('');
                    setTopicSearchResults([]);
                  }}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    topicStudentCount === 1
                      ? 'bg-blue-50 border-[#123891] text-[#123891]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <User className="w-4 h-4" />
                  <span>1 Sinh viên (Cá nhân)</span>
                </button>

                <button
                  type="button"
                  onClick={() => setTopicStudentCount(2)}
                  className={`p-3 rounded-xl border text-xs font-bold transition flex items-center justify-center gap-2 cursor-pointer ${
                    topicStudentCount === 2
                      ? 'bg-blue-50 border-[#123891] text-[#123891]'
                      : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
                  }`}
                >
                  <Users className="w-4 h-4" />
                  <span>2 Sinh viên (Nhóm)</span>
                </button>
              </div>
            </div>

            {/* Student 1 Info */}
            <div className="p-3 bg-slate-50 rounded-xl border border-slate-200 text-xs">
              <span className="text-[10px] text-slate-400 block uppercase font-bold">Sinh viên 1 (Bạn):</span>
              <div className="font-bold text-slate-900 mt-0.5 flex items-center gap-2 flex-wrap">
                <span>{student1?.userId?.fullName}</span>
                <span className="font-mono text-blue-700 bg-blue-50 border border-blue-200 px-1.5 py-0.5 rounded text-[11px]">
                  ({student1?.studentCode})
                </span>
                <span className="text-slate-500 font-normal text-[11px]">
                  • Lớp: {student1?.className} • Ngành: {student1?.major || 'Công nghệ Thông tin'}
                </span>
              </div>
            </div>

            {/* Student 2 Selection (if 2 students) */}
            {topicStudentCount === 2 && (
              <div className="space-y-2">
                <label className="block text-xs font-bold text-slate-700">
                  Tìm kiếm & Chọn Sinh viên 2 (Nhập MSSV hoặc Họ tên) <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <input
                    type="text"
                    value={topicSv2Code}
                    onChange={(e) => handleSearchTopicStudents(e.target.value)}
                    placeholder="Gõ MSSV (VD: 22635201...) hoặc họ tên để tìm kiếm..."
                    className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-xs text-slate-900 focus:bg-white focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition"
                  />
                  {searchingStudents && (
                    <span className="absolute right-3 top-3 text-[11px] text-blue-600 font-medium animate-pulse">
                      Đang tìm...
                    </span>
                  )}
                </div>

                {/* Live Database Search Results */}
                {topicSearchResults.length > 0 && (
                  <div className="max-h-48 overflow-y-auto space-y-1.5 p-2 bg-slate-50 border border-slate-200 rounded-2xl shadow-inner">
                    <div className="text-[10px] font-bold text-slate-400 uppercase px-1">
                      Kết quả tìm kiếm ({topicSearchResults.length} sinh viên):
                    </div>
                    {topicSearchResults.map((st) => {
                      const isSelected = topicStudent2?._id === st._id;
                      return (
                        <div
                          key={st._id}
                          onClick={() => !st.isInActiveThesis && handleSelectPartner(st)}
                          className={`p-2.5 rounded-xl border text-xs flex flex-col sm:flex-row sm:items-center justify-between gap-2 transition ${
                            st.isInActiveThesis
                              ? 'bg-slate-100 border-slate-200 text-slate-400 cursor-not-allowed opacity-60'
                              : isSelected
                              ? 'bg-blue-50 border-[#123891] text-[#123891] shadow-xs cursor-pointer'
                              : 'bg-white border-slate-200 hover:bg-blue-50/40 hover:border-blue-200 cursor-pointer text-slate-800'
                          }`}
                        >
                          <div className="flex items-start gap-2.5 min-w-0">
                            <input
                              type="radio"
                              name="selectedPartner"
                              checked={isSelected}
                              disabled={st.isInActiveThesis}
                              onChange={() => handleSelectPartner(st)}
                              className="accent-[#123891] mt-1 shrink-0"
                            />
                            <div className="min-w-0">
                              <div className="flex items-center gap-2 flex-wrap">
                                <strong className="text-slate-900 font-bold text-xs">{st.fullName}</strong>
                                <span className="text-[10px] font-mono font-bold text-blue-700 bg-blue-50 px-1.5 py-0.5 rounded border border-blue-200">
                                  MSSV: {st.studentCode}
                                </span>
                              </div>
                              <div className="text-[11px] text-slate-500 mt-0.5 flex items-center gap-2 flex-wrap">
                                <span>📅 Ngày sinh: <strong>{formatDOB(st.dateOfBirth)}</strong></span>
                                <span>•</span>
                                <span>🎓 Ngành: <strong>{st.major || 'Công nghệ Thông tin'}</strong></span>
                                <span>•</span>
                                <span>Lớp: {st.className}</span>
                              </div>
                            </div>
                          </div>

                          <div className="self-end sm:self-center shrink-0">
                            {st.isInActiveThesis ? (
                              <span className="text-[10px] font-semibold text-rose-600 bg-rose-50 border border-rose-200 px-2 py-0.5 rounded">
                                Đã có đề tài
                              </span>
                            ) : isSelected ? (
                              <span className="text-[10px] font-bold text-blue-700 bg-blue-100 px-2.5 py-1 rounded-lg flex items-center gap-1">
                                <Check className="w-3 h-3" /> Đã chọn
                              </span>
                            ) : (
                              <span className="text-[10px] font-bold text-emerald-700 bg-emerald-50 border border-emerald-200 px-2.5 py-1 rounded-lg">
                                Chọn
                              </span>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}

                {topicSv2Error && (
                  <div className="text-[11px] text-rose-600 bg-rose-50 p-2.5 rounded-xl border border-rose-200">
                    {topicSv2Error}
                  </div>
                )}

                {/* Selected Partner Card */}
                {topicStudent2 && (
                  <div className="p-3.5 bg-emerald-50/80 border border-emerald-200 rounded-2xl text-xs text-emerald-950 space-y-1.5">
                    <div className="flex items-center justify-between">
                      <span className="text-[10px] text-emerald-800 font-extrabold uppercase tracking-wider flex items-center gap-1.5">
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
                        THÀNH VIÊN ĐÃ CHỌN (SINH VIÊN 2)
                      </span>
                      <button
                        type="button"
                        onClick={() => {
                          setTopicStudent2(null);
                          setTopicSv2Code('');
                          setTopicSearchResults([]);
                        }}
                        className="text-xs text-rose-600 font-bold hover:underline cursor-pointer"
                      >
                        Bỏ chọn
                      </button>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 pt-1 border-t border-emerald-200/60">
                      <div>
                        <span className="text-[10px] text-emerald-700 block">Họ và tên:</span>
                        <strong className="text-slate-900 text-xs">{topicStudent2.fullName}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 block">Mã số SV (MSSV):</span>
                        <strong className="font-mono text-blue-700 text-xs">{topicStudent2.studentCode}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 block">Ngày tháng năm sinh:</span>
                        <strong className="text-slate-800 text-xs">{formatDOB(topicStudent2.dateOfBirth)}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 block">Ngành học:</span>
                        <strong className="text-slate-800 text-xs">{topicStudent2.major || 'Công nghệ Thông tin'}</strong>
                      </div>
                      <div>
                        <span className="text-[10px] text-emerald-700 block">Lớp:</span>
                        <strong className="text-slate-800 text-xs">{topicStudent2.className}</strong>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setRegisterTopicModalOpen(false)}
                className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
              >
                Hủy
              </button>

              <button
                type="button"
                disabled={registeringTopic || (topicStudentCount === 2 && !topicStudent2)}
                onClick={handleConfirmTopicRegistration}
                className="px-5 py-2.5 text-xs font-bold text-white bg-[#123891] hover:bg-blue-700 disabled:opacity-50 rounded-xl transition cursor-pointer shadow-sm"
              >
                {registeringTopic ? 'Đang đăng ký...' : 'Xác nhận đăng ký'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default RegisterThesisPage;
