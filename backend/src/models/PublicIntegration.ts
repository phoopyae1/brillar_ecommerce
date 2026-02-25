import mongoose, { Schema, Document } from "mongoose";

export interface IPublicIntegration extends Document {
  contextKey: string;
  iframeOrScript: string;
  createdAt: Date;
  updatedAt: Date;
}

const PublicIntegrationSchema = new Schema<IPublicIntegration>(
  {
    contextKey: {
      type: String,
      required: true,
      unique: true,
      trim: true
    },
    iframeOrScript: {
      type: String,
      required: true
    }
  },
  {
    timestamps: true,
    collection: "public_integrations"
  }
);

export const PublicIntegration = mongoose.model<IPublicIntegration>(
  "PublicIntegration",
  PublicIntegrationSchema
);
