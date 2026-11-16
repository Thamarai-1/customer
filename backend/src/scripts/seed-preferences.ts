import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { CustomerModel } from '../modules/customers/customer.model.js';
import { CommunicationPreferenceModel, PreferredChannel } from '../modules/communications/preference.model.js';
import { logger } from '../utils/logger.js';

export const seedPreferences = async (): Promise<void> => {
  logger.info('Seeding customer communication preferences...', 'SeedPreferences');

  const customers = await CustomerModel.find();
  let count = 0;

  for (const cust of customers) {
    const existing = await CommunicationPreferenceModel.findOne({ customerId: cust.customerId });
    if (existing) continue;

    const numId = parseInt(cust.customerId.replace('CUST-', ''), 10) || 1000;
    // Specific customers deliberately opted out for testing compliance and refusal scenarios
    const isOptedOut = numId === 1085 || numId === 1099 || numId === 1118;

    await CommunicationPreferenceModel.create({
      customerId: cust.customerId,
      customerRef: cust._id,
      emailConsent: !isOptedOut,
      smsConsent: numId % 3 === 0 && !isOptedOut,
      whatsappConsent: false,
      preferredChannel: numId % 4 === 0 ? PreferredChannel.SMS : PreferredChannel.EMAIL,
      optedOut: isOptedOut,
      consentUpdatedAt: new Date(Date.now() - 90 * 24 * 60 * 60 * 1000),
      consentSource: 'ONBOARDING_TERMS',
      notes: isOptedOut ? 'Customer opted out of promotional communications' : undefined
    });
    count++;
  }

  logger.info(`Seeded ${count} customer communication preferences.`, 'SeedPreferences');
};

if (process.argv[1]?.endsWith('seed-preferences.ts') || process.argv[1]?.endsWith('seed-preferences.js')) {
  (async () => {
    try {
      await connectDatabase();
      await seedPreferences();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
}
