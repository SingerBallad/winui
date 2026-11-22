import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { contentIn } from '../../motion/animate.ts';

export type TwoPaneViewMode = 'single-pane' | 'wide' | 'tall';

export function toCssTrackSize(v: string | null | undefined, fallback = '1fr'): string {
  if (!v) return fallback;
  const t = v.trim().toLowerCase();
  if (t === 'auto') return 'auto';
  if (t === '*') return '1fr';
  const star = /^(\d*\.?\d+)\*$/.exec(t);
  if (star) return `${star[1]}fr`;
  if (/^\d*\.?\d+$/.test(t)) return `${t}px`;
  return t;
}

const twoPaneCss = css`
:host {
  display: block;
  position: relative;
  box-sizing: border-box;
  width: 100%;
  height: 100%;
}
.root {
  display: grid;
  width: 100%;
  height: 100%;
  min-height: inherit;
  grid-template-columns: var(--cols, 1fr);
  grid-template-rows: var(--rows, 1fr);
}
.pane {
  min-width: 0;
  min-height: 0;
  overflow: auto;
  scrollbar-width: thin;
  scrollbar-color: var(--w-control-strong-fill-color-default) transparent;
}
.pane[hidden] { display: none; }
`;

export class WinTwoPaneView extends WinElement {
  static override styles = [twoPaneCss];
  static override template = `<div class="root" part="root"><div class="pane p1" part="pane1"><slot name="pane1"></slot></div><div class="pane p2" part="pane2"><slot name="pane2"></slot></div></div>`;
  static override props: PropDefs = {
    minWideModeWidth: { type: Number, attribute: 'min-wide-mode-width', default: 641 },
    minTallModeHeight: { type: Number, attribute: 'min-tall-mode-height', default: 641 },
    pane1Length: { type: String, attribute: 'pane1-length', default: '1*' },
    pane2Length: { type: String, attribute: 'pane2-length', default: '1*' },
    panePriority: { type: String, attribute: 'pane-priority', default: 'pane1' },
    wideModeConfiguration: { type: String, attribute: 'wide-mode-configuration', default: 'left-right' },
    tallModeConfiguration: { type: String, attribute: 'tall-mode-configuration', default: 'top-bottom' },
  };
  declare minWideModeWidth: number;
  declare minTallModeHeight: number;
  declare pane1Length: string;
  declare pane2Length: string;
  declare panePriority: 'pane1' | 'pane2';
  declare wideModeConfiguration: 'left-right' | 'right-left' | 'single-pane';
  declare tallModeConfiguration: 'top-bottom' | 'bottom-top' | 'single-pane';

  static {
    this.define('win-two-pane-view');
  }

  private _mode: TwoPaneViewMode = 'single-pane';
  private ro: ResizeObserver | null = null;
  private p1!: HTMLElement;
  private p2!: HTMLElement;

  get mode(): TwoPaneViewMode {
    return this._mode;
  }

  protected override firstConnected(): void {
    this.p1 = this.$('.p1');
    this.p2 = this.$('.p2');
    this.ro = new ResizeObserver(() => this.layout(true));
    this.ro.observe(this);
  }

  protected override updated(): void {
    this.layout(false);
  }

  private layout(fromResize: boolean): void {
    if (!this.p1) return;
    const w = this.clientWidth;
    const h = this.clientHeight;
    let mode: TwoPaneViewMode = 'single-pane';
    if (w > this.minWideModeWidth && this.wideModeConfiguration !== 'single-pane') mode = 'wide';
    else if (h > this.minTallModeHeight && this.tallModeConfiguration !== 'single-pane') mode = 'tall';

    const l1 = toCssTrackSize(this.pane1Length);
    const l2 = toCssTrackSize(this.pane2Length);
    const s = this.style;
    this.p1.hidden = false;
    this.p2.hidden = false;
    this.p1.style.order = '';
    this.p2.style.order = '';
    if (mode === 'wide') {
      const rtl = this.wideModeConfiguration === 'right-left';
      s.setProperty('--cols', rtl ? `${l2} ${l1}` : `${l1} ${l2}`);
      s.setProperty('--rows', '1fr');
      if (rtl) this.p1.style.order = '2';
    } else if (mode === 'tall') {
      const btt = this.tallModeConfiguration === 'bottom-top';
      s.setProperty('--cols', '1fr');
      s.setProperty('--rows', btt ? `${l2} ${l1}` : `${l1} ${l2}`);
      if (btt) this.p1.style.order = '2';
    } else {
      s.setProperty('--cols', '1fr');
      s.setProperty('--rows', '1fr');
      (this.panePriority === 'pane2' ? this.p1 : this.p2).hidden = true;
    }
    this.setAttribute('mode', mode);
    if (mode !== this._mode || !this.laidOut) {
      const changed = mode !== this._mode;
      this._mode = mode;
      if (this.laidOut && fromResize) {
        for (const p of [this.p1, this.p2]) if (!p.hidden) contentIn(p, 'bottom', 8);
      }
      this.laidOut = true;
      if (changed) this.emit('modechanged', { mode }, { bubbles: false });
    }
  }
  private laidOut = false;
}

declare global {
  interface HTMLElementTagNameMap {
    'win-two-pane-view': WinTwoPaneView;
  }
}
