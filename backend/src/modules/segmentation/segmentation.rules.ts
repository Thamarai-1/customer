import { DEFAULT_SEGMENT_PRIORITY } from './segmentation.constants.js';
import { ISegmentationConfig } from './segmentation.types.js';

/**
 * Default Segmentation Rules and Thresholds
 * 
 * NOTE: These initial values represent demonstration assumptions for the
 * HCLTech Future Ready AI Engineer Hackathon. They are stored in MongoDB
 * and can be dynamically reconfigured by administrators via API.
 */
export const DEFAULT_SEGMENTATION_CONFIG: ISegmentationConfig = {
  ruleVersion: '1.0.0',
  activityObservationDays: 30,
  previousActivityComparisonDays: 30, // Days 31 to 60
  activityReductionThresholdPercent: 50, // >= 50% drop from baseline qualifies as declining
  minBaselineActivityCount: 3, // Requires at least 3 activities in previous window for statistical significance
  inactivityThresholdDays: 60, // >= 60 days without any activity qualifies as dormant/inactive
  minTotalActivitiesForHistory: 2, // If customer has < 2 lifetime activities, flag insufficient history
  loyaltyPointsThreshold: 1000, // Loyalty points needed to consider as candidate
  membershipDurationDaysThreshold: 180, // ~6 months tenure
  consistentMinMonthlyActivities: 4, // ~1 interaction/week for consistent engagement
  segmentPriority: [...DEFAULT_SEGMENT_PRIORITY],
  notes: 'Demonstration configuration with standard retail and telecom enterprise thresholds.'
};
