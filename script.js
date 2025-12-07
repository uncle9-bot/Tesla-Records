:root {
    --color-green: #4CAF50;         /* Stylish Green */
    --color-deep-green: #2E8B57;    /* Deep Green */
    --color-grey: #607D8B;          /* Grey */
    --color-light-grey: #f4f4f4;
    --color-text-dark: #333;
}

body {
    font-family: Arial, sans-serif;
    margin: 0;
    padding: 0;
    background-color: var(--color-light-grey);
    color: var(--color-text-dark);
}

.container {
    max-width: 768px; /* Optimized for iPhone screens */
    margin: 0 auto;
    padding: 10px;
}

/* --- Card Styles --- */
.form-card, .actions-card, .dashboard, .records-list-section {
    background: white;
    padding: 15px;
    border-radius: 12px;
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1);
    margin-bottom: 20px;
}

/* --- Dashboard Style --- */
.dashboard {
    background-color: var(--color-deep-green);
    color: white;
    font-size: 1.1em;
    padding: 15px 20px;
    font-weight: bold;
}

/* --- Form Layout (Responsive Grid) --- */
.form-row {
    display: flex;
    gap: 10px;
    margin-bottom: 5px;
}

.form-group {
    flex-grow: 1; 
    margin-bottom: 10px;
    min-width: 0; /* Ensures proper sizing in flex container */
}

.form-group label {
    display: block;
    margin-bottom: 5px;
    font-weight: bold;
    color: var(--color-deep-green);
    font-size: 0.85em;
}

.required-field label::after {
    content: " *";
    color: red;
}

.form-group input, .form-group textarea, .form-group select {
    width: 100%;
    padding: 10px;
    border: 1px solid #ccc;
    border-radius: 6px;
    box-sizing: border-box; /* Important for padding/width */
    font-size: 1em;
}

/* --- Button Styles --- */
.button-group {
    display: flex;
    gap: 10px;
    margin-top: 20px;
    flex-wrap: wrap; /* Allows buttons to stack on smaller screens */
}

.btn {
    flex-grow: 1; 
    padding: 12px 10px;
    border: none;
    border-radius: 6px;
    color: white;
    cursor: pointer;
    font-weight: bold;
    transition: background-color 0.3s;
    font-size: 1em;
}

.btn-deep-green {
    background-color: var(--color-deep-green);
}

.btn-green {
    background-color: var(--color-green);
}

.btn-grey {
    background-color: var(--color-grey);
}

/* --- Records List Table --- */
.records-list-section {
    max-height: 50vh; 
    overflow-y: auto; 
}

#records-table {
    width: 100%;
    border-collapse: collapse;
    font-size: 0.85em;
    table-layout: fixed; /* Ensures column widths are stable */
}

#records-table th, #records-table td {
    padding: 8px 5px;
    text-align: left;
    border-bottom: 1px solid #eee;
    white-space: nowrap;
    overflow: hidden;
    text-overflow: ellipsis;
}

#records-table th {
    background-color: var(--color-light-grey);
    position: sticky; 
    top: 0;
    font-weight: bold;
    color: var(--color-text-dark);
}

.amend-btn {
    background-color: #FFA500; 
    color: white;
    border: none;
    padding: 5px 8px;
    border-radius: 3px;
    cursor: pointer;
    font-size: 0.85em;
}