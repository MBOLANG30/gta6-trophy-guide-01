// Leonida Trophy Guide: a tracker for GTA VI's 55 PS5 trophies. Loads the official list
// from data/trophies.json, renders the checklist with filters and a spoiler setting,
// and keeps earned trophies in localStorage (exportable to a file, importable back).
const STORE_KEY = 'gta6-trophy-guide-v1';
const SPOILER_KEY = 'gta6-trophy-guide-spoilers';
const KIND_LABELS = [
  ['all', 'All kinds'],
  ['story', 'Story'],
  ['missable', 'Missable'],
  ['collectibles', 'Collectibles'],
  ['activities', 'Activities'],
  ['robbery', 'Robberies'],
  ['character', 'Character quests'],
  ['secret', 'Secrets'],
  ['money', 'Money & property'],
  ['exploration', 'Exploration'],
  ['completion', '100% & Platinum'],
];
const GRADE_LABELS = { platinum: 'Platinum', gold: 'Gold', silver: 'Silver', bronze: 'Bronze' };
const KIND_NAMES = {
  story: 'Story', character: 'Character quest', collectibles: 'Collectible',
  activities: 'Activity', robbery: 'Robbery', exploration: 'Exploration',
  secret: 'Secret', money: 'Money & property', completion: '100% Completion', platinum: 'Platinum',
};

const listEl = document.getElementById('list');
const emptyEl = document.getElementById('empty');
const statusEl = document.getElementById('status');
const filterNoteEl = document.getElementById('filter-note');
const searchEl = document.getElementById('search');
const gradeEl = document.getElementById('grade');
const earnedFilterEl = document.getElementById('earned-filter');
const spoilersEl = document.getElementById('spoilers');
const kindFiltersEl = document.getElementById('kind-filters');

const doc = await (await fetch('data/trophies.json')).json();
const trophies = doc.trophies;

let earned = new Set(readStoredEarned());
let kindFilter = 'all';
let expanded = new Set();
spoilersEl.checked = localStorage.getItem(SPOILER_KEY) === '1';

function readStoredEarned() {
  try {
    const raw = JSON.parse(localStorage.getItem(STORE_KEY) ?? '[]');
    const names = Array.isArray(raw) ? raw : (raw.earned ?? []);
    return names.filter((n) => typeof n === 'string');
  } catch {
    return [];
  }
}

function saveEarned() {
  localStorage.setItem(STORE_KEY, JSON.stringify([...earned]));
}

function saveSpoilers() {
  localStorage.setItem(SPOILER_KEY, spoilersEl.checked ? '1' : '0');
}

function showStatus(text) {
  statusEl.textContent = text;
  window.clearTimeout(showStatus.timer);
  showStatus.timer = window.setTimeout(() => { statusEl.textContent = ''; }, 4000);
}

function isStorySpoiler(t) {
  return spoilersEl.checked && t.kind === 'story' && !earned.has(t.name);
}

function kindMatches(t) {
  if (kindFilter === 'all') return true;
  if (kindFilter === 'missable') return t.missable === true;
  if (kindFilter === 'completion') return t.kind === 'completion' || t.kind === 'platinum';
  return t.kind === kindFilter;
}

function visibleTrophies() {
  const q = searchEl.value.trim().toLowerCase();
  return trophies.filter((t) => {
    if (!kindMatches(t)) return false;
    if (gradeEl.value !== 'all' && t.grade !== gradeEl.value) return false;
    if (earnedFilterEl.value === 'earned' && !earned.has(t.name)) return false;
    if (earnedFilterEl.value === 'unearned' && earned.has(t.name)) return false;
    if (q) {
      const hay = [t.name, t.description, t.guide, t.when, KIND_NAMES[t.kind] ?? t.kind]
        .join(' ').toLowerCase();
      if (!hay.includes(q)) return false;
    }
    return true;
  });
}

function el(tag, cls, text) {
  const node = document.createElement(tag);
  if (cls) node.className = cls;
  if (text !== undefined) node.textContent = text;
  return node;
}

function renderWarnings() {
  const box = document.getElementById('warnings');
  for (const w of doc.warnings ?? []) box.append(el('div', 'warning', w));
}

function renderRoadmap() {
  const box = document.getElementById('roadmap-stages');
  for (const stage of doc.roadmap ?? []) {
    const card = el('div', 'stage');
    const title = el('h3', null, stage.title);
    card.append(title, el('p', 'stage-time', stage.time), el('p', null, stage.text));
    const members = trophies.filter((t) => t.stage === stage.stage);
    const count = el('p', 'stage-count', `${members.length} ${members.length === 1 ? 'trophy' : 'trophies'}`);
    const ul = el('ul', 'stage-trophies');
    for (const t of members) {
      const li = el('li', null, `${earned.has(t.name) ? '✓ ' : ''}${t.name}`);
      if (earned.has(t.name)) li.style.color = 'var(--teal)';
      ul.append(li);
    }
    card.append(count, ul);
    box.append(card);
  }
}

function renderKindFilters() {
  for (const [value, label] of KIND_LABELS) {
    const b = el('button', null, label);
    b.type = 'button';
    b.dataset.kind = value;
    b.setAttribute('aria-pressed', value === kindFilter ? 'true' : 'false');
    b.addEventListener('click', () => {
      kindFilter = value;
      for (const other of kindFiltersEl.children) {
        other.setAttribute('aria-pressed', other.dataset.kind === kindFilter ? 'true' : 'false');
      }
      renderList();
    });
    kindFiltersEl.append(b);
  }
}

function renderProgress() {
  const total = trophies.length;
  const done = trophies.filter((t) => earned.has(t.name)).length;
  document.getElementById('earned-count').textContent = `${done} of ${total} earned`;
  document.getElementById('earned-pct').textContent = `${Math.round((done / total) * 100)}%`;
  document.getElementById('earned-fill').style.width = `${(done / total) * 100}%`;
  const parts = Object.keys(GRADE_LABELS).map((g) => {
    const inGrade = trophies.filter((t) => t.grade === g);
    const got = inGrade.filter((t) => earned.has(t.name)).length;
    return `${GRADE_LABELS[g]} ${got}/${inGrade.length}`;
  });
  document.getElementById('grade-counts').textContent = parts.join(' · ');
}

function gradeBadge(t) {
  const badge = el('span', `badge ${t.grade}`, GRADE_LABELS[t.grade]);
  return badge;
}

function trophyCard(t) {
  const card = el('article', 'trophy');
  card.dataset.name = t.name;
  if (earned.has(t.name)) card.classList.add('earned');
  const hidden = isStorySpoiler(t);

  const head = el('div', 'trophy-head');
  const box = el('input');
  box.type = 'checkbox';
  box.checked = earned.has(t.name);
  box.setAttribute('aria-label', `Mark ${t.name} as earned`);
  box.addEventListener('change', () => {
    if (box.checked) earned.add(t.name);
    else earned.delete(t.name);
    saveEarned();
    renderAll();
  });
  const titleBox = el('div', 'trophy-title');
  const h3 = el('h3');
  h3.append(document.createTextNode(hidden ? 'Hidden story trophy' : t.name));
  if (earned.has(t.name)) h3.append(el('span', 'earned-mark', ' ✓ earned'));
  h3.append(gradeBadge(t));
  if (t.missable) h3.append(el('span', 'badge missable', 'Missable'));
  if (t.hidden && !hidden) h3.append(el('span', 'badge hidden-tag', 'Hidden on PSN'));
  if (t.verified === 'unconfirmed') h3.append(el('span', 'badge unconfirmed', 'Unconfirmed'));
  const desc = el('p', hidden ? 'official spoiler-hidden' : 'official',
    hidden ? 'Hidden until earned — this is a story trophy. Tick it as earned to reveal it.' : `“${t.description}”`);
  titleBox.append(h3, desc);
  head.append(box, titleBox);
  card.append(head);

  const tags = el('div', 'tags');
  tags.append(el('span', 'tag', KIND_NAMES[t.kind] ?? t.kind));
  if (!hidden) {
    tags.append(el('span', 'tag', `When: ${t.when}`));
    if (t.count) tags.append(el('span', 'tag', `Target: ${t.count}`));
    const stage = (doc.roadmap ?? []).find((s) => s.stage === t.stage);
    if (stage) tags.append(el('span', 'tag', stage.title));
  }
  card.append(tags);

  if (!hidden) {
    const open = expanded.has(t.name);
    const toggle = el('button', 'guide-toggle', open ? 'Hide guide ▲' : 'Read the guide ▼');
    toggle.type = 'button';
    toggle.setAttribute('aria-expanded', open ? 'true' : 'false');
    toggle.addEventListener('click', () => {
      if (expanded.has(t.name)) expanded.delete(t.name);
      else expanded.add(t.name);
      renderList();
    });
    card.append(toggle);
    if (open) {
      const detail = el('div', 'trophy-detail');
      detail.append(el('h4', null, 'How to get it'));
      detail.append(el('p', null, t.guide));
      if (t.missable && t.missableNote) detail.append(el('p', 'unconfirmed-note', t.missableNote));
      if (t.verified === 'unconfirmed') {
        detail.append(el('p', 'unconfirmed-note',
          'Not confirmed yet: no published guide has verified this unlock. The steps below are the current best guess, not a proven method.'));
      }
      const stepsTitle = el('h4', null, 'Steps');
      const ol = el('ol');
      for (const s of t.steps ?? []) ol.append(el('li', null, s));
      detail.append(stepsTitle, ol);
      detail.append(el('h4', null, 'Sources'));
      const srcs = el('ul', 'sources');
      for (const s of t.sources ?? []) {
        const li = el('li');
        const a = el('a', null, s.name);
        a.href = s.url;
        a.target = '_blank';
        a.rel = 'noopener';
        li.append(a);
        srcs.append(li);
      }
      detail.append(srcs);
      card.append(detail);
    }
  }
  return card;
}

function renderList() {
  const shown = visibleTrophies();
  listEl.replaceChildren();
  for (const t of shown) listEl.append(trophyCard(t));
  emptyEl.hidden = shown.length !== 0;
  filterNoteEl.textContent = `Showing ${shown.length} of ${trophies.length} trophies` +
    (kindFilter !== 'all' ? ` · kind: ${KIND_LABELS.find(([v]) => v === kindFilter)?.[1] ?? kindFilter}` : '') +
    (spoilersEl.checked ? ' · story spoilers hidden until earned' : '');
}

function renderAll() {
  renderProgress();
  renderList();
  const roadmapBox = document.getElementById('roadmap-stages');
  roadmapBox.replaceChildren();
  renderRoadmap();
}

document.getElementById('expand-all').addEventListener('click', () => {
  for (const t of visibleTrophies()) expanded.add(t.name);
  renderList();
});
document.getElementById('collapse-all').addEventListener('click', () => {
  expanded.clear();
  renderList();
});
document.getElementById('export').addEventListener('click', () => {
  const payload = {
    app: 'gta6-trophy-guide', version: 1,
    exportedAt: new Date().toISOString(), earned: [...earned],
  };
  const a = el('a');
  a.href = URL.createObjectURL(new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' }));
  a.download = 'gta6-trophy-progress.json';
  a.click();
  window.setTimeout(() => URL.revokeObjectURL(a.href), 1000);
  showStatus(`Exported ${earned.size} earned ${earned.size === 1 ? 'trophy' : 'trophies'}.`);
});
document.getElementById('import').addEventListener('change', async (e) => {
  const file = e.target.files?.[0];
  if (!file) return;
  try {
    const raw = JSON.parse(await file.text());
    const names = Array.isArray(raw) ? raw : (raw.earned ?? []);
    const known = new Set(trophies.map((t) => t.name));
    const good = names.filter((n) => typeof n === 'string' && known.has(n));
    earned = new Set(good);
    saveEarned();
    renderAll();
    showStatus(`Imported ${good.length} earned ${good.length === 1 ? 'trophy' : 'trophies'}${names.length - good.length ? ` (${names.length - good.length} unknown ignored)` : ''}.`);
  } catch {
    showStatus('That file is not valid progress JSON.');
  }
  e.target.value = '';
});
document.getElementById('reset').addEventListener('click', () => {
  if (earned.size === 0) return;
  earned = new Set();
  saveEarned();
  renderAll();
  showStatus('Progress reset.');
});
spoilersEl.addEventListener('change', () => {
  saveSpoilers();
  renderAll();
});
searchEl.addEventListener('input', renderList);
gradeEl.addEventListener('change', renderList);
earnedFilterEl.addEventListener('change', renderList);

renderWarnings();
renderRoadmap();
renderKindFilters();
renderAll();
