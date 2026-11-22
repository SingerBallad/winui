import { WinElement, type PropDefs } from '../../base/element.ts';
import { css } from '../../base/css.ts';
import { contentIn } from '../../motion/animate.ts';

export class WinSwitchCase extends WinElement {
  static override styles = [css`:host { display: block; } :host(:not([data-active])) { display: none !important; }`];
  static override template = `<slot></slot>`;
  static override props: PropDefs = {
    value: { type: String },
    isDefault: { type: Boolean, attribute: 'is-default' },
  };
  declare value: string;
  declare isDefault: boolean;
  static {
    this.define('win-switch-case');
  }
  protected override updated(): void {
    this.parentElement?.dispatchEvent(new CustomEvent('w-case-sync'));
  }
}

export class WinSwitchView extends WinElement {
  static override styles = [css`:host { display: block; }`];
  static override template = `<slot></slot>`;
  static override props: PropDefs = {
    value: { type: String },
    noTransition: { type: Boolean, attribute: 'no-transition' },
  };
  declare value: string;
  declare noTransition: boolean;
  private currentCase: WinSwitchCase | null = null;
  static {
    this.define('win-switch-view');
  }
  get cases(): WinSwitchCase[] {
    const cases = Array.from(this.children).filter((c): c is WinSwitchCase => c.localName === 'win-switch-case');
    for (const c of cases) customElements.upgrade(c);
    return cases;
  }
  get current(): WinSwitchCase | null {
    return this.currentCase;
  }
  protected override firstConnected(): void {
    this.$('slot').addEventListener('slotchange', () => this.evaluate(false));
    this.addEventListener('w-case-sync', () => this.evaluate(false));
  }
  protected override updated(_c: Set<string>, first = false): void {
    this.evaluate(!first);
  }
  private evaluate(animateSwap: boolean): void {
    const cases = this.cases;
    const v = this.value ?? '';
    const match = cases.find((c) => !c.isDefault && (c.value ?? '') === v) ?? cases.find((c) => c.isDefault) ?? null;
    for (const c of cases) c.toggleAttribute('data-active', c === match);
    if (match === this.currentCase) return;
    const prev = this.currentCase;
    this.currentCase = match;
    if (match && animateSwap && prev && !this.noTransition) contentIn(match, 'bottom', 12);
    this.emit('casechanged', { value: v, case: match });
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-switch-view': WinSwitchView;
    'win-switch-case': WinSwitchCase;
  }
}
