#!/usr/bin/env node
// Validates every recipes/*.json against the schema in SCHEMA.md and writes
// recipes/index.json (the summary list the home page reads).
// Exit code 1 (and no index.json written) if any recipe has an error.

'use strict';

const fs = require('fs');
const path = require('path');

const RECIPES_DIR = path.join(__dirname, '..', 'recipes');
const INDEX_FILE = 'index.json';

const UNITS = [
  'cup', 'tbsp', 'tsp', 'fl oz', 'oz', 'lb', 'pint', 'quart', 'gallon',
  'ml', 'l', 'g', 'kg', 'pinch', 'clove', 'can', 'stick', 'slice', 'sprig',
  'bunch', 'piece',
];
// Count-style units where a gram weight is not expected, so no warning without one.
const NO_GRAMS_WARNING_UNITS = ['pinch', 'clove', 'can', 'slice', 'sprig', 'bunch', 'piece', 'g', 'kg'];

const SLUG_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const STEP_QTY_RE = /(\d+(\.\d+)?|\d+\/\d+|[½¼¾⅓⅔⅛⅜⅝⅞])\s*(cups?|tbsp|tsp|tablespoons?|teaspoons?|g|grams?|oz|ounces?)\b/i;

const TOP_KEYS = [
  'slug', 'title', 'description', 'source', 'added', 'tags', 'servings', 'times',
  'equipment', 'ingredient_groups', 'step_groups', 'notes', 'storage',
];

const isObj = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);
const isStr = (v) => typeof v === 'string' && v.trim() !== '';
const isNum = (v) => typeof v === 'number' && Number.isFinite(v);

function validateRecipe(r, filename) {
  const errors = [];
  const warnings = [];
  const err = (where, msg) => errors.push(`${where}: ${msg}`);
  const warn = (where, msg) => warnings.push(`${where}: ${msg}`);

  if (!isObj(r)) {
    err('(root)', 'recipe must be a JSON object');
    return { errors, warnings };
  }

  for (const k of Object.keys(r)) {
    if (!TOP_KEYS.includes(k)) warn(k, 'unknown field (ignored)');
  }

  // slug
  if (!isStr(r.slug)) err('slug', 'required string');
  else {
    if (!SLUG_RE.test(r.slug)) err('slug', `"${r.slug}" must be kebab-case (a-z, 0-9, hyphens)`);
    const expected = filename.replace(/\.json$/, '');
    if (r.slug !== expected) err('slug', `"${r.slug}" must equal the filename ("${expected}")`);
  }

  if (!isStr(r.title)) err('title', 'required non-empty string');
  if (!isStr(r.description)) err('description', 'required non-empty string');

  // source
  if (!isObj(r.source)) err('source', 'required object');
  else if (r.source.type === 'url') {
    if (!isStr(r.source.url) || !/^https?:\/\/\S+$/.test(r.source.url)) err('source.url', 'required http(s) URL');
    if (!isStr(r.source.name)) err('source.name', 'required string for type "url"');
  } else if (r.source.type === 'idea') {
    if (!isStr(r.source.prompt)) err('source.prompt', 'required string for type "idea"');
  } else err('source.type', 'must be "url" or "idea"');

  // added
  if (!isStr(r.added) || !DATE_RE.test(r.added) || Number.isNaN(Date.parse(r.added))) {
    err('added', 'required date string YYYY-MM-DD');
  }

  // tags
  if (!Array.isArray(r.tags) || r.tags.length === 0) err('tags', 'required non-empty array of strings');
  else r.tags.forEach((t, i) => {
    if (!isStr(t)) err(`tags[${i}]`, 'must be a non-empty string');
    else if (t !== t.toLowerCase()) err(`tags[${i}]`, `"${t}" must be lowercase`);
  });

  // servings
  if (!isObj(r.servings)) err('servings', 'required object { amount, unit }');
  else {
    if (!isNum(r.servings.amount) || r.servings.amount <= 0) err('servings.amount', 'required positive number');
    if (!isStr(r.servings.unit)) err('servings.unit', 'required string (e.g. "cookies", "servings")');
  }

  // times
  if (!isObj(r.times)) err('times', 'required object with at least "total" (minutes)');
  else {
    if (!isNum(r.times.total) || r.times.total <= 0) err('times.total', 'required positive number (minutes)');
    for (const k of ['prep', 'cook']) {
      if (k in r.times && (!isNum(r.times[k]) || r.times[k] < 0)) err(`times.${k}`, 'must be a non-negative number (minutes)');
    }
  }

  // equipment
  if ('equipment' in r && (!Array.isArray(r.equipment) || !r.equipment.every(isStr))) {
    err('equipment', 'must be an array of non-empty strings');
  }

  // ingredient_groups
  if (!Array.isArray(r.ingredient_groups) || r.ingredient_groups.length === 0) {
    err('ingredient_groups', 'required non-empty array');
  } else {
    r.ingredient_groups.forEach((g, gi) => {
      const gw = `ingredient_groups[${gi}]`;
      if (!isObj(g)) return err(gw, 'must be an object');
      if ('name' in g && !isStr(g.name)) err(`${gw}.name`, 'must be a non-empty string when present');
      if (r.ingredient_groups.length > 1 && !isStr(g.name)) warn(`${gw}.name`, 'groups should be named when there is more than one');
      if (!Array.isArray(g.items) || g.items.length === 0) return err(`${gw}.items`, 'required non-empty array');
      g.items.forEach((it, ii) => {
        const w = `${gw}.items[${ii}]`;
        if (!isObj(it)) return err(w, 'must be an object');
        if (!isStr(it.item)) err(`${w}.item`, 'required non-empty string');
        const label = isStr(it.item) ? ` ("${it.item}")` : '';

        // qty
        const q = it.qty;
        if (q === undefined) err(`${w}.qty`, `required (number, [low, high] or null)${label}`);
        else if (q === null) { /* unquantified */ }
        else if (Array.isArray(q)) {
          if (q.length !== 2 || !q.every((n) => isNum(n) && n > 0) || q[0] > q[1]) {
            err(`${w}.qty`, `range must be [low, high] of positive numbers with low <= high${label}`);
          }
        } else if (!isNum(q) || q <= 0) err(`${w}.qty`, `must be a positive number, [low, high] or null${label}`);

        // unit
        if (it.unit === undefined) err(`${w}.unit`, `required (one of the allowed units, or null for count)${label}`);
        else if (it.unit !== null && !UNITS.includes(it.unit)) {
          err(`${w}.unit`, `"${it.unit}" is not allowed. Use one of: ${UNITS.join(', ')}, or null${label}`);
        }
        if (q === null && it.unit !== null && it.unit !== undefined) warn(`${w}.unit`, `qty is null but unit is "${it.unit}"${label}`);

        // grams
        const gr = it.grams;
        if (gr === undefined) err(`${w}.grams`, `required (number or null)${label}`);
        else if (gr !== null && (!isNum(gr) || gr <= 0)) err(`${w}.grams`, `must be a positive number or null${label}`);
        else if (gr === null && q !== null && q !== undefined && !NO_GRAMS_WARNING_UNITS.includes(it.unit)) {
          warn(`${w}.grams`, `quantified item has no grams${label}`);
        }

        if ('note' in it && !isStr(it.note)) err(`${w}.note`, 'must be a non-empty string when present');
      });
    });
  }

  // step_groups
  if (!Array.isArray(r.step_groups) || r.step_groups.length === 0) {
    err('step_groups', 'required non-empty array');
  } else {
    r.step_groups.forEach((g, gi) => {
      const gw = `step_groups[${gi}]`;
      if (!isObj(g)) return err(gw, 'must be an object');
      if ('name' in g && !isStr(g.name)) err(`${gw}.name`, 'must be a non-empty string when present');
      if (!Array.isArray(g.steps) || g.steps.length === 0) return err(`${gw}.steps`, 'required non-empty array');
      g.steps.forEach((s, si) => {
        const w = `${gw}.steps[${si}]`;
        if (!isStr(s)) return err(w, 'must be a non-empty string');
        const m = s.match(STEP_QTY_RE);
        if (m) warn(w, `step seems to contain an ingredient quantity ("${m[0]}"); say "add the flour" instead so scaling stays correct`);
      });
    });
  }

  if ('notes' in r && (!Array.isArray(r.notes) || !r.notes.every(isStr))) err('notes', 'must be an array of non-empty strings');
  if ('storage' in r && !isStr(r.storage)) err('storage', 'must be a non-empty string');

  return { errors, warnings };
}

function summarize(r) {
  const ingredients = [];
  for (const g of r.ingredient_groups) for (const it of g.items) ingredients.push(it.item);
  return {
    slug: r.slug,
    title: r.title,
    description: r.description,
    tags: r.tags,
    times: { total: r.times.total },
    servings: r.servings,
    added: r.added,
    ingredients,
  };
}

function main() {
  if (!fs.existsSync(RECIPES_DIR)) {
    console.error(`ERROR: recipes directory not found: ${RECIPES_DIR}`);
    process.exit(1);
  }
  const files = fs.readdirSync(RECIPES_DIR)
    .filter((f) => f.endsWith('.json') && f !== INDEX_FILE)
    .sort();

  let errorCount = 0;
  let warningCount = 0;
  const summaries = [];
  const seen = new Map();

  for (const file of files) {
    const rel = `recipes/${file}`;
    let data;
    try {
      data = JSON.parse(fs.readFileSync(path.join(RECIPES_DIR, file), 'utf8'));
    } catch (e) {
      console.error(`ERROR ${rel}: invalid JSON: ${e.message}`);
      errorCount++;
      continue;
    }
    const { errors, warnings } = validateRecipe(data, file);
    errors.forEach((m) => console.error(`ERROR ${rel}: ${m}`));
    warnings.forEach((m) => console.warn(`WARN  ${rel}: ${m}`));
    errorCount += errors.length;
    warningCount += warnings.length;

    if (isObj(data) && isStr(data.slug)) {
      if (seen.has(data.slug)) {
        console.error(`ERROR ${rel}: duplicate slug "${data.slug}" (also in ${seen.get(data.slug)})`);
        errorCount++;
      } else seen.set(data.slug, rel);
    }
    if (errors.length === 0) summaries.push(summarize(data));
  }

  if (errorCount > 0) {
    console.error(`\nBuild failed: ${errorCount} error(s), ${warningCount} warning(s). ${INDEX_FILE} was not written.`);
    process.exit(1);
  }

  summaries.sort((a, b) => a.title.localeCompare(b.title));
  fs.writeFileSync(path.join(RECIPES_DIR, INDEX_FILE), JSON.stringify(summaries, null, 2) + '\n');
  console.log(`OK: ${summaries.length} recipe(s) validated, wrote recipes/${INDEX_FILE} (${warningCount} warning(s)).`);
}

main();
