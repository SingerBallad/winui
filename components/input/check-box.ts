import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { keyboardActivation } from '../../base/keyboard.ts';
import { animate, durations, easings } from '../../motion/animate.ts';
import { focusRect } from './shared.ts';

const checkCss = css`
:host {
  --fill: var(--w-control-alt-fill-color-secondary);
  --stroke: var(--w-control-strong-stroke-color-default);
  --glyph: var(--w-text-on-accent-fill-color-primary);
  display: inline-grid;
  grid-template-columns: 20px auto;
  position: relative;
  box-sizing: border-box;
  min-width: 120px;
  min-height: 32px;
  vertical-align: middle;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  touch-action: manipulation;
  outline: none;
}
:host(:hover) { --fill: var(--w-control-alt-fill-color-tertiary); }
:host(:active), :host([data-pressed]) {
  --fill: var(--w-control-alt-fill-color-quarternary);
  --stroke: var(--w-control-strong-stroke-color-disabled);
}
:host([checked]), :host([indeterminate]) {
  --fill: var(--w-accent-fill-color-default);
  --stroke: var(--w-accent-fill-color-default);
}
:host([checked]:hover), :host([indeterminate]:hover) {
  --fill: var(--w-accent-fill-color-secondary);
  --stroke: var(--w-accent-fill-color-secondary);
}
:host([checked]:active), :host([indeterminate]:active),
:host([checked][data-pressed]), :host([indeterminate][data-pressed]) {
  --fill: var(--w-accent-fill-color-tertiary);
  --stroke: var(--w-accent-fill-color-tertiary);
  --glyph: var(--w-text-on-accent-fill-color-secondary);
}
:host([disabled]) {
  --fill: var(--w-control-alt-fill-color-disabled);
  --stroke: var(--w-control-strong-stroke-color-disabled);
  --glyph: var(--w-text-on-accent-fill-color-disabled);
  color: var(--w-text-fill-color-disabled);
  pointer-events: none;
}
:host([disabled][checked]), :host([disabled][indeterminate]) {
  --fill: var(--w-accent-fill-color-disabled);
  --stroke: var(--w-control-strong-stroke-color-disabled);
}
${focusRect(':host(:focus-visible)::after', { top: 3, right: 7, bottom: 3, left: 7 }, 7)}

.box {
  grid-column: 1;
  align-self: center;
  position: relative;
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  border: 1px solid var(--stroke);
  border-radius: var(--w-corner-radius-control);
  background: var(--fill);
}
svg {
  position: absolute;
  inset: -1px;
  width: 20px;
  height: 20px;
  overflow: visible;
  color: var(--glyph);
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  pointer-events: none;
}
.check {
  stroke-width: 1.15;
  stroke-dasharray: 1;
  stroke-dashoffset: 1;
  transform-origin: 10px 11px;
}
.dash {
  stroke-width: 1.15;
  opacity: 0;
  transform-origin: 10px 10px;
}
:host([checked]:not([indeterminate])) .check { stroke-dashoffset: 0; }
:host([indeterminate]) .dash { opacity: 1; }
:host([checked]:active) .check, :host([checked][data-pressed]) .check,
:host([indeterminate]:active) .dash, :host([indeterminate][data-pressed]) .dash {
  scale: 0.88;
}
.check, .dash { transition: scale var(--w-duration-fast) var(--w-ease-decelerate); }
:host([data-w-toggling]) .box {
  transition:
    background-color var(--w-duration-fast) linear,
    border-color var(--w-duration-fast) linear;
}

.content {
  grid-column: 2;
  align-self: start;
  padding: 5px 0 0 8px;
  min-width: 0;
  overflow-wrap: anywhere;
}
.content[hidden] { display: none; }
`;

export class WinCheckBox extends WinElement {
  static override styles = [checkCss];
  static override formAssociated = true;
  static override template = `<span class="box" part="box"><svg viewBox="0 0 20 20" aria-hidden="true" focusable="false"><path class="check" pathLength="1" d="M5.4 11.1L8.4 14.1L14.6 7.9"/><path class="dash" d="M6.75 10H13.25"/></svg></span><span class="content" part="content"><slot></slot></span>`;
  static override props: PropDefs = {
    checked: { type: Boolean },
    indeterminate: { type: Boolean },
    threeState: { type: Boolean, attribute: 'three-state' },
    disabled: { type: Boolean },
    name: { type: String },
    value: { type: String, default: 'on' },
  };
  declare checked: boolean;
  declare indeterminate: boolean;
  declare threeState: boolean;
  declare disabled: boolean;
  declare name: string;
  declare value: string;

  private defaultChecked = false;

  static {
    this.define('win-check-box');
  }

  constructor() {
    super();
    this.addEventListener(
      'click',
      (ev) => {
        if (this.disabled) {
          ev.stopImmediatePropagation();
          ev.preventDefault();
        }
      },
      true,
    );
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'checkbox');
    this.defaultChecked = this.hasAttribute('checked');
    keyboardActivation(this, () => this.disabled);
    this.addEventListener('click', (ev) => {
      if (ev.defaultPrevented) return;
      this.toggle();
    });
    const slot = this.$<HTMLSlotElement>('slot');
    const sync = () => {
      const has = slot.assignedNodes().some((n) => n.nodeType === 1 || (n.textContent ?? '').trim());
      this.$('.content').hidden = !has;
    };
    slot.addEventListener('slotchange', sync);
    sync();
  }

  toggle(): void {
    if (this.checked) {
      if (this.threeState) {
        this.checked = false;
        this.indeterminate = true;
      } else this.checked = false;
    } else if (this.indeterminate) {
      this.indeterminate = false;
      this.checked = false;
    } else {
      this.checked = true;
    }
    this.flushUpdates();
    this.emit('change', { checked: this.checked, indeterminate: this.indeterminate });
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (this.indeterminate && this.checked) {
      if (changed.has('checked') && !changed.has('indeterminate') && !first) this.indeterminate = false;
      else this.checked = false;
    }
    if (changed.has('disabled')) {
      this.setFocusable(!this.disabled);
      this.aria('aria-disabled', this.disabled ? 'true' : null);
    }
    if (changed.has('checked') || changed.has('indeterminate')) {
      this.aria('aria-checked', this.indeterminate ? 'mixed' : this.checked ? 'true' : 'false');
      this.internals.setFormValue(this.checked ? this.value : null);
      if (!first) this.animateGlyph();
    }
    if (changed.has('value') && !first) this.internals.setFormValue(this.checked ? this.value : null);
  }

  private lastState: 'off' | 'on' | 'mixed' = 'off';
  private togglingTimer: ReturnType<typeof setTimeout> | null = null;

  private static current(el: Element, prop: 'strokeDashoffset' | 'opacity' | 'transform', resting: string): string {
    const running = el.getAnimations().some((a) => a.playState === 'running' || a.playState === 'paused');
    if (!running) return resting;
    const cs = getComputedStyle(el);
    const v = prop === 'strokeDashoffset' ? cs.strokeDashoffset : prop === 'opacity' ? cs.opacity : cs.transform;
    return v && v !== 'none' ? v : resting;
  }

  private animateGlyph(): void {
    const state = this.indeterminate ? 'mixed' : this.checked ? 'on' : 'off';
    const prev = this.lastState;
    this.lastState = state;
    if (prev === state) return;
    const check = this.$<SVGPathElement>('.check');
    const dash = this.$<SVGPathElement>('.dash');

    this.toggleAttribute('data-w-toggling', true);
    if (this.togglingTimer) clearTimeout(this.togglingTimer);
    this.togglingTimer = setTimeout(() => this.removeAttribute('data-w-toggling'), durations.normal);

    const checkFrom = WinCheckBox.current(check, 'strokeDashoffset', prev === 'on' ? '0' : '1');
    const dashOpacityFrom = WinCheckBox.current(dash, 'opacity', prev === 'mixed' ? '1' : '0');
    const dashTransformFrom = WinCheckBox.current(dash, 'transform', prev === 'mixed' ? 'scaleX(1)' : 'scaleX(0)');

    if (state === 'on') {
      animate(check, [{ strokeDashoffset: checkFrom }, { strokeDashoffset: 0 }], {
        duration: durations.normal,
        easing: easings.decelerate,
      });
    } else if (prev === 'on' || check.getAnimations().length) {
      animate(check, [{ strokeDashoffset: checkFrom }, { strokeDashoffset: 1 }], {
        duration: state === 'mixed' ? durations.faster : durations.fast,
        easing: easings.decelerate,
      });
    }

    if (state === 'mixed') {
      animate(
        dash,
        [
          { opacity: dashOpacityFrom, transform: dashTransformFrom },
          { opacity: 1, transform: 'scaleX(1)' },
        ],
        {
          duration: durations.fast,
          easing: easings.decelerate,
        },
      );
    } else if (prev === 'mixed' || dash.getAnimations().length) {
      animate(
        dash,
        [
          { opacity: dashOpacityFrom, transform: dashTransformFrom },
          { opacity: 0, transform: 'scaleX(0)' },
        ],
        {
          duration: state === 'on' ? durations.faster : durations.fast,
          easing: easings.decelerate,
        },
      );
    }
  }

  protected override connected(): void {
    this.lastState = this.indeterminate ? 'mixed' : this.checked ? 'on' : 'off';
  }

  formResetCallback(): void {
    this.indeterminate = false;
    this.checked = this.defaultChecked;
  }

  formDisabledCallback(disabled: boolean): void {
    this.disabled = disabled;
  }

  formStateRestoreCallback(state: string | null): void {
    this.checked = state !== null;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-check-box': WinCheckBox;
  }
}
