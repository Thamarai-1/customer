import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { seedUsers } from './seed-users.js';
import { seedCustomers } from './seed-customers.js';
import { seedActivities } from './seed-activities.js';
import { seedBilling } from './seed-billing.js';
import { seedPreferences } from './seed-preferences.js';
import { seedSegments } from './seed-segments.js';
import { seedOffers } from './seed-offers.js';
import { seedCampaigns } from './seed-campaigns.js';
import { StrategiesService } from '../modules/strategies/strategies.service.js';
import { BillingPoliciesService } from '../modules/billing-policies/billing-policies.service.js';
import { logger } from '../utils/logger.js';

export const seedAll = async (): Promise<void> => {
  logger.info('=========================================================', 'SeedMaster');
  logger.info('Starting Complete Synthetic Database Seeding (Phases 2-4)...', 'SeedMaster');
  logger.info('=========================================================', 'SeedMaster');

  await seedUsers();
  await seedCustomers();
  await seedActivities();
  await seedBilling();
  await seedPreferences();
  await seedSegments();
  await seedOffers();
  await seedCampaigns();
  await StrategiesService.bootstrapDefaults();
  await BillingPoliciesService.getConfig();

  logger.info('=========================================================', 'SeedMaster');
  logger.info('Synthetic Seeding and Policy Setup Finished Successfully!', 'SeedMaster');
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
