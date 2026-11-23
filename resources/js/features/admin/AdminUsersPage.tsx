import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowRight, KeyRound, Plus, Power, Search, ShieldCheck, Trash2, UserCheck, Users, UserX, Video } from 'lucide-react';
import { api, ensureCsrfCookie, extractErrorMessage } from '@/lib/api';
import type { AdminMeetingEntry, AdminUser, AuditLogEntry, UserRole } from '@/types';
import { useAuth } from '@/features/auth/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { useToastStore } from '@/stores/useToastStore';
import { formatMeetingDate } from '@/lib/format';

interface AdminUsersResponse {
  users: AdminUser[];
  stats: {
    total: number;
    active: number;
    inactive: number;
    superadmins: number;
  };
}

export function AdminUsersPage() {
  const { user: currentUser } = useAuth();
  const queryClient = useQueryClient();
  const pushToast = useToastStore((s) => s.push);

  const [activeTab, setActiveTab] = useState<'users' | 'meetings' | 'audit'>('users');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // Create form state
  const [newName, setNewName] = useState('');
  const [newEmail, setNewEmail] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [newRole, setNewRole] = useState<UserRole>('user');
  const [formError, setFormError] = useState('');

  // Edit form state
  const [editName, setEditName] = useState('');
  const [editPassword, setEditPassword] = useState('');
  const [editRole, setEditRole] = useState<UserRole>('user');

  const usersQuery = useQuery<AdminUsersResponse>({
    queryKey: ['admin', 'users', search],
    queryFn: async () => {
      const res = await api.get<AdminUsersResponse>('/admin/users', {
        params: search.trim() ? { q: search.trim() } : undefined,
      });
      return res.data;
    },
  });

  const auditQuery = useQuery<AuditLogEntry[]>({
    queryKey: ['admin', 'audit-logs'],
    queryFn: async () => {
      const res = await api.get<{ logs: AuditLogEntry[] }>('/admin/audit-logs');
      return res.data.logs;
    },
    enabled: activeTab === 'audit',
  });

  const meetingsQuery = useQuery<{
    meetings: AdminMeetingEntry[];
    stats: { live: number; scheduled: number; active_participants: number };
  }>({
    queryKey: ['admin', 'meetings'],
    queryFn: async () => {
      const res = await api.get<{
        meetings: AdminMeetingEntry[];
        stats: { live: number; scheduled: number; active_participants: number };
      }>('/admin/meetings');
      return res.data;
    },
    refetchInterval: activeTab === 'meetings' ? 5000 : false,
  });

  const endMeetingMutation = useMutation({
    mutationFn: async (code: string) => {
      await ensureCsrfCookie();
      await api.post(`/meetings/${code}/end`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'meetings'] });
      pushToast('Meeting berhasil diakhiri.', 'default');
    },
    onError: (err) => {
      pushToast(extractErrorMessage(err, 'Gagal mengakhiri meeting.'), 'danger');
    },
  });

  const createMutation = useMutation({
    mutationFn: async () => {
      await ensureCsrfCookie();
      const res = await api.post<{ user: AdminUser }>('/admin/users', {
        name: newName.trim(),
        email: newEmail.trim(),
        password: newPassword,
        role: newRole,
        is_active: true,
      });
      return res.data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setCreateOpen(false);
      setNewName('');
      setNewEmail('');
      setNewPassword('');
      setNewRole('user');
      setFormError('');
      pushToast('Pengguna baru berhasil ditambahkan.', 'success');
    },
    onError: (err) => {
      setFormError(extractErrorMessage(err, 'Gagal menambahkan pengguna.'));
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (payload: {
      id: number;
      name?: string;
      role?: UserRole;
      is_active?: boolean;
      password?: string;
    }) => {
      await ensureCsrfCookie();
      const { id, ...body } = payload;
      const res = await api.patch<{ user: AdminUser }>(`/admin/users/${id}`, body);
      return res.data.user;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      setEditingUser(null);
      pushToast('Data pengguna diperbarui.', 'success');
    },
    onError: (err) => {
      pushToast(extractErrorMessage(err, 'Gagal memperbarui pengguna.'), 'danger');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: number) => {
      await ensureCsrfCookie();
      await api.delete(`/admin/users/${id}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['admin', 'users'] });
      pushToast('Pengguna dihapus.', 'default');
    },
    onError: (err) => {
      pushToast(extractErrorMessage(err, 'Gagal menghapus pengguna.'), 'danger');
    },
  });

  const openEdit = (u: AdminUser) => {
    setEditingUser(u);
    setEditName(u.name);
    setEditRole(u.role);
    setEditPassword('');
  };

  const stats = usersQuery.data?.stats ?? { total: 0, active: 0, inactive: 0, superadmins: 0 };
  const users = usersQuery.data?.users ?? [];

  return (
    <div className="space-y-6">
      <header className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="font-mono text-xs uppercase tracking-widest text-[var(--moss)] dark:text-[var(--moss-light)]">
            Superadmin
          </p>
          <h1 className="font-display text-2xl font-bold sm:text-3xl">Kelola Pengguna</h1>
          <p className="mt-1 text-sm text-[var(--ink-soft)]">
            Atur akun host, peran superadmin, serta status aktif pengguna Meetingkeun.
          </p>
        </div>
        <Button variant="primary" size="lg" onClick={() => setCreateOpen(true)}>
          <Plus className="h-4 w-4" strokeWidth={1.75} />
          <span>Tambah pengguna</span>
        </Button>
      </header>

      {/* Stats Strip */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4" aria-label="Ringkasan pengguna">
        <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-4">
          <span className="text-xs font-medium text-[var(--ink-soft)]">Total Akun</span>
          <p className="mt-1 font-mono text-2xl font-semibold">{stats.total}</p>
        </div>
        <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-4">
          <span className="text-xs font-medium text-[var(--ink-soft)]">Aktif</span>
          <p className="mt-1 font-mono text-2xl font-semibold text-[var(--moss)] dark:text-[var(--moss-light)]">
            {stats.active}
          </p>
        </div>
        <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-4">
          <span className="text-xs font-medium text-[var(--ink-soft)]">Superadmin</span>
          <p className="mt-1 font-mono text-2xl font-semibold">{stats.superadmins}</p>
        </div>
        <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-4">
          <span className="text-xs font-medium text-[var(--ink-soft)]">Nonaktif</span>
          <p className="mt-1 font-mono text-2xl font-semibold text-[var(--clay)]">
            {stats.inactive}
          </p>
        </div>
      </section>

      {/* Tab Switcher */}
      <div className="flex flex-wrap gap-1 rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] p-1 w-fit">
        <button
          type="button"
          onClick={() => setActiveTab('users')}
          className={`inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-[8px] px-4 text-sm font-medium transition-colors ${
            activeTab === 'users'
              ? 'border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]'
              : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          <Users className="h-4 w-4" strokeWidth={1.75} />
          <span>Pengguna</span>
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('meetings')}
          className={`inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-[8px] px-4 text-sm font-medium transition-colors ${
            activeTab === 'meetings'
              ? 'border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]'
              : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          <Video className="h-4 w-4" strokeWidth={1.75} />
          <span>Pantau Meeting</span>
          {(meetingsQuery.data?.stats.live ?? 0) > 0 && (
            <span className="inline-flex h-5 min-w-[20px] items-center justify-center rounded-full bg-[var(--clay-bright)] px-1.5 font-mono text-[11px] font-semibold text-[#F6F2E9]">
              {meetingsQuery.data?.stats.live}
            </span>
          )}
        </button>
        <button
          type="button"
          onClick={() => setActiveTab('audit')}
          className={`inline-flex min-h-[38px] cursor-pointer items-center gap-2 rounded-[8px] px-4 text-sm font-medium transition-colors ${
            activeTab === 'audit'
              ? 'border border-[var(--line)] bg-[var(--paper)] text-[var(--ink)]'
              : 'text-[var(--ink-soft)] hover:text-[var(--ink)]'
          }`}
        >
          <Activity className="h-4 w-4" strokeWidth={1.75} />
          <span>Log Aktivitas</span>
        </button>
      </div>

      {activeTab === 'meetings' ? (
        <div className="space-y-4">
          <div className="grid grid-cols-3 gap-3">
            <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-4">
              <span className="text-xs font-medium text-[var(--ink-soft)]">Sedang Live</span>
              <p className="mt-1 font-mono text-2xl font-semibold text-[var(--clay-bright)]">
                {meetingsQuery.data?.stats.live ?? 0}
              </p>
            </div>
            <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-4">
              <span className="text-xs font-medium text-[var(--ink-soft)]">Terjadwal</span>
              <p className="mt-1 font-mono text-2xl font-semibold">
                {meetingsQuery.data?.stats.scheduled ?? 0}
              </p>
            </div>
            <div className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-4">
              <span className="text-xs font-medium text-[var(--ink-soft)]">Peserta Aktif</span>
              <p className="mt-1 font-mono text-2xl font-semibold text-[var(--moss)] dark:text-[var(--moss-light)]">
                {meetingsQuery.data?.stats.active_participants ?? 0}
              </p>
            </div>
          </div>

          {(meetingsQuery.data?.meetings ?? []).length === 0 ? (
            <div className="rounded-[12px] border border-dashed border-[var(--line)] p-8 text-center text-sm text-[var(--ink-soft)]">
              Belum ada ruang meeting yang sedang berlangsung atau terjadwal.
            </div>
          ) : (
            <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {(meetingsQuery.data?.meetings ?? []).map((m) => (
                <li
                  key={m.id}
                  className="flex flex-col justify-between rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex flex-wrap items-center gap-2">
                      {m.status === 'live' ? (
                        <Chip tone="moss">
                          <span className="h-1.5 w-1.5 rounded-full bg-[var(--clay-bright)]" />
                          Sedang berlangsung
                        </Chip>
                      ) : (
                        <Chip tone="neutral">Terjadwal</Chip>
                      )}
                      {m.locked && <Chip tone="clay">Terkunci</Chip>}
                      <span className="font-mono text-xs text-[var(--ink-soft)]">{m.code}</span>
                    </div>
                    <h3 className="truncate font-display text-lg font-semibold">{m.title}</h3>
                    <p className="text-xs text-[var(--ink-soft)]">
                      Host: <strong className="text-[var(--ink)]">{m.host?.name ?? '-'}</strong> ·{' '}
                      <span className="font-mono">{m.active_participants_count} aktif</span>
                      {m.waiting_participants_count > 0 && (
                        <> · <span className="font-mono text-[var(--clay)]">{m.waiting_participants_count} menunggu</span></>
                      )}
                    </p>
                  </div>

                  <div className="mt-4 flex items-center gap-2">
                    <Link to={`/m/${m.code}`} className="flex-1">
                      <Button variant="primary" className="w-full">
                        <span>Masuk sebagai Moderator</span>
                        <ArrowRight className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                    </Link>
                    <Button
                      variant="outline"
                      size="icon"
                      title="Akhiri ruang ini"
                      aria-label={`Akhiri ${m.title}`}
                      onClick={() => endMeetingMutation.mutate(m.code)}
                      disabled={endMeetingMutation.isPending}
                    >
                      <Power className="h-4 w-4 text-[var(--clay)]" strokeWidth={1.75} />
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </div>
      ) : activeTab === 'audit' ? (
        <div className="overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/30">
          <table className="w-full text-left text-sm">
            <thead className="border-b border-[var(--line)] bg-[var(--paper-2)]/70 text-xs uppercase tracking-wider text-[var(--ink-soft)]">
              <tr>
                <th className="px-4 py-3 font-semibold">Waktu</th>
                <th className="px-4 py-3 font-semibold">Aksi</th>
                <th className="px-4 py-3 font-semibold">Pelaku</th>
                <th className="px-4 py-3 font-semibold">Target</th>
                <th className="px-4 py-3 font-semibold">IP</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {(auditQuery.data ?? []).map((log) => (
                <tr key={log.id} className="hover:bg-[var(--paper-2)]/40">
                  <td className="px-4 py-3 font-mono text-xs text-[var(--ink-soft)]">
                    {formatMeetingDate(log.created_at)}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs font-medium text-[var(--ink)]">
                    {log.action}
                  </td>
                  <td className="px-4 py-3 text-xs">
                    {log.actor ? `${log.actor.name} (${log.actor.email})` : 'Sistem'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--ink-soft)]">
                    {log.target_type ? `${log.target_type}:${log.target_id}` : '-'}
                  </td>
                  <td className="px-4 py-3 font-mono text-xs text-[var(--ink-soft)]">
                    {log.ip_address ?? '-'}
                  </td>
                </tr>
              ))}
              {(auditQuery.data ?? []).length === 0 && !auditQuery.isLoading && (
                <tr>
                  <td colSpan={5} className="px-4 py-8 text-center text-sm text-[var(--ink-soft)]">
                    Belum ada catatan aktivitas.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        <>
      {/* Search */}
      <div className="relative max-w-md">
        <Search
          className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-[var(--ink-soft)]"
          strokeWidth={1.75}
        />
        <input
          type="search"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Cari nama atau email pengguna..."
          className="min-h-[44px] w-full rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] pl-10 pr-3.5 text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)]/70 focus:border-[var(--moss)] focus:bg-[var(--paper)] focus:outline-none"
        />
      </div>

      {/* Desktop Full Table */}
      <div className="hidden overflow-hidden rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/30 md:block">
        <table className="w-full text-left text-sm">
          <thead className="border-b border-[var(--line)] bg-[var(--paper-2)]/70 text-xs uppercase tracking-wider text-[var(--ink-soft)]">
            <tr>
              <th className="px-4 py-3 font-semibold">Pengguna</th>
              <th className="px-4 py-3 font-semibold">Peran</th>
              <th className="px-4 py-3 font-semibold">Status</th>
              <th className="px-4 py-3 font-semibold">Meeting</th>
              <th className="px-4 py-3 font-semibold">Terdaftar</th>
              <th className="px-4 py-3 text-right font-semibold">Aksi</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-[var(--line)]">
            {users.map((u) => {
              const isSelf = u.id === currentUser?.id;
              return (
                <tr key={u.id} className="hover:bg-[var(--paper-2)]/50">
                  <td className="px-4 py-3.5">
                    <p className="font-medium text-[var(--ink)]">
                      {u.name} {isSelf && <span className="font-mono text-xs text-[var(--ink-soft)]">(Anda)</span>}
                    </p>
                    <p className="text-xs text-[var(--ink-soft)]">{u.email}</p>
                  </td>
                  <td className="px-4 py-3.5">
                    <Chip tone={u.role === 'superadmin' ? 'sand' : 'neutral'}>
                      {u.role === 'superadmin' && <ShieldCheck className="h-3 w-3" strokeWidth={1.75} />}
                      {u.role === 'superadmin' ? 'Superadmin' : 'Host / User'}
                    </Chip>
                  </td>
                  <td className="px-4 py-3.5">
                    <Chip tone={u.is_active ? 'moss' : 'clay'}>
                      <span
                        className={`h-1.5 w-1.5 rounded-full ${
                          u.is_active ? 'bg-[var(--moss)] dark:bg-[var(--moss-light)]' : 'bg-[var(--clay)]'
                        }`}
                      />
                      {u.is_active ? 'Aktif' : 'Nonaktif'}
                    </Chip>
                  </td>
                  <td className="px-4 py-3.5 font-mono text-xs text-[var(--ink-soft)]">
                    {u.meetings_count} ruang
                  </td>
                  <td className="px-4 py-3.5 text-xs text-[var(--ink-soft)]">
                    {formatMeetingDate(u.created_at)}
                  </td>
                  <td className="px-4 py-3.5">
                    <div className="flex items-center justify-end gap-1.5">
                      <Button
                        variant="outline"
                        size="icon"
                        title="Edit / Reset sandi"
                        aria-label={`Edit ${u.name}`}
                        onClick={() => openEdit(u)}
                      >
                        <KeyRound className="h-4 w-4" strokeWidth={1.75} />
                      </Button>
                      {!isSelf && (
                        <>
                          <Button
                            variant="outline"
                            size="icon"
                            title={u.is_active ? 'Nonaktifkan akun' : 'Aktifkan akun'}
                            aria-label={u.is_active ? `Nonaktifkan ${u.name}` : `Aktifkan ${u.name}`}
                            onClick={() =>
                              updateMutation.mutate({ id: u.id, is_active: !u.is_active })
                            }
                          >
                            {u.is_active ? (
                              <UserX className="h-4 w-4 text-[var(--clay)]" strokeWidth={1.75} />
                            ) : (
                              <UserCheck className="h-4 w-4 text-[var(--moss)]" strokeWidth={1.75} />
                            )}
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            title="Hapus pengguna"
                            aria-label={`Hapus ${u.name}`}
                            onClick={() => deleteMutation.mutate(u.id)}
                          >
                            <Trash2 className="h-4 w-4 text-[var(--clay)]" strokeWidth={1.75} />
                          </Button>
                        </>
                      )}
                    </div>
                  </td>
                </tr>
              );
            })}
            {users.length === 0 && !usersQuery.isLoading && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-sm text-[var(--ink-soft)]">
                  Tidak ada pengguna yang cocok.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Mobile Cards */}
      <ul className="space-y-3 md:hidden">
        {users.map((u) => {
          const isSelf = u.id === currentUser?.id;
          return (
            <li
              key={u.id}
              className="rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-4 space-y-3"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="min-w-0">
                  <p className="truncate font-medium text-[var(--ink)]">{u.name}</p>
                  <p className="truncate text-xs text-[var(--ink-soft)]">{u.email}</p>
                </div>
                <Chip tone={u.is_active ? 'moss' : 'clay'}>
                  {u.is_active ? 'Aktif' : 'Nonaktif'}
                </Chip>
              </div>
              <div className="flex items-center justify-between gap-2 pt-1">
                <Chip tone={u.role === 'superadmin' ? 'sand' : 'neutral'}>
                  {u.role === 'superadmin' ? 'Superadmin' : 'Host / User'}
                </Chip>
                <div className="flex items-center gap-1.5">
                  <Button variant="outline" size="icon" onClick={() => openEdit(u)} aria-label={`Edit ${u.name}`}>
                    <KeyRound className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                  {!isSelf && (
                    <>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => updateMutation.mutate({ id: u.id, is_active: !u.is_active })}
                        aria-label={u.is_active ? `Nonaktifkan ${u.name}` : `Aktifkan ${u.name}`}
                      >
                        {u.is_active ? (
                          <UserX className="h-4 w-4 text-[var(--clay)]" strokeWidth={1.75} />
                        ) : (
                          <UserCheck className="h-4 w-4 text-[var(--moss)]" strokeWidth={1.75} />
                        )}
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => deleteMutation.mutate(u.id)}
                        aria-label={`Hapus ${u.name}`}
                      >
                        <Trash2 className="h-4 w-4 text-[var(--clay)]" strokeWidth={1.75} />
                      </Button>
                    </>
                  )}
                </div>
              </div>
            </li>
          );
        })}
      </ul>
        </>
      )}

      {/* Create User Sheet */}
      <Sheet open={createOpen} onClose={() => setCreateOpen(false)} title="Tambah pengguna baru">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            createMutation.mutate();
          }}
          className="space-y-4"
        >
          <Input
            label="Nama lengkap"
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="contoh: Budi Santoso"
            required
          />
          <Input
            label="Email"
            type="email"
            value={newEmail}
            onChange={(e) => setNewEmail(e.target.value)}
            placeholder="budi@contoh.com"
            required
          />
          <Input
            label="Kata sandi awal"
            type="password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            placeholder="Minimal 8 karakter"
            required
          />
          <div className="flex flex-col gap-1.5">
            <label htmlFor="new-role" className="text-sm font-medium text-[var(--ink)]">
              Peran akun
            </label>
            <select
              id="new-role"
              value={newRole}
              onChange={(e) => setNewRole(e.target.value as UserRole)}
              className="min-h-[44px] w-full rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3.5 text-sm text-[var(--ink)]"
            >
              <option value="user">Host / User biasa</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>
          {formError && (
            <p className="text-sm text-[var(--clay)]" role="alert">
              {formError}
            </p>
          )}
          <Button type="submit" size="lg" className="w-full" loading={createMutation.isPending}>
            Simpan pengguna
          </Button>
        </form>
      </Sheet>

      {/* Edit User Sheet */}
      <Sheet
        open={Boolean(editingUser)}
        onClose={() => setEditingUser(null)}
        title={editingUser ? `Edit ${editingUser.name}` : 'Edit pengguna'}
      >
        {editingUser && (
          <form
            onSubmit={(e) => {
              e.preventDefault();
              updateMutation.mutate({
                id: editingUser.id,
                name: editName.trim(),
                role: editRole,
                password: editPassword.trim() || undefined,
              });
            }}
            className="space-y-4"
          >
            <Input
              label="Nama lengkap"
              value={editName}
              onChange={(e) => setEditName(e.target.value)}
              required
            />
            <div className="flex flex-col gap-1.5">
              <label htmlFor="edit-role" className="text-sm font-medium text-[var(--ink)]">
                Peran akun
              </label>
              <select
                id="edit-role"
                value={editRole}
                disabled={editingUser.id === currentUser?.id}
                onChange={(e) => setEditRole(e.target.value as UserRole)}
                className="min-h-[44px] w-full rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3.5 text-sm text-[var(--ink)] disabled:opacity-60"
              >
                <option value="user">Host / User biasa</option>
                <option value="superadmin">Superadmin</option>
              </select>
            </div>
            <Input
              label="Reset kata sandi (opsional)"
              type="password"
              value={editPassword}
              onChange={(e) => setEditPassword(e.target.value)}
              placeholder="Kosongkan jika tidak ingin mengubah"
            />
            <Button type="submit" size="lg" className="w-full" loading={updateMutation.isPending}>
              Simpan perubahan
            </Button>
          </form>
        )}
      </Sheet>
    </div>
  );
}
