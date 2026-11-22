import { uid, escapeHtml, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css } from '../../base/css.ts';
import { glyph, iconHtml } from '../../base/icons.ts';
import { Popup, popupResetCss, viewportSize, type PositionResult } from '../../base/popup.ts';
import { menuIn, popupOut } from '../../motion/animate.ts';
import { scrollIntoViewWithin } from '../../base/dom.ts';
import { FieldElement, fieldCss, fieldTemplate, keepFocus } from './field.ts';

export type TextChangeReason = 'user-input' | 'programmatic-change' | 'suggestion-chosen';

const asbCss = css`
.input { padding-right: 6px; }
.delete { width: 32px; margin: 3px 0; }
:host(:focus-within[data-has-text]:not([read-only])) .delete { display: inline-flex; }
.query {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  width: 30px;
  margin: 4px 4px 4px 3px;
  padding: 0;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: var(--w-text-fill-color-secondary);
  cursor: default;
  outline: none;
}
.query[hidden] { display: none; }
.query:hover { background: var(--w-subtle-fill-color-secondary); }
.query:active { background: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-tertiary); }
.query .qi { display: inline-flex; transition: scale var(--w-duration-fast) cubic-bezier(0.2, 1.8, 0.4, 1); }
.query:active .qi { scale: 0.86; transition-duration: var(--w-duration-faster); }
:host([disabled]) .query { color: var(--w-text-fill-color-disabled); background: transparent; }
.query .w-icon { font-size: 12px; }

:host([data-open="bottom"]) .field { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
:host([data-open="top"]) .field { border-top-left-radius: 0; border-top-right-radius: 0; }

${popupResetCss('.popup')}
.popup { width: var(--asb-width, 240px); }
.surface {
  box-sizing: border-box;
  padding: 2px 0;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-flyout);
  color: var(--w-text-fill-color-primary);
  overflow: hidden;
}
.popup[data-side="bottom"] .surface { border-top-left-radius: 0; border-top-right-radius: 0; }
.popup[data-side="top"] .surface { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
.list {
  max-height: min(var(--asb-max-height, 374px), var(--w-popup-max-height, 374px));
  overflow-x: hidden;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
  scrollbar-color: var(--w-control-strong-fill-color-default) transparent;
}
.item {
  position: relative;
  isolation: isolate;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: 40px;
  padding: 0 12px 0 16px;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
}
.item > .text { flex: 1; min-width: 0; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.item::before {
  content: '';
  position: absolute;
  inset: 2px 3px;
  z-index: -1;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
}
.item:hover::before { background: var(--w-subtle-fill-color-secondary); }
.item:active::before { background: var(--w-subtle-fill-color-tertiary); }
.item[aria-selected="true"]::before { background: var(--w-subtle-fill-color-secondary); }
.item[aria-selected="true"]:hover::before { background: var(--w-subtle-fill-color-tertiary); }
.item::after {
  content: '';
  position: absolute;
  left: 3px;
  top: 50%;
  width: 3px;
  height: 16px;
  margin-top: -8px;
  border-radius: 1.5px;
  background: var(--w-accent-fill-color-default);
  transform: scaleY(0);
  opacity: 0;
  transition: transform var(--w-duration-fast) var(--w-ease-decelerate), opacity var(--w-duration-faster) linear;
}
.item[aria-selected="true"]::after { transform: scaleY(1); opacity: 1; }
.item .w-icon, .item svg { flex: none; margin-right: 12px; }
`;

export class WinAutoSuggestBox extends FieldElement {
  static override styles = [fieldCss, asbCss];
  static override template = fieldTemplate(
    `<input class="input" part="input" type="text" role="combobox" aria-autocomplete="list" aria-expanded="false" autocomplete="off" spellcheck="false">` +
      `<button class="btn delete" part="delete-button" type="button" tabindex="-1" aria-label="清除">${glyph('clear', 12)}</button>` +
      `<button class="query" part="query-button" type="button" tabindex="-1" aria-label="搜索"><span class="qi"></span></button>`,
    `<div class="popup" part="suggestions-popup"><div class="surface" part="suggestions-container"><div class="list" part="suggestions" role="listbox"></div></div></div>`,
  );
  static override props: PropDefs = {
    text: { type: String },
    queryIcon: { type: String, attribute: 'query-icon', default: 'Find' },
    displayMemberPath: { type: String, attribute: 'display-member-path' },
    textMemberPath: { type: String, attribute: 'text-member-path' },
    updateTextOnSelect: { type: Boolean, attribute: 'update-text-on-select', default: true },
    maxSuggestionListHeight: { type: Number, attribute: 'max-suggestion-list-height', default: 374 },
    isSuggestionListOpen: { type: Boolean, attribute: 'is-suggestion-list-open' },
  };
  declare text: string;
  declare queryIcon: string;
  declare displayMemberPath: string;
  declare textMemberPath: string;
  declare updateTextOnSelect: boolean;
  declare maxSuggestionListHeight: number;
  declare isSuggestionListOpen: boolean;

  itemTemplate: ((item: unknown, index: number) => string | Node) | null = null;

  static {
    this.define('win-auto-suggest-box');
  }

  private input!: HTMLInputElement;
  private list!: HTMLElement;
  private popup!: Popup;
  private _items: unknown[] = [];
  private selected = -1;
  private userText = '';
  private listId = uid('asb-list');
  private internalTextChange: TextChangeReason | null = null;

  protected get editor(): HTMLElement {
    return this.input;
  }

  get value(): string {
    return this.text;
  }
  set value(v: string) {
    this.text = v;
  }

  get items(): unknown[] {
    return this._items;
  }
  set items(v: unknown[] | null | undefined) {
    this._items = Array.isArray(v) ? v : [];
    this.selected = -1;
    this.renderList();
    if (this._items.length && this.matches(':focus-within') && this.userHasTyped) this.isSuggestionListOpen = true;
    else if (!this._items.length) this.isSuggestionListOpen = false;
  }

  private userHasTyped = false;

  protected override firstConnected(): void {
    this.input = this.$<HTMLInputElement>('.input');
    this.list = this.$('.list');
    this.list.id = this.listId;
    this.input.setAttribute('aria-controls', this.listId);
    super.firstConnected();
    const el = this.input;
    const opts = Array.from(this.querySelectorAll(':scope > option')).map((o) => o.textContent?.trim() ?? '');
    if (opts.length && !this._items.length) this._items = opts;

    el.addEventListener('input', () => {
      this.userText = el.value;
      this.userHasTyped = true;
      this.selected = -1;
      this.setText(el.value, 'user-input');
    });
    el.addEventListener('keydown', (ev) => this.onKey(ev));
    el.addEventListener('blur', () => {
      this.userHasTyped = false;
    });
    el.addEventListener('change', () => this.emit('change', { value: this.text }));

    const del = this.$('.delete');
    keepFocus(del);
    del.addEventListener('click', () => {
      el.value = '';
      el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'deleteContentBackward' }));
      el.focus();
    });
    const q = this.$('.query');
    keepFocus(q);
    q.addEventListener('click', () => this.submit(null));

    this.list.addEventListener('pointerdown', (ev) => ev.preventDefault());
    this.list.addEventListener('click', (ev) => {
      const row = (ev.target as Element).closest<HTMLElement>('.item');
      if (!row) return;
      const i = Number(row.dataset.index);
      const item = this._items[i];
      this.selected = i;
      this.syncSelection();
      this.choose(item, true);
      this.submit(item);
    });

    this.popup = new Popup(this.$('.popup'), this.$('.surface'));
  }

  private setText(t: string, reason: TextChangeReason): void {
    this.internalTextChange = reason;
    this.text = t;
    this.flushUpdates();
    this.internalTextChange = null;
  }

  displayText(item: unknown): string {
    if (item === null || item === undefined) return '';
    if (typeof item === 'object' && this.displayMemberPath) {
      return String((item as Record<string, unknown>)[this.displayMemberPath] ?? '');
    }
    return String(item);
  }

  private itemText(item: unknown): string {
    if (item && typeof item === 'object' && this.textMemberPath) {
      return String((item as Record<string, unknown>)[this.textMemberPath] ?? '');
    }
    return this.displayText(item);
  }

  private choose(item: unknown, updateText: boolean): void {
    if (updateText && this.updateTextOnSelect) {
      const t = this.itemText(item);
      this.input.value = t;
      this.setText(t, 'suggestion-chosen');
    }
    this.emit('suggestionchosen', { selectedItem: item });
  }

  private submit(chosen: unknown): void {
    this.isSuggestionListOpen = false;
    this.emit('querysubmitted', { queryText: this.text ?? '', chosenSuggestion: chosen ?? null });
  }

  private onKey(ev: KeyboardEvent): void {
    if (this.disabled) return;
    const n = this._items.length;
    switch (ev.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        if (!n) return;
        ev.preventDefault();
        if (!this.isSuggestionListOpen) {
          this.isSuggestionListOpen = true;
          return;
        }
        let next = this.selected + (ev.key === 'ArrowDown' ? 1 : -1);
        if (next >= n) next = -1;
        if (next < -1) next = n - 1;
        this.selected = next;
        this.syncSelection();
        if (next === -1) {
          this.input.value = this.userText;
          this.setText(this.userText, 'suggestion-chosen');
        } else {
          this.choose(this._items[next], true);
        }
        return;
      }
      case 'Enter': {
        ev.preventDefault();
        const chosen = this.isSuggestionListOpen && this.selected >= 0 ? this._items[this.selected] : null;
        this.submit(chosen);
        if (!chosen) this.submitImplicitly(ev);
        return;
      }
      case 'Escape':
        return;
      case 'Tab':
        this.isSuggestionListOpen = false;
        return;
    }
  }

  private renderList(): void {
    if (!this.list) return;
    this.list.textContent = '';
    this._items.forEach((item, i) => {
      const row = document.createElement('div');
      row.className = 'item';
      row.setAttribute('role', 'option');
      row.setAttribute('part', 'suggestion');
      row.id = `${this.listId}-${i}`;
      row.dataset.index = String(i);
      row.setAttribute('aria-selected', 'false');
      const custom = this.itemTemplate?.(item, i);
      if (custom instanceof Node) row.append(custom);
      else if (typeof custom === 'string') row.innerHTML = custom;
      else {
        const icon = item && typeof item === 'object' ? (item as Record<string, unknown>).icon : null;
        row.innerHTML = `${icon ? iconHtml(String(icon), 16) : ''}<span class="text">${escapeHtml(this.displayText(item))}</span>`;
      }
      this.list.append(row);
    });
    if (this.popup?.isOpen) this.popup.reposition();
  }

  private syncSelection(): void {
    const rows = this.list.children;
    for (let i = 0; i < rows.length; i++) rows[i]!.setAttribute('aria-selected', String(i === this.selected));
    const cur = this.selected >= 0 ? (rows[this.selected] as HTMLElement | undefined) : undefined;
    if (cur) {
      this.input.setAttribute('aria-activedescendant', cur.id);
      scrollIntoViewWithin(this.list, cur, 'y');
    } else this.input.removeAttribute('aria-activedescendant');
  }

  private openList(): void {
    if (this.popup.isOpen || !this._items.length || this.disabled) return;
    const field = this.$('.field');
    this.style.setProperty('--asb-width', `${field.getBoundingClientRect().width}px`);
    this.popup.open({
      anchor: field,
      focus: 'none',
      restoreFocus: false,
      passThrough: [this],
      position: (size, r) => this.positionList(size, r),
      animateIn: (s, side) => menuIn(s, side === 'top' ? 'top' : 'bottom', this.list),
      animateOut: (s) => popupOut(s),
      onDismiss: (reason) => {
        if (reason === 'escape' && this.selected >= 0) {
          this.input.value = this.userText;
          this.setText(this.userText, 'suggestion-chosen');
        }
        this.isSuggestionListOpen = false;
        return false;
      },
    });
    this.toggleAttr('data-open', true, this.popup.side);
    this.input.setAttribute('aria-expanded', 'true');
  }

  private closeList(): void {
    this.removeAttribute('data-open');
    this.input?.setAttribute('aria-expanded', 'false');
    this.selected = -1;
    if (this.list) this.syncSelection();
    if (this.popup?.isOpen) void this.popup.close();
  }

  private positionList(size: { width: number; height: number }, r: DOMRect): PositionResult {
    const { height: vh } = viewportSize();
    const below = vh - r.bottom - 8;
    const above = r.top - 8;
    const side: 'top' | 'bottom' = size.height <= below || below >= above ? 'bottom' : 'top';
    const y = side === 'bottom' ? r.bottom : r.top - Math.min(size.height, above);
    this.toggleAttr('data-open', true, side);
    return {
      x: Math.round(r.left),
      y: Math.round(y),
      side,
      maxHeight: Math.max(48, (side === 'bottom' ? below : above) - 4),
      maxWidth: r.width,
    };
  }

  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    const el = this.input;
    if (first || changed.has('placeholder')) {
      el.placeholder = this.placeholder ?? '';
      this.syncA11y();
    }
    if (first || changed.has('readOnly')) el.readOnly = this.readOnly;
    if (first || changed.has('queryIcon')) {
      const q = this.$('.query');
      const spec = (this.queryIcon ?? '').trim();
      q.hidden = !spec || spec.toLowerCase() === 'none';
      const isFind = /^(find|search|e721|e11a)$/i.test(spec);
      this.$('.qi').innerHTML = isFind ? glyph('search', 12) : iconHtml(spec, 12);
    }
    if (changed.has('maxSuggestionListHeight')) {
      this.style.setProperty('--asb-max-height', `${this.maxSuggestionListHeight}px`);
    }
    if (changed.has('displayMemberPath')) this.renderList();
    if (changed.has('text')) {
      const t = this.text ?? '';
      if (el.value !== t) el.value = t;
      this.toggleAttr('data-has-text', t.length > 0);
      this.internals.setFormValue(t);
      if (!first) {
        const reason = this.internalTextChange ?? 'programmatic-change';
        if (reason === 'programmatic-change') this.userText = t;
        this.emit('textchanged', { text: t, reason });
      }
    }
    if (changed.has('isSuggestionListOpen')) {
      if (this.isSuggestionListOpen) this.openList();
      else this.closeList();
    }
    if (first) this.renderList();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-auto-suggest-box': WinAutoSuggestBox;
  }
}
