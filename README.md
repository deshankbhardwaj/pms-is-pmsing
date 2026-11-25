# PRISM: PMS web app (course project) · project index

> **Start here.** This file is only the index: where everything is, and what each version decided. The full specs live in `docs/versions/`, one frozen file per version. **The newest version is the build reference:** [v0.5](docs/versions/v0.5_2026-11-23_feedback-tour.md).

## How these docs work
- **Each version is a separate, frozen file** in `docs/versions/`, named `vX.Y_YYYY-MM-DD_topic.md`. Once a newer version exists, an older file is never edited.
- **Each version opens with "What changed"** and then holds the *complete* spec, so the newest file is all a builder needs.
- **A change = a new version file.** Copy the newest version, give it the next number, edit it, write its "What changed" block, then add a row to the table below.
- **This README changes in only three places:** the current-state table, the version list (append a row) and the open questions.
- Older versions stay readable, so a dropped idea (e.g. the v0.1 live-deck plan) can always be recovered.

## Current state (2026-11-26)

| | |
|---|---|
| What | A Performance Management System as an online web app. App only, no live presentation; it must explain itself |
| Owner | Deshank (MDI Gurgaon, PGDM-HRM 2026–28) + group (TBD) |
| Phase | **EV build live on GitHub Pages** (repo `deshankbhardwaj/pms-is-pmsing`). All 15 screens (M0–M13 + People) and the guided tour work on VoltBridge and on uploaded organisations. QA report fixed (20 Nov). **New (23 Nov):** a feedback conversation toolkit on the Review screen (appraisal-interview checklist, defensive employees, delivering criticism with a sentence checker, Zenger & Folkman research) and **tour v2** (welcome + 10 stops in cycle order, smooth transitions, scrolling never blocked). **26 Nov:** Country Lens *Built-in* rebuilt (pick the rulebook, see its effect, edit the rules the engine uses) and every dropdown is searchable; see the build log. Next: the open decision (commission on a failed gate), the Folkman video link, the ⚠️ source checks, then pharma |
| Run it | Double-click **`start-prism.command`** (opens http://localhost:8000). Or in this folder: `python3 -m http.server 8000`. It does not work by double-clicking `index.html` |
| Build log | [docs/BUILD_LOG.md](docs/BUILD_LOG.md): what's built, how it was checked, where it differs from the spec |
| Build order | **EV (VoltBridge) first, then pharma (Helixa)**, both on one engine |
| Countries | India and China only |
| Signature idea | Born 30 · Built 70: Leadership Forge (helix + experience passport) |
| Hosting | GitHub Pages, served from the repo root (`deshankbhardwaj/pms-is-pmsing`); Claude artifacts only for previews |
| 3D | Three.js in the app; Blender only for an optional hero asset (proposed) |
| Deadline | Not confirmed; working to **3 Dec 2026**, buffer to 8 Dec |
| Whiteboard | [PRISM: PMS app plan](https://claude.ai/artifact/XAnkMVKevDwPAjMGCDgWg3) |
| Motion prototype | [PRISM motion lab](https://claude.ai/artifact/XoVf1GTvHF1S45PeWR8hMZ) · source in `prototypes/motion-lab/` |

## Versions

| Version | Date | File | What it decided or changed |
|---|---|---|---|
| **v0.1** | 18 Nov | [v0.1_2026-11-18_brainstorm.md](docs/versions/v0.1_2026-11-18_brainstorm.md) | First brainstorm. Brief captured; "one core, many lenses" architecture; 13 modules; decision engines (Method Mixer, Ranking Engine); India–China lens; Excel data model; hosting (GitHub Pages + artifact mirror); prism landing; presentation plan; **EV sample org VoltBridge in full detail** |
| **v0.2** | 18 Nov | [v0.2_2026-11-18_built70-pharma.md](docs/versions/v0.2_2026-11-18_built70-pharma.md) | Added **Born 30 · Built 70** (Leadership Forge rules) and the Training Engine (TNA → method → Kirkpatrick). Dropped the presentation (app only, guided tour instead), the live poll and runtime AI. Recommended switching to pharma (Helixa) over the AI-convergence worry. Three-mode country lens; 15-day plan; whiteboard |
| **v0.3** | 18 Nov | [v0.3_2026-11-18_motion.md](docs/versions/v0.3_2026-11-18_motion.md) | Built and tested the **motion prototype**; full motion spec: art direction, principles, tokens, storyboards, per-module catalogue, presentability checklist |
| **v0.4** | 19 Nov | [v0.4_2026-11-19_ev-first.md](docs/versions/v0.4_2026-11-19_ev-first.md) | **EV first, then pharma** (Deshank). VoltBridge spec restored from v0.1 and updated (gates, Built-70 persona, "leaders built" KPI, 7th persona). Pharma kept as the second deep preset. **Three.js over Blender** as the 3D runtime. Docs split into frozen versions + this index |
| **v0.5** | 23 Nov | [v0.5_2026-11-23_feedback-tour.md](docs/versions/v0.5_2026-11-23_feedback-tour.md) | **Feedback conversation toolkit** on the Review screen (Deshank): Dessler's nine-point appraisal-interview checklist filled from the data, rules for a defensive employee, rules for delivering criticism with a sentence checker, Zenger & Folkman research. **Tour v2:** welcome + 10 stops in cycle order, a Karan feedback stop, smooth transitions, scrolling never blocked. Build-log differences 1–22 folded into the spec (§8.7) |

> Note on recovery (19 Nov): v0.1 had been overwritten by later edits, so it was restored word for word from the chat history. v0.2 was rebuilt from v0.3 by reversing the v0.3 changes (byte size matches the original). v0.3 was saved unchanged.

## Where to find things (in the newest version, v0.5)

| Topic | Section |
|---|---|
| The brief, word for word (all three messages) | §1 |
| Requirement → feature map | §2 |
| Architecture ("one core, many lenses") | §4 |
| Industry decision and differentiation | §5 |
| EV sample org VoltBridge (build first) | §6.1 |
| Pharma sample org Helixa (second) | §6.2 |
| Modules M0–M13 | §7 |
| Feedback conversation toolkit (checklist, defensive employees, criticism) | §7 M6 |
| Engine rules: methods, ranking, scoring, rewards, Built 70 | §8 |
| Build decisions folded in from the build log | §8.7 |
| India vs China | §9 |
| Excel template & data model | §10 |
| Hosting | §11 |
| Tech stack | §12 |
| Motion, visuals, Three.js vs Blender | §13 |
| Guided tour v2: stops, motion, scrolling (evaluator experience) | §14 |
| Plan & dates | §16 |
| Decisions | §18 |
| Sources | §21 |

## Open questions
1. Exact deadline date?
2. Group members (RollNumber_Name)?
3. India–China: does the professor want it explored or built in? (The app covers both.)
4. OK to lock hosting as GitHub Pages only?
5. Fictional companies OK, or a real one expected?
6. Which GitHub account? Does GitHub Education give private-repo Pages?
7. Any MDI/course branding requirements?
8. Which Folkman YouTube video (link) should the feedback toolkit cite?
9. Which Dessler edition does the course use?

## Folder map
```
PMS Project/
├── README.md                ← this index
├── index.html               ← the app (landing + app shell)
├── start-prism.command      ← double-click to run the app locally on a Mac
├── css/main.css             ← design system and every module's styles
├── js/main.js               ← boot, state, routing, country lens, person drawer
├── js/landing.js · tour.js  ← prism landing (M0) · guided tour v2
├── js/feedback.js           ← feedback conversation toolkit (Review screen)
├── js/ui.js · charts.js     ← shared helpers, animated SVG charts
├── js/modules/              ← one file per screen (overview, dna, jobs, kpis, methods, ranking, review, rewards, develop, forge, consultant, lens, people, datahub, about)
├── vendor/                  ← GSAP (+ ScrollTrigger, Flip, Draggable), ExcelJS: bundled so it works offline
├── docs/versions/           ← v0.1 … v0.5 (frozen specs; newest = build reference)
├── docs/BUILD_LOG.md        ← build progress, checks, differences from the spec
├── data/                    ← rules/, presets/, sample-org/voltbridge.json, templates/*.xlsx
├── js/engine/               ← PMS engines (scoring, methods, ranking, rewards, Built 70, bias, development, country)
├── scripts/                 ← generate_sample_data.py, check_engine.mjs
├── package.json             ← lets Node run the engine checks (no build step)
└── prototypes/motion-lab/   ← motion prototype (open index.html via a local server)
```
