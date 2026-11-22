import type { PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { FieldElement, fieldCss, fieldTemplate, keepFocus } from './field.ts';

const textBoxCss = css`
.input.multi {
  display: block;
  align-self: stretch;
  resize: none;
  min-height: 30px;
  overflow: auto;
  field-sizing: content;
  white-space: pre;
  overflow-wrap: normal;
  scrollbar-width: thin;
  scrollbar-color: var(--w-control-strong-fill-color-default) transparent;
}
:host([text-wrapping="wrap"]) .input.multi,
:host([text-wrapping="wrap-whole-words"]) .input.multi {
  white-space: pre-wrap;
  overflow-wrap: break-word;
}
:host([text-wrapping="wrap-whole-words"]) .input.multi { overflow-wrap: normal; }
:host(:focus-within[data-has-text]:not([read-only]):not([data-multi]):not([no-clear-button])) .delete {
  display: inline-flex;
}
`;

export function applyInputScope(el: HTMLInputElement | HTMLTextAreaElement, scope: string): void {
  const s = (scope || 'default').toLowerCase().replace(/[-_\s]/g, '');
  let type = 'text';
  let mode = '';
  switch (s) {
    case 'url':
      type = 'url';
      mode = 'url';
      break;
    case 'email':
    case 'emailsmtpaddress':
    case 'emailnameoremailaddress':
      type = 'email';
      mode = 'email';
      break;
    case 'tel':
    case 'telephone':
    case 'telephonenumber':
    case 'telephonelocalnumber':
      type = 'tel';
      mode = 'tel';
      break;
    case 'number':
    case 'digits':
    case 'numericpin':
    case 'numericpassword':
      mode = 'numeric';
      break;
    case 'formula':
    case 'currencyamount':
    case 'currencyamountandsymbol':
    case 'numberfullwidth':
    case 'decimal':
      mode = 'decimal';
      break;
    case 'search':
    case 'searchincremental':
      mode = 'search';
      break;
  }
  if (el instanceof HTMLInputElement && el.type !== 'password') el.type = type;
  if (mode) el.inputMode = mode;
  else el.removeAttribute('inputmode');
}

export function syncValidity(internals: ElementInternals, e: HTMLInputElement | HTMLTextAreaElement): void {
  const v = e.validity;
  if (v.valid) {
    internals.setValidity({});
    return;
  }
  internals.setValidity(
    {
      valueMissing: v.valueMissing,
      typeMismatch: v.typeMismatch,
      patternMismatch: v.patternMismatch,
      tooLong: v.tooLong,
      tooShort: v.tooShort,
      rangeUnderflow: v.rangeUnderflow,
      rangeOverflow: v.rangeOverflow,
      stepMismatch: v.stepMismatch,
      badInput: v.badInput,
      customError: v.customError,
    },
    e.validationMessage,
    e,
  );
}

export class WinTextBox extends FieldElement {
  static override styles = [fieldCss, textBoxCss];
  static override template = fieldTemplate(
    `<button class="btn delete" part="delete-button" type="button" tabindex="-1" aria-label="清除">${glyph('clear', 12)}</button>`,
  );
  static override props: PropDefs = {
    value: { type: String },
    acceptsReturn: { type: Boolean, attribute: 'accepts-return' },
    textWrapping: { type: String, attribute: 'text-wrapping', reflect: true, default: 'no-wrap' },
    maxLength: { type: Number, attribute: 'max-length', default: 0 },
    spellCheck: { type: Boolean, attribute: 'spell-check', default: true },
    inputScope: { type: String, attribute: 'input-scope', default: 'default' },
    textAlignment: { type: String, attribute: 'text-alignment', default: '' },
    characterCasing: { type: String, attribute: 'character-casing', default: 'normal' },
    autocomplete: { type: String, default: 'off' },
    noClearButton: { type: Boolean, attribute: 'no-clear-button' },
    pattern: { type: String },
    minLength: { type: Number, attribute: 'min-length', default: 0 },
  };
  declare value: string;
  declare acceptsReturn: boolean;
  declare textWrapping: string;
  declare maxLength: number;
  declare spellCheck: boolean;
  declare inputScope: string;
  declare textAlignment: string;
  declare characterCasing: string;
  declare autocomplete: string;
  declare noClearButton: boolean;
  declare pattern: string;
  declare minLength: number;

  static {
    this.define('win-text-box');
  }

  private input!: HTMLInputElement | HTMLTextAreaElement;
  private lastSel = '';

  protected get editor(): HTMLElement {
    return this.input;
  }

  get text(): string {
    return this.value;
  }
  set text(v: string) {
    this.value = v;
  }

  protected override firstConnected(): void {
    this.buildEditor();
    super.firstConnected();
    const del = this.$('.delete');
    keepFocus(del);
    del.addEventListener('click', () => this.clear());
  }

  private get isMulti(): boolean {
    return this.acceptsReturn || (!!this.textWrapping && this.textWrapping !== 'no-wrap');
  }

  private buildEditor(): void {
    const multi = this.isMulti;
    const old = this.input;
    if (old && old instanceof HTMLTextAreaElement === multi) return;
    const el = multi ? document.createElement('textarea') : document.createElement('input');
    el.className = multi ? 'input multi' : 'input';
    el.setAttribute('part', 'input');
    if (el instanceof HTMLTextAreaElement) el.rows = 1;
    else el.type = 'text';
    el.value = old ? old.value : (this.value ?? '');
    el.addEventListener('input', () => this.onInput());
    el.addEventListener('change', () => this.emit('change', { value: this.value }));
    (el as HTMLElement).addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && el instanceof HTMLTextAreaElement && !this.acceptsReturn) ev.preventDefault();
    });
    for (const t of ['select', 'selectionchange', 'keyup', 'pointerup']) {
      el.addEventListener(t, () => this.reportSelection());
    }
    if (old) {
      old.replaceWith(el);
      if (this.matches(':focus-within')) el.focus();
    } else {
      this.$('.field').prepend(el);
    }
    this.input = el;
    this.toggleAttr('data-multi', multi);
    this.applyEditorAttributes();
    this.syncA11y();
  }

  private applyEditorAttributes(): void {
    const el = this.input;
    if (!el) return;
    el.placeholder = this.placeholder ?? '';
    el.readOnly = this.readOnly;
    el.disabled = this.disabled;
    el.required = this.required;
    el.spellcheck = this.spellCheck;
    el.setAttribute('autocomplete', this.autocomplete || 'off');
    if (this.maxLength > 0) el.maxLength = this.maxLength;
    else el.removeAttribute('maxlength');
    if (this.minLength > 0) el.minLength = this.minLength;
    else el.removeAttribute('minlength');
    if (el instanceof HTMLInputElement) {
      if (this.pattern) el.pattern = this.pattern;
      else el.removeAttribute('pattern');
    }
    applyInputScope(el, this.inputScope);
    el.style.textAlign = this.textAlignment || '';
    if (this.name) el.name = this.name;
  }

  private onInput(): void {
    const el = this.input;
    if (this.characterCasing === 'upper' || this.characterCasing === 'lower') {
      const s = el.selectionStart;
      const e = el.selectionEnd;
      const next = this.characterCasing === 'upper' ? el.value.toUpperCase() : el.value.toLowerCase();
      if (next !== el.value) {
        el.value = next;
        if (s !== null && e !== null) el.setSelectionRange(s, e);
      }
    }
    this.value = el.value;
    this.toggleAttr('data-has-text', el.value.length > 0);
    this.internals.setFormValue(el.value);
    syncValidity(this.internals, el);
  }

  private reportSelection(): void {
    const el = this.input;
    if (!el || el.selectionStart === null) return;
    const key = `${el.selectionStart}:${el.selectionEnd}`;
    if (key === this.lastSel) return;
    this.lastSel = key;
    this.emit('selectionchange', { start: el.selectionStart, end: el.selectionEnd });
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('acceptsReturn') || changed.has('textWrapping')) this.buildEditor();
    super.updated(changed, first);
    if (
      first ||
      [
        'placeholder',
        'readOnly',
        'disabled',
        'required',
        'spellCheck',
        'autocomplete',
        'maxLength',
        'minLength',
        'pattern',
        'inputScope',
        'textAlignment',
        'name',
      ].some((k) => changed.has(k))
    ) {
      this.applyEditorAttributes();
      if (changed.has('placeholder')) this.syncA11y();
    }
    if (changed.has('value')) {
      const v = this.value ?? '';
      if (this.input.value !== v) this.input.value = v;
      this.toggleAttr('data-has-text', v.length > 0);
      this.internals.setFormValue(v);
    }
    syncValidity(this.internals, this.input);
  }

  clear(): void {
    if (this.readOnly || this.disabled) return;
    this.input.value = '';
    this.input.dispatchEvent(
      new InputEvent('input', { bubbles: true, composed: true, inputType: 'deleteContentBackward' }),
    );
    this.input.focus();
  }

  get selectionStart(): number {
    return this.input?.selectionStart ?? 0;
  }
  get selectionLength(): number {
    return (this.input?.selectionEnd ?? 0) - (this.input?.selectionStart ?? 0);
  }
  get selectedText(): string {
    const el = this.input;
    return el ? el.value.slice(el.selectionStart ?? 0, el.selectionEnd ?? 0) : '';
  }

  select(start = 0, length?: number): void {
    const el = this.input;
    const len = length ?? el.value.length - start;
    el.focus();
    el.setSelectionRange(start, start + len);
  }

  selectAll(): void {
    this.input.focus();
    this.input.select();
  }

  setCustomValidity(message: string): void {
    this.input.setCustomValidity(message);
    syncValidity(this.internals, this.input);
  }

  formResetCallback(): void {
    this.value = this.getAttribute('value') ?? '';
  }

  formStateRestoreCallback(state: string | File | FormData | null): void {
    if (typeof state === 'string') this.value = state;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-text-box': WinTextBox;
  }
}
