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
    const inventory = await prisma_1.prisma.inventory.findFirst({
        where: {
            productId: productId ?? undefined,
            variantId: variantId ?? undefined
        }
    });
    if (!inventory) {
        return res.status(404).json({ message: "Inventory record not found" });
    }
    const adjustment = (0, inventoryService_1.adjustInventory)(inventory, quantity);
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
            quantity,
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
