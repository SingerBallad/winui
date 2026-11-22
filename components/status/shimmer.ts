import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { animate, durations, easings, settled } from '../../motion/animate.ts';

const shimmerBlock = `
  position: relative;
  overflow: hidden;
  background: var(--w-control-alt-fill-color-tertiary);
  border-radius: var(--w-corner-radius-control);
`;

const shimmerSweep = `
  content: '';
  position: absolute;
  inset: 0;
  background: linear-gradient(
    100deg,
    transparent 20%,
    var(--w-shimmer-highlight, var(--w-control-fill-color-default)) 50%,
    transparent 80%
  );
  transform: translateX(-100%);
  animation: w-shimmer var(--w-shimmer-duration, 1600ms) cubic-bezier(0.4, 0, 0.6, 1) infinite;
`;

const keyframes = `
@keyframes w-shimmer {
  0% { transform: translateX(-100%); }
  70%, 100% { transform: translateX(100%); }
}
@media (prefers-reduced-motion: reduce) {
  .s::after, :host::after { animation: none !important; opacity: 0; }
}
:host-context([data-win-motion="reduced"])::after { animation: none !important; opacity: 0; }
:host-context([data-win-motion="reduced"]) .s::after { animation: none !important; opacity: 0; }
`;

const shimmerCss = css`
:host {
  display: block;
  width: 100%;
  height: 16px;
  ${shimmerBlock}
}
:host::after { ${shimmerSweep} }
:host([is-active="false"])::after { animation: none; opacity: 0; }
:host([circle]) { border-radius: 50%; }
${keyframes}
`;

export class WinShimmer extends WinElement {
  static override styles = [shimmerCss];
  static override props: PropDefs = {
    isActive: { type: Boolean, attribute: 'is-active', default: true },
    duration: { type: Number, default: 1600 },
  };
  declare isActive: boolean;
  declare duration: number;

  static {
    this.define('win-shimmer');
  }

  protected override firstConnected(): void {
    this.setAttribute('aria-hidden', 'true');
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('duration')) this.style.setProperty('--w-shimmer-duration', `${Math.max(200, this.duration)}ms`);
  }
}

const skeletonCss = css`
:host { display: block; }
.wrap { display: flex; flex-direction: column; gap: 8px; }
.row { display: flex; align-items: center; gap: 12px; }
.col { flex: 1; min-width: 0; display: flex; flex-direction: column; gap: 8px; }
.s { ${shimmerBlock} height: 12px; }
.s::after { ${shimmerSweep} }
.circle { border-radius: 50%; flex: none; }
:host([shape="rect"]) .s { height: var(--h, 120px); border-radius: var(--w-corner-radius-overlay); }
:host([is-active="false"]) .s::after { animation: none; opacity: 0; }
${keyframes}
`;

export class WinSkeleton extends WinElement {
  static override styles = [skeletonCss];
  static override template = `<div class="wrap" part="wrap"></div>`;
  static override props: PropDefs = {
    shape: { type: String, reflect: true, default: 'text' },
    lines: { type: Number, default: 3 },
    size: { type: Number, default: 40 },
    height: { type: String },
    isActive: { type: Boolean, attribute: 'is-active', default: true },
  };
  declare shape: 'text' | 'circle' | 'rect' | 'avatar-text';
  declare lines: number;
  declare size: number;
  declare height: string;
  declare isActive: boolean;

  static {
    this.define('win-skeleton');
  }

  protected override firstConnected(): void {
    this.setAttribute('aria-hidden', 'true');
  }

  protected override updated(): void {
    const wrap = this.$('.wrap');
    const lines = Math.max(1, Math.round(this.lines));
    const bars = (n: number) =>
      Array.from({ length: n }, (_, i) => {
        const w = i === n - 1 && n > 1 ? 60 : 100 - ((i * 7) % 15);
        return `<span class="s" style="width:${w}%"></span>`;
      }).join('');
    const circle = `<span class="s circle" style="width:${this.size}px;height:${this.size}px"></span>`;
    switch (this.shape) {
      case 'circle':
        wrap.innerHTML = circle;
        break;
      case 'rect':
        if (this.height) this.style.setProperty('--h', this.height);
        wrap.innerHTML = '<span class="s"></span>';
        break;
      case 'avatar-text':
        wrap.innerHTML = `<div class="row">${circle}<div class="col">${bars(Math.min(lines, 2))}</div></div>`;
        break;
      default:
        wrap.innerHTML = bars(lines);
    }
  }
}

const presenterCss = css`
:host { display: block; }
.layers { display: grid; }
.layer { grid-area: 1 / 1; align-self: start; min-width: 0; }
.layer[data-w-off] { display: none; }
:host([data-w-switching]) .layers { overflow: clip; }
:host([data-w-switching]) .layer { pointer-events: none; }
`;

export class WinShimmerLoader extends WinElement {
  static override styles = [presenterCss];
  static override template = `<div class="layers" part="layers"><div class="layer placeholder" part="placeholder" aria-hidden="true"><slot name="placeholder"></slot></div><div class="layer content" part="content"><slot></slot></div></div>`;
  static override props: PropDefs = {
    loading: { type: Boolean },
  };
  declare loading: boolean;

  private run: Animation | null = null;

  static {
    this.define('win-shimmer-loader');
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('loading')) this.swap(first || !this.isConnected);
  }

  private swap(instant: boolean): void {
    const layers = this.$('.layers');
    const ph = this.$('.placeholder');
    const ct = this.$('.content');
    const loading = this.loading;
    const show = loading ? ph : ct;
    const hide = loading ? ct : ph;
    this.setAttribute('aria-busy', String(loading));
    ct.inert = loading;
    if (instant) {
      for (const a of [...layers.getAnimations(), ...ph.getAnimations(), ...ct.getAnimations()]) a.cancel();
      this.run = null;
      show.removeAttribute('data-w-off');
      hide.toggleAttribute('data-w-off', true);
      this.removeAttribute('data-w-switching');
      return;
    }
    const fromH = layers.getBoundingClientRect().height;
    const showOn = !show.hasAttribute('data-w-off');
    const hideOn = !hide.hasAttribute('data-w-off');
    const showCs = getComputedStyle(show);
    const fromShow = showOn ? Number(showCs.opacity) : 0;
    const fromShowT = showOn && showCs.transform !== 'none' ? showCs.transform : loading ? 'none' : 'translateY(8px)';
    const hideCs = getComputedStyle(hide);
    const fromHide = hideOn ? Number(hideCs.opacity) : 0;
    const hideT = hideOn ? hideCs.transform : 'none';
    show.removeAttribute('data-w-off');
    hide.removeAttribute('data-w-off');
    this.toggleAttribute('data-w-switching', true);
    const toH = show.offsetHeight;
    animate(layers, [{ height: `${fromH}px` }, { height: `${toH}px` }], {
      duration: durations.slow,
      easing: easings.decelerate,
    });
    animate(
      hide,
      [
        { opacity: fromHide, transform: hideT },
        { opacity: 0, transform: hideT },
      ],
      { duration: durations.fast, easing: easings.linear, fill: 'forwards' },
    );
    const a = animate(
      show,
      [
        { opacity: fromShow, transform: fromShowT },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: loading ? durations.fast : durations.slow,
        delay: loading || fromShow > 0 ? 0 : durations.faster,
        easing: loading ? easings.linear : easings.decelerate,
        fill: 'backwards',
      },
    );
    this.run = a;
    void settled(a).then(() => {
      if (this.run !== a) return;
      this.run = null;
      hide.toggleAttribute('data-w-off', true);
      for (const x of hide.getAnimations()) x.cancel();
      this.removeAttribute('data-w-switching');
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-shimmer': WinShimmer;
    'win-skeleton': WinSkeleton;
    'win-shimmer-loader': WinShimmerLoader;
  }
}
