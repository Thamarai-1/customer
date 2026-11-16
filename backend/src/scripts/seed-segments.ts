import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { SegmentationService } from '../modules/segmentation/segmentation.service.js';
import { logger } from '../utils/logger.js';

export const seedSegments = async (): Promise<void> => {
  logger.info('Executing deterministic customer segmentation classification on seeded data...', 'SeedSegments');
  const summary = await SegmentationService.classifyAll(50);
  logger.info(
    `Seeded Segment Classifications: Processed ${summary.processedCount}, Classified ${summary.classifiedCount}, Insufficient Data ${summary.insufficientDataCount}, Multi-Segment ${summary.multiSegmentCount}`,
    'SeedSegments'
  );
};

if (process.argv[1]?.endsWith('seed-segments.ts') || process.argv[1]?.endsWith('seed-segments.js')) {
  (async () => {
    try {
      await connectDatabase();
      await seedSegments();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      logger.error('Failed to run segment seeding', 'SeedSegments', {
        error: err instanceof Error ? err.message : String(err)
      });
      process.exit(1);
    }
  })();
}
