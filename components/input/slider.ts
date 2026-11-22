import { WinElement, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css } from '../../base/css.ts';
import { Popup, popupResetCss, viewportSize, type PositionResult } from '../../base/popup.ts';
import { durations, fadeIn, fadeOut, motionEnabled } from '../../motion/animate.ts';
import { clamp, focusRect, headerCss, roundToStep } from './shared.ts';

export type TickPlacement = 'none' | 'top-left' | 'bottom-right' | 'outside' | 'inline';

const sliderCss = css`
:host {
  --track: var(--w-control-strong-fill-color-default);
  --value-fill: var(--w-accent-fill-color-default);
  --thumb-fill: var(--w-accent-fill-color-default);
  --tick: var(--w-control-strong-fill-color-default);
  --inner-scale: 0.86;
  --inner-dur: var(--w-duration-fast);
  display: block;
  box-sizing: border-box;
  min-width: 32px;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  outline: none;
}
:host([orientation="vertical"]) {
  display: inline-flex;
  flex-direction: column;
  height: 200px;
  min-width: 32px;
}
.header { margin: 0 0 4px; }
.container {
  position: relative;
  height: 32px;
  border-radius: var(--w-corner-radius-control);
  cursor: default;
}
:host([orientation="vertical"]) .container {
  height: auto;
  flex: 1;
  width: 32px;
  min-height: 32px;
}
${focusRect(':host(:focus-visible) .container::after', { top: 0, right: 7, bottom: 0, left: 7 }, 7)}

.rail {
  position: absolute;
  left: 0; right: 0;
  top: 14px;
  height: 4px;
  border-radius: 2px;
  background: var(--track);
}
:host([orientation="vertical"]) .rail {
  top: 0; bottom: 0;
  left: 14px; right: auto;
  width: 4px; height: auto;
}
.fill, .thumb {
  transition:
    left var(--glide, 0ms) var(--w-ease-decelerate),
    right var(--glide, 0ms) var(--w-ease-decelerate),
    top var(--glide, 0ms) var(--w-ease-decelerate),
    bottom var(--glide, 0ms) var(--w-ease-decelerate),
    width var(--glide, 0ms) var(--w-ease-decelerate),
    height var(--glide, 0ms) var(--w-ease-decelerate);
}
:host(:dir(rtl):not([orientation="vertical"])) .container { scale: -1 1; }
.fill {
  position: absolute;
  top: 0; bottom: 0;
  left: 0;
  width: calc((100% - 18px) * var(--pct, 0));
  border-radius: 2px;
  background: var(--value-fill);
}
:host([orientation="vertical"]) .fill {
  top: auto;
  left: 0; right: 0;
  bottom: 0;
  width: auto;
  height: calc((100% - 18px) * var(--pct, 0));
}
:host([reversed]) .fill { left: auto; right: 0; }
:host([orientation="vertical"][reversed]) .fill { bottom: auto; top: 0; }

.ticks {
  position: absolute;
  left: 0; right: 0;
  height: 4px;
  display: none;
  pointer-events: none;
}
.ticks > i {
  position: absolute;
  top: 0;
  width: 1px;
  height: 100%;
  background: var(--tick);
  translate: -0.5px 0;
}
.ticks.before { top: 6px; }
.ticks.after { top: 22px; }
.ticks.inline { top: 0; }
.ticks.inline > i { background: var(--w-control-fill-color-input-active); }
:host([orientation="vertical"]) .ticks {
  top: 0; bottom: 0;
  width: 4px; height: auto;
}
:host([orientation="vertical"]) .ticks > i {
  top: auto; left: 0;
  width: 100%; height: 1px;
  translate: 0 0.5px;
}
:host([orientation="vertical"]) .ticks.before { left: 6px; }
:host([orientation="vertical"]) .ticks.after { left: 22px; }
:host([orientation="vertical"]) .ticks.inline { left: 0; }
:host([tick-placement="top-left"]) .ticks.before,
:host([tick-placement="bottom-right"]) .ticks.after,
:host([tick-placement="outside"]) .ticks.before,
:host([tick-placement="outside"]) .ticks.after,
:host([tick-placement="inline"]) .ticks.inline { display: block; }

.thumb {
  position: absolute;
  top: 7px;
  left: calc((100% - 18px) * var(--pct, 0));
  width: 18px;
  height: 18px;
}
:host([reversed]) .thumb { left: auto; right: calc((100% - 18px) * var(--pct, 0)); }
:host([orientation="vertical"]) .thumb {
  top: auto;
  left: 7px;
  bottom: calc((100% - 18px) * var(--pct, 0));
}
:host([orientation="vertical"][reversed]) .thumb { bottom: auto; right: auto; top: calc((100% - 18px) * var(--pct, 0)); }
.thumb::before {
  content: '';
  position: absolute;
  inset: -2px;
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid;
  border-color: var(--w-control-elevation-border);
  background: var(--w-control-solid-fill-color-default);
  background-clip: padding-box;
}
.inner {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 12px;
  height: 12px;
  margin: -6px 0 0 -6px;
  border-radius: 50%;
  background: var(--thumb-fill);
  scale: var(--inner-scale);
  transition: scale var(--inner-dur) var(--w-ease-decelerate);
}
.thumb:hover { --inner-scale: 1.167; --inner-dur: var(--w-duration-normal); }

.container:hover { --value-fill: var(--w-accent-fill-color-secondary); --thumb-fill: var(--w-accent-fill-color-secondary); }
:host([dragging]) .container {
  --value-fill: var(--w-accent-fill-color-tertiary);
  --thumb-fill: var(--w-accent-fill-color-tertiary);
}
:host([dragging]) .thumb { --inner-scale: 0.71; --inner-dur: var(--w-duration-normal); }
:host([disabled]) {
  --track: var(--w-control-strong-fill-color-disabled);
  --value-fill: var(--w-accent-fill-color-disabled);
  --thumb-fill: var(--w-accent-fill-color-disabled);
  --tick: var(--w-control-strong-fill-color-disabled);
  --inner-scale: 1.167;
  color: var(--w-text-fill-color-disabled);
  pointer-events: none;
}

${popupResetCss('.tip')}
.tip {
  box-sizing: border-box;
  padding: 6px 9px 8px;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-control);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-tooltip);
  font: var(--w-type-caption);
  color: var(--w-text-fill-color-primary);
  max-width: 320px;
  white-space: nowrap;
  pointer-events: none;
}
`;

export class WinSlider extends WinElement {
  static override styles = [headerCss, sliderCss];
  static override formAssociated = true;
  static override template = `<div class="header" part="header" hidden><slot name="header"></slot><span class="header-text"></span></div><div class="container" part="container"><div class="ticks before" part="ticks"></div><div class="rail" part="track"><div class="fill" part="fill"></div><div class="ticks inline"></div></div><div class="ticks after" part="ticks"></div><div class="thumb" part="thumb"><span class="inner"></span></div><div class="tip" part="tooltip" role="presentation"></div></div>`;
  static override props: PropDefs = {
    value: { type: Number, default: 0 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    step: { type: Number, default: 1 },
    smallChange: { type: Number, attribute: 'small-change', default: 1 },
    largeChange: { type: Number, attribute: 'large-change', default: 10 },
    tickFrequency: { type: Number, attribute: 'tick-frequency', default: 0 },
    tickPlacement: { type: String, attribute: 'tick-placement', reflect: true, default: 'none' },
    orientation: { type: String, reflect: true, default: 'horizontal' },
    reversed: { type: Boolean },
    thumbToolTip: { type: Boolean, attribute: 'thumb-tool-tip', default: true },
    snapsTo: { type: String, attribute: 'snaps-to', default: 'step-values' },
    header: { type: String },
    disabled: { type: Boolean },
    name: { type: String, reflect: true },
  };
  declare value: number;
  declare min: number;
  declare max: number;
  declare step: number;
  declare smallChange: number;
  declare largeChange: number;
  declare tickFrequency: number;
  declare tickPlacement: TickPlacement;
  declare orientation: 'horizontal' | 'vertical';
  declare reversed: boolean;
  declare thumbToolTip: boolean;
  declare snapsTo: 'step-values' | 'ticks';
  declare header: string;
  declare disabled: boolean;
  declare name: string;

  private tip!: Popup;
  private dragId: number | null = null;
  private dragStartValue = 0;
  private defaultValue = 0;
  private ro: ResizeObserver | null = null;
  private userSetting = false;
  private glideEnd = 0;
  private lastMove: { t: number; x: number; y: number } | null = null;

  valueFormatter: ((v: number) => string) | null = null;

  static {
    this.define('win-slider');
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'slider');
    this.defaultValue = this.value;
    this.tip = new Popup(this.$('.tip'));
    this.$<HTMLSlotElement>('slot[name="header"]').addEventListener('slotchange', () => this.syncHeader());
    const container = this.$('.container');
    container.addEventListener('pointerdown', (ev) => this.onDown(ev));
    container.addEventListener('pointermove', (ev) => this.onMove(ev));
    container.addEventListener('pointerup', (ev) => this.onUp(ev));
    container.addEventListener('pointercancel', (ev) => this.onUp(ev));
    container.addEventListener('lostpointercapture', (ev) => this.onUp(ev));
    this.addEventListener('keydown', (ev) => this.onKey(ev));
    this.ro = new ResizeObserver(() => this.renderTicks());
    this.ro.observe(container);
  }

  protected override disconnected(): void {
    void this.tip?.close();
  }

  private get vertical(): boolean {
    return this.orientation === 'vertical';
  }

  coerce(v: number): number {
    const min = Math.min(this.min, this.max);
    const max = Math.max(this.min, this.max);
    const snap = this.snapsTo === 'ticks' && this.tickFrequency > 0 ? this.tickFrequency : this.step;
    let out = snap > 0 ? roundToStep(v, snap, min) : v;
    out = clamp(out, min, max);
    return out;
  }

  private pct(): number {
    const span = this.max - this.min;
    return span ? clamp((this.value - this.min) / span, 0, 1) : 0;
  }

  private valueFromPointer(ev: PointerEvent): number {
    const r = this.$('.container').getBoundingClientRect();
    let p: number;
    if (this.vertical) p = (r.bottom - ev.clientY - 9) / Math.max(1, r.height - 18);
    else {
      const rtl = getComputedStyle(this).direction === 'rtl';
      p = (ev.clientX - r.left - 9) / Math.max(1, r.width - 18);
      if (rtl) p = 1 - p;
    }
    p = clamp(p, 0, 1);
    if (this.reversed) p = 1 - p;
    return this.min + p * (this.max - this.min);
  }

  private snapPixels(): number {
    const r = this.$('.container').getBoundingClientRect();
    const len = (this.vertical ? r.height : r.width) - 18;
    const span = Math.abs(this.max - this.min) || 1;
    const snap = this.snapsTo === 'ticks' && this.tickFrequency > 0 ? this.tickFrequency : this.step;
    return snap > 0 ? (len * snap) / span : 0;
  }

  private setFromUser(v: number, commit: boolean, glide = 0): void {
    const nv = this.coerce(v);
    const changed = nv !== this.value;
    if (changed) {
      const now = performance.now();
      let ms = glide;
      if (ms > 0) this.glideEnd = now + ms;
      else if (now < this.glideEnd) ms = Math.ceil(this.glideEnd - now);
      if (!motionEnabled()) ms = 0;
      this.style.setProperty('--glide', `${ms}ms`);
      this.userSetting = true;
      this.value = nv;
      this.flushUpdates();
      this.emit('input', { value: nv });
    }
    if (commit && (changed || nv !== this.dragStartValue)) this.emit('change', { value: nv });
  }

  private onDown(ev: PointerEvent): void {
    if (this.disabled || ev.button !== 0) return;
    ev.preventDefault();
    this.focus({ preventScroll: true });
    const c = this.$('.container');
    c.setPointerCapture(ev.pointerId);
    this.dragId = ev.pointerId;
    this.dragStartValue = this.value;
    this.lastMove = { t: performance.now(), x: ev.clientX, y: ev.clientY };
    this.toggleAttribute('dragging', true);
    this.setFromUser(this.valueFromPointer(ev), false, durations.fast);
    this.showTip();
    this.followTip();
  }

  private onMove(ev: PointerEvent): void {
    if (this.dragId !== ev.pointerId) return;
    const now = performance.now();
    const last = this.lastMove;
    const speed = last ? Math.hypot(ev.clientX - last.x, ev.clientY - last.y) / Math.max(1, now - last.t) : 0;
    this.lastMove = { t: now, x: ev.clientX, y: ev.clientY };
    if (this.glideEnd > now + 50) this.glideEnd = now + 50;
    const glide = this.snapPixels() >= 4 && speed < 0.3 ? 83 : 0;
    this.setFromUser(this.valueFromPointer(ev), false, glide);
    this.tip.reposition();
  }

  private onUp(ev: PointerEvent): void {
    if (this.dragId !== ev.pointerId) return;
    this.dragId = null;
    this.lastMove = null;
    this.removeAttribute('dragging');
    if (this.value !== this.dragStartValue) this.emit('change', { value: this.value });
    this.hideTip();
  }

  private onKey(ev: KeyboardEvent): void {
    if (this.disabled) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const dirSign = this.reversed ? -1 : 1;
    let delta = 0;
    let target: number | null = null;
    switch (ev.key) {
      case 'ArrowRight':
        delta = (rtl && !this.vertical ? -1 : 1) * this.smallChange;
        break;
      case 'ArrowUp':
        delta = this.smallChange;
        break;
      case 'ArrowLeft':
        delta = (rtl && !this.vertical ? 1 : -1) * this.smallChange;
        break;
      case 'ArrowDown':
        delta = -this.smallChange;
        break;
      case 'PageUp':
        delta = this.largeChange;
        break;
      case 'PageDown':
        delta = -this.largeChange;
        break;
      case 'Home':
        target = this.min;
        break;
      case 'End':
        target = this.max;
        break;
      default:
        return;
    }
    ev.preventDefault();
    this.dragStartValue = this.value;
    const next = target ?? this.value + delta * dirSign;
    let v = this.coerce(next);
    if (target === null && v === this.value && delta !== 0) {
      const snap = this.snapsTo === 'ticks' && this.tickFrequency > 0 ? this.tickFrequency : this.step;
      v = this.coerce(this.value + Math.sign(delta * dirSign) * Math.max(snap, Math.abs(delta)));
    }
    this.setFromUser(v, true, 133);
  }

  private format(v: number): string {
    if (this.valueFormatter) return this.valueFormatter(v);
    const decimals = (String(this.step).split('.')[1] ?? '').length;
    return decimals ? v.toFixed(Math.min(decimals, 6)) : String(Math.round(v));
  }

  private showTip(): void {
    if (!this.thumbToolTip) return;
    const tip = this.$('.tip');
    tip.textContent = this.format(this.value);
    this.tip.open({
      anchor: this.$('.thumb'),
      stack: false,
      lightDismiss: false,
      closeOnEscape: false,
      restoreFocus: false,
      focus: 'none',
      animateIn: (s) => fadeIn(s),
      animateOut: (s) => fadeOut(s),
      position: (size, r) => this.placeTip(size, r),
    });
  }

  private hideTip(): void {
    if (this.tip?.isOpen) void this.tip.close();
  }

  private followTip(): void {
    if (this.tipRaf || !this.tip?.isOpen) return;
    const step = () => {
      this.tipRaf = 0;
      if (!this.tip.isOpen) return;
      this.tip.reposition();
      if (performance.now() < this.glideEnd + 34) this.tipRaf = requestAnimationFrame(step);
    };
    this.tipRaf = requestAnimationFrame(step);
  }
  private tipRaf = 0;

  private placeTip(size: { width: number; height: number }, r: DOMRect): PositionResult {
    const { width: vw, height: vh } = viewportSize();
    const pad = 8;
    if (this.vertical) {
      const x = clamp(r.left - 2 - 8 - size.width, pad, vw - pad - size.width);
      const y = clamp(r.top + r.height / 2 - size.height / 2, pad, vh - pad - size.height);
      return { x: Math.round(x), y: Math.round(y), side: 'left', maxHeight: vh, maxWidth: vw };
    }
    const x = clamp(r.left + r.width / 2 - size.width / 2, pad, vw - pad - size.width);
    let y = r.top - 2 - 8 - size.height;
    let side: 'top' | 'bottom' = 'top';
    if (y < pad) {
      y = r.bottom + 2 + 8;
      side = 'bottom';
    }
    return { x: Math.round(x), y: Math.round(y), side, maxHeight: vh, maxWidth: vw };
  }

  private renderTicks(): void {
    const freq = this.tickFrequency;
    const host = this.$$('.ticks');
    const span = this.max - this.min;
    if (!(freq > 0) || !span || this.tickPlacement === 'none') {
      for (const t of host) t.innerHTML = '';
      return;
    }
    const n = Math.min(1000, Math.floor(Math.abs(span) / freq));
    let html = '';
    for (let i = 0; i <= n; i++) {
      let p = (i * freq) / span;
      if (this.reversed) p = 1 - p;
      const pos = `calc(9px + (100% - 18px) * ${p.toFixed(5)})`;
      html += this.vertical ? `<i style="bottom:${pos}"></i>` : `<i style="left:${pos}"></i>`;
    }
    for (const t of host) t.innerHTML = html;
  }

  private syncHeader(): void {
    const slotted = this.$<HTMLSlotElement>('slot[name="header"]').assignedNodes().length > 0;
    this.$('.header-text').textContent = this.header;
    this.$('.header').hidden = !this.header && !slotted;
    if (this.header) this.aria('aria-label', this.header);
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('header')) this.syncHeader();
    if (changed.has('disabled')) {
      this.setFocusable(!this.disabled);
      this.aria('aria-disabled', this.disabled ? 'true' : null);
    }
    if (changed.has('min') || changed.has('max') || changed.has('step') || (first && changed.has('value'))) {
      const v = this.coerce(this.value);
      if (v !== this.value) this.value = v;
    }
    if (changed.has('value') || changed.has('min') || changed.has('max')) {
      if (!this.userSetting) {
        this.style.setProperty('--glide', '0ms');
        this.glideEnd = 0;
      }
      this.userSetting = false;
      this.style.setProperty('--pct', String(this.pct()));
      this.aria('aria-valuenow', this.value);
      this.aria('aria-valuetext', this.format(this.value));
      this.internals.setFormValue(String(this.value));
      if (this.tip?.isOpen) {
        this.$('.tip').textContent = this.format(this.value);
        this.tip.reposition();
        this.followTip();
      }
    }
    if (changed.has('min')) this.aria('aria-valuemin', this.min);
    if (changed.has('max')) this.aria('aria-valuemax', this.max);
    if (changed.has('orientation')) this.aria('aria-orientation', this.vertical ? 'vertical' : 'horizontal');
    if (
      changed.has('tickFrequency') ||
      changed.has('tickPlacement') ||
      changed.has('min') ||
      changed.has('max') ||
      changed.has('orientation') ||
      changed.has('reversed')
    ) {
      this.renderTicks();
    }
  }

  formResetCallback(): void {
    this.value = this.defaultValue;
  }

  formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-slider': WinSlider;
  }
}
