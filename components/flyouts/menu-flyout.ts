import { WinElement, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css, focusRing, materialOverrides, scrollbars } from '../../base/css.ts';
import { glyph, iconHtml } from '../../base/icons.ts';
import { keyboardActivation, TypeAhead } from '../../base/keyboard.ts';
import { Popup, popupResetCss, viewportSize, type FlyoutShowOptions, type PositionResult } from '../../base/popup.ts';
import { composedContains, deepActiveElement, isRtl } from '../../base/dom.ts';
import { menuIn, popupOut } from '../../motion/animate.ts';
import { FlyoutBase } from './flyout.ts';

export interface CommandLike {
  label?: string;
  icon?: string;
  accelerator?: string;
  description?: string;
  execute(parameter?: unknown): void;
  canExecute?(parameter?: unknown): boolean;
}

const ITEM_TAGS = new Set([
  'win-menu-flyout-item',
  'win-toggle-menu-flyout-item',
  'win-radio-menu-flyout-item',
  'win-menu-flyout-sub-item',
]);

export const isMenuItem = (el: Element): el is MenuItemBase => ITEM_TAGS.has(el.localName);
const isItem = isMenuItem;

export const menuPresenterCss = css`
.presenter {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 96px;
  min-height: 32px;
  max-height: min(758px, var(--w-popup-max-height, 758px));
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-flyout);
  color: var(--w-text-fill-color-primary);
  overflow: hidden;
  outline: none;
}
.items {
  padding: 2px 0;
  overflow-x: hidden;
  overflow-y: auto;
  min-height: 0;
}
`;

export function layoutMenuLevel(children: Iterable<Element>, touch: boolean): void {
  const items = Array.from(children).filter(isItem);
  const hasCheck = items.some(
    (i) => i.localName === 'win-toggle-menu-flyout-item' || i.localName === 'win-radio-menu-flyout-item',
  );
  const hasIcon = items.some((i) => i.hasIconContent);
  const place = hasCheck && hasIcon ? 'both' : hasCheck ? 'check' : hasIcon ? 'icon' : 'none';
  for (const i of items) {
    i.setAttribute('data-place', place);
    i.toggleAttribute('data-touch', touch);
  }
}

export function handleMenuKeys(
  level: HTMLElement,
  ev: KeyboardEvent,
  typeahead: TypeAhead,
  onLeft?: () => void,
): boolean {
  const items = Array.from(level.children).filter(
    (c): c is MenuItemBase => isItem(c) && !c.hasAttribute('disabled') && !c.hidden,
  );
  if (!items.length) return false;
  const current = items.indexOf(ev.target as MenuItemBase);
  const focus = (i: number) => items[(i + items.length) % items.length]?.focus();
  const rtl = isRtl(level);
  switch (ev.key) {
    case 'ArrowDown':
      focus(current < 0 ? 0 : current + 1);
      return true;
    case 'ArrowUp':
      focus(current < 0 ? items.length - 1 : current - 1);
      return true;
    case 'Tab':
      focus(current < 0 ? 0 : current + (ev.shiftKey ? -1 : 1));
      return true;
    case 'Home':
      focus(0);
      return true;
    case 'End':
      focus(items.length - 1);
      return true;
    case 'ArrowLeft':
    case 'ArrowRight': {
      const back = rtl ? ev.key === 'ArrowRight' : ev.key === 'ArrowLeft';
      if (back) {
        if (onLeft) {
          onLeft();
          return true;
        }
        return false;
      }
      const cur = items[current];
      if (cur && cur.localName === 'win-menu-flyout-sub-item') {
        (cur as unknown as WinMenuFlyoutSubItem).openSubMenu(true);
        return true;
      }
      return false;
    }
    default: {
      if (ev.key.length === 1 && !ev.ctrlKey && !ev.altKey && !ev.metaKey && ev.key !== ' ') {
        const idx = typeahead.match(
          ev.key,
          items.map((i) => i.label),
          current,
        );
        if (idx >= 0) {
          focus(idx);
          return true;
        }
      }
      return false;
    }
  }
}

export class WinMenuFlyout extends FlyoutBase {
  static override styles = [
    scrollbars,
    css`${popupResetCss(':host')}`,
    menuPresenterCss,
    css`${materialOverrides('.presenter')}`,
  ];
  static override materialPart = '.presenter';
  static override template = `<div class="presenter" part="presenter" role="menu" tabindex="-1"><div class="items w-scroll" part="items"><slot></slot></div></div>`;

  private typeahead = new TypeAhead();

  static {
    this.define('win-menu-flyout');
  }

  get items(): MenuItemBase[] {
    return Array.from(this.children).filter(isItem);
  }

  protected override firstConnected(): void {
    super.firstConnected();
    this.addEventListener('keydown', (ev) => {
      const t = ev.target as Element;
      if (t !== this && t.parentElement !== this) return;
      if (handleMenuKeys(this, ev, this.typeahead)) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    });
    this.$('.presenter').addEventListener('keydown', (ev) => {
      if (handleMenuKeys(this, ev, this.typeahead)) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    });
    this.addEventListener('win-menu-invoke', () => this.hide());
    this.addEventListener(
      'mousedown',
      (ev) => {
        if (this.isOpen && !composedContains(this, deepActiveElement())) ev.preventDefault();
      },
      true,
    );
    this.addEventListener('pointerover', (ev) => {
      const item = (ev.target as Element).closest?.(
        'win-menu-flyout-item, win-toggle-menu-flyout-item, win-radio-menu-flyout-item, win-menu-flyout-sub-item, win-menu-flyout-separator',
      );
      if (!item || item.parentElement !== this) return;
      for (const sub of this.querySelectorAll(':scope > win-menu-flyout-sub-item')) {
        if (sub !== item) (sub as WinMenuFlyoutSubItem).scheduleClose();
      }
    });
  }

  protected override get defaultPlacement() {
    return super.defaultPlacement;
  }

  private focusless = false;

  private onOutsideKey = (ev: KeyboardEvent): void => {
    if (!this.isOpen || composedContains(this, deepActiveElement())) return;
    if (ev.key !== 'ArrowDown' && ev.key !== 'ArrowUp') return;
    const list = this.items.filter((i) => !i.hasAttribute('disabled') && !i.hidden);
    const target = ev.key === 'ArrowDown' ? list[0] : list[list.length - 1];
    if (!target) return;
    ev.preventDefault();
    ev.stopPropagation();
    target.focus();
  };

  protected override beforeOpen(opts: FlyoutShowOptions): void {
    layoutMenuLevel(this.children, opts.inputType === 'touch');
    this.typeahead.reset();
    this.focusless = opts.focus === 'none';
    if (this.focusless) document.addEventListener('keydown', this.onOutsideKey, true);
  }

  protected override afterClose(): void {
    super.afterClose();
    if (this.focusless) document.removeEventListener('keydown', this.onOutsideKey, true);
    this.focusless = false;
  }

  protected override initialFocus(opts: FlyoutShowOptions): 'first' | 'surface' | 'none' | HTMLElement {
    if (opts.focus === 'none') return 'none';
    if (opts.focus === 'first' || opts.inputType === 'keyboard') {
      const first = this.items.find((i) => !i.hasAttribute('disabled') && !i.hidden);
      return first ?? 'surface';
    }
    return 'surface';
  }

  protected override animateIn(surface: HTMLElement, side: 'top' | 'bottom' | 'left' | 'right'): Animation | null {
    return menuIn(surface, side, this.$('.items'));
  }

  protected override animateOut(surface: HTMLElement): Animation | null {
    return popupOut(surface);
  }
}

const itemCss = css`
:host {
  display: flex;
  position: relative;
  align-items: center;
  box-sizing: border-box;
  margin: 2px 4px;
  padding: 4px 11px 7px 11px;
  min-height: 30px;
  border-radius: var(--w-corner-radius-control);
  background-color: transparent;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  white-space: nowrap;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}
:host([data-touch]) { padding: 9px 11px 10px 11px; }
:host(:hover), :host(:focus-visible), :host([submenu-open]) {
  background-color: var(--w-subtle-fill-color-secondary);
}
:host(:active), :host([data-pressed]) {
  background-color: var(--w-subtle-fill-color-tertiary);
}
:host([disabled]) {
  color: var(--w-text-fill-color-disabled);
  background-color: transparent;
  pointer-events: none;
}
${focusRing(':host(:focus-visible)', 0)}
:host([hidden]) { display: none; }

.check, .icon {
  position: absolute;
  inset-inline-start: 11px;
  top: 50%;
  translate: 0 -50%;
  display: none;
  align-items: center;
  justify-content: center;
}
.check { width: 12px; height: 12px; color: var(--w-text-fill-color-secondary); }
.icon { width: 16px; height: 16px; }
:host([data-place="check"]) .check,
:host([data-place="both"]) .check { display: inline-flex; }
:host([data-place="icon"]) .icon,
:host([data-place="both"]) .icon { display: inline-flex; }
:host([data-place="both"]) .icon { inset-inline-start: 39px; }
.icon ::slotted(*) { max-width: 16px; max-height: 16px; }
.check .w-glyph { opacity: 0; scale: 0.6; transition: opacity var(--w-duration-faster) linear, scale var(--w-duration-fast) var(--w-ease-decelerate); }
:host([checked]) .check .w-glyph { opacity: 1; scale: 1; }
:host([disabled]) .check { color: var(--w-text-fill-color-disabled); }

.text {
  flex: 1 1 auto;
  min-width: 0;
  overflow: hidden;
  text-overflow: clip;
}
:host([data-place="check"]) .text,
:host([data-place="icon"]) .text { padding-inline-start: 28px; }
:host([data-place="both"]) .text { padding-inline-start: 56px; }

.accel {
  margin-inline-start: 24px;
  margin-top: 4px;
  font: var(--w-type-caption);
  color: var(--w-text-fill-color-secondary);
  text-align: end;
}
.accel:empty { display: none; }
:host([disabled]) .accel { color: var(--w-text-fill-color-disabled); }

.chevron {
  display: none;
  margin-inline-start: 24px;
  width: 12px;
  height: 12px;
  color: var(--w-text-fill-color-secondary);
  flex: none;
}
:host(:active) .chevron { color: var(--w-text-fill-color-tertiary); }
:host([disabled]) .chevron { color: var(--w-text-fill-color-disabled); }
:host(:dir(rtl)) .chevron { scale: -1 1; }
`;

const ITEM_TEMPLATE = `<span class="check" part="check" aria-hidden="true"></span><span class="icon" part="icon" aria-hidden="true"><span class="icon-spec"></span><slot name="icon"></slot></span><span class="text" part="text"><span class="label"></span><slot></slot></span><span class="accel" part="accelerator"></span><span class="chevron" part="chevron" aria-hidden="true">${glyph('chevronRightMed', 12)}</span>`;

export abstract class MenuItemBase extends WinElement {
  static override styles = [itemCss];
  static override template = ITEM_TEMPLATE;
  static override props: PropDefs = {
    text: { type: String },
    icon: { type: String, reflect: true },
    disabled: { type: Boolean },
    accelerator: { type: String },
    commandParameter: { type: String, attribute: 'command-parameter' },
  };
  declare text: string;
  declare icon: string;
  declare disabled: boolean;
  declare accelerator: string;
  declare commandParameter: string;

  private _command: CommandLike | null = null;
  get command(): CommandLike | null {
    return this._command;
  }
  set command(c: CommandLike | null) {
    this._command = c;
    this.requestUpdate('command');
  }

  protected abstract get itemRole(): string;

  constructor() {
    super();
    this.addEventListener(
      'click',
      (ev) => {
        if (this.disabled) {
          ev.stopImmediatePropagation();
          ev.preventDefault();
        }
      },
      true,
    );
  }

  get label(): string {
    return (this.text || this.command?.label || this.textContent || '').trim();
  }

  get hasIconContent(): boolean {
    return !!(this.icon || this.command?.icon || this.querySelector(':scope > [slot="icon"]'));
  }

  protected override firstConnected(): void {
    this.setAttribute('role', this.itemRole);
    this.tabIndex = -1;
    keyboardActivation(this, () => this.disabled);
    this.addEventListener('click', (ev) => {
      if (ev.defaultPrevented) return;
      this.invoke();
    });
    this.addEventListener('pointerenter', (ev) => {
      if (ev.pointerType === 'touch' || this.disabled) return;
      const ae = deepActiveElement() as Element | null;
      const inMenu = !!ae && (ae.matches('[role^="menuitem"]') || !!ae.closest('[role="menu"], [role="menubar"]'));
      if (inMenu) this.focus({ preventScroll: true });
    });
  }

  protected labelText(): string {
    return this.text || (this.textContent?.trim() ? '' : (this.command?.label ?? ''));
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('text') || changed.has('command')) {
      const label = this.$('.label');
      if (label) label.textContent = this.labelText();
    }
    if (changed.has('icon') || changed.has('command')) {
      const spec = this.$('.icon-spec');
      if (spec) spec.innerHTML = iconHtml(this.icon || this.command?.icon, 16);
    }
    if (changed.has('accelerator') || changed.has('command')) {
      const accel = this.$('.accel');
      if (accel) accel.textContent = this.accelerator || this.command?.accelerator || '';
    }
    if (changed.has('disabled') || changed.has('command')) {
      const can = this.command?.canExecute ? this.command.canExecute(this.commandParameter) : true;
      if (!can && !this.disabled) this.toggleAttribute('disabled', true);
      this.aria('aria-disabled', this.disabled ? 'true' : null);
    }
  }

  protected invoke(): void {
    this.command?.execute(this.commandParameter);
    this.dispatchEvent(new CustomEvent('win-menu-invoke', { bubbles: true, composed: true }));
  }
}

export class WinMenuFlyoutItem extends MenuItemBase {
  protected get itemRole() {
    return 'menuitem';
  }
  static {
    this.define('win-menu-flyout-item');
  }
}

export class WinToggleMenuFlyoutItem extends MenuItemBase {
  static override props: PropDefs = {
    checked: { type: Boolean },
  };
  declare checked: boolean;
  protected get itemRole() {
    return 'menuitemcheckbox';
  }
  static {
    this.define('win-toggle-menu-flyout-item');
  }
  protected override firstConnected(): void {
    super.firstConnected();
    this.$('.check').innerHTML = glyph('checkMark', 12);
  }
  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed);
    if (changed.has('checked') || first) this.aria('aria-checked', this.checked ? 'true' : 'false');
  }
  protected override invoke(): void {
    this.checked = !this.checked;
    this.emit('change', { checked: this.checked });
    super.invoke();
  }
}

export class WinRadioMenuFlyoutItem extends MenuItemBase {
  static override props: PropDefs = {
    checked: { type: Boolean },
    group: { type: String },
  };
  declare checked: boolean;
  declare group: string;
  protected get itemRole() {
    return 'menuitemradio';
  }
  static {
    this.define('win-radio-menu-flyout-item');
  }
  protected override firstConnected(): void {
    super.firstConnected();
    this.$('.check').innerHTML = glyph('dot', 12);
  }
  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed);
    if (changed.has('checked') || first) this.aria('aria-checked', this.checked ? 'true' : 'false');
  }
  protected override invoke(): void {
    if (!this.checked) {
      const root =
        this.closest('win-menu-flyout, win-menu-bar, win-command-bar-flyout, win-menu-bar-item') ??
        this.parentElement ??
        document;
      for (const r of root.querySelectorAll<WinRadioMenuFlyoutItem>('win-radio-menu-flyout-item')) {
        if (r !== this && (r.group || '') === (this.group || '')) r.checked = false;
      }
      this.checked = true;
      this.emit('change', { checked: true });
    }
    super.invoke();
  }
}

export class WinMenuFlyoutSeparator extends WinElement {
  static override styles = [
    css`
      :host {
        display: block;
        height: 1px;
        margin: 1px 0;
        background: var(--w-divider-stroke-color-default);
      }
    `,
  ];
  static {
    this.define('win-menu-flyout-separator');
  }
  protected override firstConnected(): void {
    this.setAttribute('role', 'separator');
  }
}

const subItemCss = css`
:host .chevron { display: inline-flex; align-items: center; justify-content: center; }
${popupResetCss('.submenu')}
`;

const SUBMENU_OPEN_DELAY = 300;
const SUBMENU_CLOSE_DELAY = 250;

export class WinMenuFlyoutSubItem extends MenuItemBase {
  static override styles = [itemCss, scrollbars, menuPresenterCss, subItemCss];
  static override template = `<span class="check" part="check" aria-hidden="true"></span><span class="icon" part="icon" aria-hidden="true"><span class="icon-spec"></span><slot name="icon"></slot></span><span class="text" part="text"><span class="label"></span></span><span class="chevron" part="chevron" aria-hidden="true">${glyph('chevronRightMed', 12)}</span><div class="submenu" part="submenu"><div class="presenter" part="presenter" role="menu" tabindex="-1"><div class="items w-scroll" part="items"><slot></slot></div></div></div>`;

  private sub!: Popup;
  private openTimer: ReturnType<typeof setTimeout> | null = null;
  private closeTimer: ReturnType<typeof setTimeout> | null = null;
  private typeahead = new TypeAhead();

  protected get itemRole() {
    return 'menuitem';
  }

  static {
    this.define('win-menu-flyout-sub-item');
  }

  override get label(): string {
    return (this.text || this.command?.label || '').trim();
  }

  protected override labelText(): string {
    return this.text || this.command?.label || '';
  }

  get isSubMenuOpen(): boolean {
    return this.sub?.isOpen ?? false;
  }

  protected override firstConnected(): void {
    super.firstConnected();
    this.aria('aria-haspopup', 'menu');
    this.aria('aria-expanded', 'false');
    const submenu = this.$('.submenu');
    this.sub = new Popup(submenu, this.$('.presenter'));
    this.addEventListener('pointerenter', (ev) => {
      if (ev.pointerType === 'touch') return;
      this.cancelClose();
      if (!this.sub.isOpen) this.openTimer = setTimeout(() => this.openSubMenu(false), SUBMENU_OPEN_DELAY);
    });
    this.addEventListener('pointerleave', (ev) => {
      if (this.openTimer) clearTimeout(this.openTimer);
      this.openTimer = null;
      const to = ev.relatedTarget as Node | null;
      if (to && submenu.contains(to)) return;
      if (this.sub.isOpen) this.scheduleClose();
    });
    submenu.addEventListener('pointerenter', () => this.cancelClose());
    this.addEventListener('keydown', (ev) => {
      const t = ev.target as Element;
      if (t === this) {
        if (ev.key === 'Enter' || ev.key === ' ') {
          ev.preventDefault();
          ev.stopPropagation();
          this.openSubMenu(true);
        }
        return;
      }
      if (t.parentElement !== this) return;
      if (handleMenuKeys(this, ev, this.typeahead, () => this.closeSubMenu(true))) {
        ev.preventDefault();
        ev.stopPropagation();
      }
    });
  }

  protected override invoke(): void {
    this.cancelClose();
    this.openSubMenu(false);
  }

  scheduleClose(): void {
    if (this.openTimer) clearTimeout(this.openTimer);
    this.openTimer = null;
    if (!this.sub?.isOpen || this.closeTimer) return;
    this.closeTimer = setTimeout(() => this.closeSubMenu(false), SUBMENU_CLOSE_DELAY);
  }

  private cancelClose(): void {
    if (this.closeTimer) clearTimeout(this.closeTimer);
    this.closeTimer = null;
  }

  private parentPopup(): Popup | null {
    const p = this.parentElement as (HTMLElement & { popup?: Popup; sub?: Popup }) | null;
    if (!p) return null;
    if (p.localName === 'win-menu-flyout-sub-item') return (p as unknown as { sub: Popup }).sub ?? null;
    return (p as unknown as { popup?: Popup }).popup ?? null;
  }

  openSubMenu(focusFirst: boolean): void {
    if (this.openTimer) clearTimeout(this.openTimer);
    this.openTimer = null;
    if (this.disabled) return;
    if (this.sub.isOpen) {
      if (focusFirst) this.focusFirstChild();
      return;
    }
    layoutMenuLevel(this.children, this.hasAttribute('data-touch'));
    this.typeahead.reset();
    this.toggleAttribute('submenu-open', true);
    this.aria('aria-expanded', 'true');
    const rtl = isRtl(this);
    this.sub.open({
      anchor: this,
      parent: this.parentPopup(),
      focus: 'none',
      restoreFocus: false,
      position: (size, r) => this.positionSubMenu(size, r, rtl),
      animateIn: (s) => menuIn(s, 'bottom'),
      animateOut: (s) => popupOut(s),
      passThrough: [this],
      onClosed: () => {
        this.removeAttribute('submenu-open');
        this.aria('aria-expanded', 'false');
        const ae = deepActiveElement();
        if (!ae || ae === document.body || this.contains(ae)) this.focus({ preventScroll: true });
      },
    });
    if (focusFirst) this.focusFirstChild();
  }

  closeSubMenu(focusSelf: boolean): void {
    this.cancelClose();
    if (!this.sub?.isOpen) return;
    void this.sub.close('programmatic');
    if (focusSelf) this.focus();
  }

  private focusFirstChild(): void {
    const first = Array.from(this.children).find((c): c is MenuItemBase => isItem(c) && !c.hasAttribute('disabled'));
    first?.focus();
  }

  private positionSubMenu(size: { width: number; height: number }, r: DOMRect, rtl: boolean): PositionResult {
    const { width: vw, height: vh } = viewportSize();
    const pad = 8;
    const outerRight = r.right + 5;
    const outerLeft = r.left - 5;
    let side: 'left' | 'right' = rtl ? 'left' : 'right';
    let x = side === 'right' ? outerRight - 1 : outerLeft - size.width + 1;
    if (side === 'right' && x + size.width > vw - pad) {
      side = 'left';
      x = outerLeft - size.width + 1;
    } else if (side === 'left' && x < pad) {
      side = 'right';
      x = outerRight - 1;
    }
    x = Math.max(pad, Math.min(x, vw - pad - size.width));
    let y = r.top - 5;
    y = Math.max(pad, Math.min(y, vh - pad - size.height));
    return { x: Math.round(x), y: Math.round(y), side, maxHeight: vh - pad * 2, maxWidth: vw - pad * 2 };
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-menu-flyout': WinMenuFlyout;
    'win-menu-flyout-item': WinMenuFlyoutItem;
    'win-toggle-menu-flyout-item': WinToggleMenuFlyoutItem;
    'win-radio-menu-flyout-item': WinRadioMenuFlyoutItem;
    'win-menu-flyout-sub-item': WinMenuFlyoutSubItem;
    'win-menu-flyout-separator': WinMenuFlyoutSeparator;
  }
}
