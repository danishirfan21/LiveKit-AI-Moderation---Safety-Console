'use client';

import { useWebSocket } from '@/hooks/useWebSocket';
import { SignalIcon, SignalSlashIcon } from '@heroicons/react/24/outline';

export function Header() {
  const { isConnected } = useWebSocket();

  return (
    <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6">
      {/* Page title area - will be filled by pages */}
      <div className="flex-1" />

      {/* Connection status */}
      <div className="flex items-center space-x-4">
        <div
          className={`
            flex items-center px-3 py-1.5 rounded-full text-sm
            ${isConnected ? 'bg-success-100 text-success-700' : 'bg-danger-100 text-danger-700'}
          `}
        >
          {isConnected ? (
            <>
              <SignalIcon className="h-4 w-4 mr-2" />
              <span>Live</span>
            </>
          ) : (
            <>
              <SignalSlashIcon className="h-4 w-4 mr-2" />
              <span>Disconnected</span>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
