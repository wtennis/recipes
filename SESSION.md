---
project: recipes
last_updated: 2026-11-20 14:56 PST
status: in_progress
---

## Overview

Static recipe site with gram weights and one-click scaling (live at https://wtennis.github.io/recipes/, deployed by GitHub Pages from `main`), populated by the global `/create-recipe` skill.

## Work Completed This Session

- Built the site (vanilla HTML/JS, no build tooling): recipe list with search and tag chips, recipe page with ½×/1×/1.5×/2×/3× scaling, Both/Standard/Grams toggle, keep-screen-awake, print styles. `scripts/build.js` validates `recipes/*.json` and writes `recipes/index.json`; `scripts/test-format.js` has 47 passing formatting tests.
- Created public repo `wtennis/recipes` and enabled Pages from `main` root.
- Wrote the global skill `~/.claude/skills/create-recipe/SKILL.md` (not in this repo). It uses absolute paths to this repo, pulls before adding, and commits and pushes to publish.
- Added `servings.unit_plural` (optional) so scaled yields read "2 large batches".
- Added 18 recipes: the Gimme Some Oven ginger molasses cookies plus 17 from the Chrome Bookmarks bar > Recipes folder. Removed the invented seed recipe (brown butter chocolate chip cookies).

## Decisions

- Whiting: no editorializing. URL recipes may only contain text from the source; unit conversions, ingredient listing/grouping, splitting steps and summing the source's own times are allowed. Missing info (yield, description, times) gets asked, not estimated. Rule is in the skill, step 4.
- Whiting: when a page blocks fetching (403), read it through Claude in Chrome rather than spoofed curl or archive sites (both blocked by the permission classifier).
- Whiting: ginger molasses yield is "1 large batch". Challah and gingersnaps descriptions and the Carmelitas time note were approved wording.
- Whiting: skip the Bread subfolder; skip both Taste of Home bookmarks (they now open different recipes: Caramel Rolls, Oatmeal Coconut Cookies).

## Next Steps

1. Whiting to review rendering on the live site, especially: count items show grams between number and name ("2 (100 g) large eggs"), and the new plural yield on the ginger molasses page at 2×.
2. Kathleen's Devil's Food Cake (ckbk, The New Basics Cookbook) wasn't added: needs a ckbk sign-in in Chrome.
3. Untested in a browser: control clicks, wake lock, print stylesheet, dark mode.

## Notes/Context

- Recipe extraction: most sites embed schema.org Recipe JSON-LD; reading it via the Chrome `javascript_tool` is far cheaper than `get_page_text`. That tool truncates output around 1,000 characters, so return the JSON split into ~900-character chunks.
- Smitten Kitchen, BBC Good Food ME and Wife Mama Foodie had no usable JSON-LD; read the page text instead.
- Ranges: `qty` supports `[low, high]` but `grams` doesn't; those items use the low-end grams with a note.
- Build warnings (10) are known: produce/store-bought items without grams, and two portion sizes in steps.
- `npx serve .` strips query strings via clean URLs; `serve.json` sets `cleanUrls: false` for local preview.
