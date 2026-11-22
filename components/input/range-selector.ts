import { WinElement, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css, focusRing } from '../../base/css.ts';
import { isRtl } from '../../base/dom.ts';
import { formatNumber, snap } from './shared.ts';

const toolTipLook = `
  box-sizing: border-box;
  padding: 6px 9px 8px;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-control);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-tooltip);
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-caption);
  white-space: nowrap;
  pointer-events: none;
`;

const THUMB = 18;

const rangeCss = css`
:host {
  display: inline-block;
  vertical-align: middle;
  width: 300px;
  max-width: 100%;
  box-sizing: border-box;
  touch-action: none;
  user-select: none;
}
.header { display: block; margin-bottom: 4px; font: var(--w-type-body); }
.header:empty { display: none; }
.root {
  position: relative;
  height: 32px;
  cursor: default;
}
.track, .range {
  position: absolute;
  top: 14px;
  height: 4px;
  border-radius: 2px;
}
.track { left: 0; right: 0; background: var(--w-control-strong-fill-color-default); }
.range {
  left: calc(${THUMB / 2}px + var(--a) * (100% - ${THUMB}px));
  width: calc((var(--b) - var(--a)) * (100% - ${THUMB}px));
  background: var(--w-accent-fill-color-default);
}
.root:hover .range { background: var(--w-accent-fill-color-secondary); }
.root[data-dragging] .range { background: var(--w-accent-fill-color-tertiary); }
.thumb {
  position: absolute;
  top: 7px;
  left: calc(var(--p) * (100% - ${THUMB}px));
  width: ${THUMB}px;
  height: ${THUMB}px;
  outline: none;
  z-index: 1;
}
.thumb[data-active] { z-index: 2; }
.ring {
  position: absolute;
  inset: -2px;
  box-sizing: border-box;
  border: 1px solid;
  border-color: var(--w-control-elevation-border);
  border-radius: 10px;
  background: var(--w-control-solid-fill-color-default);
  background-clip: padding-box;
  display: grid;
  place-items: center;
}
.inner {
  width: 12px;
  height: 12px;
  border-radius: 50%;
  background: var(--w-accent-fill-color-default);
  scale: 0.86;
  transition: scale var(--w-duration-fast) var(--w-ease-decelerate), background-color var(--w-duration-faster) linear;
}
.thumb:hover .inner { scale: 1.167; background: var(--w-accent-fill-color-secondary); transition-duration: var(--w-duration-normal); }
.thumb[data-pressed] .inner { scale: 0.71; background: var(--w-accent-fill-color-tertiary); transition-duration: var(--w-duration-normal); }
${focusRing('.thumb:focus-visible .ring', 3)}
.thumb:focus-visible .ring { border-radius: 11px; }
.bubble {
  position: absolute;
  bottom: calc(100% + 10px);
  left: 50%;
  translate: -50% 4px;
  ${toolTipLook}
  opacity: 0;
  transition: opacity var(--w-duration-faster) linear, translate var(--w-duration-fast) var(--w-ease-decelerate);
}
.thumb[data-show-tip] .bubble { opacity: 1; translate: -50% 0; }
:host([disabled]) { pointer-events: none; }
:host([disabled]) .track { background: var(--w-control-strong-fill-color-disabled); }
:host([disabled]) .range, :host([disabled]) .inner { background: var(--w-accent-fill-color-disabled); }
:host([disabled]) .header { color: var(--w-text-fill-color-disabled); }
`;

type Which = 'start' | 'end';

export class WinRangeSelector extends WinElement {
  static override styles = [rangeCss];
  static override template = `<label class="header" part="header"></label>
<div class="root" part="root">
  <div class="track" part="track"></div>
  <div class="range" part="range"></div>
  <div class="thumb" part="thumb thumb-start" data-which="start" role="slider" tabindex="0" aria-orientation="horizontal"><div class="ring"><div class="inner"></div></div><div class="bubble" part="tooltip"></div></div>
  <div class="thumb" part="thumb thumb-end" data-which="end" role="slider" tabindex="0" aria-orientation="horizontal"><div class="ring"><div class="inner"></div></div><div class="bubble" part="tooltip"></div></div>
</div>`;
  static override formAssociated = true;
  static override props: PropDefs = {
    minimum: { type: Number, default: 0 },
    maximum: { type: Number, default: 100 },
    rangeStart: { type: Number, attribute: 'range-start', default: 0 },
    rangeEnd: { type: Number, attribute: 'range-end', default: 100 },
    stepFrequency: { type: Number, attribute: 'step-frequency', default: 1 },
    header: { type: String },
    disabled: { type: Boolean },
    name: { type: String },
    showTooltips: { type: Boolean, attribute: 'show-tooltips', default: true },
  };
  declare minimum: number;
  declare maximum: number;
  declare rangeStart: number;
  declare rangeEnd: number;
  declare stepFrequency: number;
  declare header: string;
  declare disabled: boolean;
  declare name: string;
  declare showTooltips: boolean;

  private tipTimer: ReturnType<typeof setTimeout> | null = null;
  private _formatter: ((v: number) => string) | null = null;
  get formatter(): (v: number) => string {
    return this._formatter ?? ((v: number) => formatNumber(v, this.stepFrequency));
  }
  set formatter(fn: ((v: number) => string) | null) {
    this._formatter = fn;
    this.requestUpdate('formatter');
  }

  static {
    this.define('win-range-selector');
  }

  private thumb(which: Which): HTMLElement {
    return this.$(`.thumb[data-which="${which}"]`);
  }

  protected override firstConnected(): void {
    const root = this.$('.root');
    root.addEventListener('pointerdown', (ev) => this.onPointerDown(ev));
    for (const which of ['start', 'end'] as Which[]) {
      const t = this.thumb(which);
      t.addEventListener('keydown', (ev) => this.onKey(ev, which));
      t.addEventListener('focus', () => this.raise(which));
    }
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('header')) this.$('.header').textContent = this.header ?? '';
    if (changed.has('disabled')) {
      for (const w of ['start', 'end'] as Which[]) {
        this.thumb(w).tabIndex = this.disabled ? -1 : 0;
        this.thumb(w).setAttribute('aria-disabled', String(this.disabled));
      }
    }
    this.sync();
  }

  private get span(): number {
    return Math.max(1e-9, this.maximum - this.minimum);
  }

  private normalized(): { a: number; b: number } {
    const min = Math.min(this.minimum, this.maximum);
    const max = Math.max(this.minimum, this.maximum);
    let a = Math.min(Math.max(this.rangeStart, min), max);
    let b = Math.min(Math.max(this.rangeEnd, min), max);
    if (a > b) [a, b] = [b, a];
    return { a, b };
  }

  private sync(): void {
    const { a, b } = this.normalized();
    const pa = (a - this.minimum) / this.span;
    const pb = (b - this.minimum) / this.span;
    const rtl = isRtl(this);
    const root = this.$('.root');
    root.style.setProperty('--a', String(rtl ? 1 - pb : pa));
    root.style.setProperty('--b', String(rtl ? 1 - pa : pb));
    this.thumb('start').style.setProperty('--p', String(rtl ? 1 - pa : pa));
    this.thumb('end').style.setProperty('--p', String(rtl ? 1 - pb : pb));
    for (const [w, v] of [
      ['start', a],
      ['end', b],
    ] as [Which, number][]) {
      const t = this.thumb(w);
      t.setAttribute('aria-valuemin', String(w === 'start' ? this.minimum : a));
      t.setAttribute('aria-valuemax', String(w === 'end' ? this.maximum : b));
      t.setAttribute('aria-valuenow', String(v));
      t.setAttribute('aria-valuetext', this.formatter(v));
      t.setAttribute('aria-label', `${this.header ? `${this.header} ` : ''}${w === 'start' ? '最小值' : '最大值'}`);
      t.querySelector('.bubble')!.textContent = this.formatter(v);
    }
    this.internals.setFormValue(`${a},${b}`);
  }

  private setValue(which: Which, raw: number, emit = true): void {
    const { a, b } = this.normalized();
    const min = Math.min(this.minimum, this.maximum);
    const max = Math.max(this.minimum, this.maximum);
    let v = snap(raw, min, max, this.stepFrequency);
    if (which === 'start') v = Math.min(v, b);
    else v = Math.max(v, a);
    const old = which === 'start' ? a : b;
    if (v === old) return;
    if (which === 'start') this.rangeStart = v;
    else this.rangeEnd = v;
    this.flushUpdates();
    if (emit) {
      this.emit('valuechanged', {
        rangeStart: this.rangeStart,
        rangeEnd: this.rangeEnd,
        changedRangeProperty: which === 'start' ? 'RangeStart' : 'RangeEnd',
        oldValue: old,
        newValue: v,
      });
      this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
    }
  }

  private valueAt(clientX: number): number {
    const r = this.$('.root').getBoundingClientRect();
    let p = (clientX - r.left - THUMB / 2) / Math.max(1, r.width - THUMB);
    p = Math.min(1, Math.max(0, p));
    if (isRtl(this)) p = 1 - p;
    return this.minimum + p * this.span;
  }

  private raise(which: Which): void {
    this.thumb('start').toggleAttribute('data-active', which === 'start');
    this.thumb('end').toggleAttribute('data-active', which === 'end');
  }

  private showTip(which: Which, on: boolean, autoHide = false): void {
    if (!this.showTooltips) return;
    const t = this.thumb(which);
    t.toggleAttribute('data-show-tip', on);
    if (this.tipTimer) clearTimeout(this.tipTimer);
    if (on && autoHide) this.tipTimer = setTimeout(() => t.removeAttribute('data-show-tip'), 900);
  }

  private onPointerDown(ev: PointerEvent): void {
    if (this.disabled || ev.button !== 0) return;
    const root = this.$('.root');
    const target = (ev.target as Element).closest<HTMLElement>('.thumb');
    const v = this.valueAt(ev.clientX);
    const { a, b } = this.normalized();
    let which: Which;
    if (target) which = target.dataset.which as Which;
    else which = Math.abs(v - a) <= Math.abs(v - b) ? (v > b ? 'end' : 'start') : 'end';
    if (a === b && !target) which = v < a ? 'start' : 'end';
    const thumb = this.thumb(which);
    requestAnimationFrame(() => thumb.focus({ preventScroll: true, focusVisible: false } as FocusOptions));
    this.raise(which);
    const grabOffset = target ? v - (which === 'start' ? a : b) : 0;
    if (!target) this.setValue(which, v);
    root.setPointerCapture(ev.pointerId);
    root.toggleAttribute('data-dragging', true);
    thumb.toggleAttribute('data-pressed', true);
    this.showTip(which, true);
    this.emit('thumbdragstarted', { thumb: which });
    const move = (e: PointerEvent) => this.setValue(which, this.valueAt(e.clientX) - grabOffset);
    const up = () => {
      root.removeEventListener('pointermove', move);
      root.removeEventListener('pointerup', up);
      root.removeEventListener('pointercancel', up);
      root.removeAttribute('data-dragging');
      thumb.removeAttribute('data-pressed');
      this.showTip(which, false);
      this.emit('thumbdragcompleted', { thumb: which, rangeStart: this.rangeStart, rangeEnd: this.rangeEnd });
      this.dispatchEvent(new Event('change', { bubbles: true }));
    };
    root.addEventListener('pointermove', move);
    root.addEventListener('pointerup', up);
    root.addEventListener('pointercancel', up);
  }

  private onKey(ev: KeyboardEvent, which: Which): void {
    if (this.disabled) return;
    const step = this.stepFrequency > 0 ? this.stepFrequency : 1;
    const { a, b } = this.normalized();
    const cur = which === 'start' ? a : b;
    const rtl = isRtl(this);
    let next: number | null = null;
    switch (ev.key) {
      case 'ArrowRight':
        next = cur + (rtl ? -step : step);
        break;
      case 'ArrowUp':
        next = cur + step;
        break;
      case 'ArrowLeft':
        next = cur + (rtl ? step : -step);
        break;
      case 'ArrowDown':
        next = cur - step;
        break;
      case 'PageUp':
        next = cur + Math.max(step, this.span / 10);
        break;
      case 'PageDown':
        next = cur - Math.max(step, this.span / 10);
        break;
      case 'Home':
        next = which === 'start' ? this.minimum : a;
        break;
      case 'End':
        next = which === 'end' ? this.maximum : b;
        break;
    }
    if (next === null) return;
    ev.preventDefault();
    this.setValue(which, next);
    this.showTip(which, true, true);
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  formResetCallback(): void {
    this.rangeStart = this.minimum;
    this.rangeEnd = this.maximum;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-range-selector': WinRangeSelector;
  }
}
