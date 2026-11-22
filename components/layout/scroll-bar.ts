import { WinElement, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { clamp } from '../../base/dom.ts';

export type ScrollIndicatorMode = 'none' | 'mouse' | 'touch';
export type ScrollEventType =
  'small-decrement' | 'small-increment' | 'large-decrement' | 'large-increment' | 'thumb-track' | 'end-scroll';

export interface ScrollBarScrollDetail {
  value: number;
  type: ScrollEventType;
}

const REPEAT_DELAY = 250;
const REPEAT_INTERVAL = 50;
const THUMB_MIN = 30;
const PAN_MIN = 32;

const scrollBarCss = css`
:host {
  display: inline-grid;
  position: relative;
  box-sizing: border-box;
  flex: none;
  color: var(--w-control-strong-fill-color-default);
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  --sb-expand-delay: 100ms;
  --sb-contract-delay: 500ms;
  --sb-resize: var(--w-duration-fast);
}
:host([orientation="vertical"]), :host(:not([orientation])) {
  width: 16px;
  min-height: 48px;
  grid-template-rows: 16px minmax(0, 1fr) 16px;
  grid-template-columns: 16px;
}
:host([orientation="horizontal"]) {
  height: 16px;
  min-width: 48px;
  grid-template-columns: 16px minmax(0, 1fr) 16px;
  grid-template-rows: 16px;
}
:host([indicator-mode="none"]) { pointer-events: none; }

.track {
  position: absolute;
  inset: 0;
  border-radius: 6px;
  ${acrylicSurface}
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--w-duration-faster) linear var(--sb-contract-delay);
}

.btn {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  color: var(--w-control-strong-fill-color-default);
  transition: opacity var(--w-duration-faster) linear var(--sb-contract-delay);
}
:host([orientation="vertical"]) .dec, :host(:not([orientation])) .dec { padding-top: 4px; grid-row: 1; }
:host([orientation="vertical"]) .inc, :host(:not([orientation])) .inc { padding-bottom: 4px; grid-row: 3; }
:host([orientation="horizontal"]) .dec { padding-left: 4px; grid-column: 1; }
:host([orientation="horizontal"]) .inc { padding-right: 4px; grid-column: 3; }
.arrow { display: inline-flex; transition: scale 16ms linear; }
.btn:hover .arrow { color: var(--w-text-fill-color-secondary); }
.btn[data-pressed] .arrow { color: var(--w-text-fill-color-secondary); scale: 0.875; }
:host([disabled]) .arrow { color: var(--w-control-strong-fill-color-disabled); }

.rail { position: relative; min-width: 0; min-height: 0; }
:host([orientation="vertical"]) .rail, :host(:not([orientation])) .rail { grid-row: 2; }
:host([orientation="horizontal"]) .rail { grid-column: 2; }
.thumb {
  position: absolute;
  box-sizing: border-box;
  margin: auto;
  border-radius: 3px;
  opacity: 0;
  transition:
    width var(--sb-resize) cubic-bezier(0, 0, 0, 1) var(--sb-contract-delay),
    height var(--sb-resize) cubic-bezier(0, 0, 0, 1) var(--sb-contract-delay),
    translate var(--sb-resize) cubic-bezier(0, 0, 0, 1) var(--sb-contract-delay),
    opacity var(--w-duration-faster) linear 0s;
}
.thumb::before {
  content: '';
  position: absolute;
  inset: 3px;
  border-radius: 3px;
  background: var(--w-control-strong-fill-color-default);
}
:host([disabled]) .thumb::before { background: var(--w-control-strong-fill-color-disabled); }
:host([orientation="vertical"]) .thumb, :host(:not([orientation])) .thumb {
  left: 0;
  right: 0;
  width: 8px;
  height: var(--thumb-len, 30px);
  top: var(--thumb-pos, 0px);
  translate: 2px 0;
}
:host([orientation="horizontal"]) .thumb {
  top: 0;
  bottom: 0;
  height: 8px;
  width: var(--thumb-len, 30px);
  left: var(--thumb-pos, 0px);
  translate: 0 2px;
}

:host(:not([indicator-mode="none"]):not([indicator-mode="touch"])) .thumb { opacity: 1; }
:host(:not([indicator-mode="none"]):not([indicator-mode="touch"])[data-w-expanded]) .track,
:host(:not([indicator-mode="none"]):not([indicator-mode="touch"])[data-w-expanded]) .btn {
  opacity: 1;
  transition-delay: var(--sb-expand-delay);
}
:host(:not([indicator-mode="none"]):not([indicator-mode="touch"])[data-w-expanded]) .thumb {
  translate: 0 0;
  transition-delay: var(--sb-expand-delay), var(--sb-expand-delay), var(--sb-expand-delay), 0s;
}
:host(:not([indicator-mode="none"]):not([indicator-mode="touch"])[data-w-expanded][orientation="vertical"]) .thumb,
:host(:not([indicator-mode="none"]):not([indicator-mode="touch"])[data-w-expanded]:not([orientation])) .thumb { width: 16px; }
:host(:not([indicator-mode="none"]):not([indicator-mode="touch"])[data-w-expanded][orientation="horizontal"]) .thumb { height: 16px; }
:host([data-w-dragging]:not([indicator-mode="none"]):not([indicator-mode="touch"])) .thumb,
:host([data-w-dragging]:not([indicator-mode="none"]):not([indicator-mode="touch"])) .track,
:host([data-w-dragging]:not([indicator-mode="none"]):not([indicator-mode="touch"])) .btn { transition-delay: 0s; }

:host([indicator-mode="none"]) .track,
:host([indicator-mode="none"]) .btn,
:host([indicator-mode="none"]) .thumb { opacity: 0; transition-delay: 0s; }
:host([data-w-empty]) .thumb { opacity: 0 !important; }

.pan {
  position: absolute;
  background: var(--w-control-strong-fill-color-default);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--w-duration-faster) linear;
}
:host([orientation="vertical"]) .pan, :host(:not([orientation])) .pan {
  right: 2px;
  width: 2px;
  top: var(--pan-pos, 0px);
  height: var(--pan-len, 32px);
}
:host([orientation="horizontal"]) .pan {
  bottom: 2px;
  height: 2px;
  left: var(--pan-pos, 0px);
  width: var(--pan-len, 32px);
}
:host([indicator-mode="touch"]) .pan { opacity: 1; }
:host([indicator-mode="touch"]) .thumb, :host([indicator-mode="touch"]) .btn, :host([indicator-mode="touch"]) .track { opacity: 0; }
:host([indicator-mode="touch"][data-w-empty]) .pan { opacity: 0; }

@media (forced-colors: active) {
  .thumb::before, .pan { background: CanvasText; }
}
`;

export class WinScrollBar extends WinElement {
  static override styles = [scrollBarCss];
  static override template = `<div class="track" part="track"></div><div class="btn dec" part="decrease-button"><span class="arrow" data-arrow="dec"></span></div><div class="rail" part="rail"><div class="thumb" part="thumb"></div></div><div class="btn inc" part="increase-button"><span class="arrow" data-arrow="inc"></span></div><div class="pan" part="panning-thumb"></div>`;
  static override props: PropDefs = {
    orientation: { type: String, reflect: true, default: 'vertical' },
    minimum: { type: Number, default: 0 },
    maximum: { type: Number, default: 100 },
    value: { type: Number, default: 0 },
    viewportSize: { type: Number, attribute: 'viewport-size', default: 10 },
    smallChange: { type: Number, attribute: 'small-change', default: 1 },
    largeChange: { type: Number, attribute: 'large-change', default: 10 },
    indicatorMode: { type: String, attribute: 'indicator-mode', reflect: true, default: 'mouse' },
    disabled: { type: Boolean },
  };
  declare orientation: 'vertical' | 'horizontal';
  declare minimum: number;
  declare maximum: number;
  declare value: number;
  declare viewportSize: number;
  declare smallChange: number;
  declare largeChange: number;
  declare indicatorMode: ScrollIndicatorMode;
  declare disabled: boolean;

  static {
    this.define('win-scroll-bar');
  }

  private rail!: HTMLElement;
  private thumb!: HTMLElement;
  private repeatTimer: ReturnType<typeof setTimeout> | null = null;
  private resizeObs: ResizeObserver | null = null;
  private hovering = false;
  private dragging = false;

  get isVertical(): boolean {
    return this.orientation !== 'horizontal';
  }

  get isEngaged(): boolean {
    return this.hovering || this.dragging;
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'scrollbar');
    this.rail = this.$('.rail');
    this.thumb = this.$('.thumb');

    this.addEventListener('pointerenter', (ev) => {
      if (ev.pointerType === 'touch') return;
      this.hovering = true;
      this.setExpanded(true);
    });
    this.addEventListener('pointerleave', () => {
      this.hovering = false;
      if (!this.dragging) this.setExpanded(false);
    });

    for (const btn of this.$$<HTMLElement>('.btn')) {
      btn.addEventListener('pointerdown', (ev) => {
        if (this.disabled || ev.button !== 0) return;
        ev.preventDefault();
        btn.setPointerCapture(ev.pointerId);
        btn.toggleAttribute('data-pressed', true);
        const dec = btn.classList.contains('dec');
        const step = () =>
          this.change(dec ? -this.smallChange : this.smallChange, dec ? 'small-decrement' : 'small-increment');
        step();
        this.startRepeat(step);
      });
      const end = () => {
        btn.removeAttribute('data-pressed');
        this.stopRepeat(true);
      };
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
      btn.addEventListener('lostpointercapture', end);
    }

    this.rail.addEventListener('pointerdown', (ev) => {
      if (this.disabled || ev.button !== 0 || ev.target === this.thumb) return;
      ev.preventDefault();
      this.rail.setPointerCapture(ev.pointerId);
      const at = this.railCoord(ev);
      const step = () => {
        const { pos, len } = this.thumbGeometry();
        if (at < pos) this.change(-this.largeChange, 'large-decrement');
        else if (at > pos + len) this.change(this.largeChange, 'large-increment');
        else this.stopRepeat(false);
      };
      step();
      this.startRepeat(step);
    });
    const endRail = () => this.stopRepeat(true);
    this.rail.addEventListener('pointerup', endRail);
    this.rail.addEventListener('pointercancel', endRail);
    this.rail.addEventListener('lostpointercapture', endRail);

    this.thumb.addEventListener('pointerdown', (ev) => {
      if (this.disabled || ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      this.thumb.setPointerCapture(ev.pointerId);
      this.dragging = true;
      this.toggleAttribute('data-w-dragging', true);
      this.setExpanded(true);
      const start = this.railCoord(ev);
      const startValue = this.value;
      const { travel } = this.thumbGeometry();
      const range = this.maximum - this.minimum;
      const move = (e: PointerEvent) => {
        if (!travel || range <= 0) return;
        const delta = ((this.railCoord(e) - start) / travel) * range;
        this.setValueFromUser(startValue + delta, 'thumb-track');
      };
      const up = () => {
        this.thumb.removeEventListener('pointermove', move);
        this.thumb.removeEventListener('pointerup', up);
        this.thumb.removeEventListener('lostpointercapture', up);
        this.dragging = false;
        this.removeAttribute('data-w-dragging');
        if (!this.hovering) this.setExpanded(false);
        this.emitScroll('end-scroll');
      };
      this.thumb.addEventListener('pointermove', move);
      this.thumb.addEventListener('pointerup', up);
      this.thumb.addEventListener('lostpointercapture', up);
    });

    this.resizeObs = new ResizeObserver(() => this.layoutThumb());
    this.resizeObs.observe(this.rail);
  }

  protected override disconnected(): void {
    this.stopRepeat(false);
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (first || changed.has('orientation')) {
      const v = this.isVertical;
      this.$('[data-arrow="dec"]').innerHTML = glyph(v ? 'caretUp' : 'caretLeft', 8);
      this.$('[data-arrow="inc"]').innerHTML = glyph(v ? 'caretDown' : 'caretRight', 8);
      this.aria('aria-orientation', v ? 'vertical' : 'horizontal');
    }
    if (changed.has('indicatorMode') && this.indicatorMode !== 'mouse') this.setExpanded(false);
    if (changed.has('disabled')) this.aria('aria-disabled', this.disabled ? 'true' : null);
    this.aria('aria-valuemin', this.minimum);
    this.aria('aria-valuemax', this.maximum);
    this.aria('aria-valuenow', Math.round(this.value));
    this.layoutThumb();
  }

  setExpanded(on: boolean): void {
    this.toggleAttribute('data-w-expanded', on && this.indicatorMode === 'mouse');
  }

  private railCoord(ev: PointerEvent): number {
    const r = this.rail.getBoundingClientRect();
    return this.isVertical ? ev.clientY - r.top : ev.clientX - r.left;
  }

  thumbGeometry(): { pos: number; len: number; travel: number; railLen: number } {
    const railLen = this.isVertical ? this.rail.clientHeight : this.rail.clientWidth;
    const range = Math.max(0, this.maximum - this.minimum);
    const extent = range + Math.max(0, this.viewportSize);
    let len = extent > 0 ? (railLen * this.viewportSize) / extent : railLen;
    len = clamp(len, Math.min(THUMB_MIN, railLen), railLen);
    const travel = Math.max(0, railLen - len);
    const pos = range > 0 ? ((clamp(this.value, this.minimum, this.maximum) - this.minimum) / range) * travel : 0;
    return { pos, len, travel, railLen };
  }

  private layoutThumb(): void {
    if (!this.rail) return;
    const { pos, len } = this.thumbGeometry();
    const empty = this.maximum <= this.minimum;
    this.toggleAttribute('data-w-empty', empty);
    this.style.setProperty('--thumb-pos', `${pos}px`);
    this.style.setProperty('--thumb-len', `${len}px`);
    const barLen = this.isVertical ? this.clientHeight : this.clientWidth;
    const range = Math.max(0, this.maximum - this.minimum);
    const extent = range + Math.max(0, this.viewportSize);
    let plen = extent > 0 ? (barLen * this.viewportSize) / extent : barLen;
    plen = clamp(plen, Math.min(PAN_MIN, barLen), barLen);
    const ppos =
      range > 0 ? ((clamp(this.value, this.minimum, this.maximum) - this.minimum) / range) * (barLen - plen) : 0;
    this.style.setProperty('--pan-pos', `${ppos}px`);
    this.style.setProperty('--pan-len', `${plen}px`);
  }

  private change(delta: number, type: ScrollEventType): void {
    this.setValueFromUser(this.value + delta, type);
  }

  private setValueFromUser(v: number, type: ScrollEventType): void {
    const nv = clamp(v, this.minimum, this.maximum);
    if (nv !== this.value) {
      this.value = nv;
      this.flushUpdates();
    }
    this.emitScroll(type);
  }

  private emitScroll(type: ScrollEventType): void {
    this.emit<ScrollBarScrollDetail>('scroll', { value: this.value, type }, { bubbles: false });
  }

  private startRepeat(step: () => void): void {
    this.stopRepeat(false);
    this.repeatTimer = setTimeout(() => {
      const tick = () => {
        step();
        if (this.repeatTimer !== null) this.repeatTimer = setTimeout(tick, REPEAT_INTERVAL);
      };
      tick();
    }, REPEAT_DELAY);
  }

  private stopRepeat(emitEnd: boolean): void {
    const was = this.repeatTimer !== null;
    if (this.repeatTimer) clearTimeout(this.repeatTimer);
    this.repeatTimer = null;
    if (emitEnd && was) this.emitScroll('end-scroll');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-scroll-bar': WinScrollBar;
  }
}
