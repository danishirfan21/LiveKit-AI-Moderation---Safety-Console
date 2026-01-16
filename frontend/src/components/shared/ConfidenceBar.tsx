'use client';

interface ConfidenceBarProps {
  value: number; // 0-1
  showLabel?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export function ConfidenceBar({ value, showLabel = true, size = 'md' }: ConfidenceBarProps) {
  // Determine color based on confidence level
  const getColor = (confidence: number): string => {
    if (confidence >= 0.8) return 'bg-danger-500';
    if (confidence >= 0.6) return 'bg-warning-500';
    if (confidence >= 0.4) return 'bg-primary-500';
    return 'bg-success-500';
  };

  const heights = {
    sm: 'h-1.5',
    md: 'h-2',
    lg: 'h-3',
  };

  const percentage = Math.round(value * 100);

  return (
    <div className="flex items-center space-x-2">
      <div className={`flex-1 ${heights[size]} rounded-full bg-gray-200 overflow-hidden`}>
        <div
          className={`h-full rounded-full transition-all ${getColor(value)}`}
          style={{ width: `${percentage}%` }}
        />
      </div>
      {showLabel && (
        <span className="text-xs text-gray-600 font-medium w-10 text-right">
          {percentage}%
        </span>
      )}
    </div>
  );
}
