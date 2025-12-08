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

  table.appendChild(tbody);
  container.appendChild(table);
}

// -------- Form helpers --------
function clearForm() {
  const form = document.getElementById("entry-form");
  if (form) form.reset();

  const recordIdInput = document.getElementById("record-id");
  if (recordIdInput) recordIdInput.value = "";

  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) saveBtn.textContent = "💾 Save New Entry";
}

// helper: interpret stored value as boolean
function isTruthyYes(value) {
  if (value === null || value === undefined) return false;
  const s = String(value).trim().toLowerCase();
  if (!s) return false;
  return s === "yes" || s === "y" || s === "true" || s === "✓";
}

function loadRecordIntoForm(index) {
  const record = records[index];
  if (!record) return;

  FIELD_IDS.forEach(field => {
    const el = document.getElementById(field.id);
    if (!el) return;

    if (el.type === "checkbox") {
      el.checked = isTruthyYes(record[field.key]);
    } else {
      el.value = record[field.key] ?? "";
    }
  });

  const recordIdInput = document.getElementById("record-id");
  if (recordIdInput) recordIdInput.value = String(index);

  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) saveBtn.textContent = "💾 Save Changes";
}

function readFormToRecord() {
  const record = {};
  FIELD_IDS.forEach(field => {
    const el = document.getElementById(field.id);
    if (!el) {
      record[field.key] = "";
      return;
    }

    if (el.type === "checkbox") {
      record[field.key] = el.checked ? "Yes" : "";
    } else {
      record[field.key] = el.value ?? "";
    }
  });
  return record;
}

// -------- Duration calculation --------
function updateDurationFromTimes() {
  const startEl = document.getElementById("input-Starting Time");
  const endEl = document.getElementById("input-Ending Time");
  const durEl = document.getElementById("input-Duratin");
  if (!startEl || !endEl || !durEl) return;

  const start = startEl.value;
  const end = endEl.value;

  if (!start || !end) {
    durEl.value = "";
    return;
  }

  const [sh, sm] = start.split(":").map(Number);
  const [eh, em] = end.split(":").map(Number);
  if ([sh, sm, eh, em].some(v => isNaN(v))) {
    durEl.value = "";
    return;
  }

  let startMinutes = sh * 60 + sm;
  let endMinutes = eh * 60 + em;

  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  const diff = endMinutes - startMinutes;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;

  durEl.value = `${hours}:${mins.toString().padStart(2, "0")}`;
}

// -------- Auto-calculated fields: km added, cost per kW, cost per km --------
function updateCalculatedFields() {
  const startKmEl   = document.getElementById("input-Starting km");
  const endKmEl     = document.getElementById("input-Ending km");
  const kmAddedEl   = document.getElementById("input-km added");
  const chargingEl  = document.getElementById("input-Charging Fee");
  const parkingEl   = document.getElementById("input-Parking Fee");
  const kwhEl       = document.getElementById("input-kWh added");
  const costKwEl    = document.getElementById("input-$/kW");
  const costKmEl    = document.getElementById("input-$/km");

  if (!startKmEl || !endKmEl || !kmAddedEl || !chargingEl || !parkingEl || !kwhEl || !costKwEl || !costKmEl) {
    return;
  }

  // --- km added = Ending km - Starting km ---
  const startKm = parseFloat(startKmEl.value);
  const endKm   = parseFloat(endKmEl.value);
  let diffKm    = NaN;

  if (!isNaN(startKm) && !isNaN(endKm)) {
    diffKm = endKm - startKm;
    kmAddedEl.value = diffKm.toFixed(2);
  } else {
    kmAddedEl.value = "";
  }

  // --- total fee = Charging Fee + Parking Fee ---
  const chargingFee = parseMoney(chargingEl.value);
  const parkingFee  = parseMoney(parkingEl.value);
  const totalFee    = chargingFee + parkingFee;

  // --- Cost per kW = totalFee / kWh added ---
  const kwh = parseFloat(kwhEl.value);
  if (!isNaN(kwh) && kwh !== 0) {
    costKwEl.value = (totalFee / kwh).toFixed(2);
  } else {
    costKwEl.value = "";
  }

  // --- Cost per km = totalFee / km added ---
  if (!isNaN(diffKm) && diffKm !== 0) {
    costKmEl.value = (totalFee / diffKm).toFixed(2);
  } else {
    costKmEl.value = "";
  }
}

// -------- Initial CSV loading --------
function parseInitialCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length === 0) return [];

  let startIndex = 0;
  if (/^Date\s*,/i.test(lines[0])) {
    startIndex = 1; // skip header row
  }

  const out = [];

  for (let i = startIndex; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length === 0 || !cols[0]) continue;

    const rec = {};

    rec["Date"]          = cols[0]  || "";
    rec["Location"]      = cols[1]  || "";
    rec["Starting Time"] = cols[2]  || "";
    rec["Ending Time"]   = cols[3]  || "";
    rec["Duratin"]       = cols[4]  || "";
    rec["Starting km"]   = cols[5]  || "";
    rec["Ending km"]     = cols[6]  || "";
    rec["km added"]      = cols[7]  || "";
    rec["ClaimedkW"]     = cols[8]  || "";
    rec["Claimed Amp"]   = cols[9]  || "";
    rec["km/hr"]         = cols[10] || "";
    rec["kWh added"]     = cols[11] || "";
    rec["Fully Charged"] = cols[12] || "";
    rec["Full km"]       = cols[13] || "";
    rec["Charging Fee"]  = cols[14] || "";
    rec["Parking Fee"]   = cols[15] || "";
    rec["$/kW"]          = cols[16] || "";
    rec["$/km"]          = cols[17] || "";
    rec["Odometer"]      = cols[18] || "";
    rec["Maintenance"]   = cols[19] || "";
    rec["Remarks"]       = cols[20] || cols[21] || "";

    out.push(rec);
  }

  return out;
}

function tryLoadInitialCsv() {
  if (records.length > 0) {
    renderTable();
    refreshDashboard();
    return;
  }

  fetch("initial_data.csv")
    .then(resp => {
      if (!resp.ok) {
        throw new Error("No initial_data.csv or HTTP error");
      }
      return resp.text();
    })
    .then(text => {
      const parsedRows = parseInitialCsv(text);
      if (parsedRows && parsedRows.length > 0) {
        records = parsedRows;
        saveToStorage();
      }
    })
    .catch(err => {
      console.info("Could not load initial_data.csv (this is fine on very first use):", err);
    })
    .finally(() => {
      renderTable();
      refreshDashboard();
    });
}

// -------- Downloads --------
function downloadCsv(filename, includeBom) {
  if (!records || records.length === 0) {
    alert("No records to download yet.");
    return;
  }
  const csvText = buildCsv(records);
  const content = includeBom ? "\uFEFF" + csvText : csvText;

  const blob = new Blob([content], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);

  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------- Main setup --------
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("entry-form");
  const clearBtn = document.getElementById("clear-btn");
  const downloadCsvBtn = document.getElementById("download-csv-btn");
  const downloadGSheetBtn = document.getElementById("download-gsheet-btn");

  const startTimeEl = document.getElementById("input-Starting Time");
  const endTimeEl = document.getElementById("input-Ending Time");

  // Load from localStorage first
  records = loadFromStorage();

  if (records.length > 0) {
    renderTable();
    refreshDashboard();
  } else {
    tryLoadInitialCsv();
  }

  // Update duration when times change
  if (startTimeEl) {
    startTimeEl.addEventListener("change", updateDurationFromTimes);
    startTimeEl.addEventListener("input", updateDurationFromTimes);
  }
  if (endTimeEl) {
    endTimeEl.addEventListener("change", updateDurationFromTimes);
    endTimeEl.addEventListener("input", updateDurationFromTimes);
  }

  // Auto-calc: km added, cost per kW, cost per km
  const startKmEl   = document.getElementById("input-Starting km");
  const endKmEl     = document.getElementById("input-Ending km");
  const chargingEl  = document.getElementById("input-Charging Fee");
  const parkingEl   = document.getElementById("input-Parking Fee");
  const kwhEl       = document.getElementById("input-kWh added");

  const calcTriggerEls = [startKmEl, endKmEl, chargingEl, parkingEl, kwhEl];
  calcTriggerEls.forEach(el => {
    if (el) {
      el.addEventListener("input",  updateCalculatedFields);
      el.addEventListener("change", updateCalculatedFields);
    }
  });

  // Form submit (create/update)
  if (form) {
    form.addEventListener("submit", (evt) => {
      evt.preventDefault();

      // Ensure duration and calculated fields are updated
      updateDurationFromTimes();
      updateCalculatedFields();

      const recordIdInput = document.getElementById("record-id");
      const existingIndex = recordIdInput ? recordIdInput.value.trim() : "";
      const newRecord = readFormToRecord();

      if (existingIndex === "") {
        records.push(newRecord);
      } else {
        const idx = Number(existingIndex);
        if (!Number.isNaN(idx) && idx >= 0 && idx < records.length) {
          records[idx] = newRecord;
        } else {
          records.push(newRecord);
        }
      }

      saveToStorage();
      renderTable();
      refreshDashboard();
      clearForm();
      alert("Record saved.");
    });
  }

  // Clear form
  if (clearBtn) {
    clearBtn.addEventListener("click", () => clearForm());
  }

  // Downloads
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener("click", () => {
      downloadCsv("tesla_maintenance_records.csv", false);
    });
  }
  if (downloadGSheetBtn) {
    downloadGSheetBtn.addEventListener("click", () => {
      downloadCsv("tesla_maintenance_records_gsheets.csv", true);
    });
  }
});
