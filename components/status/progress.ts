import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { animate, durations, motionEnabled } from '../../motion/animate.ts';

const clamp01 = (v: number) => (Number.isFinite(v) ? Math.min(1, Math.max(0, v)) : 0);

const barCss = css`
:host {
  display: block;
  position: relative;
  min-height: 3px;
  min-width: 16px;
  --_fg: var(--w-progress-bar-foreground, var(--w-accent-fill-color-default));
}
:host([show-paused]) { --_fg: var(--w-system-fill-color-caution); }
:host([show-error]) { --_fg: var(--w-system-fill-color-critical); }
.root {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  overflow: hidden;
  border-radius: 1.5px;
}
.lane { position: relative; width: 100%; height: 3px; }
.track {
  position: absolute;
  left: 0;
  right: 0;
  top: 1px;
  height: 1px;
  border-radius: 0.5px;
  background: var(--w-progress-bar-track, var(--w-control-strong-stroke-color-default));
  transition: opacity var(--w-duration-fast) linear;
}
.det, .ind {
  position: absolute;
  left: 0;
  top: 0;
  height: 3px;
  border-radius: 1.5px;
  background: var(--_fg);
}
.det {
  width: calc(var(--_pct, 0) * 100%);
  transition: width var(--w-duration-slow) var(--w-ease-point), opacity var(--w-duration-fast) linear,
    background-color var(--w-duration-fast) linear;
}
:host([indeterminate]) .det { width: 0; opacity: 0; }
.ind {
  opacity: 0;
  will-change: transform;
  transition: opacity var(--w-duration-fast) linear, background-color var(--w-duration-fast) linear;
}
.ind1 { width: 40%; }
.ind2 { width: 60%; }
:host([indeterminate]) .track { opacity: 0; }
:host([indeterminate]) .ind { opacity: 1; }
:host([indeterminate]:is([show-paused], [show-error])) .ind1,
:host([data-w-resuming]) .ind1 { opacity: 0; }
:host([data-w-static]) .ind1 { transform: translateX(75%); }
:host([data-w-static]) .ind2 { transform: translateX(33.333%); }
:host([data-w-static]:not([show-paused]):not([show-error])) .ind2 { opacity: 0; }
`;

type IndeterminateState = 'off' | 'running' | 'paused' | 'error';

const IND_SPLINE = 'cubic-bezier(0.4, 0, 0.6, 1)';
const IND_OUT_SPLINE = 'cubic-bezier(1, 1, 0, 1)';
const IND_SETTLE_SPLINE = 'cubic-bezier(0, 0, 0, 1)';
const IND_RESUME_SPLINE = 'cubic-bezier(1, 0, 1, 1)';
const IND1_START = 'translateX(-100%)';
const IND1_END = 'translateX(300%)';
const IND2_START = 'translateX(-150%)';
const IND2_END = 'translateX(167%)';
const IND2_MID = 'translateX(33.333%)';
const IND2_EXIT = 'translateX(200%)';

function translateXOf(el: Element): number {
  const t = getComputedStyle(el).transform;
  return !t || t === 'none' ? 0 : new DOMMatrixReadOnly(t).m41;
}

export class WinProgressBar extends WinElement {
  static override styles = [barCss];
  static override template = `<div class="root" part="root"><div class="lane"><div class="track" part="track"></div><div class="det" part="indicator"></div><div class="ind ind1" part="indeterminate-indicator"></div><div class="ind ind2" part="indeterminate-indicator"></div></div></div>`;
  static override props: PropDefs = {
    value: { type: Number, default: 0 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    indeterminate: { type: Boolean },
    showPaused: { type: Boolean, attribute: 'show-paused' },
    showError: { type: Boolean, attribute: 'show-error' },
  };
  declare value: number;
  declare min: number;
  declare max: number;
  declare indeterminate: boolean;
  declare showPaused: boolean;
  declare showError: boolean;

  private indState: IndeterminateState = 'off';
  private loops: Animation[] = [];
  private ind2Anim: Animation | null = null;
  private indTimer: ReturnType<typeof setTimeout> | null = null;

  static {
    this.define('win-progress-bar');
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'progressbar');
  }

  protected override connected(): void {
    if (this.isInitialized) this.syncIndeterminate();
  }

  protected override disconnected(): void {
    this.stopIndeterminate();
  }

  protected override updated(changed: Set<string>): void {
    const range = this.max - this.min;
    const pct = range > 0 ? clamp01((this.value - this.min) / range) : 0;
    this.style.setProperty('--_pct', String(pct));
    this.aria('aria-valuemin', this.min);
    this.aria('aria-valuemax', this.max);
    this.aria('aria-valuenow', this.indeterminate ? null : this.value);
    this.aria('aria-busy', this.indeterminate && !this.showPaused && !this.showError ? 'true' : null);
    if (changed.has('indeterminate') || changed.has('showPaused') || changed.has('showError')) {
      this.syncIndeterminate();
    }
  }

  private later(ms: number, fn: () => void): void {
    this.clearIndTimer();
    this.indTimer = setTimeout(() => {
      this.indTimer = null;
      fn();
    }, ms);
  }

  private clearIndTimer(): void {
    if (this.indTimer !== null) clearTimeout(this.indTimer);
    this.indTimer = null;
  }

  private cancelLoops(): void {
    for (const a of this.loops.splice(0)) a.cancel();
  }

  private cancelInd2(): void {
    this.ind2Anim?.cancel();
    this.ind2Anim = null;
  }

  private stopIndeterminate(): void {
    this.clearIndTimer();
    this.cancelLoops();
    this.cancelInd2();
    this.removeAttribute('data-w-resuming');
    this.indState = 'off';
  }

  private startLoops(): void {
    this.cancelLoops();
    this.cancelInd2();
    this.loops.push(
      this.$('.ind1').animate(
        [
          { offset: 0, transform: IND1_START, easing: IND_SPLINE },
          { offset: 0.75, transform: IND1_END },
          { offset: 1, transform: IND1_END },
        ],
        { duration: 2000, iterations: Infinity },
      ),
      this.$('.ind2').animate(
        [
          { offset: 0, transform: IND2_START },
          { offset: 0.375, transform: IND2_START, easing: IND_SPLINE },
          { offset: 1, transform: IND2_END },
        ],
        { duration: 2000, iterations: Infinity },
      ),
    );
  }

  private syncIndeterminate(): void {
    const next: IndeterminateState =
      !this.indeterminate || !this.isConnected
        ? 'off'
        : this.showError
          ? 'error'
          : this.showPaused
            ? 'paused'
            : 'running';
    const prev = this.indState;
    if (next === prev) return;
    this.indState = next;
    this.clearIndTimer();
    this.removeAttribute('data-w-resuming');
    if (!motionEnabled()) {
      this.cancelLoops();
      this.cancelInd2();
      this.setAttribute('data-w-static', '');
      return;
    }
    this.removeAttribute('data-w-static');
    const ind2 = this.$('.ind2');
    switch (next) {
      case 'off':
        for (const a of this.loops) a.pause();
        this.ind2Anim?.pause();
        this.later(durations.fast + 34, () => {
          this.cancelLoops();
          this.cancelInd2();
        });
        break;
      case 'running':
        if (this.ind2Anim) {
          this.cancelLoops();
          this.setAttribute('data-w-resuming', '');
          const x = translateXOf(ind2);
          this.ind2Anim = animate(ind2, [{ transform: `translateX(${x}px)` }, { transform: IND2_EXIT }], {
            duration: durations.slow,
            easing: IND_RESUME_SPLINE,
            fill: 'forwards',
          });
          this.later(durations.slower, () => {
            this.removeAttribute('data-w-resuming');
            this.startLoops();
          });
        } else if (this.loops.length === 2) {
          for (const a of this.loops) a.play();
        } else this.startLoops();
        break;
      case 'paused':
      case 'error': {
        const visible = this.loops.length > 0 || this.ind2Anim !== null;
        const x = translateXOf(ind2);
        const [loop1, loop2] = this.loops;
        loop1?.pause();
        loop2?.cancel();
        this.loops = loop1 ? [loop1] : [];
        const out = durations.fast / (durations.fast + 583);
        this.ind2Anim = animate(
          ind2,
          visible
            ? [
                { offset: 0, transform: `translateX(${x}px)`, easing: IND_OUT_SPLINE },
                { offset: out, transform: IND2_END },
                { offset: out, transform: IND2_START, easing: IND_SETTLE_SPLINE },
                { offset: 1, transform: IND2_MID },
              ]
            : [
                { offset: 0, transform: IND2_START, easing: IND_SETTLE_SPLINE },
                { offset: 1, transform: IND2_MID },
              ],
          { duration: visible ? durations.fast + 583 : 583, fill: 'forwards' },
        );
        this.later(durations.fast + 34, () => this.cancelLoops());
        break;
      }
    }
  }
}

const ringCss = css`
:host {
  display: inline-block;
  position: relative;
  width: 32px;
  height: 32px;
  min-width: 16px;
  min-height: 16px;
  vertical-align: middle;
  color: var(--w-progress-ring-foreground, var(--w-accent-fill-color-default));
  transition: opacity var(--w-duration-fast) linear;
  pointer-events: none;
}
:host([active="false"]) { opacity: 0; }
svg { display: block; width: 100%; height: 100%; overflow: visible; }
.spin { transform-origin: 16px 16px; }
circle { fill: none; stroke-width: 3.2; stroke-linecap: round; }
.track { stroke: var(--w-progress-ring-background, transparent); }
.arc {
  stroke: currentColor;
  transform: rotate(-90deg);
  transform-origin: 16px 16px;
}
:host([indeterminate="false"]) .arc {
  stroke-dasharray: calc(var(--_pct, 0) * 100) 100;
  transition: stroke-dasharray var(--w-duration-slow) var(--w-ease-decelerate);
}
:host(:not([indeterminate="false"])) .arc { stroke-dasharray: 0.5 99.5; }
`;

export class WinProgressRing extends WinElement {
  static override styles = [ringCss];
  static override template = `<svg viewBox="0 0 32 32" aria-hidden="true" focusable="false"><g class="spin"><circle class="track" cx="16" cy="16" r="14.4" pathLength="100"/><circle class="arc" part="arc" cx="16" cy="16" r="14.4" pathLength="100"/></g></svg>`;
  static override props: PropDefs = {
    active: { type: Boolean, default: true },
    indeterminate: { type: Boolean, default: true },
    value: { type: Number, default: 0 },
    min: { type: Number, default: 0 },
    max: { type: Number, default: 100 },
    size: { type: Number, default: 0 },
  };
  declare active: boolean;
  declare indeterminate: boolean;
  declare value: number;
  declare min: number;
  declare max: number;
  declare size: number;

  private anims: Animation[] = [];
  private stopTimer: ReturnType<typeof setTimeout> | null = null;
  private sizedBySize = false;

  static {
    this.define('win-progress-ring');
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'progressbar');
  }

  protected override connected(): void {
    if (this.isInitialized) this.restart();
  }

  protected override disconnected(): void {
    this.stop();
  }

  protected override updated(changed: Set<string>): void {
    if (changed.has('size')) {
      if (this.size > 0) {
        this.style.width = `${this.size}px`;
        this.style.height = `${this.size}px`;
        this.sizedBySize = true;
      } else if (this.sizedBySize) {
        this.style.removeProperty('width');
        this.style.removeProperty('height');
        this.sizedBySize = false;
      }
    }
    const range = this.max - this.min;
    const pct = range > 0 ? clamp01((this.value - this.min) / range) : 0;
    this.style.setProperty('--_pct', String(pct));
    this.aria('aria-valuemin', this.min);
    this.aria('aria-valuemax', this.max);
    this.aria('aria-valuenow', this.indeterminate ? null : this.value);
    this.aria('aria-hidden', this.active ? null : 'true');
    if (changed.has('active') || changed.has('indeterminate')) this.restart();
  }

  private stop(): void {
    if (this.stopTimer !== null) clearTimeout(this.stopTimer);
    this.stopTimer = null;
    for (const a of this.anims.splice(0)) a.cancel();
  }

  private restart(): void {
    if (this.stopTimer !== null) clearTimeout(this.stopTimer);
    this.stopTimer = null;
    const arc = this.$('.arc');
    const spin = this.$('.spin');
    if (!this.indeterminate || !this.isConnected || !motionEnabled()) {
      this.stop();
      arc.style.strokeDasharray = this.indeterminate && this.isConnected ? '30 70' : '';
      return;
    }
    arc.style.strokeDasharray = '';
    if (!this.active) {
      for (const a of this.anims) a.pause();
      this.stopTimer = setTimeout(() => this.stop(), durations.fast + 34);
      return;
    }
    if (this.anims.length) {
      for (const a of this.anims) a.play();
      return;
    }
    const ease = 'cubic-bezier(0.4, 0, 0.2, 1)';
    this.anims.push(
      arc.animate(
        [
          { offset: 0, strokeDasharray: '0.5 99.5', strokeDashoffset: '0', easing: ease },
          { offset: 0.5, strokeDasharray: '72 28', strokeDashoffset: '-12', easing: ease },
          { offset: 1, strokeDasharray: '0.5 99.5', strokeDashoffset: '-100' },
        ],
        { duration: 1600, iterations: Infinity },
      ),
      spin.animate([{ transform: 'rotate(0deg)' }, { transform: 'rotate(360deg)' }], {
        duration: 2000,
        iterations: Infinity,
        easing: 'linear',
      }),
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-progress-bar': WinProgressBar;
    'win-progress-ring': WinProgressRing;
  }
}
