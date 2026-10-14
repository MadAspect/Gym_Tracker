# Gym Tracker
A free, offline-first PWA for logging a PPL hypertrophy routine. Syncs to Google Sheets.

## Architecture
- `js/routine.js`: routine config and training cycle (data)
- `js/db.js`: IndexedDB storage, source of truth (storage)
- `js/logic.js`: pure calculations: kg/lb, volume, PRs, duration (logic)
- UI, sync and PWA layers arrive in later modules.

Weights are stored in kg; lb is converted on input.
