import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { CampaignModel } from '../modules/campaigns/campaigns.model.js';
import { OfferModel } from '../modules/offers/offers.model.js';
import { CampaignStatus, CampaignObjective } from '../modules/campaigns/campaigns.types.js';
import { CustomerSegmentType } from '../modules/segmentation/segmentation.constants.js';
import { logger } from '../utils/logger.js';

export const DEMO_CAMPAIGNS = [
  {
    campaignCode: 'CAMP-LOYALTY-VIP-2026',
    name: 'VIP Loyalty Rewards 2026',
    description: 'Exclusive rewards and points multipliers for high-value engaged loyalty members.',
    objective: CampaignObjective.LOYALTY_REWARD,
    targetSegments: [CustomerSegmentType.LOYALTY_CANDIDATE],
    status: CampaignStatus.ACTIVE,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-12-31'),
    allowedChannels: ['EMAIL', 'SMS', 'IN_APP'],
    priority: 1,
    toneGuideline: 'CELEBRATORY_INCENTIVIZING',
    mandatoryDisclaimers: ['Exclusive to enrolled VIP members in good standing.'],
    blockedKeywords: ['urgent', 'final notice', 'overdue'],
    offerCodes: ['OFFER-VIP-DOUBLE-POINTS']
  },
  {
    campaignCode: 'CAMP-WINBACK-SPRING',
    name: 'Spring Winback Reactivation',
    description: 'Targeted reactivation campaign offering 50% discount to re-engage dormant customers.',
    objective: CampaignObjective.RE_ENGAGEMENT,
    targetSegments: [CustomerSegmentType.INACTIVE],
    status: CampaignStatus.ACTIVE,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-12-31'),
    allowedChannels: ['EMAIL', 'SMS'],
    priority: 2,
    toneGuideline: 'ATTENTIVE_VALUE_FOCUSED',
    mandatoryDisclaimers: ['Terms and conditions apply. Limited to one activation per account.'],
    blockedKeywords: ['penalty', 'disconnect'],
    offerCodes: ['OFFER-WINBACK-50OFF']
  },
  {
    campaignCode: 'CAMP-USAGE-BOOST',
    name: 'Engagement and Usage Stimulation',
    description: 'Product usage boost campaign with complimentary data and add-on bonuses.',
    objective: CampaignObjective.CUSTOMER_ENGAGEMENT,
    targetSegments: [CustomerSegmentType.DECLINING_ACTIVITY],
    status: CampaignStatus.ACTIVE,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-12-31'),
    allowedChannels: ['EMAIL', 'SMS', 'IN_APP'],
    priority: 3,
    toneGuideline: 'HELPFUL_ENTICING',
    mandatoryDisclaimers: ['Boost valid for 30 days upon activation.'],
    blockedKeywords: ['risk', 'cancellation'],
    offerCodes: ['OFFER-DATA-BOOST-10GB']
  },
  {
    campaignCode: 'CAMP-CONSISTENT-PERKS',
    name: 'Consistent Customer Appreciation Perks',
    description: 'Relationship nurturing and thank-you perks for dependable long-term customers.',
    objective: CampaignObjective.CUSTOMER_APPRECIATION,
    targetSegments: [CustomerSegmentType.CONSISTENT_CUSTOMER],
    status: CampaignStatus.ACTIVE,
    startDate: new Date('2026-01-01'),
    endDate: new Date('2027-12-31'),
    allowedChannels: ['EMAIL', 'IN_APP'],
    priority: 4,
    toneGuideline: 'WARM_APPRECIATIVE',
    mandatoryDisclaimers: ['Credit applied directly to next monthly billing cycle.'],
    blockedKeywords: ['warning', 'past due'],
    offerCodes: ['OFFER-CONSISTENT-10CREDIT']
  },
  {
    campaignCode: 'CAMP-EXPIRED-WINTER',
    name: 'Winter Holiday Retention 2025',
    description: 'Seasonal holiday promotion offering bonus credits on annual subscription plans.',
    objective: CampaignObjective.CUSTOMER_RETENTION,
    targetSegments: [CustomerSegmentType.INACTIVE],
    status: CampaignStatus.EXPIRED,
    startDate: new Date('2025-11-01'),
    endDate: new Date('2025-12-31'),
    allowedChannels: ['EMAIL'],
    priority: 5,
    toneGuideline: 'WARM_APPRECIATIVE',
    mandatoryDisclaimers: ['Promotion expired.'],
    blockedKeywords: [],
    offerCodes: ['OFFER-EXPIRED-WINTER-DEAL']
  }
];

export const seedCampaigns = async (): Promise<void> => {
  logger.info('Seeding representative demo campaigns...', 'SeedCampaigns');

  for (const campaignData of DEMO_CAMPAIGNS) {
    const { offerCodes, ...campaignFields } = campaignData;

    // Resolve matching offer ObjectIds
    const offers = await OfferModel.find({ offerCode: { $in: offerCodes } });
    const offerIds = offers.map((o) => o._id);

    await CampaignModel.findOneAndUpdate(
      { campaignCode: campaignFields.campaignCode },
      {
        $set: {
          ...campaignFields,
          offerIds,
          totalTargetedCustomers: 0
        }
      },
      { upsert: true, new: true }
    );
  }

  logger.info(`Seeded ${DEMO_CAMPAIGNS.length} campaigns successfully`, 'SeedCampaigns');
};

if (process.argv[1]?.endsWith('seed-campaigns.ts') || process.argv[1]?.endsWith('seed-campaigns.js')) {
  (async () => {
    try {
      await connectDatabase();
      await seedCampaigns();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      logger.error('Failed to run campaign seeding', 'SeedCampaigns', {
        error: err instanceof Error ? err.message : String(err)
      });
      process.exit(1);
    }
  })();
}
