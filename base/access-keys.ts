import { topPopup } from './popup.ts';

interface Target {
  el: HTMLElement;
  key: string;
}

let installed = false;
let active = false;
let typed = '';
let scope: ParentNode = document;
let layer: HTMLDivElement | null = null;
let altDown = false;
let altCombo = false;

const STYLE = `
#winui-keytips { position: fixed; inset: 0; margin: 0; padding: 0; border: 0; background: transparent; pointer-events: none; overflow: visible; width: 100vw; height: 100vh; max-width: none; max-height: none; }
#winui-keytips:not(:popover-open):not([data-open]) { display: none; }
.winui-keytip {
  position: fixed;
  min-width: 16px;
  padding: 4px;
  border: 1px solid transparent;
  border-radius: 4px;
  background: #767676;
  color: #fff;
  font: 600 12px/16px var(--w-font-family-text, "Segoe UI Variable Text", "Segoe UI", sans-serif);
  text-align: center;
  white-space: nowrap;
  box-shadow: var(--w-elevation-tooltip);
  transform: translate(-50%, 0);
  animation: winui-keytip-in var(--w-duration-faster, 83ms) linear;
}
.winui-keytip[data-dim] { opacity: 0.4; }
.winui-keytip mark { background: none; color: inherit; text-decoration: underline; }
@keyframes winui-keytip-in { from { opacity: 0; } to { opacity: 1; } }
@media (forced-colors: active) { .winui-keytip { background: CanvasText; color: Canvas; } }
`;

function ensureLayer(): HTMLDivElement {
  if (layer) return layer;
  const style = document.createElement('style');
  style.id = 'winui-keytips-style';
  style.textContent = STYLE;
  document.head.append(style);
  layer = document.createElement('div');
  layer.id = 'winui-keytips';
  layer.setAttribute('aria-hidden', 'true');
  if (typeof layer.showPopover === 'function') layer.setAttribute('popover', 'manual');
  document.body.append(layer);
  return layer;
}

function collect(root: ParentNode, out: Target[] = []): Target[] {
  const walker = (node: ParentNode) => {
    for (const el of Array.from((node as Element | Document | ShadowRoot).querySelectorAll?.('*') ?? [])) {
      const key = el.getAttribute('access-key');
      if (key && el instanceof HTMLElement && isVisible(el)) out.push({ el, key: key.toUpperCase() });
      if (el.shadowRoot) walker(el.shadowRoot);
    }
  };
  walker(root);
  return out;
}

function isVisible(el: HTMLElement): boolean {
  if (el.hasAttribute('disabled') || el.getAttribute('aria-disabled') === 'true') return false;
  if (el.getAttribute('key-tip-placement') === 'hidden') return false;
  const r = el.getBoundingClientRect();
  if (r.width === 0 && r.height === 0) return false;
  if (r.bottom < 0 || r.right < 0 || r.top > innerHeight || r.left > innerWidth) return false;
  const cs = getComputedStyle(el);
  return cs.visibility !== 'hidden' && cs.display !== 'none';
}

function inScope(t: Target): boolean {
  let n: Node | null = t.el.parentNode;
  while (n && n !== scope) {
    if (n instanceof HTMLElement && n.hasAttribute('access-key-scope') && n !== scope) return false;
    n = n instanceof ShadowRoot ? n.host : n.parentNode;
  }
  return true;
}

function targets(): Target[] {
  return collect(scope).filter(inScope);
}

function render(): void {
  const l = ensureLayer();
  l.textContent = '';
  for (const t of targets()) {
    const tip = document.createElement('span');
    tip.className = 'winui-keytip';
    const matched = typed && t.key.startsWith(typed);
    if (typed && !matched) tip.dataset.dim = '';
    tip.innerHTML = matched ? `<mark>${t.key.slice(0, typed.length)}</mark>${t.key.slice(typed.length)}` : t.key;
    const r = t.el.getBoundingClientRect();
    const place = t.el.getAttribute('key-tip-placement') ?? 'auto';
    const dx = Number(t.el.getAttribute('key-tip-horizontal-offset') ?? 0);
    const dy = Number(t.el.getAttribute('key-tip-vertical-offset') ?? 0);
    let x = r.left + r.width / 2;
    let y = r.bottom - 4;
    const role = t.el.getAttribute('role') ?? '';
    if (place === 'auto' && (role.startsWith('menuitem') || role === 'option' || role === 'treeitem')) {
      x = r.left + 18;
      y = r.top + r.height / 2 - 13;
    } else if (place === 'top') y = r.top - 22;
    else if (place === 'left') {
      x = r.left - 14;
      y = r.top + r.height / 2 - 13;
    } else if (place === 'right') {
      x = r.right + 14;
      y = r.top + r.height / 2 - 13;
    } else if (place === 'center') y = r.top + r.height / 2 - 13;
    tip.style.left = `${Math.round(x + dx)}px`;
    tip.style.top = `${Math.round(Math.min(y + dy, innerHeight - 28))}px`;
    l.append(tip);
  }
  if (typeof l.showPopover === 'function') {
    if (l.matches(':popover-open')) l.hidePopover();
    l.showPopover();
  } else l.toggleAttribute('data-open', true);
}

function enter(root: ParentNode = document): void {
  active = true;
  typed = '';
  scope = root;
  if (!targets().length) {
    exit();
    return;
  }
  render();
}

export function exitAccessKeyMode(): void {
  exit();
}

function exit(): void {
  active = false;
  typed = '';
  scope = document;
  if (layer) {
    layer.textContent = '';
    if (typeof layer.hidePopover === 'function' && layer.matches(':popover-open')) layer.hidePopover();
    layer.removeAttribute('data-open');
  }
}

function invoke(el: HTMLElement): void {
  const isInput =
    el.matches('input, textarea, select, [contenteditable=""], [contenteditable="true"]') ||
    el.localName.endsWith('-box') ||
    el.localName === 'win-combo-box';
  el.dispatchEvent(new CustomEvent('accesskeyinvoked', { bubbles: true, composed: true }));
  if (isInput) {
    el.focus();
    exit();
    return;
  }
  const before = topPopup();
  el.focus({ preventScroll: true });
  el.click();
  requestAnimationFrame(() => {
    const opened = topPopup();
    if (el.hasAttribute('access-key-scope')) enter(el);
    else if (opened && opened !== before && collect(opened.el).length) {
      const anims = [...opened.el.getAnimations({ subtree: true }), ...opened.surface.getAnimations({ subtree: true })];
      void Promise.race([
        Promise.all(anims.map((a) => a.finished.catch(() => undefined))),
        new Promise((r) => setTimeout(r, 400)),
      ]).then(() => {
        if (opened.isOpen) enter(opened.el);
        else exit();
      });
    } else exit();
  });
}

function onKeyDown(ev: KeyboardEvent): void {
  if (ev.key === 'Alt') {
    if (!ev.repeat) {
      altDown = true;
      altCombo = false;
    }
    return;
  }
  if (altDown) altCombo = true;

  if (ev.altKey && !ev.ctrlKey && !ev.metaKey && ev.key.length === 1) {
    if (ev.defaultPrevented) return;
    const k = ev.key.toUpperCase();
    const hit = collect(document)
      .filter(inScope)
      .find((t) => t.key === k && t.el.localName !== 'win-menu-bar-item');
    if (hit) {
      ev.preventDefault();
      if (active) exit();
      invoke(hit.el);
    }
    return;
  }

  if (!active) return;
  if (ev.key === 'Escape') {
    ev.preventDefault();
    ev.stopPropagation();
    if (scope !== document) {
      enter(document);
    } else exit();
    return;
  }
  if (ev.key === 'Backspace' && typed) {
    ev.preventDefault();
    typed = typed.slice(0, -1);
    render();
    return;
  }
  if (ev.key.length !== 1 || ev.ctrlKey || ev.metaKey) {
    if (ev.key === 'Tab') exit();
    return;
  }
  ev.preventDefault();
  ev.stopPropagation();
  const next = typed + ev.key.toUpperCase();
  const list = targets();
  const exact = list.find((t) => t.key === next);
  const prefix = list.filter((t) => t.key.startsWith(next));
  if (exact && prefix.length === 1) {
    invoke(exact.el);
  } else if (prefix.length) {
    typed = next;
    render();
  }
}

function onKeyUp(ev: KeyboardEvent): void {
  if (ev.key !== 'Alt') return;
  const lone = altDown && !altCombo;
  altDown = false;
  if (!lone) return;
  if (active) {
    ev.preventDefault();
    exit();
  } else if (collect(document).filter(inScope).length) {
    ev.preventDefault();
    enter(document);
  }
}

export function installAccessKeys(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener('keydown', onKeyDown, true);
  document.addEventListener('keyup', onKeyUp, true);
  document.addEventListener('pointerdown', () => active && exit(), true);
  addEventListener('blur', () => {
    altDown = false;
    if (active) exit();
  });
  addEventListener('resize', () => active && render());
}

export function enterAccessKeyMode(root?: ParentNode): void {
  installAccessKeys();
  enter(root ?? document);
}
