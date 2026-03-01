import cds from '@sap/cds'
import { AdminExportHandler } from './handlers/admin/AdminExportHandler'
import { AdminBatchHandler } from './handlers/admin/AdminBatchHandler'
import { AdminProjectHandler } from './handlers/admin/AdminProjectHandler'
import { AdminDashboardHandler } from './handlers/admin/AdminDashboardHandler'

/**
 * AdminService – Entry point for Admin operations.
 *
 * This file should remain thin. All business logic is delegated to handlers.
 */
export default class AdminService extends cds.ApplicationService {

    async init() {
        new AdminExportHandler(this).register()
        new AdminBatchHandler(this).register()
        new AdminProjectHandler(this).register()
        new AdminDashboardHandler(this).register()

        await super.init()
    }
}
