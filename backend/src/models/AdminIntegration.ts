import mongoose, { Schema, Document } from "mongoose";

export interface IAdminIntegration extends Document {
  contextKey: string;
  iframeOrScript: string;
  createdAt: Date;
  updatedAt: Date;
}

const AdminIntegrationSchema = new Schema<IAdminIntegration>(
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
    collection: "admin_integrations"
  }
);

export const AdminIntegration = mongoose.model<IAdminIntegration>(
  "AdminIntegration",
  AdminIntegrationSchema
);
