import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { durations, motionEnabled } from '../../motion/animate.ts';
import { formatNumber, snap } from '../input/shared.ts';

const gaugeCss = css`
:host {
  display: inline-block;
  vertical-align: middle;
  width: 200px;
  aspect-ratio: 1;
  position: relative;
  user-select: none;
  touch-action: none;
  outline: none;
}
svg { width: 100%; height: 100%; overflow: visible; display: block; }
.scale { stroke: var(--w-control-alt-fill-color-quarternary); fill: none; stroke-linecap: round; }
.trail { stroke: var(--w-accent-fill-color-default); fill: none; stroke-linecap: round; }
.tick { stroke: var(--w-text-fill-color-tertiary); stroke-linecap: round; }
.tick.major { stroke: var(--w-text-fill-color-secondary); }
.needle { stroke: var(--w-text-fill-color-secondary); stroke-linecap: round; }
.cap { fill: var(--w-control-solid-fill-color-default); stroke: var(--w-control-stroke-color-secondary); }
.value { fill: var(--w-text-fill-color-primary); font: var(--w-type-title); text-anchor: middle; }
.unit { fill: var(--w-text-fill-color-secondary); font: var(--w-type-caption); text-anchor: middle; }
:host([is-interactive]) { cursor: pointer; }
:host([is-interactive]:hover) .trail { stroke: var(--w-accent-fill-color-secondary); }
:host([data-dragging]) .trail { stroke: var(--w-accent-fill-color-tertiary); }
${focusRing(':host(:focus-visible)', 3)}
:host(:focus-visible) { border-radius: 50%; }
:host([disabled]) { pointer-events: none; }
:host([disabled]) .trail { stroke: var(--w-accent-fill-color-disabled); }
:host([disabled]) .value { fill: var(--w-text-fill-color-disabled); }
`;

const CX = 100;
const CY = 100;
const R = 78;

const pt = (deg: number, r: number) => {
  const a = (deg * Math.PI) / 180;
  return { x: CX + r * Math.sin(a), y: CY - r * Math.cos(a) };
};

function arcPath(a1: number, a2: number, r: number): string {
  if (a2 - a1 < 0.01) {
    const p = pt(a1, r);
    return `M${p.x.toFixed(2)} ${p.y.toFixed(2)}`;
  }
  const s = pt(a1, r);
  const e = pt(a2, r);
  const large = a2 - a1 > 180 ? 1 : 0;
  return `M${s.x.toFixed(2)} ${s.y.toFixed(2)}A${r} ${r} 0 ${large} 1 ${e.x.toFixed(2)} ${e.y.toFixed(2)}`;
}

export class WinRadialGauge extends WinElement {
  static override styles = [gaugeCss];
  static override template = `<svg viewBox="0 0 200 200" aria-hidden="true">
  <path class="scale" part="scale"></path>
  <g class="ticks" part="ticks"></g>
  <path class="trail" part="trail"></path>
  <line class="needle" part="needle" x1="100" y1="100" x2="100" y2="40"></line>
  <circle class="cap" part="needle-cap" cx="100" cy="100" r="7"></circle>
  <text class="value" part="value" x="100" y="150"></text>
  <text class="unit" part="unit" x="100" y="170"></text>
</svg>`;
  static override props: PropDefs = {
    value: { type: Number, default: 0 },
    minimum: { type: Number, default: 0 },
    maximum: { type: Number, default: 100 },
    stepSize: { type: Number, attribute: 'step-size', default: 0 },
    tickSpacing: { type: Number, attribute: 'tick-spacing', default: 10 },
    minAngle: { type: Number, attribute: 'min-angle', default: -150 },
    maxAngle: { type: Number, attribute: 'max-angle', default: 150 },
    scaleWidth: { type: Number, attribute: 'scale-width', default: 12 },
    unit: { type: String },
    decimals: { type: Number, default: 0 },
    isInteractive: { type: Boolean, attribute: 'is-interactive' },
    disabled: { type: Boolean },
    label: { type: String },
  };
  declare value: number;
  declare minimum: number;
  declare maximum: number;
  declare stepSize: number;
  declare tickSpacing: number;
  declare minAngle: number;
  declare maxAngle: number;
  declare scaleWidth: number;
  declare unit: string;
  declare decimals: number;
  declare isInteractive: boolean;
  declare disabled: boolean;
  declare label: string;

  private shown = Number.NaN;
  private raf = 0;

  static {
    this.define('win-radial-gauge');
  }

  protected override firstConnected(): void {
    this.addEventListener('pointerdown', (ev) => this.onPointerDown(ev));
    this.addEventListener('keydown', (ev) => this.onKey(ev));
  }

  protected override updated(changed: Set<string>, first = false): void {
    const geometry = ['minimum', 'maximum', 'tickSpacing', 'minAngle', 'maxAngle', 'scaleWidth'].some((k) =>
      changed.has(k),
    );
    if (geometry || first) this.drawScale();
    if (changed.has('isInteractive') || changed.has('disabled')) {
      if (this.isInteractive) {
        this.setAttribute('role', 'slider');
        this.setFocusable(!this.disabled);
      } else {
        this.setAttribute('role', 'meter');
        this.removeAttribute('tabindex');
      }
    }
    if (changed.has('unit')) this.$('.unit').textContent = this.unit ?? '';
    const target = this.clamped(this.value);
    this.aria('aria-valuemin', this.minimum);
    this.aria('aria-valuemax', this.maximum);
    this.aria('aria-valuenow', target);
    this.aria('aria-valuetext', `${this.format(target)}${this.unit ? ` ${this.unit}` : ''}`);
    this.aria('aria-label', this.label || null);
    if (Number.isNaN(this.shown) || first || geometry || !motionEnabled()) {
      this.shown = target;
      this.drawValue(target);
    } else this.animateTo(target);
  }

  private clamped(v: number): number {
    const lo = Math.min(this.minimum, this.maximum);
    const hi = Math.max(this.minimum, this.maximum);
    return Math.min(hi, Math.max(lo, Number.isFinite(v) ? v : lo));
  }

  private format(v: number): string {
    return formatNumber(Number(v.toFixed(Math.max(0, this.decimals))), this.decimals > 0 ? 10 ** -this.decimals : 1);
  }

  private angleOf(v: number): number {
    const span = Math.max(1e-9, this.maximum - this.minimum);
    return this.minAngle + ((v - this.minimum) / span) * (this.maxAngle - this.minAngle);
  }

  private drawScale(): void {
    const sw = Math.max(2, this.scaleWidth);
    const scale = this.$('.scale');
    scale.setAttribute('d', arcPath(this.minAngle, this.maxAngle, R));
    scale.setAttribute('stroke-width', String(sw));
    this.$('.trail').setAttribute('stroke-width', String(sw));
    const ticks = this.$('.ticks');
    const span = this.maximum - this.minimum;
    const spacing = this.tickSpacing > 0 ? this.tickSpacing : span / 10;
    let html = '';
    const count = Math.min(200, Math.floor(span / spacing + 1e-9));
    const rOuter = R - sw / 2 - 5;
    for (let i = 0; i <= count; i++) {
      const v = this.minimum + i * spacing;
      const major = i % 5 === 0 || i === count;
      const a = this.angleOf(v);
      const p1 = pt(a, rOuter);
      const p2 = pt(a, rOuter - (major ? 8 : 5));
      html += `<line class="tick${major ? ' major' : ''}" x1="${p1.x.toFixed(2)}" y1="${p1.y.toFixed(2)}" x2="${p2.x.toFixed(2)}" y2="${p2.y.toFixed(2)}" stroke-width="${major ? 1.6 : 1.1}"></line>`;
    }
    ticks.innerHTML = html;
  }

  private drawValue(v: number): void {
    const a = this.angleOf(v);
    this.$('.trail').setAttribute('d', arcPath(this.minAngle, a, R));
    const tip = pt(a, R - this.scaleWidth / 2 - 16);
    const needle = this.$('.needle');
    needle.setAttribute('x2', tip.x.toFixed(2));
    needle.setAttribute('y2', tip.y.toFixed(2));
    needle.setAttribute('stroke-width', '3');
    this.$('.value').textContent = this.format(v);
  }

  private animateTo(target: number): void {
    cancelAnimationFrame(this.raf);
    const from = this.shown;
    const t0 = performance.now();
    const dur = durations.slow;
    const step = (now: number) => {
      const t = Math.min(1, (now - t0) / dur);
      const e = 1 - (1 - t) ** 5;
      this.shown = from + (target - from) * e;
      this.drawValue(this.shown);
      if (t < 1) this.raf = requestAnimationFrame(step);
      else this.shown = target;
    };
    this.raf = requestAnimationFrame(step);
  }

  private setFromUser(v: number): void {
    const lo = Math.min(this.minimum, this.maximum);
    const hi = Math.max(this.minimum, this.maximum);
    const next = this.stepSize > 0 ? snap(v, lo, hi, this.stepSize) : Math.min(hi, Math.max(lo, v));
    if (next === this.value) return;
    this.value = next;
    this.emit('valuechanged', { value: next });
    this.dispatchEvent(new Event('input', { bubbles: true, composed: true }));
  }

  private valueFromPoint(clientX: number, clientY: number): number | null {
    const r = this.getBoundingClientRect();
    const x = ((clientX - r.left) / r.width) * 200 - CX;
    const y = ((clientY - r.top) / r.height) * 200 - CY;
    let deg = (Math.atan2(x, -y) * 180) / Math.PI;
    if (deg < this.minAngle - 30) deg = this.minAngle;
    if (deg > this.maxAngle + 30) deg = this.maxAngle;
    deg = Math.min(this.maxAngle, Math.max(this.minAngle, deg));
    const p = (deg - this.minAngle) / Math.max(1e-9, this.maxAngle - this.minAngle);
    return this.minimum + p * (this.maximum - this.minimum);
  }

  private onPointerDown(ev: PointerEvent): void {
    if (!this.isInteractive || this.disabled || ev.button !== 0) return;
    requestAnimationFrame(() => this.focus({ preventScroll: true, focusVisible: false } as FocusOptions));
    this.setPointerCapture(ev.pointerId);
    this.toggleAttribute('data-dragging', true);
    const apply = (e: PointerEvent) => {
      const v = this.valueFromPoint(e.clientX, e.clientY);
      if (v !== null) this.setFromUser(v);
    };
    apply(ev);
    const up = () => {
      this.removeEventListener('pointermove', apply);
      this.removeEventListener('pointerup', up);
      this.removeEventListener('pointercancel', up);
      this.removeAttribute('data-dragging');
      this.dispatchEvent(new Event('change', { bubbles: true }));
    };
    this.addEventListener('pointermove', apply);
    this.addEventListener('pointerup', up);
    this.addEventListener('pointercancel', up);
  }

  private onKey(ev: KeyboardEvent): void {
    if (!this.isInteractive || this.disabled) return;
    const step = this.stepSize > 0 ? this.stepSize : Math.max(1e-6, (this.maximum - this.minimum) / 100);
    const big = Math.max(step, (this.maximum - this.minimum) / 10);
    const map: Record<string, number> = {
      ArrowUp: step,
      ArrowRight: step,
      ArrowDown: -step,
      ArrowLeft: -step,
      PageUp: big,
      PageDown: -big,
    };
    let next: number | null = null;
    if (ev.key in map) next = this.value + map[ev.key]!;
    else if (ev.key === 'Home') next = this.minimum;
    else if (ev.key === 'End') next = this.maximum;
    if (next === null) return;
    ev.preventDefault();
    this.setFromUser(next);
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-radial-gauge': WinRadialGauge;
  }
}
