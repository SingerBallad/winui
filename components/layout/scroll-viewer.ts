import { WinElement, uid, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { clamp, rafThrottle } from '../../base/dom.ts';
import { prefersReducedMotion } from '../../theme/theme.ts';
import type { WinScrollBar, ScrollBarScrollDetail } from './scroll-bar.ts';

export type ScrollBarVisibility = 'auto' | 'visible' | 'hidden' | 'disabled';
export type ScrollMode = 'enabled' | 'disabled' | 'auto';

export interface ViewChangedDetail {
  horizontalOffset: number;
  verticalOffset: number;
  zoomFactor: number;
  isIntermediate: boolean;
}

const LINE_DELTA = 16;
const MOUSE_INDICATOR_TIMEOUT = 2000;
const TOUCH_INDICATOR_TIMEOUT = 500;

const scrollHostCss = css`
:host {
  display: flex;
  flex-direction: column;
  position: relative;
  box-sizing: border-box;
  min-width: 0;
  min-height: 0;
  overflow: hidden;
  border-radius: inherit;
}
.viewport {
  flex: 1 1 auto;
  min-width: 0;
  min-height: 0;
  overflow: auto;
  overscroll-behavior: auto;
  scrollbar-width: none;
  outline: none;
  border-radius: inherit;
  position: relative;
}
.viewport::-webkit-scrollbar { display: none; width: 0; height: 0; }
:host([data-no-x]) .viewport { overflow-x: hidden; }
:host([data-no-y]) .viewport { overflow-y: hidden; }
.content {
  box-sizing: border-box;
  min-width: 100%;
  zoom: var(--zoom, 1);
}
:host([data-measure-x]) .content { width: max-content; }
:host([data-fill-y]) .content { height: 100%; }
:host([data-fill-y]) .viewport { display: flex; flex-direction: column; }

win-scroll-bar { position: absolute; z-index: 1; }
.vbar { top: 1px; right: 1px; bottom: 1px; height: auto; }
.hbar { left: 1px; right: 1px; bottom: 1px; width: auto; }
:host([data-both-bars]) .vbar { bottom: 19px; }
:host([data-both-bars]) .hbar { right: 19px; }
win-scroll-bar[hidden] { display: none; }
`;

export abstract class ScrollHostBase extends WinElement {
  static override styles = [scrollHostCss];
  static override template = `<div class="viewport" part="viewport"><div class="content" part="content"><slot></slot></div></div><win-scroll-bar class="vbar" part="vertical-scroll-bar" orientation="vertical" indicator-mode="none" hidden></win-scroll-bar><win-scroll-bar class="hbar" part="horizontal-scroll-bar" orientation="horizontal" indicator-mode="none" hidden></win-scroll-bar>`;
  static override props: PropDefs = {
    horizontalScrollBarVisibility: { type: String, attribute: 'horizontal-scroll-bar-visibility', default: 'disabled' },
    verticalScrollBarVisibility: { type: String, attribute: 'vertical-scroll-bar-visibility', default: 'visible' },
    horizontalScrollMode: { type: String, attribute: 'horizontal-scroll-mode', default: 'auto' },
    verticalScrollMode: { type: String, attribute: 'vertical-scroll-mode', default: 'auto' },
    zoomMode: { type: String, attribute: 'zoom-mode', default: 'disabled' },
    minZoomFactor: { type: Number, attribute: 'min-zoom-factor', default: 0.1 },
    maxZoomFactor: { type: Number, attribute: 'max-zoom-factor', default: 10 },
    zoomFactor: { type: Number, attribute: 'zoom-factor', default: 1 },
  };
  declare horizontalScrollBarVisibility: ScrollBarVisibility;
  declare verticalScrollBarVisibility: ScrollBarVisibility;
  declare horizontalScrollMode: ScrollMode;
  declare verticalScrollMode: ScrollMode;
  declare zoomMode: 'enabled' | 'disabled';
  declare minZoomFactor: number;
  declare maxZoomFactor: number;
  declare zoomFactor: number;

  protected viewport!: HTMLElement;
  protected content!: HTMLElement;
  protected vbar!: WinScrollBar;
  protected hbar!: WinScrollBar;
  private hideTimer: ReturnType<typeof setTimeout> | null = null;
  private endTimer: ReturnType<typeof setTimeout> | null = null;
  private lastPointerType = 'mouse';
  private resizeObs: ResizeObserver | null = null;
  private appliedZoom = 1;

  get horizontalOffset(): number {
    return this.viewport?.scrollLeft ?? 0;
  }
  get verticalOffset(): number {
    return this.viewport?.scrollTop ?? 0;
  }
  get viewportWidth(): number {
    return this.viewport?.clientWidth ?? 0;
  }
  get viewportHeight(): number {
    return this.viewport?.clientHeight ?? 0;
  }
  get extentWidth(): number {
    return this.viewport?.scrollWidth ?? 0;
  }
  get extentHeight(): number {
    return this.viewport?.scrollHeight ?? 0;
  }
  get scrollableWidth(): number {
    return Math.max(0, this.extentWidth - this.viewportWidth);
  }
  get scrollableHeight(): number {
    return Math.max(0, this.extentHeight - this.viewportHeight);
  }
  get scrollElement(): HTMLElement {
    return this.viewport;
  }

  protected abstract axes(): { x: ScrollBarVisibility; y: ScrollBarVisibility; xMode: ScrollMode; yMode: ScrollMode };

  protected override firstConnected(): void {
    this.viewport = this.$('.viewport');
    this.content = this.$('.content');
    this.vbar = this.$('.vbar') as WinScrollBar;
    this.hbar = this.$('.hbar') as WinScrollBar;
    this.viewport.id = uid('scroll');
    this.vbar.setAttribute('aria-controls', this.viewport.id);
    this.hbar.setAttribute('aria-controls', this.viewport.id);
    this.vbar.smallChange = LINE_DELTA;
    this.hbar.smallChange = LINE_DELTA;

    const onScrollThrottled = rafThrottle(() => this.onScroll());
    this.viewport.addEventListener('scroll', onScrollThrottled, { passive: true });
    this.viewport.addEventListener('scrollend', () => this.onScrollEnd());

    this.vbar.addEventListener('scroll', (ev) => this.onBarScroll(ev as CustomEvent<ScrollBarScrollDetail>, 'y'));
    this.hbar.addEventListener('scroll', (ev) => this.onBarScroll(ev as CustomEvent<ScrollBarScrollDetail>, 'x'));

    this.addEventListener('pointermove', (ev) => {
      this.lastPointerType = ev.pointerType;
      if (ev.pointerType === 'mouse' || ev.pointerType === 'pen') this.showIndicator('mouse');
    });
    this.addEventListener('pointerenter', (ev) => {
      this.lastPointerType = ev.pointerType;
    });
    this.addEventListener('pointerleave', () => {
      this.scheduleHide(MOUSE_INDICATOR_TIMEOUT);
    });
    this.addEventListener('pointerdown', (ev) => {
      this.lastPointerType = ev.pointerType;
    });
    this.addEventListener('keydown', () => {
      this.lastPointerType = 'keyboard';
    });
    this.viewport.addEventListener(
      'wheel',
      (ev) => {
        this.lastPointerType = 'mouse';
        if (this.zoomMode === 'enabled' && ev.ctrlKey) {
          ev.preventDefault();
          const r = this.viewport.getBoundingClientRect();
          const factor = Math.exp(-ev.deltaY * (ev.deltaMode === 1 ? 0.05 : 0.0025));
          this.zoomAround(this.zoomFactor * factor, { x: ev.clientX - r.left, y: ev.clientY - r.top });
        }
      },
      { passive: false },
    );

    this.resizeObs = new ResizeObserver(() => this.syncBars());
    this.resizeObs.observe(this.viewport);
    this.resizeObs.observe(this.content);
    this.$<HTMLSlotElement>('slot').addEventListener('slotchange', () => this.syncBars());
  }

  protected override disconnected(): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    if (this.endTimer) clearTimeout(this.endTimer);
  }

  protected override updated(changed: Set<string>, first = false): void {
    const { x, y, xMode, yMode } = this.axes();
    this.toggleAttribute('data-no-x', x === 'disabled' || xMode === 'disabled');
    this.toggleAttribute('data-no-y', y === 'disabled' || yMode === 'disabled');
    this.toggleAttribute('data-measure-x', x !== 'disabled');
    this.toggleAttribute('data-fill-y', y === 'disabled');
    if (changed.has('zoomFactor') || first) {
      const z = clamp(this.zoomFactor || 1, this.minZoomFactor, this.maxZoomFactor);
      if (z !== this.appliedZoom) this.applyZoom(z, null);
    }
    this.syncBars();
  }

  private syncBars(): void {
    if (!this.viewport) return;
    const { x, y } = this.axes();
    const sx = this.scrollableWidth;
    const sy = this.scrollableHeight;
    const showY = (y === 'visible' && this.extentHeight > 0 && sy > 0.5) || (y === 'auto' && sy > 0.5);
    const showX = (x === 'visible' && sx > 0.5) || (x === 'auto' && sx > 0.5);
    this.vbar.hidden = !showY;
    this.hbar.hidden = !showX;
    this.toggleAttribute('data-both-bars', showX && showY);
    this.vbar.maximum = sy;
    this.vbar.viewportSize = this.viewportHeight;
    this.vbar.largeChange = this.viewportHeight;
    this.vbar.value = this.verticalOffset;
    this.hbar.maximum = sx;
    this.hbar.viewportSize = this.viewportWidth;
    this.hbar.largeChange = this.viewportWidth;
    this.hbar.value = this.horizontalOffset;
  }

  private onBarScroll(ev: CustomEvent<ScrollBarScrollDetail>, axis: 'x' | 'y'): void {
    const v = ev.detail.value;
    if (axis === 'y') this.viewport.scrollTop = v;
    else this.viewport.scrollLeft = v;
    this.showIndicator('mouse');
  }

  private showIndicator(mode: 'mouse' | 'touch'): void {
    const m = mode === 'mouse' && this.lastPointerType === 'touch' ? 'touch' : mode;
    if (this.vbar.indicatorMode !== m) this.vbar.indicatorMode = m;
    if (this.hbar.indicatorMode !== m) this.hbar.indicatorMode = m;
    this.scheduleHide(m === 'touch' ? TOUCH_INDICATOR_TIMEOUT + 300 : MOUSE_INDICATOR_TIMEOUT);
  }

  private scheduleHide(ms: number): void {
    if (this.hideTimer) clearTimeout(this.hideTimer);
    this.hideTimer = setTimeout(() => {
      if (this.vbar.isEngaged || this.hbar.isEngaged) {
        this.scheduleHide(MOUSE_INDICATOR_TIMEOUT);
        return;
      }
      this.vbar.indicatorMode = 'none';
      this.hbar.indicatorMode = 'none';
    }, ms);
  }

  private onScroll(): void {
    this.vbar.value = this.verticalOffset;
    this.hbar.value = this.horizontalOffset;
    this.showIndicator(this.lastPointerType === 'touch' ? 'touch' : 'mouse');
    this.emitView(true);
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = setTimeout(() => this.onScrollEnd(), 160);
  }

  private onScrollEnd(): void {
    if (this.endTimer) clearTimeout(this.endTimer);
    this.endTimer = null;
    this.emitView(false);
    this.scrollSettled();
  }

  protected scrollSettled(): void {}

  private lastEmitted = '';
  protected emitView(intermediate: boolean): void {
    const d: ViewChangedDetail = {
      horizontalOffset: this.horizontalOffset,
      verticalOffset: this.verticalOffset,
      zoomFactor: this.zoomFactor,
      isIntermediate: intermediate,
    };
    const key = `${d.horizontalOffset}|${d.verticalOffset}|${d.zoomFactor}|${intermediate}`;
    if (key === this.lastEmitted) return;
    this.lastEmitted = key;
    this.emit<ViewChangedDetail>('viewchanged', d, { bubbles: false });
  }

  protected zoomAround(target: number, center: { x: number; y: number } | null, programmatic = false): void {
    if (this.zoomMode !== 'enabled' && !programmatic) return;
    const z = clamp(target, this.minZoomFactor, this.maxZoomFactor);
    this.applyZoom(z, center);
    this.zoomFactor = z;
  }

  private applyZoom(z: number, center: { x: number; y: number } | null): void {
    if (!this.content) return;
    const z0 = this.appliedZoom;
    const c = center ?? { x: this.viewportWidth / 2, y: this.viewportHeight / 2 };
    const sx = (this.viewport.scrollLeft + c.x) / z0;
    const sy = (this.viewport.scrollTop + c.y) / z0;
    this.appliedZoom = z;
    this.content.style.setProperty('--zoom', String(z));
    this.viewport.scrollLeft = sx * z - c.x;
    this.viewport.scrollTop = sy * z - c.y;
    this.syncBars();
    this.emitView(false);
  }

  protected scrollToOffsets(x: number | null, y: number | null, animate: boolean): void {
    const opts: ScrollToOptions = { behavior: animate && !prefersReducedMotion() ? 'smooth' : 'instant' };
    if (x !== null) opts.left = clamp(x, 0, this.scrollableWidth);
    if (y !== null) opts.top = clamp(y, 0, this.scrollableHeight);
    this.viewport.scrollTo(opts);
    this.showIndicator('mouse');
  }
}

export class WinScrollViewer extends ScrollHostBase {
  static {
    this.define('win-scroll-viewer');
  }

  protected axes() {
    return {
      x: this.horizontalScrollBarVisibility,
      y: this.verticalScrollBarVisibility,
      xMode: this.horizontalScrollMode,
      yMode: this.verticalScrollMode,
    };
  }

  changeView(
    horizontalOffset: number | null,
    verticalOffset: number | null,
    zoomFactor: number | null = null,
    disableAnimation = false,
  ): boolean {
    const before = `${this.horizontalOffset}|${this.verticalOffset}|${this.zoomFactor}`;
    if (zoomFactor !== null) this.zoomAround(zoomFactor, null, true);
    this.scrollToOffsets(horizontalOffset, verticalOffset, !disableAnimation);
    return (
      before !==
      `${horizontalOffset ?? this.horizontalOffset}|${verticalOffset ?? this.verticalOffset}|${this.zoomFactor}`
    );
  }

  scrollToHorizontalOffset(offset: number): void {
    this.scrollToOffsets(offset, null, false);
  }

  scrollToVerticalOffset(offset: number): void {
    this.scrollToOffsets(null, offset, false);
  }

  override scrollTo(xOrOptions?: number | ScrollToOptions, y?: number): void {
    if (typeof xOrOptions === 'object') this.viewport.scrollTo(xOrOptions);
    else this.scrollToOffsets(xOrOptions ?? null, y ?? null, false);
  }

  override scrollBy(xOrOptions?: number | ScrollToOptions, y?: number): void {
    if (typeof xOrOptions === 'object') this.viewport.scrollBy(xOrOptions);
    else this.scrollToOffsets(this.horizontalOffset + (xOrOptions ?? 0), this.verticalOffset + (y ?? 0), false);
  }
}

export type ScrollingAnimationMode = 'auto' | 'enabled' | 'disabled';
export interface ScrollingOptions {
  animationMode?: ScrollingAnimationMode;
}

let correlation = 0;

export class WinScrollView extends ScrollHostBase {
  static override props: PropDefs = {
    contentOrientation: { type: String, attribute: 'content-orientation', default: 'vertical' },
    horizontalScrollBarVisibility: { type: String, attribute: 'horizontal-scroll-bar-visibility', default: 'auto' },
    verticalScrollBarVisibility: { type: String, attribute: 'vertical-scroll-bar-visibility', default: 'auto' },
  };
  declare contentOrientation: 'vertical' | 'horizontal' | 'both' | 'none';

  private pending: { id: number; kind: 'scroll' | 'zoom' } | null = null;

  static {
    this.define('win-scroll-view');
  }

  protected axes() {
    const o = this.contentOrientation;
    const xFree = o === 'horizontal' || o === 'both';
    const yFree = o === 'vertical' || o === 'both';
    const vis = (v: ScrollBarVisibility, free: boolean): ScrollBarVisibility =>
      free ? (v === 'disabled' ? 'hidden' : v) : 'disabled';
    return {
      x: vis(this.horizontalScrollBarVisibility, xFree),
      y: vis(this.verticalScrollBarVisibility, yFree),
      xMode: this.horizontalScrollMode,
      yMode: this.verticalScrollMode,
    };
  }

  private animated(opts?: ScrollingOptions): boolean {
    return (opts?.animationMode ?? 'auto') !== 'disabled';
  }

  override scrollTo(xOrOptions?: number | ScrollToOptions, y?: number, opts?: ScrollingOptions): number {
    const id = ++correlation;
    if (typeof xOrOptions === 'object') {
      this.viewport.scrollTo(xOrOptions);
    } else {
      this.emit('scrollanimationstarting', { correlationId: id }, { bubbles: false });
      this.scrollToOffsets(xOrOptions ?? this.horizontalOffset, y ?? this.verticalOffset, this.animated(opts));
    }
    this.pending = { id, kind: 'scroll' };
    this.requestCompletionCheck();
    return id;
  }

  override scrollBy(xOrOptions?: number | ScrollToOptions, y?: number, opts?: ScrollingOptions): number {
    if (typeof xOrOptions === 'object') {
      this.viewport.scrollBy(xOrOptions);
      return ++correlation;
    }
    return this.scrollTo(this.horizontalOffset + (xOrOptions ?? 0), this.verticalOffset + (y ?? 0), opts);
  }

  zoomTo(factor: number, center: { x: number; y: number } | null = null, _opts?: ScrollingOptions): number {
    const id = ++correlation;
    this.emit('zoomanimationstarting', { correlationId: id }, { bubbles: false });
    this.zoomAround(factor, center, true);
    this.emit('zoomcompleted', { correlationId: id }, { bubbles: false });
    return id;
  }

  zoomBy(delta: number, center: { x: number; y: number } | null = null, opts?: ScrollingOptions): number {
    return this.zoomTo(this.zoomFactor + delta, center, opts);
  }

  private requestCompletionCheck(): void {
    requestAnimationFrame(() =>
      requestAnimationFrame(() => {
        if (this.pending && !this.isScrolling()) this.scrollSettled();
      }),
    );
  }

  private lastPos = '';
  private isScrolling(): boolean {
    const p = `${this.horizontalOffset}|${this.verticalOffset}`;
    const moving = p !== this.lastPos;
    this.lastPos = p;
    return moving;
  }

  protected override scrollSettled(): void {
    if (!this.pending) return;
    const { id, kind } = this.pending;
    this.pending = null;
    this.emit(kind === 'scroll' ? 'scrollcompleted' : 'zoomcompleted', { correlationId: id }, { bubbles: false });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-scroll-viewer': WinScrollViewer;
    'win-scroll-view': WinScrollView;
  }
}
