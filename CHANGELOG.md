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
- `.github/CODEOWNERS`, so every PR gets a reviewer assigned automatically.
- `.github/FUNDING.yml` pointing at GitHub Sponsors.
- `.gitattributes` normalising the repository to LF (every tracked file already was, so nothing
  was rewritten) and marking the lockfiles as generated.
- An explicit `permissions: contents: read` on the CI workflow. Without it the workflow inherits
  the repository default, which can hand a read/write token to every step.

### Changed

- CI runs on `main` (the renamed default branch), cancels superseded runs for the same ref, and
  takes the Node version from `.nvmrc` instead of hardcoding it.
- All source files reformatted with Prettier (`printWidth: 120`). Mechanical only; the commit is
  listed in `.git-blame-ignore-revs` so `git blame` skips it.
- `.env.example` comments are now bilingual, matching the English-first documentation.
- The code of conduct is now the Contributor Covenant 2.1 rather than a short custom text, so the
  line and the enforcement ladder are explicit. The "small, friendly project" framing is kept as
  the opening paragraph.
- Issue templates migrated from Markdown to GitHub's YAML forms, which can mark fields required.
  The bug form now asks up front whether the reporter is on the hosted app or self-hosting, since
  that changes the answer, and the feature form flags ideas that add a Claude call, since those
  land on everyone's API bill.

### Security

Cleared 26 of the 28 `npm audit` findings (16 in the app, 12 in the functions). The functions are
now clean; the app is down to the two `zod` advisories described below.

- `vite` 5 → 7 and `vite-plugin-pwa` 0.21 → 2, which clears the `esbuild` dev-server advisory
  (GHSA-67mh-4wv8-2f99) and pulls in `workbox-build` 7.4.
- `react-router-dom` 6 → 7, which clears the open-redirect and SSR-hydration advisories
  (GHSA-wrjc-x8rr-h8h6, GHSA-337j-9hxr-rhxg). Neither was reachable here — every navigation target
  in `src/` is a literal or an internal Firestore document ID, and the app does no SSR — but the
  upgrade removes the class of bug rather than relying on that staying true.
- `overrides` pin `@grpc/grpc-js` to ^1.14.7 and `glob` (under `workbox-build`) to ^14, and in
  `functions/`, `uuid` to ^11.1.1. These are transitive dependencies whose parents pin an old range
  while a patched release exists; npm's own `audit fix` wanted to *downgrade* `firebase` to 9,
  `vite-plugin-pwa` to 1.1 and `@imgly/background-removal` to 1.1.5 instead, which would have cost
  real functionality. The overrides are verified by the build, the rules tests and a cold-start load
  of `functions/lib/index.js`.

Two `zod` advisories (GHSA-mrhx-c7xc-m3w5, memory exhaustion on oversized collections) remain and
are **deliberately not fixed**. `@imgly/background-removal` 1.7.0 is the newest release and pins
`zod@^3`; the fix only exists in `zod` 4.6.6+, whose API is incompatible. The only route `npm`
offers is downgrading the background-removal engine by six minor versions. The advisory needs
attacker-controlled input reaching a `zod` schema, and the only schema in that package validates the
config object this app passes in — not user data — so it is not reachable. Revisit when IMG.LY
ships a `zod` 4 build.

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
