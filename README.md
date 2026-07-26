# Data Center Market Intelligence

Static, public-source market intelligence dashboard. Five layers: supply/demand
fundamentals, power, capital markets, counterparty, public equities.

No build step. No dependencies. Plain HTML/CSS/JS.

## Deploy to GitHub Pages

1. Create a repo and push these files to the default branch.
2. Settings → Pages → Source: **Deploy from a branch** → branch `main`, folder `/ (root)`.
3. Live at `https://<user>.github.io/<repo>/` in about a minute.

`.nojekyll` is included so GitHub serves the files as-is.

## Local preview

Open `index.html` directly in a browser. Data is loaded as a plain JS file rather
than JSON precisely so this works over `file://` with no local server.

## Updating data

Everything lives in `data/market-data.js`. Edit values in place, bump the
`as_of` field, keep the source URL live. No other file needs to change.

### Rules

- **Every record carries a source URL.** If you cannot link it, do not publish it.
- **Do not blend methodologies.** CBRE and JLL count inventory, vacancy and
  absorption differently. Records carry a `method` field; filter before aggregating.
- **Public sources only.** This repo is public. Do not paste licensed data
  (datacenterHawk, CBRE/JLL/Cushman subscription products, Green Street) into it.

## Structure

```
index.html              page shell + tab markup
assets/styles.css       all styling
assets/app.js           renders every panel from the data file
data/market-data.js     ← the only file you edit routinely
```

## Automated feed collection

A GitHub Action (`.github/workflows/collect.yml`) runs Mondays at 13:00 UTC
(06:00 Pacific during PDT — change the cron to `0 14 * * 1` for winter, GitHub
does not observe DST). It reads RSS feeds, types each article as an event,
extracts quantities, and opens a **pull request**. Nothing reaches the live
site without you merging it.

Run it on demand: Actions tab -> Collect market feeds -> Run workflow.

### What it produces

- `data/feed.js` — tagged events the site renders. Headline, link, date, tags.
- `digest.md` — staging file for the judgment pass.

### What it never does

Store article body text. Full text is fetched into memory for signal detection
and discarded. What persists is derived signals plus a link. Aggregating and
linking is what RSS is for; republishing prose is infringement.

### Tuning it

Everything lives in `scripts/ontology.py` — sources, entity lists, event
typing rules, signal dictionaries, noise filters, scoring weights. When the
collector misses something, add the term there. Never edit `collect.py` to fix
a vocabulary gap.

Ambiguous company names (Aligned, Switch, Compass, Prime, Vantage) are listed
in `AMBIGUOUS_TERMS` and only match when capitalised in the source, so ordinary
English usage does not trigger them.

### The judgment pass

Rules can type an event and pull numbers. They cannot tell a new campus from
the same one re-announced, resolve "a leading AI company" to a counterparty,
decide whether an unstated MW figure is IT or gross, or read whether a
guarantee sits at parent or opco. Take `digest.md` into a Claude conversation
and do that pass before promoting anything into `data/market-data.js`.

## Manual-only sources

Do not point automation at these:

- **DC Byte** — subscription market intelligence; the compiled dataset is the product
- **Baxtel** — compiled facility database; bulk extraction is against terms
- **CBRE / JLL / Cushman** — free summary reports may be cited, subscription products may not

## Known gaps

Capital markets is the thinnest layer under a public-only constraint. Private
transaction comps, cap rate series, and platform marks are not publicly
disclosed. Best free path in is rating-agency ABS presale reports and public
REIT supplementals.
