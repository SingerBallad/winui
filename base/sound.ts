export type ElementSoundKind = 'focus' | 'invoke' | 'show' | 'hide' | 'move-next' | 'move-previous' | 'go-back';
export type ElementSoundState = 'off' | 'on';

let ctx: AudioContext | null = null;
let state: ElementSoundState = 'off';
let volume = 0.5;
let installed = false;

interface Tone {
  f0: number;
  f1: number;
  dur: number;
  delay?: number;
  type?: OscillatorType;
  gain?: number;
}

const SOUNDS: Record<ElementSoundKind, Tone[]> = {
  focus: [{ f0: 1650, f1: 1650, dur: 0.018, type: 'sine', gain: 0.18 }],
  invoke: [
    { f0: 880, f1: 940, dur: 0.035, type: 'triangle', gain: 0.32 },
    { f0: 1320, f1: 1380, dur: 0.05, delay: 0.03, type: 'sine', gain: 0.22 },
  ],
  show: [{ f0: 520, f1: 860, dur: 0.09, type: 'sine', gain: 0.22 }],
  hide: [{ f0: 860, f1: 520, dur: 0.08, type: 'sine', gain: 0.18 }],
  'move-next': [{ f0: 1100, f1: 1250, dur: 0.03, type: 'sine', gain: 0.18 }],
  'move-previous': [{ f0: 1250, f1: 1100, dur: 0.03, type: 'sine', gain: 0.18 }],
  'go-back': [
    { f0: 990, f1: 880, dur: 0.04, type: 'triangle', gain: 0.25 },
    { f0: 740, f1: 660, dur: 0.06, delay: 0.035, type: 'sine', gain: 0.2 },
  ],
};

function audio(): AudioContext | null {
  if (ctx) return ctx;
  const Ctor = (globalThis as { AudioContext?: typeof AudioContext }).AudioContext;
  if (!Ctor) return null;
  ctx = new Ctor();
  return ctx;
}

export const ElementSoundPlayer = {
  get state(): ElementSoundState {
    return state;
  },
  set state(s: ElementSoundState) {
    state = s;
    if (s === 'on') {
      installElementSounds();
      void audio()?.resume();
    }
  },
  get volume(): number {
    return volume;
  },
  set volume(v: number) {
    volume = Math.min(1, Math.max(0, v));
  },
  play(kind: ElementSoundKind): void {
    if (state !== 'on' || volume <= 0) return;
    const a = audio();
    if (!a) return;
    if (a.state === 'suspended') void a.resume();
    const now = a.currentTime;
    for (const t of SOUNDS[kind]) {
      const osc = a.createOscillator();
      const g = a.createGain();
      const start = now + (t.delay ?? 0);
      osc.type = t.type ?? 'sine';
      osc.frequency.setValueAtTime(t.f0, start);
      osc.frequency.exponentialRampToValueAtTime(Math.max(1, t.f1), start + t.dur);
      const peak = (t.gain ?? 0.2) * volume * 0.5;
      g.gain.setValueAtTime(0.0001, start);
      g.gain.exponentialRampToValueAtTime(peak, start + Math.min(0.006, t.dur / 3));
      g.gain.exponentialRampToValueAtTime(0.0001, start + t.dur);
      osc.connect(g).connect(a.destination);
      osc.start(start);
      osc.stop(start + t.dur + 0.02);
    }
  },
};

const INVOKE_ROLES = new Set([
  'button',
  'menuitem',
  'menuitemcheckbox',
  'menuitemradio',
  'checkbox',
  'switch',
  'radio',
  'tab',
  'option',
  'link',
  'treeitem',
]);

export function installElementSounds(): void {
  if (installed || typeof document === 'undefined') return;
  installed = true;
  document.addEventListener(
    'click',
    (ev) => {
      if (state !== 'on') return;
      for (const n of ev.composedPath()) {
        if (!(n instanceof HTMLElement)) continue;
        const role = n.getAttribute('role') ?? '';
        if (n.localName.startsWith('win-') && (INVOKE_ROLES.has(role) || n.localName.endsWith('button'))) {
          const back = n.getAttribute('aria-label')?.toLowerCase().includes('back') || n.id === 'back';
          ElementSoundPlayer.play(back ? 'go-back' : 'invoke');
          return;
        }
      }
    },
    true,
  );
  document.addEventListener(
    'focusin',
    (ev) => {
      if (state !== 'on') return;
      const t = ev.composedPath()[0];
      if (t instanceof HTMLElement && t.matches(':focus-visible')) ElementSoundPlayer.play('focus');
    },
    true,
  );
}
