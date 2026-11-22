import { html, type GalleryPage } from './types.ts';

type Checkable = HTMLElement & { checked: boolean };

function group(key: string, items: [string, string][], current: string): string {
  return `<div data-group="${key}" style="display:flex;flex-wrap:wrap;gap:4px">${items
    .map(
      ([v, label]) =>
        `<win-toggle-button data-value="${v}"${v === current ? ' checked' : ''}>${label}</win-toggle-button>`,
    )
    .join('')}</div>`;
}

function wireGroup(root: HTMLElement | null, key: string, onChange: (v: string) => void): void {
  const g = root?.querySelector<HTMLElement>(`[data-group="${key}"]`);
  if (!g) return;
  g.addEventListener('change', (e) => {
    const t = (e.target as HTMLElement).closest<Checkable>('win-toggle-button');
    if (!t) return;
    for (const b of g.querySelectorAll<Checkable>('win-toggle-button')) b.checked = b === t;
    onChange(t.dataset.value ?? '');
  });
}

function onCheck(root: HTMLElement | null, opt: string, fn: (checked: boolean) => void): void {
  const el = root?.querySelector<Checkable>(`[data-opt="${opt}"]`);
  el?.addEventListener('change', () => fn(!!el.checked));
}

const out = (ex: HTMLElement, text: string) => {
  const o = ex.querySelector('[data-output]');
  if (o) o.textContent = text;
};

const fmt = (d: Date | null | undefined) =>
  d ? d.toLocaleDateString('zh-CN', { year: 'numeric', month: 'long', day: 'numeric', weekday: 'short' }) : '（无）';

const pages: GalleryPage[] = [
  {
    id: 'calendar-date-picker',
    title: 'CalendarDatePicker',
    category: 'date-time',
    icon: '',
    tags: ['win-calendar-date-picker'],
    description:
      'CalendarDatePicker 是一个下拉式的日期选择控件：点击日期框后在下方弹出 CalendarView 供用户选择单个日期，选择后自动关闭。适合需要直观查看月份布局、按日期挑选的场景。',
    docs: [
      {
        label: 'CalendarDatePicker 文档',
        href: 'https://learn.microsoft.com/windows/apps/design/controls/calendar-date-picker',
      },
    ],
    related: ['calendar-view', 'date-picker', 'time-picker'],
    samples: [
      {
        title: '简单的 CalendarDatePicker',
        html: html`<win-calendar-date-picker header="日历" placeholder="选择日期"></win-calendar-date-picker>
<div class="output" data-output>所选日期：（无）</div>`,
        options: html`<win-check-box data-opt="disabled">禁用</win-check-box>
<win-check-box data-opt="today" checked>突出显示今天</win-check-box>`,
        setup(ex, opt) {
          const p = ex.querySelector('win-calendar-date-picker')!;
          p.addEventListener('datechanged', (e) => out(ex, `所选日期：${fmt((e as CustomEvent).detail.newDate)}`));
          onCheck(opt, 'disabled', (c) => (p.disabled = c));
          onCheck(opt, 'today', (c) => (p.isTodayHighlighted = c));
        },
      },
      {
        title: '自定义日期格式、可选范围与说明文字',
        description:
          'date-format 支持 short / medium / long / full 预设或 yyyy、MM、dd 等模式；min-date / max-date 限制可选范围，范围外的日期不会显示。',
        html: html`<win-calendar-date-picker header="入住日期" date-format="yyyy年M月d日 dddd"
  min-date="2026-01-01" max-date="2027-12-31" date="2026-12-24"
  description="只能预订 2026–2027 年的日期"></win-calendar-date-picker>`,
      },
      {
        title: '显示分组标签、从星期日开始的英文日历',
        html: html`<win-calendar-date-picker locale="en-US" header="Calendar" first-day-of-week="Sunday"
  is-group-label-visible placeholder="Pick a date"></win-calendar-date-picker>`,
      },
    ],
  },
  {
    id: 'calendar-view',
    title: 'CalendarView',
    category: 'date-time',
    icon: '',
    tags: ['win-calendar-view'],
    description:
      'CalendarView 以可滚动的月历方式显示日期，支持单选、多选或不可选，以及月 / 年 / 十年三级视图（点击标题缩小，选择项放大）。可以通过 isBlackout 屏蔽日期，用 setDensityColors 在日期上绘制密度色条。',
    docs: [
      { label: 'CalendarView 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/calendar-view' },
    ],
    related: ['calendar-date-picker', 'date-picker'],
    samples: [
      {
        title: 'CalendarView',
        html: html`<win-calendar-view></win-calendar-view>
<div class="output" data-output>选中：（无）</div>`,
        options: html`<div class="opt-title">SelectionMode</div>
${group(
  'mode',
  [
    ['none', 'None'],
    ['single', 'Single'],
    ['multiple', 'Multiple'],
  ],
  'single',
)}
<div class="opt-title">FirstDayOfWeek</div>
${group(
  'first',
  [
    ['auto', '跟随区域'],
    ['Sunday', '周日'],
    ['Monday', '周一'],
  ],
  'auto',
)}
<div class="opt-title">Language</div>
${group(
  'lang',
  [
    ['', '中文'],
    ['en-US', 'English'],
    ['ja-JP', '日本語'],
    ['de-DE', 'Deutsch'],
  ],
  '',
)}
<win-check-box data-opt="group">IsGroupLabelVisible</win-check-box>
<win-check-box data-opt="oos" checked>IsOutOfScopeEnabled</win-check-box>
<win-check-box data-opt="today" checked>IsTodayHighlighted</win-check-box>`,
        setup(ex, opt) {
          const c = ex.querySelector('win-calendar-view')!;
          const show = () =>
            out(
              ex,
              `选中：${c.selectedDates.length ? c.selectedDates.map((d) => d.toLocaleDateString('zh-CN')).join('，') : '（无）'}`,
            );
          c.addEventListener('selecteddateschanged', show);
          wireGroup(opt, 'mode', (v) => {
            c.selectionMode = v as typeof c.selectionMode;
            show();
          });
          wireGroup(opt, 'first', (v) => (c.firstDayOfWeek = v));
          wireGroup(opt, 'lang', (v) => (c.locale = v));
          onCheck(opt, 'group', (v) => (c.isGroupLabelVisible = v));
          onCheck(opt, 'oos', (v) => (c.isOutOfScopeEnabled = v));
          onCheck(opt, 'today', (v) => (c.isTodayHighlighted = v));
        },
      },
      {
        title: '禁用日期（Blackout）与密度色条（DensityColors）',
        description:
          '通过 isBlackout 把周末设为 blackout（带删除线且不可选）；部分日期通过 setDensityColors 显示日程密度。',
        html: html`<win-calendar-view selection-mode="multiple" is-group-label-visible></win-calendar-view>`,
        js: `const cal = document.querySelector('win-calendar-view');
const now = new Date();
cal.isBlackout = (d) => d.getDay() === 0 || d.getDay() === 6;
for (const [offset, colors] of [[2, ['#0f7b0f']], [5, ['#c42b1c', '#c42b1c']], [9, ['#005fb8', '#9d5d00', '#0f7b0f']]]) {
  cal.setDensityColors(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset), colors);
}`,
        setup(ex) {
          const cal = ex.querySelector('win-calendar-view')!;
          const now = new Date();
          cal.isBlackout = (d) => d.getDay() === 0 || d.getDay() === 6;
          const marks: [number, string[]][] = [
            [2, ['#0f7b0f']],
            [5, ['#c42b1c', '#c42b1c']],
            [9, ['#005fb8', '#9d5d00', '#0f7b0f']],
            [12, ['#8764b8']],
          ];
          for (const [offset, colors] of marks) {
            cal.setDensityColors(new Date(now.getFullYear(), now.getMonth(), now.getDate() + offset), colors);
          }
          cal.refresh();
        },
      },
      {
        title: '年视图、十年视图与日期范围',
        description:
          'display-mode 指定初始视图；点击标题逐级缩小，点击月份或年份放大，切换时使用 WinUI 的缩放淡入动画。',
        html: html`<div class="row" style="align-items:flex-start">
  <win-calendar-view display-mode="year"></win-calendar-view>
  <win-calendar-view display-mode="decade" min-date="2000-01-01" max-date="2049-12-31"></win-calendar-view>
</div>`,
      },
      {
        title: '每次显示的周数（NumberOfWeeksInView）',
        html: html`<win-calendar-view number-of-weeks-in-view="4" selection-mode="none"></win-calendar-view>`,
      },
    ],
  },
  {
    id: 'date-picker',
    title: 'DatePicker',
    category: 'date-time',
    icon: '',
    tags: ['win-date-picker', 'win-date-picker-flyout'],
    description:
      'DatePicker 用年、月、日三个可循环滚动的选择器来设置日期，适合已知具体日期（例如生日）的输入。字段顺序和名称遵循当前语言区域，可以隐藏任意一列。',
    docs: [{ label: 'DatePicker 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/date-picker' }],
    related: ['time-picker', 'calendar-date-picker'],
    samples: [
      {
        title: '带标题的简单 DatePicker',
        html: html`<win-date-picker header="选择日期"></win-date-picker>
<div class="output" data-output>所选日期：（无）</div>`,
        options: html`<win-check-box data-opt="disabled">禁用</win-check-box>
<win-button data-action="clear">清除日期</win-button>`,
        setup(ex, opt) {
          const p = ex.querySelector('win-date-picker')!;
          p.addEventListener('datechanged', (e) => out(ex, `所选日期：${fmt((e as CustomEvent).detail.newDate)}`));
          onCheck(opt, 'disabled', (c) => (p.disabled = c));
          opt?.querySelector('[data-action="clear"]')?.addEventListener('click', () => {
            p.selectedDate = '';
            out(ex, '所选日期：（无）');
          });
        },
      },
      {
        title: '隐藏年份的 DatePicker（例如生日）',
        html: html`<win-date-picker header="生日" year-visible="false" selected-date="2000-05-20"></win-date-picker>`,
      },
      {
        title: '自定义格式与年份范围',
        description:
          'month-format 可取 long / short / numeric；day-format 取 numeric-weekday 时显示星期；min-year / max-year 限定年份列。',
        html: html`<div class="col">
  <win-date-picker header="会议日期" month-format="long" day-format="numeric-weekday" min-year="2020" max-year="2030" selected-date="2026-11-21"></win-date-picker>
  <win-date-picker header="Delivery date" locale="en-US" selected-date="2026-11-21"></win-date-picker>
  <win-date-picker header="Liefertermin" locale="de-DE" month-format="short" selected-date="2026-11-21"></win-date-picker>
</div>`,
      },
      {
        title: '附加到按钮的 DatePickerFlyout',
        html: html`<win-button>选择日期…
  <win-date-picker-flyout slot="flyout"></win-date-picker-flyout>
</win-button>
<div class="output" data-output>尚未选择</div>`,
        setup(ex) {
          const f = ex.querySelector('win-date-picker-flyout')!;
          f.addEventListener('datepicked', (e) => out(ex, `DatePicked：${fmt((e as CustomEvent).detail.newDate)}`));
        },
      },
    ],
  },
  {
    id: 'time-picker',
    title: 'TimePicker',
    category: 'date-time',
    icon: '',
    tags: ['win-time-picker', 'win-time-picker-flyout'],
    description:
      'TimePicker 用小时、分钟（以及 12 小时制下的上午/下午）可循环滚动列来设置时间。clock-identifier 切换 12 / 24 小时制，minute-increment 设置分钟步长。',
    docs: [{ label: 'TimePicker 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/time-picker' }],
    related: ['date-picker', 'calendar-date-picker'],
    samples: [
      {
        title: '简单的 TimePicker',
        html: html`<win-time-picker header="到达时间"></win-time-picker>
<div class="output" data-output>所选时间：（无）</div>`,
        options: html`<win-check-box data-opt="disabled">禁用</win-check-box>`,
        setup(ex, opt) {
          const p = ex.querySelector('win-time-picker')!;
          p.addEventListener('timechanged', (e) => {
            const t = (e as CustomEvent).detail.newTime as { hours: number; minutes: number } | null;
            out(
              ex,
              `所选时间：${t ? `${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}` : '（无）'}`,
            );
          });
          onCheck(opt, 'disabled', (c) => (p.disabled = c));
        },
      },
      {
        title: '12 小时制，分钟间隔 15',
        html: html`<div class="col">
  <win-time-picker header="开始时间" clock-identifier="12HourClock" minute-increment="15" selected-time="09:30"></win-time-picker>
  <win-time-picker header="Start time" locale="en-US" minute-increment="15" selected-time="14:45"></win-time-picker>
</div>`,
      },
      {
        title: '24 小时制',
        html: html`<win-time-picker header="闹钟" clock-identifier="24HourClock" selected-time="06:45"></win-time-picker>`,
      },
      {
        title: '附加到按钮的 TimePickerFlyout',
        html: html`<win-button>设置提醒…
  <win-time-picker-flyout slot="flyout" minute-increment="5"></win-time-picker-flyout>
</win-button>
<div class="output" data-output>尚未选择</div>`,
        setup(ex) {
          const f = ex.querySelector('win-time-picker-flyout')!;
          f.addEventListener('timepicked', (e) => {
            const t = (e as CustomEvent).detail.newTime as { hours: number; minutes: number };
            out(ex, `TimePicked：${String(t.hours).padStart(2, '0')}:${String(t.minutes).padStart(2, '0')}`);
          });
        },
      },
    ],
  },
];

export default pages;
