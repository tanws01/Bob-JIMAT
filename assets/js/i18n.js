/*
 * JIMAT — i18n (multi-language layer)
 * Creator: Tan Wei Siang. Fully owned by Tan Wei Siang.
 * -----------------------------------
 * A tiny, dependency-free translation layer, mirroring KAYA's approach. English
 * is the default/base; Bahasa Melayu, Chinese (Simplified) and Tamil are provided
 * in full. Missing keys fall back to English so the app never shows a raw key.
 *
 * Usage:
 *   JIMAT_I18N.t("landing.cta")                    -> current-language string
 *   JIMAT_I18N.t("opt.lead", { area: "Ipoh, ..." }) -> with {placeholder} substitution
 *   JIMAT_I18N.setLang("ms")                        -> switch + persist + notify
 *
 * Static HTML is translated by tagging elements:
 *   data-i18n="key"        -> element.textContent = t(key)
 *   data-i18n-html="key"   -> element.innerHTML   = t(key)   (translation may contain markup)
 *   data-i18n-ph="key"     -> element.placeholder = t(key)
 *   data-i18n-title="key"  -> element.title       = t(key)
 *   data-i18n-aria="key"   -> element.aria-label  = t(key)
 * then calling JIMAT_I18N.applyStatic(root).
 *
 * REAL DOSM data (item names, units, store names, addresses, state/district
 * names), "RM" and the "JIMAT" brand are intentionally NOT translated — they are
 * proper nouns / source data and stay identical across languages.
 */
(function () {
  "use strict";

  var LANGS = [
    { code: "en", label: "English" },
    { code: "ms", label: "Bahasa Melayu" },
    { code: "zh", label: "中文（简体）" },
    { code: "ta", label: "தமிழ்" }
  ];

  var LS_KEY = "jimat-lang";
  var cur = "en";
  var listeners = [];

  var DICT = { en: {}, ms: {}, zh: {}, ta: {} };

  // ---------------------------------------------------------------- English --
  DICT.en = {
    // common / header / nav
    "ui.language": "Language",
    "ui.themeToggle": "Toggle light / dark",
    "ui.back": "← Back",
    "ui.editBasket": "← Edit basket",
    "ui.compareAgain": "← Compare again",
    "ui.backToPlan": "← Back to plan",
    "ui.continue": "Continue →",
    "data.pill": "DOSM open data",

    // months (pipe-separated, Jan..Dec) + "as of" label for backfilled prices
    "months": "Jan|Feb|Mar|Apr|May|Jun|Jul|Aug|Sep|Oct|Nov|Dec",
    "asofFmt": "{m} {y}",
    "basket.asof": "as of {when}",
    "basket.asofTitle": "No price this month — most recent real DOSM price",

    // plural word stems (built as "{n} {word}" in the UI)
    "w.item": "item", "w.items": "items",
    "w.store": "store", "w.stores": "stores",
    "w.stop": "stop", "w.stops": "stops",

    // categories (real DOSM item groups)
    "cat.fresh": "Fresh Produce",
    "cat.pantry": "Pantry Staples",
    "cat.packaged": "Packaged & Cooking",
    "cat.drinks": "Drinks & Dairy",
    "cat.baby": "Milk & Baby",
    "cat.home": "Daily Necessities",

    // landing
    "landing.badge": "Powered by Malaysia's open price data",
    "landing.title": "Stop overpaying<br />for your groceries",
    "landing.sub": "Don't just find the cheapest product — find the <strong>smartest way to buy your whole basket</strong>. JIMAT weighs price, distance and convenience, then hands you three ready-to-shop plans.",
    "landing.cta": "🛒 Optimise my basket →",
    "landing.stat1v": "RM1,032",
    "landing.stat1k": "saved / year, average basket",
    "landing.stat2v": "~12%",
    "landing.stat2k": "lower spend, same groceries",
    "landing.stat3v": "3 plans",
    "landing.stat3k": "in seconds, tailored to you",

    // location
    "loc.step": "Step 1 — Where are you shopping?",
    "loc.title": "Set your location",
    "loc.lead": "JIMAT finds the stores near you and how far you're willing to travel for a better price.",
    "loc.state": "📍 State",
    "loc.district": "📍 District",
    "loc.travel": "🚗 How far will you travel?",
    "loc.radiusLabel": "Search radius",
    "loc.chooseState": "Choose your state",
    "loc.chooseDistrict": "Choose your district",
    "loc.chooseStateFirst": "Choose your state first",
    "loc.radiusCount": "<b>{n}</b> real DOSM {sw} within ~{r} km",
    "loc.radiusEmpty": "Pick a state and district to see stores in range.",

    // household
    "hh.step": "Step 2 — About your household",
    "hh.title": "Who are you shopping for?",
    "hh.lead": "This sets a sensible monthly grocery budget to compare against. You'll build your basket next.",
    "hh.size": "👪 Household size",
    "hh.single": "Just me",
    "hh.couple": "Couple",
    "hh.family": "Family",
    "hh.large": "Big family",
    "hh.budget": "🎯 Monthly grocery budget <span class=\"muted small\">(optional)</span>",
    "hh.cta": "Build my basket →",

    // basket
    "basket.step": "Step 3 — Build your basket",
    "basket.title": "What do you need?",
    "basket.lead": "Nothing is preselected — browse by category or search, then add what you actually need and set quantities.",
    "basket.search": "🔍 Search groceries — eggs, rice, oil…",
    "basket.all": "🛒 All",
    "basket.add": "+ Add",
    "basket.noMatch": "No groceries match that search.",
    "basket.within": "Within your {budget} budget",
    "basket.over": "Over your {budget} budget",
    "basket.estimate": "Est. at national average price (DOSM)",
    "basket.reviewCta": "Review basket →",

    // review
    "review.step": "Step 4 — Review your basket",
    "review.title": "Here's what you're buying",
    "review.lead": "This is the current estimate at average shelf prices — your savings baseline.",
    "review.total": "Current estimate",
    "review.cta": "Find my savings →",
    "review.onBudget": "🎯 On budget",
    "review.overBudget": "⚠️ Over budget",
    "review.budgetWithin": "At average prices this basket is {basket} against your {budget} budget. JIMAT will try to push it lower.",
    "review.budgetOver": "At average prices this basket is {basket} against your {budget} budget. JIMAT will find where to trim it.",
    "review.storesNote": "📍 {area} · {n} real DOSM {sw} within ~{r} km",

    // optimising
    "opt.step1": "🛰️ Scanning nearby stores",
    "opt.step2": "🔎 Comparing every item across stores",
    "opt.step3": "🚗 Weighing price against travel cost",
    "opt.step4": "🧠 Building your 3 smart plans",
    "opt.title": "Finding your best way to shop…",
    "opt.lead": "Crunching {items} across {stores} near {area}.",

    // strategies
    "strat.step": "Step 5 — Your optimised plans",
    "strat.title": "Three smart ways to shop",
    "strat.lead": "Same groceries, three strategies. We recommend <strong>Best Value</strong> — the smartest balance of price, distance and effort.",
    "strat.recLabel": "Best Value saves you",
    "strat.recSub": "this shop · about {year} a year · {pct}% off your estimate",
    "strat.tapHint": "Tap a plan to choose it — then hit continue.",
    "strat.cta": "Use this plan →",
    "strat.useX": "Use {plan} →",
    "strat.ribbon": "RECOMMENDED",
    "strat.save": "save {rm}",
    "strat.travel": "travel",
    "strat.found": "found",
    "strat.notFound": "{n} not found",

    // plan strategy labels / tags / blurbs (keyed by engine plan.key)
    "plan.best.label": "Best Value",
    "plan.best.tag": "BEST VALUE",
    "plan.best.blurb": "Smartest price-per-effort",
    "plan.convenient.label": "Most Convenient",
    "plan.convenient.tag": "MOST CONVENIENT",
    "plan.convenient.blurb": "Everything in one trip",
    "plan.cheapest.label": "Cheapest Possible",
    "plan.cheapest.tag": "CHEAPEST",
    "plan.cheapest.blurb": "Rock-bottom price, more stops",

    // shopping plan
    "plan.step": "Step 6 — Your shopping plan",
    "plan.titleFmt": "{label} plan",
    "plan.lead": "{stops} near {area}. Follow the route below — each stop has its own checklist and directions.",
    "plan.statBasket": "Basket total",
    "plan.statSave": "You save",
    "plan.statStore": "Store to visit",
    "plan.statStores": "Stores to visit",
    "plan.miss": "⚠️ Not available within your radius: {list}",
    "plan.startCta": "Start shopping →",
    "plan.inArea": "in your area",
    "plan.kmApprox": "~{km} km approx",

    // shopping mode
    "shop.step": "Step 7 — Shopping mode",
    "shop.title": "Tick items as you go",
    "shop.progress": "Progress",
    "shop.progressVal": "{done} / {total} items",
    "shop.picked": "Picked up so far",
    "shop.doneTitle": "🎉 All done!",
    "shop.doneBody": "Basket complete. Head to checkout, then confirm what you actually spent.",
    "shop.doneCta": "Done shopping →",

    // confirm
    "confirm.step": "Step 8 — Confirm your savings",
    "confirm.title": "What did you actually spend?",
    "confirm.lead": "Enter your real total from the receipts. JIMAT compares it to your {estimate} estimate to lock in your savings.",
    "confirm.label": "🧾 Actual amount spent",
    "confirm.saved": "You saved",
    "confirm.overspent": "You overspent",
    "confirm.emptySub": "Enter your receipt total to see your savings",
    "confirm.vsEstimate": "vs your {estimate} estimate",
    "confirm.pctOff": " · {pct}% off",
    "confirm.pctOver": " · {pct}% over",
    "confirm.cta": "See my impact →",

    // impact
    "impact.newBasket": "↺ Start a new basket",
    "impact.eyebrow": "Your impact",
    "impact.title": "💰 Savings dashboard",
    "impact.lead": "Here's what shopping smart with JIMAT did for you — this month and over time.",
    "impact.savedShop": "Saved this shop",
    "impact.projYear": "Projected / year",
    "impact.storesVisited": "Stores visited",
    "impact.healthTitle": "🩺 Grocery health score",
    "impact.healthSub": "How well this shop went — savings, coverage and budget fit.",
    "impact.outOf": "out of 100",
    "impact.ringAria": "Grocery health {score} of 100",
    "health.excellent": "Excellent",
    "health.healthy": "Healthy",
    "health.improve": "Could improve",
    "health.attention": "Needs attention",
    "health.savings": "Savings captured",
    "health.coverage": "Basket coverage",
    "health.budget": "Within budget",
    "health.estimate": "At or under estimate",
    "impact.intelTitle": "📈 Price intelligence",
    "impact.intelSub": "Buy at the right time, not just the right place — today vs the 30-day average.",
    "impact.intelAvg": "30-day avg {rm}",
    "impact.flagLow": "📉 {pct}% low",
    "impact.flagHigh": "📈 {pct}% high",
    "impact.flagAvg": "≈ average",
    "impact.journeyTitle": "🚀 Your long-term savings journey",
    "impact.journeySub": "Keep shopping smart and small savings compound into real money.",
    "impact.yearLabel": "Year {y}",
    "impact.bigTitle": "💡 The big picture",
    "impact.bigBody": "Saving {shop} a shop is {year} a year — and about <strong>{five} over five years</strong>. That's a holiday, an emergency fund, or a month of rent, just from buying the same groceries the smarter way."
  };

  // ----------------------------------------------------------- Bahasa Melayu --
  DICT.ms = {
    "ui.language": "Bahasa",
    "ui.themeToggle": "Tukar cerah / gelap",
    "ui.back": "← Kembali",
    "ui.editBasket": "← Sunting bakul",
    "ui.compareAgain": "← Banding semula",
    "ui.backToPlan": "← Kembali ke pelan",
    "ui.continue": "Teruskan →",
    "data.pill": "Data terbuka DOSM",

    "months": "Jan|Feb|Mac|Apr|Mei|Jun|Jul|Ogo|Sep|Okt|Nov|Dis",
    "asofFmt": "{m} {y}",
    "basket.asof": "sehingga {when}",
    "basket.asofTitle": "Tiada harga bulan ini — harga DOSM sebenar terkini",

    "w.item": "barang", "w.items": "barang",
    "w.store": "kedai", "w.stores": "kedai",
    "w.stop": "hentian", "w.stops": "hentian",

    "cat.fresh": "Barangan Segar",
    "cat.pantry": "Barangan Dapur",
    "cat.packaged": "Berbungkus & Memasak",
    "cat.drinks": "Minuman & Tenusu",
    "cat.baby": "Susu & Bayi",
    "cat.home": "Keperluan Harian",

    "landing.badge": "Dikuasakan oleh data harga terbuka Malaysia",
    "landing.title": "Berhenti membayar lebih<br />untuk barangan runcit anda",
    "landing.sub": "Jangan cari produk termurah sahaja — cari <strong>cara paling bijak untuk membeli seluruh bakul anda</strong>. JIMAT menimbang harga, jarak dan kemudahan, kemudian memberikan anda tiga pelan sedia beli-belah.",
    "landing.cta": "🛒 Optimumkan bakul saya →",
    "landing.stat1v": "RM1,032",
    "landing.stat1k": "jimat / tahun, bakul purata",
    "landing.stat2v": "~12%",
    "landing.stat2k": "belanja lebih rendah, barang sama",
    "landing.stat3v": "3 pelan",
    "landing.stat3k": "dalam beberapa saat, khusus untuk anda",

    "loc.step": "Langkah 1 — Di mana anda membeli-belah?",
    "loc.title": "Tetapkan lokasi anda",
    "loc.lead": "JIMAT mencari kedai berhampiran anda dan sejauh mana anda sanggup pergi untuk harga yang lebih baik.",
    "loc.state": "📍 Negeri",
    "loc.district": "📍 Daerah",
    "loc.travel": "🚗 Sejauh mana anda akan pergi?",
    "loc.radiusLabel": "Jejari carian",
    "loc.chooseState": "Pilih negeri anda",
    "loc.chooseDistrict": "Pilih daerah anda",
    "loc.chooseStateFirst": "Pilih negeri anda dahulu",
    "loc.radiusCount": "<b>{n}</b> {sw} DOSM sebenar dalam ~{r} km",
    "loc.radiusEmpty": "Pilih negeri dan daerah untuk melihat kedai dalam lingkungan.",

    "hh.step": "Langkah 2 — Tentang isi rumah anda",
    "hh.title": "Untuk siapa anda membeli-belah?",
    "hh.lead": "Ini menetapkan bajet barangan runcit bulanan yang munasabah untuk dibandingkan. Anda akan membina bakul seterusnya.",
    "hh.size": "👪 Saiz isi rumah",
    "hh.single": "Saya sahaja",
    "hh.couple": "Pasangan",
    "hh.family": "Keluarga",
    "hh.large": "Keluarga besar",
    "hh.budget": "🎯 Bajet runcit bulanan <span class=\"muted small\">(pilihan)</span>",
    "hh.cta": "Bina bakul saya →",

    "basket.step": "Langkah 3 — Bina bakul anda",
    "basket.title": "Apa yang anda perlukan?",
    "basket.lead": "Tiada apa-apa dipilih dahulu — semak ikut kategori atau cari, kemudian tambah apa yang anda perlukan dan tetapkan kuantiti.",
    "basket.search": "🔍 Cari barangan — telur, beras, minyak…",
    "basket.all": "🛒 Semua",
    "basket.add": "+ Tambah",
    "basket.noMatch": "Tiada barangan sepadan dengan carian itu.",
    "basket.within": "Dalam bajet {budget} anda",
    "basket.over": "Melebihi bajet {budget} anda",
    "basket.estimate": "Anggaran pada harga purata kebangsaan (DOSM)",
    "basket.reviewCta": "Semak bakul →",

    "review.step": "Langkah 4 — Semak bakul anda",
    "review.title": "Inilah yang anda beli",
    "review.lead": "Ini anggaran semasa pada harga rak purata — asas penjimatan anda.",
    "review.total": "Anggaran semasa",
    "review.cta": "Cari penjimatan saya →",
    "review.onBudget": "🎯 Ikut bajet",
    "review.overBudget": "⚠️ Melebihi bajet",
    "review.budgetWithin": "Pada harga purata, bakul ini {basket} berbanding bajet {budget} anda. JIMAT akan cuba menurunkannya lagi.",
    "review.budgetOver": "Pada harga purata, bakul ini {basket} berbanding bajet {budget} anda. JIMAT akan cari di mana untuk memangkasnya.",
    "review.storesNote": "📍 {area} · {n} {sw} DOSM sebenar dalam ~{r} km",

    "opt.step1": "🛰️ Mengimbas kedai berdekatan",
    "opt.step2": "🔎 Membandingkan setiap barang antara kedai",
    "opt.step3": "🚗 Menimbang harga berbanding kos perjalanan",
    "opt.step4": "🧠 Membina 3 pelan bijak anda",
    "opt.title": "Mencari cara terbaik untuk anda membeli-belah…",
    "opt.lead": "Menganalisis {items} merentas {stores} berhampiran {area}.",

    "strat.step": "Langkah 5 — Pelan optimum anda",
    "strat.title": "Tiga cara bijak membeli-belah",
    "strat.lead": "Barangan sama, tiga strategi. Kami mengesyorkan <strong>Nilai Terbaik</strong> — imbangan paling bijak antara harga, jarak dan usaha.",
    "strat.recLabel": "Nilai Terbaik menjimatkan anda",
    "strat.recSub": "beli-belah ini · kira-kira {year} setahun · {pct}% daripada anggaran anda",
    "strat.tapHint": "Ketik satu pelan untuk memilihnya — kemudian tekan teruskan.",
    "strat.cta": "Guna pelan ini →",
    "strat.useX": "Guna {plan} →",
    "strat.ribbon": "DISYORKAN",
    "strat.save": "jimat {rm}",
    "strat.travel": "perjalanan",
    "strat.found": "dijumpai",
    "strat.notFound": "{n} tidak dijumpai",

    "plan.best.label": "Nilai Terbaik",
    "plan.best.tag": "NILAI TERBAIK",
    "plan.best.blurb": "Harga-per-usaha paling bijak",
    "plan.convenient.label": "Paling Mudah",
    "plan.convenient.tag": "PALING MUDAH",
    "plan.convenient.blurb": "Semuanya dalam satu perjalanan",
    "plan.cheapest.label": "Paling Murah",
    "plan.cheapest.tag": "PALING MURAH",
    "plan.cheapest.blurb": "Harga paling rendah, lebih banyak hentian",

    "plan.step": "Langkah 6 — Pelan beli-belah anda",
    "plan.titleFmt": "Pelan {label}",
    "plan.lead": "{stops} berhampiran {area}. Ikuti laluan di bawah — setiap hentian ada senarai semak dan arahnya sendiri.",
    "plan.statBasket": "Jumlah bakul",
    "plan.statSave": "Anda jimat",
    "plan.statStore": "Kedai untuk dilawati",
    "plan.statStores": "Kedai untuk dilawati",
    "plan.miss": "⚠️ Tiada dalam jejari anda: {list}",
    "plan.startCta": "Mula beli-belah →",
    "plan.inArea": "di kawasan anda",
    "plan.kmApprox": "~{km} km anggaran",

    "shop.step": "Langkah 7 — Mod beli-belah",
    "shop.title": "Tanda barang sambil anda beli",
    "shop.progress": "Kemajuan",
    "shop.progressVal": "{done} / {total} barang",
    "shop.picked": "Diambil setakat ini",
    "shop.doneTitle": "🎉 Selesai semua!",
    "shop.doneBody": "Bakul lengkap. Pergi ke kaunter bayaran, kemudian sahkan jumlah sebenar yang anda belanjakan.",
    "shop.doneCta": "Selesai beli-belah →",

    "confirm.step": "Langkah 8 — Sahkan penjimatan anda",
    "confirm.title": "Berapa sebenarnya anda belanjakan?",
    "confirm.lead": "Masukkan jumlah sebenar daripada resit. JIMAT membandingkannya dengan anggaran {estimate} anda untuk mengunci penjimatan anda.",
    "confirm.label": "🧾 Jumlah sebenar dibelanjakan",
    "confirm.saved": "Anda menjimatkan",
    "confirm.overspent": "Anda terlebih belanja",
    "confirm.emptySub": "Masukkan jumlah resit anda untuk melihat penjimatan",
    "confirm.vsEstimate": "berbanding anggaran {estimate} anda",
    "confirm.pctOff": " · {pct}% kurang",
    "confirm.pctOver": " · {pct}% lebih",
    "confirm.cta": "Lihat impak saya →",

    "impact.newBasket": "↺ Mula bakul baharu",
    "impact.eyebrow": "Impak anda",
    "impact.title": "💰 Papan pemuka penjimatan",
    "impact.lead": "Inilah hasil membeli-belah bijak dengan JIMAT — bulan ini dan dari masa ke masa.",
    "impact.savedShop": "Jimat beli-belah ini",
    "impact.projYear": "Unjuran / tahun",
    "impact.storesVisited": "Kedai dilawati",
    "impact.healthTitle": "🩺 Skor kesihatan runcit",
    "impact.healthSub": "Sejauh mana baiknya beli-belah ini — penjimatan, liputan dan kesesuaian bajet.",
    "impact.outOf": "daripada 100",
    "impact.ringAria": "Skor kesihatan runcit {score} daripada 100",
    "health.excellent": "Cemerlang",
    "health.healthy": "Sihat",
    "health.improve": "Boleh diperbaiki",
    "health.attention": "Perlu perhatian",
    "health.savings": "Penjimatan diperoleh",
    "health.coverage": "Liputan bakul",
    "health.budget": "Dalam bajet",
    "health.estimate": "Pada atau bawah anggaran",
    "impact.intelTitle": "📈 Kecerdasan harga",
    "impact.intelSub": "Beli pada masa yang betul, bukan sekadar tempat yang betul — hari ini berbanding purata 30 hari.",
    "impact.intelAvg": "purata 30 hari {rm}",
    "impact.flagLow": "📉 {pct}% rendah",
    "impact.flagHigh": "📈 {pct}% tinggi",
    "impact.flagAvg": "≈ purata",
    "impact.journeyTitle": "🚀 Perjalanan penjimatan jangka panjang anda",
    "impact.journeySub": "Terus membeli-belah bijak dan penjimatan kecil terkumpul menjadi wang sebenar.",
    "impact.yearLabel": "Tahun {y}",
    "impact.bigTitle": "💡 Gambaran besar",
    "impact.bigBody": "Menjimatkan {shop} setiap beli-belah ialah {year} setahun — dan kira-kira <strong>{five} dalam lima tahun</strong>. Itu percutian, dana kecemasan, atau sebulan sewa, hanya dengan membeli barangan yang sama secara lebih bijak."
  };

  // ------------------------------------------------------ Chinese (Simplified) --
  DICT.zh = {
    "ui.language": "语言",
    "ui.themeToggle": "切换明 / 暗",
    "ui.back": "← 返回",
    "ui.editBasket": "← 编辑购物车",
    "ui.compareAgain": "← 重新比较",
    "ui.backToPlan": "← 返回方案",
    "ui.continue": "继续 →",
    "data.pill": "DOSM 开放数据",

    "months": "1月|2月|3月|4月|5月|6月|7月|8月|9月|10月|11月|12月",
    "asofFmt": "{y}年{m}",
    "basket.asof": "价格为 {when}",
    "basket.asofTitle": "本月无价格 — 采用最近的真实 DOSM 价格",

    "w.item": "件", "w.items": "件",
    "w.store": "家商店", "w.stores": "家商店",
    "w.stop": "个站点", "w.stops": "个站点",

    "cat.fresh": "新鲜食品",
    "cat.pantry": "厨房必备",
    "cat.packaged": "包装与烹饪",
    "cat.drinks": "饮品与乳制品",
    "cat.baby": "奶粉与婴儿",
    "cat.home": "日常必需品",

    "landing.badge": "由马来西亚开放价格数据驱动",
    "landing.title": "不要再为日常采购<br />多花冤枉钱",
    "landing.sub": "不要只找最便宜的单品 — 而是找到<strong>买齐整个购物车的最聪明方式</strong>。JIMAT 权衡价格、距离与便利，然后为您递上三份可直接购物的方案。",
    "landing.cta": "🛒 优化我的购物车 →",
    "landing.stat1v": "RM1,032",
    "landing.stat1k": "每年节省（平均购物车）",
    "landing.stat2v": "~12%",
    "landing.stat2k": "同样的货，支出更低",
    "landing.stat3v": "3 份方案",
    "landing.stat3k": "数秒内完成，为您量身定制",

    "loc.step": "第 1 步 — 您在哪里购物？",
    "loc.title": "设置您的位置",
    "loc.lead": "JIMAT 会找出您附近的商店，以及您愿意为更优价格而出行的距离。",
    "loc.state": "📍 州属",
    "loc.district": "📍 地区",
    "loc.travel": "🚗 您愿意走多远？",
    "loc.radiusLabel": "搜索半径",
    "loc.chooseState": "选择您的州属",
    "loc.chooseDistrict": "选择您的地区",
    "loc.chooseStateFirst": "请先选择州属",
    "loc.radiusCount": "~{r} 公里内有 <b>{n}</b> {sw}真实 DOSM",
    "loc.radiusEmpty": "选择州属和地区以查看范围内的商店。",

    "hh.step": "第 2 步 — 关于您的家庭",
    "hh.title": "您为谁购物？",
    "hh.lead": "这会设定一个合理的每月采购预算供比较。接下来您将建立购物车。",
    "hh.size": "👪 家庭人数",
    "hh.single": "只有我",
    "hh.couple": "两口人",
    "hh.family": "家庭",
    "hh.large": "大家庭",
    "hh.budget": "🎯 每月采购预算 <span class=\"muted small\">（可选）</span>",
    "hh.cta": "建立我的购物车 →",

    "basket.step": "第 3 步 — 建立您的购物车",
    "basket.title": "您需要什么？",
    "basket.lead": "默认不选任何商品 — 按类别浏览或搜索，然后添加您真正需要的并设置数量。",
    "basket.search": "🔍 搜索商品 — 鸡蛋、米、油…",
    "basket.all": "🛒 全部",
    "basket.add": "+ 添加",
    "basket.noMatch": "没有商品符合该搜索。",
    "basket.within": "在您的 {budget} 预算内",
    "basket.over": "超出您的 {budget} 预算",
    "basket.estimate": "按全国平均价格估算（DOSM）",
    "basket.reviewCta": "查看购物车 →",

    "review.step": "第 4 步 — 查看您的购物车",
    "review.title": "以下是您要买的",
    "review.lead": "这是按平均货架价格的当前估算 — 您的节省基准。",
    "review.total": "当前估算",
    "review.cta": "找出我的节省 →",
    "review.onBudget": "🎯 符合预算",
    "review.overBudget": "⚠️ 超出预算",
    "review.budgetWithin": "按平均价格，此购物车为 {basket}，而您的预算为 {budget}。JIMAT 会尝试把它压得更低。",
    "review.budgetOver": "按平均价格，此购物车为 {basket}，而您的预算为 {budget}。JIMAT 会找出可以削减的地方。",
    "review.storesNote": "📍 {area} · ~{r} 公里内有 {n} {sw}真实 DOSM",

    "opt.step1": "🛰️ 扫描附近商店",
    "opt.step2": "🔎 比较各商店的每一件商品",
    "opt.step3": "🚗 权衡价格与出行成本",
    "opt.step4": "🧠 为您制定 3 个聪明方案",
    "opt.title": "正在为您找出最佳购物方式…",
    "opt.lead": "正在分析 {area} 附近 {stores} 的 {items}。",

    "strat.step": "第 5 步 — 您的优化方案",
    "strat.title": "三种聪明的购物方式",
    "strat.lead": "同样的商品，三种策略。我们推荐<strong>最佳性价比</strong> — 价格、距离与精力的最聪明平衡。",
    "strat.recLabel": "最佳性价比为您节省",
    "strat.recSub": "本次购物 · 约 {year}/年 · 比估算低 {pct}%",
    "strat.tapHint": "点选一个方案 — 然后点击继续。",
    "strat.cta": "使用此方案 →",
    "strat.useX": "使用{plan} →",
    "strat.ribbon": "推荐",
    "strat.save": "节省 {rm}",
    "strat.travel": "出行",
    "strat.found": "找到",
    "strat.notFound": "{n} 未找到",

    "plan.best.label": "最佳性价比",
    "plan.best.tag": "最佳性价比",
    "plan.best.blurb": "最聪明的价格与精力比",
    "plan.convenient.label": "最方便",
    "plan.convenient.tag": "最方便",
    "plan.convenient.blurb": "一趟买齐所有",
    "plan.cheapest.label": "最便宜",
    "plan.cheapest.tag": "最便宜",
    "plan.cheapest.blurb": "最低价格，站点更多",

    "plan.step": "第 6 步 — 您的购物方案",
    "plan.titleFmt": "{label}方案",
    "plan.lead": "{area} 附近 {stops}。请按下方路线前行 — 每个站点都有各自的清单和导航。",
    "plan.statBasket": "购物车总额",
    "plan.statSave": "您节省",
    "plan.statStore": "待新到访商店",
    "plan.statStores": "待新到访商店",
    "plan.miss": "⚠️ 在您的半径内没有：{list}",
    "plan.startCta": "开始购物 →",
    "plan.inArea": "在您的区域内",
    "plan.kmApprox": "约 {km} 公里",

    "shop.step": "第 7 步 — 购物模式",
    "shop.title": "边买边勾选",
    "shop.progress": "进度",
    "shop.progressVal": "{done} / {total} 件",
    "shop.picked": "目前已取",
    "shop.doneTitle": "🎉 全部完成！",
    "shop.doneBody": "购物车已完成。前往结账，然后确认您实际花费的金额。",
    "shop.doneCta": "完成购物 →",

    "confirm.step": "第 8 步 — 确认您的节省",
    "confirm.title": "您实际花了多少？",
    "confirm.lead": "输入收据上的真实总额。JIMAT 会将它与您的 {estimate} 估算比较，锁定您的节省。",
    "confirm.label": "🧾 实际花费金额",
    "confirm.saved": "您节省了",
    "confirm.overspent": "您超支了",
    "confirm.emptySub": "输入您的收据总额以查看节省",
    "confirm.vsEstimate": "相比您的 {estimate} 估算",
    "confirm.pctOff": " · 低 {pct}%",
    "confirm.pctOver": " · 高 {pct}%",
    "confirm.cta": "查看我的成果 →",

    "impact.newBasket": "↺ 开始新购物车",
    "impact.eyebrow": "您的成果",
    "impact.title": "💰 节省仪表板",
    "impact.lead": "这就是用 JIMAT 聪明购物为您带来的 — 本月及长期。",
    "impact.savedShop": "本次节省",
    "impact.projYear": "预计 / 年",
    "impact.storesVisited": "已到访商店",
    "impact.healthTitle": "🩺 采购健康评分",
    "impact.healthSub": "本次购物的表现 — 节省、覆盖与预算契合度。",
    "impact.outOf": "满分 100",
    "impact.ringAria": "采购健康评分 {score}，满分 100",
    "health.excellent": "优秀",
    "health.healthy": "良好",
    "health.improve": "可改进",
    "health.attention": "需要注意",
    "health.savings": "已获节省",
    "health.coverage": "购物车覆盖",
    "health.budget": "在预算内",
    "health.estimate": "达到或低于估算",
    "impact.intelTitle": "📈 价格情报",
    "impact.intelSub": "在对的时间买，而不只是对的地点 — 今日对比 30 天平均。",
    "impact.intelAvg": "30 天平均 {rm}",
    "impact.flagLow": "📉 低 {pct}%",
    "impact.flagHigh": "📈 高 {pct}%",
    "impact.flagAvg": "≈ 平均",
    "impact.journeyTitle": "🚀 您的长期节省之旅",
    "impact.journeySub": "持续聪明购物，小额节省会累积成真金白银。",
    "impact.yearLabel": "第 {y} 年",
    "impact.bigTitle": "💡 大局观",
    "impact.bigBody": "每次购物节省 {shop}，一年就是 {year} — 五年约 <strong>{five}</strong>。那可以是一次度假、一笔应急基金，或一个月的房租 — 只需用更聪明的方式买同样的商品。"
  };

  // ------------------------------------------------------------------- Tamil --
  DICT.ta = {
    "ui.language": "மொழி",
    "ui.themeToggle": "ஒளி / இருள் மாற்று",
    "ui.back": "← பின்",
    "ui.editBasket": "← கூடையைத் திருத்து",
    "ui.compareAgain": "← மீண்டும் ஒப்பிடு",
    "ui.backToPlan": "← திட்டத்திற்கும்",
    "ui.continue": "தொடர் →",
    "data.pill": "DOSM திறந்த தரவு",

    "months": "ஜன|பிப்|மார்|ஏப்|மே|ஜூன்|ஜூலை|ஆக|செப்|அக்|நவ|டிச",
    "asofFmt": "{m} {y}",
    "basket.asof": "{when} நிலவரம்",
    "basket.asofTitle": "இம்மாதம் விலை இல்லை — சமீபத்திய DOSM விலை",

    "w.item": "பொருள்", "w.items": "பொருள்கள்",
    "w.store": "கடை", "w.stores": "கடைகள்",
    "w.stop": "நிறுத்தம்", "w.stops": "நிறுத்தங்கள்",

    "cat.fresh": "புதிய பொருட்கள்",
    "cat.pantry": "சமையலறை அவசியம்",
    "cat.packaged": "பொதியன & சமையல்",
    "cat.drinks": "பானங்கள் & பால்",
    "cat.baby": "பால் & குழந்தை",
    "cat.home": "தினசரி தேவைகள்",

    "landing.badge": "மலேசியாவின் திறந்த விலைத் தரவினால் இயக்கப்படுகிறது",
    "landing.title": "உங்கள் மளிகைப் பொருட்களுக்கு<br />அதிகமாகப் பணம் செலவழிப்பதை நிறுத்துங்கள்",
    "landing.sub": "மலிவான பொருளை மட்டுமல்ல — <strong>உங்கள் முழுமையான கூடையை வாங்குவதற்கான மிக அறிவார்ந்த வழி</strong>யைக் கண்டுபிடியுங்கள். JIMAT விலை, தூரம், வசதியை எடைபோட்டு, மூன்று தயாரான திட்டங்களை வழங்குகிறது.",
    "landing.cta": "🛒 என் கூடையை மேம்படுத்து →",
    "landing.stat1v": "RM1,032",
    "landing.stat1k": "ஆண்டுக்கு சேமிப்பு, சராசரி கூடை",
    "landing.stat2v": "~12%",
    "landing.stat2k": "அதே பொருள், குறைந்த செலவு",
    "landing.stat3v": "3 திட்டங்கள்",
    "landing.stat3k": "விநாடிகளில், உங்களுக்கேற்றபடி",

    "loc.step": "படி 1 — எங்கே வாங்குகிறீர்கள்?",
    "loc.title": "உங்கள் இடத்தை அமைக்கவும்",
    "loc.lead": "JIMAT உங்கள் அருகிலுள்ள கடைகளையும், சிறந்த விலைக்காக நீங்கள் எவ்வளவு தூரம் செல்வீர்கள் என்பதையும் கண்டறிகிறது.",
    "loc.state": "📍 மாநிலம்",
    "loc.district": "📍 மாவட்டம்",
    "loc.travel": "🚗 எவ்வளவு தூரம் பயணிப்பீர்கள்?",
    "loc.radiusLabel": "தேடல் ஆரம்",
    "loc.chooseState": "உங்கள் மாநிலத்தைத் தேர்ந்தெடுக்கவும்",
    "loc.chooseDistrict": "உங்கள் மாவட்டத்தைத் தேர்ந்தெடுக்கவும்",
    "loc.chooseStateFirst": "முதலில் மாநிலத்தைத் தேர்ந்தெடுக்கவும்",
    "loc.radiusCount": "~{r} கி.மீ குள் <b>{n}</b> உண்மையான DOSM {sw}",
    "loc.radiusEmpty": "வரம்பிற்குள் கடைகளைக் காண மாநிலம் மற்றும் மாவட்டத்தைத் தேர்ந்தெடுக்கவும்.",

    "hh.step": "படி 2 — உங்கள் குடும்பம் பற்றி",
    "hh.title": "யாருக்காக வாங்குகிறீர்கள்?",
    "hh.lead": "இது ஒப்பிடுவதற்கு ஏற்ற மாதாந்த மளிகைப் பட்ஜெட்டை அமைக்கிறது. அடுத்ததாக உங்கள் கூடையை உருவாக்குவீர்கள்.",
    "hh.size": "👪 குடும்ப அளவு",
    "hh.single": "நான் மட்டும்",
    "hh.couple": "தம்பதிகள்",
    "hh.family": "குடும்பம்",
    "hh.large": "பெரிய குடும்பம்",
    "hh.budget": "🎯 மாதாந்த மளிகை பட்ஜெட் <span class=\"muted small\">(விருப்பம்)</span>",
    "hh.cta": "என் கூடையை உருவாக்கு →",

    "basket.step": "படி 3 — உங்கள் கூடையை உருவாக்கவும்",
    "basket.title": "உங்களுக்கு என்ன தேவை?",
    "basket.lead": "யாதும் முன்கூட்டியாகத் தேர்ந்தெடுக்கப்படவில்லை — பிரிவாக அல்லது தேடி, பிறகு உங்களுக்குத் தேவையானவற்றைச் சேர்த்து அளவை அமைக்கவும்.",
    "basket.search": "🔍 பொருட்கள் தேடு — முட்டை, அரிசி, எண்ணெய்…",
    "basket.all": "🛒 அனைத்தும்",
    "basket.add": "+ சேர்",
    "basket.noMatch": "அந்தத் தேடலுக்கு பொருத்தமான பொருட்கள் இல்லை.",
    "basket.within": "உங்கள் {budget} பட்ஜெட்டுக்குள்",
    "basket.over": "உங்கள் {budget} பட்ஜெட்டை மீறி",
    "basket.estimate": "தேசிய சராசரி விலையில் மதிப்பு (DOSM)",
    "basket.reviewCta": "கூடையைப் பார் →",

    "review.step": "படி 4 — உங்கள் கூடையைப் பார்க்கவும்",
    "review.title": "நீங்கள் வாங்குவது இதோ",
    "review.lead": "இது சராசரி அலமாரி விலையில் தற்போதைய மதிப்பு — உங்கள் சேமிப்பு அடிப்படை.",
    "review.total": "தற்போதைய மதிப்பு",
    "review.cta": "என் சேமிப்பைக் காண் →",
    "review.onBudget": "🎯 பட்ஜெட்டுக்குள்",
    "review.overBudget": "⚠️ பட்ஜெட்டை மீறி",
    "review.budgetWithin": "சராசரி விலையில் இந்தக் கூடை {basket}, உங்கள் {budget} பட்ஜெட்டை விட. JIMAT அதை இன்னும் குறைக்க முயலும்.",
    "review.budgetOver": "சராசரி விலையில் இந்தக் கூடை {basket}, உங்கள் {budget} பட்ஜெட்டை விட. JIMAT எங்கு குறைக்கலாம் என்பதைக் கண்டறியும்.",
    "review.storesNote": "📍 {area} · ~{r} கி.மீ குள் {n} உண்மையான DOSM {sw}",

    "opt.step1": "🛰️ அருகிலுள்ள கடைகள் ஸ்கேன்",
    "opt.step2": "🔎 கடைகளுக்கிடையே ஒவ்வொரு பொருளையும் ஒப்பிடு",
    "opt.step3": "🚗 விலையைப் பயணச் செலவுடன் ஒப்பிடு",
    "opt.step4": "🧠 உங்கள் 3 சிறப்பு திட்டங்கள்",
    "opt.title": "உங்களுக்கு சிறந்த வாங்கும் வழி தேடுகிறது…",
    "opt.lead": "{area} அருகிலுள்ள {stores} இடையே {items} கணக்கிடுகிறது.",

    "strat.step": "படி 5 — உங்கள் சிறப்புத் திட்டங்கள்",
    "strat.title": "மூன்று சிறப்பான வாங்கும் வழிகள்",
    "strat.lead": "அதே பொருட்கள், மூன்று யுத்திகள். <strong>சிறந்த மதிப்பை</strong> நாங்கள் பரிந்துரைக்கிறோம் — விலை, தூரம், முயற்சியின் சிறந்த சமனிலை.",
    "strat.recLabel": "சிறந்த மதிப்பு உங்களுக்கு சேமிக்கிறது",
    "strat.recSub": "இந்த வாங்கல் · ஆண்டுக்கு சுமார் {year} · உங்கள் மதிப்பில் {pct}% குறைவு",
    "strat.tapHint": "ஒரு திட்டத்தைத் தொட்டுத் தேர்ந்தெடுக்கவும் — பிறகு தொடரை அழுத்தவும்.",
    "strat.cta": "இந்தத் திட்டத்தைப் பயன்படுத்து →",
    "strat.useX": "{plan} பயன்படுத்து →",
    "strat.ribbon": "பரிந்துரைக்கப்பட்டது",
    "strat.save": "{rm} சேமி",
    "strat.travel": "பயணம்",
    "strat.found": "கிடைத்தது",
    "strat.notFound": "{n} கிடைக்கவில்லை",

    "plan.best.label": "சிறந்த மதிப்பு",
    "plan.best.tag": "சிறந்த மதிப்பு",
    "plan.best.blurb": "மிகச் சிறந்த விலை-முயற்சி விகிதம்",
    "plan.convenient.label": "மிக வசதி",
    "plan.convenient.tag": "மிக வசதி",
    "plan.convenient.blurb": "ஒரே பயணத்தில் அனைத்தும்",
    "plan.cheapest.label": "மிக மலிவு",
    "plan.cheapest.tag": "மிக மலிவு",
    "plan.cheapest.blurb": "மிகக் குறைந்த விலை, அதிக நிறுத்தங்கள்",

    "plan.step": "படி 6 — உங்கள் ஷாப்பிங் திட்டம்",
    "plan.titleFmt": "{label} திட்டம்",
    "plan.lead": "{area} அருகிலுள்ள {stops}. கீழே உள்ள பாதையைப் பின்பற்றுங்கள் — ஒவ்வொரு நிறுத்தமும் தனிப்பட்டியலும் வழிகாட்டலும் கொண்டுள்ளது.",
    "plan.statBasket": "கூடை மொத்தம்",
    "plan.statSave": "நீங்கள் சேமிக்கிறீர்கள்",
    "plan.statStore": "செல்ல வேண்டிய கடை",
    "plan.statStores": "செல்ல வேண்டிய கடைகள்",
    "plan.miss": "⚠️ உங்கள் வரம்புக்குள் கிடைக்கவில்லை: {list}",
    "plan.startCta": "ஷாப்பிங் தொடங்கவும் →",
    "plan.inArea": "உங்கள் பகுதியில்",
    "plan.kmApprox": "சுமார் ~{km} கி.மீ",

    "shop.step": "படி 7 — ஷாப்பிங் முறை",
    "shop.title": "வாங்கும்போது பொருட்களைப் பரிசோதிக்கவும்",
    "shop.progress": "முன்னேற்றம்",
    "shop.progressVal": "{done} / {total} பொருட்கள்",
    "shop.picked": "இதுவரை எடுத்தவை",
    "shop.doneTitle": "🎉 அனைத்தும் முடிந்தது!",
    "shop.doneBody": "கூடை முடிந்தது. பணம் செலுத்தும் இடத்திற்குச் செல்லுங்கள், பிறகு நீங்கள் உண்மையில் செலவழித்ததை உறுதிப்படுத்துங்கள்.",
    "shop.doneCta": "ஷாப்பிங் முடிந்தது →",

    "confirm.step": "படி 8 — உங்கள் சேமிப்பை உறுதிப்படுத்துங்கள்",
    "confirm.title": "நீங்கள் உண்மையில் எவ்வளவு செலவழித்தீர்கள்?",
    "confirm.lead": "ரசீதிலிருந்து உங்கள் உண்மையான மொத்தத்தை உள்ளிடுங்கள். JIMAT அதை உங்கள் {estimate} மதிப்புடன் ஒப்பிட்டு உங்கள் சேமிப்பை நிர்ணயிக்கிறது.",
    "confirm.label": "🧾 உண்மையாகச் செலவான தொகை",
    "confirm.saved": "நீங்கள் சேமித்தீர்கள்",
    "confirm.overspent": "நீங்கள் அதிகமாகச் செலவழித்தீர்கள்",
    "confirm.emptySub": "உங்கள் சேமிப்பைக் காண ரசீது மொத்தத்தை உள்ளிடுங்கள்",
    "confirm.vsEstimate": "உங்கள் {estimate} மதிப்புடன்",
    "confirm.pctOff": " · {pct}% குறைவு",
    "confirm.pctOver": " · {pct}% அதிகம்",
    "confirm.cta": "என் தாக்கத்தைப் பார் →",

    "impact.newBasket": "↺ புதிய கூடையைத் துவக்கவும்",
    "impact.eyebrow": "உங்கள் தாக்கம்",
    "impact.title": "💰 சேமிப்பு டேஷ்போர்ட்",
    "impact.lead": "JIMAT உடன் சிறப்பாக வாங்கியது உங்களுக்குச் செய்தது — இம்மாதம் மற்றும் காலப்போக்கில்.",
    "impact.savedShop": "இந்த வாங்கலில் சேமிப்பு",
    "impact.projYear": "மதிப்பு / ஆண்டு",
    "impact.storesVisited": "சென்ற கடைகள்",
    "impact.healthTitle": "🩺 மளிகை ஆரோக்கிய மதிப்பெண்",
    "impact.healthSub": "இந்த வாங்கல் எப்படி இருந்தது — சேமிப்பு, பரப்பு, பட்ஜெட் பொருத்தம்.",
    "impact.outOf": "100 இல்",
    "impact.ringAria": "மளிகை ஆரோக்கிய மதிப்பெண் {score}, 100 இல்",
    "health.excellent": "சிறப்பு",
    "health.healthy": "நல்லது",
    "health.improve": "மேம்படுத்தலாம்",
    "health.attention": "கவனம் தேவை",
    "health.savings": "சேமித்த தொகை",
    "health.coverage": "கூடை பரப்பு",
    "health.budget": "பட்ஜெட்டுக்குள்",
    "health.estimate": "மதிப்பிற்கு சமமாக அல்லது குறைவு",
    "impact.intelTitle": "📈 விலை நுண்ணறிவு",
    "impact.intelSub": "சரியான இடத்தில் மட்டுமல்ல, சரியான நேரத்தில் வாங்குங்கள் — இன்று vs 30-நாள் சராசரி.",
    "impact.intelAvg": "30-நாள் சராசரி {rm}",
    "impact.flagLow": "📉 {pct}% குறைவு",
    "impact.flagHigh": "📈 {pct}% அதிகம்",
    "impact.flagAvg": "≈ சராசரி",
    "impact.journeyTitle": "🚀 உங்கள் நீண்டகால சேமிப்புப் பயணம்",
    "impact.journeySub": "சிறப்பாக வாங்கிக்கொண்டே இருங்கள், சிறிய சேமிப்புகள் பெரிய பணமாக சேரும்.",
    "impact.yearLabel": "ஆண்டு {y}",
    "impact.bigTitle": "💡 பெரிய படம்",
    "impact.bigBody": "ஒரு வாங்கல் {shop} சேமிப்பது ஆண்டுக்கு {year} — ஐந்து ஆண்டுகளில் சுமார் <strong>{five}</strong>. அது ஒரு விடுமுறை, அவசரகால நிதி, அல்லது ஒரு மாத வாடகை — அதே பொருட்களை மிகச் சிறப்பாக வாங்குவதால்."
  };

  // ------------------------------------------------------------------ core ----
  function t(key, params) {
    var d = DICT[cur] || DICT.en;
    var s = d[key];
    if (s == null) s = DICT.en[key];
    if (s == null) return key;
    if (params) {
      s = s.replace(/\{(\w+)\}/g, function (m, k) {
        return params[k] != null ? params[k] : m;
      });
    }
    return s;
  }

  function lang() { return cur; }
  function onChange(fn) { if (typeof fn === "function") listeners.push(fn); }

  function setLang(code, opts) {
    if (!DICT[code]) code = "en";
    cur = code;
    try { if (!opts || opts.persist !== false) localStorage.setItem(LS_KEY, code); } catch (e) {}
    try { document.documentElement.setAttribute("lang", code); } catch (e) {}
    if (!opts || opts.notify !== false) {
      listeners.forEach(function (fn) { try { fn(code); } catch (e) {} });
    }
  }

  // Translate all tagged static nodes under root (default: whole document).
  function applyStatic(root) {
    root = root || document;
    $all("[data-i18n]", root).forEach(function (el) { el.textContent = t(el.getAttribute("data-i18n")); });
    $all("[data-i18n-html]", root).forEach(function (el) { el.innerHTML = t(el.getAttribute("data-i18n-html")); });
    $all("[data-i18n-ph]", root).forEach(function (el) { el.setAttribute("placeholder", t(el.getAttribute("data-i18n-ph"))); });
    $all("[data-i18n-title]", root).forEach(function (el) { el.setAttribute("title", t(el.getAttribute("data-i18n-title"))); });
    $all("[data-i18n-aria]", root).forEach(function (el) { el.setAttribute("aria-label", t(el.getAttribute("data-i18n-aria"))); });
  }

  // Fill a <select> with the language options (value = code, text = native label).
  function buildSelector(sel) {
    if (!sel) return;
    sel.innerHTML = LANGS.map(function (l) {
      return '<option value="' + l.code + '"' + (l.code === cur ? " selected" : "") + ">" + l.label + "</option>";
    }).join("");
    sel.value = cur;
  }

  function $all(s, root) { return Array.prototype.slice.call((root || document).querySelectorAll(s)); }

  // Resolve the starting language: saved choice, else English.
  (function initLang() {
    var saved = null;
    try { saved = localStorage.getItem(LS_KEY); } catch (e) {}
    if (saved && DICT[saved]) cur = saved;
    try { document.documentElement.setAttribute("lang", cur); } catch (e) {}
  })();

  window.JIMAT_I18N = {
    LANGS: LANGS,
    t: t,
    lang: lang,
    setLang: setLang,
    onChange: onChange,
    applyStatic: applyStatic,
    buildSelector: buildSelector
  };
})();
