import { css, scrollbars, acrylicSurface, materialOverrides } from '../../base/css.ts';
import type { PropDefs } from '../../base/element.ts';
import { glyph } from '../../base/icons.ts';
import { popupResetCss, viewportSize, type FlyoutShowOptions } from '../../base/popup.ts';
import { animate, durations, easings, fadeIn, settled } from '../../motion/animate.ts';
import { FlyoutBase } from '../flyouts/flyout.ts';
import { isAppBarElement, type AppBarElement, type AppBarModeFlags } from './app-bar.ts';

const cbfCss = css`
${popupResetCss(':host')}
.presenter {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: stretch;
  box-sizing: border-box;
  max-width: 440px;
  outline: none;
  color: var(--w-text-fill-color-primary);
}
:host([data-dir="up"]) .presenter { flex-direction: column-reverse; }
.shadow {
  position: absolute;
  inset: 0;
  border-radius: var(--w-corner-radius-overlay);
  box-shadow: var(--w-elevation-flyout);
  pointer-events: none;
}
.bar {
  position: relative;
  z-index: 1;
  display: flex;
  align-items: stretch;
  box-sizing: border-box;
  border: 1px solid var(--w-control-stroke-color-default);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
}
.primary { display: flex; height: 40px; margin: 3px 0 3px 3px; flex: 1 1 auto; }
.primary-end { width: 3px; flex: none; }
.more {
  position: relative;
  flex: none;
  width: 44px;
  min-height: 40px;
  margin: 3px 0;
  display: flex;
  align-items: center;
  justify-content: center;
  color: var(--w-text-fill-color-primary);
  cursor: default;
  outline: none;
}
.more[hidden] { display: none; }
.more .bg {
  position: absolute;
  inset: 2px 6px 2px 2px;
  border-radius: var(--w-corner-radius-control);
  transition: background-color var(--w-duration-faster) linear;
}
.more:hover .bg { background: var(--w-subtle-fill-color-secondary); }
.more:active .bg { background: var(--w-subtle-fill-color-tertiary); }
.more:active { color: var(--w-text-fill-color-secondary); }
.more .w-glyph { position: relative; margin-right: 4px; }
.more:focus-visible .bg {
  outline: 2px solid var(--w-focus-stroke-color-outer);
  outline-offset: -2px;
}
.overflow {
  position: relative;
  display: none;
  box-sizing: border-box;
  min-width: 136px;
  max-width: 440px;
  max-height: min(480px, var(--w-overflow-max, 480px));
  border: 1px solid var(--w-control-stroke-color-default);
  border-top-width: 0;
  border-radius: 0 0 var(--w-corner-radius-overlay) var(--w-corner-radius-overlay);
  ${acrylicSurface}
  overflow: hidden;
}
.overflow .items { padding: 3px; overflow-y: auto; overflow-x: hidden; max-height: inherit; box-sizing: border-box; }
:host([expanded]) .overflow { display: block; }
:host([expanded]:not([data-dir="up"])) .bar { border-bottom-left-radius: 0; border-bottom-right-radius: 0; }
:host([expanded][data-dir="up"]) .bar { border-top-left-radius: 0; border-top-right-radius: 0; }
:host([data-dir="up"]) .overflow {
  border-top-width: 1px;
  border-bottom-width: 0;
  border-radius: var(--w-corner-radius-overlay) var(--w-corner-radius-overlay) 0 0;
}
:host([primary-empty]) .bar { display: none; }
:host([primary-empty]) .overflow { border-top-width: 1px; border-radius: var(--w-corner-radius-overlay); }
`;

export class WinCommandBarFlyout extends FlyoutBase {
  static override styles = [
    scrollbars,
    cbfCss,
    css`${materialOverrides('.bar')}
${materialOverrides('.overflow')}`,
  ];
  static override materialPart = '.bar';
  static override template = `<div class="presenter" part="presenter" tabindex="-1"><span class="shadow" part="shadow" aria-hidden="true"></span><div class="bar" part="bar" role="menubar" aria-orientation="horizontal"><div class="primary" part="primary"><slot></slot></div><span class="primary-end"></span><div class="more" part="more-button" role="button" tabindex="-1" aria-haspopup="menu" aria-expanded="false"><span class="bg"></span>${glyph('more', 16)}</div></div><div class="overflow" part="overflow" role="menu"><div class="items w-scroll" part="overflow-items"><slot name="secondary"></slot></div></div></div>`;
  static override props: PropDefs = {
    alwaysExpanded: { type: Boolean, attribute: 'always-expanded' },
    placement: { type: String, default: 'top-start' },
  };
  declare alwaysExpanded: boolean;

  private more!: HTMLElement;
  private bar!: HTMLElement;
  private overflowEl!: HTMLElement;
  private shadowEl!: HTMLElement;
  private expandAnim: Animation | null = null;
  private collapsing = false;
  private geom = { dx: 0, oh: 0, up: false };

  static {
    this.define('win-command-bar-flyout');
  }

  get primaryCommands(): AppBarElement[] {
    return Array.from(this.children).filter((c): c is AppBarElement => isAppBarElement(c) && !c.slot);
  }

  get secondaryCommands(): AppBarElement[] {
    return Array.from(this.children).filter((c): c is AppBarElement => isAppBarElement(c) && c.slot === 'secondary');
  }

  get isExpanded(): boolean {
    return this.hasAttribute('expanded') && !this.collapsing;
  }

  protected override firstConnected(): void {
    super.firstConnected();
    this.more = this.$('.more');
    this.bar = this.$('.bar');
    this.overflowEl = this.$('.overflow');
    this.shadowEl = this.$('.shadow');
    this.more.setAttribute(
      'aria-label',
      /^zh/i.test(document.documentElement.lang || navigator.language) ? '查看更多' : 'See more',
    );
    this.more.addEventListener('click', () => (this.isExpanded ? this.collapse() : this.expand(false)));
    this.renderRoot.addEventListener('slotchange', () => this.layout());
    this.addEventListener('win-appbar-item-ready', () => this.layout());
    this.addEventListener('win-appbar-invoke', (ev) => {
      const toggle = (ev as CustomEvent<{ toggle: boolean }>).detail?.toggle;
      if (!toggle) this.hide();
    });
    this.addEventListener('keydown', (ev) => this.onKey(ev));
    this.layout();
  }

  private layout(): void {
    if (!this.more) return;
    const prim = this.primaryCommands;
    const sec = this.secondaryCommands;
    const flags: AppBarModeFlags = {
      icons: sec.some((c) => c.hasIconContent && c.localName !== 'win-app-bar-separator'),
      toggles: sec.some((c) => c.isToggle),
    };
    for (const c of prim) c.setAppBarMode('flyout-primary', { hideFlyoutChevron: true });
    for (const c of sec) c.setAppBarMode('flyout-overflow', flags);
    this.more.hidden = sec.length === 0 || this.alwaysExpanded;
    this.toggleAttr('primary-empty', prim.length === 0);
    for (const [i, c] of prim.entries()) c.tabIndex = i === 0 ? 0 : -1;
  }

  protected override beforeOpen(_opts: FlyoutShowOptions): void {
    this.layout();
    this.resetExpansion();
    if (this.alwaysExpanded || this.primaryCommands.length === 0) {
      queueMicrotask(() => this.expand(true));
    }
  }

  private resetExpansion(): void {
    this.collapsing = false;
    this.expandAnim = null;
    for (const el of [this.overflowEl, this.shadowEl, this.bar, this.more])
      for (const a of el.getAnimations()) a.cancel();
    this.removeAttribute('expanded');
    this.removeAttribute('data-dir');
    this.$('.presenter').style.removeProperty('min-width');
    this.more.setAttribute('aria-expanded', 'false');
  }

  protected override initialFocus(opts: FlyoutShowOptions): 'first' | 'surface' | 'none' | HTMLElement {
    if (opts.focus === 'first' || opts.inputType === 'keyboard') {
      const first = this.primaryCommands.find(
        (c) => !c.hasAttribute('data-disabled') && c.localName !== 'win-app-bar-separator',
      );
      return (first as HTMLElement | undefined) ?? 'surface';
    }
    return 'surface';
  }

  protected override animateIn(surface: HTMLElement): Animation | null {
    return fadeIn(surface, durations.faster);
  }

  protected override animateOut(surface: HTMLElement): Animation | null {
    return animate(surface, [{ opacity: 1 }, { opacity: 0 }], {
      duration: durations.faster,
      easing: easings.linear,
      fill: 'forwards',
    });
  }

  protected override afterClose(): void {
    if (this.more) this.resetExpansion();
    super.afterClose();
  }

  expand(instant = false): void {
    if (!this.secondaryCommands.length || this.isExpanded) return;
    this.more.setAttribute('aria-expanded', 'true');
    if (this.collapsing) {
      this.collapsing = false;
      this.expandAnim = this.runExpansion(true);
      return;
    }
    const barRect = this.bar.getBoundingClientRect();
    this.setAttribute('expanded', '');
    const presenter = this.$('.presenter');
    const overflowW = Math.max(136, Math.min(440, this.overflowEl.scrollWidth));
    const width = Math.max(barRect.width, overflowW);
    presenter.style.minWidth = `${Math.ceil(width)}px`;
    const { height: vh } = viewportSize();
    const oh = this.overflowEl.offsetHeight;
    const up = barRect.bottom + oh + 8 > vh && barRect.top - oh - 8 > 0;
    this.toggleAttr('data-dir', up, 'up');
    if (up) {
      const top = Number.parseFloat(this.style.top || '0');
      this.style.top = `${Math.round(top - oh)}px`;
    }
    this.geom = { dx: Math.max(0, Math.ceil(width) - barRect.width), oh, up };
    if (instant) return;
    this.expandAnim = this.runExpansion(true);
    this.emit('expanded', undefined, { bubbles: false });
  }

  collapse(): void {
    if (!this.isExpanded || this.alwaysExpanded) return;
    this.collapsing = true;
    this.more.setAttribute('aria-expanded', 'false');
    const anim = this.runExpansion(false);
    this.expandAnim = anim;
    void settled(anim).then(() => {
      if (!this.collapsing || this.expandAnim !== anim) return;
      const { up, oh } = this.geom;
      if (up) {
        const top = Number.parseFloat(this.style.top || '0');
        this.style.top = `${Math.round(top + oh)}px`;
      }
      this.resetExpansion();
    });
  }

  private runExpansion(expand: boolean): Animation {
    const { dx, oh, up } = this.geom;
    const live = this.expandAnim?.playState === 'running';
    const timing: KeyframeAnimationOptions = expand
      ? { duration: durations.normal, easing: easings.decelerate }
      : { duration: durations.fast, easing: easings.decelerate, fill: 'forwards' };
    const track = (el: HTMLElement, closed: Keyframe, open: Keyframe): Animation => {
      let start = expand ? closed : open;
      if (live) {
        const cs = getComputedStyle(el);
        start = Object.fromEntries(
          Object.keys(closed).map((k) => [k, cs.getPropertyValue(k.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`))]),
        );
      }
      return animate(el, [start, expand ? open : closed], timing);
    };
    const edge = up ? 'top' : 'bottom';
    const main = track(
      this.overflowEl,
      { clipPath: up ? `inset(${oh}px ${dx}px 0px 0px)` : `inset(0px ${dx}px ${oh}px 0px)` },
      { clipPath: 'inset(0px 0px 0px 0px)' },
    );
    track(this.shadowEl, { [edge]: `${oh}px`, right: `${dx}px` }, { [edge]: '0px', right: '0px' });
    if (dx > 0.5) {
      const r = up ? 'round 0px 0px 8px 8px' : 'round 8px 8px 0px 0px';
      track(this.bar, { clipPath: `inset(0px ${dx}px 0px 0px ${r})` }, { clipPath: `inset(0px 0px 0px 0px ${r})` });
      if (getComputedStyle(this).direction !== 'rtl') {
        track(this.more, { transform: `translateX(${-dx}px)` }, { transform: 'none' });
      }
    }
    return main;
  }

  private onKey(ev: KeyboardEvent): void {
    const target = ev.target as HTMLElement;
    const path = ev.composedPath();
    const prim = this.primaryCommands.filter(
      (c) => c.localName !== 'win-app-bar-separator' && !c.hasAttribute('data-disabled'),
    ) as HTMLElement[];
    const sec = this.secondaryCommands.filter(
      (c) => c.localName !== 'win-app-bar-separator' && !c.hasAttribute('data-disabled'),
    ) as HTMLElement[];
    const stops: HTMLElement[] = [...prim];
    if (!this.more.hidden) stops.push(this.more);
    const onMore = path.includes(this.more);
    const inBar = onMore || prim.includes(target);
    if (inBar) {
      const cur = onMore ? stops.length - 1 : stops.indexOf(target);
      if (ev.key === 'ArrowRight' || ev.key === 'ArrowLeft') {
        ev.preventDefault();
        const rtl = getComputedStyle(this).direction === 'rtl';
        const dir = (ev.key === 'ArrowRight') !== rtl ? 1 : -1;
        stops[(cur + dir + stops.length) % stops.length]?.focus();
      } else if (ev.key === 'ArrowDown' || (onMore && (ev.key === 'Enter' || ev.key === ' '))) {
        if (!sec.length) return;
        ev.preventDefault();
        this.expand(false);
        requestAnimationFrame(() => sec[0]?.focus());
      }
      return;
    }
    const i = sec.indexOf(target);
    if (i < 0) return;
    if (ev.key === 'ArrowDown' || ev.key === 'ArrowUp') {
      ev.preventDefault();
      const next = i + (ev.key === 'ArrowDown' ? 1 : -1);
      if (next < 0 && prim.length) prim[0]?.focus();
      else sec[(next + sec.length) % sec.length]?.focus();
    } else if (ev.key === 'Home' || ev.key === 'End') {
      ev.preventDefault();
      sec[ev.key === 'Home' ? 0 : sec.length - 1]?.focus();
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-command-bar-flyout': WinCommandBarFlyout;
  }
}
