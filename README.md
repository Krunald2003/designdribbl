# Figiman — MVP v1

Roll a dice, get a real-world app screen, rebuild it in Figma, upload the PNG, and get an accuracy score for **layout, spacing, typography and color** with specific feedback ("Continue button fill should be #000000; yours is about #3B82F6").

Built from `Figiman — Product Requirements Document (MVP).md`.

## Run it

```bash
npm install
npm run dev
```

Open http://localhost:5173 in a desktop browser at least 1280px wide.

**AI vision (optional).** Copy `.env.example` to `.env` and set `ANTHROPIC_API_KEY`. Without a key, Figiman scores with pixel measurement only. That mode works well when the layout is close to the reference. With a key, Claude (`claude-opus-5-5`) also locates each element (even ones moved far from where they should be) and reads text as written, which enables the casing and wording checks.

**Production:**

```bash
npm run build
npm start
```

`npm start` serves the app and API on `PORT` (default 8787).

## What's in v1 (PRD mapping)

| PRD | Status |
| --- | --- |
| H1, H2: two trays above the fold at 1280px+, value prop, 3-step how-it-works | Done |
| R1: dice roll under 1.5s (1.1s) | Done |
| R2: true aspect ratio with Fit / 100% / 200% zoom | Done |
| R3: app name, screen name, frame size, difficulty | Done |
| R4: re-roll, no repeats within a session (P1) | Done |
| S1: drag-and-drop or browse, PNG/JPG, max 10 MB | Done |
| S2: aspect-ratio warning over 5%, with an auto-scale option | Done |
| S3: preview and replace before scoring | Done |
| S4: Get result enabled only when both trays are filled | Done |
| RS1, RS2: overall %, 4 category scores, 2–3 feedback points each | Done |
| RS3: loading state; result well under 20s | Done |
| RS4: Try again (same screen) / Roll again (new screen) | Done |
| RS5: side-by-side and overlay compare with opacity slider (P1) | Done, and hovering a feedback point highlights the element |
| RS6: thumbs up/down (P1) | Done |
| Desktop-only message below 1280px | Done |
| Privacy: no personal data; uploads never stored | Uploads are processed in the browser and in server memory only |
| Abuse: rate limit AI scoring per IP | `RATE_LIMIT_PER_HOUR` (default 30) |
| Metrics: roll, submit, result, feedback, repeat visits | Anonymous events in `server/data/events.jsonl` |

## Screen library (pilot: 15 screens)

`src/shared/screens.ts` holds 5 easy, 5 medium and 5 hard original mobile screens (390 × 844) with fictional brands. Each screen is a **spec**: exact colors, Inter font sizes and weights, line heights and element boxes. The same spec is:

1. rendered to canvas as the reference image users see and download, and
2. the reference spec the scoring engine compares against.

To add a screen, define it with the `R` (rect), `T`/`C`/`RA` (text), `I` (icon), `P` (photo placeholder) and `button` helpers, then add it to `SCREENS`. Icons and photos are drawn as placeholders and are not scored.

## How scoring works

`src/lib/scoring/engine.ts`, following the PRD's "AI scoring model":

1. **Normalize.** The upload is scaled to the frame size. 2x/3x exports use an exact box filter.
2. **Extract.** Each reference element is located and measured in both the rendered reference and the submission, using the same pixel measurer. The measurer works out the local background, a noise-adaptive threshold and the ink/shape box, plus fill, border and text color and ink density. Because both images go through the same measurer, its biases cancel out. When AI is on, Claude's boxes tell the measurer where to look, and its text reading powers the casing and wording checks.
3. **Compare by rule.** Each check has a fixed rule:
   - Layout: presence, position and size.
   - Spacing: gaps, insets and centering. Within ±2px is full credit.
   - Typography: size (±1px is full credit), weight, letter spacing or font, line height and casing.
   - Color: CIEDE2000 difference.
4. **Explain.** Rule-generated feedback shows the reference value next to yours.

Category weights: layout 30%, spacing 25%, typography 25%, color 20%. Bands: 90+ Pixel perfect, 75–89 Very close, 50–74 Getting there, below 50 Keep practising. One major miss (a missing element, a wrong button color or a wrong title size) caps the result at "Very close".

The same upload always gets the same score. The pixel engine is deterministic, and AI extractions are cached per image hash for 24 hours.

### Engine self-test

With `npm run dev` running, open the browser console:

```js
const T = await import("/src/dev/selftest.ts");
console.log(await T.robustness());          // faithful 1x/2x/3x/1.5x/JPG exports should score ~95+
console.log(await T.perturbations("ride-login")); // deliberate mistakes should be caught with specific feedback
```

Current results: faithful 2x/3x exports score 96–100, 1.5x scores 89–100, and JPG scores 84–100.

## Known limitations

- The AI path was tested against a mocked API, not live Claude calls.
- Screens are rendered with the browser's text engine. Figma's text rendering differs slightly. The tolerances are set for this, but the scoring should be tuned with real Figma exports during the pilot.
- JPG compression lowers color and typography accuracy. The UI recommends PNG.
- Where an element sits flush against a photo (such as the photo grid above the tab bar on the Profile screen), measurement is less stable at non-integer export scales.
