import cds from '@sap/cds';
import { TeamLeadBatchHandler } from './handlers/teamlead/TeamLeadBatchHandler';

export default class TeamLeadService extends cds.ApplicationService {
  async init() {
    new TeamLeadBatchHandler(this).register();
    await super.init();
  }
}
