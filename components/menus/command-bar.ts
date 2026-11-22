import { WinElement, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css, materialOverrides, scrollbars } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { Popup, popupResetCss, viewportSize, type PositionResult } from '../../base/popup.ts';
import { animate, durations, easings, fadeIn, menuIn, settled } from '../../motion/animate.ts';
import { isAppBarElement, type AppBarElement, type AppBarMode, type AppBarModeFlags } from './app-bar.ts';

const MOVED_SLOT = 'w-overflow-primary';

const commandBarCss = css`
:host {
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
  height: 40px;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  -webkit-tap-highlight-color: transparent;
  user-select: none;
  -webkit-user-select: none;
}
:host([hidden]) { display: none; }
:host([closed-display-mode="minimal"]) { height: 24px; }
:host([closed-display-mode="hidden"]) { height: 0; }
:host([data-dir="up"]) { justify-content: flex-end; }
:host([data-state="open"]), :host([data-state="opening"]), :host([data-state="closing"]) { z-index: 3; }

.bar {
  position: relative;
  flex: none;
  display: flex;
  align-items: flex-start;
  box-sizing: border-box;
  height: var(--bar-h, 40px);
  min-height: 0;
  border-radius: var(--w-corner-radius-control);
  overflow: hidden;
}
:host([data-state="open"]) .bar, :host([data-state="opening"]) .bar, :host([data-state="closing"]) .bar {
  ${acrylicSurface}
}
.open-border {
  position: absolute;
  inset: 0;
  border: 1px solid var(--w-card-stroke-color-default-solid);
  border-radius: inherit;
  pointer-events: none;
  display: none;
}
:host([data-state="open"]) .open-border, :host([data-state="opening"]) .open-border, :host([data-state="closing"]) .open-border { display: block; }

.content {
  flex: 1 1 auto;
  min-width: 0;
  margin-inline-start: 4px;
  height: 40px;
  align-self: flex-start;
  display: flex;
  align-items: center;
}
:host([data-dir="up"]) .content { align-self: flex-end; }
.content[hidden] { display: none; }
.primary {
  display: flex;
  flex: 0 0 auto;
  margin-inline-start: auto;
  justify-content: flex-end;
  align-items: flex-start;
  min-width: 0;
  min-height: 40px;
}
:host([is-dynamic-overflow-enabled]) .content { flex: 0 1 auto; }
:host([is-dynamic-overflow-enabled]) .primary { flex: 1 1 auto; overflow: hidden; }
:host([closed-display-mode="minimal"][data-state="closed"]) .primary,
:host([closed-display-mode="minimal"][data-state="closed"]) .content { opacity: 0; pointer-events: none; }

.more {
  position: relative;
  flex: none;
  width: 48px;
  min-height: 40px;
  align-self: flex-start;
  display: flex;
  justify-content: center;
  padding-top: 18px;
  box-sizing: border-box;
  color: var(--w-text-fill-color-primary);
  cursor: default;
  outline: none;
}
.more[hidden] { display: none; }
.more-spacer { flex: none; width: 6px; }
.more .bg {
  position: absolute;
  inset: 6px 6px 6px 2px;
  border-radius: var(--w-corner-radius-control);
  transition: background-color var(--w-duration-faster) linear;
}
.more:hover .bg { background: var(--w-subtle-fill-color-secondary); }
.more:active .bg { background: var(--w-subtle-fill-color-tertiary); }
.more:active { color: var(--w-text-fill-color-secondary); }
.more .dots { position: relative; height: 4px; display: flex; align-items: center; }
.more:focus-visible .bg {
  outline: 2px solid var(--w-focus-stroke-color-outer);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--w-focus-stroke-color-inner);
}
:host([data-state="open"]) .more, :host([data-state="opening"]) .more, :host([data-state="closing"]) .more { align-self: stretch; }
:host([closed-display-mode="minimal"][data-state="closed"]) .more { min-height: 24px; padding-top: 10px; }
:host([closed-display-mode="minimal"][data-state="closed"]) .more .bg { inset: 0 6px 0 2px; }

${popupResetCss('.overflow')}
.presenter {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 160px;
  max-width: 480px;
  max-height: min(758px, var(--w-popup-max-height, 758px));
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-flyout);
  color: var(--w-text-fill-color-primary);
  overflow: hidden;
  outline: none;
}
.overflow.empty .presenter { display: none; }
.items { padding: 4px 0; overflow-x: hidden; overflow-y: auto; min-height: 0; }
.dyn-sep { display: none; height: 1px; margin: 4px 0; background: var(--w-divider-stroke-color-default); }
.overflow.both .dyn-sep { display: block; }
`;

export type ClosedDisplayMode = 'compact' | 'minimal' | 'hidden';
export type LabelPosition = 'bottom' | 'right' | 'collapsed';

export class WinCommandBar extends WinElement {
  static override styles = [scrollbars, commandBarCss, css`${materialOverrides('.bar')}`];
  static override materialPart = '.bar';
  static override template = `<div class="bar" part="bar"><div class="content" part="content"><slot name="content"></slot></div><div class="primary" part="primary"><slot></slot></div><div class="more" part="more-button" role="button" tabindex="0" aria-haspopup="menu" aria-expanded="false"><span class="bg"></span><span class="dots">${glyph('more', 20)}</span></div><span class="more-spacer" hidden></span><span class="open-border" aria-hidden="true"></span></div><div class="overflow" part="overflow"><div class="presenter" part="overflow-presenter" role="menu" tabindex="-1"><div class="items w-scroll" part="overflow-items"><slot name="${MOVED_SLOT}"></slot><div class="dyn-sep" role="separator"></div><slot name="secondary"></slot></div></div></div>`;
  static override props: PropDefs = {
    isOpen: { type: Boolean, attribute: 'is-open' },
    closedDisplayMode: { type: String, attribute: 'closed-display-mode', reflect: true, default: 'compact' },
    defaultLabelPosition: { type: String, attribute: 'default-label-position', reflect: true, default: 'bottom' },
    isDynamicOverflowEnabled: { type: Boolean, attribute: 'is-dynamic-overflow-enabled', default: true },
    overflowButtonVisibility: { type: String, attribute: 'overflow-button-visibility', default: 'auto' },
    isSticky: { type: Boolean, attribute: 'is-sticky' },
  };
  declare isOpen: boolean;
  declare closedDisplayMode: ClosedDisplayMode;
  declare defaultLabelPosition: LabelPosition;
  declare isDynamicOverflowEnabled: boolean;
  declare overflowButtonVisibility: 'auto' | 'visible' | 'collapsed';
  declare isSticky: boolean;

  private bar!: HTMLElement;
  private more!: HTMLElement;
  private overflow!: HTMLElement;
  private presenter!: HTMLElement;
  private popup!: Popup;
  private ro: ResizeObserver | null = null;
  private layoutQueued = false;
  private state: 'closed' | 'opening' | 'open' | 'closing' = 'closed';
  private barWidths = new WeakMap<Element, number>();
  private anim: Animation | null = null;

  static {
    this.define('win-command-bar');
  }

  get primaryCommands(): AppBarElement[] {
    return Array.from(this.children).filter(
      (c): c is AppBarElement => isAppBarElement(c) && (!c.slot || c.slot === MOVED_SLOT),
    );
  }

  get secondaryCommands(): AppBarElement[] {
    return Array.from(this.children).filter((c): c is AppBarElement => isAppBarElement(c) && c.slot === 'secondary');
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'toolbar');
    this.bar = this.$('.bar');
    this.more = this.$('.more');
    this.overflow = this.$('.overflow');
    this.presenter = this.$('.presenter');
    this.popup = new Popup(this.overflow, this.presenter);
    this.more.setAttribute(
      'aria-label',
      /^zh/i.test(document.documentElement.lang || navigator.language) ? '查看更多' : 'See more',
    );
    this.setAttribute('data-state', 'closed');

    this.more.addEventListener('click', () => {
      this.isOpen = !this.isOpen;
    });
    this.more.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        this.isOpen = !this.isOpen;
        if (this.isOpen) queueMicrotask(() => this.focusOverflow(0));
      } else if (ev.key === 'ArrowDown' && this.isOpen) {
        ev.preventDefault();
        this.focusOverflow(0);
      }
    });
    this.renderRoot.addEventListener('slotchange', () => this.queueLayout());
    this.addEventListener('win-appbar-item-ready', () => this.queueLayout());
    this.addEventListener('win-appbar-invoke', () => {
      if (this.isOpen) this.isOpen = false;
    });
    this.addEventListener('keydown', (ev) => this.onKey(ev));
    this.ro = new ResizeObserver(() => this.queueLayout());
    this.ro.observe(this);
    this.queueLayout();
  }

  protected override connected(): void {
    if (this.ro && this.isInitialized) this.ro.observe(this);
  }

  protected override disconnected(): void {
    this.ro?.disconnect();
    if (this.popup?.isOpen) void this.popup.close('programmatic');
    if (this.bar && this.state !== 'closed') {
      this.anim?.cancel();
      this.anim = null;
      for (const a of this.$('.content').getAnimations()) a.cancel();
      this.state = 'closed';
      this.setAttribute('data-state', 'closed');
      this.removeAttribute('data-dir');
      this.more.setAttribute('aria-expanded', 'false');
      this.applyModes(false);
      this.syncBarHeight();
      if (this.isOpen) this.isOpen = false;
    }
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('isDynamicOverflowEnabled'))
      this.toggleAttr('is-dynamic-overflow-enabled', this.isDynamicOverflowEnabled);
    if (changed.has('isOpen') && !first) {
      if (this.isOpen) this.open();
      else this.close();
    } else if (first && this.isOpen) {
      queueMicrotask(() => this.open());
    }
    if (
      changed.has('closedDisplayMode') ||
      changed.has('defaultLabelPosition') ||
      changed.has('overflowButtonVisibility') ||
      changed.has('isDynamicOverflowEnabled')
    ) {
      this.queueLayout();
    }
  }

  private queueLayout(): void {
    if (this.layoutQueued) return;
    this.layoutQueued = true;
    requestAnimationFrame(() => {
      this.layoutQueued = false;
      this.layout();
    });
  }

  private primaryMode(open: boolean): AppBarMode {
    const pos = this.defaultLabelPosition;
    if (pos === 'right') return 'right';
    if (pos === 'collapsed') return 'collapsed';
    return open ? 'full' : 'compact';
  }

  private applyModes(open: boolean): void {
    const moved = this.primaryCommands.filter((c) => c.slot === MOVED_SLOT);
    const overflowItems = [...moved, ...this.secondaryCommands];
    const flags: AppBarModeFlags = {
      icons: overflowItems.some((c) => c.hasIconContent && c.localName !== 'win-app-bar-separator'),
      toggles: overflowItems.some((c) => c.isToggle),
    };
    for (const c of this.primaryCommands) {
      if (c.slot === MOVED_SLOT) c.setAppBarMode('overflow', flags);
      else c.setAppBarMode(this.primaryMode(open), { hideFlyoutChevron: true });
    }
    for (const c of this.secondaryCommands) c.setAppBarMode('overflow', flags);
    this.overflow.classList.toggle('both', moved.length > 0 && this.secondaryCommands.length > 0);
    this.overflow.classList.toggle('empty', overflowItems.length === 0);
  }

  private moreVisible(): boolean {
    return this.moreVisibleWith(this.primaryCommands.some((c) => c.slot === MOVED_SLOT));
  }

  private moreVisibleWith(moved: boolean): boolean {
    const v = this.overflowButtonVisibility;
    if (v === 'visible') return true;
    if (v === 'collapsed') return false;
    if (this.closedDisplayMode !== 'compact') return true;
    const hasOverflow = this.secondaryCommands.length > 0 || moved;
    const revealsLabels =
      this.defaultLabelPosition === 'bottom' &&
      this.primaryCommands.some((c) => c.localName !== 'win-app-bar-separator');
    return hasOverflow || revealsLabels;
  }

  private layout(): void {
    if (!this.isConnected || !this.bar) return;
    const open = this.state === 'open' || this.state === 'opening';
    const hasContent = this.$<HTMLSlotElement>('slot[name="content"]').assignedNodes().length > 0;
    this.$('.content').hidden = !hasContent;
    this.applyModes(open);
    if (this.isDynamicOverflowEnabled) this.dynamicOverflow();
    else {
      for (const c of this.primaryCommands) if (c.slot === MOVED_SLOT) c.removeAttribute('slot');
      this.applyModes(open);
    }
    const showMore = this.moreVisible();
    this.more.hidden = !showMore;
    this.$('.more-spacer').hidden = showMore;
    this.syncBarHeight();
    this.aria('aria-orientation', 'horizontal');
  }

  private dynamicOverflow(): void {
    const prims = this.primaryCommands;
    for (const c of prims) if (c.slot !== MOVED_SLOT) this.barWidths.set(c, c.getBoundingClientRect().width);
    const content = this.$('.content');
    const contentW = content.hidden ? 0 : content.getBoundingClientRect().width + 4;
    const barW = this.bar.getBoundingClientRect().width;
    const anyMoved = prims.some((c) => c.slot === MOVED_SLOT);
    const moreFor = (moved: boolean) => (this.moreVisibleWith(moved) ? 48 : 6);
    let available = barW - contentW - moreFor(anyMoved) + 0.5;
    const width = (c: Element) => this.barWidths.get(c) ?? 68;
    const order = prims
      .map((c, i) => ({ c, i, o: Number(c.getAttribute('dynamic-overflow-order') ?? Number.NaN) }))
      .sort((a, b) => {
        const ao = Number.isNaN(a.o) ? Number.POSITIVE_INFINITY : a.o;
        const bo = Number.isNaN(b.o) ? Number.POSITIVE_INFINITY : b.o;
        return ao !== bo ? ao - bo : b.i - a.i;
      })
      .map((x) => x.c);
    let used = prims.filter((c) => c.slot !== MOVED_SLOT).reduce((s, c) => s + width(c), 0);
    let changed = false;
    if (used > available) {
      available = barW - contentW - moreFor(true) + 0.5;
      for (const c of order) {
        if (used <= available) break;
        if (c.slot === MOVED_SLOT) continue;
        used -= width(c);
        c.slot = MOVED_SLOT;
        changed = true;
      }
      if (changed) this.emit('dynamicoverflowitemschanging', { action: 'added' }, { bubbles: false });
    } else {
      let moved = prims.filter((c) => c.slot === MOVED_SLOT).length;
      for (const c of [...order].reverse()) {
        if (c.slot !== MOVED_SLOT) continue;
        if (used + width(c) > barW - contentW - moreFor(moved > 1) + 0.5) break;
        used += width(c);
        moved--;
        c.removeAttribute('slot');
        changed = true;
      }
      if (changed) this.emit('dynamicoverflowitemschanging', { action: 'removed' }, { bubbles: false });
    }
    if (changed) this.applyModes(this.state === 'open' || this.state === 'opening');
  }

  private closedHeight(): number {
    return this.closedDisplayMode === 'minimal' ? 24 : this.closedDisplayMode === 'hidden' ? 0 : 40;
  }

  private openHeight(): number {
    let h = 40;
    for (const c of this.primaryCommands) {
      if (c.slot === MOVED_SLOT || (c as HTMLElement).hidden) continue;
      h = Math.max(h, (c as HTMLElement).offsetHeight);
    }
    return h;
  }

  private syncBarHeight(): void {
    const open = this.state === 'open' || this.state === 'opening';
    this.bar.style.setProperty('--bar-h', `${open ? this.openHeight() : this.closedHeight()}px`);
  }

  private animateBar(open: boolean, up: boolean, delta: number): Animation {
    const content = this.$('.content');
    const interrupting = this.anim?.playState === 'running';
    const cs = interrupting ? getComputedStyle(this.bar) : null;
    const contentT = interrupting ? getComputedStyle(content).transform : null;
    const closedFrame: Keyframe = {
      clipPath: `inset(0 0 ${delta}px 0 round 4px)`,
      transform: up ? `translateY(${delta}px)` : 'none',
    };
    const openFrame: Keyframe = { clipPath: 'inset(0 0 0 0 round 4px)', transform: 'none' };
    const current: Keyframe | null =
      cs?.clipPath && cs.clipPath !== 'none' ? { clipPath: cs.clipPath, transform: cs.transform || 'none' } : null;
    const timing: KeyframeAnimationOptions = open
      ? { duration: durations.normal, easing: easings.decelerate }
      : { duration: durations.fast, easing: easings.decelerate };
    if (up) {
      const contentClosed = `translateY(${-delta}px)`;
      animate(
        content,
        open
          ? [{ transform: contentT ?? contentClosed }, { transform: 'none' }]
          : [{ transform: contentT ?? 'none' }, { transform: contentClosed }],
        timing,
      );
    }
    return animate(this.bar, open ? [current ?? closedFrame, openFrame] : [current ?? openFrame, closedFrame], timing);
  }

  private open(): void {
    if (this.state === 'open' || this.state === 'opening') return;
    const reopening = this.state === 'closing';
    this.emit('opening', undefined, { bubbles: false });
    const closedH = this.closedHeight();
    this.state = 'opening';
    this.setAttribute('data-state', 'opening');
    this.applyModes(true);
    const openH = this.openHeight();
    let up = this.getAttribute('data-dir') === 'up';
    if (!reopening) {
      const r = this.getBoundingClientRect();
      const { height: vh } = viewportSize();
      const overflowH = this.overflow.classList.contains('empty')
        ? 0
        : Math.min(this.presenter.scrollHeight || 200, 400);
      up = r.top + openH + overflowH + 8 > vh && r.bottom - openH - overflowH > 8;
    }
    this.toggleAttr('data-dir', up, 'up');
    this.bar.style.setProperty('--bar-h', `${openH}px`);
    this.more.setAttribute('aria-expanded', 'true');

    const anim = this.animateBar(true, up, Math.max(0, openH - closedH));
    this.anim?.cancel();
    this.anim = anim;
    if (!reopening) fadeIn(this.$('.open-border'), durations.faster);

    this.popup.open({
      anchor: this,
      position: (size) => this.positionOverflow(size, up, openH),
      lightDismiss: !this.isSticky,
      passThrough: [this],
      restoreFocus: true,
      focus: 'none',
      animateIn: (s) => this.overflowIn(s, up),
      animateOut: (s) => this.overflowOut(s, up),
      onDismiss: () => {
        this.isOpen = false;
        return false;
      },
    });
    void settled(anim).then(() => {
      if (this.state !== 'opening' || this.anim !== anim) return;
      this.state = 'open';
      this.setAttribute('data-state', 'open');
      this.emit('opened', undefined, { bubbles: false });
    });
  }

  private close(): void {
    if (this.state === 'closed' || this.state === 'closing') return;
    this.emit('closing', undefined, { bubbles: false });
    const openH = this.openHeight();
    const closedH = this.closedHeight();
    const up = this.getAttribute('data-dir') === 'up';
    this.state = 'closing';
    this.setAttribute('data-state', 'closing');
    this.more.setAttribute('aria-expanded', 'false');
    void this.popup.close('programmatic');
    const anim = this.animateBar(false, up, Math.max(0, openH - closedH));
    this.anim?.cancel();
    this.anim = anim;
    void settled(anim).then(() => {
      if (this.state !== 'closing' || this.anim !== anim) return;
      this.state = 'closed';
      this.setAttribute('data-state', 'closed');
      this.removeAttribute('data-dir');
      for (const a of this.$('.content').getAnimations()) a.cancel();
      this.applyModes(false);
      this.syncBarHeight();
      this.anim = null;
      this.emit('closed', undefined, { bubbles: false });
    });
  }

  private positionOverflow(size: { width: number; height: number }, up: boolean, openH: number): PositionResult {
    const r = this.getBoundingClientRect();
    const { width: vw, height: vh } = viewportSize();
    const pad = 8;
    const gap = 4;
    const barTop = up ? r.bottom - openH : r.top;
    const barBottom = up ? r.bottom : r.top + openH;
    let x = getComputedStyle(this).direction === 'rtl' ? r.left : r.right - size.width;
    x = Math.max(pad, Math.min(x, vw - pad - size.width));
    let y = up ? barTop - gap - size.height : barBottom + gap;
    y = Math.max(pad, Math.min(y, vh - pad - size.height));
    const maxHeight = up ? barTop - gap - pad : vh - pad - (barBottom + gap);
    return {
      x: Math.round(x),
      y: Math.round(y),
      side: up ? 'top' : 'bottom',
      maxHeight: Math.max(96, maxHeight),
      maxWidth: 480,
    };
  }

  private overflowIn(surface: HTMLElement, up: boolean): Animation {
    const opacity = Number(getComputedStyle(surface).opacity);
    const reopening = surface.getAnimations().length > 0 && opacity > 0 && opacity < 1;
    const a = menuIn(surface, up ? 'top' : 'bottom');
    if (reopening)
      animate(surface, [{ opacity }, { opacity: 1 }], { duration: durations.faster, easing: easings.linear });
    return a;
  }

  private overflowOut(surface: HTMLElement, up: boolean): Animation {
    const cs = getComputedStyle(surface);
    const dy = Math.round(Math.min((surface.offsetHeight || 200) * 0.4, 72));
    const ext = 48;
    const toT = `translateY(${up ? dy : -dy}px)`;
    const toClip = up ? `inset(-${ext}px -${ext}px ${dy}px -${ext}px)` : `inset(${dy}px -${ext}px -${ext}px -${ext}px)`;
    const fromClip = cs.clipPath && cs.clipPath !== 'none' ? cs.clipPath : `inset(-${ext}px)`;
    animate(surface, [{ opacity: Number(cs.opacity) || 0 }, { opacity: 0 }], {
      duration: durations.fast,
      easing: easings.linear,
      fill: 'forwards',
    });
    return animate(
      surface,
      [
        { transform: cs.transform || 'none', clipPath: fromClip },
        { transform: toT, clipPath: toClip },
      ],
      { duration: durations.fast, easing: easings.decelerate, fill: 'forwards' },
    );
  }

  private barStops(): HTMLElement[] {
    const stops = this.primaryCommands.filter(
      (c) => c.slot !== MOVED_SLOT && !c.hidden && c.localName !== 'win-app-bar-separator' && c.tabIndex >= 0,
    ) as HTMLElement[];
    if (!this.more.hidden) stops.push(this.more);
    return stops;
  }

  private overflowItems(): HTMLElement[] {
    return Array.from(this.children).filter(
      (c): c is HTMLElement =>
        c instanceof HTMLElement &&
        (c.slot === 'secondary' || c.slot === MOVED_SLOT) &&
        c.localName !== 'win-app-bar-separator' &&
        !c.hidden &&
        !c.hasAttribute('data-disabled'),
    );
  }

  private focusOverflow(i: number): void {
    const items = this.overflowItems();
    if (!items.length) return;
    items[(i + items.length) % items.length]!.focus();
  }

  private onKey(ev: KeyboardEvent): void {
    const path = ev.composedPath();
    const target = path[0] as HTMLElement;
    const inOverflow = path.includes(this.overflow) || this.overflowItems().includes(ev.target as HTMLElement);
    if (inOverflow) {
      const items = this.overflowItems();
      const cur = items.indexOf(ev.target as HTMLElement);
      if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        const next =
          cur < 0 ? (ev.key === 'ArrowDown' ? 0 : items.length - 1) : cur + (ev.key === 'ArrowDown' ? 1 : -1);
        this.focusOverflow(next);
      } else if (ev.key === 'Home' || ev.key === 'End') {
        ev.preventDefault();
        this.focusOverflow(ev.key === 'Home' ? 0 : items.length - 1);
      } else if (ev.key === 'Tab') {
        ev.preventDefault();
        this.isOpen = false;
        this.more.focus();
      }
      return;
    }
    if (ev.key !== 'ArrowLeft' && ev.key !== 'ArrowRight') return;
    const stops = this.barStops();
    const active = stops.find((s) => s === ev.target || s === target);
    const i = active ? stops.indexOf(active) : -1;
    if (i < 0) return;
    ev.preventDefault();
    const rtl = getComputedStyle(this).direction === 'rtl';
    const dir = (ev.key === 'ArrowRight') !== rtl ? 1 : -1;
    stops[Math.min(stops.length - 1, Math.max(0, i + dir))]?.focus();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-command-bar': WinCommandBar;
  }
}
