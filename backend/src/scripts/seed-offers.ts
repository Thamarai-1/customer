import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { OfferModel } from '../modules/offers/offers.model.js';
import { OfferType, OfferStatus, OfferValueType } from '../modules/offers/offers.types.js';
import { CustomerSegmentType } from '../modules/segmentation/segmentation.constants.js';
import { logger } from '../utils/logger.js';

export const DEMO_OFFERS = [
  {
    offerCode: 'OFFER-VIP-DOUBLE-POINTS',
    name: 'VIP 2x Loyalty Multiplier',
    description: 'Earn double loyalty points on all product renewals and add-ons for the next 90 days.',
    offerType: OfferType.LOYALTY_POINTS,
    value: 2,
    valueType: OfferValueType.POINTS,
    currency: 'USD',
    targetSegments: [CustomerSegmentType.LOYALTY_CANDIDATE],
    eligibilityRules: {
      minimumLoyaltyPoints: 300,
      minimumMembershipDays: 180,
      requiredLoyaltyTiers: ['GOLD', 'PLATINUM'],
      requiredAccountStatus: 'ACTIVE',
      requiredPlanStatus: 'ACTIVE',
      maxOverdueBalance: 0
    },
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2027-12-31'),
    allowedChannels: ['EMAIL', 'SMS', 'IN_APP'],
    termsAndConditions: [
      'Applicable only to Gold and Platinum tier members with active accounts in good standing.',
      'Cannot be combined with bill payment waivers.',
      'Points awarded upon transaction completion.'
    ],
    status: OfferStatus.ACTIVE,
    maxRedemptions: 1000,
    currentRedemptions: 42
  },
  {
    offerCode: 'OFFER-WINBACK-50OFF',
    name: '50% Winback Comeback Discount',
    description: 'Enjoy 50% off your next 3 billing cycles when you reactivate your subscription today.',
    offerType: OfferType.PERCENTAGE_DISCOUNT,
    value: 50,
    valueType: OfferValueType.PERCENTAGE,
    currency: 'USD',
    targetSegments: [CustomerSegmentType.INACTIVE],
    eligibilityRules: {
      requiredAccountStatus: 'ACTIVE',
      maxOverdueBalance: 0
    },
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2027-12-31'),
    allowedChannels: ['EMAIL', 'SMS'],
    termsAndConditions: [
      'Offer valid exclusively for inactive accounts with no outstanding debt.',
      'Discount applies to base plan fees for up to 3 consecutive months.'
    ],
    status: OfferStatus.ACTIVE,
    maxRedemptions: 500,
    currentRedemptions: 18
  },
  {
    offerCode: 'OFFER-DATA-BOOST-10GB',
    name: 'Complimentary 10GB Data Boost',
    description: 'Add 10GB of high-speed data to your account free of charge to jumpstart your monthly usage.',
    offerType: OfferType.PROMOTIONAL_CREDIT,
    value: 10,
    valueType: OfferValueType.FIXED_AMOUNT,
    currency: 'USD',
    targetSegments: [CustomerSegmentType.DECLINING_ACTIVITY],
    eligibilityRules: {
      requiredAccountStatus: 'ACTIVE',
      requiredPlanStatus: 'ACTIVE',
      maxOverdueBalance: 0
    },
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2027-12-31'),
    allowedChannels: ['EMAIL', 'SMS', 'IN_APP'],
    termsAndConditions: [
      'Valid for 30 days from activation date.',
      'Available to customers on qualifying active telecom and data plans.'
    ],
    status: OfferStatus.ACTIVE,
    maxRedemptions: 750,
    currentRedemptions: 35
  },
  {
    offerCode: 'OFFER-CONSISTENT-10CREDIT',
    name: '$10 Loyalty Thank-You Credit',
    description: 'Receive a direct $10 statement credit on your next monthly statement as a token of appreciation.',
    offerType: OfferType.FIXED_DISCOUNT,
    value: 10,
    valueType: OfferValueType.FIXED_AMOUNT,
    currency: 'USD',
    targetSegments: [CustomerSegmentType.CONSISTENT_CUSTOMER],
    eligibilityRules: {
      minimumMembershipDays: 90,
      requiredAccountStatus: 'ACTIVE',
      requiredPlanStatus: 'ACTIVE',
      maxOverdueBalance: 0
    },
    validFrom: new Date('2026-01-01'),
    validUntil: new Date('2027-12-31'),
    allowedChannels: ['EMAIL', 'IN_APP'],
    termsAndConditions: [
      'Applied automatically towards next scheduled invoice.',
      'Requires minimum 90-day active tenure with no late payments.'
    ],
    status: OfferStatus.ACTIVE,
    maxRedemptions: 2000,
    currentRedemptions: 110
  },
  {
    offerCode: 'OFFER-EXPIRED-WINTER-DEAL',
    name: 'Winter Holiday Special 2025',
    description: 'Seasonal holiday promotion offering bonus credits on annual subscription plans.',
    offerType: OfferType.FIXED_DISCOUNT,
    value: 25,
    valueType: OfferValueType.FIXED_AMOUNT,
    currency: 'USD',
    targetSegments: [CustomerSegmentType.INACTIVE, CustomerSegmentType.CONSISTENT_CUSTOMER],
    eligibilityRules: {
      requiredAccountStatus: 'ACTIVE'
    },
    validFrom: new Date('2025-11-01'),
    validUntil: new Date('2025-12-31'),
    allowedChannels: ['EMAIL'],
    termsAndConditions: ['Promotion expired on December 31, 2025.'],
    status: OfferStatus.EXPIRED,
    maxRedemptions: 100,
    currentRedemptions: 100
  }
];

export const seedOffers = async (): Promise<void> => {
  logger.info('Seeding representative demo offers...', 'SeedOffers');

  for (const offer of DEMO_OFFERS) {
    await OfferModel.findOneAndUpdate(
      { offerCode: offer.offerCode },
      { $set: offer },
      { upsert: true, new: true }
    );
  }

  logger.info(`Seeded ${DEMO_OFFERS.length} offers successfully`, 'SeedOffers');
};

if (process.argv[1]?.endsWith('seed-offers.ts') || process.argv[1]?.endsWith('seed-offers.js')) {
  (async () => {
    try {
      await connectDatabase();
      await seedOffers();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      logger.error('Failed to run offer seeding', 'SeedOffers', {
        error: err instanceof Error ? err.message : String(err)
      });
      process.exit(1);
    }
  })();
}
