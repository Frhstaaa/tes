import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ensureCsrfCookie } from '@/lib/api';
import type { User } from '@/types';

export function useAuth() {
  const queryClient = useQueryClient();

  const meQuery = useQuery<User | null>({
    queryKey: ['auth', 'me'],
    queryFn: async () => {
      try {
        const res = await api.get<{ user: User }>('/me');
        return res.data.user;
      } catch {
        return null;
      }
    },
    retry: false,
    staleTime: 60_000,
  });

  const loginMutation = useMutation({
    mutationFn: async (payload: {
      email: string;
      password: string;
      captcha_id: string;
      captcha_answer: string;
    }) => {
      await ensureCsrfCookie();
      const res = await api.post<{ user: User }>('/auth/login', payload);
      return res.data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user);
    },
  });

  const registerMutation = useMutation({
    mutationFn: async (payload: {
      name: string;
      email: string;
      password: string;
      password_confirmation: string;
      captcha_id: string;
      captcha_answer: string;
    }) => {
      await ensureCsrfCookie();
      const res = await api.post<{ user: User }>('/auth/register', payload);
      return res.data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user);
    },
  });

  const logoutMutation = useMutation({
    mutationFn: async () => {
      await ensureCsrfCookie();
      await api.post('/auth/logout');
    },
    onSuccess: () => {
      queryClient.setQueryData(['auth', 'me'], null);
      queryClient.removeQueries({ queryKey: ['meetings'] });
    },
  });

  const updateProfileMutation = useMutation({
    mutationFn: async (payload: { name: string }) => {
      await ensureCsrfCookie();
      const res = await api.patch<{ user: User }>('/me', payload);
      return res.data.user;
    },
    onSuccess: (user) => {
      queryClient.setQueryData(['auth', 'me'], user);
    },
  });

  return {
    user: meQuery.data ?? null,
    isLoading: meQuery.isLoading,
    login: loginMutation.mutateAsync,
    isLoggingIn: loginMutation.isPending,
    register: registerMutation.mutateAsync,
    isRegistering: registerMutation.isPending,
    logout: logoutMutation.mutateAsync,
    isLoggingOut: logoutMutation.isPending,
    updateProfile: updateProfileMutation.mutateAsync,
    isUpdatingProfile: updateProfileMutation.isPending,
  };
}
