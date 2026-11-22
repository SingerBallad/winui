import { fluentIconPlaceholder } from './fluent-icon-placeholder.ts';

export const fluentIconFontFamily = 'WinUI Fluent Icons';

let loading: Promise<void> | null = null;

function fontData(base64: string): ArrayBuffer {
  const bin = atob(base64);
  const bytes = new Uint8Array(bin.length);
  for (let i = 0; i < bin.length; i++) bytes[i] = bin.charCodeAt(i);
  return bytes.buffer;
}

export function isSegoeIconFontInstalled(): boolean {
  if (typeof document === 'undefined') return true;
  const ctx = document.createElement('canvas').getContext('2d');
  if (!ctx) return true;
  const probe = '';
  for (const generic of ['monospace', 'serif']) {
    ctx.font = `40px ${generic}`;
    const fallback = ctx.measureText(probe).width;
    ctx.font = `40px "Segoe Fluent Icons", ${generic}`;
    if (ctx.measureText(probe).width !== fallback) return true;
  }
  return false;
}

export function loadFluentIconFont(placeholder = false): Promise<void> {
  if (loading) return loading;
  const blank = placeholder ? new FontFace(fluentIconFontFamily, fontData(fluentIconPlaceholder)) : null;
  if (blank) document.fonts.add(blank);
  loading = import('./fluent-icon-font.ts')
    .then(async ({ fluentIconFont }) => {
      const face = new FontFace(fluentIconFontFamily, fontData(fluentIconFont));
      await face.load();
      document.fonts.add(face);
    })
    .finally(() => {
      if (blank) document.fonts.delete(blank);
    });
  loading.catch(() => {
    loading = null;
  });
  return loading;
}

export function installIconFont(): void {
  if (typeof document === 'undefined' || typeof FontFace === 'undefined') return;
  const missing = !isSegoeIconFontInstalled();
  if (missing || document.documentElement.getAttribute('data-win-icon-font') === 'fluent') {
    loadFluentIconFont(missing).catch(() => {});
  }
}
