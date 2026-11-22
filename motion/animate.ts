import { durations, easings, prefersReducedMotion } from '../theme/theme.ts';

export { durations, easings };

export type Side = 'top' | 'bottom' | 'left' | 'right';

export function motionEnabled(): boolean {
  return !prefersReducedMotion();
}

interface Tracked {
  anim: Animation;
  props: Set<string>;
}
const tracked = new WeakMap<Element, Tracked[]>();
const NON_PROPS = new Set(['offset', 'easing', 'composite', 'computedOffset']);

function animatedProps(keyframes: Keyframe[] | PropertyIndexedKeyframes): Set<string> {
  const out = new Set<string>();
  const frames = Array.isArray(keyframes) ? keyframes : [keyframes];
  for (const f of frames) for (const k of Object.keys(f)) if (!NON_PROPS.has(k)) out.add(k);
  return out;
}

export function animate(
  el: Element,
  keyframes: Keyframe[] | PropertyIndexedKeyframes,
  opts: KeyframeAnimationOptions,
): Animation {
  const o: KeyframeAnimationOptions = { fill: 'none', ...opts };
  if (!motionEnabled()) {
    o.duration = 0;
    o.delay = 0;
  }
  const props = animatedProps(keyframes);
  const list = tracked.get(el) ?? [];
  const keep: Tracked[] = [];
  for (const t of list) {
    let overlaps = false;
    for (const p of t.props) if (props.has(p)) overlaps = true;
    if (overlaps) {
      t.anim.cancel();
      continue;
    }
    const fill = t.anim.effect?.getTiming().fill;
    const persists = fill === 'forwards' || fill === 'both';
    if (t.anim.playState === 'idle' || (t.anim.playState === 'finished' && !persists)) continue;
    keep.push(t);
  }
  const anim = el.animate(keyframes, o);
  keep.push({ anim, props });
  tracked.set(el, keep);
  return anim;
}

export function settled(a: Animation | null | undefined): Promise<void> {
  if (!a) return Promise.resolve();
  return a.finished.then(
    () => undefined,
    () => undefined,
  );
}

export function cancelAnimations(el: Element): void {
  for (const a of el.getAnimations()) a.cancel();
}

function isLive(el: Element, prop: string): boolean {
  for (const t of tracked.get(el) ?? []) {
    if (!t.props.has(prop)) continue;
    const st = t.anim.playState;
    if (st === 'running' || st === 'paused') return true;
    if (st === 'finished') {
      const fill = t.anim.effect?.getTiming().fill;
      if (fill === 'forwards' || fill === 'both') return true;
    }
  }
  return false;
}

function currentOpacity(el: Element): number {
  const v = Number.parseFloat(getComputedStyle(el).opacity);
  return Number.isNaN(v) ? 1 : v;
}

function currentTransform(el: Element): string {
  const t = getComputedStyle(el).transform;
  return !t || t === 'none' ? 'none' : t;
}

const enterFrom = {
  opacity: (el: Element, from: number): number => (isLive(el, 'opacity') ? currentOpacity(el) : from),
  transform: (el: Element, from: string): string => (isLive(el, 'transform') ? currentTransform(el) : from),
};

export function fadeIn(el: Element, duration: number = durations.faster, delay = 0): Animation {
  return animate(el, [{ opacity: enterFrom.opacity(el, 0) }, { opacity: 1 }], {
    duration,
    delay,
    easing: easings.linear,
    fill: 'backwards',
  });
}

export function fadeOut(el: Element, duration: number = durations.faster): Animation {
  return animate(el, [{ opacity: currentOpacity(el) }, { opacity: 0 }], {
    duration,
    easing: easings.linear,
    fill: 'forwards',
  });
}

const offsetFor = (side: Side, d: number): string => {
  switch (side) {
    case 'top':
      return `translateY(${-d}px)`;
    case 'bottom':
      return `translateY(${d}px)`;
    case 'left':
      return `translateX(${-d}px)`;
    case 'right':
      return `translateX(${d}px)`;
  }
};

export function slideIn(
  el: Element,
  from: Side,
  distance = 24,
  duration: number = durations.normal,
  delay = 0,
): Animation {
  fadeIn(el, Math.min(duration, durations.fast), delay);
  return animate(el, [{ transform: enterFrom.transform(el, offsetFor(from, distance)) }, { transform: 'none' }], {
    duration,
    delay,
    easing: easings.decelerate,
    fill: 'backwards',
  });
}

export function slideOut(el: Element, to: Side, distance = 24, duration: number = durations.fast): Animation {
  return animate(
    el,
    [
      { transform: currentTransform(el), opacity: currentOpacity(el) },
      { transform: offsetFor(to, distance), opacity: 0 },
    ],
    { duration, easing: easings.decelerate, fill: 'forwards' },
  );
}

export function popupIn(el: Element, side: Side | 'none' = 'bottom', distance = 8): Animation {
  fadeIn(el, durations.faster);
  if (side === 'none') {
    return animate(el, [{ transform: enterFrom.transform(el, 'scale(0.96)') }, { transform: 'none' }], {
      duration: durations.normal,
      easing: easings.decelerate,
    });
  }
  const from: Side = side === 'bottom' ? 'top' : side === 'top' ? 'bottom' : side === 'left' ? 'right' : 'left';
  return animate(el, [{ transform: enterFrom.transform(el, offsetFor(from, distance)) }, { transform: 'none' }], {
    duration: durations.normal,
    easing: easings.decelerate,
  });
}

export function popupOut(el: Element): Animation {
  return animate(el, [{ opacity: currentOpacity(el) }, { opacity: 0 }], {
    duration: durations.faster,
    easing: easings.linear,
    fill: 'forwards',
  });
}

export function menuIn(surface: HTMLElement, side: Side, _content?: HTMLElement | null): Animation {
  const ext = 48;
  const h = surface.offsetHeight || 200;
  const w = surface.offsetWidth || 200;
  const dy = Math.round(Math.min(h * 0.4, 72));
  const dx = Math.round(Math.min(w * 0.3, 48));
  const e = `-${ext}px`;
  let fromT: string;
  let fromClip: string;
  let toClip: string;
  switch (side) {
    case 'top':
      fromT = `translateY(${dy}px)`;
      fromClip = `inset(${e} ${e} ${dy}px ${e})`;
      toClip = `inset(${e} ${e} 0px ${e})`;
      break;
    case 'left':
      fromT = `translateX(${dx}px)`;
      fromClip = `inset(${e} ${dx}px ${e} ${e})`;
      toClip = `inset(${e} 0px ${e} ${e})`;
      break;
    case 'right':
      fromT = `translateX(${-dx}px)`;
      fromClip = `inset(${e} ${e} ${e} ${dx}px)`;
      toClip = `inset(${e} ${e} ${e} 0px)`;
      break;
    default:
      fromT = `translateY(${-dy}px)`;
      fromClip = `inset(${dy}px ${e} ${e} ${e})`;
      toClip = `inset(0px ${e} ${e} ${e})`;
  }
  fadeIn(surface, durations.faster);
  return animate(
    surface,
    [
      { transform: fromT, clipPath: fromClip },
      { transform: 'none', clipPath: toClip },
    ],
    { duration: durations.normal, easing: easings.decelerate },
  );
}

export function splitOpen(surface: HTMLElement, bandTop: number, bandHeight: number): Animation {
  const h = surface.offsetHeight || 1;
  const top = Math.max(0, bandTop);
  const bottom = Math.max(0, h - bandTop - bandHeight);
  fadeIn(surface, durations.faster);
  return animate(
    surface,
    [{ clipPath: `inset(${top}px -48px ${bottom}px -48px)` }, { clipPath: 'inset(-48px -48px -48px -48px)' }],
    { duration: durations.normal, easing: easings.decelerate },
  );
}

export function dialogIn(el: Element): Animation {
  fadeIn(el, durations.faster);
  return animate(el, [{ transform: enterFrom.transform(el, 'scale(1.05)') }, { transform: 'none' }], {
    duration: durations.normal,
    easing: easings.decelerate,
  });
}

export function dialogOut(el: Element): Animation {
  animate(el, [{ opacity: currentOpacity(el) }, { opacity: 0 }], {
    duration: durations.faster,
    easing: easings.linear,
    fill: 'forwards',
  });
  return animate(el, [{ transform: currentTransform(el) }, { transform: 'scale(1.05)' }], {
    duration: durations.fast,
    easing: easings.decelerate,
    fill: 'forwards',
  });
}

export function expandHeight(el: HTMLElement, duration: number = durations.normal): Animation {
  const live = isLive(el, 'height');
  const from = live ? el.getBoundingClientRect().height : 0;
  const fromOpacity = live ? Number(getComputedStyle(el).opacity) || 0 : 0;
  el.style.overflow = 'clip';
  const h = el.scrollHeight;
  const a = animate(
    el,
    [
      { height: `${from}px`, opacity: from > 0 ? fromOpacity : 0 },
      { height: `${h}px`, opacity: 1 },
    ],
    { duration, easing: easings.decelerate },
  );
  void settled(a).then(() => {
    if (a.playState === 'finished') el.style.overflow = '';
  });
  return a;
}

export function collapseHeight(el: HTMLElement, duration: number = durations.fast + 33): Animation {
  const h = el.getBoundingClientRect().height;
  const fromOpacity = Number(getComputedStyle(el).opacity);
  el.style.overflow = 'clip';
  const a = animate(
    el,
    [
      { height: `${h}px`, opacity: Number.isNaN(fromOpacity) ? 1 : fromOpacity },
      { height: '0px', opacity: 0 },
    ],
    { duration, easing: easings.decelerate, fill: 'forwards' },
  );
  void settled(a).then(() => {
    if (a.playState === 'finished') el.style.overflow = '';
  });
  return a;
}

export function staggerIn(
  elements: Iterable<Element>,
  opts: { from?: Side; distance?: number; stagger?: number; duration?: number; max?: number } = {},
): Animation[] {
  const { from = 'bottom', distance = 28, stagger = 24, duration = durations.slow, max = 12 } = opts;
  const out: Animation[] = [];
  let i = 0;
  for (const el of elements) {
    const delay = Math.min(i, max) * stagger;
    out.push(slideIn(el, from, distance, duration, delay));
    i++;
  }
  return out;
}

export function flip(
  elements: Iterable<HTMLElement>,
  mutate: () => void,
  duration: number = durations.normal,
): Animation[] {
  const list = Array.from(elements);
  const first = new Map(list.map((el) => [el, el.getBoundingClientRect()]));
  mutate();
  const out: Animation[] = [];
  for (const el of list) {
    if (!el.isConnected) continue;
    const a = first.get(el)!;
    const b = el.getBoundingClientRect();
    const dx = a.left - b.left;
    const dy = a.top - b.top;
    if (Math.abs(dx) < 0.5 && Math.abs(dy) < 0.5) continue;
    out.push(
      animate(el, [{ transform: `translate(${dx}px, ${dy}px)` }, { transform: 'none' }], {
        duration,
        easing: easings.point,
      }),
    );
  }
  return out;
}

export function itemAdded(el: Element): Animation {
  return animate(
    el,
    [
      { opacity: enterFrom.opacity(el, 0), transform: enterFrom.transform(el, 'scale(0.9)') },
      { opacity: 1, transform: 'none' },
    ],
    { duration: durations.normal, easing: easings.decelerate },
  );
}

export function itemRemoved(el: Element): Animation {
  return animate(
    el,
    [
      { opacity: currentOpacity(el), transform: currentTransform(el) },
      { opacity: 0, transform: 'scale(0.9)' },
    ],
    { duration: durations.fast, easing: easings.decelerate, fill: 'forwards' },
  );
}

export function contentIn(el: Element, from: Side = 'bottom', distance = 12): Animation {
  return slideIn(el, from, distance, durations.slow);
}

export type NavigationTransition =
  'entrance' | 'drill-in' | 'drill-out' | 'slide-from-right' | 'slide-from-left' | 'suppress';

export function navigateIn(el: Element, kind: NavigationTransition = 'entrance'): Animation | null {
  switch (kind) {
    case 'entrance':
      fadeIn(el, durations.fast);
      return animate(el, [{ transform: 'translateY(56px)' }, { transform: 'none' }], {
        duration: durations.slow + 67,
        easing: easings.decelerate,
      });
    case 'drill-in':
      fadeIn(el, durations.fast);
      return animate(el, [{ transform: 'scale(0.94)' }, { transform: 'none' }], {
        duration: durations.slow + 67,
        easing: easings.decelerate,
      });
    case 'drill-out':
      fadeIn(el, durations.fast);
      return animate(el, [{ transform: 'scale(1.06)' }, { transform: 'none' }], {
        duration: durations.slow,
        easing: easings.decelerate,
      });
    case 'slide-from-right':
      fadeIn(el, durations.fast);
      return animate(el, [{ transform: 'translateX(48px)' }, { transform: 'none' }], {
        duration: durations.slow,
        easing: easings.decelerate,
      });
    case 'slide-from-left':
      fadeIn(el, durations.fast);
      return animate(el, [{ transform: 'translateX(-48px)' }, { transform: 'none' }], {
        duration: durations.slow,
        easing: easings.decelerate,
      });
    case 'suppress':
      return null;
  }
}

export type ConnectedAnimationHandle = Promise<void> & { cancel(): void };

interface Flight {
  ghost: HTMLElement;
  stop(): void;
}
const flights = new WeakMap<Element, Flight>();

export function connectedAnimation(
  from: HTMLElement,
  to: HTMLElement,
  configuration: 'gravity' | 'direct' | 'basic' = 'gravity',
): ConnectedAnimationHandle {
  let resolve!: () => void;
  const done = new Promise<void>((r) => (resolve = r)) as ConnectedAnimationHandle;
  done.cancel = () => resolve();

  const prev = flights.get(from) ?? flights.get(to);
  const a = prev ? prev.ghost.getBoundingClientRect() : from.getBoundingClientRect();
  const fromRadius = getComputedStyle(prev ? prev.ghost : from).borderRadius;
  prev?.stop();
  const b = to.getBoundingClientRect();
  if (!motionEnabled() || a.width === 0 || b.width === 0) {
    resolve();
    return done;
  }

  const ghost = from.cloneNode(true) as HTMLElement;
  ghost.removeAttribute('id');
  ghost.style.removeProperty('opacity');
  Object.assign(ghost.style, {
    position: 'fixed',
    left: '0',
    top: '0',
    margin: '0',
    zIndex: '2147483646',
    pointerEvents: 'none',
    boxSizing: 'border-box',
    overflow: 'hidden',
    transform: 'none',
  } satisfies Partial<CSSStyleDeclaration>);
  document.body.append(ghost);

  const box = (r: DOMRect, extra: Keyframe = {}): Keyframe => ({
    left: `${r.left}px`,
    top: `${r.top}px`,
    width: `${r.width}px`,
    height: `${r.height}px`,
    ...extra,
  });
  const toRadius = getComputedStyle(to).borderRadius;
  const frames: Keyframe[] =
    configuration === 'gravity'
      ? [
          box(a, { borderRadius: fromRadius, filter: 'drop-shadow(0 0 0 transparent)' }),
          {
            offset: 0.5,
            left: `${(a.left + b.left) / 2}px`,
            top: `${(a.top + b.top) / 2 + 12}px`,
            width: `${(a.width + b.width) / 2}px`,
            height: `${(a.height + b.height) / 2}px`,
            filter: 'drop-shadow(0 12px 18px rgba(0,0,0,0.22))',
          },
          box(b, { borderRadius: toRadius, filter: 'drop-shadow(0 0 0 transparent)' }),
        ]
      : [box(a, { borderRadius: fromRadius }), box(b, { borderRadius: toRadius })];

  const hadOpacity = to.style.opacity;
  to.style.opacity = '0';
  const anim = animate(ghost, frames, {
    duration: configuration === 'direct' ? durations.normal : durations.slow + 67,
    easing: configuration === 'basic' ? easings.standard : easings.decelerate,
    fill: 'forwards',
  });

  let ended = false;
  const release = () => {
    if (flights.get(from) === flight) flights.delete(from);
    if (flights.get(to) === flight) flights.delete(to);
    to.style.opacity = hadOpacity;
  };
  const flight: Flight = {
    ghost,
    stop: () => {
      if (ended) return;
      ended = true;
      anim.cancel();
      ghost.remove();
      release();
      resolve();
    },
  };
  flights.set(from, flight);
  flights.set(to, flight);
  done.cancel = flight.stop;

  void anim.finished.then(
    () => {
      if (ended) return;
      ended = true;
      release();
      const out = ghost.animate([{ opacity: 1 }, { opacity: 0 }], {
        duration: durations.fast,
        easing: easings.linear,
        fill: 'forwards',
      });
      void settled(out).then(() => ghost.remove());
      resolve();
    },
    () => undefined,
  );
  return done;
}

export function pulse(el: Element, scale = 1.2): Animation {
  return animate(
    el,
    [{ transform: 'scale(1)' }, { transform: `scale(${scale})`, offset: 0.4 }, { transform: 'scale(1)' }],
    { duration: durations.slow, easing: easings.standard },
  );
}

export function shake(el: Element, distance = 4): Animation {
  return animate(
    el,
    [
      { transform: 'none' },
      { transform: `translateX(${-distance}px)` },
      { transform: `translateX(${distance}px)` },
      { transform: `translateX(${-distance / 2}px)` },
      { transform: 'none' },
    ],
    { duration: durations.slow, easing: easings.standard },
  );
}
