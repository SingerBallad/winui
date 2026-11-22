import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { glyph, iconHtml } from '../../base/icons.ts';
import { attachedFlyout, type FlyoutLike, type Placement } from '../../base/popup.ts';

const splitCss = css`
:host {
  display: inline-flex;
  position: relative;
  vertical-align: middle;
  box-sizing: border-box;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  white-space: nowrap;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  outline: none;
}
.root {
  display: grid;
  grid-template-columns: minmax(35px, auto) 1px 35px;
  border-radius: inherit;
  overflow: hidden;
  width: 100%;
}
:host::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid;
  border-color: var(--w-control-elevation-border);
  border-radius: inherit;
  pointer-events: none;
}
.part {
  display: inline-flex;
  align-items: center;
  background-color: var(--w-control-fill-color-default);
  transition: background-color var(--w-duration-faster) linear;
}
.primary {
  justify-content: center;
  gap: 8px;
  padding: 6px 11px 7px;
  grid-column: 1;
}
.divider {
  grid-column: 2;
  background-color: var(--w-control-fill-color-default);
  position: relative;
}
.divider::after {
  content: '';
  position: absolute;
  inset: 0;
  background: var(--w-control-stroke-color-default);
}
.secondary {
  grid-column: 3;
  justify-content: flex-end;
  padding: 0 12px 0 0;
  color: var(--w-text-fill-color-secondary);
}
.chevron {
  display: inline-flex;
  width: 12px;
  height: 12px;
  align-items: center;
  justify-content: center;
  transition: transform var(--w-duration-fast) cubic-bezier(0.2, 1.8, 0.4, 1);
}
.icon { display: inline-flex; flex: none; }
.icon[hidden] { display: none; }
::slotted([slot="flyout"]:not(:defined)) { display: none; }

.primary:hover, .primary:hover + .divider { background-color: var(--w-control-fill-color-secondary); }
.primary:active, .primary:active + .divider,
:host([data-pressed]) .primary, :host([data-pressed]) .divider {
  background-color: var(--w-control-fill-color-tertiary);
  color: var(--w-text-fill-color-secondary);
}
.secondary:hover { background-color: var(--w-control-fill-color-secondary); color: var(--w-text-fill-color-primary); }
.secondary:active {
  background-color: var(--w-control-fill-color-tertiary);
  color: var(--w-text-fill-color-tertiary);
}
.secondary:active .chevron {
  transform: translateY(2px);
  transition-duration: var(--w-duration-faster);
  transition-timing-function: var(--w-ease-decelerate);
}
:host([flyout-open]) .part, :host([flyout-open]) .divider {
  background-color: var(--w-control-fill-color-tertiary);
}
:host([flyout-open]) .primary { color: var(--w-text-fill-color-secondary); }
:host([flyout-open]) .secondary { color: var(--w-text-fill-color-tertiary); }
:host([flyout-open])::after { border-color: var(--w-control-elevation-border); }

:host([checked]) .part, :host([checked]) .divider {
  background-color: var(--w-accent-fill-color-default);
  color: var(--w-text-on-accent-fill-color-primary);
}
:host([checked]) .divider::after { background: var(--w-control-stroke-color-on-accent-tertiary); }
:host([checked])::after { border-color: var(--w-accent-control-elevation-border); }
:host([checked]) .primary:hover, :host([checked]) .primary:hover + .divider,
:host([checked]) .secondary:hover { background-color: var(--w-accent-fill-color-secondary); color: var(--w-text-on-accent-fill-color-primary); }
:host([checked]) .primary:active, :host([checked]) .primary:active + .divider,
:host([checked]) .secondary:active,
:host([checked][data-pressed]) .primary, :host([checked][data-pressed]) .divider,
:host([checked][flyout-open]) .part, :host([checked][flyout-open]) .divider {
  background-color: var(--w-accent-fill-color-tertiary);
  color: var(--w-text-on-accent-fill-color-secondary);
}
:host([checked][flyout-open])::after { border-color: transparent; }

:host([disabled]) { pointer-events: none; color: var(--w-text-fill-color-disabled); }
:host([disabled]) .part, :host([disabled]) .divider { background-color: var(--w-control-fill-color-disabled); color: var(--w-text-fill-color-disabled); }
:host([disabled])::after { border-color: var(--w-control-stroke-color-default); }
:host([disabled][checked]) .part, :host([disabled][checked]) .divider { background-color: var(--w-accent-fill-color-disabled); }
:host([disabled][checked])::after { border-color: transparent; }

${focusRing(':host(:focus-visible)', 1)}
`;

export class WinSplitButton extends WinElement {
  static override styles = [splitCss];
  static override template = `<div class="root" part="root"><div class="part primary" part="primary"><span class="icon" part="icon" hidden><span class="icon-spec"></span><slot name="icon"></slot></span><slot></slot></div><span class="divider" part="divider"></span><div class="part secondary" part="secondary" aria-hidden="true"><span class="chevron">${glyph('chevronDownSmall', 12)}</span></div></div><slot name="flyout"></slot>`;
  static override props: PropDefs = {
    disabled: { type: Boolean },
    icon: { type: String, reflect: true },
  };
  declare disabled: boolean;
  declare icon: string;

  static {
    this.define('win-split-button');
  }

  protected primary!: HTMLElement;
  protected secondary!: HTMLElement;

  get flyout(): FlyoutLike | null {
    return attachedFlyout(this);
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'group');
    this.primary = this.$('.primary');
    this.secondary = this.$('.secondary');
    this.$('slot[name="icon"]').addEventListener('slotchange', () => this.syncIcon());

    this.primary.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (this.disabled) return;
      this.invokePrimary();
    });
    this.secondary.addEventListener('click', (ev) => {
      ev.stopPropagation();
      if (this.disabled) return;
      this.toggleFlyout(ev.detail === 0);
    });
    this.addEventListener('keydown', (ev) => {
      if (this.disabled || ev.target !== this) return;
      if (ev.key === 'Enter' && !ev.repeat) {
        ev.preventDefault();
        this.invokePrimary();
      } else if (ev.key === ' ') {
        ev.preventDefault();
        this.toggleAttribute('data-pressed', true);
      } else if ((ev.key === 'ArrowDown' && ev.altKey) || ev.key === 'F4') {
        ev.preventDefault();
        this.toggleFlyout(true);
      }
    });
    this.addEventListener('keyup', (ev) => {
      if (ev.key === ' ' && this.hasAttribute('data-pressed')) {
        this.removeAttribute('data-pressed');
        this.invokePrimary();
      }
    });
    this.addEventListener('blur', () => this.removeAttribute('data-pressed'));
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('disabled')) {
      this.setFocusable(!this.disabled);
      this.aria('aria-disabled', this.disabled ? 'true' : null);
    }
    if (changed.has('icon')) this.syncIcon();
  }

  private syncIcon(): void {
    const wrap = this.$('.icon');
    this.$('.icon-spec').innerHTML = iconHtml(this.icon, 16);
    const slotted = this.$<HTMLSlotElement>('slot[name="icon"]').assignedElements().length;
    wrap.hidden = !this.icon && slotted === 0;
  }

  protected invokePrimary(): void {
    this.dispatchEvent(new MouseEvent('click', { bubbles: true, composed: true, cancelable: true }));
  }

  protected toggleFlyout(viaKeyboard: boolean): void {
    const f = this.flyout;
    if (!f) return;
    if (f.isOpen) {
      f.hide();
      return;
    }
    const placement = (f.getAttribute('placement') as Placement | null) ?? 'bottom-start';
    f.showAt(this, { placement, focus: viaKeyboard ? 'first' : 'none', inputType: viaKeyboard ? 'keyboard' : 'mouse' });
    this.toggleAttribute('flyout-open', true);
    this.aria('aria-expanded', 'true');
    const onClosed = (e: Event) => {
      if (e.target !== f) return;
      this.removeAttribute('flyout-open');
      this.aria('aria-expanded', 'false');
      f.removeEventListener('closed', onClosed);
    };
    f.addEventListener('closed', onClosed);
  }
}

export class WinToggleSplitButton extends WinSplitButton {
  static override props: PropDefs = {
    checked: { type: Boolean },
  };
  declare checked: boolean;

  static {
    this.define('win-toggle-split-button');
  }

  protected override invokePrimary(): void {
    this.checked = !this.checked;
    this.emit('change', { checked: this.checked });
    super.invokePrimary();
  }

  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed);
    if (changed.has('checked') || first) this.aria('aria-pressed', this.checked ? 'true' : 'false');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-split-button': WinSplitButton;
    'win-toggle-split-button': WinToggleSplitButton;
  }
}
