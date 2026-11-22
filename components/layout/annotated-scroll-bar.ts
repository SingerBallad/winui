import { WinElement, escapeHtml, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { clamp } from '../../base/dom.ts';
import { Popup, popupResetCss } from '../../base/popup.ts';
import { fadeIn } from '../../motion/animate.ts';

export interface AnnotatedScrollBarLabel {
  content: string;
  scrollOffset: number;
}

export interface DetailLabelRequestedDetail {
  scrollOffset: number;
  content: string | null;
}

const annotatedCss = css`
:host {
  display: inline-grid;
  grid-template-rows: auto minmax(0, 1fr) auto;
  min-width: 44px;
  height: 100%;
  box-sizing: border-box;
  user-select: none;
  -webkit-user-select: none;
  touch-action: none;
}
.btn {
  justify-self: end;
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 16px;
  min-height: 16px;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-primary);
  background: transparent;
}
.btn:hover { color: var(--w-text-fill-color-secondary); }
.btn[data-pressed] { color: var(--w-text-fill-color-tertiary); }
:host([disabled]) .btn { color: var(--w-text-fill-color-disabled); }
.rail { position: relative; min-height: 0; cursor: default; }
.labels { position: absolute; inset: 0; pointer-events: none; }
.label {
  position: absolute;
  right: 0;
  min-width: 44px;
  margin: -5px 0 -2px;
  font: var(--w-type-body);
  color: var(--w-text-fill-color-primary);
  text-align: right;
  white-space: nowrap;
  transition: opacity var(--w-duration-faster) linear;
}
.label[hidden] { display: block; opacity: 0; }
.thumb, .ghost {
  position: absolute;
  right: 0;
  width: 30px;
  height: 3px;
  border-radius: 1.5px;
  pointer-events: none;
}
.thumb {
  background: var(--w-accent-fill-color-default);
  top: var(--thumb-y, 0px);
}
.ghost {
  background: var(--w-accent-fill-color-disabled);
  top: var(--ghost-y, 0px);
  opacity: 0;
  transition: opacity var(--w-duration-faster) linear;
}
.rail:hover .ghost, :host([data-w-dragging]) .ghost { opacity: 1; }
${popupResetCss('.tip')}
.tip {
  box-sizing: border-box;
  min-height: 40px;
  max-width: 360px;
  padding: 6px 9px 8px;
  display: flex;
  align-items: center;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-control);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-tooltip);
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body-strong);
  pointer-events: none;
}
.tip span { margin-bottom: 2px; }
`;

export class WinAnnotatedScrollBar extends WinElement {
  static override styles = [annotatedCss];
  static override template = `<div class="btn up" part="decrement-button" aria-hidden="true">${glyph('caretUp', 8)}</div><div class="rail" part="rail"><div class="labels" part="labels"></div><div class="ghost" part="thumb-ghost"></div><div class="thumb" part="thumb"></div></div><div class="btn down" part="increment-button" aria-hidden="true">${glyph('caretDown', 8)}</div><div class="tip" part="tooltip" role="tooltip"><span></span></div>`;
  static override props: PropDefs = {
    for: { type: String },
    smallChange: { type: Number, attribute: 'small-change', default: 8 },
    disabled: { type: Boolean },
    labels: { type: Array, default: [] },
  };
  declare for: string;
  declare smallChange: number;
  declare disabled: boolean;
  declare labels: AnnotatedScrollBarLabel[];

  static {
    this.define('win-annotated-scroll-bar');
  }

  private rail!: HTMLElement;
  private tipPopup!: Popup;
  private target: HTMLElement | null = null;
  private detachTarget: (() => void) | null = null;
  private resizeObs: ResizeObserver | null = null;
  private repeat: ReturnType<typeof setTimeout> | null = null;

  get scrollTarget(): HTMLElement | null {
    return this.target;
  }

  attachTo(el: HTMLElement | null): void {
    this.detachTarget?.();
    this.detachTarget = null;
    const scroller =
      el && 'scrollElement' in el ? ((el as unknown as { scrollElement: HTMLElement }).scrollElement ?? el) : el;
    this.target = scroller;
    if (!scroller) return;
    const onScroll = () => this.syncThumb();
    scroller.addEventListener('scroll', onScroll, { passive: true });
    this.resizeObs?.observe(scroller);
    this.detachTarget = () => {
      scroller.removeEventListener('scroll', onScroll);
      this.resizeObs?.unobserve(scroller);
    };
    if (scroller.id) this.setAttribute('aria-controls', scroller.id);
    this.layoutLabels();
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'scrollbar');
    this.aria('aria-orientation', 'vertical');
    this.rail = this.$('.rail');
    this.tipPopup = new Popup(this.$('.tip'));
    this.resizeObs = new ResizeObserver(() => this.layoutLabels());
    this.resizeObs.observe(this.rail);

    for (const btn of this.$$<HTMLElement>('.btn')) {
      btn.addEventListener('pointerdown', (ev) => {
        if (this.disabled || ev.button !== 0) return;
        ev.preventDefault();
        btn.setPointerCapture(ev.pointerId);
        btn.toggleAttribute('data-pressed', true);
        const dir = btn.classList.contains('up') ? -1 : 1;
        const step = () => this.target?.scrollBy({ top: dir * this.smallChange, behavior: 'instant' });
        step();
        this.repeat = setTimeout(
          function tick(this: WinAnnotatedScrollBar) {
            step();
            this.repeat = setTimeout(tick.bind(this), 250);
          }.bind(this),
          250,
        );
      });
      const end = () => {
        btn.removeAttribute('data-pressed');
        if (this.repeat) clearTimeout(this.repeat);
        this.repeat = null;
      };
      btn.addEventListener('pointerup', end);
      btn.addEventListener('pointercancel', end);
      btn.addEventListener('lostpointercapture', end);
    }

    this.rail.addEventListener('pointermove', (ev) => this.hoverAt(ev));
    this.rail.addEventListener('pointerleave', () => {
      if (!this.hasAttribute('data-w-dragging')) void this.tipPopup.close();
    });
    this.rail.addEventListener('pointerdown', (ev) => {
      if (this.disabled || ev.button !== 0) return;
      ev.preventDefault();
      this.rail.setPointerCapture(ev.pointerId);
      this.toggleAttribute('data-w-dragging', true);
      this.scrollToRailY(this.railY(ev));
      const move = (e: PointerEvent) => this.scrollToRailY(this.railY(e));
      const up = () => {
        this.rail.removeEventListener('pointermove', move);
        this.rail.removeEventListener('pointerup', up);
        this.rail.removeEventListener('lostpointercapture', up);
        this.removeAttribute('data-w-dragging');
        void this.tipPopup.close();
      };
      this.rail.addEventListener('pointermove', move);
      this.rail.addEventListener('pointerup', up);
      this.rail.addEventListener('lostpointercapture', up);
    });
  }

  protected override connected(): void {
    queueMicrotask(() => this.resolveTarget());
  }

  protected override disconnected(): void {
    this.detachTarget?.();
    this.detachTarget = null;
  }

  protected override updated(changed: Set<string>): void {
    if (changed.has('for') && this.isConnected) this.resolveTarget();
    if (changed.has('labels')) this.layoutLabels();
    if (changed.has('disabled')) this.aria('aria-disabled', this.disabled ? 'true' : null);
  }

  private resolveTarget(): void {
    if (!this.for) return;
    const root = this.getRootNode() as Document | ShadowRoot;
    const el = (root.getElementById?.(this.for) ?? document.getElementById(this.for)) as HTMLElement | null;
    if (el) {
      if (el.localName.includes('-') && !customElements.get(el.localName)) {
        void customElements.whenDefined(el.localName).then(() => this.attachTo(el));
      } else this.attachTo(el);
    }
  }

  private get scrollable(): number {
    const t = this.target;
    return t ? Math.max(0, t.scrollHeight - t.clientHeight) : 0;
  }

  private railY(ev: PointerEvent): number {
    const r = this.rail.getBoundingClientRect();
    return clamp(ev.clientY - r.top, 0, r.height);
  }

  private offsetForRailY(y: number): number {
    const h = this.rail.clientHeight;
    return h > 0 ? (y / h) * this.scrollable : 0;
  }

  private scrollToRailY(y: number): void {
    if (!this.target) return;
    const offset = this.offsetForRailY(y);
    this.target.scrollTo({ top: offset, behavior: 'instant' });
    this.showTip(y, offset);
  }

  private hoverAt(ev: PointerEvent): void {
    const y = this.railY(ev);
    this.style.setProperty('--ghost-y', `${clamp(y - 1.5, 0, Math.max(0, this.rail.clientHeight - 3))}px`);
    if (ev.pointerType !== 'touch') this.showTip(y, this.offsetForRailY(y));
  }

  private detailFor(offset: number): string {
    const detail: DetailLabelRequestedDetail = { scrollOffset: offset, content: null };
    this.emit('detaillabelrequested', detail, { bubbles: false });
    if (detail.content !== null && detail.content !== undefined) return String(detail.content);
    const sorted = [...(this.labels ?? [])].sort((a, b) => a.scrollOffset - b.scrollOffset);
    let best = sorted[0]?.content ?? '';
    for (const l of sorted) if (l.scrollOffset <= offset + 0.5) best = l.content;
    return best;
  }

  private showTip(y: number, offset: number): void {
    const text = this.detailFor(offset);
    const tip = this.$('.tip');
    tip.querySelector('span')!.textContent = text;
    if (!text) {
      void this.tipPopup.close();
      return;
    }
    const r = this.rail.getBoundingClientRect();
    const anchor = new DOMRect(r.right - 30, r.top + y, 0, 0);
    if (this.tipPopup.isOpen) {
      this.tipPopup.opts.anchor = anchor;
      this.tipPopup.reposition();
    } else {
      this.tipPopup.open({
        anchor,
        placement: 'left',
        offset: 12,
        stack: false,
        lightDismiss: false,
        focus: 'none',
        restoreFocus: false,
        track: false,
        animateIn: (s) => fadeIn(s),
      });
    }
  }

  private syncThumb(): void {
    const t = this.target;
    if (!t) return;
    const h = this.rail.clientHeight;
    const frac = this.scrollable > 0 ? t.scrollTop / this.scrollable : 0;
    this.style.setProperty('--thumb-y', `${clamp(frac, 0, 1) * Math.max(0, h - 3)}px`);
    this.aria('aria-valuemin', 0);
    this.aria('aria-valuemax', Math.round(this.scrollable));
    this.aria('aria-valuenow', Math.round(t.scrollTop));
  }

  private layoutLabels(): void {
    if (!this.rail) return;
    const host = this.$('.labels');
    const h = this.rail.clientHeight;
    const max = this.scrollable;
    const sorted = [...(this.labels ?? [])].sort((a, b) => a.scrollOffset - b.scrollOffset);
    host.innerHTML = sorted.map((l) => `<div class="label">${escapeHtml(String(l.content))}</div>`).join('');
    const els = Array.from(host.children) as HTMLElement[];
    let lastBottom = -Infinity;
    sorted.forEach((l, i) => {
      const el = els[i]!;
      const y = max > 0 ? (clamp(l.scrollOffset, 0, max) / max) * h : 0;
      el.style.top = `${y}px`;
      const lh = 19;
      const top = y - 5;
      const visible = top >= lastBottom && top + lh - 7 <= h + 2;
      el.hidden = !visible;
      if (visible) lastBottom = top + lh;
    });
    this.syncThumb();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-annotated-scroll-bar': WinAnnotatedScrollBar;
  }
}
