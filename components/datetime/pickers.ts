import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { clamp } from '../../base/dom.ts';
import {
  Popup,
  computePosition,
  normalizePlacement,
  popupResetCss,
  viewportSize,
  type FlyoutLike,
  type FlyoutShowOptions,
  type PositionResult,
} from '../../base/popup.ts';
import { popupOut, splitOpen } from '../../motion/animate.ts';
import {
  dateFieldOrder,
  daysInMonth,
  dtf,
  isCjk,
  localeFor,
  localeUses12Hour,
  parseDate,
  parseTime,
  periodLabels,
  sameDay,
  strings,
  timeFieldOrder,
  toIsoDate,
  toIsoTime,
  today,
  type TimeValue,
} from './date-utils.ts';
import { ITEM_H, PickerPresenter, pickerPresenterCss, type PickerColumnSpec } from './looping-selector.ts';

export interface DateColumnsConfig {
  locale: string;
  date: Date;
  minYear: number;
  maxYear: number;
  dayVisible: boolean;
  monthVisible: boolean;
  yearVisible: boolean;
  dayFormat: string;
  monthFormat: string;
  yearFormat: string;
}

const yearDate = (y: number, m = 0, d = 1) => {
  const r = new Date(y, m, d);
  r.setFullYear(y);
  return r;
};

function monthStyle(c: DateColumnsConfig): 'long' | 'short' | 'numeric' | '2-digit' {
  const f = c.monthFormat;
  if (f === 'long' || f === 'short' || f === 'numeric' || f === '2-digit') return f;
  return isCjk(c.locale) ? 'numeric' : 'long';
}

export function formatDay(c: Pick<DateColumnsConfig, 'locale' | 'dayFormat'>, d: Date): string {
  const f = c.dayFormat;
  if (f === 'numeric-weekday' || f === 'weekday') {
    return `${dtf(c.locale, { day: 'numeric' }).format(d)} ${dtf(c.locale, { weekday: 'short' }).format(d)}`;
  }
  return dtf(c.locale, { day: f === '2-digit' ? '2-digit' : 'numeric' }).format(d);
}

export function formatMonth(c: DateColumnsConfig, d: Date): string {
  return dtf(c.locale, { month: monthStyle(c) }).format(d);
}

export function formatYear(c: Pick<DateColumnsConfig, 'locale' | 'yearFormat'>, d: Date): string {
  return dtf(c.locale, { year: c.yearFormat === '2-digit' ? '2-digit' : 'numeric' }).format(d);
}

function dayLabels(c: DateColumnsConfig, y: number, m: number): string[] {
  const n = daysInMonth(y, m);
  const out: string[] = [];
  for (let i = 1; i <= n; i++) out.push(formatDay(c, yearDate(y, m, i)));
  return out;
}

const WEIGHTS = { day: 78, month: 132, year: 78 } as const;

export function buildDateColumns(c: DateColumnsConfig): PickerColumnSpec[] {
  const s = strings(c.locale);
  const y = clamp(c.date.getFullYear(), c.minYear, c.maxYear);
  const m = c.date.getMonth();
  const order = dateFieldOrder(c.locale);
  const specs: PickerColumnSpec[] = [];
  for (const f of order) {
    if (f === 'day' && c.dayVisible) {
      specs.push({
        key: 'day',
        items: dayLabels(c, y, m),
        index: c.date.getDate() - 1,
        loop: true,
        weight: WEIGHTS.day,
        align: 'center',
        label: s.day,
      });
    } else if (f === 'month' && c.monthVisible) {
      const items: string[] = [];
      for (let i = 0; i < 12; i++) items.push(formatMonth(c, yearDate(2001, i, 1)));
      specs.push({ key: 'month', items, index: m, loop: true, weight: WEIGHTS.month, align: 'start', label: s.month });
    } else if (f === 'year' && c.yearVisible) {
      const items: string[] = [];
      for (let yy = c.minYear; yy <= c.maxYear; yy++) items.push(formatYear(c, yearDate(yy, 6, 1)));
      specs.push({
        key: 'year',
        items,
        index: y - c.minYear,
        loop: false,
        weight: WEIGHTS.year,
        align: 'center',
        label: s.year,
      });
    }
  }
  return specs;
}

export function syncDayColumn(p: PickerPresenter, c: DateColumnsConfig): void {
  const day = p.column('day');
  if (!day) return;
  const { y, m } = readYearMonth(p, c);
  const labels = dayLabels(c, y, m);
  const keep = Math.min(day.index, labels.length - 1);
  day.setItems(labels, keep, true);
}

function readYearMonth(p: PickerPresenter, c: DateColumnsConfig): { y: number; m: number } {
  const yc = p.column('year');
  const mc = p.column('month');
  return {
    y: yc ? c.minYear + yc.index : clamp(c.date.getFullYear(), c.minYear, c.maxYear),
    m: mc ? mc.index : c.date.getMonth(),
  };
}

export function readDate(p: PickerPresenter, c: DateColumnsConfig): Date {
  const { y, m } = readYearMonth(p, c);
  const dc = p.column('day');
  const d = dc ? dc.index + 1 : c.date.getDate();
  return yearDate(y, m, Math.min(d, daysInMonth(y, m)));
}

export interface TimeColumnsConfig {
  locale: string;
  time: TimeValue;
  twelveHour: boolean;
  minuteIncrement: number;
}

const two = (n: number) => String(n).padStart(2, '0');

export function hourLabel(c: Pick<TimeColumnsConfig, 'twelveHour'>, h: number): string {
  if (!c.twelveHour) return two(h);
  return String(h % 12 === 0 ? 12 : h % 12);
}

export function buildTimeColumns(c: TimeColumnsConfig): PickerColumnSpec[] {
  const s = strings(c.locale);
  const inc = Math.max(1, Math.min(59, Math.round(c.minuteIncrement) || 1));
  const order = timeFieldOrder(c.locale, c.twelveHour);
  const specs: PickerColumnSpec[] = [];
  for (const f of order) {
    if (f === 'hour') {
      const items: string[] = [];
      if (c.twelveHour) for (let i = 0; i < 12; i++) items.push(String(i === 0 ? 12 : i));
      else for (let i = 0; i < 24; i++) items.push(two(i));
      const index = c.twelveHour ? c.time.hours % 12 : c.time.hours;
      specs.push({ key: 'hour', items, index, loop: true, weight: 1, align: 'center', label: s.hour });
    } else if (f === 'minute') {
      const items: string[] = [];
      for (let m = 0; m < 60; m += inc) items.push(two(m));
      specs.push({
        key: 'minute',
        items,
        index: Math.floor(c.time.minutes / inc),
        loop: true,
        weight: 1,
        align: 'center',
        label: s.minute,
      });
    } else if (f === 'period' && c.twelveHour) {
      const [am, pm] = periodLabels(c.locale);
      specs.push({
        key: 'period',
        items: [am, pm],
        index: c.time.hours >= 12 ? 1 : 0,
        loop: false,
        weight: 1,
        align: 'center',
        label: `${am}/${pm}`,
      });
    }
  }
  return specs;
}

export function readTime(p: PickerPresenter, c: TimeColumnsConfig): TimeValue {
  const inc = Math.max(1, Math.min(59, Math.round(c.minuteIncrement) || 1));
  const hc = p.column('hour');
  const mc = p.column('minute');
  const pc = p.column('period');
  let h = hc ? hc.index : c.time.hours;
  if (c.twelveHour) {
    const pm = pc ? pc.index === 1 : c.time.hours >= 12;
    h = (h % 12) + (pm ? 12 : 0);
  }
  const m = mc ? mc.index * inc : c.time.minutes;
  return { hours: h, minutes: m };
}

function bandPosition(anchor: DOMRect, size: { width: number; height: number }, bandOffset: number): PositionResult {
  const { width: vw, height: vh } = viewportSize();
  const pad = 8;
  const x = clamp(anchor.left, pad, Math.max(pad, vw - pad - size.width));
  const y = clamp(
    anchor.top + anchor.height / 2 - (bandOffset + ITEM_H / 2),
    pad,
    Math.max(pad, vh - pad - size.height),
  );
  return { x: Math.round(x), y: Math.round(y), side: 'bottom', maxHeight: vh - pad * 2, maxWidth: vw - pad * 2 };
}

function yearAttr(v: string | null | undefined, fallback: number): number {
  if (!v) return fallback;
  const n = Number(v);
  if (Number.isInteger(n)) return n;
  return parseDate(v)?.getFullYear() ?? fallback;
}

export const pickerFieldCss = css`
:host {
  display: inline-flex;
  flex-direction: column;
  vertical-align: middle;
  max-width: 456px;
  color: var(--w-text-fill-color-primary);
}
.header { margin: 0 0 4px; color: var(--w-text-fill-color-primary); overflow-wrap: anywhere; }
.header[hidden] { display: none; }
.field {
  box-sizing: border-box;
  display: flex;
  align-items: stretch;
  min-width: var(--field-min, 296px);
  max-width: 456px;
  border: 1px solid;
  border-color: var(--w-control-elevation-border);
  border-radius: var(--w-corner-radius-control);
  background-color: var(--w-control-fill-color-default);
  background-clip: padding-box;
  color: var(--w-text-fill-color-primary);
  outline: none;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  transition: background-color var(--w-duration-faster) linear;
}
.field.empty { color: var(--w-text-fill-color-secondary); }
.field:hover { background-color: var(--w-control-fill-color-secondary); color: var(--w-text-fill-color-primary); }
.field:active {
  background-color: var(--w-control-fill-color-tertiary);
  border-color: var(--w-control-stroke-color-default);
  color: var(--w-text-fill-color-secondary);
}
:host([disabled]) { pointer-events: none; }
:host([disabled]) .header { color: var(--w-text-fill-color-disabled); }
:host([disabled]) .field {
  background-color: var(--w-control-fill-color-disabled);
  border-color: var(--w-control-stroke-color-default);
  color: var(--w-text-fill-color-disabled);
}
${focusRing('.field:focus-visible', 3)}
.seg {
  flex: 1 1 0;
  min-width: 0;
  padding: 3px 0 6px;
  text-align: center;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.seg.start { text-align: start; padding-left: 9px; margin-left: 1px; }
.div { flex: none; width: 1px; background: var(--w-control-stroke-color-default); }
${popupResetCss('.flyout')}
`;

const FIELD_TEMPLATE = `<div class="header" part="header" hidden></div><div class="field" part="field" role="button" tabindex="0" aria-haspopup="dialog" aria-expanded="false"></div><div class="flyout" part="flyout"></div>`;

abstract class PickerFieldBase extends WinElement {
  static override shadowInit: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override formAssociated = true;
  static override template = FIELD_TEMPLATE;
  static override props: PropDefs = {
    header: { type: String },
    disabled: { type: Boolean },
    name: { type: String },
    locale: { type: String },
    lightDismissOverlayMode: { type: String, attribute: 'light-dismiss-overlay-mode', default: 'auto' },
  };
  declare header: string;
  declare disabled: boolean;
  declare name: string;
  declare locale: string;
  declare lightDismissOverlayMode: string;

  protected field!: HTMLElement;
  protected flyoutEl!: HTMLElement;
  protected popup!: Popup;
  protected presenter!: PickerPresenter;

  protected get loc(): string {
    return this.locale || localeFor(this);
  }

  get isOpen(): boolean {
    return this.popup?.isOpen ?? false;
  }

  protected abstract columns(): PickerColumnSpec[];
  protected abstract renderField(): void;
  protected abstract commit(): void;
  protected onColumnChange(_key: string, _index: number): void {}

  protected override firstConnected(): void {
    this.field = this.$('.field');
    this.flyoutEl = this.$('.flyout');
    const s = strings(this.loc);
    this.presenter = new PickerPresenter(s.accept, s.dismiss);
    this.flyoutEl.append(this.presenter.el);
    this.popup = new Popup(this.flyoutEl, this.presenter.el);
    this.presenter.onAccept = () => {
      this.commit();
      void this.popup.close('programmatic');
    };
    this.presenter.onDismiss = () => void this.popup.close('programmatic');
    this.presenter.onColumnChange = (k, i) => this.onColumnChange(k, i);
    this.field.addEventListener('click', (ev) => {
      if (this.disabled) return;
      if (this.isOpen) void this.popup.close('programmatic');
      else this.open(ev.detail === 0);
    });
    this.field.addEventListener('keydown', (ev) => {
      if (this.disabled) return;
      if (ev.key === 'Enter' || ev.key === ' ' || (ev.key === 'ArrowDown' && ev.altKey) || ev.key === 'F4') {
        ev.preventDefault();
        this.open(true);
      }
    });
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('header')) {
      const h = this.$('.header');
      h.textContent = this.header;
      h.hidden = !this.header;
    }
    if (changed.has('disabled')) {
      this.field.tabIndex = this.disabled ? -1 : 0;
      this.field.setAttribute('aria-disabled', String(this.disabled));
      if (this.disabled && this.isOpen) void this.popup.close('programmatic');
    }
  }

  open(viaKeyboard = false): void {
    if (this.isOpen || this.disabled) return;
    const w = Math.max(this.field.offsetWidth, 0);
    this.presenter.el.style.setProperty('--picker-width', `${w}px`);
    this.presenter.setColumns(this.columns());
    this.field.setAttribute('aria-expanded', 'true');
    this.popup.open({
      anchor: this.field,
      position: (size, r) => bandPosition(r, size, this.presenter.bandOffset),
      focus: 'none',
      animateIn: (surface) => {
        this.presenter.measure();
        return splitOpen(surface, this.presenter.bandOffset, ITEM_H);
      },
      animateOut: (surface) => popupOut(surface),
      onClosed: () => {
        this.field.setAttribute('aria-expanded', 'false');
        this.emit('closed', undefined, { bubbles: false });
      },
    });
    this.presenter.focusFirst();
    void viaKeyboard;
    this.emit('opened', undefined, { bubbles: false });
  }

  close(): void {
    if (this.isOpen) void this.popup.close('programmatic');
  }
}

export interface DateChangedDetail {
  oldDate: Date | null;
  newDate: Date | null;
}

export class WinDatePicker extends PickerFieldBase {
  static override styles = [pickerPresenterCss, pickerFieldCss];
  static override props: PropDefs = {
    selectedDate: { type: String, attribute: 'selected-date' },
    date: { type: String },
    dayVisible: { type: Boolean, attribute: 'day-visible', default: true },
    monthVisible: { type: Boolean, attribute: 'month-visible', default: true },
    yearVisible: { type: Boolean, attribute: 'year-visible', default: true },
    dayFormat: { type: String, attribute: 'day-format', default: 'numeric' },
    monthFormat: { type: String, attribute: 'month-format', default: 'auto' },
    yearFormat: { type: String, attribute: 'year-format', default: 'numeric' },
    minYear: { type: String, attribute: 'min-year' },
    maxYear: { type: String, attribute: 'max-year' },
  };
  declare selectedDate: string;
  declare date: string;
  declare dayVisible: boolean;
  declare monthVisible: boolean;
  declare yearVisible: boolean;
  declare dayFormat: string;
  declare monthFormat: string;
  declare yearFormat: string;
  declare minYear: string;
  declare maxYear: string;

  private syncing = false;

  static {
    this.define('win-date-picker');
  }

  get value(): Date | null {
    return parseDate(this.selectedDate);
  }
  set value(d: Date | null) {
    this.selectedDate = d ? toIsoDate(d) : '';
  }

  private config(date: Date): DateColumnsConfig {
    const now = today().getFullYear();
    const minY = yearAttr(this.minYear, now - 100);
    const maxY = Math.max(minY, yearAttr(this.maxYear, now + 100));
    return {
      locale: this.loc,
      date,
      minYear: minY,
      maxYear: maxY,
      dayVisible: this.dayVisible,
      monthVisible: this.monthVisible,
      yearVisible: this.yearVisible,
      dayFormat: this.dayFormat,
      monthFormat: this.monthFormat,
      yearFormat: this.yearFormat,
    };
  }

  protected columns(): PickerColumnSpec[] {
    const d = this.value ?? today();
    return buildDateColumns(this.config(d));
  }

  protected override onColumnChange(key: string): void {
    if (key === 'year' || key === 'month') syncDayColumn(this.presenter, this.config(this.value ?? today()));
  }

  protected commit(): void {
    const next = readDate(this.presenter, this.config(this.value ?? today()));
    this.setValue(next, true);
  }

  private setValue(d: Date | null, user: boolean): void {
    const old = this.value;
    if (sameDay(old, d) && (old === null) === (d === null)) return;
    this.syncing = true;
    this.selectedDate = d ? toIsoDate(d) : '';
    this.date = this.selectedDate;
    this.syncing = false;
    if (user) {
      const detail: DateChangedDetail = { oldDate: old, newDate: d };
      this.emit('selecteddatechanged', detail);
      this.emit('datechanged', detail);
      this.emit('change', detail);
    }
  }

  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    if (first) this.style.setProperty('--field-min', '296px');
    if (first) {
      this.syncing = true;
      if (this.selectedDate) this.date = this.selectedDate;
      else if (this.date) this.selectedDate = this.date;
      this.syncing = false;
    } else if (!this.syncing) {
      this.syncing = true;
      if (changed.has('selectedDate')) this.date = this.selectedDate;
      else if (changed.has('date') && this.date !== this.selectedDate) this.selectedDate = this.date;
      this.syncing = false;
    }
    this.renderField();
    this.internals.setFormValue(this.value ? toIsoDate(this.value) : null);
  }

  protected renderField(): void {
    const d = this.value;
    const c = this.config(d ?? today());
    const s = strings(this.loc);
    const parts: string[] = [];
    for (const f of dateFieldOrder(this.loc)) {
      if (f === 'day' && this.dayVisible) {
        parts.push(
          `<span class="seg" part="day" style="flex-grow:${WEIGHTS.day}">${d ? formatDay(c, d) : s.day}</span>`,
        );
      } else if (f === 'month' && this.monthVisible) {
        parts.push(
          `<span class="seg start" part="month" style="flex-grow:${WEIGHTS.month}">${d ? formatMonth(c, d) : s.month}</span>`,
        );
      } else if (f === 'year' && this.yearVisible) {
        parts.push(
          `<span class="seg" part="year" style="flex-grow:${WEIGHTS.year}">${d ? formatYear(c, d) : s.year}</span>`,
        );
      }
    }
    this.field.innerHTML = parts.join('<span class="div" aria-hidden="true"></span>');
    this.field.classList.toggle('empty', !d);
    const label = d ? dtf(this.loc, { dateStyle: 'long' }).format(d) : s.pickDate;
    this.field.setAttribute('aria-label', this.header ? `${this.header} ${label}` : label);
  }

  formResetCallback(): void {
    this.setValue(parseDate(this.getAttribute('selected-date')), false);
  }
}

export interface TimeChangedDetail {
  oldTime: TimeValue | null;
  newTime: TimeValue | null;
}

export class WinTimePicker extends PickerFieldBase {
  static override styles = [pickerPresenterCss, pickerFieldCss];
  static override props: PropDefs = {
    selectedTime: { type: String, attribute: 'selected-time' },
    time: { type: String },
    clockIdentifier: { type: String, attribute: 'clock-identifier' },
    minuteIncrement: { type: Number, attribute: 'minute-increment', default: 1 },
  };
  declare selectedTime: string;
  declare time: string;
  declare clockIdentifier: string;
  declare minuteIncrement: number;

  private syncing = false;

  static {
    this.define('win-time-picker');
  }

  get value(): TimeValue | null {
    return parseTime(this.selectedTime);
  }
  set value(t: TimeValue | null) {
    this.selectedTime = t ? toIsoTime(t) : '';
  }

  private get twelveHour(): boolean {
    const id = (this.clockIdentifier || '').toLowerCase();
    if (id.startsWith('12')) return true;
    if (id.startsWith('24')) return false;
    return localeUses12Hour(this.loc);
  }

  private config(t: TimeValue): TimeColumnsConfig {
    return { locale: this.loc, time: t, twelveHour: this.twelveHour, minuteIncrement: this.minuteIncrement };
  }

  private nowRounded(): TimeValue {
    const n = new Date();
    const inc = Math.max(1, Math.round(this.minuteIncrement) || 1);
    return { hours: n.getHours(), minutes: Math.floor(n.getMinutes() / inc) * inc };
  }

  protected columns(): PickerColumnSpec[] {
    return buildTimeColumns(this.config(this.value ?? this.nowRounded()));
  }

  protected commit(): void {
    this.setValue(readTime(this.presenter, this.config(this.value ?? this.nowRounded())), true);
  }

  private setValue(t: TimeValue | null, user: boolean): void {
    const old = this.value;
    if (old?.hours === t?.hours && old?.minutes === t?.minutes && !!old === !!t) return;
    this.syncing = true;
    this.selectedTime = t ? toIsoTime(t) : '';
    this.time = this.selectedTime;
    this.syncing = false;
    if (user) {
      const detail: TimeChangedDetail = { oldTime: old, newTime: t };
      this.emit('selectedtimechanged', detail);
      this.emit('timechanged', detail);
      this.emit('change', detail);
    }
  }

  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    if (first) this.style.setProperty('--field-min', '242px');
    if (first) {
      this.syncing = true;
      if (this.selectedTime) this.time = this.selectedTime;
      else if (this.time) this.selectedTime = this.time;
      this.syncing = false;
    } else if (!this.syncing) {
      this.syncing = true;
      if (changed.has('selectedTime')) this.time = this.selectedTime;
      else if (changed.has('time') && this.time !== this.selectedTime) this.selectedTime = this.time;
      this.syncing = false;
    }
    this.renderField();
    this.internals.setFormValue(this.value ? toIsoTime(this.value) : null);
  }

  protected renderField(): void {
    const t = this.value;
    const twelve = this.twelveHour;
    const s = strings(this.loc);
    const [am, pm] = periodLabels(this.loc);
    const parts: string[] = [];
    for (const f of timeFieldOrder(this.loc, twelve)) {
      if (f === 'hour')
        parts.push(`<span class="seg" part="hour">${t ? hourLabel({ twelveHour: twelve }, t.hours) : s.hour}</span>`);
      else if (f === 'minute') parts.push(`<span class="seg" part="minute">${t ? two(t.minutes) : s.minute}</span>`);
      else if (f === 'period' && twelve)
        parts.push(`<span class="seg" part="period">${t ? (t.hours >= 12 ? pm : am) : am}</span>`);
    }
    this.field.innerHTML = parts.join('<span class="div" aria-hidden="true"></span>');
    this.field.classList.toggle('empty', !t);
    const label = t
      ? dtf(this.loc, { hour: 'numeric', minute: '2-digit', hour12: twelve }).format(
          new Date(2024, 0, 1, t.hours, t.minutes),
        )
      : `${s.hour} ${s.minute}`;
    this.field.setAttribute('aria-label', this.header ? `${this.header} ${label}` : label);
  }

  formResetCallback(): void {
    this.setValue(parseTime(this.getAttribute('selected-time')), false);
  }
}

abstract class PickerFlyoutBase extends WinElement implements FlyoutLike {
  static override template = '';
  static override props: PropDefs = {
    placement: { type: String },
    locale: { type: String },
  };
  declare placement: string;
  declare locale: string;

  protected popup!: Popup;
  protected presenter!: PickerPresenter;

  get isOpen(): boolean {
    return this.popup?.isOpen ?? false;
  }

  protected get loc(): string {
    return this.locale || localeFor(this);
  }

  protected abstract width: number;
  protected abstract columns(): PickerColumnSpec[];
  protected abstract commit(): void;
  protected onColumnChange(_key: string): void {}

  protected override firstConnected(): void {
    const s = strings(this.loc);
    this.presenter = new PickerPresenter(s.accept, s.dismiss);
    this.renderRoot.append(this.presenter.el);
    this.popup = new Popup(this, this.presenter.el);
    this.presenter.onAccept = () => {
      this.commit();
      void this.popup.close('programmatic');
    };
    this.presenter.onDismiss = () => void this.popup.close('programmatic');
    this.presenter.onColumnChange = (k) => this.onColumnChange(k);
  }

  showAt(anchor: Element | DOMRect | { x: number; y: number }, opts: FlyoutShowOptions = {}): void {
    if (!this.isConnected) document.body.append(this);
    if (!this.popup) this.connectedCallback();
    if (this.isOpen) return;
    if (!this.emit('opening', undefined, { cancelable: true, bubbles: false })) return;
    const own = this.getAttribute('placement');
    this.presenter.el.style.setProperty('--picker-width', `${this.width}px`);
    this.presenter.setColumns(this.columns());
    const anchorRect = (): DOMRect =>
      anchor instanceof Element
        ? anchor.getBoundingClientRect()
        : 'width' in anchor
          ? (anchor as DOMRect)
          : new DOMRect(anchor.x, anchor.y, 0, 0);
    this.popup.open({
      anchor: opts.position ?? anchor,
      position: (size) =>
        own
          ? computePosition(anchorRect(), size, normalizePlacement(own, 'top'), 4)
          : bandPosition(anchorRect(), size, this.presenter.bandOffset),
      focus: 'none',
      animateIn: (surface) => {
        this.presenter.measure();
        return splitOpen(surface, this.presenter.bandOffset, ITEM_H);
      },
      animateOut: (surface) => popupOut(surface),
      onDismiss: (reason) => this.emit('closing', { reason }, { cancelable: true, bubbles: false }),
      onClosed: () => this.emit('closed', undefined, { bubbles: false }),
    });
    this.presenter.focusFirst();
    this.emit('opened', undefined, { bubbles: false });
  }

  hide(): void {
    if (this.isOpen) void this.popup.close('programmatic');
  }
}

const flyoutHostCss = css`${popupResetCss(':host')}`;

export class WinDatePickerFlyout extends PickerFlyoutBase {
  static override styles = [flyoutHostCss, pickerPresenterCss];
  static override props: PropDefs = {
    date: { type: String },
    dayVisible: { type: Boolean, attribute: 'day-visible', default: true },
    monthVisible: { type: Boolean, attribute: 'month-visible', default: true },
    yearVisible: { type: Boolean, attribute: 'year-visible', default: true },
    dayFormat: { type: String, attribute: 'day-format', default: 'numeric' },
    monthFormat: { type: String, attribute: 'month-format', default: 'auto' },
    yearFormat: { type: String, attribute: 'year-format', default: 'numeric' },
    minYear: { type: String, attribute: 'min-year' },
    maxYear: { type: String, attribute: 'max-year' },
  };
  declare date: string;
  declare dayVisible: boolean;
  declare monthVisible: boolean;
  declare yearVisible: boolean;
  declare dayFormat: string;
  declare monthFormat: string;
  declare yearFormat: string;
  declare minYear: string;
  declare maxYear: string;
  protected width = 296;

  static {
    this.define('win-date-picker-flyout');
  }

  private config(): DateColumnsConfig {
    const now = today().getFullYear();
    const minY = yearAttr(this.minYear, now - 100);
    return {
      locale: this.loc,
      date: parseDate(this.date) ?? today(),
      minYear: minY,
      maxYear: Math.max(minY, yearAttr(this.maxYear, now + 100)),
      dayVisible: this.dayVisible,
      monthVisible: this.monthVisible,
      yearVisible: this.yearVisible,
      dayFormat: this.dayFormat,
      monthFormat: this.monthFormat,
      yearFormat: this.yearFormat,
    };
  }

  protected columns(): PickerColumnSpec[] {
    return buildDateColumns(this.config());
  }

  protected override onColumnChange(key: string): void {
    if (key === 'year' || key === 'month') syncDayColumn(this.presenter, this.config());
  }

  protected commit(): void {
    const old = parseDate(this.date);
    const next = readDate(this.presenter, this.config());
    this.date = toIsoDate(next);
    this.emit<DateChangedDetail>('datepicked', { oldDate: old, newDate: next });
  }
}

export class WinTimePickerFlyout extends PickerFlyoutBase {
  static override styles = [flyoutHostCss, pickerPresenterCss];
  static override props: PropDefs = {
    time: { type: String },
    clockIdentifier: { type: String, attribute: 'clock-identifier' },
    minuteIncrement: { type: Number, attribute: 'minute-increment', default: 1 },
  };
  declare time: string;
  declare clockIdentifier: string;
  declare minuteIncrement: number;
  protected width = 242;

  static {
    this.define('win-time-picker-flyout');
  }

  private config(): TimeColumnsConfig {
    const id = (this.clockIdentifier || '').toLowerCase();
    const twelve = id.startsWith('12') ? true : id.startsWith('24') ? false : localeUses12Hour(this.loc);
    const n = new Date();
    return {
      locale: this.loc,
      time: parseTime(this.time) ?? { hours: n.getHours(), minutes: n.getMinutes() },
      twelveHour: twelve,
      minuteIncrement: this.minuteIncrement,
    };
  }

  protected columns(): PickerColumnSpec[] {
    return buildTimeColumns(this.config());
  }

  protected commit(): void {
    const old = parseTime(this.time);
    const next = readTime(this.presenter, this.config());
    this.time = toIsoTime(next);
    this.emit<TimeChangedDetail>('timepicked', { oldTime: old, newTime: next });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-date-picker': WinDatePicker;
    'win-time-picker': WinTimePicker;
    'win-date-picker-flyout': WinDatePickerFlyout;
    'win-time-picker-flyout': WinTimePickerFlyout;
  }
}
