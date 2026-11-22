import type { PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { FieldElement, fieldCss, fieldTemplate, keepFocus, revealGlyph } from './field.ts';
import { syncValidity } from './text-box.ts';

const passwordCss = css`
:host(:focus-within[data-has-text]:not([password-reveal-mode="hidden"]):not([password-reveal-mode="visible"])) .reveal {
  display: inline-flex;
}
.input[type="password"], .input[data-mask] {
  font-family: Verdana, var(--w-font-family-text);
  letter-spacing: 0.75px;
  line-height: 19px;
  line-height: round(up, 1.33em, 1px);
}
.input[type="password"]::placeholder, .input[data-mask]::placeholder {
  font-family: var(--w-font-family-text);
  letter-spacing: normal;
}
.input[data-mask="circle"] { -webkit-text-security: circle; }
.input[data-mask="square"] { -webkit-text-security: square; }
.input[data-mask="disc"] { -webkit-text-security: disc; }
`;

function maskFor(ch: string): 'disc' | 'circle' | 'square' | null {
  if (!ch || ch === '●' || ch === '•' || ch === '⚫') return null;
  if (ch === '○' || ch === '◦' || ch === 'o' || ch === 'O') return 'circle';
  if (ch === '■' || ch === '▪' || ch === '□' || ch === '#' || ch === '*') return 'square';
  return 'disc';
}

export class WinPasswordBox extends FieldElement {
  static override styles = [fieldCss, passwordCss];
  static override template = fieldTemplate(
    `<input class="input" part="input" type="password" autocomplete="current-password" spellcheck="false"><button class="btn reveal" part="reveal-button" type="button" tabindex="-1" aria-label="显示密码" aria-pressed="false">${revealGlyph(12)}</button>`,
  );
  static override props: PropDefs = {
    value: { type: String },
    passwordRevealMode: { type: String, attribute: 'password-reveal-mode', reflect: true, default: 'peek' },
    passwordChar: { type: String, attribute: 'password-char' },
    maxLength: { type: Number, attribute: 'max-length', default: 0 },
    autocomplete: { type: String, default: 'current-password' },
    inputScope: { type: String, attribute: 'input-scope', default: '' },
  };
  declare value: string;
  declare passwordRevealMode: 'peek' | 'hidden' | 'visible';
  declare passwordChar: string;
  declare maxLength: number;
  declare autocomplete: string;
  declare inputScope: string;

  static {
    this.define('win-password-box');
  }

  private input!: HTMLInputElement;
  private revealed = false;

  protected get editor(): HTMLElement {
    return this.input;
  }

  get password(): string {
    return this.value;
  }
  set password(v: string) {
    this.value = v;
  }

  protected override firstConnected(): void {
    this.input = this.$<HTMLInputElement>('.input');
    super.firstConnected();
    const el = this.input;
    el.addEventListener('input', () => {
      this.value = el.value;
      this.toggleAttr('data-has-text', el.value.length > 0);
      this.internals.setFormValue(el.value);
      syncValidity(this.internals, el);
      this.emit('passwordchanged', { password: el.value });
    });
    el.addEventListener('change', () => this.emit('change', { value: this.value }));

    const reveal = this.$('.reveal');
    keepFocus(reveal);
    const end = () => {
      reveal.removeAttribute('data-pressed');
      this.setRevealed(false);
    };
    reveal.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      reveal.setPointerCapture(ev.pointerId);
      reveal.toggleAttribute('data-pressed', true);
      this.setRevealed(true);
    });
    reveal.addEventListener('pointerup', end);
    reveal.addEventListener('pointercancel', end);
    reveal.addEventListener('lostpointercapture', end);
    el.addEventListener('blur', () => this.setRevealed(false));
  }

  private setRevealed(on: boolean): void {
    this.revealed = on;
    this.syncType();
    this.$('.reveal').setAttribute('aria-pressed', String(on));
  }

  private syncType(): void {
    const el = this.input;
    const visible = this.passwordRevealMode === 'visible' || this.revealed;
    const mask = maskFor(this.passwordChar);
    const start = el.selectionStart;
    const end = el.selectionEnd;
    if (visible) {
      el.type = 'text';
      el.removeAttribute('data-mask');
    } else if (mask) {
      el.type = 'text';
      el.dataset.mask = mask;
    } else {
      el.type = 'password';
      el.removeAttribute('data-mask');
    }
    if (document.activeElement === this && start !== null && end !== null) {
      try {
        el.setSelectionRange(start, end);
      } catch {}
    }
  }

  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    const el = this.input;
    if (first || changed.has('placeholder')) {
      el.placeholder = this.placeholder ?? '';
      this.syncA11y();
    }
    if (first || changed.has('readOnly')) el.readOnly = this.readOnly;
    if (first || changed.has('required')) el.required = this.required;
    if (first || changed.has('autocomplete')) el.setAttribute('autocomplete', this.autocomplete || 'current-password');
    if (first || changed.has('maxLength')) {
      if (this.maxLength > 0) el.maxLength = this.maxLength;
      else el.removeAttribute('maxlength');
    }
    if (first || changed.has('inputScope')) {
      const numeric = /numericpin|numericpassword|number|digits/i.test((this.inputScope || '').replace(/[-_]/g, ''));
      if (numeric) el.inputMode = 'numeric';
      else el.removeAttribute('inputmode');
    }
    if (first || changed.has('passwordRevealMode') || changed.has('passwordChar')) this.syncType();
    if (changed.has('value')) {
      const v = this.value ?? '';
      if (el.value !== v) el.value = v;
      this.toggleAttr('data-has-text', v.length > 0);
      this.internals.setFormValue(v);
    }
    syncValidity(this.internals, el);
  }

  selectAll(): void {
    this.input.focus();
    this.input.select();
  }

  formResetCallback(): void {
    this.value = this.getAttribute('value') ?? '';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-password-box': WinPasswordBox;
  }
}
