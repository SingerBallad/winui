import { WinElement, uid, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';

const base = (alpha: number) => `rgb(from var(--w-text-fill-color-primary) r g b / ${alpha})`;

export const fieldCss = css`
:host {
  display: flex;
  flex-direction: column;
  box-sizing: border-box;
  min-width: 64px;
  vertical-align: middle;
  color: var(--w-text-fill-color-primary);
  font: var(--w-type-body);
  -webkit-tap-highlight-color: transparent;
}
:host([hidden]) { display: none !important; }

.header {
  display: block;
  margin: 0 0 8px 0;
  color: var(--w-text-fill-color-primary);
  color: ${base(1)};
  font: var(--w-type-body);
  overflow-wrap: anywhere;
  user-select: none;
  -webkit-user-select: none;
  cursor: default;
}
:host([disabled]) .header { color: var(--w-text-fill-color-disabled); color: ${base(0.4)}; }
.header[hidden], .description[hidden] { display: none; }

.field {
  position: relative;
  display: flex;
  align-items: stretch;
  flex: 1 1 auto;
  box-sizing: border-box;
  min-height: 32px;
  border: 1px solid;
  border-color: var(--w-text-control-elevation-border);
  border-radius: var(--w-corner-radius-control);
  background-color: var(--w-control-fill-color-default);
  background-clip: padding-box;
  cursor: text;
}
.field:hover { background-color: var(--w-control-fill-color-secondary); }
:host(:focus-within) .field,
:host([data-focused]) .field {
  background-color: var(--w-control-fill-color-input-active);
}
.field::after {
  content: '';
  position: absolute;
  inset: -1px;
  border-radius: inherit;
  background: linear-gradient(var(--w-text-control-elevation-border-focused-edge), var(--w-text-control-elevation-border-focused-edge)) bottom / 100% 2px no-repeat;
  clip-path: inset(0 50% 0 50%);
  opacity: 0;
  pointer-events: none;
  transition:
    clip-path var(--w-duration-fast) var(--w-ease-decelerate),
    opacity var(--w-duration-fast) linear;
}
:host(:focus-within) .field::after,
:host([data-focused]) .field::after {
  clip-path: inset(0 0 0 0);
  opacity: 1;
  transition:
    clip-path var(--w-duration-normal) var(--w-ease-decelerate),
    opacity var(--w-duration-faster) linear;
}
:host([disabled]) .field {
  background-color: var(--w-control-fill-color-disabled);
  border-color: var(--w-control-stroke-color-default);
  cursor: default;
}
:host([disabled]) .field::after { opacity: 0; clip-path: inset(0 50% 0 50%); transition: none; }

.input {
  flex: 1 1 auto;
  min-width: 0;
  width: 100%;
  box-sizing: border-box;
  margin: 0;
  border: 0;
  outline: 0;
  padding: 5px 6px 6px 10px;
  font: inherit;
  line-height: normal;
  color: inherit;
  letter-spacing: inherit;
  text-align: inherit;
  text-transform: inherit;
  background: transparent;
  caret-color: currentColor;
  border-radius: inherit;
}
.input::placeholder { color: var(--w-text-fill-color-secondary); opacity: 1; }
.input::selection, .editor ::selection, .editor::selection {
  background: var(--sel-bg, var(--w-accent-fill-color-selected-text-background));
  color: var(--w-text-on-accent-fill-color-selected-text);
}
:host([disabled]) .input, :host([disabled]) .editor { color: var(--w-text-fill-color-disabled); }
:host([disabled]) .input::placeholder { color: var(--w-text-fill-color-disabled); }
.input::-webkit-search-cancel-button, .input::-webkit-search-decoration { -webkit-appearance: none; display: none; }
.input::-ms-reveal, .input::-ms-clear { display: none; }

.btn {
  display: none;
  flex: none;
  align-items: center;
  justify-content: center;
  align-self: stretch;
  width: 26px;
  min-height: 24px;
  margin: 3px 3px 3px 0;
  padding: 0;
  border: 0;
  border-radius: var(--w-corner-radius-control);
  background: transparent;
  color: var(--w-text-fill-color-secondary);
  font: inherit;
  cursor: default;
  outline: none;
  -webkit-tap-highlight-color: transparent;
}
.btn > svg { translate: 1px 0; }
.btn.show { display: inline-flex; }
.btn:hover { background: var(--w-subtle-fill-color-secondary); }
.btn:active, .btn[data-pressed] {
  background: var(--w-subtle-fill-color-tertiary);
  color: var(--w-text-fill-color-tertiary);
}
:host([disabled]) .btn { display: none; }

.description {
  display: block;
  user-select: none;
  -webkit-user-select: none;
  cursor: default;
  color: var(--w-text-fill-color-secondary);
  color: ${base(0.6)};
  font: var(--w-type-body);
  overflow-wrap: anywhere;
}
`;

export function fieldTemplate(fieldInner: string, after = ''): string {
  return `<label class="header" part="header" hidden><span class="header-text"></span><slot name="header"></slot></label><div class="field" part="field">${fieldInner}</div><div class="description" part="description" hidden><span class="description-text"></span><slot name="description"></slot></div>${after}`;
}

export function revealGlyph(size = 12): string {
  return `<svg class="w-glyph" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M0.55 8.65A7.84 7.84 0 0 1 15.45 8.65" stroke-width="1.3"/><path d="M8 12.75a3.35 3.35 0 1 0 0-6.7a3.35 3.35 0 1 0 0 6.7Z" stroke-width="1.3"/></svg>`;
}

export function upDownGlyph(size = 12): string {
  return `<svg class="w-glyph" width="${size}" height="${size}" viewBox="0 0 16 16" aria-hidden="true" focusable="false"><path d="M2.4 6L8 0.6L13.6 6M2.4 10L8 15.4L13.6 10"/></svg>`;
}

const IMPLICIT_SUBMISSION_INPUTS = new Set([
  'text',
  'search',
  'url',
  'tel',
  'email',
  'password',
  'date',
  'month',
  'week',
  'time',
  'datetime-local',
  'number',
]);

function isSubmitButton(el: Element): el is HTMLElement {
  if (el instanceof HTMLButtonElement) return el.type === 'submit';
  if (el instanceof HTMLInputElement) return el.type === 'submit' || el.type === 'image';
  return el.localName === 'win-button' && (el as HTMLElement & { type?: string }).type === 'submit';
}

export abstract class FieldElement extends WinElement {
  static override shadowInit: ShadowRootInit = { mode: 'open', delegatesFocus: true };
  static override formAssociated = true;
  static override props: PropDefs = {
    header: { type: String },
    description: { type: String },
    placeholder: { type: String },
    disabled: { type: Boolean },
    readOnly: { type: Boolean, attribute: 'read-only' },
    name: { type: String, reflect: true },
    required: { type: Boolean },
    selectionHighlightColor: { type: String, attribute: 'selection-highlight-color' },
  };
  declare header: string;
  declare description: string;
  declare placeholder: string;
  declare disabled: boolean;
  declare readOnly: boolean;
  declare name: string;
  declare required: boolean;
  declare selectionHighlightColor: string;

  protected abstract get editor(): HTMLElement;

  protected readonly ids = { header: uid('hdr'), description: uid('dsc') };
  private a11yObserver: MutationObserver | null = null;

  protected override firstConnected(): void {
    this.$('.header').id = this.ids.header;
    this.$('.description').id = this.ids.description;
    this.$<HTMLSlotElement>('slot[name="header"]').addEventListener('slotchange', () => this.syncHeader());
    this.$<HTMLSlotElement>('slot[name="description"]').addEventListener('slotchange', () => this.syncDescription());
    this.a11yObserver = new MutationObserver(() => this.syncA11y());
    this.a11yObserver.observe(this, { attributes: true, attributeFilter: ['aria-label', 'title'] });
    this.$('.field').addEventListener('pointerdown', (ev) => {
      if (ev.target === ev.currentTarget && !this.disabled) {
        ev.preventDefault();
        this.editor.focus();
      }
    });
  }

  protected override updated(changed: Set<string>, _first = false): void {
    if (changed.has('header')) this.syncHeader();
    if (changed.has('description')) this.syncDescription();
    if (changed.has('disabled')) {
      this.aria('aria-disabled', this.disabled ? 'true' : null);
      this.syncDisabled();
    }
    if (changed.has('selectionHighlightColor')) {
      if (this.selectionHighlightColor) this.style.setProperty('--sel-bg', this.selectionHighlightColor);
      else this.style.removeProperty('--sel-bg');
    }
  }

  protected syncDisabled(): void {
    const e = this.editor as HTMLInputElement;
    if ('disabled' in e) e.disabled = this.disabled;
  }

  protected syncHeader(): void {
    const h = this.$('.header');
    if (!h) return;
    this.$('.header-text').textContent = this.header ?? '';
    const slotted = this.$<HTMLSlotElement>('slot[name="header"]').assignedNodes().length > 0;
    h.hidden = !this.header && !slotted;
    this.syncA11y();
  }

  protected syncDescription(): void {
    const d = this.$('.description');
    if (!d) return;
    this.$('.description-text').textContent = this.description ?? '';
    const slotted = this.$<HTMLSlotElement>('slot[name="description"]').assignedNodes().length > 0;
    d.hidden = !this.description && !slotted;
    this.syncA11y();
  }

  protected syncA11y(): void {
    const e = this.editor;
    if (!e) return;
    const headerVisible = !this.$('.header').hidden;
    const label = this.getAttribute('aria-label') ?? this.getAttribute('title');
    if (label) {
      e.setAttribute('aria-label', label);
      e.removeAttribute('aria-labelledby');
    } else if (headerVisible) {
      e.setAttribute('aria-labelledby', this.ids.header);
      e.removeAttribute('aria-label');
    } else {
      e.removeAttribute('aria-labelledby');
      if (this.placeholder) e.setAttribute('aria-label', this.placeholder);
      else e.removeAttribute('aria-label');
    }
    if (!this.$('.description').hidden) e.setAttribute('aria-describedby', this.ids.description);
    else e.removeAttribute('aria-describedby');
  }

  override focus(options?: FocusOptions): void {
    if (this.editor) this.editor.focus(options);
    else super.focus(options);
  }

  override blur(): void {
    this.editor?.blur();
  }

  get form(): HTMLFormElement | null {
    return this.internals.form;
  }
  get validity(): ValidityState {
    return this.internals.validity;
  }
  get validationMessage(): string {
    return this.internals.validationMessage;
  }
  get willValidate(): boolean {
    return this.internals.willValidate;
  }
  checkValidity(): boolean {
    return this.internals.checkValidity();
  }
  reportValidity(): boolean {
    return this.internals.reportValidity();
  }

  formDisabledCallback(disabled: boolean): void {
    this.toggleAttribute('data-form-disabled', disabled);
    if (disabled !== this.disabled) this.disabled = disabled;
  }

  protected get blocksImplicitSubmission(): boolean {
    return true;
  }

  protected submitImplicitly(ev: KeyboardEvent): void {
    if (ev.key !== 'Enter' || ev.isComposing || ev.keyCode === 229) return;
    const form = this.internals.form;
    if (!form) return;
    const preventedBefore = ev.defaultPrevented;
    setTimeout(() => {
      if (ev.defaultPrevented && !preventedBefore) return;
      const elements = Array.from(form.elements);
      const button = elements.find(isSubmitButton);
      if (button) {
        if (!(button as HTMLElement & { disabled?: boolean }).disabled && !button.matches(':disabled')) button.click();
        return;
      }
      const blocking = elements.filter((el) =>
        el instanceof FieldElement
          ? el.blocksImplicitSubmission
          : el instanceof HTMLInputElement && IMPLICIT_SUBMISSION_INPUTS.has(el.type),
      );
      if (blocking.length <= 1) form.requestSubmit();
    });
  }
}

export function keepFocus(btn: HTMLElement): void {
  btn.addEventListener('pointerdown', (ev) => ev.preventDefault());
  btn.addEventListener('mousedown', (ev) => ev.preventDefault());
}
