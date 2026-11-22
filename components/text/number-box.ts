import type { PropDefs } from '../../base/element.ts';
import { acrylicSurface, css } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { Popup, popupResetCss, type PositionResult } from '../../base/popup.ts';
import { animate, durations, easings, fadeIn, popupOut } from '../../motion/animate.ts';
import { FieldElement, fieldCss, fieldTemplate, keepFocus, upDownGlyph } from './field.ts';

export function evaluateExpression(src: string): number {
  const s = src.replace(/\s+/g, '').replace(/,/g, '.').replace(/[×x]/g, '*').replace(/÷/g, '/');
  let i = 0;
  const peek = () => s[i];
  const fail = () => {
    throw new Error('syntax');
  };
  const number = (): number => {
    const m = /^(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?/i.exec(s.slice(i));
    if (!m) fail();
    i += m![0].length;
    return Number(m![0]);
  };
  const primary = (): number => {
    if (peek() === '(') {
      i++;
      const v = expr();
      if (peek() !== ')') fail();
      i++;
      return v;
    }
    return number();
  };
  const power = (): number => {
    const b = primary();
    if (peek() === '^') {
      i++;
      return b ** unary();
    }
    return b;
  };
  const unary = (): number => {
    if (peek() === '-') {
      i++;
      return -unary();
    }
    if (peek() === '+') {
      i++;
      return unary();
    }
    return power();
  };
  const term = (): number => {
    let v = unary();
    while (peek() === '*' || peek() === '/') {
      const op = s[i++];
      const r = unary();
      v = op === '*' ? v * r : v / r;
    }
    return v;
  };
  const expr = (): number => {
    let v = term();
    while (peek() === '+' || peek() === '-') {
      const op = s[i++];
      const r = term();
      v = op === '+' ? v + r : v - r;
    }
    return v;
  };
  try {
    if (!s) return Number.NaN;
    const start = s[0] === '=' ? 1 : 0;
    i = start;
    const v = expr();
    if (i !== s.length || !Number.isFinite(v)) return Number.NaN;
    return v;
  } catch {
    return Number.NaN;
  }
}

export function parseNumber(text: string): number {
  const t = text.trim().replace(',', '.');
  if (!/^[+-]?(\d+(\.\d*)?|\.\d+)(e[+-]?\d+)?$/i.test(t)) return Number.NaN;
  return Number(t);
}

export interface NumberFormatter {
  format(value: number): string;
  parse(text: string): number;
}

const numberBoxCss = css`
:host { --nb-min-width: 64px; }
:host([spin-button-placement-mode="inline"]) .field { min-width: 120px; }
:host(:focus-within[data-has-text]:not([read-only])) .delete { display: inline-flex; }

.spin {
  display: none;
  flex: none;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  width: 32px;
  min-height: 24px;
  padding: 0;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: var(--w-text-fill-color-secondary);
  cursor: default;
  outline: none;
}
.spin.up { margin: 3px 4px 3px 4px; }
.spin.down { margin: 3px 3px 3px 0; }
:host([spin-button-placement-mode="inline"]) .spin { display: inline-flex; }
.spin:hover { background: var(--w-subtle-fill-color-secondary); }
.spin:active, .spin[data-pressed] {
  background: var(--w-subtle-fill-color-tertiary);
  color: var(--w-text-fill-color-tertiary);
}
.spin:disabled {
  background: var(--w-control-fill-color-disabled);
  color: var(--w-text-fill-color-disabled);
}
:host([disabled]) .spin { color: var(--w-text-fill-color-disabled); background: transparent; }
.spin svg { transition: translate var(--w-duration-fast) cubic-bezier(0.2, 1.8, 0.4, 1); }
.spin.up:active svg, .spin.up[data-pressed] svg { translate: 0 -1px; transition-duration: var(--w-duration-faster); }
.spin.down:active svg, .spin.down[data-pressed] svg { translate: 0 1px; transition-duration: var(--w-duration-faster); }

.indicator {
  display: none;
  flex: none;
  align-self: center;
  margin: 0 8px 0 0;
  color: var(--w-text-fill-color-secondary);
}
:host([spin-button-placement-mode="compact"]) .indicator { display: inline-flex; }
:host([disabled]) .indicator { color: var(--w-text-fill-color-disabled); }

${popupResetCss('.popup')}
.popup-root {
  display: flex;
  flex-direction: column;
  gap: 4px;
  padding: 6px;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-tooltip);
}
.pspin {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 36px;
  height: 36px;
  padding: 0;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: var(--w-text-fill-color-secondary);
  cursor: default;
  outline: none;
}
.pspin:hover { background: var(--w-subtle-fill-color-secondary); }
.pspin:active, .pspin[data-pressed] { background: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-tertiary); }
.pspin:disabled { color: var(--w-text-fill-color-disabled); background: transparent; }
`;

const REPEAT_DELAY = 250;
const REPEAT_INTERVAL = 250;

export class WinNumberBox extends FieldElement {
  static override styles = [fieldCss, numberBoxCss];
  static override template = fieldTemplate(
    `<input class="input" part="input" type="text" role="spinbutton" inputmode="decimal" autocomplete="off" spellcheck="false">` +
      `<button class="btn delete" part="delete-button" type="button" tabindex="-1" aria-label="清除">${glyph('clear', 12)}</button>` +
      `<span class="indicator" part="popup-indicator" aria-hidden="true">${upDownGlyph(12)}</span>` +
      `<button class="spin up" part="spin-up" type="button" tabindex="-1" aria-label="增加">${glyph('chevronUp', 12)}</button>` +
      `<button class="spin down" part="spin-down" type="button" tabindex="-1" aria-label="减少">${glyph('chevronDown', 12)}</button>`,
    `<div class="popup" part="spin-popup"><div class="popup-root"><button class="pspin up" type="button" tabindex="-1" aria-label="增加">${glyph('chevronUp', 16)}</button><button class="pspin down" type="button" tabindex="-1" aria-label="减少">${glyph('chevronDown', 16)}</button></div></div>`,
  );
  static override props: PropDefs = {
    value: { type: Number, default: Number.NaN },
    minimum: { type: Number, default: Number.NEGATIVE_INFINITY },
    maximum: { type: Number, default: Number.POSITIVE_INFINITY },
    smallChange: { type: Number, attribute: 'small-change', default: 1 },
    largeChange: { type: Number, attribute: 'large-change', default: 10 },
    spinButtonPlacementMode: {
      type: String,
      attribute: 'spin-button-placement-mode',
      reflect: true,
      default: 'hidden',
    },
    acceptsExpression: { type: Boolean, attribute: 'accepts-expression' },
    isWrapEnabled: { type: Boolean, attribute: 'is-wrap-enabled' },
    validationMode: { type: String, attribute: 'validation-mode', default: 'invalid-input-overwritten' },
    fractionDigits: { type: Number, attribute: 'fraction-digits', default: -1 },
    increment: { type: Number, default: 0 },
    text: { type: String, attribute: false },
  };
  declare value: number;
  declare minimum: number;
  declare maximum: number;
  declare smallChange: number;
  declare largeChange: number;
  declare spinButtonPlacementMode: 'hidden' | 'inline' | 'compact';
  declare acceptsExpression: boolean;
  declare isWrapEnabled: boolean;
  declare validationMode: string;
  declare fractionDigits: number;
  declare increment: number;
  declare text: string;

  numberFormatter: NumberFormatter | null = null;

  static {
    this.define('win-number-box');
  }

  private input!: HTMLInputElement;
  private popup!: Popup;
  private lastValue = Number.NaN;
  private repeatTimer: ReturnType<typeof setTimeout> | null = null;

  protected get editor(): HTMLElement {
    return this.input;
  }

  get min(): number {
    return this.minimum;
  }
  set min(v: number) {
    this.minimum = v;
  }
  get max(): number {
    return this.maximum;
  }
  set max(v: number) {
    this.maximum = v;
  }

  protected override firstConnected(): void {
    this.input = this.$<HTMLInputElement>('.input');
    super.firstConnected();
    const el = this.input;
    const mn = this.getAttribute('min');
    const mx = this.getAttribute('max');
    if (mn !== null && !this.hasAttribute('minimum')) this.minimum = Number(mn);
    if (mx !== null && !this.hasAttribute('maximum')) this.maximum = Number(mx);

    el.addEventListener('input', () => {
      this.toggleAttr('data-has-text', el.value.length > 0);
    });
    el.addEventListener('change', () => this.commit());
    el.addEventListener('blur', () => this.commit());
    el.addEventListener('keydown', (ev) => this.onKey(ev));
    el.addEventListener('focus', () => this.onFocusChanged(true));
    el.addEventListener('blur', () => this.onFocusChanged(false));
    this.addEventListener(
      'wheel',
      (ev) => {
        if (
          this.disabled ||
          this.readOnly ||
          this.spinButtonPlacementMode === 'hidden' ||
          !this.matches(':focus-within')
        )
          return;
        ev.preventDefault();
        this.step(ev.deltaY < 0 ? this.smallChange : -this.smallChange);
      },
      { passive: false },
    );

    const del = this.$('.delete');
    keepFocus(del);
    del.addEventListener('click', () => {
      el.value = '';
      el.dispatchEvent(new InputEvent('input', { bubbles: true, composed: true, inputType: 'deleteContentBackward' }));
      el.focus();
    });

    for (const b of this.$$<HTMLButtonElement>('.spin, .pspin')) {
      keepFocus(b);
      this.wireRepeat(b, b.classList.contains('up') ? 1 : -1);
    }

    this.popup = new Popup(this.$('.popup'), this.$('.popup-root'));
  }

  private wireRepeat(b: HTMLButtonElement, dir: 1 | -1): void {
    const stop = () => {
      if (this.repeatTimer) clearTimeout(this.repeatTimer);
      this.repeatTimer = null;
      b.removeAttribute('data-pressed');
    };
    b.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0 || b.disabled || this.disabled || this.readOnly) return;
      if (this.repeatTimer) clearTimeout(this.repeatTimer);
      b.setPointerCapture(ev.pointerId);
      b.toggleAttribute('data-pressed', true);
      this.step(dir * this.smallChange);
      const tick = (delay: number) => {
        this.repeatTimer = setTimeout(() => {
          if (b.disabled) return stop();
          this.step(dir * this.smallChange);
          tick(REPEAT_INTERVAL);
        }, delay);
      };
      tick(REPEAT_DELAY);
    });
    b.addEventListener('pointerup', stop);
    b.addEventListener('pointercancel', stop);
    b.addEventListener('lostpointercapture', stop);
  }

  private onKey(ev: KeyboardEvent): void {
    if (this.disabled) return;
    let delta: number;
    switch (ev.key) {
      case 'ArrowUp':
        delta = this.smallChange;
        break;
      case 'ArrowDown':
        delta = -this.smallChange;
        break;
      case 'PageUp':
        delta = this.largeChange;
        break;
      case 'PageDown':
        delta = -this.largeChange;
        break;
      case 'Enter':
        this.commit();
        return;
      case 'Escape':
        if (this.input.value !== this.format(this.value)) {
          ev.preventDefault();
          ev.stopPropagation();
          this.updateText();
        }
        return;
      default:
        return;
    }
    if (this.readOnly) return;
    ev.preventDefault();
    this.step(delta);
  }

  private onFocusChanged(focused: boolean): void {
    if (this.spinButtonPlacementMode !== 'compact' || this.disabled) {
      if (this.popup.isOpen) void this.popup.close();
      return;
    }
    if (focused) {
      this.popup.open({
        anchor: this.$('.field'),
        stack: false,
        lightDismiss: false,
        closeOnEscape: false,
        focus: 'none',
        restoreFocus: false,
        position: (size, r) => this.positionPopup(size, r),
        animateIn: (s) => {
          fadeIn(s);
          return animate(s, [{ transform: 'scale(0.92)' }, { transform: 'none' }], {
            duration: durations.normal,
            easing: easings.decelerate,
          });
        },
        animateOut: (s) => popupOut(s),
      });
    } else if (this.popup.isOpen) {
      void this.popup.close();
    }
  }

  private positionPopup(size: { width: number; height: number }, r: DOMRect): PositionResult {
    const vw = document.documentElement.clientWidth;
    const vh = document.documentElement.clientHeight;
    const x = Math.min(r.right - 21, vw - size.width - 4);
    const y = Math.max(4, Math.min(r.top - 27, vh - size.height - 4));
    return { x: Math.round(x), y: Math.round(y), side: 'right', maxHeight: vh, maxWidth: vw };
  }

  private clamp(v: number): number {
    if (Number.isNaN(v)) return v;
    return Math.min(this.maximum, Math.max(this.minimum, v));
  }

  private round(v: number): number {
    if (Number.isNaN(v)) return v;
    if (this.numberFormatter) return v;
    let x = v;
    if (this.increment > 0) x = Math.round(x / this.increment) * this.increment;
    if (this.fractionDigits >= 0) x = Number(x.toFixed(this.fractionDigits));
    return Number(x.toPrecision(15));
  }

  format(v: number): string {
    if (Number.isNaN(v)) return '';
    if (this.numberFormatter) return this.numberFormatter.format(v);
    const x = this.round(v);
    if (this.fractionDigits >= 0) return x.toFixed(this.fractionDigits);
    return String(Number(x.toPrecision(12)));
  }

  commit(): void {
    const raw = this.input.value.trim();
    if (raw === '') {
      this.setValue(Number.NaN);
      this.updateText();
      return;
    }
    let v = this.acceptsExpression ? evaluateExpression(raw) : Number.NaN;
    if (Number.isNaN(v)) v = this.numberFormatter ? this.numberFormatter.parse(raw) : parseNumber(raw);
    if (Number.isNaN(v)) {
      if (this.validationMode !== 'disabled') this.updateText();
      return;
    }
    this.setValue(this.clamp(this.round(v)));
    this.updateText();
  }

  step(change: number): void {
    if (this.disabled || this.readOnly) return;
    if (this.input.value.trim() !== this.format(this.value)) this.commit();
    let v = Number.isNaN(this.value) ? 0 : this.value;
    v += change;
    if (this.isWrapEnabled && Number.isFinite(this.minimum) && Number.isFinite(this.maximum)) {
      if (v > this.maximum) v = this.minimum;
      else if (v < this.minimum) v = this.maximum;
    }
    this.setValue(this.clamp(this.round(v)));
    this.updateText();
    if (this.matches(':focus-within')) {
      const n = this.input.value.length;
      this.input.setSelectionRange(n, n);
    }
  }

  private setValue(v: number): void {
    if (Object.is(v, this.value) || (Number.isNaN(v) && Number.isNaN(this.value))) return;
    this.value = v;
    this.flushUpdates();
  }

  private updateText(): void {
    const t = this.format(this.value);
    if (this.input.value !== t) this.input.value = t;
    this.toggleAttr('data-has-text', t.length > 0);
    this.text = t;
  }

  private syncSpinStates(): void {
    const v = this.value;
    const wrap = this.isWrapEnabled;
    const upOff = this.disabled || this.readOnly || (!wrap && !Number.isNaN(v) && v >= this.maximum);
    const downOff = this.disabled || this.readOnly || (!wrap && !Number.isNaN(v) && v <= this.minimum);
    for (const b of this.$$<HTMLButtonElement>('.up')) b.disabled = upOff;
    for (const b of this.$$<HTMLButtonElement>('.down')) b.disabled = downOff;
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
    if (changed.has('minimum') || changed.has('maximum')) {
      if (Number.isFinite(this.minimum)) el.setAttribute('aria-valuemin', String(this.minimum));
      else el.removeAttribute('aria-valuemin');
      if (Number.isFinite(this.maximum)) el.setAttribute('aria-valuemax', String(this.maximum));
      else el.removeAttribute('aria-valuemax');
      if (!first) {
        const c = this.clamp(this.value);
        if (!Object.is(c, this.value) && !Number.isNaN(c)) this.value = c;
      }
    }
    if (changed.has('value')) {
      const c = this.clamp(this.value);
      if (!Number.isNaN(c) && c !== this.value) {
        this.value = c;
        return;
      }
      const old = this.lastValue;
      const v = this.value;
      this.lastValue = v;
      if (!(Number.isNaN(old) && Number.isNaN(v)) && old !== v) {
        if (!first) this.emit('valuechanged', { oldValue: old, newValue: v });
      }
      this.updateText();
      if (Number.isNaN(v)) {
        el.removeAttribute('aria-valuenow');
        el.removeAttribute('aria-valuetext');
      } else {
        el.setAttribute('aria-valuenow', String(v));
        el.setAttribute('aria-valuetext', this.format(v));
      }
      this.internals.setFormValue(Number.isNaN(v) ? '' : String(v));
      if (this.required && Number.isNaN(v)) this.internals.setValidity({ valueMissing: true }, '请输入数值', el);
      else this.internals.setValidity({});
    } else if (['fractionDigits', 'increment'].some((k) => changed.has(k))) {
      this.updateText();
    }
    if (changed.has('spinButtonPlacementMode') && this.popup?.isOpen && this.spinButtonPlacementMode !== 'compact') {
      void this.popup.close();
    }
    this.syncSpinStates();
  }

  formResetCallback(): void {
    const a = this.getAttribute('value');
    this.value = a === null ? Number.NaN : Number(a);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-number-box': WinNumberBox;
  }
}
