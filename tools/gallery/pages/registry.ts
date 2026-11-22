import type { GalleryPage } from './types.ts';
import buttons from './buttons.ts';
import input from './input.ts';
import text from './text.ts';
import collections from './collections.ts';
import navigation from './navigation.ts';
import menus from './menus.ts';
import datetime from './datetime.ts';
import layout from './layout.ts';
import status from './status.ts';
import design from './design.ts';

export const allPages: GalleryPage[] = [
  ...buttons,
  ...input,
  ...text,
  ...collections,
  ...navigation,
  ...menus,
  ...datetime,
  ...layout,
  ...status,
  ...design,
];

export { CATEGORIES } from './types.ts';
