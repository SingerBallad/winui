import { WinElement, uid, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { glyph } from '../../base/icons.ts';
import { composedContains, deepActiveElement } from '../../base/dom.ts';
import { animate, durations, easings, settled } from '../../motion/animate.ts';

const EXPAND = { duration: 333, easing: easings.decelerate };
const COLLAPSE = { duration: durations.fast + 33, easing: easings.decelerate };

const expanderCss = css`
:host {
  display: block;
  box-sizing: border-box;
  min-width: 96px;
  max-width: 100%;
  width: fit-content;
  color: var(--w-text-fill-color-primary);
}
:host([stretch]) { width: auto; }
.root { display: flex; flex-direction: column; }
:host([expand-direction="up"]) .root { flex-direction: column-reverse; }

.header {
  position: relative;
  display: flex;
  align-items: center;
  box-sizing: border-box;
  min-height: 48px;
  padding: 0 0 0 16px;
  border: 1px solid var(--w-card-stroke-color-default);
  border-radius: var(--w-corner-radius-control);
  background: var(--w-card-background-fill-color-default);
  background-clip: padding-box;
  color: var(--w-text-fill-color-primary);
  text-align: start;
  cursor: default;
  user-select: none;
  -webkit-user-select: none;
  outline: none;
  z-index: 1;
}
:host([expanded]) .header,
:host([data-w-collapsing]) .header {
  border-radius: var(--w-corner-radius-control) var(--w-corner-radius-control) 0 0;
}
:host([expanded][expand-direction="up"]) .header,
:host([data-w-collapsing][expand-direction="up"]) .header {
  border-radius: 0 0 var(--w-corner-radius-control) var(--w-corner-radius-control);
}
${focusRing('.header:focus-visible', 0)}
.header-content { flex: 1 1 auto; min-width: 0; padding: 8px 0; }
.chev-box {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  margin: 0 8px 0 20px;
  border-radius: var(--w-corner-radius-control);
  color: var(--w-text-fill-color-primary);
  background: transparent;
}
.header:hover .chev-box { background: var(--w-subtle-fill-color-secondary); }
.header:active .chev-box, .header[data-pressed] .chev-box { background: var(--w-subtle-fill-color-tertiary); }
.chev {
  display: inline-flex;
  transition: rotate var(--w-duration-normal) var(--w-ease-decelerate), translate var(--w-duration-fast) var(--w-ease-decelerate);
}
:host([expand-direction="up"]) .chev { rotate: 180deg; }
:host([expanded]) .chev { rotate: 180deg; }
:host([expanded][expand-direction="up"]) .chev { rotate: 0deg; }
.header:active .chev { translate: 0 1.5px; }
:host([expanded]) .header:active .chev { translate: 0 -1.5px; }

.clip {
  position: relative;
  display: flex;
  flex-direction: column;
  justify-content: flex-end;
  overflow: clip;
}
:host([expand-direction="up"]) .clip { justify-content: flex-start; }
.content {
  flex: none;
  box-sizing: border-box;
  padding: 16px;
  border: 1px solid var(--w-card-stroke-color-default);
  border-top-width: 0;
  border-radius: 0 0 var(--w-corner-radius-control) var(--w-corner-radius-control);
  background: var(--w-card-background-fill-color-secondary);
  background-clip: padding-box;
}
:host([expand-direction="up"]) .content {
  border-top-width: 1px;
  border-bottom-width: 0;
  border-radius: var(--w-corner-radius-control) var(--w-corner-radius-control) 0 0;
}
:host(:not([expanded]):not([data-w-collapsing])) .clip { display: none; }

:host([disabled]) .header { color: var(--w-text-fill-color-disabled); pointer-events: none; }
:host([disabled]) .chev-box { color: var(--w-text-fill-color-disabled); }
`;

export class WinExpander extends WinElement {
  static override styles = [expanderCss];
  static override template = `<div class="root" part="root"><div class="header" part="header" role="button" tabindex="0"><div class="header-content" part="header-content"><span class="header-text"></span><slot name="header"></slot></div><div class="chev-box" part="expand-collapse-chevron" aria-hidden="true"><span class="chev">${glyph('chevronDownSmall', 12)}</span></div></div><div class="clip" part="clip"><div class="content" part="content" role="region"><slot></slot></div></div></div>`;
  static override props: PropDefs = {
    header: { type: String },
    expanded: { type: Boolean },
    expandDirection: { type: String, attribute: 'expand-direction', reflect: true, default: 'down' },
    disabled: { type: Boolean },
  };
  declare header: string;
  declare expanded: boolean;
  declare expandDirection: 'down' | 'up';
  declare disabled: boolean;

  static {
    this.define('win-expander');
  }

  private headerEl!: HTMLElement;
  private clip!: HTMLElement;
  private contentEl!: HTMLElement;
  private anim: Animation | null = null;
  private target = false;

  protected override firstConnected(): void {
    this.headerEl = this.$('.header');
    this.clip = this.$('.clip');
    this.contentEl = this.$('.content');
    const hid = uid('exp-h');
    const cid = uid('exp-c');
    this.headerEl.id = hid;
    this.contentEl.id = cid;
    this.headerEl.setAttribute('aria-controls', cid);
    this.contentEl.setAttribute('aria-labelledby', hid);
    this.headerEl.addEventListener('click', () => {
      if (!this.disabled) this.toggle();
    });
    this.headerEl.addEventListener('keydown', (ev) => {
      if (this.disabled) return;
      if (ev.key === 'Enter' && !ev.repeat) {
        ev.preventDefault();
        this.toggle();
      } else if (ev.key === ' ') {
        ev.preventDefault();
        this.headerEl.toggleAttribute('data-pressed', true);
      }
    });
    this.headerEl.addEventListener('keyup', (ev) => {
      if (ev.key === ' ' && this.headerEl.hasAttribute('data-pressed')) {
        this.headerEl.removeAttribute('data-pressed');
        this.toggle();
      }
    });
    this.headerEl.addEventListener('blur', () => this.headerEl.removeAttribute('data-pressed'));
  }

  override focus(options?: FocusOptions): void {
    this.headerEl?.focus(options);
  }

  toggle(): void {
    this.expanded = !this.expanded;
  }

  protected override updated(changed: Set<string>, first = false): void {
    if (changed.has('header')) this.$('.header-text').textContent = this.header ?? '';
    if (changed.has('disabled')) {
      this.headerEl.tabIndex = this.disabled ? -1 : 0;
      this.headerEl.setAttribute('aria-disabled', String(this.disabled));
    }
    if (changed.has('expanded')) {
      this.headerEl.setAttribute('aria-expanded', String(this.expanded));
      if (first) this.target = this.expanded;
      else if (this.expanded !== this.target) this.play(this.expanded);
    } else if (changed.has('expandDirection') && !first && this.anim) {
      this.settle();
    }
  }

  private settle(): void {
    const a = this.anim;
    this.anim = null;
    a?.cancel();
    this.removeAttribute('data-w-collapsing');
  }

  private play(expand: boolean): void {
    this.target = expand;
    if (!expand) this.toggleAttribute('data-w-collapsing', true);
    const prev = this.anim;
    const current = prev ? this.clip.getBoundingClientRect().height : null;
    this.anim = null;
    prev?.cancel();
    if (expand) this.removeAttribute('data-w-collapsing');
    const full = this.contentEl.offsetHeight;
    const from = current ?? (expand ? 0 : full);
    const to = expand ? full : 0;
    if (expand) this.emit('expanding', undefined, { bubbles: false });
    else if (composedContains(this.contentEl, deepActiveElement())) this.headerEl.focus({ preventScroll: true });
    const timing = expand ? EXPAND : COLLAPSE;
    const a = animate(this.clip, [{ height: `${from}px` }, { height: `${to}px` }], {
      ...timing,
      fill: 'forwards',
    });
    this.anim = a;
    void settled(a).then(() => {
      if (this.anim !== a) return;
      this.settle();
      if (!expand) this.emit('collapsed', undefined, { bubbles: false });
    });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-expander': WinExpander;
  }
}
