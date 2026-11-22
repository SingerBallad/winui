export type Axis = 'horizontal' | 'vertical' | 'both' | 'grid';

export interface NavOptions {
  axis: Axis;
  wrap?: boolean;
  columns?: number | (() => number);
  page?: number;
  rtl?: boolean;
}

export function navigateIndex(key: string, current: number, count: number, o: NavOptions): number {
  if (count === 0) return -1;
  const wrap = o.wrap ?? false;
  const fix = (i: number) => (wrap ? ((i % count) + count) % count : Math.min(count - 1, Math.max(0, i)));
  const cols = typeof o.columns === 'function' ? o.columns() : (o.columns ?? 1);
  const prevH = o.rtl ? 'ArrowRight' : 'ArrowLeft';
  const nextH = o.rtl ? 'ArrowLeft' : 'ArrowRight';
  switch (key) {
    case 'Home':
      return 0;
    case 'End':
      return count - 1;
    case 'PageUp':
      return o.page ? Math.max(0, current - o.page) : -1;
    case 'PageDown':
      return o.page ? Math.min(count - 1, current + o.page) : -1;
  }
  if (o.axis === 'grid') {
    if (key === prevH) return fix(current - 1);
    if (key === nextH) return fix(current + 1);
    if (key === 'ArrowUp') return current - cols >= 0 ? current - cols : wrap ? fix(current - cols) : current;
    if (key === 'ArrowDown') return current + cols < count ? current + cols : wrap ? fix(current + cols) : current;
    return -1;
  }
  const back = (o.axis !== 'vertical' && key === prevH) || (o.axis !== 'horizontal' && key === 'ArrowUp');
  const fwd = (o.axis !== 'vertical' && key === nextH) || (o.axis !== 'horizontal' && key === 'ArrowDown');
  if (back) return fix(current - 1);
  if (fwd) return fix(current + 1);
  return -1;
}

export function setRovingIndex(items: readonly HTMLElement[], active: HTMLElement | null): void {
  const target = active ?? items[0] ?? null;
  for (const el of items) el.tabIndex = el === target ? 0 : -1;
}

export class TypeAhead {
  private buffer = '';
  private timer: ReturnType<typeof setTimeout> | null = null;
  constructor(private readonly timeout = 1000) {}

  match(key: string, labels: readonly string[], current: number): number {
    if (key.length !== 1 || (key === ' ' && !this.buffer)) return -1;
    if (this.timer) clearTimeout(this.timer);
    this.timer = setTimeout(() => (this.buffer = ''), this.timeout);
    const repeat = this.buffer.length === 1 && this.buffer === key.toLowerCase();
    this.buffer = repeat ? this.buffer : this.buffer + key.toLowerCase();
    const n = labels.length;
    const start = repeat || this.buffer.length === 1 ? current + 1 : current;
    for (let k = 0; k < n; k++) {
      const i = (((start + k) % n) + n) % n;
      if (labels[i]!.trim().toLowerCase().startsWith(this.buffer)) return i;
    }
    return -1;
  }

  reset(): void {
    this.buffer = '';
  }
}

export function keyboardActivation(
  host: HTMLElement,
  isDisabled: () => boolean,
  onPressedChange?: (pressed: boolean) => void,
): void {
  let spaceDown = false;
  host.addEventListener('keydown', (ev) => {
    if (isDisabled() || ev.target !== host) return;
    if (ev.key === 'Enter' && !ev.repeat) {
      ev.preventDefault();
      host.click();
    } else if (ev.key === ' ') {
      ev.preventDefault();
      if (!spaceDown) {
        spaceDown = true;
        host.toggleAttribute('data-pressed', true);
        onPressedChange?.(true);
      }
    }
  });
  host.addEventListener('keyup', (ev) => {
    if (ev.key !== ' ' || !spaceDown) return;
    spaceDown = false;
    host.removeAttribute('data-pressed');
    onPressedChange?.(false);
    if (!isDisabled() && ev.target === host) host.click();
  });
  host.addEventListener('blur', () => {
    if (spaceDown) {
      spaceDown = false;
      host.removeAttribute('data-pressed');
      onPressedChange?.(false);
    }
  });
}

export function acceleratorText(spec: string): string {
  return spec
    .split('+')
    .map((p) => p.trim())
    .map((p) => {
      const l = p.toLowerCase();
      if (l === 'control' || l === 'ctrl') return 'Ctrl';
      if (l === 'menu' || l === 'alt') return 'Alt';
      if (l === 'shift') return 'Shift';
      if (l === 'windows' || l === 'win' || l === 'meta') return 'Win';
      return p.length === 1 ? p.toUpperCase() : p.charAt(0).toUpperCase() + p.slice(1);
    })
    .join('+');
}

export function matchesAccelerator(ev: KeyboardEvent, spec: string): boolean {
  const parts = spec
    .toLowerCase()
    .split('+')
    .map((p) => p.trim());
  const key = parts.pop() ?? '';
  const want = {
    ctrl: parts.includes('ctrl') || parts.includes('control'),
    alt: parts.includes('alt') || parts.includes('menu'),
    shift: parts.includes('shift'),
    meta: parts.includes('win') || parts.includes('meta') || parts.includes('windows'),
  };
  if (ev.ctrlKey !== want.ctrl || ev.altKey !== want.alt || ev.shiftKey !== want.shift || ev.metaKey !== want.meta) {
    return false;
  }
  const k = ev.key.toLowerCase();
  return k === key || (key.length === 1 && ev.code.toLowerCase() === `key${key}`) || (key === 'del' && k === 'delete');
}
