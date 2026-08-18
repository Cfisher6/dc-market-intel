/* ---------------------------------------------------------------------------
   MARKET DATA
   ---------------------------------------------------------------------------
   Every record carries: value, as_of, source name, source url, and (where
   relevant) `method` — the research house whose methodology produced it.

   DO NOT BLEND METHODOLOGIES. CBRE and JLL count inventory, vacancy and
   absorption differently. Averaging them produces a number that describes
   no market. Filter by `method` before aggregating anything.

   To update: edit values in place, bump `as_of`, keep the source URL live.
   --------------------------------------------------------------------------- */

window.DC_DATA = {

  meta: {
    built: "2026-07-25",
    scope: "North America primary + frontier markets",
    basis: "Public sources only — no licensed or subscription data republished."
  },

  /* -----------------------------------------------------------------------
     HERO — the constraint ratio
     ----------------------------------------------------------------------- */
  constraint: {
    queue_gw: 410,
    queue_dc_share: 0.87,
    approved_mw_12mo: 2168,
    as_of: "2026-04-01",
    source: "ERCOT Large Load Update, Senate Committee on Business & Commerce",
    url: "https://www.ercot.com/files/docs/2026/04/01/ERCOT_LargeLoad_Update_April2026_B-C_-Hearing.pdf",
    approvals_source: "ERCOT Large Load Working Group, March 2026",
    approvals_url: "https://www.ercot.com/files/docs/2026/03/12/March-TAC-Report.pdf"
  },

  /* -----------------------------------------------------------------------
     LAYER 1 — SUPPLY / DEMAND FUNDAMENTALS
     ----------------------------------------------------------------------- */
  fundamentals: {
    headline: [
      { label: "Primary market vacancy", value: "1.4%", note: "Record low", method: "CBRE", as_of: "YE 2025",
        source: "CBRE North America Data Center Trends H2 2025",
        url: "https://www.cbre.com/insights/books/north-america-data-center-trends-h2-2025" },
      { label: "Primary market vacancy", value: "1.0%", note: "Second consecutive year", method: "JLL", as_of: "YE 2025",
        source: "JLL North America Data Center Report Year-end 2025",
        url: "https://www.jll.com/en-us/insights/market-dynamics/north-america-data-centers" },
      { label: "Preleased share of under construction", value: "74.3%", note: "Primary markets", method: "CBRE", as_of: "2026",
        source: "CBRE Investment Management",
        url: "https://www.cbreim.com/insights/articles/data-centers-aint-no-mountain-high-enough" },
      { label: "Under construction", value: "35 GW", note: "Mostly pre-committed, 2027–28 delivery", method: "JLL", as_of: "YE 2025",
        source: "JLL North America Data Center Report Year-end 2025",
        url: "https://www.jll.com/en-us/insights/market-dynamics/north-america-data-centers" },
      { label: "Active NA capacity", value: "39 GW", note: "", method: "JLL", as_of: "YE 2025",
        source: "JLL North America Data Center Report Year-end 2025",
        url: "https://www.jll.com/en-us/insights/market-dynamics/north-america-data-centers" },
      { label: "Frontier-market share of UC", value: "64%", note: "Map is being redrawn", method: "JLL", as_of: "YE 2025",
        source: "JLL North America Data Center Report Year-end 2025",
        url: "https://www.jll.com/en-us/insights/market-dynamics/north-america-data-centers" },
      { label: "Avg asking rate, 250–500 kW", value: "$195.94", note: "per kW/month, +6.5% YoY — 4th consecutive annual increase", method: "CBRE", as_of: "YE 2025",
        source: "CBRE North America Data Center Trends H2 2025",
        url: "https://www.cbre.com/insights/books/north-america-data-center-trends-h2-2025" },
      { label: "Primary supply growth", value: "+36%", note: "YoY to 9,432 MW", method: "CBRE", as_of: "YE 2025",
        source: "CBRE North America Data Center Trends H2 2025",
        url: "https://www.cbre.com/insights/books/north-america-data-center-trends-h2-2025" }
    ],

    absorption: {
      caption: "Net absorption, MW. CBRE methodology. 2025 full-year vs Q1 2026.",
      method: "CBRE",
      source: "CBRE Global Data Center Trends 2026; CBRE NA Trends H2 2025",
      url: "https://www.cbre.com/insights/reports/global-data-center-trends-2026",
      rows: [
        { market: "Northern Virginia", fy2025: 1102.0, q1_2026: 1148.3, note: "Q1 set an all-time market high" },
        { market: "Dallas–Fort Worth", fy2025: 470.8, q1_2026: null, note: "+424 MW YoY in 2025" },
        { market: "Top 4 NA markets", fy2025: 2497.6, q1_2026: 2236.2, note: "Q1 2026 +34% YoY" }
      ]
    },

    vacancy_detail: {
      caption: "Market-level vacancy. CBRE methodology, Q1 2026 unless noted.",
      method: "CBRE",
      source: "CBRE Global Data Center Trends 2026 / DCD coverage",
      url: "https://www.datacenterdynamics.com/en/news/cbre-global-data-center-demand-continues-to-outstrip-supply-driving-up-rental-rates-and-construction-costs/",
      rows: [
        { market: "Northern Virginia", vacancy: 0.3 },
        { market: "Atlanta", vacancy: 1.0 },
        { market: "Singapore", vacancy: 2.0 },
        { market: "Santiago", vacancy: 3.3 },
        { market: "Sydney", vacancy: 4.5 },
        { market: "Tokyo", vacancy: 6.0 },
        { market: "APAC overall", vacancy: 7.0 },
        { market: "London", vacancy: 8.6 },
        { market: "São Paulo", vacancy: 9.6 },
        { market: "Querétaro", vacancy: 10.6 },
        { market: "Hong Kong", vacancy: 18.0 },
        { market: "Bogotá", vacancy: 18.7 }
      ]
    },

    nova: {
      caption: "Northern Virginia — the methodology divergence, illustrated.",
      rows: [
        { metric: "Inventory", cbre: "4,039.6 MW (YE 2025, +37% YoY)", jll: "~4,900 MW operating (mid-2025)" },
        { metric: "Vacancy", cbre: "0.5% — 21.5 MW available", jll: "—" },
        { metric: "Under construction", cbre: "2,078.2 MW (H1 2025, +80%)", jll: "~1,100 MW (mid-2025)" },
        { metric: "2026 deliveries pre-committed", cbre: "96%", jll: "—" }
      ],
      source: "MotionCRE 2026 Market Brief, compiling CBRE and JLL",
      url: "https://motioncre.com/resources/data-center-development-northern-virginia"
    }
  },

  /* -----------------------------------------------------------------------
     LAYER 2 — POWER
     ----------------------------------------------------------------------- */
  power: {
    headline: [
      { label: "ERCOT large-load queue", value: "~410 GW", note: "~87% data centers", as_of: "Mar 2026",
        source: "ERCOT Large Load Update, April 2026",
        url: "https://www.ercot.com/files/docs/2026/04/01/ERCOT_LargeLoad_Update_April2026_B-C_-Hearing.pdf" },
      { label: "Approved to energize, trailing 12mo", value: "~2,168 MW", note: "The binding constraint", as_of: "Mar 2026",
        source: "ERCOT LLWG, March 2026",
        url: "https://www.ercot.com/files/docs/2026/03/12/March-TAC-Report.pdf" },
      { label: "Large load applied, Q1 2026 alone", value: "198 GW", note: "86 GW under review ≈ ERCOT peak load", as_of: "Q1 2026",
        source: "Ascend Analytics",
        url: "https://www.ascendanalytics.com/blog/large-load-interconnection-queues-data-center-grid-access" },
      { label: "PJM capacity shortfall risk", value: "up to 15 GW", note: "By 2030, load outpacing generation", as_of: "May 2026",
        source: "Ascend Analytics",
        url: "https://www.ascendanalytics.com/blog/large-load-interconnection-queues-data-center-grid-access" }
    ],

    gen_queue: {
      caption: "ERCOT generation interconnection queue, MW. Total 453,562 MW.",
      as_of: "2026-02-28",
      source: "ERCOT Large Load Update, April 2026",
      url: "https://www.ercot.com/files/docs/2026/04/01/ERCOT_LargeLoad_Update_April2026_B-C_-Hearing.pdf",
      rows: [
        { tech: "Energy storage", mw: 177642 },
        { tech: "Solar", mw: 162927 },
        { tech: "Gas", mw: 60715 },
        { tech: "Wind", mw: 47793 }
      ]
    },

    watchlist: [
      { item: "ERCOT Batch Zero (PGRR145 / NPRR)", status: "Filed 4 Mar 2026; protocol implementation targeted August 2026",
        why: "Replaces sequential study with batch processing. Determines queue position mechanics for every new large load in Texas.",
        source: "Zero Emission Grid / ERCOT LLWG", url: "https://www.zeroemissiongrid.com/insights-press-zeg-blog/ercot-large-load-interconnection-2026/" },
      { item: "PUCT large-load transparency rulemaking", status: "Must complete by December 2026",
        why: "Targets duplicate/'phantom' load requests. Will materially restate the real size of the queue.",
        source: "Latitude Media", url: "https://www.latitudemedia.com/news/ercots-large-load-queue-has-nearly-quadrupled-in-a-single-year/" },
      { item: "Oncor 765-kV Permian backbone", status: "Longshore Switch–Drill Hole Switch filed Dec 2025; PUCT decision expected June",
        why: "~180 miles. Anchors West Texas transmission capacity and the bring-your-own-power thesis.",
        source: "Utility Dive", url: "https://www.utilitydive.com/news/ercots-large-load-queue-jumped-almost-300-last-year-official/808820/" },
      { item: "CLR / BYOG flexible interconnection", status: "Revision requests targeted April 2026 filing",
        why: "Curtailable load and bring-your-own-generation are the pressure valve. Changes the underwriting on speed-to-power.",
        source: "Zero Emission Grid", url: "https://www.zeroemissiongrid.com/insights-press-zeg-blog/ercot-large-load-interconnection-2026/" }
    ]
  },

  /* -----------------------------------------------------------------------
     LAYER 3 — CAPITAL MARKETS  (thinnest public layer)
     ----------------------------------------------------------------------- */
  capital: {
    headline: [
      { label: "Sector market cap growth since 2019", value: "+161%", note: "Second only to industrial among property types", as_of: "2025",
        source: "JLL", url: "https://www.jll.com/en-us/newsroom/data-center-availability-crisis-deepens-as-vacancy-hits-historic-low" },
      { label: "Colocation market size projection", value: "42 GW", note: "By 2030 on ~20% CAGR since 2017", as_of: "2025",
        source: "JLL", url: "https://www.jll.com/en-us/newsroom/data-center-availability-crisis-deepens-as-vacancy-hits-historic-low" }
    ],
    gaps: [
      "Private transaction comps — $/MW, going-in yields. Not publicly disclosed; leaks into trade press irregularly.",
      "Platform valuations — mark-to-market on Vantage, Aligned, Switch, QTS. Only visible at transaction events.",
      "Cap rate series — Green Street and similar are subscription. No free equivalent."
    ],
    note: "This is the weakest layer under a public-sources-only constraint. Populate opportunistically from rating agency presales, REIT supplementals, and transaction press.",

    /* -----------------------------------------------------------------------
       RATING-AGENCY ABS / CMBS  —  MANUAL ENTRY
       -----------------------------------------------------------------------
       Presale and surveillance reports on data-center securitizations are the
       only public window into private operators' lease books: tenant names,
       weighted-average remaining lease term, and tenant credit quality for
       Vantage, Aligned, CyrusOne, Switch, Stack and others that file nothing
       with the SEC.

       Hand-entered on purpose. Each agency gates its reports differently
       (registration walls, JS-rendered viewers, PDF-only), so automated
       collection needs per-site handling; do that once the field mapping has
       proven itself here. This array is NOT written by scripts/collect.py.

       THE NO-BLENDING RULE APPLIES, and harder than it does to CBRE vs JLL.
       Agencies do not compute these alike: WALT may or may not include
       extension options, "investment grade %" may be by NRSF, by base rent,
       or by MW, and shadow ratings are not issuer ratings. Always filter by
       `agency` before comparing anything. Never average across agencies.

       Every record REQUIRES a live `url` to the public report. If you cannot
       link it, do not enter it.

       Field schema — one object per rated transaction:
         deal          string   full transaction name, e.g. "Vantage Data Centers Issuer, LLC 2026-1"
         sponsor       string   operator/platform, matched to ontology OPERATORS where possible
         agency        string   "KBRA" | "Moody's" | "DBRS" | "Fitch"  (required — drives the no-blend pill)
         report_type   string   "presale" | "surveillance"
         as_of         string   report date, ISO
         size_musd     number   deal size, $M
         walt_years    number   weighted-average remaining lease term AS THE AGENCY DEFINES IT
         walt_basis    string   how that WALT was computed, verbatim where possible
         tenants       string[] named tenants disclosed in the report
         credit_note   string   tenant credit quality as stated — do not paraphrase into a rating
         url           string   REQUIRED, public link to the report
       ----------------------------------------------------------------------- */
    abs_deals: []
  },

  /* -----------------------------------------------------------------------
     LAYER 4 — COUNTERPARTY
     ----------------------------------------------------------------------- */
  counterparty: {
    caption: "2026 capex guidance. Note the revision pattern — every one of these moved up during the year.",
    source: "Company earnings; FT compilation via Tom's Hardware; CNBC",
    url: "https://www.tomshardware.com/tech-industry/big-tech/big-techs-ai-spending-plans-reach-725-billion",
    rows: [
      { name: "Amazon",    capex_2026: 200, low: 200, high: 200, fy2025: 125, initial: "$200B", revised: "—", note: "Largest single spender. FCF projected to turn negative." },
      { name: "Microsoft", capex_2026: 190, low: 190, high: 190, fy2025: 90,  initial: "$110–120B", revised: "$190B calendar 2026", note: "~$25B of the raise attributed to memory/component costs. Capacity-constrained through 2026." },
      { name: "Alphabet",  capex_2026: 180, low: 175, high: 185, fy2025: 91,  initial: "$175–185B", revised: "—", note: "Cloud backlog ~$460B, roughly double Q4 2025." },
      { name: "Meta",      capex_2026: 135, low: 125, high: 145, fy2025: 72,  initial: "$115–135B", revised: "$125–145B", note: "No public cloud to monetize. Shares fell on the raise." }
    ],
    aggregate: {
      total_2026: "~$725B",
      total_2025: "~$410B",
      growth: "+77%",
      note: "Estimates ranged $630B–$725B across the year as guidance was revised upward. Use the source date when citing.",
      source: "FT compilation; CNBC; Futurum",
      url: "https://www.cnbc.com/2026/02/06/google-microsoft-meta-amazon-ai-cash.html"
    },
    credit: [
      { label: "Microsoft commercial RPO", value: "$627B", note: "Nearly doubled", source: "Company reporting", url: "https://finance.yahoo.com/sectors/technology/articles/hyperscalers-hit-700-billion-2026-111243744.html" },
      { label: "Google Cloud backlog", value: "$460B", note: "~2x the $240B at Q4 2025", source: "Company reporting", url: "https://www.tomshardware.com/tech-industry/big-tech/big-techs-ai-spending-plans-reach-725-billion" }
    ]
  },

  /* -----------------------------------------------------------------------
     LAYER 5 — PUBLIC EQUITIES  (structurally unsuited to a static site)
     ----------------------------------------------------------------------- */
  equities: {
    note: "A static page cannot hold live prices. This layer is a structured watchlist by sub-sector — the map, not the quote screen. Pair it with your broker for pricing.",
    segments: [
      { segment: "Grid equipment / T&D",     names: "GEV, ETN, HUBB, PWR, NVT, AMSC", thesis: "Transformers, switchgear, HVDC. Order backlog is the tell; lead times are the constraint." },
      { segment: "EPC / construction",       names: "PWR, MYRG, DY, EME, IESC",        thesis: "Labor and schedule risk. Margin expansion on scarcity pricing." },
      { segment: "Rack power & cooling",     names: "VRT, MOD, SMCI, TT",              thesis: "Liquid cooling retrofit cycle. CBRE flags cooling as a rising construction-cost driver." },
      { segment: "IPPs / merchant power",    names: "CEG, VST, NRG, TLN",              thesis: "PPA repricing against data center load. Direct beneficiary of the queue backlog." },
      { segment: "Nuclear / SMR",            names: "CEG, OKLO, SMR, LEU, BWXT",       thesis: "Behind-the-meter and 24/7 firm power. Long-dated; policy-sensitive." },
      { segment: "Regulated utilities",      names: "AEP, EXC, D, SO, ETR",            thesis: "Rate base growth from interconnection capex. Watch cost-allocation rulemaking." },
      { segment: "DC REITs / platforms",     names: "DLR, EQIX",                       thesis: "Public read-through on leasing spreads, backlog, and $/kW." }
    ]
  }
};
