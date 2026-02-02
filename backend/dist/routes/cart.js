"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const shared_1 = require("@brillar/shared");
const validate_1 = require("../middleware/validate");
const inventoryService_1 = require("../services/inventoryService");
exports.cartRouter = (0, express_1.Router)();
async function getOrCreateCart(userId, cartId) {
    if (userId) {
        const existing = await prisma_1.prisma.cart.findFirst({ where: { userId } });
        if (existing)
            return existing;
        return prisma_1.prisma.cart.create({ data: { userId } });
    }
    if (cartId) {
        const existing = await prisma_1.prisma.cart.findUnique({ where: { id: cartId } });
        if (existing)
            return existing;
    }
    return prisma_1.prisma.cart.create({ data: {} });
}
exports.cartRouter.get("/", auth_1.optionalAuth, async (req, res) => {
    const cartId = req.headers["x-cart-id"];
    const cart = await getOrCreateCart(req.user?.id, cartId);
    const full = await prisma_1.prisma.cart.findUnique({
        where: { id: cart.id },
        include: { items: true }
    });
    res.json({ ...full, cartId: cart.id });
});
exports.cartRouter.post("/items", auth_1.optionalAuth, (0, validate_1.validate)(shared_1.CartItemSchema), async (req, res) => {
    const cartId = req.headers["x-cart-id"];
    const cart = await getOrCreateCart(req.user?.id, cartId);
    const { productId, variantId, quantity } = req.body;
    const updated = await prisma_1.prisma.$transaction(async (tx) => {
        const column = variantId ? "variantId" : "productId";
        const inventoryRows = await tx.$queryRaw(client_1.Prisma.sql `
        SELECT * FROM "Inventory"
        WHERE ${client_1.Prisma.raw(`\"${column}\"`)} = ${variantId ?? productId}
        LIMIT 1
        FOR UPDATE
      `);
        const inventory = inventoryRows[0];
        if (!inventory) {
            throw new Error("Inventory record not found");
        }
        const adjustment = (0, inventoryService_1.reserveInventory)(inventory, quantity);
        await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantityReserved: adjustment.quantityReserved }
        });
        await tx.inventoryMovement.create({
            data: {
                inventoryId: inventory.id,
                type: "RESERVE",
                quantity,
                reference: `cart:${cart.id}`,
                createdBy: req.user?.id
            }
        });
        const item = await tx.cartItem.create({
            data: {
                cartId: cart.id,
                productId,
                variantId,
                quantity
            }
        });
        return item;
    });
    res.status(201).json({ cartId: cart.id, item: updated });
});
exports.cartRouter.delete("/items/:id", auth_1.optionalAuth, async (req, res) => {
    const item = await prisma_1.prisma.cartItem.findUnique({ where: { id: req.params.id } });
    if (!item) {
        return res.status(404).json({ message: "Cart item not found" });
    }
    await prisma_1.prisma.$transaction(async (tx) => {
        const column = item.variantId ? "variantId" : "productId";
        const inventoryRows = await tx.$queryRaw(client_1.Prisma.sql `
        SELECT * FROM "Inventory"
        WHERE ${client_1.Prisma.raw(`\"${column}\"`)} = ${item.variantId ?? item.productId}
        LIMIT 1
        FOR UPDATE
      `);
        const inventory = inventoryRows[0];
        if (!inventory) {
            throw new Error("Inventory record not found");
        }
        const adjustment = (0, inventoryService_1.releaseInventory)(inventory, item.quantity);
        await tx.inventory.update({
            where: { id: inventory.id },
            data: { quantityReserved: adjustment.quantityReserved }
        });
        await tx.inventoryMovement.create({
            data: {
                inventoryId: inventory.id,
                type: "RELEASE",
                quantity: item.quantity,
                reference: `cart:${item.cartId}`,
                createdBy: req.user?.id
            }
        });
        await tx.cartItem.delete({ where: { id: item.id } });
    });
    res.status(204).send();
});
exports.cartRouter.post("/merge", auth_1.authenticate, async (req, res) => {
    const { guestCartId } = req.body;
    if (!guestCartId) {
        return res.status(400).json({ message: "Missing guestCartId" });
    }
    const guestCart = await prisma_1.prisma.cart.findUnique({
        where: { id: guestCartId },
        include: { items: true }
    });
    if (!guestCart) {
        return res.status(404).json({ message: "Guest cart not found" });
    }
    const userCart = await getOrCreateCart(req.user?.id);
    const mergedItems = await prisma_1.prisma.$transaction(async (tx) => {
        for (const item of guestCart.items) {
            await tx.cartItem.create({
                data: {
                    cartId: userCart.id,
                    productId: item.productId,
                    variantId: item.variantId,
                    quantity: item.quantity
                }
            });
        }
        await tx.cartItem.deleteMany({ where: { cartId: guestCart.id } });
        await tx.cart.delete({ where: { id: guestCart.id } });
        return tx.cartItem.findMany({ where: { cartId: userCart.id } });
    });
    res.json({ cartId: userCart.id, items: mergedItems });
});
