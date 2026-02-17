# Timesheet Architecture

This document outlines the high-level architecture, project structure, and security model of the Timesheet Management application.

## System Overview

The application is built using the **SAP Cloud Application Programming Model (CAP)** and follows a standard 3-tier architecture:

1.  **Frontend (UI)**: SAP Fiori / UI5 based application.
    -   Interacts with the backend via OData V4 services.
    -   Handles user inputs for logging time, viewing status, and project configuration.
2.  **Backend (Service Layer)**: Node.js / CAP.
    -   Exposes `TimesheetService` and `AdminService`.
    -   Enforces business logic (validations, workflow transitions).
    -   Manages data persistence.
3.  **Database**: SQLite (Development) / SAP HANA (Production).
    -   Stores `User`, `Project`, `Task`, `Timesheet`, and `ApprovalHistory` entities.

## core Entities & Relationships

### Project & Task Configuration

Projects are the central organizational unit for time tracking.

-   **Project**: Represents a billable or internal undertaking.
    -   **Attributes**: Name, Code, Type (Papierkram, Internal, External, Other), Description.
    -   **Ownership**: Linked to a `User` (Project Manager/Owner).
    -   **Visibility**: Users can only log time against projects they are assigned to or own (depending on specific business rules implementation).

-   **Task**: A granular work breakdown within a Project.
    -   **Purpose**: Allows more detailed tracking than just at the project level.
    -   **Attributes**: Name, Start/End Date, Status (Open, In Progress, Completed, Cancelled).
    -   **Usage**: Users select a specific Task when logging a `TimesheetEntry`.

### User Roles & Hierarchy

The system defines four primary roles:

1.  **Employee**: Can draft timesheets, log time, and submit for approval.
2.  **Team Lead**: Primary approver. Can approve, reject, or modify hours. Can forward approved timesheets to Admin.
3.  **Manager**: Senior approver, can finalize timesheets directly.
4.  **Admin**: Full system access. Manages master data (Projects, Users), finalizes workflows, and exports data.

Hierarchy is maintained via the `manager` association on the `User` entity, determining the default approver chain.

## Security Model

### Authentication
-   Standard SAP BTP Authentication (XSUAA).
-   **Service Logic**: `resolveUser` function identifies the effective user.
    -   Supports `x-mock-user` header for testing/impersonation in non-production environments.

### Authorization
-   **Service Level**:
    -   `TimesheetService`: Accessible to authenticated users.
    -   `AdminService`: Restricted to users with the 'Admin' scope.
-   **Row-Level Security (RLS)**:
    -   **Projects**: Users see projects they own.
    -   **Timesheets**: Users see their *own* timesheets OR timesheets where they are the *current designated approver*.
    -   **Entries**: Inherit visibility from their parent Timesheet.

## Technical Components

-   **`db/schema.cds`**: Defines the domain model and database schema.
-   **`srv/service.cds`**: Defines the API surface and service projections.
-   **`srv/timesheet-service.js`**: Contains the event handlers and business logic implementation.
