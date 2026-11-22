import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { animate, durations, easings, settled } from '../../motion/animate.ts';
import { isRtl } from '../../base/dom.ts';
import { navStrings } from './shared.ts';

export type PagerDisplayMode = 'auto' | 'combo-box' | 'number-box' | 'button-panel';
export type PagerButtonVisibility = 'visible' | 'hidden-on-edge' | 'collapsed';

const FIRST = `<svg class="w-glyph" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M3.5 3V13M11.75 2.5L6.25 8L11.75 13.5"/></svg>`;
const LAST = `<svg class="w-glyph" width="16" height="16" viewBox="0 0 16 16" aria-hidden="true"><path d="M12.5 3V13M4.25 2.5L9.75 8L4.25 13.5"/></svg>`;

const SPRING = 'cubic-bezier(0.2, 1.8, 0.4, 1)';

const pagerCss = css`
:host {
  display: inline-flex;
  align-items: center;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  user-select: none;
  -webkit-user-select: none;
  --pg-dir: 1;
}
:host(:dir(rtl)) { --pg-dir: -1; }
.pbtn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 40px;
  height: 40px;
  padding: 0;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background-color: transparent;
  color: var(--w-text-fill-color-primary);
  cursor: default;
  flex: none;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  transition:
    background-color var(--w-duration-faster) linear,
    color var(--w-duration-faster) linear,
    opacity var(--w-duration-fast) linear,
    visibility 0s;
}
.pbtn:hover { background-color: var(--w-subtle-fill-color-secondary); }
.pbtn:active { background-color: var(--w-subtle-fill-color-tertiary); }
.pbtn:disabled { background-color: transparent; color: var(--w-text-fill-color-disabled); }
.pbtn.edge-hidden {
  opacity: 0;
  visibility: hidden;
  transition:
    background-color var(--w-duration-faster) linear,
    color var(--w-duration-faster) linear,
    opacity var(--w-duration-fast) linear,
    visibility 0s linear var(--w-duration-fast);
}
.pbtn[hidden] { display: none; }
${focusRing('.pbtn:focus-visible', 0)}
.pbtn .w-glyph {
  --pg-mirror: 1;
  scale: var(--pg-mirror) 1;
  transition: scale var(--w-duration-fast) ${SPRING}, translate var(--w-duration-fast) ${SPRING};
}
:host(:dir(rtl)) .pbtn .w-glyph { --pg-mirror: -1; }
.pbtn:active .w-glyph {
  scale: calc(var(--pg-mirror) * 0.875) 0.875;
  transition-duration: var(--w-duration-faster);
  transition-timing-function: var(--w-ease-decelerate);
}
.pbtn.first:active .w-glyph, .pbtn.prev:active .w-glyph { translate: calc(-2px * var(--pg-dir)) 0; }
.pbtn.next:active .w-glyph, .pbtn.last:active .w-glyph { translate: calc(2px * var(--pg-dir)) 0; }
.box { display: none; align-items: center; gap: 0; }
:host([data-mode="combo-box"]) .box, :host([data-mode="number-box"]) .box { display: inline-flex; }
.box .prefix, .box .suffix, .box .total { margin: 0 5px; white-space: nowrap; }
.box .suffix { margin-inline-end: 0; }
.field {
  box-sizing: border-box;
  height: 32px;
  border: 1px solid;
  border-color: var(--w-control-elevation-border);
  border-radius: var(--w-corner-radius-control);
  background-color: var(--w-control-fill-color-default);
  background-clip: padding-box;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  outline: none;
}
select.field {
  display: none;
  appearance: none;
  -webkit-appearance: none;
  min-width: 72px;
  padding: 5px 30px 6px 11px;
  background-image: var(--pg-chevron);
  background-repeat: no-repeat;
  background-position: right 11px center;
  background-size: 12px 12px;
  cursor: default;
}
select.field:hover { background-color: var(--w-control-fill-color-secondary); }
select.field:active { background-color: var(--w-control-fill-color-tertiary); }
select.field option { background: var(--w-solid-background-fill-color-quarternary); color: var(--w-text-fill-color-primary); }
:host([data-mode="combo-box"]) select.field { display: inline-block; }
input.field {
  display: none;
  width: 64px;
  padding: 5px 10px 6px 11px;
  border-color: var(--w-text-control-elevation-border);
  text-align: start;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
}
input.field:hover { background-color: var(--w-control-fill-color-secondary); }
input.field:focus { background-color: var(--w-control-fill-color-input-active); }
.nb { position: relative; display: none; border-radius: var(--w-corner-radius-control); }
:host([data-mode="number-box"]) .nb { display: inline-flex; }
.nb::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(var(--w-text-control-elevation-border-focused-edge), var(--w-text-control-elevation-border-focused-edge)) bottom / 100% 2px no-repeat;
  clip-path: inset(0 50% 0 50%);
  opacity: 0;
  pointer-events: none;
  transition:
    clip-path var(--w-duration-fast) var(--w-ease-decelerate),
    opacity var(--w-duration-fast) linear;
}
.nb:focus-within::after {
  clip-path: inset(0 0 0 0);
  opacity: 1;
  transition:
    clip-path var(--w-duration-normal) var(--w-ease-decelerate),
    opacity var(--w-duration-faster) linear;
}
input.field::-webkit-inner-spin-button { display: none; }
:host([data-mode="number-box"]) input.field { display: inline-block; }
${focusRing('select.field:focus-visible', 3)}
.panel { position: relative; display: none; align-items: center; gap: 5px; height: 40px; }
:host([data-mode="button-panel"]) .panel { display: inline-flex; }
.num {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  min-width: 32px;
  min-height: 20px;
  height: 32px;
  padding: 0 4px;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background-color: transparent;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  cursor: default;
  outline: none;
  -webkit-tap-highlight-color: transparent;
  transition: background-color var(--w-duration-faster) linear;
}
.num:hover { background-color: var(--w-subtle-fill-color-secondary); }
.num:active { background-color: var(--w-subtle-fill-color-tertiary); }
.num[aria-current="page"] { font-weight: 600; }
.num.ellipsis { pointer-events: none; color: var(--w-text-fill-color-secondary); }
${focusRing('.num:focus-visible', 0)}
.num .lbl {
  display: inline-block;
  transition: scale var(--w-duration-fast) ${SPRING}, font-weight var(--w-duration-fast) linear;
}
.num:active .lbl {
  scale: 0.875;
  transition: scale var(--w-duration-faster) var(--w-ease-decelerate), font-weight var(--w-duration-fast) linear;
}
.num[data-w-exiting] { position: absolute; pointer-events: none; }
.indicator {
  position: absolute;
  inset-inline: 8px;
  bottom: -2px;
  height: 2px;
  border-radius: 1px;
  background: var(--w-accent-fill-color-default);
  transform-origin: left center;
  pointer-events: none;
}
.panel > .indicator { display: none; }
`;

interface PanelSlot {
  key: string;
  page: number | null;
}

function scriptAnimations(el: Element): Animation[] {
  return el.getAnimations().filter((a) => !(a instanceof CSSTransition) && !(a instanceof CSSAnimation));
}

function translateX(el: Element): number {
  const t = getComputedStyle(el).transform;
  return !t || t === 'none' ? 0 : new DOMMatrixReadOnly(t).m41;
}

export class WinPager extends WinElement {
  static override styles = [pagerCss];
  static override template = `
<nav class="pager" part="pager" style="display:inline-flex;align-items:center">
  <button class="pbtn first" type="button">${FIRST}</button>
  <button class="pbtn prev" type="button">${glyph('chevronLeft', 16)}</button>
  <div class="box" part="box"><span class="prefix"></span><select class="field" part="combo-box"></select><span class="nb"><input class="field" part="number-box" type="number" min="1" inputmode="numeric"></span><span class="suffix"></span><span class="total"></span></div>
  <div class="panel" part="button-panel"><span class="indicator" part="selection-indicator"></span></div>
  <button class="pbtn next" type="button">${glyph('chevronRight', 16)}</button>
  <button class="pbtn last" type="button">${LAST}</button>
</nav>`;
  static override props: PropDefs = {
    numberOfPages: { type: Number, attribute: 'number-of-pages', default: 5 },
    selectedPageIndex: { type: Number, attribute: 'selected-page-index', default: 0, reflect: true },
    displayMode: { type: String, attribute: 'display-mode', default: 'auto' },
    firstButtonVisibility: { type: String, attribute: 'first-button-visibility', default: 'visible' },
    previousButtonVisibility: { type: String, attribute: 'previous-button-visibility', default: 'visible' },
    nextButtonVisibility: { type: String, attribute: 'next-button-visibility', default: 'visible' },
    lastButtonVisibility: { type: String, attribute: 'last-button-visibility', default: 'visible' },
    prefixText: { type: String, attribute: 'prefix-text' },
    suffixText: { type: String, attribute: 'suffix-text' },
    alwaysShowFirstLast: { type: Boolean, attribute: 'button-panel-always-show-first-last-page-index', default: true },
  };
  declare numberOfPages: number;
  declare selectedPageIndex: number;
  declare displayMode: PagerDisplayMode;
  declare firstButtonVisibility: PagerButtonVisibility;
  declare previousButtonVisibility: PagerButtonVisibility;
  declare nextButtonVisibility: PagerButtonVisibility;
  declare lastButtonVisibility: PagerButtonVisibility;
  declare prefixText: string;
  declare suffixText: string;
  declare alwaysShowFirstLast: boolean;

  private renderedMode = '';
  private panelIndex = -1;
  private slotX = new WeakMap<HTMLElement, number>();
  private panelCurrent: HTMLElement | null = null;

  static {
    this.define('win-pager');
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'navigation');
    const s = navStrings(this);
    const label = (cls: string, text: string) => {
      const b = this.$(`.${cls}`);
      b.setAttribute('aria-label', text);
      b.title = text;
    };
    label('first', s.first);
    label('prev', s.previous);
    label('next', s.next);
    label('last', s.last);
    this.$('.first').addEventListener('click', () => this.goTo(0));
    this.$('.prev').addEventListener('click', () => this.goTo(this.selectedPageIndex - 1));
    this.$('.next').addEventListener('click', () => this.goTo(this.selectedPageIndex + 1));
    this.$('.last').addEventListener('click', () => this.goTo(this.numberOfPages - 1));
    const select = this.$<HTMLSelectElement>('select');
    select.addEventListener('change', () => this.goTo(Number(select.value)));
    const input = this.$<HTMLInputElement>('input');
    const commit = () => {
      const v = Math.round(Number(input.value));
      if (Number.isFinite(v) && v >= 1 && (this.numberOfPages < 0 || v <= this.numberOfPages)) this.goTo(v - 1);
      else input.value = String(this.selectedPageIndex + 1);
    };
    input.addEventListener('change', commit);
    input.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') commit();
      else if (ev.key === 'ArrowUp') {
        ev.preventDefault();
        this.goTo(this.selectedPageIndex + 1);
      } else if (ev.key === 'ArrowDown') {
        ev.preventDefault();
        this.goTo(this.selectedPageIndex - 1);
      }
    });
    this.$('.panel').addEventListener('click', (ev) => {
      const b = (ev.target as Element).closest<HTMLElement>('.num[data-i]:not([data-w-exiting])');
      if (b) this.goTo(Number(b.dataset.i));
    });
    const svg = `<svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 16 16'><path d='M2.5 5.75L8 11.25L13.5 5.75' fill='none' stroke='%23888' stroke-width='1.2' stroke-linecap='round' stroke-linejoin='round'/></svg>`;
    this.style.setProperty('--pg-chevron', `url("data:image/svg+xml,${svg}")`);
  }

  get effectiveMode(): Exclude<PagerDisplayMode, 'auto'> {
    if (this.displayMode !== 'auto') return this.displayMode;
    return this.numberOfPages >= 0 && this.numberOfPages < 10 ? 'combo-box' : 'number-box';
  }

  goTo(index: number): void {
    const max = this.numberOfPages < 0 ? Number.MAX_SAFE_INTEGER : this.numberOfPages - 1;
    const i = Math.max(0, Math.min(max, index));
    if (i === this.selectedPageIndex) {
      this.render();
      return;
    }
    const prev = this.selectedPageIndex;
    this.selectedPageIndex = i;
    this.flushUpdates();
    this.emit('selectedindexchanged', { newPageIndex: i, previousPageIndex: prev });
  }

  protected override updated(): void {
    this.render();
  }

  private render(): void {
    const s = navStrings(this);
    const n = this.numberOfPages;
    const i = this.selectedPageIndex;
    const mode = this.effectiveMode;
    this.setAttribute('data-mode', mode);
    const vis = (cls: string, v: PagerButtonVisibility, atEdge: boolean) => {
      const b = this.$<HTMLButtonElement>(`.${cls}`);
      b.hidden = v === 'collapsed';
      b.disabled = atEdge;
      b.classList.toggle('edge-hidden', v === 'hidden-on-edge' && atEdge);
    };
    vis('first', this.firstButtonVisibility, i <= 0);
    vis('prev', this.previousButtonVisibility, i <= 0);
    vis('next', this.nextButtonVisibility, n >= 0 && i >= n - 1);
    vis('last', this.lastButtonVisibility, n < 0 || i >= n - 1);
    this.$('.prefix').textContent = this.prefixText || s.page;
    this.$('.suffix').textContent = n >= 0 ? this.suffixText || s.of : '';
    this.$('.total').textContent = n >= 0 ? (this.suffixText ? String(n) : s.pages(n)) : '';
    if (mode === 'combo-box') {
      const select = this.$<HTMLSelectElement>('select');
      if (select.options.length !== n) {
        select.innerHTML = Array.from(
          { length: Math.max(0, n) },
          (_, k) => `<option value="${k}">${k + 1}</option>`,
        ).join('');
      }
      select.value = String(i);
      select.setAttribute('aria-label', s.pageLabel);
    } else if (mode === 'number-box') {
      const input = this.$<HTMLInputElement>('input');
      if (n >= 0) input.max = String(n);
      input.value = String(i + 1);
      input.setAttribute('aria-label', s.pageLabel);
    } else this.renderPanel(this.renderedMode === 'button-panel');
    this.renderedMode = mode;
  }

  private panelSlots(): PanelSlot[] {
    const n = Math.max(0, this.numberOfPages);
    const i = this.selectedPageIndex;
    const pages: (number | 'e')[] = [];
    const max = 7;
    if (n <= max) for (let k = 0; k < n; k++) pages.push(k);
    else if (i < 4) pages.push(0, 1, 2, 3, 4, 'e', n - 1);
    else if (i > n - 5) pages.push(0, 'e', n - 5, n - 4, n - 3, n - 2, n - 1);
    else pages.push(0, 'e', i - 1, i, i + 1, 'e', n - 1);
    if (!this.alwaysShowFirstLast && n > max) {
      if (pages[0] === 0 && pages[1] === 'e') pages.splice(0, 1);
      if (pages[pages.length - 1] === n - 1 && pages[pages.length - 2] === 'e') pages.pop();
    }
    return pages.map((p, k) =>
      p === 'e'
        ? { key: pages.slice(0, k).some((q) => q !== 'e' && q >= i) ? 'eR' : 'eL', page: null }
        : { key: `p${p}`, page: p },
    );
  }

  private createNum(slot: PanelSlot): HTMLButtonElement {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'num';
    b.dataset.key = slot.key;
    const lbl = document.createElement('span');
    lbl.className = 'lbl';
    if (slot.page === null) {
      b.classList.add('ellipsis');
      lbl.textContent = '…';
      b.tabIndex = -1;
      b.setAttribute('aria-hidden', 'true');
    } else {
      b.dataset.i = String(slot.page);
      lbl.textContent = String(slot.page + 1);
      b.setAttribute('aria-label', `${navStrings(this).pageLabel} ${slot.page + 1}`);
    }
    b.append(lbl);
    return b;
  }

  private renderPanel(animated: boolean): void {
    const panel = this.$('.panel');
    const indicator = this.$('.indicator');
    const index = this.selectedPageIndex;
    const dir = Math.sign(index - this.panelIndex);
    this.panelIndex = index;
    const slots = this.panelSlots();

    const live = new Map<string, HTMLElement>();
    const leaving = new Map<string, HTMLElement>();
    for (const el of panel.querySelectorAll<HTMLElement>(':scope > .num')) {
      (el.hasAttribute('data-w-exiting') ? leaving : live).set(el.dataset.key ?? '', el);
    }
    const pr = panel.getBoundingClientRect();
    const shown = animated && pr.width > 0;
    const first = new Map<HTMLElement, { rect: DOMRect; opacity: number }>();
    if (shown) {
      for (const el of [...live.values(), ...leaving.values()]) {
        first.set(el, { rect: el.getBoundingClientRect(), opacity: Number(getComputedStyle(el).opacity) });
      }
    }
    const indFrom = shown && indicator.parentElement !== panel ? indicator.getBoundingClientRect() : null;
    const focused = this.renderRoot.activeElement;

    const wanted: HTMLElement[] = [];
    const added = new Set<HTMLElement>();
    let current: HTMLElement | null = null;
    for (const slot of slots) {
      let el = live.get(slot.key);
      const revived = !el && leaving.has(slot.key);
      if (el) live.delete(slot.key);
      else el = leaving.get(slot.key);
      if (revived && el) {
        leaving.delete(slot.key);
        el.removeAttribute('data-w-exiting');
        el.style.removeProperty('left');
        el.style.removeProperty('top');
        if (slot.page !== null) {
          el.removeAttribute('aria-hidden');
          el.tabIndex = 0;
        }
        added.add(el);
      } else {
        el = this.createNum(slot);
        added.add(el);
      }
      if (slot.page !== null) {
        const isCurrent = slot.page === index;
        if (isCurrent) {
          el.setAttribute('aria-current', 'page');
          current = el;
        } else el.removeAttribute('aria-current');
      }
      wanted.push(el);
    }
    let prev: HTMLElement | null = null;
    for (const el of wanted) {
      if (added.has(el)) {
        const at: ChildNode | null = prev ? prev.nextSibling : panel.firstChild;
        if (at !== el) panel.insertBefore(el, at);
      }
      prev = el;
    }
    for (let k = 1; k < wanted.length; k++) {
      if (!(wanted[k - 1]!.compareDocumentPosition(wanted[k]!) & Node.DOCUMENT_POSITION_FOLLOWING)) {
        panel.append(...wanted);
        break;
      }
    }
    if (current) {
      if (indicator.parentElement !== current) current.append(indicator);
    } else if (indicator.parentElement !== panel) panel.append(indicator);
    const gone = [...live.values()];
    for (const el of gone) {
      el.setAttribute('data-w-exiting', '');
      el.setAttribute('aria-hidden', 'true');
      el.removeAttribute('aria-current');
      el.tabIndex = -1;
      if (el === focused) (current ?? wanted.find((w) => w.dataset.i))?.focus({ preventScroll: true });
      if (!shown) el.remove();
    }
    if (!shown) {
      for (const el of leaving.values()) el.remove();
      return;
    }

    const rtl = isRtl(this);
    const dist: number[] = [];
    const moves: [HTMLElement, number][] = [];
    for (const el of wanted) {
      const x = el.getBoundingClientRect().left - translateX(el);
      const was = this.slotX.get(el);
      this.slotX.set(el, x);
      const f = first.get(el);
      if (!f) continue;
      if (added.has(el)) {
        for (const a of scriptAnimations(el)) a.cancel();
      } else if (was !== undefined) {
        if (Math.abs(was - x) < 0.5) continue;
        if (Math.abs(was - x) >= 1) dist.push(Math.abs(was - x));
      }
      const dx = f.rect.left - x;
      if (Math.abs(dx) >= 0.5) moves.push([el, dx]);
    }
    const btnMove = current ? moves.find(([el]) => el === current)?.[1] : undefined;
    let ind: { left: number; width: number; at: number } | null = null;
    if (current && indFrom && indFrom.width > 0 && (current !== this.panelCurrent || btnMove !== undefined)) {
      for (const a of scriptAnimations(indicator)) a.cancel();
      const r = indicator.getBoundingClientRect();
      const at = translateX(current);
      if (r.width > 0) ind = { left: r.left - at, width: r.width, at };
    }

    const slot = dist.length ? Math.min(...dist) : 24;
    const along = Math.round((dir * slot * (rtl ? -1 : 1)) / 2);

    const move = { duration: durations.normal, easing: easings.point };
    for (const [el, dx] of moves) {
      animate(el, [{ transform: `translateX(${dx}px)` }, { transform: 'none' }], move);
    }
    for (const el of wanted) {
      const f = first.get(el);
      if (!added.has(el)) continue;
      if (f) {
        if (f.opacity < 1)
          animate(el, [{ opacity: f.opacity }, { opacity: 1 }], { duration: durations.fast, easing: easings.linear });
        continue;
      }
      const lbl = el.querySelector('.lbl');
      if (!lbl) continue;
      const enter = { delay: durations.faster / 2, fill: 'backwards' as const };
      animate(lbl, [{ opacity: 0 }, { opacity: 1 }], { duration: durations.fast, easing: easings.linear, ...enter });
      if (along) animate(lbl, [{ transform: `translateX(${along}px)` }, { transform: 'none' }], { ...move, ...enter });
    }
    for (const el of gone) {
      const f = first.get(el);
      if (!f) {
        el.remove();
        continue;
      }
      el.style.left = `${f.rect.left - pr.left - panel.clientLeft}px`;
      el.style.top = `${f.rect.top - pr.top - panel.clientTop}px`;
      animate(el, [{ opacity: f.opacity }, { opacity: 0 }], {
        duration: durations.faster,
        easing: easings.linear,
        fill: 'forwards',
      });
      const out = animate(el, [{ transform: 'none' }, { transform: `translateX(${-along}px)` }], {
        duration: durations.normal,
        easing: easings.decelerate,
        fill: 'forwards',
      });
      void settled(out).then(() => {
        if (el.hasAttribute('data-w-exiting')) el.remove();
      });
    }
    for (const el of leaving.values()) if (!scriptAnimations(el).length) el.remove();

    if (current && indFrom && ind) {
      const start = btnMove ?? ind.at;
      const ox = indFrom.left - (ind.left + start);
      const sx = indFrom.width / ind.width;
      if (Math.abs(ox) >= 0.5 || Math.abs(sx - 1) > 0.01) {
        animate(indicator, [{ transform: `translateX(${ox}px) scaleX(${sx})` }, { transform: 'none' }], move);
      }
    }
    this.panelCurrent = current;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-pager': WinPager;
  }
}
