# Recipe JSON schema

One file per recipe at `recipes/<slug>.json`. It is the source of truth: the site renders it directly, and `node scripts/build.js` validates every file and generates `recipes/index.json` (do not edit that by hand).

## Example

```json
{
  "slug": "brown-butter-chocolate-chip-cookies",
  "title": "Brown Butter Chocolate Chip Cookies",
  "description": "1-2 sentences.",
  "source": { "type": "url", "url": "https://example.com/recipe", "name": "Site or author" },
  "added": "2026-11-20",
  "tags": ["dessert", "baking", "cookies"],
  "servings": { "amount": 24, "unit": "cookies" },
  "times": { "prep": 20, "cook": 12, "total": 45 },
  "equipment": ["stand mixer", "2 sheet pans"],
  "ingredient_groups": [
    {
      "name": "Dough",
      "items": [
        { "qty": 2.25, "unit": "cup", "grams": 281, "item": "all-purpose flour", "note": "spooned and leveled" },
        { "qty": 2, "unit": null, "grams": 100, "item": "large eggs" },
        { "qty": 1, "unit": "tsp", "grams": 6, "item": "fine sea salt" },
        { "qty": null, "unit": null, "grams": null, "item": "flaky salt", "note": "to finish" }
      ]
    }
  ],
  "step_groups": [{ "name": "Dough", "steps": ["Brown the butter ...", "..."] }],
  "notes": ["optional tips"],
  "storage": "optional string"
}
```

An alternative `source` for original recipes: `{ "type": "idea", "prompt": "the user's idea" }`.

## Fields

| Field | Required | Type and rules |
|---|---|---|
| `slug` | yes | kebab-case (`a-z`, `0-9`, hyphens). Must equal the filename without `.json`. Must be unique. |
| `title` | yes | Non-empty string. |
| `description` | yes | 1-2 sentences. Shown on the index card. |
| `source` | yes | `{ "type": "url", "url": "http(s)://...", "name": "..." }` (both `url` and `name` required) or `{ "type": "idea", "prompt": "..." }`. |
| `added` | yes | Date string `YYYY-MM-DD`. |
| `tags` | yes | Non-empty array of lowercase strings. Reuse existing tags where possible (`dessert`, `baking`, `dinner`, `vegetarian`, ...). |
| `servings` | yes | `{ "amount": <positive number>, "unit": "<string>" }`, e.g. `{ "amount": 24, "unit": "cookies" }` or `{ "amount": 4, "unit": "servings" }`. |
| `times` | yes | Minutes. `total` required; `prep` and `cook` optional. Include any waiting (chilling, rising) in `total`. |
| `equipment` | no | Array of strings. |
| `ingredient_groups` | yes | Non-empty array of groups (below). |
| `step_groups` | yes | Non-empty array of groups (below). |
| `notes` | no | Array of strings (tips, substitutions). |
| `storage` | no | String. |

### Ingredient groups

`{ "name": "Dough", "items": [ ... ] }`. `name` is optional when there is only one group, and should be present when there are several (build warns otherwise).

Each item has all four of `qty`, `unit`, `grams`, `item` (use `null` for "none"), plus an optional `note`:

| Field | Rules |
|---|---|
| `qty` | A positive number, a range `[low, high]` (low <= high), or `null` for "to taste" / unquantified. Use decimals (`2.25`, `0.333`), not strings. |
| `unit` | One of: `cup`, `tbsp`, `tsp`, `fl oz`, `oz`, `lb`, `pint`, `quart`, `gallon`, `ml`, `l`, `g`, `kg`, `pinch`, `clove`, `can`, `stick`, `slice`, `sprig`, `bunch`, `piece`, or `null` for a plain count (`2` eggs). Use `null` when `qty` is `null`. |
| `grams` | Positive number (weight in grams for the quantity written, before scaling) or `null`. Liquids are still weight (water: 1 ml = 1 g). |
| `item` | Ingredient name without the quantity: `"all-purpose flour"`, `"large eggs"`. |
| `note` | Optional short prep or sourcing detail: `"spooned and leveled"`, `"room temperature"`. Rendered after a comma. |

Build warns when a quantified item has no `grams` (except count-style units such as `clove`, `can`, `pinch`).

How it renders at 1x: `2¼ cups (281 g) all-purpose flour, spooned and leveled`. The page scales both `qty` and `grams`.

### Step groups

`{ "name": "Dough", "steps": ["...", "..."] }`. `name` is optional. `steps` is a non-empty array of strings.

**Do not put ingredient quantities in steps.** Write "add the flour", not "add 2 cups flour", so scaling stays correct. Temperatures and times are fine and should look like `350°F (175°C)`. Build emits a warning when a step contains a number followed by cup/tbsp/tsp/g/oz.

## Validation

`node scripts/build.js` exits 1 with a message per problem (file, field path, what is wrong) and does not write `recipes/index.json` if any recipe has an error. Warnings do not fail the build.

## index.json (generated)

An array sorted by title. Each entry: `slug`, `title`, `description`, `tags`, `times` (`{ "total": n }`), `servings`, `added`, `ingredients` (flat list of ingredient names, used for search).
