import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { CustomerModel } from '../modules/customers/customer.model.js';
import { ActivityModel, ActivityType } from '../modules/activities/activity.model.js';
import { logger } from '../utils/logger.js';

export const seedActivities = async (): Promise<void> => {
  logger.info('Seeding customer activity logs aligned with behavioral scenarios...', 'SeedActivities');

  const customers = await CustomerModel.find();
  let activityCount = 0;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const cust of customers) {
    const existing = await ActivityModel.findOne({ customerId: cust.customerId });
    if (existing) continue; // Prevent duplicates

    const numId = parseInt(cust.customerId.replace('CUST-', ''), 10) || 1000;

    // 1. Consistent Active (1001 - 1030): 10-15 recent events, 12-16 previous events
    if (numId >= 1001 && numId <= 1030) {
      for (let j = 0; j < 12; j++) {
        await ActivityModel.create({
          customerId: cust.customerId,
          customerRef: cust._id,
          activityType: j % 2 === 0 ? ActivityType.SERVICE_USAGE : ActivityType.LOGIN,
          activityDate: new Date(now - (j * 2 + 1) * dayMs),
          source: 'MOBILE_APP',
          metadata: { dataUsageMb: 850 + j * 50 }
        });
        activityCount++;
      }
      for (let j = 0; j < 14; j++) {
        await ActivityModel.create({
          customerId: cust.customerId,
          customerRef: cust._id,
          activityType: ActivityType.LOGIN,
          activityDate: new Date(now - (32 + j * 2) * dayMs),
          source: 'WEB'
        });
        activityCount++;
      }
    }
    // 2. High Loyalty (1031 - 1055): purchases, portal logins, plan renewals
    else if (numId >= 1031 && numId <= 1055) {
      for (let j = 0; j < 15; j++) {
        await ActivityModel.create({
          customerId: cust.customerId,
          customerRef: cust._id,
          activityType: j === 0 ? ActivityType.PLAN_RENEWAL : j % 3 === 0 ? ActivityType.PURCHASE : ActivityType.LOGIN,
          activityDate: new Date(now - (j * 2) * dayMs),
          source: 'PORTAL',
          metadata: { purchaseValue: j % 3 === 0 ? 120 : undefined }
        });
        activityCount++;
      }
      for (let j = 0; j < 15; j++) {
        await ActivityModel.create({
          customerId: cust.customerId,
          customerRef: cust._id,
          activityType: ActivityType.SERVICE_USAGE,
          activityDate: new Date(now - (35 + j) * dayMs),
          source: 'MOBILE_APP'
        });
        activityCount++;
      }
    }
    // 3. Declining Activity (1056 - 1080): 1 recent event, 18-20 previous events!
    else if (numId >= 1056 && numId <= 1080) {
      // Only 1 recent event
      await ActivityModel.create({
        customerId: cust.customerId,
        customerRef: cust._id,
        activityType: ActivityType.LOGIN,
        activityDate: new Date(now - 22 * dayMs),
        source: 'WEB'
      });
      activityCount++;

      // 18 previous events in 31-60d period
      for (let j = 0; j < 18; j++) {
        await ActivityModel.create({
          customerId: cust.customerId,
          customerRef: cust._id,
          activityType: j % 2 === 0 ? ActivityType.SERVICE_USAGE : ActivityType.APP_INTERACTION,
          activityDate: new Date(now - (32 + j) * dayMs),
          source: 'MOBILE_APP'
        });
        activityCount++;
      }
    }
    // 4. Inactive / Dormant (1081 - 1100): Zero events in last 60 days, older historical events
    else if (numId >= 1081 && numId <= 1100) {
      for (let j = 0; j < 3; j++) {
        await ActivityModel.create({
          customerId: cust.customerId,
          customerRef: cust._id,
          activityType: ActivityType.LOGIN,
          activityDate: new Date(now - (80 + j * 10) * dayMs),
          source: 'WEB'
        });
        activityCount++;
      }
    }
    // 5. Overdue (1101 - 1120): support interactions and portal inquiries
    else {
      for (let j = 0; j < 4; j++) {
        await ActivityModel.create({
          customerId: cust.customerId,
          customerRef: cust._id,
          activityType: j === 0 ? ActivityType.SUPPORT_INTERACTION : ActivityType.LOGIN,
          activityDate: new Date(now - (j * 5 + 2) * dayMs),
          source: 'CALL_CENTER',
          metadata: { ticketCategory: 'BILLING_DISPUTE' }
        });
        activityCount++;
      }
    }
  }

  logger.info(`Seeded ${activityCount} customer activity records.`, 'SeedActivities');
};

if (process.argv[1]?.endsWith('seed-activities.ts') || process.argv[1]?.endsWith('seed-activities.js')) {
  (async () => {
    try {
      await connectDatabase();
      await seedActivities();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
}
