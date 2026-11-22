import { type CSSResult, hostBase } from './css.ts';
import { installTheme } from '../theme/theme.ts';
import {
  ensureMaterialDefs,
  isMaterialKind,
  isSystemBackdropKind,
  requestSystemBackdrop,
  usesBackdropFilter,
} from '../theme/materials.ts';

export type PropType =
  BooleanConstructor | NumberConstructor | StringConstructor | ObjectConstructor | ArrayConstructor;

export interface PropDef {
  type: PropType;
  attribute?: string | false;
  reflect?: boolean;
  default?: unknown;
}

export type PropDefs = Record<string, PropDef>;

const kebab = (s: string) => s.replace(/[A-Z]/g, (c) => `-${c.toLowerCase()}`);

interface ResolvedProp extends PropDef {
  name: string;
  attr: string | null;
  reflectEnabled: boolean;
  def: unknown;
}

const propCache = new WeakMap<object, Map<string, ResolvedProp>>();
const attrCache = new WeakMap<object, Map<string, ResolvedProp>>();
const templateCache = new WeakMap<object, HTMLTemplateElement>();

function defaultFor(p: PropDef): unknown {
  if ('default' in p) return p.default;
  switch (p.type) {
    case Boolean:
      return false;
    case Number:
      return 0;
    case String:
      return '';
    case Array:
      return undefined;
    default:
      return undefined;
  }
}

function resolveProps(ctor: object): Map<string, ResolvedProp> {
  let m = propCache.get(ctor);
  if (m) return m;
  m = new Map();
  const chain: object[] = [];
  for (let c: object | null = ctor; c && c !== HTMLElement; c = Object.getPrototypeOf(c)) {
    chain.unshift(c);
  }
  for (const c of chain) {
    if (!Object.hasOwn(c, 'props')) continue;
    const defs = (c as unknown as { props: PropDefs }).props;
    for (const [name, p] of Object.entries(defs)) {
      const attr = p.attribute === false ? null : (p.attribute ?? kebab(name));
      m.set(name, {
        ...p,
        name,
        attr,
        reflectEnabled: p.reflect ?? p.type === Boolean,
        def: defaultFor(p),
      });
    }
  }
  propCache.set(ctor, m);
  const am = new Map<string, ResolvedProp>();
  for (const p of m.values()) if (p.attr) am.set(p.attr, p);
  attrCache.set(ctor, am);
  return m;
}

function fromAttribute(p: ResolvedProp, v: string | null): unknown {
  switch (p.type) {
    case Boolean:
      if (v === null) return p.def;
      return v !== 'false';
    case Number: {
      if (v === null || v.trim() === '') return p.def;
      const n = Number(v);
      return Number.isNaN(n) ? p.def : n;
    }
    case String:
      return v ?? p.def;
    default:
      if (v === null) return p.def;
      try {
        return JSON.parse(v);
      } catch {
        return p.def;
      }
  }
}

function toAttribute(p: ResolvedProp, v: unknown): string | null {
  if (v === undefined || v === null) return null;
  switch (p.type) {
    case Boolean:
      if (v === p.def) return null;
      return v ? '' : 'false';
    case Number:
    case String:
      return String(v);
    default:
      return JSON.stringify(v);
  }
}

function coerce(p: ResolvedProp, v: unknown): unknown {
  switch (p.type) {
    case Boolean:
      return v == null ? p.def : Boolean(v);
    case Number: {
      if (v == null || v === '') return p.def;
      const n = typeof v === 'number' ? v : Number(v);
      return Number.isNaN(n) ? p.def : n;
    }
    case String:
      return v == null ? p.def : String(v);
    default:
      return v;
  }
}

let uidCounter = 0;
export function uid(prefix = 'w'): string {
  uidCounter += 1;
  return `${prefix}-${uidCounter.toString(36)}`;
}

export abstract class WinElement extends HTMLElement {
  static styles: CSSResult | CSSResult[] = [];
  static template = '';
  static props: PropDefs = {};
  static shadowInit: ShadowRootInit = { mode: 'open' };
  static formAssociated = false;
  static materialPart: string | null = null;
  static defaultMaterial: string | null = null;
  static materialAttributes: readonly string[] = ['material'];

  static get observedAttributes(): string[] {
    resolveProps(this);
    return [...(attrCache.get(this)?.keys() ?? []), ...this.materialAttributes];
  }

  static define(tag: string): void {
    const props = resolveProps(this);
    for (const p of props.values()) {
      if (Object.hasOwn(this.prototype, p.name)) continue;
      let found = false;
      for (
        let proto = Object.getPrototypeOf(this.prototype);
        proto && proto !== WinElement.prototype;
        proto = Object.getPrototypeOf(proto)
      ) {
        if (Object.hasOwn(proto, p.name)) {
          found = true;
          break;
        }
      }
      if (found) continue;
      Object.defineProperty(this.prototype, p.name, {
        configurable: true,
        enumerable: true,
        get(this: WinElement) {
          return this.__values.has(p.name) ? this.__values.get(p.name) : p.def;
        },
        set(this: WinElement, v: unknown) {
          this.__setProp(p, coerce(p, v), true);
        },
      });
    }
    if (!customElements.get(tag)) customElements.define(tag, this as unknown as CustomElementConstructor);
  }

  declare protected renderRoot: ShadowRoot;
  protected readonly internals: ElementInternals;
  private __values = new Map<string, unknown>();
  private __changed = new Set<string>();
  private __updateScheduled = false;
  private __initialized = false;
  private __reflecting: string | null = null;
  private __userTabIndex: string | null = null;
  private __updatePromise: Promise<void> = Promise.resolve();

  constructor() {
    super();
    this.internals = this.attachInternals();
  }

  protected get isInitialized(): boolean {
    return this.__initialized;
  }

  get updateComplete(): Promise<void> {
    return this.__updatePromise;
  }

  connectedCallback(): void {
    if (!this.__initialized) {
      installTheme({ appStyles: false });
      this.__upgradeOwnProps();
      this.__initShadow();
      this.__initialized = true;
      this.firstConnected();
      const all = new Set<string>(resolveProps(this.constructor).keys());
      for (const c of this.__changed) all.add(c);
      this.__changed.clear();
      this.updated(all, true);
    }
    this.connected();
  }

  disconnectedCallback(): void {
    this.disconnected();
  }

  attributeChangedCallback(name: string, _old: string | null, value: string | null): void {
    if (
      (this.constructor as typeof WinElement).materialAttributes.includes(name) &&
      !attrCache.get(this.constructor)?.has(name)
    ) {
      if (this.__initialized) this.__syncMaterial();
      return;
    }
    const p = attrCache.get(this.constructor)?.get(name);
    if (!p || this.__reflecting === name) return;
    this.__setProp(p, fromAttribute(p, value), false);
  }

  private __setProp(p: ResolvedProp, v: unknown, reflect: boolean): void {
    const old = this.__values.has(p.name) ? this.__values.get(p.name) : p.def;
    this.__values.set(p.name, v);
    if (reflect && p.reflectEnabled && p.attr) {
      const a = toAttribute(p, v);
      this.__reflecting = p.attr;
      if (a === null) this.removeAttribute(p.attr);
      else if (this.getAttribute(p.attr) !== a) this.setAttribute(p.attr, a);
      this.__reflecting = null;
    }
    if (!Object.is(old, v)) this.requestUpdate(p.name);
  }

  protected requestUpdate(name: string): void {
    this.__changed.add(name);
    if (this.__updateScheduled || !this.__initialized) return;
    this.__updateScheduled = true;
    this.__updatePromise = Promise.resolve().then(() => {
      this.__updateScheduled = false;
      if (!this.__changed.size) return;
      const changed = new Set(this.__changed);
      this.__changed.clear();
      this.updated(changed, false);
    });
  }

  protected flushUpdates(): void {
    if (!this.__initialized || !this.__changed.size) return;
    const changed = new Set(this.__changed);
    this.__changed.clear();
    this.updated(changed, false);
  }

  private __upgradeOwnProps(): void {
    for (const p of resolveProps(this.constructor).values()) {
      if (Object.hasOwn(this, p.name)) {
        const v = (this as unknown as Record<string, unknown>)[p.name];
        delete (this as unknown as Record<string, unknown>)[p.name];
        (this as unknown as Record<string, unknown>)[p.name] = v;
      }
    }
  }

  private __initShadow(): void {
    const ctor = this.constructor as typeof WinElement;
    const root = this.shadowRoot ?? this.attachShadow(ctor.shadowInit);
    this.renderRoot = root;
    const styles = Array.isArray(ctor.styles) ? ctor.styles : [ctor.styles];
    root.adoptedStyleSheets = [hostBase.sheet, ...styles.map((s) => s.sheet)];
    if (ctor.template) {
      let tpl = templateCache.get(ctor);
      if (!tpl) {
        tpl = document.createElement('template');
        tpl.innerHTML = ctor.template;
        templateCache.set(ctor, tpl);
      }
      root.append(tpl.content.cloneNode(true));
    }
    if (styles.some((s) => s.usesMaterial)) ensureMaterialDefs(root);
    this.__syncMaterial();
  }

  get material(): string | null {
    return this.getAttribute('material');
  }
  set material(v: string | null) {
    if (v) this.setAttribute('material', v);
    else this.removeAttribute('material');
  }

  private __materialLayer: HTMLElement | null = null;

  private __syncMaterial(): void {
    const root = this.renderRoot;
    if (!root) return;
    const ctor = this.constructor as typeof WinElement;
    const kind = this.getAttribute('material') ?? (ctor.materialPart ? null : ctor.defaultMaterial);
    for (const attr of ctor.materialAttributes) {
      const k = attr === 'material' ? kind : this.getAttribute(attr);
      if (isMaterialKind(k) && usesBackdropFilter(k)) ensureMaterialDefs(root);
      if (isSystemBackdropKind(k)) requestSystemBackdrop(k);
    }
    if (ctor.materialPart) return;
    if (kind) {
      if (!this.__materialLayer) {
        this.__materialLayer = document.createElement('div');
        this.__materialLayer.className = 'w-material-layer';
        this.__materialLayer.setAttribute('part', 'material');
      }
      if (this.__materialLayer.parentNode !== root) root.prepend(this.__materialLayer);
      if (this.__materialLayer.dataset.kind !== kind) this.__materialLayer.dataset.kind = kind;
      if (!this.hasAttribute('data-w-material-layer')) this.setAttribute('data-w-material-layer', '');
    } else {
      this.__materialLayer?.remove();
      this.removeAttribute('data-w-material-layer');
    }
  }

  protected firstConnected(): void {}
  protected connected(): void {}
  protected disconnected(): void {}
  protected updated(_changed: Set<string>, _first: boolean): void {}

  protected $<T extends Element = HTMLElement>(sel: string): T {
    return this.renderRoot.querySelector(sel) as T;
  }
  protected $$<T extends Element = HTMLElement>(sel: string): T[] {
    return Array.from(this.renderRoot.querySelectorAll(sel)) as T[];
  }

  emit<T = unknown>(type: string, detail?: T, opts: { cancelable?: boolean; bubbles?: boolean } = {}): boolean {
    return this.dispatchEvent(
      new CustomEvent<T>(type, {
        detail: detail as T,
        bubbles: opts.bubbles ?? true,
        composed: true,
        cancelable: opts.cancelable ?? false,
      }),
    );
  }

  protected setFocusable(focusable: boolean): void {
    if (!this.__managedTabIndex) {
      this.__managedTabIndex = true;
      if (this.hasAttribute('tabindex')) this.__userTabIndex = this.getAttribute('tabindex');
    }
    const want = focusable ? (this.__userTabIndex ?? '0') : '-1';
    if (this.getAttribute('tabindex') !== want) this.setAttribute('tabindex', want);
  }
  private __managedTabIndex = false;

  protected toggleAttr(name: string, on: boolean, value = ''): void {
    if (on) {
      if (this.getAttribute(name) !== value) this.setAttribute(name, value);
    } else this.removeAttribute(name);
  }

  protected aria(name: string, value: string | boolean | number | null): void {
    const attr = name.startsWith('aria-') || name === 'role' ? name : `aria-${name}`;
    if (value === null) this.removeAttribute(attr);
    else this.setAttribute(attr, String(value));
  }

  protected static esc(s: string): string {
    return escapeHtml(s);
  }
}

export function escapeHtml(s: string): string {
  return s
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

export function setAttr(el: Element, name: string, on: boolean): void {
  if (on) el.setAttribute(name, '');
  else el.removeAttribute(name);
}
