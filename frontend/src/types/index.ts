// Room types
export type RoomStatus = 'active' | 'ended';

export interface Room {
  room_id: string;
  room_name: string;
  status: RoomStatus;
  participant_count: number;
  created_at: string;
  ended_at: string | null;
  metadata: Record<string, unknown> | null;
}

// Participant types
export type ParticipantState = 'joining' | 'joined' | 'active' | 'disconnected';

export interface Participant {
  participant_id: string;
  identity: string;
  room_id: string;
  state: ParticipantState;
  join_time: string;
  leave_time: string | null;
  metadata: Record<string, unknown> | null;
  is_publisher: boolean;
}

// Policy types
export type PolicyCategory =
  | 'harassment'
  | 'hate_speech'
  | 'spam'
  | 'violence'
  | 'adult_content'
  | 'none';

export interface Policy {
  policy_id: string;
  name: string;
  category: PolicyCategory;
  description: string;
  warn_threshold: number;
  mute_threshold: number;
  flag_threshold: number;
  enabled: boolean;
  created_at: string;
  updated_at: string;
}

export interface PolicyUpdate {
  name?: string;
  description?: string;
  warn_threshold?: number;
  mute_threshold?: number;
  flag_threshold?: number;
  enabled?: boolean;
}

// Moderation types
export type ModerationAction = 'none' | 'warn' | 'mute' | 'flag_for_review';
export type ModerationStatus = 'pending' | 'executed' | 'reviewed' | 'overturned';
export type ContentType = 'text' | 'audio_transcript' | 'video_frame';

export interface ModerationDecision {
  decision_id: string;
  room_id: string;
  participant_id: string;
  participant_identity: string;
  content: string;
  content_type: ContentType;
  classification: PolicyCategory;
  confidence_score: number;
  action: ModerationAction;
  status: ModerationStatus;
  policy_id: string | null;
  timestamp: string;
  reasoning: string | null;
  metadata: Record<string, unknown> | null;
}

export interface ModerationFilters {
  room_id?: string;
  participant_id?: string;
  classification?: PolicyCategory;
  action?: ModerationAction;
  status?: ModerationStatus;
  min_confidence?: number;
  max_confidence?: number;
}

// Audit types
export type AuditActionType =
  | 'decision_created'
  | 'action_executed'
  | 'policy_updated'
  | 'decision_reviewed'
  | 'decision_overturned'
  | 'participant_warned'
  | 'participant_muted'
  | 'content_flagged';

export type AuditActor = 'system' | 'ai' | 'admin';

export interface AuditLogEntry {
  audit_id: string;
  decision_id: string | null;
  action_type: AuditActionType;
  actor: AuditActor;
  reason: string;
  timestamp: string;
  metadata: Record<string, unknown> | null;
}

export interface AuditFilters {
  decision_id?: string;
  action_type?: AuditActionType;
  actor?: AuditActor;
  start_time?: string;
  end_time?: string;
}

// Stats types
export interface RoomStats {
  total_rooms: number;
  active_rooms: number;
  ended_rooms: number;
  total_participants: number;
  active_participants: number;
}

export interface ModerationStats {
  total_decisions: number;
  by_action: Record<ModerationAction, number>;
  by_classification: Record<PolicyCategory, number>;
  by_status: Record<ModerationStatus, number>;
  average_confidence: number;
}

export interface AuditStats {
  total_entries: number;
  by_action_type: Record<AuditActionType, number>;
  by_actor: Record<AuditActor, number>;
  oldest_entry: string | null;
  newest_entry: string | null;
}

// WebSocket event types
export interface WebSocketMessage<T = unknown> {
  type: string;
  data: T;
  timestamp: string;
}

export type WebSocketEventType =
  | 'connection:established'
  | 'room:update'
  | 'participant:update'
  | 'moderation:decision'
  | 'audit:entry';
