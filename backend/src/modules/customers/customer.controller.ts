import { Request, Response } from 'express';
import { CustomerService } from './customer.service.js';
import { CustomerProfileService } from './customer-profile.service.js';
import { ResponseUtil } from '../../utils/apiResponse.js';
import { getPaginationParams } from '../../utils/pagination.js';
import { CustomerQueryFilters } from './customer.types.js';

export class CustomerController {
  static async getProfile(req: Request, res: Response): Promise<void> {
    const customerId = req.params.id as string;
    try {
      const profile = await CustomerProfileService.assembleProfile(customerId);
      ResponseUtil.success(res, 'Customer profile assembled successfully', profile, undefined, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'CUSTOMER_NOT_FOUND') {
        ResponseUtil.error(res, `Customer '${customerId}' not found`, 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.error(res, 'Failed to assemble customer profile', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }

  static async create(req: Request, res: Response): Promise<void> {
    try {
      const customer = await CustomerService.createCustomer(req.body);
      ResponseUtil.success(res, 'Customer created successfully', customer, undefined, 201);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'CUSTOMER_ID_ALREADY_EXISTS') {
        ResponseUtil.error(res, 'Customer with this ID already exists', 'CONFLICT', undefined, 409);
        return;
      }
      if (message === 'EMAIL_ALREADY_EXISTS') {
        ResponseUtil.error(res, 'Customer with this email address already exists', 'CONFLICT', undefined, 409);
        return;
      }
      ResponseUtil.error(res, 'Failed to create customer', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }

  static async list(req: Request, res: Response): Promise<void> {
    const pagination = getPaginationParams(req.query as Record<string, unknown>);
    const filters: CustomerQueryFilters = {
      loyaltyTier: req.query.loyaltyTier as CustomerQueryFilters['loyaltyTier'],
      accountStatus: req.query.accountStatus as CustomerQueryFilters['accountStatus'],
      activePlan: req.query.activePlan as string,
      planStatus: req.query.planStatus as CustomerQueryFilters['planStatus'],
      customerType: req.query.customerType as CustomerQueryFilters['customerType']
    };

    const result = await CustomerService.getCustomers(filters, pagination);
    ResponseUtil.success(res, 'Customers retrieved successfully', result.customers, result.meta, 200);
  }

  static async getById(req: Request, res: Response): Promise<void> {
    const customerId = req.params.id as string;
    const customer = await CustomerService.getCustomerById(customerId);
    if (!customer) {
      ResponseUtil.error(res, `Customer '${customerId}' not found`, 'NOT_FOUND', undefined, 404);
      return;
    }
    ResponseUtil.success(res, 'Customer retrieved successfully', customer, undefined, 200);
  }

  static async update(req: Request, res: Response): Promise<void> {
    const customerId = req.params.id as string;
    try {
      const customer = await CustomerService.updateCustomer(customerId, req.body);
      if (!customer) {
        ResponseUtil.error(res, `Customer '${customerId}' not found`, 'NOT_FOUND', undefined, 404);
        return;
      }
      ResponseUtil.success(res, 'Customer updated successfully', customer, undefined, 200);
    } catch (error: unknown) {
      const message = error instanceof Error ? error.message : String(error);
      if (message === 'EMAIL_ALREADY_EXISTS') {
        ResponseUtil.error(res, 'Email address already in use by another customer', 'CONFLICT', undefined, 409);
        return;
      }
      ResponseUtil.error(res, 'Failed to update customer', 'INTERNAL_SERVER_ERROR', undefined, 500);
    }
  }

  static async updateStatus(req: Request, res: Response): Promise<void> {
    const customerId = req.params.id as string;
    const customer = await CustomerService.updateStatus(customerId, req.body.status);
    if (!customer) {
      ResponseUtil.error(res, `Customer '${customerId}' not found`, 'NOT_FOUND', undefined, 404);
      return;
    }
    ResponseUtil.success(res, 'Customer status updated successfully', customer, undefined, 200);
  }

  static async delete(req: Request, res: Response): Promise<void> {
    const customerId = req.params.id as string;
    const customer = await CustomerService.deleteCustomer(customerId);
    if (!customer) {
      ResponseUtil.error(res, `Customer '${customerId}' not found`, 'NOT_FOUND', undefined, 404);
      return;
    }
    ResponseUtil.success(res, 'Customer archived successfully', customer, undefined, 200);
  }
}
