import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing, scrollbars } from '../../base/css.ts';
import { iconHtml } from '../../base/icons.ts';
import { TypeAhead } from '../../base/keyboard.ts';
import { Popup, popupResetCss } from '../../base/popup.ts';
import { deepActiveElement } from '../../base/dom.ts';
import { menuIn, popupOut } from '../../motion/animate.ts';
import {
  handleMenuKeys,
  isMenuItem,
  layoutMenuLevel,
  menuPresenterCss,
  type CommandLike,
  type MenuItemBase,
} from '../flyouts/menu-flyout.ts';

const menuBarCss = css`
:host {
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  min-height: 40px;
  background: transparent;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
}
.items { display: flex; align-items: stretch; }
`;

const menuBarItemCss = css`
:host {
  display: inline-flex;
  position: relative;
  align-items: center;
  box-sizing: border-box;
  margin: 4px;
  padding: 4px 10px;
  border-radius: var(--w-corner-radius-control);
  background-color: transparent;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  white-space: nowrap;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
  transition: background-color var(--w-duration-faster) linear;
}
:host(:hover) { background-color: var(--w-subtle-fill-color-secondary); }
:host(:active), :host([data-pressed]) { background-color: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-secondary); }
:host([selected]) { background-color: var(--w-subtle-fill-color-tertiary); }
:host([disabled]) { color: var(--w-text-fill-color-disabled); pointer-events: none; }
${focusRing(':host(:focus-visible)', 3)}
.title u { text-decoration: none; }
:host([data-show-keys]) .title u { text-decoration: underline; }
.icon { display: none; flex: none; width: 16px; height: 16px; margin-inline-end: 8px; align-items: center; justify-content: center; }
:host([data-w-has-icon]) .icon { display: inline-flex; }
.icon ::slotted(*) { max-width: 16px; max-height: 16px; font-size: 16px; }
${popupResetCss('.menu')}
`;

let lastAltDown = 0;
let altCombo = false;
let accessKeysInstalled = false;

export class WinMenuBar extends WinElement {
  static override styles = [menuBarCss];
  static override template = `<div class="items" part="items"><slot></slot></div>`;

  static {
    this.define('win-menu-bar');
  }

  get items(): WinMenuBarItem[] {
    return Array.from(this.children).filter((c): c is WinMenuBarItem => c instanceof WinMenuBarItem && !c.hidden);
  }

  get openItem(): WinMenuBarItem | null {
    return this.items.find((i) => i.isMenuOpen) ?? null;
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'menubar');
    this.renderRoot.addEventListener('slotchange', () => this.syncRoving());
    this.addEventListener('keydown', (ev) => this.onKey(ev));
    this.addEventListener('pointerover', (ev) => {
      const item = (ev.target as Element).closest?.('win-menu-bar-item');
      if (!(item instanceof WinMenuBarItem) || item.parentElement !== this) return;
      const open = this.openItem;
      if (open && open !== item && !item.disabled) {
        open.closeMenu(false);
        item.openMenu('none');
      }
    });
    this.addEventListener('focusin', (ev) => {
      const item = (ev.target as Element).closest?.('win-menu-bar-item');
      if (item instanceof WinMenuBarItem && item.parentElement === this) this.syncRoving(item);
    });
    installAccessKeys();
    queueMicrotask(() => this.syncRoving());
  }

  private syncRoving(active?: WinMenuBarItem): void {
    const items = this.items;
    const target = active ?? items.find((i) => i.tabIndex === 0) ?? items[0];
    for (const i of items) i.tabIndex = i === target && !i.disabled ? 0 : -1;
  }

  step(from: WinMenuBarItem, dir: 1 | -1, keepOpen: boolean): void {
    const items = this.items.filter((i) => !i.disabled);
    const idx = items.indexOf(from);
    const next = items[(idx + dir + items.length) % items.length];
    if (!next || next === from) return;
    if (keepOpen) {
      from.closeMenu(false);
      next.openMenu('first');
    } else next.focus();
  }

  private onKey(ev: KeyboardEvent): void {
    const t = ev.target as Element;
    if (!(t instanceof WinMenuBarItem) || t.parentElement !== this) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    switch (ev.key) {
      case 'ArrowRight':
      case 'ArrowLeft': {
        ev.preventDefault();
        const dir = (ev.key === 'ArrowRight') !== rtl ? 1 : -1;
        this.step(t, dir, false);
        break;
      }
      case 'Home':
        ev.preventDefault();
        this.items.find((i) => !i.disabled)?.focus();
        break;
      case 'End':
        ev.preventDefault();
        [...this.items]
          .reverse()
          .find((i) => !i.disabled)
          ?.focus();
        break;
      case 'ArrowDown':
      case 'Enter':
      case ' ':
        ev.preventDefault();
        t.activate('first');
        break;
      case 'ArrowUp':
        ev.preventDefault();
        t.openMenu('last');
        break;
    }
  }
}

export class WinMenuBarItem extends WinElement {
  static override styles = [menuBarItemCss, scrollbars, menuPresenterCss];
  static override template = `<span class="icon" part="icon" aria-hidden="true"><span class="icon-spec"></span><slot name="icon"></slot></span><span class="title" part="title"></span><div class="menu" part="menu"><div class="presenter" part="presenter" role="menu" tabindex="-1"><div class="items w-scroll" part="items"><slot></slot></div></div></div>`;
  static override props: PropDefs = {
    disabled: { type: Boolean },
    accessKey: { type: String, attribute: 'access-key' },
    icon: { type: String, reflect: true },
  };
  declare disabled: boolean;
  declare accessKey: string;
  declare icon: string;

  private _title = '';
  popup!: Popup;
  private typeahead = new TypeAhead();
  private _command: CommandLike | null = null;

  static {
    this.define('win-menu-bar-item');
    Object.defineProperty(this.prototype, 'title', {
      configurable: true,
      get(this: WinMenuBarItem) {
        return this._title;
      },
      set(this: WinMenuBarItem, v: string) {
        this._title = String(v ?? '');
        this.syncTitle();
      },
    });
  }

  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'title'];
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === 'title') {
      if (value !== null) {
        this._title = value;
        this.removeAttribute('title');
        this.syncTitle();
      }
      return;
    }
    super.attributeChangedCallback(name, old, value);
  }

  get command(): CommandLike | null {
    return this._command;
  }
  set command(c: CommandLike | null) {
    this._command = c;
  }

  get menuItems(): MenuItemBase[] {
    return Array.from(this.children).filter(isMenuItem);
  }

  get isMenuOpen(): boolean {
    return this.popup?.isOpen ?? false;
  }

  get bar(): WinMenuBar | null {
    return this.parentElement instanceof WinMenuBar ? this.parentElement : null;
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'menuitem');
    const t = this.getAttribute('title');
    if (t !== null) {
      this._title = t;
      this.removeAttribute('title');
    }
    this.popup = new Popup(this.$('.menu'), this.$('.presenter'));
    this.addEventListener('click', (ev) => {
      if (this.disabled) return;
      if (ev.composedPath().includes(this.$('.menu')) || (ev.target as Element) !== this) return;
      this.command?.execute();
      if (!this.menuItems.length) return;
      if (this.isMenuOpen) this.closeMenu(true);
      else this.openMenu(ev.detail === 0 ? 'first' : 'none');
    });
    this.addEventListener('keydown', (ev) => {
      const target = ev.target as Element;
      if (target === this || target.parentElement !== this) return;
      const rtl = getComputedStyle(this).direction === 'rtl';
      const handled = handleMenuKeys(this, ev, this.typeahead, () => this.bar?.step(this, rtl ? 1 : -1, true));
      if (handled) {
        ev.preventDefault();
        ev.stopPropagation();
        return;
      }
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        ev.stopPropagation();
        const dir = (ev.key === 'ArrowRight') !== rtl ? 1 : -1;
        this.bar?.step(this, dir as 1 | -1, true);
      }
    });
    this.$('.presenter').addEventListener('keydown', (ev) => {
      if (handleMenuKeys(this, ev, this.typeahead)) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    });
    this.addEventListener('win-menu-invoke', () => this.closeMenu(true));
    this.addEventListener('pointerover', (ev) => {
      const item = (ev.target as Element).closest?.(
        'win-menu-flyout-item, win-toggle-menu-flyout-item, win-radio-menu-flyout-item, win-menu-flyout-sub-item, win-menu-flyout-separator',
      );
      if (!item || item.parentElement !== this) return;
      for (const sub of this.querySelectorAll(':scope > win-menu-flyout-sub-item')) {
        if (sub !== item) (sub as unknown as { scheduleClose(): void }).scheduleClose();
      }
    });
    this.$('slot[name="icon"]').addEventListener('slotchange', () => this.syncIcon());
    this.syncTitle();
  }

  protected override updated(changed: Set<string>): void {
    if (changed.has('disabled')) this.aria('aria-disabled', this.disabled ? 'true' : null);
    if (changed.has('accessKey')) this.syncTitle();
    if (changed.has('icon')) this.syncIcon();
  }

  private syncIcon(): void {
    this.$('.icon-spec').innerHTML = iconHtml(this.icon, 16);
    const slotted = this.$<HTMLSlotElement>('slot[name="icon"]').assignedElements().length > 0;
    this.toggleAttr('data-w-has-icon', !!this.icon || slotted);
  }

  get effectiveAccessKey(): string {
    return (this.accessKey || this._title.trim().charAt(0)).toLowerCase();
  }

  private syncTitle(): void {
    const el = this.renderRoot?.querySelector('.title');
    if (!el) return;
    const t = this._title;
    const key = this.effectiveAccessKey;
    const i = key ? t.toLowerCase().indexOf(key) : -1;
    if (i >= 0) {
      el.innerHTML = '';
      el.append(t.slice(0, i));
      const u = document.createElement('u');
      u.textContent = t.charAt(i);
      el.append(u, t.slice(i + 1));
    } else el.textContent = t;
    this.aria('aria-haspopup', this.menuItems.length ? 'menu' : null);
  }

  activate(focus: 'first' | 'none'): void {
    if (this.disabled) return;
    this.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
    if (this.menuItems.length && !this.isMenuOpen) this.openMenu(focus);
    else if (this.isMenuOpen && focus === 'first') this.focusItem(0);
  }

  openMenu(focus: 'first' | 'last' | 'none'): void {
    if (this.disabled || !this.menuItems.length) return;
    if (!this.isMenuOpen) {
      layoutMenuLevel(this.children, false);
      this.typeahead.reset();
      this.toggleAttribute('selected', true);
      this.aria('aria-expanded', 'true');
      this.popup.open({
        anchor: this,
        placement: getComputedStyle(this).direction === 'rtl' ? 'bottom-end' : 'bottom-start',
        offset: 4,
        focus: 'none',
        restoreFocus: false,
        passThrough: this.bar ? [this.bar] : [this],
        animateIn: (s, side) => menuIn(s, side),
        animateOut: (s) => popupOut(s),
        onClosed: () => {
          this.removeAttribute('selected');
          this.aria('aria-expanded', 'false');
          const ae = deepActiveElement();
          if (!ae || ae === document.body || this.contains(ae)) this.focus({ preventScroll: true });
        },
      });
    }
    if (focus === 'first') this.focusItem(0);
    else if (focus === 'last') this.focusItem(-1);
    else this.$('.presenter').focus({ preventScroll: true });
  }

  closeMenu(focusSelf: boolean): void {
    if (!this.isMenuOpen) return;
    void this.popup.close('programmatic');
    if (focusSelf) this.focus({ preventScroll: true });
  }

  private focusItem(i: number): void {
    const items = this.menuItems.filter((m) => !m.hasAttribute('disabled') && !m.hidden);
    const target = i < 0 ? items[items.length - 1] : items[i];
    target?.focus();
  }
}

function installAccessKeys(): void {
  if (accessKeysInstalled) return;
  accessKeysInstalled = true;
  const showKeys = (on: boolean) => {
    for (const i of document.querySelectorAll('win-menu-bar-item')) i.toggleAttribute('data-show-keys', on);
  };
  document.addEventListener('keydown', (ev) => {
    if (ev.key === 'Alt') {
      lastAltDown = performance.now();
      altCombo = false;
      showKeys(true);
      return;
    }
    if (ev.altKey) altCombo = true;
    if (ev.key === 'F10' && !ev.shiftKey && !ev.ctrlKey) {
      const first = document.querySelector('win-menu-bar win-menu-bar-item:not([disabled])') as HTMLElement | null;
      if (first) {
        ev.preventDefault();
        first.focus();
      }
      return;
    }
    if (ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.key.length === 1) {
      const key = ev.key.toLowerCase();
      for (const item of document.querySelectorAll<WinMenuBarItem>('win-menu-bar-item')) {
        if (!item.disabled && !item.hidden && item.effectiveAccessKey === key) {
          ev.preventDefault();
          showKeys(false);
          item.activate('first');
          return;
        }
      }
    }
  });
  document.addEventListener('keyup', (ev) => {
    if (ev.key !== 'Alt') return;
    showKeys(false);
    if (!altCombo && performance.now() - lastAltDown < 800) {
      const first = document.querySelector('win-menu-bar win-menu-bar-item:not([disabled])') as HTMLElement | null;
      if (first) {
        ev.preventDefault();
        first.focus();
      }
    }
  });
  addEventListener('blur', () => showKeys(false));
}

declare global {
  interface HTMLElementTagNameMap {
    'win-menu-bar': WinMenuBar;
    'win-menu-bar-item': WinMenuBarItem;
  }
}
