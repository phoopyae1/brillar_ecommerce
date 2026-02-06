import { Router } from "express";
import { UserIntegration } from "../models/UserIntegration";
import { AdminIntegration } from "../models/AdminIntegration";
import { connectMongoDB } from "../mongodb";

export const integrationRouter = Router();

// Ensure MongoDB connection
integrationRouter.use(async (_req, _res, next) => {
  try {
    await connectMongoDB();
    next();
  } catch (error) {
    next(error);
  }
});

// Create or update integration (public endpoint)
integrationRouter.post("/", async (req, res) => {
  try {
    const { contextKey, iframeOrScript, role } = req.body;

    if (!contextKey || !iframeOrScript || !role) {
      return res.status(400).json({
        message: "contextKey, iframeOrScript, and role are required"
      });
    }

    if (role !== "user" && role !== "admin") {
      return res.status(400).json({
        message: "role must be either 'user' or 'admin'"
      });
    }

    const integrationData = {
      contextKey: contextKey.trim(),
      iframeOrScript: iframeOrScript.trim()
    };

    // Only one integration document per role - delete all existing ones before creating new
    if (role === "user") {
      // Check if any integration exists
      const existingCount = await UserIntegration.countDocuments({});
      const isNew = existingCount === 0;

      // Delete all existing user integrations to ensure only one document exists
      await UserIntegration.deleteMany({});

      // Create the new integration (only one document will exist)
      const integration = await UserIntegration.create(integrationData);

      return res.status(200).json({
        message: isNew 
          ? "Integration created successfully" 
          : "Integration replaced successfully (all previous data removed)",
        integration: {
          id: integration._id,
          contextKey: integration.contextKey,
          iframeOrScript: integration.iframeOrScript,
          role,
          createdAt: integration.createdAt,
          updatedAt: integration.updatedAt
        },
        replaced: !isNew
      });
    } else {
      // Check if any integration exists
      const existingCount = await AdminIntegration.countDocuments({});
      const isNew = existingCount === 0;

      // Delete all existing admin integrations to ensure only one document exists
      await AdminIntegration.deleteMany({});

      // Create the new integration (only one document will exist)
      const integration = await AdminIntegration.create(integrationData);

      return res.status(200).json({
        message: isNew 
          ? "Integration created successfully" 
          : "Integration replaced successfully (all previous data removed)",
        integration: {
          id: integration._id,
          contextKey: integration.contextKey,
          iframeOrScript: integration.iframeOrScript,
          role,
          createdAt: integration.createdAt,
          updatedAt: integration.updatedAt
        },
        replaced: !isNew
      });
    }
  } catch (error: any) {
    console.error("Error saving integration:", error);
    res.status(500).json({
      message: "Failed to save integration",
      error: error.message
    });
  }
});

// Get integration by role (only one document per role exists)
integrationRouter.get("/:role", async (req, res) => {
  try {
    const { role } = req.params;

    if (role !== "user" && role !== "admin") {
      return res.status(400).json({
        message: "role must be either 'user' or 'admin'"
      });
    }

    if (role === "user") {
      const integration = await UserIntegration.findOne({});
      if (!integration) {
        return res.status(404).json({
          message: "Integration not found"
        });
      }
      return res.json({
        id: integration._id,
        contextKey: integration.contextKey,
        iframeOrScript: integration.iframeOrScript,
        role,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt
      });
    } else {
      const integration = await AdminIntegration.findOne({});
      if (!integration) {
        return res.status(404).json({
          message: "Integration not found"
        });
      }
      return res.json({
        id: integration._id,
        contextKey: integration.contextKey,
        iframeOrScript: integration.iframeOrScript,
        role,
        createdAt: integration.createdAt,
        updatedAt: integration.updatedAt
      });
    }
  } catch (error: any) {
    console.error("Error fetching integration:", error);
    res.status(500).json({
      message: "Failed to fetch integration",
      error: error.message
    });
  }
});

// Delete integration by role (deletes the single document for that role)
integrationRouter.delete("/:role", async (req, res) => {
  try {
    const { role } = req.params;

    if (role !== "user" && role !== "admin") {
      return res.status(400).json({
        message: "role must be either 'user' or 'admin'"
      });
    }

    if (role === "user") {
      const result = await UserIntegration.deleteMany({});
      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Integration not found"
        });
      }
      return res.json({
        message: "Integration deleted successfully"
      });
    } else {
      const result = await AdminIntegration.deleteMany({});
      if (result.deletedCount === 0) {
        return res.status(404).json({
          message: "Integration not found"
        });
      }
      return res.json({
        message: "Integration deleted successfully"
      });
    }
  } catch (error: any) {
    console.error("Error deleting integration:", error);
    res.status(500).json({
      message: "Failed to delete integration",
      error: error.message
    });
  }
});
