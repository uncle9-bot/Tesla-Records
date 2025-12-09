// Tesla Maintenance Tracker - Logic

const STORAGE_KEY = "teslaMaintenanceRecords_v3";

// Column order used for JS objects and exported CSV
const HEADERS = [
  "Date",
  "Location",
  "Starting Time",
  "Ending Time",
  "Duratin",
  "Starting km",
  "Ending km",
  "km added",
  "ClaimedkW",
  "Claimed Amp",
  "km/hr",
  "kWh added",
  "Fully Charged",
  "Full km",
  "Charging Fee",
  "Parking Fee",
  "$/kW",
  "$/km",
  "Odometer",
  "Maintenance",
  "Remarks"
];

// Mapping between form input IDs and data keys
const FIELD_IDS = [
  { id: "input-Date",          key: "Date" },
  { id: "input-Location",      key: "Location" },
  { id: "input-Starting Time", key: "Starting Time" },
  { id: "input-Ending Time",   key: "Ending Time" },
  { id: "input-Duratin",       key: "Duratin" },
  { id: "input-Starting km",   key: "Starting km" },
  { id: "input-Ending km",     key: "Ending km" },
  { id: "input-km added",      key: "km added" },
  { id: "input-ClaimedkW",     key: "ClaimedkW" },
  { id: "input-Claimed Amp",   key: "Claimed Amp" },
  { id: "input-km/hr",         key: "km/hr" },
  { id: "input-kWh added",     key: "kWh added" },
  { id: "input-Fully Charged", key: "Fully Charged" },
  { id: "input-Full km",       key: "Full km" },
  { id: "input-Charging Fee",  key: "Charging Fee" },
  { id: "input-Parking Fee",   key: "Parking Fee" },
  { id: "input-$/kW",          key: "$/kW" },
<|diff_marker|> ADD A1000
  { id: "input-$/km",          key: "$/km" },
  { id: "input-Odometer",      key: "Odometer" },
  { id: "input-Maintenance",   key: "Maintenance" },
  { id: "input-Remarks",       key: "Remarks" }
];

let records = [];

// -------- CSV line parser --------
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === "\"") {
        if (i + 1 < line.length && line[i + 1] === "\"") {
<|diff_marker|> ADD A1020
          current += "\"";
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === "\"") {
        inQuotes = true;
      } else if (ch === ",") {
        result.push(current);
        current = "";
      } else {
        current += ch;
      }
    }
  }
  result.push(current);
<|diff_marker|> ADD A1040
  return result;
}

// -------- Build CSV text --------
function escapeCsvValue(value) {
  if (value === null || value === undefined) return "";
  const s = String(value);
  if (/[",\n\r]/.test(s)) {
    return '"' + s.replace(/"/g, '""') + '"';
  }
  return s;
}

function buildCsv(rows) {
  const headerRow = HEADERS.map(escapeCsvValue).join(",");
  const bodyRows = rows.map(row =>
    HEADERS.map(h => escapeCsvValue(row[h] ?? "")).join(",")
  );
  return [headerRow, ...bodyRows].join("\n");
}

// -------- Storage --------
<|diff_marker|> ADD A1060
function loadFromStorage() {
  try {
    const txt = localStorage.getItem(STORAGE_KEY);
    if (!txt) return [];
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) return parsed;
  } catch (e) {
    console.warn("Failed to parse stored data", e);
  }
  return [];
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn("Failed to save data", e);
  }
}

// -------- Money parsing --------
<|diff_marker|> ADD A1080
function parseMoney(value) {
  if (value === null || value === undefined) return 0;
  const s = String(value).trim();
  if (s === "") return 0;

  const cleaned = s.replace(/[^0-9.\-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// -------- Dashboard --------
function refreshDashboard() {
  const daysEl =
    document.getElementById("days-since-charge") ||
    document.getElementById("days-since-charged");

  const totalExEl =
    document.getElementById("total-expenditure") ||
    document.getElementById("total-expenditures");

<|diff_marker|> ADD A1100
  if (!daysEl && !totalExEl) return;

  // 1) Total Expenditures = Charging Fee + Parking Fee
  let total = 0;
  let lastFullChargeDate = null;

  records.forEach(rec => {
    const charging = parseMoney(rec["Charging Fee"]);
    const parking = parseMoney(rec["Parking Fee"]);
    total += charging + parking;

    const fc = (rec["Fully Charged"] || "").toString().toLowerCase().trim();
    if (fc === "yes" || fc === "y" || fc === "✓" || fc === "true") {
      const dStr = rec["Date"];
      if (!dStr) return;
      const dObj = new Date(dStr);
      if (!isNaN(dObj)) {
        if (!lastFullChargeDate || dObj > lastFullChargeDate) {
          lastFullChargeDate = dObj;
        }
<|diff_marker|> ADD A1120
      }
    }
  });

  if (totalExEl) {
    totalExEl.textContent = `Total Expenditures: $${total.toFixed(2)}`;
  }

  // 2) Days since last fully charged, using TODAY as base
  if (!daysEl) return;

  if (!lastFullChargeDate) {
    daysEl.textContent = "No. of Days of Last Fully Charged: N/A";
    return;
  }

  const today = new Date();
  const base = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const last = new Date(
    lastFullChargeDate.getFullYear(),
<|diff_marker|> ADD A1140
    lastFullChargeDate.getMonth(),
    lastFullChargeDate.getDate()
  );

  let diffMs = base - last;
  let diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  if (diffDays < 0) diffDays = 0;

  daysEl.textContent = `No. of Days of Last Fully Charged: ${diffDays} day(s)`;
}

// -------- Table rendering --------
function renderTable() {
  const container = document.getElementById("records-table-container");
  if (!container) return;

  container.innerHTML = "";

  const table = document.createElement("table");
  table.id = "records-table";

<|diff_marker|> ADD A1160
  const thead = document.createElement("thead");
  const headerRow = document.createElement("tr");

  HEADERS.forEach(h => {
    const th = document.createElement("th");
    th.textContent = h;
    headerRow.appendChild(th);
  });

  const thAction = document.createElement("th");
  thAction.textContent = "Actions";
  headerRow.appendChild(thAction);

  thead.appendChild(headerRow);
  table.appendChild(thead);

  const tbody = document.createElement("tbody");

  records.forEach((rec, idx) => {
    const tr = document.createElement("tr");

<|diff_marker|> ADD A1180
    HEADERS.forEach(h => {
      const td = document.createElement("td");
      td.textContent = rec[h] ?? "";
      tr.appendChild(td);
    });

    const tdAction = document.createElement("td");
    const amendBtn = document.createElement("button");
    amendBtn.textContent = "Amend";
    amendBtn.className = "amend-btn";
    amendBtn.addEventListener("click", () => {
      loadRecordIntoForm(idx);
      window.scrollTo({ top: 0, behavior: "smooth" });
    });
    tdAction.appendChild(amendBtn);
    tr.appendChild(tdAction);

    tbody.appendChild(tr);
  });


::contentReference[oaicite:0]{index=0}
