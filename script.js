// Tesla Maintenance Tracker - Logic

const STORAGE_KEY = "teslaMaintenanceRecords_v3";

// Column order used for JS objects and exported CSV
const HEADERS = [
  "Date",
  "Location",
  "Starting Time",
  "Ending Time",
  "Duration",
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
  { id: "input-Duration",      key: "Duration" },
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
let validationErrors = [];

// -------- Validation --------
function validateForm() {
  validationErrors = [];
  
  const dateEl = document.getElementById("input-Date");
  const startTimeEl = document.getElementById("input-Starting Time");
  const endTimeEl = document.getElementById("input-Ending Time");
  const startKmEl = document.getElementById("input-Starting km");
  const endKmEl = document.getElementById("input-Ending km");
  const claimedKwEl = document.getElementById("input-ClaimedkW");
  const claimedAmpEl = document.getElementById("input-Claimed Amp");
  const kmHrEl = document.getElementById("input-km/hr");
  const kwhAddedEl = document.getElementById("input-kWh added");
  const chargingFeeEl = document.getElementById("input-Charging Fee");
  const parkingFeeEl = document.getElementById("input-Parking Fee");
  const odometerEl = document.getElementById("input-Odometer");
  
  if (!dateEl.value) {
    validationErrors.push("Date is required");
  }
  
  const numFields = [
    { el: startKmEl, name: "Starting km" },
    { el: endKmEl, name: "Ending km" },
    { el: claimedKwEl, name: "Claimed kW" },
    { el: claimedAmpEl, name: "Claimed Amp" },
    { el: kmHrEl, name: "km/hr" },
    { el: kwhAddedEl, name: "kWh added" },
    { el: chargingFeeEl, name: "Charging Fee" },
    { el: parkingFeeEl, name: "Parking Fee" },
    { el: odometerEl, name: "Odometer" }
  ];
  
  numFields.forEach(field => {
    if (field.el && field.el.value !== "") {
      const num = parseFloat(field.el.value);
      if (isNaN(num) || num < 0) {
        validationErrors.push(`${field.name} cannot be negative or invalid`);
      }
    }
  });
  
  if (startTimeEl.value && endTimeEl.value) {
    if (endTimeEl.value <= startTimeEl.value) {
      validationErrors.push("Ending time must be after starting time");
    }
  }
  
  return validationErrors.length === 0;
}

function showValidationErrors() {
  if (validationErrors.length === 0) return;
  alert("Validation errors:\n\n" + validationErrors.join("\n"));
}

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

// -------- Try load bundled initial CSV (if no stored records) --------
async function tryLoadInitialCsv() {
  if (records && records.length > 0) return false;
  try {
    const resp = await fetch("initial_data.csv");
    if (!resp.ok) return false;
    const txt = await resp.text();
    const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
    if (lines.length < 2) return false;
    // assume first line is header
    const hdr = parseCsvLine(lines[0]);
    const newRecs = [];
    for (let i = 1; i < lines.length; i++) {
      try {
        const cols = parseCsvLine(lines[i]);
        const rec = {};
        // map header columns to values
        for (let j = 0; j < hdr.length; j++) {
          const key = hdr[j] || HEADERS[j] || (`col${j}`);
          rec[key] = cols[j] ?? "";
        }
        newRecs.push(rec);
      } catch (e) {
        // skip malformed row
        console.warn("Skipping malformed CSV row", i, e);
      }
    }
    if (newRecs.length > 0) {
      records = newRecs.concat(records);
      saveToStorage();
      return true;
    }
  } catch (e) {
    // fetch may fail on file:// or network; that's okay
    console.warn("Could not load initial_data.csv:", e);
  }
  return false;
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

  table.appendChild(tbody);
  container.appendChild(table);
}

// -------- Form event listeners --------
document.addEventListener("DOMContentLoaded", async function() {
  // Load initial data
  records = loadFromStorage();
  // If no stored records, try to load bundled initial_data.csv (best-effort)
  if (!records || records.length === 0) {
    await tryLoadInitialCsv();
  }
  renderTable();
  refreshDashboard();

  // Form submission with validation
  const form = document.getElementById("entry-form");
  if (form) {
    form.addEventListener("submit", function(e) {
      e.preventDefault();
      if (!validateForm()) {
        showValidationErrors();
        return;
      }
      try {
        saveRecord();
        alert("✓ Record saved successfully!");
        clearForm();
        renderTable();
        refreshDashboard();
      } catch (error) {
        alert("✗ Error saving record: " + error.message);
      }
    });
  }

  // Clear button
  const clearBtn = document.getElementById("clear-btn");
  if (clearBtn) {
    clearBtn.addEventListener("click", function() {
      clearForm();
      document.getElementById("record-id").value = "";
    });
  }

  // CSV download
  const csvBtn = document.getElementById("download-csv-btn");
  if (csvBtn) {
    csvBtn.addEventListener("click", function() {
      try {
        const csv = buildCsv(records);
        downloadFile(csv, "tesla-maintenance.csv", "text/csv");
        alert("✓ CSV downloaded successfully!");
      } catch (error) {
        alert("✗ Error downloading CSV: " + error.message);
      }
    });
  }

  // Google Sheets download
  const gsheetsBtn = document.getElementById("download-gsheet-btn");
  if (gsheetsBtn) {
    gsheetsBtn.addEventListener("click", function() {
      try {
        const csv = buildCsv(records);
        downloadFile(csv, "tesla-maintenance-gsheet.csv", "text/csv");
        alert("✓ Google Sheets CSV downloaded successfully!");
      } catch (error) {
        alert("✗ Error downloading file: " + error.message);
      }
    });
  }

  // Auto-calculate duration
  const startTimeEl = document.getElementById("input-Starting Time");
  const endTimeEl = document.getElementById("input-Ending Time");
  const durationEl = document.getElementById("input-Duration");
  if (startTimeEl && endTimeEl && durationEl) {
    [startTimeEl, endTimeEl].forEach(el => {
      el.addEventListener("change", calculateDuration);
    });
  }

  // Auto-calculate km added
  const startKmEl = document.getElementById("input-Starting km");
  const endKmEl = document.getElementById("input-Ending km");
  const kmAddedEl = document.getElementById("input-km added");
  if (startKmEl && endKmEl && kmAddedEl) {
    [startKmEl, endKmEl].forEach(el => {
      el.addEventListener("change", calculateKmAdded);
    });
  }

  // Auto-calculate costs
  const costFields = [
    "input-Charging Fee", "input-Parking Fee", 
    "input-kWh added", "input-km added"
  ];
  costFields.forEach(id => {
    const el = document.getElementById(id);
    if (el) {
      el.addEventListener("change", calculateCosts);
    }
  });

  // Import CSV UI handling
  const importInput = document.getElementById("import-csv-input");
  const importBtn = document.getElementById("import-csv-btn");
  if (importBtn && importInput) {
    importBtn.addEventListener("click", async function() {
      const file = importInput.files && importInput.files[0];
      if (!file) {
        alert("Please select a CSV file to import.");
        return;
      }
      try {
        const imported = await importCsvFile(file);
        if (imported.length === 0) {
          alert("No valid rows found in CSV.");
          return;
        }
        // Prepend imported rows so they appear first (you can change ordering if desired)
        records = imported.concat(records);
        saveToStorage();
        renderTable();
        refreshDashboard();
        alert(`Imported ${imported.length} rows successfully.`);
      } catch (err) {
        console.error(err);
        alert("Failed to import CSV: " + err.message);
      }
    });
  }
});

function calculateDuration() {
  const startEl = document.getElementById("input-Starting Time");
  const endEl = document.getElementById("input-Ending Time");
  const durationEl = document.getElementById("input-Duration");
  
  if (!startEl.value || !endEl.value) {
    durationEl.value = "";
    return;
  }
  
  const [sHour, sMin] = startEl.value.split(":").map(Number);
  const [eHour, eMin] = endEl.value.split(":").map(Number);
  
  let sMinutes = sHour * 60 + sMin;
  let eMinutes = eHour * 60 + eMin;
  
  if (eMinutes <= sMinutes) {
    eMinutes += 24 * 60; // Next day
  }
  
  const diffMinutes = eMinutes - sMinutes;
  const hours = Math.floor(diffMinutes / 60);
  const mins = diffMinutes % 60;
  
  durationEl.value = String(hours).padStart(2, "0") + ":" + String(mins).padStart(2, "0") + ":00";
}

function calculateKmAdded() {
  const startEl = document.getElementById("input-Starting km");
  const endEl = document.getElementById("input-Ending km");
  const kmAddedEl = document.getElementById("input-km added");
  
  if (!startEl.value || !endEl.value) {
    kmAddedEl.value = "";
    return;
  }
  
  const start = parseFloat(startEl.value);
  const end = parseFloat(endEl.value);
  
  if (!isNaN(start) && !isNaN(end)) {
    kmAddedEl.value = (end - start).toFixed(2);
  }
}

function calculateCosts() {
  const chargingEl = document.getElementById("input-Charging Fee");
  const parkingEl = document.getElementById("input-Parking Fee");
  const kwhEl = document.getElementById("input-kWh added");
  const kmEl = document.getElementById("input-km added");
  const costKwEl = document.getElementById("input-$/kW");
  const costKmEl = document.getElementById("input-$/km");
  
  const charging = parseMoney(chargingEl.value) + parseMoney(parkingEl.value);
  const kwh = parseFloat(kwhEl.value) || 0;
  const km = parseFloat(kmEl.value) || 0;
  
  if (kwh > 0 && charging > 0) {
    costKwEl.value = (charging / kwh).toFixed(4);
  } else {
    costKwEl.value = "";
  }
  
  if (km > 0 && charging > 0) {
    costKmEl.value = (charging / km).toFixed(4);
  } else {
    costKmEl.value = "";
  }
}

function clearForm() {
  const form = document.getElementById("entry-form");
  if (form) {
    form.reset();
    document.getElementById("record-id").value = "";
    document.getElementById("input-Duration").value = "";
    document.getElementById("input-km added").value = "";
    document.getElementById("input-$/kW").value = "";
    document.getElementById("input-$/km").value = "";
  }
}

function loadRecordIntoForm(idx) {
  const rec = records[idx];
  if (!rec) return;
  
  document.getElementById("record-id").value = idx;
  FIELD_IDS.forEach(field => {
    const el = document.getElementById(field.id);
    if (el) {
      if (el.type === "checkbox") {
        const val = (rec[field.key] || "").toString().toLowerCase();
        el.checked = val === "yes" || val === "y" || val === "true" || val === "✓";
      } else {
        el.value = rec[field.key] || "";
      }
    }
  });
  
  document.getElementById("save-btn").textContent = "💾 Update Entry";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function saveRecord() {
  const recordId = document.getElementById("record-id").value;
  const rec = {};
  
  FIELD_IDS.forEach(field => {
    const el = document.getElementById(field.id);
    if (el) {
      if (el.type === "checkbox") {
        rec[field.key] = el.checked ? "yes" : "";
      } else {
        rec[field.key] = el.value;
      }
    }
  });
  
  if (recordId) {
    records[parseInt(recordId)] = rec;
    document.getElementById("save-btn").textContent = "💾 Save New Entry";
  } else {
    records.push(rec);
  }
  
  saveToStorage();
}

function downloadFile(content, filename, type) {
  const blob = new Blob([content], { type: type });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

// -------- CSV import from user file (File input) --------
function parseCsvTextToRecords(txt) {
  const lines = txt.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  if (lines.length < 1) return [];
  const hdr = parseCsvLine(lines[0]);
  const parsed = [];
  for (let i = 1; i < lines.length; i++) {
    try {
      const cols = parseCsvLine(lines[i]);
      const rec = {};
      for (let j = 0; j < hdr.length; j++) {
        const key = hdr[j] || HEADERS[j] || (`col${j}`);
        rec[key] = cols[j] ?? "";
      }
      parsed.push(rec);
    } catch (e) {
      console.warn("Skipping malformed CSV row", i, e);
    }
  }
  return parsed;
}

function importCsvFile(file) {
  return new Promise((resolve, reject) => {
    if (!file) return resolve([]);
    const reader = new FileReader();
    reader.onload = function(e) {
      try {
        const txt = e.target.result;
        const recs = parseCsvTextToRecords(txt);
        resolve(recs);
      } catch (err) {
        reject(err);
      }
    };
    reader.onerror = function(e) {
      reject(new Error("Failed to read file"));
    };
    reader.readAsText(file);
  });
}
