import { CustomerRepository } from './customer.repository.js';
import { ICustomer, AccountStatus, LoyaltyTier, PlanStatus } from './customer.model.js';
import { CreateCustomerDTO, UpdateCustomerDTO, CustomerQueryFilters } from './customer.types.js';
import { PaginationQueryOptions, getPaginationMeta } from '../../utils/pagination.js';
import { PaginationMeta } from '../../types/index.js';

export class CustomerService {
  static async createCustomer(data: CreateCustomerDTO): Promise<ICustomer> {
    const existingById = await CustomerRepository.findByCustomerId(data.customerId);
    if (existingById) {
      throw new Error('CUSTOMER_ID_ALREADY_EXISTS');
    }

    const existingByEmail = await CustomerRepository.findByEmail(data.email);
    if (existingByEmail) {
      throw new Error('EMAIL_ALREADY_EXISTS');
    }

    const docData: Partial<ICustomer> = {
      ...data,
      loyaltyInfo: {
        loyaltyTier: data.loyaltyInfo?.loyaltyTier || LoyaltyTier.BRONZE,
        loyaltyPoints: data.loyaltyInfo?.loyaltyPoints ?? 0,
        membershipStartDate: data.loyaltyInfo?.membershipStartDate
          ? new Date(data.loyaltyInfo.membershipStartDate)
          : new Date()
      },
      subscription: {
        activePlan: data.subscription?.activePlan || 'Standard',
        planType: data.subscription?.planType || 'Postpaid',
        planStatus: data.subscription?.planStatus || PlanStatus.ACTIVE,
        planStartDate: data.subscription?.planStartDate
          ? new Date(data.subscription.planStartDate)
          : new Date(),
        planEndDate: data.subscription?.planEndDate
          ? new Date(data.subscription.planEndDate)
          : undefined
      }
    };

    return CustomerRepository.create(docData);
  }

  static async getCustomers(
    filters: CustomerQueryFilters,
    pagination: PaginationQueryOptions
  ): Promise<{ customers: ICustomer[]; meta: PaginationMeta }> {
    const { customers, total } = await CustomerRepository.findWithPagination(filters, pagination);
    const meta = getPaginationMeta(total, pagination.page, pagination.limit);
    return { customers, meta };
  }

  static async getCustomerById(id: string): Promise<ICustomer | null> {
    return CustomerRepository.findByIdOrCustomerId(id);
  }

  static async updateCustomer(id: string, data: UpdateCustomerDTO): Promise<ICustomer | null> {
    const customer = await CustomerRepository.findByIdOrCustomerId(id);
    if (!customer) {
      return null;
    }

    if (data.email && data.email.toLowerCase().trim() !== customer.email) {
      const existingEmail = await CustomerRepository.findByEmail(data.email);
      if (existingEmail && existingEmail._id.toString() !== customer._id.toString()) {
        throw new Error('EMAIL_ALREADY_EXISTS');
      }
      customer.email = data.email.toLowerCase().trim();
    }

    if (data.firstName) customer.firstName = data.firstName.trim();
    if (data.lastName) customer.lastName = data.lastName.trim();
    if (data.phone !== undefined) customer.phone = data.phone?.trim();
    if (data.customerType) customer.customerType = data.customerType;

    if (data.loyaltyInfo) {
      customer.loyaltyInfo = {
        ...customer.loyaltyInfo,
        ...data.loyaltyInfo
      };
    }

    if (data.subscription) {
      customer.subscription = {
        ...customer.subscription,
        ...data.subscription
      };
    }

    return customer.save();
  }

  static async updateStatus(id: string, status: AccountStatus): Promise<ICustomer | null> {
    const customer = await CustomerRepository.findByIdOrCustomerId(id);
    if (!customer) {
      return null;
    }
    customer.accountStatus = status;
    return customer.save();
  }

  static async deleteCustomer(id: string): Promise<ICustomer | null> {
    return CustomerRepository.softDelete(id);
  }
}
