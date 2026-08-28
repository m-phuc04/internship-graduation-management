import React from 'react';
import { useUserProfile } from '../../context/UserProfileContext';
import { User, ExternalLink } from 'lucide-react';

/**
 * Clickable User Name / Avatar component that opens the User Profile modal
 * @param {string|object} user - User object or userId
 * @param {string} name - Display name (optional fallback)
 * @param {string} subtitle - Subtitle (e.g. MSSV, email, or role)
 * @param {boolean} showAvatar - Whether to render avatar icon/image
 * @param {string} className - Additional CSS classes
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

  const handleClick = (e) => {
    e.stopPropagation();
    openUserProfile(user);
  };

  if (children) {
    return (
      <span
        onClick={handleClick}
        className={`cursor-pointer hover:text-indigo-600 transition-colors ${className}`}
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
          className={`${avatarSize} rounded-full bg-indigo-50 text-indigo-700 flex items-center justify-center font-bold text-xs shrink-0 group-hover:bg-indigo-100 group-hover:text-indigo-800 transition border border-indigo-100 shadow-2xs overflow-hidden`}
        >
          {avatarUrl ? (
            <img src={avatarUrl} alt={displayName} className="w-full h-full object-cover" />
          ) : (
            <span>{initial}</span>
          )}
        </div>
      )}

      <div className="min-w-0">
        <div className="text-xs font-bold text-slate-900 group-hover:text-indigo-600 transition-colors truncate flex items-center gap-1">
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

