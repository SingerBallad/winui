import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { parseIcon } from '../../base/icons.ts';
import { animate, durations } from '../../motion/animate.ts';

const CJK = /[ᄀ-ᇿ⺀-鿿가-힯豈-﫿぀-ヿ\u{20000}-\u{2fa1f}]/u;

export function initialsFromName(name: string): string {
  let s = (name ?? '').replace(/[([{<][^)\]}>]*[)\]}>]/g, ' ').trim();
  if (!s) return '';
  if (CJK.test(s)) {
    const first = [...s.replace(/\s+/g, '')][0];
    return first ?? '';
  }
  s = s.replace(/[^\p{L}\p{N}\s'-]/gu, ' ');
  const words = s.split(/\s+/).filter((w) => /\p{L}/u.test(w));
  if (!words.length) return '';
  const firstLetter = (w: string) => ([...w].find((c) => /\p{L}/u.test(c)) ?? '').toUpperCase();
  const a = firstLetter(words[0]!);
  const b = words.length > 1 ? firstLetter(words[words.length - 1]!) : '';
  return (a + b).slice(0, 4);
}

const pictureCss = css`
:host {
  display: inline-block;
  position: relative;
  width: 96px;
  height: 96px;
  flex: none;
  vertical-align: middle;
  color: var(--w-text-fill-color-primary);
  user-select: none;
}
.root {
  position: absolute;
  inset: 0;
  container-type: size;
}
.ellipse {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background: var(--w-person-picture-background, var(--w-control-alt-fill-color-quarternary));
  border: 1px solid var(--w-card-stroke-color-default);
}
.initials {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  font-family: var(--w-font-family-display);
  font-weight: 600;
  font-size: max(1px, 42cqmin);
  line-height: 1;
  letter-spacing: 0;
  white-space: nowrap;
  overflow: hidden;
}
.initials-text, .badge-text { display: block; text-box: trim-both cap alphabetic; }
@supports not (text-box: trim-both cap alphabetic) {
  .initials-text, .badge-text { translate: 0 -0.065em; }
}
.initials.glyph { font-family: var(--w-font-family-icon); font-weight: normal; }
.initials.glyph .initials-text { text-box: normal; translate: none; }
.photo {
  position: absolute;
  inset: 0;
  border-radius: 50%;
  background-position: center;
  background-size: cover;
  background-repeat: no-repeat;
  opacity: 0;
}
:host([data-w-has-photo]) .photo { opacity: 1; }
:host([data-w-has-photo]) .initials { visibility: hidden; }

.badge {
  position: absolute;
  top: -4px;
  right: -4px;
  height: 50cqmin;
  min-width: 50cqmin;
  padding: 0 5cqmin;
  border-radius: 25cqmin;
  translate: calc(50% - 25cqmin) 0;
  white-space: nowrap;
  display: none;
  align-items: center;
  justify-content: center;
  background: var(--w-accent-fill-color-default);
  background-position: center;
  background-size: cover;
  border: 2px solid var(--w-person-picture-badge-stroke, transparent);
  box-sizing: border-box;
  color: var(--w-text-on-accent-fill-color-primary);
  font-family: var(--w-font-family-text);
  font-weight: 600;
  font-size: max(1px, 30cqmin);
  line-height: 1;
  overflow: hidden;
}
:host([data-w-badge]) .badge { display: flex; }
.badge .w-icon { font-size: max(1px, 30cqmin); font-weight: normal; }
`;

export class WinPersonPicture extends WinElement {
  static override styles = [pictureCss];
  static override template = `<div class="root" part="root"><div class="ellipse" part="ellipse"></div><span class="initials" part="initials"><span class="initials-text"></span></span><div class="photo" part="photo"></div><div class="badge" part="badge" aria-hidden="true"></div></div>`;
  static override props: PropDefs = {
    displayName: { type: String, attribute: 'display-name' },
    initials: { type: String },
    profilePicture: { type: String, attribute: 'profile-picture' },
    isGroup: { type: Boolean, attribute: 'is-group' },
    badgeNumber: { type: Number, attribute: 'badge-number', default: 0 },
    badgeGlyph: { type: String, attribute: 'badge-glyph' },
    badgeImageSource: { type: String, attribute: 'badge-image-source' },
    badgeText: { type: String, attribute: 'badge-text' },
    size: { type: Number, default: 0 },
  };
  declare displayName: string;
  declare initials: string;
  declare profilePicture: string;
  declare isGroup: boolean;
  declare badgeNumber: number;
  declare badgeGlyph: string;
  declare badgeImageSource: string;
  declare badgeText: string;
  declare size: number;

  private loadToken = 0;
  private sizedBySize = false;

  static {
    this.define('win-person-picture');
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'img');
  }

  protected override updated(changed: Set<string>): void {
    if (changed.has('size')) {
      if (this.size > 0) {
        this.style.width = `${this.size}px`;
        this.style.height = `${this.size}px`;
        this.sizedBySize = true;
      } else if (this.sizedBySize) {
        this.style.removeProperty('width');
        this.style.removeProperty('height');
        this.sizedBySize = false;
      }
    }
    if (changed.has('displayName') || changed.has('initials') || changed.has('isGroup')) this.syncInitials();
    if (changed.has('profilePicture')) this.loadPhoto();
    if (['badgeNumber', 'badgeGlyph', 'badgeImageSource', 'badgeText', 'displayName'].some((k) => changed.has(k))) {
      this.syncBadge();
    }
  }

  private syncInitials(): void {
    const el = this.$('.initials');
    const textEl = this.$('.initials-text');
    let text: string;
    let glyph = false;
    if (this.isGroup) {
      text = '';
      glyph = true;
    } else {
      text = this.initials || initialsFromName(this.displayName);
      if (!text) {
        text = '';
        glyph = true;
      }
    }
    textEl.textContent = text;
    el.classList.toggle('glyph', glyph);
  }

  private loadPhoto(): void {
    const token = ++this.loadToken;
    const src = (this.profilePicture ?? '').trim();
    const photo = this.$('.photo');
    if (!src) {
      this.removeAttribute('data-w-has-photo');
      photo.style.backgroundImage = '';
      return;
    }
    const img = new Image();
    img.decoding = 'async';
    img.onload = () => {
      if (token !== this.loadToken) return;
      photo.style.backgroundImage = `url("${src.replaceAll('"', '%22')}")`;
      this.setAttribute('data-w-has-photo', '');
      animate(photo, [{ opacity: 0 }, { opacity: 1 }], { duration: durations.fast, easing: 'linear' });
    };
    img.onerror = () => {
      if (token !== this.loadToken) return;
      this.removeAttribute('data-w-has-photo');
      photo.style.backgroundImage = '';
      this.emit('imagefailed', { source: src }, { bubbles: false });
    };
    img.src = src;
  }

  private syncBadge(): void {
    const badge = this.$('.badge');
    const n = Math.trunc(this.badgeNumber || 0);
    let show = false;
    badge.style.backgroundImage = '';
    badge.textContent = '';
    if (this.badgeImageSource) {
      badge.style.backgroundImage = `url("${this.badgeImageSource.replaceAll('"', '%22')}")`;
      show = true;
    } else if (n > 0) {
      const span = document.createElement('span');
      span.className = 'badge-text';
      span.textContent = n <= 99 ? String(n) : '99+';
      badge.append(span);
      show = true;
    } else if (this.badgeGlyph) {
      const p = parseIcon(this.badgeGlyph);
      const span = document.createElement('span');
      span.className = 'w-icon';
      span.textContent = p.kind === 'glyph' || p.kind === 'symbol' ? p.value : this.badgeGlyph;
      badge.append(span);
      show = true;
    }
    this.toggleAttribute('data-w-badge', show);
    const label = [
      this.displayName || (this.isGroup ? 'Group' : ''),
      show ? this.badgeText || (n > 0 ? String(n) : '') : '',
    ]
      .filter(Boolean)
      .join(', ');
    if (label) this.setAttribute('aria-label', label);
    else this.removeAttribute('aria-label');
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-person-picture': WinPersonPicture;
  }
}
