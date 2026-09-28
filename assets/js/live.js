/* ==========================================================================
   JIMAT - Live DOSM anchor
   Creator: Tan Wei Siang. Fully owned by Tan Wei Siang.
   --------------------------------------------------------------------------
   Honest hybrid, same idea as KAYA:
     - PRICES are a dated DOSM PriceCatcher snapshot baked into snapshot.js
       (works fully offline / from file://). DOSM does not expose PriceCatcher
       over a browser-reachable JSON API, so prices cannot refresh live.
     - INFLATION is the one DOSM series that IS browser-reachable
       (api.data.gov.my CPI). We fetch it to show a live freshness anchor and
       label how current the picture is. Fails gracefully to the snapshot.

   Nothing is invented: if the live call fails we say so and fall back to the
   baked snapshot month. Updates the header data-pill in place.
   ========================================================================== */
(function () {
  "use strict";

  var META = (window.JIMAT_DATA && window.JIMAT_DATA.META) || {};
  var CPI_URL = "https://api.data.gov.my/data-catalogue/?id=cpi_headline" +
    "&filter=overall@division&sort=-date&limit=14";

  var status = {
    priceMonth: META.price_month || null,   // baked snapshot month (real)
    source: META.source || "DOSM PriceCatcher (data.gov.my open data)",
    cpiYoY: null,                            // live YoY inflation, if reachable
    cpiDate: null,
    live: false,                             // did the live anchor load?
  };

  function monthLabel(ym) {
    if (!ym) return "";
    var parts = String(ym).split("-");
    var names = ["", "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
    var m = parseInt(parts[1], 10);
    return (names[m] || "") + " " + parts[0];
  }

  function paintPill() {
    var pill = document.getElementById("data-pill");
    if (!pill) return;
    var txt = "DOSM prices - " + (monthLabel(status.priceMonth) || "snapshot");
    var title = status.source +
      "\nReal store names, addresses and monthly average prices." +
      "\nDistances are geocoded approximations - use Maps / Waze for routing.";
    if (status.live && status.cpiYoY != null) {
      txt += " - CPI " + (status.cpiYoY >= 0 ? "+" : "") + status.cpiYoY.toFixed(1) + "%";
      title += "\nLive DOSM CPI (headline, YoY) as of " + monthLabel(status.cpiDate) + ".";
    }
    pill.innerHTML = '<span class="d"></span>' + txt;
    pill.setAttribute("title", title);
  }

  function refresh() {
    paintPill(); // paint the honest baked state immediately
    if (typeof fetch !== "function") return;
    fetch(CPI_URL, { mode: "cors" })
      .then(function (r) { return r.ok ? r.json() : Promise.reject(r.status); })
      .then(function (rows) {
        if (!Array.isArray(rows) || rows.length < 13) return;
        // rows sorted -date; index 0 latest, index 12 same month last year.
        var latest = rows[0], prior = rows[12];
        if (!latest || !prior || !prior.index) return;
        var yoy = (latest.index / prior.index - 1) * 100;
        if (isFinite(yoy)) {
          status.cpiYoY = yoy;
          status.cpiDate = (latest.date || "").slice(0, 7);
          status.live = true;
          paintPill();
        }
      })
      .catch(function () { /* offline / blocked: keep the baked snapshot label */ });
  }

  window.JIMAT_LIVE = { status: status, refresh: refresh };

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", refresh);
  } else {
    refresh();
  }
})();
