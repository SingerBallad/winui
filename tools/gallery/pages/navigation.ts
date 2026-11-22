import { html, type GalleryPage } from './types.ts';

const choice = (name: string, options: [string, string][], current: string) =>
  html`<win-radio-group header="${name}" data-choice>${options
    .map(([v, label]) => `<win-radio-button value="${v}" ${v === current ? 'checked' : ''}>${label}</win-radio-button>`)
    .join('')}</win-radio-group>`;

function wireChoice(root: HTMLElement | null, onPick: (value: string) => void): void {
  if (!root) return;
  const groups = root.matches('[data-choice]')
    ? [root]
    : Array.from(root.querySelectorAll<HTMLElement>('[data-choice]'));
  for (const group of groups) {
    group.addEventListener('selectionchanged', (e) => {
      const v = (e as CustomEvent<{ value?: string }>).detail?.value;
      if (v) onPick(v);
    });
  }
}

const out = (root: HTMLElement, text: string) => {
  const o = root.querySelector('[data-output]');
  if (o) o.textContent = text;
};

const NAV_ITEMS = html`
    <win-navigation-view-item icon="Home" tag="home" selected>主页</win-navigation-view-item>
    <win-navigation-view-item icon="AllApps" tag="apps">应用</win-navigation-view-item>
    <win-navigation-view-item icon="Play" tag="games">游戏</win-navigation-view-item>
    <win-navigation-view-item icon="Audio" tag="music" info-badge="3">音乐</win-navigation-view-item>
    <win-navigation-view-item-header>媒体库</win-navigation-view-item-header>
    <win-navigation-view-item icon="Library" tag="library">收藏</win-navigation-view-item>
    <win-navigation-view-item icon="Download" tag="downloads">下载</win-navigation-view-item>
    <win-navigation-view-item-separator></win-navigation-view-item-separator>
    <win-navigation-view-item icon="Help" tag="help" slot="footer">帮助</win-navigation-view-item>`;

const frame = (inner: string, h = 460) =>
  `<div class="w-mica" data-stretch style="height:${h}px;border:1px solid var(--w-card-stroke-color-default);border-radius:8px;overflow:hidden">${inner}</div>`;

const pageBody = (title: string) =>
  `<div style="padding:16px 24px" data-page><div class="w-subtitle" data-title>${title}</div><p class="w-text-secondary" style="margin:8px 0 0">选择导航项以切换内容。</p></div>`;

const pages: GalleryPage[] = [
  {
    id: 'navigation-view',
    title: 'NavigationView',
    category: 'navigation',
    icon: '\uE700',
    badge: 'updated',
    tags: [
      'win-navigation-view',
      'win-navigation-view-item',
      'win-navigation-view-item-header',
      'win-navigation-view-item-separator',
    ],
    description:
      'NavigationView 为应用提供顶层导航：左侧窗格（展开 / 紧凑 / 最小）或顶部菜单栏，并按窗口宽度自动切换（< 641 最小、< 1008 紧凑）。支持分层菜单、页脚项、设置项、返回按钮、标题与搜索框；选中指示条在项目之间以 WinUI 原版的“拉伸—收缩”动画移动。',
    docs: [
      { label: 'NavigationView 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/navigationview' },
    ],
    related: ['breadcrumb-bar', 'tab-view', 'selector-bar', 'title-bar'],
    samples: [
      {
        title: '默认 PaneDisplayMode 的 NavigationView',
        description: '在选项中切换窗格模式；Auto 模式会随宽度自动在 Expanded、Compact、Minimal 之间切换。',
        html: frame(html`<win-navigation-view pane-title="媒体中心" header="主页" is-back-button-visible="collapsed">${NAV_ITEMS}
    ${pageBody('主页')}
  </win-navigation-view>`),
        options: html`${choice(
          'PaneDisplayMode',
          [
            ['auto', 'Auto'],
            ['left', 'Left'],
            ['left-compact', 'LeftCompact'],
            ['left-minimal', 'LeftMinimal'],
            ['top', 'Top'],
          ],
          'auto',
        )}
<win-check-box data-opt="back">显示返回按钮</win-check-box>
<win-check-box data-opt="settings" checked>显示设置项</win-check-box>
<win-check-box data-opt="header" checked>显示标题</win-check-box>
<div class="output" data-output>已选择：主页</div>`,
        setup(ex, opt) {
          const nv = ex.querySelector('win-navigation-view')!;
          nv.addEventListener('selectionchanged', (e) => {
            const d = (e as CustomEvent).detail;
            const label = d.isSettingsSelected ? '设置' : (d.selectedItem?.textContent ?? '').trim();
            ex.querySelector('[data-title]')!.textContent = label;
            if (nv.header) nv.header = label;
            if (opt) out(opt, `已选择：${label}`);
          });
          wireChoice(opt, (v) => nv.setAttribute('pane-display-mode', v));
          opt?.querySelector('[data-opt="back"]')?.addEventListener('change', (e) => {
            nv.isBackButtonVisible = (e.target as HTMLInputElement).checked ? 'visible' : 'collapsed';
          });
          opt?.querySelector('[data-opt="settings"]')?.addEventListener('change', (e) => {
            nv.isSettingsVisible = (e.target as HTMLInputElement).checked;
          });
          opt?.querySelector('[data-opt="header"]')?.addEventListener('change', (e) => {
            nv.header = (e.target as HTMLInputElement).checked ? (nv.selectedItem?.textContent ?? '主页').trim() : '';
          });
        },
      },
      {
        title: '顶部导航（PaneDisplayMode="Top"）与“更多”溢出菜单',
        description: '宽度不足时，放不下的项目会移入“更多”浮出菜单；选中项始终保持可见。',
        html: frame(
          html`<win-navigation-view pane-display-mode="top" is-back-button-visible="collapsed" style="width:100%">${NAV_ITEMS}
    ${pageBody('主页')}
  </win-navigation-view>`,
          300,
        ),
        setup(ex) {
          const nv = ex.querySelector('win-navigation-view')!;
          nv.addEventListener('selectionchanged', (e) => {
            const d = (e as CustomEvent).detail;
            ex.querySelector('[data-title]')!.textContent = d.isSettingsSelected
              ? '设置'
              : (d.selectedItem?.textContent ?? '').trim();
          });
        },
      },
      {
        title: '分层 NavigationView',
        description:
          '父项内联展开（窗格打开时）或以浮出菜单展开（紧凑窄条 / 顶部模式）；折叠时选中的子项会把指示条显示在父项上。',
        html: frame(html`<win-navigation-view pane-display-mode="left" is-back-button-visible="collapsed">
    <win-navigation-view-item icon="Mail" tag="mail" selects-on-invoked="false" expanded>邮件
      <win-navigation-view-item icon="Mail" tag="inbox" selected>收件箱</win-navigation-view-item>
      <win-navigation-view-item icon="Send" tag="sent">已发送</win-navigation-view-item>
      <win-navigation-view-item icon="Delete" tag="trash">已删除</win-navigation-view-item>
    </win-navigation-view-item>
    <win-navigation-view-item icon="Calendar" tag="cal">日历
      <win-navigation-view-item tag="day" icon="CalendarDay">日</win-navigation-view-item>
      <win-navigation-view-item tag="week" icon="CalendarWeek">周
        <win-navigation-view-item tag="workweek">工作周</win-navigation-view-item>
      </win-navigation-view-item>
    </win-navigation-view-item>
    <win-navigation-view-item icon="People" tag="people">联系人</win-navigation-view-item>
    ${pageBody('收件箱')}
  </win-navigation-view>`),
        options: choice(
          'PaneDisplayMode',
          [
            ['left', 'Left'],
            ['left-compact', 'LeftCompact'],
            ['top', 'Top'],
          ],
          'left',
        ),
        setup(ex, opt) {
          const nv = ex.querySelector('win-navigation-view')!;
          nv.addEventListener('selectionchanged', (e) => {
            const d = (e as CustomEvent).detail;
            const it = d.selectedItem as HTMLElement | null;
            ex.querySelector('[data-title]')!.textContent = d.isSettingsSelected
              ? '设置'
              : (it?.childNodes[0]?.textContent ?? '').trim();
          });
          wireChoice(opt, (v) => nv.setAttribute('pane-display-mode', v));
        },
      },
      {
        title: '导航到页面（选择变化时播放页面转场）',
        description:
          'selectionchanged 中替换内容，并用 navigateIn() 播放 EntranceNavigationTransitionInfo 风格的入场动画。',
        html: frame(html`<win-navigation-view pane-display-mode="left-compact" pane-title="设置" is-back-button-visible="visible">
    <win-navigation-view-item icon="Contact" tag="account" selected>账户</win-navigation-view-item>
    <win-navigation-view-item icon="World" tag="time">时间和语言</win-navigation-view-item>
    <win-navigation-view-item icon="Repair" tag="update">Windows 更新</win-navigation-view-item>
    <win-auto-suggest-box slot="auto-suggest-box" placeholder="查找设置"></win-auto-suggest-box>
    <div style="padding:24px 32px" data-frame></div>
  </win-navigation-view>`),
        js: `nv.addEventListener('selectionchanged', (e) => {
  frame.innerHTML = render(e.detail.selectedItem);
  navigateIn(frame.firstElementChild, 'entrance');
});`,
        setup(ex) {
          const nv = ex.querySelector('win-navigation-view')!;
          const frameEl = ex.querySelector<HTMLElement>('[data-frame]')!;
          const history: string[] = [];
          const show = (tag: string, push = true) => {
            const titles: Record<string, string> = {
              account: '账户',
              time: '时间和语言',
              update: 'Windows 更新',
              settings: '设置',
            };
            frameEl.innerHTML = `<div><div class="w-title">${titles[tag] ?? tag}</div><p class="w-text-secondary">这里是“${titles[tag] ?? tag}”页面的内容。</p></div>`;
            void import('../../../index.ts').then((m) => m.navigateIn(frameEl.firstElementChild!, 'entrance'));
            if (push) history.push(tag);
            nv.isBackEnabled = history.length > 1;
          };
          show('account');
          nv.addEventListener('selectionchanged', (e) => {
            const d = (e as CustomEvent).detail;
            show(d.isSettingsSelected ? 'settings' : (d.selectedItem?.getAttribute('tag') ?? ''));
          });
          nv.addEventListener('backrequested', () => {
            history.pop();
            const prev = history[history.length - 1];
            if (!prev) return;
            const item = nv.allItems().find((i) => i.tag === prev);
            if (item) nv.select(item, true, true);
            show(prev, false);
          });
          const asb = ex.querySelector<HTMLElement & { items: unknown[] }>('win-auto-suggest-box');
          const labels = () =>
            nv
              .allItems()
              .filter((i) => i !== nv.settingsItem)
              .map((i) => (i.textContent ?? '').trim());
          asb?.addEventListener('textchanged', (e) => {
            const d = (e as CustomEvent<{ text: string; reason: string }>).detail;
            if (d.reason !== 'user-input') return;
            const q = d.text.trim().toLowerCase();
            asb.items = q ? labels().filter((l) => l.toLowerCase().includes(q)) : [];
          });
          asb?.addEventListener('querysubmitted', (e) => {
            const d = (e as CustomEvent<{ queryText: string; chosenSuggestion: unknown }>).detail;
            const q = String(d.chosenSuggestion ?? d.queryText)
              .trim()
              .toLowerCase();
            const hit = nv.allItems().find((i) => (i.textContent ?? '').trim().toLowerCase().includes(q));
            if (hit) nv.select(hit, true);
          });
        },
      },
    ],
  },
  {
    id: 'breadcrumb-bar',
    title: 'BreadcrumbBar',
    category: 'navigation',
    icon: '\uE76C',
    tags: ['win-breadcrumb-bar', 'win-breadcrumb-bar-item'],
    description:
      'BreadcrumbBar 显示到当前位置的路径，单击任一级可返回。最后一项表示当前位置；空间不足时，靠前的项目会折叠到行首的省略号（…）下拉菜单中。路径变化带有动画（增强）：新的级别从末端滑入，返回上级时其后的级别向末端滑出并淡出；级别折叠进或展开出省略号时，其余级别平滑移动到新位置。',
    docs: [
      { label: 'BreadcrumbBar 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/breadcrumbbar' },
    ],
    related: ['navigation-view'],
    samples: [
      {
        title: '单击某一级时截断路径',
        html: html`<win-breadcrumb-bar data-stretch></win-breadcrumb-bar>
<win-button data-reset>重置示例</win-button>
<div class="output" data-output></div>`,
        js: `bar.itemsSource = ['Home', 'Documents', 'Design', 'Northwind', 'Images', 'Folder1', 'Folder2', 'Folder3'];
bar.addEventListener('itemclicked', (e) => {
  const items = bar.items;
  items.slice(e.detail.index + 1).forEach((i) => i.remove());
});`,
        setup(ex) {
          const bar = ex.querySelector('win-breadcrumb-bar')!;
          const reset = () =>
            (bar.itemsSource = ['Home', 'Documents', 'Design', 'Northwind', 'Images', 'Folder1', 'Folder2', 'Folder3']);
          reset();
          bar.addEventListener('itemclicked', (e) => {
            const { index } = (e as CustomEvent).detail;
            for (const i of bar.items.slice(index + 1)) i.remove();
            out(ex, `单击了第 ${index + 1} 级`);
          });
          ex.querySelector('[data-reset]')!.addEventListener('click', reset);
        },
      },
      {
        title: '宽度不足时折叠为省略号',
        description: '拖动滑块改变可用宽度；省略号下拉菜单列出被折叠的级别。',
        html: html`<div data-stretch><win-breadcrumb-bar style="width:300px">
  <win-breadcrumb-bar-item>此电脑</win-breadcrumb-bar-item>
  <win-breadcrumb-bar-item>本地磁盘 (C:)</win-breadcrumb-bar-item>
  <win-breadcrumb-bar-item>用户</win-breadcrumb-bar-item>
  <win-breadcrumb-bar-item>公用</win-breadcrumb-bar-item>
  <win-breadcrumb-bar-item>文档</win-breadcrumb-bar-item>
  <win-breadcrumb-bar-item>项目</win-breadcrumb-bar-item>
</win-breadcrumb-bar></div>
<win-slider min="160" max="640" value="300" step="10" data-w header="可用宽度" style="width:280px"></win-slider>`,
        setup(ex) {
          const bar = ex.querySelector<HTMLElement>('win-breadcrumb-bar')!;
          const slider = ex.querySelector<HTMLElement & { value: number }>('[data-w]')!;
          const apply = () => (bar.style.width = `${slider.value}px`);
          slider.addEventListener('input', apply);
          slider.addEventListener('change', apply);
        },
      },
      {
        title: '自定义字体大小',
        html: html`<win-breadcrumb-bar style="font:var(--w-type-title)">
  <win-breadcrumb-bar-item>设置</win-breadcrumb-bar-item>
  <win-breadcrumb-bar-item>系统</win-breadcrumb-bar-item>
  <win-breadcrumb-bar-item>显示</win-breadcrumb-bar-item>
</win-breadcrumb-bar>`,
      },
    ],
  },
  {
    id: 'pivot',
    title: 'Pivot',
    category: 'navigation',
    icon: '\uE8A9',
    tags: ['win-pivot', 'win-pivot-item'],
    description:
      'Pivot 通过大号标题切换一组相关内容。支持方向键、触控滑动切换，内容沿切换方向滑入；选中下划线在标题之间移动（增强）。',
    related: ['selector-bar', 'tab-view'],
    samples: [
      {
        title: '基本 Pivot',
        html: html`<win-pivot pivot-title="EMAIL" data-stretch style="height:200px">
  <win-pivot-item header="All">所有邮件都在这里。</win-pivot-item>
  <win-pivot-item header="Unread">未读邮件在这里。</win-pivot-item>
  <win-pivot-item header="Flagged">已标记的邮件在这里。</win-pivot-item>
  <win-pivot-item header="Urgent">紧急邮件在这里。</win-pivot-item>
</win-pivot>`,
        options: html`<win-check-box data-opt="lock">锁定（IsLocked）</win-check-box><div class="output" data-output></div>`,
        setup(ex, opt) {
          const pv = ex.querySelector('win-pivot')!;
          pv.addEventListener(
            'selectionchanged',
            (e) => opt && out(opt, `SelectedIndex = ${(e as CustomEvent).detail.selectedIndex}`),
          );
          opt?.querySelector('[data-opt="lock"]')?.addEventListener('change', (e) => {
            pv.isLocked = (e.target as HTMLInputElement).checked;
          });
        },
      },
      {
        title: '标题溢出时可滚动',
        description:
          '标题过多时可横向滚动，还有更多标题的一端会渐隐；悬停时该端出现与 TabView 滚动按钮一致的 Fluent 翻页按钮。',
        html: html`<win-pivot style="width:420px;height:140px">
  ${['照片', '视频', '音乐', '文档', '下载', '收藏夹', '最近使用']
    .map((h) => `<win-pivot-item header="${h}">“${h}”中的内容。</win-pivot-item>`)
    .join('\n  ')}
</win-pivot>`,
      },
    ],
  },
  {
    id: 'selector-bar',
    title: 'SelectorBar',
    category: 'navigation',
    icon: '\uE8EF',
    badge: 'new',
    tags: ['win-selector-bar', 'win-selector-bar-item'],
    description:
      'SelectorBar（WinUI 1.5）用于在少量视图之间切换。选中项下方的强调色药丸会从 4px 伸展到 16px 并淡入（167ms，与 ComboBox 选中指示动画相同）。',
    related: ['pivot', 'navigation-view'],
    samples: [
      {
        title: '在视图之间切换',
        html: html`<win-selector-bar>
  <win-selector-bar-item text="最近" icon="Clock" selected></win-selector-bar-item>
  <win-selector-bar-item text="共享" icon="Share"></win-selector-bar-item>
  <win-selector-bar-item text="收藏" icon="Favorite"></win-selector-bar-item>
</win-selector-bar>
<div data-stretch data-view style="height:120px;border-radius:8px;border:1px solid var(--w-card-stroke-color-default);background:var(--w-card-background-fill-color-default);display:grid;place-items:center;overflow:hidden"></div>`,
        setup(ex) {
          const bar = ex.querySelector('win-selector-bar')!;
          const view = ex.querySelector<HTMLElement>('[data-view]')!;
          let last = 0;
          const colors = [
            'var(--w-system-accent-color-light2)',
            'var(--w-system-fill-color-success)',
            'var(--w-system-fill-color-caution)',
          ];
          const show = (i: number) => {
            const label = bar.items[i]?.text ?? '';
            view.innerHTML = `<div style="display:flex;gap:12px;align-items:center"><span style="width:48px;height:48px;border-radius:8px;background:${colors[i]}"></span><span class="w-subtitle">${label}</span></div>`;
            void import('../../../index.ts').then((m) =>
              m.slideIn(view.firstElementChild!, i >= last ? 'right' : 'left', 40, 333),
            );
            last = i;
          };
          show(0);
          bar.addEventListener('selectionchanged', (e) => show((e as CustomEvent).detail.selectedIndex));
        },
      },
      {
        title: '仅文本',
        html: html`<win-selector-bar>
  <win-selector-bar-item text="日" selected></win-selector-bar-item>
  <win-selector-bar-item text="周"></win-selector-bar-item>
  <win-selector-bar-item text="月"></win-selector-bar-item>
  <win-selector-bar-item text="年" disabled></win-selector-bar-item>
</win-selector-bar>`,
      },
    ],
  },
  {
    id: 'tab-view',
    title: 'TabView',
    category: 'navigation',
    icon: '\uE7C4',
    tags: ['win-tab-view', 'win-tab-view-item'],
    description:
      'TabView 显示一组标签页及其内容：选中的标签以上圆角和底部外翻弧线与内容区融为一体；支持关闭按钮、添加按钮、三种宽度模式、溢出滚动、拖动重新排序（FLIP 动画）以及 Ctrl+Tab / Ctrl+W 等快捷键。',
    docs: [{ label: 'TabView 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/tab-view' }],
    related: ['navigation-view', 'pivot'],
    samples: [
      {
        title: '可关闭的标签页与添加按钮',
        description: '单击 + 添加文档；拖动标签可重新排序；中键单击或 Ctrl+W 关闭。',
        html: html`<win-tab-view data-stretch style="height:220px">
  <win-tab-view-item header="Document 0" icon="Document" selected><div style="padding:16px">Document 0 的内容</div></win-tab-view-item>
  <win-tab-view-item header="Document 1" icon="Document"><div style="padding:16px">Document 1 的内容</div></win-tab-view-item>
  <win-tab-view-item header="Document 2" icon="Document"><div style="padding:16px">Document 2 的内容</div></win-tab-view-item>
</win-tab-view>
<div class="output" data-output></div>`,
        js: `tabView.addEventListener('addtabbuttonclick', () => {
  tabView.addTab(\`Document \${n++}\`, content, { icon: 'Document' });
});
// tabcloserequested 默认会移除标签；调用 e.preventDefault() 可阻止。`,
        setup(ex) {
          const tv = ex.querySelector('win-tab-view')!;
          let n = 3;
          tv.addEventListener('addtabbuttonclick', () => {
            const content = document.createElement('div');
            content.style.padding = '16px';
            content.textContent = `Document ${n} 的内容`;
            tv.addTab(`Document ${n++}`, content, { icon: 'Document' });
          });
          tv.addEventListener('tabcloserequested', (e) => out(ex, `关闭了：${(e as CustomEvent).detail.tab.header}`));
          tv.addEventListener('tabitemschanged', (e) => {
            const d = (e as CustomEvent).detail;
            out(ex, `“${d.item.header}” 从 ${d.oldIndex} 移到 ${d.newIndex}`);
          });
        },
      },
      {
        title: '标签宽度与关闭按钮模式',
        html: html`<win-tab-view data-stretch style="height:160px">
  <win-tab-view-item header="首页" icon="Home" selected><div style="padding:16px">首页内容</div></win-tab-view-item>
  <win-tab-view-item header="一个标题比较长的标签页" icon="Document"><div style="padding:16px">长标题标签</div></win-tab-view-item>
  <win-tab-view-item header="设置" icon="Setting" is-closable="false"><div style="padding:16px">此标签不可关闭</div></win-tab-view-item>
</win-tab-view>`,
        options: html`${choice(
          'TabWidthMode',
          [
            ['equal', 'Equal'],
            ['size-to-content', 'SizeToContent'],
            ['compact', 'Compact'],
          ],
          'equal',
        )}
${choice(
  'CloseButtonOverlayMode',
  [
    ['auto', 'Auto'],
    ['on-pointer-over', 'OnPointerOver'],
    ['always', 'Always'],
  ],
  'auto',
)}`,
        setup(ex, opt) {
          const tv = ex.querySelector('win-tab-view')!;
          const groups = Array.from(opt?.querySelectorAll<HTMLElement>('[data-choice]') ?? []);
          wireChoice(groups[0] ?? null, (v) => tv.setAttribute('tab-width-mode', v));
          wireChoice(groups[1] ?? null, (v) => tv.setAttribute('close-button-overlay-mode', v));
        },
      },
      {
        title: '标签条页眉与页脚',
        description: 'TabStripHeader / TabStripFooter 与标签位于同一行，内容与标签文字垂直居中对齐。',
        html: html`<win-tab-view data-stretch style="height:150px" is-add-tab-button-visible="false">
  <span slot="tab-strip-header" style="padding:0 12px;font:var(--w-type-body-strong)">终端</span>
  <win-tab-view-item header="PowerShell" selected><pre style="margin:0;padding:12px 16px;font:13px/19px var(--w-font-family-mono)">PS C:\\&gt; _</pre></win-tab-view-item>
  <win-tab-view-item header="命令提示符"><pre style="margin:0;padding:12px 16px;font:13px/19px var(--w-font-family-mono)">C:\\&gt; _</pre></win-tab-view-item>
  <win-button slot="tab-strip-footer" appearance="subtle" icon="Setting" aria-label="设置" style="margin-inline-end:8px"></win-button>
</win-tab-view>`,
      },
    ],
  },
  {
    id: 'title-bar',
    title: 'TitleBar',
    category: 'system',
    icon: '\uE737',
    badge: 'new',
    tags: ['win-title-bar', 'win-window-frame'],
    description:
      'TitleBar（WinUI 1.7）为应用提供自定义标题栏：返回与导航按钮、图标、标题与副标题、居中内容（如搜索框）以及右侧页眉；有按钮或内容时高 48px，否则为 32px 紧凑高度。窗口失去焦点时标题变暗。win-window-frame 提供带 Mica 背景、圆角、窗口阴影与标题按钮的桌面窗口框架。',
    related: ['navigation-view'],
    samples: [
      {
        title: '带导航按钮与搜索框的 TitleBar',
        html: html`<win-window-frame data-stretch window-title="WinUI Gallery" style="height:220px">
  <win-title-bar slot="title-bar" bar-title="WinUI Gallery" subtitle="Preview" icon="Home"
                 is-back-button-visible is-pane-toggle-button-visible>
    <win-auto-suggest-box placeholder="搜索" aria-label="搜索" style="width:min(360px,40vw)"></win-auto-suggest-box>
    <win-button slot="right-header" appearance="subtle" icon="Contact" aria-label="账户"></win-button>
  </win-title-bar>
  <div style="padding:16px 20px">单击窗口外部可看到标题栏的失活样式；标题按钮支持最小化、最大化与关闭。</div>
</win-window-frame>
<div class="output" data-output></div>`,
        setup(ex) {
          const tb = ex.querySelector('win-title-bar')!;
          tb.addEventListener('backrequested', () => out(ex, 'BackRequested'));
          tb.addEventListener('panetogglerequested', () => out(ex, 'PaneToggleRequested'));
          const win = ex.querySelector('win-window-frame')!;
          win.addEventListener('closed', () => {
            out(ex, '窗口已关闭，2 秒后重新显示');
            setTimeout(() => win.show(), 2000);
          });
        },
      },
      {
        title: '紧凑 TitleBar 与窗口材质',
        description:
          '窗口的 material 等价于 Window.SystemBackdrop：Mica / Mica Alt / 桌面亚克力从壁纸取色，窗口失活时以 250ms 线性过渡回退为纯色（点击窗口外部即可看到）。',
        html: html`<win-window-frame data-stretch style="height:180px" window-title="记事本" icon="Document" material="mica">
  <div style="padding:16px 20px">选择右侧的窗口材质，再点击窗口外部使其失活。</div>
</win-window-frame>`,
        options: choice(
          '窗口材质',
          [
            ['mica', 'Mica'],
            ['mica-alt', 'Mica Alt'],
            ['desktop-acrylic', '桌面亚克力'],
            ['desktop-acrylic-thin', '桌面亚克力（Thin）'],
            ['acrylic', '应用内亚克力'],
            ['solid', '纯色'],
          ],
          'mica',
        ),
        setup(ex, opt) {
          const win = ex.querySelector('win-window-frame')!;
          wireChoice(opt, (v) => win.setAttribute('material', v));
        },
      },
    ],
  },
  {
    id: 'pager',
    title: 'Pager',
    category: 'navigation',
    icon: '\uE8E1',
    tags: ['win-pager'],
    description:
      'Pager 在分页内容之间导航：首页 / 上一页 / 下一页 / 末页按钮，配合下拉框、数字框或页码按钮面板（当前页下方的强调色指示条会滑动到新位置）。按下按钮时图标与页码会轻微收缩并回弹；页码范围移动时，页码平滑滑到新位置，移出 / 移入范围的页码沿翻页方向淡出 / 淡入（增强）。',
    related: ['pips-pager', 'flip-view'],
    samples: [
      {
        title: '三种显示模式',
        html: html`<div class="col">
  <win-pager number-of-pages="5" display-mode="combo-box"></win-pager>
  <win-pager number-of-pages="100" display-mode="number-box"></win-pager>
  <win-pager number-of-pages="20" display-mode="button-panel" selected-page-index="9"></win-pager>
</div>
<div class="output" data-output></div>`,
        setup(ex) {
          for (const p of ex.querySelectorAll('win-pager')) {
            p.addEventListener('selectedindexchanged', (e) =>
              out(ex, `第 ${(e as CustomEvent).detail.newPageIndex + 1} 页`),
            );
          }
        },
      },
      {
        title: '按钮可见性',
        html: html`<win-pager number-of-pages="10" display-mode="button-panel"
  first-button-visibility="collapsed" last-button-visibility="collapsed"
  previous-button-visibility="hidden-on-edge" next-button-visibility="hidden-on-edge"></win-pager>`,
      },
    ],
  },
];

export default pages;
