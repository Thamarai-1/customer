import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export enum PreferredChannel {
  EMAIL = 'EMAIL',
  SMS = 'SMS',
  WHATSAPP = 'WHATSAPP',
  PORTAL = 'PORTAL'
}

export interface ICommunicationPreference extends Document {
  customerId: string;
  customerRef?: Types.ObjectId;
  emailConsent: boolean;
  smsConsent: boolean;
  whatsappConsent: boolean;
  preferredChannel: PreferredChannel;
  optedOut: boolean;
  consentUpdatedAt: Date;
  consentSource: string;
  notes?: string;
  createdAt: Date;
  updatedAt: Date;
}

const CommunicationPreferenceSchema = new Schema<ICommunicationPreference>(
  {
    customerId: {
      type: String,
      required: true,
      unique: true,
      index: true,
      uppercase: true,
      trim: true
    },
    customerRef: {
      type: Schema.Types.ObjectId,
      ref: 'Customer',
      index: true
    },
    emailConsent: {
      type: Boolean,
      default: false,
      required: true
    },
    smsConsent: {
      type: Boolean,
      default: false,
      required: true
    },
    whatsappConsent: {
      type: Boolean,
      default: false,
      required: true
    },
    preferredChannel: {
      type: String,
      enum: Object.values(PreferredChannel),
      default: PreferredChannel.EMAIL,
      required: true
    },
    optedOut: {
      type: Boolean,
      default: false,
      index: true
    },
    consentUpdatedAt: {
      type: Date,
      default: Date.now,
      required: true
    },
    consentSource: {
      type: String,
      default: 'ACCOUNT_ONBOARDING',
      trim: true
    },
    notes: {
      type: String,
      trim: true
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
