import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { keyboardActivation } from '../../base/keyboard.ts';
import { glyph, iconHtml } from '../../base/icons.ts';
import { attachedFlyout, type FlyoutLike, type Placement } from '../../base/popup.ts';
import type { CommandLike } from '../flyouts/menu-flyout.ts';

export type ButtonAppearance = 'standard' | 'accent' | 'subtle';

export const buttonSurfaceCss = css`
:host {
  display: inline-flex;
  position: relative;
  align-items: center;
  justify-content: center;
  gap: 8px;
  box-sizing: border-box;
  vertical-align: middle;
  padding: 5px 11px 6px;
  border: 1px solid;
  border-color: var(--w-control-elevation-border);
  border-radius: var(--w-corner-radius-control);
  background-color: var(--w-control-fill-color-default);
  background-clip: padding-box;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  white-space: nowrap;
  text-align: center;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  outline: none;
  transition: background-color var(--w-duration-faster) linear;
}
:host(:hover) {
  background-color: var(--w-control-fill-color-secondary);
}
:host(:active),
:host([data-pressed]) {
  background-color: var(--w-control-fill-color-tertiary);
  border-color: var(--w-control-stroke-color-default);
  color: var(--w-text-fill-color-secondary);
}
:host([disabled]) {
  background-color: var(--w-control-fill-color-disabled);
  border-color: var(--w-control-stroke-color-default);
  color: var(--w-text-fill-color-disabled);
  pointer-events: none;
}

:host([appearance="accent"]) {
  background-color: var(--w-accent-fill-color-default);
  border-color: var(--w-accent-control-elevation-border);
  color: var(--w-text-on-accent-fill-color-primary);
}
:host([appearance="accent"]:hover) {
  background-color: var(--w-accent-fill-color-secondary);
}
:host([appearance="accent"]:active),
:host([appearance="accent"][data-pressed]) {
  background-color: var(--w-accent-fill-color-tertiary);
  border-color: transparent;
  color: var(--w-text-on-accent-fill-color-secondary);
}
:host([appearance="accent"][disabled]) {
  background-color: var(--w-accent-fill-color-disabled);
  border-color: transparent;
  color: var(--w-text-on-accent-fill-color-disabled);
}

:host([appearance="subtle"]) {
  background-color: transparent;
  border-color: transparent;
}
:host([appearance="subtle"]:hover) {
  background-color: var(--w-subtle-fill-color-secondary);
}
:host([appearance="subtle"]:active),
:host([appearance="subtle"][data-pressed]) {
  background-color: var(--w-subtle-fill-color-tertiary);
  border-color: transparent;
  color: var(--w-text-fill-color-secondary);
}
:host([appearance="subtle"][disabled]) {
  background-color: transparent;
  border-color: transparent;
  color: var(--w-text-fill-color-disabled);
}

${focusRing(':host(:focus-visible)', 3)}

.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
}
.icon[hidden] { display: none; }
::slotted([slot="icon"]) { display: inline-flex; }
::slotted([slot="flyout"]:not(:defined)) { display: none; }
`;

export abstract class ButtonBase extends WinElement {
  static override props: PropDefs = {
    disabled: { type: Boolean },
    appearance: { type: String, reflect: true, default: 'standard' },
    icon: { type: String, reflect: true },
  };
  static override template = `<span class="icon" part="icon" hidden><span class="icon-spec"></span><slot name="icon"></slot></span><slot></slot><slot name="flyout"></slot>`;

  declare disabled: boolean;
  declare appearance: ButtonAppearance;
  declare icon: string;

  protected flyoutPlacement: Placement = 'top';

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

  protected get activatesWithKeyboard(): boolean {
    return true;
  }

  protected override firstConnected(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'button');
    if (this.activatesWithKeyboard) keyboardActivation(this, () => this.disabled);
    this.renderRoot.querySelector('slot[name="icon"]')?.addEventListener('slotchange', () => this.syncIcon());
    this.addEventListener('click', (ev) => this.onActivate(ev));
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('disabled')) {
      this.setFocusable(!this.disabled);
      this.aria('aria-disabled', this.disabled ? 'true' : null);
    }
    if (changed.has('icon')) this.syncIcon();
  }

  protected syncIcon(): void {
    const wrap = this.renderRoot.querySelector<HTMLElement>('.icon');
    const spec = this.renderRoot.querySelector<HTMLElement>('.icon-spec');
    if (!wrap || !spec) return;
    spec.innerHTML = iconHtml(this.icon, 16);
    const slotted =
      (this.renderRoot.querySelector('slot[name="icon"]') as HTMLSlotElement | null)?.assignedElements().length ?? 0;
    wrap.hidden = !this.icon && slotted === 0;
  }

  get flyout(): FlyoutLike | null {
    return attachedFlyout(this);
  }

  private _command: CommandLike | null = null;
  private _commandListener = () => this.syncCommand();
  get command(): CommandLike | null {
    return this._command;
  }
  set command(c: CommandLike | null) {
    const prev = this._command as (CommandLike & Partial<EventTarget>) | null;
    prev?.removeEventListener?.('canexecutechanged', this._commandListener);
    this._command = c;
    (c as (CommandLike & Partial<EventTarget>) | null)?.addEventListener?.('canexecutechanged', this._commandListener);
    this.syncCommand();
  }
  get commandParameter(): string | null {
    return this.getAttribute('command-parameter');
  }

  private syncCommand(): void {
    const c = this._command;
    if (!c) return;
    if (c.canExecute) this.disabled = !c.canExecute(this.commandParameter ?? undefined);
    if (!this.getAttribute('aria-label') && c.label && !this.textContent?.trim())
      this.setAttribute('aria-label', c.label);
    if (c.icon && !this.icon) this.icon = c.icon;
  }

  protected onActivate(ev: MouseEvent): void {
    if (ev.defaultPrevented) return;
    const f = this.flyout;
    if (f && ev.composedPath().includes(f)) return;
    this._command?.execute(this.commandParameter ?? undefined);
    if (!f) return;
    if (f.isOpen) f.hide();
    else this.openFlyout(ev);
  }

  protected openFlyout(ev?: Event): void {
    const f = this.flyout;
    if (!f) return;
    const viaKeyboard = !ev || (ev instanceof MouseEvent && ev.detail === 0);
    f.showAt(this, {
      placement: (f.getAttribute('placement') as Placement | null) ?? this.flyoutPlacement,
      focus: viaKeyboard ? 'first' : 'none',
      inputType: viaKeyboard ? 'keyboard' : 'mouse',
    });
    this.aria('aria-expanded', 'true');
    const onClosed = (e: Event) => {
      if (e.target !== f) return;
      this.aria('aria-expanded', 'false');
      f.removeEventListener('closed', onClosed);
    };
    f.addEventListener('closed', onClosed);
  }
}

export class WinButton extends ButtonBase {
  static override styles = [buttonSurfaceCss];
  static override formAssociated = true;
  static override props: PropDefs = {
    type: { type: String, reflect: true, default: 'button' },
    name: { type: String, reflect: true },
    value: { type: String },
  };
  declare type: 'button' | 'submit' | 'reset';
  declare name: string;
  declare value: string;

  static {
    this.define('win-button');
  }

  get form(): HTMLFormElement | null {
    return this.internals.form;
  }

  protected override firstConnected(): void {
    super.firstConnected();
    if (this.flyout) this.aria('aria-haspopup', 'true');
  }

  protected override onActivate(ev: MouseEvent): void {
    super.onActivate(ev);
    if ((this.type !== 'submit' && this.type !== 'reset') || this.flyout) return;
    setTimeout(() => {
      if (!ev.defaultPrevented && !this.disabled && !this.matches(':disabled')) this.submitForm();
    });
  }

  private submitForm(): void {
    const form = this.internals.form;
    if (!form) return;
    if (this.type === 'reset') {
      form.reset();
      return;
    }
    if (this.name) this.internals.setFormValue(this.value ?? '');
    try {
      form.requestSubmit();
    } finally {
      if (this.name) this.internals.setFormValue(null);
    }
  }
}

export class WinRepeatButton extends ButtonBase {
  static override styles = [buttonSurfaceCss];
  static override props: PropDefs = {
    delay: { type: Number, default: 250 },
    interval: { type: Number, default: 250 },
  };
  declare delay: number;
  declare interval: number;

  private delayTimer: ReturnType<typeof setTimeout> | null = null;
  private repeatTimer: ReturnType<typeof setInterval> | null = null;
  private pointerInside = true;

  static {
    this.define('win-repeat-button');
  }

  protected override get activatesWithKeyboard(): boolean {
    return false;
  }

  protected override firstConnected(): void {
    super.firstConnected();
    this.addEventListener('pointerdown', (ev) => {
      if (this.disabled || ev.button !== 0) return;
      this.setPointerCapture(ev.pointerId);
      this.pointerInside = true;
      this.start();
    });
    this.addEventListener('pointermove', (ev) => {
      if (!this.hasPointerCapture(ev.pointerId)) return;
      const r = this.getBoundingClientRect();
      this.pointerInside =
        ev.clientX >= r.left && ev.clientX <= r.right && ev.clientY >= r.top && ev.clientY <= r.bottom;
      this.toggleAttribute('data-pressed', this.pointerInside);
    });
    const stop = () => this.stop();
    this.addEventListener('pointerup', stop);
    this.addEventListener('pointercancel', stop);
    this.addEventListener('lostpointercapture', stop);
    this.addEventListener(
      'click',
      (ev) => {
        if (ev.isTrusted && ev.detail > 0) ev.stopImmediatePropagation();
      },
      true,
    );
    this.addEventListener('keydown', (ev) => {
      if (this.disabled || ev.repeat || (ev.key !== ' ' && ev.key !== 'Enter')) return;
      ev.preventDefault();
      this.pointerInside = true;
      this.start();
    });
    this.addEventListener('keyup', (ev) => {
      if (ev.key === ' ' || ev.key === 'Enter') this.stop();
    });
    this.addEventListener('blur', stop);
  }

  protected override disconnected(): void {
    this.stop();
  }

  private fire(): void {
    if (this.disabled || !this.pointerInside) return;
    this.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
  }

  private start(): void {
    this.stop();
    this.toggleAttribute('data-pressed', true);
    this.fire();
    this.delayTimer = setTimeout(
      () => {
        this.repeatTimer = setInterval(() => this.fire(), Math.max(16, this.interval));
      },
      Math.max(0, this.delay),
    );
  }

  private stop(): void {
    if (this.delayTimer) clearTimeout(this.delayTimer);
    if (this.repeatTimer) clearInterval(this.repeatTimer);
    this.delayTimer = null;
    this.repeatTimer = null;
    this.removeAttribute('data-pressed');
  }
}

const toggleCss = css`
:host([checked]) {
  background-color: var(--w-accent-fill-color-default);
  border-color: var(--w-accent-control-elevation-border);
  color: var(--w-text-on-accent-fill-color-primary);
}
:host([checked]:hover) {
  background-color: var(--w-accent-fill-color-secondary);
}
:host([checked]:active),
:host([checked][data-pressed]) {
  background-color: var(--w-accent-fill-color-tertiary);
  border-color: transparent;
  color: var(--w-text-on-accent-fill-color-secondary);
}
:host([checked][disabled]) {
  background-color: var(--w-accent-fill-color-disabled);
  border-color: transparent;
  color: var(--w-text-on-accent-fill-color-disabled);
}
`;

export class WinToggleButton extends ButtonBase {
  static override styles = [buttonSurfaceCss, toggleCss];
  static override formAssociated = true;
  static override props: PropDefs = {
    checked: { type: Boolean },
    indeterminate: { type: Boolean },
    threeState: { type: Boolean, attribute: 'three-state' },
    name: { type: String, reflect: true },
    value: { type: String, default: 'on' },
  };
  declare checked: boolean;
  declare indeterminate: boolean;
  declare threeState: boolean;
  declare name: string;
  declare value: string;

  static {
    this.define('win-toggle-button');
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
    } else {
      this.indeterminate = false;
      this.checked = !this.checked;
    }
    this.emit('change', { checked: this.checked, indeterminate: this.indeterminate });
  }

  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    if (changed.has('checked') || changed.has('indeterminate')) {
      this.aria('aria-pressed', this.indeterminate ? 'mixed' : this.checked ? 'true' : 'false');
      this.internals.setFormValue(this.checked ? this.value : null);
    }
  }

  formResetCallback(): void {
    this.checked = this.hasAttribute('checked');
  }
}

const hyperlinkCss = css`
:host {
  display: inline-flex;
  position: relative;
  align-items: center;
  justify-content: center;
  gap: 8px;
  vertical-align: middle;
  padding: 5px 11px 6px;
  border: 1px solid transparent;
  border-radius: var(--w-corner-radius-control);
  background-color: transparent;
  color: var(--w-accent-text-fill-color-primary);
  font: var(--w-type-body);
  white-space: nowrap;
  cursor: pointer;
  user-select: none;
  outline: none;
  transition: background-color var(--w-duration-faster) linear;
}
:host(:hover) {
  background-color: var(--w-subtle-fill-color-secondary);
  color: var(--w-accent-text-fill-color-secondary);
}
:host(:active),
:host([data-pressed]) {
  background-color: var(--w-subtle-fill-color-tertiary);
  color: var(--w-accent-text-fill-color-tertiary);
}
:host([disabled]) {
  background-color: transparent;
  color: var(--w-accent-text-fill-color-disabled);
  pointer-events: none;
}
:host([underline]) ::slotted(*), :host([underline]) .label { text-decoration: underline; }
${focusRing(':host(:focus-visible)', 3)}
.icon { display: inline-flex; flex: none; }
.icon[hidden] { display: none; }
::slotted([slot="flyout"]:not(:defined)) { display: none; }
`;

export class WinHyperlinkButton extends ButtonBase {
  static override styles = [hyperlinkCss];
  static override props: PropDefs = {
    href: { type: String, reflect: true },
    target: { type: String, default: '_blank' },
  };
  declare href: string;
  declare target: string;

  static {
    this.define('win-hyperlink-button');
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'link');
    super.firstConnected();
  }

  protected override onActivate(ev: MouseEvent): void {
    if (ev.defaultPrevented) return;
    if (this.href) {
      const target = ev.ctrlKey || ev.metaKey || ev.button === 1 ? '_blank' : this.target;
      window.open(this.href, target, target === '_blank' ? 'noopener' : undefined);
      return;
    }
    super.onActivate(ev);
  }
}

const dropDownCss = css`
.chevron {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 12px;
  height: 12px;
  margin-left: 0;
  flex: none;
  color: var(--w-text-fill-color-secondary);
  transition: transform var(--w-duration-fast) cubic-bezier(0.2, 1.8, 0.4, 1);
}
:host([appearance="accent"]) .chevron { color: inherit; }
:host(:active) .chevron,
:host([data-pressed]) .chevron {
  transform: translateY(2px);
  transition-duration: var(--w-duration-faster);
  transition-timing-function: var(--w-ease-decelerate);
}
:host([disabled]) .chevron { color: var(--w-text-fill-color-disabled); }
`;

export class WinDropDownButton extends ButtonBase {
  static override styles = [buttonSurfaceCss, dropDownCss];
  static override template = `<span class="icon" part="icon" hidden><span class="icon-spec"></span><slot name="icon"></slot></span><slot></slot><span class="chevron" part="chevron" aria-hidden="true">${glyph('chevronDownSmall', 12)}</span><slot name="flyout"></slot>`;

  static {
    this.define('win-drop-down-button');
  }

  protected override flyoutPlacement: Placement = 'bottom-start';

  protected override firstConnected(): void {
    super.firstConnected();
    this.aria('aria-haspopup', 'true');
    this.aria('aria-expanded', 'false');
    this.addEventListener('keydown', (ev) => {
      if ((ev.key === 'ArrowDown' && ev.altKey) || ev.key === 'F4') {
        ev.preventDefault();
        this.openFlyout();
      }
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-button': WinButton;
    'win-repeat-button': WinRepeatButton;
    'win-toggle-button': WinToggleButton;
    'win-hyperlink-button': WinHyperlinkButton;
    'win-drop-down-button': WinDropDownButton;
  }
}
