import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { animate, easings, motionEnabled } from '../../motion/animate.ts';

const marqueeCss = css`
:host {
  display: block;
  position: relative;
  overflow: hidden;
  white-space: nowrap;
  contain: paint;
}
:host([direction="up"]), :host([direction="down"]) { white-space: normal; }
.track { display: inline-flex; gap: var(--w-marquee-gap, 48px); will-change: transform; }
:host([direction="up"]) .track, :host([direction="down"]) .track { display: flex; flex-direction: column; }
.copy { display: inline-block; }
:host(:not([behavior="looping"])) .copy.dup { display: none; }
:host([data-static]) .track { text-overflow: ellipsis; }
`;

export class WinMarquee extends WinElement {
  static override styles = [marqueeCss];
  static override template = `<div class="track" part="track"><span class="copy" part="content"><slot></slot></span><span class="copy dup" aria-hidden="true"></span></div>`;
  static override props: PropDefs = {
    behavior: { type: String, reflect: true, default: 'ticker' },
    direction: { type: String, reflect: true, default: 'left' },
    speed: { type: Number, default: 48 },
    repeat: { type: Number, default: 0 },
    pauseOnHover: { type: Boolean, attribute: 'pause-on-hover', default: true },
    isPlaying: { type: Boolean, attribute: 'is-playing', default: true },
  };
  declare behavior: 'ticker' | 'looping' | 'bouncing';
  declare direction: 'left' | 'right' | 'up' | 'down';
  declare speed: number;
  declare repeat: number;
  declare pauseOnHover: boolean;
  declare isPlaying: boolean;

  private anim: Animation | null = null;
  private ro: ResizeObserver | null = null;
  private restartQueued = false;

  static {
    this.define('win-marquee');
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'marquee');
    this.$('slot').addEventListener('slotchange', () => this.queueRestart());
    this.ro = new ResizeObserver(() => this.queueRestart());
    this.ro.observe(this);
    this.ro.observe(this.$('.copy'));
    this.addEventListener('pointerenter', () => {
      if (this.pauseOnHover) this.anim?.pause();
    });
    this.addEventListener('pointerleave', () => {
      if (this.pauseOnHover && this.isPlaying) this.anim?.play();
    });
  }

  protected override connected(): void {
    if (this.ro) {
      this.ro.observe(this);
      this.ro.observe(this.$('.copy'));
    }
  }

  protected override disconnected(): void {
    this.ro?.disconnect();
    this.anim?.cancel();
  }

  protected override updated(): void {
    this.queueRestart();
  }

  start(): void {
    this.isPlaying = true;
    this.restart();
  }

  stop(): void {
    this.isPlaying = false;
    this.anim?.cancel();
    this.anim = null;
  }

  private queueRestart(): void {
    if (this.restartQueued) return;
    this.restartQueued = true;
    requestAnimationFrame(() => {
      this.restartQueued = false;
      this.restart();
    });
  }

  private restart(): void {
    if (!this.isInitialized) return;
    const track = this.$('.track');
    const copy = this.$('.copy');
    const dup = this.$('.dup');
    this.anim?.cancel();
    this.anim = null;
    if (this.behavior === 'looping') {
      dup.innerHTML = '';
      for (const n of Array.from(this.childNodes)) dup.append(n.cloneNode(true));
    } else dup.innerHTML = '';
    const vertical = this.direction === 'up' || this.direction === 'down';
    const box = vertical ? this.clientHeight : this.clientWidth;
    const content = vertical ? copy.offsetHeight : copy.offsetWidth;
    const gap = Number.parseFloat(getComputedStyle(track).gap) || 0;
    if (!this.isPlaying || !motionEnabled() || !box || !content) {
      this.toggleAttr('data-static', true);
      track.style.transform = '';
      return;
    }
    this.toggleAttr('data-static', false);
    const axis = vertical ? 'translateY' : 'translateX';
    const reverse = this.direction === 'right' || this.direction === 'down';
    const pxPerMs = Math.max(1, this.speed) / 1000;
    let frames: Keyframe[];
    let distance: number;
    let alternate = false;
    switch (this.behavior) {
      case 'looping': {
        distance = content + gap;
        frames = reverse
          ? [{ transform: `${axis}(${-distance}px)` }, { transform: `${axis}(0px)` }]
          : [{ transform: `${axis}(0px)` }, { transform: `${axis}(${-distance}px)` }];
        break;
      }
      case 'bouncing': {
        const overflow = content - box;
        const from = 0;
        const to = overflow > 0 ? -overflow : box - content;
        distance = Math.abs(to - from);
        if (distance < 1) {
          this.toggleAttr('data-static', true);
          return;
        }
        alternate = true;
        frames = reverse
          ? [{ transform: `${axis}(${to}px)` }, { transform: `${axis}(${from}px)` }]
          : [{ transform: `${axis}(${from}px)` }, { transform: `${axis}(${to}px)` }];
        break;
      }
      default: {
        distance = box + content;
        frames = reverse
          ? [{ transform: `${axis}(${-content}px)` }, { transform: `${axis}(${box}px)` }]
          : [{ transform: `${axis}(${box}px)` }, { transform: `${axis}(${-content}px)` }];
      }
    }
    const duration = distance / pxPerMs;
    this.anim = animate(track, frames, {
      duration,
      easing: alternate ? easings.standard : 'linear',
      iterations: this.repeat > 0 ? this.repeat * (alternate ? 2 : 1) : Number.POSITIVE_INFINITY,
      direction: alternate ? 'alternate' : 'normal',
      fill: 'both',
    });
    if (this.repeat > 0) {
      this.anim.finished.then(
        () => this.emit('marqueecompleted'),
        () => undefined,
      );
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-marquee': WinMarquee;
  }
}
