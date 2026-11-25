# PRISM build log (append only)

> What has actually been built, against which part of the spec, how it was checked, and where it differs from the spec. The spec itself lives in `docs/versions/` (newest = build reference). Differences listed here get absorbed into the next spec version.

---

## 2026-11-19 · Sprint days 1–2, plus the engines from days 3–6 (spec: v0.4)

### Built
| Area | Files | Spec |
|---|---|---|
| Rules (editable JSON) | `data/rules/methods.json`, `ranking.json`, `rewards.json`, `built70.json`, `training.json` | §8.1–8.6, §7 M8 |
| Presets | `data/presets/industries/ev-auto.json`; `data/presets/countries/india.json`, `china.json` | §4.1, §9 |
| Sample-data generator | `scripts/generate_sample_data.py` (seeded; one source of truth for everything below) | §10.3 |
| VoltBridge sample org | `data/sample-org/voltbridge.json`: 256 people, exactly the §6.1 headcount; 5,736 KPI rows; 1,892 feedback rows; 1,089 check-ins; dev goals, passport experiences, training records, reward policy, recognition, country config | §6.1, §10.2 |
| Excel | `data/templates/pms_input_template.xlsx` (README sheet + 17 sheets, drop-downs, one example row each) and `voltbridge_filled.xlsx` (same layout, full data) | §10.2 |
| Engines | `js/engine/`: `scoring`, `built70`, `methods`, `ranking`, `rewards`, `bias`, `development` (9-box, TNA, Kirkpatrick), `country`, `index` (`runAll`) | §8, §9, §7 |
| Checks | `scripts/check_engine.mjs` | §6.1 personas |

### How to run
```
python3 scripts/generate_sample_data.py   # rebuilds every data file and both workbooks
node scripts/check_engine.mjs             # runs the engine on VoltBridge and checks each persona's story
```

### Checks: 24 of 24 pass
- Sales India (31 comparable) and China (32) → forced distribution for reward tiers; pace 9 → cutthroat tiers 15/75/10
- Customer Support India (22 comparable) → relative calibration; China (8) → ranking refused (**Wang Fang**)
- Assembly, Quality, Charging, Battery R&D, Software → absolute standards + calibration
- Method Mixer: Assembly → traditional-heavy (Checklist 35 / BARS 35 / KPI 30); R&D and Software → contemporary (OKRs lead); Sales → hybrid (Ranking 40 / KPI 35 / Dashboard 25)
- **Ritu:** safety index scores below 2.5 while output is on target; never ranked; TNA suggests the HV-safety refresher (assigned, not yet done)
- **Zhang Wei:** OKRs average 0.7 → results 3.5 (met); stretch shield → ramp-up weights 40/30/30 and out of ranking pools; helix 7/7 (5 stamps + 6 coaching sessions + a course)
- **Arjun:** top tier + Club trip; 9-box Star → Accelerate
- **Karan:** #2 on units in India but failed the fair-selling gate in Q3 → rating capped at 2, kept out of the top tier, kicker withheld
- **Chen Jing:** bottom tier in China → training/reassignment first; the same data under the India lens → documented PIP
- **Vikram:** team rated 4.65 on average against a company average of 3.16 → leniency flag; "leaders built" KPI below 2
- Pace 9 → protected learning time reduced to 3% (never 0)
- Budget guard: bonuses use 92% (India) and 95% (China) of the target pool

### Where the build differs from v0.4 (to fold into v0.5)
1. **Supply Chain (3 + 3) and People Managers (8 + 6)** come out as *absolute standards + calibration*, not the *relative calibration* that §6.1 expected. Their pools are under 20, and the §8.2 rule wins.
2. **"Ranking" as a method** is also allowed when the verdict is *relative calibration*, because calibration compares people without quotas. This makes Customer Support India *hybrid*, as §6.1 expects. Customer Support China (8 people) stays *contemporary*.
3. **Balanced Scorecard** coefficients were raised so managers come out "360° + Balanced Scorecard", as §6.1 expects.
4. **Reward_Policy** holds two kinds of row (grade rows; rating × compa-band rows) so the §10.2 column list is kept as written. The engine reads it first and falls back to `rules/rewards.json`.
5. **Sales recent movers capped** (1 in India, 2 in China) so both sales pools stay at 30 or more after the ramp-up shield.
6. **Leadership_Profile** ships without the optional trait fields (never scored anyway).
7. **New rule file** `data/rules/training.json` (KPI/competency → course map, mechanism by gap type) for the TNA.
8. **Charging Technicians** blend comes out *contemporary* (KPI 40 / Checklist 30 / Dashboard 30); §6.1 did not specify it.

### Next (sprint days 3–6)
App shell (`index.html`, `css/`, `js/main.js`, `js/store.js`), `#hash` routing, Data Hub (load sample, upload Excel, validate, export), and the first screens on VoltBridge: M1 Strategy DNA, M2 Job Architecture, M3 KPI & OKR Library.


---

## 2026-11-19 (session 2) · EV app complete, local build

**Asked:** "Let's do all the steps in one go for just the EV and see the final product. I will run it locally before we discuss about pushing it to github."

### How to run
Double-click `start-prism.command` in the project folder (it finds a free port from 8000 and opens the browser). Or run `python3 -m http.server 8000` in the folder and open http://localhost:8000. ES modules do not load from `file://`, so opening `index.html` directly shows a help message instead.

### What was built
| File | Screen / role |
|---|---|
| `index.html`, `css/main.css` | Landing + app shell; design system; print and phone layouts |
| `js/main.js` | Boot, state, `#hash` routing, IN / CN / home lens with a "what changed" panel, person drawer, "Next: …" footer on every screen |
| `js/landing.js` | M0 prism: beam, spectrum, scroll shatter → 8 module cards; industry lens picker (EV built, pharma next) |
| `js/tour.js` | 9-step guided tour (v0.4 §14) with spotlight, narrator card, "Why?", "Try it yourself", resume, keyboard |
| `modules/overview.js` | M12 dashboard: counts, real distribution vs bell curve, talent snapshot, IN vs CN, personas |
| `modules/dna.js` | M1 sliders re-run the engine; live "PMS personality"; DNA radar; vision → BSC → departments → KPIs cascade |
| `modules/jobs.js` | M2 JD flip card (JD, KSAOs ↔ KPIs, gate, role-profile radar, BARS); role-profile sliders feed M4/M5 live |
| `modules/kpis.js` | M3 KPI/OKR table, SMART ticks, live weight donut (apply & re-score), scoring curve, gates |
| `modules/methods.js` | M4 mixer board (11 faders), gauge, why per method, affinity bars, all-roles table |
| `modules/ranking.js` | M5 pool matrix, lit decision path, histogram, leaderboard + tiers, editable rules |
| `modules/review.js` | M6 calendar per country, SBI / GROW / feed-forward script from the data, drag-and-drop calibration board, check-ins, appeals |
| `modules/rewards.js` | M7 coins-into-jar bonus, formula, merit heatmap, company factor + budget guard, gainsharing what-if, sales tiers, total-rewards wheel, delivery planner, recognition wall |
| `modules/develop.js` | M8 9-box, IDP 70-20-10, vision capability map, three-level TNA, gap → mechanism, Kirkpatrick L1–L4 |
| `modules/forge.js` | M8b helix (canvas) + passport filled from real stamps, "Play the year", five room-to-grow switches that re-run the engine, pipeline, bench strength |
| `modules/consultant.js` | M9 12-question health check (pre-filled from data), maturity radar, recommendations, bias detector, development-room audit, 16-week rollout, risk register, print report |
| `modules/lens.js` | M10 off / compare / built-in; flip card per person; same role IN vs CN; editable country config |
| `modules/people.js` | Directory with filters and search |
| `modules/datahub.js` | M11 template download, Excel/CSV upload (ExcelJS, in the browser), §10.2 validation with sheet + row, commit, JSON / results-workbook export |
| `modules/about.js` | M13 cycle, rules in plain English (read live from the rule files), brief coverage with links, glossary, references, fictional-data notice |

Engine change: `built70.js` accepts two switches (`shield_enabled`, `stamp_needs_feedback`) for the Forge toggles and returns each person's experience list. `node scripts/check_engine.mjs` still passes 24/24.

### How it was checked
- Headless Chrome (Playwright) opened every route at 1440×900 and 390×844: no console errors, no screen errors.
- Interaction run: landing shatter; full tour (9 steps + final card); Pace 9 → 4 changes review rhythm, PIP length, tiers and learning time; CN lens lists every changed rule; calibration moves Vikram's team from 4.79 to 3.17 and a dragged card lands in its column; shield off → 18 people re-enter pools; bonus release counts up to ₹2,41,050 for Arjun; `voltbridge_filled.xlsx` uploads with 0 errors and re-scores the same 252 people; the blank template shows 3 errors with sheet and row; results workbook downloads.

### Where the build differs from v0.4 (to fold into v0.5)
9. **Calibration board** uses the manager's own average rating of each person as "the proposal" and the engine rating as "the evidence".
10. **Gainsharing** for Ritu's line is ₹0 this year (output 98% of standard), so the screen adds a "what if output were…" slider.
11. **Bench strength:** ready now = top-three 9-box with 3+ built rungs; 1–2 years = top-three box or 2+ rungs.
12. **Development-room audit** flags: under 50% of the team with a growth goal; "leaders built" score ≤ 1.8; teams of 10+ with no one on a stretch.
13. **Appeals path** (4 steps) and the India grievance note are generic and marked ⚠️ until checked against the Labour Codes.
14. **Three.js** is not used yet: the prism and helix are the 2D/canvas prototype versions (§13.7 rule: keep 2D unless 3D holds 60 fps).

### Next
Deshank runs it locally and reviews. Then: GitHub (private repo + Pages), the ⚠️ source checks, and the pharma (Helixa) preset.

---

## 2026-11-20 · QA fix pass (PRISM_QA_report.pdf)

Worked through every item in the QA report: the 106 numbered bugs (C1–C3, H1–H11, M1–M35, L1–L47, X1–X10), the vision-slider section, the "suspected" list and the motion-lab notes P1–P3. The app was already live on GitHub Pages; this entry is the fix pass on top of it.

### What changed
- **Engine.** The leadership track now includes the top three 9-box boxes (judged on standard weights first, so the track can't flip itself). Scores come from unrounded item scores; ties sort on the unrounded composite, then results, then ID. A missing gate is "no data" with no penalty. Compa 0.90 is mid. The kicker goes to the top 20% who passed the gate. The learning wallet is fixed by grade plus top-ups, and is counted in total rewards. The bottom-tier step reads Country_Config (one source of truth), and pace adds the PIP length. The bottom tier can't swallow a whole pool when it rounds to 0.
- **Strategy DNA does what it says** (new `data/rules/dna.json`). Innovation ≥ 7 scores key results as OKRs, otherwise straight-line on the sheet's thresholds. Cost focus ≥ 8 rescales bonuses to the pool (strict guard), otherwise it only warns. Team orientation ≥ 7 raises the gainsharing share to 40%. Risk appetite ≤ 4 caps a failed gate at 1. Customer intimacy ≥ 8 weights "Customer" KPIs ×1.5. Pace sets the check-in/review rhythm and the India PIP length, and every screen uses that one rhythm. "What changed" lists effects across the whole app.
- **Data Hub.** Uploads of other organisations work: the sample personas are kept only when the organisation and the people match. The review date for a new organisation is the end of its latest KPI_Actuals period. The validator, now in `js/engine/validate.js` so Node can test it, checks:
  - potential 1/2/3
  - base pay and range midpoint, and a compa-ratio of 0.5–2.0
  - each grade against Reward_Policy, and currency against country
  - numeric actuals; KR actuals 0–1; gate actuals 0/1; values far out of range
  - progress 0–100, and dates not after the review date
  - every reference on the optional sheets, own-manager and reporting loops
  - weights to 0.01

  Errors carry real Excel row numbers.
  
  Other Data Hub changes:
  - Unreadable files, 0-byte files, semicolon CSVs, the blank template and the Results workbook each get one plain message.
  - CSV names match sheets loosely (employees.csv, Employees (1).csv).
  - JSON import added: the "Data as JSON" export loads back in.
  - The Results export adds commission, kicker, total variable pay, gainsharing, learning wallet, total rewards, the bottom-tier step and a Settings sheet.
  - Work is saved in this browser, with "Forget saved work"; reloading the sample clears it.
  - "Use this data" can't leave the app half-switched.
- **Screens.**
  - Drawer links go where they say: Review conversation opens the conversation tab, Forge shows the clicked person (tagged if off the track), and Country Lens shows that person.
  - The drawer is a proper dialog (Esc, focus trap, URL in sync).
  - Country Lens: "Off" really applies India's rules, and edits are checked and reach Ranking.
  - Smaller fixes: the KPI gate row shows a pass/fail card, and out-of-range weights can't be applied. Listeners and tweens are cleaned up between screens, and Play the year ends on Dec. The Consultant skips executive rows and builds its advice from pace. People search trims spaces and says "No matches". Uploaded values are escaped everywhere (XSS).
- **Tour.**
  - Clear panes block the dimmed page, and a click there pauses the tour, as does any navigation.
  - Double-clicks can't skip a step. Esc closes it, "↺ Start over" is on every step, and ▶ Tour resumes straight after closing.
  - On phones the card docks under the target. Step 7 docks left of the board, and step 8 shows gainsharing, sales tiers and recognition.
  - The final card is undimmed, with "Switch industry". Steps whose persona isn't in the data are skipped.
- **Layout, accessibility, print.**
  - No inline grid columns left; the phone and tablet fixes for H9–H11 and M24–M35.
  - The top bar wraps to two rows on phones, and the side menu has a scrim.
  - The landing's hidden cards and buttons can't be clicked or tabbed to. Its header turns solid past the hero, and the spectrum labels fit narrow screens.
  - One `<main>` and an `<h1>` per screen; labelled controls; AA contrast (darker accent text and rating chips); 44 px touch targets; a print layout (the Consultant's report is 3 A4 pages).
  - The parked drawer and "What changed" panel are fully hidden.
- **Data.** Arjun's story says "9-box Star". Ritu's line averages 104.2% of standard output, so plant gainsharing pays ₹51,617 on the sample (a no-random post-step in the generator: only those 76 actuals change). Template drop-downs run to row 5,000, Departments and Reward_Policy have country lists, and the README sheet explains pay, potential, review date and gate data.
- **Fonts** are bundled in `vendor/fonts/` (Fraunces and Manrope, SIL OFL): no font CDN, same look offline.
- **Motion lab** (`prototypes/motion-lab/`) P1–P3: a solid phone header, spectrum labels that fit, and the bundled fonts.

### How it was checked
- `node scripts/check_engine.mjs`: 37/37 pass (24 persona checks + 13 validator checks).
- Headless Chrome (Playwright), against `python3 -m http.server`:
  - **Data tests:** C1 (3-role Acme, VoltBridge without Sales, 1 employee), C2, H5, M3 (script injected in every text field, none ran), M21, M22, L26, L28–L30, the filled and blank templates, the H7 round trip (export → import, reload restores, Results workbook refused) and H8.
  - **UI tests:** C3, X5, M4, M10, L1, M11, H2–H4, L6, M8, L8, M1, M2, M12, M14, M15, M16, the full tour (M6, M7, L2, L3, X3, X4, X6), L12 (no listener or tween build-up after 30 screen visits), L13, L34, X1, L43 and L44.
  - **Layout tests** at 844×390, 390, 360, 768 and 1024: H9–H11, M23–M35, L38, L40, L41, X7–X9, and no screen scrolls sideways.
  - **Smoke test:** every screen at six sizes, with no console errors and no NaN, undefined or `${` in the text.
  - **Accessibility and print:** axe-core found no serious or critical issues on the 15 screens or the drawer. The Consultant's report prints on 3 A4 pages, and Forge prints dark-on-white.

### Differences from v0.4 (to fold into v0.5)
15. The Strategy DNA thresholds above, from `data/rules/dna.json`. Risk appetite was specified as "gates on by default". It is built as a stricter gate cap instead, so no gates are invented for roles that have none.
16. Leadership track = people managers, anyone flagged, and the top three 9-box boxes (judged on standard weights).
17. Missing gate data means no penalty: shown as "no data", plus a Data Hub warning.
18. The learning wallet is a grade amount plus 50% for high potential plus 25% per training gap (max 2), and is counted in total rewards.
19. Work is kept in this browser's storage (spec §10.1 "Saved in this browser"); the JSON export loads back in.
20. The review date of an uploaded organisation is the end of its latest KPI_Actuals period, or an optional Org `review_date` column.
21. Item 10 above is superseded: Ritu's line now beats standard (104.2%), and the pool is ₹51,617.
22. The tour skips steps whose persona isn't in the loaded data.

### Open decision
- **Commission on a failed gate:** Karan still gets full commission on his bookings. The spec removes only the top-tier reward and the kicker, so this was left as it is. Decide whether a failed fair-selling gate should also hold back commission.

---

## 2026-11-23 · Feedback conversation toolkit and tour v2 (spec: v0.5)

**Asked:** check whether the app covers feedback and performance reviews and add or improve it with Deshank's appraisal-interview checklist, the rules for a defensive employee and for delivering criticism, and "Falkman's" research; update the README; fix the tour's transitions, the scroll lock ("if I scroll up I can't scroll down during the tour") and its flow, and bring the feedback work into it.

### What was there
The Review & Delivery screen already had an SBI / GROW / feed-forward script built from each person's data, the calibration board, the review calendar, check-ins and appeals. It had no appraisal-interview checklist, nothing on defensive employees, no rules for criticism and no feedback research. So the tab was extended, not replaced.

### What changed
- **New `js/feedback.js`**, mounted under the script on the conversation tab (renamed "Feedback conversation"):
  - *Before the meeting:* four signals from the data (no surprises, defensiveness, objective/free of bias, in private), with reasons.
  - *Appraisal-interview checklist:* the nine questions with evidence from the data for each; item 9 uses the KPI library's SMART check (`smart()` is now exported from `modules/kpis.js`). Ticks are saved per person (`state.talk`, kept with the rest of the browser save).
  - *If [name] gets defensive:* the four rules with a sentence to say; highlighted with the reasons when defensiveness is likely.
  - *Delivering criticism:* the five rules, plus a sentence checker (labels, "always/never", no next step, no fact, comparisons, two Folkman habits), starting from a draft written from the failed gate or weakest KPI.
  - *What the research says:* Zenger & Folkman (2013, 2014, 2015), Losada & Heaphy with the Brown et al. (2013) caveat, Meyer, Kay & French.
- **About & Method:** brief line, two glossary entries (appraisal interview, corrective feedback) and seven references (Dessler marked ⚠️ edition to confirm).
- **Tour v2 (`js/tour.js` rewritten):**
  - *Flow:* a welcome card, then ten stops in cycle order (plan → assess → review → reward → develop → country → renew) with chapter labels. Stop 6 is new: Karan's feedback conversation. Stops call back to each other (Karan at stop 3 → stop 6).
  - *Scroll lock fixed:* the four clear panes that blocked the dimmed page are gone. They caught wheel and touch events, and when the highlight scrolled off screen they covered everything, so the page could not scroll back. Clicks on the dim are now caught by a document listener instead, so nothing blocks scrolling; a wheel over the narrator card scrolls the page too.
  - *Transitions:* card out → iris closes → next screen loads under the dim → its entrance animation is finished → the page glides to the highlight → iris opens → card in. Stops on the same screen skip the iris and the spotlight follows the glide. "↑/↓ Back to the highlight" appears when the highlight is scrolled away.
  - *Placement:* beside, under, or docked at the bottom with the spotlight ending above the card (wide, tall highlights and phones), so the card never covers what it is talking about.
- **CSS:** feedback toolkit styles (screen, phone, print); `.tour-return`; "What changed" sits above the dim on desktop so stop 1 can show it; the `.tour-block` panes are removed.

### How it was checked
- `node scripts/check_engine.mjs`: all persona checks pass.
- **New tour test** at 1440×900, 1024×768 and 390×844 (phone): every stop's spotlight sits on its target; the page glides (no single frame jumps more than about a third of the distance); each stop settles in under 2.5 s; the card doesn't cover the highlight (except at stop 5, where it docks in the board's empty columns by design); scrolling up and then down mid-tour works, over the dim and over the card; "Back to the highlight" appears and glides back; ten stops in order; the final card is undimmed; no page errors.
- **New feedback test** at 1440 and 390: the toolkit renders for Karan with no NaN/undefined; nine items; the signals; ticks and the draft survive a reload; "lazy" and "always" are flagged and a good sentence passes every check; another person renders cleanly; no sideways overflow.
- **Updated UI test:** the tour block now covers the welcome card, double-click, a click on the dim (pauses and doesn't reach the page), resume, navigation pause, Start over, stops 3–7 and the final card. All UI, data, layout and smoke tests pass; axe-core finds no issues on the feedback tab or the tour card; the conversation tab prints on 4 A4 pages.

### Spec
The 22 differences from v0.4 recorded above are folded into **v0.5 §8.7**, so they are no longer open differences.

### Notes
- "Falkman" is read as **Joseph Folkman** (Zenger Folkman). The YouTube video wasn't identified, so the toolkit uses his written research; the link is an open question (v0.5 §19).
- Open decision (unchanged): commission on a failed fair-selling gate (v0.5 D-13).

---

## 2026-11-26 · Country Lens Built-in rebuilt; searchable dropdowns (spec: v0.5)

**Asked:** "Built-in · edit the rules" on the Country Lens seems redundant and doesn't work; the person dropdown is too long to scroll, so it needs a search, and so does every other dropdown.

### Why Built-in looked broken
Built-in showed exactly the Compare page, and the only difference was that the configuration table at the very bottom turned into text boxes. Of its 19 rows, only two feed the engine (the bottom-tier step and the performance-year start month), and the bottom-tier code was hidden from the table. Editing any other row changed wording on another screen and nothing on this one, so it looked as if nothing happened.

### What Built-in is now
1. **Which rulebook runs the whole app?** Three choices: each person's home country, India for everyone, China for everyone. This is the same as the top-bar Home · IN · CN switch, now explained where the choice lives.
2. **What this rulebook does right now:** the bottom-tier people grouped by their next step (names open the profile), each group's performance year, and the feedback tip reviewers get.
3. **Edit the rules the engine uses:** the bottom-tier step per country as a two-way switch (improvement plan or training/reassignment first; its wording follows) and the performance-year start month per country. The improvement-plan length is shown as set by Pace in Strategy DNA. A change re-runs the app at once: section 2 updates on the spot and "What changed" counts whose next step moved. Reset brings back the loaded rules.
4. **Wording shown on other screens** (folded away): the remaining 17 text rows, each with the screens it appears on. Wording only, so no numbers change.

Compare is now read-only and points to Built-in ("Run the whole app on one rulebook →", "Edit these rules →").

### Searchable dropdowns
All 10 existing dropdowns (the top-bar persona jump, Country Lens person and role, Rewards person and gainsharing manager, Review person and calibration manager, Development, Leadership Forge and People) and the two new month pickers open a list with a search box. All typed words must match, accents are ignored, and the search also covers the group label and site, so "support shenzhen" finds the Shenzhen support team. Arrow keys, Enter, Esc and a click outside all work; the native select stays in the page, hidden, so every screen's own logic is unchanged.

### How it was checked
- New test at 1440 and 390 (phone): every dropdown is searchable; typing filters (single and multi-word, no-match message); Enter picks and the page follows; Esc and a click outside close it; the persona jump opens the profile and resets. Built-in: four sections, clean text; "China for everyone" puts all 6 bottom-tier people on training/reassignment; switching India's step moves India's 3, reaches the Ranking Engine and is counted in "What changed"; a July start makes India's year "July to June" in the Review calendar; edited wording shows on Rewards; Reset restores everything; edits survive a reload; no sideways overflow.
- The UI, data, layout, smoke, tour, feedback and engine checks all pass. axe-core finds nothing new (the only finding is the existing top-bar "region" note, outside the page).

### Differences from v0.5 (to fold into v0.6)
1. Country Lens Built-in has the four sections above; Compare is read-only.
2. Every `select.sel` is a searchable list (`enhanceSelects` in `js/ui.js`).
