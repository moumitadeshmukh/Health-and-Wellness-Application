// Animated exercise demonstrations: an original illustrated athlete driven by a fixed-length skeleton.
// Movements come from poses.js (exercise-specific keyframes, tempo, holds and coaching cues); skeleton.js solves
// each frame with constant bone lengths and planted hands/feet, so posture stays anatomically consistent.
import { solve, blend } from './skeleton.js';
import { SPECS, EXERCISE_MOVES } from './poses.js';

// Face and pelvic-floor moves use dedicated close-up visuals.
const SPECIAL_MOVES = {
  'cheek-puff': 'faceCheek', 'eyebrow-lift': 'faceBrow', 'smile-hold': 'faceSmile', 'jaw-release': 'faceJaw', 'face-relax': 'faceRelax',
  'kegel-identify': 'pelvic', 'kegel-slow': 'pelvic', 'kegel-quick': 'pelvic', 'kegel-elevator': 'pelvic', 'kegel-standing': 'pelvicStand',
};
export const demoFor = (id) => SPECIAL_MOVES[id] || EXERCISE_MOVES[id] || 'march';
const metaOf = (spec) => ({ view: spec.view, face: spec.face || 1, lie: spec.lie, faceCamera: spec.faceCamera });
const ease = (t) => 0.5 - Math.cos(Math.PI * t) / 2;

// Illustrated athlete (original artwork): proportional figure with tapered limbs, shaped torso,
// sports top, high-waist leggings, trainers, ponytail, exercise mat and soft shadow.
// Drawn from the same joint data as every pose, so all exercises share one consistent style.
const C = {
  skin: '#C98E68', skinShade: '#B27753', skinBack: '#A86F4D',
  top: '#F0507A', topShade: '#D63F67', topBack: '#C93860',
  legs: '#3D3570', legsShade: '#332C5F', legsBack: '#2C2652', stripe: '#F59AB4',
  hair: '#2A1B14', hairHi: '#4A3226', tie: '#F0507A',
  shoe: '#FFFFFF', shoeSole: '#E9E4F5', shoeAccent: '#F0507A', shoeBack: '#E2DDF0',
  mat: '#E9E3FB', matEdge: '#D8CEF6', shadow: 'rgba(76, 60, 140, .14)',
  eye: '#1F1A2E', lip: '#B5476A', blush: 'rgba(240, 120, 150, .35)',
};
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (v) => Math.hypot(v[0], v[1]) || 1;
const unit = (v) => mul(v, 1 / len(v));
const nrm = (v) => [-v[1], v[0]];
const f1 = (n) => n.toFixed(1);
const pt = (p) => `${f1(p[0])},${f1(p[1])}`;

/** A tapered, gently curved limb segment from a to b (widths wa → wb, bulge = muscle curve). */
function limb(a, b, wa, wb, fill, bulgeOut = 0.8, bulgeIn = 0.4) {
  const u = unit(sub(b, a)); const n = nrm(u); const L = len(sub(b, a));
  const m = add(a, mul(u, L * 0.42)); const wm = (wa * 0.55 + wb * 0.45) / 2;
  const a1 = add(a, mul(n, wa / 2)); const a2 = add(a, mul(n, -wa / 2));
  const b1 = add(b, mul(n, wb / 2)); const b2 = add(b, mul(n, -wb / 2));
  const c1 = add(m, mul(n, wm + bulgeOut)); const c2 = add(m, mul(n, -(wm + bulgeIn)));
  return `<path d="M${pt(a1)} Q${pt(c1)} ${pt(b1)} L${pt(b2)} Q${pt(c2)} ${pt(a2)}Z" fill="${fill}"/><circle cx="${f1(a[0])}" cy="${f1(a[1])}" r="${f1(wa / 2)}" fill="${fill}"/><circle cx="${f1(b[0])}" cy="${f1(b[1])}" r="${f1(wb / 2)}" fill="${fill}"/>`;
}

/** Which way the body's front faces: returns a unit vector (or null for a front-on view). */
function frontOf(p, meta = {}) {
  if (meta.faceCamera || meta.view === 'front') return null;
  const up = unit(sub(p.head, p.neck));
  const torsoUp = unit(sub(p.neck, p.hip));
  if (meta.view === 'side') {
    if (Math.abs(torsoUp[1]) >= Math.abs(torsoUp[0]) * 0.75 && !meta.lie) return [meta.face || 1, 0];
    if (meta.lie) { const perp = nrm(up); const wantY = meta.lie === 'prone' ? 1 : -1; return Math.sign(perp[1]) === wantY ? perp : mul(perp, -1); }
    return [meta.face || 1, 0];
  }
  const upright = Math.abs(up[1]) >= Math.abs(up[0]);
  if (upright) {
    const dx = p.head[0] - p.neck[0];
    if (Math.abs(dx) >= 2) return [Math.sign(dx), 0];
    // Head level but legs clearly split front/back (e.g. lunges) → side view facing the front leg.
    const l = p.kL[0] - p.hip[0]; const r = p.kR[0] - p.hip[0];
    if (Math.abs(p.kL[0] - p.kR[0]) > 25 && Math.abs(l + r) > 6) return [Math.sign(Math.abs(l) > Math.abs(r) ? l : r) || 1, 0];
    return null;
  }
  // Lying or on all fours: prone if a hand is planted under the shoulders.
  const planted = (h) => Math.abs(h[0] - p.neck[0]) < 26 && h[1] > p.neck[1] + 10;
  const prone = planted(p.hL) || planted(p.hR);
  const perp = nrm(up);
  const wantY = prone ? 1 : -1;
  return Math.sign(perp[1]) === wantY ? perp : mul(perp, -1);
}

function shoe(knee, foot, toeDir, back) {
  const shinVertical = Math.abs(knee[0] - foot[0]) < 6 && knee[1] < foot[1];
  const heelUp = toeDir !== 0 && shinVertical && foot[1] > 124 && foot[1] < 133.5; // e.g. calf raise / jogging push-off
  const onFloor = foot[1] >= 133.5;
  let dir;
  if (toeDir === 0) dir = null;
  else if (onFloor) dir = [toeDir, 0];
  else if (heelUp) { const lift = Math.min(1.1, (135 - foot[1]) / 7); dir = [toeDir * Math.cos(lift), Math.sin(lift)]; } // heel up, toes down
  else {
    const s = unit(sub(foot, knee)); const n = nrm(s);
    dir = Math.sign(n[0]) === toeDir || Math.abs(n[0]) < 0.15 ? n : mul(n, -1);
    if (Math.abs(n[0]) < 0.15) dir = s; // pointed foot (e.g. legs extended)
  }
  const fill = back ? C.shoeBack : C.shoe;
  if (!dir) { // front-on view: small rounded shoe
    return `<ellipse cx="${f1(foot[0])}" cy="${f1(foot[1] - 1)}" rx="4" ry="3" fill="${fill}"/><rect x="${f1(foot[0] - 4)}" y="${f1(foot[1] + 0.5)}" width="8" height="1.6" rx=".8" fill="${C.shoeSole}"/>`;
  }
  const ang = Math.atan2(dir[1], dir[0]) * 180 / Math.PI;
  return `<g transform="translate(${pt(foot)}) rotate(${f1(ang)})"><path d="M-3,-3.4 Q3,-5 7,-1.6 Q9.5,0 8.6,2 L-3.4,2 Q-4.6,0 -3,-3.4Z" fill="${fill}"/><rect x="-3.6" y="1.2" width="12.6" height="1.8" rx=".9" fill="${C.shoeSole}"/><path d="M0.5,-3.2 L4.5,-1.4" stroke="${C.shoeAccent}" stroke-width="1.1" stroke-linecap="round"/></g>`;
}

function head(p, front) {
  const up = unit(sub(p.head, p.neck));
  const theta = Math.atan2(up[0], -up[1]) * 180 / Math.PI; // rotate local "up" (0,-1) onto the head direction
  const r = 7.6;
  const hc = p.head;
  const hx = hc[0]; const hy = hc[1];
  if (!front) {
    // Front-on face
    return `<g transform="translate(${f1(hx)},${f1(hy)}) rotate(${f1(theta)})">
      <path d="M-8.4,1 Q-9.5,-8 -2,-9.6 Q6,-11 8.6,-3 Q9.2,2 8,5 L-8,5Z" fill="${C.hair}"/>
      <ellipse cx="0" cy="0.6" rx="${r - 0.8}" ry="${r}" fill="${C.skin}"/>
      <path d="M-7,-1.5 Q-6,-8.5 0,-8.6 Q6.5,-8.6 7,-1.5 Q4,-5.6 0,-5.4 Q-4,-5.6 -7,-1.5Z" fill="${C.hair}"/>
      <circle cx="0" cy="-11.5" r="3.6" fill="${C.hair}"/><rect x="-2.6" y="-8.9" width="5.2" height="1.6" rx=".8" fill="${C.tie}"/>
      <ellipse cx="-2.6" cy="0.6" rx=".95" ry="1.2" fill="${C.eye}"/><ellipse cx="2.6" cy="0.6" rx=".95" ry="1.2" fill="${C.eye}"/>
      <ellipse cx="-4.2" cy="3.2" rx="1.6" ry="1" fill="${C.blush}"/><ellipse cx="4.2" cy="3.2" rx="1.6" ry="1" fill="${C.blush}"/>
      <path d="M-1.8,4.4 Q0,5.8 1.8,4.4" stroke="${C.lip}" stroke-width=".9" fill="none" stroke-linecap="round"/></g>`;
  }
  // Profile: local +x is the face side. Flip if the body faces the other way.
  const t = Math.atan2(up[1], up[0]); // direction of up in screen space
  const localX = [Math.cos(t + Math.PI / 2), Math.sin(t + Math.PI / 2)];
  const flip = localX[0] * front[0] + localX[1] * front[1] < 0 ? -1 : 1;
  return `<g transform="translate(${f1(hx)},${f1(hy)}) rotate(${f1(theta)}) scale(${flip},1)">
    <path d="M-5.4,-4.4 Q-12,-3 -13.4,5 Q-14,11 -10.6,14.4 Q-11.4,8 -8.6,2.6Z" fill="${C.hair}"/>
    <circle cx="-6.2" cy="-4.4" r="1.7" fill="${C.tie}"/>
    <ellipse cx="0" cy="0.4" rx="${r}" ry="${r}" fill="${C.skin}"/>
    <path d="M${r},0.6 Q${r + 1.6},1.6 ${r - 0.2},3" fill="${C.skin}"/>
    <path d="M-7.4,2.6 Q-8.6,-7.2 -0.6,-8.4 Q6.8,-9 7.6,-2.2 Q4.6,-5.2 1.4,-4.6 Q-1.8,-4 -2.6,0.2 Q-4.4,1.4 -7.4,2.6Z" fill="${C.hair}"/>
    <path d="M-4,-6.2 Q0,-8 3.6,-6.8" stroke="${C.hairHi}" stroke-width="1.1" fill="none" stroke-linecap="round"/>
    <ellipse cx="-1.4" cy="1.6" rx="1.5" ry="1.9" fill="${C.skinShade}"/>
    <ellipse cx="4" cy="0" rx=".9" ry="1.15" fill="${C.eye}"/>
    <ellipse cx="3.6" cy="3.2" rx="1.5" ry=".9" fill="${C.blush}"/>
    <path d="M4.2,4.6 Q5.4,5.2 6.4,4.5" stroke="${C.lip}" stroke-width=".85" fill="none" stroke-linecap="round"/></g>`;
}

/** Torso from hips to shoulders with natural widths, coloured as leggings / midriff / sports top. */
function torso(p, front) {
  const arch = p.arch || 0;
  const shoulder = add(p.neck, mul(unit(sub(p.hip, p.neck)), 3));
  const axis = sub(shoulder, p.hip); const L = len(axis); const u = unit(axis); const n = nrm(u);
  // half-widths along the torso (0 = hips, 1 = shoulders)
  const W = front ? [[0, 9.2], [0.2, 8.6], [0.45, 6.9], [0.62, 7.2], [0.8, 8], [0.95, 8.2], [1, 7.2]]
    : [[0, 10.2], [0.2, 9.6], [0.45, 7.4], [0.62, 7.8], [0.8, 9.2], [0.94, 10.4], [1, 9.4]]; // front-on: shoulders wider than waist
  const w = (t) => { for (let i = 1; i < W.length; i++) if (t <= W[i][0]) { const [t0, w0] = W[i - 1]; const [t1, w1] = W[i]; const k = (t - t0) / (t1 - t0); return w0 + (w1 - w0) * (0.5 - Math.cos(Math.PI * k) / 2); } return W[W.length - 1][1]; };
  // in profile, a little more depth on the front (chest) and back (glutes) for a natural silhouette
  const fr = front ? Math.sign(n[0] * front[0] + n[1] * front[1]) || 1 : 0;
  const side = (t, s) => {
    let ww = w(t);
    if (fr) {
      if (s === fr) ww += t > 0.62 && t < 0.92 ? 1.1 * Math.sin(((t - 0.62) / 0.3) * Math.PI) : 0;
      else ww += t < 0.25 ? 1.2 * Math.sin((t / 0.25) * Math.PI) : 0;
    }
    let q = add(add(p.hip, mul(u, t * L)), mul(n, s * ww));
    if (arch && fr) q = add(q, mul(n, -fr * arch * Math.sin(Math.PI * Math.min(1, Math.max(0, t))))); // + rounds the back, − arches it
    return q;
  };
  const band = (t0, t1, fill) => {
    const N = 10; const left = []; const right = [];
    for (let i = 0; i <= N; i++) { const t = t0 + ((t1 - t0) * i) / N; left.push(side(t, 1)); right.push(side(t, -1)); }
    return `<path d="M${left.map(pt).join(' L')} L${right.reverse().map(pt).join(' L')}Z" fill="${fill}"/>`;
  };
  return band(0, 1, C.skin) // base skin (shoulders, midriff)
    + band(-0.04, 0.42, C.legs) // high-waist leggings
    + band(0.4, 0.43, C.legsShade)
    + band(0.53, 0.97, C.top) // sports top
    + band(0.53, 0.57, C.topShade);
}

function figureSvg(pose, { equipment, meta = {}, band = false } = {}) {
  const p = pose;
  const front = frontOf(p, meta);
  const shoulder = add(p.neck, mul(unit(sub(p.hip, p.neck)), 3));
  // toes: standing → body front; lying → away from the head
  const upright = Math.abs(p.neck[1] - p.hip[1]) > Math.abs(p.neck[0] - p.hip[0]) * 0.75;
  const toe = (foot) => (upright ? (front ? Math.sign(front[0]) : 0) : Math.sign(foot[0] - p.head[0]) || 1);
  // Hip and shoulder sockets sit to either side of the body's centre line (more so in a front-on view).
  const tn = nrm(unit(sub(shoulder, p.hip)));
  const socket = (base, limbEnd, spread) => { const s2 = Math.sign((limbEnd[0] - base[0]) * tn[0] + (limbEnd[1] - base[1]) * tn[1]) || 1; return add(base, mul(tn, s2 * spread)); };
  const leg = (k, f, back) => {
    const col = back && front ? C.legsBack : C.legs;
    const h = meta.view === 'front' && p.pL ? (back ? p.pR : p.pL) : socket(p.hip, k, front ? 1.2 : 4.6);
    return limb(h, k, 13.4, 9, col, 1.4, 0.7) + limb(k, f, 8.8, 5.2, col, 1.3, 0.3) + shoe(k, f, toe(f), back);
  };
  const arm = (e, h, back) => {
    const skin = back && front ? C.skinBack : C.skin;
    const sh = meta.view === 'front' && p.sL ? (back ? p.sR : p.sL) : socket(shoulder, e, front ? 1 : 8.6);
    return limb(sh, e, 7, 5, skin, 0.8, 0.3) + limb(e, h, 5, 3.6, skin, 0.6, 0.2)
      + `<circle cx="${f1(h[0])}" cy="${f1(h[1])}" r="2.3" fill="${skin}"/>`;
  };
  const neckTop = add(p.neck, mul(sub(p.head, p.neck), 0.42));
  const bell = (h) => `<g fill="#4B5563"><rect x="${f1(h[0] - 7)}" y="${f1(h[1] - 1.6)}" width="14" height="3.2" rx="1.2"/><rect x="${f1(h[0] - 8)}" y="${f1(h[1] - 4)}" width="3.4" height="8" rx="1.2"/><rect x="${f1(h[0] + 4.6)}" y="${f1(h[1] - 4)}" width="3.4" height="8" rx="1.2"/></g>`;
  const dumbbell = equipment?.includes('dumbbells') ? bell(p.hL) : '';
  const bandLine = band ? `<path d="M${pt(p.hL)} Q${f1((p.hL[0] + p.hR[0]) / 2)},${f1((p.hL[1] + p.hR[1]) / 2 + 3)} ${pt(p.hR)}" stroke="#22C55E" stroke-width="2.2" fill="none" stroke-linecap="round"/>` : '';
  // ground: mat for floor work, soft shadow under the body
  const pts = [p.fL, p.fR, p.hL, p.hR, p.hip, p.kL, p.kR];
  const lowX = pts.filter((q) => q[1] > 122).map((q) => q[0]);
  const floorWork = [p.hip, p.kL, p.kR, p.hL, p.hR, p.head].some((q) => q[1] > 118);
  const minX = Math.min(...(lowX.length ? lowX : [p.hip[0] - 10])); const maxX = Math.max(...(lowX.length ? lowX : [p.hip[0] + 10]));
  const ground = (floorWork ? `<rect x="-20" y="134.5" width="240" height="4.5" rx="2.2" class="mat"/><rect x="-20" y="137.6" width="240" height="1.4" rx=".7" class="mat-edge"/>` : '')
    + `<ellipse cx="${f1((minX + maxX) / 2)}" cy="${floorWork ? 134.6 : 136}" rx="${f1(Math.max(12, (maxX - minX) / 2 + 8))}" ry="2.6" class="shadow"/>`;
  return `<g class="athlete">${ground}
    ${arm(p.eR, p.hR, true)}${equipment?.includes('dumbbells') && meta.view !== 'front' ? '' : ''}${leg(p.kR, p.fR, true)}
    ${limb(add(p.neck, mul(unit(sub(p.hip, p.neck)), 2)), neckTop, 6.4, 5.6, C.skinShade, 0, 0)}
    ${torso(p, front)}
    ${leg(p.kL, p.fL, false)}
    ${head(p, front)}
    ${arm(p.eL, p.hL, false)}${dumbbell}${bandLine}</g>`;
}

// Equipment and supports drawn behind the athlete (coordinates match poses.js).
const PROPS = {
  wallpush: '<rect x="148" y="8" width="8" height="128" rx="2" class="wall"/>',
  stepup: '<rect x="104" y="114" width="40" height="22" rx="3" class="step"/>',
  chairsquat: '<path d="M60 136 V58 M60 104 H90 V136" class="chair"/>',
  chairsit: '<path d="M64 136 V54 M64 104 H96 V136" class="chair"/>',
  hipthrust: '<rect x="8" y="104" width="34" height="32" rx="4" class="step"/>',
  wallsit: '<rect x="62" y="8" width="9" height="128" rx="2" class="wall"/>',
  legsup: '<rect x="118" y="10" width="9" height="126" rx="2" class="wall"/>',
  declinebench: '<rect x="24" y="108" width="40" height="28" rx="4" class="step"/>',
  inclinebench: '<rect x="128" y="106" width="44" height="30" rx="4" class="step"/>',
  doorway: '<rect x="60" y="6" width="8" height="130" rx="2" class="wall"/>',
  wallback: '<rect x="62" y="8" width="8" height="128" rx="2" class="wall"/>',
  wallfront: '<rect x="134" y="8" width="8" height="128" rx="2" class="wall"/>',
  chairfront: '<path d="M130 136 V80 M130 104 H158 V136" class="chair"/>',
  rowbench: '<rect x="50" y="121" width="86" height="7" rx="3" class="step"/><path d="M58 128 V136 M128 128 V136" class="chair"/>',
  bike: '<path d="M86 121 L82 92 M86 121 L116 72 M116 72 h6 M78 92 h10 M70 136 L86 121 L104 136" class="chair"/><circle cx="86" cy="121" r="4" class="wall"/>',
};
const PROP_BOX = { wallpush: [146, 8, 158], stepup: [104, 114, 144], chairsquat: [58, 56, 92], chairsit: [62, 52, 98], hipthrust: [8, 104, 42], wallsit: [62, 8, 71], legsup: [118, 10, 127], declinebench: [24, 108, 64], inclinebench: [128, 106, 172], doorway: [60, 6, 68], wallback: [62, 8, 70], wallfront: [134, 8, 142], chairfront: [128, 78, 160], rowbench: [50, 121, 136], bike: [68, 70, 124] };

// Close-up portrait of the same athlete for face exercises; expression changes with each move.
function portrait(mode, t) {
  const k = t; // 0 = relaxed, 1 = full expression
  const browY = mode === 'brow' ? 52 - 6 * k : 54;
  const eyeRy = mode === 'relax' ? 3.2 - 2.6 * k : mode === 'smile' ? 3.2 - 1.2 * k : 3.2;
  const cheek = mode === 'cheek' ? 4 + 7 * k : 0;
  const mouth = mode === 'jaw' ? `<ellipse cx="100" cy="${96 + 2 * k}" rx="${7 - 1.5 * k}" ry="${2 + 7 * k}" fill="#8E2D4E"/><ellipse cx="100" cy="${100 + 5 * k}" rx="${4 - k}" ry="${1 + 2.4 * k}" fill="#E07A93"/>`
    : mode === 'smile' ? `<path d="M${88 - 4 * k},${94 - 2 * k} Q100,${100 + 6 * k} ${112 + 4 * k},${94 - 2 * k}" stroke="${C.lip}" stroke-width="2.6" fill="${k > 0.4 ? '#fff' : 'none'}" stroke-linecap="round"/>`
      : mode === 'cheek' ? `<ellipse cx="100" cy="96" rx="${5 - 1.5 * k}" ry="2.6" fill="${C.lip}"/>`
        : `<path d="M92,95 Q100,${99 - (mode === 'relax' ? 0 : 1)} 108,95" stroke="${C.lip}" stroke-width="2.4" fill="none" stroke-linecap="round"/>`;
  const label = { cheek: k > 0.5 ? 'Puff & hold' : 'Release', brow: k > 0.5 ? 'Lift brows' : 'Relax', smile: k > 0.5 ? 'Smile wide' : 'Soften', jaw: k > 0.5 ? 'Open gently' : 'Close & relax', relax: k > 0.5 ? 'Soften & breathe' : 'Notice tension' }[mode];
  return `<ellipse cx="100" cy="146" rx="62" ry="30" fill="${C.top}"/><path d="M60,140 Q100,126 140,140" stroke="${C.topShade}" stroke-width="3" fill="none"/>
    <rect x="90" y="104" width="20" height="26" rx="8" fill="${C.skinShade}"/>
    <path d="M60,74 Q56,26 100,22 Q144,26 140,74 Q142,96 132,108 L68,108 Q58,96 60,74Z" fill="${C.hair}"/>
    <circle cx="100" cy="16" r="11" fill="${C.hair}"/><rect x="91" y="23" width="18" height="4" rx="2" fill="${C.tie}"/>
    <ellipse cx="${66 - cheek / 3}" cy="76" rx="5" ry="8" fill="${C.skinShade}"/><ellipse cx="${134 + cheek / 3}" cy="76" rx="5" ry="8" fill="${C.skinShade}"/>
    <path d="M${70 - cheek},70 Q${68 - cheek},104 100,${110 + cheek / 3} Q${132 + cheek},104 ${130 + cheek},70 Q130,40 100,38 Q70,40 ${70 - cheek},70Z" fill="${C.skin}"/>
    <path d="M70,66 Q72,40 100,38 Q126,38 131,62 Q118,48 98,50 Q84,50 70,66Z" fill="${C.hair}"/>
    <path d="M78,${browY} Q86,${browY - 4} 93,${browY}" stroke="${C.hair}" stroke-width="2.6" fill="none" stroke-linecap="round"/><path d="M107,${browY} Q114,${browY - 4} 122,${browY}" stroke="${C.hair}" stroke-width="2.6" fill="none" stroke-linecap="round"/>
    <ellipse cx="86" cy="66" rx="3" ry="${f1(Math.max(0.5, eyeRy))}" fill="${C.eye}"/><ellipse cx="114" cy="66" rx="3" ry="${f1(Math.max(0.5, eyeRy))}" fill="${C.eye}"/>
    <path d="M100,70 Q97,80 101,82" stroke="${C.skinShade}" stroke-width="2" fill="none" stroke-linecap="round"/>
    <ellipse cx="${80 - cheek / 2}" cy="84" rx="${7 + cheek / 3}" ry="${4 + cheek / 4}" fill="${C.blush}"/><ellipse cx="${120 + cheek / 2}" cy="84" rx="${7 + cheek / 3}" ry="${4 + cheek / 4}" fill="${C.blush}"/>
    ${mouth}
    <rect x="58" y="128" width="84" height="18" rx="9" fill="rgba(255,255,255,.92)"/><text x="100" y="141" text-anchor="middle" class="demo-label">${label}</text>`;
}

// Pelvic floor: the athlete sitting (or standing) tall with a soft glow at the pelvic floor that lifts and relaxes.
function pelvicFloor(t, standing) {
  const spec = standing ? SPECS.mountainpose : SPECS.seated;
  const pose = solve(spec.frames[0], metaOf(spec));
  const hip = pose.hip;
  const lift = 6 * t;
  return `${figureSvg(pose, { meta: metaOf(spec) })}
    <ellipse cx="${f1(hip[0])}" cy="${f1(hip[1] + 4 - lift)}" rx="${f1(9 + 3 * t)}" ry="${f1(4 + 2 * t)}" fill="rgba(240, 80, 122, ${f1(0.25 + 0.4 * t)})" stroke="#F0507A" stroke-width="1.2"/>
    <path d="M${f1(hip[0] + 18)},${f1(hip[1] + 8 - lift)} v-12 m-4,4 l4,-4 l4,4" stroke="#8B5CF6" stroke-width="2" fill="none" stroke-linecap="round" stroke-linejoin="round" opacity="${f1(t)}"/>`;
}
const SPECIAL = {
  pelvic: (t) => pelvicFloor(t, false),
  pelvicStand: (t) => pelvicFloor(t, true),
  faceCheek: (t) => portrait('cheek', t),
  faceBrow: (t) => portrait('brow', t),
  faceSmile: (t) => portrait('smile', t),
  faceJaw: (t) => portrait('jaw', t),
  faceRelax: (t) => portrait('relax', t),
};
const SPECIAL_CUE = { pelvic: ['Relax fully', 'Lift & hold'], pelvicStand: ['Relax fully', 'Lift & hold'] };

// ---------- timeline: keyframes with move durations, holds and coaching cues ----------
function timeline(spec) {
  const n = spec.frames.length;
  const segs = spec.frames.map((f, i) => ({ i, hold: f.hold || 0, dur: f.dur || 900 }));
  const total = segs.reduce((s, x) => s + x.hold + x.dur, 0);
  return { n, segs, total };
}
function sample(spec, tl, ms) {
  let tau = ((ms % tl.total) + tl.total) % tl.total;
  const meta = metaOf(spec);
  for (const s of tl.segs) {
    const f = spec.frames[s.i];
    if (tau < s.hold) return { pose: solve(f, meta), cue: f.cue };
    tau -= s.hold;
    if (tau < s.dur) {
      const j = (s.i + 1) % tl.n; const t = ease(tau / s.dur);
      const cue = j === 0 && spec.endCue ? spec.endCue : spec.frames[j].cue;
      return { pose: blend(f, spec.frames[j], t, meta), cue };
    }
    tau -= s.dur;
  }
  return { pose: solve(spec.frames[0], meta), cue: spec.frames[0].cue };
}

// Frame each exercise around its whole movement (all keyframes + in-betweens + props) so nothing is cropped.
const vbCache = new Map();
function viewBoxFor(key) {
  if (SPECIAL[key]) return '0 0 200 150';
  if (vbCache.has(key)) return vbCache.get(key);
  const spec = SPECS[key]; const meta = metaOf(spec);
  let x0 = Infinity; let y0 = Infinity; let x1 = -Infinity; let y1 = -Infinity;
  const take = (j) => { for (const k of ['head', 'neck', 'hip', 'eL', 'hL', 'eR', 'hR', 'kL', 'fL', 'kR', 'fR']) { const v = j[k]; x0 = Math.min(x0, v[0]); x1 = Math.max(x1, v[0]); y0 = Math.min(y0, v[1]); y1 = Math.max(y1, v[1]); } };
  spec.frames.forEach((f, i) => { take(solve(f, meta)); for (const t of [0.33, 0.66]) take(blend(f, spec.frames[(i + 1) % spec.frames.length], t, meta)); });
  y0 -= 18; x0 -= 20; x1 += 20; y1 = Math.max(y1, 136) + 6; // room for hair, hands, shoes and the mat
  const pb = PROP_BOX[spec.prop]; if (pb) { x0 = Math.min(x0, pb[0] - 6); y0 = Math.min(y0, pb[1] - 4); x1 = Math.max(x1, pb[2] + 6); }
  let w = x1 - x0; let h = y1 - y0;
  w = Math.max(w, (h * 4) / 3, 125); h = (w * 3) / 4; // keep a 4:3 frame
  const cx = (x0 + x1) / 2;
  const vb = `${f1(cx - w / 2)} ${f1(y1 - h)} ${f1(w)} ${f1(h)}`;
  vbCache.set(key, vb);
  return vb;
}

/** Static thumbnail for cards: the exercise's key working position. */
export function demoThumb(id, equipment) {
  const key = demoFor(id);
  let inner;
  if (SPECIAL[key]) inner = SPECIAL[key](0.6);
  else { const spec = SPECS[key]; inner = figureSvg(solve(spec.frames[spec.thumb ?? 0], metaOf(spec)), { equipment, meta: metaOf(spec), band: spec.band }); }
  return `<svg class="demo-svg" viewBox="${viewBoxFor(key)}" aria-hidden="true">${SPECIAL[key] ? '' : PROPS[SPECS[key].prop] || ''}${inner}</svg>`;
}

/** Animated demonstration with play/pause, slow-motion and a live coaching cue. Returns a cleanup function. */
export function mountDemo(el, id, { equipment, name = 'Exercise' } = {}) {
  const key = demoFor(id);
  const spec = SPECS[key];
  const tl = spec ? timeline(spec) : { total: 5200 };
  el.innerHTML = `<div class="demo">
    <svg class="demo-svg" viewBox="${viewBoxFor(key)}" role="img" aria-label="Animated demonstration of ${name}">${spec ? PROPS[spec.prop] || '' : ''}<g id="fig"></g></svg>
    <div class="demo-cue" aria-hidden="true"></div>
    <div class="demo-controls"><button type="button" class="btn btn-secondary btn-sm" id="demo-toggle"></button>
      <div class="chips" role="group" aria-label="Speed"><button type="button" class="chip" data-speed="1.8" aria-pressed="false">Slow</button><button type="button" class="chip" data-speed="1" aria-pressed="true">Normal</button></div></div></div>`;
  const fig = el.querySelector('#fig');
  const cueEl = el.querySelector('.demo-cue');
  const btn = el.querySelector('#demo-toggle');
  let playing = !matchMedia('(prefers-reduced-motion: reduce)').matches;
  let speed = 1; let start = performance.now(); let pausedAt = 0; let raf = 0; let lastCue = '';
  const setCue = (c) => { if (c !== lastCue) { lastCue = c || ''; cueEl.textContent = lastCue; cueEl.hidden = !lastCue; } };
  const draw = (elapsed) => {
    const ms = elapsed / speed;
    if (SPECIAL[key]) {
      const t = ease((Math.sin((ms / 2600) * Math.PI) + 1) / 2);
      fig.innerHTML = SPECIAL[key](t);
      setCue(SPECIAL_CUE[key] ? SPECIAL_CUE[key][t > 0.5 ? 1 : 0] : '');
      return;
    }
    const { pose, cue } = sample(spec, tl, ms);
    fig.innerHTML = figureSvg(pose, { equipment, meta: metaOf(spec), band: spec.band });
    setCue(cue);
  };
  const loop = (now) => { draw(Math.max(0, now - start)); raf = requestAnimationFrame(loop); };
  const setBtn = () => { btn.innerHTML = playing ? '⏸ Pause' : '▶ Play demo'; btn.setAttribute('aria-pressed', String(playing)); };
  btn.addEventListener('click', () => {
    playing = !playing;
    if (playing) { start = performance.now() - pausedAt; raf = requestAnimationFrame(loop); } else { pausedAt = performance.now() - start; cancelAnimationFrame(raf); }
    setBtn();
  });
  el.querySelectorAll('[data-speed]').forEach((b) => b.addEventListener('click', () => {
    const now = performance.now(); const elapsed = playing ? now - start : pausedAt;
    const newSpeed = Number(b.dataset.speed);
    const scaled = elapsed * (newSpeed / speed);
    speed = newSpeed; if (playing) start = now - scaled; else pausedAt = scaled;
    el.querySelectorAll('[data-speed]').forEach((x) => x.setAttribute('aria-pressed', String(x === b)));
  }));
  setBtn();
  const firstMs = spec ? (spec.frames[0].hold || 0) + (spec.frames[0].dur || 900) * 0.999 + (spec.frames[1]?.hold || 0) / 2 : 1300;
  draw(firstMs);
  if (playing) { start = performance.now() - firstMs; raf = requestAnimationFrame(loop); } else pausedAt = firstMs;
  const stop = () => cancelAnimationFrame(raf);
  // Controller used by the exercise player to keep the animation in step with Start / Pause / Stop.
  stop.play = () => { if (!playing) btn.click(); };
  stop.pause = () => { if (playing) btn.click(); };
  stop.reset = () => { stop.pause(); pausedAt = firstMs; draw(firstMs); };
  return stop;
}

/** Video helpers: an exercise may carry a video_url (YouTube link or .mp4); otherwise offer a search. */
export const youtubeId = (url) => (String(url || '').match(/(?:youtube\.com\/(?:watch\?v=|embed\/|shorts\/)|youtu\.be\/)([\w-]{6,})/) || [])[1] || null;
/** opts.silent: autoplay muted on a loop (used inside the follow-along player, where the timer and voice coach lead). */
export function videoEmbed(url, title, opts = {}) {
  if (!url) return '';
  const id = youtubeId(url);
  if (id) {
    const q = new URLSearchParams({ rel: '0', modestbranding: '1', playsinline: '1' });
    if (opts.silent) { q.set('autoplay', '1'); q.set('mute', '1'); q.set('loop', '1'); q.set('playlist', id); }
    return `<div class="video-wrap"><iframe src="https://www.youtube-nocookie.com/embed/${id}?${q}" title="${title} video" ${opts.silent ? '' : 'loading="lazy"'} allow="autoplay; accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen" allowfullscreen referrerpolicy="strict-origin-when-cross-origin"></iframe></div>`;
  }
  return `<video class="video-wrap" src="${url}" ${opts.silent ? 'autoplay muted loop playsinline' : 'controls preload="metadata"'} aria-label="${title} video"></video>`;
}
export const videoWatchUrl = (url) => { const id = youtubeId(url); return id ? `https://www.youtube.com/watch?v=${id}` : url; };
export const videoSearchUrl = (name) => `https://www.youtube.com/results?search_query=${encodeURIComponent(`${name} exercise proper form tutorial`)}`;
export const __debug = { SPECS, EXERCISE_MOVES };
/** Test helper: SVG of one keyframe (or an in-between when t is given) for the visual audit sheets. */
export function __frameSvg(key, i, t = 0) {
  const spec = SPECS[key]; const meta = metaOf(spec); const n = spec.frames.length;
  const pose = t ? blend(spec.frames[i], spec.frames[(i + 1) % n], t, meta) : solve(spec.frames[i], meta);
  return `<svg class="demo-svg" viewBox="${viewBoxFor(key)}">${PROPS[spec.prop] || ''}${figureSvg(pose, { meta, band: spec.band })}</svg>`;
}
