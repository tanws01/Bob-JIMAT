/*
 * JIMAT - Basket optimisation engine
 * Creator: Tan Wei Siang. Fully owned by Tan Wei Siang.
 * ---------------------
 * Pure functions, no DOM. Given a basket (item -> qty) and a list of candidate
 * stores (real DOSM premises within the user's travel radius, each carrying real
 * prices + an approximate distance), it produces three shopping strategies
 * (Best Value / Most Convenient / Cheapest), a recommendation, a grocery-health
 * score and a long-term savings projection.
 */
(function () {
  "use strict";

  var D = window.JIMAT_DATA;
  var _index = {};   // storeId -> store, set per optimise() call

  function productById(id) { return D.PRODUCTS.find(function (p) { return p.id === id; }); }
  function storeById(id) { return _index[id]; }

  // Basket -> [{ id, product, qty }] for items with qty > 0.
  function items(basket) {
    return D.PRODUCTS
      .filter(function (p) { return (basket[p.id] || 0) > 0; })
      .map(function (p) { return { id: p.id, product: p, qty: basket[p.id] }; });
  }

  // The "current estimate" — what a typical shopper pays buying the whole basket
  // at the national average shelf price, without optimising. Savings baseline.
  function baselineTotal(basket) {
    return items(basket).reduce(function (sum, it) { return sum + it.product.base * it.qty; }, 0);
  }

  function price(store, id) {
    if (!store) return null;
    var v = store.prices[id];
    return (v === null || v === undefined) ? null : v;
  }

  // Return-trip travel cost to visit a set of distinct stores once.
  function travelCost(storeIds) {
    return storeIds.reduce(function (sum, id) {
      var s = storeById(id);
      return sum + (s ? s.distanceKm * 2 * D.TRAVEL_COST_PER_KM : 0);
    }, 0);
  }

  // Turn an item -> storeId assignment into a costed, per-store plan object.
  function buildPlan(basket, assignment, meta) {
    var its = items(basket);
    var byStore = {};      // storeId -> [{ it, unitPrice, lineTotal }]
    var missing = [];
    var itemCost = 0;

    its.forEach(function (it) {
      var sid = assignment[it.id];
      if (!sid) { missing.push(it); return; }
      var up = price(storeById(sid), it.id);
      if (up === null) { missing.push(it); return; }
      var line = up * it.qty;
      itemCost += line;
      (byStore[sid] = byStore[sid] || []).push({ it: it, unitPrice: up, lineTotal: line });
    });

    var storeIds = Object.keys(byStore);
    storeIds.sort(function (a, b) { return storeById(a).distanceKm - storeById(b).distanceKm; });

    var stores = storeIds.map(function (sid) {
      var s = storeById(sid);
      var lines = byStore[sid];
      return {
        id: sid, name: s.name, type: s.type, address: s.address,
        distanceKm: s.distanceKm, convenience: s.convenience, lat: s.lat, lon: s.lon,
        subtotal: lines.reduce(function (sum, l) { return sum + l.lineTotal; }, 0),
        lines: lines,
      };
    });

    var covered = its.length - missing.length;
    var coverage = its.length ? covered / its.length : 1;
    var travel = travelCost(storeIds);
    var baseline = baselineTotal(basket);

    return {
      key: meta.key, label: meta.label, tone: meta.tone, emoji: meta.emoji, blurb: meta.blurb,
      stores: stores, missing: missing,
      itemCost: itemCost, travel: travel, effective: itemCost + travel,
      stops: storeIds.length, coverage: coverage,
      baseline: baseline,
      save: baseline - itemCost,
      saveNet: baseline - (itemCost + travel),
      savePct: baseline > 0 ? (baseline - itemCost) / baseline : 0,
    };
  }

  // ---- Strategy A: Most convenient — one store -----------------------------
  function oneStorePlan(basket, stores) {
    var its = items(basket);
    var best = null;
    stores.forEach(function (s) {
      var cost = 0, covered = 0;
      its.forEach(function (it) {
        var up = price(s, it.id);
        if (up !== null) { cost += up * it.qty; covered++; }
      });
      var coverage = its.length ? covered / its.length : 1;
      var score = coverage * 1000 + s.convenience * 20 - s.distanceKm * 3 - cost * 0.01;
      if (!best || score > best.score) best = { store: s, score: score };
    });
    var assignment = {};
    if (best) its.forEach(function (it) {
      if (price(best.store, it.id) !== null) assignment[it.id] = best.store.id;
    });
    return buildPlan(basket, assignment, {
      key: "convenient", label: "Most Convenient", tone: "conv", emoji: "\u{1F535}",
      blurb: "Everything in one trip",
    });
  }

  // ---- Strategy C: Cheapest — buy every item at its lowest price ------------
  function cheapestPlan(basket, stores) {
    var its = items(basket);
    var assignment = {};
    its.forEach(function (it) {
      var bestStore = null, bestPrice = Infinity;
      stores.forEach(function (s) {
        var up = price(s, it.id);
        if (up !== null && up < bestPrice) { bestPrice = up; bestStore = s; }
      });
      if (bestStore) assignment[it.id] = bestStore.id;
    });
    return buildPlan(basket, assignment, {
      key: "cheapest", label: "Cheapest Possible", tone: "cheap", emoji: "\u{1F7E0}",
      blurb: "Rock-bottom price, more stops",
    });
  }

  // ---- Strategy B: Best value — smart two-store split ----------------------
  function twoStorePlan(basket, stores) {
    var its = items(basket);
    if (stores.length === 0) return buildPlan(basket, {}, bestValueMeta());

    var primary = null;
    stores.forEach(function (s) {
      var cost = 0, covered = 0;
      its.forEach(function (it) {
        var up = price(s, it.id);
        if (up !== null) { cost += up * it.qty; covered++; }
      });
      var coverage = its.length ? covered / its.length : 1;
      if (coverage < 0.6) return;
      var eff = cost + s.distanceKm * 2 * D.TRAVEL_COST_PER_KM - coverage * 40;
      if (!primary || eff < primary.eff) primary = { store: s, eff: eff };
    });
    if (!primary) primary = { store: stores.slice().sort(function (a, b) { return a.distanceKm - b.distanceKm; })[0] };
    var P = primary.store;

    var secondary = null;
    stores.forEach(function (s) {
      if (s.id === P.id) return;
      var gain = 0;
      its.forEach(function (it) {
        var ps = price(s, it.id); if (ps === null) return;
        var pp = price(P, it.id);
        var ref = pp !== null ? pp : it.product.base;
        var diff = (ref - ps) * it.qty;
        if (diff > 0) gain += diff;
      });
      var extraTravel = Math.abs(s.distanceKm - P.distanceKm) * 2 * D.TRAVEL_COST_PER_KM + 4;
      var net = gain - extraTravel;
      if (net > 3 && (!secondary || net > secondary.net)) secondary = { store: s, net: net };
    });

    var pool = [P];
    if (secondary) pool.push(secondary.store);

    var assignment = {};
    its.forEach(function (it) {
      var bestStore = null, bestPrice = Infinity;
      pool.forEach(function (s) {
        var up = price(s, it.id);
        if (up !== null && up < bestPrice) { bestPrice = up; bestStore = s; }
      });
      if (bestStore) assignment[it.id] = bestStore.id;
    });
    return buildPlan(basket, assignment, bestValueMeta());
  }

  function bestValueMeta() {
    return { key: "best", label: "Best Value", tone: "best", emoji: "\u{1F7E2}",
      blurb: "Smartest price-per-effort" };
  }

  // Star rating (1-5) for a plan card.
  function stars(plan, plans) {
    var maxSave = Math.max.apply(null, plans.map(function (p) { return p.save; }).concat([1]));
    var saveScore = plan.save / maxSave;
    var effort = 1 - Math.min(1, (plan.stops - 1) / 3);
    var cover = plan.coverage;
    var blend;
    if (plan.key === "best") blend = 0.5 * saveScore + 0.3 * effort + 0.2 * cover + 0.15;
    else if (plan.key === "convenient") blend = 0.25 * saveScore + 0.55 * effort + 0.2 * cover;
    else blend = 0.6 * saveScore + 0.1 * effort + 0.3 * cover;
    return Math.max(2, Math.min(5, Math.round(blend * 5)));
  }

  // ---- Public: full optimisation -------------------------------------------
  function optimise(basket, stores) {
    stores = stores || [];
    _index = {};
    stores.forEach(function (s) { _index[s.id] = s; });

    var best = twoStorePlan(basket, stores);
    var conv = oneStorePlan(basket, stores);
    var cheap = cheapestPlan(basket, stores);
    var plans = [best, conv, cheap];
    plans.forEach(function (p) { p.stars = stars(p, plans); });
    return { best: best, convenient: conv, cheapest: cheap, all: plans, recommended: best, candidateCount: stores.length };
  }

  // ---- Grocery health score (0-100) ----------------------------------------
  // Scores the REAL outcome, not the theoretical plan: it uses what the shopper
  // actually spent (falling back to the plan cost only if they never confirmed).
  function groceryHealth(plan, budget, actual) {
    var baseline = plan.baseline;
    var spend = (actual === null || actual === undefined) ? plan.itemCost : actual;
    var realSavePct = baseline > 0 ? (baseline - spend) / baseline : 0;

    // 1) Savings captured vs a healthy ~15% target (0 if you overspent).
    var savingsScore = Math.max(0, Math.min(1, realSavePct / 0.15));
    // 2) Basket coverage — did the plan find everything you wanted.
    var coverageScore = plan.coverage;
    // 3) Spending discipline — under budget if set, else at/under the estimate.
    var hasBudget = budget && budget > 0;
    var target = hasBudget ? budget : baseline;
    var ratio = target > 0 ? spend / target : 1;
    var budgetScore = ratio <= 1 ? 1 : Math.max(0, 1 - (ratio - 1) * 1.2);

    var score = Math.round(100 * (0.45 * savingsScore + 0.30 * coverageScore + 0.25 * budgetScore));
    score = Math.max(0, Math.min(100, score));
    // `key` drives the CSS status class (good/warning/critical); `id` is a stable
    // identifier the UI uses to translate the human label.
    var band = score >= 85 ? { key: "good", id: "excellent", label: "Excellent", color: "var(--good)" }
      : score >= 70 ? { key: "good", id: "healthy", label: "Healthy", color: "var(--good)" }
      : score >= 50 ? { key: "warning", id: "improve", label: "Could improve", color: "var(--warning)" }
      : { key: "critical", id: "attention", label: "Needs attention", color: "var(--critical)" };
    return {
      score: score, band: band,
      parts: [
        { pkey: "savings", name: "Savings captured", emoji: "\u{1F4B0}", pct: Math.round(savingsScore * 100) },
        { pkey: "coverage", name: "Basket coverage", emoji: "\u{1F6D2}", pct: Math.round(coverageScore * 100) },
        { pkey: hasBudget ? "budget" : "estimate", name: hasBudget ? "Within budget" : "At or under estimate", emoji: "\u{1F3AF}", pct: Math.round(budgetScore * 100) },
      ],
    };
  }

  // ---- Price intelligence ---------------------------------------------------
  // Deterministic per-item trend seeded from the item id (stable per session).
  function priceIntel(basket) {
    function seeded(id) { var h = 0; for (var i = 0; i < id.length; i++) h = (h * 31 + id.charCodeAt(i)) % 997; return h / 997; }
    return items(basket).map(function (it) {
      var s = seeded(it.id);
      var deltaPct = (s - 0.5) * 14;
      var avg = it.product.base / (1 + deltaPct / 100);
      var spark = [];
      for (var i = 0; i < 7; i++) {
        spark.push(0.5 + 0.35 * Math.sin((s * 6.28) + i * 0.9) + (i === 6 ? deltaPct / 40 : 0));
      }
      return {
        id: it.id, product: it.product, price: it.product.base, avg: avg, deltaPct: deltaPct,
        good: deltaPct < -1.5, high: deltaPct > 1.5, spark: spark,
      };
    }).sort(function (a, b) { return a.deltaPct - b.deltaPct; });
  }

  // ---- Long-term projection -------------------------------------------------
  function project(monthlySave) {
    var years = [];
    for (var y = 1; y <= 5; y++) years.push({ year: y, total: monthlySave * 12 * y });
    return { monthly: monthlySave, yearly: monthlySave * 12, fiveYear: monthlySave * 60, years: years };
  }

  window.JIMAT_ENGINE = {
    items: items,
    baselineTotal: baselineTotal,
    optimise: optimise,
    groceryHealth: groceryHealth,
    priceIntel: priceIntel,
    project: project,
    productById: productById,
  };
})();
