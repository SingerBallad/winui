import { html, type GalleryPage } from './types.ts';
import { people } from './data.ts';
import { showToast, type Severity } from '../../../components/status/notification.ts';
import {
  animate,
  contentIn,
  durations,
  easings,
  flip,
  itemAdded,
  itemRemoved,
  navigateIn,
  popupIn,
  popupOut,
  settled,
  staggerIn,
  type NavigationTransition,
} from '../../../motion/animate.ts';

function landscape(w = 960, h = 540, hue = 210): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" width="${w}" height="${h}" preserveAspectRatio="none">
<defs>
<linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${hue},70%,62%)"/><stop offset=".62" stop-color="hsl(${(hue + 25) % 360},75%,82%)"/><stop offset="1" stop-color="hsl(${(hue + 40) % 360},70%,90%)"/></linearGradient>
<linearGradient id="m1" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${(hue + 10) % 360},30%,42%)"/><stop offset="1" stop-color="hsl(${(hue + 10) % 360},35%,30%)"/></linearGradient>
<linearGradient id="m2" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="hsl(${(hue + 150) % 360},35%,36%)"/><stop offset="1" stop-color="hsl(${(hue + 150) % 360},40%,22%)"/></linearGradient>
<radialGradient id="sun"><stop offset="0" stop-color="#fff7d6"/><stop offset=".45" stop-color="#ffe08a"/><stop offset="1" stop-color="#ffe08a" stop-opacity="0"/></radialGradient>
</defs>
<rect width="${w}" height="${h}" fill="url(#s)"/>
<circle cx="${w * 0.72}" cy="${h * 0.3}" r="${h * 0.22}" fill="url(#sun)"/>
<path d="M0 ${h * 0.68} L${w * 0.14} ${h * 0.46} L${w * 0.27} ${h * 0.6} L${w * 0.42} ${h * 0.36} L${w * 0.6} ${h * 0.62} L${w * 0.78} ${h * 0.42} L${w} ${h * 0.64} V${h} H0Z" fill="url(#m1)" opacity=".85"/>
<path d="M0 ${h * 0.82} Q${w * 0.2} ${h * 0.66} ${w * 0.42} ${h * 0.8} T${w * 0.82} ${h * 0.76} T${w} ${h * 0.8} V${h} H0Z" fill="url(#m2)"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function avatar(hue = 28): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96" width="192" height="192">
<rect width="96" height="96" fill="hsl(${hue},65%,78%)"/>
<circle cx="48" cy="40" r="18" fill="hsl(${hue},45%,92%)"/>
<path d="M30 34c2-14 34-16 37 1-6-5-14-8-21-8s-12 3-16 7z" fill="hsl(${(hue + 200) % 360},25%,28%)"/>
<circle cx="41" cy="42" r="2.2" fill="#2b2b2b"/><circle cx="55" cy="42" r="2.2" fill="#2b2b2b"/>
<path d="M42 50q6 5 12 0" stroke="#2b2b2b" stroke-width="2" fill="none" stroke-linecap="round"/>
<path d="M16 96c4-20 18-28 32-28s28 8 32 28z" fill="hsl(${(hue + 180) % 360},55%,45%)"/>
</svg>`;
  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
}

function synthWav(seconds = 24, rate = 22050): string {
  const n = Math.floor(seconds * rate);
  const buf = new ArrayBuffer(44 + n * 2);
  const v = new DataView(buf);
  const w = (o: number, s: string) => {
    for (let i = 0; i < s.length; i++) v.setUint8(o + i, s.charCodeAt(i));
  };
  w(0, 'RIFF');
  v.setUint32(4, 36 + n * 2, true);
  w(8, 'WAVE');
  w(12, 'fmt ');
  v.setUint32(16, 16, true);
  v.setUint16(20, 1, true);
  v.setUint16(22, 1, true);
  v.setUint32(24, rate, true);
  v.setUint32(28, rate * 2, true);
  v.setUint16(32, 2, true);
  v.setUint16(34, 16, true);
  w(36, 'data');
  v.setUint32(40, n * 2, true);
  const chords = [
    [261.63, 329.63, 392.0],
    [220.0, 261.63, 329.63],
    [174.61, 220.0, 261.63],
    [196.0, 246.94, 293.66],
  ];
  const beat = 1.5;
  for (let i = 0; i < n; i++) {
    const t = i / rate;
    const idx = Math.floor(t / beat) % chords.length;
    const local = t % beat;
    const env = Math.min(1, local * 18) * Math.exp(-local * 1.6);
    let s = 0;
    for (const f of chords[idx]!) s += Math.sin(2 * Math.PI * f * t) + 0.25 * Math.sin(4 * Math.PI * f * t);
    const arp = chords[idx]![Math.floor(local * 4) % 3]! * 2;
    s += 0.6 * Math.sin(2 * Math.PI * arp * t) * Math.exp(-(local % 0.375) * 7);
    v.setInt16(44 + i * 2, Math.max(-1, Math.min(1, (s / 4.2) * env)) * 0x6fff, true);
  }
  return URL.createObjectURL(new Blob([buf], { type: 'audio/wav' }));
}

function visualiser(canvas: HTMLCanvasElement, media: () => HTMLMediaElement | null): () => void {
  let raf = 0;
  const ctx = canvas.getContext('2d')!;
  const draw = () => {
    const m = media();
    const t = m?.currentTime ?? 0;
    const playing = !!m && !m.paused;
    const dpr = devicePixelRatio || 1;
    canvas.width = Math.round(canvas.clientWidth * dpr);
    canvas.height = Math.round(canvas.clientHeight * dpr);
    const W = canvas.width;
    const H = canvas.height;
    const g = ctx.createLinearGradient(0, 0, W, H);
    const hue = (t * 12) % 360;
    g.addColorStop(0, `hsl(${hue}, 70%, 22%)`);
    g.addColorStop(1, `hsl(${(hue + 90) % 360}, 70%, 12%)`);
    ctx.fillStyle = g;
    ctx.fillRect(0, 0, W, H);
    const bars = 48;
    const bw = W / bars;
    for (let i = 0; i < bars; i++) {
      const phase = Math.sin(t * 3 + i * 0.45) * 0.5 + 0.5;
      const beat = Math.exp(-((t % 1.5) * 2.2));
      const amp = playing ? 0.15 + 0.6 * phase * (0.45 + 0.55 * beat) : 0.06;
      const bh = amp * H * 0.62;
      ctx.fillStyle = `hsla(${(hue + i * 4) % 360}, 85%, 68%, .85)`;
      const x = i * bw + bw * 0.18;
      ctx.beginPath();
      ctx.roundRect(x, H * 0.66 - bh, bw * 0.64, bh, bw * 0.3);
      ctx.fill();
    }
    ctx.fillStyle = 'rgba(255,255,255,.92)';
    ctx.font = `600 ${Math.round(22 * dpr)}px "Segoe UI Variable Display", "Segoe UI", sans-serif`;
    ctx.fillText('WinUI 3 Gallery · 合成音频', 24 * dpr, 44 * dpr);
    ctx.font = `${Math.round(13 * dpr)}px "Segoe UI Variable Text", "Segoe UI", sans-serif`;
    ctx.fillStyle = 'rgba(255,255,255,.7)';
    ctx.fillText(playing ? '正在播放' : '已暂停 — 按播放键开始', 24 * dpr, 66 * dpr);
    raf = requestAnimationFrame(draw);
  };
  raf = requestAnimationFrame(draw);
  return () => cancelAnimationFrame(raf);
}

type Checkable = HTMLElement & { checked?: boolean };
type Ranged = HTMLElement & { value?: number | string };

function onCheck(root: ParentNode | null, sel: string, fn: (on: boolean) => void): void {
  const el = root?.querySelector<Checkable>(sel);
  if (!el) return;
  const h = () => fn(!!el.checked);
  el.addEventListener('change', h);
  el.addEventListener('click', () => setTimeout(h));
}

function onChoice(root: ParentNode | null, sel: string, fn: (value: string) => void): void {
  const el = root?.querySelector<HTMLElement>(sel);
  el?.addEventListener('selectionchanged', (e) =>
    fn(String((e as CustomEvent<{ value?: string }>).detail?.value ?? '')),
  );
}

function onRange(root: ParentNode | null, sel: string, fn: (v: number) => void): void {
  const el = root?.querySelector<Ranged>(sel);
  if (!el) return;
  const h = () => fn(Number(el.value ?? 0));
  el.addEventListener('input', h);
  el.addEventListener('change', h);
}

const out = (ex: HTMLElement, text: string) => {
  const o = ex.querySelector('[data-output]');
  if (o) o.textContent = text;
};

const LONG_MESSAGE =
  'A long essential app message for your users to be informed of, acknowledge, or take action on. Lorem ipsum dolor sit amet, consectetur adipiscing elit. Proin dapibus dolor vitae justo rutrum, ut lobortis nibh mattis. Aenean id elit commodo, semper felis nec.';

function opacityOf(el: Element): number {
  const o = Number(getComputedStyle(el).opacity);
  return Number.isFinite(o) ? o : 1;
}

function fadeTo(el: Element, to: number, full: number = durations.faster): Animation {
  const from = opacityOf(el);
  return animate(el, [{ opacity: from }, { opacity: to }], {
    duration: Math.max(1, full * Math.abs(to - from)),
    easing: easings.linear,
    fill: 'forwards',
  });
}

interface FlightBox {
  x: number;
  y: number;
  w: number;
  h: number;
  r: number;
}

function connectedAnimationDemo(stage: HTMLElement): void {
  const hues = [210, 260, 330, 20, 140, 180];
  const grad = (h: number) => `linear-gradient(135deg,hsl(${h},70%,62%),hsl(${h + 40},70%,42%))`;
  stage.innerHTML = `<div class="ca-view ca-list" data-view="list">${hues
    .map(
      (h, i) =>
        `<button type="button" class="ca-tile" data-i="${i}"><span class="ca-hero" data-hero="${i}" style="background:${grad(h)}"></span><span class="w-body-strong">项目 ${i + 1}</span></button>`,
    )
    .join('')}</div>
<div class="ca-view ca-detail" data-view="detail" inert style="visibility:hidden;opacity:0">
  <win-button data-back icon="Back" style="align-self:flex-start">返回</win-button>
  <span class="ca-detail-hero" data-detail-hero></span>
  <span class="w-subtitle" data-detail-title></span>
  <span class="w-text-secondary" data-detail-text>ConnectedAnimationService.PrepareToAnimate / TryStart 的 Web 等价实现。</span>
</div>`;
  const listView = stage.querySelector<HTMLElement>('[data-view="list"]')!;
  const detailView = stage.querySelector<HTMLElement>('[data-view="detail"]')!;
  const detailHero = detailView.querySelector<HTMLElement>('[data-detail-hero]')!;
  const back = detailView.querySelector<HTMLElement>('[data-back]')!;
  const title = detailView.querySelector<HTMLElement>('[data-detail-title]')!;
  const text = detailView.querySelector<HTMLElement>('[data-detail-text]')!;
  const tileHero = (i: number) => listView.querySelector<HTMLElement>(`[data-hero="${i}"]`)!;
  let view: 'list' | 'detail' = 'list';
  let item = -1;

  const boxOf = (el: Element): FlightBox => {
    const s = stage.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    return {
      x: r.left - s.left,
      y: r.top - s.top,
      w: r.width,
      h: r.height,
      r: parseFloat(getComputedStyle(el).borderTopLeftRadius) || 0,
    };
  };
  const geometry = (b: FlightBox, dy = 0): Keyframe => ({
    left: `${b.x}px`,
    top: `${b.y + dy}px`,
    width: `${b.w}px`,
    height: `${b.h}px`,
    borderRadius: `${b.r}px`,
  });
  const REST = '0 0 0 0 rgba(0, 0, 0, 0)';
  const LIFT = '0 12px 24px 0 rgba(0, 0, 0, 0.22)';

  interface Ghost {
    el: HTMLElement;
    item: number;
    target: HTMLElement | null;
    anim: Animation | null;
  }
  let ghost: Ghost | null = null;

  const dismiss = (g: Ghost) => {
    g.anim?.pause();
    g.anim = null;
    if (g.target) g.target.style.visibility = '';
    g.target = null;
    void settled(fadeTo(g.el, 0, durations.fast)).then(() => g.el.remove());
  };

  const fly = (i: number, source: HTMLElement, target: HTMLElement, configuration: 'gravity' | 'direct') => {
    let g = ghost;
    let from: FlightBox;
    let fromShadow = REST;
    if (g && g.item === i) {
      from = boxOf(g.el);
      fromShadow = getComputedStyle(g.el).boxShadow;
      if (fromShadow === 'none') fromShadow = REST;
      g.anim?.cancel();
      if (g.target && g.target !== source && g.target !== target) g.target.style.visibility = '';
      fadeTo(g.el, 1);
    } else {
      if (g) dismiss(g);
      from = boxOf(source);
      const el = document.createElement('div');
      el.setAttribute('aria-hidden', 'true');
      el.style.cssText = `position:absolute;z-index:2;pointer-events:none;margin:0;background:${grad(hues[i]!)}`;
      stage.append(el);
      g = { el, item: i, target: null, anim: null };
    }
    ghost = g;
    source.style.visibility = 'hidden';
    target.style.visibility = 'hidden';
    g.target = target;
    const to = boxOf(target);
    Object.assign(g.el.style, {
      left: `${to.x}px`,
      top: `${to.y}px`,
      width: `${to.w}px`,
      height: `${to.h}px`,
      borderRadius: `${to.r}px`,
    });
    const mid: FlightBox = {
      x: (from.x + to.x) / 2,
      y: (from.y + to.y) / 2,
      w: (from.w + to.w) / 2,
      h: (from.h + to.h) / 2,
      r: (from.r + to.r) / 2,
    };
    const frames: Keyframe[] =
      configuration === 'gravity'
        ? [
            { ...geometry(from), boxShadow: fromShadow },
            { ...geometry(mid, 12), boxShadow: LIFT, offset: 0.5 },
            { ...geometry(to), boxShadow: REST },
          ]
        : [
            { ...geometry(from), boxShadow: fromShadow },
            { ...geometry(to), boxShadow: REST },
          ];
    const anim = animate(g.el, frames, {
      duration: configuration === 'gravity' ? durations.slow + 67 : durations.normal,
      easing: easings.decelerate,
    });
    g.anim = anim;
    const flight = g;
    void settled(anim).then(() => {
      if (flight.anim !== anim || anim.playState !== 'finished') return;
      target.style.visibility = '';
      flight.anim = null;
      flight.target = null;
      void settled(fadeTo(flight.el, 0, durations.fast)).then(() => {
        if (ghost === flight && !flight.anim && opacityOf(flight.el) < 0.01) {
          flight.el.remove();
          ghost = null;
        }
      });
    });
  };

  const setView = (next: 'list' | 'detail') => {
    view = next;
    const on = next === 'list' ? listView : detailView;
    const off = next === 'list' ? detailView : listView;
    off.inert = true;
    on.inert = false;
    on.style.visibility = '';
    const out = fadeTo(off, 0, durations.faster);
    void settled(out).then(() => {
      if (out.playState === 'finished' && off.inert) off.style.visibility = 'hidden';
    });
    fadeTo(on, 1, next === 'list' ? durations.normal : durations.fast);
  };

  const openDetail = (i: number) => {
    const fresh = opacityOf(detailView) < 0.05;
    const hadFocus = listView.contains(document.activeElement);
    item = i;
    title.textContent = `项目 ${i + 1}`;
    detailHero.style.background = grad(hues[i]!);
    setView('detail');
    if (fresh) staggerIn([back, title, text], { distance: 16, stagger: 40 });
    fly(i, tileHero(i), detailHero, 'gravity');
    if (hadFocus) back.focus({ preventScroll: true });
  };

  const goBack = () => {
    if (view !== 'detail') return;
    const hadFocus = detailView.contains(document.activeElement);
    setView('list');
    fly(item, detailHero, tileHero(item), 'direct');
    if (hadFocus) listView.querySelector<HTMLElement>(`[data-i="${item}"]`)?.focus({ preventScroll: true });
  };

  listView.addEventListener('click', (e) => {
    const tile = (e.target as Element).closest<HTMLElement>('[data-i]');
    if (tile && e.detail <= 1 && view === 'list') openDetail(Number(tile.dataset.i));
  });
  back.addEventListener('click', (e) => {
    if (e.detail <= 1) goBack();
  });
}

function demoPicture(w = 960, h = 640): string {
  const c = document.createElement('canvas');
  c.width = w;
  c.height = h;
  const g = c.getContext('2d')!;
  const sky = g.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, '#0f2c63');
  sky.addColorStop(0.55, '#3d7fd6');
  sky.addColorStop(1, '#f6c48b');
  g.fillStyle = sky;
  g.fillRect(0, 0, w, h);
  g.fillStyle = 'rgba(255, 236, 180, 0.95)';
  g.beginPath();
  g.arc(w * 0.72, h * 0.42, h * 0.12, 0, Math.PI * 2);
  g.fill();
  const hills = [
    ['#2b4f3f', 0.72, 0.18],
    ['#1d3a2e', 0.8, 0.12],
    ['#12261e', 0.9, 0.08],
  ] as const;
  for (const [color, base, amp] of hills) {
    g.fillStyle = color;
    g.beginPath();
    g.moveTo(0, h);
    for (let x = 0; x <= w; x += 8)
      g.lineTo(
        x,
        h * base + Math.sin(x / (w * 0.09) + base * 9) * h * amp * 0.4 + Math.sin(x / (w * 0.031)) * h * 0.01,
      );
    g.lineTo(w, h);
    g.fill();
  }
  g.fillStyle = 'rgba(255,255,255,0.8)';
  for (let i = 0; i < 60; i++) g.fillRect((i * 97) % w, (i * 53) % (h * 0.4), 2, 2);
  return c.toDataURL('image/png');
}

const pages: GalleryPage[] = [
  {
    id: 'info-bar',
    title: 'InfoBar',
    category: 'status-info',
    icon: '',
    tags: ['win-info-bar'],
    description:
      'InfoBar 用于显示应用范围的重要状态消息：内联、持久，可选关闭按钮与操作按钮。支持 Informational / Success / Warning / Error 四种严重级别；标题与消息放得下时排在一行，否则自动换为纵向布局（复刻 InfoBarPanel 规则）。',
    docs: [{ label: 'InfoBar 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/infobar' }],
    related: ['info-badge', 'progress-bar'],
    samples: [
      {
        title: '可关闭并可切换严重级别的 InfoBar',
        html: html`<win-info-bar open heading="Title" message="Essential app message for your users to be informed of, acknowledge, or take action on." data-stretch></win-info-bar>
<div class="output" data-output></div>`,
        options: html`<win-check-box data-opt="open" checked>IsOpen</win-check-box>
<win-radio-group header="Severity" data-opt="sev">
  <win-radio-button value="informational" checked>Informational</win-radio-button>
  <win-radio-button value="success">Success</win-radio-button>
  <win-radio-button value="warning">Warning</win-radio-button>
  <win-radio-button value="error">Error</win-radio-button>
</win-radio-group>`,
        setup(ex, opt) {
          const bar = ex.querySelector('win-info-bar')!;
          onCheck(opt, '[data-opt="open"]', (on) => (bar.open = on));
          onChoice(opt, '[data-opt="sev"]', (v) => (bar.severity = v as never));
          bar.addEventListener('closed', (e) => {
            out(ex, `closed（reason: ${(e as CustomEvent).detail.reason}）`);
            const cb = opt?.querySelector<Checkable>('[data-opt="open"]');
            if (cb) cb.checked = false;
          });
        },
      },
      {
        title: '长短消息与操作按钮',
        description: '消息较长或放不下时，标题、消息与操作按钮改为纵向排列。',
        html: html`<win-info-bar open severity="warning" heading="Title" message="Essential app message." data-stretch>
  <win-button slot="action">Action</win-button>
</win-info-bar>`,
        options: html`<win-radio-group header="消息长度" data-opt="len">
  <win-radio-button value="short" checked>短消息</win-radio-button>
  <win-radio-button value="long">长消息</win-radio-button>
</win-radio-group>
<win-radio-group header="操作按钮" data-opt="act">
  <win-radio-button value="button" checked>Button</win-radio-button>
  <win-radio-button value="link">HyperlinkButton</win-radio-button>
  <win-radio-button value="none">无</win-radio-button>
</win-radio-group>`,
        setup(ex, opt) {
          const bar = ex.querySelector('win-info-bar')!;
          onChoice(
            opt,
            '[data-opt="len"]',
            (v) => (bar.message = v === 'long' ? LONG_MESSAGE : 'Essential app message.'),
          );
          onChoice(opt, '[data-opt="act"]', (v) => {
            bar.querySelector('[slot="action"]')?.remove();
            if (v === 'button') bar.insertAdjacentHTML('beforeend', '<win-button slot="action">Action</win-button>');
            if (v === 'link')
              bar.insertAdjacentHTML(
                'beforeend',
                '<win-hyperlink-button slot="action" href="https://learn.microsoft.com">Informational link</win-hyperlink-button>',
              );
          });
        },
      },
      {
        title: 'IsClosable 与 IsIconVisible',
        html: html`<win-info-bar open severity="success" heading="Title" message="Essential app message for your users to be informed of, acknowledge, or take action on." data-stretch></win-info-bar>`,
        options: html`<win-check-box data-opt="closable" checked>IsClosable</win-check-box>
<win-check-box data-opt="icon" checked>IsIconVisible</win-check-box>`,
        setup(ex, opt) {
          const bar = ex.querySelector('win-info-bar')!;
          onCheck(opt, '[data-opt="closable"]', (on) => (bar.closable = on));
          onCheck(opt, '[data-opt="icon"]', (on) => (bar.iconVisible = on));
          bar.addEventListener('closed', () => setTimeout(() => (bar.open = true), 1200));
        },
      },
      {
        title: '带自定义内容与自定义图标的 InfoBar',
        html: html`<win-info-bar open heading="正在同步" message="正在上传 3 个文件到 OneDrive。" icon="Sync" data-stretch>
  <win-progress-bar indeterminate style="margin:0 0 16px"></win-progress-bar>
</win-info-bar>
<win-info-bar open severity="error" heading="无法保存" message="磁盘空间不足。" closable="false" data-stretch>
  <win-hyperlink-button slot="action">释放空间</win-hyperlink-button>
</win-info-bar>`,
      },
    ],
  },
  {
    id: 'info-badge',
    title: 'InfoBadge',
    category: 'status-info',
    icon: '',
    tags: ['win-info-badge'],
    description:
      'InfoBadge 以非侵入的方式提示需要关注的内容：圆点、图标或数字三种形态，配合 Attention / Informational / Success / Caution / Critical 五种样式。数值变化时会有轻微的脉冲动效（增强）。',
    docs: [{ label: 'InfoBadge 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/info-badge' }],
    related: ['info-bar', 'navigation-view'],
    samples: [
      {
        title: '不同样式的 InfoBadge（Dot / Icon / Value）',
        html: html`<div style="display:grid;grid-template-columns:110px repeat(5,auto);gap:14px 22px;align-items:center;justify-items:center">
  <span></span><span class="w-caption">Attention</span><span class="w-caption">Informational</span><span class="w-caption">Success</span><span class="w-caption">Caution</span><span class="w-caption">Critical</span>
  <span class="w-caption" style="justify-self:start">Dot</span>
  <win-info-badge severity="attention"></win-info-badge><win-info-badge severity="informational"></win-info-badge><win-info-badge severity="success"></win-info-badge><win-info-badge severity="caution"></win-info-badge><win-info-badge severity="critical"></win-info-badge>
  <span class="w-caption" style="justify-self:start">Icon</span>
  <win-info-badge severity="attention" kind="icon"></win-info-badge><win-info-badge severity="informational" kind="icon"></win-info-badge><win-info-badge severity="success" kind="icon"></win-info-badge><win-info-badge severity="caution" kind="icon"></win-info-badge><win-info-badge severity="critical" kind="icon"></win-info-badge>
  <span class="w-caption" style="justify-self:start">Value</span>
  <win-info-badge severity="attention" value="1"></win-info-badge><win-info-badge severity="informational" value="10"></win-info-badge><win-info-badge severity="success" value="42"></win-info-badge><win-info-badge severity="caution" value="5"></win-info-badge><win-info-badge severity="critical" value="999"></win-info-badge>
</div>`,
      },
      {
        title: '动态数值',
        html: html`<win-button style="position:relative">收件箱
  <win-info-badge value="3" style="position:absolute;top:-6px;right:-8px"></win-info-badge>
</win-button>
<div class="output" data-output>Value = 3</div>`,
        options: html`<win-number-box data-opt="value" header="InfoBadge Value" value="3" minimum="-1" maximum="999" spin-button-placement-mode="inline"></win-number-box>`,
        setup(ex, opt) {
          const b = ex.querySelector('win-info-badge')!;
          opt?.querySelector('[data-opt="value"]')?.addEventListener('valuechanged', (e) => {
            const v = Number((e as CustomEvent<{ newValue: number }>).detail.newValue);
            b.value = Number.isFinite(v) ? Math.trunc(v) : -1;
            out(ex, b.value < 0 ? 'Value = -1（显示为圆点）' : `Value = ${b.value}`);
          });
        },
      },
      {
        title: '在图标按钮上叠加 InfoBadge',
        html: html`<div class="row">
  <win-button appearance="subtle" style="position:relative" aria-label="邮件"><win-symbol-icon symbol="Mail" size="16"></win-symbol-icon><win-info-badge severity="attention" style="position:absolute;top:4px;right:4px"></win-info-badge></win-button>
  <win-button appearance="subtle" style="position:relative" aria-label="同步"><win-symbol-icon symbol="Sync" size="16"></win-symbol-icon><win-info-badge severity="critical" kind="icon" style="position:absolute;top:-2px;right:-4px"></win-info-badge></win-button>
  <win-button appearance="subtle" style="position:relative" aria-label="通知"><win-symbol-icon symbol="Message" size="16"></win-symbol-icon><win-info-badge value="12" style="position:absolute;top:-4px;right:-8px"></win-info-badge></win-button>
</div>`,
      },
    ],
  },
  {
    id: 'progress-bar',
    title: 'ProgressBar',
    category: 'status-info',
    icon: '',
    tags: ['win-progress-bar'],
    description:
      'ProgressBar 显示操作的进度。确定模式按数值填充（值变化平滑过渡）；不确定模式复刻 XAML 的双段动画：两段分别占 40% 与 60% 宽度，2 秒循环，每轮结束时两段都已完全离开轨道，衔接无跳变。ShowPaused / ShowError 时第二段停在 20% 处并分别使用警示色与错误色；切换状态总是从当前画面继续。',
    docs: [
      { label: 'ProgressBar 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/progress-controls' },
    ],
    related: ['progress-ring'],
    samples: [
      {
        title: '不确定进度条',
        html: html`<win-progress-bar indeterminate style="width:240px"></win-progress-bar>`,
        options: html`<win-check-box data-opt="ind" checked>IsIndeterminate</win-check-box>
<win-check-box data-opt="paused">ShowPaused</win-check-box>
<win-check-box data-opt="error">ShowError</win-check-box>`,
        setup(ex, opt) {
          const p = ex.querySelector('win-progress-bar')!;
          p.value = 60;
          onCheck(opt, '[data-opt="ind"]', (on) => (p.indeterminate = on));
          onCheck(opt, '[data-opt="paused"]', (on) => (p.showPaused = on));
          onCheck(opt, '[data-opt="error"]', (on) => (p.showError = on));
        },
      },
      {
        title: '确定进度条',
        html: html`<win-progress-bar value="30" style="width:240px"></win-progress-bar>
<win-button data-run>模拟下载</win-button>
<div class="output" data-output>Value = 30</div>`,
        options: html`<win-slider data-opt="value" header="Value" min="0" max="100" value="30" style="width:100%"></win-slider>
<win-check-box data-opt="paused">ShowPaused</win-check-box>
<win-check-box data-opt="error">ShowError</win-check-box>`,
        setup(ex, opt) {
          const p = ex.querySelector('win-progress-bar')!;
          const slider = opt?.querySelector<Ranged>('[data-opt="value"]');
          const set = (v: number, fromSlider = false) => {
            p.value = Math.round(Math.max(0, Math.min(100, v)));
            out(ex, `Value = ${p.value}`);
            if (!fromSlider && slider) slider.value = p.value;
          };
          onRange(opt, '[data-opt="value"]', (v) => set(v, true));
          let timer: ReturnType<typeof setInterval> | null = null;
          ex.querySelector('[data-run]')!.addEventListener('click', () => {
            if (timer) clearInterval(timer);
            set(0);
            timer = setInterval(() => {
              set(p.value + 4 + Math.random() * 8);
              if (p.value >= 100 && timer) clearInterval(timer);
            }, 260);
          });
          onCheck(opt, '[data-opt="paused"]', (on) => (p.showPaused = on));
          onCheck(opt, '[data-opt="error"]', (on) => (p.showError = on));
          return () => {
            if (timer) clearInterval(timer);
          };
        },
      },
    ],
  },
  {
    id: 'progress-ring',
    title: 'ProgressRing',
    category: 'status-info',
    icon: '',
    tags: ['win-progress-ring'],
    description:
      'ProgressRing 以环形显示进度：不确定模式复刻 WinUI Lottie 动画（弧头加速伸展、弧尾追赶、整体旋转），确定模式按值绘制弧长。默认 32×32，也常用 16（小）与 64（大）。IsActive=false 时淡出隐藏。',
    related: ['progress-bar'],
    samples: [
      {
        title: '不确定进度环',
        html: html`<win-progress-ring></win-progress-ring>`,
        options: html`<win-toggle-switch data-opt="active" header="IsActive" checked></win-toggle-switch>`,
        setup(ex, opt) {
          const r = ex.querySelector('win-progress-ring')!;
          onCheck(opt, '[data-opt="active"]', (on) => (r.active = on));
        },
      },
      {
        title: '确定进度环',
        html: html`<win-progress-ring indeterminate="false" value="65" size="64" style="--w-progress-ring-background:var(--w-control-strong-stroke-color-disabled)"></win-progress-ring>
<div class="output" data-output>Value = 65</div>`,
        options: html`<win-slider data-opt="value" header="Value" min="0" max="100" value="65" style="width:100%"></win-slider>`,
        setup(ex, opt) {
          const r = ex.querySelector('win-progress-ring')!;
          onRange(opt, '[data-opt="value"]', (v) => {
            r.value = Math.round(v);
            out(ex, `Value = ${r.value}`);
          });
        },
      },
      {
        title: '尺寸与颜色',
        html: html`<div class="row" style="gap:24px">
  <win-progress-ring size="16"></win-progress-ring>
  <win-progress-ring></win-progress-ring>
  <win-progress-ring size="64"></win-progress-ring>
  <win-progress-ring size="64" style="color:var(--w-system-fill-color-success)"></win-progress-ring>
</div>`,
      },
    ],
  },
  {
    id: 'person-picture',
    title: 'PersonPicture',
    category: 'media',
    icon: '',
    tags: ['win-person-picture'],
    description:
      'PersonPicture 显示人物的头像；没有图片时根据显示名生成首字母（字号为尺寸的 42%，中日韩姓名取首字），都没有时显示联系人图标；IsGroup 显示群组图标；右上角可显示数字、字形或图片徽标。图片为空或加载失败不会出错，自动回退为首字母（修复 XAML fail-fast）。',
    docs: [
      { label: 'PersonPicture 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/person-picture' },
    ],
    samples: [
      {
        title: '头像、显示名、首字母与群组',
        html: html`<div class="row" style="gap:20px">
  <win-person-picture data-photo display-name="Jane Doe"></win-person-picture>
  <win-person-picture display-name="Jane Doe"></win-person-picture>
  <win-person-picture display-name="王小明"></win-person-picture>
  <win-person-picture initials="WS"></win-person-picture>
  <win-person-picture></win-person-picture>
  <win-person-picture is-group></win-person-picture>
  <win-person-picture display-name="加载失败回退" profile-picture="/does-not-exist.png"></win-person-picture>
</div>`,
        setup(ex) {
          ex.querySelector<HTMLElement & { profilePicture: string }>('[data-photo]')!.profilePicture = avatar(28);
        },
      },
      {
        title: '徽标（BadgeNumber / BadgeGlyph / BadgeImageSource）',
        description: '一两位数字保持圆形；更长的内容（如 99+）自动扩展为胶囊形，不会被裁切。',
        html: html`<div class="row" style="gap:28px">
  <win-person-picture display-name="Ada Lovelace" badge-number="5"></win-person-picture>
  <win-person-picture display-name="Kim Lee" badge-number="42"></win-person-picture>
  <win-person-picture display-name="Grace Hopper" badge-number="120"></win-person-picture>
  <win-person-picture display-name="Alan Turing" badge-glyph="&#xE765;"></win-person-picture>
  <win-person-picture data-photo display-name="Linus" data-badge-img></win-person-picture>
</div>`,
        setup(ex) {
          const p = ex.querySelector<HTMLElement & { profilePicture: string; badgeImageSource: string }>(
            '[data-badge-img]',
          )!;
          p.profilePicture = avatar(200);
          p.badgeImageSource = avatar(120);
        },
      },
      {
        title: '尺寸',
        html: html`<div class="row" style="gap:20px;align-items:flex-end">
  <win-person-picture display-name="Kim Lee" size="24"></win-person-picture>
  <win-person-picture display-name="Kim Lee" size="32"></win-person-picture>
  <win-person-picture display-name="Kim Lee" size="48"></win-person-picture>
  <win-person-picture display-name="Kim Lee" size="64"></win-person-picture>
  <win-person-picture display-name="Kim Lee"></win-person-picture>
</div>`,
      },
    ],
  },
  {
    id: 'media-player',
    title: 'MediaPlayer',
    category: 'media',
    icon: '',
    tags: ['win-media-player'],
    description:
      'MediaPlayer 播放音频与视频，并提供 WinUI 风格的媒体传输控件：悬浮的亚克力面板、进度时间轴与时间文字、音量浮出层、倍速菜单、重复、纵横比与全窗口。播放时 3 秒无操作自动隐藏控件。下方示例全部使用本地合成的媒体，无需网络。',
    docs: [
      { label: 'MediaPlayer 文档', href: 'https://learn.microsoft.com/windows/apps/design/controls/media-playback' },
    ],
    samples: [
      {
        title: '带传输控件的 MediaPlayer',
        html: html`<win-media-player transport-controls skip-buttons playback-rate-button repeat-button style="width:min(640px,100%);aspect-ratio:16/9;border-radius:8px" data-stretch>
  <canvas slot="visual"></canvas>
</win-media-player>`,
        setup(ex) {
          const mpe = ex.querySelector('win-media-player')!;
          const url = synthWav(24);
          mpe.source = url;
          const stop = visualiser(ex.querySelector('canvas')!, () => mpe.mediaElement);
          return () => {
            stop();
            mpe.pause();
            URL.revokeObjectURL(url);
          };
        },
      },
      {
        title: '紧凑模式（IsCompact）',
        html: html`<win-media-player transport-controls compact style="width:min(560px,100%);aspect-ratio:16/9;border-radius:8px" data-stretch>
  <canvas slot="visual"></canvas>
</win-media-player>`,
        setup(ex) {
          const mpe = ex.querySelector('win-media-player')!;
          const url = synthWav(18);
          mpe.source = url;
          const stop = visualiser(ex.querySelector('canvas')!, () => mpe.mediaElement);
          return () => {
            stop();
            mpe.pause();
            URL.revokeObjectURL(url);
          };
        },
      },
      {
        title: '实时视频流（canvas.captureStream）',
        description: '直播类来源没有时长，时间轴禁用并显示“直播”。',
        html: html`<win-media-player transport-controls auto-play muted style="width:min(560px,100%);aspect-ratio:16/9;border-radius:8px" data-stretch></win-media-player>`,
        setup(ex) {
          const mpe = ex.querySelector('win-media-player')!;
          const c = document.createElement('canvas');
          c.width = 640;
          c.height = 360;
          const ctx = c.getContext('2d')!;
          let raf = 0;
          const t0 = performance.now();
          const draw = () => {
            const t = (performance.now() - t0) / 1000;
            const g = ctx.createLinearGradient(0, 0, 640, 360);
            g.addColorStop(0, `hsl(${(t * 30) % 360},70%,45%)`);
            g.addColorStop(1, `hsl(${(t * 30 + 120) % 360},70%,25%)`);
            ctx.fillStyle = g;
            ctx.fillRect(0, 0, 640, 360);
            for (let i = 0; i < 6; i++) {
              ctx.fillStyle = `rgba(255,255,255,${0.12 + i * 0.04})`;
              ctx.beginPath();
              ctx.arc(
                320 + Math.cos(t * (0.6 + i * 0.2) + i) * 180,
                180 + Math.sin(t * (0.8 + i * 0.15) + i) * 100,
                22 + i * 6,
                0,
                Math.PI * 2,
              );
              ctx.fill();
            }
            ctx.fillStyle = '#fff';
            ctx.font = '600 28px "Segoe UI Variable Display", "Segoe UI", sans-serif';
            ctx.fillText(new Date().toLocaleTimeString(), 24, 48);
            raf = requestAnimationFrame(draw);
          };
          draw();
          const stream = (c as HTMLCanvasElement & { captureStream?: (fps?: number) => MediaStream }).captureStream?.(
            30,
          );
          if (stream) mpe.sourceObject = stream;
          return () => {
            cancelAnimationFrame(raf);
            for (const tr of stream?.getTracks() ?? []) tr.stop();
          };
        },
      },
    ],
  },
  {
    id: 'image',
    title: 'Image',
    category: 'media',
    icon: '',
    tags: ['win-image'],
    description:
      'Image 显示位图或矢量图，Stretch 决定如何填充可用空间（None / Fill / Uniform / UniformToFill）。图片加载完成后淡入（增强）；源为空或加载失败时不会崩溃，而是显示占位内容并触发 imagefailed（修复 XAML 空 Source fail-fast）。',
    samples: [
      {
        title: 'Stretch 模式',
        html: html`<div class="row" style="gap:16px;align-items:flex-start">
  <figure style="margin:0"><win-image data-img stretch="none" style="width:160px;height:110px;background:var(--w-subtle-fill-color-secondary)"></win-image><figcaption class="w-caption">None</figcaption></figure>
  <figure style="margin:0"><win-image data-img stretch="fill" style="width:160px;height:110px;background:var(--w-subtle-fill-color-secondary)"></win-image><figcaption class="w-caption">Fill</figcaption></figure>
  <figure style="margin:0"><win-image data-img stretch="uniform" style="width:160px;height:110px;background:var(--w-subtle-fill-color-secondary)"></win-image><figcaption class="w-caption">Uniform</figcaption></figure>
  <figure style="margin:0"><win-image data-img stretch="uniform-to-fill" style="width:160px;height:110px;background:var(--w-subtle-fill-color-secondary)"></win-image><figcaption class="w-caption">UniformToFill</figcaption></figure>
</div>`,
        setup(ex) {
          for (const i of ex.querySelectorAll<HTMLElement & { source: string }>('[data-img]'))
            i.source = landscape(240, 240, 200);
        },
      },
      {
        title: '加载失败与空源（行为修复）',
        html: html`<div class="row" style="gap:16px">
  <win-image source="/missing-image.png" style="width:200px;height:120px;border-radius:8px;background:var(--w-subtle-fill-color-secondary)">
    <div slot="placeholder" style="display:grid;place-items:center;height:100%;color:var(--w-text-fill-color-secondary)">图片加载失败</div>
  </win-image>
  <win-image style="width:200px;height:120px;border-radius:8px;background:var(--w-subtle-fill-color-secondary)">
    <div slot="placeholder" style="display:grid;place-items:center;height:100%;color:var(--w-text-fill-color-secondary)">Source 为空</div>
  </win-image>
</div>
<div class="output" data-output></div>`,
        setup(ex) {
          ex.querySelector('win-image')!.addEventListener('imagefailed', () =>
            out(ex, 'imagefailed 已触发，应用未崩溃。'),
          );
        },
      },
    ],
  },
  {
    id: 'animated-icon',
    title: 'AnimatedIcon',
    category: 'motion',
    icon: '',
    tags: ['win-animated-icon'],
    description:
      'AnimatedIcon 在控件状态变化时播放动画（Normal / PointerOver / Pressed，以及 On / Off 变体）。内置 WinUI 的全部 AnimatedVisuals 源：返回、设置、全局导航（汉堡菜单）、查找、三种 V 形箭头与勾选。默认跟随所在按钮的指针状态与 aria-expanded / aria-checked，也可用 state 属性直接指定。',
    samples: [
      {
        title: '在按钮中使用（悬停、按下试试）',
        html: html`<div class="row">
  <win-button appearance="subtle" aria-label="返回"><win-animated-icon source="back"></win-animated-icon></win-button>
  <win-button appearance="subtle" aria-label="导航"><win-animated-icon source="global-navigation-button"></win-animated-icon></win-button>
  <win-button appearance="subtle" aria-label="搜索"><win-animated-icon source="find"></win-animated-icon></win-button>
  <win-button aria-label="设置"><win-animated-icon source="settings" slot="icon"></win-animated-icon>设置</win-button>
  <win-button>下拉<win-animated-icon source="chevron-down-small" size="12"></win-animated-icon></win-button>
</div>`,
      },
      {
        title: 'On / Off 状态（展开、选中）',
        html: html`<div class="row">
  <win-toggle-button data-t>展开<win-animated-icon source="chevron-up-down-small" size="12" style="margin-left:8px"></win-animated-icon></win-toggle-button>
  <win-toggle-button data-t>树节点<win-animated-icon source="chevron-right-down-small" size="12" style="margin-left:8px"></win-animated-icon></win-toggle-button>
  <win-toggle-button data-t aria-label="勾选"><win-animated-icon source="accept"></win-animated-icon></win-toggle-button>
</div>`,
      },
      {
        title: '直接指定 state',
        html: html`<div class="row" style="gap:24px">
  <win-animated-icon data-state source="settings" size="32"></win-animated-icon>
  <win-animated-icon data-state source="back" size="32"></win-animated-icon>
  <win-animated-icon data-state source="accept" size="32"></win-animated-icon>
</div>`,
        options: html`<win-radio-group header="AnimatedIcon.State" data-opt="state">
  <win-radio-button value="Normal" checked>Normal</win-radio-button>
  <win-radio-button value="PointerOver">PointerOver</win-radio-button>
  <win-radio-button value="Pressed">Pressed</win-radio-button>
  <win-radio-button value="NormalOn">NormalOn</win-radio-button>
</win-radio-group>`,
        setup(ex, opt) {
          const icons = ex.querySelectorAll<HTMLElement & { state: string }>('[data-state]');
          for (const i of icons) i.state = 'Normal';
          onChoice(opt, '[data-opt="state"]', (v) => {
            for (const i of icons) i.state = v;
          });
        },
      },
    ],
  },
  {
    id: 'animation-player',
    title: 'AnimationPlayer',
    category: 'media',
    icon: '',
    tags: ['win-animation-player'],
    description:
      'AnimationPlayer 播放并控制一个“动画视觉”：PlayAsync(from, to, looped)、Pause、Resume、Stop、SetProgress。这里不需要 Lottie 运行时——任何包含 CSS 动画或 Web Animations 的 SVG 都可以作为源。',
    samples: [
      {
        title: '播放控制',
        html: html`<win-animation-player auto-play="false" style="width:180px;height:180px">
  <svg viewBox="0 0 120 120" width="180" height="180">
    <style>
      .avp-ring { fill: none; stroke: var(--w-accent-fill-color-default); stroke-width: 8; stroke-linecap: round; stroke-dasharray: 300; stroke-dashoffset: 300; animation: avp-draw 2s cubic-bezier(0,0,0,1) forwards; }
      .avp-check { fill: none; stroke: var(--w-system-fill-color-success); stroke-width: 9; stroke-linecap: round; stroke-linejoin: round; stroke-dasharray: 80; stroke-dashoffset: 80; animation: avp-draw 1s 1.2s cubic-bezier(0,0,0,1) forwards; }
      .avp-dot { fill: var(--w-accent-fill-color-default); transform-origin: 60px 60px; animation: avp-pop 2.2s cubic-bezier(.2,1.6,.4,1) forwards; }
      @keyframes avp-draw { to { stroke-dashoffset: 0; } }
      @keyframes avp-pop { 0% { transform: scale(0); opacity: 0; } 60% { opacity: .16; } 100% { transform: scale(1); opacity: .12; } }
    </style>
    <circle class="avp-dot" cx="60" cy="60" r="56"/>
    <circle class="avp-ring" cx="60" cy="60" r="46"/>
    <path class="avp-check" d="M38 62 L54 77 L84 45"/>
  </svg>
</win-animation-player>
<div class="row"><win-button data-play appearance="accent">PlayAsync(0, 1)</win-button><win-button data-loop>循环播放</win-button><win-button data-pause>Pause</win-button><win-button data-resume>Resume</win-button><win-button data-stop>Stop</win-button></div>
<div class="output" data-output>Progress = 0.00</div>`,
        setup(ex) {
          const p = ex.querySelector('win-animation-player')!;
          p.addEventListener('progress', (e) =>
            out(ex, `Progress = ${(e as unknown as CustomEvent<{ progress: number }>).detail.progress.toFixed(2)}`),
          );
          ex.querySelector('[data-play]')!.addEventListener('click', () => void p.playAsync(0, 1, false));
          ex.querySelector('[data-loop]')!.addEventListener('click', () => void p.playAsync(0, 1, true));
          ex.querySelector('[data-pause]')!.addEventListener('click', () => p.pause());
          ex.querySelector('[data-resume]')!.addEventListener('click', () => p.resume());
          ex.querySelector('[data-stop]')!.addEventListener('click', () => p.stop());
        },
      },
    ],
  },
  {
    id: 'parallax-view',
    title: 'ParallaxView',
    category: 'motion',
    icon: '',
    tags: ['win-parallax-view'],
    description:
      'ParallaxView 让背景元素随滚动以较慢速度移动，产生纵深感。VerticalShift 指定背景在整个滚动范围内移动的距离；Relative 模式下范围是视差视图在视口中可见的整个过程。',
    samples: [
      {
        title: '列表上方的视差背景',
        html: html`<div style="position:relative;width:min(520px,100%);height:320px;border-radius:8px;overflow:hidden" data-stretch>
  <win-parallax-view source="pv-scroller" vertical-shift="140" style="position:absolute;inset:0">
    <img data-bg alt="" />
  </win-parallax-view>
  <div id="pv-scroller" style="position:absolute;inset:0;overflow:auto;scrollbar-width:thin">
    <div style="height:180px"></div>
    <div data-list style="background:var(--w-solid-background-fill-color-base);border-radius:8px 8px 0 0;padding:8px"></div>
  </div>
</div>`,
        setup(ex) {
          ex.querySelector<HTMLImageElement>('[data-bg]')!.src = landscape(960, 640, 220);
          const list = ex.querySelector('[data-list]')!;
          for (let i = 1; i <= 24; i++) {
            list.insertAdjacentHTML(
              'beforeend',
              `<div style="display:flex;align-items:center;gap:12px;height:44px;padding:0 12px;border-bottom:1px solid var(--w-divider-stroke-color-default)"><span class="w-icon" style="font-size:16px">&#xE8D6;</span>列表项 ${i}</div>`,
            );
          }
        },
      },
    ],
  },
  {
    id: 'shapes',
    title: 'Shapes',
    category: 'styles',
    icon: '',
    tags: [
      'win-shape-ellipse',
      'win-shape-rectangle',
      'win-shape-line',
      'win-shape-polyline',
      'win-shape-polygon',
      'win-shape-path',
    ],
    description:
      '形状：ShapeEllipse、ShapeRectangle（radius-x / radius-y）、ShapeLine、ShapePolyline、ShapePolygon 与 ShapePath（路径数据支持 F0/F1 填充规则前缀）。颜色可以直接写 WinUI 资源名，例如 fill="AccentFillColorDefaultBrush"，会自动映射为主题令牌，随主题与强调色变化。',
    samples: [
      {
        title: '基本形状',
        html: html`<div class="row" style="gap:28px;align-items:center">
  <win-shape-ellipse width="90" height="90" fill="AccentFillColorDefaultBrush" stroke="TextFillColorPrimaryBrush" stroke-width="2" data-shape></win-shape-ellipse>
  <win-shape-rectangle width="120" height="80" radius-x="12" fill="SystemFillColorSuccessBrush" stroke="TextFillColorPrimaryBrush" stroke-width="2" data-shape></win-shape-rectangle>
  <win-shape-line x1="0" y1="0" x2="110" y2="80" stroke="SystemFillColorCriticalBrush" stroke-width="4" stroke-line-cap="round" data-shape></win-shape-line>
  <win-shape-polyline points="0,70 25,10 50,60 75,20 100,70" stroke="SystemFillColorCautionBrush" stroke-width="4" stroke-line-join="round" data-shape></win-shape-polyline>
  <win-shape-polygon points="50,0 100,40 80,95 20,95 0,40" fill="AccentFillColorSecondaryBrush" stroke="TextFillColorPrimaryBrush" stroke-width="2" data-shape></win-shape-polygon>
  <win-shape-path data="F1 M 10,70 C 10,10 90,10 90,70 L 50,100 Z" fill="SystemFillColorAttentionBrush" stroke="TextFillColorPrimaryBrush" stroke-width="2" data-shape></win-shape-path>
</div>`,
        options: html`<div class="opt-title">StrokeThickness</div>
<win-slider data-opt="thickness" min="0" max="10" value="2" step="1" style="width:100%"></win-slider>
<win-check-box data-opt="dash">StrokeDashArray = 2 1</win-check-box>`,
        setup(ex, opt) {
          const shapes = ex.querySelectorAll<HTMLElement & { strokeWidth: number; strokeDashArray: string }>(
            '[data-shape]',
          );
          onRange(opt, '[data-opt="thickness"]', (v) => {
            for (const s of shapes)
              if (s.localName !== 'win-shape-line' && s.localName !== 'win-shape-polyline') s.strokeWidth = v;
          });
          onCheck(opt, '[data-opt="dash"]', (on) => {
            for (const s of shapes) s.strokeDashArray = on ? '2 1' : '';
          });
        },
      },
      {
        title: 'Stretch：路径缩放填充',
        html: html`<div class="row" style="gap:16px">
  <win-shape-path stretch="uniform" data="M12 2 L15 9 L22 9.5 L16.5 14 L18.5 21 L12 17 L5.5 21 L7.5 14 L2 9.5 L9 9 Z" fill="SystemFillColorCautionBrush" style="width:80px;height:80px"></win-shape-path>
  <win-shape-path stretch="fill" data="M12 2 L15 9 L22 9.5 L16.5 14 L18.5 21 L12 17 L5.5 21 L7.5 14 L2 9.5 L9 9 Z" fill="AccentFillColorDefaultBrush" style="width:140px;height:80px"></win-shape-path>
  <win-shape-path stretch="uniform" data="M2 12 A10 10 0 1 1 22 12 A10 10 0 1 1 2 12 Z M7 12 A5 5 0 1 0 17 12 A5 5 0 1 0 7 12 Z" fill="SystemFillColorSuccessBrush" fill-rule="even-odd" style="width:80px;height:80px"></win-shape-path>
</div>`,
      },
    ],
  },
  {
    id: 'web-frame',
    title: 'WebFrame',
    category: 'media',
    icon: '',
    tags: ['win-web-frame'],
    description:
      'WebFrame 承载网页内容。这里以沙箱 iframe 实现：Source / NavigateToString，导航开始（可取消）与完成事件，导航期间显示 ProgressRing，同源内容支持后退、前进与刷新。示例使用 NavigateToString 加载本地 HTML，无需网络。',
    samples: [
      {
        title: '加载本地 HTML 内容',
        html: html`<div class="row"><win-button data-p="1" appearance="accent">页面 1</win-button><win-button data-p="2">页面 2</win-button><win-button data-reload icon="Refresh">刷新</win-button></div>
<win-web-frame style="width:min(640px,100%);height:260px;border-radius:8px;border:1px solid var(--w-card-stroke-color-default)" data-stretch></win-web-frame>
<div class="output" data-output></div>`,
        setup(ex) {
          const wv = ex.querySelector('win-web-frame')!;
          const page = (n: number) =>
            `<!doctype html><meta charset="utf-8"><style>html{height:100%}body{min-height:100%;box-sizing:border-box;font:14px/1.5 "Segoe UI Variable Text","Segoe UI",sans-serif;margin:0;padding:24px;background:linear-gradient(135deg,hsl(${n * 120 + 190},70%,96%),#fff);color:#1b1b1b}h1{font:600 28px "Segoe UI Variable Display","Segoe UI",sans-serif;margin:0 0 8px}code{background:#0001;padding:1px 6px;border-radius:4px}</style><h1>页面 ${n}</h1><p>这是通过 <code>navigateToString()</code> 载入沙箱 WebFrame 的本地 HTML 内容。</p><p>${new Date().toLocaleString()}</p><button onclick="document.body.style.background='#e8f4ff'">在页面内运行脚本</button>`;
          wv.addEventListener('navigationstarting', (e) =>
            out(ex, `navigationstarting: ${(e as CustomEvent).detail.uri}`),
          );
          wv.addEventListener('navigationcompleted', (e) =>
            out(ex, `navigationcompleted: isSuccess = ${(e as CustomEvent).detail.isSuccess}`),
          );
          for (const b of ex.querySelectorAll<HTMLElement>('[data-p]'))
            b.addEventListener('click', () => wv.navigateToString(page(Number(b.dataset.p))));
          ex.querySelector('[data-reload]')!.addEventListener('click', () => wv.reload());
          wv.navigateToString(page(1));
        },
      },
    ],
  },
  {
    id: 'easing-functions',
    title: 'Easing functions',
    category: 'motion',
    icon: '',
    description:
      'Fluent 动效使用少量标准缓动曲线与时长：Decelerate（0,0,0,1，用于进入与大多数状态变化，即 ControlFastOutSlowInKeySpline）、Accelerate（1,0,1,1，用于退出）、Point to point（0.55,0.55,0,1，用于位置移动）、Standard 与 Linear（淡入淡出）。时长为 83 / 167 / 250 / 333 / 500 毫秒。点击曲线运行演示。',
    samples: [
      {
        title: '曲线与时长',
        html: html`<style>.ez-card:focus-visible { outline: 2px solid var(--w-focus-stroke-color-outer); outline-offset: 2px; }</style>
<div data-curves style="display:grid;grid-template-columns:repeat(auto-fill,minmax(200px,1fr));gap:12px;width:100%" data-stretch></div>`,
        options: html`<win-radio-group header="时长" data-opt="dur">
  <win-radio-button value="167">167 ms (Fast)</win-radio-button>
  <win-radio-button value="250">250 ms (Normal)</win-radio-button>
  <win-radio-button value="333" checked>333 ms (Slow)</win-radio-button>
  <win-radio-button value="500">500 ms (Slower)</win-radio-button>
</win-radio-group>`,
        setup(ex, opt) {
          let dur = 333;
          onChoice(opt, '[data-opt="dur"]', (v) => (dur = Number(v)));
          const curves: [string, string, [number, number, number, number]][] = [
            ['Decelerate', easings.decelerate, [0, 0, 0, 1]],
            ['Accelerate', easings.accelerate, [1, 0, 1, 1]],
            ['Point to point', easings.point, [0.55, 0.55, 0, 1]],
            ['Standard', easings.standard, [0.8, 0, 0.2, 1]],
            ['Linear', 'linear', [0, 0, 1, 1]],
          ];
          const host = ex.querySelector('[data-curves]')!;
          for (const [name, css, [x1, y1, x2, y2]] of curves) {
            const card = document.createElement('button');
            card.type = 'button';
            card.className = 'ez-card';
            card.style.cssText =
              'all:unset;box-sizing:border-box;display:flex;flex-direction:column;gap:8px;padding:12px;border-radius:8px;border:1px solid var(--w-card-stroke-color-default);background:var(--w-card-background-fill-color-secondary);cursor:default;user-select:none;-webkit-user-select:none';
            card.innerHTML = `<span class="w-body-strong">${name}</span><span class="w-caption w-text-secondary" style="font-family:var(--w-font-family-mono)">cubic-bezier(${x1}, ${y1}, ${x2}, ${y2})</span>
<svg viewBox="-6 -6 112 112" width="100%" height="120" style="overflow:visible"><rect x="0" y="0" width="100" height="100" fill="none" stroke="var(--w-divider-stroke-color-default)"/><line x1="0" y1="100" x2="${x1 * 100}" y2="${100 - y1 * 100}" stroke="var(--w-text-fill-color-tertiary)" stroke-dasharray="2 2"/><line x1="100" y1="0" x2="${x2 * 100}" y2="${100 - y2 * 100}" stroke="var(--w-text-fill-color-tertiary)" stroke-dasharray="2 2"/><path d="M0 100 C ${x1 * 100} ${100 - y1 * 100} ${x2 * 100} ${100 - y2 * 100} 100 0" fill="none" stroke="var(--w-accent-fill-color-default)" stroke-width="3" stroke-linecap="round"/></svg>
<span style="position:relative;height:20px;border-radius:10px;background:var(--w-subtle-fill-color-secondary)"><span data-ball style="position:absolute;left:2px;top:2px;width:16px;height:16px;border-radius:50%;background:var(--w-accent-fill-color-default)"></span></span>`;
            let atEnd = false;
            card.addEventListener('click', () => {
              const ball = card.querySelector<HTMLElement>('[data-ball]')!;
              const track = (ball.parentElement as HTMLElement).clientWidth - 20;
              const t = getComputedStyle(ball).transform;
              const x = t && t !== 'none' ? new DOMMatrixReadOnly(t).m41 : 0;
              atEnd = !atEnd;
              animate(
                ball,
                [{ transform: `translateX(${x}px)` }, { transform: `translateX(${atEnd ? track : 0}px)` }],
                {
                  duration: dur,
                  easing: css,
                  fill: 'forwards',
                },
              );
            });
            host.append(card);
          }
        },
      },
    ],
  },
  {
    id: 'theme-transitions',
    title: 'Theme transitions',
    category: 'motion',
    icon: '',
    description:
      '主题过渡是 Fluent 的标准动效：EntranceThemeTransition（错峰入场）、AddDeleteThemeTransition（增删项）、RepositionThemeTransition（重排位移）、ContentThemeTransition（内容替换）与 PopupThemeTransition（浮层弹出）。全部由 motion/animate.ts 提供，自动遵循“减少动画”设置。',
    samples: [
      {
        title: 'EntranceThemeTransition：错峰入场',
        html: html`<win-button data-run appearance="accent">重新播放</win-button>
<div data-grid style="display:grid;grid-template-columns:repeat(6,56px);gap:8px"></div>`,
        setup(ex) {
          const grid = ex.querySelector('[data-grid]')!;
          for (let i = 0; i < 18; i++) {
            grid.insertAdjacentHTML(
              'beforeend',
              `<div style="height:56px;border-radius:6px;background:hsl(${200 + i * 6},70%,${55 + (i % 3) * 6}%)"></div>`,
            );
          }
          const run = () => staggerIn(grid.children, { stagger: 28, distance: 36 });
          let token = 0;
          ex.querySelector('[data-run]')!.addEventListener('click', () => {
            const t = ++token;
            const outs = Array.from(grid.children, (el) => (opacityOf(el) > 0.01 ? fadeTo(el, 0) : null));
            void Promise.all(outs.map(settled)).then(() => {
              if (t === token) run();
            });
          });
          run();
        },
      },
      {
        title: 'AddDelete 与 Reposition：增删与重排',
        html: html`<div class="row"><win-button data-add icon="Add">添加</win-button><win-button data-remove icon="Remove">删除</win-button><win-button data-shuffle icon="Shuffle">打乱</win-button></div>
<div data-list style="display:flex;flex-wrap:wrap;gap:8px;max-width:460px;min-height:64px"></div>`,
        setup(ex) {
          const list = ex.querySelector<HTMLElement>('[data-list]')!;
          let n = 0;
          const make = () => {
            n++;
            const slot = document.createElement('div');
            slot.style.cssText = 'width:64px;height:64px';
            const face = document.createElement('div');
            face.textContent = String(n);
            face.style.cssText = `height:100%;border-radius:8px;display:grid;place-items:center;font:var(--w-type-subtitle);color:#fff;background:hsl(${(n * 47) % 360},60%,48%)`;
            slot.append(face);
            return slot;
          };
          for (let i = 0; i < 6; i++) list.append(make());
          const removing = new Set<HTMLElement>();
          const all = () => Array.from(list.children) as HTMLElement[];
          const live = () => all().filter((el) => !removing.has(el));
          ex.querySelector('[data-add]')!.addEventListener('click', () => {
            const items = live();
            if (items.length >= 24) return;
            const el = make();
            const before = items[Math.floor(Math.random() * (items.length + 1))] ?? null;
            flip(all(), () => list.insertBefore(el, before));
            itemAdded(el.firstElementChild!);
          });
          ex.querySelector('[data-remove]')!.addEventListener('click', () => {
            const items = live();
            const victim = items[Math.floor(Math.random() * items.length)];
            if (!victim) return;
            removing.add(victim);
            const face = victim.firstElementChild as HTMLElement;
            const busy = face.getAnimations().some((a) => a.playState === 'running');
            const out = busy
              ? animate(
                  face,
                  [
                    { opacity: opacityOf(face), transform: getComputedStyle(face).transform },
                    { opacity: 0, transform: 'scale(0.9)' },
                  ],
                  { duration: durations.fast, easing: easings.decelerate, fill: 'forwards' },
                )
              : itemRemoved(face);
            void settled(out).then(() => {
              removing.delete(victim);
              flip(
                all().filter((el) => el !== victim),
                () => victim.remove(),
              );
            });
          });
          ex.querySelector('[data-shuffle]')!.addEventListener('click', () => {
            flip(all(), () => {
              for (const el of live().sort(() => Math.random() - 0.5)) list.append(el);
            });
          });
        },
      },
      {
        title: 'ContentThemeTransition 与 PopupThemeTransition',
        html: html`<div class="row"><win-button data-swap>替换内容</win-button><win-button data-pop>弹出 / 关闭浮层</win-button></div>
<div class="row" style="gap:24px;align-items:flex-start">
  <div style="width:220px;min-height:88px;padding:16px;border-radius:8px;border:1px solid var(--w-card-stroke-color-default);background:var(--w-card-background-fill-color-default)"><div data-content></div></div>
  <div data-popup hidden class="w-acrylic" style="width:220px;padding:16px;border-radius:8px;border:1px solid var(--w-surface-stroke-color-flyout);box-shadow:var(--w-elevation-flyout)">PopupThemeTransition：从锚点方向滑入并淡入。</div>
</div>`,
        setup(ex) {
          const content = ex.querySelector<HTMLElement>('[data-content]')!;
          const msgs = [
            '第一段内容：ContentThemeTransition 让新内容轻轻上移并淡入。',
            '第二段内容：替换时旧内容立即让位，新内容进场。',
            '第三段内容：适合 Pivot、TabView 页面切换。',
          ];
          let i = 0;
          const show = () => {
            content.textContent = msgs[i % msgs.length]!;
            contentIn(content);
          };
          show();
          ex.querySelector('[data-swap]')!.addEventListener('click', () => {
            i++;
            show();
          });
          const pop = ex.querySelector<HTMLElement>('[data-popup]')!;
          let open = false;
          let token = 0;
          ex.querySelector('[data-pop]')!.addEventListener('click', () => {
            open = !open;
            const t = ++token;
            if (open) {
              const fresh = pop.hidden || opacityOf(pop) < 0.01;
              pop.hidden = false;
              if (fresh) popupIn(pop, 'right', 12);
              else fadeTo(pop, 1);
            } else {
              const out = opacityOf(pop) > 0.99 ? popupOut(pop) : fadeTo(pop, 0);
              void settled(out).then(() => {
                if (t === token && out.playState === 'finished') pop.hidden = true;
              });
            }
          });
        },
      },
    ],
  },
  {
    id: 'page-transitions',
    title: 'Page transitions',
    category: 'motion',
    icon: '',
    description:
      '页面转场指示页面之间的关系：Entrance（默认，向上滑入）、DrillIn（放大进入下一层级）、DrillOut（返回上一层级）、Slide（左右平移，用于同级页面，如 SelectorBar/TabView 切换）与 Suppress（无动画）。',
    samples: [
      {
        title: 'NavigationTransitionInfo',
        html: html`<div class="row" data-buttons></div>
<div style="position:relative;width:min(560px,100%);height:220px;border-radius:8px;overflow:hidden;border:1px solid var(--w-card-stroke-color-default);background:var(--w-layer-fill-color-default)" data-frame data-stretch></div>`,
        setup(ex) {
          const frame = ex.querySelector<HTMLElement>('[data-frame]')!;
          const btns = ex.querySelector('[data-buttons]')!;
          const kinds: [NavigationTransition, string][] = [
            ['entrance', 'Entrance'],
            ['drill-in', 'DrillIn'],
            ['drill-out', 'DrillOut'],
            ['slide-from-right', 'Slide → 右侧进入'],
            ['slide-from-left', 'Slide ← 左侧进入'],
            ['suppress', 'Suppress'],
          ];
          let n = 0;
          const go = (kind: NavigationTransition, label: string) => {
            n++;
            frame.innerHTML = `<div style="position:absolute;inset:0;padding:24px;display:flex;flex-direction:column;gap:8px;background:linear-gradient(135deg,hsl(${(n * 53) % 360},60%,60%),hsl(${(n * 53 + 60) % 360},60%,45%));color:#fff"><span style="font:var(--w-type-title)">页面 ${n}</span><span>${label}</span></div>`;
            navigateIn(frame.firstElementChild!, kind);
          };
          for (const [k, l] of kinds) {
            const b = document.createElement('win-button');
            b.textContent = l;
            b.addEventListener('click', () => go(k, l));
            btns.append(b);
          }
          go('entrance', 'Entrance');
        },
      },
    ],
  },
  {
    id: 'connected-animation',
    title: 'Connected animation',
    category: 'motion',
    icon: '',
    description:
      '连接动画让元素在两个视图之间“飞行”，保持视觉连续：点击列表中的卡片，图片飞到详情页的大图位置（Gravity 配置带有轻微下沉与阴影），详情页其余内容随之入场；返回时图片以 Direct 配置飞回原位，列表只轻微淡入，不会重播入场动画。飞行途中随时可以返回或改选，图片会从当前位置改道。',
    samples: [
      {
        title: '列表 → 详情',
        html: html`<style>
  .ca-stage { position: relative; display: grid; width: min(600px, 100%); user-select: none; -webkit-user-select: none; }
  .ca-view { grid-area: 1 / 1; align-self: start; min-width: 0; }
  .ca-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 12px; }
  .ca-tile { all: unset; cursor: default; display: flex; flex-direction: column; gap: 6px; border-radius: 8px; }
  .ca-tile:focus-visible { outline: 2px solid var(--w-focus-stroke-color-outer); outline-offset: 2px; }
  .ca-hero { display: block; aspect-ratio: 4 / 3; border-radius: 8px; }
  .ca-detail { display: flex; flex-direction: column; gap: 12px; }
  .ca-detail-hero { display: block; height: 180px; border-radius: 12px; }
</style>
<div class="ca-stage" data-stage data-stretch></div>`,
        setup(ex) {
          connectedAnimationDemo(ex.querySelector<HTMLElement>('[data-stage]')!);
        },
      },
    ],
  },
  {
    id: 'implicit-transitions',
    title: 'Implicit transitions',
    category: 'motion',
    icon: '',
    description:
      '隐式过渡在属性改变时自动产生动画（XAML 的 OpacityTransition、ScaleTransition、TranslationTransition、BrushTransition）。Web 上对应 CSS transition，时长与曲线取自 WinUI 令牌：BrushTransition 83ms 线性，其余默认 250–333ms Decelerate。',
    samples: [
      {
        title: '不透明度、缩放、平移与背景',
        html: html`<div class="row" style="gap:32px;align-items:center">
  <div data-box style="width:96px;height:96px;border-radius:8px;background:var(--w-accent-fill-color-default);transition:opacity var(--w-duration-slow) var(--w-ease-decelerate),scale var(--w-duration-slow) var(--w-ease-decelerate),translate var(--w-duration-slow) var(--w-ease-decelerate),background-color var(--w-duration-faster) linear"></div>
</div>`,
        options: html`<win-button data-op>Opacity</win-button>
<win-button data-sc>Scale</win-button>
<win-button data-tr>Translation</win-button>
<win-button data-bg>Background</win-button>`,
        setup(ex, opt) {
          const box = ex.querySelector<HTMLElement>('[data-box]')!;
          let op = false;
          let sc = false;
          let tr = false;
          let bg = false;
          opt?.querySelector('[data-op]')?.addEventListener('click', () => {
            op = !op;
            box.style.opacity = op ? '0.25' : '1';
          });
          opt?.querySelector('[data-sc]')?.addEventListener('click', () => {
            sc = !sc;
            box.style.scale = sc ? '1.4' : '1';
          });
          opt?.querySelector('[data-tr]')?.addEventListener('click', () => {
            tr = !tr;
            box.style.translate = tr ? '120px 0' : '0 0';
          });
          opt?.querySelector('[data-bg]')?.addEventListener('click', () => {
            bg = !bg;
            box.style.backgroundColor = bg ? 'var(--w-system-fill-color-success)' : '';
          });
          void durations;
        },
      },
    ],
  },
  {
    id: 'in-app-notification',
    title: 'InAppNotification',
    category: 'status-info',
    icon: '',
    tags: ['win-in-app-notification'],
    summary: '应用内横幅通知与 Windows 风格的 Toast 通知。',
    description:
      'InAppNotification 在应用内容之上显示临时通知卡片，支持定时/常驻、替换/前置/排队三种堆叠模式、关闭按钮与严重级别图标；showToast() 在窗口角落显示 Windows 11 样式的通知卡片，悬停或键盘聚焦时暂停自动关闭。多条通知叠成一摞（后方卡片略微缩小并露出边缘），点击通知堆或“+N 个通知”展开为列表；列表超出可用高度时可滚动（滚轮、拖动滚动条、触摸拖动或键盘聚焦），上下边缘渐隐模糊提示还有更多，不会溢出屏幕。',
    samples: [
      {
        title: '应用内通知与堆叠',
        description:
          '“前置”与“排队”模式下多条通知叠成一摞：点击通知堆展开为列表，按“收起”或 Esc 收起；关闭进度条会停在当前位置。连续点击“显示”也不会乱。',
        html: html`<div data-stretch style="position:relative;height:300px;border-radius:8px;border:1px dashed var(--w-control-strong-stroke-color-default);overflow:hidden;display:grid;place-items:center">
  <span class="w-text-secondary">应用内容区域</span>
  <win-in-app-notification data-ian show-progress stack-mode="stack-in-front"></win-in-app-notification>
</div>
<div class="row">
  <win-button appearance="accent" data-act="show">显示（4 秒）</win-button>
  <win-button data-act="sticky">常驻显示</win-button>
  <win-button data-act="burst">连续显示 5 条</win-button>
  <win-button data-act="dismiss">关闭最前面的</win-button>
  <win-button data-act="clear">全部关闭</win-button>
</div>
<div class="output" data-output></div>`,
        options: html`<div class="opt-title">严重级别</div>
<win-segmented data-opt="sev" selected-index="0" stretch>
  <win-segmented-item value="">无</win-segmented-item>
  <win-segmented-item value="informational" icon="&#xE946;" aria-label="信息"></win-segmented-item>
  <win-segmented-item value="success" icon="&#xE73E;" aria-label="成功"></win-segmented-item>
  <win-segmented-item value="warning" icon="&#xE7BA;" aria-label="警告"></win-segmented-item>
  <win-segmented-item value="error" icon="&#xEA39;" aria-label="错误"></win-segmented-item>
</win-segmented>
<div class="opt-title">堆叠模式</div>
<win-segmented data-opt="stack" selected-index="1" stretch>
  <win-segmented-item value="replace">替换</win-segmented-item>
  <win-segmented-item value="stack-in-front">前置</win-segmented-item>
  <win-segmented-item value="queue-behind">排队</win-segmented-item>
</win-segmented>
<div class="opt-title">位置</div>
<win-segmented data-opt="place" selected-index="0" stretch>
  <win-segmented-item value="bottom">底部</win-segmented-item>
  <win-segmented-item value="top">顶部</win-segmented-item>
</win-segmented>`,
        setup(ex, opt) {
          type IAN = HTMLElement & {
            show(c?: string, d?: number): void;
            dismiss(): void;
            dismissAll(): void;
            count: number;
            severity: string;
            stackMode: string;
            placement: string;
            header: string;
          };
          const ian = ex.querySelector('[data-ian]') as IAN;
          let n = 0;
          const report = (what: string) => out(ex, `${what}\u3000｜\u3000当前 ${ian.count} 条`);
          ex.querySelector('[data-act="show"]')!.addEventListener('click', () =>
            ian.show(`文件已保存（第 ${++n} 次）`, 4000),
          );
          ex.querySelector('[data-act="sticky"]')!.addEventListener('click', () =>
            ian.show(`有新的更新可用，重启应用后生效。（第 ${++n} 条）`, 0),
          );
          ex.querySelector('[data-act="burst"]')!.addEventListener('click', () => {
            for (const m of ['正在同步“文档”文件夹', '已上传 12 个文件', '“照片”已备份', '共享链接已复制', '同步完成'])
              ian.show(`${m}（第 ${++n} 条）`, 5000);
          });
          ex.querySelector('[data-act="dismiss"]')!.addEventListener('click', () => ian.dismiss());
          ex.querySelector('[data-act="clear"]')!.addEventListener('click', () => ian.dismissAll());
          ian.addEventListener('closed', (e) =>
            setTimeout(() => report(`已关闭（原因：${(e as CustomEvent).detail.reason}）`)),
          );
          ian.addEventListener('opened', () => setTimeout(() => report('已打开')));
          opt?.querySelector('[data-opt="sev"]')?.addEventListener('selectionchanged', (e) => {
            ian.severity = (e as CustomEvent).detail.value;
          });
          opt?.querySelector('[data-opt="stack"]')?.addEventListener('selectionchanged', (e) => {
            ian.stackMode = (e as CustomEvent).detail.value;
          });
          opt?.querySelector('[data-opt="place"]')?.addEventListener('selectionchanged', (e) => {
            ian.placement = (e as CustomEvent).detail.value;
          });
          return () => ian.dismissAll();
        },
      },
      {
        title: 'Toast 通知',
        description:
          '通知卡片从屏幕右下角滑入，新通知在最前面，旧通知退到后方；点击通知堆展开，过多时列表可滚动查看全部。悬停或键盘聚焦时暂停计时，按 Esc 或点击 ✕ 关闭。',
        html: html`<div class="row">
  <win-button data-toast="informational">信息</win-button>
  <win-button data-toast="success">成功</win-button>
  <win-button data-toast="warning">警告</win-button>
  <win-button data-toast="error">错误</win-button>
  <win-button appearance="accent" data-toast="actions">带操作按钮</win-button>
  <win-button data-toast="burst">连续 8 条</win-button>
</div>`,
        js: html`import { showToast } from 'winui';
showToast({
  title: '下载完成',
  message: 'WinUI-Gallery.zip（24.6 MB）',
  actions: [{ label: '打开', accent: true, onClick: open }, { label: '在文件夹中显示' }],
});`,
        setup(ex) {
          const texts: Record<string, [string, string]> = {
            informational: ['新消息', '张晨：今天下午三点的评审会改到线上。'],
            success: ['同步完成', '所有文件都已是最新版本。'],
            warning: ['电池电量低', '剩余 15%。请连接电源。'],
            error: ['上传失败', '网络连接已中断，请稍后重试。'],
          };
          const kinds = Object.keys(texts) as Severity[];
          let n = 0;
          for (const b of ex.querySelectorAll<HTMLElement>('[data-toast]')) {
            b.addEventListener('click', () => {
              const kind = b.dataset.toast!;
              if (kind === 'burst') {
                for (let i = 0; i < 8; i++) {
                  const sev = kinds[i % kinds.length]!;
                  const [title, message] = texts[sev]!;
                  showToast({
                    appName: 'WinUI 3 Gallery',
                    severity: sev,
                    title: `${title}（${++n}）`,
                    message,
                    duration: 8000,
                  });
                }
                return;
              }
              if (kind === 'actions') {
                showToast({
                  appName: 'WinUI 3 Gallery',
                  title: '下载完成',
                  message: 'WinUI-Gallery.zip（24.6 MB）',
                  actions: [{ label: '打开', accent: true }, { label: '在文件夹中显示' }],
                  duration: 8000,
                });
                return;
              }
              const [title, message] = texts[kind]!;
              showToast({ appName: 'WinUI 3 Gallery', severity: kind as Severity, title, message });
            });
          }
        },
      },
    ],
  },
  {
    id: 'shimmer',
    title: 'Shimmer',
    category: 'status-info',
    icon: '',
    tags: ['win-shimmer', 'win-skeleton', 'win-shimmer-loader'],
    summary: '加载中的骨架占位与微光动画。',
    description: `Shimmer 在内容加载时显示带有扫光动画的占位块，让界面在等待期间保持稳定的布局；Skeleton 提供文本行、圆形头像、矩形等常用组合；ShimmerLoader 在加载完成时把占位交叉淡化为真实内容（增强）。启用“减少动画”时扫光静止。`,
    samples: [
      {
        title: '加载完成后过渡到真实内容',
        description:
          '<win-shimmer-loader> 在 loading 时显示 slot="placeholder" 中的骨架；加载完成后骨架淡出、真实内容淡入并上移到位，高度同步过渡。切换进行中再次切换会从当前状态平滑反向。',
        html: html`<win-shimmer-loader data-sp loading data-stretch style="max-width:520px">
  <div slot="placeholder" data-skeleton style="display:flex;flex-direction:column;gap:14px"></div>
  <div data-list style="display:flex;flex-direction:column;gap:14px"></div>
</win-shimmer-loader>
<div class="row"><win-button appearance="accent" data-act="reload">重新加载</win-button><span class="output" data-output></span></div>`,
        options: html`<win-toggle-switch data-opt="loading" header="loading（手动切换）"></win-toggle-switch>`,
        js: html`const sp = document.querySelector('win-shimmer-loader');
sp.loading = true;              // skeleton (slot="placeholder") with shimmer
list.replaceChildren(...rows(await fetchContacts()));
sp.loading = false;             // skeleton fades out, content rises in`,
        setup(ex, opt) {
          const sp = ex.querySelector<HTMLElement & { loading: boolean }>('[data-sp]')!;
          const list = ex.querySelector<HTMLElement>('[data-list]')!;
          const manual = opt?.querySelector<HTMLElement & { checked: boolean }>('[data-opt="loading"]') ?? null;
          const row = (inner: string) => `<div style="display:flex;gap:12px;align-items:center">${inner}</div>`;
          ex.querySelector<HTMLElement>('[data-skeleton]')!.innerHTML = Array.from({ length: 3 }, () =>
            row(
              '<win-shimmer circle style="width:40px;height:40px;flex:none"></win-shimmer><div style="flex:1;display:flex;flex-direction:column;gap:8px"><win-shimmer style="width:40%;height:14px"></win-shimmer><win-shimmer style="width:85%;height:12px"></win-shimmer></div>',
            ),
          ).join('');
          let seed = 21;
          let timer = 0;
          const setLoading = (v: boolean) => {
            sp.loading = v;
            if (manual) manual.checked = v;
          };
          const render = () => {
            seed += 7;
            const ppl = people(2 + (seed % 3), seed);
            list.innerHTML = ppl
              .map((p) =>
                row(
                  `<win-person-picture display-name="${String(p.name)}" style="width:40px;height:40px"></win-person-picture><div><div class="w-body-strong">${String(p.name)}</div><div class="w-caption w-text-secondary">${String(p.dept)} · ${String(p.title)} · ${String(p.city)}</div></div>`,
                ),
              )
              .join('');
            return ppl.length;
          };
          const load = () => {
            clearTimeout(timer);
            setLoading(true);
            out(ex, '正在加载…');
            const t0 = performance.now();
            timer = window.setTimeout(
              () => {
                const n = render();
                setLoading(false);
                out(ex, `已加载 ${n} 位联系人（${((performance.now() - t0) / 1000).toFixed(1)} 秒）`);
              },
              900 + Math.round(Math.random() * 700),
            );
          };
          ex.querySelector('[data-act="reload"]')!.addEventListener('click', load);
          manual?.addEventListener('change', () => {
            clearTimeout(timer);
            if (!manual.checked && !list.childElementCount) render();
            sp.loading = manual.checked;
            out(ex, manual.checked ? '加载中（手动）' : '已显示内容');
          });
          load();
          return () => clearTimeout(timer);
        },
      },
      {
        title: 'Skeleton 形状',
        html: html`<div class="row" style="align-items:flex-start;gap:32px" data-stretch>
  <win-skeleton shape="text" lines="4" style="width:240px"></win-skeleton>
  <win-skeleton shape="avatar-text" style="width:260px"></win-skeleton>
  <win-skeleton shape="rect" height="120px" style="width:200px"></win-skeleton>
  <win-skeleton shape="circle" size="64"></win-skeleton>
</div>`,
      },
    ],
  },
  {
    id: 'radial-gauge',
    title: 'RadialGauge',
    category: 'status-info',
    icon: '',
    tags: ['win-radial-gauge'],
    summary: '仪表盘式的数值显示与输入。',
    description: `RadialGauge 以 300° 弧形刻度显示数值：灰色刻度轨道、强调色数值轨迹、指针与中心数字。数值变化时平滑过渡（增强）；设置 is-interactive 后可拖动指针或用方向键调整（role=slider）。`,
    samples: [
      {
        title: '只读仪表',
        html: html`<div class="row" style="gap:24px">
  <win-radial-gauge value="42" unit="CPU %" label="CPU"></win-radial-gauge>
  <win-radial-gauge value="88" maximum="240" tick-spacing="20" unit="km/h" label="速度"></win-radial-gauge>
  <win-radial-gauge value="36.6" minimum="30" maximum="45" tick-spacing="1" decimals="1" unit="°C" label="温度"></win-radial-gauge>
</div>
<win-button data-act>随机数值</win-button>`,
        setup(ex) {
          ex.querySelector('[data-act]')!.addEventListener('click', () => {
            for (const g of ex.querySelectorAll<HTMLElement & { minimum: number; maximum: number; value: number }>(
              'win-radial-gauge',
            )) {
              g.value = g.minimum + Math.random() * (g.maximum - g.minimum);
            }
          });
        },
      },
      {
        title: '可交互（拖动或方向键）',
        html: html`<win-radial-gauge is-interactive value="60" step-size="5" unit="音量" label="音量" data-g style="width:220px"></win-radial-gauge>
<div class="output" data-output>60</div>`,
        setup(ex) {
          const g = ex.querySelector<HTMLElement & { value: number }>('[data-g]')!;
          g.addEventListener('valuechanged', () => out(ex, String(Math.round(g.value))));
        },
      },
    ],
  },
  {
    id: 'image-cropper',
    title: 'ImageCropper',
    category: 'media',
    icon: '',
    tags: ['win-image-cropper'],
    summary: '交互式图像裁剪，支持比例锁定与圆形裁剪。',
    description: `ImageCropper 让用户拖动角点/边缘手柄或整个区域来选择裁剪范围，区域外以半透明遮罩变暗；支持固定宽高比、圆形裁剪、只显示角点手柄、键盘微调（方向键 1px，Shift 10px），并可通过 getCroppedCanvas() 导出结果。`,
    samples: [
      {
        title: '裁剪图片',
        html: html`<win-image-cropper data-crop data-stretch style="height:340px"></win-image-cropper>
<div class="row"><win-button appearance="accent" data-act="crop">裁剪</win-button><win-button data-act="reset">重置</win-button><span class="output" data-output></span></div>
<div data-result></div>`,
        options: html`<div class="opt-title">宽高比</div>
<win-segmented data-opt="ratio" selected-index="0" stretch>
  <win-segmented-item value="">自由</win-segmented-item>
  <win-segmented-item value="1:1">1:1</win-segmented-item>
  <win-segmented-item value="16:9">16:9</win-segmented-item>
  <win-segmented-item value="4:3">4:3</win-segmented-item>
</win-segmented>
<win-check-box data-opt="circle">圆形裁剪</win-check-box>
<win-check-box data-opt="corners">仅显示角点手柄</win-check-box>`,
        setup(ex, opt) {
          type Cropper = HTMLElement & {
            src: string;
            aspectRatio: string;
            cropShape: string;
            thumbPlacement: string;
            reset(): void;
            getCroppedCanvas(m?: number): HTMLCanvasElement;
            cropRect: { width: number; height: number };
          };
          const c = ex.querySelector('[data-crop]') as Cropper;
          c.src = demoPicture();
          c.addEventListener('cropchanged', () =>
            out(ex, `${Math.round(c.cropRect.width)} × ${Math.round(c.cropRect.height)} 像素`),
          );
          ex.querySelector('[data-act="crop"]')!.addEventListener('click', () => {
            const canvas = c.getCroppedCanvas(240);
            canvas.style.cssText = 'max-width:240px;border-radius:8px;box-shadow:var(--w-elevation-card)';
            const res = ex.querySelector('[data-result]')!;
            res.replaceChildren(canvas);
          });
          ex.querySelector('[data-act="reset"]')!.addEventListener('click', () => c.reset());
          opt
            ?.querySelector('[data-opt="ratio"]')
            ?.addEventListener('selectionchanged', (e) => (c.aspectRatio = (e as CustomEvent).detail.value));
          opt
            ?.querySelector('[data-opt="circle"]')
            ?.addEventListener(
              'change',
              (e) => (c.cropShape = (e.currentTarget as HTMLInputElement).checked ? 'circular' : 'rectangular'),
            );
          opt
            ?.querySelector('[data-opt="corners"]')
            ?.addEventListener(
              'change',
              (e) => (c.thumbPlacement = (e.currentTarget as HTMLInputElement).checked ? 'corners' : 'all'),
            );
        },
      },
    ],
  },
];

export default pages;
