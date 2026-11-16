import { connectDatabase, disconnectDatabase } from '../config/database.js';
import { CustomerModel } from '../modules/customers/customer.model.js';
import { BillingRecordModel, PaymentStatus, InvoiceStatus } from '../modules/billing/billing-record.model.js';
import { logger } from '../utils/logger.js';

export const seedBilling = async (): Promise<void> => {
  logger.info('Seeding customer billing records...', 'SeedBilling');

  const customers = await CustomerModel.find();
  let billCount = 0;
  const now = Date.now();
  const dayMs = 24 * 60 * 60 * 1000;

  for (const cust of customers) {
    const existing = await BillingRecordModel.findOne({ customerId: cust.customerId });
    if (existing) continue;

    const numId = parseInt(cust.customerId.replace('CUST-', ''), 10) || 1000;

    // 1. Consistent & Loyalty: Completely Paid bills
    if (numId <= 1055) {
      for (let m = 1; m <= 3; m++) {
        await BillingRecordModel.create({
          customerId: cust.customerId,
          customerRef: cust._id,
          invoiceId: `INV-${cust.customerId}-2026M0${m}`,
          invoiceAmount: 79.99,
          outstandingAmount: 0,
          currency: 'USD',
          invoiceDate: new Date(now - m * 30 * dayMs),
          dueDate: new Date(now - (m * 30 - 15) * dayMs),
          paymentDate: new Date(now - (m * 30 - 10) * dayMs),
          paymentStatus: PaymentStatus.PAID,
          invoiceStatus: InvoiceStatus.CLOSED
        });
        billCount++;
      }
    }
    // 2. Declining & Inactive: Mostly paid, minor pending
    else if (numId <= 1100) {
      await BillingRecordModel.create({
        customerId: cust.customerId,
        customerRef: cust._id,
        invoiceId: `INV-${cust.customerId}-HIST01`,
        invoiceAmount: 49.99,
        outstandingAmount: 0,
        currency: 'USD',
        invoiceDate: new Date(now - 60 * dayMs),
        dueDate: new Date(now - 45 * dayMs),
        paymentDate: new Date(now - 42 * dayMs),
        paymentStatus: PaymentStatus.PAID,
        invoiceStatus: InvoiceStatus.CLOSED
      });
      billCount++;
    }
    // 3. Overdue Customers (1101 - 1120): Significant outstanding overdue balances
    else {
      const overdueDays = 15 + (numId - 1100) * 2;
      const overdueAmount = 89.99 + (numId - 1100) * 15;

      // Unpaid Overdue Invoice
      await BillingRecordModel.create({
        customerId: cust.customerId,
        customerRef: cust._id,
        invoiceId: `INV-${cust.customerId}-OVERDUE`,
        invoiceAmount: overdueAmount,
        outstandingAmount: numId % 2 === 0 ? overdueAmount * 0.6 : overdueAmount, // half are partially paid
        currency: 'USD',
        invoiceDate: new Date(now - (overdueDays + 20) * dayMs),
        dueDate: new Date(now - overdueDays * dayMs),
        paymentStatus: numId % 2 === 0 ? PaymentStatus.PARTIALLY_PAID : PaymentStatus.OVERDUE,
        invoiceStatus: InvoiceStatus.ACTIVE,
        disputeStatus: numId % 4 === 0 ? 'BILLING_DISPUTE' : 'NONE',
        notes: `Account has past due balance of ${overdueAmount}`
      });
      billCount++;
    }
  }

  logger.info(`Seeded ${billCount} billing records.`, 'SeedBilling');
};

if (process.argv[1]?.endsWith('seed-billing.ts') || process.argv[1]?.endsWith('seed-billing.js')) {
  (async () => {
    try {
      await connectDatabase();
      await seedBilling();
      await disconnectDatabase();
      process.exit(0);
    } catch (err) {
      console.error(err);
      process.exit(1);
    }
  })();
}
