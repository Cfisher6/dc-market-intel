/* Renders the events dashboard from window.DC_FEED, and owns the
   Dashboard/Research view switcher. No framework, no build step.

   Interaction model: every breakdown bar and tag chip is a filter. Clicking a
   counterparty anywhere opens its profile card. Rows expand to full detail.
   Pins persist in localStorage. The filtered set exports to CSV, and the
   current view serializes to the URL query string for sharing. */
(function () {
  "use strict";

  var F = window.DC_FEED;

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  var el = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return n == null ? "—" : n.toLocaleString("en-US"); };

  var EVENT_TYPE_LABEL = {
    "PLATFORM_M&A": "Platform M&A",
    "FINANCING_CLOSED": "Financing closed",
    "LEASE_SIGNED": "Lease signed",
    "TENANT_DISCLOSED": "Tenant disclosed",
    "POWER_SECURED": "Power secured",
    "INTERCONNECT_FILED": "Interconnect filed",
    "SITE_ACQUIRED": "Site acquired",
    "INCENTIVE_APPROVED": "Incentive approved",
    "INCENTIVE_REVOKED": "Incentive revoked",
    "DELAY_REPORTED": "Delay reported",
    "EXPANSION_EXERCISED": "Expansion exercised",
    "CAPACITY_ANNOUNCED": "Capacity announced",
    "OTHER": "Other"
  };
  var EVENT_TYPE_COLOR = {
    "PLATFORM_M&A": "red",
    "FINANCING_CLOSED": "green",
    "LEASE_SIGNED": "green",
    "TENANT_DISCLOSED": "neutral",
    "POWER_SECURED": "amber",
    "INTERCONNECT_FILED": "amber",
    "SITE_ACQUIRED": "ink",
    "INCENTIVE_APPROVED": "green",
    "INCENTIVE_REVOKED": "red",
    "DELAY_REPORTED": "red",
    "EXPANSION_EXERCISED": "green",
    "CAPACITY_ANNOUNCED": "neutral",
    "OTHER": "neutral"
  };
  var MW_BUCKETS = [0, 50, 100, 250, 500, 1000, 5000];
  var MONEY_BUCKETS = [0, 10, 50, 250, 1000, 10000]; // $M
  var SCORE_BUCKETS = [0, 4, 6, 8, 10];

  var PIN_KEY = "dc_pins";

  /* Metro centroids for the activity map. Keys must match ontology METROS.
     A metro missing here still works everywhere else — it just doesn't plot,
     and the map note counts it as unmapped. */
  var METRO_COORDS = {
    "Northern Virginia": [39.04, -77.49],
    "Dallas-Fort Worth": [32.78, -97.04],
    "West Texas": [32.45, -99.74],
    "East Texas": [32.35, -94.87],
    "San Antonio": [29.42, -98.49],
    "Austin": [30.27, -97.74],
    "Atlanta": [33.75, -84.39],
    "Phoenix": [33.45, -112.07],
    "Chicago": [41.88, -87.63],
    "Columbus": [39.96, -83.00],
    "Salt Lake City": [40.76, -111.89],
    "Silicon Valley": [37.35, -121.95],
    "Hillsboro": [45.52, -122.99],
    "Omaha": [41.26, -95.93],
    "Richmond": [37.54, -77.44],
    "Memphis": [35.15, -90.05],
    "Louisiana": [32.35, -91.75],
    "Wisconsin": [42.72, -87.85],
    "Pennsylvania": [40.9, -77.8],
    "Indiana": [40.3, -86.1],
    "Iowa": [42.0, -93.5],
    "Nevada": [38.8, -116.4],
    "North Carolina": [35.5, -79.4],
    "South Carolina": [33.9, -80.9],
    "Oklahoma": [35.5, -97.5],
    "Alabama": [32.8, -86.8],
    "Mississippi": [32.7, -89.7],
    "Idaho": [43.6, -116.2],
    "Wyoming": [41.14, -104.82],
    "Kansas City": [39.1, -94.58],
    "Michigan": [42.3, -83.7],
    "Minnesota": [44.8, -93.1],
    "Canada": [43.65, -79.38],
    "Mexico": [20.59, -100.39],
    "UK": [51.5, -0.12],
    "Ireland": [53.35, -6.26],
    "Spain": [40.42, -3.70],
    "Germany": [50.11, 8.68],
    "France": [48.86, 2.35],
    "Netherlands": [52.37, 4.90],
    "Italy": [45.46, 9.19],
    "Portugal": [38.7, -9.1],
    "Nordics": [59.33, 18.07],
    "India": [19.08, 72.88],
    "Japan": [35.68, 139.69],
    "South Korea": [37.57, 126.98],
    "Singapore": [1.35, 103.82],
    "Malaysia": [1.49, 103.74],
    "Indonesia": [-6.2, 106.85],
    "Australia": [-33.87, 151.21],
    "Middle East": [24.47, 54.37],
    "Brazil": [-23.55, -46.63],
    "Chile": [-33.45, -70.67],
    "Africa": [-26.20, 28.05],
    "China": [31.23, 121.47]
  };

  /* Lifecycle stages for the pipeline board, built from the event types the
     collector already assigns. Order = a project's rough path to revenue. */
  var PIPELINE = [
    { label: "Site control", types: ["SITE_ACQUIRED"] },
    { label: "Interconnection", types: ["INTERCONNECT_FILED"] },
    { label: "Power secured", types: ["POWER_SECURED"] },
    { label: "Capacity announced", types: ["CAPACITY_ANNOUNCED", "EXPANSION_EXERCISED"] },
    { label: "Commercial", types: ["LEASE_SIGNED", "TENANT_DISCLOSED"] },
    { label: "Capital", types: ["FINANCING_CLOSED", "PLATFORM_M&A"] }
  ];

  function typeLabel(t) { return EVENT_TYPE_LABEL[t] || t; }
  function typeColor(t) { return EVENT_TYPE_COLOR[t] || "neutral"; }

  function mwOf(ev) {
    var mw = ev.quantities && ev.quantities.mw_campus;
    return mw && mw.length ? Math.max.apply(null, mw) : null;
  }
  function aggMwOf(ev) {
    var mw = ev.quantities && ev.quantities.mw_aggregate;
    return mw && mw.length ? Math.max.apply(null, mw) : null;
  }
  function moneyOf(ev) {
    var m = ev.quantities && ev.quantities.money_musd;
    return m && m.length ? Math.max.apply(null, m) : null;
  }
  function moneyLabel(v) {
    if (v == null) return "—";
    // Values are $M. Roll up past a billion so cumulative sums don't render
    // as "$1050.0B".
    if (v >= 1e6) return "$" + (v / 1e6).toFixed(1) + "T";
    return v >= 1000 ? "$" + (v / 1000).toFixed(1) + "B" : "$" + fmt(Math.round(v)) + "M";
  }
  function parties(ev) {
    return [].concat(ev.hyperscalers || [], ev.neoclouds || [], ev.operators || [], ev.capital || []);
  }
  function uniqueSorted(arr) {
    var seen = {}, out = [];
    arr.forEach(function (v) { if (v && !seen[v]) { seen[v] = 1; out.push(v); } });
    return out.sort();
  }
  function srcLink(url, label) {
    if (!url) return esc(label || "");
    return '<a class="src-inline" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(label || "source") + "</a>";
  }
  function firstSeen(ev) { return ev.first_seen || ev.date || ""; }
  /* Schema 2 renamed `score` -> `relevance_score`. Fall back so archived
     records written before scripts/backfill_schema.py ran still render. */
  function scoreOf(ev) {
    return ev.relevance_score != null ? ev.relevance_score : (ev.score != null ? ev.score : 0);
  }

  function loadPins() {
    try { return JSON.parse(localStorage.getItem(PIN_KEY)) || {}; }
    catch (e) { return {}; }
  }
  function savePins(p) {
    try { localStorage.setItem(PIN_KEY, JSON.stringify(p)); } catch (e) { /* private mode */ }
  }

  if (!F || !F.events) {
    var dash = el("view-dashboard");
    if (dash) dash.innerHTML = '<div class="wrap"><p style="padding:40px 0">data/feed.js failed to load — run scripts/collect.py.</p></div>';
  } else {
    initDashboard(F);
  }

  function initDashboard(F) {
    var events = F.events;
    var latestRun = (F.generated || "").slice(0, 10);
    var pins = loadPins();
    var expanded = {}; // event id -> bool

    var DEFAULTS = { type: "", topic: "", party: "", metro: "", power: "", mwMin: 0, moneyMin: 0, scoreMin: 0,
                     from: "", to: "", q: "", newOnly: false, pinnedOnly: false, sort: "score", dir: "desc" };
    var state = readStateFromURL();

    /* --- party -> kind, derived from event membership ---------------------- */
    var partyKindMap = {};
    events.forEach(function (ev) {
      (ev.hyperscalers || []).forEach(function (p) { partyKindMap[p] = partyKindMap[p] || "hyperscaler"; });
      (ev.neoclouds || []).forEach(function (p) { partyKindMap[p] = partyKindMap[p] || "neocloud"; });
      (ev.operators || []).forEach(function (p) { partyKindMap[p] = partyKindMap[p] || "operator"; });
      (ev.capital || []).forEach(function (p) { partyKindMap[p] = partyKindMap[p] || "capital"; });
    });

    /* --- source health ----------------------------------------------------- */
    var ok = F.sources.filter(function (r) { return r.ok; });
    var bad = F.sources.filter(function (r) { return !r.ok; });
    el("dash-source-health").textContent =
      "Sources: " + ok.length + "/" + F.sources.length + " feeds ok" +
      (bad.length ? " — " + bad.map(function (r) { return r.source; }).join(", ") + " failed" : "") +
      ". Last run " + latestRun + ".";

    /* --- filter option lists ----------------------------------------------- */
    var allTypes = uniqueSorted(events.map(function (e) { return e.event_type; }));
    var allTopics = uniqueSorted(events.reduce(function (a, e) { return a.concat(e.topics || []); }, []));
    var allParties = uniqueSorted(events.reduce(function (a, e) { return a.concat(parties(e)); }, []));
    var allMetros = uniqueSorted(events.reduce(function (a, e) { return a.concat(e.metros || []); }, []));
    var allPower = uniqueSorted(events.reduce(function (a, e) { return a.concat(e.power_entities || []); }, []));

    renderFilters(allTypes, allTopics, allParties, allMetros, allPower);
    renderToolbar();
    syncControls();
    rerender();

    /* --- matching / sorting ------------------------------------------------ */
    function haystack(ev) {
      return (ev.title + " " + parties(ev).join(" ") + " " + (ev.metros || []).join(" ") + " " +
              (ev.power_entities || []).join(" ")).toLowerCase();
    }
    function matches(ev) {
      if (state.type && ev.event_type !== state.type) return false;
      if (state.topic && (ev.topics || []).indexOf(state.topic) === -1) return false;
      if (state.party && parties(ev).indexOf(state.party) === -1) return false;
      if (state.metro && (ev.metros || []).indexOf(state.metro) === -1) return false;
      if (state.power && (ev.power_entities || []).indexOf(state.power) === -1) return false;
      if (state.mwMin) { var mw = mwOf(ev); if (!mw || mw < state.mwMin) return false; }
      if (state.moneyMin) { var mo = moneyOf(ev); if (!mo || mo < state.moneyMin) return false; }
      if (state.scoreMin && scoreOf(ev) < state.scoreMin) return false;
      if (state.from && (!ev.date || ev.date < state.from)) return false;
      if (state.to && (!ev.date || ev.date > state.to)) return false;
      if (state.newOnly && firstSeen(ev) !== latestRun) return false;
      if (state.pinnedOnly && !pins[ev.id]) return false;
      if (state.q && haystack(ev).indexOf(state.q) === -1) return false;
      return true;
    }

    function sortList(list) {
      var key = state.sort, dir = state.dir === "asc" ? 1 : -1;
      return list.slice().sort(function (a, b) {
        var av, bv;
        if (key === "date") { av = a.date || ""; bv = b.date || ""; }
        else if (key === "first_seen") { av = firstSeen(a); bv = firstSeen(b); }
        else if (key === "mw") { av = mwOf(a) || 0; bv = mwOf(b) || 0; }
        else if (key === "money") { av = moneyOf(a) || 0; bv = moneyOf(b) || 0; }
        else if (key === "event_type") { av = typeLabel(a.event_type); bv = typeLabel(b.event_type); }
        else if (key === "parties") { av = parties(a).join(); bv = parties(b).join(); }
        else if (key === "metro") { av = (a.metros || []).join(); bv = (b.metros || []).join(); }
        else if (key === "source") { av = a.source; bv = b.source; }
        else { av = scoreOf(a); bv = scoreOf(b); }
        if (av < bv) return -1 * dir;
        if (av > bv) return 1 * dir;
        return 0;
      });
    }

    function rerender() {
      var filtered = sortList(events.filter(matches));
      renderSummary(filtered);
      renderTimeline(filtered);
      renderMap(filtered);
      renderPipeline(filtered);
      renderBreakdowns(filtered);
      renderDirectory();
      renderActiveChips();
      renderEntityCard();
      renderTable(filtered);
    }

    /* --- state <-> URL ----------------------------------------------------- */
    function readStateFromURL() {
      var s = {};
      for (var k in DEFAULTS) s[k] = DEFAULTS[k];
      try {
        var p = new URLSearchParams(location.search);
        if (p.get("type")) s.type = p.get("type");
        if (p.get("topic")) s.topic = p.get("topic");
        if (p.get("party")) s.party = p.get("party");
        if (p.get("metro")) s.metro = p.get("metro");
        if (p.get("power")) s.power = p.get("power");
        if (p.get("mw")) s.mwMin = Number(p.get("mw")) || 0;
        if (p.get("money")) s.moneyMin = Number(p.get("money")) || 0;
        if (p.get("scoremin")) s.scoreMin = Number(p.get("scoremin")) || 0;
        if (p.get("from")) s.from = p.get("from");
        if (p.get("to")) s.to = p.get("to");
        if (p.get("q")) s.q = p.get("q").toLowerCase();
        if (p.get("new") === "1") s.newOnly = true;
        if (p.get("sort")) s.sort = p.get("sort");
        if (p.get("dir")) s.dir = p.get("dir");
      } catch (e) { /* old browser: defaults */ }
      return s;
    }
    function viewURL() {
      var base = location.href.split("?")[0].split("#")[0];
      var p = [];
      function add(k, v) { p.push(k + "=" + encodeURIComponent(v)); }
      if (state.type) add("type", state.type);
      if (state.topic) add("topic", state.topic);
      if (state.party) add("party", state.party);
      if (state.metro) add("metro", state.metro);
      if (state.power) add("power", state.power);
      if (state.mwMin) add("mw", state.mwMin);
      if (state.moneyMin) add("money", state.moneyMin);
      if (state.scoreMin) add("scoremin", state.scoreMin);
      if (state.from) add("from", state.from);
      if (state.to) add("to", state.to);
      if (state.q) add("q", state.q);
      if (state.newOnly) add("new", "1");
      if (state.sort !== "score") add("sort", state.sort);
      if (state.dir !== "desc") add("dir", state.dir);
      return p.length ? base + "?" + p.join("&") : base;
    }

    /* --- filter bar --------------------------------------------------------- */
    function renderFilters(types, topics, partiesList, metros, powerEntities) {
      function opts(list, allLabel, labelFn) {
        return '<option value="">' + allLabel + "</option>" + list.map(function (v) {
          return '<option value="' + esc(v) + '">' + esc(labelFn ? labelFn(v) : v) + "</option>";
        }).join("");
      }
      el("dash-filters").innerHTML =
        '<select id="f-topic" aria-label="Topic">' + opts(topics, "All topics") + "</select>" +
        '<select id="f-type" aria-label="Event type">' + opts(types, "All types", typeLabel) + "</select>" +
        '<select id="f-party" aria-label="Customer / party">' + opts(partiesList, "All parties") + "</select>" +
        '<select id="f-metro" aria-label="Location">' + opts(metros, "All locations") + "</select>" +
        '<select id="f-power" aria-label="Power entity">' + opts(powerEntities, "All power entities") + "</select>" +
        '<select id="f-mw" aria-label="Minimum MW">' +
          MW_BUCKETS.map(function (v) { return '<option value="' + v + '">' + (v === 0 ? "Any MW" : v.toLocaleString() + "+ MW") + "</option>"; }).join("") +
        "</select>" +
        '<select id="f-money" aria-label="Minimum deal size">' +
          MONEY_BUCKETS.map(function (v) { return '<option value="' + v + '">' + (v === 0 ? "Any $" : moneyLabel(v) + "+") + "</option>"; }).join("") +
        "</select>" +
        '<select id="f-score" aria-label="Minimum score">' +
          SCORE_BUCKETS.map(function (v) { return '<option value="' + v + '">' + (v === 0 ? "Any score" : "Score " + v + "+") + "</option>"; }).join("") +
        "</select>" +
        '<input id="f-from" type="date" aria-label="From date" title="From date">' +
        '<input id="f-to" type="date" aria-label="To date" title="To date">' +
        '<input id="f-q" type="search" placeholder="Search headlines &amp; tags…" aria-label="Search headlines and tags">' +
        '<select id="f-sort" aria-label="Sort by">' +
          '<option value="score">Sort: Score</option>' +
          '<option value="date">Sort: Date</option>' +
          '<option value="first_seen">Sort: Newest found</option>' +
          '<option value="mw">Sort: MW</option>' +
          '<option value="money">Sort: Deal size</option>' +
        "</select>" +
        '<button id="f-reset" type="button">Reset</button>';

      function bind(id, key, parse) {
        el(id).addEventListener("change", function () {
          state[key] = parse ? parse(this.value) : this.value;
          rerender();
        });
      }
      bind("f-topic", "topic");
      bind("f-type", "type");
      bind("f-party", "party");
      bind("f-metro", "metro");
      bind("f-power", "power");
      bind("f-mw", "mwMin", Number);
      bind("f-money", "moneyMin", Number);
      bind("f-score", "scoreMin", Number);
      bind("f-from", "from");
      bind("f-to", "to");
      bind("f-sort", "sort");
      el("f-q").addEventListener("input", function () {
        state.q = this.value.trim().toLowerCase();
        rerender();
      });
      el("f-reset").addEventListener("click", function () {
        for (var k in DEFAULTS) state[k] = DEFAULTS[k];
        syncControls();
        rerender();
      });
    }

    /* --- toolbar: toggles + export + share ---------------------------------- */
    function renderToolbar() {
      el("dash-toolbar").innerHTML =
        '<label class="tog"><input type="checkbox" id="f-new"> New this run</label>' +
        '<label class="tog"><input type="checkbox" id="f-pinned"> Pinned only</label>' +
        '<span class="toolbar-spacer"></span>' +
        '<button id="f-csv" type="button" title="Download the filtered set as CSV">Export CSV</button>' +
        '<button id="f-share" type="button" title="Copy a link that reopens this exact view">Copy view link</button>';

      el("f-new").addEventListener("change", function () { state.newOnly = this.checked; rerender(); });
      el("f-pinned").addEventListener("change", function () { state.pinnedOnly = this.checked; rerender(); });
      el("f-csv").addEventListener("click", exportCSV);
      el("f-share").addEventListener("click", function () {
        var url = viewURL();
        var btn = this;
        function done() {
          btn.textContent = "Copied ✓";
          setTimeout(function () { btn.textContent = "Copy view link"; }, 1600);
        }
        if (navigator.clipboard && navigator.clipboard.writeText) {
          navigator.clipboard.writeText(url).then(done, function () { window.prompt("Copy this link:", url); });
        } else {
          window.prompt("Copy this link:", url);
        }
      });
    }

    function syncControls() {
      el("f-topic").value = state.topic;
      el("f-type").value = state.type;
      el("f-party").value = state.party;
      el("f-metro").value = state.metro;
      el("f-power").value = state.power;
      el("f-mw").value = String(state.mwMin);
      el("f-money").value = String(state.moneyMin);
      el("f-score").value = String(state.scoreMin);
      el("f-from").value = state.from;
      el("f-to").value = state.to;
      el("f-q").value = state.q;
      el("f-sort").value = ["score", "date", "first_seen", "mw", "money"].indexOf(state.sort) >= 0 ? state.sort : "score";
      el("f-new").checked = state.newOnly;
      el("f-pinned").checked = state.pinnedOnly;
    }

    /* --- one place to change a filter from anywhere -------------------------- */
    function setFilter(key, value) {
      state[key] = state[key] === value ? (typeof DEFAULTS[key] === "number" ? 0 : "") : value; // click again = clear
      syncControls();
      rerender();
    }

    /* --- KPI cards (reflect current filter) ---------------------------------- */
    function renderSummary(filtered) {
      var mwSum = 0, moneySum = 0, newCount = 0;
      filtered.forEach(function (ev) {
        mwSum += mwOf(ev) || 0;
        moneySum += moneyOf(ev) || 0;
        if (firstSeen(ev) === latestRun) newCount++;
      });
      el("dash-summary").innerHTML = '<div class="metrics">' +
        metric("Events", fmt(filtered.length) + (filtered.length !== events.length ? " of " + fmt(events.length) : ""),
               filtered.length !== events.length ? "Matching current filters" : "Accumulated across all collector runs") +
        metric("Announced MW", mwSum ? fmt(Math.round(mwSum)) : "—",
               "Σ of each event's largest campus figure — announced, not verified; may double-count re-announcements") +
        metric("Disclosed value", moneySum ? moneyLabel(moneySum) : "—",
               "Σ of disclosed deal / project figures in the filtered set") +
        metric("New this run", fmt(newCount), "First seen " + latestRun) +
        "</div>";
    }
    function metric(label, value, note) {
      return '<div class="metric"><div class="metric-label">' + esc(label) + '</div>' +
        '<div class="metric-value">' + esc(value) + '</div>' +
        (note ? '<div class="metric-note">' + esc(note) + '</div>' : "") + '</div>';
    }

    /* --- weekly activity timeline -------------------------------------------- */
    function weekOf(dateStr) {
      // Monday of the ISO week containing dateStr.
      var d = new Date(dateStr + "T00:00:00Z");
      if (isNaN(d)) return null;
      var day = (d.getUTCDay() + 6) % 7; // Mon=0
      d.setUTCDate(d.getUTCDate() - day);
      return d.toISOString().slice(0, 10);
    }
    function renderTimeline(filtered) {
      var byWeek = {};
      filtered.forEach(function (ev) {
        var w = ev.date ? weekOf(ev.date) : null;
        if (!w) return;
        var r = byWeek[w] || (byWeek[w] = { n: 0, mw: 0 });
        r.n += 1;
        r.mw += mwOf(ev) || 0;
      });
      var weeks = Object.keys(byWeek).sort();
      if (weeks.length < 2) { el("dash-timeline").innerHTML = ""; return; }

      // fill gaps so the x-axis is continuous
      var run = [], cur = weeks[0], last = weeks[weeks.length - 1];
      while (cur <= last) {
        run.push(cur);
        var d = new Date(cur + "T00:00:00Z");
        d.setUTCDate(d.getUTCDate() + 7);
        cur = d.toISOString().slice(0, 10);
        if (run.length > 120) break; // safety
      }

      function chart(title, valFn, unit) {
        var vals = run.map(function (w) { return byWeek[w] ? valFn(byWeek[w]) : 0; });
        var max = Math.max.apply(null, vals.concat([1]));
        var lastMonth = "";
        var cols = run.map(function (w, i) {
          var v = vals[i];
          var month = w.slice(0, 7);
          var lab = "";
          if (month !== lastMonth) {
            lastMonth = month;
            lab = new Date(w + "T00:00:00Z").toLocaleString("en-US", { month: "short", timeZone: "UTC" });
          }
          return '<div class="tl-col" title="Week of ' + esc(w) + " — " + fmt(Math.round(v)) + (unit ? " " + unit : "") + '">' +
            '<div class="tl-fill" style="height:' + Math.max((v / max) * 100, v > 0 ? 3 : 0) + '%"></div>' +
            '<div class="tl-lab">' + lab + "</div></div>";
        }).join("");
        return '<div class="tl-card"><h3>' + esc(title) + '</h3><div class="tl-chart">' + cols + "</div></div>";
      }

      el("dash-timeline").innerHTML =
        chart("Events per week", function (r) { return r.n; }) +
        chart("Announced MW per week", function (r) { return r.mw; }, "MW");
    }

    /* --- activity map (metro-level, click a bubble to filter) ------------------ */
    // Declaration only — no initializer. The first rerender() runs before this
    // line, and `var x = null` here would clobber the map it already created.
    var mapObj, mapLayer, mapFitted;
    function renderMap(filtered) {
      var box = el("dash-map");
      if (!box) return;
      if (typeof L === "undefined") { box.hidden = true; return; } // offline: map is optional
      box.hidden = false;
      if (!mapObj) {
        mapObj = L.map("map-canvas", { scrollWheelZoom: false }).setView([38.5, -96.5], 4);
        L.tileLayer("https://tile.openstreetmap.org/{z}/{x}/{y}.png", {
          maxZoom: 10,
          attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
        }).addTo(mapObj);
        mapLayer = L.layerGroup().addTo(mapObj);
      }
      var byMetro = {}, unmapped = 0, untagged = 0;
      filtered.forEach(function (ev) {
        var ms = ev.metros || [];
        if (!ms.length) { untagged++; return; }
        ms.forEach(function (m) {
          if (!METRO_COORDS[m]) { unmapped++; return; }
          var r = byMetro[m] || (byMetro[m] = { n: 0, mw: 0 });
          r.n += 1;
          r.mw += mwOf(ev) || 0;
        });
      });
      mapLayer.clearLayers();
      Object.keys(byMetro).forEach(function (m) {
        var r = byMetro[m];
        var active = state.metro === m;
        var radius = Math.max(7, Math.min(30, 5 + Math.sqrt(r.mw + 1) / 3 + r.n));
        var c = L.circleMarker(METRO_COORDS[m], {
          radius: radius,
          color: active ? "#C2453A" : "#131A22",
          fillColor: active ? "#C2453A" : "#131A22",
          fillOpacity: 0.55,
          weight: 1.5
        });
        c.bindTooltip("<strong>" + esc(m) + "</strong><br>" + fmt(r.n) + " event(s)" +
          (r.mw ? "<br>" + fmt(Math.round(r.mw)) + " MW announced" : "") +
          "<br><em>Click to " + (active ? "clear filter" : "filter") + "</em>");
        c.on("click", function () { setFilter("metro", m); });
        c.addTo(mapLayer);
      });
      // Fit once, on the first render with data — after that the viewport is
      // the user's to control; refitting on every filter click is disorienting.
      if (!mapFitted) {
        var pts = Object.keys(byMetro).map(function (m) { return METRO_COORDS[m]; });
        if (pts.length > 1) { mapObj.fitBounds(pts, { padding: [30, 30], maxZoom: 5 }); mapFitted = true; }
        else if (pts.length === 1) { mapObj.setView(pts[0], 5); mapFitted = true; }
      }
      el("map-note").textContent =
        "Metro-level activity from location tags — not facility coordinates. " +
        (untagged ? fmt(untagged) + " of " + fmt(filtered.length) + " filtered events carry no tagged metro (international or untagged). " : "") +
        "Bubble size blends event count and announced MW.";
    }

    /* --- development pipeline board -------------------------------------------- */
    function renderPipeline(filtered) {
      var cols = PIPELINE.map(function (stage) {
        var evs = filtered.filter(function (ev) { return stage.types.indexOf(ev.event_type) >= 0; });
        var mw = 0, money = 0;
        evs.forEach(function (ev) { mw += mwOf(ev) || 0; money += moneyOf(ev) || 0; });
        var typeRows = stage.types.map(function (t) {
          var n = evs.filter(function (ev) { return ev.event_type === t; }).length;
          if (!n) return "";
          return '<div class="pl-type bd-click' + (state.type === t ? " bd-active" : "") +
            '" role="button" tabindex="0" data-fkey="type" data-fval="' + esc(t) + '">' +
            '<span class="pill pill-' + typeColor(t) + '">' + esc(typeLabel(t)) + "</span>" +
            '<span class="pl-count">' + fmt(n) + "</span></div>";
        }).join("");
        return '<div class="pl-col">' +
          '<div class="pl-head"><h3>' + esc(stage.label) + "</h3>" +
            '<div class="pl-stats">' + fmt(evs.length) + " ev" +
            (mw ? " · " + fmt(Math.round(mw)) + " MW" : "") +
            (money ? " · " + moneyLabel(money) : "") + "</div></div>" +
          (typeRows || '<p class="bd-empty">—</p>') +
        "</div>";
      }).join("");

      var delays = filtered.filter(function (ev) { return ev.event_type === "DELAY_REPORTED"; });
      var dMw = 0; delays.forEach(function (ev) { dMw += mwOf(ev) || 0; });
      var dMetros = tally(delays, function (e) { return e.metros; }).slice(0, 4)
        .map(function (p) { return p[0] + " ×" + p[1]; }).join(", ");
      var riskStrip = delays.length
        ? '<div class="pl-risk bd-click' + (state.type === "DELAY_REPORTED" ? " bd-active" : "") +
          '" role="button" tabindex="0" data-fkey="type" data-fval="DELAY_REPORTED">' +
          "<strong>At risk:</strong> " + fmt(delays.length) + " delay / moratorium / opposition event(s)" +
          (dMw ? " · " + fmt(Math.round(dMw)) + " MW affected" : "") +
          (dMetros ? " · " + esc(dMetros) : "") + "</div>"
        : "";

      el("dash-pipeline").innerHTML = '<div class="pl-board">' + cols + "</div>" + riskStrip +
        '<p class="bd-hint">Stages are the collector’s event types in lifecycle order. Counts reflect current filters; a stage total is events, not distinct projects.</p>';
    }
    el("dash-pipeline").addEventListener("click", function (e) {
      var row = e.target.closest ? e.target.closest(".bd-click") : null;
      if (row) setFilter(row.dataset.fkey, row.dataset.fval);
    });
    el("dash-pipeline").addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var row = e.target.closest ? e.target.closest(".bd-click") : null;
      if (row) { e.preventDefault(); setFilter(row.dataset.fkey, row.dataset.fval); }
    });

    /* --- counterparty directory (corpus-wide, click a row to open profile) ------ */
    var showAllDir = false;
    function renderDirectory() {
      var rows = {};
      events.forEach(function (ev) {
        parties(ev).forEach(function (p) {
          var r = rows[p] || (rows[p] = { name: p, n: 0, mw: 0, money: 0, last: "" });
          r.n += 1;
          r.mw += mwOf(ev) || 0;
          r.money += moneyOf(ev) || 0;
          if (ev.date && ev.date > r.last) r.last = ev.date;
        });
      });
      var list = Object.keys(rows).map(function (k) { return rows[k]; })
        .sort(function (a, b) { return b.mw - a.mw || b.n - a.n; });
      var shown = showAllDir ? list : list.slice(0, 12);
      el("dash-directory").innerHTML =
        '<div class="dash-table-wrap"><table class="dir-table"><thead><tr>' +
        "<th>Counterparty</th><th>Kind</th><th class='num'>Events</th>" +
        "<th class='num'>Announced MW</th><th class='num'>Disclosed $</th><th>Last activity</th>" +
        "</tr></thead><tbody>" +
        shown.map(function (r) {
          var active = state.party === r.name;
          return '<tr class="dir-row' + (active ? " dir-active" : "") + '" data-party="' + esc(r.name) + '">' +
            "<td><strong>" + esc(r.name) + "</strong></td>" +
            '<td><span class="pill pill-neutral">' + esc(partyKindMap[r.name] || "—") + "</span></td>" +
            '<td class="num">' + fmt(r.n) + "</td>" +
            '<td class="num">' + (r.mw ? fmt(Math.round(r.mw)) : "—") + "</td>" +
            '<td class="num">' + (r.money ? moneyLabel(r.money) : "—") + "</td>" +
            "<td>" + esc(r.last || "—") + "</td></tr>";
        }).join("") +
        "</tbody></table></div>" +
        (list.length > 12
          ? '<button type="button" class="dir-more" id="dir-more">' +
            (showAllDir ? "Show top 12" : "Show all " + list.length + " counterparties") + "</button>"
          : "") +
        '<p class="bd-hint">Corpus-wide totals (unaffected by filters). Announced MW sums each event’s largest campus figure and may double-count re-announcements. Click a row for the profile.</p>';
      var more = el("dir-more");
      if (more) more.addEventListener("click", function () { showAllDir = !showAllDir; renderDirectory(); });
    }
    el("dash-directory").addEventListener("click", function (e) {
      var row = e.target.closest ? e.target.closest(".dir-row") : null;
      if (!row) return;
      setFilter("party", row.dataset.party);
      if (state.party) el("dash-entity").scrollIntoView({ behavior: "smooth", block: "start" });
    });

    /* --- breakdown bars (clickable = cross-filter) ---------------------------- */
    function barRows(pairs, unit, filterKey) {
      var max = Math.max.apply(null, pairs.map(function (p) { return p[1]; }).concat([1]));
      return pairs.map(function (p) {
        var active = filterKey && state[filterKey] === p[2];
        return '<div class="bd-row' + (filterKey ? " bd-click" : "") + (active ? " bd-active" : "") + '"' +
          (filterKey ? ' role="button" tabindex="0" data-fkey="' + esc(filterKey) + '" data-fval="' + esc(p[2]) + '"' : "") + ">" +
          '<div class="bd-label">' + esc(p[0]) + '</div>' +
          '<div class="bd-track"><div class="bd-fill" style="width:' + Math.max((p[1] / max) * 100, 2) + '%"></div></div>' +
          '<div class="bd-value">' + fmt(p[1]) + (unit ? " " + unit : "") + '</div></div>';
      }).join("");
    }
    function tally(list, keyFn) {
      var counts = {};
      list.forEach(function (ev) {
        (keyFn(ev) || []).forEach(function (k) { counts[k] = (counts[k] || 0) + 1; });
      });
      return Object.keys(counts).map(function (k) { return [k, counts[k]]; })
        .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
    }
    function mwByParty(list) {
      var mw = {};
      list.forEach(function (ev) {
        var v = mwOf(ev);
        if (!v) return;
        parties(ev).forEach(function (p) { mw[p] = (mw[p] || 0) + v; });
      });
      return Object.keys(mw).map(function (k) { return [k, Math.round(mw[k])]; })
        .sort(function (a, b) { return b[1] - a[1]; }).slice(0, 8);
    }

    function renderBreakdowns(filtered) {
      var byTopic = tally(filtered, function (e) { return e.topics; })
        .map(function (p) { return [p[0], p[1], p[0]]; });
      var byType = tally(filtered, function (e) { return [e.event_type]; })
        .map(function (p) { return [typeLabel(p[0]), p[1], p[0]]; });
      var byMetro = tally(filtered, function (e) { return e.metros; })
        .map(function (p) { return [p[0], p[1], p[0]]; });
      var byPower = tally(filtered, function (e) { return e.power_entities; })
        .map(function (p) { return [p[0], p[1], p[0]]; });
      var byMW = mwByParty(filtered).map(function (p) { return [p[0], p[1], p[0]]; });

      el("dash-breakdowns").innerHTML = '<div class="bd-grid">' +
        breakdownCard("Events by topic", byTopic.length ? barRows(byTopic, "", "topic") : emptyNote()) +
        breakdownCard("Events by type", byType.length ? barRows(byType, "", "type") : emptyNote()) +
        breakdownCard("Events by location", byMetro.length ? barRows(byMetro, "", "metro") : emptyNote()) +
        breakdownCard("MW by counterparty", byMW.length ? barRows(byMW, "MW", "party") : emptyNote()) +
        breakdownCard("Events by power entity", byPower.length ? barRows(byPower, "", "power") : emptyNote()) +
        "</div>" +
        '<p class="bd-hint">Bars, party and location tags are filters — click to apply, click again to clear.</p>';
    }
    function breakdownCard(title, body) {
      return '<div class="bd-card"><h3>' + esc(title) + "</h3>" + body + "</div>";
    }
    function emptyNote() { return '<p class="bd-empty">No matches in current filter.</p>'; }

    el("dash-breakdowns").addEventListener("click", function (e) {
      var row = e.target.closest ? e.target.closest(".bd-click") : null;
      if (row) setFilter(row.dataset.fkey, row.dataset.fval);
    });
    el("dash-breakdowns").addEventListener("keydown", function (e) {
      if (e.key !== "Enter" && e.key !== " ") return;
      var row = e.target.closest ? e.target.closest(".bd-click") : null;
      if (row) { e.preventDefault(); setFilter(row.dataset.fkey, row.dataset.fval); }
    });

    /* --- active filter chips -------------------------------------------------- */
    function renderActiveChips() {
      var chips = [];
      function chip(label, key) {
        chips.push('<button type="button" class="afchip" data-clear="' + esc(key) + '">' + esc(label) + " ✕</button>");
      }
      if (state.type) chip(typeLabel(state.type), "type");
      if (state.topic) chip(state.topic, "topic");
      if (state.party) chip(state.party, "party");
      if (state.metro) chip(state.metro, "metro");
      if (state.power) chip(state.power, "power");
      if (state.mwMin) chip(fmt(state.mwMin) + "+ MW", "mwMin");
      if (state.moneyMin) chip(moneyLabel(state.moneyMin) + "+", "moneyMin");
      if (state.scoreMin) chip("Score " + state.scoreMin + "+", "scoreMin");
      if (state.from) chip("From " + state.from, "from");
      if (state.to) chip("To " + state.to, "to");
      if (state.q) chip('"' + state.q + '"', "q");
      if (state.newOnly) chip("New this run", "newOnly");
      if (state.pinnedOnly) chip("Pinned", "pinnedOnly");
      el("dash-active").innerHTML = chips.length
        ? '<span class="af-label">Active:</span>' + chips.join("")
        : "";
    }
    el("dash-active").addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".afchip") : null;
      if (!b) return;
      var key = b.dataset.clear;
      state[key] = typeof DEFAULTS[key] === "boolean" ? false : (typeof DEFAULTS[key] === "number" ? 0 : "");
      syncControls();
      rerender();
    });

    /* --- counterparty profile card -------------------------------------------- */
    function renderEntityCard() {
      var card = el("dash-entity");
      if (!state.party) { card.hidden = true; card.innerHTML = ""; return; }
      var name = state.party;
      var evs = events.filter(function (ev) { return parties(ev).indexOf(name) !== -1; });
      var mwSum = 0, moneySum = 0, dates = [];
      var typeMix = {}, metroMix = {}, coParties = {};
      evs.forEach(function (ev) {
        mwSum += mwOf(ev) || 0;
        moneySum += moneyOf(ev) || 0;
        if (ev.date) dates.push(ev.date);
        typeMix[ev.event_type] = (typeMix[ev.event_type] || 0) + 1;
        (ev.metros || []).forEach(function (m) { metroMix[m] = (metroMix[m] || 0) + 1; });
        parties(ev).forEach(function (p) { if (p !== name) coParties[p] = (coParties[p] || 0) + 1; });
      });
      dates.sort();
      function top(obj, n) {
        return Object.keys(obj).map(function (k) { return [k, obj[k]]; })
          .sort(function (a, b) { return b[1] - a[1]; }).slice(0, n);
      }
      var kind = partyKindMap[name] || "";
      card.hidden = false;
      card.innerHTML =
        '<div class="ent-head"><h3>' + esc(name) + "</h3>" +
          (kind ? '<span class="pill pill-neutral">' + esc(kind) + "</span>" : "") +
          '<span class="ent-note">All ' + fmt(evs.length) + " tracked events for this counterparty, ignoring other filters</span>" +
          '<button type="button" class="ent-close" id="ent-close" title="Clear counterparty filter">✕</button></div>' +
        '<div class="ent-grid">' +
          entStat("Events", fmt(evs.length)) +
          entStat("Announced MW", mwSum ? fmt(Math.round(mwSum)) : "—") +
          entStat("Disclosed value", moneySum ? moneyLabel(moneySum) : "—") +
          entStat("Activity span", dates.length ? dates[0] + " → " + dates[dates.length - 1] : "—") +
        "</div>" +
        '<div class="ent-rows">' +
          entRow("Event mix", top(typeMix, 4).map(function (p) {
            return '<span class="pill pill-' + typeColor(p[0]) + '">' + esc(typeLabel(p[0])) + " ×" + p[1] + "</span>";
          }).join(" ")) +
          entRow("Locations", top(metroMix, 4).map(function (p) {
            return '<span class="chip chip-metro" data-metro="' + esc(p[0]) + '">' + esc(p[0]) + " ×" + p[1] + "</span>";
          }).join(" ") || "—") +
          entRow("Appears alongside", top(coParties, 5).map(function (p) {
            return '<span class="chip" data-party="' + esc(p[0]) + '">' + esc(p[0]) + " ×" + p[1] + "</span>";
          }).join(" ") || "—") +
        "</div>";
      var close = el("ent-close");
      if (close) close.addEventListener("click", function () { setFilter("party", state.party); });
    }
    function entStat(label, value) {
      return '<div class="ent-stat"><div class="metric-label">' + esc(label) + '</div><div class="ent-value">' + esc(value) + "</div></div>";
    }
    function entRow(label, body) {
      return '<div class="ent-row"><span class="metric-label">' + esc(label) + "</span><span>" + body + "</span></div>";
    }
    el("dash-entity").addEventListener("click", function (e) {
      var t = e.target;
      if (t.dataset && t.dataset.party) setFilter("party", t.dataset.party);
      else if (t.dataset && t.dataset.metro) setFilter("metro", t.dataset.metro);
    });

    /* --- table ----------------------------------------------------------------- */
    function signalBadges(ev) {
      var out = [];
      if ((ev.commercial_signals || []).indexOf("guarantee") >= 0) out.push('<span class="sig sig-red" title="Guarantee / credit-support language present">guarantee</span>');
      if ((ev.commercial_signals || []).indexOf("prelease") >= 0) out.push('<span class="sig sig-green" title="Prelease / precommitment language present">prelease</span>');
      if ((ev.also_in || []).length) out.push('<span class="sig" title="Also reported by: ' + esc(ev.also_in.join(", ")) + '">×' + (ev.also_in.length + 1) + " src</span>");
      return out.join(" ");
    }
    function mwCell(ev) {
      var mw = mwOf(ev);
      if (mw) {
        var basis = ev.mw_basis && ev.mw_basis !== "unstated" ? ' <span class="mw-basis">' + esc(ev.mw_basis) + "</span>" : "";
        return fmt(mw) + basis;
      }
      var agg = aggMwOf(ev);
      if (agg) return '<span class="mw-agg" title="Market/queue aggregate, not a campus figure">' +
        fmt(agg) + '<span class="mw-basis">agg</span></span>';
      return "—";
    }

    function detailRow(ev) {
      var q = ev.quantities || {};
      function dl(label, val) {
        return val ? '<div class="det-item"><span class="metric-label">' + label + "</span> " + val + "</div>" : "";
      }
      return '<td colspan="11"><div class="det-grid">' +
        dl("Topics", (ev.topics || []).join(", ")) +
        dl("First seen", esc(firstSeen(ev))) +
        dl("Last seen", esc(ev.last_seen || "")) +
        dl("MW figures", (q.mw_campus || []).map(fmt).join(", ")) +
        dl("MW basis", ev.mw_basis !== "unstated" ? esc(ev.mw_basis) : "unstated — not confirmed IT vs gross") +
        dl("Aggregate/queue MW", (q.mw_aggregate || []).map(fmt).join(", ")) +
        dl("$ figures", (q.money_musd || []).map(moneyLabel).join(", ")) +
        dl("Acres", (q.acres || []).map(fmt).join(", ")) +
        dl("Years cited", (q.years || []).join(", ")) +
        dl("Capacity signals", (ev.capacity_signals || []).join(", ")) +
        dl("Commercial signals", (ev.commercial_signals || []).join(", ")) +
        dl("Power signals", (ev.power_signals || []).join(", ")) +
        dl("Power entities", (ev.power_entities || []).join(", ")) +
        dl("Capital", (ev.capital || []).join(", ")) +
        dl("Also reported by", (ev.also_in || []).join(", ")) +
        dl("Source", srcLink(ev.url, ev.source + " — open article")) +
        "</div></td>";
    }

    function renderTable(filtered) {
      el("dash-empty").hidden = filtered.length > 0;
      el("dash-tbody").innerHTML = filtered.map(function (ev) {
        var money = moneyOf(ev);
        var isNew = firstSeen(ev) === latestRun;
        var partyChips = parties(ev).map(function (p) {
          return '<span class="chip chip-click" data-party="' + esc(p) + '" title="Filter to ' + esc(p) + '">' + esc(p) + "</span>";
        }).join("");
        var metroChips = (ev.metros || []).map(function (m) {
          return '<span class="chip chip-metro chip-click" data-metro="' + esc(m) + '" title="Filter to ' + esc(m) + '">' + esc(m) + "</span>";
        }).join("");
        var rows =
          '<tr class="ev-row" data-id="' + esc(ev.id) + '">' +
            '<td class="pin-col"><button type="button" class="pin-btn' + (pins[ev.id] ? " pinned" : "") +
              '" data-pin="' + esc(ev.id) + '" title="' + (pins[ev.id] ? "Unpin" : "Pin to watchlist") + '">★</button></td>' +
            // Date and the NEW badge stack instead of sharing a line — side
            // by side they overflowed the column and broke the date in two.
            '<td class="col-date"><span class="date-val">' + esc(ev.date || "—") + "</span>" +
              (isNew ? '<span class="new-flag">NEW</span>' : "") + "</td>" +
            '<td><span class="pill pill-' + typeColor(ev.event_type) + '">' + esc(typeLabel(ev.event_type)) + "</span></td>" +
            "<td>" + srcLink(ev.url, ev.title) + "</td>" +
            "<td>" + (partyChips || "—") + "</td>" +
            "<td>" + (metroChips || "—") + "</td>" +
            '<td class="num">' + mwCell(ev) + "</td>" +
            '<td class="num">' + moneyLabel(money) + "</td>" +
            "<td>" + (signalBadges(ev) || "—") + "</td>" +
            '<td class="ctr">' + esc(ev.source) + "</td>" +
            '<td class="num">' + esc(scoreOf(ev)) + "</td>" +
          "</tr>";
        if (expanded[ev.id]) rows += '<tr class="det-row">' + detailRow(ev) + "</tr>";
        return rows;
      }).join("");
    }

    el("dash-tbody").addEventListener("click", function (e) {
      var t = e.target;
      if (t.closest && t.closest("a")) return; // let links be links
      var pin = t.closest ? t.closest(".pin-btn") : null;
      if (pin) {
        var id = pin.dataset.pin;
        if (pins[id]) delete pins[id]; else pins[id] = 1;
        savePins(pins);
        rerender();
        return;
      }
      var chip = t.closest ? t.closest(".chip-click") : null;
      if (chip) {
        if (chip.dataset.party) setFilter("party", chip.dataset.party);
        else if (chip.dataset.metro) setFilter("metro", chip.dataset.metro);
        return;
      }
      var row = t.closest ? t.closest(".ev-row") : null;
      if (row) {
        expanded[row.dataset.id] = !expanded[row.dataset.id];
        rerender();
      }
    });

    /* --- CSV export -------------------------------------------------------------- */
    function exportCSV() {
      var filtered = sortList(events.filter(matches));
      var cols = ["date", "event_type", "topics", "title", "url", "parties", "metros", "power_entities",
                  "mw_campus_max", "mw_basis", "mw_aggregate_max", "money_musd_max",
                  "commercial_signals", "capacity_signals", "power_signals",
                  "source", "also_in", "score", "first_seen", "last_seen"];
      function cell(v) {
        var s = String(v == null ? "" : v);
        return /[",\n]/.test(s) ? '"' + s.replace(/"/g, '""') + '"' : s;
      }
      var lines = [cols.join(",")];
      filtered.forEach(function (ev) {
        lines.push([
          ev.date, ev.event_type, (ev.topics || []).join("; "), ev.title, ev.url,
          parties(ev).join("; "), (ev.metros || []).join("; "), (ev.power_entities || []).join("; "),
          mwOf(ev) || "", ev.mw_basis || "", aggMwOf(ev) || "", moneyOf(ev) || "",
          (ev.commercial_signals || []).join("; "), (ev.capacity_signals || []).join("; "),
          (ev.power_signals || []).join("; "),
          ev.source, (ev.also_in || []).join("; "), scoreOf(ev), firstSeen(ev), ev.last_seen || ""
        ].map(cell).join(","));
      });
      var blob = new Blob(["﻿" + lines.join("\r\n")], { type: "text/csv;charset=utf-8" });
      var a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = "dc-market-events-" + latestRun + ".csv";
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      setTimeout(function () { URL.revokeObjectURL(a.href); }, 2000);
    }

    /* --- sortable column headers -------------------------------------------------- */
    [].slice.call(document.querySelectorAll("#dash-table th[data-sort]")).forEach(function (th) {
      th.classList.add("sortable");
      th.addEventListener("click", function () {
        var key = th.dataset.sort;
        if (state.sort === key) { state.dir = state.dir === "asc" ? "desc" : "asc"; }
        else { state.sort = key; state.dir = "desc"; }
        syncControls();
        rerender();
      });
    });
  }

  /* --- view switcher (Dashboard <-> Research) -------------------------------- */
  function initViewSwitcher() {
    var btns = [].slice.call(document.querySelectorAll(".view-btn"));
    var researchTabIds = ["fundamentals", "power", "capital", "counterparty", "equities"];
    function select(view) {
      btns.forEach(function (b) {
        var on = b.dataset.view === view;
        b.setAttribute("aria-selected", on ? "true" : "false");
      });
      el("view-dashboard").hidden = view !== "dashboard";
      el("view-research").hidden = view !== "research";
      if (view === "dashboard") {
        // Leaflet sizes itself to its container; if the map initialized while
        // this view was hidden, poke it so it measures the real width.
        try { window.dispatchEvent(new Event("resize")); } catch (e) { /* old browser */ }
      }
      if (history.replaceState) history.replaceState(null, "", view === "research" ? "#research" : "#");
    }
    btns.forEach(function (b) {
      b.addEventListener("click", function () { select(b.dataset.view); });
    });
    var rawHash = typeof window.__initialHash === "string" ? window.__initialHash : location.hash;
    var hash = (rawHash || "").replace("#", "");
    select(researchTabIds.indexOf(hash) >= 0 || hash === "research" ? "research" : "dashboard");
  }
  initViewSwitcher();
})();
