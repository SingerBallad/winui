import type { DataGridItem } from '../../../components/collections/data-grid.ts';

export const FAMILY = [
  '王',
  '李',
  '张',
  '刘',
  '陈',
  '杨',
  '赵',
  '黄',
  '周',
  '吴',
  '徐',
  '孙',
  '马',
  '朱',
  '胡',
  '郭',
  '何',
  '林',
  '罗',
  '高',
];
export const GIVEN = [
  '伟',
  '芳',
  '娜',
  '敏',
  '静',
  '磊',
  '洋',
  '艳',
  '勇',
  '杰',
  '娟',
  '涛',
  '明',
  '超',
  '秀英',
  '霞',
  '平',
  '刚',
  '桂英',
  '晨',
];
const DEPTS = ['研发', '设计', '市场', '销售', '财务', '人事', '运营', '客服'];
const TITLES = ['工程师', '高级工程师', '经理', '总监', '专员', '设计师', '分析师', '顾问'];
const CITIES = ['北京', '上海', '深圳', '杭州', '成都', '武汉', '西安', '南京'];

export function rng(seed: number): () => number {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 4294967296;
  };
}

export function people(n: number, seed = 7): DataGridItem[] {
  const r = rng(seed);
  const pick = <T>(a: T[]) => a[Math.floor(r() * a.length)]!;
  return Array.from({ length: n }, (_, i) => ({
    id: i + 1,
    name: pick(FAMILY) + pick(GIVEN),
    dept: pick(DEPTS),
    title: pick(TITLES),
    city: pick(CITIES),
    joined: new Date(2012 + Math.floor(r() * 13), Math.floor(r() * 12), 1 + Math.floor(r() * 28)),
    salary: Math.round((8000 + r() * 42000) / 100) * 100,
    remote: r() > 0.6,
    progress: Math.round(r() * 100),
  }));
}
