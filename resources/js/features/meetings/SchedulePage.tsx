import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Calendar, CalendarPlus, Copy, Edit3, Lock, MessageSquare, Share2, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { useCancelMeeting, useMeetings } from './useMeetings';
import { NewMeetingSheet } from './NewMeetingSheet';
import { EditMeetingSheet } from './EditMeetingSheet';
import { formatMeetingDate } from '@/lib/format';
import { buildWhatsAppInvite, downloadIcsFile, getGoogleCalendarUrl } from '@/lib/invite';
import { useToastStore } from '@/stores/useToastStore';
import type { Meeting } from '@/types';

export function SchedulePage() {
  const pushToast = useToastStore((s) => s.push);
  const { data: meetings = [], isLoading } = useMeetings('upcoming');
  const cancelMeeting = useCancelMeeting();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editingMeeting, setEditingMeeting] = useState<Meeting | null>(null);

  const handleShare = async (code: string, title: string) => {
    const url = `${window.location.origin}/m/${code}`;
    if (navigator.share) {
      try {
        await navigator.share({ title, url });
        return;
      } catch {
        // Fallback to clipboard
      }
    }
    await navigator.clipboard.writeText(url);
    pushToast('Tautan meeting disalin.', 'success');
  };

  const handleCopyInvite = async (m: Meeting) => {
    await navigator.clipboard.writeText(buildWhatsAppInvite(m));
    pushToast('Undangan format WhatsApp disalin.', 'success');
  };

  const handleCancel = async (code: string) => {
    await cancelMeeting.mutateAsync(code);
    pushToast('Meeting dibatalkan.', 'default');
  };

  return (
    <div className="space-y-6">
      <header className="flex items-center justify-between gap-4">
        <div>
          <h1 className="font-display text-2xl font-bold md:text-3xl">Jadwal</h1>
          <p className="text-sm text-[var(--ink-soft)]">Meeting mendatang dan yang sedang aktif.</p>
        </div>
        <Button variant="primary" onClick={() => setSheetOpen(true)}>
          <CalendarPlus className="h-4 w-4" strokeWidth={1.75} />
          <span>Buat jadwal</span>
        </Button>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2].map((i) => (
            <div key={i} className="h-28 animate-pulse rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="rounded-[12px] border border-dashed border-[var(--line)] p-8 text-center">
          <p className="text-sm text-[var(--ink-soft)]">Belum ada meeting terjadwal.</p>
          <Button variant="outline" className="mt-3" onClick={() => setSheetOpen(true)}>
            Buat jadwal pertama
          </Button>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
          {meetings.map((m) => (
            <li
              key={m.id}
              className="flex flex-col justify-between rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]/50 p-4"
            >
              <div className="space-y-1.5">
                <div className="flex flex-wrap items-center gap-2">
                  {m.status === 'live' ? (
                    <Chip tone="moss">Berlangsung</Chip>
                  ) : (
                    <Chip tone="neutral">Terjadwal</Chip>
                  )}
                  {m.requires_passcode && (
                    <Chip tone="sand">
                      <Lock className="h-3 w-3" strokeWidth={1.75} />
                      Passcode
                    </Chip>
                  )}
                  {m.lobby_enabled && <Chip tone="neutral">Lobby</Chip>}
                </div>
                <h2 className="truncate font-display text-lg font-semibold">{m.title}</h2>
                <p className="text-xs text-[var(--ink-soft)]">
                  {formatMeetingDate(m.scheduled_at)} ·{' '}
                  <span className="font-mono font-medium text-[var(--ink)]">{m.code}</span>
                </p>
              </div>

              <div className="mt-4 space-y-2">
                <div className="flex items-center gap-2">
                  <Link to={`/m/${m.code}`} className="flex-1">
                    <Button variant="primary" className="w-full">
                      Masuk ruang
                    </Button>
                  </Link>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Bagikan tautan"
                    aria-label="Salin tautan"
                    onClick={() => handleShare(m.code, m.title)}
                  >
                    {typeof navigator !== 'undefined' && 'share' in navigator ? (
                      <Share2 className="h-4 w-4" strokeWidth={1.75} />
                    ) : (
                      <Copy className="h-4 w-4" strokeWidth={1.75} />
                    )}
                  </Button>
                  <Button
                    variant="outline"
                    size="icon"
                    title="Edit jadwal"
                    aria-label={`Edit ${m.title}`}
                    onClick={() => setEditingMeeting(m)}
                  >
                    <Edit3 className="h-4 w-4" strokeWidth={1.75} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    title="Batalkan meeting"
                    aria-label="Batalkan meeting"
                    onClick={() => handleCancel(m.code)}
                    disabled={cancelMeeting.isPending}
                  >
                    <Trash2 className="h-4 w-4 text-[var(--clay)]" strokeWidth={1.75} />
                  </Button>
                </div>

                {/* Invite & Calendar row */}
                <div className="flex flex-wrap items-center gap-2 border-t border-[var(--line)] pt-2.5 text-xs">
                  <button
                    type="button"
                    onClick={() => handleCopyInvite(m)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 font-medium text-[var(--ink)] hover:bg-[var(--paper-2)]"
                  >
                    <MessageSquare className="h-3.5 w-3.5 text-[var(--moss)]" strokeWidth={1.75} />
                    <span>Salin undangan</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => downloadIcsFile(m)}
                    className="inline-flex cursor-pointer items-center gap-1 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 font-medium text-[var(--ink)] hover:bg-[var(--paper-2)]"
                  >
                    <Calendar className="h-3.5 w-3.5 text-[var(--ink-soft)]" strokeWidth={1.75} />
                    <span>.ics</span>
                  </button>
                  <a
                    href={getGoogleCalendarUrl(m)}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1 rounded-[8px] border border-[var(--line)] bg-[var(--paper)] px-2.5 py-1.5 font-medium text-[var(--ink)] hover:bg-[var(--paper-2)]"
                  >
                    <span>Google Calendar</span>
                  </a>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      <NewMeetingSheet open={sheetOpen} onClose={() => setSheetOpen(false)} defaultMode="scheduled" />
      <EditMeetingSheet meeting={editingMeeting} onClose={() => setEditingMeeting(null)} />
    </div>
  );
}
