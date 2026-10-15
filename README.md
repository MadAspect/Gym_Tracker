# Gym Tracker
A free, offline-first PWA for logging a PPL hypertrophy routine. Syncs to Google Sheets.

## Architecture
- `js/routine.js`: routine config and training cycle (data)
- `js/db.js`: IndexedDB storage, source of truth (storage)
- `js/logic.js`: pure calculations: kg/lb, volume, PRs, duration (logic)
- UI, sync and PWA layers arrive in later modules.

Weights are stored in kg; lb is converted on input.

## Sync setup (Google Sheets)
1. Create a Google Sheet, then Extensions > Apps Script. Paste `apps-script/Code.gs`, set your own `SECRET`.
2. Run `setup` once (authorise when asked). It builds the `Sets` and `Progress` sheets.
3. Deploy > New deployment > Web app. Execute as: Me. Access: Anyone. Copy the `/exec` URL.
4. In the app, open the Sync tab and paste the URL and secret. They are stored only on the device.
