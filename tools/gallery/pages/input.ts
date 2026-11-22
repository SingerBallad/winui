import { html, type GalleryPage } from './types.ts';

const out = (example: HTMLElement, text: string) => {
  const o = example.querySelector('[data-output]');
  if (o) o.textContent = text;
};

const opt = <T extends Element = HTMLElement>(options: HTMLElement | null, name: string) =>
  options?.querySelector<T & HTMLElement>(`[data-opt="${name}"]`) ?? null;

const FONTS = ['Arial', 'Comic Sans MS', 'Courier New', 'Segoe UI', 'Times New Roman'];

const pages: GalleryPage[] = [
  {
    id: 'check-box',
    title: 'CheckBox',
    category: 'basic-input',
    icon: '',
    tags: ['win-check-box'],
    description:
      'CheckBox 用于选中或取消选中某个操作项；也可以用于多选列表。设置 three-state 后支持“不确定”状态，常用于表示一组子项被部分选中。选中时勾选标记会以 Fluent 动画绘制出来。',
    docs: [{ label: 'CheckBox 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/checkbox' }],
    related: ['radio-button', 'toggle-switch'],
    samples: [
      {
        title: '两态 CheckBox',
        html: html`<win-check-box>Two-state CheckBox</win-check-box>
<div class="output" data-output>输出：未选中</div>`,
        options: html`<win-check-box data-opt="disabled">禁用 CheckBox</win-check-box>`,
        setup(ex, options) {
          const cb = ex.querySelector('win-check-box')!;
          cb.addEventListener('change', () => out(ex, `输出：${cb.checked ? '已选中' : '未选中'}`));
          opt(options, 'disabled')?.addEventListener('change', (e) => {
            cb.disabled = (e.target as HTMLInputElement).checked;
          });
        },
      },
      {
        title: '三态 CheckBox',
        html: html`<win-check-box three-state>Three-state CheckBox</win-check-box>
<div class="output" data-output>输出：未选中</div>`,
        setup(ex) {
          const cb = ex.querySelector('win-check-box')!;
          cb.addEventListener('change', () =>
            out(ex, `输出：${cb.indeterminate ? '不确定（Indeterminate）' : cb.checked ? '已选中' : '未选中'}`),
          );
        },
      },
      {
        title: '使用三态 CheckBox 实现“全选”',
        description: '父项根据子项状态显示选中、未选中或不确定；点击父项会同步所有子项。',
        html: html`<div class="col" style="gap:0">
  <win-check-box data-all three-state>Select all</win-check-box>
  <div style="padding-left:28px;display:flex;flex-direction:column">
    <win-check-box data-child>Option 1</win-check-box>
    <win-check-box data-child checked>Option 2</win-check-box>
    <win-check-box data-child>Option 3</win-check-box>
  </div>
</div>`,
        js: `// WinUI Gallery logic: Indeterminate is only ever set in code.
selectAll.addEventListener('change', () => {
  if (selectAll.indeterminate) {
    // A click on a fully checked parent cycles it to Indeterminate:
    // treat it as "uncheck all" instead.
    selectAll.indeterminate = false;
    selectAll.checked = false;
  }
  for (const o of options) o.checked = selectAll.checked;
});
for (const o of options) o.addEventListener('change', setCheckedState);`,
        setup(ex) {
          const all = ex.querySelector<HTMLElement & { checked: boolean; indeterminate: boolean }>('[data-all]')!;
          const kids = Array.from(ex.querySelectorAll<HTMLElement & { checked: boolean }>('[data-child]'));
          const setCheckedState = () => {
            const n = kids.filter((k) => k.checked).length;
            if (n === kids.length) {
              all.indeterminate = false;
              all.checked = true;
            } else if (n === 0) {
              all.indeterminate = false;
              all.checked = false;
            } else {
              all.checked = false;
              all.indeterminate = true;
            }
          };
          for (const k of kids) k.addEventListener('change', setCheckedState);
          all.addEventListener('change', () => {
            if (all.indeterminate) {
              all.indeterminate = false;
              all.checked = false;
            }
            for (const k of kids) k.checked = all.checked;
          });
          queueMicrotask(setCheckedState);
        },
      },
      {
        title: '各种状态',
        html: html`<div class="row">
  <win-check-box checked>Checked</win-check-box>
  <win-check-box indeterminate>Indeterminate</win-check-box>
  <win-check-box disabled>Disabled</win-check-box>
  <win-check-box checked disabled>Checked disabled</win-check-box>
  <win-check-box indeterminate disabled>Indeterminate disabled</win-check-box>
</div>`,
      },
    ],
  },
  {
    id: 'radio-button',
    title: 'RadioButton',
    category: 'basic-input',
    icon: '',
    tags: ['win-radio-group', 'win-radio-button'],
    description:
      'RadioButton 让用户从一组互斥选项中选择一个。推荐使用 RadioGroup 分组控件：它提供标题、单一 Tab 停靠点、方向键导航（选择跟随焦点）以及多列布局。',
    docs: [
      { label: 'RadioButton 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/radio-button' },
    ],
    related: ['check-box', 'combo-box'],
    samples: [
      {
        title: '使用 RadioGroup 分组',
        html: html`<win-radio-group header="Background color">
  <win-radio-button value="#FFFF0000">Red</win-radio-button>
  <win-radio-button value="#FF008000">Green</win-radio-button>
  <win-radio-button value="#FF0000FF">Blue</win-radio-button>
</win-radio-group>
<div data-swatch style="width:120px;height:48px;border-radius:4px;border:1px solid var(--w-card-stroke-color-default)"></div>`,
        options: html`<win-check-box data-opt="disabled">禁用 RadioGroup</win-check-box>`,
        setup(ex, options) {
          const group = ex.querySelector('win-radio-group')!;
          const sw = ex.querySelector<HTMLElement>('[data-swatch]')!;
          group.addEventListener('selectionchanged', (e) => {
            const v = (e as CustomEvent<{ value: string }>).detail.value ?? '';
            sw.style.background = `#${v.slice(3)}`;
          });
          opt(options, 'disabled')?.addEventListener('change', (e) => {
            group.disabled = (e.target as HTMLInputElement).checked;
          });
        },
      },
      {
        title: '多列 RadioGroup（max-columns）',
        html: html`<win-radio-group header="Options" max-columns="3">
  <win-radio-button>Item 1</win-radio-button>
  <win-radio-button>Item 2</win-radio-button>
  <win-radio-button checked>Item 3</win-radio-button>
  <win-radio-button>Item 4</win-radio-button>
  <win-radio-button>Item 5</win-radio-button>
  <win-radio-button>Item 6</win-radio-button>
  <win-radio-button>Item 7</win-radio-button>
</win-radio-group>`,
        options: html`<win-slider data-opt="cols" header="MaxColumns" min="1" max="4" value="3" tick-frequency="1" tick-placement="bottom-right" style="width:180px"></win-slider>`,
        setup(ex, options) {
          const group = ex.querySelector('win-radio-group')!;
          opt<HTMLElement & { value: number }>(options, 'cols')?.addEventListener('input', (e) => {
            group.maxColumns = (e.target as HTMLElement & { value: number }).value;
          });
        },
      },
      {
        title: '以 name 分组的独立 RadioButton',
        html: html`<div class="row">
  <win-radio-button name="sport" checked>Cycling</win-radio-button>
  <win-radio-button name="sport">Running</win-radio-button>
  <win-radio-button name="sport">Swimming</win-radio-button>
  <win-radio-button name="sport" disabled>Disabled</win-radio-button>
</div>
<div class="output" data-output>已选择：Cycling</div>`,
        setup(ex) {
          ex.addEventListener('change', (e) => {
            const t = e.target as HTMLElement;
            if (t.localName === 'win-radio-button') out(ex, `已选择：${t.textContent?.trim()}`);
          });
        },
      },
    ],
  },
  {
    id: 'toggle-switch',
    title: 'ToggleSwitch',
    category: 'basic-input',
    icon: '',
    tags: ['win-toggle-switch'],
    description:
      'ToggleSwitch 表示物理开关，用于立即生效的开/关设置。滑块悬停时放大、按下时拉伸，切换时平滑滑动；也可以直接拖动滑块。',
    docs: [{ label: 'ToggleSwitch 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/toggles' }],
    related: ['check-box', 'toggle-button'],
    samples: [
      {
        title: '简单的 ToggleSwitch',
        html: html`<div class="row">
  <win-toggle-switch header="Toggle work"></win-toggle-switch>
  <win-progress-ring data-ring active hidden></win-progress-ring>
</div>
<div class="output" data-output>未在工作</div>`,
        options: html`<win-check-box data-opt="disabled">禁用 ToggleSwitch</win-check-box>`,
        setup(ex, options) {
          const ts = ex.querySelector('win-toggle-switch')!;
          const ring = ex.querySelector<HTMLElement>('[data-ring]')!;
          ts.addEventListener('change', () => {
            ring.hidden = !ts.checked;
            out(ex, ts.checked ? '正在工作…' : '未在工作');
          });
          opt(options, 'disabled')?.addEventListener('change', (e) => {
            ts.disabled = (e.target as HTMLInputElement).checked;
          });
        },
      },
      {
        title: '自定义开/关内容',
        html: html`<win-toggle-switch on-content="Working" off-content="Do work" checked></win-toggle-switch>`,
      },
      {
        title: '开/关文字在左侧（content-placement="left"）',
        description: '开/关文字位于开关左侧，没有最小宽度，开关紧贴右边缘，适合放在设置项（SettingsCard）的右侧。',
        html: html`<div class="col" style="gap:4px;max-width:360px">
  <div class="row" style="justify-content:space-between"><span>Wi-Fi</span><win-toggle-switch content-placement="left" checked></win-toggle-switch></div>
  <div class="row" style="justify-content:space-between"><span>Bluetooth</span><win-toggle-switch content-placement="left"></win-toggle-switch></div>
  <div class="row" style="justify-content:space-between"><span>Airplane mode</span><win-toggle-switch content-placement="left" disabled></win-toggle-switch></div>
</div>`,
      },
      {
        title: '各种状态',
        html: html`<div class="row">
  <win-toggle-switch></win-toggle-switch>
  <win-toggle-switch checked></win-toggle-switch>
  <win-toggle-switch disabled></win-toggle-switch>
  <win-toggle-switch checked disabled></win-toggle-switch>
</div>`,
      },
    ],
  },
  {
    id: 'slider',
    title: 'Slider',
    category: 'basic-input',
    icon: '',
    tags: ['win-slider'],
    description:
      'Slider 让用户沿轨道拖动滑块，在一个范围内选择数值。支持步长（step）、刻度线（tick-frequency / tick-placement）、垂直方向，以及拖动时显示数值的提示。',
    docs: [{ label: 'Slider 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/slider' }],
    related: ['rating'],
    samples: [
      {
        title: '简单的 Slider',
        html: html`<win-slider style="width:300px" aria-label="simple slider"></win-slider>
<div class="output" data-output>值：0</div>`,
        options: html`<win-check-box data-opt="disabled">禁用 Slider</win-check-box>`,
        setup(ex, options) {
          const s = ex.querySelector('win-slider')!;
          s.addEventListener('input', () => out(ex, `值：${s.value}`));
          opt(options, 'disabled')?.addEventListener('change', (e) => {
            s.disabled = (e.target as HTMLInputElement).checked;
          });
        },
      },
      {
        title: '指定范围与步长的 Slider',
        html: html`<win-slider header="Value" min="500" max="1000" step="10" value="800" style="width:300px"></win-slider>
<div class="output" data-output>值：800（min 500，max 1000，step 10）</div>`,
        setup(ex) {
          const s = ex.querySelector('win-slider')!;
          s.addEventListener('input', () => out(ex, `值：${s.value}（min 500，max 1000，step 10）`));
        },
      },
      {
        title: '带刻度线的 Slider',
        html: html`<win-slider tick-frequency="20" tick-placement="outside" value="40" style="width:300px"></win-slider>`,
        options: html`<win-combo-box data-opt="placement" header="TickPlacement" style="width:180px">
  <win-combo-box-item value="top-left">TopLeft</win-combo-box-item>
  <win-combo-box-item value="bottom-right">BottomRight</win-combo-box-item>
  <win-combo-box-item value="outside" selected>Outside</win-combo-box-item>
  <win-combo-box-item value="inline">Inline</win-combo-box-item>
  <win-combo-box-item value="none">None</win-combo-box-item>
</win-combo-box>`,
        setup(ex, options) {
          const s = ex.querySelector('win-slider')!;
          opt(options, 'placement')?.addEventListener('selectionchanged', (e) => {
            s.tickPlacement = (e as CustomEvent<{ value: string }>).detail.value as typeof s.tickPlacement;
          });
        },
      },
      {
        title: '带范围与刻度的垂直 Slider',
        html: html`<win-slider orientation="vertical" min="-50" max="50" step="10" tick-frequency="10" tick-placement="outside" value="0" style="height:220px"></win-slider>`,
      },
    ],
  },
  {
    id: 'rating',
    title: 'Rating',
    category: 'basic-input',
    icon: '',
    tags: ['win-rating'],
    description:
      'Rating 让用户以星级进行评价。悬停时预览评分并以放大效果突出指针处的星星；再次点击当前值可清除评分（is-clear-enabled）。还支持占位值、只读与说明文字。',
    docs: [{ label: 'Rating 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/rating' }],
    related: ['slider'],
    samples: [
      {
        title: '简单的 Rating',
        html: html`<win-rating caption="1,024 ratings" placeholder-value="3"></win-rating>
<div class="output" data-output>未评分（占位值 3）</div>`,
        options: html`<win-check-box data-opt="clear" checked>IsClearEnabled</win-check-box>
<win-check-box data-opt="readonly">IsReadOnly</win-check-box>`,
        setup(ex, options) {
          const r = ex.querySelector('win-rating')!;
          r.addEventListener('valuechanged', () => out(ex, r.value < 0 ? '未评分（占位值 3）' : `评分：${r.value}`));
          opt(options, 'clear')?.addEventListener('change', (e) => {
            r.clearEnabled = (e.target as HTMLInputElement).checked;
          });
          opt(options, 'readonly')?.addEventListener('change', (e) => {
            r.readOnly = (e.target as HTMLInputElement).checked;
          });
        },
      },
      {
        title: '部分星级与禁用状态',
        html: html`<div class="col" style="gap:4px">
  <win-rating value="3.5" read-only caption="3.5（只读）"></win-rating>
  <win-rating value="4" disabled caption="禁用"></win-rating>
  <win-rating max-rating="10" value="7" caption="10 星制"></win-rating>
</div>`,
      },
    ],
  },
  {
    id: 'combo-box',
    title: 'ComboBox',
    category: 'basic-input',
    icon: '',
    tags: ['win-combo-box', 'win-combo-box-item'],
    description:
      'ComboBox 从下拉列表中选择一项。展开时选中项会恰好覆盖在字段上并从该处向外展开；支持标题、占位文本、说明、键盘（Alt+↓ / F4 展开，方向键直接切换选项，首字母定位）以及可编辑模式。',
    docs: [{ label: 'ComboBox 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/combo-box' }],
    related: ['radio-button', 'drop-down-button'],
    samples: [
      {
        title: '内联定义选项并设置宽度的 ComboBox',
        html: html`<win-combo-box header="Colors" placeholder="Pick a color" style="width:200px">
  <win-combo-box-item>Blue</win-combo-box-item>
  <win-combo-box-item>Green</win-combo-box-item>
  <win-combo-box-item>Red</win-combo-box-item>
  <win-combo-box-item>Yellow</win-combo-box-item>
</win-combo-box>
<div data-swatch style="width:100px;height:30px;border-radius:4px"></div>`,
        setup(ex) {
          const cb = ex.querySelector('win-combo-box')!;
          const sw = ex.querySelector<HTMLElement>('[data-swatch]')!;
          cb.addEventListener('selectionchanged', () => (sw.style.background = cb.value));
        },
      },
      {
        title: '通过 itemsSource 填充的 ComboBox',
        html: html`<win-combo-box header="Font" placeholder="Pick a font" style="width:200px"></win-combo-box>
<div data-preview style="font-size:16px">You can set the font used for this text.</div>`,
        js: `const cb = document.querySelector('win-combo-box');
cb.itemsSource = ['Arial', 'Comic Sans MS', 'Courier New', 'Segoe UI', 'Times New Roman'];
cb.addEventListener('selectionchanged', () => preview.style.fontFamily = cb.value);`,
        setup(ex) {
          const cb = ex.querySelector('win-combo-box')!;
          const pv = ex.querySelector<HTMLElement>('[data-preview]')!;
          cb.itemsSource = FONTS;
          cb.selectedIndex = 3;
          cb.addEventListener('selectionchanged', () => (pv.style.fontFamily = cb.value));
          pv.style.fontFamily = 'Segoe UI';
        },
      },
      {
        title: '可编辑的 ComboBox',
        description: '输入时自动补全匹配项；按 Enter 提交。输入不在列表中的值会触发 textsubmitted 事件。',
        html: html`<win-combo-box editable header="Font size" placeholder="Type or pick" style="width:200px">
  <win-combo-box-item>8</win-combo-box-item>
  <win-combo-box-item>9</win-combo-box-item>
  <win-combo-box-item>10</win-combo-box-item>
  <win-combo-box-item selected>11</win-combo-box-item>
  <win-combo-box-item>12</win-combo-box-item>
  <win-combo-box-item>14</win-combo-box-item>
  <win-combo-box-item>16</win-combo-box-item>
  <win-combo-box-item>18</win-combo-box-item>
  <win-combo-box-item>24</win-combo-box-item>
  <win-combo-box-item>36</win-combo-box-item>
</win-combo-box>
<div data-sample style="font-size:11px">The quick brown fox jumps over the lazy dog.</div>`,
        setup(ex) {
          const cb = ex.querySelector('win-combo-box')!;
          const sample = ex.querySelector<HTMLElement>('[data-sample]')!;
          const apply = (v: string) => {
            const n = Number(v);
            if (n > 0 && n <= 100) sample.style.fontSize = `${n}px`;
          };
          cb.addEventListener('selectionchanged', (e) => apply((e as CustomEvent<{ value: string }>).detail.value));
          cb.addEventListener('textsubmitted', (e) => apply((e as CustomEvent<{ text: string }>).detail.text));
        },
      },
      {
        title: '说明文字与禁用状态',
        html: html`<div class="row" style="align-items:flex-start">
  <win-combo-box header="Theme" description="更改会立即应用到整个应用。" style="width:220px">
    <win-combo-box-item selected>Light</win-combo-box-item>
    <win-combo-box-item>Dark</win-combo-box-item>
    <win-combo-box-item>Use system setting</win-combo-box-item>
  </win-combo-box>
  <win-combo-box header="Disabled" placeholder="Not available" disabled style="width:180px">
    <win-combo-box-item>One</win-combo-box-item>
  </win-combo-box>
</div>`,
      },
    ],
  },
  {
    id: 'color-picker',
    title: 'ColorPicker',
    category: 'basic-input',
    icon: '',
    tags: ['win-color-picker'],
    description:
      'ColorPicker 让用户通过色谱、亮度/透明度滑块以及 RGB、HSV、十六进制输入来选取颜色。色谱支持方形（Box）与圆形（Ring）两种形状，还可显示上一个颜色以便比较。',
    docs: [
      { label: 'ColorPicker 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/color-picker' },
    ],
    related: ['color-picker-button'],
    samples: [
      {
        title: '可配置的 ColorPicker',
        html: html`<win-color-picker color="#0078D4"></win-color-picker>
<div class="row"><span class="output" data-output>颜色：#0078D4</span><span data-swatch style="display:inline-block;width:48px;height:24px;border-radius:4px;background:#0078D4"></span></div>`,
        options: html`<win-combo-box data-opt="shape" header="ColorSpectrumShape" style="width:180px">
  <win-combo-box-item value="box" selected>Box</win-combo-box-item>
  <win-combo-box-item value="ring">Ring</win-combo-box-item>
</win-combo-box>
<win-check-box data-opt="alpha">IsAlphaEnabled</win-check-box>
<win-check-box data-opt="more">IsMoreButtonVisible</win-check-box>
<win-check-box data-opt="slider" checked>IsColorSliderVisible</win-check-box>
<win-check-box data-opt="channels" checked>IsColorChannelTextInputVisible</win-check-box>
<win-check-box data-opt="hex" checked>IsHexInputVisible</win-check-box>
<win-check-box data-opt="preview" checked>IsColorPreviewVisible</win-check-box>
<win-check-box data-opt="previous">显示 PreviousColor</win-check-box>`,
        setup(ex, options) {
          const cp = ex.querySelector('win-color-picker')!;
          const sw = ex.querySelector<HTMLElement>('[data-swatch]')!;
          cp.addEventListener('colorchanged', (e) => {
            const c = (e as CustomEvent<{ color: string }>).detail.color;
            sw.style.background = c;
            out(ex, `颜色：${c}`);
          });
          opt(options, 'shape')?.addEventListener('selectionchanged', (e) => {
            cp.colorSpectrumShape = (e as CustomEvent<{ value: string }>).detail.value as 'box' | 'ring';
          });
          const bind = (name: string, apply: (on: boolean) => void) =>
            opt(options, name)?.addEventListener('change', (e) => apply((e.target as HTMLInputElement).checked));
          bind('alpha', (on) => (cp.alphaEnabled = on));
          bind('more', (on) => (cp.moreButtonVisible = on));
          bind('slider', (on) => (cp.colorSliderVisible = on));
          bind('channels', (on) => (cp.colorChannelTextInputVisible = on));
          bind('hex', (on) => (cp.hexInputVisible = on));
          bind('preview', (on) => (cp.colorPreviewVisible = on));
          bind('previous', (on) => (cp.previousColor = on ? cp.color : ''));
        },
      },
      {
        title: '水平方向的圆形 ColorPicker',
        html: html`<win-color-picker orientation="horizontal" color-spectrum-shape="ring" color="#E3008C" alpha-enabled more-button-visible></win-color-picker>`,
      },
    ],
  },
  {
    id: 'color-picker-button',
    title: 'ColorPickerButton',
    category: 'basic-input',
    icon: '',
    tags: ['win-color-picker-button'],
    description:
      'ColorPickerButton 是显示当前颜色色块的下拉按钮，点击后在浮出控件中提供预设调色板与完整的 ColorPicker，适合工具栏中的颜色选择场景。设置 confirm 后浮出控件底部会出现“确定/取消”按钮，颜色只在点击“确定”时提交。',
    related: ['color-picker', 'drop-down-button'],
    samples: [
      {
        title: '带调色板的 ColorPickerButton',
        html: html`<div class="row">
  <win-color-picker-button color="#0078D4"></win-color-picker-button>
  <span data-text style="font:var(--w-type-subtitle);color:#0078D4">Hello, Fluent</span>
</div>`,
        setup(ex) {
          const b = ex.querySelector('win-color-picker-button')!;
          const t = ex.querySelector<HTMLElement>('[data-text]')!;
          b.addEventListener('colorchanged', () => (t.style.color = b.color));
        },
      },
      {
        title: '带确认按钮的 ColorPickerButton（confirm）',
        description:
          '拖动色谱、滑块或点选色板时只是预览；点击“确定”才提交颜色并触发 colorchanged。“取消”、Esc 或点击浮出控件外部都会放弃本次修改。',
        html: html`<div class="row">
  <win-color-picker-button confirm color="#107C10"></win-color-picker-button>
  <span data-text style="font:var(--w-type-subtitle);color:#107C10">Commit on OK</span>
</div>
<div class="output" data-output>已提交：#107C10</div>`,
        options: html`<win-check-box data-opt="confirm" checked>confirm（显示确定/取消）</win-check-box>`,
        setup(ex, options) {
          const b = ex.querySelector('win-color-picker-button')!;
          const t = ex.querySelector<HTMLElement>('[data-text]')!;
          b.addEventListener('colorchanged', () => {
            t.style.color = b.color;
            out(ex, `已提交：${b.color}`);
          });
          opt(options, 'confirm')?.addEventListener('change', (e) => {
            b.confirm = (e.target as HTMLInputElement).checked;
          });
        },
      },
      {
        title: '启用透明度并隐藏调色板',
        html: html`<win-color-picker-button color="#E8112380" alpha-enabled palette-visible="false"></win-color-picker-button>`,
      },
    ],
  },
  {
    id: 'segmented',
    title: 'Segmented',
    category: 'basic-input',
    icon: '',
    tags: ['win-segmented', 'win-segmented-item'],
    summary: '分段选择控件：在少量互斥选项之间切换。',
    description: `Segmented 在一组紧凑的分段按钮中选择一项（或多项），常见于照片、画图、设置等 Windows 11 应用。选中段呈现“抬起”的表面并带强调色指示条，切换时选中背景以点到点曲线滑动（增强）。支持图标、单选/多选，以及 Pivot 与 Button 两种变体样式。`,
    samples: [
      {
        title: '基本用法',
        html: html`<win-segmented selected-index="0" data-seg>
  <win-segmented-item>全部</win-segmented-item>
  <win-segmented-item>照片</win-segmented-item>
  <win-segmented-item>视频</win-segmented-item>
  <win-segmented-item>收藏夹</win-segmented-item>
</win-segmented>
<div class="output" data-output>已选择：全部</div>`,
        options: html`<win-check-box data-opt="disabled">禁用</win-check-box>`,
        setup(ex, opt) {
          const seg = ex.querySelector<HTMLElement & { disabled: boolean }>('[data-seg]')!;
          seg.addEventListener('selectionchanged', (e) => out(ex, `已选择：${(e as CustomEvent).detail.value}`));
          opt
            ?.querySelector('[data-opt="disabled"]')
            ?.addEventListener('change', (e) => (seg.disabled = !!(e.currentTarget as HTMLInputElement).checked));
        },
      },
      {
        title: '图标与图标 + 文本',
        html: html`<div class="row">
  <win-segmented selected-index="1">
    <win-segmented-item icon="&#xE8E4;" aria-label="左对齐"></win-segmented-item>
    <win-segmented-item icon="&#xE8E3;" aria-label="居中"></win-segmented-item>
    <win-segmented-item icon="&#xE8E2;" aria-label="右对齐"></win-segmented-item>
  </win-segmented>
  <win-segmented selected-index="0">
    <win-segmented-item icon="&#xE8FD;">列表</win-segmented-item>
    <win-segmented-item icon="&#xF0E2;">网格</win-segmented-item>
    <win-segmented-item icon="&#xE80A;">平铺</win-segmented-item>
  </win-segmented>
</div>`,
      },
      {
        title: '多选',
        html: html`<win-segmented selection-mode="multiple" data-multi>
  <win-segmented-item icon="&#xE8DD;" selected aria-label="加粗"></win-segmented-item>
  <win-segmented-item icon="&#xE8DB;" aria-label="倾斜"></win-segmented-item>
  <win-segmented-item icon="&#xE8DC;" aria-label="下划线"></win-segmented-item>
</win-segmented>
<div class="output" data-output></div>`,
        setup(ex) {
          ex.querySelector('[data-multi]')!.addEventListener('selectionchanged', (e) => {
            const items = (e as CustomEvent).detail.selectedItems as HTMLElement[];
            out(ex, `已选择：${items.map((i) => i.getAttribute('aria-label')).join('、') || '无'}`);
          });
        },
      },
      {
        title: 'Pivot 与 Button 样式',
        html: html`<div class="col">
  <win-segmented appearance="pivot" selected-index="0">
    <win-segmented-item>最近</win-segmented-item>
    <win-segmented-item>共享</win-segmented-item>
    <win-segmented-item>收藏</win-segmented-item>
  </win-segmented>
  <win-segmented appearance="button" selected-index="2">
    <win-segmented-item>日</win-segmented-item>
    <win-segmented-item>周</win-segmented-item>
    <win-segmented-item>月</win-segmented-item>
    <win-segmented-item>年</win-segmented-item>
  </win-segmented>
</div>`,
      },
      {
        title: '等宽拉伸',
        html: html`<win-segmented stretch selected-index="1" style="width:420px;max-width:100%">
  <win-segmented-item>小</win-segmented-item>
  <win-segmented-item>中</win-segmented-item>
  <win-segmented-item>大</win-segmented-item>
</win-segmented>`,
      },
    ],
  },
  {
    id: 'range-selector',
    title: 'RangeSelector',
    category: 'basic-input',
    icon: '',
    tags: ['win-range-selector'],
    summary: '用两个滑块选择一个数值区间。',
    description: `RangeSelector 是带两个滑块的 Slider，用于选择最小值与最大值构成的区间。外观完全沿用 WinUI Slider：4px 轨道、强调色区间、带内圆缩放动画（0.86 / 1.167 / 0.71）的滑块，拖动或键盘调整时以 ToolTip 显示当前值。`,
    samples: [
      {
        title: '价格区间',
        html: html`<win-range-selector header="价格（¥）" minimum="0" maximum="1000" range-start="200" range-end="750" step-frequency="10" data-rs style="width:360px"></win-range-selector>
<div class="output" data-output>¥200 – ¥750</div>`,
        setup(ex) {
          const rs = ex.querySelector<HTMLElement & { rangeStart: number; rangeEnd: number }>('[data-rs]')!;
          rs.addEventListener('valuechanged', () => out(ex, `¥${rs.rangeStart} – ¥${rs.rangeEnd}`));
        },
      },
      {
        title: '自定义格式与禁用状态',
        html: html`<div class="col">
  <win-range-selector header="营业时间" minimum="0" maximum="24" range-start="9" range-end="18" step-frequency="0.5" data-hours style="width:360px"></win-range-selector>
  <win-range-selector header="禁用" disabled range-start="30" range-end="60" style="width:360px"></win-range-selector>
</div>`,
        setup(ex) {
          const rs = ex.querySelector<HTMLElement & { formatter: (v: number) => string }>('[data-hours]')!;
          rs.formatter = (v) => `${String(Math.floor(v)).padStart(2, '0')}:${v % 1 ? '30' : '00'}`;
        },
      },
    ],
  },
];

export default pages;
