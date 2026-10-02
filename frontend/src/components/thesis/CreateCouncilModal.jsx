import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import { Users, AlertCircle, Sparkles, Clock, Calendar, Pencil, Check } from 'lucide-react';

const HOURS = ['01', '02', '03', '04', '05', '06', '07', '08', '09', '10', '11', '12'];
const MINUTES = ['00', '05', '10', '15', '20', '25', '30', '35', '40', '45', '50', '55'];

const to24Hour = (hour12, minute, period) => {
  let h = parseInt(hour12 || '8', 10);
  const m = String(minute || '00').padStart(2, '0');
  if (period === 'PM' && h < 12) h += 12;
  if (period === 'AM' && h === 12) h = 0;
  return `${String(h).padStart(2, '0')}:${m}`;
};

const from24Hour = (time24, defaultH = '08', defaultM = '00', defaultP = 'AM') => {
  if (!time24) return { hour: defaultH, minute: defaultM, period: defaultP };
  const [hStr, mStr] = time24.split(':');
  let h = parseInt(hStr, 10);
  if (isNaN(h)) return { hour: defaultH, minute: defaultM, period: defaultP };
  const m = mStr ? mStr.substring(0, 2) : '00';
  let period = 'AM';
  if (h >= 12) {
    period = 'PM';
    if (h > 12) h -= 12;
  }
  if (h === 0) h = 12;
  return {
    hour: String(h).padStart(2, '0'),
    minute: MINUTES.includes(m) ? m : '00',
    period,
  };
};

const CreateCouncilModal = ({
  isOpen,
  onClose,
  onCouncilSaved,
  onCouncilCreated,
  existingCouncilCount = 0,
  councilToEdit = null,
}) => {
  const isEditMode = !!councilToEdit;
  const defaultRoomNumber = existingCouncilCount + 1;

  const [councilName, setCouncilName] = useState('');
  const [room, setRoom] = useState('');
  const [type, setType] = useState('ORAL'); // 'ORAL' | 'POSTER'
  const [reportDate, setReportDate] = useState('');

  // Start Time parts (AM by default)
  const [startHour, setStartHour] = useState('08');
  const [startMinute, setStartMinute] = useState('00');
  const [startPeriod, setStartPeriod] = useState('AM');

  // End Time parts (AM by default)
  const [endHour, setEndHour] = useState('11');
  const [endMinute, setEndMinute] = useState('30');
  const [endPeriod, setEndPeriod] = useState('AM');

  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const { showToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (councilToEdit) {
        const cleanName = (councilToEdit.name || '').replace(/\s*\([^)]*\)/g, '').trim();
        setCouncilName(cleanName || councilToEdit.name || '');
        setRoom(councilToEdit.room || '');
        setType(councilToEdit.type || 'ORAL');
        setReportDate(councilToEdit.reportDate || '');

        const startParsed = from24Hour(councilToEdit.reportStartTime, '08', '00', 'AM');
        setStartHour(startParsed.hour);
        setStartMinute(startParsed.minute);
        setStartPeriod(startParsed.period);

        const endParsed = from24Hour(councilToEdit.reportEndTime, '11', '30', 'AM');
        setEndHour(endParsed.hour);
        setEndMinute(endParsed.minute);
        setEndPeriod(endParsed.period);

        setDescription(councilToEdit.description || '');
      } else {
        const nextNum = existingCouncilCount + 1;
        setCouncilName(`Hội đồng ${nextNum}`);
        setRoom(`P${nextNum}`);
        setType('ORAL');
        setReportDate('');
        setStartHour('08');
        setStartMinute('00');
        setStartPeriod('AM');
        setEndHour('11');
        setEndMinute('30');
        setEndPeriod('AM');
        setDescription('');
      }
    }
  }, [isOpen, councilToEdit, existingCouncilCount]);

  const getStart24 = () => to24Hour(startHour, startMinute, startPeriod);
  const getEnd24 = () => to24Hour(endHour, endMinute, endPeriod);

  const formatReportTimeString = (date, sH, sM, sP, eH, eM, eP) => {
    const s24 = to24Hour(sH, sM, sP);
    const e24 = to24Hour(eH, eM, eP);
    const timePart = `${s24} - ${e24}`;
    if (date) {
      const parts = date.split('-');
      const datePart = parts.length === 3 ? `${parts[2]}/${parts[1]}/${parts[0]}` : date;
      return `${timePart}, ${datePart}`;
    }
    return timePart;
  };

  const validate = () => {
    if (!councilName.trim()) {
      return 'Vui lòng nhập tên hội đồng.';
    }

    if (reportDate) {
      const selected = new Date(reportDate);
      selected.setHours(0, 0, 0, 0);
      const today = new Date();
      today.setHours(0, 0, 0, 0);

      if (selected < today) {
        return 'Ngày báo cáo không hợp lệ: Không được chọn ngày trong quá khứ (phải chọn từ hôm nay trở đi).';
      }
    }

    const s24 = getStart24();
    const e24 = getEnd24();

    if (s24 >= e24) {
      return `Khung giờ báo cáo không hợp lệ: Giờ kết thúc (${endHour}:${endMinute} ${endPeriod}) phải sau giờ bắt đầu (${startHour}:${startMinute} ${startPeriod}).`;
    }

    return '';
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const cleanName = councilName.replace(/\s*\([^)]*\)/g, '').trim();
    const formattedReportTime = formatReportTimeString(
      reportDate,
      startHour,
      startMinute,
      startPeriod,
      endHour,
      endMinute,
      endPeriod
    );

    const s24 = getStart24();
    const e24 = getEnd24();
    const saveHandler = onCouncilSaved || onCouncilCreated;

    if (isEditMode) {
      const updatedCouncil = {
        ...councilToEdit,
        name: cleanName || councilName.trim(),
        room: room.trim() || councilToEdit.room || `P${defaultRoomNumber}`,
        type,
        reportDate,
        reportStartTime: s24,
        reportEndTime: e24,
        startHour,
        startMinute,
        startPeriod,
        endHour,
        endMinute,
        endPeriod,
        reportTime: formattedReportTime,
        description: description.trim(),
      };
      if (saveHandler) saveHandler(updatedCouncil);
    } else {
      const newCouncil = {
        name: cleanName || councilName.trim(),
        room: room.trim() || `P${existingCouncilCount + 1}`,
        type,
        reportDate,
        reportStartTime: s24,
        reportEndTime: e24,
        startHour,
        startMinute,
        startPeriod,
        endHour,
        endMinute,
        endPeriod,
        reportTime: formattedReportTime,
        description: description.trim(),
        lecturers: [],
      };
      if (saveHandler) saveHandler(newCouncil);
    }

    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title={isEditMode ? 'Chỉnh Sửa Thông Tin Hội Đồng' : 'Thêm Phòng Hội Đồng Đánh Giá'}
      maxWidth="max-w-xl"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        <div className="flex items-center gap-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-[#123891] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            {isEditMode ? <Pencil className="w-5 h-5" /> : <Users className="w-5 h-5" />}
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              {isEditMode ? 'Cập Nhật Thông Tin Phòng' : 'Tạo Hội Đồng Mới'}
            </h4>
            <p className="text-[11px] text-slate-500">
              {isEditMode
                ? 'Chỉnh sửa tên phòng, hình thức và thời gian báo cáo khóa luận'
                : 'Thiết lập phòng chấm bảo vệ khóa luận và hình thức báo cáo'}
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Tên Hội Đồng & Phòng */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Tên hội đồng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={councilName}
              onChange={(e) => {
                setCouncilName(e.target.value);
                setError('');
              }}
              placeholder="VD: Hội đồng 1, Hội đồng 2..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Số phòng / Địa điểm <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={room}
              onChange={(e) => {
                setRoom(e.target.value);
                setError('');
              }}
              placeholder={`VD: P${defaultRoomNumber}, Hội trường B...`}
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891]"
            />
          </div>
        </div>

        {/* Hình Thức Đánh Giá (Oral / Poster) */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Hình thức đánh giá / Báo cáo <span className="text-rose-500">*</span>
          </label>
          <div className="grid grid-cols-2 gap-3">
            <label
              className={`p-3 rounded-2xl border flex items-center gap-2.5 cursor-pointer transition select-none ${
                type === 'ORAL'
                  ? 'bg-blue-50/80 border-[#123891] ring-2 ring-blue-500/20 text-[#123891] font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="councilType"
                value="ORAL"
                checked={type === 'ORAL'}
                onChange={() => setType('ORAL')}
                className="w-4 h-4 text-[#123891] focus:ring-[#123891]"
              />
              <div>
                <span className="text-xs block">Báo cáo Oral</span>
                <span className="text-[10px] text-slate-400 font-normal block">Bảo vệ trực tiếp</span>
              </div>
            </label>

            <label
              className={`p-3 rounded-2xl border flex items-center gap-2.5 cursor-pointer transition select-none ${
                type === 'POSTER'
                  ? 'bg-purple-50/80 border-purple-500 ring-2 ring-purple-500/20 text-purple-900 font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="councilType"
                value="POSTER"
                checked={type === 'POSTER'}
                onChange={() => setType('POSTER')}
                className="w-4 h-4 text-purple-600 focus:ring-purple-500"
              />
              <div>
                <span className="text-xs block">Báo cáo Poster</span>
                <span className="text-[10px] text-slate-400 font-normal block">Trưng bày Poster</span>
              </div>
            </label>
          </div>
        </div>

        {/* Thời gian & Ngày báo cáo */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Clock className="w-4 h-4 text-[#123891]" />
              <span>Thời gian & Ngày báo cáo</span>
            </label>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-mono shadow-2xs self-start sm:self-auto">
              {formatReportTimeString(reportDate, startHour, startMinute, startPeriod, endHour, endMinute, endPeriod)}
            </span>
          </div>

          {/* Ngày báo cáo */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1 flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5 text-slate-400" />
              <span>Ngày báo cáo</span>
            </label>
            <input
              type="date"
              min={todayStr}
              value={reportDate}
              onChange={(e) => {
                setReportDate(e.target.value);
                setError('');
              }}
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-medium text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition"
            />
          </div>

          {/* Khung giờ: 2 Dòng riêng biệt rộng rãi, không bao giờ bị lệch */}
          <div className="space-y-2.5 pt-1 border-t border-slate-200/60">
            {/* Dòng 1: Thời gian bắt đầu (Từ giờ) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-200 rounded-2xl gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-[#123891] shrink-0" />
                <span className="text-xs font-bold text-slate-800">
                  Thời gian bắt đầu (Từ giờ):
                </span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <select
                  value={startHour}
                  onChange={(e) => {
                    setStartHour(e.target.value);
                    setError('');
                  }}
                  className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] cursor-pointer"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{h}h</option>
                  ))}
                </select>

                <span className="font-bold text-slate-400 text-sm">:</span>

                <select
                  value={startMinute}
                  onChange={(e) => {
                    setStartMinute(e.target.value);
                    setError('');
                  }}
                  className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] cursor-pointer"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>{m}p</option>
                  ))}
                </select>

                <div className="inline-flex p-0.5 bg-slate-200/90 rounded-xl border border-slate-300 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setStartPeriod('AM');
                      setError('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      startPeriod === 'AM'
                        ? 'bg-[#123891] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartPeriod('PM');
                      setError('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      startPeriod === 'PM'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>

            {/* Dòng 2: Thời gian kết thúc (Đến giờ) */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-200 rounded-2xl gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-purple-600 shrink-0" />
                <span className="text-xs font-bold text-slate-800">
                  Thời gian kết thúc (Đến giờ):
                </span>
              </div>

              <div className="flex items-center gap-2 self-end sm:self-auto">
                <select
                  value={endHour}
                  onChange={(e) => {
                    setEndHour(e.target.value);
                    setError('');
                  }}
                  className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] cursor-pointer"
                >
                  {HOURS.map((h) => (
                    <option key={h} value={h}>{h}h</option>
                  ))}
                </select>

                <span className="font-bold text-slate-400 text-sm">:</span>

                <select
                  value={endMinute}
                  onChange={(e) => {
                    setEndMinute(e.target.value);
                    setError('');
                  }}
                  className="w-16 px-2 py-1.5 bg-slate-50 border border-slate-300 rounded-xl text-xs font-bold font-mono text-slate-900 text-center focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] cursor-pointer"
                >
                  {MINUTES.map((m) => (
                    <option key={m} value={m}>{m}p</option>
                  ))}
                </select>

                <div className="inline-flex p-0.5 bg-slate-200/90 rounded-xl border border-slate-300 text-xs shrink-0">
                  <button
                    type="button"
                    onClick={() => {
                      setEndPeriod('AM');
                      setError('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      endPeriod === 'AM'
                        ? 'bg-[#123891] text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    AM
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEndPeriod('PM');
                      setError('');
                    }}
                    className={`px-2.5 py-1 rounded-lg text-xs font-extrabold transition cursor-pointer ${
                      endPeriod === 'PM'
                        ? 'bg-purple-700 text-white shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    PM
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Ghi chú */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Ghi chú (Tùy chọn)
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Ghi chú về thời gian, phòng họp hoặc quy định đặc biệt..."
            className="w-full p-2.5 bg-white border border-slate-300 rounded-xl text-xs focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] resize-none"
          />
        </div>

        {/* Actions */}
        <div className="flex items-center justify-end gap-2.5 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 text-xs font-semibold text-slate-600 hover:bg-slate-100 rounded-xl transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            className="px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-md shadow-indigo-100 transition cursor-pointer flex items-center gap-1.5"
          >
            {isEditMode ? (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Lưu thay đổi</span>
              </>
            ) : (
              <>
                <Sparkles className="w-3.5 h-3.5" />
                <span>Tạo hội đồng</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default CreateCouncilModal;
