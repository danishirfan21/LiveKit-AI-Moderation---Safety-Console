import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Room, RoomStats, Participant } from '@/types';
import { roomsApi } from '@/lib/api';

interface RoomsState {
  items: Record<string, Room>;
  participants: Record<string, Participant[]>;
  stats: RoomStats | null;
  activeRoomId: string | null;
  loading: boolean;
  error: string | null;
}

const initialState: RoomsState = {
  items: {},
  participants: {},
  stats: null,
  activeRoomId: null,
  loading: false,
  error: null,
};

// Async thunks
export const fetchRooms = createAsyncThunk(
  'rooms/fetchRooms',
  async (status?: string) => {
    const rooms = await roomsApi.list(status);
    return rooms;
  }
);

export const fetchRoomStats = createAsyncThunk(
  'rooms/fetchRoomStats',
  async () => {
    const stats = await roomsApi.getStats();
    return stats;
  }
);

export const fetchRoom = createAsyncThunk(
  'rooms/fetchRoom',
  async (roomId: string) => {
    const room = await roomsApi.get(roomId);
    return room;
  }
);

export const fetchRoomParticipants = createAsyncThunk(
  'rooms/fetchRoomParticipants',
  async (roomId: string) => {
    const participants = await roomsApi.getParticipants(roomId);
    return { roomId, participants };
  }
);

export const endRoom = createAsyncThunk(
  'rooms/endRoom',
  async (roomId: string) => {
    await roomsApi.end(roomId);
    return roomId;
  }
);

const roomsSlice = createSlice({
  name: 'rooms',
  initialState,
  reducers: {
    setActiveRoom: (state, action: PayloadAction<string | null>) => {
      state.activeRoomId = action.payload;
    },
    updateRoom: (state, action: PayloadAction<Room>) => {
      state.items[action.payload.room_id] = action.payload;
    },
    updateParticipant: (state, action: PayloadAction<Participant>) => {
      const participant = action.payload;
      const roomId = participant.room_id;
      if (!state.participants[roomId]) {
        state.participants[roomId] = [];
      }
      const index = state.participants[roomId].findIndex(
        (p) => p.participant_id === participant.participant_id
      );
      if (index !== -1) {
        state.participants[roomId][index] = participant;
      } else {
        state.participants[roomId].push(participant);
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchRooms
    builder
      .addCase(fetchRooms.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRooms.fulfilled, (state, action) => {
        state.loading = false;
        state.items = {};
        action.payload.forEach((room) => {
          state.items[room.room_id] = room;
        });
      })
      .addCase(fetchRooms.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch rooms';
      });

    // fetchRoomStats
    builder
      .addCase(fetchRoomStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });

    // fetchRoom
    builder
      .addCase(fetchRoom.fulfilled, (state, action) => {
        state.items[action.payload.room_id] = action.payload;
      });

    // fetchRoomParticipants
    builder
      .addCase(fetchRoomParticipants.fulfilled, (state, action) => {
        state.participants[action.payload.roomId] = action.payload.participants;
      });

    // endRoom
    builder
      .addCase(endRoom.fulfilled, (state, action) => {
        const room = state.items[action.payload];
        if (room) {
          room.status = 'ended';
        }
      });
  },
});

export const { setActiveRoom, updateRoom, updateParticipant, clearError } = roomsSlice.actions;

// Selectors
export const selectRooms = (state: { rooms: RoomsState }) => Object.values(state.rooms.items);
export const selectActiveRooms = (state: { rooms: RoomsState }) =>
  Object.values(state.rooms.items).filter((room) => room.status === 'active');
export const selectRoomById = (state: { rooms: RoomsState }, roomId: string) =>
  state.rooms.items[roomId];
export const selectRoomStats = (state: { rooms: RoomsState }) => state.rooms.stats;
export const selectRoomsLoading = (state: { rooms: RoomsState }) => state.rooms.loading;
export const selectParticipants = (state: { rooms: RoomsState }, roomId: string) =>
  state.rooms.participants[roomId] || [];

export default roomsSlice.reducer;
