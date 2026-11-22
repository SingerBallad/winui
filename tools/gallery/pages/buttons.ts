import { html, type GalleryPage } from './types.ts';

const out = (example: HTMLElement, text: string) => {
  const o = example.querySelector('[data-output]');
  if (o) o.textContent = text;
};

const COLORS = ['#ff0000', '#ffa500', '#ffff00', '#008000', '#0000ff', '#4b0082', '#ee82ee', '#808080', '#000000'];

const pages: GalleryPage[] = [
  {
    id: 'button',
    title: 'Button',
    category: 'basic-input',
    icon: '',
    tags: ['win-button'],
    description:
      '按钮让用户可以立即执行一个操作。可以包含文本、图标或任意内容，支持 Accent（强调）与 Subtle（轻量）样式，并可通过 slot="flyout" 关联浮出控件（Button.Flyout）。',
    docs: [{ label: 'Button 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/buttons' }],
    related: ['toggle-button', 'repeat-button', 'hyperlink-button', 'drop-down-button', 'split-button'],
    samples: [
      {
        title: '带文本内容的简单 Button',
        html: html`<win-button id="b1">Standard button</win-button>
<div class="output" data-output></div>`,
        options: html`<win-check-box data-opt="disabled">禁用按钮</win-check-box>`,
        setup(ex, opt) {
          const b = ex.querySelector('win-button')!;
          b.addEventListener('click', () =>
            out(ex, `你点击了：${b.textContent?.trim()}（${new Date().toLocaleTimeString()}）`),
          );
          opt?.querySelector('[data-opt="disabled"]')?.addEventListener('change', (e) => {
            b.disabled = (e.target as HTMLInputElement).checked;
          });
        },
      },
      {
        title: '带图标内容的 Button',
        html: html`<div class="row">
  <win-button icon="Save">保存</win-button>
  <win-button icon="Delete">删除</win-button>
  <win-button icon="Setting" aria-label="设置"></win-button>
  <win-button><win-symbol-icon slot="icon" symbol="Mail"></win-symbol-icon>发送邮件</win-button>
</div>`,
      },
      {
        title: '应用了 Accent 样式的 Button',
        html: html`<div class="row">
  <win-button appearance="accent">Accent style button</win-button>
  <win-button appearance="accent" disabled>Accent disabled</win-button>
</div>`,
      },
      {
        title: 'Subtle 样式（无背景，常用于工具按钮）',
        html: html`<div class="row">
  <win-button appearance="subtle" icon="Edit">编辑</win-button>
  <win-button appearance="subtle" icon="Share" aria-label="分享"></win-button>
  <win-button appearance="subtle" disabled>Subtle disabled</win-button>
</div>`,
      },
      {
        title: '带 Flyout 的 Button（Button.Flyout，默认放置在上方）',
        html: html`<win-button>Empty cart
  <win-flyout slot="flyout">
    <div style="display:flex;flex-direction:column;gap:12px;max-width:260px">
      <div class="w-body-strong">购物车中的所有商品都将被移除。是否继续？</div>
      <win-button appearance="accent" data-confirm>是，清空购物车</win-button>
    </div>
  </win-flyout>
</win-button>`,
        setup(ex) {
          ex.querySelector('[data-confirm]')?.addEventListener('click', (e) => {
            (e.currentTarget as HTMLElement).closest('win-flyout')?.hide();
          });
        },
      },
    ],
  },
  {
    id: 'drop-down-button',
    title: 'DropDownButton',
    category: 'basic-input',
    icon: '',
    tags: ['win-drop-down-button'],
    description:
      'DropDownButton 是带有下拉箭头（V 形）的按钮，点击后打开关联的浮出控件（通常是 MenuFlyout），菜单默认在按钮下方左对齐展开。',
    related: ['split-button', 'menu-flyout'],
    samples: [
      {
        title: '简单的 DropDownButton',
        html: html`<win-drop-down-button>Email
  <win-menu-flyout slot="flyout" placement="bottom-start">
    <win-menu-flyout-item>Send</win-menu-flyout-item>
    <win-menu-flyout-item>Reply</win-menu-flyout-item>
    <win-menu-flyout-item>Reply All</win-menu-flyout-item>
  </win-menu-flyout>
</win-drop-down-button>`,
      },
      {
        title: '带图标的 DropDownButton',
        html: html`<win-drop-down-button icon="Mail" aria-label="Email">
  <win-menu-flyout slot="flyout">
    <win-menu-flyout-item icon="Send">Send</win-menu-flyout-item>
    <win-menu-flyout-item icon="MailReply">Reply</win-menu-flyout-item>
    <win-menu-flyout-item icon="MailReplyAll">Reply All</win-menu-flyout-item>
  </win-menu-flyout>
</win-drop-down-button>`,
      },
    ],
  },
  {
    id: 'hyperlink-button',
    title: 'HyperlinkButton',
    category: 'basic-input',
    icon: '',
    tags: ['win-hyperlink-button'],
    description:
      'HyperlinkButton 外观类似超链接文本，但行为与按钮一致：可以通过 href 打开网址（NavigateUri），也可以像普通按钮一样处理 click 事件。',
    samples: [
      {
        title: '导航到 URI 的超链接按钮',
        html: html`<win-hyperlink-button href="https://www.microsoft.com">Microsoft home page</win-hyperlink-button>`,
      },
      {
        title: '处理 click 事件的超链接按钮',
        html: html`<win-hyperlink-button data-go>转到 ToggleButton 页面</win-hyperlink-button>`,
        setup(ex) {
          ex.querySelector('[data-go]')?.addEventListener('click', () => (location.hash = '#/toggle-button'));
        },
      },
    ],
  },
  {
    id: 'repeat-button',
    title: 'RepeatButton',
    category: 'basic-input',
    icon: '',
    tags: ['win-repeat-button'],
    description:
      '按住 RepeatButton 时会持续触发 click 事件：按下时立即触发一次，经过 delay 毫秒后每隔 interval 毫秒重复触发（默认均为 250ms）。',
    samples: [
      {
        title: '带文本内容的简单 RepeatButton',
        html: html`<win-repeat-button delay="500" interval="100">Click and hold</win-repeat-button>
<div class="output" data-output>点击次数：0</div>`,
        setup(ex) {
          let n = 0;
          ex.querySelector('win-repeat-button')!.addEventListener('click', () => out(ex, `点击次数：${++n}`));
        },
      },
    ],
  },
  {
    id: 'toggle-button',
    title: 'ToggleButton',
    category: 'basic-input',
    icon: '',
    tags: ['win-toggle-button'],
    description:
      'ToggleButton 是可以在选中与未选中状态之间切换的按钮；设置 three-state 后还支持不确定状态。选中时使用强调色填充。',
    samples: [
      {
        title: '带文本内容的简单 ToggleButton',
        html: html`<win-toggle-button>ToggleButton</win-toggle-button>
<div class="output" data-output>输出：Off</div>`,
        options: html`<win-check-box data-opt="disabled">禁用 ToggleButton</win-check-box>`,
        setup(ex, opt) {
          const t = ex.querySelector('win-toggle-button')!;
          t.addEventListener('change', () => out(ex, `输出：${t.checked ? 'On' : 'Off'}`));
          opt?.querySelector('[data-opt="disabled"]')?.addEventListener('change', (e) => {
            t.disabled = (e.target as HTMLInputElement).checked;
          });
        },
      },
    ],
  },
  {
    id: 'split-button',
    title: 'SplitButton',
    category: 'basic-input',
    icon: '',
    tags: ['win-split-button'],
    description: 'SplitButton 由两部分组成：主按钮执行默认操作，右侧的 V 形按钮打开浮出控件以选择其他选项。',
    related: ['toggle-split-button', 'drop-down-button'],
    samples: [
      {
        title: '控制文本颜色的 SplitButton',
        html: html`<div class="row">
  <win-split-button aria-label="文本颜色">
    <span data-swatch style="display:inline-block;width:20px;height:20px;border-radius:4px;background:#ff0000"></span>
    <win-flyout slot="flyout" placement="bottom-start">
      <div data-grid style="display:grid;grid-template-columns:repeat(3,32px);gap:8px"></div>
    </win-flyout>
  </win-split-button>
  <span data-sample style="font:var(--w-type-subtitle);color:#ff0000">示例文本</span>
</div>`,
        setup(ex) {
          const grid = ex.querySelector('[data-grid]')!;
          const sw = ex.querySelector<HTMLElement>('[data-swatch]')!;
          const sample = ex.querySelector<HTMLElement>('[data-sample]')!;
          const split = ex.querySelector('win-split-button')!;
          let current = COLORS[0]!;
          for (const c of COLORS) {
            const b = document.createElement('win-button');
            b.setAttribute('aria-label', c);
            b.style.cssText = `padding:0;width:32px;height:32px;min-width:0;background:${c};`;
            b.addEventListener('click', () => {
              current = c;
              sw.style.background = c;
              sample.style.color = c;
              split.flyout?.hide();
            });
            grid.append(b);
          }
          split.addEventListener('click', () => (sample.style.color = current));
        },
      },
    ],
  },
  {
    id: 'toggle-split-button',
    title: 'ToggleSplitButton',
    category: 'basic-input',
    icon: '',
    tags: ['win-toggle-split-button'],
    description:
      'ToggleSplitButton 的主按钮可以像 ToggleButton 一样开关，次按钮打开选项菜单；适合“项目符号列表 + 选择符号样式”这类场景。',
    samples: [
      {
        title: '用于项目符号列表的 ToggleSplitButton',
        html: html`<div class="row">
  <win-toggle-split-button aria-label="项目符号">
    <span data-bullet style="font-family:var(--w-font-family-icon)">&#xE8FD;</span>
    <win-menu-flyout slot="flyout" placement="bottom-start">
      <win-radio-menu-flyout-item group="bullets" checked data-b="•">● 圆点</win-radio-menu-flyout-item>
      <win-radio-menu-flyout-item group="bullets" data-b="■">■ 方块</win-radio-menu-flyout-item>
      <win-radio-menu-flyout-item group="bullets" data-b="1.">1. 数字</win-radio-menu-flyout-item>
      <win-radio-menu-flyout-item group="bullets" data-b="a.">a. 字母</win-radio-menu-flyout-item>
    </win-menu-flyout>
  </win-toggle-split-button>
  <div class="output" data-output>列表：关</div>
</div>`,
        setup(ex) {
          const t = ex.querySelector('win-toggle-split-button')!;
          let bullet = '•';
          const show = () => out(ex, t.checked ? `列表：开（符号 ${bullet}）` : '列表：关');
          t.addEventListener('change', show);
          for (const item of ex.querySelectorAll<HTMLElement>('win-radio-menu-flyout-item')) {
            item.addEventListener('click', () => {
              bullet = item.dataset.b ?? '•';
              t.checked = true;
              show();
            });
          }
        },
      },
    ],
  },
];

export default pages;
