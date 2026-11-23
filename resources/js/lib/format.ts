export function formatMeetingDate(iso: string | null): string {
  if (!iso) return 'Sekarang';
  const date = new Date(iso);
  return new Intl.DateTimeFormat('id-ID', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatTimeOnly(iso: string | null): string {
  if (!iso) return '--:--';
  const date = new Date(iso);
  return new Intl.DateTimeFormat('id-ID', {
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export function formatDuration(startedAt: string | null, endedAt: string | null): string {
  if (!startedAt || !endedAt) return 'Selesai';
  const diffMs = Math.max(0, new Date(endedAt).getTime() - new Date(startedAt).getTime());
  const totalMinutes = Math.round(diffMs / 60000);
  if (totalMinutes < 1) return 'Kurang dari 1 menit';
  if (totalMinutes < 60) return `${totalMinutes} menit`;
  const hours = Math.floor(totalMinutes / 60);
  const mins = totalMinutes % 60;
  return mins > 0 ? `${hours} jam ${mins} menit` : `${hours} jam`;
}

export function extractRoomCode(input: string): string {
  const trimmed = input.trim();
  const match = trimmed.match(/\/m\/([a-z0-9-]+)/i);
  if (match?.[1]) {
    return match[1].toLowerCase();
  }
  return trimmed.toLowerCase();
}
