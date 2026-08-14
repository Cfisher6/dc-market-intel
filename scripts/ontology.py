"""
ONTOLOGY
========
Every dictionary the collector uses to turn a headline into a typed event.

This file is meant to be edited. When you find yourself thinking "it missed
that one," add the term here rather than touching collect.py.
"""

# ---------------------------------------------------------------------------
# SOURCES
# ---------------------------------------------------------------------------
# `url` may be a direct feed OR a site homepage — the collector will attempt
# RSS autodiscovery on the homepage if the direct URL fails. A source that
# cannot be resolved is logged and skipped, never fatal.

SOURCES = [
    {"name": "Data Center Dynamics", "short": "DCD",
     "url": "https://www.datacenterdynamics.com/en/rss/",
     "fallback": "https://www.datacenterdynamics.com/"},
    {"name": "Data Center Frontier", "short": "DCF",
     "url": "https://www.datacenterfrontier.com/rss",
     "fallback": "https://www.datacenterfrontier.com/"},
    {"name": "Utility Dive", "short": "UD",
     "url": "https://www.utilitydive.com/feeds/news/",
     "fallback": "https://www.utilitydive.com/"},
    {"name": "Data Center Knowledge", "short": "DCK",
     "url": "https://www.datacenterknowledge.com/rss.xml",
     "fallback": "https://www.datacenterknowledge.com/"},
    {"name": "Data Center Post", "short": "DCPost",
     "url": "https://datacenterpost.com/feed/",
     "fallback": "https://datacenterpost.com/"},
    {"name": "SemiAnalysis", "short": "SA",
     "url": "https://www.semianalysis.com/feed",
     "fallback": "https://www.semianalysis.com/"},
    {"name": "POWER Magazine", "short": "PWR",
     "url": "https://www.powermag.com/feed/",
     "fallback": "https://www.powermag.com/"},
    {"name": "Capacity Media", "short": "CAP",
     "url": "https://www.capacitymedia.com/rss",
     "fallback": "https://www.capacitymedia.com/"},
    {"name": "Latitude Media", "short": "LM",
     "url": "https://www.latitudemedia.com/feed",
     "fallback": "https://www.latitudemedia.com/"},
    {"name": "The Register — On-Prem", "short": "REG",
     "url": "https://www.theregister.com/on_prem/headlines.atom",
     "fallback": "https://www.theregister.com/on_prem/"},
    {"name": "W.Media", "short": "WM",
     "url": "https://w.media/feed/",
     "fallback": "https://w.media/"},
    {"name": "DataCenterNews Asia", "short": "DCNA",
     "url": "https://datacenternews.asia/feed",
     "fallback": "https://datacenternews.asia/"},

    # Primary-source capital markets. SEC EDGAR company filing feeds for the
    # two pure-play public data-center REITs. `implied_party` is force-tagged
    # onto every item from this source — the filing index text never restates
    # the company name (the feed is already scoped by CIK), so ordinary
    # keyword matching would never resolve a counterparty on its own.
    {"name": "SEC EDGAR — Digital Realty (DLR) 8-K", "short": "SEC-DLR",
     "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001297996&type=8-K&dateb=&owner=include&count=40&output=atom",
     "implied_party": "Digital Realty"},
    {"name": "SEC EDGAR — Equinix (EQIX) 8-K", "short": "SEC-EQIX",
     "url": "https://www.sec.gov/cgi-bin/browse-edgar?action=getcompany&CIK=0001101239&type=8-K&dateb=&owner=include&count=40&output=atom",
     "implied_party": "Equinix"},
]

# SEC filings cite 8-K Item numbers instead of prose ("Item 2.03: Creation of
# a Direct Financial Obligation"). The collector appends the mapped phrase to
# an SEC item's working text so the *existing* EVENT_RULES keywords above
# resolve it — no separate classification path needed.
SEC_ITEM_HINTS = {
    "item 1.01": "master lease",
    "item 2.01": "acquisition of",
    "item 2.03": "term loan",
    "item 3.02": "private placement",
}

# Manual-only. Licensed / compiled-database sources, or sites with no RSS/
# syndication at all. NEVER automate against these — cite and link by hand.
MANUAL_SOURCES = [
    {"name": "DC Byte", "why": "Subscription market intelligence. The compiled dataset is the product."},
    {"name": "Baxtel", "why": "Compiled facility database. Bulk extraction is against terms; check for an API."},
    {"name": "CBRE / JLL / Cushman", "why": "Free summary reports may be cited; subscription products may not."},
    {"name": "Data Center Planet", "why": "Client-rendered facility directory, not a news source — no RSS/Atom "
     "feed exists anywhere on the site (confirmed 2026-08). Same category as Baxtel: browse and cite by hand."},
]

# ---------------------------------------------------------------------------
# ENTITIES
# ---------------------------------------------------------------------------

HYPERSCALERS = {
    "AWS": ["aws", "amazon web services", "amazon"],
    "Microsoft": ["microsoft", "azure"],
    "Google": ["google", "alphabet", "google cloud"],
    "Meta": ["meta", "facebook"],
    "Oracle": ["oracle", "oci"],
    "Apple": ["apple"],
    "ByteDance": ["bytedance", "tiktok"],
    "xAI": ["xai", "x.ai"],
    "OpenAI": ["openai", "stargate"],
    "Anthropic": ["anthropic"],
    # NVIDIA and Tesla lease and build at hyperscale even though neither is a
    # cloud: NVIDIA as anchor tenant/investor, Tesla for its own AI clusters.
    "NVIDIA": ["nvidia"],
    "Tesla": ["tesla", "dojo", "cortex"],
}

NEOCLOUDS = {
    "CoreWeave": ["coreweave"],
    "Nebius": ["nebius"],
    "Lambda": ["lambda labs", "lambda ai"],
    "Crusoe": ["crusoe"],
    "Together AI": ["together ai"],
    "Nscale": ["nscale"],
    "Firmus": ["firmus"],
    "Fluidstack": ["fluidstack"],
    "IREN": ["iren", "iris energy"],
    "Applied Digital": ["applied digital"],
    "Cipher Mining": ["cipher mining"],
    "TeraWulf": ["terawulf"],
    "Galaxy Digital": ["galaxy digital"],
    "Core Scientific": ["core scientific"],
    "Hut 8": ["hut 8"],
    "Voltage Park": ["voltage park"],
    "Vultr": ["vultr"],
    "TensorWave": ["tensorwave"],
    "Groq": ["groq"],
    "Cerebras": ["cerebras"],
    "G42": ["g42"],
    "Humain": ["humain"],
}

OPERATORS = {
    "Vantage": ["vantage data cent", "vantage"],
    "Aligned": ["aligned data cent", "aligned energy", "aligned"],
    "QTS": ["qts"],
    "CyrusOne": ["cyrusone"],
    "STACK": ["stack infrastructure"],
    "Switch": ["switch inc", "switch data", "switch"],
    "EdgeConneX": ["edgeconnex"],
    "Compass": ["compass datacenter", "compass"],
    "DataBank": ["databank"],
    "Equinix": ["equinix"],
    "Digital Realty": ["digital realty"],
    "NTT": ["ntt global", "ntt data cent"],
    "Prime Data Centers": ["prime data cent", "prime"],
    "Yondr": ["yondr"],
    "PowerHouse": ["powerhouse data"],
    "Novva": ["novva"],
    "TierPoint": ["tierpoint"],
    "Flexential": ["flexential"],
    "CloudHQ": ["cloudhq"],
    "T5": ["t5 data centers", "t5dc"],
    "Sabey": ["sabey"],
    "Stream": ["stream data centers"],
    "Tract": ["tract"],
    "Skybox": ["skybox data", "skybox datacenters"],
    "Edged": ["edged"],
    "Cologix": ["cologix"],
    "Ada Infrastructure": ["ada infrastructure"],
    "Corscale": ["corscale"],
    "Global Switch": ["global switch"],
    "STT GDC": ["stt gdc", "st telemedia"],
    "AirTrunk": ["airtrunk"],
    "NEXTDC": ["nextdc"],
    "Iron Mountain": ["iron mountain"],
    "DataVolt": ["datavolt"],
}

POWER_ENTITIES = {
    "ERCOT": ["ercot"], "PJM": ["pjm"], "MISO": ["miso"], "SPP": ["spp"],
    "CAISO": ["caiso"], "NYISO": ["nyiso"], "ISO-NE": ["iso-ne", "iso new england"],
    "Oncor": ["oncor"], "AEP": ["american electric power", "aep"], "PPL": ["ppl electric", "ppl corporation", "ppl"],
    "Dominion": ["dominion energy", "dominion"], "Georgia Power": ["georgia power"],
    "Entergy": ["entergy"], "Duke": ["duke energy"], "Xcel": ["xcel energy"],
    "TVA": ["tennessee valley authority", "tva"], "PUCT": ["puct", "public utility commission of texas"],
    "FERC": ["ferc"],
    "NextEra": ["nextera"], "Constellation": ["constellation energy", "constellation"],
    "Vistra": ["vistra"], "NRG": ["nrg energy", "nrg"], "Talen": ["talen"],
    "GE Vernova": ["ge vernova"], "Westinghouse": ["westinghouse"],
    "Bloom Energy": ["bloom energy"], "Southern Company": ["southern company"],
    "AES": ["aes corporation", "aes corp"],
}

CAPITAL = {
    "Blackstone": ["blackstone"], "KKR": ["kkr"], "Brookfield": ["brookfield"],
    "DigitalBridge": ["digitalbridge"], "GIP": ["global infrastructure partners"],
    "Blue Owl": ["blue owl"], "Apollo": ["apollo global", "apollo management"],
    "Ares": ["ares management"], "Macquarie": ["macquarie"],
    "Silver Lake": ["silver lake"], "Stonepeak": ["stonepeak"],
    "BlackRock": ["blackrock"], "MGX": ["mgx"], "SoftBank": ["softbank"],
    "Partners Group": ["partners group"], "PGIM": ["pgim"],
}

METROS = {
    "Northern Virginia": ["northern virginia", "loudoun", "ashburn", "data center alley", "prince william"],
    "Dallas-Fort Worth": ["dallas", "fort worth", "dfw", "irving", "plano"],
    "West Texas": ["west texas", "permian", "abilene", "midland", "odessa"],
    "East Texas": ["east texas", "tyler texas", "longview texas", "marshall texas"],
    "San Antonio": ["san antonio"],
    "Austin": ["austin"],
    "Atlanta": ["atlanta", "douglas county georgia"],
    "Phoenix": ["phoenix", "mesa arizona", "goodyear arizona"],
    "Chicago": ["chicago", "elk grove"],
    "Columbus": ["columbus ohio", "new albany"],
    "Salt Lake City": ["salt lake"],
    "Silicon Valley": ["santa clara", "san jose"],
    "Hillsboro": ["hillsboro", "portland oregon"],
    "Omaha": ["omaha", "council bluffs"],
    "Richmond": ["richmond virginia", "henrico"],
    "Memphis": ["memphis"],
    "Louisiana": ["louisiana", "richland parish"],
    "Wisconsin": ["mount pleasant wisconsin", "port washington", "wisconsin"],
    "Pennsylvania": ["pennsylvania", "homer city", "berwick", "susquehanna"],
    "Indiana": ["indiana", "new carlisle"],
    "Iowa": ["iowa", "cedar rapids", "altoona"],
    "Nevada": ["reno", "las vegas", "storey county", "nevada"],
    "North Carolina": ["north carolina"],
    "South Carolina": ["south carolina"],
    "Oklahoma": ["oklahoma", "pryor", "stillwater"],
    "Alabama": ["alabama", "huntsville", "bessemer"],
    "Mississippi": ["mississippi", "meridian"],
    "Idaho": ["idaho", "kuna"],
    "Wyoming": ["wyoming", "cheyenne"],
    "Kansas City": ["kansas city"],
    "Michigan": ["michigan", "saline township"],
    "Minnesota": ["minnesota", "rosemount"],
    # International — coarse country/region buckets, not metros. Bare "mexico"
    # is deliberately absent (it would swallow New Mexico), as is bare
    # "ontario" (Ontario, California is a US submarket).
    "Canada": ["canada", "alberta", "quebec", "toronto", "montreal", "calgary"],
    "Mexico": ["queretaro", "querétaro", "monterrey", "mexico city"],
    "UK": ["united kingdom", "london", "slough", "scotland", "wales"],
    "Ireland": ["ireland", "dublin"],
    "Spain": ["spain", "madrid", "aragon", "zaragoza", "barcelona"],
    "Germany": ["germany", "frankfurt", "berlin"],
    "France": ["france", "paris", "marseille"],
    "Netherlands": ["netherlands", "amsterdam"],
    "Italy": ["italy", "milan"],
    "Portugal": ["portugal", "sines"],
    "Nordics": ["norway", "sweden", "finland", "denmark", "iceland", "oslo", "stockholm"],
    "India": ["india", "mumbai", "chennai", "hyderabad", "pune"],
    "Japan": ["japan", "tokyo", "osaka"],
    "South Korea": ["south korea", "seoul"],
    "Singapore": ["singapore"],
    "Malaysia": ["malaysia", "johor", "cyberjaya"],
    "Indonesia": ["indonesia", "jakarta", "batam"],
    "Australia": ["australia", "sydney", "melbourne"],
    "Middle East": ["uae", "abu dhabi", "dubai", "saudi", "riyadh", "neom", "qatar"],
    "Brazil": ["brazil", "sao paulo", "são paulo", "rio de janeiro"],
    "Chile": ["chile", "santiago"],
    "Africa": ["south africa", "johannesburg", "nigeria", "lagos", "kenya", "nairobi", "egypt"],
    "China": ["china", "shanghai", "beijing"],
}

# Metro keys above that are outside the US — used to derive the
# "International" topic flag.
INTL_METROS = {
    "Canada", "Mexico", "UK", "Ireland", "Spain", "Germany", "France",
    "Netherlands", "Italy", "Portugal", "Nordics", "India", "Japan",
    "South Korea", "Singapore", "Malaysia", "Indonesia", "Australia",
    "Middle East", "Brazil", "Chile", "Africa", "China",
}

# ---------------------------------------------------------------------------
# EVENT TYPING
# ---------------------------------------------------------------------------
# Order matters — first match wins. Put the specific above the generic.

EVENT_RULES = [
    # Bare "acquires"/"acquisition of" deliberately absent from M&A — they were
    # swallowing land acquisitions before SITE_ACQUIRED could see them.
    ("PLATFORM_M&A", [
        "to acquire", "merger", "take-private", "takeover",
        "buys stake", "acquires stake", "majority stake", "minority stake",
        "carve-out", "continuation vehicle", "acquires operator",
        "platform acquisition", "acquires competitor",
    ]),
    ("LEASE_SIGNED", [
        "lease", "leasing", "signs lease", "lease with", "lease for", "leases", "leased",
        "leasing agreement", "lease agreement", "preleased", "pre-leased",
        "preleases", "pre-leases", "fully leased", "anchor tenant",
        "take-or-pay", "capacity agreement", "capacity deal", "capacity contract",
        "capacity commitment", "secures capacity", "offtake", "master lease",
        "colocation agreement", "colocation deal", "wholesale agreement",
        "compute agreement", "compute contract", "compute deal", "cloud deal",
        "gpu agreement", "inks deal", "inks lease", "signs deal with",
        "multi-year agreement", "agreement to deliver",
    ]),
    ("TENANT_DISCLOSED", [
        "revealed as tenant", "confirmed as tenant", "named as customer",
        "identified as the tenant", "tenant is", "mystery tenant",
        "unnamed tenant", "tenant revealed", "anchor customer",
    ]),
    ("FINANCING_CLOSED", [
        "closes financing", "financing", "securitization", "abs", "green bond",
        "bond sale", "notes offering", "term loan", "construction loan",
        "debt package", "credit agreement", "credit facility",
        "raises $", "capital raise", "funding round", "series ", "equity investment",
        "investment from", "invests $", "private placement", "recapitalization",
        "data center fund", "infrastructure fund", "ipo",
    ]),
    ("POWER_SECURED", [
        "power purchase agreement", "ppa", "signs ppa", "secures power",
        "power deal", "power agreement", "power contract", "power supply deal",
        "energy deal", "electricity deal", "energization", "energized",
        "behind-the-meter", "behind the meter", "byog",
        "bring your own generation", "nuclear agreement", "nuclear power",
        "smr agreement", "smr", "geothermal", "gas turbines", "gas turbine",
        "on-site generation", "fuel cell",
    ]),
    ("INTERCONNECT_FILED", [
        "interconnection", "grid connection", "large load", "load request",
        "queue position", "transmission line", "transmission upgrade",
        "substation", "curtailment", "controllable load", "grid study",
        "load study", "capacity shortfall", "cesir", "utility approval",
    ]),
    ("SITE_ACQUIRED", [
        "acquires site", "acquires land", "land acquisition", "land purchase",
        "buys land", "purchases land", "purchases site", "secures site",
        "site acquisition", "acres", "powered land", "powered shell",
        "breaks ground", "groundbreaking", "begins construction",
        "starts construction", "construction begins", "rezoning",
        "entitlement", "site selection",
    ]),
    ("DELAY_REPORTED", [
        "delayed", "delay", "paused", "pauses", "on hold", "halted",
        "moratorium", "cancels", "cancelled", "scaled back", "shelved",
        "scraps", "abandons", "withdraws", "withdrawn", "opposition",
        "pushback", "residents oppose", "protest", "rejected", "rejects",
        "blocked", "blocks", "denied permit", "lawsuit", "injunction",
    ]),
    ("EXPANSION_EXERCISED", [
        "expansion", "expands", "phase two", "phase 2", "second phase",
        "phase three", "phase 3", "third phase", "additional capacity",
        "doubles capacity", "exercises option", "second building",
        "additional building", "adds ", "scaling up",
    ]),
    ("CAPACITY_ANNOUNCED", [
        "announces", "unveils", "new campus", "new data center", "to build",
        "will build", "plans", "planning", "proposes", "proposed",
        "development", "data center project", "hyperscale project",
        "ai factory", "gigawatt", "megawatt", "投",
    ]),
]

# ---------------------------------------------------------------------------
# TOPICS — multi-label, orthogonal to event type. An event can be both
# "Leasing & Demand" and "Hyperscale". The collector also derives three
# topics without terms: Hyperscale (entity match), Neocloud & AI Compute
# (entity match), International (metro in INTL_METROS).
# ---------------------------------------------------------------------------

TOPIC_RULES = {
    "Leasing & Demand": [
        "lease", "leasing", "leased", "preleas", "pre-leas", "tenant",
        "colocation", "offtake", "take-or-pay", "absorption", "vacancy",
        "occupancy", "rental rate", "asking rate", "capacity agreement",
        "capacity deal", "demand",
    ],
    "Hyperscale": [
        "hyperscale", "hyperscaler", "cloud giant", "capex", "self-build",
    ],
    "Neocloud & AI Compute": [
        "neocloud", "gpu cloud", "ai cloud", "gpu-as-a-service", "bare metal",
        "training cluster", "inference", "ai factory", "supercomputer",
        "compute capacity", "ai infrastructure",
    ],
    "Power & Grid": [
        "power", "grid", "interconnection", "substation", "transmission",
        "megawatt", "gigawatt", "utility", "ppa", "nuclear", "smr",
        "gas turbine", "generation", "electricity", "curtailment",
        "behind-the-meter", "energization",
    ],
    "Financing & M&A": [
        "financing", "loan", "debt", "bond", "securitization", "raises",
        "funding", "acquisition", "merger", "stake", "valuation",
        "investment", "fund", "ipo", "equity",
    ],
    "Land & Construction": [
        "land", "acres", "site", "construction", "breaks ground",
        "groundbreaking", "zoning", "rezoning", "entitlement", "permit",
        "campus", "powered shell", "build-out",
    ],
    "Chips & Hardware": [
        "gpu", "chip", "semiconductor", "accelerator", "nvidia", "blackwell",
        "rubin", "hbm", "tpu", "trainium", "asic", "rack density", "server",
        "networking", "optical",
    ],
    "Policy & Community": [
        "moratorium", "opposition", "tax", "incentive", "abatement",
        "regulation", "rulemaking", "legislation", "ordinance", "community",
        "residents", "lawsuit", "tariff",
    ],
    "Cooling & Water": [
        "cooling", "liquid cooling", "water", "immersion", "chiller",
        "heat reuse", "waste heat",
    ],
}

# ---------------------------------------------------------------------------
# SIGNAL DICTIONARIES — presence flags, not event types
# ---------------------------------------------------------------------------

CAPACITY_SIGNALS = {
    "mw_it": ["mw it", "it load", "critical it", "critical load", "it capacity"],
    "mw_gross": ["gross mw", "total mw", "utility capacity", "connected load"],
    "live": ["live", "operational", "commissioned", "in service", "energized", "rcd", "ready for service"],
    "under_construction": ["under construction", "u/c", "being built", "topping out"],
    "planned": ["planned", "proposed", "pipeline", "entitled", "permitted"],
    "density": ["kw per rack", "kw/rack", "rack density", "high density"],
    "cooling": ["liquid cooling", "direct-to-chip", "dlc", "immersion", "rear door", "cdu", "air cooled"],
    "redundancy": ["n+1", "2n", "tier iii", "tier iv", "concurrently maintainable"],
}

COMMERCIAL_SIGNALS = {
    "prelease": ["preleased", "pre-leased", "precommitted", "pre-committed", "committed capacity"],
    "term": ["year lease", "-year term", "lease term", "walt", "weighted average lease"],
    "pricing": ["per kw", "kw/month", "kw per month", "rental rate", "asking rate", "escalator"],
    "guarantee": ["parent guarantee", "corporate guarantee", "parent company guarantee",
                  "letter of credit", "loc", "security deposit", "credit support",
                  "opco", "special purpose", "bankruptcy remote", "backstop"],
    "options": ["right of first refusal", "rofr", "rofo", "expansion right", "option to lease"],
    "structure": ["take-or-pay", "triple net", "nnn", "powered shell lease", "turnkey"],
}

POWER_SIGNALS = {
    "queue": ["queue", "interconnection request", "study phase", "facilities study"],
    "contracted": ["contracted capacity", "secured power", "power agreement", "load letter"],
    "constraint": ["constrained", "congestion", "curtailment", "capacity limit", "no available power"],
    "generation": ["gas turbine", "nuclear", "smr", "solar", "battery", "bess", "fuel cell", "wind"],
    "water": ["water usage", "wue", "water permit", "cooling water", "aquifer"],
    "policy": ["tax abatement", "incentive", "chapter 313", "chapter 403", "moratorium", "tariff"],
}

# Terms that mean "this is marketing, not intelligence" — drop the item.
NOISE = [
    "webinar", "white paper", "podcast", "sponsored", "advertorial", "job listing",
    "career opportunities", "appoints", "names new", "wins award", "award winner",
    "top 10", "predictions for", "opinion:", "commentary:", "how to choose",
    "product launch", "announces partnership with reseller", "conference", "summit",
]

# Relevance weights — used to rank, not to filter.
WEIGHTS = {
    "quantity_mw": 4.0,      # a real MW figure is the strongest signal
    "quantity_money": 2.5,
    "hyperscaler": 3.0,
    "neocloud": 3.5,         # weighted above hyperscalers: thinner credit, higher info value
    "operator": 2.5,
    "power_entity": 2.0,
    "capital": 2.0,
    "metro": 1.5,
    "guarantee_signal": 5.0,  # rarely disclosed; when it is, it matters most
    "prelease_signal": 3.0,
    "event_specific": 2.0,    # non-generic event type
}


# ---------------------------------------------------------------------------
# AMBIGUOUS TERMS
# ---------------------------------------------------------------------------
# Ordinary English words that are also company names. These only count when
# they appear capitalised in the source text, so "the project is aligned with"
# does not register as Aligned Data Centers.

AMBIGUOUS_TERMS = {
    "vantage", "aligned", "switch", "compass", "prime", "stack infrastructure",
    "meta", "apple", "oracle", "lambda", "together ai", "galaxy digital",
    "dominion", "ares management", "spp", "loc",
    # a tract of land / edged out / constellation of / cortex / streaming
    "tract", "edged", "constellation", "cortex", "stream data centers",
    "tesla",  # Tesla coil contexts are rare, but keep the capitalisation gate
}
