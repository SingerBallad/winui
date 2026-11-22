import { WinElement, escapeHtml, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css, focusRing, scrollbars } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { Popup, popupResetCss } from '../../base/popup.ts';
import { isRtl, rafThrottle } from '../../base/dom.ts';
import { animate, durations, easings, menuIn, popupOut, settled } from '../../motion/animate.ts';

const ITEM = 'win-breadcrumb-bar-item';

const itemCss = css`
:host {
  display: inline-flex;
  align-items: center;
  flex: none;
  min-width: 0;
  color: var(--w-text-fill-color-primary);
  font: inherit;
  white-space: nowrap;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}
:host([hidden]), :host([data-collapsed]) { display: none; }
.content {
  display: inline-flex;
  align-items: center;
  border-radius: var(--w-corner-radius-control);
  padding: 1px 3px;
  margin: 0 -3px;
  line-height: max(20px, 1.33em);
  transition: color var(--w-duration-faster) linear;
}
:host([data-last]) .content { transition-duration: var(--w-duration-normal); }
:host(:not([data-last])) .content:hover { color: var(--w-text-fill-color-secondary); }
:host(:not([data-last])) .content:active, :host([data-pressed]) .content { color: var(--w-text-fill-color-tertiary); }
:host([disabled]) { color: var(--w-text-fill-color-disabled); pointer-events: none; }
${focusRing(':host(:focus-visible) .content', 1)}
.chevron {
  display: inline-flex;
  align-items: center;
  padding: 0 2px;
  margin: 0 4px;
  color: var(--w-text-fill-color-primary);
}
:host([data-last]) .chevron { display: none; }
:host(:dir(rtl)) .chevron .w-glyph { transform: scaleX(-1); }
`;

export class WinBreadcrumbBarItem extends WinElement {
  static override styles = [itemCss];
  static override template = `<span class="content" part="content"><slot></slot></span><span class="chevron" part="chevron" aria-hidden="true">${glyph('chevronRightMed', 12)}</span>`;
  static override props: PropDefs = {
    disabled: { type: Boolean },
  };
  declare disabled: boolean;

  static {
    this.define(ITEM);
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'listitem');
    this.tabIndex = -1;
    this.$('.content').addEventListener('click', () => {
      if (this.hasAttribute('data-last') || this.disabled) return;
      this.dispatchEvent(
        new CustomEvent('win-crumb-invoke', { bubbles: true, composed: true, detail: { item: this } }),
      );
    });
    this.addEventListener('keydown', (ev) => {
      if (ev.target !== this || this.hasAttribute('data-last')) return;
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        this.dispatchEvent(
          new CustomEvent('win-crumb-invoke', { bubbles: true, composed: true, detail: { item: this } }),
        );
      }
    });
  }

  revealChevron(): void {
    if (!this.isInitialized) return;
    animate(this.$('.chevron'), [{ opacity: 0 }, { opacity: 1 }], { duration: durations.fast, easing: easings.linear });
  }
}

const barCss = css`
:host {
  display: block;
  align-self: stretch;
  justify-self: stretch;
  min-width: 0;
  font: var(--w-type-body);
  color: var(--w-text-fill-color-primary);
  user-select: none;
  -webkit-user-select: none;
}
nav { position: relative; display: block; }
.list {
  display: flex;
  align-items: center;
  flex-wrap: nowrap;
  min-width: 0;
  overflow: hidden;
  margin: 0;
  padding: 0;
}
.fx { position: absolute; inset: 0; overflow: hidden; pointer-events: none; }
.fx > * { position: absolute; }
.chevron-ghost { display: inline-flex; align-items: center; justify-content: center; }
:host(:dir(rtl)) .chevron-ghost .w-glyph { transform: scaleX(-1); }
.ellipsis {
  display: none;
  align-items: center;
  flex: none;
  cursor: default;
  outline: none;
}
.ellipsis.show { display: inline-flex; }
.ellipsis .dots {
  display: inline-flex;
  align-items: center;
  padding: 3px;
  border-radius: var(--w-corner-radius-control);
  font-family: var(--w-font-family-icon);
  font-size: 1em;
  line-height: 1;
  transition: color var(--w-duration-faster) linear;
}
.ellipsis .dots:hover { color: var(--w-text-fill-color-secondary); }
.ellipsis .dots:active { color: var(--w-text-fill-color-tertiary); }
${focusRing('.ellipsis:focus-visible .dots', 1)}
.ellipsis .chevron { display: inline-flex; padding: 0 2px; margin: 0 4px; }
:host(:dir(rtl)) .ellipsis .chevron .w-glyph { transform: scaleX(-1); }
${popupResetCss('.flyout')}
.presenter {
  box-sizing: border-box;
  min-height: 40px;
  max-width: 456px;
  max-height: min(758px, var(--w-popup-max-height, 758px));
  padding: 2px 0;
  overflow-x: hidden;
  overflow-y: auto;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-flyout);
  font: var(--w-type-body);
  user-select: none;
  -webkit-user-select: none;
}
.drop {
  display: flex;
  align-items: center;
  margin: 3px 5px;
  padding: 7px 11px 9px;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-primary);
  white-space: nowrap;
  cursor: default;
  outline: none;
}
.drop:hover, .drop:focus-visible { background: var(--w-subtle-fill-color-secondary); }
.drop:active { background: var(--w-subtle-fill-color-tertiary); }
${focusRing('.drop:focus-visible', 0)}
`;

export interface BreadcrumbItemClickedDetail {
  index: number;
  item: WinBreadcrumbBarItem;
}

interface Box {
  x: number;
  y: number;
  w: number;
  h: number;
}

function translateX(el: Element): number {
  const t = getComputedStyle(el).transform;
  if (!t || t === 'none') return 0;
  try {
    return new DOMMatrixReadOnly(t).m41;
  } catch {
    return 0;
  }
}

const DRIFT = 16;

export class WinBreadcrumbBar extends WinElement {
  static override styles = [scrollbars, barCss];
  static override template = `<nav part="bar"><div class="list" role="list"><span class="ellipsis" part="ellipsis" role="button" tabindex="-1" aria-haspopup="true"><span class="dots">&#xE712;</span><span class="chevron">${glyph('chevronRightMed', 12)}</span></span><slot></slot></div><div class="fx" aria-hidden="true"></div></nav><div class="flyout"><div class="presenter w-scroll" role="menu"></div></div>`;
  static override props: PropDefs = {};

  private popup!: Popup;
  private ro: ResizeObserver | null = null;
  private mo: MutationObserver | null = null;
  private hiddenCount = 0;
  private boxes = new Map<Element, Box>();
  private ellipsisBox: Box | null = null;
  private known = new Set<Element>();
  private collapsed = new Set<Element>();
  private current: Element | null = null;
  private laidOut = false;
  private boxesRtl = false;

  static {
    this.define('win-breadcrumb-bar');
  }

  get items(): WinBreadcrumbBarItem[] {
    return Array.from(this.children).filter((c): c is WinBreadcrumbBarItem => c.localName === ITEM);
  }

  set itemsSource(data: (string | { label: string; [k: string]: unknown })[]) {
    const label = (d: string | { label: string }) => (typeof d === 'string' ? d : d.label);
    const items = this.items as (WinBreadcrumbBarItem & { data?: unknown })[];
    let keep = 0;
    while (
      keep < items.length &&
      keep < data.length &&
      items[keep]!.textContent?.trim() === label(data[keep]!).trim()
    ) {
      items[keep]!.data = data[keep];
      keep++;
    }
    for (const it of items.slice(keep)) it.remove();
    for (const d of data.slice(keep)) {
      const it = document.createElement(ITEM) as WinBreadcrumbBarItem & { data?: unknown };
      it.textContent = label(d);
      it.data = d;
      this.append(it);
    }
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'navigation');
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', 'Breadcrumb');
    const flyout = this.$('.flyout');
    this.popup = new Popup(flyout, this.$('.presenter'));
    const ellipsis = this.$('.ellipsis');
    ellipsis.addEventListener('click', () => this.toggleFlyout(false));
    ellipsis.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ' || ev.key === 'ArrowDown') {
        ev.preventDefault();
        this.toggleFlyout(true);
      } else this.onKey(ev, ellipsis);
    });
    this.addEventListener('win-crumb-invoke', (ev) => {
      ev.stopPropagation();
      const item = (ev as CustomEvent<{ item: WinBreadcrumbBarItem }>).detail.item;
      const index = this.items.indexOf(item);
      if (index >= 0) this.emit<BreadcrumbItemClickedDetail>('itemclicked', { index, item });
    });
    this.addEventListener('keydown', (ev) => {
      const t = ev.composedPath().find((n) => n instanceof Element && n.localName === ITEM) as HTMLElement | undefined;
      if (t) this.onKey(ev, t);
    });
    this.addEventListener('pointerdown', () => this.refreshBoxes(), true);
    this.addEventListener('keydown', () => this.refreshBoxes(), true);
    const relayout = rafThrottle(() => this.relayout());
    this.ro = new ResizeObserver(relayout);
    const observeItems = () => {
      this.ro!.disconnect();
      this.ro!.observe(this);
      for (const it of this.items) this.ro!.observe(it);
    };
    this.mo = new MutationObserver(() => {
      observeItems();
      this.relayout();
    });
    this.mo.observe(this, { childList: true, characterData: true, subtree: true });
    observeItems();
    void document.fonts?.ready.then(() => this.relayout(false));
    this.relayout(false);
  }

  private relayout(animated = true): void {
    const items = this.items;
    const list = this.$('.list');
    const ellipsis = this.$('.ellipsis');
    const lr = list.getBoundingClientRect();
    const rtl = isRtl(this);
    const motion = animated && this.laidOut && this.known.size > 0 && lr.width > 0 && rtl === this.boxesRtl;

    const firstX = new Map<Element, number>();
    if (motion) for (const [el, b] of this.boxes) firstX.set(el, b.x + (el.isConnected ? translateX(el) : 0));
    const prevEllipsis = this.ellipsisBox;
    const prevCurrent = this.current;

    const last = items[items.length - 1] ?? null;
    for (const it of items) {
      it.toggleAttribute('data-last', it === last);
      if (it === last) it.setAttribute('aria-current', 'page');
      else it.removeAttribute('aria-current');
      it.removeAttribute('data-collapsed');
    }
    ellipsis.classList.remove('show');
    this.hiddenCount = 0;
    const avail = list.clientWidth;
    if (avail > 0) {
      const widths = items.map((it) => (it.hidden ? 0 : it.getBoundingClientRect().width));
      let total = widths.reduce((a, b) => a + b, 0);
      if (total > avail + 0.5) {
        ellipsis.classList.add('show');
        total += ellipsis.getBoundingClientRect().width;
        for (let i = 0; i < items.length - 1 && total > avail + 0.5; i++) {
          items[i]!.setAttribute('data-collapsed', '');
          total -= widths[i]!;
          this.hiddenCount = i + 1;
        }
      }
    }

    const active = (this.getRootNode() as Document | ShadowRoot).activeElement;
    if (
      active instanceof Element &&
      active.hasAttribute('data-collapsed') &&
      items.includes(active as WinBreadcrumbBarItem)
    ) {
      ellipsis.tabIndex = 0;
      ellipsis.focus({ preventScroll: true });
    } else if (this.renderRoot.activeElement === ellipsis && !ellipsis.classList.contains('show')) {
      const first = items.find((it) => !it.hidden);
      if (first) {
        first.tabIndex = 0;
        first.focus({ preventScroll: true });
      }
    }

    const { boxes, ellipsisBox } = this.measure(lr);

    if (motion) this.animateLayout(firstX, boxes, prevEllipsis, ellipsisBox, prevCurrent, last);

    this.boxes = boxes;
    this.ellipsisBox = ellipsisBox;
    this.boxesRtl = rtl;
    this.known = new Set(items);
    this.collapsed = new Set(items.filter((it) => it.hasAttribute('data-collapsed')));
    this.current = last;
    this.laidOut = avail > 0;
    this.syncRoving();
  }

  private measure(lr: DOMRect): { boxes: Map<Element, Box>; ellipsisBox: Box | null } {
    const boxes = new Map<Element, Box>();
    for (const it of this.items) {
      if (it.hidden || it.hasAttribute('data-collapsed')) continue;
      const r = it.getBoundingClientRect();
      if (!r.width && !r.height) continue;
      boxes.set(it, { x: r.left - lr.left - translateX(it), y: r.top - lr.top, w: r.width, h: r.height });
    }
    const ellipsis = this.$('.ellipsis');
    let ellipsisBox: Box | null = null;
    if (ellipsis.classList.contains('show')) {
      const r = ellipsis.getBoundingClientRect();
      ellipsisBox = { x: r.left - lr.left - translateX(ellipsis), y: r.top - lr.top, w: r.width, h: r.height };
    }
    return { boxes, ellipsisBox };
  }

  private refreshBoxes(): void {
    if (!this.laidOut) return;
    const lr = this.$('.list').getBoundingClientRect();
    if (!lr.width) return;
    const m = this.measure(lr);
    this.boxes = m.boxes;
    this.ellipsisBox = m.ellipsisBox;
    this.boxesRtl = isRtl(this);
  }

  private animateLayout(
    firstX: Map<Element, number>,
    boxes: Map<Element, Box>,
    prevEllipsis: Box | null,
    ellipsisBox: Box | null,
    prevCurrent: Element | null,
    current: Element | null,
  ): void {
    const trail = isRtl(this) ? -1 : 1;
    const fx = this.$('.fx');
    const start = (x: number, b: Box) => (trail > 0 ? x : x + b.w);

    const glides: [Element, number][] = [];
    const expanding: Element[] = [];
    const arriving: Element[] = [];
    for (const [el, b] of boxes) {
      const prev = this.boxes.get(el);
      const fromX = firstX.get(el);
      if (prev && fromX !== undefined) {
        const dx = start(fromX, prev) - start(b.x, b);
        if (Math.abs(start(prev.x, prev) - start(b.x, b)) >= 0.5) glides.push([el, dx]);
      } else if (this.collapsed.has(el)) expanding.push(el);
      else arriving.push(el);
    }
    const leaving: { el: Element; x: number; y: number; intoEllipsis: boolean }[] = [];
    for (const [el, prev] of this.boxes) {
      if (boxes.has(el)) continue;
      const intoEllipsis = el.isConnected && el.parentElement === this && el.hasAttribute('data-collapsed');
      leaving.push({ el, x: firstX.get(el) ?? prev.x, y: prev.y, intoEllipsis });
    }

    const busy = glides.length > 0;
    const leaveFade = busy ? durations.faster : durations.fast;
    const glideDelay = busy && leaving.length ? durations.faster / 2 : 0;
    const arriveDelay = busy ? durations.faster : 0;
    const out = (el: Element, duration: number = leaveFade) =>
      animate(el, [{ opacity: 1 }, { opacity: 0 }], { duration, easing: easings.linear, fill: 'forwards' });
    const drift = (el: Element, to: string) =>
      animate(el, [{ transform: 'none' }, { transform: to }], {
        duration: durations.normal,
        easing: easings.decelerate,
        fill: 'forwards',
      });
    const settleIn = (el: Element, from: string, delay: number) => {
      const timing = { delay, fill: 'backwards' as const };
      animate(el, [{ transform: from }, { transform: 'none' }], {
        duration: durations.normal,
        easing: easings.decelerate,
        ...timing,
      });
      animate(el, [{ opacity: 0 }, { opacity: 1 }], { duration: durations.fast, easing: easings.linear, ...timing });
    };

    for (const { el, x, y, intoEllipsis } of leaving) {
      const ghost = this.ghostOf(el, x, y);
      if (!ghost) continue;
      const toEllipsis = Math.max(-DRIFT, Math.min(DRIFT, (ellipsisBox?.x ?? 0) - x));
      drift(ghost, intoEllipsis ? `translateX(${toEllipsis}px) scale(0.9)` : `translateX(${DRIFT * trail}px)`);
      void settled(out(ghost)).then(() => ghost.remove());
    }
    for (const [el, dx] of glides) {
      animate(el, [{ transform: `translateX(${dx}px)` }, { transform: 'none' }], {
        duration: durations.normal,
        easing: easings.decelerate,
        delay: glideDelay,
        fill: 'backwards',
      });
    }
    for (const el of expanding) settleIn(el, `translateX(${-DRIFT * trail}px)`, arriveDelay);
    arriving.forEach((el, k) => {
      settleIn(el, `translateX(${DRIFT * trail}px)`, arriveDelay + Math.min(k, 5) * 24);
    });

    if (current && current !== prevCurrent) {
      const prev = this.boxes.get(current);
      const now = boxes.get(current);
      const x = firstX.get(current);
      if (prev && now && x !== undefined && prev.w - now.w > 4) {
        const w = prev.w - now.w;
        const c = document.createElement('span');
        c.className = 'chevron-ghost';
        c.innerHTML = glyph('chevronRightMed', 12);
        Object.assign(c.style, {
          left: `${trail > 0 ? x + prev.w - w : x}px`,
          top: `${prev.y}px`,
          width: `${w}px`,
          height: `${prev.h}px`,
        });
        fx.append(c);
        drift(c, `translateX(${(DRIFT / 2) * trail}px)`);
        void settled(out(c)).then(() => c.remove());
      }
    }
    if (prevCurrent && prevCurrent !== current && boxes.has(prevCurrent) && this.boxes.has(prevCurrent)) {
      (prevCurrent as WinBreadcrumbBarItem).revealChevron?.();
    }

    const ellipsis = this.$('.ellipsis');
    if (ellipsisBox && !prevEllipsis) settleIn(ellipsis, `translateX(${(-DRIFT / 2) * trail}px)`, arriveDelay / 2);
    else if (!ellipsisBox && prevEllipsis) {
      const g = ellipsis.cloneNode(true) as HTMLElement;
      g.removeAttribute('role');
      g.removeAttribute('tabindex');
      g.removeAttribute('aria-haspopup');
      g.classList.add('show');
      g.style.left = `${prevEllipsis.x}px`;
      g.style.top = `${prevEllipsis.y}px`;
      fx.append(g);
      void settled(out(g, durations.faster)).then(() => g.remove());
    }
  }

  private ghostOf(el: Element, x: number, y: number): HTMLElement | null {
    if (el.localName !== ITEM) return null;
    const g = el.cloneNode(true) as HTMLElement;
    for (const n of [g, ...g.querySelectorAll('[id]')]) n.removeAttribute('id');
    for (const a of ['data-collapsed', 'hidden', 'tabindex', 'aria-current']) g.removeAttribute(a);
    g.inert = true;
    g.style.left = `${x}px`;
    g.style.top = `${y}px`;
    this.$('.fx').append(g);
    return g;
  }

  private visibleStops(): HTMLElement[] {
    const stops: HTMLElement[] = [];
    if (this.hiddenCount) stops.push(this.$('.ellipsis'));
    for (const it of this.items) if (!it.hasAttribute('data-collapsed') && !it.hidden) stops.push(it);
    return stops;
  }

  private syncRoving(): void {
    const stops = this.visibleStops();
    const active = stops.find((s) => s.tabIndex === 0) ?? stops[stops.length - 1];
    for (const s of stops) s.tabIndex = s === active ? 0 : -1;
    for (const it of this.items) if (it.hasAttribute('data-collapsed')) it.tabIndex = -1;
    if (!this.hiddenCount) this.$('.ellipsis').tabIndex = -1;
  }

  private onKey(ev: KeyboardEvent, from: HTMLElement): void {
    const stops = this.visibleStops();
    const i = stops.indexOf(from);
    if (i < 0) return;
    const rtl = isRtl(this);
    let to = -1;
    if (ev.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) to = Math.min(stops.length - 1, i + 1);
    else if (ev.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) to = Math.max(0, i - 1);
    else if (ev.key === 'Home') to = 0;
    else if (ev.key === 'End') to = stops.length - 1;
    if (to < 0) return;
    ev.preventDefault();
    for (const s of stops) s.tabIndex = -1;
    stops[to]!.tabIndex = 0;
    stops[to]!.focus();
  }

  private toggleFlyout(keyboard: boolean): void {
    if (this.popup.isOpen) {
      void this.popup.close('programmatic');
      return;
    }
    const presenter = this.$('.presenter');
    const hidden = this.items.slice(0, this.hiddenCount);
    presenter.innerHTML = hidden
      .map((it, i) =>
        it.hidden
          ? ''
          : `<div class="drop" role="menuitem" tabindex="-1" data-i="${i}">${escapeHtml(it.textContent?.trim() ?? '')}</div>`,
      )
      .join('');
    for (const row of presenter.querySelectorAll<HTMLElement>('.drop')) {
      const pick = () => {
        const index = Number(row.dataset.i);
        void this.popup.close('programmatic');
        const item = this.items[index];
        if (item) this.emit<BreadcrumbItemClickedDetail>('itemclicked', { index, item });
      };
      row.addEventListener('click', pick);
      row.addEventListener('keydown', (ev) => {
        const rows = Array.from(presenter.querySelectorAll<HTMLElement>('.drop'));
        const k = rows.indexOf(row);
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          pick();
        } else if (ev.key === 'ArrowDown') {
          ev.preventDefault();
          rows[(k + 1) % rows.length]?.focus();
        } else if (ev.key === 'ArrowUp') {
          ev.preventDefault();
          rows[(k - 1 + rows.length) % rows.length]?.focus();
        } else if (ev.key === 'Home' || ev.key === 'End') {
          ev.preventDefault();
          rows[ev.key === 'Home' ? 0 : rows.length - 1]?.focus();
        }
      });
    }
    const ellipsis = this.$('.ellipsis');
    const first = presenter.querySelector<HTMLElement>('.drop');
    this.popup.open({
      anchor: ellipsis,
      placement: 'bottom-start',
      offset: 4,
      focus: keyboard && first ? first : 'surface',
      animateIn: (s, side) => menuIn(s, side, presenter),
      animateOut: (s) => popupOut(s),
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-breadcrumb-bar': WinBreadcrumbBar;
    'win-breadcrumb-bar-item': WinBreadcrumbBarItem;
  }
}
