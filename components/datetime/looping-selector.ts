import { acrylicSurface, css, focusRing } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { escapeHtml } from '../../base/element.ts';
import { motionEnabled } from '../../motion/animate.ts';

export const ITEM_H = 40;
export const PRESENTER_MAX_H = 398;
export const ACCEPT_H = 41;

function bezier(x1: number, y1: number, x2: number, y2: number): (t: number) => number {
  const cx = 3 * x1;
  const bx = 3 * (x2 - x1) - cx;
  const ax = 1 - cx - bx;
  const cy = 3 * y1;
  const by = 3 * (y2 - y1) - cy;
  const ay = 1 - cy - by;
  const sx = (t: number) => ((ax * t + bx) * t + cx) * t;
  const sy = (t: number) => ((ay * t + by) * t + cy) * t;
  const dx = (t: number) => (3 * ax * t + 2 * bx) * t + cx;
  return (x: number) => {
    if (x <= 0) return 0;
    if (x >= 1) return 1;
    let t = x;
    for (let i = 0; i < 8; i++) {
      const err = sx(t) - x;
      if (Math.abs(err) < 1e-5) break;
      const d = dx(t);
      if (Math.abs(d) < 1e-6) break;
      t -= err / d;
    }
    t = Math.min(1, Math.max(0, t));
    return sy(t);
  };
}
const decelerate = bezier(0, 0, 0, 1);

export const pickerPresenterCss = css`
.presenter {
  box-sizing: border-box;
  display: flex;
  flex-direction: column;
  width: var(--picker-width, 296px);
  height: min(${PRESENTER_MAX_H}px, var(--w-popup-max-height, ${PRESENTER_MAX_H}px));
  border: 1px solid var(--w-surface-stroke-color-flyout);
  border-radius: var(--w-corner-radius-control);
  ${acrylicSurface}
  box-shadow: var(--w-elevation-flyout);
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  overflow: hidden;
  outline: none;
  user-select: none;
  -webkit-user-select: none;
}
.host {
  position: relative;
  flex: 1 1 auto;
  min-height: 0;
  display: flex;
  overflow: hidden;
}
.band {
  position: absolute;
  left: 4px;
  right: 4px;
  top: var(--band-top, 157px);
  height: ${ITEM_H}px;
  border-radius: var(--w-corner-radius-control);
  background: var(--w-accent-fill-color-default);
  z-index: 1;
  pointer-events: none;
}
.spacer {
  flex: none;
  width: 1px;
  background: var(--w-divider-stroke-color-default);
  z-index: 3;
}
.ls {
  position: relative;
  flex: 1 1 0;
  min-width: 0;
  outline: none;
  cursor: default;
  touch-action: none;
}
${focusRing('.ls:focus-visible', 0)}
.ls:focus-visible { border-radius: var(--w-corner-radius-control); z-index: 4; }
.layer { position: absolute; inset: 0; pointer-events: none; }
.layer.base { pointer-events: auto; }
.layer.overlay {
  z-index: 2;
  clip-path: inset(var(--band-top, 157px) 0 calc(100% - var(--band-top, 157px) - ${ITEM_H}px) 0);
  color: var(--w-text-on-accent-fill-color-primary);
}
.it {
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: ${ITEM_H}px;
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 3px 0 6px;
  box-sizing: border-box;
  white-space: nowrap;
  overflow: hidden;
  will-change: transform;
}
.ls[data-align="start"] .it { justify-content: flex-start; padding-left: 10px; }
.it::before {
  content: '';
  position: absolute;
  inset: 2px 4px;
  border-radius: var(--w-corner-radius-control);
  z-index: -1;
}
.base .it { z-index: 0; isolation: isolate; }
.base .it:hover::before { background: var(--w-subtle-fill-color-secondary); }
.base .it:active::before { background: var(--w-subtle-fill-color-tertiary); }
.base .it:active { color: var(--w-text-fill-color-secondary); }
.it[hidden] { display: none; }
.updown {
  position: absolute;
  left: 0;
  right: 0;
  height: 34px;
  display: none;
  place-items: center;
  border: 0;
  margin: 0;
  padding: 0;
  z-index: 4;
  ${acrylicSurface}
  color: var(--w-text-fill-color-secondary);
  outline: none;
  cursor: default;
}
.updown.up { top: 0; }
.updown.down { bottom: 0; }
.ls:hover .updown { display: grid; }
.updown:hover { color: var(--w-text-fill-color-primary); }
.updown .w-glyph { transition: scale var(--w-duration-faster) var(--w-ease-decelerate); }
.updown:active .w-glyph { scale: 0.875; }
.actions {
  position: relative;
  flex: none;
  height: ${ACCEPT_H}px;
  display: grid;
  grid-template-columns: 1fr 1fr;
}
.actions::before {
  content: '';
  position: absolute;
  left: 0;
  right: 0;
  top: 0;
  height: 1px;
  background: var(--w-divider-stroke-color-default);
}
.act {
  margin: 4px 2px 4px 4px;
  padding: 4px;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: var(--w-text-fill-color-primary);
  display: grid;
  place-items: center;
  outline: none;
  cursor: default;
  transition: background-color var(--w-duration-faster) linear;
}
.act.dismiss { margin: 4px 4px 4px 2px; }
.act:hover { background: var(--w-subtle-fill-color-secondary); }
.act:active { background: var(--w-subtle-fill-color-tertiary); }
${focusRing('.act:focus-visible', 0)}
`;

export interface LoopingColumnOptions {
  items: string[];
  index: number;
  loop: boolean;
  align: 'center' | 'start';
  label: string;
  onChange?: (index: number) => void;
}

const mod = (n: number, m: number) => ((n % m) + m) % m;

export class LoopingColumn {
  readonly el: HTMLElement;
  private base: HTMLElement;
  private overlay: HTMLElement;
  private pool: { b: HTMLElement; o: HTMLElement; idx: number }[] = [];
  private items: string[] = [];
  private loop = true;
  private offset = 0;
  private height = 0;
  private bandTop = 0;
  private raf = 0;
  private tween: { from: number; to: number; start: number; dur: number } | null = null;
  private drag: { id: number; y: number; off: number; t: number; v: number; moved: boolean } | null = null;
  private lastIndex = 0;
  private onChange: ((i: number) => void) | undefined;
  private repeatTimer: ReturnType<typeof setTimeout> | null = null;

  constructor(opts: LoopingColumnOptions) {
    this.el = document.createElement('div');
    this.el.className = 'ls';
    this.el.tabIndex = 0;
    this.el.dataset.align = opts.align;
    this.el.setAttribute('role', 'listbox');
    this.el.setAttribute('aria-label', opts.label);
    this.base = document.createElement('div');
    this.base.className = 'layer base';
    this.overlay = document.createElement('div');
    this.overlay.className = 'layer overlay';
    this.overlay.setAttribute('aria-hidden', 'true');
    const up = document.createElement('button');
    up.className = 'updown up';
    up.tabIndex = -1;
    up.setAttribute('aria-hidden', 'true');
    up.innerHTML = glyph('caretUp', 8);
    const down = document.createElement('button');
    down.className = 'updown down';
    down.tabIndex = -1;
    down.setAttribute('aria-hidden', 'true');
    down.innerHTML = glyph('caretDown', 8);
    this.el.append(this.base, this.overlay, up, down);
    this.onChange = opts.onChange;
    this.setItems(opts.items, opts.index, opts.loop);
    this.wire(up, down);
  }

  get index(): number {
    const n = this.items.length;
    if (!n) return 0;
    const r = this.tween ? Math.round(this.tween.to) : Math.round(this.offset);
    return this.loop ? mod(r, n) : Math.min(n - 1, Math.max(0, r));
  }

  get count(): number {
    return this.items.length;
  }

  setItems(items: string[], index: number, loop = this.loop): void {
    this.items = items.slice();
    this.loop = loop && items.length > 1;
    const n = items.length;
    const i = Math.min(Math.max(0, index), Math.max(0, n - 1));
    if (this.loop && n) {
      const lap = Math.floor(Math.round(this.offset) / n);
      this.offset = lap * n + i;
    } else this.offset = i;
    this.lastIndex = i;
    this.tween = null;
    this.layout();
    this.syncAria();
  }

  measure(height: number, bandTop: number): void {
    this.height = height;
    this.bandTop = bandTop;
    const need = Math.ceil(height / ITEM_H) + 4;
    while (this.pool.length < need) {
      const b = document.createElement('div');
      b.className = 'it';
      b.setAttribute('role', 'option');
      const o = document.createElement('div');
      o.className = 'it';
      this.base.append(b);
      this.overlay.append(o);
      this.pool.push({ b, o, idx: Number.NaN });
    }
    this.layout();
  }

  select(index: number, animate = true): void {
    const n = this.items.length;
    if (!n) return;
    let target: number;
    if (this.loop) {
      const cur = this.offset;
      const base = Math.round(cur);
      const delta = mod(index - mod(base, n), n);
      const alt = delta - n;
      target = base + (Math.abs(alt) < Math.abs(delta) ? alt : delta);
    } else target = Math.min(n - 1, Math.max(0, index));
    this.scrollTo(target, animate);
  }

  step(delta: number, animate = true): void {
    const base = this.tween ? this.tween.to : Math.round(this.offset);
    let target = base + delta;
    if (!this.loop) target = Math.min(this.items.length - 1, Math.max(0, target));
    this.scrollTo(target, animate);
  }

  private scrollTo(target: number, animate: boolean): void {
    cancelAnimationFrame(this.raf);
    if (!animate || !motionEnabled() || Math.abs(target - this.offset) < 0.001) {
      this.offset = target;
      this.tween = null;
      this.layout();
      this.settle();
      return;
    }
    this.tween = { from: this.offset, to: target, start: performance.now(), dur: 250 };
    const tick = (now: number) => {
      const t = this.tween;
      if (!t) return;
      const p = Math.min(1, (now - t.start) / t.dur);
      this.offset = t.from + (t.to - t.from) * decelerate(p);
      this.layout();
      if (p < 1) this.raf = requestAnimationFrame(tick);
      else {
        this.tween = null;
        this.settle();
      }
    };
    this.raf = requestAnimationFrame(tick);
  }

  private settle(): void {
    const i = this.index;
    this.syncAria();
    if (i !== this.lastIndex) {
      this.lastIndex = i;
      this.onChange?.(i);
    }
  }

  private syncAria(): void {
    const label = this.items[this.index] ?? '';
    this.el.setAttribute('aria-valuetext', label);
    this.el.setAttribute('aria-activedescendant', '');
    this.el.title = '';
  }

  private layout(): void {
    const n = this.items.length;
    if (!this.height || !n) {
      for (const p of this.pool) {
        p.b.hidden = true;
        p.o.hidden = true;
      }
      return;
    }
    const center = this.bandTop;
    const first = Math.floor(this.offset - center / ITEM_H) - 1;
    for (let k = 0; k < this.pool.length; k++) {
      const p = this.pool[k]!;
      const i = first + k;
      const y = center + (i - this.offset) * ITEM_H;
      const valid = this.loop || (i >= 0 && i < n);
      const visible = valid && y > -ITEM_H && y < this.height;
      p.b.hidden = !visible;
      p.o.hidden = !visible;
      if (!visible) continue;
      const idx = this.loop ? mod(i, n) : i;
      if (p.idx !== idx) {
        p.idx = idx;
        const text = this.items[idx] ?? '';
        p.b.textContent = text;
        p.o.textContent = text;
        p.b.dataset.i = String(i);
      } else p.b.dataset.i = String(i);
      const tf = `translateY(${y}px)`;
      p.b.style.transform = tf;
      p.o.style.transform = tf;
      p.b.setAttribute('aria-selected', String(idx === this.index));
    }
  }

  private wire(up: HTMLButtonElement, down: HTMLButtonElement): void {
    const repeat = (dir: number) => {
      this.step(dir);
      const again = () => {
        this.step(dir);
        this.repeatTimer = setTimeout(again, 100);
      };
      this.repeatTimer = setTimeout(again, 400);
    };
    const stopRepeat = () => {
      if (this.repeatTimer) clearTimeout(this.repeatTimer);
      this.repeatTimer = null;
    };
    for (const [btn, dir] of [
      [up, -1],
      [down, 1],
    ] as const) {
      btn.addEventListener('pointerdown', (ev) => {
        ev.preventDefault();
        ev.stopPropagation();
        btn.setPointerCapture(ev.pointerId);
        repeat(dir);
      });
      btn.addEventListener('pointerup', stopRepeat);
      btn.addEventListener('pointercancel', stopRepeat);
      btn.addEventListener('lostpointercapture', stopRepeat);
    }

    this.el.addEventListener(
      'wheel',
      (ev) => {
        ev.preventDefault();
        const dir = ev.deltaY > 0 ? 1 : ev.deltaY < 0 ? -1 : 0;
        if (dir) this.step(dir);
      },
      { passive: false },
    );

    this.base.addEventListener('pointerdown', (ev) => {
      if (ev.button !== 0) return;
      cancelAnimationFrame(this.raf);
      this.tween = null;
      this.drag = { id: ev.pointerId, y: ev.clientY, off: this.offset, t: performance.now(), v: 0, moved: false };
    });
    this.base.addEventListener('pointermove', (ev) => {
      const d = this.drag;
      if (!d || d.id !== ev.pointerId) return;
      const dy = ev.clientY - d.y;
      if (!d.moved && Math.abs(dy) < 4) return;
      if (!d.moved) {
        d.moved = true;
        this.base.setPointerCapture(ev.pointerId);
      }
      const now = performance.now();
      const prev = this.offset;
      let off = d.off - dy / ITEM_H;
      if (!this.loop) off = Math.min(this.items.length - 1 + 0.4, Math.max(-0.4, off));
      this.offset = off;
      const dt = Math.max(1, now - d.t);
      d.v = (this.offset - prev) / dt;
      d.t = now;
      this.layout();
    });
    const end = (ev: PointerEvent) => {
      const d = this.drag;
      if (!d || d.id !== ev.pointerId) return;
      this.drag = null;
      if (!d.moved) {
        const it = (ev.target as Element).closest<HTMLElement>('.it');
        const i = it ? Number(it.dataset.i) : Number.NaN;
        if (Number.isFinite(i)) this.scrollTo(this.loop ? i : Math.min(this.items.length - 1, Math.max(0, i)), true);
        return;
      }
      let target = Math.round(this.offset + d.v * 180);
      if (!this.loop) target = Math.min(this.items.length - 1, Math.max(0, target));
      this.scrollTo(target, true);
    };
    this.base.addEventListener('pointerup', end);
    this.base.addEventListener('pointercancel', end);

    this.el.addEventListener('keydown', (ev) => {
      const page = Math.max(1, Math.floor(this.height / ITEM_H) - 1);
      switch (ev.key) {
        case 'ArrowUp':
          this.step(-1);
          break;
        case 'ArrowDown':
          this.step(1);
          break;
        case 'PageUp':
          this.step(-page);
          break;
        case 'PageDown':
          this.step(page);
          break;
        case 'Home':
          this.select(0);
          break;
        case 'End':
          this.select(this.items.length - 1);
          break;
        default:
          return;
      }
      ev.preventDefault();
      ev.stopPropagation();
    });
  }

  dispose(): void {
    cancelAnimationFrame(this.raf);
    if (this.repeatTimer) clearTimeout(this.repeatTimer);
  }
}

export interface PickerColumnSpec {
  key: string;
  items: string[];
  index: number;
  loop: boolean;
  weight: number;
  align: 'center' | 'start';
  label: string;
}

export class PickerPresenter {
  readonly el: HTMLElement;
  private host: HTMLElement;
  private cols = new Map<string, LoopingColumn>();
  onAccept: (() => void) | null = null;
  onDismiss: (() => void) | null = null;
  onColumnChange: ((key: string, index: number) => void) | null = null;

  constructor(acceptLabel: string, dismissLabel: string) {
    this.el = document.createElement('div');
    this.el.className = 'presenter';
    this.el.setAttribute('part', 'presenter');
    this.el.setAttribute('role', 'dialog');
    this.el.tabIndex = -1;
    this.el.innerHTML = `<div class="host" part="columns"><div class="band" part="highlight"></div></div><div class="actions" part="actions"><button type="button" class="act accept" aria-label="${escapeHtml(acceptLabel)}">${glyph('checkMark', 16)}</button><button type="button" class="act dismiss" aria-label="${escapeHtml(dismissLabel)}">${glyph('cancel', 16)}</button></div>`;
    this.host = this.el.querySelector('.host')!;
    this.el.querySelector('.accept')!.addEventListener('click', () => this.onAccept?.());
    this.el.querySelector('.dismiss')!.addEventListener('click', () => this.onDismiss?.());
    this.el.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' && !(ev.target as Element).closest('.act')) {
        ev.preventDefault();
        this.onAccept?.();
      }
    });
  }

  setColumns(specs: PickerColumnSpec[]): void {
    for (const c of this.cols.values()) c.dispose();
    this.cols.clear();
    for (const n of Array.from(this.host.children)) if (!n.classList.contains('band')) n.remove();
    specs.forEach((s, i) => {
      if (i > 0) {
        const sp = document.createElement('div');
        sp.className = 'spacer';
        this.host.append(sp);
      }
      const col = new LoopingColumn({
        items: s.items,
        index: s.index,
        loop: s.loop,
        align: s.align,
        label: s.label,
        onChange: (idx) => this.onColumnChange?.(s.key, idx),
      });
      col.el.style.flex = `${s.weight} 1 0`;
      col.el.dataset.key = s.key;
      this.cols.set(s.key, col);
      this.host.append(col.el);
    });
  }

  column(key: string): LoopingColumn | undefined {
    return this.cols.get(key);
  }

  measure(): void {
    const h = this.host.clientHeight;
    const bandTop = Math.round((h - ITEM_H) / 2);
    this.el.style.setProperty('--band-top', `${bandTop}px`);
    for (const c of this.cols.values()) c.measure(h, bandTop);
  }

  get bandOffset(): number {
    const h = this.host.clientHeight;
    return 1 + Math.round((h - ITEM_H) / 2);
  }

  focusFirst(): void {
    this.cols.values().next().value?.el.focus({ preventScroll: true });
  }
}
