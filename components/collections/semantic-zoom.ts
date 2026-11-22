import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { animate, cancelAnimations, durations, easings, settled } from '../../motion/animate.ts';
import { composedContains, deepActiveElement } from '../../base/dom.ts';

const zoomCss = css`
:host {
  display: block;
  position: relative;
  overflow: clip;
  box-sizing: border-box;
  clip-path: inset(0 round var(--w-sz-radius, 0px));
}
.view {
  position: absolute;
  inset: 0;
  overflow: auto;
  border-radius: inherit;
  scrollbar-width: thin;
  scrollbar-color: var(--w-control-strong-fill-color-default) transparent;
}
::slotted(*) { border-radius: var(--w-sz-radius, 0px); }
.view[hidden] { display: none; }
`;

export class WinSemanticZoom extends WinElement {
  static override styles = [zoomCss];
  static override template = `<div class="view in" part="zoomed-in-view"><slot name="zoomed-in"></slot></div><div class="view out" part="zoomed-out-view" hidden><slot name="zoomed-out"></slot></div>`;
  static override props: PropDefs = {
    zoomedInViewActive: { type: Boolean, attribute: 'zoomed-in-view-active', default: true },
    canChangeViews: { type: Boolean, attribute: 'can-change-views', default: true },
  };
  declare zoomedInViewActive: boolean;
  declare canChangeViews: boolean;

  static {
    this.define('win-semantic-zoom');
  }

  private inView!: HTMLElement;
  private outView!: HTMLElement;
  private pinch = new Map<number, { x: number; y: number }>();
  private pinchStart = 0;
  private token = 0;

  private syncRadius(): void {
    const r = getComputedStyle(this).borderTopLeftRadius;
    if (r && r !== '0px') this.style.setProperty('--w-sz-radius', r);
  }

  protected override connected(): void {
    this.syncRadius();
  }

  protected override firstConnected(): void {
    this.inView = this.$('.in');
    this.outView = this.$('.out');
    this.addEventListener(
      'wheel',
      (ev) => {
        if (!ev.ctrlKey || !this.canChangeViews) return;
        ev.preventDefault();
        if (ev.deltaY > 0 && this.zoomedInViewActive) this.toggleActiveView();
        else if (ev.deltaY < 0 && !this.zoomedInViewActive) this.toggleActiveView();
      },
      { passive: false },
    );
    this.addEventListener('keydown', (ev) => {
      if (!ev.ctrlKey || !this.canChangeViews) return;
      if ((ev.key === '-' || ev.key === 'Subtract') && this.zoomedInViewActive) {
        ev.preventDefault();
        this.toggleActiveView();
      } else if ((ev.key === '=' || ev.key === '+' || ev.key === 'Add') && !this.zoomedInViewActive) {
        ev.preventDefault();
        this.toggleActiveView();
      }
    });
    this.addEventListener('click', (ev) => {
      const t = ev.target as Element;
      if (this.zoomedInViewActive) {
        const z = t.closest?.('[data-zoom-out]');
        if (z && this.contains(z)) this.toggleActiveView(z);
      } else {
        const z = t.closest?.('[data-zoom-target]');
        if (z && this.contains(z)) this.toggleActiveView(z, z.getAttribute('data-zoom-target'));
      }
    });
    this.addEventListener('pointerdown', (ev) => {
      if (ev.pointerType !== 'touch') return;
      this.pinch.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (this.pinch.size === 2) this.pinchStart = this.pinchDistance();
    });
    this.addEventListener('pointermove', (ev) => {
      if (!this.pinch.has(ev.pointerId)) return;
      this.pinch.set(ev.pointerId, { x: ev.clientX, y: ev.clientY });
      if (this.pinch.size !== 2 || !this.pinchStart) return;
      const ratio = this.pinchDistance() / this.pinchStart;
      if (ratio < 0.7 && this.zoomedInViewActive) {
        this.pinchStart = 0;
        this.toggleActiveView();
      } else if (ratio > 1.4 && !this.zoomedInViewActive) {
        this.pinchStart = 0;
        this.toggleActiveView();
      }
    });
    const end = (ev: PointerEvent) => this.pinch.delete(ev.pointerId);
    this.addEventListener('pointerup', end);
    this.addEventListener('pointercancel', end);
  }

  private pinchDistance(): number {
    const [a, b] = [...this.pinch.values()];
    return a && b ? Math.hypot(a.x - b.x, a.y - b.y) : 0;
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (!changed.has('zoomedInViewActive')) return;
    if (first) {
      this.inView.hidden = !this.zoomedInViewActive;
      this.outView.hidden = this.zoomedInViewActive;
      return;
    }
  }

  private focusIncoming(slot: string, destination: HTMLElement | null): void {
    const root = this.querySelector<HTMLElement>(`:scope > [slot="${slot}"]`);
    if (!root) return;
    const focusable = (el: Element): el is HTMLElement =>
      el instanceof HTMLElement &&
      (el.tabIndex >= 0 || el.getAttribute('tabindex') === '-1') &&
      !el.hasAttribute('disabled') &&
      el.localName !== 'win-list-view-header';
    let target: HTMLElement | null = null;
    for (let n = destination; n && !target; n = n.nextElementSibling as HTMLElement | null)
      if (focusable(n)) target = n;
    target ??=
      root.querySelector<HTMLElement>('[tabindex="0"]') ??
      root.querySelector<HTMLElement>('button, [tabindex]:not([tabindex="-1"])') ??
      (focusable(root) ? root : null);
    target?.focus({ preventScroll: true });
  }

  private revealAtTop(el: HTMLElement): void {
    let scroller: HTMLElement | null = null;
    for (let n: Node | null = el; n && n !== this && !scroller;) {
      const parent: Node | null = n instanceof ShadowRoot ? n.host : ((n as Element).assignedSlot ?? n.parentNode);
      if (parent instanceof HTMLElement && parent !== this) {
        const oy = getComputedStyle(parent).overflowY;
        if ((oy === 'auto' || oy === 'scroll') && parent.scrollHeight > parent.clientHeight) scroller = parent;
      }
      n = parent;
    }
    if (!scroller) return;
    const k = scroller.offsetHeight ? scroller.getBoundingClientRect().height / scroller.offsetHeight : 1;
    const t = getComputedStyle(el).transform;
    const shift = t && t !== 'none' ? new DOMMatrixReadOnly(t).m42 : 0;
    scroller.scrollTop += (el.getBoundingClientRect().top - scroller.getBoundingClientRect().top) / (k || 1) - shift;
  }

  private visual(el: HTMLElement): { opacity: number; transform: string } {
    if (el.hidden) return { opacity: 0, transform: '' };
    const cs = getComputedStyle(el);
    return { opacity: Number(cs.opacity), transform: cs.transform === 'none' ? 'none' : cs.transform };
  }

  toggleActiveView(source: Element | null = null, targetId: string | null = null): void {
    if (!this.canChangeViews) return;
    this.syncRadius();
    const fromIn = this.zoomedInViewActive;
    const destination = targetId
      ? (this.querySelector(
          `[slot="zoomed-in"] #${CSS.escape(targetId)}, #${CSS.escape(targetId)}`,
        ) as HTMLElement | null)
      : null;
    const detail = { isSourceZoomedInView: fromIn, sourceItem: source, destinationItem: destination };
    this.emit('viewchangestarted', detail);
    const token = ++this.token;
    const outgoing = fromIn ? this.inView : this.outView;
    const incoming = fromIn ? this.outView : this.inView;
    const outTo = fromIn ? 'scale(0.86)' : 'scale(1.16)';
    const inFrom = fromIn ? 'scale(1.16)' : 'scale(0.86)';
    const outNow = this.visual(outgoing);
    const inNow = this.visual(incoming);
    this.zoomedInViewActive = !fromIn;
    incoming.hidden = false;
    outgoing.hidden = false;
    outgoing.style.pointerEvents = 'none';
    incoming.style.pointerEvents = '';
    if (destination && !fromIn) this.revealAtTop(destination);
    animate(
      outgoing,
      [
        { opacity: outNow.opacity, transform: outNow.transform || 'none' },
        { opacity: 0, transform: outTo },
      ],
      {
        duration: durations.fast,
        easing: easings.decelerate,
        fill: 'forwards',
      },
    );
    const a = animate(
      incoming,
      [
        { opacity: inNow.opacity, transform: inNow.transform || inFrom },
        { opacity: 1, transform: 'none' },
      ],
      { duration: durations.slow, easing: easings.decelerate },
    );
    void settled(a).then(() => {
      if (token !== this.token) return;
      const hadFocus = composedContains(outgoing, deepActiveElement());
      outgoing.hidden = true;
      outgoing.style.pointerEvents = '';
      cancelAnimations(outgoing);
      if (hadFocus || composedContains(this, deepActiveElement())) {
        this.focusIncoming(fromIn ? 'zoomed-out' : 'zoomed-in', destination);
      }
      this.emit('viewchangecompleted', detail);
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-semantic-zoom': WinSemanticZoom;
  }
}
