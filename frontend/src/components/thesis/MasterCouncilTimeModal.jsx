import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import { Clock, Calendar, AlertCircle, Check, Sparkles } from 'lucide-react';

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

const MasterCouncilTimeModal = ({
  isOpen,
  onClose,
  initialDate = '',
  initialStartTime = '08:00',
  initialEndTime = '11:30',
  onSave,
}) => {
  const [reportDate, setReportDate] = useState('');
  const [startHour, setStartHour] = useState('08');
  const [startMinute, setStartMinute] = useState('00');
  const [startPeriod, setStartPeriod] = useState('AM');

  const [endHour, setEndHour] = useState('11');
  const [endMinute, setEndMinute] = useState('30');
  const [endPeriod, setEndPeriod] = useState('AM');

  const [error, setError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const { showToast } = useToast();

  const todayStr = new Date().toISOString().split('T')[0];

  useEffect(() => {
    if (isOpen) {
      setError('');
      setReportDate(initialDate || '');

      const sParsed = from24Hour(initialStartTime, '08', '00', 'AM');
      setStartHour(sParsed.hour);
      setStartMinute(sParsed.minute);
      setStartPeriod(sParsed.period);

      const eParsed = from24Hour(initialEndTime, '11', '30', 'AM');
      setEndHour(eParsed.hour);
      setEndMinute(eParsed.minute);
      setEndPeriod(eParsed.period);
    }
  }, [isOpen, initialDate, initialStartTime, initialEndTime]);

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
    if (!reportDate) {
      return 'Vui lòng chọn ngày báo cáo hội đồng.';
    }

    const selected = new Date(reportDate);
    selected.setHours(0, 0, 0, 0);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    if (selected < today) {
      return 'Ngày báo cáo không hợp lệ: Không được chọn ngày trong quá khứ (phải từ hôm nay trở đi).';
    }

    const s24 = getStart24();
    const e24 = getEnd24();

    if (s24 >= e24) {
      return `Khung giờ không hợp lệ: Giờ kết thúc (${endHour}:${endMinute} ${endPeriod}) phải sau giờ bắt đầu (${startHour}:${startMinute} ${startPeriod}).`;
    }

    return '';
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const validationError = validate();
    if (validationError) {
      setError(validationError);
      return;
    }

    const s24 = getStart24();
    const e24 = getEnd24();
    const formatted = formatReportTimeString(
      reportDate,
      startHour,
      startMinute,
      startPeriod,
      endHour,
      endMinute,
      endPeriod
    );

    setSubmitting(true);
    try {
      await onSave({
        reportDate,
        reportStartTime: s24,
        reportEndTime: e24,
        reportTime: formatted,
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Lỗi khi cập nhật thời gian báo cáo');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Thiết Lập Thời Gian Báo Cáo Hội Đồng"
      maxWidth="max-w-lg"
    >
      <form onSubmit={handleSubmit} className="space-y-4 text-xs">
        {/* Banner Info */}
        <div className="flex items-center gap-3 p-3.5 bg-blue-50/70 border border-blue-200/80 rounded-2xl">
          <div className="w-10 h-10 rounded-xl bg-[#123891] text-white flex items-center justify-center font-bold shrink-0 shadow-xs">
            <Clock className="w-5 h-5" />
          </div>
          <div>
            <h4 className="font-bold text-slate-900 text-sm">
              Thời Gian Báo Cáo Chung
            </h4>
            <p className="text-[11px] text-slate-500">
              Thiết lập ngày và khung giờ áp dụng đồng loạt cho tất cả các phòng hội đồng trong đợt báo cáo này.
            </p>
          </div>
        </div>

        {error && (
          <div className="p-3 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs flex items-center gap-2">
            <AlertCircle className="w-4 h-4 shrink-0 text-rose-600" />
            <span className="font-medium">{error}</span>
          </div>
        )}

        {/* Form Body */}
        <div className="p-4 bg-slate-50 border border-slate-200 rounded-2xl space-y-3.5">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
            <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
              <Calendar className="w-4 h-4 text-[#123891]" />
              <span>Thời gian & Ngày báo cáo</span>
            </label>
            <span className="text-[10px] font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-lg border border-blue-200 font-mono shadow-2xs self-start sm:self-auto">
              {formatReportTimeString(reportDate, startHour, startMinute, startPeriod, endHour, endMinute, endPeriod)}
            </span>
          </div>

          {/* Ngày báo cáo */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-700 mb-1">
              Ngày báo cáo hội đồng <span className="text-rose-500">*</span>
            </label>
            <input
              type="date"
              min={todayStr}
              value={reportDate}
              onChange={(e) => {
                setReportDate(e.target.value);
                setError('');
              }}
              required
              className="w-full px-3.5 py-2 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891] transition cursor-pointer"
            />
          </div>

          {/* Khung giờ: Bắt đầu & Kết thúc */}
          <div className="space-y-2.5 pt-1 border-t border-slate-200/60">
            {/* Giờ bắt đầu */}
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

                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setStartPeriod('AM');
                      setError('');
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      startPeriod === 'AM'
                        ? 'bg-[#123891] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sáng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setStartPeriod('PM');
                      setError('');
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      startPeriod === 'PM'
                        ? 'bg-[#123891] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Chiều
                  </button>
                </div>
              </div>
            </div>

            {/* Giờ kết thúc */}
            <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3 bg-white border border-slate-200 rounded-2xl gap-2.5 shadow-2xs">
              <div className="flex items-center gap-2">
                <span className="w-2 h-2 rounded-full bg-emerald-600 shrink-0" />
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

                <div className="flex bg-slate-100 p-0.5 rounded-xl border border-slate-200">
                  <button
                    type="button"
                    onClick={() => {
                      setEndPeriod('AM');
                      setError('');
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      endPeriod === 'AM'
                        ? 'bg-[#123891] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Sáng
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setEndPeriod('PM');
                      setError('');
                    }}
                    className={`px-2 py-1 rounded-lg text-[10px] font-bold transition cursor-pointer ${
                      endPeriod === 'PM'
                        ? 'bg-[#123891] text-white shadow-2xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    Chiều
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Buttons */}
        <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
          <button
            type="button"
            onClick={onClose}
            disabled={submitting}
            className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold rounded-xl transition cursor-pointer"
          >
            Hủy
          </button>
          <button
            type="submit"
            disabled={submitting}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#123891] hover:bg-[#102d7d] text-white font-bold rounded-xl shadow-xs transition cursor-pointer disabled:opacity-50"
          >
            {submitting ? (
              <>
                <span className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Đang lưu...</span>
              </>
            ) : (
              <>
                <Check className="w-3.5 h-3.5" />
                <span>Xác nhận cập nhật</span>
              </>
            )}
          </button>
        </div>
      </form>
    </Modal>
  );
};

export default MasterCouncilTimeModal;
