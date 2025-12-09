// script.js

// --- Configuration ---
const STORAGE_KEY = 'maintenance_records';
const INITIAL_DATA_FILE = 'initial_data.csv';

// All 21 column headers, stripped of whitespace
const HEADERS = [
    'Date', 'Location', 'Starting Time', 'Ending Time', 'Duratin', 'Starting km', 'Ending km', 
    'km added', 'ClaimedkW', 'Claimed Amp', 'km/hr', 'kWh added', 'Fully Charged', 'Full km', 
    'Charging Fee', 'Parking Fee', '$/kW', '$/km', 'Odometer', 'Maintenance', 'Remarks'
];

let maintenanceRecords = []; // Global array to hold the current data

// --- DOM Element References ---
const form = document.getElementById('entry-form');
const recordIdInput = document.getElementById('record-id');
const recordsContainer = document.getElementById('records-table-container');
const saveButton = document.getElementById('save-btn');
const clearButton = document.getElementById('clear-btn');

// --- Helper Functions ---

/** Converts CSV text to an array of JavaScript objects */
function csvToRecords(csv) {
    const lines = csv.split('\n').filter(line => line.trim() !== '');
    const data = [];

    // Check if the CSV is empty or only has a header
    if (lines.length < 2) return data; 

    // Assuming the first line is the header, which we use the hardcoded HEADERS array to match
    
    for (let i = 1; i < lines.length; i++) {
        // Simple split might fail if data contains commas, but it's the simplest approach for GitHub Pages.
        const currentline = lines[i].split(',');
        const record = {};
        
        // Ensure we don't go out of bounds of HEADERS
        for (let j = 0; j < HEADERS.length; j++) {
            let value = (currentline[j] || '').trim().replace(/^"|"$/g, '').replace(/""/g, '"'); // Basic quote stripping
            
            // Clean up currency symbols/commas when parsing for consistency
            if (HEADERS[j] === 'Charging Fee' || HEADERS[j] === 'Parking Fee') {
                 value = value.replace(/[\$,]/g, '');
            }
            
            record[HEADERS[j]] = value === '' ? null : value; 
        }
        
        record.id = Date.now() + i + Math.random(); 
        data.push(record);
    }
    return data;
}

/** Loads data from localStorage or fetches and initializes with initial_data.csv */
async function loadRecords() {
    const stored = localStorage.getItem(STORAGE_KEY);
    
    if (stored) {
        maintenanceRecords = JSON.parse(stored);
    } else {
        // --- INITIAL LOAD LOGIC ---
        try {
            const response = await fetch(INITIAL_DATA_FILE);
            if (!response.ok) throw new Error(`Could not fetch ${INITIAL_DATA_FILE}`);
            
            const csvText = await response.text();
            maintenanceRecords = csvToRecords(csvText);
            saveRecords(); // Save initial data to localStorage
            console.log("Initial data loaded from CSV.");
        } catch (error) {
            console.error("Error loading initial data:", error);
            // Fallback: If CSV fails, start empty
            maintenanceRecords = [];
        }
    }
    
    displayRecords();
    updateDashboard();
}

/** Saves the current array to localStorage */
function saveRecords() {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(maintenanceRecords));
}

/** Clears the form for a new entry */
function clearForm() {
    form.reset();
    recordIdInput.value = ''; // Clear the hidden ID
    
    // Set today's date
    const today = new Date().toISOString().split('T')[0];
    document.getElementById('input-Date').value = today; 
    
    saveButton.textContent = '💾 Save New Entry';
    // Scroll to the top of the form
    window.scrollTo({ top: 0, behavior: 'smooth' });
}

/** Populates the form fields to amend an existing record */
window.amendRecord = function(id) {
    const record = maintenanceRecords.find(r => r.id === id);
    if (!record) return;

    // Populate all fields dynamically
    HEADERS.forEach(header => {
        const input = document.getElementById(`input-${header}`);
        if (input && record[header] !== null) {
            let value = record[header];
            
            if (input.type === 'number') {
                // Ensure number inputs handle the cleaned float value or empty string
                input.value = parseFloat(value) || '';
            } else {
                input.value = value;
            }
        } else if (input) {
            input.value = ''; // Clear if the record value is null
        }
    });

    recordIdInput.value = record.id;
    saveButton.textContent = '📝 Update & Rewrite Record';
    window.scrollTo({ top: 0, behavior: 'smooth' }); // Scroll to the form
}

/** Displays all records in a scrollable table with all columns */
function displayRecords() {
    // Sort by Date descending (newest first)
    maintenanceRecords.sort((a, b) => {
        const dateA = new Date(a.Date);
        const dateB = new Date(b.Date);
        return isNaN(dateA) || isNaN(dateB) ? 0 : dateB - dateA;
    });
    
    recordsContainer.innerHTML = '';

    if (maintenanceRecords.length === 0) {
        recordsContainer.innerHTML = '<p style="text-align: center; color: #666;">No records found. Start adding entries!</p>';
        return;
    }
    
    let html = '<table id="records-table"><thead><tr>';
    
    // 1. HEADER ROW: All 21 headers + Action
    HEADERS.forEach(h => html += `<th>${h}</th>`);
    html += `<th>Action</th>`; // Add the action column header
    html += '</tr></thead><tbody>';

    // 2. DATA ROWS
    maintenanceRecords.forEach(record => {
        html += `<tr>`;
        
        // Iterate over ALL HEADERS for the data
        HEADERS.forEach(header => {
            let cellContent = record[header] ?? '';
            
            // Format Fee columns for display
            if (header === 'Charging Fee' || header === 'Parking Fee') {
                const fee = parseFloat(cellContent) || 0;
                cellContent = `$${fee.toFixed(2)}`;
            }

            html += `<td>${cellContent}</td>`;
        });
        
        // Action Button Column
        html += `<td style="text-align: center;"><button class="amend-btn" onclick="amendRecord(${record.id})">Amend</button></td>`;
        html += `</tr>`;
    });

    html += '</tbody></table>';
    recordsContainer.innerHTML = html;
}

/** Calculates dashboard figures (Days Since Charge, Total Expenditure) */
function updateDashboard() {
    let totalCost = 0;
    let lastChargeDate = null;
    
    // Calculate total cost and find the last 'Fully Charged' date
    maintenanceRecords.forEach(record => {
        // Expenditure: sum of Charging Fee and Parking Fee
        const chargingFee = parseFloat(record['Charging Fee']) || 0;
        const parkingFee = parseFloat(record['Parking Fee']) || 0;
        totalCost += chargingFee + parkingFee;

        // Days Since Last Charge
        if (record['Fully Charged'] && record['Fully Charged'].toLowerCase() === 'yes' && record.Date) {
            const currentDate = new Date(record.Date);
            if (!lastChargeDate || currentDate > lastChargeDate) {
                lastChargeDate = currentDate;
            }
        }
    });

    // Update Total Expenditure
    document.getElementById('total-expenditure').textContent = `Total Expenditures: $${totalCost.toFixed(2)}`;

    // Calculate Days Since Last Charge
    const daysElement = document.getElementById('days-since-charge');
    if (lastChargeDate) {
        const today = new Date();
        const diffTime = Math.abs(today - lastChargeDate);
        const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24)); 
        daysElement.textContent = `No. of Days of Last Fully Charged: ${diffDays} days`;
    } else {
        daysElement.textContent = `No. of Days of Last Fully Charged: N/A (No 'Yes' entry)`;
    }
}

// --- Event Handlers ---

/** Handles form submission (Save or Update) */
form.addEventListener('submit', (e) => {
    e.preventDefault();

    const isAmending = !!recordIdInput.value;
    const newRecord = {};

    // Collect all data from the form inputs
    HEADERS.forEach(header => {
        const input = document.getElementById(`input-${header}`);
        if (input) {
            let value = input.value.trim();
            // Store numeric values as strings of numbers (or null)
            if (input.type === 'number') {
                newRecord[header] = value === '' ? null : parseFloat(value).toString();
            } else {
                newRecord[header] = value === '' ? null : value;
            }
        } else {
            newRecord[header] = null;
        }
    });

    if (isAmending) {
        // UPDATE/AMEND LOGIC
        const idToUpdate = parseFloat(recordIdInput.value);
        const index = maintenanceRecords.findIndex(r => r.id === idToUpdate);
        
        if (index > -1) {
            // Merge existing record data with new form data
            maintenanceRecords[index] = { ...maintenanceRecords[index], ...newRecord, id: idToUpdate };
        }
    } else {
        // NEW SAVE LOGIC
        newRecord.id = Date.now() + Math.random(); 
        maintenanceRecords.push(newRecord);
    }

    saveRecords();
    clearForm();
    displayRecords();
    updateDashboard();
    alert(isAmending ? 'Record Updated Successfully and Rewritten!' : 'New Record Saved Successfully!');
});

/** Event listener for the clear/new button */
clearButton.addEventListener('click', clearForm);

/** CSV Download Functionality */
function downloadCSV() {
    if (maintenanceRecords.length === 0) {
        alert("No records to download.");
        return;
    }

    // Include the original headers from the file for compatibility
    let csvContent = HEADERS.join(',') + '\n';
    
    maintenanceRecords.forEach(record => {
        const row = HEADERS.map(header => {
            let value = record[header] || '';
            
            // Ensure commas and quotes in data fields are escaped for proper CSV formatting
            if (typeof value === 'string' && (value.includes(',') || value.includes('"') || value.includes('\n'))) {
                value = `"${value.replace(/"/g, '""')}"`;
            }
            return value;
        }).join(',');
        csvContent += row + '\n';
    });

    // Trigger download
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', 'maintenance_records_' + new Date().toISOString().slice(0, 10) + '.csv');
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
}

document.getElementById('download-csv-btn').addEventListener('click', downloadCSV);
document.getElementById('download-gsheet-btn').addEventListener('click', downloadCSV);

// --- Initialize App ---
loadRecords(); 
clearForm();
