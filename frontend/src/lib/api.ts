import type {
  Room,
  RoomStats,
  Participant,
  ModerationDecision,
  ModerationFilters,
  ModerationStats,
  Policy,
  PolicyUpdate,
  AuditLogEntry,
  AuditFilters,
  AuditStats,
} from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

// Generic fetch wrapper with error handling
async function fetchAPI<T>(
  endpoint: string,
  options: RequestInit = {}
): Promise<T> {
  const url = `${API_BASE_URL}${endpoint}`;

  const response = await fetch(url, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...options.headers,
    },
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({}));
    throw new Error(error.detail || `API Error: ${response.status}`);
  }

  return response.json();
}

// Room API
export const roomsApi = {
  list: async (status?: string, limit = 50, offset = 0): Promise<Room[]> => {
    const params = new URLSearchParams();
    if (status) params.append('status', status);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    return fetchAPI<Room[]>(`/api/rooms?${params}`);
  },

  get: async (roomId: string): Promise<Room> => {
    return fetchAPI<Room>(`/api/rooms/${roomId}`);
  },

  getParticipants: async (roomId: string): Promise<Participant[]> => {
    return fetchAPI<Participant[]>(`/api/rooms/${roomId}/participants`);
  },

  getStats: async (): Promise<RoomStats> => {
    return fetchAPI<RoomStats>('/api/rooms/stats');
  },

  end: async (roomId: string): Promise<void> => {
    await fetchAPI(`/api/rooms/${roomId}`, { method: 'DELETE' });
  },
};

// Moderation API
export const moderationApi = {
  listDecisions: async (
    filters: ModerationFilters = {},
    limit = 50,
    offset = 0
  ): Promise<ModerationDecision[]> => {
    const params = new URLSearchParams();
    if (filters.room_id) params.append('room_id', filters.room_id);
    if (filters.participant_id) params.append('participant_id', filters.participant_id);
    if (filters.classification) params.append('classification', filters.classification);
    if (filters.action) params.append('action', filters.action);
    if (filters.status) params.append('status', filters.status);
    if (filters.min_confidence !== undefined) {
      params.append('min_confidence', filters.min_confidence.toString());
    }
    if (filters.max_confidence !== undefined) {
      params.append('max_confidence', filters.max_confidence.toString());
    }
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    return fetchAPI<ModerationDecision[]>(`/api/moderation/decisions?${params}`);
  },

  getDecision: async (decisionId: string): Promise<ModerationDecision> => {
    return fetchAPI<ModerationDecision>(`/api/moderation/decisions/${decisionId}`);
  },

  getStats: async (): Promise<ModerationStats> => {
    return fetchAPI<ModerationStats>('/api/moderation/decisions/stats');
  },

  reviewDecision: async (
    decisionId: string,
    approved: boolean,
    notes?: string
  ): Promise<void> => {
    const params = new URLSearchParams();
    params.append('approved', approved.toString());
    if (notes) params.append('notes', notes);
    await fetchAPI(`/api/moderation/decisions/${decisionId}/review?${params}`, {
      method: 'POST',
    });
  },

  overturnDecision: async (decisionId: string, reason: string): Promise<void> => {
    const params = new URLSearchParams();
    params.append('reason', reason);
    await fetchAPI(`/api/moderation/decisions/${decisionId}/overturn?${params}`, {
      method: 'POST',
    });
  },
};

// Policy API
export const policiesApi = {
  list: async (): Promise<Policy[]> => {
    return fetchAPI<Policy[]>('/api/policies');
  },

  get: async (policyId: string): Promise<Policy> => {
    return fetchAPI<Policy>(`/api/policies/${policyId}`);
  },

  update: async (policyId: string, update: PolicyUpdate): Promise<Policy> => {
    return fetchAPI<Policy>(`/api/policies/${policyId}`, {
      method: 'PUT',
      body: JSON.stringify(update),
    });
  },

  toggle: async (policyId: string): Promise<{ enabled: boolean }> => {
    return fetchAPI<{ enabled: boolean }>(`/api/policies/${policyId}/toggle`, {
      method: 'POST',
    });
  },
};

// Audit API
export const auditApi = {
  list: async (
    filters: AuditFilters = {},
    limit = 50,
    offset = 0
  ): Promise<AuditLogEntry[]> => {
    const params = new URLSearchParams();
    if (filters.decision_id) params.append('decision_id', filters.decision_id);
    if (filters.action_type) params.append('action_type', filters.action_type);
    if (filters.actor) params.append('actor', filters.actor);
    if (filters.start_time) params.append('start_time', filters.start_time);
    if (filters.end_time) params.append('end_time', filters.end_time);
    params.append('limit', limit.toString());
    params.append('offset', offset.toString());
    return fetchAPI<AuditLogEntry[]>(`/api/audit?${params}`);
  },

  getStats: async (): Promise<AuditStats> => {
    return fetchAPI<AuditStats>('/api/audit/stats');
  },

  export: async (format: 'json' | 'csv', filters: AuditFilters = {}): Promise<string> => {
    const params = new URLSearchParams();
    params.append('format', format);
    if (filters.decision_id) params.append('decision_id', filters.decision_id);
    if (filters.action_type) params.append('action_type', filters.action_type);
    if (filters.actor) params.append('actor', filters.actor);

    const response = await fetchAPI<{ data?: string; entries?: AuditLogEntry[] }>(
      `/api/audit/export?${params}`
    );

    if (format === 'csv') {
      return response.data || '';
    }
    return JSON.stringify(response.entries, null, 2);
  },
};

// Webhook simulation (for testing)
export const simulateApi = {
  sendContent: async (
    roomId: string,
    participantId: string,
    participantIdentity: string,
    content: string,
    contentType = 'text'
  ): Promise<ModerationDecision> => {
    return fetchAPI<ModerationDecision>('/api/webhooks/simulate', {
      method: 'POST',
      body: JSON.stringify({
        room_id: roomId,
        participant_id: participantId,
        participant_identity: participantIdentity,
        content,
        content_type: contentType,
      }),
    });
  },
};
