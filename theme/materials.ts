export type InAppAcrylicKind =
  'acrylic' | 'acrylic-base' | 'acrylic-inverse' | 'accent-acrylic' | 'accent-acrylic-base';
export type SystemBackdropKind =
  'mica' | 'mica-alt' | 'desktop-acrylic' | 'desktop-acrylic-base' | 'desktop-acrylic-thin';
export type MaterialKind = InAppAcrylicKind | SystemBackdropKind | 'custom-acrylic' | 'solid' | 'transparent';

export const inAppAcrylicKinds: readonly InAppAcrylicKind[] = [
  'acrylic',
  'acrylic-base',
  'acrylic-inverse',
  'accent-acrylic',
  'accent-acrylic-base',
];
export const systemBackdropKinds: readonly SystemBackdropKind[] = [
  'mica',
  'mica-alt',
  'desktop-acrylic',
  'desktop-acrylic-base',
  'desktop-acrylic-thin',
];
export const materialKinds: readonly MaterialKind[] = [
  ...inAppAcrylicKinds,
  ...systemBackdropKinds,
  'custom-acrylic',
  'solid',
  'transparent',
];

export function isMaterialKind(v: unknown): v is MaterialKind {
  return typeof v === 'string' && (materialKinds as readonly string[]).includes(v);
}
export function isSystemBackdropKind(v: unknown): v is SystemBackdropKind {
  return typeof v === 'string' && (systemBackdropKinds as readonly string[]).includes(v);
}
export function usesBackdropFilter(kind: MaterialKind): boolean {
  return kind === 'custom-acrylic' || (inAppAcrylicKinds as readonly string[]).includes(kind);
}

const ACRYLIC_TOKEN: Record<InAppAcrylicKind, string> = {
  acrylic: '--w-acrylic-in-app-fill-color-default',
  'acrylic-base': '--w-acrylic-in-app-fill-color-base',
  'acrylic-inverse': '--w-acrylic-in-app-fill-color-default-inverse',
  'accent-acrylic': '--w-accent-acrylic-in-app-fill-color-default',
  'accent-acrylic-base': '--w-accent-acrylic-in-app-fill-color-base',
};

export const ACRYLIC_BLUR = 30;
export const MICA_BLUR = 80;
const NOISE_TILE = 256;
const FADE_MS = 250;

export interface BackdropRecipe {
  tintColor: string;
  tintOpacity: number;
  luminosityOpacity: number;
  fallbackColor: string;
  blur: number;
  noise: boolean;
}

export const systemBackdropRecipes: Readonly<
  Record<'light' | 'dark', Readonly<Record<SystemBackdropKind, BackdropRecipe>>>
> = {
  light: {
    mica: {
      tintColor: '#F3F3F3',
      tintOpacity: 0.5,
      luminosityOpacity: 1,
      fallbackColor: '#F3F3F3',
      blur: MICA_BLUR,
      noise: false,
    },
    'mica-alt': {
      tintColor: '#DADADA',
      tintOpacity: 0.5,
      luminosityOpacity: 1,
      fallbackColor: '#E8E8E8',
      blur: MICA_BLUR,
      noise: false,
    },
    'desktop-acrylic': {
      tintColor: '#FCFCFC',
      tintOpacity: 0,
      luminosityOpacity: 0.85,
      fallbackColor: '#F9F9F9',
      blur: ACRYLIC_BLUR,
      noise: true,
    },
    'desktop-acrylic-base': {
      tintColor: '#F3F3F3',
      tintOpacity: 0,
      luminosityOpacity: 0.9,
      fallbackColor: '#EEEEEE',
      blur: ACRYLIC_BLUR,
      noise: true,
    },
    'desktop-acrylic-thin': {
      tintColor: '#D3D3D3',
      tintOpacity: 0,
      luminosityOpacity: 0.44,
      fallbackColor: '#D3D3D3',
      blur: ACRYLIC_BLUR,
      noise: true,
    },
  },
  dark: {
    mica: {
      tintColor: '#202020',
      tintOpacity: 0.8,
      luminosityOpacity: 1,
      fallbackColor: '#202020',
      blur: MICA_BLUR,
      noise: false,
    },
    'mica-alt': {
      tintColor: '#0A0A0A',
      tintOpacity: 0,
      luminosityOpacity: 1,
      fallbackColor: '#202020',
      blur: MICA_BLUR,
      noise: false,
    },
    'desktop-acrylic': {
      tintColor: '#2C2C2C',
      tintOpacity: 0.15,
      luminosityOpacity: 0.96,
      fallbackColor: '#2C2C2C',
      blur: ACRYLIC_BLUR,
      noise: true,
    },
    'desktop-acrylic-base': {
      tintColor: '#202020',
      tintOpacity: 0.5,
      luminosityOpacity: 0.96,
      fallbackColor: '#1C1C1C',
      blur: ACRYLIC_BLUR,
      noise: true,
    },
    'desktop-acrylic-thin': {
      tintColor: '#545454',
      tintOpacity: 0,
      luminosityOpacity: 0.64,
      fallbackColor: '#545454',
      blur: ACRYLIC_BLUR,
      noise: true,
    },
  },
};

type Rgba = [number, number, number, number];

function parseColor(input: string): Rgba {
  const s = input.trim();
  const hex = /^#([0-9a-f]{3,8})$/i.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length === 3 || h.length === 4) h = [...h].map((c) => c + c).join('');
    const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
    return [n(0), n(2), n(4), h.length === 8 ? n(6) : 255];
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+)(%?))?\s*\)$/i.exec(s);
  if (fn) {
    const a = fn[4] === undefined ? 1 : Number(fn[4]) / (fn[5] ? 100 : 1);
    return [Math.round(Number(fn[1])), Math.round(Number(fn[2])), Math.round(Number(fn[3])), Math.round(a * 255)];
  }
  if (typeof document !== 'undefined') {
    const g = document.createElement('canvas').getContext('2d');
    if (g) {
      g.fillStyle = '#000';
      g.fillStyle = s;
      const v = g.fillStyle;
      if (v !== s) return parseColor(v);
    }
  }
  throw new Error(`Unsupported color: ${input}`);
}

const css = ([r, g, b, a]: Rgba) => `rgba(${r}, ${g}, ${b}, ${+(a / 255).toFixed(4)})`;
const toByte = (x: number) => Math.round(Math.min(1, Math.max(0, x)) * 255);

function rgbToHsv(r: number, g: number, b: number): [number, number, number] {
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const c = max - min;
  if (c === 0) return [0, 0, max];
  let h = r === max ? (60 * (g - b)) / c : g === max ? 120 + (60 * (b - r)) / c : 240 + (60 * (r - g)) / c;
  if (h < 0) h += 360;
  return [h, c / max, max];
}

function hsvToRgb(h: number, s: number, v: number): [number, number, number] {
  if (s === 0) return [v, v, v];
  const hh = (h % 360) / 60;
  const i = Math.floor(hh);
  const f = hh - i;
  const p = v * (1 - s);
  const q = v * (1 - s * f);
  const t = v * (1 - s * (1 - f));
  return (
    [
      [v, t, p],
      [q, v, p],
      [p, v, t],
      [p, q, v],
      [t, p, v],
      [v, p, q],
    ] as const
  )[i % 6] as [number, number, number];
}

function tintOpacityModifier([r, g, b]: Rgba): number {
  const mid = 0.5;
  const white = 0.45;
  const midMax = 0.9;
  const black = 0.85;
  const [, s, v] = rgbToHsv(r / 255, g / 255, b / 255);
  if (v === mid) return midMax;
  const lowest = v > mid ? white : black;
  const maxDeviation = v > mid ? 1 - mid : mid;
  let suppression = midMax - lowest;
  if (s > 0) suppression *= Math.max(1 - s * 2, 0);
  return midMax - suppression * (Math.abs(v - mid) / maxDeviation);
}

export interface AcrylicOptions {
  tintColor: string;
  tintOpacity?: number;
  tintLuminosityOpacity?: number | null;
  fallbackColor?: string;
}

export interface AcrylicLayers {
  tint: string;
  luminosity: string;
  fallback: string;
}

export function acrylicLayers(o: AcrylicOptions): AcrylicLayers {
  const tint = parseColor(o.tintColor);
  const opacity = o.tintOpacity ?? 1;
  const lum = o.tintLuminosityOpacity ?? null;
  const tintAlpha = Math.round(tint[3] * opacity);
  const effectiveTint: Rgba = [
    tint[0],
    tint[1],
    tint[2],
    lum === null ? Math.round(tint[3] * opacity * tintOpacityModifier(tint)) : tintAlpha,
  ];
  let luminosity: Rgba;
  if (lum !== null) luminosity = [tint[0], tint[1], tint[2], toByte(lum)];
  else {
    const [h, s, v] = rgbToHsv(tint[0] / 255, tint[1] / 255, tint[2] / 255);
    const [r, g, b] = hsvToRgb(h, s, Math.min(0.965, Math.max(0.125, v)));
    luminosity = [toByte(r), toByte(g), toByte(b), toByte(Math.min((tintAlpha / 255) * 0.88 + 0.15, 1))];
  }
  const fallback = parseColor(o.fallbackColor ?? o.tintColor);
  return {
    tint: css(effectiveTint),
    luminosity: css(luminosity),
    fallback: css([fallback[0], fallback[1], fallback[2], 255]),
  };
}

const filterId = (kind: InAppAcrylicKind) => `w-material-${kind}`;

function filterMarkup(id: string, fallback: string, luminosity: string, tint: string): string {
  return (
    `<filter id="${id}" x="0" y="0" width="1" height="1" color-interpolation-filters="sRGB">` +
    `<feFlood style="flood-color:${fallback}" result="f"/>` +
    `<feComposite in="SourceGraphic" in2="f" operator="over" result="b"/>` +
    `<feFlood style="flood-color:${luminosity}" result="l"/>` +
    `<feBlend in="l" in2="b" mode="luminosity" result="m"/>` +
    `<feFlood style="flood-color:${tint}" result="t"/>` +
    `<feBlend in="t" in2="m" mode="color"/>` +
    `</filter>`
  );
}

const DEFS_STYLE = 'position:absolute;width:0;height:0;overflow:hidden;pointer-events:none';

export function materialDefsMarkup(): string {
  const filters = inAppAcrylicKinds
    .map((k) =>
      filterMarkup(
        filterId(k),
        `var(--w-material-${k}-fallback)`,
        `var(--w-material-${k}-luminosity)`,
        `var(--w-material-${k}-tint)`,
      ),
    )
    .join('');
  return `<svg class="w-material-defs" aria-hidden="true" focusable="false" width="0" height="0" style="${DEFS_STYLE}"><defs>${filters}</defs></svg>`;
}

const defsByRoot = new WeakMap<Node, SVGDefsElement>();
let defsTemplate: HTMLTemplateElement | null = null;

export function ensureMaterialDefs(root: ShadowRoot | Document): SVGDefsElement {
  const existing = defsByRoot.get(root);
  if (existing?.isConnected) return existing;
  defsTemplate ??= Object.assign(document.createElement('template'), { innerHTML: materialDefsMarkup() });
  const svg = defsTemplate.content.firstElementChild!.cloneNode(true) as SVGSVGElement;
  if (root instanceof Document) (root.body ?? root.documentElement).append(svg);
  else root.append(svg);
  const defs = svg.querySelector('defs')!;
  defsByRoot.set(root, defs);
  return defs;
}

interface CustomAcrylic {
  options: AcrylicOptions;
  id: string;
  filter: SVGFilterElement | null;
}

const customs = new Map<HTMLElement, CustomAcrylic>();
let customSeq = 0;

function forcedFallback(): boolean {
  const root = document.documentElement;
  if (root.dataset.winTransparency === 'off' || matchMedia('(forced-colors: active)').matches) return true;
  return root.dataset.winTransparency !== 'on' && matchMedia('(prefers-reduced-transparency: reduce)').matches;
}

function applyCustom(el: HTMLElement, c: CustomAcrylic): void {
  const l = acrylicLayers(c.options);
  const approx = document.documentElement.dataset.winMaterialEngine === 'approx';
  const fallback = forcedFallback();
  const root = (el.shadowRoot ?? el.getRootNode()) as ShadowRoot | Document;
  if (!fallback && !approx) {
    const defs = ensureMaterialDefs(root);
    c.filter?.remove();
    const t = document.createElement('template');
    t.innerHTML = `<svg>${filterMarkup(c.id, l.fallback, l.luminosity, l.tint)}</svg>`;
    c.filter = t.content.querySelector('filter');
    if (c.filter) defs.append(c.filter);
  }
  const s = el.style;
  s.setProperty('--w-material-custom-acrylic-fallback', l.fallback);
  s.setProperty(
    '--w-material-custom-acrylic-color',
    fallback ? l.fallback : approx ? `color-mix(in srgb, ${l.tint}, ${l.luminosity})` : 'transparent',
  );
  s.setProperty('--w-material-custom-acrylic-noise', fallback ? 'none' : 'var(--w-material-noise, none)');
  s.setProperty(
    '--w-material-custom-acrylic-backdrop',
    fallback ? 'none' : approx ? `blur(${ACRYLIC_BLUR}px)` : `blur(${ACRYLIC_BLUR}px) url(#${c.id})`,
  );
}

export function setAcrylic(el: HTMLElement, options: AcrylicOptions | null): void {
  const prev = customs.get(el);
  if (!options) {
    prev?.filter?.remove();
    customs.delete(el);
    for (const p of ['fallback', 'color', 'noise', 'backdrop'])
      el.style.removeProperty(`--w-material-custom-acrylic-${p}`);
    if (el.getAttribute('material') === 'custom-acrylic') el.removeAttribute('material');
    return;
  }
  const c: CustomAcrylic = prev
    ? { ...prev, options }
    : { options, id: `w-acrylic-${(++customSeq).toString(36)}`, filter: null };
  customs.set(el, c);
  applyCustom(el, c);
  if (el.getAttribute('material') !== 'custom-acrylic') el.setAttribute('material', 'custom-acrylic');
}

function reapplyCustoms(): void {
  for (const [el, c] of customs) {
    if (!el.isConnected) {
      c.filter?.remove();
      customs.delete(el);
    } else applyCustom(el, c);
  }
}

const NOISE_LEVELS: ReadonlyArray<readonly [number, number]> = [
  [0, 1311],
  [51, 9094],
  [102, 22034],
  [153, 22214],
  [204, 9351],
  [255, 1532],
];

function noiseImageData(): ImageData {
  const total = NOISE_LEVELS.reduce((s, [, n]) => s + n, 0);
  const data = new ImageData(NOISE_TILE, NOISE_TILE);
  let seed = 0x5eed1e55;
  const rand = () => {
    seed = (seed + 0x6d2b79f5) | 0;
    let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  for (let i = 0; i < NOISE_TILE * NOISE_TILE; i++) {
    let x = rand() * total;
    let v = 255;
    for (const [level, n] of NOISE_LEVELS) {
      if (x < n) {
        v = level;
        break;
      }
      x -= n;
    }
    data.data.set([v, v, v, 5], i * 4);
  }
  return data;
}

function canvas(w: number, h: number): HTMLCanvasElement {
  return Object.assign(document.createElement('canvas'), { width: w, height: h });
}

function toObjectUrl(c: HTMLCanvasElement): Promise<string> {
  return new Promise((resolve, reject) =>
    c.toBlob((b) => (b ? resolve(URL.createObjectURL(b)) : reject(new Error('encode failed'))), 'image/png'),
  );
}

let noiseStarted = false;
function ensureNoise(): void {
  if (noiseStarted || typeof document === 'undefined') return;
  noiseStarted = true;
  const c = canvas(NOISE_TILE, NOISE_TILE);
  c.getContext('2d')!.putImageData(noiseImageData(), 0, 0);
  void toObjectUrl(c).then((url) => document.documentElement.style.setProperty('--w-material-noise', `url("${url}")`));
}

export type WallpaperFit = 'fill' | 'fit' | 'stretch' | 'tile' | 'center' | 'span';

export interface WallpaperOptions {
  fit?: WallpaperFit;
  color?: string;
}

interface Wallpaper {
  image: ImageBitmap;
  fit: WallpaperFit;
  color: string;
}

let wallpaper: Wallpaper | null = null;
let wallpaperGeneration = 0;
const textureUrls = new Map<string, string>();

function screenSize(): [number, number] {
  return [Math.max(1, screen.width || innerWidth), Math.max(1, screen.height || innerHeight)];
}

function drawWallpaper(g: CanvasRenderingContext2D, w: Wallpaper, W: number, H: number, scale: number): void {
  g.fillStyle = w.color;
  g.fillRect(0, 0, W, H);
  const iw = w.image.width;
  const ih = w.image.height;
  const native = scale / (devicePixelRatio || 1);
  if (w.fit === 'tile') {
    const p = g.createPattern(w.image, 'repeat');
    if (p) {
      p.setTransform(new DOMMatrix().scale(native));
      g.fillStyle = p;
      g.fillRect(0, 0, W, H);
    }
    return;
  }
  let dw = W;
  let dh = H;
  if (w.fit === 'fill' || w.fit === 'span') {
    const s = Math.max(W / iw, H / ih);
    dw = iw * s;
    dh = ih * s;
  } else if (w.fit === 'fit') {
    const s = Math.min(W / iw, H / ih);
    dw = iw * s;
    dh = ih * s;
  } else if (w.fit === 'center') {
    dw = iw * native;
    dh = ih * native;
  }
  g.imageSmoothingQuality = 'high';
  g.drawImage(w.image, (W - dw) / 2, (H - dh) / 2, dw, dh);
}

function blurPlane(src: Float32Array, w: number, h: number, sigma: number): Float32Array {
  const r = Math.max(1, Math.ceil(sigma * 3));
  const k = new Float32Array(2 * r + 1);
  let sum = 0;
  for (let i = -r; i <= r; i++) sum += k[i + r] = Math.exp(-(i * i) / (2 * sigma * sigma));
  for (let i = 0; i < k.length; i++) k[i]! /= sum;
  const tmp = new Float32Array(w * h);
  const out = new Float32Array(w * h);
  for (let y = 0; y < h; y++) {
    const row = y * w;
    for (let x = 0; x < w; x++) {
      let a = 0;
      for (let i = -r; i <= r; i++) a += src[row + Math.min(w - 1, Math.max(0, x + i))]! * k[i + r]!;
      tmp[row + x] = a;
    }
  }
  for (let x = 0; x < w; x++) {
    for (let y = 0; y < h; y++) {
      let a = 0;
      for (let i = -r; i <= r; i++) a += tmp[Math.min(h - 1, Math.max(0, y + i)) * w + x]! * k[i + r]!;
      out[y * w + x] = a;
    }
  }
  return out;
}

const idle = () => new Promise<void>((r) => setTimeout(r, 0));

interface Grid {
  w: number;
  h: number;
  planes: Float32Array[];
}

const gridCache = new Map<number, Grid>();

async function blurredGrid(w: Wallpaper, sigma: number, W: number, H: number): Promise<Grid> {
  const cached = gridCache.get(sigma);
  if (cached) return cached;
  const cell = sigma >= 60 ? 8 : 4;
  const gw = Math.max(2, Math.ceil(W / cell));
  const gh = Math.max(2, Math.ceil(H / cell));
  const small = canvas(gw, gh);
  const sg = small.getContext('2d', { willReadFrequently: true })!;
  drawWallpaper(sg, w, gw, gh, gw / W);
  const px = sg.getImageData(0, 0, gw, gh).data;
  const planes: Float32Array[] = [];
  for (let c = 0; c < 3; c++) {
    const p = new Float32Array(gw * gh);
    for (let i = 0; i < p.length; i++) p[i] = px[i * 4 + c]! / 255;
    planes.push(blurPlane(p, gw, gh, sigma / cell));
    await idle();
  }
  const grid = { w: gw, h: gh, planes };
  gridCache.set(sigma, grid);
  return grid;
}

function blendGrid(g: Grid, recipe: BackdropRecipe): Float32Array[] {
  const tint = parseColor(recipe.tintColor);
  const T = [tint[0] / 255, tint[1] / 255, tint[2] / 255] as const;
  const lo = toByte(recipe.luminosityOpacity) / 255;
  const to = Math.round(tint[3] * recipe.tintOpacity) / 255;
  const lum = (r: number, gg: number, b: number) => 0.3 * r + 0.59 * gg + 0.11 * b;
  const setLum = (r: number, gg: number, b: number, l: number, out: number[]) => {
    const d = l - lum(r, gg, b);
    let x = r + d;
    let y = gg + d;
    let z = b + d;
    const L = lum(x, y, z);
    const n = Math.min(x, y, z);
    const m = Math.max(x, y, z);
    if (n < 0) {
      const s = L / (L - n);
      x = L + (x - L) * s;
      y = L + (y - L) * s;
      z = L + (z - L) * s;
    }
    if (m > 1) {
      const s = (1 - L) / (m - L);
      x = L + (x - L) * s;
      y = L + (y - L) * s;
      z = L + (z - L) * s;
    }
    out[0] = x;
    out[1] = y;
    out[2] = z;
  };
  const lumT = lum(T[0], T[1], T[2]);
  const n = g.w * g.h;
  const out = [new Float32Array(n), new Float32Array(n), new Float32Array(n)];
  const a: number[] = [0, 0, 0];
  const b: number[] = [0, 0, 0];
  const [pr, pg, pb] = g.planes as [Float32Array, Float32Array, Float32Array];
  for (let i = 0; i < n; i++) {
    const r = pr[i]!;
    const gg = pg[i]!;
    const bb = pb[i]!;
    setLum(r, gg, bb, lumT, a);
    const r1 = r + (a[0]! - r) * lo;
    const g1 = gg + (a[1]! - gg) * lo;
    const b1 = bb + (a[2]! - bb) * lo;
    setLum(T[0], T[1], T[2], lum(r1, g1, b1), b);
    out[0]![i] = r1 + (b[0]! - r1) * to;
    out[1]![i] = g1 + (b[1]! - g1) * to;
    out[2]![i] = b1 + (b[2]! - b1) * to;
  }
  return out;
}

async function upsample(g: Grid, planes: Float32Array[], W: number, H: number): Promise<HTMLCanvasElement> {
  const img = new ImageData(W, H);
  const d = img.data;
  const sx = g.w / W;
  const sy = g.h / H;
  const xs = new Int32Array(W * 2);
  const ts = new Float32Array(W);
  for (let x = 0; x < W; x++) {
    const fx = Math.min(g.w - 1, Math.max(0, (x + 0.5) * sx - 0.5));
    const x0 = Math.floor(fx);
    xs[x * 2] = x0;
    xs[x * 2 + 1] = Math.min(g.w - 1, x0 + 1);
    ts[x] = fx - x0;
  }
  for (let y = 0; y < H; y++) {
    const fy = Math.min(g.h - 1, Math.max(0, (y + 0.5) * sy - 0.5));
    const y0 = Math.floor(fy);
    const r0 = y0 * g.w;
    const r1 = Math.min(g.h - 1, y0 + 1) * g.w;
    const ty = fy - y0;
    for (let x = 0; x < W; x++) {
      const x0 = xs[x * 2]!;
      const x1 = xs[x * 2 + 1]!;
      const tx = ts[x]!;
      const o = (y * W + x) * 4;
      for (let c = 0; c < 3; c++) {
        const p = planes[c]!;
        const top = p[r0 + x0]! + (p[r0 + x1]! - p[r0 + x0]!) * tx;
        const bottom = p[r1 + x0]! + (p[r1 + x1]! - p[r1 + x0]!) * tx;
        d[o + c] = (top + (bottom - top) * ty) * 255;
      }
      d[o + 3] = 255;
    }
    if ((y & 63) === 63) await idle();
  }
  const c = canvas(W, H);
  c.getContext('2d')!.putImageData(img, 0, 0);
  return c;
}

const requestedKinds = new Set<SystemBackdropKind>(['mica', 'mica-alt']);
const renderedKinds = new Set<SystemBackdropKind>();
let renderQueue: Promise<void> = Promise.resolve();

export function requestSystemBackdrop(kind: SystemBackdropKind): void {
  if (requestedKinds.has(kind)) return;
  requestedKinds.add(kind);
  if (wallpaper) scheduleTextures(wallpaperGeneration);
}

function scheduleTextures(gen: number): void {
  renderQueue = renderQueue.then(() => renderTextures(gen)).catch(() => {});
}

async function renderTextures(gen: number): Promise<void> {
  const w = wallpaper;
  if (!w || gen !== wallpaperGeneration) return;
  const root = document.documentElement;
  const [sw, sh] = screenSize();
  const W = Math.round(sw);
  const H = Math.round(sh);
  for (const kind of requestedKinds) {
    if (renderedKinds.has(kind)) continue;
    for (const theme of ['light', 'dark'] as const) {
      const recipe = systemBackdropRecipes[theme][kind];
      const grid = await blurredGrid(w, recipe.blur, W, H);
      if (gen !== wallpaperGeneration) return;
      const url = await toObjectUrl(await upsample(grid, blendGrid(grid, recipe), W, H));
      if (gen !== wallpaperGeneration) {
        URL.revokeObjectURL(url);
        return;
      }
      const prop = `--w-backdrop-image-${kind}-${theme}`;
      const old = textureUrls.get(prop);
      textureUrls.set(prop, url);
      root.style.setProperty(prop, `url("${url}")`);
      if (old) URL.revokeObjectURL(old);
    }
    renderedKinds.add(kind);
  }
}

function resetTextureCaches(): void {
  gridCache.clear();
  renderedKinds.clear();
}

function clearTextures(): void {
  resetTextureCaches();
  const root = document.documentElement;
  for (const [prop, url] of textureUrls) {
    root.style.removeProperty(prop);
    URL.revokeObjectURL(url);
  }
  textureUrls.clear();
}

let lastScreen = '';

export async function setWallpaper(
  source: string | Blob | ImageBitmap | null,
  options: WallpaperOptions = {},
): Promise<void> {
  const gen = ++wallpaperGeneration;
  if (!source) {
    wallpaper?.image.close();
    wallpaper = null;
    clearTextures();
    return;
  }
  let image: ImageBitmap;
  if (source instanceof ImageBitmap) image = source;
  else {
    const blob = typeof source === 'string' ? await (await fetch(source)).blob() : source;
    image = await createImageBitmap(blob);
  }
  if (gen !== wallpaperGeneration) {
    image.close();
    return;
  }
  wallpaper?.image.close();
  wallpaper = { image, fit: options.fit ?? 'fill', color: options.color ?? '#000000' };
  lastScreen = screenSize().join('x');
  resetTextureCaches();
  startWindowTracking();
  scheduleTextures(gen);
  await renderQueue;
}

export function hasWallpaper(): boolean {
  return wallpaper !== null;
}

let tracking = false;
let lastOrigin = '';
let rafUntil = 0;

function syncWindowGeometry(): boolean {
  const root = document.documentElement;
  const [sw, sh] = screenSize();
  const scr = screen as Screen & { availLeft?: number; availTop?: number; left?: number; top?: number };
  const left = scr.left ?? scr.availLeft ?? 0;
  const top = scr.top ?? scr.availTop ?? 0;
  const border = Math.max(0, (outerWidth - innerWidth) / 2);
  const x = Math.round(screenX + border - left);
  const y = Math.round(screenY + Math.max(0, outerHeight - innerHeight - border) - top);
  const key = `${x},${y},${sw},${sh}`;
  if (key === lastOrigin) return false;
  lastOrigin = key;
  root.style.setProperty('--w-window-x', `${x}px`);
  root.style.setProperty('--w-window-y', `${y}px`);
  root.style.setProperty('--w-screen-width', `${sw}px`);
  root.style.setProperty('--w-screen-height', `${sh}px`);
  const scr2 = `${sw}x${sh}`;
  if (wallpaper && scr2 !== lastScreen) {
    lastScreen = scr2;
    resetTextureCaches();
    scheduleTextures(++wallpaperGeneration);
  }
  return true;
}

function rafLoop(): void {
  if (syncWindowGeometry()) rafUntil = performance.now() + 800;
  if (performance.now() < rafUntil) requestAnimationFrame(rafLoop);
}

function startWindowTracking(): void {
  if (tracking || typeof window === 'undefined') return;
  tracking = true;
  syncWindowGeometry();
  setInterval(() => {
    if (document.visibilityState !== 'visible') return;
    if (syncWindowGeometry() && performance.now() >= rafUntil) {
      rafUntil = performance.now() + 800;
      requestAnimationFrame(rafLoop);
    }
  }, 300);
  addEventListener('resize', () => syncWindowGeometry());
}

const fades = new WeakMap<Element, Animation>();

export function fadeBackdropActivity(el: HTMLElement, inactive: boolean | null, animate = true): void {
  const read = (n: Element | null) =>
    n ? Number.parseFloat(getComputedStyle(n).getPropertyValue('--w-window-inactive')) || 0 : 0;
  const parent = el.parentElement ?? ((el.getRootNode() as ShadowRoot).host as Element | undefined) ?? null;
  const to = inactive === null ? read(parent) : inactive ? 1 : 0;
  const from = read(el);
  fades.get(el)?.cancel();
  if (inactive === null) el.style.removeProperty('--w-window-inactive');
  else el.style.setProperty('--w-window-inactive', String(to));
  const reduce =
    matchMedia('(prefers-reduced-motion: reduce)').matches || document.documentElement.dataset.winMotion === 'reduced';
  if (!animate || reduce || from === to) return;
  const anim = el.animate({ '--w-window-inactive': [String(from), String(to)] } as PropertyIndexedKeyframes, {
    duration: FADE_MS * Math.abs(to - from),
    easing: 'linear',
  });
  fades.set(el, anim);
}

export interface MaterialSettings {
  transparency?: 'auto' | 'on' | 'off';
  windowActivation?: 'auto' | 'always-active';
}

let activationMode: 'auto' | 'always-active' = 'auto';
let activationTracking = false;

function syncActivation(): void {
  const inactive = activationMode === 'auto' && (!document.hasFocus() || document.visibilityState !== 'visible');
  if ((document.documentElement.dataset.winWindowInactive !== undefined) === inactive) return;
  if (inactive) document.documentElement.dataset.winWindowInactive = '';
  else delete document.documentElement.dataset.winWindowInactive;
  fadeBackdropActivity(document.documentElement, inactive, document.visibilityState === 'visible');
}

function startActivationTracking(): void {
  if (activationTracking || typeof window === 'undefined') return;
  activationTracking = true;
  addEventListener('focus', syncActivation);
  addEventListener('blur', () => setTimeout(syncActivation, 0));
  document.addEventListener('visibilitychange', syncActivation);
  syncActivation();
}

export function configureMaterials(settings: MaterialSettings): void {
  const root = document.documentElement;
  if (settings.transparency) {
    if (settings.transparency === 'auto') delete root.dataset.winTransparency;
    else root.dataset.winTransparency = settings.transparency;
    reapplyCustoms();
  }
  if (settings.windowActivation) {
    activationMode = settings.windowActivation;
    syncActivation();
  }
}

export function getMaterialSettings(): Required<MaterialSettings> {
  const t = document.documentElement.dataset.winTransparency;
  return { transparency: t === 'on' || t === 'off' ? t : 'auto', windowActivation: activationMode };
}

let installed = false;

export function installMaterials(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  try {
    CSS.registerProperty({ name: '--w-window-inactive', syntax: '<number>', inherits: true, initialValue: '0' });
  } catch {}
  const brands = (navigator as Navigator & { userAgentData?: { brands?: { brand: string }[] } }).userAgentData?.brands;
  const chromium = brands
    ? brands.some((b) => b.brand === 'Chromium')
    : /Chrome\/|Chromium\//.test(navigator.userAgent);
  if (!chromium) document.documentElement.dataset.winMaterialEngine = 'approx';
  ensureNoise();
  ensureMaterialDefs(document);
  startActivationTracking();
  for (const q of ['(prefers-reduced-transparency: reduce)', '(forced-colors: active)']) {
    matchMedia(q).addEventListener('change', reapplyCustoms);
  }
}

export function materialDeclarations(kind: MaterialKind): string {
  if (kind === 'solid')
    return 'background: var(--w-solid-background-fill-color-base); -webkit-backdrop-filter: none; backdrop-filter: none;';
  if (kind === 'transparent') return 'background: transparent; -webkit-backdrop-filter: none; backdrop-filter: none;';
  const v = (s: string) => `var(--w-material-${kind}-${s})`;
  const noise = `${v('noise')} 0 0 / ${NOISE_TILE}px ${NOISE_TILE}px repeat`;
  if (usesBackdropFilter(kind)) {
    return `background: ${noise}, ${v('color')}; -webkit-backdrop-filter: ${v('backdrop')}; backdrop-filter: ${v('backdrop')};`;
  }
  const overlay = `linear-gradient(color-mix(in srgb, ${v('fallback')} calc(var(--w-window-inactive, 0) * 100%), transparent), color-mix(in srgb, ${v('fallback')} calc(var(--w-window-inactive, 0) * 100%), transparent))`;
  const image = `${v('image')} calc(0px - var(--w-window-x, 0px)) calc(0px - var(--w-window-y, 0px)) / var(--w-screen-width, 100vw) var(--w-screen-height, 100vh) no-repeat fixed`;
  return `background: ${overlay}, ${noise}, ${image}, ${v('color')}; -webkit-backdrop-filter: none; backdrop-filter: none;`;
}

export function materialOverrides(selector: string, attribute = 'material'): string {
  return materialKinds
    .map(
      (k) =>
        (selector === ':host' ? `:host([${attribute}="${k}"])` : `:host([${attribute}="${k}"]) ${selector}`) +
        ` { ${materialDeclarations(k)} }`,
    )
    .join('\n');
}

export function materialSurface(selector: string, kind: MaterialKind, attribute = 'material'): string {
  return `${selector} { ${materialDeclarations(kind)} }\n${materialOverrides(selector, attribute)}`;
}

export function materialThemeTokens(theme: 'light' | 'dark'): Record<string, string> {
  const t: Record<string, string> = {};
  for (const k of inAppAcrylicKinds) {
    const base = ACRYLIC_TOKEN[k];
    t[`--w-material-${k}-tint`] = `var(${base}-tint)`;
    t[`--w-material-${k}-luminosity`] = `var(${base}-luminosity)`;
    t[`--w-material-${k}-fallback`] = `var(${base}-fallback)`;
    t[`--w-material-${k}-color`] = 'transparent';
    t[`--w-material-${k}-noise`] = 'var(--w-material-noise, none)';
    t[`--w-material-${k}-backdrop`] = `blur(${ACRYLIC_BLUR}px) url(#${filterId(k)})`;
  }
  for (const k of systemBackdropKinds) {
    const r = systemBackdropRecipes[theme][k];
    t[`--w-material-${k}-fallback`] = r.fallbackColor;
    t[`--w-material-${k}-color`] = r.fallbackColor;
    t[`--w-material-${k}-noise`] = r.noise ? 'var(--w-material-noise, none)' : 'none';
    t[`--w-material-${k}-image`] = `var(--w-backdrop-image-${k}-${theme}, none)`;
  }
  return t;
}

export const customAcrylicDefaults: Readonly<Record<string, string>> = {
  '--w-material-custom-acrylic-fallback': 'transparent',
  '--w-material-custom-acrylic-color': 'transparent',
  '--w-material-custom-acrylic-noise': 'none',
  '--w-material-custom-acrylic-backdrop': 'none',
};

export function materialFallbackTokens(): Record<string, string> {
  const t: Record<string, string> = {};
  for (const k of inAppAcrylicKinds) {
    t[`--w-material-${k}-color`] = `var(--w-material-${k}-fallback)`;
    t[`--w-material-${k}-noise`] = 'none';
    t[`--w-material-${k}-backdrop`] = 'none';
  }
  for (const k of systemBackdropKinds) {
    t[`--w-material-${k}-noise`] = 'none';
    t[`--w-material-${k}-image`] = 'none';
  }
  return t;
}

export function materialApproxTokens(): Record<string, string> {
  const t: Record<string, string> = {};
  for (const k of inAppAcrylicKinds) {
    t[`--w-material-${k}-color`] = `color-mix(in srgb, var(--w-material-${k}-tint), var(--w-material-${k}-luminosity))`;
    t[`--w-material-${k}-backdrop`] = `blur(${ACRYLIC_BLUR}px)`;
  }
  return t;
}

export function materialHighContrastTokens(): Record<string, string> {
  const t: Record<string, string> = { ...materialFallbackTokens() };
  for (const k of systemBackdropKinds) {
    t[`--w-material-${k}-fallback`] = 'Canvas';
    t[`--w-material-${k}-color`] = 'Canvas';
  }
  return t;
}
