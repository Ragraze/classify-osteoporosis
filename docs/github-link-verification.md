# English README, license, and GitHub link verification

Scope: translate both READMEs into English, add an MIT license for the application code and documentation, and add the requested floating GitHub repository link. The dashboard language and existing visual direction remain unchanged: ENERGY 2 / RHYTHM 2 / MOTION 1.

## Validation

- PASS: `npm run build`.
- PASS: 14 Playwright tests, including all existing flows, Axe scans, text at 200%, and mobile/tablet/desktop layouts.
- PASS: the new link stays 20 px from the bottom and right edges at viewport widths of 320, 390, 768, 1024, and 1440 px. Its target is 48 × 48 px.
- PASS: the link remains fixed while scrolling; the footer leaves room to scroll the last controls clear of it.
- PASS: keyboard activation opens the repository URL in a new tab with a null `window.opener`. The browser test intercepts the external request so this behavior does not depend on GitHub availability.
- PASS: opening mobile navigation makes the workspace inert and prevents the GitHub link from taking focus. Escape restores navigation.
- PASS: mobile, tablet, and desktop previews at 390, 768, and 1440 px were captured and inspected.
- PASS: the contrast checker reports 14.63:1 for the white mark on the default dark surface, 10.19:1 on hover, and 6.12:1 for the focus ring against the canvas.
- PASS: Prettier, `git diff --check`, and local README link checks.

The project MIT license is in `LICENSE`. Dataset images, model weights, and original research artifacts are excluded from that license's scope in the README. The original Octicons mark and its MIT notice are attributed in `third-party-notices.md`.

## Antislop delivery gate

| Check | Status and evidence |
| --- | --- |
| Hard Gate: text and claims (R-02, R-17, R-18, R-23, R-28, R-36, R-38) | PASS: English documentation preserves the existing project facts; the logo and destination were explicitly requested. No marketing claims, fabricated statistics, testimonials, or FAQ were added. |
| Hard Gate: layout and contrast (R-03, R-25) | PASS: browser viewport checks and computed contrast ratios above. Safe-area offsets are included in CSS. |
| Hard Gate: destinations and behavior (R-24, R-26) | PASS: the repository URL matches the configured Git remote; keyboard activation and new-tab behavior pass. |
| Hard Gate: states, keyboard, and theme (R-27, R-32, R-34) | PASS: existing state and Axe tests pass; the new link has a readable name, a visible 3 px focus ring, and follows mobile menu focus isolation. The fixed white theme is preserved. |
| Hard Gate: implementation and verification (R-33, R-35) | PASS: source edits through patches, successful production build, 14 browser tests, and inspected previews. |
| Purpose Gate: icon, shadow, radius, and motion (R-04, R-11, R-12, R-19) | PASS: the Octicons mark identifies the requested GitHub destination; the circular shape follows the user's floating-button reference; a small shadow separates the fixed control from content. No animation is added. |
| Purpose Gate: other visual techniques (R-01, R-06, R-07, R-08, R-09, R-10, R-13, R-14, R-22) | PASS: no new gradient, font, pattern, decorative arrow, badge, glass, glow, feature grid, or illustration. |
| Liveliness and direction (R-37) | PASS: the established blue/white research workspace, image/chart focus, system type, spacing, and ENERGY 2 / RHYTHM 2 / MOTION 1 remain intact. The GitHub link stays secondary. |
| Craftsmanship and consistency (C-1 through C-5, R-05, R-15, R-16, R-20, R-21, R-29, R-30, R-31) | PASS: the new link has one explicit purpose, an accessible action label, existing color tokens, and verified behavior. All original navigation, data, and prediction flows pass. |
| Copywriting | PASS: both READMEs use factual English descriptions, retain runnable commands and API paths, and link to the project license and third-party notice. |
