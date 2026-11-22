import { WinElement, escapeHtml, uid, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { iconHtml } from '../../base/icons.ts';
import { Popup } from '../../base/popup.ts';
import { animate, durations, easings, menuIn } from '../../motion/animate.ts';
import { suggestionListCss, textFieldCss } from './shared.ts';

export interface RichSuggestion {
  text: string;
  prefix?: string;
  description?: string;
  icon?: string;
  data?: unknown;
}

export interface RichToken {
  id: string;
  prefix: string;
  text: string;
  data?: unknown;
}

interface ActiveQuery {
  node: Text;
  start: number;
  end: number;
  prefix: string;
  query: string;
}

const rsbCss = css`
:host { display: inline-block; vertical-align: top; width: 360px; max-width: 100%; }
.header { display: block; margin-bottom: 8px; font: var(--w-type-body); }
.header:empty { display: none; }
${textFieldCss('.field')}
.field { position: relative; display: block; padding: 5px 6px 6px 10px; cursor: text; }
::slotted([slot="editor"]) {
  display: block;
  min-height: 19px;
  max-height: var(--max-editor-height, 160px);
  overflow-y: auto;
  outline: none;
  font: var(--w-type-body);
  color: var(--w-text-fill-color-primary);
  white-space: pre-wrap;
  overflow-wrap: anywhere;
  caret-color: var(--w-text-fill-color-primary);
  scrollbar-width: thin;
}
.placeholder {
  position: absolute;
  left: 11px;
  top: 6px;
  color: var(--w-text-fill-color-secondary);
  pointer-events: none;
  font: var(--w-type-body);
}
:host([data-has-text]) .placeholder { display: none; }
.desc { display: block; margin-top: 4px; font: var(--w-type-caption); color: var(--w-text-fill-color-secondary); }
.desc:empty { display: none; }
:host([disabled]) { pointer-events: none; }
`;

const TOKEN_STYLE =
  'display:inline-block;padding:0 3px;margin:0 1px;border-radius:4px;' +
  'background:color-mix(in srgb, var(--w-accent-fill-color-default) 16%, transparent);' +
  'color:var(--w-accent-text-fill-color-primary);font-weight:600;line-height:19px;white-space:nowrap;cursor:default;user-select:all';

export class WinRichSuggestBox extends WinElement {
  static override styles = [rsbCss, suggestionListCss];
  static override template = `<label class="header" part="header"></label>
<div class="field" part="field"><span class="placeholder" part="placeholder"></span><slot name="editor"></slot></div>
<span class="desc" part="description"></span>
<div class="suggestions" part="suggestions"><div class="suggest-surface" part="suggestion-list" role="listbox"></div></div>`;
  static override formAssociated = true;
  static override props: PropDefs = {
    header: { type: String },
    placeholder: { type: String },
    description: { type: String },
    prefixes: { type: String, default: '@' },
    maxSuggestions: { type: Number, attribute: 'max-suggestions', default: 8 },
    disabled: { type: Boolean },
    name: { type: String },
    suggestions: { type: Array, attribute: 'suggestions' },
  };
  declare header: string;
  declare placeholder: string;
  declare description: string;
  declare prefixes: string;
  declare maxSuggestions: number;
  declare disabled: boolean;
  declare name: string;
  declare suggestions: (string | RichSuggestion)[] | undefined;

  private editor!: HTMLDivElement;
  private popup!: Popup;
  private list!: HTMLElement;
  private active: ActiveQuery | null = null;
  private current: RichSuggestion[] = [];
  private highlighted = 0;
  private tokenData = new Map<string, RichToken>();

  static {
    this.define('win-rich-suggest-box');
  }

  protected override firstConnected(): void {
    this.list = this.$('.suggest-surface');
    this.list.id = uid('rsb-list');
    this.popup = new Popup(this.$('.suggestions'), this.list);
    const editor = document.createElement('div');
    editor.slot = 'editor';
    editor.contentEditable = this.disabled ? 'false' : 'true';
    editor.setAttribute('role', 'textbox');
    editor.setAttribute('aria-multiline', 'true');
    editor.setAttribute('aria-autocomplete', 'list');
    editor.setAttribute('aria-controls', this.list.id);
    editor.spellcheck = true;
    const initial = Array.from(this.childNodes).filter((n) => !(n instanceof HTMLElement && n.slot));
    for (const n of initial) editor.append(n);
    this.append(editor);
    this.editor = editor;

    this.$('.field').addEventListener('pointerdown', (ev) => {
      if (ev.target === this.$('.field')) {
        ev.preventDefault();
        editor.focus();
        placeCaretAtEnd(editor);
      }
    });
    editor.addEventListener('input', () => this.onInput());
    editor.addEventListener('keydown', (ev) => this.onKey(ev));
    editor.addEventListener('blur', () => setTimeout(() => this.closeSuggestions(), 120));
    editor.addEventListener('paste', (ev) => {
      ev.preventDefault();
      const text = ev.clipboardData?.getData('text/plain') ?? '';
      document.execCommand('insertText', false, text);
    });
    this.list.addEventListener('pointerdown', (ev) => ev.preventDefault());
    this.list.addEventListener('click', (ev) => {
      const row = (ev.target as Element).closest<HTMLElement>('.suggest-item');
      if (row) this.choose(Number(row.dataset.i));
    });
    this.syncHasText();
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('header')) this.$('.header').textContent = this.header ?? '';
    if (changed.has('placeholder')) this.$('.placeholder').textContent = this.placeholder ?? '';
    if (changed.has('description')) this.$('.desc').textContent = this.description ?? '';
    if (changed.has('disabled') && this.editor) {
      this.editor.contentEditable = this.disabled ? 'false' : 'true';
      this.aria('aria-disabled', this.disabled ? 'true' : null);
    }
    if (this.editor && (changed.has('header') || changed.has('placeholder'))) {
      this.editor.setAttribute('aria-label', this.header || this.placeholder || '');
    }
  }

  get text(): string {
    return (this.editor?.innerText ?? '').replace(/\u00a0/g, ' ').replace(/\n$/, '');
  }
  set text(v: string) {
    if (!this.editor) return;
    this.editor.textContent = v;
    this.tokenData.clear();
    this.syncHasText();
  }

  get tokens(): RichToken[] {
    if (!this.editor) return [];
    return Array.from(this.editor.querySelectorAll<HTMLElement>('[data-token-id]'))
      .map((el) => this.tokenData.get(el.dataset.tokenId!))
      .filter((t): t is RichToken => !!t);
  }

  clear(): void {
    this.text = '';
  }

  override focus(opts?: FocusOptions): void {
    this.editor?.focus(opts);
  }

  private syncHasText(): void {
    const has = !!this.editor && (this.editor.textContent ?? '').length > 0;
    this.toggleAttr('data-has-text', has);
    this.internals.setFormValue(has ? this.text : null);
  }

  private onInput(): void {
    this.syncHasText();
    const live = new Set(
      Array.from(this.editor.querySelectorAll<HTMLElement>('[data-token-id]')).map((e) => e.dataset.tokenId),
    );
    for (const id of [...this.tokenData.keys()]) if (!live.has(id)) this.tokenData.delete(id);
    this.emit('textchanged', { text: this.text });
    this.detectQuery();
  }

  private detectQuery(): void {
    const sel = document.getSelection();
    if (!sel?.rangeCount || !sel.isCollapsed) {
      this.closeSuggestions();
      return;
    }
    const node = sel.anchorNode;
    if (!(node instanceof Text) || !this.editor.contains(node)) {
      this.closeSuggestions();
      return;
    }
    const caret = sel.anchorOffset;
    const before = node.data.slice(0, caret);
    const prefixes = this.prefixes || '@';
    let found = -1;
    for (let i = before.length - 1; i >= 0; i--) {
      const ch = before[i]!;
      if (/\s/.test(ch)) break;
      if (prefixes.includes(ch)) {
        const prev = i > 0 ? before[i - 1]! : ' ';
        if (/\s/.test(prev) || i === 0) found = i;
        break;
      }
    }
    if (found < 0) {
      this.closeSuggestions();
      return;
    }
    const query = before.slice(found + 1);
    this.active = { node, start: found, end: caret, prefix: before[found]!, query };
    const detail = { prefix: this.active.prefix, query };
    this.emit('suggestionrequested', detail);
    this.showSuggestions();
  }

  private normalized(): RichSuggestion[] {
    return (this.suggestions ?? []).map((s) => (typeof s === 'string' ? { text: s } : s));
  }

  private showSuggestions(): void {
    const a = this.active;
    if (!a) return;
    const q = a.query.toLowerCase();
    this.current = this.normalized()
      .filter((s) => (!s.prefix || s.prefix === a.prefix) && s.text.toLowerCase().includes(q))
      .slice(0, Math.max(1, this.maxSuggestions));
    if (!this.current.length) {
      this.closeSuggestions(false);
      return;
    }
    this.highlighted = 0;
    this.list.innerHTML = this.current
      .map(
        (s, i) =>
          `<div class="suggest-item" role="option" id="${this.list.id}-${i}" data-i="${i}" aria-selected="${i === 0}">${s.icon ? iconHtml(s.icon, 16) : ''}<span style="overflow:hidden;text-overflow:ellipsis">${escapeHtml(s.text)}${s.description ? ` <span class="s-sub">${escapeHtml(s.description)}</span>` : ''}</span></div>`,
      )
      .join('');
    const rect = this.caretRect();
    if (!this.popup.isOpen) {
      this.popup.open({
        anchor: rect,
        placement: 'bottom-start',
        offset: 4,
        focus: 'none',
        restoreFocus: false,
        track: false,
        passThrough: [this],
        animateIn: (s, side) => menuIn(s, side),
      });
    } else {
      this.popup.opts.anchor = rect;
      this.popup.reposition();
    }
    this.editor.setAttribute('aria-activedescendant', `${this.list.id}-0`);
    this.editor.setAttribute('aria-expanded', 'true');
  }

  private caretRect(): DOMRect {
    const sel = document.getSelection();
    if (sel?.rangeCount) {
      const r = sel.getRangeAt(0).cloneRange();
      if (this.active) {
        try {
          r.setStart(this.active.node, this.active.start);
          r.setEnd(this.active.node, Math.min(this.active.start + 1, this.active.node.length));
        } catch {}
      }
      const rects = r.getClientRects();
      const box = rects[0] ?? r.getBoundingClientRect();
      if (box && (box.width || box.height)) return new DOMRect(box.left, box.top, box.width, box.height);
    }
    return this.editor.getBoundingClientRect();
  }

  private closeSuggestions(resetQuery = true): void {
    if (resetQuery) this.active = null;
    this.editor?.removeAttribute('aria-activedescendant');
    this.editor?.setAttribute('aria-expanded', 'false');
    if (this.popup?.isOpen) void this.popup.close('programmatic');
  }

  private onKey(ev: KeyboardEvent): void {
    if (!this.popup.isOpen) return;
    const n = this.current.length;
    switch (ev.key) {
      case 'ArrowDown':
      case 'ArrowUp': {
        ev.preventDefault();
        this.highlighted = (this.highlighted + (ev.key === 'ArrowDown' ? 1 : -1) + n) % n;
        const rows = this.list.querySelectorAll<HTMLElement>('.suggest-item');
        rows.forEach((r, i) => {
          r.setAttribute('aria-selected', String(i === this.highlighted));
        });
        rows[this.highlighted]?.scrollIntoView({ block: 'nearest' });
        this.editor.setAttribute('aria-activedescendant', `${this.list.id}-${this.highlighted}`);
        break;
      }
      case 'Enter':
      case 'Tab':
        ev.preventDefault();
        this.choose(this.highlighted);
        break;
      case 'Escape':
        ev.preventDefault();
        ev.stopPropagation();
        this.closeSuggestions();
        break;
    }
  }

  private choose(index: number): void {
    const s = this.current[index];
    const a = this.active;
    if (!s || !a?.node.isConnected) {
      this.closeSuggestions();
      return;
    }
    const token: RichToken = { id: uid('tok'), prefix: a.prefix, text: s.text, data: s.data };
    const detail = { token, suggestion: s, cancel: false };
    if (!this.emit('suggestionchosen', detail, { cancelable: true }) || detail.cancel) {
      this.closeSuggestions();
      return;
    }
    const range = document.createRange();
    range.setStart(a.node, a.start);
    range.setEnd(a.node, Math.min(a.end, a.node.length));
    range.deleteContents();
    const span = document.createElement('span');
    span.contentEditable = 'false';
    span.dataset.tokenId = token.id;
    span.dataset.prefix = token.prefix;
    span.setAttribute('style', TOKEN_STYLE);
    span.textContent = `${token.prefix}${token.text}`;
    const space = document.createTextNode(' ');
    range.insertNode(space);
    range.insertNode(span);
    this.tokenData.set(token.id, token);
    const sel = document.getSelection();
    const after = document.createRange();
    after.setStart(space, 1);
    after.collapse(true);
    sel?.removeAllRanges();
    sel?.addRange(after);
    animate(
      span,
      [
        { transform: 'scale(0.85)', opacity: 0.4 },
        { transform: 'none', opacity: 1 },
      ],
      { duration: durations.fast, easing: easings.decelerate },
    );
    this.closeSuggestions();
    this.syncHasText();
    this.emit('textchanged', { text: this.text });
  }

  formResetCallback(): void {
    this.clear();
  }
}

function placeCaretAtEnd(el: HTMLElement): void {
  const r = document.createRange();
  r.selectNodeContents(el);
  r.collapse(false);
  const sel = document.getSelection();
  sel?.removeAllRanges();
  sel?.addRange(r);
}

declare global {
  interface HTMLElementTagNameMap {
    'win-rich-suggest-box': WinRichSuggestBox;
  }
}
