import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { iconHtml } from '../../base/icons.ts';
import { navigateIndex } from '../../base/keyboard.ts';
import { isRtl } from '../../base/dom.ts';
import { motionEnabled } from '../../motion/animate.ts';

const segmentedCss = css`
:host {
  display: inline-flex;
  position: relative;
  box-sizing: border-box;
  vertical-align: middle;
  max-width: 100%;
}
.track {
  display: flex;
  position: relative;
  box-sizing: border-box;
  width: 100%;
  padding: 2px;
  gap: 2px;
  border: 1px solid var(--w-control-stroke-color-default);
  border-radius: var(--w-corner-radius-control);
  background: var(--w-control-alt-fill-color-secondary);
  background-clip: padding-box;
}
:host([stretch]) { display: flex; }
:host([stretch]) ::slotted(win-segmented-item) { flex: 1 1 0; }
.indicator {
  position: absolute;
  top: 2px;
  bottom: 2px;
  left: 0;
  width: 0;
  box-sizing: border-box;
  border: 1px solid;
  border-color: var(--w-control-elevation-border);
  border-radius: var(--w-corner-radius-control);
  background: var(--w-control-fill-color-default);
  background-clip: padding-box;
  pointer-events: none;
  opacity: 0;
  transition:
    translate var(--w-duration-normal) var(--w-ease-point),
    width var(--w-duration-normal) var(--w-ease-point),
    opacity var(--w-duration-faster) linear;
}
:host([data-indicator]) .indicator { opacity: 1; }
:host([data-no-anim]) .indicator { transition: none; }
.indicator .pill {
  position: absolute;
  left: 50%;
  bottom: 1px;
  width: 12px;
  height: 3px;
  margin-left: -6px;
  border-radius: 1.5px;
  background: var(--w-accent-fill-color-default);
  transition: scale var(--w-duration-fast) var(--w-ease-decelerate);
}
:host([data-hover-selected]) .indicator .pill { scale: 1.333 1; }
:host([data-press-selected]) .indicator .pill { scale: 0.667 1; }

:host([appearance="pivot"]) .track { border-color: transparent; background: transparent; padding: 0; gap: 4px; }
:host([appearance="pivot"]) .indicator { border-color: transparent; background: transparent; top: 0; bottom: 0; }
:host([appearance="pivot"]) .indicator .pill { width: 16px; margin-left: -8px; bottom: 0; }

:host([appearance="button"]) .track { border-color: transparent; background: transparent; padding: 0; gap: 4px; }
:host([appearance="button"]) .indicator { display: none; }

:host([disabled]) { pointer-events: none; }
:host([disabled]) .track { opacity: 1; }
:host([disabled]) .indicator .pill { background: var(--w-accent-fill-color-disabled); }
`;

const itemCss = css`
:host {
  display: inline-flex;
  position: relative;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  min-height: 26px;
  padding: 3px 11px 4px;
  border: 1px solid transparent;
  border-radius: var(--w-corner-radius-control);
  background-clip: padding-box;
  color: var(--w-text-fill-color-secondary);
  font: var(--w-type-body);
  white-space: nowrap;
  cursor: default;
  user-select: none;
  outline: none;
  z-index: 0;
  transition: background-color var(--w-duration-faster) linear, color var(--w-duration-faster) linear;
}
:host(:hover) { background-color: var(--w-subtle-fill-color-secondary); color: var(--w-text-fill-color-primary); }
:host(:active), :host([data-pressed]) { background-color: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-secondary); }
:host([selected]) { color: var(--w-text-fill-color-primary); background-color: transparent; }
:host([selected]:active) { color: var(--w-text-fill-color-secondary); }
:host([selected][data-own-surface]) {
  background-color: var(--w-control-fill-color-default);
  border-color: var(--w-control-elevation-border);
}
:host([selected][data-own-surface])::after {
  content: '';
  position: absolute;
  left: 50%;
  bottom: 1px;
  width: 12px;
  height: 3px;
  margin-left: -6px;
  border-radius: 1.5px;
  background: var(--w-accent-fill-color-default);
}
:host([disabled]) { color: var(--w-text-fill-color-disabled); pointer-events: none; }
${focusRing(':host(:focus-visible)', 1)}
.icon { display: inline-flex; align-items: center; justify-content: center; }
.icon[hidden] { display: none; }

:host([data-appearance="pivot"]) { padding: 5px 12px 9px; min-height: 32px; background: transparent !important; color: var(--w-text-fill-color-secondary); }
:host([data-appearance="pivot"]:hover) { color: var(--w-text-fill-color-primary); }
:host([data-appearance="pivot"][selected]) { color: var(--w-text-fill-color-primary); font: var(--w-type-body-strong); }

:host([data-appearance="button"]) {
  min-height: 32px;
  padding: 5px 11px 6px;
  border-color: var(--w-control-elevation-border);
  background-color: var(--w-control-fill-color-default);
  color: var(--w-text-fill-color-primary);
}
:host([data-appearance="button"]:hover) { background-color: var(--w-control-fill-color-secondary); }
:host([data-appearance="button"]:active) { background-color: var(--w-control-fill-color-tertiary); border-color: var(--w-control-stroke-color-default); color: var(--w-text-fill-color-secondary); }
:host([data-appearance="button"][selected]) {
  background-color: var(--w-accent-fill-color-default);
  border-color: var(--w-accent-control-elevation-border);
  color: var(--w-text-on-accent-fill-color-primary);
}
:host([data-appearance="button"][selected]:hover) { background-color: var(--w-accent-fill-color-secondary); }
:host([data-appearance="button"][selected]:active) { background-color: var(--w-accent-fill-color-tertiary); border-color: transparent; color: var(--w-text-on-accent-fill-color-secondary); }
:host([data-appearance="button"][selected])::after { display: none; }
:host([data-appearance="button"][disabled]) { background-color: var(--w-control-fill-color-disabled); border-color: var(--w-control-stroke-color-default); color: var(--w-text-fill-color-disabled); }
`;

export class WinSegmentedItem extends WinElement {
  static override styles = [itemCss];
  static override template = `<span class="icon" part="icon" hidden><span class="icon-spec"></span><slot name="icon"></slot></span><slot></slot>`;
  static override props: PropDefs = {
    selected: { type: Boolean },
    disabled: { type: Boolean },
    icon: { type: String },
    value: { type: String },
  };
  declare selected: boolean;
  declare disabled: boolean;
  declare icon: string;
  declare value: string;

  static {
    this.define('win-segmented-item');
  }

  protected override firstConnected(): void {
    this.$('slot[name="icon"]').addEventListener('slotchange', () => this.syncIcon());
    this.addEventListener('pointerdown', () => this.toggleAttribute('data-pressed', true));
    const up = () => this.removeAttribute('data-pressed');
    this.addEventListener('pointerup', up);
    this.addEventListener('pointerleave', up);
    this.addEventListener('pointercancel', up);
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('icon')) this.syncIcon();
    if (changed.has('disabled')) this.aria('aria-disabled', this.disabled ? 'true' : null);
    if (changed.has('selected')) this.parentElement?.dispatchEvent(new CustomEvent('w-seg-sync'));
  }

  private syncIcon(): void {
    this.$('.icon-spec').innerHTML = iconHtml(this.icon, 16);
    const slotted = this.$<HTMLSlotElement>('slot[name="icon"]').assignedElements().length;
    this.$('.icon').hidden = !this.icon && !slotted;
  }

  get itemValue(): string {
    return this.value || (this.textContent ?? '').trim() || this.getAttribute('aria-label') || '';
  }
}

export class WinSegmented extends WinElement {
  static override styles = [segmentedCss];
  static override template = `<div class="track" part="track"><div class="indicator" part="indicator"><span class="pill" part="pill"></span></div><slot></slot></div>`;
  static override formAssociated = true;
  static override props: PropDefs = {
    selectionMode: { type: String, attribute: 'selection-mode', default: 'single' },
    selectedIndex: { type: Number, attribute: 'selected-index', default: -1 },
    appearance: { type: String, reflect: true, default: 'default' },
    disabled: { type: Boolean },
    stretch: { type: Boolean },
    name: { type: String },
  };
  declare selectionMode: 'single' | 'multiple';
  declare selectedIndex: number;
  declare appearance: 'default' | 'pivot' | 'button';
  declare disabled: boolean;
  declare stretch: boolean;
  declare name: string;

  private ro: ResizeObserver | null = null;
  private syncing = false;

  static {
    this.define('win-segmented');
  }

  get items(): WinSegmentedItem[] {
    const items = Array.from(this.children).filter((c): c is WinSegmentedItem => c.localName === 'win-segmented-item');
    for (const i of items) customElements.upgrade(i);
    return items;
  }

  get selectedItems(): WinSegmentedItem[] {
    return this.items.filter((i) => i.selected);
  }

  get selectedItem(): WinSegmentedItem | null {
    return this.selectedItems[0] ?? null;
  }

  get value(): string {
    return this.selectedItems.map((i) => i.itemValue).join(',');
  }

  protected override firstConnected(): void {
    this.$('slot').addEventListener('slotchange', () => this.syncItems(false));
    this.addEventListener('w-seg-sync', () => {
      if (!this.syncing) this.syncItems(true);
    });
    this.addEventListener('click', (ev) => {
      const item = this.itemFrom(ev);
      if (!item || item.disabled || this.disabled) return;
      this.toggleItem(item);
    });
    this.addEventListener('keydown', (ev) => this.onKey(ev));
    this.addEventListener('pointerover', (ev) => this.toggleAttr('data-hover-selected', !!this.itemFrom(ev)?.selected));
    this.addEventListener('pointerleave', () => this.removeAttribute('data-hover-selected'));
    this.addEventListener('pointerdown', (ev) => this.toggleAttr('data-press-selected', !!this.itemFrom(ev)?.selected));
    addEventListener('pointerup', () => this.removeAttribute('data-press-selected'));
    this.ro = new ResizeObserver(() => this.moveIndicator(false));
    this.ro.observe(this);
  }

  protected override connected(): void {
    this.ro?.observe(this);
  }
  protected override disconnected(): void {
    this.ro?.disconnect();
  }

  private itemFrom(ev: Event): WinSegmentedItem | null {
    for (const n of ev.composedPath()) {
      if (n instanceof HTMLElement && n.localName === 'win-segmented-item' && n.parentElement === this) {
        return n as WinSegmentedItem;
      }
    }
    return null;
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('selectionMode') || first) {
      const multi = this.selectionMode === 'multiple';
      this.setAttribute('role', multi ? 'listbox' : 'radiogroup');
      this.aria('aria-multiselectable', multi ? 'true' : null);
    }
    if (changed.has('selectedIndex') && !first && this.selectionMode !== 'multiple') {
      const items = this.items;
      this.syncing = true;
      items.forEach((it, i) => {
        it.selected = i === this.selectedIndex;
      });
      this.syncing = false;
    }
    if (changed.has('disabled')) this.aria('aria-disabled', this.disabled ? 'true' : null);
    this.syncItems(!first);
  }

  private syncItems(animateMove: boolean): void {
    const items = this.items;
    const multi = this.selectionMode === 'multiple';
    this.syncing = true;
    if (!multi) {
      let idx = this.selectedIndex;
      if (idx < 0 || idx >= items.length) idx = items.findIndex((i) => i.selected);
      items.forEach((it, i) => {
        it.selected = i === idx;
      });
      if (this.selectedIndex !== idx) {
        this.selectedIndex = idx;
      }
    }
    this.syncing = false;
    const focusIdx = Math.max(
      0,
      items.findIndex((i) => i.selected),
    );
    const ownSurface = multi || this.appearance === 'button';
    items.forEach((it, i) => {
      it.setAttribute('role', multi ? 'option' : 'radio');
      it.setAttribute(multi ? 'aria-selected' : 'aria-checked', String(it.selected));
      it.removeAttribute(multi ? 'aria-checked' : 'aria-selected');
      it.setAttribute('data-appearance', this.appearance);
      it.toggleAttribute('data-own-surface', ownSurface);
      it.tabIndex = !this.disabled && i === focusIdx ? 0 : -1;
      it.toggleAttribute('disabled', it.disabled || this.disabled);
    });
    this.internals.setFormValue(this.value || null);
    this.moveIndicator(animateMove);
  }

  private moveIndicator(animateMove: boolean): void {
    if (!this.isInitialized) return;
    const ind = this.$('.indicator');
    const sel = this.selectedItem;
    const show = !!sel && this.selectionMode !== 'multiple' && this.appearance !== 'button';
    this.toggleAttr('data-indicator', show);
    if (!show || !sel) return;
    const noAnim = !animateMove || !motionEnabled() || !ind.style.width;
    this.toggleAttr('data-no-anim', noAnim);
    ind.style.translate = `${sel.offsetLeft}px 0`;
    ind.style.width = `${sel.offsetWidth}px`;
    if (noAnim) {
      void ind.offsetWidth;
      requestAnimationFrame(() => this.removeAttribute('data-no-anim'));
    }
  }

  private toggleItem(item: WinSegmentedItem): void {
    const items = this.items;
    if (this.selectionMode === 'multiple') {
      item.selected = !item.selected;
    } else {
      if (item.selected) return;
      this.syncing = true;
      for (const i of items) i.selected = i === item;
      this.syncing = false;
      this.selectedIndex = items.indexOf(item);
    }
    this.syncItems(true);
    item.focus();
    this.emit('selectionchanged', {
      selectedIndex: items.indexOf(item),
      selectedItems: this.selectedItems,
      value: this.value,
    });
    this.dispatchEvent(new Event('change', { bubbles: true }));
  }

  private onKey(ev: KeyboardEvent): void {
    if (this.disabled) return;
    const items = this.items.filter((i) => !i.disabled);
    const current = items.indexOf(ev.target as WinSegmentedItem);
    if (current < 0) return;
    if ((ev.key === ' ' || ev.key === 'Enter') && !ev.repeat) {
      ev.preventDefault();
      this.toggleItem(items[current]!);
      return;
    }
    const next = navigateIndex(ev.key, current, items.length, { axis: 'horizontal', wrap: true, rtl: isRtl(this) });
    if (next < 0 || next === current) return;
    ev.preventDefault();
    const target = items[next]!;
    for (const i of this.items) i.tabIndex = i === target ? 0 : -1;
    target.focus();
    if (this.selectionMode !== 'multiple') this.toggleItem(target);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-segmented': WinSegmented;
    'win-segmented-item': WinSegmentedItem;
  }
}
