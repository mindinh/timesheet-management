using {sap.timesheet as db} from '../db/schema';

/**
 * Team Lead Service
 * Provides operations for Team Leads to review, approve, and batch timesheets for their direct reports.
 */
service TeamLeadService @(
    path    : '/api/teamlead',
    requires: [
        'TeamLead',
        'Admin'
    ],
    impl    : './teamlead-service'
) {

    // ── Master / Reference Data ───────────────────────────────────────────────
    @readonly
    entity Users             as projection on db.User;

    @readonly
    entity Projects          as projection on db.Project;

    @readonly
    entity Tasks             as projection on db.Task;

    // ── Approvals & Timesheets ────────────────────────────────────────────────
    entity Timesheets        as projection on db.Timesheet;
    entity TimesheetEntries  as projection on db.TimesheetEntry;
    entity TimesheetBatches  as projection on db.TimesheetBatch;

    @readonly
    entity ApprovalHistories as projection on db.ApprovalHistory;

    @readonly
    entity BatchHistories    as projection on db.BatchHistory;

    // ── Workflow Actions ──────────────────────────────────────────────────────

    /** View timesheets that are submitted and need approval by the current Team Lead */
    function getPendingTimesheets()                                                returns array of Timesheets;

    /** Approve a single timesheet */
    action   approveTimesheet(timesheetId: String, comment: String)                returns String;

    /** Reject a single timesheet back to the employee */
    action   rejectTimesheet(timesheetId: String, comment: String)                 returns String;

    /** Bulk approve multiple timesheets */
    action   bulkApproveTimesheets(timesheetIds: array of String, comment: String) returns String;

    /** Bulk reject multiple timesheets */
    action   bulkRejectTimesheets(timesheetIds: array of String, comment: String)  returns String;

    /** Modify logged hours on a specific entry before approving */
    action   modifyEntryHours(entryId: String, approvedHours: Decimal)             returns String;

    /** Group approved timesheets into a batch and forward to final Admin */
    action   createBatch(timesheetIds: array of String, adminId: String)           returns String;

}
