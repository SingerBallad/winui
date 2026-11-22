import { WinElement, escapeHtml, type PropDefs } from '../../base/element.ts';
import { css, focusRing } from '../../base/css.ts';
import { miniCheckCss } from '../input/shared.ts';
import { glyph } from '../../base/icons.ts';

const SAFE_LINK = /^(https?:\/\/|mailto:|#|\/(?!\/)|\.{1,2}\/|[\w-]+(\.\w+)*\/?[\w./?=&%#-]*$)/i;
const SAFE_IMG = /^(https?:\/\/|\/(?!\/)|\.{1,2}\/|data:image\/(png|gif|jpe?g|webp|svg\+xml);)/i;

function safeUrl(url: string, image = false): string | null {
  const u = url.trim();
  if (/^\s*(javascript|vbscript|data):/i.test(u) && !(image && SAFE_IMG.test(u))) return null;
  return (image ? SAFE_IMG : SAFE_LINK).test(u) ? u : null;
}

const KEYWORDS =
  /^(abstract|as|async|await|bool|break|case|catch|class|const|continue|def|default|delete|do|double|else|enum|export|extends|false|finally|float|for|foreach|from|function|get|if|implements|import|in|int|interface|is|let|namespace|new|null|of|override|private|protected|public|readonly|return|set|static|string|struct|super|switch|this|throw|true|try|type|typeof|using|var|void|while|with|yield|fn|pub|mut|impl|use|mod|elif|lambda|pass|None|True|False|echo|then|fi|done|esac)$/;

export function highlightCode(code: string, lang = ''): string {
  const l = lang.toLowerCase();
  if (['html', 'xml', 'xaml', 'svg'].includes(l)) {
    return code
      .split(/(<!--[\s\S]*?-->|<\/?[\w:.-]+|\/?>|"[^"]*"|'[^']*')/g)
      .map((t) => {
        if (!t) return '';
        if (t.startsWith('<!--')) return `<span class="tk-c">${escapeHtml(t)}</span>`;
        if (/^<\/?[\w:.-]+$/.test(t))
          return `<span class="tk-p">${escapeHtml(t.startsWith('</') ? '</' : '<')}</span><span class="tk-t">${escapeHtml(t.replace(/^<\/?/, ''))}</span>`;
        if (t === '>' || t === '/>') return `<span class="tk-p">${escapeHtml(t)}</span>`;
        if (/^["']/.test(t)) return `<span class="tk-s">${escapeHtml(t)}</span>`;
        return escapeHtml(t).replace(/([\w:-]+)(=)/g, '<span class="tk-a">$1</span>$2');
      })
      .join('');
  }
  const comment = ['py', 'python', 'bash', 'sh', 'shell', 'ps1', 'powershell', 'yaml', 'yml'].includes(l)
    ? '#[^\\n]*'
    : '\\/\\/[^\\n]*|\\/\\*[\\s\\S]*?\\*\\/';
  const re = new RegExp(
    `(${comment}|"(?:[^"\\\\\\n]|\\\\.)*"|'(?:[^'\\\\\\n]|\\\\.)*'|\`(?:[^\`\\\\]|\\\\.)*\`|\\b\\d+(?:\\.\\d+)?\\b|\\b[A-Za-z_$][\\w$]*\\b)`,
    'g',
  );
  return code
    .split(re)
    .map((t) => {
      if (!t) return '';
      if (/^(\/\/|\/\*|#)/.test(t)) return `<span class="tk-c">${escapeHtml(t)}</span>`;
      if (/^["'`]/.test(t)) return `<span class="tk-s">${escapeHtml(t)}</span>`;
      if (/^\d/.test(t)) return `<span class="tk-n">${escapeHtml(t)}</span>`;
      if (KEYWORDS.test(t)) return `<span class="tk-k">${escapeHtml(t)}</span>`;
      if (/^[A-Z][\w$]*$/.test(t)) return `<span class="tk-t">${escapeHtml(t)}</span>`;
      return escapeHtml(t);
    })
    .join('');
}

export function renderInline(src: string): string {
  const slots: string[] = [];
  const keep = (html: string) => `\uFDD0${slots.push(html) - 1}\uFDD0`;
  let s = src;
  s = s.replace(/\\([\\`*_{}[\]()#+\-.!~|<>])/g, (_, c: string) => keep(escapeHtml(c)));
  s = s.replace(/(`+)([\s\S]*?[^`])\1(?!`)/g, (_, _t: string, code: string) =>
    keep(`<code>${escapeHtml(code.replace(/^ (.*) $/, '$1'))}</code>`),
  );
  s = s.replace(
    /!\[([^\]]*)\]\(\s*<?([^)\s>]+)>?(?:\s+"([^"]*)")?\s*\)/g,
    (_, alt: string, url: string, title?: string) => {
      const u = safeUrl(url, true);
      if (!u) return keep(escapeHtml(alt));
      return keep(
        `<img src="${escapeHtml(u)}" alt="${escapeHtml(alt)}"${title ? ` title="${escapeHtml(title)}"` : ''} loading="lazy">`,
      );
    },
  );
  s = s.replace(
    /\[([^\]]+)\]\(\s*<?([^)\s>]+)>?(?:\s+"([^"]*)")?\s*\)/g,
    (_, text: string, url: string, title?: string) => {
      const u = safeUrl(url);
      const inner = renderInline(text);
      if (!u) return keep(inner);
      return keep(`<a href="${escapeHtml(u)}"${title ? ` title="${escapeHtml(title)}"` : ''}>${inner}</a>`);
    },
  );
  s = s.replace(/<((?:https?:\/\/|mailto:)[^\s>]+)>/g, (_, u: string) =>
    keep(`<a href="${escapeHtml(u)}">${escapeHtml(u)}</a>`),
  );
  s = s.replace(
    /(^|[\s(])((?:https?:\/\/|www\.)[^\s<)]+[^\s<).,;:!?'"])/g,
    (_, pre: string, u: string) =>
      pre + keep(`<a href="${escapeHtml(u.startsWith('www.') ? `https://${u}` : u)}">${escapeHtml(u)}</a>`),
  );
  s = escapeHtml(s);
  s = s.replace(/(\*\*\*|___)(?=\S)([\s\S]*?\S)\1/g, '<strong><em>$2</em></strong>');
  s = s.replace(/(\*\*|__)(?=\S)([\s\S]*?\S)\1/g, '<strong>$2</strong>');
  s = s.replace(/(^|[^\w*])\*(?=\S)([\s\S]*?\S)\*(?!\*)/g, '$1<em>$2</em>');
  s = s.replace(/(^|[^\w])_(?=\S)([\s\S]*?\S)_(?!\w)/g, '$1<em>$2</em>');
  s = s.replace(/~~(?=\S)([\s\S]*?\S)~~/g, '<del>$1</del>');
  s = s.replace(/( {2,}|\\)\n/g, '<br>');
  const restore = (t: string): string =>
    t.replace(/\uFDD0(\d+)\uFDD0/g, (_, i: string) => restore(slots[Number(i)] ?? ''));
  return restore(s);
}

interface ListItem {
  task: boolean | null;
  lines: string[];
}

export function renderMarkdown(src: string): string {
  const lines = src.replace(/\r\n?/g, '\n').replace(/\t/g, '    ').split('\n');
  return renderBlocks(lines);
}

function renderBlocks(lines: string[]): string {
  let out = '';
  let i = 0;
  const isBlank = (l: string | undefined) => l === undefined || /^\s*$/.test(l);
  const fence = /^ {0,3}(```+|~~~+)\s*([\w+#.-]*)\s*$/;
  const hr = /^ {0,3}([-*_])(?:\s*\1){2,}\s*$/;
  const heading = /^ {0,3}(#{1,6})\s+(.*?)(?:\s+#+\s*)?$/;
  const bullet = /^( {0,3})([-*+])\s+(.*)$/;
  const ordered = /^( {0,3})(\d{1,9})([.)])\s+(.*)$/;
  const quote = /^ {0,3}>\s?(.*)$/;
  const tableSep = /^\s*\|?\s*:?-{1,}:?\s*(\|\s*:?-{1,}:?\s*)*\|?\s*$/;

  while (i < lines.length) {
    const line = lines[i]!;
    if (isBlank(line)) {
      i++;
      continue;
    }
    const f = fence.exec(line);
    if (f) {
      const marker = f[1]!;
      const lang = f[2] ?? '';
      const body: string[] = [];
      i++;
      while (i < lines.length && !lines[i]!.trim().startsWith(marker.charAt(0).repeat(marker.length)))
        body.push(lines[i++]!);
      i++;
      out += `<pre class="code" data-lang="${escapeHtml(lang)}">${lang ? `<span class="lang">${escapeHtml(lang)}</span>` : ''}<button class="copy" type="button" aria-label="复制代码" data-copy>${glyph('copy', 14)}</button><code>${highlightCode(body.join('\n'), lang)}</code></pre>`;
      continue;
    }
    if (/^ {4}\S/.test(line)) {
      const body: string[] = [];
      while (i < lines.length && (/^ {4}/.test(lines[i]!) || isBlank(lines[i]))) body.push(lines[i++]!.slice(4));
      while (body.length && !body[body.length - 1]!.trim()) body.pop();
      out += `<pre class="code"><code>${escapeHtml(body.join('\n'))}</code></pre>`;
      continue;
    }
    if (hr.test(line)) {
      out += '<hr>';
      i++;
      continue;
    }
    const h = heading.exec(line);
    if (h) {
      const level = h[1]!.length;
      const text = h[2]!;
      const id = text
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, '-')
        .replace(/^-|-$/g, '');
      out += `<h${level} id="${escapeHtml(id)}">${renderInline(text)}</h${level}>`;
      i++;
      continue;
    }
    if (quote.test(line)) {
      const inner: string[] = [];
      while (i < lines.length && !isBlank(lines[i]) && (quote.test(lines[i]!) || inner.length)) {
        const m = quote.exec(lines[i]!);
        if (!m && (heading.test(lines[i]!) || fence.test(lines[i]!))) break;
        inner.push(m ? m[1]! : lines[i]!);
        i++;
      }
      out += `<blockquote>${renderBlocks(inner)}</blockquote>`;
      continue;
    }
    const b = bullet.exec(line);
    const o = ordered.exec(line);
    if (b || o) {
      const isOrdered = !!o;
      const start = o ? Number(o[2]) : 1;
      const baseIndent = (b ?? o)![1]!.length;
      const items: ListItem[] = [];
      while (i < lines.length) {
        const l = lines[i]!;
        const mb = bullet.exec(l);
        const mo = ordered.exec(l);
        const m = isOrdered ? mo : mb;
        if (m && m[1]!.length <= baseIndent + 1) {
          let text = isOrdered ? m[4]! : m[3]!;
          let task: boolean | null = null;
          const t = /^\[([ xX])\]\s+(.*)$/.exec(text);
          if (t) {
            task = t[1] !== ' ';
            text = t[2]!;
          }
          items.push({ task, lines: [text] });
          i++;
          continue;
        }
        if (isBlank(l)) {
          const nxt = lines[i + 1];
          if (nxt !== undefined && (/^\s{2,}\S/.test(nxt) || (isOrdered ? ordered : bullet).test(nxt))) {
            items[items.length - 1]?.lines.push('');
            i++;
            continue;
          }
          break;
        }
        if (/^\s{2,}\S/.test(l) && items.length) {
          items[items.length - 1]!.lines.push(l.replace(/^\s{2,4}/, ''));
          i++;
          continue;
        }
        if ((isOrdered ? mb : mo) || heading.test(l) || hr.test(l) || fence.test(l) || quote.test(l)) break;
        if (items.length) {
          items[items.length - 1]!.lines.push(l.trim());
          i++;
          continue;
        }
        break;
      }
      const tag = isOrdered ? 'ol' : 'ul';
      const hasTask = items.some((it) => it.task !== null);
      out += `<${tag}${isOrdered && start !== 1 ? ` start="${start}"` : ''}${hasTask ? ' class="tasks"' : ''}>`;
      for (const it of items) {
        const [first, ...rest] = it.lines;
        const nested = rest.length ? renderBlocks(rest) : '';
        const check =
          it.task === null
            ? ''
            : `<span class="w-check" role="checkbox" aria-checked="${it.task}" ${it.task ? 'data-checked' : ''}>${glyph('checkMark', 12)}</span>`;
        out += `<li${it.task !== null ? ' class="task"' : ''}>${check}<span>${renderInline(first ?? '')}</span>${nested}</li>`;
      }
      out += `</${tag}>`;
      continue;
    }
    if (line.includes('|') && tableSep.test(lines[i + 1] ?? '') && /-/.test(lines[i + 1] ?? '')) {
      const split = (l: string) =>
        l
          .trim()
          .replace(/^\||\|$/g, '')
          .split(/(?<!\\)\|/)
          .map((c) => c.trim().replace(/\\\|/g, '|'));
      const head = split(line);
      const aligns = split(lines[i + 1]!).map((c) =>
        c.startsWith(':') && c.endsWith(':') ? 'center' : c.endsWith(':') ? 'right' : c.startsWith(':') ? 'left' : '',
      );
      i += 2;
      const rows: string[][] = [];
      while (i < lines.length && lines[i]!.includes('|') && !isBlank(lines[i])) rows.push(split(lines[i++]!));
      const cell = (tag: string, c: string, k: number) =>
        `<${tag}${aligns[k] ? ` style="text-align:${aligns[k]}"` : ''}>${renderInline(c)}</${tag}>`;
      out += `<div class="table"><table><thead><tr>${head.map((c, k) => cell('th', c, k)).join('')}</tr></thead><tbody>${rows
        .map((r) => `<tr>${head.map((_, k) => cell('td', r[k] ?? '', k)).join('')}</tr>`)
        .join('')}</tbody></table></div>`;
      continue;
    }
    const para: string[] = [];
    while (i < lines.length && !isBlank(lines[i])) {
      const l = lines[i]!;
      if (para.length && /^ {0,3}=+\s*$/.test(l)) {
        out += `<h1>${renderInline(para.join('\n'))}</h1>`;
        para.length = 0;
        i++;
        break;
      }
      if (para.length && /^ {0,3}-+\s*$/.test(l)) {
        out += `<h2>${renderInline(para.join('\n'))}</h2>`;
        para.length = 0;
        i++;
        break;
      }
      if (
        para.length &&
        (fence.test(l) || heading.test(l) || hr.test(l) || quote.test(l) || bullet.test(l) || /^ {0,3}1[.)]\s/.test(l))
      )
        break;
      para.push(l.trimStart());
      i++;
    }
    if (para.length) out += `<p>${renderInline(para.join('\n'))}</p>`;
  }
  return out;
}

const mdCss = css`
:host { display: block; color: var(--w-text-fill-color-primary); font: var(--w-type-body); line-height: 20px; }
.md { user-select: text; -webkit-user-select: text; overflow-wrap: anywhere; }
.md > :first-child { margin-top: 0; }
.md > :last-child { margin-bottom: 0; }
h1, h2, h3, h4, h5, h6 { margin: 20px 0 8px; }
h1 { font: var(--w-type-title); }
h2 { font: var(--w-type-subtitle); }
h3 { font: var(--w-type-body-large-strong); }
h4 { font: var(--w-type-body-strong); }
h5, h6 { font: var(--w-type-caption); font-weight: 600; color: var(--w-text-fill-color-secondary); }
p { margin: 0 0 12px; }
a {
  color: var(--w-accent-text-fill-color-primary);
  text-decoration: none;
  border-radius: 2px;
  cursor: pointer;
}
a:hover { color: var(--w-accent-text-fill-color-secondary); text-decoration: underline; }
a:active { color: var(--w-accent-text-fill-color-tertiary); }
${focusRing('a:focus-visible', 2)}
strong { font-weight: 600; }
del { color: var(--w-text-fill-color-secondary); }
code {
  font: 13px/19px var(--w-font-family-mono);
  padding: 1px 4px;
  border-radius: var(--w-corner-radius-control);
  background: var(--w-control-alt-fill-color-tertiary);
  border: 1px solid var(--w-card-stroke-color-default);
}
pre.code {
  position: relative;
  margin: 0 0 12px;
  padding: 12px 16px;
  border: 1px solid var(--w-card-stroke-color-default);
  border-radius: var(--w-corner-radius-overlay);
  background: var(--w-card-background-fill-color-secondary);
  overflow: auto;
  font: 13px/19px var(--w-font-family-mono);
  scrollbar-width: thin;
}
pre.code code { padding: 0; border: 0; background: transparent; font: inherit; white-space: pre; }
pre.code .lang { display: block; margin-bottom: 6px; font: var(--w-type-caption); color: var(--w-text-fill-color-tertiary); text-transform: uppercase; letter-spacing: 0.02em; }
pre.code .copy {
  position: absolute; top: 6px; right: 6px; width: 30px; height: 28px; display: grid; place-items: center;
  border: 0; border-radius: 4px; background: transparent; color: var(--w-text-fill-color-secondary); opacity: 0;
  transition: opacity var(--w-duration-faster) linear;
}
pre.code:hover .copy, pre.code .copy:focus-visible { opacity: 1; }
pre.code .copy:hover { background: var(--w-subtle-fill-color-secondary); }
pre.code .copy:active { background: var(--w-subtle-fill-color-tertiary); }
.tk-k { color: var(--w-md-k, #0000ff); } .tk-s { color: var(--w-md-s, #a31515); } .tk-c { color: var(--w-md-c, #008000); }
.tk-n { color: var(--w-md-n, #098658); } .tk-t { color: var(--w-md-t, #267f99); } .tk-a { color: var(--w-md-a, #e50000); } .tk-p { color: var(--w-md-p, #800000); }
blockquote {
  margin: 0 0 12px;
  padding: 2px 0 2px 14px;
  position: relative;
  color: var(--w-text-fill-color-secondary);
}
blockquote::before { content: ''; position: absolute; left: 0; top: 0; bottom: 0; width: 3px; border-radius: 1.5px; background: var(--w-accent-fill-color-default); }
blockquote > :last-child { margin-bottom: 0; }
ul, ol { margin: 0 0 12px; padding-inline-start: 24px; }
li { margin: 4px 0; }
li > ul, li > ol { margin: 4px 0 0; }
li::marker { color: var(--w-text-fill-color-secondary); }
li.task { list-style: none; display: flex; gap: 8px; align-items: flex-start; margin-inline-start: -24px; }
li.task .w-check { flex: none; }
hr { border: 0; height: 1px; background: var(--w-divider-stroke-color-default); margin: 16px 0; }
img { max-width: 100%; border-radius: var(--w-corner-radius-control); vertical-align: middle; }
.table { overflow-x: auto; margin: 0 0 12px; border: 1px solid var(--w-card-stroke-color-default); border-radius: var(--w-corner-radius-overlay); }
table { border-collapse: collapse; width: 100%; min-width: max-content; }
th, td { padding: 7px 12px 8px; text-align: start; border-bottom: 1px solid var(--w-divider-stroke-color-default); }
th { font-weight: 600; background: var(--w-card-background-fill-color-secondary); }
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover td { background: var(--w-subtle-fill-color-secondary); }
`;

const codeColors = css`
:host {
  --w-md-k: light-dark(#0000ff, #569cd6);
  --w-md-s: light-dark(#a31515, #ce9178);
  --w-md-c: light-dark(#008000, #6a9955);
  --w-md-n: light-dark(#098658, #b5cea8);
  --w-md-t: light-dark(#267f99, #4ec9b0);
  --w-md-a: light-dark(#e50000, #9cdcfe);
  --w-md-p: light-dark(#800000, #808080);
}
`;

export class WinMarkdownTextBlock extends WinElement {
  static override styles = [miniCheckCss, mdCss, codeColors];
  static override template = `<div class="md" part="content"></div>`;
  static override props: PropDefs = {
    text: { type: String },
  };
  declare text: string;

  private observer: MutationObserver | null = null;

  static {
    this.define('win-markdown-text-block');
  }

  protected override firstConnected(): void {
    const md = this.$('.md');
    md.addEventListener('click', (ev) => {
      const t = ev.target as Element;
      const copy = t.closest<HTMLElement>('[data-copy]');
      if (copy) {
        const code = copy.parentElement?.querySelector('code')?.textContent ?? '';
        void navigator.clipboard?.writeText(code);
        copy.innerHTML = glyph('checkMark', 14);
        setTimeout(() => (copy.innerHTML = glyph('copy', 14)), 1200);
        return;
      }
      const a = t.closest<HTMLAnchorElement>('a[href]');
      if (!a) return;
      const href = a.getAttribute('href')!;
      ev.preventDefault();
      if (!this.emit('linkclicked', { href }, { cancelable: true })) return;
      if (href.startsWith('#')) {
        md.querySelector(`[id="${CSS.escape(decodeURIComponent(href.slice(1)))}"]`)?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        });
        return;
      }
      window.open(href, '_blank', 'noopener');
    });
    this.observer = new MutationObserver(() => {
      if (!this.text) this.render();
    });
    this.observer.observe(this, { childList: true, characterData: true, subtree: true });
  }

  protected override updated(): void {
    this.render();
  }

  get source(): string {
    if (this.text) return this.text;
    const raw = (this.textContent ?? '').replace(/^\n+|\s+$/g, '');
    const indents = raw
      .split('\n')
      .filter((l) => l.trim())
      .map((l) => /^ */.exec(l)![0].length);
    const min = indents.length ? Math.min(...indents) : 0;
    return raw
      .split('\n')
      .map((l) => l.slice(min))
      .join('\n');
  }

  private render(): void {
    this.$('.md').innerHTML = renderMarkdown(this.source);
  }
}

declare global {
  interface HTMLElementTagNameMap {
    'win-markdown-text-block': WinMarkdownTextBlock;
  }
}
