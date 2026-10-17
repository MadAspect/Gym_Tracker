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

## Install and deploy (GitHub Pages)
1. Push to GitHub. Repo Settings > Pages > Deploy from branch > `main` / root.
2. Open `https://<username>.github.io/gym-tracker/` in Chrome on Android, menu > Install app.
3. Re-enter the Sync URL and secret on the Sync tab (settings are stored per site).

## Change the name or icon
- **Name:** edit `name` and `short_name` in `manifest.webmanifest`, and `<title>` in `index.html`.
- **Icon:** `python tools/make_icons.py` redraws the default icon (colours at the top of the script), or
  `python tools/make_icons.py my-logo.png` uses your own image. Then push. Android refreshes the installed
  app's name and icon on its own within about a day; use Export backup in Settings before reinstalling.

## Use it yourself (or share it)
- **Install:** open the live site, then on Android Chrome use menu > Install app. On iPhone use Safari > Share > Add to Home Screen.
- **Your data stays on your device.** Nothing is uploaded unless you set up Sync with your own Google Sheet (steps above). Never share your Sync URL or secret.
- **Make it yours:** edit each day's exercises in Settings. The Push / Pull / Legs cycle is set in `js/routine.js`.
