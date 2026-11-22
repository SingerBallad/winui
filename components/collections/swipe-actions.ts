import { WinElement, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { iconHtml } from '../../base/icons.ts';
import { animate, cancelAnimations, durations, easings, settled } from '../../motion/animate.ts';

export type SwipeMode = 'reveal' | 'execute';
export type SwipeBehaviorOnInvoked = 'auto' | 'close' | 'remain-open';

const swipeItemCss = css`
:host {
  display: inline-flex;
  flex: none;
  align-items: center;
  justify-content: center;
  box-sizing: border-box;
  min-width: 68px;
  min-height: 40px;
  height: 100%;
  background: var(--w-swipe-item-background, var(--w-control-fill-color-tertiary));
  color: var(--w-swipe-item-foreground, var(--w-text-fill-color-primary));
  cursor: default;
  user-select: none;
  outline: none;
  transition: background-color var(--w-duration-fast) linear, color var(--w-duration-fast) linear;
}
:host(:active) { background: var(--w-control-alt-fill-color-quarternary); }
${focusRing(':host(:focus-visible)', 0)}
.root {
  display: grid;
  justify-items: center;
  align-items: center;
  margin: 4px 4px 2px;
}
.icon { display: inline-flex; max-height: 16px; min-width: 16px; margin-bottom: 2px; }
.icon:empty { display: none; }
.text { font: 400 12px/16px var(--w-font-family-small); text-align: center; }
.text:empty { display: none; }
:host([data-execute]) {
  background: var(--w-control-fill-color-tertiary);
  color: var(--w-control-strong-fill-color-default);
}
:host([data-execute][data-armed]) {
  background: var(--w-accent-fill-color-default);
  color: var(--w-text-on-accent-fill-color-primary);
}
`;

export class WinSwipeItem extends WinElement {
  static override styles = [swipeItemCss];
  static override template = `<div class="root" part="root"><span class="icon" part="icon"></span><span class="text" part="text"></span><slot></slot></div>`;
  static override props: PropDefs = {
    text: { type: String },
    icon: { type: String },
    background: { type: String },
    foreground: { type: String },
    behaviorOnInvoked: { type: String, attribute: 'behavior-on-invoked', default: 'auto' },
  };
  declare text: string;
  declare icon: string;
  declare background: string;
  declare foreground: string;
  declare behaviorOnInvoked: SwipeBehaviorOnInvoked;

  static {
    this.define('win-swipe-item');
  }

  protected override firstConnected(): void {
    this.setAttribute('role', 'button');
    this.tabIndex = -1;
    this.addEventListener('click', (ev) => {
      ev.stopPropagation();
      this.invoke();
    });
    this.addEventListener('keydown', (ev) => {
      if (ev.key === 'Enter' || ev.key === ' ') {
        ev.preventDefault();
        this.invoke();
      }
    });
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('text')) {
      this.$('.text').textContent = this.text ?? '';
      if (this.text) this.setAttribute('aria-label', this.text);
    }
    if (changed.has('icon')) this.$('.icon').innerHTML = this.icon ? iconHtml(this.icon, 16) : '';
    if (changed.has('background')) {
      if (this.background) this.style.setProperty('--w-swipe-item-background', this.background);
      else this.style.removeProperty('--w-swipe-item-background');
    }
    if (changed.has('foreground')) {
      if (this.foreground) this.style.setProperty('--w-swipe-item-foreground', this.foreground);
      else this.style.removeProperty('--w-swipe-item-foreground');
    }
  }

  invoke(): void {
    const control = this.closest('win-swipe-actions') as WinSwipeActions | null;
    this.emit('invoked', { swipeControl: control });
    control?.afterInvoke(this);
  }
}

const swipeCss = css`
:host {
  display: block;
  position: relative;
  box-sizing: border-box;
  min-height: 40px;
  min-width: 88px;
  overflow: hidden;
  touch-action: pan-y;
  user-select: none;
  -webkit-user-select: none;
}
.items {
  position: absolute;
  inset: 0;
  display: flex;
  align-items: stretch;
  pointer-events: none;
  visibility: hidden;
}
.items.left { justify-content: flex-start; }
.items.right { justify-content: flex-end; }
.items[data-active] { pointer-events: auto; }
.items ::slotted(*) { height: 100%; }
:host([data-execute-left]) .items.left ::slotted(*),
:host([data-execute-right]) .items.right ::slotted(*) { flex: 1 1 auto; }
:host([data-execute-left]) .items.left ::slotted(*) { justify-content: flex-start; padding-inline-start: 12px; }
:host([data-execute-right]) .items.right ::slotted(*) { justify-content: flex-end; padding-inline-end: 12px; }
.content {
  position: relative;
  z-index: 1;
  min-height: inherit;
  background: var(--w-swipe-content-background, var(--w-solid-background-fill-color-tertiary));
  will-change: transform;
}
`;

export class WinSwipeActions extends WinElement {
  static override styles = [swipeCss];
  static override template = `<div class="items left" part="left-items"><slot name="left"></slot></div><div class="items right" part="right-items"><slot name="right"></slot></div><div class="content" part="content"><slot></slot></div>`;
  static override props: PropDefs = {
    leftItemsMode: { type: String, attribute: 'left-items-mode', default: 'reveal' },
    rightItemsMode: { type: String, attribute: 'right-items-mode', default: 'reveal' },
  };
  declare leftItemsMode: SwipeMode;
  declare rightItemsMode: SwipeMode;

  static {
    this.define('win-swipe-actions');
  }

  private content!: HTMLElement;
  private offset = 0;
  private openSide: 'left' | 'right' | null = null;
  private drag: { id: number; x: number; y: number; base: number; active: boolean; t: number } | null = null;
  private anim: Animation | null = null;

  private itemsOf(side: 'left' | 'right'): WinSwipeItem[] {
    return Array.from(this.querySelectorAll<WinSwipeItem>(`:scope > win-swipe-item[slot="${side}"]`));
  }

  private itemsWidth(side: 'left' | 'right'): number {
    return this.itemsOf(side).reduce((w, el) => w + el.getBoundingClientRect().width, 0);
  }

  private modeOf(side: 'left' | 'right'): SwipeMode {
    return side === 'left' ? this.leftItemsMode : this.rightItemsMode;
  }

  private threshold(): number {
    return Math.min(this.clientWidth * 0.4, 200);
  }

  protected override firstConnected(): void {
    this.content = this.$('.content');
    this.addEventListener('pointerdown', (ev) => this.onDown(ev));
    this.addEventListener('pointermove', (ev) => this.onMove(ev));
    this.addEventListener('pointerup', (ev) => this.onUp(ev));
    this.addEventListener('pointercancel', (ev) => this.onUp(ev));
    this.addEventListener('lostpointercapture', (ev) => this.onUp(ev));
    this.content.addEventListener(
      'click',
      (ev) => {
        if (this.openSide) {
          ev.stopPropagation();
          ev.preventDefault();
          this.close();
        }
      },
      true,
    );
  }

  private onDocumentPointerDown = (ev: PointerEvent): void => {
    if (this.openSide && !ev.composedPath().includes(this)) this.close();
  };

  protected override connected(): void {
    document.addEventListener('pointerdown', this.onDocumentPointerDown, true);
  }

  protected override disconnected(): void {
    document.removeEventListener('pointerdown', this.onDocumentPointerDown, true);
    this.drag = null;
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('leftItemsMode')) this.toggleAttribute('data-execute-left', this.leftItemsMode === 'execute');
    if (changed.has('rightItemsMode')) this.toggleAttribute('data-execute-right', this.rightItemsMode === 'execute');
  }

  private visualX(): number {
    const t = getComputedStyle(this.content).transform;
    return !t || t === 'none' ? 0 : new DOMMatrixReadOnly(t).m41;
  }

  private setOffset(x: number, animated: boolean): void {
    const from = this.visualX();
    this.offset = x;
    cancelAnimations(this.content);
    this.content.style.transform = x ? `translateX(${x}px)` : '';
    const anim =
      animated && Math.abs(from - x) > 0.5
        ? animate(this.content, [{ transform: `translateX(${from}px)` }, { transform: `translateX(${x}px)` }], {
            duration: durations.normal,
            easing: easings.decelerate,
          })
        : null;
    this.anim = anim;
    const left = this.$('.items.left');
    const right = this.$('.items.right');
    left.toggleAttribute('data-active', x > 0);
    right.toggleAttribute('data-active', x < 0);
    left.style.visibility = x > 0 || (anim && from > 0) ? 'visible' : 'hidden';
    right.style.visibility = x < 0 || (anim && from < 0) ? 'visible' : 'hidden';
    const resetArmed = () => {
      for (const s of ['left', 'right'] as const) for (const it of this.itemsOf(s)) it.removeAttribute('data-armed');
    };
    if (anim) {
      void settled(anim).then(() => {
        if (this.anim !== anim) return;
        if (this.offset <= 0) left.style.visibility = 'hidden';
        if (this.offset >= 0) right.style.visibility = 'hidden';
        if (this.offset === 0) resetArmed();
      });
    } else if (x === 0) resetArmed();
  }

  open(side: 'left' | 'right'): void {
    const w = this.itemsWidth(side);
    if (!w) return;
    this.openSide = side;
    this.setOffset(side === 'left' ? w : -w, true);
    for (const s of ['left', 'right'] as const) for (const it of this.itemsOf(s)) it.tabIndex = s === side ? 0 : -1;
    this.emit('opened', { side });
  }

  close(): void {
    const was = this.openSide;
    this.openSide = null;
    this.setOffset(0, true);
    for (const s of ['left', 'right'] as const) for (const it of this.itemsOf(s)) it.tabIndex = -1;
    if (was) this.emit('closed', { side: was });
  }

  afterInvoke(item: WinSwipeItem): void {
    const side = item.slot === 'left' ? 'left' : 'right';
    const behavior = item.behaviorOnInvoked;
    if (behavior === 'close' || (behavior !== 'remain-open' && this.modeOf(side) === 'reveal')) this.close();
  }

  private onDown(ev: PointerEvent): void {
    if (ev.button !== 0) return;
    if ((ev.target as Element).closest?.('win-swipe-item')) return;
    const cur = this.visualX();
    this.drag = { id: ev.pointerId, x: ev.clientX, y: ev.clientY, base: cur, active: false, t: performance.now() };
  }

  private onMove(ev: PointerEvent): void {
    const d = this.drag;
    if (!d || d.id !== ev.pointerId) return;
    if (!(ev.buttons & 1)) {
      this.onUp(ev);
      return;
    }
    const dx = ev.clientX - d.x;
    const dy = ev.clientY - d.y;
    if (!d.active) {
      if (Math.abs(dx) < 6) return;
      if (Math.abs(dy) > Math.abs(dx)) {
        this.drag = null;
        return;
      }
      d.active = true;
      this.setPointerCapture(ev.pointerId);
    }
    let x = d.base + dx;
    const side: 'left' | 'right' | null = x > 0 ? 'left' : x < 0 ? 'right' : null;
    if (side && !this.itemsOf(side).length) x = 0;
    if (side) {
      const mode = this.modeOf(side);
      const w = mode === 'execute' ? this.threshold() : this.itemsWidth(side);
      const mag = Math.abs(x);
      const eff = mag > w ? w + (mag - w) * (mode === 'execute' ? 0.6 : 0.3) : mag;
      x = Math.sign(x) * eff;
      if (mode === 'execute') {
        const armed = Math.abs(x) >= this.threshold();
        for (const it of this.itemsOf(side)) {
          it.setAttribute('data-execute', '');
          it.toggleAttribute('data-armed', armed);
        }
      }
    }
    this.setOffset(x, false);
  }

  private onUp(ev: PointerEvent): void {
    const d = this.drag;
    if (!d || d.id !== ev.pointerId) return;
    this.drag = null;
    if (!d.active) return;
    const x = this.offset;
    const side: 'left' | 'right' | null = x > 0 ? 'left' : x < 0 ? 'right' : null;
    if (!side) {
      this.close();
      return;
    }
    const mode = this.modeOf(side);
    if (mode === 'execute') {
      const item = this.itemsOf(side)[0];
      if (item && Math.abs(x) >= this.threshold()) {
        this.openSide = side;
        item.invoke();
        return;
      }
      this.close();
      return;
    }
    const w = this.itemsWidth(side);
    const v = (x - d.base) / Math.max(1, performance.now() - d.t);
    const flickOpen = side === 'left' ? v > 0.5 : v < -0.5;
    if (Math.abs(x) > w / 2 || flickOpen) this.open(side);
    else this.close();
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-swipe-actions': WinSwipeActions;
    'win-swipe-item': WinSwipeItem;
  }
}
