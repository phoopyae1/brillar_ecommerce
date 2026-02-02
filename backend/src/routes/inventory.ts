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
    const inventory = await prisma.inventory.findFirst({
      where: {
        productId: productId ?? undefined,
        variantId: variantId ?? undefined
      }
    });

    if (!inventory) {
      return res.status(404).json({ message: "Inventory record not found" });
    }

    const adjustment = adjustInventory(inventory, quantity);

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
        quantity,
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
