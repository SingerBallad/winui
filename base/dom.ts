export const clamp = (v: number, min: number, max: number): number => Math.min(max, Math.max(min, v));

export function deepActiveElement(root: Document | ShadowRoot = document): Element | null {
  let a = root.activeElement;
  while (a?.shadowRoot?.activeElement) a = a.shadowRoot.activeElement;
  return a;
}

export function composedContains(ancestor: Node, node: Node | null): boolean {
  let n: Node | null = node;
  while (n) {
    if (n === ancestor) return true;
    const slot = (n as Element).assignedSlot;
    if (slot) {
      n = slot;
      continue;
    }
    n = n instanceof ShadowRoot ? n.host : n.parentNode;
  }
  return false;
}

const FOCUSABLE =
  'a[href], area[href], button:not([disabled]), input:not([disabled]):not([type="hidden"]), select:not([disabled]), textarea:not([disabled]), iframe, [contenteditable=""], [contenteditable="true"], [tabindex]';

export function isFocusable(el: Element): boolean {
  if (!(el instanceof HTMLElement)) return false;
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return false;
  if (el.tabIndex < 0) return false;
  if (!el.matches(FOCUSABLE) && !(el.tabIndex >= 0 && el.localName.includes('-'))) return false;
  const style = getComputedStyle(el);
  return style.visibility !== 'hidden' && style.display !== 'none' && el.getClientRects().length > 0;
}

export function tabbables(root: ParentNode): HTMLElement[] {
  const out: HTMLElement[] = [];
  const walk = (node: ParentNode) => {
    for (const el of Array.from(node.children)) {
      if (isFocusable(el)) out.push(el as HTMLElement);
      if (el instanceof HTMLSlotElement) {
        for (const a of el.assignedElements({ flatten: true })) {
          if (isFocusable(a)) out.push(a as HTMLElement);
          walk(a);
        }
      } else if (!(el.localName.includes('-') && isFocusable(el))) {
        walk(el);
      }
      if (el.shadowRoot && !isFocusable(el)) walk(el.shadowRoot);
    }
  };
  walk(root);
  return out;
}

export function focusFirst(root: ParentNode): boolean {
  const t = tabbables(root)[0];
  if (t) {
    t.focus({ preventScroll: true });
    return true;
  }
  return false;
}

export function isRtl(el: Element): boolean {
  return getComputedStyle(el).direction === 'rtl';
}

export function listen<K extends keyof HTMLElementEventMap>(
  target: EventTarget,
  type: K | string,
  handler: (ev: HTMLElementEventMap[K]) => void,
  opts?: AddEventListenerOptions | boolean,
): () => void {
  target.addEventListener(type, handler as EventListener, opts);
  return () => target.removeEventListener(type, handler as EventListener, opts);
}

export class Disposables {
  private list: (() => void)[] = [];
  add(fn: () => void): void {
    this.list.push(fn);
  }
  dispose(): void {
    for (const fn of this.list.splice(0)) fn();
  }
}

export function rafThrottle<A extends unknown[]>(fn: (...args: A) => void): (...args: A) => void {
  let queued = false;
  let last: A;
  return (...args: A) => {
    last = args;
    if (queued) return;
    queued = true;
    requestAnimationFrame(() => {
      queued = false;
      fn(...last);
    });
  };
}

export const nextFrame = (): Promise<void> => new Promise((r) => requestAnimationFrame(() => r()));

export function parseList(v: string | null | undefined): string[] {
  if (!v) return [];
  const t = v.trim();
  if (t.startsWith('[')) {
    try {
      const arr = JSON.parse(t) as unknown;
      if (Array.isArray(arr)) return arr.map(String);
    } catch {}
  }
  return t
    .split(/[;\n]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

export function isTouch(ev: PointerEvent | null | undefined): boolean {
  return ev?.pointerType === 'touch' || ev?.pointerType === 'pen';
}

export function scrollIntoViewWithin(scroller: Element, el: Element, axis: 'x' | 'y' | 'both' = 'both'): void {
  const s = scroller.getBoundingClientRect();
  const r = el.getBoundingClientRect();
  if (axis !== 'x') {
    if (r.top < s.top) scroller.scrollTop -= s.top - r.top;
    else if (r.bottom > s.bottom) scroller.scrollTop += Math.min(r.bottom - s.bottom, r.top - s.top);
  }
  if (axis !== 'y') {
    if (r.left < s.left) scroller.scrollLeft -= s.left - r.left;
    else if (r.right > s.right) scroller.scrollLeft += Math.min(r.right - s.right, r.left - s.left);
  }
}
