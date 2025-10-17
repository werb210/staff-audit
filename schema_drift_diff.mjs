import fs from "fs";

const snapshot = JSON.parse(fs.readFileSync("db_schema_snapshot.json", "utf8"));
const baseline = JSON.parse(fs.readFileSync("db_schema_baseline.json", "utf8"));

const timestamp = new Date().toISOString().replace(/[:.]/g, "-");
const outJson = `logs/drift_summary_${timestamp}.json`;
const outTxt = `logs/drift_summary_${timestamp}.txt`;
fs.mkdirSync("logs", { recursive: true });

const drift = { addedTables: [], removedTables: [], changedColumns: {} };

const snapTables = Object.keys(snapshot);
const baseTables = Object.keys(baseline);

for (const t of snapTables) if (!baseTables.includes(t)) drift.addedTables.push(t);
for (const t of baseTables) if (!snapTables.includes(t)) drift.removedTables.push(t);

for (const t of snapTables.filter(t => baseTables.includes(t))) {
  const snapCols = Array.isArray(snapshot[t]) ? snapshot[t] : Object.keys(snapshot[t]);
  const baseCols = Array.isArray(baseline[t]) ? baseline[t] : Object.keys(baseline[t]);
  const addedCols = snapCols.filter(c => !baseCols.includes(c));
  const removedCols = baseCols.filter(c => !snapCols.includes(c));
  if (addedCols.length || removedCols.length)
    drift.changedColumns[t] = { added: addedCols, removed: removedCols };
}

fs.writeFileSync(outJson, JSON.stringify(drift, null, 2));

let txt = "=== Schema Drift Summary ===\n";
if (!drift.addedTables.length && !drift.removedTables.length && !Object.keys(drift.changedColumns).length) {
  txt += "No drift detected.\n";
} else {
  if (drift.addedTables.length) txt += `Added Tables: ${drift.addedTables.join(", ")}\n`;
  if (drift.removedTables.length) txt += `Removed Tables: ${drift.removedTables.join(", ")}\n`;
  for (const [t, diff] of Object.entries(drift.changedColumns))
    txt += `Table ${t}: +${diff.added.join(", ")} -${diff.removed.join(", ")}\n`;
}
fs.writeFileSync(outTxt, txt);
console.log(txt);
