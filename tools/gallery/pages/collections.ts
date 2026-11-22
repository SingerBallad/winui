import { html, type GalleryPage } from './types.ts';
import { FAMILY, GIVEN, rng, people } from './data.ts';
import type { DataGridColumn, WinDataGrid } from '../../../components/collections/data-grid.ts';
import { animate, durations, easings, itemRemoved, settled } from '../../../motion/animate.ts';

const PEOPLE = [
  ['Kendall Collins', 'Adventure Works'],
  ['Henry Ross', 'Fabrikam'],
  ['Vance DeLeon', 'Contoso'],
  ['Victoria Burke', 'Tailspin Toys'],
  ['Amber Rodriguez', 'Northwind Traders'],
  ['Amari Rivera', 'Wingtip Toys'],
  ['Jessie Irwin', 'Litware'],
  ['Quinn Campbell', 'Proseware'],
  ['Olivia Chen', 'Woodgrove Bank'],
  ['Mateo Garcia', 'Blue Yonder'],
  ['Sofia Novak', 'Coho Winery'],
  ['Liam Becker', 'Lucerne Publishing'],
] as const;

const PALETTE = [
  '#0078d4',
  '#8764b8',
  '#e3008c',
  '#ca5010',
  '#498205',
  '#038387',
  '#c239b3',
  '#567c73',
  '#ff8c00',
  '#0099bc',
  '#7a7574',
  '#e81123',
];
const hue = (i: number) => PALETTE[i % PALETTE.length]!;
const initials = (n: string) =>
  n
    .split(' ')
    .map((s) => s[0])
    .join('')
    .slice(0, 2);

const avatar = (name: string, i: number, size = 32) =>
  `<span aria-hidden="true" style="flex:none;width:${size}px;height:${size}px;border-radius:50%;display:inline-grid;place-items:center;background:${hue(i)};color:#fff;font:600 ${Math.round(size * 0.38)}px/1 var(--w-font-family-text)">${initials(name)}</span>`;

const contact = (name: string, company: string, i: number) =>
  `<div style="display:flex;align-items:center;gap:12px;padding:6px 0">${avatar(name, i)}<div style="min-width:0"><div data-name>${name}</div><div class="w-caption w-text-secondary">${company}</div></div></div>`;

const photo = (i: number, w: number, h: number, label = '') => {
  const a = hue(i);
  const b = hue(i + 3);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" style="display:block;width:100%;height:100%" preserveAspectRatio="xMidYMid slice" aria-hidden="true"><defs><linearGradient id="g${i}-${w}" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="${a}"/><stop offset="1" stop-color="${b}"/></linearGradient></defs><rect width="${w}" height="${h}" fill="url(#g${i}-${w})"/><circle cx="${w * 0.72}" cy="${h * 0.3}" r="${Math.min(w, h) * 0.12}" fill="#ffffff" opacity="0.55"/><path d="M0 ${h} L${w * 0.35} ${h * 0.55} L${w * 0.6} ${h * 0.8} L${w * 0.8} ${h * 0.6} L${w} ${h * 0.85} V${h} Z" fill="#000" opacity="0.25"/>${label ? `<text x="10" y="${h - 10}" fill="#fff" font-family="Segoe UI Variable Text, Segoe UI, sans-serif" font-size="13" font-weight="600">${label}</text>` : ''}</svg>`;
};

const out = (ex: HTMLElement, text: string) => {
  const o = ex.querySelector('[data-output]');
  if (o) o.textContent = text;
};

type Selectable = HTMLElement & { selectionMode: string; selectedIndices: number[] };

const MODES = [
  ['none', 'None'],
  ['single', 'Single'],
  ['multiple', 'Multiple'],
  ['extended', 'Extended'],
] as const;

const modeOptions = (
  current: string,
) => html`<win-radio-group header="SelectionMode" data-modes selected-index="${MODES.findIndex(([v]) => v === current)}">
  ${MODES.map(([v, l]) => `<win-radio-button value="${v}">${l}</win-radio-button>`).join('\n  ')}
</win-radio-group>`;

function wireModes(opt: HTMLElement | null, target: Selectable): void {
  opt?.querySelector('[data-modes]')?.addEventListener('selectionchanged', (e) => {
    const v = (e as CustomEvent<{ value?: string }>).detail?.value;
    if (v) target.selectionMode = v;
  });
}

const describeSel = (list: Selectable) => {
  const idx = list.selectedIndices;
  return idx.length ? `已选择索引：${idx.join(', ')}` : '未选择任何项';
};

const pages: GalleryPage[] = [
  {
    id: 'list-view',
    title: 'ListView',
    category: 'collections',
    icon: '\uE8FD',
    tags: ['win-list-view', 'win-list-view-item', 'win-list-view-header'],
    description:
      'ListView 以垂直列表显示项目集合，支持 None / Single / Multiple / Extended 四种选择模式、项单击（item-click-enabled）、键盘导航、粘性分组标题、拖动重新排序，以及通过 items + renderItem 的数据驱动模式（大数据量自动虚拟化）。选中项使用 Windows 11 的圆角背板与 3×16 强调色指示条。',
    docs: [
      {
        label: 'ListView 与 GridView',
        href: 'https://learn.microsoft.com/windows/apps/design/controls/listview-and-gridview',
      },
    ],
    related: ['grid-view', 'list-box', 'items-view', 'tree-view'],
    samples: [
      {
        title: '带简单数据模板的基本 ListView',
        html: html`<win-list-view style="width:340px;height:300px" aria-label="联系人">
  ${PEOPLE.slice(0, 8)
    .map(([n, c], i) => `<win-list-view-item${i === 1 ? ' selected' : ''}>${contact(n, c, i)}</win-list-view-item>`)
    .join('\n  ')}
</win-list-view>
<div class="output" data-output></div>`,
        setup(ex) {
          const lv = ex.querySelector('win-list-view')!;
          const show = () => {
            const el = lv.selectedItem as HTMLElement | null;
            out(ex, el ? `已选择：${el.querySelector('[data-name]')?.textContent ?? ''}` : '未选择');
          };
          lv.addEventListener('selectionchanged', show);
          show();
        },
      },
      {
        title: '选择模式与项单击',
        description:
          '在右侧切换 SelectionMode。Multiple 模式显示内联复选框；Extended 模式支持 Ctrl / Shift 单击与 Shift+方向键扩展选择，Ctrl+A 全选。',
        html: html`<win-list-view selection-mode="multiple" style="width:300px" aria-label="选择模式示例">
  <win-list-view-item>Item 1</win-list-view-item>
  <win-list-view-item selected>Item 2</win-list-view-item>
  <win-list-view-item>Item 3</win-list-view-item>
  <win-list-view-item disabled>Item 4 (disabled)</win-list-view-item>
  <win-list-view-item selected>Item 5</win-list-view-item>
</win-list-view>
<div class="output" data-output></div>`,
        options:
          modeOptions('multiple') +
          html`
<win-check-box data-click>item-click-enabled</win-check-box>`,
        setup(ex, opt) {
          const lv = ex.querySelector('win-list-view')!;
          wireModes(opt, lv);
          lv.addEventListener('selectionchanged', (e) => {
            const d = (e as CustomEvent<{ addedIndices: number[]; removedIndices: number[] }>).detail;
            out(
              ex,
              `${describeSel(lv)}（新增 ${d.addedIndices.join(',') || '-'}，移除 ${d.removedIndices.join(',') || '-'}）`,
            );
          });
          lv.addEventListener('itemclick', (e) => {
            const d = (e as CustomEvent<{ index: number }>).detail;
            out(ex, `itemclick：索引 ${d.index}`);
          });
          const t = opt?.querySelector<HTMLElement & { checked: boolean }>('[data-click]');
          t?.addEventListener('change', () => (lv.itemClickEnabled = t.checked));
          out(ex, describeSel(lv));
        },
      },
      {
        title: '分组的 ListView（粘性组标题）',
        description:
          '使用 <win-list-view-header> 作为组标题（ListViewHeaderItem 样式：20px、底部分隔线），滚动时标题吸顶。',
        html: html`<win-list-view data-grouped style="width:340px;height:320px" aria-label="分组联系人"></win-list-view>`,
        setup(ex) {
          const lv = ex.querySelector('win-list-view')!;
          const sorted = [...PEOPLE].sort((a, b) => a[0].localeCompare(b[0]));
          let letter = '';
          let h = '';
          sorted.forEach(([n, c], i) => {
            if (n[0] !== letter) {
              letter = n[0]!;
              h += `<win-list-view-header>${letter}</win-list-view-header>`;
            }
            h += `<win-list-view-item>${contact(n, c, i)}</win-list-view-item>`;
          });
          lv.innerHTML = h;
        },
      },
      {
        title: '拖动重新排序（can-reorder-items）',
        description: '按住并拖动项目即可调整顺序，其余项目以重排动画让位，完成后触发 reorder 事件。',
        html: html`<win-list-view can-reorder-items style="width:300px" aria-label="可重排列表">
  <win-list-view-item>🍎 苹果</win-list-view-item>
  <win-list-view-item>🍌 香蕉</win-list-view-item>
  <win-list-view-item>🍒 樱桃</win-list-view-item>
  <win-list-view-item>🍇 葡萄</win-list-view-item>
  <win-list-view-item>🍑 桃子</win-list-view-item>
</win-list-view>
<div class="output" data-output></div>`,
        setup(ex) {
          const lv = ex.querySelector('win-list-view')!;
          lv.addEventListener('reorder', (e) => {
            const d = (e as CustomEvent<{ from: number; to: number }>).detail;
            out(ex, `已将第 ${d.from + 1} 项移动到第 ${d.to + 1} 位`);
          });
        },
      },
      {
        title: '数据驱动与虚拟化（10,000 项）',
        description:
          '设置 items 与 renderItem 后，列表只实例化视口附近的容器；null 项会渲染占位而不是崩溃（修复 XAML 虚拟化列表的 E_POINTER 问题）。',
        html: html`<win-list-view selection-mode="extended" style="width:340px;height:320px" aria-label="一万项"></win-list-view>
<div class="output" data-output></div>`,
        js: `const lv = document.querySelector('win-list-view');
lv.renderItem = (item, i) => \`<div style="display:flex;justify-content:space-between;gap:12px">
  <span>\${item.name}</span><span class="w-caption w-text-secondary">#\${i + 1}</span></div>\`;
lv.items = Array.from({ length: 10000 }, (_, i) => i === 3 ? null : { name: \`项目 \${i + 1}\` });`,
        setup(ex) {
          const lv = ex.querySelector('win-list-view')!;
          lv.renderItem = (item, i) =>
            `<div style="display:flex;justify-content:space-between;gap:12px"><span>${(item as { name: string }).name}</span><span class="w-caption w-text-secondary">#${i + 1}</span></div>`;
          lv.items = Array.from({ length: 10000 }, (_, i) => (i === 3 ? null : { name: `项目 ${i + 1}` }));
          lv.addEventListener('selectionchanged', () => out(ex, `已选择 ${lv.selectedIndices.length} 项`));
          out(ex, `共 ${lv.count} 项，DOM 中仅实例化 ${lv.querySelectorAll('win-list-view-item').length} 个容器`);
        },
      },
    ],
  },

  {
    id: 'grid-view',
    title: 'GridView',
    category: 'collections',
    icon: '\uF0E2',
    tags: ['win-grid-view', 'win-grid-view-item'],
    description:
      'GridView 以按行换行的网格显示项目（ItemsWrapGrid），常用于图片与媒体。选中项显示 2px 强调色边框与 1px 内描边，右上角显示复选框（CheckMode Overlay）；支持二维方向键导航、多选、拖动重新排序与数据虚拟化。',
    docs: [
      {
        label: 'ListView 与 GridView',
        href: 'https://learn.microsoft.com/windows/apps/design/controls/listview-and-gridview',
      },
    ],
    related: ['list-view', 'items-view', 'flip-view'],
    samples: [
      {
        title: '带图片磁贴的基本 GridView',
        html: html`<win-grid-view style="max-width:560px" aria-label="照片">
  ${Array.from({ length: 10 }, (_, i) => `<win-grid-view-item${i === 2 ? ' selected' : ''} aria-label="照片 ${i + 1}"><div style="width:120px;height:120px">${photo(i, 120, 120, `照片 ${i + 1}`)}</div></win-grid-view-item>`).join('\n  ')}
</win-grid-view>
<div class="output" data-output></div>`,
        setup(ex) {
          const gv = ex.querySelector('win-grid-view')!;
          gv.addEventListener('selectionchanged', () => out(ex, describeSel(gv)));
          out(ex, describeSel(gv));
        },
      },
      {
        title: '多选与重新排序',
        description: '多选模式下悬停未选中的项会显示空复选框；开启 can-reorder-items 后可拖动磁贴调整顺序。',
        html: html`<win-grid-view selection-mode="multiple" can-reorder-items style="max-width:520px" aria-label="可多选的网格">
  ${Array.from({ length: 8 }, (_, i) => `<win-grid-view-item${i % 3 === 0 ? ' selected' : ''}><div style="width:100px;height:100px;display:grid;place-items:center;border-radius:4px;background:${hue(i)};color:#fff;font:var(--w-type-subtitle)">${i + 1}</div></win-grid-view-item>`).join('\n  ')}
</win-grid-view>
<div class="output" data-output></div>`,
        options: modeOptions('multiple'),
        setup(ex, opt) {
          const gv = ex.querySelector('win-grid-view')!;
          wireModes(opt, gv);
          gv.addEventListener('selectionchanged', () => out(ex, describeSel(gv)));
          gv.addEventListener('reorder', (e) => {
            const d = (e as CustomEvent<{ from: number; to: number }>).detail;
            out(ex, `已将第 ${d.from + 1} 项移动到第 ${d.to + 1} 位`);
          });
          out(ex, describeSel(gv));
        },
      },
      {
        title: '数据驱动网格（2,000 项虚拟化）',
        html: html`<win-grid-view style="height:320px;width:560px;max-width:100%" aria-label="颜色网格"></win-grid-view>`,
        js: `const gv = document.querySelector('win-grid-view');
gv.renderItem = (c) => \`<div style="width:96px;height:72px;border-radius:4px;background:\${c}"></div>\`;
gv.items = Array.from({ length: 2000 }, (_, i) => \`hsl(\${(i * 37) % 360} 70% 55%)\`);`,
        setup(ex) {
          const gv = ex.querySelector('win-grid-view')!;
          gv.renderItem = (c) =>
            `<div title="${String(c)}" style="width:96px;height:72px;border-radius:4px;background:${String(c)}"></div>`;
          gv.items = Array.from({ length: 2000 }, (_, i) => `hsl(${(i * 37) % 360} 70% 55%)`);
        },
      },
    ],
  },

  {
    id: 'list-box',
    title: 'ListBox',
    category: 'collections',
    icon: '\uE762',
    tags: ['win-list-box', 'win-list-box-item'],
    description:
      'ListBox 是较简单的列表控件，以 SystemChromeMediumLow 为背景，选中项使用 40%（浅色）/ 60%（深色）强度的强调色填充，适合在表单或设置中选择一项或多项。',
    related: ['list-view', 'combo-box'],
    samples: [
      {
        title: '内联定义项的 ListBox',
        html: html`<div class="row" style="align-items:flex-start">
  <win-list-box style="width:200px" aria-label="颜色">
    <win-list-box-item value="#0078d4">Blue</win-list-box-item>
    <win-list-box-item value="#107c10">Green</win-list-box-item>
    <win-list-box-item value="#e81123" selected>Red</win-list-box-item>
    <win-list-box-item value="#ffb900">Yellow</win-list-box-item>
  </win-list-box>
  <div data-swatch style="width:100px;height:100px;border-radius:8px;background:#e81123;transition:background-color var(--w-duration-normal) linear"></div>
</div>`,
        setup(ex) {
          const lb = ex.querySelector('win-list-box')!;
          const sw = ex.querySelector<HTMLElement>('[data-swatch]')!;
          lb.addEventListener('selectionchanged', () => {
            const el = lb.selectedItem as (HTMLElement & { value: string }) | null;
            if (el) sw.style.backgroundColor = el.value;
          });
        },
      },
      {
        title: '多选 ListBox（Extended）',
        description: 'Ctrl 单击切换、Shift 单击选择范围。',
        html: html`<win-list-box selection-mode="extended" style="width:240px" aria-label="字体">
  ${['Arial', 'Calibri', 'Cambria', 'Consolas', 'Courier New', 'Segoe UI', 'Times New Roman'].map((f) => `<win-list-box-item><span style="font-family:'${f}'">${f}</span></win-list-box-item>`).join('\n  ')}
</win-list-box>
<div class="output" data-output></div>`,
        setup(ex) {
          const lb = ex.querySelector('win-list-box')!;
          lb.addEventListener('selectionchanged', () => out(ex, describeSel(lb)));
        },
      },
    ],
  },

  {
    id: 'items-view',
    title: 'ItemsView',
    category: 'collections',
    icon: '\uE8A9',
    badge: 'new',
    tags: ['win-items-view', 'win-item-container'],
    description:
      'ItemsView（WinUI 1.5）以可插拔布局显示集合：StackLayout、UniformGridLayout 与按比例对齐的 LinedFlowLayout（照片墙）。ItemContainer 的选中视觉是 3px 强调色边框加 1px 内描边，悬停叠加层绘制在内容之上；多选模式在右上角显示复选框。',
    related: ['grid-view', 'items-repeater'],
    samples: [
      {
        title: 'LinedFlowLayout 照片墙',
        description: '每个项目保持自身宽高比，按行两端对齐（line-height 控制行高）。',
        html: html`<win-items-view layout="lined-flow" line-height="120" style="width:640px;max-width:100%" aria-label="照片墙"></win-items-view>
<div class="output" data-output></div>`,
        setup(ex) {
          const iv = ex.querySelector('win-items-view')!;
          const ratios = [1.5, 0.75, 1.33, 1, 1.78, 0.8, 1.5, 1.2, 0.66, 1.6, 1, 1.4];
          iv.renderItem = (it, i) =>
            `<div style="width:100%;height:100%">${photo(i, Math.round(120 * (it as { aspect: number }).aspect), 120)}</div>`;
          iv.items = ratios.map((aspect) => ({ aspect }));
          iv.addEventListener('selectionchanged', () => out(ex, describeSel(iv)));
        },
      },
      {
        title: 'UniformGridLayout 与多选',
        html: html`<win-items-view layout="uniform-grid" min-item-width="96" min-item-height="96" selection-mode="multiple" style="width:520px;max-width:100%" aria-label="网格">
  ${Array.from({ length: 10 }, (_, i) => `<win-item-container${i === 1 || i === 4 ? ' selected' : ''}><div style="height:96px">${photo(i + 2, 96, 96)}</div></win-item-container>`).join('\n  ')}
</win-items-view>
<div class="output" data-output></div>`,
        options: modeOptions('multiple'),
        setup(ex, opt) {
          const iv = ex.querySelector('win-items-view')!;
          wireModes(opt, iv);
          iv.addEventListener('selectionchanged', () => out(ex, describeSel(iv)));
          out(ex, describeSel(iv));
        },
      },
      {
        title: 'StackLayout 与 ItemInvoked',
        html: html`<win-items-view spacing="4" selection-mode="none" item-invoked-enabled style="width:320px" aria-label="联系人">
  ${PEOPLE.slice(0, 4)
    .map(
      ([n, c], i) => `<win-item-container><div style="padding:4px 12px">${contact(n, c, i)}</div></win-item-container>`,
    )
    .join('\n  ')}
</win-items-view>
<div class="output" data-output></div>`,
        setup(ex) {
          const iv = ex.querySelector('win-items-view')!;
          iv.addEventListener('iteminvoked', (e) => {
            const d = (e as CustomEvent<{ index: number }>).detail;
            out(ex, `ItemInvoked：${PEOPLE[d.index]?.[0] ?? d.index}`);
          });
        },
      },
    ],
  },

  {
    id: 'items-repeater',
    title: 'ItemsRepeater',
    category: 'collections',
    icon: '\uE14C',
    tags: ['win-items-repeater'],
    description:
      'ItemsRepeater 是无交互外观的数据重复器：由 itemTemplate 生成元素，并按 StackLayout、UniformGridLayout、FlowLayout 排列；当数据量较大时只实例化滚动视口附近的元素（虚拟化）。',
    related: ['items-view', 'list-view'],
    samples: [
      {
        title: 'StackLayout（条形图数据模板）',
        html: html`<win-items-repeater spacing="6" style="width:360px" aria-label="条形图"></win-items-repeater>`,
        setup(ex) {
          const r = ex.querySelector('win-items-repeater')!;
          const data = [
            ['一月', 42],
            ['二月', 68],
            ['三月', 55],
            ['四月', 90],
            ['五月', 74],
            ['六月', 31],
          ] as const;
          r.itemTemplate = (d) => {
            const [m, v] = d as readonly [string, number];
            return `<div style="display:flex;align-items:center;gap:8px"><span style="width:40px" class="w-caption w-text-secondary">${m}</span><span style="height:20px;width:${v * 2.6}px;border-radius:4px;background:var(--w-accent-fill-color-default)"></span><span class="w-caption">${v}</span></div>`;
          };
          r.items = data as unknown as unknown[];
        },
      },
      {
        title: 'UniformGridLayout',
        html: html`<win-items-repeater layout="uniform-grid" min-item-width="72" min-item-height="72" min-row-spacing="8" min-column-spacing="8" animate-items style="width:420px;max-width:100%" aria-label="颜色"></win-items-repeater>`,
        setup(ex) {
          const r = ex.querySelector('win-items-repeater')!;
          r.itemTemplate = (_c, i) =>
            `<div style="width:72px;height:72px;border-radius:8px;background:${hue(i)};display:grid;place-items:center;color:#fff">${i + 1}</div>`;
          r.items = Array.from({ length: 15 }, (_, i) => i);
        },
      },
      {
        title: '虚拟化（10,000 项，滚动容器内）',
        html: html`<div style="height:280px;width:340px;overflow:auto;border:1px solid var(--w-card-stroke-color-default);border-radius:8px" data-scroller>
  <win-items-repeater spacing="2" aria-label="一万行"></win-items-repeater>
</div>
<div class="output" data-output></div>`,
        setup(ex) {
          const r = ex.querySelector('win-items-repeater')!;
          const scroller = ex.querySelector<HTMLElement>('[data-scroller]')!;
          r.itemTemplate = (_x, i) =>
            `<div style="padding:8px 12px;border-radius:4px;background:var(--w-subtle-fill-color-secondary)">第 ${i + 1} 行</div>`;
          r.items = Array.from({ length: 10000 }, (_, i) => i);
          const report = () =>
            out(ex, `已实例化 ${r.querySelectorAll('[data-w-repeater-item]').length} / 10000 个元素`);
          scroller.addEventListener('scroll', () => requestAnimationFrame(report));
          requestAnimationFrame(report);
        },
      },
    ],
  },

  {
    id: 'tree-view',
    title: 'TreeView',
    category: 'collections',
    icon: '\uED41',
    tags: ['win-tree-view', 'win-tree-view-item'],
    description:
      'TreeView 以可展开/折叠的层次结构显示数据。支持单选（强调色指示条）、带三态复选框的多选（选中父节点会选中全部子节点，部分选中时显示不确定态）、键盘导航（←/→ 折叠、展开或移到父/子节点），以及通过 has-unrealized-children + expanding 事件按需加载。',
    docs: [{ label: 'TreeView', href: 'https://learn.microsoft.com/windows/apps/design/controls/tree-view' }],
    related: ['list-view'],
    samples: [
      {
        title: '简单 TreeView',
        html: html`<win-tree-view style="width:340px" aria-label="文档">
  <win-tree-view-item content="Work Documents" expanded>
    <win-tree-view-item content="XYZ Functional Spec"></win-tree-view-item>
    <win-tree-view-item content="Feature Schedule"></win-tree-view-item>
    <win-tree-view-item content="Overall Project Plan"></win-tree-view-item>
    <win-tree-view-item content="Feature Resources Allocation"></win-tree-view-item>
  </win-tree-view-item>
  <win-tree-view-item content="Personal Documents">
    <win-tree-view-item content="Home Remodel" expanded>
      <win-tree-view-item content="Contractor Contact Info"></win-tree-view-item>
      <win-tree-view-item content="Paint Color Scheme"></win-tree-view-item>
      <win-tree-view-item content="Flooring Woodgrain type"></win-tree-view-item>
      <win-tree-view-item content="Kitchen Cabinet Style"></win-tree-view-item>
    </win-tree-view-item>
  </win-tree-view-item>
</win-tree-view>
<div class="output" data-output></div>`,
        setup(ex) {
          const tv = ex.querySelector('win-tree-view')!;
          tv.addEventListener('iteminvoked', (e) => {
            const d = (e as CustomEvent<{ node: HTMLElement & { content: string } }>).detail;
            out(ex, `ItemInvoked：${d.node.content}`);
          });
        },
      },
      {
        title: '多选（三态复选框）',
        html: html`<win-tree-view selection-mode="multiple" style="width:340px" aria-label="可多选的文件">
  <win-tree-view-item content="图片" expanded>
    <win-tree-view-item content="假日" expanded>
      <win-tree-view-item content="海滩.jpg" selected></win-tree-view-item>
      <win-tree-view-item content="山脉.jpg"></win-tree-view-item>
    </win-tree-view-item>
    <win-tree-view-item content="家庭.png"></win-tree-view-item>
  </win-tree-view-item>
  <win-tree-view-item content="音乐">
    <win-tree-view-item content="专辑 A"></win-tree-view-item>
    <win-tree-view-item content="专辑 B"></win-tree-view-item>
  </win-tree-view-item>
</win-tree-view>
<div class="output" data-output></div>`,
        setup(ex) {
          const tv = ex.querySelector('win-tree-view')!;
          const show = () => out(ex, `已选择：${tv.selectedNodes.map((n) => n.content).join('、') || '无'}`);
          tv.addEventListener('selectionchanged', show);
          show();
        },
      },
      {
        title: '按需加载子节点',
        description: '节点设置 has-unrealized-children 后显示展开箭头；展开时触发 expanding 事件，在此异步添加子节点。',
        html: html`<win-tree-view style="width:340px" aria-label="按需加载">
  <win-tree-view-item content="C:\\" has-unrealized-children></win-tree-view-item>
  <win-tree-view-item content="D:\\" has-unrealized-children></win-tree-view-item>
</win-tree-view>`,
        setup(ex) {
          const tv = ex.querySelector('win-tree-view')!;
          let n = 0;
          tv.addEventListener('expanding', (e) => {
            const node = (e as CustomEvent<{ node: HTMLElement & { hasUnrealizedChildren: boolean } }>).detail.node;
            if (!node.hasUnrealizedChildren) return;
            node.toggleAttribute('data-loading', true);
            setTimeout(() => {
              node.toggleAttribute('data-loading', false);
              for (const name of ['Program Files', 'Users', 'Windows']) {
                const child = document.createElement('win-tree-view-item');
                child.setAttribute('content', `${name}`);
                if (n++ < 6) child.setAttribute('has-unrealized-children', '');
                node.append(child);
              }
              node.hasUnrealizedChildren = false;
            }, 700);
          });
        },
      },
      {
        title: '数据驱动（items 属性，带图标）',
        html: html`<win-tree-view style="width:340px" aria-label="项目"></win-tree-view>`,
        js: `tree.items = [{ content: 'src', icon: 'Folder', expanded: true, children: [
  { content: 'index.ts', icon: 'Document' }, { content: 'components', icon: 'Folder', children: [...] } ] }];`,
        setup(ex) {
          const tv = ex.querySelector('win-tree-view')!;
          tv.items = [
            {
              content: 'winui',
              icon: 'Folder',
              expanded: true,
              children: [
                {
                  content: 'components',
                  icon: 'Folder',
                  expanded: true,
                  children: [
                    { content: 'list-view.ts', icon: 'Page' },
                    { content: 'tree-view.ts', icon: 'Page' },
                  ],
                },
                { content: 'theme', icon: 'Folder', children: [{ content: 'theme.ts', icon: 'Page' }] },
                { content: 'index.ts', icon: 'Page' },
                { content: 'package.json', icon: 'Page' },
              ],
            },
          ];
        },
      },
    ],
  },

  {
    id: 'flip-view',
    title: 'FlipView',
    category: 'collections',
    icon: '\uE8B9',
    tags: ['win-flip-view', 'win-flip-view-item'],
    description:
      'FlipView 一次显示集合中的一项，可用左右（或上下）导航按钮、方向键、鼠标/触摸拖动翻页。导航按钮是 16×38 的亚克力小按钮，鼠标悬停时出现。',
    related: ['pips-pager', 'grid-view'],
    samples: [
      {
        title: '简单 FlipView',
        html: html`<win-flip-view style="width:420px;height:260px" aria-label="图片">
  ${['日出', '湖泊', '森林', '城市', '雪山'].map((t, i) => `<win-flip-view-item>${photo(i + 1, 420, 260)}<div style="position:absolute;left:0;right:0;bottom:0;padding:12px 16px;background:linear-gradient(transparent,rgba(0,0,0,.55));color:#fff;font:var(--w-type-body-strong)">${t}</div></win-flip-view-item>`).join('\n  ')}
</win-flip-view>
<div class="output" data-output></div>`,
        setup(ex) {
          const fv = ex.querySelector('win-flip-view')!;
          fv.addEventListener('selectionchanged', () => out(ex, `当前：第 ${fv.selectedIndex + 1} 张`));
          out(ex, `当前：第 ${fv.selectedIndex + 1} 张`);
        },
      },
      {
        title: '垂直 FlipView',
        html: html`<win-flip-view orientation="vertical" style="width:320px;height:200px" aria-label="垂直翻页">
  ${[0, 1, 2, 3].map((i) => `<win-flip-view-item>${photo(i + 6, 320, 200, `第 ${i + 1} 页`)}</win-flip-view-item>`).join('\n  ')}
</win-flip-view>`,
      },
      {
        title: '与 PipsPager 联动',
        html: html`<div class="col" style="align-items:center;width:420px">
  <win-flip-view style="width:420px;height:240px" aria-label="带指示器的图片">
    ${[0, 1, 2, 3, 4, 5].map((i) => `<win-flip-view-item>${photo(i + 3, 420, 240)}</win-flip-view-item>`).join('\n    ')}
  </win-flip-view>
  <win-pips-pager number-of-pages="6"></win-pips-pager>
</div>`,
        setup(ex) {
          const fv = ex.querySelector('win-flip-view')!;
          const pp = ex.querySelector('win-pips-pager')!;
          fv.addEventListener('selectionchanged', () => (pp.selectedPageIndex = fv.selectedIndex));
          pp.addEventListener('selectedindexchanged', () => (fv.selectedIndex = pp.selectedPageIndex));
        },
      },
    ],
  },

  {
    id: 'pips-pager',
    title: 'PipsPager',
    category: 'scrolling',
    icon: '\uE712',
    tags: ['win-pips-pager'],
    description:
      'PipsPager 用小圆点表示分页位置，可横向或纵向排列；当页数超过 max-visible-pips 时圆点窗口会滚动以保持选中项居中。上一页/下一页按钮支持 collapsed、visible、visible-on-pointer-over 三种可见性。',
    related: ['flip-view'],
    samples: [
      {
        title: '基本 PipsPager',
        html: html`<win-pips-pager number-of-pages="5" aria-label="基本分页"></win-pips-pager>
<div class="output" data-output>第 1 页</div>`,
        setup(ex) {
          const pp = ex.querySelector('win-pips-pager')!;
          pp.addEventListener('selectedindexchanged', () => out(ex, `第 ${pp.selectedPageIndex + 1} 页`));
        },
      },
      {
        title: '显示导航按钮',
        html: html`<div class="col">
  <win-pips-pager number-of-pages="8" previous-button-visibility="visible" next-button-visibility="visible" aria-label="始终显示按钮"></win-pips-pager>
  <win-pips-pager number-of-pages="8" selected-page-index="3" previous-button-visibility="visible-on-pointer-over" next-button-visibility="visible-on-pointer-over" aria-label="悬停显示按钮"></win-pips-pager>
</div>`,
      },
      {
        title: '垂直方向与 max-visible-pips',
        description: '10 页，最多显示 5 个圆点。',
        html: html`<win-pips-pager orientation="vertical" number-of-pages="10" max-visible-pips="5" previous-button-visibility="visible" next-button-visibility="visible" aria-label="垂直分页"></win-pips-pager>
<div class="output" data-output>第 1 / 10 页</div>`,
        setup(ex) {
          const pp = ex.querySelector('win-pips-pager')!;
          pp.addEventListener('selectedindexchanged', () => out(ex, `第 ${pp.selectedPageIndex + 1} / 10 页`));
        },
      },
    ],
  },

  {
    id: 'swipe-actions',
    title: 'SwipeActions',
    category: 'menus-toolbars',
    icon: '\uE1E3',
    tags: ['win-swipe-actions', 'win-swipe-item'],
    description:
      'SwipeActions 让用户在项目上左右滑动以显示上下文操作。Reveal 模式滑动后停留并显示多个命令；Execute 模式滑过阈值后松开即执行命令（如删除）。支持触摸、笔和鼠标拖动。',
    related: ['list-view'],
    samples: [
      {
        title: 'Reveal 模式（两侧多个命令）',
        html: html`<div data-stretch style="max-width:420px;border:1px solid var(--w-card-stroke-color-default);border-radius:8px;overflow:hidden">
  ${PEOPLE.slice(0, 3)
    .map(
      ([n, c], i) => `<win-swipe-actions style="border-bottom:1px solid var(--w-divider-stroke-color-default)">
    <win-swipe-item slot="left" text="收藏" icon="Favorite" background="#ffb900" foreground="#000"></win-swipe-item>
    <win-swipe-item slot="right" text="共享" icon="Share" background="#0078d4" foreground="#fff"></win-swipe-item>
    <win-swipe-item slot="right" text="删除" icon="Delete" background="#c42b1c" foreground="#fff"></win-swipe-item>
    <div style="padding:6px 16px">${contact(n, c, i)}</div>
  </win-swipe-actions>`,
    )
    .join('\n  ')}
</div>
<div class="output" data-output>向左或向右拖动任意一行</div>`,
        setup(ex) {
          for (const it of ex.querySelectorAll<HTMLElement & { text: string }>('win-swipe-item')) {
            it.addEventListener('invoked', () => out(ex, `已执行：${it.text}`));
          }
        },
      },
      {
        title: 'Execute 模式（滑过阈值删除）',
        html: html`<div data-stretch data-list style="max-width:420px;border:1px solid var(--w-card-stroke-color-default);border-radius:8px;overflow:hidden">
  ${['会议纪要', '预算草案', '旅行照片', '发票 #1043']
    .map(
      (
        t,
      ) => `<win-swipe-actions right-items-mode="execute" style="border-bottom:1px solid var(--w-divider-stroke-color-default)">
    <win-swipe-item slot="right" text="删除" icon="Delete"></win-swipe-item>
    <div style="padding:10px 16px;min-height:40px;box-sizing:border-box;display:flex;align-items:center">${t}</div>
  </win-swipe-actions>`,
    )
    .join('\n  ')}
</div>
<div class="output" data-output>向左拖动一行超过阈值后松开</div>`,
        setup(ex) {
          for (const it of ex.querySelectorAll<HTMLElement>('win-swipe-item')) {
            it.addEventListener('invoked', () => {
              const row = it.closest('win-swipe-actions') as HTMLElement | null;
              if (!row || row.hasAttribute('data-removing')) return;
              row.setAttribute('data-removing', '');
              row.style.pointerEvents = 'none';
              out(ex, `已删除：${row.textContent?.trim()}`);
              void settled(itemRemoved(row))
                .then(() => {
                  const h = row.getBoundingClientRect().height;
                  row.style.minHeight = '0';
                  return settled(
                    animate(
                      row,
                      [
                        { height: `${h}px`, borderBottomWidth: '1px' },
                        { height: '0px', borderBottomWidth: '0px' },
                      ],
                      {
                        duration: durations.normal,
                        easing: easings.decelerate,
                        fill: 'forwards',
                      },
                    ),
                  );
                })
                .then(() => row.remove());
            });
          }
        },
      },
    ],
  },

  {
    id: 'pull-to-refresh',
    title: 'PullToRefresh',
    category: 'collections',
    icon: '\uE72C',
    tags: ['win-pull-to-refresh', 'win-refresh-indicator'],
    description:
      'PullToRefresh 为可滚动内容提供“下拉刷新”：在顶部向下拖动超过阈值后松开，RefreshIndicator 旋转指示刷新进行中；通过 refreshrequested 事件的 getDeferral() 在异步工作完成后结束刷新。也可调用 requestRefresh()。',
    related: ['list-view'],
    samples: [
      {
        title: '下拉刷新列表',
        html: html`<win-pull-to-refresh style="width:340px;height:300px;border:1px solid var(--w-card-stroke-color-default);border-radius:8px" aria-label="可刷新列表">
  <win-list-view style="height:100%" selection-mode="none" aria-label="消息"></win-list-view>
</win-pull-to-refresh>
<win-button data-refresh>requestRefresh()</win-button>
<div class="output" data-output>在列表顶部按住并向下拖动</div>`,
        setup(ex) {
          const rc = ex.querySelector('win-pull-to-refresh')!;
          const lv = ex.querySelector('win-list-view')!;
          const items: string[] = ['欢迎使用 PullToRefresh', '向下拖动以获取新消息'];
          let count = 0;
          const render = () => {
            lv.items = [...items];
          };
          lv.renderItem = (t) => `<div style="padding:4px 0">${String(t)}</div>`;
          render();
          rc.addEventListener('refreshrequested', (e) => {
            const def = (e as CustomEvent<{ getDeferral(): { complete(): void } }>).detail.getDeferral();
            setTimeout(() => {
              items.unshift(`新消息 ${++count} · ${new Date().toLocaleTimeString()}`);
              render();
              def.complete();
              out(ex, `已刷新 ${count} 次`);
            }, 1200);
          });
          ex.querySelector('[data-refresh]')?.addEventListener('click', () => rc.requestRefresh());
        },
      },
    ],
  },

  {
    id: 'semantic-zoom',
    title: 'SemanticZoom',
    category: 'scrolling',
    icon: '\uE71E',
    tags: ['win-semantic-zoom'],
    description:
      'SemanticZoom 在同一内容的两种语义视图之间切换：放大视图显示分组的详细列表，缩小视图显示分组索引（跳转列表）。点击组标题或 Ctrl+滚轮缩小，点击索引项跳转并放大。',
    related: ['list-view', 'grid-view'],
    samples: [
      {
        title: '分组列表与字母跳转列表',
        html: html`<win-semantic-zoom style="width:360px;height:340px;border:1px solid var(--w-card-stroke-color-default);border-radius:8px" aria-label="联系人语义缩放">
  <win-list-view slot="zoomed-in" style="height:100%" aria-label="联系人"></win-list-view>
  <div slot="zoomed-out" data-jump style="display:grid;grid-template-columns:repeat(4,64px);gap:8px;padding:16px;justify-content:center"></div>
</win-semantic-zoom>
<div class="output" data-output>点击字母标题切换到跳转列表</div>`,
        setup(ex) {
          const sz = ex.querySelector('win-semantic-zoom')!;
          const lv = ex.querySelector('win-list-view')!;
          const jump = ex.querySelector<HTMLElement>('[data-jump]')!;
          const sorted = [...PEOPLE].sort((a, b) => a[0].localeCompare(b[0]));
          const letters = [...new Set(sorted.map(([n]) => n[0]!))];
          let h = '';
          for (const L of letters) {
            h += `<win-list-view-header id="sz-${L}" data-zoom-out style="cursor:pointer">${L}</win-list-view-header>`;
            sorted
              .filter(([n]) => n[0] === L)
              .forEach(([n, c], i) => {
                h += `<win-list-view-item>${contact(n, c, i)}</win-list-view-item>`;
              });
          }
          lv.innerHTML = h;
          jump.innerHTML = letters
            .map(
              (L) =>
                `<button data-zoom-target="sz-${L}" style="height:64px;border:0;border-radius:4px;background:var(--w-accent-fill-color-default);color:var(--w-text-on-accent-fill-color-primary);font:var(--w-type-subtitle);cursor:pointer">${L}</button>`,
            )
            .join('');
          sz.addEventListener('viewchangecompleted', () =>
            out(ex, sz.zoomedInViewActive ? '放大视图（详细列表）' : '缩小视图（跳转列表）'),
          );
        },
      },
    ],
  },
  {
    id: 'data-grid',
    title: 'DataGrid',
    category: 'collections',
    icon: '',
    tags: ['win-data-grid', 'win-data-grid-column'],
    summary: '可排序、可调整列宽、可编辑、支持 10 万行虚拟化的数据表格。',
    description:
      'DataGrid 用于以行列形式展示与编辑大量数据。本实现沿用 WinUI ListView 的选中/悬停视觉与 TextBox 的编辑态：星号/自动/像素列宽、拖拽调整与双击自适应列宽、拖拽重排列、点击表头排序、单选/扩展多选、内联编辑、单元格级键盘导航与行虚拟化。',
    related: ['tokenizing-text-box', 'settings-card'],
    samples: [
      {
        title: '排序、调整列宽、多选与编辑',
        description:
          '点击表头排序（升序 → 降序 → 取消）；拖动表头分隔线调整列宽，双击分隔线自适应；拖动表头可重排列；双击“姓名/薪资”或选中后按 F2 编辑，Enter 提交、Esc 取消；“远程”列可直接点击切换。',
        html: html`<win-data-grid id="dg1" label="员工列表" style="height:380px" data-stretch></win-data-grid>
<div class="output" data-output>已选择 0 项</div>`,
        options: html`<div class="opt-title">选择模式</div>
<win-segmented data-opt="mode" selected-index="2" stretch>
  <win-segmented-item value="none">无</win-segmented-item>
  <win-segmented-item value="single">单选</win-segmented-item>
  <win-segmented-item value="extended">扩展</win-segmented-item>
</win-segmented>
<div class="opt-title">网格线</div>
<win-segmented data-opt="lines" selected-index="1" stretch>
  <win-segmented-item value="none">无</win-segmented-item>
  <win-segmented-item value="horizontal">横</win-segmented-item>
  <win-segmented-item value="all">全部</win-segmented-item>
</win-segmented>
<win-check-box data-opt="compact">紧凑行高</win-check-box>
<win-check-box data-opt="alt">交替行背景</win-check-box>
<win-check-box data-opt="ro">只读</win-check-box>`,
        js: html`const grid = document.querySelector('#dg1');
grid.columns = [
  { key: 'name', header: '姓名', width: '2*', editable: true },
  { key: 'dept', header: '部门', width: 'auto' },
  { key: 'title', header: '职位', width: '1.5*' },
  { key: 'joined', header: '入职日期', type: 'date', width: 'auto', editable: true },
  { key: 'salary', header: '月薪', type: 'number', width: 110, editable: true,
    format: (v) => '¥' + Number(v).toLocaleString() },
  { key: 'remote', header: '远程', type: 'boolean', width: 80, editable: true },
];
grid.items = people(240);
grid.addEventListener('selectionchanged', (e) => console.log(e.detail.selectedItems));`,
        setup(ex, opt) {
          const grid = ex.querySelector('#dg1') as WinDataGrid;
          const cols: DataGridColumn[] = [
            { key: 'name', header: '姓名', width: '2*', minWidth: 96, editable: true },
            { key: 'dept', header: '部门', width: 'auto' },
            { key: 'title', header: '职位', width: '1.5*', minWidth: 96 },
            { key: 'joined', header: '入职日期', type: 'date', width: 'auto', editable: true },
            {
              key: 'salary',
              header: '月薪',
              type: 'number',
              width: 110,
              editable: true,
              format: (v) => `¥${Number(v).toLocaleString()}`,
            },
            { key: 'remote', header: '远程', type: 'boolean', width: 80, editable: true },
          ];
          grid.columns = cols;
          grid.items = people(240);
          const report = () => {
            const n = grid.selectedItems.length;
            const sort = grid.sortColumn
              ? `；按 ${cols.find((c) => c.key === grid.sortColumn)?.header} ${grid.sortDirection === 'ascending' ? '升序' : '降序'}`
              : '';
            out(ex, `已选择 ${n} 项${n === 1 ? `（${String(grid.selectedItems[0]!.name)}）` : ''}${sort}`);
          };
          grid.addEventListener('selectionchanged', report);
          grid.addEventListener('sorted', report);
          grid.addEventListener('celleditended', (e) => {
            const d = (e as CustomEvent).detail as {
              column: DataGridColumn;
              oldValue: unknown;
              newValue: unknown;
              cancelled: boolean;
            };
            if (!d.cancelled)
              out(
                ex,
                `已编辑“${d.column.header}”：${String(d.oldValue instanceof Date ? d.oldValue.toLocaleDateString() : d.oldValue)} → ${String(d.newValue instanceof Date ? d.newValue.toLocaleDateString() : d.newValue)}`,
              );
          });
          opt?.querySelector('[data-opt="mode"]')?.addEventListener('selectionchanged', (e) => {
            grid.selectionMode = (e as CustomEvent).detail.value;
          });
          opt?.querySelector('[data-opt="lines"]')?.addEventListener('selectionchanged', (e) => {
            grid.gridLines = (e as CustomEvent).detail.value;
          });
          const bind = (k: string, fn: (on: boolean) => void) =>
            opt
              ?.querySelector(`[data-opt="${k}"]`)
              ?.addEventListener('change', (e) => fn(!!(e.currentTarget as HTMLInputElement).checked));
          bind('compact', (on) => (grid.rowHeight = on ? 'compact' : 'standard'));
          bind('alt', (on) => (grid.alternating = on));
          bind('ro', (on) => (grid.readOnly = on));
        },
      },
      {
        title: '100 000 行虚拟化',
        description: '只渲染可视区域内的行（外加少量缓冲），滚动、排序与键盘导航在十万行数据上依旧流畅。',
        html: html`<win-data-grid id="dg2" row-height="compact" selection-mode="single" style="height:300px" data-stretch></win-data-grid>
<div class="row"><win-button data-act="sort">按月薪降序</win-button><win-button data-act="jump">跳到第 50 000 行</win-button><span class="output" data-output></span></div>`,
        setup(ex) {
          const grid = ex.querySelector('#dg2') as WinDataGrid;
          grid.columns = [
            { key: 'id', header: '#', type: 'number', width: 90 },
            { key: 'name', header: '姓名', width: '*' },
            { key: 'city', header: '城市', width: '*' },
            { key: 'salary', header: '月薪', type: 'number', width: 120 },
          ];
          const t0 = performance.now();
          grid.items = people(100_000, 42);
          out(ex, `已加载 100 000 行，用时 ${Math.round(performance.now() - t0)} ms`);
          ex.querySelector('[data-act="sort"]')!.addEventListener('click', () => grid.sort('salary', 'descending'));
          ex.querySelector('[data-act="jump"]')!.addEventListener('click', () => {
            grid.selectedIndex = 49_999;
            grid.scrollToItem(49_999);
          });
        },
      },
      {
        title: '声明式列与自定义单元格',
        description:
          '列可以用 <win-data-grid-column> 子元素声明；render 函数可以输出任意内容（这里是状态徽标和进度条）。',
        html: html`<win-data-grid id="dg3" selection-mode="single" grid-lines="none" style="height:260px" data-stretch>
  <win-data-grid-column key="name" header="项目" width="2*"></win-data-grid-column>
  <win-data-grid-column key="owner" header="负责人" width="*"></win-data-grid-column>
  <win-data-grid-column key="state" header="状态" width="120"></win-data-grid-column>
  <win-data-grid-column key="progress" header="进度" width="1.5*" type="number"></win-data-grid-column>
</win-data-grid>`,
        setup(ex) {
          const grid = ex.querySelector('#dg3') as WinDataGrid;
          const states = [
            ['进行中', 'var(--w-system-fill-color-attention)'],
            ['已完成', 'var(--w-system-fill-color-success)'],
            ['有风险', 'var(--w-system-fill-color-caution)'],
            ['已阻塞', 'var(--w-system-fill-color-critical)'],
          ] as const;
          const r = rng(3);
          grid.items = [
            '登录重构',
            '支付网关',
            '设计系统',
            '数据迁移',
            '移动端适配',
            '性能优化',
            '国际化',
            '日志平台',
          ].map((name) => ({
            name,
            owner: FAMILY[Math.floor(r() * FAMILY.length)]! + GIVEN[Math.floor(r() * GIVEN.length)]!,
            state: Math.floor(r() * 4),
            progress: Math.round(r() * 100),
          }));
          const col = (k: string) => ex.querySelector(`win-data-grid-column[key="${k}"]`) as unknown as DataGridColumn;
          col('state').render = (v) => {
            const [label, color] = states[Number(v)] ?? states[0];
            return `<span style="display:inline-flex;align-items:center;gap:8px"><span style="width:8px;height:8px;border-radius:50%;background:${color}"></span>${label}</span>`;
          };
          col('state').compare = (x, y) => Number(x) - Number(y);
          col('progress').render = (v) =>
            `<span style="display:flex;align-items:center;gap:10px;width:100%"><span style="flex:1;height:4px;border-radius:2px;background:var(--w-control-strong-fill-color-default);overflow:hidden"><span style="display:block;height:100%;width:${Number(v)}%;background:var(--w-accent-fill-color-default);border-radius:2px"></span></span><span style="width:36px;text-align:end;color:var(--w-text-fill-color-secondary)">${Number(v)}%</span></span>`;
        },
      },
    ],
  },
];

for (const page of pages) {
  for (const sample of page.samples) {
    const fn = sample.setup;
    if (fn) sample.setup = (ex, opt) => void requestAnimationFrame(() => fn(ex, opt));
  }
}

export default pages;
