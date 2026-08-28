import React from 'react';

const StatusBadge = ({
  status,
  variant = 'default',
  label,
  size = 'md',
}) => {
  // Determine variant styling
  let badgeStyles = 'bg-slate-100 text-slate-700 border-slate-200';
  let dotColor = 'bg-slate-400';

  const STATUS_LABELS = {
    PENDING: 'Chờ duyệt',
    PENDING_TBM_APPROVAL: 'Chờ TBM duyệt',
    PENDING_SUPERVISOR_APPROVAL: 'Chờ GVHD duyệt',
    PENDING_SUPERVISOR_ACCEPTANCE: 'Đã phân công GVHD',
    APPROVED: 'Đã phê duyệt',
    ASSIGNED_REVIEWERS: 'Đã phân công PB',
    IN_PROGRESS: 'Đang thực hiện',
    INTERNING: 'Đang thực tập',
    SUBMITTED: 'Đã nộp',
    GRADED: 'Đã chấm điểm',
    COMPLETED: 'Hoàn thành',
    REJECTED: 'Từ chối',
    ACTIVE: 'Hoạt động',
    INACTIVE: 'Tạm ngưng',
  };

  if (variant === 'success' || status === 'ACTIVE' || status === 'APPROVED' || status === true) {
    badgeStyles = 'bg-emerald-50 text-emerald-700 border-emerald-200/80';
    dotColor = 'bg-emerald-500';
  } else if (variant === 'danger' || status === 'INACTIVE' || status === 'REJECTED' || status === false) {
    badgeStyles = 'bg-rose-50 text-rose-700 border-rose-200/80';
    dotColor = 'bg-rose-500';
  } else if (status === 'PENDING_SUPERVISOR_APPROVAL') {
    badgeStyles = 'bg-violet-50 text-violet-700 border-violet-200/80';
    dotColor = 'bg-violet-500';
  } else if (status === 'PENDING_SUPERVISOR_ACCEPTANCE') {
    badgeStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    dotColor = 'bg-indigo-500';
  } else if (variant === 'warning' || status === 'PENDING' || status === 'PENDING_TBM_APPROVAL') {
    badgeStyles = 'bg-amber-50 text-amber-700 border-amber-200/80';
    dotColor = 'bg-amber-500';
  } else if (variant === 'info' || status === 'INTERNING' || status === 'IN_PROGRESS') {
    badgeStyles = 'bg-sky-50 text-sky-700 border-sky-200/80';
    dotColor = 'bg-sky-500';
  } else if (variant === 'purple' || status === 'COMPLETED' || status === 'GRADED' || status === 'ASSIGNED_REVIEWERS') {
    badgeStyles = 'bg-indigo-50 text-indigo-700 border-indigo-200/80';
    dotColor = 'bg-indigo-500';
  }

  const sizeStyles =
    size === 'sm'
      ? 'px-2 py-0.5 text-[11px] gap-1.5'
      : 'px-2.5 py-1 text-xs gap-1.5 font-medium';

  return (
    <span
      className={`inline-flex items-center rounded-full border shadow-2xs leading-none whitespace-nowrap ${sizeStyles} ${badgeStyles}`}
    >
      <span className={`w-1.5 h-1.5 rounded-full ${dotColor}`} />
      {label || STATUS_LABELS[status] || status}
    </span>
  );
};

export default StatusBadge;
