"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryRouter = void 0;
const express_1 = require("express");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const validate_1 = require("../middleware/validate");
const shared_1 = require("@brillar/shared");
const inventoryService_1 = require("../services/inventoryService");
exports.inventoryRouter = (0, express_1.Router)();
exports.inventoryRouter.get("/", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), async (_req, res) => {
    const inventory = await prisma_1.prisma.inventory.findMany({
        include: {
            product: true,
            variant: true
        }
    });
    res.json(inventory);
});
exports.inventoryRouter.get("/:id/movements", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), async (req, res) => {
    const movements = await prisma_1.prisma.inventoryMovement.findMany({
        where: { inventoryId: req.params.id },
        orderBy: { createdAt: "desc" }
    });
    res.json(movements);
});
exports.inventoryRouter.post("/adjust", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), (0, validate_1.validate)(shared_1.InventoryAdjustSchema), async (req, res) => {
    const { productId, variantId, quantity, reason } = req.body;
    // Validate quantity
    if (typeof quantity !== 'number' || isNaN(quantity) || quantity < 0) {
        return res.status(400).json({ message: "Quantity must be a non-negative number" });
    }
    // Ensure we have either productId or variantId
    if (!productId && !variantId) {
        return res.status(400).json({ message: "Either productId or variantId must be provided" });
    }
    // Build where clause - explicitly handle null for variantId when not provided
    const whereClause = {};
    if (productId) {
        whereClause.productId = productId;
    }
    if (variantId) {
        whereClause.variantId = variantId;
    }
    else if (productId) {
        // When looking for product-level inventory, variantId must be null
        whereClause.variantId = null;
    }
    let inventory = await prisma_1.prisma.inventory.findFirst({
        where: whereClause
    });
    // If inventory doesn't exist, create it
    if (!inventory) {
        // Verify product exists
        if (productId) {
            const product = await prisma_1.prisma.product.findUnique({
                where: { id: productId }
            });
            if (!product) {
                return res.status(404).json({ message: "Product not found" });
            }
        }
        if (variantId) {
            const variant = await prisma_1.prisma.productVariant.findUnique({
                where: { id: variantId }
            });
            if (!variant) {
                return res.status(404).json({ message: "Product variant not found" });
            }
        }
        inventory = await prisma_1.prisma.inventory.create({
            data: {
                productId: productId ?? null,
                variantId: variantId ?? null,
                quantityOnHand: quantity,
                quantityReserved: 0
            }
        });
        await prisma_1.prisma.inventoryMovement.create({
            data: {
                inventoryId: inventory.id,
                type: "ADJUST",
                quantity,
                reason: reason || "Initial stock setup",
                createdBy: req.user?.id
            }
        });
        return res.json(inventory);
    }
    // Calculate delta (difference between desired quantity and current quantity)
    const quantityDelta = quantity - inventory.quantityOnHand;
    const adjustment = (0, inventoryService_1.adjustInventory)(inventory, quantityDelta);
    const updated = await prisma_1.prisma.inventory.update({
        where: { id: inventory.id },
        data: {
            quantityOnHand: adjustment.quantityOnHand
        }
    });
    await prisma_1.prisma.inventoryMovement.create({
        data: {
            inventoryId: inventory.id,
            type: "ADJUST",
            quantity: quantityDelta,
            reason,
            createdBy: req.user?.id
        }
    });
    res.json(updated);
});
exports.inventoryRouter.post("/reserve", auth_1.authenticate, async (req, res) => {
    const { inventoryId, quantity, reference } = req.body;
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        const inventoryRows = await tx.$queryRaw `
        SELECT * FROM "Inventory" WHERE id = ${inventoryId} FOR UPDATE
      `;
        const inventory = inventoryRows[0];
        if (!inventory) {
            throw new Error("Inventory record not found");
        }
        const adjustment = (0, inventoryService_1.reserveInventory)(inventory, quantity);
        const updated = await tx.inventory.update({
            where: { id: inventoryId },
            data: {
                quantityReserved: adjustment.quantityReserved
            }
        });
        await tx.inventoryMovement.create({
            data: {
                inventoryId,
                type: "RESERVE",
                quantity,
                reference,
                createdBy: req.user?.id
            }
        });
        return updated;
    });
    res.json(result);
});
exports.inventoryRouter.post("/release", auth_1.authenticate, async (req, res) => {
    const { inventoryId, quantity, reference } = req.body;
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        const inventoryRows = await tx.$queryRaw `
        SELECT * FROM "Inventory" WHERE id = ${inventoryId} FOR UPDATE
      `;
        const inventory = inventoryRows[0];
        if (!inventory) {
            throw new Error("Inventory record not found");
        }
        const adjustment = (0, inventoryService_1.releaseInventory)(inventory, quantity);
        const updated = await tx.inventory.update({
            where: { id: inventoryId },
            data: {
                quantityReserved: adjustment.quantityReserved
            }
        });
        await tx.inventoryMovement.create({
            data: {
                inventoryId,
                type: "RELEASE",
                quantity,
                reference,
                createdBy: req.user?.id
            }
        });
        return updated;
    });
    res.json(result);
});
exports.inventoryRouter.post("/consume", auth_1.authenticate, async (req, res) => {
    const { inventoryId, quantity, reference } = req.body;
    const result = await prisma_1.prisma.$transaction(async (tx) => {
        const inventoryRows = await tx.$queryRaw `
        SELECT * FROM "Inventory" WHERE id = ${inventoryId} FOR UPDATE
      `;
        const inventory = inventoryRows[0];
        if (!inventory) {
            throw new Error("Inventory record not found");
        }
        const adjustment = (0, inventoryService_1.consumeInventory)(inventory, quantity);
        const updated = await tx.inventory.update({
            where: { id: inventoryId },
            data: {
                quantityOnHand: adjustment.quantityOnHand,
                quantityReserved: adjustment.quantityReserved
            }
        });
        await tx.inventoryMovement.create({
            data: {
                inventoryId,
                type: "OUT",
                quantity,
                reference,
                createdBy: req.user?.id
            }
        });
        return updated;
    });
    res.json(result);
});
