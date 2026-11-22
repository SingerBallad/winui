import { acrylicSurface, css } from '../../base/css.ts';

export function textFieldCss(sel: string): string {
  return `
${sel} {
  position: relative;
  box-sizing: border-box;
  min-height: 32px;
  border: 1px solid;
  border-color: var(--w-text-control-elevation-border);
  border-radius: var(--w-corner-radius-control);
  background-color: var(--w-control-fill-color-default);
  background-clip: padding-box;
  color: var(--w-text-fill-color-primary);
  transition: background-color var(--w-duration-faster) linear;
}
${sel}:hover { background-color: var(--w-control-fill-color-secondary); }
${sel}:focus-within {
  background-color: var(--w-control-fill-color-input-active);
  border-color: var(--w-text-control-elevation-border-focused);
}
${sel}::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: linear-gradient(var(--w-text-control-elevation-border-focused-edge), var(--w-text-control-elevation-border-focused-edge)) bottom / 100% 2px no-repeat;
  clip-path: inset(0 50% 0 50%);
  opacity: 0;
  pointer-events: none;
  transition:
    clip-path var(--w-duration-fast) var(--w-ease-decelerate),
    opacity var(--w-duration-fast) linear;
}
${sel}:focus-within::after {
  clip-path: inset(0 0 0 0);
  opacity: 1;
  transition:
    clip-path var(--w-duration-normal) var(--w-ease-decelerate),
    opacity var(--w-duration-faster) linear;
}
:host([disabled]) ${sel}::after { display: none; }
:host([disabled]) ${sel} {
  background-color: var(--w-control-fill-color-disabled);
  border-color: var(--w-control-stroke-color-default);
  color: var(--w-text-fill-color-disabled);
  box-shadow: none;
}
`;
}

export const bareInputCss = `
  font: var(--w-type-body);
  color: inherit;
  background: transparent;
  border: 0;
  outline: none;
  margin: 0;
  padding: 0;
  min-width: 0;
`;

export const suggestionListCss = css`
.suggestions {
  position: fixed;
  inset: auto;
  margin: 0;
  padding: 0;
  border: 0;
  background: transparent;
  color: inherit;
  overflow: visible;
}
.suggestions:not(:popover-open):not([data-open]) { display: none !important; }
.suggest-surface {
  box-sizing: border-box;
  max-height: min(374px, var(--w-popup-max-height, 374px));
  overflow-y: auto;
  padding: 2px 0;
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-overlay);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-flyout);
  scrollbar-width: thin;
  scrollbar-color: var(--w-control-strong-fill-color-default) transparent;
}
.suggest-item {
  display: flex;
  align-items: center;
  gap: 12px;
  min-height: 36px;
  margin: 2px 4px;
  padding: 0 12px;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-primary);
  cursor: default;
  user-select: none;
  position: relative;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.suggest-item:hover { background: var(--w-subtle-fill-color-secondary); }
.suggest-item:active { background: var(--w-subtle-fill-color-tertiary); }
.suggest-item[aria-selected="true"] { background: var(--w-subtle-fill-color-secondary); }
.suggest-item[aria-selected="true"]::before {
  content: '';
  position: absolute;
  left: 0;
  top: 50%;
  width: 3px;
  height: 16px;
  margin-top: -8px;
  border-radius: 1.5px;
  background: var(--w-accent-fill-color-default);
}
.suggest-item .s-sub { color: var(--w-text-fill-color-secondary); font: var(--w-type-caption); }
.suggest-empty { padding: 9px 16px; color: var(--w-text-fill-color-secondary); }
`;
