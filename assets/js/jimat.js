/*
 * JIMAT — UI controller
 * Creator: Tan Wei Siang. Fully owned by Tan Wei Siang.
 * ---------------------
 * State, navigation and rendering for the guided grocery-savings journey.
 * Pulls numbers from JIMAT_ENGINE and paints each screen. Vanilla JS, no
 * dependencies, runs straight from file://.
 */
(function () {
  "use strict";

  var D = window.JIMAT_DATA, E = window.JIMAT_ENGINE, T = window.JIMAT_I18N;

  // ---- helpers --------------------------------------------------------------
  // Translation shortcut (falls back to the raw key if i18n isn't loaded).
  function t(k, p) { return T ? T.t(k, p) : k; }
  // "{n} word" using singular/plural stem keys (grammar handled per language).
  function wc(n, one, many) { return n + " " + t(n === 1 ? one : many); }
  // Real DOSM category groups get a translated label; key is stable.
  function catLabel(c) { return t("cat." + c.key); }
  function $(sel, root) { return (root || document).querySelector(sel); }
  function $all(sel, root) { return Array.prototype.slice.call((root || document).querySelectorAll(sel)); }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]; }); }
  var REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;

  function fmtRM(n, dp) {
    if (n === null || n === undefined || isNaN(n)) return "RM—";
    dp = dp || 0;
    return "RM" + Number(n).toLocaleString("en-MY", { minimumFractionDigits: dp, maximumFractionDigits: dp });
  }
  function starBar(n) {
    var s = "";
    for (var i = 0; i < 5; i++) s += '<span' + (i < n ? "" : ' class="off"') + '>★</span>';
    return '<span class="stars">' + s + "</span>";
  }
  // Build a map query from the real store name + address (falls back to area).
  function mapQuery(store) {
    var parts = [store.name, store.address].filter(Boolean);
    if (!parts.length) parts.push(state.area ? state.area.name : "Malaysia");
    return parts.join(", ");
  }
  function gmapsUrl(store) {
    return "https://www.google.com/maps/search/?api=1&query=" + encodeURIComponent(mapQuery(store));
  }
  function wazeUrl(store) {
    return "https://www.waze.com/ul?q=" + encodeURIComponent(mapQuery(store)) + "&navigate=yes";
  }

  // Lightweight canvas confetti (no dependencies) — copied from KAYA's palette.
  function confetti(opts) {
    if (REDUCED) return;
    opts = opts || {};
    var canvas = document.getElementById("confetti-canvas");
    if (!canvas) { canvas = document.createElement("canvas"); canvas.id = "confetti-canvas"; document.body.appendChild(canvas); }
    var ctx = canvas.getContext("2d");
    canvas.width = window.innerWidth; canvas.height = window.innerHeight;
    var colors = ["#2a78d6", "#eb6834", "#1baf7a", "#fab219", "#7b61ff", "#ff6b6b", "#ff7ac0", "#12b5b0"];
    var count = opts.count || 130;
    var ox = opts.x != null ? opts.x : window.innerWidth / 2;
    var oy = opts.y != null ? opts.y : window.innerHeight * 0.28;
    var parts = [];
    for (var i = 0; i < count; i++) {
      var a = Math.random() * Math.PI * 2, sp = 5 + Math.random() * 9;
      parts.push({ x: ox, y: oy, vx: Math.cos(a) * sp * (0.6 + Math.random()), vy: Math.sin(a) * sp - 6 - Math.random() * 4,
        g: 0.26 + Math.random() * 0.12, size: 6 + Math.random() * 7, rot: Math.random() * 6.28,
        vr: (Math.random() - 0.5) * 0.4, color: colors[i % colors.length], life: 0, max: 90 + Math.random() * 45,
        shape: Math.random() < 0.5 ? 0 : 1 });
    }
    var frame = 0;
    function tick() {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      var alive = false;
      for (var i = 0; i < parts.length; i++) {
        var pt = parts[i]; if (pt.life > pt.max) continue; alive = true;
        pt.vy += pt.g; pt.x += pt.vx; pt.y += pt.vy; pt.rot += pt.vr; pt.life++;
        ctx.save(); ctx.globalAlpha = Math.max(0, 1 - pt.life / pt.max);
        ctx.translate(pt.x, pt.y); ctx.rotate(pt.rot); ctx.fillStyle = pt.color;
        if (pt.shape === 0) ctx.fillRect(-pt.size / 2, -pt.size / 2, pt.size, pt.size * 0.6);
        else { ctx.beginPath(); ctx.arc(0, 0, pt.size / 2, 0, 6.28); ctx.fill(); }
        ctx.restore();
      }
      frame++;
      if (alive && frame < 240) requestAnimationFrame(tick); else ctx.clearRect(0, 0, canvas.width, canvas.height);
    }
    requestAnimationFrame(tick);
  }

  // ---- state ----------------------------------------------------------------
  var state = {
    area: null,               // { stateKey, districtKey, name, lat, lon }
    radius: 8,
    household: "couple",
    budget: null,
    qty: {},                  // productId -> quantity (empty by default — nothing preselected)
    cat: "all",               // active category filter on the basket screen
    stores: [],               // candidate premises within radius (from D.candidatePremises)
    result: null,             // optimise() output
    chosen: "best",           // best | convenient | cheapest
    checked: {},              // "storeId:itemId" -> true (shopping mode)
    actual: null,             // confirmed actual spend
    screen: "landing",
  };

  function chosenPlan() {
    if (!state.result) return null;
    return state.chosen === "convenient" ? state.result.convenient
      : state.chosen === "cheapest" ? state.result.cheapest : state.result.best;
  }
  function basketItemCount() { return E.items(state.qty).reduce(function (s, it) { return s + it.qty; }, 0); }

  // ============================================================================
  //  Screen 4 — Build basket
  // ============================================================================
  function renderBasket() {
    renderProdGrid($("#basket-search") ? $("#basket-search").value : "");
    updateSummary();
  }

  function matches(p, filter) {
    return !filter || p.name.toLowerCase().indexOf(filter) >= 0 ||
      (p.full || "").toLowerCase().indexOf(filter) >= 0;
  }
  // "2026-06" -> localized "Jun 2026" (for prices backfilled from an earlier month).
  function monthLabel(ym) {
    if (!ym || ym.length < 7) return "";
    var months = t("months").split("|");
    var m = months[parseInt(ym.slice(5, 7), 10) - 1] || "";
    return t("asofFmt", { m: m, y: ym.slice(0, 4) });
  }
  function prodCard(p) {
    var q = state.qty[p.id] || 0;
    var control = q > 0
      ? '<div class="stepper"><button data-act="minus" data-id="' + p.id + '" aria-label="Less">−</button>' +
        '<span class="qty">' + q + '</span>' +
        '<button data-act="plus" data-id="' + p.id + '" aria-label="More">+</button></div>'
      : '<div class="stepper"><button class="add" data-act="plus" data-id="' + p.id + '">' + esc(t("basket.add")) + '</button></div>';
    // Show the source month only when the price isn't from the current snapshot month.
    var stale = p.asof && D.META && p.asof !== D.META.price_month
      ? ' <span class="asof" title="' + esc(t("basket.asofTitle")) + '">' + esc(t("basket.asof", { when: monthLabel(p.asof) })) + '</span>'
      : '';
    return '<div class="prod' + (q > 0 ? " in" : "") + '" title="' + esc(p.full || p.name) + '">' +
      '<div class="emoji">' + p.emoji + '</div>' +
      '<div class="nm">' + esc(p.name) + '</div>' +
      '<div class="meta">' + esc(p.unit) + stale + '</div>' +
      '<div class="price rm">' + fmtRM(p.base, 2) + '</div>' +
      control + '</div>';
  }
  // Count of DISTINCT products chosen in a category (for the chip badge).
  function catChosenCount(catKey) {
    return D.PRODUCTS.reduce(function (n, p) {
      return n + ((p.cat === catKey && (state.qty[p.id] || 0) > 0) ? 1 : 0);
    }, 0);
  }
  function renderProdGrid(filter) {
    filter = (filter || "").trim().toLowerCase();

    // Category filter chips (All + each real DOSM category).
    var totalChosen = E.items(state.qty).length;
    var chips = '<button class="cat-chip' + (state.cat === "all" ? " on" : "") + '" data-cat="all">' +
      esc(t("basket.all")) + (totalChosen ? ' <span class="cc">' + totalChosen + '</span>' : "") + '</button>';
    D.CATEGORIES.forEach(function (c) {
      var n = catChosenCount(c.key);
      chips += '<button class="cat-chip' + (state.cat === c.key ? " on" : "") + '" data-cat="' + c.key + '">' +
        c.emoji + ' ' + esc(catLabel(c)) + (n ? ' <span class="cc">' + n + '</span>' : "") + '</button>';
    });

    // Grouped sections (only the active category, or all when "all" / searching).
    var cats = (state.cat === "all" || filter) ? D.CATEGORIES : D.CATEGORIES.filter(function (c) { return c.key === state.cat; });
    var sections = cats.map(function (c) {
      var prods = D.PRODUCTS.filter(function (p) { return p.cat === c.key && matches(p, filter); });
      if (!prods.length) return "";
      return '<div class="cat-section">' +
        '<div class="cat-head">' + c.emoji + ' ' + esc(catLabel(c)) +
          ' <span class="muted small">' + esc(wc(prods.length, "w.item", "w.items")) + '</span></div>' +
        '<div class="prod-grid">' + prods.map(prodCard).join("") + '</div>' +
      '</div>';
    }).join("");

    if (!sections) sections = '<p class="muted center" style="padding:24px 0">' + esc(t("basket.noMatch")) + '</p>';
    $("#prod-grid").innerHTML = '<div class="cat-chips">' + chips + '</div>' + sections;
  }

  function updateSummary() {
    var total = E.baselineTotal(state.qty);
    var n = E.items(state.qty).length;
    var budgetNote = state.budget
      ? '<span>' + esc(t(total <= state.budget ? "basket.within" : "basket.over", { budget: fmtRM(state.budget) })) + '</span>'
      : '<span>' + esc(t("basket.estimate")) + '</span>';
    $("#basket-summary").innerHTML =
      '<div class="bs-left"><b>' + esc(wc(n, "w.item", "w.items")) + ' · ' + fmtRM(total, 2) + '</b>' + budgetNote + '</div>' +
      '<button class="btn btn-primary" id="btn-basket"' + (n === 0 ? " disabled" : "") + '>' + esc(t("basket.reviewCta")) + '</button>';
    var b = $("#btn-basket");
    if (b) b.addEventListener("click", function () { if (basketItemCount() > 0) goTo("review"); });
  }

  // ============================================================================
  //  Screen 5 — Review
  // ============================================================================
  function renderReview() {
    var its = E.items(state.qty);
    var total = E.baselineTotal(state.qty);
    var rows = its.map(function (it) {
      return '<div class="rev-row"><span class="e">' + it.product.emoji + '</span>' +
        '<span class="nm">' + esc(it.product.name) + ' <span class="q">× ' + it.qty + ' ' + esc(it.product.unit) + '</span></span>' +
        '<span class="amt rm">' + fmtRM(it.product.base * it.qty, 2) + '</span></div>';
    }).join("");

    var budgetInsight = "";
    if (state.budget) {
      var within = total <= state.budget;
      budgetInsight = '<div class="insight ' + (within ? "ok" : "alert") + '" style="margin-top:20px">' +
        '<div class="h">' + esc(t(within ? "review.onBudget" : "review.overBudget")) + '</div>' +
        '<p>' + esc(t(within ? "review.budgetWithin" : "review.budgetOver",
          { basket: fmtRM(total), budget: fmtRM(state.budget) })) + '</p></div>';
    }

    var nStores = D.storesInRange(state.area.lat, state.area.lon, state.radius);
    $("#review-body").innerHTML =
      '<div class="eyebrow">' + esc(t("review.step")) + '</div>' +
      '<h2 class="mb-8">' + esc(t("review.title")) + '</h2>' +
      '<p class="lead mb-16">' + esc(t("review.lead")) + '</p>' +
      '<div class="card">' + rows +
        '<div class="rev-total"><span class="t">' + esc(t("review.total")) + '</span><span class="n rm">' + fmtRM(total, 2) + '</span></div>' +
      '</div>' + budgetInsight +
      '<p class="small muted center">' + t("review.storesNote", {
        area: esc(state.area.name), n: nStores,
        sw: t(nStores === 1 ? "w.store" : "w.stores"), r: state.radius }) + '</p>';
  }

  // ============================================================================
  //  Screen 6 — Optimising (animated) then auto-advance
  // ============================================================================
  var OPT_STEP_KEYS = ["opt.step1", "opt.step2", "opt.step3", "opt.step4"];
  function renderOptimising() {
    // Compute the result up front (instant); the animation is the "wow" reveal.
    state.stores = D.candidatePremises(state.area.lat, state.area.lon, state.radius);
    state.result = E.optimise(state.qty, state.stores);
    state.chosen = "best";
    state.checked = {};

    var steps = OPT_STEP_KEYS.map(function (k, i) {
      return '<div class="opt-step" data-i="' + i + '"><span class="tick">' + (i + 1) + '</span><span>' + esc(t(k)) + '</span></div>';
    }).join("");
    $("#optimising-body").innerHTML =
      '<div class="optimising">' +
        '<div class="opt-orbit"><div class="spin"></div><div class="center">🛒</div></div>' +
        '<h2 style="justify-content:center">' + esc(t("opt.title")) + '</h2>' +
        '<p class="lead" style="margin:10px auto 30px;max-width:420px">' + t("opt.lead", {
          items: esc(wc(E.items(state.qty).length, "w.item", "w.items")),
          stores: esc(wc(state.stores.length, "w.store", "w.stores")),
          area: esc(state.area.name) }) + '</p>' +
        '<div class="opt-steps">' + steps + '</div>' +
      '</div>';

    var stepEls = $all(".opt-step");
    var i = 0;
    function reveal() {
      if (i < stepEls.length) { stepEls[i].classList.add("on"); i++; setTimeout(reveal, 620); }
      else if (state.screen === "optimising") setTimeout(function () { if (state.screen === "optimising") goTo("strategies"); }, 520);
    }
    if (REDUCED) { stepEls.forEach(function (e) { e.classList.add("on"); }); setTimeout(function () { if (state.screen === "optimising") goTo("strategies"); }, 400); }
    else setTimeout(reveal, 400);
  }

  // ============================================================================
  //  Screen 7 — Compare 3 strategies + choose
  // ============================================================================
  function stratCard(plan) {
    var toneClass = plan.key === "best" ? "best" : plan.key === "convenient" ? "conv" : "cheap";
    var tag = t("plan." + plan.key + ".tag");
    var storeChips = plan.stores.map(function (s) { return '<span class="chip-sm">' + esc(s.name) + '</span>'; }).join("");
    var missNote = plan.missing.length ? '<span class="chip-sm" style="color:var(--serious)">' + esc(t("strat.notFound", { n: plan.missing.length })) + '</span>' : "";
    return '<button type="button" class="strat ' + toneClass + '" data-plan="' + plan.key + '">' +
      (plan.key === "best" ? '<span class="ribbon">' + esc(t("strat.ribbon")) + '</span>' : "") +
      '<div class="s-top"><span class="s-emoji">' + plan.emoji + '</span><span class="s-label">' + esc(tag) + '</span></div>' +
      '<div class="s-blurb">' + esc(t("plan." + plan.key + ".blurb")) + '</div>' +
      '<div><span class="s-total rm">' + fmtRM(plan.itemCost) + '</span>' +
        (plan.save > 0 ? '<span class="s-save">' + esc(t("strat.save", { rm: fmtRM(plan.save) })) + '</span>' : "") + '</div>' +
      '<div class="s-facts">' +
        '<span>🏪 <b>' + plan.stops + '</b> ' + esc(t(plan.stops === 1 ? "w.stop" : "w.stops")) + '</span>' +
        '<span>🚗 <b>' + fmtRM(plan.travel, 2) + '</b> ' + esc(t("strat.travel")) + '</span>' +
        '<span>📦 <b>' + Math.round(plan.coverage * 100) + '%</b> ' + esc(t("strat.found")) + '</span>' +
      '</div>' +
      starBar(plan.stars) +
      '<div class="s-stores">' + storeChips + missNote + '</div>' +
    '</button>';
  }

  function renderStrategies() {
    var r = state.result, best = r.best;
    var cards = r.all.map(stratCard).join("");
    $("#strategies-body").innerHTML =
      '<div class="eyebrow">' + esc(t("strat.step")) + '</div>' +
      '<h2 class="mb-8">' + esc(t("strat.title")) + '</h2>' +
      '<p class="lead mb-16">' + t("strat.lead") + '</p>' +
      '<div class="card pad-lg rec-hero">' +
        '<div class="small muted" style="text-transform:uppercase;letter-spacing:.1em">' + esc(t("strat.recLabel")) + '</div>' +
        '<div class="big-save rm">' + fmtRM(best.save) + '</div>' +
        '<div class="sub">' + esc(t("strat.recSub", { year: fmtRM(best.save * 12), pct: Math.round(best.savePct * 100) })) + '</div>' +
      '</div>' +
      '<div class="strat-grid" style="margin-bottom:8px">' + cards + '</div>' +
      '<p class="small muted center">' + esc(t("strat.tapHint")) + '</p>';

    var body = $("#strategies-body");
    if (!body.dataset.wired) {
      body.dataset.wired = "1";
      body.addEventListener("click", function (e) {
        var b = e.target.closest ? e.target.closest("[data-plan]") : null;
        if (!b) return;
        state.chosen = b.getAttribute("data-plan");
        highlightChosen();
        updateStrategiesBtn();
      });
    }
    highlightChosen();
    updateStrategiesBtn();
  }
  function highlightChosen() {
    $all("#strategies-body .strat").forEach(function (el) {
      var on = el.getAttribute("data-plan") === state.chosen;
      el.style.outline = on ? "3px solid var(--brand)" : "";
      el.style.outlineOffset = on ? "2px" : "";
    });
  }
  function updateStrategiesBtn() {
    var p = chosenPlan();
    var b = $("#btn-strategies");
    if (b && p) b.textContent = t("strat.useX", { plan: t("plan." + state.chosen + ".label") });
  }

  // ============================================================================
  //  Screen 8 — Shopping plan
  // ============================================================================
  function stopBlock(plan, opts) {
    opts = opts || {};
    return plan.stores.map(function (s, idx) {
      var lines = s.lines.map(function (l) {
        var key = s.id + ":" + l.it.id;
        var done = opts.interactive && state.checked[key];
        return '<div class="check' + (done ? " done" : "") + '"' +
          (opts.interactive ? ' data-check="' + key + '"' : "") + '>' +
          '<span class="box"></span><span class="e">' + l.it.product.emoji + '</span>' +
          '<span class="nm">' + esc(l.it.product.name) + ' × ' + l.it.qty + '</span>' +
          '<span class="amt rm">' + fmtRM(l.lineTotal, 2) + '</span></div>';
      }).join("");
      var dist = s.distanceKm < 1 ? t("plan.inArea") : t("plan.kmApprox", { km: s.distanceKm.toFixed(1) });
      var addr = s.address ? '<div class="st-addr">📍 ' + esc(s.address) + '</div>' : "";
      return '<div class="stop">' +
        '<div class="st-head"><span class="st-num">' + (idx + 1) + '</span>' +
          '<span class="st-name">' + esc(s.name) + '</span>' +
          '<span class="st-meta">' + esc(s.type) + '<br>' + dist + '</span></div>' +
        addr +
        '<div class="st-lines">' + lines + '</div>' +
        '<div class="st-sub"><span>' + esc(wc(s.lines.length, "w.item", "w.items")) + '</span><span class="rm">' + fmtRM(s.subtotal, 2) + '</span></div>' +
        '<div class="st-nav">' +
          '<a class="directions" href="' + gmapsUrl(s) + '" target="_blank" rel="noopener">🗺️ Google Maps</a>' +
          '<a class="directions waze" href="' + wazeUrl(s) + '" target="_blank" rel="noopener">🧭 Waze</a>' +
        '</div>' +
      '</div>';
    }).join("");
  }

  function renderPlan() {
    var plan = chosenPlan();
    var missNote = plan.missing.length
      ? '<p class="miss">' + esc(t("plan.miss", {
          list: plan.missing.map(function (m) { return m.product.name; }).join(", ") })) + '</p>'
      : "";
    $("#plan-body").innerHTML =
      '<div class="eyebrow">' + esc(t("plan.step")) + '</div>' +
      '<h2 class="mb-8">' + plan.emoji + ' ' + esc(t("plan.titleFmt", { label: t("plan." + state.chosen + ".label") })) + '</h2>' +
      '<p class="lead mb-16">' + esc(t("plan.lead", {
        stops: wc(plan.stops, "w.stop", "w.stops"), area: state.area.name })) + '</p>' +
      '<div class="card pad-lg" style="text-align:center">' +
        '<div class="stat-grid">' +
          '<div class="stat-cell"><div class="v rm">' + fmtRM(plan.itemCost) + '</div><div class="k">' + esc(t("plan.statBasket")) + '</div></div>' +
          '<div class="stat-cell"><div class="v good rm">' + fmtRM(plan.save) + '</div><div class="k">' + esc(t("plan.statSave")) + '</div></div>' +
          '<div class="stat-cell"><div class="v">' + plan.stops + '</div><div class="k">' + esc(t(plan.stops === 1 ? "plan.statStore" : "plan.statStores")) + '</div></div>' +
        '</div>' +
      '</div>' +
      stopBlock(plan, { interactive: false }) + missNote;
  }

  // ============================================================================
  //  Screen 9 — Shopping mode
  // ============================================================================
  function renderShop() {
    var plan = chosenPlan();
    paintShop(plan);
    var body = $("#shop-body");
    if (!body.dataset.wired) {
      body.dataset.wired = "1";
      body.addEventListener("click", function (e) {
        var row = e.target.closest ? e.target.closest("[data-check]") : null;
        if (!row) return;
        var key = row.getAttribute("data-check");
        if (state.checked[key]) delete state.checked[key]; else state.checked[key] = true;
        paintShop(chosenPlan());
      });
    }
  }
  function paintShop(plan) {
    var totalItems = 0, doneItems = 0, spent = 0;
    plan.stores.forEach(function (s) {
      s.lines.forEach(function (l) {
        totalItems++;
        if (state.checked[s.id + ":" + l.it.id]) { doneItems++; spent += l.lineTotal; }
      });
    });
    var pct = totalItems ? Math.round(doneItems / totalItems * 100) : 0;
    var allDone = totalItems > 0 && doneItems === totalItems;
    $("#shop-body").innerHTML =
      '<div class="eyebrow">' + esc(t("shop.step")) + '</div>' +
      '<h2 class="mb-8">' + esc(t("shop.title")) + '</h2>' +
      '<div class="card">' +
        '<div class="statrow" style="border:0;padding-bottom:4px"><span class="k">' + esc(t("shop.progress")) + '</span>' +
          '<span class="v">' + esc(t("shop.progressVal", { done: doneItems, total: totalItems })) + '</span></div>' +
        '<div class="shop-progress"><div class="fill" style="width:' + pct + '%"></div></div>' +
        '<div class="statrow" style="border:0"><span class="k">' + esc(t("shop.picked")) + '</span>' +
          '<span class="v rm">' + fmtRM(spent, 2) + '</span></div>' +
        (allDone ? '<div class="insight ok" style="margin-top:14px"><div class="h">' + esc(t("shop.doneTitle")) + '</div>' +
          '<p>' + esc(t("shop.doneBody")) + '</p></div>' : "") +
      '</div>' +
      stopBlock(plan, { interactive: true });
    if (allDone && !state._celebratedShop) { state._celebratedShop = true; setTimeout(function () { confetti({ y: window.innerHeight * 0.3 }); }, 150); }
    if (!allDone) state._celebratedShop = false;
  }

  // ============================================================================
  //  Screen 10 — Confirm actual savings
  // ============================================================================
  function renderConfirm() {
    var plan = chosenPlan();
    var baseline = plan.baseline;
    // Start empty — the shopper types their real receipt total (estimate shown as a hint).
    var prefill = state.actual != null ? state.actual : "";
    $("#confirm-body").innerHTML =
      '<div class="eyebrow">' + esc(t("confirm.step")) + '</div>' +
      '<h2 class="mb-8">' + esc(t("confirm.title")) + '</h2>' +
      '<p class="lead mb-16">' + esc(t("confirm.lead", { estimate: fmtRM(baseline) })) + '</p>' +
      '<div class="card">' +
        '<label class="field" style="margin-bottom:8px"><span class="lab">' + esc(t("confirm.label")) + '</span>' +
          '<div class="input-money"><span class="rm">RM</span>' +
            '<input class="input" id="in-actual" type="number" inputmode="decimal" min="0" step="0.10" placeholder="' + Math.round(plan.itemCost) + '" value="' + prefill + '" /></div>' +
        '</label>' +
        '<div id="confirm-live"></div>' +
      '</div>';
    var input = $("#in-actual");
    function paint() {
      var raw = input.value.trim();
      if (raw === "") {
        $("#confirm-live").innerHTML =
          '<div class="confirm-hero"><div class="small muted" style="text-transform:uppercase;letter-spacing:.1em">' + esc(t("confirm.saved")) + '</div>' +
            '<div class="n rm" style="opacity:.4">RM—</div>' +
            '<div class="sub muted">' + esc(t("confirm.emptySub")) + '</div></div>';
        return;
      }
      var actual = parseFloat(raw) || 0;
      var saved = baseline - actual;
      var over = saved < 0;
      $("#confirm-live").innerHTML =
        '<div class="confirm-hero"><div class="small muted" style="text-transform:uppercase;letter-spacing:.1em">' +
            esc(t(over ? "confirm.overspent" : "confirm.saved")) + '</div>' +
          '<div class="n rm"' + (over ? ' style="color:var(--critical)"' : "") + '>' + fmtRM(Math.abs(saved)) + '</div>' +
          '<div class="sub muted">' + esc(t("confirm.vsEstimate", { estimate: fmtRM(baseline) })) +
            (saved > 0 ? esc(t("confirm.pctOff", { pct: Math.round(saved / baseline * 100) }))
              : over ? esc(t("confirm.pctOver", { pct: Math.round(-saved / baseline * 100) })) : "") + '</div></div>';
    }
    input.addEventListener("input", paint);
    paint();
  }

  // ============================================================================
  //  Screen 11 — Impact dashboard
  // ============================================================================
  function ringSVG(score, color) {
    var visible = (0.75 * score).toFixed(2);
    return '<svg viewBox="0 0 210 210" width="210" height="210" role="img" aria-label="' + esc(t("impact.ringAria", { score: score })) + '">' +
      '<circle cx="105" cy="105" r="88" fill="none" stroke="var(--brand-100)" stroke-width="16" stroke-linecap="round" ' +
        'pathLength="100" stroke-dasharray="75 100" transform="rotate(135 105 105)"/>' +
      '<circle cx="105" cy="105" r="88" fill="none" stroke="' + color + '" stroke-width="16" stroke-linecap="round" ' +
        'pathLength="100" stroke-dasharray="' + visible + ' 100" transform="rotate(135 105 105)" ' +
        'style="transition:stroke-dasharray 1.1s cubic-bezier(.2,.7,.2,1)"/></svg>';
  }
  function dimBar(name, emoji, pct) {
    var color = pct >= 66 ? "var(--good)" : pct >= 40 ? "var(--warning)" : "var(--critical)";
    return '<div class="dim"><div class="top"><span class="name">' + emoji + ' ' + name + '</span>' +
      '<span class="score">' + pct + '</span></div>' +
      '<div class="track"><div class="fill" style="width:' + pct + '%;background:' + color + '"></div></div></div>';
  }

  function renderImpact() {
    var plan = chosenPlan();
    var baseline = plan.baseline;
    var actual = state.actual != null ? state.actual : plan.itemCost;
    var monthlySave = Math.max(0, baseline - actual);
    var proj = E.project(monthlySave);
    var health = E.groceryHealth(plan, state.budget, actual);
    var intel = E.priceIntel(state.qty);

    // Dashboard stats
    var html =
      '<div class="eyebrow">' + esc(t("impact.eyebrow")) + '</div>' +
      '<h2 class="mb-8">' + esc(t("impact.title")) + '</h2>' +
      '<p class="lead mb-16">' + esc(t("impact.lead")) + '</p>' +
      '<div class="card pad-lg">' +
        '<div class="stat-grid">' +
          '<div class="stat-cell"><div class="v good rm">' + fmtRM(monthlySave) + '</div><div class="k">' + esc(t("impact.savedShop")) + '</div></div>' +
          '<div class="stat-cell"><div class="v good rm">' + fmtRM(proj.yearly) + '</div><div class="k">' + esc(t("impact.projYear")) + '</div></div>' +
          '<div class="stat-cell"><div class="v">' + plan.stops + '</div><div class="k">' + esc(t("impact.storesVisited")) + '</div></div>' +
        '</div>' +
      '</div>';

    // Grocery health
    html += '<div class="card"><div class="card-title">' + esc(t("impact.healthTitle")) + '</div>' +
      '<div class="card-sub">' + esc(t("impact.healthSub")) + '</div>' +
      '<div class="health-wrap">' +
        '<div class="health-ring">' + ringSVG(health.score, health.band.color) +
          '<div class="num"><div><div class="val status-' + health.band.key + '">' + health.score + '</div><div class="den">' + esc(t("impact.outOf")) + '</div></div></div>' +
        '</div>' +
        '<div class="health-band status-' + health.band.key + '"><span class="light" style="background:' + health.band.color + '"></span>' + esc(t("health." + health.band.id)) + '</div>' +
      '</div>' +
      '<div style="margin-top:20px">' + health.parts.map(function (p) { return dimBar(t("health." + p.pkey), p.emoji, p.pct); }).join("") + '</div>' +
    '</div>';

    // Price intelligence
    var intelRows = intel.slice(0, 5).map(function (r) {
      var maxV = Math.max.apply(null, r.spark.map(function (v) { return Math.abs(v); }).concat([1]));
      var bars = r.spark.map(function (v, i) {
        var h = Math.max(12, Math.min(100, (v / maxV) * 100));
        return '<i class="' + (i === 6 ? "hi" : "") + '" style="height:' + h + '%"></i>';
      }).join("");
      return '<div class="intel-row"><span class="e">' + r.product.emoji + '</span>' +
        '<span class="nm">' + esc(r.product.name) + '<small>' + esc(t("impact.intelAvg", { rm: fmtRM(r.avg, 2) })) + '</small></span>' +
        '<span class="spark">' + bars + '</span>' +
        '<span class="flag ' + (r.good ? "down" : r.high ? "up" : "") + '">' +
          esc(r.good ? t("impact.flagLow", { pct: Math.abs(r.deltaPct).toFixed(1) })
            : r.high ? t("impact.flagHigh", { pct: r.deltaPct.toFixed(1) }) : t("impact.flagAvg")) +
        '</span></div>';
    }).join("");
    html += '<div class="card"><div class="card-title">' + esc(t("impact.intelTitle")) + '</div>' +
      '<div class="card-sub">' + esc(t("impact.intelSub")) + '</div>' +
      intelRows + '</div>';

    // Long-term journey
    var maxTotal = proj.years[proj.years.length - 1].total || 1;
    var bars = proj.years.map(function (y) {
      var h = Math.max(8, Math.round(y.total / maxTotal * 150));
      return '<div class="yr"><div class="bar" style="height:' + h + 'px"></div>' +
        '<div class="amt rm">' + fmtRM(y.total) + '</div><div class="lb">' + esc(t("impact.yearLabel", { y: y.year })) + '</div></div>';
    }).join("");
    html += '<div class="card"><div class="card-title">' + esc(t("impact.journeyTitle")) + '</div>' +
      '<div class="card-sub">' + esc(t("impact.journeySub")) + '</div>' +
      '<div class="journey">' + bars + '</div>' +
      '<div class="insight ok" style="margin-top:22px"><div class="h">' + esc(t("impact.bigTitle")) + '</div>' +
        '<p>' + t("impact.bigBody", { shop: fmtRM(monthlySave), year: fmtRM(proj.yearly), five: fmtRM(proj.fiveYear) }) + '</p></div>' +
    '</div>';

    $("#impact-body").innerHTML = html;

    // animate the ring from 0
    var arc = $("#impact-body .health-ring circle:last-of-type");
    if (arc && !REDUCED) {
      arc.setAttribute("stroke-dasharray", "0 100");
      requestAnimationFrame(function () { requestAnimationFrame(function () { arc.setAttribute("stroke-dasharray", (0.75 * health.score).toFixed(2) + " 100"); }); });
    }
  }

  // ============================================================================
  //  Navigation
  // ============================================================================
  var RENDERERS = {
    basket: renderBasket, review: renderReview, optimising: renderOptimising,
    strategies: renderStrategies, plan: renderPlan, shop: renderShop,
    confirm: renderConfirm, impact: renderImpact,
  };

  // Screens that require a computed result; sending the user back to start if missing.
  var NEEDS_RESULT = { strategies: 1, plan: 1, shop: 1, confirm: 1, impact: 1 };

  function goTo(name) {
    if (NEEDS_RESULT[name] && !state.result) name = "location";
    if ((name === "review" || name === "basket") && basketItemCount() === 0 && name === "review") name = "basket";
    state.screen = name;
    $all(".screen").forEach(function (s) { s.classList.toggle("active", s.getAttribute("data-screen") === name); });
    if (RENDERERS[name]) RENDERERS[name]();
    updateProgress(name);
    window.scrollTo({ top: 0, behavior: "smooth" });
    celebrate(name);
  }

  var PHASE_OF = { location: 0, household: 0, basket: 1, review: 1, optimising: 2, strategies: 2, plan: 3, shop: 3, confirm: 3, impact: 4 };
  function updateProgress(name) {
    var idx = PHASE_OF[name];
    if (idx === undefined) { $("#progress").innerHTML = ""; return; }
    var pips = "";
    for (var i = 0; i < 5; i++) {
      var cls = "pip" + (i === idx ? " active" : i < idx ? " done" : "");
      pips += '<span class="' + cls + '"></span>';
    }
    $("#progress").innerHTML = pips;
  }

  function celebrate(name) {
    if (name === "strategies") setTimeout(function () { confetti({ count: 150, y: window.innerHeight * 0.24 }); }, 420);
    else if (name === "impact") setTimeout(function () { confetti({ count: 170, y: window.innerHeight * 0.22 }); }, 360);
  }

  // ============================================================================
  //  Boot / wiring
  // ============================================================================
  function init() {
    try { localStorage.removeItem("jimat-session"); } catch (e) {}

    // --- Location: state / district selects (real DOSM states -> districts) ---
    var stateSel = $("#in-state"), areaSel = $("#in-area");
    // Rebuilt whenever the language changes; each preserves the current selection.
    // (State/district NAMES are real DOSM data and stay untranslated — only the
    // "choose…" placeholder is localized.)
    function fillStateOptions() {
      var v = stateSel.value;
      stateSel.innerHTML = '<option value="" disabled' + (v ? "" : " selected") + '>' + esc(t("loc.chooseState")) + '</option>' +
        D.STATES.map(function (s) { return '<option value="' + s.key + '">' + esc(s.name) + '</option>'; }).join("");
      if (v) stateSel.value = v;
    }
    function fillDistricts(stateKey) {
      var v = areaSel.value;
      var st = D.stateByKey(stateKey);
      areaSel.innerHTML = '<option value="" disabled' + (v ? "" : " selected") + '>' + esc(t("loc.chooseDistrict")) + '</option>' +
        (st ? st.districts.map(function (d) { return '<option value="' + d.key + '">' + esc(d.name) + '</option>'; }).join("") : "");
      if (v) areaSel.value = v;
    }
    function refreshAreaPlaceholder() {
      if (stateSel.value) fillDistricts(stateSel.value);
      else areaSel.innerHTML = '<option value="" disabled selected>' + esc(t("loc.chooseStateFirst")) + '</option>';
    }
    fillStateOptions();
    refreshAreaPlaceholder();
    stateSel.addEventListener("change", function () { fillDistricts(stateSel.value); paintRadius(); });
    areaSel.addEventListener("change", paintRadius);

    // --- Location: radius slider ---
    var radius = $("#in-radius");
    // The centroid the preview counts around: selected district, else state's first district.
    function selectedCentroid() {
      if (stateSel.value && areaSel.value) {
        var d = D.districtByKey(stateSel.value, areaSel.value);
        if (d) return d;
      }
      var st = D.stateByKey(stateSel.value);
      if (st && st.districts.length) return st.districts[0];
      return null;
    }
    function paintRadius() {
      state.radius = parseInt(radius.value, 10);
      $("#radius-val").textContent = state.radius + " km";
      radius.style.setProperty("--pct", ((state.radius - 2) / 13 * 100) + "%");
      var c = selectedCentroid();
      if (c) {
        var n = D.storesInRange(c.lat, c.lon, state.radius);
        $("#radius-count").innerHTML = t("loc.radiusCount", {
          n: n, sw: t(n === 1 ? "w.store" : "w.stores"), r: state.radius });
      } else {
        $("#radius-count").innerHTML = esc(t("loc.radiusEmpty"));
      }
      // scale the outer ripple ring with the radius for a little life
      var rings = $all("#radius-ring .ripple-c");
      var ring = rings[rings.length - 1];
      if (ring) { var sc = 55 + (state.radius - 2) / 13 * 45; ring.style.width = sc + "%"; ring.style.height = sc + "%"; }
    }
    radius.addEventListener("input", paintRadius);
    paintRadius();

    $("#btn-location").addEventListener("click", function () {
      if (!stateSel.value || !areaSel.value) {
        (!stateSel.value ? stateSel : areaSel).focus();
        return;
      }
      var d = D.districtByKey(stateSel.value, areaSel.value);
      state.area = {
        stateKey: stateSel.value, districtKey: areaSel.value,
        name: D.areaName(stateSel.value, areaSel.value),
        lat: d ? d.lat : null, lon: d ? d.lon : null,
      };
      goTo("household");
    });

    // --- Household seg + budget ---
    var budget = $("#in-budget");
    $all("#in-household button").forEach(function (b) {
      b.addEventListener("click", function () {
        $all("#in-household button").forEach(function (x) { x.classList.remove("on"); });
        b.classList.add("on");
        state.household = b.getAttribute("data-v");
        budget.placeholder = String(D.BUDGET_PRESETS[state.household] || 650);
      });
    });
    budget.placeholder = String(D.BUDGET_PRESETS[state.household] || 650);

    $("#btn-household").addEventListener("click", function () {
      state.budget = parseFloat(budget.value) || null;
      goTo("basket");
    });

    // --- Basket grid interactions (delegated) ---
    $("#prod-grid").addEventListener("click", function (e) {
      var chip = e.target.closest ? e.target.closest("[data-cat]") : null;
      if (chip) { state.cat = chip.getAttribute("data-cat"); renderProdGrid($("#basket-search").value); return; }
      var b = e.target.closest ? e.target.closest("[data-act]") : null;
      if (!b) return;
      var id = b.getAttribute("data-id"), act = b.getAttribute("data-act");
      var q = state.qty[id] || 0;
      q = act === "plus" ? q + 1 : Math.max(0, q - 1);
      if (q === 0) delete state.qty[id]; else state.qty[id] = q;
      renderProdGrid($("#basket-search").value);
      updateSummary();
    });
    $("#basket-search").addEventListener("input", function () { renderProdGrid(this.value); });

    // --- Review / confirm continue buttons ---
    $("#btn-review").addEventListener("click", function () { goTo("optimising"); });
    $("#btn-strategies").addEventListener("click", function () { goTo("plan"); });
    $("#btn-confirm").addEventListener("click", function () {
      var a = $("#in-actual");
      // Empty = not confirmed; impact falls back to the plan estimate (no fake RM0 spend).
      state.actual = (a && a.value.trim() !== "") ? (parseFloat(a.value) || 0) : null;
      goTo("impact");
    });

    // --- Generic [data-go] nav ---
    $all("[data-go]").forEach(function (b) { b.addEventListener("click", function () { goTo(b.getAttribute("data-go")); }); });

    // --- Theme toggle ---
    var root = document.documentElement, saved = null;
    try { saved = localStorage.getItem("jimat-theme"); } catch (e) {}
    if (saved) root.setAttribute("data-theme", saved);
    else if (window.matchMedia && window.matchMedia("(prefers-color-scheme: dark)").matches) root.setAttribute("data-theme", "dark");
    $("#themeToggle").addEventListener("click", function () {
      var next = root.getAttribute("data-theme") === "dark" ? "light" : "dark";
      root.setAttribute("data-theme", next);
      try { localStorage.setItem("jimat-theme", next); } catch (e) {}
    });

    // --- Language selector: build options, switch + persist, re-paint on change ---
    if (T) {
      var langSel = $("#langSel");
      T.buildSelector(langSel);
      T.applyStatic(document);          // translate static screens to the saved language
      if (langSel) langSel.addEventListener("change", function () { T.setLang(langSel.value); });
      T.onChange(function () {
        T.applyStatic(document);        // static text / placeholders / titles
        fillStateOptions();             // rebuild dropdown placeholders (selection kept)
        refreshAreaPlaceholder();
        budget.placeholder = String(D.BUDGET_PRESETS[state.household] || 650);
        paintRadius();                  // radius-count sentence
        if (RENDERERS[state.screen]) RENDERERS[state.screen]();   // current dynamic screen
      });
    }

    // --- Ripple feedback ---
    document.addEventListener("click", function (e) {
      var b = e.target.closest ? e.target.closest(".btn") : null;
      if (!b) return;
      var rect = b.getBoundingClientRect(), d = Math.max(rect.width, rect.height);
      var rip = document.createElement("span");
      rip.className = "ripple";
      rip.style.width = rip.style.height = d + "px";
      rip.style.left = (e.clientX - rect.left - d / 2) + "px";
      rip.style.top = (e.clientY - rect.top - d / 2) + "px";
      b.appendChild(rip);
      setTimeout(function () { rip.remove(); }, 620);
    });

    updateProgress("landing");
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", init);
  else init();
})();
