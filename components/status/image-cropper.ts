import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';

export interface CropRect {
  x: number;
  y: number;
  width: number;
  height: number;
}

type Handle = 'nw' | 'n' | 'ne' | 'e' | 'se' | 's' | 'sw' | 'w' | 'move';

const cropCss = css`
:host {
  display: block;
  position: relative;
  width: 100%;
  height: 360px;
  overflow: hidden;
  user-select: none;
  touch-action: none;
  background: var(--w-control-alt-fill-color-secondary);
  border-radius: var(--w-corner-radius-overlay);
}
img { position: absolute; display: block; pointer-events: none; }
img:not([src]) { display: none; }
svg.mask { position: absolute; inset: 0; width: 100%; height: 100%; pointer-events: none; }
svg.mask path { fill: rgba(0, 0, 0, 0.5); fill-rule: evenodd; }
.region {
  position: absolute;
  box-sizing: border-box;
  cursor: move;
  outline: none;
}
.region::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid rgba(255, 255, 255, 0.75);
  pointer-events: none;
}
:host([crop-shape="circular"]) .region::after { border-radius: 50%; }
.grid {
  position: absolute;
  inset: 0;
  pointer-events: none;
  opacity: 0;
  transition: opacity var(--w-duration-fast) linear;
  background:
    linear-gradient(to right, transparent calc(33.333% - 0.5px), rgba(255,255,255,0.5) calc(33.333% - 0.5px), rgba(255,255,255,0.5) calc(33.333% + 0.5px), transparent calc(33.333% + 0.5px), transparent calc(66.666% - 0.5px), rgba(255,255,255,0.5) calc(66.666% - 0.5px), rgba(255,255,255,0.5) calc(66.666% + 0.5px), transparent calc(66.666% + 0.5px)),
    linear-gradient(to bottom, transparent calc(33.333% - 0.5px), rgba(255,255,255,0.5) calc(33.333% - 0.5px), rgba(255,255,255,0.5) calc(33.333% + 0.5px), transparent calc(33.333% + 0.5px), transparent calc(66.666% - 0.5px), rgba(255,255,255,0.5) calc(66.666% - 0.5px), rgba(255,255,255,0.5) calc(66.666% + 0.5px), transparent calc(66.666% + 0.5px));
}
:host([data-dragging]) .grid { opacity: 1; }
:host([crop-shape="circular"]) .grid { display: none; }
${focusRing('.region:focus-visible', 0)}
.thumb {
  position: absolute;
  width: 20px;
  height: 20px;
  margin: -10px 0 0 -10px;
  box-sizing: border-box;
  border-radius: 50%;
  border: 1px solid var(--w-control-stroke-color-secondary);
  background: var(--w-control-solid-fill-color-default);
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.3);
  outline: none;
  transition: scale var(--w-duration-fast) var(--w-ease-decelerate);
}
.thumb:hover { scale: 1.15; }
.thumb[data-active] { scale: 0.9; }
${focusRing('.thumb:focus-visible', 3)}
.thumb[data-h="nw"], .thumb[data-h="se"] { cursor: nwse-resize; }
.thumb[data-h="ne"], .thumb[data-h="sw"] { cursor: nesw-resize; }
.thumb[data-h="n"], .thumb[data-h="s"] { cursor: ns-resize; }
.thumb[data-h="e"], .thumb[data-h="w"] { cursor: ew-resize; }
:host([thumb-placement="corners"]) .thumb[data-h="n"],
:host([thumb-placement="corners"]) .thumb[data-h="s"],
:host([thumb-placement="corners"]) .thumb[data-h="e"],
:host([thumb-placement="corners"]) .thumb[data-h="w"] { display: none; }
:host(:not([data-ready])) .region, :host(:not([data-ready])) .thumb, :host(:not([data-ready])) svg.mask { display: none; }
.empty { position: absolute; inset: 0; display: grid; place-items: center; color: var(--w-text-fill-color-secondary); }
:host([data-ready]) .empty { display: none; }
`;

const HANDLES: Exclude<Handle, 'move'>[] = ['nw', 'n', 'ne', 'e', 'se', 's', 'sw', 'w'];
const HANDLE_LABEL: Record<Exclude<Handle, 'move'>, string> = {
  nw: '左上',
  n: '上',
  ne: '右上',
  e: '右',
  se: '右下',
  s: '下',
  sw: '左下',
  w: '左',
};

export class WinImageCropper extends WinElement {
  static override styles = [cropCss];
  static override template = `<img part="image" alt="" draggable="false">
<svg class="mask" part="mask" aria-hidden="true"><path></path></svg>
<div class="region" part="crop-region" tabindex="0" role="group" aria-roledescription="裁剪区域"><div class="grid"></div></div>
${HANDLES.map((h) => `<div class="thumb" part="thumb" data-h="${h}" tabindex="0" role="button" aria-label="${HANDLE_LABEL[h]}裁剪手柄"></div>`).join('')}
<div class="empty" part="placeholder">未加载图像</div>`;
  static override props: PropDefs = {
    src: { type: String },
    aspectRatio: { type: String, attribute: 'aspect-ratio' },
    cropShape: { type: String, attribute: 'crop-shape', reflect: true, default: 'rectangular' },
    thumbPlacement: { type: String, attribute: 'thumb-placement', reflect: true, default: 'all' },
    minCropSize: { type: Number, attribute: 'min-crop-size', default: 40 },
  };
  declare src: string;
  declare aspectRatio: string;
  declare cropShape: 'rectangular' | 'circular';
  declare thumbPlacement: 'all' | 'corners';
  declare minCropSize: number;

  private img!: HTMLImageElement;
  private natural = { w: 0, h: 0 };
  private rect: CropRect = { x: 0, y: 0, width: 0, height: 0 };
  private view = { x: 0, y: 0, scale: 1 };
  private ro: ResizeObserver | null = null;

  static {
    this.define('win-image-cropper');
  }

  get cropRect(): CropRect {
    return { ...this.rect };
  }
  set cropRect(r: CropRect) {
    this.rect = this.constrain({ ...r }, 'move');
    this.layout();
    this.emitChanged();
  }

  protected override firstConnected(): void {
    this.img = this.$<HTMLImageElement>('img');
    this.img.addEventListener('load', () => {
      this.natural = { w: this.img.naturalWidth, h: this.img.naturalHeight };
      this.reset();
      this.toggleAttr('data-ready', this.natural.w > 0);
    });
    this.img.addEventListener('error', () => this.toggleAttr('data-ready', false));
    this.ro = new ResizeObserver(() => this.layout());
    this.ro.observe(this);
    this.$('.region').addEventListener('pointerdown', (ev) => this.startDrag(ev, 'move'));
    this.$('.region').addEventListener('keydown', (ev) => this.onKey(ev, 'move'));
    for (const t of this.$$<HTMLElement>('.thumb')) {
      const h = t.dataset.h as Handle;
      t.addEventListener('pointerdown', (ev) => this.startDrag(ev, h));
      t.addEventListener('keydown', (ev) => this.onKey(ev, h));
    }
  }

  protected override connected(): void {
    this.ro?.observe(this);
  }
  protected override disconnected(): void {
    this.ro?.disconnect();
  }

  protected override updated(changed: Set<string>): void {
    if (changed.has('src')) {
      if (this.src) this.img.src = this.src;
      else {
        this.img.removeAttribute('src');
        this.toggleAttr('data-ready', false);
      }
    }
    if ((changed.has('aspectRatio') || changed.has('cropShape')) && this.natural.w) this.reset();
    else this.layout();
  }

  private ratio(): number | null {
    if (this.cropShape === 'circular') return 1;
    const a = (this.aspectRatio ?? '').trim();
    if (!a) return null;
    const m = /^(\d+(?:\.\d+)?)\s*[:/x]\s*(\d+(?:\.\d+)?)$/.exec(a);
    const r = m ? Number(m[1]) / Number(m[2]) : Number(a);
    return Number.isFinite(r) && r > 0 ? r : null;
  }

  reset(): void {
    const { w, h } = this.natural;
    if (!w || !h) return;
    const r = this.ratio();
    let cw = w * 0.8;
    let ch = h * 0.8;
    if (r) {
      if (cw / ch > r) cw = ch * r;
      else ch = cw / r;
    }
    this.rect = { x: (w - cw) / 2, y: (h - ch) / 2, width: cw, height: ch };
    this.layout();
    this.emitChanged();
  }

  private layout(): void {
    const { w, h } = this.natural;
    if (!w || !h || !this.isConnected) return;
    const W = this.clientWidth;
    const H = this.clientHeight;
    const scale = Math.min(W / w, H / h);
    const dw = w * scale;
    const dh = h * scale;
    this.view = { x: (W - dw) / 2, y: (H - dh) / 2, scale };
    Object.assign(this.img.style, {
      left: `${this.view.x}px`,
      top: `${this.view.y}px`,
      width: `${dw}px`,
      height: `${dh}px`,
    });
    const r = this.toView(this.rect);
    const region = this.$('.region');
    Object.assign(region.style, { left: `${r.x}px`, top: `${r.y}px`, width: `${r.width}px`, height: `${r.height}px` });
    region.style.borderRadius = this.cropShape === 'circular' ? '50%' : '0';
    const outer = `M${this.view.x} ${this.view.y}h${dw}v${dh}h${-dw}Z`;
    const inner =
      this.cropShape === 'circular'
        ? `M${r.x} ${r.y + r.height / 2}a${r.width / 2} ${r.height / 2} 0 1 0 ${r.width} 0a${r.width / 2} ${r.height / 2} 0 1 0 ${-r.width} 0Z`
        : `M${r.x} ${r.y}h${r.width}v${r.height}h${-r.width}Z`;
    this.$('svg.mask path').setAttribute('d', `${outer}${inner}`);
    const pos: Record<Exclude<Handle, 'move'>, [number, number]> = {
      nw: [r.x, r.y],
      n: [r.x + r.width / 2, r.y],
      ne: [r.x + r.width, r.y],
      e: [r.x + r.width, r.y + r.height / 2],
      se: [r.x + r.width, r.y + r.height],
      s: [r.x + r.width / 2, r.y + r.height],
      sw: [r.x, r.y + r.height],
      w: [r.x, r.y + r.height / 2],
    };
    for (const t of this.$$<HTMLElement>('.thumb')) {
      const [x, y] = pos[t.dataset.h as Exclude<Handle, 'move'>];
      t.style.left = `${x}px`;
      t.style.top = `${y}px`;
    }
    region.setAttribute(
      'aria-label',
      `裁剪区域 ${Math.round(this.rect.width)}×${Math.round(this.rect.height)}，位置 ${Math.round(this.rect.x)},${Math.round(this.rect.y)}`,
    );
  }

  private toView(r: CropRect): CropRect {
    const { x, y, scale } = this.view;
    return { x: x + r.x * scale, y: y + r.y * scale, width: r.width * scale, height: r.height * scale };
  }

  private constrain(r: CropRect, handle: Handle): CropRect {
    const { w, h } = this.natural;
    const min = Math.max(1, Math.min(this.minCropSize, w, h));
    const ratio = this.ratio();
    if (handle === 'move') {
      r.width = Math.min(Math.max(min, r.width), w);
      r.height = Math.min(Math.max(min, r.height), h);
      r.x = Math.min(Math.max(0, r.x), w - r.width);
      r.y = Math.min(Math.max(0, r.y), h - r.height);
      return r;
    }
    let left = r.x;
    let top = r.y;
    let right = r.x + r.width;
    let bottom = r.y + r.height;
    left = Math.max(0, left);
    top = Math.max(0, top);
    right = Math.min(w, right);
    bottom = Math.min(h, bottom);
    if (right - left < min) {
      if (handle.includes('w')) left = right - min;
      else right = left + min;
    }
    if (bottom - top < min) {
      if (handle.includes('n')) top = bottom - min;
      else bottom = top + min;
    }
    if (ratio) {
      let cw = right - left;
      let ch = bottom - top;
      const horizontalDriven = handle === 'e' || handle === 'w';
      const verticalDriven = handle === 'n' || handle === 's';
      if (horizontalDriven) ch = cw / ratio;
      else if (verticalDriven) cw = ch * ratio;
      else if (cw / ch > ratio) cw = ch * ratio;
      else ch = cw / ratio;
      const maxW = handle.includes('w') ? right : w - left;
      const maxH = handle.includes('n') ? bottom : h - top;
      if (cw > maxW) {
        cw = maxW;
        ch = cw / ratio;
      }
      if (ch > maxH) {
        ch = maxH;
        cw = ch * ratio;
      }
      if (handle.includes('w')) left = right - cw;
      else right = left + cw;
      if (handle.includes('n')) top = bottom - ch;
      else if (horizontalDriven) {
        const cy = (r.y + r.y + r.height) / 2;
        top = Math.min(Math.max(0, cy - ch / 2), h - ch);
      }
      bottom = top + ch;
      if (verticalDriven) {
        const cx = (r.x + r.x + r.width) / 2;
        left = Math.min(Math.max(0, cx - cw / 2), w - cw);
        right = left + cw;
      }
    }
    return { x: left, y: top, width: right - left, height: bottom - top };
  }

  private apply(handle: Handle, dx: number, dy: number, base: CropRect): void {
    const r = { ...base };
    if (handle === 'move') {
      r.x += dx;
      r.y += dy;
    } else {
      if (handle.includes('w')) {
        r.x += dx;
        r.width -= dx;
      }
      if (handle.includes('e')) r.width += dx;
      if (handle.includes('n')) {
        r.y += dy;
        r.height -= dy;
      }
      if (handle.includes('s')) r.height += dy;
    }
    this.rect = this.constrain(r, handle);
    this.layout();
  }

  private startDrag(ev: PointerEvent, handle: Handle): void {
    if (ev.button !== 0 || !this.natural.w) return;
    ev.stopPropagation();
    const target = ev.currentTarget as HTMLElement;
    requestAnimationFrame(() => target.focus({ preventScroll: true, focusVisible: false } as FocusOptions));
    target.setPointerCapture(ev.pointerId);
    target.toggleAttribute('data-active', true);
    this.toggleAttribute('data-dragging', true);
    const base = { ...this.rect };
    const sx = ev.clientX;
    const sy = ev.clientY;
    const move = (e: PointerEvent) =>
      this.apply(handle, (e.clientX - sx) / this.view.scale, (e.clientY - sy) / this.view.scale, base);
    const up = () => {
      target.removeEventListener('pointermove', move);
      target.removeEventListener('pointerup', up);
      target.removeEventListener('pointercancel', up);
      target.removeAttribute('data-active');
      this.removeAttribute('data-dragging');
      this.emitChanged();
    };
    target.addEventListener('pointermove', move);
    target.addEventListener('pointerup', up);
    target.addEventListener('pointercancel', up);
  }

  private onKey(ev: KeyboardEvent, handle: Handle): void {
    const step = ev.shiftKey ? 10 : 1;
    const d: Record<string, [number, number]> = {
      ArrowLeft: [-step, 0],
      ArrowRight: [step, 0],
      ArrowUp: [0, -step],
      ArrowDown: [0, step],
    };
    const v = d[ev.key];
    if (!v) return;
    ev.preventDefault();
    this.apply(handle, v[0], v[1], { ...this.rect });
    this.emitChanged();
  }

  private emitChanged(): void {
    this.emit('cropchanged', { cropRect: this.cropRect });
  }

  getCroppedCanvas(maxSize = 0): HTMLCanvasElement {
    const r = this.rect;
    const scale = maxSize > 0 ? Math.min(1, maxSize / Math.max(r.width, r.height)) : 1;
    const c = document.createElement('canvas');
    c.width = Math.max(1, Math.round(r.width * scale));
    c.height = Math.max(1, Math.round(r.height * scale));
    const g = c.getContext('2d');
    if (!g || !this.natural.w) return c;
    if (this.cropShape === 'circular') {
      g.beginPath();
      g.ellipse(c.width / 2, c.height / 2, c.width / 2, c.height / 2, 0, 0, Math.PI * 2);
      g.clip();
    }
    g.drawImage(this.img, r.x, r.y, r.width, r.height, 0, 0, c.width, c.height);
    return c;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-image-cropper': WinImageCropper;
  }
}
