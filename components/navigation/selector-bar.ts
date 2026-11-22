import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { iconHtml } from '../../base/icons.ts';
import { isRtl } from '../../base/dom.ts';

const ITEM = 'win-selector-bar-item';

const itemCss = css`
:host {
  position: relative;
  display: inline-grid;
  grid-template-rows: auto auto;
  justify-items: center;
  flex: none;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}
:host([hidden]) { display: none; }
.content {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  padding: 10px 12px 7px;
  white-space: nowrap;
}
:host(:hover) { color: var(--w-text-fill-color-secondary); }
:host(:active), :host([data-pressed]) { color: var(--w-text-fill-color-tertiary); }
:host([selected]) { color: var(--w-text-fill-color-primary); }
:host([selected]:hover) { color: var(--w-text-fill-color-secondary); }
:host([disabled]) { color: var(--w-text-fill-color-disabled); pointer-events: none; }
${focusRing(':host(:focus-visible)', 2)}
.icon { display: inline-flex; margin: 0 -2px; scale: 0.8; }
.icon:empty { display: none; }
.pill {
  width: 4px;
  height: 3px;
  border-radius: 0.5px / 1px;
  background: var(--w-accent-fill-color-default);
  opacity: 0;
  scale: 1 1;
  transition: scale var(--w-duration-fast) var(--w-ease-decelerate), opacity var(--w-duration-fast) var(--w-ease-decelerate);
}
:host([selected]) .pill { opacity: 1; scale: 4 1; }
:host([disabled][selected]) .pill { background: var(--w-accent-fill-color-disabled); }
`;

export class WinSelectorBarItem extends WinElement {
  static override styles = [itemCss];
  static override template = `<span class="content" part="content"><span class="icon" part="icon"></span><span class="text" part="text"></span><slot></slot></span><span class="pill" part="selection-indicator"></span>`;
  static override props: PropDefs = {
    text: { type: String },
    icon: { type: String },
    selected: { type: Boolean },
    disabled: { type: Boolean },
  };
  declare text: string;
  declare icon: string;
  declare selected: boolean;
  declare disabled: boolean;

  static {
    this.define(ITEM);
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'tab');
    this.tabIndex = -1;
    this.addEventListener('click', () => {
      if (!this.disabled)
        this.dispatchEvent(
          new CustomEvent('win-selector-invoke', { bubbles: true, composed: true, detail: { item: this } }),
        );
    });
    this.addEventListener('keydown', (ev) => {
      if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        this.click();
      }
    });
  }

  protected override updated(changed: Set<string>): void {
    if (changed.has('text')) this.$('.text').textContent = this.text;
    if (changed.has('icon')) this.$('.icon').innerHTML = iconHtml(this.icon, 16);
    if (changed.has('selected')) this.aria('aria-selected', this.selected ? 'true' : 'false');
    if (changed.has('disabled')) this.aria('aria-disabled', this.disabled ? 'true' : null);
  }
}

export interface SelectorBarSelectionChangedDetail {
  selectedItem: WinSelectorBarItem | null;
  previousItem: WinSelectorBarItem | null;
  selectedIndex: number;
}

export class WinSelectorBar extends WinElement {
  static override styles = [
    css`
      :host { display: inline-flex; max-width: 100%; }
      .bar { display: flex; align-items: stretch; padding: 4px 0; min-width: 0; overflow-x: auto; scrollbar-width: none; }
    `,
  ];
  static override template = `<div class="bar" part="bar" role="tablist"><slot></slot></div>`;
  private _selected: WinSelectorBarItem | null = null;
  private mo: MutationObserver | null = null;

  static {
    this.define('win-selector-bar');
  }

  get items(): WinSelectorBarItem[] {
    return Array.from(this.children).filter((c): c is WinSelectorBarItem => c.localName === ITEM);
  }

  get selectedItem(): WinSelectorBarItem | null {
    return this._selected;
  }
  set selectedItem(item: WinSelectorBarItem | null) {
    this.select(item, false);
  }

  get selectedIndex(): number {
    return this._selected ? this.items.indexOf(this._selected) : -1;
  }
  set selectedIndex(i: number) {
    this.select(this.items[i] ?? null, false);
  }

  protected override firstConnected(): void {
    this.addEventListener('win-selector-invoke', (ev) => {
      ev.stopPropagation();
      this.select((ev as CustomEvent<{ item: WinSelectorBarItem }>).detail.item, true);
    });
    this.addEventListener('keydown', (ev) => {
      const items = this.items.filter((i) => !i.disabled && !i.hidden);
      const cur = items.indexOf(
        ev.composedPath().find((n) => items.includes(n as WinSelectorBarItem)) as WinSelectorBarItem,
      );
      if (cur < 0) return;
      const rtl = isRtl(this);
      let to = -1;
      if (ev.key === (rtl ? 'ArrowLeft' : 'ArrowRight')) to = Math.min(items.length - 1, cur + 1);
      else if (ev.key === (rtl ? 'ArrowRight' : 'ArrowLeft')) to = Math.max(0, cur - 1);
      else if (ev.key === 'Home') to = 0;
      else if (ev.key === 'End') to = items.length - 1;
      if (to < 0) return;
      ev.preventDefault();
      items[to]!.focus();
      this.select(items[to]!, true);
    });
    this.mo = new MutationObserver(() => this.adopt());
    this.mo.observe(this, { childList: true, subtree: true, attributes: true, attributeFilter: ['selected'] });
    this.adopt();
  }

  private adopt(): void {
    const items = this.items;
    if (!this._selected || !items.includes(this._selected)) {
      this._selected = items.find((i) => i.hasAttribute('selected')) ?? null;
    }
    for (const it of items) {
      if (it.hasAttribute('selected') && it !== this._selected) it.removeAttribute('selected');
    }
    const stop = this._selected ?? items.find((i) => !i.disabled) ?? null;
    for (const it of items) it.tabIndex = it === stop ? 0 : -1;
  }

  select(item: WinSelectorBarItem | null, user: boolean): void {
    const prev = this._selected;
    if (prev === item) return;
    this._selected = item;
    for (const it of this.items) it.selected = it === item;
    for (const it of this.items) it.tabIndex = it === item ? 0 : -1;
    if (user || item !== prev) {
      this.emit<SelectorBarSelectionChangedDetail>('selectionchanged', {
        selectedItem: item,
        previousItem: prev,
        selectedIndex: item ? this.items.indexOf(item) : -1,
      });
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-selector-bar': WinSelectorBar;
    'win-selector-bar-item': WinSelectorBarItem;
  }
}
