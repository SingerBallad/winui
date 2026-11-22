import { WinElement, escapeHtml, type PropDefs } from '../../base/element.ts';
import { css, materialOverrides, scrollbars } from '../../base/css.ts';
import { tabbables } from '../../base/dom.ts';
import { animate, durations, easings, settled } from '../../motion/animate.ts';
import '../buttons/button.ts';

export type ContentDialogResult = 'none' | 'primary' | 'secondary';
type ButtonKind = 'primary' | 'secondary' | 'close';

function pixelStep(): number {
  const dpr = window.devicePixelRatio || 1;
  for (const s of [1, 2, 4]) if (Math.abs(s * dpr - Math.round(s * dpr)) < 0.01) return s;
  return 1;
}

function visualState(el: Element): { opacity: number; transform: string } {
  const cs = getComputedStyle(el);
  const opacity = Number(cs.opacity);
  return { opacity: Number.isNaN(opacity) ? 1 : opacity, transform: cs.transform || 'none' };
}

const dialogCss = css`
:host { display: contents; }
dialog {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  max-width: none;
  max-height: none;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: var(--w-text-fill-color-primary);
  overflow: hidden;
  outline: none;
}
dialog:not([open]) { display: none; }
dialog::backdrop { background: transparent; }
.smoke {
  position: absolute;
  inset: 0;
  background: var(--w-smoke-fill-color-default, rgba(0, 0, 0, 0.3));
}
.layout {
  position: absolute;
  inset: 0;
  pointer-events: none;
}
.background {
  position: absolute;
  left: 0;
  top: 0;
  pointer-events: auto;
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: min(320px, calc(100% - 32px));
  max-width: min(548px, calc(100% - 32px));
  min-height: 184px;
  max-height: min(756px, calc(100% - 32px));
  background: var(--w-solid-background-fill-color-base);
  border-radius: var(--w-corner-radius-overlay);
  box-shadow: var(--w-elevation-dialog);
  overflow: hidden;
  transform-origin: 50% 50%;
}
.background::after {
  content: '';
  position: absolute;
  inset: 0;
  border: 1px solid var(--w-surface-stroke-color-default);
  border-radius: inherit;
  pointer-events: none;
}
:host([full-size-desired]) .background { height: min(756px, calc(100% - 32px)); }
.top {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  padding: 25px 25px 24px;
  background: var(--w-layer-fill-color-alt);
  border-bottom: 1px solid var(--w-card-stroke-color-default);
}
.title {
  margin: 0 0 12px;
  font: var(--w-type-subtitle);
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
  overflow-wrap: anywhere;
  user-select: none;
  -webkit-user-select: none;
}
.title.empty { display: none; }
.content { font: var(--w-type-body); overflow-wrap: anywhere; }
.commands {
  flex: none;
  display: grid;
  grid-template-columns: 1fr 8px 1fr;
  padding: 24px 25px 25px;
  background: var(--w-solid-background-fill-color-base);
}
.commands[hidden] { display: none; }
.commands.three { grid-template-columns: 1fr 8px 1fr 8px 1fr; }
.commands win-button { width: 100%; min-width: 0; }
.commands win-button[hidden] { display: none; }
`;

export class WinContentDialog extends WinElement {
  static override styles = [scrollbars, dialogCss, css`${materialOverrides('.background')}`];
  static override materialPart = '.background';
  static override template = `<dialog part="dialog"><div class="smoke" part="smoke"></div><div class="layout"><div class="background" part="background" role="document"><div class="top w-scroll" part="content-area"><div class="title" part="title" id="title"><slot name="title"></slot><span class="title-text"></span></div><div class="content" part="content"><slot></slot></div></div><div class="commands" part="commands"><win-button data-kind="primary" part="primary-button"></win-button><win-button data-kind="secondary" part="secondary-button"></win-button><win-button data-kind="close" part="close-button"></win-button></div></div></div></dialog>`;
  static override props: PropDefs = {
    primaryButtonText: { type: String, attribute: 'primary-button-text' },
    secondaryButtonText: { type: String, attribute: 'secondary-button-text' },
    closeButtonText: { type: String, attribute: 'close-button-text' },
    defaultButton: { type: String, attribute: 'default-button', default: 'none' },
    isPrimaryButtonEnabled: { type: Boolean, attribute: 'is-primary-button-enabled', default: true },
    isSecondaryButtonEnabled: { type: Boolean, attribute: 'is-secondary-button-enabled', default: true },
    fullSizeDesired: { type: Boolean, attribute: 'full-size-desired' },
    open: { type: Boolean },
  };
  declare primaryButtonText: string;
  declare secondaryButtonText: string;
  declare closeButtonText: string;
  declare defaultButton: 'none' | ButtonKind;
  declare isPrimaryButtonEnabled: boolean;
  declare isSecondaryButtonEnabled: boolean;
  declare fullSizeDesired: boolean;
  declare open: boolean;

  private _title = '';
  private dialog!: HTMLDialogElement;
  private bg!: HTMLElement;
  private resolve: ((r: ContentDialogResult) => void) | null = null;
  private pending: Promise<ContentDialogResult> | null = null;
  private closing = false;
  private sizeObserver: ResizeObserver | null = null;
  private placeQueued = 0;
  private onWindowResize = () => this.queuePlace();

  static {
    this.define('win-content-dialog');
    Object.defineProperty(this.prototype, 'title', {
      configurable: true,
      get(this: WinContentDialog) {
        return this._title;
      },
      set(this: WinContentDialog, v: string) {
        this._title = String(v ?? '');
        this.syncTitle();
      },
    });
  }

  static override get observedAttributes(): string[] {
    return [...super.observedAttributes, 'title'];
  }

  override attributeChangedCallback(name: string, old: string | null, value: string | null): void {
    if (name === 'title') {
      if (value !== null) {
        this._title = value;
        this.removeAttribute('title');
        this.syncTitle();
      }
      return;
    }
    super.attributeChangedCallback(name, old, value);
  }

  get isOpen(): boolean {
    return this.dialog?.open ?? false;
  }

  protected override firstConnected(): void {
    const t = this.getAttribute('title');
    if (t !== null) {
      this._title = t;
      this.removeAttribute('title');
    }
    this.dialog = this.$<HTMLDialogElement>('dialog');
    this.bg = this.$('.background');
    this.dialog.setAttribute('aria-labelledby', 'title');
    this.dialog.addEventListener('cancel', (ev) => {
      ev.preventDefault();
      void this.invoke('close');
    });
    for (const b of this.$$<HTMLElement>('.commands win-button')) {
      b.addEventListener('click', () => void this.invoke(b.dataset.kind as ButtonKind));
    }
    this.$('slot[name="title"]').addEventListener('slotchange', () => this.syncTitle());
    this.syncTitle();
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (
      changed.has('primaryButtonText') ||
      changed.has('secondaryButtonText') ||
      changed.has('closeButtonText') ||
      changed.has('defaultButton') ||
      changed.has('isPrimaryButtonEnabled') ||
      changed.has('isSecondaryButtonEnabled')
    ) {
      this.syncButtons();
    }
    if (changed.has('open') && !first) {
      if (this.open && !this.isOpen) void this.showAsync();
      else if (!this.open && this.isOpen) this.hide();
    } else if (first && this.open) {
      queueMicrotask(() => void this.showAsync());
    }
  }

  private syncTitle(): void {
    if (!this.isInitialized) return;
    const text = this.$('.title-text');
    text.textContent = this._title;
    const slotted = this.$<HTMLSlotElement>('slot[name="title"]').assignedNodes().length > 0;
    this.$('.title').classList.toggle('empty', !this._title && !slotted);
  }

  private syncButtons(): void {
    const btn = (k: ButtonKind) =>
      this.$<HTMLElement & { disabled: boolean; appearance: string }>(`win-button[data-kind="${k}"]`);
    const p = btn('primary');
    const s = btn('secondary');
    const c = btn('close');
    p.textContent = this.primaryButtonText;
    s.textContent = this.secondaryButtonText;
    c.textContent = this.closeButtonText;
    p.hidden = !this.primaryButtonText;
    s.hidden = !this.secondaryButtonText;
    c.hidden = !this.closeButtonText;
    p.disabled = !this.isPrimaryButtonEnabled;
    s.disabled = !this.isSecondaryButtonEnabled;
    for (const [k, b] of [
      ['primary', p],
      ['secondary', s],
      ['close', c],
    ] as const) {
      b.appearance = this.defaultButton === k ? 'accent' : 'standard';
    }
    const visible = [p, s, c].filter((b) => !b.hidden);
    const commands = this.$('.commands');
    commands.hidden = visible.length === 0;
    commands.classList.toggle('three', visible.length === 3);
    for (const b of [p, s, c]) b.style.gridColumn = '';
    if (visible.length === 1) visible[0]!.style.gridColumn = '3';
    else if (visible.length === 2) {
      visible[0]!.style.gridColumn = '1';
      visible[1]!.style.gridColumn = '3';
    } else if (visible.length === 3) {
      p.style.gridColumn = '1';
      s.style.gridColumn = '3';
      c.style.gridColumn = '5';
    }
  }

  protected override disconnected(): void {
    this.unwatchSize();
  }

  private place(): void {
    if (!this.dialog?.open) return;
    const st = this.bg.style;
    const s = pixelStep();
    st.left = st.top = '0px';
    st.minWidth = st.minHeight = '';
    const cs = getComputedStyle(this.bg);
    const w = Number.parseFloat(cs.width) || this.bg.offsetWidth;
    const h = Number.parseFloat(cs.height) || this.bg.offsetHeight;
    const area = this.$('.layout').getBoundingClientRect();
    const sw = Math.ceil(w / s - 0.01) * s;
    const sh = Math.ceil(h / s - 0.01) * s;
    st.minWidth = `${sw}px`;
    st.minHeight = `${sh}px`;
    st.left = `${Math.max(0, Math.round((area.width - sw) / 2 / s) * s)}px`;
    st.top = `${Math.max(0, Math.round((area.height - sh) / 2 / s) * s)}px`;
  }

  private queuePlace(): void {
    if (this.placeQueued) return;
    this.placeQueued = requestAnimationFrame(() => {
      this.placeQueued = 0;
      this.place();
    });
  }

  private watchSize(): void {
    if (!this.sizeObserver) {
      let first = true;
      this.sizeObserver = new ResizeObserver(() => {
        if (first) first = false;
        else this.queuePlace();
      });
    }
    for (const sel of ['.title', '.content', '.commands']) this.sizeObserver.observe(this.$(sel));
    addEventListener('resize', this.onWindowResize);
  }

  private unwatchSize(): void {
    this.sizeObserver?.disconnect();
    this.sizeObserver = null;
    if (this.placeQueued) cancelAnimationFrame(this.placeQueued);
    this.placeQueued = 0;
    removeEventListener('resize', this.onWindowResize);
  }

  showAsync(): Promise<ContentDialogResult> {
    if (!this.isConnected) document.body.append(this);
    if (!this.isInitialized) this.connectedCallback();
    if (this.pending) return this.pending;
    this.syncButtons();
    this.closing = false;
    this.pending = new Promise<ContentDialogResult>((r) => (this.resolve = r));
    this.dialog.showModal();
    if (!this.open) this.open = true;
    this.place();
    this.watchSize();
    const bg = this.bg;
    animate(this.$('.smoke'), [{ opacity: 0 }, { opacity: 1 }], { duration: durations.faster, easing: easings.linear });
    animate(bg, [{ opacity: 0 }, { opacity: 1 }], {
      duration: durations.faster,
      easing: easings.linear,
      fill: 'backwards',
    });
    animate(bg, [{ transform: 'scale(1.05)' }, { transform: 'none' }], {
      duration: durations.normal,
      easing: easings.decelerate,
    });
    const def =
      this.defaultButton !== 'none' ? this.$<HTMLElement>(`win-button[data-kind="${this.defaultButton}"]`) : null;
    const target =
      def && !def.hidden
        ? def
        : (tabbables(this)[0] ?? this.$$<HTMLElement>('.commands win-button').find((b) => !b.hidden));
    requestAnimationFrame(() => target?.focus({ preventScroll: true }));
    this.emit('opened', undefined, { bubbles: false });
    return this.pending;
  }

  hide(): void {
    void this.close('none');
  }

  private async invoke(kind: ButtonKind): Promise<void> {
    if (!this.isOpen || this.closing) return;
    if (kind === 'close' && this.closeButtonText === '' && !this.isOpen) return;
    const deferrals: Promise<void>[] = [];
    const detail = {
      get cancel() {
        return cancelled;
      },
      set cancel(v: boolean) {
        cancelled = v;
      },
      getDeferral(): { complete(): void } {
        let complete!: () => void;
        deferrals.push(new Promise<void>((r) => (complete = r)));
        return { complete };
      },
    };
    let cancelled = false;
    const ok = this.emit(`${kind}buttonclick`, detail, { cancelable: true, bubbles: false });
    if (deferrals.length) await Promise.all(deferrals);
    if (!ok || cancelled) return;
    await this.close(kind === 'close' ? 'none' : kind);
  }

  private async close(result: ContentDialogResult): Promise<void> {
    if (!this.isOpen || this.closing) return;
    let cancelled = false;
    const deferrals: Promise<void>[] = [];
    const ok = this.emit(
      'closing',
      {
        result,
        get cancel() {
          return cancelled;
        },
        set cancel(v: boolean) {
          cancelled = v;
        },
        getDeferral(): { complete(): void } {
          let complete!: () => void;
          deferrals.push(new Promise<void>((r) => (complete = r)));
          return { complete };
        },
      },
      { cancelable: true, bubbles: false },
    );
    if (deferrals.length) await Promise.all(deferrals);
    if (!ok || cancelled) return;
    this.closing = true;
    const smoke = this.$('.smoke');
    const bg = this.bg;
    const from = visualState(bg);
    animate(smoke, [{ opacity: visualState(smoke).opacity }, { opacity: 0 }], {
      duration: durations.faster,
      easing: easings.linear,
      fill: 'forwards',
    });
    animate(bg, [{ opacity: from.opacity }, { opacity: 0 }], {
      duration: durations.faster,
      easing: easings.linear,
      fill: 'forwards',
    });
    await settled(
      animate(bg, [{ transform: from.transform }, { transform: 'scale(1.05)' }], {
        duration: durations.fast,
        easing: easings.decelerate,
        fill: 'forwards',
      }),
    );
    this.unwatchSize();
    this.dialog.close();
    for (const el of [smoke, bg]) for (const a of el.getAnimations()) a.cancel();
    this.closing = false;
    if (this.open) this.open = false;
    const r = this.resolve;
    this.resolve = null;
    this.pending = null;
    r?.(result);
    this.emit('closed', { result }, { bubbles: false });
  }
}

export function showContentDialog(opts: {
  title?: string;
  content?: string | Node;
  primaryButtonText?: string;
  secondaryButtonText?: string;
  closeButtonText?: string;
  defaultButton?: 'none' | ButtonKind;
}): Promise<ContentDialogResult> {
  const d = document.createElement('win-content-dialog') as WinContentDialog;
  if (opts.title) d.setAttribute('title', opts.title);
  if (opts.primaryButtonText) d.setAttribute('primary-button-text', opts.primaryButtonText);
  if (opts.secondaryButtonText) d.setAttribute('secondary-button-text', opts.secondaryButtonText);
  if (opts.closeButtonText) d.setAttribute('close-button-text', opts.closeButtonText);
  if (opts.defaultButton) d.setAttribute('default-button', opts.defaultButton);
  if (typeof opts.content === 'string') d.innerHTML = `<p style="margin:0">${escapeHtml(opts.content)}</p>`;
  else if (opts.content) d.append(opts.content);
  document.body.append(d);
  return d.showAsync().then((r) => {
    d.remove();
    return r;
  });
}

declare global {
  interface HTMLElementTagNameMap {
    'win-content-dialog': WinContentDialog;
  }
}
