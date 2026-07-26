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

import argparse, datetime as dt, hashlib, html, json, os, re, sys, urllib.parse
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

def discover_feed(homepage):
    """Try RSS autodiscovery when a direct feed URL fails."""
    import urllib.request
    try:
        req = urllib.request.Request(homepage, headers={"User-Agent": "dc-intel/1.0 (+github pages research)"})
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

    for src in O.SOURCES:
        url, note = src["url"], "direct"
        parsed = feedparser.parse(url)

        if not parsed.entries and src.get("fallback"):
            found = discover_feed(src["fallback"])
            if found:
                url, note = found, "autodiscovered"
                parsed = feedparser.parse(url)

        if not parsed.entries:
            report.append({"source": src["name"], "ok": False, "count": 0,
                           "note": "no entries — check feed URL in ontology.py SOURCES"})
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

def dedupe(items):
    seen_urls, kept = set(), []
    for it in items:
        k = norm_url(it["url"])
        if k in seen_urls:
            continue
        seen_urls.add(k)
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

def build_events(items):
    events = []
    for it in items:
        text = it["title"] + " " + it["summary"]
        if is_noise(text):
            continue
        ev = {
            "id": hashlib.sha1(norm_url(it["url"]).encode()).hexdigest()[:10],
            "title": it["title"],
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
        ev["score"] = score(ev)
        events.append(ev)
    events.sort(key=lambda e: (-e["score"], e["date"]), reverse=False)
    events.sort(key=lambda e: e["score"], reverse=True)
    return events

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

    top = [e for e in events if e["score"] >= 6][:40]
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
        lines.append(
            f"\n### [{e['score']}] {e['event_type']} — {e['title']}\n"
            f"- {e['source']} · {e['date']} · <{e['url']}>\n"
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
    a = ap.parse_args()

    if a.no_network:
        items, report = [], [{"source": s["name"], "ok": False, "count": 0, "note": "offline"} for s in O.SOURCES]
    else:
        items, report = fetch_sources(a.days)

    events = build_events(dedupe(items))
    n = write_feed(events, report, a.days)
    write_digest(events, report, a.days)

    for r in report:
        print(f"  {'ok ' if r['ok'] else 'FAIL'} {r['source']:<24} {r['count']:>4}  {r.get('note','')}")
    print(f"\n{n} events written to data/feed.js")

if __name__ == "__main__":
    main()
