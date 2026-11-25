import { keepPreviousData, useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ensureCsrfCookie } from '@/lib/api';
import type { Meeting } from '@/types';

export interface PaginationMeta {
  current_page: number;
  last_page: number;
  per_page: number;
  total: number;
}

export interface PaginatedMeetingsResult {
  meetings: Meeting[];
  meta: PaginationMeta;
}

export function useMeetings(filter: 'upcoming' | 'history' | 'all' = 'upcoming') {
  return useQuery<Meeting[]>({
    queryKey: ['meetings', filter],
    queryFn: async () => {
      const res = await api.get<{ meetings: Meeting[] }>('/meetings', {
        params: { filter },
      });
      return res.data.meetings;
    },
  });
}

export function useMeetingsPaginated(
  filter: 'upcoming' | 'history' | 'all' = 'history',
  page = 1,
  perPage = 10
) {
  return useQuery<PaginatedMeetingsResult>({
    queryKey: ['meetings', filter, 'paginated', page, perPage],
    queryFn: async () => {
      const res = await api.get<PaginatedMeetingsResult>('/meetings', {
        params: { filter, page, per_page: perPage },
      });
      return res.data;
    },
    placeholderData: keepPreviousData,
  });
}

export interface CreateMeetingInput {
  type: 'instant' | 'scheduled';
  title?: string;
  description?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  passcode?: string;
  lobby_enabled?: boolean;
}

export function useCreateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (input: CreateMeetingInput) => {
      await ensureCsrfCookie();
      const res = await api.post<{ meeting: Meeting }>('/meetings', input);
      return res.data.meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useCancelMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async (code: string) => {
      await ensureCsrfCookie();
      await api.delete(`/meetings/${code}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export interface UpdateMeetingInput {
  code: string;
  title?: string;
  scheduled_at?: string;
  duration_minutes?: number;
  passcode?: string;
  clear_passcode?: boolean;
  lobby_enabled?: boolean;
}

export function useUpdateMeeting() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async ({ code, ...body }: UpdateMeetingInput) => {
      await ensureCsrfCookie();
      const res = await api.patch<{ meeting: Meeting }>(`/meetings/${code}`, body);
      return res.data.meeting;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}

export function useOpenPersonalRoom() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: async () => {
      await ensureCsrfCookie();
      const res = await api.post<{ personal_room_code: string; meeting: Meeting }>('/me/personal-room');
      return res.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['auth', 'me'] });
      queryClient.invalidateQueries({ queryKey: ['meetings'] });
    },
  });
}
