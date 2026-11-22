import { WinElement, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css, materialOverrides } from '../../base/css.ts';
import { acceleratorText } from '../../base/keyboard.ts';
import {
  computePosition,
  Popup,
  popupResetCss,
  viewportSize,
  type Placement,
  type PositionResult,
} from '../../base/popup.ts';
import { animate, durations, easings } from '../../motion/animate.ts';

const SHOW_DELAY = 400;
const RESHOW_WINDOW = 500;

const tipCss = css`
${popupResetCss(':host')}
:host { pointer-events: none; }
.tip {
  box-sizing: border-box;
  max-width: 320px;
  padding: 6px 9px 8px;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-control);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-tooltip);
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-caption);
  overflow-wrap: anywhere;
  pointer-events: none;
}
.accel { color: var(--w-text-fill-color-secondary); }
.accel:empty { display: none; }
`;

type Anchor = { kind: 'pointer'; x: number; y: number } | { kind: 'element'; el: Element };

let lastClosed = 0;
let current: WinToolTip | null = null;

export class WinToolTip extends WinElement {
  static override styles = [tipCss, css`${materialOverrides('.tip')}`];
  static override materialPart = '.tip';
  static override template = `<div class="tip" part="tip" role="tooltip"><slot></slot><span class="text"></span><span class="accel"></span></div>`;
  static override props: PropDefs = {
    for: { type: String },
    placement: { type: String, default: 'top' },
    placementElement: { type: Boolean, attribute: 'placement-element' },
    isOpen: { type: Boolean, attribute: 'is-open' },
    verticalOffset: { type: Number, attribute: 'vertical-offset', default: 0 },
  };
  declare for: string;
  declare placement: string;
  declare placementElement: boolean;
  declare isOpen: boolean;
  declare verticalOffset: number;

  private popup!: Popup;
  private target: HTMLElement | null = null;
  private showTimer: ReturnType<typeof setTimeout> | null = null;
  private wired = new WeakSet<HTMLElement>();
  private anchor: Anchor | null = null;
  private suppressed = false;
  private onScroll = () => this.hideNow();
  private onEsc = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape' && this.popup?.isOpen) this.hideNow();
  };

  static {
    this.define('win-tool-tip');
  }

  protected override firstConnected(): void {
    this.popup = new Popup(this, this.$('.tip'));
  }

  protected override connected(): void {
    queueMicrotask(() => this.attach());
  }

  protected override disconnected(): void {
    this.hideNow();
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('for') && !first) this.attach();
    if (changed.has('isOpen') && !first) {
      if (this.isOpen && !this.popup.isOpen) this.openAt(this.target ? { kind: 'element', el: this.target } : null);
      else if (!this.isOpen && this.popup.isOpen) this.hideNow();
    }
  }

  setText(text: string, accel = ''): void {
    this.$('.text').textContent = text;
    this.$('.accel').textContent = accel ? ` (${accel})` : '';
  }

  private attach(): void {
    if (this.hasAttribute('data-shared')) return;
    let t: HTMLElement | null = null;
    if (this.for) {
      const root = this.getRootNode() as Document | ShadowRoot;
      t = (root.getElementById?.(this.for) ?? document.getElementById(this.for)) as HTMLElement | null;
    } else t = this.parentElement;
    this.target = t;
    if (!t || this.wired.has(t)) return;
    this.wired.add(t);
    t.addEventListener('pointerenter', (ev) => {
      if (ev.pointerType === 'touch') return;
      this.schedule({ kind: 'pointer', x: ev.clientX, y: ev.clientY });
    });
    t.addEventListener('pointermove', (ev) => {
      if (this.showTimer && this.anchor?.kind === 'pointer')
        this.anchor = { kind: 'pointer', x: ev.clientX, y: ev.clientY };
    });
    t.addEventListener('pointerleave', () => {
      this.suppressed = false;
      this.hideNow();
    });
    t.addEventListener('pointerdown', () => {
      this.suppressed = true;
      this.hideNow();
    });
    t.addEventListener('focusin', () => {
      if (t.matches(':focus-visible') || t.querySelector(':focus-visible')) this.schedule({ kind: 'element', el: t });
    });
    t.addEventListener('focusout', () => this.hideNow());
  }

  schedule(anchor: Anchor): void {
    if (this.suppressed) return;
    if (this.showTimer) clearTimeout(this.showTimer);
    this.anchor = anchor;
    const delay = performance.now() - lastClosed < RESHOW_WINDOW || current ? 0 : SHOW_DELAY;
    this.showTimer = setTimeout(() => {
      this.showTimer = null;
      this.openAt(this.anchor);
    }, delay);
  }

  private openAt(anchor: Anchor | null): void {
    if (current && current !== this) current.hideNow(true);
    current = this;
    if (!this.isConnected) document.body.append(this);
    const a: Anchor =
      this.placementElement && this.target
        ? { kind: 'element', el: this.target }
        : (anchor ?? { kind: 'element', el: this.target ?? document.body });
    const instant = performance.now() - lastClosed < RESHOW_WINDOW;
    this.popup.open({
      anchor: a.kind === 'element' ? a.el : new DOMRect(a.x, a.y, 0, 0),
      position: (size, rect) => this.place(size, rect, a.kind),
      stack: false,
      lightDismiss: false,
      closeOnEscape: false,
      focus: 'none',
      restoreFocus: false,
      track: false,
      animateIn: (s) =>
        animate(s, [{ opacity: 0 }, { opacity: 1 }], {
          duration: instant ? durations.faster : durations.fast,
          easing: easings.linear,
        }),
      animateOut: (s) =>
        animate(s, [{ opacity: 1 }, { opacity: 0 }], {
          duration: durations.faster,
          easing: easings.linear,
          fill: 'forwards',
        }),
    });
    if (!this.isOpen && !this.hasAttribute('data-shared')) this.isOpen = true;
    document.addEventListener('scroll', this.onScroll, true);
    document.addEventListener('keydown', this.onEsc, true);
    this.emit('opened', undefined, { bubbles: false });
  }

  hideNow(instant = false): void {
    if (this.showTimer) clearTimeout(this.showTimer);
    this.showTimer = null;
    document.removeEventListener('scroll', this.onScroll, true);
    document.removeEventListener('keydown', this.onEsc, true);
    if (current === this) current = null;
    if (!this.popup?.isOpen) return;
    lastClosed = performance.now();
    if (instant) {
      const opts = this.popup.opts;
      opts.animateOut = 'none';
    }
    void this.popup.close('programmatic');
    if (this.isOpen && !this.hasAttribute('data-shared')) this.isOpen = false;
    this.emit('closed', undefined, { bubbles: false });
  }

  private place(size: { width: number; height: number }, rect: DOMRect, kind: Anchor['kind']): PositionResult {
    const off = this.verticalOffset;
    if (kind === 'element') {
      const p = (['top', 'bottom', 'left', 'right'].includes(this.placement) ? this.placement : 'top') as Placement;
      return computePosition(rect, size, p, 4 + off, 8);
    }
    const { width: vw, height: vh } = viewportSize();
    const pad = 8;
    let x = rect.left - size.width / 2;
    let y = rect.top - 12 - off - size.height;
    let side: PositionResult['side'] = 'top';
    if (this.placement === 'bottom' || y < pad) {
      y = rect.top + 24 + off;
      side = 'bottom';
    }
    x = Math.min(Math.max(x, pad), Math.max(pad, vw - pad - size.width));
    y = Math.min(Math.max(y, pad), Math.max(pad, vh - pad - size.height));
    return { x: Math.round(x), y: Math.round(y), side, maxHeight: vh, maxWidth: 320 };
  }
}

let shared: WinToolTip | null = null;
let sharedOwner: Element | null = null;

function sharedTip(): WinToolTip {
  if (!shared) {
    shared = document.createElement('win-tool-tip') as WinToolTip;
    shared.setAttribute('data-shared', '');
    document.body.append(shared);
  }
  return shared;
}

function ownerFromPath(path: EventTarget[]): HTMLElement | null {
  for (const n of path) {
    if (!(n instanceof HTMLElement)) continue;
    if (n.hasAttribute('tooltip') || n.hasAttribute('data-auto-tooltip')) return n;
    if (n.localName === 'win-tool-tip') return null;
  }
  return null;
}

function textFor(el: Element): { text: string; accel: string } {
  const text = el.getAttribute('tooltip') ?? el.getAttribute('data-auto-tooltip') ?? '';
  const spec = el.getAttribute('accelerator-text') ?? el.getAttribute('accelerator') ?? '';
  const accel = spec ? acceleratorText(spec.split(/[,;]/)[0]!.trim()) : '';
  return { text, accel };
}

let attrInstalled = false;
export function installToolTipService(): void {
  if (attrInstalled || typeof document === 'undefined') return;
  attrInstalled = true;
  let suppressedOwner: Element | null = null;
  document.addEventListener(
    'pointerover',
    (ev) => {
      if (ev.pointerType === 'touch') return;
      const owner = ownerFromPath(ev.composedPath());
      if (owner === sharedOwner) return;
      if (sharedOwner) sharedTip().hideNow();
      sharedOwner = owner;
      if (!owner || owner === suppressedOwner) return;
      const { text, accel } = textFor(owner);
      if (!text) return;
      const tip = sharedTip();
      tip.setText(text, accel);
      tip.schedule({ kind: 'pointer', x: ev.clientX, y: ev.clientY });
    },
    true,
  );
  document.addEventListener(
    'pointerout',
    (ev) => {
      if (!sharedOwner) return;
      const to = ev.relatedTarget as Node | null;
      if (to && (to === sharedOwner || sharedOwner.contains(to))) return;
      const owner = ownerFromPath(ev.composedPath());
      if (owner !== sharedOwner) return;
      sharedTip().hideNow();
      sharedOwner = null;
      suppressedOwner = null;
    },
    true,
  );
  document.addEventListener(
    'pointerdown',
    () => {
      if (sharedOwner) {
        suppressedOwner = sharedOwner;
        sharedTip().hideNow();
      }
    },
    true,
  );
  document.addEventListener('focusin', (ev) => {
    const owner = ownerFromPath(ev.composedPath());
    if (!owner) return;
    const focused = ev.composedPath()[0] as Element;
    if (!(focused instanceof Element) || !focused.matches(':focus-visible')) return;
    const { text, accel } = textFor(owner);
    if (!text) return;
    sharedOwner = owner;
    const tip = sharedTip();
    tip.setText(text, accel);
    tip.schedule({ kind: 'element', el: owner });
  });
  document.addEventListener('focusout', () => {
    if (sharedOwner) {
      sharedTip().hideNow();
      sharedOwner = null;
    }
  });
}
installToolTipService();

declare global {
  interface HTMLElementTagNameMap {
    'win-tool-tip': WinToolTip;
  }
}
