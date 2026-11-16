import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum PreferredChannel {
  EMAIL = 'email',
  SMS = 'sms',
  PORTAL = 'portal'
}

export interface ICommunicationPreference extends Document {
  customerRef: Types.ObjectId;
  customerId: string;
  emailOptIn: boolean;
  smsOptIn: boolean;
  preferredChannel: PreferredChannel;
  frequencyCapPerWeek: number;
  doNotDisturb: boolean;
  blacklistedTopics: string[];
  lastConsentDate: Date;
  consentSource?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationPreferenceSchema = new Schema<ICommunicationPreference>(
  {
    customerRef: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      required: true,
      unique: true,
      index: true
    },
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    emailOptIn: {
      type: Boolean,
      default: true
    },
    smsOptIn: {
      type: Boolean,
      default: false
    },
    preferredChannel: {
      type: String,
      enum: Object.values(PreferredChannel),
      default: PreferredChannel.EMAIL
    },
    frequencyCapPerWeek: {
      type: Number,
      default: 3,
      min: 0,
      max: 14
    },
    doNotDisturb: {
      type: Boolean,
      default: false,
      index: true
    },
    blacklistedTopics: {
      type: [String],
      default: []
    },
    lastConsentDate: {
      type: Date,
      default: Date.now
    },
    consentSource: {
      type: String,
      default: 'account_onboarding'
    }
  },
  {
    timestamps: true,
    collection: 'communication_preferences'
  }
);

export const CommunicationPreferenceModel: Model<ICommunicationPreference> =
  mongoose.models.CommunicationPreference ||
  mongoose.model<ICommunicationPreference>('CommunicationPreference', CommunicationPreferenceSchema);
