// The dog (Cavalier King Charles Spaniel, "Blenheim" coat) described as SVG shapes (viewBox 0 0 200 200).
// The same description is drawn by Pet.js (react-native-svg) and by petSvgString() for the Android widget and the icon.
// "Sticker" style: dark outline, chestnut with darker shading and light highlights, a golden rim on the fur tufts,
// white fur with gray shading, small glossy eyes and a big fluffy tail.

export const PALETTE = {
  ink: '#3A2A22', // outline around the white
  chestnutInk: '#5E2412', // outline around the chestnut
  fur: '#FFFFFF',
  furShade: '#E3E5EA',
  furShadeDark: '#CDD0D6',
  chestnut: '#C85A24',
  chestnutShade: '#9A3819',
  chestnutLight: '#E8893A',
  rim: '#F6B847', // the golden rim along the bottom tufts
  freckle: '#F3A04A',
  eye: '#17110F',
  nose: '#1E1A22',
  noseShine: '#8A8896',
  mouth: '#6B2A22',
  mouthInside: '#7A2E2A',
  tongue: '#FF8A9A',
  blush: '#FF9AA8',
  tear: '#7CC8FF',
  gold: '#FFC93C',
  collar: '#E5484D',
  bubble: '#F4E7DB',
  bone: '#E2BE94',
  zzz: '#FFFFFF',
  shadow: '#5A2E14',
};
const P = PALETTE;
const W = 2.6; // outline width

// Proportions per stage: the puppy has a smaller body and a bigger head
const STAGE_GEOM = {
  kitten: { body: 0.78, head: 1.08, headY: 102 },
  young: { body: 0.9, head: 1.02, headY: 94 },
  adult: { body: 1, head: 1, headY: 86 },
  champion: { body: 1, head: 1, headY: 86 },
};

// Tail tilt (degrees) per expression. It's on the left: a positive angle raises it, a negative one lowers it.
export const TAIL_ANGLE = { ecstatic: -4, happy: -10, worried: -18, sad: -40, crying: -44, hungry: -10, sleeping: -50 };

const TAIL_BASE = { x: 86, y: 166 };
// Three-quarter pose: the head is slightly to the right, leaving room for the tail on the left
const HEAD_DX = 14;
const GROUND = { x: 100, y: 186 };

const line = (d, color = P.ink, w = 3) => ({
  t: 'path', d, stroke: color, strokeWidth: w, strokeLinecap: 'round', strokeLinejoin: 'round', fill: 'none',
});
const fill = (d, color, extra) => ({ t: 'path', d, fill: color, ...extra });
const white = (shape) => ({ ...shape, fill: P.fur, stroke: P.ink, strokeWidth: W, strokeLinejoin: 'round' });
const dot = (cx, cy, r, color = P.freckle) => ({ t: 'circle', cx, cy, r, fill: color });
const star = (cx, cy, r) => ({
  t: 'path', fill: P.gold,
  d: `M${cx} ${cy - r} Q${cx} ${cy} ${cx + r} ${cy} Q${cx} ${cy} ${cx} ${cy + r} Q${cx} ${cy} ${cx - r} ${cy} Q${cx} ${cy} ${cx} ${cy - r} Z`,
});
// Mirror a path around the center (x → 200 − x); paths here use absolute commands only
const mirror = (d) => d.replace(/(-?\d+(?:\.\d+)?) (-?\d+(?:\.\d+)?)/g, (_, x, y) => `${200 - Number(x)} ${y}`);

function eye(x, y, kind, side) {
  const inward = side === 'left' ? 1 : -1; // direction towards the nose
  // Small glossy black eye with two highlights
  const open = (k = 1) => [
    { t: 'ellipse', cx: x, cy: y, rx: 6.5 * k, ry: 7.5 * k, fill: P.eye },
    { t: 'circle', cx: x + 2 * inward * k, cy: y - 2.6 * k, r: 2.3 * k, fill: '#fff' },
    { t: 'circle', cx: x - 2 * inward * k, cy: y + 3 * k, r: 1 * k, fill: '#fff' },
  ];
  const brow = (lift) => line(`M${x - 8 * inward} ${y - 13} L${x + 6 * inward} ${y - 13 - lift}`, P.chestnutInk, 3);
  switch (kind) {
    case 'joy':
      return [line(`M${x - 7} ${y + 3} Q${x} ${y - 7} ${x + 7} ${y + 3}`, P.eye, 3.5)];
    case 'closed':
      return [line(`M${x - 7} ${y} Q${x} ${y + 5} ${x + 7} ${y}`, P.eye, 3)];
    case 'big':
      return [...open(1.25), { t: 'circle', cx: x + 3 * inward, cy: y + 1, r: 1.3, fill: '#fff' }];
    case 'worried':
      return [...open(), brow(4)];
    case 'sad':
      return [
        ...open(),
        // Droopy eyelid: lower towards the outer corner
        fill(`M${x - 10} ${y - 12} L${x + 10} ${y - 12} L${x + 10} ${y - 1 - 3.5 * inward} L${x - 10} ${y - 1 + 3.5 * inward} Z`, P.chestnut),
        line(`M${x - 8} ${y - 1 + 2.8 * inward} L${x + 8} ${y - 1 - 2.8 * inward}`, P.chestnutInk, 2),
        brow(5),
      ];
    case 'squeeze':
      return [
        line(`M${x - 7 * inward} ${y - 5} L${x + 5 * inward} ${y} L${x - 7 * inward} ${y + 5}`, P.eye, 3),
        fill(`M${x - 2} ${y + 9} Q${x - 8} ${y + 26} ${x - 1} ${y + 31} Q${x + 6} ${y + 26} ${x + 2} ${y + 9} Z`, P.tear, { opacity: 0.9 }),
      ];
    default:
      return open();
  }
}

const PHILTRUM = line('M100 98 L100 102', P.mouth, 2.2);
const MOUTHS = {
  smile: [PHILTRUM, line('M91 101 Q95.5 106 100 102 Q104.5 106 109 101', P.mouth, 2.4)],
  // Tongue out
  grin: [
    fill('M89 101 Q100 121 111 101 Q100 106 89 101 Z', P.mouthInside, { stroke: P.mouth, strokeWidth: 1.8, strokeLinejoin: 'round' }),
    fill('M94 106 Q94 119 100 119 Q106 119 106 106 Q100 108 94 106 Z', P.tongue, { stroke: P.mouth, strokeWidth: 1.5 }),
    line('M100 109 L100 115', '#E86A7E', 1.3),
    PHILTRUM,
  ],
  wavy: [PHILTRUM, line('M91 106 Q95.5 102 100 106 Q104.5 110 109 106', P.mouth, 2.4)],
  frown: [PHILTRUM, line('M91 109 Q100 101 109 109', P.mouth, 2.4)],
  wail: [fill('M90 110 Q100 96 110 110 Q100 116 90 110 Z', P.mouthInside, { stroke: P.mouth, strokeWidth: 1.8 })],
  open: [
    PHILTRUM,
    { t: 'ellipse', cx: 100, cy: 107, rx: 6, ry: 6, fill: P.mouthInside, stroke: P.mouth, strokeWidth: 1.8 },
    { t: 'ellipse', cx: 100, cy: 110.5, rx: 4, ry: 2.3, fill: P.tongue },
    fill('M107 109 Q104.5 117 107.5 120 Q110.5 117 108.5 109 Z', P.tear),
  ],
  sleep: [PHILTRUM, line('M94 103 Q100 106 106 103', P.mouth, 2.4)],
};

// What the face looks like for each expression. A Cavalier's ears always hang — they only lift or droop.
const FACES = {
  ecstatic: { eyes: 'joy', mouth: 'grin', ears: 'perk', blush: 0.6 },
  happy: { eyes: 'open', mouth: 'smile', ears: 'perk', blush: 0.4 },
  worried: { eyes: 'worried', mouth: 'wavy', ears: 'rest', blush: 0.2 },
  sad: { eyes: 'sad', mouth: 'frown', ears: 'droop', blush: 0.15 },
  crying: { eyes: 'squeeze', mouth: 'wail', ears: 'droop', blush: 0.35 },
  hungry: { eyes: 'big', mouth: 'open', ears: 'perk', blush: 0.3 },
  sleeping: { eyes: 'closed', mouth: 'sleep', ears: 'droop', blush: 0.35 },
};

// Tilt of the left ear around its attachment point (the right one is mirrored)
const EAR_TILT = { perk: 8, rest: 0, droop: -6 };
const EAR_PIVOT = { x: 70, y: 52 };

// Fluffy ear: starts above the skull, falls past the cheek to the jaw and ends in pointed tufts
const EAR =
  'M74 52 C66 42 50 41 42 51 C35 59 32 68 32 78 L28 83 L32 87 C32 95 31 101 31 106 L36 104 L37 115 L43 109 L46 121 L52 112 L57 123 L61 113 L67 118 ' +
  'C69 106 69 96 68 88 C67 80 66 74 67 68 C68 61 70 56 74 52 Z';
// The darker lower part of the ear
const EAR_SHADE =
  'M31 98 C31 101 31 104 31 106 L36 104 L37 115 L43 109 L46 121 L52 112 L57 123 L61 113 L67 118 ' +
  'C68 110 69 102 68 94 C61 100 52 102 44 100 C39 99 35 98 31 98 Z';
const EAR_LIGHT = 'M47 55 C40 63 37 74 38 86 C42 77 46 68 53 61 C51 58 49 56 47 55 Z';
const EAR_RIM = 'M34 104.5 L37.5 111 L43 106 L46 116 L52 109 L57 118 L61 110 L66 114';
const EAR_STRANDS = ['M51 68 Q47 80 49 92', 'M59 76 Q56 88 59 98'];
const EAR_FRECKLES = [[56, 64, 1.5], [61, 70, 1.1], [52, 74, 1.1]];

// The chestnut patch around the eye; the white blaze towards the muzzle stays between the two patches
const PATCH = 'M95 44 C90 44 82 46 75 51 C68 56 63 63 61 72 C60 80 60 88 62 94 C66 100 72 102 76 102 C83 100 88 94 90 86 C93 78 92 68 93 60 C94 53 95 48 95 44 Z';
const PATCH_LIGHT = 'M72 56 Q80 49 90 48';

function ear(side, tilt) {
  const left = side === 'left';
  const m = (d) => (left ? d : mirror(d));
  const mx = (x) => (left ? x : 200 - x);
  return {
    t: 'g',
    transform: `rotate(${left ? tilt : -tilt} ${mx(EAR_PIVOT.x)} ${EAR_PIVOT.y})`,
    children: [
      fill(m(EAR), P.chestnut),
      fill(m(EAR_SHADE), P.chestnutShade),
      fill(m(EAR_LIGHT), P.chestnutLight),
      ...EAR_STRANDS.map((d) => ({ ...line(m(d), P.chestnutShade, 1.8), opacity: 0.8 })),
      line(m(EAR_RIM), P.rim, 1.8),
      ...EAR_FRECKLES.map(([x, y, r]) => dot(mx(x), y, r)),
      fill(m(EAR), 'none', { stroke: P.chestnutInk, strokeWidth: W, strokeLinejoin: 'round' }),
    ],
  };
}

function head(face, stage, blink) {
  const tilt = EAR_TILT[face.ears];
  const eyeKind = blink && ['open', 'big', 'worried', 'sad'].includes(face.eyes) ? 'closed' : face.eyes;
  return [
    { t: 'ellipse', cx: 100, cy: 80, rx: 40, ry: 37, fill: P.fur },
    // Gray shadow under the muzzle and a gray streak on the white blaze
    fill('M74 106 Q100 124 126 106 Q120 116 100 117.5 Q80 116 74 106 Z', P.furShade),
    line('M98 50 Q96 57 98 64', P.furShade, 3),
    fill(PATCH, P.chestnut),
    fill(mirror(PATCH), P.chestnut),
    line(PATCH_LIGHT, P.chestnutLight, 3),
    line(mirror(PATCH_LIGHT), P.chestnutLight, 3),
    dot(70, 66, 1.2), dot(130, 66, 1.2), dot(74, 92, 1), dot(126, 92, 1),
    // The outline goes on top to hide the edges of the patches
    { t: 'ellipse', cx: 100, cy: 80, rx: 40, ry: 37, fill: 'none', stroke: P.ink, strokeWidth: W },
    { t: 'ellipse', cx: 84, cy: 101, rx: 5, ry: 3, fill: P.blush, opacity: face.blush },
    { t: 'ellipse', cx: 116, cy: 101, rx: 5, ry: 3, fill: P.blush, opacity: face.blush },
    ...eye(82, 79, eyeKind, 'left'),
    ...eye(118, 79, eyeKind, 'right'),
    // Glossy nose
    { t: 'ellipse', cx: 100, cy: 92, rx: 9, ry: 6.5, fill: P.nose },
    { t: 'ellipse', cx: 97, cy: 89.8, rx: 3.6, ry: 1.8, fill: P.noseShine, opacity: 0.85 },
    ...MOUTHS[face.mouth],
    ear('left', tilt),
    ear('right', tilt),
    ...(stage === 'champion'
      ? [
          fill('M76 46 L80 22 L92 36 L100 16 L108 36 L120 22 L124 46 Z', P.gold, { stroke: P.ink, strokeWidth: 2.2, strokeLinejoin: 'round' }),
          { t: 'circle', cx: 80, cy: 22, r: 3.5, fill: P.gold, stroke: P.ink, strokeWidth: 1.5 },
          { t: 'circle', cx: 100, cy: 16, r: 3.5, fill: P.gold, stroke: P.ink, strokeWidth: 1.5 },
          { t: 'circle', cx: 120, cy: 22, r: 3.5, fill: P.gold, stroke: P.ink, strokeWidth: 1.5 },
          { t: 'circle', cx: 100, cy: 36, r: 4, fill: P.collar },
        ]
      : []),
  ];
}

const PAW = (cx, rx = 10.5) => [
  white({ t: 'ellipse', cx, cy: 182.5, rx, ry: 6 }),
  line(`M${cx - 3.5} 180 L${cx - 3.5} 185`, P.ink, 1.5),
  line(`M${cx + 3.5} 180 L${cx + 3.5} 185`, P.ink, 1.5),
  line(`M${cx - 6.5} 186 Q${cx} 188.3 ${cx + 6.5} 186`, P.rim, 1.6),
];

// Sitting in three-quarter view: chest and front legs on the right, hind leg and chestnut back on the left next to the tail
function body() {
  const TORSO = 'M78 186 C72 166 76 140 92 124 C100 118 120 116 134 120 C148 130 154 156 150 186 Z';
  // The thigh blends into the body — it's outlined only along its upper curve
  const HAUNCH = 'M68 186 C62 172 64 152 79 146 C94 142 103 154 104 168 L104 186 Z';
  const HAUNCH_EDGE = 'M68 186 C62 172 64 152 79 146 C91 143 99 149 103 158';
  return [
    { t: 'ellipse', cx: 110, cy: 189, rx: 54, ry: 5.5, fill: P.shadow, opacity: 0.14 },
    { t: 'path', d: TORSO, fill: P.fur },
    // Gray shadow on the right and chestnut back on the left
    fill('M142 138 C147 156 147 172 143 186 L135 186 C139 170 139 154 136 140 Z', P.furShade),
    fill('M92 124 C82 134 76 150 78 168 C88 162 98 150 102 138 C105 129 101 123 92 124 Z', P.chestnut),
    line('M88 132 Q84 140 83 150', P.chestnutLight, 2.6),
    { t: 'path', d: TORSO, fill: 'none', stroke: P.ink, strokeWidth: W, strokeLinejoin: 'round' },
    // Front legs and spots on the chest
    line('M108 150 L108 179', P.ink, 2.2),
    line('M126 146 L126 179', P.ink, 2.2),
    dot(124, 132, 1.5, P.furShadeDark), dot(124, 139, 1.5, P.furShadeDark),
    // Hind leg with a chestnut top
    { t: 'path', d: HAUNCH, fill: P.fur },
    fill('M66 166 C64 154 74 145 86 145 C95 145 101 150 103 156 C96 151 86 150 78 154 C72 157 68 162 66 166 Z', P.chestnut),
    fill('M66 176 C68 182 72 186 78 186 L68 186 Z', P.furShade),
    line(HAUNCH_EDGE, P.ink, W),
    ...PAW(84, 12),
    ...PAW(116),
    ...PAW(138),
  ];
}

// Things around the dog: sparkles, "Zzz", a thought about a bone, a sweat drop
function extras(expression) {
  switch (expression) {
    case 'ecstatic':
      return [star(22, 34, 9), star(190, 70, 6), star(193, 128, 5), star(176, 22, 5)];
    case 'sleeping':
      return [
        { t: 'text', x: 164, y: 32, fontSize: 16, fontWeight: '700', fill: P.zzz, stroke: P.ink, strokeWidth: 0.8, text: 'z' },
        { t: 'text', x: 178, y: 18, fontSize: 22, fontWeight: '700', fill: P.zzz, stroke: P.ink, strokeWidth: 0.8, text: 'Z' },
      ];
    case 'hungry':
      return [
        { t: 'circle', cx: 163, cy: 40, r: 2.5, fill: P.bubble, stroke: P.ink, strokeWidth: 1.2 },
        { t: 'circle', cx: 169, cy: 33, r: 3.5, fill: P.bubble, stroke: P.ink, strokeWidth: 1.2 },
        { t: 'ellipse', cx: 180, cy: 17, rx: 18, ry: 13, fill: P.bubble, stroke: P.ink, strokeWidth: 1.5 },
        // Bone
        fill('M171 14 L189 14 L189 20 L171 20 Z', P.bone),
        { t: 'circle', cx: 171, cy: 13.5, r: 3.5, fill: P.bone },
        { t: 'circle', cx: 171, cy: 20.5, r: 3.5, fill: P.bone },
        { t: 'circle', cx: 189, cy: 13.5, r: 3.5, fill: P.bone },
        { t: 'circle', cx: 189, cy: 20.5, r: 3.5, fill: P.bone },
      ];
    case 'worried':
      return [fill('M172 26 Q166 36 172 40 Q178 36 172 26 Z', P.tear, { stroke: P.ink, strokeWidth: 1.2 })];
    default:
      return [];
  }
}

const scaleAround = (cx, cy, k) => `translate(${cx} ${cy}) scale(${k}) translate(${-cx} ${-cy})`;

// Big fluffy tail rising to the left of the body; its base is at (0,0)
const TAIL = 'M2 -2 C4 -26 -4 -52 -24 -66 C-40 -76 -60 -66 -60 -46 L-54 -48 L-60 -34 L-52 -36 L-56 -22 L-48 -24 L-48 -10 L-40 -14 L-38 0 L-30 -6 L-24 6 L-16 -2 L-8 8 C-4 8 0 6 2 4 Z';
const TAIL_SHADE = 'M-60 -46 L-54 -48 L-60 -34 L-52 -36 L-56 -22 L-48 -24 L-48 -10 L-40 -14 L-38 0 L-30 -6 L-24 6 L-16 -2 L-8 8 C-20 -6 -40 -22 -60 -46 Z';
const TAIL_LIGHT = 'M-6 -30 C-10 -46 -18 -58 -30 -64 C-24 -54 -18 -44 -14 -30 Z';
const TAIL_RIM = 'M-57 -36 L-53 -33 L-54 -24 L-48 -21 L-46 -12 L-40 -11 L-37 -3 L-30 -3 L-25 2 L-17 1';

/**
 * Returns { main, tail, pivot, tailScale, tailAngle }.
 * The tail is separate, with its base at (0,0), so it can rotate (wag) around it.
 */
export function petShapes({ expression = 'happy', stage = 'adult', blink = false }) {
  const face = FACES[expression] || FACES.happy;
  const g = STAGE_GEOM[stage] || STAGE_GEOM.adult;
  const main = [
    { t: 'g', transform: scaleAround(GROUND.x, GROUND.y, g.body), children: body() },
    {
      t: 'g',
      transform: `translate(${HEAD_DX * g.body} ${g.headY - 86}) ${scaleAround(100, 86, g.head)}`,
      children: head(face, stage, blink),
    },
    ...extras(expression),
  ];
  const tail = [
    fill(TAIL, P.chestnut),
    fill(TAIL_SHADE, P.chestnutShade),
    fill(TAIL_LIGHT, P.chestnutLight),
    { ...line('M-20 -50 Q-32 -40 -38 -24', P.chestnutShade, 1.8), opacity: 0.8 },
    line(TAIL_RIM, P.rim, 1.8),
    dot(-30, -56, 1.5), dot(-24, -52, 1.1), dot(-36, -50, 1.1),
    fill(TAIL, 'none', { stroke: P.chestnutInk, strokeWidth: W, strokeLinejoin: 'round' }),
  ];
  const pivot = {
    x: GROUND.x + (TAIL_BASE.x - GROUND.x) * g.body,
    y: GROUND.y + (TAIL_BASE.y - GROUND.y) * g.body,
  };
  return { main, tail, pivot, tailScale: g.body, tailAngle: TAIL_ANGLE[expression] ?? 0 };
}

const attrName = (k) => k.replace(/[A-Z]/g, (m) => `-${m.toLowerCase()}`);

export function toSvg(nodes) {
  return nodes
    .map(({ t, children, text, ...props }) => {
      const attrs = Object.entries(props)
        .filter(([, v]) => v != null)
        .map(([k, v]) => `${attrName(k)}="${v}"`)
        .join(' ');
      if (t === 'g') return `<g ${attrs}>${toSvg(children)}</g>`;
      if (t === 'text') return `<text ${attrs}>${text}</text>`;
      return `<${t} ${attrs}/>`;
    })
    .join('');
}

// The whole dog as an SVG string (the tail is behind the body)
export function petSvgString({ expression, stage, size = 200 }) {
  const { main, tail, pivot, tailScale, tailAngle } = petShapes({ expression, stage });
  const tailGroup = { t: 'g', transform: `translate(${pivot.x} ${pivot.y}) rotate(${tailAngle}) scale(${tailScale})`, children: tail };
  return `<svg xmlns="http://www.w3.org/2000/svg" width="${size}" height="${size}" viewBox="0 0 200 200">${toSvg([tailGroup, ...main])}</svg>`;
}
