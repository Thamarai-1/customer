import { CustomerType, AccountStatus, LoyaltyTier, PlanStatus } from './customer.model.js';

export interface CreateCustomerDTO {
  customerId: string;
  firstName: string;
  lastName: string;
  email: string;
  phone?: string;
  customerType?: CustomerType;
  accountStatus?: AccountStatus;
  loyaltyInfo?: {
    loyaltyTier?: LoyaltyTier;
    loyaltyPoints?: number;
    membershipStartDate?: Date;
  };
  subscription?: {
    activePlan: string;
    planType?: string;
    planStatus?: PlanStatus;
    planStartDate?: Date;
    planEndDate?: Date;
  };
  source?: string;
}

export interface UpdateCustomerDTO {
  firstName?: string;
  lastName?: string;
  email?: string;
  phone?: string;
  customerType?: CustomerType;
  loyaltyInfo?: {
    loyaltyTier?: LoyaltyTier;
    loyaltyPoints?: number;
    membershipStartDate?: Date;
  };
  subscription?: {
    activePlan?: string;
    planType?: string;
    planStatus?: PlanStatus;
    planStartDate?: Date;
    planEndDate?: Date;
  };
}

export interface CustomerQueryFilters {
  search?: string;
  loyaltyTier?: LoyaltyTier;
  accountStatus?: AccountStatus;
  activePlan?: string;
  planStatus?: PlanStatus;
  customerType?: CustomerType;
  page?: number;
  limit?: number;
  sortBy?: string;
  sortOrder?: 'asc' | 'desc';
}
