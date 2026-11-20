#!/usr/bin/env python3
"""
PRISM sample-data generator (spec: docs/versions/v0.4, sections 6.1, 9 and 10).

Writes, from one source of truth:
  data/presets/industries/ev-auto.json     industry preset (roles, KPIs, competencies, defaults)
  data/presets/countries/india.json        country lens config
  data/presets/countries/china.json
  data/sample-org/voltbridge.json          full fictional sample org, one key per Excel sheet
  data/templates/pms_input_template.xlsx   blank template with a README sheet and one example row per sheet
  data/templates/voltbridge_filled.xlsx    the same workbook filled with VoltBridge data

Everything here is FICTIONAL. Seeded, so every run gives identical files.
Run from the project root:  python3 scripts/generate_sample_data.py
"""
import json
import math
import random
from datetime import date, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SEED = 20261119
rng = random.Random(SEED)
REVIEW_DATE = date(2026, 12, 31)          # end of the sample performance year
PERIODS = ["2026-Q1", "2026-Q2", "2026-Q3", "2026-Q4"]

# --------------------------------------------------------------------------------------------
# Sheet layout (v0.4 §10.2). JSON keys = sheet names; row keys = column headers.
# --------------------------------------------------------------------------------------------
SHEETS = [
    ("Org", ["org_name", "industry", "countries", "vision", "mission", "values", "pace", "innovation", "cost_focus",
             "team_orientation", "risk_appetite", "customer_intimacy", "fy_start_month"]),
    ("Departments", ["dept_id", "dept_name", "site", "country", "head_emp_id"]),
    ("Roles", ["role_id", "title", "job_family", "dept_id", "grade_band", "purpose", "responsibilities", "knowledge",
               "skills", "abilities", "other", "job_analysis_method", "measurability", "interdependence",
               "standardisation", "innovation", "talent_supply", "digital_access", "seniority",
               "regulatory_criticality", "leadership_track"]),
    ("KPIs", ["kpi_id", "role_id", "kra", "kpi_name", "type", "unit", "polarity", "weight_pct", "threshold", "target",
              "stretch", "frequency", "data_source"]),
    ("Competencies", ["comp_id", "name", "description", "bars_1", "bars_2", "bars_3", "bars_4", "bars_5", "role_ids"]),
    ("Employees", ["emp_id", "name", "role_id", "dept_id", "site", "country", "manager_id", "grade", "hire_date",
                   "role_start_date", "base_pay", "currency", "pay_range_mid", "potential", "flight_risk"]),
    ("KPI_Actuals", ["emp_id", "kpi_id", "period", "actual"]),
    ("Feedback_360", ["ratee_id", "rater_code", "relationship", "comp_id", "score", "comment"]),
    ("CheckIns", ["emp_id", "date", "type", "note"]),
    ("Dev_Goals", ["emp_id", "goal", "bucket", "due", "progress_pct", "feedback_source_id"]),
    ("Experiences", ["emp_id", "experience_type", "start", "end", "feedback_source_id", "reflection_logged", "status"]),
    ("Leadership_Profile", ["emp_id", "pipeline_passage", "learning_agility", "on_stretch"]),
    ("Training_Catalogue", ["course_id", "capability", "mode", "gap_type", "duration_hrs", "cost", "bucket_70_20_10"]),
    ("Training_Records", ["emp_id", "course_id", "completed_on", "kirkpatrick_l1", "l2_score", "l3_observed",
                          "l4_kpi_link"]),
    ("Reward_Policy", ["country", "grade", "target_bonus_pct", "merit_budget_pct", "rating", "multiplier",
                       "compa_band", "merit_pct", "learning_wallet"]),
    ("Recognition", ["from_emp_id", "to_emp_id", "date", "badge", "points", "message"]),
    ("Country_Config", ["key", "india_value", "china_value", "note"]),
]

# --------------------------------------------------------------------------------------------
# Organisation (v0.4 §6.1)
# --------------------------------------------------------------------------------------------
ORG = {
    "org_name": "VoltBridge Mobility",
    "industry": "ev-auto",
    "countries": "IN;CN",
    "vision": "Make clean mobility the obvious choice for Asia's next billion commuters.",
    "mission": ("Design, build and service affordable, safe EVs and charging. Engineered in Shenzhen and Bengaluru, "
                "built in Pune and Changsha, supported wherever our customers drive."),
    "values": "Speed;Precision;Accountability;Respect across cultures;Kaizen",
    "pace": 9, "innovation": 7, "cost_focus": 8, "team_orientation": 6, "risk_appetite": 6, "customer_intimacy": 7,
    "fy_start_month": 4,
}

DEPARTMENTS = [
    # dept_id, name, site, country
    ("D-PUN-MFG", "Manufacturing Pune", "Pune", "IN"),
    ("D-CSA-MFG", "Manufacturing Changsha", "Changsha", "CN"),
    ("D-SZ-RD", "Battery & Powertrain R&D", "Shenzhen", "CN"),
    ("D-BLR-SW", "Vehicle Software", "Bengaluru", "IN"),
    ("D-IN-SAL", "Sales India", "Multiple", "IN"),
    ("D-CN-SAL", "Sales China", "Multiple", "CN"),
    ("D-IN-SVC", "Service & Charging India", "Pune", "IN"),
    ("D-CN-SVC", "Service & Charging China", "Shenzhen", "CN"),
    ("D-IN-SCM", "Supply Chain India", "Pune", "IN"),
    ("D-CN-SCM", "Supply Chain China", "Shenzhen", "CN"),
    ("D-EXE", "Leadership Team", "Shenzhen / Pune", "IN;CN"),
]

# Role profile scores 1-5: M I S N T D L R  (measurability, interdependence, standardisation, innovation,
# talent supply, digital access, seniority, regulatory criticality)
ROLES = [
    dict(role_id="ASM", title="Assembly Line Technician", job_family="Manufacturing", dept_id="D-PUN-MFG;D-CSA-MFG",
         grade_band="L1-L4",
         purpose="Assemble EV sub-systems to standard work, safely and right first time.",
         responsibilities="Run assigned stations to standard work;Lock-out/tag-out before any high-voltage task;"
                          "Report near misses and defects at once;Join daily huddles and kaizen",
         knowledge="Standard work for assigned stations;High-voltage safety basics;Quality standards",
         skills="Torque and fixture use;Basic diagnostics;Reading work instructions",
         abilities="Manual dexterity;Attention to detail;Stamina for shift work",
         other="ITI or diploma;HV-safety certification (or within 3 months)",
         job_analysis_method="Observation + time study + critical incidents",
         p=(5, 4, 5, 1, 4, 2, 1, 5), leadership_track="N"),
    dict(role_id="QIN", title="Quality Inspector", job_family="Manufacturing", dept_id="D-PUN-MFG;D-CSA-MFG",
         grade_band="L3-P1",
         purpose="Stop defects from leaving the line and find their root cause.",
         responsibilities="Inspect to control plan;Run audits;Write root-cause reports;Release or hold batches",
         knowledge="Control plans;Measurement systems;Automotive quality standards",
         skills="Gauging;8D / root-cause analysis;Statistical process control",
         abilities="Judgement under time pressure;Attention to detail",
         other="Diploma or degree in engineering",
         job_analysis_method="Observation + structured interviews",
         p=(4, 2, 5, 1, 3, 3, 2, 5), leadership_track="N"),
    dict(role_id="BRD", title="Battery Cell R&D Engineer", job_family="R&D", dept_id="D-SZ-RD",
         grade_band="P1-P3",
         purpose="Develop the next-generation cell and get it pilot-ready.",
         responsibilities="Design and run cell experiments;Analyse cycle-life data;Transfer technology to plants;"
                          "Co-author papers and patents with Bengaluru",
         knowledge="Cell chemistry;Electrochemistry;Battery testing standards",
         skills="Experiment design;Data analysis;Technical writing",
         abilities="Creative problem solving;Persistence through failed experiments",
         other="Master's or PhD in chemistry, materials or electrical engineering",
         job_analysis_method="Structured interviews + work diaries",
         p=(2, 4, 1, 5, 2, 5, 3, 2), leadership_track="N"),
    dict(role_id="SWE", title="Vehicle Software Engineer", job_family="R&D", dept_id="D-BLR-SW",
         grade_band="P1-P3",
         purpose="Ship safe, reliable over-the-air software for VoltBridge vehicles.",
         responsibilities="Build and test vehicle software;Ship OTA releases;Fix security vulnerabilities;"
                          "Review peers' code",
         knowledge="Embedded systems;Automotive software safety;Cyber-security basics",
         skills="C/C++ and Python;Testing and CI;Code review",
         abilities="Systems thinking;Collaboration",
         other="Degree in CS/ECE or equivalent",
         job_analysis_method="Structured interviews + task inventory",
         p=(3, 4, 2, 5, 2, 5, 3, 2), leadership_track="N"),
    dict(role_id="SAL", title="EV Sales Consultant", job_family="Sales", dept_id="D-IN-SAL;D-CN-SAL",
         grade_band="A1-A2",
         purpose="Turn test drives into happy owners, fairly.",
         responsibilities="Run test drives;Advise on models, finance and insurance;Close bookings;"
                          "Keep the CRM accurate;Follow fair-selling rules",
         knowledge="VoltBridge models and charging;Finance and insurance products;Fair-selling rules",
         skills="Consultative selling;Negotiation;CRM use",
         abilities="Resilience;Customer empathy",
         other="Graduate; driving licence",
         job_analysis_method="Critical incidents + questionnaire (PAQ-style)",
         p=(5, 2, 3, 2, 4, 4, 2, 3), leadership_track="N"),
    dict(role_id="CSA", title="Customer Support Associate", job_family="Service", dept_id="D-IN-SVC;D-CN-SVC",
         grade_band="A1-A2",
         purpose="Solve owners' problems on the first contact.",
         responsibilities="Answer calls and chats;Resolve or route issues;Log every case;Escalate safety issues",
         knowledge="Vehicle basics;Charging network;Support processes",
         skills="Listening;Troubleshooting scripts;Written English or Mandarin",
         abilities="Patience;Calm under pressure",
         other="Graduate",
         job_analysis_method="Observation + call-quality audits",
         p=(5, 2, 4, 1, 5, 5, 1, 2), leadership_track="N"),
    dict(role_id="CFT", title="Charging Field Technician", job_family="Service", dept_id="D-IN-SVC;D-CN-SVC",
         grade_band="L2-L4",
         purpose="Keep every charger in the territory up and safe.",
         responsibilities="Preventive maintenance;Repair chargers;Follow HV safety;Update tickets",
         knowledge="Charger hardware;High-voltage safety;Network diagnostics",
         skills="Electrical repair;Remote diagnostics",
         abilities="Independent work;Safety discipline",
         other="Electrician licence;HV-safety certification",
         job_analysis_method="Observation + ticket analysis",
         p=(4, 2, 4, 2, 3, 4, 2, 4), leadership_track="N"),
    dict(role_id="SCM", title="Supply Chain Manager", job_family="Operations", dept_id="D-IN-SCM;D-CN-SCM",
         grade_band="P3-M1",
         purpose="Secure parts on time, at cost, from more than one source.",
         responsibilities="Manage suppliers;Plan inventory;Negotiate costs;Build dual sourcing",
         knowledge="Automotive supply chains;Contracts;Trade rules India-China",
         skills="Negotiation;Planning;Supplier audits",
         abilities="Analytical thinking;Influence",
         other="Degree + 5 years in supply chain",
         job_analysis_method="Structured interviews",
         p=(4, 4, 2, 3, 2, 4, 4, 3), leadership_track="N"),
    dict(role_id="PLM", title="People Manager", job_family="Leadership", dept_id="(team's department)",
         grade_band="M1-M2",
         purpose="Hit the team's goals and build the next leaders.",
         responsibilities="Set and review team goals;Coach every report;Run calibration;Keep the team safe;"
                          "Build successors",
         knowledge="The team's domain;PMS process;Labour rules for the country",
         skills="Coaching;Feedback (SBI, GROW);Planning",
         abilities="Judgement;Fairness",
         other="5+ years in the domain; first-time manager programme",
         job_analysis_method="Structured interviews + 360 review of the role",
         p=(3, 5, 2, 3, 2, 4, 4, 3), leadership_track="Y"),
    dict(role_id="EXE", title="Leadership Team", job_family="Leadership", dept_id="D-EXE",
         grade_band="X1",
         purpose="Set strategy and own the company's results.",
         responsibilities="Strategy;Capital allocation;Culture;Succession",
         knowledge="EV industry;Finance;Two-country operations",
         skills="Strategy;Leadership",
         abilities="Vision;Judgement",
         other="—",
         job_analysis_method="Board review",
         p=(3, 5, 1, 4, 1, 5, 5, 3), leadership_track="Y"),
]
PROFILE_KEYS = ["measurability", "interdependence", "standardisation", "innovation", "talent_supply",
                "digital_access", "seniority", "regulatory_criticality"]

# KPIs (v0.4 §6.1). (kpi_id, role, kra, name, type, unit, polarity, weight, threshold, target, stretch, freq, source)
KPIS = [
    ("ASM-01", "ASM", "Output", "Units per labour-hour vs standard", "KPI", "% of standard", "higher", 30, 85, 100, 115, "Monthly", "MES"),
    ("ASM-02", "ASM", "Quality", "First-pass yield", "KPI", "%", "higher", 25, 90, 95, 98, "Monthly", "MES"),
    ("ASM-03", "ASM", "Safety", "Safety index (incidents down, near-miss reports up)", "KPI", "index 0-100", "higher", 20, 60, 80, 95, "Monthly", "EHS log"),
    ("ASM-04", "ASM", "Improvement", "Kaizen ideas implemented", "KPI", "ideas / quarter", "higher", 15, 0, 2, 5, "Quarterly", "Kaizen board"),
    ("ASM-05", "ASM", "Discipline", "Attendance & punctuality", "KPI", "%", "higher", 10, 90, 96, 99, "Monthly", "Time system"),
    ("ASM-G1", "ASM", "Safety", "High-voltage lock-out/tag-out compliance", "Gate", "pass/fail", "higher", 0, 1, 1, 1, "Monthly", "EHS audit"),
    ("QIN-01", "QIN", "Quality", "Defect escape rate", "KPI", "ppm", "lower", 35, 500, 250, 100, "Monthly", "QMS"),
    ("QIN-02", "QIN", "Compliance", "Audit compliance", "KPI", "%", "higher", 25, 85, 95, 100, "Monthly", "QMS"),
    ("QIN-03", "QIN", "Improvement", "Root-cause reports closed on time", "KPI", "%", "higher", 20, 70, 90, 100, "Monthly", "QMS"),
    ("QIN-04", "QIN", "Output", "Inspection throughput vs plan", "KPI", "% of plan", "higher", 20, 85, 100, 110, "Monthly", "QMS"),
    ("BRD-K1", "BRD", "O1 Next-gen cell pilot-ready", "KR: energy-density target reached", "KR", "progress 0-1", "higher", 25, 0.3, 0.7, 1.0, "Quarterly", "Lab records"),
    ("BRD-K2", "BRD", "O1 Next-gen cell pilot-ready", "KR: cycle life at or above target", "KR", "progress 0-1", "higher", 25, 0.3, 0.7, 1.0, "Quarterly", "Lab records"),
    ("BRD-K3", "BRD", "O1 Next-gen cell pilot-ready", "KR: cost per kWh down 12%", "KR", "progress 0-1", "higher", 20, 0.3, 0.7, 1.0, "Quarterly", "Costing"),
    ("BRD-K4", "BRD", "O2 Knowledge flows across borders", "KR: 2 joint papers/patents with Bengaluru", "KR", "progress 0-1", "higher", 15, 0.3, 0.7, 1.0, "Quarterly", "IP register"),
    ("BRD-K5", "BRD", "O2 Knowledge flows across borders", "KR: 4 tech talks", "KR", "progress 0-1", "higher", 15, 0.3, 0.7, 1.0, "Quarterly", "Talk log"),
    ("SWE-K1", "SWE", "O1 Reliable OTA", "KR: OTA crash-free rate at or above 99.5%", "KR", "progress 0-1", "higher", 30, 0.3, 0.7, 1.0, "Quarterly", "Telemetry"),
    ("SWE-K2", "SWE", "O1 Reliable OTA", "KR: sprint predictability", "KR", "progress 0-1", "higher", 25, 0.3, 0.7, 1.0, "Quarterly", "Jira"),
    ("SWE-K3", "SWE", "O2 Secure by default", "KR: critical vulnerabilities closed within SLA", "KR", "progress 0-1", "higher", 25, 0.3, 0.7, 1.0, "Quarterly", "Security tracker"),
    ("SWE-K4", "SWE", "O2 Secure by default", "KR: peer-review quality", "KR", "progress 0-1", "higher", 20, 0.3, 0.7, 1.0, "Quarterly", "Code review tool"),
    ("SAL-01", "SAL", "Sales", "Units vs target", "KPI", "% of target", "higher", 35, 70, 100, 130, "Monthly", "DMS"),
    ("SAL-02", "SAL", "Sales", "Test-drive to booking conversion", "KPI", "%", "higher", 20, 15, 25, 35, "Monthly", "CRM"),
    ("SAL-03", "SAL", "Customer", "Customer NPS", "KPI", "NPS", "higher", 15, 20, 45, 65, "Quarterly", "Survey"),
    ("SAL-04", "SAL", "Sales", "Finance/insurance attach", "KPI", "%", "higher", 10, 30, 50, 70, "Monthly", "DMS"),
    ("SAL-05", "SAL", "Customer", "Cancellations", "KPI", "%", "lower", 10, 15, 8, 3, "Monthly", "DMS"),
    ("SAL-06", "SAL", "Process", "CRM hygiene", "KPI", "%", "higher", 10, 70, 90, 100, "Monthly", "CRM audit"),
    ("SAL-G1", "SAL", "Ethics", "Fair-selling compliance (no fake bookings, no undisclosed discounts)", "Gate", "pass/fail", "higher", 0, 1, 1, 1, "Monthly", "Compliance audit"),
    ("CSA-01", "CSA", "Customer", "CSAT", "KPI", "%", "higher", 30, 75, 85, 93, "Monthly", "Survey"),
    ("CSA-02", "CSA", "Resolution", "First-contact resolution", "KPI", "%", "higher", 25, 60, 72, 85, "Monthly", "Ticketing"),
    ("CSA-03", "CSA", "Quality", "QA audit score", "KPI", "%", "higher", 20, 75, 88, 96, "Monthly", "QA"),
    ("CSA-04", "CSA", "Efficiency", "Average handle time", "KPI", "minutes", "lower", 15, 9, 7, 5.5, "Monthly", "Telephony"),
    ("CSA-05", "CSA", "Resolution", "Escalations", "KPI", "%", "lower", 10, 8, 5, 2, "Monthly", "Ticketing"),
    ("CFT-01", "CFT", "Uptime", "Territory charger uptime", "KPI", "%", "higher", 35, 95, 98, 99.5, "Monthly", "Network monitor"),
    ("CFT-02", "CFT", "Speed", "Mean time to repair", "KPI", "hours", "lower", 25, 12, 6, 3, "Monthly", "Ticketing"),
    ("CFT-03", "CFT", "Quality", "First-time fix", "KPI", "%", "higher", 20, 70, 85, 95, "Monthly", "Ticketing"),
    ("CFT-04", "CFT", "Safety", "HV safety compliance", "KPI", "%", "higher", 10, 90, 98, 100, "Monthly", "EHS audit"),
    ("CFT-05", "CFT", "Customer", "Customer rating", "KPI", "1-5", "higher", 10, 3.8, 4.4, 4.8, "Monthly", "App ratings"),
    ("SCM-01", "SCM", "Delivery", "Supplier OTIF", "KPI", "%", "higher", 25, 85, 93, 98, "Monthly", "ERP"),
    ("SCM-02", "SCM", "Cost", "Savings vs budget", "KPI", "% of budget", "higher", 25, 50, 100, 140, "Quarterly", "Finance"),
    ("SCM-03", "SCM", "Inventory", "Inventory days", "KPI", "days", "lower", 20, 40, 28, 20, "Monthly", "ERP"),
    ("SCM-04", "SCM", "Quality", "Supplier quality", "KPI", "ppm", "lower", 15, 800, 400, 150, "Monthly", "QMS"),
    ("SCM-05", "SCM", "Risk", "Dual-sourcing coverage", "KPI", "% of critical parts", "higher", 15, 40, 60, 80, "Quarterly", "ERP"),
    ("PLM-01", "PLM", "Results", "Team KPI attainment", "KPI", "avg score 1-5", "higher", 40, 2.5, 3.2, 3.9, "Quarterly", "PRISM"),
    ("PLM-02", "PLM", "Safety", "Team safety index", "KPI", "index 0-100", "higher", 15, 60, 80, 95, "Monthly", "EHS log"),
    ("PLM-03", "PLM", "People", "Leaders built (IDPs done, internal promotions, mentoring hours)", "KPI", "index 0-100", "higher", 20, 20, 50, 80, "Quarterly", "PRISM"),
    ("PLM-04", "PLM", "People", "eNPS", "KPI", "eNPS", "higher", 15, -10, 20, 45, "Quarterly", "Pulse survey"),
    ("PLM-05", "PLM", "People", "Regretted attrition", "KPI", "%", "lower", 10, 15, 8, 3, "Quarterly", "HRIS"),
]

COMPETENCIES = [
    ("C1", "Safety mindset", "Puts safety first, every time.",
     "Skips safety steps", "Follows rules when watched", "Follows every safety step", "Spots and reports hazards", "Makes others safer",
     "ASM;QIN;CFT;PLM"),
    ("C2", "Teamwork", "Helps the team win, not just themselves.",
     "Works against the team", "Helps when asked", "Shares work and information", "Steps in without being asked", "Builds team spirit",
     "ASM;QIN;BRD;SWE;CSA;CFT;SCM"),
    ("C3", "Customer focus", "Sees every task through the customer's eyes.",
     "Ignores customers", "Reacts to complaints", "Solves the customer's problem", "Anticipates needs", "Turns customers into fans",
     "SAL;CSA;CFT"),
    ("C4", "Ownership", "Treats results as their own.",
     "Blames others", "Does the minimum", "Delivers what was agreed", "Goes beyond the brief", "Owns outcomes end to end",
     "ASM;QIN;BRD;SWE;SAL;CSA;CFT;SCM;PLM"),
    ("C5", "Learning agility", "Learns fast from new situations.",
     "Avoids new things", "Learns when told", "Applies what they learn", "Seeks stretch and feedback", "Learns faster than the role changes",
     "BRD;SWE;SAL;SCM;PLM"),
    ("C6", "Leading others", "Gets results through people and grows them.",
     "Drives people away", "Directs tasks", "Coaches regularly", "Builds capable teams", "Builds future leaders",
     "PLM"),
    ("C7", "Cross-cultural collaboration", "Works well across India and China.",
     "Avoids the other site", "Works through others", "Collaborates when needed", "Builds cross-border links", "Bridges the two cultures",
     "BRD;SWE;SCM;PLM"),
]
ROLE_COMPS = {}
for c in COMPETENCIES:
    for r in c[8].split(";"):
        ROLE_COMPS.setdefault(r, []).append(c[0])

GRADE_MID = {  # annual base pay mid-points (fictional placeholders)
    "IN": {"L1": 300000, "L2": 360000, "L3": 440000, "L4": 520000, "A1": 450000, "A2": 600000, "P1": 1200000,
           "P2": 1800000, "P3": 2600000, "M1": 3000000, "M2": 4200000, "X1": 12000000},
    "CN": {"L1": 72000, "L2": 84000, "L3": 96000, "L4": 110000, "A1": 90000, "A2": 120000, "P1": 220000,
           "P2": 320000, "P3": 450000, "M1": 500000, "M2": 700000, "X1": 2000000},
}
TARGET_BONUS = {"L1": 5, "L2": 6, "L3": 7, "L4": 8, "A1": 8, "A2": 10, "P1": 10, "P2": 12, "P3": 15, "M1": 18,
                "M2": 22, "X1": 40}
MERIT_BUDGET = {"IN": 9.0, "CN": 4.0}          # placeholders, source before final
LEARNING_WALLET = {"IN": 15000, "CN": 1500}     # per head per year, placeholders
ROLE_GRADES = {"ASM": ["L1", "L2", "L3", "L4"], "QIN": ["L3", "L4", "P1"], "BRD": ["P1", "P2", "P3"],
               "SWE": ["P1", "P2", "P3"], "SAL": ["A1", "A2"], "CSA": ["A1", "A2"], "CFT": ["L2", "L3", "L4"],
               "SCM": ["P3", "M1"], "PLM": ["M1", "M2"], "EXE": ["X1"]}

COUNTRY_CONFIG = [
    # key, india, china, note (status: ✅ checked / ⚠️ verify before it goes on screen)
    ("currency", "INR", "CNY", "—"),
    ("fy_start_month", "4", "1", "⚠️ common practice"),
    ("performance_year", "April to March", "January to December", "⚠️ common practice"),
    ("review_window", "March to May", "December to January, before Spring Festival", "⚠️"),
    ("increment_effective", "1 April (or 1 July)", "After the year-end review", "⚠️"),
    ("year_end_reward", "Variable pay + festive sales contest; statutory bonus (Code on Wages, 8.33%-20% for eligible employees); ESOPs in startups",
     "Year-end bonus / 13th-month pay before Spring Festival; hongbao spot awards; equity for key talent", "⚠️"),
    ("mandatory_pay", "PF, gratuity, ESI (Social Security Code)", "Social insurance + housing provident fund", "⚠️"),
    ("law_in_force", "Labour Codes (in force from 21 Nov 2025)", "Labour Contract Law (2008)", "✅ India date"),
    ("bottom_tier_action", "Documented improvement plan (PIP)", "Training or reassignment first (Guiding Case 18)",
     "✅ China case; ⚠️ fine print"),
    ("bottom_tier_action_code", "pip", "train_reassign", "Used by the engine"),
    ("exit_rule", "Documented process; worker vs managerial staff differ; retrenchment without government approval allowed up to 299 workers",
     "Art. 40(2): train or reassign first; a low ranking alone is not a lawful ground (SPC Guiding Case No. 18, 2013)",
     "✅ / ⚠️ fine print"),
    ("pms_rule_making", "Standing orders above the IR Code threshold",
     "Rules affecting vital interests need democratic consultation and publication (LCL Art. 4)", "⚠️"),
    ("hours_guardrail", "OSH Code weekly cap", "'996' schedules found unlawful in 2021 typical cases", "⚠️"),
    ("data_privacy", "DPDP Act 2023 (rules phasing in)",
     "PIPL; March 2024 rules exempt employee-data transfers needed for cross-border HR management", "✅ China; ⚠️ India"),
    ("feedback_style", "Direct, manager as mentor", "Private, face-saving", "⚠️"),
    ("feedback_culture", "Hierarchy-sensitive; manager-as-mentor; public praise welcome",
     "High power distance; mianzi: critical feedback in private, praise at team level; guanxi", "⚠️"),
    ("r360_design", "Anonymous upward feedback", "Anonymous upward feedback strongly recommended", "—"),
    ("development_tradition", "Manager-as-mentor, structured programmes", "Master-apprentice mentoring", "⚠️"),
    ("recognition_norms", "Town-hall awards, family-inclusive events, festival contests",
     "Honorary titles ('model worker'), team banners, red packets", "⚠️"),
    ("ev_sales_model", "Dealer showrooms plus growing direct sales; finance/insurance attach matters",
     "Direct-to-consumer stores and online orders are common among EV makers", "⚠️"),
    ("ev_market_pressure", "Policy-led push for EV adoption",
     "Price war; Beijing's campaign against 'involution'; fresh price cuts in early 2026", "✅ China"),
]

TRAINING = [
    ("TC-01", "High-voltage safety certification", "classroom", "compliance", 16, 12000, 10),
    ("TC-02", "High-voltage safety refresher", "e-learning", "compliance", 4, 2000, 10),
    ("TC-03", "Lean & kaizen basics", "OJT", "skill", 12, 4000, 70),
    ("TC-04", "Multi-skill L3 certification", "OJT", "skill", 40, 15000, 70),
    ("TC-05", "Cell chemistry fundamentals", "e-learning", "knowledge", 10, 6000, 10),
    ("TC-06", "Power electronics deep-dive", "classroom", "knowledge", 24, 30000, 10),
    ("TC-07", "OTA release practices", "simulation", "skill", 8, 8000, 10),
    ("TC-08", "Consultative EV selling", "simulation", "skill", 12, 9000, 10),
    ("TC-09", "Fair-selling & ethics", "e-learning", "compliance", 3, 1500, 10),
    ("TC-10", "First-time manager programme", "classroom", "behaviour", 24, 40000, 10),
    ("TC-11", "Coaching circle", "mentoring", "behaviour", 12, 5000, 20),
    ("TC-12", "Cross-border rotation Shenzhen ⇄ Pune", "rotation", "behaviour", 320, 250000, 70),
    ("TC-13", "Mandarin / English for cross-border teams", "e-learning", "knowledge", 30, 10000, 10),
    ("TC-14", "Customer de-escalation", "simulation", "skill", 6, 4000, 10),
]

IN_FIRST = ["Aarav", "Aditi", "Akash", "Ananya", "Anil", "Anjali", "Deepak", "Divya", "Gaurav", "Harsh", "Isha",
            "Jaya", "Kavya", "Kiran", "Lakshmi", "Manish", "Meera", "Mohit", "Nandini", "Neha", "Nikhil", "Pooja",
            "Pradeep", "Priya", "Rahul", "Rajesh", "Ramesh", "Rekha", "Rohan", "Sachin", "Sanjana", "Shreya",
            "Simran", "Sneha", "Suresh", "Tanvi", "Tarun", "Uday", "Varun", "Vidya", "Vivek", "Yash", "Zoya",
            "Farhan", "Imran", "Ayesha", "Harpreet", "Joseph", "Maria", "Thomas", "Lalit", "Payal", "Ritesh", "Swati"]
IN_LAST = ["Sharma", "Verma", "Iyer", "Nair", "Reddy", "Patel", "Shah", "Gupta", "Singh", "Kulkarni", "Joshi", "Rao",
           "Das", "Bose", "Menon", "Pillai", "Chauhan", "Yadav", "Khan", "Ansari", "D'Souza", "Fernandes", "Bhat",
           "Hegde", "Kapoor", "Malhotra", "Saxena", "Mishra", "Pandey", "Jain", "Agarwal", "Chopra", "Patil",
           "Gaikwad"]
CN_LAST = ["Wang", "Li", "Zhang", "Liu", "Chen", "Yang", "Huang", "Zhao", "Wu", "Zhou", "Xu", "Sun", "Ma", "Zhu",
           "Hu", "Guo", "He", "Gao", "Lin", "Luo", "Zheng", "Liang", "Xie", "Song", "Tang"]
CN_GIVEN = ["Lei", "Min", "Jun", "Yan", "Hao", "Xin", "Yu", "Ling", "Tao", "Qiang", "Hui", "Bo", "Lan", "Ying",
            "Kai", "Rui", "Na", "Ming", "Jie", "Xiaoyu", "Haoran", "Zihan", "Yichen", "Siyu", "Jiahui", "Mingyu",
            "Shuang"]
PERSONA_NAMES = {"Ritu Deshmukh", "Zhang Wei", "Arjun Mehta", "Karan Sethi", "Chen Jing", "Vikram Rao", "Wang Fang"}
used_names = set(PERSONA_NAMES)


def name_for(country):
    for _ in range(500):
        n = (f"{rng.choice(IN_FIRST)} {rng.choice(IN_LAST)}" if country == "IN"
             else f"{rng.choice(CN_LAST)} {rng.choice(CN_GIVEN)}")
        if n not in used_names:
            used_names.add(n)
            return n
    raise RuntimeError("ran out of names")


def rand_date(a, b):
    return a + timedelta(days=rng.randint(0, (b - a).days))


def iso(d):
    return d.isoformat()


# --------------------------------------------------------------------------------------------
# Scoring inverse: turn a target score (1-5) into a KPI value (mirrors js/engine/scoring.js)
# --------------------------------------------------------------------------------------------
def value_for_score(k, s):
    _, _, _, _, typ, unit, pol, _, thr, tgt, st, _, _ = k
    if typ == "Gate":
        return 1
    if typ == "KR":
        v = (s - 1) / 2.5 * 0.7 if s <= 3.5 else 0.7 + (s - 3.5) / 1.5 * 0.3
        return round(max(0.0, min(1.0, v)), 2)
    if s <= 3:
        v = thr + (tgt - thr) * (s - 1) / 2
    else:
        v = tgt + (st - tgt) * (s - 3) / 2
    # rounding by unit size
    span = abs(st - thr)
    nd = 0 if span >= 50 else (1 if span >= 2 else 2)
    v = round(v, nd)
    if unit.startswith("%") or unit == "%":
        v = max(0, min(100, v)) if pol == "higher" or v >= 0 else v
    if unit in ("ppm", "minutes", "hours", "days", "ideas / quarter"):
        v = max(0, v)
    return v


def skewed_latent():
    """'Best and the rest' (O'Boyle & Aguinis 2012): most people near the middle, a long right tail."""
    x = rng.lognormvariate(0, 0.5)
    z = (x - 1.13) / 0.62
    return max(1.4, min(4.9, 3.05 + 0.85 * z))


# --------------------------------------------------------------------------------------------
# Build employees
# --------------------------------------------------------------------------------------------
employees, latent, notes = [], {}, {}
recent_movers = {}
counter = {"IN": 0, "CN": 0}


def new_id(country):
    counter[country] += 1
    return f"VB-{country}-{counter[country]:04d}"


def add_emp(role, country, site, dept, manager, name=None, grade=None, r=None, potential=None,
            hire=None, role_start=None, flight=None):
    eid = new_id(country)
    grade = grade or rng.choice(ROLE_GRADES[role])
    mid = GRADE_MID[country][grade]
    base = int(round(mid * rng.uniform(0.82, 1.18), -3 if country == "IN" else -2))
    hire = hire or rand_date(date(2018, 1, 1), date(2026, 3, 1))
    if role_start is None:
        role_start = hire if rng.random() < 0.6 else rand_date(hire, date(2026, 5, 31))
        cap = {("SAL", "IN"): 1, ("SAL", "CN"): 2}.get((role, country), 99)   # keep sales pools >= 30 after the shield
        if rng.random() < 0.07 and recent_movers.get((role, country), 0) < cap:   # a few recent movers (ramp-up shield)
            role_start = rand_date(date(2026, 7, 15), date(2026, 11, 1))
            role_start = max(role_start, hire)
            recent_movers[(role, country)] = recent_movers.get((role, country), 0) + 1
    e = dict(emp_id=eid, name=name or name_for(country), role_id=role, dept_id=dept, site=site, country=country,
             manager_id=manager or "", grade=grade, hire_date=iso(hire), role_start_date=iso(role_start),
             base_pay=base, currency="INR" if country == "IN" else "CNY", pay_range_mid=mid,
             potential=potential or rng.choices([1, 2, 3], [0.3, 0.55, 0.15])[0],
             flight_risk=flight or rng.choices(["L", "M", "H"], [0.55, 0.32, 0.13])[0])
    employees.append(e)
    latent[eid] = r if r is not None else skewed_latent()
    return eid


# Leadership team
ceo = add_emp("EXE", "CN", "Shenzhen", "D-EXE", None, grade="X1", r=3.8, potential=2,
              hire=date(2018, 3, 1), role_start=date(2018, 3, 1))
coo = add_emp("EXE", "IN", "Pune", "D-EXE", ceo, grade="X1", r=3.6, potential=2,
              hire=date(2019, 6, 1), role_start=date(2019, 6, 1))
chro = add_emp("EXE", "IN", "Pune", "D-EXE", ceo, grade="X1", r=3.7, potential=2,
               hire=date(2020, 1, 15), role_start=date(2020, 1, 15))
cto = add_emp("EXE", "CN", "Shenzhen", "D-EXE", ceo, grade="X1", r=3.9, potential=2,
              hire=date(2018, 9, 1), role_start=date(2018, 9, 1))

PERSONAS = []


def persona(key, eid, story):
    PERSONAS.append({"key": key, "emp_id": eid, "story": story})


# People managers (8 IN + 6 CN)
vikram = add_emp("PLM", "IN", "Pune", "D-IN-SVC", coo, name="Vikram Rao", grade="M1", r=3.0, potential=2,
                 hire=date(2020, 7, 1), role_start=date(2022, 4, 1), flight="L")
persona("vikram", vikram, "Service Manager, Pune. Rates his whole team ~4.6/5 → leniency flag → calibration; "
                          "his 'leaders built' score is low too.")
pm_pune_a = add_emp("PLM", "IN", "Pune", "D-PUN-MFG", coo)
pm_pune_b = add_emp("PLM", "IN", "Pune", "D-PUN-MFG", coo)
sm_north = add_emp("PLM", "IN", "Delhi", "D-IN-SAL", coo)
sm_south = add_emp("PLM", "IN", "Bengaluru", "D-IN-SAL", coo)
sm_west = add_emp("PLM", "IN", "Mumbai", "D-IN-SAL", coo)
em_blr = add_emp("PLM", "IN", "Bengaluru", "D-BLR-SW", cto)
cm_in = add_emp("PLM", "IN", "Pune", "D-IN-SVC", coo)
pm_cs = add_emp("PLM", "CN", "Changsha", "D-CSA-MFG", ceo)
qm_cs = add_emp("PLM", "CN", "Changsha", "D-CSA-MFG", ceo)
rd_sz = add_emp("PLM", "CN", "Shenzhen", "D-SZ-RD", cto)
sm_east = add_emp("PLM", "CN", "Shanghai", "D-CN-SAL", ceo)
sm_cdu = add_emp("PLM", "CN", "Chengdu", "D-CN-SAL", ceo)
svc_cn = add_emp("PLM", "CN", "Shenzhen", "D-CN-SVC", ceo)

# Assembly (40 IN split across two Pune lines, 30 CN)
ritu = add_emp("ASM", "IN", "Pune", "D-PUN-MFG", pm_pune_b, name="Ritu Deshmukh", grade="L2", r=3.35, potential=2,
               hire=date(2021, 2, 1), role_start=date(2023, 4, 1), flight="L")
persona("ritu", ritu, "Line Lead, Pune. Output on target but a safety near-miss → absolute standards + team "
                      "gainsharing, never ranking. Person-level TNA → HV-safety refresher; skill-based pay L2 → L3.")
for i in range(39):
    add_emp("ASM", "IN", "Pune", "D-PUN-MFG", pm_pune_a if i < 20 else pm_pune_b)
for i in range(30):
    add_emp("ASM", "CN", "Changsha", "D-CSA-MFG", pm_cs)
for i in range(6):
    add_emp("QIN", "IN", "Pune", "D-PUN-MFG", pm_pune_b)
for i in range(6):
    add_emp("QIN", "CN", "Changsha", "D-CSA-MFG", qm_cs)

# R&D
zhang = add_emp("BRD", "CN", "Shenzhen", "D-SZ-RD", rd_sz, name="Zhang Wei", grade="P2", r=3.5, potential=3,
                hire=date(2021, 9, 1), role_start=date(2026, 8, 1), flight="M")
persona("zhang", zhang, "Battery R&D, Shenzhen. Hit 0.7 on stretch OKRs (good in OKR terms); forced ranking would "
                        "have punished the ambition; patent bonus. Built-70 persona: first-time team lead with a "
                        "tech-transfer rotation to Pune; helix and passport fill over the year.")
for i in range(17):
    add_emp("BRD", "CN", "Shenzhen", "D-SZ-RD", rd_sz)
for i in range(16):
    add_emp("SWE", "IN", "Bengaluru", "D-BLR-SW", em_blr)

# Sales India 32: Delhi 11 (Karan), Bengaluru 11 (Arjun), Mumbai 10
arjun = add_emp("SAL", "IN", "Bengaluru", "D-IN-SAL", sm_south, name="Arjun Mehta", grade="A2", r=4.7, potential=3,
                hire=date(2022, 1, 10), role_start=date(2022, 1, 10), flight="M")
persona("arjun", arjun, "Sales Consultant, Bengaluru. Top 5% on the leaderboard → bonus tier 1, Club trip, "
                        "9-box Star → development toward sales manager.")
karan = add_emp("SAL", "IN", "Delhi", "D-IN-SAL", sm_north, name="Karan Sethi", grade="A2", r=4.4, potential=2,
                hire=date(2022, 6, 1), role_start=date(2022, 6, 1), flight="M")
persona("karan", karan, "Sales Consultant, Delhi. #2 on units but fails the fair-selling gate (fake test-drive "
                        "bookings) → rating capped, no top-tier bonus. How matters as much as what.")
for i in range(10):
    add_emp("SAL", "IN", "Delhi", "D-IN-SAL", sm_north)
for i in range(10):
    add_emp("SAL", "IN", "Bengaluru", "D-IN-SAL", sm_south)
for i in range(10):
    add_emp("SAL", "IN", "Mumbai", "D-IN-SAL", sm_west)

# Sales China 34: Shanghai 17, Chengdu 17 (Chen Jing)
chen = add_emp("SAL", "CN", "Chengdu", "D-CN-SAL", sm_cdu, name="Chen Jing", grade="A1", r=1.7, potential=1,
               hire=date(2024, 3, 1), role_start=date(2024, 3, 1), flight="H")
persona("chen", chen, "Sales Consultant, Chengdu. Bottom 10% of the China pool. Country lens: in China a low rank "
                      "alone is not a lawful dismissal ground → training/reassignment. In India the same data → "
                      "documented PIP.")
for i in range(17):
    add_emp("SAL", "CN", "Shanghai", "D-CN-SAL", sm_east)
for i in range(16):
    add_emp("SAL", "CN", "Chengdu", "D-CN-SAL", sm_cdu)

# Support & charging
for i in range(24):
    add_emp("CSA", "IN", "Pune", "D-IN-SVC", vikram)
wang = add_emp("CSA", "CN", "Shenzhen", "D-CN-SVC", svc_cn, name="Wang Fang", grade="A1", r=3.4, potential=2,
               hire=date(2023, 5, 1), role_start=date(2023, 5, 1), flight="L")
persona("wang", wang, "Customer Support, Shenzhen. Her pool has 8 people → the ranking engine refuses forced "
                      "distribution ('pool too small to rank fairly').")
for i in range(7):
    add_emp("CSA", "CN", "Shenzhen", "D-CN-SVC", svc_cn)
for site in ["Pune"] * 4 + ["Mumbai"] * 3 + ["Delhi"] * 3:
    add_emp("CFT", "IN", site, "D-IN-SVC", cm_in)
for site in ["Shenzhen"] * 4 + ["Shanghai"] * 4:
    add_emp("CFT", "CN", site, "D-CN-SVC", svc_cn)

# Supply chain (report to COO / CEO)
for i in range(3):
    add_emp("SCM", "IN", "Pune", "D-IN-SCM", coo)
for i in range(3):
    add_emp("SCM", "CN", "Shenzhen", "D-CN-SCM", ceo)

by_id = {e["emp_id"]: e for e in employees}
KPI_BY_ROLE = {}
for k in KPIS:
    KPI_BY_ROLE.setdefault(k[1], []).append(k)

# Clamp randoms so persona storylines always hold
for e in employees:
    eid, role, c = e["emp_id"], e["role_id"], e["country"]
    if eid in (arjun, karan, chen):
        continue
    if role == "SAL" and c == "IN":
        latent[eid] = min(latent[eid], 4.15)
    if role == "SAL" and c == "CN":
        latent[eid] = max(latent[eid], 2.05)

# --------------------------------------------------------------------------------------------
# KPI actuals
# --------------------------------------------------------------------------------------------
kpi_actuals = []
PERSONA_KPI = {                          # fixed per-KPI scores (1-5 scale) for storyline control
    ritu: {"ASM-01": 3.4, "ASM-02": 3.3, "ASM-03": 1.6, "ASM-04": 3.2, "ASM-05": 3.5},   # output on target, safety near-miss
    zhang: {"BRD-K1": 3.5, "BRD-K2": 3.75, "BRD-K3": 3.3, "BRD-K4": 3.5, "BRD-K5": 3.5},
    arjun: {"SAL-01": 5.3},
    karan: {"SAL-01": 5.05},
    vikram: {"PLM-03": 1.4},
}
GATE_FAIL = {karan: {"SAL-G1": ["2026-Q3"]}}
for e in employees:
    eid, role = e["emp_id"], e["role_id"]
    for k in KPI_BY_ROLE.get(role, []):
        kid, typ = k[0], k[4]
        base = PERSONA_KPI.get(eid, {}).get(kid, latent[eid] + rng.gauss(0, 0.45))
        if role == "SAL" and kid == "SAL-01" and eid not in (arjun, karan):
            base = min(base, 4.8)
        for qi, per in enumerate(PERIODS):
            if typ == "Gate":
                fail = per in GATE_FAIL.get(eid, {}).get(kid, [])
                if not fail and eid not in GATE_FAIL and rng.random() < 0.004:
                    fail = True
                kpi_actuals.append(dict(emp_id=eid, kpi_id=kid, period=per, actual=0 if fail else 1))
                continue
            if typ == "KR":   # cumulative progress; Q4 = final score
                final = value_for_score(k, max(0.6, min(5.2, base)))
                frac = [0.25, 0.5, 0.75, 1.0][qi]
                val = round(final * frac + (rng.uniform(-0.03, 0.03) if qi < 3 else 0), 2)
                kpi_actuals.append(dict(emp_id=eid, kpi_id=kid, period=per, actual=max(0, val)))
                continue
            noise = 0 if eid in PERSONA_KPI and kid in PERSONA_KPI[eid] else rng.gauss(0, 0.25)
            s = max(0.6, min(5.4, base + noise))
            kpi_actuals.append(dict(emp_id=eid, kpi_id=kid, period=per, actual=value_for_score(k, s)))

# One Assembly line beats standard output, so plant gainsharing pays out on the sample (QA report L25).
# A post-step, so it uses no random numbers and every other value stays as it was.
GAIN_LINE_UPLIFT = 6.5      # percentage points of standard output, added for Ritu's teammates
ritu_mgr = next(e["manager_id"] for e in employees if e["emp_id"] == ritu)
gain_line = {e["emp_id"] for e in employees if e["role_id"] == "ASM" and e["manager_id"] == ritu_mgr and e["emp_id"] != ritu}
for a in kpi_actuals:
    if a["kpi_id"] == "ASM-01" and a["emp_id"] in gain_line:
        a["actual"] = round(min(125.0, a["actual"] + GAIN_LINE_UPLIFT), 1)

# --------------------------------------------------------------------------------------------
# 360 / manager behaviour ratings (BARS 1-5)
# --------------------------------------------------------------------------------------------
fb = []
rater_seq = [0]


def rater():
    rater_seq[0] += 1
    return f"R{rater_seq[0]:05d}"


COMMENTS_HI = ["Consistently goes beyond the brief.", "A role model on the floor.", "Customers ask for them by name.",
               "Shares knowledge generously."]
COMMENTS_MID = ["Solid and dependable.", "Delivers what was agreed.", "Good progress this year."]
COMMENTS_LO = ["Needs closer support on basics.", "Missed several commitments.", "Agreed a clear plan to improve."]
for e in employees:
    eid, role = e["emp_id"], e["role_id"]
    comps = ROLE_COMPS.get(role, ["C4"])[:4]
    lenient = e["manager_id"] == vikram
    for cid in comps:
        if lenient:
            s = max(4, min(5, round(4.6 + rng.gauss(0, 0.3))))
        else:
            s = max(1, min(5, round(latent[eid] + rng.gauss(0, 0.55))))
        com = rng.choice(COMMENTS_HI if s >= 4 else COMMENTS_MID if s == 3 else COMMENTS_LO)
        fb.append(dict(ratee_id=eid, rater_code=rater(), relationship="manager", comp_id=cid, score=s, comment=com))
    if role in ("BRD", "SWE", "PLM", "SCM", "EXE"):
        rels = ["peer", "peer", "peer", "self"] + (["report", "report", "report"] if role in ("PLM", "EXE") else [])
        for rel in rels:
            rc = rater()
            for cid in comps:
                bump = 0.3 if rel == "self" else 0
                s = max(1, min(5, round(latent[eid] + bump + rng.gauss(0, 0.6))))
                fb.append(dict(ratee_id=eid, rater_code=rc, relationship=rel, comp_id=cid, score=s, comment=""))

# --------------------------------------------------------------------------------------------
# Leadership track, check-ins, development goals, experiences, training
# --------------------------------------------------------------------------------------------
leadership = set(e["emp_id"] for e in employees if e["role_id"] in ("PLM", "EXE"))
for e in employees:
    if e["potential"] == 3 and latent[e["emp_id"]] >= 3.4:
        leadership.add(e["emp_id"])
leadership.add(zhang)
leadership.add(arjun)

checkins = []
for e in employees:
    eid = e["emp_id"]
    if e["role_id"] == "EXE":
        continue
    for d in ["2026-07-15", "2026-09-15", "2026-11-14"]:
        checkins.append(dict(emp_id=eid, date=d, type="1:1", note="Regular check-in on goals and blockers"))
    # split conversations: development check-in at least 4 weeks before the 15 Dec rating review
    checkins.append(dict(emp_id=eid, date="2026-11-10", type="development",
                         note="Development conversation, held apart from the rating review"))
    if eid in leadership:
        n = 6 if eid == zhang else rng.randint(1, 5)
        for i in range(n):
            checkins.append(dict(emp_id=eid, date=iso(date(2026, 6 + i, 20)), type="coaching",
                                 note="Coaching session (GROW)"))
    if rng.random() < 0.12:
        checkins.append(dict(emp_id=eid, date=iso(rand_date(date(2026, 3, 1), date(2026, 10, 31))),
                             type="goal change", note="Goal re-contracted mid-cycle"))

DEV_GOALS = {
    "ASM": ["Earn the next skill level (multi-skill certification)", "Lead one kaizen idea end to end"],
    "QIN": ["Get certified in 8D root-cause analysis", "Coach a new inspector"],
    "BRD": ["Present at an external conference", "Co-author a patent with Bengaluru"],
    "SWE": ["Own one OTA release end to end", "Mentor a junior engineer"],
    "SAL": ["Complete consultative EV selling", "Lift finance attach by mentoring with a top performer"],
    "CSA": ["Complete customer de-escalation training", "Shadow the charging team for a week"],
    "CFT": ["Earn power-electronics certification", "Train two new technicians"],
    "SCM": ["Qualify a second source for a critical part", "Learn Mandarin/English basics"],
    "PLM": ["Complete the first-time manager programme", "Build a ready-now successor"],
    "EXE": ["Sponsor two cross-border rotations"],
}
dev_goals = []
for e in employees:
    eid, role = e["emp_id"], e["role_id"]
    goals = DEV_GOALS[role][: (2 if eid in leadership else rng.choice([1, 2]))]
    for g in goals:
        prog = max(0, min(100, int(rng.gauss(45 + (latent[eid] - 3) * 18, 18))))
        fbsrc = e["manager_id"] if rng.random() < 0.8 else ""
        dev_goals.append(dict(emp_id=eid, goal=g, bucket=70 if "Lead" in g or "Own" in g or "Build" in g else
                              (20 if "mentor" in g.lower() or "coach" in g.lower() or "Shadow" in g else 10),
                              due="2027-03-31", progress_pct=prog, feedback_source_id=fbsrc))
dev_goals = [d for d in dev_goals if d["emp_id"] != ritu]
dev_goals.append(dict(emp_id=ritu, goal="Complete HV-safety refresher and reach skill level L3", bucket=10,
                      due="2027-01-31", progress_pct=40, feedback_source_id=pm_pune_b))
dev_goals = [d for d in dev_goals if d["emp_id"] != zhang]
for g, b, p in [("Lead the Pune tech-transfer team", 70, 85), ("Complete the first-time manager programme", 10, 100)]:
    dev_goals.append(dict(emp_id=zhang, goal=g, bucket=b, due="2027-03-31", progress_pct=p,
                          feedback_source_id=rd_sz))

EXP_TYPES = ["first_team", "fix_it", "new_line", "cross_border", "scope_jump", "influence", "crisis",
             "failure_recovery"]
experiences = []
for eid in sorted(leadership):
    if eid == zhang:
        continue
    for t in rng.sample(EXP_TYPES, rng.randint(0, 4)):
        st = rand_date(date(2026, 1, 1), date(2026, 10, 1))
        done = rng.random() < 0.7
        experiences.append(dict(emp_id=eid, experience_type=t, start=iso(st),
                                end=iso(st + timedelta(days=rng.randint(30, 90))) if done else "",
                                feedback_source_id=by_id[eid]["manager_id"] if rng.random() < 0.85 else "",
                                reflection_logged="Y" if done and rng.random() < 0.8 else "N",
                                status="done" if done else "in progress"))
for t, s, e_ in [("first_team", "2026-02-01", "2026-03-31"), ("fix_it", "2026-04-01", "2026-05-15"),
                 ("cross_border", "2026-06-01", "2026-07-31"), ("scope_jump", "2026-08-01", "2026-09-15"),
                 ("failure_recovery", "2026-09-16", "2026-10-31")]:
    experiences.append(dict(emp_id=zhang, experience_type=t, start=s, end=e_, feedback_source_id=rd_sz,
                            reflection_logged="Y", status="done"))

leadership_profile = []
persona_ids = {p["emp_id"] for p in PERSONAS}
for eid in sorted(leadership):
    e = by_id[eid]
    passage = {"EXE": "business", "PLM": rng.choice(["others", "managers"])}.get(e["role_id"], "self")
    if eid == zhang:
        passage = "others"
    leadership_profile.append(dict(emp_id=eid, pipeline_passage=passage,
                                   learning_agility=max(1, min(5, round(latent[eid] + rng.gauss(0.3, 0.6)))),
                                   on_stretch="Y" if eid == zhang or (eid not in persona_ids and rng.random() < 0.12) else "N"))

training_records = []
ROLE_COURSES = {"ASM": ["TC-01", "TC-03", "TC-04"], "QIN": ["TC-01", "TC-03"], "BRD": ["TC-05", "TC-13"],
                "SWE": ["TC-07", "TC-13"], "SAL": ["TC-08", "TC-09"], "CSA": ["TC-14"],
                "CFT": ["TC-01", "TC-06"], "SCM": ["TC-13"], "PLM": ["TC-10", "TC-11"], "EXE": []}
L4 = {"TC-01": "ASM-03", "TC-03": "ASM-04", "TC-04": "ASM-01", "TC-07": "SWE-K1", "TC-08": "SAL-02",
      "TC-09": "SAL-G1", "TC-14": "CSA-02", "TC-06": "CFT-02", "TC-10": "PLM-03", "TC-11": "PLM-03"}
for e in employees:
    eid = e["emp_id"]
    for cid in ROLE_COURSES[e["role_id"]]:
        if rng.random() < 0.55:
            training_records.append(dict(emp_id=eid, course_id=cid,
                                         completed_on=iso(rand_date(date(2026, 1, 15), date(2026, 11, 15))),
                                         kirkpatrick_l1=rng.choice([3, 4, 4, 5]),
                                         l2_score=max(40, min(100, int(rng.gauss(78, 10)))),
                                         l3_observed=rng.choice(["Y", "Y", "N"]),
                                         l4_kpi_link=L4.get(cid, "")))
training_records = [t for t in training_records if not (t["emp_id"] == ritu and t["course_id"] == "TC-02")]
training_records.append(dict(emp_id=ritu, course_id="TC-02", completed_on="", kirkpatrick_l1="", l2_score="",
                             l3_observed="", l4_kpi_link="ASM-03"))
training_records = [t for t in training_records if t["emp_id"] != zhang]
training_records.append(dict(emp_id=zhang, course_id="TC-10", completed_on="2026-11-05", kirkpatrick_l1=5,
                             l2_score=88, l3_observed="Y", l4_kpi_link=""))
training_records.append(dict(emp_id=zhang, course_id="TC-12", completed_on="2026-07-31", kirkpatrick_l1=5,
                             l2_score=90, l3_observed="Y", l4_kpi_link="BRD-K4"))

# --------------------------------------------------------------------------------------------
# Recognition, reward policy
# --------------------------------------------------------------------------------------------
BADGES = [("Safety Streak 100 days", "ASM;CFT;QIN"), ("Customer Hero", "SAL;CSA;CFT"), ("Kaizen Champion", "ASM;QIN"),
          ("Fast Fix", "CFT;CSA"), ("Team Player", "ALL"), ("Bridge Builder", "BRD;SWE;SCM;PLM")]
recognition = []
ids = [e["emp_id"] for e in employees if e["role_id"] != "EXE"]
for _ in range(140):
    to = rng.choice(ids)
    role = by_id[to]["role_id"]
    fit = [b for b in BADGES if b[1] == "ALL" or role in b[1].split(";")]
    b = rng.choice(fit)[0]
    frm = rng.choice(ids)
    while frm == to:
        frm = rng.choice(ids)
    recognition.append(dict(from_emp_id=frm, to_emp_id=to, date=iso(rand_date(date(2026, 1, 5), date(2026, 11, 15))),
                            badge=b, points=rng.choice([10, 20, 25, 50]), message=f"{b}: thank you!"))
recognition.append(dict(from_emp_id=rd_sz, to_emp_id=zhang, date="2026-11-01", badge="Passport stamp",
                        points=50, message="Five stamps this year, well earned."))

RATING_MULT = {1: 0, 2: 0.5, 3: 1.0, 4: 1.25, 5: 1.5}
MERIT_MULT = {5: {"low": 1.8, "mid": 1.5, "high": 1.2}, 4: {"low": 1.4, "mid": 1.2, "high": 1.0},
              3: {"low": 1.1, "mid": 1.0, "high": 0.7}, 2: {"low": 0.5, "mid": 0.3, "high": 0.0},
              1: {"low": 0.0, "mid": 0.0, "high": 0.0}}
reward_policy = []
for c in ["IN", "CN"]:
    for g in GRADE_MID[c]:
        reward_policy.append(dict(country=c, grade=g, target_bonus_pct=TARGET_BONUS[g], merit_budget_pct=MERIT_BUDGET[c],
                                  rating="", multiplier="", compa_band="", merit_pct="", learning_wallet=LEARNING_WALLET[c]))
for c in ["IN", "CN"]:
    for r in range(5, 0, -1):
        for band in ["low", "mid", "high"]:
            reward_policy.append(dict(country=c, grade="", target_bonus_pct="", merit_budget_pct="", rating=r,
                                      multiplier=RATING_MULT[r], compa_band=band,
                                      merit_pct=round(MERIT_BUDGET[c] * MERIT_MULT[r][band], 2), learning_wallet=""))

# --------------------------------------------------------------------------------------------
# Assemble
# --------------------------------------------------------------------------------------------
heads = {"D-PUN-MFG": pm_pune_a, "D-CSA-MFG": pm_cs, "D-SZ-RD": rd_sz, "D-BLR-SW": em_blr, "D-IN-SAL": sm_south,
         "D-CN-SAL": sm_east, "D-IN-SVC": vikram, "D-CN-SVC": svc_cn, "D-IN-SCM": coo, "D-CN-SCM": ceo, "D-EXE": ceo}
roles_rows = []
for r in ROLES:
    row = {k: r[k] for k in ["role_id", "title", "job_family", "dept_id", "grade_band", "purpose", "responsibilities",
                              "knowledge", "skills", "abilities", "other", "job_analysis_method"]}
    row.update(dict(zip(PROFILE_KEYS, r["p"])))
    row["leadership_track"] = r["leadership_track"]
    roles_rows.append(row)

data = {
    "meta": {
        "name": "VoltBridge Mobility sample data", "fictional": True, "seed": SEED,
        "spec": "docs/versions/v0.4_2026-11-19_ev-first.md", "review_date": iso(REVIEW_DATE), "periods": PERIODS,
        "rating_review_date": "2026-12-15", "personas": PERSONAS, "leadership_track_ids": sorted(leadership),
        "titles": {ritu: "Line Lead", vikram: "Service Manager", zhang: "Battery R&D Engineer (acting team lead)"},
        "note": "All names, numbers and people are fictional. Pay and budget figures are placeholders.",
    },
    "Org": [ORG],
    "Departments": [dict(dept_id=d[0], dept_name=d[1], site=d[2], country=d[3], head_emp_id=heads[d[0]])
                    for d in DEPARTMENTS],
    "Roles": roles_rows,
    "KPIs": [dict(zip(SHEETS[3][1], k)) for k in KPIS],
    "Competencies": [dict(zip(SHEETS[4][1], c)) for c in COMPETENCIES],
    "Employees": employees,
    "KPI_Actuals": kpi_actuals,
    "Feedback_360": fb,
    "CheckIns": checkins,
    "Dev_Goals": dev_goals,
    "Experiences": experiences,
    "Leadership_Profile": leadership_profile,
    "Training_Catalogue": [dict(zip(SHEETS[12][1], t)) for t in TRAINING],
    "Training_Records": training_records,
    "Reward_Policy": reward_policy,
    "Recognition": recognition,
    "Country_Config": [dict(key=c[0], india_value=c[1], china_value=c[2], note=c[3]) for c in COUNTRY_CONFIG],
}
for sheet, cols in SHEETS:            # guarantee column order and presence
    data[sheet] = [{c: row.get(c, "") for c in cols} for row in data[sheet]]


def write_json(path, obj):
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(obj, ensure_ascii=False, separators=(",", ":")), encoding="utf-8")


write_json(ROOT / "data/sample-org/voltbridge.json", data)

# Industry preset (defaults a visitor gets when they pick "EV / automotive" in the wizard)
preset = {
    "id": "ev-auto", "name": "EV / automotive", "depth": "full",
    "strategy_dna_defaults": {k: ORG[k] for k in ["pace", "innovation", "cost_focus", "team_orientation",
                                                 "risk_appetite", "customer_intimacy"]},
    "why_cutthroat": "China's EV price war and Beijing's campaign against 'involution' (v0.4 §5.2, §9).",
    "Roles": data["Roles"], "KPIs": data["KPIs"], "Competencies": data["Competencies"],
    "Training_Catalogue": data["Training_Catalogue"],
}
write_json(ROOT / "data/presets/industries/ev-auto.json", preset)
for code, col, label in [("IN", "india_value", "india"), ("CN", "china_value", "china")]:
    cfg = {"country": code, "name": "India" if code == "IN" else "China",
           "values": {c[0]: c[1 if code == "IN" else 2] for c in COUNTRY_CONFIG},
           "status": {c[0]: c[3] for c in COUNTRY_CONFIG}}
    write_json(ROOT / f"data/presets/countries/{label}.json", cfg)

# --------------------------------------------------------------------------------------------
# Excel: template (README + headers + one example row) and filled workbook
# --------------------------------------------------------------------------------------------
from openpyxl import Workbook
from openpyxl.styles import Alignment, Font, PatternFill
from openpyxl.utils import get_column_letter
from openpyxl.worksheet.datavalidation import DataValidation

FONT = Font(name="Arial", size=10)
HEAD = Font(name="Arial", size=10, bold=True, color="FFFFFF")
HEAD_FILL = PatternFill("solid", fgColor="14151C")
EX_FONT = Font(name="Arial", size=10, italic=True, color="6B6F80")
INPUT_FILL = PatternFill("solid", fgColor="FFF7D6")

ALLOWED = {
    ("KPIs", "type"): "KPI,KR,Behaviour,Gate", ("KPIs", "polarity"): "higher,lower",
    ("Roles", "leadership_track"): "Y,N", ("Employees", "country"): "IN,CN", ("Employees", "currency"): "INR,CNY",
    ("Employees", "flight_risk"): "L,M,H", ("Employees", "potential"): "1,2,3",
    ("Feedback_360", "relationship"): "self,manager,peer,report,customer",
    ("CheckIns", "type"): "1:1,coaching,recognition,goal change,development",
    ("Dev_Goals", "bucket"): "70,20,10", ("Experiences", "reflection_logged"): "Y,N",
    ("Experiences", "status"): "done,in progress", ("Experiences", "experience_type"): ",".join(EXP_TYPES),
    ("Leadership_Profile", "on_stretch"): "Y,N",
    ("Leadership_Profile", "pipeline_passage"): "self,others,managers,function,business",
    ("Training_Catalogue", "gap_type"): "knowledge,skill,behaviour,compliance",
    ("Training_Catalogue", "bucket_70_20_10"): "70,20,10", ("Training_Records", "l3_observed"): "Y,N",
    ("Reward_Policy", "compa_band"): "low,mid,high", ("Reward_Policy", "country"): "IN,CN",
    ("Departments", "country"): "IN,CN,IN;CN",
}

README_ROWS = [
    ("PRISM input workbook", ""),
    ("What this is", "One sheet per part of a PMS. Upload it in PRISM's Data Hub; it is read in your browser and never sent anywhere."),
    ("Which cells to edit", "Every row under the dark header row on each sheet. The tinted row in the blank template is an example: overwrite or delete it. If it is left unchanged, the Data Hub skips it."),
    ("Do not rename", "Sheet names and header cells. PRISM matches them (letter case is ignored)."),
    ("Upload", "The whole workbook (.xlsx); one sheet saved as CSV and named after it (Employees.csv replaces the Employees sheet); or the file from the Data Hub's \"Data as JSON\" button."),
    ("IDs", "emp_id, role_id, kpi_id, comp_id, course_id and dept_id must be unique. Every manager_id, role_id, kpi_id etc. must exist on its own sheet."),
    ("Weights", "KPI weight_pct must add up to 100 for each role (Gate rows have weight 0)."),
    ("Targets", "threshold < target < stretch when polarity = higher; threshold > target > stretch when polarity = lower. Gate rows: actual 1 = pass, 0 = fail."),
    ("OKR key results", "type = KR, actual is progress 0 to 1 (0.7 counts as met)."),
    ("Lists", "Columns with fixed values offer a drop-down (e.g. polarity: higher/lower; country: IN/CN; Y/N fields)."),
    ("Lists in a cell", "Separate several values with a semicolon, e.g. responsibilities, role_ids, countries."),
    ("Dates", "YYYY-MM-DD. hire_date and role_start_date can't be after the review date."),
    ("Review date", "Months in role are counted to the end of the latest KPI_Actuals period (2026-Q4 → 2026-12-31). To set it yourself, add a review_date column (YYYY-MM-DD) to Org."),
    ("Money", "Local currency: INR for IN, CNY for CN. Training cost is in INR. All sample figures are fictional placeholders."),
    ("Pay", "base_pay and pay_range_mid are yearly amounts in the same unit (not thousands). base_pay ÷ pay_range_mid (the compa-ratio) must be 0.5 to 2.0. Each grade needs a Reward_Policy row for its country."),
    ("Potential", "1, 2 or 3 (low, medium, high)."),
    ("Gate data", "A person with no rows for a gate gets no penalty: the gate shows as \"no data\"."),
    ("Reward_Policy", "Two kinds of row: grade rows (country, grade, target_bonus_pct, merit_budget_pct, learning_wallet) and matrix rows (country, rating, multiplier, compa_band, merit_pct)."),
    ("Leadership_Profile", "Optional private trait self-assessment fields may be added, but PRISM never uses them in ratings, ranking, promotion or pay."),
    ("Fictional data", "VoltBridge Mobility, its people and its numbers are invented for a course project."),
]


def style_sheet(ws, cols):
    for i, c in enumerate(cols, 1):
        cell = ws.cell(row=1, column=i, value=c)
        cell.font, cell.fill = HEAD, HEAD_FILL
        cell.alignment = Alignment(vertical="center")
    ws.freeze_panes = "A2"
    for i, c in enumerate(cols, 1):
        ws.column_dimensions[get_column_letter(i)].width = max(12, min(44, len(c) + 6))


def add_validations(ws, sheet, cols, last_row):
    for (sh, col), vals in ALLOWED.items():
        if sh != sheet or col not in cols:
            continue
        letter = get_column_letter(cols.index(col) + 1)
        dv = DataValidation(type="list", formula1=f'"{vals}"', allow_blank=True)
        dv.add(f"{letter}2:{letter}{max(last_row, 5000)}")
        ws.add_data_validation(dv)


def build_workbook(path, filled):
    wb = Workbook()
    ws = wb.active
    ws.title = "README"
    for r, (a, b) in enumerate(README_ROWS, 1):
        ws.cell(row=r, column=1, value=a).font = Font(name="Arial", size=12 if r == 1 else 10, bold=True)
        ws.cell(row=r, column=2, value=b).font = FONT
        ws.cell(row=r, column=2).alignment = Alignment(wrap_text=True, vertical="top")
    ws.column_dimensions["A"].width = 22
    ws.column_dimensions["B"].width = 110
    if filled:
        ws.cell(row=len(README_ROWS) + 2, column=1, value="This copy").font = Font(name="Arial", size=10, bold=True)
        ws.cell(row=len(README_ROWS) + 2, column=2,
                value=f"Filled with the VoltBridge Mobility sample (seed {SEED}); same data as data/sample-org/voltbridge.json.").font = FONT
    for sheet, cols in SHEETS:
        w = wb.create_sheet(sheet)
        style_sheet(w, cols)
        rows = data[sheet] if filled else data[sheet][:1]
        for ri, row in enumerate(rows, 2):
            for ci, c in enumerate(cols, 1):
                v = row.get(c, "")
                cell = w.cell(row=ri, column=ci, value=None if v == "" else v)
                cell.font = FONT if filled else EX_FONT
                if not filled:
                    cell.fill = INPUT_FILL
        add_validations(w, sheet, cols, len(rows) + 1)
    path.parent.mkdir(parents=True, exist_ok=True)
    wb.save(path)


build_workbook(ROOT / "data/templates/pms_input_template.xlsx", filled=False)
build_workbook(ROOT / "data/templates/voltbridge_filled.xlsx", filled=True)

print("employees:", len(employees), "| kpi rows:", len(kpi_actuals), "| 360 rows:", len(fb),
      "| check-ins:", len(checkins), "| personas:", len(PERSONAS))
