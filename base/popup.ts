import { composedContains, deepActiveElement, focusFirst, isRtl } from './dom.ts';
import { popupIn, popupOut, settled, type Side } from '../motion/animate.ts';
import { ElementSoundPlayer } from './sound.ts';

export type Placement =
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-start'
  | 'top-end'
  | 'bottom-start'
  | 'bottom-end'
  | 'left-start'
  | 'left-end'
  | 'right-start'
  | 'right-end'
  | 'full'
  | 'auto';

const WINUI_PLACEMENTS: Record<string, Placement> = {
  top: 'top',
  bottom: 'bottom',
  left: 'left',
  right: 'right',
  full: 'full',
  auto: 'auto',
  topedgealignedleft: 'top-start',
  topedgealignedright: 'top-end',
  bottomedgealignedleft: 'bottom-start',
  bottomedgealignedright: 'bottom-end',
  leftedgealignedtop: 'left-start',
  leftedgealignedbottom: 'left-end',
  rightedgealignedtop: 'right-start',
  rightedgealignedbottom: 'right-end',
};

export function normalizePlacement(v: string | null | undefined, fallback: Placement = 'top'): Placement {
  if (!v) return fallback;
  const k = v.toLowerCase().replace(/[\s_]/g, '');
  if (k in WINUI_PLACEMENTS) return WINUI_PLACEMENTS[k]!;
  const kebabbed = v.toLowerCase() as Placement;
  const valid: Placement[] = Object.values(WINUI_PLACEMENTS);
  return valid.includes(kebabbed) ? kebabbed : fallback;
}

export interface PositionResult {
  x: number;
  y: number;
  side: Side;
  maxHeight: number;
  maxWidth: number;
}

export function viewportSize(): { width: number; height: number } {
  const de = document.documentElement;
  return { width: de.clientWidth || innerWidth, height: de.clientHeight || innerHeight };
}

export function computePosition(
  anchor: DOMRect,
  size: { width: number; height: number },
  placement: Placement,
  offset = 4,
  pad = 8,
  rtl = false,
): PositionResult {
  const { width: vw, height: vh } = viewportSize();
  const w = size.width;
  const h = size.height;
  let [main, align] = placement.split('-') as [string, 'start' | 'end' | undefined];
  if (rtl && align) align = align === 'start' ? 'end' : 'start';

  if (main === 'full') {
    return {
      x: Math.max(pad, (vw - w) / 2),
      y: Math.max(pad, (vh - h) / 2),
      side: 'bottom',
      maxHeight: vh - pad * 2,
      maxWidth: vw - pad * 2,
    };
  }

  const space = {
    top: anchor.top - offset - pad,
    bottom: vh - anchor.bottom - offset - pad,
    left: anchor.left - offset - pad,
    right: vw - anchor.right - offset - pad,
  };
  const need = (s: Side) => (s === 'top' || s === 'bottom' ? h : w);
  const fits = (s: Side) => need(s) <= space[s];
  const opposite: Record<Side, Side> = { top: 'bottom', bottom: 'top', left: 'right', right: 'left' };

  let side: Side;
  if (main === 'auto') {
    const order: Side[] = ['bottom', 'top', 'right', 'left'];
    side = order.find(fits) ?? order.reduce((a, b) => (space[a] >= space[b] ? a : b));
  } else {
    side = main as Side;
    if (!fits(side) && fits(opposite[side])) side = opposite[side];
    else if (!fits(side) && !fits(opposite[side]) && space[opposite[side]] > space[side]) side = opposite[side];
  }

  let x: number;
  let y: number;
  if (side === 'top' || side === 'bottom') {
    y = side === 'bottom' ? anchor.bottom + offset : anchor.top - offset - h;
    x = align === 'start' ? anchor.left : align === 'end' ? anchor.right - w : anchor.left + (anchor.width - w) / 2;
  } else {
    x = side === 'right' ? anchor.right + offset : anchor.left - offset - w;
    y = align === 'start' ? anchor.top : align === 'end' ? anchor.bottom - h : anchor.top + (anchor.height - h) / 2;
  }

  x = Math.min(Math.max(x, pad), Math.max(pad, vw - pad - w));
  y = Math.min(Math.max(y, pad), Math.max(pad, vh - pad - h));

  const maxHeight = side === 'bottom' ? vh - pad - y : side === 'top' ? anchor.top - offset - pad : vh - pad * 2;
  const maxWidth = side === 'right' ? vw - pad - x : side === 'left' ? anchor.left - offset - pad : vw - pad * 2;
  return { x: Math.round(x), y: Math.round(y), side, maxHeight: Math.max(48, maxHeight), maxWidth };
}

export type DismissReason = 'outside' | 'escape' | 'anchor' | 'focus' | 'programmatic' | 'scroll';

export interface PopupOpenOptions {
  anchor?: Element | DOMRect | { x: number; y: number } | null;
  placement?: Placement;
  offset?: number;
  padding?: number;
  lightDismiss?: boolean;
  closeOnEscape?: boolean;
  parent?: Popup | null;
  focus?: 'first' | 'surface' | 'none' | HTMLElement;
  restoreFocus?: boolean;
  animateIn?: ((surface: HTMLElement, side: Side) => Animation | null) | 'none';
  animateOut?: ((surface: HTMLElement) => Animation | null) | 'none';
  onDismiss?: (reason: DismissReason) => boolean | undefined;
  onClosed?: (reason: DismissReason) => void;
  passThrough?: Element[];
  track?: boolean;
  minWidthFromAnchor?: boolean;
  position?: (size: { width: number; height: number }, anchorRect: DOMRect) => PositionResult;
  stack?: boolean;
}

const supportsPopover = typeof HTMLElement !== 'undefined' && typeof HTMLElement.prototype.showPopover === 'function';

const stack: Popup[] = [];
let globalsInstalled = false;
let suppressClickOn: { el: Element; until: number } | null = null;

function installGlobals(): void {
  if (globalsInstalled) return;
  globalsInstalled = true;

  document.addEventListener(
    'pointerdown',
    (ev) => {
      if (!stack.length) return;
      const path = ev.composedPath();
      for (let i = stack.length - 1; i >= 0; i--) {
        const p = stack[i]!;
        if (path.includes(p.el)) return;
        if (p.opts.passThrough?.some((e) => path.includes(e))) return;
        if (p.opts.lightDismiss === false) return;
        const anchorEl = p.anchorElement;
        const onAnchor = !!anchorEl && path.includes(anchorEl);
        p.dismiss(onAnchor ? 'anchor' : 'outside');
        if (onAnchor) {
          suppressClickOn = { el: anchorEl!, until: performance.now() + 600 };
          return;
        }
      }
    },
    true,
  );

  document.addEventListener(
    'click',
    (ev) => {
      if (!suppressClickOn) return;
      const s = suppressClickOn;
      suppressClickOn = null;
      if (performance.now() > s.until) return;
      if (ev.composedPath().includes(s.el)) {
        ev.stopImmediatePropagation();
        ev.preventDefault();
      }
    },
    true,
  );

  document.addEventListener(
    'keydown',
    (ev) => {
      if (ev.key !== 'Escape' || !stack.length) return;
      const top = stack[stack.length - 1]!;
      if (top.opts.closeOnEscape === false) return;
      ev.preventDefault();
      ev.stopPropagation();
      top.dismiss('escape');
    },
    true,
  );

  document.addEventListener(
    'focusin',
    (ev) => {
      if (!stack.length) return;
      const path = ev.composedPath();
      for (let i = stack.length - 1; i >= 0; i--) {
        const p = stack[i]!;
        if (path.includes(p.el)) return;
        if (p.opts.passThrough?.some((e) => path.includes(e))) return;
        if (p.anchorElement && path.includes(p.anchorElement)) return;
        if (p.opts.lightDismiss === false) return;
        for (let q = p.opts.parent; q; q = q.opts.parent) if (path.includes(q.el)) return;
        p.dismiss('focus');
      }
    },
    true,
  );
}

export function topPopup(): Popup | null {
  return stack[stack.length - 1] ?? null;
}

export class Popup {
  readonly el: HTMLElement;
  surface: HTMLElement;
  opts: PopupOpenOptions = {};
  side: Side = 'bottom';
  private _open = false;
  private restoreTo: HTMLElement | null = null;
  private tracker: (() => void) | null = null;
  private closing: Promise<void> | null = null;
  private anchorRect: DOMRect | null = null;

  constructor(el: HTMLElement, surface?: HTMLElement) {
    this.el = el;
    this.surface = surface ?? el;
    if (supportsPopover) el.setAttribute('popover', 'manual');
    else {
      el.style.position = 'fixed';
      el.style.zIndex = '2147483000';
      el.style.display = 'none';
    }
  }

  get isOpen(): boolean {
    return this._open;
  }

  get anchorElement(): Element | null {
    const a = this.opts.anchor;
    return a instanceof Element ? a : null;
  }

  private descendants(): Popup[] {
    return stack.filter((p) => {
      for (let q = p.opts.parent; q; q = q.opts.parent) if (q === this) return true;
      return false;
    });
  }

  open(opts: PopupOpenOptions = {}): void {
    installGlobals();
    this.opts = { lightDismiss: true, closeOnEscape: true, restoreFocus: true, track: true, focus: 'none', ...opts };
    if (this._open) {
      this.reposition();
      return;
    }
    this._open = true;
    this.closing = null;
    const active = deepActiveElement();
    this.restoreTo = active instanceof HTMLElement && !composedContains(this.el, active) ? active : null;

    if (supportsPopover) {
      if (!this.el.matches(':popover-open')) this.el.showPopover();
    } else {
      this.el.style.display = '';
    }
    this.el.toggleAttribute('data-open', true);
    if (this.opts.stack !== false) {
      if (this.opts.lightDismiss !== false) {
        for (const p of [...stack].reverse()) {
          let isAncestor = false;
          for (let q = this.opts.parent; q; q = q.opts.parent) if (q === p) isAncestor = true;
          if (!isAncestor && p.opts.lightDismiss !== false) p.dismiss('programmatic');
        }
      }
      stack.push(this);
    }
    this.reposition();

    if (this.opts.track) {
      const onMove = () => this.reposition();
      const onScroll = (ev: Event) => {
        const t = ev.target as Node | null;
        if (t && t instanceof Node && composedContains(this.el, t)) return;
        this.reposition();
      };
      addEventListener('resize', onMove);
      document.addEventListener('scroll', onScroll, true);
      this.tracker = () => {
        removeEventListener('resize', onMove);
        document.removeEventListener('scroll', onScroll, true);
      };
    }

    if (this.opts.stack !== false) ElementSoundPlayer.play('show');
    const animIn = this.opts.animateIn;
    if (animIn !== 'none') {
      if (typeof animIn === 'function') animIn(this.surface, this.side);
      else popupIn(this.surface, this.side);
    }

    const f = this.opts.focus;
    if (f instanceof HTMLElement) f.focus({ preventScroll: true });
    else if (f === 'first') {
      if (!focusFirst(this.el)) this.surface.focus({ preventScroll: true });
    } else if (f === 'surface') this.surface.focus({ preventScroll: true });
  }

  reposition(): void {
    if (!this._open) return;
    const o = this.opts;
    const a = o.anchor;
    let rect: DOMRect | null = null;
    if (a instanceof Element) rect = a.getBoundingClientRect();
    else if (a && 'width' in a) rect = a as DOMRect;
    else if (a && 'x' in a) rect = new DOMRect(a.x, a.y, 0, 0);
    if (!rect) return;
    this.anchorRect = rect;
    const s = this.el.style;
    if (o.minWidthFromAnchor) s.minWidth = `${rect.width}px`;
    s.left = '0px';
    s.top = '0px';
    s.removeProperty('--w-popup-max-height');
    const size = { width: this.el.offsetWidth, height: this.el.offsetHeight };
    const rtl = a instanceof Element ? isRtl(a) : false;
    const pos = o.position
      ? o.position(size, rect)
      : computePosition(rect, size, o.placement ?? 'bottom', o.offset ?? 4, o.padding ?? 8, rtl);
    this.side = pos.side;
    s.left = `${pos.x}px`;
    s.top = `${pos.y}px`;
    s.setProperty('--w-popup-max-height', `${Math.floor(pos.maxHeight)}px`);
    this.el.dataset.side = pos.side;
  }

  dismiss(reason: DismissReason): void {
    if (!this._open) return;
    if (this.opts.onDismiss?.(reason) === false) return;
    void this.close(reason);
  }

  close(reason: DismissReason = 'programmatic'): Promise<void> {
    if (!this._open) return this.closing ?? Promise.resolve();
    this._open = false;
    for (const child of this.descendants().reverse()) void child.close(reason);
    const idx = stack.indexOf(this);
    if (idx >= 0) stack.splice(idx, 1);
    this.tracker?.();
    this.tracker = null;

    if (this.opts.stack !== false) ElementSoundPlayer.play('hide');
    const focusInside = composedContains(this.el, deepActiveElement());
    const animOut = this.opts.animateOut;
    const anim =
      animOut === 'none' ? null : typeof animOut === 'function' ? animOut(this.surface) : popupOut(this.surface);
    this.closing = settled(anim).then(() => {
      if (this._open) return;
      this.el.removeAttribute('data-open');
      if (supportsPopover) {
        if (this.el.matches(':popover-open')) this.el.hidePopover();
      } else this.el.style.display = 'none';
      // Cancel only after hiding: the forwards-filled exit must never flash the surface back for a frame.
      for (const a of this.surface.getAnimations({ subtree: true })) a.cancel();
      if (this.opts.restoreFocus && (focusInside || reason === 'escape') && this.restoreTo?.isConnected) {
        this.restoreTo.focus({ preventScroll: true });
      }
      this.opts.onClosed?.(reason);
    });
    return this.closing;
  }

  get lastAnchorRect(): DOMRect | null {
    return this.anchorRect;
  }
}

export interface FlyoutShowOptions {
  placement?: Placement;
  position?: { x: number; y: number };
  focus?: 'first' | 'none';
  inputType?: 'mouse' | 'touch' | 'pen' | 'keyboard';
}

export interface FlyoutLike extends HTMLElement {
  showAt(anchor: Element | DOMRect | { x: number; y: number }, opts?: FlyoutShowOptions): void;
  hide(): void;
  readonly isOpen: boolean;
}

export function isFlyout(el: unknown): el is FlyoutLike {
  return el instanceof HTMLElement && typeof (el as Partial<FlyoutLike>).showAt === 'function';
}

export function attachedFlyout(host: HTMLElement): FlyoutLike | null {
  const child = host.querySelector(':scope > [slot="flyout"]');
  if (isFlyout(child)) return child;
  const id = host.getAttribute('flyout');
  if (id) {
    const root = host.getRootNode() as Document | ShadowRoot;
    const el = root.getElementById?.(id) ?? document.getElementById(id);
    if (isFlyout(el)) return el;
  }
  return null;
}

export function popupResetCss(sel: string): string {
  return `
${sel} {
  position: fixed;
  inset: auto;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  overflow: visible;
  width: max-content;
  height: auto;
  max-width: none;
  max-height: none;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  text-align: start;
  white-space: normal;
  letter-spacing: normal;
  word-spacing: normal;
  text-transform: none;
  text-indent: 0;
  text-shadow: none;
  font-style: normal;
  visibility: visible;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
}
${sel}:not(:popover-open):not([data-open]) { display: none !important; }
`;
}
