import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { ModerationDecision, ModerationFilters, ModerationStats } from '@/types';
import { moderationApi } from '@/lib/api';

interface ModerationState {
  decisions: Record<string, ModerationDecision>;
  stats: ModerationStats | null;
  filters: ModerationFilters;
  loading: boolean;
  error: string | null;
}

const initialState: ModerationState = {
  decisions: {},
  stats: null,
  filters: {},
  loading: false,
  error: null,
};

// Async thunks
export const fetchDecisions = createAsyncThunk(
  'moderation/fetchDecisions',
  async ({ filters = {}, limit = 50, offset = 0 }: {
    filters?: ModerationFilters;
    limit?: number;
    offset?: number;
  }) => {
    const decisions = await moderationApi.listDecisions(filters, limit, offset);
    return decisions;
  }
);

export const fetchDecision = createAsyncThunk(
  'moderation/fetchDecision',
  async (decisionId: string) => {
    const decision = await moderationApi.getDecision(decisionId);
    return decision;
  }
);

export const fetchModerationStats = createAsyncThunk(
  'moderation/fetchModerationStats',
  async () => {
    const stats = await moderationApi.getStats();
    return stats;
  }
);

export const reviewDecision = createAsyncThunk(
  'moderation/reviewDecision',
  async ({ decisionId, approved, notes }: {
    decisionId: string;
    approved: boolean;
    notes?: string;
  }) => {
    await moderationApi.reviewDecision(decisionId, approved, notes);
    return { decisionId, status: 'reviewed' as const };
  }
);

export const overturnDecision = createAsyncThunk(
  'moderation/overturnDecision',
  async ({ decisionId, reason }: { decisionId: string; reason: string }) => {
    await moderationApi.overturnDecision(decisionId, reason);
    return { decisionId, status: 'overturned' as const };
  }
);

const moderationSlice = createSlice({
  name: 'moderation',
  initialState,
  reducers: {
    addDecision: (state, action: PayloadAction<ModerationDecision>) => {
      state.decisions[action.payload.decision_id] = action.payload;
    },
    setFilters: (state, action: PayloadAction<ModerationFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchDecisions
    builder
      .addCase(fetchDecisions.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDecisions.fulfilled, (state, action) => {
        state.loading = false;
        // Merge new decisions with existing (for pagination)
        action.payload.forEach((decision) => {
          state.decisions[decision.decision_id] = decision;
        });
      })
      .addCase(fetchDecisions.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch decisions';
      });

    // fetchDecision
    builder
      .addCase(fetchDecision.fulfilled, (state, action) => {
        state.decisions[action.payload.decision_id] = action.payload;
      });

    // fetchModerationStats
    builder
      .addCase(fetchModerationStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });

    // reviewDecision
    builder
      .addCase(reviewDecision.fulfilled, (state, action) => {
        const decision = state.decisions[action.payload.decisionId];
        if (decision) {
          decision.status = action.payload.status;
        }
      });

    // overturnDecision
    builder
      .addCase(overturnDecision.fulfilled, (state, action) => {
        const decision = state.decisions[action.payload.decisionId];
        if (decision) {
          decision.status = action.payload.status;
        }
      });
  },
});

export const { addDecision, setFilters, clearFilters, clearError } = moderationSlice.actions;

// Selectors
export const selectDecisions = (state: { moderation: ModerationState }) =>
  Object.values(state.moderation.decisions).sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime()
  );

export const selectDecisionById = (state: { moderation: ModerationState }, decisionId: string) =>
  state.moderation.decisions[decisionId];

export const selectModerationStats = (state: { moderation: ModerationState }) =>
  state.moderation.stats;

export const selectModerationFilters = (state: { moderation: ModerationState }) =>
  state.moderation.filters;

export const selectModerationLoading = (state: { moderation: ModerationState }) =>
  state.moderation.loading;

export const selectPendingReviews = (state: { moderation: ModerationState }) =>
  Object.values(state.moderation.decisions).filter(
    (d) => d.action === 'flag_for_review' && d.status !== 'reviewed'
  );

export default moderationSlice.reducer;
