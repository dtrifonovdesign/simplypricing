// The page a client sees. Everything on it comes from the link, and every piece of text is escaped,
// because anyone can build a link.
import { decode } from '../codec.js';

const $ = (s, r = document) => r.querySelector(s);
const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
const num = (n) => (Number.isFinite(+n) ? +n : 0);
const money = (n) => '$' + Math.round(num(n)).toLocaleString('en-US');
const ENDPOINT = 'https://formsubmit.co/ajax/89e2eb29402e4aeecfc7b4837f99bb9a';
const dateText = (iso) => { const d = new Date(String(iso) + 'T12:00:00'); return Number.isNaN(+d) ? '' : d.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' }); };

const main = $('#main');
const fail = (t) => { main.innerHTML = `<p class="msg">${esc(t)}</p>`; };

async function open() {
  const raw = location.hash.slice(1);
  if (!raw) return fail('This link is missing its quote. Ask Daniel to send it again.');
  let q;
  try { q = await decode(raw); } catch { return fail('This link looks incomplete. Ask Daniel to send it again.'); }
  if (!q || q.v !== 1 || !Array.isArray(q.opts) || q.opts.length < 2 || !q.rx) return fail('This link looks incomplete. Ask Daniel to send it again.');
  draw(q);
}

function draw(q) {
  const name = String(q.n || 'there'), who = q.co ? String(q.co) : name;
  document.title = `Quote for ${who} | Simply by Daniel`;
  $('#qid').textContent = q.id ? `Quote ${q.id}` : '';
  const expired = q.vd && new Date(q.vd + 'T23:59:59') < new Date();
  const rx = q.rx, un = q.un && q.un.name ? q.un : null;
  const menu = Array.isArray(q.menu) ? q.menu : [];

  const menuCard = (m) => {
    const isRx = m.id === rx.id, isUn = un && m.name === un.name;
    return `<li class="pack${isRx ? ' is-rx' : ''}${isUn ? ' is-skip' : ''}">
      <span class="pack__tag">${isUn ? 'Not for you right now' : isRx ? 'Right for you' : '&nbsp;'}</span>
      <b>${esc(m.name)}</b><span class="pack__price">${money(m.price)}</span><span class="pack__blurb">${esc(m.blurb)}</span></li>`;
  };
  const optCard = (o, i) => `
    <div class="choice">
      <input type="radio" name="opt" value="${i}" ${i === 0 ? '' : ''} />
      <span class="choice__in">
        <span class="choice__k">Option ${esc(o.k || 'AB'[i])}</span>
        <b class="choice__label">${esc(o.label)}</b>
        <ul class="choice__lines">${(o.lines || []).map((l, k) => {
          const kind = l[2] || (k === 0 ? 'pkg' : 'add');
          if (kind === 'pkg') return `<li class="is-base"><span>${esc(l[0])}</span><span>${money(l[1])}</span></li>`;
          if (kind === 'add') return `<li><span>${esc(l[0])}</span><span>+${money(l[1])}</span></li>`;
          if (kind === 'out') return `<li class="is-out"><label class="tick"><input type="checkbox" disabled /><i aria-hidden="true"></i><span class="tick__t">${esc(l[0])}</span></label><span class="tick__p">−${money(l[1])}</span></li>`;
          return `<li><label class="tick"><input type="checkbox" data-opt="${i}" data-line="${k}" checked /><i aria-hidden="true"></i><span class="tick__t">${esc(l[0])}</span></label><span class="tick__p" data-amt="${num(l[1])}">Included</span></li>`;
        }).join('')}</ul>
        <span class="choice__total"><span>One time</span><b data-total="${i}">${money(o.total)}</b></span>
        ${Array.isArray(o.rec) ? `<span class="choice__rec">Then ${money(o.rec[0])} per ${esc(o.rec[1])}</span>` : o.note ? `<span class="choice__rec">${esc(o.note)}</span>` : ''}
      </span>
    </div>`;

  main.innerHTML = `
    <section class="hero">
      <p class="eyebrow">Quote for ${esc(who)}</p>
      <h1>Hi ${esc(name)}.</h1>
      <p class="lead">Here is what I would do for you.</p>
      ${q.vd ? `<p class="valid${expired ? ' is-old' : ''}">${expired ? 'This quote has expired. Ask me for a fresh one.' : 'Valid until ' + esc(dateText(q.vd)) + '.'}</p>` : ''}
    </section>

    <section class="sec">
      <p class="eyebrow">1</p>
      <h2>${menu.length || 3} packages</h2>
      <ul class="packs">${menu.map(menuCard).join('')}</ul>
      ${un ? `<p class="say">The top one is ${esc(un.name)}, ${money(un.price)}. But honestly, I do not think you need it. It covers ${esc(un.reason || 'extras')} you will not use right now.</p>` : ''}
    </section>

    <section class="sec">
      <p class="eyebrow">2</p>
      <h2>What I would do</h2>
      <p class="say say--big">${esc(q.why || '')}</p>
      <div class="rx">
        <p class="rx__tag">${esc(rx.tag || '')}</p>
        <h3>${esc(rx.name)} <span>${money(rx.price)}</span></h3>
        <p>${esc(rx.blurb || '')}</p>
        <ul>${(rx.items || []).map((i) => `<li>${esc(i)}</li>`).join('')}</ul>
      </div>
      ${Array.isArray(q.steps) && q.steps.length ? `<details class="steps"><summary>See the process</summary><ol>${q.steps.map((s) => `<li><b>${esc(s[0])}</b><span>${esc(s[1])}</span></li>`).join('')}</ol></details>` : ''}
    </section>

    <section class="sec" id="choose">
      <p class="eyebrow">3</p>
      <h2>Which would you rather?</h2>
      <p class="say">Everything is included. Untick anything you do not need.</p>
      <form class="choices" id="choices">
        <fieldset ${expired ? 'disabled' : ''}>
          <legend class="sr">Pick one option</legend>
          <div class="choices__grid">${q.opts.slice(0, 2).map(optCard).join('')}</div>
        </fieldset>
        <div class="go" id="go" hidden>
          <p class="go__line"></p>
          <button class="btn" type="submit" id="send">Go with this one</button>
          <p class="go__fine">This lets me know. It is not a payment. I will reply with the next steps.</p>
        </div>
        <p class="done" id="done" role="status" hidden></p>
      </form>
    </section>

    <footer class="foot">
      <p>50% to start and 50% at launch. Prices are confirmed in writing. Questions? <a href="https://simplybydaniel.com/#contact" target="_blank" rel="noopener">Send me a message</a>.</p>
    </footer>`;

  const form = $('#choices'), go = $('#go'), line = $('.go__line', go), send = $('#send');
  let picked = null;
  const off = q.opts.map(() => new Set());
  const totalOf = (i) => (q.opts[i].lines || []).reduce((n, l, k) => { const kind = l[2] || (k === 0 ? 'pkg' : 'add'); return n + (kind === 'pkg' || kind === 'add' ? num(l[1]) : kind === 'out' ? -num(l[1]) : off[i].has(k) ? -num(l[1]) : 0); }, 0);
  const refresh = () => {
    q.opts.slice(0, 2).forEach((o, i) => { const el = form.querySelector('[data-total="' + i + '"]'); if (el) el.textContent = money(totalOf(i)); });
    if (picked === null) return;
    const o = q.opts[picked], start = Math.round(totalOf(picked) / 2);
    form.querySelectorAll('.choice').forEach((c, i) => c.classList.toggle('is-on', i === picked));
    line.textContent = `Option ${o.k || 'AB'[picked]}: ${money(start)} to start${Array.isArray(o.rec) ? `, then ${money(o.rec[0])} per ${o.rec[1]} after launch` : ''}.`;
    send.textContent = `Go with option ${o.k || 'AB'[picked]}`;
    go.hidden = false;
  };
  form.addEventListener('click', (e) => {
    const c = e.target.closest('.choice'); if (!c || e.target.closest('.tick') || e.target.matches('input')) return;
    c.querySelector('input[name="opt"]').click();
  });
  form.addEventListener('change', (e) => {
    const t = e.target.closest('input[data-line]');
    if (t) {
      const i = +t.dataset.opt, k = +t.dataset.line;
      t.checked ? off[i].delete(k) : off[i].add(k);
      const p = t.closest('li').querySelector('.tick__p'); p.textContent = t.checked ? 'Included' : '−' + money(p.dataset.amt);
      picked = i; form.querySelectorAll('input[name="opt"]')[i].checked = true;   // touching an option chooses it
      return refresh();
    }
    const r = e.target.closest('input[name="opt"]'); if (!r) return;
    picked = +r.value; refresh();
  });
  form.addEventListener('submit', async (e) => {
    e.preventDefault();
    if (picked === null || expired) return;
    const o = q.opts[picked];
    send.disabled = true; send.textContent = 'Sending…';
    try {
      const res = await fetch(ENDPOINT, {
        method: 'POST', headers: { 'Content-Type': 'application/json', Accept: 'application/json' },
        body: JSON.stringify({
          _subject: `Quote ${q.id || ''}: ${name} chose option ${o.k || 'AB'[picked]}`, _template: 'table', _captcha: 'false',
          name, company: q.co || '', quote: q.id || '', package: rx.name, option: `${o.k || 'AB'[picked]}: ${o.label}`,
          one_time_total: money(totalOf(picked)), left_out: (o.lines || []).filter((l, k) => off[picked].has(k) || l[2] === 'out').map((l) => l[0]).join(', ') || 'nothing', then: Array.isArray(o.rec) ? `${money(o.rec[0])} per ${o.rec[1]}` : 'none',
        }),
      });
      if (!res.ok) throw new Error('bad');
      go.hidden = true; form.querySelector('fieldset').disabled = true;
      const d = $('#done'); d.hidden = false;
      d.innerHTML = `<ol class="done__steps" aria-label="Where you are"><li class="is-done"><i aria-hidden="true"></i><span>Your quote</span></li><li class="is-done"><i aria-hidden="true"></i><span>Your choice</span></li><li><i aria-hidden="true"></i><span>Next steps</span></li></ol><b class="done__t"></b><span class="done__p"></span>`;
      $('.done__t', d).textContent = `You have taken the second step, ${name}.`;
      $('.done__p', d).textContent = 'I will reach out soon about next steps.';
      d.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'center' });
    } catch {
      send.disabled = false; send.textContent = `Go with option ${o.k || 'AB'[picked]}`;
      line.textContent = 'That did not send. Please try again, or message me through simplybydaniel.com.';
    }
  });
}

addEventListener('hashchange', open);
open();
