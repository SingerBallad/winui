import { html, type GalleryPage } from './types.ts';

function ensureStyles(): void {
  if (document.getElementById('layout-gallery-styles')) return;
  const s = document.createElement('style');
  s.id = 'layout-gallery-styles';
  s.textContent = `
.lg-opt-combo { width: 100%; }
.lg-opt-slider { width: 100%; }
.lg-tile { display: grid; place-items: center; border-radius: 4px; font: var(--w-type-body-strong); color: #fff; min-width: 0; min-height: 0; }
.lg-box { border: 1px dashed var(--w-control-strong-stroke-color-default); border-radius: 4px; }
.lg-card { background: var(--w-card-background-fill-color-default); border: 1px solid var(--w-card-stroke-color-default); border-radius: 8px; }
.lg-out { font: var(--w-type-body); color: var(--w-text-fill-color-secondary); }
.lg-list-item { padding: 8px 12px; border-radius: 4px; }
.lg-list-item:hover { background: var(--w-subtle-fill-color-secondary); }
`;
  document.head.append(s);
}

const PALETTE = [
  '#0078d4',
  '#8764b8',
  '#00b294',
  '#e3008c',
  '#ca5010',
  '#498205',
  '#0063b1',
  '#c239b3',
  '#038387',
  '#e81123',
  '#ff8c00',
  '#107c10',
];
const color = (i: number) => PALETTE[i % PALETTE.length]!;

const select = (name: string, label: string, options: [string, string][], value: string) =>
  `<win-combo-box class="lg-opt-combo" data-opt="${name}" header="${label}">${options
    .map(([v, t]) => `<win-combo-box-item value="${v}"${v === value ? ' selected' : ''}>${t}</win-combo-box-item>`)
    .join('')}</win-combo-box>`;
const check = (name: string, label: string, checked = false) =>
  `<win-check-box data-opt="${name}"${checked ? ' checked' : ''}>${label}</win-check-box>`;
const range = (name: string, label: string, min: number, max: number, value: number, step = 1) =>
  `<win-slider class="lg-opt-slider" data-opt="${name}" data-label="${label}" header="${label}: ${value}" min="${min}" max="${max}" step="${step}" value="${value}"></win-slider>`;

type OptionControl = HTMLElement & { value: unknown; checked?: boolean; header?: string };

function bindOptions(opt: HTMLElement | null, cb: (name: string, value: string, el: OptionControl) => void): void {
  if (!opt) return;
  for (const el of opt.querySelectorAll<OptionControl>('[data-opt]')) {
    const name = el.dataset.opt!;
    const tag = el.localName;
    const read = () => (tag === 'win-check-box' ? String(!!el.checked) : String(el.value ?? ''));
    const fire = () => {
      const v = read();
      if (tag === 'win-slider' && el.dataset.label) el.header = `${el.dataset.label}: ${v}`;
      cb(name, v, el);
    };
    if (tag === 'win-slider') el.addEventListener('input', fire);
    else if (tag === 'win-combo-box') el.addEventListener('selectionchanged', fire);
    else el.addEventListener('change', fire);
  }
}

const out = (ex: HTMLElement, text: string) => {
  const o = ex.querySelector('[data-output]');
  if (o) o.textContent = text;
};

function landscape(w = 1600, h = 1000): string {
  const hills = (y: number, amp: number, c: string, seed: number) => {
    let d = `M0 ${h}L0 ${y}`;
    for (let x = 0; x <= w; x += 80)
      d += `L${x} ${y + Math.sin((x + seed) / 140) * amp + Math.cos((x * 1.7 + seed) / 90) * amp * 0.4}`;
    return `<path d="${d}L${w} ${h}Z" fill="${c}"/>`;
  };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block">
  <defs>
    <linearGradient id="sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#3a7bd5"/><stop offset="0.6" stop-color="#9fd3ff"/><stop offset="1" stop-color="#ffd6a5"/></linearGradient>
    <radialGradient id="sun" cx="0.5" cy="0.5" r="0.5"><stop offset="0" stop-color="#fff6cc"/><stop offset="0.6" stop-color="#ffd36b"/><stop offset="1" stop-color="#ffb347" stop-opacity="0"/></radialGradient>
  </defs>
  <rect width="${w}" height="${h}" fill="url(#sky)"/>
  <circle cx="${w * 0.72}" cy="${h * 0.32}" r="${h * 0.16}" fill="url(#sun)"/>
  ${hills(h * 0.55, 60, '#5b7f9a', 0)}${hills(h * 0.65, 50, '#3f6b57', 300)}${hills(h * 0.76, 40, '#2e5a3c', 700)}${hills(h * 0.88, 26, '#1f3d28', 1200)}
  ${Array.from({ length: 24 }, (_, i) => `<text x="${40 + (i % 6) * 260}" y="${80 + Math.floor(i / 6) * 230}" font-family="Segoe UI Variable Display, Segoe UI, sans-serif" font-size="22" fill="rgba(255,255,255,.75)">区域 ${i + 1}</text>`).join('')}
</svg>`;
}

const lorem =
  'WinUI 的 ScrollViewer 让内容可以在比视口更大的区域中平移和缩放。Windows 11 的滚动条平时只是一条细线（平移指示器），鼠标停在滚动条上会迅速展开为完整的滚动条，带有箭头按钮和亚克力轨道；移开约 0.5 秒后收起为细线，2 秒无操作后完全隐藏，不会占用内容的布局空间。';

const pages: GalleryPage[] = [
  {
    id: 'scroll-viewer',
    title: 'ScrollViewer',
    category: 'scrolling',
    icon: '',
    tags: ['win-scroll-viewer', 'win-scroll-bar'],
    description:
      'ScrollViewer 允许内容在比实际可显示区域更大的范围内平移和缩放。Windows 11 风格的覆盖式滚动条：静止时隐藏，鼠标移动时显示为细指示条，悬停在滚动条上展开为带箭头按钮的完整滚动条；支持 Ctrl+滚轮缩放（zoom-mode）。',
    docs: [
      { label: 'ScrollViewer 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/scroll-controls' },
    ],
    related: ['scroll-view', 'annotated-scroll-bar'],
    samples: [
      {
        title: '在 ScrollViewer 中平移和缩放内容',
        description: '把鼠标移到图片上即可看到滚动指示器；按住 Ctrl 滚动鼠标滚轮（或触控板双指捏合）进行缩放。',
        html: html`<win-scroll-viewer id="sv1" style="width:100%;max-width:560px;height:320px;border-radius:4px" horizontal-scroll-bar-visibility="auto" vertical-scroll-bar-visibility="auto" zoom-mode="enabled" min-zoom-factor="0.5" max-zoom-factor="4">
  <!-- 任意内容：这里是一张 1600×1000 的生成插画 -->
  ${landscape()}
</win-scroll-viewer>
<div class="lg-out" data-output>偏移：0, 0 · 缩放：1.00</div>`,
        options: `${check('zoom', 'ZoomMode = Enabled', true)}${select(
          'hv',
          'HorizontalScrollBarVisibility',
          [
            ['auto', 'Auto'],
            ['visible', 'Visible'],
            ['hidden', 'Hidden'],
            ['disabled', 'Disabled'],
          ],
          'auto',
        )}${select(
          'vv',
          'VerticalScrollBarVisibility',
          [
            ['auto', 'Auto'],
            ['visible', 'Visible'],
            ['hidden', 'Hidden'],
            ['disabled', 'Disabled'],
          ],
          'auto',
        )}`,
        setup(ex, opt) {
          ensureStyles();
          const sv = ex.querySelector('win-scroll-viewer')!;
          sv.addEventListener('viewchanged', (e) => {
            const d = (e as CustomEvent).detail;
            out(
              ex,
              `偏移：${Math.round(d.horizontalOffset)}, ${Math.round(d.verticalOffset)} · 缩放：${d.zoomFactor.toFixed(2)}${d.isIntermediate ? '（滚动中）' : ''}`,
            );
          });
          bindOptions(opt, (n, v) => {
            if (n === 'zoom') sv.zoomMode = v === 'true' ? 'enabled' : 'disabled';
            if (n === 'hv') sv.horizontalScrollBarVisibility = v as never;
            if (n === 'vv') sv.verticalScrollBarVisibility = v as never;
          });
        },
      },
      {
        title: '以编程方式滚动和缩放（ChangeView）',
        html: html`<div class="row">
  <win-button data-act="top">滚动到顶部</win-button>
  <win-button data-act="bottom">滚动到底部</win-button>
  <win-button data-act="zoom">缩放到 2×</win-button>
  <win-button data-act="reset">复位</win-button>
</div>
<win-scroll-viewer style="width:100%;max-width:560px;height:220px" class="lg-card" vertical-scroll-bar-visibility="auto">
  <div style="padding:16px 20px;display:flex;flex-direction:column;gap:12px">
    ${Array.from({ length: 14 }, (_, i) => `<p style="margin:0">${i + 1}. ${lorem}</p>`).join('')}
  </div>
</win-scroll-viewer>`,
        setup(ex) {
          const sv = ex.querySelector('win-scroll-viewer')!;
          ex.querySelector('[data-act="top"]')?.addEventListener('click', () => sv.changeView(null, 0));
          ex.querySelector('[data-act="bottom"]')?.addEventListener('click', () =>
            sv.changeView(null, sv.scrollableHeight),
          );
          ex.querySelector('[data-act="zoom"]')?.addEventListener('click', () => sv.changeView(null, null, 2));
          ex.querySelector('[data-act="reset"]')?.addEventListener('click', () => sv.changeView(0, 0, 1, true));
        },
        js: `scrollViewer.changeView(null, 0);              // 平滑滚动到顶部
scrollViewer.changeView(null, sv.scrollableHeight); // 到底部
scrollViewer.changeView(null, null, 2);           // 缩放到 2 倍
scrollViewer.addEventListener('viewchanged', (e) => console.log(e.detail));`,
      },
      {
        title: '独立的 ScrollBar',
        description: 'win-scroll-bar 也可以单独使用（ScrollBar 控件）：拖动拇指、点击轨道翻页、按住箭头按钮连续滚动。',
        html: html`<div class="row" style="align-items:stretch;gap:24px">
  <win-scroll-bar orientation="vertical" maximum="100" viewport-size="20" large-change="20" small-change="1" style="height:180px"></win-scroll-bar>
  <div class="col" style="flex:1;max-width:360px;gap:16px;justify-content:center">
    <win-scroll-bar orientation="horizontal" maximum="100" viewport-size="25" large-change="25" small-change="1"></win-scroll-bar>
    <div class="lg-out" data-output>值：0</div>
  </div>
</div>`,
        setup(ex) {
          for (const sb of ex.querySelectorAll('win-scroll-bar')) {
            sb.addEventListener('scroll', (e) => {
              const d = (e as CustomEvent).detail;
              out(ex, `值：${d.value.toFixed(1)}（${d.type}）`);
            });
          }
        },
      },
    ],
  },
  {
    id: 'scroll-view',
    title: 'ScrollView',
    category: 'scrolling',
    icon: '',
    badge: 'updated',
    tags: ['win-scroll-view'],
    description:
      'ScrollView 是 WinUI 1.4 引入的新一代滚动容器，提供 scrollTo / scrollBy / zoomTo / zoomBy 等带动画选项的 API，并通过相关 ID（correlation id）报告 scrollcompleted / zoomcompleted。默认内容方向为纵向（content-orientation）。',
    related: ['scroll-viewer', 'annotated-scroll-bar'],
    samples: [
      {
        title: '带动画选项的 ScrollTo / ZoomTo',
        html: html`<div class="row">
  <win-button data-act="to">ScrollTo(400, 300)</win-button>
  <win-button data-act="by">ScrollBy(0, 120)</win-button>
  <win-button data-act="zin">ZoomBy(+0.5)</win-button>
  <win-button data-act="zout">ZoomTo(1)</win-button>
</div>
<win-scroll-view style="width:100%;max-width:560px;height:300px;border-radius:4px" content-orientation="both" zoom-mode="enabled">
  ${landscape(1400, 900)}
</win-scroll-view>
<div class="lg-out" data-output>事件输出</div>`,
        options: `${check('anim', '启用动画（animationMode）', true)}`,
        setup(ex, opt) {
          ensureStyles();
          const sv = ex.querySelector('win-scroll-view')!;
          let animate = true;
          bindOptions(opt, (_n, v) => (animate = v === 'true'));
          const mode = () => ({ animationMode: animate ? ('enabled' as const) : ('disabled' as const) });
          ex.querySelector('[data-act="to"]')?.addEventListener('click', () => sv.scrollTo(400, 300, mode()));
          ex.querySelector('[data-act="by"]')?.addEventListener('click', () => sv.scrollBy(0, 120, mode()));
          ex.querySelector('[data-act="zin"]')?.addEventListener('click', () => sv.zoomBy(0.5, null, mode()));
          ex.querySelector('[data-act="zout"]')?.addEventListener('click', () => sv.zoomTo(1, null, mode()));
          for (const t of ['scrollcompleted', 'zoomcompleted']) {
            sv.addEventListener(t, (e) =>
              out(ex, `${t}（correlationId = ${(e as CustomEvent).detail.correlationId}）`),
            );
          }
        },
      },
      {
        title: '横向内容（content-orientation="horizontal"）',
        html: html`<win-scroll-view content-orientation="horizontal" style="width:100%;max-width:560px;height:140px">
  <div style="display:flex;gap:12px;padding:12px">
    ${Array.from({ length: 16 }, (_, i) => `<div class="lg-tile" style="width:120px;height:96px;background:${color(i)}">${i + 1}</div>`).join('')}
  </div>
</win-scroll-view>`,
        setup() {
          ensureStyles();
        },
      },
    ],
  },
  {
    id: 'annotated-scroll-bar',
    title: 'AnnotatedScrollBar',
    category: 'scrolling',
    icon: '',
    badge: 'new',
    tags: ['win-annotated-scroll-bar'],
    description:
      'AnnotatedScrollBar（WinUI 1.6）在滚动条旁显示分组标签，便于在很长的列表中快速跳转。悬停时显示“幽灵”拇指和详细信息提示（detaillabelrequested 事件可自定义文本），点击或拖动即可定位。',
    related: ['scroll-view'],
    samples: [
      {
        title: '为照片集提供带标签的滚动条',
        html: html`<div class="row" style="align-items:stretch;gap:8px;flex-wrap:nowrap">
  <win-scroll-view id="asb-target" vertical-scroll-bar-visibility="hidden" style="flex:1;max-width:520px;height:360px" class="lg-card">
    <div data-photos style="padding:12px"></div>
  </win-scroll-view>
  <win-annotated-scroll-bar for="asb-target" style="height:360px"></win-annotated-scroll-bar>
</div>`,
        setup(ex) {
          ensureStyles();
          const host = ex.querySelector<HTMLElement>('[data-photos]')!;
          const months = [
            '1 月',
            '2 月',
            '3 月',
            '4 月',
            '5 月',
            '6 月',
            '7 月',
            '8 月',
            '9 月',
            '10 月',
            '11 月',
            '12 月',
          ];
          const counts = [9, 15, 6, 12, 18, 6, 9, 21, 12, 6, 15, 9];
          host.innerHTML = months
            .map(
              (
                m,
                mi,
              ) => `<section data-month="${mi}" style="margin-bottom:16px"><div class="w-body-strong" style="margin:4px 0 8px">2026 年 ${m}</div>
  <div style="display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:6px">${Array.from({ length: counts[mi]! }, (_, i) => `<div class="lg-tile" style="height:64px;background:${color(mi + i)};opacity:${0.65 + (i % 4) * 0.1}"></div>`).join('')}</div></section>`,
            )
            .join('');
          const bar = ex.querySelector('win-annotated-scroll-bar')!;
          const sv = ex.querySelector('win-scroll-view')!;
          const build = () => {
            const top0 = host.getBoundingClientRect().top;
            bar.labels = Array.from(host.querySelectorAll<HTMLElement>('[data-month]')).map((s, i) => ({
              content: months[i]!,
              scrollOffset: s.getBoundingClientRect().top - top0,
            }));
          };
          requestAnimationFrame(build);
          new ResizeObserver(build).observe(sv);
          bar.addEventListener('detaillabelrequested', (e) => {
            const d = (e as CustomEvent).detail as { scrollOffset: number; content: string | null };
            const sections = Array.from(host.querySelectorAll<HTMLElement>('[data-month]'));
            const top0 = host.getBoundingClientRect().top;
            let mi = 0;
            sections.forEach((s, i) => {
              if (s.getBoundingClientRect().top - top0 <= d.scrollOffset + 1) mi = i;
            });
            d.content = `2026 年 ${months[mi]} · ${counts[mi]} 张照片`;
          });
        },
      },
    ],
  },

  {
    id: 'expander',
    title: 'Expander',
    category: 'layout',
    icon: '',
    tags: ['win-expander'],
    description:
      'Expander 拥有一个始终可见的标题和一个可展开的内容区域。展开时内容从标题下方以 333ms 的减速曲线滑出，折叠时滑回标题下方，下方内容随之平滑移动；动画中途再次点击会从当前位置反向。也可以设置 expand-direction="up" 向上展开。',
    docs: [{ label: 'Expander 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/expander' }],
    samples: [
      {
        title: '标题和内容都为文本的 Expander',
        html: html`<win-expander header="This text is in the header" style="width:420px">
  This is in the content
</win-expander>
<div class="lg-out" data-output></div>`,
        options: `${select(
          'dir',
          'ExpandDirection',
          [
            ['down', 'Down'],
            ['up', 'Up'],
          ],
          'down',
        )}${check('disabled', '禁用')}`,
        setup(ex, opt) {
          ensureStyles();
          const e = ex.querySelector('win-expander')!;
          e.addEventListener('expanding', () => out(ex, '事件：expanding'));
          e.addEventListener('collapsed', () => out(ex, '事件：collapsed'));
          bindOptions(opt, (n, v) => {
            if (n === 'dir') e.expandDirection = v as 'down' | 'up';
            if (n === 'disabled') e.disabled = v === 'true';
          });
        },
      },
      {
        title: '标题中包含其他控件的 Expander',
        html: html`<win-expander style="width:520px" expanded>
  <div slot="header" style="display:flex;align-items:center;gap:12px;padding:6px 0">
    <span class="w-icon" style="font-size:20px">&#xE7E8;</span>
    <div style="flex:1"><div>电源与电池</div><div class="w-caption w-text-secondary">屏幕和睡眠、节能模式</div></div>
  </div>
  <div style="display:flex;flex-direction:column;align-items:flex-start;gap:12px">
    <win-check-box checked>插入电源时，在 10 分钟后关闭屏幕</win-check-box>
    <win-check-box>使用电池电量时启用节能模式</win-check-box>
    <win-hyperlink-button>更多电源设置</win-hyperlink-button>
  </div>
</win-expander>`,
        setup() {
          ensureStyles();
        },
      },
      {
        title: '展开方向为向上的 Expander',
        html: html`<div style="height:180px;display:flex;align-items:flex-end">
  <win-expander header="向上展开" expand-direction="up" style="width:360px">
    内容出现在标题上方。
  </win-expander>
</div>`,
      },
    ],
  },
  {
    id: 'split-view',
    title: 'SplitView',
    category: 'layout',
    icon: '',
    tags: ['win-split-view'],
    description:
      'SplitView 由内容区和窗格组成，窗格可以覆盖在内容之上（Overlay）或与内容并排（Inline），紧凑模式会保留 48px 的窄窗格；窗格可以放在左侧或右侧（pane-placement），并随 RTL 布局镜像。覆盖模式下点击窗格外部（轻量关闭）或按 Esc 即可收起。',
    related: ['navigation-view', 'two-pane-view'],
    samples: [
      {
        title: '带可切换显示模式的 SplitView',
        html: html`<win-split-view id="split1" display-mode="compact-overlay" open-pane-length="256" style="height:320px;width:100%;max-width:640px" class="lg-card">
  <div slot="pane" style="padding:4px 0">
    <win-button appearance="subtle" data-toggle style="margin:4px 4px 8px;width:40px;padding:0;height:36px" aria-label="切换窗格"><span class="w-icon" style="font-size:16px">&#xE700;</span></win-button>
    ${['主页', '收件箱', '已发送', '草稿', '回收站']
      .map(
        (t, i) =>
          `<div class="lg-list-item" style="display:flex;gap:16px;align-items:center;margin:2px 4px;padding:8px 8px"><span class="w-icon" style="font-size:16px;width:24px;text-align:center">${['&#xE80F;', '&#xE715;', '&#xE724;', '&#xE70B;', '&#xE74D;'][i]}</span><span style="white-space:nowrap">${t}</span></div>`,
      )
      .join('')}
  </div>
  <div style="padding:20px 24px">
    <div class="w-subtitle">内容区</div>
    <p class="w-text-secondary" style="max-width:340px">使用窗格中的菜单按钮或选项面板打开窗格。Overlay/CompactOverlay 模式下点击此处会收起窗格。</p>
  </div>
</win-split-view>
<div class="lg-out" data-output></div>`,
        options: `${check('open', 'IsPaneOpen')}${select(
          'mode',
          'DisplayMode',
          [
            ['overlay', 'Overlay'],
            ['inline', 'Inline'],
            ['compact-overlay', 'CompactOverlay'],
            ['compact-inline', 'CompactInline'],
          ],
          'compact-overlay',
        )}${select(
          'place',
          'PanePlacement',
          [
            ['left', 'Left'],
            ['right', 'Right'],
          ],
          'left',
        )}${check('smoke', 'LightDismissOverlayMode = On')}${check('rtl', 'FlowDirection = RightToLeft')}`,
        setup(ex, opt) {
          ensureStyles();
          const sv = ex.querySelector('win-split-view')!;
          const openBox = opt?.querySelector<HTMLElement & { checked: boolean }>('win-check-box[data-opt="open"]');
          ex.querySelector('[data-toggle]')?.addEventListener('click', () => (sv.paneOpen = !sv.paneOpen));
          for (const t of ['paneopening', 'paneopened', 'paneclosing', 'paneclosed']) {
            sv.addEventListener(t, () => {
              out(ex, `事件：${t}`);
              if (openBox) openBox.checked = sv.paneOpen;
            });
          }
          bindOptions(opt, (n, v) => {
            if (n === 'open') sv.paneOpen = v === 'true';
            if (n === 'mode') sv.displayMode = v as never;
            if (n === 'place') sv.panePlacement = v as 'left' | 'right';
            if (n === 'smoke') sv.lightDismissOverlayMode = v === 'true' ? 'on' : 'auto';
            if (n === 'rtl') {
              if (v === 'true') sv.setAttribute('dir', 'rtl');
              else sv.removeAttribute('dir');
            }
          });
        },
      },
    ],
  },
  {
    id: 'two-pane-view',
    title: 'TwoPaneView',
    category: 'layout',
    icon: '',
    tags: ['win-two-pane-view'],
    description:
      'TwoPaneView 根据可用空间自动在单窗格、宽（左右）和高（上下）模式之间切换：宽度超过 min-wide-mode-width（641）时并排显示，否则高度超过 min-tall-mode-height（641）时上下排列，空间不足时只显示优先窗格。',
    samples: [
      {
        title: '拖动右下角改变容器大小，观察模式切换',
        html: html`<div style="resize:both;overflow:hidden;width:min(100%,700px);height:300px;min-width:200px;min-height:160px" class="lg-card">
  <win-two-pane-view min-wide-mode-width="500" min-tall-mode-height="400">
    <div slot="pane1" style="padding:16px;background:color-mix(in srgb, var(--w-accent-fill-color-default) 14%, transparent);height:100%;box-sizing:border-box">
      <div class="w-body-strong">Pane 1 · 列表</div>
      ${Array.from({ length: 6 }, (_, i) => `<div class="lg-list-item">项目 ${i + 1}</div>`).join('')}
    </div>
    <div slot="pane2" style="padding:16px;height:100%;box-sizing:border-box">
      <div class="w-body-strong">Pane 2 · 详细信息</div>
      <p class="w-text-secondary">宽模式下两个窗格并排；高模式下上下排列；单窗格模式只显示 pane-priority 指定的窗格。</p>
    </div>
  </win-two-pane-view>
</div>
<div class="lg-out" data-output>Mode：</div>`,
        options: `${select(
          'prio',
          'PanePriority',
          [
            ['pane1', 'Pane1'],
            ['pane2', 'Pane2'],
          ],
          'pane1',
        )}${select(
          'wide',
          'WideModeConfiguration',
          [
            ['left-right', 'LeftRight'],
            ['right-left', 'RightLeft'],
            ['single-pane', 'SinglePane'],
          ],
          'left-right',
        )}${select(
          'tall',
          'TallModeConfiguration',
          [
            ['top-bottom', 'TopBottom'],
            ['bottom-top', 'BottomTop'],
            ['single-pane', 'SinglePane'],
          ],
          'top-bottom',
        )}`,
        setup(ex, opt) {
          ensureStyles();
          const tp = ex.querySelector('win-two-pane-view')!;
          const show = () => out(ex, `Mode：${tp.mode}`);
          tp.addEventListener('modechanged', show);
          requestAnimationFrame(show);
          bindOptions(opt, (n, v) => {
            if (n === 'prio') tp.panePriority = v as 'pane1' | 'pane2';
            if (n === 'wide') tp.wideModeConfiguration = v as never;
            if (n === 'tall') tp.tallModeConfiguration = v as never;
          });
        },
      },
    ],
  },
  {
    id: 'stack-panel',
    title: 'StackPanel',
    category: 'layout',
    icon: '',
    tags: ['win-stack-panel'],
    description:
      'StackPanel 将子元素按水平或垂直方向排成一行，可用 spacing 设置元素间距。按钮等 WinUI 默认左对齐的控件在纵向 StackPanel 中保持左对齐。',
    samples: [
      {
        title: '可调整方向和间距的 StackPanel',
        html: html`<win-stack-panel spacing="8" style="width:100%;max-width:520px">
  ${Array.from({ length: 4 }, (_, i) => `<div class="lg-tile" style="height:40px;min-width:40px;padding:0 16px;background:${color(i)}">项 ${i + 1}</div>`).join('')}
  <win-button>默认左对齐的按钮</win-button>
</win-stack-panel>`,
        options: `${select(
          'orientation',
          'Orientation',
          [
            ['vertical', 'Vertical'],
            ['horizontal', 'Horizontal'],
          ],
          'vertical',
        )}${range('spacing', 'Spacing', 0, 40, 8)}`,
        setup(ex, opt) {
          ensureStyles();
          const sp = ex.querySelector('win-stack-panel')!;
          bindOptions(opt, (n, v) => {
            if (n === 'orientation') sp.orientation = v as 'vertical' | 'horizontal';
            if (n === 'spacing') sp.spacing = Number(v);
          });
        },
      },
    ],
  },
  {
    id: 'grid-panel',
    title: 'GridPanel',
    category: 'layout',
    icon: '',
    tags: ['win-grid-panel'],
    description:
      'GridPanel 用行和列定义（Auto、像素或 * 比例）排列子元素；子元素通过 grid-row、grid-column 与 grid-row-span、grid-column-span 属性定位，并可设置 row-spacing / column-spacing。',
    samples: [
      {
        title: '3 × 3 网格与跨行跨列',
        html: html`<win-grid-panel column-definitions="Auto,*,2*" row-definitions="60,*,Auto" column-spacing="8" row-spacing="8" style="width:100%;max-width:560px;height:260px">
  <div class="lg-tile" style="background:${color(0)};padding:0 16px">Auto</div>
  <div class="lg-tile" grid-column="1" style="background:${color(1)}">*</div>
  <div class="lg-tile" grid-column="2" style="background:${color(2)}">2*</div>
  <div class="lg-tile" grid-row="1" grid-column-span="2" style="background:${color(3)}">grid-column-span = 2</div>
  <div class="lg-tile" grid-row="1" grid-column="2" grid-row-span="2" style="background:${color(4)}">grid-row-span = 2</div>
  <div class="lg-tile" grid-row="2" style="background:${color(5)};padding:8px 16px">Auto 行</div>
  <win-button grid-row="2" grid-column="1">按钮</win-button>
</win-grid-panel>`,
        options: `${select(
          'cols',
          'ColumnDefinitions',
          [
            ['Auto,*,2*', 'Auto,*,2*'],
            ['*,*,*', '*,*,*'],
            ['120,*,120', '120,*,120'],
            ['2*,*,Auto', '2*,*,Auto'],
          ],
          'Auto,*,2*',
        )}${range('gap', 'Row/ColumnSpacing', 0, 24, 8)}`,
        setup(ex, opt) {
          ensureStyles();
          const g = ex.querySelector('win-grid-panel')!;
          bindOptions(opt, (n, v) => {
            if (n === 'cols') g.columnDefinitions = v;
            if (n === 'gap') {
              g.rowSpacing = Number(v);
              g.columnSpacing = Number(v);
            }
          });
        },
      },
    ],
  },
  {
    id: 'absolute-panel',
    title: 'AbsolutePanel',
    category: 'layout',
    icon: '',
    tags: ['win-absolute-panel'],
    description:
      'AbsolutePanel 使用相对于自身左上角的绝对坐标（子元素的 left / top 属性）定位子元素，z-index 属性控制叠放次序。',
    samples: [
      {
        title: '在 AbsolutePanel 中定位元素',
        html: html`<win-absolute-panel style="width:100%;max-width:420px;height:260px" class="lg-box">
  <div class="lg-tile" data-red left="20" top="20" style="width:120px;height:120px;background:#e81123">红</div>
  <div class="lg-tile" left="80" top="70" z-index="1" style="width:120px;height:120px;background:#0078d4">蓝</div>
  <div class="lg-tile" left="150" top="120" style="width:120px;height:120px;background:#107c10">绿</div>
</win-absolute-panel>`,
        options: `${range('left', '红色 Canvas.Left', 0, 280, 20)}${range('top', '红色 Canvas.Top', 0, 140, 20)}${range('z', '红色 Canvas.ZIndex', 0, 2, 0)}`,
        setup(ex, opt) {
          ensureStyles();
          const red = ex.querySelector<HTMLElement>('[data-red]')!;
          bindOptions(opt, (n, v) => {
            red.setAttribute(n === 'left' ? 'left' : n === 'top' ? 'top' : 'z-index', v);
          });
        },
      },
    ],
  },
  {
    id: 'relative-panel',
    title: 'RelativePanel',
    category: 'layout',
    icon: '',
    tags: ['win-relative-panel'],
    description:
      'RelativePanel 根据子元素之间以及与面板之间的关系进行布局：right-of / below / left-of / above 以及 align-*-with、align-*-with-panel 等属性，适合构建自适应界面。',
    samples: [
      {
        title: '使用 RelativePanel 相对定位元素',
        html: html`<win-relative-panel style="width:100%;max-width:520px;height:220px" class="lg-box">
  <div id="rp-red" class="lg-tile" style="width:100px;height:100px;background:#e81123">Red</div>
  <div id="rp-blue" class="lg-tile" right-of="rp-red" style="width:100px;height:50px;background:#0078d4">right-of Red</div>
  <div id="rp-green" class="lg-tile" below="rp-red" align-left-with="rp-red" style="width:180px;height:50px;background:#107c10">below Red</div>
  <div class="lg-tile" right-of="rp-blue" align-right-with-panel style="height:50px;background:#ca5010">right-of Blue · 拉伸到面板右侧</div>
  <div class="lg-tile" align-bottom-with-panel align-right-with-panel style="width:140px;height:40px;background:#8764b8">底部右侧</div>
  <div class="lg-tile" align-horizontal-center-with-panel align-vertical-center-with-panel style="width:96px;height:40px;background:#038387">居中</div>
</win-relative-panel>`,
        setup() {
          ensureStyles();
        },
      },
    ],
  },
  {
    id: 'variable-sized-wrap-grid',
    title: 'VariableSizedWrapGrid',
    category: 'layout',
    icon: '',
    tags: ['win-variable-sized-wrap-grid'],
    description:
      'VariableSizedWrapGrid 以固定大小的单元格排列子元素，子元素可以通过 row-span / column-span 占据多个单元格，排满一行（或一列）后自动换行。',
    samples: [
      {
        title: '跨越多个单元格的项',
        html: html`<win-variable-sized-wrap-grid orientation="horizontal" item-width="80" item-height="80" maximum-rows-or-columns="6" style="gap:4px">
  <div class="lg-tile" row-span="2" column-span="2" style="background:${color(0)}">2×2</div>
  ${Array.from({ length: 6 }, (_, i) => `<div class="lg-tile" style="background:${color(i + 1)}">${i + 1}</div>`).join('')}
  <div class="lg-tile" column-span="3" style="background:${color(8)}">column-span 3</div>
  <div class="lg-tile" row-span="2" style="background:${color(9)}">高</div>
  ${Array.from({ length: 5 }, (_, i) => `<div class="lg-tile" style="background:${color(i + 3)}">${i + 7}</div>`).join('')}
</win-variable-sized-wrap-grid>`,
        options: `${select(
          'orientation',
          'Orientation',
          [
            ['horizontal', 'Horizontal'],
            ['vertical', 'Vertical'],
          ],
          'horizontal',
        )}${range('max', 'MaximumRowsOrColumns', 2, 8, 6)}`,
        setup(ex, opt) {
          ensureStyles();
          const g = ex.querySelector('win-variable-sized-wrap-grid')!;
          bindOptions(opt, (n, v) => {
            if (n === 'orientation') g.orientation = v as 'horizontal' | 'vertical';
            if (n === 'max') g.maximumRowsOrColumns = Number(v);
          });
        },
      },
    ],
  },
  {
    id: 'fit-box',
    title: 'FitBox',
    category: 'layout',
    icon: '',
    tags: ['win-fit-box'],
    description:
      'FitBox 会缩放其内容以填满可用空间：Uniform 保持纵横比完整显示、UniformToFill 保持纵横比并填满、Fill 拉伸填满、None 保持原始大小；stretch-direction 可限制只放大或只缩小。',
    samples: [
      {
        title: '不同拉伸模式的 FitBox',
        html: html`<div class="row" style="align-items:flex-start;gap:16px">
  <win-fit-box data-vb style="width:240px;height:160px" class="lg-box">
    <div style="display:flex;align-items:center;gap:8px;padding:6px 10px;background:var(--w-accent-fill-color-default);color:var(--w-text-on-accent-fill-color-primary);border-radius:6px">
      <span class="w-icon" style="font-size:20px">&#xE734;</span><span class="w-body-strong">FitBox 内容</span>
    </div>
  </win-fit-box>
</div>`,
        options: `${select(
          'stretch',
          'Stretch',
          [
            ['uniform', 'Uniform'],
            ['uniform-to-fill', 'UniformToFill'],
            ['fill', 'Fill'],
            ['none', 'None'],
          ],
          'uniform',
        )}${select(
          'dir',
          'StretchDirection',
          [
            ['both', 'Both'],
            ['up-only', 'UpOnly'],
            ['down-only', 'DownOnly'],
          ],
          'both',
        )}${range('w', '宽度', 80, 360, 240)}${range('h', '高度', 40, 240, 160)}`,
        setup(ex, opt) {
          ensureStyles();
          const vb = ex.querySelector<HTMLElement & { stretch: string; stretchDirection: string }>('[data-vb]')!;
          bindOptions(opt, (n, v) => {
            if (n === 'stretch') vb.stretch = v;
            if (n === 'dir') vb.stretchDirection = v;
            if (n === 'w') vb.style.width = `${v}px`;
            if (n === 'h') vb.style.height = `${v}px`;
          });
        },
      },
    ],
  },
  {
    id: 'box',
    title: 'Box',
    category: 'layout',
    icon: '',
    tags: ['win-box'],
    description:
      'Box 为单个子元素绘制边框、背景和圆角。属性值可以是 CSS 颜色，也可以直接使用 WinUI 资源名（例如 CardBackgroundFillColorDefaultBrush、AccentFillColorDefaultBrush）。',
    samples: [
      {
        title: '可调整边框宽度、颜色和圆角的 Box',
        html: html`<win-box background="CardBackgroundFillColorDefaultBrush" border-color="AccentFillColorDefaultBrush" border-width="2" corner-radius="8" padding="16,12,16,12">
  <span class="w-body-strong">Text inside a border</span>
</win-box>`,
        options: `${range('thickness', 'border-width', 0, 10, 2)}${range('radius', 'corner-radius', 0, 24, 8)}${select(
          'brush',
          'border-color',
          [
            ['AccentFillColorDefaultBrush', 'AccentFillColorDefault'],
            ['ControlStrongStrokeColorDefaultBrush', 'ControlStrongStrokeColorDefault'],
            ['SystemFillColorCriticalBrush', 'SystemFillColorCritical'],
            ['#107c10', '#107c10'],
          ],
          'AccentFillColorDefaultBrush',
        )}${select(
          'bg',
          'Background',
          [
            ['CardBackgroundFillColorDefaultBrush', 'CardBackgroundFillColorDefault'],
            ['SubtleFillColorSecondaryBrush', 'SubtleFillColorSecondary'],
            ['SystemFillColorSuccessBackgroundBrush', 'SystemFillColorSuccessBackground'],
            ['transparent', 'Transparent'],
          ],
          'CardBackgroundFillColorDefaultBrush',
        )}`,
        setup(ex, opt) {
          ensureStyles();
          const b = ex.querySelector('win-box')!;
          bindOptions(opt, (n, v) => {
            if (n === 'thickness') b.borderWidth = v;
            if (n === 'radius') b.cornerRadius = v;
            if (n === 'brush') b.borderColor = v;
            if (n === 'bg') b.background = v;
          });
        },
      },
    ],
  },

  {
    id: 'wrap-panel',
    title: 'WrapPanel',
    category: 'layout',
    icon: '',
    tags: ['win-wrap-panel'],
    description:
      'WrapPanel 按顺序排列子元素，一行放不下时自动换行；可分别设置水平与垂直间距，stretch-child="last" 让最后一项填满剩余空间。WinUI 3 本身没有该面板。',
    samples: [
      {
        title: '自动换行的标签',
        html: html`<win-wrap-panel horizontal-spacing="8" vertical-spacing="8" style="max-width:520px">
  ${[
    'WinUI',
    'Fluent',
    'Mica',
    'Acrylic',
    'XAML',
    'TypeScript',
    'Web Components',
    'Windows App SDK',
    'Accessibility',
    'Motion',
    'Theme',
    'Typography',
  ]
    .map(
      (t, i) =>
        `<span class="lg-tile" style="padding:6px 12px;background:${color(i)};font:var(--w-type-body)">${t}</span>`,
    )
    .join('')}
</win-wrap-panel>`,
        options: `${range('hs', 'HorizontalSpacing', 0, 24, 8)}${range('vs', 'VerticalSpacing', 0, 24, 8)}${check('last', 'StretchChild = Last')}`,
        setup(ex, opt) {
          ensureStyles();
          const w = ex.querySelector('win-wrap-panel')!;
          bindOptions(opt, (n, v) => {
            if (n === 'hs') w.horizontalSpacing = Number(v);
            if (n === 'vs') w.verticalSpacing = Number(v);
            if (n === 'last') w.stretchChild = v === 'true' ? 'last' : 'none';
          });
        },
      },
    ],
  },
  {
    id: 'dock-panel',
    title: 'DockPanel',
    category: 'layout',
    icon: '',
    tags: ['win-dock-panel'],
    description:
      'DockPanel 按子元素顺序依次停靠到剩余空间的上、下、左、右侧（dock 属性），last-child-fill 时最后一个元素填满中间区域。',
    samples: [
      {
        title: '经典的 DockPanel 布局',
        html: html`<win-dock-panel style="width:100%;max-width:560px;height:260px" class="lg-box" horizontal-spacing="4" vertical-spacing="4">
  <div class="lg-tile" dock="top" style="height:40px;background:${color(0)}">dock = top</div>
  <div class="lg-tile" dock="bottom" style="height:32px;background:${color(1)}">dock = bottom</div>
  <div class="lg-tile" dock="left" style="width:96px;background:${color(2)}">left</div>
  <div class="lg-tile" dock="right" style="width:96px;background:${color(3)}">right</div>
  <div class="lg-tile" style="background:${color(4)}">LastChildFill</div>
</win-dock-panel>`,
        options: `${check('fill', 'LastChildFill', true)}`,
        setup(ex, opt) {
          ensureStyles();
          const d = ex.querySelector('win-dock-panel')!;
          bindOptions(opt, (_n, v) => (d.lastChildFill = v === 'true'));
        },
      },
    ],
  },
  {
    id: 'uniform-grid',
    title: 'UniformGrid',
    category: 'layout',
    icon: '',
    tags: ['win-uniform-grid'],
    description:
      'UniformGrid 把所有单元格划分为相同大小；未指定 rows/columns 时自动计算接近正方形的布局，first-column 可让第一项从指定列开始（类似日历的第一周）。',
    samples: [
      {
        title: '自动行列数与 FirstColumn',
        html: html`<win-uniform-grid column-spacing="6" row-spacing="6" style="width:100%;max-width:420px;height:240px">
  ${Array.from({ length: 10 }, (_, i) => `<div class="lg-tile" style="background:${color(i)}">${i + 1}</div>`).join('')}
</win-uniform-grid>`,
        options: `${range('cols', 'Columns（0 = 自动）', 0, 6, 0)}${range('first', 'FirstColumn', 0, 3, 0)}`,
        setup(ex, opt) {
          ensureStyles();
          const g = ex.querySelector('win-uniform-grid')!;
          bindOptions(opt, (n, v) => {
            if (n === 'cols') g.columns = Number(v);
            if (n === 'first') g.firstColumn = Number(v);
          });
        },
      },
    ],
  },
  {
    id: 'constrained-box',
    title: 'ConstrainedBox',
    category: 'layout',
    icon: '',
    tags: ['win-constrained-box'],
    description:
      'ConstrainedBox 为内容施加纵横比（aspect-ratio）、缩放比例（scale-x / scale-y）以及“取整到倍数”（multiple-x / multiple-y）等约束，常用于媒体预览和图片网格。',
    samples: [
      {
        title: '固定 16:9 纵横比的内容',
        html: html`<div style="width:100%;max-width:520px;resize:horizontal;overflow:hidden;min-width:160px" class="lg-box">
  <win-constrained-box aspect-ratio="16:9">
    <div style="background:linear-gradient(135deg, var(--w-system-accent-color-dark1), var(--w-system-accent-color-light2));display:grid;place-items:center;color:#fff" class="w-subtitle">16 : 9</div>
  </win-constrained-box>
</div>`,
        options: `${select(
          'ratio',
          'AspectRatio',
          [
            ['16:9', '16:9'],
            ['4:3', '4:3'],
            ['1:1', '1:1'],
            ['21:9', '21:9'],
          ],
          '16:9',
        )}${range('scale', 'ScaleX', 0.3, 1, 1, 0.05)}${range('mult', 'MultipleX', 0, 64, 0, 8)}`,
        setup(ex, opt) {
          ensureStyles();
          const b = ex.querySelector('win-constrained-box')!;
          bindOptions(opt, (n, v) => {
            if (n === 'ratio') b.aspectRatio = v;
            if (n === 'scale') b.scaleX = Number(v);
            if (n === 'mult') b.multipleX = Number(v);
          });
        },
      },
    ],
  },
  {
    id: 'staggered-panel',
    title: 'StaggeredPanel',
    category: 'layout',
    icon: '',
    tags: ['win-staggered-panel'],
    description:
      'StaggeredPanel 是瀑布流布局：根据 desired-column-width 自动计算列数，每个子元素放入当前最短的一列，适合高度不一的卡片。',
    samples: [
      {
        title: '瀑布流卡片',
        html: html`<win-staggered-panel desired-column-width="140" column-spacing="8" row-spacing="8" style="width:100%;max-width:600px">
  ${Array.from({ length: 14 }, (_, i) => `<div class="lg-tile" style="height:${60 + ((i * 47) % 110)}px;background:${color(i)}">${i + 1}</div>`).join('')}
</win-staggered-panel>`,
        options: `${range('w', 'DesiredColumnWidth', 80, 240, 140, 10)}`,
        setup(ex, opt) {
          ensureStyles();
          const p = ex.querySelector('win-staggered-panel')!;
          bindOptions(opt, (_n, v) => (p.desiredColumnWidth = Number(v)));
        },
      },
    ],
  },
  {
    id: 'sizers',
    title: 'Sizers',
    category: 'layout',
    icon: '',
    tags: ['win-grid-splitter', 'win-content-sizer', 'win-property-sizer'],
    description:
      'Sizers：GridSplitter 调整 Grid 相邻行列的大小（星号列保持比例），ContentSizer 直接调整目标元素的宽高，PropertySizer 拖动改变任意数值属性（如 SplitView 的 openPaneLength）。均支持方向键（每次 8px）。',
    samples: [
      {
        title: 'GridSplitter',
        html: html`<win-grid-panel column-definitions="*,Auto,*" style="width:100%;max-width:560px;height:180px" class="lg-box">
  <div class="lg-tile" style="background:${color(0)};margin:8px">左侧</div>
  <win-grid-splitter grid-column="1" aria-label="调整列宽"></win-grid-splitter>
  <div class="lg-tile" grid-column="2" style="background:${color(2)};margin:8px">右侧</div>
</win-grid-panel>`,
        setup() {
          ensureStyles();
        },
      },
      {
        title: 'ContentSizer（水平与垂直）',
        html: html`<div style="display:flex;height:180px;width:100%;max-width:560px" class="lg-box">
  <div id="cs-target" style="width:180px;min-width:80px;max-width:400px;padding:12px;box-sizing:border-box;background:color-mix(in srgb, var(--w-accent-fill-color-default) 16%, transparent)">可调整宽度的侧栏</div>
  <win-content-sizer target="cs-target" aria-label="调整侧栏宽度"></win-content-sizer>
  <div style="flex:1;display:flex;flex-direction:column;min-width:0">
    <div id="cs-top" style="height:80px;min-height:32px;max-height:150px;padding:12px;box-sizing:border-box">上方区域</div>
    <win-content-sizer target="cs-top" orientation="horizontal" aria-label="调整上方高度"></win-content-sizer>
    <div style="flex:1;padding:12px">下方区域</div>
  </div>
</div>`,
      },
      {
        title: 'PropertySizer 绑定到 SplitView.OpenPaneLength',
        html: html`<div style="display:flex;width:100%;max-width:600px;height:200px;position:relative" class="lg-card">
  <win-split-view id="ps-split" display-mode="inline" pane-open open-pane-length="200" style="flex:1">
    <div slot="pane" style="padding:16px">窗格宽度：<b data-w>200</b>px</div>
    <div style="display:flex;height:100%">
      <win-property-sizer target="ps-split" property="openPaneLength" minimum="120" maximum="360" aria-label="调整窗格宽度"></win-property-sizer>
      <div style="padding:16px">拖动左侧的 Sizer 调整窗格宽度。</div>
    </div>
  </win-split-view>
</div>`,
        setup(ex) {
          const sizer = ex.querySelector('win-property-sizer')!;
          sizer.addEventListener('resize', (e) => {
            const w = ex.querySelector('[data-w]');
            if (w) w.textContent = String(Math.round((e as unknown as CustomEvent).detail.value));
          });
        },
      },
    ],
  },
  {
    id: 'settings-card',
    title: 'SettingsCard',
    category: 'layout',
    icon: '',
    tags: ['win-settings-card'],
    summary: 'Windows 11 设置页使用的卡片式设置项。',
    description: `SettingsCard 是 Windows 11 设置应用中每一行设置的标准外观：左侧图标，标题与说明，右侧放置控件。放入的 ToggleSwitch 自动采用紧凑的右对齐样式（开/关文字在开关左侧，开关紧贴右边缘）；可设为可点击（is-click-enabled）以导航到子页面，此时显示右侧箭头并获得悬停/按下效果；宽度不足时内容会自动换到标题下方。`,
    related: ['settings-expander'],
    samples: [
      {
        title: '带开关的设置卡片',
        description:
          '卡片内的 ToggleSwitch 自动设为 content-placement="left"（RightAlignedCompactToggleSwitchStyle）；显式设置 content-placement 时以作者设置为准。',
        html: html`<div class="col" style="max-width:720px">
  <win-settings-card header="深色模式" description="让应用和系统界面使用深色主题。" header-icon="&#xE793;">
    <win-toggle-switch data-dark></win-toggle-switch>
  </win-settings-card>
  <win-settings-card header="通知" description="接收来自应用和其他发送者的通知。" header-icon="&#xEA8F;">
    <win-toggle-switch checked></win-toggle-switch>
  </win-settings-card>
</div>`,
      },
      {
        title: '右侧控件的对齐',
        description:
          '内容列右对齐并与卡片内边距（16px）对齐；ComboBox、Slider、TextBox 的最小宽度为 120px（SettingsCardContentMinWidth）；标题与内容之间至少保留 24px。',
        html: html`<div class="col" style="max-width:720px">
  <win-settings-card header="启动时自动运行" header-icon="&#xE7E8;">
    <win-toggle-switch checked></win-toggle-switch>
  </win-settings-card>
  <win-settings-card header="应用主题" description="选择要显示的应用主题" header-icon="&#xE790;">
    <win-combo-box selected-index="2">
      <win-combo-box-item>浅色</win-combo-box-item>
      <win-combo-box-item>深色</win-combo-box-item>
      <win-combo-box-item>使用系统设置</win-combo-box-item>
    </win-combo-box>
  </win-settings-card>
  <win-settings-card header="Windows 更新" description="上次检查时间：今天 9:41" header-icon="&#xE895;">
    <win-button>检查更新</win-button>
  </win-settings-card>
  <win-settings-card header="隐私声明" header-icon="&#xE72E;">
    <win-hyperlink-button>了解详细信息</win-hyperlink-button>
  </win-settings-card>
</div>`,
      },
      {
        title: '可点击的卡片与禁用状态',
        html: html`<div class="col" style="max-width:720px">
  <win-settings-card is-click-enabled header="存储" description="存储空间、驱动器、配置规则" header-icon="&#xEDA2;" data-nav></win-settings-card>
  <win-settings-card is-click-enabled header="帮助文档" description="在浏览器中打开" header-icon="&#xE897;" action-icon="&#xE8A7;"></win-settings-card>
  <win-settings-card disabled header="此设置由组织管理" description="某些设置已被管理员隐藏或禁用。" header-icon="&#xE72E;">
    <win-toggle-switch disabled></win-toggle-switch>
  </win-settings-card>
</div>
<div class="output" data-output></div>`,
        setup(ex) {
          ex.querySelector('[data-nav]')?.addEventListener('click', () => out(ex, '导航到：存储'));
        },
      },
      {
        title: '自适应换行（窄宽度）',
        description:
          '卡片宽度小于 476px 时右侧内容移动到标题下方（SettingsCardWrapThreshold），小于 286px 时还会隐藏标题图标（SettingsCardWrapNoIconThreshold）。用右侧选项改变容器宽度。',
        html: html`<div data-wrapbox style="width:600px;max-width:100%;transition:width var(--w-duration-normal) var(--w-ease-point)">
  <win-settings-card header="屏幕分辨率" description="调整分辨率以适应所连接的显示器。" header-icon="&#xE7F4;">
    <win-combo-box style="min-width:200px" selected-index="0">
      <win-combo-box-item>1920 × 1080（推荐）</win-combo-box-item>
      <win-combo-box-item>1600 × 900</win-combo-box-item>
      <win-combo-box-item>1280 × 720</win-combo-box-item>
    </win-combo-box>
  </win-settings-card>
</div>`,
        options: html`<div class="opt-title">容器宽度</div><win-segmented data-opt="w" selected-index="0" stretch><win-segmented-item value="600">600</win-segmented-item><win-segmented-item value="420">420</win-segmented-item><win-segmented-item value="260">260</win-segmented-item></win-segmented>`,
        setup(ex, opt) {
          const box = ex.querySelector<HTMLElement>('[data-wrapbox]')!;
          opt?.querySelector('[data-opt="w"]')?.addEventListener('selectionchanged', (e) => {
            box.style.width = `${(e as CustomEvent).detail.value}px`;
          });
        },
      },
    ],
  },
  {
    id: 'settings-expander',
    title: 'SettingsExpander',
    category: 'layout',
    icon: '',
    tags: ['win-settings-expander', 'win-settings-card'],
    summary: '可展开的设置组，展开后显示一组相关设置。',
    description: `SettingsExpander 将一组相关设置收纳在可展开的卡片下：头部与 SettingsCard 相同（可在 slot="content" 放置开关，右侧内容与子项内容对齐），展开时子项从头部下方滑出（对应 WinUI Expander 的 ExpandDown，333ms 减速曲线），收起时以同一减速曲线在 250ms 内滑回；动画进行中再次点击会从当前位置平滑反向，箭头同步旋转。`,
    related: ['settings-card'],
    samples: [
      {
        title: '包含多个子设置的展开器',
        html: html`<div class="col" style="max-width:760px">
  <win-settings-expander header="蓝牙" description="发现并连接设备" header-icon="&#xE702;" is-expanded>
    <win-toggle-switch slot="content" checked></win-toggle-switch>
    <win-settings-card header="显示设备时使用的通知" ><win-toggle-switch checked></win-toggle-switch></win-settings-card>
    <win-settings-card header="蓝牙设备发现" description="选择“高级”以发现所有类型的设备">
      <win-combo-box selected-index="0" style="min-width:140px"><win-combo-box-item>默认</win-combo-box-item><win-combo-box-item>高级</win-combo-box-item></win-combo-box>
    </win-settings-card>
    <win-settings-card is-click-enabled header="更多蓝牙设置"></win-settings-card>
  </win-settings-expander>
  <win-settings-expander header="电源模式" description="根据电源使用情况和性能优化设备" header-icon="&#xEC48;">
    <win-combo-box slot="content" selected-index="1" style="min-width:160px"><win-combo-box-item>最佳能效</win-combo-box-item><win-combo-box-item>平衡</win-combo-box-item><win-combo-box-item>最佳性能</win-combo-box-item></win-combo-box>
    <win-settings-card header="在电池模式下，屏幕关闭时间"><win-combo-box selected-index="0" style="min-width:140px"><win-combo-box-item>5 分钟</win-combo-box-item><win-combo-box-item>10 分钟</win-combo-box-item></win-combo-box></win-settings-card>
    <win-settings-card header="接通电源时，设备进入睡眠状态的时间"><win-combo-box selected-index="1" style="min-width:140px"><win-combo-box-item>15 分钟</win-combo-box-item><win-combo-box-item>30 分钟</win-combo-box-item></win-combo-box></win-settings-card>
  </win-settings-expander>
</div>
<div class="output" data-output></div>`,
        setup(ex) {
          for (const sx of ex.querySelectorAll('win-settings-expander')) {
            sx.addEventListener('expanded', () => out(ex, `已展开：${sx.getAttribute('header')}`));
            sx.addEventListener('collapsed', () => out(ex, `已折叠：${sx.getAttribute('header')}`));
          }
        },
      },
      {
        title: 'Windows 设置风格页面',
        description: '用 SettingsCard 与 SettingsExpander 组合出“系统 › 显示”页面的结构。',
        html: html`<div class="col" style="max-width:760px;gap:4px">
  <div class="w-body-strong" style="margin:4px 0 6px">亮度和颜色</div>
  <win-settings-card header="亮度" description="调整内置显示器的亮度" header-icon="&#xE706;"><win-slider value="70" style="width:200px"></win-slider></win-settings-card>
  <win-settings-expander header="夜间模式" description="使用更暖的颜色来帮助入睡" header-icon="&#xE708;">
    <win-toggle-switch slot="content"></win-toggle-switch>
    <win-settings-card header="强度"><win-slider value="48" style="width:200px"></win-slider></win-settings-card>
    <win-settings-card header="计划夜间模式"><win-toggle-switch></win-toggle-switch></win-settings-card>
  </win-settings-expander>
  <win-settings-card is-click-enabled header="HDR" description="详细了解 HDR" header-icon="&#xE7F4;"></win-settings-card>
  <div class="w-body-strong" style="margin:14px 0 6px">缩放和布局</div>
  <win-settings-card header="缩放" description="更改文本、应用和其他项的大小" header-icon="&#xE8D2;">
    <win-combo-box selected-index="1" style="min-width:160px"><win-combo-box-item>100%</win-combo-box-item><win-combo-box-item>125%（推荐）</win-combo-box-item><win-combo-box-item>150%</win-combo-box-item></win-combo-box>
  </win-settings-card>
  <win-settings-card header="显示器方向" header-icon="&#xE7F8;">
    <win-combo-box selected-index="0" style="min-width:160px"><win-combo-box-item>横向</win-combo-box-item><win-combo-box-item>纵向</win-combo-box-item></win-combo-box>
  </win-settings-card>
</div>`,
      },
    ],
  },
  {
    id: 'headered-content',
    title: 'HeaderedContent',
    category: 'layout',
    icon: '',
    tags: ['win-headered-content'],
    summary: '为任意内容加上标题，可横向或纵向排列。',
    description: `HeaderedContent 为任意内容配上标题（header 属性或 slot="header"），支持纵向/横向排列与 caption、subtitle 标题样式，适合表单分组与信息块。`,
    samples: [
      {
        title: '纵向与横向',
        html: html`<div class="col" style="gap:20px">
  <win-headered-content header="账户名称">
    <win-text-box placeholder="输入名称" style="width:280px"></win-text-box>
  </win-headered-content>
  <win-headered-content header="自动保存" orientation="horizontal">
    <win-toggle-switch checked></win-toggle-switch>
  </win-headered-content>
  <win-headered-content header-style="subtitle">
    <span slot="header">自定义标题 <span class="w-text-accent">✦</span></span>
    <span class="w-text-secondary">标题可以是任意内容。</span>
  </win-headered-content>
</div>`,
      },
    ],
  },
  {
    id: 'switch-view',
    title: 'SwitchView',
    category: 'layout',
    icon: '',
    tags: ['win-switch-view', 'win-switch-case'],
    summary: '在标记中按值切换要显示的内容（switch/case）。',
    description: `SwitchView 根据 value 显示匹配的 <win-switch-case>，没有匹配时显示 is-default 的分支，相当于在标记里写 switch/case。切换时带有 ContentThemeTransition 风格的上移淡入（增强）。`,
    samples: [
      {
        title: '根据选择切换内容',
        html: html`<win-segmented selected-index="0" data-pick>
  <win-segmented-item value="square">方形</win-segmented-item>
  <win-segmented-item value="circle">圆形</win-segmented-item>
  <win-segmented-item value="triangle">三角形</win-segmented-item>
  <win-segmented-item value="other">其他</win-segmented-item>
</win-segmented>
<win-switch-view value="square" data-sw>
  <win-switch-case value="square"><div style="width:96px;height:96px;border-radius:8px;background:var(--w-accent-fill-color-default)"></div></win-switch-case>
  <win-switch-case value="circle"><div style="width:96px;height:96px;border-radius:50%;background:var(--w-system-fill-color-success)"></div></win-switch-case>
  <win-switch-case value="triangle"><svg width="104" height="96" viewBox="0 0 104 96"><path d="M52 6L98 90H6Z" fill="var(--w-system-fill-color-caution)"/></svg></win-switch-case>
  <win-switch-case is-default><div class="w-text-secondary" style="height:96px;display:grid;place-items:center">默认分支：没有匹配的形状</div></win-switch-case>
</win-switch-view>`,
        setup(ex) {
          const sw = ex.querySelector<HTMLElement & { value: string }>('[data-sw]')!;
          ex.querySelector('[data-pick]')!.addEventListener(
            'selectionchanged',
            (e) => (sw.value = (e as CustomEvent).detail.value),
          );
        },
      },
    ],
  },
];

export default pages;
