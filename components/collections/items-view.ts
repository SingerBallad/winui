import { WinElement, escapeHtml, type PropDefs } from '../../base/element.ts';
import { css, scrollbars } from '../../base/css.ts';
import { itemAdded } from '../../motion/animate.ts';
import {
  CHECKBOX_GLYPH,
  checkBoxGlyphCss,
  defaultItemText,
  ListBase,
  ListItemBase,
  listHostCss,
  NULL_ITEM_HTML,
  upgradeProperty,
  type ItemRenderer,
  type ListLayout,
} from './list-core.ts';

export const itemContainerCss = css`
:host {
  display: flex;
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-primary);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
  transition: opacity var(--w-duration-fast) var(--w-ease-decelerate);
}
.content {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  display: flex;
  border-radius: inherit;
  overflow: hidden;
}
::slotted(*) { flex: 1 1 auto; min-width: 0; }
.selection {
  position: absolute;
  inset: 0;
  border: 3px solid var(--w-accent-fill-color-default);
  border-radius: inherit;
  opacity: 0;
  transform: scale(1.04);
  pointer-events: none;
  transition:
    opacity var(--w-duration-fast) var(--w-ease-decelerate),
    transform var(--w-duration-fast) var(--w-ease-decelerate);
}
.common {
  position: absolute;
  inset: 0;
  border: 1px solid transparent;
  border-radius: inherit;
  background-color: transparent;
  pointer-events: none;
  transition:
    inset var(--w-duration-fast) var(--w-ease-decelerate),
    border-color var(--w-duration-fast) var(--w-ease-decelerate),
    background-color var(--w-duration-faster) linear;
}
:host(:hover) .common { background-color: var(--w-subtle-fill-color-secondary); }
:host(:active) .common { background-color: var(--w-subtle-fill-color-tertiary); }
:host([selected]:not([data-mode="none"])) .selection { opacity: 1; transform: none; }
:host([selected]:not([data-mode="none"])) .common {
  inset: 2px;
  border-radius: 2px;
  border-color: var(--w-control-solid-fill-color-default);
}
:host([selected]:hover) .common { background-color: var(--w-subtle-fill-color-secondary); }
:host([selected]:active) .common { background-color: var(--w-subtle-fill-color-tertiary); }
.check {
  position: absolute;
  top: 4px;
  inset-inline-end: 4px;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  border-radius: var(--w-corner-radius-control);
  border: 1px solid var(--w-control-strong-stroke-color-default);
  background-color: var(--w-control-on-image-fill-color-default);
  color: var(--w-text-on-accent-fill-color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transform: scale(0.7);
  pointer-events: none;
  transition:
    opacity var(--w-duration-fast) var(--w-ease-decelerate),
    transform var(--w-duration-fast) var(--w-ease-decelerate),
    background-color var(--w-duration-faster) linear,
    border-color var(--w-duration-faster) linear;
}
${checkBoxGlyphCss}
:host([data-mode="multiple"]) .check { opacity: 1; transform: none; }
:host([data-mode="multiple"][selected]) .check { background-color: var(--w-accent-fill-color-default); border-color: var(--w-accent-fill-color-default); }
:host([data-mode="multiple"][selected]) .check .cb-check { stroke-dashoffset: 0; }
.focus { position: absolute; inset: -3px; border-radius: 7px; display: none; pointer-events: none; }
:host(:focus-visible) .focus {
  display: block;
  border: 2px solid var(--w-focus-stroke-color-outer);
  box-shadow: inset 0 0 0 1px var(--w-focus-stroke-color-inner);
}
:host([disabled]) { opacity: 0.3; pointer-events: none; }
:host([disabled]) .selection { display: none; }
:host([data-w-dragging]) { box-shadow: var(--w-elevation-flyout); }
`;

export class WinItemContainer extends ListItemBase {
  static override styles = [itemContainerCss];
  static override template = `<div class="content" part="content"><slot></slot></div><div class="selection" part="selection-visual"></div><div class="common" part="common-visual"></div><div class="check" part="checkbox">${CHECKBOX_GLYPH}</div><div class="focus" part="focus"></div>`;
  static override props: PropDefs = {
    aspect: { type: Number, default: 0 },
  };
  declare aspect: number;
  static {
    this.define('win-item-container');
  }
  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    if (changed.has('aspect')) {
      if (this.aspect > 0) this.style.setProperty('--w-aspect', String(this.aspect));
      else this.style.removeProperty('--w-aspect');
    }
  }
}

const layoutCss = (panel: string) => `
:host([layout="stack"]) ${panel}, :host(:not([layout])) ${panel} {
  display: flex;
  flex-direction: column;
  gap: var(--w-spacing, 0px);
}
:host([layout="stack"][orientation="horizontal"]) ${panel} { flex-direction: row; }
:host([layout="uniform-grid"]) ${panel} {
  display: grid;
  grid-template-columns: repeat(auto-fill, var(--w-min-item-width, 100px));
  grid-auto-rows: minmax(var(--w-min-item-height, auto), auto);
  gap: var(--w-min-row-spacing, 4px) var(--w-min-column-spacing, 4px);
  justify-content: start;
}
:host([layout="uniform-grid"][items-stretch="fill"]) ${panel},
:host([layout="uniform-grid"][items-stretch="uniform"]) ${panel} {
  grid-template-columns: repeat(auto-fill, minmax(var(--w-min-item-width, 100px), 1fr));
}
:host([layout="lined-flow"]) ${panel}, :host([layout="flow"]) ${panel} {
  display: flex;
  flex-wrap: wrap;
  gap: var(--w-line-spacing, 4px) var(--w-min-item-spacing, 4px);
  align-content: flex-start;
}
:host([layout="lined-flow"]) ${panel}::after { content: ''; flex: 999 1 0; }
`;

const linedItemCss = (item: string) => `
:host([layout="lined-flow"]) ::slotted(${item}) {
  height: var(--w-line-height, 160px);
  flex: var(--w-aspect, 1) 1 calc(var(--w-line-height, 160px) * var(--w-aspect, 1));
  max-width: 100%;
}
`;

const itemsViewCss = css`
${layoutCss('.items')}
${linedItemCss('win-item-container')}
:host([layout="uniform-grid"]) ::slotted(win-item-container) { min-height: var(--w-min-item-height, auto); }
.items { padding: 0; }
`;

export type ItemsLayout = 'stack' | 'uniform-grid' | 'lined-flow';

export class WinItemsView extends ListBase {
  static override styles = [scrollbars, listHostCss, itemsViewCss];
  static override props: PropDefs = {
    layout: { type: String, reflect: true, default: 'stack' },
    spacing: { type: Number, default: 0 },
    minItemWidth: { type: Number, attribute: 'min-item-width', default: 0 },
    minItemHeight: { type: Number, attribute: 'min-item-height', default: 0 },
    minRowSpacing: { type: Number, attribute: 'min-row-spacing', default: 4 },
    minColumnSpacing: { type: Number, attribute: 'min-column-spacing', default: 4 },
    itemsStretch: { type: String, attribute: 'items-stretch', reflect: true, default: 'none' },
    lineHeight: { type: Number, attribute: 'line-height', default: 160 },
    lineSpacing: { type: Number, attribute: 'line-spacing', default: 4 },
    minItemSpacing: { type: Number, attribute: 'min-item-spacing', default: 4 },
    itemInvokedEnabled: { type: Boolean, attribute: 'item-invoked-enabled' },
  };
  declare layout: ItemsLayout;
  declare spacing: number;
  declare minItemWidth: number;
  declare minItemHeight: number;
  declare minRowSpacing: number;
  declare minColumnSpacing: number;
  declare itemsStretch: string;
  declare lineHeight: number;
  declare lineSpacing: number;
  declare minItemSpacing: number;
  declare itemInvokedEnabled: boolean;

  static {
    this.define('win-items-view');
  }

  protected get itemTag(): string {
    return 'win-item-container';
  }
  protected override get listLayout(): ListLayout {
    return this.layout === 'stack' ? 'vertical' : 'grid';
  }
  protected override get geometricNavigation(): boolean {
    return this.layout !== 'stack';
  }

  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    const px = (n: number) => `${n}px`;
    if (changed.has('layout')) this.setAttribute('data-layout', this.layout === 'stack' ? 'vertical' : 'grid');
    if (changed.has('spacing')) this.style.setProperty('--w-spacing', px(this.spacing));
    if (changed.has('minItemWidth')) {
      if (this.minItemWidth > 0) this.style.setProperty('--w-min-item-width', px(this.minItemWidth));
      else this.style.removeProperty('--w-min-item-width');
    }
    if (changed.has('minItemHeight')) {
      if (this.minItemHeight > 0) this.style.setProperty('--w-min-item-height', px(this.minItemHeight));
      else this.style.removeProperty('--w-min-item-height');
    }
    if (changed.has('minRowSpacing')) this.style.setProperty('--w-min-row-spacing', px(this.minRowSpacing));
    if (changed.has('minColumnSpacing')) this.style.setProperty('--w-min-column-spacing', px(this.minColumnSpacing));
    if (changed.has('lineHeight')) this.style.setProperty('--w-line-height', px(this.lineHeight));
    if (changed.has('lineSpacing')) this.style.setProperty('--w-line-spacing', px(this.lineSpacing));
    if (changed.has('minItemSpacing')) this.style.setProperty('--w-min-item-spacing', px(this.minItemSpacing));
  }

  protected override prepareContainer(el: ListItemBase, item: unknown, _index: number): void {
    const a = (item as { aspect?: unknown } | null)?.aspect;
    if (typeof a === 'number' && a > 0) (el as WinItemContainer).aspect = a;
  }

  protected override onItemInvoked(i: number, el: ListItemBase): void {
    super.onItemInvoked(i, el);
    if (this.itemInvokedEnabled) this.emit('iteminvoked', { item: this.itemAt(i), index: i, element: el });
  }
}

const repeaterCss = css`
:host { display: block; position: relative; min-width: 0; }
.panel { position: relative; }
${layoutCss('.panel')}
${linedItemCss('[data-w-repeater-item]')}
.spacer { height: 0; pointer-events: none; }
`;

export type RepeaterLayout = 'stack' | 'uniform-grid' | 'flow' | 'lined-flow';
export type ItemTemplate = ItemRenderer;

export class WinItemsRepeater extends WinElement {
  static override styles = [repeaterCss];
  static override template = `<div class="spacer before"></div><div class="panel" part="panel"><slot></slot></div><div class="spacer after"></div>`;
  static override props: PropDefs = {
    layout: { type: String, reflect: true, default: 'stack' },
    orientation: { type: String, reflect: true, default: 'vertical' },
    spacing: { type: Number, default: 0 },
    minItemWidth: { type: Number, attribute: 'min-item-width', default: 0 },
    minItemHeight: { type: Number, attribute: 'min-item-height', default: 0 },
    minRowSpacing: { type: Number, attribute: 'min-row-spacing', default: 4 },
    minColumnSpacing: { type: Number, attribute: 'min-column-spacing', default: 4 },
    itemsStretch: { type: String, attribute: 'items-stretch', reflect: true, default: 'none' },
    lineHeight: { type: Number, attribute: 'line-height', default: 160 },
    virtualize: { type: String, default: 'auto' },
    animateItems: { type: Boolean, attribute: 'animate-items' },
  };
  declare layout: RepeaterLayout;
  declare orientation: 'vertical' | 'horizontal';
  declare spacing: number;
  declare minItemWidth: number;
  declare minItemHeight: number;
  declare minRowSpacing: number;
  declare minColumnSpacing: number;
  declare itemsStretch: string;
  declare lineHeight: number;
  declare virtualize: string;
  declare animateItems: boolean;

  static {
    this.define('win-items-repeater');
  }

  private _items: unknown[] = [];
  private _template: ItemTemplate | null = null;
  private realized = new Map<number, HTMLElement>();
  private scrollHost: HTMLElement | Window | null = null;
  private itemExtent = 0;
  private cols = 1;
  private onScroll = () => this.renderWindow();
  private ro: ResizeObserver | null = null;
  private first = true;

  get items(): unknown[] {
    return this._items;
  }
  set items(v: unknown[] | null) {
    this._items = v ? Array.from(v) : [];
    this.itemExtent = 0;
    if (this.isInitialized) this.reset();
  }

  get itemTemplate(): ItemTemplate | null {
    return this._template;
  }
  set itemTemplate(fn: ItemTemplate | null) {
    this._template = fn;
    if (this.isInitialized) this.reset();
  }

  tryGetElement(i: number): HTMLElement | null {
    return this.realized.get(i) ?? null;
  }

  getElementIndex(el: Element): number {
    const host = el.closest('[data-w-repeater-item]') as HTMLElement | null;
    return host ? Number(host.dataset.index) : -1;
  }

  protected override firstConnected(): void {
    this.setAttribute('role', this.getAttribute('role') ?? 'list');
    this.ro = new ResizeObserver(() => {
      this.itemExtent = 0;
      this.renderWindow();
    });
    this.ro.observe(this);
    upgradeProperty(this, 'itemTemplate');
    upgradeProperty(this, 'items');
  }

  protected override connected(): void {
    this.attachScroll();
    if (this.isInitialized && !this.first) this.renderWindow();
  }

  protected override disconnected(): void {
    this.detachScroll();
  }

  protected override updated(changed: Set<string>, first = false): void {
    const px = (n: number) => `${n}px`;
    if (changed.has('spacing')) this.style.setProperty('--w-spacing', px(this.spacing));
    if (changed.has('minItemWidth')) {
      if (this.minItemWidth > 0) this.style.setProperty('--w-min-item-width', px(this.minItemWidth));
      else this.style.removeProperty('--w-min-item-width');
    }
    if (changed.has('minItemHeight')) {
      if (this.minItemHeight > 0) this.style.setProperty('--w-min-item-height', px(this.minItemHeight));
      else this.style.removeProperty('--w-min-item-height');
    }
    if (changed.has('minRowSpacing')) this.style.setProperty('--w-min-row-spacing', px(this.minRowSpacing));
    if (changed.has('minColumnSpacing')) this.style.setProperty('--w-min-column-spacing', px(this.minColumnSpacing));
    if (changed.has('lineHeight')) this.style.setProperty('--w-line-height', px(this.lineHeight));
    if (first) {
      this.first = false;
      this.reset();
    } else if (changed.has('layout') || changed.has('orientation') || changed.has('virtualize')) {
      this.reset();
    }
  }

  private get isVirtual(): boolean {
    if (this.virtualize === 'false' || this.virtualize === 'off') return false;
    const capable = (this.layout === 'stack' && this.orientation !== 'horizontal') || this.layout === 'uniform-grid';
    if (!capable) return false;
    if (this.virtualize === 'true' || this.virtualize === 'on') return true;
    return this._items.length > 200;
  }

  private findScrollHost(): HTMLElement | Window {
    let n: Node | null = this;
    while (n) {
      const parent: Node | null = n instanceof ShadowRoot ? n.host : ((n as Element).assignedSlot ?? n.parentNode);
      if (parent instanceof HTMLElement) {
        const oy = getComputedStyle(parent).overflowY;
        if (oy === 'auto' || oy === 'scroll' || oy === 'overlay') return parent;
      }
      n = parent;
    }
    return window;
  }

  private attachScroll(): void {
    this.detachScroll();
    this.scrollHost = this.findScrollHost();
    this.scrollHost.addEventListener('scroll', this.onScroll, { passive: true });
  }

  private detachScroll(): void {
    this.scrollHost?.removeEventListener('scroll', this.onScroll);
    this.scrollHost = null;
  }

  private reset(): void {
    for (const [i, el] of this.realized) this.clearElement(i, el);
    this.realized.clear();
    this.attachScroll();
    if (!this.isVirtual) {
      this.$('.spacer.before').style.height = '0px';
      this.$('.spacer.after').style.height = '0px';
      this.realize(0, this._items.length);
      return;
    }
    this.realize(0, Math.min(this._items.length, 24));
    this.measure();
    this.renderWindow();
  }

  private makeElement(i: number): HTMLElement {
    const item = this._items[i];
    const wrap = document.createElement('div');
    wrap.setAttribute('data-w-repeater-item', '');
    wrap.dataset.index = String(i);
    if (this.getAttribute('role') === 'list') wrap.setAttribute('role', 'listitem');
    if (item === null || item === undefined) wrap.innerHTML = NULL_ITEM_HTML;
    else if (this._template) {
      const r = this._template(item, i);
      if (typeof r === 'string') wrap.innerHTML = r;
      else wrap.append(r);
    } else wrap.innerHTML = escapeHtml(defaultItemText(item));
    const aspect = (item as { aspect?: number } | null)?.aspect;
    if (typeof aspect === 'number' && aspect > 0) wrap.style.setProperty('--w-aspect', String(aspect));
    return wrap;
  }

  private clearElement(i: number, el: HTMLElement): void {
    this.emit('elementclearing', { element: el, index: i }, { bubbles: false });
    el.remove();
  }

  private realize(start: number, end: number): void {
    for (const [i, el] of this.realized) {
      if (i < start || i >= end) {
        this.clearElement(i, el);
        this.realized.delete(i);
      }
    }
    let prev: HTMLElement | null = null;
    for (let i = start; i < end; i++) {
      let el = this.realized.get(i);
      if (!el) {
        el = this.makeElement(i);
        if (prev) prev.after(el);
        else {
          const firstExisting = [...this.realized.entries()].filter(([j]) => j > i).sort((a, b) => a[0] - b[0])[0];
          if (firstExisting) firstExisting[1].before(el);
          else this.append(el);
        }
        this.realized.set(i, el);
        this.emit('elementprepared', { element: el, index: i }, { bubbles: false });
        if (this.animateItems) itemAdded(el);
      }
      prev = el;
    }
  }

  private measure(): void {
    const first = this.realized.get(0) ?? [...this.realized.values()][0];
    if (!first) return;
    const h = first.getBoundingClientRect().height;
    if (this.layout === 'uniform-grid') {
      const gap = this.minRowSpacing;
      this.itemExtent = h + gap;
      const panel = this.$('.panel');
      const w = first.getBoundingClientRect().width + this.minColumnSpacing;
      this.cols = Math.max(1, Math.floor((panel.clientWidth + this.minColumnSpacing) / Math.max(1, w)));
    } else {
      this.itemExtent = h + this.spacing;
      this.cols = 1;
    }
  }

  private renderWindow(): void {
    if (!this.isConnected || !this.isVirtual || !this._items.length) return;
    if (!this.itemExtent) this.measure();
    const ext = this.itemExtent || 40;
    const host = this.scrollHost ?? window;
    const pr = this.getBoundingClientRect();
    let viewTop: number;
    let viewH: number;
    if (host === window) {
      viewTop = -pr.top;
      viewH = innerHeight;
    } else {
      const hr = (host as HTMLElement).getBoundingClientRect();
      viewTop = hr.top - pr.top;
      viewH = (host as HTMLElement).clientHeight;
    }
    const rows = Math.ceil(this._items.length / this.cols);
    const startRow = Math.max(0, Math.floor(viewTop / ext) - 4);
    const endRow = Math.min(rows, Math.ceil((viewTop + viewH) / ext) + 4);
    const start = startRow * this.cols;
    const end = Math.min(this._items.length, endRow * this.cols);
    const gapAdjust = this.layout === 'uniform-grid' ? this.minRowSpacing : this.spacing;
    this.$('.spacer.before').style.height = `${Math.max(0, startRow * ext - (startRow ? gapAdjust : 0))}px`;
    this.$('.spacer.after').style.height = `${Math.max(0, (rows - endRow) * ext - (rows - endRow ? gapAdjust : 0))}px`;
    this.realize(start, end);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-items-view': WinItemsView;
    'win-item-container': WinItemContainer;
    'win-items-repeater': WinItemsRepeater;
  }
}
