import { WinElement, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css, focusRing } from '../../base/css.ts';
import { animate, durations, easings } from '../../motion/animate.ts';
import '../flyouts/flyout.ts';
import '../flyouts/menu-flyout.ts';
import './progress.ts';

const G = {
  play: '',
  pause: '',
  volume: '',
  mute: '',
  zoom: '',
  fullScreen: '',
  backToWindow: '',
  skipBack: '',
  skipForward: '',
  rate: '',
  repeatAll: '',
  repeatOne: '',
  stop: '',
  compact: '',
};

const RATES = [0.25, 0.5, 0.75, 1, 1.25, 1.5, 2];

export function formatMediaTime(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 0) seconds = 0;
  const s = Math.floor(seconds % 60);
  const m = Math.floor((seconds / 60) % 60);
  const h = Math.floor(seconds / 3600);
  const pad = (n: number) => String(n).padStart(2, '0');
  return h > 0 ? `${h}:${pad(m)}:${pad(s)}` : `${pad(m)}:${pad(s)}`;
}

class MtcSlider {
  value = 0;
  min = 0;
  max = 100;
  step = 1;
  private dragging = false;
  constructor(
    readonly el: HTMLElement,
    private readonly opts: {
      onInput: (v: number) => void;
      onCommit?: (v: number) => void;
      text: (v: number) => string;
      largeStep?: () => number;
    },
  ) {
    el.addEventListener('pointerdown', (e) => {
      if (e.button !== 0 || el.hasAttribute('aria-disabled')) return;
      el.setPointerCapture(e.pointerId);
      this.dragging = true;
      el.toggleAttribute('data-pressed', true);
      this.fromPointer(e);
    });
    el.addEventListener('pointermove', (e) => {
      if (this.dragging) this.fromPointer(e);
    });
    const end = () => {
      if (!this.dragging) return;
      this.dragging = false;
      el.removeAttribute('data-pressed');
      this.opts.onCommit?.(this.value);
    };
    el.addEventListener('pointerup', end);
    el.addEventListener('pointercancel', end);
    el.addEventListener('lostpointercapture', end);
    el.addEventListener('keydown', (e) => {
      const big = this.opts.largeStep?.() ?? this.step * 10;
      let v = this.value;
      switch (e.key) {
        case 'ArrowLeft':
        case 'ArrowDown':
          v -= this.step;
          break;
        case 'ArrowRight':
        case 'ArrowUp':
          v += this.step;
          break;
        case 'PageDown':
          v -= big;
          break;
        case 'PageUp':
          v += big;
          break;
        case 'Home':
          v = this.min;
          break;
        case 'End':
          v = this.max;
          break;
        default:
          return;
      }
      e.preventDefault();
      e.stopPropagation();
      this.set(v, true);
      this.opts.onCommit?.(this.value);
    });
  }

  get isDragging(): boolean {
    return this.dragging;
  }

  private fromPointer(e: PointerEvent): void {
    const r = this.el.getBoundingClientRect();
    const p = (e.clientX - r.left - 9) / Math.max(1, r.width - 18);
    this.set(this.min + Math.min(1, Math.max(0, p)) * (this.max - this.min), true);
  }

  set(v: number, user = false): void {
    const range = this.max - this.min;
    v = Math.min(this.max, Math.max(this.min, v));
    this.value = v;
    const p = range > 0 ? (v - this.min) / range : 0;
    this.el.style.setProperty('--_p', String(p));
    this.el.setAttribute('aria-valuemin', String(this.min));
    this.el.setAttribute('aria-valuemax', String(this.max));
    this.el.setAttribute('aria-valuenow', String(Math.round(v * 100) / 100));
    this.el.setAttribute('aria-valuetext', this.opts.text(v));
    if (user) this.opts.onInput(v);
  }

  setBuffered(p: number): void {
    this.el.style.setProperty('--_b', String(Math.min(1, Math.max(0, p))));
  }
}

const sliderCss = `
.wslider {
  position: relative;
  height: 32px;
  min-width: 80px;
  touch-action: none;
  outline: none;
  cursor: default;
  --_p: 0;
  --_b: 0;
}
.wslider .rail {
  position: absolute;
  left: 0; right: 0; top: 14px;
  height: 4px;
  border-radius: 2px;
  background: var(--w-control-strong-fill-color-default);
  overflow: hidden;
}
.wslider .buffered {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: calc(9px + var(--_b) * (100% - 18px));
  background: var(--w-media-buffered-fill, transparent);
}
.wslider .fill {
  position: absolute; left: 0; top: 0; bottom: 0;
  width: calc(9px + var(--_p) * (100% - 18px));
  border-radius: 2px;
  background: var(--w-accent-fill-color-default);
}
.wslider:hover .fill { background: var(--w-accent-fill-color-secondary); }
.wslider[data-pressed] .fill { background: var(--w-accent-fill-color-tertiary); }
.wslider .thumb {
  position: absolute;
  top: 7px;
  left: calc(var(--_p) * (100% - 18px));
  width: 18px; height: 18px;
}
.wslider .thumb::before {
  content: '';
  position: absolute;
  inset: -2px;
  border-radius: 50%;
  background: var(--w-control-solid-fill-color-default);
  border: 1px solid;
  border-color: var(--w-control-elevation-border);
  box-sizing: border-box;
}
.wslider .thumb .inner {
  position: absolute;
  left: 3px; top: 3px;
  width: 12px; height: 12px;
  border-radius: 50%;
  background: var(--w-accent-fill-color-default);
  transform: scale(0.86);
  transition: transform var(--w-duration-fast) var(--w-ease-decelerate);
}
.wslider:hover .thumb .inner { transform: scale(1.167); background: var(--w-accent-fill-color-secondary); transition-duration: var(--w-duration-normal); }
.wslider[data-pressed] .thumb .inner { transform: scale(0.71); background: var(--w-accent-fill-color-tertiary); transition-duration: var(--w-duration-normal); }
.wslider[aria-disabled] { pointer-events: none; }
.wslider[aria-disabled] .fill, .wslider[aria-disabled] .thumb .inner { background: var(--w-accent-fill-color-disabled); }
.wslider:focus-visible .thumb::before { outline: 2px solid var(--w-focus-stroke-color-outer); outline-offset: 1px; box-shadow: 0 0 0 1px var(--w-focus-stroke-color-inner); }
`;

const SLIDER_HTML = (cls: string, label: string) =>
  `<div class="wslider ${cls}" role="slider" tabindex="0" aria-label="${label}"><div class="rail"><div class="buffered"></div><div class="fill"></div></div><div class="thumb"><div class="inner"></div></div></div>`;

const mpeCss = css`
:host {
  display: block;
  position: relative;
  background: #000;
  color: var(--w-text-fill-color-primary);
  overflow: hidden;
  border-radius: var(--w-media-player-radius, 0px);
  min-height: 120px;
  aspect-ratio: var(--w-media-aspect, auto);
  user-select: none;
  -webkit-user-select: none;
}
video { -webkit-user-drag: none; }
:host([full-window]) {
  position: fixed !important;
  inset: 0 !important;
  z-index: 2147482000;
  width: auto !important;
  height: auto !important;
  border-radius: 0;
  aspect-ratio: auto;
}
.stage { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; }
video { width: 100%; height: 100%; object-fit: contain; display: block; background: transparent; }
:host([stretch="fill"]) video { object-fit: fill; }
:host([stretch="uniform-to-fill"]) video { object-fit: cover; }
:host([stretch="none"]) video { object-fit: none; }
.poster, .visual { position: absolute; inset: 0; background-position: center; background-size: contain; background-repeat: no-repeat; pointer-events: none; }
:host([stretch="uniform-to-fill"]) .poster { background-size: cover; }
.poster[hidden], .visual[hidden] { display: none; }
::slotted([slot="visual"]) { width: 100%; height: 100%; display: block; }
:host([data-w-idle]) .stage { cursor: none; }

.mtc {
  position: absolute;
  left: 0; right: 0; bottom: 0;
  display: flex;
  justify-content: center;
  padding: 12px;
  pointer-events: none;
}
:host(:not([transport-controls])) .mtc { display: none; }
.panel {
  pointer-events: auto;
  box-sizing: border-box;
  width: 100%;
  max-width: 720px;
  min-width: min(296px, 100%);
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-flyout);
  transition: opacity var(--w-duration-normal) var(--w-ease-decelerate), transform var(--w-duration-normal) var(--w-ease-decelerate);
}
:host([data-w-idle]) .panel { opacity: 0; transform: translateY(8px); pointer-events: none; transition-timing-function: var(--w-ease-accelerate); }
.left-play { grid-column: 1; grid-row: 1; display: none; align-items: center; }
.timeline { grid-column: 2; grid-row: 1; min-width: 0; position: relative; }
.progress { margin: 2px 7px 1px; }
.buffering { position: absolute; left: 0; right: 0; top: 2px; height: 4px; display: none; }
:host([data-w-buffering]) .buffering { display: block; }
.times { display: flex; justify-content: space-between; height: 16px; margin: 0 7px 2px; font: var(--w-type-caption); color: var(--w-text-fill-color-secondary); font-variant-numeric: tabular-nums; }
.commands { grid-column: 2; grid-row: 2; display: grid; grid-template-columns: 1fr auto 1fr; align-items: center; margin: 3px 0; min-height: 40px; }
.group { display: flex; align-items: center; }
.group.left { justify-content: flex-start; }
.group.right { justify-content: flex-end; }

:host([compact]) .panel { grid-template-rows: auto; height: 48px; padding: 3px; align-items: center; }
:host([compact]) .left-play { display: flex; }
:host([compact]) .times { display: none; }
:host([compact]) .progress { margin: -1px 8px 1px 12px; }
:host([compact]) .commands { grid-column: 3; grid-row: 1; margin: 0; display: flex; }
:host([compact]) .center .play { display: none; }
:host([compact]) .group.center { order: 0; }

.btn {
  position: relative;
  width: 40px;
  height: 40px;
  padding: 0;
  margin: 0;
  border: 0;
  background: transparent;
  color: var(--w-text-fill-color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  cursor: default;
  outline: none;
  flex: none;
}
.btn::before {
  content: '';
  position: absolute;
  inset: 5px;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  transition: background-color var(--w-duration-faster) linear;
}
.btn:hover::before { background: var(--w-subtle-fill-color-secondary); }
.btn:active::before { background: var(--w-subtle-fill-color-tertiary); }
.btn:active { color: var(--w-text-fill-color-secondary); }
.btn[aria-pressed="true"]::before { background: var(--w-accent-fill-color-default); }
.btn[aria-pressed="true"] { color: var(--w-text-on-accent-fill-color-primary); }
.btn[aria-pressed="true"]:hover::before { background: var(--w-accent-fill-color-secondary); }
.btn:disabled { color: var(--w-text-fill-color-disabled); pointer-events: none; }
.btn[hidden] { display: none; }
${focusRing('.btn:focus-visible::before', 3)}
.btn .w-icon { position: relative; font-size: 16px; line-height: 1; transition: transform var(--w-duration-fast) cubic-bezier(0.2, 1.8, 0.4, 1); }
.btn:active .w-icon { transform: scale(0.9); transition-duration: var(--w-duration-faster); }

.error { position: absolute; left: 50%; top: 50%; translate: -50% -50%; width: 320px; max-width: calc(100% - 24px); min-height: 96px; box-sizing: border-box; padding: 12px; border-radius: var(--w-corner-radius-overlay); ${acrylicSurface} font: var(--w-type-caption); }
.error[hidden] { display: none; }

win-flyout::part(content) { padding: 0; }
.vf { display: flex; align-items: center; padding: 11px 3px; }
.vf .wslider { width: 190px; margin: 0 8px 0 12px; }
.vf .vv { width: 24px; margin: 0 16px 0 8px; text-align: right; font: var(--w-type-caption); font-variant-numeric: tabular-nums; }
${sliderCss}
`;

const btn = (cls: string, glyph: string, label: string, extra = '') =>
  `<button class="btn ${cls}" type="button" aria-label="${label}" title="${label}" ${extra}><span class="w-icon" aria-hidden="true">${glyph}</span></button>`;

export class WinMediaPlayer extends WinElement {
  static override styles = [mpeCss];
  static override template = `
<div class="stage" part="stage">
  <video part="media" playsinline preload="metadata"></video>
  <div class="poster" part="poster" hidden></div>
  <div class="visual" part="visual" hidden><slot name="visual"></slot></div>
  <div class="error" part="error" role="alert" hidden></div>
</div>
<div class="mtc" part="transport-controls">
  <div class="panel" part="panel" role="group" aria-label="媒体传输控件">
    <div class="left-play">${btn('play-left', G.play, '播放')}</div>
    <div class="timeline">
      ${SLIDER_HTML('progress', '进度')}
      <win-progress-bar class="buffering" indeterminate></win-progress-bar>
      <div class="times"><span class="elapsed">00:00</span><span class="remaining">00:00</span></div>
    </div>
    <div class="commands">
      <div class="group left">${btn('volume', G.volume, '音量', 'aria-haspopup="dialog"')}</div>
      <div class="group center">${btn('stop', G.stop, '停止', 'hidden')}${btn('skip-back', G.skipBack, '后退 10 秒', 'hidden')}${btn('play', G.play, '播放')}${btn('skip-forward', G.skipForward, '前进 30 秒', 'hidden')}${btn('rate', G.rate, '播放速度', 'hidden aria-haspopup="menu"')}</div>
      <div class="group right">${btn('repeat', G.repeatAll, '重复', 'hidden aria-pressed="false"')}${btn('zoom', G.zoom, '纵横比')}${btn('compact-overlay', G.compact, '画中画', 'hidden')}${btn('full-window', G.fullScreen, '全窗口')}</div>
    </div>
  </div>
</div>
<win-flyout class="volume-flyout" placement="top" part="volume-flyout">
  <div class="vf">${btn('mute', G.volume, '静音')}${SLIDER_HTML('vol', '音量')}<span class="vv">100</span></div>
</win-flyout>
<win-menu-flyout class="rate-menu" placement="top" part="rate-menu">
  ${RATES.map((r) => `<win-radio-menu-flyout-item group="rate" data-rate="${r}"${r === 1 ? ' checked' : ''}>${r === 1 ? '正常' : `${r}×`}</win-radio-menu-flyout-item>`).join('')}
</win-menu-flyout>`;

  static override props: PropDefs = {
    source: { type: String },
    posterSource: { type: String, attribute: 'poster-source' },
    autoPlay: { type: Boolean, attribute: 'auto-play' },
    transportControls: { type: Boolean, attribute: 'transport-controls' },
    stretch: { type: String, reflect: true, default: 'uniform' },
    loop: { type: Boolean },
    muted: { type: Boolean },
    volume: { type: Number, default: 100 },
    playbackRate: { type: Number, attribute: 'playback-rate', default: 1 },
    compact: { type: Boolean },
    fullWindow: { type: Boolean, attribute: 'full-window' },
    stopButton: { type: Boolean, attribute: 'stop-button' },
    skipButtons: { type: Boolean, attribute: 'skip-buttons' },
    playbackRateButton: { type: Boolean, attribute: 'playback-rate-button' },
    repeatButton: { type: Boolean, attribute: 'repeat-button' },
    compactOverlayButton: { type: Boolean, attribute: 'compact-overlay-button' },
    zoomButton: { type: Boolean, attribute: 'zoom-button', default: true },
    fullWindowButton: { type: Boolean, attribute: 'full-window-button', default: true },
    hideDelay: { type: Number, attribute: 'hide-delay', default: 3000 },
  };
  declare source: string;
  declare posterSource: string;
  declare autoPlay: boolean;
  declare transportControls: boolean;
  declare stretch: 'none' | 'fill' | 'uniform' | 'uniform-to-fill';
  declare loop: boolean;
  declare muted: boolean;
  declare volume: number;
  declare playbackRate: number;
  declare compact: boolean;
  declare fullWindow: boolean;
  declare stopButton: boolean;
  declare skipButtons: boolean;
  declare playbackRateButton: boolean;
  declare repeatButton: boolean;
  declare compactOverlayButton: boolean;
  declare zoomButton: boolean;
  declare fullWindowButton: boolean;
  declare hideDelay: number;

  private video!: HTMLVideoElement;
  private progress!: MtcSlider;
  private vol!: MtcSlider;
  private idleTimer: ReturnType<typeof setTimeout> | null = null;
  private srcObj: MediaStream | null = null;
  private keyHandler = (e: KeyboardEvent) => this.onKey(e);

  static {
    this.define('win-media-player');
  }

  get mediaElement(): HTMLVideoElement {
    return this.video;
  }

  get sourceObject(): MediaStream | null {
    return this.srcObj;
  }
  set sourceObject(s: MediaStream | null) {
    this.srcObj = s;
    if (this.video) {
      this.video.srcObject = s;
      if (s) this.video.removeAttribute('src');
      this.syncAll();
    }
  }

  get currentTime(): number {
    return this.video?.currentTime ?? 0;
  }
  set currentTime(t: number) {
    if (this.video) this.video.currentTime = t;
  }
  get duration(): number {
    return this.video?.duration ?? NaN;
  }
  get paused(): boolean {
    return this.video?.paused ?? true;
  }

  play(): Promise<void> {
    return this.video ? this.video.play().catch(() => undefined) : Promise.resolve();
  }
  pause(): void {
    this.video?.pause();
  }

  protected override firstConnected(): void {
    this.video = this.$('video');
    const v = this.video;
    if (this.srcObj) v.srcObject = this.srcObj;
    const progressEl = this.$('.progress');
    this.progress = new MtcSlider(progressEl, {
      onInput: (val) => {
        if (Number.isFinite(v.duration)) v.currentTime = val;
        this.syncTime(val);
      },
      text: (val) => formatMediaTime(val),
      largeStep: () => 30,
    });
    this.progress.step = 5;
    this.vol = new MtcSlider(this.$('.vol'), {
      onInput: (val) => {
        this.volume = Math.round(val);
        if (this.muted && val > 0) this.muted = false;
      },
      text: (val) => `${Math.round(val)}`,
    });

    for (const ev of ['play', 'pause', 'ended', 'playing']) v.addEventListener(ev, () => this.syncPlay());
    v.addEventListener('timeupdate', () => {
      if (!this.progress.isDragging) this.syncTime(v.currentTime);
    });
    v.addEventListener('durationchange', () => this.syncAll());
    v.addEventListener('loadedmetadata', () => {
      if (v.videoWidth && v.videoHeight)
        this.style.setProperty('--w-media-aspect', `${v.videoWidth} / ${v.videoHeight}`);
      this.syncAll();
      this.emit('mediaopened', { duration: v.duration }, { bubbles: false });
    });
    v.addEventListener('progress', () => this.syncBuffered());
    v.addEventListener('waiting', () => this.setAttribute('data-w-buffering', ''));
    v.addEventListener('canplay', () => this.removeAttribute('data-w-buffering'));
    v.addEventListener('playing', () => this.removeAttribute('data-w-buffering'));
    v.addEventListener('volumechange', () => {
      this.syncVolume();
      this.emit('volumechanged', { volume: v.volume * 100, muted: v.muted }, { bubbles: false });
    });
    v.addEventListener('ratechange', () => this.syncRate());
    v.addEventListener('error', () => {
      const err = this.$('.error');
      err.hidden = false;
      err.textContent = '无法播放此媒体。来源可能不受支持或已不可用。';
      this.emit('mediafailed', { code: v.error?.code ?? 0 }, { bubbles: false });
    });
    v.addEventListener('ended', () => this.emit('mediaended', undefined, { bubbles: false }));

    const toggle = () => (v.paused || v.ended ? void this.play() : v.pause());
    this.$('.play').addEventListener('click', toggle);
    this.$('.play-left').addEventListener('click', toggle);
    this.$('.stop').addEventListener('click', () => {
      v.pause();
      v.currentTime = 0;
    });
    this.$('.skip-back').addEventListener('click', () => (v.currentTime = Math.max(0, v.currentTime - 10)));
    this.$('.skip-forward').addEventListener(
      'click',
      () => (v.currentTime = Math.min(v.duration || 0, v.currentTime + 30)),
    );
    this.$('.zoom').addEventListener('click', () => {
      this.stretch = this.stretch === 'uniform-to-fill' ? 'uniform' : 'uniform-to-fill';
    });
    this.$('.full-window').addEventListener('click', () => (this.fullWindow = !this.fullWindow));
    this.$('.repeat').addEventListener('click', () => (this.loop = !this.loop));
    this.$('.compact-overlay').addEventListener('click', () => {
      const pip = (v as HTMLVideoElement & { requestPictureInPicture?: () => Promise<unknown> })
        .requestPictureInPicture;
      if (document.pictureInPictureElement) void document.exitPictureInPicture();
      else if (pip) void pip.call(v).catch(() => undefined);
    });
    const volFly = this.$<HTMLElement & { showAt(a: Element, o?: object): void }>('.volume-flyout');
    this.$('.volume').addEventListener('click', (e) =>
      volFly.showAt(this.$('.volume'), { placement: 'top', focus: (e as MouseEvent).detail === 0 ? 'first' : 'none' }),
    );
    this.$('.mute').addEventListener('click', () => (this.muted = !this.muted));
    const rateMenu = this.$<HTMLElement & { showAt(a: Element, o?: object): void }>('.rate-menu');
    this.$('.rate').addEventListener('click', (e) =>
      rateMenu.showAt(this.$('.rate'), {
        placement: 'top',
        inputType: (e as MouseEvent).detail === 0 ? 'keyboard' : 'mouse',
      }),
    );
    for (const item of this.$$<HTMLElement>('[data-rate]')) {
      item.addEventListener('click', () => (this.playbackRate = Number(item.dataset.rate)));
    }
    const stage = this.$('.stage');
    stage.addEventListener('click', () => {
      if (this.hasAttribute('data-w-idle')) this.wake();
      else if (!v.paused) this.goIdle();
    });
    stage.addEventListener('dblclick', () => (this.fullWindow = !this.fullWindow));
    for (const ev of ['pointermove', 'pointerdown', 'focusin', 'keydown']) this.addEventListener(ev, () => this.wake());
    this.addEventListener('keydown', this.keyHandler);
  }

  protected override connected(): void {
    if (this.isInitialized && this.fullWindow) document.addEventListener('keydown', this.docKeyHandler);
  }

  protected override disconnected(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    this.video?.pause();
    document.removeEventListener('keydown', this.docKeyHandler);
  }

  private docKeyHandler = (e: KeyboardEvent) => {
    if (e.key !== 'Escape' || e.defaultPrevented || !this.fullWindow) return;
    e.preventDefault();
    this.fullWindow = false;
  };

  protected override updated(changed: Set<string>, first = false): void {
    const v = this.video;
    if (changed.has('source')) {
      this.$('.error').hidden = true;
      if (this.source) {
        if (this.srcObj) {
          this.srcObj = null;
          v.srcObject = null;
        }
        v.src = this.source;
      } else if (!this.srcObj) v.removeAttribute('src');
      this.syncAll();
    }
    if (changed.has('posterSource')) {
      const p = this.$('.poster');
      p.hidden = !this.posterSource;
      p.style.backgroundImage = this.posterSource ? `url("${this.posterSource.replaceAll('"', '%22')}")` : '';
    }
    if (changed.has('autoPlay')) v.autoplay = this.autoPlay;
    if (changed.has('loop')) {
      v.loop = this.loop;
      const r = this.$('.repeat');
      r.setAttribute('aria-pressed', String(this.loop));
      r.querySelector('.w-icon')!.textContent = this.loop ? G.repeatOne : G.repeatAll;
    }
    if (changed.has('muted')) v.muted = this.muted;
    if (changed.has('volume')) v.volume = Math.min(1, Math.max(0, this.volume / 100));
    if (changed.has('playbackRate')) v.playbackRate = this.playbackRate || 1;
    if (changed.has('fullWindow')) {
      if (this.fullWindow && this.isConnected) document.addEventListener('keydown', this.docKeyHandler);
      else document.removeEventListener('keydown', this.docKeyHandler);
      const fw = this.$('.full-window');
      fw.querySelector('.w-icon')!.textContent = this.fullWindow ? G.backToWindow : G.fullScreen;
      fw.setAttribute('aria-label', this.fullWindow ? '退出全窗口' : '全窗口');
      fw.title = fw.getAttribute('aria-label')!;
      if (!first) {
        animate(
          this,
          [
            { opacity: 0.6, transform: 'scale(0.97)' },
            { opacity: 1, transform: 'none' },
          ],
          {
            duration: durations.normal,
            easing: easings.decelerate,
          },
        );
        this.emit(this.fullWindow ? 'fullwindowenter' : 'fullwindowexit', undefined, { bubbles: false });
      }
    }
    this.$('.stop').hidden = !this.stopButton;
    this.$('.skip-back').hidden = !this.skipButtons;
    this.$('.skip-forward').hidden = !this.skipButtons;
    this.$('.rate').hidden = !this.playbackRateButton;
    this.$('.repeat').hidden = !this.repeatButton;
    this.$('.zoom').hidden = !this.zoomButton;
    this.$('.full-window').hidden = !this.fullWindowButton;
    this.$('.compact-overlay').hidden =
      !this.compactOverlayButton ||
      !(document as Document & { pictureInPictureEnabled?: boolean }).pictureInPictureEnabled;
    if (changed.has('slotted') || first) {
      const hasVisual = (this.$<HTMLSlotElement>('slot[name="visual"]').assignedElements().length ?? 0) > 0;
      this.$('.visual').hidden = !hasVisual;
    }
    if (first) {
      this.$<HTMLSlotElement>('slot[name="visual"]').addEventListener('slotchange', () =>
        this.requestUpdate('slotted'),
      );
      this.syncAll();
    }
  }

  private onKey(e: KeyboardEvent): void {
    const v = this.video;
    const t = e.composedPath()[0] as HTMLElement | undefined;
    if (t && (t.classList?.contains('wslider') || t.localName === 'input')) return;
    switch (e.key) {
      case ' ':
      case 'k':
        if (t && t.localName === 'button') return;
        e.preventDefault();
        if (v.paused) void this.play();
        else v.pause();
        break;
      case 'ArrowLeft':
        e.preventDefault();
        v.currentTime = Math.max(0, v.currentTime - 5);
        break;
      case 'ArrowRight':
        e.preventDefault();
        v.currentTime = Math.min(v.duration || 0, v.currentTime + 5);
        break;
      case 'ArrowUp':
        e.preventDefault();
        this.volume = Math.min(100, this.volume + 5);
        break;
      case 'ArrowDown':
        e.preventDefault();
        this.volume = Math.max(0, this.volume - 5);
        break;
      case 'm':
        this.muted = !this.muted;
        break;
      case 'f':
        this.fullWindow = !this.fullWindow;
        break;
      case 'Escape':
        if (this.fullWindow) {
          e.preventDefault();
          this.fullWindow = false;
        }
        break;
    }
  }

  private wake(): void {
    this.removeAttribute('data-w-idle');
    if (this.idleTimer) clearTimeout(this.idleTimer);
    if (!this.video || this.video.paused || !this.transportControls || this.hideDelay <= 0) return;
    this.idleTimer = setTimeout(() => this.goIdle(), this.hideDelay);
  }

  private goIdle(): void {
    if (this.idleTimer) clearTimeout(this.idleTimer);
    const active = this.renderRoot.activeElement;
    const flyoutOpen =
      (this.$<HTMLElement & { isOpen?: boolean }>('.volume-flyout').isOpen ?? false) ||
      (this.$<HTMLElement & { isOpen?: boolean }>('.rate-menu').isOpen ?? false);
    if (
      this.video.paused ||
      flyoutOpen ||
      (active && this.$('.panel').contains(active) && active.matches(':focus-visible'))
    )
      return;
    this.setAttribute('data-w-idle', '');
  }

  private syncAll(): void {
    this.syncPlay();
    this.syncTime(this.video?.currentTime ?? 0);
    this.syncBuffered();
    this.syncVolume();
    this.syncRate();
  }

  private syncPlay(): void {
    const v = this.video;
    if (!v) return;
    const playing = !v.paused && !v.ended;
    for (const b of [this.$('.play'), this.$('.play-left')]) {
      b.querySelector('.w-icon')!.textContent = playing ? G.pause : G.play;
      b.setAttribute('aria-label', playing ? '暂停' : '播放');
      b.title = b.getAttribute('aria-label')!;
    }
    if (playing) this.wake();
    else {
      if (this.idleTimer) clearTimeout(this.idleTimer);
      this.removeAttribute('data-w-idle');
    }
    this.emit('currentstatechanged', { state: playing ? 'playing' : 'paused' }, { bubbles: false });
  }

  private syncTime(t: number): void {
    const v = this.video;
    if (!v) return;
    const live = !Number.isFinite(v.duration);
    const d = live ? 0 : v.duration || 0;
    this.progress.max = d || 0;
    this.progress.set(live ? 0 : t);
    this.progress.el.toggleAttribute('aria-disabled', live || !d);
    this.$('.elapsed').textContent = formatMediaTime(live ? v.currentTime : t);
    this.$('.remaining').textContent = live ? '直播' : formatMediaTime(Math.max(0, d - t));
    this.$<HTMLButtonElement>('.skip-back').disabled = live;
    this.$<HTMLButtonElement>('.skip-forward').disabled = live;
  }

  private syncBuffered(): void {
    const v = this.video;
    if (!v || !Number.isFinite(v.duration) || !v.duration) {
      this.progress?.setBuffered(0);
      return;
    }
    let end = 0;
    for (let i = 0; i < v.buffered.length; i++) {
      if (v.buffered.start(i) <= v.currentTime + 0.5) end = Math.max(end, v.buffered.end(i));
    }
    this.progress.setBuffered(end / v.duration);
  }

  private syncVolume(): void {
    const v = this.video;
    if (!v || !this.vol) return;
    const muted = v.muted || v.volume === 0;
    for (const b of [this.$('.volume'), this.$('.mute')])
      b.querySelector('.w-icon')!.textContent = muted ? G.mute : G.volume;
    this.$('.mute').setAttribute('aria-label', muted ? '取消静音' : '静音');
    this.vol.set(v.muted ? 0 : Math.round(v.volume * 100));
    this.$('.vv').textContent = String(v.muted ? 0 : Math.round(v.volume * 100));
  }

  private syncRate(): void {
    const v = this.video;
    if (!v) return;
    for (const item of this.$$<HTMLElement & { checked: boolean }>('[data-rate]')) {
      item.checked = Number(item.dataset.rate) === v.playbackRate;
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-media-player': WinMediaPlayer;
  }
}
