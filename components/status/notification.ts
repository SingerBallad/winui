import { WinElement, escapeHtml, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css, focusRing, materialOverrides } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { animate, durations, easings, motionEnabled, settled } from '../../motion/animate.ts';

export type Severity = 'informational' | 'success' | 'warning' | 'error';
export type DismissKind = 'user' | 'expired' | 'programmatic' | 'replaced';

const SEVERITY_COLOR: Record<Severity, string> = {
  informational: 'var(--w-system-fill-color-attention)',
  success: 'var(--w-system-fill-color-success)',
  warning: 'var(--w-system-fill-color-caution)',
  error: 'var(--w-system-fill-color-critical)',
};

export function severityIcon(sev: Severity, size = 16): string {
  const g: Record<Severity, string> = {
    informational:
      '<path d="M8 7.2v4" stroke-width="1.5"/><circle cx="8" cy="5" r=".95" fill="currentColor" stroke="none"/>',
    success: '<path d="M5 8.3l2 2 4-4.3" stroke-width="1.4"/>',
    warning:
      '<path d="M8 4.6v4.2" stroke-width="1.5"/><circle cx="8" cy="11" r=".95" fill="currentColor" stroke="none"/>',
    error: '<path d="M5.6 5.6l4.8 4.8M10.4 5.6l-4.8 4.8" stroke-width="1.4"/>',
  };
  return `<svg width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true" style="flex:none;overflow:visible"><circle cx="8" cy="8" r="8" fill="${SEVERITY_COLOR[sev]}"/><g fill="none" stroke="var(--w-text-fill-color-inverse)" stroke-linecap="round" stroke-linejoin="round" color="var(--w-text-fill-color-inverse)">${g[sev]}</g></svg>`;
}

export interface NotificationStrings {
  dismiss: string;
  more: (n: number) => string;
  showLess: string;
  clearAll: string;
  region: string;
  app: string;
}

const STRINGS_ZH: NotificationStrings = {
  dismiss: '关闭',
  more: (n) => `+${n} 个通知`,
  showLess: '收起',
  clearAll: '全部清除',
  region: '通知',
  app: '应用',
};

const STRINGS_EN: NotificationStrings = {
  dismiss: 'Dismiss',
  more: (n) => `+${n} more`,
  showLess: 'Show less',
  clearAll: 'Clear all',
  region: 'Notifications',
  app: 'App',
};

let stringOverrides: Partial<NotificationStrings> = {};
const liveStacks = new Set<WeakRef<CardStack<StackCard>>>();

export function notificationStrings(): NotificationStrings {
  const zh = (document.documentElement.lang || navigator.language || '').toLowerCase().startsWith('zh');
  return { ...(zh ? STRINGS_ZH : STRINGS_EN), ...stringOverrides };
}

export function setNotificationStrings(strings: Partial<NotificationStrings>): void {
  stringOverrides = { ...stringOverrides, ...strings };
  for (const ref of liveStacks) {
    const s = ref.deref();
    if (s) s.refreshText();
    else liveStacks.delete(ref);
  }
}

function deepActive(): Element | null {
  let a: Element | null = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

function keyboardFocusWithin(el: Element): boolean {
  return el.matches(':focus-within') && !!deepActive()?.matches(':focus-visible');
}

type Edge = 'bottom' | 'top';
type EnterKind = 'front' | 'back' | 'swap' | 'side';
type ExitKind = 'edge' | 'side' | 'fade';

interface StackCard {
  el: HTMLElement;
  inner: HTMLElement;
  leaving: boolean;
  placed: boolean;
  enter: EnterKind;
  gone?: Promise<void>;
}

interface StackHooks {
  edge(): Edge;
  side(): 1 | -1;
  gap: number;
  available(): number;
  prepare?(live: StackCard[]): void;
  changed(): void;
  clearAll(): void;
}

interface Snap {
  transform: string;
  opacity: string;
  height: string;
  inner: string;
}

interface Target {
  x: number;
  y: number;
  s: number;
  o: number;
  h: number;
  io: number;
  z: number;
  mode: 'front' | 'behind' | 'list' | 'hidden';
}

const PEEK = 8;
const PEEK_SCALE = 0.05;
const MAX_PEEK = 2;
const BAR_GAP = 8;
const SUMMARY_H = 32;
const FADE = 28;
const GUTTER = 16;
const INTERACTIVE =
  'button, a[href], input, select, textarea, label, [role="button"], [role="link"], [role="checkbox"], [role="switch"], [contenteditable]:not([contenteditable="false"])';

const tf = (x: number, y: number, s: number) => `translate(${x}px, ${y}px) scale(${s})`;

const stackCss = `
.w-stack { position: relative; height: 0; }
.w-stack-viewport {
  position: absolute;
  left: -${GUTTER}px;
  right: -${GUTTER}px;
  bottom: 0;
  height: 0;
  pointer-events: none;
  --w-fade-near: 0px;
  --w-fade-far: 0px;
}
.w-stack[data-edge="top"] .w-stack-viewport { top: 0; bottom: auto; }
.w-stack-viewport[data-w-scroll] {
  overflow: clip;
  pointer-events: auto;
  touch-action: pan-x pinch-zoom;
  -webkit-mask-image: linear-gradient(to top, transparent 0, #000 var(--w-fade-near), #000 calc(100% - var(--w-fade-far)), transparent 100%);
  mask-image: linear-gradient(to top, transparent 0, #000 var(--w-fade-near), #000 calc(100% - var(--w-fade-far)), transparent 100%);
}
.w-stack[data-edge="top"] .w-stack-viewport[data-w-scroll] {
  -webkit-mask-image: linear-gradient(to bottom, transparent 0, #000 var(--w-fade-near), #000 calc(100% - var(--w-fade-far)), transparent 100%);
  mask-image: linear-gradient(to bottom, transparent 0, #000 var(--w-fade-near), #000 calc(100% - var(--w-fade-far)), transparent 100%);
}
.w-stack-track {
  position: absolute;
  left: ${GUTTER}px;
  right: ${GUTTER}px;
  bottom: 0;
  height: 0;
}
.w-stack[data-edge="top"] .w-stack-track { top: 0; bottom: auto; }
.w-stack-viewport[data-w-scroll] .w-stack-card {
  background: var(--w-acrylic-in-app-fill-color-default-fallback);
  -webkit-backdrop-filter: none;
  backdrop-filter: none;
}
.w-stack-blur {
  position: absolute;
  left: 0;
  right: 0;
  height: ${FADE}px;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--w-duration-fast) linear;
  -webkit-backdrop-filter: blur(4px);
  backdrop-filter: blur(4px);
}
.w-stack-blur[data-side="near"] { bottom: 0; -webkit-mask-image: linear-gradient(to top, #000, transparent); mask-image: linear-gradient(to top, #000, transparent); }
.w-stack-blur[data-side="far"] { top: 0; -webkit-mask-image: linear-gradient(to bottom, #000, transparent); mask-image: linear-gradient(to bottom, #000, transparent); }
.w-stack[data-edge="top"] .w-stack-blur[data-side="near"] { top: 0; bottom: auto; -webkit-mask-image: linear-gradient(to bottom, #000, transparent); mask-image: linear-gradient(to bottom, #000, transparent); }
.w-stack[data-edge="top"] .w-stack-blur[data-side="far"] { bottom: 0; top: auto; -webkit-mask-image: linear-gradient(to top, #000, transparent); mask-image: linear-gradient(to top, #000, transparent); }
.w-stack-viewport[data-w-more-near] .w-stack-blur[data-side="near"],
.w-stack-viewport[data-w-more-far] .w-stack-blur[data-side="far"] { opacity: 1; }
.w-stack-scrollbar {
  position: absolute;
  inset-inline-end: -${GUTTER - 4}px;
  bottom: 0;
  width: 8px;
  height: 0;
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--w-duration-fast) linear;
}
.w-stack[data-edge="top"] .w-stack-scrollbar { top: 0; bottom: auto; }
.w-stack-scrollbar[data-w-on] { opacity: 1; pointer-events: auto; }
.w-stack-thumb {
  position: absolute;
  inset-inline-end: 2px;
  bottom: 0;
  width: 3px;
  min-height: 24px;
  border-radius: 3px;
  background: var(--w-control-strong-fill-color-default);
  transition: width var(--w-duration-faster) var(--w-ease-decelerate);
  touch-action: none;
}
.w-stack[data-edge="top"] .w-stack-thumb { top: 0; bottom: auto; }
.w-stack-scrollbar:hover .w-stack-thumb, .w-stack-thumb[data-w-drag] { width: 6px; }
.w-stack-card {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  box-sizing: border-box;
  overflow: hidden;
  transform-origin: 50% 0;
  pointer-events: auto;
}
.w-stack[data-edge="top"] .w-stack-card { top: 0; bottom: auto; transform-origin: 50% 100%; }
.w-stack-inner { position: relative; box-sizing: border-box; }
.w-stack-card[data-w-hidden], .w-stack-card[data-w-leaving] { pointer-events: none; }
.w-stack-bar {
  position: absolute;
  inset-inline-end: 0;
  bottom: 0;
  display: flex;
  gap: 6px;
  pointer-events: auto;
}
.w-stack[data-edge="top"] .w-stack-bar, .w-stack[data-edge="top"] .w-stack-summary { top: 0; bottom: auto; }
.w-stack-bar[data-w-hidden], .w-stack-summary[data-w-hidden] { pointer-events: none; }
.w-stack-bar button {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  margin: 0;
  padding: 0 8px;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-control);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-tooltip);
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-caption);
  white-space: nowrap;
  cursor: default;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
}
.w-stack-bar button:hover { background-image: linear-gradient(var(--w-subtle-fill-color-secondary), var(--w-subtle-fill-color-secondary)); }
.w-stack-bar button:active {
  background-image: linear-gradient(var(--w-subtle-fill-color-tertiary), var(--w-subtle-fill-color-tertiary));
  color: var(--w-text-fill-color-secondary);
}
.w-stack-bar button[hidden] { display: none; }
${focusRing('.w-stack-bar button:focus-visible', 0)}
.w-stack-toggle svg { transition: rotate var(--w-duration-normal) var(--w-ease-decelerate); }
.w-stack-toggle[aria-expanded="true"] svg { rotate: 180deg; }
.w-stack[data-edge="top"] .w-stack-toggle svg { rotate: 180deg; }
.w-stack[data-edge="top"] .w-stack-toggle[aria-expanded="true"] svg { rotate: 0deg; }
.w-stack-summary {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  height: ${SUMMARY_H}px;
  box-sizing: border-box;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  color: var(--w-text-fill-color-secondary);
  font: var(--w-type-caption);
  pointer-events: none;
  user-select: none;
  -webkit-user-select: none;
}
.w-stack-announcer {
  position: absolute;
  width: 1px;
  height: 1px;
  margin: -1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}
`;

class CardStack<C extends StackCard> {
  readonly cards: C[] = [];
  expanded = false;
  readonly bar = document.createElement('div');
  readonly toggleBtn = document.createElement('button');
  private readonly clearBtn = document.createElement('button');
  private readonly summary = document.createElement('div');
  private readonly polite = document.createElement('div');
  private readonly assertive = document.createElement('div');
  private readonly placedKey = new WeakMap<Element, string>();
  private readonly ro: ResizeObserver;
  private frame = 0;
  private hiddenCount = 0;
  readonly viewport = document.createElement('div');
  readonly track = document.createElement('div');
  private readonly scrollbar = document.createElement('div');
  private readonly thumb = document.createElement('div');
  private scrollMode = false;
  private view = 0;
  private listH = 0;
  private scrollY = 0;
  private scrollTarget = 0;
  private scrollRaf = 0;
  private unclipTimer: ReturnType<typeof setTimeout> | null = null;
  private readonly slots = new WeakMap<Element, { off: number; h: number }>();

  constructor(
    readonly root: HTMLElement,
    private readonly hooks: StackHooks,
  ) {
    root.classList.add('w-stack');
    this.bar.className = 'w-stack-bar';
    this.toggleBtn.className = 'w-stack-toggle';
    this.toggleBtn.type = 'button';
    this.toggleBtn.setAttribute('aria-expanded', 'false');
    this.toggleBtn.innerHTML = `<span class="w-stack-label"></span>${glyph('chevronUp', 12)}`;
    this.clearBtn.className = 'w-stack-clear';
    this.clearBtn.type = 'button';
    this.clearBtn.hidden = true;
    this.bar.append(this.toggleBtn, this.clearBtn);
    this.summary.className = 'w-stack-summary';
    for (const el of [this.bar, this.summary]) {
      el.style.opacity = '0';
      el.toggleAttribute('data-w-hidden', true);
      el.inert = true;
    }
    this.polite.className = this.assertive.className = 'w-stack-announcer';
    this.polite.setAttribute('role', 'status');
    this.assertive.setAttribute('role', 'alert');
    for (const r of [this.polite, this.assertive]) {
      r.setAttribute('aria-atomic', 'false');
      r.setAttribute('aria-relevant', 'additions');
    }
    this.viewport.className = 'w-stack-viewport';
    this.track.className = 'w-stack-track';
    const blurNear = document.createElement('div');
    const blurFar = document.createElement('div');
    blurNear.className = blurFar.className = 'w-stack-blur';
    blurNear.dataset.side = 'near';
    blurFar.dataset.side = 'far';
    this.viewport.append(this.track, blurNear, blurFar);
    this.scrollbar.className = 'w-stack-scrollbar';
    this.scrollbar.setAttribute('aria-hidden', 'true');
    this.thumb.className = 'w-stack-thumb';
    this.scrollbar.append(this.thumb);
    root.append(this.viewport, this.scrollbar, this.summary, this.bar, this.polite, this.assertive);
    this.wireScrolling();
    this.toggleBtn.addEventListener('click', () => this.setExpanded(!this.expanded));
    this.clearBtn.addEventListener('click', () => hooks.clearAll());
    root.addEventListener('click', (ev) => this.onClick(ev));
    root.addEventListener(
      'keydown',
      (ev) => {
        if (ev.key !== 'Escape' || !this.expanded) return;
        ev.stopPropagation();
        this.setExpanded(false);
      },
      true,
    );
    this.ro = new ResizeObserver(() => this.schedule());
    this.ro.observe(root);
    liveStacks.add(new WeakRef(this as unknown as CardStack<StackCard>));
    this.refreshText();
  }

  live(): C[] {
    return this.cards.filter((c) => !c.leaving);
  }

  announce(text: string, urgent = false): void {
    const region = urgent ? this.assertive : this.polite;
    const line = document.createElement('div');
    line.textContent = text.replace(/\s+/g, ' ').trim();
    if (!line.textContent) return;
    region.append(line);
    while (region.childElementCount > 3) region.firstElementChild!.remove();
  }

  add(card: C, at: 'front' | 'back', enter: EnterKind): void {
    card.el.classList.add('w-stack-card');
    card.inner.classList.add('w-stack-inner');
    card.enter = enter;
    card.placed = false;
    card.leaving = false;
    if (at === 'front') {
      this.cards.unshift(card);
      this.track.prepend(card.el);
    } else {
      this.cards.push(card);
      this.track.append(card.el);
    }
    this.ro.observe(card.inner);
    this.layout();
  }

  remove(card: C, how: ExitKind, relayout = true): Promise<void> {
    if (card.leaving) return card.gone ?? Promise.resolve();
    const hadFocus = keyboardFocusWithin(card.el);
    card.leaving = true;
    const el = card.el;
    let a: Animation | null = null;
    if (card.placed && el.isConnected) {
      const cs = getComputedStyle(el);
      const from = cs.transform === 'none' ? tf(0, 0, 1) : cs.transform;
      const h = `${el.offsetHeight}px`;
      const dir = this.hooks.edge() === 'bottom' ? -1 : 1;
      const tail =
        how === 'edge'
          ? `translate(0px, ${-dir * 32}px)`
          : how === 'side'
            ? `translate(${this.hooks.side() * 72}px, 0px)`
            : 'scale(0.94)';
      a = animate(
        el,
        [
          { transform: from, opacity: cs.opacity, height: h },
          { transform: `${from} ${tail}`, opacity: '0', height: h },
        ],
        { duration: durations.fast, easing: easings.decelerate, fill: 'forwards' },
      );
    }
    el.toggleAttribute('data-w-leaving', true);
    el.inert = true;
    if (relayout) this.layout();
    if (hadFocus) this.rescueFocus(true);
    card.gone = settled(a).then(() => {
      el.remove();
      this.ro.unobserve(card.inner);
      const i = this.cards.indexOf(card);
      if (i >= 0) this.cards.splice(i, 1);
      this.hooks.changed();
    });
    return card.gone;
  }

  setExpanded(v: boolean): void {
    const want = v && this.live().length >= 2;
    if (want === this.expanded) return;
    this.expanded = want;
    this.layout();
  }

  refreshText(): void {
    const s = notificationStrings();
    const n = this.live().length;
    (this.toggleBtn.firstElementChild as HTMLElement).textContent = this.expanded
      ? s.showLess
      : s.more(Math.max(1, n - 1));
    this.toggleBtn.setAttribute('aria-expanded', String(this.expanded));
    this.clearBtn.textContent = s.clearAll;
    this.clearBtn.hidden = !this.expanded;
    if (this.hiddenCount > 0) this.summary.textContent = s.more(this.hiddenCount);
  }

  schedule(): void {
    if (this.frame) return;
    this.frame = requestAnimationFrame(() => {
      this.frame = 0;
      if (this.root.isConnected) this.layout();
    });
  }

  layout(): void {
    if (this.frame) {
      cancelAnimationFrame(this.frame);
      this.frame = 0;
    }
    const edge = this.hooks.edge();
    if (this.root.dataset.edge !== edge) this.root.dataset.edge = edge;
    const dir = edge === 'bottom' ? -1 : 1;
    const live = this.live();
    if (live.length < 2) this.expanded = false;
    this.hooks.prepare?.(live);

    const nat = live.map((c) => c.inner.offsetHeight + (c.el.offsetHeight - c.el.clientHeight));
    const snaps = new Map<Element, Snap>();
    for (const c of live) if (c.placed) snaps.set(c.el, this.read(c.el, c.inner));
    snaps.set(this.bar, this.read(this.bar));
    snaps.set(this.summary, this.read(this.summary));
    const barH = this.bar.offsetHeight || 24;
    const width = this.root.offsetWidth;
    const avail = this.hooks.available();

    const targets: Target[] = [];
    let extent: number;
    const shown = live.length;
    let summaryY: number;
    if (!this.expanded) {
      const front = nat[0] ?? 0;
      live.forEach((_, i) => {
        const k = Math.min(i, MAX_PEEK);
        targets.push({
          x: 0,
          y: dir * PEEK * k,
          s: 1 - PEEK_SCALE * k,
          o: i <= MAX_PEEK ? 1 : 0,
          h: front,
          io: i === 0 ? 1 : 0,
          z: live.length - i,
          mode: i === 0 ? 'front' : i <= MAX_PEEK ? 'behind' : 'hidden',
        });
      });
      extent = live.length ? front + PEEK * Math.min(live.length - 1, MAX_PEEK) : 0;
      summaryY = dir * extent;
    } else {
      const gap = this.hooks.gap;
      let off = 0;
      live.forEach((c, i) => {
        targets.push({ x: 0, y: dir * off, s: 1, o: 1, h: nat[i]!, io: 1, z: live.length - i, mode: 'list' });
        this.slots.set(c.el, { off, h: nat[i]! });
        off += nat[i]! + gap;
      });
      const listH = Math.max(0, off - gap);
      const room = Math.max(nat[0] ?? 0, avail - barH - BAR_GAP);
      extent = Math.min(listH, room);
      summaryY = dir * extent;
      this.listH = listH;
      this.view = extent;
    }
    this.hiddenCount = 0;
    void shown;
    const barShown = live.length >= 2;

    let rescue = false;
    live.forEach((c, i) => {
      const t = targets[i]!;
      const interactive = t.mode === 'front' || t.mode === 'list';
      if (!interactive && keyboardFocusWithin(c.inner)) rescue = true;
      c.inner.inert = !interactive;
      c.el.toggleAttribute('data-w-behind', t.mode === 'behind');
      c.el.toggleAttribute('data-w-hidden', t.mode === 'hidden');
      c.el.style.zIndex = String(t.z);
      this.place(c, t, snaps.get(c.el), dir, width);
    });
    if (!barShown && keyboardFocusWithin(this.bar)) rescue = true;
    this.syncScrollMode(this.expanded && this.listH > this.view + 0.5, dir);
    this.placeAux(this.bar, dir * (extent + BAR_GAP), barShown ? 1 : 0, snaps.get(this.bar)!);
    this.placeAux(this.summary, summaryY, this.hiddenCount > 0 ? 1 : 0, snaps.get(this.summary)!);
    this.refreshText();
    if (rescue) this.rescueFocus();
    this.hooks.changed();
  }

  private read(el: HTMLElement, inner?: HTMLElement): Snap {
    const cs = getComputedStyle(el);
    return {
      transform: cs.transform === 'none' ? tf(0, 0, 1) : cs.transform,
      opacity: cs.opacity,
      height: `${el.offsetHeight}px`,
      inner: inner ? getComputedStyle(inner).opacity : '1',
    };
  }

  private place(c: C, t: Target, from: Snap | undefined, dir: number, width: number): void {
    const transform = tf(t.x, t.y, t.s);
    const height = `${t.h}px`;
    const key = `${transform}|${t.o}|${height}|${t.io}`;
    if (this.placedKey.get(c.el) === key) return;
    this.placedKey.set(c.el, key);
    let start = from;
    if (!c.placed) {
      c.placed = true;
      start = this.enterFrom(c.enter, t, dir, width);
    }
    c.el.style.transform = transform;
    c.el.style.opacity = String(t.o);
    c.el.style.height = height;
    c.inner.style.opacity = String(t.io);
    if (!start) return;
    if (start.transform !== transform || start.height !== height) {
      animate(
        c.el,
        [
          { transform: start.transform, height: start.height },
          { transform, height },
        ],
        { duration: durations.slow, easing: easings.decelerate },
      );
    }
    if (Number(start.opacity) !== t.o) {
      animate(c.el, [{ opacity: start.opacity }, { opacity: String(t.o) }], {
        duration: durations.fast,
        easing: easings.linear,
      });
    }
    if (Number(start.inner) !== t.io) {
      animate(c.inner, [{ opacity: start.inner }, { opacity: String(t.io) }], {
        duration: durations.fast,
        delay: t.io ? durations.faster : 0,
        easing: easings.linear,
        fill: 'backwards',
      });
    }
  }

  private enterFrom(kind: EnterKind, t: Target, dir: number, width: number): Snap {
    let { x, y, s } = t;
    switch (kind) {
      case 'front':
        y -= dir * 48;
        break;
      case 'side':
        x = this.hooks.side() * (width + 24);
        break;
      case 'back':
        y += dir * PEEK;
        s = Math.max(0.5, s - PEEK_SCALE);
        break;
      case 'swap':
        y -= dir * 8;
        break;
    }
    return { transform: tf(x, y, s), opacity: '0', height: `${t.h}px`, inner: String(t.io) };
  }

  private placeAux(el: HTMLElement, y: number, o: number, from: Snap): void {
    const transform = `translate(0px, ${y}px)`;
    const key = `${transform}|${o}`;
    const prev = this.placedKey.get(el);
    if (prev === key) return;
    this.placedKey.set(el, key);
    el.toggleAttribute('data-w-hidden', !o);
    el.inert = !o;
    el.style.transform = transform;
    el.style.opacity = String(o);
    if (prev === undefined) return;
    animate(el, [{ transform: from.opacity !== '0' ? from.transform : transform }, { transform }], {
      duration: from.opacity !== '0' ? durations.slow : 0,
      easing: easings.decelerate,
    });
    if (Number(from.opacity) !== o) {
      animate(el, [{ opacity: from.opacity }, { opacity: String(o) }], {
        duration: durations.fast,
        easing: easings.linear,
      });
    }
  }

  private get scrollMax(): number {
    return Math.max(0, this.listH - this.view);
  }

  private syncScrollMode(on: boolean, dir: number): void {
    if (this.unclipTimer) {
      clearTimeout(this.unclipTimer);
      this.unclipTimer = null;
    }
    if (on) {
      this.scrollMode = true;
      this.viewport.toggleAttribute('data-w-scroll', true);
      this.viewport.style.height = `${this.view}px`;
      this.scrollbar.style.height = `${this.view}px`;
      this.scrollbar.toggleAttribute('data-w-on', true);
      this.scrollTarget = Math.min(Math.max(this.scrollTarget, 0), this.scrollMax);
      this.scrollY = Math.min(Math.max(this.scrollY, 0), this.scrollMax);
      this.applyScroll(dir);
      return;
    }
    this.scrollbar.removeAttribute('data-w-on');
    if (!this.scrollMode) return;
    this.scrollMode = false;
    if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
    this.scrollRaf = 0;
    const from = getComputedStyle(this.track).transform;
    this.scrollY = this.scrollTarget = 0;
    this.track.style.transform = '';
    if (from && from !== 'none') {
      animate(this.track, [{ transform: from }, { transform: 'none' }], {
        duration: durations.slow,
        easing: easings.decelerate,
      });
    }
    this.viewport.removeAttribute('data-w-more-near');
    this.viewport.removeAttribute('data-w-more-far');
    this.unclipTimer = setTimeout(() => {
      this.unclipTimer = null;
      if (this.scrollMode) return;
      this.viewport.removeAttribute('data-w-scroll');
      this.viewport.style.height = '';
    }, durations.slow + 34);
    void dir;
  }

  private applyScroll(dir = this.hooks.edge() === 'bottom' ? -1 : 1): void {
    const max = this.scrollMax;
    const y = Math.min(Math.max(this.scrollY, 0), max);
    for (const a of this.track.getAnimations()) a.cancel();
    this.track.style.transform = y ? `translateY(${-dir * y}px)` : '';
    const near = y > 0.5;
    const far = y < max - 0.5;
    this.viewport.toggleAttribute('data-w-more-near', near);
    this.viewport.toggleAttribute('data-w-more-far', far);
    this.viewport.style.setProperty('--w-fade-near', near ? `${FADE}px` : '0px');
    this.viewport.style.setProperty('--w-fade-far', far ? `${FADE}px` : '0px');
    const v = this.view;
    const th = Math.max(24, Math.min(v, (v * v) / Math.max(1, this.listH)));
    this.thumb.style.height = `${th}px`;
    const pos = max > 0 ? ((v - th) * y) / max : 0;
    this.thumb.style.transform = `translateY(${dir * pos}px)`;
  }

  scrollListBy(delta: number, smooth = true): void {
    if (!this.scrollMode) return;
    this.scrollTarget = Math.min(Math.max(this.scrollTarget + delta, 0), this.scrollMax);
    if (!smooth || !motionEnabled()) {
      if (this.scrollRaf) cancelAnimationFrame(this.scrollRaf);
      this.scrollRaf = 0;
      this.scrollY = this.scrollTarget;
      this.applyScroll();
      return;
    }
    if (this.scrollRaf) return;
    const step = () => {
      const d = this.scrollTarget - this.scrollY;
      if (Math.abs(d) < 0.5) {
        this.scrollY = this.scrollTarget;
        this.scrollRaf = 0;
      } else {
        this.scrollY += d * 0.32;
        this.scrollRaf = requestAnimationFrame(step);
      }
      this.applyScroll();
    };
    this.scrollRaf = requestAnimationFrame(step);
  }

  private wireScrolling(): void {
    const dirOf = () => (this.hooks.edge() === 'bottom' ? -1 : 1);
    this.viewport.addEventListener(
      'wheel',
      (ev) => {
        if (!this.scrollMode) return;
        ev.preventDefault();
        const px = ev.deltaMode === 1 ? ev.deltaY * 20 : ev.deltaMode === 2 ? ev.deltaY * this.view : ev.deltaY;
        this.scrollListBy(px * dirOf(), Math.abs(px) >= 40);
      },
      { passive: false },
    );
    let drag: { id: number; y: number } | null = null;
    this.viewport.addEventListener('pointerdown', (ev) => {
      if (!this.scrollMode || ev.pointerType === 'mouse') return;
      drag = { id: ev.pointerId, y: ev.clientY };
    });
    this.viewport.addEventListener('pointermove', (ev) => {
      if (!drag || drag.id !== ev.pointerId) return;
      const dy = ev.clientY - drag.y;
      drag.y = ev.clientY;
      this.scrollListBy(dy * -dirOf(), false);
    });
    const endDrag = (ev: PointerEvent) => {
      if (drag?.id === ev.pointerId) drag = null;
    };
    this.viewport.addEventListener('pointerup', endDrag);
    this.viewport.addEventListener('pointercancel', endDrag);
    let thumbDrag: { id: number; y: number } | null = null;
    this.thumb.addEventListener('pointerdown', (ev) => {
      if (!this.scrollMode || ev.button !== 0) return;
      ev.preventDefault();
      ev.stopPropagation();
      this.thumb.setPointerCapture(ev.pointerId);
      thumbDrag = { id: ev.pointerId, y: ev.clientY };
      this.thumb.toggleAttribute('data-w-drag', true);
    });
    this.thumb.addEventListener('pointermove', (ev) => {
      if (!thumbDrag || thumbDrag.id !== ev.pointerId) return;
      const dy = ev.clientY - thumbDrag.y;
      thumbDrag.y = ev.clientY;
      const th = this.thumb.offsetHeight;
      const ratio = this.scrollMax / Math.max(1, this.view - th);
      this.scrollListBy(dy * dirOf() * ratio, false);
    });
    const endThumb = (ev: PointerEvent) => {
      if (thumbDrag?.id !== ev.pointerId) return;
      thumbDrag = null;
      this.thumb.removeAttribute('data-w-drag');
    };
    this.thumb.addEventListener('pointerup', endThumb);
    this.thumb.addEventListener('pointercancel', endThumb);
    this.thumb.addEventListener('lostpointercapture', endThumb);
    this.scrollbar.addEventListener('pointerdown', (ev) => {
      if (!this.scrollMode || ev.target !== this.scrollbar || ev.button !== 0) return;
      ev.preventDefault();
      const r = this.thumb.getBoundingClientRect();
      const towardsFar = dirOf() === -1 ? ev.clientY < r.top : ev.clientY > r.bottom;
      this.scrollListBy((towardsFar ? 1 : -1) * this.view * 0.85);
    });
    this.track.addEventListener('focusin', (ev) => {
      if (!this.scrollMode) return;
      const card = this.cards.find((c) => c.el.contains(ev.target as Node));
      const slot = card && this.slots.get(card.el);
      if (!slot) return;
      const top = slot.off - this.scrollTarget;
      if (top < 0) this.scrollListBy(top);
      else if (top + slot.h > this.view) this.scrollListBy(top + slot.h - this.view);
    });
  }

  private rescueFocus(preferCard = false): void {
    const front = this.live()[0];
    const dismiss = front && !front.inner.inert ? front.inner.querySelector<HTMLElement>('[data-w-dismiss]') : null;
    const toggle = this.bar.inert ? null : this.toggleBtn;
    (preferCard ? (dismiss ?? toggle) : (toggle ?? dismiss))?.focus({ preventScroll: true });
  }

  private onClick(ev: MouseEvent): void {
    if (this.expanded || this.live().length < 2) return;
    const path = ev.composedPath();
    const card = this.cards.find((c) => !c.leaving && path.includes(c.el));
    if (!card) return;
    for (const n of path) {
      if (n === card.el) break;
      if (n instanceof Element && n.matches(INTERACTIVE)) return;
    }
    this.setExpanded(true);
  }
}

const ianCss = css`
:host {
  position: absolute;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 10;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 16px;
  pointer-events: none;
  box-sizing: border-box;
}
:host([placement="top"]) { top: 0; bottom: auto; }
:host([fixed]) { position: fixed; z-index: 2147482000; }
.stack { width: 100%; max-width: var(--w-ian-max-width, 600px); }
${stackCss}
.card {
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-flyout);
  color: var(--w-text-fill-color-primary);
  user-select: none;
  -webkit-user-select: none;
}
.inner {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 46px;
  padding-block: 8px;
  padding-inline: 16px 8px;
}
.strip {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: 3px;
  background: var(--sev, var(--w-accent-fill-color-default));
  display: none;
}
.card[data-sev] .strip { display: block; }
.icon { display: none; flex: none; }
.card[data-sev] .icon { display: inline-flex; }
.body { flex: 1; min-width: 0; display: flex; flex-wrap: wrap; align-items: center; gap: 4px 12px; padding: 4px 0; }
.title { font: var(--w-type-body-strong); }
.title:empty { display: none; }
.message { font: var(--w-type-body); overflow-wrap: anywhere; min-width: 0; }
::slotted([data-w-ian-content]) { display: block; }
.actions { display: flex; gap: 8px; align-items: center; }
:host(:not([data-w-has-actions])) .actions { display: none; }
.close {
  display: inline-grid;
  place-items: center;
  flex: none;
  width: 32px;
  height: 32px;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: var(--w-text-fill-color-primary);
  padding: 0;
  outline: none;
}
.close:hover { background: var(--w-subtle-fill-color-secondary); }
.close:active { background: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-secondary); }
${focusRing('.close:focus-visible', 0)}
:host([no-dismiss-button]) .close { display: none; }
.progress {
  position: absolute;
  left: 0; bottom: 0;
  height: 2px;
  width: 100%;
  transform-origin: 0 50%;
  background: var(--sev, var(--w-accent-fill-color-default));
  opacity: 0.6;
  display: none;
}
:host(:dir(rtl)) .progress { transform-origin: 100% 50%; }
:host([show-progress]) .card[data-timed] .progress { display: block; }
`;

interface IanCard extends StackCard {
  id: number;
  wrapper: HTMLElement;
  meter: HTMLElement;
  duration: number;
  remaining: number;
  startedAt: number;
  timer: ReturnType<typeof setTimeout> | null;
  progress: Animation | null;
}

export class WinInAppNotification extends WinElement {
  static override styles = [ianCss, css`${materialOverrides('.card')}`];
  static override materialPart = '.card';
  static override template = `<div class="stack" part="stack"></div><div class="park" hidden><slot name="actions"></slot></div>`;
  static override props: PropDefs = {
    placement: { type: String, reflect: true, default: 'bottom' },
    stackMode: { type: String, attribute: 'stack-mode', default: 'replace' },
    severity: { type: String, reflect: true },
    header: { type: String },
    duration: { type: Number, default: 0 },
    noDismissButton: { type: Boolean, attribute: 'no-dismiss-button' },
    showProgress: { type: Boolean, attribute: 'show-progress' },
    fixed: { type: Boolean },
  };
  declare placement: 'bottom' | 'top';
  declare stackMode: 'replace' | 'stack-in-front' | 'queue-behind';
  declare severity: Severity | '';
  declare header: string;
  declare duration: number;
  declare noDismissButton: boolean;
  declare showProgress: boolean;
  declare fixed: boolean;

  private stack: CardStack<IanCard> | null = null;
  private actionsSlot!: HTMLSlotElement;
  private park!: HTMLElement;
  private seq = 0;
  private pending: [string | Node | null | undefined, number | undefined][] = [];

  static {
    this.define('win-in-app-notification');
  }

  get isOpen(): boolean {
    return !!this.stack?.live().length;
  }

  get count(): number {
    return this.stack?.live().length ?? 0;
  }

  get stackExpanded(): boolean {
    return !!this.stack?.expanded;
  }
  set stackExpanded(v: boolean) {
    this.stack?.setExpanded(v);
  }

  protected override firstConnected(): void {
    const root = this.$('.stack');
    this.actionsSlot = this.$<HTMLSlotElement>('slot[name="actions"]');
    this.park = this.$('.park');
    this.actionsSlot.addEventListener('slotchange', () =>
      this.toggleAttr('data-w-has-actions', this.actionsSlot.assignedNodes().length > 0),
    );
    this.stack = new CardStack<IanCard>(root, {
      edge: () => (this.placement === 'top' ? 'top' : 'bottom'),
      side: () => (getComputedStyle(this).direction === 'rtl' ? -1 : 1),
      gap: 8,
      available: () => this.availableHeight(),
      prepare: (live) => this.moveActions(live[0] as IanCard | undefined),
      changed: () => this.sync(),
      clearAll: () => this.dismissAll('user'),
    });
    const later = () => setTimeout(() => this.sync());
    for (const t of ['pointerenter', 'pointerleave', 'focusin', 'focusout']) root.addEventListener(t, later);
    root.addEventListener('keydown', (ev) => {
      if (ev.key !== 'Escape') return;
      const path = ev.composedPath();
      const card = this.stack?.live().find((c) => path.includes(c.el));
      if (!card) return;
      ev.stopPropagation();
      this.dismissCard(card, 'user');
    });
    for (const [c, d] of this.pending.splice(0)) this.show(c, d);
  }

  protected override connected(): void {
    this.sync();
  }

  protected override disconnected(): void {
    for (const c of this.stack?.live() ?? []) this.pauseTimer(c);
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('placement') && !first) this.stack?.layout();
  }

  show(content?: string | Node | null, duration?: number): void {
    const stack = this.stack;
    if (!stack) {
      this.pending.push([content, duration]);
      return;
    }
    const live = stack.live();
    if (!live.length && !this.emit('opening', undefined, { cancelable: true })) return;
    const card = this.createCard(content ?? null, duration ?? this.duration ?? 0);
    stack.announce(
      `${this.header ?? ''} ${card.wrapper.textContent ?? ''}`,
      this.severity === 'error' || this.severity === 'warning',
    );
    if (!live.length) {
      stack.add(card, 'front', 'front');
      this.emit('opened');
    } else if (this.stackMode === 'queue-behind') {
      stack.add(card, 'back', 'back');
    } else if (this.stackMode === 'stack-in-front') {
      stack.add(card, 'front', 'front');
    } else {
      this.close(live[0]!, 'replaced', 'fade', false);
      stack.add(card, 'front', 'swap');
    }
  }

  dismiss(reason: DismissKind = 'programmatic'): void {
    const front = this.stack?.live()[0];
    if (front) this.dismissCard(front, reason);
  }

  dismissAll(reason: DismissKind = 'programmatic'): void {
    for (const c of this.stack?.live() ?? []) this.dismissCard(c, reason);
  }

  private dismissCard(c: IanCard, reason: DismissKind): void {
    const stack = this.stack;
    if (!stack || c.leaving) return;
    if (!this.emit('closing', { reason }, { cancelable: true })) return;
    if (c.leaving) return;
    const how: ExitKind = stack.expanded ? 'side' : c === stack.live()[0] ? 'edge' : 'fade';
    this.close(c, reason, how);
  }

  private close(c: IanCard, reason: DismissKind, how: ExitKind, relayout = true): void {
    if (!this.stack || c.leaving) return;
    this.pauseTimer(c);
    void this.stack.remove(c, how, relayout).then(() => {
      c.wrapper.remove();
      this.emit('closed', { reason });
    });
  }

  private templateNodes(): Node[] {
    return Array.from(this.childNodes).filter((n) => !(n instanceof Element && n.hasAttribute('slot')));
  }

  private createCard(content: string | Node | null, duration: number): IanCard {
    const id = ++this.seq;
    const slot = `w-ian-${id}`;
    const wrapper = document.createElement('div');
    wrapper.slot = slot;
    wrapper.setAttribute('data-w-ian-content', '');
    if (content === null) for (const n of this.templateNodes()) wrapper.append(n.cloneNode(true));
    else if (typeof content === 'string') wrapper.textContent = content;
    else wrapper.append(content);
    this.append(wrapper);

    const sev = (this.severity || '') as Severity | '';
    const el = document.createElement('div');
    el.className = 'card';
    el.setAttribute('part', 'notification');
    if (sev) {
      el.dataset.sev = sev;
      el.style.setProperty('--sev', SEVERITY_COLOR[sev]);
    }
    const ms = Math.max(0, Number(duration) || 0);
    el.toggleAttribute('data-timed', ms > 0);
    el.innerHTML = `<div class="inner" part="notification-content"><span class="strip" part="strip"></span><span class="icon" part="icon">${sev ? severityIcon(sev) : ''}</span><div class="body" part="body"><span class="title" part="title">${escapeHtml(this.header ?? '')}</span><span class="message" part="message"><slot name="${slot}"></slot></span><span class="actions" part="actions"></span></div><button class="close" part="dismiss-button" data-w-dismiss aria-label="${escapeHtml(notificationStrings().dismiss)}">${glyph('cancel', 12)}</button><span class="progress" part="progress"></span></div>`;
    const card: IanCard = {
      el,
      inner: el.querySelector<HTMLElement>('.inner')!,
      leaving: false,
      placed: false,
      enter: 'front',
      id,
      wrapper,
      meter: el.querySelector<HTMLElement>('.progress')!,
      duration: ms,
      remaining: ms,
      startedAt: 0,
      timer: null,
      progress: null,
    };
    el.querySelector('.close')!.addEventListener('click', () => this.dismissCard(card, 'user'));
    return card;
  }

  private moveActions(front: IanCard | undefined): void {
    const target = front?.inner.querySelector('.actions') ?? this.park;
    if (this.actionsSlot.parentElement !== target) target.append(this.actionsSlot);
  }

  private availableHeight(): number {
    const parent = this.fixed ? null : this.offsetParent;
    const h = parent instanceof HTMLElement && parent !== document.body ? parent.clientHeight : window.innerHeight;
    return Math.max(48, h - 32);
  }

  private sync(): void {
    const stack = this.stack;
    if (!stack) return;
    const live = stack.live();
    const held = stack.root.matches(':hover') || keyboardFocusWithin(stack.root);
    const paused = !this.isConnected || held;
    live.forEach((c, i) => {
      if (i === 0 && !paused) this.startTimer(c);
      else this.pauseTimer(c);
    });
    this.toggleAttr('data-w-open', stack.cards.length > 0);
    if (held && live.length && this.isConnected && !this.recheck) {
      this.recheck = setTimeout(() => {
        this.recheck = 0;
        this.sync();
      }, 1000);
    }
  }

  private recheck: ReturnType<typeof setTimeout> | 0 = 0;

  private startTimer(c: IanCard): void {
    if (c.timer || c.leaving || c.duration <= 0 || c.remaining <= 0) return;
    c.startedAt = performance.now();
    c.timer = setTimeout(() => {
      c.timer = null;
      c.remaining = 0;
      this.dismissCard(c, 'expired');
    }, c.remaining);
    if (!c.progress) {
      c.progress = c.meter.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
        duration: c.duration,
        easing: 'linear',
        fill: 'forwards',
      });
      c.progress.currentTime = c.duration - c.remaining;
    } else c.progress.play();
  }

  private pauseTimer(c: IanCard): void {
    if (c.timer) {
      clearTimeout(c.timer);
      c.timer = null;
      c.remaining = Math.max(0, c.remaining - (performance.now() - c.startedAt));
    }
    if (c.progress?.playState === 'running') c.progress.pause();
  }
}

export interface ToastAction {
  label: string;
  accent?: boolean;
  onClick?: () => void;
}

export interface ToastOptions {
  title?: string;
  message?: string;
  appName?: string;
  severity?: Severity;
  icon?: string;
  image?: string;
  actions?: ToastAction[];
  duration?: number;
  position?: 'bottom-right' | 'bottom-left' | 'top-right' | 'top-left';
  onDismiss?: (reason: DismissKind) => void;
}

export interface ToastHandle {
  readonly element: HTMLElement;
  dismiss(): void;
}

const toastCss = `
.w-toast-host {
  position: fixed; inset: auto; margin: 0; padding: 0; border: 0; background: transparent; overflow: visible;
  width: 364px; max-width: calc(100vw - 24px); height: 0; min-height: 0;
  z-index: 2147483000; pointer-events: none; color: var(--w-text-fill-color-primary);
}
.w-toast-host[data-pos^="bottom"] { bottom: 12px; }
.w-toast-host[data-pos^="top"] { top: 12px; }
.w-toast-host[data-pos$="right"] { right: 12px; }
.w-toast-host[data-pos$="left"] { left: 12px; }
.w-toast-host .w-stack { width: 100%; }
${stackCss}
.w-toast {
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-dialog); color: var(--w-text-fill-color-primary); font: var(--w-type-body);
  outline: none; user-select: none; -webkit-user-select: none;
}
.w-toast-inner { display: flex; flex-direction: column; gap: 8px; padding: 12px 12px 16px 16px; }
.w-toast-head { display: flex; align-items: center; gap: 8px; font: var(--w-type-caption); color: var(--w-text-fill-color-secondary); min-height: 24px; }
.w-toast-head .w-toast-app { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.w-toast-x { display: inline-grid; place-items: center; width: 28px; height: 24px; border: 0; padding: 0; border-radius: 4px; background: transparent; color: var(--w-text-fill-color-secondary); outline: none; }
.w-toast-x:hover { background: var(--w-subtle-fill-color-secondary); color: var(--w-text-fill-color-primary); }
.w-toast-x:active { background: var(--w-subtle-fill-color-tertiary); }
.w-toast-x:focus-visible { outline: 2px solid var(--w-focus-stroke-color-outer); outline-offset: -2px; }
.w-toast-main { display: flex; gap: 12px; align-items: flex-start; }
.w-toast-text { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 2px; }
.w-toast-title { font: var(--w-type-body-strong); overflow-wrap: anywhere; }
.w-toast-msg { color: var(--w-text-fill-color-secondary); overflow-wrap: anywhere; }
.w-toast-img { width: 48px; height: 48px; border-radius: 4px; object-fit: cover; flex: none; }
.w-toast-actions { display: flex; gap: 8px; margin-top: 4px; padding-right: 4px; }
.w-toast-actions button {
  flex: 1 1 0; min-width: 0; min-height: 32px; padding: 5px 11px 6px; font: var(--w-type-body);
  border: 1px solid; border-color: var(--w-control-elevation-border); border-radius: 4px;
  background: var(--w-control-fill-color-default); background-clip: padding-box; color: var(--w-text-fill-color-primary);
  outline: none; transition: background-color 83ms linear;
}
.w-toast-actions button:hover { background-color: var(--w-control-fill-color-secondary); }
.w-toast-actions button:active { background-color: var(--w-control-fill-color-tertiary); border-color: var(--w-control-stroke-color-default); color: var(--w-text-fill-color-secondary); }
.w-toast-actions button.accent { background-color: var(--w-accent-fill-color-default); border-color: var(--w-accent-control-elevation-border); color: var(--w-text-on-accent-fill-color-primary); }
.w-toast-actions button.accent:hover { background-color: var(--w-accent-fill-color-secondary); }
.w-toast-actions button.accent:active { background-color: var(--w-accent-fill-color-tertiary); color: var(--w-text-on-accent-fill-color-secondary); }
.w-toast-actions button:focus-visible { outline: 2px solid var(--w-focus-stroke-color-outer); outline-offset: 1px; box-shadow: 0 0 0 1px var(--w-focus-stroke-color-inner); }
.w-toast-bar { position: absolute; left: 0; bottom: 0; height: 2px; width: 100%; transform-origin: 0 50%; background: var(--w-accent-fill-color-default); opacity: 0.55; }
`;

interface ToastCard extends StackCard {
  host: ToastHostState;
  opts: ToastOptions;
  meter: HTMLElement | null;
  duration: number;
  remaining: number;
  startedAt: number;
  timer: ReturnType<typeof setTimeout> | null;
  progress: Animation | null;
}

interface ToastHostState {
  el: HTMLElement;
  stack: CardStack<ToastCard>;
  recheck?: ReturnType<typeof setTimeout> | 0;
}

let toastStyleInstalled = false;
const hosts = new Map<string, ToastHostState>();

function toastHost(pos: string): ToastHostState {
  if (!toastStyleInstalled) {
    toastStyleInstalled = true;
    const st = document.createElement('style');
    st.id = 'winui-toast';
    st.textContent = toastCss;
    document.head.append(st);
    window.addEventListener('resize', () => {
      for (const h of hosts.values()) h.stack.schedule();
    });
  }
  let host = hosts.get(pos);
  if (!host?.el.isConnected) {
    const el = document.createElement('div');
    el.className = 'w-toast-host';
    el.dataset.pos = pos;
    el.setAttribute('role', 'region');
    el.setAttribute('aria-label', notificationStrings().region);
    if (typeof el.showPopover === 'function') el.setAttribute('popover', 'manual');
    const root = document.createElement('div');
    el.append(root);
    document.body.append(el);
    const stack = new CardStack<ToastCard>(root, {
      edge: () => (pos.startsWith('top') ? 'top' : 'bottom'),
      side: () => (pos.endsWith('left') ? -1 : 1),
      gap: 12,
      available: () => Math.min(window.innerHeight - 24, Math.round(window.innerHeight * 0.8)),
      changed: () => syncToasts(state),
      clearAll: () => {
        for (const c of state.stack.live()) dismissToast(c, 'user');
      },
    });
    const state: ToastHostState = { el, stack };
    const later = () => setTimeout(() => syncToasts(state));
    for (const t of ['pointerenter', 'pointerleave', 'focusin', 'focusout']) root.addEventListener(t, later);
    hosts.set(pos, state);
    host = state;
  }
  if (host.el.hasAttribute('popover') && !host.el.matches(':popover-open')) host.el.showPopover();
  return host;
}

function syncToasts(h: ToastHostState): void {
  if (!h.stack) return;
  const paused = h.stack.root.matches(':hover') || keyboardFocusWithin(h.stack.root);
  const live = h.stack.live();
  for (const c of live) {
    if (paused) pauseToast(c);
    else startToast(c);
  }
  if (!h.stack.cards.length && h.el.hasAttribute('popover') && h.el.matches(':popover-open')) h.el.hidePopover();
  if (paused && live.length && !h.recheck) {
    h.recheck = setTimeout(() => {
      h.recheck = 0;
      syncToasts(h);
    }, 1000);
  }
}

function startToast(c: ToastCard): void {
  if (c.timer || c.leaving || c.duration <= 0 || c.remaining <= 0) return;
  c.startedAt = performance.now();
  c.timer = setTimeout(() => {
    c.timer = null;
    c.remaining = 0;
    dismissToast(c, 'expired');
  }, c.remaining);
  if (!c.meter) return;
  if (!c.progress) {
    c.progress = c.meter.animate([{ transform: 'scaleX(1)' }, { transform: 'scaleX(0)' }], {
      duration: c.duration,
      easing: 'linear',
      fill: 'forwards',
    });
    c.progress.currentTime = c.duration - c.remaining;
  } else c.progress.play();
}

function pauseToast(c: ToastCard): void {
  if (c.timer) {
    clearTimeout(c.timer);
    c.timer = null;
    c.remaining = Math.max(0, c.remaining - (performance.now() - c.startedAt));
  }
  if (c.progress?.playState === 'running') c.progress.pause();
}

function dismissToast(c: ToastCard, reason: DismissKind): void {
  if (c.leaving) return;
  pauseToast(c);
  void c.host.stack.remove(c, 'side').then(() => c.opts.onDismiss?.(reason));
}

export function showToast(opts: ToastOptions): ToastHandle {
  const pos = opts.position ?? 'bottom-right';
  const host = toastHost(pos);
  const s = notificationStrings();
  const el = document.createElement('div');
  el.className = 'w-toast';
  el.tabIndex = -1;
  const appIcon = opts.severity
    ? severityIcon(opts.severity, 16)
    : opts.icon?.trim().startsWith('<')
      ? opts.icon
      : `<span class="w-icon" style="font-size:16px">${escapeHtml(opts.icon ?? '')}</span>`;
  el.innerHTML = `<div class="w-toast-inner">
    <div class="w-toast-head">${appIcon}<span class="w-toast-app">${escapeHtml(opts.appName ?? (document.title || s.app))}</span>
      <button class="w-toast-x" type="button" data-w-dismiss aria-label="${escapeHtml(s.dismiss)}">${glyph('cancel', 12)}</button></div>
    <div class="w-toast-main">
      <div class="w-toast-text">${opts.title ? `<span class="w-toast-title">${escapeHtml(opts.title)}</span>` : ''}${opts.message ? `<span class="w-toast-msg">${escapeHtml(opts.message)}</span>` : ''}</div>
      ${opts.image ? `<img class="w-toast-img" alt="" src="${escapeHtml(opts.image)}">` : ''}
    </div>
    ${opts.actions?.length ? `<div class="w-toast-actions">${opts.actions.map((a, i) => `<button type="button" data-i="${i}" class="${a.accent ? 'accent' : ''}">${escapeHtml(a.label)}</button>`).join('')}</div>` : ''}
    <span class="w-toast-bar"></span></div>`;
  const duration = Math.max(0, opts.duration ?? 6000);
  const meter = el.querySelector<HTMLElement>('.w-toast-bar');
  if (duration <= 0) meter?.remove();
  const card: ToastCard = {
    el,
    inner: el.querySelector<HTMLElement>('.w-toast-inner')!,
    leaving: false,
    placed: false,
    enter: 'side',
    host,
    opts,
    meter: duration > 0 ? meter : null,
    duration,
    remaining: duration,
    startedAt: 0,
    timer: null,
    progress: null,
  };
  el.querySelector('.w-toast-x')!.addEventListener('click', () => dismissToast(card, 'user'));
  for (const b of el.querySelectorAll<HTMLButtonElement>('.w-toast-actions button')) {
    b.addEventListener('click', () => {
      if (card.leaving) return;
      opts.actions?.[Number(b.dataset.i)]?.onClick?.();
      dismissToast(card, 'user');
    });
  }
  el.addEventListener('keydown', (ev) => {
    if (ev.key === 'Escape') {
      ev.stopPropagation();
      dismissToast(card, 'user');
    }
  });
  host.stack.announce(
    `${opts.title ?? ''} ${opts.message ?? ''}`,
    opts.severity === 'error' || opts.severity === 'warning',
  );
  host.stack.add(card, 'front', 'side');
  return { element: el, dismiss: () => dismissToast(card, 'programmatic') };
}

declare global {
  interface HTMLElementTagNameMap {
    'win-in-app-notification': WinInAppNotification;
  }
}
