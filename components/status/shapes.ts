import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';

export function resolvePaint(v: string | null | undefined): string {
  const s = (v ?? '').trim();
  if (!s) return 'none';
  if (/^[A-Z][A-Za-z0-9]+$/.test(s) && /(Color|Brush|Fill|Stroke)/.test(s)) {
    const key = s
      .replace(/Brush$/, '')
      .replace(/([a-z0-9])([A-Z])/g, '$1-$2')
      .replace(/([A-Z]+)([A-Z][a-z])/g, '$1-$2')
      .toLowerCase();
    return `var(--w-${key})`;
  }
  return s;
}

const shapeCss = css`
:host {
  display: inline-block;
  position: relative;
  vertical-align: middle;
  line-height: 0;
  --_t: 1px;
}
svg { display: block; overflow: visible; }
.shape {
  fill: var(--_fill, none);
  stroke: var(--_stroke, none);
  stroke-width: var(--_t);
  stroke-miterlimit: 10;
  vector-effect: non-scaling-stroke;
  transition: fill var(--w-duration-faster) linear, stroke var(--w-duration-faster) linear;
}
:host([fill-rule="even-odd"]) .shape { fill-rule: evenodd; }
`;

abstract class ShapeBase extends WinElement {
  static override styles = [shapeCss];
  static override props: PropDefs = {
    fill: { type: String },
    stroke: { type: String },
    strokeWidth: { type: Number, attribute: 'stroke-width', default: 1 },
    strokeDashArray: { type: String, attribute: 'stroke-dash-array' },
    strokeDashOffset: { type: Number, attribute: 'stroke-dash-offset', default: 0 },
    strokeLineJoin: { type: String, attribute: 'stroke-line-join', default: 'miter' },
    strokeLineCap: { type: String, attribute: 'stroke-line-cap', default: 'flat' },
    stretch: { type: String, reflect: true, default: '' },
    width: { type: Number, default: 0 },
    height: { type: Number, default: 0 },
  };
  declare width: number;
  declare height: number;
  declare fill: string;
  declare stroke: string;
  declare strokeWidth: number;
  declare strokeDashArray: string;
  declare strokeDashOffset: number;
  declare strokeLineJoin: string;
  declare strokeLineCap: string;
  declare stretch: '' | 'none' | 'fill' | 'uniform' | 'uniform-to-fill';

  private sized = { w: false, h: false };

  protected get shape(): SVGGraphicsElement {
    return this.$<SVGGraphicsElement>('.shape');
  }

  protected override firstConnected(): void {
    if (!this.hasAttribute('role')) this.setAttribute('aria-hidden', 'true');
  }

  protected override updated(changed: Set<string>, _first = false): void {
    const s = this.shape;
    if (changed.has('width')) {
      if (this.width > 0) this.style.width = `${this.width}px`;
      else if (this.sized.w) this.style.removeProperty('width');
      this.sized.w = this.width > 0;
    }
    if (changed.has('height')) {
      if (this.height > 0) this.style.height = `${this.height}px`;
      else if (this.sized.h) this.style.removeProperty('height');
      this.sized.h = this.height > 0;
    }
    this.style.setProperty('--_fill', resolvePaint(this.fill));
    this.style.setProperty('--_stroke', resolvePaint(this.stroke));
    this.style.setProperty('--_t', `${Math.max(0, this.strokeWidth)}px`);
    if (changed.has('strokeDashArray') || changed.has('strokeWidth')) {
      const t = Math.max(0.0001, this.strokeWidth);
      const parts = (this.strokeDashArray ?? '')
        .split(/[\s,]+/)
        .filter(Boolean)
        .map((n) => Number(n) * t);
      if (parts.length) s.setAttribute('stroke-dasharray', parts.join(' '));
      else s.removeAttribute('stroke-dasharray');
    }
    s.setAttribute('stroke-dashoffset', String(this.strokeDashOffset * this.strokeWidth));
    s.setAttribute(
      'stroke-linejoin',
      this.strokeLineJoin === 'round' ? 'round' : this.strokeLineJoin === 'bevel' ? 'bevel' : 'miter',
    );
    s.setAttribute(
      'stroke-linecap',
      this.strokeLineCap === 'round' ? 'round' : this.strokeLineCap === 'square' ? 'square' : 'butt',
    );
    this.layout();
  }

  protected abstract layout(): void;
}

export class WinShapeEllipse extends ShapeBase {
  static override template = `<svg width="100%" height="100%" part="svg"><ellipse class="shape" part="shape"/></svg>`;
  static {
    this.define('win-shape-ellipse');
  }
  protected override layout(): void {
    const e = this.shape;
    const h = this.strokeWidth / 2;
    e.style.cssText = `cx:50%;cy:50%;rx:max(0px, calc(50% - ${h}px));ry:max(0px, calc(50% - ${h}px))`;
    this.$('svg').style.cssText = 'width:100%;height:100%';
  }
}

export class WinShapeRectangle extends ShapeBase {
  static override template = `<svg width="100%" height="100%" part="svg"><rect class="shape" part="shape"/></svg>`;
  static override props: PropDefs = {
    radiusX: { type: Number, attribute: 'radius-x', default: 0 },
    radiusY: { type: Number, attribute: 'radius-y', default: 0 },
  };
  declare radiusX: number;
  declare radiusY: number;
  static {
    this.define('win-shape-rectangle');
  }
  protected override layout(): void {
    const r = this.shape;
    const h = this.strokeWidth / 2;
    r.style.cssText = `x:${h}px;y:${h}px;width:max(0px, calc(100% - ${2 * h}px));height:max(0px, calc(100% - ${2 * h}px));rx:${this.radiusX}px;ry:${this.radiusY || this.radiusX}px`;
  }
}

abstract class GeometryShape extends ShapeBase {
  protected abstract applyGeometry(): void;

  protected override layout(): void {
    this.applyGeometry();
    const svg = this.$<SVGSVGElement>('svg');
    const stretch = this.stretch || 'none';
    requestAnimationFrame(() => {
      let b: DOMRect | SVGRect;
      try {
        b = this.shape.getBBox();
      } catch {
        return;
      }
      const t = this.strokeWidth;
      if (stretch === 'none') {
        svg.removeAttribute('viewBox');
        svg.setAttribute('width', String(Math.max(0, b.x + b.width + t / 2)));
        svg.setAttribute('height', String(Math.max(0, b.y + b.height + t / 2)));
        this.style.removeProperty('--_w');
      } else {
        svg.setAttribute(
          'viewBox',
          `${b.x - t / 2} ${b.y - t / 2} ${Math.max(1, b.width + t)} ${Math.max(1, b.height + t)}`,
        );
        svg.setAttribute('width', '100%');
        svg.setAttribute('height', '100%');
        svg.setAttribute(
          'preserveAspectRatio',
          stretch === 'fill' ? 'none' : stretch === 'uniform-to-fill' ? 'xMidYMid slice' : 'xMidYMid meet',
        );
      }
    });
  }
}

export class WinShapeLine extends GeometryShape {
  static override template = `<svg part="svg"><line class="shape" part="shape"/></svg>`;
  static override props: PropDefs = {
    x1: { type: Number, default: 0 },
    y1: { type: Number, default: 0 },
    x2: { type: Number, default: 0 },
    y2: { type: Number, default: 0 },
  };
  declare x1: number;
  declare y1: number;
  declare x2: number;
  declare y2: number;
  static {
    this.define('win-shape-line');
  }
  protected override applyGeometry(): void {
    const l = this.shape;
    l.setAttribute('x1', String(this.x1));
    l.setAttribute('y1', String(this.y1));
    l.setAttribute('x2', String(this.x2));
    l.setAttribute('y2', String(this.y2));
  }
}

const pointsAttr = (p: string) =>
  (p ?? '')
    .trim()
    .split(/\s+/)
    .map((pair) => pair.split(',').map(Number).join(','))
    .join(' ');

export class WinShapePolyline extends GeometryShape {
  static override template = `<svg part="svg"><polyline class="shape" part="shape"/></svg>`;
  static override props: PropDefs = { points: { type: String } };
  declare points: string;
  static {
    this.define('win-shape-polyline');
  }
  protected override applyGeometry(): void {
    this.shape.setAttribute('points', pointsAttr(this.points));
  }
}

export class WinShapePolygon extends GeometryShape {
  static override template = `<svg part="svg"><polygon class="shape" part="shape"/></svg>`;
  static override props: PropDefs = { points: { type: String } };
  declare points: string;
  static {
    this.define('win-shape-polygon');
  }
  protected override applyGeometry(): void {
    this.shape.setAttribute('points', pointsAttr(this.points));
  }
}

export class WinShapePath extends GeometryShape {
  static override template = `<svg part="svg"><path class="shape" part="shape"/></svg>`;
  static override props: PropDefs = { data: { type: String } };
  declare data: string;
  static {
    this.define('win-shape-path');
  }
  protected override applyGeometry(): void {
    let d = (this.data ?? '').trim();
    const m = /^F\s*([01])\s*/i.exec(d);
    if (m) {
      this.shape.setAttribute('fill-rule', m[1] === '1' ? 'nonzero' : 'evenodd');
      d = d.slice(m[0].length);
    }
    this.shape.setAttribute('d', d);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-shape-ellipse': WinShapeEllipse;
    'win-shape-rectangle': WinShapeRectangle;
    'win-shape-line': WinShapeLine;
    'win-shape-polyline': WinShapePolyline;
    'win-shape-polygon': WinShapePolygon;
    'win-shape-path': WinShapePath;
  }
}
