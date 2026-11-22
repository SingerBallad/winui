import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { clamp, focusRect, localized, textInputCss } from './shared.ts';
import {
  hsvToRgb,
  luminance,
  parseColor,
  parseArgbHex,
  rgbToHsv,
  toCssHex,
  toCssRgba,
  toArgbHex,
  type Hsva,
} from './color.ts';
import './combo-box.ts';

const pickerCss = css`
:host {
  --checker: color-mix(in srgb, var(--w-text-fill-color-primary) 11%, transparent);
  display: block;
  box-sizing: border-box;
  min-width: 312px;
  max-width: 392px;
  padding: 4px 0;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  user-select: none;
  -webkit-user-select: none;
}
:host([orientation="horizontal"]) {
  min-width: 0;
  max-width: none;
  min-height: 312px;
  max-height: 392px;
}
.layout { display: flex; flex-direction: column; }
:host([orientation="horizontal"]) .layout {
  flex-direction: row;
  align-items: stretch;
}
.checker {
  background:
    conic-gradient(var(--checker) 25%, transparent 0 50%, var(--checker) 0 75%, transparent 0) 0 0 / 8px 8px;
}

.spectrum-grid { display: flex; margin: 0 0 16px; }
:host([orientation="horizontal"]) .spectrum-grid { margin: 0; }
.spectrum {
  position: relative;
  flex: 1 1 auto;
  min-width: 256px;
  max-width: 336px;
  aspect-ratio: 1;
  border-radius: var(--w-corner-radius-control);
  outline: none;
  touch-action: none;
  cursor: default;
}
:host([orientation="horizontal"]) .spectrum { width: 256px; flex: none; }
.spec-surface, .spec-shade, .spec-border {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  pointer-events: none;
}
.spec-surface {
  background:
    linear-gradient(to bottom, rgba(255, 255, 255, 0), #fff),
    linear-gradient(to right, #f00 0%, #ff0 16.67%, #0f0 33.33%, #0ff 50%, #00f 66.67%, #f0f 83.33%, #f00 100%);
}
.spec-shade { background: #000; opacity: calc(1 - var(--v, 1)); }
.spec-border { border: 2px solid var(--w-control-stroke-color-default); }
:host([color-spectrum-shape="ring"]) .spectrum { border-radius: 50%; }
:host([color-spectrum-shape="ring"]) .spec-surface {
  background:
    radial-gradient(circle closest-side, #fff, rgba(255, 255, 255, 0)),
    conic-gradient(from 90deg, #f00, #f0f, #00f, #0ff, #0f0, #ff0, #f00);
}
.sel {
  position: absolute;
  left: var(--sx, 0%);
  top: var(--sy, 0%);
  width: 16px;
  height: 16px;
  margin: -8px 0 0 -8px;
  box-sizing: border-box;
  border-radius: 50%;
  border: 2px solid var(--sel-stroke, #fff);
  pointer-events: none;
  transition: opacity var(--w-duration-faster) linear, width var(--w-duration-fast) var(--w-ease-decelerate), height var(--w-duration-fast) var(--w-ease-decelerate), margin var(--w-duration-fast) var(--w-ease-decelerate);
}
.spectrum:hover .sel { opacity: 0.8; }
.spectrum[data-touch] .sel { width: 48px; height: 48px; margin: -24px 0 0 -24px; }
.spectrum:focus-visible .sel::before {
  content: '';
  position: absolute;
  inset: -4px;
  border-radius: 50%;
  border: 2px solid var(--sel-focus, #000);
}
.spectrum[data-dark] { --sel-stroke: #000; --sel-focus: #fff; }

.preview {
  position: relative;
  width: 44px;
  margin-inline-start: 12px;
  flex: none;
  border-radius: var(--w-corner-radius-control);
  overflow: hidden;
}
:host([orientation="horizontal"]) .preview { margin: 0 16px 0 12px; }
.preview > span { position: absolute; inset: 0; }
.preview .cur { background: var(--cur); }
.preview .prev { display: none; top: 50%; background: var(--prev); }
.preview[data-prev] .cur { bottom: 50%; }
.preview[data-prev] .prev { display: block; }
.preview .pborder { border: 2px solid var(--w-control-stroke-color-default); border-radius: inherit; }

.cslider {
  position: relative;
  height: 32px;
  outline: none;
  touch-action: none;
  border-radius: var(--w-corner-radius-control);
  cursor: default;
}
.cslider.value { margin: 0 0 6px; }
.cslider.alpha { margin: 0 0 16px; }
${focusRect('.cslider:focus-visible::after', { top: 0, right: 7, bottom: 0, left: 7 }, 7)}
.cslider .bar {
  position: absolute;
  left: 0; right: 0;
  top: 10px;
  height: 12px;
  border-radius: 6px;
}
.cslider.value .grad { background: linear-gradient(to right, #000, var(--full)); }
.cslider.alpha .grad { background: linear-gradient(to right, rgba(0, 0, 0, 0), var(--opaque)); }
.cslider .thumb {
  position: absolute;
  top: 7px;
  left: calc((100% - 18px) * var(--p, 0));
  width: 18px;
  height: 18px;
  box-sizing: border-box;
  border-radius: 10px;
  border: 1px solid;
  border-color: var(--w-control-elevation-border);
  background: var(--w-control-solid-fill-color-default);
  background-clip: padding-box;
}
.cslider .inner {
  position: absolute;
  left: 50%;
  top: 50%;
  width: 10px;
  height: 10px;
  margin: -5px 0 0 -5px;
  border-radius: 50%;
  background: var(--w-text-fill-color-primary);
}
.cslider:hover .inner { background: color-mix(in srgb, var(--w-text-fill-color-primary) 92%, var(--w-control-solid-fill-color-default)); }
:host([orientation="horizontal"]) .cslider { height: auto; width: 32px; margin: 0 6px 0 0; }
:host([orientation="horizontal"]) .cslider.alpha { margin: 0 16px 0 0; }
:host([orientation="horizontal"]) .cslider .bar { top: 0; bottom: 0; left: 10px; right: auto; width: 12px; height: auto; }
:host([orientation="horizontal"]) .cslider.value .grad { background: linear-gradient(to top, #000, var(--full)); }
:host([orientation="horizontal"]) .cslider.alpha .grad { background: linear-gradient(to top, rgba(0, 0, 0, 0), var(--opaque)); }
:host([orientation="horizontal"]) .cslider .thumb { top: auto; left: 7px; bottom: calc((100% - 18px) * var(--p, 0)); }
${focusRect(':host([orientation="horizontal"]) .cslider:focus-visible::after', { top: 7, right: 0, bottom: 7, left: 0 }, 7)}

.more { display: flex; flex-direction: column; margin: 0 0 12px; }
:host([orientation="horizontal"]) .more { margin: 0; min-width: 257px; }
.more-btn {
  align-self: flex-end;
  display: inline-flex;
  align-items: center;
  justify-content: flex-end;
  min-width: 120px;
  min-height: 32px;
  padding: 5px 0 7px;
  border: 1px solid transparent;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: var(--w-text-fill-color-primary);
  font: inherit;
  cursor: default;
  outline: none;
}
.more-btn:hover { color: var(--w-text-fill-color-secondary); }
.more-btn:active { color: var(--w-text-fill-color-tertiary); }
.more-btn:focus-visible { outline: 2px solid var(--w-focus-stroke-color-outer); outline-offset: 1px; box-shadow: 0 0 0 1px var(--w-focus-stroke-color-inner); }
.more-btn .chev { display: inline-flex; margin-inline-start: 8px; transition: transform var(--w-duration-normal) var(--w-ease-decelerate); }
.more-btn[aria-expanded="true"] .chev { transform: rotate(180deg); }
.more-btn[hidden] { display: none; }

.entry {
  display: grid;
  grid-template-columns: 1fr 5px 1fr;
  align-items: start;
}
.entry[hidden] { display: none; }
.rep { grid-column: 1; grid-row: 1; width: 120px; }
.hex-box { grid-column: 3; grid-row: 1; width: 132px; justify-self: end; }
:host([color-channel-text-input-visible="false"]) .hex-box { grid-column: 1; justify-self: start; }
.channels { grid-column: 1 / -1; grid-row: 2; display: flex; flex-direction: column; }
.channels[hidden] { display: none; }
.ch-row { display: flex; align-items: center; gap: 8px; margin-top: 12px; }
.ch-row .w-tb { width: 120px; flex: none; }
.ch-row .lbl { white-space: nowrap; }
.alpha-row { grid-column: 1 / -1; grid-row: 3; }
.alpha-row[hidden] { display: none; }

:host([disabled]) { pointer-events: none; }
:host([disabled]) .cslider .inner { background: var(--w-control-strong-fill-color-disabled); }
:host([disabled]) .spectrum, :host([disabled]) .cslider .bar { opacity: 0.5; }
`;

type Channel = 'r' | 'g' | 'b' | 'h' | 's' | 'v' | 'a';

export class WinColorPicker extends WinElement {
  static override styles = [textInputCss, pickerCss];
  static override template = `<div class="layout" part="layout">
<div class="spectrum-grid">
  <div class="spectrum" part="spectrum" tabindex="0" role="slider" aria-roledescription="color spectrum"><span class="spec-surface"></span><span class="spec-shade"></span><span class="spec-border"></span><span class="sel" part="selection"></span></div>
  <div class="preview" part="preview"><span class="checker"></span><span class="cur"></span><span class="prev"></span><span class="pborder"></span></div>
</div>
<div class="cslider value" part="value-slider" tabindex="0" role="slider"><span class="bar grad"></span><span class="thumb"><span class="inner"></span></span></div>
<div class="cslider alpha" part="alpha-slider" tabindex="0" role="slider"><span class="bar checker"></span><span class="bar grad"></span><span class="thumb"><span class="inner"></span></span></div>
<div class="more">
  <button class="more-btn" type="button" part="more-button" aria-expanded="false" hidden><span class="more-label"></span><span class="chev">${glyph('chevronDown', 12)}</span></button>
  <div class="entry" part="text-entry">
    <win-combo-box class="rep" part="representation"><win-combo-box-item selected>RGB</win-combo-box-item><win-combo-box-item>HSV</win-combo-box-item></win-combo-box>
    <span class="w-tb hex-box"><input class="w-textbox hex" part="hex-input" maxlength="7" spellcheck="false" autocomplete="off" aria-label="Hex"></span>
    <div class="channels rgb">
      <label class="ch-row"><span class="w-tb"><input class="w-textbox" data-ch="r" maxlength="3" inputmode="numeric"></span><span class="lbl" data-l="red"></span></label>
      <label class="ch-row"><span class="w-tb"><input class="w-textbox" data-ch="g" maxlength="3" inputmode="numeric"></span><span class="lbl" data-l="green"></span></label>
      <label class="ch-row"><span class="w-tb"><input class="w-textbox" data-ch="b" maxlength="3" inputmode="numeric"></span><span class="lbl" data-l="blue"></span></label>
    </div>
    <div class="channels hsv" hidden>
      <label class="ch-row"><span class="w-tb"><input class="w-textbox" data-ch="h" maxlength="3" inputmode="numeric"></span><span class="lbl" data-l="hue"></span></label>
      <label class="ch-row"><span class="w-tb"><input class="w-textbox" data-ch="s" maxlength="3" inputmode="numeric"></span><span class="lbl" data-l="saturation"></span></label>
      <label class="ch-row"><span class="w-tb"><input class="w-textbox" data-ch="v" maxlength="3" inputmode="numeric"></span><span class="lbl" data-l="value"></span></label>
    </div>
    <label class="ch-row alpha-row"><span class="w-tb"><input class="w-textbox" data-ch="a" maxlength="4"></span><span class="lbl" data-l="opacity"></span></label>
  </div>
</div>
</div>`;
  static override props: PropDefs = {
    color: { type: String, default: '#FFFFFF' },
    previousColor: { type: String, attribute: 'previous-color' },
    alphaEnabled: { type: Boolean, attribute: 'alpha-enabled' },
    colorSpectrumShape: { type: String, attribute: 'color-spectrum-shape', reflect: true, default: 'box' },
    orientation: { type: String, reflect: true, default: 'vertical' },
    moreButtonVisible: { type: Boolean, attribute: 'more-button-visible' },
    colorSpectrumVisible: { type: Boolean, attribute: 'color-spectrum-visible', default: true },
    colorPreviewVisible: { type: Boolean, attribute: 'color-preview-visible', default: true },
    colorSliderVisible: { type: Boolean, attribute: 'color-slider-visible', default: true },
    alphaSliderVisible: { type: Boolean, attribute: 'alpha-slider-visible', default: true },
    colorChannelTextInputVisible: { type: Boolean, attribute: 'color-channel-text-input-visible', default: true },
    hexInputVisible: { type: Boolean, attribute: 'hex-input-visible', default: true },
    alphaTextInputVisible: { type: Boolean, attribute: 'alpha-text-input-visible', default: true },
    disabled: { type: Boolean },
  };
  declare color: string;
  declare previousColor: string;
  declare alphaEnabled: boolean;
  declare colorSpectrumShape: 'box' | 'ring';
  declare orientation: 'vertical' | 'horizontal';
  declare moreButtonVisible: boolean;
  declare colorSpectrumVisible: boolean;
  declare colorPreviewVisible: boolean;
  declare colorSliderVisible: boolean;
  declare alphaSliderVisible: boolean;
  declare colorChannelTextInputVisible: boolean;
  declare hexInputVisible: boolean;
  declare alphaTextInputVisible: boolean;
  declare disabled: boolean;

  private hsv: Hsva = { h: 0, s: 0, v: 1, a: 1 };
  private internalColor = false;
  private moreOpen = false;
  private dragTarget: 'spectrum' | 'value' | 'alpha' | null = null;

  static {
    this.define('win-color-picker');
  }

  get rgba() {
    return hsvToRgb(this.hsv);
  }

  get hsva(): Hsva {
    return { ...this.hsv };
  }

  protected override firstConnected(): void {
    for (const l of this.$$<HTMLElement>('.lbl')) l.textContent = localized(l.dataset.l as 'red');

    const spectrum = this.$('.spectrum');
    spectrum.addEventListener('pointerdown', (ev) => this.beginDrag(ev, 'spectrum'));
    spectrum.addEventListener('keydown', (ev) => this.spectrumKey(ev));
    for (const kind of ['value', 'alpha'] as const) {
      const el = this.$(`.cslider.${kind}`);
      el.addEventListener('pointerdown', (ev) => this.beginDrag(ev, kind));
      el.addEventListener('keydown', (ev) => this.sliderKey(ev, kind));
    }
    for (const el of [spectrum, this.$('.cslider.value'), this.$('.cslider.alpha')]) {
      el.addEventListener('pointermove', (ev) => {
        if (this.dragTarget && el.hasPointerCapture(ev.pointerId)) this.dragTo(ev);
      });
      const end = (ev: PointerEvent) => {
        if (!el.hasPointerCapture(ev.pointerId)) return;
        el.releasePointerCapture(ev.pointerId);
        this.dragTarget = null;
        spectrum.removeAttribute('data-touch');
      };
      el.addEventListener('pointerup', end);
      el.addEventListener('pointercancel', end);
    }

    this.$('.more-btn').addEventListener('click', () => {
      this.moreOpen = !this.moreOpen;
      this.syncVisibility();
    });
    this.$('.rep').addEventListener('selectionchanged', () => this.syncVisibility());

    const hex = this.$<HTMLInputElement>('.hex');
    const commitHex = () => {
      const c = parseArgbHex(hex.value) ?? parseColor(hex.value);
      if (c) {
        const next = rgbToHsv({ ...c, a: this.alphaEnabled ? c.a : this.hsv.a });
        this.setHsv(this.keepHue(next), true);
      }
      this.renderInputs();
    };
    hex.addEventListener('change', commitHex);
    hex.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter') commitHex();
    });
    for (const inp of this.$$<HTMLInputElement>('input[data-ch]')) {
      const commit = () => this.commitChannel(inp.dataset.ch as Channel, inp.value);
      inp.addEventListener('change', commit);
      inp.addEventListener('keydown', (ev) => {
        if (ev.key === 'Enter') commit();
      });
    }
  }

  private keepHue(next: Hsva): Hsva {
    if (next.s === 0 || next.v === 0) next.h = this.hsv.h;
    if (next.v === 0) next.s = this.hsv.s;
    return next;
  }

  private commitChannel(ch: Channel, raw: string): void {
    const n = Number.parseFloat(raw.replace('%', ''));
    if (!Number.isFinite(n)) {
      this.renderInputs();
      return;
    }
    const rgb = hsvToRgb(this.hsv);
    let next: Hsva = { ...this.hsv };
    if (ch === 'r' || ch === 'g' || ch === 'b') {
      const c = { ...rgb, [ch]: clamp(Math.round(n), 0, 255) };
      next = this.keepHue(rgbToHsv(c));
    } else if (ch === 'h') next.h = clamp(Math.round(n), 0, 359);
    else if (ch === 's') next.s = clamp(n, 0, 100) / 100;
    else if (ch === 'v') next.v = clamp(n, 0, 100) / 100;
    else if (ch === 'a') next.a = clamp(n, 0, 100) / 100;
    this.setHsv(next, true);
    this.renderInputs();
  }

  private beginDrag(ev: PointerEvent, target: 'spectrum' | 'value' | 'alpha'): void {
    if (this.disabled || ev.button !== 0) return;
    const el = ev.currentTarget as HTMLElement;
    el.setPointerCapture(ev.pointerId);
    el.focus({ preventScroll: true });
    this.dragTarget = target;
    if (target === 'spectrum' && ev.pointerType === 'touch') el.toggleAttribute('data-touch', true);
    this.dragTo(ev);
    ev.preventDefault();
  }

  private dragTo(ev: PointerEvent): void {
    const t = this.dragTarget;
    if (!t) return;
    const next = { ...this.hsv };
    if (t === 'spectrum') {
      const r = this.$('.spectrum').getBoundingClientRect();
      const x = clamp((ev.clientX - r.left) / r.width, 0, 1);
      const y = clamp((ev.clientY - r.top) / r.height, 0, 1);
      if (this.colorSpectrumShape === 'ring') {
        const dx = x - 0.5;
        const dy = 0.5 - y;
        const dist = Math.hypot(dx, dy) * 2;
        next.h = ((Math.atan2(dy, dx) * 180) / Math.PI + 360) % 360;
        next.s = clamp(dist, 0, 1);
      } else {
        next.h = clamp(x * 360, 0, 360);
        next.s = 1 - y;
      }
    } else {
      const el = this.$(`.cslider.${t}`);
      const r = el.getBoundingClientRect();
      const horizontal = this.orientation !== 'horizontal';
      const p = horizontal
        ? clamp((ev.clientX - r.left - 9) / Math.max(1, r.width - 18), 0, 1)
        : clamp((r.bottom - ev.clientY - 9) / Math.max(1, r.height - 18), 0, 1);
      if (t === 'value') next.v = p;
      else next.a = p;
    }
    this.setHsv(next, true);
  }

  private spectrumKey(ev: KeyboardEvent): void {
    if (this.disabled) return;
    const k = ev.shiftKey || ev.ctrlKey ? 10 : 1;
    const next = { ...this.hsv };
    switch (ev.key) {
      case 'ArrowLeft':
        next.h = (next.h - k + 360) % 360;
        break;
      case 'ArrowRight':
        next.h = (next.h + k) % 360;
        break;
      case 'ArrowUp':
        next.s = clamp(next.s + k / 100, 0, 1);
        break;
      case 'ArrowDown':
        next.s = clamp(next.s - k / 100, 0, 1);
        break;
      default:
        return;
    }
    ev.preventDefault();
    this.setHsv(next, true);
  }

  private sliderKey(ev: KeyboardEvent, kind: 'value' | 'alpha'): void {
    if (this.disabled) return;
    const key = kind === 'value' ? 'v' : 'a';
    let p = this.hsv[key];
    const step = ev.key.startsWith('Page') ? 0.1 : 0.01;
    switch (ev.key) {
      case 'ArrowRight':
      case 'ArrowUp':
      case 'PageUp':
        p += step;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
      case 'PageDown':
        p -= step;
        break;
      case 'Home':
        p = 0;
        break;
      case 'End':
        p = 1;
        break;
      default:
        return;
    }
    ev.preventDefault();
    this.setHsv({ ...this.hsv, [key]: clamp(Math.round(p * 100) / 100, 0, 1) }, true);
  }

  private setHsv(next: Hsva, user: boolean): void {
    if (!this.alphaEnabled) next.a = 1;
    const old = this.color;
    this.hsv = next;
    const css = toCssHex(hsvToRgb(next));
    this.internalColor = true;
    this.color = css;
    this.flushUpdates();
    this.internalColor = false;
    this.render();
    if (user && css !== old) {
      this.emit('colorchanged', { color: css, oldColor: old, hsv: { ...next } });
      this.emit('change', { color: css });
    }
  }

  private render(): void {
    const { h, s, v, a } = this.hsv;
    const rgb = hsvToRgb(this.hsv);
    const full = hsvToRgb({ h, s, v: 1, a: 1 });
    const opaque = { ...rgb, a: 1 };
    const st = this.style;
    st.setProperty('--v', String(v));
    st.setProperty('--full', toCssRgba(full));
    st.setProperty('--opaque', toCssRgba(opaque));
    st.setProperty('--cur', toCssRgba(rgb));
    const spectrum = this.$('.spectrum');
    if (this.colorSpectrumShape === 'ring') {
      const rad = (h * Math.PI) / 180;
      spectrum.style.setProperty('--sx', `${(50 + Math.cos(rad) * s * 50).toFixed(3)}%`);
      spectrum.style.setProperty('--sy', `${(50 - Math.sin(rad) * s * 50).toFixed(3)}%`);
    } else {
      spectrum.style.setProperty('--sx', `${((h / 360) * 100).toFixed(3)}%`);
      spectrum.style.setProperty('--sy', `${((1 - s) * 100).toFixed(3)}%`);
    }
    spectrum.toggleAttribute('data-dark', luminance(opaque) > 0.5);
    spectrum.setAttribute(
      'aria-valuetext',
      `${localized('hue')} ${Math.round(h)}, ${localized('saturation')} ${Math.round(s * 100)}`,
    );
    const vs = this.$('.cslider.value');
    vs.style.setProperty('--p', String(v));
    vs.setAttribute('aria-valuenow', String(Math.round(v * 100)));
    const as = this.$('.cslider.alpha');
    as.style.setProperty('--p', String(a));
    as.setAttribute('aria-valuenow', String(Math.round(a * 100)));
    this.renderInputs();
  }

  private renderInputs(): void {
    const rgb = hsvToRgb(this.hsv);
    const set = (sel: string, val: string) => {
      const inp = this.$<HTMLInputElement>(sel);
      if (inp && this.renderRoot.activeElement !== inp) inp.value = val;
    };
    set('.hex', toArgbHex(rgb, this.alphaEnabled));
    set('input[data-ch="r"]', String(Math.round(rgb.r)));
    set('input[data-ch="g"]', String(Math.round(rgb.g)));
    set('input[data-ch="b"]', String(Math.round(rgb.b)));
    set('input[data-ch="h"]', String(Math.round(this.hsv.h) % 360));
    set('input[data-ch="s"]', String(Math.round(this.hsv.s * 100)));
    set('input[data-ch="v"]', String(Math.round(this.hsv.v * 100)));
    set('input[data-ch="a"]', `${Math.round(this.hsv.a * 100)}%`);
  }

  private syncVisibility(): void {
    const moreBtn = this.$('.more-btn');
    moreBtn.hidden = !this.moreButtonVisible;
    const entryOpen = !this.moreButtonVisible || this.moreOpen;
    this.$('.entry').hidden = !entryOpen;
    moreBtn.setAttribute('aria-expanded', String(this.moreOpen));
    this.$('.more-label').textContent = localized(this.moreOpen ? 'less' : 'more');
    this.$('.spectrum').hidden = !this.colorSpectrumVisible;
    this.$('.preview').hidden = !this.colorPreviewVisible;
    this.$('.cslider.value').hidden = !this.colorSliderVisible;
    this.$('.cslider.alpha').hidden = !(this.alphaEnabled && this.alphaSliderVisible);
    const rep = this.$<HTMLElement & { selectedIndex: number }>('.rep');
    const hsvMode = rep.selectedIndex === 1;
    rep.hidden = !this.colorChannelTextInputVisible;
    this.$('.channels.rgb').hidden = !this.colorChannelTextInputVisible || hsvMode;
    this.$('.channels.hsv').hidden = !this.colorChannelTextInputVisible || !hsvMode;
    this.$('.hex-box').hidden = !this.hexInputVisible;
    this.$('.alpha-row').hidden = !(this.alphaEnabled && this.alphaTextInputVisible);
    const hex = this.$<HTMLInputElement>('.hex');
    hex.maxLength = this.alphaEnabled ? 9 : 7;
    const prev = this.previousColor ? parseColor(this.previousColor) : null;
    const preview = this.$('.preview');
    preview.toggleAttribute('data-prev', !!prev);
    if (prev) preview.style.setProperty('--prev', toCssRgba(prev));
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('color') && !this.internalColor) {
      const c = parseColor(this.color);
      if (c) {
        this.hsv = this.keepHue(rgbToHsv({ ...c, a: this.alphaEnabled ? c.a : 1 }));
        if (first) this.hsv = rgbToHsv({ ...c, a: this.alphaEnabled ? c.a : 1 });
        this.render();
      }
    }
    if (changed.has('alphaEnabled') && !first) {
      if (!this.alphaEnabled && this.hsv.a !== 1) this.setHsv({ ...this.hsv, a: 1 }, false);
      else this.render();
    }
    if (changed.has('colorSpectrumShape') && !first) this.render();
    if (changed.has('disabled')) {
      for (const inp of this.$$<HTMLInputElement>('input')) inp.disabled = this.disabled;
      for (const el of this.$$<HTMLElement>('.spectrum, .cslider')) el.tabIndex = this.disabled ? -1 : 0;
      (this.$('.rep') as HTMLElement & { disabled: boolean }).disabled = this.disabled;
      this.aria('aria-disabled', this.disabled ? 'true' : null);
    }
    this.syncVisibility();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-color-picker': WinColorPicker;
  }
}
