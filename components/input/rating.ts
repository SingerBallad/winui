import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { chromeGlyphs } from '../../base/icons.ts';
import { clamp, focusRect } from './shared.ts';

const NO_VALUE = -1;

const ratingCss = css`
:host {
  --unselected: var(--w-text-fill-color-secondary);
  --fg: var(--w-accent-fill-color-default);
  display: inline-flex;
  align-items: center;
  position: relative;
  box-sizing: border-box;
  min-height: 32px;
  vertical-align: middle;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-secondary);
  font: var(--w-type-body);
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
  outline: none;
}
${focusRect(':host(:focus-visible)::after', { top: 7, right: 8, bottom: 0, left: 8 }, 7)}
.stars {
  display: inline-flex;
  gap: 8px;
  align-items: center;
  cursor: default;
}
.item {
  position: relative;
  width: 16px;
  height: 16px;
  transform-origin: 50% 80%;
  transition: scale var(--w-duration-faster) linear;
}
.item svg {
  position: absolute;
  inset: 0;
  width: 16px;
  height: 16px;
  overflow: visible;
}
.bg path { fill: none; stroke: var(--unselected); stroke-width: 1; stroke-linejoin: round; }
.fg { clip-path: inset(0 var(--clip, 100%) 0 0); }
:host(:dir(rtl)) .fg { clip-path: inset(0 0 0 var(--clip, 100%)); }
.fg path { fill: var(--fg); stroke: none; }
.caption {
  margin-inline-start: 12px;
  font: var(--w-type-caption);
  color: var(--w-text-fill-color-secondary);
  white-space: nowrap;
}
.caption:empty { display: none; }

:host([data-state="placeholder"]) { --fg: var(--w-text-fill-color-primary); }
:host([data-state="pointer-over-placeholder"]) { --fg: var(--w-control-alt-fill-color-tertiary); }
:host([data-state="pointer-over-set"]) { --fg: var(--w-accent-fill-color-default); }
:host([disabled]) {
  --fg: var(--w-text-fill-color-disabled);
  pointer-events: none;
}
:host([read-only]) .stars { cursor: default; }
`;

function starSvg(cls: 'bg' | 'fg'): string {
  const d = cls === 'bg' ? chromeGlyphs.star.d : chromeGlyphs.starFill.fill;
  return `<svg class="${cls}" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="${d}"/></svg>`;
}

export class WinRating extends WinElement {
  static override styles = [ratingCss];
  static override formAssociated = true;
  static override template = `<div class="stars" part="stars"></div><span class="caption" part="caption"></span>`;
  static override props: PropDefs = {
    value: { type: Number, default: NO_VALUE },
    maxRating: { type: Number, attribute: 'max-rating', default: 5 },
    placeholderValue: { type: Number, attribute: 'placeholder-value', default: NO_VALUE },
    caption: { type: String },
    clearEnabled: { type: Boolean, attribute: 'clear-enabled', default: true },
    readOnly: { type: Boolean, attribute: 'read-only' },
    disabled: { type: Boolean },
    name: { type: String },
  };
  declare value: number;
  declare maxRating: number;
  declare placeholderValue: number;
  declare caption: string;
  declare clearEnabled: boolean;
  declare readOnly: boolean;
  declare disabled: boolean;
  declare name: string;

  private pointerOver = false;
  private hoverValue = 0;
  private pointerX = 0;

  static {
    this.define('win-rating');
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'slider');
    const stars = this.$('.stars');
    stars.addEventListener('pointermove', (ev) => {
      if (this.readOnly || this.disabled) return;
      this.pointerOver = true;
      const r = stars.getBoundingClientRect();
      const rtl = getComputedStyle(this).direction === 'rtl';
      let x = ev.clientX - r.left;
      if (rtl) x = r.width - x;
      this.pointerX = x;
      const pct = clamp(x / Math.max(1, r.width), 0, 1);
      this.hoverValue = clamp(Math.ceil(pct * this.maxRating), 1, this.maxRating);
      this.render();
    });
    stars.addEventListener('pointerleave', () => {
      this.pointerOver = false;
      this.render();
    });
    stars.addEventListener('click', () => {
      if (this.readOnly || this.disabled || !this.pointerOver) return;
      const v = this.hoverValue;
      this.setFromUser(v === this.value && this.clearEnabled ? NO_VALUE : v);
    });
    this.addEventListener('keydown', (ev) => this.onKey(ev));
  }

  private onKey(ev: KeyboardEvent): void {
    if (this.readOnly || this.disabled) return;
    const rtl = getComputedStyle(this).direction === 'rtl';
    const cur = this.value === NO_VALUE ? 0 : this.value;
    let v: number | null;
    switch (ev.key) {
      case 'ArrowRight':
        v = cur + (rtl ? -1 : 1);
        break;
      case 'ArrowUp':
        v = cur + 1;
        break;
      case 'ArrowLeft':
        v = cur + (rtl ? 1 : -1);
        break;
      case 'ArrowDown':
        v = cur - 1;
        break;
      case 'Home':
        v = this.clearEnabled ? 0 : 1;
        break;
      case 'End':
        v = this.maxRating;
        break;
      default:
        return;
    }
    ev.preventDefault();
    v = Math.round(v);
    if (v <= 0) v = this.clearEnabled ? NO_VALUE : 1;
    this.setFromUser(Math.min(v, this.maxRating));
  }

  private setFromUser(v: number): void {
    if (v === this.value) return;
    const old = this.value;
    this.value = v;
    this.flushUpdates();
    this.emit('valuechanged', { value: v, oldValue: old });
    this.emit('change', { value: v });
  }

  private buildItems(): void {
    const stars = this.$('.stars');
    const n = Math.max(1, Math.floor(this.maxRating) || 5);
    if (stars.children.length === n) return;
    let html = '';
    for (let i = 1; i <= n; i++) html += `<span class="item" data-i="${i}">${starSvg('bg')}${starSvg('fg')}</span>`;
    stars.innerHTML = html;
  }

  private render(): void {
    const items = this.$$<HTMLElement>('.item');
    let shown = 0;
    let state = 'unset';
    if (this.pointerOver) {
      shown = this.hoverValue;
      state = this.value === NO_VALUE ? 'pointer-over-placeholder' : 'pointer-over-set';
    } else if (this.value > NO_VALUE) {
      shown = this.value;
      state = 'set';
    } else if (this.placeholderValue > NO_VALUE) {
      shown = this.placeholderValue;
      state = 'placeholder';
    }
    this.dataset.state = state;
    const pitch = 24;
    items.forEach((el, k) => {
      const frac = clamp(shown - k, 0, 1);
      el.style.setProperty('--clip', `${((1 - frac) * 100).toFixed(2)}%`);
      if (this.pointerOver) {
        const cx = k * pitch + 8;
        const d = this.pointerX - cx;
        const s = Math.max(1, 1.6 * (1 - 0.0005 * d * d));
        el.style.scale = s.toFixed(3);
      } else el.style.scale = '';
    });
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('maxRating')) this.buildItems();
    if (changed.has('caption')) this.$('.caption').textContent = this.caption;
    if (changed.has('disabled') || changed.has('readOnly')) {
      this.setFocusable(!this.disabled);
      this.aria('aria-disabled', this.disabled ? 'true' : null);
      this.aria('aria-readonly', this.readOnly ? 'true' : null);
    }
    if (changed.has('value') || changed.has('placeholderValue') || changed.has('maxRating')) {
      const v = this.value === NO_VALUE ? 0 : this.value;
      this.aria('aria-valuemin', 0);
      this.aria('aria-valuemax', this.maxRating);
      this.aria('aria-valuenow', v);
      this.aria('aria-valuetext', this.value === NO_VALUE ? '未评分' : `${v} / ${this.maxRating}`);
      this.internals.setFormValue(this.value === NO_VALUE ? null : String(this.value));
      this.render();
    }
  }

  formResetCallback(): void {
    this.value = NO_VALUE;
  }

  formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-rating': WinRating;
  }
}
