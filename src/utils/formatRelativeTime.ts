import dayjs from 'dayjs';
import 'dayjs/locale/tr';
import 'dayjs/locale/en';
import relativeTime from 'dayjs/plugin/relativeTime';

dayjs.extend(relativeTime);

export type AppLocale = 'tr' | 'en';

function withLocale(locale: AppLocale | undefined) {
  dayjs.locale(locale === 'en' ? 'en' : 'tr');
}

/** Göreli zaman (gönderi zaman damgası). */
export function formatRelativeTime(ms: number | undefined, locale?: AppLocale): string {
  withLocale(locale);
  if (ms == null || ms <= 0) return locale === 'en' ? 'Just now' : 'Az önce';
  return dayjs(ms).fromNow();
}

export function formatDetailedDateTime(ms: number | undefined, locale?: AppLocale): string {
  withLocale(locale);
  if (ms == null || ms <= 0) return '';
  return dayjs(ms).format('HH:mm - DD.MM.YYYY');
}

export function formatCompactRelativeTime(
  ms: number | undefined,
  nowMs?: number,
  locale?: AppLocale,
): string {
  withLocale(locale);
  if (ms == null || ms <= 0) return locale === 'en' ? 'Just now' : 'Az önce';
  const now = nowMs ? dayjs(nowMs) : dayjs();
  const then = dayjs(ms);
  const m = now.diff(then, 'minute');
  if (m < 1) return locale === 'en' ? 'now' : 'şimdi';
  if (m < 60) return locale === 'en' ? `${m}m` : `${m}dk`;
  const h = now.diff(then, 'hour');
  if (h < 24) return locale === 'en' ? `${h}h` : `${h}sa`;
  const d = now.diff(then, 'day');
  if (d < 7) return locale === 'en' ? `${d}d` : `${d}g`;
  const w = Math.floor(d / 7);
  if (w < 5) return locale === 'en' ? `${w}w` : `${w}hf`;
  return then.format('DD.MM');
}

export function defaultHandleFromName(name: string | undefined): string {
  const raw = (name ?? '').replace(/^@/, '').trim().toLowerCase();
  const slug = raw.replace(/\s+/g, '');
  return slug ? `@${slug}` : '@kullanici';
}

export function appLocaleFromI18n(lang: string | undefined): AppLocale {
  return lang?.startsWith('en') ? 'en' : 'tr';
}
