import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);
dayjs.locale('tr');

/** Türkçe göreli zaman (gönderi zaman damgası). */
export function formatRelativeTime(ms: number | undefined): string {
  if (ms == null || ms <= 0) return 'Az önce';
  return dayjs(ms).fromNow();
}

export function formatDetailedDateTime(ms: number | undefined): string {
  if (ms == null || ms <= 0) return '';
  return dayjs(ms).format('HH:mm - DD.MM.YYYY');
}

export function formatCompactRelativeTime(ms: number | undefined, nowMs?: number): string {
  if (ms == null || ms <= 0) return 'Az önce';
  const now = nowMs ? dayjs(nowMs) : dayjs();
  const then = dayjs(ms);
  const m = now.diff(then, 'minute');
  if (m < 1) return 'şimdi';
  if (m < 60) return `${m}dk`;
  const h = now.diff(then, 'hour');
  if (h < 24) return `${h}sa`;
  const d = now.diff(then, 'day');
  if (d < 7) return `${d}g`;
  const w = Math.floor(d / 7);
  if (w < 5) return `${w}hf`;
  return then.format('DD.MM');
}

export function defaultHandleFromName(name: string | undefined): string {
  const raw = (name ?? '').replace(/^@/, '').trim().toLowerCase();
  const slug = raw.replace(/\s+/g, '');
  return slug ? `@${slug}` : '@kullanici';
}
