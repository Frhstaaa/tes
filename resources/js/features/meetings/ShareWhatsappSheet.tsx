import { useEffect, useMemo, useState } from 'react';
import { useMutation, useQuery } from '@tanstack/react-query';
import { CheckCircle2, Copy, ExternalLink, MessageCircle, Send, XCircle } from 'lucide-react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { api, ensureCsrfCookie, extractErrorMessage } from '@/lib/api';
import { buildWhatsAppInvite } from '@/lib/invite';
import { useToastStore } from '@/stores/useToastStore';
import type { Meeting } from '@/types';

interface ShareWhatsappSheetProps {
  meeting: Meeting | null;
  onClose: () => void;
}

interface BroadcastResultItem {
  phone: string;
  success: boolean;
  error: string | null;
}

interface BroadcastResponse {
  sent_count: number;
  failed_count: number;
  total: number;
  results: BroadcastResultItem[];
}

function countValidNumbers(raw: string): number {
  const parts = raw
    .split(/[\s,;]+/)
    .map((p) => p.replace(/\D+/g, ''))
    .filter((d) => d.length >= 9 && d.length <= 15);
  return new Set(parts).size;
}

export function ShareWhatsappSheet({ meeting, onClose }: ShareWhatsappSheetProps) {
  const pushToast = useToastStore((s) => s.push);
  const [recipients, setRecipients] = useState('');
  const [message, setMessage] = useState('');
  const [result, setResult] = useState<BroadcastResponse | null>(null);
  const [error, setError] = useState('');

  const statusQuery = useQuery<{ enabled: boolean; provider: string }>({
    queryKey: ['whatsapp', 'status'],
    queryFn: async () => {
      const res = await api.get<{ enabled: boolean; provider: string }>('/whatsapp/status');
      return res.data;
    },
    enabled: Boolean(meeting),
  });

  useEffect(() => {
    if (meeting) {
      setMessage(buildWhatsAppInvite(meeting));
      setRecipients('');
      setResult(null);
      setError('');
    }
  }, [meeting]);

  const validCount = useMemo(() => countValidNumbers(recipients), [recipients]);

  const broadcastMutation = useMutation({
    mutationFn: async () => {
      if (!meeting) throw new Error('Meeting tidak ditemukan.');
      await ensureCsrfCookie();
      const res = await api.post<BroadcastResponse>(`/meetings/${meeting.code}/share-whatsapp`, {
        recipients,
        message,
      });
      return res.data;
    },
    onSuccess: (data) => {
      setResult(data);
      setError('');
      if (data.sent_count > 0 && data.failed_count === 0) {
        pushToast(`Undangan terkirim ke ${data.sent_count} nomor WhatsApp.`, 'success');
      } else if (data.sent_count > 0) {
        pushToast(`${data.sent_count} terkirim, ${data.failed_count} gagal.`, 'default');
      } else {
        pushToast('Semua pengiriman gagal. Cek detail hasil.', 'danger');
      }
    },
    onError: (err) => {
      setError(extractErrorMessage(err, 'Gagal mengirim broadcast WhatsApp.'));
    },
  });

  if (!meeting) return null;

  const joinUrl = `${window.location.origin}/m/${meeting.code}`;
  const gatewayEnabled = Boolean(statusQuery.data?.enabled);

  const handleCopyLink = async () => {
    await navigator.clipboard.writeText(joinUrl);
    pushToast('Tautan meeting disalin.', 'success');
  };

  const handleCopyInvite = async () => {
    await navigator.clipboard.writeText(message);
    pushToast('Teks undangan disalin.', 'success');
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (validCount === 0) {
      setError('Masukkan minimal 1 nomor WhatsApp yang valid (misal 08123456789).');
      return;
    }
    setError('');
    broadcastMutation.mutate();
  };

  return (
    <Sheet open={Boolean(meeting)} onClose={onClose} title="Bagikan & Broadcast WhatsApp">
      <div className="space-y-4">
        <div className="flex items-center justify-between gap-2 rounded-[14px] border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5">
          <div className="min-w-0">
            <p className="truncate text-sm font-semibold text-[var(--ink)]">{meeting.title}</p>
            <p className="truncate font-mono text-xs text-[var(--ink-soft)]">{joinUrl}</p>
          </div>
          <Button type="button" variant="outline" size="icon" onClick={handleCopyLink} title="Salin tautan">
            <Copy className="h-4 w-4" strokeWidth={1.75} />
          </Button>
        </div>

        {statusQuery.isLoading ? (
          <div className="h-24 animate-pulse rounded-[14px] border border-[var(--line)] bg-[var(--paper)]" />
        ) : gatewayEnabled ? (
          <form onSubmit={handleSubmit} className="space-y-3.5">
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <label htmlFor="wa-recipients" className="text-sm font-medium text-[var(--ink)]">
                  Nomor WhatsApp Tujuan (Broadcast)
                </label>
                <span className="font-mono text-xs text-[var(--moss)] dark:text-[var(--moss-light)]">
                  {validCount} nomor valid
                </span>
              </div>
              <textarea
                id="wa-recipients"
                rows={3}
                value={recipients}
                onChange={(e) => setRecipients(e.target.value)}
                placeholder={'081234567890, 085678901234\natau 1 nomor per baris (maks. 50)'}
                className="w-full rounded-[13px] border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 font-mono text-sm text-[var(--ink)] placeholder:text-[var(--ink-soft)]/70 focus:border-[var(--moss)] focus:outline-none"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="wa-message" className="text-sm font-medium text-[var(--ink)]">
                Pesan Undangan
              </label>
              <textarea
                id="wa-message"
                rows={5}
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                className="w-full rounded-[13px] border border-[var(--line)] bg-[var(--paper)] px-3.5 py-2.5 text-sm text-[var(--ink)] focus:border-[var(--moss)] focus:outline-none"
              />
            </div>

            {error && (
              <p className="text-xs font-medium text-[var(--clay)]" role="alert">
                {error}
              </p>
            )}

            <div className="flex flex-col gap-2 sm:flex-row">
              <Button
                type="submit"
                variant="primary"
                size="lg"
                className="flex-1"
                loading={broadcastMutation.isPending}
              >
                <Send className="h-4 w-4" strokeWidth={1.75} />
                <span>Kirim Broadcast ({validCount})</span>
              </Button>
              <Button type="button" variant="outline" size="lg" onClick={handleCopyInvite}>
                <Copy className="h-4 w-4" strokeWidth={1.75} />
                <span>Salin Teks</span>
              </Button>
            </div>

            {result && (
              <div className="space-y-2 rounded-[14px] border border-[var(--line)] bg-[var(--paper)] p-3">
                <p className="text-xs font-semibold text-[var(--ink)]">
                  Hasil Broadcast: {result.sent_count} terkirim, {result.failed_count} gagal
                </p>
                <ul className="max-h-36 space-y-1.5 overflow-y-auto text-xs">
                  {result.results.map((item) => (
                    <li key={item.phone} className="flex items-center justify-between gap-2">
                      <span className="font-mono text-[var(--ink)]">{item.phone}</span>
                      {item.success ? (
                        <span className="inline-flex items-center gap-1 font-medium text-[var(--moss)] dark:text-[var(--moss-light)]">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          Terkirim
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 truncate text-[var(--clay)]" title={item.error ?? ''}>
                          <XCircle className="h-3.5 w-3.5 shrink-0" />
                          <span className="truncate max-w-[180px]">{item.error || 'Gagal'}</span>
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </form>
        ) : (
          <div className="space-y-3 rounded-[14px] border border-[var(--line)] bg-[var(--paper)] p-4">
            <div className="flex items-start gap-2.5">
              <MessageCircle className="mt-0.5 h-5 w-5 shrink-0 text-[var(--moss)]" strokeWidth={1.75} />
              <div className="space-y-1">
                <p className="text-sm font-semibold text-[var(--ink)]">
                  WhatsApp Gateway belum aktif
                </p>
                <p className="text-xs text-[var(--ink-soft)]">
                  Superadmin dapat mengaktifkan engine WhatsApp Gateway di menu Kelola Pengguna &gt; WhatsApp Gateway agar bisa broadcast otomatis.
                </p>
              </div>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row">
              <a
                href={`https://wa.me/?text=${encodeURIComponent(message)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1"
              >
                <Button type="button" variant="primary" className="w-full">
                  <ExternalLink className="h-4 w-4" strokeWidth={1.75} />
                  <span>Buka WhatsApp</span>
                </Button>
              </a>
              <Button type="button" variant="outline" onClick={handleCopyInvite}>
                <Copy className="h-4 w-4" strokeWidth={1.75} />
                <span>Salin Undangan</span>
              </Button>
            </div>
          </div>
        )}
      </div>
    </Sheet>
  );
}
