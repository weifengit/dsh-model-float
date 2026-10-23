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
.mf-root {
  position: fixed;
  z-index: 30;
  pointer-events: none;
  font-family: var(--dsw-alias-font-family, ui-sans-serif, system-ui, -apple-system, "PingFang SC", "Microsoft YaHei", sans-serif);
  font-size: 13px;
  line-height: 1.45;
  color: var(--dsw-alias-label-primary, #1f2430);
}
.mf-card-shell {
  position: relative;
  width: 62px;
  height: 62px;
  pointer-events: none;
}

/* The card opens beside the whale: on the whale's right when it sits on the
   left of the screen, on its left when it sits on the right. Vertically it
   opens upward from a whale in the lower half and downward from one in the
   upper half, so it never runs off the screen. */
.mf-root[data-mf-side="left"] .mf-card { right: 0; }
.mf-root[data-mf-side="right"] .mf-card { left: 0; }
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
  width: 62px;
  height: 62px;
  padding: 0;
  border: none;
  border-radius: 50%;
  background: transparent;
  cursor: grab;
  touch-action: none;
  filter: drop-shadow(0 8px 18px rgba(0, 0, 0, 0.42));
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
  /* The mark is wider than it is tall; centre it in the square button. */
  margin: 0 auto;
  color: var(--dsw-alias-brand-text, #4d6bfe);
  animation: mf-swim 3.8s ease-in-out infinite;
}

@keyframes mf-swim {
  0%, 100% { transform: translateY(0) rotate(-1.5deg); }
  50% { transform: translateY(-4px) rotate(1.5deg); }
}

.mf-whale-badge {
  position: absolute;
  top: -4px;
  right: -4px;
  min-width: 18px;
  height: 18px;
  padding: 0 4px;
  border-radius: 999px;
  background: var(--dsw-alias-state-success-primary, #067647);
  color: #fff;
  font-size: 10px;
  font-weight: 700;
  line-height: 18px;
  text-align: center;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.4);
}
.mf-card-shell.is-open .mf-whale-badge { background: var(--dsw-alias-brand-text, #2f6feb); }
`
