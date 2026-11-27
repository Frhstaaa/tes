import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { Activity, ArrowRight, KeyRound, MessageCircle, Plus, Power, Search, Send, ShieldCheck, Trash2, UserCheck, Users, UserX, Video } from 'lucide-react';
import { api, ensureCsrfCookie, extractErrorMessage } from '@/lib/api';
import type { AdminMeetingEntry, AdminUser, AuditLogEntry, UserRole } from '@/types';
import { useAuth } from '@/features/auth/useAuth';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { Chip } from '@/components/ui/Chip';
import { Sheet } from '@/components/ui/Sheet';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Select } from '@/components/ui/select';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
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

  const [activeTab, setActiveTab] = useState<'users' | 'meetings' | 'audit' | 'whatsapp'>('users');
  const [search, setSearch] = useState('');
  const [createOpen, setCreateOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<AdminUser | null>(null);

  // WhatsApp Gateway settings state
  const [waEnabled, setWaEnabled] = useState(false);
  const [waProvider, setWaProvider] = useState<'mardira' | 'fonnte' | 'wablas' | 'waha' | 'custom'>('mardira');
  const [waApiUrl, setWaApiUrl] = useState('http://127.0.0.1:8001/api/v1/messages/send');
  const [waApiKey, setWaApiKey] = useState('');
  const [waSession, setWaSession] = useState('');
  const [waTestPhone, setWaTestPhone] = useState('');
  const [waQuotaInfo, setWaQuotaInfo] = useState<{
    workspace?: { name?: string };
    plan?: { name?: string; status?: string };
    quota?: { remaining?: number; monthly_total?: number };
    devices?: { connected?: number; total?: number };
  } | null>(null);

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

  const waQuery = useQuery<{
    enabled: boolean;
    provider: 'mardira' | 'fonnte' | 'wablas' | 'waha' | 'custom';
    api_url: string;
    session: string;
    api_key_set: boolean;
    api_key_preview: string;
  }>({
    queryKey: ['admin', 'whatsapp'],
    queryFn: async () => {
      const res = await api.get<{
        whatsapp: {
          enabled: boolean;
          provider: 'mardira' | 'fonnte' | 'wablas' | 'waha' | 'custom';
          api_url: string;
          session: string;
          api_key_set: boolean;
          api_key_preview: string;
        };
      }>('/admin/whatsapp');
      return res.data.whatsapp;
    },
    enabled: activeTab === 'whatsapp',
  });

  useEffect(() => {
    if (waQuery.data) {
      setWaEnabled(waQuery.data.enabled);
      setWaProvider(waQuery.data.provider);
      setWaApiUrl(waQuery.data.api_url || (waQuery.data.provider === 'mardira' ? 'http://127.0.0.1:8001/api/v1/messages/send' : ''));
      setWaSession(waQuery.data.session || '');
    }
  }, [waQuery.data]);

  const saveWaMutation = useMutation({
    mutationFn: async () => {
      await ensureCsrfCookie();
      const res = await api.put('/admin/whatsapp', {
        enabled: waEnabled,
        provider: waProvider,
        api_url: waApiUrl.trim() || null,
        api_key: waApiKey.trim() || undefined,
        session: waSession.trim() || '',
      });
      return res.data;
    },
    onSuccess: () => {
      setWaApiKey('');
      queryClient.invalidateQueries({ queryKey: ['admin', 'whatsapp'] });
      queryClient.invalidateQueries({ queryKey: ['whatsapp', 'status'] });
      pushToast('Pengaturan WhatsApp Gateway disimpan.', 'success');
    },
    onError: (err) => {
      pushToast(extractErrorMessage(err, 'Gagal menyimpan pengaturan WhatsApp Gateway.'), 'danger');
    },
  });

  const testWaMutation = useMutation({
    mutationFn: async () => {
      await ensureCsrfCookie();
      const res = await api.post<{ message: string }>('/admin/whatsapp/test', {
        phone: waTestPhone.trim(),
      });
      return res.data;
    },
    onSuccess: (data) => {
      pushToast(data.message || 'Pesan tes terkirim.', 'success');
    },
    onError: (err) => {
      pushToast(extractErrorMessage(err, 'Gagal mengirim pesan tes WhatsApp.'), 'danger');
    },
  });

  const quotaWaMutation = useMutation({
    mutationFn: async () => {
      const res = await api.get('/admin/whatsapp/quota');
      return res.data;
    },
    onSuccess: (data) => {
      setWaQuotaInfo(data);
      pushToast('Status & kuota MARDIRA WA berhasil dimuat.', 'success');
    },
    onError: (err) => {
      pushToast(extractErrorMessage(err, 'Gagal mengecek kuota MARDIRA WA.'), 'danger');
    },
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
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-medium">Total Akun</CardDescription>
            <CardTitle className="font-mono text-2xl font-semibold">{stats.total}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-medium">Aktif</CardDescription>
            <CardTitle className="font-mono text-2xl font-semibold text-primary">
              {stats.active}
            </CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-medium">Superadmin</CardDescription>
            <CardTitle className="font-mono text-2xl font-semibold">{stats.superadmins}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-1">
            <CardDescription className="text-xs font-medium">Nonaktif</CardDescription>
            <CardTitle className="font-mono text-2xl font-semibold text-destructive">
              {stats.inactive}
            </CardTitle>
          </CardHeader>
        </Card>
      </section>

      {/* Tab Switcher */}
      <Tabs value={activeTab} onValueChange={(v) => setActiveTab(v as typeof activeTab)}>
        <TabsList className="w-fit">
          <TabsTrigger value="users">
            <Users className="size-4" strokeWidth={1.75} />
            <span>Pengguna</span>
          </TabsTrigger>
          <TabsTrigger value="meetings">
            <Video className="size-4" strokeWidth={1.75} />
            <span>Pantau Meeting</span>
            {(meetingsQuery.data?.stats.live ?? 0) > 0 && (
              <Badge variant="destructive" className="h-5 min-w-5 rounded-full px-1.5 font-mono text-[11px]">
                {meetingsQuery.data?.stats.live}
              </Badge>
            )}
          </TabsTrigger>
          <TabsTrigger value="audit">
            <Activity className="size-4" strokeWidth={1.75} />
            <span>Log Aktivitas</span>
          </TabsTrigger>
          <TabsTrigger value="whatsapp">
            <MessageCircle className="size-4" strokeWidth={1.75} />
            <span>WhatsApp Gateway</span>
          </TabsTrigger>
        </TabsList>
      </Tabs>

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
      ) : activeTab === 'whatsapp' ? (
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
          <form
            onSubmit={(e) => {
              e.preventDefault();
              saveWaMutation.mutate();
            }}
            className="space-y-4 rounded-[20px] border border-[var(--line)] bg-[var(--paper-2)] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] lg:col-span-7"
          >
            <div className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3">
              <div>
                <h2 className="font-display text-lg font-bold">Engine WhatsApp Gateway</h2>
                <p className="text-xs text-[var(--ink-soft)]">
                  Aktifkan agar semua user bisa kirim &amp; broadcast tautan meeting otomatis via WhatsApp.
                </p>
              </div>
              <label className="inline-flex cursor-pointer items-center gap-2">
                <input
                  type="checkbox"
                  checked={waEnabled}
                  onChange={(e) => setWaEnabled(e.target.checked)}
                  className="h-5 w-5 accent-[var(--moss)]"
                />
                <span className="text-sm font-semibold">{waEnabled ? 'Aktif' : 'Nonaktif'}</span>
              </label>
            </div>

            <Select
              id="wa-provider"
              label="Provider / Engine Gateway"
              value={waProvider}
              onChange={(e) => {
                const p = e.target.value as 'mardira' | 'fonnte' | 'wablas' | 'waha' | 'custom';
                setWaProvider(p);
                const defaults: Record<string, string> = {
                  mardira: 'http://127.0.0.1:8001/api/v1/messages/send',
                  fonnte: 'https://api.fonnte.com/send',
                  wablas: 'https://solo.wablas.com/api/send-message',
                  waha: 'http://127.0.0.1:3000/api/sendText',
                  custom: '',
                };
                if (!waApiUrl || Object.values(defaults).includes(waApiUrl)) {
                  setWaApiUrl(defaults[p]);
                }
              }}
            >
              <option value="mardira">MARDIRA WA Gateway (v1.0 Bearer)</option>
              <option value="fonnte">Fonnte (api.fonnte.com)</option>
              <option value="wablas">Wablas</option>
              <option value="waha">WAHA (Self-hosted Docker/HTTP)</option>
              <option value="custom">Custom HTTP JSON Webhook</option>
            </Select>

            <Input
              label="URL Endpoint API"
              placeholder="http://127.0.0.1:8001/api/v1/messages/send"
              value={waApiUrl}
              onChange={(e) => setWaApiUrl(e.target.value)}
              hint={
                waProvider === 'mardira'
                  ? 'Bisa isi Base URL (http://127.0.0.1:8001) atau endpoint penuh (/api/v1/messages/send).'
                  : undefined
              }
            />

            <Input
              label="API Key / Bearer Token"
              type="password"
              placeholder={
                waQuery.data?.api_key_set
                  ? `Tersimpan (${waQuery.data.api_key_preview}) — kosongkan jika tidak diubah`
                  : 'bk_live_...'
              }
              value={waApiKey}
              onChange={(e) => setWaApiKey(e.target.value)}
            />

            <Input
              label="Device ID / Session (Opsional)"
              placeholder={waProvider === 'mardira' ? 'Kosongkan untuk pakai device default token' : 'default'}
              value={waSession}
              onChange={(e) => setWaSession(e.target.value)}
              hint={
                waProvider === 'mardira'
                  ? 'Isi angka device_id jika ingin memilih perangkat tertentu, atau kosongkan.'
                  : 'Dipakai oleh WAHA atau gateway multi-device.'
              }
            />

            <div className="flex flex-wrap gap-2">
              <Button type="submit" variant="primary" size="lg" loading={saveWaMutation.isPending}>
                Simpan Pengaturan Gateway
              </Button>
              {waProvider === 'mardira' && (
                <Button
                  type="button"
                  variant="outline"
                  size="lg"
                  onClick={() => quotaWaMutation.mutate()}
                  loading={quotaWaMutation.isPending}
                >
                  Cek Kuota &amp; Status
                </Button>
              )}
            </div>

            {waQuotaInfo && waProvider === 'mardira' && (
              <Alert variant="success">
                <AlertTitle className="flex items-center gap-2 text-xs">
                  <span>{waQuotaInfo.workspace?.name ?? 'MARDIRA WA Workspace'}</span>
                  <Badge variant="success">{waQuotaInfo.plan?.name ?? 'Active'}</Badge>
                </AlertTitle>
                <AlertDescription>
                  Sisa kuota:{' '}
                  <span className="font-mono font-semibold text-foreground">
                    {waQuotaInfo.quota?.remaining ?? 0} / {waQuotaInfo.quota?.monthly_total ?? 0}
                  </span>{' '}
                  · Perangkat terhubung:{' '}
                  <span className="font-mono font-semibold text-foreground">
                    {waQuotaInfo.devices?.connected ?? 0}/{waQuotaInfo.devices?.total ?? 0}
                  </span>
                </AlertDescription>
              </Alert>
            )}
          </form>

          <form
            onSubmit={(e) => {
              e.preventDefault();
              if (!waTestPhone.trim()) return;
              testWaMutation.mutate();
            }}
            className="space-y-4 rounded-[20px] border border-[var(--line)] bg-[var(--paper-2)] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)] lg:col-span-5 h-fit"
          >
            <div>
              <h2 className="font-display text-lg font-bold">Uji Kirim Pesan</h2>
              <p className="text-xs text-[var(--ink-soft)]">
                Simpan pengaturan terlebih dahulu, lalu kirim pesan tes ke nomor WhatsApp Anda.
              </p>
            </div>
            <Input
              label="Nomor WhatsApp Tujuan"
              placeholder="081234567890"
              value={waTestPhone}
              onChange={(e) => setWaTestPhone(e.target.value)}
              required
            />
            <Button type="submit" variant="outline" size="lg" className="w-full" loading={testWaMutation.isPending}>
              <Send className="h-4 w-4" strokeWidth={1.75} />
              <span>Kirim Pesan Tes</span>
            </Button>
          </form>
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
