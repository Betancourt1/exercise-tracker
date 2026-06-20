# Rutina de Ejercicio

Local-first workout routine web app for creating routines, training, logging workout history, and reviewing progress from the browser.

The app is intentionally small and private: no accounts, no backend, no sync service, and no external exercise videos. Workout data lives in the browser through IndexedDB and can be exported/imported from `Ajustes`.

## Current MVP

- `Hoy`: next routine summary and quick path into training.
- `Rutinas`: create routines, select training days, order routines, soft-delete routines, and undo deletion.
- Routine builder: add exercises from the seeded library, edit sets/reps/RIR/rest targets, reorder exercises, and view compact exercise guidance.
- Active workout: start a routine, log kg/reps/RIR by series, discard or finish, and save workout history with routine/exercise snapshots.
- `Progreso`: completed-session analytics for volume, completed series, recent sessions, PRs, and exercise detail.
- `Ajustes`: JSON export/import for local backup and recovery.

## Tech Stack

- Vite
- React
- TypeScript
- Dexie / IndexedDB
- Vitest
- Plain CSS
- Lucide React icons

## Getting Started

```bash
npm install
npm run dev
```

Then open the local Vite URL, usually:

```text
http://localhost:5173
```

## Scripts

```bash
npm test
npm run build
npm run preview
```

- `npm test`: runs Vitest unit/repository tests.
- `npm run build`: type-checks and builds the app.
- `npm run preview`: serves the production build locally.

## Project Structure

```text
src/
  App.tsx                    App shell, navigation, and top-level views
  styles.css                 Shared application styles
  data/                      IndexedDB schema, repositories, import/export
  domain/                    Types, analytics formulas, pure helpers
  features/
    routines/                Routine list, create flow, builder
    workout/                 Active workout logging
    progress/                Progress dashboard and analytics UI
```

Important product references:

- [design.md](./design.md): product and system design.
- [mockups/desktop-flows](./mockups/desktop-flows/README.md): desktop visual direction.
- [AGENTS.md](./AGENTS.md): project agent workflow and contribution gates.

## Local Data Model

The app stores data in IndexedDB. The core entities are:

- exercises
- routines
- routine days
- routine exercises
- routine revisions
- workout sessions
- set logs
- settings

Workout history is designed to remain readable even if routines or exercises change later. Completed sessions store snapshots such as routine name, exercise name, planned targets, and exercise guide details.

## Export and Import

Use `Ajustes` to export a JSON backup of local data.

Import is replace-only for the MVP:

1. Choose a JSON export file.
2. Confirm replacement.
3. The app validates the file before writing.
4. The app creates a backup of the previous local state before replacing data.

Keep regular exports if the workout history matters. Browser storage can be cleared by the browser, device cleanup tools, or profile resets.

## Analytics

Progress analytics use completed workouts only. Draft, in-progress, and discarded sessions are excluded.

Current metrics include:

- completed sessions
- total volume in kg
- completed series
- recent sessions
- estimated 1RM using Epley
- exercise PR summaries

Adherence is kept conservative in the MVP and should not be treated as a precise training prescription.

## MVP Limitations

- No login, backend, or cloud sync.
- Exercise library is intentionally small.
- `Ejercicios` is not a full standalone exercise manager yet.
- Unit preferences are not fully implemented.
- Import mode is replace-only; merge import is out of scope.
- No advanced calendar or periodization.

## Development Notes

- Do not commit generated artifacts such as `node_modules/` or `dist/`.
- Keep changes small and reversible.
- Every repository change should be followed by a commit.
- Preserve the local-first data guarantees: routine deletion must not delete workout history.
