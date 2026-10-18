// Skeleton engine for the exercise animations.
// Every keyframe is solved with FIXED bone lengths (no stretching or distortion), limbs are posed either by
// joint angles or by a planted target (2-bone inverse kinematics keeps hands/feet fixed on the floor or a wall),
// and in-between frames rotate joints (they never slide points), so movement stays anatomically natural.
//
// Angles are screen directions in degrees: 0 = up, 90 = right, 180 = down, 270 = left.
// Frame format:
//   hip: [x, y]               hip joint position
//   neck: [x, y]              direction of the spine from the hip (length is fixed)
//   hr: deg                   head angle relative to the spine (0 = neutral)
//   aL / aR: [upper, fore]    arm angles, or { to: [x, y], b } to plant the hand; b = 'up' | 'down' | 'fwd' | 'back' (or ±1)
//   lL / lR: [thigh, shin]    leg angles, or { to: [x, y], b: ±1 } to plant the foot (b picks the knee side)
//   arch: n                   spine curve (+ rounds the back, − arches it)
//   cue / dur / hold          on-screen coaching cue, ms to move to the NEXT frame, ms to pause at this frame

export const BONE = { torso: 42, head: 13, shoulder: 3, upper: 19, fore: 18, thigh: 26, shin: 26, armSpread: 8.6, legSpread: 4.6 };

const rad = (d) => (d * Math.PI) / 180;
export const dir = (deg) => [Math.sin(rad(deg)), -Math.cos(rad(deg))];
const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const sub = (a, b) => [a[0] - b[0], a[1] - b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const len = (v) => Math.hypot(v[0], v[1]);
export const angleOf = (v) => ((Math.atan2(v[0], -v[1]) * 180) / Math.PI + 360) % 360;
const lerp = (a, b, t) => a + (b - a) * t;
const lerpP = (a, b, t) => [lerp(a[0], b[0], t), lerp(a[1], b[1], t)];
const lerpA = (a, b, t) => { let d = ((b - a + 540) % 360) - 180; return a + d * t; };

function limb(root, spec, l1, l2) {
  if (Array.isArray(spec)) {
    const mid = add(root, mul(dir(spec[0]), l1));
    return [mid, add(mid, mul(dir(spec[1]), l2))];
  }
  const v = sub(spec.to, root); let d = len(v) || 0.001; const u = mul(v, 1 / d);
  const reach = l1 + l2 - 0.05;
  let end = spec.to;
  if (d > reach) { d = reach; end = add(root, mul(u, d)); }
  const minReach = Math.abs(l1 - l2) + 0.05;
  if (d < minReach) d = minReach;
  const a = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
  const h = Math.sqrt(Math.max(0, l1 * l1 - a * a));
  const n = [-u[1], u[0]];
  const base = add(root, mul(u, a));
  let sign = typeof spec.b === 'number' ? spec.b : 1;
  if (typeof spec.b === 'string') {
    // Semantic bend: pick the elbow/knee position that points up, down, forward (+x) or back (−x).
    const m1 = add(base, mul(n, h)); const m2 = add(base, mul(n, -h));
    const pick = { up: m1[1] <= m2[1], down: m1[1] >= m2[1], fwd: m1[0] >= m2[0], back: m1[0] <= m2[0] }[spec.b];
    sign = pick ? 1 : -1;
  }
  const mid = add(base, mul(n, h * sign));
  return [mid, add(mid, mul(unitOf(sub(end, mid)), l2))];
}
const unitOf = (v) => { const l = len(v) || 1; return [v[0] / l, v[1] / l]; };

/** Solve one keyframe into joint positions. meta.view === 'front' spreads shoulder and hip sockets to the sides. */
export function solve(f, meta = {}) {
  const t = angleOf(sub(f.neck, f.hip));
  const neck = add(f.hip, mul(dir(t), BONE.torso));
  const head = add(neck, mul(dir(t + (f.hr || 0)), BONE.head));
  const shoulder = add(neck, mul(dir(t + 180), BONE.shoulder));
  const side = dir(t + 90); // body's right-hand direction on screen when facing the viewer
  const front = meta.view === 'front';
  const sL = front ? add(shoulder, mul(side, -BONE.armSpread)) : shoulder;
  const sR = front ? add(shoulder, mul(side, BONE.armSpread)) : shoulder;
  const pL = front ? add(f.hip, mul(side, -BONE.legSpread)) : f.hip;
  const pR = front ? add(f.hip, mul(side, BONE.legSpread)) : f.hip;
  const [eL, hL] = limb(sL, f.aL, BONE.upper, BONE.fore);
  const [eR, hR] = limb(sR, f.aR, BONE.upper, BONE.fore);
  const [kL, fL] = limb(pL, f.lL, BONE.thigh, BONE.shin);
  const [kR, fR] = limb(pR, f.lR, BONE.thigh, BONE.shin);
  return { head, neck, hip: f.hip, eL, hL, eR, hR, kL, fL, kR, fR, sL, sR, pL, pR, arch: f.arch || 0 };
}

/** Blend two keyframes by rotating joints (shortest arc); planted targets stay planted. */
export function blend(a, b, t, meta) {
  if (t <= 0) return solve(a, meta);
  if (t >= 1) return solve(b, meta);
  const A = solve(a, meta); const B = solve(b, meta);
  const hip = lerpP(a.hip, b.hip, t);
  const ta = angleOf(sub(A.neck, A.hip)); const tb = angleOf(sub(B.neck, B.hip));
  const tt = lerpA(ta, tb, t);
  const f = { hip, neck: add(hip, dir(tt)), hr: lerp(a.hr || 0, b.hr || 0, t), arch: lerp(a.arch || 0, b.arch || 0, t) };
  const limbBlend = (key, rootKey, midKey, endKey) => {
    const sa = a[key]; const sb = b[key];
    if (!Array.isArray(sa) || !Array.isArray(sb)) {
      // A planted hand/foot in either keyframe: move the end point in a straight line (it never dips through the floor).
      const ik = Array.isArray(sa) ? sb : sa;
      const from = Array.isArray(sa) ? A[endKey] : sa.to; const to = Array.isArray(sb) ? B[endKey] : sb.to;
      return { to: lerpP(from, to, t), b: ik.b };
    }
    const ang = (J) => [angleOf(sub(J[midKey], J[rootKey])), angleOf(sub(J[endKey], J[midKey]))];
    const [a1, a2] = ang(A); const [b1, b2] = ang(B);
    return [lerpA(a1, b1, t), lerpA(a2, b2, t)];
  };
  f.aL = limbBlend('aL', 'sL', 'eL', 'hL');
  f.aR = limbBlend('aR', 'sR', 'eR', 'hR');
  f.lL = limbBlend('lL', 'pL', 'kL', 'fL');
  f.lR = limbBlend('lR', 'pR', 'kR', 'fR');
  return solve(f, meta);
}

/** Bone-length check used by the test-suite: every solved frame must keep the skeleton's proportions. */
export function boneLengths(j) {
  const d = (p, q) => len(sub(p, q));
  return { torso: d(j.hip, j.neck), head: d(j.neck, j.head), upperL: d(j.sL, j.eL), foreL: d(j.eL, j.hL), upperR: d(j.sR, j.eR), foreR: d(j.eR, j.hR), thighL: d(j.pL, j.kL), shinL: d(j.kL, j.fL), thighR: d(j.pR, j.kR), shinR: d(j.kR, j.fR) };
}
