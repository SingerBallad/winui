import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { iconHtml } from '../../base/icons.ts';
import { motionEnabled } from '../../motion/animate.ts';

export type AnimatedIconName =
  | 'back'
  | 'settings'
  | 'global-navigation-button'
  | 'find'
  | 'chevron-down-small'
  | 'chevron-right-down-small'
  | 'chevron-up-down-small'
  | 'accept';

function gear(cx: number, cy: number, ro: number, ri: number, teeth: number): string {
  const step = (Math.PI * 2) / teeth;
  const p: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    for (const [r, k] of [
      [ro, -0.22],
      [ro, 0.22],
      [ri, 0.3],
      [ri, 0.7],
    ] as const) {
      const t = a + step * k;
      p.push(`${(cx + r * Math.cos(t)).toFixed(3)} ${(cy + r * Math.sin(t)).toFixed(3)}`);
    }
  }
  return `M${p.join('L')}Z`;
}

const SOURCES: Record<AnimatedIconName, string> = {
  back: '<path class="shaft" d="M1.5 8H14.75"/><path class="head" d="M7.75 1.75L1.5 8L7.75 14.25"/>',
  settings: `<g class="gear"><path d="${gear(8, 8, 7.4, 5.6, 8)}"/><circle cx="8" cy="8" r="2.5"/></g>`,
  'global-navigation-button':
    '<path class="l1" d="M0.75 4H15.25"/><path class="l2" d="M0.75 8H15.25"/><path class="l3" d="M0.75 12H15.25"/>',
  find: '<g class="mag"><circle class="glass" cx="9.75" cy="6.25" r="5.25"/><path class="handle" d="M6.05 9.95L1.5 14.5"/></g>',
  'chevron-down-small': '<path class="chev" d="M3.5 6L8 10.5L12.5 6"/>',
  'chevron-right-down-small': '<path class="chev" d="M6 3.5L10.5 8L6 12.5"/>',
  'chevron-up-down-small': '<path class="chev" d="M3.5 6L8 10.5L12.5 6"/>',
  accept: '<path class="check" pathLength="1" d="M2.5 8.5L6 12L13.5 4.5"/><path class="dash" d="M3.5 8H12.5"/>',
};

const SPRING = 'cubic-bezier(0.2, 1.8, 0.4, 1)';

const iconCss = css`
:host {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 1em;
  height: 1em;
  font-size: 16px;
  line-height: 1;
  vertical-align: middle;
  color: inherit;
}
svg { width: 100%; height: 100%; overflow: visible; fill: none; stroke: currentColor; stroke-width: 1; stroke-linecap: round; stroke-linejoin: round; }
svg * { transform-box: view-box; }
.fallback { display: none; }
:host([data-w-fallback]) svg { display: none; }
:host([data-w-fallback]) .fallback { display: inline-flex; }

.shaft { transform-origin: 1.5px 8px; transition: transform var(--w-duration-fast) ${SPRING}; }
.head { transform-origin: 1.5px 8px; transition: transform var(--w-duration-fast) ${SPRING}; }
:host([data-w-i="pressed"]) .shaft { transform: scaleX(0.72); transition-duration: var(--w-duration-faster); transition-timing-function: var(--w-ease-decelerate); }
:host([data-w-i="pressed"]) .head { transform: scale(0.88); transition-duration: var(--w-duration-faster); transition-timing-function: var(--w-ease-decelerate); }

.gear { transform-origin: 8px 8px; transition: transform var(--w-duration-slower) var(--w-ease-decelerate); }
:host([data-w-i="over"]) .gear { transform: rotate(60deg); }
:host([data-w-i="pressed"]) .gear { transform: rotate(90deg) scale(0.88); transition-duration: var(--w-duration-normal); }

.l1, .l2, .l3 { transform-origin: 8px 8px; transition: transform var(--w-duration-fast) ${SPRING}; }
:host([data-w-i="pressed"]) .l1, :host([data-w-i="pressed"]) .l3 { transform: scaleX(0.78); transition-duration: var(--w-duration-faster); transition-timing-function: var(--w-ease-decelerate); }
:host([data-w-i="pressed"]) .l2 { transform: scaleX(0.56); transition-duration: var(--w-duration-faster); transition-timing-function: var(--w-ease-decelerate); }

.mag { transform-origin: 9.75px 6.25px; transition: transform var(--w-duration-normal) ${SPRING}; }
:host([data-w-i="over"]) .mag { transform: rotate(-6deg); }
:host([data-w-i="pressed"]) .mag { transform: scale(0.86) rotate(-12deg); transition-duration: var(--w-duration-faster); transition-timing-function: var(--w-ease-decelerate); }

.chev { transform-origin: 8px 8px; transition: transform var(--w-duration-normal) var(--w-ease-decelerate), translate var(--w-duration-fast) ${SPRING}; }
:host([data-w-source="chevron-down-small"][data-w-i="pressed"]) .chev { translate: 0 1.5px; transition-duration: var(--w-duration-normal), var(--w-duration-faster); }
:host([data-w-source="chevron-right-down-small"][data-w-on]) .chev { transform: rotate(90deg); }
:host([data-w-source="chevron-right-down-small"][data-w-i="pressed"]:not([data-w-on])) .chev { translate: 1px 0; }
:host([data-w-source="chevron-right-down-small"][data-w-i="pressed"][data-w-on]) .chev { translate: 0 1px; }
:host([data-w-source="chevron-up-down-small"][data-w-on]) .chev { transform: rotate(180deg); }
:host([data-w-source="chevron-up-down-small"][data-w-i="pressed"]:not([data-w-on])) .chev { translate: 0 1px; }
:host([data-w-source="chevron-up-down-small"][data-w-i="pressed"][data-w-on]) .chev { translate: 0 -1px; }

.check { stroke-dasharray: 1 1; stroke-dashoffset: 1; transform-origin: 8px 8px; transition: stroke-dashoffset var(--w-duration-faster) linear, transform var(--w-duration-fast) ${SPRING}; }
:host([data-w-on]) .check { stroke-dashoffset: 0; transition: stroke-dashoffset var(--w-duration-normal) var(--w-ease-decelerate), transform var(--w-duration-fast) ${SPRING}; }
:host([data-w-on][data-w-i="pressed"]) .check { transform: scale(0.88); }
.dash { opacity: 0; transform-origin: 8px 8px; transform: scaleX(0.4); transition: opacity var(--w-duration-faster) linear, transform var(--w-duration-fast) var(--w-ease-decelerate); }
:host([data-w-indeterminate]) .dash { opacity: 1; transform: none; }
:host([data-w-indeterminate]) .check { stroke-dashoffset: 1; }

@media (prefers-reduced-motion: reduce) {
  svg * { transition: none !important; }
}
`;

const INTERACTIVE =
  'button,a[href],[role="button"],[role="menuitem"],[role="menuitemcheckbox"],[role="menuitemradio"],[role="tab"],[role="treeitem"],[role="option"],[role="link"],[role="checkbox"],[role="switch"],[role="radio"]';

function parentOf(n: Node): Element | null {
  const el = n as Element;
  if (el.assignedSlot) return el.assignedSlot;
  if (n.parentNode instanceof ShadowRoot) return n.parentNode.host;
  return n.parentElement;
}

export class WinAnimatedIcon extends WinElement {
  static override styles = [iconCss];
  static override template = `<svg viewBox="0 0 16 16" part="svg" aria-hidden="true" focusable="false"></svg><span class="fallback" part="fallback"></span>`;
  static override props: PropDefs = {
    source: { type: String, reflect: true },
    state: { type: String },
    on: { type: Boolean },
    fallbackGlyph: { type: String, attribute: 'fallback-glyph' },
    size: { type: Number, default: 0 },
  };
  declare source: AnimatedIconName | '';
  declare state: string;
  declare on: boolean;
  declare fallbackGlyph: string;
  declare size: number;

  private hostCleanup: (() => void) | null = null;
  private interaction: 'normal' | 'over' | 'pressed' = 'normal';
  private hostOn = false;
  private hostIndeterminate = false;
  private sizedBySize = false;

  static {
    this.define('win-animated-icon');
  }

  protected override firstConnected(): void {
    this.setAttribute('aria-hidden', 'true');
  }

  protected override connected(): void {
    this.attachHost();
  }

  protected override disconnected(): void {
    this.hostCleanup?.();
    this.hostCleanup = null;
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('size')) {
      if (this.size > 0) {
        this.style.fontSize = `${this.size}px`;
        this.sizedBySize = true;
      } else if (this.sizedBySize) {
        this.style.removeProperty('font-size');
        this.sizedBySize = false;
      }
    }
    if (changed.has('source') || changed.has('fallbackGlyph') || first) {
      const src = (this.source || '') as AnimatedIconName;
      const svg = SOURCES[src];
      this.setAttribute('data-w-source', src);
      this.$('svg').innerHTML = svg ?? '';
      this.toggleAttribute('data-w-fallback', !svg);
      this.$('.fallback').innerHTML = svg
        ? ''
        : iconHtml(this.fallbackGlyph, 16).replace(
            /font-size:16px;width:16px;height:16px/,
            'font-size:1em;width:1em;height:1em',
          );
    }
    if (changed.has('state')) this.attachHost();
    this.applyState();
  }

  private applyState(): void {
    let i = this.interaction;
    let on = this.on || this.hostOn;
    let ind = this.hostIndeterminate;
    if (this.state) {
      const s = this.state.toLowerCase();
      i = s.startsWith('pressed') ? 'pressed' : s.startsWith('pointerover') ? 'over' : 'normal';
      ind = s.endsWith('indeterminate');
      on = this.on || (s.endsWith('on') && !s.endsWith('off'));
    }
    if (!motionEnabled()) i = 'normal';
    this.setAttribute('data-w-i', i);
    this.toggleAttribute('data-w-on', on && !ind);
    this.toggleAttribute('data-w-indeterminate', ind);
  }

  private attachHost(): void {
    this.hostCleanup?.();
    this.hostCleanup = null;
    if (this.state || !this.isConnected) return;
    let n: Element | null = parentOf(this);
    let fallback: Element | null = n instanceof HTMLSlotElement ? null : n;
    while (n) {
      if (n instanceof HTMLElement && (n.matches(INTERACTIVE) || (n.tabIndex >= 0 && n.localName.includes('-')))) break;
      n = parentOf(n);
      if (!fallback && n && !(n instanceof HTMLSlotElement)) fallback = n;
    }
    const host = n ?? fallback;
    if (!host) return;
    const set = (i: 'normal' | 'over' | 'pressed') => {
      this.interaction = i;
      this.applyState();
    };
    let inside = false;
    const enter = () => {
      inside = true;
      if (this.interaction !== 'pressed') set('over');
    };
    const leave = () => {
      inside = false;
      set('normal');
    };
    const down = (e: Event) => {
      if ((e as PointerEvent).button > 0) return;
      set('pressed');
    };
    const up = () => set(inside ? 'over' : 'normal');
    const keydown = (e: Event) => {
      const k = (e as KeyboardEvent).key;
      if (k === ' ' || k === 'Enter') set('pressed');
    };
    const keyup = () => set(inside ? 'over' : 'normal');
    const sync = () => {
      const a = (name: string) => host.getAttribute(name);
      this.hostIndeterminate = a('aria-checked') === 'mixed' || host.hasAttribute('indeterminate');
      this.hostOn =
        a('aria-expanded') === 'true' ||
        a('aria-checked') === 'true' ||
        a('aria-pressed') === 'true' ||
        (host.hasAttribute('checked') && a('checked') !== 'false') ||
        (host.hasAttribute('expanded') && a('expanded') !== 'false') ||
        (host.hasAttribute('open') && a('open') !== 'false' && host.localName !== 'details');
      this.applyState();
    };
    host.addEventListener('pointerenter', enter);
    host.addEventListener('pointerleave', leave);
    host.addEventListener('pointerdown', down);
    host.addEventListener('pointerup', up);
    host.addEventListener('pointercancel', leave);
    host.addEventListener('keydown', keydown);
    host.addEventListener('keyup', keyup);
    host.addEventListener('blur', keyup);
    const mo = new MutationObserver(sync);
    mo.observe(host, {
      attributes: true,
      attributeFilter: [
        'aria-expanded',
        'aria-checked',
        'aria-pressed',
        'checked',
        'expanded',
        'open',
        'indeterminate',
      ],
    });
    sync();
    this.hostCleanup = () => {
      host.removeEventListener('pointerenter', enter);
      host.removeEventListener('pointerleave', leave);
      host.removeEventListener('pointerdown', down);
      host.removeEventListener('pointerup', up);
      host.removeEventListener('pointercancel', leave);
      host.removeEventListener('keydown', keydown);
      host.removeEventListener('keyup', keyup);
      host.removeEventListener('blur', keyup);
      mo.disconnect();
    };
  }
}

const playerCss = css`
:host { display: inline-block; position: relative; line-height: 0; overflow: visible; }
.content { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
::slotted(svg), ::slotted(img) { max-width: 100%; max-height: 100%; }
:host([stretch="fill"]) ::slotted(svg) { width: 100%; height: 100%; }
.fallback { display: none; }
:host([data-fallback]) .fallback { display: block; }
`;

export class WinAnimationPlayer extends WinElement {
  static override styles = [playerCss];
  static override template = `<div class="content" part="content"><slot></slot></div><div class="fallback" part="fallback"><slot name="fallback"></slot></div>`;
  static override props: PropDefs = {
    autoPlay: { type: Boolean, attribute: 'auto-play', default: true },
    playbackRate: { type: Number, attribute: 'playback-rate', default: 1 },
    stretch: { type: String, reflect: true, default: 'uniform' },
  };
  declare autoPlay: boolean;
  declare playbackRate: number;
  declare stretch: string;

  private raf = 0;
  private playing = false;
  private segment: { from: number; to: number; looped: boolean; resolve: () => void } | null = null;
  private progressValue = 0;

  static {
    this.define('win-animation-player');
  }

  get isPlaying(): boolean {
    return this.playing;
  }

  get duration(): number {
    return Math.max(0, ...this.animations().map((a) => this.endOf(a)));
  }

  get progress(): number {
    return this.progressValue;
  }

  private animations(): Animation[] {
    return this.getAnimations({ subtree: true });
  }

  private endOf(a: Animation): number {
    const t = a.effect?.getComputedTiming();
    const d = Number(t?.duration ?? 0);
    const it = Number(t?.iterations ?? 1);
    return (Number(t?.delay ?? 0) || 0) + (Number.isFinite(it) ? d * it : d);
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'img');
    requestAnimationFrame(() => {
      for (const a of this.animations()) a.pause();
      this.setProgress(0);
      if (this.autoPlay) void this.playAsync(0, 1, true);
    });
  }

  protected override disconnected(): void {
    cancelAnimationFrame(this.raf);
    this.playing = false;
  }

  setProgress(p: number): void {
    const d = this.duration;
    this.progressValue = Math.min(1, Math.max(0, p));
    for (const a of this.animations()) {
      a.pause();
      a.currentTime = this.progressValue * d;
    }
    this.emit('progress', { progress: this.progressValue }, { bubbles: false });
  }

  playAsync(from = 0, to = 1, looped = false): Promise<void> {
    this.segment?.resolve();
    return new Promise<void>((resolve) => {
      this.segment = { from, to, looped, resolve };
      this.setProgress(from);
      this.playing = true;
      if (!motionEnabled()) {
        this.setProgress(to);
        this.finishSegment();
        return;
      }
      let last = performance.now();
      const tick = (now: number) => {
        if (!this.playing || !this.segment) return;
        const d = this.duration || 1;
        const dt = ((now - last) * Math.max(0.01, this.playbackRate)) / d;
        last = now;
        const seg = this.segment;
        const dir = seg.to >= seg.from ? 1 : -1;
        let p = this.progressValue + dt * dir;
        if ((dir > 0 && p >= seg.to) || (dir < 0 && p <= seg.to)) {
          if (seg.looped) p = seg.from;
          else {
            this.setProgress(seg.to);
            this.finishSegment();
            return;
          }
        }
        this.setProgress(p);
        this.raf = requestAnimationFrame(tick);
      };
      this.raf = requestAnimationFrame(tick);
    });
  }

  private finishSegment(): void {
    this.playing = false;
    const s = this.segment;
    this.segment = null;
    s?.resolve();
  }

  pause(): void {
    this.playing = false;
    cancelAnimationFrame(this.raf);
  }

  resume(): void {
    if (this.playing || !this.segment) return;
    const s = this.segment;
    const from = this.progressValue;
    this.segment = null;
    void this.playAsync(from, s.to, s.looped).then(() => s.resolve());
  }

  stop(): void {
    cancelAnimationFrame(this.raf);
    this.setProgress(this.segment?.from ?? 0);
    this.finishSegment();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-animated-icon': WinAnimatedIcon;
    'win-animation-player': WinAnimationPlayer;
  }
}
