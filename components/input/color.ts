export interface Rgba {
  r: number;
  g: number;
  b: number;
  a: number;
}

export interface Hsva {
  h: number;
  s: number;
  v: number;
  a: number;
}

const clamp01 = (x: number) => Math.min(1, Math.max(0, x));

export function parseColor(input: string | null | undefined): Rgba | null {
  if (!input) return null;
  const s = input.trim();
  const hex = /^#?([0-9a-f]{3,4}|[0-9a-f]{6}|[0-9a-f]{8})$/i.exec(s);
  if (hex) {
    let h = hex[1]!;
    if (h.length <= 4) h = [...h].map((c) => c + c).join('');
    const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
    return { r: n(0), g: n(2), b: n(4), a: h.length === 8 ? n(6) / 255 : 1 };
  }
  const fn = /^rgba?\(\s*([\d.]+)[\s,]+([\d.]+)[\s,]+([\d.]+)(?:[\s,/]+([\d.]+%?))?\s*\)$/i.exec(s);
  if (fn) {
    const a = fn[4] === undefined ? 1 : fn[4].endsWith('%') ? Number.parseFloat(fn[4]) / 100 : Number(fn[4]);
    return { r: Number(fn[1]), g: Number(fn[2]), b: Number(fn[3]), a: clamp01(a) };
  }
  if (typeof document !== 'undefined' && /^[a-z]+$/i.test(s)) {
    const probe = document.createElement('canvas').getContext('2d');
    if (probe) {
      probe.fillStyle = '#010203';
      probe.fillStyle = s;
      const out = String(probe.fillStyle);
      if (out !== '#010203' || s.toLowerCase() === '#010203') return parseColor(out);
    }
  }
  return null;
}

export function parseArgbHex(input: string): Rgba | null {
  const m = /^#?([0-9a-f]{6}|[0-9a-f]{8})$/i.exec(input.trim());
  if (!m) return null;
  const h = m[1]!;
  const n = (i: number) => Number.parseInt(h.slice(i, i + 2), 16);
  if (h.length === 8) return { a: n(0) / 255, r: n(2), g: n(4), b: n(6) };
  return { r: n(0), g: n(2), b: n(4), a: 1 };
}

const hx = (n: number) =>
  Math.round(Math.min(255, Math.max(0, n)))
    .toString(16)
    .padStart(2, '0')
    .toUpperCase();

export function toCssHex(c: Rgba): string {
  const base = `#${hx(c.r)}${hx(c.g)}${hx(c.b)}`;
  return c.a >= 0.9995 ? base : `${base}${hx(c.a * 255)}`;
}

export function toArgbHex(c: Rgba, withAlpha: boolean): string {
  return withAlpha ? `#${hx(c.a * 255)}${hx(c.r)}${hx(c.g)}${hx(c.b)}` : `#${hx(c.r)}${hx(c.g)}${hx(c.b)}`;
}

export function toCssRgba(c: Rgba): string {
  return `rgba(${Math.round(c.r)}, ${Math.round(c.g)}, ${Math.round(c.b)}, ${Number(c.a.toFixed(3))})`;
}

export function rgbToHsv(c: Rgba): Hsva {
  const r = c.r / 255;
  const g = c.g / 255;
  const b = c.b / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const d = max - min;
  let h = 0;
  if (d > 1e-9) {
    if (max === r) h = ((g - b) / d) % 6;
    else if (max === g) h = (b - r) / d + 2;
    else h = (r - g) / d + 4;
    h *= 60;
    if (h < 0) h += 360;
  }
  return { h, s: max === 0 ? 0 : d / max, v: max, a: c.a };
}

export function hsvToRgb(c: Hsva): Rgba {
  const h = (((c.h % 360) + 360) % 360) / 60;
  const s = clamp01(c.s);
  const v = clamp01(c.v);
  const i = Math.floor(h);
  const f = h - i;
  const p = v * (1 - s);
  const q = v * (1 - s * f);
  const t = v * (1 - s * (1 - f));
  const [r, g, b] =
    i % 6 === 0
      ? [v, t, p]
      : i === 1
        ? [q, v, p]
        : i === 2
          ? [p, v, t]
          : i === 3
            ? [p, q, v]
            : i === 4
              ? [t, p, v]
              : [v, p, q];
  return { r: r * 255, g: g * 255, b: b * 255, a: c.a };
}

export function luminance(c: Rgba): number {
  const f = (x: number) => {
    const s = x / 255;
    return s <= 0.03928 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * f(c.r) + 0.7152 * f(c.g) + 0.0722 * f(c.b);
}
