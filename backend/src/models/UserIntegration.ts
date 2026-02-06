import mongoose, { Schema, Document } from "mongoose";

export interface IUserIntegration extends Document {
  contextKey: string;
  iframeOrScript: string;
  createdAt: Date;
  updatedAt: Date;
}

const UserIntegrationSchema = new Schema<IUserIntegration>(
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
    collection: "user_integrations"
  }
);

export const UserIntegration = mongoose.model<IUserIntegration>(
  "UserIntegration",
  UserIntegrationSchema
);
