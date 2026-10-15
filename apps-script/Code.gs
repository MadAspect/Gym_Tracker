// Paste into Extensions > Apps Script in your Google Sheet. See README for setup.
const SECRET = "change-me-to-something-long"; // must match the secret you enter in the app
const SHEET = "Sets";
const HEADERS = ["key", "date", "time", "workout", "exercise", "set", "reps", "weight_kg", "volume"];
const EXERCISES = ["Machine Chest Press","Pec Dec","Incline Chest Press","Machine Shoulder Press","Cable Lateral Raises",
  "Overhead Tricep Extensions","Tricep Pushdown","Lat Pulldown","Cable Rows","Preacher Curls","Hammer Curls",
  "Incline Curls","Rear Delt Fly","Leg Press","RDLs","Quad Extensions","Hamstring Curls","Smith Machine Calf Raises"];

// Receives { secret, rows: [...] } from the app. Upserts by key (the set's log time), so edits don't duplicate.
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.secret !== SECRET) return out({ ok: false, error: "bad secret" });
  const sh = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SHEET);
  const keys = sh.getLastRow() < 2 ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().flat().map(String);
  const tz = Session.getScriptTimeZone();
  body.rows.forEach((r) => {
    const d = new Date(r.ts);
    const row = [String(r.ts), Utilities.formatDate(d, tz, "yyyy-MM-dd"), Utilities.formatDate(d, tz, "HH:mm:ss"),
      r.workout, r.exercise, r.set, r.reps, r.weightKg, r.reps * r.weightKg];
    const i = keys.indexOf(String(r.ts));
    if (i >= 0) sh.getRange(i + 2, 1, 1, row.length).setValues([row]);
    else { sh.appendRow(row); keys.push(String(r.ts)); }
  });
  return out({ ok: true });
}
const out = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);

// Run ONCE by hand: creates the Sets sheet and a Progress sheet with a dropdown and charts.
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  sh.setFrozenRows(1);
  const p = ss.getSheetByName("Progress") || ss.insertSheet("Progress");
  p.getRange("A1").setValue("Exercise:");
  p.getRange("B1").setValue(EXERCISES[13]).setDataValidation(SpreadsheetApp.newDataValidation().requireValueInList(EXERCISES).build());
  p.getRange("A3").setFormula(`=QUERY(Sets!A:I,"select B, max(H) where E = '"&B1&"' group by B order by B label B 'Date', max(H) 'Top weight (kg)'",1)`);
  p.getRange("D3").setFormula(`=QUERY(Sets!A:I,"select B, sum(I) group by B order by B label B 'Date', sum(I) 'Volume (kg)'",1)`);
  p.getCharts().forEach((c) => p.removeChart(c));
  const line = (range, title, row) => p.insertChart(p.newChart().setChartType(Charts.ChartType.LINE)
    .addRange(p.getRange(range)).setNumHeaders(1).setOption("title", title).setPosition(row, 1, 0, 0).build());
  line("A3:B300", "Top weight for selected exercise", 5);
  line("D3:E300", "Total volume per day", 25);
}
