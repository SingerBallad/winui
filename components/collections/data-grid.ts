import { WinElement, escapeHtml, uid, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { clamp } from '../../base/dom.ts';
import { animate, durations, easings } from '../../motion/animate.ts';
import { miniCheckCss } from '../input/shared.ts';

export type DataGridValue = unknown;
export type DataGridItem = Record<string, unknown>;

export interface DataGridColumn {
  key: string;
  header: string;
  width?: number | string;
  minWidth?: number;
  maxWidth?: number;
  sortable?: boolean;
  resizable?: boolean;
  editable?: boolean;
  align?: 'start' | 'center' | 'end';
  type?: 'text' | 'number' | 'boolean' | 'date';
  format?: (value: DataGridValue, item: DataGridItem) => string;
  render?: (value: DataGridValue, item: DataGridItem, cell: HTMLElement) => string | Node | undefined;
  compare?: (a: DataGridValue, b: DataGridValue) => number;
}

type SortDir = 'ascending' | 'descending' | null;

const ROW_STANDARD = 40;
const ROW_COMPACT = 32;
const INSET = 4;
const OVERSCAN = 6;

const gridCss = css`
:host {
  display: block;
  position: relative;
  box-sizing: border-box;
  height: 360px;
  border: 1px solid var(--w-card-stroke-color-default);
  border-radius: var(--w-corner-radius-overlay);
  background: var(--w-data-grid-background, var(--w-solid-background-fill-color-quarternary));
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  overflow: hidden;
}
.grid {
  position: absolute;
  inset: 0;
  overflow: auto;
  outline: none;
  scrollbar-width: thin;
  scrollbar-color: var(--w-control-strong-fill-color-default) transparent;
}
.header {
  position: sticky;
  top: 0;
  z-index: 3;
  display: grid;
  grid-template-columns: var(--cols);
  box-sizing: border-box;
  min-width: calc(var(--total) + ${INSET * 2}px);
  height: 36px;
  padding: 0 ${INSET}px;
  background: var(--w-data-grid-background, var(--w-solid-background-fill-color-quarternary));
  border-bottom: 1px solid var(--w-divider-stroke-color-default);
}
:host([header-visible="false"]) .header { display: none; }
.hcell {
  position: relative;
  display: flex;
  align-items: center;
  gap: 4px;
  min-width: 0;
  padding: 0 12px;
  font: var(--w-type-body-strong);
  color: var(--w-text-fill-color-primary);
  white-space: nowrap;
  user-select: none;
  cursor: default;
  border-radius: var(--w-corner-radius-control);
  margin: 2px 0;
}
.hcell[data-sortable]:hover { background: var(--w-subtle-fill-color-secondary); }
.hcell[data-sortable]:active { background: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-secondary); }
.hcell[data-align="center"] { justify-content: center; }
.hcell[data-align="end"] { justify-content: flex-end; }
.hcell .h-text { overflow: hidden; text-overflow: ellipsis; }
.hcell .sort { display: inline-flex; color: var(--w-text-fill-color-secondary); opacity: 0; transition: opacity var(--w-duration-faster) linear, rotate var(--w-duration-normal) var(--w-ease-decelerate); }
.hcell[aria-sort="ascending"] .sort, .hcell[aria-sort="descending"] .sort { opacity: 1; }
.hcell[aria-sort="descending"] .sort { rotate: 180deg; }
.hcell .grip {
  position: absolute;
  top: 0;
  bottom: 0;
  right: -5px;
  width: 9px;
  z-index: 2;
  cursor: col-resize;
}
.hcell .grip::after {
  content: '';
  position: absolute;
  left: 4px;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: var(--w-divider-stroke-color-default);
}
.hcell .grip:hover::after, .hcell .grip[data-active]::after { background: var(--w-control-strong-stroke-color-default); top: 4px; bottom: 4px; }
.hcell:last-child .grip { right: 0; }
.hcell[data-dragging] { opacity: 0.4; }
.drop-marker {
  position: absolute;
  top: 4px;
  bottom: 4px;
  width: 2px;
  margin-left: -1px;
  border-radius: 1px;
  background: var(--w-accent-fill-color-default);
  display: none;
  z-index: 4;
}
.ghost {
  position: fixed;
  z-index: 2147483000;
  pointer-events: none;
  padding: 0 12px;
  height: 32px;
  display: flex;
  align-items: center;
  font: var(--w-type-body-strong);
  border-radius: var(--w-corner-radius-control);
  border: 1px solid var(--w-surface-stroke-color-flyout);
  background: var(--w-solid-background-fill-color-quarternary);
  box-shadow: var(--w-elevation-tooltip);
  color: var(--w-text-fill-color-primary);
}
.body {
  position: relative;
  min-width: calc(var(--total) + ${INSET * 2}px);
}
.row {
  position: absolute;
  left: ${INSET}px;
  right: ${INSET}px;
  height: var(--row-h);
  display: grid;
  grid-template-columns: var(--cols);
  box-sizing: border-box;
  border-radius: var(--w-corner-radius-control);
  cursor: default;
}
:host([alternating]) .row[data-odd] { background: var(--w-subtle-fill-color-tertiary); }
.row:hover { background: var(--w-subtle-fill-color-secondary); }
.row[data-pressed] { background: var(--w-subtle-fill-color-tertiary); }
.row[aria-selected="true"] { background: var(--w-subtle-fill-color-secondary); }
.row[aria-selected="true"]:hover { background: var(--w-subtle-fill-color-tertiary); }
.row[aria-selected="true"]::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 3px;
  height: 16px;
  margin-top: -8px;
  border-radius: 1.5px;
  background: var(--w-accent-fill-color-default);
  animation: w-pill-in var(--w-duration-normal) var(--w-ease-decelerate);
}
@keyframes w-pill-in { from { transform: scaleY(0); } to { transform: scaleY(1); } }
:host([grid-lines="horizontal"]) .row::after, :host([grid-lines="all"]) .row::after {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  bottom: -1px;
  height: 1px;
  background: var(--w-divider-stroke-color-default);
  pointer-events: none;
}
.cell {
  display: flex;
  align-items: center;
  min-width: 0;
  padding: 0 12px;
  box-sizing: border-box;
  overflow: hidden;
  white-space: nowrap;
}
.cell > .text { overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.cell[data-align="center"] { justify-content: center; }
.cell[data-align="end"] { justify-content: flex-end; text-align: end; }
:host([grid-lines="vertical"]) .cell:not(:last-child), :host([grid-lines="all"]) .cell:not(:last-child) { box-shadow: inset -1px 0 0 var(--w-divider-stroke-color-default); }
.grid:focus-visible .cell[data-active] {
  outline: 2px solid var(--w-focus-stroke-color-outer);
  outline-offset: -2px;
  box-shadow: inset 0 0 0 3px var(--w-focus-stroke-color-inner);
  border-radius: var(--w-corner-radius-control);
}
:host([selection-unit="row"]) .grid:focus-visible .cell[data-active] { outline: none; box-shadow: none; }
:host([selection-unit="row"]) .grid:focus-visible .row[data-active-row] {
  outline: 2px solid var(--w-focus-stroke-color-outer);
  outline-offset: -2px;
  box-shadow: inset 0 0 0 3px var(--w-focus-stroke-color-inner);
}
.cell .w-check { flex: none; }
.cell[data-editable] .w-check { cursor: default; }
.editor {
  box-sizing: border-box;
  width: 100%;
  height: calc(var(--row-h) - 8px);
  margin: 0 -8px;
  padding: 0 7px 1px;
  font: var(--w-type-body);
  color: var(--w-text-fill-color-primary);
  border: 1px solid;
  border-color: var(--w-text-control-elevation-border-focused);
  box-shadow: inset 0 -1px 0 0 var(--w-text-control-elevation-border-focused-edge);
  border-radius: var(--w-corner-radius-control);
  background: var(--w-control-fill-color-input-active);
  outline: none;
  text-align: inherit;
}
.empty {
  position: absolute;
  left: 0;
  right: 0;
  top: 36px;
  bottom: 0;
  display: none;
  place-items: center;
  color: var(--w-text-fill-color-secondary);
  pointer-events: none;
}
:host([header-visible="false"]) .empty { top: 0; }
:host([data-empty]) .empty { display: grid; }
:host([disabled]) { pointer-events: none; opacity: 1; }
:host([disabled]) .grid { color: var(--w-text-fill-color-disabled); }
`;

export class WinDataGridColumn extends WinElement {
  static override styles = [css`:host { display: none; }`];
  static override props: PropDefs = {
    key: { type: String },
    header: { type: String },
    width: { type: String },
    minWidth: { type: Number, attribute: 'min-width', default: 0 },
    maxWidth: { type: Number, attribute: 'max-width', default: 0 },
    sortable: { type: Boolean, default: true },
    resizable: { type: Boolean, default: true },
    editable: { type: Boolean },
    align: { type: String },
    type: { type: String },
  };
  declare key: string;
  declare header: string;
  declare width: string;
  declare minWidth: number;
  declare maxWidth: number;
  declare sortable: boolean;
  declare resizable: boolean;
  declare editable: boolean;
  declare align: string;
  declare type: string;
  static {
    this.define('win-data-grid-column');
  }
  private fns: Pick<DataGridColumn, 'render' | 'format' | 'compare'> = {};
  get render(): DataGridColumn['render'] {
    return this.fns.render;
  }
  set render(fn: DataGridColumn['render']) {
    this.setFn('render', fn);
  }
  get format(): DataGridColumn['format'] {
    return this.fns.format;
  }
  set format(fn: DataGridColumn['format']) {
    this.setFn('format', fn);
  }
  get compare(): DataGridColumn['compare'] {
    return this.fns.compare;
  }
  set compare(fn: DataGridColumn['compare']) {
    this.setFn('compare', fn);
  }
  private setFn<K extends 'render' | 'format' | 'compare'>(k: K, fn: DataGridColumn[K]): void {
    if (fn) this.fns[k] = fn;
    else delete this.fns[k];
    this.parentElement?.dispatchEvent(new CustomEvent('w-columns-changed'));
  }
  protected override updated(): void {
    this.parentElement?.dispatchEvent(new CustomEvent('w-columns-changed'));
  }
  toColumn(): DataGridColumn {
    const c: DataGridColumn = { key: this.key, header: this.header || this.key };
    if (this.width) c.width = this.width;
    if (this.minWidth) c.minWidth = this.minWidth;
    if (this.maxWidth) c.maxWidth = this.maxWidth;
    c.sortable = this.sortable;
    c.resizable = this.resizable;
    c.editable = this.editable;
    if (this.align) c.align = this.align as NonNullable<DataGridColumn['align']>;
    if (this.type) c.type = this.type as NonNullable<DataGridColumn['type']>;
    if (this.fns.render) c.render = this.fns.render;
    if (this.fns.format) c.format = this.fns.format;
    if (this.fns.compare) c.compare = this.fns.compare;
    return c;
  }
}

function readPath(item: DataGridItem, key: string): DataGridValue {
  if (!key.includes('.')) return item?.[key];
  let v: unknown = item;
  for (const part of key.split('.')) v = (v as Record<string, unknown> | null)?.[part];
  return v;
}

function writePath(item: DataGridItem, key: string, value: DataGridValue): void {
  const parts = key.split('.');
  let o: Record<string, unknown> = item;
  for (const p of parts.slice(0, -1)) {
    o[p] ??= {};
    o = o[p] as Record<string, unknown>;
  }
  o[parts[parts.length - 1]!] = value;
}

const collator = new Intl.Collator(undefined, { numeric: true, sensitivity: 'base' });

export class WinDataGrid extends WinElement {
  static override styles = [miniCheckCss, gridCss];
  static override template = `<div class="grid" part="grid" role="grid" tabindex="0">
  <div class="header" part="header-row" role="row" aria-rowindex="1"></div>
  <div class="body" part="body" role="rowgroup"></div>
  <span class="drop-marker" part="drop-marker"></span>
</div>
<div class="empty" part="empty"></div>`;
  static override props: PropDefs = {
    selectionMode: { type: String, attribute: 'selection-mode', default: 'extended' },
    selectionUnit: { type: String, attribute: 'selection-unit', reflect: true, default: 'cell' },
    gridLines: { type: String, attribute: 'grid-lines', reflect: true, default: 'horizontal' },
    rowHeight: { type: String, attribute: 'row-height', default: 'standard' },
    alternating: { type: Boolean },
    readOnly: { type: Boolean, attribute: 'read-only' },
    canReorderColumns: { type: Boolean, attribute: 'can-reorder-columns', default: true },
    headerVisible: { type: Boolean, attribute: 'header-visible', reflect: true, default: true },
    emptyText: { type: String, attribute: 'empty-text', default: '没有可显示的数据' },
    disabled: { type: Boolean },
    label: { type: String },
    items: { type: Array, attribute: 'items' },
    columns: { type: Array, attribute: 'columns' },
  };
  declare selectionMode: 'none' | 'single' | 'extended';
  declare selectionUnit: 'cell' | 'row';
  declare gridLines: 'none' | 'horizontal' | 'vertical' | 'all';
  declare rowHeight: 'standard' | 'compact';
  declare alternating: boolean;
  declare readOnly: boolean;
  declare canReorderColumns: boolean;
  declare headerVisible: boolean;
  declare emptyText: string;
  declare disabled: boolean;
  declare label: string;
  declare items: DataGridItem[] | undefined;
  declare columns: DataGridColumn[] | undefined;

  private grid!: HTMLElement;
  private headerEl!: HTMLElement;
  private body!: HTMLElement;
  private cols: DataGridColumn[] = [];
  private widths: number[] = [];
  private userWidths = new Map<string, number>();
  private view: number[] = [];
  private selected = new Set<number>();
  private anchorRow = -1;
  private activeRow = 0;
  private activeCol = 0;
  private sortKey: string | null = null;
  private sortDir: SortDir = null;
  private pool = new Map<number, HTMLElement>();
  private editing: { row: number; col: number; input: HTMLInputElement; old: DataGridValue } | null = null;
  private ro: ResizeObserver | null = null;
  private idBase = uid('dg');
  private measureCtx: CanvasRenderingContext2D | null = null;

  static {
    this.define('win-data-grid');
  }

  get rowCount(): number {
    return this.items?.length ?? 0;
  }

  get selectedItems(): DataGridItem[] {
    const items = this.items ?? [];
    return [...this.selected]
      .sort((a, b) => this.view.indexOf(a) - this.view.indexOf(b))
      .map((i) => items[i]!)
      .filter(Boolean);
  }

  get selectedIndex(): number {
    if (!this.selected.size) return -1;
    return Math.min(...[...this.selected].map((i) => this.view.indexOf(i)));
  }
  set selectedIndex(i: number) {
    this.selected.clear();
    const idx = this.view[i];
    if (idx !== undefined) {
      this.selected.add(idx);
      this.activeRow = i;
      this.anchorRow = i;
    }
    this.renderRows(true);
    this.emitSelection();
  }

  get sortColumn(): string | null {
    return this.sortKey;
  }
  get sortDirection(): SortDir {
    return this.sortDir;
  }

  sort(key: string | null, direction: SortDir = 'ascending'): void {
    this.sortKey = key && direction ? key : null;
    this.sortDir = key ? direction : null;
    this.rebuildView();
    this.renderHeader();
    this.renderRows(true);
  }

  refresh(): void {
    this.rebuildView();
    this.layoutColumns();
    this.renderRows(true);
  }

  scrollToItem(viewIndex: number): void {
    this.ensureVisible(viewIndex, this.activeCol);
  }

  selectAll(): void {
    if (this.selectionMode !== 'extended') return;
    for (const i of this.view) this.selected.add(i);
    this.renderRows(true);
    this.emitSelection();
  }

  protected override firstConnected(): void {
    this.grid = this.$('.grid');
    this.headerEl = this.$('.header');
    this.body = this.$('.body');
    this.grid.addEventListener('scroll', () => this.renderRows(false), { passive: true });
    this.grid.addEventListener('keydown', (ev) => this.onKey(ev));
    this.body.addEventListener('pointerdown', (ev) => this.onRowPointerDown(ev));
    this.body.addEventListener('dblclick', (ev) => this.onDblClick(ev));
    this.headerEl.addEventListener('pointerdown', (ev) => this.onHeaderPointerDown(ev));
    this.headerEl.addEventListener('dblclick', (ev) => {
      const grip = (ev.target as Element).closest<HTMLElement>('.grip');
      if (grip) this.autoFit(Number(grip.dataset.col));
    });
    this.addEventListener('w-columns-changed', () => {
      if (!this.columns) this.readColumns();
    });
    this.ro = new ResizeObserver(() => {
      this.layoutColumns();
      this.renderRows(false);
    });
    this.ro.observe(this);
  }

  protected override connected(): void {
    this.ro?.observe(this);
  }
  protected override disconnected(): void {
    this.ro?.disconnect();
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('label')) this.grid.setAttribute('aria-label', this.label || '数据表');
    if (changed.has('selectionMode')) {
      this.grid.setAttribute('aria-multiselectable', String(this.selectionMode === 'extended'));
      if (this.selectionMode === 'none') this.selected.clear();
    }
    if (changed.has('columns') || first) this.readColumns(false);
    if (changed.has('items') || first) {
      this.selected.clear();
      this.activeRow = 0;
      this.rebuildView();
    }
    if (changed.has('emptyText')) this.$('.empty').textContent = this.emptyText;
    if (changed.has('rowHeight')) this.style.setProperty('--row-h', `${this.rowH}px`);
    if (first) this.style.setProperty('--row-h', `${this.rowH}px`);
    if (changed.has('disabled')) this.grid.tabIndex = this.disabled ? -1 : 0;
    this.renderHeader();
    this.layoutColumns();
    this.renderRows(true);
  }

  private get rowH(): number {
    return this.rowHeight === 'compact' ? ROW_COMPACT : ROW_STANDARD;
  }

  private readColumns(render = true): void {
    if (this.columns?.length) this.cols = this.columns.map((c) => ({ ...c }));
    else {
      const decl = Array.from(this.children).filter(
        (c): c is WinDataGridColumn => c.localName === 'win-data-grid-column',
      );
      for (const d of decl) customElements.upgrade(d);
      if (decl.length) this.cols = decl.filter((d) => typeof d.toColumn === 'function').map((d) => d.toColumn());
      else {
        const first = this.items?.[0];
        this.cols = first ? Object.keys(first).map((k) => ({ key: k, header: k })) : [];
      }
    }
    this.activeCol = clamp(this.activeCol, 0, Math.max(0, this.cols.length - 1));
    if (render) {
      this.renderHeader();
      this.layoutColumns();
      this.renderRows(true);
    }
  }

  private textWidth(text: string, strong = false): number {
    if (!this.measureCtx) this.measureCtx = document.createElement('canvas').getContext('2d');
    const g = this.measureCtx;
    if (!g) return text.length * 7.5;
    const fam = getComputedStyle(this).fontFamily || 'Segoe UI';
    g.font = `${strong ? 600 : 400} 14px ${fam}`;
    return g.measureText(text).width;
  }

  private display(col: DataGridColumn, item: DataGridItem): string {
    const v = readPath(item, col.key);
    if (col.format) return col.format(v, item);
    if (v === null || v === undefined) return '';
    if (col.type === 'date' && (v instanceof Date || typeof v === 'string' || typeof v === 'number')) {
      const d = v instanceof Date ? v : new Date(v);
      return Number.isNaN(d.getTime()) ? String(v) : d.toLocaleDateString();
    }
    if (col.type === 'number' && typeof v === 'number') return v.toLocaleString();
    return String(v);
  }

  private measureColumn(c: number, sample = 300): number {
    const col = this.cols[c]!;
    const items = this.items ?? [];
    let w = this.textWidth(col.header, true) + 24 + 16;
    if (col.type === 'boolean') w = Math.max(w, 20 + 24);
    else {
      const n = Math.min(items.length, sample);
      for (let i = 0; i < n; i++) w = Math.max(w, this.textWidth(this.display(col, items[i]!)) + 24 + 2);
    }
    return Math.ceil(w);
  }

  private layoutColumns(): void {
    if (!this.isInitialized) return;
    const avail = Math.max(0, this.grid.clientWidth - INSET * 2);
    const widths: number[] = [];
    let fixed = 0;
    let stars = 0;
    const parsed = this.cols.map((col) => {
      const user = this.userWidths.get(col.key);
      if (user !== undefined) return { kind: 'px' as const, v: user };
      const w = col.width ?? 'auto';
      if (typeof w === 'number') return { kind: 'px' as const, v: w };
      const s = String(w).trim();
      if (s.endsWith('*')) return { kind: 'star' as const, v: Number(s.slice(0, -1) || 1) || 1 };
      if (s === 'auto') return { kind: 'auto' as const, v: 0 };
      const n = Number.parseFloat(s);
      return Number.isFinite(n) ? { kind: 'px' as const, v: n } : { kind: 'auto' as const, v: 0 };
    });
    parsed.forEach((p, c) => {
      const col = this.cols[c]!;
      const min = col.minWidth ?? 48;
      const max = col.maxWidth && col.maxWidth > 0 ? col.maxWidth : Number.POSITIVE_INFINITY;
      if (p.kind === 'star') {
        stars += p.v;
        widths[c] = 0;
        return;
      }
      const w = p.kind === 'auto' ? this.measureColumn(c) : p.v;
      widths[c] = clamp(w, min, max);
      fixed += widths[c]!;
    });
    if (stars > 0) {
      const unit = Math.max(0, avail - fixed) / stars;
      parsed.forEach((p, c) => {
        if (p.kind !== 'star') return;
        const col = this.cols[c]!;
        const min = col.minWidth ?? 64;
        const max = col.maxWidth && col.maxWidth > 0 ? col.maxWidth : Number.POSITIVE_INFINITY;
        widths[c] = clamp(Math.floor(unit * p.v), min, max);
      });
    }
    this.widths = widths;
    const total = widths.reduce((a, b) => a + b, 0);
    this.style.setProperty('--cols', widths.map((w) => `${w}px`).join(' ') || '1fr');
    this.style.setProperty('--total', `${total}px`);
  }

  private autoFit(c: number): void {
    const col = this.cols[c];
    if (!col) return;
    const w = this.measureColumn(c, 5000);
    this.userWidths.set(col.key, clamp(w, col.minWidth ?? 48, col.maxWidth && col.maxWidth > 0 ? col.maxWidth : 2000));
    this.layoutColumns();
    this.emit('columnresized', { column: col, width: this.userWidths.get(col.key) });
  }

  private renderHeader(): void {
    if (!this.isInitialized) return;
    this.headerEl.innerHTML = this.cols
      .map((col, c) => {
        const sortable = col.sortable !== false;
        const sort = this.sortKey === col.key ? this.sortDir : null;
        return `<div class="hcell" role="columnheader" part="column-header" aria-colindex="${c + 1}" data-col="${c}" data-align="${col.align ?? (col.type === 'number' ? 'end' : 'start')}" ${sortable ? 'data-sortable' : ''} aria-sort="${sort ?? 'none'}"><span class="h-text">${escapeHtml(col.header)}</span>${sortable ? `<span class="sort" aria-hidden="true">${glyph('chevronUpSmall', 12)}</span>` : ''}${col.resizable !== false ? `<span class="grip" data-col="${c}" aria-hidden="true"></span>` : ''}</div>`;
      })
      .join('');
    this.grid.setAttribute('aria-colcount', String(this.cols.length));
  }

  private onHeaderPointerDown(ev: PointerEvent): void {
    if (ev.button !== 0 || this.disabled) return;
    const target = ev.target as Element;
    const grip = target.closest<HTMLElement>('.grip');
    if (grip) {
      this.startResize(ev, Number(grip.dataset.col), grip);
      return;
    }
    const cell = target.closest<HTMLElement>('.hcell');
    if (!cell) return;
    const c = Number(cell.dataset.col);
    const sx = ev.clientX;
    let dragging = false;
    let ghost: HTMLElement | null = null;
    let dropAt = -1;
    cell.setPointerCapture(ev.pointerId);
    const marker = this.$('.drop-marker');
    const move = (e: PointerEvent) => {
      if (!this.canReorderColumns) return;
      if (!dragging && Math.abs(e.clientX - sx) > 6) {
        dragging = true;
        cell.toggleAttribute('data-dragging', true);
        ghost = document.createElement('div');
        ghost.className = 'ghost';
        ghost.textContent = this.cols[c]!.header;
        this.renderRoot.append(ghost);
      }
      if (!dragging || !ghost) return;
      ghost.style.left = `${e.clientX + 8}px`;
      ghost.style.top = `${e.clientY - 16}px`;
      const cells = Array.from(this.headerEl.querySelectorAll<HTMLElement>('.hcell'));
      const gridRect = this.grid.getBoundingClientRect();
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let k = 0; k <= cells.length; k++) {
        const x =
          k < cells.length
            ? cells[k]!.getBoundingClientRect().left
            : cells[cells.length - 1]!.getBoundingClientRect().right;
        const d = Math.abs(e.clientX - x);
        if (d < bestDist) {
          bestDist = d;
          best = k;
          marker.style.left = `${x - gridRect.left + this.grid.scrollLeft}px`;
        }
      }
      dropAt = best;
      marker.style.display = best === c || best === c + 1 ? 'none' : 'block';
    };
    const up = () => {
      cell.removeEventListener('pointermove', move);
      cell.removeEventListener('pointerup', up);
      cell.removeEventListener('pointercancel', up);
      marker.style.display = 'none';
      ghost?.remove();
      cell.removeAttribute('data-dragging');
      if (dragging) {
        if (dropAt >= 0 && dropAt !== c && dropAt !== c + 1) this.moveColumn(c, dropAt > c ? dropAt - 1 : dropAt);
        return;
      }
      if (this.cols[c]?.sortable !== false) this.cycleSort(c);
    };
    cell.addEventListener('pointermove', move);
    cell.addEventListener('pointerup', up);
    cell.addEventListener('pointercancel', up);
  }

  private moveColumn(from: number, to: number): void {
    const cols = [...this.cols];
    const [col] = cols.splice(from, 1);
    if (!col) return;
    cols.splice(to, 0, col);
    this.cols = cols;
    if (this.columns) this.columns = cols;
    if (this.activeCol === from) this.activeCol = to;
    this.renderHeader();
    this.layoutColumns();
    this.renderRows(true);
    const moved = this.headerEl.querySelector<HTMLElement>(`.hcell[data-col="${to}"]`);
    if (moved)
      animate(
        moved,
        [
          { opacity: 0.4, transform: 'translateY(-4px)' },
          { opacity: 1, transform: 'none' },
        ],
        { duration: durations.normal, easing: easings.decelerate },
      );
    this.emit('columnreordered', { column: col, from, to });
  }

  private startResize(ev: PointerEvent, c: number, grip: HTMLElement): void {
    const col = this.cols[c];
    if (!col) return;
    ev.preventDefault();
    ev.stopPropagation();
    grip.setPointerCapture(ev.pointerId);
    grip.toggleAttribute('data-active', true);
    const startW = this.widths[c] ?? 100;
    const sx = ev.clientX;
    const min = col.minWidth ?? 48;
    const max = col.maxWidth && col.maxWidth > 0 ? col.maxWidth : 4000;
    const move = (e: PointerEvent) => {
      this.userWidths.set(col.key, clamp(startW + (e.clientX - sx), min, max));
      this.layoutColumns();
    };
    const up = () => {
      grip.removeEventListener('pointermove', move);
      grip.removeEventListener('pointerup', up);
      grip.removeEventListener('pointercancel', up);
      grip.removeAttribute('data-active');
      this.emit('columnresized', { column: col, width: this.userWidths.get(col.key) });
    };
    grip.addEventListener('pointermove', move);
    grip.addEventListener('pointerup', up);
    grip.addEventListener('pointercancel', up);
  }

  private cycleSort(c: number): void {
    const col = this.cols[c]!;
    const next: SortDir =
      this.sortKey !== col.key
        ? 'ascending'
        : this.sortDir === 'ascending'
          ? 'descending'
          : this.sortDir === 'descending'
            ? null
            : 'ascending';
    const detail = { column: col, direction: next };
    if (!this.emit('sorting', detail, { cancelable: true })) return;
    this.sort(next ? col.key : null, next);
    this.emit('sorted', { column: col, direction: next });
  }

  private rebuildView(): void {
    const items = this.items ?? [];
    const idx = items.map((_, i) => i);
    const col = this.cols.find((c) => c.key === this.sortKey);
    if (col && this.sortDir) {
      const dir = this.sortDir === 'ascending' ? 1 : -1;
      const cmp =
        col.compare ??
        ((a: DataGridValue, b: DataGridValue) => {
          if (a === b) return 0;
          if (a === null || a === undefined || a === '') return 1;
          if (b === null || b === undefined || b === '') return -1;
          if (col.type === 'date') return new Date(a as string).getTime() - new Date(b as string).getTime();
          if (typeof a === 'number' && typeof b === 'number') return a - b;
          if (typeof a === 'boolean' && typeof b === 'boolean') return Number(a) - Number(b);
          return collator.compare(String(a), String(b));
        });
      idx.sort((x, y) => cmp(readPath(items[x]!, col.key), readPath(items[y]!, col.key)) * dir || x - y);
    }
    const activeItem = this.view[this.activeRow];
    this.view = idx;
    if (activeItem !== undefined) {
      const at = idx.indexOf(activeItem);
      if (at >= 0) this.activeRow = at;
    }
    this.activeRow = clamp(this.activeRow, 0, Math.max(0, idx.length - 1));
    this.toggleAttr('data-empty', idx.length === 0);
    this.grid?.setAttribute('aria-rowcount', String(idx.length + 1));
  }

  private renderRows(force: boolean): void {
    if (!this.isInitialized) return;
    const items = this.items ?? [];
    const n = this.view.length;
    const rowH = this.rowH;
    this.body.style.height = `${n * rowH}px`;
    const headerH = this.headerVisible ? this.headerEl.offsetHeight : 0;
    const top = Math.max(0, this.grid.scrollTop - headerH);
    const vh = Math.max(rowH, this.grid.clientHeight - headerH);
    const first = Math.max(0, Math.floor(top / rowH) - OVERSCAN);
    const last = Math.min(n - 1, Math.ceil((top + vh) / rowH) + OVERSCAN);
    for (const [i, el] of this.pool) {
      if (i < first || i > last || force) {
        el.remove();
        this.pool.delete(i);
      }
    }
    const frag = document.createDocumentFragment();
    for (let i = first; i <= last; i++) {
      if (this.pool.has(i)) continue;
      const itemIndex = this.view[i];
      if (itemIndex === undefined) continue;
      const item = items[itemIndex];
      const row = this.buildRow(i, itemIndex, item ?? {});
      this.pool.set(i, row);
      frag.append(row);
    }
    this.body.append(frag);
    this.syncActive();
  }

  private buildRow(viewIndex: number, itemIndex: number, item: DataGridItem): HTMLElement {
    const row = document.createElement('div');
    row.className = 'row';
    row.setAttribute('role', 'row');
    row.setAttribute('part', 'row');
    row.dataset.row = String(viewIndex);
    row.setAttribute('aria-rowindex', String(viewIndex + 2));
    row.style.top = `${viewIndex * this.rowH}px`;
    if (viewIndex % 2 === 1) row.toggleAttribute('data-odd', true);
    if (this.selectionMode !== 'none') row.setAttribute('aria-selected', String(this.selected.has(itemIndex)));
    this.cols.forEach((col, c) => {
      const cell = document.createElement('div');
      cell.className = 'cell';
      cell.setAttribute('role', 'gridcell');
      cell.setAttribute('part', 'cell');
      cell.id = `${this.idBase}-${viewIndex}-${c}`;
      cell.dataset.col = String(c);
      cell.setAttribute('aria-colindex', String(c + 1));
      cell.dataset.align = col.align ?? (col.type === 'number' ? 'end' : col.type === 'boolean' ? 'center' : 'start');
      const editable = !!col.editable && !this.readOnly;
      if (editable) cell.toggleAttribute('data-editable', true);
      const v = readPath(item, col.key);
      if (col.render) {
        const out = col.render(v, item, cell);
        if (typeof out === 'string') cell.innerHTML = out;
        else if (out instanceof Node) cell.append(out);
      } else if (col.type === 'boolean') {
        cell.innerHTML = `<span class="w-check" role="checkbox" aria-checked="${!!v}" ${v ? 'data-checked' : ''} ${editable ? '' : 'aria-readonly="true"'}>${glyph('checkMark', 12)}</span>`;
      } else {
        const t = document.createElement('span');
        t.className = 'text';
        t.textContent = this.display(col, item);
        cell.append(t);
        cell.title = t.textContent ?? '';
      }
      row.append(cell);
    });
    return row;
  }

  private syncActive(): void {
    for (const el of this.body.querySelectorAll('[data-active]')) el.removeAttribute('data-active');
    for (const el of this.body.querySelectorAll('[data-active-row]')) el.removeAttribute('data-active-row');
    const row = this.pool.get(this.activeRow);
    const cell = row?.querySelector<HTMLElement>(`.cell[data-col="${this.activeCol}"]`);
    row?.toggleAttribute('data-active-row', true);
    if (cell) {
      cell.toggleAttribute('data-active', true);
      this.grid.setAttribute('aria-activedescendant', cell.id);
    } else this.grid.removeAttribute('aria-activedescendant');
  }

  private ensureVisible(row: number, col: number): void {
    const rowH = this.rowH;
    const headerH = this.headerVisible ? this.headerEl.offsetHeight : 0;
    const top = row * rowH;
    const vh = this.grid.clientHeight - headerH;
    if (top < this.grid.scrollTop) this.grid.scrollTop = top;
    else if (top + rowH > this.grid.scrollTop + vh) this.grid.scrollTop = top + rowH - vh;
    let x = INSET;
    for (let c = 0; c < col; c++) x += this.widths[c] ?? 0;
    const w = this.widths[col] ?? 0;
    if (x < this.grid.scrollLeft) this.grid.scrollLeft = x - INSET;
    else if (x + w > this.grid.scrollLeft + this.grid.clientWidth)
      this.grid.scrollLeft = x + w - this.grid.clientWidth + INSET;
    this.renderRows(false);
  }

  private emitSelection(): void {
    this.emit('selectionchanged', {
      selectedItems: this.selectedItems,
      selectedIndices: [...this.selected],
      selectedIndex: this.selectedIndex,
    });
  }

  private applySelection(viewRow: number, mode: 'replace' | 'toggle' | 'range'): void {
    if (this.selectionMode === 'none') return;
    const item = this.view[viewRow];
    if (item === undefined) return;
    if (this.selectionMode === 'single' || mode === 'replace') {
      if (this.selectionMode === 'single' && mode === 'toggle' && this.selected.has(item)) this.selected.clear();
      else {
        this.selected.clear();
        this.selected.add(item);
      }
      this.anchorRow = viewRow;
    } else if (mode === 'toggle') {
      if (this.selected.has(item)) this.selected.delete(item);
      else this.selected.add(item);
      this.anchorRow = viewRow;
    } else {
      const a = this.anchorRow < 0 ? viewRow : this.anchorRow;
      this.selected.clear();
      for (let i = Math.min(a, viewRow); i <= Math.max(a, viewRow); i++) {
        const it = this.view[i];
        if (it !== undefined) this.selected.add(it);
      }
    }
    for (const [i, el] of this.pool) {
      const it = this.view[i];
      if (it !== undefined) el.setAttribute('aria-selected', String(this.selected.has(it)));
    }
    this.emitSelection();
  }

  private onRowPointerDown(ev: PointerEvent): void {
    if (ev.button !== 0 || this.disabled) return;
    const rowEl = (ev.target as Element).closest<HTMLElement>('.row');
    if (!rowEl || (ev.target as Element).closest('.editor')) return;
    const cellEl = (ev.target as Element).closest<HTMLElement>('.cell');
    const viewRow = Number(rowEl.dataset.row);
    const col = cellEl ? Number(cellEl.dataset.col) : this.activeCol;
    if (this.editing && (this.editing.row !== viewRow || this.editing.col !== col)) this.commitEdit(true);
    rowEl.toggleAttribute('data-pressed', true);
    const release = () => {
      rowEl.removeAttribute('data-pressed');
      removeEventListener('pointerup', release);
    };
    addEventListener('pointerup', release);
    this.activeRow = viewRow;
    this.activeCol = col;
    this.syncActive();
    const mode = ev.shiftKey ? 'range' : ev.ctrlKey || ev.metaKey ? 'toggle' : 'replace';
    this.applySelection(viewRow, mode);
    const check = (ev.target as Element).closest('.w-check');
    if (check && cellEl?.hasAttribute('data-editable')) this.toggleBoolean(viewRow, col);
    requestAnimationFrame(() => this.grid.focus({ preventScroll: true }));
  }

  private onDblClick(ev: MouseEvent): void {
    const cellEl = (ev.target as Element).closest<HTMLElement>('.cell');
    const rowEl = (ev.target as Element).closest<HTMLElement>('.row');
    if (!cellEl || !rowEl) return;
    const r = Number(rowEl.dataset.row);
    const c = Number(cellEl.dataset.col);
    const col = this.cols[c];
    if (col?.editable && !this.readOnly && col.type !== 'boolean') this.beginEdit(r, c);
    else {
      const item = (this.items ?? [])[this.view[r] ?? -1];
      this.emit('rowinvoked', { item, index: r });
    }
  }

  private toggleBoolean(row: number, c: number): void {
    const col = this.cols[c];
    const item = (this.items ?? [])[this.view[row] ?? -1];
    if (!col || !item) return;
    const old = readPath(item, col.key);
    const detail = { item, column: col, oldValue: old, newValue: !old, cancelled: false };
    if (!this.emit('celleditending', detail, { cancelable: true })) return;
    writePath(item, col.key, !old);
    this.repaintRow(row);
    this.emit('celleditended', detail);
  }

  private beginEdit(row: number, c: number, initial?: string): void {
    const col = this.cols[c];
    const item = (this.items ?? [])[this.view[row] ?? -1];
    if (!col || !item || !col.editable || this.readOnly) return;
    if (col.type === 'boolean') {
      this.toggleBoolean(row, c);
      return;
    }
    if (!this.emit('beginningedit', { item, column: col }, { cancelable: true })) return;
    this.ensureVisible(row, c);
    const cell = this.pool.get(row)?.querySelector<HTMLElement>(`.cell[data-col="${c}"]`);
    if (!cell) return;
    const old = readPath(item, col.key);
    const input = document.createElement('input');
    input.className = 'editor';
    input.setAttribute('part', 'editor');
    input.setAttribute('aria-label', col.header);
    if (col.type === 'number') input.inputMode = 'decimal';
    if (col.type === 'date') {
      input.type = 'date';
      const d = old ? new Date(old as string) : null;
      input.value = d && !Number.isNaN(d.getTime()) ? d.toISOString().slice(0, 10) : '';
    } else input.value = initial ?? (old === null || old === undefined ? '' : String(old));
    cell.replaceChildren(input);
    this.editing = { row, col: c, input, old };
    input.focus();
    if (initial === undefined) input.select();
    else input.setSelectionRange(input.value.length, input.value.length);
    input.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        e.preventDefault();
        e.stopPropagation();
        this.commitEdit(true);
        this.moveActive(Math.min(this.view.length - 1, row + 1), c);
      } else if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        this.commitEdit(false);
      } else if (e.key === 'Tab') {
        e.preventDefault();
        e.stopPropagation();
        this.commitEdit(true);
        const next = this.nextEditable(row, c, e.shiftKey ? -1 : 1);
        if (next) this.beginEdit(next[0], next[1]);
      } else e.stopPropagation();
    });
    input.addEventListener('blur', () => {
      if (this.editing?.input === input) this.commitEdit(true, false);
    });
  }

  private nextEditable(row: number, c: number, dir: 1 | -1): [number, number] | null {
    const n = this.cols.length;
    let r = row;
    let k = c;
    for (let guard = 0; guard < n * 3; guard++) {
      k += dir;
      if (k >= n) {
        k = 0;
        r++;
      } else if (k < 0) {
        k = n - 1;
        r--;
      }
      if (r < 0 || r >= this.view.length) return null;
      const col = this.cols[k];
      if (col?.editable && col.type !== 'boolean') return [r, k];
    }
    return null;
  }

  private commitEdit(save: boolean, refocus = true): void {
    const e = this.editing;
    if (!e) return;
    this.editing = null;
    const col = this.cols[e.col]!;
    const item = (this.items ?? [])[this.view[e.row] ?? -1];
    let value: DataGridValue = e.input.value;
    if (col.type === 'number') {
      const n = Number(String(value).replace(/[,\s]/g, ''));
      if (!Number.isFinite(n)) save = false;
      value = n;
    } else if (col.type === 'date') value = e.input.value ? new Date(`${e.input.value}T00:00:00`) : null;
    const detail = { item, column: col, oldValue: e.old, newValue: value, cancelled: !save };
    if (save && item && !this.emit('celleditending', detail, { cancelable: true })) detail.cancelled = true;
    if (!detail.cancelled && item) writePath(item, col.key, detail.newValue);
    this.repaintRow(e.row);
    this.emit('celleditended', detail);
    if (refocus) this.grid.focus({ preventScroll: true });
  }

  private repaintRow(row: number): void {
    const old = this.pool.get(row);
    const itemIndex = this.view[row];
    if (!old || itemIndex === undefined) return;
    const fresh = this.buildRow(row, itemIndex, (this.items ?? [])[itemIndex] ?? {});
    old.replaceWith(fresh);
    this.pool.set(row, fresh);
    this.syncActive();
  }

  private moveActive(row: number, col: number, select: 'replace' | 'range' | 'none' = 'replace'): void {
    const n = this.view.length;
    if (!n) return;
    this.activeRow = clamp(row, 0, n - 1);
    this.activeCol = clamp(col, 0, Math.max(0, this.cols.length - 1));
    this.ensureVisible(this.activeRow, this.activeCol);
    this.syncActive();
    if (select !== 'none' && this.selectionMode !== 'none') this.applySelection(this.activeRow, select);
  }

  private onKey(ev: KeyboardEvent): void {
    if (this.disabled || this.editing) return;
    const n = this.view.length;
    const page = Math.max(1, Math.floor((this.grid.clientHeight - 36) / this.rowH) - 1);
    const ctrl = ev.ctrlKey || ev.metaKey;
    const sel: 'replace' | 'range' | 'none' =
      ev.shiftKey && this.selectionMode === 'extended'
        ? 'range'
        : ctrl
          ? 'none'
          : this.selectionMode === 'none'
            ? 'none'
            : 'replace';
    const r = this.activeRow;
    const c = this.activeCol;
    let handled = true;
    switch (ev.key) {
      case 'ArrowDown':
        this.moveActive(r + 1, c, sel);
        break;
      case 'ArrowUp':
        this.moveActive(r - 1, c, sel);
        break;
      case 'ArrowRight':
        this.moveActive(r, c + 1, 'none');
        break;
      case 'ArrowLeft':
        this.moveActive(r, c - 1, 'none');
        break;
      case 'Home':
        if (ctrl) this.moveActive(0, 0, ev.shiftKey ? 'range' : 'replace');
        else this.moveActive(r, 0, 'none');
        break;
      case 'End':
        if (ctrl) this.moveActive(n - 1, this.cols.length - 1, ev.shiftKey ? 'range' : 'replace');
        else this.moveActive(r, this.cols.length - 1, 'none');
        break;
      case 'PageDown':
        this.moveActive(r + page, c, sel);
        break;
      case 'PageUp':
        this.moveActive(r - page, c, sel);
        break;
      case ' ':
        if (this.cols[c]?.type === 'boolean' && this.cols[c]?.editable && !this.readOnly) this.toggleBoolean(r, c);
        else this.applySelection(r, ctrl || this.selectionMode === 'extended' ? 'toggle' : 'replace');
        break;
      case 'F2':
      case 'Enter':
        if (this.cols[c]?.editable && !this.readOnly) this.beginEdit(r, c);
        else if (ev.key === 'Enter')
          this.emit('rowinvoked', { item: (this.items ?? [])[this.view[r] ?? -1], index: r });
        break;
      case 'a':
      case 'A':
        if (ctrl && this.selectionMode === 'extended') this.selectAll();
        else handled = this.typeToEdit(ev);
        break;
      default:
        handled = this.typeToEdit(ev);
    }
    if (handled) {
      ev.preventDefault();
      ev.stopPropagation();
    }
  }

  private typeToEdit(ev: KeyboardEvent): boolean {
    if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey || ev.altKey) return false;
    const col = this.cols[this.activeCol];
    if (!col?.editable || this.readOnly || col.type === 'boolean' || col.type === 'date') return false;
    this.beginEdit(this.activeRow, this.activeCol, ev.key);
    return true;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-data-grid': WinDataGrid;
    'win-data-grid-column': WinDataGridColumn;
  }
}
