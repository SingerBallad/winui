import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, scrollbars } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { ListBase, ListItemBase, listHostCss, type ListLayout } from './list-core.ts';

const CHECK = glyph('checkMark', 12, 'chk');

const checkBoxCss = `
.check {
  position: absolute;
  box-sizing: border-box;
  width: 20px;
  height: 20px;
  border-radius: 3px;
  border: 1px solid var(--w-control-strong-stroke-color-default);
  background-color: var(--w-control-alt-fill-color-secondary);
  color: var(--w-text-on-accent-fill-color-primary);
  display: inline-flex;
  align-items: center;
  justify-content: center;
  pointer-events: none;
  opacity: 0;
  transform: scale(0.7);
  transition:
    opacity var(--w-duration-fast) var(--w-ease-decelerate),
    transform var(--w-duration-fast) var(--w-ease-decelerate),
    background-color var(--w-duration-faster) linear,
    border-color var(--w-duration-faster) linear;
}
.check .chk path {
  stroke-dasharray: 16;
  stroke-dashoffset: 16;
  transition: stroke-dashoffset var(--w-duration-normal) var(--w-ease-decelerate);
}
:host([selected]) .check {
  background-color: var(--w-accent-fill-color-default);
  border-color: var(--w-accent-fill-color-default);
}
:host([selected]) .check .chk path { stroke-dashoffset: 0; }
:host([selected]:hover) .check { background-color: var(--w-accent-fill-color-secondary); border-color: transparent; }
:host([selected]:active) .check { background-color: var(--w-accent-fill-color-tertiary); border-color: transparent; color: var(--w-text-on-accent-fill-color-secondary); }
`;

export const listViewItemCss = css`
:host {
  display: flex;
  position: relative;
  align-items: center;
  box-sizing: border-box;
  min-height: 40px;
  min-width: 88px;
  padding: 0 12px 0 16px;
  color: var(--w-text-fill-color-primary);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
  transition: padding-inline-start var(--w-duration-fast) var(--w-ease-decelerate);
}
.backplate {
  position: absolute;
  inset: 2px 4px;
  border-radius: var(--w-corner-radius-control);
  background-color: transparent;
  pointer-events: none;
}
:host(:hover) .backplate { background-color: var(--w-subtle-fill-color-secondary); }
:host(:active) .backplate { background-color: var(--w-subtle-fill-color-tertiary); }
:host([selected]) .backplate { background-color: var(--w-subtle-fill-color-secondary); }
:host([selected]:hover) .backplate { background-color: var(--w-subtle-fill-color-tertiary); }
:host([selected]:active) .backplate { background-color: var(--w-subtle-fill-color-secondary); }
:host([data-w-dragging]) .backplate { background-color: var(--w-subtle-fill-color-secondary); box-shadow: var(--w-elevation-tooltip); }

.pill {
  position: absolute;
  inset-inline-start: 4px;
  top: 50%;
  width: 3px;
  height: 16px;
  margin-top: -8px;
  border-radius: 1.5px;
  background: var(--w-accent-fill-color-default);
  opacity: 0;
  transform: scaleY(0);
  transition: transform var(--w-duration-fast) var(--w-ease-decelerate), opacity var(--w-duration-faster) linear;
  pointer-events: none;
}
:host([selected]:not([data-mode="multiple"]):not([data-mode="none"])) .pill { opacity: 1; transform: none; }

${checkBoxCss}
.check { inset-inline-start: 12px; top: 50%; margin-top: -10px; transform: translateX(-8px) scale(0.85); }
:host([data-mode="multiple"]) { padding-inline-start: 44px; }
:host([data-mode="multiple"]) .check { opacity: 1; transform: none; }

.content {
  position: relative;
  flex: 1 1 auto;
  min-width: 0;
}
.focus {
  position: absolute;
  inset: 1px;
  border-radius: 6px;
  pointer-events: none;
  display: none;
}
:host(:focus-visible) .focus {
  display: block;
  border: 2px solid var(--w-focus-stroke-color-outer);
  box-shadow: inset 0 0 0 1px var(--w-focus-stroke-color-inner);
}
:host([disabled]) { opacity: 0.3; pointer-events: none; }
:host([disabled][selected]) .pill { background: var(--w-accent-fill-color-disabled); }
`;

const ITEM_TEMPLATE = `<div class="backplate" part="backplate"></div><div class="pill" part="selection-indicator"></div><div class="check" part="checkbox">${CHECK}</div><div class="content" part="content"><slot></slot></div><div class="focus" part="focus"></div>`;

export class WinListViewItem extends ListItemBase {
  static override styles = [listViewItemCss];
  static override template = ITEM_TEMPLATE;
  static {
    this.define('win-list-view-item');
  }
}

export const headerItemCss = css`
:host {
  display: block;
  box-sizing: border-box;
  position: relative;
  z-index: 2;
  min-height: 44px;
  margin: 0 0 4px;
  padding: 8px 12px 0;
  font: 400 20px/27px var(--w-font-family-display);
  color: var(--w-text-fill-color-primary);
  background: transparent;
  cursor: default;
  user-select: none;
}
:host([data-stuck]) {
  background: var(--w-list-header-background, color-mix(in srgb, var(--w-solid-background-fill-color-tertiary) 94%, transparent));
  box-shadow: 0 1px 0 var(--w-divider-stroke-color-default);
}
.divider {
  height: 1px;
  margin-top: 8px;
  background: light-dark(rgba(0, 0, 0, 0.2), rgba(255, 255, 255, 0.2));
  transform: scaleY(0.5);
  transform-origin: bottom;
}
:host(:focus-visible) { outline: 2px solid var(--w-focus-stroke-color-outer); outline-offset: -2px; }
`;

export class WinListViewHeader extends WinElement {
  static override styles = [headerItemCss];
  static override template = `<div class="content" part="content"><slot></slot></div><div class="divider" part="divider"></div>`;
  static override props: PropDefs = {
    notSticky: { type: Boolean, attribute: 'not-sticky' },
  };
  declare notSticky: boolean;
  static {
    this.define('win-list-view-header');
  }
  protected override firstConnected(): void {
    this.setAttribute('role', 'presentation');
  }
}

export class WinListView extends ListBase {
  static {
    this.define('win-list-view');
  }
  protected get itemTag(): string {
    return 'win-list-view-item';
  }
  protected override get headerTag(): string | null {
    return 'win-list-view-header';
  }
  protected override get listLayout(): ListLayout {
    return this.getAttribute('orientation') === 'horizontal' ? 'horizontal' : 'vertical';
  }
}

export const gridViewItemCss = css`
:host {
  display: inline-flex;
  position: relative;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 44px;
  min-height: 44px;
  margin: 0 4px 4px 0;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-primary);
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
  transition: transform var(--w-duration-fast) var(--w-ease-decelerate);
}
:host(:active) { transform: scale(0.98); }
.backplate {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background-color: transparent;
  pointer-events: none;
}
:host(:hover) .backplate { background-color: var(--w-subtle-fill-color-secondary); }
:host(:active) .backplate { background-color: var(--w-subtle-fill-color-tertiary); }
:host([selected]) .backplate { background-color: var(--w-subtle-fill-color-tertiary); }
:host([selected]:hover) .backplate { background-color: var(--w-subtle-fill-color-tertiary); }
:host([selected]:active) .backplate { background-color: var(--w-subtle-fill-color-secondary); }
.content {
  position: relative;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: inherit;
  overflow: hidden;
}
.border, .inner {
  position: absolute;
  pointer-events: none;
  box-sizing: border-box;
  border: 0 solid var(--w-accent-fill-color-default);
  z-index: 1;
  opacity: 0;
  transform: scale(1.04);
  transition:
    opacity var(--w-duration-fast) var(--w-ease-decelerate),
    transform var(--w-duration-fast) var(--w-ease-decelerate),
    border-color var(--w-duration-faster) linear;
}
.border { inset: 0; border-radius: inherit; border-width: 2px; }
.inner { inset: 2px; border-radius: 2px; border-width: 1px; border-color: var(--w-control-solid-fill-color-default); }
:host(:hover:not([selected])) .backplate { box-shadow: inset 0 0 0 1px rgba(0, 0, 0, 0.2157); }
:host([selected]) .border, :host([selected]) .inner { opacity: 1; transform: none; }
:host([selected]:hover) .border { border-color: var(--w-accent-fill-color-secondary); }
:host([selected]:active) .border { border-color: var(--w-accent-fill-color-tertiary); }

${checkBoxCss}
.check {
  top: 4px;
  inset-inline-end: 4px;
  z-index: 2;
  background-color: var(--w-control-on-image-fill-color-default);
}
:host([selected]:not([data-mode="none"])) .check,
:host([data-mode="multiple"]:hover) .check { opacity: 1; transform: none; }
:host([data-mode="multiple"]:hover:not([selected])) .check { background-color: light-dark(#f3f3f3, #1a1a1a); }

.focus {
  position: absolute;
  inset: -3px;
  border-radius: 7px;
  pointer-events: none;
  display: none;
  z-index: 3;
}
:host(:focus-visible) .focus {
  display: block;
  border: 2px solid var(--w-focus-stroke-color-outer);
  box-shadow: inset 0 0 0 1px var(--w-focus-stroke-color-inner);
}
:host([disabled]) { opacity: 0.3; pointer-events: none; }
:host([data-w-dragging]) { box-shadow: var(--w-elevation-flyout); }
`;

export class WinGridViewItem extends ListItemBase {
  static override styles = [gridViewItemCss];
  static override template = `<div class="backplate" part="backplate"></div><div class="content" part="content"><slot></slot></div><div class="border" part="selection-border"></div><div class="inner" part="selection-inner-border"></div><div class="check" part="checkbox">${CHECK}</div><div class="focus" part="focus"></div>`;
  static {
    this.define('win-grid-view-item');
  }
}

export class WinGridViewHeader extends WinListViewHeader {
  static {
    this.define('win-grid-view-header');
  }
  protected override firstConnected(): void {
    super.firstConnected();
    this.style.flexBasis = '100%';
  }
}

const gridHostCss = css`
.items { padding-bottom: 10px; }
::slotted(win-grid-view-header) { flex: 0 0 100%; }
`;

export class WinGridView extends ListBase {
  static override styles = [scrollbars, listHostCss, gridHostCss];
  static {
    this.define('win-grid-view');
  }
  protected get itemTag(): string {
    return 'win-grid-view-item';
  }
  protected override get headerTag(): string | null {
    return 'win-grid-view-header';
  }
  protected override get listLayout(): ListLayout {
    return 'grid';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-list-view': WinListView;
    'win-list-view-item': WinListViewItem;
    'win-list-view-header': WinListViewHeader;
    'win-grid-view': WinGridView;
    'win-grid-view-item': WinGridViewItem;
    'win-grid-view-header': WinGridViewHeader;
  }
}
