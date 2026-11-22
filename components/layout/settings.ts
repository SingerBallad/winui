import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { glyph, iconHtml } from '../../base/icons.ts';
import { keyboardActivation } from '../../base/keyboard.ts';
import { animate, durations, easings, settled } from '../../motion/animate.ts';

const WRAP_THRESHOLD = 476;
const WRAP_NO_ICON_THRESHOLD = 286;

const contentDefaults = `
::slotted(win-combo-box), ::slotted(win-slider), ::slotted(win-text-box) { min-width: 120px; }
::slotted(win-toggle-switch[content-placement="left"]) { margin-block: -2px; }
`;

const cardCss = css`
:host {
  display: block;
  box-sizing: border-box;
  min-width: 148px;
}
.card {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  grid-template-areas: "icon text content action";
  align-items: center;
  box-sizing: border-box;
  min-height: 68px;
  padding: 16px;
  border: 1px solid var(--w-card-stroke-color-default);
  border-radius: var(--w-corner-radius-control);
  background-color: var(--w-card-background-fill-color-default);
  background-clip: padding-box;
  color: var(--w-text-fill-color-primary);
  user-select: none;
  -webkit-user-select: none;
  transition: background-color var(--w-duration-faster) linear, border-color var(--w-duration-faster) linear;
}
.hicon {
  grid-area: icon;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  margin: 0 20px 0 2px;
  max-width: 20px;
  max-height: 20px;
  color: var(--w-text-fill-color-primary);
}
:host(:not([data-w-has-icon])) .hicon { display: none; }
.hicon ::slotted(*) { max-width: 20px; max-height: 20px; }
.text {
  grid-area: text;
  min-width: 0;
  display: flex;
  flex-direction: column;
  justify-content: center;
  margin-inline-end: 24px;
}
.header { font: var(--w-type-body); overflow-wrap: anywhere; }
.desc {
  font: var(--w-type-caption);
  color: var(--w-text-fill-color-secondary);
  overflow-wrap: anywhere;
}
:host(:not([data-w-has-desc])) .desc { display: none; }
.content {
  grid-area: content;
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
  min-width: 0;
}
:host(:not([data-w-has-content])) .content { display: none; }
${contentDefaults}
.action {
  grid-area: action;
  display: none;
  align-items: center;
  justify-content: center;
  margin-inline-start: 14px;
  color: var(--w-text-fill-color-primary);
  width: 13px;
  height: 13px;
}
:host([is-click-enabled]:not([action-icon-visible="false"])) .action { display: inline-flex; }
:host(:dir(rtl)) .action .w-glyph[data-glyph^="chevronRight"] { scale: -1 1; }

:host([data-w-wrap]) .card {
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas: "icon text action" ". content action";
}
:host([data-w-wrap]) .text { margin-inline-end: 0; }
:host([data-w-wrap]) .content { justify-content: flex-start; margin-top: 8px; }
:host([data-w-wrap="no-icon"]) .hicon { display: none; }
:host([content-alignment="left"]) .card {
  grid-template-columns: minmax(0, 1fr) auto;
  grid-template-areas: "content action";
}
:host([content-alignment="left"]) .hicon, :host([content-alignment="left"]) .text { display: none; }
:host([content-alignment="left"]) .content { justify-content: flex-start; }
:host([content-alignment="vertical"]) .card {
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas: "icon text action" ". content action";
}
:host([content-alignment="vertical"]) .text { margin-inline-end: 0; }
:host([content-alignment="vertical"]) .content { justify-content: flex-start; margin-top: 8px; }

:host([is-click-enabled]) .card { cursor: default; }
:host([is-click-enabled]:hover) .card {
  background-color: var(--w-control-fill-color-secondary);
  border-color: var(--w-control-elevation-border);
}
:host([is-click-enabled]:active) .card,
:host([is-click-enabled][data-pressed]) .card {
  background-color: var(--w-control-fill-color-tertiary);
  border-color: var(--w-control-stroke-color-default);
  color: var(--w-text-fill-color-secondary);
}
:host([is-click-enabled]:active) .action,
:host([is-click-enabled][data-pressed]) .action { color: var(--w-text-fill-color-secondary); }
.action { transition: translate var(--w-duration-fast) var(--w-ease-decelerate); }
:host([is-click-enabled]:hover) .action { translate: 2px 0; }
:host([is-click-enabled]:dir(rtl):hover) .action { translate: -2px 0; }
:host([disabled]) { pointer-events: none; }
:host([disabled]) .card {
  background-color: var(--w-control-fill-color-disabled);
  border-color: var(--w-control-stroke-color-default);
  color: var(--w-text-fill-color-disabled);
}
:host([disabled]) .desc, :host([disabled]) .hicon, :host([disabled]) .action { color: var(--w-text-fill-color-disabled); }
:host(:focus-visible) { outline: none; }
${focusRing(':host(:focus-visible) .card', 3)}

:host([data-w-expander-item]) .card {
  min-height: 52px;
  padding-block: 8px;
  padding-inline: 58px 44px;
  border: 0;
  border-radius: 0;
  background-color: transparent;
}
:host([data-w-expander-item]:not([data-w-first-item])) .card { border-top: 1px solid var(--w-card-stroke-color-default); }
:host([data-w-expander-item="no-icon"]) .card { padding-inline-start: 16px; }
:host([data-w-expander-item][is-click-enabled]) .card { padding-inline-end: 16px; }
:host([data-w-expander-item][is-click-enabled]:hover) .card { background-color: var(--w-subtle-fill-color-secondary); }
:host([data-w-expander-item][is-click-enabled]:active) .card { background-color: var(--w-subtle-fill-color-tertiary); }
:host([data-w-expander-item]) .hicon { display: none; }
`;

abstract class SettingsHeaderBase extends WinElement {
  static override props: PropDefs = {
    header: { type: String },
    description: { type: String },
    headerIcon: { type: String, attribute: 'header-icon' },
    disabled: { type: Boolean },
  };
  declare header: string;
  declare description: string;
  declare headerIcon: string;
  declare disabled: boolean;

  private ro: ResizeObserver | null = null;
  private lastWidth = -1;
  private autoToggles = new Set<Element>();

  protected override firstConnected(): void {
    for (const slot of this.$$<HTMLSlotElement>('slot')) {
      slot.addEventListener('slotchange', () => this.syncSlots());
    }
    this.ro = new ResizeObserver(() => this.syncWrap());
  }

  protected override connected(): void {
    this.lastWidth = -1;
    this.ro?.observe(this);
  }

  protected override disconnected(): void {
    this.ro?.disconnect();
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('header')) this.$('.header-text').textContent = this.header ?? '';
    if (changed.has('description')) this.$('.desc-text').textContent = this.description ?? '';
    if (changed.has('headerIcon')) this.$('.hicon-spec').innerHTML = iconHtml(this.headerIcon, 20);
    if (changed.has('disabled')) this.aria('aria-disabled', this.disabled ? 'true' : null);
    this.syncSlots();
  }

  protected abstract contentSlot(): HTMLSlotElement;

  protected syncSlots(): void {
    const has = (name: string) =>
      (
        this.renderRoot.querySelector<HTMLSlotElement>(`slot[name="${name}"]`)?.assignedNodes({ flatten: true }) ?? []
      ).some((n) => n.nodeType === 1 || (n.textContent ?? '').trim());
    this.toggleAttr('data-w-has-icon', !!this.headerIcon || has('header-icon'));
    this.toggleAttr('data-w-has-desc', !!this.description || has('description'));
    const content = this.contentSlot().assignedNodes({ flatten: true });
    this.toggleAttr(
      'data-w-has-content',
      content.some((n) => n.nodeType === 1 || (n.textContent ?? '').trim()),
    );
    this.syncToggles(content);
    this.lastWidth = -1;
    this.syncWrap();
  }

  private syncToggles(content: Node[]): void {
    const now = new Set<Element>();
    for (const n of content) {
      if (!(n instanceof Element)) continue;
      const found = n.localName === 'win-toggle-switch' ? [n] : Array.from(n.querySelectorAll('win-toggle-switch'));
      for (const t of found) {
        if (t !== n && t.parentElement?.closest('win-settings-card, win-settings-expander') !== this) continue;
        now.add(t);
        const placement = t.getAttribute('content-placement');
        if (placement === null) {
          t.setAttribute('content-placement', 'left');
          t.setAttribute('data-w-auto-placement', '');
        } else if (placement !== 'left') {
          t.removeAttribute('data-w-auto-placement');
        }
      }
    }
    for (const t of this.autoToggles) {
      if (now.has(t) || !t.hasAttribute('data-w-auto-placement')) continue;
      t.removeAttribute('data-w-auto-placement');
      if (t.getAttribute('content-placement') === 'left') t.removeAttribute('content-placement');
    }
    this.autoToggles = now;
  }

  protected wrapWidth(): number {
    return this.getBoundingClientRect().width;
  }

  private syncWrap(): void {
    const w = this.wrapWidth();
    if (w <= 0 || Math.abs(w - this.lastWidth) < 0.5) return;
    this.lastWidth = w;
    const align = this.getAttribute('content-alignment');
    let state: string | null = null;
    if (!align || align === 'right') {
      if (w < WRAP_NO_ICON_THRESHOLD) state = 'no-icon';
      else if (w < WRAP_THRESHOLD) state = 'wrap';
    }
    if (state) this.toggleAttr('data-w-wrap', true, state);
    else this.removeAttribute('data-w-wrap');
  }
}

const HEADER_PARTS = `
  <span class="hicon" part="header-icon"><span class="hicon-spec"></span><slot name="header-icon"></slot></span>
  <span class="text" part="text">
    <span class="header" part="header"><span class="header-text"></span><slot name="header"></slot></span>
    <span class="desc" part="description"><span class="desc-text"></span><slot name="description"></slot></span>
  </span>`;

export class WinSettingsCard extends SettingsHeaderBase {
  static override styles = [cardCss];
  static override template = `<div class="card" part="card">${HEADER_PARTS}
  <span class="content" part="content"><slot></slot></span>
  <span class="action" part="action-icon"></span>
</div>`;
  static override props: PropDefs = {
    isClickEnabled: { type: Boolean, attribute: 'is-click-enabled' },
    actionIcon: { type: String, attribute: 'action-icon' },
    actionIconVisible: { type: Boolean, attribute: 'action-icon-visible', default: true },
    contentAlignment: { type: String, attribute: 'content-alignment', reflect: true, default: 'right' },
  };
  declare isClickEnabled: boolean;
  declare actionIcon: string;
  declare actionIconVisible: boolean;
  declare contentAlignment: 'right' | 'left' | 'vertical';

  static {
    this.define('win-settings-card');
  }

  constructor() {
    super();
    this.addEventListener(
      'click',
      (ev) => {
        if (this.disabled) {
          ev.stopImmediatePropagation();
          ev.preventDefault();
        }
      },
      true,
    );
  }

  protected override contentSlot(): HTMLSlotElement {
    return this.$<HTMLSlotElement>('.content slot');
  }

  protected override firstConnected(): void {
    super.firstConnected();
    keyboardActivation(this, () => this.disabled || !this.isClickEnabled);
  }

  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    if (changed.has('isClickEnabled') || changed.has('disabled')) {
      if (this.isClickEnabled) {
        this.setAttribute('role', 'button');
        this.setFocusable(!this.disabled);
      } else {
        if (!this.hasAttribute('data-w-expander-item')) this.setAttribute('role', 'group');
        else if (this.getAttribute('role') === 'button') this.removeAttribute('role');
        if (this.hasAttribute('tabindex')) this.removeAttribute('tabindex');
      }
    }
    if (changed.has('actionIcon')) {
      this.$('.action').innerHTML = this.actionIcon ? iconHtml(this.actionIcon, 13) : glyph('chevronRightMed', 13);
    }
    if (changed.has('header')) this.aria('aria-label', this.header || null);
    if (changed.has('contentAlignment') && !first) this.syncSlots();
  }
}

const expanderCss = css`
:host { display: block; min-width: 148px; }
.header-row {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto auto;
  grid-template-areas: "icon text content chevron";
  align-items: center;
  box-sizing: border-box;
  min-height: 68px;
  padding: 16px 0 16px 16px;
  border: 1px solid var(--w-card-stroke-color-default);
  border-radius: var(--w-corner-radius-control);
  background-color: var(--w-card-background-fill-color-default);
  background-clip: padding-box;
  color: var(--w-text-fill-color-primary);
  cursor: default;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
  transition: background-color var(--w-duration-faster) linear;
}
:host([data-w-open]) .header-row { border-radius: var(--w-corner-radius-control) var(--w-corner-radius-control) 0 0; }
.header-row:hover { background-color: var(--w-control-fill-color-secondary); }
.header-row:active, .header-row[data-pressed] { background-color: var(--w-control-fill-color-tertiary); }
${focusRing('.header-row:focus-visible', 3)}
.hicon { grid-area: icon; display: inline-flex; margin: 0 20px 0 2px; max-width: 20px; max-height: 20px; }
:host(:not([data-w-has-icon])) .hicon { display: none; }
.hicon ::slotted(*) { max-width: 20px; max-height: 20px; }
.text { grid-area: text; min-width: 0; display: flex; flex-direction: column; margin-inline-end: 24px; }
.header { font: var(--w-type-body); overflow-wrap: anywhere; }
.desc { font: var(--w-type-caption); color: var(--w-text-fill-color-secondary); overflow-wrap: anywhere; }
:host(:not([data-w-has-desc])) .desc { display: none; }
.content { grid-area: content; display: flex; align-items: center; justify-content: flex-end; gap: 8px; min-width: 0; }
:host(:not([data-w-has-content])) .content { display: none; }
${contentDefaults}
:host([data-w-wrap]) .header-row {
  grid-template-columns: auto minmax(0, 1fr) auto;
  grid-template-areas: "icon text chevron" ". content chevron";
}
:host([data-w-wrap]) .text { margin-inline-end: 0; }
:host([data-w-wrap]) .content { justify-content: flex-start; margin-top: 8px; }
:host([data-w-wrap="no-icon"]) .hicon { display: none; }
.chevron {
  grid-area: chevron;
  display: inline-grid;
  place-items: center;
  width: 32px;
  height: 32px;
  margin-inline: 4px 8px;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-primary);
}
.header-row:hover .chevron { background: var(--w-subtle-fill-color-secondary); }
.header-row:active .chevron, .header-row[data-pressed] .chevron { background: var(--w-subtle-fill-color-tertiary); }
.chevron svg { transition: rotate var(--w-duration-normal) var(--w-ease-decelerate); }
:host([is-expanded]) .chevron svg { rotate: 180deg; transition-duration: var(--w-duration-slow); }

.clip {
  display: none;
  flex-direction: column;
  justify-content: flex-end;
  overflow: clip;
  border-radius: 0 0 var(--w-corner-radius-control) var(--w-corner-radius-control);
}
:host([data-w-open]) .clip { display: flex; }
:host([data-w-open]:not([data-w-animating])) .clip { overflow: visible; }
.items {
  flex: none;
  box-sizing: border-box;
  border: 1px solid var(--w-card-stroke-color-default);
  border-top: 0;
  border-radius: 0 0 var(--w-corner-radius-control) var(--w-corner-radius-control);
  background-color: var(--w-card-background-fill-color-secondary);
  background-clip: padding-box;
}
.items-header ::slotted(*), .list ::slotted(*), .items-footer ::slotted(*) { display: block; }
.list ::slotted(:not([data-w-first-item]):not(win-settings-card)) { border-top: 1px solid var(--w-card-stroke-color-default); }
.items-footer ::slotted(*) { border-top: 1px solid var(--w-card-stroke-color-default); }
:host([disabled]) { pointer-events: none; }
:host([disabled]) .header-row { background-color: var(--w-control-fill-color-disabled); color: var(--w-text-fill-color-disabled); }
:host([disabled]) .desc { color: var(--w-text-fill-color-disabled); }
`;

export class WinSettingsExpander extends SettingsHeaderBase {
  static override styles = [expanderCss];
  static override template = `<div class="header-row" part="header" role="button" tabindex="0" aria-expanded="false">${HEADER_PARTS}
  <span class="content" part="content"><slot name="content"></slot></span>
  <span class="chevron" part="chevron" aria-hidden="true">${glyph('chevronDown', 12)}</span>
</div>
<div class="clip" part="clip"><div class="items" part="items" role="region"><div class="items-header"><slot name="items-header"></slot></div><div class="list"><slot></slot></div><div class="items-footer"><slot name="items-footer"></slot></div></div></div>`;
  static override props: PropDefs = {
    isExpanded: { type: Boolean, attribute: 'is-expanded' },
  };
  declare isExpanded: boolean;

  private anim: Animation | null = null;

  static {
    this.define('win-settings-expander');
  }

  protected override contentSlot(): HTMLSlotElement {
    return this.$<HTMLSlotElement>('slot[name="content"]');
  }

  protected override firstConnected(): void {
    super.firstConnected();
    const header = this.$('.header-row');
    keyboardActivation(
      header,
      () => this.disabled,
      (p) => header.toggleAttribute('data-pressed', p),
    );
    header.addEventListener('click', (ev) => {
      const contentSlot = this.contentSlot();
      const path = ev.composedPath();
      const inContent = path.some(
        (n) => n instanceof Element && n.getAttribute('slot') === 'content' && n.parentElement === this,
      );
      if (inContent || path.includes(contentSlot)) return;
      if (this.disabled) return;
      this.isExpanded = !this.isExpanded;
      this.emit(this.isExpanded ? 'expanded' : 'collapsed');
    });
    const items = this.$('.items');
    items.id = `${this.id || 'sx'}-items-${Math.random().toString(36).slice(2, 7)}`;
    header.setAttribute('aria-controls', items.id);
  }

  protected override wrapWidth(): number {
    return this.getBoundingClientRect().width - 42;
  }

  protected override syncSlots(): void {
    super.syncSlots();
    const indent = this.hasAttribute('data-w-has-icon') ? '' : 'no-icon';
    const hasItemsHeader = this.$<HTMLSlotElement>('slot[name="items-header"]').assignedElements().length > 0;
    const list = this.$<HTMLSlotElement>('.list slot').assignedElements();
    list.forEach((c, i) => {
      c.toggleAttribute('data-w-first-item', i === 0 && !hasItemsHeader);
      if (c.localName === 'win-settings-card' && c.getAttribute('data-w-expander-item') !== indent) {
        c.setAttribute('data-w-expander-item', indent);
      }
    });
  }

  protected override updated(changed: Set<string>, first = false): void {
    super.updated(changed, first);
    if (changed.has('header')) {
      this.$('.header-row').setAttribute('aria-label', this.header || '');
      this.$('.items').setAttribute('aria-label', this.header || '');
    }
    if (changed.has('disabled')) this.$('.header-row').tabIndex = this.disabled ? -1 : 0;
    if (changed.has('isExpanded')) this.toggle(this.isExpanded, first);
  }

  private focusInItems(): boolean {
    const root = this.getRootNode() as Document | ShadowRoot;
    const ae = root.activeElement;
    if (!ae || ae === this || !this.contains(ae)) return false;
    let top: Element = ae;
    while (top.parentElement && top.parentElement !== this) top = top.parentElement;
    const slot = top.getAttribute('slot');
    return slot === null || slot === 'items-header' || slot === 'items-footer';
  }

  private toggle(open: boolean, instant: boolean): void {
    const clip = this.$('.clip');
    const items = this.$('.items');
    const header = this.$('.header-row');
    header.setAttribute('aria-expanded', String(open));
    if (!open && this.focusInItems()) header.focus();
    if (instant || !this.isConnected) {
      this.anim?.cancel();
      this.anim = null;
      this.removeAttribute('data-w-animating');
      this.toggleAttr('data-w-open', open);
      return;
    }
    const from = this.hasAttribute('data-w-open') ? clip.getBoundingClientRect().height : 0;
    this.toggleAttr('data-w-open', true);
    this.toggleAttr('data-w-animating', true);
    const to = open ? items.offsetHeight : 0;
    const a = animate(clip, [{ height: `${from}px` }, { height: `${to}px` }], {
      duration: open ? durations.slow : durations.normal,
      easing: easings.decelerate,
      fill: open ? 'none' : 'forwards',
    });
    this.anim = a;
    void settled(a).then(() => {
      if (this.anim !== a) return;
      this.anim = null;
      this.removeAttribute('data-w-animating');
      if (!this.isExpanded) {
        this.toggleAttr('data-w-open', false);
        a.cancel();
      }
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-settings-card': WinSettingsCard;
    'win-settings-expander': WinSettingsExpander;
  }
}
