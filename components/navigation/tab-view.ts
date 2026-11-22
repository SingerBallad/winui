import { WinElement, type PropDefs } from '../../base/element.ts';
import { scrollIntoViewWithin } from '../../base/dom.ts';
import { css, focusRing } from '../../base/css.ts';
import { glyph, iconHtml } from '../../base/icons.ts';
import { isRtl, rafThrottle } from '../../base/dom.ts';
import { animate, durations, easings, flip, itemAdded, itemRemoved, settled } from '../../motion/animate.ts';
import { navStrings } from './shared.ts';

const ITEM = 'win-tab-view-item';
function translateX(el: Element): number {
  const t = getComputedStyle(el).transform;
  return !t || t === 'none' ? 0 : new DOMMatrixReadOnly(t).m41;
}

const LEFT_ARC = 'M4 0C4 1.19469 3.47624 2.26706 2.64582 3H0C1.65685 3 3 1.65685 3 0H4Z';
const RIGHT_ARC = 'M0 0C0 1.19469 0.523755 2.26706 1.35418 3H4C2.34315 3 1 1.65685 1 0H0Z';
const LEFT_FILL = 'M4 0C4 2.20914 2.20914 4 0 4H4Z';
const RIGHT_FILL = 'M0 0C0 2.20914 1.79086 4 4 4H0Z';

export type TabViewWidthMode = 'equal' | 'size-to-content' | 'compact';
export type TabViewCloseButtonOverlayMode = 'auto' | 'on-pointer-over' | 'always';

const itemCss = css`
:host {
  display: flex;
  flex: none;
  min-width: 0;
  max-width: 240px;
  height: 32px;
  color: var(--w-text-fill-color-secondary);
  font: 400 12px/16px var(--w-font-family-small);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}
:host([hidden]) { display: none; }
:host([data-w-closing]) { pointer-events: none; }
:host([data-width="equal"]) { flex: 0 1 240px; width: 240px; min-width: 100px; }
:host([data-width="size-to-content"]) { min-width: 0; }
:host([data-width="compact"]:not([selected])) { max-width: none; }
.tab {
  position: relative;
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  box-sizing: border-box;
  height: 32px;
  padding: 3px 4px 3px 8px;
  border-radius: var(--w-corner-radius-overlay) var(--w-corner-radius-overlay) 0 0;
  background-color: transparent;
}
:host(:not([data-closable])) .tab { padding-inline-end: 8px; }
.tab:hover { background-color: var(--w-layer-on-mica-base-alt-fill-color-secondary); }
.tab:active { background-color: var(--w-layer-on-mica-base-alt-fill-color-default); color: var(--w-text-fill-color-tertiary); }
:host([selected]) { color: var(--w-text-fill-color-primary); font-weight: 600; z-index: 1; }
:host([selected]) .tab, :host([selected]) .tab:hover, :host([selected]) .tab:active { background-color: transparent; color: var(--w-text-fill-color-primary); }
:host([disabled]) { color: var(--w-text-fill-color-disabled); pointer-events: none; }
${focusRing(':host(:focus-visible) .tab', 0)}

.sel { display: none; }
:host([selected]) .sel { display: block; }
.sel-bg {
  position: absolute;
  inset: 0 -1px 0 -1px;
  border-radius: var(--w-corner-radius-overlay) var(--w-corner-radius-overlay) 0 0;
  background: var(--w-solid-background-fill-color-tertiary);
}
.sel-outline {
  position: absolute;
  inset: 0 -1px 4px -1px;
  border: 1px solid var(--w-card-stroke-color-default);
  border-bottom: 0;
  border-radius: var(--w-corner-radius-overlay) var(--w-corner-radius-overlay) 0 0;
  pointer-events: none;
}
.foot { position: absolute; bottom: 0; width: 4px; height: 4px; overflow: visible; }
.foot.l { left: -4px; }
.foot.r { right: -4px; }
.foot .fill { fill: var(--w-solid-background-fill-color-tertiary); }
.foot .arc { fill: var(--w-card-stroke-color-default); }

.icon { position: relative; display: inline-flex; align-items: center; justify-content: center; flex: none; width: 16px; height: 16px; margin-inline-end: 10px; color: var(--w-text-fill-color-secondary); }
:host([selected]) .icon { color: var(--w-text-fill-color-primary); }
.tab:active .icon { color: var(--w-text-fill-color-tertiary); }
:host(:not([data-has-icon])) .icon { display: none; }
.header { position: relative; flex: 1 1 auto; min-width: 0; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
:host([data-width="compact"][data-has-icon]:not([selected])) .header,
:host([data-width="compact"]:not([selected])) .close { display: none; }
:host([data-width="compact"]:not([selected])) .tab { padding-inline: 8px; }
:host([data-width="compact"]:not([selected])) .icon { margin: 0; }
.close {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 32px;
  height: 24px;
  margin-inline-start: 4px;
  padding: 0;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: var(--w-text-fill-color-primary);
  cursor: default;
}
.close:hover { background: var(--w-subtle-fill-color-secondary); }
.close:active { background: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-secondary); }
:host(:not([data-closable])) .close { display: none; }
:host([data-close-mode="on-pointer-over"]:not([selected])) .tab:not(:hover) .close { visibility: hidden; }
:host([disabled]) .close { color: var(--w-text-fill-color-disabled); }
.sep {
  position: absolute;
  inset-inline-end: 0;
  top: 8px;
  bottom: 8px;
  width: 1px;
  background: var(--w-divider-stroke-color-default);
}
:host([selected]) .sep, :host([data-sep-hidden]) .sep, .tab:hover .sep { opacity: 0; }

.panel {
  position: absolute;
  inset-inline: 0;
  top: var(--tv-strip-h, 40px);
  bottom: 0;
  overflow: auto;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  cursor: auto;
  user-select: text;
  -webkit-user-select: text;
}
:host(:not([selected])) .panel { display: none; }
:host([data-dragging]) .tab { z-index: 3; }
`;

export class WinTabViewItem extends WinElement {
  static override styles = [itemCss];
  static override template = `
<div class="tab" part="tab">
  <span class="sel" aria-hidden="true"><span class="sel-bg"></span><span class="sel-outline"></span>
    <svg class="foot l" viewBox="0 0 4 4"><path class="fill" d="${LEFT_FILL}"/><path class="arc" d="${LEFT_ARC}"/></svg>
    <svg class="foot r" viewBox="0 0 4 4"><path class="fill" d="${RIGHT_FILL}"/><path class="arc" d="${RIGHT_ARC}"/></svg>
  </span>
  <span class="icon" part="icon"><span class="icon-spec"></span><slot name="icon"></slot></span>
  <span class="header" part="header"><span class="header-text"></span><slot name="header"></slot></span>
  <button class="close" part="close-button" type="button" tabindex="-1">${glyph('cancel', 12)}</button>
  <span class="sep" aria-hidden="true"></span>
</div>
<div class="panel" part="content" role="tabpanel"><div class="panel-inner"><slot></slot></div></div>`;
  static override props: PropDefs = {
    header: { type: String },
    icon: { type: String, reflect: true },
    selected: { type: Boolean },
    disabled: { type: Boolean },
    isClosable: { type: Boolean, attribute: 'is-closable', default: true },
  };
  declare header: string;
  declare icon: string;
  declare selected: boolean;
  declare disabled: boolean;
  declare isClosable: boolean;

  static {
    this.define(ITEM);
  }

  get ready(): boolean {
    return this.isInitialized;
  }

  get tabElement(): HTMLElement {
    return this.$('.tab');
  }

  get panelInner(): HTMLElement {
    return this.$('.panel-inner');
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'tab');
    this.tabIndex = -1;
    const s = navStrings(this);
    const close = this.$('.close');
    close.setAttribute('aria-label', s.closeTab);
    close.title = s.closeTab;
    close.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.requestClose();
    });
    close.addEventListener('pointerdown', (ev) => ev.stopPropagation());
    const tab = this.$('.tab');
    tab.addEventListener('pointerdown', (ev) => {
      if (ev.button === 1 && this.isClosable) {
        ev.preventDefault();
        return;
      }
      if (ev.button !== 0 || this.disabled) return;
      this.dispatchEvent(
        new CustomEvent('win-tab-press', { bubbles: true, composed: true, detail: { item: this, ev } }),
      );
    });
    tab.addEventListener('auxclick', (ev) => {
      if (ev.button === 1 && this.isClosable) this.requestClose();
    });
    this.$('slot[name="icon"]').addEventListener('slotchange', () => this.syncIcon());
    this.dispatchEvent(new CustomEvent('win-tab-structure', { bubbles: true, composed: true }));
  }

  protected override updated(changed: Set<string>): void {
    if (changed.has('header')) {
      this.$('.header-text').textContent = this.header;
      this.title = this.header;
    }
    if (changed.has('icon')) this.syncIcon();
    if (changed.has('isClosable')) this.toggleAttribute('data-closable', this.isClosable);
    if (changed.has('selected')) this.aria('aria-selected', this.selected ? 'true' : 'false');
    if (changed.has('disabled')) this.aria('aria-disabled', this.disabled ? 'true' : null);
  }

  private syncIcon(): void {
    this.$('.icon-spec').innerHTML = iconHtml(this.icon, 16);
    const slotted = this.$<HTMLSlotElement>('slot[name="icon"]').assignedElements().length;
    this.toggleAttribute('data-has-icon', !!this.icon || slotted > 0);
  }

  requestClose(): void {
    if (!this.isClosable || this.disabled) return;
    this.dispatchEvent(new CustomEvent('win-tab-close', { bubbles: true, composed: true, detail: { item: this } }));
  }
}

const viewCss = css`
:host {
  display: block;
  min-width: 0;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
}
.root {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
  overflow: hidden;
}
.strip {
  display: flex;
  align-items: flex-end;
  flex: none;
  min-width: 0;
  background: linear-gradient(var(--w-card-stroke-color-default), var(--w-card-stroke-color-default)) bottom / 100% 1px no-repeat;
}
.strip-header, .strip-footer { display: flex; align-items: center; align-self: stretch; box-sizing: border-box; padding-top: 8px; min-height: 40px; }
.strip-footer { flex: 1 1 auto; min-width: 0; justify-content: flex-end; }
.strip-header { min-width: 2px; }
.tabs {
  display: flex;
  align-items: flex-end;
  flex: 0 1 auto;
  min-width: 0;
  padding: 8px 4px 0;
  overflow-x: auto;
  overflow-y: hidden;
  scrollbar-width: none;
  scroll-behavior: smooth;
}
.tabs::-webkit-scrollbar { display: none; }
.btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 32px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: var(--w-text-fill-color-primary);
  cursor: default;
}
.btn:hover { background: var(--w-subtle-fill-color-secondary); }
.btn:active { background: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-secondary); }
.btn:disabled { color: var(--w-text-fill-color-disabled); background: transparent; }
${focusRing('.btn:focus-visible', 0)}
.add-wrap { display: flex; align-items: flex-end; padding-block: 0 3px; padding-inline: 3px 0; }
:host([is-add-tab-button-visible="false"]) .add-wrap { display: none; }
.scroll { display: none; padding-block: 0 3px; padding-inline: 8px 3px; }
.scroll.r { padding-inline: 3px 8px; }
:host([data-scroll]) .scroll { display: flex; align-items: flex-end; }
.scroll .btn { color: var(--w-text-fill-color-secondary); }
:host(:dir(rtl)) { --tv-dir: -1; }
:host(:dir(rtl)) .scroll .w-glyph { scale: -1 1; }
.scroll .w-glyph { transition: translate var(--w-duration-fast) var(--w-ease-decelerate); }
.sl:active .w-glyph { translate: calc(-2px * var(--tv-dir, 1)) 0; transition-duration: var(--w-duration-faster); }
.sr:active .w-glyph { translate: calc(2px * var(--tv-dir, 1)) 0; transition-duration: var(--w-duration-faster); }
.content {
  flex: 1 0 auto;
  min-height: var(--tv-natural, 0px);
  background: var(--w-solid-background-fill-color-tertiary);
}
:host([transparent-content]) .content { background: transparent; }
`;

export interface TabCloseRequestedDetail {
  tab: WinTabViewItem;
  item: WinTabViewItem;
}

export class WinTabView extends WinElement {
  static override styles = [viewCss];
  static override template = `
<div class="root" part="root">
  <div class="strip" part="tab-strip">
    <div class="strip-header"><slot name="tab-strip-header"></slot></div>
    <div class="scroll l"><button class="btn sl" type="button" tabindex="-1">${glyph('chevronLeftSmall', 12)}</button></div>
    <div class="tabs" role="tablist" part="tabs"><slot></slot></div>
    <div class="scroll r"><button class="btn sr" type="button" tabindex="-1">${glyph('chevronRightSmall', 12)}</button></div>
    <div class="add-wrap"><button class="btn add" type="button" part="add-button">${glyph('add', 12)}</button></div>
    <div class="strip-footer"><slot name="tab-strip-footer"></slot></div>
  </div>
  <div class="content" part="content"></div>
</div>`;
  static override props: PropDefs = {
    isAddTabButtonVisible: { type: Boolean, attribute: 'is-add-tab-button-visible', default: true },
    tabWidthMode: { type: String, attribute: 'tab-width-mode', default: 'equal' },
    closeButtonOverlayMode: { type: String, attribute: 'close-button-overlay-mode', default: 'auto' },
    canReorderTabs: { type: Boolean, attribute: 'can-reorder-tabs', default: true },
    selectedIndex: { type: Number, attribute: 'selected-index', default: -1 },
  };
  declare isAddTabButtonVisible: boolean;
  declare tabWidthMode: TabViewWidthMode;
  declare closeButtonOverlayMode: TabViewCloseButtonOverlayMode;
  declare canReorderTabs: boolean;
  declare selectedIndex: number;

  private _selected: WinTabViewItem | null = null;
  private mo: MutationObserver | null = null;
  private ro: ResizeObserver | null = null;
  private panelRo: ResizeObserver | null = null;
  private known = new Set<WinTabViewItem>();
  private scrollTarget: number | null = null;
  private closing = new Map<WinTabViewItem, Promise<void>>();
  private drag: {
    item: WinTabViewItem;
    pointerId: number;
    startX: number;
    lastX: number;
    active: boolean;
    from: number;
  } | null = null;

  static {
    this.define('win-tab-view');
  }

  get items(): WinTabViewItem[] {
    return Array.from(this.children).filter(
      (c): c is WinTabViewItem =>
        c.localName === ITEM && !c.hasAttribute('slot') && (c as Partial<WinTabViewItem>).ready === true,
    );
  }

  get selectedItem(): WinTabViewItem | null {
    return this._selected;
  }
  set selectedItem(item: WinTabViewItem | null) {
    this.select(item, false);
  }

  addTab(header: string, content?: Node | string, opts: { icon?: string; select?: boolean } = {}): WinTabViewItem {
    const it = document.createElement(ITEM) as WinTabViewItem;
    it.setAttribute('header', header);
    if (opts.icon) it.setAttribute('icon', opts.icon);
    if (content != null) it.append(content);
    this.append(it);
    if (opts.select !== false) {
      queueMicrotask(() => this.select(it, true));
    }
    return it;
  }

  removeTab(item: WinTabViewItem): Promise<void> {
    const pending = this.closing.get(item);
    if (pending) return pending;
    const items = this.items.filter((i) => i === item || !this.closing.has(i));
    const idx = items.indexOf(item);
    if (idx < 0) return Promise.resolve();
    const hadFocus = (this.getRootNode() as Document | ShadowRoot).activeElement === item;
    if (item === this._selected) {
      const next = items[idx + 1] ?? items[idx - 1] ?? null;
      this.select(next, true);
    }
    if (hadFocus) this._selected?.focus({ preventScroll: true });
    item.toggleAttribute('data-w-closing', true);
    item.tabIndex = -1;
    const done = settled(itemRemoved(item.tabElement)).then(() => {
      const others = this.items.filter((i) => i !== item).map((i) => i.tabElement);
      flip(others, () => item.remove(), durations.normal);
      this.closing.delete(item);
    });
    this.closing.set(item, done);
    return done;
  }

  protected override firstConnected(): void {
    const s = navStrings(this);
    const add = this.$('.add');
    add.setAttribute('aria-label', s.addTab);
    add.title = s.addTab;
    add.addEventListener('click', () => this.emit('addtabbuttonclick'));
    this.$('.sl').setAttribute('aria-label', s.scrollLeft);
    this.$('.sr').setAttribute('aria-label', s.scrollRight);
    const tabs = this.$('.tabs');
    this.$('.sl').addEventListener('click', () => this.scrollTabs(-1));
    this.$('.sr').addEventListener('click', () => this.scrollTabs(1));
    tabs.addEventListener('scroll', () => this.syncScroll());
    tabs.addEventListener('scrollend', () => (this.scrollTarget = null));
    tabs.addEventListener('wheel', () => (this.scrollTarget = null), { passive: true });

    this.addEventListener('win-tab-press', (ev) => {
      const { item, ev: pev } = (ev as CustomEvent<{ item: WinTabViewItem; ev: PointerEvent }>).detail;
      ev.stopPropagation();
      this.select(item, true);
      if (this.canReorderTabs) this.beginDrag(item, pev);
    });
    this.addEventListener('win-tab-close', (ev) => {
      ev.stopPropagation();
      const item = (ev as CustomEvent<{ item: WinTabViewItem }>).detail.item;
      if (this.closing.has(item)) return;
      const ok = this.emit<TabCloseRequestedDetail>('tabcloserequested', { tab: item, item }, { cancelable: true });
      if (ok) void this.removeTab(item);
    });
    this.addEventListener('win-tab-structure', (ev) => {
      ev.stopPropagation();
      queueMicrotask(() => this.sync());
    });
    this.addEventListener('keydown', (ev) => this.onKey(ev));
    this.addEventListener('pointerover', (ev) => this.onHover(ev));
    this.addEventListener('pointerleave', () => this.syncSeparators(null));

    this.mo = new MutationObserver(() => this.sync());
    this.mo.observe(this, { childList: true });
    this.ro = new ResizeObserver(
      rafThrottle(() => {
        this.style.setProperty('--tv-strip-h', `${this.$('.strip').offsetHeight}px`);
        this.syncScroll();
      }),
    );
    this.ro.observe(this.$('.strip'));
    this.ro.observe(this);
    this.panelRo = new ResizeObserver(() => this.syncNaturalHeight());
    this.sync();
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('tabWidthMode') || changed.has('closeButtonOverlayMode')) this.sync();
    if (changed.has('selectedIndex') && !first && this.selectedIndex >= 0) {
      const it = this.items[this.selectedIndex];
      if (it && it !== this._selected) this.select(it, false);
    }
  }

  private sync(): void {
    const items = this.items;
    for (const it of items) {
      it.setAttribute('data-width', this.tabWidthMode);
      it.setAttribute('data-close-mode', this.closeButtonOverlayMode);
      if (!this.known.has(it)) {
        if (this.known.size && it.isConnected) itemAdded(it.tabElement ?? it);
        this.known.add(it);
      }
    }
    for (const k of [...this.known]) if (!items.includes(k)) this.known.delete(k);
    if (!this._selected || !items.includes(this._selected)) {
      const pre =
        items.find((i) => i.hasAttribute('selected')) ??
        (this.selectedIndex >= 0 ? items[this.selectedIndex] : undefined) ??
        items[0] ??
        null;
      this.select(pre, false);
    } else {
      this.applySelection();
      const idx = items.indexOf(this._selected);
      if (this.selectedIndex !== idx) this.selectedIndex = idx;
    }
    this.syncScroll();
  }

  select(item: WinTabViewItem | null, user: boolean): void {
    const prev = this._selected;
    if (prev === item) return;
    const tabs = prev && this.tabWidthMode !== 'equal' ? this.items.map((i) => i.tabElement) : [];
    const before = tabs.map((t) => t.getBoundingClientRect().left);
    this._selected = item;
    this.applySelection();
    tabs.forEach((t, k) => {
      if (!t.isConnected || !t.getClientRects().length) return;
      const tx = translateX(t);
      const was = before[k]! - tx;
      const now = t.getBoundingClientRect().left - tx;
      if (Math.abs(was - now) < 0.5) return;
      animate(t, [{ transform: `translateX(${before[k]! - now}px)` }, { transform: 'none' }], {
        duration: durations.normal,
        easing: easings.decelerate,
      });
    });
    if (item) {
      scrollIntoViewWithin(this.$('.tabs'), item, 'x');
      if (user && prev)
        animate(item.panelInner, [{ opacity: 0 }, { opacity: 1 }], {
          duration: durations.fast,
          easing: easings.linear,
        });
    }
    const idx = item ? this.items.indexOf(item) : -1;
    if (this.selectedIndex !== idx) {
      this.selectedIndex = idx;
    }
    this.emit('selectionchanged', { selectedItem: item, previousItem: prev, selectedIndex: idx });
  }

  private applySelection(): void {
    const items = this.items;
    for (const it of items) {
      const on = it === this._selected;
      if (it.selected !== on) it.selected = on;
      it.tabIndex = on ? 0 : -1;
    }
    this.panelRo?.disconnect();
    if (this._selected) this.panelRo?.observe(this._selected.panelInner);
    this.syncSeparators(null);
    this.syncNaturalHeight();
  }

  private syncNaturalHeight(): void {
    const h = this._selected?.panelInner.offsetHeight ?? 0;
    this.style.setProperty('--tv-natural', `${h}px`);
    this.style.setProperty('--tv-strip-h', `${this.$('.strip').offsetHeight}px`);
  }

  private syncSeparators(hovered: WinTabViewItem | null): void {
    const items = this.items;
    items.forEach((it, i) => {
      const next = items[i + 1];
      const hide = !!next && (next === this._selected || next === hovered);
      it.toggleAttribute('data-sep-hidden', hide || i === items.length - 1);
    });
  }

  private onHover(ev: PointerEvent): void {
    const it = ev.composedPath().find((n) => n instanceof Element && n.localName === ITEM) as
      WinTabViewItem | undefined;
    this.syncSeparators(it ?? null);
  }

  private tabScroll(): { pos: number; max: number; rtl: boolean } {
    const tabs = this.$('.tabs');
    const max = Math.max(0, tabs.scrollWidth - tabs.clientWidth);
    return { pos: Math.min(max, Math.abs(tabs.scrollLeft)), max, rtl: isRtl(this) };
  }

  private scrollTabs(dir: -1 | 1): void {
    const tabs = this.$('.tabs');
    const { pos, max, rtl } = this.tabScroll();
    const target = Math.max(0, Math.min(max, (this.scrollTarget ?? pos) + dir * tabs.clientWidth * 0.5));
    if (Math.abs(target - pos) < 0.5) return;
    this.scrollTarget = target;
    tabs.scrollTo({ left: rtl ? -target : target });
  }

  private syncScroll(): void {
    const { pos, max } = this.tabScroll();
    const over = max > 1;
    this.toggleAttribute('data-scroll', over);
    (this.$('.sl') as HTMLButtonElement).disabled = pos < 2;
    (this.$('.sr') as HTMLButtonElement).disabled = pos > max - 2;
  }

  private onKey(ev: KeyboardEvent): void {
    const items = this.items.filter((i) => !i.disabled && !i.hidden && !this.closing.has(i));
    if (!items.length) return;
    if (ev.ctrlKey && ev.key === 'Tab') {
      ev.preventDefault();
      const cur = this._selected ? items.indexOf(this._selected) : -1;
      const to = items[(cur + (ev.shiftKey ? -1 : 1) + items.length) % items.length]!;
      this.select(to, true);
      to.focus();
      return;
    }
    if (ev.ctrlKey && (ev.key === 'F4' || ev.key.toLowerCase() === 'w') && this._selected) {
      ev.preventDefault();
      this._selected.requestClose();
      return;
    }
    const target = ev.composedPath()[0];
    const item = items.find((i) => i === target);
    if (!item) return;
    const rtl = isRtl(this);
    const i = items.indexOf(item);
    let to = -1;
    if (ev.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) to = Math.min(items.length - 1, i + 1);
    else if (ev.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) to = Math.max(0, i - 1);
    else if (ev.key === 'Home') to = 0;
    else if (ev.key === 'End') to = items.length - 1;
    else if (ev.key === 'Delete') {
      item.requestClose();
      return;
    }
    if (to < 0) return;
    ev.preventDefault();
    this.select(items[to]!, true);
    items[to]!.focus();
  }

  private beginDrag(item: WinTabViewItem, ev: PointerEvent): void {
    this.drag = {
      item,
      pointerId: ev.pointerId,
      startX: ev.clientX,
      lastX: ev.clientX,
      active: false,
      from: this.items.indexOf(item),
    };
    const move = (e: PointerEvent) => this.onDragMove(e);
    const up = (e: PointerEvent) => {
      this.removeEventListener('pointermove', move);
      this.removeEventListener('pointerup', up);
      this.removeEventListener('pointercancel', up);
      this.endDrag(e);
    };
    try {
      this.setPointerCapture(ev.pointerId);
    } catch {}
    this.addEventListener('pointermove', move);
    this.addEventListener('pointerup', up);
    this.addEventListener('pointercancel', up);
  }

  private onDragMove(ev: PointerEvent): void {
    const d = this.drag;
    if (!d || ev.pointerId !== d.pointerId) return;
    const dx = ev.clientX - d.startX;
    if (!d.active) {
      if (Math.abs(dx) < 6) return;
      d.active = true;
      for (const a of d.item.tabElement.getAnimations()) if (!(a instanceof CSSTransition)) a.cancel();
      d.item.toggleAttribute('data-dragging', true);
      this.emit('tabdragstarting', { item: d.item, tab: d.item });
    }
    d.lastX = ev.clientX;
    const tab = d.item.tabElement;
    tab.style.transform = `translateX(${dx}px)`;
    const layout = (el: HTMLElement) => {
      const r = el.getBoundingClientRect();
      const m = new DOMMatrixReadOnly(
        getComputedStyle(el).transform === 'none' ? undefined : getComputedStyle(el).transform,
      );
      return { left: r.left - m.m41, width: r.width };
    };
    const items = this.items;
    const idx = items.indexOf(d.item);
    const r = tab.getBoundingClientRect();
    const mid = r.left + r.width / 2;
    const swapWith = (j: number) => {
      const other = items[j];
      if (!other) return false;
      const o = layout(other.tabElement);
      const om = o.left + o.width / 2;
      return j > idx ? mid > om : mid < om;
    };
    let target = idx;
    if (swapWith(idx + 1)) target = idx + 1;
    else if (swapWith(idx - 1)) target = idx - 1;
    if (target !== idx) {
      tab.style.transform = 'none';
      const before = tab.getBoundingClientRect().left;
      const others = items.filter((i) => i !== d.item).map((i) => i.tabElement);
      flip(
        others,
        () => {
          const ref = target > idx ? items[target]!.nextSibling : items[target]!;
          this.insertBefore(d.item, ref);
        },
        durations.fast,
      );
      const after = tab.getBoundingClientRect().left;
      d.startX += after - before;
      tab.style.transform = `translateX(${ev.clientX - d.startX}px)`;
    }
  }

  private endDrag(ev: PointerEvent): void {
    const d = this.drag;
    this.drag = null;
    try {
      this.releasePointerCapture(ev.pointerId);
    } catch {}
    if (!d?.active) return;
    const tab = d.item.tabElement;
    const cur = tab.style.transform;
    tab.style.transform = '';
    void settled(
      animate(tab, [{ transform: cur || 'none' }, { transform: 'none' }], {
        duration: durations.normal,
        easing: easings.point,
      }),
    ).then(() => d.item.removeAttribute('data-dragging'));
    const to = this.items.indexOf(d.item);
    this.emit('tabdragcompleted', { item: d.item, tab: d.item });
    if (to !== d.from)
      this.emit('tabitemschanged', { collectionChange: 'reordered', item: d.item, oldIndex: d.from, newIndex: to });
    this.sync();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-tab-view': WinTabView;
    'win-tab-view-item': WinTabViewItem;
  }
}
