import { html, type GalleryPage } from './types.ts';
import { people } from './data.ts';

type Detail<T> = CustomEvent<T>;

const out = (example: HTMLElement, text: string) => {
  const o = example.querySelector('[data-output]');
  if (o) o.textContent = text;
};

const isChecked = (el: EventTarget | null) => !!(el as { checked?: boolean } | null)?.checked;

const CATS = [
  'Abyssinian',
  'Aegean',
  'American Bobtail',
  'American Curl',
  'American Ringtail',
  'American Shorthair',
  'American Wirehair',
  'Aphrodite Giant',
  'Arabian Mau',
  'Asian cat',
  'Asian Semi-longhair',
  'Australian Mist',
  'Balinese',
  'Bambino',
  'Bengal',
  'Birman',
  'Bombay',
  'Brazilian Shorthair',
  'British Longhair',
  'British Shorthair',
  'Burmese',
  'Burmilla',
  'California Spangled',
  'Chantilly-Tiffany',
  'Chartreux',
  'Chausie',
  'Colorpoint Shorthair',
  'Cornish Rex',
  'Cymric',
  'Cyprus',
  'Devon Rex',
  'Donskoy',
  'Dragon Li',
  'Dwelf',
  'Egyptian Mau',
  'European Shorthair',
  'Exotic Shorthair',
  'Foldex',
  'German Rex',
  'Havana Brown',
  'Highlander',
  'Himalayan',
  'Japanese Bobtail',
  'Javanese',
  'Khao Manee',
  'Korat',
  'Korean Bobtail',
  'Korn Ja',
  'Kurilian Bobtail',
  'LaPerm',
  'Lykoi',
  'Maine Coon',
  'Manx',
  'Mekong Bobtail',
  'Minskin',
  'Munchkin',
  'Nebelung',
  'Norwegian Forest Cat',
  'Ocicat',
  'Ojos Azules',
  'Oregon Rex',
  'Oriental Bicolor',
  'Oriental Longhair',
  'Oriental Shorthair',
  'Persian',
  'Peterbald',
  'Pixie-bob',
  'Ragamuffin',
  'Ragdoll',
  'Russian Blue',
  'Savannah',
  'Scottish Fold',
  'Selkirk Rex',
  'Siamese',
  'Siberian',
  'Singapura',
  'Snowshoe',
  'Sokoke',
  'Somali',
  'Sphynx',
  'Suphalak',
  'Thai',
  'Tonkinese',
  'Toyger',
  'Turkish Angora',
  'Turkish Van',
  'Ukrainian Levkoy',
];

const LOREM =
  'Linked text containers allow text which does not fit in one element to overflow into a different element on the page. Creative use of linked text containers enables basic multicolumn support and other advanced page layouts. ' +
  'Duis sed nulla metus, id hendrerit velit. Curabitur dolor purus, bibendum eu cursus lacinia, interdum vel augue. Aenean euismod eros et sapien vehicula dictum. Duis ullamcorper, turpis at feugiat blandit, lectus est fermentum sem, sed tincidunt magna enim vitae libero. ' +
  'Morbi in nunc nibh, at aliquet velit. Nulla facilisi. Phasellus tempor, nisi id iaculis mattis, nibh eros blandit tortor, at tincidunt diam massa vitae orci. Integer porta metus sed nisl consectetur id auctor sem ullamcorper. Aenean euismod tincidunt nunc a mattis.';

const FONT_COLORS = ['#000000', '#C42B1C', '#CA5010', '#9D5D00', '#0F7B0F', '#005FB8', '#8764B8', '#E3008C', '#7A7574'];

const pages: GalleryPage[] = [
  {
    id: 'text-block',
    title: 'TextBlock',
    category: 'text',
    icon: '',
    tags: ['win-text-block'],
    description:
      'TextBlock 是用于显示只读文本的基础控件。通过 text-style 套用 WinUI 的类型渐变样式（Caption、Body、Subtitle、Title 等），并支持换行、截断、最大行数、文本选择与字符间距。',
    docs: [{ label: 'TextBlock 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/text-block' }],
    related: ['rich-text-block', 'text-box'],
    samples: [
      {
        title: '简单的 TextBlock',
        html: html`<win-text-block>I am a TextBlock.</win-text-block>`,
      },
      {
        title: '应用了类型渐变样式的 TextBlock',
        description:
          '与 XAML 的 CaptionTextBlockStyle、BodyTextBlockStyle … DisplayTextBlockStyle 一一对应（Segoe UI Variable Small / Text / Display 光学尺寸）。',
        html: html`<div class="col" style="gap:4px">
  <win-text-block text-style="caption">Caption</win-text-block>
  <win-text-block text-style="body">Body</win-text-block>
  <win-text-block text-style="body-strong">Body Strong</win-text-block>
  <win-text-block text-style="body-large">Body Large</win-text-block>
  <win-text-block text-style="subtitle">Subtitle</win-text-block>
  <win-text-block text-style="title">Title</win-text-block>
  <win-text-block text-style="title-large">Title Large</win-text-block>
  <win-text-block text-style="display">Display</win-text-block>
</div>`,
      },
      {
        title: '设置了多种属性的 TextBlock',
        html: html`<win-text-block character-spacing="200" style="font-family: Arial; font-size: 24px; font-style: italic; color: CornflowerBlue">I am a styled TextBlock.</win-text-block>`,
      },
      {
        title: '包含内联文本元素的 TextBlock',
        html: html`<win-text-block text-wrapping="wrap" style="max-width: 520px">Text in a TextBlock doesn't have to be a simple string. It can contain <b>bold</b>, <i>italic</i>, <u>underlined</u> text, <b><i>combinations</i></b>, <span style="color: var(--w-accent-text-fill-color-primary)">colored runs</span>, and even <a href="https://learn.microsoft.com/windows/apps/design/controls/text-block" target="_blank" rel="noopener">hyperlinks</a>.</win-text-block>`,
      },
      {
        title: '换行、截断与最大行数',
        description:
          '默认 TextBlock 不换行（TextWrapping = NoWrap）；可设置 text-wrapping、text-trimming 与 max-lines。',
        html: html`<win-text-block data-demo style="width: 320px" text-wrapping="no-wrap" text-trimming="character-ellipsis">Windows App SDK 让开发者能够使用 WinUI 3 打造现代化的桌面应用程序，这段较长的文本用于演示 TextBlock 的换行、截断与 MaxLines 行为。</win-text-block>`,
        options: html`<win-toggle-button data-opt="wrap">换行</win-toggle-button>
<win-toggle-button data-opt="trim" checked>省略号截断</win-toggle-button>
<win-number-box data-opt="lines" header="最大行数（0 = 不限）" value="0" minimum="0" maximum="5" spin-button-placement-mode="inline"></win-number-box>
<win-toggle-button data-opt="select">允许选择文本</win-toggle-button>`,
        setup(ex, opt) {
          const tb = ex.querySelector<HTMLElement & { maxLines: number }>('[data-demo]')!;
          const wrap = opt!.querySelector('[data-opt="wrap"]')!;
          const trim = opt!.querySelector('[data-opt="trim"]')!;
          const lines = opt!.querySelector<HTMLElement & { value: number }>('[data-opt="lines"]')!;
          const sel = opt!.querySelector('[data-opt="select"]')!;
          wrap.addEventListener('change', () => tb.setAttribute('text-wrapping', isChecked(wrap) ? 'wrap' : 'no-wrap'));
          trim.addEventListener('change', () =>
            tb.setAttribute('text-trimming', isChecked(trim) ? 'character-ellipsis' : 'none'),
          );
          lines.addEventListener('valuechanged', () => (tb.maxLines = Number.isNaN(lines.value) ? 0 : lines.value));
          sel.addEventListener('change', () => tb.toggleAttribute('is-text-selection-enabled', isChecked(sel)));
        },
      },
    ],
  },
  {
    id: 'rich-text-block',
    title: 'RichTextBlock',
    category: 'text',
    icon: '',
    tags: ['win-rich-text-block'],
    description:
      'RichTextBlock 显示富文本：段落与内联元素（粗体、斜体、下划线、超链接、高亮等）。默认可选择文本，支持首行缩进、最大行数，并可像 RichTextBlockOverflow 那样把溢出内容排入多栏。',
    docs: [
      { label: 'RichTextBlock 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/rich-text-block' },
    ],
    related: ['text-block', 'rich-edit-box'],
    samples: [
      {
        title: '简单的 RichTextBlock',
        html: html`<win-rich-text-block style="max-width: 560px" paragraph-spacing="12">
  <p>I am a RichTextBlock. Text can be <b>bold</b>, <i>italic</i>, <u>underlined</u>, or <b><i><u>all at once</u></i></b>.</p>
  <p>RichTextBlock supports <a href="https://learn.microsoft.com/windows/apps/design/controls/rich-text-block" target="_blank" rel="noopener">inline hyperlinks</a>, <code>inline code</code>, and <span style="font-size: 18px">different font sizes</span> in one paragraph.</p>
</win-rich-text-block>`,
      },
      {
        title: '带溢出分栏的 RichTextBlock（RichTextBlockOverflow）',
        description: '固定高度内容按列流动：第一列放不下的文本自动溢出到后续列。',
        html: html`<win-rich-text-block data-stretch columns="3" column-gap="24" text-indent="12" style="height: 180px" text-alignment="justify">
  <p>${LOREM}</p>
</win-rich-text-block>`,
        options: html`<win-number-box data-opt="cols" header="列数" value="3" minimum="1" maximum="4" spin-button-placement-mode="inline"></win-number-box>`,
        setup(ex, opt) {
          const rtb = ex.querySelector<HTMLElement & { columns: number }>('win-rich-text-block')!;
          const cols = opt!.querySelector<HTMLElement & { value: number }>('[data-opt="cols"]')!;
          cols.addEventListener('valuechanged', () => (rtb.columns = Number.isNaN(cols.value) ? 1 : cols.value));
        },
      },
      {
        title: '文本选择与高亮（TextHighlighter）',
        html: html`<win-rich-text-block data-demo style="max-width: 560px">
  <p>Select some text with the mouse or keyboard. <mark>Highlighted runs</mark> use the TextHighlighter colors, and the selection uses the system accent color.</p>
</win-rich-text-block>
<div class="output" data-output></div>`,
        options: html`<win-toggle-button data-opt="sel" checked>IsTextSelectionEnabled</win-toggle-button>`,
        setup(ex, opt) {
          const rtb = ex.querySelector<HTMLElement & { isTextSelectionEnabled: boolean }>('[data-demo]')!;
          const t = opt!.querySelector('[data-opt="sel"]')!;
          t.addEventListener('change', () => (rtb.isTextSelectionEnabled = isChecked(t)));
          const onSel = () => {
            const s = document.getSelection()?.toString() ?? '';
            if (s && rtb.contains(document.getSelection()?.anchorNode ?? null)) out(ex, `已选择：“${s}”`);
          };
          document.addEventListener('selectionchange', onSel);
          return () => document.removeEventListener('selectionchange', onSel);
        },
      },
      {
        title: '限制最大行数',
        html: html`<win-rich-text-block max-lines="2" style="max-width: 420px">
  <p>${LOREM}</p>
</win-rich-text-block>`,
      },
    ],
  },
  {
    id: 'text-box',
    title: 'TextBox',
    category: 'text',
    icon: '',
    tags: ['win-text-box'],
    description:
      'TextBox 让用户输入单行或多行纯文本。获得焦点时底部显示 2px 强调色描边；非空且获得焦点时出现删除按钮。支持标题、占位文本、描述、只读、最大长度、拼写检查、InputScope，并参与 HTML 表单。',
    docs: [{ label: 'TextBox 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/text-box' }],
    related: ['password-box', 'number-box', 'auto-suggest-box', 'rich-edit-box'],
    samples: [
      {
        title: '简单的 TextBox',
        html: html`<win-text-box style="width: 300px" aria-label="simple TextBox"></win-text-box>`,
      },
      {
        title: '带标题和占位文本的 TextBox',
        html: html`<win-text-box style="width: 300px" header="Enter your name:" placeholder="Name"></win-text-box>
<div class="output" data-output></div>`,
        options: html`<win-toggle-button data-opt="disabled">禁用</win-toggle-button>`,
        setup(ex, opt) {
          const tb = ex.querySelector<HTMLElement & { value: string; disabled: boolean }>('win-text-box')!;
          tb.addEventListener('input', () => out(ex, tb.value ? `你好，${tb.value}！` : ''));
          const d = opt!.querySelector('[data-opt="disabled"]')!;
          d.addEventListener('change', () => (tb.disabled = isChecked(d)));
        },
      },
      {
        title: '设置了多种属性的只读 TextBox',
        html: html`<win-text-box read-only value="I am super excited to be here!" style="width: 100%; max-width: 620px; font-family: Arial; font-size: 24px; font-style: italic; letter-spacing: 0.2em; color: CornflowerBlue"></win-text-box>`,
      },
      {
        title: '启用拼写检查的多行 TextBox',
        description: 'accepts-return 与 text-wrapping="wrap" 构成多行输入；高度随内容增长直至 max-height，之后滚动。',
        html: html`<win-text-box accepts-return text-wrapping="wrap" spell-check header="Enter text:" selection-highlight-color="#0F7B0F" style="width: 400px; max-height: 172px"></win-text-box>`,
      },
      {
        title: '带描述与验证的 TextBox（参与表单）',
        html: html`<form data-form class="col" style="gap: 12px; width: 320px">
  <win-text-box name="email" header="电子邮件" placeholder="name@example.com" input-scope="email-smtp-address" required description="我们不会公开你的电子邮件地址。"></win-text-box>
  <win-button appearance="accent" data-submit>提交</win-button>
</form>
<div class="output" data-output></div>`,
        setup(ex) {
          const form = ex.querySelector<HTMLFormElement>('[data-form]')!;
          const tb = form.querySelector<HTMLElement & { reportValidity(): boolean }>('win-text-box')!;
          form.addEventListener('submit', (e) => e.preventDefault());
          ex.querySelector('[data-submit]')!.addEventListener('click', () => {
            if (!form.checkValidity()) {
              tb.reportValidity();
              out(ex, '请输入有效的电子邮件地址。');
              return;
            }
            out(ex, `表单数据：email=${new FormData(form).get('email')}`);
          });
        },
      },
    ],
  },
  {
    id: 'password-box',
    title: 'PasswordBox',
    category: 'text',
    icon: '',
    tags: ['win-password-box'],
    description:
      'PasswordBox 用于输入密码等隐私信息，字符以掩码显示。默认 PasswordRevealMode 为 Peek：获得焦点且非空时出现“显示”按钮，按住即可临时查看密码。',
    docs: [
      { label: 'PasswordBox 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/password-box' },
    ],
    related: ['text-box'],
    samples: [
      {
        title: '简单的 PasswordBox',
        html: html`<win-password-box style="width: 300px" aria-label="Password"></win-password-box>
<div class="output" data-output></div>`,
        setup(ex) {
          const pb = ex.querySelector<HTMLElement & { password: string }>('win-password-box')!;
          pb.addEventListener('passwordchanged', () =>
            out(ex, pb.password === 'Password' ? "'Password' 不能用作密码。" : ''),
          );
        },
      },
      {
        title: '带标题、占位文本和自定义掩码字符的 PasswordBox',
        description: '浏览器原生掩码只支持圆点 / 圆圈 / 方块，自定义 PasswordChar 会映射为最接近的形状。',
        html: html`<win-password-box style="width: 300px" header="Password" placeholder="Enter your password" password-char="#"></win-password-box>`,
      },
      {
        title: 'PasswordRevealMode',
        html: html`<win-password-box style="width: 300px" header="Password" value="secret password" data-demo></win-password-box>`,
        options: html`<div class="col" style="gap: 8px" role="radiogroup" aria-label="PasswordRevealMode">
  <win-toggle-button data-mode="peek" checked>Peek（按住显示）</win-toggle-button>
  <win-toggle-button data-mode="hidden">Hidden（从不显示）</win-toggle-button>
  <win-toggle-button data-mode="visible">Visible（始终显示）</win-toggle-button>
</div>`,
        setup(ex, opt) {
          const pb = ex.querySelector<HTMLElement & { passwordRevealMode: string }>('[data-demo]')!;
          const btns = Array.from(opt!.querySelectorAll<HTMLElement & { checked: boolean }>('[data-mode]'));
          for (const b of btns) {
            b.addEventListener('change', () => {
              for (const o of btns) o.checked = o === b;
              pb.passwordRevealMode = b.dataset.mode!;
            });
          }
        },
      },
    ],
  },
  {
    id: 'number-box',
    title: 'NumberBox',
    category: 'text',
    icon: '',
    tags: ['win-number-box'],
    description:
      'NumberBox 用于输入与显示数值：支持表达式计算（如 1 + 2^2）、上下箭头 / PageUp / PageDown / 鼠标滚轮步进、内联或紧凑（弹出）旋转按钮、最小值/最大值、循环、格式化与舍入，以及非法输入自动还原。',
    docs: [{ label: 'NumberBox 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/number-box' }],
    related: ['text-box', 'slider'],
    samples: [
      {
        title: '计算表达式的 NumberBox',
        description: '输入表达式后按 Enter 或移出焦点即可求值。',
        html: html`<win-number-box style="width: 300px" header="Enter an expression:" placeholder="1 + 2^2" accepts-expression></win-number-box>
<div class="output" data-output></div>`,
        setup(ex) {
          const nb = ex.querySelector('win-number-box')!;
          nb.addEventListener('valuechanged', (e) => {
            const d = (e as Detail<{ oldValue: number; newValue: number }>).detail;
            out(ex, `Value: ${d.newValue}`);
          });
        },
      },
      {
        title: '带旋转按钮的 NumberBox',
        html: html`<win-number-box data-demo style="width: 300px" header="Enter an integer:" value="1" spin-button-placement-mode="compact" small-change="10" large-change="100"></win-number-box>`,
        options: html`<div class="col" style="gap: 8px" role="radiogroup" aria-label="SpinButtonPlacementMode">
  <win-toggle-button data-mode="inline">Inline</win-toggle-button>
  <win-toggle-button data-mode="compact" checked>Compact</win-toggle-button>
  <win-toggle-button data-mode="hidden">Hidden</win-toggle-button>
</div>`,
        setup(ex, opt) {
          const nb = ex.querySelector<HTMLElement & { spinButtonPlacementMode: string }>('[data-demo]')!;
          const btns = Array.from(opt!.querySelectorAll<HTMLElement & { checked: boolean }>('[data-mode]'));
          for (const b of btns) {
            b.addEventListener('change', () => {
              for (const o of btns) o.checked = o === b;
              nb.spinButtonPlacementMode = b.dataset.mode!;
            });
          }
        },
      },
      {
        title: '格式化为两位小数并舍入到 0.25 的 NumberBox',
        html: html`<win-number-box style="width: 300px" header="Enter a dollar amount:" placeholder="0.00" fraction-digits="2" increment="0.25" accepts-expression></win-number-box>
<div class="output" data-output></div>`,
        setup(ex) {
          const nb = ex.querySelector<HTMLElement & { value: number }>('win-number-box')!;
          nb.addEventListener('valuechanged', () => out(ex, Number.isNaN(nb.value) ? '' : `$${nb.value.toFixed(2)}`));
        },
      },
      {
        title: '最小值、最大值与循环（IsWrapEnabled）',
        html: html`<win-number-box data-demo style="width: 300px" header="音量（0–100）" value="95" minimum="0" maximum="100" small-change="5" large-change="25" spin-button-placement-mode="inline" is-wrap-enabled></win-number-box>
<div class="output" data-output>到达边界后继续步进会循环到另一端。</div>`,
        options: html`<win-toggle-button data-opt="wrap" checked>IsWrapEnabled</win-toggle-button>`,
        setup(ex, opt) {
          const nb = ex.querySelector<HTMLElement & { isWrapEnabled: boolean; value: number }>('[data-demo]')!;
          const w = opt!.querySelector('[data-opt="wrap"]')!;
          w.addEventListener('change', () => (nb.isWrapEnabled = isChecked(w)));
          nb.addEventListener('valuechanged', () => out(ex, `Value: ${nb.value}`));
        },
      },
    ],
  },
  {
    id: 'auto-suggest-box',
    title: 'AutoSuggestBox',
    category: 'text',
    icon: '',
    tags: ['win-auto-suggest-box'],
    description:
      'AutoSuggestBox 是在输入时提供建议列表的文本框。应用在 textchanged（reason 为 user-input）中过滤并设置 items；可用方向键浏览建议（文本随之更新），Enter 或查询按钮提交查询（querysubmitted），Esc 关闭列表并还原输入。',
    docs: [
      {
        label: 'AutoSuggestBox 文档',
        href: 'https://learn.microsoft.com/windows/apps/design/controls/auto-suggest-box',
      },
    ],
    related: ['text-box', 'combo-box'],
    samples: [
      {
        title: '基本的 AutoSuggestBox',
        html: html`<win-auto-suggest-box style="width: 300px" placeholder="Type a cat breed" query-icon="none"></win-auto-suggest-box>
<div class="output" data-output></div>`,
        setup(ex) {
          const asb = ex.querySelector<HTMLElement & { items: unknown[] }>('win-auto-suggest-box')!;
          asb.addEventListener('textchanged', (e) => {
            const d = (e as Detail<{ text: string; reason: string }>).detail;
            if (d.reason !== 'user-input') return;
            const parts = d.text.toLowerCase().split(' ').filter(Boolean);
            const hits = CATS.filter((c) => parts.every((p) => c.toLowerCase().includes(p)));
            asb.items = d.text ? (hits.length ? hits : ['No results found']) : [];
          });
          asb.addEventListener('suggestionchosen', (e) =>
            out(ex, `已选择：${(e as Detail<{ selectedItem: string }>).detail.selectedItem}`),
          );
        },
      },
      {
        title: '带查询图标的 AutoSuggestBox（搜索本 Gallery）',
        description: '输入控件名称，选择建议或按 Enter 会导航到对应页面。',
        html: html`<win-auto-suggest-box style="width: 300px" placeholder="搜索控件" query-icon="Find" display-member-path="title" text-member-path="title"></win-auto-suggest-box>
<div class="output" data-output></div>`,
        setup(ex) {
          const asb = ex.querySelector<HTMLElement & { items: unknown[] }>('win-auto-suggest-box')!;
          type P = { id: string; title: string; icon?: string; description: string };
          let pages: P[] = [];
          void import('./registry.ts').then((m) => (pages = m.allPages as P[]));
          asb.addEventListener('textchanged', (e) => {
            const d = (e as Detail<{ text: string; reason: string }>).detail;
            if (d.reason !== 'user-input') return;
            const q = d.text.trim().toLowerCase();
            asb.items = q
              ? pages
                  .filter((p) => p.title.toLowerCase().includes(q) || p.description.includes(d.text.trim()))
                  .slice(0, 12)
              : [];
          });
          asb.addEventListener('querysubmitted', (e) => {
            const d = (e as Detail<{ queryText: string; chosenSuggestion: P | null }>).detail;
            const target =
              d.chosenSuggestion ?? pages.find((p) => p.title.toLowerCase() === d.queryText.trim().toLowerCase());
            if (target) location.hash = `#/${target.id}`;
            else out(ex, `未找到“${d.queryText}”`);
          });
        },
      },
      {
        title: '带标题与描述的 AutoSuggestBox',
        html: html`<win-auto-suggest-box style="width: 300px" header="城市" placeholder="输入城市名称" description="使用 ↑/↓ 浏览建议，Enter 提交。"></win-auto-suggest-box>
<div class="output" data-output></div>`,
        setup(ex) {
          const cities = [
            '北京',
            '上海',
            '广州',
            '深圳',
            '杭州',
            '南京',
            '成都',
            '重庆',
            '武汉',
            '西安',
            '苏州',
            '天津',
            '长沙',
            '青岛',
            '厦门',
          ];
          const asb = ex.querySelector<HTMLElement & { items: unknown[] }>('win-auto-suggest-box')!;
          asb.addEventListener('textchanged', (e) => {
            const d = (e as Detail<{ text: string; reason: string }>).detail;
            if (d.reason !== 'user-input') return;
            asb.items = d.text ? cities.filter((c) => c.includes(d.text.trim())) : [];
          });
          asb.addEventListener('querysubmitted', (e) => {
            const d = (e as Detail<{ queryText: string; chosenSuggestion: string | null }>).detail;
            out(ex, `查询：${d.chosenSuggestion ?? d.queryText}`);
          });
        },
      },
    ],
  },
  {
    id: 'rich-edit-box',
    title: 'RichEditBox',
    category: 'text',
    icon: '',
    tags: ['win-rich-edit-box'],
    description:
      'RichEditBox 是可编辑的富文本控件，支持粗体、斜体、下划线、字体颜色、对齐、列表、撤销/重做等格式化操作；粘贴的 HTML 会经过白名单净化。选择变化时会通过 selectionchanged 报告当前格式，便于同步工具栏状态。',
    docs: [
      { label: 'RichEditBox 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/rich-edit-box' },
    ],
    related: ['rich-text-block', 'text-box'],
    samples: [
      {
        title: '带格式选项的 RichEditBox',
        html: html`<div class="col" data-stretch style="gap: 8px; max-width: 640px">
  <div class="row" style="gap: 4px" role="toolbar" aria-label="格式">
    <win-toggle-button data-cmd="bold" icon="Bold" aria-label="粗体"></win-toggle-button>
    <win-toggle-button data-cmd="italic" icon="Italic" aria-label="斜体"></win-toggle-button>
    <win-toggle-button data-cmd="underline" icon="Underline" aria-label="下划线"></win-toggle-button>
    <win-drop-down-button aria-label="字体颜色"><span data-swatch style="display:inline-block;width:16px;height:16px;border-radius:3px;background:#000000;border:1px solid var(--w-control-stroke-color-default)"></span>
      <win-flyout slot="flyout" placement="bottom-start"><div data-colors style="display:grid;grid-template-columns:repeat(3,32px);gap:6px"></div></win-flyout>
    </win-drop-down-button>
    <win-button appearance="subtle" data-cmd="left" icon="AlignLeft" aria-label="左对齐"></win-button>
    <win-button appearance="subtle" data-cmd="center" icon="AlignCenter" aria-label="居中"></win-button>
    <win-button appearance="subtle" data-cmd="right" icon="AlignRight" aria-label="右对齐"></win-button>
    <win-button appearance="subtle" data-cmd="bullets" icon="List" aria-label="项目符号"></win-button>
    <win-button appearance="subtle" data-cmd="undo" icon="Undo" aria-label="撤销"></win-button>
    <win-button appearance="subtle" data-cmd="redo" icon="Redo" aria-label="重做"></win-button>
  </div>
  <win-rich-edit-box data-demo style="height: 200px" placeholder="Type something here"><p>This is a <b>RichEditBox</b>. Select text and use the toolbar — or press <i>Ctrl+B</i>, <i>Ctrl+I</i>, <i>Ctrl+U</i>.</p></win-rich-edit-box>
</div>`,
        setup(ex) {
          type Reb = HTMLElement & {
            toggleBold(): void;
            toggleItalic(): void;
            toggleUnderline(): void;
            setForeground(c: string): void;
            setAlignment(a: string): void;
            toggleBullets(): void;
            undo(): void;
            redo(): void;
          };
          const reb = ex.querySelector<Reb>('[data-demo]')!;
          const run: Record<string, () => void> = {
            bold: () => reb.toggleBold(),
            italic: () => reb.toggleItalic(),
            underline: () => reb.toggleUnderline(),
            left: () => reb.setAlignment('left'),
            center: () => reb.setAlignment('center'),
            right: () => reb.setAlignment('right'),
            bullets: () => reb.toggleBullets(),
            undo: () => reb.undo(),
            redo: () => reb.redo(),
          };
          for (const b of ex.querySelectorAll<HTMLElement>('[data-cmd]')) {
            b.addEventListener('click', () => run[b.dataset.cmd!]?.());
          }
          const grid = ex.querySelector('[data-colors]')!;
          const swatch = ex.querySelector<HTMLElement>('[data-swatch]')!;
          const flyout = ex.querySelector<HTMLElement & { hide(): void }>('win-flyout')!;
          for (const c of FONT_COLORS) {
            const s = document.createElement('win-button');
            s.setAttribute('aria-label', c);
            s.style.cssText = `padding:0;width:32px;height:32px;min-width:0;background:${c};`;
            s.addEventListener('click', () => {
              reb.setForeground(c);
              swatch.style.background = c;
              flyout.hide();
            });
            grid.append(s);
          }
          reb.addEventListener('selectionchanged', (e) => {
            const f = (e as Detail<{ bold: boolean; italic: boolean; underline: boolean }>).detail;
            for (const k of ['bold', 'italic', 'underline'] as const) {
              const t = ex.querySelector<HTMLElement & { checked: boolean }>(`[data-cmd="${k}"]`);
              if (t) t.checked = f[k];
            }
          });
        },
      },
      {
        title: '带标题和占位文本的 RichEditBox',
        html: html`<win-rich-edit-box style="width: 400px; min-height: 96px" header="会议记录" placeholder="在此输入要点…" description="支持粘贴富文本，脚本与外部样式会被移除。"></win-rich-edit-box>`,
      },
      {
        title: '读取与设置文档内容',
        html: html`<win-rich-edit-box data-demo style="width: 400px; min-height: 80px"><p>Hello, <b>World</b>!</p></win-rich-edit-box>
<div class="row" style="gap: 8px">
  <win-button data-act="text">获取纯文本</win-button>
  <win-button data-act="html">获取 HTML</win-button>
  <win-button data-act="set">设置示例内容</win-button>
</div>
<div class="output" data-output style="font-family: var(--w-font-family-mono); white-space: pre-wrap"></div>`,
        setup(ex) {
          const reb = ex.querySelector<HTMLElement & { text: string; html: string }>('[data-demo]')!;
          ex.querySelector('[data-act="text"]')!.addEventListener('click', () => out(ex, reb.text));
          ex.querySelector('[data-act="html"]')!.addEventListener('click', () => out(ex, reb.html));
          ex.querySelector('[data-act="set"]')!.addEventListener('click', () => {
            reb.html = '<p><b>WinUI</b> for the web</p><ul><li>Fluent</li><li>Accessible</li></ul>';
            out(ex, '');
          });
        },
      },
    ],
  },
  {
    id: 'tokenizing-text-box',
    title: 'TokenizingTextBox',
    category: 'text',
    icon: '',
    tags: ['win-tokenizing-text-box'],
    summary: '将输入转换为可移除的标记（收件人、标签）。',
    description: `TokenizingTextBox 把输入的文本转换为标记（token），适用于收件人、标签、筛选条件等场景。输入分隔符（, ;）或按 Enter 生成标记；支持建议列表（与 AutoSuggestBox 相同的外观）、粘贴批量拆分、Backspace/方向键选中与删除标记、最大标记数和表单提交。`,
    samples: [
      {
        title: '带建议列表的收件人输入',
        html: html`<win-tokenizing-text-box header="收件人" placeholder="输入姓名或邮箱" data-tok style="width:440px"></win-tokenizing-text-box>
<div class="output" data-output></div>`,
        setup(ex) {
          const tok = ex.querySelector<HTMLElement & { suggestions: unknown; tokens: string[] }>('[data-tok]')!;
          tok.suggestions = people(40, 11).map((p) => ({
            text: String(p.name),
            description: `${String(p.dept)} · ${String(p.title)}`,
          }));
          tok.tokens = ['王伟', '李娜'];
          tok.addEventListener('change', (e) =>
            out(ex, `标记：${((e as CustomEvent).detail.tokens as string[]).join('、') || '（无）'}`),
          );
        },
      },
      {
        title: '标签输入：分隔符、粘贴与上限',
        description: '最多 5 个标签。试试粘贴“设计, 前端; 动画”这样的文本。',
        html: html`<win-tokenizing-text-box placeholder="添加标签" max-tokens="5" tokens='["WinUI","Fluent"]' style="width:440px"></win-tokenizing-text-box>`,
      },
      {
        title: '只允许建议中的值',
        html: html`<win-tokenizing-text-box placeholder="选择编程语言" restrict-to-suggestions suggestions='["C#","C++","TypeScript","JavaScript","Rust","Go","Python","Kotlin","Swift"]' style="width:440px"></win-tokenizing-text-box>`,
      },
    ],
  },
  {
    id: 'rich-suggest-box',
    title: 'RichSuggestBox',
    category: 'text',
    icon: '',
    tags: ['win-rich-suggest-box'],
    summary: '支持 @提及 与 #话题 的富文本输入框。',
    description: `RichSuggestBox 是可以插入“提及/话题”标记的富文本输入框：输入前缀字符（例如 @ 或 #）后弹出建议列表，选择后插入一个整体可删除的标记。可通过 suggestionrequested 事件动态提供建议，tokens 属性读取已插入的标记。`,
    samples: [
      {
        title: '@提及与 #话题',
        html: html`<win-rich-suggest-box header="评论" prefixes="@#" placeholder="输入 @ 提及同事，输入 # 添加话题" data-rsb style="width:520px"></win-rich-suggest-box>
<div class="output" data-output></div>`,
        setup(ex) {
          const box = ex.querySelector<
            HTMLElement & { suggestions: unknown; tokens: { prefix: string; text: string }[]; text: string }
          >('[data-rsb]')!;
          box.suggestions = [
            ...people(24, 5).map((p) => ({
              text: String(p.name),
              prefix: '@',
              description: String(p.title),
              icon: '',
            })),
            ...['设计评审', '性能', '可访问性', '发布计划', '动效'].map((t) => ({ text: t, prefix: '#', icon: '' })),
          ];
          const report = () =>
            out(
              ex,
              `标记：${box.tokens.map((t) => t.prefix + t.text).join('  ') || '（无）'}\u3000｜\u3000纯文本长度：${box.text.length}`,
            );
          box.addEventListener('suggestionchosen', () => setTimeout(report));
          box.addEventListener('textchanged', report);
        },
      },
    ],
  },
  {
    id: 'markdown-text-block',
    title: 'MarkdownTextBlock',
    category: 'text',
    icon: '',
    tags: ['win-markdown-text-block'],
    summary: '用 WinUI 排版渲染 Markdown 文本。',
    description: `MarkdownTextBlock 将 Markdown 渲染为符合 WinUI 字体阶梯的富文本：标题、强调、行内/块级代码（带简单语法着色与复制按钮）、引用、嵌套列表与任务列表、表格、链接、图片与分隔线。先转义所有 HTML，并限制链接协议，可安全渲染用户内容。`,
    samples: [
      {
        title: '完整示例',
        html: html`<win-markdown-text-block data-doc data-stretch style="max-width:760px"></win-markdown-text-block>`,
        js: html`const md = document.querySelector('win-markdown-text-block');
md.text = '# WinUI 3 Gallery\n**WinUI** 是 Windows 的 *原生* UI 框架……';`,
        setup(ex) {
          const tick = String.fromCharCode(96);
          const fence = tick.repeat(3);
          const md = ex.querySelector<HTMLElement & { text: string }>('[data-doc]')!;
          md.text = [
            '# WinUI 3 Gallery',
            '**WinUI** 是 Windows 的 *原生* UI 框架，~~不是~~ 这里是它的 Web 复刻。访问 [文档](https://learn.microsoft.com/windows/apps/winui/) 了解更多。',
            '',
            '## 特性',
            '- 浅色/深色主题与强调色',
            `- Fluent 动效：${tick}cubic-bezier(0, 0, 0, 1)${tick}`,
            '  - 进入 250ms，退出 167ms',
            '- [x] 键盘与无障碍',
            '- [ ] 更多组件',
            '',
            '> 设计令牌全部取自 generic.xaml，没有手工猜测的颜色。',
            '',
            '| 控件 | 状态 | 版本 |',
            '| :--- | :---: | ---: |',
            '| Button | 稳定 | 1.0 |',
            '| DataGrid | 已完成 | 0.9 |',
            '',
            `${fence}ts`,
            "import { setTheme } from 'winui';",
            "setTheme('dark', document.documentElement, { animate: true });",
            fence,
            '',
            '---',
            '1. 安装依赖',
            `2. 运行 ${tick}npm run gallery${tick}`,
          ].join('\n');
        },
      },
      {
        title: '实时编辑',
        description: '左侧是多行 TextBox（accepts-return），右侧实时渲染。',
        html: html`<div class="row" data-stretch style="align-items:flex-start;gap:16px">
  <win-text-box data-src accepts-return text-wrapping="wrap" header="Markdown" style="flex:1;min-width:260px"></win-text-box>
  <win-markdown-text-block data-md style="flex:1;min-width:260px;max-height:300px;overflow:auto;padding-top:28px"></win-markdown-text-block>
</div>`,
        setup(ex) {
          const src = ex.querySelector<HTMLElement & { value: string }>('[data-src]')!;
          const md = ex.querySelector<HTMLElement & { text: string }>('[data-md]')!;
          src.value = [
            '### 你好 👋',
            '在左侧输入 **Markdown**，右侧实时预览。',
            '',
            '- 列表项',
            '- [链接](https://www.microsoft.com)',
            '',
            '```json',
            '{ "theme": "dark", "accent": "#0078D4" }',
            '```',
          ].join('\n');
          const sync = () => (md.text = src.value);
          src.addEventListener('input', sync);
          sync();
        },
      },
    ],
  },
  {
    id: 'metadata-list',
    title: 'MetadataList',
    category: 'text',
    icon: '',
    tags: ['win-metadata-list', 'win-metadata-item'],
    summary: '用分隔符连接的一行元数据，可包含链接。',
    description: `MetadataList 把多条元数据显示为一行，用“ • ”分隔（可自定义），并为屏幕阅读器提供可读的分隔；带 href 或 onClick 的项显示为链接。`,
    samples: [
      {
        title: '应用商店风格的元数据',
        html: html`<div class="col">
  <win-metadata-list>
    <win-metadata-item label="Microsoft Corporation" href="https://www.microsoft.com"></win-metadata-item>
    <win-metadata-item label="开发者工具"></win-metadata-item>
    <win-metadata-item label="免费"></win-metadata-item>
    <win-metadata-item label="4.8 ★" accessible-label="评分 4.8 星"></win-metadata-item>
  </win-metadata-list>
  <win-metadata-list text-style="caption" separator="  |  " text="2026 年 11 月 21 日;12 分钟阅读;设计;动效"></win-metadata-list>
</div>`,
      },
    ],
  },
  {
    id: 'marquee',
    title: 'Marquee',
    category: 'text',
    icon: '',
    tags: ['win-marquee'],
    summary: '滚动字幕：Ticker、Looping 与 Bouncing。',
    description: `Marquee 以滚动方式展示超长或动态文本：ticker 从一侧进入并从另一侧离开，looping 无缝循环，bouncing 来回摆动；支持四个方向、速度、重复次数，悬停时暂停（增强）。减少动画时保持静止。`,
    samples: [
      {
        title: '三种行为',
        html: html`<div class="col" data-stretch style="max-width:560px">
  <win-marquee behavior="ticker" speed="60" style="padding:6px 0;border-radius:4px;background:var(--w-subtle-fill-color-secondary)">📈 MSFT 512.34 ▲ 1.2%&#x3000;&#x3000; AAPL 238.91 ▼ 0.4%&#x3000;&#x3000; NVDA 1,024.55 ▲ 3.1%</win-marquee>
  <win-marquee behavior="looping" speed="40" style="padding:6px 0;border-radius:4px;background:var(--w-subtle-fill-color-secondary)">✦ WinUI 3 Gallery Web 版 ✦ 浅色与深色主题 ✦ Fluent 动效 ✦ 键盘与无障碍 </win-marquee>
  <win-marquee behavior="bouncing" speed="50" style="padding:6px 0;border-radius:4px;background:var(--w-subtle-fill-color-secondary)">这是一段会来回移动的较短文字</win-marquee>
</div>`,
      },
      {
        title: '垂直方向',
        html: html`<win-marquee behavior="looping" direction="up" speed="24" style="height:72px;width:260px;border-radius:4px;background:var(--w-subtle-fill-color-secondary);padding:0 12px">
  <div style="display:flex;flex-direction:column;gap:6px;padding:6px 0"><span>• 版本 1.8 已发布</span><span>• 新增 DataGrid</span><span>• 修复焦点问题</span><span>• 性能改进</span></div>
</win-marquee>`,
      },
    ],
  },
];

export default pages;
