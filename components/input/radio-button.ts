import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { focusRect, headerCss } from './shared.ts';

const radioCss = css`
:host {
  --outer-fill: var(--w-control-alt-fill-color-secondary);
  --outer-stroke: var(--w-control-strong-stroke-color-default);
  --check-fill: var(--w-accent-fill-color-default);
  --dot: var(--w-text-on-accent-fill-color-primary);
  --dot-scale: 0.857;
  --dot-dur: var(--w-duration-fast);
  display: inline-grid;
  grid-template-columns: 20px auto;
  position: relative;
  box-sizing: border-box;
  min-width: 120px;
  vertical-align: middle;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  outline: none;
}
:host(:hover) {
  --outer-fill: var(--w-control-alt-fill-color-tertiary);
  --check-fill: var(--w-accent-fill-color-secondary);
  --dot-scale: 1;
  --dot-dur: var(--w-duration-normal);
}
:host(:active), :host([data-pressed]) {
  --outer-fill: var(--w-control-alt-fill-color-quarternary);
  --outer-stroke: var(--w-control-strong-stroke-color-disabled);
  --check-fill: var(--w-accent-fill-color-tertiary);
  --dot-scale: 0.714;
  --dot-dur: var(--w-duration-normal);
}
:host([disabled]) {
  --outer-fill: var(--w-control-alt-fill-color-disabled);
  --outer-stroke: var(--w-control-strong-stroke-color-disabled);
  --check-fill: var(--w-accent-fill-color-disabled);
  --dot-scale: 1;
  --dot-dur: var(--w-duration-fast);
  color: var(--w-text-fill-color-disabled);
  pointer-events: none;
}
${focusRect(':host(:focus-visible)::after', { top: 3, right: 7, bottom: 3, left: 7 }, 7)}

.glyph {
  grid-column: 1;
  align-self: start;
  position: relative;
  width: 20px;
  height: 32px;
}
.outer, .check-outer, .dot, .pressed-dot {
  position: absolute;
  left: 50%;
  top: 50%;
  translate: -50% -50%;
  box-sizing: border-box;
  border-radius: 50%;
}
.outer {
  width: 20px; height: 20px;
  border: 1px solid var(--outer-stroke);
  background: var(--outer-fill);
}
.check-outer {
  width: 20px; height: 20px;
  border: 1px solid var(--check-fill);
  background: var(--check-fill);
  opacity: 0;
}
.dot {
  --dot-stroke: var(--w-circle-elevation-border-gradient);
  width: 14px;
  height: 14px;
  border: 1px solid transparent;
  background:
    linear-gradient(var(--dot), var(--dot)) padding-box,
    var(--dot-stroke) border-box,
    linear-gradient(var(--dot), var(--dot)) border-box;
  opacity: 0;
  scale: var(--dot-scale);
  transition: scale var(--dot-dur) var(--w-ease-decelerate);
}
.pressed-dot {
  width: 10px; height: 10px;
  background: var(--dot);
  opacity: 0;
  scale: 0.4;
}
:host(:active:not([checked])) .pressed-dot,
:host([data-pressed]:not([checked])) .pressed-dot {
  opacity: 1;
  scale: 1;
  transition: scale var(--w-duration-fast) var(--w-ease-decelerate);
}
:host([checked]) .outer { opacity: 0; }
:host([checked]) .check-outer { opacity: 1; }
:host([checked]) .dot {
  opacity: 1;
  --dot-stroke: var(--w-accent-control-elevation-border-gradient);
}
:host([checked][disabled]) .dot { --dot-stroke: var(--w-control-elevation-border-gradient); }

.content {
  grid-column: 2;
  align-self: start;
  padding: 6px 0 0 8px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.content[hidden] { display: none; }
`;

const GROUP_SELECTOR = 'win-radio-button';

export class WinRadioButton extends WinElement {
  static override styles = [radioCss];
  static override formAssociated = true;
  static override template = `<span class="glyph" part="glyph" aria-hidden="true"><span class="outer"></span><span class="check-outer"></span><span class="dot"></span><span class="pressed-dot"></span></span><span class="content" part="content"><slot></slot></span>`;
  static override props: PropDefs = {
    checked: { type: Boolean },
    disabled: { type: Boolean },
    name: { type: String, reflect: true },
    value: { type: String },
  };
  declare checked: boolean;
  declare disabled: boolean;
  declare name: string;
  declare value: string;

  private defaultChecked = false;
  private spaceDown = false;

  static {
    this.define('win-radio-button');
  }

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

  groupMembers(): WinRadioButton[] {
    const owner = this.closest('win-radio-group');
    if (owner && !this.name) {
      return Array.from(owner.querySelectorAll<WinRadioButton>(GROUP_SELECTOR)).filter(
        (r) => r.closest('win-radio-group') === owner && !r.name,
      );
    }
    if (!this.name) return [this];
    const root = this.getRootNode() as Document | ShadowRoot;
    return Array.from(root.querySelectorAll<WinRadioButton>(GROUP_SELECTOR)).filter((r) => r.name === this.name);
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'radio');
    this.defaultChecked = this.hasAttribute('checked');
    this.addEventListener('click', (ev) => {
      if (ev.defaultPrevented) return;
      this.select(true);
    });
    this.addEventListener('keydown', (ev) => this.onKey(ev));
    this.addEventListener('keyup', (ev) => {
      if (ev.key === ' ' && this.spaceDown) {
        this.spaceDown = false;
        this.removeAttribute('data-pressed');
        if (!this.disabled) this.select(true);
      }
    });
    this.addEventListener('blur', () => {
      this.spaceDown = false;
      this.removeAttribute('data-pressed');
    });
    const slot = this.$<HTMLSlotElement>('slot');
    const sync = () => {
      const has = slot.assignedNodes().some((n) => n.nodeType === 1 || (n.textContent ?? '').trim());
      this.$('.content').hidden = !has;
    };
    slot.addEventListener('slotchange', sync);
    sync();
  }

  protected override connected(): void {
    queueMicrotask(() => this.syncGroupTabStops());
  }

  private onKey(ev: KeyboardEvent): void {
    if (this.disabled || ev.target !== this) return;
    if (ev.key === ' ') {
      ev.preventDefault();
      if (!this.spaceDown) {
        this.spaceDown = true;
        this.toggleAttribute('data-pressed', true);
      }
      return;
    }
    if (this.closest('win-radio-group') && !this.name) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const next = ev.key === 'ArrowDown' || ev.key === (rtl ? 'ArrowLeft' : 'ArrowRight');
    const prev = ev.key === 'ArrowUp' || ev.key === (rtl ? 'ArrowRight' : 'ArrowLeft');
    if (!next && !prev) return;
    const members = this.groupMembers().filter((r) => !r.disabled);
    const i = members.indexOf(this);
    if (i < 0 || members.length < 2) return;
    ev.preventDefault();
    const target = members[(i + (next ? 1 : -1) + members.length) % members.length]!;
    target.focus();
    target.select(true);
  }

  select(user = false): void {
    if (this.checked) return;
    for (const r of this.groupMembers()) if (r !== this && r.checked) r.checked = false;
    this.checked = true;
    this.flushUpdates();
    if (user) {
      this.emit('change', { checked: true, value: this.value });
    }
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('disabled')) {
      this.aria('aria-disabled', this.disabled ? 'true' : null);
      this.syncGroupTabStops();
    }
    if (changed.has('checked')) {
      this.aria('aria-checked', this.checked ? 'true' : 'false');
      this.internals.setFormValue(this.checked ? this.value || 'on' : null);
      if (this.checked && !first) {
        for (const r of this.groupMembers()) if (r !== this && r.checked) r.checked = false;
      }
      this.syncGroupTabStops();
    }
  }

  syncGroupTabStops(): void {
    if (!this.isConnected) return;
    const members = this.groupMembers();
    const enabled = members.filter((r) => !r.disabled);
    const stop = enabled.find((r) => r.checked) ?? enabled[0] ?? null;
    for (const r of members) {
      if (r.disabled) r.setAttribute('tabindex', '-1');
      else r.setAttribute('tabindex', r === stop ? '0' : '-1');
    }
  }

  formResetCallback(): void {
    this.checked = this.defaultChecked;
  }

  formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled;
  }
}

const radioButtonsCss = css`
:host {
  display: inline-block;
  vertical-align: top;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
}
.header { margin: 0 0 8px; }
.items {
  display: inline-grid;
  grid-auto-flow: column;
  grid-template-rows: repeat(var(--rows, 1), auto);
  grid-auto-columns: 1fr;
  column-gap: 7px;
  row-gap: 8px;
  align-items: start;
}
::slotted(win-radio-button) { min-width: 120px; }
`;

export class WinRadioGroup extends WinElement {
  static override styles = [headerCss, radioButtonsCss];
  static override template = `<div class="header" part="header" hidden><slot name="header"></slot><span class="header-text"></span></div><div class="items" part="items" role="none"><slot></slot></div>`;
  static override props: PropDefs = {
    header: { type: String },
    maxColumns: { type: Number, attribute: 'max-columns', default: 1 },
    selectedIndex: { type: Number, attribute: 'selected-index', default: -1 },
    disabled: { type: Boolean },
  };
  declare header: string;
  declare maxColumns: number;
  declare selectedIndex: number;
  declare disabled: boolean;

  private syncing = false;

  static {
    this.define('win-radio-group');
  }

  get items(): WinRadioButton[] {
    return Array.from(this.querySelectorAll<WinRadioButton>(GROUP_SELECTOR)).filter(
      (r) => r.closest('win-radio-group') === this,
    );
  }

  get selectedItem(): WinRadioButton | null {
    return this.items[this.selectedIndex] ?? null;
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'radiogroup');
    const slot = this.$<HTMLSlotElement>('.items slot');
    slot.addEventListener('slotchange', () => this.layout());
    this.$<HTMLSlotElement>('slot[name="header"]').addEventListener('slotchange', () => this.syncHeader());
    this.addEventListener('change', (ev) => {
      const t = ev.target as Element;
      if (t === this || t.localName !== GROUP_SELECTOR || this.syncing) return;
      const idx = this.items.indexOf(t as WinRadioButton);
      if (idx < 0) return;
      ev.stopPropagation();
      this.syncing = true;
      this.selectedIndex = idx;
      this.flushUpdates();
      this.syncing = false;
      this.emit('selectionchanged', { selectedIndex: idx, selectedItem: t, value: (t as WinRadioButton).value });
    });
    this.addEventListener('keydown', (ev) => this.onKey(ev));
    queueMicrotask(() => this.layout());
  }

  private onKey(ev: KeyboardEvent): void {
    const t = ev.target as WinRadioButton;
    const items = this.items;
    const i = items.indexOf(t);
    if (i < 0) return;
    const rows = this.rowCount();
    const rtl = getComputedStyle(this).direction === 'rtl';
    let j: number;
    switch (ev.key) {
      case 'ArrowDown':
        j = i + 1;
        break;
      case 'ArrowUp':
        j = i - 1;
        break;
      case 'ArrowRight':
        j = rtl ? i - rows : i + rows;
        break;
      case 'ArrowLeft':
        j = rtl ? i + rows : i - rows;
        break;
      case 'Home':
        j = 0;
        break;
      case 'End':
        j = items.length - 1;
        break;
      default:
        return;
    }
    ev.preventDefault();
    if (j < 0 || j >= items.length) return;
    const step = j > i ? 1 : -1;
    while (j >= 0 && j < items.length && items[j]!.disabled) j += step;
    const target = items[j];
    if (!target) return;
    target.focus();
    target.select(true);
  }

  private rowCount(): number {
    const n = this.items.length;
    const cols = Math.max(1, Math.min(this.maxColumns || 1, n || 1));
    return Math.max(1, Math.ceil(n / cols));
  }

  private layout(): void {
    this.style.setProperty('--rows', String(this.rowCount()));
    const items = this.items.filter((r) => typeof r.select === 'function');
    if (this.selectedIndex >= 0) {
      const sel = items[this.selectedIndex];
      if (sel && !sel.checked) sel.select(false);
    } else {
      const idx = items.findIndex((r) => r.checked);
      if (idx >= 0) {
        this.syncing = true;
        this.selectedIndex = idx;
        this.flushUpdates();
        this.syncing = false;
      }
    }
    if (this.disabled) for (const r of items) r.disabled = true;
    items[0]?.syncGroupTabStops();
  }

  private syncHeader(): void {
    const slotted = this.$<HTMLSlotElement>('slot[name="header"]').assignedNodes().length > 0;
    this.$('.header-text').textContent = this.header;
    this.$('.header').hidden = !this.header && !slotted;
    if (this.header) this.aria('aria-label', this.header);
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('header')) this.syncHeader();
    if (first) return;
    if (changed.has('maxColumns')) this.layout();
    if (changed.has('disabled')) {
      for (const r of this.items) r.disabled = this.disabled;
    }
    if (changed.has('selectedIndex') && !this.syncing) {
      const items = this.items;
      const sel = items[this.selectedIndex];
      if (sel) sel.select(false);
      else for (const r of items) r.checked = false;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-radio-button': WinRadioButton;
    'win-radio-group': WinRadioGroup;
  }
}
