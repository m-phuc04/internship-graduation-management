import React, { useState } from 'react';
import { useUserProfile } from '../../context/UserProfileContext';

/**
 * Thành phần hiển thị Họ tên / Ảnh đại diện người dùng có thể nhấp để xem thông tin chi tiết
 */
const UserNameClickable = ({
  user,
  name,
  subtitle,
  showAvatar = true,
  avatarSize = 'w-7 h-7',
  className = '',
  children,
}) => {
  const { openUserProfile } = useUserProfile();

  const displayName =
    name ||
    user?.fullName ||
    user?.user?.fullName ||
    (user?.academicTitle ? `${user.academicTitle} ${user.fullName || ''}` : '') ||
    'Người dùng';

  const avatarUrl = user?.avatar || user?.user?.avatar;
  const initial = displayName ? displayName.charAt(0).toUpperCase() : 'U';
  const [imgError, setImgError] = useState(false);

  const handleClick = (e) => {
    e.stopPropagation();
    openUserProfile(user);
  };

  if (children) {
    return (
      <span
        onClick={handleClick}
        className={`cursor-pointer hover:text-[#123891] transition-colors ${className}`}
        title={`Xem hồ sơ ${displayName}`}
      >
        {children}
      </span>
    );
  }

  return (
    <button
      type="button"
      onClick={handleClick}
      className={`inline-flex items-center gap-2 text-left group cursor-pointer ${className}`}
      title={`Xem hồ sơ của ${displayName}`}
    >
      {showAvatar && (
        <div
          className={`${avatarSize} rounded-full bg-blue-50 text-[#102d7d] flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-blue-100 group-hover:text-[#0d2a75] transition border border-blue-100 shadow-2xs overflow-hidden`}
        >
          {avatarUrl && !imgError ? (
            <img
              src={avatarUrl}
              alt={displayName}
              className="w-full h-full object-cover"
              onError={() => setImgError(true)}
            />
          ) : (
            <span>{initial}</span>
          )}
        </div>
      )}

      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-900 group-hover:text-[#123891] transition-colors truncate flex items-center gap-1">
          <span>{displayName}</span>
        </div>
        {subtitle && (
          <div className="text-[10px] text-slate-400 group-hover:text-slate-500 transition-colors truncate">
            {subtitle}
          </div>
        )}
      </div>
    </button>
  );
};

export default UserNameClickable;

