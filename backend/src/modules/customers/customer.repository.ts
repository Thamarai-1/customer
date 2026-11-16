import mongoose from 'mongoose';
import { CustomerModel, ICustomer, AccountStatus } from './customer.model.js';
import { CustomerQueryFilters } from './customer.types.js';
import { PaginationQueryOptions } from '../../utils/pagination.js';

export class CustomerRepository {
  static async create(data: Partial<ICustomer>): Promise<ICustomer> {
    return CustomerModel.create(data);
  }

  static async findByIdOrCustomerId(id: string): Promise<ICustomer | null> {
    const isObjectId = mongoose.Types.ObjectId.isValid(id);
    if (isObjectId) {
      const doc = await CustomerModel.findById(id);
      if (doc) return doc;
    }
    return CustomerModel.findOne({ customerId: id.trim().toUpperCase() });
  }

  static async findByEmail(email: string): Promise<ICustomer | null> {
    return CustomerModel.findOne({ email: email.toLowerCase().trim() });
  }

  static async findByCustomerId(customerId: string): Promise<ICustomer | null> {
    return CustomerModel.findOne({ customerId: customerId.trim().toUpperCase() });
  }

  static async findWithPagination(
    filters: CustomerQueryFilters,
    pagination: PaginationQueryOptions
  ): Promise<{ customers: ICustomer[]; total: number }> {
    const query: Record<string, unknown> = {};

    // Do not show ARCHIVED by default unless explicitly asked
    if (filters.accountStatus) {
      query.accountStatus = filters.accountStatus;
    } else {
      query.accountStatus = { $ne: AccountStatus.ARCHIVED };
    }

    if (filters.loyaltyTier) {
      query['loyaltyInfo.loyaltyTier'] = filters.loyaltyTier;
    }

    if (filters.activePlan) {
      query['subscription.activePlan'] = new RegExp(filters.activePlan, 'i');
    }

    if (filters.planStatus) {
      query['subscription.planStatus'] = filters.planStatus;
    }

    if (filters.customerType) {
      query.customerType = filters.customerType;
    }

    if (pagination.search) {
      const searchRegex = new RegExp(pagination.search, 'i');
      query.$or = [
        { customerId: searchRegex },
        { firstName: searchRegex },
        { lastName: searchRegex },
        { email: searchRegex },
        { phone: searchRegex }
      ];
    }

    const [customers, total] = await Promise.all([
      CustomerModel.find(query)
        .sort({ [pagination.sortBy]: pagination.sortOrder })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      CustomerModel.countDocuments(query)
    ]);

    return { customers: customers as unknown as ICustomer[], total };
  }

  static async updateById(id: string, data: Partial<ICustomer>): Promise<ICustomer | null> {
    const customer = await this.findByIdOrCustomerId(id);
    if (!customer) return null;

    Object.assign(customer, data);
    return customer.save();
  }

  static async softDelete(id: string): Promise<ICustomer | null> {
    const customer = await this.findByIdOrCustomerId(id);
    if (!customer) return null;

    customer.accountStatus = AccountStatus.ARCHIVED;
    return customer.save();
  }
}
