const xlsx = require('xlsx');
const path = require('path');
const fs = require('fs');
const { v4: uuidv4 } = require('uuid');

// ─── Generate real UUIDs for referential integrity ───────────────────────────

// Batches
const batch1Id = uuidv4();
const batch2Id = uuidv4();

// ─── 1. Users (enough employees to fill 7-10 timesheets per batch) ───────────
const users = [
    { email: 'diana@example.com', firstName: 'Diana', lastName: 'Pham', role: 'Admin', isActive: true, manager_email: '' },
    { email: 'manager@conarum.com', firstName: 'Minh', lastName: 'Tran', role: 'Manager', isActive: true, manager_email: '' },
    // Team 1 - lead1
    { email: 'lead1@conarum.com', firstName: 'Bob', lastName: 'Tran', role: 'TeamLead', isActive: true, manager_email: 'manager@conarum.com' },
    { email: 'alice@conarum.com', firstName: 'Alice', lastName: 'Nguyen', role: 'Employee', isActive: true, manager_email: 'lead1@conarum.com' },
    { email: 'cuong@conarum.com', firstName: 'Cuong', lastName: 'Nguyen', role: 'Employee', isActive: true, manager_email: 'lead1@conarum.com' },
    { email: 'dung@conarum.com', firstName: 'Dung', lastName: 'Pham', role: 'Employee', isActive: true, manager_email: 'lead1@conarum.com' },
    { email: 'mai@conarum.com', firstName: 'Mai', lastName: 'Le', role: 'Employee', isActive: true, manager_email: 'lead1@conarum.com' },
    { email: 'tuan@conarum.com', firstName: 'Tuan', lastName: 'Hoang', role: 'Employee', isActive: true, manager_email: 'lead1@conarum.com' },
    // Team 2 - lead2
    { email: 'lead2@conarum.com', firstName: 'Charlie', lastName: 'Le', role: 'TeamLead', isActive: true, manager_email: 'manager@conarum.com' },
    { email: 'hoa@conarum.com', firstName: 'Hoa', lastName: 'Vo', role: 'Employee', isActive: true, manager_email: 'lead2@conarum.com' },
    { email: 'nam@conarum.com', firstName: 'Nam', lastName: 'Do', role: 'Employee', isActive: true, manager_email: 'lead2@conarum.com' },
    { email: 'linh@conarum.com', firstName: 'Linh', lastName: 'Bui', role: 'Employee', isActive: true, manager_email: 'lead2@conarum.com' },
    { email: 'khoa@conarum.com', firstName: 'Khoa', lastName: 'Dao', role: 'Employee', isActive: true, manager_email: 'lead2@conarum.com' },
    { email: 'trang@conarum.com', firstName: 'Trang', lastName: 'Vu', role: 'Employee', isActive: true, manager_email: 'lead2@conarum.com' },
    { email: 'phuc@conarum.com', firstName: 'Phuc', lastName: 'Dinh', role: 'Employee', isActive: true, manager_email: 'lead2@conarum.com' },
    { email: 'an@conarum.com', firstName: 'An', lastName: 'Ngo', role: 'Employee', isActive: false, manager_email: 'lead2@conarum.com' },
];

// ─── 2. Projects ─────────────────────────────────────────────────────────────
const projects = [
    { code: 'PKR-001', name: 'Internal Admin Tasks', description: 'Daily internal company admin work', type: 'Papierkram', isActive: true, user_email: 'diana@example.com' },
    { code: 'INT-001', name: 'Product Development', description: 'Building our SaaS platform', type: 'Internal', isActive: true, user_email: 'manager@conarum.com' },
    { code: 'INT-002', name: 'DevOps Infrastructure', description: 'CI/CD and cloud infrastructure', type: 'Internal', isActive: true, user_email: 'lead1@conarum.com' },
    { code: 'EXT-001', name: 'Client Alpha Consulting', description: 'Consulting project for Alpha Corp', type: 'External', isActive: true, user_email: 'lead1@conarum.com' },
    { code: 'EXT-002', name: 'Client Beta Migration', description: 'Database migration for Beta Inc', type: 'External', isActive: true, user_email: 'lead2@conarum.com' },
    { code: 'OTH-001', name: 'Research & Innovation', description: 'R&D exploration tasks', type: 'Others', isActive: true, user_email: 'lead2@conarum.com' },
];

// ─── 3. Tasks ────────────────────────────────────────────────────────────────
const tasks = [
    { project_code: 'PKR-001', name: 'Payroll Processing', description: 'Monthly payroll', status: 'Open', startDate: '2026-01-01', endDate: '2026-12-31' },
    { project_code: 'INT-001', name: 'Frontend Development', description: 'React / TypeScript UI', status: 'InProgress', startDate: '2026-01-15', endDate: '2026-06-30' },
    { project_code: 'INT-001', name: 'Backend API', description: 'CAP Node.js services', status: 'InProgress', startDate: '2026-01-15', endDate: '2026-06-30' },
    { project_code: 'INT-001', name: 'Testing & QA', description: 'Unit and integration tests', status: 'Open', startDate: '2026-02-01', endDate: '2026-06-30' },
    { project_code: 'INT-002', name: 'Pipeline Setup', description: 'Jenkins and Docker config', status: 'Completed', startDate: '2026-01-01', endDate: '2026-02-28' },
    { project_code: 'INT-002', name: 'Monitoring', description: 'Grafana dashboards', status: 'InProgress', startDate: '2026-02-01', endDate: '2026-05-31' },
    { project_code: 'EXT-001', name: 'Requirements Gathering', description: 'Client workshops', status: 'Completed', startDate: '2026-01-01', endDate: '2026-01-31' },
    { project_code: 'EXT-001', name: 'Implementation Phase', description: 'Coding the solution', status: 'InProgress', startDate: '2026-02-01', endDate: '2026-05-31' },
    { project_code: 'EXT-002', name: 'Data Analysis', description: 'Schema mapping and planning', status: 'InProgress', startDate: '2026-02-01', endDate: '2026-04-30' },
    { project_code: 'EXT-002', name: 'Migration Scripts', description: 'ETL pipeline development', status: 'Open', startDate: '2026-03-01', endDate: '2026-06-30' },
    { project_code: 'OTH-001', name: 'AI Exploration', description: 'Exploring AI-powered features', status: 'Open', startDate: '2026-03-01', endDate: '2026-09-30' },
];

// ─── 4. TimesheetBatches ─────────────────────────────────────────────────────
const timesheetBatches = [
    { ID: batch1Id, teamLead_email: 'lead1@conarum.com', admin_email: 'diana@example.com', status: 'Pending' },
    { ID: batch2Id, teamLead_email: 'lead2@conarum.com', admin_email: 'diana@example.com', status: 'Processed' },
];

// ─── 5. Timesheets ───────────────────────────────────────────────────────────
// Batch 1 (lead1's team): 8 timesheets (5 employees x Feb approved + 3 Mar drafts)
// Batch 2 (lead2's team): 9 timesheets (7 employees x Feb finished + 2 extra)
const timesheets = [
    // ── Batch 1 (Pending) - Team 1 Feb timesheets (all Approved, in batch) ─────
    { user_email: 'alice@conarum.com', month: 2, year: 2026, status: 'Approved', submitDate: '2026-02-28T17:00:00Z', approveDate: '2026-03-01T10:00:00Z', batch_ID: batch1Id, currentApprover_email: '' },
    { user_email: 'cuong@conarum.com', month: 2, year: 2026, status: 'Approved', submitDate: '2026-02-28T18:00:00Z', approveDate: '2026-03-01T10:30:00Z', batch_ID: batch1Id, currentApprover_email: '' },
    { user_email: 'dung@conarum.com', month: 2, year: 2026, status: 'Approved', submitDate: '2026-02-27T16:00:00Z', approveDate: '2026-03-01T11:00:00Z', batch_ID: batch1Id, currentApprover_email: '' },
    { user_email: 'mai@conarum.com', month: 2, year: 2026, status: 'Approved', submitDate: '2026-02-28T09:00:00Z', approveDate: '2026-03-01T11:30:00Z', batch_ID: batch1Id, currentApprover_email: '' },
    { user_email: 'tuan@conarum.com', month: 2, year: 2026, status: 'Approved', submitDate: '2026-02-28T10:00:00Z', approveDate: '2026-03-01T12:00:00Z', batch_ID: batch1Id, currentApprover_email: '' },
    // lead1 also has own timesheet in batch
    { user_email: 'lead1@conarum.com', month: 2, year: 2026, status: 'Approved', submitDate: '2026-02-28T15:00:00Z', approveDate: '2026-03-01T09:00:00Z', batch_ID: batch1Id, currentApprover_email: '' },
    // Extra timesheets in batch1 (approved Jan timesheets added late)
    { user_email: 'alice@conarum.com', month: 1, year: 2026, status: 'Approved', submitDate: '2026-02-01T08:00:00Z', approveDate: '2026-02-02T10:00:00Z', batch_ID: batch1Id, currentApprover_email: '' },
    { user_email: 'cuong@conarum.com', month: 1, year: 2026, status: 'Approved', submitDate: '2026-02-01T09:00:00Z', approveDate: '2026-02-02T10:30:00Z', batch_ID: batch1Id, currentApprover_email: '' },

    // ── Batch 2 (Processed) - Team 2 Feb timesheets (all Finished, in batch) ───
    { user_email: 'hoa@conarum.com', month: 2, year: 2026, status: 'Finished', submitDate: '2026-02-27T16:00:00Z', approveDate: '2026-02-28T09:00:00Z', batch_ID: batch2Id, currentApprover_email: '', finishedDate: '2026-03-02T14:00:00Z' },
    { user_email: 'nam@conarum.com', month: 2, year: 2026, status: 'Finished', submitDate: '2026-02-27T17:00:00Z', approveDate: '2026-02-28T09:30:00Z', batch_ID: batch2Id, currentApprover_email: '', finishedDate: '2026-03-02T14:00:00Z' },
    { user_email: 'linh@conarum.com', month: 2, year: 2026, status: 'Finished', submitDate: '2026-02-28T08:00:00Z', approveDate: '2026-02-28T10:00:00Z', batch_ID: batch2Id, currentApprover_email: '', finishedDate: '2026-03-02T14:00:00Z' },
    { user_email: 'khoa@conarum.com', month: 2, year: 2026, status: 'Finished', submitDate: '2026-02-28T08:30:00Z', approveDate: '2026-02-28T10:30:00Z', batch_ID: batch2Id, currentApprover_email: '', finishedDate: '2026-03-02T14:00:00Z' },
    { user_email: 'trang@conarum.com', month: 2, year: 2026, status: 'Finished', submitDate: '2026-02-28T09:00:00Z', approveDate: '2026-02-28T11:00:00Z', batch_ID: batch2Id, currentApprover_email: '', finishedDate: '2026-03-02T14:00:00Z' },
    { user_email: 'phuc@conarum.com', month: 2, year: 2026, status: 'Finished', submitDate: '2026-02-28T09:30:00Z', approveDate: '2026-02-28T11:30:00Z', batch_ID: batch2Id, currentApprover_email: '', finishedDate: '2026-03-02T14:00:00Z' },
    { user_email: 'lead2@conarum.com', month: 2, year: 2026, status: 'Finished', submitDate: '2026-02-28T14:00:00Z', approveDate: '2026-02-28T15:00:00Z', batch_ID: batch2Id, currentApprover_email: '', finishedDate: '2026-03-02T14:00:00Z' },
    // Extra: Jan timesheets in batch 2
    { user_email: 'hoa@conarum.com', month: 1, year: 2026, status: 'Finished', submitDate: '2026-02-01T10:00:00Z', approveDate: '2026-02-02T08:00:00Z', batch_ID: batch2Id, currentApprover_email: '', finishedDate: '2026-03-02T14:00:00Z' },
    { user_email: 'nam@conarum.com', month: 1, year: 2026, status: 'Finished', submitDate: '2026-02-01T10:30:00Z', approveDate: '2026-02-02T08:30:00Z', batch_ID: batch2Id, currentApprover_email: '', finishedDate: '2026-03-02T14:00:00Z' },
    { user_email: 'linh@conarum.com', month: 1, year: 2026, status: 'Finished', submitDate: '2026-02-01T11:00:00Z', approveDate: '2026-02-02T09:00:00Z', batch_ID: batch2Id, currentApprover_email: '', finishedDate: '2026-03-02T14:00:00Z' },

    // ── Not in any batch (Mar 2026 - various statuses) ─────────────────────────
    { user_email: 'alice@conarum.com', month: 3, year: 2026, status: 'Draft', submitDate: '', approveDate: '', batch_ID: '', currentApprover_email: '' },
    { user_email: 'cuong@conarum.com', month: 3, year: 2026, status: 'Submitted', submitDate: '2026-03-03T18:00:00Z', approveDate: '', batch_ID: '', currentApprover_email: 'lead1@conarum.com' },
    { user_email: 'hoa@conarum.com', month: 3, year: 2026, status: 'Rejected', submitDate: '2026-03-02T08:00:00Z', approveDate: '', batch_ID: '', currentApprover_email: 'lead2@conarum.com', comment: 'Missing project hours' },
];

// ─── 6. TimesheetEntries ─────────────────────────────────────────────────────
const timesheetEntries = [];

function addEntries(userEmail, projectCode, taskName, dates, hours, descriptions, approvedHours, tsStatus) {
    for (let i = 0; i < dates.length; i++) {
        timesheetEntries.push({
            user_email: userEmail,
            project_code: projectCode,
            task_name: taskName || '',
            date: dates[i],
            loggedHours: hours[i],
            approvedHours: approvedHours ? approvedHours[i] : '',
            description: descriptions[i],
            ts_status: tsStatus,
        });
    }
}

// Helper: generate weekday dates for a month
function weekdays(year, month, count) {
    const dates = [];
    let d = new Date(year, month - 1, 1);
    while (dates.length < count) {
        if (d.getDay() !== 0 && d.getDay() !== 6) {
            dates.push(d.toISOString().split('T')[0]);
        }
        d.setDate(d.getDate() + 1);
    }
    return dates;
}

// ── Batch 1 employees - Feb 2026 (Approved) ──────────────────────────────────

// Alice - Feb
addEntries('alice@conarum.com', 'INT-001', 'Frontend Development',
    weekdays(2026, 2, 5), [8, 8, 7.5, 8, 6],
    ['Login page UI', 'Dashboard components', 'Responsive layout', 'Unit testing', 'Bug fixing'],
    [8, 8, 7.5, 8, 6], 'Approved'
);
addEntries('alice@conarum.com', 'EXT-001', 'Implementation Phase',
    ['2026-02-09', '2026-02-10', '2026-02-11'], [8, 8, 4],
    ['Client API integration', 'Data mapping', 'Code review with client'],
    [8, 8, 4], 'Approved'
);

// Cuong - Feb
addEntries('cuong@conarum.com', 'INT-001', 'Backend API',
    weekdays(2026, 2, 5), [8, 8, 8, 8, 8],
    ['User service endpoints', 'Auth middleware', 'Database schema design', 'OData integration', 'Testing'],
    [8, 8, 8, 8, 8], 'Approved'
);
addEntries('cuong@conarum.com', 'PKR-001', 'Payroll Processing',
    ['2026-02-09'], [2], ['Weekly payroll review'], [2], 'Approved'
);

// Dung - Feb
addEntries('dung@conarum.com', 'INT-001', 'Testing & QA',
    weekdays(2026, 2, 5), [8, 7, 8, 8, 6],
    ['Write test plan', 'Unit tests for auth', 'Integration tests', 'Load testing', 'Bug reports'],
    [8, 7, 8, 8, 6], 'Approved'
);

// Mai - Feb
addEntries('mai@conarum.com', 'INT-001', 'Frontend Development',
    weekdays(2026, 2, 4), [8, 8, 8, 7],
    ['Design system components', 'Form validation', 'Data tables', 'Charts and graphs'],
    [8, 8, 8, 7], 'Approved'
);
addEntries('mai@conarum.com', 'INT-002', 'Monitoring',
    ['2026-02-09', '2026-02-10'], [4, 8],
    ['Setup Grafana', 'Configure alerts'], [4, 8], 'Approved'
);

// Tuan - Feb
addEntries('tuan@conarum.com', 'INT-002', 'Pipeline Setup',
    weekdays(2026, 2, 5), [8, 8, 8, 8, 8],
    ['Jenkins setup', 'Docker config', 'Build pipeline', 'Deploy scripts', 'Documentation'],
    [8, 8, 8, 8, 8], 'Approved'
);

// Lead1 - Feb
addEntries('lead1@conarum.com', 'INT-001', 'Backend API',
    weekdays(2026, 2, 3), [4, 4, 4],
    ['Code review', 'Architecture meeting', 'Sprint planning'],
    [4, 4, 4], 'Approved'
);
addEntries('lead1@conarum.com', 'EXT-001', 'Implementation Phase',
    ['2026-02-09', '2026-02-10'], [8, 6],
    ['Client sync call', 'Technical review'], [8, 6], 'Approved'
);

// Alice - Jan (in batch 1)
addEntries('alice@conarum.com', 'INT-001', 'Frontend Development',
    weekdays(2026, 1, 5), [8, 8, 8, 7, 8],
    ['Project setup', 'Routing setup', 'Auth flow UI', 'Sidebar navigation', 'Profile page'],
    [8, 8, 8, 7, 8], 'Approved'
);

// Cuong - Jan (in batch 1)
addEntries('cuong@conarum.com', 'INT-001', 'Backend API',
    weekdays(2026, 1, 4), [8, 8, 8, 8],
    ['Project scaffolding', 'CDS schema design', 'Service layer', 'Initial testing'],
    [8, 8, 8, 8], 'Approved'
);

// ── Batch 2 employees - Feb 2026 (Finished) ──────────────────────────────────

// Hoa - Feb
addEntries('hoa@conarum.com', 'EXT-001', 'Requirements Gathering',
    ['2026-02-02', '2026-02-03'], [8, 6],
    ['Workshop day 1', 'Workshop day 2'], [8, 6], 'Finished'
);
addEntries('hoa@conarum.com', 'OTH-001', 'AI Exploration',
    ['2026-02-04', '2026-02-05', '2026-02-06'], [4, 8, 6],
    ['LLM prompt engineering', 'Prototype chatbot', 'Demo preparation'], [4, 8, 6], 'Finished'
);

// Nam - Feb
addEntries('nam@conarum.com', 'EXT-002', 'Data Analysis',
    weekdays(2026, 2, 5), [8, 8, 7, 8, 8],
    ['Schema review', 'Data profiling', 'Mapping document', 'Gap analysis', 'Validation rules'],
    [8, 8, 7, 8, 8], 'Finished'
);

// Linh - Feb
addEntries('linh@conarum.com', 'EXT-002', 'Data Analysis',
    weekdays(2026, 2, 4), [8, 8, 8, 6],
    ['Source system analysis', 'Target schema design', 'ETL planning', 'Transform logic'],
    [8, 8, 8, 6], 'Finished'
);
addEntries('linh@conarum.com', 'OTH-001', 'AI Exploration',
    ['2026-02-09'], [8],
    ['NLP research for data quality'], [8], 'Finished'
);

// Khoa - Feb
addEntries('khoa@conarum.com', 'EXT-002', 'Migration Scripts',
    weekdays(2026, 2, 5), [8, 8, 8, 8, 8],
    ['Python ETL scripts', 'Incremental load logic', 'Error handling', 'Logging', 'Performance tuning'],
    [8, 8, 8, 8, 8], 'Finished'
);

// Trang - Feb
addEntries('trang@conarum.com', 'EXT-001', 'Implementation Phase',
    weekdays(2026, 2, 4), [8, 8, 7, 8],
    ['API endpoints', 'Business logic', 'Data validation', 'Integration testing'],
    [8, 8, 7, 8], 'Finished'
);
addEntries('trang@conarum.com', 'PKR-001', 'Payroll Processing',
    ['2026-02-09'], [3], ['Payroll data entry'], [3], 'Finished'
);

// Phuc - Feb
addEntries('phuc@conarum.com', 'INT-001', 'Frontend Development',
    weekdays(2026, 2, 5), [8, 8, 8, 8, 7],
    ['Mobile responsive', 'Dark mode', 'Accessibility', 'Performance optimization', 'Code cleanup'],
    [8, 8, 8, 8, 7], 'Finished'
);

// Lead2 - Feb
addEntries('lead2@conarum.com', 'EXT-002', 'Data Analysis',
    weekdays(2026, 2, 3), [4, 4, 4],
    ['Team standup', 'Client meeting', 'Sprint review'],
    [4, 4, 4], 'Finished'
);
addEntries('lead2@conarum.com', 'OTH-001', 'AI Exploration',
    ['2026-02-09', '2026-02-10'], [6, 4],
    ['AI roadmap planning', 'Budget estimation'], [6, 4], 'Finished'
);

// Batch 2 - Jan entries for Hoa, Nam, Linh
addEntries('hoa@conarum.com', 'EXT-001', 'Requirements Gathering',
    weekdays(2026, 1, 5), [8, 8, 6, 8, 8],
    ['Kickoff meeting', 'Stakeholder interviews', 'Process mapping', 'Use case docs', 'Sign-off'],
    [8, 8, 6, 8, 8], 'Finished'
);
addEntries('nam@conarum.com', 'EXT-002', 'Data Analysis',
    weekdays(2026, 1, 4), [8, 8, 8, 8],
    ['Source inventory', 'Data dictionary', 'Quality assessment', 'Report'],
    [8, 8, 8, 8], 'Finished'
);
addEntries('linh@conarum.com', 'EXT-002', 'Data Analysis',
    weekdays(2026, 1, 4), [8, 8, 7, 8],
    ['Legacy DB review', 'Schema comparison', 'Migration strategy', 'POC'],
    [8, 8, 7, 8], 'Finished'
);

// ── Not in batch - Mar 2026 ──────────────────────────────────────────────────

// Alice - Mar (Draft)
addEntries('alice@conarum.com', 'INT-001', 'Frontend Development',
    ['2026-03-02', '2026-03-03', '2026-03-04'], [8, 7, 8],
    ['Settings page', 'Timesheet calendar view', 'Export UI'],
    null, 'Draft'
);

// Cuong - Mar (Submitted)
addEntries('cuong@conarum.com', 'INT-001', 'Backend API',
    ['2026-03-02', '2026-03-03'], [8, 8],
    ['Batch processing endpoint', 'Excel import handler'],
    null, 'Submitted'
);

// Hoa - Mar (Rejected)
addEntries('hoa@conarum.com', 'EXT-001', 'Implementation Phase',
    ['2026-03-02'], [4], ['Client meeting notes'], null, 'Rejected'
);

// ─── 7. ApprovalHistory ──────────────────────────────────────────────────────
const approvalHistory = [];

// Helper to add submit + approve flow
function addApprovalFlow(userEmail, month, year, leadEmail, submitTs, approveTs) {
    approvalHistory.push(
        { timesheet_user_email: userEmail, timesheet_month: month, timesheet_year: year, actor_email: userEmail, action: 'Submitted', fromStatus: 'Draft', toStatus: 'Submitted', comment: '', timestamp: submitTs },
        { timesheet_user_email: userEmail, timesheet_month: month, timesheet_year: year, actor_email: leadEmail, action: 'Approved', fromStatus: 'Submitted', toStatus: 'Approved', comment: 'Approved', timestamp: approveTs }
    );
}

// Batch 1 approvals (Feb)
addApprovalFlow('alice@conarum.com', 2, 2026, 'lead1@conarum.com', '2026-02-28T17:00:00Z', '2026-03-01T10:00:00Z');
addApprovalFlow('cuong@conarum.com', 2, 2026, 'lead1@conarum.com', '2026-02-28T18:00:00Z', '2026-03-01T10:30:00Z');
addApprovalFlow('dung@conarum.com', 2, 2026, 'lead1@conarum.com', '2026-02-27T16:00:00Z', '2026-03-01T11:00:00Z');
addApprovalFlow('mai@conarum.com', 2, 2026, 'lead1@conarum.com', '2026-02-28T09:00:00Z', '2026-03-01T11:30:00Z');
addApprovalFlow('tuan@conarum.com', 2, 2026, 'lead1@conarum.com', '2026-02-28T10:00:00Z', '2026-03-01T12:00:00Z');
addApprovalFlow('lead1@conarum.com', 2, 2026, 'manager@conarum.com', '2026-02-28T15:00:00Z', '2026-03-01T09:00:00Z');
addApprovalFlow('alice@conarum.com', 1, 2026, 'lead1@conarum.com', '2026-02-01T08:00:00Z', '2026-02-02T10:00:00Z');
addApprovalFlow('cuong@conarum.com', 1, 2026, 'lead1@conarum.com', '2026-02-01T09:00:00Z', '2026-02-02T10:30:00Z');

// Batch 2 approvals (Feb) + finished
function addFinishedFlow(userEmail, month, year, leadEmail, submitTs, approveTs, finishTs) {
    addApprovalFlow(userEmail, month, year, leadEmail, submitTs, approveTs);
    approvalHistory.push(
        { timesheet_user_email: userEmail, timesheet_month: month, timesheet_year: year, actor_email: 'diana@example.com', action: 'Finished', fromStatus: 'Approved', toStatus: 'Finished', comment: 'Batch processed', timestamp: finishTs }
    );
}

addFinishedFlow('hoa@conarum.com', 2, 2026, 'lead2@conarum.com', '2026-02-27T16:00:00Z', '2026-02-28T09:00:00Z', '2026-03-02T14:00:00Z');
addFinishedFlow('nam@conarum.com', 2, 2026, 'lead2@conarum.com', '2026-02-27T17:00:00Z', '2026-02-28T09:30:00Z', '2026-03-02T14:00:00Z');
addFinishedFlow('linh@conarum.com', 2, 2026, 'lead2@conarum.com', '2026-02-28T08:00:00Z', '2026-02-28T10:00:00Z', '2026-03-02T14:00:00Z');
addFinishedFlow('khoa@conarum.com', 2, 2026, 'lead2@conarum.com', '2026-02-28T08:30:00Z', '2026-02-28T10:30:00Z', '2026-03-02T14:00:00Z');
addFinishedFlow('trang@conarum.com', 2, 2026, 'lead2@conarum.com', '2026-02-28T09:00:00Z', '2026-02-28T11:00:00Z', '2026-03-02T14:00:00Z');
addFinishedFlow('phuc@conarum.com', 2, 2026, 'lead2@conarum.com', '2026-02-28T09:30:00Z', '2026-02-28T11:30:00Z', '2026-03-02T14:00:00Z');
addFinishedFlow('lead2@conarum.com', 2, 2026, 'manager@conarum.com', '2026-02-28T14:00:00Z', '2026-02-28T15:00:00Z', '2026-03-02T14:00:00Z');
addFinishedFlow('hoa@conarum.com', 1, 2026, 'lead2@conarum.com', '2026-02-01T10:00:00Z', '2026-02-02T08:00:00Z', '2026-03-02T14:00:00Z');
addFinishedFlow('nam@conarum.com', 1, 2026, 'lead2@conarum.com', '2026-02-01T10:30:00Z', '2026-02-02T08:30:00Z', '2026-03-02T14:00:00Z');
addFinishedFlow('linh@conarum.com', 1, 2026, 'lead2@conarum.com', '2026-02-01T11:00:00Z', '2026-02-02T09:00:00Z', '2026-03-02T14:00:00Z');

// Mar timesheets (not in batch)
approvalHistory.push(
    { timesheet_user_email: 'cuong@conarum.com', timesheet_month: 3, timesheet_year: 2026, actor_email: 'cuong@conarum.com', action: 'Submitted', fromStatus: 'Draft', toStatus: 'Submitted', comment: '', timestamp: '2026-03-03T18:00:00Z' },
    { timesheet_user_email: 'hoa@conarum.com', timesheet_month: 3, timesheet_year: 2026, actor_email: 'hoa@conarum.com', action: 'Submitted', fromStatus: 'Draft', toStatus: 'Submitted', comment: '', timestamp: '2026-03-02T08:00:00Z' },
    { timesheet_user_email: 'hoa@conarum.com', timesheet_month: 3, timesheet_year: 2026, actor_email: 'lead2@conarum.com', action: 'Rejected', fromStatus: 'Submitted', toStatus: 'Rejected', comment: 'Missing project hours for EXT-001', timestamp: '2026-03-02T12:00:00Z' },
);

// ─── 8. BatchHistory ─────────────────────────────────────────────────────────
const batchHistory = [
    { batch_ID: batch1Id, actor_email: 'lead1@conarum.com', action: 'Created', status: 'Pending', comment: 'Submitting team 1 approved timesheets for Jan & Feb', timestamp: '2026-03-01T13:00:00Z' },
    { batch_ID: batch2Id, actor_email: 'lead2@conarum.com', action: 'Created', status: 'Pending', comment: 'Team 2 Jan & Feb batch', timestamp: '2026-03-01T14:00:00Z' },
    { batch_ID: batch2Id, actor_email: 'diana@example.com', action: 'Finished', status: 'Processed', comment: 'All entries verified and exported', timestamp: '2026-03-02T14:00:00Z' },
];

// ─── 9. AuditLog ─────────────────────────────────────────────────────────────
const auditLog = [
    { entity_: 'TimesheetEntry', entityId: uuidv4(), action: 'Created', userId: uuidv4(), changes: JSON.stringify({ loggedHours: '0 → 8', date: '2026-02-02' }) },
    { entity_: 'TimesheetEntry', entityId: uuidv4(), action: 'Updated', userId: uuidv4(), changes: JSON.stringify({ approvedHours: 'null → 8', modifiedBy: 'Bob Tran' }) },
    { entity_: 'User', entityId: uuidv4(), action: 'Updated', userId: uuidv4(), changes: JSON.stringify({ isActive: 'true → false', reason: 'Employee resigned' }) },
    { entity_: 'Project', entityId: uuidv4(), action: 'Created', userId: uuidv4(), changes: JSON.stringify({ name: 'Client Alpha Consulting', code: 'EXT-001' }) },
];

// ─── 10. ExportLog ───────────────────────────────────────────────────────────
const exportLog = [
    { exportedBy_email: 'diana@example.com', exportDate: '2026-03-01T15:00:00Z', fromDate: '2026-02-01', toDate: '2026-02-28', totalEntries: 18, filters: JSON.stringify({ month: 2, year: 2026 }) },
    { exportedBy_email: 'diana@example.com', exportDate: '2026-03-03T09:00:00Z', fromDate: '2026-01-01', toDate: '2026-03-03', totalEntries: 42, filters: JSON.stringify({ year: 2026 }) },
];

// ═══════════════════════════════════════════════════════════════════════════════
// Build workbook
// ═══════════════════════════════════════════════════════════════════════════════

const wb = xlsx.utils.book_new();

function addSheet(name, data) {
    const ws = xlsx.utils.json_to_sheet(data);
    const colWidths = Object.keys(data[0] || {}).map(k => ({
        wch: Math.max(k.length, ...data.map(r => String(r[k] || '').length)) + 2
    }));
    ws['!cols'] = colWidths;
    xlsx.utils.book_append_sheet(wb, ws, name);
}

addSheet('Users', users);
addSheet('Projects', projects);
addSheet('Tasks', tasks);
addSheet('TimesheetBatches', timesheetBatches);
addSheet('Timesheets', timesheets);
addSheet('TimesheetEntries', timesheetEntries);
addSheet('ApprovalHistory', approvalHistory);
addSheet('BatchHistory', batchHistory);
addSheet('AuditLog', auditLog);
addSheet('ExportLog', exportLog);

const outDir = path.join(__dirname, 'app', 'timesheet-app', 'public');
if (!fs.existsSync(outDir)) {
    fs.mkdirSync(outDir, { recursive: true });
}

const outPath = path.join(outDir, 'sample_import.xlsx');
xlsx.writeFile(wb, outPath);

// Count timesheets per batch
const batch1Count = timesheets.filter(t => t.batch_ID === batch1Id).length;
const batch2Count = timesheets.filter(t => t.batch_ID === batch2Id).length;

console.log('✅ Comprehensive sample Excel generated at: ' + outPath);
console.log('   All IDs are real UUIDs generated via uuidv4()');
console.log('');
console.log('   Batch 1 (Pending):   ' + batch1Count + ' timesheets');
console.log('   Batch 2 (Processed): ' + batch2Count + ' timesheets');
console.log('');
console.log('   Total: '
    + users.length + ' users, '
    + projects.length + ' projects, '
    + tasks.length + ' tasks, '
    + timesheetBatches.length + ' batches, '
    + timesheets.length + ' timesheets, '
    + timesheetEntries.length + ' entries, '
    + approvalHistory.length + ' approval records, '
    + batchHistory.length + ' batch history, '
    + auditLog.length + ' audit logs, '
    + exportLog.length + ' export logs'
);
