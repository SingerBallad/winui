import type { PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { FieldElement, fieldCss, fieldTemplate } from './field.ts';

const richEditCss = css`
.field { align-items: stretch; }
.editor {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 30px;
  box-sizing: border-box;
  padding: 5px 6px 6px 10px;
  outline: none;
  overflow: auto;
  white-space: pre-wrap;
  overflow-wrap: break-word;
  color: inherit;
  font: inherit;
  line-height: normal;
  cursor: text;
  scrollbar-width: thin;
  scrollbar-color: var(--w-control-strong-fill-color-default) transparent;
  border-radius: inherit;
}
:host([text-wrapping="no-wrap"]) .editor { white-space: pre; overflow-wrap: normal; }
.editor p, .editor div { margin: 0; }
.editor ul, .editor ol { margin: 0; padding-inline-start: 24px; }
.editor a { color: var(--w-accent-text-fill-color-primary); }
.editor blockquote { margin: 0 0 0 16px; }
.placeholder {
  position: absolute;
  inset: 0 auto auto 0;
  padding: 5px 6px 6px 10px;
  color: var(--w-text-fill-color-secondary);
  pointer-events: none;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
}
:host([data-has-text]) .placeholder { display: none; }
:host([disabled]) .placeholder { color: var(--w-text-fill-color-disabled); }
:host([disabled]) .editor { cursor: default; }
`;

export interface RichTextFormat {
  bold: boolean;
  italic: boolean;
  underline: boolean;
  strikethrough: boolean;
  bullets: boolean;
  numbering: boolean;
  alignment: 'left' | 'center' | 'right' | 'justify';
  foreground: string;
}

const ALLOWED = new Set([
  'B',
  'STRONG',
  'I',
  'EM',
  'U',
  'S',
  'STRIKE',
  'DEL',
  'SUB',
  'SUP',
  'BR',
  'P',
  'DIV',
  'SPAN',
  'UL',
  'OL',
  'LI',
  'A',
  'BLOCKQUOTE',
  'CODE',
  'PRE',
  'H1',
  'H2',
  'H3',
  'H4',
  'FONT',
  'MARK',
]);
const ALLOWED_STYLE = /^(color|background-color|font-weight|font-style|text-decoration(-line)?|text-align|font-size)$/;

export function sanitizeHtml(html: string): string {
  const tpl = document.createElement('template');
  tpl.innerHTML = html;
  const walk = (node: Node) => {
    for (const child of Array.from(node.childNodes)) {
      if (child.nodeType === Node.COMMENT_NODE) {
        child.remove();
        continue;
      }
      if (child.nodeType !== Node.ELEMENT_NODE) continue;
      const el = child as HTMLElement;
      if (!ALLOWED.has(el.tagName)) {
        if (/^(SCRIPT|STYLE|IFRAME|OBJECT|EMBED|TEMPLATE|META|LINK|SVG|MATH)$/.test(el.tagName)) {
          el.remove();
          continue;
        }
        walk(el);
        el.replaceWith(...Array.from(el.childNodes));
        continue;
      }
      for (const attr of Array.from(el.attributes)) {
        const n = attr.name.toLowerCase();
        if (n === 'style') {
          const kept: string[] = [];
          for (const decl of attr.value.split(';')) {
            const [k, ...rest] = decl.split(':');
            const prop = k?.trim().toLowerCase() ?? '';
            const val = rest.join(':').trim();
            if (ALLOWED_STYLE.test(prop) && !/url\(|expression/i.test(val)) kept.push(`${prop}:${val}`);
          }
          if (kept.length) el.setAttribute('style', kept.join(';'));
          else el.removeAttribute('style');
        } else if (n === 'href' && el.tagName === 'A') {
          if (!/^(https?:|mailto:|#|\/)/i.test(attr.value.trim())) el.removeAttribute('href');
        } else if (!(n === 'color' && el.tagName === 'FONT')) {
          el.removeAttribute(attr.name);
        }
      }
      if (el.tagName === 'A') {
        el.setAttribute('target', '_blank');
        el.setAttribute('rel', 'noopener noreferrer');
      }
      walk(el);
    }
  };
  walk(tpl.content);
  const div = document.createElement('div');
  div.append(tpl.content);
  return div.innerHTML;
}

export class WinRichEditBox extends FieldElement {
  static override styles = [fieldCss, richEditCss];
  static override template = fieldTemplate(
    `<div class="editor" part="editor" contenteditable="true" role="textbox" aria-multiline="true" spellcheck="true"></div><span class="placeholder" part="placeholder" aria-hidden="true"></span>`,
  );
  static override props: PropDefs = {
    textWrapping: { type: String, attribute: 'text-wrapping', reflect: true, default: 'wrap' },
    spellCheck: { type: Boolean, attribute: 'spell-check', default: true },
    acceptsReturn: { type: Boolean, attribute: 'accepts-return', default: true },
    maxLength: { type: Number, attribute: 'max-length', default: 0 },
  };
  declare textWrapping: string;
  declare spellCheck: boolean;
  declare acceptsReturn: boolean;
  declare maxLength: number;

  static {
    this.define('win-rich-edit-box');
  }

  private ed!: HTMLDivElement;
  private dirty = false;
  private lastFormat = '';
  private savedRange: Range | null = null;
  private readonly onDocSelection = () => this.trackSelection();

  protected get editor(): HTMLElement {
    return this.ed;
  }

  protected override connected(): void {
    document.addEventListener('selectionchange', this.onDocSelection);
  }

  protected override disconnected(): void {
    document.removeEventListener('selectionchange', this.onDocSelection);
  }

  private currentRange(): Range | null {
    const root = this.renderRoot as ShadowRoot & { getSelection?: () => Selection | null };
    const sel = root.getSelection?.() ?? document.getSelection();
    if (!sel || sel.rangeCount === 0) return null;
    const r = sel.getRangeAt(0);
    return this.ed.contains(r.commonAncestorContainer) ? r : null;
  }

  private trackSelection(): void {
    if (!this.ed) return;
    const r = this.currentRange();
    if (!r) return;
    this.savedRange = r.cloneRange();
    const f = this.getFormat();
    const key = JSON.stringify(f);
    if (key === this.lastFormat) return;
    this.lastFormat = key;
    this.emit('selectionchanged', f);
  }

  protected override firstConnected(): void {
    this.ed = this.$<HTMLDivElement>('.editor');
    super.firstConnected();
    const holder = document.createElement('div');
    for (const n of Array.from(this.childNodes)) {
      if (n instanceof Element && n.hasAttribute('slot')) continue;
      holder.append(n.cloneNode(true));
      if (!(n instanceof Element && n.hasAttribute('slot'))) n.remove();
    }
    const initial = holder.innerHTML.trim();
    if (initial) this.ed.innerHTML = sanitizeHtml(initial);
    this.syncHasText();
    const ed = this.ed;
    ed.addEventListener('input', () => {
      this.enforceMaxLength();
      this.dirty = true;
      this.syncHasText();
      this.internals.setFormValue(this.text);
      this.emit('textchanged', { text: this.text });
    });
    ed.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !this.acceptsReturn) ev.preventDefault();
      if (ev.key === 'Tab' && !ev.ctrlKey && !ev.altKey && this.hasAttribute('accepts-tab')) {
        ev.preventDefault();
        this.exec('insertText', '\t');
      }
    });
    ed.addEventListener('paste', (ev) => {
      if (this.readOnly) return;
      const data = ev.clipboardData;
      if (!data) return;
      ev.preventDefault();
      const html = data.getData('text/html');
      if (html) this.exec('insertHTML', sanitizeHtml(html));
      else this.exec('insertText', data.getData('text/plain'));
    });
    ed.addEventListener('blur', () => {
      if (this.dirty) {
        this.dirty = false;
        this.emit('change', { text: this.text });
      }
    });
  }

  private enforceMaxLength(): void {
    if (this.maxLength > 0 && this.text.length > this.maxLength) document.execCommand('undo');
  }

  private syncHasText(): void {
    const has = (this.ed.textContent ?? '').length > 0 || !!this.ed.querySelector('li, img');
    this.toggleAttr('data-has-text', has);
  }

  protected override syncDisabled(): void {
    this.syncEditable();
  }

  private syncEditable(): void {
    const editable = !this.disabled && !this.readOnly;
    this.ed.contentEditable = editable ? 'true' : 'false';
    this.ed.tabIndex = this.disabled ? -1 : 0;
    this.ed.setAttribute('aria-readonly', String(this.readOnly));
  }

  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    if (first || changed.has('placeholder')) {
      this.$('.placeholder').textContent = this.placeholder ?? '';
      this.ed.setAttribute('aria-placeholder', this.placeholder ?? '');
      this.syncA11y();
    }
    if (first || changed.has('readOnly') || changed.has('disabled')) this.syncEditable();
    if (first || changed.has('spellCheck')) this.ed.spellcheck = this.spellCheck;
    if (first) this.internals.setFormValue(this.text);
  }

  get html(): string {
    return this.ed?.innerHTML ?? '';
  }
  set html(v: string) {
    if (!this.ed) {
      this.innerHTML = v;
      return;
    }
    this.ed.innerHTML = sanitizeHtml(v);
    this.syncHasText();
    this.internals.setFormValue(this.text);
    this.emit('textchanged', { text: this.text });
  }

  get text(): string {
    return this.ed?.innerText.replace(/\n$/, '') ?? '';
  }
  set text(v: string) {
    if (!this.ed) {
      this.textContent = v;
      return;
    }
    this.ed.textContent = v;
    this.syncHasText();
    this.internals.setFormValue(this.text);
    this.emit('textchanged', { text: this.text });
  }

  private exec(cmd: string, value?: string): boolean {
    if (this.disabled || this.readOnly) return false;
    if (!this.matches(':focus-within')) {
      this.ed.focus({ preventScroll: true });
      if (this.savedRange) {
        const sel = document.getSelection();
        sel?.removeAllRanges();
        sel?.addRange(this.savedRange);
      }
    }
    document.execCommand('styleWithCSS', false, 'true');
    const ok = document.execCommand(cmd, false, value);
    this.syncHasText();
    return ok;
  }

  toggleBold(): void {
    this.exec('bold');
  }
  toggleItalic(): void {
    this.exec('italic');
  }
  toggleUnderline(): void {
    this.exec('underline');
  }
  toggleStrikethrough(): void {
    this.exec('strikeThrough');
  }
  setForeground(color: string): void {
    this.exec('foreColor', color);
  }
  setHighlight(color: string): void {
    this.exec('hiliteColor', color);
  }
  setAlignment(a: 'left' | 'center' | 'right' | 'justify'): void {
    this.exec({ left: 'justifyLeft', center: 'justifyCenter', right: 'justifyRight', justify: 'justifyFull' }[a]);
  }
  toggleBullets(): void {
    this.exec('insertUnorderedList');
  }
  toggleNumbering(): void {
    this.exec('insertOrderedList');
  }
  increaseIndent(): void {
    this.exec('indent');
  }
  decreaseIndent(): void {
    this.exec('outdent');
  }
  clearFormatting(): void {
    this.exec('removeFormat');
  }
  undo(): void {
    this.exec('undo');
  }
  redo(): void {
    this.exec('redo');
  }
  selectAll(): void {
    this.ed.focus();
    const r = document.createRange();
    r.selectNodeContents(this.ed);
    const s = document.getSelection();
    s?.removeAllRanges();
    s?.addRange(r);
  }

  getFormat(): RichTextFormat {
    const q = (c: string) => {
      try {
        return document.queryCommandState(c);
      } catch {
        return false;
      }
    };
    let foreground = '';
    try {
      foreground = document.queryCommandValue('foreColor');
    } catch {}
    const alignment = q('justifyCenter')
      ? 'center'
      : q('justifyRight')
        ? 'right'
        : q('justifyFull')
          ? 'justify'
          : 'left';
    return {
      bold: q('bold'),
      italic: q('italic'),
      underline: q('underline'),
      strikethrough: q('strikeThrough'),
      bullets: q('insertUnorderedList'),
      numbering: q('insertOrderedList'),
      alignment,
      foreground,
    };
  }

  formResetCallback(): void {
    this.html = '';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-rich-edit-box': WinRichEditBox;
  }
}
