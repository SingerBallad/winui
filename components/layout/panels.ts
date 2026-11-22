import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { toCssTrackSize } from './two-pane-view.ts';

const LEFT_ALIGNED = [
  'win-button',
  'win-repeat-button',
  'win-toggle-button',
  'win-hyperlink-button',
  'win-drop-down-button',
  'win-split-button',
  'win-toggle-split-button',
  'win-check-box',
  'win-radio-button',
  'win-toggle-switch',
  'win-combo-box',
  'win-expander',
  'win-rating',
  'win-calendar-date-picker',
  'win-date-picker',
  'win-time-picker',
  'win-info-badge',
  'win-progress-ring',
  'win-person-picture',
  'win-color-picker',
  'win-pips-pager',
  'win-drop-down',
  'win-app-bar-button',
  'win-app-bar-toggle-button',
  'win-segmented',
].join(', ');

const alignmentCss = `
::slotted([horizontal-alignment="left"]) { justify-self: start; }
::slotted([horizontal-alignment="center"]) { justify-self: center; }
::slotted([horizontal-alignment="right"]) { justify-self: end; }
::slotted([horizontal-alignment="stretch"]) { justify-self: stretch; }
::slotted([vertical-alignment="top"]) { align-self: start; }
::slotted([vertical-alignment="center"]) { align-self: center; }
::slotted([vertical-alignment="bottom"]) { align-self: end; }
::slotted([vertical-alignment="stretch"]) { align-self: stretch; }
`;

const num = (v: string | null, d = 0): number => {
  if (v === null || v === '') return d;
  const n = Number(v);
  return Number.isFinite(n) ? n : d;
};

export function toCssThickness(v: string | null | undefined): string | null {
  if (!v) return null;
  const p = v.split(/[,\s]+/).filter(Boolean);
  if (!p.every((x) => /^-?\d*\.?\d+$/.test(x))) return v;
  const n = p.map(Number);
  const [l, t, r, b] = n.length === 1 ? [n[0], n[0], n[0], n[0]] : n.length === 2 ? [n[0], n[1], n[0], n[1]] : n;
  return `${t}px ${r}px ${b}px ${l}px`;
}

export function toCssCornerRadius(v: string | null | undefined): string | null {
  if (!v) return null;
  const p = v.split(/[,\s]+/).filter(Boolean);
  if (!p.every((x) => /^-?\d*\.?\d+$/.test(x))) return v;
  const n = p.map(Number);
  return (n.length === 1 ? [n[0], n[0], n[0], n[0]] : n).map((x) => `${x}px`).join(' ');
}

export function toCssColor(v: string | null | undefined): string | null {
  if (!v) return null;
  let t = v.trim();
  const m = /^\{\s*(?:ThemeResource|StaticResource)\s+([^}\s]+)\s*\}$/.exec(t);
  if (m) t = m[1]!;
  if (t.startsWith('--')) return `var(${t})`;
  if (/^[A-Z][A-Za-z0-9]+$/.test(t) && /(Color|Brush)/.test(t)) {
    const key = t
      .replace(/Brush$/, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
    return `var(--w-${key})`;
  }
  return t;
}

function observeChildren(host: HTMLElement, attrs: string[], cb: () => void): MutationObserver {
  let queued = false;
  const run = () => {
    if (queued) return;
    queued = true;
    queueMicrotask(() => {
      queued = false;
      cb();
    });
  };
  const mo = new MutationObserver(run);
  mo.observe(host, { childList: true, subtree: true, attributes: true, attributeFilter: attrs });
  run();
  return mo;
}

export class WinStackPanel extends WinElement {
  static override styles = [
    css`
      :host {
        display: flex;
        flex-direction: column;
        align-items: stretch;
        box-sizing: border-box;
        gap: var(--spacing, 0px);
        min-width: 0;
      }
      :host([orientation="horizontal"]) { flex-direction: row; align-items: stretch; }
      ::slotted(:is(${LEFT_ALIGNED})) { align-self: flex-start; }
      :host([orientation="horizontal"]) ::slotted(*) { align-self: auto; }
      :host([orientation="horizontal"]) ::slotted(:is(${LEFT_ALIGNED})) { align-self: center; }
      ::slotted([horizontal-alignment="left"]) { align-self: flex-start; }
      ::slotted([horizontal-alignment="center"]) { align-self: center; }
      ::slotted([horizontal-alignment="right"]) { align-self: flex-end; }
      ::slotted([horizontal-alignment="stretch"]) { align-self: stretch; }
      :host([orientation="horizontal"]) ::slotted([vertical-alignment="top"]) { align-self: flex-start; }
      :host([orientation="horizontal"]) ::slotted([vertical-alignment="center"]) { align-self: center; }
      :host([orientation="horizontal"]) ::slotted([vertical-alignment="bottom"]) { align-self: flex-end; }
      :host([orientation="horizontal"]) ::slotted([vertical-alignment="stretch"]) { align-self: stretch; }
    `,
  ];
  static override template = `<slot></slot>`;
  static override props: PropDefs = {
    orientation: { type: String, reflect: true, default: 'vertical' },
    spacing: { type: Number, default: 0 },
  };
  declare orientation: 'vertical' | 'horizontal';
  declare spacing: number;
  static {
    this.define('win-stack-panel');
  }
  protected override updated(changed: Set<string>): void {
    if (changed.has('spacing')) this.style.setProperty('--spacing', `${this.spacing}px`);
  }
}

export class WinGridPanel extends WinElement {
  static override styles = [
    css`
      :host {
        display: grid;
        box-sizing: border-box;
        grid-template-columns: var(--cols, minmax(0, 1fr));
        grid-template-rows: var(--rows, minmax(0, 1fr));
        row-gap: var(--row-gap, 0px);
        column-gap: var(--col-gap, 0px);
        align-items: stretch;
        justify-items: stretch;
        min-width: 0;
      }
      ::slotted(*) { min-width: 0; min-height: 0; }
      ::slotted(:is(${LEFT_ALIGNED})) { justify-self: start; align-self: center; }
      ${alignmentCss}
    `,
  ];
  static override template = `<slot></slot>`;
  static override props: PropDefs = {
    rowDefinitions: { type: String, attribute: 'row-definitions' },
    columnDefinitions: { type: String, attribute: 'column-definitions' },
    rowSpacing: { type: Number, attribute: 'row-spacing', default: 0 },
    columnSpacing: { type: Number, attribute: 'column-spacing', default: 0 },
  };
  declare rowDefinitions: string;
  declare columnDefinitions: string;
  declare rowSpacing: number;
  declare columnSpacing: number;
  static {
    this.define('win-grid-panel');
  }

  private mo: MutationObserver | null = null;

  static tracks(defs: string | null | undefined): string | null {
    if (!defs?.trim()) return null;
    return defs
      .split(',')
      .map((d) => {
        const g = toCssTrackSize(d, '1fr');
        return g.endsWith('fr') ? `minmax(0, ${g})` : g;
      })
      .join(' ');
  }

  protected override connected(): void {
    this.mo ??= observeChildren(this, ['grid-row', 'grid-column', 'grid-row-span', 'grid-column-span'], () =>
      this.placeChildren(),
    );
  }
  protected override disconnected(): void {
    this.mo?.disconnect();
    this.mo = null;
  }

  protected override updated(changed: Set<string>): void {
    const s = this.style;
    if (changed.has('columnDefinitions')) {
      const c = WinGridPanel.tracks(this.columnDefinitions);
      if (c) s.setProperty('--cols', c);
      else s.removeProperty('--cols');
    }
    if (changed.has('rowDefinitions')) {
      const r = WinGridPanel.tracks(this.rowDefinitions);
      if (r) s.setProperty('--rows', r);
      else s.removeProperty('--rows');
    }
    if (changed.has('rowSpacing')) s.setProperty('--row-gap', `${this.rowSpacing}px`);
    if (changed.has('columnSpacing')) s.setProperty('--col-gap', `${this.columnSpacing}px`);
  }

  private placeChildren(): void {
    for (const c of Array.from(this.children) as HTMLElement[]) {
      const r = num(c.getAttribute('grid-row'));
      const col = num(c.getAttribute('grid-column'));
      const rs = Math.max(1, num(c.getAttribute('grid-row-span'), 1));
      const cs = Math.max(1, num(c.getAttribute('grid-column-span'), 1));
      c.style.gridRow = `${r + 1} / span ${rs}`;
      c.style.gridColumn = `${col + 1} / span ${cs}`;
    }
  }
}

export class WinAbsolutePanel extends WinElement {
  static override styles = [
    css`
      :host { display: block; position: relative; box-sizing: border-box; }
      ::slotted(*) { position: absolute; }
    `,
  ];
  static override template = `<slot></slot>`;
  static {
    this.define('win-absolute-panel');
  }
  private mo: MutationObserver | null = null;
  protected override connected(): void {
    this.mo ??= observeChildren(this, ['left', 'top', 'z-index'], () => {
      for (const c of Array.from(this.children) as HTMLElement[]) {
        c.style.left = `${num(c.getAttribute('left'))}px`;
        c.style.top = `${num(c.getAttribute('top'))}px`;
        const z = c.getAttribute('z-index');
        c.style.zIndex = z ?? '';
      }
    });
  }
  protected override disconnected(): void {
    this.mo?.disconnect();
    this.mo = null;
  }
}

const REL_ATTRS = [
  'left-of',
  'right-of',
  'above',
  'below',
  'align-left-with',
  'align-right-with',
  'align-top-with',
  'align-bottom-with',
  'align-horizontal-center-with',
  'align-vertical-center-with',
  'align-left-with-panel',
  'align-right-with-panel',
  'align-top-with-panel',
  'align-bottom-with-panel',
  'align-horizontal-center-with-panel',
  'align-vertical-center-with-panel',
];

interface Box {
  l: number;
  t: number;
  w: number;
  h: number;
}

export class WinRelativePanel extends WinElement {
  static override styles = [
    css`
      :host { display: block; position: relative; box-sizing: border-box; min-height: var(--rp-h, 0px); }
      ::slotted(*) { position: absolute; box-sizing: border-box; margin: 0; }
    `,
  ];
  static override template = `<slot></slot>`;
  static {
    this.define('win-relative-panel');
  }

  private mo: MutationObserver | null = null;
  private ro: ResizeObserver | null = null;
  private laying = false;

  protected override connected(): void {
    this.ro ??= new ResizeObserver(() => this.layout());
    this.ro.observe(this);
    this.mo ??= observeChildren(this, [...REL_ATTRS, 'id'], () => {
      this.ro?.disconnect();
      this.ro?.observe(this);
      for (const c of Array.from(this.children)) this.ro?.observe(c);
      this.layout();
    });
  }
  protected override disconnected(): void {
    this.mo?.disconnect();
    this.mo = null;
    this.ro?.disconnect();
  }

  layout(): void {
    if (this.laying) return;
    this.laying = true;
    try {
      const kids = Array.from(this.children) as HTMLElement[];
      const W = this.clientWidth;
      const H = this.clientHeight;
      const natural = new Map<HTMLElement, { w: number; h: number }>();
      for (const k of kids) {
        if (k.dataset.rpW !== undefined) {
          k.style.width = k.dataset.rpW;
          delete k.dataset.rpW;
        }
        if (k.dataset.rpH !== undefined) {
          k.style.height = k.dataset.rpH;
          delete k.dataset.rpH;
        }
        natural.set(k, { w: k.offsetWidth, h: k.offsetHeight });
      }
      const byId = new Map<string, HTMLElement>();
      for (const k of kids) if (k.id) byId.set(k.id, k);
      const done = new Map<HTMLElement, Box>();
      const visiting = new Set<HTMLElement>();
      const flag = (k: HTMLElement, a: string) => k.hasAttribute(a) && k.getAttribute(a) !== 'false';

      const solve = (k: HTMLElement): Box => {
        const cached = done.get(k);
        if (cached) return cached;
        const nat = natural.get(k)!;
        if (visiting.has(k)) return { l: 0, t: 0, w: nat.w, h: nat.h };
        visiting.add(k);
        const ref = (a: string): Box | null => {
          const id = k.getAttribute(a);
          const other = id ? byId.get(id) : null;
          return other && other !== k ? solve(other) : null;
        };
        let left: number | null = null;
        let right: number | null = null;
        let centerX: number | null = null;
        if (flag(k, 'align-left-with-panel')) left = 0;
        if (flag(k, 'align-right-with-panel')) right = W;
        if (flag(k, 'align-horizontal-center-with-panel')) centerX = W / 2;
        const ro = ref('right-of');
        if (ro) left = ro.l + ro.w;
        const lo = ref('left-of');
        if (lo) right = lo.l;
        const alw = ref('align-left-with');
        if (alw) left = alw.l;
        const arw = ref('align-right-with');
        if (arw) right = arw.l + arw.w;
        const ahc = ref('align-horizontal-center-with');
        if (ahc) centerX = ahc.l + ahc.w / 2;
        let w = nat.w;
        let l: number;
        if (left !== null && right !== null) {
          l = left;
          w = Math.max(0, right - left);
          k.dataset.rpW ??= k.style.width;
          k.style.width = `${w}px`;
        } else if (left !== null) l = left;
        else if (right !== null) l = right - w;
        else if (centerX !== null) l = centerX - w / 2;
        else l = 0;
        let top: number | null = null;
        let bottom: number | null = null;
        let centerY: number | null = null;
        if (flag(k, 'align-top-with-panel')) top = 0;
        if (flag(k, 'align-bottom-with-panel')) bottom = H;
        if (flag(k, 'align-vertical-center-with-panel')) centerY = H / 2;
        const be = ref('below');
        if (be) top = be.t + be.h;
        const ab = ref('above');
        if (ab) bottom = ab.t;
        const atw = ref('align-top-with');
        if (atw) top = atw.t;
        const abw = ref('align-bottom-with');
        if (abw) bottom = abw.t + abw.h;
        const avc = ref('align-vertical-center-with');
        if (avc) centerY = avc.t + avc.h / 2;
        let h = k.offsetHeight || nat.h;
        let t: number;
        if (top !== null && bottom !== null) {
          t = top;
          h = Math.max(0, bottom - top);
          k.dataset.rpH ??= k.style.height;
          k.style.height = `${h}px`;
        } else if (top !== null) t = top;
        else if (bottom !== null) t = bottom - h;
        else if (centerY !== null) t = centerY - h / 2;
        else t = 0;
        const box = { l, t, w, h };
        done.set(k, box);
        visiting.delete(k);
        return box;
      };
      let maxB = 0;
      for (const k of kids) {
        const b = solve(k);
        k.style.left = `${b.l}px`;
        k.style.top = `${b.t}px`;
        maxB = Math.max(maxB, b.t + b.h);
      }
      this.style.setProperty('--rp-h', `${Math.ceil(maxB)}px`);
    } finally {
      this.laying = false;
    }
  }
}

export class WinVariableSizedWrapGrid extends WinElement {
  static override styles = [
    css`
      :host {
        display: grid;
        box-sizing: border-box;
        grid-auto-flow: column;
        grid-template-rows: var(--vs-rows, repeat(auto-fill, var(--ih)));
        grid-auto-columns: var(--iw);
        grid-auto-rows: var(--ih);
        justify-content: start;
        align-content: start;
        --iw: 100px;
        --ih: 100px;
      }
      :host([orientation="horizontal"]) {
        grid-auto-flow: row;
        grid-template-rows: none;
        grid-template-columns: var(--vs-cols, repeat(auto-fill, var(--iw)));
      }
      ::slotted(*) { min-width: 0; min-height: 0; box-sizing: border-box; }
    `,
  ];
  static override template = `<slot></slot>`;
  static override props: PropDefs = {
    orientation: { type: String, reflect: true, default: 'vertical' },
    itemWidth: { type: Number, attribute: 'item-width', default: 100 },
    itemHeight: { type: Number, attribute: 'item-height', default: 100 },
    maximumRowsOrColumns: { type: Number, attribute: 'maximum-rows-or-columns', default: -1 },
  };
  declare orientation: 'vertical' | 'horizontal';
  declare itemWidth: number;
  declare itemHeight: number;
  declare maximumRowsOrColumns: number;
  static {
    this.define('win-variable-sized-wrap-grid');
  }
  private mo: MutationObserver | null = null;
  protected override connected(): void {
    this.mo ??= observeChildren(this, ['row-span', 'column-span'], () => {
      for (const c of Array.from(this.children) as HTMLElement[]) {
        c.style.gridRow = `span ${Math.max(1, num(c.getAttribute('row-span'), 1))}`;
        c.style.gridColumn = `span ${Math.max(1, num(c.getAttribute('column-span'), 1))}`;
      }
    });
  }
  protected override disconnected(): void {
    this.mo?.disconnect();
    this.mo = null;
  }
  protected override updated(): void {
    const s = this.style;
    s.setProperty('--iw', `${this.itemWidth}px`);
    s.setProperty('--ih', `${this.itemHeight}px`);
    const m = this.maximumRowsOrColumns;
    if (m > 0) {
      s.setProperty('--vs-rows', `repeat(${m}, var(--ih))`);
      s.setProperty('--vs-cols', `repeat(${m}, var(--iw))`);
    } else {
      s.removeProperty('--vs-rows');
      s.removeProperty('--vs-cols');
    }
  }
}

export class WinFitBox extends WinElement {
  static override styles = [
    css`
      :host { display: block; position: relative; box-sizing: border-box; overflow: hidden; min-height: var(--vb-h, 0px); }
      .box { position: absolute; left: 0; top: 0; width: max-content; transform-origin: 0 0; }
    `,
  ];
  static override template = `<div class="box" part="content"><slot></slot></div>`;
  static override props: PropDefs = {
    stretch: { type: String, default: 'uniform' },
    stretchDirection: { type: String, attribute: 'stretch-direction', default: 'both' },
  };
  declare stretch: 'none' | 'fill' | 'uniform' | 'uniform-to-fill';
  declare stretchDirection: 'up-only' | 'down-only' | 'both';
  static {
    this.define('win-fit-box');
  }
  private box!: HTMLElement;
  private ro: ResizeObserver | null = null;
  protected override firstConnected(): void {
    this.box = this.$('.box');
    this.ro = new ResizeObserver(() => this.fit());
    this.ro.observe(this);
    this.ro.observe(this.box);
  }
  protected override updated(): void {
    this.fit();
  }
  private fit(): void {
    if (!this.box) return;
    const w = this.box.offsetWidth;
    const h = this.box.offsetHeight;
    if (!w || !h) return;
    const W = this.clientWidth;
    const autoHeight = this.clientHeight === 0 || Math.abs(this.clientHeight - this.lastAutoHeight) < 1;
    const H = autoHeight ? Infinity : this.clientHeight;
    let sx = W / w;
    let sy = Number.isFinite(H) ? H / h : sx;
    switch (this.stretch) {
      case 'none':
        sx = sy = 1;
        break;
      case 'fill':
        break;
      case 'uniform-to-fill':
        sx = sy = Number.isFinite(H) ? Math.max(sx, sy) : sx;
        break;
      default:
        sx = sy = Math.min(sx, sy);
    }
    const dir = this.stretchDirection;
    if (dir === 'up-only') {
      sx = Math.max(1, sx);
      sy = Math.max(1, sy);
    } else if (dir === 'down-only') {
      sx = Math.min(1, sx);
      sy = Math.min(1, sy);
    }
    const sw = w * sx;
    const sh = h * sy;
    const tx = (W - sw) / 2;
    const ty = Number.isFinite(H) ? (H - sh) / 2 : 0;
    this.box.style.transform = `translate(${tx}px, ${ty}px) scale(${sx}, ${sy})`;
    if (autoHeight) {
      this.lastAutoHeight = Math.round(sh);
      this.style.setProperty('--vb-h', `${this.lastAutoHeight}px`);
    }
  }
  private lastAutoHeight = -1;
}

export class WinBox extends WinElement {
  static override styles = [
    css`
      :host {
        display: block;
        box-sizing: border-box;
        border-style: solid;
        border-width: 0;
        border-color: transparent;
        background-clip: padding-box;
      }
      :host([background-sizing="outer-border-edge"]) { background-clip: border-box; }
    `,
  ];
  static override template = `<slot></slot>`;
  static override props: PropDefs = {
    background: { type: String },
    borderColor: { type: String, attribute: 'border-color' },
    borderWidth: { type: String, attribute: 'border-width' },
    cornerRadius: { type: String, attribute: 'corner-radius' },
    padding: { type: String },
  };
  declare background: string;
  declare borderColor: string;
  declare borderWidth: string;
  declare cornerRadius: string;
  declare padding: string;
  static {
    this.define('win-box');
  }
  protected override updated(): void {
    const s = this.style;
    const set = (prop: string, v: string | null) => (v ? s.setProperty(prop, v) : s.removeProperty(prop));
    set('background-color', toCssColor(this.background));
    set('border-color', toCssColor(this.borderColor));
    set('border-width', toCssThickness(this.borderWidth));
    set('border-radius', toCssCornerRadius(this.cornerRadius));
    set('padding', toCssThickness(this.padding));
  }
}

export class WinWrapPanel extends WinElement {
  static override styles = [
    css`
      :host {
        display: flex;
        flex-flow: row wrap;
        align-items: flex-start;
        align-content: flex-start;
        box-sizing: border-box;
        column-gap: var(--hs, 0px);
        row-gap: var(--vs, 0px);
      }
      :host([orientation="vertical"]) { flex-flow: column wrap; }
      :host([stretch-child="last"]) ::slotted(:last-child) { flex: 1 1 auto; }
    `,
  ];
  static override template = `<slot></slot>`;
  static override props: PropDefs = {
    orientation: { type: String, reflect: true, default: 'horizontal' },
    horizontalSpacing: { type: Number, attribute: 'horizontal-spacing', default: 0 },
    verticalSpacing: { type: Number, attribute: 'vertical-spacing', default: 0 },
    stretchChild: { type: String, attribute: 'stretch-child', reflect: true, default: 'none' },
  };
  declare orientation: 'horizontal' | 'vertical';
  declare horizontalSpacing: number;
  declare verticalSpacing: number;
  declare stretchChild: 'none' | 'last';
  static {
    this.define('win-wrap-panel');
  }
  protected override updated(): void {
    this.style.setProperty('--hs', `${this.horizontalSpacing}px`);
    this.style.setProperty('--vs', `${this.verticalSpacing}px`);
  }
}

export class WinDockPanel extends WinElement {
  static override styles = [
    css`
      :host { display: block; position: relative; box-sizing: border-box; min-height: var(--dp-h, 0px); }
      ::slotted(*) { position: absolute; box-sizing: border-box; margin: 0; }
    `,
  ];
  static override template = `<slot></slot>`;
  static override props: PropDefs = {
    lastChildFill: { type: Boolean, attribute: 'last-child-fill', default: true },
    horizontalSpacing: { type: Number, attribute: 'horizontal-spacing', default: 0 },
    verticalSpacing: { type: Number, attribute: 'vertical-spacing', default: 0 },
  };
  declare lastChildFill: boolean;
  declare horizontalSpacing: number;
  declare verticalSpacing: number;
  static {
    this.define('win-dock-panel');
  }
  private ro: ResizeObserver | null = null;
  private mo: MutationObserver | null = null;
  private busy = false;
  protected override connected(): void {
    this.ro ??= new ResizeObserver(() => this.layout());
    this.ro.observe(this);
    this.mo ??= new MutationObserver(() => this.layout());
    this.mo.observe(this, { childList: true, attributes: true, subtree: false, attributeFilter: ['dock'] });
    queueMicrotask(() => this.layout());
  }
  protected override disconnected(): void {
    this.ro?.disconnect();
    this.ro = null;
    this.mo?.disconnect();
    this.mo = null;
  }
  protected override updated(): void {
    this.layout();
  }

  layout(): void {
    if (this.busy) return;
    this.busy = true;
    try {
      const kids = Array.from(this.children) as HTMLElement[];
      const W = this.clientWidth;
      const autoH = !this.style.height && this.clientHeight <= (this.lastAuto || 0) + 0.5;
      let H = autoH ? Infinity : this.clientHeight;
      for (const k of kids) {
        if (k.dataset.dpW !== undefined) {
          k.style.width = k.dataset.dpW;
          delete k.dataset.dpW;
        }
        if (k.dataset.dpH !== undefined) {
          k.style.height = k.dataset.dpH;
          delete k.dataset.dpH;
        }
      }
      const setW = (k: HTMLElement, v: number) => {
        k.dataset.dpW ??= k.style.width;
        k.style.width = `${v}px`;
      };
      const setH = (k: HTMLElement, v: number) => {
        k.dataset.dpH ??= k.style.height;
        k.style.height = `${v}px`;
      };
      if (!Number.isFinite(H)) {
        let stacked = 0;
        let side = 0;
        kids.forEach((k, i) => {
          const d = k.getAttribute('dock') ?? 'left';
          const fill = this.lastChildFill && i === kids.length - 1;
          if (!fill && (d === 'top' || d === 'bottom')) stacked += k.offsetHeight + this.verticalSpacing;
          else side = Math.max(side, k.offsetHeight);
        });
        H = stacked + side;
        this.lastAuto = Math.ceil(H);
        this.style.setProperty('--dp-h', `${this.lastAuto}px`);
      }
      let l = 0;
      let t = 0;
      let r = W;
      let b = H;
      kids.forEach((k, i) => {
        const fill = this.lastChildFill && i === kids.length - 1;
        const d = k.getAttribute('dock') ?? 'left';
        if (fill) {
          k.style.left = `${l}px`;
          k.style.top = `${t}px`;
          setW(k, Math.max(0, r - l));
          setH(k, Math.max(0, b - t));
          return;
        }
        if (d === 'top' || d === 'bottom') {
          const h = k.offsetHeight;
          k.style.left = `${l}px`;
          setW(k, Math.max(0, r - l));
          if (d === 'top') {
            k.style.top = `${t}px`;
            t += h + this.verticalSpacing;
          } else {
            b -= h;
            k.style.top = `${b}px`;
            b -= this.verticalSpacing;
          }
        } else {
          const w = k.offsetWidth;
          k.style.top = `${t}px`;
          setH(k, Math.max(0, b - t));
          if (d === 'right') {
            r -= w;
            k.style.left = `${r}px`;
            r -= this.horizontalSpacing;
          } else {
            k.style.left = `${l}px`;
            l += w + this.horizontalSpacing;
          }
        }
      });
    } finally {
      this.busy = false;
    }
  }
  private lastAuto = 0;
}

export class WinUniformGrid extends WinElement {
  static override styles = [
    css`
      :host {
        display: grid;
        box-sizing: border-box;
        grid-template-columns: repeat(var(--ug-cols, 1), minmax(0, 1fr));
        grid-template-rows: repeat(var(--ug-rows, 1), minmax(0, 1fr));
        row-gap: var(--ug-rg, 0px);
        column-gap: var(--ug-cg, 0px);
      }
      :host([orientation="vertical"]) { grid-auto-flow: column; }
      ::slotted(*) { min-width: 0; min-height: 0; }
    `,
  ];
  static override template = `<slot></slot>`;
  static override props: PropDefs = {
    rows: { type: Number, default: 0 },
    columns: { type: Number, default: 0 },
    firstColumn: { type: Number, attribute: 'first-column', default: 0 },
    orientation: { type: String, reflect: true, default: 'horizontal' },
    rowSpacing: { type: Number, attribute: 'row-spacing', default: 0 },
    columnSpacing: { type: Number, attribute: 'column-spacing', default: 0 },
  };
  declare rows: number;
  declare columns: number;
  declare firstColumn: number;
  declare orientation: 'horizontal' | 'vertical';
  declare rowSpacing: number;
  declare columnSpacing: number;
  static {
    this.define('win-uniform-grid');
  }
  private mo: MutationObserver | null = null;
  protected override connected(): void {
    this.mo ??= new MutationObserver(() => this.layout());
    this.mo.observe(this, { childList: true });
    this.layout();
  }
  protected override disconnected(): void {
    this.mo?.disconnect();
    this.mo = null;
  }
  protected override updated(): void {
    this.layout();
  }
  private layout(): void {
    const kids = Array.from(this.children).filter((c) => !(c as HTMLElement).hidden) as HTMLElement[];
    const n = kids.length + Math.max(0, this.firstColumn);
    let cols = this.columns;
    let rows = this.rows;
    if (cols <= 0 && rows <= 0) {
      cols = Math.max(1, Math.ceil(Math.sqrt(n)));
      rows = Math.max(1, Math.ceil(n / cols));
    } else if (cols <= 0) cols = Math.max(1, Math.ceil(n / rows));
    else if (rows <= 0) rows = Math.max(1, Math.ceil(n / cols));
    const s = this.style;
    s.setProperty('--ug-cols', String(cols));
    s.setProperty('--ug-rows', String(rows));
    s.setProperty('--ug-rg', `${this.rowSpacing}px`);
    s.setProperty('--ug-cg', `${this.columnSpacing}px`);
    kids.forEach((k, i) => {
      if (i === 0 && this.firstColumn > 0) {
        if (this.orientation === 'vertical') k.style.gridRowStart = String(this.firstColumn + 1);
        else k.style.gridColumnStart = String(this.firstColumn + 1);
      } else {
        k.style.gridRowStart = '';
        k.style.gridColumnStart = '';
      }
    });
  }
}

export class WinConstrainedBox extends WinElement {
  static override styles = [
    css`
      :host { display: block; box-sizing: border-box; position: relative; }
      .box { box-sizing: border-box; margin: 0 auto; width: var(--cb-w, 100%); height: var(--cb-h, auto); overflow: hidden; }
      ::slotted(*) { width: 100%; height: 100%; box-sizing: border-box; }
    `,
  ];
  static override template = `<div class="box" part="content"><slot></slot></div>`;
  static override props: PropDefs = {
    aspectRatio: { type: String, attribute: 'aspect-ratio' },
    multipleX: { type: Number, attribute: 'multiple-x', default: 0 },
    multipleY: { type: Number, attribute: 'multiple-y', default: 0 },
    scaleX: { type: Number, attribute: 'scale-x', default: 1 },
    scaleY: { type: Number, attribute: 'scale-y', default: 1 },
  };
  declare aspectRatio: string;
  declare multipleX: number;
  declare multipleY: number;
  declare scaleX: number;
  declare scaleY: number;
  static {
    this.define('win-constrained-box');
  }
  private ro: ResizeObserver | null = null;
  protected override firstConnected(): void {
    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(this);
  }
  protected override updated(): void {
    this.layout();
  }
  private ratio(): number | null {
    const v = this.aspectRatio?.trim();
    if (!v) return null;
    const m = /^(\d*\.?\d+)\s*[:/]\s*(\d*\.?\d+)$/.exec(v);
    if (m) return Number(m[1]) / Number(m[2]);
    const n = Number(v);
    return Number.isFinite(n) && n > 0 ? n : null;
  }
  private layout(): void {
    const W = this.clientWidth;
    if (!W) return;
    let w = W * clamp01(this.scaleX);
    let h: number | null = null;
    const r = this.ratio();
    const Hc = this.style.height ? this.clientHeight : 0;
    if (Hc) {
      h = Hc * clamp01(this.scaleY);
      if (r) {
        if (w / h > r) w = h * r;
        else h = w / r;
      }
    } else if (r) h = w / r;
    if (this.multipleX > 0) w = Math.floor(w / this.multipleX) * this.multipleX;
    if (h !== null && this.multipleY > 0) h = Math.floor(h / this.multipleY) * this.multipleY;
    this.style.setProperty('--cb-w', `${w}px`);
    if (h !== null) this.style.setProperty('--cb-h', `${h}px`);
    else this.style.removeProperty('--cb-h');
  }
}

const clamp01 = (v: number) => (v > 0 ? Math.min(1, v) : 1);

export class WinStaggeredPanel extends WinElement {
  static override styles = [
    css`
      :host { display: block; position: relative; box-sizing: border-box; min-height: var(--sp-h, 0px); }
      ::slotted(*) { position: absolute; box-sizing: border-box; margin: 0; width: var(--sp-w); }
    `,
  ];
  static override template = `<slot></slot>`;
  static override props: PropDefs = {
    desiredColumnWidth: { type: Number, attribute: 'desired-column-width', default: 250 },
    columnSpacing: { type: Number, attribute: 'column-spacing', default: 0 },
    rowSpacing: { type: Number, attribute: 'row-spacing', default: 0 },
  };
  declare desiredColumnWidth: number;
  declare columnSpacing: number;
  declare rowSpacing: number;
  static {
    this.define('win-staggered-panel');
  }
  private ro: ResizeObserver | null = null;
  private mo: MutationObserver | null = null;
  protected override connected(): void {
    this.ro ??= new ResizeObserver(() => this.layout());
    this.ro.observe(this);
    this.mo ??= new MutationObserver(() => {
      for (const c of Array.from(this.children)) this.ro?.observe(c);
      this.layout();
    });
    this.mo.observe(this, { childList: true });
    for (const c of Array.from(this.children)) this.ro.observe(c);
  }
  protected override disconnected(): void {
    this.ro?.disconnect();
    this.ro = null;
    this.mo?.disconnect();
    this.mo = null;
  }
  protected override updated(): void {
    this.layout();
  }
  private layout(): void {
    const W = this.clientWidth;
    if (!W) return;
    const gap = this.columnSpacing;
    const cols = Math.max(1, Math.floor((W + gap) / (this.desiredColumnWidth + gap)));
    const colW = (W - gap * (cols - 1)) / cols;
    this.style.setProperty('--sp-w', `${colW}px`);
    const heights = new Array<number>(cols).fill(0);
    for (const k of Array.from(this.children) as HTMLElement[]) {
      if (k.hidden) continue;
      let c = 0;
      for (let i = 1; i < cols; i++) if (heights[i]! < heights[c]!) c = i;
      k.style.left = `${c * (colW + gap)}px`;
      k.style.top = `${heights[c]}px`;
      heights[c] = heights[c]! + k.offsetHeight + this.rowSpacing;
    }
    this.style.setProperty('--sp-h', `${Math.max(0, Math.max(...heights) - this.rowSpacing)}px`);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-stack-panel': WinStackPanel;
    'win-grid-panel': WinGridPanel;
    'win-absolute-panel': WinAbsolutePanel;
    'win-relative-panel': WinRelativePanel;
    'win-variable-sized-wrap-grid': WinVariableSizedWrapGrid;
    'win-fit-box': WinFitBox;
    'win-box': WinBox;
    'win-wrap-panel': WinWrapPanel;
    'win-dock-panel': WinDockPanel;
    'win-uniform-grid': WinUniformGrid;
    'win-constrained-box': WinConstrainedBox;
    'win-staggered-panel': WinStaggeredPanel;
  }
}
