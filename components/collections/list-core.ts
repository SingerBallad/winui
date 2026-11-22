import { WinElement, escapeHtml, type PropDefs } from '../../base/element.ts';
import { css, scrollbars } from '../../base/css.ts';
import { navigateIndex, TypeAhead } from '../../base/keyboard.ts';
import { isRtl, scrollIntoViewWithin } from '../../base/dom.ts';
import { animate, durations, easings, flip, settled } from '../../motion/animate.ts';

export type SelectionMode = 'none' | 'single' | 'multiple' | 'extended';
export type ListLayout = 'vertical' | 'horizontal' | 'grid';
export type ItemRenderer = (item: unknown, index: number) => string | Node;

export interface SelectionChangedDetail {
  added: unknown[];
  removed: unknown[];
  addedIndices: number[];
  removedIndices: number[];
}

export interface ItemClickDetail {
  item: unknown;
  index: number;
  element: HTMLElement;
}

export interface ReorderDetail {
  from: number;
  to: number;
  item: unknown;
}

export function upgradeProperty(el: object, name: string): void {
  if (Object.hasOwn(el, name)) {
    const rec = el as Record<string, unknown>;
    const v = rec[name];
    delete rec[name];
    rec[name] = v;
  }
}

export function defaultItemText(item: unknown): string {
  if (item === null || item === undefined) return '';
  if (typeof item === 'object') {
    const o = item as Record<string, unknown>;
    for (const k of ['label', 'title', 'text', 'name', 'content', 'value']) {
      if (typeof o[k] === 'string' || typeof o[k] === 'number') return String(o[k]);
    }
  }
  return String(item);
}

export const NULL_ITEM_HTML = '<span style="color:var(--w-text-fill-color-tertiary);font-style:italic">(空项)</span>';

export const CHECKBOX_GLYPH = `<svg class="cb-glyph" viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path class="cb-check" pathLength="1" d="M5.4 11.1L8.4 14.1L14.6 7.9"/><path class="cb-dash" d="M6.75 10H13.25"/></svg>`;

export const checkBoxGlyphCss = `
.cb-glyph {
  position: absolute;
  inset: -1px;
  width: 20px;
  height: 20px;
  overflow: visible;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.15;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
}
.cb-check {
  stroke-dasharray: 1 2;
  stroke-dashoffset: 1;
  transition: stroke-dashoffset var(--w-duration-normal) var(--w-ease-decelerate);
}
.cb-dash {
  opacity: 0;
  transform: scaleX(0);
  transform-origin: 10px 10px;
  transition:
    opacity var(--w-duration-fast) var(--w-ease-decelerate),
    transform var(--w-duration-fast) var(--w-ease-decelerate);
}
`;

export abstract class ListItemBase extends WinElement {
  static override props: PropDefs = {
    selected: { type: Boolean },
    disabled: { type: Boolean },
    value: { type: String },
  };
  declare selected: boolean;
  declare disabled: boolean;
  declare value: string;

  dataItem: unknown = undefined;
  dataIndex = -1;

  protected override firstConnected(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'option');
    if (!this.hasAttribute('tabindex')) this.tabIndex = -1;
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('selected')) this.setAttribute('aria-selected', String(this.selected));
    if (changed.has('disabled')) this.aria('aria-disabled', this.disabled ? 'true' : null);
  }

  get searchText(): string {
    return (this.getAttribute('data-search') ?? this.textContent ?? '').trim();
  }
}

export const listHostCss = css`
:host {
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  color: var(--w-text-fill-color-primary);
  outline: none;
}
.scroller {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  height: 100%;
  max-height: inherit;
  overflow-x: hidden;
  overflow-y: auto;
  border-radius: inherit;
  clip-path: inset(0 round var(--w-list-radius, 0px));
}
.items {
  position: relative;
  display: flex;
  flex-direction: column;
}
:host([data-layout="horizontal"]) .scroller { overflow-x: auto; overflow-y: hidden; }
:host([data-layout="horizontal"]) .items { flex-direction: row; }
:host([data-layout="grid"]) .items { flex-direction: row; flex-wrap: wrap; align-content: flex-start; }
.spacer { flex: none; height: 0; }
.empty { display: none; padding: 12px 16px; color: var(--w-text-fill-color-tertiary); }
:host([data-empty]) .empty { display: block; }
.header:empty, .footer:empty { display: none; }
:host([disabled]) { pointer-events: none; opacity: 0.6; }
::slotted([data-w-dragging]) {
  z-index: 3;
  opacity: 0.8;
  pointer-events: none;
}
`;

const NAV_KEYS = new Set(['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'PageUp', 'PageDown']);
const VIRTUALIZE_THRESHOLD = 120;
const OVERSCAN_ROWS = 6;

export abstract class ListBase extends WinElement {
  static override styles = [scrollbars, listHostCss];
  static override template = `<div class="scroller w-scroll" part="scroller"><div class="header" part="header"><slot name="header"></slot></div><div class="spacer before" part="spacer-before"></div><div class="items" part="items"><slot></slot></div><div class="spacer after" part="spacer-after"></div><div class="empty" part="empty"><slot name="empty"><span class="empty-text"></span></slot></div><div class="footer" part="footer"><slot name="footer"></slot></div></div>`;
  static override props: PropDefs = {
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true, default: 'single' },
    selectedIndex: { type: Number, attribute: 'selected-index', default: -1 },
    itemClickEnabled: { type: Boolean, attribute: 'item-click-enabled' },
    canReorderItems: { type: Boolean, attribute: 'can-reorder-items' },
    singleSelectionFollowsFocus: { type: Boolean, attribute: 'single-selection-follows-focus', default: true },
    placeholder: { type: String },
    disabled: { type: Boolean },
  };
  declare selectionMode: SelectionMode;
  declare selectedIndex: number;
  declare itemClickEnabled: boolean;
  declare canReorderItems: boolean;
  declare singleSelectionFollowsFocus: boolean;
  declare placeholder: string;
  declare disabled: boolean;

  protected abstract get itemTag(): string;
  protected get headerTag(): string | null {
    return null;
  }
  protected get listLayout(): ListLayout {
    return 'vertical';
  }

  protected scroller!: HTMLElement;
  protected itemsHost!: HTMLElement;
  private spacerBefore!: HTMLElement;
  private spacerAfter!: HTMLElement;
  private typeahead = new TypeAhead();
  private anchorIndex = -1;
  private focusIndex = -1;
  private syncedIndex = -1;
  private mo: MutationObserver | null = null;

  private _items: unknown[] | null = null;
  private _renderItem: ItemRenderer | null = null;
  private dataSel = new Set<number>();
  private rendered = new Map<number, ListItemBase>();
  private rowSize = 0;
  private colCount = 1;
  private virtual = false;
  private windowStart = 0;
  private windowEnd = 0;

  private drag: {
    el: ListItemBase;
    pointerId: number;
    startX: number;
    startY: number;
    grabX: number;
    grabY: number;
    from: number;
    active: boolean;
  } | null = null;
  private suppressClick = false;

  get items(): unknown[] | null {
    return this._items;
  }
  set items(v: unknown[] | null) {
    this._items = v ? Array.from(v) : null;
    this.dataSel.clear();
    this.anchorIndex = -1;
    this.focusIndex = -1;
    this.rowSize = 0;
    if (this.isInitialized) this.renderData(true);
  }

  get renderItem(): ItemRenderer | null {
    return this._renderItem;
  }
  set renderItem(fn: ItemRenderer | null) {
    this._renderItem = fn;
    if (this.isInitialized && this._items) this.renderData(true);
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'listbox');
    const radius = getComputedStyle(this).borderTopLeftRadius;
    if (radius && radius !== '0px') this.style.setProperty('--w-list-radius', radius);
    this.setAttribute('data-layout', this.listLayout);
    this.scroller = this.$('.scroller');
    this.itemsHost = this.$('.items');
    this.spacerBefore = this.$('.spacer.before');
    this.spacerAfter = this.$('.spacer.after');

    this.addEventListener('keydown', (ev) => this.onKeyDown(ev));
    this.addEventListener('click', (ev) => this.onClick(ev));
    this.addEventListener('focusin', (ev) => {
      const item = this.itemFromTarget(ev.target);
      if (item) {
        this.focusIndex = this.indexOf(item);
        this.syncRoving();
      }
    });
    this.addEventListener('pointerdown', (ev) => this.onPointerDown(ev));
    this.addEventListener('pointermove', (ev) => this.onPointerMove(ev));
    this.addEventListener('pointerup', (ev) => this.onPointerUp(ev));
    this.addEventListener('pointercancel', (ev) => this.onPointerUp(ev, true));
    this.addEventListener('lostpointercapture', (ev) => {
      if (this.drag && this.drag.pointerId === ev.pointerId) this.onPointerUp(ev, false);
    });
    this.scroller.addEventListener(
      'scroll',
      () => {
        if (this.virtual) this.renderWindow();
        this.queueStickyHeaders();
      },
      { passive: true },
    );

    this.mo = new MutationObserver((records) => {
      if (this._items) return;
      if (records.some((r) => r.type === 'childList')) this.onChildrenChanged();
    });
    this.mo.observe(this, { childList: true });
    new ResizeObserver(() => {
      if (this.virtual) {
        this.measure();
        this.renderWindow();
      }
      this.queueStickyHeaders();
    }).observe(this);
    this.onChildrenChanged();
    upgradeProperty(this, 'renderItem');
    upgradeProperty(this, 'items');
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('selectionMode')) {
      this.setAttribute(
        'aria-multiselectable',
        String(this.selectionMode === 'multiple' || this.selectionMode === 'extended'),
      );
      for (const el of this.renderedElements()) el.setAttribute('data-mode', this.selectionMode);
      if (!first) this.normalizeForMode();
    }
    if (changed.has('selectedIndex') && this.selectedIndex !== this.syncedIndex) {
      const i = this.selectedIndex;
      if (i >= 0 && i < this.count) this.change(() => this.selectOnly(i));
      else if (i < 0 && !first) this.change(() => this.clearAll());
      this.syncedIndex = this.selectedIndex;
    }
    if (changed.has('placeholder')) {
      const t = this.renderRoot.querySelector('.empty-text');
      if (t) t.textContent = this.placeholder;
      this.syncEmpty();
    }
    if (changed.has('disabled')) this.aria('aria-disabled', this.disabled ? 'true' : null);
  }

  protected renderedElements(): ListItemBase[] {
    const tag = this.itemTag;
    const out: ListItemBase[] = [];
    for (const c of this.children) if (c.localName === tag) out.push(c as ListItemBase);
    return out;
  }

  get count(): number {
    return this._items ? this._items.length : this.renderedElements().length;
  }

  containerFromIndex(i: number): ListItemBase | null {
    if (this._items) return this.rendered.get(i) ?? null;
    return this.renderedElements()[i] ?? null;
  }

  indexFromContainer(el: Element): number {
    if (this._items) return (el as ListItemBase).dataIndex;
    return this.renderedElements().indexOf(el as ListItemBase);
  }
  private indexOf(el: ListItemBase): number {
    return this.indexFromContainer(el);
  }

  itemAt(i: number): unknown {
    return this._items ? this._items[i] : this.containerFromIndex(i);
  }

  protected itemFromTarget(t: EventTarget | null): ListItemBase | null {
    if (!(t instanceof Element)) return null;
    const el = t.closest(this.itemTag);
    return el && el.parentElement === this ? (el as ListItemBase) : null;
  }

  private isDisabledIndex(i: number): boolean {
    const el = this.containerFromIndex(i);
    return !!el?.disabled;
  }

  isSelectedIndex(i: number): boolean {
    if (this._items) return this.dataSel.has(i);
    return !!this.containerFromIndex(i)?.selected;
  }

  private setSel(i: number, on: boolean): void {
    if (this._items) {
      if (on) this.dataSel.add(i);
      else this.dataSel.delete(i);
      const el = this.rendered.get(i);
      if (el) el.selected = on;
    } else {
      const el = this.containerFromIndex(i);
      if (el) el.selected = on;
    }
  }

  get selectedIndices(): number[] {
    if (this._items) return [...this.dataSel].sort((a, b) => a - b);
    const out: number[] = [];
    this.renderedElements().forEach((el, i) => {
      if (el.selected) out.push(i);
    });
    return out;
  }

  get selectedItems(): unknown[] {
    return this.selectedIndices.map((i) => this.itemAt(i));
  }

  get selectedItem(): unknown {
    const i = this.selectedIndices[0];
    return i === undefined ? null : this.itemAt(i);
  }

  private clearAll(): void {
    for (const i of this.selectedIndices) this.setSel(i, false);
  }

  private selectOnly(i: number): void {
    for (const j of this.selectedIndices) if (j !== i) this.setSel(j, false);
    if (i >= 0) this.setSel(i, true);
  }

  private selectRangeInternal(a: number, b: number, additive: boolean): void {
    const lo = Math.max(0, Math.min(a, b));
    const hi = Math.min(this.count - 1, Math.max(a, b));
    if (!additive) for (const j of this.selectedIndices) if (j < lo || j > hi) this.setSel(j, false);
    for (let k = lo; k <= hi; k++) if (!this.isDisabledIndex(k)) this.setSel(k, true);
  }

  protected change(mutate: () => void): void {
    const before = new Set(this.selectedIndices);
    mutate();
    const after = this.selectedIndices;
    const afterSet = new Set(after);
    const added = after.filter((i) => !before.has(i));
    const removed = [...before].filter((i) => !afterSet.has(i));
    this.syncedIndex = after[0] ?? -1;
    this.selectedIndex = this.syncedIndex;
    if (!added.length && !removed.length) return;
    this.emit<SelectionChangedDetail>('selectionchanged', {
      added: added.map((i) => this.itemAt(i)),
      removed: removed.map((i) => this.itemAt(i)),
      addedIndices: added,
      removedIndices: removed,
    });
  }

  selectAll(): void {
    if (this.selectionMode !== 'multiple' && this.selectionMode !== 'extended') return;
    this.change(() => {
      for (let i = 0; i < this.count; i++) if (!this.isDisabledIndex(i)) this.setSel(i, true);
    });
  }
  deselectAll(): void {
    this.change(() => this.clearAll());
  }
  selectRange(first: number, length: number): void {
    if (this.selectionMode === 'none' || this.selectionMode === 'single') return;
    this.change(() => this.selectRangeInternal(first, first + length - 1, true));
  }
  deselectRange(first: number, length: number): void {
    this.change(() => {
      for (let i = first; i < first + length; i++) this.setSel(i, false);
    });
  }

  private normalizeForMode(): void {
    const mode = this.selectionMode;
    if (mode === 'none') this.change(() => this.clearAll());
    else if (mode === 'single') {
      const keep = this.selectedIndices[0];
      if (keep !== undefined) this.change(() => this.selectOnly(keep));
    }
  }

  protected onChildrenChanged(): void {
    const els = this.renderedElements();
    els.forEach((el, i) => {
      el.setAttribute('data-mode', this.selectionMode);
      el.setAttribute('aria-posinset', String(i + 1));
      el.setAttribute('aria-setsize', String(els.length));
    });
    if (this.selectionMode === 'single' || this.selectionMode === 'none') {
      let seen = this.selectionMode === 'none';
      for (const el of els) {
        if (el.selected) {
          if (seen) el.selected = false;
          seen = true;
        }
      }
    }
    if (this.selectedIndex >= 0 && !els.some((e) => e.selected) && this.selectedIndex < els.length) {
      const el = els[this.selectedIndex];
      if (el) el.selected = true;
    }
    this.syncedIndex = this.selectedIndices[0] ?? -1;
    this.selectedIndex = this.syncedIndex;
    this.syncRoving();
    this.syncEmpty();
  }

  private stickyQueued = false;
  private queueStickyHeaders(): void {
    if (this.stickyQueued || !this.headerTag) return;
    this.stickyQueued = true;
    requestAnimationFrame(() => {
      this.stickyQueued = false;
      this.updateStickyHeaders();
    });
  }

  protected updateStickyHeaders(): void {
    const tag = this.headerTag;
    if (!tag) return;
    const headers = Array.from(this.children).filter(
      (c) => c.localName === tag && !c.hasAttribute('not-sticky'),
    ) as HTMLElement[];
    if (!headers.length) return;
    const top = this.scroller.scrollTop;
    const base = this.scroller.getBoundingClientRect().top - top;
    const pos = headers.map((h) => {
      const t = h.style.transform;
      h.style.transform = '';
      const y = h.getBoundingClientRect().top - base;
      h.style.transform = t;
      return y;
    });
    let current = -1;
    for (let i = 0; i < headers.length; i++) if (pos[i]! <= top) current = i;
    headers.forEach((h, i) => {
      if (i !== current || top <= 0) {
        h.style.transform = '';
        h.removeAttribute('data-stuck');
        return;
      }
      let dy = top - pos[i]!;
      const nextTop = pos[i + 1];
      if (nextTop !== undefined) dy = Math.min(dy, nextTop - pos[i]! - h.offsetHeight);
      h.style.transform = `translateY(${Math.max(0, dy)}px)`;
      h.toggleAttribute('data-stuck', dy > 0);
    });
  }

  private syncEmpty(): void {
    this.toggleAttribute(
      'data-empty',
      this.count === 0 && !!(this.placeholder || this.querySelector(':scope > [slot="empty"]')),
    );
  }

  protected syncRoving(): void {
    const els = this.renderedElements();
    if (!els.length) return;
    let target = this.containerFromIndex(this.focusIndex);
    if (!target) target = this.containerFromIndex(this.selectedIndices[0] ?? -1);
    if (!target) target = els.find((e) => !e.disabled) ?? els[0]!;
    for (const el of els) el.tabIndex = el === target ? 0 : -1;
  }

  protected renderData(reset: boolean): void {
    if (!this._items) return;
    if (reset) {
      for (const el of this.renderedElements()) el.remove();
      this.rendered.clear();
      this.windowStart = 0;
      this.windowEnd = 0;
    }
    this.virtual = this._items.length > VIRTUALIZE_THRESHOLD && this.listLayout !== 'horizontal';
    if (!this.virtual) {
      this.spacerBefore.style.height = '0px';
      this.spacerAfter.style.height = '0px';
      this.renderRange(0, this._items.length);
    } else {
      if (!this.rowSize) {
        this.renderRange(0, Math.min(this._items.length, 20));
        this.measure();
      }
      this.renderWindow();
    }
    this.syncRoving();
    this.syncEmpty();
  }

  private createContainer(i: number): ListItemBase {
    const item = this._items![i];
    const el = document.createElement(this.itemTag) as ListItemBase;
    el.setAttribute('data-w-generated', '');
    el.dataItem = item;
    el.dataIndex = i;
    el.setAttribute('data-mode', this.selectionMode);
    el.setAttribute('aria-posinset', String(i + 1));
    el.setAttribute('aria-setsize', String(this._items!.length));
    if (item === null || item === undefined) {
      el.innerHTML = NULL_ITEM_HTML;
    } else if (this._renderItem) {
      const r = this._renderItem(item, i);
      if (typeof r === 'string') el.innerHTML = r;
      else el.append(r);
    } else {
      el.innerHTML = escapeHtml(defaultItemText(item));
    }
    el.setAttribute('data-search', defaultItemText(item));
    if (this.dataSel.has(i)) el.selected = true;
    this.prepareContainer(el, item, i);
    return el;
  }

  protected prepareContainer(_el: ListItemBase, _item: unknown, _index: number): void {}

  private renderRange(start: number, end: number): void {
    for (const [i, el] of this.rendered) {
      if (i < start || i >= end) {
        if (el.matches(':focus-within')) continue;
        el.remove();
        this.rendered.delete(i);
      }
    }
    let prev: ListItemBase | null = null;
    for (let i = start; i < end; i++) {
      let el = this.rendered.get(i);
      if (!el) {
        el = this.createContainer(i);
        this.rendered.set(i, el);
        if (prev) prev.after(el);
        else {
          let next: ListItemBase | null = null;
          for (const [j, e] of this.rendered) if (j > i && e !== el && (!next || j < next.dataIndex)) next = e;
          if (next && next.parentElement === this) next.before(el);
          else this.append(el);
        }
      }
      prev = el;
    }
    this.windowStart = start;
    this.windowEnd = end;
  }

  private measure(): void {
    const first = this.renderedElements()[0];
    if (!first) return;
    const cs = getComputedStyle(first);
    const r = first.getBoundingClientRect();
    const h = r.height + (Number.parseFloat(cs.marginTop) || 0) + (Number.parseFloat(cs.marginBottom) || 0);
    const w = r.width + (Number.parseFloat(cs.marginLeft) || 0) + (Number.parseFloat(cs.marginRight) || 0);
    this.rowSize = Math.max(1, h);
    this.colCount =
      this.listLayout === 'grid' ? Math.max(1, Math.floor((this.itemsHost.clientWidth + 0.5) / Math.max(1, w))) : 1;
  }

  private renderWindow(): void {
    if (!this._items || !this.virtual) return;
    const n = this._items.length;
    const h = this.rowSize || 40;
    const cols = this.colCount;
    const rows = Math.ceil(n / cols);
    const headerH = (this.renderRoot.querySelector('.header') as HTMLElement | null)?.offsetHeight ?? 0;
    const top = Math.max(0, this.scroller.scrollTop - headerH);
    const view = this.scroller.clientHeight || 400;
    const startRow = Math.max(0, Math.floor(top / h) - OVERSCAN_ROWS);
    const endRow = Math.min(rows, Math.ceil((top + view) / h) + OVERSCAN_ROWS);
    const start = startRow * cols;
    const end = Math.min(n, endRow * cols);
    if (start === this.windowStart && end === this.windowEnd && this.rendered.size) return;
    this.spacerBefore.style.height = `${startRow * h}px`;
    this.spacerAfter.style.height = `${Math.max(0, rows - endRow) * h}px`;
    this.renderRange(start, end);
    this.syncRoving();
  }

  scrollIntoViewIndex(i: number, block: ScrollLogicalPosition = 'nearest'): void {
    if (i < 0 || i >= this.count) return;
    if (this.virtual) {
      const h = this.rowSize || 40;
      const row = Math.floor(i / this.colCount);
      const headerH = (this.renderRoot.querySelector('.header') as HTMLElement | null)?.offsetHeight ?? 0;
      const y = headerH + row * h;
      const st = this.scroller.scrollTop;
      const view = this.scroller.clientHeight;
      if (block === 'start' || y < st) this.scroller.scrollTop = y;
      else if (y + h > st + view) this.scroller.scrollTop = y + h - view;
      this.renderWindow();
    }
    const el = this.containerFromIndex(i);
    if (el) scrollIntoViewWithin(this.scroller, el, this.listLayout === 'horizontal' ? 'x' : 'y');
  }

  protected columns(): number {
    if (this.listLayout !== 'grid') return 1;
    const els = this.renderedElements();
    if (els.length < 2) return 1;
    const top0 = els[0]!.offsetTop;
    let c = 0;
    for (const el of els) {
      if (Math.abs(el.offsetTop - top0) > 2) break;
      c++;
    }
    return Math.max(1, c);
  }

  protected pageSize(): number {
    const h = this.rowSize || this.renderedElements()[0]?.offsetHeight || 40;
    return Math.max(1, Math.floor((this.scroller.clientHeight || 400) / h) * this.columns());
  }

  protected geometricTarget(key: string, i: number): number {
    const cur = this.containerFromIndex(i);
    if (!cur) return -1;
    const a = cur.getBoundingClientRect();
    const ax = a.left + a.width / 2;
    const ay = a.top + a.height / 2;
    let best = -1;
    let bestScore = Number.POSITIVE_INFINITY;
    for (let k = 0; k < this.count; k++) {
      if (k === i) continue;
      const el = this.containerFromIndex(k);
      if (!el || el.disabled) continue;
      const r = el.getBoundingClientRect();
      const bx = r.left + r.width / 2;
      const by = r.top + r.height / 2;
      const dx = bx - ax;
      const dy = by - ay;
      let ok = false;
      let primary = 0;
      let secondary = 0;
      if (key === 'ArrowRight') {
        ok = dx > 1 && Math.abs(dy) < a.height / 2;
        primary = dx;
        secondary = Math.abs(dy);
      } else if (key === 'ArrowLeft') {
        ok = dx < -1 && Math.abs(dy) < a.height / 2;
        primary = -dx;
        secondary = Math.abs(dy);
      } else if (key === 'ArrowDown') {
        ok = r.top >= a.bottom - 1;
        primary = dy;
        secondary = Math.abs(dx);
      } else if (key === 'ArrowUp') {
        ok = r.bottom <= a.top + 1;
        primary = -dy;
        secondary = Math.abs(dx);
      }
      if (!ok) continue;
      const score = primary * 2 + secondary * 3;
      if (score < bestScore) {
        bestScore = score;
        best = k;
      }
    }
    return best < 0 ? i : best;
  }

  protected get geometricNavigation(): boolean {
    return false;
  }

  protected navTarget(key: string, i: number): number {
    if (this.geometricNavigation && key.startsWith('Arrow')) return this.geometricTarget(key, i);
    const n = this.count;
    const axis = this.listLayout === 'grid' ? 'grid' : this.listLayout === 'horizontal' ? 'horizontal' : 'vertical';
    let next = navigateIndex(key, i, n, {
      axis,
      columns: () => this.columns(),
      page: this.pageSize(),
      rtl: isRtl(this),
    });
    if (next < 0) return -1;
    const dir = next >= i ? 1 : -1;
    let guard = 0;
    while (next >= 0 && next < n && this.isDisabledIndex(next) && guard++ < n) next += dir;
    if (next < 0 || next >= n) return i;
    return next;
  }

  private focusIndexAndScroll(i: number): ListItemBase | null {
    this.scrollIntoViewIndex(i);
    const el = this.containerFromIndex(i);
    if (el) {
      this.focusIndex = i;
      this.syncRoving();
      scrollIntoViewWithin(this.scroller, el, this.listLayout === 'horizontal' ? 'x' : 'y');
      el.focus();
    }
    return el;
  }

  protected onKeyDown(ev: KeyboardEvent): void {
    const item = this.itemFromTarget(ev.target);
    if (!item || ev.target !== item || this.disabled) return;
    const i = this.indexOf(item);
    const mode = this.selectionMode;

    if (NAV_KEYS.has(ev.key)) {
      const next = this.navTarget(ev.key, i);
      if (next < 0) return;
      ev.preventDefault();
      if (next === i) return;
      this.focusIndexAndScroll(next);
      if (mode === 'single' && this.singleSelectionFollowsFocus && !ev.ctrlKey) {
        this.change(() => this.selectOnly(next));
      } else if (mode === 'extended') {
        if (ev.shiftKey) {
          if (this.anchorIndex < 0) this.anchorIndex = i;
          this.change(() => this.selectRangeInternal(this.anchorIndex, next, ev.ctrlKey));
        } else if (!ev.ctrlKey) {
          this.anchorIndex = next;
          this.change(() => this.selectOnly(next));
        }
      }
      return;
    }

    if (ev.key === ' ' || ev.key === 'Enter') {
      ev.preventDefault();
      if (ev.key === 'Enter') this.onItemInvoked(i, item);
      if (mode === 'single') {
        if (ev.ctrlKey && this.isSelectedIndex(i)) this.change(() => this.clearAll());
        else this.change(() => this.selectOnly(i));
      } else if (mode === 'multiple') {
        this.change(() => this.setSel(i, !this.isSelectedIndex(i)));
      } else if (mode === 'extended') {
        if (ev.shiftKey && this.anchorIndex >= 0) {
          this.change(() => this.selectRangeInternal(this.anchorIndex, i, ev.ctrlKey));
        } else if (ev.ctrlKey) {
          this.anchorIndex = i;
          this.change(() => this.setSel(i, !this.isSelectedIndex(i)));
        } else {
          this.anchorIndex = i;
          this.change(() => this.selectOnly(i));
        }
      }
      return;
    }

    if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'a' && (mode === 'multiple' || mode === 'extended')) {
      ev.preventDefault();
      this.selectAll();
      return;
    }

    if (ev.key.length === 1 && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
      const labels: string[] = [];
      for (let k = 0; k < this.count; k++) {
        const it = this._items ? this._items[k] : null;
        labels.push(this._items ? defaultItemText(it) : (this.containerFromIndex(k)?.searchText ?? ''));
      }
      const hit = this.typeahead.match(ev.key, labels, i);
      if (hit >= 0 && hit !== i) {
        ev.preventDefault();
        this.focusIndexAndScroll(hit);
        if (mode === 'single' && this.singleSelectionFollowsFocus) this.change(() => this.selectOnly(hit));
        else if (mode === 'extended') {
          this.anchorIndex = hit;
          this.change(() => this.selectOnly(hit));
        }
      }
    }
  }

  protected onItemInvoked(i: number, el: ListItemBase): void {
    if (this.itemClickEnabled) this.emit<ItemClickDetail>('itemclick', { item: this.itemAt(i), index: i, element: el });
  }

  protected onClick(ev: MouseEvent): void {
    if (this.suppressClick) {
      this.suppressClick = false;
      ev.stopPropagation();
      return;
    }
    const item = this.itemFromTarget(ev.target);
    if (!item || item.disabled || this.disabled) return;
    const i = this.indexOf(item);
    if (i < 0) return;
    this.focusIndex = i;
    this.onItemInvoked(i, item);
    const mode = this.selectionMode;
    if (mode === 'single') {
      if (ev.ctrlKey && this.isSelectedIndex(i)) this.change(() => this.clearAll());
      else this.change(() => this.selectOnly(i));
    } else if (mode === 'multiple') {
      this.change(() => this.setSel(i, !this.isSelectedIndex(i)));
    } else if (mode === 'extended') {
      if (ev.shiftKey && this.anchorIndex >= 0) {
        this.change(() => this.selectRangeInternal(this.anchorIndex, i, ev.ctrlKey || ev.metaKey));
      } else if (ev.ctrlKey || ev.metaKey) {
        this.anchorIndex = i;
        this.change(() => this.setSel(i, !this.isSelectedIndex(i)));
      } else {
        this.anchorIndex = i;
        this.change(() => this.selectOnly(i));
      }
    }
    this.syncRoving();
  }

  private onPointerDown(ev: PointerEvent): void {
    if (!this.canReorderItems || ev.button !== 0 || this.disabled || this.virtual) return;
    const item = this.itemFromTarget(ev.target);
    if (!item || item.disabled) return;
    const r = item.getBoundingClientRect();
    this.drag = {
      el: item,
      pointerId: ev.pointerId,
      startX: ev.clientX,
      startY: ev.clientY,
      grabX: ev.clientX - r.left,
      grabY: ev.clientY - r.top,
      from: this.indexOf(item),
      active: false,
    };
  }

  private onPointerMove(ev: PointerEvent): void {
    const d = this.drag;
    if (!d || d.pointerId !== ev.pointerId) return;
    if (!(ev.buttons & 1)) {
      this.onPointerUp(ev);
      return;
    }
    if (!d.active) {
      if (Math.hypot(ev.clientX - d.startX, ev.clientY - d.startY) < 6) return;
      d.active = true;
      this.setPointerCapture(ev.pointerId);
      d.el.setAttribute('data-w-dragging', '');
      d.el.style.transition = 'none';
    }
    ev.preventDefault();
    const els = this.renderedElements().filter((e) => e !== d.el);
    let target: ListItemBase | null = null;
    let after = false;
    for (const e of els) {
      const r = e.getBoundingClientRect();
      if (ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom) {
        target = e;
        after = this.listLayout === 'vertical' ? ev.clientY > r.top + r.height / 2 : ev.clientX > r.left + r.width / 2;
        break;
      }
    }
    if (target) {
      const ref = after ? target.nextElementSibling : target;
      if (ref !== d.el && (after ? target.nextElementSibling !== d.el : target.previousElementSibling !== d.el)) {
        flip(
          els,
          () => {
            if (after) target!.after(d.el);
            else target!.before(d.el);
          },
          durations.fast,
        );
      }
    }
    d.el.style.transform = 'none';
    const base = d.el.getBoundingClientRect();
    d.el.style.transform = `translate(${ev.clientX - d.grabX - base.left}px, ${ev.clientY - d.grabY - base.top}px)`;
  }

  private onPointerUp(ev: PointerEvent, cancelled = false): void {
    const d = this.drag;
    if (!d || d.pointerId !== ev.pointerId) return;
    this.drag = null;
    if (!d.active) return;
    this.suppressClick = true;
    setTimeout(() => (this.suppressClick = false), 0);
    const el = d.el;
    const seen = el.getBoundingClientRect();
    el.style.transform = '';
    el.removeAttribute('data-w-dragging');
    el.style.transition = '';
    if (cancelled) {
      const others = this.renderedElements().filter((e) => e !== el);
      const ref = others[d.from] ?? null;
      if (ref !== el.nextElementSibling) {
        flip(others, () => (ref ? ref.before(el) : others.at(-1)?.after(el)), durations.fast);
      }
    }
    const home = el.getBoundingClientRect();
    void settled(
      animate(
        el,
        [{ transform: `translate(${seen.left - home.left}px, ${seen.top - home.top}px)` }, { transform: 'none' }],
        {
          duration: durations.fast,
          easing: easings.decelerate,
        },
      ),
    );
    const els = this.renderedElements();
    const to = els.indexOf(el);
    if (cancelled || to === d.from || to < 0) return;
    if (this._items) {
      const [moved] = this._items.splice(d.from, 1);
      this._items.splice(to, 0, moved);
      const sel = [...this.dataSel].map((i) =>
        i === d.from ? to : i > d.from && i <= to ? i - 1 : i < d.from && i >= to ? i + 1 : i,
      );
      this.dataSel = new Set(sel);
      els.forEach((e, k) => {
        e.dataIndex = k;
        e.dataItem = this._items![k];
      });
      this.rendered = new Map(els.map((e, k) => [k, e]));
    }
    els.forEach((e, k) => {
      e.setAttribute('aria-posinset', String(k + 1));
    });
    this.focusIndex = to;
    this.syncRoving();
    this.emit<ReorderDetail>('reorder', { from: d.from, to, item: this.itemAt(to) });
    this.emit('dragitemscompleted', { from: d.from, to, item: this.itemAt(to) });
  }
}
