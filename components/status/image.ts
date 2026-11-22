import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { animate, durations } from '../../motion/animate.ts';

const imageCss = css`
:host {
  display: inline-block;
  position: relative;
  vertical-align: middle;
  overflow: hidden;
  line-height: 0;
  user-select: none;
  -webkit-user-select: none;
}
img {
  display: block;
  width: 100%;
  height: 100%;
  max-width: none;
  object-fit: contain;
  object-position: center;
  -webkit-user-drag: none;
}
:host([stretch="none"]) img { object-fit: none; }
:host([stretch="fill"]) img { object-fit: fill; }
:host([stretch="uniform-to-fill"]) img { object-fit: cover; }
:host(:not([data-w-loaded])) img { visibility: hidden; }
:host(:not([data-w-loaded]):not([data-w-has-size])) img { position: absolute; }
.placeholder { display: none; position: absolute; inset: 0; line-height: normal; }
:host([data-w-failed]) .placeholder, :host([data-w-empty]) .placeholder { display: block; }
`;

export class WinImage extends WinElement {
  static override styles = [imageCss];
  static override template = `<img part="image" alt="" decoding="async" draggable="false"><div class="placeholder" part="placeholder"><slot name="placeholder"></slot></div>`;
  static override props: PropDefs = {
    source: { type: String },
    stretch: { type: String, reflect: true, default: 'uniform' },
    alt: { type: String },
  };
  declare source: string;
  declare stretch: 'none' | 'fill' | 'uniform' | 'uniform-to-fill';
  declare alt: string;

  private img!: HTMLImageElement;
  private token = 0;

  static {
    this.define('win-image');
  }

  get naturalSize(): { width: number; height: number } {
    return { width: this.img?.naturalWidth ?? 0, height: this.img?.naturalHeight ?? 0 };
  }

  protected override firstConnected(): void {
    this.img = this.$('img');
    this.img.addEventListener('load', () => {
      const t = this.token;
      if (!this.img.getAttribute('src')) return;
      void this.img
        .decode?.()
        .catch(() => undefined)
        .then(() => {
          if (t !== this.token) return;
          this.setAttribute('data-w-loaded', '');
          this.removeAttribute('data-w-failed');
          animate(this.img, [{ opacity: 0 }, { opacity: 1 }], { duration: durations.fast, easing: 'linear' });
          this.emit(
            'imageopened',
            { width: this.img.naturalWidth, height: this.img.naturalHeight },
            { bubbles: false },
          );
        });
    });
    this.img.addEventListener('error', () => {
      if (!this.img.getAttribute('src')) return;
      this.removeAttribute('data-w-loaded');
      this.setAttribute('data-w-failed', '');
      this.emit('imagefailed', { message: 'The image could not be loaded.', source: this.source }, { bubbles: false });
    });
  }

  protected override updated(changed: Set<string>): void {
    if (changed.has('alt')) {
      this.img.alt = this.alt ?? '';
      this.aria('role', this.alt ? 'img' : null);
      this.aria('aria-label', this.alt || null);
    }
    this.toggleAttribute('data-w-has-size', !!(this.style.width || this.style.height));
    if (changed.has('source')) {
      this.token++;
      this.removeAttribute('data-w-loaded');
      this.removeAttribute('data-w-failed');
      const src = (this.source ?? '').trim();
      this.toggleAttribute('data-w-empty', !src);
      if (src) this.img.src = src;
      else this.img.removeAttribute('src');
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-image': WinImage;
  }
}
