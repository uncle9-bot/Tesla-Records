// Tesla Maintenance Tracker - Logic (fixed dashboard + duration)

const STORAGE_KEY = "teslaMaintenanceRecords_v2"; // same key as before

// Column order used for table and CSV
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

// -------- CSV helpers --------
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

function parseCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length === 0) return [];

  const headerCols = parseCsvLine(lines[0]);
  const data = [];

  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    const row = {};
    headerCols.forEach((colName, idx) => {
      row[colName] = cols[idx] !== undefined ? cols[idx] : "";
    });
    data.push(row);
  }
  return data;
}

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

// -------- Utility: money parsing --------
function parseMoney(value) {
  if (value === null || value === undefined) return 0;
  const s = String(value).trim();
  if (s === "") return 0;

  // Remove everything except digits, decimal and minus sign
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

// -------- Dashboard --------
function refreshDashboard() {
  // Be tolerant to small ID differences
  const daysEl =
    document.getElementById("days-since-charge") ||
    document.getElementById("days-since-charged");

  const totalExEl =
    document.getElementById("total-expenditure") ||
    document.getElementById("total-expenditures");

  if (!daysEl && !totalExEl) return;

  // 1) Total Expenditures = Charging Fee + Parking Fee
  let total = 0;
  records.forEach(rec => {
    const charging = parseMoney(rec["Charging Fee"]);
    const parking = parseMoney(rec["Parking Fee"]);
    total += charging + parking;
  });

  if (totalExEl) {
    totalExEl.textContent = `Total Expenditures: $${total.toFixed(2)}`;
  }

  // 2) Days since last fully charged
  let lastFullChargeDate = null;
  records.forEach(rec => {
    const fc = (rec["Fully Charged"] || "").toString().toLowerCase().trim();
    if (fc === "yes" || fc === "y") {
      const d = rec["Date"];
      if (!d) return;

      // Prefer ISO-like dates (YYYY-MM-DD). If not, Date() will still try.
      const dateObj = new Date(d);
      if (!isNaN(dateObj)) {
        if (!lastFullChargeDate || dateObj > lastFullChargeDate) {
          lastFullChargeDate = dateObj;
        }
      }
    }
  });

  if (!daysEl) return;

  if (!lastFullChargeDate) {
    daysEl.textContent = "No. of Days of Last Fully Charged: N/A";
    return;
  }

  const today = new Date();
  const startToday = new Date(today.getFullYear(), today.getMonth(), today.getDate());
  const last = new Date(
    lastFullChargeDate.getFullYear(),
    lastFullChargeDate.getMonth(),
    lastFullChargeDate.getDate()
  );
  let diffMs = startToday - last;
  let diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

  // Protect against future dates or negative values
  if (diffDays < 0) diffDays = 0;

  if (diffDays === 0) {
    daysEl.textContent = "No. of Days of Last Fully Charged: Today";
  } else {
    daysEl.textContent = `No. of Days of Last Fully Charged: ${diffDays} day(s)`;
  }
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

function loadRecordIntoForm(index) {
  const record = records[index];
  if (!record) return;

  FIELD_IDS.forEach(field => {
    const el = document.getElementById(field.id);
    if (el) el.value = record[field.key] ?? "";
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
    record[field.key] = el ? el.value ?? "" : "";
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

  // Handle overnight charging
  if (endMinutes < startMinutes) {
    endMinutes += 24 * 60;
  }

  const diff = endMinutes - startMinutes;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;

  durEl.value = `${hours}:${mins.toString().padStart(2, "0")}`;
}

// -------- Initial CSV loading --------
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
      const parsedRows = parseCsv(text);
      if (parsedRows && parsedRows.length > 0) {
        records = parsedRows.map(row => {
          const normalized = {};
          HEADERS.forEach(h => {
            normalized[h] = row[h] !== undefined ? row[h] : "";
          });
          return normalized;
        });
        saveToStorage();
      }
    })
    .catch(err => {
      console.info("Could not load initial_data.csv (first use is fine):", err);
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

  // Update Duration when times change
  if (startTimeEl) {
    startTimeEl.addEventListener("change", updateDurationFromTimes);
    startTimeEl.addEventListener("input", updateDurationFromTimes);
  }
  if (endTimeEl) {
    endTimeEl.addEventListener("change", updateDurationFromTimes);
    endTimeEl.addEventListener("input", updateDurationFromTimes);
  }

  // Form submit
  if (form) {
    form.addEventListener("submit", (evt) => {
      evt.preventDefault();

      // Ensure Duration is up to date before saving
      updateDurationFromTimes();

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
