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
    {"name": "Data Center Planet", "short": "DCP",
     "url": "https://datacenterplanet.com/feed/",
     "fallback": "https://datacenterplanet.com/"},
    {"name": "Utility Dive", "short": "UD",
     "url": "https://www.utilitydive.com/feeds/news/",
     "fallback": "https://www.utilitydive.com/"},
]

# Manual-only. Licensed / compiled-database sources. NEVER automate against
# these — cite and link by hand.
MANUAL_SOURCES = [
    {"name": "DC Byte", "why": "Subscription market intelligence. The compiled dataset is the product."},
    {"name": "Baxtel", "why": "Compiled facility database. Bulk extraction is against terms; check for an API."},
    {"name": "CBRE / JLL / Cushman", "why": "Free summary reports may be cited; subscription products may not."},
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
}

POWER_ENTITIES = {
    "ERCOT": ["ercot"], "PJM": ["pjm"], "MISO": ["miso"], "SPP": ["spp"],
    "CAISO": ["caiso"], "NYISO": ["nyiso"], "ISO-NE": ["iso-ne", "iso new england"],
    "Oncor": ["oncor"], "AEP": ["american electric power", "aep"],
    "Dominion": ["dominion energy", "dominion"], "Georgia Power": ["georgia power"],
    "Entergy": ["entergy"], "Duke": ["duke energy"], "Xcel": ["xcel energy"],
    "TVA": ["tennessee valley authority", "tva"], "PUCT": ["puct", "public utility commission of texas"],
    "FERC": ["ferc"],
}

CAPITAL = {
    "Blackstone": ["blackstone"], "KKR": ["kkr"], "Brookfield": ["brookfield"],
    "DigitalBridge": ["digitalbridge"], "GIP": ["global infrastructure partners"],
    "Blue Owl": ["blue owl"], "Apollo": ["apollo global", "apollo management"],
    "Ares": ["ares management"], "Macquarie": ["macquarie"],
    "Silver Lake": ["silver lake"], "Stonepeak": ["stonepeak"],
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
    "Wisconsin": ["mount pleasant wisconsin", "port washington"],
}

# ---------------------------------------------------------------------------
# EVENT TYPING
# ---------------------------------------------------------------------------
# Order matters — first match wins. Put the specific above the generic.

EVENT_RULES = [
    ("PLATFORM_M&A", [
        "acquires", "acquisition of", "to acquire", "merger", "take-private",
        "buys stake", "majority stake", "carve-out", "continuation vehicle",
    ]),
    ("FINANCING_CLOSED", [
        "closes financing", "securitization", "abs", "green bond", "term loan",
        "construction loan", "raises $", "funding round", "series ", "credit facility",
        "private placement", "notes offering", "recapitalization",
    ]),
    ("LEASE_SIGNED", [
        "signs lease", "leases", "leasing agreement", "preleased", "pre-leased",
        "fully leased", "anchor tenant", "take-or-pay", "capacity agreement",
        "offtake", "master lease", "colocation agreement", "wholesale agreement",
    ]),
    ("TENANT_DISCLOSED", [
        "revealed as tenant", "confirmed as tenant", "named as customer",
        "identified as the tenant", "tenant is",
    ]),
    ("POWER_SECURED", [
        "power purchase agreement", "ppa", "secures power", "energization",
        "energized", "behind-the-meter", "behind the meter", "byog",
        "bring your own generation", "nuclear agreement", "smr agreement",
        "gas turbines", "on-site generation", "fuel cell",
    ]),
    ("INTERCONNECT_FILED", [
        "interconnection", "large load", "queue position", "transmission line",
        "substation", "curtailment", "controllable load", "grid study",
        "load study", "capacity shortfall", "cesir",
    ]),
    ("SITE_ACQUIRED", [
        "acquires site", "land purchase", "acres", "powered land", "powered shell",
        "breaks ground", "groundbreaking", "rezoning", "entitlement", "site selection",
        "purchases land",
    ]),
    ("DELAY_REPORTED", [
        "delayed", "delay", "paused", "halted", "moratorium", "cancels", "cancelled",
        "scaled back", "shelved", "opposition", "rejected", "denied permit",
        "lawsuit", "injunction",
    ]),
    ("EXPANSION_EXERCISED", [
        "expansion", "expands", "phase two", "phase 2", "additional capacity",
        "exercises option", "second building", "adds ", "scaling up",
    ]),
    ("CAPACITY_ANNOUNCED", [
        "announces", "unveils", "new campus", "new data center", "to build",
        "plans", "development", "gigawatt", "megawatt", "投",
    ]),
]

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
}
