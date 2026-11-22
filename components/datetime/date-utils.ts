export interface TimeValue {
  hours: number;
  minutes: number;
}

export const DAY_MS = 86_400_000;

export function startOfDay(d: Date): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate());
}

export function today(): Date {
  return startOfDay(new Date());
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

export function addMonths(d: Date, n: number): Date {
  const y = d.getFullYear();
  const m = d.getMonth() + n;
  const last = daysInMonth(y + Math.floor(m / 12), ((m % 12) + 12) % 12);
  return new Date(y, m, Math.min(d.getDate(), last));
}

export function addYears(d: Date, n: number): Date {
  return addMonths(d, n * 12);
}

export function daysInMonth(year: number, month: number): number {
  return new Date(year, month + 1, 0).getDate();
}

export function sameDay(a: Date | null | undefined, b: Date | null | undefined): boolean {
  return (
    !!a && !!b && a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth() && a.getDate() === b.getDate()
  );
}

export function sameMonth(a: Date, b: Date): boolean {
  return a.getFullYear() === b.getFullYear() && a.getMonth() === b.getMonth();
}

export function dayKey(d: Date): number {
  return d.getFullYear() * 10000 + (d.getMonth() + 1) * 100 + d.getDate();
}

export function clampDate(d: Date, min: Date, max: Date): Date {
  if (d < min) return startOfDay(min);
  if (d > max) return startOfDay(max);
  return d;
}

export function diffDays(a: Date, b: Date): number {
  const ua = Date.UTC(a.getFullYear(), a.getMonth(), a.getDate());
  const ub = Date.UTC(b.getFullYear(), b.getMonth(), b.getDate());
  return Math.round((ub - ua) / DAY_MS);
}

export function startOfWeek(d: Date, firstDay: number): Date {
  const delta = (d.getDay() - firstDay + 7) % 7;
  return addDays(d, -delta);
}

const pad = (n: number, w = 2) => String(Math.abs(n)).padStart(w, '0');

export function toIsoDate(d: Date | null | undefined): string {
  if (!d) return '';
  return `${d.getFullYear() < 0 ? '-' : ''}${pad(d.getFullYear(), 4)}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
}

export function parseDate(v: string | Date | null | undefined): Date | null {
  if (!v) return null;
  if (v instanceof Date) return Number.isNaN(v.getTime()) ? null : startOfDay(v);
  const s = v.trim();
  if (!s) return null;
  const m = /^(-?\d{1,6})-(\d{1,2})-(\d{1,2})$/.exec(s);
  if (m) {
    const d = new Date(Number(m[1]), Number(m[2]) - 1, Number(m[3]));
    if (m[1]!.length < 3) d.setFullYear(Number(m[1]));
    return d;
  }
  const t = new Date(s);
  return Number.isNaN(t.getTime()) ? null : startOfDay(t);
}

export function toIsoTime(t: TimeValue | null | undefined): string {
  if (!t) return '';
  return `${pad(t.hours)}:${pad(t.minutes)}`;
}

export function parseTime(v: string | TimeValue | null | undefined): TimeValue | null {
  if (!v) return null;
  if (typeof v === 'object') return normalizeTime(v.hours, v.minutes);
  const m = /^\s*(\d{1,2})(?::(\d{1,2}))?(?::\d{1,2})?\s*(am|pm|a\.m\.|p\.m\.)?\s*$/i.exec(v);
  if (!m) return null;
  let h = Number(m[1]);
  const min = Number(m[2] ?? 0);
  const ap = m[3]?.toLowerCase();
  if (ap) {
    if (ap.startsWith('p') && h < 12) h += 12;
    if (ap.startsWith('a') && h === 12) h = 0;
  }
  return normalizeTime(h, min);
}

export function normalizeTime(h: number, m: number): TimeValue | null {
  if (!Number.isFinite(h) || !Number.isFinite(m)) return null;
  return { hours: ((Math.trunc(h) % 24) + 24) % 24, minutes: ((Math.trunc(m) % 60) + 60) % 60 };
}

export function localeFor(el: Element): string {
  const own = el.getAttribute('locale');
  if (own) return own;
  const withLang = el.closest('[lang]');
  const lang = withLang?.getAttribute('lang') || document.documentElement.lang || navigator.language || 'en-US';
  try {
    return Intl.getCanonicalLocales(lang)[0] ?? 'en-US';
  } catch {
    return 'en-US';
  }
}

export function isCjk(locale: string): boolean {
  return /^(zh|ja|ko)\b/i.test(locale);
}

export function localeFirstDay(locale: string): number {
  try {
    const loc = new Intl.Locale(locale) as Intl.Locale & {
      getWeekInfo?: () => { firstDay: number };
      weekInfo?: { firstDay: number };
    };
    const info = loc.getWeekInfo?.() ?? loc.weekInfo;
    if (info) return info.firstDay % 7;
  } catch {}
  return /^(en-US|en-CA|ja|zh-TW|ko|he|pt-BR)/i.test(locale) ? 0 : 1;
}

const WEEKDAY_NAMES: Record<string, number> = {
  sunday: 0,
  monday: 1,
  tuesday: 2,
  wednesday: 3,
  thursday: 4,
  friday: 5,
  saturday: 6,
};

export function resolveFirstDay(v: string | null | undefined, locale: string): number {
  if (!v || /^(auto|default)$/i.test(v)) return localeFirstDay(locale);
  const n = Number(v);
  if (Number.isInteger(n)) return ((n % 7) + 7) % 7;
  return WEEKDAY_NAMES[v.toLowerCase()] ?? localeFirstDay(locale);
}

const fmtCache = new Map<string, Intl.DateTimeFormat>();
export function dtf(locale: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `${locale}|${JSON.stringify(opts)}`;
  let f = fmtCache.get(key);
  if (!f) {
    try {
      f = new Intl.DateTimeFormat(locale, opts);
    } catch {
      f = new Intl.DateTimeFormat('en-US', opts);
    }
    fmtCache.set(key, f);
  }
  return f;
}

export function part(
  locale: string,
  opts: Intl.DateTimeFormatOptions,
  d: Date,
  type: Intl.DateTimeFormatPartTypes,
): string {
  return (
    dtf(locale, opts)
      .formatToParts(d)
      .find((p) => p.type === type)?.value ?? ''
  );
}

export type DayOfWeekFormat = 'auto' | 'narrow' | 'short' | 'long' | 'two-letter';

export function weekdayLabels(locale: string, firstDay: number, format: DayOfWeekFormat = 'auto'): string[] {
  const base = new Date(2023, 0, 1);
  const out: string[] = [];
  for (let i = 0; i < 7; i++) {
    const d = addDays(base, (firstDay + i) % 7);
    let label: string;
    switch (format === 'auto' ? (isCjk(locale) ? 'narrow' : 'two-letter') : format) {
      case 'narrow':
        label = dtf(locale, { weekday: 'narrow' }).format(d);
        break;
      case 'long':
        label = dtf(locale, { weekday: 'long' }).format(d);
        break;
      case 'short':
        label = dtf(locale, { weekday: 'short' }).format(d);
        break;
      default: {
        const s = dtf(locale, { weekday: 'short' }).format(d).replace(/\.$/, '');
        label = [...s].slice(0, 2).join('');
      }
    }
    out.push(label);
  }
  return out;
}

export function monthLabel(locale: string, d: Date, style: 'long' | 'short' | 'numeric' | '2-digit'): string {
  return part(locale, { month: style }, d, 'month') || String(d.getMonth() + 1);
}

export function monthText(locale: string, d: Date, style: 'long' | 'short' | 'numeric' | '2-digit'): string {
  if (style === 'numeric' || style === '2-digit') {
    return dtf(locale, { month: style }).format(d);
  }
  return dtf(locale, { month: style }).format(d);
}

export function dateFieldOrder(locale: string): ('year' | 'month' | 'day')[] {
  const parts = dtf(locale, { year: 'numeric', month: 'long', day: 'numeric' }).formatToParts(new Date(2024, 10, 21));
  const order = parts
    .map((p) => p.type)
    .filter((t): t is 'year' | 'month' | 'day' => t === 'year' || t === 'month' || t === 'day');
  return order.length === 3 ? order : ['month', 'day', 'year'];
}

export function localeUses12Hour(locale: string): boolean {
  const o = dtf(locale, { hour: 'numeric' }).resolvedOptions() as Intl.ResolvedDateTimeFormatOptions & {
    hourCycle?: string;
  };
  return o.hourCycle === 'h12' || o.hourCycle === 'h11' || (o.hourCycle === undefined && !!o.hour12);
}

export function timeFieldOrder(locale: string, twelveHour: boolean): ('hour' | 'minute' | 'period')[] {
  const parts = dtf(locale, { hour: 'numeric', minute: '2-digit', hour12: twelveHour }).formatToParts(
    new Date(2024, 0, 1, 13, 5),
  );
  const order: ('hour' | 'minute' | 'period')[] = [];
  for (const p of parts) {
    if (p.type === 'hour') order.push('hour');
    else if (p.type === 'minute') order.push('minute');
    else if (p.type === 'dayPeriod') order.push('period');
  }
  if (twelveHour && !order.includes('period')) order.push('period');
  if (!order.includes('hour')) order.unshift('hour');
  if (!order.includes('minute')) order.splice(order.indexOf('hour') + 1, 0, 'minute');
  return order;
}

export function periodLabels(locale: string): [string, string] {
  const f = dtf(locale, { hour: 'numeric', hour12: true });
  const am = f.formatToParts(new Date(2024, 0, 1, 9)).find((p) => p.type === 'dayPeriod')?.value ?? 'AM';
  const pm = f.formatToParts(new Date(2024, 0, 1, 15)).find((p) => p.type === 'dayPeriod')?.value ?? 'PM';
  return [am, pm];
}

export function strings(locale: string): {
  pickDate: string;
  day: string;
  month: string;
  year: string;
  hour: string;
  minute: string;
  accept: string;
  dismiss: string;
  previous: string;
  next: string;
} {
  if (/^zh/i.test(locale)) {
    return {
      pickDate: '选择日期',
      day: '日',
      month: '月',
      year: '年',
      hour: '时',
      minute: '分',
      accept: '确定',
      dismiss: '取消',
      previous: '上一个',
      next: '下一个',
    };
  }
  if (/^ja/i.test(locale)) {
    return {
      pickDate: '日付の選択',
      day: '日',
      month: '月',
      year: '年',
      hour: '時',
      minute: '分',
      accept: 'OK',
      dismiss: 'キャンセル',
      previous: '前へ',
      next: '次へ',
    };
  }
  return {
    pickDate: 'Pick a date',
    day: 'day',
    month: 'month',
    year: 'year',
    hour: 'hour',
    minute: 'minute',
    accept: 'Accept',
    dismiss: 'Dismiss',
    previous: 'Previous',
    next: 'Next',
  };
}

export function formatDate(d: Date, format: string | null | undefined, locale: string): string {
  const f = (format || 'short').trim();
  if (f === 'short' || f === 'medium' || f === 'long' || f === 'full') {
    return dtf(locale, { dateStyle: f }).format(d);
  }
  return f.replace(/'([^']*)'|yyyy|yy|MMMM|MMM|MM|M|dddd|ddd|dd|d/g, (tok, lit: string | undefined) => {
    if (lit !== undefined) return lit;
    switch (tok) {
      case 'yyyy':
        return pad(d.getFullYear(), 4);
      case 'yy':
        return pad(d.getFullYear() % 100);
      case 'MMMM':
        return part(locale, { month: 'long' }, d, 'month');
      case 'MMM':
        return part(locale, { month: 'short' }, d, 'month');
      case 'MM':
        return pad(d.getMonth() + 1);
      case 'M':
        return String(d.getMonth() + 1);
      case 'dddd':
        return dtf(locale, { weekday: 'long' }).format(d);
      case 'ddd':
        return dtf(locale, { weekday: 'short' }).format(d);
      case 'dd':
        return pad(d.getDate());
      case 'd':
        return String(d.getDate());
      default:
        return tok;
    }
  });
}
