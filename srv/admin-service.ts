import cds from '@sap/cds'

/**
 * AdminService – Entry point for Admin operations.
 *
 * This file should remain thin. All business logic is delegated to handlers.
 */
export default class AdminService extends cds.ApplicationService {

    async init() {
        // Register admin-specific handlers here as they are implemented
        // e.g. new AdminExportHandler(this).register()

        await super.init()
    }
}
