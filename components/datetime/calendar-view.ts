import { WinElement, escapeHtml, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { animate, durations, easings, motionEnabled, settled } from '../../motion/animate.ts';
import {
  addDays,
  addMonths,
  dayKey,
  daysInMonth,
  diffDays,
  dtf,
  localeFor,
  parseDate,
  resolveFirstDay,
  sameDay,
  startOfDay,
  startOfWeek,
  strings,
  toIsoDate,
  today,
  weekdayLabels,
  type DayOfWeekFormat,
} from './date-utils.ts';

export type CalendarViewDisplayMode = 'month' | 'year' | 'decade';
export type CalendarViewSelectionMode = 'none' | 'single' | 'multiple';

export interface CalendarViewDayItemChangingDetail {
  date: Date;
  item: HTMLElement;
  setDensityColors(colors: string[] | null): void;
  setBlackout(blackout: boolean): void;
}

export interface SelectedDatesChangedDetail {
  addedDates: Date[];
  removedDates: Date[];
}

const DAY_ROW = 42;
const MODES: CalendarViewDisplayMode[] = ['month', 'year', 'decade'];

const calendarCss = css`
:host {
  display: inline-block;
  vertical-align: middle;
  color: var(--w-text-fill-color-primary);
  user-select: none;
  -webkit-user-select: none;
}
.root {
  box-sizing: border-box;
  width: 300px;
  display: flex;
  flex-direction: column;
  border: 1px solid var(--w-control-stroke-color-default);
  border-radius: var(--calendar-radius, var(--w-corner-radius-control));
  background: var(--w-control-fill-color-input-active);
  overflow: hidden;
}

.header { display: flex; align-items: stretch; }
button {
  font: inherit;
  color: inherit;
  margin: 0;
  border: 0;
  background: transparent;
  outline: none;
  cursor: default;
  -webkit-tap-highlight-color: transparent;
}
.header-btn {
  flex: 1 1 auto;
  min-width: 0;
  margin: 6px 3px 7px 7px;
  padding: 7px 8px 8px;
  border-radius: var(--w-corner-radius-control);
  font: var(--w-type-body-strong);
  text-align: start;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--w-text-fill-color-primary);
  transition: background-color var(--w-duration-faster) linear;
}
.header-btn:hover { background: var(--w-subtle-fill-color-secondary); }
.header-btn:active { background: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-secondary); }
.header-btn:disabled { background: transparent; color: var(--w-text-fill-color-primary); }
.nav {
  flex: none;
  width: 32px;
  margin: 6px 3px 7px;
  padding: 0;
  display: grid;
  place-items: center;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-control-strong-fill-color-default);
  transition: background-color var(--w-duration-faster) linear;
}
.nav.next { margin-right: 7px; }
.nav:hover { background: var(--w-subtle-fill-color-secondary); }
.nav:active { background: var(--w-subtle-fill-color-tertiary); }
.nav .w-glyph { transition: scale var(--w-duration-faster) var(--w-ease-decelerate); }
.nav:active .w-glyph { scale: 0.875; }
.nav:disabled { background: transparent; color: var(--w-control-strong-fill-color-disabled); }
${focusRing('.header-btn:focus-visible, .nav:focus-visible', 2)}
.divider { height: 1px; background: var(--w-control-stroke-color-default); flex: none; }

.views { position: relative; height: 300px; overflow: hidden; }
.view { position: absolute; inset: 0; display: flex; flex-direction: column; transform-origin: 50% 50%; }
.view[hidden] { display: none; }
.weekdays {
  display: grid;
  grid-template-columns: repeat(7, 1fr);
  margin: 2px 2px 0;
  flex: none;
}
.wd {
  margin: 1px;
  height: 40px;
  display: grid;
  place-items: center;
  font: var(--w-type-caption);
  font-weight: 600;
  color: var(--w-text-fill-color-primary);
  white-space: nowrap;
  overflow: hidden;
}
.scroller {
  position: relative;
  flex: 1 1 auto;
  margin: 2px;
  overflow: hidden;
  outline: none;
  touch-action: none;
}
.strip { display: grid; will-change: transform; }
.month-view .strip { grid-template-columns: repeat(7, 1fr); grid-auto-rows: ${DAY_ROW}px; }
.year-view .strip, .decade-view .strip { grid-template-columns: repeat(4, 1fr); grid-auto-rows: var(--row-h, 74px); }

.item {
  position: relative;
  margin: 1px;
  display: grid;
  place-items: center;
  border-radius: 50%;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  outline: none;
  isolation: isolate;
  transition: color var(--w-duration-faster) linear;
}
.month-view .item { width: 40px; height: 40px; justify-self: center; }
.year-view .item, .decade-view .item {
  width: calc(var(--row-h, 74px) - 2px);
  height: calc(var(--row-h, 74px) - 2px);
  justify-self: center;
}
.item.blank { visibility: hidden; pointer-events: none; }
.chrome {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  border: 1px solid transparent;
  background: transparent;
  z-index: -1;
  transition: background-color var(--w-duration-faster) linear, border-color var(--w-duration-faster) linear;
}
.item:hover .chrome { background: var(--w-subtle-fill-color-secondary); border-color: var(--w-subtle-fill-color-secondary); }
.item:active .chrome { background: var(--w-subtle-fill-color-tertiary); border-color: var(--w-subtle-fill-color-tertiary); }
.item:active { color: var(--w-text-fill-color-secondary); }

.item.oos { color: var(--w-text-fill-color-secondary); }
.item.oos:hover { color: var(--w-text-fill-color-primary); }
.item.oos:active { color: var(--w-text-fill-color-tertiary); }

.item.selected { color: var(--w-accent-text-fill-color-primary); }
.item.selected .chrome { border-color: var(--w-accent-fill-color-default); }
.item.selected:hover .chrome { border-color: var(--w-accent-fill-color-secondary); }
.item.selected:active .chrome { border-color: var(--w-subtle-fill-color-tertiary); }
.item.selected:active { color: var(--w-accent-text-fill-color-tertiary); }

.item.today { color: var(--w-text-on-accent-fill-color-primary); }
.item.today .chrome { background: var(--w-accent-fill-color-default); border-color: transparent; }
.item.today:hover .chrome { background: var(--w-accent-fill-color-secondary); border-color: transparent; }
.item.today:active .chrome { background: var(--w-accent-fill-color-tertiary); border-color: transparent; }
.item.today:active { color: var(--w-text-on-accent-fill-color-primary); }
.item.today.selected .chrome { box-shadow: inset 0 0 0 2px var(--w-accent-fill-color-default), inset 0 0 0 3px var(--w-text-on-accent-fill-color-primary); }
.item.today.blackout .chrome { background: var(--w-accent-fill-color-tertiary); }

.item.blackout { pointer-events: none; }
.item.blackout:not(.today) { color: var(--w-text-fill-color-primary); }
.item.blackout .num::after {
  content: '';
  position: absolute;
  left: -3px;
  right: -3px;
  top: 50%;
  height: 1px;
  background: var(--w-control-strong-stroke-color-default);
}
.item.today.blackout .num::after { background: currentColor; }
.num { position: relative; line-height: 19px; }
.label {
  position: absolute;
  top: 2px;
  left: 0;
  right: 0;
  text-align: center;
  font: 400 8px/10px var(--w-font-family-small);
  white-space: nowrap;
  pointer-events: none;
}
.year-view .label, .decade-view .label { top: 9px; }
.has-label .num { translate: 0 3px; }
.density {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  overflow: hidden;
  z-index: -1;
  display: flex;
  flex-direction: column-reverse;
  pointer-events: none;
}
.density i { display: block; flex: none; height: 2px; margin-top: 1px; }

:host([disabled]) { pointer-events: none; }
:host([disabled]) .wd,
:host([disabled]) .item,
:host([disabled]) .header-btn { color: var(--w-text-fill-color-disabled); }
:host([disabled]) .nav { color: var(--w-control-strong-fill-color-disabled); }
:host([disabled]) .item.today .chrome { background: var(--w-accent-fill-color-disabled); }
:host([disabled]) .item.selected .chrome { border-color: var(--w-accent-fill-color-disabled); }

${focusRing('.item:focus-visible', 3)}
`;

const TEMPLATE = `
<div class="root" part="root">
  <div class="header" part="header">
    <button class="header-btn" part="header-button" type="button"><span class="header-text"></span></button>
    <button class="nav prev" part="previous-button" type="button">${glyph('caretUp', 8)}</button>
    <button class="nav next" part="next-button" type="button">${glyph('caretDown', 8)}</button>
  </div>
  <div class="divider"></div>
  <div class="views" part="views">
    <div class="view month-view" data-view="month">
      <div class="weekdays" role="row"></div>
      <div class="scroller" role="grid"><div class="strip" role="presentation"></div></div>
    </div>
    <div class="view year-view" data-view="year" hidden>
      <div class="scroller" role="grid"><div class="strip" role="presentation"></div></div>
    </div>
    <div class="view decade-view" data-view="decade" hidden>
      <div class="scroller" role="grid"><div class="strip" role="presentation"></div></div>
    </div>
  </div>
</div>`;

interface ViewModel {
  view: HTMLElement;
  scroller: HTMLElement;
  strip: HTMLElement;
  first: number;
  rows: number;
}

let epochCache: { fd: number; d: Date } | null = null;
function epochWeek(firstDay: number): Date {
  if (!epochCache || epochCache.fd !== firstDay) {
    epochCache = { fd: firstDay, d: startOfWeek(new Date(1970, 0, 4), firstDay) };
  }
  return epochCache.d;
}

export class WinCalendarView extends WinElement {
  static override styles = [calendarCss];
  static override template = TEMPLATE;
  static override props: PropDefs = {
    displayMode: { type: String, attribute: 'display-mode', default: 'month', reflect: true },
    selectionMode: { type: String, attribute: 'selection-mode', default: 'single' },
    minDate: { type: String, attribute: 'min-date' },
    maxDate: { type: String, attribute: 'max-date' },
    selectedDate: { type: String, attribute: 'selected-date' },
    firstDayOfWeek: { type: String, attribute: 'first-day-of-week', default: 'auto' },
    dayOfWeekFormat: { type: String, attribute: 'day-of-week-format', default: 'auto' },
    isTodayHighlighted: { type: Boolean, attribute: 'is-today-highlighted', default: true },
    isGroupLabelVisible: { type: Boolean, attribute: 'is-group-label-visible' },
    isOutOfScopeEnabled: { type: Boolean, attribute: 'is-out-of-scope-enabled', default: true },
    numberOfWeeksInView: { type: Number, attribute: 'number-of-weeks-in-view', default: 6 },
    disabled: { type: Boolean },
    locale: { type: String },
    calendarIdentifier: { type: String, attribute: 'calendar-identifier', default: 'GregorianCalendar' },
  };

  declare displayMode: CalendarViewDisplayMode;
  declare selectionMode: CalendarViewSelectionMode;
  declare minDate: string;
  declare maxDate: string;
  declare selectedDate: string;
  declare firstDayOfWeek: string;
  declare dayOfWeekFormat: DayOfWeekFormat;
  declare isTodayHighlighted: boolean;
  declare isGroupLabelVisible: boolean;
  declare isOutOfScopeEnabled: boolean;
  declare numberOfWeeksInView: number;
  declare disabled: boolean;
  declare locale: string;
  declare calendarIdentifier: string;

  dayItemChanging: ((detail: CalendarViewDayItemChangingDetail) => void) | null = null;
  isBlackout: ((date: Date) => boolean) | null = null;

  private _selected: Date[] = [];
  private density = new Map<number, string[]>();
  private blackoutOverrides = new Map<number, boolean>();
  private display: Date = new Date(today().getFullYear(), today().getMonth(), 1);
  private focusDate: Date = today();
  private models!: Record<CalendarViewDisplayMode, ViewModel>;
  private headerBtn!: HTMLButtonElement;
  private prevBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;
  private scrolling: Animation | null = null;
  private switching = false;
  private wheelAcc = 0;
  private wheelTimer: ReturnType<typeof setTimeout> | null = null;
  private syncingSelectedAttr = false;
  private shownMode: CalendarViewDisplayMode = 'month';

  static {
    this.define('win-calendar-view');
  }

  get selectedDates(): Date[] {
    return this._selected.map((d) => new Date(d));
  }
  set selectedDates(v: Date[]) {
    const next = (v ?? []).map((d) => parseDate(d)).filter((d): d is Date => !!d);
    const mode = this.selectionMode;
    const list = mode === 'none' ? [] : mode === 'single' ? next.slice(-1) : next;
    this.applySelection(list, false);
  }

  get min(): Date {
    return parseDate(this.minDate) ?? new Date(today().getFullYear() - 100, 0, 1);
  }
  get max(): Date {
    return parseDate(this.maxDate) ?? new Date(today().getFullYear() + 100, 11, 31);
  }

  setDisplayDate(date: Date | string, animate = false): void {
    const d = parseDate(date);
    if (!d) return;
    this.focusDate = this.clampToRange(d);
    this.navigateTo(new Date(this.focusDate.getFullYear(), this.focusDate.getMonth(), 1), animate);
  }

  setDensityColors(date: Date | string, colors: string[] | null): void {
    const d = parseDate(date);
    if (!d) return;
    if (colors?.length) this.density.set(dayKey(d), colors.slice(0, 10));
    else this.density.delete(dayKey(d));
    this.refresh();
  }

  setBlackout(date: Date | string, blackout: boolean): void {
    const d = parseDate(date);
    if (!d) return;
    this.blackoutOverrides.set(dayKey(d), blackout);
    this.refresh();
  }

  refresh(): void {
    if (!this.isInitialized) return;
    this.renderMode(this.displayMode, this.models[this.displayMode].first);
  }

  override focus(opts?: FocusOptions): void {
    const el = this.focusedItem();
    if (el) el.focus(opts);
    else this.headerBtn?.focus(opts);
  }

  protected override firstConnected(): void {
    this.setAttribute('role', this.getAttribute('role') ?? 'group');
    const mk = (mode: CalendarViewDisplayMode): ViewModel => {
      const view = this.$(`.${mode}-view`);
      return {
        view,
        scroller: view.querySelector<HTMLElement>('.scroller')!,
        strip: view.querySelector<HTMLElement>('.strip')!,
        first: 0,
        rows: mode === 'month' ? 6 : 4,
      };
    };
    this.models = { month: mk('month'), year: mk('year'), decade: mk('decade') };
    this.headerBtn = this.$('.header-btn');
    this.prevBtn = this.$('.prev');
    this.nextBtn = this.$('.next');

    const sel = this._selected[0];
    if (sel) this.display = new Date(sel.getFullYear(), sel.getMonth(), 1);
    this.focusDate = sel ?? this.clampToRange(today());

    this.headerBtn.addEventListener('click', () => this.zoomOut());
    this.prevBtn.addEventListener('click', () => this.step(-1));
    this.nextBtn.addEventListener('click', () => this.step(1));

    for (const mode of MODES) {
      const m = this.models[mode];
      m.scroller.addEventListener('click', (ev) => this.onItemClick(mode, ev));
      m.scroller.addEventListener('keydown', (ev) => this.onItemKey(mode, ev));
      m.scroller.addEventListener('wheel', (ev) => this.onWheel(ev), { passive: false });
      this.wireSwipe(m.scroller);
    }
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('selectedDate') && !this.syncingSelectedAttr) {
      const d = parseDate(this.selectedDate);
      if (d ? !this.isSelected(d) : this._selected.length > 0) {
        this.applySelection(d ? [d] : [], false);
        if (d && !first) this.setDisplayDate(d, true);
        if (d && first) {
          this.display = new Date(d.getFullYear(), d.getMonth(), 1);
          this.focusDate = d;
        }
      }
    }
    if (changed.has('selectionMode')) {
      const mode = this.selectionMode;
      if (mode === 'none' && this._selected.length) this.applySelection([], true);
      if (mode === 'single' && this._selected.length > 1) this.applySelection(this._selected.slice(-1), true);
    }
    if (changed.has('disabled')) {
      this.aria('aria-disabled', this.disabled ? 'true' : null);
      for (const b of [this.headerBtn, this.prevBtn, this.nextBtn]) b.tabIndex = this.disabled ? -1 : 0;
    }
    if (changed.has('minDate') || changed.has('maxDate')) {
      this.display = this.clampMonth(this.display);
      this.focusDate = this.clampToRange(this.focusDate);
    }
    const mode = this.displayMode;
    if (first || changed.has('displayMode')) {
      if (!MODES.includes(mode)) {
        this.displayMode = 'month';
        return;
      }
      if (first) {
        for (const m of MODES) this.models[m].view.hidden = m !== mode;
        this.shownMode = mode;
        this.renderWeekdays();
        this.renderMode(mode, this.firstRowFor(mode));
        this.syncHeader(false);
        return;
      }
      if (mode !== this.shownMode && !this.switching) {
        this.switchMode(this.shownMode, mode);
        return;
      }
    }
    if (
      changed.has('firstDayOfWeek') ||
      changed.has('dayOfWeekFormat') ||
      changed.has('locale') ||
      changed.has('numberOfWeeksInView')
    ) {
      this.renderWeekdays();
    }
    const visual = [
      'firstDayOfWeek',
      'locale',
      'isTodayHighlighted',
      'isGroupLabelVisible',
      'isOutOfScopeEnabled',
      'minDate',
      'maxDate',
      'numberOfWeeksInView',
      'selectionMode',
    ];
    if (visual.some((k) => changed.has(k))) {
      this.renderMode(mode, this.firstRowFor(mode));
      this.syncHeader(false);
    }
  }

  private get loc(): string {
    return this.locale || localeFor(this);
  }

  private get firstDay(): number {
    return resolveFirstDay(this.firstDayOfWeek, this.loc);
  }

  private get weeks(): number {
    return Math.max(2, Math.min(8, Math.round(this.numberOfWeeksInView || 6)));
  }

  private clampToRange(d: Date): Date {
    const min = this.min;
    const max = this.max;
    if (d < min) return startOfDay(min);
    if (d > max) return startOfDay(max);
    return startOfDay(d);
  }

  private clampMonth(m: Date): Date {
    const min = this.min;
    const max = this.max;
    const first = new Date(m.getFullYear(), m.getMonth(), 1);
    if (first < new Date(min.getFullYear(), min.getMonth(), 1)) return new Date(min.getFullYear(), min.getMonth(), 1);
    if (first > new Date(max.getFullYear(), max.getMonth(), 1)) return new Date(max.getFullYear(), max.getMonth(), 1);
    return first;
  }

  private weekRowOf(d: Date): number {
    return Math.floor(diffDays(epochWeek(this.firstDay), startOfWeek(d, this.firstDay)) / 7);
  }

  private dateOfWeekRow(row: number): Date {
    return addDays(epochWeek(this.firstDay), row * 7);
  }

  private firstRowFor(mode: CalendarViewDisplayMode): number {
    const y = this.display.getFullYear();
    if (mode === 'month') return this.weekRowOf(this.display);
    if (mode === 'year') return y * 3;
    return Math.floor((Math.floor(y / 10) * 10) / 4);
  }

  private isDateBlackout(d: Date): boolean {
    const o = this.blackoutOverrides.get(dayKey(d));
    if (o !== undefined) return o;
    return this.isBlackout ? !!this.isBlackout(d) : false;
  }

  private isSelected(d: Date): boolean {
    return this._selected.some((s) => sameDay(s, d));
  }

  private renderWeekdays(): void {
    const labels = weekdayLabels(this.loc, this.firstDay, this.dayOfWeekFormat);
    const long = weekdayLabels(this.loc, this.firstDay, 'long');
    this.$('.weekdays').innerHTML = labels
      .map(
        (l, i) => `<div class="wd" role="columnheader" aria-label="${escapeHtml(long[i] ?? l)}">${escapeHtml(l)}</div>`,
      )
      .join('');
    this.models.month.rows = this.weeks;
    const viewsH = 2 + 42 + 2 + this.weeks * DAY_ROW + 2;
    this.$('.views').style.height = `${viewsH}px`;
    const inner = viewsH - 4;
    for (const m of ['year', 'decade'] as const) this.models[m].view.style.setProperty('--row-h', `${inner / 4}px`);
  }

  private renderRows(mode: CalendarViewDisplayMode, first: number, count: number): void {
    const m = this.models[mode];
    let html = '';
    for (let r = first; r < first + count; r++) html += this.rowHtml(mode, r);
    m.strip.innerHTML = html;
    if (mode === 'month') this.decorateDays(m.strip);
  }

  private renderMode(mode: CalendarViewDisplayMode, first: number): void {
    const m = this.models[mode];
    this.cancelScroll();
    m.first = first;
    this.renderRows(mode, first, m.rows);
    m.strip.style.transform = '';
    this.syncTabStop(mode);
    this.syncNavButtons();
  }

  private rowHtml(mode: CalendarViewDisplayMode, row: number): string {
    const min = this.min;
    const max = this.max;
    const todayD = today();
    const loc = this.loc;
    let out = `<div role="row" style="display:contents">`;
    if (mode === 'month') {
      const start = this.dateOfWeekRow(row);
      for (let i = 0; i < 7; i++) {
        const d = addDays(start, i);
        if (d < min || d > max) {
          out += `<div class="item blank" role="gridcell" aria-hidden="true"></div>`;
          continue;
        }
        const cls = ['item'];
        const inScope = d.getFullYear() === this.display.getFullYear() && d.getMonth() === this.display.getMonth();
        if (!inScope && this.isOutOfScopeEnabled) cls.push('oos');
        const sel = this.isSelected(d);
        if (sel) cls.push('selected');
        if (this.isTodayHighlighted && sameDay(d, todayD)) cls.push('today');
        if (this.isDateBlackout(d)) cls.push('blackout');
        const label = this.isGroupLabelVisible && d.getDate() === 1;
        if (label) cls.push('has-label');
        out += `<div class="${cls.join(' ')}" role="gridcell" tabindex="-1" data-key="${dayKey(d)}" aria-selected="${sel}" aria-label="${escapeHtml(dtf(loc, { dateStyle: 'full' }).format(d))}"><span class="chrome"></span>${
          label ? `<span class="label">${escapeHtml(dtf(loc, { month: 'short' }).format(d))}</span>` : ''
        }<span class="num">${d.getDate()}</span></div>`;
      }
    } else if (mode === 'year') {
      for (let i = 0; i < 4; i++) {
        const idx = row * 4 + i;
        const y = Math.floor(idx / 12);
        const mo = idx - y * 12;
        const d = new Date(y, mo, 1);
        d.setFullYear(y);
        const lastDay = new Date(y, mo, daysInMonth(y, mo));
        if (lastDay < min || d > max) {
          out += `<div class="item blank" role="gridcell" aria-hidden="true"></div>`;
          continue;
        }
        const cls = ['item'];
        if (y !== this.display.getFullYear() && this.isOutOfScopeEnabled) cls.push('oos');
        if (this.isTodayHighlighted && y === todayD.getFullYear() && mo === todayD.getMonth()) cls.push('today');
        const label = this.isGroupLabelVisible && mo === 0;
        if (label) cls.push('has-label');
        const aria = escapeHtml(dtf(loc, { year: 'numeric', month: 'long' }).format(d));
        const name = escapeHtml(dtf(loc, { month: 'short' }).format(d));
        out += `<div class="${cls.join(' ')}" role="gridcell" tabindex="-1" data-key="${y * 100 + mo + 1}" data-y="${y}" data-m="${mo}" aria-label="${aria}"><span class="chrome"></span>${
          label ? `<span class="label">${y}</span>` : ''
        }<span class="num">${name}</span></div>`;
      }
    } else {
      for (let i = 0; i < 4; i++) {
        const y = row * 4 + i;
        if (y < min.getFullYear() || y > max.getFullYear()) {
          out += `<div class="item blank" role="gridcell" aria-hidden="true"></div>`;
          continue;
        }
        const cls = ['item'];
        const decade = Math.floor(this.display.getFullYear() / 10) * 10;
        if ((y < decade || y > decade + 9) && this.isOutOfScopeEnabled) cls.push('oos');
        if (this.isTodayHighlighted && y === todayD.getFullYear()) cls.push('today');
        out += `<div class="${cls.join(' ')}" role="gridcell" tabindex="-1" data-key="${y}" data-y="${y}" aria-label="${y}"><span class="chrome"></span><span class="num">${y}</span></div>`;
      }
    }
    return `${out}</div>`;
  }

  private decorateDays(strip: HTMLElement): void {
    const hook = this.dayItemChanging;
    for (const item of strip.querySelectorAll<HTMLElement>('.item[data-key]')) {
      const key = Number(item.dataset.key);
      const d = new Date(Math.floor(key / 10000), Math.floor((key % 10000) / 100) - 1, key % 100);
      d.setFullYear(Math.floor(key / 10000));
      const detail: CalendarViewDayItemChangingDetail = {
        date: d,
        item,
        setDensityColors: (colors) => this.paintDensity(item, colors),
        setBlackout: (b) => item.classList.toggle('blackout', b),
      };
      hook?.(detail);
      this.dispatchEvent(new CustomEvent('calendarviewdayitemchanging', { detail, bubbles: false }));
      const colors = this.density.get(key);
      if (colors) this.paintDensity(item, colors);
    }
  }

  private paintDensity(item: HTMLElement, colors: string[] | null): void {
    item.querySelector('.density')?.remove();
    if (!colors?.length) return;
    const host = document.createElement('span');
    host.className = 'density';
    host.setAttribute('aria-hidden', 'true');
    for (const c of colors.slice(0, 10)) {
      const bar = document.createElement('i');
      bar.style.background = c;
      host.append(bar);
    }
    item.append(host);
  }

  private headerText(mode: CalendarViewDisplayMode): string {
    const loc = this.loc;
    const d = this.display;
    if (mode === 'month') return dtf(loc, { year: 'numeric', month: 'long' }).format(d);
    if (mode === 'year') return dtf(loc, { year: 'numeric' }).format(d);
    const start = Math.floor(d.getFullYear() / 10) * 10;
    const a = new Date(start, 0, 1);
    const b = new Date(start + 9, 0, 1);
    a.setFullYear(start);
    b.setFullYear(start + 9);
    return `${dtf(loc, { year: 'numeric' }).format(a)} - ${dtf(loc, { year: 'numeric' }).format(b)}`;
  }

  private syncHeader(fade: boolean): void {
    const mode = this.displayMode;
    const t = this.$('.header-text');
    t.textContent = this.headerText(mode);
    this.headerBtn.disabled = mode === 'decade' || this.disabled;
    this.headerBtn.setAttribute('aria-live', 'polite');
    const s = strings(this.loc);
    this.prevBtn.setAttribute('aria-label', s.previous);
    this.nextBtn.setAttribute('aria-label', s.next);
    if (fade)
      animate(this.headerBtn, [{ opacity: 0 }, { opacity: 1 }], { duration: durations.fast, easing: easings.linear });
  }

  private syncNavButtons(): void {
    const mode = this.displayMode;
    const min = this.min;
    const max = this.max;
    const d = this.display;
    let before: boolean;
    let after: boolean;
    if (mode === 'month') {
      before = d > new Date(min.getFullYear(), min.getMonth(), 1);
      after = d < new Date(max.getFullYear(), max.getMonth(), 1);
    } else if (mode === 'year') {
      before = d.getFullYear() > min.getFullYear();
      after = d.getFullYear() < max.getFullYear();
    } else {
      const dec = Math.floor(d.getFullYear() / 10);
      before = dec > Math.floor(min.getFullYear() / 10);
      after = dec < Math.floor(max.getFullYear() / 10);
    }
    this.prevBtn.disabled = !before || this.disabled;
    this.nextBtn.disabled = !after || this.disabled;
  }

  private itemKeyFor(mode: CalendarViewDisplayMode, d: Date): number {
    if (mode === 'month') return dayKey(d);
    if (mode === 'year') return d.getFullYear() * 100 + d.getMonth() + 1;
    return d.getFullYear();
  }

  private focusedItem(): HTMLElement | null {
    const mode = this.displayMode;
    return this.models?.[mode]?.strip.querySelector<HTMLElement>(`.item[tabindex="0"]`) ?? null;
  }

  private syncTabStop(mode: CalendarViewDisplayMode): void {
    const m = this.models[mode];
    const items = Array.from(m.strip.querySelectorAll<HTMLElement>('.item[data-key]'));
    const key = String(this.itemKeyFor(mode, this.focusDate));
    let target = items.find((i) => i.dataset.key === key) ?? null;
    if (!target) target = items.find((i) => !i.classList.contains('oos')) ?? items[0] ?? null;
    for (const i of items) i.tabIndex = i === target ? (this.disabled ? -1 : 0) : -1;
  }

  private cancelScroll(): void {
    if (this.scrolling) {
      this.scrolling.cancel();
      this.scrolling = null;
    }
  }

  step(dir: -1 | 1): void {
    const mode = this.displayMode;
    const d = this.display;
    let target: Date;
    if (mode === 'month') target = addMonths(d, dir);
    else if (mode === 'year') target = new Date(d.getFullYear() + dir, d.getMonth(), 1);
    else target = new Date(d.getFullYear() + dir * 10, d.getMonth(), 1);
    target = this.clampMonth(target);
    if (mode !== 'month') {
      const fy = this.focusDate.getFullYear() + (mode === 'year' ? dir : dir * 10);
      this.focusDate = this.clampToRange(new Date(fy, this.focusDate.getMonth(), 1));
    } else if (!(
      this.focusDate.getFullYear() === target.getFullYear() && this.focusDate.getMonth() === target.getMonth()
    )) {
      this.focusDate = this.clampToRange(
        new Date(
          target.getFullYear(),
          target.getMonth(),
          Math.min(this.focusDate.getDate(), daysInMonth(target.getFullYear(), target.getMonth())),
        ),
      );
    }
    this.navigateTo(target, true);
  }

  private navigateTo(month: Date, animated: boolean): Promise<void> {
    const mode = this.displayMode;
    const target = this.clampMonth(month);
    const m = this.models[mode];
    const sameScope =
      mode === 'month'
        ? target.getFullYear() === this.display.getFullYear() && target.getMonth() === this.display.getMonth()
        : mode === 'year'
          ? target.getFullYear() === this.display.getFullYear()
          : Math.floor(target.getFullYear() / 10) === Math.floor(this.display.getFullYear() / 10);
    this.display = target;
    const to = this.firstRowFor(mode);
    const from = m.first;
    if (sameScope && from === to) {
      this.syncTabStop(mode);
      return Promise.resolve();
    }
    this.syncHeader(true);
    const delta = to - from;
    const rowH = mode === 'month' ? DAY_ROW : m.scroller.clientHeight / 4 || 74;
    if (!animated || !motionEnabled() || Math.abs(delta) > 18 || delta === 0) {
      this.renderMode(mode, to);
      return Promise.resolve();
    }
    const active = this.renderRoot.activeElement;
    const hadFocus = !!active && m.strip.contains(active);
    this.cancelScroll();
    const lo = Math.min(from, to);
    const count = Math.abs(delta) + m.rows;
    this.renderRows(mode, lo, count);
    this.syncTabStop(mode);
    if (hadFocus) this.focusedItem()?.focus({ preventScroll: true });
    const fromY = -(from - lo) * rowH;
    const toY = -(to - lo) * rowH;
    m.first = to;
    this.syncNavButtons();
    const anim = animate(m.strip, [{ transform: `translateY(${fromY}px)` }, { transform: `translateY(${toY}px)` }], {
      duration: durations.slow,
      easing: easings.decelerate,
      fill: 'forwards',
    });
    this.scrolling = anim;
    return settled(anim).then(() => {
      if (this.scrolling !== anim) return;
      this.scrolling = null;
      const a2 = this.renderRoot.activeElement;
      const stillFocused = !!a2 && m.strip.contains(a2);
      this.renderRows(mode, to, m.rows);
      anim.cancel();
      m.strip.style.transform = '';
      this.syncTabStop(mode);
      if (stillFocused) this.focusedItem()?.focus({ preventScroll: true });
    });
  }

  zoomOut(): void {
    const mode = this.displayMode;
    if (mode === 'decade' || this.switching) return;
    const next: CalendarViewDisplayMode = mode === 'month' ? 'year' : 'decade';
    if (next === 'year') this.focusDate = new Date(this.display.getFullYear(), this.display.getMonth(), 1);
    else this.focusDate = new Date(this.display.getFullYear(), 0, 1);
    this.switchMode(mode, next);
  }

  private zoomIn(to: Date): void {
    const mode = this.displayMode;
    if (mode === 'month' || this.switching) return;
    const next: CalendarViewDisplayMode = mode === 'decade' ? 'year' : 'month';
    this.display = this.clampMonth(to);
    if (next === 'month') {
      const sel = this._selected.find((s) => s.getFullYear() === to.getFullYear() && s.getMonth() === to.getMonth());
      this.focusDate = sel ?? this.clampToRange(new Date(to.getFullYear(), to.getMonth(), 1));
    } else {
      this.focusDate = new Date(to.getFullYear(), this.display.getMonth(), 1);
    }
    this.switchMode(mode, next);
  }

  private switchMode(from: CalendarViewDisplayMode, to: CalendarViewDisplayMode): void {
    const zoomingOut = MODES.indexOf(to) > MODES.indexOf(from);
    const outgoing = this.models[from].view;
    const incoming = this.models[to].view;
    const hadFocus = this.matches(':focus-within');
    this.switching = true;
    this.shownMode = to;
    this.cancelScroll();
    this.displayMode = to;
    this.flushUpdates();
    incoming.hidden = false;
    this.renderMode(to, this.firstRowFor(to));
    this.syncHeader(true);
    const outScale = zoomingOut ? 0.84 : 1.29;
    const inScale = zoomingOut ? 1.29 : 0.84;
    animate(
      outgoing,
      [
        { opacity: 1, transform: 'scale(1)' },
        { opacity: 0, transform: `scale(${outScale})` },
      ],
      {
        duration: 150,
        easing: easings.decelerate,
        fill: 'forwards',
      },
    );
    const a = animate(
      incoming,
      [
        { offset: 0, opacity: 0, transform: `scale(${inScale})` },
        { offset: 0.3, opacity: 0, transform: `scale(${inScale})`, easing: easings.decelerate },
        { offset: 1, opacity: 1, transform: 'scale(1)' },
      ],
      { duration: 500 },
    );
    if (hadFocus) this.focusedItem()?.focus({ preventScroll: true });
    void settled(a).then(() => {
      outgoing.hidden = this.displayMode !== (outgoing.dataset.view as CalendarViewDisplayMode);
      for (const an of outgoing.getAnimations()) an.cancel();
      this.switching = false;
    });
    this.emit('displaymodechanged', { mode: to });
  }

  private applySelection(list: Date[], emit: boolean): void {
    const prev = this._selected;
    const added = list.filter((d) => !prev.some((p) => sameDay(p, d)));
    const removed = prev.filter((p) => !list.some((d) => sameDay(p, d)));
    this._selected = list.map((d) => startOfDay(d));
    if (!added.length && !removed.length) return;
    this.syncingSelectedAttr = true;
    this.selectedDate = this._selected[this._selected.length - 1]
      ? toIsoDate(this._selected[this._selected.length - 1])
      : '';
    this.syncingSelectedAttr = false;
    if (this.isInitialized) {
      for (const strip of [this.models.month.strip]) {
        for (const d of [...added, ...removed]) {
          const el = strip.querySelector<HTMLElement>(`.item[data-key="${dayKey(d)}"]`);
          if (!el) continue;
          const on = this.isSelected(d);
          el.classList.toggle('selected', on);
          el.setAttribute('aria-selected', String(on));
        }
      }
    }
    if (emit)
      this.emit<SelectedDatesChangedDetail>('selecteddateschanged', { addedDates: added, removedDates: removed });
  }

  private toggleDate(d: Date): void {
    const mode = this.selectionMode;
    if (mode === 'none' || this.isDateBlackout(d)) return;
    const on = this.isSelected(d);
    if (mode === 'single') this.applySelection(on ? [] : [d], true);
    else this.applySelection(on ? this._selected.filter((s) => !sameDay(s, d)) : [...this._selected, d], true);
  }

  private dateFromItem(mode: CalendarViewDisplayMode, item: HTMLElement): Date {
    if (mode === 'month') {
      const key = Number(item.dataset.key);
      const d = new Date(Math.floor(key / 10000), Math.floor((key % 10000) / 100) - 1, key % 100);
      d.setFullYear(Math.floor(key / 10000));
      return d;
    }
    const y = Number(item.dataset.y);
    const d = new Date(y, mode === 'year' ? Number(item.dataset.m) : 0, 1);
    d.setFullYear(y);
    return d;
  }

  private onItemClick(mode: CalendarViewDisplayMode, ev: MouseEvent): void {
    if (this.disabled || this.switching) return;
    const item = (ev.target as Element).closest<HTMLElement>('.item[data-key]');
    if (!item) return;
    const d = this.dateFromItem(mode, item);
    this.focusDate = d;
    for (const i of this.models[mode].strip.querySelectorAll<HTMLElement>('.item[data-key]'))
      i.tabIndex = i === item ? 0 : -1;
    item.focus({ preventScroll: true });
    if (mode === 'month') this.toggleDate(d);
    else this.zoomIn(d);
  }

  private onItemKey(mode: CalendarViewDisplayMode, ev: KeyboardEvent): void {
    if (this.disabled) return;
    const item = (ev.target as Element).closest<HTMLElement>('.item[data-key]');
    if (!item) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const cur = this.dateFromItem(mode, item);
    let next: Date | null = null;
    const left = rtl ? 'ArrowRight' : 'ArrowLeft';
    const right = rtl ? 'ArrowLeft' : 'ArrowRight';
    if (ev.ctrlKey && ev.key === 'ArrowUp') {
      ev.preventDefault();
      this.zoomOut();
      return;
    }
    if (ev.ctrlKey && ev.key === 'ArrowDown') {
      ev.preventDefault();
      if (mode !== 'month') this.zoomIn(cur);
      return;
    }
    if (mode === 'month') {
      switch (ev.key) {
        case left:
          next = addDays(cur, -1);
          break;
        case right:
          next = addDays(cur, 1);
          break;
        case 'ArrowUp':
          next = addDays(cur, -7);
          break;
        case 'ArrowDown':
          next = addDays(cur, 7);
          break;
        case 'PageUp':
          next = addMonths(cur, -1);
          break;
        case 'PageDown':
          next = addMonths(cur, 1);
          break;
        case 'Home':
          next = new Date(cur.getFullYear(), cur.getMonth(), 1);
          break;
        case 'End':
          next = new Date(cur.getFullYear(), cur.getMonth(), daysInMonth(cur.getFullYear(), cur.getMonth()));
          break;
        case 'Enter':
        case ' ':
          ev.preventDefault();
          this.toggleDate(cur);
          return;
      }
    } else {
      const unit = (n: number) =>
        mode === 'year'
          ? addMonths(new Date(cur.getFullYear(), cur.getMonth(), 1), n)
          : new Date(cur.getFullYear() + n, 0, 1);
      switch (ev.key) {
        case left:
          next = unit(-1);
          break;
        case right:
          next = unit(1);
          break;
        case 'ArrowUp':
          next = unit(-4);
          break;
        case 'ArrowDown':
          next = unit(4);
          break;
        case 'PageUp':
          next = unit(mode === 'year' ? -12 : -10);
          break;
        case 'PageDown':
          next = unit(mode === 'year' ? 12 : 10);
          break;
        case 'Home':
          next =
            mode === 'year'
              ? new Date(cur.getFullYear(), 0, 1)
              : new Date(Math.floor(cur.getFullYear() / 10) * 10, 0, 1);
          break;
        case 'End':
          next =
            mode === 'year'
              ? new Date(cur.getFullYear(), 11, 1)
              : new Date(Math.floor(cur.getFullYear() / 10) * 10 + 9, 0, 1);
          break;
        case 'Enter':
        case ' ':
          ev.preventDefault();
          this.zoomIn(cur);
          return;
      }
    }
    if (!next) return;
    ev.preventDefault();
    this.moveFocus(mode, next);
  }

  private moveFocus(mode: CalendarViewDisplayMode, target: Date): void {
    const min = this.min;
    const max = this.max;
    let d = target;
    if (mode === 'month') d = this.clampToRange(d);
    else if (mode === 'year') {
      if (new Date(d.getFullYear(), d.getMonth(), daysInMonth(d.getFullYear(), d.getMonth())) < min)
        d = new Date(min.getFullYear(), min.getMonth(), 1);
      if (d > max) d = new Date(max.getFullYear(), max.getMonth(), 1);
    } else {
      if (d.getFullYear() < min.getFullYear()) d = new Date(min.getFullYear(), 0, 1);
      if (d.getFullYear() > max.getFullYear()) d = new Date(max.getFullYear(), 0, 1);
    }
    this.focusDate = d;
    const inScope =
      mode === 'month'
        ? d.getFullYear() === this.display.getFullYear() && d.getMonth() === this.display.getMonth()
        : mode === 'year'
          ? d.getFullYear() === this.display.getFullYear()
          : Math.floor(d.getFullYear() / 10) === Math.floor(this.display.getFullYear() / 10);
    const focusIt = () => {
      this.syncTabStop(mode);
      this.focusedItem()?.focus({ preventScroll: true });
    };
    if (inScope) focusIt();
    else
      void this.navigateTo(
        new Date(d.getFullYear(), mode === 'decade' ? this.display.getMonth() : d.getMonth(), 1),
        true,
      ).then(focusIt);
  }

  private onWheel(ev: WheelEvent): void {
    if (this.disabled) return;
    ev.preventDefault();
    this.wheelAcc += ev.deltaY;
    if (this.wheelTimer) clearTimeout(this.wheelTimer);
    this.wheelTimer = setTimeout(() => (this.wheelAcc = 0), 180);
    if (Math.abs(this.wheelAcc) >= 40) {
      const dir = this.wheelAcc > 0 ? 1 : -1;
      this.wheelAcc = 0;
      this.step(dir);
    }
  }

  private wireSwipe(scroller: HTMLElement): void {
    let startY = 0;
    let id = -1;
    scroller.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse') return;
      id = ev.pointerId;
      startY = ev.clientY;
    });
    scroller.addEventListener('pointerup', (ev) => {
      if (ev.pointerId !== id) return;
      id = -1;
      const dy = ev.clientY - startY;
      if (Math.abs(dy) > 30) this.step(dy < 0 ? 1 : -1);
    });
    scroller.addEventListener('pointercancel', () => (id = -1));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-calendar-view': WinCalendarView;
  }
}
