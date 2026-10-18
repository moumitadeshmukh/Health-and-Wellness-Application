// Exercise player: Start / Pause / Resume / Stop with set counter, work & rest countdowns and sound cues.
import { esc, icon } from './ui.js';

let audioCtx;
export function beep(freq = 880, ms = 160) {
  try {
    audioCtx ||= new (window.AudioContext || window.webkitAudioContext)();
    const o = audioCtx.createOscillator(); const g = audioCtx.createGain();
    o.frequency.value = freq; o.connect(g); g.connect(audioCtx.destination);
    g.gain.setValueAtTime(0.15, audioCtx.currentTime);
    g.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + ms / 1000);
    o.start(); o.stop(audioCtx.currentTime + ms / 1000);
  } catch { /* sound not available */ }
  try { navigator.vibrate?.(120); } catch { /* ignore */ }
}

const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2, '0')}:${String(Math.max(0, s) % 60).padStart(2, '0')}`;

/**
 * @param el container
 * @param ex exercise {name, sets, reps, duration_min, rest_seconds}
 * @param opts.demo controller from mountDemo (play/pause/reset), optional
 * @param opts.onComplete called when all sets are finished
 * @returns cleanup function
 */
export function mountPlayer(el, ex, opts = {}) {
  const sets = Math.max(1, ex.sets || 1);
  const timed = Boolean(ex.duration_min);
  const workSecs = timed ? Math.round(ex.duration_min * 60) : Math.max(20, (ex.reps || 10) * 4);
  const restSecs = ex.rest_seconds || 0;
  const sound = { on: true };
  let state = 'idle'; // idle | work | rest | paused | done
  let phase = 'work'; let set = 1; let left = workSecs; let timer = null; let elapsed = 0;

  el.innerHTML = `<div class="player card">
    <div class="row between"><h3 style="margin:0">${icon('play', 'width="18" height="18" style="display:inline;vertical-align:-3px"')} Exercise player</h3>
      <label class="checkbox small" style="min-height:32px"><input type="checkbox" id="pl-sound" checked>Sound</label></div>
    <div class="player-body">
      <div class="player-phase" id="pl-phase">Ready</div>
      <div class="player-time" id="pl-time" aria-live="off">${fmt(workSecs)}</div>
      <div class="small muted" id="pl-info">${esc(timed ? `${sets} × ${fmt(workSecs)} hold` : `${sets} set${sets > 1 ? 's' : ''} × ${ex.reps || 10} reps`)}${restSecs && sets > 1 ? ` · ${restSecs}s rest` : ''}</div>
      <div class="progress mt-s"><span id="pl-bar" style="width:0%"></span></div>
      <div class="player-sets" id="pl-sets" aria-label="Sets">${Array.from({ length: sets }, (_, i) => `<span data-set="${i + 1}">${i + 1}</span>`).join('')}</div>
    </div>
    <div class="row player-controls">
      <button class="btn btn-primary" id="pl-start">${icon('play')}Start</button>
      <button class="btn btn-secondary" id="pl-pause" disabled>⏸ Pause</button>
      <button class="btn btn-secondary" id="pl-stop" disabled>⏹ Stop</button>
      <button class="btn btn-ghost" id="pl-next" disabled title="Finish this set / skip rest">Next ⏭</button>
    </div>
    <div class="sr-only" aria-live="assertive" id="pl-announce"></div>
  </div>`;
  const $ = (s) => el.querySelector(s);
  const announce = (t) => { $('#pl-announce').textContent = t; };
  $('#pl-sound').addEventListener('change', (e) => { sound.on = e.target.checked; });
  const cue = (f, ms) => { if (sound.on) beep(f, ms); };

  const render = () => {
    const total = phase === 'work' ? workSecs : restSecs;
    $('#pl-time').textContent = fmt(left);
    $('#pl-bar').style.width = `${total ? Math.round(((total - left) / total) * 100) : 0}%`;
    $('#pl-bar').parentElement.className = `progress mt-s ${phase === 'rest' ? 'amber' : ''}`;
    const label = state === 'done' ? 'Complete 🎉' : state === 'idle' ? 'Ready' : state === 'paused' ? `Paused · ${phase === 'work' ? `Set ${set}` : 'Rest'}`
      : phase === 'work' ? (timed ? `Set ${set} of ${sets} · Hold` : `Set ${set} of ${sets} · ${ex.reps || 10} reps`) : `Rest · next: set ${set + 1}`;
    $('#pl-phase').textContent = label;
    $('#pl-phase').className = `player-phase ${state === 'paused' ? 'paused' : phase === 'rest' && state !== 'done' ? 'rest' : state === 'done' ? 'done' : ''}`;
    el.querySelectorAll('[data-set]').forEach((s) => {
      const n = Number(s.dataset.set);
      s.className = n < set || state === 'done' ? 'done' : n === set && state !== 'idle' ? 'current' : '';
    });
    $('#pl-start').disabled = state === 'work' || state === 'rest';
    $('#pl-start').innerHTML = state === 'paused' ? `${icon('play')}Resume` : state === 'done' ? `${icon('refresh')}Start again` : `${icon('play')}Start`;
    $('#pl-pause').disabled = !(state === 'work' || state === 'rest');
    $('#pl-stop').disabled = state === 'idle';
    $('#pl-next').disabled = !(state === 'work' || state === 'rest' || state === 'paused');
  };

  const finish = () => {
    clearInterval(timer); timer = null; state = 'done'; left = 0;
    opts.demo?.pause();
    cue(1320, 400); announce(`${ex.name} complete`);
    render();
    opts.onComplete?.({ seconds: elapsed });
  };
  const advance = () => {
    if (phase === 'work') {
      if (set >= sets) return finish();
      if (restSecs) { phase = 'rest'; left = restSecs; state = 'rest'; opts.demo?.pause(); cue(520, 250); announce('Rest'); render(); return; }
      set += 1; phase = 'work'; left = workSecs; cue(880, 200); announce(`Set ${set}`); render(); return;
    }
    set += 1; phase = 'work'; left = workSecs; state = 'work'; opts.demo?.play(); cue(880, 200); announce(`Set ${set}, go`); render();
  };
  const tick = () => {
    left -= 1; elapsed += 1;
    if (left > 0 && left <= 3) cue(660, 90);
    if (left <= 0) advance(); else render();
  };
  const run = () => { clearInterval(timer); timer = setInterval(tick, 1000); };

  $('#pl-start').addEventListener('click', () => {
    if (state === 'done') { set = 1; phase = 'work'; left = workSecs; elapsed = 0; }
    if (state === 'paused') { state = phase; } else if (state === 'idle' || state === 'done') { state = 'work'; cue(880, 200); announce(`${ex.name}, set 1, go`); }
    if (state === 'work') opts.demo?.play();
    run(); render();
  });
  $('#pl-pause').addEventListener('click', () => { clearInterval(timer); timer = null; state = 'paused'; opts.demo?.pause(); announce('Paused'); render(); });
  $('#pl-stop').addEventListener('click', () => {
    clearInterval(timer); timer = null; state = 'idle'; phase = 'work'; set = 1; left = workSecs; elapsed = 0;
    opts.demo?.reset(); announce('Stopped'); render();
  });
  $('#pl-next').addEventListener('click', () => {
    if (state === 'paused') state = phase;
    if (!timer) run();
    advance();
  });
  render();
  return () => { clearInterval(timer); };
}
