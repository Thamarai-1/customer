import { Request, Response } from 'express';
import { BillingService } from './billing.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';
import { getPaginationParams } from '../../utils/pagination.js';
import { PaymentStatus, InvoiceStatus } from './billing-record.model.js';

export class BillingController {
  static async createForCustomer(req: Request, res: Response): Promise<void> {
    const customerId = req.params.id as string;
    try {
      const record = await BillingService.createBillingRecord(customerId, req.body);
      ResponseUtil.success(res, 'Billing record created successfully', record, undefined, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, `Customer '${customerId}' not found`, 'NOT_FOUND', undefined, 404);
        return;
      }
      if (message === 'INVOICE_ID_ALREADY_EXISTS') {
        ResponseUtil.error(res, 'Invoice ID already exists', 'CONFLICT', undefined, 409);
        return;
      }
      ResponseUtil.error(res, 'Failed to create billing record', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }

  static async listForCustomer(req: Request, res: Response): Promise<void> {
    const customerId = req.params.id as string;
    try {
      const pagination = getPaginationParams(req.query as Record<string, unknown>);
      const filters = {
        paymentStatus: req.query.paymentStatus as PaymentStatus,
        startDate: req.query.startDate as string,
        endDate: req.query.endDate as string
      };

      const result = await BillingService.getCustomerBilling(customerId, pagination, filters);
      ResponseUtil.success(res, 'Customer billing records retrieved', result.billingRecords, result.meta, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, `Customer '${customerId}' not found`, 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, 'Failed to retrieve billing records', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }

  static async getSummaryForCustomer(req: Request, res: Response): Promise<void> {
    const customerId = req.params.id as string;
    try {
      const summary = await BillingService.getCustomerBillingSummary(customerId);
      ResponseUtil.success(res, 'Billing summary calculated successfully', summary, undefined, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, `Customer '${customerId}' not found`, 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, 'Failed to calculate billing summary', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }

  static async listAll(req: Request, res: Response): Promise<void> {
    const pagination = getPaginationParams(req.query as Record<string, unknown>);
    const filters = {
      paymentStatus: req.query.paymentStatus as PaymentStatus,
      invoiceStatus: req.query.invoiceStatus as InvoiceStatus,
      customerId: req.query.customerId as string
    };

    const result = await BillingService.getAllBilling(pagination, filters);
    ResponseUtil.success(res, 'Billing records retrieved successfully', result.billingRecords, result.meta, 200);
  }
}
