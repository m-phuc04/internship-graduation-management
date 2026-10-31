import React, { useState, useEffect } from 'react';
import Modal from '../common/Modal';
import { useToast } from '../../context/ToastContext';
import { Users, AlertCircle, Sparkles, Pencil, Check } from 'lucide-react';

const CreateCouncilModal = ({
  isOpen,
  onClose,
  onCouncilSaved,
  onCouncilCreated,
  existingCouncilCount = 0,
  councilToEdit = null,
  masterTimeConfig = null,
}) => {
  const isEditMode = !!councilToEdit;
  const defaultRoomNumber = existingCouncilCount + 1;

  const [councilName, setCouncilName] = useState('');
  const [room, setRoom] = useState('');
  const [type, setType] = useState('ORAL'); // 'ORAL' | 'POSTER'
  const [description, setDescription] = useState('');
  const [error, setError] = useState('');

  const { showToast } = useToast();

  useEffect(() => {
    if (isOpen) {
      setError('');
      if (councilToEdit) {
        const cleanName = (councilToEdit.name || '').replace(/\s*\([^)]*\)/g, '').trim();
        setCouncilName(cleanName || councilToEdit.name || '');
        setRoom(councilToEdit.room || '');
        setType(councilToEdit.type || 'ORAL');
        setDescription(councilToEdit.description || '');
      } else {
        const nextNum = existingCouncilCount + 1;
        setCouncilName(`Hội đồng ${nextNum}`);
        setRoom(`P${nextNum}`);
        setType('ORAL');
        setDescription('');
      }
    }
  }, [isOpen, councilToEdit, existingCouncilCount]);

  const validate = () => {
    if (!councilName.trim()) {
      return 'Vui lòng nhập tên hội đồng.';
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
    const saveHandler = onCouncilSaved || onCouncilCreated;

    if (isEditMode) {
      const updatedCouncil = {
        ...councilToEdit,
        name: cleanName || councilName.trim(),
        room: room.trim() || councilToEdit.room || `P${defaultRoomNumber}`,
        type,
        description: description.trim(),
      };
      if (saveHandler) saveHandler(updatedCouncil);
    } else {
      const newCouncil = {
        name: cleanName || councilName.trim(),
        room: room.trim() || `P${existingCouncilCount + 1}`,
        type,
        reportDate: masterTimeConfig?.reportDate || null,
        reportStartTime: masterTimeConfig?.reportStartTime || '08:00',
        reportEndTime: masterTimeConfig?.reportEndTime || '11:30',
        reportTime: masterTimeConfig?.reportTime || '',
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
        {/* Banner */}
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
                ? 'Chỉnh sửa tên phòng và hình thức báo cáo khóa luận'
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
              Tên phòng hội đồng <span className="text-rose-500">*</span>
            </label>
            <input
              type="text"
              required
              value={councilName}
              onChange={(e) => {
                setCouncilName(e.target.value);
                setError('');
              }}
              placeholder="VD: Hội đồng 1, Hội đồng AI..."
              className="w-full px-3.5 py-2.5 bg-white border border-slate-300 rounded-xl text-xs font-semibold text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#123891]/20 focus:border-[#123891]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 mb-1">
              Phòng / Địa điểm họp <span className="text-rose-500">*</span>
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
                <span className="text-[10px] text-slate-400 font-normal block">Bảo vệ trực tiếp (3 Giảng viên)</span>
              </div>
            </label>

            <label
              className={`p-3 rounded-2xl border flex items-center gap-2.5 cursor-pointer transition select-none ${
                type === 'POSTER'
                  ? 'bg-blue-50/80 border-[#123891] ring-2 ring-blue-500/20 text-[#0d2a75] font-bold'
                  : 'bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100'
              }`}
            >
              <input
                type="radio"
                name="councilType"
                value="POSTER"
                checked={type === 'POSTER'}
                onChange={() => setType('POSTER')}
                className="w-4 h-4 text-[#123891] focus:ring-[#123891]"
              />
              <div>
                <span className="text-xs block">Báo cáo Poster</span>
                <span className="text-[10px] text-slate-400 font-normal block">Trưng bày Poster (2 Giảng viên)</span>
              </div>
            </label>
          </div>
        </div>

        {/* Ghi chú */}
        <div>
          <label className="block text-xs font-bold text-slate-700 mb-1">
            Ghi chú
          </label>
          <textarea
            rows={2}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Thêm ghi chú"
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
            className="px-5 py-2.5 bg-[#123891] hover:bg-[#102d7d] text-white text-xs font-bold rounded-xl shadow-md shadow-blue-100 transition cursor-pointer flex items-center gap-1.5"
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
