import React, { useId } from 'react';
import { motion } from 'framer-motion';
import type { ArtisanConfig } from '@/data/artisanCustomizer';

interface ArtisanKeycapSvgProps {
  config: ArtisanConfig;
  size?: number;
  pressed?: boolean;
  className?: string;
  showUnderglow?: boolean;
}

/**
 * High-Fidelity Procedural Vector Artisan Keycap Renderer
 * Renders tactile 3D mechanical keycap profiles, optical resin materials,
 * sculpted 3D accessories, expressive facial inks, and dynamic ambient lighting.
 */
export const ArtisanKeycapSvg = React.memo(function ArtisanKeycapSvg({
  config,
  size = 180,
  pressed = false,
  className = '',
  showUnderglow = true,
}: ArtisanKeycapSvgProps) {
  const uid = useId().replace(/:/g, '-');
  const { profile, material, resinColor, faceInk, eyes, mouth, accessory, hasBlush } = config;

  // ── Profile Geometry Paths ──
  // SA: Tall spherical dish, rounded pillowy edges, deep ergonomic bowl (exact match to reference)
  // Cherry: Sculpted cylindrical profile, crisp chamfers, low profile
  // Dome: Ergonomic pebble dome with continuous organic curvature
  const skirtPath = profile === 'dome'
    ? 'M 15 80 C 13 80 10 74 12 48 C 14 24 24 14 38 12 C 45 11 55 11 62 12 C 76 14 86 24 88 48 C 90 74 87 80 85 80 C 73 86 27 86 15 80 Z'
    : profile === 'cherry'
    ? 'M 14 80 L 19 26 C 20 20 25 16 32 16 L 68 16 C 75 16 80 20 81 26 L 86 80 C 87 86 81 90 73 90 L 27 90 C 19 90 13 86 14 80 Z'
    : /* SA (default) */ 'M 16 82 L 20 25 C 21 18 27 13 35 13 L 65 13 C 73 13 79 18 80 25 L 84 82 C 85 88 79 92 71 92 L 29 92 C 21 92 15 88 16 82 Z';

  // Front Facet / Top Recessed Dish (where the sculpted face lives)
  const dishPath = profile === 'dome'
    ? 'M 22 72 C 20 50 25 24 38 20 C 45 18 55 18 62 20 C 75 24 80 50 78 72 C 70 76 30 76 22 72 Z'
    : profile === 'cherry'
    ? 'M 21 26 C 23 21 28 18 35 18 L 65 18 C 72 18 77 21 79 26 L 81 74 C 80 78 75 81 67 81 L 33 81 C 25 81 20 78 19 74 Z'
    : /* SA Dish */ 'M 22 25 C 24 19 30 16 38 16 L 62 16 C 70 16 76 19 78 25 L 80 75 C 79 81 73 83 65 83 L 35 83 C 27 83 21 81 20 75 Z';

  // Eye Coordinates (calibrated for cute anime proportions)
  const leftEyeX = 34;
  const rightEyeX = 66;
  const eyeY = 55;
  const mouthY = 63;

  return (
    <div
      className={`relative shrink-0 select-none ${className}`}
      style={{ width: size, height: size }}
      aria-label={`${config.name} artisan keycap`}
    >
      {/* ── Soft Ambient Underglow Bloom ── */}
      {showUnderglow && (
        <div
          className="pointer-events-none absolute left-1/2 top-[58%] -translate-x-1/2 -translate-y-1/2 rounded-full transition-all duration-500"
          style={{
            width: size * 0.95,
            height: size * 0.95,
            background: `radial-gradient(circle, ${resinColor}80 0%, ${resinColor}25 48%, transparent 72%)`,
            filter: `blur(${Math.max(8, size * 0.09)}px)`,
            opacity: material === 'translucent' ? 0.95 : 0.72,
          }}
        />
      )}

      <motion.svg
        viewBox="0 0 100 100"
        width={size}
        height={size}
        className="relative block overflow-visible"
        animate={{ y: pressed ? 5 : 0 }}
        transition={{ type: 'spring', stiffness: 600, damping: 26 }}
      >
        <defs>
          {/* Grounding Contact Shadow Blur Filter */}
          <filter id={`${uid}-ground-shadow`} x="-20%" y="-20%" width="140%" height="140%">
            <feGaussianBlur stdDeviation="3.2" />
          </filter>

          {/* Soft Blur Filter for Rosy Cheeks */}
          <filter id={`${uid}-blush-blur`} x="-40%" y="-40%" width="180%" height="180%">
            <feGaussianBlur stdDeviation="1.5" />
          </filter>

          {/* Base Resin Body Gradient (Adds 3D hemispherical volume) */}
          <linearGradient id={`${uid}-resin-body`} x1="0" y1="0" x2="0.35" y2="1">
            <stop offset="0%" stopColor={resinColor} stopOpacity="1" />
            <stop offset="60%" stopColor={resinColor} stopOpacity="0.88" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.55" />
          </linearGradient>

          {/* Side Chamfer Shadows */}
          <linearGradient id={`${uid}-skirt-shading`} x1="0" y1="0" x2="1" y2="0">
            <stop offset="0%" stopColor="#000000" stopOpacity="0.45" />
            <stop offset="16%" stopColor="#000000" stopOpacity="0.05" />
            <stop offset="84%" stopColor="#000000" stopOpacity="0.05" />
            <stop offset="100%" stopColor="#000000" stopOpacity="0.5" />
          </linearGradient>

          {/* Top Bevel Highlight Rim */}
          <linearGradient id={`${uid}-rim-highlight`} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="#ffffff" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#ffffff" stopOpacity="0.15" />
            <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
          </linearGradient>

          {/* ── Material Specific Finish Shaders ── */}

          {/* 1. Metallic Luster (Brushed chrome reflection bands) */}
          {material === 'metallic' && (
            <linearGradient id={`${uid}-metallic-lustre`} x1="0.1" y1="0" x2="0.9" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.65" />
              <stop offset="22%" stopColor={resinColor} stopOpacity="0.85" />
              <stop offset="45%" stopColor="#ffffff" stopOpacity="0.8" />
              <stop offset="68%" stopColor={resinColor} stopOpacity="0.95" />
              <stop offset="90%" stopColor="#000000" stopOpacity="0.6" />
              <stop offset="100%" stopColor={resinColor} stopOpacity="0.75" />
            </linearGradient>
          )}

          {/* 2. Glossy Liquid Glass Glint */}
          {material === 'glossy' && (
            <linearGradient id={`${uid}-glossy-glint`} x1="0" y1="0" x2="0.3" y2="1">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.85" />
              <stop offset="35%" stopColor="#ffffff" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#ffffff" stopOpacity="0" />
            </linearGradient>
          )}

          {/* 3. Translucent / Frosted Jelly Core Backlight */}
          {material === 'translucent' && (
            <radialGradient id={`${uid}-translucent-core`} cx="50%" cy="45%" r="55%">
              <stop offset="0%" stopColor="#ffffff" stopOpacity="0.7" />
              <stop offset="35%" stopColor={resinColor} stopOpacity="0.7" />
              <stop offset="85%" stopColor={resinColor} stopOpacity="0.92" />
              <stop offset="100%" stopColor="#000000" stopOpacity="0.65" />
            </radialGradient>
          )}

          {/* Cyber Oni Horn Gradient (Deep obsidian base, resin body blend, glowing crimson tip) */}
          <linearGradient id={`${uid}-horn-grad`} x1="0" y1="1" x2="0.2" y2="0">
            <stop offset="0%" stopColor="#0a0e17" stopOpacity="1" />
            <stop offset="40%" stopColor={resinColor} stopOpacity="0.85" />
            <stop offset="78%" stopColor="#dc2626" stopOpacity="0.95" />
            <stop offset="100%" stopColor="#f87171" stopOpacity="1" />
          </linearGradient>
        </defs>

        {/* ── Grounding Contact Shadow ── */}
        <ellipse
          cx="50"
          cy="91"
          rx="36"
          ry="6.5"
          fill="rgba(0,0,0,0.65)"
          filter={`url(#${uid}-ground-shadow)`}
        />

        {/* ── 1. Outer Keycap Skirt (3D Body Base) ── */}
        <path
          d={skirtPath}
          fill={material === 'translucent' ? `url(#${uid}-translucent-core)` : `url(#${uid}-resin-body)`}
        />
        {/* Chamfer Side Shading for 3D Volume */}
        <path d={skirtPath} fill={`url(#${uid}-skirt-shading)`} />

        {/* Bottom Lip Shadow Accent */}
        <path
          d="M 22 88 C 30 92 70 92 78 88 C 76 90 24 90 22 88 Z"
          fill="#000000"
          opacity="0.3"
        />

        {/* ── 2. Top Sculpted Dish / Front Face ── */}
        <path
          d={dishPath}
          fill={
            material === 'metallic'
              ? `url(#${uid}-metallic-lustre)`
              : material === 'translucent'
              ? `url(#${uid}-translucent-core)`
              : resinColor
          }
          opacity={material === 'translucent' ? 0.8 : 0.96}
        />

        {/* Translucent Mode: Internal Mechanical Stem Silhouette (+) */}
        {material === 'translucent' && (
          <g opacity="0.35" fill="#000000">
            {/* Vertical stem cross */}
            <rect x="47.5" y="44" width="5" height="18" rx="1.5" />
            {/* Horizontal stem cross */}
            <rect x="41" y="50.5" width="18" height="5" rx="1.5" />
            {/* Stem center circular reinforcement */}
            <circle cx="50" cy="53" r="10" fill="none" stroke="#000000" strokeWidth="2.5" />
          </g>
        )}

        {/* Glossy Mode: Curved Specular Refraction Arc */}
        {material === 'glossy' && (
          <g>
            <path
              d="M 26 23 C 36 17 64 17 74 23 C 68 28 32 28 26 23 Z"
              fill={`url(#${uid}-glossy-glint)`}
            />
            {/* Upper Left Pinpoint Glint */}
            <ellipse cx="28" cy="28" rx="2.5" ry="1.4" fill="#ffffff" opacity="0.75" transform="rotate(-25 28 28)" />
          </g>
        )}

        {/* Metallic Mode: Top Chamfer Light Sheen */}
        {material === 'metallic' && (
          <path
            d="M 24 23 C 34 18 66 18 76 23 L 73 28 C 65 24 35 24 27 28 Z"
            fill="#ffffff"
            opacity="0.45"
          />
        )}

        {/* Matte / Universal: Top Edge Crisp Bevel Highlight */}
        <path
          d="M 24 16 L 76 16"
          stroke={`url(#${uid}-rim-highlight)`}
          strokeWidth="1.6"
          strokeLinecap="round"
          opacity={material === 'matte' ? 0.7 : 0.5}
        />

        {/* Spherical Dish Recess Shadow (Gives the impression of a deep concave bowl) */}
        <ellipse
          cx="50"
          cy="78"
          rx="26"
          ry="3.5"
          fill="#000000"
          opacity="0.22"
        />

        {/* ── 3. 3D Sculpted Accessories (Sitting naturally on top of the keycap) ── */}

        {/* Accessory: Cat Ears (Sculpted 3D Resin Ears matching reference) */}
        {accessory === 'catears' && (
          <g>
            {/* Left Ear Cast Shadow onto Keycap Dish */}
            <path
              d="M 19 36 Q 30 32 40 25"
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Left Ear Outer 3D Shell */}
            <path
              d="M 20 37 L 22 17 C 23 15 25 14 27 16 L 41 26 Z"
              fill={resinColor}
              stroke="#000000"
              strokeOpacity="0.28"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Left Ear Metallic/Gloss Sheen */}
            {material === 'metallic' && (
              <path
                d="M 22 19 L 26 16 L 31 23 Z"
                fill="#ffffff"
                opacity="0.4"
              />
            )}
            {/* Left Ear Inner Cavity (Pillowy Pink / Cream contrast) */}
            <path
              d="M 23 33 L 24 20 L 36 26 Z"
              fill="#fbcfe8"
              stroke="#000000"
              strokeOpacity="0.2"
              strokeWidth="0.8"
            />

            {/* Right Ear Cast Shadow */}
            <path
              d="M 60 25 Q 70 32 81 36"
              stroke="rgba(0,0,0,0.35)"
              strokeWidth="2.5"
              strokeLinecap="round"
            />
            {/* Right Ear Outer 3D Shell */}
            <path
              d="M 59 26 L 73 16 C 75 14 77 15 78 17 L 80 37 Z"
              fill={resinColor}
              stroke="#000000"
              strokeOpacity="0.28"
              strokeWidth="1.2"
              strokeLinejoin="round"
            />
            {/* Right Ear Sheen */}
            {material === 'metallic' && (
              <path
                d="M 78 19 L 74 16 L 69 23 Z"
                fill="#ffffff"
                opacity="0.4"
              />
            )}
            {/* Right Ear Inner Cavity */}
            <path
              d="M 64 26 L 76 20 L 77 33 Z"
              fill="#fbcfe8"
              stroke="#000000"
              strokeOpacity="0.2"
              strokeWidth="0.8"
            />
          </g>
        )}

        {/* Accessory: Horns (Sculpted 3D Cyber Oni / Dragon Horns) */}
        {accessory === 'horns' && (
          <g>
            {/* Left Horn Shadow on Dish */}
            <path
              d="M 20 28 Q 27 25 35 22"
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Left Horn 3D Outer Shell */}
            <path
              d="M 22 26 C 17 17 14 9 16 3.5 C 17.2 2.5 19 2.5 20 4 C 24 11 30 18 34 22 C 30 25 25 26 22 26 Z"
              fill={`url(#${uid}-horn-grad)`}
              stroke="#000000"
              strokeOpacity="0.4"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
            {/* Left Horn Specular Outer Ridge */}
            <path
              d="M 21 24 C 18 16 15 9 17 4.5"
              stroke="#ffffff"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.65"
              fill="none"
            />
            {/* Left Horn Sculpted Rib Lines */}
            <path d="M 20 18 Q 24 19 28 16" stroke="#000000" strokeWidth="1" strokeOpacity="0.45" fill="none" />
            <path d="M 20 19 Q 24 20 28 17" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.4" fill="none" />
            <path d="M 18 11 Q 21 12 24 10" stroke="#000000" strokeWidth="0.9" strokeOpacity="0.45" fill="none" />
            <path d="M 18 12 Q 21 13 24 11" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.4" fill="none" />
            {/* Left Horn Glowing Ember Tip */}
            <circle cx="17" cy="4" r="2.2" fill="#ef4444" opacity="0.95" />
            <circle cx="17" cy="4" r="1" fill="#fecaca" />

            {/* Right Horn Shadow on Dish */}
            <path
              d="M 80 28 Q 73 25 65 22"
              stroke="rgba(0,0,0,0.5)"
              strokeWidth="3.2"
              strokeLinecap="round"
            />
            {/* Right Horn 3D Outer Shell */}
            <path
              d="M 78 26 C 83 17 86 9 84 3.5 C 82.8 2.5 81 2.5 80 4 C 76 11 70 18 66 22 C 70 25 75 26 78 26 Z"
              fill={`url(#${uid}-horn-grad)`}
              stroke="#000000"
              strokeOpacity="0.4"
              strokeWidth="1.1"
              strokeLinejoin="round"
            />
            {/* Right Horn Specular Outer Ridge */}
            <path
              d="M 79 24 C 82 16 85 9 83 4.5"
              stroke="#ffffff"
              strokeWidth="1"
              strokeLinecap="round"
              opacity="0.65"
              fill="none"
            />
            {/* Right Horn Sculpted Rib Lines */}
            <path d="M 80 18 Q 76 19 72 16" stroke="#000000" strokeWidth="1" strokeOpacity="0.45" fill="none" />
            <path d="M 80 19 Q 76 20 72 17" stroke="#ffffff" strokeWidth="0.6" strokeOpacity="0.4" fill="none" />
            <path d="M 82 11 Q 79 12 76 10" stroke="#000000" strokeWidth="0.9" strokeOpacity="0.45" fill="none" />
            <path d="M 82 12 Q 79 13 76 11" stroke="#ffffff" strokeWidth="0.5" strokeOpacity="0.4" fill="none" />
            {/* Right Horn Glowing Ember Tip */}
            <circle cx="83" cy="4" r="2.2" fill="#ef4444" opacity="0.95" />
            <circle cx="83" cy="4" r="1" fill="#fecaca" />
          </g>
        )}

        {/* Accessory: Sci-Fi Robot Antenna */}
        {accessory === 'antenna' && (
          <g>
            {/* Base socket on cap */}
            <ellipse cx="50" cy="16" rx="5" ry="2" fill="#000000" opacity="0.4" />
            {/* Articulated Stalk */}
            <line
              x1="50"
              y1="16"
              x2="50"
              y2="5"
              stroke={faceInk}
              strokeWidth="2.8"
              strokeLinecap="round"
            />
            {/* Joint Ring */}
            <ellipse cx="50" cy="10" rx="2.5" ry="1.2" fill="#ffffff" opacity="0.8" />
            {/* Glowing Transceiver Bulb */}
            <circle
              cx="50"
              cy="4.5"
              r="4.5"
              fill={resinColor}
              stroke="#ffffff"
              strokeWidth="1.2"
            />
            {/* Core Specular Dot */}
            <circle cx="49" cy="3.5" r="1.5" fill="#ffffff" />
            {/* Signal Pulse Wave Ring */}
            <circle
              cx="50"
              cy="4.5"
              r="7.5"
              fill="none"
              stroke={resinColor}
              strokeWidth="0.8"
              opacity="0.6"
              strokeDasharray="2 2"
            />
          </g>
        )}

        {/* Accessory: Sparkles (Anime 4-Point Starlight) */}
        {accessory === 'sparkles' && (
          <g fill="#ffffff">
            {/* Sparkle 1 (Upper Left) */}
            <path
              d="M 23 16 L 25 20 L 29 22 L 25 24 L 23 28 L 21 24 L 17 22 L 21 20 Z"
              opacity="0.95"
            />
            <circle cx="23" cy="22" r="1.2" fill={resinColor} />

            {/* Sparkle 2 (Upper Right) */}
            <path
              d="M 77 18 L 78.5 21.5 L 82 23 L 78.5 24.5 L 77 28 L 75.5 24.5 L 72 23 L 75.5 21.5 Z"
              opacity="0.9"
            />
            <circle cx="77" cy="23" r="1" fill={resinColor} />
          </g>
        )}

        {/* ── 4. Facial Expression: Cheeks (Soft Rosy Blush) ── */}
        {hasBlush && (
          <g filter={`url(#${uid}-blush-blur)`} opacity="0.6">
            {/* Left Pillowy Cheek */}
            <ellipse cx="26" cy="59" rx="5.5" ry="3.2" fill="#ff5d7a" />
            {/* Right Pillowy Cheek */}
            <ellipse cx="74" cy="59" rx="5.5" ry="3.2" fill="#ff5d7a" />
          </g>
        )}

        {/* ── 5. Facial Expression: Eyes ── */}
        <g fill={faceInk} stroke={faceInk}>
          {eyes === 'dot' && (
            <>
              {/* Left Eye: Glossy Obsidian Bead with Twinkle Reflection */}
              <circle cx={leftEyeX} cy={eyeY} r="3.8" fill={faceInk} stroke="none" />
              <circle cx={leftEyeX + 1.2} cy={eyeY - 1.2} r="1.3" fill="#ffffff" stroke="none" />
              <circle cx={leftEyeX - 1.2} cy={eyeY + 1.2} r="0.6" fill="#ffffff" stroke="none" opacity="0.75" />

              {/* Right Eye */}
              <circle cx={rightEyeX} cy={eyeY} r="3.8" fill={faceInk} stroke="none" />
              <circle cx={rightEyeX + 1.2} cy={eyeY - 1.2} r="1.3" fill="#ffffff" stroke="none" />
              <circle cx={rightEyeX - 1.2} cy={eyeY + 1.2} r="0.6" fill="#ffffff" stroke="none" opacity="0.75" />
            </>
          )}

          {eyes === 'happy' && (
            <>
              {/* ^ ^ Cheerful Kawaii Arcs */}
              <path
                d={`M ${leftEyeX - 4.5} ${eyeY + 2.5} Q ${leftEyeX} ${eyeY - 4.5} ${leftEyeX + 4.5} ${eyeY + 2.5}`}
                fill="none"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <path
                d={`M ${rightEyeX - 4.5} ${eyeY + 2.5} Q ${rightEyeX} ${eyeY - 4.5} ${rightEyeX + 4.5} ${eyeY + 2.5}`}
                fill="none"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </>
          )}

          {eyes === 'sleepy' && (
            <>
              {/* - - Peaceful Arcs */}
              <path
                d={`M ${leftEyeX - 4.5} ${eyeY - 0.5} Q ${leftEyeX} ${eyeY + 3.5} ${leftEyeX + 4.5} ${eyeY - 0.5}`}
                fill="none"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              <path
                d={`M ${rightEyeX - 4.5} ${eyeY - 0.5} Q ${rightEyeX} ${eyeY + 3.5} ${rightEyeX + 4.5} ${eyeY - 0.5}`}
                fill="none"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
            </>
          )}

          {eyes === 'star' && (
            <>
              {/* ✦ ✦ Starlight Sparkle Eyes */}
              <path
                d={`M ${leftEyeX} ${eyeY - 5} L ${leftEyeX + 1.5} ${eyeY - 1.5} L ${leftEyeX + 5} ${eyeY} L ${leftEyeX + 1.5} ${eyeY + 1.5} L ${leftEyeX} ${eyeY + 5} L ${leftEyeX - 1.5} ${eyeY + 1.5} L ${leftEyeX - 5} ${eyeY} L ${leftEyeX - 1.5} ${eyeY - 1.5} Z`}
                fill={faceInk}
                stroke="none"
              />
              <circle cx={leftEyeX} cy={eyeY} r="0.9" fill="#ffffff" stroke="none" />

              <path
                d={`M ${rightEyeX} ${eyeY - 5} L ${rightEyeX + 1.5} ${eyeY - 1.5} L ${rightEyeX + 5} ${eyeY} L ${rightEyeX + 1.5} ${eyeY + 1.5} L ${rightEyeX} ${eyeY + 5} L ${rightEyeX - 1.5} ${eyeY + 1.5} L ${rightEyeX - 5} ${eyeY} L ${rightEyeX - 1.5} ${eyeY - 1.5} Z`}
                fill={faceInk}
                stroke="none"
              />
              <circle cx={rightEyeX} cy={eyeY} r="0.9" fill="#ffffff" stroke="none" />
            </>
          )}

          {eyes === 'angry' && (
            <>
              {/* > < Anime Pout Eyes */}
              <path
                d={`M ${leftEyeX - 4.5} ${eyeY - 3.5} L ${leftEyeX + 3.5} ${eyeY} L ${leftEyeX - 4.5} ${eyeY + 3.5}`}
                fill="none"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
              <path
                d={`M ${rightEyeX + 4.5} ${eyeY - 3.5} L ${rightEyeX - 3.5} ${eyeY} L ${rightEyeX + 4.5} ${eyeY + 3.5}`}
                fill="none"
                strokeWidth="2.6"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </>
          )}

          {eyes === 'wink' && (
            <>
              {/* Left Eye: Wink Arc */}
              <path
                d={`M ${leftEyeX - 4.5} ${eyeY + 1.5} Q ${leftEyeX} ${eyeY - 3.5} ${leftEyeX + 4.5} ${eyeY + 1.5}`}
                fill="none"
                strokeWidth="2.8"
                strokeLinecap="round"
              />
              {/* Right Eye: Open Twinkle Bead */}
              <circle cx={rightEyeX} cy={eyeY} r="3.8" fill={faceInk} stroke="none" />
              <circle cx={rightEyeX + 1.2} cy={eyeY - 1.2} r="1.3" fill="#ffffff" stroke="none" />
            </>
          )}
        </g>

        {/* ── 6. Facial Expression: Mouth ── */}
        <g fill="none" stroke={faceInk} strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
          {mouth === 'cat' && (
            /* :3 Cute Cat Omega Mouth */
            <path d={`M 43 ${mouthY - 1} Q 46.5 ${mouthY + 3.5} 50 ${mouthY + 0.2} Q 53.5 ${mouthY + 3.5} 57 ${mouthY - 1}`} />
          )}

          {mouth === 'smile' && (
            <path d={`M 44 ${mouthY} Q 50 ${mouthY + 4.5} 56 ${mouthY}`} />
          )}

          {mouth === 'open' && (
            /* Happy Open Smile with Pink Tongue */
            <g>
              <path
                d={`M 44 ${mouthY} Q 50 ${mouthY - 1.5} 56 ${mouthY} Q 56 ${mouthY + 7} 50 ${mouthY + 7} Q 44 ${mouthY + 7} 44 ${mouthY} Z`}
                fill={faceInk}
                stroke="none"
              />
              {/* Tongue */}
              <ellipse cx="50" cy={mouthY + 4.8} rx="3" ry="1.8" fill="#ff4d6d" stroke="none" />
            </g>
          )}

          {mouth === 'flat' && (
            <line x1="44" y1={mouthY + 1} x2="56" y2={mouthY + 1} />
          )}

          {mouth === 'tongue' && (
            <g>
              <path d={`M 43 ${mouthY} Q 50 ${mouthY + 3.5} 57 ${mouthY}`} />
              <path
                d={`M 48 ${mouthY + 1.5} C 48 ${mouthY + 6.5} 52 ${mouthY + 6.5} 52 ${mouthY + 1.5} Z`}
                fill="#f43f5e"
                stroke="#000000"
                strokeOpacity="0.2"
                strokeWidth="0.8"
              />
            </g>
          )}

          {mouth === 'ooo' && (
            <ellipse cx="50" cy={mouthY + 1} rx="3" ry="3.4" fill="none" strokeWidth="2.4" />
          )}
        </g>
      </motion.svg>
    </div>
  );
});
