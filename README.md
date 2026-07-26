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

## Known gaps

Capital markets is the thinnest layer under a public-only constraint. Private
transaction comps, cap rate series, and platform marks are not publicly
disclosed. Best free path in is rating-agency ABS presale reports and public
REIT supplementals.
