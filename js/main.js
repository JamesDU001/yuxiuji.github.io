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
const POEMS = window.POEMS || [];
const GENRE_ZH = { '\u4e03\u5f8b': '\u4e03\u8a00\u5f8b\u8a69', '\u4e03\u7d55': '\u4e03\u8a00\u7d55\u53e5', '\u4e94\u5f8b': '\u4e94\u8a00\u5f8b\u8a69' };

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
  return '<a class="work-card work-card--' + tone + ' pop" href="poem.html?id=' + p.id + '" style="--i:' + i + '" data-offset="' + offset + '">' +
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

// Archive page: grouped by month
function renderArchive(container) {
  if (!container || !POEMS.length) return;
  const groups = {};
  POEMS.forEach((p) => {
    const [y, m] = p.date.split('.');
    const key = y + '.' + m;
    (groups[key] = groups[key] || []).push(p);
  });
  const monthName = {
    '01': '\u4e00\u6708', '02': '\u4e8c\u6708', '03': '\u4e09\u6708', '04': '\u56db\u6708',
    '05': '\u4e94\u6708', '06': '\u516d\u6708', '07': '\u4e03\u6708', '08': '\u516b\u6708',
    '09': '\u4e5d\u6708', '10': '\u5341\u6708', '11': '\u5341\u4e00\u6708', '12': '\u5341\u4e8c\u6708'
  };
  container.innerHTML = Object.keys(groups).map((key) => {
    const [y, m] = key.split('.');
    const list = groups[key];
    return '<div class="month-group reveal">' +
      '<h2 class="month-group__label">' + y + ' \u00b7 ' + (monthName[m] || (m + '\u6708')) +
      ' <i>' + String(list.length).padStart(2, '0') + ' \u9996</i></h2>' +
      '<div class="poems">' + list.map((p) => poemRowHTML(p)).join('') + '</div>' +
      '</div>';
  }).join('');
  container.querySelectorAll('.reveal').forEach((el) => io.observe(el));
  bindFilter();
}

function poemRowHTML(p) {
  const month = (p.date || '').split('.')[1] || '';
  return '<a class="poem-row" href="poem.html?id=' + p.id + '" data-genre="' + p.genre + '" data-month="' + month + '">' +
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

// Combined month + genre filter
let _filterBound = false;
function bindFilter() {
  const panel = document.querySelector('.filter-panel');
  if (!panel || _filterBound) return;
  _filterBound = true;

  let month = 'all';
  let genre = 'all';

  const hint = document.getElementById('filter-hint');
  const monthName = {
    '03': '\u4e09\u6708', '04': '\u56db\u6708', '05': '\u4e94\u6708', '07': '\u4e03\u6708'
  };

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
      if (month !== 'all') parts.push(monthName[month] || month);
      if (genre !== 'all') parts.push(genre);
      hint.textContent = parts.length
        ? '\u7576\u524d\uff1a' + parts.join(' \u00b7 ') + ' \u2014 ' + visible + ' \u9996'
        : '\u5171 ' + visible + ' \u9996';
    }
  }

  panel.querySelectorAll('[data-filter-group="month"] button').forEach((btn) => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('[data-filter-group="month"] button').forEach((b) => b.classList.toggle('is-active', b === btn));
      month = btn.dataset.month || 'all';
      apply();
    });
  });
  panel.querySelectorAll('[data-filter-group="genre"] button').forEach((btn) => {
    btn.addEventListener('click', () => {
      panel.querySelectorAll('[data-filter-group="genre"] button').forEach((b) => b.classList.toggle('is-active', b === btn));
      genre = btn.dataset.genre || 'all';
      apply();
    });
  });
  apply();
}

// Single poem page: render one poem (vertical scroll)
function renderPoemPage() {
  const params = new URLSearchParams(location.search);
  const id = params.get('id') || '001';
  const poem = POEMS.find((p) => p.id === id) || POEMS[0];
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
      (next ? '<a class="prev" href="poem.html?id=' + next.id + '"><small>\u2190 \u8f03\u65b0</small>' + next.title + '</a>' : '<span></span>') +
      (prev ? '<a class="next" href="poem.html?id=' + prev.id + '"><small>\u8f03\u820a \u2192</small>' + prev.title + '</a>' : '<span></span>');
  }
}

// Boot (handles already-loaded DOM)

function boot() {
  renderRecentPoems(document.getElementById('recent-poems'), 6);
  renderArchive(document.getElementById('archive-list'));
  if (document.querySelector('[data-page="poem"]')) renderPoemPage();
  bindFilter();
}
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', boot);
} else {
  boot();
}
