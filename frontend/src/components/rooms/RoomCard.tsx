'use client';

import type { Room } from '@/types';
import { RoomStatusBadge } from '@/components/shared/StatusBadge';
import { TimeAgo } from '@/components/shared/TimeAgo';
import { UsersIcon } from '@heroicons/react/24/outline';

interface RoomCardProps {
  room: Room;
}

export function RoomCard({ room }: RoomCardProps) {
  return (
    <div className="card p-4 hover:shadow-md transition-shadow">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <h3 className="font-semibold text-gray-900 truncate">{room.room_name}</h3>
          <p className="text-xs text-gray-500 truncate mt-0.5">{room.room_id}</p>
        </div>
        <RoomStatusBadge status={room.status} />
      </div>

      <div className="mt-4 flex items-center justify-between text-sm">
        <div className="flex items-center text-gray-600">
          <UsersIcon className="h-4 w-4 mr-1.5" />
          <span>{room.participant_count} participants</span>
        </div>
        <TimeAgo timestamp={room.created_at} className="text-xs" />
      </div>

      {room.status === 'active' && (
        <div className="mt-3 pt-3 border-t border-gray-100">
          <div className="flex items-center">
            <span className="status-dot status-active animate-pulse-slow"></span>
            <span className="text-xs text-success-600 font-medium">Live</span>
          </div>
        </div>
      )}
    </div>
  );
}
