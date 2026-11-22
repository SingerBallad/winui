import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';

const hccCss = css`
:host { display: flex; flex-direction: column; gap: 8px; }
:host([orientation="horizontal"]) { flex-direction: row; align-items: center; gap: 12px; }
.header { font: var(--w-type-body-strong); color: var(--w-text-fill-color-primary); }
:host([header-style="caption"]) .header { font: var(--w-type-caption); color: var(--w-text-fill-color-secondary); }
:host([header-style="subtitle"]) .header { font: var(--w-type-subtitle); }
:host(:not([data-has-header])) .header { display: none; }
.content { min-width: 0; }
`;

export class WinHeaderedContent extends WinElement {
  static override styles = [hccCss];
  static override template = `<div class="header" part="header"><span class="htext"></span><slot name="header"></slot></div><div class="content" part="content"><slot></slot></div>`;
  static override props: PropDefs = {
    header: { type: String },
    orientation: { type: String, reflect: true, default: 'vertical' },
    headerStyle: { type: String, attribute: 'header-style', reflect: true },
  };
  declare header: string;
  declare orientation: 'vertical' | 'horizontal';
  declare headerStyle: string;
  static {
    this.define('win-headered-content');
  }
  protected override firstConnected(): void {
    this.$('slot[name="header"]').addEventListener('slotchange', () => this.sync());
    this.setAttribute('role', 'group');
  }
  protected override updated(): void {
    this.$('.htext').textContent = this.header ?? '';
    this.sync();
  }
  private sync(): void {
    const slotted = this.$<HTMLSlotElement>('slot[name="header"]').assignedNodes().length > 0;
    this.toggleAttr('data-has-header', !!this.header || slotted);
    if (this.header) this.aria('aria-label', this.header);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-headered-content': WinHeaderedContent;
  }
}
