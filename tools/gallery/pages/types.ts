export type GalleryCategory =
  | 'basic-input'
  | 'collections'
  | 'date-time'
  | 'dialogs-flyouts'
  | 'layout'
  | 'media'
  | 'menus-toolbars'
  | 'motion'
  | 'navigation'
  | 'scrolling'
  | 'status-info'
  | 'text'
  | 'styles'
  | 'system';

export interface CategoryInfo {
  id: GalleryCategory;
  title: string;
  icon: string;
}

export const CATEGORIES: CategoryInfo[] = [
  { id: 'basic-input', title: '基础输入', icon: '' },
  { id: 'collections', title: '集合', icon: '' },
  { id: 'date-time', title: '日期和时间', icon: '' },
  { id: 'dialogs-flyouts', title: '对话框和浮出控件', icon: '' },
  { id: 'layout', title: '布局', icon: '' },
  { id: 'media', title: '媒体', icon: '' },
  { id: 'menus-toolbars', title: '菜单和工具栏', icon: '' },
  { id: 'motion', title: '动画', icon: '' },
  { id: 'navigation', title: '导航', icon: '' },
  { id: 'scrolling', title: '滚动', icon: '' },
  { id: 'status-info', title: '状态和信息', icon: '' },
  { id: 'text', title: '文本', icon: '' },
  { id: 'styles', title: '样式与设计', icon: '' },
  { id: 'system', title: '系统与窗口', icon: '' },
];

export interface GallerySample {
  title: string;
  description?: string;
  html: string;
  options?: string;
  setup?: (example: HTMLElement, options: HTMLElement | null) => undefined | (() => void);
  code?: string;
  js?: string;
  style?: string;
}

export interface GalleryPage {
  id: string;
  title: string;
  category: GalleryCategory;
  description: string;
  summary?: string;
  icon?: string;
  badge?: 'new' | 'updated' | 'preview';
  tags?: string[];
  docs?: { label: string; href: string }[];
  related?: string[];
  samples: GallerySample[];
}

export const html = (strings: TemplateStringsArray, ...values: unknown[]): string =>
  strings.raw.reduce((acc, s, i) => acc + s + (i < values.length ? String(values[i]) : ''), '');

export function dedent(text: string): string {
  const lines = text.replace(/^\n+|\s+$/g, '').split('\n');
  const indents = lines.filter((l) => l.trim()).map((l) => /^ */.exec(l)![0].length);
  const min = indents.length ? Math.min(...indents) : 0;
  return lines.map((l) => l.slice(min)).join('\n');
}
