// Exercise animation library. Each entry is one exercise movement: camera view + keyframes (see skeleton.js).
// Form follows standard coaching cues (neutral spine, knees tracking over toes, hands under shoulders, controlled
// lowering, holds and breathing). Side views face right; lying poses have the head on the left.
import { dir, BONE } from './skeleton.js';

const add = (a, b) => [a[0] + b[0], a[1] + b[1]];
const mul = (a, k) => [a[0] * k, a[1] * k];
const ang = (from, to) => ((Math.atan2(to[0] - from[0], -(to[1] - from[1])) * 180) / Math.PI + 360) % 360;
const along = (p, deg, d) => add(p, mul(dir(deg), d));
const F = 135; // floor (ankle height for standing feet)
const LEGS = BONE.thigh + BONE.shin;

// ---------- reusable bases ----------
// Standing, side view (facing right)
const SIDE = { hip: [100, F - LEGS], neck: [101, 40], hr: 4, aL: [178, 176], aR: [182, 182], lL: [180, 180], lR: [180, 180] };
// Standing, front view
const FRONT = { hip: [100, F - LEGS + 0.4], neck: [100, 40], hr: 0, aL: [188, 182], aR: [172, 178], lL: [181, 180], lR: [179, 180] };
// Lying on the back, knees bent, feet flat (head left)
const SUP = { hip: [92, 126], neck: [40, 126], hr: 0, aL: [97, 92], aR: [96, 92], lL: { to: [121, 132], b: 'up' }, lR: { to: [120, 132], b: 'up' } };
const SUP_TABLE = { ...SUP, lL: [8, 92], lR: [4, 90] }; // legs in tabletop
const SUP_FLAT = { ...SUP, lL: [92, 91], lR: [91, 90] };
// Hands and knees (tabletop), facing right
const QUAD = { hip: [80, 104], neck: [122, 93.5], hr: 14, aL: { to: [121, 133], b: 1 }, aR: { to: [120, 133], b: 1 }, lL: [178, 270], lR: [180, 270] };
// Lying face down (head right)
const PRONE = { hip: [84, 127], neck: [130, 127], hr: 0, aL: { to: [118, 132], b: 1 }, aR: { to: [117, 132], b: 1 }, lL: [268, 270], lR: [270, 271] };
// Straight body line from the feet (planks / push-ups): returns hip & neck for a body angle (deg from vertical)
const line = (ankle, deg) => { const hip = along(ankle, deg, LEGS); return { hip, neck: along(hip, deg, BONE.torso), lL: [deg + 180, deg + 180], lR: [deg + 181, deg + 181] }; };
const kneeLine = (knee, deg, foot) => { const hip = along(knee, deg, BONE.thigh); const sh = [ang(knee, foot), ang(knee, foot)]; return { hip, neck: along(hip, deg, BONE.torso), lL: [deg + 180, ang(knee, foot)], lR: [deg + 181, ang(knee, foot) + 1], _ : sh }; };
// Seated cross-legged (front view)
const CROSS = { hip: [100, 120], neck: [100, 78], hr: 0, aL: { to: [80, 120], b: 'back' }, aR: { to: [120, 120], b: 'fwd' }, lL: [242, 100], lR: [118, 260] };
// Seated on a chair (side view)
const CHAIR = { hip: [80, 99], neck: [82, 57], hr: 3, aL: { to: [100, 100], b: 1 }, aR: { to: [99, 101], b: 1 }, lL: [92, 180], lR: [90, 180] };

const legsTo = (fl, fr, b = 'fwd') => ({ lL: { to: fl, b }, lR: { to: fr, b } });
const armsTo = (hl, hr, b = 1) => ({ aL: { to: hl, b }, aR: { to: hr, b } });

// ---------- helpers that build common movements ----------
const squatLow = { hip: [78, 109], neck: [106, 76], hr: -6, ...legsTo([100, F], [99, F]), aL: [92, 90], aR: [90, 88] };
const plankHigh = (ankleX = 54, deg = 71, handX = 140) => ({ ...line([ankleX, 132], deg), hr: 10, ...armsTo([handX, 133], [handX - 1, 133], 'back') });
const plankLow = (ankleX = 54, deg = 81, handX = 140) => ({ ...line([ankleX, 132], deg), hr: 6, ...armsTo([handX, 133], [handX - 1, 133], 'back') });
const forearm = (ankleX = 52, deg = 78) => { const L = line([ankleX, 132], deg); const sh = along(L.neck, deg + 180, 3); return { ...L, hr: 8, aL: [180, 92], aR: [181, 91], _sh: sh }; };

export const SPECS = {
  // ======================= SQUATS & LEGS =======================
  squat: { view: 'side', frames: [
    { ...SIDE, cue: 'Stand tall, feet hip-width', hold: 400, dur: 1700 },
    { ...squatLow, cue: 'Inhale · hips back & down', hold: 400, dur: 1200 },
  ], thumb: 1, endCue: 'Exhale · drive up through heels' },
  sumo: { view: 'front', frames: [
    { ...FRONT, hip: [100, 86], ...legsTo([76, F], [124, F], 1), lR: { to: [124, F], b: -1 }, aL: { to: [98, 70], b: 'down' }, aR: { to: [102, 70], b: 'down' }, cue: 'Wide stance, toes out', hold: 400, dur: 1700 },
    { ...FRONT, hip: [100, 106], lL: { to: [76, F], b: 1 }, lR: { to: [124, F], b: -1 }, aL: { to: [98, 88], b: 'down' }, aR: { to: [102, 88], b: 'down' }, cue: 'Inhale · knees out over toes', hold: 400, dur: 1200 },
  ], thumb: 1 },
  squatjump: { view: 'side', frames: [
    { ...SIDE, aL: [200, 200], aR: [202, 202], cue: 'Ready', dur: 500 },
    { ...squatLow, aL: [205, 200], aR: [207, 202], cue: 'Load · hips back', dur: 380 },
    { ...SIDE, hip: [101, 66], neck: [102, 24], aL: [8, 6], aR: [12, 8], lL: [184, 190], lR: [182, 188], cue: 'Explode up', dur: 380 },
    { ...squatLow, cue: 'Land softly', dur: 500, hold: 150 },
  ], thumb: 2 },
  squatpulse: { view: 'side', frames: [
    { ...squatLow, cue: 'Stay low', dur: 420 },
    { ...squatLow, hip: [80, 102], neck: [104, 68], cue: 'Pulse', dur: 420 },
  ], thumb: 0 },
  squatpress: { view: 'side', frames: [
    { ...SIDE, aL: [168, 10], aR: [170, 12], cue: 'Weights at shoulders', hold: 300, dur: 1500 },
    { ...squatLow, aL: [150, 15], aR: [152, 17], cue: 'Inhale · squat', hold: 200, dur: 1200 },
    { ...SIDE, aL: [2, 0], aR: [4, 2], cue: 'Exhale · stand & press', hold: 400, dur: 1200 },
  ], thumb: 2 },
  chairsquat: { view: 'side', prop: 'chairsquat', frames: [
    { ...CHAIR, hip: [80, 100], neck: [86, 58], ...legsTo([106, F], [105, F]), aL: [95, 90], aR: [93, 88], cue: 'Sit tall, feet flat', hold: 500, dur: 900 },
    { ...CHAIR, hip: [84, 100], neck: [116, 73], ...legsTo([106, F], [105, F]), aL: [95, 92], aR: [93, 90], hr: -10, cue: 'Lean forward', dur: 1200 },
    { ...SIDE, hip: [104, F - LEGS], neck: [105, 40], lL: [180, 180], lR: [180, 180], aL: [178, 176], cue: 'Exhale · stand up', hold: 500, dur: 1800 },
  ], thumb: 0 },
  wallsit: { view: 'side', prop: 'wallsit', frames: [
    { hip: [80, 103], neck: [80, 61], hr: 2, ...legsTo([108, F], [107, F]), ...armsTo([102, 100], [101, 101]), cue: 'Back flat on the wall', hold: 2500, dur: 1500 },
    { hip: [80, 103], neck: [80, 61], hr: 2, ...legsTo([108, F], [107, F]), ...armsTo([102, 100], [101, 101]), arch: -0.5, cue: 'Hold · knees over ankles · breathe', hold: 2500, dur: 1500 },
  ], thumb: 0 },
  lunge: { view: 'side', frames: [
    { ...SIDE, hip: [96, F - LEGS], neck: [96, 40], aL: [182, 160], aR: [180, 160], cue: 'Stand tall', hold: 400, dur: 1400 },
    { hip: [102, 106], neck: [102, 64], hr: 3, lL: { to: [130, F], b: -1 }, lR: { to: [72, 132], b: -1 }, aL: [182, 160], aR: [180, 160], cue: 'Step forward · lower back knee', hold: 400, dur: 1300 },
  ], thumb: 1, endCue: 'Push through front heel to return' },
  revlunge: { view: 'side', frames: [
    { ...SIDE, hip: [124, F - LEGS], neck: [124, 40], aL: [182, 160], aR: [180, 160], lL: [180, 180], lR: [180, 180], cue: 'Stand tall', hold: 400, dur: 1400 },
    { hip: [104, 106], neck: [104, 64], hr: 3, lL: { to: [128, F], b: -1 }, lR: { to: [74, 132], b: -1 }, aL: [182, 160], aR: [180, 160], cue: 'Step back · both knees 90°', hold: 400, dur: 1300 },
  ], thumb: 1 },
  jumplunge: { view: 'side', frames: [
    { hip: [100, 106], neck: [101, 64], lL: { to: [128, F], b: -1 }, lR: { to: [72, 132], b: -1 }, aL: [160, 130], aR: [205, 200], cue: 'Lunge', dur: 420 },
    { hip: [100, 82], neck: [101, 40], lL: [160, 200], lR: [200, 170], aL: [180, 170], aR: [180, 170], cue: 'Jump & switch', dur: 420 },
    { hip: [100, 106], neck: [101, 64], lL: { to: [72, 132], b: -1 }, lR: { to: [128, F], b: -1 }, aL: [205, 200], aR: [160, 130], cue: 'Land softly', dur: 420 },
    { hip: [100, 82], neck: [101, 40], lL: [200, 170], lR: [160, 200], aL: [180, 170], aR: [180, 170], cue: 'Jump & switch', dur: 420 },
  ], thumb: 0 },
  stepup: { view: 'side', prop: 'stepup', frames: [
    { ...SIDE, hip: [96, F - LEGS], neck: [97, 40], cue: 'Face the step', hold: 300, dur: 900 },
    { hip: [100, 83], neck: [103, 41], hr: 2, lL: { to: [122, 114], b: 'fwd' }, lR: [180, 180], aL: [182, 172], aR: [175, 172], cue: 'Whole foot on the step', dur: 1200 },
    { hip: [122, 114 - LEGS], neck: [123, 20], hr: 3, lL: [180, 180], lR: [182, 182], aL: [178, 176], aR: [182, 180], cue: 'Drive up through the heel', hold: 400, dur: 1100 },
    { hip: [104, 90], neck: [105, 48], lL: { to: [122, 114], b: -1 }, lR: { to: [96, F], b: -1 }, aL: [178, 176], aR: [182, 180], cue: 'Step down with control', dur: 900 },
  ], thumb: 2 },
  calfraise: { view: 'side', frames: [
    { ...SIDE, cue: 'Stand tall', hold: 300, dur: 1100 },
    { ...SIDE, hip: [100, F - LEGS - 6], neck: [101, 34], lL: [180, 180], lR: [180, 180], cue: 'Rise onto toes · pause', hold: 700, dur: 1500 },
  ], thumb: 1 },

  // ======================= PUSH-UPS & PLANKS =======================
  pushup: { view: 'side', lie: 'prone', frames: [
    { ...plankHigh(), cue: 'Body in one straight line', hold: 300, dur: 1600 },
    { ...plankLow(), cue: 'Inhale · lower chest', hold: 250, dur: 1100 },
  ], thumb: 0, endCue: 'Exhale · press up' },
  declinepush: { view: 'side', lie: 'prone', prop: 'declinebench', frames: [
    { ...line([46, 106], 76), hr: 12, ...armsTo([140, 133], [139, 133]), cue: 'Feet on the bench, body straight', hold: 300, dur: 1600 },
    { ...line([46, 106], 84), hr: 8, ...armsTo([140, 133], [139, 133]), cue: 'Inhale · lower with control', hold: 250, dur: 1100 },
  ], thumb: 0 },
  kneepushup: { view: 'side', lie: 'prone', frames: [
    { ...kneeLine([82, 131], 66, [60, 120]), hr: 10, ...armsTo([139, 133], [138, 133]), cue: 'Knees down, hips in line', hold: 300, dur: 1500 },
    { ...kneeLine([82, 131], 80, [60, 120]), hr: 6, ...armsTo([139, 133], [138, 133]), cue: 'Lower chest towards floor', hold: 250, dur: 1100 },
  ], thumb: 0 },
  wallpush: { view: 'side', prop: 'wallpush', frames: [
    { ...line([76, F], 22), hr: 6, ...armsTo([146, 54], [146, 56]), cue: 'Arms straight, body in a line', hold: 300, dur: 1400 },
    { ...line([76, F], 32), hr: 6, ...armsTo([146, 54], [146, 56]), cue: 'Bend elbows · chest to wall', hold: 300, dur: 1000 },
  ], thumb: 0 },
  inclinepush: { view: 'side', lie: 'prone', prop: 'inclinebench', frames: [
    { ...line([60, F], 50), hr: 10, ...armsTo([140, 104], [139, 104]), cue: 'Hands on the bench edge', hold: 300, dur: 1400 },
    { ...line([60, F], 60), hr: 8, ...armsTo([140, 104], [139, 104]), cue: 'Lower chest to the edge', hold: 250, dur: 1000 },
  ], thumb: 0 },
  plank: { view: 'side', lie: 'prone', frames: [
    { ...forearm(), cue: 'Elbows under shoulders', hold: 2500, dur: 1200 },
    { ...forearm(52, 78.6), cue: 'Hold · squeeze glutes · breathe', hold: 2500, dur: 1200 },
  ], thumb: 0 },
  kneeplank: { view: 'side', lie: 'prone', frames: [
    { ...kneeLine([82, 131], 72, [60, 122]), hr: 8, aL: [180, 92], aR: [181, 91], cue: 'Forearms down, knees down', hold: 600, dur: 1200 },
    { ...kneeLine([82, 131], 71, [60, 122]), hr: 8, aL: [180, 92], aR: [181, 91], arch: 0.6, cue: 'Hold · belly drawn in · breathe', hold: 2500, dur: 1200 },
  ], thumb: 1 },
  shouldertap: { view: 'side', lie: 'prone', frames: [
    { ...plankHigh(56, 71, 140), cue: 'High plank, feet wide', hold: 200, dur: 600 },
    { ...plankHigh(56, 71, 140), aL: { to: [138, 104], b: 1 }, cue: 'Tap opposite shoulder', hold: 250, dur: 600 },
    { ...plankHigh(56, 71, 140), cue: 'Hips stay still', hold: 200, dur: 600 },
    { ...plankHigh(56, 71, 140), aR: { to: [137, 104], b: 1 }, cue: 'Other side', hold: 250, dur: 600 },
  ], thumb: 1 },
  plankjack: { view: 'side', lie: 'prone', frames: [
    { ...plankHigh(56, 71, 140), cue: 'High plank', dur: 420 },
    { ...plankHigh(56, 71, 140), lL: [252, 248], lR: [258, 262], cue: 'Jump feet wide', dur: 420 },
  ], thumb: 1 },
  updown: { view: 'side', lie: 'prone', frames: [
    { ...forearm(52, 78), cue: 'Forearm plank', hold: 200, dur: 700 },
    { ...line([52, 132], 74), hr: 9, aL: { to: [140, 133], b: 1 }, aR: [181, 91], cue: 'Press up one hand', dur: 700 },
    { ...plankHigh(52, 71, 140), cue: 'High plank', hold: 200, dur: 700 },
    { ...line([52, 132], 74), hr: 9, aL: [180, 92], aR: { to: [139, 133], b: 1 }, cue: 'Lower one forearm', dur: 700 },
  ], thumb: 2 },
  mountain: { view: 'side', lie: 'prone', frames: [
    { ...plankHigh(56, 71, 140), lL: { to: [110, 124], b: 'up' }, lR: { to: [58, 132], b: 'up' }, cue: 'Drive knee to chest', dur: 330 },
    { ...plankHigh(56, 71, 140), lR: { to: [110, 124], b: 'up' }, lL: { to: [58, 132], b: 'up' }, cue: 'Switch · hips level', dur: 330 },
  ], thumb: 0 },
  sideplank: { view: 'side', faceCamera: true, frames: [
    { hip: [96, 126], neck: [138, 112], hr: -10, aL: [180, 95], aR: { to: [100, 118], b: 'up' }, lL: [262, 268], lR: [264, 270], cue: 'Elbow under shoulder', hold: 400, dur: 1100 },
    { hip: [92, 112], neck: [133, 101], hr: -12, aL: [180, 95], aR: [8, 4], ...{ lL: [254, 254], lR: [255, 255] }, cue: 'Lift hips · straight line · hold', hold: 2500, dur: 1300 },
  ], thumb: 1 },
  kneesideplank: { view: 'side', faceCamera: true, frames: [
    { hip: [96, 125], neck: [138, 112], hr: -10, aL: [180, 95], aR: { to: [100, 117], b: 'up' }, lL: [250, 300], lR: [252, 302], cue: 'Forearm & knees down', hold: 400, dur: 1100 },
    { hip: [94, 113], neck: [134, 100], hr: -12, aL: [180, 95], aR: [10, 6], lL: [234, 300], lR: [236, 302], cue: 'Lift hips · hold · breathe', hold: 2500, dur: 1200 },
  ], thumb: 1 },
  sideplankdip: { view: 'side', faceCamera: true, frames: [
    { hip: [94, 113], neck: [134, 100], hr: -12, aL: [180, 95], aR: { to: [100, 106], b: 1 }, lL: [234, 300], lR: [236, 302], cue: 'Exhale · hips up', dur: 1000 },
    { hip: [96, 124], neck: [137, 108], hr: -10, aL: [180, 95], aR: { to: [101, 116], b: 1 }, lL: [248, 300], lR: [250, 302], cue: 'Inhale · dip slowly', dur: 1000 },
  ], thumb: 0 },

  // ======================= FLOOR CORE (lying on the back) =======================
  bridge: { view: 'side', lie: 'supine', frames: [
    { ...SUP, aL: [97, 92], aR: [96, 92], cue: 'Feet flat, arms by sides', hold: 400, dur: 1300 },
    { ...SUP, hip: [88, 106], neck: [50, 126], aL: [97, 92], aR: [96, 92], cue: 'Exhale · squeeze glutes, lift', hold: 900, dur: 1700 },
  ], thumb: 1, endCue: 'Inhale · lower slowly' },
  hipthrust: { view: 'side', lie: 'supine', prop: 'hipthrust', frames: [
    { hip: [72, 128], neck: [40, 104], hr: 10, ...legsTo([110, 134], [109, 134]), ...armsTo([30, 104], [29, 104], 1), cue: 'Upper back on the bench', hold: 300, dur: 1400 },
    { hip: [82, 106], neck: [40, 106], hr: 20, ...legsTo([110, 134], [109, 134]), ...armsTo([30, 104], [29, 104], 1), cue: 'Drive hips up · thighs level', hold: 900, dur: 1600 },
  ], thumb: 1 },
  bridgemarch: { view: 'side', lie: 'supine', frames: [
    { ...SUP, hip: [88, 106], neck: [50, 126], aL: [97, 92], aR: [96, 92], cue: 'Hold the bridge', hold: 400, dur: 800 },
    { ...SUP, hip: [88, 106], neck: [50, 126], aL: [97, 92], aR: [96, 92], lL: [30, 120], cue: 'Lift one foot · hips level', hold: 400, dur: 800 },
    { ...SUP, hip: [88, 106], neck: [50, 126], aL: [97, 92], aR: [96, 92], cue: 'Place it down', hold: 300, dur: 800 },
    { ...SUP, hip: [88, 106], neck: [50, 126], aL: [97, 92], aR: [96, 92], lR: [30, 120], cue: 'Other foot', hold: 400, dur: 800 },
  ], thumb: 1 },
  figurefour: { view: 'side', lie: 'supine', frames: [
    { ...SUP, lR: { to: [120, 132], b: -1 }, lL: { to: [108, 104], b: -1 }, aL: [100, 92], cue: 'Ankle over opposite knee', hold: 600, dur: 1500 },
    { ...SUP, lR: [22, 98], lL: { to: [100, 100], b: -1 }, aL: { to: [98, 108], b: -1 }, aR: { to: [97, 109], b: -1 }, cue: 'Draw legs in · hold & breathe', hold: 3000, dur: 1500 },
  ], thumb: 1 },
  crookbreath: { view: 'side', lie: 'supine', frames: [
    { ...SUP, ...armsTo([70, 118], [68, 119], -1), arch: 0, cue: 'Inhale · ribs & belly expand', dur: 3500 },
    { ...SUP, ...armsTo([70, 116], [68, 117], -1), arch: -2.2, cue: 'Exhale · draw belly in gently', dur: 4500 },
  ], thumb: 0 },
  pelvictilt: { view: 'side', lie: 'supine', frames: [
    { ...SUP, aL: [97, 92], aR: [96, 92], arch: -2.5, cue: 'Neutral spine', hold: 500, dur: 1500 },
    { ...SUP, hip: [92, 127], neck: [40, 125], aL: [97, 92], aR: [96, 92], arch: 1.5, cue: 'Exhale · flatten low back', hold: 1000, dur: 1500 },
  ], thumb: 1 },
  heelslide: { view: 'side', lie: 'supine', frames: [
    { ...SUP, cue: 'Exhale · engage deep core', hold: 400, dur: 1800 },
    { ...SUP, lL: { to: [143, 131], b: -1 }, cue: 'Slide heel away slowly', hold: 300, dur: 1800 },
  ], thumb: 1, endCue: 'Inhale · slide back' },
  heelslidelift: { view: 'side', lie: 'supine', frames: [
    { ...SUP, cue: 'Core in, back gently down', hold: 300, dur: 1600 },
    { ...SUP, lL: { to: [143, 131], b: -1 }, cue: 'Slide heel away', hold: 200, dur: 1000 },
    { ...SUP, lL: [84, 84], cue: 'Lift straight leg a little', hold: 600, dur: 1000 },
    { ...SUP, lL: { to: [143, 131], b: -1 }, cue: 'Lower', hold: 200, dur: 1600 },
  ], thumb: 2 },
  supinemarch: { view: 'side', lie: 'supine', frames: [
    { ...SUP, cue: 'Feet flat, pelvis still', hold: 300, dur: 1300 },
    { ...SUP, lL: [4, 92], cue: 'Exhale · lift to tabletop', hold: 400, dur: 1300 },
    { ...SUP, cue: 'Inhale · lower', hold: 300, dur: 1300 },
    { ...SUP, lR: [4, 92], cue: 'Other leg', hold: 400, dur: 1300 },
  ], thumb: 1 },
  toetap: { view: 'side', lie: 'supine', frames: [
    { ...SUP_TABLE, cue: 'Tabletop · back gently down', hold: 400, dur: 1500 },
    { ...SUP_TABLE, lL: [60, 150], cue: 'Inhale · tap heel down', hold: 200, dur: 1300 },
    { ...SUP_TABLE, cue: 'Exhale · return', hold: 400, dur: 1500 },
    { ...SUP_TABLE, lR: [60, 150], cue: 'Other leg', hold: 200, dur: 1300 },
  ], thumb: 1 },
  deadbug: { view: 'side', lie: 'supine', frames: [
    { ...SUP_TABLE, aL: [0, 0], aR: [2, 2], cue: 'Arms up, knees over hips', hold: 300, dur: 1500 },
    { ...SUP_TABLE, aL: [282, 278], aR: [2, 2], lR: [86, 88], cue: 'Exhale · extend opposite arm & leg', hold: 500, dur: 1500 },
    { ...SUP_TABLE, aL: [0, 0], aR: [2, 2], cue: 'Inhale · return', hold: 300, dur: 1500 },
    { ...SUP_TABLE, aR: [282, 278], aL: [0, 0], lL: [86, 88], cue: 'Switch sides', hold: 500, dur: 1500 },
  ], thumb: 1 },
  crunch: { view: 'side', lie: 'supine', frames: [
    { ...SUP, aL: { to: [36, 116], b: 'up' }, aR: { to: [35, 117], b: 'up' }, cue: 'Fingertips by temples, chin tucked', hold: 300, dur: 1100 },
    { ...SUP, neck: [46, 113], hr: 22, aL: { to: [44, 102], b: 'up' }, aR: { to: [43, 103], b: 'up' }, cue: 'Exhale · lift shoulder blades only', hold: 500, dur: 1300 },
  ], thumb: 1 },
  heeltaps: { view: 'side', lie: 'supine', frames: [
    { ...SUP, neck: [46, 110], hr: 15, aL: [100, 95], aR: [98, 93], cue: 'Shoulders lifted', dur: 700 },
    { ...SUP, neck: [47, 108], hr: 15, aL: { to: [116, 128], b: -1 }, aR: [98, 93], cue: 'Reach & tap heel', dur: 700 },
    { ...SUP, neck: [46, 110], hr: 15, aL: [100, 95], aR: [98, 93], cue: 'Centre', dur: 700 },
    { ...SUP, neck: [47, 108], hr: 15, aR: { to: [115, 127], b: -1 }, aL: [100, 95], cue: 'Other side', dur: 700 },
  ], thumb: 1 },
  bicycle: { view: 'side', lie: 'supine', frames: [
    { ...SUP, neck: [48, 106], hr: 16, aL: { to: [52, 98], b: 1 }, aR: { to: [51, 99], b: 1 }, lL: [30, 120], lR: [84, 86], cue: 'Elbow towards opposite knee', dur: 800 },
    { ...SUP, neck: [48, 106], hr: 16, aL: { to: [52, 98], b: 1 }, aR: { to: [51, 99], b: 1 }, lR: [30, 120], lL: [84, 86], cue: 'Switch · slow & controlled', dur: 800 },
  ], thumb: 0 },
  revcrunch: { view: 'side', lie: 'supine', frames: [
    { ...SUP_TABLE, aL: [97, 92], aR: [96, 92], cue: 'Tabletop legs', hold: 300, dur: 1100 },
    { ...SUP_TABLE, hip: [94, 120], neck: [42, 126], aL: [97, 92], aR: [96, 92], lL: [320, 70], lR: [318, 68], cue: 'Exhale · curl knees to chest', hold: 400, dur: 1500 },
  ], thumb: 1 },
  hollow: { view: 'side', lie: 'supine', frames: [
    { ...SUP_FLAT, aL: [280, 278], aR: [278, 276], cue: 'Low back pressed down', hold: 500, dur: 1500 },
    { ...SUP_FLAT, neck: [46, 112], hr: 12, aL: [290, 290], aR: [288, 288], lL: [80, 80], lR: [79, 79], cue: 'Lift shoulders & legs · hold', hold: 2500, dur: 1500 },
  ], thumb: 1 },
  toetouch: { view: 'side', lie: 'supine', frames: [
    { ...SUP_FLAT, aL: [2, 0], aR: [4, 2], lL: [10, 10], lR: [12, 12], cue: 'Legs to the ceiling', hold: 300, dur: 1100 },
    { ...SUP_FLAT, neck: [50, 104], hr: 18, aL: { to: [100, 78], b: -1 }, aR: { to: [99, 79], b: -1 }, lL: [10, 10], lR: [12, 12], cue: 'Exhale · reach for toes', hold: 400, dur: 1300 },
  ], thumb: 1 },
  flutter: { view: 'side', lie: 'supine', frames: [
    { ...SUP_FLAT, ...armsTo([88, 131], [87, 131], -1), lL: [76, 76], lR: [84, 84], cue: 'Small fast kicks', dur: 300 },
    { ...SUP_FLAT, ...armsTo([88, 131], [87, 131], -1), lL: [84, 84], lR: [76, 76], cue: 'Back stays down', dur: 300 },
  ], thumb: 0 },
  inout: { view: 'side', frames: [
    { hip: [100, 126], neck: [78, 90], hr: 25, ...armsTo([74, 133], [73, 133], 1), lL: [42, 110], lR: [40, 108], cue: 'Lean back · knees in', dur: 800 },
    { hip: [100, 126], neck: [74, 92], hr: 22, ...armsTo([74, 133], [73, 133], 1), lL: [76, 82], lR: [74, 80], cue: 'Legs out · don\'t touch down', dur: 800 },
  ], thumb: 0 },
  twist: { view: 'side', frames: [
    { hip: [100, 127], neck: [80, 90], hr: 25, ...armsTo([112, 104], [111, 105], 1), lL: [40, 108], lR: [38, 106], cue: 'Lean back, chest tall', dur: 700 },
    { hip: [100, 127], neck: [80, 90], hr: 30, ...armsTo([80, 128], [79, 128], -1), lL: [40, 108], lR: [38, 106], cue: 'Rotate · touch beside hip', dur: 700 },
    { hip: [100, 127], neck: [80, 90], hr: 25, ...armsTo([112, 104], [111, 105], 1), lL: [40, 108], lR: [38, 106], cue: 'Centre', dur: 700 },
    { hip: [100, 127], neck: [80, 90], hr: 20, ...armsTo([120, 126], [119, 126], 1), lL: [40, 108], lR: [38, 106], cue: 'Other side', dur: 700 },
  ], thumb: 1 },
  legsup: { view: 'side', lie: 'supine', prop: 'legsup', frames: [
    { ...SUP_FLAT, hip: [112, 126], neck: [60, 126], aL: [100, 92], aR: [98, 92], lL: [2, 2], lR: [3, 3], cue: 'Legs resting on the wall', dur: 4000 },
    { ...SUP_FLAT, hip: [112, 126], neck: [60, 126], aL: [100, 92], aR: [98, 92], lL: [2, 2], lR: [3, 3], arch: -1.2, cue: 'Breathe slowly · relax', dur: 5000 },
  ], thumb: 0 },
  savasana: { view: 'side', lie: 'supine', frames: [
    { ...SUP_FLAT, aL: [100, 92], aR: [98, 92], cue: 'Inhale slowly', dur: 3500 },
    { ...SUP_FLAT, aL: [100, 92], aR: [98, 92], arch: -1.5, cue: 'Exhale · let go of tension', dur: 4500 },
  ], thumb: 0 },
  supinetwist: { view: 'side', lie: 'supine', frames: [
    { ...SUP, aL: [97, 92], aR: [96, 92], cue: 'Knees bent, arms out wide', hold: 600, dur: 2000 },
    { ...SUP, aL: [97, 92], aR: [96, 92], lL: [72, 120], lR: [76, 122], hr: -20, cue: 'Let knees fall to one side · hold', hold: 3000, dur: 2000 },
  ], thumb: 1 },
  press: { view: 'side', lie: 'supine', frames: [
    { ...SUP, aL: [112, 2], aR: [114, 4], cue: 'Elbows down, weights at chest level', hold: 300, dur: 1100 },
    { ...SUP, aL: [2, 0], aR: [4, 2], cue: 'Exhale · press straight up', hold: 400, dur: 1600 },
  ], thumb: 1, endCue: 'Inhale · lower slowly' },
  fly: { view: 'side', lie: 'supine', frames: [
    { ...SUP, aL: [2, 0], aR: [4, 2], cue: 'Weights above chest', hold: 300, dur: 1700 },
    { ...SUP, aL: [272, 250], aR: [276, 252], cue: 'Inhale · open arms wide (soft elbows)', hold: 300, dur: 1300 },
  ], thumb: 1 },

  // ======================= HANDS & KNEES =======================
  quadlift: { view: 'side', lie: 'prone', frames: [
    { ...QUAD, arch: -2.5, cue: 'Inhale · belly relaxes down', dur: 3000 },
    { ...QUAD, arch: 1.5, cue: 'Exhale · hug belly up, back stays flat', hold: 1500, dur: 3000 },
  ], thumb: 1 },
  birddog: { view: 'side', lie: 'prone', frames: [
    { ...QUAD, cue: 'Hands under shoulders, knees under hips', hold: 300, dur: 1300 },
    { ...QUAD, aL: [86, 86], lR: [272, 272], cue: 'Reach opposite arm & leg · hold', hold: 900, dur: 1300 },
    { ...QUAD, cue: 'Return with control', hold: 300, dur: 1300 },
    { ...QUAD, aR: [86, 86], lL: [272, 272], cue: 'Switch sides', hold: 900, dur: 1300 },
  ], thumb: 1 },
  catcow: { view: 'side', lie: 'prone', frames: [
    { ...QUAD, hr: -22, arch: -6, cue: 'Inhale · cow: chest forward, gaze up', hold: 600, dur: 2500 },
    { ...QUAD, hr: 48, arch: 8, cue: 'Exhale · cat: round your spine', hold: 600, dur: 2500 },
  ], thumb: 1 },
  donkey: { view: 'side', lie: 'prone', frames: [
    { ...QUAD, cue: 'Tabletop, back flat', hold: 300, dur: 1100 },
    { ...QUAD, lL: [272, 2], cue: 'Exhale · press foot to ceiling', hold: 600, dur: 1300 },
  ], thumb: 1 },
  hydrant: { view: 'side', lie: 'prone', frames: [
    { ...QUAD, cue: 'Tabletop, hips level', hold: 300, dur: 1200 },
    { ...QUAD, lL: [236, 268], cue: 'Lift knee out to the side', hold: 600, dur: 1300 },
  ], thumb: 1 },
  child: { view: 'side', lie: 'prone', frames: [
    { hip: [86, 113], neck: [126, 120], hr: 20, aL: [92, 90], aR: [91, 89], lL: [112, 266], lR: [113, 267], arch: 4, cue: 'Sit back towards heels', dur: 3500 },
    { hip: [84, 116], neck: [125, 123], hr: 22, aL: [94, 90], aR: [93, 89], lL: [108, 266], lR: [109, 267], arch: 5, cue: 'Breathe into your back · relax', dur: 4500 },
  ], thumb: 0 },
  cobra: { view: 'side', lie: 'prone', frames: [
    { ...PRONE, cue: 'Hands under shoulders', hold: 400, dur: 1800 },
    { ...PRONE, neck: [124, 108], hr: -8, ...armsTo([118, 132], [117, 132], 1), arch: -6, cue: 'Inhale · lift chest, elbows soft · hold', hold: 1800, dur: 1800 },
  ], thumb: 1 },
  superman: { view: 'side', lie: 'prone', frames: [
    { ...PRONE, aL: [92, 90], aR: [91, 90], cue: 'Arms overhead', hold: 300, dur: 1300 },
    { ...PRONE, neck: [128, 120], hr: -4, aL: [80, 80], aR: [81, 81], lL: [262, 262], lR: [263, 263], arch: -4, cue: 'Lift arms, chest & legs · hold', hold: 1500, dur: 1300 },
  ], thumb: 1 },
  downdog: { view: 'side', lie: 'prone', frames: [
    { hip: [96, 90], neck: [128, 117], hr: 0, ...armsTo([146, 133], [145, 133], -1), lL: { to: [66, F], b: 1 }, lR: { to: [65, F], b: 1 }, cue: 'Hips high, long spine', hold: 1500, dur: 1800 },
    { hip: [97, 88], neck: [128, 115], hr: 0, ...armsTo([146, 133], [145, 133], -1), lL: { to: [66, F], b: 1 }, lR: { to: [65, F], b: 1 }, cue: 'Heels reach down · breathe', hold: 1500, dur: 1800 },
  ], thumb: 0 },
  inchworm: { view: 'side', lie: 'prone', frames: [
    { ...SIDE, hip: [70, F - LEGS], neck: [71, 40], lL: [180, 180], lR: [180, 180], cue: 'Stand tall', hold: 300, dur: 1300 },
    { hip: [72, 84], neck: [96, 118], hr: 10, ...armsTo([96, 133], [95, 133], -1), lL: { to: [68, F], b: 1 }, lR: { to: [67, F], b: 1 }, cue: 'Hinge · hands to floor', dur: 1200 },
    { hip: [84, 104], neck: [124, 116], hr: 10, ...armsTo([124, 133], [123, 133], -1), lL: { to: [68, F], b: 1 }, lR: { to: [67, F], b: 1 }, cue: 'Walk hands out', dur: 1200 },
    { ...plankHigh(68, 71, 152), cue: 'Plank · core tight', hold: 500, dur: 1200 },
    { hip: [84, 104], neck: [124, 116], hr: 10, ...armsTo([124, 133], [123, 133], -1), lL: { to: [68, F], b: 1 }, lR: { to: [67, F], b: 1 }, cue: 'Walk hands back', dur: 1200 },
    { hip: [72, 84], neck: [96, 118], hr: 10, ...armsTo([96, 133], [95, 133], -1), lL: { to: [68, F], b: 1 }, lR: { to: [67, F], b: 1 }, cue: 'Roll up to stand', dur: 1300 },
  ], thumb: 3 },
  squatstepback: { view: 'side', lie: 'prone', frames: [
    { ...SIDE, hip: [104, F - LEGS], neck: [105, 40], cue: 'Stand tall', hold: 200, dur: 900 },
    { hip: [92, 104], neck: [122, 80], hr: 10, ...armsTo([126, 133], [125, 133], -1), ...legsTo([106, F], [105, F]), cue: 'Squat · hands down', dur: 800 },
    { hip: [96, 106], neck: [132, 92], hr: 10, ...armsTo([132, 133], [131, 133], 'back'), lL: { to: [108, F], b: 'fwd' }, lR: { to: [56, 132], b: 'up' }, cue: 'Step one foot back', dur: 800 },
    { ...plankHigh(56, 71, 140), cue: 'Plank', hold: 300, dur: 800 },
    { hip: [96, 106], neck: [132, 92], hr: 10, ...armsTo([132, 133], [131, 133], 'back'), lL: { to: [108, F], b: 'fwd' }, lR: { to: [56, 132], b: 'up' }, cue: 'Step in', dur: 800 },
    { hip: [92, 104], neck: [122, 80], hr: 10, ...armsTo([126, 133], [125, 133], -1), ...legsTo([106, F], [105, F]), cue: 'Stand up', dur: 900 },
  ], thumb: 3 },
  burpee: { view: 'side', lie: 'prone', frames: [
    { ...SIDE, hip: [104, F - LEGS], neck: [105, 40], cue: 'Stand', dur: 450 },
    { hip: [92, 104], neck: [122, 80], hr: 10, ...armsTo([126, 133], [125, 133], -1), ...legsTo([106, F], [105, F]), cue: 'Squat · hands down', dur: 380 },
    { ...plankHigh(56, 71, 140), cue: 'Jump back to plank', hold: 150, dur: 380 },
    { hip: [92, 104], neck: [122, 80], hr: 10, ...armsTo([126, 133], [125, 133], -1), ...legsTo([106, F], [105, F]), cue: 'Jump feet in', dur: 380 },
    { ...SIDE, hip: [104, 66], neck: [105, 24], aL: [6, 4], aR: [10, 8], lL: [182, 188], lR: [180, 186], cue: 'Jump up · land softly', dur: 450 },
  ], thumb: 2 },

  // ======================= SIDE-LYING =======================
  sideleg: { view: 'side', faceCamera: true, frames: [
    { hip: [92, 122], neck: [50, 120], hr: 18, aL: [250, 330], aR: { to: [98, 116], b: 'up' }, lL: [95, 95], lR: [96, 96], cue: 'Lie on your side, hips stacked', hold: 300, dur: 1300 },
    { hip: [92, 122], neck: [50, 120], hr: 18, aL: [250, 330], aR: { to: [98, 116], b: 'up' }, lL: [70, 70], lR: [96, 96], cue: 'Exhale · lift top leg (toes forward)', hold: 500, dur: 1500 },
  ], thumb: 1 },
  clamshell: { view: 'side', faceCamera: true, frames: [
    { hip: [92, 122], neck: [50, 120], hr: 18, aL: [250, 330], aR: { to: [98, 116], b: 'up' }, lL: [100, 250], lR: [101, 251], cue: 'Knees bent, feet together', hold: 300, dur: 1300 },
    { hip: [92, 122], neck: [50, 120], hr: 18, aL: [250, 330], aR: { to: [98, 116], b: 'up' }, lL: [62, 214], lR: [101, 251], cue: 'Open top knee · feet stay together', hold: 600, dur: 1500 },
  ], thumb: 1 },
  openbook: { view: 'side', faceCamera: true, frames: [
    { hip: [92, 122], neck: [50, 120], hr: 18, aL: [118, 100], aR: [120, 102], lL: [100, 250], lR: [101, 251], cue: 'Arms forward, knees stacked', hold: 400, dur: 1800 },
    { hip: [92, 122], neck: [50, 120], hr: 0, aL: [2, 0], aR: [120, 102], lL: [100, 250], lR: [101, 251], cue: 'Open top arm up…', dur: 1500 },
    { hip: [92, 122], neck: [50, 120], hr: -25, aL: [262, 255], aR: [120, 102], lL: [100, 250], lR: [101, 251], cue: '…and across · eyes follow', hold: 1200, dur: 1500 },
    { hip: [92, 122], neck: [50, 120], hr: 0, aL: [2, 0], aR: [120, 102], lL: [100, 250], lR: [101, 251], cue: 'Return through the centre', dur: 1500 },
  ], thumb: 2 },

  // ======================= STANDING CARDIO =======================
  jack: { view: 'front', frames: [
    { ...FRONT, aL: [196, 186], aR: [164, 174], cue: 'Feet together', dur: 380 },
    { ...FRONT, hip: [100, 82], neck: [100, 40], aL: [312, 340], aR: [48, 20], lL: [198, 196], lR: [162, 164], cue: 'Jump out · arms up', dur: 380 },
  ], thumb: 1 },
  star: { view: 'front', frames: [
    { ...FRONT, hip: [100, 96], neck: [100, 54], lL: { to: [90, F], b: 'back' }, lR: { to: [110, F], b: 'fwd' }, aL: { to: [86, 104], b: 'back' }, aR: { to: [114, 104], b: 'fwd' }, cue: 'Crouch · knees over toes', dur: 450 },
    { ...FRONT, hip: [100, 70], neck: [100, 28], aL: [306, 312], aR: [54, 48], lL: [206, 206], lR: [154, 154], cue: 'Explode into a star', dur: 450 },
  ], thumb: 1 },
  stepjack: { view: 'front', frames: [
    { ...FRONT, cue: 'Stand tall', dur: 550 },
    { ...FRONT, aL: [312, 340], aR: [48, 20], lL: [204, 180], cue: 'Step out · arms up', dur: 550 },
    { ...FRONT, cue: 'Step in', dur: 550 },
    { ...FRONT, aL: [312, 340], aR: [48, 20], lR: [156, 180], cue: 'Other side', dur: 550 },
  ], thumb: 1 },
  hop: { view: 'front', frames: [
    { ...FRONT, hip: [86, 80], neck: [86, 38], aL: [200, 140], aR: [160, 220], lL: [182, 176], lR: [178, 172], cue: 'Hop left', dur: 300 },
    { ...FRONT, hip: [100, 92], neck: [100, 50], aL: [200, 140], aR: [160, 220], lL: { to: [91, F], b: 'back' }, lR: { to: [109, F], b: 'fwd' }, cue: 'Land softly', dur: 300 },
    { ...FRONT, hip: [114, 80], neck: [114, 38], aL: [200, 140], aR: [160, 220], lL: [182, 188], lR: [178, 184], cue: 'Hop right', dur: 300 },
    { ...FRONT, hip: [100, 92], neck: [100, 50], aL: [200, 140], aR: [160, 220], lL: { to: [91, F], b: 'back' }, lR: { to: [109, F], b: 'fwd' }, cue: 'Land softly', dur: 300 },
  ], thumb: 0 },
  fastfeet: { view: 'front', frames: [
    { ...FRONT, hip: [100, 94], neck: [101, 52], aL: [200, 130], aR: [160, 230], lL: { to: [88, 131], b: 1 }, lR: { to: [112, F], b: -1 }, cue: 'Quick feet', dur: 170 },
    { ...FRONT, hip: [100, 94], neck: [101, 52], aL: [200, 130], aR: [160, 230], lL: { to: [88, F], b: 1 }, lR: { to: [112, 131], b: -1 }, cue: 'Stay low', dur: 170 },
  ], thumb: 0 },
  highknee: { view: 'side', frames: [
    { ...SIDE, hip: [100, 82], neck: [101, 40], lL: [92, 178], aL: [150, 30], aR: [205, 150], cue: 'Knee to hip height', dur: 330 },
    { ...SIDE, hip: [100, 82], neck: [101, 40], lR: [92, 178], aR: [150, 30], aL: [205, 150], cue: 'Switch fast · pump arms', dur: 330 },
  ], thumb: 0 },
  buttkick: { view: 'side', frames: [
    { ...SIDE, hip: [100, 82], neck: [102, 40], lL: [184, 12], aL: [205, 140], aR: [150, 40], cue: 'Heel to glutes', dur: 300 },
    { ...SIDE, hip: [100, 82], neck: [102, 40], lR: [184, 12], aR: [205, 140], aL: [150, 40], cue: 'Light & quick', dur: 300 },
  ], thumb: 0 },
  jog: { view: 'side', frames: [
    { ...SIDE, hip: [100, 82], neck: [102, 40], lL: [160, 200], lR: [190, 60], aL: [200, 130], aR: [150, 60], cue: 'Light jog in place', dur: 380 },
    { ...SIDE, hip: [100, 84], neck: [102, 42], lR: [160, 200], lL: [190, 60], aR: [200, 130], aL: [150, 60], cue: 'Land on the balls of feet', dur: 380 },
  ], thumb: 0 },
  march: { view: 'side', frames: [
    { ...SIDE, lL: [118, 180], aL: [200, 160], aR: [158, 140], cue: 'Lift knee', dur: 650 },
    { ...SIDE, cue: 'Stand tall', dur: 650 },
    { ...SIDE, lR: [118, 180], aR: [200, 160], aL: [158, 140], cue: 'Other knee', dur: 650 },
    { ...SIDE, cue: 'Swing arms', dur: 650 },
  ], thumb: 0 },
  marchreach: { view: 'side', frames: [
    { ...SIDE, lL: [118, 180], aL: [2, 0], aR: [4, 2], cue: 'Knee up · reach high', dur: 700 },
    { ...SIDE, cue: 'Lower', dur: 700 },
    { ...SIDE, lR: [118, 180], aL: [2, 0], aR: [4, 2], cue: 'Other knee · reach', dur: 700 },
    { ...SIDE, cue: 'Lower', dur: 700 },
  ], thumb: 0 },
  marchbreathe: { view: 'side', frames: [
    { ...SIDE, lL: [130, 180], aL: [60, 40], aR: [62, 42], cue: 'Inhale · arms rise', dur: 1500 },
    { ...SIDE, cue: 'Exhale · arms lower', dur: 1500 },
    { ...SIDE, lR: [130, 180], aL: [60, 40], aR: [62, 42], cue: 'Inhale · arms rise', dur: 1500 },
    { ...SIDE, cue: 'Exhale · arms lower', dur: 1500 },
  ], thumb: 0 },
  walk: { view: 'side', frames: [
    { ...SIDE, hip: [100, 84], lL: [160, 175], lR: [200, 210], aL: [205, 190], aR: [160, 140], cue: 'Heel strikes first', dur: 600 },
    { ...SIDE, hip: [100, 83], lL: [178, 182], lR: [182, 230], aL: [182, 176], aR: [182, 176], cue: 'Upright posture', dur: 600 },
    { ...SIDE, hip: [100, 84], lR: [160, 175], lL: [200, 210], aR: [205, 190], aL: [160, 140], cue: 'Swing arms naturally', dur: 600 },
    { ...SIDE, hip: [100, 83], lR: [178, 182], lL: [182, 230], aL: [182, 176], aR: [182, 176], cue: 'Steady pace', dur: 600 },
  ], thumb: 0 },
  steptouch: { view: 'front', frames: [
    { ...FRONT, hip: [92, 85], neck: [92, 43], lL: [196, 182], lR: [176, 180], aL: [230, 230], aR: [130, 130], cue: 'Step to the side · arms swing', dur: 550 },
    { ...FRONT, hip: [92, 84], neck: [92, 42], lL: [190, 180], lR: [172, 196], cue: 'Tap feet together', dur: 550 },
    { ...FRONT, hip: [108, 85], neck: [108, 43], lL: [184, 180], lR: [164, 178], aL: [230, 230], aR: [130, 130], cue: 'Step the other way', dur: 550 },
    { ...FRONT, hip: [108, 84], neck: [108, 42], lL: [188, 164], lR: [170, 180], cue: 'Tap together', dur: 550 },
  ], thumb: 0 },
  skater: { view: 'front', frames: [
    { ...FRONT, hip: [82, 92], neck: [86, 51], hr: 4, lL: { to: [76, F], b: 1 }, lR: [222, 252], aL: [150, 120], aR: [206, 230], cue: 'Step wide · sweep leg behind', dur: 520 },
    { ...FRONT, hip: [118, 92], neck: [114, 51], hr: -4, lR: { to: [124, F], b: -1 }, lL: [138, 108], aR: [210, 240], aL: [154, 130], cue: 'Switch sides', dur: 520 },
  ], thumb: 0 },
  dance: { view: 'front', frames: [
    { ...FRONT, hip: [94, 85], neck: [92, 43], hr: -6, lL: [196, 182], aL: [320, 20], aR: [140, 100], cue: 'Step & reach', dur: 480 },
    { ...FRONT, hip: [100, 88], neck: [100, 46], lL: { to: [91, F], b: 'back' }, lR: { to: [109, F], b: 'fwd' }, aL: [210, 120], aR: [150, 240], cue: 'Bounce', dur: 480 },
    { ...FRONT, hip: [106, 85], neck: [108, 43], hr: 6, lR: [164, 178], aR: [40, 340], aL: [220, 260], cue: 'Step & reach', dur: 480 },
    { ...FRONT, hip: [100, 88], neck: [100, 46], lL: { to: [91, F], b: 'back' }, lR: { to: [109, F], b: 'fwd' }, aL: [210, 120], aR: [150, 240], cue: 'Enjoy the music!', dur: 480 },
  ], thumb: 0 },
  punch: { view: 'side', frames: [
    { ...SIDE, lL: { to: [114, F], b: -1 }, lR: { to: [88, F], b: -1 }, hip: [100, 85], aL: { to: [114, 42], b: 1 }, aR: { to: [110, 44], b: 1 }, cue: 'Guard up, staggered stance', dur: 450 },
    { ...SIDE, lL: { to: [114, F], b: -1 }, lR: { to: [88, F], b: -1 }, hip: [102, 85], neck: [106, 43], aL: [88, 88], aR: { to: [112, 44], b: 1 }, cue: 'Jab', dur: 380 },
    { ...SIDE, lL: { to: [114, F], b: -1 }, lR: { to: [88, F], b: -1 }, hip: [100, 85], aL: { to: [114, 42], b: 1 }, aR: { to: [110, 44], b: 1 }, cue: 'Back to guard', dur: 380 },
    { ...SIDE, lL: { to: [114, F], b: -1 }, lR: { to: [88, F], b: -1 }, hip: [104, 85], neck: [109, 43], aR: [86, 86], aL: { to: [114, 42], b: 1 }, cue: 'Cross', dur: 450 },
  ], thumb: 1 },
  obliquecrunch: { view: 'front', frames: [
    { ...FRONT, aL: { to: [90, 30], b: 1 }, aR: { to: [110, 30], b: -1 }, cue: 'Hands behind head', hold: 200, dur: 650 },
    { ...FRONT, neck: [106, 41], hr: 8, aL: { to: [91, 30], b: 1 }, aR: { to: [118, 76], b: -1 }, lR: [128, 190], cue: 'Knee out & up · elbow down', hold: 250, dur: 650 },
    { ...FRONT, aL: { to: [90, 30], b: 1 }, aR: { to: [110, 30], b: -1 }, cue: 'Stand tall', hold: 200, dur: 650 },
    { ...FRONT, neck: [94, 41], hr: -8, aR: { to: [109, 30], b: -1 }, aL: { to: [82, 76], b: 1 }, lL: [232, 170], cue: 'Other side', hold: 250, dur: 650 },
  ], thumb: 1 },
  kneeelbow: { view: 'front', frames: [
    { ...FRONT, aL: { to: [90, 30], b: 1 }, aR: { to: [110, 30], b: -1 }, cue: 'Hands by head', dur: 600 },
    { ...FRONT, neck: [96, 42], hr: -6, aL: { to: [92, 32], b: 1 }, aR: { to: [96, 74], b: -1 }, lL: [150, 200], cue: 'Elbow meets opposite knee', hold: 200, dur: 600 },
    { ...FRONT, aL: { to: [90, 30], b: 1 }, aR: { to: [110, 30], b: -1 }, cue: 'Stand tall', dur: 600 },
    { ...FRONT, neck: [104, 42], hr: 6, aR: { to: [108, 32], b: -1 }, aL: { to: [104, 74], b: 1 }, lR: [210, 160], cue: 'Switch', hold: 200, dur: 600 },
  ], thumb: 1 },

  // ======================= STANDING MOBILITY & STRETCH =======================
  armcircle: { view: 'front', frames: [
    { ...FRONT, aL: [272, 270], aR: [88, 90], cue: 'Arms out at shoulder height', dur: 380 },
    { ...FRONT, aL: [262, 262], aR: [98, 98], cue: 'Small circles', dur: 380 },
    { ...FRONT, aL: [270, 272], aR: [90, 88], cue: 'Forward…', dur: 380 },
    { ...FRONT, aL: [280, 280], aR: [80, 80], cue: '…and round', dur: 380 },
  ], thumb: 0 },
  shoulderroll: { view: 'side', frames: [
    { ...SIDE, neck: [101, 40], cue: 'Arms relaxed', dur: 600 },
    { ...SIDE, neck: [101, 37], aL: [176, 180], cue: 'Shoulders up…', dur: 600 },
    { ...SIDE, neck: [99, 38], aL: [188, 184], aR: [190, 186], cue: '…back…', dur: 600 },
    { ...SIDE, neck: [100, 41], cue: '…and down', dur: 600 },
  ], thumb: 1 },
  wrist: { view: 'side', frames: [
    { ...SIDE, aL: [90, 92], aR: [92, 94], cue: 'Arms straight in front', dur: 450 },
    { ...SIDE, aL: [90, 70], aR: [92, 72], cue: 'Circle the wrists', dur: 450 },
    { ...SIDE, aL: [90, 92], aR: [92, 94], cue: '…round', dur: 450 },
    { ...SIDE, aL: [90, 112], aR: [92, 114], cue: 'Open & close fists', dur: 450 },
  ], thumb: 0 },
  crossbody: { view: 'front', frames: [
    { ...FRONT, cue: 'Stand tall', hold: 300, dur: 1300 },
    { ...FRONT, aR: [262, 266], aL: { to: [96, 66], b: 1 }, cue: 'Arm across chest · hold gently', hold: 3000, dur: 1300 },
  ], thumb: 1 },
  wallangel: { view: 'front', frames: [
    { ...FRONT, aL: [270, 0], aR: [90, 0], cue: 'Back on wall · arms in a W', hold: 300, dur: 1500 },
    { ...FRONT, aL: [320, 340], aR: [40, 20], cue: 'Slide arms up to a Y', hold: 400, dur: 1500 },
  ], thumb: 1 },
  sidestretch: { view: 'front', frames: [
    { ...FRONT, aL: [345, 5], aR: [15, 355], cue: 'Reach both arms up', hold: 500, dur: 1600 },
    { ...FRONT, hip: [102, 83], neck: [90, 42], hr: -8, aL: [320, 330], aR: [350, 320], cue: 'Lean to one side · hold', hold: 2500, dur: 1600 },
    { ...FRONT, aL: [345, 5], aR: [15, 355], cue: 'Back to centre', hold: 300, dur: 1600 },
    { ...FRONT, hip: [98, 83], neck: [110, 42], hr: 8, aL: [10, 40], aR: [40, 30], cue: 'Other side · hold', hold: 2500, dur: 1600 },
  ], thumb: 1 },
  triceps: { view: 'front', frames: [
    { ...FRONT, cue: 'Stand tall', hold: 300, dur: 1300 },
    { ...FRONT, aR: [4, 220], aL: { to: [102, 26], b: 1 }, cue: 'Hand behind head · press elbow · hold', hold: 3000, dur: 1300 },
  ], thumb: 1 },
  doorway: { view: 'side', prop: 'doorway', frames: [
    { ...SIDE, hip: [92, F - LEGS], neck: [92, 40], aL: { to: [66, 24], b: 1 }, aR: { to: [66, 26], b: 1 }, cue: 'Forearms on the door frame', hold: 400, dur: 1600 },
    { ...SIDE, hip: [104, 84], neck: [110, 43], lL: { to: [116, F], b: -1 }, lR: { to: [92, F], b: -1 }, aL: { to: [66, 24], b: 1 }, aR: { to: [66, 26], b: 1 }, cue: 'Step through · feel chest stretch · hold', hold: 3000, dur: 1600 },
  ], thumb: 1 },
  hipcircle: { view: 'front', frames: [
    { ...FRONT, hip: [92, 83], neck: [97, 41], ...armsTo([87, 84], [113, 84]), aL: { to: [86, 78], b: 'back' }, aR: { to: [106, 78], b: 'fwd' }, lL: [186, 180], lR: [168, 180], cue: 'Hands on hips · circle slowly', dur: 700 },
    { ...FRONT, hip: [100, 83.4], neck: [100, 41], aL: { to: [91, 78], b: 'back' }, aR: { to: [109, 78], b: 'fwd' }, cue: 'Forward', dur: 700 },
    { ...FRONT, hip: [108, 83], neck: [103, 41], aL: { to: [94, 78], b: 'back' }, aR: { to: [114, 78], b: 'fwd' }, lL: [192, 180], lR: [174, 180], cue: 'Around', dur: 700 },
    { ...FRONT, hip: [100, 81], neck: [100, 39], aL: { to: [91, 76], b: 'back' }, aR: { to: [109, 76], b: 'fwd' }, cue: 'Back', dur: 700 },
  ], thumb: 0 },
  torsotwist: { view: 'front', frames: [
    { ...FRONT, aL: [240, 90], aR: [120, 270], hr: 0, cue: 'Arms at chest height', dur: 800 },
    { ...FRONT, aL: [200, 60], aR: [100, 260], hr: 18, cue: 'Rotate to one side', dur: 800 },
    { ...FRONT, aL: [240, 90], aR: [120, 270], hr: 0, cue: 'Centre', dur: 800 },
    { ...FRONT, aL: [260, 100], aR: [160, 300], hr: -18, cue: 'Other side', dur: 800 },
  ], thumb: 1 },
  hipopener: { view: 'front', frames: [
    { ...FRONT, ...armsTo([90, 84], [110, 84]), aL: { to: [90, 78], b: 'back' }, aR: { to: [110, 78], b: 'fwd' }, cue: 'Stand tall, hands on hips', dur: 800 },
    { ...FRONT, aL: { to: [90, 78], b: 'back' }, aR: { to: [110, 78], b: 'fwd' }, lR: [176, 175], lL: [160, 196], cue: 'Lift knee forward', dur: 800 },
    { ...FRONT, aL: { to: [90, 78], b: 'back' }, aR: { to: [110, 78], b: 'fwd' }, lL: [250, 180], cue: 'Open it out to the side', hold: 300, dur: 900 },
    { ...FRONT, aL: { to: [90, 78], b: 'back' }, aR: { to: [110, 78], b: 'fwd' }, cue: 'Lower with control', dur: 800 },
  ], thumb: 2 },
  legswing: { view: 'side', prop: 'wallback', frames: [
    { ...SIDE, aR: { to: [74, 62], b: -1 }, lL: [140, 150], cue: 'Hold a wall · swing forward', dur: 700 },
    { ...SIDE, aR: { to: [74, 62], b: -1 }, lL: [212, 208], cue: 'Swing back · tall posture', dur: 700 },
  ], thumb: 0 },
  anklecircle: { view: 'side', prop: 'wallback', frames: [
    { ...SIDE, aR: { to: [74, 62], b: -1 }, lL: [168, 190], cue: 'Foot lifted · circle toes', dur: 500 },
    { ...SIDE, aR: { to: [74, 62], b: -1 }, lL: [164, 175], cue: '…round', dur: 500 },
    { ...SIDE, aR: { to: [74, 62], b: -1 }, lL: [168, 160], cue: '…round', dur: 500 },
    { ...SIDE, aR: { to: [74, 62], b: -1 }, lL: [172, 175], cue: '…round', dur: 500 },
  ], thumb: 0 },
  quad: { view: 'side', prop: 'wallfront', frames: [
    { ...SIDE, aL: { to: [132, 62], b: 1 }, cue: 'Hand on the wall', hold: 300, dur: 1300 },
    { ...SIDE, aL: { to: [132, 62], b: 1 }, lR: [192, 330], aR: { to: [84, 88], b: 'back' }, cue: 'Hold ankle · knees together · hold', hold: 3000, dur: 1300 },
  ], thumb: 1 },
  legcurl: { view: 'side', prop: 'chairfront', frames: [
    { ...SIDE, ...armsTo([128, 86], [127, 87], 1), cue: 'Hands on the chair', hold: 300, dur: 1300 },
    { ...SIDE, ...armsTo([128, 86], [127, 87], 1), lR: [192, 330], cue: 'Curl heel towards glutes', hold: 500, dur: 1500 },
  ], thumb: 1 },
  calfstretch: { view: 'side', prop: 'wallpush', frames: [
    { hip: [100, 89], neck: [116, 50], hr: 4, ...armsTo([146, 60], [146, 62]), lL: { to: [122, F], b: -1 }, lR: { to: [72, F], b: -1 }, cue: 'Hands on wall, one foot back', hold: 400, dur: 1600 },
    { hip: [104, 92], neck: [121, 54], hr: 4, ...armsTo([146, 60], [146, 62]), lL: { to: [122, F], b: -1 }, lR: { to: [62, F], b: -1 }, cue: 'Back heel down, back knee straight · hold', hold: 3000, dur: 1600 },
  ], thumb: 1 },
  hipflexor: { view: 'side', frames: [
    { hip: [86, 105], neck: [88, 63], hr: 3, lL: { to: [124, F], b: -1 }, lR: [176, 270], aL: { to: [110, 102], b: 1 }, aR: { to: [109, 103], b: 1 }, cue: 'Kneel, front knee over ankle', hold: 400, dur: 1800 },
    { hip: [96, 107], neck: [94, 65], hr: 2, lL: { to: [124, F], b: -1 }, lR: [204, 270], aL: [2, 0], aR: [4, 2], cue: 'Tuck pelvis, shift forward · reach up', hold: 3000, dur: 1800 },
  ], thumb: 1 },
  wgs: { view: 'side', lie: 'prone', frames: [
    { hip: [94, 104], neck: [134, 104], hr: 14, lL: { to: [130, F], b: -1 }, lR: { to: [44, 131], b: -1 }, ...armsTo([126, 133], [125, 133], -1), cue: 'Long lunge, hands inside front foot', hold: 600, dur: 1600 },
    { hip: [94, 104], neck: [134, 100], hr: -30, lL: { to: [130, F], b: -1 }, lR: { to: [44, 131], b: -1 }, aL: [0, 0], aR: { to: [125, 133], b: -1 }, cue: 'Rotate & reach to the ceiling · eyes follow', hold: 2000, dur: 1600 },
  ], thumb: 1 },
  mountainpose: { view: 'front', frames: [
    { ...FRONT, hip: [100, 83], aL: [186, 180], aR: [174, 180], lL: [180, 180], lR: [180, 180], cue: 'Feet grounded · inhale, grow tall', dur: 3500 },
    { ...FRONT, hip: [100, 83.5], neck: [100, 41], aL: [188, 182], aR: [172, 178], lL: [180, 180], lR: [180, 180], cue: 'Exhale · soften shoulders', dur: 4500 },
  ], thumb: 0 },
  tree: { view: 'front', frames: [
    { ...FRONT, lL: [180, 180], lR: [180, 180], aL: { to: [98, 66], b: 'back' }, aR: { to: [102, 66], b: 'fwd' }, cue: 'Weight on one foot', hold: 400, dur: 1500 },
    { ...FRONT, hip: [102, 83], neck: [101, 41], lL: [180, 180], lR: [118, 250], aL: { to: [98, 66], b: 'back' }, aR: { to: [102, 66], b: 'fwd' }, cue: 'Foot to inner thigh (not the knee)', hold: 1000, dur: 1500 },
    { ...FRONT, hip: [102, 83], neck: [101, 41], lL: [180, 180], lR: [118, 250], aL: [352, 8], aR: [8, 352], cue: 'Reach up · hold 5 breaths', hold: 3000, dur: 1500 },
  ], thumb: 2 },
  warrior: { view: 'front', frames: [
    { ...FRONT, hip: [100, 88], neck: [100, 46], lL: { to: [72, F], b: 1 }, lR: { to: [128, F], b: -1 }, aL: [190, 180], aR: [170, 180], cue: 'Wide stance', hold: 400, dur: 1500 },
    { ...FRONT, hip: [98, 100], neck: [98, 58], hr: 18, lL: { to: [70, F], b: 'back' }, lR: { to: [128, F], b: -1 }, aL: [270, 270], aR: [90, 90], cue: 'Bend front knee over ankle · arms long · hold', hold: 3000, dur: 1500 },
  ], thumb: 1 },
  fold: { view: 'side', frames: [
    { hip: [80, 127], neck: [82, 85], hr: 3, lL: [92, 90], lR: [40, 150], ...armsTo([100, 126], [99, 126], 1), cue: 'Sit tall, one leg long', hold: 500, dur: 2000 },
    { hip: [80, 127], neck: [112, 100], hr: 10, lL: [92, 90], lR: [40, 150], ...armsTo([126, 128], [124, 128], 'down'), cue: 'Hinge from hips · hold', hold: 3000, dur: 2000 },
  ], thumb: 1 },
  butterfly: { view: 'front', frames: [
    { ...CROSS, lL: [240, 96], lR: [120, 264], aL: { to: [97, 128], b: 'back' }, aR: { to: [103, 128], b: 'fwd' }, cue: 'Soles together, sit tall', dur: 2000 },
    { ...CROSS, lL: [246, 94], lR: [114, 266], aL: { to: [97, 128], b: 'back' }, aR: { to: [103, 128], b: 'fwd' }, cue: 'Knees relax down · breathe', hold: 1500, dur: 2000 },
  ], thumb: 1 },
  seated: { view: 'front', frames: [
    { ...CROSS, cue: 'Inhale slowly', dur: 3500 },
    { ...CROSS, neck: [100, 79], cue: 'Exhale slowly', dur: 4500 },
  ], thumb: 0 },
  boxbreath: { view: 'front', frames: [
    { ...CROSS, cue: 'Breathe in · 4', dur: 4000 },
    { ...CROSS, cue: 'Hold · 4', dur: 4000 },
    { ...CROSS, neck: [100, 79], cue: 'Breathe out · 4', dur: 4000 },
    { ...CROSS, neck: [100, 79], cue: 'Hold · 4', dur: 4000 },
  ], thumb: 0 },
  necktilt: { view: 'front', frames: [
    { ...CROSS, cue: 'Sit tall, shoulders relaxed', hold: 500, dur: 1500 },
    { ...CROSS, hr: -26, cue: 'Ear towards shoulder · hold', hold: 2500, dur: 1500 },
    { ...CROSS, cue: 'Centre', hold: 500, dur: 1500 },
    { ...CROSS, hr: 26, cue: 'Other side · hold', hold: 2500, dur: 1500 },
  ], thumb: 1 },
  neckroll: { view: 'front', frames: [
    { ...CROSS, hr: -30, cue: 'Ear to shoulder', dur: 1600 },
    { ...CROSS, neck: [100, 82], hr: 0, cue: 'Roll chin down', dur: 1600 },
    { ...CROSS, hr: 30, cue: 'Other shoulder (no tipping back)', dur: 1600 },
    { ...CROSS, neck: [100, 82], hr: 0, cue: 'Chin down', dur: 1600 },
  ], thumb: 0 },
  chintuck: { view: 'side', prop: 'chairsit', frames: [
    { ...CHAIR, hr: 14, cue: 'Head drifting forward', hold: 400, dur: 1200 },
    { ...CHAIR, neck: [80, 57], hr: -2, cue: 'Glide chin straight back · hold 3', hold: 2000, dur: 1200 },
  ], thumb: 1 },
  chairsit: { view: 'side', prop: 'chairsit', frames: [
    { ...CHAIR, cue: 'Cushion between knees', dur: 2000 },
    { ...CHAIR, neck: [80, 57], arch: 1, cue: 'Exhale · squeeze & draw belly in · hold', hold: 2000, dur: 2000 },
  ], thumb: 1 },
  seatedmarch: { view: 'side', prop: 'chairsit', frames: [
    { ...CHAIR, lL: [70, 175], cue: 'Lift one knee', dur: 700 },
    { ...CHAIR, cue: 'Sit tall', dur: 700 },
    { ...CHAIR, lR: [70, 175], cue: 'Other knee', dur: 700 },
    { ...CHAIR, cue: 'Swing arms', dur: 700 },
  ], thumb: 0 },
  legext: { view: 'side', prop: 'chairsit', frames: [
    { ...CHAIR, cue: 'Sit tall', hold: 300, dur: 1300 },
    { ...CHAIR, lL: [92, 92], cue: 'Straighten knee · hold 2', hold: 1500, dur: 1500 },
  ], thumb: 1 },
  cycle: { view: 'side', prop: 'bike', frames: [
    { hip: [82, 86], neck: [104, 50], hr: -6, ...armsTo([116, 72], [115, 73], 1), lL: { to: [100, 120], b: -1 }, lR: { to: [86, 108], b: -1 }, cue: 'Smooth pedal strokes', dur: 380 },
    { hip: [82, 86], neck: [104, 50], hr: -6, ...armsTo([116, 72], [115, 73], 1), lL: { to: [86, 132], b: -1 }, lR: { to: [100, 120], b: -1 }, cue: 'Knee slightly bent at bottom', dur: 380 },
    { hip: [82, 86], neck: [104, 50], hr: -6, ...armsTo([116, 72], [115, 73], 1), lL: { to: [72, 120], b: -1 }, lR: { to: [86, 132], b: -1 }, cue: 'Steady pace', dur: 380 },
    { hip: [82, 86], neck: [104, 50], hr: -6, ...armsTo([116, 72], [115, 73], 1), lL: { to: [86, 108], b: -1 }, lR: { to: [72, 120], b: -1 }, cue: 'Keep breathing', dur: 380 },
  ], thumb: 0 },

  // ======================= UPPER BODY =======================
  row: { view: 'side', prop: 'rowbench', frames: [
    { hip: [86, 92], neck: [127, 88], hr: 14, aR: { to: [126, 120], b: 1 }, aL: [180, 180], lR: [178, 272], lL: { to: [86, F], b: -1 }, cue: 'Flat back, arm straight down', hold: 300, dur: 1200 },
    { hip: [86, 92], neck: [127, 88], hr: 14, aR: { to: [126, 120], b: 1 }, aL: [228, 168], lR: [178, 272], lL: { to: [86, F], b: -1 }, cue: 'Exhale · elbow to hip, squeeze', hold: 500, dur: 1600 },
  ], thumb: 1 },
  bandpress: { view: 'side', frames: [
    { ...SIDE, aL: [208, 70], aR: [210, 72], cue: 'Band behind back, hands at chest', hold: 300, dur: 1300 },
    { ...SIDE, aL: [90, 90], aR: [92, 92], cue: 'Exhale · press forward', hold: 400, dur: 1600 },
  ], thumb: 1 },
  pullapart: { view: 'front', frames: [
    { ...FRONT, aL: [244, 52], aR: [116, 308], cue: 'Band in front at shoulder height', hold: 300, dur: 1300 },
    { ...FRONT, aL: [270, 270], aR: [90, 90], cue: 'Pull apart · squeeze shoulder blades', hold: 600, dur: 1600 },
  ], thumb: 1, band: true },
  palmpress: { view: 'front', frames: [
    { ...FRONT, aL: { to: [99, 66], b: 'back' }, aR: { to: [101, 66], b: 'fwd' }, cue: 'Palms together, elbows out', dur: 1500 },
    { ...FRONT, aL: { to: [99.5, 65], b: -1 }, aR: { to: [100.5, 65], b: 1 }, arch: 0.4, cue: 'Squeeze 5 · relax 2', hold: 3500, dur: 1500 },
  ], thumb: 1 },
  scapsqueeze: { view: 'side', frames: [
    { ...SIDE, aL: [184, 140], aR: [186, 142], cue: 'Stand tall', hold: 300, dur: 1100 },
    { ...SIDE, neck: [100, 40], aL: [205, 140], aR: [207, 142], arch: -1.2, cue: 'Squeeze shoulder blades back & down · hold', hold: 2500, dur: 1100 },
  ], thumb: 1 },
};

// Which movement each exercise uses (exercise id → SPECS key).
export const EXERCISE_MOVES = {
  'wall-push-up': 'wallpush', 'knee-push-up': 'kneepushup', 'incline-push-up': 'inclinepush', 'standard-push-up': 'pushup', 'decline-push-up': 'declinepush',
  'dumbbell-chest-press': 'press', 'chest-fly': 'fly', 'band-chest-press': 'bandpress', 'band-pull-apart': 'pullapart', 'chest-squeeze': 'palmpress', 'scapular-squeeze': 'scapsqueeze', 'dumbbell-row': 'row',
  'bodyweight-squat': 'squat', 'sumo-squat': 'sumo', 'pf-sumo-lift': 'sumo', 'squat-jumps': 'squatjump', 'squat-pulses': 'squatpulse', 'squat-to-press': 'squatpress', 'chair-squat': 'chairsquat', 'wall-sit': 'wallsit',
  lunge: 'lunge', 'reverse-lunge': 'revlunge', 'jumping-lunges': 'jumplunge', 'step-up': 'stepup', 'stair-climbing': 'stepup', 'calf-raise': 'calfraise',
  'glute-bridge': 'bridge', 'banded-glute-bridge': 'bridge', 'kegel-bridge': 'bridge', 'bridge-pose': 'bridge', 'dr-bridge': 'bridge', 'pf-squeeze-bridge': 'bridge', 'hip-thrust': 'hipthrust', 'pf-bridge-march': 'bridgemarch', 'figure-four': 'figurefour',
  'side-leg-raise': 'sideleg', 'dr-side-lying-leg': 'sideleg', clamshell: 'clamshell', 'thoracic-rotation': 'openbook',
  plank: 'plank', 'dr-modified-plank': 'kneeplank', 'side-plank': 'sideplank', 'dr-side-plank-hold': 'kneesideplank', 'dr-side-plank-dips': 'sideplankdip',
  'plank-shoulder-taps': 'shouldertap', 'plank-jacks': 'plankjack', 'up-down-plank': 'updown', 'mountain-climber': 'mountain',
  'dead-bug': 'deadbug', 'dr-dead-bug': 'deadbug', 'bird-dog': 'birddog', 'dr-bird-dog': 'birddog', 'bicycle-crunch': 'bicycle', 'reverse-crunch': 'revcrunch', 'hollow-hold': 'hollow', 'heel-taps': 'heeltaps',
  'donkey-kick': 'donkey', 'fire-hydrant': 'hydrant', 'russian-twist': 'twist', 'in-and-outs': 'inout', 'flutter-kicks': 'flutter', 'toe-touch-crunch': 'toetouch',
  'beginner-circuit': 'squat', 'intermediate-circuit': 'jack', 'advanced-circuit': 'burpee', burpee: 'burpee', 'squat-step-back': 'squatstepback', inchworm: 'inchworm',
  'jumping-jack': 'jack', 'star-jumps': 'star', 'step-jacks': 'stepjack', 'side-to-side-hops': 'hop', 'fast-feet': 'fastfeet', 'high-knees': 'highknee', 'butt-kicks': 'buttkick',
  'brisk-walk': 'walk', 'interval-walk': 'walk', 'cooldown-walk': 'walk', 'rest-day-walk': 'walk', 'beginner-jog': 'jog', 'light-jog-in-place': 'jog', cycling: 'cycle', 'easy-cycle-recovery': 'cycle',
  'low-impact-aerobics': 'steptouch', 'step-touch': 'steptouch', 'march-in-place': 'march', 'warmup-march': 'marchreach', 'slow-march-breathe': 'marchbreathe', 'dance-cardio': 'dance', 'skater-steps': 'skater', 'shadow-boxing': 'punch',
  'standing-oblique-crunch': 'obliquecrunch', 'standing-knee-elbow': 'kneeelbow',
  'arm-circles': 'armcircle', 'shoulder-rolls': 'shoulderroll', 'wrist-circles': 'wrist', 'overhead-shoulder-stretch': 'crossbody', 'triceps-stretch': 'triceps', 'chest-stretch': 'doorway', 'wall-angels': 'wallangel', 'standing-side-stretch': 'sidestretch',
  'hip-circles': 'hipcircle', 'torso-twists': 'torsotwist', 'hip-openers': 'hipopener', 'leg-swings': 'legswing', 'ankle-circles': 'anklecircle',
  'quad-stretch': 'quad', 'standing-leg-curl': 'legcurl', 'calf-stretch': 'calfstretch', 'hip-flexor-stretch': 'hipflexor', 'worlds-greatest-stretch': 'wgs', 'hamstring-stretch': 'fold',
  'cat-cow': 'catcow', 'childs-pose': 'child', cobra: 'cobra', superman: 'superman', 'downward-dog': 'downdog', 'mountain-pose': 'mountainpose', 'tree-pose': 'tree', 'warrior-two': 'warrior',
  'supine-twist': 'supinetwist', 'body-scan': 'savasana', 'legs-up-wall': 'legsup', 'butterfly-stretch': 'butterfly',
  'deep-breathing': 'seated', 'pelvic-relax-breath': 'seated', 'box-breathing': 'boxbreath', 'neck-tilt': 'necktilt', 'neck-rolls': 'neckroll', 'chin-tuck': 'chintuck',
  'seated-march': 'seatedmarch', 'seated-leg-extension': 'legext',
  'dr-360-breathing': 'crookbreath', 'dr-tva-activation': 'crookbreath', 'dr-pelvic-tilt': 'pelvictilt', 'dr-heel-slide': 'heelslide', 'dr-heel-slide-leg-lift': 'heelslidelift', 'dr-single-leg-march': 'supinemarch', 'dr-toe-taps': 'toetap',
  'dr-quadruped-hold': 'quadlift', 'dr-tabletop-breathing': 'quadlift', 'dr-pillow-squeeze': 'chairsit', 'dr-wall-press': 'wallpush',
};
