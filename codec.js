// A quote is a small JSON object packed into the link, after the # (the part of a link that is never sent to a server).
// "c" + deflate when the browser can, otherwise "j" + plain.
const toB64 = (u8) => { let s = ''; u8.forEach((b) => { s += String.fromCharCode(b); }); return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, ''); };
const fromB64 = (s) => Uint8Array.from(atob(s.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0));
const pipe = async (bytes, stream) => new Uint8Array(await new Response(new Blob([bytes]).stream().pipeThrough(stream)).arrayBuffer());

export async function encode(obj) {
  const raw = new TextEncoder().encode(JSON.stringify(obj));
  try {
    if (typeof CompressionStream === 'function') return 'c' + toB64(await pipe(raw, new CompressionStream('deflate-raw')));
  } catch { /* fall through */ }
  return 'j' + toB64(raw);
}

export async function decode(str) {
  const kind = str[0], body = fromB64(str.slice(1));
  const raw = kind === 'c' ? await pipe(body, new DecompressionStream('deflate-raw')) : body;
  return JSON.parse(new TextDecoder().decode(raw));
}
