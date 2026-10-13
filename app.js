const { BUILDS, ADDONS, CARE } = globalThis.__cfg;

const $ = (s) => document.querySelector(s);
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const clamp = (n, a, b) => Math.min(b, Math.max(a, n));
const PACKAGES = new Set(['essentials', 'complete', 'signature', 'brand']);

// state lives in the URL hash so a quote can be shared as a link
const state = { build: 'complete', rounds: 0, pages: 0, threeD: false, admin: false, store: false, care: 'none' };
const readHash = () => {
  const p = new URLSearchParams(location.hash.slice(1));
  if (BUILDS.some((b) => b.id === p.get('b'))) state.build = p.get('b');
  state.rounds = clamp(+p.get('r') || 0, 0, 10);
  state.pages = clamp(+p.get('p') || 0, 0, 20);
  state.threeD = p.get('d') === '1';
  state.admin = p.get('m') === '1';
  state.store = p.get('s') === '1';
  if (CARE.some((c) => c.id === p.get('c'))) state.care = p.get('c');
};
const writeHash = () => {
  const p = new URLSearchParams({ b: state.build, r: state.rounds, p: state.pages, d: +state.threeD, m: +state.admin, s: +state.store, c: state.care });
  history.replaceState(null, '', '#' + p);
};

const build = () => BUILDS.find((b) => b.id === state.build);

/* ---- builds */
const buildsEl = $('#builds');
const card = (b) => `
  <div class="build${b.main ? '' : ' build--small'}" data-id="${b.id}">
    ${b.popular ? '<span class="badge">Popular</span>' : ''}
    <button class="build__pick" type="button" role="radio" aria-checked="false" data-id="${b.id}">
      <span class="build__tag">${b.tag}</span>
      <span class="build__name">${b.name}</span>
      <span class="build__price">${money(b.price)}</span>
      <span class="build__blurb">${b.blurb}</span>
    </button>
    <button class="build__more" type="button" aria-expanded="false" aria-controls="inc-${b.id}">See more</button>
    <ul id="inc-${b.id}" hidden>${b.items.map((i) => `<li>${i}</li>`).join('')}</ul>
  </div>`;
buildsEl.innerHTML = `<div class="builds__main">${BUILDS.filter((b) => b.main).map(card).join('')}</div>
  <p class="smalllabel">Or something smaller</p>
  <div class="builds__small">${BUILDS.filter((b) => !b.main).map(card).join('')}</div>`;
buildsEl.addEventListener('click', (e) => {
  const more = e.target.closest('.build__more');
  if (more) {
    const open = more.getAttribute('aria-expanded') !== 'true';
    more.setAttribute('aria-expanded', open); more.textContent = open ? 'See less' : 'See more';
    more.nextElementSibling.hidden = !open;
    return;
  }
  const el = e.target.closest('.build__pick'); if (!el) return;
  state.build = el.dataset.id; render();
});
buildsEl.addEventListener('keydown', (e) => {
  if (!['ArrowRight', 'ArrowDown', 'ArrowLeft', 'ArrowUp'].includes(e.key)) return;
  e.preventDefault();
  const i = BUILDS.findIndex((b) => b.id === state.build), n = BUILDS.length;
  state.build = BUILDS[(i + (e.key === 'ArrowRight' || e.key === 'ArrowDown' ? 1 : n - 1)) % n].id;
  render(); buildsEl.querySelector(`.build__pick[data-id="${state.build}"]`).focus();
});

/* ---- add-ons */
const addonsEl = $('#addons');
addonsEl.innerHTML = `
  <div class="row" id="row-round"><div><b>${ADDONS.round.name}</b><small id="s-round"></small></div><div class="step" data-k="rounds"><button type="button" aria-label="Fewer rounds" data-d="-1">−</button><output>0</output><button type="button" aria-label="More rounds" data-d="1">+</button></div></div>
  <div class="row" id="row-page"><div><b>${ADDONS.page.name}</b><small id="s-page"></small></div><div class="step" data-k="pages"><button type="button" aria-label="Fewer pages" data-d="-1">−</button><output>0</output><button type="button" aria-label="More pages" data-d="1">+</button></div></div>
  <div class="row" id="row-3d"><div><b>${ADDONS.threeD.name}</b><small>Scroll-driven 3D or an interactive hero, like simplybydaniel.com. +${money(ADDONS.threeD.price)}</small></div><button class="tog" type="button" role="switch" aria-label="${ADDONS.threeD.name}" data-k="threeD" aria-checked="false"></button></div>
  <div class="row" id="row-admin"><div><b>${ADDONS.admin.name}</b><small>A private page to log in and edit the site's details. +${money(ADDONS.admin.price)}</small></div><button class="tog" type="button" role="switch" aria-label="${ADDONS.admin.name}" data-k="admin" aria-checked="false"></button></div>
  <div class="row" id="row-store"><div><b>${ADDONS.store.name}</b><small>Sell products and take payments on the site. +${money(ADDONS.store.price)}</small></div><button class="tog" type="button" role="switch" aria-label="${ADDONS.store.name}" data-k="store" aria-checked="false"></button></div>`;
addonsEl.addEventListener('click', (e) => {
  const st = e.target.closest('.step button');
  if (st) { const k = st.parentElement.dataset.k; state[k] = clamp(state[k] + +st.dataset.d, 0, k === 'rounds' ? 10 : 20); return render(); }
  const tg = e.target.closest('.tog');
  if (tg) { state[tg.dataset.k] = !state[tg.dataset.k]; render(); }
});

/* ---- care */
const careEl = $('#care');
careEl.innerHTML = CARE.map((c) => `<button class="chip" type="button" role="radio" data-id="${c.id}" aria-checked="false">${c.name}${c.price ? ` · ${money(c.price)}/${c.per === 'quarter' ? 'qtr' : 'mo'}` : ''}</button>`).join('');
careEl.addEventListener('click', (e) => { const el = e.target.closest('.chip'); if (el) { state.care = el.dataset.id; render(); } });

/* ---- quote maths */
function quote() {
  const b = build(), lines = [];
  let total = 0;
  const add = (label, amt, cls = '') => { lines.push({ label, amt, cls }); total += amt; };
  add(b.name, b.price);
  if (PACKAGES.has(b.id) && state.rounds) add(`${state.rounds} extra round${state.rounds > 1 ? 's' : ''}`, state.rounds * ADDONS.round.price);
  if (b.pages && state.pages) add(`${state.pages} extra page${state.pages > 1 ? 's' : ''}`, state.pages * ADDONS.page.price);
  if (b.pages && state.threeD) add(ADDONS.threeD.name, ADDONS.threeD.price);
  if (b.pages && state.admin) add(ADDONS.admin.name, ADDONS.admin.price);
  if (b.pages && state.store) add(ADDONS.store.name, ADDONS.store.price);
  const care = CARE.find((c) => c.id === state.care);
  return { b, lines, total, care };
}

function render() {
  const b = build();
  // reset add-ons that don't apply to the chosen build
  if (!PACKAGES.has(b.id)) { state.rounds = 0; }
  if (!b.pages) { state.pages = 0; state.threeD = false; state.admin = false; state.store = false; }

  buildsEl.querySelectorAll('.build').forEach((el) => { const on = el.dataset.id === state.build, p = el.querySelector('.build__pick'); el.classList.toggle('is-on', on); p.setAttribute('aria-checked', on); p.tabIndex = on ? 0 : -1; });
  careEl.querySelectorAll('.chip').forEach((el) => { el.setAttribute('aria-checked', el.dataset.id === state.care); el.tabIndex = el.dataset.id === state.care ? 0 : -1; });

  $('#row-round').hidden = !PACKAGES.has(b.id);
  $('#row-page').hidden = !b.pages;
  $('#row-3d').hidden = !b.pages;
  $('#row-admin').hidden = !b.pages;
  $('#row-store').hidden = !b.pages;
  $('#s-round').textContent = `${money(ADDONS.round.price)} each. ${b.rounds} included.`;
  $('#s-page').textContent = `${money(ADDONS.page.price)} each, past the ${b.pages} included.`;
  addonsEl.querySelector('[data-k="rounds"] output').textContent = state.rounds;
  addonsEl.querySelector('[data-k="pages"] output').textContent = state.pages;
  addonsEl.querySelectorAll('.step').forEach((s) => { const k = s.dataset.k; s.querySelector('[data-d="-1"]').disabled = state[k] <= 0; s.querySelector('[data-d="1"]').disabled = state[k] >= (k === 'rounds' ? 10 : 20); });
  addonsEl.querySelectorAll('.tog').forEach((t) => t.setAttribute('aria-checked', !!state[t.dataset.k]));
  $('#sec-add').hidden = !(PACKAGES.has(b.id) || b.pages);

  const q = quote();
  $('#lines').innerHTML = q.lines.map((l) => `<li class="${l.cls}"><span>${l.label}</span><span>${l.amt < 0 ? '−' : ''}${money(Math.abs(l.amt))}</span></li>`).join('');
  $('#total').textContent = money(q.total);
  const rec = q.care.price > 0;
  $('#rec-row').hidden = !rec;
  if (rec) { $('#rec-label').textContent = `Then, per ${q.care.per}`; $('#rec').textContent = money(q.care.price); }
  $('#care-note').textContent = q.care.note;

  const meta = [];
  const rounds = b.rounds ? b.rounds + state.rounds : 0, pages = b.pages ? b.pages + state.pages : 0;
  if (rounds) meta.push(`${rounds} rounds of changes`);
  if (pages) meta.push(`Website: up to ${pages} pages`);
  if (b.guide) meta.push(`Brand guide: ${b.guide}`);
  if (b.support) meta.push(`Support after launch: ${b.support}`);
  $('#meta').innerHTML = meta.map((m) => `<span>${m}</span>`).join('');
  writeHash();
}

/* ---- copy / print */
const fine = $('#fine');
const say = (t) => { fine.textContent = t; clearTimeout(say.t); say.t = setTimeout(() => (fine.textContent = ''), 2500); };
const copy = async (text, ok) => {
  try { await navigator.clipboard.writeText(text); say(ok); }
  catch { const ta = Object.assign(document.createElement('textarea'), { value: text }); document.body.append(ta); ta.select(); document.execCommand('copy'); ta.remove(); say(ok); }
};
$('#copy').addEventListener('click', () => {
  const q = quote();
  const txt = ['Simply by Daniel, quote', '', ...q.lines.map((l) => `${l.label}: ${l.amt < 0 ? '-' : ''}${money(Math.abs(l.amt))}`), '', `Total: ${money(q.total)}`, q.care.price ? `Then ${money(q.care.price)} per ${q.care.per} (${q.care.name})` : q.care.id === 'update' ? q.care.note : ''].filter((x, i, a) => x || (a[i - 1] && a[i + 1])).join('\n');
  copy(txt, 'Quote copied.');
});
$('#link').addEventListener('click', () => copy(location.href, 'Link copied.'));

readHash();
render();
