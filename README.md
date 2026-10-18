# Simply pricing

Private quote builder (PIN gated) at pricing.simplybydaniel.com, and the public quote page it links to at /q/.

- `index.html`, `app.js`: the builder. Pick who it is for, the package, and two versions (option A and B). It makes a link.
- `q/`: the page the client sees. Everything it shows travels inside the link (after the `#`), so nothing is stored anywhere. Quotes follow the "menu" order: talk them out of the top package, prescribe the right one, then offer a choice of two.
- `codec.js`: packs and unpacks the quote in the link.
- Prices live in `config.src.js` (not in git). `node lock.mjs <pin>` encrypts them into `config.enc.json`.
