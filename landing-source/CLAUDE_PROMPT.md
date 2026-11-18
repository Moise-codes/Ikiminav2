# Itsinda Landing Page — Full Source Code for Claude

## Context
This is the source code for the Itsinda web frontend (Rwandan savings group platform).
The landing page hero section has a 3D conveyor animation with corner markers (crosses)
that I cannot remove. Please fix this and improve the hero to be production-ready.

## Problem
There are decorative corner markers (plus-sign crosses) appearing on the page that I
want completely removed. They come from:
1. The `Crosshair` component in `Blueprint.tsx` (plus-sign SVGs at section corners)
2. The `Cornner` blocks in the `ItsindaHero.tsx` (Framer template corner markers)

## Files provided
All source files for the landing page are in this folder. Key files:
- `sections.tsx` — Hero and all landing page sections
- `ItsindaHero.tsx` — Embedded hero (conveyor animation from Framer template)
- `Blueprint.tsx` — Section component with Crosshair
- `HeroFlow.tsx` — 3D org logo flow
- `Scenes.tsx` + `iso.ts` — Isometric scenes
- `index.css` — Design tokens, keyframes, utilities
- `index.html` — HTML entry point
- `itsinda-mark.svg` — Transparent Itsinda logo

## Branding
- Ink: #1a1a1a
- Paper: #fafafa
- Accent (green): #17ad17
- Accent-2 (orange): #f08519
- Debit (red): #e53935
- Fonts: Outfit (display), Plus Jakarta Sans (body)
- Radius: 6/10/14/20/28px

## What I need
1. Remove ALL cross/corner markers from the hero and entire landing page
2. Keep the hero conveyor animation (org logos flowing to Itsinda)
3. Keep the blur-reveal text animation on the heading
4. Keep all existing sections (Product, Rulebook, UseCases, Stats, Integrations, Pricing, FAQ, CTA)
5. Make it production-ready and professional

## Important
- Do NOT add Framer JavaScript back
- Do NOT change text copy
- Keep the Itsinda branding
- The hero should have NO corner markers/crosses at all
