import { WinElement, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css, focusRing, scrollbars } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { TypeAhead } from '../../base/keyboard.ts';
import { computePosition, Popup, popupResetCss, viewportSize, type PositionResult } from '../../base/popup.ts';
import { menuIn, popupOut, splitOpen } from '../../motion/animate.ts';
import { clamp, headerCss, textInputCss } from './shared.ts';

const itemCss = css`
:host {
  display: flex;
  align-items: center;
  position: relative;
  box-sizing: border-box;
  margin: 2px 5px;
  padding: 5px 11px 7px 11px;
  border-radius: 3px;
  background-color: transparent;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  white-space: nowrap;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}
:host([data-touch]) { padding: 11px 11px 13px 11px; }
:host(:hover) { background-color: var(--w-subtle-fill-color-secondary); }
:host(:active) {
  background-color: var(--w-subtle-fill-color-tertiary);
  color: var(--w-text-fill-color-secondary);
}
:host([selected]) { background-color: var(--w-subtle-fill-color-secondary); }
:host([selected]:hover) { background-color: var(--w-subtle-fill-color-tertiary); }
:host([selected]:active) {
  background-color: var(--w-subtle-fill-color-secondary);
  color: var(--w-text-fill-color-secondary);
}
:host([disabled]) {
  color: var(--w-text-fill-color-disabled);
  background-color: transparent;
  pointer-events: none;
}
:host([disabled][selected]) { background-color: var(--w-subtle-fill-color-secondary); }
${focusRing(':host(:focus-visible)', 3)}
.pill {
  position: absolute;
  left: 0;
  top: 50%;
  width: 3px;
  height: 16px;
  margin-top: -8px;
  border-radius: 1.5px;
  background: var(--w-accent-fill-color-default);
  opacity: 0;
  transition: scale var(--w-duration-fast) var(--w-ease-decelerate);
}
:host(:dir(rtl)) .pill { left: auto; right: 0; }
:host([selected]) .pill { opacity: 1; }
:host([selected]:active) .pill { scale: 1 0.625; }
.content { min-width: 0; overflow: hidden; text-overflow: ellipsis; display: inline-flex; align-items: center; gap: 8px; }
`;

export class WinComboBoxItem extends WinElement {
  static override styles = [itemCss];
  static override template = `<span class="pill" part="pill"></span><span class="content" part="content"><span class="label"></span><slot></slot></span>`;
  static override props: PropDefs = {
    selected: { type: Boolean },
    disabled: { type: Boolean },
    value: { type: String },
    text: { type: String },
  };
  declare selected: boolean;
  declare disabled: boolean;
  declare value: string;
  declare text: string;

  static {
    this.define('win-combo-box-item');
  }

  get label(): string {
    return (this.text || this.textContent || '').trim();
  }

  get itemValue(): string {
    return this.value || this.label;
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'option');
    this.tabIndex = -1;
  }

  protected override updated(changed: Set<string>): void {
    if (changed.has('text')) this.$('.label').textContent = this.text;
    if (changed.has('selected')) this.aria('aria-selected', this.selected ? 'true' : 'false');
    if (changed.has('disabled')) this.aria('aria-disabled', this.disabled ? 'true' : null);
  }
}

const comboCss = css`
:host {
  display: inline-flex;
  flex-direction: column;
  vertical-align: top;
  box-sizing: border-box;
  min-width: 64px;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}
.header { margin: 0 0 8px; }
.field {
  position: relative;
  display: grid;
  grid-template-columns: minmax(0, 1fr) 38px;
  align-items: center;
  box-sizing: border-box;
  min-width: 64px;
  min-height: 32px;
  border: 1px solid;
  border-color: var(--w-control-elevation-border);
  border-radius: var(--w-corner-radius-control);
  background-color: var(--w-control-fill-color-default);
  background-clip: padding-box;
  cursor: default;
  transition: background-color var(--w-duration-faster) linear;
}
.field:hover { background-color: var(--w-control-fill-color-secondary); }
.field:active, :host([data-pressed]) .field {
  background-color: var(--w-control-fill-color-tertiary);
  border-color: var(--w-control-stroke-color-default);
}
.field:active .content, :host([data-pressed]) .content { color: var(--w-text-fill-color-secondary); }
.field:active .placeholder { color: var(--w-text-fill-color-tertiary); }
:host(:focus-visible) .field {
  outline: 2px solid var(--w-focus-stroke-color-outer);
  outline-offset: 2px;
  box-shadow: 0 0 0 2px var(--w-control-fill-color-default);
}
.pill {
  position: absolute;
  left: 0;
  top: 50%;
  width: 3px;
  height: 16px;
  margin-top: -8px;
  border-radius: 1.5px;
  background: var(--w-accent-fill-color-default);
  opacity: 0;
}
:host(:focus-visible) .pill { opacity: 1; }
.content {
  grid-column: 1;
  grid-row: 1;
  min-width: 0;
  padding: 4px 0 6px 11px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  display: flex;
  align-items: center;
  gap: 8px;
}
.placeholder { color: var(--w-text-fill-color-secondary); }
.chevron {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  margin-right: 13px;
  width: 12px;
  height: 12px;
  display: inline-flex;
  color: var(--w-text-fill-color-secondary);
  transition: transform var(--w-duration-fast) cubic-bezier(0.2, 1.8, 0.4, 1);
  pointer-events: none;
}
.field:active .chevron, :host([data-pressed]) .chevron {
  transform: translateY(2px);
  transition-duration: var(--w-duration-faster);
  transition-timing-function: var(--w-ease-decelerate);
}
.description {
  color: var(--w-text-fill-color-secondary);
  font: var(--w-type-body);
  overflow-wrap: anywhere;
}
.description[hidden] { display: none; }

.editor {
  grid-column: 1 / -1;
  grid-row: 1;
  width: 100%;
  min-height: 30px;
  padding: 4px 38px 5px 11px;
  border: 0;
  border-radius: inherit;
  background: transparent;
  color: inherit;
  font: inherit;
  outline: none;
  user-select: text;
  -webkit-user-select: text;
}
.editor::placeholder { color: var(--w-text-fill-color-secondary); opacity: 1; }
.editor::selection { background: var(--w-accent-fill-color-selected-text-background); color: var(--w-text-on-accent-fill-color-selected-text); }
.drop-btn {
  grid-column: 2;
  grid-row: 1;
  justify-self: end;
  align-self: stretch;
  margin: 4px;
  width: 30px;
  border-radius: var(--w-corner-radius-control);
  display: none;
}
:host([editable]) .content { display: none; }
:host([editable]) .drop-btn { display: block; }
:host([editable]) .field:active { background-color: var(--w-control-fill-color-secondary); border-color: var(--w-control-elevation-border); }
:host([editable]) .drop-btn:hover { background: var(--w-subtle-fill-color-secondary); }
:host([editable]) .drop-btn:active { background: var(--w-subtle-fill-color-tertiary); }
:host([editable]) .field:has(.editor:focus) {
  background-color: var(--w-control-fill-color-input-active);
  border-color: var(--w-text-control-elevation-border);
}
:host([editable]) .field::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: linear-gradient(var(--w-text-control-elevation-border-focused-edge), var(--w-text-control-elevation-border-focused-edge)) bottom / 100% 2px no-repeat;
  clip-path: inset(0 50% 0 50%);
  opacity: 0;
  pointer-events: none;
  transition:
    clip-path var(--w-duration-fast) var(--w-ease-decelerate),
    opacity var(--w-duration-fast) linear;
}
:host([editable]) .field:has(.editor:focus)::after {
  clip-path: inset(0 0 0 0);
  opacity: 1;
  transition:
    clip-path var(--w-duration-normal) var(--w-ease-decelerate),
    opacity var(--w-duration-faster) linear;
}
:host([editable]) .field { border-color: var(--w-text-control-elevation-border); }
:host(:not([editable])) .editor { display: none; }

:host([disabled]) { pointer-events: none; }
:host([disabled]) .field {
  background-color: var(--w-control-fill-color-disabled);
  border-color: var(--w-control-stroke-color-default);
}
:host([disabled]) .content, :host([disabled]) .placeholder, :host([disabled]) .chevron, :host([disabled]) .editor {
  color: var(--w-text-fill-color-disabled);
}

${popupResetCss('.popup')}
.presenter {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 80px;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-flyout);
  overflow: hidden;
  outline: none;
}
.items {
  padding: 4px 0;
  overflow-y: auto;
  overflow-x: hidden;
  max-height: calc(min(var(--max-dd, 504px), var(--w-popup-max-height, 504px)) - 2px);
}
`;

type ItemSpec = string | { text: string; value?: string; disabled?: boolean };

export class WinComboBox extends WinElement {
  static override styles = [headerCss, scrollbars, textInputCss, comboCss];
  static override formAssociated = true;
  static override template = `<div class="header" part="header" hidden><slot name="header"></slot><span class="header-text"></span></div><div class="field" part="field"><span class="pill" part="pill"></span><span class="content" part="content"><span class="placeholder"></span></span><input class="editor" part="input" type="text" autocomplete="off" spellcheck="false" tabindex="-1"><span class="drop-btn" part="drop-down-button"></span><span class="chevron" part="chevron" aria-hidden="true">${glyph('chevronDownSmall', 12)}</span></div><div class="description" part="description" hidden><slot name="description"></slot><span class="description-text"></span></div><div class="popup" part="popup"><div class="presenter" part="presenter" role="listbox" tabindex="-1"><div class="items w-scroll" part="items"><slot></slot></div></div></div>`;
  static override props: PropDefs = {
    header: { type: String },
    placeholder: { type: String },
    description: { type: String },
    selectedIndex: { type: Number, attribute: 'selected-index', default: -1 },
    editable: { type: Boolean },
    open: { type: Boolean },
    disabled: { type: Boolean },
    maxDropDownHeight: { type: Number, attribute: 'max-drop-down-height', default: 504 },
    name: { type: String, reflect: true },
    text: { type: String },
  };
  declare header: string;
  declare placeholder: string;
  declare description: string;
  declare selectedIndex: number;
  declare editable: boolean;
  declare open: boolean;
  declare disabled: boolean;
  declare maxDropDownHeight: number;
  declare name: string;
  declare text: string;

  private popup!: Popup;
  private typeahead = new TypeAhead();
  private openedVia: 'mouse' | 'touch' | 'pen' | 'keyboard' = 'mouse';
  private defaultIndex = -1;
  private lastTyped = '';

  static {
    this.define('win-combo-box');
  }

  get items(): WinComboBoxItem[] {
    return Array.from(this.children).filter((c): c is WinComboBoxItem => c.localName === 'win-combo-box-item');
  }

  set itemsSource(list: ItemSpec[]) {
    for (const it of this.items) it.remove();
    const frag = document.createDocumentFragment();
    for (const spec of list) {
      const el = document.createElement('win-combo-box-item');
      if (typeof spec === 'string') el.textContent = spec;
      else {
        el.textContent = spec.text;
        if (spec.value !== undefined) el.setAttribute('value', spec.value);
        if (spec.disabled) el.setAttribute('disabled', '');
      }
      frag.append(el);
    }
    this.append(frag);
    queueMicrotask(() => this.syncItems());
  }

  get selectedItem(): WinComboBoxItem | null {
    return this.items[this.selectedIndex] ?? null;
  }

  get value(): string {
    const it = this.selectedItem;
    if (it) return it.itemValue;
    return this.editable ? this.text : '';
  }
  set value(v: string) {
    const idx = this.items.findIndex((i) => i.itemValue === v);
    if (idx >= 0) this.selectedIndex = idx;
    else if (this.editable) {
      this.selectedIndex = -1;
      this.text = v;
    }
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'combobox');
    this.aria('aria-haspopup', 'listbox');
    this.aria('aria-expanded', 'false');
    this.popup = new Popup(this.$('.popup'), this.$('.presenter'));
    const field = this.$('.field');
    const editor = this.$<HTMLInputElement>('.editor');

    this.$<HTMLSlotElement>('slot[name="header"]').addEventListener('slotchange', () => this.syncHeader());
    this.$<HTMLSlotElement>('slot[name="description"]').addEventListener('slotchange', () => this.syncDescription());
    this.$<HTMLSlotElement>('.items slot').addEventListener('slotchange', () => this.syncItems());

    field.addEventListener('pointerdown', (ev) => {
      this.openedVia = (ev.pointerType as typeof this.openedVia) || 'mouse';
    });
    field.addEventListener('click', (ev) => {
      if (this.disabled) return;
      if (
        this.editable &&
        !(ev.composedPath() as Element[]).some((n) => n instanceof Element && n.classList?.contains('drop-btn'))
      ) {
        editor.focus();
        return;
      }
      if (this.open) this.close();
      else this.show(this.openedVia);
    });

    this.addEventListener('click', (ev) => {
      const item = (ev.target as Element).closest?.('win-combo-box-item') as WinComboBoxItem | null;
      if (!item || item.parentElement !== this || item.disabled) return;
      this.commit(this.items.indexOf(item));
      this.close();
    });

    this.addEventListener('keydown', (ev) => this.onKey(ev));

    editor.addEventListener('input', (ev) => this.onEditorInput(ev as InputEvent));
    editor.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') {
        ev.preventDefault();
        if (this.open) {
          const focused = this.items.find((i) => i.matches(':focus'));
          if (focused) {
            this.commit(this.items.indexOf(focused));
            this.close();
            return;
          }
          this.close();
        }
        this.submitText();
      }
    });
    editor.addEventListener('blur', () => {
      if (!this.open) this.submitText(true);
    });
  }

  protected override connected(): void {
    queueMicrotask(() => this.syncItems());
  }

  protected override disconnected(): void {
    if (this.popup?.isOpen) void this.popup.close();
  }

  override focus(opts?: FocusOptions): void {
    if (this.editable) this.$<HTMLInputElement>('.editor').focus(opts);
    else super.focus(opts);
  }

  private onKey(ev: KeyboardEvent): void {
    if (this.disabled) return;
    const items = this.items;
    const enabled = items.filter((i) => !i.disabled);
    const t = ev.target as Element;
    const inList = t.localName === 'win-combo-box-item';

    if (this.open) {
      const cur = inList ? enabled.indexOf(t as WinComboBoxItem) : enabled.findIndex((i) => i.selected);
      const focusAt = (i: number) => {
        const it = enabled[clamp(i, 0, enabled.length - 1)];
        it?.focus();
        it?.scrollIntoView({ block: 'nearest' });
      };
      switch (ev.key) {
        case 'ArrowDown':
          ev.preventDefault();
          if (ev.altKey) {
            this.close();
            return;
          }
          focusAt(cur < 0 ? 0 : cur + 1);
          return;
        case 'ArrowUp':
          ev.preventDefault();
          if (ev.altKey) {
            this.close();
            return;
          }
          focusAt(cur < 0 ? enabled.length - 1 : cur - 1);
          return;
        case 'Home':
          ev.preventDefault();
          focusAt(0);
          return;
        case 'End':
          ev.preventDefault();
          focusAt(enabled.length - 1);
          return;
        case 'PageDown':
        case 'PageUp': {
          ev.preventDefault();
          const step = Math.max(1, Math.floor((this.$('.items').clientHeight || 300) / 35) - 1);
          focusAt(Math.max(cur, 0) + (ev.key === 'PageDown' ? step : -step));
          return;
        }
        case 'Enter':
        case ' ':
          if (inList) {
            ev.preventDefault();
            this.commit(items.indexOf(t as WinComboBoxItem));
            this.close();
          }
          return;
        case 'F4':
          ev.preventDefault();
          this.close();
          return;
        case 'Tab':
          if (inList) this.commit(items.indexOf(t as WinComboBoxItem));
          this.close();
          return;
        default:
          if (inList && ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
            const idx = this.typeahead.match(
              ev.key,
              enabled.map((i) => i.label),
              cur,
            );
            if (idx >= 0) {
              ev.preventDefault();
              focusAt(idx);
            }
          }
          return;
      }
    }

    const fromEditor = ev.composedPath()[0] === this.$('.editor');
    if (this.editable && fromEditor) {
      if ((ev.key === 'ArrowDown' && ev.altKey) || ev.key === 'F4') {
        ev.preventDefault();
        this.show('keyboard');
      } else if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
        ev.preventDefault();
        this.step(ev.key === 'ArrowDown' ? 1 : -1);
      }
      return;
    }
    switch (ev.key) {
      case 'ArrowDown':
      case 'ArrowUp':
        ev.preventDefault();
        if (ev.altKey) this.show('keyboard');
        else this.step(ev.key === 'ArrowDown' ? 1 : -1);
        return;
      case 'Home':
      case 'End': {
        ev.preventDefault();
        const target = ev.key === 'Home' ? enabled[0] : enabled[enabled.length - 1];
        if (target) this.commit(items.indexOf(target));
        return;
      }
      case 'F4':
      case 'Enter':
        ev.preventDefault();
        this.show('keyboard');
        return;
      case ' ':
        ev.preventDefault();
        this.toggleAttribute('data-pressed', true);
        this.addEventListener(
          'keyup',
          (e) => {
            if (e.key !== ' ') return;
            this.removeAttribute('data-pressed');
            this.show('keyboard');
          },
          { once: true },
        );
        return;
      default:
        if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey && !ev.altKey) {
          const cur = enabled.findIndex((i) => i.selected);
          const idx = this.typeahead.match(
            ev.key,
            enabled.map((i) => i.label),
            cur,
          );
          if (idx >= 0) {
            ev.preventDefault();
            this.commit(items.indexOf(enabled[idx]!));
          }
        }
    }
  }

  private step(dir: 1 | -1): void {
    const items = this.items;
    let i = this.selectedIndex;
    for (let k = 0; k < items.length; k++) {
      i += dir;
      if (i < 0 || i >= items.length) return;
      if (!items[i]!.disabled) break;
    }
    if (i >= 0 && i < items.length && !items[i]!.disabled) this.commit(i);
  }

  private onEditorInput(ev: InputEvent): void {
    const editor = this.$<HTMLInputElement>('.editor');
    const typed = editor.value;
    const deleting = ev.inputType?.startsWith('delete');
    this.lastTyped = typed;
    if (!deleting && typed) {
      const match = this.items.find((i) => !i.disabled && i.label.toLowerCase().startsWith(typed.toLowerCase()));
      if (match && match.label.length > typed.length) {
        editor.value = typed + match.label.slice(typed.length);
        editor.setSelectionRange(typed.length, match.label.length, 'forward');
      }
    }
    this.text = editor.value;
  }

  private submitText(onBlur = false): void {
    if (!this.editable) return;
    const editor = this.$<HTMLInputElement>('.editor');
    const text = editor.value;
    const cur = this.selectedItem;
    if (cur && cur.label === text) return;
    const idx = this.items.findIndex((i) => i.label.toLowerCase() === text.toLowerCase());
    if (idx >= 0) {
      this.commit(idx);
      return;
    }
    if (onBlur && text === this.lastTyped && text === '') return;
    const handled = !this.emit('textsubmitted', { text }, { cancelable: true });
    if (handled) return;
    const old = this.selectedIndex;
    this.selectedIndex = -1;
    this.flushUpdates();
    this.text = text;
    this.internals.setFormValue(text);
    if (old !== -1 || text)
      this.emit('selectionchanged', { selectedIndex: -1, selectedItem: null, value: text, oldIndex: old });
  }

  show(via: 'mouse' | 'touch' | 'pen' | 'keyboard' = 'mouse'): void {
    if (this.disabled || this.popup.isOpen) return;
    this.openedVia = via;
    const items = this.items;
    for (const it of items) it.toggleAttribute('data-touch', via === 'touch');
    const sel = this.selectedItem;
    const field = this.$('.field');
    this.$('.presenter').style.minWidth = `${field.getBoundingClientRect().width}px`;
    this.style.setProperty('--max-dd', `${Math.max(48, this.maxDropDownHeight)}px`);
    this.popup.open({
      anchor: field,
      focus: 'none',
      offset: 4,
      position: (size, r) => this.placePopup(size, r),
      animateIn: (surface, side) => {
        if (sel) {
          const band = this.bandOf(sel);
          return splitOpen(surface, band.top, band.height);
        }
        return menuIn(surface, side, this.$('.items'));
      },
      animateOut: (s) => popupOut(s),
      onClosed: () => {
        this.open = false;
        this.aria('aria-expanded', 'false');
        this.emit('dropdownclosed');
      },
    });
    this.open = true;
    this.aria('aria-expanded', 'true');
    const target = sel && !sel.disabled ? sel : items.find((i) => !i.disabled);
    target?.focus({ preventScroll: true });
    this.emit('dropdownopened');
  }

  close(): void {
    if (!this.popup?.isOpen) {
      this.open = false;
      return;
    }
    void this.popup.close();
  }

  private bandOf(item: WinComboBoxItem): { top: number; height: number } {
    const p = this.$('.presenter').getBoundingClientRect();
    const r = item.getBoundingClientRect();
    return { top: r.top - p.top, height: r.height };
  }

  private placePopup(size: { width: number; height: number }, field: DOMRect): PositionResult {
    const { width: vw, height: vh } = viewportSize();
    const pad = 8;
    const sel = this.selectedItem;
    if (!sel) return computePosition(field, size, 'bottom-start', 4, pad);
    const list = this.$('.items');
    const itemTop = sel.offsetTop - list.offsetTop;
    if (list.scrollHeight > list.clientHeight) {
      list.scrollTop = clamp(
        itemTop - list.clientHeight / 2 + sel.offsetHeight / 2,
        0,
        list.scrollHeight - list.clientHeight,
      );
    }
    const presenter = this.$('.presenter').getBoundingClientRect();
    const r = sel.getBoundingClientRect();
    const offsetInPopup = r.top - presenter.top + r.height / 2;
    let y = field.top + field.height / 2 - offsetInPopup;
    y = clamp(y, pad, Math.max(pad, vh - pad - size.height));
    const rtl = getComputedStyle(this).direction === 'rtl';
    let x = rtl ? field.right - size.width : field.left;
    x = clamp(x, pad, Math.max(pad, vw - pad - size.width));
    return { x: Math.round(x), y: Math.round(y), side: 'bottom', maxHeight: vh - pad * 2, maxWidth: vw - pad * 2 };
  }

  private commit(index: number): void {
    const old = this.selectedIndex;
    if (index === old) {
      if (this.editable) this.syncFieldText();
      return;
    }
    this.selectedIndex = index;
    this.flushUpdates();
    const item = this.selectedItem;
    const detail = { selectedIndex: index, selectedItem: item, value: this.value, oldIndex: old };
    this.emit('selectionchanged', detail);
    this.emit('change', detail);
  }

  private syncItems(): void {
    const items = this.items;
    if (this.selectedIndex < 0) {
      const idx = items.findIndex((i) => i.hasAttribute('selected'));
      if (idx >= 0) {
        this.selectedIndex = idx;
        this.flushUpdates();
        this.defaultIndex = idx;
        return;
      }
    }
    this.applySelection();
  }

  private applySelection(): void {
    const items = this.items;
    items.forEach((it, i) => {
      const on = i === this.selectedIndex;
      if (it.hasAttribute('selected') !== on) it.toggleAttribute('selected', on);
    });
    this.renderContent();
    this.internals.setFormValue(this.value || null);
  }

  private renderContent(): void {
    const content = this.$('.content');
    const sel = this.selectedItem;
    content.replaceChildren();
    if (sel) {
      if (sel.querySelector('*')) {
        for (const n of Array.from(sel.childNodes)) content.append(n.cloneNode(true));
        if (sel.text) content.prepend(document.createTextNode(sel.text));
      } else content.textContent = sel.label;
    } else {
      const ph = document.createElement('span');
      ph.className = 'placeholder';
      ph.textContent = this.placeholder;
      content.append(ph);
    }
    this.aria('aria-valuetext', sel?.label ?? null);
    if (this.editable) this.syncFieldText();
  }

  private syncFieldText(): void {
    const editor = this.$<HTMLInputElement>('.editor');
    const sel = this.selectedItem;
    const t = sel ? sel.label : this.text;
    if (editor.value !== t) editor.value = t ?? '';
  }

  private syncHeader(): void {
    const slotted = this.$<HTMLSlotElement>('slot[name="header"]').assignedNodes().length > 0;
    this.$('.header-text').textContent = this.header;
    this.$('.header').hidden = !this.header && !slotted;
    if (this.header) this.aria('aria-label', this.header);
  }

  private syncDescription(): void {
    const slotted = this.$<HTMLSlotElement>('slot[name="description"]').assignedNodes().length > 0;
    this.$('.description-text').textContent = this.description;
    this.$('.description').hidden = !this.description && !slotted;
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('header')) this.syncHeader();
    if (changed.has('description')) this.syncDescription();
    if (changed.has('disabled') || changed.has('editable')) {
      const editor = this.$<HTMLInputElement>('.editor');
      editor.disabled = this.disabled;
      editor.tabIndex = this.editable && !this.disabled ? 0 : -1;
      this.setFocusable(!this.disabled && !this.editable);
      this.aria('aria-disabled', this.disabled ? 'true' : null);
      if (this.disabled) this.close();
    }
    if (changed.has('placeholder')) {
      this.$<HTMLInputElement>('.editor').placeholder = this.placeholder;
      if (!this.selectedItem) this.renderContent();
    }
    if (changed.has('selectedIndex') && !first) this.applySelection();
    if (changed.has('text') && this.editable && !this.selectedItem) this.syncFieldText();
    if (changed.has('open') && !first) {
      if (this.open && !this.popup.isOpen) this.show('keyboard');
      else if (!this.open && this.popup.isOpen) this.close();
    }
  }

  formResetCallback(): void {
    this.selectedIndex = this.defaultIndex;
  }

  formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-combo-box': WinComboBox;
    'win-combo-box-item': WinComboBoxItem;
  }
}
