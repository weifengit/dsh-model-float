/**
 * Model Float — styles.
 *
 * The panel lives in the shell's frame-wide overlay layer, which is
 * click-through by default; every element here that must receive pointer
 * events opts back in explicitly, so the float never blocks the app
 * underneath it.
 *
 * Colour comes from the shell's own theme variables (`--dsw-alias-*`), so the
 * panel follows a scheme switch. Every variable has a literal fallback: the
 * panel has to stay legible even when one of them is missing.
 *
 * @module client/src/styles.ts
 */

/** The panel's stylesheet, injected once per plugin lifetime. */
export const CSS = `
/*
 * DeepSeek's own brand blue, taken from the official site's stylesheet
 * (the --ds-color-brand token, #4d6bfe).
 */
.mf-root {
  --mf-brand-blue: #4d6bfe;
  position: fixed;
  /* Above every layer the app draws (splitters 99, pane resizers 100, the
     workbench title bar 40, the composer seat 35) and below its toasts
     (1200) — a notification is allowed to cover the float, a splitter is not.
     The float is portalled onto the body, so this value is not confined by
     the overlay layer's own stacking context. */
  z-index: 1000;
  pointer-events: none;
  font-family: var(--dsw-alias-font-family, ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif);
  font-size: 13px;
  line-height: 1.45;
  color: var(--dsw-alias-label-primary, #1f2430);
}
.mf-card-shell {
  /* The seat is 54 × 54 — the same square the reference music ball uses — so
     the float is the same size and drags with the same hitbox.
     It is absolutely placed so it does not push the whale down the flow: the
     whale is the float's anchor, and the card is what hangs off it. */
  position: absolute;
  left: 0;
  top: 0;
  width: 54px;
  height: 54px;
  pointer-events: none;
}

/* The card opens beside the whale: on the whale's right when it sits on the
   left of the screen, on its left when it sits on the right. Vertically it
   opens upward from a whale in the lower half and downward from one in the
   upper half, so it never runs off the screen. */
.mf-root[data-mf-side="left"] .mf-card { right: 0; }
.mf-root[data-mf-side="right"] .mf-card { left: 0; }
/* The whale sits at the root's origin; the card hangs beside it. */
.mf-root > .mf-whale-btn { position: absolute; left: 0; top: 0; }
.mf-root[data-mf-vertical="up"] .mf-card { bottom: calc(100% + 10px); }
.mf-root[data-mf-vertical="down"] .mf-card { top: calc(100% + 10px); }
.mf-root[data-mf-side="left"] .mf-card { transform-origin: bottom left; }
.mf-root[data-mf-side="right"] .mf-card { transform-origin: bottom right; }
.mf-root[data-mf-vertical="down"] .mf-card { transform-origin: top left; }
.mf-root[data-mf-vertical="down"][data-mf-side="left"] .mf-card { transform-origin: top right; }

/* ── the card ───────────────────────────────────────────────────────────── */

.mf-card {
  position: absolute;
  pointer-events: auto;
  width: 320px;
  max-height: min(64vh, 520px);
  overflow: hidden auto;
  border: 1px solid var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.14));
  border-radius: 14px;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.94));
  backdrop-filter: blur(18px) saturate(140%);
  box-shadow: 0 18px 48px rgba(0, 0, 0, 0.34);
  opacity: 0;
  transform: translateY(6px) scale(0.98);
  pointer-events: none;
  transition: opacity 140ms ease, transform 140ms ease;
}
.mf-card-shell.is-open .mf-card {
  opacity: 1;
  transform: translateY(0) scale(1);
  pointer-events: auto;
}

@media (prefers-reduced-motion: reduce) {
  .mf-card { transition: none; }
  .mf-whale { animation: none !important; }
}

.mf-card-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  padding: 12px 12px 8px;
  position: sticky;
  top: 0;
  background: var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.94));
  z-index: 1;
}
.mf-card-head-text { display: flex; flex-direction: column; gap: 2px; min-width: 0; }
.mf-card-head strong { font-size: 13px; font-weight: 600; color: var(--dsw-alias-label-primary, #1f2430); }
.mf-card-sub { font-size: 11.5px; color: var(--dsw-alias-label-secondary, #5b6472); }
.mf-card-actions { display: flex; gap: 4px; flex-shrink: 0; }

.mf-icon-btn {
  width: 24px;
  height: 24px;
  border-radius: 7px;
  border: 1px solid var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.14));
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b6472);
  font-size: 13px;
  line-height: 1;
  cursor: pointer;
  padding: 0;
}
/* The master switch: one control that hides (or restores) every unusable
   vendor's models. It reads as a switch, not a button, because it is a state
   the user leaves on — and that state has to be legible at a glance. */
.mf-switch {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 24px;
  padding: 0 8px 0 3px;
  border-radius: 999px;
  border: 1px solid var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.14));
  background: transparent;
  color: var(--dsw-alias-label-secondary, #5b6472);
  font-size: 11.5px;
  line-height: 1;
  cursor: pointer;
  white-space: nowrap;
}
.mf-switch:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(15, 23, 42, 0.06));
  color: var(--dsw-alias-label-primary, #1f2430);
}
.mf-switch:disabled { opacity: 0.5; cursor: default; }
.mf-switch.is-on {
  border-color: color-mix(in srgb, var(--dsw-alias-state-success-primary, #067647) 45%, transparent);
  color: var(--dsw-alias-state-success-primary, #067647);
}
.mf-switch-knob {
  width: 16px;
  height: 16px;
  border-radius: 50%;
  background: var(--dsw-alias-label-tertiary, #8a93a2);
  transition: background 140ms ease, transform 140ms ease;
}
.mf-switch.is-on .mf-switch-knob {
  background: var(--dsw-alias-state-success-primary, #067647);
  transform: translateX(1px);
}
.mf-switch-text { font-weight: 550; }

.mf-icon-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(15, 23, 42, 0.06));
  color: var(--dsw-alias-label-primary, #1f2430);
}
.mf-icon-btn:disabled { opacity: 0.45; cursor: default; }

.mf-text-btn {
  border: none;
  background: transparent;
  color: var(--dsw-alias-brand-text, #2f6feb);
  font-size: 11.5px;
  cursor: pointer;
  padding: 0;
}
.mf-text-btn:hover { text-decoration: underline; }

.mf-error {
  margin: 0 12px 8px;
  padding: 7px 9px;
  border-radius: 8px;
  font-size: 11.5px;
  color: var(--dsw-alias-state-error-primary, #b42318);
  background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b42318) 12%, transparent);
}

/* ── the vendor table ───────────────────────────────────────────────────── */

.mf-vendor-list { padding: 0 6px 4px; }

.mf-vendor {
  display: grid;
  grid-template-columns: 3px 1fr auto auto;
  align-items: center;
  gap: 9px;
  padding: 7px 6px;
  border-radius: 9px;
}
.mf-vendor + .mf-vendor { border-top: 1px solid var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.07)); }
.mf-vendor-stripe { width: 3px; height: 26px; border-radius: 2px; opacity: 0.9; }
.mf-vendor-main { display: flex; flex-direction: column; min-width: 0; }
.mf-vendor-name {
  font-size: 12.5px;
  font-weight: 550;
  color: var(--dsw-alias-label-primary, #1f2430);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mf-vendor-models { color: var(--dsw-alias-label-tertiary, #8a93a2); }
.mf-vendor-error {
  font-size: 10px;
  color: var(--dsw-alias-state-error-primary, #b42318);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mf-vendor-org {
  font-size: 10.5px;
  color: var(--dsw-alias-label-tertiary, #8a93a2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mf-vendor-models { color: var(--dsw-alias-label-tertiary, #8a93a2); }
.mf-vendor.is-hidden-models .mf-vendor-name { opacity: 0.6; }

/* The hide/restore button: one click takes a vendor's models out of (or back
   into) the chat composer's model picker. */
.mf-hide-btn {
  width: 22px;
  height: 22px;
  flex-shrink: 0;
  padding: 0;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--dsw-alias-label-tertiary, #8a93a2);
  font-size: 12px;
  line-height: 1;
  cursor: pointer;
}
.mf-hide-btn:hover:not(:disabled) {
  background: var(--dsw-alias-interactive-bg-hover, rgba(15, 23, 42, 0.06));
  border-color: var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.14));
  color: var(--dsw-alias-label-primary, #1f2430);
}
.mf-hide-btn.is-restore { color: var(--dsw-alias-state-success-primary, #067647); }
.mf-hide-btn:disabled { opacity: 0.45; cursor: default; }
.mf-vendor-meta { display: flex; flex-direction: column; align-items: flex-end; gap: 1px; }
.mf-vendor-state { font-size: 10.5px; padding: 1px 6px; border-radius: 999px; white-space: nowrap; }
.mf-vendor-state.is-on { color: var(--dsw-alias-state-success-primary, #067647); background: color-mix(in srgb, var(--dsw-alias-state-success-primary, #067647) 14%, transparent); }
.mf-vendor-state.is-idle { color: var(--dsw-alias-state-warn-primary, #b54708); background: color-mix(in srgb, var(--dsw-alias-state-warn-primary, #b54708) 14%, transparent); }
.mf-vendor-state.is-closed { color: var(--dsw-alias-label-secondary, #667085); background: color-mix(in srgb, var(--dsw-alias-label-secondary, #667085) 16%, transparent); }
.mf-vendor-state.is-hidden { color: var(--dsw-alias-label-secondary, #667085); background: color-mix(in srgb, var(--dsw-alias-label-secondary, #667085) 16%, transparent); }
.mf-vendor-state.is-empty { color: var(--dsw-alias-state-error-primary, #b42318); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b42318) 12%, transparent); }
.mf-vendor-state.is-error { color: var(--dsw-alias-state-error-primary, #b42318); background: color-mix(in srgb, var(--dsw-alias-state-error-primary, #b42318) 12%, transparent); }
.mf-vendor-state.is-unknown { color: var(--dsw-alias-label-secondary, #667085); background: color-mix(in srgb, var(--dsw-alias-label-secondary, #667085) 14%, transparent); }
.mf-vendor-balance {
  font-size: 12.5px;
  font-variant-numeric: tabular-nums;
  font-weight: 600;
  color: var(--dsw-alias-label-primary, #1f2430);
  white-space: nowrap;
}
.mf-vendor.is-closed .mf-vendor-name,
.mf-vendor.is-idle .mf-vendor-name,
.mf-vendor.is-unknown .mf-vendor-name { opacity: 0.72; }

.mf-card-foot {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  padding: 8px 12px 10px;
  border-top: 1px solid var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.07));
}
.mf-foot-time { font-size: 10.5px; color: var(--dsw-alias-label-tertiary, #8a93a2); }

.mf-empty { margin: 0; padding: 10px 12px; font-size: 11.5px; color: var(--dsw-alias-label-tertiary, #8a93a2); }
.mf-note {
  margin: 0 12px 6px;
  font-size: 11px;
  color: var(--dsw-alias-label-tertiary, #8a93a2);
}

/* ── the per-model list ─────────────────────────────────────────────────── */

.mf-model-list {
  border-top: 1px solid var(--dsw-alias-border-l3, rgba(15, 23, 42, 0.07));
  padding: 6px 8px 10px;
  max-height: 200px;
  overflow: auto;
}
.mf-model {
  display: grid;
  grid-template-columns: 1fr auto;
  align-items: baseline;
  gap: 8px;
  padding: 3px 4px;
  border-radius: 6px;
}
.mf-model-name {
  font-size: 11.5px;
  color: var(--dsw-alias-label-primary, #1f2430);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mf-model-state { font-size: 10.5px; white-space: nowrap; }
.mf-model-detail {
  grid-column: 1 / -1;
  font-size: 10px;
  color: var(--dsw-alias-label-tertiary, #8a93a2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.mf-model.is-available .mf-model-state { color: var(--dsw-alias-state-success-primary, #067647); }
.mf-model.is-region-blocked .mf-model-state { color: var(--dsw-alias-state-warn-primary, #b54708); }
.mf-model.is-unavailable .mf-model-state { color: var(--dsw-alias-state-error-primary, #b42318); }
.mf-model.is-throttled .mf-model-state { color: var(--dsw-alias-state-warn-primary, #b54708); }
.mf-model.is-unknown .mf-model-state { color: var(--dsw-alias-label-secondary, #667085); }
.mf-model.is-unavailable .mf-model-name,
.mf-model.is-unknown .mf-model-name { opacity: 0.7; }

/* ── the whale ──────────────────────────────────────────────────────────── */

.mf-whale-btn {
  pointer-events: auto;
  position: relative;
  width: 54px;
  height: 54px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: grab;
  touch-action: none;
  /* Centre the wide mark in the square seat, the way the reference ball
     centres its icon. */
  display: flex;
  align-items: center;
  justify-content: center;
  filter: drop-shadow(0 6px 14px rgba(0, 0, 0, 0.42));
  transition: transform 160ms ease;
}
.mf-whale-btn:active { cursor: grabbing; transform: scale(0.96); }
.mf-card-shell.is-open .mf-whale-btn { transform: scale(1.06); }
.mf-whale-btn:focus-visible {
  outline: 2px solid var(--dsw-alias-brand-text, #2f6feb);
  outline-offset: 3px;
}

/* The official mark: one path, so the whole whale animates as one piece. */
.mf-whale {
  display: block;
  overflow: visible;
  /* The mark spans the seat's full width; its own height follows the viewBox
     aspect, and the flex seat centres it vertically. */
  width: 54px;
  height: auto;
  /*
   * At rest the whale wears the shell's neutral ink, the way the sidebar's
   * brand mark does. When the card opens it takes DeepSeek's own brand blue
   * (the --ds-color-brand token on deepseek.com), so the float visibly
   * "wakes up" into its official colours the moment it is showing what it
   * knows.
   */
  color: var(--dsw-alias-label-primary, #f9fafb);
  transition: color 220ms ease;
  animation: mf-swim 3.8s ease-in-out infinite;
}
.mf-card-shell.is-open .mf-whale {
  color: var(--mf-brand-blue, #4d6bfe);
}

@keyframes mf-swim {
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-4px) rotate(1.5deg); }
}

/* ── the ring ───────────────────────────────────────────────────────────── */

/* The ring is centred on the *whale*, which is 54 px wide: the seat's own
   centre, not the shell's corner. */
.mf-ring {
  position: absolute;
  left: 27px;
  top: 27px;
  transform: translate(-50%, -50%);
  pointer-events: auto;
  overflow: visible;
  animation: mf-ring-in 160ms ease-out;
}

@keyframes mf-ring-in {
  from { opacity: 0; transform: translate(-50%, -50%) scale(0.82); }
  to { opacity: 1; transform: translate(-50%, -50%) scale(1); }
}

/* The band behind the wedges: a soft, blurred disc that reads as glass
   rather than as a flat plate. The wedges are drawn on top of it, so the gaps
   between them still look like part of the ring. */
/* The pointer target. Transparent but painted, so it takes events where the
   drawing has holes; never visible. */
.mf-ring-hit {
  fill: transparent;
  stroke: none;
}

.mf-ring-band {
  /* The surface the dialog and the card are drawn on, held back to a
     translucent pane so whatever sits behind the float reads through the
     ring — the ring is a menu over the app, not a hole cut in it. */
  fill: color-mix(in srgb, var(--dsw-alias-bg-layer-2, rgba(255, 255, 255, 0.94)) 84%, transparent);
  /* No stroke: the band is a closed path, so stroking it would also draw its
     two radial edges — the straight seam that appeared above the whale. */
  stroke: none;
  filter: drop-shadow(0 10px 26px rgba(0, 0, 0, 0.3));
}

/* The ring's edge, inner and outer, as open arcs: a border without the
   radial seams. A translucent pane with only its outer edge stroked reads
   as a puddle rather than as a ring, so both radii are drawn. */
.mf-ring-rim,
.mf-ring-inner {
  fill: none;
  stroke: var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.16));
  stroke-width: 1;
  pointer-events: none;
}

.mf-ring-wedge-group { cursor: pointer; }
.mf-ring-wedge {
  fill: transparent;
  stroke: transparent;
  stroke-width: 1;
  transition: fill 130ms ease;
}
.mf-ring-wedge:hover,
.mf-ring-wedge.is-active {
  fill: color-mix(in srgb, var(--mf-brand-blue, #4d6bfe) 30%, transparent);
}
.mf-ring-wedge.is-disabled { cursor: default; opacity: 0.35; }

/* The icon is the pointer's target: an SVG has no background, so the parts
   of it that are not painted do not receive pointer events at all. Letting the
   icon take them is what makes a wedge clickable where its glyph is. */
.mf-ring-glyph {
  stroke: var(--dsw-alias-label-primary, #f9fafb);
  pointer-events: auto;
  user-select: none;
  cursor: pointer;
  transition: stroke 120ms ease;
}
.mf-ring-glyph.is-active {
  stroke: #fff;
  filter: drop-shadow(0 0 6px color-mix(in srgb, var(--mf-brand-blue, #4d6bfe) 90%, transparent));
}

/* The action's name, on the outer track under its icon. It stays horizontal
   and small: the quarter ring is cut to three 30° wedges, where rotated or
   wrapped text would not fit at all. */
.mf-ring-label {
  fill: var(--dsw-alias-label-primary, #f9fafb);
  font-size: 10px;
  font-weight: 500;
  letter-spacing: 0.2px;
  text-anchor: middle;
  opacity: 0.78;
  pointer-events: none;
  user-select: none;
  transition: opacity 120ms ease;
}
.mf-ring-label.is-active { opacity: 1; }

/* ── the lock screen ─────────────────────────────────────────────────────── */

.mf-lock {
  position: fixed;
  inset: 0;
  z-index: 2147483000;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 26px;
  padding: 40px;
  background: radial-gradient(120% 90% at 50% 0%, rgba(28, 30, 46, 0.92), rgba(8, 9, 14, 0.97));
  backdrop-filter: blur(26px) saturate(120%);
  color: #f3f5fb;
  font-family: var(--dsw-alias-font-family, ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif);
  animation: mf-lock-in 200ms ease-out;
}

@keyframes mf-lock-in {
  from { opacity: 0; }
  to { opacity: 1; }
}

.mf-lock-close {
  position: absolute;
  top: 22px;
  right: 26px;
  width: 34px;
  height: 34px;
  border-radius: 50%;
  border: 1px solid rgba(255, 255, 255, 0.16);
  background: rgba(255, 255, 255, 0.06);
  color: rgba(255, 255, 255, 0.72);
  font-size: 20px;
  line-height: 1;
  cursor: pointer;
}
.mf-lock-close:hover { background: rgba(255, 255, 255, 0.14); color: #fff; }

.mf-lock-clock { text-align: center; }
.mf-lock-time {
  font-size: clamp(76px, 15vw, 176px);
  font-weight: 700;
  letter-spacing: -0.03em;
  line-height: 1;
  font-variant-numeric: tabular-nums;
  text-shadow: 0 4px 30px rgba(0, 0, 0, 0.45);
}
.mf-lock-date { margin-top: 14px; font-size: 17px; font-weight: 500; color: rgba(255, 255, 255, 0.72); }

.mf-lock-weather { display: flex; align-items: center; gap: 12px; font-size: 16px; }
.mf-lock-weather-icon { font-size: 30px; }
.mf-lock-weather-temp { font-size: 30px; font-weight: 300; font-variant-numeric: tabular-nums; }
.mf-lock-weather-desc { color: rgba(255, 255, 255, 0.76); }
.mf-lock-weather-place { color: rgba(255, 255, 255, 0.5); font-size: 13px; }

.mf-lock-metrics {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(190px, 1fr));
  gap: 14px 30px;
  /* Wide enough for the network line at its worst: the read and write rates
     together, each with a unit, wrap onto two lines in a narrower grid. */
  width: min(900px, 92vw);
  padding: 20px 24px;
  border-radius: 16px;
  background: rgba(255, 255, 255, 0.05);
  border: 1px solid rgba(255, 255, 255, 0.08);
}
.mf-lock-metric { display: flex; flex-direction: column; gap: 5px; }
.mf-lock-metric-label { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255, 255, 255, 0.45); }
.mf-lock-metric-value {
  font-size: 20px;
  font-weight: 300;
  font-variant-numeric: tabular-nums;
  /* A rate that changes digits must not push the layout around. */
  white-space: nowrap;
}
.mf-lock-meter { display: block; height: 3px; border-radius: 2px; background: rgba(255, 255, 255, 0.1); overflow: hidden; }
.mf-lock-meter-fill { display: block; height: 100%; background: var(--mf-brand-blue, #4d6bfe); transition: width 400ms ease; }

.mf-lock-sessions { width: min(900px, 92vw); }
.mf-lock-sessions-title { font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; color: rgba(255, 255, 255, 0.45); margin-bottom: 8px; }
.mf-lock-sessions ul { list-style: none; margin: 0; padding: 0; display: flex; flex-direction: column; gap: 6px; }
.mf-lock-sessions li { display: flex; align-items: center; gap: 9px; font-size: 14px; color: rgba(255, 255, 255, 0.86); }
.mf-lock-session-dot { width: 6px; height: 6px; border-radius: 50%; background: #34d399; box-shadow: 0 0 8px rgba(52, 211, 153, 0.8); }
.mf-lock-session-title { overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }

.mf-lock-muted { color: rgba(255, 255, 255, 0.42); font-size: 13px; }

/* ── the action notice ──────────────────────────────────────────────────── */

/* A screen-anchored toast, not a bubble on the float.
   Anchored to the float it landed exactly where the ring's wedges are, and
   being clickable it swallowed the ring's own clicks — an action's result
   message would then block the very menu that produced it.
   Anchoring it to the viewport keeps it clear of the ring wherever the float
   has been dragged, and pointer-events: none means it can never intercept a
   click wherever the two happen to overlap. */
.mf-notice {
  position: fixed;
  left: 50%;
  bottom: 26px;
  transform: translateX(-50%);
  max-width: 340px;
  padding: 9px 14px;
  border-radius: 10px;
  background: var(--dsw-alias-bg-layer-2, rgba(44, 44, 46, 0.94));
  border: 1px solid var(--dsw-alias-border-l3, rgba(255, 255, 255, 0.12));
  color: var(--dsw-alias-label-primary, #f9fafb);
  font-size: 12px;
  text-align: center;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.36);
  pointer-events: none;
  animation: mf-notice-in 180ms ease-out;
}

@keyframes mf-notice-in {
  from { opacity: 0; transform: translateX(-50%) translateY(8px); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}
`
