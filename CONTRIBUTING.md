# Contributing to DressCode

Thanks for considering a contribution. This is a small personal project, so the process is intentionally lightweight.

## Before you start

For anything beyond a small fix (a new feature, a change to the AI prompts, a UI redesign), please open an issue first to discuss the approach. It saves everyone a PR that doesn't get merged.

For a security vulnerability, don't open a public issue — see [SECURITY.md](SECURITY.md).

## Project layout

- `src/` — the React PWA (pages, components, `src/lib/*` for Firebase/AI/image helpers, `src/lib/i18n.tsx` for the ES/EN dictionary).
- `functions/src/index.ts` — all Cloud Functions (one file; each exported `onCall` is a feature). Shared helpers: `loadWardrobe`, `askClaude`, `MESSAGES`/`VOICE`.
- `firestore.rules`, `storage.rules` — security rules. Covered by `tests/rules.test.mjs`.
- `tests/rules.test.mjs` — rules tests against the Firebase emulators (`npm run test:rules`).
- `.github/workflows/ci.yml` — what runs on every PR.

## Running it locally

You'll need your **own** Firebase project and Anthropic API key — see [README.md § Getting started](README.md#getting-started). There's no shared dev environment; every contributor (including the maintainer) runs against their own Firebase.

```bash
npm install
cp .env.example .env.local   # fill in your Firebase web config
npm run dev
```

To touch the Cloud Functions, also run `cd functions && npm install`, and deploy with `firebase deploy --only functions` against your own project to test them end to end (there's no local emulator for the Anthropic calls).

## Before opening a PR

Run what CI runs:

```bash
npm run lint                       # ESLint
npm run format:check               # Prettier (run `npm run format` to fix)
npm run build                      # typecheck + production build
cd functions && npm run build      # typecheck the functions
npm run test:rules                 # Firestore/Storage rules tests (needs Java)
```

Keep changes focused — unrelated formatting or refactors in the same PR make review harder.

## Translations

Every user-facing string lives in `src/lib/i18n.tsx` as a key in both the `es` and `en` dictionaries (Spanish is the source of truth; keep the keys in sync — a missing English key falls back to Spanish at runtime, which is how you'll notice one). Cloud Functions have their own small `MESSAGES`/`VOICE` tables in `functions/src/index.ts` for server-side error messages and the AI's writing voice.

## Code style

Formatting is Prettier's job (`.prettierrc.json`, 120 columns) — run `npm run format` and don't hand-tune whitespace. ESLint (`eslint.config.js`) covers the rest; CI fails on errors but not on warnings, so the handful of existing `react-hooks/exhaustive-deps` warnings won't block your PR. If you want to fix one, do it in its own PR: changing a hook's dependencies can change when it re-runs.

For everything a tool can't check, match the surrounding code: the comment density, the naming, and whether a file's comments are in Spanish (most of the original app) or English (the parts written for this English documentation pass). TypeScript strictness is whatever `tsconfig.json` already enforces.

New source files need the two-line SPDX header the rest of the files carry:

```ts
// SPDX-FileCopyrightText: © 2026 Pablo Cigoy
// SPDX-License-Identifier: AGPL-3.0-only
```

## Changelog

Add a bullet under `## [Unreleased]` in [CHANGELOG.md](CHANGELOG.md) for anything a user or a self-hoster would notice. Purely internal changes (a refactor, a test, a typo) don't need one.

## Commit messages

A short, specific summary line is enough. No required format.
