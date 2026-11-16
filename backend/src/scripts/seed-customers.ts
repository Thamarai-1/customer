import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { CustomerModel, CustomerType, AccountStatus, LoyaltyTier, PlanStatus } from '../modules/customers/customer.model.js';
import { logger } from '../utils/logger.js';

const FIRST_NAMES = [
  'Aarav', 'Ananya', 'Rohan', 'Sneha', 'Vikram', 'Pooja', 'Rahul', 'Neha', 'Aditya', 'Meera',
  'James', 'Emma', 'Oliver', 'Sophia', 'William', 'Ava', 'Lucas', 'Isabella', 'Henry', 'Mia',
  'Alexander', 'Charlotte', 'Sebastian', 'Amelia', 'Jack', 'Harper', 'Daniel', 'Evelyn', 'Liam', 'Abigail'
];

const LAST_NAMES = [
  'Sharma', 'Patel', 'Verma', 'Gupta', 'Singh', 'Reddy', 'Iyer', 'Nair', 'Chopra', 'Malhotra',
  'Smith', 'Johnson', 'Williams', 'Brown', 'Jones', 'Garcia', 'Miller', 'Davis', 'Rodriguez', 'Martinez',
  'Hernandez', 'Lopez', 'Gonzalez', 'Wilson', 'Anderson', 'Thomas', 'Taylor', 'Moore', 'Jackson', 'Martin'
];

export interface SeedCustomerSpec {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  customerType: CustomerType;
  accountStatus: AccountStatus;
  loyaltyTier: LoyaltyTier;
  loyaltyPoints: number;
  activePlan: string;
  planStatus: PlanStatus;
  planType: string;
  scenarioGroup: 'CONSISTENT' | 'LOYALTY' | 'DECLINING' | 'INACTIVE' | 'OVERDUE';
}

export const generateSyntheticCustomers = (): SeedCustomerSpec[] => {
  const specs: SeedCustomerSpec[] = [];
  let idCounter = 1001;

  // 1. Consistent Active Customers (30)
  for (let i = 0; i < 30; i++) {
    const fn = FIRST_NAMES[i % FIRST_NAMES.length] ?? 'Customer';
    const ln = LAST_NAMES[(i * 3) % LAST_NAMES.length] ?? 'User';
    specs.push({
      customerId: `CUST-${idCounter++}`,
      firstName: fn,
      lastName: ln,
      email: `${fn.toLowerCase()}.${ln.toLowerCase()}.${i}@example.com`,
      phone: `+1-555-01${(10 + i).toString().padStart(2, '0')}`,
      customerType: i % 2 === 0 ? CustomerType.TELECOM : CustomerType.RETAIL,
      accountStatus: AccountStatus.ACTIVE,
      loyaltyTier: LoyaltyTier.SILVER,
      loyaltyPoints: 650 + i * 20,
      activePlan: i % 2 === 0 ? 'Unlimited 5G Pro' : 'Retail Plus Rewards',
      planStatus: PlanStatus.ACTIVE,
      planType: 'Postpaid',
      scenarioGroup: 'CONSISTENT'
    });
  }

  // 2. High-Loyalty Candidates (25)
  for (let i = 0; i < 25; i++) {
    const fn = FIRST_NAMES[(i + 5) % FIRST_NAMES.length] ?? 'Loyal';
    const ln = LAST_NAMES[(i * 2 + 1) % LAST_NAMES.length] ?? 'Patron';
    specs.push({
      customerId: `CUST-${idCounter++}`,
      firstName: fn,
      lastName: ln,
      email: `vip.${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      phone: `+1-555-02${(10 + i).toString().padStart(2, '0')}`,
      customerType: CustomerType.TELECOM,
      accountStatus: AccountStatus.ACTIVE,
      loyaltyTier: i % 2 === 0 ? LoyaltyTier.PLATINUM : LoyaltyTier.GOLD,
      loyaltyPoints: 2400 + i * 110,
      activePlan: 'Enterprise Premier Gigabit',
      planStatus: PlanStatus.ACTIVE,
      planType: 'Annual Contract',
      scenarioGroup: 'LOYALTY'
    });
  }

  // 3. Declining Activity Customers (25)
  for (let i = 0; i < 25; i++) {
    const fn = FIRST_NAMES[(i + 10) % FIRST_NAMES.length] ?? 'Declining';
    const ln = LAST_NAMES[(i * 4 + 2) % LAST_NAMES.length] ?? 'Shopper';
    specs.push({
      customerId: `CUST-${idCounter++}`,
      firstName: fn,
      lastName: ln,
      email: `reengage.${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      phone: `+1-555-03${(10 + i).toString().padStart(2, '0')}`,
      customerType: CustomerType.RETAIL,
      accountStatus: AccountStatus.ACTIVE,
      loyaltyTier: LoyaltyTier.BRONZE,
      loyaltyPoints: 220 + i * 15,
      activePlan: 'Flex Saver Standard',
      planStatus: PlanStatus.ACTIVE,
      planType: 'Monthly Flex',
      scenarioGroup: 'DECLINING'
    });
  }

  // 4. Inactive / Dormant Customers (20)
  for (let i = 0; i < 20; i++) {
    const fn = FIRST_NAMES[(i + 15) % FIRST_NAMES.length] ?? 'Dormant';
    const ln = LAST_NAMES[(i * 5 + 3) % LAST_NAMES.length] ?? 'Member';
    specs.push({
      customerId: `CUST-${idCounter++}`,
      firstName: fn,
      lastName: ln,
      email: `dormant.${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      phone: `+1-555-04${(10 + i).toString().padStart(2, '0')}`,
      customerType: CustomerType.RETAIL,
      accountStatus: AccountStatus.INACTIVE,
      loyaltyTier: LoyaltyTier.BRONZE,
      loyaltyPoints: 45,
      activePlan: 'Basic Pay-As-You-Go',
      planStatus: PlanStatus.EXPIRED,
      planType: 'Prepaid',
      scenarioGroup: 'INACTIVE'
    });
  }

  // 5. Overdue Bill Customers (20)
  for (let i = 0; i < 20; i++) {
    const fn = FIRST_NAMES[(i + 20) % FIRST_NAMES.length] ?? 'Overdue';
    const ln = LAST_NAMES[(i * 3 + 4) % LAST_NAMES.length] ?? 'Account';
    specs.push({
      customerId: `CUST-${idCounter++}`,
      firstName: fn,
      lastName: ln,
      email: `billing.${fn.toLowerCase()}.${ln.toLowerCase()}@example.com`,
      phone: `+1-555-05${(10 + i).toString().padStart(2, '0')}`,
      customerType: CustomerType.TELECOM,
      accountStatus: i > 15 ? AccountStatus.SUSPENDED : AccountStatus.ACTIVE,
      loyaltyTier: i % 3 === 0 ? LoyaltyTier.SILVER : LoyaltyTier.BRONZE,
      loyaltyPoints: 310,
      activePlan: 'Family Multi-Line Plus',
      planStatus: i > 15 ? PlanStatus.CANCELLED : PlanStatus.ACTIVE,
      planType: 'Postpaid',
      scenarioGroup: 'OVERDUE'
    });
  }

  return specs;
};

export const seedCustomers = async (): Promise<void> => {
  logger.info('Seeding 120 synthetic customer records across 5 behavioral scenarios...', 'SeedCustomers');

  const customerSpecs = generateSyntheticCustomers();
  let createdCount = 0;
  let skippedCount = 0;

  for (const s of customerSpecs) {
    const existing = await CustomerModel.findOne({ customerId: s.customerId });
    if (!existing) {
      await CustomerModel.create({
        customerId: s.customerId,
        firstName: s.firstName,
        lastName: s.lastName,
        email: s.email,
        phone: s.phone,
        customerType: s.customerType,
        accountStatus: s.accountStatus,
        loyaltyInfo: {
          loyaltyTier: s.loyaltyTier,
          loyaltyPoints: s.loyaltyPoints,
          membershipStartDate: new Date(Date.now() - 365 * 24 * 60 * 60 * 1000)
        },
        subscription: {
          activePlan: s.activePlan,
          planType: s.planType,
          planStatus: s.planStatus,
          planStartDate: new Date(Date.now() - 180 * 24 * 60 * 60 * 1000)
        },
        source: 'SYNTHETIC_GENERATOR'
      });
      createdCount++;
    } else {
      skippedCount++;
    }
  }

  logger.info(`Customer seeding done: ${createdCount} created, ${skippedCount} already existed.`, 'SeedCustomers');
};

// Run standalone if invoked directly
if (process.argv[1]?.endsWith('seed-customers.ts') || process.argv[1]?.endsWith('seed-customers.js')) {
  (async () => {
    try {
      await connectDatabase();
      await seedCustomers();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
}
