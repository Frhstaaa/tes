import { useState } from 'react';
import { Clock } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { Empty, EmptyDescription, EmptyMedia, EmptyTitle } from '@/components/ui/empty';
import { Skeleton } from '@/components/ui/skeleton';
import { Pagination } from '@/components/ui/Pagination';
import { useMeetingsPaginated } from '@/features/meetings/useMeetings';
import { formatDuration, formatMeetingDate } from '@/lib/format';

const PER_PAGE = 10;

export function HistoryPage() {
  const [page, setPage] = useState(1);
  const { data, isLoading, isFetching } = useMeetingsPaginated('history', page, PER_PAGE);
  const meetings = data?.meetings ?? [];
  const meta = data?.meta;

  return (
    <div className="flex flex-col gap-6">
      <header>
        <h1 className="font-display text-2xl font-bold md:text-3xl">Riwayat</h1>
        <p className="text-sm text-muted-foreground">Meeting yang sudah selesai atau dibatalkan.</p>
      </header>

      {isLoading ? (
        <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
          {[1, 2, 3, 4].map((i) => (
            <Skeleton key={i} className="h-22 rounded-xl" />
          ))}
        </div>
      ) : meetings.length === 0 ? (
        <Empty>
          <EmptyMedia>
            <Clock className="size-5" />
          </EmptyMedia>
          <EmptyTitle>Belum ada riwayat meeting</EmptyTitle>
          <EmptyDescription>Meeting yang sudah selesai atau dibatalkan akan muncul di sini.</EmptyDescription>
        </Empty>
      ) : (
        <div className="flex flex-col gap-5">
          <ul className="grid grid-cols-1 gap-3 md:grid-cols-2">
            {meetings.map((m) => (
              <li key={m.id}>
                <Card>
                  <CardContent className="flex items-center justify-between gap-4 pt-5">
                    <div className="min-w-0 flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h2 className="truncate font-medium text-foreground">{m.title}</h2>
                        <Badge variant={m.status === 'cancelled' ? 'destructive' : 'outline'}>
                          {m.status === 'cancelled' ? 'Dibatalkan' : 'Selesai'}
                        </Badge>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        {formatMeetingDate(m.ended_at ?? m.created_at)} ·{' '}
                        <span className="font-mono">{m.code}</span>
                      </p>
                    </div>
                    <div className="shrink-0 text-right text-xs text-muted-foreground">
                      <span className="block font-mono font-medium text-foreground">
                        {formatDuration(m.started_at, m.ended_at)}
                      </span>
                      {typeof m.participant_count === 'number' && (
                        <span>{m.participant_count} peserta</span>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>

          {meta && (
            <Pagination
              currentPage={meta.current_page}
              lastPage={meta.last_page}
              total={meta.total}
              perPage={meta.per_page}
              onPageChange={(next) => {
                setPage(next);
                window.scrollTo({ top: 0, behavior: 'smooth' });
              }}
              isFetching={isFetching}
            />
          )}
        </div>
      )}
    </div>
  );
}
