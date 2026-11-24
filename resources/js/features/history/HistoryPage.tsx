import { Chip } from '@/components/ui/Chip';
import { useMeetings } from '@/features/meetings/useMeetings';
import { formatDuration, formatMeetingDate } from '@/lib/format';

export function HistoryPage() {
  const { data: meetings = [], isLoading } = useMeetings('history');

  return (
    <div className="space-y-6">
      <header>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Riwayat</h1>
        <p className="text-sm text-[var(--ink-soft)]">Meeting yang sudah selesai atau dibatalkan.</p>
      </header>

      {isLoading ? (
        <div className="space-y-3">
          {[1, 2, 3].map((i) => (
            <div key={i} className="h-20 animate-pulse rounded-[12px] border border-[var(--line)] bg-[var(--paper-2)]" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <div className="rounded-[20px] border border-[var(--line)] bg-[var(--paper-2)] p-8 text-center shadow-[0_10px_28px_rgba(15,23,42,0.04)]">
          <p className="text-sm text-[var(--ink-soft)]">Belum ada riwayat meeting.</p>
        </div>
      ) : (
        <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {meetings.map((m) => (
            <li
              key={m.id}
              className="flex items-center justify-between gap-4 rounded-[20px] border border-[var(--line)] bg-[var(--paper-2)] p-5 shadow-[0_10px_28px_rgba(15,23,42,0.04)]"
            >
              <div className="min-w-0 space-y-1">
                <div className="flex items-center gap-2">
                  <h2 className="truncate font-medium text-[var(--ink)]">{m.title}</h2>
                  <Chip tone={m.status === 'cancelled' ? 'clay' : 'neutral'}>
                    {m.status === 'cancelled' ? 'Dibatalkan' : 'Selesai'}
                  </Chip>
                </div>
                <p className="text-xs text-[var(--ink-soft)]">
                  {formatMeetingDate(m.ended_at ?? m.created_at)} ·{' '}
                  <span className="font-mono">{m.code}</span>
                </p>
              </div>
              <div className="shrink-0 text-right text-xs text-[var(--ink-soft)]">
                <span className="block font-mono font-medium text-[var(--ink)]">
                  {formatDuration(m.started_at, m.ended_at)}
                </span>
                {typeof m.participant_count === 'number' && (
                  <span>{m.participant_count} peserta</span>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
