import { Router } from "express";
import { prisma } from "../prisma";
import { authenticate, requireRole } from "../middleware/auth";
import { validate } from "../middleware/validate";
import { InventoryAdjustSchema } from "@brillar/shared";
import {
  adjustInventory,
  consumeInventory,
  releaseInventory,
  reserveInventory
} from "../services/inventoryService";

export const inventoryRouter = Router();

inventoryRouter.get(
  "/",
  authenticate,
  requireRole("ADMIN"),
  async (_req, res) => {
    const inventory = await prisma.inventory.findMany({
      include: {
        product: true,
        variant: true
      }
    });
    res.json(inventory);
  }
);

inventoryRouter.get(
  "/:id/movements",
  authenticate,
  requireRole("ADMIN"),
  async (req, res) => {
    const movements = await prisma.inventoryMovement.findMany({
      where: { inventoryId: req.params.id },
      orderBy: { createdAt: "desc" }
    });
    res.json(movements);
  }
);

inventoryRouter.post(
  "/adjust",
  authenticate,
  requireRole("ADMIN"),
  validate(InventoryAdjustSchema),
  async (req, res) => {
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
    const whereClause: any = {};
    if (productId) {
      whereClause.productId = productId;
    }
    if (variantId) {
      whereClause.variantId = variantId;
    } else if (productId) {
      // When looking for product-level inventory, variantId must be null
      whereClause.variantId = null;
    }
    
    let inventory = await prisma.inventory.findFirst({
      where: whereClause
    });

    // If inventory doesn't exist, create it
    if (!inventory) {
      // Verify product exists
      if (productId) {
        const product = await prisma.product.findUnique({
          where: { id: productId }
        });
        if (!product) {
          return res.status(404).json({ message: "Product not found" });
        }
      }
      if (variantId) {
        const variant = await prisma.productVariant.findUnique({
          where: { id: variantId }
        });
        if (!variant) {
          return res.status(404).json({ message: "Product variant not found" });
        }
      }

      inventory = await prisma.inventory.create({
        data: {
          productId: productId ?? null,
          variantId: variantId ?? null,
          quantityOnHand: quantity,
          quantityReserved: 0
        }
      });

      await prisma.inventoryMovement.create({
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
    const adjustment = adjustInventory(inventory, quantityDelta);

    const updated = await prisma.inventory.update({
      where: { id: inventory.id },
      data: {
        quantityOnHand: adjustment.quantityOnHand
      }
    });

    await prisma.inventoryMovement.create({
      data: {
        inventoryId: inventory.id,
        type: "ADJUST",
        quantity: quantityDelta,
        reason,
        createdBy: req.user?.id
      }
    });

    res.json(updated);
  }
);

inventoryRouter.post(
  "/reserve",
  authenticate,
  async (req, res) => {
    const { inventoryId, quantity, reference } = req.body as {
      inventoryId: string;
      quantity: number;
      reference?: string;
    };

    const result = await prisma.$transaction(async (tx) => {
      const inventoryRows = await tx.$queryRaw<any[]>`
        SELECT * FROM "Inventory" WHERE id = ${inventoryId} FOR UPDATE
      `;
      const inventory = inventoryRows[0];
      if (!inventory) {
        throw new Error("Inventory record not found");
      }
      const adjustment = reserveInventory(inventory, quantity);
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
  }
);

inventoryRouter.post(
  "/release",
  authenticate,
  async (req, res) => {
    const { inventoryId, quantity, reference } = req.body as {
      inventoryId: string;
      quantity: number;
      reference?: string;
    };

    const result = await prisma.$transaction(async (tx) => {
      const inventoryRows = await tx.$queryRaw<any[]>`
        SELECT * FROM "Inventory" WHERE id = ${inventoryId} FOR UPDATE
      `;
      const inventory = inventoryRows[0];
      if (!inventory) {
        throw new Error("Inventory record not found");
      }
      const adjustment = releaseInventory(inventory, quantity);
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
  }
);

inventoryRouter.post(
  "/consume",
  authenticate,
  async (req, res) => {
    const { inventoryId, quantity, reference } = req.body as {
      inventoryId: string;
      quantity: number;
      reference?: string;
    };

    const result = await prisma.$transaction(async (tx) => {
      const inventoryRows = await tx.$queryRaw<any[]>`
        SELECT * FROM "Inventory" WHERE id = ${inventoryId} FOR UPDATE
      `;
      const inventory = inventoryRows[0];
      if (!inventory) {
        throw new Error("Inventory record not found");
      }
      const adjustment = consumeInventory(inventory, quantity);
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
  }
);
