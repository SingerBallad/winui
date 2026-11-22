import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { animate, durations } from '../../motion/animate.ts';
import './progress.ts';

const DEFAULT_SANDBOX = 'allow-scripts allow-forms allow-popups allow-modals';

const webViewCss = css`
:host {
  display: block;
  position: relative;
  min-width: 48px;
  min-height: 48px;
  background: var(--w-web-view-background, #ffffff);
  overflow: hidden;
}
iframe { position: absolute; inset: 0; width: 100%; height: 100%; border: 0; background: transparent; color-scheme: normal; }
.loading {
  position: absolute;
  inset: 0;
  display: none;
  align-items: center;
  justify-content: center;
  background: var(--w-web-view-background, #ffffff);
}
:host([data-w-loading]) .loading { display: flex; }
.loading win-progress-ring { --w-progress-ring-foreground: var(--w-accent-fill-color-default); }
`;

export class WinWebFrame extends WinElement {
  static override styles = [webViewCss];
  static override template = `<iframe part="frame" title="Web content" referrerpolicy="no-referrer"></iframe><div class="loading" part="loading"><win-progress-ring></win-progress-ring></div>`;
  static override props: PropDefs = {
    source: { type: String },
    sandbox: { type: String, default: DEFAULT_SANDBOX },
    allow: { type: String },
    label: { type: String },
  };
  declare source: string;
  declare sandbox: string;
  declare allow: string;
  declare label: string;

  private frame!: HTMLIFrameElement;
  private pendingUri = '';
  private navToken = 0;
  private html: string | null = null;

  static {
    this.define('win-web-frame');
  }

  get frameElement(): HTMLIFrameElement {
    return this.frame;
  }

  get canGoBack(): boolean {
    try {
      return (this.frame.contentWindow?.history.length ?? 0) > 1;
    } catch {
      return false;
    }
  }

  get canGoForward(): boolean {
    return false;
  }

  protected override firstConnected(): void {
    this.frame = this.$('iframe');
    this.frame.addEventListener('load', () => {
      const ok = true;
      const uri = this.pendingUri;
      this.removeAttribute('data-w-loading');
      animate(this.frame, [{ opacity: 0 }, { opacity: 1 }], { duration: durations.fast, easing: 'linear' });
      this.emit('navigationcompleted', { uri, isSuccess: ok }, { bubbles: false });
    });
    this.frame.addEventListener('error', () => {
      this.removeAttribute('data-w-loading');
      this.emit('navigationcompleted', { uri: this.pendingUri, isSuccess: false }, { bubbles: false });
    });
    this.frame.setAttribute('sandbox', this.sandbox ?? DEFAULT_SANDBOX);
    this.applyHtml();
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('sandbox')) this.frame.setAttribute('sandbox', this.sandbox ?? DEFAULT_SANDBOX);
    if (changed.has('allow')) {
      if (this.allow) this.frame.setAttribute('allow', this.allow);
      else this.frame.removeAttribute('allow');
    }
    if (changed.has('label')) this.frame.title = this.label || 'Web content';
    if (changed.has('source') && (this.source || !first)) this.load(this.source ?? '');
  }

  navigate(uri: string): void {
    this.source = uri;
  }

  navigateToString(html: string): void {
    if (!this.emit('navigationstarting', { uri: 'about:srcdoc' }, { cancelable: true, bubbles: false })) return;
    this.html = html;
    this.pendingUri = 'about:srcdoc';
    this.applyHtml();
  }

  private applyHtml(): void {
    if (!this.frame || this.html === null) return;
    this.setAttribute('data-w-loading', '');
    this.frame.removeAttribute('src');
    this.frame.srcdoc = this.html;
  }

  reload(): void {
    if (!this.frame) return;
    try {
      this.frame.contentWindow?.location.reload();
      this.setAttribute('data-w-loading', '');
    } catch {
      if (this.html !== null) this.navigateToString(this.html);
      else this.load(this.source);
    }
  }

  goBack(): void {
    try {
      this.frame.contentWindow?.history.back();
    } catch {}
  }

  goForward(): void {
    try {
      this.frame.contentWindow?.history.forward();
    } catch {}
  }

  private load(uri: string): void {
    if (!this.frame) return;
    const token = ++this.navToken;
    if (!uri) {
      this.frame.removeAttribute('src');
      return;
    }
    if (!this.emit('navigationstarting', { uri }, { cancelable: true, bubbles: false })) return;
    if (token !== this.navToken) return;
    this.html = null;
    this.pendingUri = uri;
    this.setAttribute('data-w-loading', '');
    this.frame.removeAttribute('srcdoc');
    this.frame.src = uri;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-web-frame': WinWebFrame;
  }
}
