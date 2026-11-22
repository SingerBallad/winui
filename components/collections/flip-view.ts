import { WinElement, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css, focusRing } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { animate, durations, easings, motionEnabled } from '../../motion/animate.ts';

export class WinFlipViewItem extends WinElement {
  static override styles = [
    css`
      :host {
        display: block;
        position: relative;
        flex: 0 0 100%;
        width: 100%;
        height: 100%;
        box-sizing: border-box;
        overflow: hidden;
      }
    `,
  ];
  static override template = `<slot></slot>`;
  static {
    this.define('win-flip-view-item');
  }
  protected override firstConnected(): void {
    this.setAttribute('role', 'group');
    this.setAttribute('aria-roledescription', '幻灯片');
  }
}

const flipCss = css`
:host {
  display: block;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  border-radius: var(--w-corner-radius-control);
  background-color: var(--w-solid-background-fill-color-base);
  outline: none;
  user-select: none;
  -webkit-user-select: none;
  touch-action: pan-y;
}
:host([orientation="vertical"]) { touch-action: pan-x; }
${focusRing(':host(:focus-visible)', 2)}
.viewport { position: absolute; inset: 0; overflow: hidden; border-radius: inherit; }
.track {
  display: flex;
  width: 100%;
  height: 100%;
  will-change: transform;
}
:host([orientation="vertical"]) .track { flex-direction: column; }
::slotted(*) {
  flex: 0 0 100%;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
}
.nav {
  position: absolute;
  box-sizing: border-box;
  display: none;
  align-items: center;
  justify-content: center;
  margin: 0;
  padding: 0;
  border: 0 solid var(--w-control-stroke-color-default);
  border-radius: var(--w-corner-radius-control);
  ${acrylicSurface}
  color: var(--w-control-strong-fill-color-default);
  cursor: default;
  opacity: 0;
  transition: opacity var(--w-duration-fast) linear;
  z-index: 2;
}
.nav:hover, .nav:active { color: var(--w-text-fill-color-secondary); }
.nav .w-glyph { transition: transform var(--w-duration-faster) linear; }
.nav:active .w-glyph { transform: scale(0.875); }
.h { width: 16px; height: 38px; top: 50%; margin-top: -19px; }
.v { width: 38px; height: 16px; left: 50%; margin-left: -19px; }
.prev.h { left: 1px; }
.next.h { right: 1px; }
.prev.v { top: 1px; }
.next.v { bottom: 1px; }
:host(:not([orientation="vertical"])) .h, :host([orientation="vertical"]) .v { display: inline-flex; }
:host([data-buttons]) .nav { opacity: 1; }
.nav[hidden] { display: none !important; }
:host(:dir(rtl)) .h .w-glyph { scale: -1 1; }
`;

export class WinFlipView extends WinElement {
  static override styles = [flipCss];
  static override template = `<div class="viewport" part="viewport"><div class="track" part="track"><slot></slot></div></div><button class="nav prev h" part="previous-button" tabindex="-1" aria-label="上一个">${glyph('caretLeft', 8)}</button><button class="nav next h" part="next-button" tabindex="-1" aria-label="下一个">${glyph('caretRight', 8)}</button><button class="nav prev v" part="previous-button" tabindex="-1" aria-label="上一个">${glyph('caretUp', 8)}</button><button class="nav next v" part="next-button" tabindex="-1" aria-label="下一个">${glyph('caretDown', 8)}</button>`;
  static override props: PropDefs = {
    selectedIndex: { type: Number, attribute: 'selected-index', default: 0 },
    orientation: { type: String, reflect: true, default: 'horizontal' },
    useTouchAnimationsForAllNavigation: {
      type: Boolean,
      attribute: 'use-touch-animations-for-all-navigation',
      default: true,
    },
  };
  declare selectedIndex: number;
  declare orientation: 'horizontal' | 'vertical';
  declare useTouchAnimationsForAllNavigation: boolean;

  static {
    this.define('win-flip-view');
  }

  private track!: HTMLElement;
  private shown = -1;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private drag: {
    id: number;
    start: number;
    startOther: number;
    t: number;
    base: number;
    delta: number;
    active: boolean;
  } | null = null;
  private suppressClick = false;
  private anim: Animation | null = null;

  get items(): HTMLElement[] {
    return Array.from(this.children) as HTMLElement[];
  }

  private get vertical(): boolean {
    return this.orientation === 'vertical';
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'region');
    this.setAttribute('aria-roledescription', '轮播');
    if (!this.hasAttribute('tabindex')) this.tabIndex = 0;
    this.track = this.$('.track');
    for (const b of this.$$<HTMLButtonElement>('.nav')) {
      b.addEventListener('click', (ev) => {
        ev.stopPropagation();
        this.go(b.classList.contains('prev') ? -1 : 1, this.useTouchAnimationsForAllNavigation);
      });
      b.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    }
    this.addEventListener('pointerenter', () => this.showButtons());
    this.addEventListener('pointermove', (ev) => {
      if (ev.pointerType === 'mouse') this.showButtons();
    });
    this.addEventListener('pointerleave', () => this.hideButtons(0));
    this.addEventListener('keydown', (ev) => this.onKey(ev));
    this.addEventListener('pointerdown', (ev) => this.onDown(ev));
    this.addEventListener('pointermove', (ev) => this.onMove(ev));
    this.addEventListener('pointerup', (ev) => this.onUp(ev));
    this.addEventListener('pointercancel', (ev) => this.onUp(ev));
    this.addEventListener('lostpointercapture', (ev) => this.onUp(ev));
    this.addEventListener(
      'click',
      (ev) => {
        if (this.suppressClick) {
          ev.stopPropagation();
          ev.preventDefault();
        }
      },
      true,
    );
    new MutationObserver(() => this.syncItems()).observe(this, { childList: true });
    new ResizeObserver(() => this.place(this.selectedIndex, false)).observe(this);
    this.syncItems();
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('orientation') && !first) this.place(this.selectedIndex, false);
    if (changed.has('selectedIndex')) {
      const n = this.items.length;
      const i = n ? Math.max(0, Math.min(n - 1, this.selectedIndex)) : 0;
      if (i !== this.selectedIndex) {
        this.selectedIndex = i;
        return;
      }
      const prev = this.shown;
      this.place(i, !first && prev >= 0);
      if (!first && prev !== i && prev >= 0) {
        this.emit('selectionchanged', { index: i, previousIndex: prev, item: this.items[i] });
      }
      this.shown = i;
      this.syncButtons();
      this.syncAria();
    }
  }

  private syncItems(): void {
    const n = this.items.length;
    if (this.selectedIndex >= n && n > 0) this.selectedIndex = n - 1;
    this.syncButtons();
    this.syncAria();
    this.place(this.selectedIndex, false);
  }

  private syncAria(): void {
    const items = this.items;
    items.forEach((el, k) => {
      if (!el.hasAttribute('aria-label')) el.setAttribute('aria-label', `${k + 1} / ${items.length}`);
      el.setAttribute('aria-hidden', String(k !== this.selectedIndex));
    });
  }

  private syncButtons(): void {
    const n = this.items.length;
    for (const b of this.$$<HTMLButtonElement>('.prev')) b.hidden = this.selectedIndex <= 0;
    for (const b of this.$$<HTMLButtonElement>('.next')) b.hidden = this.selectedIndex >= n - 1;
  }

  private showButtons(): void {
    this.toggleAttribute('data-buttons', true);
    this.hideButtons(3000);
  }

  private hideButtons(delay: number): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      if (!this.matches(':hover') || delay === 0) this.removeAttribute('data-buttons');
    }, delay);
  }

  private size(): number {
    return this.vertical ? this.clientHeight || 1 : this.clientWidth || 1;
  }

  private transformFor(px: number): string {
    return this.vertical ? `translate3d(0, ${px}px, 0)` : `translate3d(${px}px, 0, 0)`;
  }

  private currentOffset(): number {
    const m = new DOMMatrixReadOnly(getComputedStyle(this.track).transform);
    return this.vertical ? m.m42 : m.m41;
  }

  private place(i: number, animated: boolean): void {
    if (!this.track) return;
    const rtl = getComputedStyle(this).direction === 'rtl' && !this.vertical;
    const target = -i * this.size() * (rtl ? -1 : 1);
    const from = this.currentOffset();
    this.anim?.cancel();
    this.track.style.transform = this.transformFor(target);
    if (animated && motionEnabled() && Math.abs(from - target) > 0.5) {
      this.anim = animate(
        this.track,
        [{ transform: this.transformFor(from) }, { transform: this.transformFor(target) }],
        {
          duration: durations.slow,
          easing: easings.decelerate,
        },
      );
    }
  }

  go(delta: number, animated = true): void {
    const n = this.items.length;
    const next = Math.max(0, Math.min(n - 1, this.selectedIndex + delta));
    if (next === this.selectedIndex) return;
    if (!animated) this.shown = -1;
    this.selectedIndex = next;
  }

  private onKey(ev: KeyboardEvent): void {
    if (ev.target !== this) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const prevKey = this.vertical ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    const nextKey = this.vertical ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    let handled = true;
    if (ev.key === prevKey || ev.key === 'PageUp') this.go(-1);
    else if (ev.key === nextKey || ev.key === 'PageDown') this.go(1);
    else if (ev.key === 'Home') this.selectedIndex = 0;
    else if (ev.key === 'End') this.selectedIndex = this.items.length - 1;
    else handled = false;
    if (handled) ev.preventDefault();
  }

  private onDown(ev: PointerEvent): void {
    if (ev.button !== 0 || this.items.length < 2) return;
    this.drag = {
      id: ev.pointerId,
      start: this.vertical ? ev.clientY : ev.clientX,
      startOther: this.vertical ? ev.clientX : ev.clientY,
      t: performance.now(),
      base: 0,
      delta: 0,
      active: false,
    };
  }

  private onMove(ev: PointerEvent): void {
    const d = this.drag;
    if (!d || d.id !== ev.pointerId) return;
    if (!(ev.buttons & 1)) {
      this.onUp(ev);
      return;
    }
    const pos = this.vertical ? ev.clientY : ev.clientX;
    const other = this.vertical ? ev.clientX : ev.clientY;
    const delta = pos - d.start;
    if (!d.active) {
      if (Math.abs(delta) < 6) return;
      if (Math.abs(other - d.startOther) > Math.abs(delta)) {
        this.drag = null;
        return;
      }
      d.active = true;
      this.setPointerCapture(ev.pointerId);
      d.base = this.currentOffset();
      this.anim?.cancel();
      this.anim = null;
    }
    const size = this.size();
    const n = this.items.length;
    const rtl = !this.vertical && getComputedStyle(this).direction === 'rtl';
    const min = rtl ? 0 : -(n - 1) * size;
    const max = rtl ? (n - 1) * size : 0;
    let p = d.base + delta;
    if (p > max) p = max + (p - max) * 0.3;
    else if (p < min) p = min + (p - min) * 0.3;
    d.delta = p - d.base;
    this.track.style.transform = this.transformFor(p);
  }

  private onUp(ev: PointerEvent): void {
    const d = this.drag;
    if (!d || d.id !== ev.pointerId) return;
    this.drag = null;
    if (!d.active) return;
    this.suppressClick = true;
    setTimeout(() => (this.suppressClick = false), 0);
    const dt = Math.max(1, performance.now() - d.t);
    const v = d.delta / dt;
    const size = this.size();
    const rtl = !this.vertical && getComputedStyle(this).direction === 'rtl';
    const sign = rtl ? 1 : -1;
    const n = this.items.length;
    const exact = ((d.base + d.delta) * sign) / size;
    let next = Math.round(exact);
    const flick = v * sign;
    if (flick > 0.4) next = Math.ceil(exact - 0.05);
    else if (flick < -0.4) next = Math.floor(exact + 0.05);
    else if (Math.abs(exact - this.selectedIndex) > 0.2)
      next = exact > this.selectedIndex ? Math.ceil(exact) : Math.floor(exact);
    next = Math.max(0, Math.min(n - 1, next));
    if (next === this.selectedIndex) this.place(next, true);
    else this.selectedIndex = next;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-flip-view': WinFlipView;
    'win-flip-view-item': WinFlipViewItem;
  }
}
