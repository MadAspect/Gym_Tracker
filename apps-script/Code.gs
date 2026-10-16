// Paste into Extensions > Apps Script. KEEP YOUR OWN SECRET LINE (never commit the real one).
const SECRET = "change-me-to-something-long"; // must match the secret you enter in the app
const SHEET = "Sets";
const HEADERS = ["key", "date", "time", "workout", "exercise", "set", "reps", "weight_kg", "volume"];

// Receives { secret, rows, deletes, routine?, library? }. Sets are upserted by key (their log time).
function doPost(e) {
  const body = JSON.parse(e.postData.contents);
  if (body.secret !== SECRET) return out({ ok: false, error: "bad secret" });
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET);
  const keysOf = () => (sh.getLastRow() < 2 ? [] : sh.getRange(2, 1, sh.getLastRow() - 1, 1).getValues().flat().map(String));
  const tz = Session.getScriptTimeZone();
  const keys = keysOf();
  (body.rows || []).forEach((r) => {
    const d = new Date(r.ts);
    const row = [String(r.ts), Utilities.formatDate(d, tz, "yyyy-MM-dd"), Utilities.formatDate(d, tz, "HH:mm:ss"),
      r.workout, r.exercise, r.set, r.reps, r.weightKg, r.reps * r.weightKg];
    const i = keys.indexOf(String(r.ts));
    if (i >= 0) sh.getRange(i + 2, 1, 1, row.length).setValues([row]);
    else { sh.appendRow(row); keys.push(String(r.ts)); }
  });
  if ((body.deletes || []).length) { // delete bottom-up so row numbers stay valid
    const del = new Set(body.deletes.map(String)), ks = keysOf();
    for (let i = ks.length - 1; i >= 0; i--) if (del.has(ks[i])) sh.deleteRow(i + 2);
  }
  if (body.routine) writeRoutine(ss, body.routine, body.library || []);
  return out({ ok: true });
}
const out = (o) => ContentService.createTextOutput(JSON.stringify(o)).setMimeType(ContentService.MimeType.JSON);

// Rewrites the Routine and Exercises sheets and rebuilds the Progress dropdown from the library.
function writeRoutine(ss, routine, library) {
  const grab = (n) => ss.getSheetByName(n) || ss.insertSheet(n);
  const rrows = [["day", "order", "exercise", "sets"]];
  Object.keys(routine).forEach((d) => routine[d].forEach((x, i) => rrows.push([d, i + 1, x.name, x.sets])));
  const rs = grab("Routine"); rs.clearContents(); rs.getRange(1, 1, rrows.length, 4).setValues(rrows);
  const active = new Set(Object.keys(routine).flatMap((d) => routine[d].map((x) => x.name)));
  const erows = [["exercise", "status"]].concat(library.map((n) => [n, active.has(n) ? "active" : "reserve"]));
  const ex = grab("Exercises"); ex.clearContents(); ex.getRange(1, 1, erows.length, 2).setValues(erows);
  const p = ss.getSheetByName("Progress");
  if (p && library.length) p.getRange("B1").setDataValidation(SpreadsheetApp.newDataValidation()
    .requireValueInRange(ex.getRange(2, 1, library.length, 1)).build());
}

// Run ONCE by hand (already done if you set up earlier): creates Sets + Progress sheets and charts.
function setup() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sh = ss.getSheetByName(SHEET) || ss.insertSheet(SHEET);
  sh.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]).setFontWeight("bold");
  sh.setFrozenRows(1);
  const p = ss.getSheetByName("Progress") || ss.insertSheet("Progress");
  p.getRange("A1").setValue("Exercise:");
  p.getRange("B1").setValue("Leg Press"); // the dropdown is built by the first routine sync from the app
  p.getRange("A3").setFormula(`=QUERY(Sets!A:I,"select B, max(H) where E = '"&B1&"' group by B order by B label B 'Date', max(H) 'Top weight (kg)'",1)`);
  p.getRange("D3").setFormula(`=QUERY(Sets!A:I,"select B, sum(I) group by B order by B label B 'Date', sum(I) 'Volume (kg)'",1)`);
  p.getCharts().forEach((c) => p.removeChart(c));
  const line = (range, title, row) => p.insertChart(p.newChart().setChartType(Charts.ChartType.LINE)
    .addRange(p.getRange(range)).setNumHeaders(1).setOption("title", title).setPosition(row, 1, 0, 0).build());
  line("A3:B300", "Top weight for selected exercise", 5);
  line("D3:E300", "Total volume per day", 25);
}
