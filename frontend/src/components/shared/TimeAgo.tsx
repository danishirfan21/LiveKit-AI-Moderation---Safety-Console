'use client';

import { useEffect, useState } from 'react';

interface TimeAgoProps {
  timestamp: string;
  className?: string;
}

function formatTimeAgo(timestamp: string): string {
  const now = new Date();
  const date = new Date(timestamp);
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (seconds < 60) {
    return 'just now';
  }

  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) {
    return `${minutes}m ago`;
  }

  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    return `${hours}h ago`;
  }

  const days = Math.floor(hours / 24);
  if (days < 7) {
    return `${days}d ago`;
  }

  // Format as date for older items
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
  });
}

function formatFullDate(timestamp: string): string {
  const date = new Date(timestamp);
  return date.toLocaleString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

export function TimeAgo({ timestamp, className = '' }: TimeAgoProps) {
  const [timeAgo, setTimeAgo] = useState(formatTimeAgo(timestamp));

  useEffect(() => {
    // Update every minute
    const interval = setInterval(() => {
      setTimeAgo(formatTimeAgo(timestamp));
    }, 60000);

    return () => clearInterval(interval);
  }, [timestamp]);

  return (
    <time
      dateTime={timestamp}
      title={formatFullDate(timestamp)}
      className={`text-gray-500 ${className}`}
    >
      {timeAgo}
    </time>
  );
}
