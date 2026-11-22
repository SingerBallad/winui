import { defineConfig } from 'vite';
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';

const FITS = { 0: 'center', 2: 'stretch', 6: 'fit', 10: 'fill', 22: 'span' };

function regValue(key, name) {
  try {
    const out = execFileSync('reg', ['query', key, '/v', name], { encoding: 'utf8', windowsHide: true });
    const m = new RegExp(`${name}\\s+REG_\\w+\\s+(.*)`).exec(out);
    return m ? m[1].trim() : null;
  } catch {
    return null;
  }
}

function windowsWallpaper() {
  if (process.platform !== 'win32') return null;
  const transcoded = join(process.env.APPDATA ?? '', 'Microsoft', 'Windows', 'Themes', 'TranscodedWallpaper');
  const configured = regValue('HKCU\\Control Panel\\Desktop', 'WallPaper');
  const file = existsSync(transcoded) ? transcoded : configured && existsSync(configured) ? configured : null;
  if (!file) return null;
  const style = regValue('HKCU\\Control Panel\\Desktop', 'WallpaperStyle') ?? '10';
  const tile = regValue('HKCU\\Control Panel\\Desktop', 'TileWallpaper') === '1';
  const rgb = (regValue('HKCU\\Control Panel\\Colors', 'Background') ?? '0 0 0').split(/\s+/).map(Number);
  const color = `#${rgb.map((v) => (v || 0).toString(16).padStart(2, '0')).join('')}`;
  return {
    file,
    fit: tile && style === '0' ? 'tile' : (FITS[style] ?? 'fill'),
    color,
    version: statSync(file).mtimeMs,
  };
}

function sniff(buf) {
  if (buf[0] === 0x89 && buf[1] === 0x50) return 'image/png';
  if (buf[0] === 0xff && buf[1] === 0xd8) return 'image/jpeg';
  if (buf[0] === 0x42 && buf[1] === 0x4d) return 'image/bmp';
  if (buf.subarray(8, 12).toString() === 'WEBP') return 'image/webp';
  return 'application/octet-stream';
}

const wallpaperEndpoint = {
  name: 'winui-system-wallpaper',
  configureServer(server) {
    server.middlewares.use((req, res, next) => {
      const path = req.url?.split('?')[0];
      if (path !== '/@winui/wallpaper' && path !== '/@winui/wallpaper.json') return next();
      const info = windowsWallpaper();
      res.setHeader('Cache-Control', 'no-store');
      if (!info) {
        res.statusCode = 404;
        res.end();
        return;
      }
      if (path.endsWith('.json')) {
        res.setHeader('Content-Type', 'application/json');
        res.end(
          JSON.stringify({ url: `/@winui/wallpaper?v=${Math.round(info.version)}`, fit: info.fit, color: info.color }),
        );
        return;
      }
      const buf = readFileSync(info.file);
      res.setHeader('Content-Type', sniff(buf));
      res.end(buf);
    });
  },
};

export default defineConfig({
  root: 'tools/gallery',
  plugins: [wallpaperEndpoint],
  server: {
    port: 5180,
    host: 'localhost',
    fs: { allow: ['../..'] },
  },
});
