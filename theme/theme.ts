import { accentDefaults, darkPalette, highContrastPalette, lightPalette, type Palette } from './palette.generated.ts';
import {
  customAcrylicDefaults,
  installMaterials,
  isSystemBackdropKind,
  requestSystemBackdrop,
  materialApproxTokens,
  materialDeclarations,
  materialFallbackTokens,
  materialHighContrastTokens,
  materialKinds,
  materialThemeTokens,
  type MaterialKind,
} from './materials.ts';

export type ThemeMode = 'light' | 'dark' | 'system';
export type EffectiveTheme = 'light' | 'dark';

export const typeRamp = {
  caption: { size: 12, lineHeight: 16, weight: 400, family: 'small' },
  body: { size: 14, lineHeight: 19, weight: 400, family: 'text' },
  bodyStrong: { size: 14, lineHeight: 19, weight: 600, family: 'text' },
  bodyLarge: { size: 18, lineHeight: 24, weight: 400, family: 'text' },
  bodyLargeStrong: { size: 18, lineHeight: 24, weight: 600, family: 'text' },
  subtitle: { size: 20, lineHeight: 27, weight: 600, family: 'display' },
  title: { size: 28, lineHeight: 37, weight: 600, family: 'display' },
  titleLarge: { size: 40, lineHeight: 53, weight: 600, family: 'display' },
  display: { size: 68, lineHeight: 90, weight: 600, family: 'display' },
} as const;

export type TypeRampName = keyof typeof typeRamp;

const FALLBACK_SANS =
  '"Segoe UI", "Microsoft YaHei UI", "Microsoft YaHei", -apple-system, BlinkMacSystemFont, "PingFang SC", "Noto Sans", "Noto Sans SC", system-ui, sans-serif';

export const fontFamilies = {
  small: `"Segoe UI Variable Small", ${FALLBACK_SANS}`,
  text: `"Segoe UI Variable Text", ${FALLBACK_SANS}`,
  display: `"Segoe UI Variable Display", ${FALLBACK_SANS}`,
  icon: '"Segoe Fluent Icons", "Segoe MDL2 Assets"',
  mono: '"Cascadia Mono", "Cascadia Code", Consolas, "SF Mono", Menlo, "Courier New", monospace',
} as const;

export const cornerRadius = {
  control: 4,
  overlay: 8,
  circle: 9999,
} as const;

export const durations = {
  faster: 83,
  fast: 167,
  normal: 250,
  slow: 333,
  slower: 500,
} as const;

export const easings = {
  decelerate: 'cubic-bezier(0, 0, 0, 1)',
  accelerate: 'cubic-bezier(1, 0, 1, 1)',
  point: 'cubic-bezier(0.55, 0.55, 0, 1)',
  standard: 'cubic-bezier(0.8, 0, 0.2, 1)',
  linear: 'linear',
} as const;

const elevationLight = {
  '--w-elevation-card': '0 2px 4px rgba(0, 0, 0, 0.04)',
  '--w-elevation-tooltip': '0 4px 8px rgba(0, 0, 0, 0.14)',
  '--w-elevation-flyout': '0 8px 16px rgba(0, 0, 0, 0.14)',
  '--w-elevation-dialog': '0 32px 64px rgba(0, 0, 0, 0.1876), 0 2px 21px rgba(0, 0, 0, 0.1474)',
  '--w-elevation-window': '0 32px 64px rgba(0, 0, 0, 0.28), 0 2px 21px rgba(0, 0, 0, 0.22)',
  '--w-elevation-control': '0 1px 2px rgba(0, 0, 0, 0.06)',
};
const elevationDark = {
  '--w-elevation-card': '0 2px 4px rgba(0, 0, 0, 0.13)',
  '--w-elevation-tooltip': '0 4px 8px rgba(0, 0, 0, 0.26)',
  '--w-elevation-flyout': '0 8px 16px rgba(0, 0, 0, 0.26)',
  '--w-elevation-dialog': '0 32px 64px rgba(0, 0, 0, 0.37), 0 2px 21px rgba(0, 0, 0, 0.37)',
  '--w-elevation-window': '0 32px 64px rgba(0, 0, 0, 0.56), 0 2px 21px rgba(0, 0, 0, 0.55)',
  '--w-elevation-control': '0 1px 2px rgba(0, 0, 0, 0.2)',
};

function declarations(p: Readonly<Record<string, string>>): string {
  let s = '';
  for (const k in p) s += `  ${k}: ${p[k]};\n`;
  return s;
}

function staticTokens(): string {
  const t: Record<string, string> = {
    '--w-font-family-small': fontFamilies.small,
    '--w-font-family-text': fontFamilies.text,
    '--w-font-family-display': fontFamilies.display,
    '--w-font-family-icon': fontFamilies.icon,
    '--w-font-family-mono': fontFamilies.mono,
    '--w-corner-radius-control': `${cornerRadius.control}px`,
    '--w-corner-radius-overlay': `${cornerRadius.overlay}px`,
    '--w-duration-faster': `${durations.faster}ms`,
    '--w-duration-fast': `${durations.fast}ms`,
    '--w-duration-normal': `${durations.normal}ms`,
    '--w-duration-slow': `${durations.slow}ms`,
    '--w-duration-slower': `${durations.slower}ms`,
    '--w-ease-decelerate': easings.decelerate,
    '--w-ease-accelerate': easings.accelerate,
    '--w-ease-point': easings.point,
    '--w-ease-standard': easings.standard,
  };
  for (const [name, r] of Object.entries(typeRamp)) {
    const k = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    t[`--w-type-${k}`] = `${r.weight} ${r.size}px/${r.lineHeight}px var(--w-font-family-${r.family})`;
  }
  return declarations(t);
}

function buildThemeCss(): string {
  const light = declarations(lightPalette) + declarations(elevationLight) + declarations(materialThemeTokens('light'));
  const dark = declarations(darkPalette) + declarations(elevationDark) + declarations(materialThemeTokens('dark'));
  const hc = declarations(highContrastPalette) + declarations(materialHighContrastTokens());
  const fallback = declarations(materialFallbackTokens());
  return `
:root {
${declarations(accentDefaults)}${staticTokens()}${declarations(customAcrylicDefaults)}}
:root, [data-win-theme="light"] {
  color-scheme: light;
${light}}
[data-win-theme="dark"] {
  color-scheme: dark;
${dark}}
@media (prefers-color-scheme: dark) {
  :root:not([data-win-theme="light"]) {
    color-scheme: dark;
${dark}  }
}
@media (forced-colors: active) {
  :root, [data-win-theme] {
${hc}  }
}
[data-win-theme] { color: var(--w-text-fill-color-primary); }
@media (prefers-reduced-motion: reduce) {
  :root { --w-duration-faster: 0ms; --w-duration-fast: 0ms; --w-duration-normal: 0ms; --w-duration-slow: 0ms; --w-duration-slower: 0ms; }
}
:root[data-win-motion="reduced"] { --w-duration-faster: 0ms; --w-duration-fast: 0ms; --w-duration-normal: 0ms; --w-duration-slow: 0ms; --w-duration-slower: 0ms; }
:root[data-win-material-engine="approx"], :root[data-win-material-engine="approx"] [data-win-theme] {
${declarations(materialApproxTokens())}}
@media (prefers-reduced-transparency: reduce) {
  :root:not([data-win-transparency="on"]), :root:not([data-win-transparency="on"]) [data-win-theme] {
${fallback}  }
}
:root[data-win-transparency="off"], :root[data-win-transparency="off"] [data-win-theme] {
${fallback}}
@media (forced-colors: active) {
  :root, [data-win-theme] {
${declarations(materialHighContrastTokens())}  }
}
`;
}

function buildGlobalCss(): string {
  let ramp = '';
  for (const name of Object.keys(typeRamp)) {
    const cls = name.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);
    ramp += `.w-${cls} { font: var(--w-type-${cls}); }\n`;
  }
  return `
:where(html[data-win-app]) {
  font: var(--w-type-body);
  color: var(--w-text-fill-color-primary);
  background: var(--w-solid-background-fill-color-base);
  -webkit-font-smoothing: antialiased;
  -webkit-text-size-adjust: 100%;
}
:where(html[data-win-app]) body { margin: 0; }
:where(html[data-win-app]) { cursor: default; }
:where(html[data-win-app]) { caret-color: transparent; }
:where(html[data-win-app]) :where(input, textarea, [contenteditable]:not([contenteditable="false"])) { caret-color: auto; }
:where(html[data-win-app]) :where(input:not([type="checkbox"], [type="radio"], [type="range"], [type="button"], [type="submit"], [type="reset"], [type="color"], [type="file"], [type="image"]), textarea, [contenteditable]:not([contenteditable="false"]), pre, code, [is-text-selection-enabled]) {
  cursor: text;
}
:where(html[data-win-app]) ::selection {
  background: var(--w-accent-fill-color-selected-text-background);
  color: var(--w-text-on-accent-fill-color-selected-text);
}
:where(html[data-win-app]) {
  scrollbar-color: var(--w-control-strong-fill-color-default) transparent;
  scrollbar-width: thin;
}
${ramp}
svg.w-glyph {
  display: inline-block;
  flex: none;
  overflow: visible;
  fill: none;
  stroke: currentColor;
  stroke-width: 1;
  stroke-linecap: round;
  stroke-linejoin: round;
  vertical-align: middle;
}
svg.w-glyph .f { fill: currentColor; stroke: none; }
.w-icon {
  font-family: var(--w-font-family-icon);
  font-style: normal;
  font-weight: normal;
  line-height: 1;
}
:where([role="button"], [role="menuitem"], [role="menuitemcheckbox"], [role="menuitemradio"], [role="tab"], [role="option"], [role="treeitem"], [role="switch"], [role="checkbox"], [role="radio"], [role="slider"]) {
  -webkit-user-select: none;
  user-select: none;
}
.w-text-secondary { color: var(--w-text-fill-color-secondary); }
.w-text-tertiary { color: var(--w-text-fill-color-tertiary); }
.w-text-accent { color: var(--w-accent-text-fill-color-primary); }
.w-card {
  background: var(--w-card-background-fill-color-default);
  border: 1px solid var(--w-card-stroke-color-default);
  border-radius: var(--w-corner-radius-overlay);
}
${materialKinds.map((k) => `.w-${k}, [data-win-backdrop="${k}"] { ${materialDeclarations(k)} }`).join('\n')}
`;
}

let installed = false;

export interface InstallOptions {
  appStyles?: boolean;
}

export function installTheme(opts: InstallOptions = {}): void {
  if (typeof document === 'undefined') return;
  if (opts.appStyles !== false && !document.documentElement.hasAttribute('data-win-app')) {
    document.documentElement.setAttribute('data-win-app', '');
  }
  if (installed) return;
  installed = true;
  const theme = document.createElement('style');
  theme.id = 'winui-theme';
  theme.textContent = buildThemeCss();
  const global = document.createElement('style');
  global.id = 'winui-global';
  global.textContent = buildGlobalCss();
  document.head.prepend(theme, global);
  installMaterials();
}

export function setSystemBackdrop(kind: MaterialKind | null, target: HTMLElement = document.documentElement): void {
  installTheme();
  if (isSystemBackdropKind(kind)) requestSystemBackdrop(kind);
  if (kind) target.setAttribute('data-win-backdrop', kind);
  else target.removeAttribute('data-win-backdrop');
}

const listeners = new Set<(theme: EffectiveTheme, target: Element) => void>();
const darkQuery = typeof matchMedia !== 'undefined' ? matchMedia('(prefers-color-scheme: dark)') : null;
darkQuery?.addEventListener('change', () => {
  if (typeof document === 'undefined') return;
  const root = document.documentElement;
  if (!root.hasAttribute('data-win-theme')) notify(root);
});

function notify(target: Element): void {
  const eff = getEffectiveTheme(target);
  for (const l of listeners) l(eff, target);
  target.dispatchEvent(new CustomEvent('win-theme-change', { detail: { theme: eff }, bubbles: true, composed: true }));
}

export function setTheme(
  mode: ThemeMode,
  target: Element = document.documentElement,
  opts: { animate?: boolean } = {},
): void {
  installTheme();
  const apply = () => {
    if (mode === 'system') target.removeAttribute('data-win-theme');
    else target.setAttribute('data-win-theme', mode);
    notify(target);
  };
  type VT = { ready?: Promise<unknown>; finished?: Promise<unknown>; updateCallbackDone?: Promise<unknown> };
  const doc = document as Document & { startViewTransition?: (cb: () => void) => VT | undefined };
  if (opts.animate && doc.startViewTransition && !prefersReducedMotion()) {
    const t = doc.startViewTransition(apply);
    for (const p of [t?.ready, t?.finished, t?.updateCallbackDone]) p?.catch(() => {});
  } else apply();
}

export function getTheme(target: Element = document.documentElement): ThemeMode {
  const v = target.getAttribute('data-win-theme');
  return v === 'light' || v === 'dark' ? v : 'system';
}

export function getEffectiveTheme(el: Element = document.documentElement): EffectiveTheme {
  let n: Node | null = el;
  while (n) {
    if (n instanceof Element) {
      const v = n.getAttribute('data-win-theme');
      if (v === 'light' || v === 'dark') return v;
    }
    n = n instanceof ShadowRoot ? n.host : n.parentNode;
  }
  return darkQuery?.matches ? 'dark' : 'light';
}

export function onThemeChange(cb: (theme: EffectiveTheme, target: Element) => void): () => void {
  listeners.add(cb);
  return () => listeners.delete(cb);
}

export function prefersReducedMotion(): boolean {
  if (typeof document !== 'undefined' && document.documentElement.dataset.winMotion === 'reduced') {
    return true;
  }
  return typeof matchMedia !== 'undefined' && matchMedia('(prefers-reduced-motion: reduce)').matches;
}

export function setMotion(mode: 'full' | 'reduced'): void {
  if (mode === 'reduced') document.documentElement.dataset.winMotion = 'reduced';
  else delete document.documentElement.dataset.winMotion;
}

type Rgb = [number, number, number];
type Oklch = [number, number, number];

function hexToRgb(hex: string): Rgb {
  let h = hex.trim().replace('#', '');
  if (h.length === 3) h = h.replace(/./g, (c) => c + c);
  if (h.length === 8) h = h.slice(2);
  const n = Number.parseInt(h.slice(0, 6), 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex([r, g, b]: Rgb): string {
  const c = (x: number) =>
    Math.round(Math.min(255, Math.max(0, x)))
      .toString(16)
      .padStart(2, '0');
  return `#${c(r)}${c(g)}${c(b)}`.toUpperCase();
}

const toLin = (c: number) => {
  const x = c / 255;
  return x <= 0.04045 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4;
};
const fromLin = (x: number) => 255 * (x <= 0.0031308 ? 12.92 * x : 1.055 * x ** (1 / 2.4) - 0.055);

function rgbToOklch([r, g, b]: Rgb): Oklch {
  const lr = toLin(r);
  const lg = toLin(g);
  const lb = toLin(b);
  const l = Math.cbrt(0.4122214708 * lr + 0.5363325363 * lg + 0.0514459929 * lb);
  const m = Math.cbrt(0.2119034982 * lr + 0.6806995451 * lg + 0.1073969566 * lb);
  const s = Math.cbrt(0.0883024619 * lr + 0.2817188376 * lg + 0.6299787005 * lb);
  const L = 0.2104542553 * l + 0.793617785 * m - 0.0040720468 * s;
  const A = 1.9779984951 * l - 2.428592205 * m + 0.4505937099 * s;
  const B = 0.0259040371 * l + 0.7827717662 * m - 0.808675766 * s;
  return [L, Math.hypot(A, B), Math.atan2(B, A)];
}

function oklchToRgb([L, C, H]: Oklch): { rgb: Rgb; inGamut: boolean } {
  const A = C * Math.cos(H);
  const B = C * Math.sin(H);
  const l = (L + 0.3963377774 * A + 0.2158037573 * B) ** 3;
  const m = (L - 0.1055613458 * A - 0.0638541728 * B) ** 3;
  const s = (L - 0.0894841775 * A - 1.291485548 * B) ** 3;
  const lin: Rgb = [
    4.0767416621 * l - 3.3077115913 * m + 0.2309699292 * s,
    -1.2684380046 * l + 2.6097574011 * m - 0.3413193965 * s,
    -0.0041960863 * l - 0.7034186147 * m + 1.707614701 * s,
  ];
  const inGamut = lin.every((v) => v >= -1e-4 && v <= 1 + 1e-4);
  return { rgb: lin.map(fromLin) as Rgb, inGamut };
}

function gamutMap(c: Oklch): Rgb {
  let [L, C, H] = c;
  L = Math.min(1, Math.max(0, L));
  for (let i = 0; i < 40; i++) {
    const r = oklchToRgb([L, C, H]);
    if (r.inGamut || C < 1e-4) return r.rgb;
    C *= 0.95;
  }
  return oklchToRgb([L, 0, H]).rgb;
}

const SHADES = [
  'SystemAccentColorLight1',
  'SystemAccentColorLight2',
  'SystemAccentColorLight3',
  'SystemAccentColorDark1',
  'SystemAccentColorDark2',
  'SystemAccentColorDark3',
] as const;

const DEFAULT_SHADES: Record<(typeof SHADES)[number] | 'SystemAccentColor', string> = {
  SystemAccentColor: '#0078D4',
  SystemAccentColorLight1: '#0093F9',
  SystemAccentColorLight2: '#60CDFF',
  SystemAccentColorLight3: '#99EBFF',
  SystemAccentColorDark1: '#005FB8',
  SystemAccentColorDark2: '#003E92',
  SystemAccentColorDark3: '#001A68',
};

export function deriveAccentPalette(base: string): Record<string, string> {
  const ref = rgbToOklch(hexToRgb(DEFAULT_SHADES.SystemAccentColor));
  const src = rgbToOklch(hexToRgb(base));
  const out: Record<string, string> = { SystemAccentColor: rgbToHex(hexToRgb(base)) };
  for (const shade of SHADES) {
    const d = rgbToOklch(hexToRgb(DEFAULT_SHADES[shade]));
    const L = src[0] + (d[0] - ref[0]);
    const C = ref[1] > 1e-4 ? src[1] * (d[1] / ref[1]) : d[1];
    const H = src[2] + (d[2] - ref[2]);
    out[shade] = rgbToHex(gamutMap([L, C, H]));
  }
  return out;
}

const cssKey = (k: string) => `--w-${k.replace(/([a-z0-9])([A-Z])/g, '$1-$2').toLowerCase()}`;

export function setAccentColor(base: string | null, target: HTMLElement = document.documentElement): void {
  installTheme();
  if (!base) {
    for (const k of Object.keys(DEFAULT_SHADES)) target.style.removeProperty(cssKey(k));
    return;
  }
  const palette = deriveAccentPalette(base);
  for (const [k, v] of Object.entries(palette)) target.style.setProperty(cssKey(k), v);
}

export { lightPalette, darkPalette, highContrastPalette, accentDefaults };
export type { Palette };
