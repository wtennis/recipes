// Shared helpers for the recipe site. Works in the browser (window.RecipeCommon)
// and in Node (module.exports) so scripts/test-format.js can exercise it.
(function (root) {
  'use strict';

  // Units that are not pluralized.
  var NO_PLURAL = ['tsp', 'tbsp', 'g', 'kg', 'ml', 'l', 'oz', 'fl oz', 'lb'];
  var PLURALS = { pinch: 'pinches', bunch: 'bunches' };
  // Units shown as decimals (max 1 dp) instead of fractions.
  var DECIMAL_UNITS = ['oz', 'fl oz', 'lb', 'ml', 'l', 'kg'];

  // Candidate fractional parts: eighths plus thirds.
  var FRACTIONS = [
    [0, ''], [0.125, '⅛'], [0.25, '¼'], [1 / 3, '⅓'], [0.375, '⅜'], [0.5, '½'],
    [0.625, '⅝'], [2 / 3, '⅔'], [0.75, '¾'], [0.875, '⅞'], [1, ''],
  ];

  function trimDecimal(n, dp) {
    var s = n.toFixed(dp);
    return s.indexOf('.') >= 0 ? s.replace(/\.?0+$/, '') : s;
  }

  // 2.25 -> "2¼", 0.999 -> "1", 1.5 -> "1½". Never returns "0" for a positive value.
  function formatFraction(value) {
    if (!(value > 0)) return '0';
    var whole = Math.floor(value);
    var frac = value - whole;
    var best = FRACTIONS[0];
    var bestDiff = Infinity;
    for (var i = 0; i < FRACTIONS.length; i++) {
      var d = Math.abs(frac - FRACTIONS[i][0]);
      if (d < bestDiff - 1e-9) { bestDiff = d; best = FRACTIONS[i]; }
    }
    if (best[0] === 1) { whole += 1; best = FRACTIONS[0]; }
    if (whole === 0 && best[0] === 0) best = FRACTIONS[1]; // never show "0" for a real amount
    return (whole > 0 ? String(whole) : '') + best[1];
  }

  // Decimal with at most 1 dp: 2.04 -> "2", 2.5 -> "2.5".
  function formatDecimal(value) {
    if (!(value > 0)) return '0';
    var s = trimDecimal(value, 1);
    return s === '0' ? '0.1' : s;
  }

  // Grams: 1 dp under 2 g, 1 g under 100, nearest 5 above. Returns "420 g".
  function formatGrams(grams, scale) {
    var v = grams * (scale == null ? 1 : scale);
    var out;
    if (v < 2) out = trimDecimal(Math.max(v, 0.1), 1);
    else if (v < 100) out = String(Math.round(v));
    else out = String(Math.round(v / 5) * 5);
    return out + ' g';
  }

  function pluralizeUnit(unit, qty) {
    if (!unit) return '';
    if (!(qty > 1) || NO_PLURAL.indexOf(unit) >= 0) return unit;
    return PLURALS[unit] || unit + 's';
  }

  function formatNumber(value, unit) {
    if (unit === 'g') return formatGrams(value, 1).replace(/ g$/, '');
    if (DECIMAL_UNITS.indexOf(unit) >= 0) return formatDecimal(value);
    return formatFraction(value);
  }

  // The scaled numeric value that is displayed (used for pluralization), after
  // the same rounding the display uses.
  function displayedValue(value, unit) {
    var s = formatNumber(value, unit);
    var m = s.match(/^(\d+)?([⅛¼⅓⅜½⅝⅔¾⅞])?$/);
    if (m && (m[1] || m[2])) {
      var n = m[1] ? parseInt(m[1], 10) : 0;
      if (m[2]) {
        for (var i = 0; i < FRACTIONS.length; i++) if (FRACTIONS[i][1] === m[2]) n += FRACTIONS[i][0];
      }
      return n;
    }
    return parseFloat(s);
  }

  // qty: number | [low, high] | null.  Returns e.g. "2¼ cups", "3", "1–2 tbsp", "".
  function formatMeasure(qty, unit, scale) {
    if (qty === null || qty === undefined) return '';
    scale = scale == null ? 1 : scale;
    var isRange = Array.isArray(qty);
    var lo = (isRange ? qty[0] : qty) * scale;
    var hi = (isRange ? qty[1] : qty) * scale;
    var text;
    if (isRange) {
      var a = formatNumber(lo, unit);
      var b = formatNumber(hi, unit);
      text = a === b ? a : a + '–' + b;
    } else {
      text = formatNumber(lo, unit);
    }
    var shown = displayedValue(hi, unit);
    if (!unit) return text;
    return text + ' ' + pluralizeUnit(unit, shown);
  }

  // 90 -> "1 hr 30 min", 45 -> "45 min", 120 -> "2 hr".
  function formatTime(minutes) {
    if (!(minutes > 0)) return '';
    var m = Math.round(minutes);
    var h = Math.floor(m / 60);
    var r = m % 60;
    if (h === 0) return r + ' min';
    return h + ' hr' + (r ? ' ' + r + ' min' : '');
  }

  // Servings amount scaled, e.g. 24 x 2 -> "48".
  function formatServings(amount, scale) {
    var v = amount * (scale == null ? 1 : scale);
    return Number.isInteger(v) ? String(v) : formatFraction(v);
  }

  function fetchJson(url) {
    return fetch(url).then(function (res) {
      if (!res.ok) throw new Error('HTTP ' + res.status + ' for ' + url);
      return res.json();
    });
  }

  // Tiny DOM builder: el('div', { class: 'x', text: 'hi' }, child, ...)
  function el(tag, attrs) {
    var node = document.createElement(tag);
    if (attrs) {
      Object.keys(attrs).forEach(function (k) {
        var v = attrs[k];
        if (v === null || v === undefined || v === false) return;
        if (k === 'text') node.textContent = v;
        else if (k === 'class') node.className = v;
        else node.setAttribute(k, v === true ? '' : v);
      });
    }
    for (var i = 2; i < arguments.length; i++) {
      var c = arguments[i];
      if (c === null || c === undefined) continue;
      node.appendChild(typeof c === 'string' ? document.createTextNode(c) : c);
    }
    return node;
  }

  var api = {
    formatFraction: formatFraction,
    formatDecimal: formatDecimal,
    formatGrams: formatGrams,
    pluralizeUnit: pluralizeUnit,
    formatMeasure: formatMeasure,
    formatTime: formatTime,
    formatServings: formatServings,
    fetchJson: fetchJson,
    el: el,
  };

  if (typeof window !== 'undefined') window.RecipeCommon = api;
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
})(typeof window !== 'undefined' ? window : globalThis);
