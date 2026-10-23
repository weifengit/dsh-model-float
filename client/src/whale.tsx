/**
 * Model Float — the whale-girl mark.
 *
 * A hand-drawn SVG whale girl: a blue whale body with a white belly, a bob of
 * hair with a fringe, a proper whale fluke at the back, a pectoral fin and a
 * small sailor bow. It is drawn inline (no asset fetch, no build step) and
 * animates in CSS — the fluke sways, the body bobs, and the eye blinks.
 *
 * The mark is purely decorative: the float's accessible name comes from the
 * button that wraps it, so the SVG itself is `aria-hidden`.
 *
 * @module client/src/whale.tsx
 */

import React from 'react'

/**
 * The whale-girl mark.
 *
 * @param props.size - the rendered edge length in px.
 */
export function WhaleMark({ size = 64 }: { size?: number }): React.ReactElement {
  return (
    <svg
      className="mf-whale"
      width={size}
      height={size}
      viewBox="0 0 100 100"
      aria-hidden="true"
      focusable="false"
    >
      <defs>
        <linearGradient id="mf-body" x1="0.2" y1="0" x2="0.6" y2="1">
          <stop offset="0%" stopColor="#8ec2ff" />
          <stop offset="55%" stopColor="#5a95e8" />
          <stop offset="100%" stopColor="#3b74c9" />
        </linearGradient>
        <linearGradient id="mf-belly" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor="#ffffff" />
          <stop offset="100%" stopColor="#dbe9ff" />
        </linearGradient>
        <linearGradient id="mf-hair" x1="0.1" y1="0" x2="0.9" y2="1">
          <stop offset="0%" stopColor="#6a8fe0" />
          <stop offset="60%" stopColor="#4a6ec4" />
          <stop offset="100%" stopColor="#33489a" />
        </linearGradient>
      </defs>

      {/* ── the fluke: a proper two-lobed whale tail, hinged at the back ── */}
      <g className="mf-whale-tail">
        <path
          d="M32 50 C18 46 8 36 2 22 C16 24 27 32 34 41 C37 37 41 34 46 32
             C43 40 38 45 34 50 C38 55 43 60 46 68 C41 66 37 63 34 59
             C27 68 16 76 2 78 C8 64 18 55 32 50 Z"
          fill="url(#mf-hair)"
        />
        <path
          d="M30 50 C24 48 18 46 14 42 C18 46 22 48 26 50 Z"
          fill="#ffffff"
          opacity="0.28"
        />
      </g>

      {/* ── the body ── */}
      <g className="mf-whale-body">
        {/* the whale's head-and-body mass, facing right */}
        <path
          d="M30 50 C30 33 44 24 60 24 C76 24 88 33 90 45 C91 52 89 58 85 62
             C78 71 66 76 54 76 C39 76 30 65 30 50 Z"
          fill="url(#mf-body)"
        />
        {/* the pale belly, sweeping under the chin */}
        <path
          d="M78 58 C74 69 64 75 53 75 C42 75 34 67 31 57 C38 63 47 66 57 65
             C67 64 74 62 78 58 Z"
          fill="url(#mf-belly)"
        />
        {/* the mouth line, along the whale's jaw */}
        <path
          d="M84 60 C80 64 74 66 68 66"
          stroke="#2b4f9e"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
          opacity="0.55"
        />
        {/* the pectoral fin */}
        <path
          d="M58 70 C54 78 56 84 62 85 C66 80 66 74 64 70 Z"
          fill="#4a86d8"
        />
        {/* the blowhole spout */}
        <g className="mf-whale-spout" opacity="0.75">
          <circle cx="52" cy="21" r="2" fill="#cfe6ff" />
          <circle cx="47" cy="17" r="1.6" fill="#cfe6ff" />
          <circle cx="57" cy="16" r="1.4" fill="#cfe6ff" />
        </g>
      </g>

      {/* ── the hair: a bob with a fringe, drawn over the body's top ── */}
      <g className="mf-whale-hair">
        <path
          d="M32 46 C30 30 42 19 57 18 C73 17 86 26 88 40 C89 46 89 51 88 55
             C86 47 82 40 75 36 C66 31 54 31 45 35 C39 38 35 42 32 46 Z"
          fill="url(#mf-hair)"
        />
        {/* the fringe over the brow */}
        <path
          d="M44 35 C52 27 66 25 76 32 C70 30 63 31 58 35 C52 40 46 42 40 43
             C41 40 42 37 44 35 Z"
          fill="#5578c9"
        />
        {/* the side locks framing the face */}
        <path d="M33 43 C29 52 29 61 33 68 C36 60 36 51 37 45 Z" fill="#3f60b5" />
        <path d="M87 41 C91 51 90 60 86 67 C83 59 83 50 83 45 Z" fill="#3f60b5" />
      </g>

      {/* ── the face ── */}
      <g className="mf-whale-face">
        <g className="mf-whale-eye">
          <ellipse cx="63" cy="48" rx="5" ry="6.2" fill="#1b2a4a" />
          <ellipse cx="65" cy="45" rx="2" ry="2.2" fill="#ffffff" />
          <path
            d="M58 41.5 C60 39.5 66 39.5 68 41.5"
            stroke="#1b2a4a"
            strokeWidth="1.4"
            fill="none"
            strokeLinecap="round"
          />
        </g>
        <ellipse cx="74" cy="55" rx="5" ry="3" fill="#ff9ec4" opacity="0.55" />
        <path
          d="M67 57 Q70 60 73 57"
          stroke="#1b2a4a"
          strokeWidth="1.6"
          fill="none"
          strokeLinecap="round"
        />
        {/* a little sailor collar with a bow */}
        <path d="M72 63 C76 64 80 66 81 68 C77 70 72 69 69 67 Z" fill="#ffffff" opacity="0.9" />
        <path d="M74 66 L78 63 L80 68 L75 70 Z" fill="#ff7fa8" />
      </g>
    </svg>
  )
}
