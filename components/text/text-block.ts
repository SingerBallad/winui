import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';

const RAMP = [
  'caption',
  'body',
  'body-strong',
  'body-large',
  'body-large-strong',
  'subtitle',
  'title',
  'title-large',
  'display',
];

const FOREGROUNDS: Record<string, string> = {
  primary: 'var(--w-text-fill-color-primary)',
  secondary: 'var(--w-text-fill-color-secondary)',
  tertiary: 'var(--w-text-fill-color-tertiary)',
  disabled: 'var(--w-text-fill-color-disabled)',
  accent: 'var(--w-accent-text-fill-color-primary)',
  'accent-secondary': 'var(--w-accent-text-fill-color-secondary)',
  'on-accent': 'var(--w-text-on-accent-fill-color-primary)',
  success: 'var(--w-system-fill-color-success)',
  caution: 'var(--w-system-fill-color-caution)',
  critical: 'var(--w-system-fill-color-critical)',
};

const textBlockCss = css`
:host {
  display: block;
  box-sizing: border-box;
  font: var(--w-type-body);
  color: var(--tb-fg, var(--w-text-fill-color-primary));
  white-space: nowrap;
  overflow-wrap: normal;
  user-select: none;
  -webkit-user-select: none;
  letter-spacing: var(--tb-spacing, normal);
  text-align: var(--tb-align, start);
}
${RAMP.map((r) => `:host([text-style="${r}"]) { font: var(--w-type-${r}); }`).join('\n')}
:host([text-style]) { white-space: normal; overflow-wrap: anywhere; }
:host([text-wrapping="wrap"]) { white-space: normal; overflow-wrap: anywhere; }
:host([text-wrapping="wrap-whole-words"]) { white-space: normal; overflow-wrap: normal; word-break: normal; }
:host([text-wrapping="no-wrap"]) { white-space: nowrap; }
:host([text-trimming="character-ellipsis"][text-wrapping="no-wrap"]),
:host([text-trimming="word-ellipsis"][text-wrapping="no-wrap"]),
:host([text-trimming="character-ellipsis"]:not([text-style]):not([text-wrapping])),
:host([text-trimming="word-ellipsis"]:not([text-style]):not([text-wrapping])) {
  overflow: hidden;
  text-overflow: ellipsis;
}
:host([text-trimming="clip"]) { overflow: hidden; text-overflow: clip; }
:host([max-lines]:not([max-lines="0"])) {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--tb-lines);
  line-clamp: var(--tb-lines);
  white-space: normal;
  overflow: hidden;
}
:host([is-text-selection-enabled]) { user-select: text; -webkit-user-select: text; cursor: text; }
:host([text-decorations~="underline"]) { text-decoration-line: underline; }
:host([text-decorations~="strikethrough"]) { text-decoration-line: line-through; }
:host([text-decorations~="underline"][text-decorations~="strikethrough"]) { text-decoration-line: underline line-through; }
:host([font-style="italic"]) { font-style: italic; }
.text:empty { display: none; }
`;

export class WinTextBlock extends WinElement {
  static override styles = [textBlockCss];
  static override template = `<span class="text" part="text"></span><slot></slot>`;
  static override props: PropDefs = {
    text: { type: String },
    textStyle: { type: String, attribute: 'text-style', reflect: true },
    textWrapping: { type: String, attribute: 'text-wrapping', reflect: true },
    textTrimming: { type: String, attribute: 'text-trimming', reflect: true },
    maxLines: { type: Number, attribute: 'max-lines', default: 0 },
    isTextSelectionEnabled: { type: Boolean, attribute: 'is-text-selection-enabled' },
    foreground: { type: String },
    characterSpacing: { type: Number, attribute: 'character-spacing', default: 0 },
    textAlignment: { type: String, attribute: 'text-alignment' },
    textDecorations: { type: String, attribute: 'text-decorations', reflect: true },
  };
  declare text: string;
  declare textStyle: string;
  declare textWrapping: string;
  declare textTrimming: string;
  declare maxLines: number;
  declare isTextSelectionEnabled: boolean;
  declare foreground: string;
  declare characterSpacing: number;
  declare textAlignment: string;
  declare textDecorations: string;

  static {
    this.define('win-text-block');
  }

  protected override updated(changed: Set<string>): void {
    if (changed.has('text')) this.$('.text').textContent = this.text ?? '';
    if (changed.has('foreground')) {
      const f = this.foreground;
      if (f) this.style.setProperty('--tb-fg', FOREGROUNDS[f] ?? f);
      else this.style.removeProperty('--tb-fg');
    }
    if (changed.has('characterSpacing')) {
      if (this.characterSpacing) this.style.setProperty('--tb-spacing', `${this.characterSpacing / 1000}em`);
      else this.style.removeProperty('--tb-spacing');
    }
    if (changed.has('textAlignment')) {
      const a = this.textAlignment;
      if (a) this.style.setProperty('--tb-align', a === 'left' ? 'start' : a === 'right' ? 'end' : a);
      else this.style.removeProperty('--tb-align');
    }
    if (changed.has('maxLines')) {
      if (this.maxLines > 0) this.style.setProperty('--tb-lines', String(this.maxLines));
      else this.style.removeProperty('--tb-lines');
    }
  }
}

const richCss = css`
:host {
  display: block;
  box-sizing: border-box;
  font: var(--w-type-body);
  color: var(--tb-fg, var(--w-text-fill-color-primary));
  white-space: normal;
  overflow-wrap: anywhere;
  user-select: text;
  -webkit-user-select: text;
  cursor: text;
  text-indent: var(--rtb-indent, 0);
  text-align: var(--tb-align, start);
  letter-spacing: var(--tb-spacing, normal);
}
:host([is-text-selection-enabled="false"]) { user-select: none; -webkit-user-select: none; cursor: default; }
:host([text-wrapping="no-wrap"]) { white-space: nowrap; }
${RAMP.map((r) => `:host([text-style="${r}"]) { font: var(--w-type-${r}); }`).join('\n')}
.content { display: block; }
:host([data-columns]) { overflow: hidden; }
:host([data-columns]) .content {
  column-count: var(--rtb-columns, 2);
  column-gap: var(--rtb-column-gap, 24px);
  column-fill: auto;
  height: 100%;
  overflow: hidden;
}
:host([max-lines]:not([max-lines="0"])) .content {
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: var(--tb-lines);
  line-clamp: var(--tb-lines);
  overflow: hidden;
}
`;

let richLightInstalled = false;
function installRichLightStyles(): void {
  if (richLightInstalled || typeof document === 'undefined') return;
  richLightInstalled = true;
  const s = document.createElement('style');
  s.id = 'winui-rich-text-block';
  s.textContent = `
:where(win-rich-text-block) :where(p) { margin: 0; }
:where(win-rich-text-block[paragraph-spacing]) :where(p + p) { margin-top: var(--rtb-paragraph-spacing, 0); }
:where(win-rich-text-block) :where(a) { color: var(--w-accent-text-fill-color-primary); text-decoration: underline; text-underline-offset: 2px; cursor: pointer; }
:where(win-rich-text-block) :where(a:hover) { color: var(--w-accent-text-fill-color-secondary); }
:where(win-rich-text-block) :where(a:active) { color: var(--w-accent-text-fill-color-tertiary); }
:where(win-rich-text-block) :where(mark) { background: #ffff00; color: #000000; }
:where(win-rich-text-block) :where(code) { font-family: var(--w-font-family-mono); }
:where(win-rich-text-block) ::selection { background: var(--w-accent-fill-color-selected-text-background); color: var(--w-text-on-accent-fill-color-selected-text); }
:where(win-rich-text-block) :where(img) { max-width: 100%; vertical-align: middle; }
:where(win-text-block[is-text-selection-enabled])::selection, :where(win-text-block[is-text-selection-enabled]) ::selection { background: var(--w-accent-fill-color-selected-text-background); color: var(--w-text-on-accent-fill-color-selected-text); }
`;
  document.head.append(s);
}

export class WinRichTextBlock extends WinElement {
  static override styles = [richCss];
  static override template = `<div class="content" part="content"><slot></slot></div>`;
  static override props: PropDefs = {
    textStyle: { type: String, attribute: 'text-style', reflect: true },
    textWrapping: { type: String, attribute: 'text-wrapping', reflect: true },
    isTextSelectionEnabled: { type: Boolean, attribute: 'is-text-selection-enabled', default: true },
    maxLines: { type: Number, attribute: 'max-lines', default: 0 },
    textIndent: { type: Number, attribute: 'text-indent', default: 0 },
    columns: { type: Number, default: 0 },
    columnGap: { type: Number, attribute: 'column-gap', default: 24 },
    paragraphSpacing: { type: Number, attribute: 'paragraph-spacing', default: 0 },
    foreground: { type: String },
    textAlignment: { type: String, attribute: 'text-alignment' },
    characterSpacing: { type: Number, attribute: 'character-spacing', default: 0 },
  };
  declare textStyle: string;
  declare textWrapping: string;
  declare isTextSelectionEnabled: boolean;
  declare maxLines: number;
  declare textIndent: number;
  declare columns: number;
  declare columnGap: number;
  declare paragraphSpacing: number;
  declare foreground: string;
  declare textAlignment: string;
  declare characterSpacing: number;

  static {
    this.define('win-rich-text-block');
  }

  protected override firstConnected(): void {
    installRichLightStyles();
  }

  protected override updated(changed: Set<string>): void {
    const set = (k: string, v: string | null) =>
      v === null ? this.style.removeProperty(k) : this.style.setProperty(k, v);
    if (changed.has('textIndent')) set('--rtb-indent', this.textIndent ? `${this.textIndent}px` : null);
    if (changed.has('columns')) {
      set('--rtb-columns', this.columns > 1 ? String(this.columns) : null);
      this.toggleAttribute('data-columns', this.columns > 1);
    }
    if (changed.has('columnGap')) set('--rtb-column-gap', `${this.columnGap}px`);
    if (changed.has('paragraphSpacing'))
      set('--rtb-paragraph-spacing', this.paragraphSpacing ? `${this.paragraphSpacing}px` : null);
    if (changed.has('maxLines')) set('--tb-lines', this.maxLines > 0 ? String(this.maxLines) : null);
    if (changed.has('foreground')) {
      const f = this.foreground;
      set('--tb-fg', f ? (FOREGROUNDS[f] ?? f) : null);
    }
    if (changed.has('textAlignment')) {
      const a = this.textAlignment;
      set('--tb-align', a ? (a === 'left' ? 'start' : a === 'right' ? 'end' : a) : null);
    }
    if (changed.has('characterSpacing'))
      set('--tb-spacing', this.characterSpacing ? `${this.characterSpacing / 1000}em` : null);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-text-block': WinTextBlock;
    'win-rich-text-block': WinRichTextBlock;
  }
}
