'use client';

import type { ComponentType } from 'react';

interface StatsCardProps {
  title: string;
  value: number | string;
  icon: ComponentType<{ className?: string }>;
  color?: 'primary' | 'success' | 'warning' | 'danger';
  subtitle?: string;
}

const colorStyles = {
  primary: 'bg-primary-100 text-primary-600',
  success: 'bg-success-100 text-success-600',
  warning: 'bg-warning-100 text-warning-600',
  danger: 'bg-danger-100 text-danger-600',
};

export function StatsCard({ title, value, icon: Icon, color = 'primary', subtitle }: StatsCardProps) {
  return (
    <div className="card p-4">
      <div className="flex items-center">
        <div className={`p-3 rounded-lg ${colorStyles[color]}`}>
          <Icon className="h-6 w-6" />
        </div>
        <div className="ml-4">
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-2xl font-bold text-gray-900">{value}</p>
          {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
        </div>
      </div>
    </div>
  );
}
