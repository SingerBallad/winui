import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { motionEnabled } from '../../motion/animate.ts';

const parallaxCss = css`
:host { display: block; position: relative; overflow: hidden; }
.child {
  position: absolute;
  left: 0;
  top: 0;
  width: calc(100% + var(--_hs, 0px));
  height: calc(100% + var(--_vs, 0px));
  will-change: transform;
}
::slotted(*) { width: 100%; height: 100%; display: block; object-fit: cover; }
`;

function scrollParent(el: Element): HTMLElement | null {
  let n: Node | null = el.parentNode;
  while (n) {
    if (n instanceof ShadowRoot) {
      n = n.host;
      continue;
    }
    if (n instanceof HTMLElement) {
      const s = getComputedStyle(n);
      if (
        /(auto|scroll|overlay)/.test(s.overflowY + s.overflowX) &&
        (n.scrollHeight > n.clientHeight || n.scrollWidth > n.clientWidth)
      )
        return n;
    }
    n = n.parentNode;
  }
  return document.scrollingElement as HTMLElement | null;
}

export class WinParallaxView extends WinElement {
  static override styles = [parallaxCss];
  static override template = `<div class="child" part="child"><slot></slot></div>`;
  static override props: PropDefs = {
    source: { type: String },
    verticalShift: { type: Number, attribute: 'vertical-shift', default: 0 },
    horizontalShift: { type: Number, attribute: 'horizontal-shift', default: 0 },
    verticalSourceOffsetKind: { type: String, attribute: 'vertical-source-offset-kind', default: 'relative' },
    horizontalSourceOffsetKind: { type: String, attribute: 'horizontal-source-offset-kind', default: 'relative' },
    verticalSourceStartOffset: { type: Number, attribute: 'vertical-source-start-offset', default: 0 },
    verticalSourceEndOffset: { type: Number, attribute: 'vertical-source-end-offset', default: 0 },
    horizontalSourceStartOffset: { type: Number, attribute: 'horizontal-source-start-offset', default: 0 },
    horizontalSourceEndOffset: { type: Number, attribute: 'horizontal-source-end-offset', default: 0 },
    isVerticalShiftClamped: { type: Boolean, attribute: 'is-vertical-shift-clamped', default: true },
    isHorizontalShiftClamped: { type: Boolean, attribute: 'is-horizontal-shift-clamped', default: true },
  };
  declare source: string;
  declare verticalShift: number;
  declare horizontalShift: number;
  declare verticalSourceOffsetKind: 'relative' | 'absolute';
  declare horizontalSourceOffsetKind: 'relative' | 'absolute';
  declare verticalSourceStartOffset: number;
  declare verticalSourceEndOffset: number;
  declare horizontalSourceStartOffset: number;
  declare horizontalSourceEndOffset: number;
  declare isVerticalShiftClamped: boolean;
  declare isHorizontalShiftClamped: boolean;

  private scroller: HTMLElement | null = null;
  private queued = false;
  private cleanup: (() => void) | null = null;

  static {
    this.define('win-parallax-view');
  }

  protected override connected(): void {
    requestAnimationFrame(() => this.bind());
  }

  protected override disconnected(): void {
    this.cleanup?.();
    this.cleanup = null;
  }

  protected override updated(changed: Set<string>): void {
    this.style.setProperty('--_vs', `${Math.max(0, this.verticalShift)}px`);
    this.style.setProperty('--_hs', `${Math.max(0, this.horizontalShift)}px`);
    if (changed.has('source') && this.isConnected) this.bind();
    this.schedule();
  }

  refresh(): void {
    this.schedule();
  }

  private bind(): void {
    this.cleanup?.();
    const root = this.getRootNode() as Document | ShadowRoot;
    const byId = this.source ? (root.getElementById?.(this.source) ?? document.getElementById(this.source)) : null;
    this.scroller = (byId as HTMLElement | null) ?? scrollParent(this);
    const target: EventTarget = this.scroller === document.scrollingElement ? window : (this.scroller ?? window);
    const onScroll = () => this.schedule();
    target.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll);
    const ro = new ResizeObserver(onScroll);
    ro.observe(this);
    this.cleanup = () => {
      target.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
      ro.disconnect();
    };
    this.schedule();
  }

  private schedule(): void {
    if (this.queued) return;
    this.queued = true;
    requestAnimationFrame(() => {
      this.queued = false;
      this.apply();
    });
  }

  private axisProgress(axis: 'y' | 'x'): number {
    const sc = this.scroller;
    if (!sc) return 0;
    const isDoc = sc === document.scrollingElement;
    const relative = (axis === 'y' ? this.verticalSourceOffsetKind : this.horizontalSourceOffsetKind) !== 'absolute';
    const start = axis === 'y' ? this.verticalSourceStartOffset : this.horizontalSourceStartOffset;
    const end = axis === 'y' ? this.verticalSourceEndOffset : this.horizontalSourceEndOffset;
    const clamped = axis === 'y' ? this.isVerticalShiftClamped : this.isHorizontalShiftClamped;
    let p: number;
    const inside =
      isDoc ||
      sc.contains(this) ||
      sc.contains(this.getRootNode() instanceof ShadowRoot ? (this.getRootNode() as ShadowRoot).host : this);
    if (relative && !inside) {
      const pos = axis === 'y' ? sc.scrollTop : sc.scrollLeft;
      const max = axis === 'y' ? sc.scrollHeight - sc.clientHeight : sc.scrollWidth - sc.clientWidth;
      p = (pos - start) / Math.max(1, max - start + end);
    } else if (relative) {
      const vr = isDoc ? new DOMRect(0, 0, innerWidth, innerHeight) : sc.getBoundingClientRect();
      const r = this.getBoundingClientRect();
      if (axis === 'y') {
        const a = vr.bottom + start;
        const b = vr.top - r.height + end;
        p = (a - r.top) / Math.max(1, a - b);
      } else {
        const a = vr.right + start;
        const b = vr.left - r.width + end;
        p = (a - r.left) / Math.max(1, a - b);
      }
    } else {
      const pos = axis === 'y' ? sc.scrollTop : sc.scrollLeft;
      const max = axis === 'y' ? sc.scrollHeight - sc.clientHeight : sc.scrollWidth - sc.clientWidth;
      const e = end > start ? end : max;
      p = (pos - start) / Math.max(1, e - start);
    }
    return clamped ? Math.min(1, Math.max(0, p)) : p;
  }

  private apply(): void {
    if (!this.isInitialized) return;
    const child = this.$('.child');
    if (!child) return;
    if (!motionEnabled()) {
      child.style.transform = '';
      return;
    }
    const ty = -Math.max(0, this.verticalShift) * this.axisProgress('y');
    const tx = -Math.max(0, this.horizontalShift) * this.axisProgress('x');
    child.style.transform = `translate3d(${tx.toFixed(2)}px, ${ty.toFixed(2)}px, 0)`;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-parallax-view': WinParallaxView;
  }
}
