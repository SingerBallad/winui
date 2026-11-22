import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { glyph, iconHtml } from '../../base/icons.ts';
import { TypeAhead } from '../../base/keyboard.ts';
import { cancelAnimations, collapseHeight, expandHeight, settled } from '../../motion/animate.ts';
import { CHECKBOX_GLYPH, checkBoxGlyphCss, upgradeProperty } from './list-core.ts';
import { scrollIntoViewWithin } from '../../base/dom.ts';

export type TreeSelectionMode = 'none' | 'single' | 'multiple';

export interface TreeNodeData {
  content?: string;
  icon?: string;
  expanded?: boolean;
  selected?: boolean;
  disabled?: boolean;
  hasUnrealizedChildren?: boolean;
  children?: TreeNodeData[];
  [key: string]: unknown;
}

const TAG = 'win-tree-view-item';
const isNode = (n: unknown): n is WinTreeViewItem => n instanceof Element && n.localName === TAG;

const itemCss = css`
:host {
  display: block;
  position: relative;
  outline: none;
  color: var(--w-text-fill-color-primary);
}
.row {
  display: flex;
  position: relative;
  align-items: center;
  box-sizing: border-box;
  min-height: 28px;
  margin: 2px 4px;
  padding: 3px 0 5px;
  border-radius: var(--w-corner-radius-control);
  background-color: transparent;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
}
.row:hover { background-color: var(--w-subtle-fill-color-secondary); }
.row:active { background-color: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-secondary); }
:host([selected]) > .row { background-color: var(--w-subtle-fill-color-secondary); }
:host([selected]) > .row:hover { background-color: var(--w-subtle-fill-color-tertiary); }
:host([selected]) > .row:active { background-color: var(--w-subtle-fill-color-secondary); }

.pill {
  position: absolute;
  inset-inline-start: 0;
  top: 50%;
  width: 3px;
  height: 16px;
  margin-top: -8px;
  border-radius: 2px;
  background: var(--w-accent-fill-color-default);
  opacity: 0;
  transform: scaleY(0);
  transition: transform var(--w-duration-fast) var(--w-ease-decelerate), opacity var(--w-duration-faster) linear;
  pointer-events: none;
}
:host([selected]:not([data-mode="multiple"])) > .row .pill { opacity: 1; transform: none; }

.indent { flex: none; width: calc(var(--w-depth, 0) * 16px); }

.checkbox {
  display: none;
  flex: none;
  width: 32px;
  min-height: 20px;
  margin-inline-start: 10px;
  align-items: center;
}
:host([data-mode="multiple"]) .checkbox { display: inline-flex; }
.box {
  position: relative;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  border-radius: var(--w-corner-radius-control);
  border: 1px solid var(--w-control-strong-stroke-color-default);
  background-color: var(--w-control-alt-fill-color-secondary);
  color: var(--w-text-on-accent-fill-color-primary);
  transition:
    background-color var(--w-duration-faster) linear,
    border-color var(--w-duration-faster) linear;
}
.row:hover .box { background-color: var(--w-control-alt-fill-color-tertiary); }
${checkBoxGlyphCss}
:host([selected]) .box, :host([data-partial]) .box {
  background-color: var(--w-accent-fill-color-default);
  border-color: var(--w-accent-fill-color-default);
}
:host([selected]) .row:hover .box, :host([data-partial]) .row:hover .box {
  background-color: var(--w-accent-fill-color-secondary);
  border-color: var(--w-accent-fill-color-secondary);
}
:host([selected]) .box .cb-check { stroke-dashoffset: 0; }
:host([data-partial]:not([selected])) .box .cb-dash { opacity: 1; transform: none; }

.chevron {
  flex: none;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  padding: 0 14px;
  color: inherit;
}
:host([data-mode="multiple"]) .chevron { padding: 0 14px 0 0; }
.glyph {
  width: 12px;
  height: 12px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  transition: transform var(--w-duration-normal) var(--w-ease-point);
}
:host([expanded]:not([data-collapsing])) .glyph { transform: rotate(90deg); }
:host(:dir(rtl)) .glyph { transform: scaleX(-1); }
:host(:dir(rtl)[expanded]:not([data-collapsing])) .glyph { transform: rotate(90deg); }
:host(:not([data-has-children])) .glyph { opacity: 0; }

.icon { display: inline-flex; flex: none; margin-inline-end: 8px; }
.icon:empty { display: none; }
.content {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 20px;
  display: flex;
  align-items: center;
  gap: 8px;
  overflow: hidden;
  white-space: nowrap;
}
.label:empty { display: none; }

.focus {
  position: absolute;
  inset: -1px 0;
  border-radius: 5px;
  display: none;
  pointer-events: none;
}
:host(:focus-visible) > .row .focus {
  display: block;
  border: 2px solid var(--w-focus-stroke-color-outer);
  box-shadow: inset 0 0 0 1px var(--w-focus-stroke-color-inner);
}
.children { display: none; }
:host([expanded]) .children { display: block; }
:host([disabled]) > .row { color: var(--w-text-fill-color-disabled); pointer-events: none; }
:host([disabled]) .pill { background: var(--w-text-fill-color-disabled); }
.spinner {
  display: none;
  width: 12px;
  height: 12px;
  margin-inline-start: 8px;
  border-radius: 50%;
  border: 2px solid var(--w-accent-fill-color-default);
  border-right-color: transparent;
  animation: w-tree-spin 800ms linear infinite;
}
:host([data-loading]) .spinner { display: inline-block; }
@keyframes w-tree-spin { to { transform: rotate(360deg); } }
`;

export class WinTreeViewItem extends WinElement {
  static override styles = [itemCss];
  static override shadowInit: ShadowRootInit = { mode: 'open', slotAssignment: 'manual' };
  static override template = `<div class="row" part="row"><div class="pill" part="selection-indicator"></div><span class="indent"></span><span class="checkbox" part="checkbox"><span class="box">${CHECKBOX_GLYPH}</span></span><span class="chevron" part="chevron"><span class="glyph">${glyph('chevronRight', 8)}</span></span><span class="icon" part="icon"></span><span class="content" part="content"><span class="label"></span><slot name="content"></slot><span class="spinner" aria-hidden="true"></span></span><div class="focus"></div></div><div class="children" role="group" part="children"><slot name="children"></slot></div>`;
  static override props: PropDefs = {
    content: { type: String },
    icon: { type: String },
    expanded: { type: Boolean },
    selected: { type: Boolean },
    disabled: { type: Boolean },
    hasUnrealizedChildren: { type: Boolean, attribute: 'has-unrealized-children' },
  };
  declare content: string;
  declare icon: string;
  declare expanded: boolean;
  declare selected: boolean;
  declare disabled: boolean;
  declare hasUnrealizedChildren: boolean;

  dataItem: unknown = undefined;

  static {
    this.define(TAG);
  }

  private mo: MutationObserver | null = null;
  private animating: Animation | null = null;

  get nodes(): WinTreeViewItem[] {
    return Array.from(this.children).filter(isNode);
  }

  get parentItem(): WinTreeViewItem | null {
    const p = this.parentElement;
    return isNode(p) ? p : null;
  }

  get depth(): number {
    let d = 0;
    for (let p = this.parentElement; p && isNode(p); p = p.parentElement) d++;
    return d;
  }

  get hasChildren(): boolean {
    return this.hasUnrealizedChildren || this.nodes.length > 0;
  }

  get label(): string {
    return (
      this.content ||
      Array.from(this.childNodes)
        .filter((n) => !isNode(n))
        .map((n) => n.textContent)
        .join(' ')
    ).trim();
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'treeitem');
    if (!this.hasAttribute('tabindex')) this.tabIndex = -1;
    this.assignSlots();
    this.mo = new MutationObserver(() => this.assignSlots());
    this.mo.observe(this, { childList: true });
  }

  protected override connected(): void {
    this.style.setProperty('--w-depth', String(this.depth));
    this.setAttribute('aria-level', String(this.depth + 1));
  }

  private assignSlots(): void {
    const content: (Element | Text)[] = [];
    const kids: WinTreeViewItem[] = [];
    for (const n of Array.from(this.childNodes)) {
      if (isNode(n)) kids.push(n);
      else if (n instanceof Element || (n instanceof Text && n.textContent?.trim())) content.push(n as Element | Text);
    }
    (this.renderRoot.querySelector('slot[name="content"]') as HTMLSlotElement).assign(...content);
    (this.renderRoot.querySelector('slot[name="children"]') as HTMLSlotElement).assign(...kids);
    this.syncHasChildren();
    for (const k of kids) k.style.setProperty('--w-depth', String(this.depth + 1));
    kids.forEach((k, i) => {
      k.setAttribute('aria-posinset', String(i + 1));
      k.setAttribute('aria-setsize', String(kids.length));
      k.setAttribute('aria-level', String(this.depth + 2));
    });
  }

  syncHasChildren(): void {
    const has = this.hasChildren;
    this.toggleAttribute('data-has-children', has);
    if (has) this.setAttribute('aria-expanded', String(this.isExpanded));
    else this.removeAttribute('aria-expanded');
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('content')) this.$('.label').textContent = this.content ?? '';
    if (changed.has('icon')) this.$('.icon').innerHTML = this.icon ? iconHtml(this.icon, 16) : '';
    if (changed.has('expanded') || changed.has('hasUnrealizedChildren')) this.syncHasChildren();
    if (changed.has('selected')) {
      if (this.getAttribute('data-mode') === 'multiple') {
        this.removeAttribute('aria-selected');
        this.aria('aria-checked', this.selected ? 'true' : this.hasAttribute('data-partial') ? 'mixed' : 'false');
      } else {
        this.removeAttribute('aria-checked');
        this.aria('aria-selected', String(this.selected));
      }
    }
    if (changed.has('disabled')) this.aria('aria-disabled', this.disabled ? 'true' : null);
  }

  private collapsing = false;

  get isExpanded(): boolean {
    return this.expanded && !this.collapsing;
  }

  setExpanded(on: boolean, animated = true): void {
    if (on === this.isExpanded) return;
    const kids = this.$('.children');
    if (!on) {
      const active = document.activeElement;
      if (active && active !== this && this.contains(active)) this.focus({ preventScroll: true });
    }
    if (on) {
      const wasHidden = !this.expanded;
      this.collapsing = false;
      this.removeAttribute('data-collapsing');
      this.expanded = true;
      this.flushUpdates();
      if (animated && this.nodes.length) {
        if (wasHidden) kids.style.height = '0px';
        this.animating = expandHeight(kids);
        kids.style.height = '';
      } else {
        cancelAnimations(kids);
        this.animating = null;
      }
    } else if (animated && this.nodes.length && this.expanded) {
      this.collapsing = true;
      this.setAttribute('data-collapsing', '');
      const a = collapseHeight(kids);
      this.animating = a;
      void settled(a).then(() => {
        if (this.animating !== a || !this.collapsing) return;
        this.collapsing = false;
        this.removeAttribute('data-collapsing');
        this.expanded = false;
        cancelAnimations(kids);
      });
    } else {
      this.collapsing = false;
      this.removeAttribute('data-collapsing');
      this.expanded = false;
      cancelAnimations(kids);
    }
    this.syncHasChildren();
  }

  get row(): HTMLElement {
    return this.$('.row');
  }
}

const treeCss = css`
:host {
  display: block;
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  overflow: auto;
  color: var(--w-text-fill-color-primary);
  scrollbar-width: thin;
  scrollbar-color: var(--w-control-strong-fill-color-default) transparent;
}
`;

export class WinTreeView extends WinElement {
  static override styles = [treeCss];
  static override template = `<slot></slot>`;
  static override props: PropDefs = {
    selectionMode: { type: String, attribute: 'selection-mode', reflect: true, default: 'single' },
  };
  declare selectionMode: TreeSelectionMode;

  static {
    this.define('win-tree-view');
  }

  private typeahead = new TypeAhead();
  private mo: MutationObserver | null = null;
  private _items: TreeNodeData[] | null = null;

  get items(): TreeNodeData[] | null {
    return this._items;
  }
  set items(v: TreeNodeData[] | null) {
    this._items = v;
    for (const n of this.rootNodes) n.remove();
    if (v) for (const d of v) this.append(WinTreeView.build(d));
  }

  static build(d: TreeNodeData): WinTreeViewItem {
    const el = document.createElement(TAG) as WinTreeViewItem;
    el.dataItem = d;
    if (d.content !== undefined) el.setAttribute('content', String(d.content));
    if (d.icon) el.setAttribute('icon', d.icon);
    if (d.expanded) el.setAttribute('expanded', '');
    if (d.selected) el.setAttribute('selected', '');
    if (d.disabled) el.setAttribute('disabled', '');
    if (d.hasUnrealizedChildren) el.setAttribute('has-unrealized-children', '');
    for (const c of d.children ?? []) el.append(WinTreeView.build(c));
    return el;
  }

  get rootNodes(): WinTreeViewItem[] {
    return Array.from(this.children).filter(isNode);
  }

  get allNodes(): WinTreeViewItem[] {
    return Array.from(this.querySelectorAll<WinTreeViewItem>(TAG));
  }

  get selectedNodes(): WinTreeViewItem[] {
    return this.allNodes.filter((n) => n.selected);
  }
  get selectedItems(): unknown[] {
    return this.selectedNodes.map((n) => n.dataItem ?? n);
  }
  get selectedNode(): WinTreeViewItem | null {
    return this.selectedNodes[0] ?? null;
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'tree');
    this.addEventListener('click', (ev) => this.onClick(ev));
    this.addEventListener('keydown', (ev) => this.onKeyDown(ev));
    this.addEventListener('focusin', (ev) => {
      if (isNode(ev.target)) this.syncRoving(ev.target);
    });
    this.mo = new MutationObserver(() => this.syncAll());
    this.mo.observe(this, { childList: true, subtree: true });
    upgradeProperty(this, 'items');
    this.syncAll();
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('selectionMode')) {
      this.setAttribute('aria-multiselectable', String(this.selectionMode === 'multiple'));
      if (!first) this.syncAll();
    }
  }

  private syncAll(): void {
    const mode = this.selectionMode;
    const nodes = this.allNodes;
    for (const n of nodes) {
      n.setAttribute('data-mode', mode);
      n.syncHasChildren();
    }
    if (mode === 'single' || mode === 'none') {
      let seen = mode === 'none';
      for (const n of nodes) {
        if (n.selected) {
          if (seen) n.selected = false;
          seen = true;
        }
      }
    } else this.refreshPartial();
    this.rootNodes.forEach((n, i) => {
      n.setAttribute('aria-posinset', String(i + 1));
      n.setAttribute('aria-setsize', String(this.rootNodes.length));
    });
    this.syncRoving();
  }

  visibleNodes(): WinTreeViewItem[] {
    const out: WinTreeViewItem[] = [];
    const walk = (list: WinTreeViewItem[]) => {
      for (const n of list) {
        out.push(n);
        if (n.isExpanded) walk(n.nodes);
      }
    };
    walk(this.rootNodes);
    return out;
  }

  private syncRoving(active?: WinTreeViewItem | null): void {
    const vis = this.visibleNodes();
    const target = active ?? vis.find((n) => n.tabIndex === 0) ?? this.selectedNode ?? vis[0] ?? null;
    for (const n of this.allNodes) n.tabIndex = n === target ? 0 : -1;
  }

  private nodeFromEvent(ev: Event): WinTreeViewItem | null {
    for (const t of ev.composedPath()) {
      if (isNode(t) && this.contains(t)) return t;
      if (t === this) break;
    }
    return null;
  }

  private onRow(node: WinTreeViewItem, ev: Event): boolean {
    return ev.composedPath().includes(node.row);
  }

  expand(node: WinTreeViewItem): void {
    if (node.isExpanded || !node.hasChildren) return;
    const ok = this.emit('expanding', { node, item: node.dataItem ?? node }, { cancelable: true });
    if (!ok) return;
    node.setExpanded(true);
  }

  collapse(node: WinTreeViewItem): void {
    if (!node.isExpanded) return;
    node.setExpanded(false);
    this.emit('collapsed', { node, item: node.dataItem ?? node });
  }

  toggle(node: WinTreeViewItem): void {
    if (node.isExpanded) this.collapse(node);
    else this.expand(node);
  }

  expandAll(): void {
    for (const n of this.allNodes) if (n.hasChildren) n.setExpanded(true, false);
  }
  collapseAll(): void {
    for (const n of this.allNodes) n.setExpanded(false, false);
  }

  private change(mutate: () => void): void {
    const before = new Set(this.selectedNodes);
    mutate();
    const after = this.selectedNodes;
    const added = after.filter((n) => !before.has(n));
    const afterSet = new Set(after);
    const removed = [...before].filter((n) => !afterSet.has(n));
    if (this.selectionMode === 'multiple') this.refreshPartial();
    if (!added.length && !removed.length) return;
    this.emit('selectionchanged', {
      added: added.map((n) => n.dataItem ?? n),
      removed: removed.map((n) => n.dataItem ?? n),
      addedNodes: added,
      removedNodes: removed,
    });
  }

  selectNode(node: WinTreeViewItem): void {
    if (this.selectionMode === 'none') return;
    if (this.selectionMode === 'single') {
      this.change(() => {
        for (const n of this.selectedNodes) if (n !== node) n.selected = false;
        node.selected = true;
      });
    } else this.setChecked(node, true);
  }

  setChecked(node: WinTreeViewItem, on: boolean): void {
    this.change(() => {
      node.selected = on;
      for (const d of node.querySelectorAll<WinTreeViewItem>(TAG)) if (!d.disabled) d.selected = on;
      for (let p = node.parentItem; p; p = p.parentItem) {
        const kids = p.nodes;
        p.selected = kids.length > 0 && kids.every((k) => k.selected);
      }
    });
  }

  private refreshPartial(): void {
    for (const n of this.allNodes) {
      if (this.selectionMode !== 'multiple') {
        n.removeAttribute('data-partial');
        continue;
      }
      const desc = Array.from(n.querySelectorAll<WinTreeViewItem>(TAG));
      const some = desc.some((d) => d.selected);
      n.toggleAttribute('data-partial', !n.selected && some);
      if (n.hasAttribute('data-partial')) n.setAttribute('aria-checked', 'mixed');
    }
  }

  private onClick(ev: MouseEvent): void {
    const node = this.nodeFromEvent(ev);
    if (!node || node.disabled || !this.onRow(node, ev)) return;
    const path = ev.composedPath();
    const onChevron = path.some((t) => t instanceof Element && t.classList?.contains('chevron'));
    const onCheck = path.some((t) => t instanceof Element && t.classList?.contains('checkbox'));
    node.focus({ preventScroll: true });
    this.syncRoving(node);
    if (onChevron) {
      if (node.hasChildren) this.toggle(node);
      return;
    }
    if (this.selectionMode === 'multiple' && onCheck) {
      this.setChecked(node, !node.selected);
      return;
    }
    this.invoke(node);
  }

  private invoke(node: WinTreeViewItem): void {
    const ok = this.emit('iteminvoked', { node, item: node.dataItem ?? node }, { cancelable: true });
    if (!ok) return;
    if (node.hasChildren) this.toggle(node);
    if (this.selectionMode === 'single') this.selectNode(node);
    else if (this.selectionMode === 'multiple') this.setChecked(node, !node.selected);
  }

  private onKeyDown(ev: KeyboardEvent): void {
    const node = this.nodeFromEvent(ev);
    if (!node || ev.target !== node) return;
    const vis = this.visibleNodes();
    const i = vis.indexOf(node);
    const rtl = getComputedStyle(this).direction === 'rtl';
    const fwd = rtl ? 'ArrowLeft' : 'ArrowRight';
    const back = rtl ? 'ArrowRight' : 'ArrowLeft';
    const go = (n: WinTreeViewItem | undefined | null) => {
      if (!n) return;
      ev.preventDefault();
      scrollIntoViewWithin(this, n.row, 'y');
      n.focus();
      this.syncRoving(n);
    };
    switch (ev.key) {
      case 'ArrowDown':
        go(vis.slice(i + 1).find((n) => !n.disabled));
        return;
      case 'ArrowUp':
        go(
          vis
            .slice(0, i)
            .reverse()
            .find((n) => !n.disabled),
        );
        return;
      case 'Home':
        go(vis.find((n) => !n.disabled));
        return;
      case 'End':
        go([...vis].reverse().find((n) => !n.disabled));
        return;
      case fwd:
        ev.preventDefault();
        if (node.hasChildren && !node.isExpanded) this.expand(node);
        else if (node.isExpanded) go(node.nodes[0]);
        return;
      case back:
        ev.preventDefault();
        if (node.isExpanded) this.collapse(node);
        else go(node.parentItem);
        return;
      case 'Enter':
        ev.preventDefault();
        this.invoke(node);
        return;
      case ' ':
        ev.preventDefault();
        if (this.selectionMode === 'multiple') this.setChecked(node, !node.selected);
        else if (this.selectionMode === 'single') this.selectNode(node);
        return;
      case '*': {
        ev.preventDefault();
        const sibs = node.parentItem?.nodes ?? this.rootNodes;
        for (const s of sibs) this.expand(s);
        return;
      }
    }
    if (ev.key.length === 1 && !ev.ctrlKey && !ev.altKey && !ev.metaKey) {
      const hit = this.typeahead.match(
        ev.key,
        vis.map((n) => n.label),
        i,
      );
      if (hit >= 0) go(vis[hit]);
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-tree-view': WinTreeView;
    'win-tree-view-item': WinTreeViewItem;
  }
}
