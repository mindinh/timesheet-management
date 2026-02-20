# Timesheet Data Flow & Workflows

This document details the lifecycle of a timesheet entry, from initial logging to final approval, including the various states and transitions.

## Timesheet Lifecycle

The timesheet process follows a strict state machine to ensure data integrity and proper approval chains.

```mermaid
stateDiagram-v2
    [*] --> Draft
    Draft --> Submitted: User Submits
    Submitted --> Approved: Team Lead Approves
    Submitted --> Rejected: Approver Rejects
    Approved --> Submitted: Team Lead Forwards to Admin
    Approved --> Finished: Admin/Manager Finalizes
    
    Rejected --> Submitted: User Resubmits (after edit)
    
    state "Draft" as Draft {
        [*] --> Editing
        Editing --> [*]
        note right of Editing: User can add/edit/delete entries
    }

    state "Submitted" as Submitted {
        note right of Submitted: Locked for User.\nWaiting for Approver.
    }

    state "Approved" as Approved {
        note right of Approved: Approved by Team Lead.\nReady for Admin or Archiving.
    }

    state "Finished" as Finished {
        [*] --> Archived
    }
```

## detailed Workflows

### 1. Logging Time (Draft Mode)
- **Actor**: Employee
- **Action**: Create or Update `TimesheetEntry`.
- **Condition**: The parent `Timesheet` must be in status `Draft` or `Rejected`.
- **System Behavior**:
    - Validates that the timesheet is editable.
    - Updates `loggedHours`.
    - `approvedHours` remains null initially.

### 2. Submitting a Timesheet
- **Actor**: Employee
- **Action**: `submitTimesheet`
- **Input**: `approverId` (Optional/Selectable)
- **System Behavior**:
    - Validates status is `Draft` or `Rejected`.
    - Sets status to `Submitted`.
    - Sets `submitDate` to current timestamp.
    - Sets `currentApprover` to the selected approver (or default manager).
    - Creates an `ApprovalHistory` record.

### 3. Review Process

#### Approval
- **Actor**: Team Lead / Admin
- **Action**: `approveTimesheet`
- **System Behavior**:
    - Verifies the actor is the `currentApprover`.
    - **Team Lead**: Transitions status to `Approved`.
    - **Admin/Manager**: Transitions status to `Finished`.
    - Sets `approveDate`.
    - logs action in `ApprovalHistory`.

#### Rejection
- **Actor**: Approver
- **Action**: `rejectTimesheet`
- **Input**: `comment` (Reason for rejection)
- **System Behavior**:
    - Transitions status to `Rejected`.
    - Unlocks the timesheet for the Employee to fix.
    - Logs rejection with comment in `ApprovalHistory`.

#### Forwarding (Team Lead to Admin)
- **Actor**: Team Lead
- **Action**: `submitToAdmin`
- **Prerequisite**: Timesheet is `Approved`.
- **System Behavior**:
    - Transitions status back to `Submitted`.
    - Sets `currentApprover` to the selected Admin.
    - Allows the final sign-off workflow to proceed.

### 4. Resubmission
- **Actor**: Employee
- **Scenario**: Timesheet was `Rejected`.
- **Action**: Edit entries -> `submitTimesheet`.
- **System Behavior**:
    - Follows the same flow as standard submission.
    - Audit trail shows the cycle of `Submitted` -> `Rejected` -> `Submitted`.

## Data Logic

### Hours Calculation
- **Logged Hours**: The raw input from the employee.
- **Approved Hours**:
    - Initially null.
    - **Modification**: Team Leads/Admins can use `modifyEntryHours` to override the billable/countable hours without changing the employee's original log.
    - Used for final reporting and payroll.

### Immutable History
Every state change is recorded in the `ApprovalHistory` entity, ensuring a complete audit trail of:
- Who performed the action.
- When it happened.
- The status transition (`fromStatus` -> `toStatus`).
- Contextual comments.
