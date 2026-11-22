import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { animate, cancelAnimations, durations, easings, motionEnabled } from '../../motion/animate.ts';

export type RefreshState = 'idle' | 'peeking' | 'interacting' | 'pending' | 'refreshing';

const visualizerCss = css`
:host {
  display: flex;
  align-items: flex-end;
  justify-content: center;
  box-sizing: border-box;
  height: 100%;
  padding-bottom: 16px;
  color: light-dark(#000, #fff);
  pointer-events: none;
}
:host([data-up]) { align-items: flex-start; padding-bottom: 0; padding-top: 16px; }
.indicator {
  width: 32px;
  height: 32px;
  border-radius: 50%;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  background: var(--w-solid-background-fill-color-quarternary);
  box-shadow: var(--w-elevation-tooltip);
  opacity: var(--w-refresh-progress, 0);
  transform: scale(calc(0.6 + var(--w-refresh-progress, 0) * 0.4));
}
.glyph { display: inline-flex; }
`;

const WIND_DEG = 270;

export class WinRefreshIndicator extends WinElement {
  static override styles = [visualizerCss];
  static override template = `<span class="indicator" part="indicator"><span class="glyph" part="glyph">${glyph('refresh', 16)}</span></span>`;
  static override props: PropDefs = {
    state: { type: String, reflect: true, default: 'idle' },
  };
  declare state: RefreshState;
  static {
    this.define('win-refresh-indicator');
  }

  private glyphEl!: HTMLElement;
  private spin: Animation | null = null;
  private wind = 0;
  private windBase = 0;
  private held: number | null = null;

  protected override firstConnected(): void {
    this.setAttribute('aria-hidden', 'true');
    this.glyphEl = this.$('.glyph');
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (!changed.has('state')) return;
    if (this.state === 'refreshing') this.startSpin();
    else this.stopSpin();
    if ((this.state === 'interacting' || this.state === 'pending') && this.held !== null) {
      this.windBase = this.held - this.wind * WIND_DEG;
      this.held = null;
    }
  }

  private renderedAngle(): number {
    const t = getComputedStyle(this.glyphEl).transform;
    if (!t || t === 'none') return 0;
    const m = new DOMMatrixReadOnly(t);
    return (Math.atan2(m.b, m.a) * 180) / Math.PI;
  }

  private startSpin(): void {
    if (this.spin) return;
    const from = this.held ?? this.windBase + this.wind * WIND_DEG;
    this.held = null;
    this.spin = this.glyphEl.animate([{ transform: `rotate(${from}deg)` }, { transform: `rotate(${from + 360}deg)` }], {
      duration: motionEnabled() ? 900 : 2400,
      iterations: Infinity,
      easing: 'linear',
    });
  }

  private stopSpin(): void {
    if (!this.spin) return;
    this.held = this.renderedAngle();
    this.spin.cancel();
    this.spin = null;
    this.glyphEl.style.transform = `rotate(${this.held}deg)`;
  }

  private renderAngle(): void {
    if (!this.spin && this.held === null)
      this.glyphEl.style.transform = `rotate(${this.windBase + this.wind * WIND_DEG}deg)`;
  }

  setPull(reveal: number, wind: number): void {
    this.style.setProperty('--w-refresh-progress', String(Math.max(0, Math.min(1, reveal))));
    this.wind = Math.max(0, Math.min(1, wind));
    if (!this.spin && reveal <= 0 && this.wind <= 0) {
      this.held = null;
      this.windBase = 0;
    }
    this.renderAngle();
  }

  set progress(p: number) {
    this.setPull(p, p);
  }
}

const containerCss = css`
:host {
  display: block;
  position: relative;
  overflow: hidden;
  box-sizing: border-box;
  touch-action: pan-x pan-y;
}
.visualizer {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 100px;
  min-height: 80px;
  transform: translateY(-100px);
  z-index: 0;
}
:host([pull-direction="bottom-to-top"]) .visualizer { top: auto; bottom: 0; transform: translateY(100px); }
:host([data-w-pulling]) { user-select: none; -webkit-user-select: none; }
.content { position: relative; z-index: 1; height: 100%; will-change: transform; }
`;

const THRESHOLD = 80;
const HOLD = 64;

export class WinPullToRefresh extends WinElement {
  static override styles = [containerCss];
  static override template = `<div class="visualizer" part="visualizer"><win-refresh-indicator></win-refresh-indicator></div><div class="content" part="content"><slot></slot></div>`;
  static override props: PropDefs = {
    pullDirection: { type: String, attribute: 'pull-direction', reflect: true, default: 'top-to-bottom' },
  };
  declare pullDirection: 'top-to-bottom' | 'bottom-to-top';

  static {
    this.define('win-pull-to-refresh');
  }

  private vis!: WinRefreshIndicator;
  private content!: HTMLElement;
  private visBox!: HTMLElement;
  private drag: { id: number; y: number; active: boolean } | null = null;
  private pull = 0;
  private refreshing = false;
  private syncFrame = 0;

  get visualizer(): WinRefreshIndicator {
    return this.vis;
  }

  protected override firstConnected(): void {
    this.vis = this.$('win-refresh-indicator') as WinRefreshIndicator;
    this.content = this.$('.content');
    this.visBox = this.$('.visualizer');
    this.addEventListener('pointerdown', (ev) => this.onDown(ev));
    this.addEventListener('pointermove', (ev) => this.onMove(ev));
    this.addEventListener('pointerup', (ev) => this.onUp(ev));
    this.addEventListener('pointercancel', (ev) => this.onUp(ev));
    this.addEventListener('lostpointercapture', (ev) => this.onUp(ev));
  }

  protected override disconnected(): void {
    if (this.syncFrame) cancelAnimationFrame(this.syncFrame);
    this.syncFrame = 0;
    this.drag = null;
    this.removeAttribute('data-w-pulling');
  }

  private get sign(): number {
    return this.pullDirection === 'bottom-to-top' ? -1 : 1;
  }

  private atEdge(): boolean {
    const scrollers: Element[] = [];
    for (const el of this.querySelectorAll('*')) {
      const cs = getComputedStyle(el);
      if ((cs.overflowY === 'auto' || cs.overflowY === 'scroll') && el.scrollHeight > el.clientHeight)
        scrollers.push(el);
      const inner = el.shadowRoot?.querySelector('.scroller');
      if (inner && inner.scrollHeight > inner.clientHeight) scrollers.push(inner);
    }
    return scrollers.every((s) =>
      this.sign > 0 ? s.scrollTop <= 0 : Math.ceil(s.scrollTop + s.clientHeight) >= s.scrollHeight,
    );
  }

  private place(px: number): void {
    this.pull = px;
    this.vis.toggleAttribute('data-up', this.sign < 0);
    this.content.style.transform = px ? `translateY(${this.sign * px}px)` : '';
    this.visBox.style.transform = `translateY(${this.sign * (px - 100)}px)`;
  }

  private feedback(px: number): void {
    this.vis.setPull(px / HOLD, px / THRESHOLD);
  }

  private apply(px: number): void {
    this.place(px);
    this.feedback(px);
  }

  private visualPull(): number {
    const t = getComputedStyle(this.content).transform;
    return !t || t === 'none' ? 0 : Math.abs(new DOMMatrixReadOnly(t).m42);
  }

  private sync = (): void => {
    this.syncFrame = 0;
    this.feedback(this.visualPull());
    if (this.content.getAnimations().some((a) => a.playState === 'running'))
      this.syncFrame = requestAnimationFrame(this.sync);
  };

  private animateTo(px: number): void {
    const from = this.visualPull();
    this.place(px);
    animate(
      this.content,
      [{ transform: `translateY(${this.sign * from}px)` }, { transform: `translateY(${this.sign * px}px)` }],
      {
        duration: durations.normal,
        easing: easings.decelerate,
      },
    );
    animate(
      this.visBox,
      [
        { transform: `translateY(${this.sign * (from - 100)}px)` },
        { transform: `translateY(${this.sign * (px - 100)}px)` },
      ],
      {
        duration: durations.normal,
        easing: easings.decelerate,
      },
    );
    if (!this.syncFrame) this.syncFrame = requestAnimationFrame(this.sync);
  }

  private onDown(ev: PointerEvent): void {
    if (ev.button !== 0 || this.refreshing || !this.atEdge()) return;
    this.drag = { id: ev.pointerId, y: ev.clientY, active: false };
  }

  private freeze(): number {
    const cur = this.visualPull();
    cancelAnimations(this.content);
    cancelAnimations(this.visBox);
    this.apply(cur);
    return cur;
  }

  private onMove(ev: PointerEvent): void {
    const d = this.drag;
    if (!d || d.id !== ev.pointerId) return;
    if (!(ev.buttons & 1)) {
      this.onUp(ev);
      return;
    }
    const dy = (ev.clientY - d.y) * this.sign;
    if (!d.active) {
      if (dy < 8) {
        if (dy < -4) this.drag = null;
        return;
      }
      d.active = true;
      this.setPointerCapture(ev.pointerId);
      this.setAttribute('data-w-pulling', '');
      this.vis.state = 'interacting';
      d.y = ev.clientY - (this.freeze() / 0.6) * this.sign;
    }
    ev.preventDefault();
    const sel = getSelection();
    if (sel && !sel.isCollapsed && sel.anchorNode && this.contains(sel.anchorNode)) sel.removeAllRanges();
    const px = Math.max(0, Math.min(140, (ev.clientY - d.y) * this.sign * 0.6));
    this.apply(px);
    this.vis.state = px >= THRESHOLD ? 'pending' : 'interacting';
  }

  private onUp(ev: PointerEvent): void {
    const d = this.drag;
    if (!d || d.id !== ev.pointerId) return;
    this.drag = null;
    if (!d.active) return;
    this.removeAttribute('data-w-pulling');
    if (this.pull >= THRESHOLD) this.requestRefresh();
    else {
      this.vis.state = 'idle';
      this.animateTo(0);
    }
  }

  requestRefresh(): void {
    if (this.refreshing) return;
    this.refreshing = true;
    this.vis.state = 'refreshing';
    this.animateTo(HOLD);
    let deferred = false;
    let done = false;
    const finish = () => {
      if (done) return;
      done = true;
      this.refreshing = false;
      this.vis.state = 'idle';
      this.animateTo(0);
    };
    const deferral = { complete: finish };
    this.emit('refreshrequested', {
      getDeferral: () => {
        deferred = true;
        return deferral;
      },
      complete: finish,
    });
    queueMicrotask(() => {
      if (!deferred) setTimeout(finish, 600);
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-pull-to-refresh': WinPullToRefresh;
    'win-refresh-indicator': WinRefreshIndicator;
  }
}
