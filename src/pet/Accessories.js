import React, { memo } from 'react';
import Svg, { Circle, G, Path } from 'react-native-svg';

// The accessories are drawn over the painted picture, in its own 480×480 pixel space.
// Charlie sits in the same pose in every mood, so the anchors are fixed: eyes around y 125,
// the chin around y 245, the top of the head at y 10. Same outline colour and cel shading as the art.
const O = '#4A2C1E';
// Extra room above the picture for a hat or crown
const TOP = 150;
const VIEW_H = 480 + TOP;

const Collar = ({ band, light, tag }) => (
  <G>
    <Path d="M178 258 Q255 300 334 250" fill="none" stroke={O} strokeWidth={22} strokeLinecap="round" />
    <Path d="M178 258 Q255 300 334 250" fill="none" stroke={band} strokeWidth={16} strokeLinecap="round" />
    <Path d="M182 256 Q255 294 330 249" fill="none" stroke={light} strokeWidth={4} strokeLinecap="round" />
    <Circle cx={256} cy={300} r={13} fill={tag} stroke={O} strokeWidth={3} />
    <Circle cx={252} cy={296} r={4} fill="#FFF3C4" />
  </G>
);

const NECK = {
  collar: () => <Collar band="#D8343C" light="#F06A6F" tag="#F2C14E" />,
  goldCollar: () => (
    <G>
      <Collar band="#E2AE3A" light="#FFE08A" tag="#3D7BFF" />
      <Circle cx={256} cy={300} r={6} fill="#9CC2FF" />
    </G>
  ),
  bandana: () => (
    <G>
      <Path d="M176 256 Q256 284 336 248 L268 362 Q258 374 248 362 Z" fill="#3D7BFF" stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
      <Path d="M256 278 L268 362 Q258 374 248 362 Z" fill="#2C5FD0" />
      <Path d="M176 256 Q256 284 336 248" fill="none" stroke={O} strokeWidth={3.5} />
      {[[222, 290, 5], [262, 300, 5], [296, 282, 5], [246, 330, 5], [272, 338, 4]].map(([x, y, r]) => (
        <Circle key={`${x}`} cx={x} cy={y} r={r} fill="#FFFFFF" />
      ))}
    </G>
  ),
  bow: () => (
    <G>
      <Path d="M256 282 L206 256 Q196 282 206 308 Z" fill="#D6479A" stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
      <Path d="M256 282 L306 256 Q316 282 306 308 Z" fill="#D6479A" stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
      <Path d="M256 282 L210 296 Q205 302 206 308 Z" fill="#A92F78" />
      <Path d="M256 282 L302 296 Q307 302 306 308 Z" fill="#A92F78" />
      <Path d="M251 268 L261 268 Q270 268 270 277 L270 287 Q270 296 261 296 L251 296 Q242 296 242 287 L242 277 Q242 268 251 268 Z" fill="#B8297F" stroke={O} strokeWidth={3.5} />
    </G>
  ),
  medal: () => (
    <G>
      <Path d="M214 262 L246 336 L266 336 L234 258 Z" fill="#3D7BFF" stroke={O} strokeWidth={3} strokeLinejoin="round" />
      <Path d="M298 254 L266 336 L246 336 L278 256 Z" fill="#D8343C" stroke={O} strokeWidth={3} strokeLinejoin="round" />
      <Circle cx={256} cy={352} r={28} fill="#F2C14E" stroke={O} strokeWidth={3.5} />
      <Circle cx={256} cy={352} r={20} fill="none" stroke="#D9A22E" strokeWidth={3} />
      <Path d="M256 336 L261 347 L273 348 L264 356 L267 368 L256 362 L245 368 L248 356 L239 348 L251 347 Z" fill="#FFF3C4" />
    </G>
  ),
};

const Glasses = () => (
  <G transform="rotate(-4 254 128)">
    <Path d="M146 112 Q190 96 232 112 Q232 160 190 162 Q148 160 146 112 Z" fill="#1E1A22" stroke={O} strokeWidth={4} />
    <Path d="M276 112 Q318 96 362 112 Q360 160 318 162 Q276 160 276 112 Z" fill="#1E1A22" stroke={O} strokeWidth={4} />
    <Path d="M232 116 Q254 104 276 116" fill="none" stroke={O} strokeWidth={6} />
    <Path d="M160 116 Q178 108 196 112" fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={5} strokeLinecap="round" />
    <Path d="M290 116 Q308 108 326 112" fill="none" stroke="#FFFFFF" strokeOpacity={0.55} strokeWidth={5} strokeLinecap="round" />
  </G>
);

const HEAD = {
  hat: () => (
    <G transform="translate(262 44) scale(1.7) rotate(10) translate(-262 -44)">
      <Path d="M212 40 L262 -66 L312 36 Q262 54 212 40 Z" fill="#7EA6FF" stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
      <Path d="M262 -66 L312 36 Q290 44 270 44 Z" fill="#5B86E5" />
      <Path d="M228 6 Q262 14 296 4" fill="none" stroke="#FFFFFF" strokeWidth={7} />
      <Path d="M244 -30 Q262 -26 280 -32" fill="none" stroke="#F2C14E" strokeWidth={7} />
      <Circle cx={262} cy={-68} r={13} fill="#D8343C" stroke={O} strokeWidth={3} />
    </G>
  ),
  glasses: Glasses,
  // Only for "Шампион", when nothing else is on his head
  crown: () => (
    <G transform="translate(258 40) scale(1.6) rotate(6) translate(-258 -40)">
      <Path d="M214 34 L218 -18 L238 6 L258 -30 L278 6 L298 -18 L302 34 Q258 46 214 34 Z" fill="#F2C14E" stroke={O} strokeWidth={3.5} strokeLinejoin="round" />
      <Path d="M258 -30 L278 6 L298 -18 L302 34 Q280 40 262 40 Z" fill="#D9A22E" />
      <Circle cx={258} cy={16} r={7} fill="#D8343C" stroke={O} strokeWidth={2.5} />
      <Circle cx={232} cy={22} r={5} fill="#3D7BFF" stroke={O} strokeWidth={2} />
      <Circle cx={284} cy={20} r={5} fill="#0A7550" stroke={O} strokeWidth={2} />
    </G>
  ),
};

// The younger pictures enlarge the head around (255, 190); the outfit follows that
const FIT = {
  kitten: 'translate(255 190) scale(1.2) translate(-255 -190)',
  young: 'translate(255 190) scale(1.1) translate(-255 -190)',
};

// With his eyes shut (asleep, crying) the sunglasses go up on his forehead instead of hiding the face
const EYES_SHUT = new Set(['sleeping', 'crying']);

/**
 * The accessory layer, the same size as the picture (it overflows upwards for hats).
 * head / neck: reward ids; stage: the crown for "Шампион" when nothing else is on his head,
 * and a bigger fit for the younger pictures (their head is enlarged around the face).
 */
function Accessories({ size, head, neck, stage, expression }) {
  const headItem = head || (stage === 'champion' ? 'crown' : null);
  if (!headItem && !neck) return null;
  const Head = headItem && HEAD[headItem];
  const Neck = neck && NECK[neck];
  const raised = headItem === 'glasses' && EYES_SHUT.has(expression);
  const k = size / 480;
  return (
    <Svg
      width={size}
      height={VIEW_H * k}
      viewBox={`0 ${-TOP} 480 ${VIEW_H}`}
      style={{ position: 'absolute', left: 0, top: -TOP * k }}
      pointerEvents="none"
    >
      <G transform={FIT[stage] || ''}>
      {Neck ? <Neck /> : null}
      {Head ? (
        raised ? (
          <G transform="translate(254 30) scale(0.82) translate(-254 -128)">
            <Head />
          </G>
        ) : (
          <Head />
        )
      ) : null}
      </G>
    </Svg>
  );
}

export default memo(Accessories);

// Where each item sits in the 480 space, for drawing it on its own (reward tiles)
const PREVIEW_BOX = {
  collar: '166 230 180 90',
  goldCollar: '166 230 180 90',
  bandana: '166 236 180 140',
  bow: '186 236 140 90',
  medal: '196 246 120 140',
  hat: '150 -150 230 210',
  glasses: '136 86 240 90',
};

/** One reward drawn on its own, as on Charlie (for the reward tiles). */
export const ItemPreview = memo(function ItemPreview({ id, size = 44 }) {
  const Item = NECK[id] || HEAD[id];
  if (!Item) return null;
  return (
    <Svg width={size} height={size} viewBox={PREVIEW_BOX[id]} preserveAspectRatio="xMidYMid meet" pointerEvents="none">
      <Item />
    </Svg>
  );
});
