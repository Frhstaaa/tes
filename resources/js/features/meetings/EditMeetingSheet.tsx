import { useEffect, useState } from 'react';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import type { Meeting } from '@/types';
import { useUpdateMeeting } from './useMeetings';
import { extractErrorMessage } from '@/lib/api';
import { useToastStore } from '@/stores/useToastStore';

interface EditMeetingSheetProps {
  meeting: Meeting | null;
  onClose: () => void;
}

function toLocalDateTimeInput(iso: string | null): string {
  if (!iso) return '';
  const d = new Date(iso);
  const pad = (n: number) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function EditMeetingSheet({ meeting, onClose }: EditMeetingSheetProps) {
  const updateMeeting = useUpdateMeeting();
  const pushToast = useToastStore((s) => s.push);

  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('60');
  const [passcode, setPasscode] = useState('');
  const [clearPasscode, setClearPasscode] = useState(false);
  const [lobbyEnabled, setLobbyEnabled] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!meeting) return;
    setTitle(meeting.title);
    setScheduledAt(toLocalDateTimeInput(meeting.scheduled_at));
    setDuration(String(meeting.duration_minutes ?? 60));
    setLobbyEnabled(meeting.lobby_enabled);
    setPasscode('');
    setClearPasscode(false);
    setError('');
  }, [meeting]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!meeting) return;
    setError('');

    try {
      await updateMeeting.mutateAsync({
        code: meeting.code,
        title: title.trim() || meeting.title,
        scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : undefined,
        duration_minutes: Number(duration) || 60,
        passcode: passcode.trim() || undefined,
        clear_passcode: clearPasscode,
        lobby_enabled: lobbyEnabled,
      });
      pushToast('Jadwal meeting diperbarui.', 'success');
      onClose();
    } catch (err) {
      setError(extractErrorMessage(err, 'Gagal memperbarui jadwal.'));
    }
  };

  return (
    <Sheet open={Boolean(meeting)} onClose={onClose} title="Edit jadwal meeting">
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Judul meeting"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          required
        />

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <Input
            label="Tanggal & jam"
            type="datetime-local"
            value={scheduledAt}
            onChange={(e) => setScheduledAt(e.target.value)}
          />
          <Input
            label="Durasi (menit)"
            type="number"
            min={5}
            max={480}
            value={duration}
            onChange={(e) => setDuration(e.target.value)}
          />
        </div>

        <Input
          label="Ganti passcode (opsional)"
          placeholder="Kosongkan jika tidak berubah"
          value={passcode}
          disabled={clearPasscode}
          onChange={(e) => setPasscode(e.target.value)}
        />

        {meeting?.requires_passcode && (
          <label className="flex cursor-pointer items-center gap-2.5 text-sm text-[var(--ink-soft)]">
            <input
              type="checkbox"
              checked={clearPasscode}
              onChange={(e) => setClearPasscode(e.target.checked)}
              className="h-4 w-4 accent-[var(--clay)]"
            />
            <span>Hapus passcode ruang ini</span>
          </label>
        )}

        <label className="flex min-h-[44px] cursor-pointer items-center justify-between rounded-[10px] border border-[var(--line)] bg-[var(--paper-2)] px-3.5 py-2.5">
          <div>
            <span className="block text-sm font-medium text-[var(--ink)]">Aktifkan ruang tunggu</span>
            <span className="block text-xs text-[var(--ink-soft)]">
              Host harus menyetujui tamu sebelum masuk
            </span>
          </div>
          <input
            type="checkbox"
            checked={lobbyEnabled}
            onChange={(e) => setLobbyEnabled(e.target.checked)}
            className="h-5 w-5 accent-[var(--moss)]"
          />
        </label>

        {error && (
          <p className="text-sm text-[var(--clay)]" role="alert">
            {error}
          </p>
        )}

        <Button type="submit" size="lg" className="w-full" loading={updateMeeting.isPending}>
          Simpan perubahan
        </Button>
      </form>
    </Sheet>
  );
}
