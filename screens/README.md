# Reference screen database

Every file in this folder is one reference screen. The app draws the screen from the file, and the scoring engine compares uploads against the same file. There is no separate image to keep in sync.

All screens use a **360 × 800** frame.

## Adding a screen

1. Copy an existing file (a similar difficulty is easiest) and give it a new name, e.g. `bank-signup.json`.
2. Change `id` to match the file name, and fill in `app`, `category`, `screen` and `difficulty` (`Easy`, `Medium` or `Hard`).
3. Edit the `elements` list (see below).
4. Register it in `src/shared/screens.ts`: add one `import` line and add the name to the `SCREENS` list.
5. Run `npm run dev`, roll until you get it (or run the self-test), and check it looks right.

## Element types

Coordinates are in pixels from the top-left of the frame. Elements are drawn in order, so later elements sit on top.

| type | what it is | scored? |
|---|---|---|
| `rect` | Shapes: buttons, cards, inputs, dividers. `fill`, optional `stroke` + `strokeWidth`, `radius`. | Yes |
| `text` | Text in Inter. `text` (use `\n` for line breaks), `size`, `weight` (400–800), `color`, `lineHeight`, `align`, optional `letterSpacing`. For left-aligned text `x, y` is the top-left; for `center`/`right`, `x .. x + w` is the box it aligns in. | Yes |
| `image` | Photos, illustrations, mascots, patterns. Drawn as a flat placeholder `fill`. | **No** |
| `icon` | Line icons from the built-in set (`glyph`), and the status bar. | **No** |

Images and icons are never scored: their areas are ignored when comparing, so users can leave them out or use any placeholder.

## Naming

- `id` values must be unique within a screen. Feedback refers to elements by `name`, so use names a designer would recognise ("Continue button", "Title").
