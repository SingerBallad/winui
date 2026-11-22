import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { glyph, iconHtml } from '../../base/icons.ts';
import { animate, durations, easings, settled } from '../../motion/animate.ts';

export type InfoBarSeverity = 'informational' | 'success' | 'warning' | 'error';
export type InfoBarCloseReason = 'close-button' | 'programmatic';

const SEVERITY_GLYPH: Record<InfoBarSeverity, string> = {
  informational: '<path class="g" d="M8 7.05V10.6"/><circle class="gf" cx="8" cy="4.75" r=".9"/>',
  success: '<path class="g" d="M5.65 8.15L7.45 9.85L10.55 6.75"/>',
  warning: '<path class="g" d="M8 4.45V8.35"/><circle class="gf" cx="8" cy="10.75" r=".9"/>',
  error: '<path class="g" d="M6.15 6.15L9.85 9.85M9.85 6.15L6.15 9.85"/>',
};

const LAYOUT_PROPS = ['heading', 'titleText', 'message', 'closable', 'icon', 'iconVisible', 'severity'];

export function severityIconSvg(severity: InfoBarSeverity, size = 16): string {
  return `<svg class="sev" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><circle class="bg" cx="8" cy="8" r="7.5"/>${SEVERITY_GLYPH[severity]}</svg>`;
}

const infoBarCss = css`
:host {
  display: block;
  --_bg: var(--w-system-fill-color-attention-background);
  --_icon-bg: var(--w-system-fill-color-attention);
}
:host(:not([open]):not([data-w-closing])) { display: none; }
:host([severity="success"]) { --_bg: var(--w-system-fill-color-success-background); --_icon-bg: var(--w-system-fill-color-success); }
:host([severity="warning"]) { --_bg: var(--w-system-fill-color-caution-background); --_icon-bg: var(--w-system-fill-color-caution); }
:host([severity="error"]) { --_bg: var(--w-system-fill-color-critical-background); --_icon-bg: var(--w-system-fill-color-critical); }

.root {
  box-sizing: border-box;
  background: var(--w-info-bar-background, var(--_bg));
  border: 1px solid var(--w-card-stroke-color-default);
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-primary);
  overflow: hidden;
  user-select: none;
  -webkit-user-select: none;
}
.grid {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-rows: auto auto;
  min-height: 48px;
  padding-inline-start: 16px;
  border-radius: inherit;
}

.icon {
  grid-column: 1;
  grid-row: 1;
  align-self: start;
  width: 16px;
  height: 16px;
  margin-block: 16px;
  margin-inline-end: 14px;
  display: inline-flex;
  align-items: center;
  justify-content: center;
}
.icon[hidden] { display: none; }
.sev { display: block; overflow: visible; }
.sev .bg { fill: var(--_icon-bg); }
.sev .g { fill: none; stroke: var(--w-text-fill-color-inverse); stroke-width: 1.2; stroke-linecap: round; stroke-linejoin: round; }
.sev .gf { fill: var(--w-text-fill-color-inverse); }
.user-icon { display: none; width: 16px; height: 16px; align-items: center; justify-content: center; overflow: hidden; }
.icon[data-user] .user-icon { display: inline-flex; }
.icon[data-user] .sev { display: none; }
::slotted([slot="icon"]) { max-width: 16px; max-height: 16px; font-size: 16px; }

.panel {
  grid-column: 2;
  grid-row: 1;
  display: flex;
  min-width: 0;
  margin-inline-end: 16px;
}
.panel > [hidden] { display: none; }
.title {
  font: var(--w-type-body-strong);
  overflow-wrap: break-word;
}
.message {
  font: var(--w-type-body);
  overflow-wrap: break-word;
  min-width: 0;
}
.action { display: flex; align-items: flex-start; }
.action ::slotted(win-hyperlink-button) { margin-inline-start: -12px; }

.panel[data-orientation="horizontal"] { flex-direction: row; align-items: flex-start; }
.panel[data-orientation="horizontal"] > .title { margin-top: 14px; white-space: nowrap; }
.panel[data-orientation="horizontal"] > .message { margin-top: 14px; white-space: nowrap; }
.panel[data-orientation="horizontal"] > .action { margin-top: 8px; flex: none; }
.panel[data-orientation="horizontal"] > .title:not([hidden]) ~ .message { margin-inline-start: 12px; }
.panel[data-orientation="horizontal"] > :is(.title, .message):not([hidden]) ~ .action { margin-inline-start: 16px; }

.panel[data-orientation="vertical"] { flex-direction: column; align-items: flex-start; padding: 14px 0 18px; }
.panel[data-orientation="vertical"] > .title:not([hidden]) ~ .message { margin-top: 4px; }
.panel[data-orientation="vertical"] > :is(.title, .message):not([hidden]) ~ .action { margin-top: 12px; }

.measure {
  grid-column: 2;
  grid-row: 1;
  align-self: start;
  height: 0;
  margin-inline-end: 16px;
  visibility: hidden;
  pointer-events: none;
}

.close {
  grid-column: 3;
  grid-row: 1;
  align-self: start;
  width: 38px;
  height: 38px;
  margin: 5px;
  padding: 0;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: var(--w-text-fill-color-primary);
  cursor: default;
  outline: none;
  transition: background-color var(--w-duration-faster) linear;
}
.close:hover { background: var(--w-subtle-fill-color-secondary); }
.close:active { background: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-secondary); }
${focusRing('.close:focus-visible', 3)}
:host([closable="false"]) .close { display: none; }

.content {
  grid-column: 2 / 4;
  grid-row: 2;
  min-width: 0;
  margin-inline-end: 16px;
  user-select: text;
  -webkit-user-select: text;
}
.content:not([data-has]) { display: none; }
`;

export class WinInfoBar extends WinElement {
  static override styles = [infoBarCss];
  static override template = `<div class="root" part="root">
  <div class="grid">
    <span class="icon" part="icon"><span class="sev-host"></span><span class="user-icon"><span class="icon-spec"></span><slot name="icon"></slot></span></span>
    <div class="panel" part="panel" data-orientation="horizontal">
      <div class="title" part="title"></div>
      <div class="message" part="message"><span class="msg-text"></span><slot name="message"></slot></div>
      <div class="action" part="action"><slot name="action"></slot></div>
    </div>
    <div class="measure" aria-hidden="true"></div>
    <button class="close" part="close-button" type="button" aria-label="关闭">${glyph('cancel', 16)}</button>
    <div class="content" part="content"><slot></slot></div>
  </div>
</div>`;
  static override props: PropDefs = {
    open: { type: Boolean },
    severity: { type: String, reflect: true, default: 'informational' },
    heading: { type: String },
    titleText: { type: String, attribute: 'title' },
    message: { type: String },
    closable: { type: Boolean, default: true },
    iconVisible: { type: Boolean, attribute: 'icon-visible', default: true },
    icon: { type: String },
  };
  declare open: boolean;
  declare severity: InfoBarSeverity;
  declare heading: string;
  declare titleText: string;
  declare message: string;
  declare closable: boolean;
  declare iconVisible: boolean;
  declare icon: string;

  static {
    this.define('win-info-bar');
  }

  private resizeObs: ResizeObserver | null = null;
  private mutationObs: MutationObserver | null = null;
  private observedActions: Element[] = [];
  private readonly onFontsLoaded = () => this.layoutPanel();
  private lastCloseReason: InfoBarCloseReason = 'programmatic';
  private suppressCloseEvents = false;
  private wasOpen = false;
  private closingAnim: Animation | null = null;

  protected override firstConnected(): void {
    this.$('.close').addEventListener('click', () => this.requestClose());
    for (const s of this.$$<HTMLSlotElement>('slot')) s.addEventListener('slotchange', () => this.syncSlots());
    this.resizeObs = new ResizeObserver(() => this.layoutPanel());
    this.mutationObs = new MutationObserver((records) => {
      if (records.some((r) => this.affectsPanel(r))) this.layoutPanel();
    });
  }

  protected override connected(): void {
    this.resizeObs?.observe(this.$('.measure'));
    this.observeActions();
    this.mutationObs?.observe(this, { childList: true, subtree: true, characterData: true, attributes: true });
    document.fonts?.addEventListener('loadingdone', this.onFontsLoaded);
    this.layoutPanel();
  }

  protected override disconnected(): void {
    this.resizeObs?.disconnect();
    this.observedActions = [];
    this.mutationObs?.disconnect();
    document.fonts?.removeEventListener('loadingdone', this.onFontsLoaded);
  }

  private observeActions(): void {
    const ro = this.resizeObs;
    if (!ro || !this.isConnected) return;
    const now = this.$<HTMLSlotElement>('slot[name="action"]').assignedElements();
    for (const el of this.observedActions) if (!now.includes(el)) ro.unobserve(el);
    for (const el of now) if (!this.observedActions.includes(el)) ro.observe(el);
    this.observedActions = now;
  }

  private affectsPanel(r: MutationRecord): boolean {
    if (r.type === 'attributes' && /^(aria-|data-w-|data-pressed$|tabindex$)/.test(r.attributeName ?? '')) return false;
    for (let n: Node | null = r.target; n && n !== this; n = n.parentNode) {
      if (n.parentNode === this) return n instanceof Element && (n.slot === 'message' || n.slot === 'action');
    }
    return false;
  }

  requestClose(): void {
    if (!this.open) return;
    this.emit('closebuttonclick');
    this.close('close-button');
  }

  private close(reason: InfoBarCloseReason): void {
    if (!this.emit('closing', { reason }, { cancelable: true })) return;
    this.lastCloseReason = reason;
    this.suppressCloseEvents = true;
    this.open = false;
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('severity') || first) {
      const sev = (['informational', 'success', 'warning', 'error'] as const).includes(this.severity)
        ? this.severity
        : 'informational';
      this.$('.sev-host').innerHTML = severityIconSvg(sev);
      this.aria('role', sev === 'error' ? 'alert' : 'status');
    }
    if (changed.has('heading') || changed.has('titleText')) {
      const t = this.heading || this.titleText || '';
      const el = this.$('.title');
      el.textContent = t;
      el.hidden = !t;
      if (t) this.setAttribute('aria-label', t);
      else this.removeAttribute('aria-label');
    }
    if (changed.has('message')) this.$('.msg-text').textContent = this.message ?? '';
    if (changed.has('icon') || changed.has('iconVisible')) this.$('.icon-spec').innerHTML = iconHtml(this.icon, 16);
    if (first || LAYOUT_PROPS.some((p) => changed.has(p))) this.syncSlots();
    if (changed.has('open')) this.onOpenChanged(first);
  }

  private syncSlots(): void {
    const iconSlot = this.$<HTMLSlotElement>('slot[name="icon"]').assignedNodes().length > 0;
    const icon = this.$('.icon');
    icon.hidden = !this.iconVisible;
    icon.toggleAttribute('data-user', !!this.icon || iconSlot);
    const msgSlot = this.$<HTMLSlotElement>('slot[name="message"]').assignedNodes().length > 0;
    this.$('.message').hidden = !this.message && !msgSlot;
    const action = this.$<HTMLSlotElement>('slot[name="action"]').assignedElements().length > 0;
    this.$('.action').hidden = !action;
    const content = this.$<HTMLSlotElement>('.content slot')
      .assignedNodes()
      .some((n) => n.nodeType === Node.ELEMENT_NODE || (n.textContent ?? '').trim());
    this.$('.content').toggleAttribute('data-has', content);
    this.observeActions();
    this.layoutPanel();
  }

  private layoutPanel(): void {
    const panel = this.$('.panel');
    if (!panel || !this.isConnected || panel.getClientRects().length === 0) return;
    const kids = Array.from(panel.children).filter((c) => !(c as HTMLElement).hidden) as HTMLElement[];
    if (kids.length === 0) return;
    const prev = panel.dataset.orientation;
    panel.dataset.orientation = 'horizontal';
    const avail = panel.clientWidth;
    let total = 0;
    let tallest = 0;
    kids.forEach((k, i) => {
      const w = k.scrollWidth;
      const cls = k.classList;
      const ml = i === 0 ? 0 : cls.contains('message') ? 12 : cls.contains('action') ? 16 : 0;
      total += w + ml;
      const mt = cls.contains('action') ? 8 : 14;
      tallest = Math.max(tallest, k.offsetHeight + mt);
    });
    const vertical = kids.length === 1 || total > avail || tallest > 48;
    const next = vertical ? 'vertical' : 'horizontal';
    panel.dataset.orientation = next;
    if (prev !== next) this.emit('orientationchange', { orientation: next }, { bubbles: false });
  }

  private onOpenChanged(first: boolean): void {
    const root = this.$('.root');
    if (this.open) {
      const closing = this.closingAnim;
      const fromH = closing ? root.getBoundingClientRect().height : 0;
      const fromO = closing ? Number(getComputedStyle(root).opacity) || 0 : 0;
      this.closingAnim = null;
      closing?.cancel();
      this.removeAttribute('data-w-closing');
      this.layoutPanel();
      if (!first && !this.wasOpen) {
        const h = root.offsetHeight;
        animate(
          root,
          [
            { height: `${fromH}px`, opacity: fromO, transform: closing ? 'none' : 'translateY(-4px)' },
            { height: `${h}px`, opacity: 1, transform: 'none' },
          ],
          { duration: durations.normal, easing: easings.decelerate },
        );
      }
    } else if (this.wasOpen) {
      if (!this.suppressCloseEvents) {
        if (!this.emit('closing', { reason: 'programmatic' }, { cancelable: true })) {
          this.open = true;
          return;
        }
        this.lastCloseReason = 'programmatic';
      }
      this.suppressCloseEvents = false;
      const reason = this.lastCloseReason;
      this.setAttribute('data-w-closing', '');
      const h = root.getBoundingClientRect().height;
      const o = Number(getComputedStyle(root).opacity);
      this.closingAnim = animate(
        root,
        [
          { height: `${h}px`, opacity: Number.isNaN(o) ? 1 : o },
          { height: '0px', opacity: 0 },
        ],
        { duration: durations.fast, easing: easings.decelerate, fill: 'forwards' },
      );
      const anim = this.closingAnim;
      void settled(anim).then(() => {
        if (this.closingAnim !== anim) return;
        anim.cancel();
        this.closingAnim = null;
        this.removeAttribute('data-w-closing');
        this.emit('closed', { reason });
      });
    }
    this.wasOpen = this.open;
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-info-bar': WinInfoBar;
  }
}
