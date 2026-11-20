// Recipe list: live search + multi-select tag chips (AND).
(function () {
  'use strict';
  var C = window.RecipeCommon;
  var el = C.el;

  var searchEl = document.getElementById('search');
  var chipsEl = document.getElementById('tag-chips');
  var cardsEl = document.getElementById('cards');
  var statusEl = document.getElementById('status');

  var recipes = [];
  var activeTags = [];

  function haystack(r) {
    return [r.title, r.description, (r.tags || []).join(' '), (r.ingredients || []).join(' ')]
      .join(' ').toLowerCase();
  }

  function matches(r) {
    var terms = searchEl.value.toLowerCase().split(/\s+/).filter(Boolean);
    var text = r._hay;
    for (var i = 0; i < terms.length; i++) if (text.indexOf(terms[i]) < 0) return false;
    for (var j = 0; j < activeTags.length; j++) if ((r.tags || []).indexOf(activeTags[j]) < 0) return false;
    return true;
  }

  function renderChips() {
    var tags = {};
    recipes.forEach(function (r) { (r.tags || []).forEach(function (t) { tags[t] = true; }); });
    chipsEl.textContent = '';
    Object.keys(tags).sort().forEach(function (tag) {
      var on = activeTags.indexOf(tag) >= 0;
      var chip = el('button', { type: 'button', class: 'chip' + (on ? ' active' : ''), 'aria-pressed': on ? 'true' : 'false', text: tag });
      chip.addEventListener('click', function () {
        var i = activeTags.indexOf(tag);
        if (i >= 0) activeTags.splice(i, 1); else activeTags.push(tag);
        renderChips();
        renderCards();
      });
      chipsEl.appendChild(chip);
    });
  }

  function renderCards() {
    var shown = recipes.filter(matches);
    cardsEl.textContent = '';
    shown.forEach(function (r) {
      var meta = [];
      if (r.times && r.times.total) meta.push(C.formatTime(r.times.total));
      if (r.servings) meta.push(r.servings.amount + ' ' + r.servings.unit);
      var tags = el('ul', { class: 'tag-list' });
      (r.tags || []).forEach(function (t) { tags.appendChild(el('li', { text: t })); });
      var link = el('a', { class: 'card-link', href: 'recipe.html?r=' + encodeURIComponent(r.slug) }, el('h2', { text: r.title }));
      cardsEl.appendChild(el('li', { class: 'card' },
        link,
        el('p', { class: 'card-desc', text: r.description }),
        tags,
        el('p', { class: 'card-meta', text: meta.join(' · ') })
      ));
    });
    if (recipes.length === 0) statusEl.textContent = 'No recipes yet.';
    else if (shown.length === 0) statusEl.textContent = 'No recipes match your search. Try fewer words or clear a tag.';
    else statusEl.textContent = shown.length + (shown.length === 1 ? ' recipe' : ' recipes');
  }

  searchEl.addEventListener('input', renderCards);

  C.fetchJson('recipes/index.json?v=' + Date.now()).then(function (list) {
    recipes = list.slice().sort(function (a, b) { return a.title.localeCompare(b.title); });
    recipes.forEach(function (r) { r._hay = haystack(r); });
    renderChips();
    renderCards();
  }).catch(function () {
    statusEl.textContent = 'Could not load the recipe list. If you opened this file directly, serve it with "npx serve ." instead.';
  });
})();
