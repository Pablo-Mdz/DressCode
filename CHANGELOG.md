# Changelog

All notable changes to DressCode are documented in this file.

The format follows [Keep a Changelog](https://keepachangelog.com/en/1.1.0/) and the project
aims to follow [Semantic Versioning](https://semver.org/spec/v2.0.0.html). Entries for `0.1.0`
were reconstructed from the commit history, which is why they are coarser than later ones.

## [Unreleased]

### Added

- SPDX headers (`SPDX-License-Identifier: AGPL-3.0-only`) on every source file, so the licence
  travels with the code when files are copied out of the repository.
- ESLint (flat config, `typescript-eslint` + `react-hooks`) and Prettier, both enforced in CI.
  New scripts: `npm run lint`, `npm run format`, `npm run format:check`.
- Dependabot for npm at the repository root, npm in `functions/`, and GitHub Actions.
- Firebase Hosting as a documented deploy target alongside Netlify — SPA rewrite and asset cache
  headers now live in `firebase.json`.
- `.nvmrc`, `.editorconfig`, `.git-blame-ignore-revs` and this changelog.
- Package metadata (`description`, `repository`, `bugs`, `homepage`, `keywords`, `author`,
  `engines`) in both `package.json` files.

### Changed

- CI runs on `main` as well as `master`, cancels superseded runs for the same ref, and takes the
  Node version from `.nvmrc` instead of hardcoding it.
- All source files reformatted with Prettier (`printWidth: 120`). Mechanical only; the commit is
  listed in `.git-blame-ignore-revs` so `git blame` skips it.
- `.env.example` comments are now bilingual, matching the English-first documentation.

### Fixed

- `npm run test:rules` no longer needs `firebase-tools` installed globally — it fetches the pinned
  version with `npx`, so it works on a fresh clone and CI runs the exact same command.

## [0.1.0] - 2026-10-10

First working version, developed through October and November 2026.

### Added

- **Wardrobe** — garments in editable folders (7 defaults), photos from camera or gallery.
- **Day Style** — 2–3 Claude-generated outfits for a described occasion, weather-aware.
- **Inspiration** — recreates a look from an uploaded photo using clothes the user owns.
- **Plan** — one look per day for a trip or week, with the Open-Meteo forecast and a packing list.
- **Shopping** and **Should I buy it?** — wardrobe gap analysis and a buy-or-skip verdict.
- **Auto-tagging** of uploads (type, colour, season, formality) and bulk upload of up to 20 photos.
- **White background** removal on-device via `@imgly/background-removal`.
- **Couple looks** — linked wardrobes with coordinated outfits, without exposing either wardrobe.
- **History**, separate accounts (email/password and Google), terms, privacy notice and account
  deletion.
- Per-account daily AI quotas (`DAILY_AI_LIMIT`, `DAILY_TAG_LIMIT`) enforced server-side.
- App Check support (reCAPTCHA Enterprise), off by default.
- Firestore and Storage security rules with tests against the emulators.
- Bilingual UI and documentation (Spanish and English).
