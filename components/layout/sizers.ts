import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { clamp, isRtl } from '../../base/dom.ts';
import { toCssTrackSize } from './two-pane-view.ts';

const sizerCss = css`
:host {
  display: flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 8px;
  min-height: 8px;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  cursor: col-resize;
  touch-action: none;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
  transition: background-color var(--w-duration-faster) linear;
}
:host([orientation="horizontal"]) { cursor: row-resize; }
:host(:hover) { background: var(--w-subtle-fill-color-secondary); }
:host([data-w-dragging]) { background: var(--w-subtle-fill-color-tertiary); }
.thumb {
  width: 4px;
  height: 24px;
  border-radius: 2px;
  background: var(--w-control-strong-fill-color-default);
  flex: none;
  transition: scale var(--w-duration-fast) var(--w-ease-decelerate);
}
:host([orientation="horizontal"]) .thumb { width: 24px; height: 4px; }
:host([data-w-dragging]) .thumb { scale: 1 1.15; }
:host([orientation="horizontal"][data-w-dragging]) .thumb { scale: 1.15 1; }
:host([disabled]) { pointer-events: none; }
:host([disabled]) .thumb { background: var(--w-control-strong-fill-color-disabled); }
${focusRing(':host(:focus-visible)', 0)}
`;

abstract class SizerBase extends WinElement {
  static override styles = [sizerCss];
  static override template = `<div class="thumb" part="thumb"></div>`;
  static override props: PropDefs = {
    orientation: { type: String, reflect: true, default: 'vertical' },
    keyboardIncrement: { type: Number, attribute: 'keyboard-increment', default: 8 },
    dragIncrement: { type: Number, attribute: 'drag-increment', default: 1 },
    isDragInverted: { type: Boolean, attribute: 'is-drag-inverted' },
    disabled: { type: Boolean },
  };
  declare orientation: 'vertical' | 'horizontal';
  declare keyboardIncrement: number;
  declare dragIncrement: number;
  declare isDragInverted: boolean;
  declare disabled: boolean;

  protected get horizontalResize(): boolean {
    return this.orientation !== 'horizontal';
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'separator');
    this.addEventListener('pointerdown', (ev) => {
      if (this.disabled || ev.button !== 0) return;
      ev.preventDefault();
      this.setPointerCapture(ev.pointerId);
      this.toggleAttribute('data-w-dragging', true);
      this.onDragStarted();
      const sx = ev.clientX;
      const sy = ev.clientY;
      const rtl = isRtl(this);
      const move = (e: PointerEvent) => {
        let d = this.horizontalResize ? e.clientX - sx : e.clientY - sy;
        if (this.horizontalResize && rtl) d = -d;
        if (this.isDragInverted) d = -d;
        const inc = Math.max(1, this.dragIncrement);
        d = Math.round(d / inc) * inc;
        this.onDragDelta(d);
      };
      const up = () => {
        this.removeEventListener('pointermove', move);
        this.removeEventListener('pointerup', up);
        this.removeEventListener('lostpointercapture', up);
        this.removeAttribute('data-w-dragging');
        this.onDragCompleted();
      };
      this.addEventListener('pointermove', move);
      this.addEventListener('pointerup', up);
      this.addEventListener('lostpointercapture', up);
    });
    this.addEventListener('keydown', (ev) => {
      if (this.disabled) return;
      const h = this.horizontalResize;
      let d = 0;
      if (h && ev.key === 'ArrowLeft') d = -1;
      else if (h && ev.key === 'ArrowRight') d = 1;
      else if (!h && ev.key === 'ArrowUp') d = -1;
      else if (!h && ev.key === 'ArrowDown') d = 1;
      if (!d) return;
      ev.preventDefault();
      if (h && isRtl(this)) d = -d;
      if (this.isDragInverted) d = -d;
      this.onDragStarted();
      this.onDragDelta(d * this.keyboardIncrement);
      this.onDragCompleted();
    });
  }

  protected override updated(changed: Set<string>): void {
    if (changed.has('orientation')) this.aria('aria-orientation', this.horizontalResize ? 'vertical' : 'horizontal');
    if (changed.has('disabled')) {
      this.setFocusable(!this.disabled);
      this.aria('aria-disabled', this.disabled ? 'true' : null);
    }
  }

  protected abstract onDragStarted(): void;
  protected abstract onDragDelta(delta: number): void;
  protected onDragCompleted(): void {
    this.emit('manipulationcompleted', undefined, { bubbles: false });
  }
}

export class WinGridSplitter extends SizerBase {
  static override props: PropDefs = {
    resizeBehavior: { type: String, attribute: 'resize-behavior', default: 'previous-and-next' },
  };
  declare resizeBehavior: 'previous-and-next' | 'previous-and-current' | 'current-and-next';
  static {
    this.define('win-grid-splitter');
  }

  private start: { tracks: number[]; star: boolean[]; a: number; b: number } | null = null;

  private gridParent(): HTMLElement | null {
    const p = this.parentElement;
    return p && getComputedStyle(p).display.includes('grid') ? p : null;
  }

  protected override onDragStarted(): void {
    const g = this.gridParent();
    if (!g) return;
    const cs = getComputedStyle(g);
    const tracks = (this.horizontalResize ? cs.gridTemplateColumns : cs.gridTemplateRows)
      .split(' ')
      .map((v) => Number.parseFloat(v) || 0);
    const defs = (g.getAttribute(this.horizontalResize ? 'column-definitions' : 'row-definitions') ?? '').split(',');
    const star = tracks.map((_, i) => toCssTrackSize(defs[i]?.trim() || '*').endsWith('fr'));
    const idx = Number(this.getAttribute(this.horizontalResize ? 'grid-column' : 'grid-row') ?? 0);
    let a = idx - 1;
    let b = idx + 1;
    if (this.resizeBehavior === 'previous-and-current') b = idx;
    if (this.resizeBehavior === 'current-and-next') a = idx;
    if (a < 0 || b >= tracks.length) return;
    this.start = { tracks, star, a, b };
  }

  protected override onDragDelta(delta: number): void {
    const g = this.gridParent();
    const s = this.start;
    if (!g || !s) return;
    const t = [...s.tracks];
    const total = t[s.a]! + t[s.b]!;
    t[s.a] = clamp(s.tracks[s.a]! + delta, 0, total);
    t[s.b] = total - t[s.a]!;
    const css = t.map((v, i) => (s.star[i] ? `minmax(0, ${Math.max(0.0001, v)}fr)` : `${v}px`)).join(' ');
    if (this.horizontalResize) g.style.gridTemplateColumns = css;
    else g.style.gridTemplateRows = css;
    this.emit('resize', { delta }, { bubbles: false });
  }
}

export class WinContentSizer extends SizerBase {
  static override props: PropDefs = {
    target: { type: String },
  };
  declare target: string;
  static {
    this.define('win-content-sizer');
  }
  private startSize = 0;
  private resolveTarget(): HTMLElement | null {
    if (this.target)
      return (this.getRootNode() as Document).getElementById?.(this.target) ?? document.getElementById(this.target);
    return this.previousElementSibling as HTMLElement | null;
  }
  protected override onDragStarted(): void {
    const t = this.resolveTarget();
    if (!t) return;
    this.startSize = this.horizontalResize ? t.getBoundingClientRect().width : t.getBoundingClientRect().height;
  }
  protected override onDragDelta(delta: number): void {
    const t = this.resolveTarget();
    if (!t) return;
    const cs = getComputedStyle(t);
    const min = Number.parseFloat(this.horizontalResize ? cs.minWidth : cs.minHeight) || 0;
    const maxRaw = Number.parseFloat(this.horizontalResize ? cs.maxWidth : cs.maxHeight);
    const max = Number.isFinite(maxRaw) ? maxRaw : Infinity;
    const v = clamp(this.startSize + delta, min, max);
    if (this.horizontalResize) {
      t.style.width = `${v}px`;
      t.style.flexBasis = `${v}px`;
    } else {
      t.style.height = `${v}px`;
      t.style.flexBasis = `${v}px`;
    }
    this.emit('resize', { size: v }, { bubbles: false });
  }
}

export class WinPropertySizer extends SizerBase {
  static override props: PropDefs = {
    target: { type: String },
    property: { type: String },
    minimum: { type: Number, default: 0 },
    maximum: { type: Number, default: Number.POSITIVE_INFINITY },
  };
  declare target: string;
  declare property: string;
  declare minimum: number;
  declare maximum: number;
  static {
    this.define('win-property-sizer');
  }
  private startValue = 0;
  private el(): HTMLElement | null {
    return this.target
      ? ((this.getRootNode() as Document).getElementById?.(this.target) ?? document.getElementById(this.target))
      : null;
  }
  private read(): number {
    const t = this.el();
    if (!t || !this.property) return 0;
    if (this.property.startsWith('--'))
      return Number.parseFloat(getComputedStyle(t).getPropertyValue(this.property)) || 0;
    return Number((t as unknown as Record<string, unknown>)[this.property]) || 0;
  }
  private write(v: number): void {
    const t = this.el();
    if (!t || !this.property) return;
    if (this.property.startsWith('--')) t.style.setProperty(this.property, `${v}px`);
    else (t as unknown as Record<string, unknown>)[this.property] = v;
  }
  protected override onDragStarted(): void {
    this.startValue = this.read();
  }
  protected override onDragDelta(delta: number): void {
    const v = clamp(this.startValue + delta, this.minimum, this.maximum);
    this.write(v);
    this.aria('aria-valuenow', Math.round(v));
    this.emit('resize', { value: v }, { bubbles: false });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-grid-splitter': WinGridSplitter;
    'win-content-sizer': WinContentSizer;
    'win-property-sizer': WinPropertySizer;
  }
}
