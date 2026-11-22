import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';

export type PipsButtonVisibility = 'collapsed' | 'visible' | 'visible-on-pointer-over';

const pipsCss = css`
:host {
  display: inline-flex;
  align-items: center;
  vertical-align: middle;
  color: var(--w-control-strong-fill-color-default);
  user-select: none;
  -webkit-user-select: none;
}
:host([orientation="vertical"]) { flex-direction: column; }
.window { overflow: hidden; position: relative; }
.strip {
  display: flex;
  transition: transform var(--w-duration-normal) var(--w-ease-decelerate);
}
:host([orientation="vertical"]) .strip { flex-direction: column; }
.pip {
  position: relative;
  flex: none;
  width: 12px;
  height: 24px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: inherit;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  outline: none;
}
:host([orientation="vertical"]) .pip { width: 24px; height: 12px; }
.dot {
  width: 4px;
  height: 4px;
  border-radius: 50%;
  background: currentColor;
  transition: width var(--w-duration-faster) linear, height var(--w-duration-faster) linear;
}
.pip:hover { color: var(--w-text-fill-color-secondary); }
.pip:hover .dot, .pip[aria-selected="true"] .dot { width: 6px; height: 6px; }
.pip:active { color: var(--w-text-fill-color-secondary); }
.pip:active .dot { width: 4px; height: 4px; }
.pip[aria-selected="true"] { color: var(--w-control-strong-fill-color-default); }
${focusRing('.pip:focus-visible', 0)}
.nav {
  flex: none;
  width: 24px;
  height: 24px;
  margin: 0;
  padding: 0;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: var(--w-control-strong-fill-color-default);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  transition: opacity var(--w-duration-fast) linear;
}
.nav:hover, .nav:active { color: var(--w-text-fill-color-secondary); }
.nav .w-glyph { transition: transform var(--w-duration-faster) linear; }
.nav:active .w-glyph { transform: scale(0.875); }
.nav:disabled { color: var(--w-control-strong-fill-color-disabled); }
.nav[data-vis="collapsed"] { display: none; }
.nav[data-vis="visible-on-pointer-over"] { opacity: 0; }
:host(:hover) .nav[data-vis="visible-on-pointer-over"], :host(:focus-within) .nav[data-vis="visible-on-pointer-over"] { opacity: 1; }
${focusRing('.nav:focus-visible', 0)}
:host([disabled]) { pointer-events: none; color: var(--w-control-strong-fill-color-disabled); }
`;

export class WinPipsPager extends WinElement {
  static override styles = [pipsCss];
  static override template = `<button class="nav prev" part="previous-button" aria-label="上一页"></button><div class="window" part="pips-window"><div class="strip" part="strip" role="listbox"></div></div><button class="nav next" part="next-button" aria-label="下一页"></button>`;
  static override props: PropDefs = {
    numberOfPages: { type: Number, attribute: 'number-of-pages', default: 5 },
    selectedPageIndex: { type: Number, attribute: 'selected-page-index', default: 0 },
    maxVisiblePips: { type: Number, attribute: 'max-visible-pips', default: 5 },
    orientation: { type: String, reflect: true, default: 'horizontal' },
    previousButtonVisibility: { type: String, attribute: 'previous-button-visibility', default: 'collapsed' },
    nextButtonVisibility: { type: String, attribute: 'next-button-visibility', default: 'collapsed' },
    disabled: { type: Boolean },
  };
  declare numberOfPages: number;
  declare selectedPageIndex: number;
  declare maxVisiblePips: number;
  declare orientation: 'horizontal' | 'vertical';
  declare previousButtonVisibility: PipsButtonVisibility;
  declare nextButtonVisibility: PipsButtonVisibility;
  declare disabled: boolean;

  static {
    this.define('win-pips-pager');
  }

  private strip!: HTMLElement;
  private prevBtn!: HTMLButtonElement;
  private nextBtn!: HTMLButtonElement;

  protected override firstConnected(): void {
    this.setAttribute('role', 'group');
    if (!this.hasAttribute('aria-label')) this.setAttribute('aria-label', '页面选择');
    this.strip = this.$('.strip');
    this.prevBtn = this.$('.prev');
    this.nextBtn = this.$('.next');
    this.prevBtn.addEventListener('click', () => this.select(this.selectedPageIndex - 1, false));
    this.nextBtn.addEventListener('click', () => this.select(this.selectedPageIndex + 1, false));
    this.strip.addEventListener('click', (ev) => {
      const pip = (ev.target as Element).closest<HTMLElement>('.pip');
      if (pip) this.select(Number(pip.dataset.i), true);
    });
    this.strip.addEventListener('keydown', (ev) => this.onKey(ev));
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('numberOfPages') || first) this.buildPips();
    if (
      changed.has('selectedPageIndex') ||
      changed.has('numberOfPages') ||
      changed.has('maxVisiblePips') ||
      changed.has('orientation') ||
      first
    ) {
      const n = Math.max(0, this.numberOfPages);
      const clamped = n ? Math.max(0, Math.min(n - 1, this.selectedPageIndex)) : 0;
      if (clamped !== this.selectedPageIndex) {
        this.selectedPageIndex = clamped;
        return;
      }
      this.syncPips();
    }
    if (changed.has('orientation') || first) {
      const v = this.orientation === 'vertical';
      this.prevBtn.innerHTML = glyph(v ? 'caretUp' : 'caretLeft', 8);
      this.nextBtn.innerHTML = glyph(v ? 'caretDown' : 'caretRight', 8);
      this.strip.setAttribute('aria-orientation', v ? 'vertical' : 'horizontal');
    }
    if (changed.has('previousButtonVisibility')) this.prevBtn.dataset.vis = this.previousButtonVisibility;
    if (changed.has('nextButtonVisibility')) this.nextBtn.dataset.vis = this.nextButtonVisibility;
    if (changed.has('disabled')) this.aria('aria-disabled', this.disabled ? 'true' : null);
  }

  private buildPips(): void {
    const n = Math.max(0, this.numberOfPages);
    let h = '';
    for (let i = 0; i < n; i++) {
      h += `<button class="pip" part="pip" role="option" data-i="${i}" tabindex="-1" aria-label="第 ${i + 1} 页，共 ${n} 页"><span class="dot"></span></button>`;
    }
    this.strip.innerHTML = h;
  }

  private syncPips(): void {
    const n = Math.max(0, this.numberOfPages);
    const sel = this.selectedPageIndex;
    const pips = Array.from(this.strip.children) as HTMLElement[];
    pips.forEach((p, i) => {
      p.setAttribute('aria-selected', String(i === sel));
      p.tabIndex = i === sel ? 0 : -1;
    });
    const max = Math.max(1, this.maxVisiblePips);
    const vis = Math.min(n, max);
    const v = this.orientation === 'vertical';
    const extent = 12;
    const win = this.$('.window');
    win.style.width = v ? '24px' : `${vis * extent}px`;
    win.style.height = v ? `${vis * extent}px` : '24px';
    const start = Math.max(0, Math.min(n - vis, sel - Math.floor(vis / 2)));
    this.strip.style.transform = v ? `translateY(${-start * extent}px)` : `translateX(${-start * extent}px)`;
    this.prevBtn.disabled = sel <= 0;
    this.nextBtn.disabled = sel >= n - 1;
  }

  private select(i: number, focusPip: boolean): void {
    const n = this.numberOfPages;
    const next = Math.max(0, Math.min(n - 1, i));
    const prev = this.selectedPageIndex;
    if (next !== prev) {
      this.selectedPageIndex = next;
      this.emit('selectedindexchanged', { newPageIndex: next, previousPageIndex: prev });
    }
    if (focusPip) {
      this.flushUpdates();
      (this.strip.children[next] as HTMLElement | undefined)?.focus();
    }
  }

  private onKey(ev: KeyboardEvent): void {
    const v = this.orientation === 'vertical';
    const rtl = getComputedStyle(this).direction === 'rtl';
    const back = v ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    const fwd = v ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    let target = -1;
    if (ev.key === back) target = this.selectedPageIndex - 1;
    else if (ev.key === fwd) target = this.selectedPageIndex + 1;
    else if (ev.key === 'Home') target = 0;
    else if (ev.key === 'End') target = this.numberOfPages - 1;
    if (target < 0 && ev.key !== 'Home') return;
    ev.preventDefault();
    this.select(target, true);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-pips-pager': WinPipsPager;
  }
}
