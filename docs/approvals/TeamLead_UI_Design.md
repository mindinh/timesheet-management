# Team Lead Timesheet Approval - UI Design & Integration Guide

## 1. Overview
The User Interface (UI) for the `TeamLeadService` feature is designed to allow Team Leads to easily monitor, adjust, and approve/reject employee timesheets, as well as batch them to forward to the Admin.

## 2. Main Screens

### 2.1. Dashboard / Pending Timesheets Screen
**Purpose:** Display a list of timesheets currently in the `Submitted` status, waiting for the Team Lead's approval.

**UI Components:**
- **Table / DataGrid:** Displays the timesheet list.
  - **Columns:** Employee Name, Year, Month, Total Logged Hours, Total Approved Hours.
  - Checkbox at the beginning of each row (For Bulk Actions).
  - Action buttons on each row: `View Details`, `Approve`, `Reject`.
- **Top Bar / Actions:**
  - **Bulk Approve** button: Enabled when multiple rows are selected via checkboxes.
  - **Bulk Reject** button: Enabled when rows are selected.

**API Integration:**
- Call OData function: `GET /api/teamlead/getPendingTimesheets()` to fetch data (including User info and calculation).
- Call action: `POST /api/teamlead/bulkApproveTimesheets` with payload `{ "timesheetIds": [...], "comment": "..." }`
- Call action: `POST /api/teamlead/bulkRejectTimesheets` with payload `{ "timesheetIds": [...], "comment": "..." }`

### 2.2. Timesheet Details & Adjustments Screen
**Purpose:** When the Team Lead clicks `View Details` on a timesheet (batch by month of an employee), this screen appears to view each small entry, adjust hours if needed (inline editing per entry), and write a comment. Then, they can submit the timesheet directly to the Admin.

**UI Components:**
- **Header:** Employee Information, Month/Year, Status (Submitted).
- **Entries List (Table):**
  - Columns: Date, Project, Task, Notes, Logged Hours, Approved Hours.
  - The *Approved Hours* column allows Inline Editing. It defaults to Logged Hours if not adjusted. When the Team Lead edits this number and saves, it calls the API to adjust hours.
- **Bottom Actions:**
  - Textarea: "Comment / Reason (Required if Rejecting)"
  - **Approve** button.
  - **Reject** button (Returns to the employee).
  - **Submit to Final Admin** button. (Auto-saves changes, auto-approves the timesheet, and forwards it directly to the selected Admin).

**API Integration:**
- Get detailed entry info via OData by selected timesheet: `GET /api/teamlead/Timesheets(<ID>)?$expand=entries`
- When editing hours of an entry, click Save: `POST /api/teamlead/modifyEntryHours` payload `{ "entryId": "...", "approvedHours": <number> }`
- On Approve: `POST /api/teamlead/approveTimesheet` payload `{ "timesheetId": "...", "comment": "..." }`
- On Reject: `POST /api/teamlead/rejectTimesheet` payload `{ "timesheetId": "...", "comment": "..." }`

### 2.3. Approved Timesheets & Batching Screen
**Purpose:** After timesheets are approved (status `Approved`), the Team Lead needs to group them into a Batch and send it to the Admin for final approval at the end of the month/period.

**UI Components:**
- **Table:** Displays a list of Timesheets with status `Approved` and `batch_ID` as null (waiting to be batched).
  - Columns are similar to the Pending page.
  - Checkbox at the beginning of each row to group as the Team Lead wishes.
- **Actions:**
  - Select Admin (Combobox / Select Box).
  - **Create Batch & Forward to Admin** button. Upon clicking, all selected timesheets will be grouped.

**API Integration:**
- Get list of approvals waiting for Batch: `GET /api/teamlead/Timesheets?$filter=status eq 'Approved' and batch_ID eq null&$expand=user` (depending on how the Timesheets entity is loaded).
- Get list of Admins (to select): `GET /api/teamlead/Users?$filter=role eq 'Admin'`
- Create batch: `POST /api/teamlead/createBatch` payload `{ "timesheetIds": [...], "adminId": "..." }`

## 3. Proposed UI Components Architecture (Framework-agnostic)

- `<TeamLeadLayout>`: Wrapper component for Team Lead features, including Side Nav (`Pending Approvals`, `Approved & Batching`).
- `<PendingTimesheetsTable>`: Table component to display data fetched from `getPendingTimesheets`.
- `<TimesheetDetailModal>`: Dialog / Popup or a large detail screen to examine entries closely.
  - Contains `<EditableEntryTable>` to support inputting `approvedHours`.
- `<ApprovalCommentDialog>`: A common dialog that pops up when clicking any Approve/Reject button (including Bulk) to enter a common Comment.
- `<BatchCreationView>`: Table displaying approved timesheets. Groups selected items and lists Admins for the Team Lead to submit the form.

## 4. Workflows Guide

1. At the approval period (end of month/week), **the Team Lead goes to the "Pending Approvals" section**. The UI fetches data from `getPendingTimesheets()` grouped by month per employee.
2. The Team Lead glances through the list.
3. If detailed review is needed, click `View Details`. In the Detail screen, they can see individual daily tasks (entries) for that month.
4. If a day has 10 logged hours which is unreasonable, the Team Lead edits the `approvedHours` field in the UI to `8 hours` and the variance is updated automatically.
5. If everything looks good, the Team Lead can either:
   - Enter a Comment and click **Approve** (calls `approveTimesheet` API), saving it for later batching.
   - Click **Submit to Final Admin**, select an Admin, and the system will auto-save modified hours, auto-approve the timesheet, and `createBatch()` to forward it to the Admin immediately in one smooth flow.
6. Back on the Dashboard, the Team Lead can select all other employees and click **Bulk Approve** if detailed adjustments are not needed.
7. Continuing the process, the Team Lead switches to the **Batching** tab. The newly Approved timesheets that haven't been batched yet will appear here.
8. The Team Lead selects all of their employees' timesheets into one batch, selects the Admin's name, and clicks **Create Batch & Forward** -> calls `createBatch()` API. This action successfully packages the files and forwards them to the Admin.
