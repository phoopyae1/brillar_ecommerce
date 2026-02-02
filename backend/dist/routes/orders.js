"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ordersRouter = void 0;
const express_1 = require("express");
const client_1 = require("@prisma/client");
const prisma_1 = require("../prisma");
const auth_1 = require("../middleware/auth");
const shared_1 = require("@brillar/shared");
const validate_1 = require("../middleware/validate");
const inventoryService_1 = require("../services/inventoryService");
exports.ordersRouter = (0, express_1.Router)();
exports.ordersRouter.get("/", auth_1.authenticate, async (req, res) => {
    const orders = await prisma_1.prisma.order.findMany({
        where: { userId: req.user.id },
        include: { items: true },
        orderBy: { createdAt: "desc" }
    });
    res.json(orders);
});
exports.ordersRouter.get("/:id", auth_1.authenticate, async (req, res) => {
    const order = await prisma_1.prisma.order.findFirst({
        where: { id: req.params.id, userId: req.user.id },
        include: { items: true }
    });
    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }
    res.json(order);
});
exports.ordersRouter.post("/checkout", auth_1.authenticate, (0, validate_1.validate)(shared_1.CheckoutSchema), async (req, res) => {
    const cartId = req.headers["x-cart-id"];
    const cart = await prisma_1.prisma.cart.findFirst({
        where: {
            id: cartId,
            userId: req.user.id
        },
        include: { items: true }
    });
    if (!cart || cart.items.length === 0) {
        return res.status(400).json({ message: "Cart is empty" });
    }
    const order = await prisma_1.prisma.$transaction(async (tx) => {
        let total = 0;
        const orderItems = [];
        for (const item of cart.items) {
            const product = await tx.product.findUnique({
                where: { id: item.productId }
            });
            if (!product) {
                throw new Error("Product not found");
            }
            const variant = item.variantId
                ? await tx.productVariant.findUnique({ where: { id: item.variantId } })
                : null;
            const price = Number(variant?.priceOverride ?? product.price);
            total += price * item.quantity;
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
            const adjustment = (0, inventoryService_1.consumeInventory)(inventory, item.quantity);
            await tx.inventory.update({
                where: { id: inventory.id },
                data: {
                    quantityOnHand: adjustment.quantityOnHand,
                    quantityReserved: adjustment.quantityReserved
                }
            });
            await tx.inventoryMovement.create({
                data: {
                    inventoryId: inventory.id,
                    type: "OUT",
                    quantity: item.quantity,
                    reference: `order:${cart.id}`,
                    createdBy: req.user?.id
                }
            });
            orderItems.push({
                productId: product.id,
                variantId: variant?.id,
                name: product.name,
                sku: variant?.sku,
                price,
                quantity: item.quantity
            });
        }
        const created = await tx.order.create({
            data: {
                userId: req.user.id,
                status: "PAID",
                total,
                currency: "USD",
                items: {
                    create: orderItems
                }
            },
            include: { items: true }
        });
        await tx.cartItem.deleteMany({ where: { cartId: cart.id } });
        return created;
    });
    res.status(201).json(order);
});
exports.ordersRouter.get("/admin/all", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), async (_req, res) => {
    const orders = await prisma_1.prisma.order.findMany({
        include: { items: true, user: true },
        orderBy: { createdAt: "desc" }
    });
    res.json(orders);
});
exports.ordersRouter.patch("/admin/:id/status", auth_1.authenticate, (0, auth_1.requireRole)("ADMIN"), async (req, res) => {
    const { status } = req.body;
    const order = await prisma_1.prisma.order.findUnique({
        where: { id: req.params.id },
        include: { items: true }
    });
    if (!order) {
        return res.status(404).json({ message: "Order not found" });
    }
    if (["CANCELLED", "REFUNDED"].includes(status)) {
        await prisma_1.prisma.$transaction(async (tx) => {
            for (const item of order.items) {
                const inventory = await tx.inventory.findFirst({
                    where: {
                        productId: item.variantId ? undefined : item.productId,
                        variantId: item.variantId ?? undefined
                    }
                });
                if (!inventory) {
                    continue;
                }
                const adjustment = (0, inventoryService_1.adjustInventory)(inventory, item.quantity);
                await tx.inventory.update({
                    where: { id: inventory.id },
                    data: {
                        quantityReserved: adjustment.quantityReserved,
                        quantityOnHand: adjustment.quantityOnHand
                    }
                });
                await tx.inventoryMovement.create({
                    data: {
                        inventoryId: inventory.id,
                        type: "IN",
                        quantity: item.quantity,
                        reference: `order:${order.id}`,
                        createdBy: req.user?.id
                    }
                });
            }
        });
    }
    const updated = await prisma_1.prisma.order.update({
        where: { id: order.id },
        data: { status: status }
    });
    res.json(updated);
});
