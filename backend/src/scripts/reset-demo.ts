import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { DemoService } from '../modules/demo/demo.service.js';
import { logger } from '../utils/logger.js';

(async () => {
  try {
    logger.info('=========================================================', 'ResetDemo');
    logger.info('Resetting and Re-initializing Demo Environment...', 'ResetDemo');
    logger.info('=========================================================', 'ResetDemo');

    await connectDatabase();
    await DemoService.resetAllDemoData();
    await disconnectDatabase();

    logger.info('Demo environment reset successfully.', 'ResetDemo');
    process.exit(0);
  } catch (err) {
    logger.error('Failed to reset demo data', 'ResetDemo', {
      error: err instanceof Error ? err.message : String(err)
    });
    process.exit(1);
  }
})();
