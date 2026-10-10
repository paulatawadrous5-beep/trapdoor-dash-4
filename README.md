# Trapdoor Dash 3 — PAUL'S DEVIL RUN 😈

A polished, mobile-first trap platformer inspired by Level Devil: 10 hand-designed levels — the first teaches you, the other 9 show no mercy. 5 lives per run, star currency, hints, and Gloria the chibi heroine.

**Play:** https://paulatawadrous5-beep.github.io/trapdoor-dash-4/

## The 10 levels

1. First Steps (easy intro)
2. Hot Floor
3. Saw Storm
4. Devil's Due
5. False Hope
6. Free Fall
7. No Mercy
8. Nightmare Fuel
9. Last Breath
10. The Devil Himself (final boss)

## Features

- **Straight into the action** — no map, pick a character and run
- **5 lives per run** + dramatic Game Over screen (progress is never lost)
- **Star currency** — earn stars by completing levels, spend on hints (5 → 10 → 15 ⭐)
- **Level-specific hints** that actually describe each level's traps
- **Traps** — pop-up spikes, falling spikes, saws, chasers (devils), crumbling & fake platforms, moving walls, fake doors
- **Sound effects only** — footsteps, jump, land, fall, trap warnings, star pickup, door, win, devil, game-over growl (no background music)
- **Gloria** — photo-inspired chibi character (long dark hair, navy top, yellow flower, pink bow)
- **PAUL split animation** after clearing all 10 levels
- **PWA** — installable on mobile (Add to Home Screen), fullscreen, works offline via service worker
- **Progress saved** in localStorage (unlocked levels, stars, balance, sound setting)

## Controls

- Mobile: touch buttons (◀ ▶ JUMP)
- Desktop: Arrow keys / WASD / Space

## Files

- `index.html` — menus, HUD, overlays, PWA tags
- `style.css` — red/black devil theme, animations
- `game.js` — engine, 10 levels, audio, persistence
- `manifest.json`, `sw.js`, `icon-*.png` — PWA
- `gloria-avatar.png` — Gloria's portrait · `gloria-chibi.png` — in-game sprite
