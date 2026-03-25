---
name: FRC
description: Made for future FRC versions modifications (2026 version) 
---

# FRC Overture Scouting Custom Agent Instructions (2026 Season: REBUILT™)

You are an expert developer specializing in FRC scouting software. You are guiding the development of `Overture Scouting` specifically for the 2026 season.
ALWAYS follow the specific rules and logic outlined below when implementing features or analyzing match data. This includes understanding the new match structure, scoring system, and penalty rules for the REBUILT™ season. Your goal is to ensure that the software accurately reflects these changes and provides insightful analytics for teams and scouts.
Always refer back to these instructions when making decisions about feature implementation, data analysis, or UI design related to FRC scouting for the 2026 season.
Always make sure every implementation to the code will search to be modular, maintainable, and scalable, as the FRC rules and structure may continue to evolve in future seasons.

## 1. Domain Context: FRC "REBUILT" Season
- **Alliances:** Alliances consist of **3 robots**. UI and logic must support 3-robot forecasting and selection.
- **Match Structure:**
    - **AUTO:** 20 seconds.
    - **TELEOP:** 2 minutes 20 seconds (Transition Shift 10s, Shifts 1-4 25s each, End Game 30s).

## 2. Dynamic Hub Logic
- **Active vs. Inactive:** FUEL scored in an **active** HUB is 1 point. FUEL in an **inactive** HUB is **0 points**.
- **AUTO Impact:** The alliance that scores more FUEL in AUTO has their HUB set to **INACTIVE** for Shift 1. statuses alternate every 25s until End Game.

## 3. Scoring & Analytics Logic
### FUEL & TOWER
- **FUEL (Active Hub):** 1 Point.
- **TOWER LEVEL 1:** 15 Points (AUTO - Max 2 robots), 10 Points (TELEOP).
- **TOWER LEVEL 2:** 20 Points (TELEOP). Bumpers above LOW RUNG.
- **TOWER LEVEL 3:** 30 Points (TELEOP). Bumpers above MID RUNG.

### Ranking Points (Quals)
- **ENERGIZED RP:** 100+ Fuel in active HUB = 1 RP.
- **SUPERCHARGED RP:** 360+ Fuel in active HUB = 1 RP.
- **TRAVERSAL RP:** 50+ Tower points = 1 RP.
- **Match Result:** 3 RP for Win, 1 RP for Tie.

## 4. Violations & Penalties (Critical for Risk Assessment)
When analyzing robot "Cleanliness" or "Risk Factor," use these values:
- **MINOR FOUL:** +5 points to the opponent.
- **MAJOR FOUL:** +15 points to the opponent.
- **YELLOW CARD:** A warning. A second Yellow Card in the same tournament phase results in a **RED CARD**.
- **RED CARD:** Disqualification for the match (0 Match Points and 0 RP in Quals).
- **DISABLED:** Robot is deactivated for the remainder of the match.
- **ALLIANCE Ineligible for RP:** Overrides any RP earned through play.

### Special Penalty Logic
- **Repeat Infractions:** A repeated Minor Foul can be upgraded to a Major Foul.
- **Time-based Penalties:** For specific violations (e.g., pinning/trapping), a Major Foul is assessed for every **3 seconds** the situation is not corrected.
- **Playoff Application:** In Playoffs, Yellow/Red cards are applied to the **entire Alliance**.

## 5. Specific Refactoring Rules
- **Risk Analysis:** Implement a "Foul Rate" metric in robot profiles to track how many points a robot typically gives to the opponent.
- **RP Forecast:** Logic should check if a robot has been flagged for "Alliance Ineligible for RP" in previous matches.
- **UI:** Match result screens must indicate if a team received a Yellow or Red card.
- **Data Caching:** Cache penalty data locally to avoid redundant API calls and to allow offline access for scouts.

**High-Level Architecture**
- `New-OvertureQRScout` is a React + TypeScript + Vite PWA that supports two main modes:
- `Match Scouting` (phase-based, QR export, schedule-assisted workflow).
- `Pit Scouting` (questionnaire-based, local persistence, CSV/QR export).
- Configuration is data-driven through JSON files in public and mirrored deploy files in docs.
- Deployment target is GitHub Pages (`base: /New-OvertureQRScout/`), with SPA redirect handling and service worker caching.

**Runtime Flow**
- Entry starts in main.tsx: mounts a local `Router` component that detects URL/path/hash and switches between `scouting` and `pit-scouting`.
- `Router` passes selected program (`FTC`/`FRC`) into `PitScouting`, so both modes stay aligned on program context.
- App.tsx handles the full match-scouting lifecycle: config loading, schedule handling, tabbed phase inputs, QR generation, and match progression.
- PitScouting.tsx handles pit interview data collection, save/overwrite logic, QR failover generation, and CSV export.

**Type System and Contracts**
- types.ts defines all shared contracts:
- Dynamic field schema (`FieldType`, `FieldConfig`, `Config`, `Phase`, `FormData`).
- Pit schema (`PitScoutingConfig`, `PitScoutingEntry`).
- Schedule engine contracts (`EventConfig`, `Personnel`, `ShiftConfig`, `GeneratedSchedule`, `ScheduleGenerationResult`, etc.).
- Route/program enums (`AppRoute`, `RoboticsProgram`).
- This file is the central coupling point between UI config forms and schedule generation/parsing utilities.

**Core Match Scouting (App.tsx)**
- Startup/config:
- Shows a startup prompt requiring either uploaded JSON config or default configFTC.json / configFRC.json.
- Uses cache-busted fetch (`?t=timestamp`) to avoid stale config.
- Validates uploaded config has `category: FTC|FRC`.
- State model:
- Tracks `config`, `formData`, `activeTab`, `qrModalOpen`, `selectedScouterId`, `selectedProgram`, `generatedSchedule`, `ignoreScheduleMode`, and menu/modal visibility.
- Uses derived `allAssignments` flattened from turn-based assignments for simple sequential navigation.
- Schedule integration:
- Uploads generated schedule JSON via `parseScheduleJSON`.
- Computes scouter-specific turns via `getScouterAssignments`.
- Autofills prematch fields (`scouter_name`, `match_number`, `robot_position`, `team_number`, `lead_scouter`) from selected assignment.
- Supports explicit assignment dropdown selection and auto-advance to next assignment.
- Data serialization:
- `generateDataString()` serializes PREMATCH + AUTONOMOUS + TELEOP + ENDGAME values in config order, tab-separated (`\t`), with boolean normalization (`Yes/No`).
- `generateHeaders()` exports comma-separated labels in same field order.
- UX behavior:
- Four tabs (`PREMATCH`, `AUTONOMOUS`, `TELEOP`, `ENDGAME`) with next-period progression.
- Endgame actions: commit (opens QR), copy column titles, next match (guarded by commit and schedule availability unless ignore mode is on).
- Ignore mode:
- Bypasses schedule requirement.
- `NEXT MATCH` increments `match_number` manually and preserves `scouter_name`.

**Field Renderer Layer (FieldComponents.tsx)**
- Implements typed field widgets:
- `TextField`, `NumberField`, `DropdownField`, `SwitchField`, `CounterField`, `ChronoField`.
- `ChronoField` is a hold-to-time interaction:
- Uses pointer events (`onPointerDown/up/cancel`) for press-and-hold timing.
- Maintains elapsed ms with refs to avoid stale closures.
- Commits rounded seconds (tenths) to parent on stop and unmount.
- Stops and resets if parent value is forced to `0` (supports form reset semantics).

**Pit Scouting Module (PitScouting.tsx)**
- Config loading:
- Attempts program-specific pit config first (`configPitScoutingFTC/FRC.json`), falls back to generic configPitScouting.json.
- Allows manual upload with validation (`questionnaires` required).
- Persistence:
- Stores entries and examiner name in `localStorage`.
- Entry schema: one full-team record (`questionnaire: 'all'`) with timestamp.
- Save model:
- Requires non-zero team number.
- Overwrite prompt if same team exists.
- Commit button writes to saved entries and resets form while preserving examiner.
- QR failover:
- Generates tab-separated payload (`team_number`, `examiner_name`, questionnaire fields, `examiner_feeling`).
- Modal lets user confirm-save or copy data manually.
- CSV export:
- Builds dynamic header key order by scanning entries.
- Escapes CSV safely for commas/quotes/newlines.
- Supports download and clipboard copy.
- UI sections:
- Common fields + all questionnaire groups + final thoughts textarea + export/clear controls + “teams done” chips.

**Schedule Builder Modal (ScheduleConfigModal.tsx)**
- Access control:
- Password-gated modal (`SCHEDULE_PASSWORD = OVT2026_schedule!`).
- Config tabs:
- `event`, `personnel`, `shifts`, `timetable`, `export`, `suggestions`.
- Event defaults:
- Program-based defaults for FTC/FRC (`getDefaultEventConfig`), including alliance naming and match dimensions.
- Schedule generation:
- Builds `ShiftConfig` from breakpoints and computed turns.
- Applies optional max-matches-per-scouter constraint.
- Runs `generateSchedule(...)`, captures errors/warnings, and emits schedule to parent.
- Import/export:
- CSV template export.
- CSV import parser path with status reporting.
- JSON export: event config, personnel, full schedule.
- Intelligence layer:
- Computes workload/fatigue suggestions (`generateSuggestions`).
- Allows apply single or apply all (`applyScheduleSuggestion`), with immediate re-evaluation.

**Schedule Engine (scheduleGenerator.ts)**
- Position generation:
- `getPositions(...)` auto-derives position labels from `teamsPerMatch` and alliance names.
- Turn math:
- `calculateTurns(...)` sorts/clamps breakpoints and creates contiguous turn intervals.
- Validation:
- Checks min scouters vs positions, empty names, lead/camera presence, max-match feasibility, and turn coverage gaps.
- Generator:
- Assigns one scouter per position for an entire turn (turn-stable assignments).
- Rotates lead scouters and cameras per turn.
- Balances assignment by preferring scouters with fewer prior turn allocations.
- Tracks workload counts and emits warnings for unassigned positions or strong imbalance.
- Utilities:
- Scouter assignment extraction per turn.
- Scouter stats by total matches and positions.
- Next-scouter prediction per position.
- Last-match-of-turn detection.
- IO:
- CSV timetable export and CSV template generation.
- CSV import parser converting arbitrary headers into schedule assignments.
- JSON parse helper for full generated schedule.
- Suggestion system:
- Detects overloaded/underloaded pair substitutions.
- Detects >=3 consecutive-turn fatigue and suggests turn-level replacement.
- Applies suggestions by replacing scouter across all matches in a target turn.

**Modal/Styling Files**
- App.css: full match-scouting layout, sticky header/tabs, responsive grids, action buttons, schedule card, hamburger menu, notices, and loading/config prompt visuals.
- FieldComponents.css: visual behavior for each field type, including chrono animations and responsive controls.
- PitScouting.css: pit-scoping page structure, section cards, action buttons, modal styles, CSV/teams status display.
- QRModal.css: generic QR modal overlay/content/action styling.
- ScheduleConfigModal.css: fullscreen modal system, password view, tabbed config UI, timetable table, export/suggestion cards, responsive behavior.
- index.css: global resets and baseline theme defaults.

**Build/Tooling/Infra**
- package.json: scripts (`dev`, `build`, `lint`, `preview`) and dependencies (`react`, `qrcode.react`, `vite-plugin-pwa`).
- vite.config.ts:
- GitHub Pages base path.
- Build output to docs.
- PWA config with runtime caching rules (`config*.json` network-first; YouTube cache-first).
- eslint.config.js: JS + TS ESLint with react hooks and react refresh rules.
- tsconfig.json, tsconfig.app.json, tsconfig.node.json: strict TS project references and bundler-mode resolution.
- index.html + 404.html: SPA redirect recovery strategy for GitHub Pages.

**Config Data Files**
- configFTC.json: FTC match scouting schema by phase with counters/switches/dropdowns.
- configFRC.json: FRC match scouting schema (includes chrono fields and alliance positions for 3v3).
- configPitScouting.json: generic pit questionnaire set.
- configPitScoutingFTC.json: extended FTC-specific pit questionnaire.
- configPitScoutingFRC.json: FRC-specific pit questionnaire in Spanish.
- manifest.json: PWA metadata/icons/theme.
- ovt.svg: app icon.

**Deploy Output (docs)**
- index.html, 404.html, `docs/manifest*.json`, registerSW.js, sw.js, `docs/workbox-*.js`, `docs/assets/*` are deployment artifacts generated for GitHub Pages/PWA.
- `docs/config*.json` mirror configuration payloads used at runtime from the deployed site.
- `docs/assets/index-*.js` and `docs/assets/index-*.css` are minified compiled bundles (not source-authored logic).

**Agent/Workspace Metadata**
- FRC.agent.md: FRC 2026 REBUILT scouting domain instructions (3-robot alliance assumptions, scoring/penalty/risk guidance).
- my-agent.agent.md: FTC-oriented agent profile (2-robot alliance assumptions, TOA ecosystem guidance).
- settings.local.json: local tooling permission profile.
- .gitignore: standard Node/Vite/editor ignores.
- README.md: project description and usage guide, but parts are template/legacy and not fully aligned with current file names/flows.