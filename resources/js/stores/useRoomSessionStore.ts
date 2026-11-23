import { create } from 'zustand';
import type { ParticipantRole } from '@/types';

export interface RoomSession {
  code: string;
  jwt: string;
  room: string;
  domain: string;
  role: ParticipantRole;
  participantId: number;
  displayName: string;
  startMutedAudio: boolean;
  startMutedVideo: boolean;
  joinedAtMs: number;
}

interface RoomSessionState {
  session: RoomSession | null;
  setSession: (session: RoomSession) => void;
  clearSession: () => void;
}

export const useRoomSessionStore = create<RoomSessionState>((set) => ({
  session: null,
  setSession: (session) => set({ session }),
  clearSession: () => set({ session: null }),
}));
