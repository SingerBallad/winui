import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { iconHtml } from '../../base/icons.ts';
import { pulse } from '../../motion/animate.ts';

export type InfoBadgeSeverity = '' | 'attention' | 'informational' | 'success' | 'caution' | 'critical';

const SEVERITY_ICONS: Record<string, { svg: string; font: boolean }> = {
  attention: { svg: '<path d="M8 3.2V9.2"/><circle class="f" cx="8" cy="12.4" r="1.15"/>', font: true },
  informational: { svg: '<path d="M8 6.6V12.6"/><circle class="f" cx="8" cy="3.6" r="1.15"/>', font: true },
  success: { svg: '<path d="M2.6 8.6L6.1 12.1L13.4 4.8"/>', font: false },
  caution: { svg: '<path d="M8 2.6V9.4"/><circle class="f" cx="8" cy="12.6" r="1.15"/>', font: false },
  critical: { svg: '<path d="M3.6 3.6L12.4 12.4M12.4 3.6L3.6 12.4"/>', font: false },
};

const badgeCss = css`
:host {
  --_bg: var(--w-accent-fill-color-default);
  display: inline-flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  vertical-align: middle;
  min-width: 4px;
  min-height: 4px;
  max-height: 16px;
  border-radius: 999px;
  background: var(--w-info-badge-background, var(--_bg));
  color: var(--w-info-badge-foreground, var(--w-text-on-accent-fill-color-primary));
  font: var(--w-type-caption);
  font-size: 11px;
  line-height: 14px;
  user-select: none;
  flex: none;
}
:host([severity="attention"]) { --_bg: var(--w-system-fill-color-attention); }
:host([severity="informational"]) { --_bg: var(--w-system-fill-color-solid-neutral); }
:host([severity="success"]) { --_bg: var(--w-system-fill-color-success); }
:host([severity="caution"]) { --_bg: var(--w-system-fill-color-caution); }
:host([severity="critical"]) { --_bg: var(--w-system-fill-color-critical); }

:host([data-w-kind="dot"]) { width: var(--w-info-badge-size, 4px); height: var(--w-info-badge-size, 4px); }
:host([data-w-kind="value"]) { height: 16px; min-width: 16px; }
.value { margin: 0 4px 2px; white-space: nowrap; font-variant-numeric: tabular-nums; }
:host([data-w-kind="icon"]) { width: 16px; height: 16px; }
.icon { display: inline-flex; align-items: center; justify-content: center; width: 8px; height: 8px; }
.icon svg { width: 100%; height: 100%; overflow: visible; fill: none; stroke: currentColor; stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.icon svg .f { fill: currentColor; stroke: none; }
.icon .w-icon { font-size: 8px !important; width: 8px !important; height: 8px !important; }
.icon ::slotted(*) { width: 8px; height: 8px; font-size: 8px; }
[hidden] { display: none !important; }
`;

export class WinInfoBadge extends WinElement {
  static override styles = [badgeCss];
  static override template = `<span class="value" part="value" hidden></span><span class="icon" part="icon" hidden><span class="spec"></span><slot name="icon"></slot></span>`;
  static override props: PropDefs = {
    value: { type: Number, default: -1, reflect: true },
    icon: { type: String },
    severity: { type: String, reflect: true, default: '' },
    kind: { type: String, default: '' },
  };
  declare value: number;
  declare icon: string;
  declare severity: InfoBadgeSeverity;
  declare kind: string;

  static {
    this.define('win-info-badge');
  }

  protected override firstConnected(): void {
    if (!this.hasAttribute('role')) this.setAttribute('role', 'status');
    this.$('slot[name="icon"]').addEventListener('slotchange', () => this.requestUpdate('icon'));
  }

  protected override updated(changed: Set<string>, first = false): void {
    const slotted = this.$<HTMLSlotElement>('slot[name="icon"]').assignedElements().length > 0;
    const kind =
      this.kind === 'dot' || this.kind === 'icon' || this.kind === 'value'
        ? this.kind
        : this.value >= 0
          ? 'value'
          : this.icon || slotted
            ? 'icon'
            : 'dot';
    this.setAttribute('data-w-kind', kind);
    const valueEl = this.$('.value');
    const iconEl = this.$('.icon');
    valueEl.hidden = kind !== 'value';
    iconEl.hidden = kind !== 'icon';
    if (kind === 'value') {
      const text = this.value >= 0 ? String(Math.trunc(this.value)) : '';
      if (valueEl.textContent !== text) {
        valueEl.textContent = text;
        if (!first && changed.has('value')) pulse(this, 1.18);
      }
      this.setAttribute('aria-label', text);
    } else {
      this.removeAttribute('aria-label');
    }
    if (kind === 'icon' && (changed.has('icon') || changed.has('severity') || changed.has('kind') || first)) {
      const spec = this.$('.spec');
      if (this.icon) spec.innerHTML = iconHtml(this.icon, 8);
      else if (!slotted) {
        const def = SEVERITY_ICONS[this.severity || 'attention'] ?? SEVERITY_ICONS.attention!;
        spec.innerHTML = `<svg viewBox="0 0 16 16" aria-hidden="true">${def.svg}</svg>`;
      } else spec.innerHTML = '';
    }
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-info-badge': WinInfoBadge;
  }
}
