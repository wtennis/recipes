// Single recipe renderer: recipe.html?r=<slug>[&x=1.5]
(function () {
  'use strict';
  var C = window.RecipeCommon;
  var el = C.el;

  var SCALES = [0.5, 1, 1.5, 2, 3];
  var SCALE_LABELS = { 0.5: '½×', 1: '1×', 1.5: '1.5×', 2: '2×', 3: '3×' };
  var MODES = [['both', 'Both'], ['standard', 'Standard'], ['grams', 'Grams']];

  var root = document.getElementById('recipe');
  var params = new URLSearchParams(location.search);
  var slug = params.get('r') || '';
  var scale = parseScale(params.get('x'));
  var mode = loadMode();
  var recipe = null;

  function parseScale(raw) {
    var n = parseFloat(raw);
    return SCALES.indexOf(n) >= 0 ? n : 1;
  }

  function loadMode() {
    try {
      var m = localStorage.getItem('recipes.unitMode');
      if (m === 'both' || m === 'standard' || m === 'grams') return m;
    } catch (e) { /* storage unavailable */ }
    return 'both';
  }

  function saveMode(m) {
    try { localStorage.setItem('recipes.unitMode', m); } catch (e) { /* ignore */ }
  }

  function showError(title, detail) {
    document.title = 'Recipe not found';
    root.textContent = '';
    root.appendChild(el('div', { class: 'error' },
      el('h1', { text: title }),
      el('p', { text: detail }),
      el('p', null, el('a', { href: 'index.html', text: 'Browse all recipes' }))
    ));
  }

  // ---- ingredients -------------------------------------------------------

  function ingredientText(it) {
    var std = C.formatMeasure(it.qty, it.unit, scale);
    var grams = it.grams ? C.formatGrams(it.grams, scale) : '';
    // A gram-unit ingredient already shows its weight; don't repeat it.
    if (it.unit === 'g') grams = '';
    var stdSpan = null;
    var gramSpan = null;

    if (mode === 'grams') {
      if (grams) gramSpan = el('span', { class: 'amt-main', text: grams });
      else if (std) stdSpan = el('span', { class: 'amt-main', text: std });
    } else if (mode === 'standard') {
      if (std) stdSpan = el('span', { class: 'amt-main', text: std });
    } else {
      if (std) stdSpan = el('span', { class: 'amt-main', text: std });
      if (grams) gramSpan = el('span', { class: 'amt-grams', text: '(' + grams + ')' });
      if (!std && grams) { gramSpan.className = 'amt-main'; gramSpan.textContent = grams; }
    }

    var name = el('span', { class: 'ing-name', text: it.item });
    var parts = [stdSpan, stdSpan && gramSpan ? ' ' : null, gramSpan];
    var amount = parts.some(Boolean) ? el.apply(null, ['span', { class: 'amt' }].concat(parts)) : null;
    var rest = el('span', { class: 'ing-rest' }, name, it.note ? el('span', { class: 'ing-note', text: ', ' + it.note }) : null);
    return [amount, amount ? ' ' : null, rest];
  }

  function renderIngredientGroups(container) {
    container.textContent = '';
    recipe.ingredient_groups.forEach(function (g) {
      var wrap = el('div', { class: 'group' });
      if (g.name) wrap.appendChild(el('h3', { text: g.name }));
      var ul = el('ul', { class: 'ingredients' });
      g.items.forEach(function (it) {
        var span = el.apply(null, ['span', { class: 'ing-text' }].concat(ingredientText(it)));
        var label = el('label', { class: 'ing' }, el('input', { type: 'checkbox' }), span);
        ul.appendChild(el('li', null, label));
      });
      wrap.appendChild(ul);
      container.appendChild(wrap);
    });
  }

  // ---- controls ----------------------------------------------------------

  function segmented(label, options, current, onPick, extraClass) {
    var group = el('div', { class: 'seg ' + (extraClass || ''), role: 'group', 'aria-label': label });
    options.forEach(function (opt) {
      var b = el('button', { type: 'button', class: 'seg-btn' + (opt[0] === current ? ' active' : ''), 'aria-pressed': opt[0] === current ? 'true' : 'false', text: opt[1] });
      b.addEventListener('click', function () {
        onPick(opt[0]);
        Array.prototype.forEach.call(group.children, function (child, i) {
          var on = options[i][0] === opt[0];
          child.classList.toggle('active', on);
          child.setAttribute('aria-pressed', on ? 'true' : 'false');
        });
      });
      group.appendChild(b);
    });
    return group;
  }

  function setScale(s, ingredientsEl, servingsEl) {
    scale = s;
    var p = new URLSearchParams(location.search);
    if (s === 1) p.delete('x'); else p.set('x', String(s));
    var q = p.toString();
    try { history.replaceState(null, '', location.pathname + (q ? '?' + q : '')); } catch (e) { /* ignore */ }
    renderIngredientGroups(ingredientsEl);
    servingsEl.textContent = servingsText();
  }

  function servingsText() {
    var s = recipe.servings;
    var n = s.amount * scale;
    var unit = (n > 1 && s.unit_plural) ? s.unit_plural : s.unit;
    return 'Makes ' + C.formatServings(s.amount, scale) + ' ' + unit;
  }

  // ---- wake lock ---------------------------------------------------------

  function wakeLockToggle() {
    if (!('wakeLock' in navigator)) return null;
    var lock = null;
    var wanted = false;
    var input = el('input', { type: 'checkbox' });
    function acquire() {
      navigator.wakeLock.request('screen').then(function (l) {
        lock = l;
        l.addEventListener('release', function () { lock = null; });
      }).catch(function () {
        wanted = false;
        input.checked = false;
      });
    }
    input.addEventListener('change', function () {
      wanted = input.checked;
      if (wanted) acquire();
      else if (lock) { lock.release(); lock = null; }
    });
    document.addEventListener('visibilitychange', function () {
      if (wanted && !lock && document.visibilityState === 'visible') acquire();
    });
    return el('label', { class: 'wake no-print' }, input, ' Keep screen awake');
  }

  // ---- page --------------------------------------------------------------

  function metaItem(label, value) {
    return el('div', { class: 'meta-item' }, el('dt', { text: label }), el('dd', { text: value }));
  }

  function sourceNode(src) {
    if (src.type === 'url') {
      return el('span', null, 'Adapted from ', el('a', { href: src.url, rel: 'noopener', text: src.name }));
    }
    return el('span', { text: 'Original idea' });
  }

  function render() {
    document.title = recipe.title;
    root.textContent = '';

    var ingredientsEl = el('div', { class: 'ingredient-groups' });
    var servingsEl = el('span', { class: 'servings', text: servingsText() });

    var times = recipe.times || {};
    var dl = el('dl', { class: 'meta' });
    if (times.prep) dl.appendChild(metaItem('Prep', C.formatTime(times.prep)));
    if (times.cook) dl.appendChild(metaItem('Cook', C.formatTime(times.cook)));
    if (times.total) dl.appendChild(metaItem('Total', C.formatTime(times.total)));

    var tagList = el('ul', { class: 'tag-list' });
    recipe.tags.forEach(function (t) { tagList.appendChild(el('li', { text: t })); });

    root.appendChild(el('header', { class: 'recipe-head' },
      el('h1', { text: recipe.title }),
      el('p', { class: 'lead', text: recipe.description }),
      tagList,
      dl,
      el('p', { class: 'source' }, sourceNode(recipe.source))
    ));

    var scaleSeg = segmented('Scale recipe',
      SCALES.map(function (s) { return [s, SCALE_LABELS[s]]; }), scale,
      function (s) { setScale(s, ingredientsEl, servingsEl); }, 'seg-scale');
    var modeSeg = segmented('Units', MODES, mode,
      function (m) { mode = m; saveMode(m); renderIngredientGroups(ingredientsEl); }, 'seg-units');

    root.appendChild(el('div', { class: 'controls recipe-controls no-print' },
      el('div', { class: 'control' }, el('span', { class: 'control-label', text: 'Scale' }), scaleSeg),
      el('div', { class: 'control' }, el('span', { class: 'control-label', text: 'Units' }), modeSeg),
      wakeLockToggle()
    ));

    renderIngredientGroups(ingredientsEl);
    root.appendChild(el('section', { class: 'block' },
      el('h2', { text: 'Ingredients' }),
      el('p', { class: 'servings-line' }, servingsEl),
      ingredientsEl
    ));

    if (recipe.equipment && recipe.equipment.length) {
      var eq = el('ul', { class: 'plain-list' });
      recipe.equipment.forEach(function (e) { eq.appendChild(el('li', { text: e })); });
      root.appendChild(el('section', { class: 'block' }, el('h2', { text: 'Equipment' }), eq));
    }

    var steps = el('section', { class: 'block' }, el('h2', { text: 'Steps' }));
    recipe.step_groups.forEach(function (g) {
      var wrap = el('div', { class: 'group' });
      if (g.name) wrap.appendChild(el('h3', { text: g.name }));
      var ol = el('ol', { class: 'steps' });
      g.steps.forEach(function (s) {
        var li = el('li', { class: 'step', tabindex: '0', role: 'checkbox', 'aria-checked': 'false' }, el('span', { text: s }));
        function toggle() {
          var done = li.classList.toggle('done');
          li.setAttribute('aria-checked', done ? 'true' : 'false');
        }
        li.addEventListener('click', function (ev) { if (ev.target.tagName !== 'A') toggle(); });
        li.addEventListener('keydown', function (ev) {
          if (ev.key === ' ' || ev.key === 'Enter') { ev.preventDefault(); toggle(); }
        });
        ol.appendChild(li);
      });
      wrap.appendChild(ol);
      steps.appendChild(wrap);
    });
    root.appendChild(steps);

    if (recipe.notes && recipe.notes.length) {
      var nl = el('ul', { class: 'plain-list' });
      recipe.notes.forEach(function (n) { nl.appendChild(el('li', { text: n })); });
      root.appendChild(el('section', { class: 'block' }, el('h2', { text: 'Notes' }), nl));
    }
    if (recipe.storage) {
      root.appendChild(el('section', { class: 'block' }, el('h2', { text: 'Storage' }), el('p', { text: recipe.storage })));
    }
  }

  if (!/^[a-z0-9]+(-[a-z0-9]+)*$/.test(slug)) {
    showError('No recipe selected', slug ? 'That recipe name is not valid.' : 'This page needs a recipe, like recipe.html?r=your-recipe.');
    return;
  }

  C.fetchJson('recipes/' + slug + '.json?v=' + Date.now()).then(function (data) {
    recipe = data;
    render();
  }, function () {
    showError('Recipe not found', 'There is no recipe called "' + slug + '".');
  });
})();
