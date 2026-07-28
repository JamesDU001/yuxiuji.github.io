// Reveal on scroll
const io = new IntersectionObserver((entries) => {
  entries.forEach((entry) => {
    if (entry.isIntersecting) {
      entry.target.classList.add('is-visible');
      io.unobserve(entry.target);
    }
  });
}, { threshold: 0.08, rootMargin: "0px 0px -6% 0px" });
document.querySelectorAll('.reveal').forEach((el) => io.observe(el));

// Sidebar clock
const clock = document.getElementById('clock');
if (clock) {
  const tick = () => {
    const now = new Date();
    clock.textContent = now.toLocaleTimeString('en-GB', { hour12: false });
  };
  tick();
  setInterval(tick, 1000);
}

// Background crosshair marks (cartographic / classical layout registration marks)
const marks = document.createElement('div');
marks.className = 'bg-marks';
marks.setAttribute('aria-hidden', 'true');
[[16.66, 16], [50, 30], [83.33, 12], [33.33, 62], [66.66, 78], [16.66, 86], [83.33, 55]]
  .forEach(([x, y]) => {
    const i = document.createElement('i');
    i.style.left = x + '%';
    i.style.top = y + '%';
    marks.appendChild(i);
  });
document.body.appendChild(marks);

// Stone texture layers (granite grain + micro-fleck + mottled blotches + bedding strata)
(function () {
  const stone = document.createElement('div');
  stone.className = 'bg-stone';
  stone.setAttribute('aria-hidden', 'true');
  document.body.appendChild(stone);

  const grain = document.createElement('div');
  grain.className = 'bg-grain';
  grain.setAttribute('aria-hidden', 'true');
  document.body.appendChild(grain);

  const mottle = document.createElement('div');
  mottle.className = 'bg-mottle';
  mottle.setAttribute('aria-hidden', 'true');
  document.body.appendChild(mottle);

  const strata = document.createElement('div');
  strata.className = 'bg-strata';
  strata.setAttribute('aria-hidden', 'true');
  document.body.appendChild(strata);
})();

// Cursor-following ring (vermilion, precise pointers only)
if (window.matchMedia('(pointer: fine)').matches) {
  const ring = document.createElement('div');
  ring.className = 'cursor-ring';
  ring.style.opacity = '0';
  document.body.appendChild(ring);

  let tx = 0, ty = 0, rx = 0, ry = 0, shown = false, running = false;
  const loop = () => {
    rx += (tx - rx) * 0.14;
    ry += (ty - ry) * 0.14;
    ring.style.transform = `translate(${rx}px, ${ry}px)`;
    if (Math.abs(tx - rx) > 0.3 || Math.abs(ty - ry) > 0.3) {
      requestAnimationFrame(loop);
    } else {
      running = false;
    }
  };
  window.addEventListener('mousemove', (e) => {
    tx = e.clientX; ty = e.clientY;
    if (!shown) { rx = tx; ry = ty; ring.style.opacity = '1'; shown = true; }
    if (!running) { running = true; requestAnimationFrame(loop); }
  });
  document.addEventListener('mouseover', (e) => {
    ring.classList.toggle('is-hover', !!e.target.closest('a, button'));
  });
}

// ============ Data rendering ============
// Normalize: sort by date descending (newest first), then auto-assign ids 001..NNN.
// Maintenance only needs to drop entries anywhere in poems-data.js.
const RAW_POEMS = window.POEMS || [];
const POEMS = RAW_POEMS
  .slice()
  .sort((a, b) => (b.date || '').localeCompare(a.date || ''))
  .map((p, i) => Object.assign({}, p, { id: String(i + 1).padStart(3, '0') }));

// Permalink: prefer a stable `slug` (set per-poem in poems-data.js).
// Validate uniqueness up front so duplicates are surfaced loudly.
(function validateSlugs() {
  const seen = {};
  POEMS.forEach((p) => {
    if (!p.slug) return;
    if (seen[p.slug]) {
      console.warn('[poems] 重複的 slug："' + p.slug + '"（出現在 ' + seen[p.slug] + ' 與 ' + p.title + '）');
    } else {
      seen[p.slug] = p.title;
    }
  });
})();

// Build the URL for a poem. Uses slug when available, falls back to id.
function poemURL(p) {
  const key = (p && p.slug) ? ('slug=' + encodeURIComponent(p.slug)) : ('id=' + p.id);
  return 'poem.html?' + key;
}

const GENRE_ZH = { '\u4e03\u5f8b': '\u4e03\u8a00\u5f8b\u8a69', '\u4e03\u7d55': '\u4e03\u8a00\u7d55\u53e5', '\u4e94\u5f8b': '\u4e94\u8a00\u5f8b\u8a69' };

// Full month-name map so new months auto-resolve in hints/buttons.
const MONTH_NAMES = {
  '01': '\u4e00\u6708', '02': '\u4e8c\u6708', '03': '\u4e09\u6708', '04': '\u56db\u6708',
  '05': '\u4e94\u6708', '06': '\u516d\u6708', '07': '\u4e03\u6708', '08': '\u516b\u6708',
  '09': '\u4e5d\u6708', '10': '\u5341\u6708', '11': '\u5341\u4e00\u6708', '12': '\u5341\u4e8c\u6708'
};

// Preferred display order for known genres; unknown ones follow by first appearance.
const GENRE_ORDER = { '\u4e03\u5f8b': 1, '\u4e03\u7d55': 2, '\u4e94\u5f8b': 3, '\u4e94\u7d55': 4 };

function firstLineOf(p) {
  return (p.lines[0] || '').replace(/\u3002$/, '') + '\u2026';
}

// Homepage: most recent N poems as staggered pop cards
function renderRecentPoems(container, n) {
  if (!container || !POEMS.length) return;
  const recent = POEMS.slice(0, n);
  container.innerHTML = recent.map((p, i) => workCardHTML(p, i)).join('');
  container.querySelectorAll('.work-card').forEach((el) => io.observe(el));
}

function workCardHTML(p, i) {
  const offset = i % 3;
  const tone = i % 2 === 0 ? 'paper' : 'ink';
  const body = (p.lines || []).map(function (line) {
    return '<span class="work-card__verse">' + line + '</span>';
  }).join('');
  return '<a class="work-card work-card--' + tone + ' pop" href="' + poemURL(p) + '" style="--i:' + i + '" data-offset="' + offset + '">' +
    '<span class="work-card__num">' + p.id + '</span>' +
    '<h3 class="work-card__title">' + p.title + '</h3>' +
    '<p class="work-card__body">' + body + '</p>' +
    '<div class="work-card__meta">' +
      '<span class="work-card__genre">' + p.genre + '</span>' +
      '<time class="work-card__date">' + p.date + '</time>' +
    '</div>' +
    '<span class="work-card__arrow" aria-hidden="true">\u2192</span>' +
    '</a>';
}

// Archive page: grouped by month (newest first by key)
function renderArchive(container) {
  if (!container || !POEMS.length) return;
  const groups = {};
  POEMS.forEach((p) => {
    const [y, m] = (p.date || '').split('.');
    const key = y + '.' + m;
    (groups[key] = groups[key] || []).push(p);
  });
  container.innerHTML = Object.keys(groups)
    .sort((a, b) => b.localeCompare(a))
    .map((key) => {
      const [y, m] = key.split('.');
      const list = groups[key];
      return '<div class="month-group reveal">' +
        '<h2 class="month-group__label">' + y + ' \u00b7 ' + (MONTH_NAMES[m] || (m + '\u6708')) +
        ' <i>' + String(list.length).padStart(2, '0') + ' \u9996</i></h2>' +
        '<div class="poems">' + list.map((p) => poemRowHTML(p)).join('') + '</div>' +
        '</div>';
    }).join('');
  container.querySelectorAll('.reveal').forEach((el) => io.observe(el));
}

function poemRowHTML(p) {
  const month = (p.date || '').split('.')[1] || '';
  return '<a class="poem-row" href="' + poemURL(p) + '" data-genre="' + p.genre + '" data-month="' + month + '">' +
    '<span class="poem-row__num">' + p.id + '</span>' +
    '<div class="poem-row__body">' +
      '<h3 class="poem-row__title">' + p.title + '</h3>' +
      '<p class="poem-row__first">' + firstLineOf(p) + '</p>' +
    '</div>' +
    '<div class="poem-row__meta">' +
      '<span class="poem-row__genre">' + p.genre + '</span>' +
      '<time class="poem-row__date">' + p.date + '</time>' +
    '</div>' +
    '<span class="poem-row__arrow">\u2192</span>' +
    '</a>';
}

// Combined month + genre filter.
// Buttons in the HTML are treated as fallback/seed: we rebuild them from the
// actual poem data so adding new months/genres (or new genre types) just works.
let _filterBound = false;
function bindFilter() {
  const panel = document.querySelector('.filter-panel');
  if (!panel || _filterBound) return;
  _filterBound = true;

  const monthBar = panel.querySelector('[data-filter-group="month"]');
  const genreBar = panel.querySelector('[data-filter-group="genre"]');
  if (!monthBar || !genreBar) return;

  // Collect distinct months/genres present in the data, in display order.
  const months = Array.from(new Set(
    POEMS.map((p) => (p.date || '').split('.')[1]).filter(Boolean)
  )).sort((a, b) => b.localeCompare(a)); // newest first

  const genres = Array.from(new Set(
    POEMS.map((p) => p.genre).filter(Boolean)
  )).sort((a, b) => {
    const da = GENRE_ORDER[a] || 99;
    const db = GENRE_ORDER[b] || 99;
    return da - db;
  });

  function buildBar(bar, values, formatLabel, dataAttr) {
    bar.innerHTML = '<button class="is-active" data-' + dataAttr + '="all">\u5168\u90e8</button>' +
      values.map((v) => '<button data-' + dataAttr + '="' + v + '">' + formatLabel(v) + '</button>').join('');
  }

  buildBar(monthBar, months, (m) => MONTH_NAMES[m] || (m + '\u6708'), 'month');
  buildBar(genreBar, genres, (g) => g, 'genre');

  let month = 'all';
  let genre = 'all';

  const hint = document.getElementById('filter-hint');

  function apply() {
    let visible = 0;
    document.querySelectorAll('.poem-row[data-genre]').forEach((row) => {
      const okMonth = month === 'all' || row.dataset.month === month;
      const okGenre = genre === 'all' || row.dataset.genre === genre;
      const show = okMonth && okGenre;
      row.style.display = show ? '' : 'none';
      if (show) visible += 1;
    });
    document.querySelectorAll('.month-group').forEach((g) => {
      const hasVisible = [...g.querySelectorAll('.poem-row')].some((p) => p.style.display !== 'none');
      g.style.display = hasVisible ? '' : 'none';
    });
    if (hint) {
      const parts = [];
      if (month !== 'all') parts.push(MONTH_NAMES[month] || month);
      if (genre !== 'all') parts.push(genre);
      hint.textContent = parts.length
        ? '\u7576\u524d\uff1a' + parts.join(' \u00b7 ') + ' \u2014 ' + visible + ' \u9996'
        : '\u5171 ' + visible + ' \u9996';
    }
  }

  monthBar.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      monthBar.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === btn));
      month = btn.dataset.month || 'all';
      apply();
    });
  });
  genreBar.querySelectorAll('button').forEach((btn) => {
    btn.addEventListener('click', () => {
      genreBar.querySelectorAll('button').forEach((b) => b.classList.toggle('is-active', b === btn));
      genre = btn.dataset.genre || 'all';
      apply();
    });
  });
  apply();
}

// Single poem page: render one poem (vertical scroll)
function renderPoemPage() {
  const params = new URLSearchParams(location.search);
  const slug = params.get('slug');
  const id = params.get('id');
  // Prefer slug; fall back to id (legacy links) for back-compat.
  let poem = null;
  if (slug) poem = POEMS.find((p) => p.slug === slug);
  if (!poem && id) poem = POEMS.find((p) => p.id === id);
  if (!poem) poem = POEMS[0];
  if (!poem) return;

  const idx = POEMS.indexOf(poem);
  const prev = POEMS[idx + 1]; // older
  const next = POEMS[idx - 1]; // newer

  document.title = poem.title + ' \u2014 \u807f\u4fee\u96c6';

  const titleEl = document.querySelector('.poem-title');
  if (titleEl) titleEl.textContent = poem.title;

  const metaEl = document.querySelector('.poem-meta');
  if (metaEl) {
    metaEl.innerHTML = '<span class="poem-row__genre">' + poem.genre + '</span>' +
      '<span>' + (GENRE_ZH[poem.genre] || poem.genre) + '</span>' +
      '<span>' + poem.date + '</span>';
  }

  const scrollEl = document.querySelector('.scroll');
  if (scrollEl) {
    scrollEl.innerHTML = poem.lines
      .map((line) => '<p class="scroll__column">' + line + '</p>')
      .join('');
  }

  const coloDate = document.querySelector('.colophon__date');
  if (coloDate) coloDate.textContent = '\u66f8\u65bc ' + poem.date;

  const footEl = document.querySelector('.poem-foot');
  if (footEl) {
    footEl.innerHTML =
      (next ? '<a class="prev" href="' + poemURL(next) + '"><small>\u2190 \u8f03\u65b0</small>' + next.title + '</a>' : '<span></span>') +
      (prev ? '<a class="next" href="' + poemURL(prev) + '"><small>\u8f03\u820a \u2192</small>' + prev.title + '</a>' : '<span></span>');
  }
}

// Boot (handles already-loaded DOM)

function boot() {
  renderRecentPoems(document.getElementById('recent-poems'), 6);
  renderArchive(document.getElementById('archive-list'));
  if (document.querySelector('[data-page="poem"]')) renderPoemPage();
  bindFilter();
  fillCounts();
}

// Auto-fill any [data-count] element with the current total, so HTML never
// needs to be touched when poems are added/removed.
function fillCounts() {
  const n = POEMS.length;
  document.querySelectorAll('[data-count]').forEach((el) => {
    el.textContent = String(n);
  });
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
