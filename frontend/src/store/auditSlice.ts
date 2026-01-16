import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { AuditLogEntry, AuditFilters, AuditStats } from '@/types';
import { auditApi } from '@/lib/api';

interface AuditState {
  entries: AuditLogEntry[];
  stats: AuditStats | null;
  filters: AuditFilters;
  loading: boolean;
  error: string | null;
}

const initialState: AuditState = {
  entries: [],
  stats: null,
  filters: {},
  loading: false,
  error: null,
};

// Async thunks
export const fetchAuditLogs = createAsyncThunk(
  'audit/fetchAuditLogs',
  async ({ filters = {}, limit = 50, offset = 0 }: {
    filters?: AuditFilters;
    limit?: number;
    offset?: number;
  }) => {
    const entries = await auditApi.list(filters, limit, offset);
    return { entries, append: offset > 0 };
  }
);

export const fetchAuditStats = createAsyncThunk(
  'audit/fetchAuditStats',
  async () => {
    const stats = await auditApi.getStats();
    return stats;
  }
);

export const exportAuditLogs = createAsyncThunk(
  'audit/exportAuditLogs',
  async ({ format, filters = {} }: { format: 'json' | 'csv'; filters?: AuditFilters }) => {
    const data = await auditApi.export(format, filters);
    return { format, data };
  }
);

const auditSlice = createSlice({
  name: 'audit',
  initialState,
  reducers: {
    addAuditEntry: (state, action: PayloadAction<AuditLogEntry>) => {
      // Add to beginning of list (newest first)
      state.entries.unshift(action.payload);
    },
    setFilters: (state, action: PayloadAction<AuditFilters>) => {
      state.filters = action.payload;
    },
    clearFilters: (state) => {
      state.filters = {};
    },
    clearEntries: (state) => {
      state.entries = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchAuditLogs
    builder
      .addCase(fetchAuditLogs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAuditLogs.fulfilled, (state, action) => {
        state.loading = false;
        if (action.payload.append) {
          // Append for pagination
          state.entries = [...state.entries, ...action.payload.entries];
        } else {
          // Replace for new query
          state.entries = action.payload.entries;
        }
      })
      .addCase(fetchAuditLogs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch audit logs';
      });

    // fetchAuditStats
    builder
      .addCase(fetchAuditStats.fulfilled, (state, action) => {
        state.stats = action.payload;
      });
  },
});

export const {
  addAuditEntry,
  setFilters,
  clearFilters,
  clearEntries,
  clearError,
} = auditSlice.actions;

// Selectors
export const selectAuditEntries = (state: { audit: AuditState }) => state.audit.entries;

export const selectAuditStats = (state: { audit: AuditState }) => state.audit.stats;

export const selectAuditFilters = (state: { audit: AuditState }) => state.audit.filters;

export const selectAuditLoading = (state: { audit: AuditState }) => state.audit.loading;

export const selectEntriesByDecision = (state: { audit: AuditState }, decisionId: string) =>
  state.audit.entries.filter((e) => e.decision_id === decisionId);

export default auditSlice.reducer;
