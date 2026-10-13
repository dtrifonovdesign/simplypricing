// PIN gate. The prices are encrypted (config.enc.json); the right PIN decrypts them, then the calculator loads.
const $ = (s) => document.querySelector(s);
const b64 = (s) => Uint8Array.from(atob(s), (c) => c.charCodeAt(0));
const form = $('#gate-form'), input = $('#pin'), err = $('#gate-err');

async function unlock(pin) {
  const enc = await (await fetch('./config.enc.json', { cache: 'no-cache' })).json();
  const base = await crypto.subtle.importKey('raw', new TextEncoder().encode(pin), 'PBKDF2', false, ['deriveKey']);
  const key = await crypto.subtle.deriveKey({ name: 'PBKDF2', salt: b64(enc.salt), iterations: enc.iter, hash: 'SHA-256' }, base, { name: 'AES-GCM', length: 256 }, false, ['decrypt']);
  const plain = await crypto.subtle.decrypt({ name: 'AES-GCM', iv: b64(enc.iv) }, key, b64(enc.data));
  globalThis.__cfg = JSON.parse(new TextDecoder().decode(plain));
  try { sessionStorage.setItem('pp', pin); } catch { /* fine */ }
  document.body.classList.remove('locked');
  $('#gate').remove();
  await import('./app.js');
}

form.addEventListener('submit', async (e) => {
  e.preventDefault();
  const pin = input.value.trim();
  if (!pin) return;
  form.classList.add('is-busy'); err.textContent = '';
  try { await unlock(pin); }
  catch {
    form.classList.remove('is-busy');
    err.textContent = 'That PIN is not right.';
    input.value = ''; input.focus();
    form.classList.remove('is-bad'); void form.offsetWidth; form.classList.add('is-bad');
  }
});

let saved = null;
try { saved = sessionStorage.getItem('pp'); } catch { /* fine */ }
if (saved) unlock(saved).catch(() => { try { sessionStorage.removeItem('pp'); } catch { /* fine */ } input.focus(); });
else input.focus();
