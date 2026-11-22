type Menu = HTMLElement & {
  showAt(anchor: Element, opts: Record<string, unknown>): void;
  hide(): void;
  isOpen: boolean;
};
type ThemeMode = 'light' | 'dark' | 'system';
type TextField = HTMLInputElement | HTMLTextAreaElement;

export interface GalleryContextMenuOptions {
  theme(): ThemeMode;
  setTheme(mode: ThemeMode): void;
  openSettings(): void;
}

const TEXT_INPUT =
  'input:not([type="checkbox"], [type="radio"], [type="range"], [type="button"], [type="submit"], [type="reset"], [type="color"], [type="file"], [type="image"], [type="hidden"]), textarea';

const item = (cmd: string, text: string, icon = '', accel = '', disabled = false) =>
  `<win-menu-flyout-item data-cmd="${cmd}" text="${text}"${icon ? ` icon="${icon}"` : ''}${accel ? ` accelerator="${accel}" accelerator-mode="text-only"` : ''}${disabled ? ' disabled' : ''}></win-menu-flyout-item>`;
const sep = '<win-menu-flyout-separator></win-menu-flyout-separator>';

function editTarget(path: EventTarget[]): HTMLElement | null {
  for (const n of path) {
    if (!(n instanceof HTMLElement)) continue;
    if (n.matches(TEXT_INPUT)) return (n as TextField).disabled ? null : n;
    if (n.isContentEditable) return n;
  }
  return null;
}

function linkTarget(path: EventTarget[]): string | null {
  for (const n of path) {
    if (n instanceof HTMLAnchorElement && n.href) return n.href;
    if (n instanceof HTMLElement && n.localName === 'win-hyperlink-button' && n.getAttribute('href')) {
      return new URL(n.getAttribute('href')!, location.href).href;
    }
  }
  return null;
}

function selectionIn(el: HTMLElement): Selection | null {
  const root = el.getRootNode() as Document | (ShadowRoot & { getSelection?(): Selection | null });
  return ('getSelection' in root && root.getSelection ? root.getSelection() : null) ?? document.getSelection();
}

export function installGalleryContextMenu(opts: GalleryContextMenuOptions): void {
  const menu = document.createElement('win-menu-flyout') as Menu;
  menu.id = 'gallery-context-menu';
  document.body.append(menu);

  let edit: HTMLElement | null = null;
  let editRange: Range | null = null;
  let editSel: [number, number] | null = null;
  let link: string | null = null;
  let sample: HTMLElement | null = null;
  let selected = '';

  const refocus = () => {
    if (!edit) return;
    edit.focus({ preventScroll: true });
    if (editSel && 'setSelectionRange' in edit) (edit as TextField).setSelectionRange(editSel[0], editSel[1]);
    else if (editRange) {
      const sel = selectionIn(edit);
      sel?.removeAllRanges();
      sel?.addRange(editRange);
    }
  };
  const copyText = (t: string) => void navigator.clipboard?.writeText(t).catch(() => {});

  const run: Record<string, () => void> = {
    undo: () => {
      refocus();
      document.execCommand('undo');
    },
    cut: () => {
      refocus();
      document.execCommand('cut');
    },
    copy: () => {
      if (edit) {
        refocus();
        document.execCommand('copy');
      } else copyText(selected);
    },
    paste: () => {
      const target = edit;
      void navigator.clipboard
        ?.readText()
        .then((t) => {
          if (target !== edit) return;
          refocus();
          document.execCommand('insertText', false, t);
        })
        .catch(() => {});
    },
    'select-all': () => {
      if (edit && 'select' in edit) {
        edit.focus({ preventScroll: true });
        (edit as TextField).select();
      } else if (edit) {
        edit.focus({ preventScroll: true });
        document.execCommand('selectAll');
      }
    },
    'open-link': () => link && window.open(link, '_blank', 'noopener'),
    'copy-link': () => link && copyText(link),
    'copy-code': () => {
      const code = [...(sample?.querySelectorAll('.code-wrap pre') ?? [])].map((p) => p.textContent ?? '').join('\n\n');
      if (code.trim()) copyText(code);
    },
    'sample-theme': () => sample?.querySelector<HTMLElement>('.sample-tools > *')?.click(),
    back: () => history.back(),
    forward: () => history.forward(),
    reload: () => location.reload(),
    'copy-page': () => copyText(location.href),
    'theme-light': () => opts.setTheme('light'),
    'theme-dark': () => opts.setTheme('dark'),
    'theme-system': () => opts.setTheme('system'),
    settings: () => opts.openSettings(),
  };

  menu.addEventListener('win-menu-invoke', (ev) => {
    const cmd = (ev.target as Element).closest('[data-cmd]')?.getAttribute('data-cmd');
    if (cmd) run[cmd]?.();
  });

  const build = (): string => {
    const parts: string[] = [];
    if (edit) {
      const hasSel = editSel ? editSel[0] !== editSel[1] : !!editRange && !editRange.collapsed;
      const readOnly = (edit as TextField).readOnly === true;
      parts.push(
        item('undo', '撤销', 'Undo', 'Ctrl+Z', readOnly),
        sep,
        item('cut', '剪切', 'Cut', 'Ctrl+X', !hasSel || readOnly),
        item('copy', '复制', 'Copy', 'Ctrl+C', !hasSel),
        item('paste', '粘贴', 'Paste', 'Ctrl+V', readOnly),
        sep,
        item('select-all', '全选', 'SelectAll', 'Ctrl+A'),
      );
      return parts.join('');
    }
    if (selected) parts.push(item('copy', '复制', 'Copy', 'Ctrl+C'), sep);
    if (link)
      parts.push(item('open-link', '在新标签页中打开链接', 'Globe'), item('copy-link', '复制链接地址', 'Link'), sep);
    if (sample) {
      const hasCode = !!sample.querySelector('.code-wrap pre');
      parts.push(
        item('copy-code', '复制示例代码', 'E943', '', !hasCode),
        item('sample-theme', '切换此示例的主题', 'E793'),
        sep,
      );
    }
    const mode = opts.theme();
    const radio = (m: ThemeMode, text: string) =>
      `<win-radio-menu-flyout-item data-cmd="theme-${m}" group="gallery-theme" text="${text}"${mode === m ? ' checked' : ''}></win-radio-menu-flyout-item>`;
    parts.push(
      item('back', '后退', 'Back', 'Alt+←'),
      item('forward', '前进', 'Forward', 'Alt+→'),
      item('reload', '重新加载', 'Refresh', 'F5'),
      sep,
      item('copy-page', '复制页面链接', 'Link'),
      sep,
      `<win-menu-flyout-sub-item text="主题" icon="E790">${radio('light', '浅色')}${radio('dark', '深色')}${radio('system', '跟随系统')}</win-menu-flyout-sub-item>`,
      item('settings', '设置', 'Setting'),
    );
    return parts.join('');
  };

  document.addEventListener('contextmenu', (ev) => {
    if (ev.defaultPrevented || ev.shiftKey) return;
    const path = ev.composedPath();
    if (path.includes(menu)) {
      ev.preventDefault();
      return;
    }
    edit = editTarget(path);
    editSel = null;
    editRange = null;
    if (edit && 'selectionStart' in edit) {
      const f = edit as TextField;
      editSel = [f.selectionStart ?? 0, f.selectionEnd ?? 0];
    } else if (edit) {
      const sel = selectionIn(edit);
      editRange = sel?.rangeCount ? sel.getRangeAt(0).cloneRange() : null;
    }
    link = edit ? null : linkTarget(path);
    sample =
      (path.find((n) => n instanceof HTMLElement && n.classList.contains('sample')) as HTMLElement | undefined) ?? null;
    selected = edit ? '' : (document.getSelection()?.toString() ?? '');
    ev.preventDefault();
    if (menu.isOpen) menu.hide();
    menu.innerHTML = build();
    const anchor = (path.find((n) => n instanceof Element) as Element | undefined) ?? document.body;
    const keyboard = ev.button !== 2 && ev.clientX === 0 && ev.clientY === 0;
    if (keyboard) menu.showAt(anchor, { placement: 'bottom-start', focus: 'first', inputType: 'keyboard' });
    else
      menu.showAt(anchor, {
        position: { x: ev.clientX, y: ev.clientY },
        focus: 'none',
        inputType: (ev as PointerEvent).pointerType === 'touch' ? 'touch' : 'mouse',
      });
  });
}
