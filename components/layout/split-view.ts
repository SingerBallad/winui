import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, materialOverrides } from '../../base/css.ts';
import { composedContains, deepActiveElement, isFocusable, isRtl } from '../../base/dom.ts';
import { animate, settled } from '../../motion/animate.ts';

export type SplitViewDisplayMode = 'overlay' | 'inline' | 'compact-overlay' | 'compact-inline';

const OVERLAY_TIMING = { open: 350, close: 120, easing: 'cubic-bezier(0.1, 0.9, 0.2, 1)' };
const INLINE_TIMING = { open: 200, close: 100, easing: 'cubic-bezier(0, 0.35, 0.15, 1)' };
const MIN_DURATION_FRACTION = 0.4;

interface Geometry {
  compact: boolean;
  inline: boolean;
  end: boolean;
  e: number;
  open: number;
  d: number;
}

const splitViewCss = css`
:host {
  display: block;
  position: relative;
  box-sizing: border-box;
  overflow: hidden;
  overflow: clip;
  isolation: isolate;
  --open: 320px;
  --compact: 48px;
  --d: max(0px, calc(var(--open) - var(--compact)));
}
.root { position: relative; display: flex; width: 100%; height: 100%; min-height: inherit; }
.pane {
  position: absolute;
  inset-block: 0;
  inset-inline-start: 0;
  width: var(--open);
  box-sizing: border-box;
  z-index: 2;
  overflow: hidden;
  background: var(--pane-background, light-dark(#f2f2f2, #171717));
  color: var(--w-text-fill-color-primary);
  display: none;
}
:host([pane-placement="right"]) .pane { inset-inline-start: auto; inset-inline-end: 0; }
.pane-inner { width: var(--open); height: 100%; overflow: auto; scrollbar-width: thin; }
.content {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
  --reserve: 0px;
  margin-inline-start: var(--reserve);
}
:host([pane-placement="right"]) .content { margin-inline-start: 0; margin-inline-end: var(--reserve); }
.dismiss {
  position: absolute;
  inset: 0;
  z-index: 1;
  display: none;
  background: transparent;
}
:host([light-dismiss-overlay-mode="on"]) .dismiss {
  background: light-dark(rgba(255, 255, 255, 0.6), rgba(0, 0, 0, 0.6));
}

:host([pane-open]) .pane,
:host([data-w-animating]) .pane,
:host([display-mode="compact-overlay"]) .pane,
:host([display-mode="compact-inline"]) .pane { display: block; }

:host([display-mode^="compact"]:not([pane-open])) .pane { clip-path: inset(0 var(--d) 0 0); }
:host([display-mode^="compact"]:not([pane-open]):dir(rtl)) .pane { clip-path: inset(0 0 0 var(--d)); }
:host([display-mode^="compact"][pane-placement="right"]:not([pane-open])) .pane { transform: translateX(var(--d)); }
:host([display-mode^="compact"][pane-placement="right"]:not([pane-open]):dir(rtl)) .pane { transform: translateX(calc(-1 * var(--d))); }

:host([display-mode="inline"][pane-open]) .content,
:host([display-mode="compact-inline"][pane-open]) .content { --reserve: var(--open); }
:host([display-mode="compact-overlay"]) .content,
:host([display-mode="compact-inline"]:not([pane-open])) .content { --reserve: var(--compact); }

:host([pane-open]:not([display-mode="inline"]):not([display-mode="compact-inline"])) .dismiss,
:host([data-w-animating]:not([display-mode="inline"]):not([display-mode="compact-inline"])) .dismiss { display: block; }
:host(:not([pane-open])) .dismiss { pointer-events: none; }

@media (forced-colors: active) {
  .pane { border-inline-end: 1px solid CanvasText; }
  :host([pane-placement="right"]) .pane { border-inline-end: 0; border-inline-start: 1px solid CanvasText; }
}
`;

interface Run {
  from: number;
  to: number;
  main: Animation;
  all: Animation[];
}

export class WinSplitView extends WinElement {
  static override styles = [splitViewCss, css`${materialOverrides('.pane', 'pane-material')}`];
  static override materialAttributes = ['material', 'pane-material'];
  static override template = `<div class="root" part="root"><div class="content" part="content"><slot></slot><div class="dismiss" part="light-dismiss-layer"></div></div><div class="pane" part="pane"><div class="pane-inner"><slot name="pane"></slot></div></div></div>`;
  static override props: PropDefs = {
    paneOpen: { type: Boolean, attribute: 'pane-open' },
    displayMode: { type: String, attribute: 'display-mode', reflect: true, default: 'overlay' },
    panePlacement: { type: String, attribute: 'pane-placement', reflect: true, default: 'left' },
    openPaneLength: { type: Number, attribute: 'open-pane-length', default: 320 },
    compactPaneLength: { type: Number, attribute: 'compact-pane-length', default: 48 },
    paneBackground: { type: String, attribute: 'pane-background' },
    lightDismissOverlayMode: { type: String, attribute: 'light-dismiss-overlay-mode', reflect: true, default: 'auto' },
  };
  declare paneOpen: boolean;
  declare displayMode: SplitViewDisplayMode;
  declare panePlacement: 'left' | 'right';
  declare openPaneLength: number;
  declare compactPaneLength: number;
  declare paneBackground: string;
  declare lightDismissOverlayMode: 'auto' | 'on' | 'off';

  static {
    this.define('win-split-view');
  }

  private pane!: HTMLElement;
  private content!: HTMLElement;
  private dismiss!: HTMLElement;
  private run: Run | null = null;
  private restP = 0;
  private focusBeforeOpen: HTMLElement | null = null;
  private escHandler = (ev: KeyboardEvent) => {
    if (ev.key === 'Escape' && this.paneOpen && this.isOverlayMode) {
      ev.stopPropagation();
      this.requestClose();
    }
  };

  get isOverlayMode(): boolean {
    return this.displayMode !== 'inline' && this.displayMode !== 'compact-inline';
  }

  protected override firstConnected(): void {
    this.pane = this.$('.pane');
    this.content = this.$('.content');
    this.dismiss = this.$('.dismiss');
    this.dismiss.addEventListener('pointerdown', (ev) => {
      if (!this.paneOpen) return;
      ev.preventDefault();
      this.requestClose();
    });
    this.addEventListener('keydown', this.escHandler);
  }

  private requestClose(): void {
    if (!this.emit('paneclosing', undefined, { cancelable: true, bubbles: false })) return;
    this.paneOpen = false;
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('openPaneLength')) this.style.setProperty('--open', `${this.openPaneLength}px`);
    if (changed.has('compactPaneLength')) this.style.setProperty('--compact', `${this.compactPaneLength}px`);
    if (changed.has('paneBackground')) {
      const bg = this.paneBackground;
      if (bg) this.style.setProperty('--pane-background', bg.startsWith('--') ? `var(${bg})` : bg);
      else this.style.removeProperty('--pane-background');
    }
    if (first) {
      this.restP = this.paneOpen ? 1 : 0;
      return;
    }
    const openChanged = changed.has('paneOpen');
    if (changed.has('displayMode') || changed.has('panePlacement')) {
      this.stopRun();
      this.restP = this.paneOpen ? 1 : 0;
      if (openChanged) {
        if (this.paneOpen) this.emit('paneopening', undefined, { bubbles: false });
        this.emit(this.paneOpen ? 'paneopened' : 'paneclosed', undefined, { bubbles: false });
      }
      this.releaseHiddenFocus();
      return;
    }
    if (openChanged && (this.paneOpen ? 1 : 0) !== this.restP) {
      if (this.paneOpen) {
        this.rememberFocus();
        this.emit('paneopening', undefined, { bubbles: false });
      } else {
        this.releaseHiddenFocus();
      }
      this.transition(this.paneOpen);
    }
  }

  private geometry(): Geometry {
    const mode = this.displayMode;
    const open = Math.max(0, this.openPaneLength);
    return {
      compact: mode === 'compact-overlay' || mode === 'compact-inline',
      inline: mode === 'inline' || mode === 'compact-inline',
      end: this.panePlacement === 'right',
      e: isRtl(this) ? -1 : 1,
      open,
      d: Math.max(0, open - Math.max(0, this.compactPaneLength)),
    };
  }

  private paneFrame(g: Geometry, p: number): Keyframe {
    if (g.compact) {
      const hidden = g.d * (1 - p);
      return {
        clipPath: g.e > 0 ? `inset(0px ${hidden}px 0px 0px)` : `inset(0px 0px 0px ${hidden}px)`,
        transform: `translateX(${g.end ? g.e * hidden : 0}px)`,
      };
    }
    const out = g.end ? g.e : -g.e;
    return { transform: `translateX(${out * g.open * (1 - p)}px)` };
  }

  private contentShift(g: Geometry, p: number): number {
    if (!g.inline || g.end) return 0;
    return g.e * (g.compact ? g.d : g.open) * p;
  }

  private shownP(): number {
    const run = this.run;
    if (!run) return this.restP;
    const prog = run.main.effect?.getComputedTiming().progress;
    const k = typeof prog === 'number' ? prog : 1;
    return run.from + (run.to - run.from) * k;
  }

  private stopRun(): void {
    const run = this.run;
    this.run = null;
    if (run) for (const a of run.all) a.cancel();
    this.removeAttribute('data-w-animating');
  }

  private transition(open: boolean): void {
    const from = this.shownP();
    this.stopRun();
    const to = open ? 1 : 0;
    this.restP = to;
    const dist = Math.abs(to - from);
    if (dist < 0.001) {
      this.emit(open ? 'paneopened' : 'paneclosed', undefined, { bubbles: false });
      return;
    }
    const g = this.geometry();
    const timing = g.inline ? INLINE_TIMING : OVERLAY_TIMING;
    const opts: KeyframeAnimationOptions = {
      duration: (open ? timing.open : timing.close) * Math.max(MIN_DURATION_FRACTION, dist),
      easing: timing.easing,
      fill: 'forwards',
    };
    this.toggleAttribute('data-w-animating', true);
    const main = animate(this.pane, [this.paneFrame(g, from), this.paneFrame(g, to)], opts);
    const all = [main];
    const shift = this.contentShift(g, from) - this.contentShift(g, to);
    if (Math.abs(shift) > 0.5) {
      all.push(
        animate(this.content, [{ transform: `translateX(${shift}px)` }, { transform: 'translateX(0px)' }], opts),
      );
    }
    if (!g.inline) all.push(animate(this.dismiss, [{ opacity: from }, { opacity: to }], opts));
    const run: Run = { from, to, main, all };
    this.run = run;
    void settled(main).then(() => {
      if (this.run !== run) return;
      this.stopRun();
      this.emit(open ? 'paneopened' : 'paneclosed', undefined, { bubbles: false });
    });
  }

  private rememberFocus(): void {
    const a = deepActiveElement();
    this.focusBeforeOpen =
      a instanceof HTMLElement && a !== document.body && !composedContains(this.pane, a) ? a : null;
  }

  private releaseHiddenFocus(): void {
    if (this.paneOpen || this.displayMode === 'compact-overlay' || this.displayMode === 'compact-inline') return;
    const a = deepActiveElement();
    if (!(a instanceof HTMLElement) || !composedContains(this.pane, a)) return;
    const back = this.focusBeforeOpen;
    this.focusBeforeOpen = null;
    if (back?.isConnected && !composedContains(this.pane, back) && isFocusable(back))
      back.focus({ preventScroll: true });
    else a.blur();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-split-view': WinSplitView;
  }
}
