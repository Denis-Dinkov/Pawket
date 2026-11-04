import React, { memo } from 'react';
import { StyleSheet } from 'react-native';
import Svg, { Circle, Defs, Ellipse, G, Line, LinearGradient, Path, RadialGradient, Rect, Stop, Text as SvgText } from 'react-native-svg';
import { colors, currentColorScheme } from '../theme';

/**
 * Charlie's room, drawn behind him: striped wallpaper, a window with curtains (sun or moon),
 * a framed picture, a lamp, a plant, a wooden floor with a rug, his bed, his bowl and toys.
 * Static and memoized — it only redraws when the size, day/night or the bowl changes.
 * The dog sits a bit right of center (see PetRoom), so the bed is centered under him.
 */
function RoomScene({ width: w, height: h, top, night, hungry, petName }) {
  const dark = currentColorScheme() === 'dark';
  const ink = dark ? '#000000' : '#5A3018';
  const floorY = h - 92; // where the floor starts
  const dogX = w / 2 + 23; // center of the dog
  // Window on the right, below the top bar
  const win = { x: w - 112, y: top + 54, w: 78, h: 70 };
  const wallLine = dark ? 'rgba(255,255,255,0.035)' : 'rgba(150,80,30,0.07)';
  const curtain = dark ? '#6B3A33' : '#E59C7E';
  const curtainShade = dark ? '#4E2925' : '#C97B5D';
  const wood = dark ? '#4A2F1B' : '#E2A46C';
  const woodLine = dark ? 'rgba(0,0,0,0.28)' : 'rgba(140,70,25,0.18)';

  return (
    <Svg width={w} height={h} style={StyleSheet.absoluteFill} pointerEvents="none">
      <Defs>
        <LinearGradient id="sky" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={night ? '#0F1C36' : '#8FD0FF'} />
          <Stop offset="1" stopColor={night ? '#2A3D63' : '#D8F0FF'} />
        </LinearGradient>
        <LinearGradient id="floor" x1="0" y1="0" x2="0" y2="1">
          <Stop offset="0" stopColor={wood} />
          <Stop offset="1" stopColor={colors.floor} />
        </LinearGradient>
        <RadialGradient id="rug" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor={dark ? '#5E3B4A' : '#F6C6A8'} />
          <Stop offset="0.7" stopColor={dark ? '#4D2F3C' : '#EDAE8C'} />
          <Stop offset="1" stopColor={dark ? '#3E2530' : '#E09B78'} />
        </RadialGradient>
        <RadialGradient id="glow" cx="50%" cy="50%" rx="50%" ry="50%">
          <Stop offset="0" stopColor="#FFD58A" stopOpacity="0.55" />
          <Stop offset="1" stopColor="#FFD58A" stopOpacity="0" />
        </RadialGradient>
        <RadialGradient id="bed" cx="50%" cy="40%" rx="50%" ry="60%">
          <Stop offset="0" stopColor={dark ? '#6A4A6E' : '#B9A3E0'} />
          <Stop offset="1" stopColor={dark ? '#4C3352' : '#957CC9'} />
        </RadialGradient>
      </Defs>

      {/* Wallpaper stripes */}
      {Array.from({ length: Math.ceil(w / 26) }, (_, i) => (
        <Rect key={i} x={i * 26} y={0} width={12} height={floorY} fill={wallLine} />
      ))}

      {/* Framed picture of a bone above the dog */}
      <G transform={`translate(${dogX - 27} ${top + 56}) scale(0.88)`}>
        <Rect x={0} y={0} width={46} height={36} rx={3} fill={dark ? '#6B4A30' : '#B97A45'} />
        <Rect x={4} y={4} width={38} height={28} rx={2} fill={dark ? '#2F3B33' : '#F7EBD8'} />
        <Path d="M14 18 L32 18" stroke={dark ? '#D8C3A0' : '#E2BE94'} strokeWidth={5} strokeLinecap="round" />
        <Circle cx={13} cy={15.5} r={3} fill={dark ? '#D8C3A0' : '#E2BE94'} />
        <Circle cx={13} cy={20.5} r={3} fill={dark ? '#D8C3A0' : '#E2BE94'} />
        <Circle cx={33} cy={15.5} r={3} fill={dark ? '#D8C3A0' : '#E2BE94'} />
        <Circle cx={33} cy={20.5} r={3} fill={dark ? '#D8C3A0' : '#E2BE94'} />
        <Line x1={23} y1={-8} x2={8} y2={0} stroke={ink} strokeWidth={1} opacity={0.4} />
        <Line x1={23} y1={-8} x2={38} y2={0} stroke={ink} strokeWidth={1} opacity={0.4} />
        <Circle cx={23} cy={-8} r={1.8} fill={ink} opacity={0.5} />
      </G>

      {/* Window with sky, curtains and a sill */}
      <G>
        <Rect x={win.x} y={win.y} width={win.w} height={win.h} rx={8} fill="url(#sky)" />
        {night ? (
          <>
            <Circle cx={win.x + 22} cy={win.y + 20} r={9} fill="#F5D77A" />
            <Circle cx={win.x + 26} cy={win.y + 17} r={8} fill="#1A2A4A" />
            {[[52, 14], [62, 30], [44, 40], [18, 50], [66, 52]].map(([x, y], i) => (
              <Circle key={i} cx={win.x + x} cy={win.y + y} r={i % 2 ? 1.2 : 1.6} fill="#FFFFFF" opacity={0.85} />
            ))}
          </>
        ) : (
          <>
            <Circle cx={win.x + 58} cy={win.y + 20} r={9} fill="#FFD866" />
            <Circle cx={win.x + 58} cy={win.y + 20} r={14} fill="#FFD866" opacity={0.25} />
            <Path d={`M${win.x + 10} ${win.y + 48} q4 -9 12 -6 q4 -8 12 -2 q8 0 7 8 z`} fill="#FFFFFF" opacity={0.9} />
          </>
        )}
        <Rect x={win.x} y={win.y} width={win.w} height={win.h} rx={8} fill="none" stroke={colors.windowFrame} strokeWidth={5} />
        <Line x1={win.x + win.w / 2} y1={win.y} x2={win.x + win.w / 2} y2={win.y + win.h} stroke={colors.windowFrame} strokeWidth={4} />
        <Line x1={win.x} y1={win.y + win.h / 2} x2={win.x + win.w} y2={win.y + win.h / 2} stroke={colors.windowFrame} strokeWidth={4} />
        <Rect x={win.x - 8} y={win.y + win.h} width={win.w + 16} height={6} rx={3} fill={colors.windowFrame} />
        <Rect x={win.x - 8} y={win.y + win.h + 5} width={win.w + 16} height={2} fill={ink} opacity={0.12} />
        {/* Curtain rod and curtains tied back at the sides */}
        <Line x1={win.x - 14} y1={win.y - 6} x2={win.x + win.w + 14} y2={win.y - 6} stroke={dark ? '#8A6A4A' : '#9A5A2E'} strokeWidth={3} strokeLinecap="round" />
        <Path d={`M${win.x - 12} ${win.y - 6} L${win.x + 12} ${win.y - 6} Q${win.x + 6} ${win.y + 30} ${win.x - 2} ${win.y + 40} Q${win.x + 2} ${win.y + 58} ${win.x - 8} ${win.y + win.h + 4} L${win.x - 14} ${win.y + win.h + 4} Z`} fill={curtain} />
        <Path d={`M${win.x - 6} ${win.y - 4} Q${win.x} ${win.y + 20} ${win.x - 4} ${win.y + 40}`} stroke={curtainShade} strokeWidth={2} fill="none" />
        <Path d={`M${win.x + win.w + 12} ${win.y - 6} L${win.x + win.w - 12} ${win.y - 6} Q${win.x + win.w - 6} ${win.y + 30} ${win.x + win.w + 2} ${win.y + 40} Q${win.x + win.w - 2} ${win.y + 58} ${win.x + win.w + 8} ${win.y + win.h + 4} L${win.x + win.w + 14} ${win.y + win.h + 4} Z`} fill={curtain} />
        <Path d={`M${win.x + win.w + 6} ${win.y - 4} Q${win.x + win.w} ${win.y + 20} ${win.x + win.w + 4} ${win.y + 40}`} stroke={curtainShade} strokeWidth={2} fill="none" />
        <Rect x={win.x - 6} y={win.y + 38} width={9} height={4} rx={2} fill={curtainShade} />
        <Rect x={win.x + win.w - 3} y={win.y + 38} width={9} height={4} rx={2} fill={curtainShade} />
      </G>

      {/* Floor: wooden planks with a soft rounded horizon, and the skirting board */}
      <Path d={`M-40 ${h} L-40 ${floorY + 30} Q${w / 2} ${floorY - 34} ${w + 40} ${floorY + 30} L${w + 40} ${h} Z`} fill="url(#floor)" />
      {[-0.42, -0.2, 0, 0.2, 0.42].map((k, i) => (
        <Line key={i} x1={w / 2 + k * w * 0.55} y1={floorY + 6} x2={w / 2 + k * w * 1.6} y2={h} stroke={woodLine} strokeWidth={1.2} />
      ))}
      <Path d={`M-40 ${floorY + 30} Q${w / 2} ${floorY - 34} ${w + 40} ${floorY + 30}`} stroke={dark ? '#2A1A10' : '#C98A55'} strokeWidth={4} fill="none" />
      <Path d={`M-40 ${floorY + 30} Q${w / 2} ${floorY - 34} ${w + 40} ${floorY + 30}`} stroke={dark ? 'rgba(255,255,255,0.06)' : 'rgba(255,255,255,0.45)'} strokeWidth={1.2} fill="none" transform="translate(0 -3)" />

      {/* Plant in a pot under the window, and a lamp that glows at night */}
      <G transform={`translate(${w - 36} ${floorY + 24})`}>
        {night && <Circle cx={-44} cy={-70} r={46} fill="url(#glow)" />}
        <Path d="M-6 -6 C-22 -20 -26 -44 -14 -60 C-10 -40 -6 -26 -2 -10 Z" fill={dark ? '#3F6B45' : '#5FA866'} />
        <Path d="M2 -8 C12 -26 26 -36 30 -54 C18 -46 8 -32 0 -14 Z" fill={dark ? '#355C3B' : '#4E9456'} />
        <Path d="M-2 -8 C-4 -30 2 -52 10 -66 C10 -46 6 -28 2 -10 Z" fill={dark ? '#4A7A50' : '#6DBA73'} />
        <Path d="M-14 -8 L14 -8 L10 14 L-10 14 Z" fill={dark ? '#7A4A2E' : '#C8693A'} />
        <Rect x={-16} y={-11} width={32} height={6} rx={2} fill={dark ? '#8A5636' : '#D97B48'} />
        {/* Floor lamp */}
        <Line x1={-44} y1={-60} x2={-44} y2={14} stroke={dark ? '#7A6A5A' : '#8A6A4A'} strokeWidth={2.5} />
        <Ellipse cx={-44} cy={14} rx={9} ry={2.5} fill={dark ? '#7A6A5A' : '#8A6A4A'} />
        <Path d="M-56 -60 L-32 -60 L-36 -78 L-52 -78 Z" fill={night ? '#FFE3A3' : dark ? '#C9A27A' : '#F3D6A8'} />
      </G>

      {/* Round rug and the dog bed under Charlie */}
      <Ellipse cx={dogX} cy={h - 44} rx={Math.min(150, w * 0.38)} ry={20} fill="url(#rug)" />
      <Ellipse cx={dogX} cy={h - 44} rx={Math.min(150, w * 0.38) - 10} ry={13} fill="none" stroke={dark ? 'rgba(255,255,255,0.12)' : 'rgba(255,255,255,0.55)'} strokeWidth={1.5} strokeDasharray="5 5" />
      <Ellipse cx={dogX} cy={h - 52} rx={92} ry={20} fill="url(#bed)" />
      <Ellipse cx={dogX} cy={h - 56} rx={74} ry={12} fill={dark ? '#3A2840' : '#E7DDF6'} />
      <Ellipse cx={dogX} cy={h - 56} rx={66} ry={8.5} fill="none" stroke={dark ? 'rgba(255,255,255,0.1)' : 'rgba(150,120,200,0.45)'} strokeWidth={1.2} strokeDasharray="4 4" />

      {/* Toys: a striped ball and a bone */}
      <G transform={`translate(${Math.min(dogX + 106, w - 74)} ${h - 58})`}>
        <Circle cx={0} cy={0} r={11} fill="#4FA3E8" />
        <Path d="M-11 0 Q0 -6 11 0" stroke="#FFFFFF" strokeWidth={3} fill="none" />
        <Path d="M-10 5 Q0 0 10 5" stroke="#F2C94C" strokeWidth={2.5} fill="none" />
        <Circle cx={-4} cy={-5} r={2.5} fill="#FFFFFF" opacity={0.6} />
      </G>
      <G transform={`translate(${dogX - 112} ${h - 48}) rotate(-14)`}>
        <Rect x={-12} y={-3} width={24} height={6} rx={3} fill={dark ? '#D8C3A0' : '#F3E3C8'} />
        <Circle cx={-12} cy={-3.5} r={4} fill={dark ? '#D8C3A0' : '#F3E3C8'} />
        <Circle cx={-12} cy={3.5} r={4} fill={dark ? '#D8C3A0' : '#F3E3C8'} />
        <Circle cx={12} cy={-3.5} r={4} fill={dark ? '#D8C3A0' : '#F3E3C8'} />
        <Circle cx={12} cy={3.5} r={4} fill={dark ? '#D8C3A0' : '#F3E3C8'} />
      </G>

      {/* Bowl with his name; kibble only when he isn't hungry */}
      <G transform={`translate(52 ${h - 58})`}>
        <Ellipse cx={0} cy={16} rx={30} ry={5} fill="#000000" opacity={0.12} />
        {!hungry &&
          [[-10, -2], [-3, -4], [5, -3], [12, -1], [-6, 1], [2, 0], [9, 2]].map(([x, y], i) => (
            <Circle key={i} cx={x} cy={y} r={3.4} fill={i % 2 ? '#9A5A2E' : '#B57240'} />
          ))}
        <Path d="M-26 0 L26 0 Q24 16 0 16 Q-24 16 -26 0 Z" fill={colors.bowl} />
        <Ellipse cx={0} cy={0} rx={26} ry={4.5} fill={hungry ? (dark ? '#2A1A10' : '#8A4520') : 'none'} stroke={dark ? '#9A6A4A' : '#D98B57'} strokeWidth={2} />
        <SvgText x={0} y={11.5} fontSize={7.5} fontWeight="700" fill="#FFFFFF" opacity={0.9} textAnchor="middle">
          {(petName || '').toUpperCase().slice(0, 8)}
        </SvgText>
      </G>
    </Svg>
  );
}

export default memo(RoomScene);
