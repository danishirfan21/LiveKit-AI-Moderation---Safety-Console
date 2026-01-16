import { createSlice, createAsyncThunk, PayloadAction } from '@reduxjs/toolkit';
import type { Policy, PolicyUpdate } from '@/types';
import { policiesApi } from '@/lib/api';

interface PoliciesState {
  items: Record<string, Policy>;
  loading: boolean;
  saving: boolean;
  error: string | null;
}

const initialState: PoliciesState = {
  items: {},
  loading: false,
  saving: false,
  error: null,
};

// Async thunks
export const fetchPolicies = createAsyncThunk(
  'policies/fetchPolicies',
  async () => {
    const policies = await policiesApi.list();
    return policies;
  }
);

export const fetchPolicy = createAsyncThunk(
  'policies/fetchPolicy',
  async (policyId: string) => {
    const policy = await policiesApi.get(policyId);
    return policy;
  }
);

export const updatePolicy = createAsyncThunk(
  'policies/updatePolicy',
  async ({ policyId, update }: { policyId: string; update: PolicyUpdate }) => {
    const policy = await policiesApi.update(policyId, update);
    return policy;
  }
);

export const togglePolicy = createAsyncThunk(
  'policies/togglePolicy',
  async (policyId: string, { getState }) => {
    const state = getState() as { policies: PoliciesState };
    const policy = state.policies.items[policyId];
    await policiesApi.toggle(policyId);
    return { policyId, enabled: !policy?.enabled };
  }
);

const policiesSlice = createSlice({
  name: 'policies',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // fetchPolicies
    builder
      .addCase(fetchPolicies.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchPolicies.fulfilled, (state, action) => {
        state.loading = false;
        state.items = {};
        action.payload.forEach((policy) => {
          state.items[policy.policy_id] = policy;
        });
      })
      .addCase(fetchPolicies.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error.message || 'Failed to fetch policies';
      });

    // fetchPolicy
    builder
      .addCase(fetchPolicy.fulfilled, (state, action) => {
        state.items[action.payload.policy_id] = action.payload;
      });

    // updatePolicy
    builder
      .addCase(updatePolicy.pending, (state) => {
        state.saving = true;
        state.error = null;
      })
      .addCase(updatePolicy.fulfilled, (state, action) => {
        state.saving = false;
        state.items[action.payload.policy_id] = action.payload;
      })
      .addCase(updatePolicy.rejected, (state, action) => {
        state.saving = false;
        state.error = action.error.message || 'Failed to update policy';
      });

    // togglePolicy
    builder
      .addCase(togglePolicy.fulfilled, (state, action) => {
        const policy = state.items[action.payload.policyId];
        if (policy) {
          policy.enabled = action.payload.enabled;
        }
      });
  },
});

export const { clearError } = policiesSlice.actions;

// Selectors
export const selectPolicies = (state: { policies: PoliciesState }) =>
  Object.values(state.policies.items);

export const selectPolicyById = (state: { policies: PoliciesState }, policyId: string) =>
  state.policies.items[policyId];

export const selectEnabledPolicies = (state: { policies: PoliciesState }) =>
  Object.values(state.policies.items).filter((p) => p.enabled);

export const selectPoliciesLoading = (state: { policies: PoliciesState }) =>
  state.policies.loading;

export const selectPoliciesSaving = (state: { policies: PoliciesState }) =>
  state.policies.saving;

export default policiesSlice.reducer;
