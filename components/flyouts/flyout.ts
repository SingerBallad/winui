import { WinElement, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css, materialOverrides, scrollbars } from '../../base/css.ts';
import {
  isFlyout,
  normalizePlacement,
  Popup,
  popupResetCss,
  type FlyoutLike,
  type FlyoutShowOptions,
  type Placement,
} from '../../base/popup.ts';
import { composedContains, deepActiveElement, tabbables } from '../../base/dom.ts';
import { popupIn, popupOut } from '../../motion/animate.ts';

export const flyoutPresenterCss = css`
${popupResetCss(':host')}
.presenter {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 96px;
  max-width: 456px;
  min-height: 40px;
  max-height: min(758px, var(--w-popup-max-height, 758px));
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-flyout);
  color: var(--w-text-fill-color-primary);
  overflow: hidden;
  outline: none;
}
.content {
  padding: 15px 16px 17px 16px;
  overflow: auto;
  min-height: 0;
}
`;

export type FlyoutShowMode = 'standard' | 'transient' | 'transient-with-dismiss-on-pointer-move-away';

export abstract class FlyoutBase extends WinElement implements FlyoutLike {
  static override props: PropDefs = {
    placement: { type: String, default: 'top' },
    showMode: { type: String, attribute: 'show-mode', default: 'standard' },
    noAnimations: { type: Boolean, attribute: 'no-animations' },
    target: { type: String },
  };
  declare placement: string;
  declare showMode: FlyoutShowMode;
  declare noAnimations: boolean;
  declare target: string;

  protected popup!: Popup;
  protected surface!: HTMLElement;
  private moveAwayCleanup: (() => void) | null = null;
  protected lastInput: FlyoutShowOptions['inputType'] = 'mouse';
  private anchorEl: Element | null = null;

  get isOpen(): boolean {
    return this.popup?.isOpen ?? false;
  }

  get anchor(): Element | null {
    return this.anchorEl;
  }

  protected override firstConnected(): void {
    this.surface = this.$('.presenter');
    this.popup = new Popup(this, this.surface);
    this.addEventListener('click', (ev) => {
      if (this.slot === 'flyout') ev.stopPropagation();
    });
  }

  protected get defaultPlacement(): Placement {
    return normalizePlacement(this.placement, 'top');
  }

  showAt(anchor: Element | DOMRect | { x: number; y: number }, opts: FlyoutShowOptions = {}): void {
    if (!this.isConnected) document.body.append(this);
    if (!this.popup) this.connectedCallback();
    if (this.isOpen) {
      this.popup.reposition();
      return;
    }
    if (!this.emit('opening', undefined, { cancelable: true, bubbles: false })) return;
    this.lastInput = opts.inputType ?? 'mouse';
    this.anchorEl = anchor instanceof Element ? anchor : null;
    this.beforeOpen(opts);
    const placement = opts.placement
      ? normalizePlacement(opts.placement, this.defaultPlacement)
      : this.defaultPlacement;
    const at = opts.position ?? anchor;
    const transient = this.showMode !== 'standard';
    this.popup.open({
      anchor: at instanceof Element ? at : 'width' in at ? (at as DOMRect) : at,
      placement: opts.position ? 'bottom-start' : placement,
      offset: opts.position ? 0 : this.anchorOffset,
      focus: transient ? 'none' : this.initialFocus(opts),
      animateIn: this.noAnimations ? 'none' : (s, side) => this.animateIn(s, side),
      animateOut: this.noAnimations ? 'none' : (s) => this.animateOut(s),
      onDismiss: (reason) => {
        if (!this.emit('closing', { reason }, { cancelable: true, bubbles: false })) return false;
        return true;
      },
      onClosed: () => this.afterClose(),
      passThrough: this.passThroughElements(),
    });
    if (this.showMode === 'transient-with-dismiss-on-pointer-move-away') this.watchPointerMoveAway();
    this.emit('opened', undefined, { bubbles: false });
  }

  show(): void {
    const t = this.target ? document.getElementById(this.target) : null;
    if (t) this.showAt(t);
  }

  hide(): void {
    if (!this.isOpen) return;
    if (!this.emit('closing', { reason: 'programmatic' }, { cancelable: true, bubbles: false })) return;
    void this.popup.close('programmatic');
  }

  protected get anchorOffset(): number {
    return 4;
  }

  protected initialFocus(opts: FlyoutShowOptions): 'first' | 'surface' | 'none' | HTMLElement {
    if (opts.focus === 'none') return 'none';
    if (opts.focus === 'first') return 'first';
    return tabbables(this).length && opts.inputType === 'keyboard' ? 'first' : 'surface';
  }

  protected passThroughElements(): Element[] {
    return [];
  }

  protected beforeOpen(_opts: FlyoutShowOptions): void {}

  protected afterClose(): void {
    this.moveAwayCleanup?.();
    this.moveAwayCleanup = null;
    this.anchorEl = null;
    this.emit('closed', undefined, { bubbles: false });
  }

  protected animateIn(surface: HTMLElement, side: 'top' | 'bottom' | 'left' | 'right'): Animation | null {
    return popupInFor(surface, side);
  }

  protected animateOut(surface: HTMLElement): Animation | null {
    return popupOutFor(surface);
  }

  private watchPointerMoveAway(): void {
    const onMove = (ev: PointerEvent) => {
      const r = this.surface.getBoundingClientRect();
      const dx = Math.max(r.left - ev.clientX, 0, ev.clientX - r.right);
      const dy = Math.max(r.top - ev.clientY, 0, ev.clientY - r.bottom);
      if (Math.hypot(dx, dy) > 80) this.hide();
    };
    document.addEventListener('pointermove', onMove);
    this.moveAwayCleanup = () => document.removeEventListener('pointermove', onMove);
  }
}

const popupInFor = (s: HTMLElement, side: 'top' | 'bottom' | 'left' | 'right') => popupIn(s, side, 8);
const popupOutFor = (s: HTMLElement) => popupOut(s);

export class WinFlyout extends FlyoutBase {
  static override styles = [scrollbars, flyoutPresenterCss, css`${materialOverrides('.presenter')}`];
  static override materialPart = '.presenter';
  static override template = `<div class="presenter" part="presenter" tabindex="-1" role="dialog"><div class="content w-scroll" part="content"><slot></slot></div></div>`;

  static {
    this.define('win-flyout');
  }
}

let contextInstalled = false;
export function installContextFlyouts(): void {
  if (contextInstalled || typeof document === 'undefined') return;
  contextInstalled = true;
  document.addEventListener('contextmenu', (ev) => {
    const path = ev.composedPath();
    for (const n of path) {
      if (!(n instanceof HTMLElement)) continue;
      const id = n.getAttribute('context-flyout');
      if (!id) continue;
      const root = n.getRootNode() as Document | ShadowRoot;
      const f = root.getElementById?.(id) ?? document.getElementById(id);
      if (!isFlyout(f)) return;
      ev.preventDefault();
      const keyboard = ev.button !== 2 && ev.clientX === 0 && ev.clientY === 0;
      if (keyboard) f.showAt(n, { placement: 'bottom-start', focus: 'first', inputType: 'keyboard' });
      else {
        const keep = composedContains(n, deepActiveElement());
        f.showAt(n, {
          position: { x: ev.clientX, y: ev.clientY },
          inputType: (ev as PointerEvent).pointerType === 'touch' ? 'touch' : 'mouse',
          ...(keep ? { focus: 'none' as const } : {}),
        });
      }
      return;
    }
  });
}
installContextFlyouts();

declare global {
  interface HTMLElementTagNameMap {
    'win-flyout': WinFlyout;
  }
}
