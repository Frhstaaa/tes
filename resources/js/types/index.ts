export type UserRole = 'superadmin' | 'user';

export interface User {
  id: number;
  name: string;
  email: string;
  role: UserRole;
  is_active: boolean;
  avatar_path: string | null;
  personal_room_code: string | null;
  created_at: string;
}

export interface AdminMeetingEntry {
  id: number;
  code: string;
  title: string;
  type: MeetingType;
  status: MeetingStatus;
  locked: boolean;
  lobby_enabled: boolean;
  requires_passcode: boolean;
  started_at: string | null;
  scheduled_at: string | null;
  active_participants_count: number;
  waiting_participants_count: number;
  host: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface AuditLogEntry {
  id: number;
  action: string;
  target_type: string | null;
  target_id: string | null;
  metadata: Record<string, unknown> | null;
  ip_address: string | null;
  created_at: string;
  actor: {
    id: number;
    name: string;
    email: string;
  } | null;
}

export interface AdminUser extends User {
  meetings_count: number;
}

export type MeetingType = 'instant' | 'scheduled';
export type MeetingStatus = 'scheduled' | 'live' | 'ended' | 'cancelled';

export interface Meeting {
  id: number;
  code: string;
  title: string;
  description: string | null;
  type: MeetingType;
  status: MeetingStatus;
  scheduled_at: string | null;
  duration_minutes: number | null;
  requires_passcode: boolean;
  lobby_enabled: boolean;
  locked: boolean;
  started_at: string | null;
  ended_at: string | null;
  created_at: string;
  host_name: string | null;
  is_host: boolean;
  participant_count?: number | null;
}

export type ParticipantRole = 'host' | 'cohost' | 'guest';
export type ParticipantStatus = 'waiting' | 'admitted' | 'denied' | 'left' | 'kicked';

export interface MeetingParticipant {
  id: number;
  display_name: string;
  role: ParticipantRole;
  status: ParticipantStatus;
  created_at?: string;
  joined_at?: string | null;
}

export interface JoinMeetingResponse {
  status: 'waiting' | 'admitted';
  waiting_reason?: 'host_not_joined' | 'lobby';
  participant_id: number;
  role: ParticipantRole;
  room: string;
  domain: string;
  jwt?: string;
}
