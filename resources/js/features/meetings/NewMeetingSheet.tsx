import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sheet } from '@/components/ui/Sheet';
import { Button } from '@/components/ui/Button';
import { Input } from '@/components/ui/Input';
import { useCreateMeeting } from './useMeetings';
import { extractErrorMessage } from '@/lib/api';
import { useToastStore } from '@/stores/useToastStore';

interface NewMeetingSheetProps {
  open: boolean;
  onClose: () => void;
  defaultMode?: 'instant' | 'scheduled';
}

export function NewMeetingSheet({ open, onClose, defaultMode = 'scheduled' }: NewMeetingSheetProps) {
  const navigate = useNavigate();
  const pushToast = useToastStore((s) => s.push);
  const createMeeting = useCreateMeeting();

  const [title, setTitle] = useState('');
  const [scheduledAt, setScheduledAt] = useState('');
  const [duration, setDuration] = useState('60');
  const [passcode, setPasscode] = useState('');
  const [lobbyEnabled, setLobbyEnabled] = useState(defaultMode === 'scheduled');
  const [error, setError] = useState('');

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');

    if (defaultMode === 'scheduled' && !scheduledAt) {
      setError('Tanggal dan jam meeting wajib diisi.');
      return;
    }

    try {
      const meeting = await createMeeting.mutateAsync({
        type: defaultMode,
        title: title.trim() || undefined,
        scheduled_at: defaultMode === 'scheduled' ? new Date(scheduledAt).toISOString() : undefined,
        duration_minutes: Number(duration) || 60,
        passcode: passcode.trim() || undefined,
        lobby_enabled: lobbyEnabled,
      });

      onClose();
      setTitle('');
      setPasscode('');
      setScheduledAt('');

      if (defaultMode === 'instant') {
        navigate(`/m/${meeting.code}`);
      } else {
        pushToast('Jadwal meeting berhasil dibuat.', 'success');
      }
    } catch (err) {
      setError(extractErrorMessage(err, 'Gagal membuat meeting.'));
    }
  };

  return (
    <Sheet
      open={open}
      onClose={onClose}
      title={defaultMode === 'instant' ? 'Buat meeting instan' : 'Jadwalkan meeting'}
    >
      <form onSubmit={handleSubmit} className="space-y-4">
        <Input
          label="Judul meeting"
          placeholder={defaultMode === 'instant' ? 'contoh: Sinkronisasi cepat' : 'contoh: Review mingguan'}
          value={title}
          onChange={(e) => setTitle(e.target.value)}
        />

        {defaultMode === 'scheduled' && (
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <Input
              label="Tanggal & jam"
              type="datetime-local"
              value={scheduledAt}
              onChange={(e) => setScheduledAt(e.target.value)}
            />
            <Input
              label="Perkiraan durasi (menit)"
              type="number"
              min={5}
              max={480}
              value={duration}
              onChange={(e) => setDuration(e.target.value)}
            />
          </div>
        )}

        <Input
          label="Passcode (opsional)"
          placeholder="Minimal 4 karakter jika diisi"
          value={passcode}
          onChange={(e) => setPasscode(e.target.value)}
          hint="Kosongkan jika siapa saja dengan tautan boleh masuk."
        />

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

        <Button type="submit" size="lg" className="w-full" loading={createMeeting.isPending}>
          {defaultMode === 'instant' ? 'Buat & buka pra-join' : 'Simpan jadwal'}
        </Button>
      </form>
    </Sheet>
  );
}
