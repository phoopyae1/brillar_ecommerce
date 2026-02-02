import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { CheckoutSchema } from "@brillar/shared";
import { validate } from "../middleware/validate";
import { adjustInventory, consumeInventory } from "../services/inventoryService";

export const ordersRouter = Router();

ordersRouter.get("/", authenticate, async (req, res) => {
  const orders = await prisma.order.findMany({
    where: { userId: req.user!.id },
    include: { items: true },
    orderBy: { createdAt: "desc" }
  });
  res.json(orders);
});

ordersRouter.get("/:id", authenticate, async (req, res) => {
  const order = await prisma.order.findFirst({
    where: { id: req.params.id, userId: req.user!.id },
    include: { items: true }
  });
  if (!order) {
    return res.status(404).json({ message: "Order not found" });
  }
  res.json(order);
});

ordersRouter.post(
  "/checkout",
  authenticate,
  validate(CheckoutSchema),
  async (req, res) => {
    const cartId = req.headers["x-cart-id"] as string | undefined;
    const cart = await prisma.cart.findFirst({
      where: {
        id: cartId,
        userId: req.user!.id
      },
      include: { items: true }
    });

    if (!cart || cart.items.length === 0) {
      return res.status(400).json({ message: "Cart is empty" });
    }

    const order = await prisma.$transaction(async (tx) => {
      let total = 0;
      const orderItems: any[] = [];
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
        const inventoryRows = await tx.$queryRaw<any[]>(
          Prisma.sql`
            SELECT * FROM "Inventory"
            WHERE ${Prisma.raw(`\"${column}\"`)} = ${item.variantId ?? item.productId}
            LIMIT 1
            FOR UPDATE
          `
        );
        const inventory = inventoryRows[0];
        if (!inventory) {
          throw new Error("Inventory record not found");
        }
        const adjustment = consumeInventory(inventory, item.quantity);
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
          userId: req.user!.id,
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
  }
);

ordersRouter.get(
  "/admin/all",
  authenticate,
  requireRole("ADMIN"),
  async (_req, res) => {
    const orders = await prisma.order.findMany({
      include: { items: true, user: true },
      orderBy: { createdAt: "desc" }
    });
    res.json(orders);
  }
);

ordersRouter.patch(
  "/admin/:id/status",
  authenticate,
  requireRole("ADMIN"),
  async (req, res) => {
    const { status } = req.body as { status: string };
    const order = await prisma.order.findUnique({
      where: { id: req.params.id },
      include: { items: true }
    });
    if (!order) {
      return res.status(404).json({ message: "Order not found" });
    }

    if (["CANCELLED", "REFUNDED"].includes(status)) {
      await prisma.$transaction(async (tx) => {
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
          const adjustment = adjustInventory(inventory, item.quantity);
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

    const updated = await prisma.order.update({
      where: { id: order.id },
      data: { status }
    });

    res.json(updated);
  }
);
