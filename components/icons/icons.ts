import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { symbolChar } from '../../base/icons.ts';

const iconCss = css`
:host {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 1em;
  height: 1em;
  font-size: 20px;
  line-height: 1;
  color: inherit;
  vertical-align: middle;
  user-select: none;
}
.glyph {
  font-family: var(--icon-font, var(--w-font-family-icon));
  font-size: 1em;
  font-style: normal;
  font-weight: normal;
  line-height: 1;
}
svg { width: 100%; height: 100%; fill: currentColor; overflow: visible; }
img { width: 100%; height: 100%; object-fit: contain; }
.mask { width: 100%; height: 100%; background: currentColor; -webkit-mask: var(--src) center / contain no-repeat; mask: var(--src) center / contain no-repeat; }
:host([mirrored]:dir(rtl)) .glyph, :host([mirrored]:dir(rtl)) svg { scale: -1 1; }
`;

abstract class IconBase extends WinElement {
  static override styles = [iconCss];
  static override props: PropDefs = {
    size: { type: Number, default: 0 },
    mirrored: { type: Boolean },
  };
  declare size: number;
  declare mirrored: boolean;

  protected override firstConnected(): void {
    if (!this.hasAttribute('role') && !this.hasAttribute('aria-label')) this.setAttribute('aria-hidden', 'true');
    else if (this.hasAttribute('aria-label')) this.setAttribute('role', 'img');
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('size')) {
      if (this.size > 0) this.style.fontSize = `${this.size}px`;
      else this.style.removeProperty('font-size');
    }
  }
}

export class WinFontIcon extends IconBase {
  static override template = `<span class="glyph" part="glyph"></span>`;
  static override props: PropDefs = {
    glyph: { type: String },
    fontFamily: { type: String, attribute: 'font-family' },
  };
  declare glyph: string;
  declare fontFamily: string;
  static {
    this.define('win-font-icon');
  }
  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    if (changed.has('glyph')) {
      let g = this.glyph;
      const hex = /^(?:&#x|u\+|0x|x|\\u)?([0-9a-f]{4,5});?$/i.exec(g);
      if (hex && g.length > 1) g = String.fromCodePoint(Number.parseInt(hex[1]!, 16));
      this.$('.glyph').textContent = g;
    }
    if (changed.has('fontFamily')) {
      if (this.fontFamily) this.style.setProperty('--icon-font', this.fontFamily);
      else this.style.removeProperty('--icon-font');
    }
  }
}

export class WinSymbolIcon extends IconBase {
  static override template = `<span class="glyph" part="glyph"></span>`;
  static override props: PropDefs = {
    symbol: { type: String },
  };
  declare symbol: string;
  static {
    this.define('win-symbol-icon');
  }
  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    if (changed.has('symbol')) this.$('.glyph').textContent = symbolChar(this.symbol) ?? '';
  }
}

export class WinPathIcon extends IconBase {
  static override template = `<svg part="svg" aria-hidden="true"><path></path></svg>`;
  static override props: PropDefs = {
    data: { type: String },
    viewBox: { type: String, attribute: 'view-box' },
  };
  declare data: string;
  declare viewBox: string;
  static {
    this.define('win-path-icon');
  }
  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    if (changed.has('data') || changed.has('viewBox')) {
      const svg = this.$<SVGSVGElement>('svg');
      const path = svg.querySelector('path')!;
      path.setAttribute('d', this.data ?? '');
      if (this.viewBox) svg.setAttribute('viewBox', this.viewBox);
      else
        requestAnimationFrame(() => {
          try {
            const b = path.getBBox();
            if (b.width || b.height) svg.setAttribute('viewBox', `${b.x} ${b.y} ${b.width || 1} ${b.height || 1}`);
          } catch {}
        });
    }
  }
}

export class WinBitmapIcon extends IconBase {
  static override template = `<span class="mask" part="image"></span><img part="img" alt="" hidden>`;
  static override props: PropDefs = {
    src: { type: String },
    monochrome: { type: Boolean, default: true },
  };
  declare src: string;
  declare monochrome: boolean;
  static {
    this.define('win-bitmap-icon');
  }
  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    const mask = this.$('.mask');
    const img = this.$<HTMLImageElement>('img');
    mask.style.setProperty('--src', this.src ? `url("${this.src.replaceAll('"', '%22')}")` : 'none');
    mask.hidden = !this.monochrome || !this.src;
    img.hidden = this.monochrome || !this.src;
    if (this.src) img.src = this.src;
    else img.removeAttribute('src');
  }
}

export class WinImageIcon extends IconBase {
  static override template = `<img part="img" alt="">`;
  static override props: PropDefs = {
    src: { type: String },
  };
  declare src: string;
  static {
    this.define('win-image-icon');
  }
  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    const img = this.$<HTMLImageElement>('img');
    img.hidden = !this.src;
    if (this.src) img.src = this.src;
    else img.removeAttribute('src');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-font-icon': WinFontIcon;
    'win-symbol-icon': WinSymbolIcon;
    'win-path-icon': WinPathIcon;
    'win-bitmap-icon': WinBitmapIcon;
    'win-image-icon': WinImageIcon;
  }
}
