// Tesla Maintenance Tracker - JavaScript

const STORAGE_KEY = "teslaMaintenanceRecords_v3";

// Column order used for objects and exported CSV.
// Must match the columns in initial_data.csv.
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

// ---------------- CSV helpers ----------------

function parseCsvLine(line) {
  const result = [];
  let current = "";
  let inQuotes = false;

  for (let i = 0; i < line.length; i++) {
    const ch = line[i];

    if (inQuotes) {
      if (ch === '"') {
        if (i + 1 < line.length && line[i + 1] === '"') {
          current += '"';
          i++;
        } else {
          inQuotes = false;
        }
      } else {
        current += ch;
      }
    } else {
      if (ch === '"') {
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

// ---------------- Storage ----------------

function loadFromStorage() {
  try {
    const txt = localStorage.getItem(STORAGE_KEY);
    if (!txt) return [];
    const parsed = JSON.parse(txt);
    return Array.isArray(parsed) ? parsed : [];
  } catch (e) {
    console.warn("Failed to parse stored data", e);
    return [];
  }
}

function saveToStorage() {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(records));
  } catch (e) {
    console.warn("Failed to save data", e);
  }
}

// ---------------- Money & dashboard ----------------

function parseMoney(value) {
  if (value === null || value === undefined) return 0;
  const s = String(value).trim();
  if (s === "") return 0;
  const cleaned = s.replace(/[^0-9.\-]/g, "");
  const num = parseFloat(cleaned);
  return isNaN(num) ? 0 : num;
}

function refreshDashboard() {
  const daysEl =
    document.getElementById("days-since-charge") ||
    document.getElementById("days-since-charged");
  const totalEl =
    document.getElementById("total-expenditure") ||
    document.getElementById("total-expenditures");

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

  if (totalEl) {
    totalEl.textContent = `Total Expenditures: $${total.toFixed(2)}`;
  }

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

  daysEl.textContent =
    "No. of Days of Last Fully Charged: " + diffDays + " day(s)";
}

// ---------------- Table rendering ----------------

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

// ---------------- Form helpers ----------------

function clearForm() {
  const form = document.getElementById("entry-form");
  if (form) form.reset();

  const recordIdInput = document.getElementById("record-id");
  if (recordIdInput) recordIdInput.value = "";

  const saveBtn = document.getElementById("save-btn");
  if (saveBtn) saveBtn.textContent = "💾 Save New Entry";

  updateFullKmEnabled();
}

function isTruthyYes(value) {
  if (value === null || value === undefined) return false;
  const s = String(value).trim().toLowerCase();
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

  updateFullKmEnabled();
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

// ---------------- Calculations ----------------

function calculateDuration() {
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

  let startMin = sh * 60 + sm;
  let endMin = eh * 60 + em;

  if (endMin < startMin) {
    endMin += 24 * 60;
  }

  const diff = endMin - startMin;
  const hours = Math.floor(diff / 60);
  const mins = diff % 60;
  durEl.value = hours + ":" + String(mins).padStart(2, "0") + ":00";
}

function calculateKmAdded() {
  const startKmEl = document.getElementById("input-Starting km");
  const endKmEl = document.getElementById("input-Ending km");
  const kmAddedEl = document.getElementById("input-km added");
  if (!startKmEl || !endKmEl || !kmAddedEl) return;

  const startKm = parseFloat(startKmEl.value);
  const endKm = parseFloat(endKmEl.value);

  if (isNaN(startKm) || isNaN(endKm)) {
    kmAddedEl.value = "";
    return;
  }

  const diff = endKm - startKm;
  kmAddedEl.value = diff.toFixed(2);
}

function calculateCosts() {
  const chargingEl = document.getElementById("input-Charging Fee");
  const parkingEl = document.getElementById("input-Parking Fee");
  const kwhEl = document.getElementById("input-kWh added");
  const kmAddedEl = document.getElementById("input-km added");
  const costKwEl = document.getElementById("input-$/kW");
  const costKmEl = document.getElementById("input-$/km");

  if (!chargingEl || !parkingEl || !kwhEl || !kmAddedEl || !costKwEl || !costKmEl) {
    return;
  }

  const charging = parseMoney(chargingEl.value);
  const parking = parseMoney(parkingEl.value);
  const total = charging + parking;

  const kwh = parseFloat(kwhEl.value);
  if (!isNaN(kwh) && kwh !== 0) {
    costKwEl.value = (total / kwh).toFixed(2);
  } else {
    costKwEl.value = "";
  }

  const kmAdded = parseFloat(kmAddedEl.value);
  if (!isNaN(kmAdded) && kmAdded !== 0) {
    costKmEl.value = (total / kmAdded).toFixed(4);
  } else {
    costKmEl.value = "";
  }
}

// Enable/disable Full km based on Fully Charged
function updateFullKmEnabled() {
  const fcEl = document.getElementById("input-Fully Charged");
  const fullKmEl = document.getElementById("input-Full km");
  if (!fcEl || !fullKmEl) return;

  if (fcEl.checked) {
    fullKmEl.disabled = false;
  } else {
    fullKmEl.disabled = true;
    fullKmEl.value = "";
  }
}

// ---------------- Initial CSV loading ----------------

function parseInitialCsv(text) {
  const lines = text.split(/\r?\n/).filter(l => l.trim() !== "");
  if (lines.length === 0) return [];

  // Skip header row (first line)
  const out = [];
  for (let i = 1; i < lines.length; i++) {
    const cols = parseCsvLine(lines[i]);
    if (cols.length === 0 || !cols[0]) continue;

    const rec = {};
    for (let c = 0; c < HEADERS.length; c++) {
      rec[HEADERS[c]] = cols[c] !== undefined ? cols[c] : "";
    }
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
      if (!resp.ok) throw new Error("HTTP error " + resp.status);
      return resp.text();
    })
    .then(text => {
      const parsed = parseInitialCsv(text);
      if (parsed && parsed.length > 0) {
        records = parsed;
        saveToStorage();
      }
    })
    .catch(err => {
      console.info("Could not load initial_data.csv:", err);
    })
    .finally(() => {
      renderTable();
      refreshDashboard();
    });
}

// ---------------- Downloads ----------------

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

// ---------------- Main setup ----------------

document.addEventListener("DOMContentLoaded", () => {
  const form = document.getElementById("entry-form");
  const clearBtn = document.getElementById("clear-btn");
  const downloadCsvBtn = document.getElementById("download-csv-btn");
  const downloadGSheetBtn = document.getElementById("download-gsheet-btn");

  // Load existing records
  records = loadFromStorage();
  if (records.length > 0) {
    renderTable();
    refreshDashboard();
  } else {
    tryLoadInitialCsv();
  }

  // Auto-calculations
  const startTimeEl = document.getElementById("input-Starting Time");
  const endTimeEl = document.getElementById("input-Ending Time");
  if (startTimeEl) {
    startTimeEl.addEventListener("change", calculateDuration);
    startTimeEl.addEventListener("input", calculateDuration);
  }
  if (endTimeEl) {
    endTimeEl.addEventListener("change", calculateDuration);
    endTimeEl.addEventListener("input", calculateDuration);
  }

  const startKmEl = document.getElementById("input-Starting km");
  const endKmEl = document.getElementById("input-Ending km");
  if (startKmEl) {
    startKmEl.addEventListener("input", () => {
      calculateKmAdded();
      calculateCosts();
    });
  }
  if (endKmEl) {
    endKmEl.addEventListener("input", () => {
      calculateKmAdded();
      calculateCosts();
    });
  }

  const chargingEl = document.getElementById("input-Charging Fee");
  const parkingEl = document.getElementById("input-Parking Fee");
  const kwhEl = document.getElementById("input-kWh added");
  [chargingEl, parkingEl, kwhEl].forEach(el => {
    if (el) {
      el.addEventListener("input", calculateCosts);
      el.addEventListener("change", calculateCosts);
    }
  });

  // Fully Charged → enable/disable Full km
  const fcEl = document.getElementById("input-Fully Charged");
  if (fcEl) {
    fcEl.addEventListener("change", updateFullKmEnabled);
    fcEl.addEventListener("input", updateFullKmEnabled);
    updateFullKmEnabled(); // initial state
  }

  // Form submit
  if (form) {
    form.addEventListener("submit", e => {
      e.preventDefault();

      calculateDuration();
      calculateKmAdded();
      calculateCosts();
      updateFullKmEnabled();

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

  // Clear form button
  if (clearBtn) {
    clearBtn.addEventListener("click", () => clearForm());
  }

  // Download buttons
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
