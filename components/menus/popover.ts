import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import {
  computePosition,
  normalizePlacement,
  Popup,
  popupResetCss,
  viewportSize,
  type PositionResult,
} from '../../base/popup.ts';
import { animate, durations, easings, fadeIn, popupIn, popupOut } from '../../motion/animate.ts';

export class WinPopover extends WinElement {
  static override styles = [
    css`
      ${popupResetCss(':host')}
      .child { display: block; }
    `,
  ];
  static override template = `<div class="child" part="child"><slot></slot></div>`;
  static override props: PropDefs = {
    isOpen: { type: Boolean, attribute: 'is-open' },
    isLightDismissEnabled: { type: Boolean, attribute: 'is-light-dismiss-enabled' },
    horizontalOffset: { type: Number, attribute: 'horizontal-offset', default: 0 },
    verticalOffset: { type: Number, attribute: 'vertical-offset', default: 0 },
    placementTarget: { type: String, attribute: 'placement-target' },
    desiredPlacement: { type: String, attribute: 'desired-placement', default: 'none' },
    shouldConstrainToRootBounds: { type: Boolean, attribute: 'should-constrain-to-root-bounds', default: true },
    transition: { type: String, default: 'none' },
  };
  declare isOpen: boolean;
  declare isLightDismissEnabled: boolean;
  declare horizontalOffset: number;
  declare verticalOffset: number;
  declare placementTarget: string;
  declare desiredPlacement: string;
  declare shouldConstrainToRootBounds: boolean;
  declare transition: 'none' | 'popup' | 'pane-left' | 'pane-right' | 'pane-top' | 'pane-bottom';

  private popup!: Popup;
  private origin: Element | null = null;

  static {
    this.define('win-popover');
  }

  protected override firstConnected(): void {
    this.popup = new Popup(this, this.$('.child'));
    this.origin = this.parentElement;
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('isOpen') && !first) {
      if (this.isOpen) this.openPopup();
      else this.closePopup();
    } else if (first && this.isOpen) {
      queueMicrotask(() => this.openPopup());
    } else if (this.popup?.isOpen && (changed.has('horizontalOffset') || changed.has('verticalOffset'))) {
      this.popup.reposition();
    }
  }

  private targetEl(): Element | null {
    if (!this.placementTarget) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    return root.getElementById?.(this.placementTarget) ?? document.getElementById(this.placementTarget);
  }

  private openPopup(): void {
    if (this.popup.isOpen) return;
    this.origin = this.parentElement ?? this.origin;
    const target = this.targetEl();
    const anchor = target ?? this.origin ?? document.body;
    this.popup.open({
      anchor,
      position: (size, rect) => this.place(size, rect, !!target),
      lightDismiss: this.isLightDismissEnabled,
      stack: this.isLightDismissEnabled,
      closeOnEscape: this.isLightDismissEnabled,
      focus: 'none',
      restoreFocus: false,
      animateIn: (s, side) => this.enter(s, side),
      animateOut: (s) => (this.transition === 'none' ? null : popupOut(s)),
      onDismiss: () => {
        this.isOpen = false;
        return false;
      },
      onClosed: () => this.emit('closed', undefined, { bubbles: false }),
    });
    this.emit('opened', undefined, { bubbles: false });
  }

  private closePopup(): void {
    if (this.popup?.isOpen) void this.popup.close('programmatic');
  }

  private place(size: { width: number; height: number }, rect: DOMRect, targeted: boolean): PositionResult {
    const { width: vw, height: vh } = viewportSize();
    if (targeted && this.desiredPlacement !== 'none') {
      const p = computePosition(rect, size, normalizePlacement(this.desiredPlacement, 'bottom'), 0, 0);
      p.x += this.horizontalOffset;
      p.y += this.verticalOffset;
      return p;
    }
    let x = rect.left + this.horizontalOffset;
    let y = rect.top + this.verticalOffset;
    if (this.shouldConstrainToRootBounds) {
      x = Math.min(Math.max(x, 0), Math.max(0, vw - size.width));
      y = Math.min(Math.max(y, 0), Math.max(0, vh - size.height));
    }
    return { x: Math.round(x), y: Math.round(y), side: 'bottom', maxHeight: vh, maxWidth: vw };
  }

  private enter(s: HTMLElement, side: 'top' | 'bottom' | 'left' | 'right'): Animation | null {
    switch (this.transition) {
      case 'popup':
        return popupIn(s, side, 8);
      case 'pane-left':
      case 'pane-right':
      case 'pane-top':
      case 'pane-bottom': {
        const edge = this.transition.slice(5);
        const d = edge === 'left' || edge === 'top' ? -1 : 1;
        const axis = edge === 'left' || edge === 'right' ? 'X' : 'Y';
        const dist = (axis === 'X' ? s.offsetWidth : s.offsetHeight) || 200;
        fadeIn(s, durations.faster);
        return animate(s, [{ transform: `translate${axis}(${d * dist}px)` }, { transform: 'none' }], {
          duration: durations.slow,
          easing: easings.decelerate,
        });
      }
      default:
        return null;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-popover': WinPopover;
  }
}
