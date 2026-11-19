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
