import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { animate, durations, easings } from '../../motion/animate.ts';
import { headerCss, localized } from './shared.ts';

const switchCss = css`
:host {
  --track-fill: var(--w-control-alt-fill-color-secondary);
  --track-stroke: var(--w-control-strong-stroke-color-default);
  --on-fill: var(--w-accent-fill-color-default);
  --knob-off: var(--w-text-fill-color-secondary);
  --knob-on: var(--w-text-on-accent-fill-color-primary);
  --knob-w: 12px;
  --knob-h: 12px;
  display: inline-flex;
  flex-direction: column;
  align-items: flex-start;
  box-sizing: border-box;
  min-width: 154px;
  vertical-align: middle;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  touch-action: pan-y;
  outline: none;
}
.header { margin: 0 0 4px; }
.row {
  position: relative;
  display: grid;
  grid-template-columns: 40px 12px auto;
  grid-template-rows: 10px 20px 10px;
  align-items: center;
}
.area {
  grid-column: 1 / -1;
  grid-row: 1 / -1;
  align-self: stretch;
  margin: 5px 0;
  border-radius: var(--w-corner-radius-control);
  position: relative;
  pointer-events: none;
}
:host(:focus-visible) .area::after {
  content: '';
  position: absolute;
  inset: -3px -7px;
  border-radius: 7px;
  box-shadow: inset 0 0 0 2px var(--w-focus-stroke-color-outer), inset 0 0 0 3px var(--w-focus-stroke-color-inner);
}
.track {
  grid-column: 1;
  grid-row: 2;
  position: relative;
  width: 40px;
  height: 20px;
}
:host(:dir(rtl)) .track { scale: -1 1; }
.outer, .bounds {
  position: absolute;
  inset: 0;
  box-sizing: border-box;
  border-radius: 10px;
}
.outer {
  border: 1px solid var(--track-stroke);
  background: var(--track-fill);
  transition: background-color var(--w-duration-faster) linear, border-color var(--w-duration-faster) linear, opacity var(--w-duration-faster) linear;
}
.bounds {
  background: var(--on-fill);
  opacity: 0;
  transition: opacity var(--w-duration-faster) linear;
}
.knob {
  position: absolute;
  left: 0;
  top: 0;
  width: 20px;
  height: 20px;
  translate: var(--knob-x, 0px) 0;
}
.knob > span {
  position: absolute;
  top: 50%;
  width: var(--knob-w);
  height: var(--knob-h);
  translate: 0 -50%;
  border-radius: 7px;
  transition:
    width var(--w-duration-faster) var(--w-ease-decelerate),
    height var(--w-duration-faster) var(--w-ease-decelerate),
    left var(--w-duration-faster) var(--w-ease-decelerate),
    right var(--w-duration-faster) var(--w-ease-decelerate),
    opacity var(--w-duration-faster) linear;
}
.knob-off {
  left: calc(50% - var(--knob-w) / 2 + 0.5px);
  background: var(--knob-off);
}
.knob-on {
  left: calc(50% - var(--knob-w) / 2 - 0.5px);
  background: var(--knob-on);
  opacity: 0;
}
.content {
  grid-column: 3;
  grid-row: 1 / -1;
  align-self: center;
  position: relative;
  display: grid;
}
.content > span { grid-area: 1 / 1; white-space: nowrap; opacity: 0; }
.content > .off { opacity: 1; }
:host([checked]) .content > .off { opacity: 0; }
:host([checked]) .content > .on { opacity: 1; }
.content[hidden] { display: none; }
:host([content-placement="left"]) { min-width: 0; align-items: flex-end; }
:host([content-placement="left"]) .row { grid-template-columns: auto 12px 40px; }
:host([content-placement="left"]) .track { grid-column: 3; }
:host([content-placement="left"]) .content { grid-column: 1; justify-self: end; text-align: end; }

:host(:hover) {
  --track-fill: var(--w-control-alt-fill-color-tertiary);
  --on-fill: var(--w-accent-fill-color-secondary);
  --knob-w: 14px;
  --knob-h: 14px;
}
:host(:active), :host([data-pressed]), :host([dragging]) {
  --track-fill: var(--w-control-alt-fill-color-quarternary);
  --on-fill: var(--w-accent-fill-color-tertiary);
  --knob-w: 17px;
  --knob-h: 14px;
}
:host(:active) .knob-off, :host([data-pressed]) .knob-off, :host([dragging]) .knob-off { left: 3px; }
:host(:active) .knob-on, :host([data-pressed]) .knob-on, :host([dragging]) .knob-on { left: 0px; }
:host([disabled]) {
  --track-fill: transparent;
  --track-stroke: var(--w-control-strong-stroke-color-disabled);
  --on-fill: var(--w-accent-fill-color-disabled);
  --knob-off: var(--w-text-fill-color-disabled);
  --knob-on: var(--w-text-on-accent-fill-color-disabled);
  --knob-w: 12px;
  --knob-h: 12px;
  color: var(--w-text-fill-color-disabled);
  pointer-events: none;
}
:host([disabled]) .knob > span { transition-duration: var(--w-duration-normal); }

:host([checked]) { --knob-x: 20px; }
:host([checked]) .outer { opacity: 0; }
:host([checked]) .bounds { opacity: 1; }
:host([checked]) .knob-on { opacity: 1; }
:host([checked]) .knob-off { opacity: 0; }
:host([dragging]) .knob-on { opacity: 1; }
:host([dragging]) .knob-off { opacity: 0; }
:host([dragging]) .bounds { opacity: 1; }
:host([dragging]) .outer { opacity: 0; }
`;

export class WinToggleSwitch extends WinElement {
  static override styles = [headerCss, switchCss];
  static override formAssociated = true;
  static override template = `<div class="header" part="header" hidden><slot name="header"></slot><span class="header-text"></span></div><div class="row" part="row"><span class="area" part="area"></span><span class="track" part="track" aria-hidden="true"><span class="outer"></span><span class="bounds"></span><span class="knob" part="knob"><span class="knob-on"></span><span class="knob-off"></span></span></span><span class="content" part="content"><span class="off"><slot name="off"></slot><span class="off-text"></span></span><span class="on"><slot name="on"></slot><span class="on-text"></span></span></span></div>`;
  static override props: PropDefs = {
    checked: { type: Boolean },
    disabled: { type: Boolean },
    header: { type: String },
    onContent: { type: String, attribute: 'on-content' },
    offContent: { type: String, attribute: 'off-content' },
    noContent: { type: Boolean, attribute: 'no-content' },
    contentPlacement: { type: String, attribute: 'content-placement', reflect: true, default: 'right' },
    name: { type: String },
    value: { type: String, default: 'on' },
  };
  declare checked: boolean;
  declare disabled: boolean;
  declare header: string;
  declare onContent: string;
  declare offContent: string;
  declare noContent: boolean;
  declare contentPlacement: 'right' | 'left';
  declare name: string;
  declare value: string;

  private defaultChecked = false;
  private drag: { id: number; x0: number; start: number; moved: boolean } | null = null;
  private suppressClick = false;

  static {
    this.define('win-toggle-switch');
  }

  get isOn(): boolean {
    return this.checked;
  }
  set isOn(v: boolean) {
    this.checked = v;
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'switch');
    this.defaultChecked = this.hasAttribute('checked');
    this.$<HTMLSlotElement>('slot[name="header"]').addEventListener('slotchange', () => this.syncHeader());

    this.addEventListener('click', (ev) => {
      if (this.disabled) return;
      if (this.suppressClick) {
        this.suppressClick = false;
        return;
      }
      ev.preventDefault();
      this.toggle();
    });
    this.addEventListener('keydown', (ev) => {
      if (this.disabled || ev.target !== this) return;
      if (ev.key === ' ' || ev.key === 'Enter') {
        ev.preventDefault();
        if (ev.key === 'Enter' && !ev.repeat) this.toggle();
        else this.toggleAttribute('data-pressed', true);
      }
    });
    this.addEventListener('keyup', (ev) => {
      if (ev.key !== ' ' || !this.hasAttribute('data-pressed')) return;
      this.removeAttribute('data-pressed');
      if (!this.disabled) this.toggle();
    });
    this.addEventListener('blur', () => this.removeAttribute('data-pressed'));

    const track = this.$('.track');
    track.addEventListener('pointerdown', (ev) => {
      if (this.disabled || ev.button !== 0) return;
      track.setPointerCapture(ev.pointerId);
      this.drag = { id: ev.pointerId, x0: ev.clientX, start: this.knobX(), moved: false };
    });
    track.addEventListener('pointermove', (ev) => {
      const d = this.drag;
      if (!d || d.id !== ev.pointerId) return;
      const rtl = getComputedStyle(this).direction === 'rtl';
      const dx = (ev.clientX - d.x0) * (rtl ? -1 : 1);
      if (!d.moved && Math.abs(dx) < 3) return;
      const knob = this.$('.knob');
      if (!d.moved && knob.getAnimations().some((a) => a.playState === 'running')) {
        d.start = this.knobX() - dx;
        for (const a of knob.getAnimations()) a.cancel();
      }
      d.moved = true;
      this.toggleAttribute('dragging', true);
      const x = Math.min(20, Math.max(0, d.start + dx));
      knob.style.setProperty('--knob-x', `${x}px`);
    });
    const end = (ev: PointerEvent) => {
      const d = this.drag;
      if (!d || d.id !== ev.pointerId) return;
      this.drag = null;
      if (!d.moved) return;
      const knob = this.$('.knob');
      const x = Number.parseFloat(knob.style.getPropertyValue('--knob-x')) || 0;
      knob.style.removeProperty('--knob-x');
      this.removeAttribute('dragging');
      this.suppressClick = true;
      setTimeout(() => (this.suppressClick = false), 0);
      const on = x >= 10;
      if (on !== this.checked) this.toggle(x);
      else this.slideKnob(x, on ? 20 : 0);
    };
    track.addEventListener('pointerup', end);
    track.addEventListener('pointercancel', end);
    track.addEventListener('lostpointercapture', end);
  }

  toggle(fromX?: number): void {
    const from = fromX ?? this.knobX();
    this.checked = !this.checked;
    this.flushUpdates();
    this.slideKnob(from, this.checked ? 20 : 0);
    this.emit('change', { checked: this.checked });
    this.emit('toggled', { isOn: this.checked });
  }

  private knobX(): number {
    const knob = this.$('.knob');
    if (knob.getAnimations().some((a) => a.playState === 'running')) {
      const t = getComputedStyle(knob).translate;
      const n = Number.parseFloat(t);
      if (Number.isFinite(n)) return n;
    }
    return this.checked ? 20 : 0;
  }

  private slideKnob(from: number, to: number): void {
    if (from === to) return;
    animate(this.$('.knob'), [{ translate: `${from}px 0` }, { translate: `${to}px 0` }], {
      duration: durations.normal,
      easing: easings.point,
    });
  }

  private syncHeader(): void {
    const slotted = this.$<HTMLSlotElement>('slot[name="header"]').assignedNodes().length > 0;
    this.$('.header-text').textContent = this.header;
    this.$('.header').hidden = !this.header && !slotted;
    if (this.header) this.aria('aria-label', this.header);
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('header')) this.syncHeader();
    if (changed.has('disabled')) {
      this.setFocusable(!this.disabled);
      this.aria('aria-disabled', this.disabled ? 'true' : null);
    }
    if (changed.has('checked')) {
      this.aria('aria-checked', this.checked ? 'true' : 'false');
      this.internals.setFormValue(this.checked ? this.value : null);
    }
    if (changed.has('onContent') || changed.has('offContent') || first) {
      this.$('.on-text').textContent = this.onContent || (this.querySelector('[slot="on"]') ? '' : localized('on'));
      this.$('.off-text').textContent = this.offContent || (this.querySelector('[slot="off"]') ? '' : localized('off'));
    }
    if (changed.has('noContent')) this.$('.content').hidden = this.noContent;
    if (changed.has('value') && !first) this.internals.setFormValue(this.checked ? this.value : null);
  }

  formResetCallback(): void {
    this.checked = this.defaultChecked;
  }

  formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-toggle-switch': WinToggleSwitch;
  }
}
