// The quote builder. Daniel's side only: pick who it is for, what they need, and two versions of it.
// The result is a link to /q/, the page the client sees. Everything the client needs travels inside the link.
import { encode } from './codec.js';

const { BUILDS, ADDONS, CARE, PROCESS } = globalThis.__cfg;

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const money = (n) => '$' + Math.round(n).toLocaleString('en-US');
const MAIN = BUILDS.filter((b) => b.main);
const TOP = MAIN.reduce((a, b) => (b.price > a.price ? b : a));
const build = (id) => BUILDS.find((b) => b.id === id);
const care = (id) => CARE.find((c) => c.id === id);

const SITUATIONS = [
  ['brand', 'they already have a brand', 'you already have a brand'],
  ['scratch', 'they are starting from scratch', "you're starting your brand from scratch"],
  ['online', 'they need to sell online', 'you need to sell online'],
  ['edit', 'they want to edit the site themselves', 'you want to edit the site yourself'],
  ['local', 'they serve a local area', 'you serve a local area'],
  ['social', 'their customers find them on social', 'your customers find you on social media'],
];

const state = {
  name: '', co: '', days: 14, picks: new Set(), why: '', whyManual: false,
  rx: 'complete', unsell: '', unsellManual: false,
  opts: [
    { care: 'quarter', admin: true, store: true, cards: true, threeD: true, pages: 0, rounds: 0 },
    { care: 'month', admin: true, store: true, cards: true, threeD: true, pages: 0, rounds: 0 },
  ],
};

/* ---- the quote, worked out */
const INCLUDED = { flagship: ['threeD', 'admin', 'store'] };
const SITE_ONLY = ['threeD', 'admin', 'store'];                     // website extras: they make no sense on a brand-only or social-only package
const unavailable = (k, id = state.rx) => (INCLUDED[id] || []).includes(k) || (!build(id).main && SITE_ONLY.includes(k));
const has = (o, k) => o[k] && !unavailable(k);
// the menu price: the package with every extra it does not already have. You take away what they do not need.
const EXTRAS = ['threeD', 'admin', 'store', 'cards'];
const full = (b) => b.price + (b.main ? EXTRAS.filter((k) => !unavailable(k, b.id)).reduce((n, k) => n + ADDONS[k].price, 0) : 0);
function optionOf(i) {
  const o = state.opts[i], b = build(state.rx), c = care(o.care);
  const lines = [[b.name, b.price]];
  const add = (label, amount) => lines.push([label, amount]);
  if (o.pages) add(`${o.pages} extra page${o.pages > 1 ? 's' : ''}`, o.pages * ADDONS.page.price);
  if (o.rounds) add(`${o.rounds} extra round${o.rounds > 1 ? 's' : ''} of changes`, o.rounds * ADDONS.round.price);
  if (has(o, 'threeD')) add(ADDONS.threeD.name, ADDONS.threeD.price);
  if (has(o, 'admin')) add(ADDONS.admin.name, ADDONS.admin.price);
  if (has(o, 'store')) add(ADDONS.store.name, ADDONS.store.price);
  if (has(o, 'cards')) add(ADDONS.cards.name, ADDONS.cards.price);
  const total = lines.reduce((s, l) => s + l[1], 0);
  const extras = lines.length === 2 ? ` + ${lines[1][0].toLowerCase()}` : lines.length > 2 ? ` + ${lines.length - 1} extras` : '';
  const label = `${b.name}${extras}${c.id === 'none' ? '' : ' with ' + c.name.toLowerCase()}`;
  const rec = c.price ? [c.price, c.per] : null;
  return { k: 'AB'[i], label, lines, total, rec, note: c.note || '' };
}

function reasonText() {
  const ph = SITUATIONS.filter(([id]) => state.picks.has(id)).map((s) => s[2]);
  const b = build(state.rx);
  if (!ph.length) return `${b.name} is the best setup for you.`;
  const joined = ph.length === 1 ? ph[0] : ph.slice(0, -1).join(', ') + ' and ' + ph.at(-1);
  return `Because ${joined}, ${b.name} is the best setup for you.`;
}
const unsellDefault = () => TOP.unsell || 'extras you will not use right now';

async function payload() {
  const b = build(state.rx);
  const now = new Date(), until = new Date(now.getTime() + state.days * 864e5);
  const p = PROCESS[b.id];
  return {
    v: 1, id: Math.random().toString(36).slice(2, 8).toUpperCase(),
    n: state.name.trim(), co: state.co.trim(), on: now.toISOString().slice(0, 10), vd: until.toISOString().slice(0, 10),
    why: state.why.trim() || reasonText(),
    rx: { id: b.id, name: b.name, tag: b.tag, price: full(b), blurb: b.blurb, items: b.items },
    menu: MAIN.map((m) => ({ id: m.id, name: m.name, price: full(m), blurb: m.blurb })),
    un: b.id === TOP.id || !b.main ? null : { name: TOP.name, price: full(TOP), reason: state.unsell.trim() || unsellDefault() },
    steps: p ? p.steps.map((s) => [s.t, (s.d.match(/^.*?[.!?](s|$)/) || [s.d])[0].trim()]) : [],
    opts: [optionOf(0), optionOf(1)],
  };
}

/* ---- who + situations */
const chips = $('#situations');
chips.innerHTML = SITUATIONS.map(([id, label]) => `<button class="chip" type="button" aria-pressed="false" data-id="${id}">${esc(label)}</button>`).join('');
chips.addEventListener('click', (e) => {
  const c = e.target.closest('.chip'); if (!c) return;
  const on = !state.picks.has(c.dataset.id);
  on ? state.picks.add(c.dataset.id) : state.picks.delete(c.dataset.id);
  state.whyManual = false; render();
});
$('#f-name').addEventListener('input', (e) => { state.name = e.target.value; render(); });
$('#f-co').addEventListener('input', (e) => { state.co = e.target.value; render(); });
$('#f-days').addEventListener('change', (e) => { state.days = +e.target.value; render(); });
$('#f-why').addEventListener('input', (e) => { state.why = e.target.value; state.whyManual = true; render(true); });
$('#f-unsell').addEventListener('input', (e) => { state.unsell = e.target.value; state.unsellManual = true; render(true); });

/* ---- the packages */
const buildsEl = $('#builds');
const card = (b) => `
  <button class="build${b.main ? '' : ' build--small'}" type="button" role="radio" aria-checked="false" data-id="${b.id}">
    ${b.popular ? '<span class="badge">Popular</span>' : ''}
    <span class="build__tag">${esc(b.tag)}</span>
    <span class="build__name">${esc(b.name)}</span>
    <span class="build__price">${money(full(b))}</span>
    ${b.main ? `<span class="build__base">${money(b.price)} package + extras</span>` : ''}
    <span class="build__blurb">${esc(b.blurb)}</span>
  </button>`;
buildsEl.innerHTML = `<div class="builds__main">${MAIN.map(card).join('')}</div>
  <p class="smalllabel">Or something smaller</p>
  <div class="builds__small">${BUILDS.filter((b) => !b.main).map(card).join('')}</div>`;
buildsEl.addEventListener('click', (e) => {
  const el = e.target.closest('.build'); if (!el) return;
  state.rx = el.dataset.id; state.whyManual = false; state.opts.forEach((o) => { const m = build(el.dataset.id).main; o.threeD = o.admin = o.store = o.cards = m; }); render();
});

/* ---- the two options */
const optsEl = $('#opts');
const stepper = (i, key, label, price) => `
  <div class="row row--sm"><div><b>${label}</b><small>${money(price)} each</small></div>
    <div class="step"><button type="button" data-i="${i}" data-k="${key}" data-d="-1" aria-label="Fewer: ${label}">−</button><output>0</output><button type="button" data-i="${i}" data-k="${key}" data-d="1" aria-label="More: ${label}">+</button></div></div>`;
const toggle = (i, key, label, price) => `
  <div class="row row--sm"><div><b>${label}</b><small>${money(price)}</small></div>
    <button class="tog" type="button" role="switch" aria-checked="false" aria-label="${label}" data-i="${i}" data-k="${key}"></button></div>`;
optsEl.innerHTML = [0, 1].map((i) => `
  <div class="opt" data-i="${i}">
    <p class="eyebrow">Option ${'AB'[i]}</p>
    <p class="opt__label" data-label></p>
    <label class="field field--wide"><span>After launch</span>
      <select data-i="${i}" data-k="care">${CARE.map((c) => `<option value="${c.id}">${esc(c.name)}${c.price ? ' · ' + money(c.price) + ' / ' + c.per : ''}</option>`).join('')}</select></label>
    ${toggle(i, 'threeD', ADDONS.threeD.name, ADDONS.threeD.price)}
    ${toggle(i, 'admin', ADDONS.admin.name, ADDONS.admin.price)}
    ${toggle(i, 'store', ADDONS.store.name, ADDONS.store.price)}
    ${toggle(i, 'cards', ADDONS.cards.name, ADDONS.cards.price)}
    ${stepper(i, 'pages', 'Extra pages', ADDONS.page.price)}
    ${stepper(i, 'rounds', 'Extra rounds', ADDONS.round.price)}
    <p class="opt__total"><span>One time</span><b data-total></b></p>
    <p class="opt__rec" data-rec hidden></p>
  </div>`).join('');
optsEl.addEventListener('click', (e) => {
  const t = e.target.closest('[data-k]'); if (!t || t.tagName === 'SELECT') return;
  const o = state.opts[+t.dataset.i], k = t.dataset.k;
  if (t.dataset.d) o[k] = Math.min(20, Math.max(0, o[k] + +t.dataset.d)); else o[k] = !o[k];
  render();
});
optsEl.addEventListener('change', (e) => { const s = e.target.closest('select[data-k]'); if (!s) return; state.opts[+s.dataset.i].care = s.value; render(); });

/* ---- link, copy, recent */
let link = '';
const origin = () => (location.hostname === 'localhost' || location.hostname === '127.0.0.1' ? location.origin : 'https://pricing.simplybydaniel.com');
const fine = $('#fine');
const say = (m) => { fine.textContent = m; clearTimeout(say.t); say.t = setTimeout(() => { fine.textContent = ''; }, 2600); };
async function copy(text, done) {
  try { await navigator.clipboard.writeText(text); say(done); }
  catch { const ta = Object.assign(document.createElement('textarea'), { value: text }); document.body.append(ta); ta.select(); try { document.execCommand('copy'); say(done); } catch { say('Select and copy the link manually.'); } ta.remove(); }
}
const ready = () => state.name.trim().length > 0 && link;
$('#copy-link').addEventListener('click', () => { if (!ready()) return say('Add a first name first.'); copy(link, 'Link copied.'); remember(); });
$('#copy-msg').addEventListener('click', () => { if (!ready()) return say('Add a first name first.'); copy(`Hi ${state.name.trim()}, here is your personalised quote: ${link}`, 'Message copied.'); remember(); });
$('#open-link').addEventListener('click', (e) => { if (!ready()) { e.preventDefault(); say('Add a first name first.'); } });

const RKEY = 'simply-quotes';
const recents = () => { try { return JSON.parse(localStorage.getItem(RKEY) || '[]'); } catch { return []; } };
function remember() {
  const list = recents().filter((r) => r.link !== link);
  list.unshift({ name: state.name.trim(), co: state.co.trim(), at: new Date().toISOString().slice(0, 10), link });
  try { localStorage.setItem(RKEY, JSON.stringify(list.slice(0, 10))); } catch { /* fine */ }
  drawRecent();
}
function drawRecent() {
  const list = recents();
  $('#recent-box').hidden = !list.length;
  $('#recent').innerHTML = list.map((r, i) => `<li><a href="${esc(r.link)}" target="_blank" rel="noopener">${esc(r.name)}${r.co ? ' · ' + esc(r.co) : ''}</a><span>${esc(r.at)}</span><button type="button" data-copy="${i}">Copy</button></li>`).join('');
}
$('#recent').addEventListener('click', (e) => { const b = e.target.closest('[data-copy]'); if (b) copy(recents()[+b.dataset.copy].link, 'Link copied.'); });
drawRecent();

/* ---- draw */
let seq = 0;
async function render(keepFocusText) {
  const b = build(state.rx);
  // the written reason follows the choices until Daniel types his own
  if (!state.whyManual) state.why = reasonText();
  if (!state.unsellManual) state.unsell = unsellDefault();
  const why = $('#f-why'); if (!keepFocusText || why !== document.activeElement) why.value = state.why;
  const un = $('#f-unsell'); if (!keepFocusText || un !== document.activeElement) un.value = state.unsell;

  chips.querySelectorAll('.chip').forEach((c) => c.setAttribute('aria-pressed', state.picks.has(c.dataset.id)));
  buildsEl.querySelectorAll('.build').forEach((el) => { const on = el.dataset.id === state.rx; el.classList.toggle('is-on', on); el.setAttribute('aria-checked', on); el.tabIndex = on ? 0 : -1; });

  const showUn = b.main && b.id !== TOP.id;
  $('#unsell-box').hidden = !showUn;
  $('#unsell-line').textContent = `First they hear about ${TOP.name} (${money(full(TOP))}), and that they do not need it.`;
  $('#unsell-label').textContent = `What ${TOP.name} adds`;

  [0, 1].forEach((i) => {
    const el = $(`.opt[data-i="${i}"]`), o = state.opts[i], q = optionOf(i);
    $('[data-label]', el).textContent = q.label;
    $('[data-total]', el).textContent = money(q.total);
    const rec = $('[data-rec]', el); rec.hidden = !q.rec && !q.note;
    rec.textContent = q.rec ? `Then ${money(q.rec[0])} per ${q.rec[1]}` : q.note;
    $('select', el).value = o.care;
    el.querySelectorAll('.tog').forEach((t) => { const inc = unavailable(t.dataset.k); t.closest('.row').hidden = inc; t.setAttribute('aria-checked', !!o[t.dataset.k]); });
    el.querySelectorAll('.step').forEach((s) => { const k = $('button', s).dataset.k; $('output', s).textContent = o[k]; $('button', s).disabled = o[k] <= 0; });
  });

  // the sidebar
  const who = state.name.trim();
  $('#sum-who').textContent = who ? `${who}${state.co.trim() ? ' · ' + state.co.trim() : ''}` : 'Add a first name to begin.';
  $('#lines').innerHTML = [0, 1].map((i) => { const q = optionOf(i); return `<li><span>Option ${q.k}: ${esc(q.label)}</span><b>${money(q.total)}</b></li>`; }).join('');
  const my = ++seq;
  const hash = await encode(await payload());
  if (my !== seq) return;
  link = `${origin()}/q/#${hash}`;
  $('#open-link').href = link;
  $('#open-link').classList.toggle('is-off', !who);
  $('#copy-link').classList.toggle('is-off', !who);
  $('#copy-msg').classList.toggle('is-off', !who);
}
render();
