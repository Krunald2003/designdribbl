# Figiman — Product Requirements Document (MVP)

Nov 9, 2026 · @Krunal

## Overview

Figiman is a desktop web app where beginner UI designers recreate real-world app screens in Figma and get an AI accuracy score, broken down by color, typography, spacing and layout.

**Problem.** Beginner designers jump into full projects without solid fundamentals. Tutorials teach theory, but there is no fast feedback loop telling them *where* their execution is off.

**Solution.** Roll a dice, get a real screen to clone, rebuild it in Figma, upload it, and see a percentage score with specific, actionable feedback per fundamental.

## Goals and success metrics

The MVP succeeds if beginners complete a full roll-to-result loop and come back to practise again.

| Metric | What it tells us |
| --- | --- |
| Roll rate (% of visitors who roll the dice) | Is the concept clear from the home screen? |
| Submission rate (% of rolls that get a submission) | Is the challenge doable, not intimidating? |
| Median time from roll to submit | Is challenge difficulty balanced? |
| Repeat visits within 7 days | Does practice feel worth coming back to? |
| Feedback usefulness (thumbs up %) | Do users trust and learn from the score? |

Targets will be set after a 2-week baseline.

## Target users

The primary user is a beginner UI designer who already knows basic Figma but has weak visual fundamentals.

- **Primary:** students, bootcamp learners and career switchers with 0–1 year of experience.
- **Secondary:** junior designers who want short daily warm-up drills.
- **Not for (MVP):** experienced designers looking for portfolio projects or critique of original work.

## MVP scope

The MVP is guest-only: roll, design, submit, score. Nothing is saved beyond the session.

| In scope | Out of scope (later) |
| --- | --- |
| Home screen with two-tray layout | User accounts and login |
| Dice roll for a random screen | Progress history and saved scores |
| Reference tray (left) | Leaderboards, streaks, community |
| Submission tray (right), image upload | Figma link submission |
| AI score: overall % + 4 categories | Mobile and tablet layouts |
| Result screen with feedback and compare view | User-uploaded reference screens |
| Try again / roll again | Monetization |

## User flow

The reference screen lives in the **left tray** and the user's submission in the **right tray**.

1. User lands on the home screen and sees both trays plus a 3-step "how it works".
2. User clicks **Roll dice** in the left tray.
3. A random screen appears (e.g. Uber login) with app name, screen name, frame size in px and difficulty.
   - User can re-roll before submitting.
4. User recreates the screen in Figma at the same frame size.
5. User exports the frame as PNG and drops it into the right tray.
6. User clicks **Get result**.
7. Result screen shows overall accuracy %, a score per category, specific feedback and a compare view.
8. User chooses **Try again** (same screen, new upload) or **Roll again** (new screen).

## Functional requirements

P0 = must ship in MVP; P1 = ship if time allows.

| ID | Area | Requirement | Priority |
| --- | --- | --- | --- |
| H1 | Home | Both trays visible above the fold at 1280px width and up | P0 |
| H2 | Home | One-line value prop and 3-step "how it works" | P0 |
| R1 | Reference tray | Roll dice returns a random screen; roll animation under 1.5 s | P0 |
| R2 | Reference tray | Screen shown at true aspect ratio with zoom (fit, 100%, 200%) | P0 |
| R3 | Reference tray | Shows app name, screen name, frame size in px, difficulty | P0 |
| R4 | Reference tray | Re-roll before submitting; no repeats within one session | P1 |
| S1 | Submission tray | Drag-and-drop or browse upload; PNG/JPG; max 10 MB | P0 |
| S2 | Submission tray | Warn if aspect ratio differs from reference by more than 5%; offer auto-scale | P0 |
| S3 | Submission tray | Preview the upload and replace it before scoring | P0 |
| S4 | Submission tray | Get result enabled only when both trays are filled | P0 |
| RS1 | Result | Overall accuracy % plus color, typography, spacing, layout scores | P0 |
| RS2 | Result | 2–3 specific feedback points per category (e.g. "Button is #276EF1, yours is #3B82F6") | P0 |
| RS3 | Result | Loading state while scoring; result within 20 s | P0 |
| RS4 | Result | Try again (same screen) and Roll again (new screen) | P0 |
| RS5 | Result | Compare view: side-by-side and overlay with opacity slider | P1 |
| RS6 | Result | Thumbs up/down on feedback usefulness | P1 |

## AI scoring model

AI vision reads the submission, but the score is calculated against a fixed reference spec, so the same upload always gets the same score.

AI vision alone is inconsistent at exact values (hex codes, pixel distances). Grounding it in a pre-built spec per screen fixes that.

1. **Reference spec (built once per screen):** hex colors, font sizes and weights, spacing values and element bounding boxes.
2. **Normalize:** scale the submission to the reference frame size.
3. **Extract:** the AI vision model pulls the same spec from the submission.
4. **Compare:** category scores are calculated by rule, not by the model's opinion.
5. **Explain:** the AI writes plain-language feedback from the differences found.

| Category | Weight | What's checked | How it's measured |
| --- | --- | --- | --- |
| Layout | 30% | Element presence, position, alignment, order | Overlap of matched element boxes |
| Spacing | 25% | Margins, padding, gaps | Pixel difference; within ±2px = full credit |
| Typography | 25% | Font size, weight, line height, case, font style | Per text element; size within ±1px = full credit |
| Color | 20% | Background, text, button, border colors | Perceptual color difference; near-identical = full credit |

Weights are a starting proposal to tune after testing. Icons and photos are excluded from scoring in the MVP, so users can use placeholders.

Score bands: 90–100 Pixel perfect · 75–89 Very close · 50–74 Getting there · below 50 Keep practising.

## Submission method

Decision: the MVP accepts an exported PNG/JPG; Figma link submission comes in v2 with accounts.

| Option | Pros | Cons |
| --- | --- | --- |
| **PNG/JPG upload (MVP)** | Works for guests; no Figma dependency; AI vision reads images directly | Values must be estimated from pixels |
| Figma frame link (v2) | Exact hex, font and spacing values, so near-perfect color and type scoring | Figma's API needs an access token and the file shared accessibly; API rate limits apply; adds friction for guests |

**Export guidance shown to users:** set the Figma frame to the reference size, export the frame at 1x as PNG, and don't add a background outside the frame.

In v2, Figma login (OAuth) lets users pick a frame directly, removing the sharing friction.

## Screen library

Start with a pilot of 15 mobile screens rebuilt in Figma (5 easy, 5 medium, 5 hard). The full library size is decided after testing the pilot.

| Difficulty | Example screens | Typical size |
| --- | --- | --- |
| Easy | Login, splash, OTP | Under 10 elements |
| Medium | Onboarding, profile, settings | 10–25 elements |
| Hard | Home feed, dashboard, checkout | 25+ elements |

Each entry stores: app name, screen name, platform, frame size, difficulty, reference image and reference spec. Mobile screens come first because they are smaller and less overwhelming for beginners.

**Sourcing (pilot):** Mobbin is used privately as a reference to choose screens; its screenshots are never shown in Figiman. Each screen is rebuilt in Figma with logos and brand names removed. The rebuild becomes both the reference image users see and its reference spec (exact colors, fonts, spacing) for scoring.

After the pilot, decide whether to scale rebuilt screens or ask Mobbin for a license. App owners still hold rights to their designs, so get legal advice before public launch.

## Non-functional requirements

| Area | Requirement |
| --- | --- |
| Platform | Desktop web only, minimum 1280px width; smaller screens show a "use desktop" message |
| Browsers | Latest 2 versions of Chrome, Edge, Safari, Firefox |
| Speed | Result returned within 20 s for 90% of submissions |
| Consistency | Same upload scored twice differs by no more than 3 points |
| Privacy | No personal data collected; uploads deleted within 24 hours |
| Abuse | Rate limit scoring per session/IP to control AI cost |
| Accessibility | App UI meets WCAG 2.1 AA |
