/* Renders every panel from window.DC_DATA. No framework, no build step. */
(function () {
  "use strict";

  var D = window.DC_DATA;
  if (!D) { document.body.innerHTML = "<p style='padding:40px'>market-data.js failed to load.</p>"; return; }

  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  var el = function (id) { return document.getElementById(id); };
  var fmt = function (n) { return n == null ? "—" : n.toLocaleString("en-US"); };

  function srcLink(name, url) {
    if (!url) return "";
    return '<a class="src" href="' + esc(url) + '" target="_blank" rel="noopener">' + esc(name) + "</a>";
  }
  function methodPill(m) {
    if (!m) return "";
    return '<span class="pill ' + esc(m.toLowerCase()) + '">' + esc(m) + "</span>";
  }

  /* --- hero ------------------------------------------------------------- */
  function renderHero() {
    var c = D.constraint;
    var ratio = Math.round((c.queue_gw * 1000) / c.approved_mw_12mo);
    el("ratio").innerHTML = ratio.toLocaleString("en-US") + "<em>:1</em>";
    el("ratio-caption").innerHTML =
      "For every megawatt ERCOT actually approved to energize over the trailing twelve months, roughly " +
      "<strong>" + ratio.toLocaleString("en-US") + " MW</strong> sits in the large-load queue — " +
      Math.round(c.queue_dc_share * 100) + "% of it data centers. " +
      "Demand is not the constraint in this market. Interconnection is.";

    var queueMW = c.queue_gw * 1000;
    el("scale").innerHTML =
      scaleRow("Large-load queue", queueMW.toLocaleString("en-US") + " MW", 100, false,
               "~" + Math.round(c.queue_dc_share * 100) + "% data centers · " + c.as_of) +
      scaleRow("Approved to energize, trailing 12 months", c.approved_mw_12mo.toLocaleString("en-US") + " MW",
               Math.max((c.approved_mw_12mo / queueMW) * 100, 0.35), true,
               "The number that actually clears") +
      '<div style="margin-top:22px">' +
        srcLink("ERCOT Large Load Update, April 2026", c.url) +
        srcLink("ERCOT Large Load Working Group, March 2026", c.approvals_url) +
      "</div>";
  }
  function scaleRow(label, value, pct, constrained, note) {
    return '<div class="scale-row">' +
      '<div class="scale-label"><span>' + esc(label) + "</span><b>" + esc(value) + "</b></div>" +
      '<div class="scale-track"><div class="scale-fill' + (constrained ? " constrained" : "") +
        '" style="width:' + pct + '%"></div></div>' +
      '<div class="scale-note">' + esc(note) + "</div></div>";
  }

  /* --- generic metric grid --------------------------------------------- */
  function metricGrid(items) {
    return '<div class="metrics">' + items.map(function (m) {
      return '<div class="metric">' +
        '<div class="metric-label">' + esc(m.label) + methodPill(m.method) + "</div>" +
        '<div class="metric-value">' + esc(m.value) + "</div>" +
        (m.note ? '<div class="metric-note">' + esc(m.note) + "</div>" : "") +
        '<div class="metric-note" style="color:var(--slate-lt)">' + esc(m.as_of || "") + "</div>" +
        srcLink(m.source, m.url) +
      "</div>";
    }).join("") + "</div>";
  }

  /* --- layer 1: fundamentals -------------------------------------------- */
  function renderFundamentals() {
    var f = D.fundamentals, h = "";

    h += '<h2 class="sec">Headline fundamentals</h2>' + metricGrid(f.headline);

    // absorption
    var a = f.absorption;
    var max = 2600;
    h += '<h2 class="sec">Net absorption</h2><table><caption>' + esc(a.caption) + "</caption>" +
      "<thead><tr><th>Market</th><th class='num'>FY 2025 (MW)</th><th class='num'>Q1 2026 (MW)</th><th>Note</th></tr></thead><tbody>";
    a.rows.forEach(function (r) {
      h += "<tr><td><strong>" + esc(r.market) + "</strong></td>" +
        "<td class='num'>" + fmt(r.fy2025) +
          (r.fy2025 ? '<span class="tbar" style="width:' + (r.fy2025 / max * 100) + '%"></span>' : "") + "</td>" +
        "<td class='num'>" + (r.q1_2026 == null ? '<span class="dash">—</span>' : fmt(r.q1_2026) +
          '<span class="tbar alt" style="width:' + (r.q1_2026 / max * 100) + '%"></span>') + "</td>" +
        "<td>" + esc(r.note || "") + "</td></tr>";
    });
    h += "</tbody></table>" + srcLink(a.source, a.url);

    // vacancy
    var v = f.vacancy_detail, vmax = 20;
    h += '<h2 class="sec">Vacancy by market</h2><table><caption>' + esc(v.caption) + "</caption>" +
      "<thead><tr><th>Market</th><th class='num'>Vacancy</th><th style='width:45%'></th></tr></thead><tbody>";
    v.rows.forEach(function (r) {
      h += "<tr><td>" + esc(r.market) + "</td><td class='num'>" + r.vacancy.toFixed(1) + "%</td>" +
        '<td><span class="tbar' + (r.vacancy < 2 ? " alt" : "") + '" style="width:' +
        (r.vacancy / vmax * 100) + '%;margin-top:4px"></span></td></tr>';
    });
    h += "</tbody></table>" + srcLink(v.source, v.url);

    // methodology divergence
    var n = f.nova;
    h += '<h2 class="sec">Methodology divergence — why you cannot blend these</h2>' +
      "<table><caption>" + esc(n.caption) + "</caption>" +
      "<thead><tr><th>Metric</th><th>CBRE</th><th>JLL</th></tr></thead><tbody>";
    n.rows.forEach(function (r) {
      h += "<tr><td><strong>" + esc(r.metric) + "</strong></td><td>" + esc(r.cbre) + "</td><td>" + esc(r.jll) + "</td></tr>";
    });
    h += "</tbody></table>" + srcLink(n.source, n.url);

    el("panel-fundamentals").innerHTML = h;
  }

  /* --- layer 2: power ---------------------------------------------------- */
  function renderPower() {
    var p = D.power, h = "";
    h += '<h2 class="sec">Interconnection</h2>' + metricGrid(p.headline);

    var g = p.gen_queue, gmax = 180000;
    h += '<h2 class="sec">ERCOT generation queue</h2><table><caption>' + esc(g.caption) +
      " As of " + esc(g.as_of) + ".</caption>" +
      "<thead><tr><th>Technology</th><th class='num'>MW</th><th style='width:45%'></th></tr></thead><tbody>";
    g.rows.forEach(function (r) {
      h += "<tr><td>" + esc(r.tech) + "</td><td class='num'>" + fmt(r.mw) + "</td>" +
        '<td><span class="tbar" style="width:' + (r.mw / gmax * 100) + '%;margin-top:4px"></span></td></tr>';
    });
    h += "</tbody></table>" + srcLink(g.source, g.url);

    h += '<h2 class="sec">Regulatory watchlist</h2><div class="watch">';
    p.watchlist.forEach(function (w) {
      h += '<div class="watch-item"><div><h3>' + esc(w.item) + "</h3>" +
        '<div class="watch-status">' + esc(w.status) + "</div></div>" +
        '<div><p class="watch-why">' + esc(w.why) + "</p>" + srcLink(w.source, w.url) + "</div></div>";
    });
    h += "</div>";
    el("panel-power").innerHTML = h;
  }

  /* --- layer 3: capital markets ----------------------------------------- */
  function renderCapital() {
    var c = D.capital, h = "";
    h += '<h2 class="sec">What is publicly visible</h2>' + metricGrid(c.headline);

    // Rating-agency ABS/CMBS — the only public window into private operators'
    // lease books. Hand-entered; see the schema comment in market-data.js.
    var deals = c.abs_deals || [];
    h += '<h2 class="sec">Rated data-center ABS / CMBS</h2>';
    if (!deals.length) {
      h += '<div class="gapbox"><h3>No rated deals recorded yet</h3>' +
        "<p style='margin-top:0'>Presale and surveillance reports from KBRA, Moody's, DBRS and Fitch " +
        "disclose tenant names, weighted-average remaining lease term and tenant credit quality for " +
        "operators that file nothing with the SEC. Add entries by hand in <code>data/market-data.js</code> " +
        "(<code>capital.abs_deals</code>) — the field schema and the rules are documented there. " +
        "Every record needs a live public link.</p></div>";
    } else {
      h += "<table><caption>Hand-entered from public rating-agency reports. " +
        "<strong>Agencies do not compute these alike</strong> — WALT may or may not include extension " +
        "options, and credit measures may be by NRSF, base rent, or MW. Filter by agency before " +
        "comparing; never average across agencies.</caption>" +
        "<thead><tr><th>Deal</th><th>Sponsor</th><th>Agency</th><th class='num'>Size</th>" +
        "<th class='num'>WALT</th><th>Tenants</th><th>Credit</th></tr></thead><tbody>";
      deals.forEach(function (d) {
        h += "<tr><td><strong>" + esc(d.deal) + "</strong>" +
            (d.report_type ? "<span class='sub'>" + esc(d.report_type) + " · " + esc(d.as_of || "") + "</span>" : "") +
            "</td>" +
          "<td>" + esc(d.sponsor || "—") + "</td>" +
          '<td><span class="pill agency">' + esc(d.agency || "—") + "</span></td>" +
          "<td class='num'>" + (d.size_musd == null ? "—" :
            (d.size_musd >= 1000 ? "$" + (d.size_musd / 1000).toFixed(1) + "B" : "$" + fmt(d.size_musd) + "M")) + "</td>" +
          "<td class='num'>" + (d.walt_years == null ? "—" : esc(d.walt_years) + "y") +
            (d.walt_basis ? "<span class='sub'>" + esc(d.walt_basis) + "</span>" : "") + "</td>" +
          "<td>" + (d.tenants && d.tenants.length ? esc(d.tenants.join(", ")) : "—") + "</td>" +
          "<td>" + esc(d.credit_note || "—") + srcLink(d.agency + " report", d.url) + "</td></tr>";
      });
      h += "</tbody></table>";
    }

    h += '<h2 class="sec">Known gaps</h2><div class="gapbox"><h3>Not obtainable from public sources</h3><ul>' +
      c.gaps.map(function (g) { return "<li>" + esc(g) + "</li>"; }).join("") +
      "</ul><p>" + esc(c.note) + "</p></div>";
    el("panel-capital").innerHTML = h;
  }

  /* --- layer 4: counterparty -------------------------------------------- */
  function renderCounterparty() {
    var c = D.counterparty, h = "";
    var max = 210;

    h += '<h2 class="sec">2026 capex guidance</h2><table><caption>' + esc(c.caption) + "</caption>" +
      "<thead><tr><th>Counterparty</th><th class='num'>2025 actual ($B)</th><th class='num'>2026 guide ($B)</th>" +
      "<th>Revision</th></tr></thead><tbody>";
    c.rows.forEach(function (r) {
      var band = r.low === r.high ? "$" + r.low + "B" : "$" + r.low + "–" + r.high + "B";
      h += "<tr><td><strong>" + esc(r.name) + "</strong><span class='sub'>" + esc(r.note) + "</span></td>" +
        "<td class='num'>" + fmt(r.fy2025) +
          '<span class="tbar" style="width:' + (r.fy2025 / max * 100) + '%"></span></td>' +
        "<td class='num'>" + esc(band) +
          '<span class="tbar alt" style="width:' + (r.capex_2026 / max * 100) + '%"></span></td>' +
        "<td><span class='sub' style='margin-top:0'>from " + esc(r.initial) +
          (r.revised !== "—" ? "<br>→ " + esc(r.revised) : "") + "</span></td></tr>";
    });
    h += "</tbody></table>" + srcLink(c.source, c.url);

    var a = c.aggregate;
    h += '<h2 class="sec">Aggregate</h2>' + metricGrid([
      { label: "Combined 2026 guidance", value: a.total_2026, note: a.note, as_of: "Mid-2026", source: a.source, url: a.url },
      { label: "Combined 2025 actual", value: a.total_2025, note: "", as_of: "FY 2025", source: a.source, url: a.url },
      { label: "Year-over-year growth", value: a.growth, note: "", as_of: "2026", source: a.source, url: a.url }
    ]);

    h += '<h2 class="sec">Contracted backlog — the credit read</h2>' + metricGrid(c.credit.map(function (x) {
      return { label: x.label, value: x.value, note: x.note, as_of: "", source: x.source, url: x.url };
    }));

    el("panel-counterparty").innerHTML = h;
  }

  /* --- layer 5: equities -------------------------------------------------- */
  function renderEquities() {
    var e = D.equities, h = "";
    h += '<div class="gapbox" style="border-left-color:var(--slate);margin-bottom:34px">' +
      "<h3>Structural note</h3><p style='margin-top:0'>" + esc(e.note) + "</p></div>";
    h += '<h2 class="sec">Sub-sector map</h2><div class="seg">';
    e.segments.forEach(function (s) {
      h += '<div class="seg-row"><div class="seg-name">' + esc(s.segment) + "</div>" +
        '<div class="seg-tickers">' + esc(s.names) + "</div>" +
        '<div class="seg-thesis">' + esc(s.thesis) + "</div></div>";
    });
    h += "</div>";
    el("panel-equities").innerHTML = h;
  }

  /* --- tabs -------------------------------------------------------------- */
  function initTabs() {
    var tabs = [].slice.call(document.querySelectorAll(".tab"));
    function select(id) {
      tabs.forEach(function (t) {
        var on = t.dataset.panel === id;
        t.setAttribute("aria-selected", on ? "true" : "false");
        t.setAttribute("tabindex", on ? "0" : "-1");
        el("panel-" + t.dataset.panel).hidden = !on;
      });
      if (history.replaceState) history.replaceState(null, "", "#" + id);
    }
    tabs.forEach(function (t, i) {
      t.addEventListener("click", function () { select(t.dataset.panel); });
      t.addEventListener("keydown", function (ev) {
        var d = ev.key === "ArrowRight" ? 1 : ev.key === "ArrowLeft" ? -1 : 0;
        if (!d) return;
        ev.preventDefault();
        var next = tabs[(i + d + tabs.length) % tabs.length];
        next.focus(); select(next.dataset.panel);
      });
    });
    var initial = (location.hash || "").replace("#", "");
    select(tabs.some(function (t) { return t.dataset.panel === initial; }) ? initial : "fundamentals");
  }

  /* --- boot -------------------------------------------------------------- */
  el("stamp-built").textContent = D.meta.built;
  el("stamp-scope").textContent = D.meta.scope;
  el("basis").textContent = D.meta.basis;
  renderHero();
  renderFundamentals();
  renderPower();
  renderCapital();
  renderCounterparty();
  renderEquities();
  initTabs();
})();
