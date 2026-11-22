import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { glyph, iconHtml } from '../../base/icons.ts';
import { keyboardActivation } from '../../base/keyboard.ts';
import { attachedFlyout, type FlyoutLike, type Placement } from '../../base/popup.ts';
import { animate, durations, easings } from '../../motion/animate.ts';
import type { CommandLike } from '../flyouts/menu-flyout.ts';
import { StandardUICommand } from './commands.ts';

const STACKED_MODES = new Set(['full', 'compact', 'collapsed']);

export type AppBarMode = 'full' | 'compact' | 'right' | 'collapsed' | 'overflow' | 'flyout-primary' | 'flyout-overflow';

export interface AppBarModeFlags {
  icons?: boolean;
  toggles?: boolean;
  touch?: boolean;
  hideFlyoutChevron?: boolean;
}

export interface AppBarElement extends HTMLElement {
  setAppBarMode(mode: AppBarMode | null, flags?: AppBarModeFlags): void;
  readonly appBarMode: AppBarMode;
  readonly hasIconContent?: boolean;
  readonly isToggle?: boolean;
}

export function isAppBarElement(el: Element): el is AppBarElement {
  return typeof (el as Partial<AppBarElement>).setAppBarMode === 'function';
}

const appBarButtonCss = css`
:host {
  display: inline-flex;
  position: relative;
  flex-direction: column;
  flex: none;
  box-sizing: border-box;
  width: 68px;
  vertical-align: top;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  outline: none;
}
:host([hidden]) { display: none !important; }
slot:not([name]) { display: none; }
::slotted([slot="flyout"]:not(:defined)) { display: none; }

.inner {
  position: absolute;
  inset: 6px 2px 6px 2px;
  border-radius: var(--w-corner-radius-control);
  background-color: transparent;
  background-clip: padding-box;
  transition: background-color var(--w-duration-faster) linear;
  pointer-events: none;
}
:host(:hover) .inner { background-color: var(--w-subtle-fill-color-secondary); }
:host(:active) .inner, :host([data-pressed]) .inner, :host([submenu-open]) .inner {
  background-color: var(--w-subtle-fill-color-tertiary);
}
:host([submenu-open]) .inner { background-color: var(--w-subtle-fill-color-secondary); }
:host(:active), :host([data-pressed]) { color: var(--w-text-fill-color-secondary); }
:host([data-disabled]) { color: var(--w-text-fill-color-disabled); pointer-events: none; }
:host([data-disabled]) .inner { background-color: transparent; }
:host(:focus-visible) .inner {
  outline: 2px solid var(--w-focus-stroke-color-outer);
  outline-offset: 1px;
  box-shadow: 0 0 0 1px var(--w-focus-stroke-color-inner);
}

.root {
  position: relative;
  display: grid;
  grid-template-columns: 1fr auto auto;
  grid-template-rows: auto auto;
  min-height: 56px;
}
.icon {
  grid-row: 1;
  grid-column: 1;
  display: flex;
  align-items: center;
  justify-content: center;
  height: 16px;
  margin: 16px 0 2px;
}
.icon[hidden] { display: none; }
.icon ::slotted(*) { font-size: 16px; max-height: 16px; }
.label {
  grid-row: 2;
  grid-column: 1;
  margin: 0 2px 8px;
  font: var(--w-type-caption);
  font-family: var(--w-font-family-text);
  text-align: center;
  overflow-wrap: anywhere;
}
.overflow-label, .accel, .check { display: none; }
.chevron { display: none; }

:host([data-has-flyout]:not([data-hide-chevron])) .chevron {
  display: flex;
  grid-row: 1;
  grid-column: 3;
  align-self: start;
  width: 8px;
  height: 8px;
  margin: 20px 12px 0 -23px;
  color: var(--w-text-fill-color-secondary);
}
:host(:active) .chevron { color: var(--w-text-fill-color-tertiary); }
:host([data-disabled]) .chevron { color: var(--w-text-fill-color-disabled); }

:host([data-m="compact"]) .root, :host([data-m="collapsed"]) .root { min-height: 40px; }
:host([data-m="compact"]) .icon, :host([data-m="collapsed"]) .icon { margin: 12px 0; }
:host([data-m="compact"]) .inner { inset: 6px 2px; }
:host([data-m="compact"]) .label, :host([data-m="collapsed"]) .label { display: none; }
:host([data-m="compact"][data-has-flyout]:not([data-hide-chevron])) .chevron,
:host([data-m="collapsed"][data-has-flyout]:not([data-hide-chevron])) .chevron { margin-top: 16px; }

:host([data-m="right"]) { width: auto; }
:host([data-m="right"]) .root { min-height: 40px; grid-template-columns: auto 1fr auto; grid-template-rows: auto; align-items: center; }
:host([data-m="right"]) .icon { margin: 12px 0 12px 12px; }
:host([data-m="right"]) .icon[hidden] + .label { margin-inline-start: 12px; }
:host([data-m="right"]) .label {
  grid-row: 1;
  grid-column: 2;
  margin: 12px 12px 12px 8px;
  text-align: start;
  white-space: nowrap;
}
:host([data-m="right"][data-has-flyout]:not([data-hide-chevron])) .chevron { margin: 16px 12px 0 -7px; }

:host([data-m="overflow"]), :host([data-m="flyout-overflow"]) { display: flex; width: auto; }
:host([data-m="overflow"]) .root, :host([data-m="flyout-overflow"]) .root {
  min-height: 0;
  grid-template-columns: 1fr auto auto;
  grid-template-rows: auto;
  align-items: center;
}
:host([data-m="overflow"]) .inner { inset: 0 4px; }
:host([data-m="overflow"]) .icon, :host([data-m="flyout-overflow"]) .icon,
:host([data-m="overflow"]) .label, :host([data-m="flyout-overflow"]) .label { display: none; }
:host([data-m="overflow"]) .overflow-label, :host([data-m="flyout-overflow"]) .overflow-label {
  display: block;
  grid-row: 1;
  grid-column: 1;
  margin: 0 12px;
  padding: 5px 0 8px;
  white-space: nowrap;
  overflow: hidden;
  text-align: start;
}
:host([data-m="overflow"][data-touch]) .overflow-label { padding: 9px 0 12px; }
:host([data-m="overflow"][data-icons]) .icon, :host([data-m="flyout-overflow"][data-icons]) .icon {
  display: flex;
  position: absolute;
  inset-inline-start: 12px;
  top: 50%;
  translate: 0 -50%;
  width: 16px;
  margin: 0;
}
:host([data-m="overflow"][data-icons]) .overflow-label,
:host([data-m="overflow"][data-toggles]) .overflow-label { margin-inline-start: 38px; }
:host([data-m="overflow"][data-icons][data-toggles]) .icon { inset-inline-start: 38px; }
:host([data-m="overflow"][data-icons][data-toggles]) .overflow-label { margin-inline-start: 76px; }
:host([data-m="overflow"]) .accel, :host([data-m="flyout-overflow"]) .accel {
  display: block;
  grid-row: 1;
  grid-column: 2;
  margin: 0 12px 0 24px;
  font: var(--w-type-caption);
  font-family: var(--w-font-family-text);
  color: var(--w-text-fill-color-secondary);
  text-align: end;
}
.accel:empty { display: none !important; }
:host(:active) .accel { color: var(--w-text-fill-color-tertiary); }
:host([data-disabled]) .accel { color: var(--w-text-fill-color-disabled); }
:host([data-m="overflow"][data-has-flyout]) .chevron, :host([data-m="flyout-overflow"][data-has-flyout]) .chevron {
  display: flex;
  grid-row: 1;
  grid-column: 3;
  align-self: center;
  width: 12px;
  height: 12px;
  margin: 0 16px 0 0;
  color: var(--w-text-fill-color-secondary);
}
:host(:dir(rtl)) .chevron { scale: -1 1; }

:host([data-m="flyout-primary"]) { width: auto; min-width: 40px; height: 40px; }
:host([data-m="flyout-primary"]) .root { min-height: 40px; min-width: 40px; display: flex; align-items: center; justify-content: center; }
:host([data-m="flyout-primary"]) .inner { inset: 2px; }
:host([data-m="flyout-primary"]) .icon { margin: 0 12px; }
:host([data-m="flyout-primary"]) .label { display: none; }
:host([data-m="flyout-primary"][data-has-flyout]) .chevron { display: none; }

:host([data-m="flyout-overflow"]) .inner { inset: 2px; }
:host([data-m="flyout-overflow"]) .overflow-label { padding: 6px 0 7px; }
:host([data-m="flyout-overflow"][data-icons]) .overflow-label { margin-inline-start: 39px; }
:host([data-m="flyout-overflow"][data-toggles]) .overflow-label { margin-inline-start: 39px; }
`;

const toggleCss = css`
.inner { border: 1px solid transparent; }
:host([checked]:not([data-m="overflow"]):not([data-m="flyout-overflow"])) .inner {
  background-color: var(--w-accent-fill-color-default);
  background-clip: border-box;
  border-color: var(--w-accent-control-elevation-border);
}
:host([checked]:not([data-m="overflow"]):not([data-m="flyout-overflow"])) {
  color: var(--w-text-on-accent-fill-color-primary);
}
:host([checked]:not([data-m="overflow"]):not([data-m="flyout-overflow"]):hover) .inner {
  background-color: var(--w-accent-fill-color-secondary);
}
:host([checked]:not([data-m="overflow"]):not([data-m="flyout-overflow"]):active) .inner,
:host([checked][data-pressed]:not([data-m="overflow"]):not([data-m="flyout-overflow"])) .inner {
  background-color: var(--w-accent-fill-color-tertiary);
  border-color: transparent;
}
:host([checked]:not([data-m="overflow"]):not([data-m="flyout-overflow"]):active),
:host([checked][data-pressed]:not([data-m="overflow"]):not([data-m="flyout-overflow"])) {
  color: var(--w-text-on-accent-fill-color-secondary);
}
:host([checked][data-disabled]:not([data-m="overflow"]):not([data-m="flyout-overflow"])) .inner {
  background-color: var(--w-accent-fill-color-disabled);
  border-color: transparent;
}
:host([checked][data-disabled]:not([data-m="overflow"]):not([data-m="flyout-overflow"])) {
  color: var(--w-text-on-accent-fill-color-disabled);
}

:host([data-m="overflow"]) .check, :host([data-m="flyout-overflow"]) .check {
  display: flex;
  position: absolute;
  inset-inline-start: 12px;
  top: 50%;
  translate: 0 -50%;
  width: 14px;
  height: 14px;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity var(--w-duration-faster) linear;
}
:host([checked]) .check { opacity: 1; }
:host([data-m="overflow"]) .overflow-label, :host([data-m="flyout-overflow"]) .overflow-label { margin-inline-start: 38px; }
:host([data-m="overflow"][data-icons]) .icon { inset-inline-start: 38px; }
:host([data-m="overflow"][data-icons]) .overflow-label { margin-inline-start: 76px; }
:host([checked][data-m="overflow"]) .inner { border-color: var(--w-accent-control-elevation-border); }
`;

const TEMPLATE = `<span class="inner" part="background"></span><span class="root" part="content-root"><span class="check" part="check" aria-hidden="true">${glyph('checkMark', 14)}</span><span class="icon" part="icon" aria-hidden="true"><span class="icon-spec"></span><slot name="icon"></slot></span><span class="label" part="label"></span><span class="overflow-label" part="overflow-label"></span><span class="accel" part="accelerator"></span><span class="chevron" part="chevron" aria-hidden="true">${glyph('chevronRightMed', 12)}</span></span><slot></slot><slot name="flyout"></slot>`;

export abstract class AppBarButtonBase extends WinElement implements AppBarElement {
  static override template = TEMPLATE;
  static override props: PropDefs = {
    label: { type: String },
    icon: { type: String, reflect: true },
    disabled: { type: Boolean },
    compact: { type: Boolean },
    labelPosition: { type: String, attribute: 'label-position', default: 'default' },
    accelerator: { type: String, reflect: true },
    acceleratorText: { type: String, attribute: 'accelerator-text' },
    standardCommand: { type: String, attribute: 'standard-command' },
    commandParameter: { type: String, attribute: 'command-parameter' },
  };
  declare label: string;
  declare icon: string;
  declare disabled: boolean;
  declare compact: boolean;
  declare labelPosition: 'default' | 'collapsed';
  declare accelerator: string;
  declare acceleratorText: string;
  declare standardCommand: string;
  declare commandParameter: string;

  private _command: CommandLike | null = null;
  private commandListener = () => this.requestUpdate('command');
  private containerMode: AppBarMode | null = null;
  private containerFlags: AppBarModeFlags = {};
  private textObserver: MutationObserver | null = null;

  constructor() {
    super();
    this.addEventListener(
      'click',
      (ev) => {
        if (this.isOff) {
          ev.stopImmediatePropagation();
          ev.preventDefault();
        }
      },
      true,
    );
  }

  get isOff(): boolean {
    return this.hasAttribute('data-disabled') || this.disabled;
  }

  get command(): CommandLike | null {
    return this._command;
  }
  set command(c: CommandLike | null) {
    if (this._command instanceof EventTarget)
      this._command.removeEventListener('canexecutechanged', this.commandListener);
    this._command = c;
    if (c instanceof EventTarget) c.addEventListener('canexecutechanged', this.commandListener);
    this.requestUpdate('command');
  }

  get isToggle(): boolean {
    return false;
  }

  get effectiveLabel(): string {
    return (
      this.label ||
      this.command?.label ||
      (this.standardCommand ? StandardUICommand.preset(this.standardCommand)?.label : '') ||
      (this.textContent ?? '').trim()
    );
  }

  get effectiveIcon(): string {
    return (
      this.icon ||
      this.command?.icon ||
      (this.standardCommand ? (StandardUICommand.preset(this.standardCommand)?.icon ?? '') : '')
    );
  }

  get effectiveAccelerator(): string {
    return (
      this.acceleratorText ||
      this.accelerator ||
      this.command?.accelerator ||
      (this.standardCommand ? (StandardUICommand.preset(this.standardCommand)?.accelerator ?? '') : '')
    );
  }

  get hasIconContent(): boolean {
    return !!(this.effectiveIcon || this.querySelector(':scope > [slot="icon"]'));
  }

  get flyout(): FlyoutLike | null {
    return attachedFlyout(this);
  }

  get appBarMode(): AppBarMode {
    if (this.containerMode) return this.containerMode;
    if (this.compact) return 'compact';
    return this.labelPosition === 'collapsed' ? 'collapsed' : 'full';
  }

  setAppBarMode(mode: AppBarMode | null, flags: AppBarModeFlags = {}): void {
    this.containerMode = mode;
    this.containerFlags = mode ? flags : {};
    this.syncMode();
  }

  protected override firstConnected(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
    keyboardActivation(this, () => this.isOff);
    this.addEventListener('click', (ev) => this.onActivate(ev));
    this.$('slot[name="icon"]').addEventListener('slotchange', () => this.syncIcon());
    this.$('slot[name="flyout"]').addEventListener('slotchange', () => this.syncFlyout());
    this.$<HTMLSlotElement>('slot:not([name])').addEventListener('slotchange', () => this.syncLabel());
    this.textObserver = new MutationObserver(() => this.syncLabel());
    this.textObserver.observe(this, { characterData: true, subtree: true, childList: true });
    this.dispatchEvent(new CustomEvent('win-appbar-item-ready', { bubbles: true, composed: true }));
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('disabled') || changed.has('command')) {
      const can = this.command?.canExecute ? this.command.canExecute(this.commandParameter) : true;
      const off = this.disabled || !can;
      this.toggleAttr('data-disabled', off);
      this.setFocusable(!off);
      this.aria('aria-disabled', off ? 'true' : null);
    }
    if (changed.has('label') || changed.has('command') || changed.has('standardCommand')) this.syncLabel();
    if (changed.has('icon') || changed.has('command') || changed.has('standardCommand')) this.syncIcon();
    if (
      changed.has('accelerator') ||
      changed.has('acceleratorText') ||
      changed.has('command') ||
      changed.has('standardCommand')
    ) {
      this.$('.accel').textContent = this.effectiveAccelerator;
    }
    if (changed.has('compact') || changed.has('labelPosition')) this.syncMode();
    if (_first) this.syncFlyout();
  }

  private syncLabel(): void {
    const text = this.effectiveLabel;
    this.$('.label').textContent = text;
    this.$('.overflow-label').textContent = text;
    if (text && !this.hasAttribute('aria-label')) this.aria('aria-label', text);
    this.syncMode();
  }

  private syncIcon(): void {
    this.$('.icon-spec').innerHTML = iconHtml(this.effectiveIcon, 16);
    this.$('.icon').hidden = !this.hasIconContent;
  }

  private syncFlyout(): void {
    const has = !!this.flyout;
    this.toggleAttr('data-has-flyout', has);
    if (has) this.aria('aria-haspopup', 'true');
  }

  protected syncMode(): void {
    const m = this.appBarMode;
    const f = this.containerFlags;
    const prev = this.getAttribute('data-m');
    if (prev !== m) {
      const icon = this.isInitialized ? this.$('.icon') : null;
      const slide =
        icon &&
        prev &&
        STACKED_MODES.has(prev) &&
        STACKED_MODES.has(m) &&
        !icon.hidden &&
        this.getClientRects().length > 0
          ? icon
          : null;
      const before = slide ? slide.getBoundingClientRect().top : 0;
      this.setAttribute('data-m', m);
      if (slide) {
        const dy = before - slide.getBoundingClientRect().top;
        if (Math.abs(dy) >= 0.5 && Math.abs(dy) < 24) {
          animate(slide, [{ transform: `translateY(${dy}px)` }, { transform: 'none' }], {
            duration: durations.normal,
            easing: easings.decelerate,
          });
        }
      }
    }
    this.toggleAttr('data-icons', !!f.icons);
    this.toggleAttr('data-toggles', !!f.toggles);
    this.toggleAttr('data-touch', !!f.touch);
    this.toggleAttr('data-hide-chevron', !!f.hideFlyoutChevron);
    const labelHidden = m === 'compact' || m === 'collapsed' || m === 'flyout-primary';
    const text = this.effectiveLabel;
    if (labelHidden && text) this.setAttribute('data-auto-tooltip', text);
    else this.removeAttribute('data-auto-tooltip');
    if (m === 'overflow' || m === 'flyout-overflow') {
      if (this.getAttribute('role') === 'button')
        this.setAttribute('role', this.isToggle ? 'menuitemcheckbox' : 'menuitem');
    } else if (this.getAttribute('role') === 'menuitem' || this.getAttribute('role') === 'menuitemcheckbox') {
      this.setAttribute('role', 'button');
    }
  }

  protected onActivate(ev: MouseEvent): void {
    if (ev.defaultPrevented) return;
    this.command?.execute(this.commandParameter || undefined);
    const f = this.flyout;
    if (f) {
      if (f.isOpen) f.hide();
      else {
        const overflow = this.appBarMode === 'overflow' || this.appBarMode === 'flyout-overflow';
        const viaKeyboard = ev.detail === 0;
        f.showAt(this, {
          placement: overflow ? 'right-start' : ((f.getAttribute('placement') as Placement | null) ?? 'top'),
          focus: viaKeyboard ? 'first' : 'none',
          inputType: viaKeyboard ? 'keyboard' : 'mouse',
        });
        this.toggleAttr('submenu-open', overflow);
        this.aria('aria-expanded', 'true');
        const onClosed = (e: Event) => {
          if (e.target !== f) return;
          this.removeAttribute('submenu-open');
          this.aria('aria-expanded', 'false');
          f.removeEventListener('closed', onClosed);
        };
        f.addEventListener('closed', onClosed);
      }
      return;
    }
    this.dispatchEvent(
      new CustomEvent('win-appbar-invoke', { bubbles: true, composed: true, detail: { toggle: this.isToggle } }),
    );
  }
}

export class WinAppBarButton extends AppBarButtonBase {
  static override styles = [appBarButtonCss];
  static {
    this.define('win-app-bar-button');
  }
}

export class WinAppBarToggleButton extends AppBarButtonBase {
  static override styles = [appBarButtonCss, toggleCss];
  static override formAssociated = true;
  static override props: PropDefs = {
    checked: { type: Boolean },
    threeState: { type: Boolean, attribute: 'three-state' },
    indeterminate: { type: Boolean },
  };
  declare checked: boolean;
  declare threeState: boolean;
  declare indeterminate: boolean;

  static {
    this.define('win-app-bar-toggle-button');
  }

  override get isToggle(): boolean {
    return true;
  }

  protected override onActivate(ev: MouseEvent): void {
    if (ev.defaultPrevented) return;
    if (this.threeState) {
      if (this.indeterminate) {
        this.indeterminate = false;
        this.checked = false;
      } else if (this.checked) {
        this.checked = false;
        this.indeterminate = true;
      } else this.checked = true;
    } else this.checked = !this.checked;
    this.emit('change', { checked: this.checked, indeterminate: this.indeterminate });
    super.onActivate(ev);
  }

  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    if (changed.has('checked') || changed.has('indeterminate')) {
      const v = this.indeterminate ? 'mixed' : this.checked ? 'true' : 'false';
      const role = this.getAttribute('role');
      this.aria(role === 'menuitemcheckbox' ? 'aria-checked' : 'aria-pressed', v);
      this.internals.setFormValue(this.checked ? 'on' : null);
    }
  }

  protected override syncMode(): void {
    super.syncMode();
    const v = this.indeterminate ? 'mixed' : this.checked ? 'true' : 'false';
    if (this.getAttribute('role') === 'menuitemcheckbox') {
      this.removeAttribute('aria-pressed');
      this.aria('aria-checked', v);
    } else {
      this.removeAttribute('aria-checked');
      this.aria('aria-pressed', v);
    }
  }
}

export class WinAppBarSeparator extends WinElement implements AppBarElement {
  static override styles = [
    css`
      :host {
        display: inline-flex;
        flex: none;
        box-sizing: border-box;
        align-self: stretch;
        min-height: 56px;
        padding: 8px 2px;
        vertical-align: top;
      }
      .line {
        display: block;
        width: 1px;
        border-radius: 0.5px;
        background: var(--w-divider-stroke-color-default);
      }
      :host([data-m="compact"]), :host([data-m="right"]), :host([data-m="collapsed"]) {
        height: 40px;
        min-height: 40px;
        align-self: flex-start;
      }
      :host([data-m="flyout-primary"]) { min-height: 0; height: 40px; padding: 8px 2px; }
      :host([data-m="overflow"]), :host([data-m="flyout-overflow"]) {
        display: block;
        min-height: 0;
        height: auto;
        padding: 4px 0;
      }
      :host([data-m="overflow"]) .line, :host([data-m="flyout-overflow"]) .line { width: auto; height: 1px; }
    `,
  ];
  static override template = `<span class="line" part="line"></span>`;
  private mode: AppBarMode | null = null;

  static {
    this.define('win-app-bar-separator');
  }

  get appBarMode(): AppBarMode {
    return this.mode ?? 'full';
  }

  setAppBarMode(mode: AppBarMode | null): void {
    this.mode = mode;
    if (mode) this.setAttribute('data-m', mode);
    else this.removeAttribute('data-m');
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'separator');
    this.aria('aria-orientation', 'vertical');
    this.dispatchEvent(new CustomEvent('win-appbar-item-ready', { bubbles: true, composed: true }));
  }
}

export class WinAppBarContent extends WinElement implements AppBarElement {
  static override styles = [
    css`
      :host {
        display: inline-flex;
        flex: none;
        align-items: center;
        box-sizing: border-box;
        vertical-align: top;
      }
      :host([data-m="full"]) { min-height: 56px; }
      :host([data-m="compact"]), :host([data-m="right"]), :host([data-m="collapsed"]), :host([data-m="flyout-primary"]) {
        height: 40px;
      }
      :host([vertical-content-alignment="top"]) { align-items: flex-start; }
      :host([vertical-content-alignment="bottom"]) { align-items: flex-end; }
      :host([data-m="overflow"]), :host([data-m="flyout-overflow"]) {
        display: flex;
        padding: 4px 12px;
      }
    `,
  ];
  static override template = `<slot></slot>`;
  private mode: AppBarMode | null = null;

  static {
    this.define('win-app-bar-content');
  }

  protected override firstConnected(): void {
    this.dispatchEvent(new CustomEvent('win-appbar-item-ready', { bubbles: true, composed: true }));
  }

  get appBarMode(): AppBarMode {
    return this.mode ?? 'full';
  }

  setAppBarMode(mode: AppBarMode | null): void {
    this.mode = mode;
    if (mode) this.setAttribute('data-m', mode);
    else this.removeAttribute('data-m');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-app-bar-button': WinAppBarButton;
    'win-app-bar-toggle-button': WinAppBarToggleButton;
    'win-app-bar-separator': WinAppBarSeparator;
    'win-app-bar-content': WinAppBarContent;
  }
}
