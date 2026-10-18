// Follow-along extras for the workout player: voice coach, an original background beat, and confetti.
// Everything is generated in the browser (Web Speech + Web Audio), so it works offline and needs no music files.

const pref = (key, def) => { try { const v = localStorage.getItem(key); return v === null ? def : v === '1'; } catch { return def; } };
const setPref = (key, v) => { try { localStorage.setItem(key, v ? '1' : '0'); } catch { /* ignore */ } };

// ---------- Voice coach ----------
export const voice = {
  get on() { return pref('wa-voice', true) && 'speechSynthesis' in window; },
  set on(v) { setPref('wa-voice', v); if (!v) this.stop(); },
  pick() {
    const list = window.speechSynthesis?.getVoices() || [];
    return list.find((x) => /en-IN/i.test(x.lang) && /female|veena|heera|neerja/i.test(x.name))
      || list.find((x) => /en-IN/i.test(x.lang)) || list.find((x) => /female|samantha|zira|google uk english female/i.test(x.name)) || list.find((x) => /^en/i.test(x.lang));
  },
  say(text, { interrupt = true } = {}) {
    if (!this.on) return;
    try {
      if (interrupt) window.speechSynthesis.cancel();
      const u = new SpeechSynthesisUtterance(text);
      const v = this.pick(); if (v) u.voice = v;
      u.rate = 1.05; u.pitch = 1.1; u.volume = 1;
      window.speechSynthesis.speak(u);
    } catch { /* speech not available */ }
  },
  stop() { try { window.speechSynthesis?.cancel(); } catch { /* ignore */ } },
};

export const CHEERS = ["You've got this!", 'Keep breathing!', 'Strong and steady!', 'Push a little more!', 'Looking great!', 'Stay with me!', 'Every rep counts!', 'Nice form!'];
export const pickCheer = () => CHEERS[Math.floor(Math.random() * CHEERS.length)];

// ---------- Background beat (original, synthesised) ----------
let ctx = null; let master = null; let timer = null; let nextTime = 0; let stepNo = 0; let intensity = 1;
const BPM = 124;
function kick(t) {
  const o = ctx.createOscillator(); const g = ctx.createGain();
  o.frequency.setValueAtTime(140, t); o.frequency.exponentialRampToValueAtTime(45, t + 0.12);
  g.gain.setValueAtTime(0.9 * intensity, t); g.gain.exponentialRampToValueAtTime(0.001, t + 0.18);
  o.connect(g); g.connect(master); o.start(t); o.stop(t + 0.2);
}
function hat(t, open) {
  const len = open ? 0.12 : 0.04;
  const buf = ctx.createBuffer(1, Math.floor(ctx.sampleRate * len), ctx.sampleRate);
  const d = buf.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / d.length);
  const src = ctx.createBufferSource(); src.buffer = buf;
  const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 7000;
  const g = ctx.createGain(); g.gain.value = (open ? 0.18 : 0.12) * intensity;
  src.connect(f); f.connect(g); g.connect(master); src.start(t);
}
const BASS = [55, 55, 65.4, 49];
function bass(t, bar) {
  const o = ctx.createOscillator(); const g = ctx.createGain(); const f = ctx.createBiquadFilter();
  o.type = 'sawtooth'; o.frequency.value = BASS[bar % 4];
  f.type = 'lowpass'; f.frequency.value = 380;
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.22 * intensity, t + 0.02); g.gain.exponentialRampToValueAtTime(0.001, t + 0.22);
  o.connect(f); f.connect(g); g.connect(master); o.start(t); o.stop(t + 0.25);
}
function schedule() {
  const spb = 60 / BPM / 2; // eighth notes
  while (nextTime < ctx.currentTime + 0.15) {
    const s = stepNo % 8; const bar = Math.floor(stepNo / 8);
    if (s % 2 === 0) kick(nextTime);
    hat(nextTime, s % 2 === 1 && s % 4 === 3);
    if (intensity > 0.6 && (s === 1 || s === 3 || s === 6)) bass(nextTime, bar);
    nextTime += spb; stepNo++;
  }
}
export const beat = {
  get on() { return pref('wa-beat', false); },
  set on(v) { setPref('wa-beat', v); if (!v) this.stop(); },
  start() {
    if (!this.on || timer) return;
    try {
      ctx ||= new (window.AudioContext || window.webkitAudioContext)();
      ctx.resume?.();
      master ||= (() => { const g = ctx.createGain(); g.gain.value = 0.35; g.connect(ctx.destination); return g; })();
      nextTime = ctx.currentTime + 0.05; stepNo = 0;
      timer = setInterval(schedule, 50);
    } catch { /* audio not available */ }
  },
  /** 1 = full energy (exercise), 0.4 = calm (rest). */
  level(v) { intensity = v; },
  stop() { clearInterval(timer); timer = null; },
};

// ---------- Confetti ----------
export function confetti(durationMs = 2600) {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  const c = document.createElement('canvas');
  c.className = 'confetti'; c.setAttribute('aria-hidden', 'true');
  document.body.appendChild(c);
  const dpr = window.devicePixelRatio || 1;
  const resize = () => { c.width = innerWidth * dpr; c.height = innerHeight * dpr; };
  resize();
  const g = c.getContext('2d');
  const colors = ['#EC4899', '#8B5CF6', '#22C55E', '#F59E0B', '#0EA5E9', '#F43F5E'];
  const parts = Array.from({ length: 160 }, () => ({
    x: innerWidth / 2 + (Math.random() - 0.5) * 160, y: innerHeight * 0.35,
    vx: (Math.random() - 0.5) * 14, vy: -Math.random() * 14 - 4, r: Math.random() * Math.PI,
    vr: (Math.random() - 0.5) * 0.3, w: 6 + Math.random() * 6, h: 8 + Math.random() * 8, color: colors[Math.floor(Math.random() * colors.length)],
  }));
  const t0 = performance.now();
  const frame = (now) => {
    const age = now - t0;
    g.setTransform(dpr, 0, 0, dpr, 0, 0); g.clearRect(0, 0, innerWidth, innerHeight);
    for (const p of parts) {
      p.vy += 0.35; p.vx *= 0.99; p.x += p.vx; p.y += p.vy; p.r += p.vr;
      g.save(); g.translate(p.x, p.y); g.rotate(p.r); g.globalAlpha = Math.max(0, 1 - age / durationMs);
      g.fillStyle = p.color; g.fillRect(-p.w / 2, -p.h / 2, p.w, p.h); g.restore();
    }
    if (age < durationMs) requestAnimationFrame(frame); else c.remove();
  };
  requestAnimationFrame(frame);
}
