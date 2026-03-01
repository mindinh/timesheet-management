import cds from '@sap/cds'
import { TimesheetAuthHandler } from './handlers/timesheet/TimesheetAuthHandler'
import { TimesheetEntryHandler } from './handlers/timesheet/TimesheetEntryHandler'
import { TimesheetWorkflowHandler } from './handlers/timesheet/TimesheetWorkflowHandler'
import { TimesheetExportHandler } from './handlers/timesheet/TimesheetExportHandler'
import { TimesheetBulkHandler } from './handlers/timesheet/TimesheetBulkHandler'
import { TimesheetImportHandler } from './handlers/timesheet/TimesheetImportHandler'

/**
 * TimesheetService – Entry point for End Users.
 *
 * This file should remain thin. All business logic is delegated to handlers.
 */
export default class TimesheetService extends cds.ApplicationService {

    async init() {
        // Register all handlers
        new TimesheetAuthHandler(this).register()
        new TimesheetEntryHandler(this).register()
        new TimesheetWorkflowHandler(this).register()
        new TimesheetExportHandler(this).register()
        new TimesheetBulkHandler(this).register()
        new TimesheetImportHandler(this).register()

        await super.init()
    }
}

