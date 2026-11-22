import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { escapeHtml } from '../../base/element.ts';
import { parseColor, toCssRgba } from './color.ts';
import { localized } from './shared.ts';
import { navigateIndex } from '../../base/keyboard.ts';
import { isRtl } from '../../base/dom.ts';
import '../buttons/button.ts';
import '../flyouts/flyout.ts';
import './color-picker.ts';

const DEFAULT_PALETTE = [
  '#FFB900',
  '#FF8C00',
  '#F7630C',
  '#CA5010',
  '#DA3B01',
  '#EF6950',
  '#D13438',
  '#FF4343',
  '#E74856',
  '#E81123',
  '#EA005E',
  '#C30052',
  '#E3008C',
  '#BF0077',
  '#C239B3',
  '#9A0089',
  '#0078D4',
  '#0063B1',
  '#8E8CD8',
  '#6B69D6',
  '#8764B8',
  '#744DA9',
  '#B146C2',
  '#881798',
  '#0099BC',
  '#2D7D9A',
  '#00B7C3',
  '#038387',
  '#00B294',
  '#018574',
  '#00CC6A',
  '#10893E',
  '#7A7574',
  '#5D5A58',
  '#68768A',
  '#515C6B',
  '#567C73',
  '#486860',
  '#498205',
  '#107C10',
];

const buttonCss = css`
:host { display: inline-flex; vertical-align: middle; }
win-drop-down-button { padding-inline: 8px 11px; }
.swatch {
  position: relative;
  display: inline-block;
  width: 32px;
  height: 20px;
  border-radius: var(--w-corner-radius-control);
  overflow: hidden;
  box-shadow: inset 0 0 0 1px var(--w-control-stroke-color-default);
}
.swatch > span { position: absolute; inset: 0; }
.checker {
  background: conic-gradient(color-mix(in srgb, var(--w-text-fill-color-primary) 11%, transparent) 25%, transparent 0 50%, color-mix(in srgb, var(--w-text-fill-color-primary) 11%, transparent) 0 75%, transparent 0) 0 0 / 8px 8px;
}
.fill { background: var(--swatch, #fff); box-shadow: inset 0 0 0 1px var(--w-control-stroke-color-default); border-radius: inherit; }
.flyout-body { display: flex; flex-direction: column; gap: 12px; }
.palette {
  display: grid;
  grid-template-columns: repeat(8, 28px);
  gap: 4px;
}
.palette[hidden] { display: none; }
.palette button {
  width: 28px;
  height: 28px;
  padding: 0;
  border: 1px solid var(--w-control-stroke-color-default);
  border-radius: var(--w-corner-radius-control);
  background: var(--c);
  cursor: default;
  outline: none;
  transition: transform var(--w-duration-fast) var(--w-ease-decelerate);
}
.palette button:hover { transform: scale(1.08); }
.palette button[aria-checked="true"] {
  box-shadow: 0 0 0 2px var(--w-solid-background-fill-color-quarternary), 0 0 0 3px var(--w-text-fill-color-primary);
}
${focusRing('.palette button:focus-visible', 3)}
.buttons {
  position: sticky;
  bottom: -17px;
  z-index: 1;
  container-type: scroll-state;
  margin: -17px -16px -17px;
}
.buttons[hidden] { display: none; }
.bar {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 8px;
  padding: 12px 16px 17px;
  border-top: 1px solid transparent;
}
@container scroll-state(stuck: bottom) {
  .bar {
    background: var(--w-acrylic-in-app-fill-color-default-fallback);
    border-top-color: var(--w-divider-stroke-color-default);
  }
}
.bar win-button { width: 100%; }
`;

export class WinColorPickerButton extends WinElement {
  static override styles = [buttonCss];
  static override template = `<win-drop-down-button part="button" aria-label="Color"><span class="swatch" part="swatch"><span class="checker"></span><span class="fill"></span></span><win-flyout slot="flyout" placement="bottom-start" part="flyout"><div class="flyout-body"><div class="palette" part="palette" role="radiogroup"></div><win-color-picker part="picker" more-button-visible></win-color-picker><div class="buttons" part="buttons" hidden><div class="bar"><win-button appearance="accent" class="ok" part="ok-button"></win-button><win-button class="cancel" part="cancel-button"></win-button></div></div></div></win-flyout></win-drop-down-button>`;
  static override props: PropDefs = {
    color: { type: String, default: '#0078D4' },
    alphaEnabled: { type: Boolean, attribute: 'alpha-enabled' },
    colorSpectrumShape: { type: String, attribute: 'color-spectrum-shape', default: 'box' },
    paletteVisible: { type: Boolean, attribute: 'palette-visible', default: true },
    confirm: { type: Boolean },
    showConfirmButtons: { type: Boolean, attribute: 'show-confirm-buttons' },
    okText: { type: String, attribute: 'ok-text' },
    cancelText: { type: String, attribute: 'cancel-text' },
    palette: { type: String },
    disabled: { type: Boolean },
  };
  declare color: string;
  declare alphaEnabled: boolean;
  declare colorSpectrumShape: string;
  declare paletteVisible: boolean;
  declare palette: string;
  declare disabled: boolean;
  declare confirm: boolean;
  declare showConfirmButtons: boolean;
  declare okText: string;
  declare cancelText: string;

  private fromPicker = false;
  private pending: string | null = null;
  private committed = false;

  private get confirming(): boolean {
    return this.confirm || this.showConfirmButtons;
  }

  private get flyoutEl(): HTMLElement & { hide(): void; isOpen: boolean } {
    return this.$('win-flyout') as HTMLElement & { hide(): void; isOpen: boolean };
  }

  private syncPaletteChecked(color: string): void {
    const cur = (color || '').toUpperCase();
    for (const b of this.$$<HTMLButtonElement>('.palette button')) {
      b.setAttribute('aria-checked', String((b.dataset.c ?? '').toUpperCase() === cur));
    }
    this.syncPaletteTabStops();
  }

  private syncPaletteTabStops(focused?: HTMLButtonElement): void {
    const btns = this.$$<HTMLButtonElement>('.palette button');
    const target = focused ?? btns.find((b) => b.getAttribute('aria-checked') === 'true') ?? btns[0];
    for (const b of btns) b.tabIndex = b === target ? 0 : -1;
  }

  private commit(color: string): void {
    const old = this.color;
    if (color.toUpperCase() === (old || '').toUpperCase()) return;
    this.color = color;
    this.flushUpdates();
    this.emit('colorchanged', { color: this.color, oldColor: old });
  }

  static {
    this.define('win-color-picker-button');
  }

  private get picker(): HTMLElement & { color: string; alphaEnabled: boolean; colorSpectrumShape: string } {
    return this.$('win-color-picker') as HTMLElement & {
      color: string;
      alphaEnabled: boolean;
      colorSpectrumShape: string;
    };
  }

  protected override firstConnected(): void {
    this.picker.addEventListener('colorchanged', (ev) => {
      ev.stopPropagation();
      const detail = (ev as CustomEvent<{ color: string; oldColor: string }>).detail;
      if (this.confirming) {
        this.pending = detail.color;
        this.syncPaletteChecked(detail.color);
        return;
      }
      this.fromPicker = true;
      this.color = detail.color;
      this.flushUpdates();
      this.fromPicker = false;
      this.emit('colorchanged', detail);
    });
    this.picker.addEventListener('change', (ev) => ev.stopPropagation());
    this.$('.palette').addEventListener('keydown', (ev) => {
      const btns = this.$$<HTMLButtonElement>('.palette button');
      const cur = btns.indexOf(ev.target as HTMLButtonElement);
      if (cur < 0) return;
      const cols = getComputedStyle(this.$('.palette')).gridTemplateColumns.split(' ').filter(Boolean).length || 8;
      const next = navigateIndex(ev.key, cur, btns.length, { axis: 'grid', columns: cols, rtl: isRtl(this) });
      if (next < 0) return;
      ev.preventDefault();
      this.syncPaletteTabStops(btns[next]);
      btns[next]!.focus();
    });
    this.$('.palette').addEventListener('click', (ev) => {
      const b = (ev.target as Element).closest('button');
      if (!b) return;
      const c = b.dataset.c!;
      if (this.confirming) {
        this.pending = c;
        this.picker.color = c;
        this.syncPaletteChecked(c);
        return;
      }
      this.commit(c);
    });
    const flyout = this.flyoutEl;
    flyout.addEventListener('opening', () => {
      this.pending = null;
      this.committed = false;
      this.picker.color = this.color;
      this.syncPaletteChecked(this.color);
    });
    flyout.addEventListener('closed', () => {
      if (!this.confirming) return;
      if (!this.committed) {
        this.picker.color = this.color;
        this.syncPaletteChecked(this.color);
      }
      this.pending = null;
    });
    this.$('.ok').addEventListener('click', () => {
      this.committed = true;
      if (this.pending) this.commit(this.pending);
      flyout.hide();
    });
    this.$('.cancel').addEventListener('click', () => flyout.hide());
    const onFocusIn = (ev: Event) => {
      const target = ev.composedPath()[0];
      if (!this.confirming || !(target instanceof Element) || this.$('.buttons').contains(target)) return;
      this.revealAboveButtons(target);
      requestAnimationFrame(() => this.revealAboveButtons(target));
    };
    this.$('.flyout-body').addEventListener('focusin', onFocusIn);
    this.picker.shadowRoot?.addEventListener('focusin', onFocusIn);
  }

  private revealAboveButtons(el: Element): void {
    const bar = this.$('.bar').getBoundingClientRect();
    const r = el.getBoundingClientRect();
    const overlap = r.bottom + 8 - bar.top;
    if (overlap <= 0 || !r.height) return;
    for (let n: Element | null = this.$('.flyout-body'); n;) {
      n = n.assignedSlot ?? n.parentElement ?? (n.parentNode as ShadowRoot | null)?.host ?? null;
      if (n && n.scrollHeight > n.clientHeight && /auto|scroll/.test(getComputedStyle(n).overflowY)) {
        n.scrollTop += overlap;
        return;
      }
    }
  }

  private renderPalette(): void {
    const list = this.palette ? this.palette.split(/[;,\s]+/).filter(Boolean) : DEFAULT_PALETTE;
    const cur = (this.color || '').toUpperCase();
    this.$('.palette').innerHTML = list
      .map((c) => {
        const safe = escapeHtml(c);
        return `<button type="button" role="radio" aria-label="${safe}" aria-checked="${c.toUpperCase() === cur}" data-c="${safe}" style="--c:${safe}"></button>`;
      })
      .join('');
    this.syncPaletteTabStops();
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('color')) {
      const c = parseColor(this.color);
      this.style.setProperty('--swatch', c ? toCssRgba(c) : 'transparent');
      if (!this.fromPicker) this.picker.color = this.color;
      for (const b of this.$$<HTMLButtonElement>('.palette button')) {
        b.setAttribute('aria-checked', String((b.dataset.c ?? '').toUpperCase() === (this.color || '').toUpperCase()));
      }
    }
    if (changed.has('palette')) this.renderPalette();
    if (changed.has('paletteVisible')) this.$('.palette').hidden = !this.paletteVisible;
    if (changed.has('alphaEnabled')) this.picker.alphaEnabled = this.alphaEnabled;
    if (changed.has('colorSpectrumShape')) this.picker.colorSpectrumShape = this.colorSpectrumShape;
    if (changed.has('disabled')) this.$('win-drop-down-button').toggleAttribute('disabled', this.disabled);
    if (changed.has('confirm') || changed.has('showConfirmButtons')) this.$('.buttons').hidden = !this.confirming;
    if (changed.has('okText')) this.$('.ok').textContent = this.okText || localized('ok');
    if (changed.has('cancelText')) this.$('.cancel').textContent = this.cancelText || localized('cancel');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-color-picker-button': WinColorPickerButton;
  }
}
