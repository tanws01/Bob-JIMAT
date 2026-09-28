#!/usr/bin/env python3
"""
JIMAT snapshot builder
Creator: Tan Wei Siang. Fully owned by Tan Wei Siang.

Pulls REAL DOSM PriceCatcher open data (premises, items, monthly prices) and
writes a self-contained JS snapshot the static site can load from file://.

  Source:  https://storage.data.gov.my/pricecatcher/
           - lookup_premise.parquet   (real store name, address, state, district)
           - lookup_item.parquet      (real item names/units/groups)
           - pricecatcher_YYYY-MM.parquet (real prices: date, premise, item, price)

District centroids are geocoded once (OpenStreetMap Nominatim) and cached so
the site can compute approximate distances / a km radius. A bundled 16-state
centroid fallback guarantees every premise gets coordinates even if geocoding
is unavailable.

Output: assets/js/snapshot.js  ->  window.JIMAT_SNAPSHOT = {...}
No Databricks, no Git. DOSM public open data only.
"""
import io, json, os, re, sys, time, math
import requests
import pyarrow.parquet as pq
import pandas as pd

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(HERE)
OUT_JS = os.path.join(ROOT, "assets", "js", "snapshot.js")
COORD_CACHE = os.path.join(HERE, "district_coords.json")
BASE = "https://storage.data.gov.my/pricecatcher/"

# Real approximate state centroids (lat, lon) — guaranteed fallback.
STATE_CENTROID = {
    "johor": (1.94, 103.36), "kedah": (6.12, 100.37), "kelantan": (5.25, 102.05),
    "melaka": (2.20, 102.25), "negeri sembilan": (2.73, 102.10), "pahang": (3.80, 102.80),
    "pulau pinang": (5.35, 100.30), "perak": (4.60, 101.10), "perlis": (6.44, 100.20),
    "selangor": (3.35, 101.45), "terengganu": (5.10, 103.00), "sabah": (5.40, 116.90),
    "sarawak": (2.50, 113.00), "kuala lumpur": (3.14, 101.69), "putrajaya": (2.93, 101.69),
    "labuan": (5.28, 115.24),
}

# Categories = the 6 real DOSM item_groups that actually carry PriceCatcher
# prices (the "ready-to-eat" and "convenience-store" groups report no prices, so
# they are excluded). Each is given a friendly English label + emoji + a cap on
# how many items to surface. Auto-filled from the highest store-coverage items.
# Caps are intentionally generous — we surface EVERY real priced DOSM item in
# each group (subject to MIN_COVERAGE), not a hand-picked few. DOSM publishes
# ~291 priced items this month; that is the honest ceiling.
CATEGORIES = [
    {"key": "fresh",    "group": "BARANGAN SEGAR",         "label": "Fresh Produce",      "emoji": "\U0001F96C", "cap": 200},
    {"key": "pantry",   "group": "BARANGAN KERING",        "label": "Pantry Staples",     "emoji": "\U0001F9C5", "cap": 200},
    {"key": "packaged", "group": "BARANGAN BERBUNGKUS",    "label": "Packaged & Cooking", "emoji": "\U0001F35A", "cap": 200},
    {"key": "drinks",   "group": "MINUMAN",                "label": "Drinks & Dairy",     "emoji": "☕",     "cap": 200},
    {"key": "baby",     "group": "SUSU DAN BARANGAN BAYI", "label": "Milk & Baby",        "emoji": "\U0001F476", "cap": 200},
    {"key": "home",     "group": "PRODUK KEBERSIHAN",      "label": "Daily Necessities",  "emoji": "\U0001F9FC", "cap": 200},
]

# Include EVERY item DOSM actually prices this month (>=1 premise reporting).
# Set to 1 so nothing real is hidden; items with no price at all are inherently
# excluded (there is nothing to display). Raise this only to trim sparse items.
MIN_COVERAGE = 1

# Iconic staples always surfaced, with a friendly short name + emoji (and an
# optional category override where the DOSM group is counter-intuitive, e.g.
# fresh milk lives under "drinks" in DOSM but reads better under Milk & Baby).
CURATED = {
    1109: {"id": "eggs",    "name": "Eggs (Grade A)",          "emoji": "\U0001F95A"},
    1:    {"id": "chicken", "name": "Whole Chicken",           "emoji": "\U0001F357"},
    992:  {"id": "rice",    "name": "White Rice (Cap Jati)",   "emoji": "\U0001F35A"},
    267:  {"id": "oil",     "name": "Cooking Oil (Vesawit)",   "emoji": "\U0001FAD7"},
    272:  {"id": "bread",   "name": "Bread (Gardenia)",        "emoji": "\U0001F35E"},
    1589: {"id": "sugar",   "name": "White Sugar",             "emoji": "\U0001F9C2"},
    917:  {"id": "flour",   "name": "Wheat Flour",             "emoji": "\U0001F35E"},
    129:  {"id": "onion",   "name": "Big Onions",              "emoji": "\U0001F9C5"},
    1131: {"id": "potato",  "name": "Potatoes",                "emoji": "\U0001F954"},
    1976: {"id": "noodles", "name": "Instant Noodles (Maggi)", "emoji": "\U0001F35C"},
    1645: {"id": "coffee",  "name": "Ground Coffee (Kapal Api)","emoji": "☕"},
    224:  {"id": "milk",    "name": "Fresh Milk (Dutch Lady)", "emoji": "\U0001F95B", "cat": "baby"},
}

# Emoji per DOSM item_category, for auto-selected items.
CATEGORY_EMOJI = {
    "AYAM": "\U0001F357", "TELUR": "\U0001F95A", "DAGING": "\U0001F356",
    "BAHAN LAUT": "\U0001F990", "IKAN DARAT": "\U0001F41F", "SAYUR-SAYURAN": "\U0001F96C",
    "BUAH-BUAHAN": "\U0001F34E", "TAUHU DAN TEMPE": "\U0001F9C6", "KELAPA": "\U0001F965",
    "BAWANG": "\U0001F9C5", "UBI KENTANG": "\U0001F954", "KACANG": "\U0001F95C",
    "CILI KERING": "\U0001F336", "HASIL LAUT KERING": "\U0001F990",
    "BERAS": "\U0001F35A", "TEPUNG": "\U0001F35E", "GULA": "\U0001F9C2",
    "MINYAK DAN LEMAK": "\U0001FAD7", "MI SEGERA": "\U0001F35C", "MEE/KUETIAU": "\U0001F35C",
    "MEE / BIHUN / KUEY TEOW": "\U0001F35C", "BIHUN": "\U0001F35C",
    "KICAP DAN SOS": "\U0001F9C2", "REMPAH RATUS (BERBUNGKUS)": "\U0001F9C2",
    "REMPAH RATUS (TIDAK BERBUNGKUS)": "\U0001F9C2", "SANTAN (KOTAK)": "\U0001F965",
    "ROTI": "\U0001F35E", "BISKUT": "\U0001F36A", "MAKANAN RINGAN": "\U0001F37F",
    "IKAN DALAM TIN": "\U0001F96B", "SAPUAN (SPREADS)": "\U0001F36F", "MENTEGA": "\U0001F9C8",
    "ESEN DAN RAGI": "\U0001F9C2", "BAHAN-BAHAN MINUMAN": "☕", "TERSEDIA MINUM": "\U0001F964",
    "SUSU BAYI": "\U0001F37C", "MAKANAN BAYI": "\U0001F37C", "KRIMER DAN SUSU TEPUNG": "\U0001F95B",
    "SUSU": "\U0001F95B", "LAMPIN PAKAI BUANG": "\U0001F9F7",
    "PENJAGAAN DIRI": "\U0001F9F4", "PENJAGAAN RUMAH": "\U0001F9F9", "UBAT GIGI": "\U0001F9B7",
    "BERUS GIGI": "\U0001FAA5", "SYAMPU": "\U0001F9F4", "SABUN BADAN": "\U0001F9FC",
    "TISU": "\U0001F9FB", "TUALA WANITA": "\U0001F9FB", "MOUTH WASH": "\U0001F9F4",
    "PEWANGI RUMAH": "\U0001F9F4", "PENGHALAU NYAMUK": "\U0001F99F", "UBAT-UBATAN": "\U0001F48A",
}
DEFAULT_EMOJI = "\U0001F6D2"

# Premise types that actually sell packaged groceries (exclude restaurants/foodcourts).
GROCERY_TYPES = {
    "Hypermarket", "Pasar Raya / Supermarket", "Pasar Mini",
    "Kedai Runcit", "Kedai Serbaneka", "Pasar Basah", "Pasar Basah ", "Borong",
}
# Friendly English labels for premise types.
TYPE_LABEL = {
    "Hypermarket": "Hypermarket", "Pasar Raya / Supermarket": "Supermarket",
    "Pasar Mini": "Mini Market", "Kedai Runcit": "Grocery Store",
    "Kedai Serbaneka": "Convenience", "Pasar Basah": "Wet Market",
    "Pasar Basah ": "Wet Market", "Borong": "Wholesale",
}


def latest_month():
    y, m = 2026, 10
    for _ in range(18):
        name = f"pricecatcher_{y:04d}-{m:02d}.parquet"
        try:
            if requests.head(BASE + name, timeout=30, allow_redirects=True).status_code == 200:
                return f"{y:04d}-{m:02d}"
        except Exception:
            pass
        m -= 1
        if m == 0:
            m = 12; y -= 1
    return None


def fetch_parquet(name):
    r = requests.get(BASE + name, timeout=180)
    r.raise_for_status()
    return pq.read_table(io.BytesIO(r.content)).to_pandas()


def prev_month_str(ym):
    """'2026-08' -> '2026-07' (wraps year)."""
    y, m = int(ym[:4]), int(ym[5:7])
    m -= 1
    if m == 0:
        m = 12; y -= 1
    return f"{y:04d}-{m:02d}"


def try_fetch_month(ym):
    """Fetch a PriceCatcher month, or None if it doesn't exist / fails."""
    try:
        r = requests.get(BASE + f"pricecatcher_{ym}.parquet", timeout=300)
        if r.status_code == 200:
            return pq.read_table(io.BytesIO(r.content)).to_pandas()
    except Exception:
        return None
    return None


def norm(s):
    return str(s).strip().lower()


def load_coord_cache():
    if os.path.exists(COORD_CACHE):
        with open(COORD_CACHE, encoding="utf-8") as f:
            return json.load(f)
    return {}


def save_coord_cache(cache):
    with open(COORD_CACHE, "w", encoding="utf-8") as f:
        json.dump(cache, f, ensure_ascii=False, indent=0)


def geocode(query, headers, tries=3):
    for _ in range(tries):
        try:
            r = requests.get("https://nominatim.openstreetmap.org/search",
                             params={"q": query, "format": "json", "limit": 1,
                                     "countrycodes": "my"},
                             headers=headers, timeout=30)
            if r.status_code == 200:
                j = r.json()
                if j:
                    return float(j[0]["lat"]), float(j[0]["lon"])
                return None
        except Exception:
            time.sleep(1.5)
    return None


def state_fallback(state):
    n = norm(state)
    for key, ll in STATE_CENTROID.items():
        if key in n or n in key:
            return ll
    return (3.14, 101.69)  # KL as last resort


def clean_name(raw, limit=None):
    """Title-case a shouty Malay DOSM item name into something readable."""
    s = " ".join(str(raw).split()).strip()
    s = s.title()
    # keep common acronyms upper-cased
    for w in ["Hl", "Ngp", "F&N", "Uht", "Sst", "3 In 1", "A+"]:
        s = s.replace(w.title(), w.upper() if w not in ("3 In 1", "A+") else w)
    if limit and len(s) > limit:
        s = s[: limit - 1].rstrip(" ,-(") + "…"
    return s


# Malay -> English translation so every real item reads naturally and is
# searchable in English. Multi-word phrases applied first (longest first), then
# single words. Brand names (Cap ...) are left intact. The real Malay name is
# always preserved verbatim in the item's `full` field.
_PHRASES = [
    ("telur ayam gred", "chicken eggs grade"), ("telur ayam kampung", "free-range eggs"),
    ("telur ayam", "chicken eggs"), ("telur itik", "duck eggs"),
    ("minyak masak tulen", "pure cooking oil"), ("minyak masak sebatian", "blended cooking oil"),
    ("minyak masak paket", "packet cooking oil"), ("minyak masak", "cooking oil"),
    ("minyak jagung", "corn oil"), ("minyak sapi", "ghee"),
    ("susu segar", "fresh milk"), ("susu tepung", "powdered milk"), ("susu bayi", "infant formula"),
    ("rumusan bayi", "infant formula"), ("rumusan susulan", "follow-on formula"),
    ("makanan bayi", "baby food"),
    ("serbuk kopi", "ground coffee"), ("serbuk kari ayam dan daging", "chicken & meat curry powder"),
    ("serbuk kari daging", "meat curry powder"), ("serbuk kari ikan", "fish curry powder"),
    ("serbuk kari", "curry powder"), ("serbuk cili", "chili powder"),
    ("sos cili", "chili sauce"), ("sos tomato", "tomato ketchup"), ("sos tiram", "oyster sauce"),
    ("kicap lemak manis", "sweet soy sauce"), ("kicap manis", "sweet soy sauce"), ("kicap", "soy sauce"),
    ("gula putih bertapis kasar", "coarse refined white sugar"),
    ("gula putih bertapis halus", "fine refined white sugar"),
    ("gula putih bertapis", "refined white sugar"), ("gula merah", "brown sugar"),
    ("gula putih", "white sugar"), ("gula halus", "castor sugar"),
    ("tepung gandum", "wheat flour"),
    ("roti sandwich", "sandwich bread"), ("roti gandum penuh", "wholemeal bread"),
    ("roti gandum", "wholemeal bread"), ("roti wholemeal", "wholemeal bread"),
    ("santan kelapa", "coconut milk"), ("santan", "coconut milk"),
    ("bawang besar kuning", "yellow big onions"), ("bawang besar", "big onions"),
    ("bawang putih", "garlic"), ("bawang kecil merah rose", "rose shallots"),
    ("bawang kecil merah biasa", "shallots"), ("bawang kecil merah", "shallots"),
    ("bawang merah", "shallots"),
    ("ubi kentang", "potatoes"),
    ("kacang tanah", "peanuts"), ("kacang panjang", "long beans"), ("kacang buncis", "french beans"),
    ("kacang bendi", "okra"), ("kacang dal", "dhal"), ("kacang soya", "soybeans"),
    ("cili kering kerinting", "curly dried chili"), ("cili kering leper", "flat dried chili"),
    ("cili kering", "dried chili"),
    ("lobak merah", "carrots"), ("kubis bunga", "cauliflower"), ("kubis", "cabbage"),
    ("sawi hijau", "green mustard"), ("sawi", "mustard greens"),
    ("limau kasturi", "calamansi lime"), ("kunyit hidup", "fresh turmeric"),
    ("halia basah", "fresh ginger"), ("lengkuas", "galangal"), ("timun", "cucumber"),
    ("kepak ayam", "chicken wing"), ("paha ayam", "chicken drumstick"), ("dada ayam", "chicken breast"),
    ("whole leg ayam", "chicken whole leg"), ("thigh ayam", "chicken thigh"),
    ("ayam bersih", "whole chicken"), ("daging kambing bebiri", "lamb"), ("daging kambing", "mutton"),
    ("udang kering", "dried prawns"),
    ("mi segera", "instant noodles"), ("kuey teow", "flat rice noodles"), ("bihun", "rice vermicelli"),
    ("teh", "tea"), ("kordial", "cordial"), ("sirap ros", "rose syrup"), ("jus oren", "orange juice"),
    ("ubat gigi", "toothpaste"), ("berus gigi", "toothbrush"), ("syampu", "shampoo"),
    ("sabun pencuci", "laundry soap"), ("sabun badan", "body soap"),
    ("pencuci pelbagai guna", "multipurpose cleaner"), ("pelembut pakaian", "fabric softener"),
    ("peluntur", "bleach"), ("tuala wanita", "sanitary pads"),
    ("lampin pakai buang", "disposable diapers"), ("penghalau nyamuk", "mosquito repellent"),
    ("mouth wash", "mouthwash"),
    ("beras super", "premium rice"), ("beras premium", "premium rice"), ("beras pulut", "glutinous rice"),
    ("makanan ringan", "snacks"),
]
_WORDS = {
    "telur": "eggs", "ayam": "chicken", "gred": "grade", "minyak": "oil", "gula": "sugar",
    "bawang": "onions", "cili": "chili", "ikan": "fish", "daging": "beef", "kambing": "mutton",
    "susu": "milk", "roti": "bread", "tepung": "flour", "sos": "sauce", "kacang": "beans",
    "tulen": "pure", "sebatian": "blended", "putih": "white", "merah": "red", "hijau": "green",
    "halus": "fine", "kasar": "coarse", "import": "imported", "tempatan": "local", "biasa": "regular",
    "asli": "original", "segera": "instant", "segar": "fresh", "hidup": "live", "basah": "wet",
    "kering": "dried", "tua": "mature", "gandum": "wheat", "uncang": "teabags", "beg": "bags",
    "paket": "packet", "botol": "bottle", "tin": "can", "kotak": "carton", "pelbagai": "assorted",
    "jenama": "brand", "sayur": "vegetable", "udang": "prawns", "pewangi": "air freshener",
    "deodoran": "deodorant", "krimer": "creamer", "mentega": "butter", "biskut": "biscuits",
    "perisa": "flavour", "oren": "orange", "beras": "rice", "kopi": "coffee",
    "pees": "puree", "pes": "paste", "rumah": "home", "penjagaan": "care",
    "dan": "and", "tahun": "years", "madu": "honey", "langkah": "step",
    "parfum": "perfume", "tanpa": "without", "tambahan": "added", "batang": "stick",
}


def translate_name(raw, limit=34):
    """Real Malay DOSM name -> readable English (best-effort), for display/search."""
    s = " " + " ".join(str(raw).split()).lower() + " "
    for mal, eng in sorted(_PHRASES, key=lambda p: -len(p[0])):
        s = re.sub(r"(?<=\W)" + re.escape(mal) + r"(?=\W)", eng, s)
    s = re.sub(r"\w+", lambda m: _WORDS.get(m.group(0), m.group(0)), s)
    s = " ".join(s.split())
    return clean_name(s, limit)


def select_items(item_lookup, coverage):
    """Pick the item set: curated iconic staples first, then auto-fill each real
    DOSM category with its highest store-coverage items. Returns (items, cats).
    Each item: id, code, name (short), full (real name), emoji, unit, base placeholder, cat."""
    lut = item_lookup.set_index("item_code")
    group_to_cat = {c["group"]: c["key"] for c in CATEGORIES}
    items, used = [], set()

    def make(code, name, emoji, cat_key, full, unit, family, cov, curated=False):
        return {"id": "i" + str(code), "code": int(code), "name": name,
                "full": full, "emoji": emoji, "unit": " ".join(str(unit).split()).strip(),
                "cat": cat_key,
                # transient sort keys (stripped before emit): DOSM family clusters
                # variants of one product together; coverage orders within a family.
                "_fam": str(family), "_cov": float(cov), "_curated": curated}

    # 1) curated staples
    for code, c in CURATED.items():
        if code not in lut.index:
            continue
        row = lut.loc[code]
        cat_key = c.get("cat") or group_to_cat.get(row["item_group"])
        if not cat_key:
            continue
        items.append(make(code, c["name"], c["emoji"], cat_key, clean_name(row["item"]),
                          row["unit"], row["item_category"], coverage.get(code, 0), curated=True))
        used.add(code)

    # 2) auto-fill each category from highest-coverage real items
    for c in CATEGORIES:
        have = sum(1 for it in items if it["cat"] == c["key"])
        pool = (item_lookup[(item_lookup["item_group"] == c["group"])
                            & (item_lookup["item_code"].map(coverage).fillna(0) >= MIN_COVERAGE)]
                .assign(n=lambda d: d["item_code"].map(coverage).fillna(0))
                .sort_values("n", ascending=False))
        for _, row in pool.iterrows():
            if have >= c["cap"]:
                break
            code = int(row["item_code"])
            if code in used:
                continue
            emoji = CATEGORY_EMOJI.get(row["item_category"], DEFAULT_EMOJI)
            items.append(make(code, translate_name(row["item"], 34), emoji,
                              c["key"], clean_name(row["item"]), row["unit"],
                              row["item_category"], row["n"]))
            used.add(code)
            have += 1

    # 3) group variants of the same product together (e.g. all egg grades, all
    #    chicken cuts, all cabbages). Two levels: first the DOSM family
    #    (item_category, e.g. TELUR/eggs) so different-named variants still meet,
    #    then a name base within it (so a broad family like SAYUR-SAYURAN still
    #    sub-clusters cabbages, chilis, etc.). Families and sub-groups are ordered
    #    by their strongest member; within a sub-group curated staples lead, then
    #    store coverage. Keeps the most widely-sold items near the top.
    def name_base(name):
        b = re.sub(r"\(.*?\)", " ", str(name)).lower()
        b = re.sub(r"[^a-z ]+", " ", b)
        toks = b.split()
        return " ".join(toks[:2]) if toks else "~"

    def rank(bucket):
        # sub-groups/families with a curated staple lead, then by strongest member
        return lambda k: (0 if any(i["_curated"] for i in bucket[k]) else 1,
                          -max(i["_cov"] for i in bucket[k]))

    ordered = []
    for c in CATEGORIES:
        group = [it for it in items if it["cat"] == c["key"]]
        fams = {}
        for it in group:
            fams.setdefault(it["_fam"], []).append(it)
        for f in sorted(fams, key=rank(fams)):
            subs = {}
            for it in fams[f]:
                subs.setdefault(name_base(it["name"]), []).append(it)
            for sk in sorted(subs, key=rank(subs)):
                members = sorted(subs[sk], key=lambda i: (0 if i["_curated"] else 1, -i["_cov"]))
                ordered.extend(members)
    items = ordered

    cats = [{"key": c["key"], "label": c["label"], "emoji": c["emoji"]} for c in CATEGORIES]
    return items, cats


def main():
    month = latest_month()
    if not month:
        print("[FAIL] no PriceCatcher month available"); sys.exit(1)
    print(f"[INFO] latest PriceCatcher month: {month}")

    print("[INFO] downloading lookups + prices ...")
    prem = fetch_parquet("lookup_premise.parquet")
    item_lookup = fetch_parquet("lookup_item.parquet")
    px = fetch_parquet(f"pricecatcher_{month}.parquet")
    print(f"[INFO] premises={len(prem)} items={len(item_lookup)} price_rows={len(px)}")

    # Representative price per (premise, item): mean over a month, 2dp.
    def rep_of(frame):
        return (frame.groupby(["premise_code", "item_code"])["price"].mean()
                .round(2).reset_index())

    # Item codes that belong to our 6 surfaced grocery groups.
    group_set = {c["group"] for c in CATEGORIES}
    group_codes = set(item_lookup.loc[item_lookup["item_group"].isin(group_set),
                                      "item_code"].astype(int))

    rep_cur = rep_of(px)
    priced_now = {int(c) for c in px["item_code"].unique()}
    asof = {c: month for c in priced_now if c in group_codes}   # item_code -> source month

    # Backfill: grocery items with NO price this month get their most recent
    # prior-month price (still REAL DOSM data, just an earlier month). Walk back
    # month by month, filling each missing item the first time it reappears.
    missing = group_codes - priced_now
    print(f"[INFO] grocery items missing a current price: {len(missing)} — backfilling from prior months")
    back_frames = []
    remaining = set(missing)
    ym = month
    for _ in range(12):
        if not remaining:
            break
        ym = prev_month_str(ym)
        pxo = try_fetch_month(ym)
        if pxo is None:
            continue
        sub = pxo[pxo["item_code"].isin(remaining)]
        if len(sub) == 0:
            continue
        found = {int(c) for c in sub["item_code"].unique()}
        back_frames.append(rep_of(sub))
        for c in found:
            asof[c] = ym
        remaining -= found
        print(f"[INFO]   {ym}: filled {len(found)} items ({len(remaining)} still missing)")
    if remaining:
        print(f"[INFO] {len(remaining)} grocery items have no price in the last 12 months (dropped)")

    # Combined price table: current month for live items + prior month per backfilled item.
    rep_all = pd.concat([rep_cur] + back_frames, ignore_index=True) if back_frames else rep_cur

    # Select the item set (curated staples + auto-filled real categories) from
    # the combined coverage so backfilled items are included.
    coverage = rep_all.groupby("item_code")["premise_code"].nunique().to_dict()
    sel_items, cats = select_items(item_lookup, coverage)
    codes = [b["code"] for b in sel_items]
    n_back = sum(1 for b in sel_items if asof.get(b["code"], month) != month)
    print(f"[INFO] selected {len(sel_items)} items across {len(cats)} categories ({n_back} backfilled)")

    rep = rep_all[rep_all["item_code"].isin(codes)].copy()

    # Grocery premises only, that report at least 3 basket items.
    prem = prem[prem["premise_type"].isin(GROCERY_TYPES)].copy()
    have = rep[rep["premise_code"].isin(prem["premise_code"])]
    counts = have.groupby("premise_code")["item_code"].nunique()
    keep = set(counts[counts >= 3].index)
    prem = prem[prem["premise_code"].isin(keep)].copy()
    rep = rep[rep["premise_code"].isin(keep)].copy()
    print(f"[INFO] premises kept (>=3 basket items): {len(prem)}")

    # District centroids (cache + geocode + state fallback).
    cache = load_coord_cache()
    headers = {"User-Agent": "JIMAT-demo/1.0 (one-time district centroids; contact: local demo)"}
    sd = prem.groupby(["state", "district"]).size().reset_index()[["state", "district"]]
    print(f"[INFO] geocoding {len(sd)} districts (cached: {len(cache)}) ...")
    n_geo = 0
    for _, row in sd.iterrows():
        st, di = row["state"], row["district"]
        key = f"{norm(st)}|{norm(di)}"
        if key in cache:
            continue
        ll = geocode(f"{di}, {st}, Malaysia", headers)
        if ll is None:
            ll = state_fallback(st)
            cache[key] = {"lat": ll[0], "lon": ll[1], "src": "state"}
        else:
            cache[key] = {"lat": ll[0], "lon": ll[1], "src": "osm"}
            n_geo += 1
        save_coord_cache(cache)   # incremental — resumable
        time.sleep(1.1)           # be polite to OSM
    print(f"[INFO] geocoded {n_geo} new districts")

    # Assemble states -> districts.
    states = {}
    for _, row in sd.iterrows():
        st, di = row["state"], row["district"]
        skey = norm(st).replace(" ", "-")
        dkey = norm(di).replace(" ", "-").replace("/", "-")
        c = cache[f"{norm(st)}|{norm(di)}"]
        states.setdefault(skey, {"key": skey, "name": st.strip(), "districts": {}})
        states[skey]["districts"][dkey] = {"key": dkey, "name": di.strip(),
                                            "lat": c["lat"], "lon": c["lon"]}
    states_list = []
    for s in sorted(states.values(), key=lambda x: x["name"]):
        s["districts"] = sorted(s["districts"].values(), key=lambda x: x["name"])
        states_list.append(s)

    # Premises with prices + coordinates.
    price_map = {}
    code_to_id = {b["code"]: b["id"] for b in sel_items}
    for _, r in rep.iterrows():
        price_map.setdefault(r["premise_code"], {})[code_to_id[r["item_code"]]] = float(r["price"])

    premises = []
    for _, r in prem.iterrows():
        c = cache[f"{norm(r['state'])}|{norm(r['district'])}"]
        addr = " ".join(str(r["address"]).split()).strip().strip(",").strip()
        premises.append({
            "code": int(r["premise_code"]),
            "name": " ".join(str(r["premise"]).split()).strip(),
            "address": addr,
            "type": TYPE_LABEL.get(r["premise_type"], str(r["premise_type"]).strip()),
            "state": norm(r["state"]).replace(" ", "-"),
            "district": norm(r["district"]).replace(" ", "-").replace("/", "-"),
            "lat": c["lat"], "lon": c["lon"],
            "prices": price_map.get(r["premise_code"], {}),
        })

    # National average price per item (the savings baseline / typical shelf price).
    natl_avg = rep.groupby("item_code")["price"].mean().round(2).to_dict()
    # `asof` = the month each item's price is really from (current month for most,
    # an earlier month for backfilled items). Kept honest and shown in the UI.
    items = [{"id": b["id"], "code": b["code"], "name": b["name"], "short": b["name"],
              "full": b["full"], "emoji": b["emoji"], "unit": b["unit"], "cat": b["cat"],
              "base": float(natl_avg.get(b["code"], 0.0)), "asof": asof.get(b["code"], month)}
             for b in sel_items if natl_avg.get(b["code"])]
    backfilled = sum(1 for it in items if it["asof"] != month)

    snapshot = {
        "meta": {
            "source": "DOSM PriceCatcher (data.gov.my open data)",
            "price_month": month,
            "generated": time.strftime("%Y-%m-%d"),
            "premise_count": len(premises),
            "item_count": len(items),
            "backfilled_count": backfilled,
            "note": "Real premises, addresses and prices. Items without a price this "
                    "month use their most recent prior-month DOSM price (see each item's "
                    "asof). District coordinates are geocoded approximations.",
        },
        "categories": cats,
        "items": items,
        "states": states_list,
        "premises": premises,
    }

    os.makedirs(os.path.dirname(OUT_JS), exist_ok=True)
    with open(OUT_JS, "w", encoding="utf-8") as f:
        f.write("/* AUTO-GENERATED by build/build_snapshot.py — do not edit by hand.\n")
        f.write(" * Real DOSM PriceCatcher open data. Creator & owner: Tan Wei Siang.\n")
        f.write(f" * Price month: {month} | premises: {len(premises)} | generated: {snapshot['meta']['generated']}\n")
        f.write(" */\n")
        f.write("window.JIMAT_SNAPSHOT = ")
        json.dump(snapshot, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"[OK] wrote {OUT_JS} ({os.path.getsize(OUT_JS)//1024} KB, {len(premises)} premises)")


if __name__ == "__main__":
    main()
