import { WinElement, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css, focusRing } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { Popup, popupResetCss } from '../../base/popup.ts';
import type {
  WinCalendarView,
  CalendarViewDayItemChangingDetail,
  SelectedDatesChangedDetail,
} from './calendar-view.ts';
import { dtf, formatDate, localeFor, parseDate, sameDay, strings, toIsoDate, today } from './date-utils.ts';
import type { DateChangedDetail } from './pickers.ts';

const cdpCss = css`
:host {
  display: inline-flex;
  flex-direction: column;
  vertical-align: middle;
  color: var(--w-text-fill-color-primary);
}
.header { margin: 0 0 8px; overflow-wrap: anywhere; }
.header[hidden], .description[hidden] { display: none; }
.field {
  box-sizing: border-box;
  display: grid;
  grid-template-columns: 1fr 32px;
  align-items: center;
  min-height: 32px;
  border: 1px solid;
  border-color: var(--w-control-elevation-border);
  border-radius: var(--w-corner-radius-control);
  background-color: var(--w-control-fill-color-default);
  background-clip: padding-box;
  outline: none;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  transition: background-color var(--w-duration-faster) linear;
}
.text {
  padding: 0 0 2px 12px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  color: var(--w-text-fill-color-primary);
}
.glyph { display: grid; place-items: center; color: var(--w-text-fill-color-secondary); }
.field:hover { background-color: var(--w-control-fill-color-secondary); }
.field:active {
  background-color: var(--w-control-fill-color-tertiary);
  border-color: var(--w-control-stroke-color-default);
}
.field:active .text { color: var(--w-text-fill-color-secondary); }
:host([disabled]) { pointer-events: none; }
:host([disabled]) .header { color: var(--w-text-fill-color-disabled); }
:host([disabled]) .field {
  background-color: var(--w-control-fill-color-disabled);
  border-color: var(--w-control-stroke-color-default);
}
:host([disabled]) .text, :host([disabled]) .glyph { color: var(--w-text-fill-color-disabled); }
.description { color: var(--w-text-fill-color-secondary); overflow-wrap: anywhere; }
${focusRing('.field:focus-visible', 3)}
${popupResetCss('.flyout')}
.surface {
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-flyout);
  overflow: hidden;
  --calendar-radius: var(--w-corner-radius-overlay);
}
.surface win-calendar-view { display: block; }
`;

export class WinCalendarDatePicker extends WinElement {
  static override styles = [cdpCss];
  static override shadowInit: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override formAssociated = true;
  static override template = `<div class="header" part="header" hidden></div><div class="field" part="field" role="button" tabindex="0" aria-haspopup="dialog" aria-expanded="false"><span class="text" part="text"></span><span class="glyph" part="glyph" aria-hidden="true">${glyph('calendar', 12)}</span></div><div class="description" part="description" hidden></div><div class="flyout" part="flyout"><div class="surface" part="flyout-presenter"><win-calendar-view part="calendar"></win-calendar-view></div></div>`;
  static override props: PropDefs = {
    date: { type: String },
    placeholder: { type: String },
    header: { type: String },
    description: { type: String },
    dateFormat: { type: String, attribute: 'date-format' },
    minDate: { type: String, attribute: 'min-date' },
    maxDate: { type: String, attribute: 'max-date' },
    isTodayHighlighted: { type: Boolean, attribute: 'is-today-highlighted', default: true },
    isGroupLabelVisible: { type: Boolean, attribute: 'is-group-label-visible' },
    isOutOfScopeEnabled: { type: Boolean, attribute: 'is-out-of-scope-enabled', default: true },
    firstDayOfWeek: { type: String, attribute: 'first-day-of-week', default: 'auto' },
    dayOfWeekFormat: { type: String, attribute: 'day-of-week-format', default: 'auto' },
    displayMode: { type: String, attribute: 'display-mode', default: 'month' },
    isCalendarOpen: { type: Boolean, attribute: 'is-calendar-open' },
    disabled: { type: Boolean },
    name: { type: String },
    locale: { type: String },
  };
  declare date: string;
  declare placeholder: string;
  declare header: string;
  declare description: string;
  declare dateFormat: string;
  declare minDate: string;
  declare maxDate: string;
  declare isTodayHighlighted: boolean;
  declare isGroupLabelVisible: boolean;
  declare isOutOfScopeEnabled: boolean;
  declare firstDayOfWeek: string;
  declare dayOfWeekFormat: string;
  declare displayMode: string;
  declare isCalendarOpen: boolean;
  declare disabled: boolean;
  declare name: string;
  declare locale: string;

  private field!: HTMLElement;
  private popup!: Popup;
  private calendar!: WinCalendarView;
  private _dayItemChanging: ((d: CalendarViewDayItemChangingDetail) => void) | null = null;
  private _isBlackout: ((d: Date) => boolean) | null = null;

  static {
    this.define('win-calendar-date-picker');
  }

  get value(): Date | null {
    return parseDate(this.date);
  }
  set value(d: Date | null) {
    this.date = d ? toIsoDate(d) : '';
  }

  get dayItemChanging(): ((d: CalendarViewDayItemChangingDetail) => void) | null {
    return this._dayItemChanging;
  }
  set dayItemChanging(fn: ((d: CalendarViewDayItemChangingDetail) => void) | null) {
    this._dayItemChanging = fn;
    if (this.calendar) this.calendar.dayItemChanging = fn;
  }

  get isBlackout(): ((d: Date) => boolean) | null {
    return this._isBlackout;
  }
  set isBlackout(fn: ((d: Date) => boolean) | null) {
    this._isBlackout = fn;
    if (this.calendar) this.calendar.isBlackout = fn;
  }

  private get loc(): string {
    return this.locale || localeFor(this);
  }

  protected override firstConnected(): void {
    this.field = this.$('.field');
    this.calendar = this.$<WinCalendarView>('win-calendar-view');
    this.calendar.dayItemChanging = this._dayItemChanging;
    this.calendar.isBlackout = this._isBlackout;
    this.popup = new Popup(this.$('.flyout'), this.$('.surface'));
    this.field.addEventListener('click', (ev) => {
      if (this.disabled) return;
      if (this.popup.isOpen) this.closeCalendar();
      else this.openCalendar(ev.detail === 0);
    });
    this.field.addEventListener('keydown', (ev) => {
      if (this.disabled) return;
      if (ev.key === 'Enter' || ev.key === ' ' || (ev.key === 'ArrowDown' && ev.altKey) || ev.key === 'F4') {
        ev.preventDefault();
        this.openCalendar(true);
      }
    });
    this.calendar.addEventListener('selecteddateschanged', (ev) => {
      const { addedDates } = (ev as CustomEvent<SelectedDatesChangedDetail>).detail;
      ev.stopPropagation();
      const picked = addedDates[addedDates.length - 1];
      if (picked) this.setValue(picked, true);
      else {
        const cur = this.value;
        this.calendar.selectedDates = cur ? [cur] : [];
      }
      this.closeCalendar();
    });
    this.calendar.addEventListener('calendarviewdayitemchanging', (ev) => {
      this.dispatchEvent(
        new CustomEvent('calendarviewdayitemchanging', { detail: (ev as CustomEvent).detail, bubbles: false }),
      );
    });
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('header')) {
      const h = this.$('.header');
      h.textContent = this.header;
      h.hidden = !this.header;
    }
    if (changed.has('description')) {
      const d = this.$('.description');
      d.textContent = this.description;
      d.hidden = !this.description;
    }
    if (changed.has('disabled')) {
      this.field.tabIndex = this.disabled ? -1 : 0;
      this.field.setAttribute('aria-disabled', String(this.disabled));
      if (this.disabled) this.closeCalendar();
    }
    const cal = this.calendar;
    if (changed.has('minDate')) cal.minDate = this.minDate;
    if (changed.has('maxDate')) cal.maxDate = this.maxDate;
    if (changed.has('isTodayHighlighted')) cal.isTodayHighlighted = this.isTodayHighlighted;
    if (changed.has('isGroupLabelVisible')) cal.isGroupLabelVisible = this.isGroupLabelVisible;
    if (changed.has('isOutOfScopeEnabled')) cal.isOutOfScopeEnabled = this.isOutOfScopeEnabled;
    if (changed.has('firstDayOfWeek')) cal.firstDayOfWeek = this.firstDayOfWeek;
    if (changed.has('dayOfWeekFormat'))
      cal.dayOfWeekFormat = this.dayOfWeekFormat as WinCalendarView['dayOfWeekFormat'];
    if (changed.has('locale')) cal.locale = this.locale;
    if (changed.has('isCalendarOpen') && !first) {
      if (this.isCalendarOpen) this.openCalendar(false);
      else this.closeCalendar();
    }
    if (
      changed.has('date') ||
      changed.has('placeholder') ||
      changed.has('dateFormat') ||
      changed.has('locale') ||
      first
    ) {
      this.renderText();
      this.internals.setFormValue(this.value ? toIsoDate(this.value) : null);
    }
    if (first && this.isCalendarOpen) queueMicrotask(() => this.openCalendar(false));
  }

  private renderText(): void {
    const d = this.value;
    const loc = this.loc;
    const text = d
      ? this.dateFormat
        ? formatDate(d, this.dateFormat, loc)
        : dtf(loc, { year: 'numeric', month: 'numeric', day: 'numeric' }).format(d)
      : this.placeholder || strings(loc).pickDate;
    this.$('.text').textContent = text;
    const label = d ? dtf(loc, { dateStyle: 'full' }).format(d) : text;
    this.field.setAttribute('aria-label', this.header ? `${this.header} ${label}` : label);
  }

  private setValue(d: Date | null, user: boolean): void {
    const old = this.value;
    if (sameDay(old, d) && !!old === !!d) return;
    this.date = d ? toIsoDate(d) : '';
    if (user) {
      const detail: DateChangedDetail = { oldDate: old, newDate: d };
      this.emit('datechanged', detail);
      this.emit('change', detail);
    }
  }

  openCalendar(viaKeyboard = false): void {
    if (this.popup.isOpen || this.disabled) return;
    const cal = this.calendar;
    const d = this.value;
    cal.selectionMode = 'single';
    cal.selectedDates = d ? [d] : [];
    if (this.displayMode === 'year' || this.displayMode === 'decade') cal.displayMode = this.displayMode;
    else cal.displayMode = 'month';
    cal.setDisplayDate(d ?? today(), false);
    this.field.setAttribute('aria-expanded', 'true');
    this.isCalendarOpen = true;
    this.popup.open({
      anchor: this.field,
      placement: 'bottom',
      offset: 4,
      focus: 'none',
      onClosed: () => {
        this.field.setAttribute('aria-expanded', 'false');
        this.isCalendarOpen = false;
        this.emit('closed', undefined, { bubbles: false });
      },
    });
    requestAnimationFrame(() => cal.focus({ preventScroll: true }));
    void viaKeyboard;
    this.emit('opened', undefined, { bubbles: false });
  }

  closeCalendar(): void {
    if (this.popup?.isOpen) void this.popup.close('programmatic');
  }

  formResetCallback(): void {
    this.setValue(parseDate(this.getAttribute('date')), false);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-calendar-date-picker': WinCalendarDatePicker;
  }
}
