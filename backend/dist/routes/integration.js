"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.integrationRouter = void 0;
const express_1 = require("express");
const UserIntegration_1 = require("../models/UserIntegration");
const AdminIntegration_1 = require("../models/AdminIntegration");
const mongodb_1 = require("../mongodb");
exports.integrationRouter = (0, express_1.Router)();
// Ensure MongoDB connection
exports.integrationRouter.use(async (_req, _res, next) => {
    try {
        await (0, mongodb_1.connectMongoDB)();
        next();
    }
    catch (error) {
        next(error);
    }
});
// Create or update integration (public endpoint)
exports.integrationRouter.post("/", async (req, res) => {
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
            const existingCount = await UserIntegration_1.UserIntegration.countDocuments({});
            const isNew = existingCount === 0;
            // Delete all existing user integrations to ensure only one document exists
            await UserIntegration_1.UserIntegration.deleteMany({});
            // Create the new integration (only one document will exist)
            const integration = await UserIntegration_1.UserIntegration.create(integrationData);
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
        else {
            // Check if any integration exists
            const existingCount = await AdminIntegration_1.AdminIntegration.countDocuments({});
            const isNew = existingCount === 0;
            // Delete all existing admin integrations to ensure only one document exists
            await AdminIntegration_1.AdminIntegration.deleteMany({});
            // Create the new integration (only one document will exist)
            const integration = await AdminIntegration_1.AdminIntegration.create(integrationData);
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
    }
    catch (error) {
        console.error("Error saving integration:", error);
        res.status(500).json({
            message: "Failed to save integration",
            error: error.message
        });
    }
});
// Get integration by role (only one document per role exists)
exports.integrationRouter.get("/:role", async (req, res) => {
    try {
        const { role } = req.params;
        if (role !== "user" && role !== "admin") {
            return res.status(400).json({
                message: "role must be either 'user' or 'admin'"
            });
        }
        if (role === "user") {
            const integration = await UserIntegration_1.UserIntegration.findOne({});
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
        else {
            const integration = await AdminIntegration_1.AdminIntegration.findOne({});
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
    }
    catch (error) {
        console.error("Error fetching integration:", error);
        res.status(500).json({
            message: "Failed to fetch integration",
            error: error.message
        });
    }
});
// Delete integration by role (deletes the single document for that role)
exports.integrationRouter.delete("/:role", async (req, res) => {
    try {
        const { role } = req.params;
        if (role !== "user" && role !== "admin") {
            return res.status(400).json({
                message: "role must be either 'user' or 'admin'"
            });
        }
        if (role === "user") {
            const result = await UserIntegration_1.UserIntegration.deleteMany({});
            if (result.deletedCount === 0) {
                return res.status(404).json({
                    message: "Integration not found"
                });
            }
            return res.json({
                message: "Integration deleted successfully"
            });
        }
        else {
            const result = await AdminIntegration_1.AdminIntegration.deleteMany({});
            if (result.deletedCount === 0) {
                return res.status(404).json({
                    message: "Integration not found"
                });
            }
            return res.json({
                message: "Integration deleted successfully"
            });
        }
    }
    catch (error) {
        console.error("Error deleting integration:", error);
        res.status(500).json({
            message: "Failed to delete integration",
            error: error.message
        });
    }
});
