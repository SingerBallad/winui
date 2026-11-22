import {
  installTheme,
  setTheme,
  getTheme,
  getEffectiveTheme,
  setAccentColor,
  setMotion,
  ElementSoundPlayer,
  escapeHtml,
  glyph,
  navigateIn,
  staggerIn,
  setSystemBackdrop,
  setWallpaper,
  configureMaterials,
  getMaterialSettings,
  setIconFont,
  getIconFont,
  isSegoeIconFontInstalled,
  type IconFontMode,
  type MaterialKind,
} from '../../index.ts';
import { allPages, CATEGORIES } from './pages/registry.ts';
import { dedent, type GalleryCategory, type GalleryPage, type GallerySample } from './pages/types.ts';
import { installGalleryContextMenu } from './context-menu.ts';

installTheme();

const store = {
  get(k: string): string | null {
    try {
      return localStorage.getItem(`winui-gallery-${k}`);
    } catch {
      return null;
    }
  },
  set(k: string, v: string | null): void {
    try {
      if (v === null) localStorage.removeItem(`winui-gallery-${k}`);
      else localStorage.setItem(`winui-gallery-${k}`, v);
    } catch {}
  },
};

const params = new URLSearchParams(location.search);
const initialTheme = (params.get('theme') ?? store.get('theme') ?? 'system') as 'light' | 'dark' | 'system';
setTheme(initialTheme);
const accent = params.get('accent') ?? store.get('accent');
if (accent) setAccentColor(accent);
if ((params.get('motion') ?? store.get('motion')) === 'reduced') setMotion('reduced');
if (store.get('sound') === 'on') ElementSoundPlayer.state = 'on';

const BACKDROPS: [string, string][] = [
  ['mica', 'Mica'],
  ['mica-alt', 'Mica Alt'],
  ['desktop-acrylic', '桌面亚克力'],
  ['desktop-acrylic-thin', '桌面亚克力（Thin）'],
  ['solid', '纯色'],
];
const backdrop = params.get('backdrop') ?? store.get('backdrop') ?? 'mica';
setSystemBackdrop(backdrop as MaterialKind);
if (store.get('transparency') === 'off') configureMaterials({ transparency: 'off' });
if ((params.get('icons') ?? store.get('icons')) === 'fluent') void setIconFont('fluent');

let wallpaperVersion = '';
let customWallpaper: Blob | null = null;
async function syncWallpaper(): Promise<void> {
  const mode = store.get('wallpaper') ?? 'system';
  if (mode === 'none') {
    wallpaperVersion = 'none';
    await setWallpaper(null);
    return;
  }
  if (customWallpaper) return;
  try {
    const res = await fetch('/@winui/wallpaper.json', { cache: 'no-store' });
    if (!res.ok) return;
    const info = (await res.json()) as { url: string; fit: 'fill'; color: string };
    if (info.url === wallpaperVersion) return;
    wallpaperVersion = info.url;
    await setWallpaper(info.url, { fit: info.fit, color: info.color });
  } catch {}
}
void syncWallpaper();
addEventListener('focus', () => void syncWallpaper());

const hlStyle = document.createElement('style');
hlStyle.textContent = `
:root { --hl-punc:#0000ff; --hl-tag:#a31515; --hl-attr:#e50000; --hl-str:#0000ff; --hl-com:#008000; --hl-kw:#0000ff; --hl-num:#098658; }
[data-win-theme="dark"] { --hl-punc:#808080; --hl-tag:#569cd6; --hl-attr:#9cdcfe; --hl-str:#ce9178; --hl-com:#6a9955; --hl-kw:#569cd6; --hl-num:#b5cea8; }
@media (prefers-color-scheme: dark) { :root:not([data-win-theme="light"]) { --hl-punc:#808080; --hl-tag:#569cd6; --hl-attr:#9cdcfe; --hl-str:#ce9178; --hl-com:#6a9955; --hl-kw:#569cd6; --hl-num:#b5cea8; } }
.hl-punc{color:var(--hl-punc)} .hl-tag{color:var(--hl-tag)} .hl-attr{color:var(--hl-attr)} .hl-str{color:var(--hl-str)} .hl-com{color:var(--hl-com)} .hl-kw{color:var(--hl-kw)} .hl-num{color:var(--hl-num)}
`;
document.head.append(hlStyle);

type NavView = HTMLElement & { selectedTag: string; togglePane(): void };
type TitleBar = HTMLElement & { isBackButtonEnabled: boolean };

const nav = document.getElementById('nav') as NavView;
const titleBar = document.getElementById('titlebar') as TitleBar;
const content = document.getElementById('content')!;
const search = document.getElementById('search') as HTMLElement & { items: unknown[] };
const themeToggle = document.getElementById('theme-toggle') as HTMLElement & { icon: string };

const themeGlyph = () => (getEffectiveTheme() === 'dark' ? '\uE706' : '\uE708');
const syncThemeToggle = () => {
  themeToggle.icon = themeGlyph();
};
syncThemeToggle();

themeToggle.addEventListener('click', () => {
  const next = getEffectiveTheme() === 'dark' ? 'light' : 'dark';
  setTheme(next, document.documentElement, { animate: true });
  store.set('theme', next);
  syncThemeToggle();
  if (route().kind === 'settings') render();
});
installGalleryContextMenu({
  theme: () => getTheme(),
  setTheme: (mode) => {
    setTheme(mode, document.documentElement, { animate: true });
    store.set('theme', mode);
    syncThemeToggle();
    if (route().kind === 'settings') render();
  },
  openSettings: () => {
    location.hash = '#/settings';
  },
});
titleBar.addEventListener('backrequested', () => history.back());
titleBar.addEventListener('panetogglerequested', () => nav.togglePane());

const pagesById = new Map(allPages.map((p) => [p.id, p]));
const catTitle = (id: GalleryCategory) => CATEGORIES.find((c) => c.id === id)?.title ?? id;

type Route =
  | { kind: 'home' }
  | { kind: 'all' }
  | { kind: 'category'; id: GalleryCategory }
  | { kind: 'page'; page: GalleryPage }
  | { kind: 'settings' }
  | { kind: 'search'; q: string }
  | { kind: 'missing'; id: string };

function route(): Route {
  const h = decodeURIComponent(location.hash.replace(/^#\/?/, ''));
  if (!h) return { kind: 'home' };
  if (h === 'all') return { kind: 'all' };
  if (h === 'settings') return { kind: 'settings' };
  if (h.startsWith('c/')) return { kind: 'category', id: h.slice(2) as GalleryCategory };
  if (h.startsWith('search/')) return { kind: 'search', q: h.slice(7) };
  const p = pagesById.get(h);
  return p ? { kind: 'page', page: p } : { kind: 'missing', id: h };
}

let depth = 0;
addEventListener('hashchange', () => {
  depth++;
  render();
});

function buildNav(): void {
  const parts: string[] = [
    '<win-navigation-view-item icon="Home" tag="home">主页</win-navigation-view-item>',
    '<win-navigation-view-item icon="AllApps" tag="all">全部控件</win-navigation-view-item>',
    '<win-navigation-view-item-separator></win-navigation-view-item-separator>',
  ];
  for (const c of CATEGORIES) {
    const list = allPages.filter((p) => p.category === c.id);
    if (!list.length) continue;
    const kids = list
      .map(
        (p) =>
          `<win-navigation-view-item tag="${escapeHtml(p.id)}"${p.badge === 'new' ? ' info-badge="dot"' : ''}>${escapeHtml(p.title)}</win-navigation-view-item>`,
      )
      .join('');
    parts.push(
      `<win-navigation-view-item icon="${c.icon}" tag="c/${c.id}">${escapeHtml(c.title)}${kids}</win-navigation-view-item>`,
    );
  }
  content.insertAdjacentHTML('beforebegin', parts.join(''));
  nav.addEventListener('selectionchanged', (ev) => {
    const d = (
      ev as CustomEvent<{ selectedItem: (HTMLElement & { tag?: string }) | null; isSettingsSelected: boolean }>
    ).detail;
    const tag = d.isSettingsSelected ? 'settings' : d.selectedItem?.tag;
    if (!tag) return;
    const hash = tag === 'home' ? '#/' : `#/${tag}`;
    const current = location.hash || '#/';
    if (current !== hash) location.hash = hash;
  });
}

function routeTag(r: Route): string {
  switch (r.kind) {
    case 'home':
      return 'home';
    case 'all':
      return 'all';
    case 'settings':
      return 'settings';
    case 'category':
      return `c/${r.id}`;
    case 'page':
      return r.page.id;
    default:
      return '';
  }
}

function syncNav(r: Route): void {
  const tag = routeTag(r);
  if (tag && nav.selectedTag !== tag) nav.selectedTag = tag;
  titleBar.isBackButtonEnabled = depth > 0;
}

const span = (cls: string, s: string) => `<span class="hl-${cls}">${escapeHtml(s)}</span>`;

export function highlightHtml(src: string): string {
  let out = '';
  let i = 0;
  while (i < src.length) {
    if (src.startsWith('<!--', i)) {
      const e = src.indexOf('-->', i);
      const end = e < 0 ? src.length : e + 3;
      out += span('com', src.slice(i, end));
      i = end;
      continue;
    }
    if (src[i] === '<') {
      const m = /^<(\/?)([\w-]+)/.exec(src.slice(i));
      if (m) {
        out += span('punc', `<${m[1]}`) + span('tag', m[2]!);
        i += m[0].length;
        while (i < src.length && src[i] !== '>') {
          const a = /^(\s+)([^\s=>/]+)(?:(=)("[^"]*"|'[^']*'|[^\s>]+))?/.exec(src.slice(i));
          if (a) {
            out += escapeHtml(a[1]!) + span('attr', a[2]!) + (a[3] ? span('punc', '=') + span('str', a[4]!) : '');
            i += a[0].length;
            continue;
          }
          out += span('punc', src[i]!);
          i++;
        }
        if (src[i] === '>') {
          out += span('punc', '>');
          i++;
        }
        continue;
      }
    }
    const n = src.indexOf('<', i + 1);
    const end = n < 0 ? src.length : n;
    out += escapeHtml(src.slice(i, end));
    i = end;
  }
  return out;
}

export function highlightJs(src: string): string {
  return src
    .split(/(\/\/[^\n]*|'(?:[^'\\]|\\.)*'|"(?:[^"\\]|\\.)*"|`(?:[^`\\]|\\.)*`|\b\d+(?:\.\d+)?\b|\b[A-Za-z_]\w*\b)/g)
    .map((tok) => {
      if (!tok) return '';
      if (tok.startsWith('//')) return span('com', tok);
      if (/^['"`]/.test(tok)) return span('str', tok);
      if (/^\d/.test(tok)) return span('num', tok);
      if (
        /^(const|let|var|function|return|if|else|for|of|in|new|import|from|export|await|async|true|false|null|undefined|this|class|extends)$/.test(
          tok,
        )
      ) {
        return span('kw', tok);
      }
      return escapeHtml(tok);
    })
    .join('');
}

const cleanups: (() => void)[] = [];
function teardown(): void {
  for (const c of cleanups.splice(0)) {
    try {
      c();
    } catch (e) {
      console.error(e);
    }
  }
}

function tile(p: GalleryPage): string {
  const badge = p.badge ? `<span class="badge ${p.badge}">${badgeText(p.badge)}</span>` : '';
  return `<a class="tile" href="#/${p.id}"><span class="t-icon">${p.icon ?? ''}</span><span><span class="t-title">${escapeHtml(p.title)}${badge}</span><span class="t-desc">${escapeHtml(p.summary ?? p.description)}</span></span></a>`;
}

function badgeText(b: NonNullable<GalleryPage['badge']>): string {
  return { new: '新', updated: '更新', preview: '预览' }[b];
}

function mountPage(htmlText: string, transition: Parameters<typeof navigateIn>[1] = 'entrance'): HTMLElement {
  teardown();
  content.innerHTML = `<div class="page">${htmlText}</div>`;
  nav.shadowRoot?.querySelector<HTMLElement>('main.content')?.scrollTo({ top: 0 });
  const page = content.firstElementChild as HTMLElement;
  navigateIn(page, transition);
  return page;
}

function renderSample(s: GallerySample, index: number, host: Element): HTMLElement {
  const sec = document.createElement('section');
  sec.className = 'sample';
  const code = dedent(s.code ?? s.html);
  sec.innerHTML = `
    <div class="sample-head"><h2 class="sample-title">${escapeHtml(s.title)}</h2><span class="sample-tools"></span></div>
    ${s.description ? `<p class="sample-desc">${escapeHtml(s.description)}</p>` : ''}
    <div class="card">
      <div class="example-row">
        <div class="example" style="${s.style ?? ''}">${s.html}</div>
        ${s.options ? `<div class="options"><div class="opt-title">选项</div>${s.options}</div>` : ''}
      </div>
      <details class="source">
        <summary><span class="w-icon" style="font-size:14px">&#xE943;</span>源代码<span class="chev">${glyph('chevronDown', 12)}</span></summary>
        <div class="code-wrap">
          <div class="code-lang">HTML</div>
          <pre><code>${highlightHtml(code)}</code></pre>
          ${s.js ? `<div class="code-lang">TypeScript</div><pre><code>${highlightJs(dedent(s.js))}</code></pre>` : ''}
          <win-button class="copy" appearance="subtle" icon="Copy" aria-label="复制代码"></win-button>
        </div>
      </details>
    </div>`;
  sec.querySelector('.copy')?.addEventListener('click', () => {
    void navigator.clipboard?.writeText(code + (s.js ? `\n\n<script type="module">\n${dedent(s.js)}\n</script>` : ''));
  });
  host.append(sec);
  const example = sec.querySelector<HTMLElement>('.example')!;
  const row = sec.querySelector<HTMLElement>('.example-row')!;
  const themeBtn = document.createElement('button');
  themeBtn.className = 'tb-btn example-theme';
  themeBtn.setAttribute('aria-label', '切换此示例的主题');
  themeBtn.title = '切换此示例的主题';
  themeBtn.innerHTML = '<span class="w-icon" style="font-size:14px">&#xE793;</span>';
  themeBtn.setAttribute('aria-pressed', 'false');
  themeBtn.addEventListener('click', () => {
    if (row.hasAttribute('data-win-theme')) row.removeAttribute('data-win-theme');
    else row.setAttribute('data-win-theme', getEffectiveTheme() === 'dark' ? 'light' : 'dark');
    themeBtn.setAttribute('aria-pressed', String(row.hasAttribute('data-win-theme')));
  });
  sec.querySelector('.sample-tools')!.append(themeBtn);
  const options = sec.querySelector<HTMLElement>('.options');
  if (s.setup) {
    try {
      const c = s.setup(example, options);
      if (typeof c === 'function') cleanups.push(c);
    } catch (e) {
      console.error(`sample ${index} setup failed`, e);
    }
  }
  return sec;
}

function renderHome(): void {
  const tags = new Set(allPages.flatMap((p) => p.tags ?? []));
  const featured = allPages.filter((p) => p.badge === 'new' || p.badge === 'updated').slice(0, 12);
  const picks = featured.length ? featured : allPages.slice(0, 9);
  const page = mountPage(`
    <section class="hero">
      <h1>WinUI 3 Gallery</h1>
      <p>以 Windows App SDK generic.xaml 为准、用 TypeScript Web Components 复刻的 WinUI 3 控件库。浅色/深色主题、强调色、Fluent 动效、键盘与无障碍支持一应俱全，并补齐了 WinUI 缺失的常用组件。</p>
      <div class="stats">
        <div class="stat"><b>${allPages.length}</b><span>控件页面</span></div>
        <div class="stat"><b>${tags.size}</b><span>自定义元素</span></div>
        <div class="stat"><b>${CATEGORIES.filter((c) => allPages.some((p) => p.category === c.id)).length}</b><span>类别</span></div>
      </div>
    </section>
    <h2 class="section-title">精选与最近更新</h2>
    <div class="tiles">${picks.map(tile).join('')}</div>
    <h2 class="section-title">浏览类别</h2>
    <div class="tiles">${CATEGORIES.filter((c) => allPages.some((p) => p.category === c.id))
      .map(
        (c) =>
          `<a class="tile" href="#/c/${c.id}"><span class="t-icon">${c.icon}</span><span><span class="t-title">${escapeHtml(c.title)}</span><span class="t-desc">${allPages
            .filter((p) => p.category === c.id)
            .map((p) => p.title)
            .join(' · ')}</span></span></a>`,
      )
      .join('')}</div>`);
  staggerIn(page.querySelectorAll('.tile'), { distance: 24, stagger: 18 });
}

function renderAll(): void {
  let h = '<div class="page-cat">全部控件</div><h1>全部控件</h1>';
  for (const c of CATEGORIES) {
    const list = allPages.filter((p) => p.category === c.id);
    if (!list.length) continue;
    h += `<h2 class="section-title">${escapeHtml(c.title)}</h2><div class="tiles">${list.map(tile).join('')}</div>`;
  }
  const page = mountPage(h);
  staggerIn(page.querySelectorAll('.tile'), { distance: 20, stagger: 10, max: 24 });
}

function renderCategory(id: GalleryCategory): void {
  const list = allPages.filter((p) => p.category === id);
  const page = mountPage(
    `<div class="page-cat">类别</div><h1>${escapeHtml(catTitle(id))}</h1><div class="tiles">${list.map(tile).join('')}</div>${list.length ? '' : '<p class="empty">此类别暂无页面。</p>'}`,
  );
  staggerIn(page.querySelectorAll('.tile'), { distance: 20, stagger: 18 });
}

function renderControl(p: GalleryPage): void {
  const badge = p.badge ? `<span class="badge ${p.badge}">${badgeText(p.badge)}</span>` : '';
  const docs = (p.docs ?? [])
    .map((d) => `<win-hyperlink-button href="${escapeHtml(d.href)}">${escapeHtml(d.label)}</win-hyperlink-button>`)
    .join('');
  const tags = (p.tags ?? []).map((t) => `<span class="tag">&lt;${escapeHtml(t)}&gt;</span>`).join('');
  const page = mountPage(`
    <div class="page-cat">${escapeHtml(catTitle(p.category))}</div>
    <h1>${escapeHtml(p.title)}${badge}</h1>
    <p class="lede">${escapeHtml(p.description)}</p>
    ${tags ? `<div class="tags">${tags}</div>` : ''}
    ${docs ? `<div class="doc-links">${docs}</div>` : ''}
    <div class="samples"></div>
    ${
      p.related?.length
        ? `<h2 class="section-title">相关控件</h2><div class="tiles">${p.related
            .map((id) => pagesById.get(id))
            .filter((x): x is GalleryPage => !!x)
            .map(tile)
            .join('')}</div>`
        : ''
    }`);
  const samples = page.querySelector('.samples')!;
  p.samples.forEach((s, i) => {
    renderSample(s, i, samples);
  });
}

function renderSearch(q: string): void {
  const needle = q.trim().toLowerCase();
  const hits = allPages.filter((p) =>
    [p.title, p.description, p.id, ...(p.tags ?? [])].some((s) => s.toLowerCase().includes(needle)),
  );
  const page = mountPage(
    `<div class="page-cat">搜索</div><h1>“${escapeHtml(q)}”的结果</h1>${hits.length ? `<div class="tiles">${hits.map(tile).join('')}</div>` : '<p class="empty">没有找到匹配的控件。</p>'}`,
  );
  staggerIn(page.querySelectorAll('.tile'), { distance: 16, stagger: 14 });
}

const ACCENTS = [
  '#0078D4',
  '#0063B1',
  '#8764B8',
  '#744DA9',
  '#B146C2',
  '#C239B3',
  '#E3008C',
  '#E81123',
  '#CA5010',
  '#FF8C00',
  '#498205',
  '#107C10',
  '#00B294',
  '#038387',
  '#2D7D9A',
  '#68768A',
];

function renderSettings(): void {
  const mode = getTheme();
  const cur = (store.get('accent') ?? '#0078D4').toUpperCase();
  const reduced = document.documentElement.dataset.winMotion === 'reduced';
  const page = mountPage(`
    <div class="page-cat">设置</div><h1>设置</h1>
    <div class="settings-group">
      <h2 class="settings-section">外观与行为</h2>
      <win-settings-card header="应用主题" description="选择要显示的应用主题（等价于 XAML 的 RequestedTheme）" header-icon="\uE790">
        <win-combo-box data-theme-select aria-label="应用主题">
          <win-combo-box-item value="light">浅色</win-combo-box-item>
          <win-combo-box-item value="dark">深色</win-combo-box-item>
          <win-combo-box-item value="system">使用系统设置</win-combo-box-item>
        </win-combo-box>
      </win-settings-card>
      <win-settings-expander header="强调色" description="setAccentColor() 会按 Windows 的规则派生 Light1–3 / Dark1–3 完整色阶" header-icon="\uE771">
        <span slot="content" class="accent-now" data-accent-now style="background:${cur}"></span>
        <win-settings-card content-alignment="left">
          <div class="swatches" role="radiogroup" aria-label="强调色">${ACCENTS.map(
            (c) =>
              `<span class="swatch" role="radio" tabindex="0" aria-label="${c}" aria-checked="${c === cur}" data-accent="${c}" style="background:${c}"></span>`,
          ).join('')}</div>
        </win-settings-card>
      </win-settings-expander>
      <win-settings-card header="窗口材质" description="等价于 Window.SystemBackdrop：Mica / Mica Alt / 桌面亚克力从壁纸取色，窗口失活时回退为纯色" header-icon="">
        <win-combo-box data-backdrop-select aria-label="窗口材质">${BACKDROPS.map(([v, l]) => `<win-combo-box-item value="${v}">${l}</win-combo-box-item>`).join('')}</win-combo-box>
      </win-settings-card>
      <win-settings-card header="壁纸" description="Mica 与桌面亚克力的取色来源；开发服务器会提供当前的 Windows 桌面壁纸" header-icon="">
        <win-combo-box data-wallpaper-select aria-label="壁纸">
          <win-combo-box-item value="system">系统壁纸</win-combo-box-item>
          <win-combo-box-item value="custom">选择图片…</win-combo-box-item>
          <win-combo-box-item value="none">无（纯色回退）</win-combo-box-item>
        </win-combo-box>
      </win-settings-card>
      <win-settings-card header="透明效果" description="关闭后所有 Mica 与亚克力显示回退纯色（同时遵循系统的 prefers-reduced-transparency）" header-icon="">
        <win-toggle-switch data-transparency ${getMaterialSettings().transparency !== 'off' ? 'checked' : ''}></win-toggle-switch>
      </win-settings-card>
      <win-settings-card header="图标字体" description="Symbol 与字体图标默认使用系统的 Segoe Fluent Icons，未安装时（macOS、Linux 等）自动改用内置的 Fluent UI System Icons 字形。本机${isSegoeIconFontInstalled() ? '已安装' : '未安装'} Segoe Fluent Icons" header-icon="\uE8D2">
        <win-combo-box data-icon-font-select aria-label="图标字体">
          <win-combo-box-item value="auto">自动</win-combo-box-item>
          <win-combo-box-item value="fluent">Fluent UI System Icons</win-combo-box-item>
        </win-combo-box>
      </win-settings-card>
      <win-settings-card header="减少动画" description="关闭 Fluent 进出场与过渡动画（同时遵循系统的 prefers-reduced-motion）" header-icon="\uE916">
        <win-toggle-switch data-motion ${reduced ? 'checked' : ''}></win-toggle-switch>
      </win-settings-card>
      <win-settings-card header="界面声音" description="ElementSoundPlayer：点击、键盘焦点、打开/关闭浮出控件时播放提示音" header-icon="\uE767">
        <win-toggle-switch data-sound ${ElementSoundPlayer.state === 'on' ? 'checked' : ''}></win-toggle-switch>
      </win-settings-card>
      <h2 class="settings-section">关于</h2>
      <win-settings-expander header="WinUI 3 Gallery · Web" description="TypeScript Web Components 复刻的 WinUI 3 控件库" header-icon="\uE946" is-expanded>
        <win-settings-card header="控件页面" description="${allPages.length} 个页面，覆盖 ${CATEGORIES.filter((c) => allPages.some((p) => p.category === c.id)).length} 个类别"></win-settings-card>
        <win-settings-card header="设计来源" description="控件模板、主题资源与动画参数取自 Windows App SDK 的 generic.xaml"></win-settings-card>
        <win-settings-card header="快捷键" description="Ctrl+E 搜索 · Alt 显示访问键 · Esc 关闭浮出控件"></win-settings-card>
      </win-settings-expander>
    </div>`);
  const themeSelect = page.querySelector<HTMLElement & { value: string }>('[data-theme-select]')!;
  themeSelect.value = mode;
  themeSelect.addEventListener('change', () => {
    const t = themeSelect.value as 'light' | 'dark' | 'system';
    if (!t) return;
    setTheme(t, document.documentElement, { animate: true });
    store.set('theme', t);
    syncThemeToggle();
  });
  const now = page.querySelector<HTMLElement>('[data-accent-now]')!;
  for (const s of page.querySelectorAll<HTMLElement>('[data-accent]')) {
    const pick = () => {
      const c = s.dataset.accent!;
      setAccentColor(c === '#0078D4' ? null : c);
      store.set('accent', c === '#0078D4' ? null : c);
      now.style.background = c;
      for (const o of page.querySelectorAll('[data-accent]')) o.setAttribute('aria-checked', String(o === s));
    };
    s.addEventListener('click', pick);
    s.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        pick();
      }
    });
  }
  const backdropSelect = page.querySelector<HTMLElement & { value: string }>('[data-backdrop-select]')!;
  backdropSelect.value = store.get('backdrop') ?? 'mica';
  backdropSelect.addEventListener('change', () => {
    const v = backdropSelect.value;
    if (!v) return;
    setSystemBackdrop(v as MaterialKind);
    store.set('backdrop', v === 'mica' ? null : v);
  });
  const wallpaperSelect = page.querySelector<HTMLElement & { value: string }>('[data-wallpaper-select]')!;
  wallpaperSelect.value =
    customWallpaper && wallpaperVersion === 'custom' ? 'custom' : (store.get('wallpaper') ?? 'system');
  wallpaperSelect.addEventListener('change', () => {
    const v = wallpaperSelect.value;
    if (v === 'custom') {
      const input = Object.assign(document.createElement('input'), { type: 'file', accept: 'image/*' });
      input.addEventListener('change', () => {
        const file = input.files?.[0];
        if (!file) return;
        customWallpaper = file;
        wallpaperVersion = '';
        store.set('wallpaper', null);
        void setWallpaper(file, { fit: 'fill' }).then(() => (wallpaperVersion = 'custom'));
      });
      input.click();
      return;
    }
    customWallpaper = null;
    wallpaperVersion = '';
    store.set('wallpaper', v === 'system' ? null : v);
    void syncWallpaper();
  });
  const transparency = page.querySelector<HTMLElement & { checked: boolean }>('[data-transparency]')!;
  transparency.addEventListener('change', () => {
    configureMaterials({ transparency: transparency.checked ? 'auto' : 'off' });
    store.set('transparency', transparency.checked ? null : 'off');
  });
  const iconFont = page.querySelector<HTMLElement & { value: string }>('[data-icon-font-select]')!;
  iconFont.value = getIconFont();
  iconFont.addEventListener('change', () => {
    const v = iconFont.value as IconFontMode;
    if (!v) return;
    void setIconFont(v);
    store.set('icons', v === 'fluent' ? v : null);
  });
  const motion = page.querySelector<HTMLElement & { checked: boolean }>('[data-motion]')!;
  motion.addEventListener('change', () => {
    setMotion(motion.checked ? 'reduced' : 'full');
    store.set('motion', motion.checked ? 'reduced' : null);
  });
  const sound = page.querySelector<HTMLElement & { checked: boolean }>('[data-sound]')!;
  sound.addEventListener('change', () => {
    ElementSoundPlayer.state = sound.checked ? 'on' : 'off';
    store.set('sound', sound.checked ? 'on' : null);
  });
}

function render(): void {
  const r = route();
  syncNav(r);
  switch (r.kind) {
    case 'home':
      renderHome();
      break;
    case 'all':
      renderAll();
      break;
    case 'category':
      renderCategory(r.id);
      break;
    case 'page':
      renderControl(r.page);
      document.title = `${r.page.title} · WinUI 3 Gallery`;
      return;
    case 'settings':
      renderSettings();
      break;
    case 'search':
      renderSearch(r.q);
      break;
    case 'missing':
      mountPage(`<h1>未找到页面</h1><p class="empty">没有名为 “${escapeHtml(r.id)}” 的页面。</p>`);
      break;
  }
  document.title = 'WinUI 3 Gallery · Web';
}

interface PageHit {
  title: string;
  id: string;
  category: string;
}
const matchPages = (q: string): PageHit[] => {
  const n = q.trim().toLowerCase();
  if (!n) return [];
  const score = (p: GalleryPage) => {
    const t = p.title.toLowerCase();
    if (t.startsWith(n)) return 0;
    if (t.includes(n)) return 1;
    if ((p.tags ?? []).some((x) => x.includes(n))) return 2;
    return p.description.toLowerCase().includes(n) ? 3 : 9;
  };
  return allPages
    .map((p) => ({ p, s: score(p) }))
    .filter((x) => x.s < 9)
    .sort((a, b) => a.s - b.s)
    .slice(0, 12)
    .map(({ p }) => ({ title: p.title, id: p.id, category: catTitle(p.category) }));
};
search.addEventListener('textchanged', (ev) => {
  const { text, reason } = (ev as CustomEvent<{ text: string; reason: string }>).detail;
  if (reason !== 'user-input') return;
  search.items = matchPages(text);
});
search.addEventListener('querysubmitted', (ev) => {
  const { queryText, chosenSuggestion } = (ev as CustomEvent<{ queryText: string; chosenSuggestion: PageHit | null }>)
    .detail;
  if (chosenSuggestion) location.hash = `#/${chosenSuggestion.id}`;
  else if (queryText.trim()) location.hash = `#/search/${encodeURIComponent(queryText.trim())}`;
});
addEventListener('keydown', (ev) => {
  if ((ev.ctrlKey || ev.metaKey) && ev.key.toLowerCase() === 'e') {
    ev.preventDefault();
    search.focus();
  }
});

buildNav();
render();
