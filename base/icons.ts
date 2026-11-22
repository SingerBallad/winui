import { escapeHtml } from './element.ts';

function starPath(cx: number, cy: number, R: number, r: number): string {
  const pts: string[] = [];
  for (let i = 0; i < 10; i++) {
    const rad = i % 2 === 0 ? R : r;
    const a = (-90 + i * 36) * (Math.PI / 180);
    pts.push(`${(cx + rad * Math.cos(a)).toFixed(3)} ${(cy + rad * Math.sin(a)).toFixed(3)}`);
  }
  return `M${pts.join('L')}Z`;
}

function gearPath(cx: number, cy: number, rOuter: number, rInner: number, teeth: number): string {
  const step = (Math.PI * 2) / teeth;
  const pts: string[] = [];
  for (let i = 0; i < teeth; i++) {
    const a = i * step - Math.PI / 2;
    const a1 = a - step * 0.22;
    const a2 = a + step * 0.22;
    const a3 = a + step * 0.5 - step * 0.2;
    const a4 = a + step * 0.5 + step * 0.2;
    pts.push(
      `${(cx + rOuter * Math.cos(a1)).toFixed(3)} ${(cy + rOuter * Math.sin(a1)).toFixed(3)}`,
      `${(cx + rOuter * Math.cos(a2)).toFixed(3)} ${(cy + rOuter * Math.sin(a2)).toFixed(3)}`,
      `${(cx + rInner * Math.cos(a3)).toFixed(3)} ${(cy + rInner * Math.sin(a3)).toFixed(3)}`,
      `${(cx + rInner * Math.cos(a4)).toFixed(3)} ${(cy + rInner * Math.sin(a4)).toFixed(3)}`,
    );
  }
  return `M${pts.join('L')}Z`;
}

export const chromeGlyphs = {
  chevronDown: { d: 'M2.5 5.75L8 11.25L13.5 5.75' },
  chevronUp: { d: 'M2.5 10.25L8 4.75L13.5 10.25' },
  chevronLeft: { d: 'M10.25 2.5L4.75 8L10.25 13.5' },
  chevronRight: { d: 'M5.75 2.5L11.25 8L5.75 13.5' },
  chevronDownSmall: { d: 'M3.5 6L8 10.5L12.5 6', w: 1.35 },
  chevronUpSmall: { d: 'M3.5 10L8 5.5L12.5 10', w: 1.35 },
  chevronLeftSmall: { d: 'M10 3.5L5.5 8L10 12.5', w: 1.35 },
  chevronRightSmall: { d: 'M6 3.5L10.5 8L6 12.5', w: 1.35 },
  chevronRightMed: { d: 'M5.75 2.75L11 8L5.75 13.25', w: 1.3 },
  checkMark: { d: 'M2.5 8.5L6 12L13.5 4.5' },
  dash: { d: 'M3.25 8H12.75', w: 1.25 },
  cancel: { d: 'M3.5 3.5L12.5 12.5M12.5 3.5L3.5 12.5' },
  clear: { d: 'M3.25 3.25L12.75 12.75M12.75 3.25L3.25 12.75' },
  add: { d: 'M8 2.5V13.5M2.5 8H13.5' },
  remove: { d: 'M2.5 8H13.5' },
  more: {
    fill: 'M3 9.1a1.1 1.1 0 1 0 0-2.2a1.1 1.1 0 1 0 0 2.2ZM8 9.1a1.1 1.1 0 1 0 0-2.2a1.1 1.1 0 1 0 0 2.2ZM13 9.1a1.1 1.1 0 1 0 0-2.2a1.1 1.1 0 1 0 0 2.2Z',
  },
  globalNav: { d: 'M0.75 4H15.25M0.75 8H15.25M0.75 12H15.25' },
  back: { d: 'M1.5 8H14.75M7.75 1.75L1.5 8L7.75 14.25' },
  forward: { d: 'M14.5 8H1.25M8.25 1.75L14.5 8L8.25 14.25' },
  arrowUp: { d: 'M8 13.5V2M3.25 6.75L8 2L12.75 6.75' },
  arrowDown: { d: 'M8 2.5V14M3.25 9.25L8 14L12.75 9.25' },
  search: { d: 'M6.75 11.75a5.25 5.25 0 1 0 0-10.5a5.25 5.25 0 1 0 0 10.5ZM10.45 10.2L14.75 14.5' },
  calendar: {
    d: 'M4 1.5H12A2.5 2.5 0 0 1 14.5 4V12A2.5 2.5 0 0 1 12 14.5H4A2.5 2.5 0 0 1 1.5 12V4A2.5 2.5 0 0 1 4 1.5ZM1.5 5H14.5',
    fill: 'M5 9.4a.9.9 0 1 0 0-1.8a.9.9 0 1 0 0 1.8ZM8 9.4a.9.9 0 1 0 0-1.8a.9.9 0 1 0 0 1.8ZM11 9.4a.9.9 0 1 0 0-1.8a.9.9 0 1 0 0 1.8ZM5 12.4a.9.9 0 1 0 0-1.8a.9.9 0 1 0 0 1.8ZM8 12.4a.9.9 0 1 0 0-1.8a.9.9 0 1 0 0 1.8Z',
  },
  clock: { d: 'M8 15a7 7 0 1 0 0-14a7 7 0 1 0 0 14ZM8 4V8.5H11' },
  info: { d: 'M8 15a7 7 0 1 0 0-14a7 7 0 1 0 0 14ZM8 7V11.5', fill: 'M8 5.4a.8.8 0 1 0 0-1.6a.8.8 0 1 0 0 1.6Z' },
  star: { d: starPath(8, 8.6, 7.4, 3.2) },
  starFill: { fill: starPath(8, 8.6, 7.9, 3.4) },
  settings: { d: `${gearPath(8, 8, 7.4, 5.6, 8)}M8 10.5a2.5 2.5 0 1 0 0-5a2.5 2.5 0 1 0 0 5Z` },
  dot: { fill: 'M8 11a3 3 0 1 0 0-6a3 3 0 1 0 0 6Z' },
  caretLeft: { fill: 'M11.5 2.2V13.8A.7.7 0 0 1 10.4 14.3L4.2 8.5A.7.7 0 0 1 4.2 7.5L10.4 1.7A.7.7 0 0 1 11.5 2.2Z' },
  caretRight: { fill: 'M4.5 2.2V13.8A.7.7 0 0 0 5.6 14.3L11.8 8.5A.7.7 0 0 0 11.8 7.5L5.6 1.7A.7.7 0 0 0 4.5 2.2Z' },
  caretUp: { fill: 'M2.2 11.5H13.8A.7.7 0 0 0 14.3 10.4L8.5 4.2A.7.7 0 0 0 7.5 4.2L1.7 10.4A.7.7 0 0 0 2.2 11.5Z' },
  caretDown: { fill: 'M2.2 4.5H13.8A.7.7 0 0 1 14.3 5.6L8.5 11.8A.7.7 0 0 1 7.5 11.8L1.7 5.6A.7.7 0 0 1 2.2 4.5Z' },
  eye: {
    d: 'M1.25 10.5C2.25 6.25 4.75 3.75 8 3.75S13.75 6.25 14.75 10.5M8 13a2.75 2.75 0 1 0 0-5.5a2.75 2.75 0 1 0 0 5.5Z',
  },
  copy: {
    d: 'M5.5 4.5V3.5A1.5 1.5 0 0 1 7 2H12.5A1.5 1.5 0 0 1 14 3.5V9A1.5 1.5 0 0 1 12.5 10.5H11.5M3.5 5.5H9A1.5 1.5 0 0 1 10.5 7V12.5A1.5 1.5 0 0 1 9 14H3.5A1.5 1.5 0 0 1 2 12.5V7A1.5 1.5 0 0 1 3.5 5.5Z',
  },
  folder: {
    d: 'M1.5 4.5A1.5 1.5 0 0 1 3 3H6L7.5 4.5H13A1.5 1.5 0 0 1 14.5 6V11.5A1.5 1.5 0 0 1 13 13H3A1.5 1.5 0 0 1 1.5 11.5Z',
  },
  document: {
    d: 'M4 1.5H9.5L12.5 4.5V13A1.5 1.5 0 0 1 11 14.5H4A1.5 1.5 0 0 1 2.5 13V3A1.5 1.5 0 0 1 4 1.5ZM9.5 1.5V4.5H12.5',
  },
  person: { d: 'M8 8a3 3 0 1 0 0-6a3 3 0 1 0 0 6ZM2.5 14.5C2.5 11.5 5 10 8 10S13.5 11.5 13.5 14.5' },
  play: { d: 'M4.5 2.75V13.25L13 8Z' },
  pause: { d: 'M5 3V13M11 3V13' },
  refresh: { d: 'M13.5 8A5.5 5.5 0 1 1 11.6 3.85M13.5 2.5V5.5H10.5' },
  openInNew: {
    d: 'M9 2.5H13.5V7M13.5 2.5L7.5 8.5M12 9.5V12.5A1 1 0 0 1 11 13.5H3.5A1 1 0 0 1 2.5 12.5V5A1 1 0 0 1 3.5 4H6.5',
  },
  help: {
    d: 'M8 14.5a6.5 6.5 0 1 0 0-13a6.5 6.5 0 1 0 0 13ZM6.25 6.25a1.75 1.75 0 1 1 2.75 1.45c-.6.4-1 .8-1 1.5v.3',
    fill: 'M8 12a.75.75 0 1 0 0-1.5a.75.75 0 1 0 0 1.5Z',
  },
  warning: {
    d: 'M7.13 2.5L1.4 12.5A1 1 0 0 0 2.27 14H13.73A1 1 0 0 0 14.6 12.5L8.87 2.5A1 1 0 0 0 7.13 2.5ZM8 6V9.5',
    fill: 'M8 12a.75.75 0 1 0 0-1.5a.75.75 0 1 0 0 1.5Z',
  },
  chromeClose: { d: 'M3 3L13 13M13 3L3 13' },
  chromeMinimize: { d: 'M3 8H13' },
  chromeMaximize: {
    d: 'M4.5 3H11.5A1.5 1.5 0 0 1 13 4.5V11.5A1.5 1.5 0 0 1 11.5 13H4.5A1.5 1.5 0 0 1 3 11.5V4.5A1.5 1.5 0 0 1 4.5 3Z',
  },
  chromeRestore: {
    d: 'M5.5 5H10.5A1.5 1.5 0 0 1 12 6.5V11.5A1.5 1.5 0 0 1 10.5 13H5.5A1.5 1.5 0 0 1 4 11.5V6.5A1.5 1.5 0 0 1 5.5 5ZM6 3H12A2 2 0 0 1 14 5V11',
  },
  fullScreen: { d: 'M2.5 6V2.5H6M10 2.5H13.5V6M13.5 10V13.5H10M6 13.5H2.5V10' },
  volume: { d: 'M2.5 6H5L8.5 3V13L5 10H2.5ZM11 5.5A3.5 3.5 0 0 1 11 10.5M12.75 3.75A6 6 0 0 1 12.75 12.25' },
  mute: { d: 'M2.5 6H5L8.5 3V13L5 10H2.5ZM10.5 6L14 9.5M14 6L10.5 9.5' },
  list: { d: 'M2.5 4H13.5M2.5 8H13.5M2.5 12H13.5' },
  edit: { d: 'M10.5 2.5L13.5 5.5L5.5 13.5H2.5V10.5ZM9 4L12 7' },
  delete: { d: 'M2.5 4H13.5M6 4V2.5H10V4M3.5 4L4.5 13.5H11.5L12.5 4M6.5 6.5V11M9.5 6.5V11' },
  pin: { d: 'M9.5 1.5L14.5 6.5L11.5 7.5L8.5 10.5L8.5 13L3 7.5L5.5 7.5L8.5 4.5ZM5.5 10.5L1.5 14.5' },
  home: { d: 'M2.5 7L8 2.5L13.5 7V13A1 1 0 0 1 12.5 14H10V10H6V14H3.5A1 1 0 0 1 2.5 13Z' },
  grid: { d: 'M3 2.5H6.5V6H3ZM9.5 2.5H13V6H9.5ZM3 10H6.5V13.5H3ZM9.5 10H13V13.5H9.5Z' },
} as const satisfies Record<string, { d?: string; fill?: string; w?: number }>;

export type ChromeGlyph = keyof typeof chromeGlyphs;

export function glyph(name: ChromeGlyph, size = 16, extraClass = '', strokeWidth?: number): string {
  const g = chromeGlyphs[name] as { d?: string; fill?: string; w?: number };
  const sw = strokeWidth ?? g.w ?? 1;
  const stroke = g.d ? `<path class="s" d="${g.d}"${sw !== 1 ? ` stroke-width="${sw}"` : ''}/>` : '';
  const fill = g.fill ? `<path class="f" d="${g.fill}"/>` : '';
  return `<svg class="w-glyph ${extraClass}" data-glyph="${name}" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true" focusable="false">${stroke}${fill}</svg>`;
}

const SymbolCodes: Readonly<Record<string, number>> = {
  Previous: 0xe100,
  Next: 0xe101,
  Play: 0xe102,
  Pause: 0xe103,
  Edit: 0xe104,
  Save: 0xe105,
  Clear: 0xe106,
  Delete: 0xe107,
  Remove: 0xe108,
  Add: 0xe109,
  Cancel: 0xe10a,
  Accept: 0xe10b,
  More: 0xe10c,
  Redo: 0xe10d,
  Undo: 0xe10e,
  Home: 0xe10f,
  Up: 0xe110,
  Forward: 0xe111,
  Back: 0xe112,
  Favorite: 0xe113,
  Camera: 0xe114,
  Setting: 0xe115,
  Video: 0xe116,
  Sync: 0xe117,
  Download: 0xe118,
  Mail: 0xe119,
  Find: 0xe11a,
  Help: 0xe11b,
  Upload: 0xe11c,
  Emoji: 0xe11d,
  TwoPage: 0xe11e,
  LeaveChat: 0xe11f,
  MailForward: 0xe120,
  Clock: 0xe121,
  Send: 0xe122,
  Crop: 0xe123,
  RotateCamera: 0xe124,
  People: 0xe125,
  OpenPane: 0xe126,
  ClosePane: 0xe127,
  World: 0xe128,
  Flag: 0xe129,
  PreviewLink: 0xe12a,
  Globe: 0xe12b,
  Trim: 0xe12c,
  AttachCamera: 0xe12d,
  ZoomIn: 0xe12e,
  Bookmarks: 0xe12f,
  Document: 0xe130,
  ProtectedDocument: 0xe131,
  Page: 0xe132,
  Bullets: 0xe133,
  Comment: 0xe134,
  MailFilled: 0xe135,
  ContactInfo: 0xe136,
  HangUp: 0xe137,
  ViewAll: 0xe138,
  MapPin: 0xe139,
  Phone: 0xe13a,
  VideoChat: 0xe13b,
  Switch: 0xe13c,
  Contact: 0xe13d,
  Rename: 0xe13e,
  Pin: 0xe141,
  MusicInfo: 0xe142,
  Go: 0xe143,
  Keyboard: 0xe144,
  DockLeft: 0xe145,
  DockRight: 0xe146,
  DockBottom: 0xe147,
  Remote: 0xe148,
  Refresh: 0xe149,
  Rotate: 0xe14a,
  Shuffle: 0xe14b,
  List: 0xe14c,
  Shop: 0xe14d,
  SelectAll: 0xe14e,
  Orientation: 0xe14f,
  Import: 0xe150,
  ImportAll: 0xe151,
  BrowsePhotos: 0xe155,
  WebCam: 0xe156,
  Pictures: 0xe158,
  SaveLocal: 0xe159,
  Caption: 0xe15a,
  Stop: 0xe15b,
  ShowResults: 0xe15c,
  Volume: 0xe15d,
  Repair: 0xe15e,
  Message: 0xe15f,
  Page2: 0xe160,
  CalendarDay: 0xe161,
  CalendarWeek: 0xe162,
  Calendar: 0xe163,
  Character: 0xe164,
  MailReplyAll: 0xe165,
  Read: 0xe166,
  Link: 0xe167,
  Account: 0xe168,
  ShowBcc: 0xe169,
  HideBcc: 0xe16a,
  Cut: 0xe16b,
  Attach: 0xe16c,
  Paste: 0xe16d,
  Filter: 0xe16e,
  Copy: 0xe16f,
  Emoji2: 0xe170,
  Important: 0xe171,
  MailReply: 0xe172,
  SlideShow: 0xe173,
  Sort: 0xe174,
  Manage: 0xe178,
  AllApps: 0xe179,
  DisconnectDrive: 0xe17a,
  MapDrive: 0xe17b,
  NewWindow: 0xe17c,
  OpenWith: 0xe17d,
  ContactPresence: 0xe181,
  Priority: 0xe182,
  GoToToday: 0xe184,
  Font: 0xe185,
  FontColor: 0xe186,
  Contact2: 0xe187,
  Folder: 0xe188,
  Audio: 0xe189,
  Placeholder: 0xe18a,
  View: 0xe18b,
  SetLockScreen: 0xe18c,
  SetTile: 0xe18d,
  ClosedCaption: 0xe190,
  StopSlideShow: 0xe191,
  Permissions: 0xe192,
  Highlight: 0xe193,
  DisableUpdates: 0xe194,
  UnFavorite: 0xe195,
  UnPin: 0xe196,
  OpenLocal: 0xe197,
  Mute: 0xe198,
  Italic: 0xe199,
  Underline: 0xe19a,
  Bold: 0xe19b,
  MoveToFolder: 0xe19c,
  LikeDislike: 0xe19d,
  Dislike: 0xe19e,
  Like: 0xe19f,
  AlignRight: 0xe1a0,
  AlignCenter: 0xe1a1,
  AlignLeft: 0xe1a2,
  Zoom: 0xe1a3,
  ZoomOut: 0xe1a4,
  OpenFile: 0xe1a5,
  OtherUser: 0xe1a6,
  Admin: 0xe1a7,
  Street: 0xe1c3,
  Map: 0xe1c4,
  ClearSelection: 0xe1c5,
  FontDecrease: 0xe1c6,
  FontIncrease: 0xe1c7,
  FontSize: 0xe1c8,
  CellPhone: 0xe1c9,
  ReShare: 0xe1ca,
  Tag: 0xe1cb,
  RepeatOne: 0xe1cc,
  RepeatAll: 0xe1cd,
  OutlineStar: 0xe1ce,
  SolidStar: 0xe1cf,
  Calculator: 0xe1d0,
  Directions: 0xe1d1,
  Target: 0xe1d2,
  Library: 0xe1d3,
  PhoneBook: 0xe1d4,
  Memo: 0xe1d5,
  Microphone: 0xe1d6,
  PostUpdate: 0xe1d7,
  BackToWindow: 0xe1d8,
  FullScreen: 0xe1d9,
  NewFolder: 0xe1da,
  CalendarReply: 0xe1db,
  UnSyncFolder: 0xe1dd,
  ReportHacked: 0xe1de,
  SyncFolder: 0xe1df,
  BlockContact: 0xe1e0,
  SwitchApps: 0xe1e1,
  AddFriend: 0xe1e2,
  TouchPointer: 0xe1e3,
  GoToStart: 0xe1e4,
  ZeroBars: 0xe1e5,
  OneBar: 0xe1e6,
  TwoBars: 0xe1e7,
  ThreeBars: 0xe1e8,
  FourBars: 0xe1e9,
  Scan: 0xe294,
  Preview: 0xe295,
  GlobalNavigationButton: 0xe700,
  Share: 0xe72d,
  Print: 0xe749,
  XboxOneConsole: 0xe990,
};

export function symbolChar(name: string): string | null {
  const cp = SymbolCodes[name] ?? SymbolCodes[name.charAt(0).toUpperCase() + name.slice(1)];
  return cp ? String.fromCodePoint(cp) : null;
}

export type IconKind = 'symbol' | 'glyph' | 'path' | 'image' | 'chrome' | 'none';

export interface ParsedIcon {
  kind: IconKind;
  value: string;
}

export function parseIcon(spec: string | null | undefined): ParsedIcon {
  if (!spec) return { kind: 'none', value: '' };
  const s = spec.trim();
  if (!s) return { kind: 'none', value: '' };
  if (s.startsWith('svg:')) return { kind: 'path', value: s.slice(4) };
  if (s.startsWith('url:')) return { kind: 'image', value: s.slice(4) };
  if (s.startsWith('chrome:') && s.slice(7) in chromeGlyphs) return { kind: 'chrome', value: s.slice(7) };
  const cps = [...s];
  if (cps.length === 1 && (cps[0]!.codePointAt(0) ?? 0) > 0x2000) return { kind: 'glyph', value: s };
  const hex = /^(?:&#x|u\+|0x|x|\\u)?([0-9a-f]{4,5});?$/i.exec(s);
  if (hex) return { kind: 'glyph', value: String.fromCodePoint(Number.parseInt(hex[1]!, 16)) };
  const sym = symbolChar(s);
  if (sym) return { kind: 'symbol', value: sym };
  if (/[/.]/.test(s)) return { kind: 'image', value: s };
  return { kind: 'none', value: '' };
}

export function iconHtml(spec: string | null | undefined, size = 16): string {
  const p = parseIcon(spec);
  switch (p.kind) {
    case 'symbol':
    case 'glyph':
      return `<span class="w-icon" aria-hidden="true" style="font-size:${size}px;width:${size}px;height:${size}px;display:inline-flex;align-items:center;justify-content:center">${escapeHtml(p.value)}</span>`;
    case 'path':
      return `<svg class="w-icon-path" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true" style="flex:none;fill:currentColor"><path d="${escapeHtml(p.value)}"/></svg>`;
    case 'image':
      return `<img class="w-icon-image" src="${escapeHtml(p.value)}" alt="" width="${size}" height="${size}" style="flex:none;object-fit:contain">`;
    case 'chrome':
      return glyph(p.value as ChromeGlyph, size);
    default:
      return '';
  }
}

export { SymbolCodes as Symbol };
