import { Router } from "express";
import { Prisma } from "@prisma/client";
import { prisma } from "../prisma";
import { authenticate, optionalAuth } from "../middleware/auth";
import { CartItemSchema } from "@brillar/shared";
import { validate } from "../middleware/validate";
import { reserveInventory, releaseInventory } from "../services/inventoryService";

export const cartRouter = Router();

async function getOrCreateCart(userId?: string, cartId?: string) {
  if (userId) {
    const existing = await prisma.cart.findFirst({ where: { userId } });
    if (existing) return existing;
    return prisma.cart.create({ data: { userId } });
  }
  if (cartId) {
    const existing = await prisma.cart.findUnique({ where: { id: cartId } });
    if (existing) return existing;
  }
  return prisma.cart.create({ data: {} });
}

cartRouter.get("/", optionalAuth, async (req, res) => {
  const cartId = req.headers["x-cart-id"] as string | undefined;
  const cart = await getOrCreateCart(req.user?.id, cartId);
  const full = await prisma.cart.findUnique({
    where: { id: cart.id },
    include: { 
      items: {
        include: {
          product: true,
          variant: true
        }
      }
    }
  });
  res.json({ ...full, cartId: cart.id });
});

cartRouter.post("/items", optionalAuth, validate(CartItemSchema), async (req, res) => {
  const cartId = req.headers["x-cart-id"] as string | undefined;
  const cart = await getOrCreateCart(req.user?.id, cartId);
  const { productId, variantId, quantity } = req.body;

  const updated = await prisma.$transaction(async (tx) => {
    const column = variantId ? "variantId" : "productId";
    const inventoryRows = await tx.$queryRaw<any[]>(
      Prisma.sql`
        SELECT * FROM "Inventory"
        WHERE ${Prisma.raw(`\"${column}\"`)} = ${variantId ?? productId}
        LIMIT 1
        FOR UPDATE
      `
    );
    const inventory = inventoryRows[0];
    if (!inventory) {
      throw new Error("Inventory record not found");
    }
    const adjustment = reserveInventory(inventory, quantity);
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

cartRouter.delete("/items/:id", optionalAuth, async (req, res) => {
  const item = await prisma.cartItem.findUnique({ where: { id: req.params.id } });
  if (!item) {
    return res.status(404).json({ message: "Cart item not found" });
  }

  await prisma.$transaction(async (tx) => {
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
    const adjustment = releaseInventory(inventory, item.quantity);
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

cartRouter.post("/merge", authenticate, async (req, res) => {
  const { guestCartId } = req.body as { guestCartId?: string };
  if (!guestCartId) {
    return res.status(400).json({ message: "Missing guestCartId" });
  }
  const guestCart = await prisma.cart.findUnique({
    where: { id: guestCartId },
    include: { items: true }
  });
  if (!guestCart) {
    return res.status(404).json({ message: "Guest cart not found" });
  }
  const userCart = await getOrCreateCart(req.user?.id);
  const mergedItems = await prisma.$transaction(async (tx) => {
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
