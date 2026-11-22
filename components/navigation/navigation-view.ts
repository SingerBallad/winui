import { WinElement, type PropDefs } from '../../base/element.ts';
import { acrylicSurface, css, focusRing, materialOverrides, scrollbars } from '../../base/css.ts';
import { glyph, iconHtml } from '../../base/icons.ts';
import { Popup, popupResetCss, viewportSize, type PositionResult } from '../../base/popup.ts';
import { deepActiveElement, isRtl, rafThrottle } from '../../base/dom.ts';
import { animate, durations, expandHeight, collapseHeight, menuIn, popupOut, settled } from '../../motion/animate.ts';
import { navButtonCss, navStrings, travelIndicator } from './shared.ts';

const ITEM = 'win-navigation-view-item';
const HEADER = 'win-navigation-view-item-header';
const SEPARATOR = 'win-navigation-view-item-separator';
const NAV_TAGS = new Set([ITEM, HEADER, SEPARATOR]);

const isNavNode = (n: Node): n is Element => n instanceof Element && NAV_TAGS.has(n.localName);
const isItem = (n: unknown): n is WinNavigationViewItem =>
  n instanceof Element && n.localName === ITEM && (n as Partial<WinNavigationViewItem>).ready === true;

const PANE_EASE = 'cubic-bezier(0.2, 0, 0, 1)';

// Chromium does not render composited clip-path animations on this pane, so the clip is driven by a registered property.
const CLIP_PROP = '--w-nv-clip';
let clipAnimatable = false;
try {
  if (typeof CSS !== 'undefined' && 'registerProperty' in CSS) {
    CSS.registerProperty({ name: CLIP_PROP, syntax: '<length>', inherits: false, initialValue: '0px' });
  }
  clipAnimatable = typeof CSS !== 'undefined' && 'registerProperty' in CSS;
} catch {
  clipAnimatable = true;
}

interface PaneSnapshot {
  layout: string;
  open: boolean;
  spacer: number;
  clip: number;
  toggleW: number;
}
const PANE_OPEN_MS = 300;
const PANE_CLOSE_MS = 250;

const INDENT = 31;

export type NavigationViewPaneDisplayMode = 'auto' | 'left' | 'left-compact' | 'left-minimal' | 'top';
export type NavigationViewDisplayMode = 'minimal' | 'compact' | 'expanded';

const itemCss = css`
:host {
  display: block;
  position: relative;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
}
:host([hidden]) { display: none; }
:host([disabled]) { pointer-events: none; }
:host([disabled]) .presenter { opacity: 0.3; }

.presenter {
  position: relative;
  display: flex;
  align-items: center;
  min-height: 36px;
  margin: 2px 4px;
  border-radius: var(--w-corner-radius-control);
  background-color: transparent;
  transition: background-color var(--w-duration-faster) linear;
}
.presenter:hover { background-color: var(--w-subtle-fill-color-secondary); }
.presenter:active, :host([data-pressed]) .presenter {
  background-color: var(--w-subtle-fill-color-tertiary);
  color: var(--w-text-fill-color-secondary);
}
:host([selected]) .presenter { background-color: var(--w-subtle-fill-color-secondary); }
:host([selected]) .presenter:hover { background-color: var(--w-subtle-fill-color-tertiary); }
:host([selected]) .presenter:active { background-color: var(--w-subtle-fill-color-secondary); color: var(--w-text-fill-color-secondary); }
${focusRing(':host(:focus-visible) .presenter', 0)}

.indicator {
  position: absolute;
  left: 0;
  top: 50%;
  width: 3px;
  height: 16px;
  margin-top: -8px;
  border-radius: 2px;
  background: var(--w-accent-fill-color-default);
  opacity: 0;
  pointer-events: none;
  transform-origin: 50% 50%;
}
:host([data-indicator]) .indicator { opacity: 1; }
:host([disabled][data-indicator]) .indicator { background: var(--w-accent-fill-color-disabled); }

.grid {
  display: flex;
  align-items: center;
  flex: 1 1 auto;
  min-width: 0;
  min-height: 36px;
  margin-inline-end: 14px;
  padding-inline-start: calc(var(--nv-depth, 0) * ${INDENT}px);
}
.icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 40px;
  height: 16px;
}
.icon ::slotted(*) { max-width: 16px; max-height: 16px; font-size: 16px; }
:host(:not([data-has-icon])) .icon { width: 8px; visibility: hidden; }
.content {
  flex: 1 1 auto;
  min-width: 0;
  margin: -1px 8px -1px 4px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.text:empty { display: none; }
.badge { display: inline-flex; align-items: center; flex: none; }
.badge:not(.has) { display: none; }
.badge-dot, .badge-value {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  border-radius: 8px;
  background: var(--w-accent-fill-color-default);
  color: var(--w-text-on-accent-fill-color-primary);
  font: 11px/16px var(--w-font-family-small);
}
.badge-dot { width: 4px; height: 4px; border-radius: 2px; }
.badge-value { min-width: 16px; height: 16px; padding: 0 4px; }
.chevron {
  display: none;
  align-items: center;
  justify-content: center;
  flex: none;
  width: 40px;
  height: 36px;
  margin-inline-end: -14px;
  color: var(--w-text-fill-color-primary);
}
:host([data-has-children]) .chevron { display: inline-flex; }
.chevron .w-glyph { transition: transform var(--w-duration-normal) var(--w-ease-decelerate); }
:host([expanded][data-children="inline"]) .chevron .w-glyph { transform: rotate(180deg); }

:host([data-narrow]) .chevron { visibility: hidden; }
:host([data-narrow]) .badge.has {
  position: absolute;
  top: 2px;
  left: 26px;
  animation: nv-badge-in var(--w-duration-fast) var(--w-ease-decelerate);
}
@keyframes nv-badge-in { from { opacity: 0; scale: 0.6; } }
:host([data-narrow]) .presenter { width: calc(var(--nv-compact, 48px) - 8px); }
:host([data-narrow]) .grid { margin-inline-end: 0; }
:host([data-narrow]) .content, :host([data-narrow]) .chevron { display: none; }

.children-inline { display: none; }
:host([expanded][data-children="inline"]) .children-inline { display: block; }
.children-list { display: flex; flex-direction: column; }
${popupResetCss('.children-flyout')}
.flyout-presenter {
  box-sizing: border-box;
  min-width: 200px;
  max-height: min(758px, var(--w-popup-max-height, 758px));
  padding: 2px 0;
  overflow: auto;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-flyout);
}

:host([data-mode="top"]) { display: inline-flex; height: 100%; flex: none; }
:host([data-mode="top"]) .presenter { min-height: 0; height: calc(100% - 4px); margin: 2px 4px; }
:host([data-mode="top"][selected]) .presenter { background-color: transparent; }
:host([data-mode="top"][selected]) .presenter:hover { background-color: var(--w-subtle-fill-color-secondary); }
:host([data-mode="top"][selected]) .presenter:active { background-color: var(--w-subtle-fill-color-tertiary); }
:host([data-mode="top"]) .grid { margin: 0; padding: 0; min-height: 0; height: 100%; }
:host([data-mode="top"]) .icon { width: 16px; margin-inline-start: 12px; }
:host([data-mode="top"]:not([data-has-icon])) .icon { display: none; }
:host([data-mode="top"]) .content { margin: -1px 12px -1px 8px; overflow: visible; }
:host([data-mode="top"]:not([data-has-icon])) .content { margin: 0 12px; }
:host([data-mode="top"][data-icon-only]) .content { display: none; }
:host([data-mode="top"][data-icon-only]) .icon { margin: 0 12px; }
:host([data-mode="top"]) .chevron { margin-inline-start: -16px; margin-inline-end: 0; height: 100%; }
:host([data-mode="top"]) .badge.has { margin: 0 2px 13px -16px; }
:host([data-mode="top"]) .indicator {
  top: auto;
  bottom: 4px;
  left: 50%;
  width: 16px;
  height: 3px;
  margin: 0 0 0 -8px;
}

:host([data-mode="overflow"]) .content { margin: -1px 20px -1px 12px; }
:host([data-mode="overflow"]:not([data-has-icon])) .content { margin: -1px 20px -1px 16px; }
:host([data-mode="overflow"]) .icon { margin-inline-start: 0; }

:host([data-settings]) .icon .w-glyph { transition: transform var(--w-duration-slower) var(--w-ease-decelerate); }
:host([data-settings]) .presenter:hover .icon .w-glyph { transform: rotate(60deg); }
:host([data-settings]) .presenter:active .icon .w-glyph { transform: rotate(90deg); transition-duration: var(--w-duration-fast); }
`;

export class WinNavigationViewItem extends WinElement {
  static override styles = [scrollbars, itemCss];
  static override shadowInit: ShadowRootInit = { mode: 'open', slotAssignment: 'manual' };
  static override template = `
<div class="presenter" part="presenter">
  <span class="indicator" part="selection-indicator"></span>
  <span class="grid">
    <span class="icon" part="icon"><span class="icon-spec"></span><slot class="icon-slot"></slot></span>
    <span class="content" part="content"><span class="text"></span><slot class="content-slot"></slot></span>
    <span class="badge" part="info-badge"><span class="badge-spec"></span><slot class="badge-slot"></slot></span>
    <span class="chevron" part="chevron" aria-hidden="true">${glyph('chevronDownSmall', 12)}</span>
  </span>
</div>
<div class="children-inline"></div>
<div class="children-flyout" part="children-flyout"><div class="flyout-presenter w-scroll"></div></div>
<div class="children-list" role="group"><slot class="children-slot"></slot></div>`;

  static override props: PropDefs = {
    content: { type: String },
    icon: { type: String, reflect: true },
    tag: { type: String, reflect: true },
    selected: { type: Boolean },
    expanded: { type: Boolean },
    disabled: { type: Boolean },
    selectsOnInvoked: { type: Boolean, attribute: 'selects-on-invoked', default: true },
    hasUnrealizedChildren: { type: Boolean, attribute: 'has-unrealized-children' },
    infoBadge: { type: String, attribute: 'info-badge' },
  };
  declare content: string;
  declare icon: string;
  declare tag: string;
  declare selected: boolean;
  declare expanded: boolean;
  declare disabled: boolean;
  declare selectsOnInvoked: boolean;
  declare hasUnrealizedChildren: boolean;
  declare infoBadge: string;

  private iconSlot!: HTMLSlotElement;
  private contentSlot!: HTMLSlotElement;
  private badgeSlot!: HTMLSlotElement;
  private childrenSlot!: HTMLSlotElement;
  private childrenList!: HTMLElement;
  private inlineHost!: HTMLElement;
  private flyoutEl!: HTMLElement;
  private flyoutPopup: Popup | null = null;
  private mo: MutationObserver | null = null;
  private lastChildrenMode = '';

  static {
    this.define(ITEM);
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

  get ready(): boolean {
    return this.isInitialized;
  }

  get menuItems(): WinNavigationViewItem[] {
    return Array.from(this.children).filter(isItem);
  }

  get menuNodes(): Element[] {
    return Array.from(this.children).filter(isNavNode);
  }

  get hasChildren(): boolean {
    return this.hasUnrealizedChildren || this.menuNodes.length > 0;
  }

  get indicatorElement(): HTMLElement {
    return this.$('.indicator');
  }

  get depth(): number {
    let d = 0;
    for (let p = this.parentElement; p && p.localName === ITEM; p = p.parentElement) d++;
    return d;
  }

  get parentItem(): WinNavigationViewItem | null {
    return isItem(this.parentElement) ? this.parentElement : null;
  }

  protected override firstConnected(): void {
    this.iconSlot = this.$('.icon-slot');
    this.contentSlot = this.$('.content-slot');
    this.badgeSlot = this.$('.badge-slot');
    this.childrenSlot = this.$('.children-slot');
    this.childrenList = this.$('.children-list');
    this.inlineHost = this.$('.children-inline');
    this.flyoutEl = this.$('.children-flyout');
    this.inlineHost.append(this.childrenList);
    if (!this.hasAttribute('role')) this.setAttribute('role', 'treeitem');
    this.tabIndex = -1;

    const presenter = this.$('.presenter');
    presenter.addEventListener('click', (ev) => {
      if (this.disabled) return;
      const chevron = (ev.composedPath() as Element[]).some(
        (n) => n instanceof Element && n.classList?.contains('chevron'),
      );
      this.invoke(!!chevron && this.getAttribute('data-children') === 'inline');
    });
    this.addEventListener('keydown', (ev) => {
      if (ev.target !== this || this.disabled) return;
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        if (ev.key === ' ') {
          this.toggleAttribute('data-pressed', true);
          return;
        }
        this.invoke(false);
      }
    });
    this.addEventListener('keyup', (ev) => {
      if (ev.key === ' ' && this.hasAttribute('data-pressed')) {
        this.removeAttribute('data-pressed');
        this.invoke(false);
      }
    });
    this.addEventListener('blur', () => this.removeAttribute('data-pressed'));

    this.mo = new MutationObserver(() => this.assignSlots());
    this.mo.observe(this, { childList: true, attributes: true, attributeFilter: ['slot'], subtree: false });
    this.assignSlots();
  }

  private assignSlots(): void {
    const icon: Element[] = [];
    const badge: Element[] = [];
    const kids: Element[] = [];
    const content: (Element | Text)[] = [];
    for (const n of Array.from(this.childNodes)) {
      if (n instanceof Element) {
        const slot = n.getAttribute('slot');
        if (slot === 'icon') icon.push(n);
        else if (slot === 'info-badge') badge.push(n);
        else if (NAV_TAGS.has(n.localName)) kids.push(n);
        else content.push(n);
      } else if (n instanceof Text) content.push(n);
    }
    this.iconSlot.assign(...icon);
    this.badgeSlot.assign(...badge);
    this.childrenSlot.assign(...kids);
    this.contentSlot.assign(...content);
    this.syncIcon();
    this.syncBadge();
    this.toggleAttribute('data-has-children', this.hasChildren);
    this.syncAria();
    this.dispatchEvent(new CustomEvent('win-nav-structure', { bubbles: true, composed: true }));
  }

  private syncIcon(): void {
    const spec = this.$('.icon-spec');
    spec.innerHTML = iconHtml(this.icon, 16);
    const has = !!this.icon || this.iconSlot.assignedElements().length > 0;
    this.toggleAttribute('data-has-icon', has);
  }

  private syncBadge(): void {
    const spec = this.$('.badge-spec');
    const v = this.infoBadge;
    if (v === 'dot') spec.innerHTML = '<span class="badge-dot"></span>';
    else if (v) spec.innerHTML = `<span class="badge-value">${WinElement.esc(v)}</span>`;
    else spec.innerHTML = '';
    this.$('.badge').classList.toggle('has', !!v || this.badgeSlot.assignedElements().length > 0);
  }

  private syncAria(): void {
    if (this.hasChildren) this.aria('aria-expanded', this.expanded ? 'true' : 'false');
    else this.removeAttribute('aria-expanded');
    this.aria('aria-selected', this.selected ? 'true' : 'false');
    this.aria('aria-current', this.selected ? 'page' : null);
    this.aria('aria-disabled', this.disabled ? 'true' : null);
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('content')) this.$('.text').textContent = this.content;
    if (changed.has('icon')) this.syncIcon();
    if (changed.has('infoBadge')) this.syncBadge();
    if (changed.has('hasUnrealizedChildren')) this.toggleAttribute('data-has-children', this.hasChildren);
    if (changed.has('selected') || changed.has('disabled') || changed.has('expanded')) this.syncAria();
    if (changed.has('expanded') && !first) this.applyExpansion(true);
  }

  setPresentation(
    mode: 'left' | 'top' | 'overflow',
    children: 'inline' | 'flyout',
    depth: number,
    compact: boolean,
  ): void {
    if (this.getAttribute('data-mode') !== mode) this.setAttribute('data-mode', mode);
    if (this.getAttribute('data-children') !== children) this.setAttribute('data-children', children);
    this.style.setProperty('--nv-depth', String(depth));
    this.toggleAttribute('data-compact', compact);
    if (this.lastChildrenMode !== children) {
      this.lastChildrenMode = children;
      if (children === 'flyout') {
        if (this.expanded) this.expanded = false;
        this.inlineHost.textContent = '';
        this.flyoutEl.querySelector('.flyout-presenter')!.append(this.childrenList);
      } else {
        this.flyoutPopup?.close('programmatic');
        this.inlineHost.append(this.childrenList);
      }
    }
  }

  private invoke(chevronOnly: boolean): void {
    this.dispatchEvent(
      new CustomEvent('win-nav-item-invoke', { bubbles: true, composed: true, detail: { item: this, chevronOnly } }),
    );
  }

  setExpanded(v: boolean): void {
    if (v === this.expanded || !this.hasChildren) return;
    this.expanded = v;
    this.emit(v ? 'expanding' : 'collapsed', { item: this });
  }

  private applyExpansion(animateIt: boolean): void {
    const mode = this.getAttribute('data-children');
    if (mode === 'flyout') {
      if (this.expanded) this.openFlyout();
      else this.flyoutPopup?.close('programmatic');
      return;
    }
    if (!animateIt) return;
    const host = this.inlineHost;
    if (this.expanded) {
      expandHeight(host, durations.normal);
    } else {
      host.style.display = 'block';
      void settled(collapseHeight(host, durations.fast)).then(() => {
        host.style.display = '';
      });
    }
    this.dispatchEvent(new CustomEvent('win-nav-structure', { bubbles: true, composed: true }));
  }

  private openFlyout(): void {
    if (!this.flyoutPopup) this.flyoutPopup = new Popup(this.flyoutEl, this.$('.flyout-presenter'));
    if (this.flyoutPopup.isOpen) return;
    const top = this.getAttribute('data-mode') === 'top';
    const presenter = this.$('.presenter');
    const rtl = isRtl(this);
    const compactLen = Number.parseFloat(getComputedStyle(this).getPropertyValue('--nv-compact')) || 48;
    const position = (size: { width: number; height: number }, r0: DOMRect): PositionResult => {
      const r = this.hasAttribute('data-compact')
        ? new DOMRect(r0.left, r0.top, Math.min(r0.width, compactLen - 8), r0.height)
        : r0;
      const { width: vw, height: vh } = viewportSize();
      let x = rtl ? r.left - size.width - 4 : r.right + 8;
      if (!rtl && x + size.width > vw - 8) x = r.left - size.width - 4;
      const y = Math.max(8, Math.min(r.top - 4, vh - 8 - size.height));
      return {
        x: Math.round(x),
        y: Math.round(y),
        side: rtl ? 'left' : 'right',
        maxHeight: vh - 16,
        maxWidth: vw - 16,
      };
    };
    this.flyoutPopup.open({
      anchor: presenter,
      placement: top ? 'bottom-start' : rtl ? 'left-start' : 'right-start',
      offset: 4,
      focus: 'none',
      ...(top ? {} : { position }),
      animateIn: (s, side) => menuIn(s, side === 'top' ? 'top' : 'bottom', this.childrenList),
      animateOut: (s) => popupOut(s),
      onClosed: () => {
        if (this.expanded) {
          this.expanded = false;
          this.emit('collapsed', { item: this });
        }
      },
    });
  }

  closeFlyout(): void {
    this.flyoutPopup?.close('programmatic');
  }
}

export class WinNavigationViewItemHeader extends WinElement {
  static override styles = [
    css`
      :host { display: block; overflow: hidden; }
      .inner {
        display: flex;
        align-items: center;
        height: 40px;
        margin: 0 16px;
        font: 600 14px/19px var(--w-font-family-text);
        color: var(--w-text-fill-color-secondary);
        white-space: nowrap;
        overflow: hidden;
        text-overflow: ellipsis;
        transition: height var(--w-duration-fast) var(--w-ease-decelerate), opacity var(--w-duration-faster) linear;
      }
      :host([data-compact]) .inner { height: 0; opacity: 0; }
      :host([data-mode="top"]) { display: inline-flex; align-items: center; height: 100%; }
      :host([data-mode="top"]) .inner { margin: 0 12px; height: auto; }
    `,
  ];
  static override template = `<div class="inner" part="header"><span class="text"></span><slot></slot></div>`;
  static override props: PropDefs = {
    content: { type: String },
  };
  declare content: string;
  static {
    this.define(HEADER);
  }
  protected override firstConnected(): void {
    this.setAttribute('role', 'presentation');
  }
  protected override updated(changed: Set<string>): void {
    if (changed.has('content')) this.$('.text').textContent = this.content;
  }
}

export class WinNavigationViewItemSeparator extends WinElement {
  static override styles = [
    css`
      :host { display: block; }
      .line { height: 1px; margin: 3px 0 4px; background: var(--w-divider-stroke-color-default); }
      :host([data-mode="top"]) { display: inline-flex; align-items: center; height: 100%; }
      :host([data-mode="top"]) .line { width: 1px; height: 24px; margin: 0 4px 0 3px; }
    `,
  ];
  static override template = `<div class="line" part="line"></div>`;
  static {
    this.define(SEPARATOR);
  }
  protected override firstConnected(): void {
    this.setAttribute('role', 'separator');
  }
}

const navCss = css`
:host {
  display: block;
  position: relative;
  height: 100%;
  min-height: 0;
  overflow: hidden;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  --nv-open: 320px;
  --nv-compact: 48px;
  --nv-top-area: 44px;
}
.root { position: relative; display: grid; grid-template-columns: var(--nv-spacer, 0px) minmax(0, 1fr); grid-template-rows: auto minmax(0, 1fr); height: 100%; }

.buttons {
  position: absolute;
  top: 0;
  inset-inline-start: 0;
  z-index: 4;
  display: flex;
  flex-direction: column;
  padding-top: 4px;
}
.buttons[hidden] { display: none; }
:host([data-layout="minimal"]) .buttons { flex-direction: row; }
:host([data-layout="minimal"]) .nav-btn.back { margin: 2px 0 2px 4px; }
:host([data-layout="minimal"][data-back][data-pane="open"][data-w-titled]) .nav-btn.toggle { width: calc(var(--nv-open) - 52px); }
.nav-btn.toggle { justify-content: flex-start; width: auto; min-width: 40px; overflow: hidden; }
.toggle-icon { display: inline-flex; width: 40px; justify-content: center; flex: none; }
.pane-title {
  display: none;
  font: 600 14px/19px var(--w-font-family-text);
  margin-top: -2px;
  padding-inline-end: 8px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
:host([data-pane="open"][data-w-titled]:not([data-layout="top"])) .nav-btn.toggle { width: calc(var(--nv-open) - 8px); }
:host([data-pane="open"]:not([data-layout="top"])) .pane-title:not(:empty),
:host([data-w-closing]:not([data-layout="top"])) .pane-title:not(:empty) { display: block; }

.pane {
  position: absolute;
  top: 0;
  bottom: 0;
  inset-inline-start: 0;
  z-index: 3;
  width: var(--nv-open);
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  padding-top: var(--nv-top-area);
  padding-bottom: 3px;
  background: transparent;
  ${CLIP_PROP}: var(--nv-clip, 0px);
  clip-path: inset(0 var(${CLIP_PROP}) 0 0);
  border-inline-end: 1px solid transparent;
}
:host(:dir(rtl)) .pane { clip-path: inset(0 0 0 var(${CLIP_PROP})); }
:host([data-overlay]) .pane, :host([data-w-closing="overlay"]) .pane {
  ${acrylicSurface}
  border-inline-end-color: var(--w-divider-stroke-color-default);
}
${materialOverrides('.pane', 'pane-material')}
.pane-shadow {
  position: absolute;
  top: 0;
  bottom: 0;
  inset-inline-start: 0;
  width: var(--nv-open);
  z-index: 2;
  pointer-events: none;
  box-shadow: 8px 0 24px -12px rgba(0, 0, 0, 0.32);
  opacity: 0;
}
:host([data-overlay]) .pane-shadow { opacity: 1; }
:host([data-layout="top"]) .pane, :host([data-layout="top"]) .pane-shadow, :host([data-layout="top"]) .buttons { display: none; }
:host([data-pane-hidden]) .pane, :host([data-pane-hidden]) .pane-shadow { display: none; }
:host([data-layout="minimal"][data-pane="closed"]) .pane { visibility: hidden; }
:host([data-narrow]) .pane { width: var(--nv-compact); clip-path: none; overflow: hidden; }

.pane-header {
  position: absolute;
  top: 4px;
  inset-inline-start: 48px;
  inset-inline-end: 4px;
  height: 40px;
  display: flex;
  align-items: center;
}
.pane-header:not(.has) { display: none; }
.asb-area { display: flex; align-items: center; min-height: 40px; margin-bottom: 8px; }
.asb-area:not(.has) { display: none; }
.asb { flex: 1; margin: 0 16px; min-width: 0; }
.asb-btn { display: none; margin-inline-start: 4px; }
:host([data-narrow]) .asb { display: none; }
:host([data-narrow]) .asb-btn { display: inline-flex; }
.custom:not(.has) { display: none; }
.menu {
  flex: 1 1 auto;
  min-height: 0;
  overflow-x: hidden;
  overflow-y: auto;
}
.menu, .footer { scrollbar-width: none; overscroll-behavior: contain; }
.menu::-webkit-scrollbar, .footer::-webkit-scrollbar { display: none; }
.scroll-ind {
  position: absolute;
  top: 0;
  inset-inline-end: 1px;
  z-index: 1;
  width: 2px;
  border-radius: 1px;
  background: var(--w-control-strong-fill-color-default);
  opacity: 0;
  pointer-events: none;
  transition: opacity var(--w-duration-normal) linear;
}
.scroll-ind[data-on] { opacity: 1; transition-duration: var(--w-duration-faster); }
.visual-sep { height: 1px; margin: 0 0 2px; background: var(--w-divider-stroke-color-default); flex: none; }
.visual-sep[hidden] { display: none; }
.pane-footer { margin-bottom: 4px; flex: none; }
.pane-footer:not(.has) { display: none; }
.footer { flex: none; overflow-y: auto; max-height: 50%; }

.top {
  grid-column: 1 / -1;
  grid-row: 1;
  display: none;
  align-items: center;
  height: 48px;
  padding: 0 4px;
  box-sizing: border-box;
  overflow: hidden;
  min-width: 0;
}
:host([data-layout="top"]) .top { display: flex; }
.top > * { flex: none; }
.top .back-slot:not(.has) { display: none; }
.top-pane-header:not(.has), .top-pane-title:empty { display: none; }
.top-pane-title { margin: 0 16px; font: 600 14px/19px var(--w-font-family-text); white-space: nowrap; }
.top-items { display: flex; align-items: stretch; height: 100%; min-width: 0; }
.more { width: auto; padding: 0 8px; gap: 8px; height: 40px; }
.more[hidden] { display: none; }
.more .w-glyph { color: var(--w-text-fill-color-primary); }
.top-custom { flex: 1 1 0; min-width: 48px; display: flex; align-items: center; height: 100%; }
.top-asb { margin: 0 4px; min-width: 216px; display: flex; align-items: center; }
.top-asb:not(.has) { display: none; }
.top-asb > slot::slotted(*) { flex: 1; }
.top-pane-footer:not(.has) { display: none; }
.top-footer { display: flex; align-items: stretch; height: 100%; }
${popupResetCss('.overflow')}
.overflow-presenter {
  box-sizing: border-box;
  min-width: 160px;
  max-height: min(758px, var(--w-popup-max-height, 758px));
  padding: 2px 0;
  overflow: auto;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-flyout);
}

.content-grid {
  grid-column: 2;
  grid-row: 1 / -1;
  position: relative;
  display: flex;
  flex-direction: column;
  min-width: 0;
  min-height: 0;
  box-sizing: border-box;
  background: var(--w-layer-fill-color-default);
  border-top: 1px solid var(--w-card-stroke-color-default);
  border-inline-start: 1px solid var(--w-card-stroke-color-default);
  border-start-start-radius: var(--w-corner-radius-overlay);
  overflow: hidden;
}
:host([data-layout="minimal"]) .content-grid {
  border-inline-start: 0;
  border-start-start-radius: 0;
}
:host([data-layout="top"]) .content-grid {
  grid-column: 1 / -1;
  grid-row: 2;
  border-inline-start: 0;
  border-start-start-radius: 0;
}
:host([content-transparent]) .content-grid { background: transparent; border-color: transparent; }
.header {
  flex: none;
  min-height: 36px;
  margin: 44px 0 0 56px;
  font: 600 28px/37px var(--w-font-family-display);
  display: flex;
  align-items: flex-start;
}
:host([data-layout="minimal"]) .header { margin: 44px 0 0 24px; }
:host([data-layout="top"]) .header { margin: 24px 0 0 56px; }
.header[hidden] { display: none; }
.content {
  flex: 1 1 auto;
  min-height: 0;
  overflow: auto;
  position: relative;
}
:host([content-overflow="visible"]) .content { overflow: visible; }
.light-dismiss {
  position: absolute;
  inset: 0;
  z-index: 2;
  display: none;
}
:host([data-overlay]) .light-dismiss { display: block; }
`;

export class WinNavigationView extends WinElement {
  static override styles = [scrollbars, navButtonCss, navCss];
  static override materialAttributes = ['material', 'pane-material'];
  static override shadowInit: ShadowRootInit = { mode: 'open', slotAssignment: 'manual' };
  static override template = `
<div class="root" part="root">
  <div class="spacer"></div>
  <header class="top" part="top-pane" role="navigation">
    <span class="back-slot"></span>
    <div class="top-pane-header"><slot class="top-pane-header-slot"></slot></div>
    <span class="top-pane-title"></span>
    <div class="top-items" role="tree" aria-orientation="horizontal"><slot class="top-menu-slot"></slot></div>
    <button class="nav-btn more" type="button" hidden aria-haspopup="tree"><span class="more-label"></span>${glyph('chevronDownSmall', 12)}</button>
    <div class="top-custom"><slot class="top-custom-slot"></slot></div>
    <div class="top-asb"><slot class="top-asb-slot"></slot></div>
    <div class="top-pane-footer"><slot class="top-pane-footer-slot"></slot></div>
    <div class="top-footer" role="tree" aria-orientation="horizontal"><slot class="top-footer-slot"></slot><span class="top-settings-host"></span></div>
  </header>
  <div class="content-grid" part="content-grid">
    <div class="header" part="header" hidden><span class="header-text"></span><slot class="header-slot"></slot></div>
    <main class="content" part="content"><slot class="content-slot"></slot></main>
    <div class="light-dismiss"></div>
  </div>
  <div class="pane-shadow" aria-hidden="true"></div>
  <nav class="pane" part="pane">
    <div class="pane-header"><slot class="pane-header-slot"></slot></div>
    <div class="asb-area"><div class="asb"><slot class="asb-slot"></slot></div><button class="nav-btn asb-btn" type="button">${glyph('search', 16)}</button></div>
    <div class="custom"><slot class="custom-slot"></slot></div>
    <div class="menu" role="tree" part="menu-items"><slot class="menu-slot"></slot></div>
    <div class="visual-sep" hidden></div>
    <div class="pane-footer"><slot class="pane-footer-slot"></slot></div>
    <div class="footer" role="tree" part="footer-items"><slot class="footer-slot"></slot><span class="settings-host"></span></div>
  </nav>
  <div class="buttons">
    <button class="nav-btn back" type="button">${glyph('back', 16)}</button>
    <button class="nav-btn toggle" type="button" aria-expanded="false"><span class="toggle-icon">${glyph('globalNav', 16)}</span><span class="pane-title"></span></button>
  </div>
  <div class="overflow" part="overflow-flyout"><div class="overflow-presenter w-scroll" role="tree"><slot class="overflow-slot"></slot></div></div>
</div>`;

  static override props: PropDefs = {
    paneDisplayMode: { type: String, attribute: 'pane-display-mode', reflect: true, default: 'auto' },
    isPaneOpen: { type: Boolean, attribute: 'is-pane-open' },
    openPaneLength: { type: Number, attribute: 'open-pane-length', default: 320 },
    compactPaneLength: { type: Number, attribute: 'compact-pane-length', default: 48 },
    compactModeThresholdWidth: { type: Number, attribute: 'compact-mode-threshold-width', default: 641 },
    expandedModeThresholdWidth: { type: Number, attribute: 'expanded-mode-threshold-width', default: 1008 },
    isBackButtonVisible: { type: String, attribute: 'is-back-button-visible', default: 'auto' },
    isBackEnabled: { type: Boolean, attribute: 'is-back-enabled' },
    isSettingsVisible: { type: Boolean, attribute: 'is-settings-visible', default: true },
    isPaneToggleButtonVisible: { type: Boolean, attribute: 'is-pane-toggle-button-visible', default: true },
    isPaneVisible: { type: Boolean, attribute: 'is-pane-visible', default: true },
    paneTitle: { type: String, attribute: 'pane-title' },
    header: { type: String },
    alwaysShowHeader: { type: Boolean, attribute: 'always-show-header', default: true },
    selectionFollowsFocus: { type: Boolean, attribute: 'selection-follows-focus' },
    overflowLabelMode: { type: String, attribute: 'overflow-label-mode', default: 'more-label' },
    selectedTag: { type: String, attribute: 'selected-tag' },
  };
  declare paneDisplayMode: NavigationViewPaneDisplayMode;
  declare isPaneOpen: boolean;
  declare openPaneLength: number;
  declare compactPaneLength: number;
  declare compactModeThresholdWidth: number;
  declare expandedModeThresholdWidth: number;
  declare isBackButtonVisible: 'auto' | 'visible' | 'collapsed';
  declare isBackEnabled: boolean;
  declare isSettingsVisible: boolean;
  declare isPaneToggleButtonVisible: boolean;
  declare isPaneVisible: boolean;
  declare paneTitle: string;
  declare header: string;
  declare alwaysShowHeader: boolean;
  declare selectionFollowsFocus: boolean;
  declare overflowLabelMode: 'more-label' | 'no-label';
  declare selectedTag: string;

  private slots!: Record<string, HTMLSlotElement>;
  private _settings!: WinNavigationViewItem;
  private _selected: WinNavigationViewItem | null = null;
  private _displayMode: NavigationViewDisplayMode = 'expanded';
  private userClosedExpanded = false;
  private overflowPopup!: Popup;
  private overflowItems: Element[] = [];
  private ro: ResizeObserver | null = null;
  private mo: MutationObserver | null = null;
  private relayoutQueued = false;
  private revealSelected = false;
  private structureFrom: { rect: DOMRect; holder: WinNavigationViewItem } | null = null;
  private initialized = false;
  private paneAnimating: Animation[] = [];

  static {
    this.define('win-navigation-view');
  }

  get displayMode(): NavigationViewDisplayMode {
    return this._displayMode;
  }

  get menuItems(): Element[] {
    return Array.from(this.children).filter((c) => isNavNode(c) && c.getAttribute('slot') !== 'footer');
  }

  get footerMenuItems(): Element[] {
    return Array.from(this.children).filter((c) => isNavNode(c) && c.getAttribute('slot') === 'footer');
  }

  get settingsItem(): WinNavigationViewItem {
    return this._settings;
  }

  get selectedItem(): WinNavigationViewItem | null {
    return this._selected;
  }
  set selectedItem(item: WinNavigationViewItem | null) {
    this.select(item, false);
  }

  get isSettingsSelected(): boolean {
    return !!this._selected && this._selected === this._settings;
  }

  set menuItemsSource(data: NavigationViewItemData[]) {
    for (const c of Array.from(this.children)) if (isNavNode(c)) c.remove();
    const build = (d: NavigationViewItemData): Element => {
      if (d.separator) return document.createElement(SEPARATOR);
      if (d.header) {
        const h = document.createElement(HEADER);
        h.textContent = d.content ?? '';
        return h;
      }
      const it = document.createElement(ITEM) as WinNavigationViewItem;
      if (d.content) it.append(d.content);
      if (d.icon) it.setAttribute('icon', d.icon);
      if (d.tag) it.setAttribute('tag', d.tag);
      if (d.selected) it.setAttribute('selected', '');
      if (d.disabled) it.setAttribute('disabled', '');
      if (d.infoBadge != null) it.setAttribute('info-badge', String(d.infoBadge));
      if (d.selectsOnInvoked === false) it.setAttribute('selects-on-invoked', 'false');
      for (const c of d.children ?? []) it.append(build(c));
      return it;
    };
    for (const d of data) {
      const el = build(d);
      if (d.footer) el.setAttribute('slot', 'footer');
      this.append(el);
    }
  }

  allItems(): WinNavigationViewItem[] {
    const out: WinNavigationViewItem[] = [];
    const walk = (nodes: Iterable<Element>) => {
      for (const n of nodes) {
        if (isItem(n)) {
          out.push(n);
          walk(n.children);
        }
      }
    };
    walk(this.menuItems);
    walk(this.footerMenuItems);
    if (this._settings && this.isSettingsVisible) out.push(this._settings);
    return out;
  }

  expand(item: WinNavigationViewItem): void {
    for (let p: WinNavigationViewItem | null = item; p; p = p.parentItem) p.setExpanded(true);
  }

  collapse(item: WinNavigationViewItem): void {
    item.setExpanded(false);
  }

  private attachScrollIndicator(scroller: HTMLElement): void {
    const thumb = document.createElement('div');
    thumb.className = 'scroll-ind';
    thumb.setAttribute('aria-hidden', 'true');
    this.$('.pane').append(thumb);
    let idle: ReturnType<typeof setTimeout> | null = null;
    const show = () => {
      const ch = scroller.clientHeight;
      const sh = scroller.scrollHeight;
      thumb.hidden = !ch || sh <= ch + 1;
      if (thumb.hidden) return;
      const th = Math.max(16, (ch * ch) / sh);
      const y = scroller.offsetTop + ((ch - th) * scroller.scrollTop) / (sh - ch);
      thumb.style.height = `${th}px`;
      thumb.style.transform = `translateY(${y}px)`;
      thumb.toggleAttribute('data-on', true);
      if (idle) clearTimeout(idle);
      idle = setTimeout(() => thumb.removeAttribute('data-on'), 900);
    };
    scroller.addEventListener('scroll', show, { passive: true });
    scroller.addEventListener('pointermove', show, { passive: true });
  }

  protected override firstConnected(): void {
    const q = (c: string) => this.$<HTMLSlotElement>(`.${c}`);
    this.attachScrollIndicator(this.$('.menu'));
    this.attachScrollIndicator(this.$('.footer'));
    this.slots = {
      menu: q('menu-slot'),
      footer: q('footer-slot'),
      topMenu: q('top-menu-slot'),
      topFooter: q('top-footer-slot'),
      overflow: q('overflow-slot'),
      header: q('header-slot'),
      content: q('content-slot'),
      paneHeader: q('pane-header-slot'),
      topPaneHeader: q('top-pane-header-slot'),
      asb: q('asb-slot'),
      topAsb: q('top-asb-slot'),
      custom: q('custom-slot'),
      topCustom: q('top-custom-slot'),
      paneFooter: q('pane-footer-slot'),
      topPaneFooter: q('top-pane-footer-slot'),
    };
    const s = navStrings(this);
    this._settings = document.createElement(ITEM) as WinNavigationViewItem;
    this._settings.setAttribute('icon', 'chrome:settings');
    this._settings.setAttribute('data-settings', '');
    this._settings.setAttribute('tag', 'settings');
    this._settings.content = s.settings;
    this._settings.setAttribute('aria-label', s.settings);
    this.$('.settings-host').append(this._settings);
    this.$('.more-label').textContent = s.more;
    this.$('.more').setAttribute('aria-label', s.more);
    this.$('.back').setAttribute('aria-label', s.back);
    this.$('.back').title = s.back;
    this.$('.asb-btn').setAttribute('aria-label', s.search);

    this.overflowPopup = new Popup(this.$('.overflow'), this.$('.overflow-presenter'));

    this.$('.toggle').addEventListener('click', () => this.togglePane());
    this.$('.back').addEventListener('click', () => this.emit('backrequested'));
    this.$('.asb-btn').addEventListener('click', () => {
      this.openPane(true);
      requestAnimationFrame(() => {
        const asb = this.slots.asb!.assignedElements()[0] as HTMLElement | undefined;
        asb?.focus();
      });
    });
    this.$('.more').addEventListener('click', () => this.toggleOverflow());
    this.$('.light-dismiss').addEventListener('pointerdown', () => this.closePane());

    this.addEventListener('win-nav-item-invoke', (ev) => {
      const { item, chevronOnly } = (ev as CustomEvent<{ item: WinNavigationViewItem; chevronOnly: boolean }>).detail;
      ev.stopPropagation();
      this.onItemInvoked(item, chevronOnly);
    });
    this.addEventListener('win-nav-structure', () => {
      if (!this.structureFrom) {
        const holder = this.allItems().find((i) => i.hasAttribute('data-indicator'));
        const rect = this.currentIndicatorRect();
        if (holder && rect) this.structureFrom = { rect, holder };
      }
      this.queueRelayout();
    });
    this.addEventListener('keydown', (ev) => this.onKeyDown(ev));
    this.addEventListener('focusin', (ev) => this.onFocusIn(ev));

    this.mo = new MutationObserver(() => {
      this.assignSlots();
      this.queueRelayout();
    });
    this.mo.observe(this, { childList: true, attributes: true, attributeFilter: ['slot'] });

    this.ro = new ResizeObserver(
      rafThrottle(() => {
        this.updateDisplayMode(false);
        this.layoutTopOverflow();
      }),
    );
    this.ro.observe(this);

    this.assignSlots();
    const pre = this.allItems().find((i) => i.hasAttribute('selected'));
    if (pre) this.select(pre, false, true);
    this.initialized = true;
  }

  protected override connected(): void {
    if (this.initialized) this.queueRelayout();
  }

  protected override disconnected(): void {
    this.overflowPopup?.close('programmatic');
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('openPaneLength')) this.style.setProperty('--nv-open', `${this.openPaneLength}px`);
    if (changed.has('compactPaneLength')) this.style.setProperty('--nv-compact', `${this.compactPaneLength}px`);
    if (changed.has('paneTitle')) {
      this.$('.pane-title').textContent = this.paneTitle;
      this.toggleAttribute('data-w-titled', !!this.paneTitle);
      this.$('.top-pane-title').textContent = this.paneTitle;
    }
    if (changed.has('header') || changed.has('alwaysShowHeader')) {
      this.$('.header-text').textContent = this.header;
      this.syncHeader();
    }
    if (changed.has('isSettingsVisible')) {
      this._settings.hidden = !this.isSettingsVisible;
      if (!this.isSettingsVisible && this._selected === this._settings) this.select(null, false);
    }
    if (changed.has('isBackEnabled')) (this.$('.back') as HTMLButtonElement).disabled = !this.isBackEnabled;
    if (changed.has('overflowLabelMode')) this.$('.more-label').hidden = this.overflowLabelMode === 'no-label';
    if (changed.has('selectedTag') && this.selectedTag && !first) {
      const it = this.allItems().find((i) => i.tag === this.selectedTag);
      if (it) this.select(it, false);
    }
    if (
      changed.has('paneDisplayMode') ||
      changed.has('isPaneOpen') ||
      changed.has('isBackButtonVisible') ||
      changed.has('isPaneToggleButtonVisible') ||
      changed.has('isPaneVisible') ||
      changed.has('compactModeThresholdWidth') ||
      changed.has('expandedModeThresholdWidth') ||
      first
    ) {
      const paneChange = changed.has('isPaneOpen') && !first;
      const prevState = this.paneStateSnapshot();
      this.updateDisplayMode(first);
      if (paneChange) this.animatePane(prevState);
    }
    if (first && this.selectedTag) {
      const it = this.allItems().find((i) => i.tag === this.selectedTag);
      if (it) this.select(it, false, true);
    }
  }

  private get isTop(): boolean {
    return this.paneDisplayMode === 'top';
  }

  private assignSlots(): void {
    const top = this.isTop;
    const menu: Element[] = [];
    const footer: Element[] = [];
    const header: (Element | Text)[] = [];
    const content: (Element | Text)[] = [];
    const paneHeader: Element[] = [];
    const asb: Element[] = [];
    const custom: Element[] = [];
    const paneFooter: Element[] = [];
    for (const n of Array.from(this.childNodes)) {
      if (n instanceof Element) {
        const slot = n.getAttribute('slot');
        if (isNavNode(n)) (slot === 'footer' ? footer : menu).push(n);
        else if (slot === 'header') header.push(n);
        else if (slot === 'pane-header') paneHeader.push(n);
        else if (slot === 'auto-suggest-box') asb.push(n);
        else if (slot === 'pane-custom-content') custom.push(n);
        else if (slot === 'pane-footer') paneFooter.push(n);
        else content.push(n);
      } else if (n instanceof Text && n.textContent?.trim()) content.push(n);
    }
    const S = this.slots;
    S.content!.assign(...content);
    S.header!.assign(...header);
    if (top) {
      S.menu!.assign();
      S.footer!.assign();
      S.paneHeader!.assign();
      S.asb!.assign();
      S.custom!.assign();
      S.paneFooter!.assign();
      const overflow = this.overflowItems.filter((i) => menu.includes(i));
      S.topMenu!.assign(...menu.filter((i) => !overflow.includes(i)));
      S.overflow!.assign(...overflow);
      S.topFooter!.assign(...footer);
      S.topPaneHeader!.assign(...paneHeader);
      S.topAsb!.assign(...asb);
      S.topCustom!.assign(...custom);
      S.topPaneFooter!.assign(...paneFooter);
      this.$('.top-settings-host').append(this._settings);
    } else {
      S.topMenu!.assign();
      S.overflow!.assign();
      S.topFooter!.assign();
      S.topPaneHeader!.assign();
      S.topAsb!.assign();
      S.topCustom!.assign();
      S.topPaneFooter!.assign();
      S.menu!.assign(...menu);
      S.footer!.assign(...footer);
      S.paneHeader!.assign(...paneHeader);
      S.asb!.assign(...asb);
      S.custom!.assign(...custom);
      S.paneFooter!.assign(...paneFooter);
      this.$('.settings-host').append(this._settings);
    }
    this.$('.pane-header').classList.toggle('has', paneHeader.length > 0);
    this.$('.top-pane-header').classList.toggle('has', paneHeader.length > 0);
    this.$('.asb-area').classList.toggle('has', asb.length > 0);
    this.$('.top-asb').classList.toggle('has', asb.length > 0);
    this.$('.custom').classList.toggle('has', custom.length > 0);
    this.$('.pane-footer').classList.toggle('has', paneFooter.length > 0);
    this.$('.top-pane-footer').classList.toggle('has', paneFooter.length > 0);
    this.syncHeader();
  }

  private syncHeader(): void {
    if (!this.slots) return;
    const hasHeader = !!this.header || this.slots.header!.assignedNodes().length > 0;
    const show = hasHeader && (this.alwaysShowHeader || this._displayMode === 'minimal');
    this.$('.header').hidden = !show;
  }

  private computeDisplayMode(): NavigationViewDisplayMode {
    switch (this.paneDisplayMode) {
      case 'left':
        return 'expanded';
      case 'left-compact':
        return 'compact';
      case 'left-minimal':
        return 'minimal';
      case 'top':
        return 'minimal';
      default: {
        const w = this.clientWidth || this.getBoundingClientRect().width;
        if (!w) return this._displayMode;
        if (w < this.compactModeThresholdWidth) return 'minimal';
        if (w < this.expandedModeThresholdWidth) return 'compact';
        return 'expanded';
      }
    }
  }

  private paneStateSnapshot(): PaneSnapshot {
    return {
      layout: this.getAttribute('data-layout') ?? '',
      open: this.getAttribute('data-pane') === 'open',
      spacer: Number.parseFloat(this.style.getPropertyValue('--nv-spacer')) || 0,
      clip: Number.parseFloat(this.style.getPropertyValue('--nv-clip')) || 0,
      toggleW: this.shadowRoot ? (this.$('.toggle') as HTMLElement).offsetWidth : 0,
    };
  }

  private updateDisplayMode(first: boolean): void {
    const top = this.isTop;
    const prevMode = this._displayMode;
    const mode = top ? 'minimal' : this.computeDisplayMode();
    const modeChanged = mode !== prevMode || first;
    this._displayMode = top ? 'minimal' : mode;

    if (modeChanged && !top && !first) {
      const shouldOpen = mode === 'expanded' && !this.userClosedExpanded;
      if (this.isPaneOpen !== shouldOpen) {
        this.isPaneOpen = shouldOpen;
        this.flushUpdates();
      }
    }
    if (first && !top && !this.hasAttribute('is-pane-open')) {
      this.isPaneOpen = mode === 'expanded';
    }

    const open = !top && this.isPaneOpen && this.isPaneVisible;
    const layout = top ? 'top' : mode;
    const overlay = !top && open && mode !== 'expanded';
    const strip = !top && !open && mode !== 'minimal' && this.isPaneVisible;
    const openLen = this.openPaneLength;
    const compactLen = this.compactPaneLength;
    let spacer = 0;
    let clip = 0;
    if (!top && this.isPaneVisible) {
      if (mode === 'expanded') {
        spacer = open ? openLen : compactLen;
        clip = open ? 0 : openLen - compactLen;
      } else if (mode === 'compact') {
        spacer = compactLen;
        clip = open ? 0 : openLen - compactLen;
      } else {
        spacer = 0;
        clip = 0;
      }
    }
    this.setAttribute('data-layout', layout);
    this.setAttribute('data-pane', open ? 'open' : 'closed');
    this.toggleAttribute('data-overlay', overlay);
    this.toggleAttribute('data-strip', strip);
    this.toggleAttribute('data-pane-hidden', !this.isPaneVisible);
    this.syncNarrow();
    this.style.setProperty('--nv-spacer', `${spacer}px`);
    this.style.setProperty('--nv-clip', `${clip}px`);

    const backVisible = this.isBackButtonVisible !== 'collapsed';
    const back = this.$('.back');
    const buttons = this.$('.buttons');
    const toggle = this.$('.toggle');
    if (top) {
      if (backVisible) this.$('.back-slot').append(back);
      else buttons.prepend(back);
      this.$('.back-slot').classList.toggle('has', backVisible);
    } else {
      buttons.prepend(back);
    }
    back.hidden = !backVisible;
    toggle.hidden = !this.isPaneToggleButtonVisible || top || !this.isPaneVisible;
    buttons.hidden = top || (!backVisible && toggle.hidden);
    const s = navStrings(this);
    toggle.setAttribute('aria-label', open ? s.closeNav : s.openNav);
    toggle.title = open ? s.closeNav : s.openNav;
    toggle.setAttribute('aria-expanded', String(open));
    const stacked = mode !== 'minimal';
    this.toggleAttribute('data-back', backVisible && !top);
    const topArea =
      4 +
      (stacked ? (backVisible && !top ? 40 : 0) + (toggle.hidden ? 0 : 40) : backVisible || !toggle.hidden ? 40 : 0);
    this.style.setProperty('--nv-top-area', `${Math.max(topArea, 4)}px`);

    if (top) this.relayoutTopHost();
    const routedTop =
      this.slots.topMenu!.assignedElements().length > 0 || this.slots.overflow!.assignedElements().length > 0;
    const routedLeft = this.slots.menu!.assignedElements().length > 0;
    if (
      (top && !routedTop && this.menuItems.length) ||
      (!top && routedTop) ||
      (!top && !routedLeft && this.menuItems.length)
    ) {
      this.assignSlots();
    }
    this.syncHeader();
    this.applyItemPresentation();
    if (modeChanged && !first) this.emit('displaymodechanged', { displayMode: this._displayMode });
    this.queueIndicator();
  }

  private relayoutTopHost(): void {
    this.queueRelayout();
  }

  togglePane(): void {
    if (this.isPaneOpen) this.closePane();
    else this.openPane();
  }

  openPane(fromSearch = false): void {
    if (this.isTop || this.isPaneOpen) return;
    if (!this.emit('paneopening', undefined, { cancelable: true, bubbles: false })) return;
    if (this._displayMode === 'expanded') this.userClosedExpanded = false;
    void fromSearch;
    this.isPaneOpen = true;
    void this.updateComplete.then(() => this.emit('paneopened', undefined, { bubbles: false }));
  }

  closePane(): void {
    if (this.isTop || !this.isPaneOpen) return;
    if (!this.emit('paneclosing', undefined, { cancelable: true, bubbles: false })) return;
    if (this._displayMode === 'expanded') this.userClosedExpanded = true;
    const ae = deepActiveElement();
    this.isPaneOpen = false;
    void this.updateComplete.then(() => {
      if (ae && this.$('.pane').contains(ae as Node)) (this.$('.toggle') as HTMLElement).focus({ preventScroll: true });
      this.emit('paneclosed', undefined, { bubbles: false });
    });
  }

  private syncNarrow(): void {
    const busy = this.paneAnimating.some((a) => a.playState === 'running');
    const v = !busy && this.hasAttribute('data-strip') && this.getAttribute('data-pane') === 'closed';
    if (this.hasAttribute('data-narrow') !== v) {
      this.toggleAttribute('data-narrow', v);
      this.syncNarrowItems();
    }
  }

  private syncNarrowItems(): void {
    const v = this.hasAttribute('data-narrow');
    for (const n of [...this.menuItems, ...this.footerMenuItems]) if (isItem(n)) n.toggleAttribute('data-narrow', v);
    this._settings?.toggleAttribute('data-narrow', v);
  }

  private animatePane(prev: PaneSnapshot): void {
    const pane = this.$('.pane');
    const shadow = this.$('.pane-shadow');
    const content = this.$('.content-grid');
    const toggle = this.$('.toggle') as HTMLElement;
    const interrupted = this.paneAnimating.some((a) => a.playState === 'running');
    const live = interrupted
      ? {
          paneTransform: getComputedStyle(pane).transform,
          paneClip: getComputedStyle(pane).getPropertyValue(CLIP_PROP).trim(),
          shadowTransform: getComputedStyle(shadow).transform,
          shadowOpacity: getComputedStyle(shadow).opacity,
          contentTransform: getComputedStyle(content).transform,
        }
      : null;
    for (const a of this.paneAnimating) a.cancel();
    this.paneAnimating = [];
    this.removeAttribute('data-w-closing');
    pane.style.visibility = '';
    shadow.style.opacity = '';
    const now = this.paneStateSnapshot();
    if (prev.layout !== now.layout || prev.open === now.open) {
      this.syncNarrow();
      return;
    }
    const opening = now.open;
    const overlay = this.hasAttribute('data-overlay') || (!opening && prev.spacer === now.spacer);
    const rtl = isRtl(this);
    const inset = (px: number) => (rtl ? `inset(0 0 0 ${px}px)` : `inset(0 ${px}px 0 0)`);
    const dur = opening ? PANE_OPEN_MS : PANE_CLOSE_MS;
    const easing = PANE_EASE;
    const opts = { duration: dur, easing };
    const from = (liveValue: string | undefined, fallback: string) =>
      liveValue && liveValue !== 'none' ? liveValue : fallback;
    const toggleW = toggle.offsetWidth;
    if (!opening) this.setAttribute('data-w-closing', overlay ? 'overlay' : 'inline');
    const anims: Animation[] = [];
    if (now.layout === 'minimal') {
      const off = `translateX(${rtl ? this.openPaneLength : -this.openPaneLength}px)`;
      pane.style.visibility = 'visible';
      anims.push(
        animate(
          pane,
          opening
            ? [{ transform: from(live?.paneTransform, off) }, { transform: 'none' }]
            : [{ transform: from(live?.paneTransform, 'none') }, { transform: off }],
          { ...opts, fill: opening ? 'none' : 'forwards' },
        ),
      );
    } else {
      anims.push(
        clipAnimatable
          ? animate(
              pane,
              [{ [CLIP_PROP]: from(live?.paneClip, `${prev.clip}px`) }, { [CLIP_PROP]: `${now.clip}px` }],
              opts,
            )
          : animate(pane, [{ clipPath: inset(prev.clip) }, { clipPath: inset(now.clip) }], opts),
      );
    }
    if (prev.toggleW && toggleW && (prev.toggleW !== toggleW || this.hasAttribute('data-w-titled'))) {
      anims.push(animate(toggle, [{ width: `${prev.toggleW}px` }, { width: `${toggleW}px` }], opts));
    }
    if (overlay) {
      const dist = now.layout === 'minimal' ? this.openPaneLength : this.openPaneLength - this.compactPaneLength;
      const off = `translateX(${(rtl ? 1 : -1) * dist}px)`;
      shadow.style.opacity = '1';
      anims.push(
        animate(
          shadow,
          opening
            ? [
                { transform: from(live?.shadowTransform, off), opacity: live ? Number(live.shadowOpacity) : 0 },
                { transform: 'none', opacity: 1 },
              ]
            : [
                { transform: from(live?.shadowTransform, 'none'), opacity: live ? Number(live.shadowOpacity) : 1 },
                { transform: off, opacity: 0 },
              ],
          opts,
        ),
      );
    }
    if (prev.spacer !== now.spacer) {
      const d = (rtl ? -1 : 1) * (prev.spacer - now.spacer);
      const liveX =
        live?.contentTransform && live.contentTransform !== 'none'
          ? new DOMMatrixReadOnly(live.contentTransform).m41
          : 0;
      anims.push(animate(content, [{ transform: `translateX(${liveX + d}px)` }, { transform: 'none' }], opts));
    }
    this.paneAnimating = anims;
    this.syncNarrow();
    void settled(anims[0]).then(() => {
      if (this.paneAnimating !== anims) return;
      for (const a of anims) a.cancel();
      this.paneAnimating = [];
      this.removeAttribute('data-w-closing');
      pane.style.visibility = '';
      shadow.style.opacity = '';
      this.syncNarrow();
      this.queueIndicator();
    });
  }

  private queueRelayout(): void {
    if (this.relayoutQueued) return;
    this.relayoutQueued = true;
    requestAnimationFrame(() => {
      this.relayoutQueued = false;
      if (!this.isConnected) return;
      this.adoptSelection();
      this.applyItemPresentation();
      this.layoutTopOverflow();
      this.updateVisualSeparator();
      const snap = this.structureFrom;
      this.structureFrom = null;
      if (snap && this.indicatorTarget() !== snap.holder) this.syncIndicator(snap.rect);
      else this.queueIndicator();
    });
  }

  private adoptSelection(): void {
    if (this._selected?.isConnected) return;
    const items = this.allItems();
    const pre =
      (this.selectedTag ? items.find((i) => i.tag === this.selectedTag) : undefined) ??
      items.find((i) => i.hasAttribute('selected'));
    if (pre) this.select(pre, false, true);
    else if (this._selected && !this._selected.isConnected) this.select(null, false);
  }

  private applyItemPresentation(): void {
    if (!this.slots) return;
    const top = this.isTop;
    const open = this.getAttribute('data-pane') === 'open';
    const strip = this.hasAttribute('data-strip');
    const overflowSet = new Set(this.slots.overflow!.assignedElements());
    const apply = (nodes: Iterable<Element>, depth: number, inFlyout: boolean, topLevel: boolean) => {
      for (const n of nodes) {
        const inOverflow = overflowSet.has(n);
        let mode: 'left' | 'top' | 'overflow' = 'left';
        if (topLevel && top) mode = inOverflow ? 'overflow' : 'top';
        if (isItem(n)) {
          const childrenMode: 'inline' | 'flyout' =
            inFlyout || inOverflow ? 'inline' : topLevel && (top || (strip && !open)) ? 'flyout' : 'inline';
          n.setPresentation(mode, childrenMode, depth, topLevel && strip && !open);
          const childDepth = childrenMode === 'flyout' ? 0 : depth + 1;
          apply(n.menuNodes, childDepth, inFlyout || childrenMode === 'flyout', false);
        } else {
          n.setAttribute('data-mode', mode === 'overflow' ? 'left' : mode);
          n.toggleAttribute('data-compact', topLevel && strip && !open);
        }
      }
    };
    apply(this.menuItems, 0, false, true);
    apply(this.footerMenuItems, 0, false, true);
    this.syncNarrowItems();
    if (this._settings) {
      this._settings.setPresentation(top ? 'top' : 'left', 'inline', 0, strip && !open);
      this._settings.toggleAttribute('data-icon-only', top);
    }
    this.revealSelectedItem();
    this.syncRoving();
  }

  private revealSelectedItem(): void {
    if (!this.revealSelected || !this._selected) return;
    const chain: WinNavigationViewItem[] = [];
    for (let p = this._selected.parentItem; p; p = p.parentItem) chain.push(p);
    if (!chain.every((p) => p.getAttribute('data-children') === 'inline')) return;
    this.revealSelected = false;
    for (const p of chain) if (!p.expanded) p.setExpanded(true);
  }

  private layoutTopOverflow(): void {
    if (!this.slots) return;
    const more = this.$('.more');
    if (!this.isTop) {
      if (this.overflowItems.length) {
        this.overflowItems = [];
        this.assignSlots();
      }
      more.hidden = true;
      return;
    }
    const bar = this.$('.top');
    const menu = this.menuItems;
    this.overflowItems = [];
    this.slots.topMenu!.assign(...menu);
    this.slots.overflow!.assign();
    more.hidden = true;
    for (const m of menu) {
      if (isItem(m)) m.setPresentation('top', 'flyout', 0, false);
      else m.setAttribute('data-mode', 'top');
    }
    const fits = () => bar.scrollWidth <= bar.clientWidth + 0.5;
    if (!fits()) {
      more.hidden = false;
      const primary = [...menu];
      while (primary.length && !fits()) {
        let idx = primary.length - 1;
        const sel = this.topLevelOf(this._selected);
        if (primary[idx] === sel && idx > 0) idx--;
        const [moved] = primary.splice(idx, 1);
        this.overflowItems.unshift(moved!);
        this.slots.topMenu!.assign(...primary);
        this.slots.overflow!.assign(...this.overflowItems);
      }
    }
    this.applyItemPresentation();
  }

  private topLevelOf(item: Element | null): Element | null {
    let n: Element | null = item;
    while (n?.parentElement && n.parentElement !== this) n = n.parentElement;
    return n && n.parentElement === this ? n : null;
  }

  private toggleOverflow(): void {
    if (this.overflowPopup.isOpen) {
      void this.overflowPopup.close('programmatic');
      return;
    }
    const more = this.$('.more');
    this.overflowPopup.open({
      anchor: more,
      placement: 'bottom-end',
      offset: 4,
      focus: 'none',
      animateIn: (s, side) => menuIn(s, side, this.$('.overflow-presenter')),
      animateOut: (s) => popupOut(s),
    });
    more.setAttribute('aria-expanded', 'true');
    const first = this.slots.overflow!.assignedElements().find(isItem);
    first?.focus({ preventScroll: true });
    void Promise.resolve().then(() => {
      const watch = () => {
        if (!this.overflowPopup.isOpen) {
          more.setAttribute('aria-expanded', 'false');
          return;
        }
        requestAnimationFrame(watch);
      };
      watch();
    });
  }

  private updateVisualSeparator(): void {
    if (!this.slots || this.isTop) return;
    const menu = this.$('.menu');
    const hasFooter = this.footerMenuItems.length > 0 || this.isSettingsVisible;
    this.$('.visual-sep').hidden = !(hasFooter && menu.scrollHeight > menu.clientHeight + 1);
  }

  private onItemInvoked(item: WinNavigationViewItem, chevronOnly: boolean): void {
    if (item.disabled) return;
    const isSettings = item === this._settings;
    this.emit('iteminvoked', { invokedItem: item, invokedItemContainer: item, isSettingsInvoked: isSettings });
    const childrenMode = item.getAttribute('data-children');
    if (item.hasChildren) {
      const inStrip = childrenMode === 'flyout' && !this.isTop;
      if (inStrip && item.selectsOnInvoked && !chevronOnly) {
        if (item.expanded) item.setExpanded(false);
      } else {
        item.setExpanded(!item.expanded);
        if (chevronOnly || childrenMode === 'flyout') return;
      }
    }
    if (item.selectsOnInvoked) this.select(item, true);
    if (!item.hasChildren) {
      for (let p = item.parentItem; p; p = p.parentItem) {
        if (p.getAttribute('data-children') === 'flyout') p.closeFlyout();
      }
      if (this.overflowPopup.isOpen) void this.overflowPopup.close('programmatic');
      if (this.hasAttribute('data-overlay')) this.closePane();
    }
    if (this.isTop && this.overflowItems.includes(this.topLevelOf(item) ?? item)) this.queueRelayout();
  }

  select(item: WinNavigationViewItem | null, user: boolean, silent = false): void {
    const prev = this._selected;
    if (prev === item) return;
    const fromRect = this.currentIndicatorRect();
    this._selected = item;
    for (const it of this.allItems()) {
      if (it.selected !== (it === item)) it.selected = it === item;
    }
    if (item?.tag) {
      if (this.selectedTag !== item.tag) {
        this.selectedTag = item.tag;
      }
    }
    if (item) {
      for (let p = item.parentItem; p; p = p.parentItem) {
        const mode = p.getAttribute('data-children');
        if (mode === 'inline' && !p.expanded && user === false) p.setExpanded(true);
        if (mode === 'flyout') this.revealSelected = true;
      }
    }
    this.syncRoving();
    requestAnimationFrame(() => this.syncIndicator(user ? fromRect : null));
    if (!silent) {
      this.emit('selectionchanged', {
        selectedItem: item,
        previousItem: prev,
        isSettingsSelected: item === this._settings,
        selectedItemContainer: item,
      });
    }
  }

  private indicatorTarget(): WinNavigationViewItem | null {
    let t: WinNavigationViewItem | null = this._selected;
    while (t) {
      const visible = t.getClientRects().length > 0 && !this.insideClosedPopup(t);
      if (visible) return t;
      t = t.parentItem;
    }
    return null;
  }

  private insideClosedPopup(item: WinNavigationViewItem): boolean {
    for (let p = item.parentItem; p; p = p.parentItem) {
      if (p.getAttribute('data-children') === 'flyout') return true;
      if (p.getAttribute('data-children') === 'inline' && !p.expanded) return true;
    }
    return this.slots ? this.slots.overflow!.assignedElements().includes(item) : false;
  }

  private currentIndicatorRect(): DOMRect | null {
    const cur = this.allItems().find((i) => i.hasAttribute('data-indicator'));
    if (!cur) return null;
    const r = cur.indicatorElement.getBoundingClientRect();
    return r.width && r.height ? r : null;
  }

  private indicatorQueued = false;
  private queueIndicator(): void {
    if (this.indicatorQueued) return;
    this.indicatorQueued = true;
    requestAnimationFrame(() => {
      this.indicatorQueued = false;
      this.syncIndicator(null);
    });
  }

  private syncIndicator(from: DOMRect | null): void {
    const target = this.indicatorTarget();
    for (const it of this.allItems()) {
      const on = it === target;
      if (it.hasAttribute('data-indicator') !== on) it.toggleAttribute('data-indicator', on);
    }
    if (!target || !from) return;
    const axis = target.getAttribute('data-mode') === 'top' ? 'x' : 'y';
    travelIndicator(target.indicatorElement, from, axis);
  }

  private keyScopeItems(target: WinNavigationViewItem): WinNavigationViewItem[] {
    for (let p = target.parentItem; p; p = p.parentItem) {
      if (p.getAttribute('data-children') !== 'flyout') continue;
      const out: WinNavigationViewItem[] = [];
      const walk = (nodes: Iterable<Element>) => {
        for (const n of nodes) {
          if (!isItem(n) || n.hidden || n.getClientRects().length === 0) continue;
          out.push(n);
          if (n.expanded && n.getAttribute('data-children') === 'inline') walk(n.children);
        }
      };
      walk(p.children);
      return out;
    }
    return this.visibleItems();
  }

  private visibleItems(): WinNavigationViewItem[] {
    const out: WinNavigationViewItem[] = [];
    const walk = (nodes: Iterable<Element>) => {
      for (const n of nodes) {
        if (!isItem(n) || n.hidden) continue;
        if (n.getClientRects().length === 0) continue;
        out.push(n);
        if (n.expanded && n.getAttribute('data-children') === 'inline') walk(n.children);
      }
    };
    if (this.isTop) {
      walk(this.slots.topMenu!.assignedElements());
      walk(this.slots.topFooter!.assignedElements());
    } else {
      walk(this.slots.menu!.assignedElements());
      walk(this.slots.footer!.assignedElements());
    }
    if (this.isSettingsVisible && this._settings.getClientRects().length) out.push(this._settings);
    return out;
  }

  private syncRoving(): void {
    if (!this.slots) return;
    const items = this.allItems();
    const visible = this.visibleItems();
    const active = (this._selected && visible.includes(this._selected) ? this._selected : null) ?? visible[0] ?? null;
    for (const it of items) it.tabIndex = it === active ? 0 : -1;
  }

  private onFocusIn(ev: FocusEvent): void {
    const t = ev.composedPath().find(isItem) as WinNavigationViewItem | undefined;
    if (!t) return;
    for (const it of this.allItems()) it.tabIndex = it === t ? 0 : -1;
    if (this.selectionFollowsFocus && t.selectsOnInvoked && !t.hasChildren && t !== this._selected)
      this.select(t, true);
  }

  private onKeyDown(ev: KeyboardEvent): void {
    const target = ev.composedPath().find(isItem) as WinNavigationViewItem | undefined;
    if (ev.key === 'Escape' && this.hasAttribute('data-overlay')) {
      ev.preventDefault();
      this.closePane();
      return;
    }
    if (!target) return;
    const items = this.keyScopeItems(target);
    const idx = items.indexOf(target);
    const rtl = isRtl(this);
    const top = target.getAttribute('data-mode') === 'top';
    const next = top ? (rtl ? 'ArrowLeft' : 'ArrowRight') : 'ArrowDown';
    const prevKey = top ? (rtl ? 'ArrowRight' : 'ArrowLeft') : 'ArrowUp';
    const expandKey = top ? 'ArrowDown' : rtl ? 'ArrowLeft' : 'ArrowRight';
    const collapseKey = top ? 'ArrowUp' : rtl ? 'ArrowRight' : 'ArrowLeft';
    let to: WinNavigationViewItem | undefined;
    switch (ev.key) {
      case next:
        to = items[Math.min(items.length - 1, idx + 1)];
        break;
      case prevKey:
        to = items[Math.max(0, idx - 1)];
        break;
      case 'Home':
        to = items[0];
        break;
      case 'End':
        to = items[items.length - 1];
        break;
      case expandKey:
        if (target.hasChildren) {
          if (!target.expanded) target.setExpanded(true);
          else if (target.getAttribute('data-children') === 'inline') to = target.menuItems[0];
          ev.preventDefault();
          if (target.getAttribute('data-children') === 'flyout') {
            requestAnimationFrame(() => target.menuItems[0]?.focus());
          }
        }
        break;
      case collapseKey:
        if (target.hasChildren && target.expanded && target.getAttribute('data-children') === 'inline') {
          target.setExpanded(false);
          ev.preventDefault();
        } else if (target.parentItem) {
          to = target.parentItem;
          if (target.parentItem.getAttribute('data-children') === 'flyout') target.parentItem.setExpanded(false);
        }
        break;
      default:
        return;
    }
    if (to && to !== target) {
      ev.preventDefault();
      ev.stopPropagation();
      to.focus();
    } else if (to === target) ev.preventDefault();
  }
}

export interface NavigationViewItemData {
  content?: string;
  icon?: string;
  tag?: string;
  selected?: boolean;
  disabled?: boolean;
  infoBadge?: number | string;
  selectsOnInvoked?: boolean;
  children?: NavigationViewItemData[];
  header?: boolean;
  separator?: boolean;
  footer?: boolean;
}

declare global {
  interface HTMLElementTagNameMap {
    'win-navigation-view': WinNavigationView;
    'win-navigation-view-item': WinNavigationViewItem;
    'win-navigation-view-item-header': WinNavigationViewItemHeader;
    'win-navigation-view-item-separator': WinNavigationViewItemSeparator;
  }
}
