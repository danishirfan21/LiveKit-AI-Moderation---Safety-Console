'use client';

import type { ModerationAction, ModerationStatus, PolicyCategory, RoomStatus } from '@/types';

type BadgeVariant = 'success' | 'warning' | 'danger' | 'info' | 'gray';

interface StatusBadgeProps {
  label: string;
  variant?: BadgeVariant;
  className?: string;
}

const variantStyles: Record<BadgeVariant, string> = {
  success: 'bg-success-100 text-success-800',
  warning: 'bg-warning-100 text-warning-800',
  danger: 'bg-danger-100 text-danger-800',
  info: 'bg-primary-100 text-primary-800',
  gray: 'bg-gray-100 text-gray-800',
};

export function StatusBadge({ label, variant = 'gray', className = '' }: StatusBadgeProps) {
  return (
    <span
      className={`
        inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium
        ${variantStyles[variant]}
        ${className}
      `}
    >
      {label}
    </span>
  );
}

// Specialized badges
export function RoomStatusBadge({ status }: { status: RoomStatus }) {
  const config: Record<RoomStatus, { label: string; variant: BadgeVariant }> = {
    active: { label: 'Active', variant: 'success' },
    ended: { label: 'Ended', variant: 'gray' },
  };

  const { label, variant } = config[status];
  return <StatusBadge label={label} variant={variant} />;
}

export function ModerationActionBadge({ action }: { action: ModerationAction }) {
  const config: Record<ModerationAction, { label: string; variant: BadgeVariant }> = {
    none: { label: 'None', variant: 'gray' },
    warn: { label: 'Warn', variant: 'warning' },
    mute: { label: 'Mute', variant: 'danger' },
    flag_for_review: { label: 'Flagged', variant: 'info' },
  };

  const { label, variant } = config[action];
  return <StatusBadge label={label} variant={variant} />;
}

export function ModerationStatusBadge({ status }: { status: ModerationStatus }) {
  const config: Record<ModerationStatus, { label: string; variant: BadgeVariant }> = {
    pending: { label: 'Pending', variant: 'warning' },
    executed: { label: 'Executed', variant: 'success' },
    reviewed: { label: 'Reviewed', variant: 'info' },
    overturned: { label: 'Overturned', variant: 'danger' },
  };

  const { label, variant } = config[status];
  return <StatusBadge label={label} variant={variant} />;
}

export function PolicyCategoryBadge({ category }: { category: PolicyCategory }) {
  const config: Record<PolicyCategory, { label: string; variant: BadgeVariant }> = {
    harassment: { label: 'Harassment', variant: 'danger' },
    hate_speech: { label: 'Hate Speech', variant: 'danger' },
    spam: { label: 'Spam', variant: 'warning' },
    violence: { label: 'Violence', variant: 'danger' },
    adult_content: { label: 'Adult', variant: 'danger' },
    none: { label: 'None', variant: 'gray' },
  };

  const { label, variant } = config[category];
  return <StatusBadge label={label} variant={variant} />;
}
