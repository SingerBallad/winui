import { css, focusRing } from '../../base/css.ts';
import { animate } from '../../motion/animate.ts';

const zh = {
  settings: '设置',
  more: '更多',
  back: '返回',
  openNav: '打开导航',
  closeNav: '关闭导航',
  search: '搜索',
  closeTab: '关闭标签页',
  addTab: '添加新标签页',
  scrollLeft: '向左滚动',
  scrollRight: '向右滚动',
  first: '第一页',
  previous: '上一页',
  next: '下一页',
  last: '最后一页',
  page: '第',
  of: '页，共',
  pages: (n: number) => `${n} 页`,
  pageLabel: '页码',
  minimize: '最小化',
  maximize: '最大化',
  restore: '还原',
  close: '关闭',
  navigation: '导航',
};
const en: typeof zh = {
  settings: 'Settings',
  more: 'More',
  back: 'Back',
  openNav: 'Open Navigation',
  closeNav: 'Close Navigation',
  search: 'Search',
  closeTab: 'Close tab',
  addTab: 'Add new tab',
  scrollLeft: 'Scroll left',
  scrollRight: 'Scroll right',
  first: 'First page',
  previous: 'Previous page',
  next: 'Next page',
  last: 'Last page',
  page: 'Page',
  of: 'of',
  pages: (n: number) => String(n),
  pageLabel: 'Page',
  minimize: 'Minimize',
  maximize: 'Maximize',
  restore: 'Restore',
  close: 'Close',
  navigation: 'Navigation',
};

export type NavStrings = typeof zh;

export function navStrings(el?: Element): NavStrings {
  const lang = (
    el?.closest('[lang]')?.getAttribute('lang') ??
    document.documentElement.lang ??
    navigator.language ??
    'en'
  ).toLowerCase();
  return lang.startsWith('zh') ? zh : en;
}

export function travelIndicator(el: HTMLElement, from: DOMRect, axis: 'x' | 'y'): Animation | null {
  const to = el.getBoundingClientRect();
  if (!to.width || !to.height || !from.width || !from.height) return null;
  const start = axis === 'y' ? from.top : from.left;
  const end = axis === 'y' ? to.top : to.left;
  const size = axis === 'y' ? to.height : to.width;
  const fromSize = axis === 'y' ? from.height : from.width;
  if (Math.abs(end - start) < 0.5) return null;
  const center = end + size / 2;
  const tf = (a: number, b: number) => {
    const c = (a + b) / 2;
    const len = b - a;
    const tr = c - center;
    const s = len / size;
    return axis === 'y' ? `translateY(${tr}px) scaleY(${s})` : `translateX(${tr}px) scaleX(${s})`;
  };
  const k0 = tf(start, start + fromSize);
  const k1 = end > start ? tf(start, end + size) : tf(end, start + fromSize);
  const k2 = tf(end, end + size);
  return animate(
    el,
    [
      { transform: k0, easing: 'cubic-bezier(0.9, 0.1, 1, 0.2)' },
      { transform: k1, offset: 0.333, easing: 'cubic-bezier(0.1, 0.9, 0.2, 1)' },
      { transform: k2 },
    ],
    { duration: 600 },
  );
}

export const navButtonCss = css`
.nav-btn {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  width: 40px;
  height: 36px;
  margin: 2px 4px;
  padding: 0;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  cursor: default;
  outline: none;
  flex: none;
  -webkit-tap-highlight-color: transparent;
}
.nav-btn:hover { background: var(--w-subtle-fill-color-secondary); }
.nav-btn:active { background: var(--w-subtle-fill-color-tertiary); color: var(--w-text-fill-color-secondary); }
.nav-btn:disabled { background: transparent; color: var(--w-text-fill-color-disabled); pointer-events: none; }
${focusRing('.nav-btn:focus-visible', 0)}
.nav-btn .w-glyph {
  transition: transform var(--w-duration-fast) cubic-bezier(0.2, 1.8, 0.4, 1);
}
.nav-btn.back:active .w-glyph { transform: translateX(-2px) scaleX(0.85); transition-duration: var(--w-duration-faster); transition-timing-function: var(--w-ease-decelerate); }
.nav-btn.toggle:active .toggle-icon .w-glyph { transform: scaleX(0.7); transition-duration: var(--w-duration-faster); transition-timing-function: var(--w-ease-decelerate); }
`;
