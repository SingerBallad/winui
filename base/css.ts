import { materialDeclarations, materialKinds, materialOverrides, materialSurface } from '../theme/materials.ts';

export { materialDeclarations, materialOverrides, materialSurface };

export class CSSResult {
  private _sheet: CSSStyleSheet | null = null;
  constructor(readonly cssText: string) {}

  get sheet(): CSSStyleSheet {
    if (!this._sheet) {
      this._sheet = new CSSStyleSheet();
      this._sheet.replaceSync(this.cssText);
    }
    return this._sheet;
  }

  get usesMaterial(): boolean {
    return this.cssText.includes('var(--w-material-');
  }

  toString(): string {
    return this.cssText;
  }
}

export type CSSValue = string | number | CSSResult;

export function css(strings: TemplateStringsArray, ...values: CSSValue[]): CSSResult {
  let out = '';
  strings.raw.forEach((s, i) => {
    out += s;
    if (i < values.length) {
      const v = values[i]!;
      out += v instanceof CSSResult ? v.cssText : String(v);
    }
  });
  return new CSSResult(out);
}

export function unsafeCSS(text: string): CSSResult {
  return new CSSResult(text);
}

export function focusRing(selector: string, margin = 3): string {
  const off = margin - 2;
  const inner =
    off >= 1
      ? `0 0 0 ${off}px var(--w-focus-stroke-color-inner)`
      : `inset 0 0 0 ${3 - margin}px var(--w-focus-stroke-color-inner)`;
  return `${selector} {
  outline: 2px solid var(--w-focus-stroke-color-outer);
  outline-offset: ${off}px;
  box-shadow: ${inner};
}`;
}

export const hostBase = css`
  :host {
    box-sizing: border-box;
    font: var(--w-type-body);
    color: var(--w-text-fill-color-primary);
    -webkit-tap-highlight-color: transparent;
    -webkit-font-smoothing: antialiased;
  }
  :host([hidden]) {
    display: none !important;
  }
  *,
  *::before,
  *::after {
    box-sizing: border-box;
  }
  [hidden] {
    display: none !important;
  }
  :where(input, textarea, [contenteditable]:not([contenteditable="false"])) {
    caret-color: auto;
  }
  [class*="icon-spec"] {
    display: contents;
  }
  .w-icon {
    font-family: var(--w-font-family-icon);
    font-style: normal;
    font-weight: normal;
    line-height: 1;
    speak: never;
    user-select: none;
    -webkit-font-smoothing: antialiased;
  }
  svg.w-glyph {
    display: block;
    flex: none;
    overflow: visible;
    fill: none;
    stroke: currentColor;
    stroke-width: 1;
    stroke-linecap: round;
    stroke-linejoin: round;
    pointer-events: none;
  }
  svg.w-glyph .f {
    fill: currentColor;
    stroke: none;
  }
  :host([data-w-material-layer]) {
    background: transparent;
  }
  :host(:where([data-w-material-layer])) {
    position: relative;
    z-index: 0;
  }
  .w-material-layer {
    position: absolute;
    inset: 0;
    z-index: -1;
    border-radius: inherit;
    pointer-events: none;
  }
  ${materialKinds.map((k) => `.w-material-layer[data-kind="${k}"] { ${materialDeclarations(k)} }`).join('\n')}
  .w-visually-hidden {
    position: absolute !important;
    width: 1px;
    height: 1px;
    margin: -1px;
    padding: 0;
    overflow: hidden;
    clip: rect(0 0 0 0);
    white-space: nowrap;
    border: 0;
  }
`;

export const scrollbars = css`
  .w-scroll {
    scrollbar-width: thin;
    scrollbar-color: var(--w-control-strong-fill-color-default) transparent;
    overscroll-behavior: contain;
  }
`;

export const typography = css`
  .caption {
    font: var(--w-type-caption);
  }
  .body {
    font: var(--w-type-body);
  }
  .body-strong {
    font: var(--w-type-body-strong);
  }
  .body-large {
    font: var(--w-type-body-large);
  }
  .subtitle {
    font: var(--w-type-subtitle);
  }
  .title {
    font: var(--w-type-title);
  }
  .title-large {
    font: var(--w-type-title-large);
  }
  .display {
    font: var(--w-type-display);
  }
`;

export const acrylicSurface = materialDeclarations('acrylic');
