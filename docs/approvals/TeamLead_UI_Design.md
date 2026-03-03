# Team Lead Timesheet Approval - UI Design & Integration Guide

## 1. Overview
The User Interface (UI) for the `TeamLeadService` feature is designed to allow Team Leads to easily monitor, adjust, and approve/reject employee timesheets, as well as batch them to forward to the Admin.

## 2. Main Screens

### 2.1. Dashboard / Timesheets Review Screen
**Purpose:** Display a list of timesheets currently in the `Submitted` or `Approved` status. Allows Team Leading to monitor, adjust, approve, reject, or batch timesheets contextually.

**UI Components:**
- **Table / DataGrid:** Displays the timesheet list.
  - **Columns:** Employee Name, Year, Month, Total Logged Hours, Total Approved Hours.
  - Checkbox at the beginning of each row (For Bulk Actions).
  - Action buttons on each row: `View Details`, `Approve`, `Reject`.
- **Top Bar / Actions:**
  - **Reject** button: Enabled when items are selected.
  - **Approve Selected** button: Enabled when items are selected.
  - **Submit Batch** button: Group selected timesheets (both pending and approved), prompt for a final Admin, and forward them seamlessly.

**API Integration:**
- Call OData function: `GET /api/teamlead/getPendingTimesheets()` to fetch both `Submitted` and `Approved` (with no associated batch) timesheets under the user's jurisdiction.
- Call action: `POST /api/teamlead/bulkApproveTimesheets` with payload `{ "timesheetIds": [...], "comment": "..." }`
- Call action: `POST /api/teamlead/bulkRejectTimesheets` with payload `{ "timesheetIds": [...], "comment": "..." }`
- Create batch: `POST /api/teamlead/createBatch` payload `{ "timesheetIds": [...], "adminId": "..." }`: Auto-approves any `Submitted` timesheets within the selection.

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

## 3. Proposed UI Components Architecture (Framework-agnostic)

- `<TeamLeadLayout>`: Wrapper component for Team Lead features.
- `<ApprovalsPage>`: Unified screen displaying pending timesheets with capabilities to immediately select and Create Batch.
- `<TimesheetDetailModal>`: Dialog / Popup or a large detail screen to examine entries closely.
  - Contains `<EditableEntryTable>` to support inputting `approvedHours`.
- `<ApprovalCommentDialog>`: A common dialog that pops up when clicking any Approve/Reject button (including Bulk) to enter a common Comment.
- `<BatchCreationView>`: Table displaying approved timesheets. Groups selected items and lists Admins for the Team Lead to submit the form.

## 4. Workflows Guide

1. At the approval period (end of month/week), **the Team Lead opens the Approvals & Batching section**.
2. The UI fetches pending and approved timesheets awaiting batching.
3. If detailed review is needed, click `View Details`. In the Detail screen, they can see individual daily tasks (entries).
4. If a day's hours are incorrect, the Team Lead edits the `approvedHours`.
5. If everything looks good, the Team Lead can either:
   - Enter a Comment and click **Approve** to mark it as approved, remaining in the list.
   - Click **Submit to Final Admin**, select an Admin, and the system will auto-save modified hours, approve it, and forward it directly to the Admin completely automatically.
6. Alternatively, from the Dashboard, the Team Lead can select all their employees' timesheets directly.
7. Click **Submit Batch**, choose the Admin's name, and confirm. This simultaneously approves any `Submitted` timesheets within the selection, correctly packages them into a batch, and successfully forwards everything to the Admin in one seamless flow.
