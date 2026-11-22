import { WinElement, escapeHtml, type PropDefs } from '../../base/element.ts';
import { scrollIntoViewWithin } from '../../base/dom.ts';
import { css, focusRing } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { isRtl } from '../../base/dom.ts';
import { slideIn } from '../../motion/animate.ts';
import { travelIndicator } from './shared.ts';

const ITEM = 'win-pivot-item';

try {
  CSS.registerProperty?.({ name: '--w-pivot-hold', syntax: '<length>', inherits: false, initialValue: '0px' });
} catch {}

export class WinPivotItem extends WinElement {
  static override styles = [
    css`
      :host { display: block; margin: 0 12px; min-width: 0; }
      :host(:not([data-active])) { display: none; }
    `,
  ];
  static override template = `<slot></slot>`;
  static override props: PropDefs = {
    header: { type: String },
    disabled: { type: Boolean },
  };
  declare header: string;
  declare disabled: boolean;
  static {
    this.define(ITEM);
  }
  protected override firstConnected(): void {
    this.setAttribute('role', 'tabpanel');
  }
  protected override updated(changed: Set<string>): void {
    if (changed.has('header') || changed.has('disabled')) {
      this.dispatchEvent(new CustomEvent('win-pivot-change', { bubbles: true, composed: true }));
    }
  }
}

const pivotCss = css`
:host {
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  --pv-base-high: rgb(from var(--w-text-fill-color-primary) r g b / 1);
  --pv-base-mh: rgb(from var(--w-text-fill-color-primary) r g b / 0.8);
  --pv-base-medium: rgb(from var(--w-text-fill-color-primary) r g b / 0.6);
  --pv-base-ml: rgb(from var(--w-text-fill-color-primary) r g b / 0.4);
}
.title {
  margin: 14px 0 13px 12px;
  font: 600 15px/20px var(--w-font-family-text);
}
.title:empty { display: none; }
.header-row { position: relative; display: flex; align-items: stretch; min-width: 0; }
.headers {
  position: relative;
  display: flex;
  flex: 1 1 auto;
  min-width: 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  scroll-behavior: smooth;
}
:host([data-overflow]) .headers {
  --pv-hl: min(var(--w-pivot-hold, 0px), var(--pv-fade-l, 0px));
  --pv-hr: min(var(--w-pivot-hold, 0px), var(--pv-fade-r, 0px));
  --pv-mask: linear-gradient(to right,
    transparent var(--pv-hl),
    #000 calc(var(--pv-hl) + var(--pv-fade-l, 0px)),
    #000 calc(100% - var(--pv-hr) - var(--pv-fade-r, 0px)),
    transparent calc(100% - var(--pv-hr)));
  -webkit-mask-image: var(--pv-mask);
  mask-image: var(--pv-mask);
  transition: --w-pivot-hold var(--w-duration-faster) linear;
}
:host([data-overflow]) .header-row:hover .headers { --w-pivot-hold: 28px; }
.headers::-webkit-scrollbar { display: none; }
.h {
  position: relative;
  display: inline-flex;
  align-items: center;
  flex: none;
  height: 48px;
  padding: 0 12px;
  font: 300 24px/32px var(--w-font-family-display);
  letter-spacing: -0.025em;
  color: var(--pv-base-medium);
  white-space: nowrap;
  cursor: default;
  user-select: none;
  outline: none;
  background: transparent;
  border: 0;
}
.h:hover, .h:active { color: var(--pv-base-mh); }
.h[aria-selected="true"] { color: var(--pv-base-high); }
.h[aria-selected="true"]:hover, .h[aria-selected="true"]:active { color: var(--pv-base-mh); }
.h[aria-disabled="true"] { color: var(--pv-base-ml); pointer-events: none; }
${focusRing('.h:focus-visible', 0)}
.pipe {
  position: absolute;
  left: 12px;
  right: 12px;
  bottom: 2px;
  height: 3px;
  border-radius: 1.5px;
  background: var(--w-accent-fill-color-default);
  opacity: 0;
  pointer-events: none;
}
.h[aria-selected="true"] .pipe { opacity: 1; }
.nav {
  position: absolute;
  top: 0;
  bottom: 0;
  z-index: 1;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 28px;
  height: 36px;
  margin: auto 0;
  padding: 0;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background-color: transparent;
  color: var(--w-text-fill-color-secondary);
  cursor: default;
  outline: none;
  opacity: 0;
  visibility: hidden;
  pointer-events: none;
  transition:
    opacity var(--w-duration-faster) linear,
    visibility 0s linear var(--w-duration-faster),
    background-color var(--w-duration-faster) linear;
  -webkit-tap-highlight-color: transparent;
}
.nav:hover { background-color: var(--w-subtle-fill-color-secondary); }
.nav:active { background-color: var(--w-subtle-fill-color-tertiary); }
.nav:disabled { background-color: transparent; color: var(--w-text-fill-color-disabled); }
.nav.prev { inset-inline-start: 0; }
.nav.next { inset-inline-end: 0; }
:host([data-overflow]) .header-row:hover .nav:not(:disabled) {
  opacity: 1;
  visibility: visible;
  pointer-events: auto;
  transition:
    opacity var(--w-duration-faster) linear,
    visibility 0s,
    background-color var(--w-duration-faster) linear;
}
.nav .w-glyph { transition: translate var(--w-duration-fast) var(--w-ease-decelerate); }
.nav.prev:active .w-glyph { translate: calc(-2px * var(--pv-dir, 1)) 0; transition-duration: var(--w-duration-faster); }
.nav.next:active .w-glyph { translate: calc(2px * var(--pv-dir, 1)) 0; transition-duration: var(--w-duration-faster); }
:host(:dir(rtl)) { --pv-dir: -1; }
:host(:dir(rtl)) .nav .w-glyph { scale: -1 1; }
.items {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  overflow: hidden auto;
  touch-action: pan-y;
}
`;

export interface PivotSelectionChangedDetail {
  selectedIndex: number;
  previousIndex: number;
  selectedItem: WinPivotItem | null;
}

export class WinPivot extends WinElement {
  static override styles = [pivotCss];
  static override template = `
<div class="title" part="title"></div>
<div class="header-row" part="header-row">
  <button class="nav prev" type="button" tabindex="-1" aria-hidden="true">${glyph('chevronLeftSmall', 12)}</button>
  <div class="headers" part="headers" role="tablist"></div>
  <button class="nav next" type="button" tabindex="-1" aria-hidden="true">${glyph('chevronRightSmall', 12)}</button>
</div>
<div class="items" part="items"><slot></slot></div>`;
  static override props: PropDefs = {
    selectedIndex: { type: Number, attribute: 'selected-index', default: 0, reflect: true },
    pivotTitle: { type: String, attribute: 'pivot-title' },
    isLocked: { type: Boolean, attribute: 'is-locked' },
  };
  declare selectedIndex: number;
  declare pivotTitle: string;
  declare isLocked: boolean;

  private headers!: HTMLElement;
  private mo: MutationObserver | null = null;
  private ro: ResizeObserver | null = null;
  private lastIndex = -1;
  private scrollTarget: number | null = null;

  static {
    this.define('win-pivot');
  }

  get items(): WinPivotItem[] {
    return Array.from(this.children).filter((c): c is WinPivotItem => c.localName === ITEM);
  }

  get selectedItem(): WinPivotItem | null {
    return this.items[this.selectedIndex] ?? null;
  }

  protected override firstConnected(): void {
    this.headers = this.$('.headers');
    this.headers.addEventListener('click', (ev) => {
      const h = (ev.target as Element).closest<HTMLElement>('.h');
      if (h) this.selectIndex(Number(h.dataset.i), true);
    });
    this.headers.addEventListener('keydown', (ev) => this.onKey(ev));
    this.headers.addEventListener('scroll', () => this.syncNav());
    this.headers.addEventListener('scrollend', () => (this.scrollTarget = null));
    this.headers.addEventListener('wheel', () => (this.scrollTarget = null), { passive: true });
    this.$('.prev').addEventListener('click', () => this.page(-1));
    this.$('.next').addEventListener('click', () => this.page(1));
    this.addEventListener('win-pivot-change', () => this.renderHeaders());
    this.mo = new MutationObserver(() => this.renderHeaders());
    this.mo.observe(this, { childList: true });
    this.ro = new ResizeObserver(() => this.syncNav());
    this.ro.observe(this);
    void document.fonts?.ready.then(() => this.syncNav());
    this.installSwipe();
    this.renderHeaders();
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('pivotTitle')) this.$('.title').textContent = this.pivotTitle;
    if ((changed.has('selectedIndex') || changed.has('isLocked')) && !first) this.applySelection(false);
  }

  private renderHeaders(): void {
    if (!this.headers) return;
    const items = this.items;
    this.headers.innerHTML = items
      .map((it, i) => {
        const label = it.header || it.getAttribute('header') || `Item ${i + 1}`;
        return `<div class="h" role="tab" data-i="${i}" id="pv-h-${i}" tabindex="-1" aria-selected="false"${it.disabled ? ' aria-disabled="true"' : ''}><span class="label">${escapeHtml(label)}</span><span class="pipe"></span></div>`;
      })
      .join('');
    items.forEach((it, i) => {
      it.setAttribute('aria-labelledby', `pv-h-${i}`);
    });
    this.applySelection(true);
  }

  private applySelection(initial: boolean): void {
    const items = this.items;
    if (!items.length) return;
    const idx = Math.max(0, Math.min(items.length - 1, this.selectedIndex));
    const prevPipe = this.headers.querySelector<HTMLElement>('.h[aria-selected="true"] .pipe');
    const fromRect = prevPipe && !initial ? prevPipe.getBoundingClientRect() : null;
    const hs = Array.from(this.headers.querySelectorAll<HTMLElement>('.h'));
    hs.forEach((h, i) => {
      const sel = i === idx;
      h.setAttribute('aria-selected', String(sel));
      h.tabIndex = sel ? 0 : -1;
      h.hidden = this.isLocked && !sel;
    });
    items.forEach((it, i) => {
      it.toggleAttribute('data-active', i === idx);
    });
    const header = hs[idx];
    if (header) scrollIntoViewWithin(this.headers, header, 'x');
    if (!initial && this.lastIndex !== idx && this.lastIndex >= 0) {
      const forward = idx > this.lastIndex;
      const rtl = isRtl(this);
      const from = forward !== rtl ? 'right' : 'left';
      if (items[idx]) slideIn(items[idx]!, from, 40, 333);
      if (fromRect && header) travelIndicator(header.querySelector('.pipe')!, fromRect, 'x');
    }
    this.lastIndex = idx;
    this.syncNav();
  }

  selectIndex(i: number, focus = false): void {
    const items = this.items;
    if (i < 0 || i >= items.length || items[i]!.disabled) return;
    const prev = this.selectedIndex;
    if (i !== prev) {
      this.selectedIndex = i;
      this.flushUpdates();
      this.emit<PivotSelectionChangedDetail>('selectionchanged', {
        selectedIndex: i,
        previousIndex: prev,
        selectedItem: items[i] ?? null,
      });
    }
    if (focus) this.headers.querySelector<HTMLElement>(`.h[data-i="${i}"]`)?.focus({ preventScroll: true });
  }

  private onKey(ev: KeyboardEvent): void {
    const rtl = isRtl(this);
    const n = this.items.length;
    if (!n) return;
    let to = -1;
    const cur = this.selectedIndex;
    if (ev.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) to = (cur + 1) % n;
    else if (ev.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) to = (cur - 1 + n) % n;
    else if (ev.key === 'Home') to = 0;
    else if (ev.key === 'End') to = n - 1;
    if (to < 0) return;
    ev.preventDefault();
    for (let k = 0; k < n && this.items[to]?.disabled; k++) to = (to + (to >= cur ? 1 : -1) + n) % n;
    this.selectIndex(to, true);
  }

  private headerScroll(): { pos: number; max: number; rtl: boolean } {
    const h = this.headers;
    const max = Math.max(0, h.scrollWidth - h.clientWidth);
    return { pos: Math.min(max, Math.abs(h.scrollLeft)), max, rtl: isRtl(this) };
  }

  private page(dir: -1 | 1): void {
    const { pos, max, rtl } = this.headerScroll();
    const base = this.scrollTarget ?? pos;
    const target = Math.max(0, Math.min(max, base + dir * this.headers.clientWidth * 0.6));
    if (Math.abs(target - pos) < 0.5) return;
    this.scrollTarget = target;
    this.headers.scrollTo({ left: rtl ? -target : target });
  }

  private syncNav(): void {
    const h = this.headers;
    const { pos, max, rtl } = this.headerScroll();
    const over = max > 1;
    this.toggleAttribute('data-overflow', over);
    const before = over ? pos : 0;
    const after = over ? max - pos : 0;
    (this.$('.prev') as HTMLButtonElement).disabled = before < 2;
    (this.$('.next') as HTMLButtonElement).disabled = after < 2;
    const FADE = 40;
    const start = `${Math.min(FADE, Math.round(before))}px`;
    const end = `${Math.min(FADE, Math.round(after))}px`;
    h.style.setProperty('--pv-fade-l', rtl ? end : start);
    h.style.setProperty('--pv-fade-r', rtl ? start : end);
  }

  private installSwipe(): void {
    const area = this.$('.items');
    let start: { x: number; y: number; id: number } | null = null;
    area.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType === 'mouse') return;
      start = { x: ev.clientX, y: ev.clientY, id: ev.pointerId };
    });
    area.addEventListener('pointerup', (ev) => {
      if (!start || ev.pointerId !== start.id) return;
      const dx = ev.clientX - start.x;
      const dy = ev.clientY - start.y;
      start = null;
      if (Math.abs(dx) < 60 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const n = this.items.length;
      const dir = dx < 0 !== isRtl(this) ? 1 : -1;
      this.selectIndex((this.selectedIndex + dir + n) % n);
    });
    area.addEventListener('pointercancel', () => (start = null));
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-pivot': WinPivot;
    'win-pivot-item': WinPivotItem;
  }
}
