import { css } from '../../base/css.ts';
import { scrollbars } from '../../base/css.ts';
import { ListBase, ListItemBase, listHostCss } from './list-core.ts';

const listBoxHostCss = css`
:host {
  background-color: light-dark(#f2f2f2, #2b2b2b);
}
`;

const accent = (light: number, dark: number) =>
  `light-dark(color-mix(in srgb, var(--w-system-accent-color) ${light}%, transparent), color-mix(in srgb, var(--w-system-accent-color) ${dark}%, transparent))`;

export const listBoxItemCss = css`
:host {
  display: flex;
  position: relative;
  align-items: center;
  box-sizing: border-box;
  padding: 9px 12px 12px;
  color: var(--w-text-fill-color-primary);
  background-color: transparent;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
  white-space: nowrap;
}
:host(:hover) { background-color: var(--w-subtle-fill-color-secondary); }
:host(:active) { background-color: var(--w-subtle-fill-color-tertiary); }
:host([selected]) { background-color: ${accent(40, 60)}; }
:host([selected]:hover) { background-color: ${accent(60, 80)}; }
:host([selected]:active) { background-color: ${accent(70, 90)}; }
:host([disabled]) { color: var(--w-text-fill-color-disabled); pointer-events: none; }
.content { position: relative; flex: 1 1 auto; min-width: 0; }
.focus { position: absolute; inset: 0; pointer-events: none; display: none; }
:host(:focus-visible) .focus {
  display: block;
  border: 2px solid var(--w-focus-stroke-color-outer);
  box-shadow: inset 0 0 0 1px var(--w-focus-stroke-color-inner);
}
:host([data-w-dragging]) { box-shadow: var(--w-elevation-tooltip); }
`;

export class WinListBoxItem extends ListItemBase {
  static override styles = [listBoxItemCss];
  static override template = `<div class="content" part="content"><slot></slot></div><div class="focus" part="focus"></div>`;
  static {
    this.define('win-list-box-item');
  }
}

export class WinListBox extends ListBase {
  static override styles = [scrollbars, listHostCss, listBoxHostCss];
  static {
    this.define('win-list-box');
  }
  protected get itemTag(): string {
    return 'win-list-box-item';
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-list-box': WinListBox;
    'win-list-box-item': WinListBoxItem;
  }
}
