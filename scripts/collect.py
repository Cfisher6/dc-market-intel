#!/usr/bin/env python3
"""
COLLECTOR
=========
Reads RSS feeds, types each item as an event, extracts quantities, writes:

  data/feed.js   -> tagged events the site renders (headline + link + tags only)
  digest.md      -> staging file for the human/Claude judgment pass

NEVER writes article body text. Full text is fetched into memory for signal
detection and discarded. What persists is derived signals plus a link.

Run:  python scripts/collect.py [--days 14] [--no-network]
"""

import argparse, datetime as dt, hashlib, html, json, os, re, sys, time
import urllib.error, urllib.parse, urllib.request
from difflib import SequenceMatcher

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import ontology as O

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))


def _feedparser():
    """Imported lazily so --no-network works without the dependency installed."""
    try:
        import feedparser
        return feedparser
    except ImportError:
        print("feedparser missing. Run: pip install feedparser", file=sys.stderr)
        sys.exit(1)

# ---------------------------------------------------------------------------
# fetch
# ---------------------------------------------------------------------------

# A descriptive User-Agent is table stakes for polite scraping and is
# mandatory for SEC EDGAR specifically (https://www.sec.gov/os/webmaster-faq)
# — requests without one are rejected outright.
FEED_UA = "dc-market-intel/1.0 (public-source research; github.com/Cfisher6/dc-market-intel; contact cyrusconnor2109@gmail.com)"

# SEC's WAF 403s any User-Agent containing a URL — FEED_UA's github.com link
# is enough to be refused, every time, on every sec.gov endpoint. Verified by
# alternating both strings against the same URL with 6s spacing: the
# URL-bearing UA failed 2/2 and this one succeeded 2/2, so it is the UA and
# not rate limiting. SEC asks for declared identity + contact only:
# https://www.sec.gov/os/webmaster-faq
SEC_UA = "dc-market-intel research cyrusconnor2109@gmail.com"

def ua_for(url):
    return SEC_UA if re.search(r"//(www\.|data\.)?sec\.gov/", url or "") else FEED_UA


def _parse(url):
    """Fetch via urllib with a compliant User-Agent, then hand the bytes to
    feedparser. feedparser's own request_headers kwarg does not reliably
    reach SEC EDGAR, which requires a descriptive UA and 403s the default
    fetch outright — so we can't just call feedparser.parse(url) for it.

    Returns (parsed, error). Transport failures are returned rather than
    swallowed: reporting them as "no entries" hid a persistent SEC 403 behind
    a message that pointed at the feed URL instead of the request."""
    import urllib.request
    feedparser = _feedparser()
    try:
        req = urllib.request.Request(url, headers={"User-Agent": ua_for(url)})
        with urllib.request.urlopen(req, timeout=20) as r:
            body = r.read()
    except urllib.error.HTTPError as e:
        return feedparser.parse(b""), f"HTTP {e.code} from source"
    except Exception as e:
        return feedparser.parse(b""), f"{type(e).__name__}: {e}"
    return feedparser.parse(body), None


def discover_feed(homepage):
    """Try RSS autodiscovery when a direct feed URL fails."""
    import urllib.request
    try:
        req = urllib.request.Request(homepage, headers={"User-Agent": ua_for(homepage)})
        with urllib.request.urlopen(req, timeout=20) as r:
            body = r.read(400_000).decode("utf-8", "ignore")
    except Exception:
        return None
    m = re.search(r'<link[^>]+type=["\']application/(?:rss|atom)\+xml["\'][^>]*>', body, re.I)
    if not m:
        return None
    href = re.search(r'href=["\']([^"\']+)["\']', m.group(0), re.I)
    return urllib.parse.urljoin(homepage, href.group(1)) if href else None


def fetch_sources(days):
    feedparser = _feedparser()
    cutoff = dt.datetime.now(dt.timezone.utc) - dt.timedelta(days=days)
    items, report = [], []

    for i, src in enumerate(O.SOURCES):
        if i:
            time.sleep(1)  # polite spacing — avoids tripping burst rate limits (SEC EDGAR is strict about this)
        url, note = src["url"], "direct"
        parsed, err = _parse(url)

        if not parsed.entries and src.get("fallback"):
            found = discover_feed(src["fallback"])
            if found:
                url, note = found, "autodiscovered"
                parsed, err2 = _parse(url)
                err = err2 or err

        if not parsed.entries:
            report.append({"source": src["name"], "ok": False, "count": 0,
                           "note": err or "no entries — check feed URL in ontology.py SOURCES"})
            continue

        n = 0
        for e in parsed.entries:
            pub = None
            for key in ("published_parsed", "updated_parsed"):
                if getattr(e, key, None):
                    pub = dt.datetime(*getattr(e, key)[:6], tzinfo=dt.timezone.utc)
                    break
            if pub and pub < cutoff:
                continue
            items.append({
                "title": html.unescape(getattr(e, "title", "")).strip(),
                "url": getattr(e, "link", ""),
                "summary": re.sub(r"<[^>]+>", " ", html.unescape(getattr(e, "summary", ""))),
                "date": pub.date().isoformat() if pub else "",
                "source": src["short"],
                "source_full": src["name"],
                "implied_party": src.get("implied_party"),
                "source_tier": src.get("tier", "trade_press"),
            })
            n += 1
        report.append({"source": src["name"], "ok": True, "count": n, "note": note, "url": url})

    return items, report

# ---------------------------------------------------------------------------
# dedupe
# ---------------------------------------------------------------------------

def norm_url(u):
    try:
        p = urllib.parse.urlsplit(u)
        return (p.netloc.lower().replace("www.", "") + p.path.rstrip("/")).lower()
    except Exception:
        return u

def norm_title(t):
    return re.sub(r"[^a-z0-9 ]", "", t.lower()).strip()

def load_existing_events():
    """Read the previously persisted event store, if any. Returns {id: event}."""
    path = os.path.join(ROOT, "data", "feed.js")
    if not os.path.exists(path):
        return {}
    with open(path, encoding="utf-8") as f:
        raw = f.read()
    m = re.search(r"window\.DC_FEED\s*=\s*(\{.*\});\s*$", raw, re.S)
    if not m:
        return {}
    try:
        payload = json.loads(m.group(1))
    except Exception:
        return {}
    return {e["id"]: e for e in payload.get("events", [])}


def merge_events(existing, new_events, run_ts):
    """New events are added; events seen before keep their first_seen date
    but get refreshed tags/score. Nothing is ever dropped here — that's a
    judgment-pass decision, not the collector's job."""
    merged = dict(existing)
    for ev in new_events:
        prev = merged.get(ev["id"])
        ev["first_seen"] = prev.get("first_seen", run_ts) if prev else run_ts
        ev["last_seen"] = run_ts
        merged[ev["id"]] = ev
    return list(merged.values())


def dedupe(items):
    seen_urls, kept = set(), []
    for it in items:
        k = norm_url(it["url"])
        if k in seen_urls:
            continue
        seen_urls.add(k)
        # Filing indexes are titled formulaically — every 8-K is literally
        # "8-K - Current report", so fuzzy title matching scores 1.000 and
        # collapses a company's entire filing history (and both companies'
        # 8-Ks) into a single event. Their identity is the accession URL,
        # already deduped above. Fuzzy matching exists to catch the same
        # story syndicated across outlets; it does not apply here.
        if it.get("source_tier") == "primary":
            kept.append(it)
            continue
        nt = norm_title(it["title"])
        dup = next((k2 for k2 in kept if SequenceMatcher(None, nt, norm_title(k2["title"])).ratio() > 0.86), None)
        if dup:
            dup.setdefault("also_in", []).append(it["source"])
            continue
        kept.append(it)
    return kept

# ---------------------------------------------------------------------------
# extract
# ---------------------------------------------------------------------------

RE_MW = re.compile(r"(\d[\d,]*(?:\.\d+)?)\s*(gw|mw)\b", re.I)
RE_MONEY = re.compile(r"\$\s?(\d[\d,]*(?:\.\d+)?)\s*(billion|bn|b|million|mm|m)\b", re.I)
RE_ACRES = re.compile(r"(\d[\d,]*)\s*acres?\b", re.I)
RE_YEAR = re.compile(r"\b(20[2-4]\d)\b")

def _num(s):
    try: return float(s.replace(",", ""))
    except Exception: return None

def extract_quantities(text):
    out = {"mw": [], "money_musd": [], "acres": [], "years": []}
    for val, unit in RE_MW.findall(text):
        v = _num(val)
        if v is None: continue
        out["mw"].append(round(v * 1000, 1) if unit.lower() == "gw" else round(v, 1))
    for val, unit in RE_MONEY.findall(text):
        v = _num(val)
        if v is None: continue
        out["money_musd"].append(round(v * 1000, 1) if unit.lower() in ("billion", "bn", "b") else round(v, 1))
    out["acres"] = [_num(a) for a in RE_ACRES.findall(text)]
    out["years"] = sorted(set(RE_YEAR.findall(text)))
    for k in ("mw", "money_musd", "acres"):
        out[k] = sorted({x for x in out[k] if x}, reverse=True)[:4]
    # Figures above ~5 GW are market/queue aggregates, not a campus. Keep them
    # visible but out of the campus tally so one "400 GW queue" headline cannot
    # swamp the counterparty numbers.
    out["mw_campus"] = [v for v in out["mw"] if v <= 5000]
    out["mw_aggregate"] = [v for v in out["mw"] if v > 5000]
    return out

def mw_basis(text):
    """Flag whether a quoted MW figure is IT load, gross, or unstated."""
    t = text.lower()
    if any(s in t for s in O.CAPACITY_SIGNALS["mw_it"]): return "IT"
    if any(s in t for s in O.CAPACITY_SIGNALS["mw_gross"]): return "gross"
    return "unstated"

_RE_CACHE = {}

def _term_re(term):
    """Word-boundary matcher. Prevents 'loc' matching inside 'local opposition'."""
    r = _RE_CACHE.get(term)
    if r is None:
        r = re.compile(r"(?<![a-z0-9])" + re.escape(term) + r"(?![a-z0-9])", re.I)
        _RE_CACHE[term] = r
    return r

def has_term(text, term):
    return bool(_term_re(term).search(text))

def match_dict(text, d):
    """Ambiguous single-word names (Aligned, Switch, Compass...) must appear
    capitalised to count, so the ordinary English word does not trigger them."""
    out = set()
    for name, terms in d.items():
        for term in terms:
            m = _term_re(term).search(text)
            if not m:
                continue
            # Ambiguous single words only count when capitalised in the source,
            # so "the schedule is aligned with" is not Aligned Data Centers.
            if term in O.AMBIGUOUS_TERMS and not m.group(0)[:1].isupper():
                continue
            out.add(name)
            break
    return sorted(out)

def match_signals(text, groups):
    return sorted({g for g, terms in groups.items() if any(has_term(text, t) for t in terms)})

def classify_event(text):
    for etype, terms in O.EVENT_RULES:
        if any(has_term(text, t) for t in terms):
            return etype
    return "OTHER"

def is_noise(text):
    return any(has_term(text, n) for n in O.NOISE)

def opposition_status(text, event_type):
    """Sub-status for DELAY_REPORTED only — see ontology.OPPOSITION_STATUS for
    why the ordering matters. Returns None when nothing resolves."""
    if event_type != "DELAY_REPORTED":
        return None
    for status, terms in O.OPPOSITION_STATUS:
        if any(has_term(text, t) for t in terms):
            return status
    return None

def confidence_of(text, source_tier):
    """Primary sources are never downgraded — a filing is a filing. Trade
    press drops to unconfirmed when the language hedges."""
    if source_tier == "primary":
        return "primary"
    if any(has_term(text, t) for t in O.RUMOR_TERMS):
        return "unconfirmed"
    return "trade_press"

def rscore(ev):
    """Relevance accessor tolerant of pre-migration records, which carry the
    old flat `score` field until backfill_schema.py has run over them."""
    v = ev.get("relevance_score")
    return v if v is not None else ev.get("score", 0)

def sec_item_hints(text):
    """SEC filings cite Item numbers, not prose. Translate the codes present
    into phrases the existing EVENT_RULES keywords already recognize."""
    low = text.lower()
    return " ".join(hint for code, hint in O.SEC_ITEM_HINTS.items() if code in low)

def topics_for(text, ev):
    """Multi-label topics: term rules plus three derived flags."""
    out = {t for t, terms in O.TOPIC_RULES.items() if any(has_term(text, term) for term in terms)}
    if ev["hyperscalers"]:
        out.add("Hyperscale")
    if ev["neoclouds"]:
        out.add("Neocloud & AI Compute")
    if any(m in O.INTL_METROS for m in ev["metros"]):
        out.add("International")
    return sorted(out)

RE_SCRIPT_STYLE = re.compile(r"<script\b.*?</script>|<style\b.*?</style>", re.S | re.I)
RE_ARTICLE = re.compile(r"<article[^>]*>(.*?)</article>", re.S | re.I)

def fetch_article_text(url):
    """Fetch one article for in-memory signal detection. Returns (text, scoped)
    where scoped=True means the text came from an <article> element rather than
    the whole page. NEVER persisted — derived signals only, per the README."""
    import urllib.request
    try:
        req = urllib.request.Request(url, headers={"User-Agent": ua_for(url)})
        with urllib.request.urlopen(req, timeout=15) as r:
            body = r.read(600_000).decode("utf-8", "ignore")
    except Exception:
        return None, False
    body = RE_SCRIPT_STYLE.sub(" ", body)
    m = RE_ARTICLE.search(body)
    chunk, scoped = (m.group(1), True) if m else (body, False)
    text = re.sub(r"<[^>]+>", " ", chunk)
    text = re.sub(r"\s+", " ", html.unescape(text))
    return text[:20000], scoped

def party_category(name):
    for d in (O.HYPERSCALERS, O.NEOCLOUDS, O.OPERATORS, O.CAPITAL):
        if name in d:
            return d
    return None

# ---------------------------------------------------------------------------
# score
# ---------------------------------------------------------------------------

def score(ev):
    W, s = O.WEIGHTS, 0.0
    if ev["quantities"]["mw_campus"]: s += W["quantity_mw"]
    if ev["quantities"]["money_musd"]: s += W["quantity_money"]
    s += W["hyperscaler"] * bool(ev["hyperscalers"])
    s += W["neocloud"] * bool(ev["neoclouds"])
    s += W["operator"] * bool(ev["operators"])
    s += W["power_entity"] * bool(ev["power_entities"])
    s += W["capital"] * bool(ev["capital"])
    s += W["metro"] * bool(ev["metros"])
    if "guarantee" in ev["commercial_signals"]: s += W["guarantee_signal"]
    if "prelease" in ev["commercial_signals"]: s += W["prelease_signal"]
    if ev["event_type"] not in ("OTHER", "CAPACITY_ANNOUNCED"): s += W["event_specific"]
    return round(s, 1)

# ---------------------------------------------------------------------------
# build
# ---------------------------------------------------------------------------

DEEP_TYPES = ("LEASE_SIGNED", "TENANT_DISCLOSED", "FINANCING_CLOSED", "PLATFORM_M&A")
DEEP_CAP = 40  # articles fetched per run — keep the weekly Action fast and polite

def build_events(items, deep=False):
    events, texts = [], {}
    for it in items:
        text = it["title"] + " " + it["summary"]
        if is_noise(text):
            continue
        text = text + " " + sec_item_hints(text)
        # SEC filing indexes title themselves "8-K - Current report", which
        # says nothing about who filed — the feed is scoped by CIK, so the
        # name never appears. Prefix it so the row is legible on its own.
        title = it["title"]
        implied_name = it.get("implied_party")
        if implied_name and implied_name.lower() not in title.lower():
            title = f"{implied_name} — {title}".strip()

        ev = {
            "id": hashlib.sha1(norm_url(it["url"]).encode()).hexdigest()[:10],
            "title": title,
            "url": it["url"],
            "date": it["date"],
            "source": it["source"],
            "also_in": it.get("also_in", []),
            "event_type": classify_event(text),
            "hyperscalers": match_dict(text, O.HYPERSCALERS),
            "neoclouds": match_dict(text, O.NEOCLOUDS),
            "operators": match_dict(text, O.OPERATORS),
            "power_entities": match_dict(text, O.POWER_ENTITIES),
            "capital": match_dict(text, O.CAPITAL),
            "metros": match_dict(text, O.METROS),
            "capacity_signals": match_signals(text, O.CAPACITY_SIGNALS),
            "commercial_signals": match_signals(text, O.COMMERCIAL_SIGNALS),
            "power_signals": match_signals(text, O.POWER_SIGNALS),
            "quantities": extract_quantities(text),
            "mw_basis": mw_basis(text),
        }
        implied = it.get("implied_party")
        if implied:
            d = party_category(implied)
            key = ("hyperscalers" if d is O.HYPERSCALERS else
                   "neoclouds" if d is O.NEOCLOUDS else
                   "operators" if d is O.OPERATORS else
                   "capital" if d is O.CAPITAL else None)
            if key and implied not in ev[key]:
                ev[key] = sorted(ev[key] + [implied])
        ev["topics"] = topics_for(text, ev)
        ev["opposition_status"] = opposition_status(text, ev["event_type"])
        ev["confidence_tier"] = confidence_of(text, it.get("source_tier", "trade_press"))
        ev["relevance_score"] = score(ev)
        events.append(ev)
        texts[ev["id"]] = text

    if deep:
        deep_scan(events, texts)

    events.sort(key=lambda e: (-rscore(e), e["date"]), reverse=False)
    events.sort(key=rscore, reverse=True)
    return events


def deep_scan(events, texts):
    """Fetch article bodies (in memory only) for the highest-value events and
    re-run signal extraction over the full text. Only <article>-scoped
    extractions are used — whole-page fallbacks would tag entities and metros
    from nav bars and 'related stories' modules."""
    candidates = [ev for ev in events if
                  ev["hyperscalers"] or ev["neoclouds"] or
                  ev["event_type"] in DEEP_TYPES or rscore(ev) >= 6]
    fetched = enriched = 0
    for ev in candidates:
        if fetched >= DEEP_CAP:
            break
        if fetched:
            time.sleep(0.5)
        body, scoped = fetch_article_text(ev["url"])
        fetched += 1
        if not body or not scoped:
            continue
        full = texts[ev["id"]] + " " + body
        ev["quantities"] = extract_quantities(full)
        ev["mw_basis"] = mw_basis(full)
        ev["hyperscalers"] = match_dict(full, O.HYPERSCALERS)
        ev["neoclouds"] = match_dict(full, O.NEOCLOUDS)
        ev["operators"] = match_dict(full, O.OPERATORS)
        ev["power_entities"] = match_dict(full, O.POWER_ENTITIES)
        ev["capital"] = match_dict(full, O.CAPITAL)
        ev["metros"] = match_dict(full, O.METROS)
        ev["capacity_signals"] = match_signals(full, O.CAPACITY_SIGNALS)
        ev["commercial_signals"] = match_signals(full, O.COMMERCIAL_SIGNALS)
        ev["power_signals"] = match_signals(full, O.POWER_SIGNALS)
        # Only upgrade a vague type — never overwrite a specific one with a
        # body-text match, the headline is the better statement of the event.
        if ev["event_type"] in ("OTHER", "CAPACITY_ANNOUNCED"):
            et = classify_event(full)
            if et != "OTHER":
                ev["event_type"] = et
        ev["topics"] = topics_for(full, ev)
        ev["opposition_status"] = opposition_status(full, ev["event_type"])
        # confidence_tier is deliberately NOT recomputed here. It is derived
        # from headline + summary; full bodies routinely contain hedging
        # boilerplate ("sources say", "in talks") describing background rather
        # than the reported fact, which would downgrade solid stories.
        ev["deep_scan"] = True
        ev["relevance_score"] = score(ev)
        enriched += 1
    print(f"  deep-scan: {fetched} article(s) fetched, {enriched} enriched")

def mw_tally(events):
    """Announced MW by counterparty. Announced, not verified — dedupe by hand."""
    tally = {}
    for ev in events:
        if not ev["quantities"]["mw_campus"]:
            continue
        biggest = max(ev["quantities"]["mw_campus"])
        for name in ev["neoclouds"] + ev["hyperscalers"] + ev["operators"]:
            r = tally.setdefault(name, {"name": name, "mw": 0.0, "events": 0,
                                        "kind": "neocloud" if name in O.NEOCLOUDS else
                                                "hyperscaler" if name in O.HYPERSCALERS else "operator"})
            r["mw"] += biggest
            r["events"] += 1
    return sorted(tally.values(), key=lambda r: -r["mw"])[:14]

# ---------------------------------------------------------------------------
# write
# ---------------------------------------------------------------------------

def write_feed(events, report, days):
    payload = {
        # 2 = relevance_score/confidence_tier split, opposition_status.
        # Readers should tolerate schema 1 records (flat `score`, no tier)
        # until backfill_schema.py has been run over the store.
        "schema": 2,
        "generated": dt.datetime.now(dt.timezone.utc).isoformat(timespec="seconds"),
        "window_days": days,
        "sources": report,
        "manual_sources": O.MANUAL_SOURCES,
        "events": events,
        "mw_tally": mw_tally(events),
    }
    path = os.path.join(ROOT, "data", "feed.js")
    with open(path, "w", encoding="utf-8") as f:
        f.write("/* GENERATED by scripts/collect.py — do not edit by hand. */\n")
        f.write("window.DC_FEED = ")
        json.dump(payload, f, indent=1, ensure_ascii=False)
        f.write(";\n")
    return len(events)

DIGEST_HEAD = """# Staging digest — {date}

Machine-collected and rule-typed. **Nothing here is verified.** Run this through
a judgment pass before promoting anything into `data/market-data.js`.

What the rules cannot do, and you must:

- Tell a genuinely new campus from the same one re-announced for the third time
- Resolve "a leading AI company" to an actual counterparty
- Decide whether a quoted MW is IT load or gross when the article does not say
- Read whether a guarantee sits at parent or opco
- Judge whether an announced project is financeable or a press release

Sources checked: {sources}

---
"""

def write_digest(events, report, days):
    lines = [DIGEST_HEAD.format(
        date=dt.date.today().isoformat(),
        sources=", ".join(f"{r['source']} ({r['count']})" if r["ok"] else f"{r['source']} FAILED" for r in report),
    )]
    bad = [r for r in report if not r["ok"]]
    if bad:
        lines.append("> **Feed problems:** " + "; ".join(f"{r['source']} — {r['note']}" for r in bad) + "\n")

    top = [e for e in events if rscore(e) >= 6][:40]
    lines.append(f"\n## Ranked events ({len(top)} of {len(events)} above threshold, {days}-day window)\n")
    for e in top:
        parties = e["hyperscalers"] + e["neoclouds"] + e["operators"]
        bits = []
        if e["quantities"]["mw_campus"]:
            bits.append(f"{max(e['quantities']['mw_campus']):,.0f} MW ({e['mw_basis']})")
        if e["quantities"]["mw_aggregate"]:
            bits.append(f"{max(e['quantities']['mw_aggregate']):,.0f} MW aggregate/queue")
        if e["quantities"]["money_musd"]:
            v = max(e["quantities"]["money_musd"])
            bits.append(f"${v/1000:.1f}B" if v >= 1000 else f"${v:,.0f}M")
        if e["metros"]: bits.append("/".join(e["metros"]))
        if "guarantee" in e["commercial_signals"]: bits.append("**GUARANTEE LANGUAGE**")
        if "prelease" in e["commercial_signals"]: bits.append("prelease")
        if e.get("opposition_status"): bits.append(e["opposition_status"].replace("_", " "))
        tier = e.get("confidence_tier", "trade_press")
        lines.append(
            f"\n### [{rscore(e)}] {e['event_type']} — {e['title']}\n"
            f"- {e['source']} · {e['date']} · confidence: {tier} · <{e['url']}>\n"
            f"- Parties: {', '.join(parties) if parties else '—'}\n"
            f"- Signals: {', '.join(bits) if bits else '—'}\n"
            f"- Power: {', '.join(e['power_entities'] + e['power_signals']) or '—'}\n"
        )

    tal = mw_tally(events)
    if tal:
        lines.append("\n## Announced MW by counterparty (unverified, may double-count)\n")
        lines.append("| Counterparty | Kind | MW announced | Events |\n|---|---|---:|---:|")
        for r in tal:
            lines.append(f"| {r['name']} | {r['kind']} | {r['mw']:,.0f} | {r['events']} |")

    lines.append("\n\n## Manual sources — check these by hand\n")
    for m in O.MANUAL_SOURCES:
        lines.append(f"- **{m['name']}** — {m['why']}")

    with open(os.path.join(ROOT, "digest.md"), "w", encoding="utf-8") as f:
        f.write("\n".join(lines) + "\n")

# ---------------------------------------------------------------------------

def main():
    ap = argparse.ArgumentParser()
    ap.add_argument("--days", type=int, default=14)
    ap.add_argument("--no-network", action="store_true", help="write empty scaffolding")
    ap.add_argument("--no-deep", action="store_true",
                    help="skip fetching article bodies for signal enrichment")
    a = ap.parse_args()

    if a.no_network:
        items, report = [], [{"source": s["name"], "ok": False, "count": 0, "note": "offline"} for s in O.SOURCES]
    else:
        items, report = fetch_sources(a.days)

    new_events = build_events(dedupe(items), deep=not a.no_deep and not a.no_network)
    existing = load_existing_events()

    if a.no_network:
        # Scaffolding runs must never wipe a real persisted store.
        all_events = list(existing.values())
    else:
        run_ts = dt.datetime.now(dt.timezone.utc).date().isoformat()
        all_events = merge_events(existing, new_events, run_ts)
        all_events.sort(key=lambda e: (-rscore(e), e["date"]), reverse=False)
        all_events.sort(key=rscore, reverse=True)

    n = write_feed(all_events, report, a.days)
    write_digest(new_events, report, a.days)

    for r in report:
        print(f"  {'ok ' if r['ok'] else 'FAIL'} {r['source']:<24} {r['count']:>4}  {r.get('note','')}")
    print(f"\n{n} events written to data/feed.js")

if __name__ == "__main__":
    main()
