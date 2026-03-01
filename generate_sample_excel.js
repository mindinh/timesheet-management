const XLSX = require('xlsx');

const data = [
    { B: 'Date', C: 'Type', D: 'Description', E: 'Location', F: 'Hours', G: 'Project', H: 'Note' },
    { B: '2026-02-01', C: 'Papierkram', D: 'Requirement Gathering', E: 'Remote', F: 8, G: 'S4HANA Implementation', H: 'Kickoff' },
    { B: '2026-02-02', C: 'Papierkram', D: 'System Design', E: 'Office', F: 8, G: 'S4HANA Implementation', H: '' },
    { B: '2026-02-03', C: 'Internal', D: 'Team Meeting & Training', E: 'Office', F: 4.5, G: 'Internal Support', H: '' },
    { B: '2026-02-04', C: 'Papierkram', D: 'Development sprint 1', E: 'Remote', F: 8, G: 'S4HANA Implementation', H: '' },
    { B: '2026-02-05', C: 'Papierkram', D: 'Testing phase', E: 'Remote', F: 6, G: 'S4HANA Implementation', H: 'Needs review' },
    { B: '2026-02-06', C: 'Internal', D: 'Admin tasks', E: 'Office', F: 2, G: 'Internal Support', H: '' },
    { B: '2026-02-09', C: 'Papierkram', D: 'Bug fixing', E: 'Remote', F: 8, G: 'S4HANA Implementation', H: '' },
    { B: '2026-02-10', C: 'Papierkram', D: 'Deployment prep', E: 'Office', F: 7.5, G: 'S4HANA Implementation', H: '' }
];

const ws = XLSX.utils.json_to_sheet(data, { skipHeader: true });
const wb = XLSX.utils.book_new();
XLSX.utils.book_append_sheet(wb, ws, "TimesheetData");
XLSX.writeFile(wb, "Admin_Test_Timesheets.xlsx");
console.log("Successfully created Admin_Test_Timesheets.xlsx in the project root.");
