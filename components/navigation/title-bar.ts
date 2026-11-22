import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { glyph, iconHtml } from '../../base/icons.ts';
import { animate, durations, easings, settled } from '../../motion/animate.ts';
import { fadeBackdropActivity } from '../../theme/materials.ts';
import { navButtonCss, navStrings } from './shared.ts';

const titleBarCss = css`
:host {
  display: flex;
  align-items: center;
  box-sizing: border-box;
  height: 48px;
  min-width: 0;
  padding-inline-start: 2px;
  padding-inline-end: var(--w-caption-inset, 0px);
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-caption);
  user-select: none;
  -webkit-user-select: none;
}
:host([data-compact]) { height: 32px; }
.tb-btn {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 40px;
  height: calc(100% - 4px);
  margin: 2px;
  padding: 0;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: var(--w-text-fill-color-primary);
  cursor: default;
}
.tb-btn:hover { background: var(--w-subtle-fill-color-secondary); }
.tb-btn:active { background: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-secondary); }
.tb-btn:disabled { color: var(--w-text-fill-color-disabled); background: transparent; }
.tb-btn[hidden] { display: none; }
${focusRing('.tb-btn:focus-visible', 0)}
.left-header { display: flex; align-items: center; flex: none; }
.left-header:not(.has) { display: none; }
.pad { flex: none; width: 14px; }
.icon { display: inline-flex; flex: none; max-width: 16px; max-height: 16px; margin-inline-end: 16px; }
.icon:not(.has) { display: none; }
.title { flex: none; margin-inline-end: 8px; white-space: nowrap; overflow: hidden; text-overflow: ellipsis; min-width: 0; }
.subtitle { flex: none; margin-inline-end: 16px; color: var(--w-text-fill-color-secondary); white-space: nowrap; overflow: hidden; text-overflow: ellipsis; }
.title:empty, .subtitle:empty { display: none; }
.content { flex: 1 1 auto; min-width: 0; display: flex; align-items: center; justify-content: center; }
.right-header { display: flex; align-items: center; flex: none; }
.right-header:not(.has) { display: none; }
.drag { flex: none; width: 48px; align-self: stretch; }
:host([deactivated]) .title { color: var(--w-text-fill-color-tertiary); }
:host([deactivated]) .subtitle { color: var(--w-text-fill-color-tertiary); }
:host([deactivated]) .icon { opacity: 0.5; }
`;

export class WinTitleBar extends WinElement {
  static override styles = [navButtonCss, titleBarCss];
  static override template = `
<button class="tb-btn nav-btn back" type="button" hidden>${glyph('back', 16)}</button>
<button class="tb-btn nav-btn toggle" type="button" hidden><span class="toggle-icon">${glyph('globalNav', 16)}</span></button>
<div class="left-header"><slot name="left-header"></slot></div>
<span class="pad"></span>
<span class="icon" part="icon"><span class="icon-spec"></span><slot name="icon"></slot></span>
<span class="title" part="title"></span>
<span class="subtitle" part="subtitle"></span>
<div class="content" part="content"><slot></slot></div>
<div class="right-header"><slot name="right-header"></slot></div>
<span class="drag"></span>`;
  static override props: PropDefs = {
    barTitle: { type: String, attribute: 'bar-title' },
    subtitle: { type: String },
    icon: { type: String },
    isBackButtonVisible: { type: Boolean, attribute: 'is-back-button-visible' },
    isBackButtonEnabled: { type: Boolean, attribute: 'is-back-button-enabled', default: true },
    isPaneToggleButtonVisible: { type: Boolean, attribute: 'is-pane-toggle-button-visible' },
    deactivated: { type: Boolean },
  };
  declare barTitle: string;
  declare subtitle: string;
  declare icon: string;
  declare isBackButtonVisible: boolean;
  declare isBackButtonEnabled: boolean;
  declare isPaneToggleButtonVisible: boolean;
  declare deactivated: boolean;

  private onBlur = () => {
    if (!this.closest('win-window-frame')) this.deactivated = true;
  };
  private onFocus = () => {
    if (!this.closest('win-window-frame')) this.deactivated = false;
  };

  static {
    this.define('win-title-bar');
  }

  protected override firstConnected(): void {
    const s = navStrings(this);
    const back = this.$('.back');
    back.setAttribute('aria-label', s.back);
    back.title = s.back;
    back.addEventListener('click', () => this.emit('backrequested'));
    const toggle = this.$('.toggle');
    toggle.setAttribute('aria-label', s.navigation);
    toggle.title = s.navigation;
    toggle.addEventListener('click', () => this.emit('panetogglerequested'));
    for (const slot of this.$$<HTMLSlotElement>('slot')) slot.addEventListener('slotchange', () => this.syncParts());
    this.syncParts();
  }

  protected override connected(): void {
    addEventListener('blur', this.onBlur);
    addEventListener('focus', this.onFocus);
  }

  protected override disconnected(): void {
    removeEventListener('blur', this.onBlur);
    removeEventListener('focus', this.onFocus);
  }

  protected override updated(changed: Set<string>): void {
    if (changed.has('barTitle')) this.$('.title').textContent = this.barTitle;
    if (changed.has('subtitle')) this.$('.subtitle').textContent = this.subtitle;
    if (changed.has('icon')) this.$('.icon-spec').innerHTML = iconHtml(this.icon, 16);
    if (changed.has('isBackButtonVisible')) this.$('.back').hidden = !this.isBackButtonVisible;
    if (changed.has('isBackButtonEnabled')) (this.$('.back') as HTMLButtonElement).disabled = !this.isBackButtonEnabled;
    if (changed.has('isPaneToggleButtonVisible')) this.$('.toggle').hidden = !this.isPaneToggleButtonVisible;
    this.syncParts();
  }

  private syncParts(): void {
    const has = (name: string) =>
      (this.renderRoot.querySelector(`slot${name ? `[name="${name}"]` : ':not([name])'}`) as HTMLSlotElement | null)
        ?.assignedNodes({ flatten: true })
        .some((n) => n.nodeType === 1 || n.textContent?.trim()) ?? false;
    const left = has('left-header');
    const right = has('right-header');
    const content = has('');
    this.$('.left-header').classList.toggle('has', left);
    this.$('.right-header').classList.toggle('has', right);
    this.$('.icon').classList.toggle('has', !!this.icon || has('icon'));
    const tall = left || right || content || this.isBackButtonVisible || this.isPaneToggleButtonVisible;
    this.toggleAttribute('data-compact', !tall);
  }
}

const windowCss = css`
:host {
  position: relative;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 200px;
  min-height: 120px;
  border: 1px solid var(--w-surface-stroke-color-default);
  border-radius: var(--w-corner-radius-overlay);
  box-shadow: var(--w-elevation-window);
  overflow: hidden;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  transition: box-shadow var(--w-duration-normal) var(--w-ease-decelerate);
  --w-caption-inset: 138px;
}
:host([active="false"]) { box-shadow: var(--w-elevation-dialog); }
:host([maximized]) {
  position: fixed;
  inset: 0;
  z-index: 1000;
  width: auto !important;
  height: auto !important;
  border-radius: 0;
  border-color: transparent;
}
:host([hidden]) { display: none; }
.titlebar { position: relative; flex: none; min-height: 32px; display: flex; align-items: stretch; }
.titlebar > slot { display: block; flex: 1 1 auto; min-width: 0; }
.default-title { display: flex; align-items: center; height: 32px; padding-inline-start: 16px; padding-inline-end: var(--w-caption-inset); font: var(--w-type-caption); gap: 16px; }
.default-title .t:empty { display: none; }
:host([active="false"]) .default-title { color: var(--w-text-fill-color-tertiary); }
.captions { position: absolute; top: 0; inset-inline-end: 0; display: flex; height: var(--caption-h, 32px); z-index: 2; }
.cap {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 46px;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--w-text-fill-color-primary);
  cursor: default;
  transition: background-color var(--w-duration-faster) linear;
}
:host([active="false"]) .cap { color: var(--w-text-fill-color-tertiary); }
.cap:hover { background: var(--w-subtle-fill-color-secondary); color: var(--w-text-fill-color-primary); }
.cap:active { background: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-secondary); }
.cap.close:hover { background: #c42b1c; color: #fff; }
.cap.close:active { background: rgba(196, 43, 28, 0.9); color: rgba(255, 255, 255, 0.7); }
:host(:not([maximized])) .cap.close { border-start-end-radius: calc(var(--w-corner-radius-overlay) - 1px); }
${focusRing('.cap:focus-visible', 0)}
.cap .w-glyph { width: 10px; height: 10px; }
.body { position: relative; flex: 1 1 auto; min-height: 0; overflow: auto; display: flex; flex-direction: column; }
:host([minimized]) .body { display: none; }
`;

export class WinWindowFrame extends WinElement {
  static override styles = [windowCss];
  static override defaultMaterial = 'mica';
  static override template = `
<div class="titlebar" part="title-bar">
  <slot name="title-bar"><div class="default-title"><span class="icon"></span><span class="t"></span></div></slot>
  <div class="captions" part="caption-buttons">
    <button class="cap min" type="button" tabindex="-1">${glyph('chromeMinimize', 10)}</button>
    <button class="cap max" type="button" tabindex="-1">${glyph('chromeMaximize', 10)}</button>
    <button class="cap close" type="button" tabindex="-1">${glyph('chromeClose', 10)}</button>
  </div>
</div>
<div class="body" part="body"><slot></slot></div>`;
  static override props: PropDefs = {
    windowTitle: { type: String, attribute: 'window-title' },
    icon: { type: String },
    maximized: { type: Boolean },
    minimized: { type: Boolean },
    active: { type: Boolean, default: true },
  };
  declare windowTitle: string;
  declare icon: string;
  declare maximized: boolean;
  declare minimized: boolean;
  declare active: boolean;

  private outside = (ev: PointerEvent) => {
    if (!ev.composedPath().includes(this)) this.active = false;
  };

  static {
    this.define('win-window-frame');
  }

  protected override firstConnected(): void {
    const s = navStrings(this);
    const min = this.$('.min');
    const max = this.$('.max');
    const close = this.$('.close');
    min.setAttribute('aria-label', s.minimize);
    min.title = s.minimize;
    close.setAttribute('aria-label', s.close);
    close.title = s.close;
    min.addEventListener('click', () => {
      this.minimized = !this.minimized;
      this.emit(this.minimized ? 'minimize' : 'restore');
    });
    max.addEventListener('click', () => {
      this.maximized = !this.maximized;
      this.emit(this.maximized ? 'maximize' : 'restore');
    });
    close.addEventListener('click', () => void this.close());
    this.addEventListener('pointerdown', () => (this.active = true));
    this.addEventListener('focusin', () => (this.active = true));
    this.$('slot[name="title-bar"]').addEventListener('slotchange', () => this.syncCaptionHeight());
  }

  protected override connected(): void {
    document.addEventListener('pointerdown', this.outside, true);
  }

  protected override disconnected(): void {
    document.removeEventListener('pointerdown', this.outside, true);
  }

  protected override updated(changed: Set<string>, first: boolean): void {
    if (changed.has('windowTitle')) {
      this.$('.t').textContent = this.windowTitle;
      this.setAttribute('aria-label', this.windowTitle);
    }
    if (changed.has('icon')) this.$('.icon').innerHTML = iconHtml(this.icon, 16);
    if (changed.has('maximized')) {
      const s = navStrings(this);
      const max = this.$('.max');
      max.innerHTML = glyph(this.maximized ? 'chromeRestore' : 'chromeMaximize', 10);
      max.setAttribute('aria-label', this.maximized ? s.restore : s.maximize);
      max.title = this.maximized ? s.restore : s.maximize;
    }
    if (changed.has('active')) {
      for (const tb of this.querySelectorAll<WinTitleBar>('win-title-bar')) tb.deactivated = !this.active;
      fadeBackdropActivity(this, this.active ? null : true, !first);
    }
    this.syncCaptionHeight();
  }

  private syncCaptionHeight(): void {
    requestAnimationFrame(() => {
      const tb = this.$<HTMLSlotElement>('slot[name="title-bar"]').assignedElements()[0] as HTMLElement | undefined;
      const h = tb ? tb.offsetHeight : 32;
      this.style.setProperty('--caption-h', `${Math.max(32, Math.min(48, h || 32))}px`);
    });
  }

  async close(): Promise<void> {
    if (!this.emit('close', undefined, { cancelable: true })) return;
    await settled(
      animate(
        this,
        [
          { opacity: 1, transform: 'none' },
          { opacity: 0, transform: 'scale(0.96)' },
        ],
        {
          duration: durations.fast,
          easing: easings.accelerate,
          fill: 'forwards',
        },
      ),
    );
    this.hidden = true;
    for (const a of this.getAnimations()) a.cancel();
    this.emit('closed');
  }

  show(): void {
    this.hidden = false;
    animate(
      this,
      [
        { opacity: 0, transform: 'scale(0.96)' },
        { opacity: 1, transform: 'none' },
      ],
      {
        duration: durations.normal,
        easing: easings.decelerate,
      },
    );
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-title-bar': WinTitleBar;
    'win-window-frame': WinWindowFrame;
  }
}
