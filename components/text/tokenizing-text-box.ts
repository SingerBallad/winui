import { WinElement, escapeHtml, uid, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { Popup } from '../../base/popup.ts';
import { durations, itemAdded, itemRemoved, menuIn, settled } from '../../motion/animate.ts';
import { bareInputCss, suggestionListCss, textFieldCss } from './shared.ts';

export interface TokenSuggestion {
  text: string;
  description?: string;
  icon?: string;
}

const tokenCss = css`
:host { display: inline-block; vertical-align: top; min-width: 160px; width: 320px; max-width: 100%; }
.header { display: block; margin-bottom: 8px; font: var(--w-type-body); color: var(--w-text-fill-color-primary); }
.header:empty { display: none; }
${textFieldCss('.field')}
.field {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 4px;
  padding: 3px 6px 3px 3px;
  cursor: text;
  position: relative;
}
.token {
  display: inline-flex;
  align-items: center;
  gap: 2px;
  box-sizing: border-box;
  height: 24px;
  max-width: 100%;
  padding: 0 1px 0 8px;
  border: 1px solid;
  border-color: var(--w-control-elevation-border);
  border-radius: var(--w-corner-radius-control);
  background-color: var(--w-control-fill-color-default);
  background-clip: padding-box;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  white-space: nowrap;
  cursor: default;
  user-select: none;
  outline: none;
  transition: background-color var(--w-duration-faster) linear;
}
.token:hover { background-color: var(--w-control-fill-color-secondary); }
.token .t-text { overflow: hidden; text-overflow: ellipsis; }
.token[aria-selected="true"] {
  background-color: var(--w-accent-fill-color-default);
  border-color: var(--w-accent-control-elevation-border);
  color: var(--w-text-on-accent-fill-color-primary);
}
${focusRing('.token:focus-visible', 2)}
.remove {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  color: inherit;
  opacity: 0.8;
}
.remove:hover { background: var(--w-subtle-fill-color-secondary); opacity: 1; }
.remove:active { background: var(--w-subtle-fill-color-tertiary); }
.token[aria-selected="true"] .remove:hover { background: rgba(255, 255, 255, 0.16); }
.input {
  ${bareInputCss}
  flex: 1 1 60px;
  height: 24px;
  padding: 0 0 1px 5px;
}
.input::placeholder { color: var(--w-text-fill-color-secondary); }
:host([data-has-tokens]) .input::placeholder { color: transparent; }
:host([data-full]) .input { display: none; }
:host([disabled]) { pointer-events: none; }
:host([disabled]) .token { background-color: var(--w-control-fill-color-disabled); color: var(--w-text-fill-color-disabled); border-color: var(--w-control-stroke-color-default); }
:host([disabled]) .remove { display: none; }
`;

export class WinTokenizingTextBox extends WinElement {
  static override styles = [tokenCss, suggestionListCss];
  static override template = `<label class="header" part="header"></label>
<div class="field" part="field">
  <span class="tokens" role="listbox" aria-orientation="horizontal" style="display:contents"></span>
  <input class="input" part="input" role="combobox" aria-autocomplete="list" aria-expanded="false" autocomplete="off" spellcheck="false">
</div>
<div class="suggestions" part="suggestions"><div class="suggest-surface" part="suggestion-list" role="listbox"></div></div>`;
  static override formAssociated = true;
  static override props: PropDefs = {
    header: { type: String },
    placeholder: { type: String },
    delimiters: { type: String, default: ',;' },
    maxTokens: { type: Number, attribute: 'max-tokens', default: 0 },
    maxSuggestions: { type: Number, attribute: 'max-suggestions', default: 8 },
    allowDuplicates: { type: Boolean, attribute: 'allow-duplicates' },
    restrictToSuggestions: { type: Boolean, attribute: 'restrict-to-suggestions' },
    disabled: { type: Boolean },
    name: { type: String },
    suggestions: { type: Array, attribute: 'suggestions' },
    tokens: { type: Array, attribute: 'tokens' },
  };
  declare header: string;
  declare placeholder: string;
  declare delimiters: string;
  declare maxTokens: number;
  declare maxSuggestions: number;
  declare allowDuplicates: boolean;
  declare restrictToSuggestions: boolean;
  declare disabled: boolean;
  declare name: string;
  declare suggestions: (string | TokenSuggestion)[] | undefined;
  declare tokens: string[] | undefined;

  private input!: HTMLInputElement;
  private field!: HTMLElement;
  private popup!: Popup;
  private list!: HTMLElement;
  private highlighted = -1;
  private current: TokenSuggestion[] = [];
  private selectedToken = -1;
  private lastAdded: string | null = null;

  static {
    this.define('win-tokenizing-text-box');
  }

  get text(): string {
    return this.input?.value ?? '';
  }
  set text(v: string) {
    if (this.input) this.input.value = v;
  }

  get tokenList(): string[] {
    return this.tokens ? [...this.tokens] : [];
  }

  protected override firstConnected(): void {
    this.input = this.$<HTMLInputElement>('.input');
    this.field = this.$('.field');
    this.list = this.$('.suggest-surface');
    this.popup = new Popup(this.$('.suggestions'), this.list);
    const listId = uid('tok-list');
    this.list.id = listId;
    this.input.setAttribute('aria-controls', listId);

    this.field.addEventListener('pointerdown', (ev) => {
      if (ev.target === this.field) {
        ev.preventDefault();
        this.input.focus();
      }
    });
    this.input.addEventListener('input', () => this.onInput());
    this.input.addEventListener('keydown', (ev) => this.onInputKey(ev));
    this.input.addEventListener('paste', (ev) => this.onPaste(ev));
    this.input.addEventListener('focus', () => this.selectToken(-1));
    this.input.addEventListener('blur', () => {
      setTimeout(() => {
        if (!this.matches(':focus-within') && !this.popup.isOpen) this.commitText();
      }, 0);
    });
    this.$('.tokens').addEventListener('click', (ev) => this.onTokenClick(ev));
    this.$('.tokens').addEventListener('keydown', (ev) => this.onTokenKey(ev));
    this.list.addEventListener('pointerdown', (ev) => ev.preventDefault());
    this.list.addEventListener('click', (ev) => {
      const row = (ev.target as Element).closest<HTMLElement>('.suggest-item');
      if (!row) return;
      const s = this.current[Number(row.dataset.i)];
      if (s) this.addToken(s.text, true);
    });
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('header')) this.$('.header').textContent = this.header ?? '';
    if (changed.has('placeholder')) this.input.placeholder = this.placeholder ?? '';
    if (changed.has('tokens')) this.renderTokens();
    if (changed.has('disabled')) {
      this.input.disabled = this.disabled;
      this.aria('aria-disabled', this.disabled ? 'true' : null);
    }
    if (changed.has('header') || changed.has('placeholder')) {
      this.input.setAttribute('aria-label', this.header || this.placeholder || '');
    }
  }

  addToken(raw: string, fromSuggestion = false): boolean {
    let text = raw.trim();
    if (!text) return false;
    const list = this.tokenList;
    if (this.maxTokens > 0 && list.length >= this.maxTokens) return false;
    if (!this.allowDuplicates && list.some((t) => t.toLowerCase() === text.toLowerCase())) {
      this.input.value = '';
      this.closeSuggestions();
      return false;
    }
    if (this.restrictToSuggestions && !fromSuggestion) {
      const match = this.normalizedSuggestions().find((s) => s.text.toLowerCase() === text.toLowerCase());
      if (!match) return false;
      text = match.text;
    }
    const detail = { text, cancel: false };
    if (!this.emit('tokenitemadding', detail, { cancelable: true }) || detail.cancel) return false;
    this.lastAdded = detail.text;
    this.tokens = [...list, detail.text];
    this.input.value = '';
    this.closeSuggestions();
    this.emit('tokenitemadded', { text: detail.text, tokens: this.tokenList });
    this.emit('change', { tokens: this.tokenList });
    return true;
  }

  removeToken(index: number): void {
    const list = this.tokenList;
    const text = list[index];
    if (text === undefined) return;
    if (!this.emit('tokenitemremoving', { text, index }, { cancelable: true })) return;
    const chip = this.$$('.token')[index];
    const commit = () => {
      list.splice(index, 1);
      this.tokens = list;
      this.emit('tokenitemremoved', { text, index, tokens: this.tokenList });
      this.emit('change', { tokens: this.tokenList });
    };
    if (chip) {
      void settled(itemRemoved(chip)).then(commit);
    } else commit();
  }

  clear(): void {
    this.tokens = [];
    this.input.value = '';
    this.emit('change', { tokens: [] });
  }

  private renderTokens(): void {
    const host = this.$('.tokens');
    const list = this.tokenList;
    host.innerHTML = list
      .map(
        (t, i) =>
          `<span class="token" part="token" role="option" tabindex="-1" aria-selected="false" data-i="${i}"><span class="t-text">${escapeHtml(t)}</span><span class="remove" part="token-remove" aria-hidden="true" data-remove="${i}">${glyph('cancel', 10)}</span></span>`,
      )
      .join('');
    if (this.lastAdded !== null) {
      const last = host.lastElementChild;
      if (last) itemAdded(last);
      this.lastAdded = null;
    }
    this.toggleAttr('data-has-tokens', list.length > 0);
    this.toggleAttr('data-full', this.maxTokens > 0 && list.length >= this.maxTokens);
    this.internals.setFormValue(list.length ? list.join(',') : null);
    this.selectedToken = -1;
  }

  private selectToken(i: number): void {
    const chips = this.$$<HTMLElement>('.token');
    this.selectedToken = i;
    chips.forEach((c, k) => {
      c.setAttribute('aria-selected', String(k === i));
    });
    if (i >= 0) chips[i]?.focus();
  }

  private onTokenClick(ev: Event): void {
    const t = ev.target as Element;
    const rm = t.closest<HTMLElement>('[data-remove]');
    if (rm) {
      ev.stopPropagation();
      this.removeToken(Number(rm.dataset.remove));
      this.input.focus();
      return;
    }
    const chip = t.closest<HTMLElement>('.token');
    if (chip) this.selectToken(Number(chip.dataset.i));
  }

  private onTokenKey(ev: KeyboardEvent): void {
    const n = this.tokenList.length;
    const i = this.selectedToken;
    if (i < 0) return;
    switch (ev.key) {
      case 'ArrowLeft':
        ev.preventDefault();
        this.selectToken(Math.max(0, i - 1));
        break;
      case 'ArrowRight':
        ev.preventDefault();
        if (i + 1 < n) this.selectToken(i + 1);
        else {
          this.selectToken(-1);
          this.input.focus();
        }
        break;
      case 'Backspace':
      case 'Delete':
        ev.preventDefault();
        this.removeToken(i);
        setTimeout(() => {
          const left = this.tokenList.length;
          if (left === 0) this.input.focus();
          else this.selectToken(Math.min(left - 1, ev.key === 'Backspace' ? Math.max(0, i - 1) : i));
        }, durations.fast + 30);
        break;
      case 'Escape':
      case 'End':
        this.selectToken(-1);
        this.input.focus();
        break;
      default:
        if (ev.key.length === 1 && !ev.ctrlKey && !ev.metaKey) {
          this.selectToken(-1);
          this.input.focus();
        }
    }
  }

  private onInput(): void {
    const v = this.input.value;
    const delims = this.delimiters ?? '';
    const last = v.slice(-1);
    if (last && delims.includes(last)) {
      this.addToken(v.slice(0, -1));
      return;
    }
    this.emit('textchanged', { text: v });
    this.updateSuggestions();
  }

  private onPaste(ev: ClipboardEvent): void {
    const text = ev.clipboardData?.getData('text') ?? '';
    const delims = `${this.delimiters ?? ''}\n\r\t`;
    if (![...delims].some((d) => text.includes(d))) return;
    ev.preventDefault();
    const re = new RegExp(`[${delims.replace(/[\]\\^-]/g, '\\$&')}]+`);
    for (const part of (this.input.value + text).split(re)) this.addToken(part);
  }

  private commitText(): void {
    if (this.input.value.trim() && !this.restrictToSuggestions) this.addToken(this.input.value);
  }

  private onInputKey(ev: KeyboardEvent): void {
    const open = this.popup.isOpen;
    switch (ev.key) {
      case 'ArrowDown':
        if (open) {
          ev.preventDefault();
          this.highlight(this.highlighted + 1);
        } else if (this.input.value || this.normalizedSuggestions().length) {
          this.updateSuggestions(true);
        }
        return;
      case 'ArrowUp':
        if (open) {
          ev.preventDefault();
          this.highlight(this.highlighted - 1);
        }
        return;
      case 'Enter':
        ev.preventDefault();
        if (open && this.highlighted >= 0) {
          const s = this.current[this.highlighted];
          if (s) this.addToken(s.text, true);
        } else this.commitText();
        return;
      case 'Tab':
        if (open && this.highlighted >= 0) {
          ev.preventDefault();
          const s = this.current[this.highlighted];
          if (s) this.addToken(s.text, true);
        }
        return;
      case 'Escape':
        if (open) {
          ev.preventDefault();
          ev.stopPropagation();
          this.closeSuggestions();
        }
        return;
      case 'Backspace':
      case 'ArrowLeft':
        if (this.input.selectionStart === 0 && this.input.selectionEnd === 0 && this.tokenList.length) {
          ev.preventDefault();
          this.closeSuggestions();
          this.selectToken(this.tokenList.length - 1);
        }
        return;
    }
  }

  private normalizedSuggestions(): TokenSuggestion[] {
    return (this.suggestions ?? []).map((s) => (typeof s === 'string' ? { text: s } : s));
  }

  private updateSuggestions(force = false): void {
    const q = this.input.value.trim().toLowerCase();
    const taken = new Set(this.tokenList.map((t) => t.toLowerCase()));
    const all = this.normalizedSuggestions().filter((s) => this.allowDuplicates || !taken.has(s.text.toLowerCase()));
    this.current = (q ? all.filter((s) => s.text.toLowerCase().includes(q)) : force ? all : []).slice(
      0,
      Math.max(1, this.maxSuggestions),
    );
    if (!this.current.length) {
      this.closeSuggestions();
      return;
    }
    this.highlighted = -1;
    this.list.innerHTML = this.current
      .map((s, i) => {
        const text = escapeHtml(s.text);
        const marked = q ? text.replace(new RegExp(escapeRe(escapeHtml(q)), 'i'), (m) => `<b>${m}</b>`) : text;
        return `<div class="suggest-item" role="option" id="${this.list.id}-${i}" data-i="${i}" aria-selected="false"><span style="overflow:hidden;text-overflow:ellipsis">${marked}${s.description ? ` <span class="s-sub">${escapeHtml(s.description)}</span>` : ''}</span></div>`;
      })
      .join('');
    if (!this.popup.isOpen) {
      this.popup.open({
        anchor: this.field,
        placement: 'bottom-start',
        offset: 2,
        minWidthFromAnchor: true,
        focus: 'none',
        restoreFocus: false,
        passThrough: [this],
        animateIn: (s, side) => menuIn(s, side),
        onClosed: () => this.input.setAttribute('aria-expanded', 'false'),
      });
      this.input.setAttribute('aria-expanded', 'true');
    } else this.popup.reposition();
  }

  private highlight(i: number): void {
    const n = this.current.length;
    if (!n) return;
    this.highlighted = ((i % n) + n) % n;
    const rows = this.list.querySelectorAll<HTMLElement>('.suggest-item');
    rows.forEach((r, k) => {
      r.setAttribute('aria-selected', String(k === this.highlighted));
    });
    const row = rows[this.highlighted];
    if (row) {
      this.input.setAttribute('aria-activedescendant', row.id);
      row.scrollIntoView({ block: 'nearest' });
    }
  }

  private closeSuggestions(): void {
    this.highlighted = -1;
    this.input.removeAttribute('aria-activedescendant');
    if (this.popup?.isOpen) void this.popup.close('programmatic');
  }

  formResetCallback(): void {
    this.tokens = [];
  }
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

declare global {
  interface HTMLElementTagNameMap {
    'win-tokenizing-text-box': WinTokenizingTextBox;
  }
}
