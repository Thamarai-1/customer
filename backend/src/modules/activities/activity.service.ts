import { ActivityModel, ICustomerActivity, ActivityType } from './activity.model.js';
import { CustomerRepository } from '../customers/customer.repository.js';
import { PaginationQueryOptions, getPaginationMeta } from '../../utils/pagination.js';
import { PaginationMeta } from '../../types/index.js';

export interface CreateActivityDTO {
  activityType: ActivityType;
  activityDate?: Date | string;
  source?: string;
  metadata?: Record<string, unknown>;
}

export interface ActivitySummary {
  customerId: string;
  lastActivityDate: Date | null;
  activityCount30d: number;
  activityCountPrevious30d: number;
  activityTrend: 'INCREASING' | 'DECREASING' | 'STABLE' | 'NO_RECENT_ACTIVITY';
  recentActivityBreakdown: Record<string, number>;
}

export class ActivityService {
  static async createActivity(
    customerIdOrId: string,
    data: CreateActivityDTO
  ): Promise<ICustomerActivity> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    const activity = await ActivityModel.create({
      customerId: customer.customerId,
      customerRef: customer._id,
      activityType: data.activityType,
      activityDate: data.activityDate ? new Date(data.activityDate) : new Date(),
      source: data.source || 'WEB',
      metadata: data.metadata
    });

    return activity;
  }

  static async getActivities(
    customerIdOrId: string,
    pagination: PaginationQueryOptions,
    filters: { activityType?: ActivityType; startDate?: string; endDate?: string } = {}
  ): Promise<{ activities: ICustomerActivity[]; meta: PaginationMeta }> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    const query: Record<string, unknown> = {
      $or: [{ customerId: customer.customerId }, { customerRef: customer._id }]
    };

    if (filters.activityType) {
      query.activityType = filters.activityType;
    }

    if (filters.startDate || filters.endDate) {
      const dateQuery: Record<string, Date> = {};
      if (filters.startDate) dateQuery.$gte = new Date(filters.startDate);
      if (filters.endDate) dateQuery.$lte = new Date(filters.endDate);
      query.activityDate = dateQuery;
    }

    const [activities, total] = await Promise.all([
      ActivityModel.find(query)
        .sort({ activityDate: -1 })
        .skip(pagination.skip)
        .limit(pagination.limit)
        .lean(),
      ActivityModel.countDocuments(query)
    ]);

    const meta = getPaginationMeta(total, pagination.page, pagination.limit);
    return { activities: activities as unknown as ICustomerActivity[], meta };
  }

  static async getActivitySummary(customerIdOrId: string): Promise<ActivitySummary> {
    const customer = await CustomerRepository.findByIdOrCustomerId(customerIdOrId);
    if (!customer) {
      throw new Error('CUSTOMER_NOT_FOUND');
    }

    const now = new Date();
    const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);
    const sixtyDaysAgo = new Date(now.getTime() - 60 * 24 * 60 * 60 * 1000);

    const customerQuery = {
      $or: [{ customerId: customer.customerId }, { customerRef: customer._id }]
    };

    const [latestActivity, count30d, countPrev30d, breakdownAgg] = await Promise.all([
      ActivityModel.findOne(customerQuery).sort({ activityDate: -1 }),
      ActivityModel.countDocuments({
        ...customerQuery,
        activityDate: { $gte: thirtyDaysAgo, $lte: now }
      }),
      ActivityModel.countDocuments({
        ...customerQuery,
        activityDate: { $gte: sixtyDaysAgo, $lt: thirtyDaysAgo }
      }),
      ActivityModel.aggregate([
        {
          $match: {
            ...customerQuery,
            activityDate: { $gte: thirtyDaysAgo }
          }
        },
        {
          $group: {
            _id: '$activityType',
            count: { $sum: 1 }
          }
        }
      ])
    ]);

    const breakdown: Record<string, number> = {};
    breakdownAgg.forEach((item: { _id: string; count: number }) => {
      breakdown[item._id] = item.count;
    });

    let trend: ActivitySummary['activityTrend'] = 'STABLE';
    if (count30d === 0 && countPrev30d === 0) {
      trend = 'NO_RECENT_ACTIVITY';
    } else if (count30d > countPrev30d * 1.2) {
      trend = 'INCREASING';
    } else if (count30d < countPrev30d * 0.8) {
      trend = 'DECREASING';
    }

    return {
      customerId: customer.customerId,
      lastActivityDate: latestActivity ? latestActivity.activityDate : null,
      activityCount30d: count30d,
      activityCountPrevious30d: countPrev30d,
      activityTrend: trend,
      recentActivityBreakdown: breakdown
    };
  }
}
