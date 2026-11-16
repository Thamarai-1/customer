import mongoose, { Schema, Document, Model, Types } from 'mongoose';

export interface IRefreshToken extends Document {
  userId: Types.ObjectId;
  tokenId: string;
  isRevoked: boolean;
  replacedByTokenId?: string;
  expiresAt: Date;
  createdAt: Date;
}

const RefreshTokenSchema = new Schema<IRefreshToken>(
  {
    userId: {
      type: Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true
    },
    tokenId: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    isRevoked: {
      type: Boolean,
      default: false,
      index: true
    },
    replacedByTokenId: {
      type: String
    },
    expiresAt: {
      type: Date,
      required: true,
      index: { expires: 0 } // TTL index automatically cleans up expired tokens
    }
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    collection: 'refresh_tokens'
  }
);

export const RefreshTokenModel: Model<IRefreshToken> =
  mongoose.models.RefreshToken ||
  mongoose.model<IRefreshToken>('RefreshToken', RefreshTokenSchema);
