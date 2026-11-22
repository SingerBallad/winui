import { matchesAccelerator } from '../../base/keyboard.ts';
import type { CommandLike } from '../flyouts/menu-flyout.ts';

export interface UICommandInit {
  label?: string;
  icon?: string;
  accelerator?: string;
  description?: string;
  accessKey?: string;
  execute?: (parameter?: unknown) => void;
  canExecute?: (parameter?: unknown) => boolean;
}

export class UICommand extends EventTarget implements CommandLike {
  label: string;
  icon: string;
  accelerator: string;
  description: string;
  accessKey: string;
  private readonly onExecute?: (parameter?: unknown) => void;
  private readonly onCanExecute?: (parameter?: unknown) => boolean;

  constructor(init: UICommandInit = {}) {
    super();
    this.label = init.label ?? '';
    this.icon = init.icon ?? '';
    this.accelerator = init.accelerator ?? '';
    this.description = init.description ?? '';
    this.accessKey = init.accessKey ?? '';
    if (init.execute) this.onExecute = init.execute;
    if (init.canExecute) this.onCanExecute = init.canExecute;
  }

  execute(parameter?: unknown): void {
    if (!this.canExecute(parameter)) return;
    this.onExecute?.(parameter);
    this.dispatchEvent(new CustomEvent('executerequested', { detail: { parameter } }));
  }

  canExecute(parameter?: unknown): boolean {
    let can = this.onCanExecute ? this.onCanExecute(parameter) : true;
    const ev = new CustomEvent('canexecuterequested', {
      detail: {
        parameter,
        get canExecute() {
          return can;
        },
        set canExecute(v: boolean) {
          can = v;
        },
      },
    });
    this.dispatchEvent(ev);
    return can;
  }

  notifyCanExecuteChanged(): void {
    this.dispatchEvent(new Event('canexecutechanged'));
  }
}

export type StandardUICommandKind =
  | 'cut'
  | 'copy'
  | 'paste'
  | 'select-all'
  | 'delete'
  | 'share'
  | 'save'
  | 'open'
  | 'close'
  | 'pause'
  | 'play'
  | 'stop'
  | 'forward'
  | 'backward'
  | 'undo'
  | 'redo';

interface Preset {
  glyph: string;
  accelerator: string;
  en: [string, string];
  zh: [string, string];
}

const PRESETS: Record<StandardUICommandKind, Preset> = {
  cut: {
    glyph: '',
    accelerator: 'Ctrl+X',
    en: ['Cut', 'Delete the selected content and copy it to the clipboard.'],
    zh: ['剪切', '删除所选内容并将其复制到剪贴板。'],
  },
  copy: {
    glyph: '',
    accelerator: 'Ctrl+C',
    en: ['Copy', 'Copy the selected content to the clipboard.'],
    zh: ['复制', '将所选内容复制到剪贴板。'],
  },
  paste: {
    glyph: '',
    accelerator: 'Ctrl+V',
    en: ['Paste', 'Insert the clipboard content.'],
    zh: ['粘贴', '插入剪贴板内容。'],
  },
  'select-all': {
    glyph: '',
    accelerator: 'Ctrl+A',
    en: ['Select All', 'Select all content.'],
    zh: ['全选', '选择所有内容。'],
  },
  delete: {
    glyph: '',
    accelerator: 'Delete',
    en: ['Delete', 'Delete the selected content.'],
    zh: ['删除', '删除所选内容。'],
  },
  share: { glyph: '', accelerator: '', en: ['Share', 'Share the selected content.'], zh: ['共享', '共享所选内容。'] },
  save: { glyph: '', accelerator: 'Ctrl+S', en: ['Save', 'Save changes.'], zh: ['保存', '保存更改。'] },
  open: { glyph: '', accelerator: 'Ctrl+O', en: ['Open', 'Open panel.'], zh: ['打开', '打开面板。'] },
  close: { glyph: '', accelerator: 'Alt+F4', en: ['Close', 'Close panel.'], zh: ['关闭', '关闭面板。'] },
  pause: {
    glyph: '',
    accelerator: 'Space',
    en: ['Pause', 'Pause currently playing media.'],
    zh: ['暂停', '暂停当前播放的媒体。'],
  },
  play: {
    glyph: '',
    accelerator: 'Space',
    en: ['Play', 'Play currently paused media.'],
    zh: ['播放', '播放当前暂停的媒体。'],
  },
  stop: { glyph: '', accelerator: 'Escape', en: ['Stop', 'Stop media.'], zh: ['停止', '停止媒体。'] },
  forward: { glyph: '', accelerator: 'Alt+Right', en: ['Forward', 'Skip forward.'], zh: ['前进', '向前跳过。'] },
  backward: { glyph: '', accelerator: 'Alt+Left', en: ['Back', 'Skip back.'], zh: ['后退', '向后跳过。'] },
  undo: {
    glyph: '',
    accelerator: 'Ctrl+Z',
    en: ['Undo', 'Revert the most recent action.'],
    zh: ['撤消', '撤消最近的操作。'],
  },
  redo: {
    glyph: '',
    accelerator: 'Ctrl+Y',
    en: ['Redo', 'Repeat the most recently undone action.'],
    zh: ['重做', '重复最近撤消的操作。'],
  },
};

export function normalizeCommandKind(kind: string): StandardUICommandKind | null {
  const k = kind.trim().toLowerCase().replace(/[\s_]/g, '');
  const map: Record<string, StandardUICommandKind> = {
    cut: 'cut',
    copy: 'copy',
    paste: 'paste',
    selectall: 'select-all',
    'select-all': 'select-all',
    delete: 'delete',
    share: 'share',
    save: 'save',
    open: 'open',
    close: 'close',
    pause: 'pause',
    play: 'play',
    stop: 'stop',
    forward: 'forward',
    backward: 'backward',
    back: 'backward',
    undo: 'undo',
    redo: 'redo',
  };
  return map[k] ?? null;
}

const zh = () =>
  typeof navigator !== 'undefined' && /^zh/i.test(document.documentElement.lang || navigator.language || '');

export class StandardUICommand extends UICommand {
  readonly kind: StandardUICommandKind;
  constructor(kind: StandardUICommandKind | string, init: UICommandInit = {}) {
    const k = normalizeCommandKind(kind) ?? 'copy';
    const p = PRESETS[k];
    const [label, description] = zh() ? p.zh : p.en;
    super({ label, description, icon: p.glyph, accelerator: p.accelerator, ...init });
    this.kind = k;
  }

  static preset(
    kind: StandardUICommandKind | string,
  ): { label: string; icon: string; accelerator: string; description: string } | null {
    const k = normalizeCommandKind(kind);
    if (!k) return null;
    const p = PRESETS[k];
    const [label, description] = zh() ? p.zh : p.en;
    return { label, icon: p.glyph, accelerator: p.accelerator, description };
  }
}

const EDIT_KEYS = /^(ctrl\+(a|c|v|x|z|y)|delete|backspace|space|escape|home|end|arrowleft|arrowright|left|right)$/i;

function isEditable(el: Element | null): boolean {
  if (!el) return false;
  if (el instanceof HTMLTextAreaElement) return true;
  if (el instanceof HTMLInputElement)
    return !['button', 'checkbox', 'radio', 'submit', 'reset', 'range', 'color'].includes(el.type);
  return el instanceof HTMLElement && el.isContentEditable;
}

function deepFocus(): Element | null {
  let a = document.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

function isUsable(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return false;
  if (el.closest('[hidden], [inert]')) return false;
  return true;
}

function inScope(el: HTMLElement, focus: Element | null): boolean {
  const scope = el.closest('[accelerator-scope]');
  if (!scope) return true;
  for (let n: Node | null = focus; n; n = n instanceof ShadowRoot ? n.host : n.parentNode) {
    if (n === scope) return true;
  }
  return false;
}

function normalizeSpec(spec: string): string {
  return spec
    .split('+')
    .map((p) => p.trim())
    .map((p) => {
      const l = p.toLowerCase();
      if (l === 'left' || l === 'right' || l === 'up' || l === 'down')
        return `Arrow${l[0]!.toUpperCase()}${l.slice(1)}`;
      if (l === 'space') return ' ';
      if (l === 'esc') return 'Escape';
      if (l === 'del') return 'Delete';
      if (l === 'plus') return '+';
      return p;
    })
    .join('+');
}

function matches(ev: KeyboardEvent, spec: string): boolean {
  const s = normalizeSpec(spec);
  if (s.endsWith('+ ') || s === ' ') {
    const mods = s.slice(0, -1).toLowerCase();
    return (
      ev.key === ' ' &&
      ev.ctrlKey === mods.includes('ctrl') &&
      ev.altKey === mods.includes('alt') &&
      ev.shiftKey === mods.includes('shift') &&
      ev.metaKey === (mods.includes('win') || mods.includes('meta'))
    );
  }
  return matchesAccelerator(ev, s);
}

let acceleratorsInstalled = false;

export function installAccelerators(): void {
  if (acceleratorsInstalled || typeof document === 'undefined') return;
  acceleratorsInstalled = true;
  document.addEventListener('keydown', (ev) => {
    if (ev.defaultPrevented || ev.repeat || ev.isComposing) return;
    if (['Control', 'Shift', 'Alt', 'Meta'].includes(ev.key)) return;
    const focus = deepFocus();
    const editing = isEditable(focus);
    for (const el of document.querySelectorAll<HTMLElement>('[accelerator]')) {
      if (el.getAttribute('accelerator-mode') === 'text-only') continue;
      const specs = (el.getAttribute('accelerator') ?? '')
        .split(/[,;]/)
        .map((s) => s.trim())
        .filter(Boolean);
      const hit = specs.find((s) => matches(ev, s));
      if (!hit) continue;
      if (editing && (EDIT_KEYS.test(hit.replace(/\s+/g, '')) || !/ctrl|alt|meta|win/i.test(hit))) continue;
      if (!isUsable(el) || !inScope(el, focus)) continue;
      const ok = el.dispatchEvent(
        new CustomEvent('acceleratorinvoked', {
          bubbles: true,
          composed: true,
          cancelable: true,
          detail: { accelerator: hit },
        }),
      );
      ev.preventDefault();
      ev.stopPropagation();
      if (ok) el.click();
      return;
    }
  });
}
installAccelerators();
