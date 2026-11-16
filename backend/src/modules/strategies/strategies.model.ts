import mongoose, { Document, Schema } from 'mongoose';
import { CustomerSegmentType } from '../segmentation/segmentation.constants.js';
import { StrategyObjective, CommunicationTone, IStrategyConfig } from './strategies.types.js';

export interface IStrategyConfigDocument extends IStrategyConfig, Document {}

const StrategyConfigSchema = new Schema<IStrategyConfigDocument>(
  {
    segment: {
      type: String,
      enum: Object.values(CustomerSegmentType),
      required: true,
      unique: true,
      index: true
    },
    objective: {
      type: String,
      enum: Object.values(StrategyObjective),
      required: true
    },
    primaryTone: {
      type: String,
      enum: Object.values(CommunicationTone),
      required: true
    },
    alternativeTones: {
      type: [String],
      enum: Object.values(CommunicationTone),
      default: []
    },
    recommendedActions: {
      type: [String],
      default: []
    },
    priority: {
      type: Number,
      required: true,
      min: 1
    },
    description: {
      type: String,
      required: true
    },
    allowPromotionsWithOverdue: {
      type: Boolean,
      default: false
    },
    isActive: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true,
    collection: 'strategy_configs'
  }
);

export const StrategyConfigModel = mongoose.model<IStrategyConfigDocument>(
  'StrategyConfig',
  StrategyConfigSchema
);
