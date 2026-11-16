import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { seedUsers } from './seed-users.js';
import { seedCustomers } from './seed-customers.js';
import { seedActivities } from './seed-activities.js';
import { seedBilling } from './seed-billing.js';
import { seedPreferences } from './seed-preferences.js';
import { logger } from '../utils/logger.js';

export const seedAll = async (): Promise<void> => {
  logger.info('=========================================================', 'SeedMaster');
  logger.info('Starting Complete Phase 2 Synthetic Database Seeding...', 'SeedMaster');
  logger.info('=========================================================', 'SeedMaster');

  await seedUsers();
  await seedCustomers();
  await seedActivities();
  await seedBilling();
  await seedPreferences();

  logger.info('=========================================================', 'SeedMaster');
  logger.info('Phase 2 Synthetic Seeding Finished Successfully!', 'SeedMaster');
  logger.info('=========================================================', 'SeedMaster');
};

(async () => {
  try {
    await connectDatabase();
    await seedAll();
    await disconnectDatabase();
    process.exit(0);
  } catch (err) {
    logger.error('Failed to run master seed', 'SeedMaster', {
      error: err instanceof Error ? err.message : String(err)
    });
    process.exit(1);
  }
})();
