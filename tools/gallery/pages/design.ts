import { html, type GalleryPage } from './types.ts';
import {
  chromeGlyphs,
  cornerRadius,
  darkPalette,
  deriveAccentPalette,
  durations,
  easings,
  escapeHtml,
  glyph,
  lightPalette,
  setAccentColor,
  ElementSoundPlayer,
  enterAccessKeyMode,
  Symbol as SymbolMap,
  typeRamp,
  setAcrylic,
  acrylicLayers,
  hasWallpaper,
  type ChromeGlyph,
} from '../../../index.ts';

const choice = (name: string, options: [string, string][], current: string) =>
  html`<win-radio-group header="${name}" data-choice>${options
    .map(([v, label]) => `<win-radio-button value="${v}" ${v === current ? 'checked' : ''}>${label}</win-radio-button>`)
    .join('')}</win-radio-group>`;

function wireChoice(root: HTMLElement | null, onPick: (value: string) => void): void {
  if (!root) return;
  for (const group of root.querySelectorAll<HTMLElement>('[data-choice]')) {
    group.addEventListener('selectionchanged', (e) => {
      const v = (e as CustomEvent<{ value?: string }>).detail?.value;
      if (v) onPick(v);
    });
  }
}

const RAMP_LABELS: Record<string, string> = {
  caption: 'Caption',
  body: 'Body',
  bodyStrong: 'Body Strong',
  bodyLarge: 'Body Large',
  bodyLargeStrong: 'Body Large Strong',
  subtitle: 'Subtitle',
  title: 'Title',
  titleLarge: 'Title Large',
  display: 'Display',
};

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

const COLOR_GROUPS: { title: string; desc: string; match: RegExp }[] = [
  {
    title: '文本',
    desc: 'TextFillColor* / AccentTextFillColor* / TextOnAccentFillColor*',
    match: /^--w-(text-fill|accent-text-fill|text-on-accent-fill)-color/,
  },
  {
    title: '填充',
    desc: 'ControlFillColor* / ControlSolidFill / ControlStrongFill / ControlAltFill / ControlInvertFill / ControlOnImageFill',
    match: /^--w-control-(fill|solid-fill|strong-fill|alt-fill|invert-fill|on-image-fill)-color/,
  },
  { title: 'Subtle 填充', desc: 'SubtleFillColor*：用于透明背景控件的悬停/按下', match: /^--w-subtle-fill-color/ },
  { title: '强调色填充', desc: 'AccentFillColor*（随强调色变化）', match: /^--w-accent-fill-color/ },
  {
    title: '描边',
    desc: 'ControlStrokeColor* / ControlStrongStroke / CardStroke / SurfaceStroke / DividerStroke / FocusStroke',
    match: /^--w-(control-stroke|control-strong-stroke|card-stroke|surface-stroke|divider-stroke|focus-stroke)-color/,
  },
  {
    title: '背景与图层',
    desc: 'CardBackground / Layer / LayerOnMicaBaseAlt / SolidBackground / Smoke',
    match:
      /^--w-(card-background|layer|layer-on-mica-base-alt|layer-on-acrylic|layer-on-accent-acrylic|solid-background|smoke)-fill-color/,
  },
  {
    title: '信号色',
    desc: 'SystemFillColor*：Success / Caution / Critical / Attention / Neutral 及其背景色',
    match: /^--w-system-fill-color/,
  },
];

function swatchGrid(match: RegExp): string {
  const keys = Object.keys(lightPalette).filter((k) => match.test(k) && !k.endsWith('-gradient'));
  return `<div class="swatch-grid">${keys
    .map((k) => {
      const l = lightPalette[k] ?? '';
      const d = darkPalette[k] ?? '';
      const short = (v: string) =>
        v.startsWith('var(') ? v.replace(/^var\(--w-([\w-]+),.*$/, '$1') : v.startsWith('color-mix') ? 'accent mix' : v;
      return `<div class="sw" title="${escapeHtml(k)}">
        <span class="chip"><span style="background:var(${k})"></span></span>
        <span class="sw-text"><code>${escapeHtml(k.replace('--w-', ''))}</code><span class="sw-val">L ${escapeHtml(short(l))} · D ${escapeHtml(short(d))}</span></span>
      </div>`;
    })
    .join('')}</div>`;
}

const DESIGN_CSS = `
.swatch-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(300px,1fr));gap:8px;width:100%}
.sw{display:flex;gap:10px;align-items:center;min-width:0}
.sw .chip{width:40px;height:40px;flex:none;border-radius:6px;border:1px solid var(--w-card-stroke-color-default);background:repeating-conic-gradient(rgba(128,128,128,.25) 0 25%, transparent 0 50%) 0 0/12px 12px;overflow:hidden;display:block}
.sw .chip>span{display:block;width:100%;height:100%}
.sw-text{display:flex;flex-direction:column;min-width:0}
.sw-text code{font:12px/16px var(--w-font-family-mono);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.sw-val{font:var(--w-type-caption);color:var(--w-text-fill-color-secondary);white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ramp-row{display:grid;grid-template-columns:minmax(0,1fr) 220px;gap:16px;align-items:baseline;padding:10px 0;border-bottom:1px solid var(--w-divider-stroke-color-default);width:100%}
.ramp-row:last-child{border-bottom:0}
.ramp-spec{font:var(--w-type-caption);color:var(--w-text-fill-color-secondary)}
.glyph-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(96px,1fr));gap:6px;width:100%;max-height:520px;overflow:auto;scrollbar-width:thin}
.gcell{display:flex;flex-direction:column;align-items:center;gap:6px;padding:12px 4px 8px;border-radius:6px;cursor:default;outline:none;transition:background-color 83ms linear}
.gcell:hover{background:var(--w-subtle-fill-color-secondary)}
.gcell:active{background:var(--w-subtle-fill-color-tertiary)}
.gcell:focus-visible{box-shadow:inset 0 0 0 2px var(--w-focus-stroke-color-outer)}
.gcell .g{font-family:var(--w-font-family-icon);font-size:24px;line-height:24px;height:24px}
.gcell .n{font:var(--w-type-caption);color:var(--w-text-fill-color-secondary);text-align:center;word-break:break-all}
.acrylic-stage{position:relative;width:100%;height:280px;border-radius:8px;overflow:hidden;background:radial-gradient(circle at 16% 32%,#ffb900 0 64px,transparent 65px),radial-gradient(circle at 82% 72%,#0078d4 0 84px,transparent 85px),conic-gradient(from 30deg at 30% 40%,#ff5f6d,#ffc371,#47e5bc,#4facfe,#a18cd1,#ff5f6d)}
.acrylic-stage .stage-text{position:absolute;left:28px;top:12px;font:600 44px/56px var(--w-font-family-display);color:#111}
.acrylic-panels{position:absolute;inset:72px 24px 24px;display:grid;grid-template-columns:repeat(auto-fit,minmax(140px,1fr));gap:16px}
.ap{display:flex;flex-direction:column;justify-content:flex-end;gap:2px;padding:12px;border-radius:8px;border:1px solid var(--w-surface-stroke-color-flyout);box-shadow:var(--w-elevation-flyout);font:var(--w-type-caption);color:var(--w-text-fill-color-primary)}
.ap b{font:var(--w-type-body-strong)}
.ap code{font:11px/14px var(--w-font-family-mono);color:var(--w-text-fill-color-secondary);word-break:break-all}
.ap[material="acrylic-inverse"],.ap[material="acrylic-inverse"] code{color:var(--w-text-fill-color-inverse)}
.ap[material="acrylic-inverse"] code{opacity:.72}
.mica-demo{display:grid;grid-template-columns:repeat(auto-fit,minmax(200px,1fr));gap:16px;width:100%}
.mica-demo>win-box{display:block;height:160px;border-radius:8px;border:1px solid var(--w-card-stroke-color-default);color:var(--w-text-fill-color-primary)}
.mica-in{display:flex;flex-direction:column;gap:4px;padding:12px;height:100%;box-sizing:border-box}
.mica-in b{font:var(--w-type-body-strong)}
.mica-in span{font:var(--w-type-caption);color:var(--w-text-fill-color-secondary)}
.mica-card{margin-top:auto;padding:10px 12px;border-radius:6px;font:var(--w-type-caption)}
.elev{display:grid;grid-template-columns:repeat(auto-fill,minmax(150px,1fr));gap:24px;width:100%;padding:8px}
.elev>div{height:96px;border-radius:8px;background:var(--w-solid-background-fill-color-quarternary);display:grid;place-items:center;text-align:center;font:var(--w-type-caption)}
.radius-demo{display:flex;gap:16px;flex-wrap:wrap}
.radius-demo>div{width:120px;height:72px;display:grid;place-items:center;border:1px solid var(--w-card-stroke-color-default);background:var(--w-card-background-fill-color-default);font:var(--w-type-caption)}
.theme-split{display:grid;grid-template-columns:1fr 1fr;gap:0;width:100%;border-radius:8px;overflow:hidden;border:1px solid var(--w-card-stroke-color-default)}
.theme-split>div{padding:20px;display:flex;flex-direction:column;gap:12px;background:var(--w-solid-background-fill-color-base)}
.accent-row{display:flex;gap:6px;flex-wrap:wrap}
.accent-row span{width:56px;height:40px;border-radius:4px;display:grid;place-items:center;font:10px/12px var(--w-font-family-mono);color:#fff;text-shadow:0 0 2px rgba(0,0,0,.6)}
.motion-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:12px;width:100%}
.motion-grid .m{border:1px solid var(--w-card-stroke-color-default);border-radius:8px;padding:12px;background:var(--w-card-background-fill-color-secondary)}
.motion-grid code{font:12px/16px var(--w-font-family-mono)}
`;

if (!document.getElementById('gallery-design-css')) {
  const st = document.createElement('style');
  st.id = 'gallery-design-css';
  st.textContent = DESIGN_CSS;
  document.head.append(st);
}

const pages: GalleryPage[] = [
  {
    id: 'typography',
    title: 'Typography',
    category: 'styles',
    icon: '',
    description:
      'Windows 11 字型阶梯：Segoe UI Variable 的光学尺寸实例（≤12px 用 Small，正文用 Text，20px 以上用 Display）。行高采用 XAML 自然行高（14px → 19px），与 WinUI TextBlock 渲染一致。每种样式都可通过 CSS 变量 --w-type-* 或类名 w-* 使用。',
    samples: [
      {
        title: '字型阶梯（Type ramp）',
        html: `<div data-stretch>${Object.entries(typeRamp)
          .map(
            ([k, r]) =>
              `<div class="ramp-row"><div class="w-${kebab(k)}">${RAMP_LABELS[k]} · 敏捷的狐狸</div><div class="ramp-spec">${r.size}/${r.lineHeight}px · ${r.weight === 600 ? 'SemiBold' : 'Regular'} · Segoe UI Variable ${r.family === 'small' ? 'Small' : r.family === 'text' ? 'Text' : 'Display'}<br><code>.w-${kebab(k)}</code> · <code>var(--w-type-${kebab(k)})</code></div></div>`,
          )
          .join('')}</div>`,
        code: '<span class="w-title">Title</span>\n<p style="font: var(--w-type-body)">Body text</p>',
      },
    ],
  },
  {
    id: 'color',
    title: 'Color',
    category: 'styles',
    icon: '',
    description:
      'WinUI 主题资源调色板，全部取自 generic.xaml。变量名 = --w- + 资源名的 kebab 形式（去掉 Brush 后缀），在 Light/Dark/HighContrast 下自动切换；强调色相关的值保持为 var() 引用，可在运行时整体换色。',
    samples: COLOR_GROUPS.map((g) => ({
      title: g.title,
      description: g.desc,
      html: `<div data-stretch>${swatchGrid(g.match)}</div>`,
      code: `<div style="background: var(--w-card-background-fill-color-default); color: var(--w-text-fill-color-primary)">…</div>`,
    })),
  },
  {
    id: 'theme',
    title: 'Theme & accent color',
    category: 'styles',
    icon: '',
    description:
      '与 XAML 的 RequestedTheme 一样，任意元素都可以通过 data-win-theme="light|dark" 指定自己的主题，子树内的所有控件随之切换；setAccentColor() 会按 Windows 的色阶规则派生 Light1–3 / Dark1–3，并可只作用于某个子树。',
    samples: [
      {
        title: '按元素设置主题（RequestedTheme）',
        html: html`<div class="theme-split" data-stretch>
  <div data-win-theme="light">
    <div class="w-body-strong">Light</div>
    <div class="row"><win-button>Button</win-button><win-button appearance="accent">Accent</win-button></div>
    <win-check-box checked>CheckBox</win-check-box>
  </div>
  <div data-win-theme="dark">
    <div class="w-body-strong">Dark</div>
    <div class="row"><win-button>Button</win-button><win-button appearance="accent">Accent</win-button></div>
    <win-check-box checked>CheckBox</win-check-box>
  </div>
</div>`,
      },
      {
        title: '子树强调色（setAccentColor）',
        html: html`<div class="col" data-accent-host>
  <div class="accent-row" data-ramp></div>
  <div class="row">
    <win-button appearance="accent">Accent button</win-button>
    <win-toggle-button checked>Toggle</win-toggle-button>
    <win-hyperlink-button>Hyperlink</win-hyperlink-button>
  </div>
</div>`,
        options: html`<div class="col" style="gap:8px">
  <label class="w-caption">基础色</label>
  <input type="color" value="#0078d4" data-pick style="width:100%;height:32px;border:0;background:none">
  <win-button data-reset>恢复默认</win-button>
</div>`,
        setup(ex, opt) {
          const host = ex.querySelector<HTMLElement>('[data-accent-host]')!;
          const ramp = ex.querySelector<HTMLElement>('[data-ramp]')!;
          const paint = (base: string) => {
            const p = deriveAccentPalette(base);
            ramp.innerHTML = [
              'SystemAccentColorDark3',
              'SystemAccentColorDark2',
              'SystemAccentColorDark1',
              'SystemAccentColor',
              'SystemAccentColorLight1',
              'SystemAccentColorLight2',
              'SystemAccentColorLight3',
            ]
              .map((k) => `<span style="background:${p[k]}" title="${k}">${(p[k] ?? '').slice(1)}</span>`)
              .join('');
          };
          paint('#0078D4');
          const pick = opt?.querySelector<HTMLInputElement>('[data-pick]');
          pick?.addEventListener('input', () => {
            setAccentColor(pick.value, host);
            paint(pick.value);
          });
          opt?.querySelector('[data-reset]')?.addEventListener('click', () => {
            setAccentColor(null, host);
            if (pick) pick.value = '#0078d4';
            paint('#0078D4');
          });
        },
        js: `import { setAccentColor } from 'winui';\nsetAccentColor('#8764B8', document.querySelector('#panel'));`,
      },
    ],
  },
  {
    id: 'icons',
    title: 'Iconography',
    category: 'styles',
    icon: '',
    description:
      'Symbol 枚举对应 Segoe Fluent Icons 字形（Windows 11 自带字体）；控件外壳使用的 V 形箭头、勾选、关闭等字形则以 SVG 绘制并对照字体逐一校准，可在任何平台一致显示并支持描边动画。任何控件的 icon 属性都接受 Symbol 名、码点（E80F）、svg:路径 或图片地址。',
    samples: [
      {
        title: 'Symbol 枚举（SymbolIcon）',
        html: html`<div class="col" data-stretch>
  <input data-filter placeholder="筛选图标名称…" style="height:32px;padding:5px 11px 6px;border-radius:4px;border:1px solid;border-color:var(--w-text-control-elevation-border);background:var(--w-control-fill-color-default);color:inherit;font:inherit;max-width:320px;outline:none">
  <div class="glyph-grid" data-grid></div>
  <div class="output" data-output></div>
</div>`,
        setup(ex) {
          const grid = ex.querySelector<HTMLElement>('[data-grid]')!;
          const out = ex.querySelector<HTMLElement>('[data-output]')!;
          const entries = Object.entries(SymbolMap);
          const paint = (q: string) => {
            const n = q.trim().toLowerCase();
            grid.innerHTML = entries
              .filter(([k]) => !n || k.toLowerCase().includes(n))
              .map(
                ([k, cp]) =>
                  `<div class="gcell" tabindex="0" data-name="${k}" data-cp="${cp.toString(16).toUpperCase()}"><span class="g">${String.fromCodePoint(cp)}</span><span class="n">${k}</span></div>`,
              )
              .join('');
          };
          paint('');
          ex.querySelector<HTMLInputElement>('[data-filter]')!.addEventListener('input', (e) =>
            paint((e.target as HTMLInputElement).value),
          );
          grid.addEventListener('click', (e) => {
            const c = (e.target as Element).closest<HTMLElement>('.gcell');
            if (!c) return;
            const snippet = `<win-symbol-icon symbol="${c.dataset.name}"></win-symbol-icon>`;
            void navigator.clipboard?.writeText(snippet);
            out.textContent = `已复制：${snippet}（码点 U+${c.dataset.cp}）`;
          });
        },
        code: '<win-symbol-icon symbol="Home"></win-symbol-icon>\n<win-font-icon glyph="E80F"></win-font-icon>\n<win-button icon="Save">保存</win-button>',
      },
      {
        title: '控件外壳字形（SVG，可动画）',
        html: `<div class="glyph-grid" data-stretch style="max-height:none">${(
          Object.keys(chromeGlyphs) as ChromeGlyph[]
        )
          .map(
            (k) =>
              `<div class="gcell"><span style="height:24px;display:inline-flex">${glyph(k, 24)}</span><span class="n">${k}</span></div>`,
          )
          .join('')}</div>`,
        code: "import { glyph } from 'winui';\nel.innerHTML = glyph('chevronDown', 12);",
      },
    ],
  },
  {
    id: 'acrylic',
    title: 'Acrylic & Mica',
    category: 'styles',
    icon: '',
    tags: ['material', 'pane-material', 'setAcrylic()', 'setWallpaper()', 'setSystemBackdrop()'],
    description:
      'Mica、Mica Alt 与桌面亚克力是窗口级系统背景（SystemBackdrop），从桌面壁纸取色；应用内亚克力（AcrylicBrush）实时模糊其后方的应用内容。配方与参数取自 WinUI：高斯模糊（亚克力 30、Mica 80）→ 亮度混合 → 颜色混合 →（亚克力）2% 噪点。任何组件都可以通过 material 属性使用这些材质。',
    samples: [
      {
        title: '应用内亚克力（AcrylicBrush）',
        description: '下列预设对应 WinUI 的主题画刷，会随浅色/深色主题与强调色变化。可用右上角按钮切换本示例的主题。',
        html: html`<div class="acrylic-stage" data-stretch>
  <div class="stage-text">Fluent Acrylic</div>
  <div class="acrylic-panels">
    <win-box class="ap" material="acrylic"><b>acrylic</b><code>AcrylicInAppFillColorDefaultBrush</code></win-box>
    <win-box class="ap" material="acrylic-base"><b>acrylic-base</b><code>AcrylicInAppFillColorBaseBrush</code></win-box>
    <win-box class="ap" material="accent-acrylic"><b>accent-acrylic</b><code>AccentAcrylicInAppFillColorDefaultBrush</code></win-box>
    <win-box class="ap" material="accent-acrylic-base"><b>accent-acrylic-base</b><code>AccentAcrylicInAppFillColorBaseBrush</code></win-box>
    <win-box class="ap" material="acrylic-inverse"><b>acrylic-inverse</b><code>AcrylicInAppFillColorDefaultInverseBrush</code></win-box>
  </div>
</div>`,
      },
      {
        title: '自定义 AcrylicBrush',
        description:
          'setAcrylic(element, { tintColor, tintOpacity, tintLuminosityOpacity, fallbackColor }) 与 AcrylicBrush 的属性一一对应；不指定 TintLuminosityOpacity 时按 WinUI 的规则由 TintColor 与 TintOpacity 推算。',
        html: html`<div class="acrylic-stage" data-stretch>
  <div class="stage-text">TintColor</div>
  <div class="acrylic-panels" style="grid-template-columns:1fr;inset:48px 64px">
    <win-box class="ap" data-custom><b>custom-acrylic</b><code data-desc></code></win-box>
  </div>
</div>`,
        options: html`${choice(
          'TintColor',
          [
            ['#CA1825', '红'],
            ['#0078D4', '蓝'],
            ['#107C10', '绿'],
            ['#FFFFFF', '白'],
            ['#000000', '黑'],
          ],
          '#CA1825',
        )}
<win-slider data-opt="tint" header="TintOpacity" min="0" max="1" step="0.05" value="0.6"></win-slider>
<win-check-box data-opt="auto" checked>自动推算亮度</win-check-box>
<win-slider data-opt="lum" header="TintLuminosityOpacity" min="0" max="1" step="0.05" value="0.8"></win-slider>`,
        setup(ex, opt) {
          const box = ex.querySelector<HTMLElement>('[data-custom]')!;
          const desc = ex.querySelector<HTMLElement>('[data-desc]')!;
          const tint = opt!.querySelector<HTMLElement & { value: number }>('[data-opt="tint"]')!;
          const lum = opt!.querySelector<HTMLElement & { value: number; disabled: boolean }>('[data-opt="lum"]')!;
          const auto = opt!.querySelector<HTMLElement & { checked: boolean }>('[data-opt="auto"]')!;
          let color = '#CA1825';
          const apply = () => {
            lum.disabled = auto.checked;
            const o = {
              tintColor: color,
              tintOpacity: Number(tint.value),
              tintLuminosityOpacity: auto.checked ? null : Number(lum.value),
              fallbackColor: color,
            };
            setAcrylic(box, o);
            const l = acrylicLayers(o);
            desc.textContent = `Tint ${l.tint} · Luminosity ${l.luminosity}`;
          };
          wireChoice(opt, (v) => {
            color = v;
            apply();
          });
          tint.addEventListener('input', apply);
          lum.addEventListener('input', apply);
          auto.addEventListener('change', apply);
          void customElements.whenDefined('win-box').then(() => requestAnimationFrame(apply));
          return () => setAcrylic(box, null);
        },
      },
      {
        title: 'Mica 与 Mica Alt',
        description:
          '从桌面壁纸取色：壁纸按屏幕坐标对齐，模糊 80 后只保留色相与饱和度，亮度由 TintColor 决定。拖动浏览器窗口，颜色会随窗口在屏幕上的位置变化；窗口失活时以 250ms 回退为纯色。开发服务器会提供当前的 Windows 壁纸，也可以在“设置”中选择图片。',
        html: html`<div class="mica-demo" data-stretch>
  <win-box material="mica"><div class="mica-in"><b>mica</b><span>MicaKind.Base · 窗口背景</span><div class="w-card mica-card">CardBackgroundFillColorDefault</div></div></win-box>
  <win-box material="mica-alt"><div class="mica-in"><b>mica-alt</b><span>MicaKind.BaseAlt · 标签页式标题栏</span><div class="mica-card" style="background:var(--w-layer-on-mica-base-alt-fill-color-default)">LayerOnMicaBaseAltFillColorDefault</div></div></win-box>
</div>
<div class="output" data-output></div>`,
        setup(ex) {
          const o = ex.querySelector<HTMLElement>('[data-output]')!;
          const sync = () =>
            (o.textContent = hasWallpaper()
              ? '正在使用壁纸取色。'
              : '未设置壁纸：显示 FallbackColor（与 WinUI 在无法取色时一致）。');
          sync();
          const t = setInterval(sync, 1000);
          return () => clearInterval(t);
        },
      },
      {
        title: '桌面亚克力（DesktopAcrylicBackdrop）',
        description:
          'DesktopAcrylicController 的三种 Kind。网页中能看到的“桌面”只有壁纸，因此它们以壁纸为背景，模糊 30 并带 2% 噪点。',
        html: html`<div class="mica-demo" data-stretch>
  <win-box material="desktop-acrylic"><div class="mica-in"><b>desktop-acrylic</b><span>DesktopAcrylicKind.Default</span></div></win-box>
  <win-box material="desktop-acrylic-base"><div class="mica-in"><b>desktop-acrylic-base</b><span>DesktopAcrylicKind.Base</span></div></win-box>
  <win-box material="desktop-acrylic-thin"><div class="mica-in"><b>desktop-acrylic-thin</b><span>DesktopAcrylicKind.Thin</span></div></win-box>
</div>`,
      },
      {
        title: '在控件上使用材质',
        description:
          '所有组件都支持 material 属性。浮出控件、菜单、工具提示、TeachingTip、ContentDialog、通知与命令栏映射到各自的主表面（相当于 FlyoutBase.SystemBackdrop / Background）；NavigationView 与 SplitView 另有 pane-material。',
        html: html`<div class="row">
  <win-button data-open>打开浮出控件
    <win-flyout slot="flyout" data-f><div style="width:240px">此浮出控件的 material 为 <b data-k>acrylic</b>。</div></win-flyout>
  </win-button>
  <win-button data-menu>打开菜单
    <win-menu-flyout slot="flyout" data-m>
      <win-menu-flyout-item text="剪切" icon="Cut"></win-menu-flyout-item>
      <win-menu-flyout-item text="复制" icon="Copy"></win-menu-flyout-item>
      <win-menu-flyout-item text="粘贴" icon="Paste"></win-menu-flyout-item>
    </win-menu-flyout>
  </win-button>
</div>`,
        options: choice(
          'material',
          [
            ['acrylic', 'acrylic'],
            ['accent-acrylic', 'accent-acrylic'],
            ['acrylic-base', 'acrylic-base'],
            ['mica', 'mica'],
            ['solid', 'solid'],
          ],
          'acrylic',
        ),
        setup(ex, opt) {
          const f = ex.querySelector<HTMLElement>('[data-f]')!;
          const m = ex.querySelector<HTMLElement>('[data-m]')!;
          const k = ex.querySelector<HTMLElement>('[data-k]')!;
          wireChoice(opt, (v) => {
            f.setAttribute('material', v);
            m.setAttribute('material', v);
            k.textContent = v;
          });
        },
      },
    ],
  },
  {
    id: 'geometry',
    title: 'Geometry & elevation',
    category: 'styles',
    icon: '',
    description:
      'WinUI 圆角规范：控件 4px（ControlCornerRadius），浮层与窗口 8px（OverlayCornerRadius）。阴影层级对应 ThemeShadow 的 Z 深度：卡片 2、工具提示 16、浮出控件 32、对话框 128、窗口 128。',
    samples: [
      {
        title: '圆角',
        html: html`<div class="radius-demo">
  <div style="border-radius:0">0px · 直角</div>
  <div style="border-radius:${cornerRadius.control}px">${cornerRadius.control}px · 控件</div>
  <div style="border-radius:${cornerRadius.overlay}px">${cornerRadius.overlay}px · 浮层</div>
  <div style="border-radius:36px">胶囊 · 圆形控件</div>
</div>`,
      },
      {
        title: '阴影层级（Elevation）',
        html: html`<div class="elev" data-stretch>
  <div style="box-shadow:var(--w-elevation-card)">Card<br>--w-elevation-card</div>
  <div style="box-shadow:var(--w-elevation-tooltip)">ToolTip<br>--w-elevation-tooltip</div>
  <div style="box-shadow:var(--w-elevation-flyout)">Flyout<br>--w-elevation-flyout</div>
  <div style="box-shadow:var(--w-elevation-dialog)">Dialog<br>--w-elevation-dialog</div>
  <div style="box-shadow:var(--w-elevation-window)">Window<br>--w-elevation-window</div>
</div>`,
      },
      {
        title: '动效令牌（Motion tokens）',
        html: `<div class="motion-grid" data-stretch>${Object.entries(durations)
          .map(([k, v]) => `<div class="m"><div class="w-body-strong">${v}ms</div><code>--w-duration-${k}</code></div>`)
          .join('')}${Object.entries(easings)
          .map(([k, v]) => `<div class="m"><div class="w-body-strong">${k}</div><code>${v}</code></div>`)
          .join('')}</div>`,
      },
    ],
  },
  {
    id: 'access-keys',
    title: 'AccessKey (KeyTips)',
    category: 'system',
    icon: '',
    badge: 'new',
    description:
      '与 XAML 的 UIElement.AccessKey 一致：按下并松开 Alt 键，所有带 access-key 属性的可见元素上会出现按键提示（KeyTip）；继续输入对应字母即可触发（文本框获得焦点，其它元素被点击）。若触发后打开了包含访问键的浮出控件，或元素带 access-key-scope，则在该作用域内继续。Alt+字母可直接触发，Esc 退出。',
    samples: [
      {
        title: '按 Alt 显示访问键',
        html: html`<div class="col">
  <div class="row">
    <win-button access-key="S" icon="Save">保存</win-button>
    <win-button access-key="O" icon="OpenFile">打开</win-button>
    <win-drop-down-button access-key="E">编辑
      <win-menu-flyout slot="flyout">
        <win-menu-flyout-item access-key="X" icon="Cut">剪切</win-menu-flyout-item>
        <win-menu-flyout-item access-key="C" icon="Copy">复制</win-menu-flyout-item>
        <win-menu-flyout-item access-key="V" icon="Paste">粘贴</win-menu-flyout-item>
      </win-menu-flyout>
    </win-drop-down-button>
    <win-toggle-button access-key="B">粗体</win-toggle-button>
    <win-hyperlink-button access-key="H" key-tip-placement="top">帮助</win-hyperlink-button>
  </div>
  <div class="output" data-output>按 Alt，然后按 S / O / E / B / H；在“编辑”菜单中继续按 X / C / V。</div>
</div>`,
        options: html`<win-button data-show>显示 KeyTip</win-button>`,
        setup(ex, opt) {
          const out = ex.querySelector('[data-output]')!;
          ex.addEventListener('accesskeyinvoked', (e) => {
            out.textContent = `已通过访问键触发：${(e.target as HTMLElement).textContent?.trim() ?? ''}`;
          });
          opt?.querySelector('[data-show]')?.addEventListener('click', (e) => {
            e.stopPropagation();
            setTimeout(() => enterAccessKeyMode(), 0);
          });
        },
      },
    ],
  },
  {
    id: 'sound',
    title: 'Sound',
    category: 'system',
    icon: '',
    description:
      'ElementSoundPlayer 为控件交互提供声音反馈（Invoke、Focus、Show、Hide、MoveNext、MovePrevious、GoBack）。与桌面 Windows 一致默认关闭；开启后，点击控件、键盘移动焦点、打开/关闭浮出控件都会播放用 WebAudio 合成的短促音效，无需任何音频资源。',
    samples: [
      {
        title: '开启元素音效',
        html: html`<div class="col">
  <div class="row">
    <win-toggle-button data-sound>声音：关</win-toggle-button>
    <win-button>Invoke</win-button>
    <win-drop-down-button>Show / Hide
      <win-menu-flyout slot="flyout">
        <win-menu-flyout-item>项目 1</win-menu-flyout-item>
        <win-menu-flyout-item>项目 2</win-menu-flyout-item>
      </win-menu-flyout>
    </win-drop-down-button>
  </div>
  <div class="row" data-kinds></div>
</div>`,
        setup(ex) {
          const t = ex.querySelector<HTMLElement & { checked: boolean }>('[data-sound]')!;
          const sync = () => (t.textContent = t.checked ? '声音：开' : '声音：关');
          t.checked = ElementSoundPlayer.state === 'on';
          sync();
          t.addEventListener('change', () => {
            ElementSoundPlayer.state = t.checked ? 'on' : 'off';
            sync();
          });
          const row = ex.querySelector('[data-kinds]')!;
          for (const k of ['focus', 'invoke', 'show', 'hide', 'move-next', 'move-previous', 'go-back'] as const) {
            const b = document.createElement('win-button');
            b.setAttribute('appearance', 'subtle');
            b.textContent = k;
            b.addEventListener('click', (e) => {
              e.stopPropagation();
              const prev = ElementSoundPlayer.state;
              ElementSoundPlayer.state = 'on';
              ElementSoundPlayer.play(k);
              ElementSoundPlayer.state = prev;
            });
            row.append(b);
          }
        },
        js: "import { ElementSoundPlayer } from 'winui';\nElementSoundPlayer.state = 'on';\nElementSoundPlayer.volume = 0.6;",
      },
    ],
  },
];

export default pages;
