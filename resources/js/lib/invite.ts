import type { Meeting } from '@/types';
import { formatMeetingDate } from './format';

export function buildWhatsAppInvite(meeting: Meeting, origin = window.location.origin): string {
  const url = `${origin}/m/${meeting.code}`;
  const lines = [
    `*Undangan Meetingkeun*`,
    `Topik: ${meeting.title}`,
    `Waktu: ${meeting.scheduled_at ? formatMeetingDate(meeting.scheduled_at) : 'Sekarang'}`,
    `Kode ruang: ${meeting.code}`,
    `Tautan gabung: ${url}`,
  ];

  if (meeting.requires_passcode) {
    lines.push('Catatan: Ruang ini dilindungi passcode (tanyakan ke host).');
  }

  return lines.join('\n');
}

function toIcsUtc(date: Date): string {
  return date.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}Z$/, 'Z');
}

export function downloadIcsFile(meeting: Meeting, origin = window.location.origin): void {
  const start = meeting.scheduled_at ? new Date(meeting.scheduled_at) : new Date();
  const durationMin = meeting.duration_minutes ?? 60;
  const end = new Date(start.getTime() + durationMin * 60_000);
  const url = `${origin}/m/${meeting.code}`;

  const ics = [
    'BEGIN:VCALENDAR',
    'VERSION:2.0',
    'PRODID:-//Meetingkeun//Tiyas Frahesta//ID',
    'BEGIN:VEVENT',
    `UID:${meeting.code}@meetingkeun`,
    `DTSTAMP:${toIcsUtc(new Date())}`,
    `DTSTART:${toIcsUtc(start)}`,
    `DTEND:${toIcsUtc(end)}`,
    `SUMMARY:${meeting.title.replace(/[\r\n]/g, ' ')}`,
    `DESCRIPTION:Gabung meeting di ${url} (Kode: ${meeting.code})`,
    `LOCATION:${url}`,
    'END:VEVENT',
    'END:VCALENDAR',
  ].join('\r\n');

  const blob = new Blob([ics], { type: 'text/calendar;charset=utf-8' });
  const link = document.createElement('a');
  link.href = URL.createObjectURL(blob);
  link.download = `meetingkeun-${meeting.code}.ics`;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(link.href);
}

export function getGoogleCalendarUrl(meeting: Meeting, origin = window.location.origin): string {
  const start = meeting.scheduled_at ? new Date(meeting.scheduled_at) : new Date();
  const durationMin = meeting.duration_minutes ?? 60;
  const end = new Date(start.getTime() + durationMin * 60_000);
  const url = `${origin}/m/${meeting.code}`;

  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: meeting.title,
    dates: `${toIcsUtc(start)}/${toIcsUtc(end)}`,
    details: `Gabung Meetingkeun di: ${url}\nKode ruang: ${meeting.code}`,
    location: url,
  });

  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
