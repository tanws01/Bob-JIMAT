# 🛒 JIMAT — Shop Smarter. Save More.

> **What if your grocery list could figure out the smartest way to shop — before you leave home?**

JIMAT is a Malaysian smart grocery optimisation platform that turns **one grocery list into three ready-to-shop strategies**, using real DOSM PriceCatcher data.

It doesn't just tell you where one item is cheapest.

It calculates **how to buy your entire basket** while balancing **price, distance, convenience, and number of stops**.

### 🟢 Best Value

**Save more, without going too far.**
Balances savings against travel and shopping effort.

### 🔵 Most Convenient

**Everything in one store.**
Prioritises simplicity and minimum hassle.

### 🟠 Cheapest Possible

**Pay the lowest basket price.**
Uses multiple stores when necessary to minimise total cost.

**From grocery list → optimisation → shopping plan → actual savings.**

---

# 🏆 Built Around the Bob-athon Judging Criteria

| Judging Criteria                 | How JIMAT Addresses It                                                                                                                                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 🤖 **IBM Bob**                   | Bob was used throughout the development process to turn the product concept into a working application, iterate on UX, implement logic, work with real data and refine the end-to-end experience. |
| ⚙️ **Technical Implementation**  | A real optimisation engine combines grocery prices, quantities, store availability, distance and shopping effort to generate three distinct strategies.                                           |
| 💡 **Problem Solving**           | JIMAT solves a real everyday problem: shoppers cannot practically compare an entire grocery basket across multiple stores and determine whether the savings justify the extra travel.             |
| 🚀 **Feasibility — NoSlop**      | Focused on one core job: **optimise your grocery trip**. No unnecessary chatbot, receipt scanner, calorie counter or fake AI features.                                                            |
| 🎤 **Presentation**              | A simple end-to-end journey makes the value immediately understandable: **List → Optimise → Choose → Shop → Save**.                                                                               |
| 🌱 **Sustainability & Adoption** | Built on existing public DOSM data, lightweight browser technology, nationwide coverage and a recurring weekly/monthly use case.                                                                  |

---

# 🤖 1. How IBM Bob Was Used

## Bob was part of the development process — from idea to working product.

JIMAT was developed iteratively with **IBM Bob** across the product, UX and technical implementation.

### 💭 Product Development

Bob helped translate the initial idea into a clear product experience:

**Problem → User Flow → Features → Working Prototype**

### 🎨 UX & Frontend

Bob was used to build and refine the interactive multi-screen journey, including:

* Landing experience
* Location selection
* Grocery basket
* Optimisation animation
* Three-strategy comparison
* Shopping checklist
* Savings dashboard
* Multilingual interface

### 🧠 Optimisation Logic

Bob was used to implement and iterate on the core logic behind:

* Basket cost calculation
* Store selection
* Price comparison
* Distance consideration
* Three shopping strategies
* Savings calculations
* Impact projections

### 🇲🇾 Real Data Integration

Bob helped structure the application around **real DOSM PriceCatcher data**, rather than creating a mock supermarket dataset.

### 🔄 Iteration

The development process was iterative:

```text
IDEA
 ↓
BOB
 ↓
BUILD
 ↓
TEST
 ↓
REFINE
 ↓
BOB
 ↓
BETTER PRODUCT
```

Bob accelerated implementation, while the **product concept, priorities, trade-offs and final direction remained human-led**.

---

# ⚙️ 2. Technical Implementation

## JIMAT solves the problem at the basket level.

Traditional price comparison asks:

> **"Which store has the cheapest milk?"**

JIMAT asks:

> **"What is the cheapest and most practical way to buy everything on my list?"**

The engine considers:

```text
Grocery Items
     +
Quantity
     +
Real Store Prices
     +
Store Location
     +
Travel Distance
     +
Number of Stops
     +
Shopping Effort
     ↓
OPTIMISATION ENGINE
     ↓
3 SHOPPING STRATEGIES
```

### Real optimisation, not a static comparison table

JIMAT calculates a baseline from average shelf prices, identifies candidate stores within the selected radius, and evaluates different combinations of stores and prices.

The three strategies intentionally optimise for **different user priorities**:

| Strategy             | Primary Goal       | Trade-off                                |
| -------------------- | ------------------ | ---------------------------------------- |
| 🟢 Best Value        | Savings + effort   | Some extra travel for meaningful savings |
| 🔵 Most Convenient   | Simplicity         | May sacrifice some savings               |
| 🟠 Cheapest Possible | Lowest basket cost | More stores / more travel                |

This makes the output **actionable**, rather than simply informational.

---

# 🇲🇾 3. Real Data

JIMAT uses real **DOSM PriceCatcher open data**.

Current snapshot:

* **301 real grocery items**
* **6 grocery categories**
* **2,140 real premises**
* **All 16 Malaysian states**
* **291 current-month priced items**
* **10 items with historical backfill**

JIMAT does not invent prices for products that are not represented in the available data.

When a product does not have a current-month price, the most recent available DOSM price can be used and its date is shown to the user.

---

# 🚫 4. Feasibility — NoSlop

## JIMAT deliberately does less — but does it meaningfully.

We did not add features simply because they sound impressive.

### JIMAT does NOT have:

❌ Receipt scanner
❌ Calorie counter
❌ Generic AI chatbot
❌ Unnecessary social features
❌ Fake "AI-powered" features
❌ Invented grocery prices
❌ An unnecessary backend or database

Instead, every feature supports one core job:

> **Help a shopper make a smarter grocery shopping decision.**

### The product is intentionally focused:

**List → Compare → Optimise → Shop → Save**

That makes the concept easier to understand, easier to demonstrate, and more feasible to adopt.

---

# 🎤 5. Presentation & Demo

JIMAT is designed around one clear **WOW moment**.

### Before

```text
"I need to buy 15 grocery items."
```

The shopper normally has to manually compare stores and prices.

### After

```text
"Here are 3 ways you can shop."

🟢 Best Value
Save more with minimal extra effort.

🔵 Most Convenient
Buy everything in one store.

🟠 Cheapest Possible
Pay the lowest total price.
```

Then JIMAT turns the selected strategy into a **store-by-store shopping checklist** with real addresses and navigation.

The complete demo can be understood in one sentence:

> **Give JIMAT your grocery list. It figures out how you should shop.**

---

# 🌱 6. Sustainability & Potential Adoption

JIMAT is designed around an existing, recurring problem.

People don't buy groceries once.

They buy them **every week or every month**.

That makes grocery optimisation naturally suited to repeated use.

### Why JIMAT is feasible

**Existing data**
Uses publicly available DOSM PriceCatcher data.

**Low infrastructure cost**
The current application is a self-contained client-side web app.

**Nationwide foundation**
Real premises and price data cover all 16 Malaysian states.

**Accessible**
Supports English, Bahasa Melayu, Simplified Chinese and Tamil.

**Recurring value**
Every grocery trip creates another opportunity to save.

---

# 💰 7. Impact

JIMAT makes savings visible.

For example:

**RM10 saved per trip × 4 trips/month = RM40/month**

**RM40 × 12 = RM480/year**

**RM480 × 5 years = RM2,400**

*Illustrative example only — actual savings depend on the user's basket and available prices.*

The long-term goal is not simply to save a few ringgit on one shopping trip.

It is to help households turn **better everyday decisions into measurable financial impact.**

---

# 🔄 8. End-to-End User Flow

```text
01  START
 ↓
02  SET LOCATION
 ↓
03  BUILD GROCERY BASKET
 ↓
04  REVIEW BASELINE
 ↓
05  JIMAT OPTIMISES
 ↓
06  COMPARE 3 STRATEGIES
 ↓
07  CHOOSE A PLAN
 ↓
08  FOLLOW STORE-BY-STORE LIST
 ↓
09  SHOPPING MODE
 ↓
10  ENTER ACTUAL SPENDING
 ↓
11  SEE SAVINGS & IMPACT
```

### The JIMAT Loop

**LIST → OPTIMISE → SHOP → SAVE → REPEAT**

---

# 🔐 9. Privacy by Design

JIMAT is client-side.

There is currently:

* No user account
* No database
* No JIMAT backend
* No server-side grocery history
* No personal grocery data storage

The application can run directly in a modern browser.

---

# 🏗️ 10. Technical Architecture

```text
DOSM PriceCatcher
       ↓
Data Snapshot
       ↓
Data Adapter
       ↓
Optimisation Engine
       ↓
Application State
       ↓
Interactive UI
```

Project structure:

```text
JIMAT/
├── index.html
├── assets/
│   ├── css/
│   │   └── styles.css
│   └── js/
│       ├── i18n.js
│       ├── snapshot.js
│       ├── data.js
│       ├── engine.js
│       ├── live.js
│       └── jimat.js
└── build/
    ├── build_snapshot.py
    └── district_coords.json
```

The architecture deliberately separates:

**Real Data → Data Layer → Optimisation → UI**

This keeps the core optimisation logic independent from the presentation layer.

---

# ▶️ 11. Run JIMAT

No build step or dependency installation is required.

Open:

```text
JIMAT/index.html
```

Or optionally:

```bash
cd JIMAT
python -m http.server 8000
```

Then visit:

```text
http://localhost:8000
```

---

# 🌟 The Big Idea

Grocery prices already exist.

Store locations already exist.

Public data already exists.

**The missing piece is turning that information into a decision people can actually use.**

JIMAT does exactly that.

```text
OPEN DATA
    ↓
PRICE INTELLIGENCE
    ↓
BASKET OPTIMISATION
    ↓
SHOPPING PLAN
    ↓
REAL-WORLD SAVINGS
```

## 🛒 JIMAT

### **Don't just find a cheaper item.**

### **Find a smarter way to shop.**

**Shop Smarter. Save More.**
