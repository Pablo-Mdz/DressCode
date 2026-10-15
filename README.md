# DressCode

**English** · [Español](README.es.md)

Your wardrobe and an AI stylist in one installable app. Photograph each garment once; DressCode then suggests outfits for any occasion, recreates looks from an inspiration photo, plans trips with the real forecast, and tells you whether a piece in a shop is worth buying — always using clothes you actually own.

It's a PWA (install it on your phone from the browser), built with React, Firebase and the Claude API.

## Features

- **Wardrobe** — garments organised in folders (7 defaults: Shirts, T-shirts, Trousers, Shoes, Jackets, Accessories, Other), fully editable. Add photos from the camera or gallery, with an optional description.
- **Day Style** — describe the occasion ("dinner with friends at an elegant Asian restaurant") and Claude looks at your wardrobe photos and proposes 2–3 outfits, taking the day's weather into account.
- **Inspiration** — upload a look you like (Instagram, Pinterest, the street) and the AI recreates it with your clothes, says how close it gets and which pieces are missing; those can go straight to your shopping list.
- **Plan** — one look per day for a trip (destination, dates, plans) or for the week at home. Uses the real forecast when the trip starts within 16 days and packs the suitcase without repeating items.
- **Shopping** — the AI reads your wardrobe and suggests what to buy for more variety (e.g. navy trousers that go with your light-blue and white shirts). Steer it by style, budget, season or a free comment. Saved ideas go to **My list**; "I already have it" stops it from being suggested again.
- **Should I buy it?** — photograph an item in a shop and get a verdict: does it fit your wardrobe, what does it combine with, do you already own something similar.
- **Auto-tagging** — every upload is tagged with type, colour, season and formality (and gets a description if empty), which powers folder filters and better outfits.
- **Bulk upload** — pick up to 20 photos at once; they upload in the background and, in *Automatic* mode, the AI files each garment into the right folder.
- **White background** — the background is removed on the phone itself (free, no server) and the garment is centred on white. Also works on garments already uploaded.
- **Couple looks** — invite your partner by email; once accepted, Day Style offers "For both of us" and coordinates outfits across both wardrobes. Each person still sees only their own garments; joint looks are shared.
- **History** — every look you requested, with the option to mark the one you chose.
- **Separate accounts** — email/password or Google sign-in; each person only sees their own wardrobe.

## Architecture

```
React + Vite PWA  ──►  Firebase Auth
       │               Firestore + Storage (per-user, locked by security rules)
       │
       └── callable ──►  Cloud Functions (europe-west1)  ──►  Claude API
                         API key in Secret Manager
```

**Stack:** React 18, TypeScript, Vite + `vite-plugin-pwa`, Firebase (Auth, Firestore, Storage, Cloud Functions v2), Anthropic SDK, `@imgly/background-removal` (ONNX Runtime Web), Open-Meteo. Hosted on Netlify.

### How the AI is wired

- **All model calls are server-side.** Every feature is a Firebase callable function; the Anthropic key lives in Secret Manager and never reaches the browser.
- **Structured outputs.** Responses use JSON-schema output, and every garment ID the model returns is checked against the user's wardrobe on the server before anything is saved — the stylist can't invent clothes.
- **Prompt caching.** The wardrobe (one line of tags plus a thumbnail per garment, read from Storage with the Admin SDK) is sent as a cached prefix shared by every feature; feature-specific instructions come after it. Repeat requests within a few minutes are ~10× cheaper on input.
- **Model per task.** A small, fast model tags uploads at low effort; for bulk uploads it picks the destination folder from an enum built from that user's folders, so it can only choose a folder that exists. A larger model does the styling, with handling for refusals.
- **On-device image processing.** Background removal runs in the browser (ISNet via ONNX/WASM) and places the garment on a 4:5 white canvas. Photos are resized on the phone before upload (1400 px image, 512 px thumbnail). The large WASM files are cached at runtime instead of being precached by the service worker.

### Cloud Functions

| Function | What it does |
|---|---|
| `dayStyle` | 2–3 outfits for an occasion, optionally weather-aware |
| `inspireLook` | Recreates a look from an inspiration photo (the photo isn't stored) |
| `planWeek` | One look per day for a trip or a week, with the forecast and packing list |
| `shoppingSuggestions` | Wardrobe analysis and 3–6 items to buy, each with matching garments |
| `shouldBuy` | Buy-or-skip verdict for a photographed item (the photo isn't stored) |
| `tagGarment` | Auto-tags a new garment and, in bulk mode, picks its folder |
| `garmentImage` | Returns an original photo so its background can be reprocessed |
| `coupleStyle` | Coordinated outfits across two linked wardrobes |

### Data model

```
users/{uid}                       ← user doc ("default folders created" flag)
users/{uid}/folders/{id}          ← folders
users/{uid}/garments/{id}         ← garments (photo paths/URLs, description, tags)
users/{uid}/outfits/{id}          ← Day Style history
users/{uid}/meta/shopping         ← shopping preferences and last suggestions
users/{uid}/shoppingList/{id}     ← my shopping list
invites/{email}                   ← invitation to link wardrobes
couples/{uidA_uidB}               ← couple link (and its /outfits)
Storage: users/{uid}/garments/{id}.jpg and {id}_thumb.jpg
```

- `firestore.rules` and `storage.rules` only let a user read and write inside their own `users/{uid}`.
- Linking wardrobes requires a verified email, a matching invite and a deterministic `uidA_uidB` document ID. `coupleStyle` verifies the link, loads both wardrobes server-side and stores only the thumbnails used in each joint look, so neither person can read the other's wardrobe from the app.

## Getting started

### 1. Firebase project

1. Create a project at <https://console.firebase.google.com> (Google Analytics isn't needed).
2. Upgrade to the **Blaze** plan (required by Storage and Cloud Functions). For a couple of users it stays well within the free quota, but set a **budget alert** (e.g. USD 1) in Google Cloud → Billing → Budgets.
3. **Authentication** → enable **Email/Password** and **Google**.
4. **Firestore Database** → create in **production** mode, region `europe-west` (or the closest to you).
5. **Storage** → get started, production mode, same region.
6. **Project settings** → *Your apps* → add a **Web** app and copy the `firebaseConfig` values.

### 2. Security rules and Cloud Functions

Requires Node 22.

```bash
npm install -g firebase-tools
firebase login

git clone https://github.com/Pablo-Mdz/DressCode.git
cd DressCode
firebase use --add            # pick your project (updates .firebaserc)

# Anthropic API key (https://console.anthropic.com → API Keys)
firebase functions:secrets:set ANTHROPIC_API_KEY

cd functions && npm install && cd ..
firebase deploy --only firestore:rules,storage,functions
```

> Functions deploy to `europe-west1`. To change the region, edit `setGlobalOptions` in `functions/src/index.ts` and the `VITE_FIREBASE_FUNCTIONS_REGION` variable.

### 3. Run locally

```bash
cp .env.example .env.local    # fill in the firebaseConfig values
npm install
npm run dev
```

### 4. Deploy to Netlify

1. *Add new site* → *Import an existing project* → GitHub → `DressCode`. The build is configured in `netlify.toml`.
2. Add the variables from `.env.example` under *Site configuration → Environment variables*.
3. Trigger a new deploy.
4. In Firebase → **Authentication → Settings → Authorised domains**, add your Netlify domain. Google sign-in won't work without it.

### 5. Install on your phone

Open the site on your phone, then:
- **iPhone (Safari):** Share → *Add to Home Screen*.
- **Android (Chrome):** ⋮ menu → *Install app*.

## AI cost

Styling uses `claude-opus-5-5` by default. With a wardrobe of ~40 garments, a Day Style or Shopping request processes about 15–20k input tokens — **roughly USD 0.10 per request**, and about 10× less on input when the wardrobe prefix is cached. Tagging uses `claude-haiku-5-5` and costs under a cent per garment.

To use a cheaper styling model, create `functions/.env`:

```
ANTHROPIC_MODEL=claude-sonnet-5-5
```

and redeploy with `firebase deploy --only functions`. The tagging model can be changed with `ANTHROPIC_TAG_MODEL`.

## Scripts

| Command | What it does |
|---|---|
| `npm run dev` | Local dev server |
| `npm run build` | Production build (to `dist/`) |
| `npm run icons` | Regenerates the PWA PNG icons |
| `cd functions && npm run build` | Compiles the Cloud Functions |

## License

DressCode is licensed under the [GNU Affero General Public License v3.0](LICENSE) (AGPL-3.0-only).

It uses [`@imgly/background-removal`](https://github.com/imgly/background-removal-js), which is itself licensed under AGPL-3.0; the project is licensed under the same terms to stay compatible. Weather data comes from [Open-Meteo](https://open-meteo.com).

© 2026 Pablo Cigoy
