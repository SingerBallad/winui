import { css } from '../../base/css.ts';

export function focusRect(
  selector: string,
  m: { top: number; right: number; bottom: number; left: number },
  radius = 4,
): string {
  return `${selector} {
  content: '';
  position: absolute;
  inset: ${-m.top}px ${-m.right}px ${-m.bottom}px ${-m.left}px;
  border-radius: ${radius}px;
  box-shadow: inset 0 0 0 2px var(--w-focus-stroke-color-outer), inset 0 0 0 3px var(--w-focus-stroke-color-inner);
  pointer-events: none;
}`;
}

export const headerCss = css`
.header {
  display: block;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  overflow-wrap: anywhere;
  user-select: none;
}
.header[hidden] { display: none; }
:host([disabled]) .header { color: var(--w-text-fill-color-disabled); }
`;

export const textInputCss = css`
.w-textbox {
  box-sizing: border-box;
  min-width: 64px;
  min-height: 32px;
  padding: 5px 6px 6px 10px;
  border: 1px solid;
  border-color: var(--w-text-control-elevation-border);
  border-radius: var(--w-corner-radius-control);
  background-color: var(--w-control-fill-color-default);
  background-clip: padding-box;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  outline: none;
  margin: 0;
  transition: background-color var(--w-duration-faster) linear;
}
.w-textbox::placeholder { color: var(--w-text-fill-color-secondary); opacity: 1; }
.w-textbox::selection {
  background: var(--w-accent-fill-color-selected-text-background);
  color: var(--w-text-on-accent-fill-color-selected-text);
}
.w-textbox:hover { background-color: var(--w-control-fill-color-secondary); }
.w-textbox:focus {
  background-color: var(--w-control-fill-color-input-active);
  border-color: var(--w-text-control-elevation-border-focused);
  border-bottom-width: 2px;
  padding-bottom: 5px;
}
.w-textbox:disabled {
  background-color: var(--w-control-fill-color-disabled);
  border-color: var(--w-control-stroke-color-default);
  color: var(--w-text-fill-color-disabled);
}
.w-tb {
  position: relative;
  display: inline-flex;
  vertical-align: middle;
  border-radius: var(--w-corner-radius-control);
}
.w-tb > .w-textbox { flex: 1 1 auto; width: 100%; }
.w-tb > .w-textbox:focus {
  border-color: var(--w-text-control-elevation-border);
  border-bottom-width: 1px;
  padding-bottom: 6px;
}
.w-tb::after {
  content: '';
  position: absolute;
  inset: 0;
  border-radius: inherit;
  background: linear-gradient(var(--w-text-control-elevation-border-focused-edge), var(--w-text-control-elevation-border-focused-edge)) bottom / 100% 2px no-repeat;
  clip-path: inset(0 50% 0 50%);
  opacity: 0;
  pointer-events: none;
  transition:
    clip-path var(--w-duration-fast) var(--w-ease-decelerate),
    opacity var(--w-duration-fast) linear;
}
.w-tb:focus-within::after {
  clip-path: inset(0 0 0 0);
  opacity: 1;
  transition:
    clip-path var(--w-duration-normal) var(--w-ease-decelerate),
    opacity var(--w-duration-faster) linear;
}
`;

export function localized(
  key:
    | 'on'
    | 'off'
    | 'more'
    | 'less'
    | 'red'
    | 'green'
    | 'blue'
    | 'hue'
    | 'saturation'
    | 'value'
    | 'opacity'
    | 'ok'
    | 'cancel',
): string {
  const zh = (document.documentElement.lang || navigator.language || '').toLowerCase().startsWith('zh');
  const table = {
    on: ['开', 'On'],
    off: ['关', 'Off'],
    more: ['更多', 'More'],
    less: ['更少', 'Less'],
    red: ['红色', 'Red'],
    green: ['绿色', 'Green'],
    blue: ['蓝色', 'Blue'],
    hue: ['色调', 'Hue'],
    saturation: ['饱和度', 'Saturation'],
    value: ['亮度', 'Value'],
    opacity: ['不透明度', 'Opacity'],
    ok: ['确定', 'OK'],
    cancel: ['取消', 'Cancel'],
  } as const;
  return table[key][zh ? 0 : 1];
}

export const clamp = (v: number, lo: number, hi: number): number => Math.min(hi, Math.max(lo, v));

export function roundToStep(v: number, step: number, origin = 0): number {
  if (!(step > 0)) return v;
  const n = Math.round((v - origin) / step) * step + origin;
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number(n.toFixed(Math.min(10, decimals + 2)));
}

export const miniCheckCss = css`
.w-check {
  display: inline-grid;
  place-items: center;
  width: 20px;
  height: 20px;
  box-sizing: border-box;
  border: 1px solid var(--w-control-strong-stroke-color-default);
  border-radius: var(--w-corner-radius-control);
  background: var(--w-control-alt-fill-color-secondary);
  color: var(--w-text-on-accent-fill-color-primary);
  vertical-align: middle;
}
.w-check svg { opacity: 0; }
.w-check[data-checked] {
  border-color: var(--w-accent-fill-color-default);
  background: var(--w-accent-fill-color-default);
}
.w-check[data-checked] svg { opacity: 1; }
`;

export function formatNumber(v: number, step = 1): string {
  const decimals = Math.min(6, Math.max(0, (String(step).split('.')[1] ?? '').length));
  return Number(v.toFixed(decimals)).toLocaleString(undefined, { maximumFractionDigits: decimals });
}

export function snap(v: number, min: number, max: number, step: number): number {
  const s = step > 0 ? step : 1;
  const snapped = Math.round((v - min) / s) * s + min;
  const decimals = (String(s).split('.')[1] ?? '').length;
  return Math.min(max, Math.max(min, Number(snapped.toFixed(decimals + 2))));
}
