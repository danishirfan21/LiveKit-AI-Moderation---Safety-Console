'use client';

import { useEffect } from 'react';
import { useAppDispatch, useAppSelector } from '@/store';
import { fetchRooms, fetchRoomStats, selectActiveRooms, selectRoomStats, selectRoomsLoading } from '@/store/roomsSlice';
import { fetchModerationStats, selectModerationStats, selectPendingReviews } from '@/store/moderationSlice';
import { RoomCard } from '@/components/rooms/RoomCard';
import { StatsCard } from '@/components/rooms/StatsCard';
import {
  UsersIcon,
  VideoCameraIcon,
  ShieldExclamationIcon,
  ClockIcon,
} from '@heroicons/react/24/outline';

export default function LiveRoomsPage() {
  const dispatch = useAppDispatch();
  const activeRooms = useAppSelector(selectActiveRooms);
  const roomStats = useAppSelector(selectRoomStats);
  const moderationStats = useAppSelector(selectModerationStats);
  const pendingReviews = useAppSelector(selectPendingReviews);
  const loading = useAppSelector(selectRoomsLoading);

  useEffect(() => {
    dispatch(fetchRooms('active'));
    dispatch(fetchRoomStats());
    dispatch(fetchModerationStats());
  }, [dispatch]);

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div>
        <h1 className="text-2xl font-bold text-gray-900">Live Room Activity</h1>
        <p className="text-gray-600 mt-1">Monitor active rooms and real-time moderation status</p>
      </div>

      {/* Stats overview */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <StatsCard
          title="Active Rooms"
          value={roomStats?.active_rooms ?? 0}
          icon={VideoCameraIcon}
          color="primary"
        />
        <StatsCard
          title="Active Participants"
          value={roomStats?.active_participants ?? 0}
          icon={UsersIcon}
          color="success"
        />
        <StatsCard
          title="Total Decisions"
          value={moderationStats?.total_decisions ?? 0}
          icon={ShieldExclamationIcon}
          color="warning"
        />
        <StatsCard
          title="Pending Reviews"
          value={pendingReviews.length}
          icon={ClockIcon}
          color="danger"
        />
      </div>

      {/* Active rooms grid */}
      <div>
        <h2 className="text-lg font-semibold text-gray-900 mb-4">Active Rooms</h2>
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600"></div>
          </div>
        ) : activeRooms.length === 0 ? (
          <div className="card p-8 text-center">
            <VideoCameraIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Active Rooms</h3>
            <p className="text-gray-500">
              Rooms will appear here when participants join LiveKit sessions.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {activeRooms.map((room) => (
              <RoomCard key={room.room_id} room={room} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
