// Tesla Maintenance Tracker - Client-side logic
// Records are stored in browser localStorage and (optionally) seeded from initial_data.csv.

const STORAGE_KEY = "teslaMaintenanceRecords_v1";

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

// Mapping between form input IDs in index.html and data keys
const FIELD_IDS = [
  { id: "input-Date",           key: "Date" },
  { id: "input-Location",       key: "Location" },
  { id: "input-Starting Time",  key: "Starting Time" },
  { id: "input-Ending Time",    key: "Ending Time" },
  { id: "input-Duratin",        key: "Duratin" },
  { id: "input-Starting km",    key: "Starting km" },
  { id: "input-Ending km",      key: "Ending km" },
  { id: "input-km added",       key: "km added" },
  { id: "input-ClaimedkW",      key: "ClaimedkW" },
  { id: "input-Claimed Amp",    key: "Claimed Amp" },
  { id: "input-km/hr",          key: "km/hr" },
  { id: "input-kWh added",      key: "kWh added" },
  { id: "input-Fully Charged",  key: "Fully Charged" },
  { id: "input-Full km",        key: "Full km" },
  { id: "input-Charging Fee",   key: "Charging Fee" },
  { id: "input-Parking Fee",    key: "Parking Fee" },
  { id: "input-$/kW",           key: "$/kW" },
  { id: "input-$/km",           key: "$/km" },
  { id: "input-Odometer",       key: "Odometer" },
  { id: "input-Maintenance",    key: "Maintenance" },
  { id: "input-Remarks",        key: "Remarks" }
];

let records = [];

// ---- Utility: CSV parsing & building ----
function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === "\"") {
        // Double quote inside quoted field -> escaped quote
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

// ---- Storage helpers ----
function loadFromStorage() {
  try {
    const txt = localStorage.getItem(STORAGE_KEY);
    if (!txt) return [];
    const parsed = JSON.parse(txt);
    if (Array.isArray(parsed)) {
      return parsed;
    }
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

// ---- Dashboard calculations ----
function refreshDashboard() {
  const daysEl = document.getElementById("days-since-charge");
  const totalExEl = document.getElementById("total-expenditure");

  // Total Expenditures = Charging Fee + Parking Fee
  let total = 0;
  records.forEach(rec => {
    const charging = Number(rec["Charging Fee"] || 0);
    const parking = Number(rec["Parking Fee"] || 0);
    if (!Number.isNaN(charging)) total += charging;
    if (!Number.isNaN(parking)) total += parking;
  });
  totalExEl.textContent = `Total Expenditures: $${total.toFixed(2)}`;

  // Days since last fully charged
  let lastFullChargeDate = null;
  records.forEach(rec => {
    if ((rec["Fully Charged"] || "").toString().toLowerCase() === "yes") {
      const d = rec["Date"];
      if (d) {
        const dateObj = new Date(d);
        if (!isNaN(dateObj)) {
          if (!lastFullChargeDate || dateObj > lastFullChargeDate) {
            lastFullChargeDate = dateObj;
          }
        }
      }
    }
  });

  if (!lastFullChargeDate) {
    daysEl.textContent = "No. of Days of Last Fully Charged: N/A";
    return;
  }

  const today = new Date();
  const diffMs = today.setHours(0,0,0,0) - lastFullChargeDate.setHours(0,0,0,0);
  const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
  daysEl.textContent = `No. of Days of Last Fully Charged: ${diffDays} day(s)`;
}

// ---- Table rendering ----
function renderTable() {
  const container = document.getElementById("records-table-container");
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

// ---- Form helpers ----
function clearForm() {
  const form = document.getElementById("entry-form");
  form.reset();
  const recordIdInput = document.getElementById("record-id");
  recordIdInput.value = "";
  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) {
    saveBtn.textContent = "💾 Save New Entry";
  }
}

function loadRecordIntoForm(index) {
  const record = records[index];
  if (!record) return;

  FIELD_IDS.forEach(field => {
    const el = document.getElementById(field.id);
    if (el) {
      el.value = record[field.key] ?? "";
    }
  });

  const recordIdInput = document.getElementById("record-id");
  recordIdInput.value = String(index);

  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) {
    saveBtn.textContent = "💾 Save Changes";
  }
}

function readFormToRecord() {
  const record = {};
  FIELD_IDS.forEach(field => {
    const el = document.getElementById(field.id);
    if (el) {
      record[field.key] = el.value ?? "";
    } else {
      record[field.key] = "";
    }
  });
  return record;
}

// ---- Initial CSV loading (only when no saved data) ----
function tryLoadInitialCsv() {
  if (records.length > 0) {
    renderTable();
    refreshDashboard();
    return;
  }

  // On GitHub Pages this will work (same folder). On local "file://" it may fail; that's fine.
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
        // Ensure keys cover HEADERS
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
      console.info("Could not load initial_data.csv (this is fine on first use):", err);
    })
    .finally(() => {
      renderTable();
      refreshDashboard();
    });
}

// ---- Downloads ----
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

// ---- Main setup ----
document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("entry-form");
  const clearBtn = document.getElementById("clear-btn");
  const downloadCsvBtn = document.getElementById("download-csv-btn");
  const downloadGSheetBtn = document.getElementById("download-gsheet-btn");

  // Load existing data from localStorage
  records = loadFromStorage();

  if (records.length > 0) {
    renderTable();
    refreshDashboard();
  } else {
    // Try to seed from initial_data.csv
    tryLoadInitialCsv();
  }

  // Form submit handler (create or update)
  form.addEventListener("submit", (evt) => {
    evt.preventDefault();
    const recordIdInput = document.getElementById("record-id");
    const existingIndex = recordIdInput.value.trim();
    const newRecord = readFormToRecord();

    if (existingIndex === "") {
      records.push(newRecord);
    } else {
      const idx = Number(existingIndex);
      if (!Number.isNaN(idx) && idx >= 0 && idx < records.length) {
        records[idx] = newRecord;
      } else {
        // If index somehow invalid, just append
        records.push(newRecord);
      }
    }

    saveToStorage();
    renderTable();
    refreshDashboard();
    clearForm();
    alert("Record saved.");
  });

  // Clear form button
  if (clearBtn) {
    clearBtn.addEventListener("click", () => {
      clearForm();
    });
  }

  // Download buttons
  if (downloadCsvBtn) {
    downloadCsvBtn.addEventListener("click", () => {
      downloadCsv("tesla_maintenance_records.csv", false);
    });
  }
  if (downloadGSheetBtn) {
    downloadGSheetBtn.addEventListener("click", () => {
      // Same CSV but with BOM to help Excel / Google Sheets detect UTF-8
      downloadCsv("tesla_maintenance_records_gsheets.csv", true);
    });
  }
});
