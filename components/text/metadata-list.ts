import { WinElement, escapeHtml, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';

export interface MetadataItem {
  label: string;
  accessibleLabel?: string;
  href?: string;
  onClick?: () => void;
}

export class WinMetadataItem extends WinElement {
  static override styles = [css`:host { display: none; }`];
  static override props: PropDefs = {
    label: { type: String },
    href: { type: String },
    accessibleLabel: { type: String, attribute: 'accessible-label' },
  };
  declare label: string;
  declare href: string;
  declare accessibleLabel: string;
  static {
    this.define('win-metadata-item');
  }
  protected override updated(): void {
    this.parentElement?.dispatchEvent(new CustomEvent('w-meta-sync'));
  }
}

const metaCss = css`
:host { display: block; color: var(--w-text-fill-color-secondary); font: var(--w-type-body); }
:host([text-style="caption"]) { font: var(--w-type-caption); }
.line { overflow-wrap: anywhere; }
.sep { white-space: pre; }
a {
  color: var(--w-accent-text-fill-color-primary);
  text-decoration: none;
  cursor: pointer;
  border-radius: 2px;
}
a:hover { color: var(--w-accent-text-fill-color-secondary); text-decoration: underline; }
a:active { color: var(--w-accent-text-fill-color-tertiary); }
${focusRing('a:focus-visible', 2)}
.sr { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0 0 0 0); white-space: nowrap; }
`;

export class WinMetadataList extends WinElement {
  static override styles = [metaCss];
  static override template = `<div class="line" part="text"></div><slot hidden></slot>`;
  static override props: PropDefs = {
    separator: { type: String, default: ' • ' },
    accessibleSeparator: { type: String, attribute: 'accessible-separator', default: ', ' },
    text: { type: String },
    textStyle: { type: String, attribute: 'text-style', reflect: true },
  };
  declare separator: string;
  declare accessibleSeparator: string;
  declare text: string;
  declare textStyle: string;
  private _items: MetadataItem[] | null = null;
  static {
    this.define('win-metadata-list');
  }
  get items(): MetadataItem[] {
    if (this._items) return this._items;
    const children = Array.from(this.children).filter((c): c is WinMetadataItem => c.localName === 'win-metadata-item');
    for (const c of children) customElements.upgrade(c);
    if (children.length) {
      return children.map(
        (c) =>
          ({
            label: c.label || (c.textContent ?? '').trim(),
            href: c.href || undefined,
            accessibleLabel: c.accessibleLabel || undefined,
          }) as MetadataItem,
      );
    }
    return (this.text ?? '')
      .split(';')
      .map((s) => s.trim())
      .filter(Boolean)
      .map((label) => ({ label }));
  }
  set items(v: MetadataItem[] | null) {
    this._items = v;
    this.render();
  }
  protected override firstConnected(): void {
    this.$('slot').addEventListener('slotchange', () => this.render());
    this.addEventListener('w-meta-sync', () => this.render());
    this.$('.line').addEventListener('click', (ev) => {
      const a = (ev.target as Element).closest<HTMLAnchorElement>('a[data-i]');
      if (!a) return;
      const item = this.items[Number(a.dataset.i)];
      if (!item) return;
      if (item.onClick) {
        ev.preventDefault();
        item.onClick();
      }
      this.emit('itemclick', { item, index: Number(a.dataset.i) });
    });
  }
  protected override updated(): void {
    this.render();
  }
  private render(): void {
    if (!this.isInitialized) return;
    const items = this.items;
    const sep = `<span class="sep" aria-hidden="true">${escapeHtml(this.separator)}</span><span class="sr">${escapeHtml(this.accessibleSeparator)}</span>`;
    this.$('.line').innerHTML = items
      .map((it, i) => {
        const label = escapeHtml(it.label);
        const aria = it.accessibleLabel ? ` aria-label="${escapeHtml(it.accessibleLabel)}"` : '';
        if (it.href || it.onClick) {
          const href = it.href && /^(https?:|mailto:|#|\/|\.)/i.test(it.href) ? it.href : '#';
          return `<a data-i="${i}" href="${escapeHtml(href)}"${it.href ? ' target="_blank" rel="noopener"' : ''}${aria}>${label}</a>`;
        }
        return `<span${aria}>${label}</span>`;
      })
      .join(sep);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-metadata-list': WinMetadataList;
    'win-metadata-item': WinMetadataItem;
  }
}
