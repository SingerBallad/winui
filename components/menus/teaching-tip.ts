import { WinElement, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css, focusRing, materialOverrides, scrollbars } from '../../base/css.ts';
import { glyph, iconHtml } from '../../base/icons.ts';
import { Popup, popupResetCss, viewportSize, type PositionResult } from '../../base/popup.ts';
import { animate, durations, easings, fadeIn } from '../../motion/animate.ts';
import '../buttons/button.ts';

export type TeachingTipPlacement =
  | 'auto'
  | 'top'
  | 'bottom'
  | 'left'
  | 'right'
  | 'top-right'
  | 'top-left'
  | 'bottom-right'
  | 'bottom-left'
  | 'left-top'
  | 'left-bottom'
  | 'right-top'
  | 'right-bottom'
  | 'center';

export type TeachingTipCloseReason = 'close-button' | 'light-dismiss' | 'programmatic';

const PLACEMENTS: TeachingTipPlacement[] = [
  'auto',
  'top',
  'bottom',
  'left',
  'right',
  'top-right',
  'top-left',
  'bottom-right',
  'bottom-left',
  'left-top',
  'left-bottom',
  'right-top',
  'right-bottom',
  'center',
];

function normalizeTipPlacement(v: string | null | undefined): TeachingTipPlacement {
  if (!v) return 'auto';
  const k = v.replace(/([a-z])([A-Z])/g, '$1-$2').toLowerCase() as TeachingTipPlacement;
  return PLACEMENTS.includes(k) ? k : 'auto';
}

const TAIL_W = 20;
const TAIL_H = 10;
const TAIL_INSET = 20;

const tipCss = css`
${popupResetCss(':host')}
.tip { position: relative; box-sizing: border-box; padding: 0; }
.body {
  position: relative;
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  min-width: 320px;
  max-width: 336px;
  min-height: 40px;
  max-height: min(520px, var(--w-popup-max-height, 520px));
  background: var(--w-solid-background-fill-color-tertiary);
  border: 1px solid var(--w-surface-stroke-color-default);
  border-radius: var(--w-corner-radius-overlay);
  box-shadow: var(--w-elevation-flyout);
  color: var(--w-text-fill-color-primary);
  overflow: hidden;
}
:host([is-light-dismiss-enabled]) .body { ${acrylicSurface} }
.highlight {
  position: absolute;
  inset: 0 0 auto 0;
  height: 1px;
  background: color-mix(in srgb, var(--w-control-fill-color-default) 86%, transparent);
  pointer-events: none;
  border-radius: 8px 8px 0 0;
}
.hero { flex: none; overflow: hidden; }
.hero.empty { display: none; }
.hero ::slotted(*) { display: block; max-width: 100%; }
:host([hero-content-placement="bottom"]) .hero { order: 3; }
.main-root { position: relative; flex: 1 1 auto; min-height: 0; display: flex; }
.scroll { flex: 1 1 auto; min-height: 0; overflow-y: auto; overflow-x: hidden; }
.stack { margin: 12px; }
.header { display: flex; align-items: flex-start; }
.icon { display: none; flex: none; margin: 0 12px 0 0; }
:host([data-has-icon]) .icon { display: flex; }
.titles { flex: 1 1 auto; min-width: 0; }
:host([data-header-close]) .titles { margin-right: 28px; }
.title { font: var(--w-type-body-strong); overflow-wrap: anywhere; }
.subtitle { font: var(--w-type-body); overflow-wrap: anywhere; }
.title:empty, .subtitle:empty { display: none; }
.content { font: var(--w-type-body); }
:host([data-has-content]) .content { margin-top: 12px; }
.buttons { display: none; grid-template-columns: 1fr 1fr; column-gap: 8px; margin-top: 12px; }
:host([data-buttons]) .buttons { display: grid; }
.buttons win-button { width: 100%; min-width: 0; }
.buttons win-button[hidden] { display: none; }
.buttons win-button.span { grid-column: 1 / span 2; }
.alt-close {
  position: absolute;
  top: 0;
  right: 0;
  width: 40px;
  height: 40px;
  display: none;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border: 1px solid transparent;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-primary);
  background: transparent;
  cursor: default;
  outline: none;
  transition: background-color var(--w-duration-faster) linear;
}
:host([data-header-close]) .alt-close { display: flex; }
.alt-close:hover { background: var(--w-subtle-fill-color-secondary); }
.alt-close:active { background: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-secondary); }
${focusRing('.alt-close:focus-visible', 0)}
.tail {
  position: absolute;
  width: ${TAIL_W}px;
  height: ${TAIL_H}px;
  overflow: visible;
  pointer-events: none;
  display: none;
}
:host([data-tail]) .tail { display: block; }
.tail .fill { fill: var(--w-solid-background-fill-color-tertiary); }
.tail-material {
  position: absolute;
  width: ${TAIL_W}px;
  height: ${TAIL_H}px;
  pointer-events: none;
  display: none;
  clip-path: polygon(0 0, 50% 100%, 100% 0);
}
:host([data-tail]:is([is-light-dismiss-enabled], [material])) .tail-material { display: block; }
:host(:is([is-light-dismiss-enabled], [material])) .tail .fill { fill: transparent; }
:host([is-light-dismiss-enabled]) .tail-material { ${acrylicSurface} }
${materialOverrides('.body')}
${materialOverrides('.tail-material')}
.tail .edge { fill: none; stroke: var(--w-surface-stroke-color-default); stroke-width: 1; }
`;

export class WinTeachingTip extends WinElement {
  static override styles = [scrollbars, tipCss];
  static override materialPart = '.body';
  static override template = `<div class="tip" part="tip"><div class="body" part="body" role="dialog" aria-labelledby="title"><div class="hero" part="hero"><slot name="hero"></slot></div><div class="main-root"><div class="scroll w-scroll"><div class="stack"><div class="header"><span class="icon" part="icon"><span class="icon-spec"></span><slot name="icon"></slot></span><div class="titles"><div class="title" part="title" id="title"></div><div class="subtitle" part="subtitle"></div></div></div><div class="content" part="content"><slot></slot></div><div class="buttons" part="buttons"><win-button class="action" part="action-button"></win-button><win-button class="close" part="close-button"></win-button></div></div></div><button class="alt-close" part="alternate-close-button" type="button" tabindex="0">${glyph('cancel', 16)}</button></div><span class="highlight"></span></div><div class="tail-material" part="tail-material"></div><svg class="tail" part="tail" viewBox="0 0 ${TAIL_W} ${TAIL_H}" aria-hidden="true"><polygon class="fill" points="0,0 10,10 20,0"/><polyline class="edge" points="0,0 10,10 20,0"/></svg></div>`;
  static override props: PropDefs = {
    target: { type: String },
    subtitle: { type: String },
    icon: { type: String },
    preferredPlacement: { type: String, attribute: 'preferred-placement', default: 'auto' },
    placementMargin: { type: Number, attribute: 'placement-margin', default: 0 },
    isLightDismissEnabled: { type: Boolean, attribute: 'is-light-dismiss-enabled' },
    actionButtonContent: { type: String, attribute: 'action-button-content' },
    closeButtonContent: { type: String, attribute: 'close-button-content' },
    heroContentPlacement: { type: String, attribute: 'hero-content-placement', reflect: true, default: 'auto' },
    tailVisibility: { type: String, attribute: 'tail-visibility', default: 'auto' },
    isOpen: { type: Boolean, attribute: 'is-open' },
    shouldConstrainToRootBounds: { type: Boolean, attribute: 'should-constrain-to-root-bounds', default: true },
  };
  declare target: string;
  declare subtitle: string;
  declare icon: string;
  declare preferredPlacement: string;
  declare placementMargin: number;
  declare isLightDismissEnabled: boolean;
  declare actionButtonContent: string;
  declare closeButtonContent: string;
  declare heroContentPlacement: 'auto' | 'top' | 'bottom';
  declare tailVisibility: 'auto' | 'visible' | 'collapsed';
  declare isOpen: boolean;
  declare shouldConstrainToRootBounds: boolean;

  private _title = '';
  private popup!: Popup;
  private placed: TeachingTipPlacement = 'top';
  private closeReason: TeachingTipCloseReason = 'programmatic';
  private keyHandler = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape' && !ev.defaultPrevented && this.isOpen && !this.isLightDismissEnabled) {
      ev.preventDefault();
      this.requestClose('close-button');
    }
  };

  static {
    this.define('win-teaching-tip');
    Object.defineProperty(this.prototype, 'title', {
      configurable: true,
      get(this: WinTeachingTip) {
        return this._title;
      },
      set(this: WinTeachingTip, v: string) {
        this._title = String(v ?? '');
        this.syncText();
      },
    });
  }

  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'title'];
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === 'title') {
      if (value !== null) {
        this._title = value;
        this.removeAttribute('title');
        this.syncText();
      }
      return;
    }
    super.attributeChangedCallback(name, old, value);
  }

  get targetElement(): HTMLElement | null {
    if (!this.target) return null;
    const root = this.getRootNode() as Document | ShadowRoot;
    return (root.getElementById?.(this.target) ?? document.getElementById(this.target)) as HTMLElement | null;
  }

  protected override firstConnected(): void {
    const t = this.getAttribute('title');
    if (t !== null) {
      this._title = t;
      this.removeAttribute('title');
    }
    this.popup = new Popup(this, this.$('.tip'));
    this.$('win-button.action').addEventListener('click', () => {
      this.emit('actionbuttonclick', undefined, { bubbles: false });
    });
    this.$('win-button.close').addEventListener('click', () => {
      this.emit('closebuttonclick', undefined, { bubbles: false });
      this.requestClose('close-button');
    });
    this.$('.alt-close').addEventListener('click', () => {
      this.emit('closebuttonclick', undefined, { bubbles: false });
      this.requestClose('close-button');
    });
    this.$('.alt-close').setAttribute(
      'aria-label',
      /^zh/i.test(document.documentElement.lang || navigator.language) ? '关闭' : 'Close',
    );
    this.$('slot[name="hero"]').addEventListener('slotchange', () => this.syncParts());
    this.$('slot[name="icon"]').addEventListener('slotchange', () => this.syncParts());
    this.$<HTMLSlotElement>('slot:not([name])').addEventListener('slotchange', () => this.syncParts());
  }

  protected override updated(changed: Set<string>, first = false): void {
    this.syncText();
    this.syncParts();
    if (changed.has('isOpen') && !first) {
      if (this.isOpen) this.show();
      else if (this.popup.isOpen) this.requestClose('programmatic');
    } else if (first && this.isOpen) {
      queueMicrotask(() => this.show());
    }
  }

  private syncText(): void {
    if (!this.isInitialized) return;
    this.$('.title').textContent = this._title;
    this.$('.subtitle').textContent = this.subtitle;
    this.$('.icon-spec').innerHTML = iconHtml(this.icon, 24);
  }

  private syncParts(): void {
    if (!this.isInitialized) return;
    const action = this.$<HTMLElement>('win-button.action');
    const close = this.$<HTMLElement>('win-button.close');
    action.textContent = this.actionButtonContent;
    close.textContent = this.closeButtonContent;
    const hasAction = !!this.actionButtonContent;
    const hasClose = !!this.closeButtonContent && !this.isLightDismissEnabled;
    action.hidden = !hasAction;
    close.hidden = !hasClose;
    action.classList.toggle('span', hasAction && !hasClose);
    close.classList.toggle('span', hasClose && !hasAction);
    this.toggleAttr('data-buttons', hasAction || hasClose);
    this.toggleAttr('data-header-close', !this.isLightDismissEnabled && !hasClose);
    const iconSlotted = this.$<HTMLSlotElement>('slot[name="icon"]').assignedNodes().length > 0;
    this.toggleAttr('data-has-icon', !!this.icon || iconSlotted);
    const contentNodes = this.$<HTMLSlotElement>('slot:not([name])')
      .assignedNodes()
      .filter((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim());
    this.toggleAttr('data-has-content', contentNodes.length > 0);
    this.$('.hero').classList.toggle(
      'empty',
      this.$<HTMLSlotElement>('slot[name="hero"]').assignedNodes().length === 0,
    );
  }

  show(): void {
    if (!this.isConnected) document.body.append(this);
    if (!this.isInitialized) this.connectedCallback();
    if (this.popup.isOpen) {
      this.popup.reposition();
      return;
    }
    if (!this.isOpen) this.isOpen = true;
    this.syncParts();
    const target = this.targetElement;
    const light = this.isLightDismissEnabled;
    this.popup.open({
      anchor: target ?? new DOMRect(0, 0, 0, 0),
      position: (size) => this.position(size),
      lightDismiss: light,
      closeOnEscape: light,
      stack: light,
      focus: 'none',
      restoreFocus: true,
      animateIn: (s) => this.animateIn(s),
      animateOut: (s) => this.animateOut(s),
      onDismiss: (reason) => {
        this.requestClose(reason === 'programmatic' ? 'programmatic' : 'light-dismiss');
        return false;
      },
      onClosed: () => {
        document.removeEventListener('keydown', this.keyHandler);
        this.emit('closed', { reason: this.closeReason }, { bubbles: false });
      },
    });
    document.addEventListener('keydown', this.keyHandler);
  }

  hide(): void {
    this.requestClose('programmatic');
  }

  private requestClose(reason: TeachingTipCloseReason): void {
    if (!this.popup?.isOpen) return;
    let cancelled = false;
    const ok = this.emit(
      'closing',
      {
        reason,
        get cancel() {
          return cancelled;
        },
        set cancel(v: boolean) {
          cancelled = v;
        },
      },
      { cancelable: true, bubbles: false },
    );
    if (!ok || cancelled) {
      if (!this.isOpen) this.isOpen = true;
      return;
    }
    this.closeReason = reason;
    if (this.isOpen) this.isOpen = false;
    void this.popup.close('programmatic');
  }

  private showTail(): boolean {
    if (this.tailVisibility === 'collapsed') return false;
    return !!this.targetElement || this.tailVisibility === 'visible';
  }

  private position(size: { width: number; height: number }): PositionResult {
    const { width: vw, height: vh } = viewportSize();
    const pad = 8;
    const m = this.placementMargin;
    const target = this.targetElement;
    const tail = this.showTail() && !!target;
    const extra = tail ? TAIL_H - 1 : 0;
    const bw = size.width;
    const bh = size.height;
    const pref = normalizeTipPlacement(this.preferredPlacement);

    if (!target) {
      const edge = 12 + m;
      const p = pref === 'auto' ? 'bottom' : pref;
      let x = (vw - bw) / 2;
      let y = (vh - bh) / 2;
      if (p.startsWith('top') || p.endsWith('top')) y = edge;
      if (p.startsWith('bottom') || p.endsWith('bottom')) y = vh - bh - edge;
      if (p.startsWith('left') || p.endsWith('left')) x = edge;
      if (p.startsWith('right') || p.endsWith('right')) x = vw - bw - edge;
      this.placed = p;
      this.layoutTail(null, bw, bh);
      return { x: Math.round(x), y: Math.round(y), side: 'top', maxHeight: vh - pad * 2, maxWidth: vw - pad * 2 };
    }

    const r = target.getBoundingClientRect();
    const cx = r.left + r.width / 2;
    const cy = r.top + r.height / 2;
    const candidates: TeachingTipPlacement[] =
      pref === 'auto'
        ? ['top', 'bottom', 'left', 'right']
        : [pref, ...(['top', 'bottom', 'left', 'right'] as TeachingTipPlacement[]).filter((p) => p !== pref)];

    const compute = (p: TeachingTipPlacement): { x: number; y: number; fits: boolean } => {
      let x: number;
      let y: number;
      const main = p.split('-')[0] as 'top' | 'bottom' | 'left' | 'right' | 'center';
      const sub = p.split('-')[1];
      if (main === 'top' || main === 'bottom' || main === 'center') {
        y = main === 'top' ? r.top - extra - m - bh : main === 'bottom' ? r.bottom + extra + m : cy - extra - bh;
        x = sub === 'right' ? cx - TAIL_INSET : sub === 'left' ? cx + TAIL_INSET - bw : cx - bw / 2;
      } else {
        x = main === 'left' ? r.left - extra - m - bw : r.right + extra + m;
        y = sub === 'bottom' ? cy - TAIL_INSET : sub === 'top' ? cy + TAIL_INSET - bh : cy - bh / 2;
      }
      const fits = x >= pad && y >= pad && x + bw <= vw - pad && y + bh <= vh - pad;
      return { x, y, fits };
    };

    let chosen = candidates[0]!;
    let pos = compute(chosen);
    if (!pos.fits) {
      for (const c of candidates) {
        const p = compute(c);
        if (p.fits) {
          chosen = c;
          pos = p;
          break;
        }
      }
    }
    if (this.shouldConstrainToRootBounds) {
      pos.x = Math.min(Math.max(pos.x, pad), Math.max(pad, vw - pad - bw));
      pos.y = Math.min(Math.max(pos.y, pad), Math.max(pad, vh - pad - bh));
    }
    this.placed = chosen;
    this.layoutTail(tail ? { cx: cx - pos.x, cy: cy - pos.y } : null, bw, bh);
    const side = chosen.startsWith('bottom')
      ? 'bottom'
      : chosen.startsWith('left')
        ? 'left'
        : chosen.startsWith('right')
          ? 'right'
          : 'top';
    return { x: Math.round(pos.x), y: Math.round(pos.y), side, maxHeight: vh - pad * 2, maxWidth: vw - pad * 2 };
  }

  private layoutTail(c: { cx: number; cy: number } | null, bw: number, bh: number): void {
    const svg = this.$<SVGSVGElement>('.tail');
    this.toggleAttr('data-tail', !!c);
    if (!c) return;
    const main = this.placed.split('-')[0];
    const s = svg.style;

    const clampX = (v: number) => Math.min(Math.max(v, 12), bw - 12);
    const clampY = (v: number) => Math.min(Math.max(v, 12), bh - 12);
    s.left = s.top = s.transform = '';
    if (main === 'top' || main === 'center') {
      s.left = `${clampX(c.cx) - TAIL_W / 2}px`;
      s.top = `${bh - 1}px`;
      s.transform = '';
      this.$('.tip').style.transformOrigin = `${clampX(c.cx)}px ${bh + TAIL_H}px`;
    } else if (main === 'bottom') {
      s.left = `${clampX(c.cx) - TAIL_W / 2}px`;
      s.top = `${-TAIL_H + 1}px`;
      s.transform = 'rotate(180deg)';
      this.$('.tip').style.transformOrigin = `${clampX(c.cx)}px ${-TAIL_H}px`;
    } else if (main === 'left') {
      s.left = `${bw - 1 - (TAIL_W - TAIL_H) / 2}px`;
      s.top = `${clampY(c.cy) - TAIL_H / 2}px`;
      s.transform = 'rotate(-90deg)';
      this.$('.tip').style.transformOrigin = `${bw + TAIL_H}px ${clampY(c.cy)}px`;
    } else {
      s.left = `${-TAIL_H + 1 - (TAIL_W - TAIL_H) / 2}px`;
      s.top = `${clampY(c.cy) - TAIL_H / 2}px`;
      s.transform = 'rotate(90deg)';
      this.$('.tip').style.transformOrigin = `${-TAIL_H}px ${clampY(c.cy)}px`;
    }
    const m = this.$('.tail-material').style;
    m.left = s.left;
    m.top = s.top;
    m.transform = s.transform;
  }

  private animateIn(surface: HTMLElement): Animation {
    const cs = getComputedStyle(surface);
    const midExit = surface.getAnimations().length > 0 && Number(cs.opacity) < 1;
    if (midExit) {
      animate(surface, [{ opacity: Number(cs.opacity) || 0 }, { opacity: 1 }], {
        duration: durations.faster,
        easing: easings.linear,
      });
    } else fadeIn(surface, durations.faster);
    return animate(surface, [{ transform: midExit ? cs.transform : 'scale(0.88)' }, { transform: 'none' }], {
      duration: durations.normal,
      easing: easings.decelerate,
    });
  }

  private animateOut(surface: HTMLElement): Animation {
    const cs = getComputedStyle(surface);
    const opacity = Number(cs.opacity);
    animate(surface, [{ opacity: Number.isNaN(opacity) ? 1 : opacity }, { opacity: 0 }], {
      duration: durations.fast,
      easing: easings.linear,
      fill: 'forwards',
    });
    return animate(surface, [{ transform: cs.transform || 'none' }, { transform: 'scale(0.94)' }], {
      duration: durations.fast,
      easing: easings.decelerate,
      fill: 'forwards',
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-teaching-tip': WinTeachingTip;
  }
}
