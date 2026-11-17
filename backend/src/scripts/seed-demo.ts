import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { DemoService } from '../modules/demo/demo.service.js';
import { logger } from '../utils/logger.js';

(async () => {
  try {
    logger.info('=========================================================', 'SeedDemo');
    logger.info('Seeding Baseline Hackathon Demo Environment...', 'SeedDemo');
    logger.info('=========================================================', 'SeedDemo');

    await connectDatabase();
    await DemoService.resetAllDemoData();
    await disconnectDatabase();

    logger.info('Demo seeding completed successfully.', 'SeedDemo');
    process.exit(0);
  } catch (err) {
    logger.error('Failed to seed demo data', 'SeedDemo', {
      error: err instanceof Error ? err.message : String(err)
    });
    process.exit(1);
  }
})();
