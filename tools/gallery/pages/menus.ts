import { html, type GalleryPage } from './types.ts';
import { StandardUICommand, UICommand } from '../../../components/menus/commands.ts';
import { flip, itemAdded, itemRemoved, settled } from '../../../motion/animate.ts';

type Checkable = HTMLElement & { checked?: boolean };

const out = (ex: HTMLElement, text: string) => {
  const o = ex.querySelector('[data-output]');
  if (o) o.textContent = text;
};

const onOption = (opt: HTMLElement | null, key: string, fn: (on: boolean) => void) => {
  opt?.querySelector(`[data-opt="${key}"]`)?.addEventListener('change', (e) => fn(!!(e.target as Checkable).checked));
};

const pages: GalleryPage[] = [
  {
    id: 'app-bar-button',
    title: 'AppBarButton',
    category: 'menus-toolbars',
    icon: '',
    tags: ['win-app-bar-button'],
    description:
      'AppBarButton 是专为应用栏（CommandBar）设计的按钮：上方 16px 图标、下方 12px 标签，宽 68px。放入 CommandBar 后会随其展开/收起切换为紧凑模式（隐藏标签并以工具提示显示），进入溢出菜单时变为菜单行样式。',
    docs: [
      { label: 'AppBarButton 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/command-bar' },
    ],
    related: ['app-bar-toggle-button', 'app-bar-separator', 'command-bar'],
    samples: [
      {
        title: '带 SymbolIcon 的 AppBarButton',
        html: html`<win-app-bar-button icon="Like" label="SymbolIcon" data-b></win-app-bar-button>
<div class="output" data-output></div>`,
        options: html`<win-check-box data-opt="compact">IsCompact</win-check-box>
<win-check-box data-opt="disabled">禁用</win-check-box>`,
        setup(ex, opt) {
          const b = ex.querySelector<HTMLElement & { compact: boolean; disabled: boolean }>('[data-b]')!;
          b.addEventListener('click', () => out(ex, `你点击了：${b.getAttribute('label')}`));
          onOption(opt, 'compact', (on) => (b.compact = on));
          onOption(opt, 'disabled', (on) => (b.disabled = on));
        },
      },
      {
        title: '使用 FontIcon、PathIcon 与 BitmapIcon 的 AppBarButton',
        html: html`<div class="row">
  <win-app-bar-button label="FontIcon"><win-font-icon slot="icon" glyph="&#xE790;" size="16"></win-font-icon></win-app-bar-button>
  <win-app-bar-button label="PathIcon"><win-path-icon slot="icon" size="16" view-box="0 0 16 16" data="M8 1.5l1.9 4.1 4.6.5-3.4 3.1.9 4.4L8 11.4l-4 2.2.9-4.4L1.5 6.1l4.6-.5z"></win-path-icon></win-app-bar-button>
  <win-app-bar-button label="Glyph" icon="&#xE7C3;"></win-app-bar-button>
</div>`,
      },
      {
        title: '带键盘快捷键的 AppBarButton（KeyboardAccelerator）',
        description:
          '设置 accelerator 后可直接按快捷键触发；标签隐藏时，工具提示会自动附带快捷键文本。示例使用浏览器不占用的组合键（F5、Ctrl+S 等会触发浏览器自身的功能）。',
        html: html`<div class="row">
  <win-app-bar-button icon="Save" label="保存" accelerator="Ctrl+Alt+S" data-b></win-app-bar-button>
  <win-app-bar-button icon="Refresh" label="刷新" accelerator="Ctrl+Alt+R" label-position="collapsed" data-b></win-app-bar-button>
</div>
<div class="output" data-output>按 Ctrl+Alt+S 或 Ctrl+Alt+R 试试。</div>`,
        setup(ex) {
          for (const b of ex.querySelectorAll<HTMLElement>('[data-b]')) {
            b.addEventListener('click', () =>
              out(ex, `已触发：${b.getAttribute('label')}（${new Date().toLocaleTimeString()}）`),
            );
          }
        },
      },
    ],
  },
  {
    id: 'app-bar-toggle-button',
    title: 'AppBarToggleButton',
    category: 'menus-toolbars',
    icon: '',
    tags: ['win-app-bar-toggle-button'],
    description:
      'AppBarToggleButton 是可切换的应用栏按钮：选中时以强调色填充；在 CommandBar 的溢出菜单中以勾选标记表示状态。支持 three-state 三态。',
    related: ['app-bar-button', 'command-bar'],
    samples: [
      {
        title: '带 SymbolIcon 的 AppBarToggleButton',
        html: html`<win-app-bar-toggle-button icon="Shuffle" label="Shuffle" data-b></win-app-bar-toggle-button>
<div class="output" data-output>IsChecked = False</div>`,
        options: html`<win-check-box data-opt="three">IsThreeState</win-check-box>
<win-check-box data-opt="disabled">禁用</win-check-box>`,
        setup(ex, opt) {
          const b = ex.querySelector<
            HTMLElement & { checked: boolean; indeterminate: boolean; threeState: boolean; disabled: boolean }
          >('[data-b]')!;
          b.addEventListener('change', () =>
            out(ex, `IsChecked = ${b.indeterminate ? 'Null' : b.checked ? 'True' : 'False'}`),
          );
          onOption(opt, 'three', (on) => (b.threeState = on));
          onOption(opt, 'disabled', (on) => (b.disabled = on));
        },
      },
      {
        title: '一组切换按钮',
        html: html`<div class="row">
  <win-app-bar-toggle-button icon="Bold" label="Bold" checked></win-app-bar-toggle-button>
  <win-app-bar-toggle-button icon="Italic" label="Italic"></win-app-bar-toggle-button>
  <win-app-bar-toggle-button icon="Underline" label="Underline"></win-app-bar-toggle-button>
</div>`,
      },
    ],
  },
  {
    id: 'app-bar-separator',
    title: 'AppBarSeparator',
    category: 'menus-toolbars',
    icon: '',
    tags: ['win-app-bar-separator'],
    description:
      'AppBarSeparator 在命令栏中以 1px 竖线（DividerStrokeColorDefault）分隔命令组；在溢出菜单中变为横向分隔线。',
    related: ['command-bar'],
    samples: [
      {
        title: '用 AppBarSeparator 分组的 AppBarButton',
        html: html`<win-command-bar style="width:fit-content">
  <win-app-bar-button icon="Camera" label="Camera"></win-app-bar-button>
  <win-app-bar-separator></win-app-bar-separator>
  <win-app-bar-button icon="Like" label="Like"></win-app-bar-button>
  <win-app-bar-button icon="Dislike" label="Dislike"></win-app-bar-button>
  <win-app-bar-separator></win-app-bar-separator>
  <win-app-bar-button icon="Orientation" label="Orientation"></win-app-bar-button>
</win-command-bar>`,
      },
    ],
  },
  {
    id: 'command-bar',
    title: 'CommandBar',
    category: 'menus-toolbars',
    icon: '',
    tags: ['win-command-bar'],
    badge: 'updated',
    description:
      'CommandBar 提供主命令（右对齐图标按钮）与次要命令（“更多”溢出菜单）。点击“…”展开时栏高度从 40px 展开到 56px 并显示标签；支持 Compact / Minimal / Hidden 三种关闭显示模式、标签位置（底部/右侧/折叠）与动态溢出（空间不足时把主命令移入溢出菜单）。',
    docs: [{ label: 'CommandBar 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/command-bar' }],
    related: ['app-bar-button', 'command-bar-flyout', 'menu-bar'],
    samples: [
      {
        title: '带主命令与次要命令的 CommandBar',
        html: html`<win-command-bar data-cb style="width:fit-content;min-width:420px">
  <win-app-bar-button icon="Add" label="Add" data-cmd></win-app-bar-button>
  <win-app-bar-button icon="Edit" label="Edit" data-cmd></win-app-bar-button>
  <win-app-bar-button icon="Share" label="Share" data-cmd></win-app-bar-button>
  <win-app-bar-button slot="secondary" icon="Setting" label="Settings" accelerator-text="Ctrl+I" data-cmd></win-app-bar-button>
  <win-app-bar-toggle-button slot="secondary" icon="Pin" label="Pin to Start" data-cmd></win-app-bar-toggle-button>
  <win-app-bar-separator slot="secondary"></win-app-bar-separator>
  <win-app-bar-button slot="secondary" icon="Delete" label="Delete" accelerator="Delete" data-cmd></win-app-bar-button>
</win-command-bar>
<div class="output" data-output></div>`,
        options: html`<win-radio-group header="DefaultLabelPosition" selected-index="0" data-pos>
  <win-radio-button value="bottom">Bottom</win-radio-button>
  <win-radio-button value="right">Right</win-radio-button>
  <win-radio-button value="collapsed">Collapsed</win-radio-button>
</win-radio-group>
<win-combo-box header="ClosedDisplayMode" selected-index="0" data-mode style="width:100%">
  <win-combo-box-item value="compact">Compact</win-combo-box-item>
  <win-combo-box-item value="minimal">Minimal</win-combo-box-item>
  <win-combo-box-item value="hidden">Hidden</win-combo-box-item>
</win-combo-box>
<win-check-box data-opt="open">IsOpen</win-check-box>`,
        setup(ex, opt) {
          const cb = ex.querySelector<
            HTMLElement & { isOpen: boolean; defaultLabelPosition: string; closedDisplayMode: string }
          >('[data-cb]')!;
          for (const c of ex.querySelectorAll<HTMLElement>('[data-cmd]')) {
            c.addEventListener('click', () => out(ex, `你点击了：${c.getAttribute('label')}`));
          }
          opt?.querySelector('[data-pos]')?.addEventListener('selectionchanged', (e) => {
            const v = (e as CustomEvent<{ value?: string }>).detail?.value;
            if (v) cb.defaultLabelPosition = v;
          });
          opt?.querySelector('[data-mode]')?.addEventListener('selectionchanged', (e) => {
            const v = (e as CustomEvent<{ value?: string }>).detail?.value;
            if (v) cb.closedDisplayMode = v;
          });
          onOption(opt, 'open', (on) => (cb.isOpen = on));
          cb.addEventListener('closed', () => {
            const box = opt?.querySelector<Checkable>('[data-opt="open"]');
            if (box?.checked) box.checked = false;
          });
        },
      },
      {
        title: '带内容与动态溢出的 CommandBar',
        description:
          '拖动右侧手柄（或聚焦后按 ←/→）改变容器宽度：空间不足时，主命令按 dynamic-overflow-order（未指定时从右向左）依次移入溢出菜单，并在其与次要命令之间插入分隔线。点击“…”展开时，栏向下（靠近窗口底部时向上）覆盖展开，内容“文档.docx”保持原位。',
        html: html`<div data-resize style="display:flex;width:520px;min-width:200px;max-width:100%;box-sizing:border-box;padding:4px 0;border:1px dashed var(--w-control-stroke-color-secondary);border-radius:4px">
  <win-command-bar style="flex:1 1 auto;min-width:0">
    <div slot="content" style="padding:0 8px;font:var(--w-type-body-strong)">文档.docx</div>
    <win-app-bar-button icon="Add" label="Add"></win-app-bar-button>
    <win-app-bar-button icon="Edit" label="Edit"></win-app-bar-button>
    <win-app-bar-button icon="Copy" label="Copy" dynamic-overflow-order="1"></win-app-bar-button>
    <win-app-bar-button icon="Paste" label="Paste" dynamic-overflow-order="2"></win-app-bar-button>
    <win-app-bar-button icon="Share" label="Share"></win-app-bar-button>
    <win-app-bar-button slot="secondary" label="Properties"></win-app-bar-button>
  </win-command-bar>
  <div data-grip role="separator" aria-orientation="vertical" aria-label="调整宽度" tabindex="0" style="flex:none;width:12px;margin:-4px 0;display:grid;place-items:center;cursor:ew-resize;touch-action:none;user-select:none;-webkit-user-select:none;outline-offset:-2px;border-radius:3px"><span style="width:2px;height:16px;border-radius:1px;background:var(--w-control-strong-stroke-color-default)"></span></div>
</div>`,
        setup(ex) {
          const box = ex.querySelector<HTMLElement>('[data-resize]')!;
          const grip = ex.querySelector<HTMLElement>('[data-grip]')!;
          const setWidth = (w: number) => {
            const max = (box.parentElement?.clientWidth ?? 600) - 32;
            box.style.width = `${Math.round(Math.max(200, Math.min(w, max)))}px`;
          };
          const width = () => box.getBoundingClientRect().width;
          grip.addEventListener('pointerdown', (e) => {
            if (e.button !== 0) return;
            e.preventDefault();
            grip.setPointerCapture(e.pointerId);
            const x0 = e.clientX;
            const w0 = width();
            const dir = getComputedStyle(box).direction === 'rtl' ? -1 : 1;
            const move = (ev: PointerEvent) => setWidth(w0 + dir * (ev.clientX - x0));
            const end = () => {
              grip.removeEventListener('pointermove', move);
              grip.removeEventListener('lostpointercapture', end);
            };
            grip.addEventListener('pointermove', move);
            grip.addEventListener('lostpointercapture', end);
          });
          grip.addEventListener('keydown', (e) => {
            const step = e.shiftKey ? 64 : 16;
            if (e.key === 'ArrowLeft' || e.key === 'ArrowRight')
              setWidth(width() + (e.key === 'ArrowRight' ? step : -step));
            else if (e.key === 'Home') setWidth(0);
            else if (e.key === 'End') setWidth(Number.POSITIVE_INFINITY);
            else return;
            e.preventDefault();
          });
        },
      },
      {
        title: 'DefaultLabelPosition="Right"',
        html: html`<win-command-bar default-label-position="right" style="width:fit-content">
  <win-app-bar-button icon="Add" label="New"></win-app-bar-button>
  <win-app-bar-button icon="OpenFile" label="Open"></win-app-bar-button>
  <win-app-bar-button icon="Save" label="Save"></win-app-bar-button>
  <win-app-bar-button slot="secondary" label="Print" accelerator-text="Ctrl+P"></win-app-bar-button>
</win-command-bar>`,
      },
    ],
  },
  {
    id: 'command-bar-flyout',
    title: 'CommandBarFlyout',
    category: 'menus-toolbars',
    icon: '',
    tags: ['win-command-bar-flyout'],
    description:
      'CommandBarFlyout 以浮出控件形式显示一组紧凑的主命令（仅图标，标签作为工具提示），点击“…”可在下方展开次要命令菜单；常用于图片或文本选区的上下文操作。',
    related: ['command-bar', 'menu-flyout'],
    samples: [
      {
        title: '针对图片的 CommandBarFlyout',
        description: '单击按钮或在图片上右键打开。',
        html: html`<div class="row" style="align-items:flex-start">
  <div context-flyout="cbf-image" data-img style="width:220px;height:140px;border-radius:8px;background:linear-gradient(135deg,var(--w-system-accent-color-light2),var(--w-system-accent-color-dark1));display:grid;place-items:center;color:#fff;font:var(--w-type-subtitle)">图片</div>
  <win-button data-open>显示 CommandBarFlyout</win-button>
</div>
<win-command-bar-flyout id="cbf-image" placement="right-start">
  <win-app-bar-button icon="Share" label="Share" data-cmd></win-app-bar-button>
  <win-app-bar-button icon="Save" label="Save" data-cmd></win-app-bar-button>
  <win-app-bar-button icon="Delete" label="Delete" data-cmd></win-app-bar-button>
  <win-app-bar-button slot="secondary" icon="FontSize" label="Resize" data-cmd></win-app-bar-button>
  <win-app-bar-button slot="secondary" icon="Rotate" label="Rotate" accelerator-text="Ctrl+R" data-cmd></win-app-bar-button>
  <win-app-bar-button slot="secondary" icon="Crop" label="Crop" data-cmd></win-app-bar-button>
</win-command-bar-flyout>
<div class="output" data-output></div>`,
        setup(ex) {
          const f = ex.querySelector<HTMLElement & { showAt(a: Element, o?: object): void }>('win-command-bar-flyout')!;
          ex.querySelector('[data-open]')!.addEventListener('click', () =>
            f.showAt(ex.querySelector('[data-img]')!, { placement: 'right-start' }),
          );
          for (const c of ex.querySelectorAll<HTMLElement>('[data-cmd]')) {
            c.addEventListener('click', () => out(ex, `你点击了：${c.getAttribute('label')}`));
          }
        },
      },
      {
        title: '始终展开（AlwaysExpanded）',
        html: html`<win-button data-open>文本格式</win-button>
<win-command-bar-flyout always-expanded placement="bottom-start">
  <win-app-bar-toggle-button icon="Bold" label="Bold"></win-app-bar-toggle-button>
  <win-app-bar-toggle-button icon="Italic" label="Italic"></win-app-bar-toggle-button>
  <win-app-bar-toggle-button icon="Underline" label="Underline"></win-app-bar-toggle-button>
  <win-app-bar-button slot="secondary" icon="Cut" label="Cut" accelerator-text="Ctrl+X"></win-app-bar-button>
  <win-app-bar-button slot="secondary" icon="Copy" label="Copy" accelerator-text="Ctrl+C"></win-app-bar-button>
  <win-app-bar-button slot="secondary" icon="Paste" label="Paste" accelerator-text="Ctrl+V"></win-app-bar-button>
</win-command-bar-flyout>`,
        setup(ex) {
          const f = ex.querySelector<HTMLElement & { showAt(a: Element, o?: object): void }>('win-command-bar-flyout')!;
          const b = ex.querySelector<HTMLElement>('[data-open]')!;
          b.addEventListener('click', () => f.showAt(b, { placement: 'bottom-start' }));
        },
      },
    ],
  },
  {
    id: 'menu-bar',
    title: 'MenuBar',
    category: 'menus-toolbars',
    icon: '',
    tags: ['win-menu-bar', 'win-menu-bar-item'],
    description:
      'MenuBar 以水平菜单栏组织命令：点击标题打开菜单，菜单打开时悬停其他标题会直接切换；←/→ 在菜单间移动，F10 或单独按 Alt 聚焦菜单栏，Alt+字母打开对应菜单。MenuBarItem 本身也会触发 click 并执行 command；扩展：MenuBarItem 可通过 icon 在标题前显示图标。',
    docs: [{ label: 'MenuBar 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/menus' }],
    related: ['menu-flyout', 'command-bar'],
    samples: [
      {
        title: '简单的 MenuBar',
        html: html`<win-menu-bar data-stretch>
  <win-menu-bar-item title="File">
    <win-menu-flyout-item text="New"></win-menu-flyout-item>
    <win-menu-flyout-item text="Open..."></win-menu-flyout-item>
    <win-menu-flyout-item text="Save"></win-menu-flyout-item>
    <win-menu-flyout-item text="Exit"></win-menu-flyout-item>
  </win-menu-bar-item>
  <win-menu-bar-item title="Edit">
    <win-menu-flyout-item text="Undo"></win-menu-flyout-item>
    <win-menu-flyout-item text="Cut"></win-menu-flyout-item>
    <win-menu-flyout-item text="Copy"></win-menu-flyout-item>
    <win-menu-flyout-item text="Paste"></win-menu-flyout-item>
  </win-menu-bar-item>
  <win-menu-bar-item title="Help">
    <win-menu-flyout-item text="About"></win-menu-flyout-item>
  </win-menu-bar-item>
</win-menu-bar>
<div class="output" data-output></div>`,
        setup(ex) {
          ex.addEventListener('win-menu-invoke', (e) => {
            const item = e.target as HTMLElement;
            out(ex, `你选择了：${item.getAttribute('text') ?? item.textContent}`);
          });
        },
      },
      {
        title: '带快捷键、子菜单、分隔线与单选项的 MenuBar',
        html: html`<win-menu-bar data-stretch>
  <win-menu-bar-item title="File">
    <win-menu-flyout-sub-item text="New">
      <win-menu-flyout-item text="Plain Text Document" accelerator="Ctrl+N" accelerator-mode="text-only"></win-menu-flyout-item>
      <win-menu-flyout-item text="Rich Text Document"></win-menu-flyout-item>
      <win-menu-flyout-item text="Other Formats..."></win-menu-flyout-item>
    </win-menu-flyout-sub-item>
    <win-menu-flyout-item text="Open..." accelerator="Ctrl+O" accelerator-mode="text-only"></win-menu-flyout-item>
    <win-menu-flyout-item text="Save" accelerator="Ctrl+S" accelerator-mode="text-only"></win-menu-flyout-item>
    <win-menu-flyout-separator></win-menu-flyout-separator>
    <win-menu-flyout-item text="Exit" accelerator="Ctrl+E" accelerator-mode="text-only"></win-menu-flyout-item>
  </win-menu-bar-item>
  <win-menu-bar-item title="Edit">
    <win-menu-flyout-item text="Undo" accelerator="Ctrl+Z" accelerator-mode="text-only"></win-menu-flyout-item>
    <win-menu-flyout-item text="Cut" accelerator="Ctrl+X" accelerator-mode="text-only"></win-menu-flyout-item>
    <win-menu-flyout-item text="Copy" accelerator="Ctrl+C" accelerator-mode="text-only"></win-menu-flyout-item>
    <win-menu-flyout-item text="Paste" accelerator="Ctrl+V" accelerator-mode="text-only"></win-menu-flyout-item>
  </win-menu-bar-item>
  <win-menu-bar-item title="View">
    <win-menu-flyout-item text="Output"></win-menu-flyout-item>
    <win-menu-flyout-separator></win-menu-flyout-separator>
    <win-radio-menu-flyout-item text="Landscape" group="orientation"></win-radio-menu-flyout-item>
    <win-radio-menu-flyout-item text="Portrait" group="orientation" checked></win-radio-menu-flyout-item>
    <win-menu-flyout-separator></win-menu-flyout-separator>
    <win-radio-menu-flyout-item text="Small icons" group="size"></win-radio-menu-flyout-item>
    <win-radio-menu-flyout-item text="Medium icons" group="size" checked></win-radio-menu-flyout-item>
    <win-radio-menu-flyout-item text="Large icons" group="size"></win-radio-menu-flyout-item>
  </win-menu-bar-item>
  <win-menu-bar-item title="Help" data-help>
    <win-menu-flyout-item text="About"></win-menu-flyout-item>
  </win-menu-bar-item>
</win-menu-bar>
<div class="output" data-output>提示：按 F10 或 Alt 进入菜单栏，Alt+V 打开 View。</div>`,
        setup(ex) {
          ex.addEventListener('win-menu-invoke', (e) => {
            const item = e.target as HTMLElement;
            out(ex, `你选择了：${item.getAttribute('text') ?? item.textContent}`);
          });
          ex.querySelector('[data-help]')?.addEventListener('click', (e) => {
            if (e.target === e.currentTarget) out(ex, 'MenuBarItem 自身触发了 click');
          });
        },
      },
      {
        title: '带图标的 MenuBar（扩展）',
        description:
          '在 MenuBarItem 上设置 icon（与其他控件相同的图标语法，或 slot="icon"）即可在标题前显示 16px 图标；菜单项与子菜单项同样用 icon 显示图标。打开菜单时整个菜单窗口从标题下方滑出，菜单项在窗口内保持不动。',
        html: html`<win-menu-bar data-stretch>
  <win-menu-bar-item title="File" icon="Document">
    <win-menu-flyout-sub-item text="New" icon="Add">
      <win-menu-flyout-item text="Plain Text Document" icon="Page"></win-menu-flyout-item>
      <win-menu-flyout-item text="Rich Text Document" icon="Font"></win-menu-flyout-item>
      <win-menu-flyout-item text="Folder" icon="NewFolder"></win-menu-flyout-item>
    </win-menu-flyout-sub-item>
    <win-menu-flyout-item text="Open..." icon="OpenFile"></win-menu-flyout-item>
    <win-menu-flyout-item text="Save" icon="Save"></win-menu-flyout-item>
    <win-menu-flyout-separator></win-menu-flyout-separator>
    <win-menu-flyout-item text="Print" icon="Print"></win-menu-flyout-item>
  </win-menu-bar-item>
  <win-menu-bar-item title="Edit" icon="Edit">
    <win-menu-flyout-item text="Undo" icon="Undo"></win-menu-flyout-item>
    <win-menu-flyout-item text="Redo" icon="Redo"></win-menu-flyout-item>
    <win-menu-flyout-separator></win-menu-flyout-separator>
    <win-menu-flyout-item text="Cut" icon="Cut"></win-menu-flyout-item>
    <win-menu-flyout-item text="Copy" icon="Copy"></win-menu-flyout-item>
    <win-menu-flyout-item text="Paste" icon="Paste"></win-menu-flyout-item>
  </win-menu-bar-item>
  <win-menu-bar-item title="View" icon="View">
    <win-toggle-menu-flyout-item text="Full screen" icon="FullScreen"></win-toggle-menu-flyout-item>
    <win-menu-flyout-sub-item text="Zoom" icon="Zoom">
      <win-radio-menu-flyout-item text="75%" group="zoom-icons"></win-radio-menu-flyout-item>
      <win-radio-menu-flyout-item text="100%" group="zoom-icons" checked></win-radio-menu-flyout-item>
      <win-radio-menu-flyout-item text="150%" group="zoom-icons"></win-radio-menu-flyout-item>
    </win-menu-flyout-sub-item>
  </win-menu-bar-item>
  <win-menu-bar-item title="Help">
    <win-font-icon slot="icon" glyph="&#xE897;" size="16"></win-font-icon>
    <win-menu-flyout-item text="About" icon="Info"></win-menu-flyout-item>
  </win-menu-bar-item>
</win-menu-bar>
<div class="output" data-output></div>`,
        setup(ex) {
          ex.addEventListener('win-menu-invoke', (e) => {
            const item = e.target as HTMLElement;
            out(ex, `你选择了：${item.getAttribute('text') ?? item.textContent}`);
          });
        },
      },
    ],
  },
  {
    id: 'menu-flyout',
    title: 'MenuFlyout',
    category: 'menus-toolbars',
    icon: '',
    tags: [
      'win-menu-flyout',
      'win-menu-flyout-item',
      'win-toggle-menu-flyout-item',
      'win-radio-menu-flyout-item',
      'win-menu-flyout-sub-item',
      'win-menu-flyout-separator',
    ],
    description:
      'MenuFlyout 显示一组命令或选项的菜单：鼠标打开时菜单项更紧凑（30px），触控打开时更宽松；自动为图标与勾选标记预留对齐列，支持快捷键文本、切换项、单选项、级联子菜单、首字母跳转与完整键盘导航。可通过 context-flyout 作为右键菜单使用。',
    docs: [
      {
        label: '菜单与上下文菜单文档',
        href: 'https://learn.microsoft.com/windows/apps/design/controls/menus-and-context-menus',
      },
    ],
    related: ['menu-bar', 'command-bar-flyout', 'flyout'],
    samples: [
      {
        title: '简单的 MenuFlyout',
        html: html`<win-button>Options
  <win-menu-flyout slot="flyout" placement="bottom-start">
    <win-menu-flyout-item text="Reset"></win-menu-flyout-item>
    <win-menu-flyout-separator></win-menu-flyout-separator>
    <win-toggle-menu-flyout-item text="Repeat"></win-toggle-menu-flyout-item>
    <win-toggle-menu-flyout-item text="Shuffle"></win-toggle-menu-flyout-item>
  </win-menu-flyout>
</win-button>
<div class="output" data-output></div>`,
        setup(ex) {
          ex.addEventListener('win-menu-invoke', (e) => {
            const item = e.target as HTMLElement & { checked?: boolean };
            out(
              ex,
              `你点击了：${item.getAttribute('text')}${item.checked !== undefined ? `（${item.checked ? '已选中' : '未选中'}）` : ''}`,
            );
          });
        },
      },
      {
        title: '带图标与快捷键的 MenuFlyout',
        html: html`<win-button>Edit
  <win-menu-flyout slot="flyout" placement="bottom-start">
    <win-menu-flyout-item icon="Cut" text="Cut" accelerator="Ctrl+X" accelerator-mode="text-only"></win-menu-flyout-item>
    <win-menu-flyout-item icon="Copy" text="Copy" accelerator="Ctrl+C" accelerator-mode="text-only"></win-menu-flyout-item>
    <win-menu-flyout-item icon="Paste" text="Paste" accelerator="Ctrl+V" accelerator-mode="text-only"></win-menu-flyout-item>
    <win-menu-flyout-separator></win-menu-flyout-separator>
    <win-menu-flyout-item icon="SelectAll" text="Select All" accelerator="Ctrl+A" accelerator-mode="text-only"></win-menu-flyout-item>
    <win-menu-flyout-item icon="Delete" text="Delete" accelerator="Delete" disabled accelerator-mode="text-only"></win-menu-flyout-item>
  </win-menu-flyout>
</win-button>`,
      },
      {
        title: '带级联子菜单与单选项的 MenuFlyout',
        html: html`<win-button>Sort and view
  <win-menu-flyout slot="flyout" placement="bottom-start">
    <win-menu-flyout-sub-item text="Sort by" icon="Sort">
      <win-radio-menu-flyout-item text="Name" group="sort" checked></win-radio-menu-flyout-item>
      <win-radio-menu-flyout-item text="Date modified" group="sort"></win-radio-menu-flyout-item>
      <win-radio-menu-flyout-item text="Size" group="sort"></win-radio-menu-flyout-item>
      <win-menu-flyout-separator></win-menu-flyout-separator>
      <win-radio-menu-flyout-item text="Ascending" group="dir" checked></win-radio-menu-flyout-item>
      <win-radio-menu-flyout-item text="Descending" group="dir"></win-radio-menu-flyout-item>
    </win-menu-flyout-sub-item>
    <win-menu-flyout-sub-item text="View" icon="View">
      <win-radio-menu-flyout-item text="Large icons" group="view"></win-radio-menu-flyout-item>
      <win-radio-menu-flyout-item text="Details" group="view" checked></win-radio-menu-flyout-item>
    </win-menu-flyout-sub-item>
    <win-menu-flyout-separator></win-menu-flyout-separator>
    <win-menu-flyout-item text="Refresh" icon="Refresh" accelerator="F5" accelerator-mode="text-only"></win-menu-flyout-item>
  </win-menu-flyout>
</win-button>`,
      },
      {
        title: '作为上下文菜单（ContextFlyout）',
        description: '在下方区域右键，或聚焦后按 Shift+F10 / 菜单键。',
        html: html`<div tabindex="0" context-flyout="ctx-menu" style="height:96px;border:1px dashed var(--w-control-strong-stroke-color-default);border-radius:8px;display:grid;place-items:center;color:var(--w-text-fill-color-secondary)" data-stretch>右键单击此处</div>
<win-menu-flyout id="ctx-menu">
  <win-menu-flyout-item icon="Share" text="Share"></win-menu-flyout-item>
  <win-menu-flyout-item icon="Copy" text="Copy" accelerator="Ctrl+C" accelerator-mode="text-only"></win-menu-flyout-item>
  <win-menu-flyout-item icon="Delete" text="Delete" accelerator="Delete" accelerator-mode="text-only"></win-menu-flyout-item>
  <win-menu-flyout-separator></win-menu-flyout-separator>
  <win-menu-flyout-item text="Rename"></win-menu-flyout-item>
  <win-menu-flyout-item text="Select"></win-menu-flyout-item>
</win-menu-flyout>`,
      },
    ],
  },
  {
    id: 'standard-ui-command',
    title: 'StandardUICommand',
    category: 'menus-toolbars',
    icon: '',
    tags: [],
    description:
      'StandardUICommand 提供 16 个平台标准命令（剪切、复制、粘贴、全选、删除、共享、保存、打开、关闭、播放、暂停、停止、前进、后退、撤消、重做），预置图标、标签、快捷键与描述；同一个命令对象可以同时用于按钮、菜单项与快捷键，并通过 canExecute 统一启用/禁用。',
    related: ['ui-command', 'keyboard-accelerator'],
    samples: [
      {
        title: '在列表中使用 Delete 命令',
        description:
          '选择一项后点击“删除”或按 Delete 键：被删除的项先淡出缩小，其余项再平滑上移补位（AddDeleteThemeTransition）；“添加”的新项淡入放大。↑/↓ 在项目间移动。',
        html: html`<div class="col" data-stretch style="max-width:420px">
  <win-command-bar style="width:fit-content" default-label-position="right">
    <win-app-bar-button data-add></win-app-bar-button>
    <win-app-bar-button data-delete></win-app-bar-button>
  </win-command-bar>
  <div data-list role="listbox" aria-label="项目" style="display:flex;flex-direction:column;gap:4px"></div>
</div>
<div class="output" data-output></div>`,
        js: `const del = new StandardUICommand('delete', {
  execute: () => removeItem(selected),   // itemRemoved(), then flip() the rest
  canExecute: () => !!selected,
});
deleteButton.command = del;`,
        setup(ex) {
          const list = ex.querySelector<HTMLElement>('[data-list]')!;
          const output = ex.querySelector<HTMLElement>('[data-output]')!;
          const MAX = 8;
          let counter = 0;
          let selected: HTMLElement | null = null;
          const rows = () =>
            Array.from(list.children).filter(
              (r): r is HTMLElement => r instanceof HTMLElement && !r.hasAttribute('data-removing'),
            );
          const select = (row: HTMLElement | null, focus: boolean) => {
            selected = row?.isConnected && !row.hasAttribute('data-removing') ? row : null;
            const live = rows();
            for (const r of live) {
              const on = r === selected;
              r.setAttribute('aria-selected', String(on));
              r.style.outline = on ? '2px solid var(--w-accent-fill-color-default)' : '';
              r.tabIndex = on || (!selected && r === live[0]) ? 0 : -1;
            }
            if (focus) selected?.focus();
            del.notifyCanExecuteChanged();
          };
          const makeRow = () => {
            const row = document.createElement('div');
            row.setAttribute('role', 'option');
            row.setAttribute('aria-selected', 'false');
            row.tabIndex = -1;
            row.textContent = `项目 ${++counter}`;
            row.style.cssText =
              'padding:8px 12px;border-radius:4px;outline-offset:-2px;background:var(--w-subtle-fill-color-secondary);cursor:default;user-select:none;-webkit-user-select:none';
            row.addEventListener('click', () => select(row, true));
            return row;
          };
          const add = new UICommand({
            label: '添加',
            icon: 'Add',
            description: '添加新项目',
            execute: () => {
              const row = makeRow();
              flip([output], () => list.append(row));
              itemAdded(row);
              if (!selected) select(null, false);
              add.notifyCanExecuteChanged();
              out(ex, `已添加：${row.textContent}`);
            },
            canExecute: () => rows().length < MAX,
          });
          const del = new StandardUICommand('delete', {
            execute: () => {
              const row = selected;
              if (!row || row.hasAttribute('data-removing')) return;
              const live = rows();
              const i = live.indexOf(row);
              const hadFocus = row.contains(document.activeElement);
              row.setAttribute('data-removing', '');
              select(live[i + 1] ?? live[i - 1] ?? null, hadFocus);
              row.inert = true;
              add.notifyCanExecuteChanged();
              out(ex, `已删除：${row.textContent}${rows().length ? '' : '（列表已清空，点击“添加”）'}`);
              void settled(itemRemoved(row)).then(() => {
                if (!row.isConnected) return;
                flip([...rows(), output], () => row.remove());
              });
            },
            canExecute: () => !!selected,
          });
          ex.querySelector<HTMLElement & { command: unknown }>('[data-add]')!.command = add;
          ex.querySelector<HTMLElement & { command: unknown }>('[data-delete]')!.command = del;
          for (let i = 0; i < 5; i++) list.append(makeRow());
          select(null, false);
          list.addEventListener('keydown', (e) => {
            const live = rows();
            if (!live.length) return;
            const i = selected ? live.indexOf(selected) : -1;
            let next: number;
            if (e.key === 'ArrowDown') next = Math.min(live.length - 1, i + 1);
            else if (e.key === 'ArrowUp') next = Math.max(0, i - 1);
            else if (e.key === 'Home') next = 0;
            else if (e.key === 'End') next = live.length - 1;
            else return;
            e.preventDefault();
            select(live[next] ?? null, true);
          });
          ex.addEventListener('keydown', (e) => {
            if (e.key !== 'Delete' || e.defaultPrevented || !selected) return;
            e.preventDefault();
            del.execute();
          });
        },
      },
      {
        title: '所有 StandardUICommand',
        html: html`<div class="row" data-all style="gap:4px"></div>`,
        setup(ex) {
          const host = ex.querySelector('[data-all]')!;
          for (const k of [
            'cut',
            'copy',
            'paste',
            'select-all',
            'delete',
            'share',
            'save',
            'open',
            'close',
            'pause',
            'play',
            'stop',
            'forward',
            'backward',
            'undo',
            'redo',
          ]) {
            const b = document.createElement('win-app-bar-button') as HTMLElement & { command: unknown };
            b.command = new StandardUICommand(k, { execute: () => out(ex, `执行：${k}`) });
            host.append(b);
          }
          host.insertAdjacentHTML('afterend', '<div class="output" data-output></div>');
        },
      },
    ],
  },
  {
    id: 'ui-command',
    title: 'UICommand',
    category: 'menus-toolbars',
    icon: '',
    tags: [],
    description:
      'UICommand 用于定义自定义命令：标签、图标、快捷键、描述与 execute/canExecute 逻辑集中定义一次，绑定到 AppBarButton、菜单项等多个入口。',
    related: ['standard-ui-command', 'keyboard-accelerator'],
    samples: [
      {
        title: '自定义“添加”命令同时用于按钮与菜单',
        description:
          '同一个命令对象绑定到按钮与菜单项；按钮上还注册了快捷键 Ctrl+Alt+N。每次执行都会添加一个带入场动画的新项目，超过 8 个时最早的项目淡出、其余项目平滑补位。',
        html: html`<div class="row">
  <win-command-bar style="width:fit-content" default-label-position="right"><win-app-bar-button data-add accelerator="Ctrl+Alt+N"></win-app-bar-button></win-command-bar>
  <win-button>菜单
    <win-menu-flyout slot="flyout" placement="bottom-start"><win-menu-flyout-item data-add></win-menu-flyout-item></win-menu-flyout>
  </win-button>
</div>
<div class="row" data-items style="gap:6px;min-height:28px"></div>
<div class="output" data-output>计数：0</div>`,
        js: `const add = new UICommand({
  label: 'Add', icon: 'Add', accelerator: 'Ctrl+Alt+N',
  description: 'Create a new item',
  execute: () => addItem(),   // itemAdded() on the new item
});
button.command = add;
menuItem.command = add;`,
        setup(ex) {
          const items = ex.querySelector<HTMLElement>('[data-items]')!;
          let n = 0;
          const live = (except?: Element) =>
            Array.from(items.children).filter(
              (c): c is HTMLElement => c instanceof HTMLElement && c !== except && !c.hasAttribute('data-removing'),
            );
          const add = new UICommand({
            label: '添加',
            icon: 'Add',
            accelerator: 'Ctrl+Alt+N',
            description: '创建新项目',
            execute: () => {
              const chip = document.createElement('span');
              chip.textContent = `项目 ${++n}`;
              chip.style.cssText =
                'display:inline-flex;align-items:center;height:28px;padding:0 12px;box-sizing:border-box;border-radius:14px;background:var(--w-accent-fill-color-default);color:var(--w-text-on-accent-fill-color-primary);font:var(--w-type-caption);user-select:none;-webkit-user-select:none';
              items.append(chip);
              itemAdded(chip);
              const current = live();
              if (current.length > 8) {
                const old = current[0]!;
                old.setAttribute('data-removing', '');
                void settled(itemRemoved(old)).then(() => {
                  if (old.isConnected) flip(live(old), () => old.remove());
                });
              }
              out(ex, `计数：${n}`);
            },
          });
          for (const el of ex.querySelectorAll<HTMLElement & { command: unknown }>('[data-add]')) el.command = add;
        },
      },
    ],
  },
  {
    id: 'keyboard-accelerator',
    title: 'KeyboardAccelerator',
    category: 'menus-toolbars',
    icon: '',
    tags: [],
    description:
      '为任意元素设置 accelerator="Ctrl+S"（可用逗号分隔多个）即可注册全局快捷键：按下时调用该元素的 click。可用 accelerator-scope 把快捷键限定在某个区域内（焦点在其中时才生效）；在文本框中按普通编辑键不会被截获。',
    related: ['standard-ui-command', 'menu-flyout'],
    samples: [
      {
        title: '按钮与菜单项上的快捷键',
        html: html`<div class="row">
  <win-button accelerator="Ctrl+Alt+B" data-k>粗体（Ctrl+Alt+B）</win-button>
  <win-button accelerator="Alt+Shift+N, Ctrl+Alt+N" data-k>新建（Alt+Shift+N 或 Ctrl+Alt+N）</win-button>
  <win-button>更多
    <win-menu-flyout slot="flyout" placement="bottom-start">
      <win-menu-flyout-item text="打印" accelerator="Ctrl+Alt+P" data-k></win-menu-flyout-item>
    </win-menu-flyout>
  </win-button>
</div>
<div class="output" data-output>按下快捷键试试——菜单关闭时菜单项的快捷键同样有效。</div>`,
        setup(ex) {
          for (const el of ex.querySelectorAll<HTMLElement>('[data-k]')) {
            el.addEventListener('click', () =>
              out(
                ex,
                `已触发：${el.getAttribute('text') ?? el.textContent?.trim()}（${new Date().toLocaleTimeString()}）`,
              ),
            );
          }
        },
      },
      {
        title: '限定作用域（accelerator-scope）',
        html: html`<div accelerator-scope tabindex="0" style="padding:12px;border:1px dashed var(--w-control-strong-stroke-color-default);border-radius:8px" data-stretch>
  <div style="margin-bottom:8px">只有焦点在此区域内时，Ctrl+Alt+L 才会生效。</div>
  <win-button accelerator="Ctrl+Alt+L" data-k>锁定</win-button>
</div>
<div class="output" data-output></div>`,
        setup(ex) {
          ex.querySelector('[data-k]')?.addEventListener('click', () =>
            out(ex, `锁定已触发（${new Date().toLocaleTimeString()}）`),
          );
        },
      },
    ],
  },

  {
    id: 'content-dialog',
    title: 'ContentDialog',
    category: 'dialogs-flyouts',
    icon: '',
    tags: ['win-content-dialog'],
    description:
      'ContentDialog 是模态对话框：打开时以烟雾层遮罩并阻止与页面交互，标题 20px 半粗，底部最多三个按钮（主要、次要、关闭），默认按钮使用强调色；Esc 等同于关闭按钮。打开/关闭动画与 WinUI 一致（缩放 1.05↔1 + 淡入淡出）。',
    docs: [
      {
        label: '对话框文档',
        href: 'https://learn.microsoft.com/windows/apps/design/controls/dialogs-and-flyouts/dialogs',
      },
    ],
    related: ['flyout', 'teaching-tip'],
    samples: [
      {
        title: '包含内容的基本对话框',
        html: html`<win-button data-show>显示对话框</win-button>
<win-content-dialog title="Save your work?" primary-button-text="Save" secondary-button-text="Don't Save" close-button-text="Cancel" default-button="primary">
  <div style="display:flex;flex-direction:column;gap:12px">
    <span>Lorem ipsum dolor sit amet, adipisicing elit.</span>
    <win-check-box>Upload your content to the cloud.</win-check-box>
  </div>
</win-content-dialog>
<div class="output" data-output></div>`,
        js: `const result = await dialog.showAsync(); // 'primary' | 'secondary' | 'none'`,
        setup(ex) {
          const d = ex.querySelector<HTMLElement & { showAsync(): Promise<string> }>('win-content-dialog')!;
          ex.querySelector('[data-show]')!.addEventListener('click', async () => {
            const r = await d.showAsync();
            out(
              ex,
              r === 'primary'
                ? '用户保存了他们的工作'
                : r === 'secondary'
                  ? '用户没有保存他们的工作'
                  : '用户取消了对话框',
            );
          });
        },
      },
      {
        title: '阻止关闭（取消主按钮单击）',
        description:
          '在 primarybuttonclick 中调用 preventDefault()（或 detail.cancel = true）即可在校验失败时保持对话框打开。',
        html: html`<win-button data-show>登录</win-button>
<win-content-dialog title="登录" primary-button-text="登录" close-button-text="取消" default-button="primary">
  <div style="display:flex;flex-direction:column;gap:8px;min-width:280px">
    <win-text-box header="用户名" placeholder="请输入用户名" data-user></win-text-box>
    <win-password-box header="密码" placeholder="请输入密码"></win-password-box>
    <span data-err style="color:var(--w-system-fill-color-critical);font:var(--w-type-caption)"></span>
  </div>
</win-content-dialog>
<div class="output" data-output></div>`,
        setup(ex) {
          const d = ex.querySelector<HTMLElement & { showAsync(): Promise<string> }>('win-content-dialog')!;
          const user = ex.querySelector<HTMLElement & { value: string }>('[data-user]')!;
          const err = ex.querySelector<HTMLElement>('[data-err]')!;
          d.addEventListener('primarybuttonclick', (e) => {
            if (!user.value.trim()) {
              e.preventDefault();
              err.textContent = '请输入用户名。';
            }
          });
          ex.querySelector('[data-show]')!.addEventListener('click', async () => {
            err.textContent = '';
            const r = await d.showAsync();
            out(ex, r === 'primary' ? `欢迎，${user.value}` : '已取消');
          });
        },
      },
      {
        title: '无默认按钮、仅关闭按钮',
        html: html`<win-button data-show>关于</win-button>
<win-content-dialog title="WinUI 3 Gallery · Web" close-button-text="确定">
  以 generic.xaml 为准复刻的 WinUI 3 控件库。
</win-content-dialog>`,
        setup(ex) {
          const d = ex.querySelector<HTMLElement & { showAsync(): Promise<string> }>('win-content-dialog')!;
          ex.querySelector('[data-show]')!.addEventListener('click', () => void d.showAsync());
        },
      },
    ],
  },
  {
    id: 'flyout',
    title: 'Flyout',
    category: 'dialogs-flyouts',
    icon: '',
    tags: ['win-flyout'],
    description:
      'Flyout 是轻量的浮出容器，可显示任意内容；点击外部或按 Esc 即关闭（轻量关闭）。默认放置在目标上方，支持 FlyoutPlacementMode 的全部放置方式并在空间不足时自动翻转。',
    docs: [
      {
        label: 'Flyout 文档',
        href: 'https://learn.microsoft.com/windows/apps/design/controls/dialogs-and-flyouts/flyouts',
      },
    ],
    related: ['menu-flyout', 'teaching-tip', 'content-dialog'],
    samples: [
      {
        title: '带 Flyout 的按钮',
        html: html`<win-button>Empty cart
  <win-flyout slot="flyout">
    <div style="display:flex;flex-direction:column;gap:12px;max-width:280px">
      <div class="w-body-strong">All items will be removed. Do you want to continue?</div>
      <win-button data-yes>Yes, empty my cart</win-button>
    </div>
  </win-flyout>
</win-button>
<div class="output" data-output></div>`,
        setup(ex) {
          ex.querySelector('[data-yes]')!.addEventListener('click', (e) => {
            (e.currentTarget as HTMLElement).closest<HTMLElement & { hide(): void }>('win-flyout')?.hide();
            out(ex, '购物车已清空');
          });
        },
      },
      {
        title: '放置方式（Placement）',
        html: html`<div class="row" style="gap:8px">
  <win-button data-p="top">Top</win-button>
  <win-button data-p="bottom">Bottom</win-button>
  <win-button data-p="left">Left</win-button>
  <win-button data-p="right">Right</win-button>
  <win-button data-p="bottom-start">BottomEdgeAlignedLeft</win-button>
  <win-button data-p="full">Full</win-button>
</div>
<win-flyout data-f><div style="max-width:260px">这个 Flyout 的放置方式为 <b data-name></b>。</div></win-flyout>`,
        setup(ex) {
          const f = ex.querySelector<HTMLElement & { showAt(a: Element, o?: object): void }>('[data-f]')!;
          for (const b of ex.querySelectorAll<HTMLElement>('[data-p]')) {
            b.addEventListener('click', () => {
              f.querySelector('[data-name]')!.textContent = b.textContent;
              f.showAt(b, { placement: b.dataset.p });
            });
          }
        },
      },
    ],
  },
  {
    id: 'teaching-tip',
    title: 'TeachingTip',
    category: 'dialogs-flyouts',
    icon: '',
    tags: ['win-teaching-tip'],
    description:
      'TeachingTip 是半持久的上下文提示：可以用尾巴指向目标元素（13 种放置方式，空间不足自动翻转），也可以不设目标而停靠在窗口边缘/角落；支持图标、Hero 内容、操作按钮与关闭按钮；启用轻量关闭时使用亚克力背景且不显示关闭按钮。',
    docs: [
      {
        label: 'TeachingTip 文档',
        href: 'https://learn.microsoft.com/windows/apps/design/controls/dialogs-and-flyouts/teaching-tip',
      },
    ],
    related: ['flyout', 'tool-tip'],
    samples: [
      {
        title: '显示指向目标的 TeachingTip',
        html: html`<win-button id="tt-save">保存</win-button>
<win-teaching-tip target="tt-save" title="Saving automatically" subtitle="We save your changes as you go - so you never have to."></win-teaching-tip>`,
        options: html`<win-combo-box header="PreferredPlacement" selected-index="0" data-pl style="width:100%">
  ${[
    'auto',
    'top',
    'bottom',
    'left',
    'right',
    'top-right',
    'top-left',
    'bottom-right',
    'bottom-left',
    'left-top',
    'left-bottom',
    'right-top',
    'right-bottom',
    'center',
  ]
    .map((p) => `<win-combo-box-item value="${p}">${p}</win-combo-box-item>`)
    .join('')}
</win-combo-box>
<win-check-box data-opt="light">IsLightDismissEnabled</win-check-box>`,
        setup(ex, opt) {
          const tip = ex.querySelector<
            HTMLElement & { isOpen: boolean; preferredPlacement: string; isLightDismissEnabled: boolean }
          >('win-teaching-tip')!;
          ex.querySelector('#tt-save')!.addEventListener('click', () => (tip.isOpen = true));
          opt?.querySelector('[data-pl]')?.addEventListener('selectionchanged', (e) => {
            tip.preferredPlacement = (e as CustomEvent<{ value?: string }>).detail?.value ?? 'auto';
            if (tip.isOpen) {
              tip.isOpen = false;
              requestAnimationFrame(() => (tip.isOpen = true));
            }
          });
          onOption(opt, 'light', (on) => (tip.isLightDismissEnabled = on));
        },
      },
      {
        title: '不指向目标、带操作按钮的 TeachingTip',
        html: html`<win-button data-show>显示 TeachingTip</win-button>
<win-teaching-tip title="Saving automatically" subtitle="We save your changes as you go - so you never have to." icon="Save" action-button-content="Disable" close-button-content="Got it!" preferred-placement="bottom-right"></win-teaching-tip>
<div class="output" data-output></div>`,
        setup(ex) {
          const tip = ex.querySelector<HTMLElement & { isOpen: boolean }>('win-teaching-tip')!;
          ex.querySelector('[data-show]')!.addEventListener('click', () => (tip.isOpen = true));
          tip.addEventListener('actionbuttonclick', () => {
            out(ex, '已禁用自动保存');
            tip.isOpen = false;
          });
          tip.addEventListener('closed', (e) =>
            out(ex, `关闭原因：${(e as CustomEvent<{ reason: string }>).detail.reason}`),
          );
        },
      },
      {
        title: '带 Hero 内容的 TeachingTip',
        html: html`<win-button id="tt-hero">新功能</win-button>
<win-teaching-tip target="tt-hero" title="试试新的照片编辑器" subtitle="裁剪、旋转并一键增强你的照片。" preferred-placement="bottom">
  <div slot="hero" style="height:140px;background:linear-gradient(135deg,var(--w-system-accent-color-light2),var(--w-system-accent-color-dark2));display:grid;place-items:center;color:#fff;font:var(--w-type-title)">✦</div>
</win-teaching-tip>`,
        setup(ex) {
          const tip = ex.querySelector<HTMLElement & { isOpen: boolean }>('win-teaching-tip')!;
          ex.querySelector('#tt-hero')!.addEventListener('click', () => (tip.isOpen = true));
        },
      },
    ],
  },
  {
    id: 'popover',
    title: 'Popover',
    category: 'dialogs-flyouts',
    icon: '',
    tags: ['win-popover'],
    description:
      'Popup 是没有任何外观的顶层容器，按其在页面中的位置加上 horizontal-offset / vertical-offset 定位（或使用 placement-target + desired-placement）；可选轻量关闭与 PopupTheme / PaneTheme 过渡动画。',
    related: ['flyout', 'teaching-tip'],
    samples: [
      {
        title: '显示一个 Popup',
        html: html`<div style="position:relative">
  <win-button data-show>显示 Popup</win-button>
  <win-popover vertical-offset="44" transition="popup" data-p>
    <div style="padding:16px;width:260px;background:var(--w-solid-background-fill-color-tertiary);border:1px solid var(--w-surface-stroke-color-default);border-radius:8px;box-shadow:var(--w-elevation-flyout);display:flex;flex-direction:column;gap:12px">
      <div class="w-body-strong">Simple Popup</div>
      <div>这是一个 Popup（未启用轻量关闭），点击按钮或按 Esc 关闭。</div>
      <win-button data-close>关闭</win-button>
    </div>
  </win-popover>
</div>`,
        setup(ex) {
          const p = ex.querySelector<HTMLElement & { isOpen: boolean }>('[data-p]')!;
          ex.querySelector('[data-show]')!.addEventListener('click', () => (p.isOpen = true));
          ex.querySelector('[data-close]')!.addEventListener('click', () => (p.isOpen = false));
          const onKey = (e: KeyboardEvent) => {
            if (e.key === 'Escape' && !e.defaultPrevented && p.isOpen) p.isOpen = false;
          };
          document.addEventListener('keydown', onKey);
          return () => document.removeEventListener('keydown', onKey);
        },
      },
      {
        title: '轻量关闭的 Popup（PaneThemeTransition）',
        html: html`<div style="position:relative">
  <win-button data-show>从右侧滑入</win-button>
  <win-popover is-light-dismiss-enabled horizontal-offset="140" transition="pane-right" data-p>
    <div class="w-acrylic" style="padding:16px;width:220px;border:1px solid var(--w-surface-stroke-color-flyout);border-radius:8px;box-shadow:var(--w-elevation-flyout)">点击外部关闭</div>
  </win-popover>
</div>`,
        setup(ex) {
          const p = ex.querySelector<HTMLElement & { isOpen: boolean }>('[data-p]')!;
          ex.querySelector('[data-show]')!.addEventListener('click', () => (p.isOpen = true));
        },
      },
    ],
  },

  {
    id: 'tool-tip',
    title: 'ToolTip',
    category: 'status-info',
    icon: '',
    tags: ['win-tool-tip'],
    description:
      'ToolTip 在指针悬停约 0.4 秒后显示简短说明：鼠标触发时居中显示在指针上方，键盘聚焦时显示在元素上方；在相邻元素间移动时立即切换。可用 <win-tool-tip for="id"> 提供富内容，或直接在任意元素上写 tooltip="文本"；元素带 accelerator 时自动附加快捷键。',
    docs: [{ label: 'ToolTip 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/tooltips' }],
    related: ['teaching-tip', 'app-bar-button'],
    samples: [
      {
        title: '带简单 ToolTip 的按钮',
        html: html`<win-button tooltip="Simple ToolTip">Button with a simple ToolTip.</win-button>`,
      },
      {
        title: '带富内容 ToolTip 的元素',
        html: html`<div class="row">
  <span id="tt-rich" tabindex="0" style="padding:4px 8px;border-radius:4px;background:var(--w-subtle-fill-color-secondary)">悬停查看图片提示</span>
  <win-tool-tip for="tt-rich">
    <div style="display:flex;flex-direction:column;gap:6px">
      <div style="width:200px;height:90px;border-radius:4px;background:linear-gradient(135deg,var(--w-system-accent-color-light2),var(--w-system-accent-color-dark1))"></div>
      <span>ToolTip 可以包含任意内容。</span>
    </div>
  </win-tool-tip>
</div>`,
      },
      {
        title: '放置与快捷键',
        html: html`<div class="row">
  <win-button id="tt-b">placement="bottom"</win-button>
  <win-tool-tip for="tt-b" placement="bottom" placement-element>显示在按钮下方</win-tool-tip>
  <win-button tooltip="保存文件" accelerator="Ctrl+S" accelerator-mode="text-only">带快捷键</win-button>
  <win-button id="tt-r">placement="right"</win-button>
  <win-tool-tip for="tt-r" placement="right" placement-element>显示在右侧</win-tool-tip>
</div>`,
      },
    ],
  },
];

export default pages;
