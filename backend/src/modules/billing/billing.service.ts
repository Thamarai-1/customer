import { BillingRecordModel, IBillingRecord, PaymentStatus, InvoiceStatus } from './billing-record.model.js';
import { CustomerRepository } from '../customers/customer.repository.js';
import { PaginationQueryOptions, getPaginationMeta } from '../../utils/pagination.js';
import { PaginationMeta } from '../../types/index.js';

export interface CreateBillingDTO {
  invoiceId: string;
  invoiceAmount: number;
  outstandingAmount: number;
  currency?: string;
  invoiceDate?: Date | string;
  dueDate: Date | string;
  paymentDate?: Date | string;
  paymentStatus?: PaymentStatus;
  invoiceStatus?: InvoiceStatus;
  disputeStatus?: string;
  notes?: string;
}

export interface BillingSummary {
  customerId: string;
  totalInvoiced: number;
  totalOutstanding: number;
  currency: string;
  paymentStatus: PaymentStatus;
  overdueInvoicesCount: number;
  hasDisputedInvoices: boolean;
  latestInvoiceDate: Date | null;
}

export class BillingService {
  static async createBillingRecord(
    customerIdOrId: string,
    data: CreateBillingDTO
  ): Promise<IBillingRecord> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    const existingInvoice = await BillingRecordModel.findOne({
      invoiceId: data.invoiceId.trim().toUpperCase()
    });
    if (existingInvoice) {
      throw new Error('INVOICE_ID_ALREADY_EXISTS');
    }

    const record = await BillingRecordModel.create({
      customerId: customer.customerId,
      customerRef: customer._id,
      invoiceId: data.invoiceId.trim().toUpperCase(),
      invoiceAmount: data.invoiceAmount,
      outstandingAmount: data.outstandingAmount,
      currency: data.currency ? data.currency.trim().toUpperCase() : 'USD',
      invoiceDate: data.invoiceDate ? new Date(data.invoiceDate) : new Date(),
      dueDate: new Date(data.dueDate),
      paymentDate: data.paymentDate ? new Date(data.paymentDate) : undefined,
      paymentStatus: data.paymentStatus || PaymentStatus.PENDING,
      invoiceStatus: data.invoiceStatus || InvoiceStatus.ACTIVE,
      disputeStatus: data.disputeStatus || 'NONE',
      notes: data.notes
    });

    return record;
  }

  static async getCustomerBilling(
    customerIdOrId: string,
    pagination: PaginationQueryOptions,
    filters: { paymentStatus?: PaymentStatus; startDate?: string; endDate?: string } = {}
  ): Promise<{ billingRecords: IBillingRecord[]; meta: PaginationMeta }> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    const query: Record<string, unknown> = {
      $or: [{ customerId: customer.customerId }, { customerRef: customer._id }]
    };

    if (filters.paymentStatus) {
      query.paymentStatus = filters.paymentStatus;
    }

    if (filters.startDate || filters.endDate) {
      const dateQuery: Record<string, Date> = {};
      if (filters.startDate) dateQuery.$gte = new Date(filters.startDate);
      if (filters.endDate) dateQuery.$lte = new Date(filters.endDate);
      query.invoiceDate = dateQuery;
    }

    const [billingRecords, total] = await Promise.all([
      BillingRecordModel.find(query)
        .sort({ invoiceDate: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      BillingRecordModel.countDocuments(query)
    ]);

    const meta = getPaginationMeta(total, pagination.page, pagination.limit);
    return { billingRecords: billingRecords as unknown as IBillingRecord[], meta };
  }

  static async getCustomerBillingSummary(customerIdOrId: string): Promise<BillingSummary> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    const customerQuery = {
      $or: [{ customerId: customer.customerId }, { customerRef: customer._id }]
    };

    const [records, latestRecord] = await Promise.all([
      BillingRecordModel.find(customerQuery).sort({ invoiceDate: -1 }),
      BillingRecordModel.findOne(customerQuery).sort({ invoiceDate: -1 })
    ]);

    let totalInvoiced = 0;
    let totalOutstanding = 0;
    let overdueCount = 0;
    let hasDisputes = false;
    let primaryCurrency = 'USD';

    for (const rec of records) {
      totalInvoiced += rec.invoiceAmount;
      totalOutstanding += rec.outstandingAmount;
      if (rec.currency) primaryCurrency = rec.currency;
      if (rec.paymentStatus === PaymentStatus.OVERDUE) {
        overdueCount++;
      }
      if (rec.disputeStatus && rec.disputeStatus !== 'NONE') {
        hasDisputes = true;
      }
    }

    let overallPaymentStatus = PaymentStatus.PAID;
    if (overdueCount > 0) {
      overallPaymentStatus = PaymentStatus.OVERDUE;
    } else if (totalOutstanding > 0) {
      overallPaymentStatus = PaymentStatus.PENDING;
    } else if (records.length === 0) {
      overallPaymentStatus = PaymentStatus.PAID;
    }

    return {
      customerId: customer.customerId,
      totalInvoiced: Math.round(totalInvoiced * 100) / 100,
      totalOutstanding: Math.round(totalOutstanding * 100) / 100,
      currency: primaryCurrency,
      paymentStatus: overallPaymentStatus,
      overdueInvoicesCount: overdueCount,
      hasDisputedInvoices: hasDisputes,
      latestInvoiceDate: latestRecord ? latestRecord.invoiceDate : null
    };
  }

  static async getAllBilling(
    pagination: PaginationQueryOptions,
    filters: { paymentStatus?: PaymentStatus; invoiceStatus?: InvoiceStatus; customerId?: string } = {}
  ): Promise<{ billingRecords: IBillingRecord[]; meta: PaginationMeta }> {
    const query: Record<string, unknown> = {};

    if (filters.paymentStatus) query.paymentStatus = filters.paymentStatus;
    if (filters.invoiceStatus) query.invoiceStatus = filters.invoiceStatus;
    if (filters.customerId) query.customerId = filters.customerId.trim().toUpperCase();

    const [billingRecords, total] = await Promise.all([
      BillingRecordModel.find(query)
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      BillingRecordModel.countDocuments(query)
    ]);

    const meta = getPaginationMeta(total, pagination.page, pagination.limit);
    return { billingRecords: billingRecords as unknown as IBillingRecord[], meta };
  }
}
