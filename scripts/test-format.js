#!/usr/bin/env node
// Tests for the formatting / scaling helpers in js/common.js.  Run: node scripts/test-format.js
'use strict';

const assert = require('assert');
const c = require('../js/common.js');

const cases = [
  ['2.25 cup x1', () => c.formatMeasure(2.25, 'cup', 1), '2¼ cups'],
  ['2.25 cup x1.5', () => c.formatMeasure(2.25, 'cup', 1.5), '3⅜ cups'],
  ['0.333 cup x3', () => c.formatMeasure(0.333, 'cup', 3), '1 cup'],
  ['1/3 cup x1', () => c.formatMeasure(1 / 3, 'cup', 1), '⅓ cup'],
  ['2/3 cup x1', () => c.formatMeasure(2 / 3, 'cup', 1), '⅔ cup'],
  ['2 eggs x1.5', () => c.formatMeasure(2, null, 1.5), '3'],
  ['1 egg x1.5', () => c.formatMeasure(1, null, 1.5), '1½'],
  ['1 egg x0.5', () => c.formatMeasure(1, null, 0.5), '½'],
  ['1 tsp x1', () => c.formatMeasure(1, 'tsp', 1), '1 tsp'],
  ['2 tsp x1', () => c.formatMeasure(2, 'tsp', 1), '2 tsp'],
  ['1 tbsp x3', () => c.formatMeasure(1, 'tbsp', 3), '3 tbsp'],
  ['1 cup x1', () => c.formatMeasure(1, 'cup', 1), '1 cup'],
  ['1 cup x0.5', () => c.formatMeasure(1, 'cup', 0.5), '½ cup'],
  ['1 cup x2', () => c.formatMeasure(1, 'cup', 2), '2 cups'],
  ['1 pint x2', () => c.formatMeasure(1, 'pint', 2), '2 pints'],
  ['1 quart x2', () => c.formatMeasure(1, 'quart', 2), '2 quarts'],
  ['1 gallon x2', () => c.formatMeasure(1, 'gallon', 2), '2 gallons'],
  ['1 clove x2', () => c.formatMeasure(1, 'clove', 2), '2 cloves'],
  ['1 can x2', () => c.formatMeasure(1, 'can', 2), '2 cans'],
  ['1 stick x2', () => c.formatMeasure(1, 'stick', 2), '2 sticks'],
  ['1 slice x3', () => c.formatMeasure(1, 'slice', 3), '3 slices'],
  ['1 sprig x2', () => c.formatMeasure(1, 'sprig', 2), '2 sprigs'],
  ['1 bunch x2', () => c.formatMeasure(1, 'bunch', 2), '2 bunches'],
  ['1 piece x2', () => c.formatMeasure(1, 'piece', 2), '2 pieces'],
  ['1 pinch x1', () => c.formatMeasure(1, 'pinch', 1), '1 pinch'],
  ['1 pinch x2', () => c.formatMeasure(1, 'pinch', 2), '2 pinches'],
  ['2 oz x2 (no plural)', () => c.formatMeasure(2, 'oz', 2), '4 oz'],
  ['1 lb x1.5 (decimal)', () => c.formatMeasure(1, 'lb', 1.5), '1.5 lb'],
  ['250 ml x1.5', () => c.formatMeasure(250, 'ml', 1.5), '375 ml'],
  ['0.75 kg x1', () => c.formatMeasure(0.75, 'kg', 1), '0.8 kg'],
  ['range 1-2 tbsp x2', () => c.formatMeasure([1, 2], 'tbsp', 2), '2–4 tbsp'],
  ['range 1-2 cup x1', () => c.formatMeasure([1, 2], 'cup', 1), '1–2 cups'],
  ['range 1-2 eggs x1.5', () => c.formatMeasure([1, 2], null, 1.5), '1½–3'],
  ['null qty', () => c.formatMeasure(null, null, 2), ''],
  ['tiny amount keeps a fraction', () => c.formatMeasure(0.05, 'tsp', 1), '⅛ tsp'],
  ['281 g x1.5', () => c.formatGrams(281, 1.5), '420 g'],
  ['281 g x1', () => c.formatGrams(281, 1), '280 g'],
  ['6 g x0.5', () => c.formatGrams(6, 0.5), '3 g'],
  ['1 g x0.5', () => c.formatGrams(1, 0.5), '0.5 g'],
  ['1 g x1', () => c.formatGrams(1, 1), '1 g'],
  ['45 g x1.5', () => c.formatGrams(45, 1.5), '68 g'],
  ['90 g x1', () => c.formatGrams(90, 1), '90 g'],
  ['time 45', () => c.formatTime(45), '45 min'],
  ['time 90', () => c.formatTime(90), '1 hr 30 min'],
  ['time 120', () => c.formatTime(120), '2 hr'],
  ['servings 24 x2', () => c.formatServings(24, 2), '48'],
  ['servings 5 x0.5', () => c.formatServings(5, 0.5), '2½'],
];

let failed = 0;
for (const [name, fn, expected] of cases) {
  try {
    assert.strictEqual(fn(), expected);
    console.log(`PASS  ${name} -> "${expected}"`);
  } catch (e) {
    failed++;
    console.log(`FAIL  ${name}: expected "${expected}", got "${fn()}"`);
  }
}
console.log(`\n${cases.length - failed} passed, ${failed} failed`);
process.exit(failed ? 1 : 0);
